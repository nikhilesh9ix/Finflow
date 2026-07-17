import csv
from datetime import date
from io import StringIO
from typing import Any

from app.services.categorization import classify_category

REQUIRED_COLUMNS = {"date", "description", "amount"}

DEBIT_TYPES = {"debit", "expense", "dr"}
CREDIT_TYPES = {"credit", "income", "cr"}
VALID_TYPES = DEBIT_TYPES | CREDIT_TYPES | {"transfer"}


def normalize_row(row: dict[str, Any]) -> dict[str, str]:
    return {str(key).strip().lower(): str(value).strip() for key, value in row.items() if key is not None}


def normalize_transaction_type(raw_type: str | None, amount: float) -> tuple[str, float]:
    normalized = (raw_type or "").strip().lower()
    if normalized in DEBIT_TYPES:
        return "expense", -abs(amount)
    if normalized in CREDIT_TYPES:
        return "income", abs(amount)
    if normalized == "transfer":
        return "transfer", amount
    if normalized in {"income", "expense"}:
        return normalized, amount if normalized == "income" else -abs(amount)
    if amount > 0:
        return "income", amount
    if amount < 0:
        return "expense", amount
    return "expense", amount


def parse_transaction_csv(content: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    reader = csv.DictReader(StringIO(content.lstrip("\ufeff")))
    if not reader.fieldnames:
        return [], [{"row": 0, "error": "CSV is empty or missing headers"}]

    headers = {field.strip().lower() for field in reader.fieldnames}
    missing = sorted(REQUIRED_COLUMNS - headers)
    if missing:
        return [], [{"row": 0, "error": f"Missing required columns: {', '.join(missing)}"}]

    valid_rows: list[dict[str, Any]] = []
    invalid_rows: list[dict[str, Any]] = []

    for index, raw_row in enumerate(reader, start=2):
        row = normalize_row(raw_row)
        try:
            amount = float(row["amount"].replace(",", ""))
            description = row["description"]
            if not description:
                raise ValueError("description is required")
            parsed_date = date.fromisoformat(row["date"])
            raw_type = row.get("type") or row.get("transaction_type") or None
            if raw_type and raw_type.lower() not in VALID_TYPES and raw_type.lower() not in {"income", "expense", "transfer"}:
                raise ValueError("type must be debit, credit, income, expense, or transfer")
            transaction_type, normalized_amount = normalize_transaction_type(raw_type, amount)
            merchant = row.get("merchant") or None
            valid_rows.append(
                {
                    "transaction_date": parsed_date,
                    "description": description,
                    "merchant": merchant,
                    "amount": normalized_amount,
                    "transaction_type": transaction_type,
                    "category": classify_category(description, merchant, normalized_amount, row.get("category")),
                    "source": "csv",
                }
            )
        except Exception as exc:
            invalid_rows.append({"row": index, "error": str(exc), "raw": row})

    return valid_rows, invalid_rows
