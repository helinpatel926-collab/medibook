from conftest import staff_headers

ASHA = {"full_name": "Asha Rao", "dob": "1990-04-12", "phone": "416-555-0101", "email": "asha@example.com"}


def test_health_and_ready(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/ready").json() == {"status": "ready"}


def test_staff_routes_need_sign_in(client):
    assert client.get("/api/staff/patients").status_code == 401
    bad = {"Authorization": "Bearer not-a-token"}
    assert client.get("/api/staff/patients", headers=bad).status_code == 401


def test_create_list_and_search(client):
    created = client.post("/api/staff/patients", json=ASHA, headers=staff_headers())
    assert created.status_code == 201
    assert created.json()["mrn"] == "MRN-10241"
    client.post("/api/staff/patients", json={"full_name": "Liam Tremblay"}, headers=staff_headers())
    names = [p["full_name"] for p in client.get("/api/staff/patients", headers=staff_headers()).json()]
    assert names == ["Asha Rao", "Liam Tremblay"]
    by_phone = client.get("/api/staff/patients", params={"q": "4165550101"}, headers=staff_headers()).json()
    assert [p["full_name"] for p in by_phone] == ["Asha Rao"]
    by_mrn = client.get("/api/staff/patients", params={"q": "MRN-10242"}, headers=staff_headers()).json()
    assert [p["full_name"] for p in by_mrn] == ["Liam Tremblay"]


def test_validation(client):
    response = client.post("/api/staff/patients", json={"full_name": "  "}, headers=staff_headers())
    assert response.status_code == 422
    response = client.post("/api/staff/patients", json={"full_name": "A", "dob": "2999-01-01"}, headers=staff_headers())
    assert response.status_code == 422


def test_match_reuses_existing_patient(client):
    first = client.post("/internal/patients/match", json=ASHA).json()
    again = client.post("/internal/patients/match", json={"full_name": "asha rao", "phone": "(416) 555-0101", "dob": "1990-04-12"}).json()
    assert first["created"] is True
    assert again["created"] is False
    assert again["id"] == first["id"]
    other = client.post("/internal/patients/match", json={"full_name": "Asha Rao", "phone": "647-555-0000"}).json()
    assert other["created"] is True


def test_internal_get(client):
    created = client.post("/internal/patients/match", json=ASHA).json()
    assert client.get(f"/internal/patients/{created['id']}").json()["full_name"] == "Asha Rao"
    assert client.get("/internal/patients/999").status_code == 404


def test_seed_runs_once(client):
    seeded = client.post("/internal/seed", json=[{**ASHA, "created_days_ago": 30}]).json()
    again = client.post("/internal/seed", json=[{"full_name": "Someone Else"}]).json()
    assert len(seeded) == 1
    assert [p["full_name"] for p in again] == ["Asha Rao"]
