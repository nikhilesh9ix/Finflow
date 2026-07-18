from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class TimestampedResponse(BaseModel):
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class Page(BaseModel, Generic[T]):
    """Generic paginated response envelope used across all list endpoints."""

    items: list[T]
    total: int
    limit: int
    offset: int

    model_config = {"from_attributes": True}
