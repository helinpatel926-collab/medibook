import os

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture()
def client():
    if not os.getenv("DB_NAME", "").endswith("_test"):
        pytest.fail("Tests must run against a *_test database (DB_NAME).")
    with TestClient(app) as test_client:
        yield test_client
