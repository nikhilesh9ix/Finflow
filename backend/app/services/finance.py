from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import date, timedelta
import json
import math
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.finance import Budget, Debt, InvestmentProfile, Transaction, User


MONTHLY_BUCKETS = [
    "Fixed bills",
    "EMIs / debt repayment",
    "Emergency savings",
    "Investments",
    "Discretionary spending",
]


def current_month_bounds() -> tuple[date, date]:
    today = date.today()
    start = today.replace(day=1)
    if today.month == 12:
        end = today.replace(year=today.year + 1, month=1, day=1)
    else:
        end = today.replace(month=today.month + 1, day=1)
    return start, end


def monthly_transactions(db: Session, user_id: int) -> list[Transaction]:
    start, end = current_month_bounds()
    return list(
        db.scalars(
            select(Transaction)
            .where(Transaction.user_id == user_id, Transaction.posted_at >= start, Transaction.posted_at < end)
            .order_by(Transaction.posted_at.desc())
        )
    )


def current_debts(db: Session, user_id: int) -> list[Debt]:
    return list(db.scalars(select(Debt).where(Debt.user_id == user_id)))


def current_budgets(db: Session, user_id: int) -> list[Budget]:
    return list(db.scalars(select(Budget).where(Budget.user_id == user_id)))


def normalize_choice(value: str | None, fallback: str) -> str:
    normalized = (value or fallback).strip().lower()
    aliases = {
        "safe": "safe",
        "conservative": "safe",
        "balanced": "balanced",
        "middle": "balanced",
        "growth": "growth",
        "aggressive": "growth",
    }
    return aliases.get(normalized, fallback)


def risk_score(value: str | None) -> int:
    normalized = normalize_choice(value, "balanced")
    return {"safe": 0, "balanced": 1, "growth": 2}[normalized]


def estimate_fixed_costs(db: Session, user_id: int) -> float:
    budgets = current_budgets(db, user_id)
    if budgets:
        return round(sum(budget.monthly_limit for budget in budgets if budget.priority in {"essential", "watch", "normal"}), 2)

    transactions = monthly_transactions(db, user_id)
    categories = {"housing", "groceries", "transport", "utilities", "subscriptions"}
    total = sum(abs(tx.amount) for tx in transactions if tx.category.lower() in categories and tx.amount < 0)
    return round(total, 2)


def category_spend_map(transactions: list[Transaction]) -> dict[str, float]:
    totals: dict[str, float] = defaultdict(float)
    for transaction in transactions:
        if transaction.amount < 0 or transaction.transaction_type == "expense":
            totals[transaction.category] += abs(transaction.amount)
    return totals


def dashboard_summary(db: Session, user: User) -> dict:
    transactions = monthly_transactions(db, user.id)
    expenses = [abs(t.amount) for t in transactions if t.transaction_type == "expense" or t.amount < 0]
    income = sum(t.amount for t in transactions if t.transaction_type == "income" or t.amount > 0)
    spend = sum(expenses)
    savings_rate = round(max(user.monthly_income - spend, 0) / user.monthly_income * 100, 1) if user.monthly_income else 0

    category_spend = category_spend_map(transactions)

    budgets = current_budgets(db, user.id)
    leaks = [
        {
            "category": budget.category,
            "spent": round(category_spend.get(budget.category, 0), 2),
            "limit": budget.monthly_limit,
            "status": "over" if category_spend.get(budget.category, 0) > budget.monthly_limit else "ok",
        }
        for budget in budgets
    ]

    return {
        "monthly_income": user.monthly_income,
        "actual_income": round(income, 2),
        "monthly_spend": round(spend, 2),
        "projected_savings": round(max(user.monthly_income - spend, 0), 2),
        "savings_rate": savings_rate,
        "category_spend": [{"category": key, "amount": round(value, 2)} for key, value in category_spend.items()],
        "budget_health": leaks,
        "recent_transactions": [
            {
                "id": transaction.id,
                "posted_at": transaction.posted_at,
                "description": transaction.description,
                "merchant": transaction.merchant,
                "category": transaction.category,
                "amount": transaction.amount,
                "transaction_type": transaction.transaction_type,
                "source": transaction.source,
            }
            for transaction in transactions[:8]
        ],
    }


