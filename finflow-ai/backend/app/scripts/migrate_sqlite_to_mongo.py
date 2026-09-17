"""
One-off copy of the old SQLite database into MongoDB.

    python -m app.scripts.migrate_sqlite_to_mongo              # dry run: counts only
    python -m app.scripts.migrate_sqlite_to_mongo --apply      # copy into an empty target
    python -m app.scripts.migrate_sqlite_to_mongo --apply --replace   # overwrite FinFlow's collections

What it preserves:
  - Integer ids, so links between records (user_id) and API URLs stay valid.
  - Password hashes, so every existing account can still log in.
  - Money as exact Decimal128 — SQLite handed these back as ints/floats.
  - Timestamps, read as UTC (SQLite's CURRENT_TIMESTAMP is UTC).

Only FinFlow's own collections are ever written or dropped. Uses the stdlib
sqlite3 module, so it does not need SQLAlchemy installed.
"""

import argparse
import sqlite3
import sys
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path

from app.core.config import settings
from app.db import mongo

_MONEY = Decimal("0.01")
_RATE = Decimal("0.001")

# table → (collection, money columns, rate columns, date columns)
_TABLES: dict[str, tuple[str, set[str], set[str], set[str]]] = {
    "users": (mongo.USERS, {"monthly_income"}, set(), set()),
    "transactions": (mongo.TRANSACTIONS, {"amount"}, set(), {"transaction_date"}),
    "budgets": (mongo.BUDGETS, {"monthly_limit"}, set(), set()),
    "savings_goals": (mongo.SAVINGS_GOALS, {"target_amount", "current_amount"}, set(), {"target_date"}),
    "debt_accounts": (mongo.DEBT_ACCOUNTS, {"outstanding_amount", "emi_amount"}, {"interest_rate"}, set()),
    "investment_profiles": (
        mongo.INVESTMENT_PROFILES,
        {"monthly_investment_capacity", "emergency_fund_target", "emergency_fund_current"},
        set(),
        set(),
    ),
    "chat_history": (mongo.CHAT_HISTORY, set(), set(), set()),
}


def _decimal(value, quantum: Decimal) -> Decimal | None:
    # str() first: Decimal(0.1) would capture the float's binary error.
    return None if value is None else Decimal(str(value)).quantize(quantum)


def _timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(value)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def _convert(row: sqlite3.Row, money: set[str], rates: set[str], dates: set[str]) -> dict:
    doc = {}
    for key in row.keys():
        value = row[key]
        if key in money:
            value = _decimal(value, _MONEY)
        elif key in rates:
            value = _decimal(value, _RATE)
        elif key in dates:
            value = date.fromisoformat(value) if value else None
        elif key in ("created_at", "updated_at"):
            value = _timestamp(value)
        doc[key] = value
    return mongo.to_mongo(doc)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--sqlite", default="finflow.db", help="path to the SQLite file (default: finflow.db)")
    parser.add_argument("--apply", action="store_true", help="actually write to MongoDB (default is a dry run)")
    parser.add_argument("--replace", action="store_true", help="drop FinFlow's existing collections first")
    args = parser.parse_args()

    source = Path(args.sqlite)
    if not source.exists():
        print(f"SQLite file not found: {source.resolve()}")
        return 1

    conn = sqlite3.connect(source)
    conn.row_factory = sqlite3.Row
    db = mongo.get_database()
    print(f"source : {source.resolve()}")
    print(f"target : {settings.mongodb_url} / {settings.mongodb_db}")

    existing_users = db[mongo.USERS].estimated_document_count()
    if args.apply and existing_users and not args.replace:
        print(f"Target already has {existing_users} users. Re-run with --replace to overwrite FinFlow's collections.")
        return 1

    plan = {table: conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in _TABLES}
    for table, count in plan.items():
        print(f"  {table:22s} {count:>5} rows")
    if not args.apply:
        print("Dry run — nothing written. Add --apply to copy.")
        return 0

    if args.replace:
        for collection in (*mongo.ALL_COLLECTIONS, mongo.COUNTERS):
            db.drop_collection(collection)
    mongo.ensure_indexes(db)

    for table, (collection, money, rates, dates) in _TABLES.items():
        docs = [_convert(row, money, rates, dates) for row in conn.execute(f"SELECT * FROM {table} ORDER BY id")]
        if docs:
            db[collection].insert_many(docs, ordered=True)
        # Continue new ids after the highest copied one, so nothing collides.
        max_id = max((doc["id"] for doc in docs), default=0)
        db[mongo.COUNTERS].update_one({"_id": collection}, {"$set": {"seq": max_id}}, upsert=True)
        stored = db[collection].count_documents({})
        status = "ok" if stored == len(docs) else "MISMATCH"
        print(f"  copied {table:22s} {stored:>5} documents  [{status}]")
        if stored != len(docs):
            return 1

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
