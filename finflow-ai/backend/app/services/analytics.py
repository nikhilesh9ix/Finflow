"""
Analytics service — all aggregation runs inside MongoDB, not in Python.

Each public function issues one aggregation pipeline (or a single find).
Python only formats the result for the API layer. SQL → pipeline equivalents:

    WHERE        → $match   (placed first, so indexes are used)
    GROUP BY     → $group
    HAVING       → $match after $group
    LEFT JOIN    → $lookup  (budgets with no spend still come through)
    SUM(CASE…)   → $sum of $cond

Month filters use a [start, next-month) date range rather than comparing a
formatted string, so the (user_id, transaction_date) index can serve them.
"""

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from pymongo.database import Database

from app.db import mongo
from app.models import DebtAccount, InvestmentProfile, User
from app.services.categorization import INVESTMENT_CATEGORY

_ZERO = Decimal("0")

# ── helpers ───────────────────────────────────────────────────────────────────


def _to_dec(val: Any) -> Decimal:
    """Aggregation results arrive as Decimal (via the codec), int 0, or None."""
    return Decimal(str(val)) if val is not None else _ZERO


def _f(val: Any) -> float:
    """Convert Decimal (or anything numeric) to float for JSON serialization."""
    return float(val)


# Month label for grouping, e.g. "2026-06". Dates are stored at midnight UTC.
_MONTH = {"$dateToString": {"format": "%Y-%m", "date": "$transaction_date", "timezone": "UTC"}}
_ABS_AMOUNT = {"$abs": "$amount"}

# Consumption only. Money moved into SIPs, ELSS, deposits or an emergency fund
# leaves the account but is still the user's — counting it as spend made
# disciplined savers show a negative savings rate. Every spend aggregate uses this.
_SPEND_MATCH = {"transaction_type": "expense", "category": {"$ne": INVESTMENT_CATEGORY}}

# The same two conditions as expressions, for use inside $cond.
_IS_SPEND = {"$and": [{"$eq": ["$transaction_type", "expense"]}, {"$ne": ["$category", INVESTMENT_CATEGORY]}]}
_IS_INVESTMENT = {"$and": [{"$eq": ["$transaction_type", "expense"]}, {"$eq": ["$category", INVESTMENT_CATEGORY]}]}
_IS_INCOME = {"$eq": ["$transaction_type", "income"]}


def _sum_if(condition: dict, value: Any) -> dict:
    return {"$sum": {"$cond": [condition, value, 0]}}


def _in_month(month_key: str) -> dict:
    start, end = mongo.month_bounds(month_key)
    return {"transaction_date": {"$gte": start, "$lt": end}}


def _latest_month(db: Database, user_id: int) -> str:
    latest = db[mongo.TRANSACTIONS].find_one(
        {"user_id": user_id}, {"transaction_date": 1}, sort=[("transaction_date", -1)]
    )
    moment = latest["transaction_date"] if latest else datetime.now(UTC)
    return moment.strftime("%Y-%m")


def _aggregate(db: Database, collection: str, pipeline: list[dict]) -> list[dict]:
    return list(db[collection].aggregate(pipeline))


# ── public analytics functions ────────────────────────────────────────────────


def monthly_spend(db: Database, user_id: int) -> list[dict]:
    """Monthly spend totals — used for spend-trend charts."""
    rows = _aggregate(db, mongo.TRANSACTIONS, [
        {"$match": {"user_id": user_id, **_SPEND_MATCH}},
        {"$group": {"_id": _MONTH, "spend": {"$sum": _ABS_AMOUNT}}},
        {"$sort": {"_id": 1}},
    ])
    return [{"month": row["_id"], "spend": _f(round(_to_dec(row["spend"]), 2))} for row in rows]