def _plan_debt_buckets(income: float, fixed_costs: float, debt_load: float, savings_goal_months: int, risk_tolerance: str, strategy_mode: str) -> tuple[list[dict], list[str]]:
    strategy = normalize_choice(strategy_mode, normalize_choice(risk_tolerance, "balanced"))
    debt_ratio = debt_load / income if income else 0
    fixed_ratio = fixed_costs / income if income else 0

    if strategy == "safe":
        investments = 8
        emergency = 18
        debt = 20
    elif strategy == "growth":
        investments = 22
        emergency = 10
        debt = 15
    else:
        investments = 14
        emergency = 14
        debt = 16

    if debt_ratio >= 0.35:
        debt = max(debt, 30)
        emergency = max(emergency, 16)
        investments = min(investments, 10)
    elif debt_ratio >= 0.2:
        debt = max(debt, 24)

    if fixed_ratio >= 0.55:
        emergency = max(emergency, 16)
        investments = min(investments, 12)

    if savings_goal_months <= 3:
        emergency = max(emergency, 18)
        investments = max(investments - 2, 6)
    elif savings_goal_months >= 9:
        investments = min(investments + 4, 28)

    fixed = min(max(round(fixed_ratio * 100), 0), 70)
    remaining = max(100 - fixed - debt - emergency - investments, 0)

    if remaining < 8:
        emergency = max(emergency - 2, 8)
        investments = max(investments - 2, 6)
        remaining = max(100 - fixed - debt - emergency - investments, 0)

    if fixed_costs > income and income > 0:
        fixed = min(70, max(fixed, 60))
        remaining = max(100 - fixed - debt - emergency - investments, 0)

    allocations = [
        {"bucket": "Fixed bills", "percentage": fixed, "rationale": "Protect rent, groceries, transport, utilities, and subscriptions first."},
        {"bucket": "EMIs / debt repayment", "percentage": debt, "rationale": "Keep minimum debt payments current and add extra to the most expensive debt when possible."},
        {"bucket": "Emergency savings", "percentage": emergency, "rationale": "Build a cash buffer so you do not need to borrow for surprises."},
        {"bucket": "Investments", "percentage": investments, "rationale": "Use the remaining risk budget for systematic investing based on your tolerance."},
        {"bucket": "Discretionary spending", "percentage": remaining, "rationale": "Keep lifestyle spending inside the leftover amount so the plan stays balanced."},
    ]
    warnings = []
    if debt_ratio >= 0.4:
        warnings.append("Debt-to-income is high; reduce new borrowing and prioritize repayment before growth investing.")
    elif debt_ratio >= 0.3:
        warnings.append("Debt load is elevated; keep new EMIs under control until the ratio improves.")
    if fixed_ratio >= 0.6:
        warnings.append("Fixed expenses are consuming most of income; trim non-essential bills before increasing investing.")
    return allocations, warnings


def salary_plan(db: Session, user: User, payload: Any | None = None) -> dict:
    data = payload.model_dump() if payload is not None and hasattr(payload, "model_dump") else {}
    income = float(data.get("monthly_income") or user.monthly_income or 0)
    fixed_costs = float(data.get("monthly_fixed_costs") or estimate_fixed_costs(db, user.id))
    debt_load = float(data.get("debt_load") or sum(debt.emi_amount for debt in current_debts(db, user.id)))
    strategy_mode = normalize_choice(data.get("strategy_mode") or user.risk_profile, "balanced")
    allocations, warnings = _plan_debt_buckets(
        income=income,
        fixed_costs=fixed_costs,
        debt_load=debt_load,
        savings_goal_months=int(data.get("savings_goal_months") or 6),
        risk_tolerance=str(data.get("risk_tolerance") or user.risk_profile or "balanced"),
        strategy_mode=strategy_mode,
    )
    debt_ratio = round((debt_load / income) * 100, 1) if income else 0
    reasoning = [
        f"Fixed costs are anchored to INR {fixed_costs:,.0f} so the plan does not over-allocate to flexible buckets.",
        f"Debt load is INR {debt_load:,.0f}, which is {debt_ratio:.1f}% of monthly income.",
        f"Strategy mode {strategy_mode} shifts weight toward {('emergency savings' if strategy_mode == 'safe' else 'investments' if strategy_mode == 'growth' else 'balance')} while keeping bills covered.",
    ]
    return {
        "income": income,
        "monthly_fixed_costs": fixed_costs,
        "debt_load": debt_load,
        "debt_to_income_ratio": debt_ratio,
        "strategy_mode": strategy_mode,
        "warnings": warnings,
        "allocations": [
            {
                "bucket": allocation["bucket"],
                "percentage": allocation["percentage"],
                "amount": round(income * allocation["percentage"] / 100, 2),
                "rationale": allocation["rationale"],
            }
            for allocation in allocations
        ],
        "reasoning": reasoning,
    }


