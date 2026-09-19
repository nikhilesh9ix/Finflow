"""
Tool definitions and executor for the FinFlow AI copilot.

Each tool maps directly to an analytics function.  The executor
dispatches by name, serializes Decimal/date to JSON-safe types,
and returns a compact string Claude can reason over.

Adding a new analytics capability = add one entry to TOOL_DEFINITIONS
and one branch in execute_tool().
"""

import json
import re
from datetime import date
from decimal import Decimal
from typing import Any

from pymongo.database import Database

from app.models import User
from app.services import analytics

_MONTH_KEY = re.compile(r"\d{4}-(0[1-9]|1[0-2])")

# ── JSON serialization ────────────────────────────────────────────────────────


class _FinanceEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, date):
            return obj.isoformat()
        return super().default(obj)


def _dump(data: Any) -> str:
    return json.dumps(data, cls=_FinanceEncoder, ensure_ascii=False)


# ── Tool schemas (Anthropic tool_use format — see OPENAI_TOOL_DEFINITIONS below
#    for the Groq/OpenAI translation of the same list) ─────────────────────────

TOOL_DEFINITIONS: list[dict] = [
    {
        "name": "get_dashboard_summary",
        "description": (
            "Returns a high-level snapshot: monthly income, actual income received, "
            "total spend this month, projected savings, savings rate, and budget health "
            "for each category. Call this first for general finance questions."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_category_breakdown",
        "description": (
            "Returns expense totals grouped by category for the current or a specific month. "
            "Use when asked about spending by category (food, rent, entertainment, etc.)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "month": {
                    "type": "string",
                    "description": "Month in YYYY-MM format. Omit for the latest month with transactions.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_monthly_spend_trend",
        "description": "Returns total expenses per month across all history. Use for trend questions ('am I spending more lately?').",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_income_vs_expense",
        "description": "Returns monthly income and expense side-by-side for all historical months. Use for savings rate trends and net cash-flow questions.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_budget_alerts",
        "description": (
            "Returns each budget category with the limit, amount spent, remaining, and status "
            "(safe / warning / overspent). Use when asked about budget health or overspending."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "month": {
                    "type": "string",
                    "description": "Month in YYYY-MM format. Omit for the latest month.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_top_merchants",
        "description": "Returns the top 5 merchants by spend this month. Use for questions about where money is going or impulse-spend patterns.",
        "input_schema": {
            "type": "object",
            "properties": {
                "month": {
                    "type": "string",
                    "description": "Month in YYYY-MM format. Omit for the latest month.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_recurring_transactions",
        "description": "Returns merchants that appear 2+ times or across 2+ months — subscriptions, EMIs, recurring bills. Use for subscription audits.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_salary_plan",
        "description": (
            "Returns the recommended 50/30/20-style allocation of the user's salary: "
            "essentials, debt EMIs, investments, emergency fund, and flexible spending. "
            "Use for salary planning and allocation questions."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_debt_strategy",
        "description": (
            "Returns the user's debt accounts ordered by interest rate (avalanche method), "
            "total outstanding balance, and monthly EMI total. "
            "Use for debt payoff and loan questions."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_investment_profile",
        "description": (
            "Returns the user's risk profile, monthly investment capacity, emergency fund "
            "target vs current, and readiness assessment. Use for investment and SIP questions."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]


# ── Tool executor ─────────────────────────────────────────────────────────────


def execute_tool(name: str, tool_input: dict, db: Database, user: User) -> str:
    """
    Dispatch a tool call by name, run the analytics query, return JSON string.
    Shared by both providers — only the schema wire format differs, not the executor.

    Returns a JSON error string on unknown tool names so the model can self-correct
    rather than raising an exception that kills the agentic loop.
    """
    month: str | None = tool_input.get("month")
    # Month is model-supplied and feeds a date-range filter, so reject anything
    # that is not YYYY-MM with an error the model can read and correct.
    if month is not None and not _MONTH_KEY.fullmatch(str(month)):
        return json.dumps({"error": f"Invalid month {month!r}: use YYYY-MM, or omit it for the latest month."})

    match name:
        case "get_dashboard_summary":
            return _dump(analytics.dashboard_summary(db, user))
        case "get_category_breakdown":
            return _dump(analytics.category_breakdown(db, user.id, month))
        case "get_monthly_spend_trend":
            return _dump(analytics.monthly_spend(db, user.id))
        case "get_income_vs_expense":
            return _dump(analytics.income_vs_expense(db, user.id))
        case "get_budget_alerts":
            return _dump(analytics.budget_alerts(db, user.id, month))
        case "get_top_merchants":
            return _dump(analytics.top_merchants(db, user.id, month_key=month))
        case "get_recurring_transactions":
            return _dump(analytics.recurring_transactions(db, user.id))
        case "get_salary_plan":
            return _dump(analytics.salary_plan(db, user))
        case "get_debt_strategy":
            return _dump(analytics.debt_strategy(db, user.id))
        case "get_investment_profile":
            return _dump(analytics.investment_profile_summary(db, user))
        case _:
            return json.dumps({"error": f"Unknown tool: {name}"})


# ── Groq / OpenAI function-calling schema ─────────────────────────────────────
# Groq speaks the OpenAI wire format, which nests the schema under "function"
# and calls the JSON Schema "parameters" instead of "input_schema".
# Derived from TOOL_DEFINITIONS so the two lists can never drift apart.


def _nullable_optionals(schema: dict) -> dict:
    """
    Widen every optional property to accept null.

    Groq validates tool arguments against the schema strictly and rejects the
    call outright when a model fills an omittable field with an explicit null —
    which these models routinely do for "month". Accepting null keeps the
    agentic loop alive; execute_tool already treats null and absent the same.
    """
    required = set(schema.get("required", []))
    properties = {}
    for name, prop in schema.get("properties", {}).items():
        prop_type = prop.get("type")
        if name not in required and isinstance(prop_type, str):
            prop = {**prop, "type": [prop_type, "null"]}
        properties[name] = prop
    return {**schema, "properties": properties}


OPENAI_TOOL_DEFINITIONS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": tool["name"],
            "description": tool["description"],
            "parameters": _nullable_optionals(tool["input_schema"]),
        },
    }
    for tool in TOOL_DEFINITIONS
]
