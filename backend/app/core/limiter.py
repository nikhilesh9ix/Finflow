"""
Rate limiter — shared across all routes.

Uses in-memory storage by default (fine for single-instance deployments).
For multi-instance production, swap to Redis via the REDIS_URL env var:

    limiter = Limiter(key_func=get_remote_address, storage_uri=settings.redis_url)
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["300/minute"],  # global ceiling; individual routes set tighter limits
)
