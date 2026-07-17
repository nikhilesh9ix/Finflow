from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.session import Base
from app.models.finance import Budget, Debt, InvestmentProfile, Transaction, User
from app.schemas.finance import InvestmentProfileRequest, SalaryPlanRequest
from app.services.copilot import answer_question, recent_history
from app.services.finance import debt_audit, investment_recommendation, salary_plan


def make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)
    return TestingSession()


def make_user(db, income: float = 100000, risk_profile: str = "balanced"):
    user = User(
        name="Test User",
        email=f"test-{income}@example.com",
        hashed_password="hash",
        monthly_income=income,
        risk_profile=risk_profile,
        currency="INR",
    )
    db.add(user)
    db.flush()
    return user


def seed_cashflow(db, user):
    budgets = [
        Budget(user_id=user.id, category="Dining", monthly_limit=10000, priority="watch"),
        Budget(user_id=user.id, category="Subscriptions", monthly_limit=2000, priority="watch"),
    ]
    transactions = [
        Transaction(user_id=user.id, posted_at=date.today().replace(day=1), description="Salary credit", merchant="Employer", category="Income", amount=100000, transaction_type="income", source="seed"),
        Transaction(user_id=user.id, posted_at=date.today().replace(day=2), description="Netflix subscription", merchant="Netflix", category="Subscriptions", amount=-649, transaction_type="expense", source="seed"),
        Transaction(user_id=user.id, posted_at=date.today().replace(day=3), description="Dining out", merchant="Local Cafe", category="Dining", amount=-15000, transaction_type="expense", source="seed"),
        Transaction(user_id=user.id, posted_at=date.today().replace(day=4), description="Savings idle cash", merchant="Bank", category="Savings", amount=-5000, transaction_type="expense", source="seed"),
    ]
    db.add_all(budgets + transactions)


def seed_debts(db, user):
    debts = [
        Debt(user_id=user.id, lender="ICICI Card", debt_type="Credit Card", outstanding_amount=40000, interest_rate=36, emi_amount=8000, due_day=22),
        Debt(user_id=user.id, lender="HDFC Personal Loan", debt_type="Personal Loan", outstanding_amount=150000, interest_rate=14, emi_amount=5000, due_day=5),
        Debt(user_id=user.id, lender="BNPL App", debt_type="BNPL", outstanding_amount=10000, interest_rate=24, emi_amount=2000, due_day=15),
    ]
    db.add_all(debts)


def test_salary_plan_prioritizes_bills_and_debt():
    db = make_session()
    user = make_user(db, income=100000, risk_profile="balanced")

    plan = salary_plan(
        db,
        user,
        SalaryPlanRequest(
            monthly_income=100000,
            monthly_fixed_costs=45000,
            debt_load=30000,
            savings_goal_months=6,
            risk_tolerance="balanced",
            strategy_mode="balanced",
        ),
    )

    assert plan["debt_to_income_ratio"] == 30.0
    assert plan["allocations"][0]["bucket"] == "Fixed bills"
    assert round(sum(item["percentage"] for item in plan["allocations"])) == 100
    assert plan["warnings"]


def test_debt_audit_ranks_high_interest_and_flags_leaks():
    db = make_session()
    user = make_user(db)
    seed_cashflow(db, user)
    seed_debts(db, user)
    db.commit()

    audit = debt_audit(
        db,
        user,
        payload=type(
            "Payload",
            (),
            {"model_dump": lambda self=None: {"monthly_income": 40000, "monthly_fixed_costs": 15000, "extra_payment_capacity": 5000}},
        )(),
    )

    assert audit["avalanche_order"][0]["lender"] == "ICICI Card"
    assert audit["debt_to_income_ratio"] == 37.5
    assert any("subscription" in leak["title"].lower() for leak in audit["wealth_leaks"])
    assert any("overspending" in leak["title"].lower() for leak in audit["wealth_leaks"])
    assert any("debt-to-income" in warning.lower() for warning in audit["warnings"])
    assert audit["projection"]


def test_investment_recommendation_persists_profile():
    db = make_session()
    user = make_user(db, income=180000, risk_profile="growth")
    db.commit()

    recommendation = investment_recommendation(
        db,
        user,
        InvestmentProfileRequest(
            age=28,
            monthly_income=180000,
            risk_tolerance="growth",
            goal_horizon_years=12,
            emergency_fund_status="ready",
            emergency_fund_months=8,
        ),
    )

    profile = db.query(InvestmentProfile).filter(InvestmentProfile.user_id == user.id).one()
    assert recommendation["profile_mode"] == "growth"
    assert any(bucket["category"] == "Index fund SIP" for bucket in recommendation["buckets"])
    assert profile.recommendation_json


def test_copilot_uses_no_data_fallback_and_stores_history():
    db = make_session()
    user = make_user(db, income=75000, risk_profile="balanced")
    db.commit()

    result = answer_question(db, user, "Where did most of my money go this month?")

    assert result["provider"] == "no-data"
    assert "enough user financial data" in result["answer"].lower()
    history = recent_history(db, user)
    assert history
    assert history[0]["question"] == "Where did most of my money go this month?"


def test_copilot_blocks_harmful_requests():
    db = make_session()
    user = make_user(db)
    db.commit()

    result = answer_question(db, user, "How do I hide money and evade tax?")

    assert result["provider"] == "guardrail"
    assert "can't help" in result["answer"].lower()
