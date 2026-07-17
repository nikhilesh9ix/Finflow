from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin


class Transaction(TimestampMixin, Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    merchant: Mapped[str | None] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    source: Mapped[str] = mapped_column(String(40), default="manual", nullable=False)

    user = relationship("User", back_populates="transactions")


class Budget(TimestampMixin, Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    monthly_limit: Mapped[float] = mapped_column(Float, nullable=False)
    priority: Mapped[str] = mapped_column(String(30), default="normal", nullable=False)

    user = relationship("User", back_populates="budgets")


class SavingsGoal(TimestampMixin, Base):
    __tablename__ = "savings_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    target_amount: Mapped[float] = mapped_column(Float, nullable=False)
    current_amount: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    target_date: Mapped[date | None] = mapped_column(Date)

    user = relationship("User", back_populates="savings_goals")


class DebtAccount(TimestampMixin, Base):
    __tablename__ = "debt_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    lender: Mapped[str] = mapped_column(String(120), nullable=False)
    debt_type: Mapped[str] = mapped_column(String(80), nullable=False)
    outstanding_amount: Mapped[float] = mapped_column(Float, nullable=False)
    interest_rate: Mapped[float] = mapped_column(Float, nullable=False)
    emi_amount: Mapped[float] = mapped_column(Float, nullable=False)
    due_day: Mapped[int] = mapped_column(Integer, nullable=False)

    user = relationship("User", back_populates="debt_accounts")


class InvestmentProfile(TimestampMixin, Base):
    __tablename__ = "investment_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True, nullable=False)
    risk_profile: Mapped[str] = mapped_column(String(40), default="balanced", nullable=False)
    monthly_investment_capacity: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    emergency_fund_target: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    emergency_fund_current: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    user = relationship("User", back_populates="investment_profile")


class ChatHistory(TimestampMixin, Base):
    __tablename__ = "chat_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    user = relationship("User", back_populates="chat_history")
