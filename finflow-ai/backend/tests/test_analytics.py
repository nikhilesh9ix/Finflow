"""
Analytics SQL correctness tests.

All assertions run against a real in-memory SQLite DB (see conftest.py).
Tests verify that SQL GROUP BY, conditional aggregates, LEFT JOIN budget
alerts, and HAVING-based recurring detection produce correct results.
"""

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.models import Budget, DebtAccount, Transaction, User
from app.services import analytics


def _tx(
    db: Session,
    user: User,
    *,
    amount: Decimal,
    tx_type: str,
    category: str,
    description: str = "Test",
    merchant: str | None = None,
    d: date = date(2026, 7, 1),
) -> Transaction:
    t = Transaction(
        user_id=user.id,
        transaction_date=d,
        description=description,
        merchant=merchant,
        category=category,
        amount=amount,
        transaction_type=tx_type,
        source="manual",
    )
    db.add(t)
    db.flush()
    return t


def _budget(db: Session, user: User, category: str, limit: Decimal) -> Budget:
    b = Budget(user_id=user.id, category=category, monthly_limit=limit)
    db.add(b)
    db.flush()
    return b


# ── current_month_summary ─────────────────────────────────────────────────────


class TestCurrentMonthSummary:
    def test_empty_user_returns_zeros(self, db: Session, user: User) -> None:
        result = analytics.current_month_summary(db, user.id, "2026-07")
        assert result["income"] == _zero()
        assert result["expense"] == _zero()
        assert result["net"] == _zero()

    def test_income_and_expense_separated(self, db: Session, user: User) -> None:
        _tx(db, user, amount=Decimal("50000"), tx_type="income", category="Salary/Income")
        _tx(db, user, amount=Decimal("-15000"), tx_type="expense", category="Rent")
        result = analytics.current_month_summary(db, user.id, "2026-07")
        assert result["income"] == Decimal("50000")
        assert result["expense"] == Decimal("15000")
        assert result["net"] == Decimal("35000")

    def test_transfers_excluded(self, db: Session, user: User) -> None:
        _tx(db, user, amount=Decimal("5000"), tx_type="transfer", category="Transfer")
        result = analytics.current_month_summary(db, user.id, "2026-07")
        assert result["income"] == _zero()
        assert result["expense"] == _zero()

    def test_other_month_excluded(self, db: Session, user: User) -> None:
        _tx(db, user, amount=Decimal("-2000"), tx_type="expense", category="Food", d=date(2026, 6, 15))
        result = analytics.current_month_summary(db, user.id, "2026-07")
        assert result["expense"] == _zero()

    def test_multiple_expenses_summed(self, db: Session, user: User) -> None:
        _tx(db, user, amount=Decimal("-500"), tx_type="expense", category="Food")
        _tx(db, user, amount=Decimal("-800"), tx_type="expense", category="Food")
        _tx(db, user, amount=Decimal("-300"), tx_type="expense", category="Transport")
        result = analytics.current_month_summary(db, user.id, "2026-07")
        assert result["expense"] == Decimal("1600")


# ── category_breakdown ────────────────────────────────────────────────────────


class TestCategoryBreakdown:
    def test_groups_by_category(self, db: Session, user: User) -> None:
        _tx(db, user, amount=Decimal("-500"), tx_type="expense", category="Food")
        _tx(db, user, amount=Decimal("-300"), tx_type="expense", category="Food")
        _tx(db, user, amount=Decimal("-2000"), tx_type="expense", category="Rent")
        result = analytics.category_breakdown(db, user.id, "2026-07")
        cats = {r["category"]: r["amount"] for r in result}
        assert cats["Food"] == Decimal("800")
        assert cats["Rent"] == Decimal("2000")

    def test_income_excluded_from_breakdown(self, db: Session, user: User) -> None:
        _tx(db, user, amount=Decimal("50000"), tx_type="income", category="Salary/Income")
        result = analytics.category_breakdown(db, user.id, "2026-07")
        assert not any(r["category"] == "Salary/Income" for r in result)

    def test_sorted_descending_by_amount(self, db: Session, user: User) -> None:
        _tx(db, user, amount=Decimal("-100"), tx_type="expense", category="Coffee")
        _tx(db, user, amount=Decimal("-5000"), tx_type="expense", category="Rent")
        _tx(db, user, amount=Decimal("-1000"), tx_type="expense", category="Groceries")
        result = analytics.category_breakdown(db, user.id, "2026-07")
        amounts = [r["amount"] for r in result]
        assert amounts == sorted(amounts, reverse=True)


# ── budget_alerts ─────────────────────────────────────────────────────────────


