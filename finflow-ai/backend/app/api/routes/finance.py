from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Budget, DebtAccount, InvestmentProfile, SavingsGoal, Transaction, User
from app.schemas import (
    BudgetCreateRequest,
    BudgetUpdateRequest,
    BudgetResponse,
    ChatHistoryResponse,
    CopilotAskRequest,
    CopilotAskResponse,
    CsvUploadResponse,
    DebtAccountCreateRequest,
    DebtAccountResponse,
    InvestmentProfileResponse,
    InvestmentProfileUpsertRequest,
    SavingsGoalCreateRequest,
    SavingsGoalResponse,
    TransactionCreateRequest,
    TransactionResponse,
)
from app.ai.copilot import copilot_answer
from app.schemas import Page
from app.services.analytics import (
    budget_alerts,
    category_breakdown,
    current_month_summary,
    dashboard_summary,
    debt_strategy,
    investment_profile_summary,
    income_vs_expense,
    monthly_spend,
    recent_transactions,
    recurring_transactions,
    salary_plan,
    top_merchants,
)
from app.services.categorization import classify_category
from app.services.csv_import import parse_transaction_csv

router = APIRouter(tags=["finance"])


def _transaction_fingerprint(row: dict) -> tuple:
    return (
        row["transaction_date"],
        row["description"].strip().lower(),
        (row.get("merchant") or "").strip().lower(),
        round(row["amount"], 2),
    )


