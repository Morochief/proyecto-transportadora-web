import re
from datetime import datetime, timedelta
from typing import Iterable, Tuple, TYPE_CHECKING

from flask import current_app
from werkzeug.security import check_password_hash, generate_password_hash

if TYPE_CHECKING:
    from app.models import PasswordHistory, Usuario


def hash_password(password: str) -> str:
    return generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    return check_password_hash(password_hash, password)


def password_policy_checks(password: str) -> Tuple[bool, Iterable[str]]:
    cfg = current_app.config
    errors = []
    if len(password) < cfg['PASSWORD_MIN_LENGTH']:
        errors.append(
            f"Debe tener al menos {cfg['PASSWORD_MIN_LENGTH']} caracteres")
    pattern = cfg['PASSWORD_COMPLEXITY_REGEX']
    if pattern and not re.match(pattern, password):
        errors.append(
            'Debe incluir mayusculas, minusculas, digitos y un caracter especial')
    return len(errors) == 0, errors


def password_not_reused(user, password_hash: str) -> bool:
    from app.models import PasswordHistory

    history = (
        PasswordHistory.query
        .filter_by(user_id=user.id)
        .order_by(PasswordHistory.created_at.desc())
        .limit(current_app.config['PASSWORD_HISTORY_SIZE'])
        .all()
    )
    return all(entry.password_hash != password_hash for entry in history)


def register_password_history(user, password_hash: str) -> None:
    from app import db
    from app.models import PasswordHistory

    record = PasswordHistory(user_id=user.id, password_hash=password_hash)
    db.session.add(record)
    max_entries = current_app.config['PASSWORD_HISTORY_SIZE']
    if max_entries > 0:
        obsolete = (
            PasswordHistory.query
            .filter_by(user_id=user.id)
            .order_by(PasswordHistory.created_at.desc())
            .offset(max_entries)
        )
        for item in obsolete:
            db.session.delete(item)


def update_password_metadata(user) -> None:
    now = datetime.utcnow()
    user.password_changed_at = now
    expiration_days = current_app.config['PASSWORD_EXPIRATION_DAYS']
    user.password_expires_at = now + \
        timedelta(days=expiration_days) if expiration_days else None
    user.failed_login_attempts = 0
    user.is_locked = False
    user.locked_until = None
