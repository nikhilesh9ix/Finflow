from collections import Counter, defaultdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Budget, DebtAccount, InvestmentProfile, Transaction, User


def _transactions_for_user(db: Session, user_id: int) -> list[Transaction]:
    return list(db.scalars(select(Transaction).where(Transaction.user_id == user_id)))


def _current_month_key() -> str:
    return date.today().strftime("%Y-%m")


def _latest_month_with_transactions(db: Session, user_id: int) -> str:
    transactions = _transactions_for_user(db, user_id)
    if not transactions:
        return _current_month_key()
    return max(transaction.transaction_date for transaction in transactions).strftime("%Y-%m")


def _is_expense(transaction: Transaction) -> bool:
    if transaction.transaction_type == "transfer":
        return False
    return transaction.transaction_type == "expense" or transaction.amount < 0


def _is_income(transaction: Transaction) -> bool:
    if transaction.transaction_type == "transfer":
        return False
    return transaction.transaction_type == "income" or transaction.amount > 0


def _in_month(transaction: Transaction, month_key: str) -> bool:
    return transaction.transaction_date.strftime("%Y-%m") == month_key


def monthly_spend(db: Session, user_id: int) -> list[dict]:
    totals: dict[str, float] = defaultdict(float)
    for transaction in _transactions_for_user(db, user_id):
        if _is_expense(transaction):
            month = transaction.transaction_date.strftime("%Y-%m")
            totals[month] += abs(transaction.amount)
    return [{"month": month, "spend": round(spend, 2)} for month, spend in sorted(totals.items())]


def current_month_summary(db: Session, user_id: int, month_key: str | None = None) -> dict:
    month_key = month_key or _latest_month_with_transactions(db, user_id)
    income = 0.0
    expense = 0.0
    for transaction in _transactions_for_user(db, user_id):
        if not _in_month(transaction, month_key):
            continue
        if _is_income(transaction):
            income += abs(transaction.amount)
        elif _is_expense(transaction):
            expense += abs(transaction.amount)
    return {
        "month": month_key,
        "income": round(income, 2),
        "expense": round(expense, 2),
        "net": round(income - expense, 2),
    }


def category_breakdown(db: Session, user_id: int, month_key: str | None = None) -> list[dict]:
    month_key = month_key or _latest_month_with_transactions(db, user_id)
    totals: dict[str, float] = defaultdict(float)
    for transaction in _transactions_for_user(db, user_id):
        if not _in_month(transaction, month_key):
            continue
        if _is_expense(transaction):
            totals[transaction.category] += abs(transaction.amount)
    return [{"category": category, "amount": round(amount, 2)} for category, amount in sorted(totals.items(), key=lambda item: item[1], reverse=True)]


def income_vs_expense(db: Session, user_id: int) -> list[dict]:
    totals: dict[str, dict[str, float]] = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    for transaction in _transactions_for_user(db, user_id):
        month = transaction.transaction_date.strftime("%Y-%m")
        if _is_income(transaction):
            totals[month]["income"] += abs(transaction.amount)
        elif _is_expense(transaction):
            totals[month]["expense"] += abs(transaction.amount)
    return [{"month": month, **values} for month, values in sorted(totals.items())]


def recurring_transactions(db: Session, user_id: int) -> list[dict]:
    grouped: dict[tuple[str, str], list[Transaction]] = defaultdict(list)
    for transaction in _transactions_for_user(db, user_id):
        merchant = transaction.merchant or transaction.description
        grouped[(merchant.lower(), transaction.category)].append(transaction)

    recurring = []
    for (_, category), items in grouped.items():
        months = {item.transaction_date.strftime("%Y-%m") for item in items}
        if len(items) >= 2 or len(months) >= 2:
            sample = items[0]
            recurring.append(
                {
                    "merchant": sample.merchant or sample.description,
                    "category": category,
                    "average_amount": round(sum(abs(item.amount) for item in items) / len(items), 2),
                    "count": len(items),
                }
            )
    return sorted(recurring, key=lambda item: item["average_amount"], reverse=True)


