"""MediBook doctor service: doctors, departments and clinic schedules."""
import logging
import os
from contextlib import asynccontextmanager
from datetime import date, timedelta

import psycopg
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

import db
from schedule import closed_reason, doctor_slots

APP_VERSION = os.getenv("APP_VERSION", "1.0.0")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("doctor-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        db.ensure_schema()
    except psycopg.OperationalError as exc:
        # /ready returns 503 until the database is reachable.
        log.warning("Database not reachable at startup: %s", exc)
    yield


app = FastAPI(title="MediBook doctor service", version=APP_VERSION, lifespan=lifespan)
Instrumentator(excluded_handlers=["/metrics", "/health", "/ready"]).instrument(app).expose(app, include_in_schema=False)


@app.exception_handler(psycopg.OperationalError)
async def database_unavailable(request: Request, exc: psycopg.OperationalError):
    log.error("Database error on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


def doctor_out(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "department": row["department"],
        "room": row["room"],
        "days": list(row["days"]),
        "languages": list(row["languages"]),
    }


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
    return {"service": "doctor-service", "version": APP_VERSION}


@app.get("/api/public/departments", tags=["public"])
def list_departments():
    return db.list_departments()


@app.get("/api/public/doctors", tags=["public"])
def list_doctors():
    return [doctor_out(row) for row in db.list_doctors()]


@app.get("/api/public/doctors/{doctor_id}", tags=["public"])
def get_doctor(doctor_id: str):
    row = db.get_doctor(doctor_id)
    if not row:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor_out(row)


@app.get("/api/public/slots", tags=["public"])
def slots(
    start: date,
    days: int = Query(1, ge=1, le=90),
    doctor_id: str | None = None,
):
    """Clinic slot templates per day and doctor. Bookings are not included."""
    doctors = [doctor_out(row) for row in db.list_doctors()]
    if doctor_id:
        doctors = [d for d in doctors if d["id"] == doctor_id]
        if not doctors:
            raise HTTPException(status_code=404, detail="Doctor not found")
    dates = {}
    for offset in range(days):
        day = start + timedelta(days=offset)
        dates[day.isoformat()] = {
            "closed_reason": closed_reason(day),
            "doctors": {d["id"]: doctor_slots(d["days"], day) for d in doctors},
        }
    return {"start": start.isoformat(), "days": days, "dates": dates}
