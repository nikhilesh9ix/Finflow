from typing import Annotated

from fastapi import APIRouter, Depends, status
from pymongo.database import Database

from app.api.deps import get_current_user
from app.db import mongo
from app.db.mongo import get_db
from app.models import ChatHistory, User
from app.schemas import ChatHistoryResponse, ChatMessageCreateRequest

router = APIRouter(prefix="/chat-history", tags=["chat"])


@router.get("", response_model=list[ChatHistoryResponse])
def list_chat_history(
    db: Annotated[Database, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ChatHistory]:
    cursor = db[mongo.CHAT_HISTORY].find({"user_id": current_user.id}).sort("id", 1)
    return [ChatHistory.from_doc(doc) for doc in cursor]


@router.post("", response_model=ChatHistoryResponse, status_code=status.HTTP_201_CREATED)
def create_chat_message(
    payload: ChatMessageCreateRequest,
    db: Annotated[Database, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChatHistory:
    doc = mongo.insert(db, mongo.CHAT_HISTORY, {"user_id": current_user.id, **payload.model_dump()})
    return ChatHistory.model_validate(doc)
