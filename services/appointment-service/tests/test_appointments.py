import re
from datetime import date, timedelta

import httpx
import pytest

import clients
import db
from conftest import TIMES, open_day, staff_headers
from rules import age_allowed, age_in_years, now_local

ADULT = {"full_name": "Asha Rao", "dob": "1990-04-12", "phone": "416-555-0101", "email": "asha@example.com"}
CHILD = {"full_name": "Mia Rao", "dob": "2018-06-01", "phone": "416-555-0101"}
REF = re.compile(r"^MB-[A-Z2-9]{4}$")


def booking(day: date, at: str = "09:00", doctor_id: str = "d1", patient: dict = ADULT, **extra) -> dict:
    return {
        "doctor_id": doctor_id,
        "date": day.isoformat(),
        "time": at,
        "type": "New patient",
        "reason": "Check-up",
        "consent": True,
        "patient": patient,
        **extra,
    }


def book(client, day: date, at: str = "09:00", doctor_id: str = "d1", patient: dict = ADULT) -> dict:
    response = client.post("/api/public/bookings", json=booking(day, at, doctor_id, patient))
    assert response.status_code == 201, response.text
    return response.json()["appointment"]


def set_status(client, appointment_id: int, status: str):
    return client.patch(f"/api/staff/appointments/{appointment_id}", json={"status": status}, headers=staff_headers())


def staff_list(client, **params) -> list[dict]:
    return client.get("/api/staff/appointments", params=params, headers=staff_headers()).json()


def ids(rows: list[dict]) -> list[int]:
    return [row["id"] for row in rows]


