from __future__ import annotations

import json
from typing import Any
from urllib import error, request

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.finance import Budget, Debt, FinancialChat, InvestmentProfile, Transaction, User
from app.services.finance import debt_audit, debt_strategy, dashboard_summary, investment_suggestions, salary_plan


STARTER_PROMPTS = [
    "Where did most of my money go this month?",
    "Can I afford a new EMI?",
    "Should I save this month or pay debt first?",
    "What subscriptions are draining money?",
    "Why is my savings rate low?",
]

HARMFUL_KEYWORDS = {
    "hide money",
    "launder",
    "money laundering",
    "fake receipt",
    "evade tax",
    "tax evasion",
    "fraud",
    "forgery",
    "embezzle",
}


def _top_spend_categories(summary: dict[str, Any]) -> list[dict[str, Any]]:
    items = sorted(summary.get("category_spend", []), key=lambda item: item["amount"], reverse=True)
    return items[:4]


def _has_financial_data(db: Session, user: User) -> bool:
    return any(
        db.query(model.id).filter(model.user_id == user.id).first() is not None
        for model in (Transaction, Budget, Debt, InvestmentProfile)
    )


def _harmful_request(question: str) -> bool:
    text = question.lower()
    return any(keyword in text for keyword in HARMFUL_KEYWORDS)


def build_context(db: Session, user: User) -> dict[str, Any]:
    summary = dashboard_summary(db, user)
    debts = debt_strategy(db, user)
    salary = salary_plan(
        db,
        user,
        payload=None,
    )
    investment = investment_suggestions(db, user)
    debt_audit_result = debt_audit(db, user)
    return {
        "summary": summary,
        "debts": debts,
        "salary": salary,
        "investment": investment,
        "debt_audit": debt_audit_result,
        "top_spend_categories": _top_spend_categories(summary),
    }


def build_facts(context: dict[str, Any]) -> list[dict[str, str]]:
    summary = context["summary"]
    debts = context["debts"]
    salary = context["salary"]
    debt_audit_result = context["debt_audit"]
    facts = [
        {
            "label": "Income",
            "value": f"INR {summary['monthly_income']:,.0f}",
            "detail": f"Projected monthly spend is INR {summary['monthly_spend']:,.0f}.",
        },
        {
            "label": "Savings rate",
            "value": f"{summary['savings_rate']:.1f}%",
            "detail": f"Based on current month spending and your income.",
        },
        {
            "label": "Debt-to-income",
            "value": f"{debt_audit_result['debt_to_income_ratio']:.1f}%",
            "detail": f"Monthly debt payments are INR {debt_audit_result['monthly_debt_payment']:,.0f}.",
        },
        {
            "label": "Salary safe spend",
            "value": f"INR {next((item['amount'] for item in salary['allocations'] if item['bucket'] == 'Discretionary spending'), 0):,.0f}",
            "detail": "This is the left-over amount after fixed bills, debt, emergency savings, and investments.",
        },
        {
            "label": "Active debts",
            "value": str(len(debts.get("priority", []))),
            "detail": "Avalanche order sorts balances by highest interest first.",
        },
    ]
    if context["top_spend_categories"]:
        top = context["top_spend_categories"][0]
        facts.append(
            {
                "label": "Top spending category",
                "value": top["category"],
                "detail": f"Spent INR {top['amount']:,.0f} this month in the highest category.",
            }
        )
    return facts


def compose_prompt(question: str, context: dict[str, Any]) -> str:
    payload = {
        "question": question,
        "facts": build_facts(context),
        "summary": context["summary"],
        "debts": context["debts"],
        "salary": context["salary"],
        "investment": context["investment"],
        "debt_audit": context["debt_audit"],
    }
    return (
        "You are a financial copilot for a personal finance app. "
        "Use only the provided facts. Never invent balances, rates, or transactions. "
        "Clearly separate computed facts from advice. Keep the answer concise, calm, and practical.\n\n"
        f"Context JSON:\n{json.dumps(payload, ensure_ascii=True, default=str)}"
    )


def _openai_answer(prompt: str) -> str | None:
    settings = get_settings()
    if not settings.openai_api_key:
        return None
    body = json.dumps(
        {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "Return a short, factual financial explanation."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
    ).encode("utf-8")
    req = request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


def _gemini_answer(prompt: str) -> str | None:
    settings = get_settings()
    if not settings.gemini_api_key:
        return None
    body = json.dumps(
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 256},
        }
    ).encode("utf-8")
    req = request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        return None


