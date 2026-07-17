from datetime import date

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import (
    Budget,
    ChatHistory,
    DebtAccount,
    InvestmentProfile,
    SavingsGoal,
    Transaction,
    User,
)

DEMO_EMAIL = "demo@finflow.ai"
DEMO_PASSWORD = "demo12345"


def seed_demo_data() -> None:
    with SessionLocal() as db:
        existing_user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
        if existing_user:
            print(f"Demo user already exists: {DEMO_EMAIL}")
            return

        user = User(
            email=DEMO_EMAIL,
            full_name="FinFlow Demo User",
            hashed_password=get_password_hash(DEMO_PASSWORD),
            monthly_income=125000,
            currency="INR",
        )
        db.add(user)
        db.flush()

        db.add_all(
            [
                Transaction(user_id=user.id, transaction_date=date(2026, 6, 1), description="Salary credit", merchant="Employer", category="Salary/Income", amount=125000, transaction_type="income", source="seed"),
                Transaction(user_id=user.id, transaction_date=date(2026, 5, 1), description="Salary credit", merchant="Employer", category="Salary/Income", amount=125000, transaction_type="income", source="seed"),
                Transaction(user_id=user.id, transaction_date=date(2026, 5, 2), description="Apartment rent", merchant="Landlord", category="Bills", amount=-32000, transaction_type="expense", source="seed"),
                Transaction(user_id=user.id, transaction_date=date(2026, 5, 6), description="Home loan EMI", merchant="HDFC Bank", category="EMI/Loan", amount=-21000, transaction_type="expense", source="seed"),
                Transaction(user_id=user.id, transaction_date=date(2026, 5, 12), description="Mutual fund SIP", merchant="Zerodha Coin", category="Other", amount=-18000, transaction_type="expense", source="seed"),
                Transaction(user_id=user.id, transaction_date=date(2026, 6, 2), description="Apartment rent", merchant="Landlord", category="Bills", amount=-32000, transaction_type="expense", source="seed"),
                Transaction(user_id=user.id, transaction_date=date(2026, 6, 4), description="Grocery supermarket", merchant="FreshMart", category="Food", amount=-8600, transaction_type="expense", source="seed"),
                Transaction(user_id=user.id, transaction_date=date(2026, 6, 6), description="Home loan EMI", merchant="HDFC Bank", category="EMI/Loan", amount=-21000, transaction_type="expense", source="seed"),
                Transaction(user_id=user.id, transaction_date=date(2026, 6, 8), description="Dinner with friends", merchant="Zomato", category="Food", amount=-2400, transaction_type="expense", source="seed"),
                Transaction(user_id=user.id, transaction_date=date(2026, 6, 12), description="Mutual fund SIP", merchant="Zerodha Coin", category="Other", amount=-18000, transaction_type="expense", source="seed"),
                Budget(user_id=user.id, category="Bills", monthly_limit=35000, priority="essential"),
                Budget(user_id=user.id, category="Food", monthly_limit=14000, priority="essential"),
                Budget(user_id=user.id, category="Entertainment", monthly_limit=9000, priority="watch"),
                SavingsGoal(user_id=user.id, name="Emergency fund", target_amount=360000, current_amount=145000, target_date=date(2026, 12, 31)),
                SavingsGoal(user_id=user.id, name="Vacation fund", target_amount=90000, current_amount=22000, target_date=date(2026, 11, 15)),
                DebtAccount(user_id=user.id, lender="HDFC Bank", debt_type="Home Loan", outstanding_amount=1860000, interest_rate=8.6, emi_amount=21000, due_day=5),
                DebtAccount(user_id=user.id, lender="ICICI Card", debt_type="Credit Card", outstanding_amount=42000, interest_rate=36, emi_amount=8000, due_day=22),
                InvestmentProfile(user_id=user.id, risk_profile="balanced", monthly_investment_capacity=18000, emergency_fund_target=360000, emergency_fund_current=145000, notes="Prioritize emergency fund before increasing equity exposure."),
                ChatHistory(user_id=user.id, role="assistant", message="Welcome to FinFlow AI. Ask me about budgets, debt payoff, or salary allocation."),
            ]
        )
        db.commit()
        print(f"Seeded demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    seed_demo_data()
