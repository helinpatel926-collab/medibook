import os
import time

import jwt
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("SEED_ENABLED", "true")

import db  # noqa: E402
from main import app  # noqa: E402


def staff_headers() -> dict:
    now = int(time.time())
    token = jwt.encode(
        {"sub": "frontdesk@medibook.test", "name": "Front desk", "role": "Receptionist", "iss": "medibook-auth", "iat": now, "exp": now + 600},
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def client():
    if not os.getenv("DB_NAME", "").endswith("_test"):
        pytest.fail("Tests must run against a *_test database (DB_NAME).")
    with TestClient(app) as test_client:
        with db.get_connection() as conn:
            conn.execute("TRUNCATE patients RESTART IDENTITY")
        yield test_client
