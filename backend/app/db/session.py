from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_schema() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    if not existing_tables:
        Base.metadata.create_all(bind=engine)
        return

    if "users" not in existing_tables or "investment_profiles" not in existing_tables:
        Base.metadata.create_all(bind=engine)
        return

    with engine.begin() as connection:
        users_columns = {column["name"] for column in inspector.get_columns("users")}
        if "risk_profile" not in users_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN risk_profile VARCHAR(40) DEFAULT 'balanced'"))
        if "currency" not in users_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN currency VARCHAR(8) DEFAULT 'INR'"))
        if "is_active" not in users_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"))

        investment_columns = {column["name"] for column in inspector.get_columns("investment_profiles")}
        if "age" not in investment_columns:
            connection.execute(text("ALTER TABLE investment_profiles ADD COLUMN age INTEGER"))
        if "goal_horizon_years" not in investment_columns:
            connection.execute(text("ALTER TABLE investment_profiles ADD COLUMN goal_horizon_years INTEGER"))
        if "risk_tolerance" not in investment_columns:
            connection.execute(text("ALTER TABLE investment_profiles ADD COLUMN risk_tolerance VARCHAR(40)"))
        if "emergency_fund_status" not in investment_columns:
            connection.execute(text("ALTER TABLE investment_profiles ADD COLUMN emergency_fund_status VARCHAR(40)"))
        if "recommendation_json" not in investment_columns:
            connection.execute(text("ALTER TABLE investment_profiles ADD COLUMN recommendation_json TEXT DEFAULT ''"))
        if "updated_at" not in investment_columns:
            connection.execute(text("ALTER TABLE investment_profiles ADD COLUMN updated_at DATETIME"))

    if "financial_chats" not in existing_tables:
        Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
