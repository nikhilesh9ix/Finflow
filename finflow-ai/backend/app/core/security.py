"""
Security utilities: password hashing (Argon2) and JWT tokens (PyJWT).

Password hashing uses Argon2id — the 2015 Password Hashing Competition winner.
It is memory-hard (GPU-resistant) and the current OWASP recommendation over
PBKDF2 or bcrypt for new systems.

JWT uses HS256. For multi-service deployments, prefer RS256 with a key pair.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.core.config import settings

JWT_ALGORITHM = "HS256"

# Argon2id with OWASP-recommended parameters (2023):
# time_cost=2, memory_cost=19456 (19 MB), parallelism=1 is the minimum.
# We use slightly higher settings for better resistance.
_ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def get_password_hash(password: str) -> str:
    return _ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return _ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError, Exception):
        return False


def password_needs_rehash(hashed_password: str) -> bool:
    """True when stored hash uses outdated parameters — rehash on next login."""
    return _ph.check_needs_rehash(hashed_password)


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=expires_minutes or settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": expires_at,
        # Unique token id, so logging out can revoke this one session server-side.
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=JWT_ALGORITHM)


def decode_token_claims(token: str) -> dict[str, Any] | None:
    """Verified claims of a token, or None if it is forged, malformed or expired."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "exp", "iat"]},
        )
    except jwt.InvalidTokenError:
        return None
    return payload if isinstance(payload.get("sub"), str) else None


def decode_access_token(token: str) -> str | None:
    claims = decode_token_claims(token)
    return claims["sub"] if claims else None
