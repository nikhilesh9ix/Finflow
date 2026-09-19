"""
Investments are savings, not spending.

Reproduces the negative-savings bug: a user who earns ₹85,000, spends ₹70,098
and moves ₹20,000 into a SIP and an emergency fund was shown −₹5,098 savings.
"""

from datetime import date
from decimal import Decimal

from pymongo.database import Database

from app.db import mongo
from app.models import User
from app.services import analytics
from app.services.categorization import INVESTMENT_CATEGORY

MONTH = "2026-06"


def _tx(db: Database, user: User, amount: str, tx_type: str, category: str, description: str) -> None:
    mongo.insert(db, mongo.TRANSACTIONS, {
        "user_id": user.id,
        "transaction_date": date(2026, 6, 10),
        "description": description,
        "merchant": description,
        "category": category,
        "amount": Decimal(amount),
        "transaction_type": tx_type,
        "source": "manual",
    })


def _meera_month(db: Database, user: User) -> None:
    _tx(db, user, "85000", "income", "Salary/Income", "Salary credit")
    _tx(db, user, "-70098", "expense", "Bills", "Living costs")
    _tx(db, user, "-12000", "expense", INVESTMENT_CATEGORY, "SIP - index fund")
    _tx(db, user, "-8000", "expense", INVESTMENT_CATEGORY, "Emergency fund transfer")


def test_month_summary_excludes_investments_from_spend(db: Database, user: User) -> None:
    _meera_month(db, user)
    summary = analytics.current_month_summary(db, user.id, MONTH)
    assert summary["expense"] == 70098.0
    assert summary["invested"] == 20000.0
    assert summary["net"] == 14902.0


def test_dashboard_savings_is_positive_for_saver(db: Database, user: User) -> None:
    _meera_month(db, user)
    dash = analytics.dashboard_summary(db, user)
    assert dash["monthly_spend"] == 70098.0
    assert dash["projected_savings"] == 14902.0
    assert dash["savings_rate"] == 17.5
    assert dash["invested"] == 20000.0


def test_category_breakdown_has_no_investments(db: Database, user: User) -> None:
    _meera_month(db, user)
    categories = {row["category"] for row in analytics.category_breakdown(db, user.id, MONTH)}
    assert INVESTMENT_CATEGORY not in categories


def test_top_merchants_has_no_investments(db: Database, user: User) -> None:
    _meera_month(db, user)
    merchants = {row["merchant"] for row in analytics.top_merchants(db, user.id, month_key=MONTH)}
    assert "SIP - index fund" not in merchants


def test_trend_charts_exclude_investments(db: Database, user: User) -> None:
    _meera_month(db, user)
    assert analytics.monthly_spend(db, user.id) == [{"month": MONTH, "spend": 70098.0}]
    assert analytics.income_vs_expense(db, user.id)[0]["expense"] == 70098.0


def test_genuine_overspend_stays_negative(db: Database, user: User) -> None:
    # The fix must not hide real overspending.
    _tx(db, user, "87000", "income", "Salary/Income", "Client payment")
    _tx(db, user, "-101348", "expense", "Shopping", "New tablet and living costs")
    _tx(db, user, "-20000", "expense", INVESTMENT_CATEGORY, "ELSS investment")
    dash = analytics.dashboard_summary(db, user)
    assert dash["projected_savings"] == -14348.0
