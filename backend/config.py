import os
from datetime import timedelta


def _get_bool_env(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "t", "yes", "on"}


def _get_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    return os.environ.get("SQLITE_DB_PATH", "sqlite:///logistica.db")


def _get_secret_key() -> str:
    secret = os.environ.get("SECRET_KEY")
    if secret and secret != "change-me":
        return secret
    jwt_secret = os.environ.get("JWT_SECRET_KEY")
    if jwt_secret and jwt_secret != "change-me":
        return jwt_secret
    # En desarrollo, usar un valor temporal pero loguear advertencia
    import sys
    print("⚠️  WARNING: SECRET_KEY no configurado. Usando valor temporal (NO USAR EN PRODUCCIÓN)", file=sys.stderr)
    return "dev-only-insecure-key-change-in-production"


def _get_list(name: str, default: str = ""):
    raw = os.environ.get(name, default)
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


class Config:
    SQLALCHEMY_DATABASE_URI = _get_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = _get_bool_env("FLASK_DEBUG", False)
    SECRET_KEY = _get_secret_key()
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or _get_secret_key()
    JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRES = int(os.environ.get(
        "ACCESS_TOKEN_EXPIRES_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRES = int(os.environ.get(
        "REFRESH_TOKEN_EXPIRES_DAYS", "7"))
    ROTATE_REFRESH_TOKENS = _get_bool_env("ROTATE_REFRESH_TOKENS", True)
    JWT_ISSUER = os.environ.get("JWT_ISSUER", "proyecto-transportadora-web")
    JWT_AUDIENCE = os.environ.get(
        "JWT_AUDIENCE", "proyecto-transportadora-clients")

    TIMEZONE = os.environ.get("TIMEZONE", "America/Asuncion")
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    CORS_ALLOW_ORIGINS = _get_list(
        "CORS_ALLOW_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173")
    CORS_ALLOW_METHODS = os.environ.get(
        "CORS_ALLOW_METHODS", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
    CORS_ALLOW_HEADERS = os.environ.get(
        "CORS_ALLOW_HEADERS", "Content-Type,Authorization,X-CSRF-Token")

    PASSWORD_MIN_LENGTH = int(os.environ.get("PASSWORD_MIN_LENGTH", "12"))
    PASSWORD_COMPLEXITY_REGEX = os.environ.get(
        "PASSWORD_COMPLEXITY_REGEX",
        r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$"
    )
    PASSWORD_HISTORY_SIZE = int(os.environ.get("PASSWORD_HISTORY_SIZE", "5"))
    PASSWORD_EXPIRATION_DAYS = int(
        os.environ.get("PASSWORD_EXPIRATION_DAYS", "0"))

    ACCOUNT_LOCK_THRESHOLD = int(
        os.environ.get("ACCOUNT_LOCK_THRESHOLD", "10"))
    ACCOUNT_LOCK_WINDOW_MINUTES = int(
        os.environ.get("ACCOUNT_LOCK_WINDOW_MINUTES", "15"))
    LOGIN_RATE_LIMIT_PER_MINUTE = int(
        os.environ.get("LOGIN_RATE_LIMIT_PER_MINUTE", "5"))
    LOGIN_RATE_LIMIT_BACKOFF_FACTOR = float(
        os.environ.get("LOGIN_RATE_LIMIT_BACKOFF_FACTOR", "2.0"))

    MFA_ENCRYPTION_KEY = os.environ.get("MFA_ENCRYPTION_KEY")
    MFA_ISSUER = os.environ.get("MFA_ISSUER", "ProyectoTransportadora")
    MFA_BACKUP_CODES = int(os.environ.get("MFA_BACKUP_CODES", "10"))

    SMTP_HOST = os.environ.get("SMTP_HOST", "mailhog")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "1025"))
    SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
    SMTP_USE_TLS = _get_bool_env("SMTP_USE_TLS", False)
    SMTP_FROM_EMAIL = os.environ.get(
        "SMTP_FROM_EMAIL", "no-reply@transportadora.local")
    SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "Sistema Logistico")

    SECURITY_LOG_LEVEL = os.environ.get("SECURITY_LOG_LEVEL", "INFO")
    AUDIT_SIEM_ENDPOINT = os.environ.get("AUDIT_SIEM_ENDPOINT")
    AUDIT_SIEM_TOKEN = os.environ.get("AUDIT_SIEM_TOKEN")

    CSP_DEFAULT_SRC = os.environ.get("CSP_DEFAULT_SRC", "'self'")
    CSP_SCRIPT_SRC = os.environ.get("CSP_SCRIPT_SRC", "'self'")
    CSP_STYLE_SRC = os.environ.get("CSP_STYLE_SRC", "'self'")

    DEFAULT_ADMIN_EMAIL = os.environ.get(
        "DEFAULT_ADMIN_EMAIL", "admin@transportadora.local")
    DEFAULT_ADMIN_NAME = os.environ.get(
        "DEFAULT_ADMIN_NAME", "Super Administrador")
    DEFAULT_ADMIN_USERNAME = os.environ.get("DEFAULT_ADMIN_USERNAME", "admin")
    ALLOW_SELF_REGISTRATION = _get_bool_env("ALLOW_SELF_REGISTRATION", True)
    MAIL_LINK_TTL_MINUTES = int(os.environ.get("MAIL_LINK_TTL_MINUTES", "30"))
    RESET_TOKEN_EXPIRATION_MINUTES = int(
        os.environ.get("RESET_TOKEN_EXPIRATION_MINUTES", "30"))

    LOG_JSON_INDENT = int(os.environ.get("LOG_JSON_INDENT", "0"))
    STRUCTURED_LOGGING = _get_bool_env("STRUCTURED_LOGGING", True)
    ENABLE_SIEM_HOOKS = _get_bool_env("ENABLE_SIEM_HOOKS", False)

    PREFERRED_URL_SCHEME = os.environ.get("PREFERRED_URL_SCHEME", "https")
