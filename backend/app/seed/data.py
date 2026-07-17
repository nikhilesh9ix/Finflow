from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.finance import Budget, Debt, InvestmentProfile, Transaction, User


def _month_bounds(today: date) -> tuple[date, date]:
    start = today.replace(day=1)
    if today.month == 12:
        end = today.replace(year=today.year + 1, month=1, day=1)
    else:
        end = today.replace(month=today.month + 1, day=1)
    return start, end


def seed_demo_data(db: Session) -> None:
    user = db.scalar(select(User).where(User.email == "demo@finflow.ai"))
    if user is None:
        user = User(
            name="Nikhil Demo",
            email="demo@finflow.ai",
            hashed_password=get_password_hash("demo12345"),
            monthly_income=125000,
            risk_profile="balanced",
            currency="INR",
        )
        db.add(user)
        db.flush()
    else:
        user.name = user.name or "Nikhil Demo"
        user.risk_profile = user.risk_profile or "balanced"
        user.currency = user.currency or "INR"

    today = date.today()
    month_start, month_end = _month_bounds(today)
    has_current_month_transactions = bool(
        db.scalar(select(Transaction.id).where(Transaction.user_id == user.id, Transaction.posted_at >= month_start, Transaction.posted_at < month_end).limit(1))
    )

    if not has_current_month_transactions:
        transactions = [
            Transaction(user_id=user.id, posted_at=date(today.year, today.month, 1), description="Salary credit", merchant="Employer", category="Income", amount=125000, transaction_type="income"),
            Transaction(user_id=user.id, posted_at=date(today.year, today.month, 2), description="Apartment rent", merchant="Landlord", category="Housing", amount=-32000, transaction_type="expense"),
            Transaction(user_id=user.id, posted_at=date(today.year, today.month, 3), description="Grocery supermarket", merchant="FreshMart", category="Groceries", amount=-8700, transaction_type="expense"),
            Transaction(user_id=user.id, posted_at=date(today.year, today.month, 5), description="Home loan EMI", merchant="HDFC Bank", category="Debt Payments", amount=-21000, transaction_type="expense"),
            Transaction(user_id=user.id, posted_at=date(today.year, today.month, 8), description="Zomato dining", merchant="Zomato", category="Dining", amount=-6200, transaction_type="expense"),
            Transaction(user_id=user.id, posted_at=date(today.year, today.month, 12), description="Uber rides", merchant="Uber", category="Transport", amount=-4200, transaction_type="expense"),
            Transaction(user_id=user.id, posted_at=date(today.year, today.month, 15), description="Netflix subscription", merchant="Netflix", category="Subscriptions", amount=-649, transaction_type="expense"),
            Transaction(user_id=user.id, posted_at=date(today.year, today.month, 18), description="Mutual fund SIP", merchant="Zerodha Coin", category="Investments", amount=-18000, transaction_type="expense"),
            Transaction(user_id=user.id, posted_at=date(today.year, today.month, 20), description="Weekend restaurants", merchant="Local Dining", category="Dining", amount=-7800, transaction_type="expense"),
        ]
        db.add_all(transactions)

    existing_budgets = {budget.category for budget in db.scalars(select(Budget).where(Budget.user_id == user.id))}
    budgets = [
        Budget(user_id=user.id, category="Housing", monthly_limit=35000, priority="essential"),
        Budget(user_id=user.id, category="Groceries", monthly_limit=14000, priority="essential"),
        Budget(user_id=user.id, category="Dining", monthly_limit=10000, priority="watch"),
        Budget(user_id=user.id, category="Transport", monthly_limit=8000, priority="normal"),
        Budget(user_id=user.id, category="Subscriptions", monthly_limit=2000, priority="watch"),
    ]
    for budget in budgets:
        if budget.category not in existing_budgets:
            db.add(budget)

    existing_debts = {debt.lender for debt in db.scalars(select(Debt).where(Debt.user_id == user.id))}
    debts = [
        Debt(user_id=user.id, lender="HDFC Bank", debt_type="Home Loan", outstanding_amount=1860000, interest_rate=8.6, emi_amount=21000, due_day=5),
        Debt(user_id=user.id, lender="ICICI Card", debt_type="Credit Card", outstanding_amount=42000, interest_rate=36, emi_amount=8000, due_day=22),
    ]
    for debt in debts:
        if debt.lender not in existing_debts:
            db.add(debt)

    profile = db.scalar(select(InvestmentProfile).where(InvestmentProfile.user_id == user.id))
    if profile is None:
        profile = InvestmentProfile(
            user_id=user.id,
            emergency_fund_target=360000,
            current_emergency_fund=145000,
            monthly_sip=18000,
            notes="Balanced profile with first priority on emergency fund completion.",
        )
        db.add(profile)

    db.commit()
