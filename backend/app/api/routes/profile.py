from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.finance import User
from app.schemas.finance import InvestmentProfileRequest, InvestmentRecommendationResponse, ProfileUpdate, UserRead
from app.services.finance import investment_recommendation

router = APIRouter(prefix="/profile", tags=["profile"])


@router.patch("", response_model=UserRead)
def update_profile(payload: ProfileUpdate, db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> User:
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/investment", response_model=InvestmentRecommendationResponse)
def create_investment_profile(
    payload: InvestmentProfileRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return investment_recommendation(db, user, payload)
