from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    get_password_hash,
    password_needs_rehash,
    verify_password,
)
from app.db.session import get_db
from app.models import InvestmentProfile, User
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse

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
    db: Annotated[Session, Depends(get_db)],
) -> User:
    existing = db.scalar(select(User).where(User.email == str(payload.email)))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=str(payload.email),
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        monthly_income=payload.monthly_income,
        currency=payload.currency,
    )
    db.add(user)
    db.flush()
    db.add(
        InvestmentProfile(
            user_id=user.id,
            risk_profile="balanced",
            monthly_investment_capacity=0,
            emergency_fund_target=payload.monthly_income * 3,
            emergency_fund_current=0,
        )
    )
    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive a JWT access token",
)
@limiter.limit("10/minute")
def login(
    request: Request,
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == str(payload.email)))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Transparently rehash if Argon2 parameters have been tightened since last login.
    if password_needs_rehash(user.hashed_password):
        user.hashed_password = get_password_hash(payload.password)
        db.commit()

    return TokenResponse(access_token=create_access_token(user.email))


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the authenticated user's profile",
)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return current_user
