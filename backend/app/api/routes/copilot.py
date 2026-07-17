from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.finance import User
from app.schemas.finance import CopilotHistoryResponse, CopilotRequest, CopilotResponse
from app.services.copilot import answer_question, recent_history

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.post("/ask", response_model=CopilotResponse)
def ask_copilot(payload: CopilotRequest, db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> CopilotResponse:
    return CopilotResponse(**answer_question(db, user, payload.question))


@router.get("/history", response_model=CopilotHistoryResponse)
def get_history(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]) -> dict:
    return {"items": recent_history(db, user)}
