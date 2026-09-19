"""
Keyword categorisation tests.

Guards the whole-word matcher against the substring false positives it replaced,
and the rules for when a bank-supplied category may be overridden.
"""

import pytest

from app.services.categorization import INVESTMENT_CATEGORY, classify_category


class TestWholeWordMatching:
    @pytest.mark.parametrize(
        ("description", "merchant", "not_expected"),
        [
            ("Term insurance premium", "LIC", "EMI/Loan"),  # "premium" contains "emi"
            ("Coca cola crate", "DMart", "Transport"),  # "cola" contains "ola"
            ("Current account charges", "HDFC", "Bills"),  # "current" contains "rent"
            ("Business lunch", "Office", "Transport"),  # "business" contains "bus"
        ],
    )
    def test_keywords_inside_other_words_do_not_match(self, description, merchant, not_expected) -> None:
        assert classify_category(description, merchant, -100) != not_expected

    def test_whole_word_still_matches(self) -> None:
        assert classify_category("Home loan EMI", "HDFC Bank", -21000) == "EMI/Loan"
        assert classify_category("Cab ride", "Ola", -250) == "Transport"
        assert classify_category("Flat rent", "Landlord", -24000) == "Bills"

    def test_plural_matches(self) -> None:
        assert classify_category("Two movies", "PVR", -600) == "Entertainment"
        assert classify_category("Weekly groceries", "DMart", -3000) == "Food"


class TestInvestments:
    @pytest.mark.parametrize(
        ("description", "merchant"),
        [
            ("SIP - index fund", "Groww"),
            ("Mutual fund SIP", "Zerodha Coin"),
            ("ELSS investment", "Groww"),
            ("Emergency fund transfer", "ICICI Savings"),
            ("Recurring deposit", "SBI"),
            ("Liquid fund parking", "Paytm Money"),
        ],
    )
    def test_savings_moves_are_investments(self, description, merchant) -> None:
        assert classify_category(description, merchant, -10000) == INVESTMENT_CATEGORY

    def test_generic_bank_category_is_upgraded(self) -> None:
        # Bank exports label SIPs "Other"; that must not hide them from the rule.
        assert classify_category("SIP - index fund", "Groww", -12000, "Other") == INVESTMENT_CATEGORY

    def test_specific_bank_category_is_kept(self) -> None:
        assert classify_category("SIP - index fund", "Groww", -12000, "Shopping") == "Shopping"

    def test_generic_category_without_match_is_kept(self) -> None:
        assert classify_category("Misc purchase", "Shop", -100, "Other") == "Other"


def test_healthcare_label_matches_budget_categories() -> None:
    # Budgets and bank exports say "Healthcare"; emitting "Health" never matched them.
    assert classify_category("Medicines", "Apollo Pharmacy", -500) == "Healthcare"