def _subscription_leaks(transactions: list[Transaction]) -> list[dict]:
    recurring_keywords = ("netflix", "spotify", "prime", "subscription", "membership", "gym", "hotstar", "youtube premium")
    matches = [transaction for transaction in transactions if any(keyword in (transaction.description + " " + transaction.merchant).lower() for keyword in recurring_keywords)]
    grouped: dict[str, list[Transaction]] = defaultdict(list)
    for transaction in matches:
        grouped[transaction.merchant or transaction.description].append(transaction)
    leaks = []
    for merchant, items in grouped.items():
        monthly_value = round(sum(abs(item.amount) for item in items), 2)
        if monthly_value > 0:
            leaks.append(
                {
                    "title": f"Recurring subscription: {merchant}",
                    "severity": "medium" if monthly_value < 2000 else "high",
                    "evidence": f"Detected {len(items)} signal(s) totalling INR {monthly_value:,.0f} this month.",
                    "recommendation": "Keep only subscriptions you actively use; cancel the rest or move them to a yearly review list.",
                }
            )
    return leaks


def _overspend_leaks(db: Session, user_id: int, transactions: list[Transaction]) -> list[dict]:
    category_spend = category_spend_map(transactions)
    leaks = []
    for budget in current_budgets(db, user_id):
        spent = category_spend.get(budget.category, 0)
        if spent > budget.monthly_limit:
            leaks.append(
                {
                    "title": f"Overspending in {budget.category}",
                    "severity": "high" if spent > budget.monthly_limit * 1.25 else "medium",
                    "evidence": f"Spent INR {spent:,.0f} against INR {budget.monthly_limit:,.0f} limit.",
                    "recommendation": "Lower the next discretionary purchase in this category and move the saved amount to debt or emergency savings.",
                }
            )
    return leaks


def _idle_cash_leak(user: User, monthly_fixed_costs: float, debts: list[Debt], transactions: list[Transaction]) -> dict | None:
    spending = sum(abs(transaction.amount) for transaction in transactions if transaction.amount < 0)
    minimum_debt = sum(debt.emi_amount for debt in debts)
    idle_cash = max(user.monthly_income - spending - minimum_debt - monthly_fixed_costs, 0)
    if idle_cash <= max(user.monthly_income * 0.1, 5000):
        return None
    return {
        "title": "Idle cash sitting in checking",
        "severity": "medium",
        "evidence": f"About INR {idle_cash:,.0f} is left after fixed costs and minimum debt payments.",
        "recommendation": "Sweep excess cash into an emergency fund or short-term liquid fund instead of leaving it unused.",
    }


def _revolving_debt_leak(debts: list[Debt]) -> dict | None:
    revolving = [debt for debt in debts if debt.interest_rate >= 24 or debt.debt_type.lower() in {"credit card", "bnpl", "emi"}]
    if not revolving:
        return None
    highest = max(revolving, key=lambda debt: debt.interest_rate)
    return {
        "title": "High-interest revolving debt",
        "severity": "high" if highest.interest_rate >= 30 else "medium",
        "evidence": f"{highest.lender} is charging {highest.interest_rate:.1f}% APR on {highest.debt_type}.",
        "recommendation": "Pay the minimum everywhere and direct any extra repayment to the highest-rate balance first.",
    }


