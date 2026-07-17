from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FinFlow AI"
    app_env: str = "local"
    secret_key: str = Field(default="dev-secret-change-me")
    access_token_expire_minutes: int = 1440
    database_url: str = "sqlite:///./finflow.db"
    frontend_origin: str = "http://localhost:5173"
    openai_api_key: str | None = None
    gemini_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
