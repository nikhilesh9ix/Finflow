import logging
import re
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pymongo.database import Database

from app.ai.copilot import copilot_answer
from app.api.deps import get_current_user
from app.db import mongo
from app.db.mongo import get_db
from app.models import Budget, ChatHistory, DebtAccount, InvestmentProfile, SavingsGoal, Transaction, User
from app.schemas import (
    BudgetCreateRequest,
    BudgetResponse,
    BudgetUpdateRequest,
    ChatHistoryResponse,
    CopilotAskRequest,
    CopilotAskResponse,
    CsvUploadResponse,
    DebtAccountCreateRequest,
    DebtAccountResponse,
    InvestmentProfileResponse,
    InvestmentProfileUpsertRequest,
    Page,
    SavingsGoalCreateRequest,
    SavingsGoalResponse,
    TransactionCreateRequest,
    TransactionResponse,
)
from app.services.analytics import (
    budget_alerts,
    category_breakdown,
    current_month_summary,
    dashboard_summary,
    debt_strategy,
    emergency_readiness,
    income_vs_expense,
    investment_profile_summary,
    monthly_spend,
    recent_transactions,
    recurring_transactions,
    salary_plan,
    sync_income_from_transactions,
    top_merchants,
)
from app.services.categorization import classify_category
from app.services.csv_import import normalize_transaction_type, parse_transaction_csv

logger = logging.getLogger(__name__)

router = APIRouter(tags=["finance"])

DbDep = Annotated[Database, Depends(get_db)]
UserDep = Annotated[User, Depends(get_current_user)]


# A monthly statement CSV is a few hundred KB at most. The cap stops an oversized
# upload from being read entirely into memory.
MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def _transaction_fingerprint(transaction_date, description: str, merchant: str | None, amount) -> tuple:
    return (transaction_date, description.strip().lower(), (merchant or "").strip().lower(), round(amount, 2))


# ── transactions ──────────────────────────────────────────────────────────────


@router.get("/transactions", response_model=Page[TransactionResponse])
def list_transactions(
    db: DbDep,
    current_user: UserDep,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page:
    query = {"user_id": current_user.id}
    total = db[mongo.TRANSACTIONS].count_documents(query)
    cursor = (
        db[mongo.TRANSACTIONS]
        .find(query)
        .sort([("transaction_date", -1), ("id", -1)])
        .skip(offset)
        .limit(limit)
    )
    items = [Transaction.from_doc(doc) for doc in cursor]
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("/transactions", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreateRequest, db: DbDep, current_user: UserDep) -> Transaction:
    data = payload.model_dump()
    # The request carries a positive amount plus a type; storage uses signed
    # amounts (expenses negative) exactly as CSV import does, so every reader of
    # `amount` sees one convention.
    data["transaction_type"], data["amount"] = normalize_transaction_type(payload.transaction_type, payload.amount)
    data["category"] = classify_category(payload.description, payload.merchant, data["amount"], payload.category)
    doc = mongo.insert(db, mongo.TRANSACTIONS, {"user_id": current_user.id, **data})
    if doc["transaction_type"] == "income":
        sync_income_from_transactions(db, current_user)
    return Transaction.model_validate(doc)


@router.get("/transactions/summary/monthly")
def get_transactions_monthly_summary(db: DbDep, current_user: UserDep) -> dict:
    return {
        "trend": monthly_spend(db, current_user.id),
        "current_month": current_month_summary(db, current_user.id),
        "income_vs_expense": income_vs_expense(db, current_user.id),
    }


@router.get("/transactions/summary/categories")
def get_transactions_category_summary(db: DbDep, current_user: UserDep) -> list[dict]:
    return category_breakdown(db, current_user.id)


@router.get("/transactions/summary/top-merchants")
def get_transactions_top_merchants(db: DbDep, current_user: UserDep) -> list[dict]:
    return top_merchants(db, current_user.id, limit=5)


@router.get("/transactions/recent")
def get_recent_transactions(db: DbDep, current_user: UserDep) -> list[dict]:
    return recent_transactions(db, current_user.id, limit=10)


@router.get("/transactions/recurring")
def get_recurring_transactions(db: DbDep, current_user: UserDep) -> list[dict]:
    return recurring_transactions(db, current_user.id)


@router.post("/transactions/upload", response_model=CsvUploadResponse)
def upload_transactions_csv(db: DbDep, current_user: UserDep, file: UploadFile = File(...)) -> CsvUploadResponse:
    # A plain (sync) route on purpose: PyMongo blocks, and FastAPI runs sync
    # routes in a worker thread. As `async def` it would stall the event loop.
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a CSV file")

    raw = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="CSV is larger than 5 MB. Split the statement into smaller files.",
        )
    try:
        content = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV must be UTF-8 encoded") from exc

    parsed_rows, invalid_rows = parse_transaction_csv(content)

    existing = db[mongo.TRANSACTIONS].find(
        {"user_id": current_user.id},
        {"transaction_date": 1, "description": 1, "merchant": 1, "amount": 1},
    )
    seen = {
        _transaction_fingerprint(doc["transaction_date"].date(), doc["description"], doc.get("merchant"), doc["amount"])
        for doc in existing
    }

    rows_to_import = []
    for row in parsed_rows:
        fingerprint = _transaction_fingerprint(row["transaction_date"], row["description"], row.get("merchant"), row["amount"])
        if fingerprint in seen:
            invalid_rows.append({"row": 0, "error": "duplicate transaction skipped", "raw": {"description": row["description"]}})
            continue
        seen.add(fingerprint)
        rows_to_import.append({"user_id": current_user.id, **row})

    mongo.insert_many(db, mongo.TRANSACTIONS, rows_to_import)
    # Monthly income comes from the statement's salary credits, not from sign-up.
    # The rows are already saved and there is no transaction to roll back, so a
    # failure here is logged rather than turned into an error for a successful
    # import; login recomputes income, so it self-corrects.
    try:
        sync_income_from_transactions(db, current_user)
    except Exception:
        logger.exception("Income sync failed after importing %d rows for user %s", len(rows_to_import), current_user.id)
    return CsvUploadResponse(imported=len(rows_to_import), skipped=len(invalid_rows), errors=invalid_rows[:25])


