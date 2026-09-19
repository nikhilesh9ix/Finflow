"""
MongoDB access layer.

Design notes:
  - Money is stored as BSON Decimal128 and read back as Python Decimal via a
    codec, so no monetary value ever passes through a float.
  - Documents keep integer ``id`` fields from a counters collection. The API and
    frontend address records as /budgets/12, so ObjectIds would break that contract.
  - BSON has no date-only type: date fields are stored as midnight-UTC datetimes
    and converted back to ``date`` on read (see DATE_FIELDS).
  - The server is standalone (no replica set), so multi-document transactions are
    unavailable; writes are ordered so a partial failure leaves consistent data.
"""

from datetime import UTC, date, datetime, time
from decimal import Decimal
from functools import lru_cache
from typing import Any

from bson.codec_options import CodecOptions, TypeCodec, TypeRegistry
from bson.decimal128 import Decimal128
from pymongo import ASCENDING, DESCENDING, MongoClient, ReturnDocument
from pymongo.database import Database

from app.core.config import settings


class DecimalCodec(TypeCodec):
    python_type = Decimal
    bson_type = Decimal128

    def transform_python(self, value: Decimal) -> Decimal128:
        return Decimal128(value)

    def transform_bson(self, value: Decimal128) -> Decimal:
        return value.to_decimal()


CODEC_OPTIONS: CodecOptions = CodecOptions(
    type_registry=TypeRegistry([DecimalCodec()]),
    tz_aware=True,
    tzinfo=UTC,
)

# Collection names — one place, so a typo cannot silently create a new collection.
USERS = "users"
TRANSACTIONS = "transactions"
BUDGETS = "budgets"
SAVINGS_GOALS = "savings_goals"
DEBT_ACCOUNTS = "debt_accounts"
INVESTMENT_PROFILES = "investment_profiles"
CHAT_HISTORY = "chat_history"
COUNTERS = "counters"
REVOKED_TOKENS = "revoked_tokens"

ALL_COLLECTIONS = (USERS, TRANSACTIONS, BUDGETS, SAVINGS_GOALS, DEBT_ACCOUNTS, INVESTMENT_PROFILES, CHAT_HISTORY)

# Fields that are calendar dates rather than instants.
DATE_FIELDS = frozenset({"transaction_date", "target_date"})


@lru_cache
def get_client() -> MongoClient:
    return MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=5000)


def get_database(name: str | None = None) -> Database:
    return get_client().get_database(name or settings.mongodb_db, codec_options=CODEC_OPTIONS)


def get_db() -> Database:
    """FastAPI dependency. The client is pooled, so this is cheap per request."""
    return get_database()


# ── document conversion ──────────────────────────────────────────────────────


def to_mongo(data: dict[str, Any]) -> dict[str, Any]:
    """Prepare a Python dict for storage: date → midnight-UTC datetime."""
    out: dict[str, Any] = {}
    for key, value in data.items():
        if isinstance(value, date) and not isinstance(value, datetime):
            value = datetime.combine(value, time.min, tzinfo=UTC)
        out[key] = value
    return out


def from_mongo(doc: dict[str, Any]) -> dict[str, Any]:
    """Turn a stored document back into plain fields: drop _id, restore dates."""
    out = {key: value for key, value in doc.items() if key != "_id"}
    for key in DATE_FIELDS & out.keys():
        if isinstance(out[key], datetime):
            out[key] = out[key].date()
    return out


def month_bounds(month_key: str) -> tuple[datetime, datetime]:
    """'2026-06' → [2026-06-01, 2026-07-01) as UTC datetimes, for index-friendly range filters."""
    try:
        year, month = (int(part) for part in month_key.split("-"))
        start = datetime(year, month, 1, tzinfo=UTC)
    except (ValueError, TypeError) as exc:
        raise ValueError(f"month_key must be YYYY-MM, got {month_key!r}") from exc
    end = datetime(year + 1, 1, 1, tzinfo=UTC) if month == 12 else datetime(year, month + 1, 1, tzinfo=UTC)
    return start, end


