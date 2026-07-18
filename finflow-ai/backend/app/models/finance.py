from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin

# Precision: 15 significant digits, 2 decimal places.
# Covers amounts up to ₹9,999,999,999,999.99 — sufficient for any retail user.
_MONEY = Numeric(precision=15, scale=2)


class Transaction(TimestampMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        # Hot path: list user transactions sorted by date
        Index("ix_transactions_user_date", "user_id", "transaction_date"),
        # Hot path: category analytics per user per month
        Index("ix_transactions_user_category", "user_id", "category"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    merchant: Mapped[str | None] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    amount: Mapped[Decimal] = mapped_column(_MONEY, nullable=False)
    # Constrained to valid values — prevents silent corruption from typos.
    transaction_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="income | expense | transfer",
    )
    source: Mapped[str] = mapped_column(String(40), default="manual", nullable=False)

    user = relationship("User", back_populates="transactions")


class Budget(TimestampMixin, Base):
    __tablename__ = "budgets"
    __table_args__ = (Index("ix_budgets_user_category", "user_id", "category"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    monthly_limit: Mapped[Decimal] = mapped_column(_MONEY, nullable=False)
    priority: Mapped[str] = mapped_column(String(30), default="normal", nullable=False)

    user = relationship("User", back_populates="budgets")


class SavingsGoal(TimestampMixin, Base):
    __tablename__ = "savings_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    target_amount: Mapped[Decimal] = mapped_column(_MONEY, nullable=False)
    current_amount: Mapped[Decimal] = mapped_column(_MONEY, default=Decimal("0"), nullable=False)
    target_date: Mapped[date | None] = mapped_column(Date)

    user = relationship("User", back_populates="savings_goals")


class DebtAccount(TimestampMixin, Base):
    __tablename__ = "debt_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    lender: Mapped[str] = mapped_column(String(120), nullable=False)
    debt_type: Mapped[str] = mapped_column(String(80), nullable=False)
    outstanding_amount: Mapped[Decimal] = mapped_column(_MONEY, nullable=False)
    interest_rate: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False)
    emi_amount: Mapped[Decimal] = mapped_column(_MONEY, nullable=False)
    due_day: Mapped[int] = mapped_column(Integer, nullable=False)

    user = relationship("User", back_populates="debt_accounts")


class InvestmentProfile(TimestampMixin, Base):
    __tablename__ = "investment_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True, nullable=False)
    risk_profile: Mapped[str] = mapped_column(String(40), default="balanced", nullable=False)
    monthly_investment_capacity: Mapped[Decimal] = mapped_column(_MONEY, default=Decimal("0"), nullable=False)
    emergency_fund_target: Mapped[Decimal] = mapped_column(_MONEY, default=Decimal("0"), nullable=False)
    emergency_fund_current: Mapped[Decimal] = mapped_column(_MONEY, default=Decimal("0"), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    user = relationship("User", back_populates="investment_profile")


class ChatHistory(TimestampMixin, Base):
    __tablename__ = "chat_history"
    __table_args__ = (Index("ix_chat_history_user_created", "user_id", "created_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    user = relationship("User", back_populates="chat_history")