def current_month_summary(db: Database, user_id: int, month_key: str | None = None) -> dict:
    """Income, spend and invested totals for one month — a single conditional-sum group."""
    month_key = month_key or _latest_month(db, user_id)
    rows = _aggregate(db, mongo.TRANSACTIONS, [
        {"$match": {"user_id": user_id, "transaction_type": {"$ne": "transfer"}, **_in_month(month_key)}},
        {"$group": {
            "_id": None,
            "income": _sum_if(_IS_INCOME, "$amount"),
            "expense": _sum_if(_IS_SPEND, _ABS_AMOUNT),
            "invested": _sum_if(_IS_INVESTMENT, _ABS_AMOUNT),
        }},
    ])
    totals = rows[0] if rows else {}
    income = _to_dec(totals.get("income"))
    expense = _to_dec(totals.get("expense"))
    return {
        "month": month_key,
        "income": _f(round(income, 2)),
        "expense": _f(round(expense, 2)),
        "invested": _f(round(_to_dec(totals.get("invested")), 2)),
        "net": _f(round(income - expense, 2)),
    }


def category_breakdown(db: Database, user_id: int, month_key: str | None = None) -> list[dict]:
    """Spend by category for a month, largest first."""
    month_key = month_key or _latest_month(db, user_id)
    rows = _aggregate(db, mongo.TRANSACTIONS, [
        {"$match": {"user_id": user_id, **_SPEND_MATCH, **_in_month(month_key)}},
        {"$group": {"_id": "$category", "amount": {"$sum": _ABS_AMOUNT}}},
        {"$sort": {"amount": -1}},
    ])
    return [{"category": row["_id"], "amount": _f(round(_to_dec(row["amount"]), 2))} for row in rows]


def income_vs_expense(db: Database, user_id: int) -> list[dict]:
    """Monthly income vs spend for historical charts."""
    rows = _aggregate(db, mongo.TRANSACTIONS, [
        {"$match": {"user_id": user_id, "transaction_type": {"$ne": "transfer"}}},
        {"$group": {
            "_id": _MONTH,
            "income": _sum_if(_IS_INCOME, "$amount"),
            "expense": _sum_if(_IS_SPEND, _ABS_AMOUNT),
        }},
        {"$sort": {"_id": 1}},
    ])
    return [
        {
            "month": row["_id"],
            "income": _f(round(_to_dec(row["income"]), 2)),
            "expense": _f(round(_to_dec(row["expense"]), 2)),
        }
        for row in rows
    ]


def recent_transactions(db: Database, user_id: int, limit: int = 10) -> list[dict]:
    """Latest N transactions — sorted and limited by the server."""
    cursor = (
        db[mongo.TRANSACTIONS]
        .find({"user_id": user_id})
        .sort([("transaction_date", -1), ("id", -1)])
        .limit(limit)
    )
    rows = [mongo.from_mongo(doc) for doc in cursor]
    return [
        {
            "id": t["id"],
            "transaction_date": t["transaction_date"].isoformat(),
            "description": t["description"],
            "merchant": t.get("merchant"),
            "category": t["category"],
            "amount": _f(t["amount"]),
            "transaction_type": t["transaction_type"],
            "source": t.get("source", "manual"),
        }
        for t in rows
    ]


def top_merchants(db: Database, user_id: int, limit: int = 5, month_key: str | None = None) -> list[dict]:
    """Top merchants by spend for a month. Merchant names are grouped case-insensitively."""
    month_key = month_key or _latest_month(db, user_id)
    merchant = {"$ifNull": ["$merchant", "$description"]}
    rows = _aggregate(db, mongo.TRANSACTIONS, [
        {"$match": {"user_id": user_id, **_SPEND_MATCH, **_in_month(month_key)}},
        {"$group": {"_id": {"$toLower": merchant}, "merchant": {"$first": merchant}, "amount": {"$sum": _ABS_AMOUNT}}},
        {"$sort": {"amount": -1}},
        {"$limit": limit},
    ])
    return [{"merchant": row["merchant"], "amount": _f(round(_to_dec(row["amount"]), 2))} for row in rows]


