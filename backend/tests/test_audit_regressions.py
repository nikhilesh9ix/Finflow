"""
Regression tests for bugs found in the full-project audit.

Each test reproduces a defect that was confirmed against the running code, so
a return of the bug fails the suite.
"""

from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from pymongo.database import Database

from app.ai.copilot import _load_history
from app.db import mongo
from app.models import User
from app.services import analytics
from app.services.csv_import import parse_amount, parse_date, parse_transaction_csv


def _upload(client: TestClient, headers: dict, csv: str):
    return client.post("/api/v1/transactions/upload", headers=headers, files={"file": ("s.csv", csv, "text/csv")})


def _tx(db: Database, user: User, amount: str, tx_type: str, category: str, d: date, merchant: str = "M") -> None:
    mongo.insert(db, mongo.TRANSACTIONS, {
        "user_id": user.id, "transaction_date": d, "description": merchant, "merchant": merchant,
        "category": category, "amount": Decimal(amount), "transaction_type": tx_type, "source": "manual",
    })


# ── CSV parsing ───────────────────────────────────────────────────────────────


class TestCsvAmounts:
    @pytest.mark.parametrize("raw", ["Infinity", "-Infinity", "NaN", "sNaN", "1e400"])
    def test_non_finite_or_absurd_amount_is_rejected(self, raw: str) -> None:
        with pytest.raises(ValueError):
            parse_amount(raw)

    def test_one_bad_amount_does_not_crash_the_upload(self, client: TestClient, auth_headers: dict) -> None:
        # Previously a single "Infinity" row raised in duplicate detection → HTTP 500,
        # and the valid rows in the same file were lost.
        resp = _upload(client, auth_headers, "date,description,amount,type\n2026-06-01,Salary,50000,credit\n2026-06-02,Bad,Infinity,debit\n")
        assert resp.status_code == 200
        assert resp.json()["imported"] == 1
        assert resp.json()["skipped"] == 1

    @pytest.mark.parametrize(("raw", "expected"), [
        ("₹1,250", "1250.00"), ("Rs. 80", "80.00"), ("INR 500", "500.00"),
        ("(300)", "-300.00"), ("120.456", "120.46"), (" 99.994 ", "99.99"),
    ])
    def test_amount_formats_and_rounding_to_paise(self, raw: str, expected: str) -> None:
        assert parse_amount(raw) == Decimal(expected)

    @pytest.mark.parametrize(("raw", "expected"), [
        ("2026-06-05", date(2026, 6, 5)), ("05/06/2026", date(2026, 6, 5)),
        ("05-06-2026", date(2026, 6, 5)), ("05.06.2026", date(2026, 6, 5)),
    ])
    def test_indian_day_first_dates(self, raw: str, expected: date) -> None:
        assert parse_date(raw) == expected

    def test_stored_amount_has_two_decimals(self) -> None:
        rows, _ = parse_transaction_csv("date,description,amount,type\n2026-06-01,Coffee,120.456,debit\n")
        assert rows[0]["amount"] == Decimal("-120.46")


# ── manual transactions ───────────────────────────────────────────────────────


def test_manual_expense_is_stored_negative(client: TestClient, auth_headers: dict) -> None:
    body = {"transaction_date": "2026-06-05", "description": "Groceries", "amount": 500, "transaction_type": "expense"}
    resp = client.post("/api/v1/transactions", headers=auth_headers, json=body)
    assert resp.status_code == 201
    assert float(resp.json()["amount"]) == -500.0


# ── budgets ───────────────────────────────────────────────────────────────────


class TestDuplicateBudgets:
    def test_second_budget_for_same_category_is_rejected(self, client: TestClient, auth_headers: dict) -> None:
        first = client.post("/api/v1/budgets", headers=auth_headers, json={"category": "Food", "monthly_limit": 5000})
        dupe = client.post("/api/v1/budgets", headers=auth_headers, json={"category": "food", "monthly_limit": 9000})
        assert first.status_code == 201
        assert dupe.status_code == 409
        assert "already have" in dupe.json()["detail"]

    def test_renaming_into_an_existing_category_is_rejected(self, client: TestClient, auth_headers: dict) -> None:
        client.post("/api/v1/budgets", headers=auth_headers, json={"category": "Food", "monthly_limit": 5000})
        other = client.post("/api/v1/budgets", headers=auth_headers, json={"category": "Transport", "monthly_limit": 3000}).json()
        resp = client.put(f"/api/v1/budgets/{other['id']}", headers=auth_headers, json={"category": "Food"})
        assert resp.status_code == 409

    def test_updating_own_budget_keeps_its_category(self, client: TestClient, auth_headers: dict) -> None:
        budget = client.post("/api/v1/budgets", headers=auth_headers, json={"category": "Food", "monthly_limit": 5000}).json()
        resp = client.put(f"/api/v1/budgets/{budget['id']}", headers=auth_headers, json={"category": "Food", "monthly_limit": 6000})
        assert resp.status_code == 200


# ── analytics ─────────────────────────────────────────────────────────────────


def test_recurring_excludes_salary_income(db: Database, user: User) -> None:
    for month in (5, 6):
        _tx(db, user, "50000", "income", "Salary/Income", date(2026, month, 1), "Acme Payroll")
        _tx(db, user, "-649", "expense", "Entertainment", date(2026, month, 3), "Netflix")
    merchants = {r["merchant"] for r in analytics.recurring_transactions(db, user.id)}
    assert merchants == {"Netflix"}


