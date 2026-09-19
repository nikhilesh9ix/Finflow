"""
Monthly income derivation tests.

Income is not typed in at sign-up — it is computed from imported income
transactions. These tests cover the averaging rule and the CSV upload path.
"""

from datetime import date
from decimal import Decimal

from fastapi.testclient import TestClient
from pymongo.database import Database

from app.db import mongo
from app.models import InvestmentProfile, User
from app.services import analytics


def _tx(db: Database, user: User, *, amount: str, tx_type: str, d: date) -> None:
    mongo.insert(db, mongo.TRANSACTIONS, {
        "user_id": user.id,
        "transaction_date": d,
        "description": "Salary credit" if tx_type == "income" else "Spend",
        "category": "Salary/Income" if tx_type == "income" else "Food",
        "amount": Decimal(amount),
        "transaction_type": tx_type,
        "source": "manual",
    })


def _set_emergency_target(db: Database, user: User, value: str) -> None:
    db[mongo.INVESTMENT_PROFILES].update_one(
        {"user_id": user.id}, {"$set": {"emergency_fund_target": Decimal(value)}}
    )


def _emergency_target(db: Database, user: User) -> Decimal:
    return InvestmentProfile.from_doc(db[mongo.INVESTMENT_PROFILES].find_one({"user_id": user.id})).emergency_fund_target


class TestDeriveMonthlyIncome:
    def test_no_income_returns_zero(self, db: Database, user: User) -> None:
        assert analytics.derive_monthly_income(db, user.id) == Decimal("0")

    def test_single_month_is_that_months_income(self, db: Database, user: User) -> None:
        _tx(db, user, amount="85000", tx_type="income", d=date(2026, 6, 1))
        assert analytics.derive_monthly_income(db, user.id) == Decimal("85000")

    def test_multiple_credits_in_a_month_are_summed(self, db: Database, user: User) -> None:
        # A freelancer paid by two clients in one month earns the total.
        _tx(db, user, amount="68000", tx_type="income", d=date(2026, 5, 3))
        _tx(db, user, amount="35000", tx_type="income", d=date(2026, 5, 9))
        assert analytics.derive_monthly_income(db, user.id) == Decimal("103000")

    def test_averages_across_months(self, db: Database, user: User) -> None:
        _tx(db, user, amount="100000", tx_type="income", d=date(2026, 5, 1))
        _tx(db, user, amount="80000", tx_type="income", d=date(2026, 6, 1))
        assert analytics.derive_monthly_income(db, user.id) == Decimal("90000")

    def test_expenses_are_ignored(self, db: Database, user: User) -> None:
        _tx(db, user, amount="85000", tx_type="income", d=date(2026, 6, 1))
        _tx(db, user, amount="-40000", tx_type="expense", d=date(2026, 6, 2))
        assert analytics.derive_monthly_income(db, user.id) == Decimal("85000")

    def test_only_recent_months_count(self, db: Database, user: User) -> None:
        # An old, lower salary must not drag the figure down after a raise.
        _tx(db, user, amount="50000", tx_type="income", d=date(2026, 2, 1))
        for month in (4, 5, 6):
            _tx(db, user, amount="90000", tx_type="income", d=date(2026, month, 1))
        assert analytics.derive_monthly_income(db, user.id) == Decimal("90000")

    def test_month_without_income_does_not_count(self, db: Database, user: User) -> None:
        # July has spending but no salary yet — it must not be averaged in as zero.
        _tx(db, user, amount="90000", tx_type="income", d=date(2026, 6, 1))
        _tx(db, user, amount="-5000", tx_type="expense", d=date(2026, 7, 2))
        assert analytics.derive_monthly_income(db, user.id) == Decimal("90000")


class TestSyncIncome:
    def test_sets_user_income(self, db: Database, user: User) -> None:
        _tx(db, user, amount="72000", tx_type="income", d=date(2026, 6, 1))
        analytics.sync_income_from_transactions(db, user)
        assert user.monthly_income == Decimal("72000")
        # Persisted, not just set on the in-memory model.
        stored = User.from_doc(db[mongo.USERS].find_one({"id": user.id}))
        assert stored.monthly_income == Decimal("72000")

    def test_seeds_unset_emergency_target(self, db: Database, user: User) -> None:
        _set_emergency_target(db, user, "0")
        _tx(db, user, amount="60000", tx_type="income", d=date(2026, 6, 1))
        analytics.sync_income_from_transactions(db, user)
        assert _emergency_target(db, user) == Decimal("180000")

    def test_keeps_user_chosen_emergency_target(self, db: Database, user: User) -> None:
        _set_emergency_target(db, user, "500000")
        _tx(db, user, amount="60000", tx_type="income", d=date(2026, 6, 1))
        analytics.sync_income_from_transactions(db, user)
        assert _emergency_target(db, user) == Decimal("500000")


class TestCsvUploadSetsIncome:
    CSV = (
        "date,description,merchant,amount,type,category\n"
        "2026-05-01,Salary credit,Wipro Payroll,85000,credit,Salary/Income\n"
        "2026-05-02,Flat rent,Landlord,24000,debit,Bills\n"
        "2026-06-01,Salary credit,Wipro Payroll,95000,credit,Salary/Income\n"
        "2026-06-02,Flat rent,Landlord,24000,debit,Bills\n"
    )

    def test_upload_derives_income_from_salary_credits(
        self, client: TestClient, db: Database, user: User, auth_headers: dict
    ) -> None:
        resp = client.post(
            "/api/v1/transactions/upload",
            headers=auth_headers,
            files={"file": ("statement.csv", self.CSV, "text/csv")},
        )
        assert resp.status_code == 200
        assert resp.json()["imported"] == 4

        stored = User.from_doc(db[mongo.USERS].find_one({"id": user.id}))
        assert stored.monthly_income == Decimal("90000")

        me = client.get("/api/v1/auth/me", headers=auth_headers).json()
        assert float(me["monthly_income"]) == 90000.0
