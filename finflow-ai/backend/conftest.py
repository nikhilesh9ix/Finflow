"""
Shared fixtures for all tests.

Uses an in-memory SQLite database so tests are:
  - Isolated (each session fixture rolls back via transaction)
  - Fast (no disk I/O)
  - Reproducible (no shared state between test functions)
"""

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import InvestmentProfile, User
from app.core.security import get_password_hash, create_access_token

TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="session")
def engine():
    _engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=_engine)
    yield _engine
    _engine.dispose()


@pytest.fixture()
def db(engine) -> Session:
    """Each test gets a rolled-back transaction — no state leaks between tests."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db: Session) -> TestClient:
    """TestClient with DB dependency overridden to use the test session."""

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def user(db: Session) -> User:
    """A committed test user with investment profile."""
    u = User(
        email="test@example.com",
        full_name="Test User",
        hashed_password=get_password_hash("TestPass123!"),
        monthly_income=Decimal("100000"),
        currency="INR",
    )
    db.add(u)
    db.flush()
    db.add(
        InvestmentProfile(
            user_id=u.id,
            risk_profile="balanced",
            monthly_investment_capacity=Decimal("15000"),
            emergency_fund_target=Decimal("300000"),
            emergency_fund_current=Decimal("50000"),
        )
    )
    db.flush()
    return u


@pytest.fixture()
def auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(user.email)
    return {"Authorization": f"Bearer {token}"}
