from datetime import date

from app.services.categorization import classify_category
from app.services.csv_import import parse_transaction_csv, normalize_transaction_type


def test_classify_food_keywords() -> None:
    assert classify_category("Dinner order", "Zomato", -2400, None) == "Food"
    assert classify_category("Lunch", "Swiggy", -500, None) == "Food"


def test_classify_income_fallback() -> None:
    assert classify_category("Bonus", "Employer", 5000, None) == "Salary/Income"


def test_classify_other_fallback() -> None:
    assert classify_category("Misc purchase", "Shop", -100, None) == "Other"


def test_normalize_debit_credit() -> None:
    tx_type, amount = normalize_transaction_type("debit", 1200)
    assert tx_type == "expense"
    assert amount == -1200

    tx_type, amount = normalize_transaction_type("credit", 5000)
    assert tx_type == "income"
    assert amount == 5000


def test_parse_csv_with_debit_credit() -> None:
    content = """date,description,amount,type
2026-06-01,Salary,50000,credit
2026-06-02,Rent,15000,debit
"""
    valid, invalid = parse_transaction_csv(content)
    assert len(valid) == 2
    assert len(invalid) == 0
    assert valid[0]["amount"] == 50000
    assert valid[0]["transaction_type"] == "income"
    assert valid[1]["amount"] == -15000
    assert valid[1]["transaction_type"] == "expense"


def test_parse_csv_invalid_row() -> None:
    content = """date,description,amount,type
bad-date,Test,100,debit
"""
    valid, invalid = parse_transaction_csv(content)
    assert len(valid) == 0
    assert len(invalid) == 1


def test_provided_category_is_respected() -> None:
    assert classify_category("Anything", "Anyone", -100, "Shopping") == "Shopping"