@router.get("/transactions", response_model=Page[TransactionResponse])
def list_transactions(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page:
    base = select(Transaction).where(Transaction.user_id == current_user.id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    items = list(
        db.scalars(
            base.order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
            .limit(limit)
            .offset(offset)
        )
    )
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("/transactions", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Transaction:
    payload_data = payload.model_dump()
    payload_data["category"] = classify_category(
        payload.description,
        payload.merchant,
        payload.amount,
        payload.category,
    )
    transaction = Transaction(user_id=current_user.id, **payload_data)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("/transactions/summary/monthly")
def get_transactions_monthly_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return {
        "trend": monthly_spend(db, current_user.id),
        "current_month": current_month_summary(db, current_user.id),
        "income_vs_expense": income_vs_expense(db, current_user.id),
    }


@router.get("/transactions/summary/categories")
def get_transactions_category_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    return category_breakdown(db, current_user.id)


@router.get("/transactions/summary/top-merchants")
def get_transactions_top_merchants(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    return top_merchants(db, current_user.id, limit=5)


@router.get("/transactions/recent")
def get_recent_transactions(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    return recent_transactions(db, current_user.id, limit=10)


@router.get("/transactions/recurring")
def get_recurring_transactions(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    return recurring_transactions(db, current_user.id)


@router.post("/transactions/upload", response_model=CsvUploadResponse)
async def upload_transactions_csv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    file: UploadFile = File(...),
) -> CsvUploadResponse:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a CSV file")

    try:
        content = (await file.read()).decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV must be UTF-8 encoded") from exc

    parsed_rows, invalid_rows = parse_transaction_csv(content)
    existing_rows = db.scalars(select(Transaction).where(Transaction.user_id == current_user.id)).all()
    seen = {
        (
            item.transaction_date,
            item.description.strip().lower(),
            (item.merchant or "").strip().lower(),
            round(item.amount, 2),
        )
        for item in existing_rows
    }
    rows_to_import = []
    for row in parsed_rows:
        fingerprint = _transaction_fingerprint(row)
        if fingerprint in seen:
            invalid_rows.append({"row": 0, "error": "duplicate transaction skipped", "raw": {"description": row["description"]}})
            continue
        seen.add(fingerprint)
        rows_to_import.append(row)
        db.add(Transaction(user_id=current_user.id, **row))
    db.commit()
    return CsvUploadResponse(imported=len(rows_to_import), skipped=len(invalid_rows), errors=invalid_rows[:25])


@router.get("/budgets", response_model=Page[BudgetResponse])
def list_budgets(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page:
    base = select(Budget).where(Budget.user_id == current_user.id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    items = list(db.scalars(base.order_by(Budget.category).limit(limit).offset(offset)))
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("/budgets", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    payload: BudgetCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Budget:
    budget = Budget(user_id=current_user.id, **payload.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.get("/budgets/alerts")
def list_budget_alerts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    return budget_alerts(db, current_user.id)


@router.put("/budgets/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    payload: BudgetUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Budget:
    budget = db.scalar(select(Budget).where(Budget.id == budget_id, Budget.user_id == current_user.id))
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(budget, key, value)
    db.commit()
    db.refresh(budget)
    return budget


@router.get("/dashboard/summary")
def get_dashboard_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return dashboard_summary(db, current_user)


@router.get("/analytics/summary")
def get_analytics_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return dashboard_summary(db, current_user)


@router.get("/analytics/monthly-spend")
def get_monthly_spend(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    return monthly_spend(db, current_user.id)


@router.get("/analytics/category-breakdown")
def get_category_breakdown(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    return category_breakdown(db, current_user.id)


@router.get("/analytics/income-vs-expense")
def get_income_vs_expense(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    return income_vs_expense(db, current_user.id)


@router.get("/analytics/recurring-transactions")
def get_recurring_transactions(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    return recurring_transactions(db, current_user.id)


@router.get("/analytics/top-merchants")
def get_top_merchants(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    return top_merchants(db, current_user.id)


@router.get("/salary-plan")
def get_salary_plan(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return salary_plan(db, current_user)


@router.get("/debt-accounts/strategy")
def get_debt_strategy(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return debt_strategy(db, current_user.id)


@router.get("/investment-profile/summary")
def get_investment_profile_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return investment_profile_summary(db, current_user)


@router.get("/copilot/history", response_model=list[ChatHistoryResponse])
def get_copilot_history(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list:
    from app.models import ChatHistory as ChatHistoryModel
    return list(
        db.scalars(
            select(ChatHistoryModel)
            .where(ChatHistoryModel.user_id == current_user.id)
            .order_by(ChatHistoryModel.created_at.asc())
            .limit(50)
        )
    )


@router.post("/copilot/ask")
def ask_copilot(
    payload: CopilotAskRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CopilotAskResponse:
    return copilot_answer(db, current_user, payload.question)


@router.get("/savings-goals", response_model=list[SavingsGoalResponse])
def list_savings_goals(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[SavingsGoal]:
    return list(db.scalars(select(SavingsGoal).where(SavingsGoal.user_id == current_user.id).order_by(SavingsGoal.id)))


@router.post("/savings-goals", response_model=SavingsGoalResponse, status_code=status.HTTP_201_CREATED)
def create_savings_goal(
    payload: SavingsGoalCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> SavingsGoal:
    goal = SavingsGoal(user_id=current_user.id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/debt-accounts", response_model=list[DebtAccountResponse])
def list_debt_accounts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[DebtAccount]:
    return list(db.scalars(select(DebtAccount).where(DebtAccount.user_id == current_user.id).order_by(DebtAccount.interest_rate.desc())))


@router.post("/debt-accounts", response_model=DebtAccountResponse, status_code=status.HTTP_201_CREATED)
def create_debt_account(
    payload: DebtAccountCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DebtAccount:
    debt_account = DebtAccount(user_id=current_user.id, **payload.model_dump())
    db.add(debt_account)
    db.commit()
    db.refresh(debt_account)
    return debt_account


@router.get("/investment-profile", response_model=InvestmentProfileResponse)
def get_investment_profile(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> InvestmentProfile:
    profile = db.scalar(select(InvestmentProfile).where(InvestmentProfile.user_id == current_user.id))
    if profile:
        return profile
    profile = InvestmentProfile(user_id=current_user.id)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.put("/investment-profile", response_model=InvestmentProfileResponse)
def upsert_investment_profile(
    payload: InvestmentProfileUpsertRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> InvestmentProfile:
    profile = db.scalar(select(InvestmentProfile).where(InvestmentProfile.user_id == current_user.id))
    if not profile:
        profile = InvestmentProfile(user_id=current_user.id)
        db.add(profile)
    for key, value in payload.model_dump().items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile
