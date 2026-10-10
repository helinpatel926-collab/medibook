from datetime import date

from schedule import closed_reason, clinic_slots


def test_health_and_ready(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/ready").json() == {"status": "ready"}


def test_departments(client):
    names = [d["name"] for d in client.get("/api/public/departments").json()]
    assert names == ["Family Medicine", "Cardiology", "Dermatology", "Pediatrics", "Orthopedics"]


def test_doctors(client):
    doctors = client.get("/api/public/doctors").json()
    assert len(doctors) == 5
    carter = client.get("/api/public/doctors/d1").json()
    assert carter["department"] == "Family Medicine"
    assert carter["days"] == [1, 2, 3, 4, 5, 6]
    assert client.get("/api/public/doctors/nope").status_code == 404


def test_clinic_rules():
    assert closed_reason(date(2026, 10, 12)) == "Thanksgiving"
    assert closed_reason(date(2026, 10, 11)) == "Sunday"
    assert len(clinic_slots(date(2026, 10, 13))) == 16
    assert len(clinic_slots(date(2026, 10, 17))) == 8


def test_slots_per_doctor(client):
    body = client.get("/api/public/slots", params={"start": "2026-10-12", "days": 3}).json()
    monday, tuesday = body["dates"]["2026-10-12"], body["dates"]["2026-10-13"]
    assert monday["closed_reason"] == "Thanksgiving"
    assert monday["doctors"]["d1"] == []
    assert tuesday["doctors"]["d3"][0] == "09:00"
    assert body["dates"]["2026-10-14"]["doctors"]["d3"] == []


def test_slots_unknown_doctor(client):
    response = client.get("/api/public/slots", params={"start": "2026-10-13", "doctor_id": "x"})
    assert response.status_code == 404


def test_metrics(client):
    client.get("/api/public/doctors")
    assert "http_requests_total" in client.get("/metrics").text