# ── budgets ───────────────────────────────────────────────────────────────────


@router.get("/budgets", response_model=Page[BudgetResponse])
def list_budgets(
    db: DbDep,
    current_user: UserDep,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page:
    query = {"user_id": current_user.id}
    total = db[mongo.BUDGETS].count_documents(query)
    cursor = db[mongo.BUDGETS].find(query).sort("category", 1).skip(offset).limit(limit)
    return Page(items=[Budget.from_doc(doc) for doc in cursor], total=total, limit=limit, offset=offset)


def _ensure_category_free(db: Database, user: User, category: str, exclude_id: int | None = None) -> None:
    # Two budgets on one category both count the same spending, so the category's
    # limit is effectively doubled and it appears twice on the dashboard.
    name = category.strip()
    query: dict = {"user_id": user.id, "category": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}
    if exclude_id is not None:
        query["id"] = {"$ne": exclude_id}
    if db[mongo.BUDGETS].find_one(query, {"_id": 1}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You already have a {name} budget. Edit or delete it instead.",
        )


@router.post("/budgets", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(payload: BudgetCreateRequest, db: DbDep, current_user: UserDep) -> Budget:
    _ensure_category_free(db, current_user, payload.category)
    doc = mongo.insert(db, mongo.BUDGETS, {"user_id": current_user.id, **payload.model_dump()})
    return Budget.model_validate(doc)


@router.get("/budgets/alerts")
def list_budget_alerts(db: DbDep, current_user: UserDep) -> list[dict]:
    return budget_alerts(db, current_user.id)


@router.put("/budgets/{budget_id}", response_model=BudgetResponse)
def update_budget(budget_id: int, payload: BudgetUpdateRequest, db: DbDep, current_user: UserDep) -> Budget:
    # Matching on user_id as well as id makes another user's budget a plain 404 —
    # the response never reveals that the id exists.
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("category"):
        _ensure_category_free(db, current_user, changes["category"], exclude_id=budget_id)
    doc = mongo.update(db, mongo.BUDGETS, {"id": budget_id, "user_id": current_user.id}, changes)
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    return Budget.model_validate(doc)


@router.delete("/budgets/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(budget_id: int, db: DbDep, current_user: UserDep) -> None:
    result = db[mongo.BUDGETS].delete_one({"id": budget_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")


# ── dashboard & analytics ─────────────────────────────────────────────────────


@router.get("/dashboard/summary")
def get_dashboard_summary(db: DbDep, current_user: UserDep) -> dict:
    return dashboard_summary(db, current_user)


@router.get("/analytics/summary")
def get_analytics_summary(db: DbDep, current_user: UserDep) -> dict:
    return dashboard_summary(db, current_user)


@router.get("/analytics/monthly-spend")
def get_monthly_spend(db: DbDep, current_user: UserDep) -> list[dict]:
    return monthly_spend(db, current_user.id)


@router.get("/analytics/category-breakdown")
def get_category_breakdown(db: DbDep, current_user: UserDep) -> list[dict]:
    return category_breakdown(db, current_user.id)


@router.get("/analytics/income-vs-expense")
def get_income_vs_expense(db: DbDep, current_user: UserDep) -> list[dict]:
    return income_vs_expense(db, current_user.id)


@router.get("/analytics/recurring-transactions")
def get_analytics_recurring(db: DbDep, current_user: UserDep) -> list[dict]:
    return recurring_transactions(db, current_user.id)


@router.get("/analytics/top-merchants")
def get_top_merchants(db: DbDep, current_user: UserDep) -> list[dict]:
    return top_merchants(db, current_user.id)


@router.get("/salary-plan")
def get_salary_plan(db: DbDep, current_user: UserDep) -> dict:
    return salary_plan(db, current_user)


@router.get("/debt-accounts/strategy")
def get_debt_strategy(db: DbDep, current_user: UserDep) -> dict:
    return debt_strategy(db, current_user.id)


@router.get("/investment-profile/summary")
def get_investment_profile_summary(db: DbDep, current_user: UserDep) -> dict:
    return investment_profile_summary(db, current_user)


# ── copilot ───────────────────────────────────────────────────────────────────


@router.get("/copilot/history", response_model=list[ChatHistoryResponse])
def get_copilot_history(db: DbDep, current_user: UserDep) -> list[ChatHistory]:
    # Ordered by id, not created_at: a question and its answer are written in the
    # same instant, and the monotonic id is what preserves their order.
    cursor = db[mongo.CHAT_HISTORY].find({"user_id": current_user.id}).sort("id", 1).limit(50)
    return [ChatHistory.from_doc(doc) for doc in cursor]


@router.post("/copilot/ask")
def ask_copilot(payload: CopilotAskRequest, db: DbDep, current_user: UserDep) -> CopilotAskResponse:
    return copilot_answer(db, current_user, payload.question)


# ── savings goals ─────────────────────────────────────────────────────────────


@router.get("/savings-goals", response_model=list[SavingsGoalResponse])
def list_savings_goals(db: DbDep, current_user: UserDep) -> list[SavingsGoal]:
    cursor = db[mongo.SAVINGS_GOALS].find({"user_id": current_user.id}).sort("id", 1)
    return [SavingsGoal.from_doc(doc) for doc in cursor]


@router.post("/savings-goals", response_model=SavingsGoalResponse, status_code=status.HTTP_201_CREATED)
def create_savings_goal(payload: SavingsGoalCreateRequest, db: DbDep, current_user: UserDep) -> SavingsGoal:
    doc = mongo.insert(db, mongo.SAVINGS_GOALS, {"user_id": current_user.id, **payload.model_dump()})
    return SavingsGoal.model_validate(doc)


# ── debt accounts ─────────────────────────────────────────────────────────────


@router.get("/debt-accounts", response_model=list[DebtAccountResponse])
def list_debt_accounts(db: DbDep, current_user: UserDep) -> list[DebtAccount]:
    cursor = db[mongo.DEBT_ACCOUNTS].find({"user_id": current_user.id}).sort("interest_rate", -1)
    return [DebtAccount.from_doc(doc) for doc in cursor]


@router.post("/debt-accounts", response_model=DebtAccountResponse, status_code=status.HTTP_201_CREATED)
def create_debt_account(payload: DebtAccountCreateRequest, db: DbDep, current_user: UserDep) -> DebtAccount:
    doc = mongo.insert(db, mongo.DEBT_ACCOUNTS, {"user_id": current_user.id, **payload.model_dump()})
    return DebtAccount.model_validate(doc)


@router.delete("/debt-accounts/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_debt_account(debt_id: int, db: DbDep, current_user: UserDep) -> None:
    result = db[mongo.DEBT_ACCOUNTS].delete_one({"id": debt_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debt account not found")


# ── investment profile ────────────────────────────────────────────────────────


_EMPTY_PROFILE = {
    "risk_profile": "balanced",
    "monthly_investment_capacity": Decimal("0"),
    "emergency_fund_target": Decimal("0"),
    "emergency_fund_current": Decimal("0"),
    "notes": None,
}


def _profile_response(doc: dict) -> dict:
    # The Investments page shows the gap and readiness; without them its Readiness
    # panel was blank and a fully funded emergency fund showed a negative gap.
    profile = InvestmentProfile.model_validate(doc)
    gap, readiness = emergency_readiness(profile.emergency_fund_target, profile.emergency_fund_current)
    return {**profile.model_dump(), "emergency_gap": gap, "readiness": readiness}


@router.get("/investment-profile", response_model=InvestmentProfileResponse)
def get_investment_profile(db: DbDep, current_user: UserDep) -> dict:
    stored = db[mongo.INVESTMENT_PROFILES].find_one({"user_id": current_user.id})
    if stored is not None:
        return _profile_response(mongo.from_mongo(stored))
    return _profile_response(
        mongo.insert(db, mongo.INVESTMENT_PROFILES, {"user_id": current_user.id, **_EMPTY_PROFILE})
    )


@router.put("/investment-profile", response_model=InvestmentProfileResponse)
def upsert_investment_profile(payload: InvestmentProfileUpsertRequest, db: DbDep, current_user: UserDep) -> dict:
    # exclude_unset: fields the client did not send (notes — the form has no input
    # for it) keep their stored value instead of being reset to the default.
    changes = payload.model_dump(exclude_unset=True)
    doc = mongo.update(db, mongo.INVESTMENT_PROFILES, {"user_id": current_user.id}, changes)
    if doc is None:
        doc = mongo.insert(db, mongo.INVESTMENT_PROFILES, {"user_id": current_user.id, **_EMPTY_PROFILE, **changes})
    return _profile_response(doc)
