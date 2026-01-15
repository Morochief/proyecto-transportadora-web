from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple

from flask import current_app
from sqlalchemy import or_, and_
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import (
    BackupCode,
    LoginAttempt,
    PasswordResetToken,
    RefreshToken,
    Usuario,
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
from app.security.passwords import (
    hash_password,
    password_not_reused,
    password_policy_checks,
    register_password_history,
    update_password_metadata,
    verify_password,
)
from app.security.rbac import (
    ensure_roles_permissions,
    get_user_permissions,
    normalize_role,
    ROLE_MATRIX,
    sync_legacy_role,
)
from app.security.tokens import (
    build_access_payload,
    create_refresh_token,
    encode_jwt,
    find_valid_refresh_token,
    revoke_all_tokens,
    revoke_token,
    rotate_refresh_token,
)
from app.services.audit_service import audit_event
from app.services.email_service import send_email


class AuthServiceError(Exception):
    pass


class RateLimitExceeded(AuthServiceError):
    def __init__(self, retry_after_seconds: int):
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f'Reintentar en {retry_after_seconds} segundos')


class AccountLocked(AuthServiceError):
    def __init__(self, until: datetime):
        self.until = until
        super().__init__('Cuenta bloqueada temporalmente')


class MFARequired(AuthServiceError):
    def __init__(self, methods: Dict[str, bool]):
        self.methods = methods
        super().__init__('Se requiere MFA')


class PasswordPolicyError(AuthServiceError):
    def __init__(self, reasons):
        self.reasons = reasons
        super().__init__('La contraseAa no cumple con la polAtica')


class InvalidCredentials(AuthServiceError):
    pass


ALLOWED_USER_ESTADOS = {'activo', 'inactivo', 'suspendido'}


def _normalize_user_estado(estado: Optional[str], is_active: Optional[bool]) -> Tuple[str, bool]:
    estado_value = estado.strip().lower() if estado else None
    if estado_value:
        if estado_value not in ALLOWED_USER_ESTADOS:
            raise AuthServiceError('Estado desconocido')
        if is_active is not None and (estado_value == 'activo') != is_active:
            raise AuthServiceError('Estado e is_active inconsistentes')
        return estado_value, estado_value == 'activo'
    if is_active is None:
        return 'activo', True
    return ('activo' if is_active else 'inactivo'), is_active


def _hash_reset_token(raw: str) -> str:
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def _now() -> datetime:
    return datetime.utcnow()


def _record_login_attempt(*, user: Optional[Usuario], email: str, ip: Optional[str], user_agent: Optional[str], success: bool, mfa_required: bool) -> None:
    attempt = LoginAttempt(
        user_id=user.id if user else None,
        email=email,
        ip=ip or 'unknown',
        user_agent=user_agent,
        success=success,
        mfa_required=mfa_required,
    )
    db.session.add(attempt)


def _check_rate_limit(ip: Optional[str]) -> None:
    if not ip:
        return
    cfg = current_app.config
    window_start = _now() - timedelta(minutes=1)
    attempts = (
        LoginAttempt.query
        .filter(LoginAttempt.ip == ip)
        .filter(LoginAttempt.created_at >= window_start)
        .count()
    )
    if attempts >= cfg['LOGIN_RATE_LIMIT_PER_MINUTE']:
        retry_after = int(60 * (cfg['LOGIN_RATE_LIMIT_BACKOFF_FACTOR'] ** max(1, attempts - cfg['LOGIN_RATE_LIMIT_PER_MINUTE'] + 1)))
        raise RateLimitExceeded(retry_after)


def _apply_failed_login(user: Usuario) -> None:
    cfg = current_app.config
    user.failed_login_attempts += 1
    window_start = _now() - timedelta(minutes=cfg['ACCOUNT_LOCK_WINDOW_MINUTES'])
    failures = (
        LoginAttempt.query
        .filter(LoginAttempt.user_id == user.id, LoginAttempt.success.is_(False))
        .filter(LoginAttempt.created_at >= window_start)
        .count()
    )
    if failures >= cfg['ACCOUNT_LOCK_THRESHOLD']:
        user.is_locked = True
        user.locked_until = _now() + timedelta(minutes=cfg['ACCOUNT_LOCK_WINDOW_MINUTES'])


def _unlock_if_needed(user: Usuario) -> None:
    if user.locked_until and user.locked_until <= _now():
        user.is_locked = False
        user.locked_until = None
        user.failed_login_attempts = 0


def find_user(identifier: str) -> Optional[Usuario]:
    return (
        Usuario.query
        .filter(or_(Usuario.email.ilike(identifier), Usuario.usuario.ilike(identifier)))
        .first()
    )


def issue_tokens(user: Usuario, *, ip: Optional[str], user_agent: Optional[str]) -> Tuple[str, str]:
    sync_legacy_role(user)
    permissions = get_user_permissions(user)
    access_payload = build_access_payload(user, permissions=permissions)
    access_token = encode_jwt(access_payload)
    refresh_token, record = create_refresh_token(user, ip=ip, user_agent=user_agent)
    db.session.flush()
    return access_token, refresh_token


def authenticate(identifier: str, password: str, *, ip: Optional[str], user_agent: Optional[str], mfa_code: Optional[str] = None, backup_code: Optional[str] = None) -> Dict[str, object]:
    _check_rate_limit(ip)
    user = find_user(identifier)
    if not user:
        _record_login_attempt(user=None, email=identifier, ip=ip, user_agent=user_agent, success=False, mfa_required=False)
        db.session.commit()
        raise InvalidCredentials('Credenciales invAlidas')

    _unlock_if_needed(user)
    if not user.is_active or user.estado != 'activo':
        _record_login_attempt(user=user, email=user.email, ip=ip, user_agent=user_agent, success=False, mfa_required=False)
        db.session.commit()
        raise InvalidCredentials('Cuenta deshabilitada')

    if user.is_locked and (not user.locked_until or user.locked_until > _now()):
        _record_login_attempt(user=user, email=user.email, ip=ip, user_agent=user_agent, success=False, mfa_required=False)
        db.session.commit()
        raise AccountLocked(user.locked_until or (_now() + timedelta(minutes=15)))

    if not verify_password(password, user.clave_hash):
        _apply_failed_login(user)
        _record_login_attempt(user=user, email=user.email, ip=ip, user_agent=user_agent, success=False, mfa_required=False)
        db.session.commit()
        raise InvalidCredentials('Credenciales invAlidas')

    if user.mfa_enabled:
        secret = decrypt_secret_value(user.mfa_secret_encrypted)
        has_backup = any(not code.used for code in user.backup_codes)
        if not (mfa_code or backup_code):
            _record_login_attempt(user=user, email=user.email, ip=ip, user_agent=user_agent, success=False, mfa_required=True)
            db.session.commit()
            raise MFARequired({'totp': True, 'backup': has_backup})
        verified = False
        if mfa_code and secret:
            verified = verify_totp(secret, mfa_code)
        if not verified and backup_code:
            for code in user.backup_codes:
                if code.used:
                    continue
                if verify_backup_code(backup_code, code.salt, code.code_hash):
                    code.used = True
                    code.used_at = _now()
                    verified = True
                    break
        if not verified:
            _apply_failed_login(user)
            _record_login_attempt(user=user, email=user.email, ip=ip, user_agent=user_agent, success=False, mfa_required=True)
            db.session.commit()
            raise InvalidCredentials('CA3digo MFA invAlido')

    user.last_login_at = _now()
    user.last_login_ip = ip
    user.last_login_user_agent = user_agent
    user.failed_login_attempts = 0
    user.is_locked = False
    user.locked_until = None

    _record_login_attempt(user=user, email=user.email, ip=ip, user_agent=user_agent, success=True, mfa_required=user.mfa_enabled)
    access_token, refresh_token = issue_tokens(user, ip=ip, user_agent=user_agent)
    audit_event('login.success', user_id=user.id, ip=ip, user_agent=user_agent)
    db.session.commit()

    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'usuario': user.usuario,
            'display_name': user.display_name or user.nombre_completo,
            'roles': [role.name for role in user.roles],
            'permissions': sorted(get_user_permissions(user)),
            'mfa_enabled': user.mfa_enabled,
        }
    }


def register_user(*, nombre: str, email: str, usuario: str, password: str, telefono: Optional[str], role: str = 'operador', estado: Optional[str] = None, is_active: Optional[bool] = None, actor: Optional[Usuario] = None, ip: Optional[str] = None, user_agent: Optional[str] = None) -> Usuario:
    if not current_app.config['ALLOW_SELF_REGISTRATION'] and actor is None:
        raise AuthServiceError('Registro deshabilitado')

    role = normalize_role(role)
    if role not in ROLE_MATRIX:
        raise AuthServiceError('Rol desconocido')

    estado_value, is_active_value = _normalize_user_estado(estado, is_active)

    ensure_roles_permissions()
    ok, errors = password_policy_checks(password)
    if not ok:
        raise PasswordPolicyError(errors)

    hashed = hash_password(password)
    user = Usuario(
        nombre_completo=nombre,
        display_name=nombre,
        email=email.lower(),
        usuario=usuario.lower(),
        telefono=telefono,
        clave_hash=hashed,
        rol=role,
        estado=estado_value,
        is_active=is_active_value,
    )
    sync_legacy_role(user)
    try:
        db.session.add(user)
        db.session.flush()
    except IntegrityError as exc:
        db.session.rollback()
        raise AuthServiceError('Usuario o email ya existe') from exc

    register_password_history(user, hashed)
    update_password_metadata(user)

    default_role = role or 'operador'
    sync_legacy_role(user)

    audit_event('user.register', user_id=user.id, ip=ip, user_agent=user_agent, metadata={'actor': actor.id if actor else None})
    db.session.commit()
    return user