def _estimate_payoff(debts: list[Debt], monthly_repayment_budget: float) -> tuple[int, list[dict[str, float | int]]]:
    if not debts:
        return 0, []
    monthly_budget = max(monthly_repayment_budget, sum(debt.emi_amount for debt in debts))
    balances = [
        {
            "id": debt.id,
            "lender": debt.lender,
            "debt_type": debt.debt_type,
            "balance": float(debt.outstanding_amount),
            "interest_rate": float(debt.interest_rate),
            "minimum": float(debt.emi_amount),
        }
        for debt in debts
    ]
    month = 0
    projection: list[dict[str, float | int]] = []
    while any(item["balance"] > 0.01 for item in balances) and month < 600:
        month += 1
        balances.sort(key=lambda item: (item["interest_rate"], item["balance"]), reverse=True)
        available_extra = max(monthly_budget - sum(item["minimum"] for item in balances), 0)
        for item in balances:
            monthly_rate = item["interest_rate"] / 12 / 100
            item["balance"] = round(item["balance"] * (1 + monthly_rate), 2)
            payment = min(item["minimum"], item["balance"])
            item["balance"] = round(max(item["balance"] - payment, 0), 2)
        for item in balances:
            if available_extra <= 0 or item["balance"] <= 0:
                continue
            extra = min(available_extra, item["balance"])
            item["balance"] = round(item["balance"] - extra, 2)
            available_extra -= extra
            break
        projection.append({"month": month, "remaining_debt": round(sum(item["balance"] for item in balances), 2)})
    return month, projection


def debt_audit(db: Session, user: User, payload: Any | None = None) -> dict:
    data = payload.model_dump() if payload is not None and hasattr(payload, "model_dump") else {}
    debts = current_debts(db, user.id)
    transactions = monthly_transactions(db, user.id)
    monthly_income = float(data.get("monthly_income") or user.monthly_income or 0)
    monthly_fixed_costs = float(data.get("monthly_fixed_costs") or estimate_fixed_costs(db, user.id))
    debt_payments = sum(debt.emi_amount for debt in debts)
    monthly_repayment_budget = debt_payments + float(data.get("extra_payment_capacity") or 0)
    debt_to_income_ratio = round((debt_payments / monthly_income) * 100, 1) if monthly_income else 0
    ordered = sorted(debts, key=lambda debt: (debt.interest_rate, debt.outstanding_amount), reverse=True)
    months, projection = _estimate_payoff(debts, monthly_repayment_budget)
    pay_off_date = date.today() + timedelta(days=30 * months) if months else date.today()
    wealth_leaks = [
        *_subscription_leaks(transactions),
        *_overspend_leaks(db, user.id, transactions),
    ]
    idle_cash = _idle_cash_leak(user, monthly_fixed_costs, debts, transactions)
    if idle_cash:
        wealth_leaks.append(idle_cash)
    revolving = _revolving_debt_leak(debts)
    if revolving:
        wealth_leaks.append(revolving)
    ranked_leaks = sorted(
        wealth_leaks,
        key=lambda item: {"high": 3, "medium": 2, "low": 1}.get(str(item.get("severity", "medium")), 2),
        reverse=True,
    )
    warnings = []
    if debt_to_income_ratio >= 40:
        warnings.append("Debt-to-income ratio is risky; avoid taking any new EMI until the ratio improves.")
    elif debt_to_income_ratio >= 30:
        warnings.append("Debt-to-income ratio is getting tight; keep extra cash away from discretionary spending.")
    if not debts:
        warnings.append("No debt accounts are stored yet, so the payoff timeline is empty until you add one.")
    return {
        "debt_to_income_ratio": debt_to_income_ratio,
        "monthly_debt_payment": round(debt_payments, 2),
        "monthly_repayment_budget": round(monthly_repayment_budget, 2),
        "avalanche_order": [
            {
                "rank": index + 1,
                "lender": debt.lender,
                "debt_type": debt.debt_type,
                "outstanding_amount": debt.outstanding_amount,
                "interest_rate": debt.interest_rate,
                "emi_amount": debt.emi_amount,
                "due_day": debt.due_day,
                "rationale": "Highest interest rate gets the next extra rupee after minimum payments are made.",
            }
            for index, debt in enumerate(ordered)
        ],
        "debt_free_months": months,
        "projected_payoff_date": pay_off_date,
        "warnings": warnings,
        "wealth_leaks": ranked_leaks,
        "projection": projection[:24],
    }


