"""MediBook API for managing patients and appointments."""
import logging
import os
from contextlib import asynccontextmanager

import psycopg
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

import db
from schemas import Appointment, AppointmentIn, Patient, PatientIn

APP_VERSION = os.getenv("APP_VERSION", "1.0.0")

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)
log = logging.getLogger("medibook")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        db.ensure_schema()
        log.info("Database schema ready")
    except psycopg.OperationalError as exc:
        # /api/ready returns 503 until the database is reachable.
        log.warning("Database not reachable at startup: %s", exc)
    yield


app = FastAPI(
    title="MediBook API",
    version=APP_VERSION,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
    lifespan=lifespan,
)

Instrumentator(
    excluded_handlers=["/metrics", "/api/health", "/api/ready"]
).instrument(app).expose(app, include_in_schema=False)


@app.exception_handler(psycopg.OperationalError)
async def database_unavailable(request: Request, exc: psycopg.OperationalError):
    log.error("Database error on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


@app.get("/api/health", tags=["ops"])
def health():
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/api/ready", tags=["ops"])
def ready():
    """Readiness probe. Checks database connectivity."""
    try:
        db.ensure_schema()
        db.check()
    except psycopg.Error as exc:
        log.warning("Readiness check failed: %s", exc)
        raise HTTPException(status_code=503, detail="Database not reachable")
    return {"status": "ready"}


@app.get("/api/version", tags=["ops"])
def version():
    return {"version": APP_VERSION}


@app.get("/api/patients", response_model=list[Patient], tags=["patients"])
def list_patients():
    return db.list_patients()


@app.post("/api/patients", response_model=Patient, status_code=201, tags=["patients"])
def create_patient(patient: PatientIn):
    return db.create_patient(**patient.model_dump())


@app.get("/api/appointments", response_model=list[Appointment], tags=["appointments"])
def list_appointments():
    return db.list_appointments()


@app.post(
    "/api/appointments", response_model=Appointment, status_code=201, tags=["appointments"]
)
def create_appointment(appointment: AppointmentIn):
    try:
        return db.create_appointment(**appointment.model_dump())
    except psycopg.errors.ForeignKeyViolation:
        raise HTTPException(status_code=404, detail="Patient not found")
