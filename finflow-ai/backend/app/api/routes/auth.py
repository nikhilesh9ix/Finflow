from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.api.deps import get_current_user
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    decode_token_claims,
    get_password_hash,
    password_needs_rehash,
    verify_password,
)
from app.db import mongo
from app.db.mongo import get_db
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.analytics import sync_income_from_transactions

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user account",
)
@limiter.limit("5/minute")
def register(
    request: Request,
    payload: RegisterRequest,
    db: Annotated[Database, Depends(get_db)],
) -> User:
    if db[mongo.USERS].find_one({"email": str(payload.email)}, {"_id": 1}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Income starts at zero and is filled in from the first CSV import — see
    # analytics.sync_income_from_transactions, which also seeds the emergency target.
    try:
        doc = mongo.insert(
            db,
            mongo.USERS,
            {
                "email": str(payload.email),
                "full_name": payload.full_name,
                "hashed_password": get_password_hash(payload.password),
                "monthly_income": Decimal("0"),
                "currency": payload.currency,
            },
        )
    except DuplicateKeyError as exc:
        # Two sign-ups raced past the check above; the unique email index caught it.
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered") from exc

    mongo.insert(
        db,
        mongo.INVESTMENT_PROFILES,
        {
            "user_id": doc["id"],
            "risk_profile": "balanced",
            "monthly_investment_capacity": Decimal("0"),
            "emergency_fund_target": Decimal("0"),
            "emergency_fund_current": Decimal("0"),
            "notes": None,
        },
    )
    return User.model_validate(doc)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive a JWT access token",
)
@limiter.limit("10/minute")
def login(
    request: Request,
    payload: LoginRequest,
    db: Annotated[Database, Depends(get_db)],
) -> TokenResponse:
    user = User.from_doc(db[mongo.USERS].find_one({"email": str(payload.email)}))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Transparently rehash if Argon2 parameters have been tightened since last login.
    if password_needs_rehash(user.hashed_password):
        mongo.update(db, mongo.USERS, {"id": user.id}, {"hashed_password": get_password_hash(payload.password)})

    # MongoDB here has no multi-document transactions, so an import that failed
    # after saving its rows could leave monthly income stale. Recomputing on login
    # guarantees it is correct by the next session.
    sync_income_from_transactions(db, user)

    return TokenResponse(access_token=create_access_token(user.email))


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke the current access token",
)
def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Database, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    # get_current_user has already validated the token and rejected revoked ones.
    claims = decode_token_claims((authorization or "").split(" ", 1)[-1]) or {}
    if not claims.get("jti"):
        return  # legacy token without an id: nothing to revoke, it expires on its own
    db[mongo.REVOKED_TOKENS].update_one(
        {"jti": claims["jti"]},
        {"$setOnInsert": {"jti": claims["jti"], "expires_at": datetime.fromtimestamp(claims["exp"], tz=UTC)}},
        upsert=True,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the authenticated user's profile",
)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return current_user
