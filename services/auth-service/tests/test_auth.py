import os

os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("STAFF_EMAIL", "frontdesk@medibook.test")
os.environ.setdefault("STAFF_PASSWORD", "correct-horse")

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402

client = TestClient(app)


def test_health_and_ready():
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/ready").json() == {"status": "ready"}


def test_login_and_me():
    response = client.post("/api/auth/login", json={"email": "FrontDesk@medibook.test", "password": "correct-horse"})
    assert response.status_code == 200
    token = response.json()["token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json() == {"email": "frontdesk@medibook.test", "name": "Front desk", "role": "Receptionist"}


def test_wrong_password():
    response = client.post("/api/auth/login", json={"email": "frontdesk@medibook.test", "password": "nope"})
    assert response.status_code == 401


def test_me_needs_token():
    assert client.get("/api/auth/me").status_code == 401
