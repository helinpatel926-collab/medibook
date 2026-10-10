import os

import pytest
from fastapi.testclient import TestClient

import db
from main import app


@pytest.fixture()
def client():
    # Tests truncate all tables, so they only run against a *_test database.
    if not os.getenv("DB_NAME", "").endswith("_test"):
        pytest.fail("Tests must run against a *_test database (DB_NAME).")

    with TestClient(app) as test_client:
        with db.get_connection() as conn:
            conn.execute("TRUNCATE appointments, patients RESTART IDENTITY CASCADE")
        yield test_client
