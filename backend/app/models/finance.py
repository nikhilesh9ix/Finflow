from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    monthly_income: Mapped[float] = mapped_column(Float, default=0)
    risk_profile: Mapped[str] = mapped_column(String(40), default="balanced")
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    budgets: Mapped[list["Budget"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    debts: Mapped[list["Debt"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    investment_profile: Mapped["InvestmentProfile | None"] = relationship(back_populates="user", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    posted_at: Mapped[date] = mapped_column(Date)
    description: Mapped[str] = mapped_column(String(255))
    merchant: Mapped[str] = mapped_column(String(120), default="")
    category: Mapped[str] = mapped_column(String(80), index=True)
    amount: Mapped[float] = mapped_column(Float)
    transaction_type: Mapped[str] = mapped_column(String(20), default="expense")
    source: Mapped[str] = mapped_column(String(40), default="seed")

    user: Mapped[User] = relationship(back_populates="transactions")


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    category: Mapped[str] = mapped_column(String(80), index=True)
    monthly_limit: Mapped[float] = mapped_column(Float)
    priority: Mapped[str] = mapped_column(String(20), default="normal")

    user: Mapped[User] = relationship(back_populates="budgets")


class Debt(Base):
    __tablename__ = "debts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    lender: Mapped[str] = mapped_column(String(120))
    debt_type: Mapped[str] = mapped_column(String(80))
    outstanding_amount: Mapped[float] = mapped_column(Float)
    interest_rate: Mapped[float] = mapped_column(Float)
    emi_amount: Mapped[float] = mapped_column(Float)
    due_day: Mapped[int] = mapped_column(Integer)

    user: Mapped[User] = relationship(back_populates="debts")


class InvestmentProfile(Base):
    __tablename__ = "investment_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    emergency_fund_target: Mapped[float] = mapped_column(Float)
    current_emergency_fund: Mapped[float] = mapped_column(Float)
    monthly_sip: Mapped[float] = mapped_column(Float)
    notes: Mapped[str] = mapped_column(Text, default="")
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    goal_horizon_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_tolerance: Mapped[str | None] = mapped_column(String(40), nullable=True)
    emergency_fund_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    recommendation_json: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped[User] = relationship(back_populates="investment_profile")


class FinancialChat(Base):
    __tablename__ = "financial_chats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(String(40), default="deterministic")
    context_json: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped[User] = relationship()
