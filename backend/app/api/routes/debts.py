from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.finance import Debt, User
from app.schemas.finance import DebtAuditRequest, DebtAuditResponse, DebtCreate, DebtRead
from app.services.finance import debt_audit, debt_strategy

router = APIRouter(prefix="/debts", tags=["debts"])


@router.get("", response_model=list[DebtRead])
def list_debts(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> list[Debt]:
    return list(db.scalars(select(Debt).where(Debt.user_id == user.id).order_by(Debt.interest_rate.desc())))


@router.post("", response_model=DebtRead, status_code=status.HTTP_201_CREATED)
def create_debt(payload: DebtCreate, db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> Debt:
    debt = Debt(user_id=user.id, **payload.model_dump())
    db.add(debt)
    db.commit()
    db.refresh(debt)
    return debt


@router.get("/strategy")
def get_debt_strategy(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> dict:
    return debt_strategy(db, user)


@router.post("/audit", response_model=DebtAuditResponse)
def audit_debts(
    payload: DebtAuditRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return debt_audit(db, user, payload)