def recent_transactions(db: Session, user_id: int, limit: int = 10) -> list[dict]:
    transactions = sorted(
        _transactions_for_user(db, user_id),
        key=lambda item: (item.transaction_date, item.id),
        reverse=True,
    )[:limit]
    return [
        {
            "id": transaction.id,
            "transaction_date": transaction.transaction_date.isoformat(),
            "description": transaction.description,
            "merchant": transaction.merchant,
            "category": transaction.category,
            "amount": transaction.amount,
            "transaction_type": transaction.transaction_type,
            "source": transaction.source,
        }
        for transaction in transactions
    ]


def top_merchants(db: Session, user_id: int, limit: int = 5, month_key: str | None = None) -> list[dict]:
    month_key = month_key or _latest_month_with_transactions(db, user_id)
    totals: Counter[str] = Counter()
    for transaction in _transactions_for_user(db, user_id):
        if not _in_month(transaction, month_key):
            continue
        if _is_expense(transaction):
            totals[transaction.merchant or transaction.description] += abs(transaction.amount)
    return [{"merchant": merchant, "amount": round(amount, 2)} for merchant, amount in totals.most_common(limit)]


def budget_alerts(db: Session, user_id: int) -> list[dict]:
    spend_by_category = {item["category"]: item["amount"] for item in category_breakdown(db, user_id)}
    budgets = list(db.scalars(select(Budget).where(Budget.user_id == user_id).order_by(Budget.category)))
    alerts = []
    for budget in budgets:
        spent = spend_by_category.get(budget.category, 0)
        remaining = budget.monthly_limit - spent
        usage_ratio = spent / budget.monthly_limit if budget.monthly_limit > 0 else 0
        if remaining < 0:
            status = "overspent"
        elif usage_ratio >= 0.8:
            status = "warning"
        else:
            status = "safe"
        alerts.append(
            {
                "budget_id": budget.id,
                "category": budget.category,
                "monthly_limit": budget.monthly_limit,
                "spent": round(spent, 2),
                "remaining": round(remaining, 2),
                "usage_percent": round(usage_ratio * 100, 1),
                "status": status,
            }
        )
    return alerts


def dashboard_summary(db: Session, user_id: int) -> dict:
    month_key = _latest_month_with_transactions(db, user_id)
    return {
        "monthly_spend": monthly_spend(db, user_id),
        "current_month": current_month_summary(db, user_id, month_key),
        "category_breakdown": category_breakdown(db, user_id, month_key),
        "income_vs_expense": income_vs_expense(db, user_id),
        "recurring_transactions": recurring_transactions(db, user_id),
        "top_merchants": top_merchants(db, user_id, limit=5, month_key=month_key),
        "recent_transactions": recent_transactions(db, user_id, limit=10),
        "budget_alerts": budget_alerts(db, user_id),
        "generated_at": date.today().isoformat(),
    }


def salary_plan(db: Session, user: User) -> dict:
    profile = db.scalar(select(InvestmentProfile).where(InvestmentProfile.user_id == user.id))
    debt_accounts = list(db.scalars(select(DebtAccount).where(DebtAccount.user_id == user.id)))
    income = user.monthly_income
    debt_payments = sum(account.emi_amount for account in debt_accounts)
    investment_amount = profile.monthly_investment_capacity if profile else max(income * 0.15, 0)
    emergency_gap = max((profile.emergency_fund_target - profile.emergency_fund_current), 0) if profile else income * 3
    emergency_amount = min(max(emergency_gap / 12, 0), income * 0.15)
    essentials = min(income * 0.5, max(income - debt_payments - investment_amount - emergency_amount, 0))
    flexible = max(income - essentials - debt_payments - investment_amount - emergency_amount, 0)
    return {
        "income": round(income, 2),
        "allocations": [
            {"bucket": "Essentials", "amount": round(essentials, 2), "note": "Rent, groceries, utilities, transport"},
            {"bucket": "Debt EMIs", "amount": round(debt_payments, 2), "note": f"{len(debt_accounts)} active debt account{'s' if len(debt_accounts) != 1 else ''}"},
            {"bucket": "Investments", "amount": round(investment_amount, 2), "note": f"Risk profile: {profile.risk_profile if profile else 'balanced'}"},
            {"bucket": "Emergency fund", "amount": round(emergency_amount, 2), "note": "Build liquidity before lifestyle expansion"},
            {"bucket": "Flexible", "amount": round(flexible, 2), "note": "Dining, shopping, and discretionary spend"},
        ],
    }