class TestSalaryPlanNeverOverAllocates:
    def _plan(self, db: Database, user: User, income: str, emi: str, capacity: str) -> dict:
        user.monthly_income = Decimal(income)
        db[mongo.INVESTMENT_PROFILES].update_one(
            {"user_id": user.id},
            {"$set": {"monthly_investment_capacity": Decimal(capacity), "emergency_fund_target": Decimal("0"), "emergency_fund_current": Decimal("0")}},
        )
        if Decimal(emi) > 0:
            mongo.insert(db, mongo.DEBT_ACCOUNTS, {
                "user_id": user.id, "lender": "Bank", "debt_type": "Personal Loan", "outstanding_amount": Decimal("500000"),
                "interest_rate": Decimal("14"), "emi_amount": Decimal(emi), "due_day": 5,
            })
        return analytics.salary_plan(db, user)

    def test_tight_budget_sums_to_income(self, db: Database, user: User) -> None:
        # Reproduced: ₹40,000 income was split into ₹50,000 of allocations.
        plan = self._plan(db, user, income="40000", emi="20000", capacity="30000")
        assert sum(a["amount"] for a in plan["allocations"]) == pytest.approx(40000)
        assert plan["shortfall"] == 0

    def test_essentials_are_funded_before_investments(self, db: Database, user: User) -> None:
        plan = self._plan(db, user, income="40000", emi="20000", capacity="30000")
        buckets = {a["bucket"]: a["amount"] for a in plan["allocations"]}
        assert buckets["Essentials"] == pytest.approx(20000)
        assert buckets["Investments"] == pytest.approx(0)

    def test_emis_above_income_are_reported_as_shortfall(self, db: Database, user: User) -> None:
        plan = self._plan(db, user, income="30000", emi="36000", capacity="5000")
        assert plan["shortfall"] == pytest.approx(6000)

    def test_normal_case_is_unchanged(self, db: Database, user: User) -> None:
        # Meera's real numbers produced these buckets before the fix; they must not move.
        user.monthly_income = Decimal("85000")
        db[mongo.INVESTMENT_PROFILES].update_one(
            {"user_id": user.id},
            {"$set": {"monthly_investment_capacity": Decimal("12000"), "emergency_fund_target": Decimal("255000"), "emergency_fund_current": Decimal("48000")}},
        )
        mongo.insert(db, mongo.DEBT_ACCOUNTS, {
            "user_id": user.id, "lender": "Axis", "debt_type": "Car Loan", "outstanding_amount": Decimal("640000"),
            "interest_rate": Decimal("9.4"), "emi_amount": Decimal("14200"), "due_day": 3,
        })
        buckets = {a["bucket"]: a["amount"] for a in analytics.salary_plan(db, user)["allocations"]}
        assert buckets == {"Essentials": 42500.0, "Debt EMIs": 14200.0, "Investments": 12000.0, "Emergency fund": 12750.0, "Flexible": 3550.0}


def test_savings_rate_uses_same_income_as_savings(db: Database, user: User) -> None:
    # Latest month has spending but no salary yet. Savings used ₹0 income while the
    # rate divided by the ₹60,000 average, giving a meaningless −5%.
    user.monthly_income = Decimal("60000")
    _tx(db, user, "60000", "income", "Salary/Income", date(2026, 5, 1))
    _tx(db, user, "-3000", "expense", "Food", date(2026, 6, 2))
    dash = analytics.dashboard_summary(db, user)
    assert dash["month"] == "2026-06"
    assert dash["income_is_estimated"] is True
    assert dash["projected_savings"] == 57000.0
    assert dash["savings_rate"] == 95.0


# ── investment profile ────────────────────────────────────────────────────────


class TestInvestmentProfileEndpoint:
    def test_includes_readiness_and_non_negative_gap(self, client: TestClient, auth_headers: dict) -> None:
        body = {"risk_profile": "balanced", "monthly_investment_capacity": 1000, "emergency_fund_target": 100000, "emergency_fund_current": 150000}
        client.put("/api/v1/investment-profile", headers=auth_headers, json=body)
        profile = client.get("/api/v1/investment-profile", headers=auth_headers).json()
        assert float(profile["emergency_gap"]) == 0.0
        assert profile["readiness"]

    def test_saving_without_notes_keeps_existing_notes(self, client: TestClient, db: Database, user: User, auth_headers: dict) -> None:
        db[mongo.INVESTMENT_PROFILES].update_one({"user_id": user.id}, {"$set": {"notes": "keep me"}})
        body = {"risk_profile": "growth", "monthly_investment_capacity": 2000, "emergency_fund_target": 1, "emergency_fund_current": 0}
        resp = client.put("/api/v1/investment-profile", headers=auth_headers, json=body)
        assert resp.status_code == 200
        assert resp.json()["notes"] == "keep me"
        assert resp.json()["risk_profile"] == "growth"


def test_copilot_history_never_starts_with_assistant(db: Database, user: User) -> None:
    mongo.insert(db, mongo.CHAT_HISTORY, {"user_id": user.id, "role": "assistant", "message": "Welcome"})
    mongo.insert(db, mongo.CHAT_HISTORY, {"user_id": user.id, "role": "user", "message": "Hi"})
    mongo.insert(db, mongo.CHAT_HISTORY, {"user_id": user.id, "role": "assistant", "message": "Hello"})
    history = _load_history(db, user.id)
    assert history[0]["role"] == "user"
    assert [m["content"] for m in history] == ["Hi", "Hello"]
