"""
Agent loop tests for both copilot providers.

The real APIs are replaced by scripted fake clients, so these run offline and
exercise the loop logic: tool execution, the forced final answer after the tool
budget, truncation, refusals, and the exact request parameters sent.
"""

import json
from datetime import date
from decimal import Decimal
from types import SimpleNamespace as NS

from pymongo.database import Database

from app.ai import copilot
from app.db import mongo
from app.models import User


class _Recorder:
    """Returns scripted responses in order and records every request's kwargs."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls: list[dict] = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return self.responses.pop(0)


def _seed(db: Database, user: User) -> None:
    mongo.insert(db, mongo.TRANSACTIONS, {
        "user_id": user.id, "transaction_date": date(2026, 6, 1), "description": "Salary", "merchant": None,
        "category": "Salary/Income", "amount": Decimal("80000"), "transaction_type": "income", "source": "csv",
    })


# ── Anthropic ─────────────────────────────────────────────────────────────────


def _claude(stop_reason, *blocks):
    return NS(stop_reason=stop_reason, content=list(blocks))


def _text(t):
    return NS(type="text", text=t)


def _tool(name, tool_id="t1", **inp):
    return NS(type="tool_use", id=tool_id, name=name, input=inp)


def _anthropic_client(*responses):
    rec = _Recorder(responses)
    return NS(beta=NS(messages=rec)), rec


class TestAnthropicLoop:
    def test_executes_tool_then_returns_answer(self, db: Database, user: User) -> None:
        _seed(db, user)
        client, rec = _anthropic_client(
            _claude("tool_use", _tool("get_dashboard_summary")),
            _claude("end_turn", _text("Your income is ₹80,000.")),
        )
        messages = [{"role": "user", "content": "How much do I earn?"}]
        answer = copilot._run_agentic_loop(client, messages, db, user)

        assert answer == "Your income is ₹80,000."
        # The tool result was sent back in one user message, referencing the call id.
        tool_msg = rec.calls[1]["messages"][-1]
        assert tool_msg["role"] == "user"
        assert tool_msg["content"][0]["tool_use_id"] == "t1"
        assert json.loads(tool_msg["content"][0]["content"])["actual_income"] == 80000.0

    def test_request_uses_current_model_fallbacks_and_room_to_think(self, db: Database, user: User) -> None:
        client, rec = _anthropic_client(_claude("end_turn", _text("ok")))
        copilot._run_agentic_loop(client, [{"role": "user", "content": "hi"}], db, user)
        call = rec.calls[0]
        assert call["model"] == "claude-opus-5"
        assert call["max_tokens"] >= 16000
        assert call["betas"] == ["server-side-fallback-2026-06-01"]
        assert call["fallbacks"] == [{"model": "claude-opus-4-8"}]
        assert call["tool_choice"] == {"type": "auto"}

    def test_forces_an_answer_after_the_tool_budget(self, db: Database, user: User) -> None:
        tool_rounds = [_claude("tool_use", _tool("get_budget_alerts", tool_id=f"t{i}")) for i in range(copilot._MAX_TOOL_ROUNDS)]
        client, rec = _anthropic_client(*tool_rounds, _claude("end_turn", _text("Here is what I found.")))
        answer = copilot._run_agentic_loop(client, [{"role": "user", "content": "everything"}], db, user)

        assert answer == "Here is what I found."
        assert rec.calls[-1]["tool_choice"] == {"type": "none"}
        assert all(c["tool_choice"] == {"type": "auto"} for c in rec.calls[:-1])

    def test_truncated_answer_is_marked(self, db: Database, user: User) -> None:
        client, _ = _anthropic_client(_claude("max_tokens", _text("Your top spend is")))
        answer = copilot._run_agentic_loop(client, [{"role": "user", "content": "x"}], db, user)
        assert answer.startswith("Your top spend is")
        assert "shortened" in answer

    def test_refusal_returns_a_polite_message(self, db: Database, user: User) -> None:
        client, _ = _anthropic_client(_claude("refusal"))
        answer = copilot._run_agentic_loop(client, [{"role": "user", "content": "x"}], db, user)
        assert "can't help" in answer

    def test_thinking_blocks_are_passed_back_unchanged(self, db: Database, user: User) -> None:
        thinking = NS(type="thinking", thinking="", signature="sig")
        client, rec = _anthropic_client(
            _claude("tool_use", thinking, _tool("get_salary_plan")),
            _claude("end_turn", _text("done")),
        )
        copilot._run_agentic_loop(client, [{"role": "user", "content": "plan"}], db, user)
        assistant_turn = rec.calls[1]["messages"][-2]
        assert assistant_turn["role"] == "assistant"
        assert assistant_turn["content"][0] is thinking


# ── Groq ──────────────────────────────────────────────────────────────────────


def _groq(content=None, tool_calls=None, finish_reason="stop"):
    return NS(choices=[NS(message=NS(content=content, tool_calls=tool_calls), finish_reason=finish_reason)])


def _groq_tool(name, call_id="c1", args="{}"):
    return NS(id=call_id, function=NS(name=name, arguments=args))


def _groq_client(*responses):
    rec = _Recorder(responses)
    return NS(chat=NS(completions=rec)), rec


class TestGroqLoop:
    def test_forces_an_answer_after_the_tool_budget(self, db: Database, user: User) -> None:
        tool_rounds = [
            _groq(tool_calls=[_groq_tool("get_budget_alerts", call_id=f"c{i}")], finish_reason="tool_calls")
            for i in range(copilot._MAX_TOOL_ROUNDS)
        ]
        client, rec = _groq_client(*tool_rounds, _groq(content="Summary of everything."))
        answer = copilot._run_groq_loop(client, [{"role": "user", "content": "everything"}], db, user)

        assert answer == "Summary of everything."
        final = rec.calls[-1]
        # Groq rejects tool_choice="none" when the model still calls a tool, so the
        # final request must carry no tools and restate the gathered results.
        assert "tools" not in final and "tool_choice" not in final
        assert "get_budget_alerts:" in final["messages"][-1]["content"]
        assert all(m.get("role") != "tool" for m in final["messages"])
        # The main prompt's "always call a tool" rule is replaced on this round.
        assert "Always call the appropriate tool" not in final["messages"][0]["content"]
        assert rec.calls[0]["max_tokens"] >= 1500

    def test_empty_final_answer_is_retried_once(self, db: Database, user: User) -> None:
        tool_rounds = [
            _groq(tool_calls=[_groq_tool("get_budget_alerts", call_id=f"c{i}")], finish_reason="tool_calls")
            for i in range(copilot._MAX_TOOL_ROUNDS)
        ]
        client, rec = _groq_client(*tool_rounds, _groq(content=""), _groq(content="Second try."))
        answer = copilot._run_groq_loop(client, [{"role": "user", "content": "everything"}], db, user)
        assert answer == "Second try."
        assert [c.get("reasoning_effort") for c in rec.calls[-2:]] == ["medium", "low"]

    def test_length_cut_off_is_marked(self, db: Database, user: User) -> None:
        client, _ = _groq_client(_groq(content="Partial", finish_reason="length"))
        answer = copilot._run_groq_loop(client, [{"role": "user", "content": "x"}], db, user)
        assert answer.startswith("Partial") and "shortened" in answer

    def test_empty_answer_gets_a_helpful_message(self, db: Database, user: User) -> None:
        client, _ = _groq_client(_groq(content=None, finish_reason="length"))
        answer = copilot._run_groq_loop(client, [{"role": "user", "content": "x"}], db, user)
        assert answer == copilot._NO_ANSWER
