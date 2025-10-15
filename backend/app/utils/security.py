"""Glue module that exposes security helpers to the rest of the codebase."""

from app.security.passwords import (
    hash_password,
    password_not_reused,
    password_policy_checks,
    register_password_history,
    update_password_metadata,
    verify_password,
)
from app.security.tokens import (
    build_access_payload,
    create_refresh_token,
    decode_jwt,
    encode_jwt,
    find_valid_refresh_token,
    revoke_all_tokens,
    revoke_token,
    rotate_refresh_token,
)
from app.security.mfa import (
    decrypt_secret_value,
    encrypt_secret,
    generate_backup_codes,
    generate_secret,
    hash_backup_code,
    totp_uri,
    verify_backup_code,
    verify_totp,
)

__all__ = [
    'hash_password',
    'verify_password',
    'password_policy_checks',
    'password_not_reused',
    'register_password_history',
    'update_password_metadata',
    'build_access_payload',
    'encode_jwt',
    'decode_jwt',
    'create_refresh_token',
    'rotate_refresh_token',
    'find_valid_refresh_token',
    'revoke_token',
    'revoke_all_tokens',
    'generate_secret',
    'encrypt_secret',
    'decrypt_secret_value',
    'generate_backup_codes',
    'hash_backup_code',
    'totp_uri',
    'verify_totp',
    'verify_backup_code',
]
