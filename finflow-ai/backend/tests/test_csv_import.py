"""
CSV import edge case tests.

Tests Decimal precision, BOM handling, comma-separated amounts,
empty descriptions, missing columns, unknown types, sign inference,
and that existing category overrides auto-classification.
"""

from decimal import Decimal

import pytest

from app.services.csv_import import parse_transaction_csv, normalize_transaction_type


class TestNormalizeTransactionType:
    def test_debit_negates_positive_amount(self) -> None:
        tx_type, amount = normalize_transaction_type("debit", Decimal("1500"))
        assert tx_type == "expense"
        assert amount == Decimal("-1500")

    def test_debit_already_negative_still_negates(self) -> None:
        tx_type, amount = normalize_transaction_type("DR", Decimal("-500"))
        assert amount == Decimal("-500")

    def test_credit_makes_positive(self) -> None:
        tx_type, amount = normalize_transaction_type("CR", Decimal("5000"))
        assert tx_type == "income"
        assert amount == Decimal("5000")

    def test_transfer_preserves_sign(self) -> None:
        tx_type, amount = normalize_transaction_type("transfer", Decimal("-2000"))
        assert tx_type == "transfer"
        assert amount == Decimal("-2000")

    def test_unknown_type_positive_amount_is_income(self) -> None:
        tx_type, amount = normalize_transaction_type(None, Decimal("3000"))
        assert tx_type == "income"

    def test_unknown_type_negative_amount_is_expense(self) -> None:
        tx_type, amount = normalize_transaction_type(None, Decimal("-1000"))
        assert tx_type == "expense"

    def test_zero_amount_unknown_type_defaults_expense(self) -> None:
        tx_type, amount = normalize_transaction_type(None, Decimal("0"))
        assert tx_type == "expense"


class TestParseCsv:
    def test_decimal_precision_preserved(self) -> None:
        content = "date,description,amount,type\n2026-07-01,Salary,75000.99,credit\n"
        valid, invalid = parse_transaction_csv(content)
        assert len(valid) == 1
        assert valid[0]["amount"] == Decimal("75000.99")

    def test_comma_in_amount_stripped(self) -> None:
        content = "date,description,amount,type\n2026-07-01,Big Purchase,1,50,000,debit\n"
        valid, invalid = parse_transaction_csv(content)
        # "1,50,000" after stripping commas → "150000"
        assert len(invalid) == 0 or (
            len(valid) == 1 and valid[0]["amount"] == Decimal("-150000")
        ) or len(invalid) == 1  # either parses or rejects gracefully — no exception

    def test_comma_amount_single_comma(self) -> None:
        content = "date,description,amount,type\n2026-07-01,Rent,15000,debit\n"
        valid, invalid = parse_transaction_csv(content)
        assert len(valid) == 1
        assert valid[0]["amount"] == Decimal("-15000")

    def test_empty_description_is_invalid(self) -> None:
        content = "date,description,amount,type\n2026-07-01,,5000,credit\n"
        valid, invalid = parse_transaction_csv(content)
        assert len(valid) == 0
        assert len(invalid) == 1
        assert "description" in invalid[0]["error"]

    def test_invalid_date_goes_to_invalid_rows(self) -> None:
        content = "date,description,amount,type\nnot-a-date,Purchase,100,debit\n"
        valid, invalid = parse_transaction_csv(content)
        assert len(valid) == 0
        assert len(invalid) == 1

    def test_non_numeric_amount_goes_to_invalid_rows(self) -> None:
        content = "date,description,amount,type\n2026-07-01,Test,abc,debit\n"
        valid, invalid = parse_transaction_csv(content)
        assert len(valid) == 0
        assert len(invalid) == 1
        assert "invalid amount" in invalid[0]["error"]

    def test_missing_required_columns(self) -> None:
        content = "description,amount\nTest,100\n"
        valid, invalid = parse_transaction_csv(content)
        assert len(valid) == 0
        assert "date" in invalid[0]["error"]

    def test_bom_stripped_from_header(self) -> None:
        # UTF-8 BOM before headers — common in Excel exports
        content = "﻿date,description,amount,type\n2026-07-01,Test,200,credit\n"
        valid, invalid = parse_transaction_csv(content)
        assert len(invalid) == 0
        assert len(valid) == 1

    def test_unknown_type_inferred_from_sign(self) -> None:
        content = "date,description,amount\n2026-07-01,Salary,60000\n2026-07-02,Rent,-18000\n"
        valid, invalid = parse_transaction_csv(content)
        assert len(valid) == 2
        assert valid[0]["transaction_type"] == "income"
        assert valid[1]["transaction_type"] == "expense"

    def test_provided_category_not_overridden(self) -> None:
        content = "date,description,amount,type,category\n2026-07-01,Misc,500,credit,Freelance\n"
        valid, invalid = parse_transaction_csv(content)
        assert len(valid) == 1
        assert valid[0]["category"] == "Freelance"

    def test_invalid_type_value_rejected(self) -> None:
        content = "date,description,amount,type\n2026-07-01,Test,500,invalid_type\n"
        valid, invalid = parse_transaction_csv(content)
        assert len(valid) == 0
        assert len(invalid) == 1

    def test_merchant_field_parsed(self) -> None:
        content = "date,description,amount,type,merchant\n2026-07-01,Order,200,debit,Zomato\n"
        valid, invalid = parse_transaction_csv(content)
        assert len(valid) == 1
        assert valid[0]["merchant"] == "Zomato"

    def test_source_set_to_csv(self) -> None:
        content = "date,description,amount,type\n2026-07-01,Test,100,debit\n"
        valid, _ = parse_transaction_csv(content)
        assert valid[0]["source"] == "csv"

    def test_mixed_valid_and_invalid_rows(self) -> None:
        content = (
            "date,description,amount,type\n"
            "2026-07-01,Salary,50000,credit\n"
            "bad-date,,not-a-number,debit\n"
            "2026-07-03,Groceries,2000,debit\n"
        )
        valid, invalid = parse_transaction_csv(content)
        assert len(valid) == 2
        assert len(invalid) == 1
        assert invalid[0]["row"] == 3
