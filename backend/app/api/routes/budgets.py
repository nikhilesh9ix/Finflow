from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.finance import Budget, User
from app.schemas.finance import BudgetRead, BudgetUpsert
from app.services.finance import dashboard_summary

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetRead])
def list_budgets(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> list[dict]:
    budgets = list(db.scalars(select(Budget).where(Budget.user_id == user.id).order_by(Budget.category)))
    spend_map = {item["category"]: item["amount"] for item in dashboard_summary(db, user)["category_spend"]}
    return [{**BudgetRead.model_validate(budget).model_dump(), "spent": spend_map.get(budget.category, 0)} for budget in budgets]


@router.post("", response_model=BudgetRead)
def upsert_budget(payload: BudgetUpsert, db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> Budget:
    budget = db.scalar(select(Budget).where(Budget.user_id == user.id, Budget.category == payload.category))
    if budget:
        budget.monthly_limit = payload.monthly_limit
        budget.priority = payload.priority
    else:
        budget = Budget(user_id=user.id, **payload.model_dump())
        db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget
