import hashlib
import hmac
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Tuple

import jwt
from flask import current_app

from app.models import RefreshToken
from app import db


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _hash_value(value: str) -> str:
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def _token_id() -> str:
    return uuid.uuid4().hex


def build_access_payload(user, *, permissions) -> Dict[str, Any]:
    now = _utcnow()
    cfg = current_app.config
    exp = now + timedelta(minutes=cfg['ACCESS_TOKEN_EXPIRES'])
    payload = {
        'iss': cfg['JWT_ISSUER'],
        'aud': cfg['JWT_AUDIENCE'],
        'iat': int(now.timestamp()),
        'nbf': int(now.timestamp()),
        'exp': int(exp.timestamp()),
        'sub': str(user.id),
        'email': user.email,
        'usuario': user.usuario,
        'roles': [role.name for role in user.roles],
        'permissions': sorted(permissions),
        'mfa': user.mfa_enabled,
        'active': user.is_active and user.estado == 'activo'
    }
    return payload


def encode_jwt(payload: Dict[str, Any]) -> str:
    secret = current_app.config['JWT_SECRET_KEY']
    algorithm = current_app.config['JWT_ALGORITHM']
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_jwt(token: str) -> Dict[str, Any]:
    secret = current_app.config['JWT_SECRET_KEY']
    algorithm = current_app.config['JWT_ALGORITHM']
    try:
        return jwt.decode(token, secret, algorithms=[algorithm], audience=current_app.config['JWT_AUDIENCE'])
    except jwt.PyJWTError as exc:
        raise ValueError('Token invÃ¡lido') from exc


def create_refresh_token(user, *, ip: str | None, user_agent: str | None) -> Tuple[str, RefreshToken]:
    cfg = current_app.config
    token_id = _token_id()
    plain_token = f"{token_id}.{uuid.uuid4().hex}{uuid.uuid4().hex}"
    token_hash = _hash_value(plain_token)
    now = _utcnow()
    record = RefreshToken(
        user_id=user.id,
        token_id=token_id,
        token_hash=token_hash,
        created_at=now,
        expires_at=now + timedelta(days=cfg['REFRESH_TOKEN_EXPIRES']),
        ip=ip,
        user_agent=user_agent,
    )
    db.session.add(record)
    return plain_token, record


def rotate_refresh_token(current_token: RefreshToken, user, *, ip: str | None, user_agent: str | None) -> Tuple[str, RefreshToken]:
    if current_token.revoked_at:
        raise ValueError('Token revocado')
    if not current_app.config['ROTATE_REFRESH_TOKENS']:
        raise ValueError('Rotacion de refresh tokens deshabilitada')
    new_plain, new_token = create_refresh_token(user, ip=ip, user_agent=user_agent)
    current_token.revoked_at = _utcnow()
    current_token.replaced_by_token_id = new_token.token_id
    return new_plain, new_token


def find_valid_refresh_token(token: str, user=None) -> RefreshToken | None:
    token_hash = _hash_value(token)
    query = RefreshToken.query.filter_by(token_hash=token_hash)
    if user is not None:
        query = query.filter_by(user_id=user.id)
    return query.filter(RefreshToken.revoked_at.is_(None)).first()


def revoke_token(record: RefreshToken) -> None:
    record.revoked_at = _utcnow()
    db.session.add(record)


def revoke_all_tokens(user) -> None:
    now = _utcnow()
    (
        RefreshToken.query
        .filter_by(user_id=user.id)
        .update({'revoked_at': now})
    )


def secure_compare(value: str, hashed: str) -> bool:
    return hmac.compare_digest(_hash_value(value), hashed)


__all__ = [
    'build_access_payload',
    'encode_jwt',
    'decode_jwt',
    'create_refresh_token',
    'rotate_refresh_token',
    'find_valid_refresh_token',
    'revoke_token',
    'revoke_all_tokens',
    'secure_compare',
]


