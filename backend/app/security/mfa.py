import hashlib
import secrets
import string
from typing import Iterable, List, Tuple

import pyotp

from .encryption import decrypt_string, encrypt_string


def generate_secret() -> str:
    return pyotp.random_base32()


def totp_from_secret(secret: str) -> pyotp.TOTP:
    return pyotp.TOTP(secret, interval=30)


def totp_uri(secret: str, email: str, issuer: str) -> str:
    return totp_from_secret(secret).provisioning_uri(name=email, issuer_name=issuer)


def verify_totp(secret: str, code: str) -> bool:
    if not code:
        return False
    try:
        return totp_from_secret(secret).verify(code, valid_window=1)
    except Exception:
        return False


def encrypt_secret(secret: str) -> bytes:
    return encrypt_string(secret)


def decrypt_secret_value(token: bytes | None) -> str | None:
    return decrypt_string(token)


def generate_backup_codes(count: int) -> List[str]:
    alphabet = string.ascii_uppercase + string.digits
    codes = []
    for _ in range(count):
        raw = ''.join(secrets.choice(alphabet) for _ in range(10))
        codes.append(f"{raw[:5]}-{raw[5:]}")
    return codes


def hash_backup_code(code: str, salt: str | None = None) -> Tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.sha256(f"{salt}:{code}".encode('utf-8')).hexdigest()
    return salt, digest


def verify_backup_code(code: str, salt: str, code_hash: str) -> bool:
    _, digest = hash_backup_code(code, salt=salt)
    return secrets.compare_digest(digest, code_hash)

