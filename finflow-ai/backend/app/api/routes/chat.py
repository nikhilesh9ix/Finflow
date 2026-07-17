from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import ChatHistory, User
from app.schemas import ChatHistoryResponse, ChatMessageCreateRequest

router = APIRouter(prefix="/chat-history", tags=["chat"])


@router.get("", response_model=list[ChatHistoryResponse])
def list_chat_history(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ChatHistory]:
    return list(db.scalars(select(ChatHistory).where(ChatHistory.user_id == current_user.id).order_by(ChatHistory.created_at)))


@router.post("", response_model=ChatHistoryResponse, status_code=status.HTTP_201_CREATED)
def create_chat_message(
    payload: ChatMessageCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChatHistory:
    message = ChatHistory(user_id=current_user.id, **payload.model_dump())
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
