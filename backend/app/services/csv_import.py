import csv
import re
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from io import StringIO
from typing import Any

from app.services.categorization import classify_category

REQUIRED_COLUMNS = {"date", "description", "amount"}

DEBIT_TYPES = {"debit", "expense", "dr"}
CREDIT_TYPES = {"credit", "income", "cr"}
VALID_TYPES = DEBIT_TYPES | CREDIT_TYPES | {"transfer"}

_ZERO = Decimal("0")
_PAISA = Decimal("0.01")
# Largest value the old NUMERIC(15,2) column held; anything bigger is a data error.
_MAX_AMOUNT = Decimal("9999999999999.99")

# Currency markers Indian bank exports put around numbers: "₹1,250", "Rs. 80", "INR 500".
_CURRENCY_NOISE = re.compile(r"(?i)^(?:inr|rs\.?)|(?:inr)$|[₹,\s]")

# ISO first; then the day-first layouts Indian banks use. Day-first is the Indian
# convention, so 05/06/2026 is 5 June, never 6 May.
_DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y/%m/%d")


def normalize_row(row: dict[str, Any]) -> dict[str, str]:
    return {str(key).strip().lower(): str(value).strip() for key, value in row.items() if key is not None}


def parse_amount(raw: str) -> Decimal:
    """
    Parse a statement amount into an exact 2-decimal Decimal.

    Accepts currency symbols, thousands separators and accounting-style
    negatives "(500)". Rejects NaN and Infinity — Decimal happily parses both,
    and a single Infinity row used to crash the whole upload.
    """
    text = raw.strip()
    negative = text.startswith("(") and text.endswith(")")
    if negative:
        text = text[1:-1]
    text = _CURRENCY_NOISE.sub("", text)
    try:
        amount = Decimal(text)
        if not amount.is_finite():
            raise InvalidOperation
        amount = amount.quantize(_PAISA, rounding=ROUND_HALF_UP)
    except InvalidOperation as exc:
        raise ValueError(f"invalid amount: {raw!r}") from exc
    if abs(amount) > _MAX_AMOUNT:
        raise ValueError(f"amount out of range: {raw!r}")
    return -amount if negative else amount


def parse_date(raw: str) -> date:
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(raw.strip(), fmt).date()
        except ValueError:
            continue
    raise ValueError(f"invalid date: {raw!r} (use YYYY-MM-DD or DD/MM/YYYY)")


def normalize_transaction_type(raw_type: str | None, amount: Decimal) -> tuple[str, Decimal]:
    normalized = (raw_type or "").strip().lower()
    if normalized in DEBIT_TYPES:
        return "expense", -abs(amount)
    if normalized in CREDIT_TYPES:
        return "income", abs(amount)
    if normalized == "transfer":
        return "transfer", amount
    if amount > _ZERO:
        return "income", amount
    if amount < _ZERO:
        return "expense", amount
    return "expense", amount


def parse_transaction_csv(content: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    reader = csv.DictReader(StringIO(content.lstrip("﻿")))
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
            amount = parse_amount(row["amount"])
            description = row["description"]
            if not description:
                raise ValueError("description is required")
            parsed_date = parse_date(row["date"])
            raw_type = row.get("type") or row.get("transaction_type") or None
            if raw_type and raw_type.lower() not in VALID_TYPES:
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
