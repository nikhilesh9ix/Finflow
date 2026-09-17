import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from decimal import Decimal

from fastapi import FastAPI
from fastapi.encoders import ENCODERS_BY_TYPE
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.gzip import GZipMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.limiter import limiter
from app.db.mongo import ensure_indexes, get_client, get_database

# Serialize Decimal as float in all JSON responses (routes returning dict or Pydantic models).
# Without this, FastAPI's jsonable_encoder converts Decimal → str, breaking frontend number ops.
ENCODERS_BY_TYPE[Decimal] = float

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Replaces the deprecated @app.on_event("startup"). Index creation is
    # idempotent, so running it on every start keeps a fresh database correct.
    ensure_indexes(get_database())
    logger.info(
        "FinFlow AI starting — env=%s ai=%s db=%s", settings.app_env, settings.ai_enabled, settings.mongodb_db
    )
    yield
    get_client().close()


def create_app() -> FastAPI:
    app = FastAPI(
        lifespan=lifespan,
        title=settings.app_name,
        version="0.1.0",
        description="Personal AI financial copilot for Indian salaried professionals.",
        docs_url="/api/docs" if not settings.is_production else None,
        redoc_url="/api/redoc" if not settings.is_production else None,
        openapi_url="/api/openapi.json" if not settings.is_production else None,
    )

    # ── Middleware (order matters — outermost runs first) ──────────────────────
    app.add_middleware(GZipMiddleware, minimum_size=1024)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Rate limiting ─────────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

    # ── Routes ────────────────────────────────────────────────────────────────
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {"service": settings.app_name, "version": "0.1.0", "status": "ok"}

    return app


app = create_app()
