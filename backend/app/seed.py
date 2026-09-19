from datetime import date
from decimal import Decimal

from app.core.security import get_password_hash
from app.db import mongo

DEMO_EMAIL = "demo@finflow.ai"
DEMO_PASSWORD = "demo12345"


def _money(value: int | str) -> Decimal:
    return Decimal(str(value))


def seed_demo_data() -> None:
    db = mongo.get_database()
    mongo.ensure_indexes(db)

    if db[mongo.USERS].find_one({"email": DEMO_EMAIL}, {"_id": 1}):
        print(f"Demo user already exists: {DEMO_EMAIL}")
        return

    user = mongo.insert(
        db,
        mongo.USERS,
        {
            "email": DEMO_EMAIL,
            "full_name": "FinFlow Demo User",
            "hashed_password": get_password_hash(DEMO_PASSWORD),
            "monthly_income": _money(125000),
            "currency": "INR",
        },
    )
    uid = user["id"]

    def tx(d: date, description: str, merchant: str, category: str, amount: int, kind: str) -> dict:
        return {
            "user_id": uid, "transaction_date": d, "description": description, "merchant": merchant,
            "category": category, "amount": _money(amount), "transaction_type": kind, "source": "seed",
        }

    mongo.insert_many(db, mongo.TRANSACTIONS, [
        tx(date(2026, 5, 1), "Salary credit", "Employer", "Salary/Income", 125000, "income"),
        tx(date(2026, 5, 2), "Apartment rent", "Landlord", "Bills", -32000, "expense"),
        tx(date(2026, 5, 6), "Home loan EMI", "HDFC Bank", "EMI/Loan", -21000, "expense"),
        tx(date(2026, 5, 12), "Mutual fund SIP", "Zerodha Coin", "Investments", -18000, "expense"),
        tx(date(2026, 6, 1), "Salary credit", "Employer", "Salary/Income", 125000, "income"),
        tx(date(2026, 6, 2), "Apartment rent", "Landlord", "Bills", -32000, "expense"),
        tx(date(2026, 6, 4), "Grocery supermarket", "FreshMart", "Food", -8600, "expense"),
        tx(date(2026, 6, 6), "Home loan EMI", "HDFC Bank", "EMI/Loan", -21000, "expense"),
        tx(date(2026, 6, 8), "Dinner with friends", "Zomato", "Food", -2400, "expense"),
        tx(date(2026, 6, 12), "Mutual fund SIP", "Zerodha Coin", "Investments", -18000, "expense"),
    ])
    mongo.insert_many(db, mongo.BUDGETS, [
        {"user_id": uid, "category": "Bills", "monthly_limit": _money(35000), "priority": "essential"},
        {"user_id": uid, "category": "Food", "monthly_limit": _money(14000), "priority": "essential"},
        {"user_id": uid, "category": "Entertainment", "monthly_limit": _money(9000), "priority": "watch"},
    ])
    mongo.insert_many(db, mongo.SAVINGS_GOALS, [
        {"user_id": uid, "name": "Emergency fund", "target_amount": _money(360000), "current_amount": _money(145000), "target_date": date(2026, 12, 31)},
        {"user_id": uid, "name": "Vacation fund", "target_amount": _money(90000), "current_amount": _money(22000), "target_date": date(2026, 11, 15)},
    ])
    mongo.insert_many(db, mongo.DEBT_ACCOUNTS, [
        {"user_id": uid, "lender": "HDFC Bank", "debt_type": "Home Loan", "outstanding_amount": _money(1860000), "interest_rate": _money("8.6"), "emi_amount": _money(21000), "due_day": 5},
        {"user_id": uid, "lender": "ICICI Card", "debt_type": "Credit Card", "outstanding_amount": _money(42000), "interest_rate": _money(36), "emi_amount": _money(8000), "due_day": 22},
    ])
    mongo.insert(db, mongo.INVESTMENT_PROFILES, {
        "user_id": uid, "risk_profile": "balanced", "monthly_investment_capacity": _money(18000),
        "emergency_fund_target": _money(360000), "emergency_fund_current": _money(145000),
        "notes": "Prioritize emergency fund before increasing equity exposure.",
    })
    mongo.insert(db, mongo.CHAT_HISTORY, {
        "user_id": uid, "role": "assistant",
        "message": "Welcome to FinFlow AI. Ask me about budgets, debt payoff, or salary allocation.",
    })
    print(f"Seeded demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    seed_demo_data()
