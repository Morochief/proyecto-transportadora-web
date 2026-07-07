"""
Redis-backed rate limiter with automatic DB fallback.

Uses Redis sorted sets for sliding window rate limiting.
If Redis is unavailable, falls back to querying login_attempts table.
Call init_app(app) at startup to configure the Redis client.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

_redis_client = None


def init_app(app) -> None:
    """Initialize the Redis client from Flask app config.

    Call once at application startup. If Redis is disabled or the connection
    fails, the rate limiter silently degrades to the DB-based fallback.
    """
    global _redis_client

    if not app.config.get("REDIS_ENABLED", True):
        logger.info("Redis rate limiting disabled by REDIS_ENABLED=False")
        return

    url = app.config.get("REDIS_URL")
    if not url:
        logger.info("REDIS_URL not set — using DB-based rate limiting")
        return

    timeout = app.config.get("REDIS_SOCKET_TIMEOUT", 2)

    try:
        import redis as redis_module

        client = redis_module.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=timeout,
            socket_timeout=timeout,
            health_check_interval=30,
        )
        client.ping()
        _redis_client = client
        logger.info("Redis connected for rate limiting")
    except Exception:
        logger.warning("Redis unavailable — falling back to DB rate limiting")
        _redis_client = None


def check_rate_limit(
    ip: str,
    limit: int,
    backoff_factor: float,
    window_seconds: int = 60,
) -> Optional[int]:
    """Check whether *ip* has exceeded the rate limit.

    Returns ``retry_after_seconds`` if the IP is rate-limited, or ``None``
    if the request may proceed.
    """
    r = _redis_client
    if r is not None:
        return _check_redis(r, ip, limit, backoff_factor, window_seconds)
    return _check_db(ip, limit, backoff_factor, window_seconds)


def record_attempt(ip: str, window_seconds: int = 60) -> None:
    """Record a login attempt timestamp for *ip* in Redis.

    No-op when Redis is unavailable — the DB fallback path reads directly
    from the ``login_attempts`` table so there is nothing to replicate.
    """
    r = _redis_client
    if r is None:
        return

    now = int(datetime.utcnow().timestamp())
    key = _key(ip)

    try:
        with r.pipeline() as pipe:
            pipe.zremrangebyscore(key, 0, now - window_seconds)
            pipe.zadd(key, {str(now): now})
            pipe.expire(key, window_seconds * 2)
            pipe.execute()
    except Exception:
        logger.warning("Failed to record rate-limit attempt in Redis")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _key(ip: str) -> str:
    return f"rl:{ip}"


def _check_redis(
    r, ip: str, limit: int, backoff_factor: float, window_seconds: int
) -> Optional[int]:
    key = _key(ip)
    now = int(datetime.utcnow().timestamp())

    try:
        with r.pipeline() as pipe:
            pipe.zremrangebyscore(key, 0, now - window_seconds)
            pipe.zcard(key)
            results = pipe.execute()

        count: int = results[1]  # zcard result
        if count >= limit:
            attempts_over = count - limit + 1
            retry_after = int(
                window_seconds * (backoff_factor ** max(1, attempts_over))
            )
            return retry_after
    except Exception:
        logger.exception("Redis rate check failed — falling back to DB")
        return _check_db(ip, limit, backoff_factor, window_seconds)

    return None


def _check_db(
    ip: str, limit: int, backoff_factor: float, window_seconds: int
) -> Optional[int]:
    """Fallback — query ``login_attempts`` table (original behaviour)."""
    from app.models import LoginAttempt

    try:
        window_start = datetime.utcnow() - timedelta(seconds=window_seconds)
        attempts = (
            LoginAttempt.query
            .filter(LoginAttempt.ip == ip)
            .filter(LoginAttempt.created_at >= window_start)
            .count()
        )
        if attempts >= limit:
            attempts_over = attempts - limit + 1
            retry_after = int(
                window_seconds * (backoff_factor ** max(1, attempts_over))
            )
            return retry_after
    except Exception:
        logger.warning("DB rate check failed (table may not exist yet)")

    return None