def enroll_mfa(user: Usuario) -> Dict[str, object]:
    secret = generate_secret()
    encrypted = encrypt_secret(secret)
    uri = totp_uri(secret, user.email, current_app.config['MFA_ISSUER'])
    backup_codes = generate_backup_codes(current_app.config['MFA_BACKUP_CODES'])

    user.mfa_secret_encrypted = encrypted
    user.mfa_enabled = False

    user.backup_codes.clear()
    salt = None
    for raw_code in backup_codes:
        salt, digest = hash_backup_code(raw_code)
        user.backup_codes.append(BackupCode(salt=salt, code_hash=digest))

    db.session.commit()
    return {
        'secret': secret,
        'otpauth_url': uri,
        'backup_codes': backup_codes,
    }


def activate_mfa(user: Usuario, code: str) -> None:
    secret = decrypt_secret_value(user.mfa_secret_encrypted)
    if not secret or not verify_totp(secret, code):
        raise AuthServiceError('CA3digo MFA invAlido')
    user.mfa_enabled = True
    db.session.commit()
    audit_event('mfa.enabled', user_id=user.id)


def disable_mfa(user: Usuario) -> None:
    user.mfa_enabled = False
    user.mfa_secret_encrypted = None
    user.backup_codes.clear()
    db.session.commit()
    audit_event('mfa.disabled', user_id=user.id)


def refresh_session(user: Usuario, refresh_token: str, *, ip: Optional[str], user_agent: Optional[str]) -> Dict[str, object]:
    record = find_valid_refresh_token(refresh_token, user)
    if not record:
        raise AuthServiceError('Refresh token invAlido')
    if record.expires_at < _now():
        revoke_token(record)
        db.session.commit()
        raise AuthServiceError('Refresh token expirado')

    if current_app.config['ROTATE_REFRESH_TOKENS']:
        try:
            new_refresh, _ = rotate_refresh_token(record, user, ip=ip, user_agent=user_agent)
            refresh_to_return = new_refresh
        except ValueError as exc:
            raise AuthServiceError(str(exc))
    else:
        refresh_to_return = refresh_token

    access_payload = build_access_payload(user, permissions=get_user_permissions(user))
    access_token = encode_jwt(access_payload)
    db.session.commit()
    return {
        'access_token': access_token,
        'refresh_token': refresh_to_return,
    }


def logout(user: Usuario, refresh_token: str | None = None) -> None:
    if refresh_token:
        record = find_valid_refresh_token(refresh_token, user)
        if record:
            revoke_token(record)
    else:
        revoke_all_tokens(user)
    db.session.commit()
    audit_event('logout', user_id=user.id)


def start_password_reset(email: str) -> None:
    user = Usuario.query.filter(Usuario.email.ilike(email)).first()
    if not user:
        return
    token = secrets.token_urlsafe(48)
    hashed = _hash_reset_token(token)
    record = PasswordResetToken(
        user_id=user.id,
        token_hash=hashed,
        expires_at=_now() + timedelta(minutes=current_app.config['RESET_TOKEN_EXPIRATION_MINUTES'])
    )
    db.session.add(record)
    reset_link = f"{current_app.config['FRONTEND_URL'].rstrip('/')}/reset-password?token={token}"
    send_email(
        recipient=user.email,
        subject='Recuperar contrasena',
        html_body=f"<p>Utilice el siguiente enlace para restablecer su contrasena. Expira en {current_app.config['RESET_TOKEN_EXPIRATION_MINUTES']} minutos.</p><p><a href='{reset_link}'>Restablecer contrasena</a></p>",
        text_body=f"Restablecer contrasena: {reset_link}",
    )
    audit_event('password.reset.request', user_id=user.id, metadata={'email': email})
    db.session.commit()


def complete_password_reset(token: str, new_password: str) -> None:
    ok, errors = password_policy_checks(new_password)
    if not ok:
        raise PasswordPolicyError(errors)

    hashed = _hash_reset_token(token)
    matched = PasswordResetToken.query.filter_by(token_hash=hashed).first()
    if not matched:
        raise AuthServiceError('Token de reseteo invalido')
    if matched.used_at:
        raise AuthServiceError('Token ya utilizado')
    if matched.expires_at < _now():
        raise AuthServiceError('Token expirado')

    user = Usuario.query.get(matched.user_id)
    if not user:
        raise AuthServiceError('Usuario no encontrado')

    hashed_password = hash_password(new_password)
    if not password_not_reused(user, hashed_password):
        raise PasswordPolicyError(['No puede reutilizar contrasenas recientes'])

    user.clave_hash = hashed_password
    update_password_metadata(user)
    register_password_history(user, hashed_password)

    matched.used_at = _now()
    revoke_all_tokens(user)
    audit_event('password.reset.complete', user_id=user.id)
    db.session.commit()


def change_password(user: Usuario, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.clave_hash):
        raise InvalidCredentials('Contrasena actual invalida')
    ok, errors = password_policy_checks(new_password)
    if not ok:
        raise PasswordPolicyError(errors)
    hashed = hash_password(new_password)
    if not password_not_reused(user, hashed):
        raise PasswordPolicyError(['No puede reutilizar contrasenas recientes'])

    user.clave_hash = hashed
    update_password_metadata(user)
    register_password_history(user, hashed)
    revoke_all_tokens(user)
    audit_event('password.change', user_id=user.id)
    db.session.commit()