def recurring_transactions(db: Database, user_id: int) -> list[dict]:
    """
    Outgoing payments appearing 2+ times or across 2+ months — subscriptions,
    EMIs, SIPs, recurring bills.

    Groups by lower(merchant or description) + category, then keeps groups where
    count >= 2 OR distinct months >= 2 — the $match after $group is the HAVING.
    Income is excluded: a monthly salary credit is recurring, but listing it as a
    subscription made the copilot call it a drain on cash flow.
    """
    merchant = {"$ifNull": ["$merchant", "$description"]}
    rows = _aggregate(db, mongo.TRANSACTIONS, [
        {"$match": {"user_id": user_id, "transaction_type": "expense"}},
        {"$group": {
            "_id": {"merchant": {"$toLower": merchant}, "category": "$category"},
            "merchant": {"$first": merchant},
            "count": {"$sum": 1},
            "avg_amount": {"$avg": _ABS_AMOUNT},
            "months": {"$addToSet": _MONTH},
        }},
        {"$match": {"$or": [{"count": {"$gte": 2}}, {"months.1": {"$exists": True}}]}},
        {"$sort": {"avg_amount": -1}},
    ])
    return [
        {
            "merchant": row["merchant"],
            "category": row["_id"]["category"],
            "average_amount": _f(round(_to_dec(row["avg_amount"]), 2)),
            "count": row["count"],
        }
        for row in rows
    ]


def budget_alerts(db: Database, user_id: int, month_key: str | None = None) -> list[dict]:
    """
    Budget vs actual spend — one pipeline with $lookup.

    $lookup is the LEFT JOIN: a budget with no matching transactions still comes
    through with an empty ``spend`` array, and is reported as 0 spent. An inner
    join would silently hide new budgets.
    """
    month_key = month_key or _latest_month(db, user_id)
    start, end = mongo.month_bounds(month_key)
    rows = _aggregate(db, mongo.BUDGETS, [
        {"$match": {"user_id": user_id}},
        {"$lookup": {
            "from": mongo.TRANSACTIONS,
            "let": {"uid": "$user_id", "cat": "$category"},
            "pipeline": [
                {"$match": {"$expr": {"$and": [
                    {"$eq": ["$user_id", "$$uid"]},
                    {"$eq": ["$category", "$$cat"]},
                    {"$eq": ["$transaction_type", "expense"]},
                    {"$gte": ["$transaction_date", start]},
                    {"$lt": ["$transaction_date", end]},
                ]}}},
                {"$group": {"_id": None, "spent": {"$sum": _ABS_AMOUNT}}},
            ],
            "as": "spend",
        }},
        {"$sort": {"category": 1}},
    ])

    alerts = []
    for row in rows:
        limit = _to_dec(row["monthly_limit"])
        spent = _to_dec(row["spend"][0]["spent"]) if row["spend"] else _ZERO
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
                "budget_id": row["id"],
                "category": row["category"],
                "monthly_limit": _f(round(limit, 2)),
                "spent": _f(round(spent, 2)),
                "remaining": _f(round(remaining, 2)),
                "usage_percent": _f(round(usage_ratio * 100, 1)),
                "status": status,
            }
        )
    return alerts


def dashboard_summary(db: Database, user: User) -> dict:
    """Single-call summary for the dashboard widget."""
    user_id = user.id
    month_key = _latest_month(db, user_id)
    current = current_month_summary(db, user_id, month_key)

    actual_income: float = current["income"]
    monthly_spend_amount: float = current["expense"]

    # A month whose salary has not been credited yet (a statement that runs into
    # the next month) falls back to the user's average income. Savings and the
    # rate must use that same figure: subtracting spend from ₹0 but dividing by the
    # average produced a meaningless rate such as −5%.
    income_is_estimated = actual_income <= 0 and user.monthly_income > 0
    effective_income = float(user.monthly_income) if income_is_estimated else actual_income
    projected_savings = round(effective_income - monthly_spend_amount, 2)
    savings_rate = round(projected_savings / effective_income * 100, 1) if effective_income > 0 else 0.0

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
        # The latest month that has transactions — not necessarily today's month,
        # since statements are imported after the fact. The UI labels figures with it.
        "month": month_key,
        "income_is_estimated": income_is_estimated,
        "monthly_income": _f(user.monthly_income),
        "actual_income": round(actual_income, 2),
        "monthly_spend": round(monthly_spend_amount, 2),
        # Reported separately: already part of projected_savings, not spend.
        "invested": current["invested"],
        "projected_savings": projected_savings,
        "savings_rate": savings_rate,
        "category_spend": category_breakdown(db, user_id, month_key),
        "budget_health": budget_health,
        "recent_transactions": recent_transactions(db, user_id, limit=10),
    }