def build_investment_allocation(age: int, monthly_income: float, risk_tolerance: str, goal_horizon_years: int, emergency_fund_status: str, emergency_fund_months: int) -> tuple[str, list[dict], list[str], list[str], str]:
    risk = normalize_choice(risk_tolerance, "balanced")
    horizon = goal_horizon_years
    emergency_ready = emergency_fund_status.strip().lower() in {"ready", "complete", "yes", "funded"} or emergency_fund_months >= 6
    if not emergency_ready:
        mode = "conservative"
        buckets = [
            ("Emergency fund", 40, "Build a cash buffer before taking more market risk."),
            ("Liquid fund", 20, "Keep near-term money easy to access."),
            ("Fixed deposit", 20, "Use a stable parking place for short-term goals."),
            ("Gold ETF", 5, "Add a small diversifier without stretching risk."),
            ("Index fund SIP", 15, "Start only a small automatic equity exposure for now."),
        ]
        reasoning = ["Emergency savings are not complete, so the plan prioritizes liquidity over return chasing."]
    elif risk == "safe" or horizon <= 3:
        mode = "conservative"
        buckets = [
            ("Emergency fund", 25, "Keep a strong liquidity buffer for short goals."),
            ("Fixed deposit", 25, "Use a predictable return for near-term objectives."),
            ("Liquid fund", 20, "Keep money accessible without leaving it idle."),
            ("Gold ETF", 10, "Use a modest diversifier with lower equity sensitivity."),
            ("Index fund SIP", 20, "Maintain some growth exposure, but keep it contained."),
        ]
        reasoning = ["Shorter goals and lower risk tolerance justify a larger share in low-volatility buckets."]
    elif risk == "growth" and horizon >= 7 and age < 50:
        mode = "growth"
        buckets = [
            ("Emergency fund", 10, "Keep a safety net, but not more than needed."),
            ("Fixed deposit", 10, "Reserve a small stable sleeve for short-term obligations."),
            ("Liquid fund", 10, "Preserve quick-access money for surprises."),
            ("Gold ETF", 5, "Hold a small hedge against equity volatility."),
            ("Index fund SIP", 65, "Let long-horizon goals do the heavy lifting in diversified equities."),
        ]
        reasoning = ["Long horizon and higher risk tolerance allow a growth tilt, but the plan still keeps a cash cushion."]
    else:
        mode = "balanced"
        buckets = [
            ("Emergency fund", 15, "Keep liquidity intact while the reserve grows."),
            ("Fixed deposit", 15, "Use stable returns for near-term goals."),
            ("Liquid fund", 15, "Keep some money ready for unplanned expenses."),
            ("Gold ETF", 10, "Add a defensive diversifier."),
            ("Index fund SIP", 45, "Use broad market exposure for long-term growth."),
        ]
        reasoning = ["The profile sits between safety and growth, so the plan spreads money across liquidity and growth buckets."]
    if age >= 55:
        buckets = [
            (name, max(share - (5 if name == "Index fund SIP" else 0), 5), rationale)
            for name, share, rationale in buckets
        ]
        buckets[0] = (buckets[0][0], buckets[0][1] + 5, buckets[0][2])
        reasoning.append("Age is closer to retirement, so the plan shifts a little more toward capital preservation.")
    allocations = []
    for name, share, rationale in buckets:
        allocations.append({"category": name, "percentage": share, "amount": round(monthly_income * share / 100, 2), "rationale": rationale})
    projection_notes = [
        f"Monthly investable amount is anchored to INR {monthly_income:,.0f} income and scaled by the chosen profile.",
        "All percentages are deterministic so the output can be compared across test inputs.",
    ]
    disclaimer = "This is educational allocation guidance, not personalized investment advice. Review major decisions with a licensed advisor."
    return mode, allocations, reasoning, projection_notes, disclaimer


