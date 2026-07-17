from datetime import datetime

from pydantic import BaseModel


class TimestampedResponse(BaseModel):
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
