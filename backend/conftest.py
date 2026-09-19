"""
Shared fixtures for all tests.

Tests run against a real MongoDB, because the analytics layer *is* aggregation
pipelines — a mock would test the mock. Isolation:
  - The whole run uses one throwaway database, finflow_test_<random>, which is
    dropped at the end. The app's own database is never touched.
  - Every collection is emptied after each test, so tests cannot leak state.

Requires MongoDB on MONGODB_URL (default mongodb://localhost:27017).
"""

import os
import uuid
from decimal import Decimal

# Must be set before app modules import settings, so the app and the tests
# resolve the same throwaway database name.
os.environ["MONGODB_DB"] = f"finflow_test_{uuid.uuid4().hex[:12]}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from pymongo.database import Database  # noqa: E402
from pymongo.errors import PyMongoError  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.security import create_access_token, get_password_hash  # noqa: E402
from app.db import mongo  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402

assert settings.mongodb_db.startswith("finflow_test_"), "refusing to run tests against a non-test database"


@pytest.fixture(scope="session")
def test_database() -> Database:
    try:
        mongo.get_client().admin.command("ping")
    except PyMongoError as exc:
        pytest.exit(f"MongoDB is not reachable at {settings.mongodb_url} — start the MongoDB service. ({exc})", 2)

    database = mongo.get_database()
    mongo.ensure_indexes(database)
    yield database
    mongo.get_client().drop_database(settings.mongodb_db)


@pytest.fixture()
def db(test_database: Database) -> Database:
    """Each test starts from empty collections (indexes are kept)."""
    yield test_database
    for name in test_database.list_collection_names():
        test_database[name].delete_many({})


@pytest.fixture()
def client(db: Database) -> TestClient:
    # Deliberately not `with TestClient(...)`: that runs the app lifespan, whose
    # shutdown closes the shared MongoClient and would break every later test.
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture()
def user(db: Database) -> User:
    """A stored test user with an investment profile."""
    doc = mongo.insert(
        db,
        mongo.USERS,
        {
            "email": "test@example.com",
            "full_name": "Test User",
            "hashed_password": get_password_hash("TestPass123!"),
            "monthly_income": Decimal("100000"),
            "currency": "INR",
        },
    )
    mongo.insert(
        db,
        mongo.INVESTMENT_PROFILES,
        {
            "user_id": doc["id"],
            "risk_profile": "balanced",
            "monthly_investment_capacity": Decimal("15000"),
            "emergency_fund_target": Decimal("300000"),
            "emergency_fund_current": Decimal("50000"),
            "notes": None,
        },
    )
    return User.model_validate(doc)


@pytest.fixture()
def auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(user.email)
    return {"Authorization": f"Bearer {token}"}
