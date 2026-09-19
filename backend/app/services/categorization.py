import re

# Money moved into the user's own savings or investments. It leaves the bank
# account but is not consumption, so analytics exclude it from spend and savings.
INVESTMENT_CATEGORY = "Investments"

# Categories a bank export uses when it has not really categorised a row. A
# keyword match is allowed to replace these; any other supplied category wins.
_GENERIC_CATEGORIES = {"other", "misc", "miscellaneous", "uncategorized", "uncategorised"}

# Order matters: the first matching keyword decides. Investments come first so a
# row like "Mutual fund SIP" is never claimed by a broader keyword further down.
KEYWORD_CATEGORY_MAP: dict[str, str] = {
    # Investments & savings transfers
    "sip": INVESTMENT_CATEGORY,
    "elss": INVESTMENT_CATEGORY,
    "mutual fund": INVESTMENT_CATEGORY,
    "index fund": INVESTMENT_CATEGORY,
    "liquid fund": INVESTMENT_CATEGORY,
    "recurring deposit": INVESTMENT_CATEGORY,
    "fixed deposit": INVESTMENT_CATEGORY,
    "ppf": INVESTMENT_CATEGORY,
    "nps": INVESTMENT_CATEGORY,
    "emergency fund": INVESTMENT_CATEGORY,
    "investment": INVESTMENT_CATEGORY,
    "groww": INVESTMENT_CATEGORY,
    "zerodha": INVESTMENT_CATEGORY,
    "kuvera": INVESTMENT_CATEGORY,
    # Food
    "swiggy": "Food",
    "zomato": "Food",
    "restaurant": "Food",
    "cafe": "Food",
    "food": "Food",
    "grocery": "Food",
    "groceries": "Food",
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
    # Healthcare — same label budgets and bank exports use, so the two line up
    "pharmacy": "Healthcare",
    "hospital": "Healthcare",
    "doctor": "Healthcare",
    "medical": "Healthcare",
    "medicine": "Healthcare",
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

# Whole-word matching, allowing a plain plural ("movies", "mutual funds").
# Substring matching misfired on ordinary text: "premium" matched "emi",
# "Coca cola" matched "ola", and "current" matched "rent".
_KEYWORD_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(rf"\b{re.escape(keyword)}(?:s|es)?\b"), category)
    for keyword, category in KEYWORD_CATEGORY_MAP.items()
]


def _match_keyword(description: str, merchant: str | None) -> str | None:
    searchable = f"{description} {merchant or ''}".lower()
    for pattern, category in _KEYWORD_PATTERNS:
        if pattern.search(searchable):
            return category
    return None


def classify_category(description: str, merchant: str | None, amount, provided_category: str | None = None) -> str:
    provided = (provided_category or "").strip()
    if provided and provided.lower() not in _GENERIC_CATEGORIES:
        return provided

    matched = _match_keyword(description, merchant)
    if matched:
        return matched
    if provided:
        # A generic label with no better match stays as the bank supplied it.
        return provided

    if amount > 0:
        return "Salary/Income"
    return "Other"
