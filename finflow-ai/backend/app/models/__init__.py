"""
Domain models — typed views over MongoDB documents.

These replace the SQLAlchemy ORM classes. They keep the same field names and
attribute access (``user.monthly_income``), so services and response schemas
work unchanged. Build one from a stored document with ``Model.from_doc(doc)``.

Relationships (user.transactions etc.) are gone: query the collection by
``user_id`` instead.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Self

from pydantic import BaseModel, ConfigDict

from app.db.mongo import from_mongo


class Document(BaseModel):
    # validate_assignment keeps field types honest when services mutate a model.
    model_config = ConfigDict(extra="ignore", validate_assignment=True)

    id: int
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_doc(cls, doc: dict[str, Any] | None) -> Self | None:
        return cls.model_validate(from_mongo(doc)) if doc else None


class User(Document):
    email: str
    full_name: str
    hashed_password: str
    monthly_income: Decimal = Decimal("0")
    currency: str = "INR"


class Transaction(Document):
    user_id: int
    transaction_date: date
    description: str
    merchant: str | None = None
    category: str
    amount: Decimal
    transaction_type: str  # income | expense | transfer
    source: str = "manual"


class Budget(Document):
    user_id: int
    category: str
    monthly_limit: Decimal
    priority: str = "normal"


class SavingsGoal(Document):
    user_id: int
    name: str
    target_amount: Decimal
    current_amount: Decimal = Decimal("0")
    target_date: date | None = None


class DebtAccount(Document):
    user_id: int
    lender: str
    debt_type: str
    outstanding_amount: Decimal
    interest_rate: Decimal
    emi_amount: Decimal
    due_day: int


class InvestmentProfile(Document):
    user_id: int
    risk_profile: str = "balanced"
    monthly_investment_capacity: Decimal = Decimal("0")
    emergency_fund_target: Decimal = Decimal("0")
    emergency_fund_current: Decimal = Decimal("0")
    notes: str | None = None


class ChatHistory(Document):
    user_id: int
    role: str
    message: str


__all__ = [
    "Budget",
    "ChatHistory",
    "DebtAccount",
    "Document",
    "InvestmentProfile",
    "SavingsGoal",
    "Transaction",
    "User",
]
