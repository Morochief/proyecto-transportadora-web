import os


def _get_bool_env(name: str, default: bool = False) -> bool:
    """Return a boolean from environment variables with safe defaults."""
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "t", "yes", "on"}


def _get_database_url() -> str:
    """Return an explicit DATABASE_URL or fall back to a local sqlite database."""
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    return os.environ.get("SQLITE_DB_PATH", "sqlite:///logistica.db")


def _get_secret_key() -> str:
    """Pick the first available secret-related environment variable."""
    secret = os.environ.get("SECRET_KEY")
    if secret:
        return secret
    jwt_secret = os.environ.get("JWT_SECRET_KEY")
    if jwt_secret:
        return jwt_secret
    # Development fallback; supplied by usuario. Sustituir en producción.
    return "d4XoQe3wMJ7c2y7K4YfbDjSgGm6pQX5p69b2Xc4Lx9Q="


class Config:
    SQLALCHEMY_DATABASE_URI = _get_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = _get_bool_env("FLASK_DEBUG", False)
    SECRET_KEY = _get_secret_key()
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or "f9ZtPa2NwL1sR8eYk5VhQ3uBn6Cd7pLm8Tg5Sr2Wn4M="
    PREFERRED_URL_SCHEME = os.environ.get("PREFERRED_URL_SCHEME", "http")