def test_health_and_ready(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/ready").json() == {"status": "ready"}
    assert client.get("/version").json()["service"] == "appointment-service"


def test_online_booking(client):
    day = open_day()
    response = client.post("/api/public/bookings", json=booking(day))
    assert response.status_code == 201
    body = response.json()
    assert REF.match(body["ref"])
    appointment = body["appointment"]
    assert appointment["ref"] == body["ref"]
    assert appointment["start"] == f"{day.isoformat()}T09:00"
    assert (appointment["patient_name"], appointment["patient_mrn"]) == ("Asha Rao", "MRN-10241")
    assert (appointment["status"], appointment["source"], appointment["type"]) == ("scheduled", "online", "New patient")
    assert appointment["reason"] == "Check-up"
    assert appointment["created_at"]


def test_double_booking_is_rejected(client):
    day = open_day()
    book(client, day)
    response = client.post("/api/public/bookings", json=booking(day, patient={**ADULT, "full_name": "Liam Tremblay"}))
    assert response.status_code == 409
    assert response.json()["detail"] == "That time was just taken. Please pick another time."


def test_booking_rules_run_before_patient_lookup(client, patients):
    day = open_day()
    today = now_local().date()
    sunday = today + timedelta(days=7 - today.isoweekday() % 7)
    cases = [
        (booking(day, consent=False), "Please agree so we can keep your booking."),
        (booking(day, at="08:00"), "That time isn't available for this doctor."),
        (booking(sunday), "That time isn't available for this doctor."),
        (booking(open_day(-6)), "That time has already passed. Pick a later time."),
        (booking(day, doctor_id="d4"), "Pediatrics sees patients under 18. Please choose another doctor."),
    ]
    for body, detail in cases:
        response = client.post("/api/public/bookings", json=body)
        assert response.status_code == 422
        assert response.json()["detail"] == detail
    response = client.post("/api/public/bookings", json=booking(day, doctor_id="nope"))
    assert response.status_code == 404
    assert patients.match_calls == 0


def test_pediatrics_accepts_children(client):
    assert book(client, open_day(), doctor_id="d4", patient=CHILD)["doctor_id"] == "d4"


def test_patient_details_are_validated(client, patients):
    day = open_day()
    invalid = [
        {**ADULT, "phone": "call me"},
        {**ADULT, "dob": "2999-01-01"},
        {**ADULT, "email": "not-an-email"},
        {key: value for key, value in ADULT.items() if key != "dob"},
    ]
    for patient in invalid:
        assert client.post("/api/public/bookings", json=booking(day, patient=patient)).status_code == 422
    assert client.post("/api/public/bookings", json=booking(day, reason="x" * 301)).status_code == 422
    assert patients.match_calls == 0


def test_patient_service_rejection_is_passed_through(client, monkeypatch):
    def reject(data):
        raise ValueError("Phone number looks wrong")

    monkeypatch.setattr(clients, "match_patient", reject)
    response = client.post("/api/public/bookings", json=booking(open_day()))
    assert response.status_code == 422
    assert response.json()["detail"] == "Phone number looks wrong"


def test_ref_collision_is_retried(client, monkeypatch):
    refs = iter(["MB-AAAA", "MB-AAAA", "MB-BBBB"])
    monkeypatch.setattr(db, "new_ref", lambda: next(refs))
    day = open_day()
    assert book(client, day)["ref"] == "MB-AAAA"
    assert book(client, day, at="09:30")["ref"] == "MB-BBBB"


def test_staff_routes_need_sign_in(client):
    assert client.get("/api/staff/appointments").status_code == 401
    assert client.post("/api/staff/appointments", json={}).status_code == 401
    assert client.patch("/api/staff/appointments/1", json={"status": "cancelled"}).status_code == 401
    bad = {"Authorization": "Bearer not-a-token"}
    assert client.get("/api/staff/appointments", headers=bad).status_code == 401


def test_staff_list_and_filters(client):
    day = open_day()
    first = book(client, day)
    child = book(client, day, at="10:00", doctor_id="d4", patient=CHILD)
    later = book(client, open_day(9), at="11:00")
    assert ids(staff_list(client)) == [first["id"], child["id"], later["id"]]
    assert ids(staff_list(client, start=day.isoformat(), end=day.isoformat())) == [first["id"], child["id"]]
    assert ids(staff_list(client, doctor_id="d4")) == [child["id"]]
    assert ids(staff_list(client, patient_id=first["patient_id"])) == [first["id"], later["id"]]
    set_status(client, first["id"], "cancelled")
    assert ids(staff_list(client, status="cancelled")) == [first["id"]]
    assert len(staff_list(client, limit=1)) == 1
    response = client.get("/api/staff/appointments", params={"limit": 5001}, headers=staff_headers())
    assert response.status_code == 422


def test_staff_create(client, patients):
    liam = patients.add("Liam Tremblay", dob="1985-02-01")
    noah = patients.add("Noah Singh")
    day = open_day()
    body = {"patient_id": liam["id"], "doctor_id": "d1", "date": day.isoformat(), "time": "14:30", "type": "Follow-up", "reason": None}
    response = client.post("/api/staff/appointments", json=body, headers=staff_headers())
    assert response.status_code == 201
    appointment = response.json()
    assert (appointment["ref"], appointment["source"], appointment["type"]) == (None, "staff", "Follow-up")
    assert (appointment["patient_name"], appointment["patient_mrn"]) == ("Liam Tremblay", "MRN-10241")
    assert appointment["start"] == f"{day.isoformat()}T14:30"

    again = client.post("/api/staff/appointments", json=body, headers=staff_headers())
    assert again.status_code == 409
    missing = client.post("/api/staff/appointments", json={**body, "patient_id": 99, "time": "15:00"}, headers=staff_headers())
    assert (missing.status_code, missing.json()["detail"]) == (404, "Patient not found")
    adult = client.post("/api/staff/appointments", json={**body, "doctor_id": "d4"}, headers=staff_headers())
    assert adult.status_code == 422
    unknown_age = client.post("/api/staff/appointments", json={**body, "patient_id": noah["id"], "doctor_id": "d4"}, headers=staff_headers())
    assert unknown_age.status_code == 201


def test_cancel_and_restore(client):
    appointment = book(client, open_day())
    cancelled = set_status(client, appointment["id"], "cancelled")
    assert (cancelled.status_code, cancelled.json()["status"]) == (200, "cancelled")
    restored = set_status(client, appointment["id"], "scheduled")
    assert (restored.status_code, restored.json()["status"]) == (200, "scheduled")
    assert set_status(client, 999, "cancelled").status_code == 404
    assert set_status(client, appointment["id"], "no-show").status_code == 422


def test_restore_when_slot_retaken(client):
    day = open_day()
    first = book(client, day)
    set_status(client, first["id"], "cancelled")
    book(client, day, patient={**ADULT, "full_name": "Liam Tremblay"})
    response = set_status(client, first["id"], "scheduled")
    assert response.status_code == 409
    assert response.json()["detail"] == "That time has been booked again, so this can't be restored."


def test_future_appointment_cannot_be_completed(client):
    appointment = book(client, open_day())
    response = set_status(client, appointment["id"], "completed")
    assert response.status_code == 422
    assert response.json()["detail"] == "Only today's or past appointments can be completed."


def test_availability_marks_booked_slots(client):
    day = open_day()
    book(client, day)
    body = client.get("/api/public/availability", params={"doctor_id": "d1"}).json()
    assert body["doctor_id"] == "d1"
    assert len(body["days"]) == 12
    assert all(entry["open"] >= 1 for entry in body["days"])
    entry = next(entry for entry in body["days"] if entry["date"] == day.isoformat())
    slots = {slot["time"]: slot["free"] for slot in entry["slots"]}
    assert (slots["09:00"], slots["09:30"]) == (False, True)
    assert entry["open"] == len(TIMES) - 1
    limited = client.get("/api/public/availability", params={"doctor_id": "d1", "limit": 3}).json()
    assert len(limited["days"]) == 3
    assert client.get("/api/public/availability", params={"doctor_id": "zz"}).status_code == 404
    assert client.get("/api/public/availability", params={"doctor_id": "d1", "limit": 31}).status_code == 422


def test_next_available_and_summary(client):
    before = client.get("/api/public/summary").json()
    assert set(before) == {"open_slots_7d"}
    upcoming = client.get("/api/public/next-available").json()
    assert [item["doctor_id"] for item in upcoming] == ["d1", "d4"]
    assert all(set(item) == {"doctor_id", "date", "time"} for item in upcoming)
    first = upcoming[0]
    book(client, date.fromisoformat(first["date"]), at=first["time"])
    after = client.get("/api/public/next-available").json()[0]
    assert (after["date"], after["time"]) != (first["date"], first["time"])
    assert client.get("/api/public/summary").json()["open_slots_7d"] == before["open_slots_7d"] - 1


def test_doctor_service_down_returns_503(client, monkeypatch):
    def down(*args, **kwargs):
        raise clients.DependencyError("Doctor service")

    monkeypatch.setattr(clients, "schedule", down)
    response = client.get("/api/public/availability", params={"doctor_id": "d1"})
    assert response.status_code == 503
    assert response.json()["detail"] == "Doctor service is unavailable. Please try again shortly."
    assert client.get("/api/public/summary").status_code == 503


def test_patient_service_down_returns_503(client, monkeypatch):
    def down(*args, **kwargs):
        raise clients.DependencyError("Patient service")

    monkeypatch.setattr(clients, "match_patient", down)
    response = client.post("/api/public/bookings", json=booking(open_day()))
    assert response.status_code == 503
    assert response.json()["detail"] == "Patient service is unavailable. Please try again shortly."
    assert staff_list(client) == []


def test_seed_runs_once(client):
    today = now_local().date()
    past, future = today - timedelta(days=10), open_day()
    base = {"patient_id": 1, "patient_name": "Asha Rao", "patient_mrn": "MRN-10241", "doctor_id": "d1", "type": "Follow-up", "reason": None}
    rows = [
        {**base, "start": f"{past}T09:00", "source": "staff", "created_days_before": 3},
        {**base, "start": f"{future}T10:00", "source": "online", "created_days_before": 30},
        {**base, "start": f"{future}T10:00", "source": "staff"},
        {**base, "start": f"{future}T11:00", "source": "online", "cancelled": True},
    ]
    assert client.post("/internal/seed", json=rows).json() == {"inserted": 3, "skipped": False}
    assert client.post("/internal/seed", json=rows).json() == {"inserted": 0, "skipped": True}

    seeded = staff_list(client)
    assert [row["status"] for row in seeded] == ["completed", "scheduled", "cancelled"]
    assert seeded[0]["ref"] is None
    assert all(REF.match(row["ref"]) for row in seeded[1:])
    assert seeded[0]["created_at"].startswith((past - timedelta(days=3)).isoformat())
    assert seeded[1]["created_at"].startswith((future - timedelta(days=30)).isoformat())

    assert set_status(client, seeded[0]["id"], "scheduled").status_code == 200
    assert set_status(client, seeded[0]["id"], "completed").json()["status"] == "completed"


def test_seed_disabled(client, monkeypatch):
    monkeypatch.setenv("SEED_ENABLED", "false")
    assert client.post("/internal/seed", json=[]).status_code == 404


def test_metrics(client):
    client.get("/api/public/summary")
    assert "http_requests_total" in client.get("/metrics").text


def test_age_rules():
    on = date(2026, 10, 10)
    assert age_in_years(date(2008, 10, 11), on) == 17
    assert age_in_years(date(2008, 10, 10), on) == 18
    assert age_allowed("Pediatrics", date(2010, 1, 1), on)
    assert not age_allowed("Pediatrics", date(2000, 1, 1), on)
    assert age_allowed("Pediatrics", None, on)
    assert age_allowed("Cardiology", date(1950, 1, 1), on)


def mock_http(monkeypatch, handler) -> None:
    monkeypatch.setattr(clients, "_http", httpx.Client(transport=httpx.MockTransport(handler)))
    monkeypatch.setattr(clients, "_doctor_cache", {"doctors": None, "expires": 0.0})


def test_clients_map_service_responses(monkeypatch):
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        if request.url.path == "/api/public/doctors":
            return httpx.Response(200, json=[{"id": "d1", "department": "Family Medicine"}])
        if request.url.path == "/api/public/slots":
            return httpx.Response(404, json={"detail": "Doctor not found"})
        if request.url.path == "/internal/patients/match":
            return httpx.Response(422, json={"detail": "Phone number looks wrong"})
        if request.url.path == "/internal/patients/7":
            return httpx.Response(404, json={"detail": "Patient not found"})
        return httpx.Response(500)

    mock_http(monkeypatch, handler)
    assert list(clients.doctors()) == ["d1"]
    clients.doctors()
    assert calls.count("/api/public/doctors") == 1
    assert clients.schedule(date(2026, 10, 13), 1, "zz") == {}
    with pytest.raises(ValueError, match="Phone number looks wrong"):
        clients.match_patient({"full_name": "Asha Rao"})
    assert clients.get_patient(7) is None
    with pytest.raises(clients.DependencyError) as error:
        clients.get_patient(8)
    assert error.value.service == "Patient service"


def test_clients_raise_when_unreachable(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    mock_http(monkeypatch, handler)
    with pytest.raises(clients.DependencyError) as error:
        clients.schedule(date(2026, 10, 13), 1)
    assert error.value.service == "Doctor service"
