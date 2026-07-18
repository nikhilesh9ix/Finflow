from decimal import Decimal

from sqlalchemy import Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin

_MONEY = Numeric(precision=15, scale=2)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    monthly_income: Mapped[Decimal] = mapped_column(_MONEY, default=Decimal("0"), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)

    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    savings_goals = relationship("SavingsGoal", back_populates="user", cascade="all, delete-orphan")
    debt_accounts = relationship("DebtAccount", back_populates="user", cascade="all, delete-orphan")
    investment_profile = relationship("InvestmentProfile", back_populates="user", cascade="all, delete-orphan", uselist=False)
    chat_history = relationship("ChatHistory", back_populates="user", cascade="all, delete-orphan")
