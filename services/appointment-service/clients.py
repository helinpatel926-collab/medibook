"""Calls to the doctor and patient services."""
import os
import time
from datetime import date

import httpx

DOCTOR_SERVICE = "Doctor service"
PATIENT_SERVICE = "Patient service"
DOCTOR_SERVICE_URL = os.getenv("DOCTOR_SERVICE_URL", "http://doctor-service:8000").rstrip("/")
PATIENT_SERVICE_URL = os.getenv("PATIENT_SERVICE_URL", "http://patient-service:8000").rstrip("/")
DOCTOR_CACHE_SECONDS = 60

_http = httpx.Client(timeout=3.0)
_doctor_cache: dict = {"doctors": None, "expires": 0.0}


class DependencyError(Exception):
    """Another MediBook service could not be reached or failed to answer."""

    def __init__(self, service: str, reason: str = ""):
        super().__init__(f"{service}: {reason}" if reason else service)
        self.service = service


def _request(service: str, method: str, url: str, **kwargs) -> httpx.Response:
    try:
        response = _http.request(method, url, **kwargs)
    except httpx.HTTPError as exc:
        raise DependencyError(service, str(exc)) from exc
    if response.status_code >= 500:
        raise DependencyError(service, f"HTTP {response.status_code}")
    return response


def _json(service: str, response: httpx.Response):
    if response.status_code != 200:
        raise DependencyError(service, f"HTTP {response.status_code}")
    try:
        return response.json()
    except ValueError as exc:
        raise DependencyError(service, "invalid JSON") from exc


def doctors() -> dict[str, dict]:
    """Doctors by id, cached briefly since the roster rarely changes."""
    now = time.monotonic()
    if _doctor_cache["doctors"] is None or now >= _doctor_cache["expires"]:
        response = _request(DOCTOR_SERVICE, "GET", f"{DOCTOR_SERVICE_URL}/api/public/doctors")
        _doctor_cache["doctors"] = {doctor["id"]: doctor for doctor in _json(DOCTOR_SERVICE, response)}
        _doctor_cache["expires"] = now + DOCTOR_CACHE_SECONDS
    return _doctor_cache["doctors"]


def schedule(start: date, days: int, doctor_id: str | None = None) -> dict[str, dict]:
    """Slot templates keyed by date. Empty when the doctor is unknown."""
    params = {"start": start.isoformat(), "days": days}
    if doctor_id:
        params["doctor_id"] = doctor_id
    response = _request(DOCTOR_SERVICE, "GET", f"{DOCTOR_SERVICE_URL}/api/public/slots", params=params)
    if response.status_code == 404:
        return {}
    return _json(DOCTOR_SERVICE, response)["dates"]


def match_patient(data: dict) -> dict:
    """Find or create the patient record for an online booking.

    Raises ValueError with the patient service's detail when it rejects the data.
    """
    response = _request(PATIENT_SERVICE, "POST", f"{PATIENT_SERVICE_URL}/internal/patients/match", json=data)
    if response.status_code == 422:
        try:
            detail = response.json()["detail"]
        except (ValueError, KeyError):
            detail = "Please check the patient details."
        raise ValueError(detail)
    return _json(PATIENT_SERVICE, response)


def get_patient(patient_id: int) -> dict | None:
    response = _request(PATIENT_SERVICE, "GET", f"{PATIENT_SERVICE_URL}/internal/patients/{patient_id}")
    if response.status_code == 404:
        return None
    return _json(PATIENT_SERVICE, response)
