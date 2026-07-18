from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import TimestampedResponse


class TransactionCreateRequest(BaseModel):
    transaction_date: date
    description: str = Field(min_length=1, max_length=255)
    merchant: str | None = Field(default=None, max_length=160)
    category: str | None = Field(default=None, max_length=80)
    amount: Decimal = Field(gt=0, decimal_places=2)
    transaction_type: str = Field(pattern="^(income|expense|transfer)$")
    source: str = Field(default="manual", max_length=40)


class TransactionResponse(TimestampedResponse):
    id: int
    transaction_date: date
    description: str
    merchant: str | None
    category: str
    amount: Decimal
    transaction_type: str
    source: str


class BudgetCreateRequest(BaseModel):
    category: str = Field(min_length=1, max_length=80)
    monthly_limit: Decimal = Field(gt=0, decimal_places=2)
    priority: str = Field(default="normal", max_length=30)


class BudgetUpdateRequest(BaseModel):
    category: str | None = Field(default=None, min_length=1, max_length=80)
    monthly_limit: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    priority: str | None = Field(default=None, max_length=30)


class BudgetResponse(TimestampedResponse):
    id: int
    category: str
    monthly_limit: Decimal
    priority: str


class SavingsGoalCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    target_amount: Decimal = Field(gt=0, decimal_places=2)
    current_amount: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    target_date: date | None = None


class SavingsGoalResponse(TimestampedResponse):
    id: int
    name: str
    target_amount: Decimal
    current_amount: Decimal
    target_date: date | None


class DebtAccountCreateRequest(BaseModel):
    lender: str = Field(min_length=1, max_length=120)
    debt_type: str = Field(min_length=1, max_length=80)
    outstanding_amount: Decimal = Field(gt=0, decimal_places=2)
    interest_rate: Decimal = Field(ge=0, decimal_places=3)
    emi_amount: Decimal = Field(gt=0, decimal_places=2)
    due_day: int = Field(ge=1, le=31)


class DebtAccountResponse(TimestampedResponse):
    id: int
    lender: str
    debt_type: str
    outstanding_amount: Decimal
    interest_rate: Decimal
    emi_amount: Decimal
    due_day: int


class InvestmentProfileUpsertRequest(BaseModel):
    risk_profile: str = Field(default="balanced", max_length=40)
    monthly_investment_capacity: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    emergency_fund_target: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    emergency_fund_current: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    notes: str | None = None


class InvestmentProfileResponse(TimestampedResponse):
    id: int
    risk_profile: str
    monthly_investment_capacity: Decimal
    emergency_fund_target: Decimal
    emergency_fund_current: Decimal
    notes: str | None


class ChatMessageCreateRequest(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    message: str = Field(min_length=1)


class CopilotAskRequest(BaseModel):
    question: str = Field(default="", max_length=500)


class ChatHistoryResponse(TimestampedResponse):
    id: int
    role: str
    message: str


class CsvUploadResponse(BaseModel):
    imported: int
    skipped: int
    errors: list[dict]


class BudgetAlertResponse(BaseModel):
    budget_id: int
    category: str
    monthly_limit: Decimal
    spent: Decimal
    remaining: Decimal
    status: str


class CopilotAskResponse(BaseModel):
    answer: str
    data_status: str
