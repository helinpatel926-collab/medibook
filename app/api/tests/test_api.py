PATIENT = {
    "full_name": "Asha Rao",
    "email": "asha@example.com",
    "phone": "+1-416-555-0101",
    "date_of_birth": "1990-04-12",
}


def add_patient(client):
    response = client.post("/api/patients", json=PATIENT)
    assert response.status_code == 201
    return response.json()


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready(client):
    response = client.get("/api/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_version(client):
    response = client.get("/api/version")
    assert response.status_code == 200
    assert "version" in response.json()


def test_create_and_list_patients(client):
    patient = add_patient(client)
    assert patient["id"] == 1
    assert patient["full_name"] == "Asha Rao"

    response = client.get("/api/patients")
    assert response.status_code == 200
    assert [p["full_name"] for p in response.json()] == ["Asha Rao"]


def test_patient_name_is_required(client):
    response = client.post("/api/patients", json={"full_name": "   "})
    assert response.status_code == 422


def test_book_appointment(client):
    patient = add_patient(client)
    response = client.post(
        "/api/appointments",
        json={
            "patient_id": patient["id"],
            "doctor": "Dr. Emily Carter (Family Medicine)",
            "appointment_time": "2030-01-15T10:30:00",
            "reason": "Annual check-up",
        },
    )
    assert response.status_code == 201
    appointment = response.json()
    assert appointment["patient_name"] == "Asha Rao"
    assert appointment["status"] == "scheduled"

    response = client.get("/api/appointments")
    assert len(response.json()) == 1


def test_appointment_for_unknown_patient(client):
    response = client.post(
        "/api/appointments",
        json={
            "patient_id": 999,
            "doctor": "Dr. Emily Carter (Family Medicine)",
            "appointment_time": "2030-01-15T10:30:00",
        },
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not found"


def test_metrics(client):
    client.get("/api/version")
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text
