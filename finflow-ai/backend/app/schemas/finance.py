from datetime import date

from pydantic import BaseModel, Field

from app.schemas.common import TimestampedResponse


class TransactionCreateRequest(BaseModel):
    transaction_date: date
    description: str = Field(min_length=1, max_length=255)
    merchant: str | None = Field(default=None, max_length=160)
    category: str | None = Field(default=None, max_length=80)
    amount: float
    transaction_type: str = Field(pattern="^(income|expense|transfer)$")
    source: str = Field(default="manual", max_length=40)


class TransactionResponse(TimestampedResponse):
    id: int
    transaction_date: date
    description: str
    merchant: str | None
    category: str
    amount: float
    transaction_type: str
    source: str


class BudgetCreateRequest(BaseModel):
    category: str = Field(min_length=1, max_length=80)
    monthly_limit: float = Field(gt=0)
    priority: str = Field(default="normal", max_length=30)


class BudgetUpdateRequest(BaseModel):
    category: str | None = Field(default=None, min_length=1, max_length=80)
    monthly_limit: float | None = Field(default=None, gt=0)
    priority: str | None = Field(default=None, max_length=30)


class BudgetResponse(TimestampedResponse):
    id: int
    category: str
    monthly_limit: float
    priority: str


class SavingsGoalCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0, ge=0)
    target_date: date | None = None


class SavingsGoalResponse(TimestampedResponse):
    id: int
    name: str
    target_amount: float
    current_amount: float
    target_date: date | None


class DebtAccountCreateRequest(BaseModel):
    lender: str = Field(min_length=1, max_length=120)
    debt_type: str = Field(min_length=1, max_length=80)
    outstanding_amount: float = Field(gt=0)
    interest_rate: float = Field(ge=0)
    emi_amount: float = Field(gt=0)
    due_day: int = Field(ge=1, le=31)


class DebtAccountResponse(TimestampedResponse):
    id: int
    lender: str
    debt_type: str
    outstanding_amount: float
    interest_rate: float
    emi_amount: float
    due_day: int


class InvestmentProfileUpsertRequest(BaseModel):
    risk_profile: str = Field(default="balanced", max_length=40)
    monthly_investment_capacity: float = Field(default=0, ge=0)
    emergency_fund_target: float = Field(default=0, ge=0)
    emergency_fund_current: float = Field(default=0, ge=0)
    notes: str | None = None


class InvestmentProfileResponse(TimestampedResponse):
    id: int
    risk_profile: str
    monthly_investment_capacity: float
    emergency_fund_target: float
    emergency_fund_current: float
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
    monthly_limit: float
    spent: float
    remaining: float
    status: str


class CopilotAskResponse(BaseModel):
    answer: str
    data_status: str
