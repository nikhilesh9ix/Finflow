KEYWORD_CATEGORY_MAP: dict[str, str] = {
    # Food
    "swiggy": "Food",
    "zomato": "Food",
    "restaurant": "Food",
    "cafe": "Food",
    "food": "Food",
    "grocery": "Food",
    "supermarket": "Food",
    "freshmart": "Food",
    # Transport
    "uber": "Transport",
    "ola": "Transport",
    "petrol": "Transport",
    "fuel": "Transport",
    "metro": "Transport",
    "bus": "Transport",
    # Bills
    "electricity": "Bills",
    "internet": "Bills",
    "rent": "Bills",
    "broadband": "Bills",
    "mobile": "Bills",
    "apartment": "Bills",
    "landlord": "Bills",
    # Shopping
    "amazon": "Shopping",
    "flipkart": "Shopping",
    "myntra": "Shopping",
    "mall": "Shopping",
    "store": "Shopping",
    # Health
    "pharmacy": "Health",
    "hospital": "Health",
    "doctor": "Health",
    "medical": "Health",
    "medicine": "Health",
    # Entertainment
    "netflix": "Entertainment",
    "prime": "Entertainment",
    "spotify": "Entertainment",
    "movie": "Entertainment",
    "game": "Entertainment",
    # EMI/Loan
    "emi": "EMI/Loan",
    "loan": "EMI/Loan",
    "repayment": "EMI/Loan",
    # Salary/Income
    "salary": "Salary/Income",
    "credited": "Salary/Income",
    "transferred": "Salary/Income",
    "payroll": "Salary/Income",
}


def classify_category(description: str, merchant: str | None, amount: float, provided_category: str | None = None) -> str:
    if provided_category and provided_category.strip():
        return provided_category.strip()

    searchable = f"{description} {merchant or ''}".lower()
    for keyword, category in KEYWORD_CATEGORY_MAP.items():
        if keyword in searchable:
            return category

    if amount > 0:
        return "Salary/Income"
    return "Other"
