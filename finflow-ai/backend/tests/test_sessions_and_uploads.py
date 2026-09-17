"""
Server-side logout, upload size limit, and income self-healing on login.
"""

from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from pymongo.database import Database
from pymongo.errors import BulkWriteError

from app.core.limiter import limiter
from app.db import mongo
from app.models import User


def _login(client: TestClient, email: str = "test@example.com", password: str = "TestPass123!") -> dict:
    limiter.reset()
    token = client.post("/api/v1/auth/login", json={"email": email, "password": password}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestLogout:
    def test_token_is_rejected_after_logout(self, client: TestClient, user: User) -> None:
        headers = _login(client)
        assert client.get("/api/v1/auth/me", headers=headers).status_code == 200

        assert client.post("/api/v1/auth/logout", headers=headers).status_code == 204

        resp = client.get("/api/v1/auth/me", headers=headers)
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Session has been signed out"

    def test_logout_only_revokes_that_session(self, client: TestClient, user: User) -> None:
        phone = _login(client)
        laptop = _login(client)
        client.post("/api/v1/auth/logout", headers=phone)
        assert client.get("/api/v1/auth/me", headers=laptop).status_code == 200

    def test_logout_twice_is_harmless(self, client: TestClient, user: User) -> None:
        headers = _login(client)
        assert client.post("/api/v1/auth/logout", headers=headers).status_code == 204
        # Second call is already signed out, so it is rejected rather than erroring.
        assert client.post("/api/v1/auth/logout", headers=headers).status_code == 401

    def test_revocations_expire_with_the_token(self, client: TestClient, db: Database, user: User) -> None:
        headers = _login(client)
        client.post("/api/v1/auth/logout", headers=headers)
        entry = db[mongo.REVOKED_TOKENS].find_one()
        assert entry["expires_at"] is not None
        ttl = [ix for ix in db[mongo.REVOKED_TOKENS].list_indexes() if "expireAfterSeconds" in ix]
        assert ttl and ttl[0]["key"] == {"expires_at": 1}


def test_oversized_upload_is_rejected(client: TestClient, auth_headers: dict) -> None:
    big = "date,description,amount\n" + ("2026-06-01,Coffee,120\n" * 300_000)  # ≈ 6.9 MB
    resp = client.post("/api/v1/transactions/upload", headers=auth_headers, files={"file": ("big.csv", big, "text/csv")})
    assert resp.status_code == 413


class TestAtomicImport:
    def test_ids_are_reserved_as_one_consecutive_block(self, db: Database, user: User) -> None:
        rows = [{"user_id": user.id, "description": f"row {i}"} for i in range(5)]
        mongo.insert_many(db, mongo.TRANSACTIONS, rows)
        ids = sorted(doc["id"] for doc in db[mongo.TRANSACTIONS].find({"user_id": user.id}))
        assert ids == list(range(ids[0], ids[0] + 5))
        # The next insert continues after the block rather than reusing an id.
        assert mongo.insert(db, mongo.TRANSACTIONS, {"user_id": user.id, "description": "next"})["id"] == ids[-1] + 1

    def test_failed_batch_leaves_nothing_behind(self, db: Database, user: User) -> None:
        # Pre-occupy the id the fourth row will get: the unique index fails the
        # batch part-way, after three documents were already written.
        first = mongo.next_id(db, mongo.TRANSACTIONS) + 1
        db[mongo.TRANSACTIONS].insert_one({"id": first + 3, "user_id": -1, "description": "blocker"})

        rows = [{"user_id": user.id, "description": f"row {i}"} for i in range(6)]
        with pytest.raises(BulkWriteError):
            mongo.insert_many(db, mongo.TRANSACTIONS, rows)
        assert db[mongo.TRANSACTIONS].count_documents({"user_id": user.id}) == 0
        assert db[mongo.TRANSACTIONS].count_documents({"user_id": -1}) == 1


class TestIncomeOnLogin:
    def test_login_repairs_stale_income(self, client: TestClient, db: Database, user: User) -> None:
        # Rows saved but income never synced (e.g. the sync failed mid-import).
        mongo.insert(db, mongo.TRANSACTIONS, {
            "user_id": user.id, "transaction_date": date(2026, 6, 1), "description": "Salary", "merchant": None,
            "category": "Salary/Income", "amount": Decimal("72000"), "transaction_type": "income", "source": "csv",
        })
        _login(client)
        assert User.from_doc(db[mongo.USERS].find_one({"id": user.id})).monthly_income == Decimal("72000")

    def test_login_without_income_rows_keeps_stored_income(self, client: TestClient, db: Database, user: User) -> None:
        _login(client)
        assert User.from_doc(db[mongo.USERS].find_one({"id": user.id})).monthly_income == Decimal("100000")
