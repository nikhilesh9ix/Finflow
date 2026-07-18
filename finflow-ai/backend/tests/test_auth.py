"""
Auth flow integration tests.

Covers: register, login, duplicate email, wrong password, /me endpoint,
token required, Decimal income field.
"""

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User


class TestRegister:
    def test_register_creates_user(self, client: TestClient, db: Session) -> None:
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "email": "new@example.com",
                "full_name": "New User",
                "password": "SecurePass1!",
                "monthly_income": "75000.00",
            },
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["email"] == "new@example.com"
        assert body["full_name"] == "New User"
        assert "hashed_password" not in body

    def test_register_stores_income_as_decimal(self, client: TestClient, db: Session) -> None:
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "email": "income@example.com",
                "full_name": "Income User",
                "password": "SecurePass1!",
                "monthly_income": "50000.50",
            },
        )
        assert resp.status_code == 201
        u = db.query(User).filter_by(email="income@example.com").one()
        assert u.monthly_income == Decimal("50000.50")

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

    def test_register_creates_investment_profile(self, client: TestClient, db: Session) -> None:
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "email": "profile@example.com",
                "full_name": "Profile User",
                "password": "SecurePass1!",
                "monthly_income": "60000",
            },
        )
        assert resp.status_code == 201
        u = db.query(User).filter_by(email="profile@example.com").one()
        assert u.investment_profile is not None
        # emergency_fund_target = income * 3
        assert u.investment_profile.emergency_fund_target == Decimal("180000")


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