def _fallback_answer(question: str, context: dict[str, Any]) -> str:
    text = question.lower()
    summary = context["summary"]
    debt_audit_result = context["debt_audit"]
    salary = context["salary"]
    investment = context["investment"]
    top_spend = context["top_spend_categories"]
    if any(word in text for word in ["where", "money", "spending", "go"]):
        if top_spend:
            top = top_spend[0]
            return f"Computed fact: most spending went to {top['category']} at INR {top['amount']:,.0f}. Suggested action: cap that category before cutting essentials."
        return "Computed fact: there is not enough category data yet to rank spending. Add transactions or budgets for a clearer view."
    if any(word in text for word in ["emi", "debt", "loan"]):
        return (
            f"Computed fact: your debt-to-income ratio is {debt_audit_result['debt_to_income_ratio']:.1f}% and monthly debt payments are INR {debt_audit_result['monthly_debt_payment']:,.0f}. "
            f"Safe action: follow the avalanche order and avoid a new EMI if the ratio stays above 40%."
        )
    if any(word in text for word in ["save", "debt first", "pay debt"]):
        return (
            f"Computed fact: the salary plan leaves INR {next((item['amount'] for item in salary['allocations'] if item['bucket'] == 'Discretionary spending'), 0):,.0f} for discretionary use. "
            "If debt pressure is high, route that leftover to the highest-interest balance first; otherwise, split between emergency savings and debt."
        )
    if any(word in text for word in ["subscription", "draining"]):
        leaks = [item for item in debt_audit_result["wealth_leaks"] if "subscription" in item["title"].lower()]
        if leaks:
            return f"Computed fact: {len(leaks)} subscription-related leak(s) were detected. The cleanest move is to cancel inactive services and move the saved amount to emergency savings."
        return "No subscription leak was detected from the available data. If you add more transaction history, the detector becomes more useful."
    if any(word in text for word in ["savings rate", "low"]):
        return (
            f"Computed fact: your current savings rate is {summary['savings_rate']:.1f}%. "
            "Common fixes are lower recurring subscriptions, higher automatic transfers on salary day, and a tighter discretionary cap."
        )
    if any(word in text for word in ["invest", "sip", "wealth"]):
        return f"Computed fact: the current investment plan suggests about INR {investment.get('monthly_capacity', 0):,.0f} of monthly capacity. Focus on emergency readiness before raising equity exposure."
    return (
        f"Computed fact: monthly savings rate is {summary['savings_rate']:.1f}% and debt-to-income is {debt_audit_result['debt_to_income_ratio']:.1f}%. "
        "Start by protecting bills, then prioritize debt or savings depending on the higher-risk bucket."
    )


def answer_question(db: Session, user: User, question: str) -> dict[str, Any]:
    if _harmful_request(question):
        answer = "I can't help with hiding money, fraud, tax evasion, or other harmful activity. I can help with budgeting, debt repayment, savings, or safe planning instead."
        record = FinancialChat(
            user_id=user.id,
            question=question,
            answer=answer,
            provider="guardrail",
            context_json=json.dumps({"guardrail": "harmful_request"}, ensure_ascii=True),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return {
            "answer": answer,
            "provider": "guardrail",
            "facts": [],
            "starter_prompts": STARTER_PROMPTS,
            "history_id": record.id,
        }

    if not _has_financial_data(db, user):
        answer = "I do not have enough user financial data yet to answer that safely. Add transactions, budgets, debts, or a salary plan and I can give a grounded response."
        record = FinancialChat(
            user_id=user.id,
            question=question,
            answer=answer,
            provider="no-data",
            context_json=json.dumps({"reason": "no_user_financial_data"}, ensure_ascii=True),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return {
            "answer": answer,
            "provider": "no-data",
            "facts": [],
            "starter_prompts": STARTER_PROMPTS,
            "history_id": record.id,
        }

    context = build_context(db, user)
    prompt = compose_prompt(question, context)
    provider = "deterministic"
    answer = _openai_answer(prompt)
    if answer:
        provider = "openai"
    else:
        answer = _gemini_answer(prompt)
        if answer:
            provider = "gemini"
        else:
            answer = _fallback_answer(question, context)
    record = FinancialChat(
        user_id=user.id,
        question=question,
        answer=answer,
        provider=provider,
        context_json=json.dumps(context, ensure_ascii=True, default=str),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {
        "answer": answer,
        "provider": provider,
        "facts": build_facts(context),
        "starter_prompts": STARTER_PROMPTS,
        "history_id": record.id,
    }


def recent_history(db: Session, user: User, limit: int = 10) -> list[dict[str, Any]]:
    rows = (
        db.query(FinancialChat)
        .filter(FinancialChat.user_id == user.id)
        .order_by(FinancialChat.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "question": row.question,
            "answer": row.answer,
            "created_at": row.created_at,
        }
        for row in rows
    ]