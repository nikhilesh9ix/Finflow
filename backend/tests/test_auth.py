"""
Auth flow integration tests.

Covers: register, login, duplicate email, wrong password, /me endpoint,
token required, and income being left for CSV import to fill in.
"""

from decimal import Decimal

from fastapi.testclient import TestClient
from pymongo.database import Database

from app.db import mongo
from app.models import InvestmentProfile, User


def _user(db: Database, email: str) -> User:
    return User.from_doc(db[mongo.USERS].find_one({"email": email}))


class TestRegister:
    def test_register_creates_user(self, client: TestClient, db: Database) -> None:
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "email": "new@example.com",
                "full_name": "New User",
                "password": "SecurePass1!",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["email"] == "new@example.com"
        assert body["full_name"] == "New User"
        assert "hashed_password" not in body

    def test_register_starts_with_zero_income(self, client: TestClient, db: Database) -> None:
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "email": "income@example.com",
                "full_name": "Income User",
                "password": "SecurePass1!",
            },
        )
        assert resp.status_code == 201
        assert _user(db, "income@example.com").monthly_income == Decimal("0")

    def test_register_ignores_client_supplied_income(self, client: TestClient, db: Database) -> None:
        # Income is derived from statements; a value sent at sign-up must not stick.
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "email": "sneaky@example.com",
                "full_name": "Sneaky User",
                "password": "SecurePass1!",
                "monthly_income": "999999",
            },
        )
        assert resp.status_code == 201
        assert _user(db, "sneaky@example.com").monthly_income == Decimal("0")

    def test_register_duplicate_email_returns_409(self, client: TestClient, user: User) -> None:
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "email": user.email,
                "full_name": "Duplicate",
                "password": "SecurePass1!",
            },
        )
        assert resp.status_code == 409
        assert "already registered" in resp.json()["detail"].lower()

    def test_register_invalid_email_returns_422(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "full_name": "Bad Email",
                "password": "SecurePass1!",
            },
        )
        assert resp.status_code == 422

    def test_register_creates_investment_profile(self, client: TestClient, db: Database) -> None:
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "email": "profile@example.com",
                "full_name": "Profile User",
                "password": "SecurePass1!",
            },
        )
        assert resp.status_code == 201
        u = _user(db, "profile@example.com")
        profile = InvestmentProfile.from_doc(db[mongo.INVESTMENT_PROFILES].find_one({"user_id": u.id}))
        assert profile is not None
        # No income known yet, so the target waits for the first import.
        assert profile.emergency_fund_target == Decimal("0")


class TestLogin:
    def test_login_returns_access_token(self, client: TestClient, user: User) -> None:
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "TestPass123!"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"
        assert len(body["access_token"]) > 20

    def test_login_wrong_password_returns_401(self, client: TestClient, user: User) -> None:
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "WrongPassword"},
        )
        assert resp.status_code == 401

    def test_login_unknown_email_returns_401(self, client: TestClient) -> None:
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "anything"},
        )
        assert resp.status_code == 401

    def test_login_case_sensitive_email(self, client: TestClient, user: User) -> None:
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": user.email.upper(), "password": "TestPass123!"},
        )
        # Email lookup is case-sensitive in our model; uppercase should 401.
        assert resp.status_code == 401


class TestGetMe:
    def test_me_returns_current_user(self, client: TestClient, user: User, auth_headers: dict) -> None:
        resp = client.get("/api/v1/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["email"] == user.email
        assert body["full_name"] == user.full_name

    def test_me_without_token_returns_401(self, client: TestClient) -> None:
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_me_with_malformed_token_returns_401(self, client: TestClient) -> None:
        resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.token"})
        assert resp.status_code == 401
