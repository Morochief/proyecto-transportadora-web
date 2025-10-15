import base64
import hashlib
from functools import lru_cache
from typing import Optional

from cryptography.fernet import Fernet
from flask import current_app


@lru_cache(maxsize=1)
def _get_fernet() -> Fernet:
    secret = current_app.config.get('MFA_ENCRYPTION_KEY') or current_app.config['SECRET_KEY']
    digest = hashlib.sha256(secret.encode('utf-8')).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_string(value: str) -> bytes:
    return _get_fernet().encrypt(value.encode('utf-8'))


def decrypt_string(token: Optional[bytes]) -> Optional[str]:
    if not token:
        return None
    return _get_fernet().decrypt(token).decode('utf-8')
