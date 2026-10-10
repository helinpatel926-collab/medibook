"""MediBook patient service: patient records, MRNs and search."""
import logging
import os
from contextlib import asynccontextmanager

import psycopg
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

import db
from auth import require_staff
from schemas import Patient, PatientIn, PatientMatch, PatientSeed

APP_VERSION = os.getenv("APP_VERSION", "1.0.0")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("patient-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        db.ensure_schema()
    except psycopg.OperationalError as exc:
        log.warning("Database not reachable at startup: %s", exc)
    yield


app = FastAPI(title="MediBook patient service", version=APP_VERSION, lifespan=lifespan)
Instrumentator(excluded_handlers=["/metrics", "/health", "/ready"]).instrument(app).expose(app, include_in_schema=False)


@app.exception_handler(psycopg.OperationalError)
async def database_unavailable(request: Request, exc: psycopg.OperationalError):
    log.error("Database error on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


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
    return {"service": "patient-service", "version": APP_VERSION}


@app.get("/api/staff/patients", response_model=list[Patient], tags=["staff"])
def list_patients(q: str | None = None, user: dict = Depends(require_staff)):
    return db.list_patients(q.strip() if q else None)


@app.get("/api/staff/patients/{patient_id}", response_model=Patient, tags=["staff"])
def get_patient(patient_id: int, user: dict = Depends(require_staff)):
    row = db.get_patient(patient_id)
    if not row:
        raise HTTPException(status_code=404, detail="Patient not found")
    return row


@app.post("/api/staff/patients", response_model=Patient, status_code=201, tags=["staff"])
def create_patient(patient: PatientIn, user: dict = Depends(require_staff)):
    return db.create_patient(patient.model_dump())


@app.get("/internal/patients/{patient_id}", response_model=Patient, tags=["internal"])
def internal_get_patient(patient_id: int):
    row = db.get_patient(patient_id)
    if not row:
        raise HTTPException(status_code=404, detail="Patient not found")
    return row


@app.post("/internal/patients/match", response_model=PatientMatch, tags=["internal"])
def match_patient(patient: PatientIn):
    """Find a patient by name and phone (or email), or create one. Used by online booking."""
    data = patient.model_dump()
    row = db.find_match(data)
    if row:
        return {**row, "created": False}
    return {**db.create_patient(data), "created": True}


@app.post("/internal/seed", response_model=list[Patient], tags=["internal"])
def seed(patients: list[PatientSeed]):
    if os.getenv("SEED_ENABLED", "false").lower() != "true":
        raise HTTPException(status_code=404, detail="Not found")
    return db.seed([p.model_dump() for p in patients])