# ── income derivation ─────────────────────────────────────────────────────────

# How many recent months with income feed the average. Long enough to smooth an
# irregular freelancer month, short enough that a raise shows up quickly.
_INCOME_LOOKBACK_MONTHS = 3


def derive_monthly_income(db: Database, user_id: int) -> Decimal:
    """
    Average monthly income across the most recent months that contain income.

    Only months with at least one income transaction count, so a month that is
    still in progress (salary not yet credited) does not drag the average down.
    Returns 0 when no income has been imported.
    """
    rows = _aggregate(db, mongo.TRANSACTIONS, [
        {"$match": {"user_id": user_id, "transaction_type": "income"}},
        {"$group": {"_id": _MONTH, "income": {"$sum": "$amount"}}},
        {"$sort": {"_id": -1}},
        {"$limit": _INCOME_LOOKBACK_MONTHS},
    ])
    if not rows:
        return _ZERO
    total = sum((_to_dec(row["income"]) for row in rows), _ZERO)
    return round(total / len(rows), 2)


def sync_income_from_transactions(db: Database, user: User) -> None:
    """
    Recompute user.monthly_income from imported transactions and persist it.

    Income is never entered by hand — it is whatever the statements show. The
    emergency-fund target used to be seeded from the income typed at sign-up, so
    it is seeded here instead, but only while it is still unset: a target the
    user chose themselves is never overwritten.
    """
    # With no income transactions there is nothing to derive from — keep the stored
    # value rather than overwriting it with 0 (this also runs on every login).
    if not db[mongo.TRANSACTIONS].count_documents({"user_id": user.id, "transaction_type": "income"}, limit=1):
        return
    user.monthly_income = derive_monthly_income(db, user.id)
    mongo.update(db, mongo.USERS, {"id": user.id}, {"monthly_income": user.monthly_income})
    if user.monthly_income > _ZERO:
        mongo.update(
            db,
            mongo.INVESTMENT_PROFILES,
            {"user_id": user.id, "emergency_fund_target": _ZERO},
            {"emergency_fund_target": user.monthly_income * 3},
        )


# ── salary / debt / investment ─────────────────────────────────────────────────


def _profile(db: Database, user_id: int) -> InvestmentProfile | None:
    return InvestmentProfile.from_doc(db[mongo.INVESTMENT_PROFILES].find_one({"user_id": user_id}))