def debt_strategy(db: Session, user_id: int) -> dict:
    accounts = list(db.scalars(select(DebtAccount).where(DebtAccount.user_id == user_id)))
    ordered = sorted(accounts, key=lambda item: item.interest_rate, reverse=True)
    total_balance = sum(item.outstanding_amount for item in accounts)
    monthly_emi = sum(item.emi_amount for item in accounts)
    return {
        "method": "avalanche",
        "total_outstanding": round(total_balance, 2),
        "monthly_emi": round(monthly_emi, 2),
        "priority": [
            {
                "id": item.id,
                "lender": item.lender,
                "debt_type": item.debt_type,
                "outstanding_amount": item.outstanding_amount,
                "interest_rate": item.interest_rate,
                "emi_amount": item.emi_amount,
                "due_day": item.due_day,
            }
            for item in ordered
        ],
        "insight": "Pay minimum EMIs on all accounts, then send extra money to the highest-interest balance first." if accounts else "No debt accounts found.",
    }


def investment_profile_summary(db: Session, user: User) -> dict:
    profile = db.scalar(select(InvestmentProfile).where(InvestmentProfile.user_id == user.id))
    if not profile:
        return {
            "risk_profile": "balanced",
            "monthly_investment_capacity": 0,
            "emergency_fund_target": user.monthly_income * 3,
            "emergency_fund_current": 0,
            "emergency_gap": user.monthly_income * 3,
            "readiness": "Create an investment profile and emergency fund target before increasing risk.",
        }
    gap = max(profile.emergency_fund_target - profile.emergency_fund_current, 0)
    readiness = "Emergency fund is ready; review SIP allocation." if gap == 0 else "Emergency fund still needs funding before raising risk."
    return {
        "risk_profile": profile.risk_profile,
        "monthly_investment_capacity": profile.monthly_investment_capacity,
        "emergency_fund_target": profile.emergency_fund_target,
        "emergency_fund_current": profile.emergency_fund_current,
        "emergency_gap": round(gap, 2),
        "readiness": readiness,
    }


def copilot_answer(db: Session, user: User, question: str) -> dict:
    normalized = question.lower().strip()
    summary = dashboard_summary(db, user.id)
    if not normalized:
        return {"answer": "Ask about spending, budgets, salary allocation, debt, or investments.", "data_status": "missing_question"}
    if not summary["recent_transactions"]:
        return {"answer": "I do not see transactions yet. Upload a CSV first so I can analyze spending and budget health.", "data_status": "missing_transactions"}
    if "debt" in normalized or "loan" in normalized or "emi" in normalized:
        strategy = debt_strategy(db, user.id)
        return {"answer": strategy["insight"], "data_status": "ok"}
    if "salary" in normalized or "allocate" in normalized or "income" in normalized:
        plan = salary_plan(db, user)
        flexible = next(item for item in plan["allocations"] if item["bucket"] == "Flexible")
        return {"answer": f"After essentials, EMIs, investments, and emergency funding, keep flexible spend near {flexible['amount']:.0f}.", "data_status": "ok"}
    if "invest" in normalized or "sip" in normalized:
        profile = investment_profile_summary(db, user)
        return {"answer": profile["readiness"], "data_status": "ok"}
    over_budget = [item for item in summary["budget_alerts"] if item["status"] == "overspent"]
    if over_budget:
        first = over_budget[0]
        return {"answer": f"{first['category']} is over budget by {abs(first['remaining']):.0f}. Pause non-essential spend there first.", "data_status": "ok"}
    return {"answer": "Your latest data is within the active budget limits. Keep salary-day automation on and review recurring merchants monthly.", "data_status": "ok"}
