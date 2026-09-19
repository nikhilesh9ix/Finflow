from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_SECRET = "change-me-before-production"


class Settings(BaseSettings):
    app_name: str = "FinFlow AI"
    app_env: str = "local"
    api_v1_prefix: str = "/api/v1"

    # Security — no insecure default in production (validated below)
    secret_key: str = _DEV_SECRET
    access_token_expire_minutes: int = 1440

    # Database — MongoDB. Local dev uses the MongoDB service on the default port.
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "finflow"

    # CORS
    backend_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # AI — Groq takes precedence when both keys are set (faster + free tier).
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-5"
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_production_config(self) -> "Settings":
        if self.app_env == "production" and self.secret_key == _DEV_SECRET:
            raise ValueError(
                "SECRET_KEY must be changed from the default in production. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.backend_cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def ai_provider(self) -> str:
        """Which LLM backend the copilot uses: 'groq', 'anthropic', or 'none'."""
        if self.groq_api_key:
            return "groq"
        if self.anthropic_api_key:
            return "anthropic"
        return "none"

    @property
    def ai_enabled(self) -> bool:
        return self.ai_provider != "none"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
