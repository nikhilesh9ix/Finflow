from pydantic import EmailStr

from app.schemas.common import TimestampedResponse


class UserResponse(TimestampedResponse):
    id: int
    email: EmailStr
    full_name: str
    monthly_income: float
    currency: str