class TestBudgetAlerts:
    def test_no_spend_shows_zero_and_safe(self, db: Session, user: User) -> None:
        _budget(db, user, "Food", Decimal("5000"))
        alerts = analytics.budget_alerts(db, user.id, "2026-07")
        assert len(alerts) == 1
        assert alerts[0]["spent"] == _zero()
        assert alerts[0]["remaining"] == Decimal("5000")
        assert alerts[0]["status"] == "safe"

    def test_overspent_status(self, db: Session, user: User) -> None:
        _budget(db, user, "Food", Decimal("3000"))
        _tx(db, user, amount=Decimal("-4000"), tx_type="expense", category="Food")
        alerts = analytics.budget_alerts(db, user.id, "2026-07")
        assert alerts[0]["status"] == "overspent"
        assert alerts[0]["remaining"] == Decimal("-1000")

    def test_warning_at_80_percent(self, db: Session, user: User) -> None:
        _budget(db, user, "Rent", Decimal("10000"))
        _tx(db, user, amount=Decimal("-8500"), tx_type="expense", category="Rent")
        alerts = analytics.budget_alerts(db, user.id, "2026-07")
        assert alerts[0]["status"] == "warning"

    def test_usage_percent_calculated(self, db: Session, user: User) -> None:
        _budget(db, user, "Shopping", Decimal("2000"))
        _tx(db, user, amount=Decimal("-1000"), tx_type="expense", category="Shopping")
        alerts = analytics.budget_alerts(db, user.id, "2026-07")
        assert alerts[0]["usage_percent"] == Decimal("50.0")

    def test_spend_from_different_category_not_counted(self, db: Session, user: User) -> None:
        _budget(db, user, "Food", Decimal("3000"))
        _tx(db, user, amount=Decimal("-5000"), tx_type="expense", category="Rent")
        alerts = analytics.budget_alerts(db, user.id, "2026-07")
        assert alerts[0]["spent"] == _zero()

    def test_other_month_spend_not_counted(self, db: Session, user: User) -> None:
        _budget(db, user, "Food", Decimal("3000"))
        _tx(db, user, amount=Decimal("-2000"), tx_type="expense", category="Food", d=date(2026, 6, 1))
        alerts = analytics.budget_alerts(db, user.id, "2026-07")
        assert alerts[0]["spent"] == _zero()


# ── recurring_transactions ────────────────────────────────────────────────────


class TestRecurringTransactions:
    def test_merchant_appearing_twice_detected(self, db: Session, user: User) -> None:
        _tx(db, user, amount=Decimal("-200"), tx_type="expense", category="Streaming",
            merchant="Netflix", d=date(2026, 6, 1))
        _tx(db, user, amount=Decimal("-200"), tx_type="expense", category="Streaming",
            merchant="Netflix", d=date(2026, 7, 1))
        result = analytics.recurring_transactions(db, user.id)
        merchants = [r["merchant"] for r in result]
        assert "Netflix" in merchants

    def test_single_transaction_not_recurring(self, db: Session, user: User) -> None:
        _tx(db, user, amount=Decimal("-500"), tx_type="expense", category="Food",
            merchant="RandomShop")
        result = analytics.recurring_transactions(db, user.id)
        assert not any(r["merchant"] == "RandomShop" for r in result)

    def test_average_amount_computed(self, db: Session, user: User) -> None:
        _tx(db, user, amount=Decimal("-100"), tx_type="expense", category="Gym",
            merchant="Gym Club", d=date(2026, 6, 1))
        _tx(db, user, amount=Decimal("-200"), tx_type="expense", category="Gym",
            merchant="Gym Club", d=date(2026, 7, 1))
        result = analytics.recurring_transactions(db, user.id)
        gym = next(r for r in result if r["merchant"] == "Gym Club")
        assert gym["average_amount"] == Decimal("150.00")


# ── income_vs_expense ─────────────────────────────────────────────────────────


class TestIncomeVsExpense:
    def test_returns_both_sides_per_month(self, db: Session, user: User) -> None:
        _tx(db, user, amount=Decimal("50000"), tx_type="income", category="Salary")
        _tx(db, user, amount=Decimal("-20000"), tx_type="expense", category="Rent")
        result = analytics.income_vs_expense(db, user.id)
        assert len(result) == 1
        assert result[0]["income"] == Decimal("50000")
        assert result[0]["expense"] == Decimal("20000")

    def test_multiple_months_ordered(self, db: Session, user: User) -> None:
        _tx(db, user, amount=Decimal("50000"), tx_type="income", category="Salary", d=date(2026, 5, 1))
        _tx(db, user, amount=Decimal("50000"), tx_type="income", category="Salary", d=date(2026, 6, 1))
        _tx(db, user, amount=Decimal("50000"), tx_type="income", category="Salary", d=date(2026, 7, 1))
        result = analytics.income_vs_expense(db, user.id)
        months = [r["month"] for r in result]
        assert months == sorted(months)


# ── helpers ───────────────────────────────────────────────────────────────────


def _zero() -> Decimal:
    return Decimal("0")
