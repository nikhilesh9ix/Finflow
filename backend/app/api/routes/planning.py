from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.finance import User
from app.schemas.finance import SalaryPlanRequest, SalaryPlanResponse
from app.services.finance import investment_suggestions, salary_plan

router = APIRouter(tags=["planning"])


@router.get("/salary-orchestrator")
def get_salary_orchestrator(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> dict:
    return salary_plan(db, user)


@router.post("/salary-orchestrator", response_model=SalaryPlanResponse)
def post_salary_orchestrator(
    payload: SalaryPlanRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return salary_plan(db, user, payload)


@router.get("/investments/suggestions")
def get_investment_suggestions(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> dict:
    return investment_suggestions(db, user)
