"""MediBook auth service: staff sign-in that issues signed session tokens.

A stand-in identity provider for local and demo use; Amazon Cognito can replace it on AWS.
"""
import hashlib
import hmac
import os
import secrets
import time

import jwt
from fastapi import Depends, FastAPI, HTTPException
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel, Field

from auth import require_staff

APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
TOKEN_TTL = int(os.getenv("TOKEN_TTL_SECONDS", "28800"))
STAFF_EMAIL = os.getenv("STAFF_EMAIL", "").strip().lower()
STAFF_NAME = os.getenv("STAFF_NAME", "Front desk")
STAFF_ROLE = os.getenv("STAFF_ROLE", "Receptionist")
_SALT = secrets.token_bytes(16)


def _hash(password: str) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), _SALT, 200_000)


_EXPECTED = _hash(os.environ["STAFF_PASSWORD"]) if os.getenv("STAFF_PASSWORD") else None

app = FastAPI(title="MediBook auth service", version=APP_VERSION)
Instrumentator(excluded_handlers=["/metrics", "/health", "/ready"]).instrument(app).expose(app, include_in_schema=False)


class LoginIn(BaseModel):
    email: str = Field(max_length=200)
    password: str = Field(max_length=200)


def configured() -> bool:
    return bool(STAFF_EMAIL and _EXPECTED and os.getenv("JWT_SECRET"))


@app.get("/health", tags=["ops"])
def health():
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/ready", tags=["ops"])
def ready():
    """Readiness probe. Checks that sign-in is configured."""
    if not configured():
        raise HTTPException(status_code=503, detail="Staff sign-in is not configured")
    return {"status": "ready"}


@app.get("/version", tags=["ops"])
def version():
    return {"service": "auth-service", "version": APP_VERSION}


@app.post("/api/auth/login", tags=["auth"])
def login(body: LoginIn):
    if not configured():
        raise HTTPException(status_code=503, detail="Staff sign-in is not configured")
    email_ok = hmac.compare_digest(body.email.strip().lower().encode(), STAFF_EMAIL.encode())
    password_ok = hmac.compare_digest(_hash(body.password), _EXPECTED)
    if not (email_ok and password_ok):
        raise HTTPException(status_code=401, detail="That email and password don't match a staff account.")
    now = int(time.time())
    claims = {"sub": STAFF_EMAIL, "name": STAFF_NAME, "role": STAFF_ROLE, "iss": "medibook-auth", "iat": now, "exp": now + TOKEN_TTL}
    token = jwt.encode(claims, os.environ["JWT_SECRET"], algorithm="HS256")
    return {"token": token, "expires_in": TOKEN_TTL, "user": {"email": STAFF_EMAIL, "name": STAFF_NAME, "role": STAFF_ROLE}}


@app.get("/api/auth/me", tags=["auth"])
def me(user: dict = Depends(require_staff)):
    return {"email": user["sub"], "name": user["name"], "role": user["role"]}
