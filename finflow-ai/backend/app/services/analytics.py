"""
Analytics service — all aggregations run inside the DB, not in Python.

Each public function issues at most one SQL query.  Python only formats
the result dict for the API layer.

SQLite compat note: month grouping uses func.strftime('%Y-%m', ...).
PostgreSQL equivalent: func.to_char(col, 'YYYY-MM').
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import case, func, literal, or_, select
from sqlalchemy.orm import Session

from app.models import Budget, DebtAccount, InvestmentProfile, Transaction, User

_ZERO = Decimal("0")

# ── helpers ───────────────────────────────────────────────────────────────────


def _to_dec(val) -> Decimal:
    """Safe coercion from SQLite float/None aggregation result to Decimal."""
    return Decimal(str(val)) if val is not None else _ZERO


def _month_str(col):
    """SQLite: strftime. PostgreSQL: func.to_char(col, 'YYYY-MM')."""
    return func.strftime("%Y-%m", col)


def _latest_month(db: Session, user_id: int) -> str:
    result = db.scalar(
        select(func.max(Transaction.transaction_date)).where(Transaction.user_id == user_id)
    )
    return result.strftime("%Y-%m") if result else date.today().strftime("%Y-%m")


# ── public analytics functions ────────────────────────────────────────────────


def monthly_spend(db: Session, user_id: int) -> list[dict]:
    """Monthly expense totals — used for spend-trend charts."""
    month_col = _month_str(Transaction.transaction_date)
    rows = db.execute(
        select(
            month_col.label("month"),
            func.sum(func.abs(Transaction.amount)).label("spend"),
        )
        .where(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "expense",
        )
        .group_by(month_col)
        .order_by(month_col)
    ).all()
    return [{"month": row.month, "spend": round(_to_dec(row.spend), 2)} for row in rows]


def current_month_summary(db: Session, user_id: int, month_key: str | None = None) -> dict:
    """Income and expense totals for a single month — one conditional-aggregate query."""
    month_key = month_key or _latest_month(db, user_id)
    row = db.execute(
        select(
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.transaction_type == "income", Transaction.amount),
                        else_=literal(0),
                    )
                ),
                0,
            ).label("income"),
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.transaction_type == "expense", func.abs(Transaction.amount)),
                        else_=literal(0),
                    )
                ),
                0,
            ).label("expense"),
        ).where(
            Transaction.user_id == user_id,
            _month_str(Transaction.transaction_date) == month_key,
            Transaction.transaction_type != "transfer",
        )
    ).one()
    income = _to_dec(row.income)
    expense = _to_dec(row.expense)
    return {
        "month": month_key,
        "income": round(income, 2),
        "expense": round(expense, 2),
        "net": round(income - expense, 2),
    }


def category_breakdown(db: Session, user_id: int, month_key: str | None = None) -> list[dict]:
    """Expense totals by category for a month — GROUP BY category."""
    month_key = month_key or _latest_month(db, user_id)
    rows = db.execute(
        select(
            Transaction.category,
            func.sum(func.abs(Transaction.amount)).label("amount"),
        )
        .where(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "expense",
            _month_str(Transaction.transaction_date) == month_key,
        )
        .group_by(Transaction.category)
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
    ).all()
    return [{"category": row.category, "amount": round(_to_dec(row.amount), 2)} for row in rows]


def income_vs_expense(db: Session, user_id: int) -> list[dict]:
    """Monthly income vs expense breakdown for historical charts."""
    month_col = _month_str(Transaction.transaction_date)
    rows = db.execute(
        select(
            month_col.label("month"),
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.transaction_type == "income", Transaction.amount),
                        else_=literal(0),
                    )
                ),
                0,
            ).label("income"),
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.transaction_type == "expense", func.abs(Transaction.amount)),
                        else_=literal(0),
                    )
                ),
                0,
            ).label("expense"),
        )
        .where(
            Transaction.user_id == user_id,
            Transaction.transaction_type != "transfer",
        )
        .group_by(month_col)
        .order_by(month_col)
    ).all()
    return [
        {
            "month": row.month,
            "income": round(_to_dec(row.income), 2),
            "expense": round(_to_dec(row.expense), 2),
        }
        for row in rows
    ]


def recent_transactions(db: Session, user_id: int, limit: int = 10) -> list[dict]:
    """Latest N transactions — SQL ORDER BY + LIMIT, no Python sort."""
    rows = db.execute(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
        .limit(limit)
    ).scalars().all()
    return [
        {
            "id": t.id,
            "transaction_date": t.transaction_date.isoformat(),
            "description": t.description,
            "merchant": t.merchant,
            "category": t.category,
            "amount": t.amount,
            "transaction_type": t.transaction_type,
            "source": t.source,
        }
        for t in rows
    ]


def top_merchants(db: Session, user_id: int, limit: int = 5, month_key: str | None = None) -> list[dict]:
    """Top merchants by spend for a month — one GROUP BY + LIMIT query."""
    month_key = month_key or _latest_month(db, user_id)
    merchant_col = func.coalesce(Transaction.merchant, Transaction.description)
    rows = db.execute(
        select(
            merchant_col.label("merchant"),
            func.sum(func.abs(Transaction.amount)).label("amount"),
        )
        .where(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "expense",
            _month_str(Transaction.transaction_date) == month_key,
        )
        .group_by(func.lower(merchant_col))
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
        .limit(limit)
    ).all()
    return [{"merchant": row.merchant, "amount": round(_to_dec(row.amount), 2)} for row in rows]


def recurring_transactions(db: Session, user_id: int) -> list[dict]:
    """
    Merchants appearing 2+ times or across 2+ months — detected via SQL HAVING.

    Groups by lower(COALESCE(merchant, description)) + category.
    HAVING: count >= 2 OR distinct_months >= 2.
    """
    month_col = _month_str(Transaction.transaction_date)
    merchant_col = func.coalesce(Transaction.merchant, Transaction.description)
    rows = db.execute(
        select(
            merchant_col.label("merchant"),
            Transaction.category,
            func.count().label("count"),
            func.avg(func.abs(Transaction.amount)).label("avg_amount"),
        )
        .where(Transaction.user_id == user_id)
        .group_by(func.lower(merchant_col), Transaction.category)
        .having(
            or_(
                func.count() >= 2,
                func.count(func.distinct(month_col)) >= 2,
            )
        )
        .order_by(func.avg(func.abs(Transaction.amount)).desc())
    ).all()
    return [
        {
            "merchant": row.merchant,
            "category": row.category,
            "average_amount": round(_to_dec(row.avg_amount), 2),
            "count": row.count,
        }
        for row in rows
    ]


def budget_alerts(db: Session, user_id: int, month_key: str | None = None) -> list[dict]:
    """
    Budget vs actual spend — single LEFT JOIN query.

    Joins budgets → transactions for the month so spent is computed in SQL.
    No Python loops over transactions.
    """
    month_key = month_key or _latest_month(db, user_id)
    rows = db.execute(
        select(
            Budget.id.label("budget_id"),
            Budget.category,
            Budget.monthly_limit,
            func.coalesce(func.sum(func.abs(Transaction.amount)), 0).label("spent"),
        )
        .select_from(Budget)
        .outerjoin(
            Transaction,
            (Transaction.user_id == Budget.user_id)
            & (Transaction.category == Budget.category)
            & (Transaction.transaction_type == "expense")
            & (_month_str(Transaction.transaction_date) == month_key),
        )
        .where(Budget.user_id == user_id)
        .group_by(Budget.id, Budget.category, Budget.monthly_limit)
        .order_by(Budget.category)
    ).all()

    alerts = []
    for row in rows:
        limit = _to_dec(row.monthly_limit)
        spent = _to_dec(row.spent)
        remaining = limit - spent
        usage_ratio = spent / limit if limit > _ZERO else _ZERO
        if remaining < _ZERO:
            status = "overspent"
        elif usage_ratio >= Decimal("0.8"):
            status = "warning"
        else:
            status = "safe"
        alerts.append(
            {
                "budget_id": row.budget_id,
                "category": row.category,
                "monthly_limit": round(limit, 2),
                "spent": round(spent, 2),
                "remaining": round(remaining, 2),
                "usage_percent": round(usage_ratio * 100, 1),
                "status": status,
            }
        )
    return alerts


def dashboard_summary(db: Session, user: User) -> dict:
    """
    Single-call summary for the dashboard widget.

    Runs 4 targeted SQL queries (month, category, budget, recent).
    Previously loaded all transactions into Python memory per call.
    """
    user_id = user.id
    month_key = _latest_month(db, user_id)
    current = current_month_summary(db, user_id, month_key)

    actual_income: Decimal = current["income"]
    monthly_spend_amount: Decimal = current["expense"]
    projected_savings = round(actual_income - monthly_spend_amount, 2)

    effective_income = actual_income if actual_income > _ZERO else user.monthly_income
    savings_rate = (
        round(projected_savings / effective_income * 100, 1) if effective_income > _ZERO else _ZERO
    )

    alerts = budget_alerts(db, user_id, month_key)
    budget_health = [
        {
            "category": a["category"],
            "spent": a["spent"],
            "limit": a["monthly_limit"],
            "status": "over" if a["status"] == "overspent" else a["status"],
        }
        for a in alerts
    ]

    return {
        "monthly_income": user.monthly_income,
        "actual_income": round(actual_income, 2),
        "monthly_spend": round(monthly_spend_amount, 2),
        "projected_savings": projected_savings,
        "savings_rate": savings_rate,
        "category_spend": category_breakdown(db, user_id, month_key),
        "budget_health": budget_health,
        "recent_transactions": recent_transactions(db, user_id, limit=10),
    }


# ── salary / debt / investment ─────────────────────────────────────────────────


def salary_plan(db: Session, user: User) -> dict:
    profile = db.scalar(select(InvestmentProfile).where(InvestmentProfile.user_id == user.id))
    debt_total = db.scalar(
        select(func.coalesce(func.sum(DebtAccount.emi_amount), 0))
        .where(DebtAccount.user_id == user.id)
    )
    debt_accounts_count = db.scalar(
        select(func.count(DebtAccount.id)).where(DebtAccount.user_id == user.id)
    ) or 0

    income: Decimal = user.monthly_income
    debt_payments = _to_dec(debt_total)
    investment_amount = (
        profile.monthly_investment_capacity if profile else max(income * Decimal("0.15"), _ZERO)
    )
    emergency_gap = (
        max(profile.emergency_fund_target - profile.emergency_fund_current, _ZERO)
        if profile
        else income * 3
    )
    emergency_amount = min(max(emergency_gap / 12, _ZERO), income * Decimal("0.15"))
    essentials = min(
        income * Decimal("0.5"),
        max(income - debt_payments - investment_amount - emergency_amount, _ZERO),
    )
    flexible = max(income - essentials - debt_payments - investment_amount - emergency_amount, _ZERO)

    return {
        "income": round(income, 2),
        "allocations": [
            {"bucket": "Essentials", "amount": round(essentials, 2), "note": "Rent, groceries, utilities, transport"},
            {"bucket": "Debt EMIs", "amount": round(debt_payments, 2), "note": f"{debt_accounts_count} active debt account{'s' if debt_accounts_count != 1 else ''}"},
            {"bucket": "Investments", "amount": round(investment_amount, 2), "note": f"Risk profile: {profile.risk_profile if profile else 'balanced'}"},
            {"bucket": "Emergency fund", "amount": round(emergency_amount, 2), "note": "Build liquidity before lifestyle expansion"},
            {"bucket": "Flexible", "amount": round(flexible, 2), "note": "Dining, shopping, and discretionary spend"},
        ],
    }


def debt_strategy(db: Session, user_id: int) -> dict:
    accounts = db.execute(
        select(DebtAccount)
        .where(DebtAccount.user_id == user_id)
        .order_by(DebtAccount.interest_rate.desc())
    ).scalars().all()

    totals = db.execute(
        select(
            func.coalesce(func.sum(DebtAccount.outstanding_amount), 0).label("total_balance"),
            func.coalesce(func.sum(DebtAccount.emi_amount), 0).label("monthly_emi"),
        ).where(DebtAccount.user_id == user_id)
    ).one()

    return {
        "method": "avalanche",
        "total_outstanding": round(_to_dec(totals.total_balance), 2),
        "monthly_emi": round(_to_dec(totals.monthly_emi), 2),
        "priority": [
            {
                "id": a.id,
                "lender": a.lender,
                "debt_type": a.debt_type,
                "outstanding_amount": a.outstanding_amount,
                "interest_rate": a.interest_rate,
                "emi_amount": a.emi_amount,
                "due_day": a.due_day,
            }
            for a in accounts
        ],
        "insight": (
            "Pay minimum EMIs on all accounts, then send extra money to the highest-interest balance first."
            if accounts
            else "No debt accounts found."
        ),
    }


def investment_profile_summary(db: Session, user: User) -> dict:
    profile = db.scalar(select(InvestmentProfile).where(InvestmentProfile.user_id == user.id))
    if not profile:
        return {
            "risk_profile": "balanced",
            "monthly_investment_capacity": _ZERO,
            "emergency_fund_target": user.monthly_income * 3,
            "emergency_fund_current": _ZERO,
            "emergency_gap": user.monthly_income * 3,
            "readiness": "Create an investment profile and emergency fund target before increasing risk.",
        }
    gap = max(profile.emergency_fund_target - profile.emergency_fund_current, _ZERO)
    readiness = (
        "Emergency fund is ready; review SIP allocation."
        if gap == _ZERO
        else "Emergency fund still needs funding before raising risk."
    )
    return {
        "risk_profile": profile.risk_profile,
        "monthly_investment_capacity": profile.monthly_investment_capacity,
        "emergency_fund_target": profile.emergency_fund_target,
        "emergency_fund_current": profile.emergency_fund_current,
        "emergency_gap": round(gap, 2),
        "readiness": readiness,
    }


# ── rule-based fallback (used by ai/copilot.py when ANTHROPIC_API_KEY absent) ─


def copilot_answer(db: Session, user: User, question: str) -> dict:
    normalized = question.lower().strip()
    if not normalized:
        return {"answer": "Ask about spending, budgets, salary allocation, debt, or investments.", "data_status": "missing_question"}

    has_data = db.scalar(
        select(func.count(Transaction.id)).where(Transaction.user_id == user.id)
    ) or 0
    if not has_data:
        return {"answer": "No transactions yet. Upload a CSV so I can analyze spending and budget health.", "data_status": "missing_transactions"}

    if "debt" in normalized or "loan" in normalized or "emi" in normalized:
        strategy = debt_strategy(db, user.id)
        return {"answer": strategy["insight"], "data_status": "ok"}

    if "salary" in normalized or "allocate" in normalized or "income" in normalized:
        plan = salary_plan(db, user)
        flexible = next(a for a in plan["allocations"] if a["bucket"] == "Flexible")
        return {
            "answer": f"After essentials, EMIs, investments, and emergency funding, keep flexible spend near ₹{flexible['amount']:.0f}.",
            "data_status": "ok",
        }

    if "invest" in normalized or "sip" in normalized:
        profile = investment_profile_summary(db, user)
        return {"answer": profile["readiness"], "data_status": "ok"}

    summary = dashboard_summary(db, user)
    over_budget = [a for a in summary["budget_health"] if a["status"] == "over"]
    if over_budget:
        first = over_budget[0]
        overage = abs(_to_dec(str(first["spent"])) - _to_dec(str(first["limit"])))
        return {
            "answer": f"{first['category']} is over budget by ₹{overage:.0f}. Pause non-essential spend there first.",
            "data_status": "ok",
        }

    return {
        "answer": "All categories within budget this month. Keep salary-day automation on and review recurring merchants monthly.",
        "data_status": "ok",
    }
