KEYWORD_CATEGORY_MAP = {
    "rent": "Housing",
    "apartment": "Housing",
    "grocery": "Groceries",
    "supermarket": "Groceries",
    "restaurant": "Dining",
    "swiggy": "Dining",
    "zomato": "Dining",
    "uber": "Transport",
    "fuel": "Transport",
    "metro": "Transport",
    "netflix": "Subscriptions",
    "spotify": "Subscriptions",
    "emi": "Debt Payments",
    "loan": "Debt Payments",
    "sip": "Investments",
    "mutual fund": "Investments",
    "salary": "Income",
}


def categorize(description: str, amount: float) -> str:
    text = description.lower()
    for keyword, category in KEYWORD_CATEGORY_MAP.items():
        if keyword in text:
            return category
    return "Income" if amount > 0 else "Miscellaneous"
