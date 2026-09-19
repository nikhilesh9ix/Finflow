from datetime import datetime
from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")

_BASE_CONFIG = ConfigDict(from_attributes=True, json_encoders={Decimal: float})


class TimestampedResponse(BaseModel):
    created_at: datetime
    updated_at: datetime

    model_config = _BASE_CONFIG


class Page(BaseModel, Generic[T]):
    """Generic paginated response envelope used across all list endpoints."""

    items: list[T]
    total: int
    limit: int
    offset: int

    model_config = _BASE_CONFIG
