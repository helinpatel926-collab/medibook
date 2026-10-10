"""Staff session check: verifies the signed token issued by the auth service."""
import os

import jwt
from fastapi import Header, HTTPException


def require_staff(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in required", headers={"WWW-Authenticate": "Bearer"})
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=503, detail="Staff sign-in is not configured")
    try:
        return jwt.decode(authorization[7:], secret, algorithms=["HS256"], issuer="medibook-auth")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Your session has ended. Please sign in again.")