def investment_recommendation(db: Session, user: User, payload: Any) -> dict:
    data = payload.model_dump()
    mode, allocations, reasoning, projection_notes, disclaimer = build_investment_allocation(
        age=int(data["age"]),
        monthly_income=float(data["monthly_income"]),
        risk_tolerance=str(data["risk_tolerance"]),
        goal_horizon_years=int(data["goal_horizon_years"]),
        emergency_fund_status=str(data["emergency_fund_status"]),
        emergency_fund_months=int(data["emergency_fund_months"]),
    )
    profile = db.scalar(select(InvestmentProfile).where(InvestmentProfile.user_id == user.id))
    if profile is None:
        profile = InvestmentProfile(
            user_id=user.id,
            emergency_fund_target=float(data["monthly_income"]) * 6,
            current_emergency_fund=float(data["monthly_income"]) * min(int(data["emergency_fund_months"]), 6) / 6,
            monthly_sip=next((item["amount"] for item in allocations if item["category"] == "Index fund SIP"), 0),
        )
        db.add(profile)
    profile.age = int(data["age"])
    profile.goal_horizon_years = int(data["goal_horizon_years"])
    profile.risk_tolerance = normalize_choice(str(data["risk_tolerance"]), "balanced")
    profile.emergency_fund_status = str(data["emergency_fund_status"])
    profile.monthly_sip = next((item["amount"] for item in allocations if item["category"] == "Index fund SIP"), profile.monthly_sip)
    profile.recommendation_json = json.dumps(
        {
            "mode": mode,
            "allocations": allocations,
            "reasoning": reasoning,
            "projection_notes": projection_notes,
            "disclaimer": disclaimer,
        },
        ensure_ascii=True,
    )
    db.commit()
    return {
        "profile_mode": mode,
        "risk_tolerance": profile.risk_tolerance or normalize_choice(user.risk_profile, "balanced"),
        "disclaimer": disclaimer,
        "buckets": allocations,
        "reasoning": reasoning,
        "projection_notes": projection_notes,
    }


def investment_suggestions(db: Session, user: User) -> dict:
    profile = db.scalar(select(InvestmentProfile).where(InvestmentProfile.user_id == user.id))
    if profile and profile.recommendation_json:
        try:
            saved = json.loads(profile.recommendation_json)
            return {
                "risk_profile": profile.risk_tolerance or user.risk_profile,
                "suggestions": saved.get("reasoning", []),
                "monthly_capacity": profile.monthly_sip,
                "emergency_gap": round(max(profile.emergency_fund_target - profile.current_emergency_fund, 0), 2),
            }
        except json.JSONDecodeError:
            pass
    summary = dashboard_summary(db, user)
    emergency_gap = 0
    if profile:
        emergency_gap = max(profile.emergency_fund_target - profile.current_emergency_fund, 0)
    return {
        "risk_profile": user.risk_profile,
        "suggestions": [
            "Keep 3-6 months of expenses in a liquid emergency fund before increasing risk.",
            "Automate investments on salary day to prevent leftover-based saving.",
            "Use broad diversified index or hybrid funds for MVP planning; review with a licensed advisor before investing.",
        ],
        "monthly_capacity": summary["projected_savings"],
        "emergency_gap": round(emergency_gap, 2),
    }


def debt_strategy(db: Session, user: User) -> dict:
    audit = debt_audit(db, user)
    return {
        "method": "Avalanche",
        "total_outstanding": round(sum(debt.outstanding_amount for debt in current_debts(db, user.id)), 2),
        "monthly_emi": round(audit["monthly_debt_payment"], 2),
        "priority": audit["avalanche_order"],
        "insight": "Pay minimum EMIs on all debts, then send extra cash to the highest-interest balance first.",
        "debt_to_income_ratio": audit["debt_to_income_ratio"],
        "warnings": audit["warnings"],
        "wealth_leaks": audit["wealth_leaks"],
        "projection": audit["projection"],
        "debt_free_months": audit["debt_free_months"],
    }
