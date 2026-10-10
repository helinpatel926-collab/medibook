"""MediBook appointment service: availability, online booking and the staff schedule."""
import logging
import os
from contextlib import asynccontextmanager
from datetime import date, datetime, time, timedelta

import psycopg
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

import clients
import db
from auth import require_staff
from rules import CLINIC_TZ, age_allowed, now_local
from schemas import Appointment, AppointmentSeed, BookingResult, PublicBooking, StaffBooking, Status, StatusUpdate

APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
SCAN_DAYS = 42
SUMMARY_DAYS = 7

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("appointment-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        db.ensure_schema()
    except psycopg.OperationalError as exc:
        log.warning("Database not reachable at startup: %s", exc)
    yield


app = FastAPI(title="MediBook appointment service", version=APP_VERSION, lifespan=lifespan)
Instrumentator(excluded_handlers=["/metrics", "/health", "/ready"]).instrument(app).expose(app, include_in_schema=False)


@app.exception_handler(psycopg.OperationalError)
async def database_unavailable(request: Request, exc: psycopg.OperationalError):
    log.error("Database error on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


@app.exception_handler(clients.DependencyError)
async def dependency_unavailable(request: Request, exc: clients.DependencyError):
    log.error("Dependency error on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=503, content={"detail": f"{exc.service} is unavailable. Please try again shortly."})


def appointment_out(row: dict) -> dict:
    return {
        "id": row["id"],
        "ref": row["ref"],
        "patient_id": row["patient_id"],
        "patient_name": row["patient_name"],
        "patient_mrn": row["patient_mrn"],
        "doctor_id": row["doctor_id"],
        "start": row["start_at"].strftime("%Y-%m-%dT%H:%M"),
        "type": row["type"],
        "reason": row["reason"],
        "status": row["status"],
        "source": row["source"],
        "created_at": row["created_at"],
    }


def day_start(day: date) -> datetime:
    return datetime.combine(day, time.min)


def slot_board(days: int, doctor_id: str | None = None) -> tuple[datetime, dict, set]:
    """Current clinic time, slot templates from today, and active bookings over the same range."""
    now = now_local()
    today = now.date()
    dates = clients.schedule(today, days, doctor_id)
    booked = db.booked_slots(day_start(today), day_start(today + timedelta(days=days)), doctor_id)
    return now, dates, booked


def marked_slots(day: str, times: list[str], doctor_id: str, booked: set, now: datetime) -> list[dict]:
    slots = []
    for value in times:
        start = datetime.fromisoformat(f"{day}T{value}")
        slots.append({"time": value, "free": start > now and (doctor_id, start) not in booked})
    return slots


def checked_slot(doctor_id: str, start: datetime) -> dict:
    """The doctor, once the start time is confirmed as one of their upcoming slots."""
    doctor = clients.doctors().get(doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    day = clients.schedule(start.date(), 1, doctor_id).get(start.date().isoformat(), {})
    if start.strftime("%H:%M") not in day.get("doctors", {}).get(doctor_id, []):
        raise HTTPException(status_code=422, detail="That time isn't available for this doctor.")
    if start <= now_local():
        raise HTTPException(status_code=422, detail="That time has already passed. Pick a later time.")
    return doctor


def check_age(doctor: dict, dob: date | None, on: date) -> None:
    if not age_allowed(doctor["department"], dob, on):
        raise HTTPException(status_code=422, detail="Pediatrics sees patients under 18. Please choose another doctor.")


def insert(fields: dict) -> dict:
    try:
        return db.insert_appointment(fields)
    except db.SlotTaken:
        raise HTTPException(status_code=409, detail="That time was just taken. Please pick another time.")


@app.get("/health", tags=["ops"])
def health():
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/ready", tags=["ops"])
def ready():
    """Readiness probe. Checks database connectivity."""
    try:
        db.ensure_schema()
        db.check()
    except psycopg.Error as exc:
        log.warning("Readiness check failed: %s", exc)
        raise HTTPException(status_code=503, detail="Database not reachable")
    return {"status": "ready"}


@app.get("/version", tags=["ops"])
def version():
    return {"service": "appointment-service", "version": APP_VERSION}


@app.get("/api/public/availability", tags=["public"])
def availability(doctor_id: str, limit: int = Query(12, ge=1, le=30)):
    """Upcoming days on which the doctor has at least one free slot."""
    if doctor_id not in clients.doctors():
        raise HTTPException(status_code=404, detail="Doctor not found")
    now, dates, booked = slot_board(SCAN_DAYS, doctor_id)
    days = []
    for day in sorted(dates):
        slots = marked_slots(day, dates[day]["doctors"].get(doctor_id, []), doctor_id, booked, now)
        open_count = sum(slot["free"] for slot in slots)
        if open_count:
            days.append({"date": day, "open": open_count, "slots": slots})
            if len(days) == limit:
                break
    return {"doctor_id": doctor_id, "days": days}


@app.get("/api/public/next-available", tags=["public"])
def next_available():
    """The first free slot for each doctor."""
    now, dates, booked = slot_board(SCAN_DAYS)
    found: dict[str, dict] = {}
    for day in sorted(dates):
        for doctor_id, times in dates[day]["doctors"].items():
            if doctor_id in found:
                continue
            free = next((s for s in marked_slots(day, times, doctor_id, booked, now) if s["free"]), None)
            if free:
                found[doctor_id] = {"doctor_id": doctor_id, "date": day, "time": free["time"]}
    return [found[doctor_id] for doctor_id in sorted(found)]


@app.get("/api/public/summary", tags=["public"])
def summary():
    now, dates, booked = slot_board(SUMMARY_DAYS)
    open_slots = sum(
        slot["free"]
        for day, info in dates.items()
        for doctor_id, times in info["doctors"].items()
        for slot in marked_slots(day, times, doctor_id, booked, now)
    )
    return {"open_slots_7d": open_slots}


@app.post("/api/public/bookings", response_model=BookingResult, status_code=201, tags=["public"])
def book_online(booking: PublicBooking):
    if not booking.consent:
        raise HTTPException(status_code=422, detail="Please agree so we can keep your booking.")
    start = datetime.combine(booking.date, time.fromisoformat(booking.time))
    doctor = checked_slot(booking.doctor_id, start)
    check_age(doctor, booking.patient.dob, start.date())
    try:
        patient = clients.match_patient(booking.patient.model_dump(mode="json"))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=exc.args[0] if exc.args else "Please check the patient details.")
    row = insert({
        "patient_id": patient["id"],
        "patient_name": patient["full_name"],
        "patient_mrn": patient["mrn"],
        "doctor_id": booking.doctor_id,
        "start_at": start,
        "type": booking.type,
        "reason": booking.reason,
        "source": "online",
    })
    return {"ref": row["ref"], "appointment": appointment_out(row)}


@app.get("/api/staff/appointments", response_model=list[Appointment], tags=["staff"])
def list_appointments(
    start: date | None = None,
    end: date | None = None,
    doctor_id: str | None = None,
    patient_id: int | None = None,
    status: Status | None = None,
    limit: int = Query(2000, ge=1, le=5000),
    user: dict = Depends(require_staff),
):
    """Appointments whose start date falls in [start, end], ordered by start time."""
    rows = db.list_appointments(start, end, doctor_id, patient_id, status, limit)
    return [appointment_out(row) for row in rows]


@app.post("/api/staff/appointments", response_model=Appointment, status_code=201, tags=["staff"])
def create_appointment(booking: StaffBooking, user: dict = Depends(require_staff)):
    start = datetime.combine(booking.date, time.fromisoformat(booking.time))
    doctor = checked_slot(booking.doctor_id, start)
    patient = clients.get_patient(booking.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    dob = date.fromisoformat(patient["dob"]) if patient.get("dob") else None
    check_age(doctor, dob, start.date())
    row = insert({
        "patient_id": patient["id"],
        "patient_name": patient["full_name"],
        "patient_mrn": patient["mrn"],
        "doctor_id": booking.doctor_id,
        "start_at": start,
        "type": booking.type,
        "reason": booking.reason,
        "source": "staff",
    })
    return appointment_out(row)


@app.patch("/api/staff/appointments/{appointment_id}", response_model=Appointment, tags=["staff"])
def update_status(appointment_id: int, update: StatusUpdate, user: dict = Depends(require_staff)):
    row = db.get_appointment(appointment_id)
    if not row:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if update.status == "completed" and row["start_at"].date() > now_local().date():
        raise HTTPException(status_code=422, detail="Only today's or past appointments can be completed.")
    try:
        row = db.set_status(appointment_id, update.status)
    except db.SlotTaken:
        raise HTTPException(status_code=409, detail="That time has been booked again, so this can't be restored.")
    return appointment_out(row)


@app.post("/internal/seed", tags=["internal"])
def seed(appointments: list[AppointmentSeed]):
    """Load demo appointments into an empty database."""
    if os.getenv("SEED_ENABLED", "false").lower() != "true":
        raise HTTPException(status_code=404, detail="Not found")
    now = now_local()
    rows = []
    for item in appointments:
        if item.cancelled:
            status = "cancelled"
        elif item.start <= now:
            status = "completed"
        else:
            status = "scheduled"
        created_day = item.start.date() - timedelta(days=item.created_days_before)
        created_at = min(datetime.combine(created_day, time(10, 0)), now)
        rows.append({
            **item.model_dump(exclude={"start", "cancelled", "created_days_before"}),
            "start_at": item.start,
            "status": status,
            "created_at": created_at.replace(tzinfo=CLINIC_TZ),
        })
    return db.seed(rows)