# ── writes ────────────────────────────────────────────────────────────────────


def next_id(db: Database, collection: str, count: int = 1) -> int:
    """
    Atomic auto-increment. find_one_and_update with $inc is safe under concurrency.

    With count > 1 a block of ids is reserved in one round trip and the first id of
    the block is returned; the block is first..first+count-1.
    """
    counter = db[COUNTERS].find_one_and_update(
        {"_id": collection},
        {"$inc": {"seq": count}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int(counter["seq"]) - count + 1


def insert(db: Database, collection: str, data: dict[str, Any]) -> dict[str, Any]:
    """Insert one document with a fresh integer id and timestamps; return it as stored."""
    now = datetime.now(UTC)
    doc = to_mongo({"id": next_id(db, collection), **data, "created_at": now, "updated_at": now})
    db[collection].insert_one(doc)
    return from_mongo(doc)


def insert_many(db: Database, collection: str, rows: list[dict[str, Any]]) -> int:
    """
    Insert all rows or none.

    A standalone MongoDB server has no multi-document transactions, so if the
    batch fails part-way the documents that did get written are deleted again
    before the error is re-raised. Otherwise a dropped connection mid-import left
    half a statement saved.
    """
    if not rows:
        return 0
    now = datetime.now(UTC)
    # One counter update for the whole batch: fetching an id per row cost one
    # database round trip per transaction on a large statement.
    first_id = next_id(db, collection, count=len(rows))
    ids = list(range(first_id, first_id + len(rows)))
    docs = [
        to_mongo({"id": doc_id, **row, "created_at": now, "updated_at": now})
        for doc_id, row in zip(ids, rows, strict=True)
    ]
    try:
        db[collection].insert_many(docs, ordered=True)
    except Exception:
        # By _id (set on each doc by the driver before sending), not by id: if the
        # failure was an id clash, deleting by id would also remove the document
        # that already owned that id.
        db[collection].delete_many({"_id": {"$in": [doc["_id"] for doc in docs if "_id" in doc]}})
        raise
    return len(docs)


def update(db: Database, collection: str, filter_: dict[str, Any], changes: dict[str, Any]) -> dict[str, Any] | None:
    """Apply $set changes and return the updated document, or None if nothing matched."""
    doc = db[collection].find_one_and_update(
        filter_,
        {"$set": to_mongo({**changes, "updated_at": datetime.now(UTC)})},
        return_document=ReturnDocument.AFTER,
    )
    return from_mongo(doc) if doc else None


# ── indexes ───────────────────────────────────────────────────────────────────


def ensure_indexes(db: Database) -> None:
    """Idempotent — safe on every startup. Mirrors the old SQL indexes and constraints."""
    for name in ALL_COLLECTIONS:
        db[name].create_index([("id", ASCENDING)], unique=True)

    db[USERS].create_index([("email", ASCENDING)], unique=True)
    # Hot paths: a user's transactions by date, and per-category analytics.
    db[TRANSACTIONS].create_index([("user_id", ASCENDING), ("transaction_date", DESCENDING)])
    db[TRANSACTIONS].create_index([("user_id", ASCENDING), ("category", ASCENDING)])
    db[BUDGETS].create_index([("user_id", ASCENDING), ("category", ASCENDING)])
    db[SAVINGS_GOALS].create_index([("user_id", ASCENDING)])
    db[DEBT_ACCOUNTS].create_index([("user_id", ASCENDING), ("interest_rate", DESCENDING)])
    # One profile per user — the old UNIQUE(user_id) constraint.
    db[INVESTMENT_PROFILES].create_index([("user_id", ASCENDING)], unique=True)
    db[CHAT_HISTORY].create_index([("user_id", ASCENDING), ("id", DESCENDING)])
    # Logged-out tokens. The TTL index deletes each entry once the token would have
    # expired anyway, so the collection never grows without bound.
    db[REVOKED_TOKENS].create_index([("jti", ASCENDING)], unique=True)
    db[REVOKED_TOKENS].create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