def salary_plan(db: Database, user: User) -> dict:
    profile = _profile(db, user.id)
    debt_rows = _aggregate(db, mongo.DEBT_ACCOUNTS, [
        {"$match": {"user_id": user.id}},
        {"$group": {"_id": None, "emi": {"$sum": "$emi_amount"}, "count": {"$sum": 1}}},
    ])
    debt_totals = debt_rows[0] if debt_rows else {}
    debt_accounts_count = int(debt_totals.get("count", 0))

    income: Decimal = user.monthly_income
    debt_payments = _to_dec(debt_totals.get("emi"))
    desired_investment = (
        profile.monthly_investment_capacity if profile else max(income * Decimal("0.15"), _ZERO)
    )
    emergency_gap = (
        max(profile.emergency_fund_target - profile.emergency_fund_current, _ZERO)
        if profile
        else income * 3
    )

    # Waterfall: each bucket draws only from what is left, in priority order —
    # contractual EMIs, then essentials, emergency fund, investments, flexible.
    # Taking investments before checking what remained let the buckets add up to
    # more than income (₹40,000 income was split into ₹50,000).
    remaining = max(income - debt_payments, _ZERO)
    essentials = min(income * Decimal("0.5"), remaining)
    remaining -= essentials
    emergency_amount = min(max(emergency_gap / 12, _ZERO), income * Decimal("0.15"), remaining)
    remaining -= emergency_amount
    investment_amount = min(desired_investment, remaining)
    remaining -= investment_amount
    flexible = remaining
    # EMIs are owed regardless; if they exceed income, report the gap instead of hiding it.
    shortfall = max(debt_payments - income, _ZERO)

    return {
        "income": _f(round(income, 2)),
        "shortfall": _f(round(shortfall, 2)),
        "allocations": [
            {"bucket": "Essentials", "amount": _f(round(essentials, 2)), "note": "Rent, groceries, utilities, transport"},
            {"bucket": "Debt EMIs", "amount": _f(round(debt_payments, 2)), "note": f"{debt_accounts_count} active debt account{'s' if debt_accounts_count != 1 else ''}"},
            {"bucket": "Investments", "amount": _f(round(investment_amount, 2)), "note": f"Risk profile: {profile.risk_profile if profile else 'balanced'}"},
            {"bucket": "Emergency fund", "amount": _f(round(emergency_amount, 2)), "note": "Build liquidity before lifestyle expansion"},
            {"bucket": "Flexible", "amount": _f(round(flexible, 2)), "note": "Dining, shopping, and discretionary spend"},
        ],
    }


def debt_strategy(db: Database, user_id: int) -> dict:
    """Avalanche order: highest interest rate first."""
    accounts = [
        DebtAccount.from_doc(doc)
        for doc in db[mongo.DEBT_ACCOUNTS].find({"user_id": user_id}).sort("interest_rate", -1)
    ]
    total_balance = sum((a.outstanding_amount for a in accounts), _ZERO)
    monthly_emi = sum((a.emi_amount for a in accounts), _ZERO)

    return {
        "method": "avalanche",
        "total_outstanding": _f(round(total_balance, 2)),
        "monthly_emi": _f(round(monthly_emi, 2)),
        "priority": [
            {
                "id": a.id,
                "lender": a.lender,
                "debt_type": a.debt_type,
                "outstanding_amount": _f(a.outstanding_amount),
                "interest_rate": _f(a.interest_rate),
                "emi_amount": _f(a.emi_amount),
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


def emergency_readiness(target: Decimal, current: Decimal) -> tuple[Decimal, str]:
    """Remaining emergency-fund gap (never negative) and the readiness message."""
    gap = max(target - current, _ZERO)
    if target <= _ZERO:
        return gap, "Set an emergency fund target — typically 3 to 6 months of expenses."
    if gap == _ZERO:
        return gap, "Emergency fund is ready; review SIP allocation."
    return gap, "Emergency fund still needs funding before raising risk."


def investment_profile_summary(db: Database, user: User) -> dict:
    profile = _profile(db, user.id)
    if not profile:
        return {
            "risk_profile": "balanced",
            "monthly_investment_capacity": 0.0,
            "emergency_fund_target": _f(user.monthly_income * 3),
            "emergency_fund_current": 0.0,
            "emergency_gap": _f(user.monthly_income * 3),
            "readiness": "Create an investment profile and emergency fund target before increasing risk.",
        }
    gap, readiness = emergency_readiness(profile.emergency_fund_target, profile.emergency_fund_current)
    return {
        "risk_profile": profile.risk_profile,
        "monthly_investment_capacity": _f(profile.monthly_investment_capacity),
        "emergency_fund_target": _f(profile.emergency_fund_target),
        "emergency_fund_current": _f(profile.emergency_fund_current),
        "emergency_gap": _f(round(gap, 2)),
        "readiness": readiness,
    }


# ── rule-based fallback (used by ai/copilot.py when no AI key is configured) ──


def copilot_answer(db: Database, user: User, question: str) -> dict:
    normalized = question.lower().strip()
    if not normalized:
        return {"answer": "Ask about spending, budgets, salary allocation, debt, or investments.", "data_status": "missing_question"}

    if not db[mongo.TRANSACTIONS].count_documents({"user_id": user.id}, limit=1):
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
