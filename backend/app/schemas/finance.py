from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=8)
    monthly_income: float = Field(ge=0)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    name: str
    email: EmailStr
    monthly_income: float
    risk_profile: str
    currency: str

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    name: str | None = None
    monthly_income: float | None = Field(default=None, ge=0)
    risk_profile: str | None = None
    currency: str | None = None


class TransactionRead(BaseModel):
    id: int
    posted_at: date
    description: str
    merchant: str
    category: str
    amount: float
    transaction_type: str
    source: str

    model_config = {"from_attributes": True}


class TransactionCreate(BaseModel):
    posted_at: date
    description: str
    merchant: str = ""
    category: str | None = None
    amount: float
    transaction_type: str = "expense"


class BudgetRead(BaseModel):
    id: int
    category: str
    monthly_limit: float
    priority: str
    spent: float = 0

    model_config = {"from_attributes": True}


class BudgetUpsert(BaseModel):
    category: str
    monthly_limit: float = Field(gt=0)
    priority: str = "normal"


class DebtRead(BaseModel):
    id: int
    lender: str
    debt_type: str
    outstanding_amount: float
    interest_rate: float
    emi_amount: float
    due_day: int

    model_config = {"from_attributes": True}


class DebtCreate(BaseModel):
    lender: str
    debt_type: str
    outstanding_amount: float = Field(gt=0)
    interest_rate: float = Field(ge=0)
    emi_amount: float = Field(gt=0)
    due_day: int = Field(ge=1, le=31)


class CopilotRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)


class CopilotResponse(BaseModel):
    answer: str
    confidence: str = "deterministic"
    provider: str = "deterministic"
    facts: list["CopilotFactRead"] = Field(default_factory=list)
    starter_prompts: list[str] = Field(default_factory=list)
    history_id: int | None = None


class SalaryPlanRequest(BaseModel):
    monthly_income: float = Field(gt=0)
    monthly_fixed_costs: float = Field(ge=0)
    debt_load: float = Field(ge=0)
    savings_goal_months: int = Field(default=6, ge=1, le=24)
    risk_tolerance: str = Field(default="balanced")
    strategy_mode: str = Field(default="balanced")


class SalaryAllocationRead(BaseModel):
    bucket: str
    percentage: float
    amount: float
    rationale: str


class SalaryPlanResponse(BaseModel):
    income: float
    monthly_fixed_costs: float
    debt_load: float
    debt_to_income_ratio: float
    strategy_mode: str
    warnings: list[str]
    allocations: list[SalaryAllocationRead]
    reasoning: list[str]


class DebtAuditRequest(BaseModel):
    monthly_income: float | None = Field(default=None, gt=0)
    monthly_fixed_costs: float | None = Field(default=None, ge=0)
    extra_payment_capacity: float = Field(default=0, ge=0)


class DebtRecommendationRead(BaseModel):
    rank: int
    lender: str
    debt_type: str
    outstanding_amount: float
    interest_rate: float
    emi_amount: float
    due_day: int
    rationale: str


class DebtLeakRead(BaseModel):
    title: str
    severity: str
    evidence: str
    recommendation: str


class DebtAuditResponse(BaseModel):
    debt_to_income_ratio: float
    monthly_debt_payment: float
    monthly_repayment_budget: float
    avalanche_order: list[DebtRecommendationRead]
    debt_free_months: int
    projected_payoff_date: date
    warnings: list[str]
    wealth_leaks: list[DebtLeakRead]
    projection: list[dict[str, float | int]]


class InvestmentProfileRequest(BaseModel):
    age: int = Field(ge=18, le=80)
    monthly_income: float = Field(gt=0)
    risk_tolerance: str = Field(default="balanced")
    goal_horizon_years: int = Field(ge=1, le=40)
    emergency_fund_status: str = Field(default="building")
    emergency_fund_months: int = Field(default=3, ge=0, le=24)


class InvestmentBucketRead(BaseModel):
    category: str
    percentage: float
    amount: float
    rationale: str


class InvestmentRecommendationResponse(BaseModel):
    profile_mode: str
    risk_tolerance: str
    disclaimer: str
    buckets: list[InvestmentBucketRead]
    reasoning: list[str]
    projection_notes: list[str]


class CopilotFactRead(BaseModel):
    label: str
    value: str
    detail: str


class CopilotChatRead(BaseModel):
    question: str
    answer: str
    created_at: datetime


class CopilotHistoryResponse(BaseModel):
    items: list[CopilotChatRead]
