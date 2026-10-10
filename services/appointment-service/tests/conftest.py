import os
import time
from datetime import date, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("SEED_ENABLED", "true")

import clients  # noqa: E402
import db  # noqa: E402
from main import app  # noqa: E402
from rules import now_local  # noqa: E402

DOCTORS = {
    "d1": {"id": "d1", "name": "Dr. Emily Carter", "department": "Family Medicine", "room": "101", "days": [1, 2, 3, 4, 5, 6], "languages": ["English"]},
    "d4": {"id": "d4", "name": "Dr. Daniel Kim", "department": "Pediatrics", "room": "108", "days": [1, 2, 3, 4, 5, 6], "languages": ["English"]},
}
TIMES = [f"{hour:02d}:{minute:02d}" for hour in range(9, 17) for minute in (0, 30)]


def staff_headers() -> dict:
    now = int(time.time())
    token = jwt.encode(
        {"sub": "frontdesk@medibook.test", "name": "Front desk", "role": "Receptionist", "iss": "medibook-auth", "iat": now, "exp": now + 600},
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def open_day(offset: int = 1) -> date:
    """The first non-Sunday on or after today + offset (clinic time)."""
    day = now_local().date() + timedelta(days=offset)
    while day.isoweekday() == 7:
        day += timedelta(days=1)
    return day


def fake_schedule(start: date, days: int, doctor_id: str | None = None) -> dict:
    if doctor_id and doctor_id not in DOCTORS:
        return {}
    ids = [doctor_id] if doctor_id else list(DOCTORS)
    dates = {}
    for offset in range(days):
        day = start + timedelta(days=offset)
        sunday = day.isoweekday() == 7
        dates[day.isoformat()] = {
            "closed_reason": "Sunday" if sunday else None,
            "doctors": {d: [] if sunday else list(TIMES) for d in ids},
        }
    return dates


class FakePatients:
    """In-memory stand-in for the patient service."""

    def __init__(self):
        self.rows: dict[int, dict] = {}
        self.match_calls = 0

    def add(self, full_name, dob=None, phone=None, email=None, health_card=None) -> dict:
        patient_id = len(self.rows) + 1
        self.rows[patient_id] = {
            "id": patient_id,
            "mrn": f"MRN-{10240 + patient_id}",
            "full_name": full_name,
            "dob": dob,
            "phone": phone,
            "email": email,
            "health_card": health_card,
            "created_at": "2026-01-01T00:00:00Z",
        }
        return self.rows[patient_id]

    def match(self, data: dict) -> dict:
        self.match_calls += 1
        for row in self.rows.values():
            if row["full_name"].lower() == data["full_name"].lower() and row["phone"] == data["phone"]:
                return {**row, "created": False}
        return {**self.add(**data), "created": True}

    def get(self, patient_id: int) -> dict | None:
        return self.rows.get(patient_id)


@pytest.fixture()
def patients(monkeypatch):
    """Replaces the doctor and patient service calls with in-memory fakes."""
    fake = FakePatients()
    monkeypatch.setattr(clients, "doctors", lambda: DOCTORS)
    monkeypatch.setattr(clients, "schedule", fake_schedule)
    monkeypatch.setattr(clients, "match_patient", fake.match)
    monkeypatch.setattr(clients, "get_patient", fake.get)
    return fake


@pytest.fixture()
def client(patients):
    if not os.getenv("DB_NAME", "").endswith("_test"):
        pytest.fail("Tests must run against a *_test database (DB_NAME).")
    with TestClient(app) as test_client:
        with db.get_connection() as conn:
            conn.execute("TRUNCATE appointments RESTART IDENTITY")
        yield test_client
