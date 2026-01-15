from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request, g, make_response, current_app
from pydantic import ValidationError

from app import db
from app.models import Role, Usuario
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MFAChallengeRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UpdateUserRequest,
)
from app.security.decorators import auth_required, permissions_required, roles_required
from app.security.rbac import ensure_roles_permissions, get_user_permissions, normalize_role
from app.security.tokens import find_valid_refresh_token, revoke_all_tokens
from app.services import auth_service
from app.services.auth_service import (
    MFARequired,
    AccountLocked,
    AuthServiceError,
    InvalidCredentials,
    PasswordPolicyError,
    RateLimitExceeded,
)
from app.services.audit_service import audit_event
from app.utils.security import (
    hash_password,
    password_not_reused,
    password_policy_checks,
    register_password_history,
    update_password_metadata,
)


auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
logger = logging.getLogger(__name__)


def _parse(model_cls):
    try:
        return model_cls.model_validate(request.get_json(force=True)), None
    except ValidationError as exc:
        return None, exc.errors()


def _client_context():
    return {
        'ip': request.headers.get('X-Forwarded-For', request.remote_addr),
        'user_agent': request.headers.get('User-Agent'),
    }


def _set_refresh_cookie(response, token: str):
    """Set refresh token as HttpOnly cookie."""
    is_secure = current_app.config.get('PREFERRED_URL_SCHEME', 'https') == 'https'
    max_age = current_app.config.get('REFRESH_TOKEN_EXPIRES', 7) * 24 * 3600
    response.set_cookie(
        'refresh_token',
        value=token,
        httponly=True,
        secure=is_secure,
        samesite='Lax',
        max_age=max_age,
        path='/api/auth'
    )
    return response


def _clear_refresh_cookie(response):
    """Clear refresh token cookie."""
    response.delete_cookie('refresh_token', path='/api/auth')
    return response


@auth_bp.route('/register', methods=['POST'])
@auth_required
@roles_required('admin')
def register_user():
    payload, errors = _parse(RegisterRequest)
    if errors:
        return jsonify({'error': 'Datos invalidos', 'details': errors}), 400
    ctx = _client_context()
    try:
        user = auth_service.register_user(
            nombre=payload.nombre,
            email=payload.email,
            usuario=payload.usuario,
            password=payload.password,
            telefono=payload.telefono,
            role=payload.role or 'operador',
            estado=payload.estado,
            actor=g.current_user,
            ip=ctx['ip'],
            user_agent=ctx['user_agent'],
        )
    except PasswordPolicyError as exc:
        return jsonify({'error': 'Politica de contrasena', 'details': exc.reasons}), 400
    except AuthServiceError as exc:
        return jsonify({'error': str(exc)}), 400
    return jsonify({'id': user.id, 'email': user.email, 'usuario': user.usuario}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    payload, errors = _parse(LoginRequest)
    if errors:
        return jsonify({'error': 'Datos invalidos', 'details': errors}), 400
    ctx = _client_context()
    try:
        result = auth_service.authenticate(
            identifier=payload.identifier,
            password=payload.password,
            ip=ctx['ip'],
            user_agent=ctx['user_agent'],
            mfa_code=payload.mfa_code,
            backup_code=payload.backup_code,
        )
        # Extract refresh_token to send as HttpOnly cookie
        refresh_token = result.pop('refresh_token', None)
        response = make_response(jsonify(result))
        if refresh_token:
            _set_refresh_cookie(response, refresh_token)
        return response
    except RateLimitExceeded as exc:
        return jsonify({'error': 'Demasiados intentos', 'retry_after_seconds': exc.retry_after_seconds}), 429
    except AccountLocked as exc:
        return jsonify({'error': 'Cuenta bloqueada', 'locked_until': exc.until.isoformat() if exc.until else None}), 423
    except MFARequired as exc:
        return jsonify({'mfa_required': True, 'methods': exc.methods}), 202
    except InvalidCredentials as exc:
        return jsonify({'error': str(exc)}), 401
    except AuthServiceError as exc:
        return jsonify({'error': str(exc)}), 400


@auth_bp.route('/logout', methods=['POST'])
@auth_required
def logout():
    # Try to get refresh_token from cookie first, then from body
    refresh_token = request.cookies.get('refresh_token')
    if not refresh_token:
        payload, errors = _parse(RefreshRequest)
        refresh_token = payload.refresh_token if not errors else None
    auth_service.logout(g.current_user, refresh_token)
    response = make_response(jsonify({'status': 'ok'}))
    _clear_refresh_cookie(response)
    return response


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    # Try to get refresh_token from cookie first, then from body
    refresh_token = request.cookies.get('refresh_token')
    if not refresh_token:
        payload, errors = _parse(RefreshRequest)
        if errors:
            return jsonify({'error': 'Datos invalidos', 'details': errors}), 400
        refresh_token = payload.refresh_token
    ctx = _client_context()
    record = find_valid_refresh_token(refresh_token)
    if not record or not record.user:
        return jsonify({'error': 'Refresh token invalido'}), 401
    try:
        data = auth_service.refresh_session(record.user, refresh_token, ip=ctx['ip'], user_agent=ctx['user_agent'])
        # Extract new refresh_token to send as HttpOnly cookie
        new_refresh_token = data.pop('refresh_token', None)
        response = make_response(jsonify(data))
        if new_refresh_token:
            _set_refresh_cookie(response, new_refresh_token)
        return response
    except AuthServiceError as exc:
        return jsonify({'error': str(exc)}), 401


@auth_bp.route('/forgot', methods=['POST'])
def forgot_password():
    payload, errors = _parse(ForgotPasswordRequest)
    if errors:
        return jsonify({'error': 'Datos invalidos', 'details': errors}), 400
    auth_service.start_password_reset(payload.email)
    return jsonify({'status': 'ok'})


@auth_bp.route('/reset', methods=['POST'])
def reset_password():
    payload, errors = _parse(ResetPasswordRequest)
    if errors:
        return jsonify({'error': 'Datos invalidos', 'details': errors}), 400
    try:
        auth_service.complete_password_reset(payload.token, payload.password)
    except PasswordPolicyError as exc:
        return jsonify({'error': 'Politica de contrasena', 'details': exc.reasons}), 400
    except AuthServiceError as exc:
        return jsonify({'error': str(exc)}), 400
    return jsonify({'status': 'ok'})


@auth_bp.route('/mfa/enroll', methods=['POST'])
@auth_required
def mfa_enroll():
    result = auth_service.enroll_mfa(g.current_user)
    return jsonify(result)


@auth_bp.route('/mfa/verify', methods=['POST'])
@auth_required
def mfa_verify():
    payload, errors = _parse(MFAChallengeRequest)
    if errors:
        return jsonify({'error': 'Datos invalidos', 'details': errors}), 400
    try:
        auth_service.activate_mfa(g.current_user, payload.code)
    except AuthServiceError as exc:
        return jsonify({'error': str(exc)}), 400
    return jsonify({'status': 'ok'})


@auth_bp.route('/mfa/disable', methods=['POST'])
@auth_required
def mfa_disable():
    auth_service.disable_mfa(g.current_user)
    return jsonify({'status': 'ok'})


@auth_bp.route('/change-password', methods=['POST'])
@auth_required
def change_password():
    payload, errors = _parse(ChangePasswordRequest)
    if errors:
        return jsonify({'error': 'Datos invalidos', 'details': errors}), 400
    try:
        auth_service.change_password(g.current_user, payload.current_password, payload.new_password)
    except PasswordPolicyError as exc:
        return jsonify({'error': 'Politica de contrasena', 'details': exc.reasons}), 400
    except InvalidCredentials as exc:
        return jsonify({'error': str(exc)}), 401
    return jsonify({'status': 'ok'})


@auth_bp.route('/me', methods=['GET'])
@auth_required
def me():
    user: Usuario = g.current_user
    ensure_roles_permissions()
    data = {
        'id': user.id,
        'email': user.email,
        'usuario': user.usuario,
        'display_name': user.display_name or user.nombre_completo,
        'roles': [role.name for role in user.roles],
        'permissions': sorted(get_user_permissions(user)),
        'mfa_enabled': user.mfa_enabled,
        'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
    }
    return jsonify(data)


@auth_bp.route('/admin/users', methods=['GET'])
@auth_required
@roles_required('admin')
def admin_list_users():
    users = Usuario.query.order_by(Usuario.id.desc()).all()
    return jsonify([
        {
            'id': user.id,
            'email': user.email,
            'usuario': user.usuario,
            'display_name': user.display_name or user.nombre_completo,
            'roles': [role.name for role in user.roles],
            'estado': user.estado,
            'is_active': user.is_active,
            'is_locked': user.is_locked,
            'locked_until': user.locked_until.isoformat() if user.locked_until else None,
            'mfa_enabled': user.mfa_enabled,
            'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
        }
        for user in users
    ])


@auth_bp.route('/admin/users/<int:user_id>', methods=['PATCH'])
@auth_required
@roles_required('admin')
def admin_update_user(user_id: int):
    payload, errors = _parse(UpdateUserRequest)
    if errors:
        return jsonify({'error': 'Datos invalidos', 'details': errors}), 400
    user = Usuario.query.get_or_404(user_id)
    revoke_sessions = False
    if payload.nombre is not None:
        user.nombre_completo = payload.nombre
        user.display_name = payload.nombre
    if payload.telefono is not None:
        user.telefono = payload.telefono
    if payload.estado is not None:
        user.estado = payload.estado
        user.is_active = payload.estado == 'activo'
        if not user.is_active:
            revoke_sessions = True
    if payload.is_active is not None:
        user.is_active = payload.is_active
        if payload.estado is None:
            user.estado = 'activo' if payload.is_active else 'inactivo'
        if not user.is_active:
            revoke_sessions = True
    if payload.roles is not None:
        ensure_roles_permissions()
        normalized_roles = []
        for name in payload.roles:
            normalized = normalize_role(name)
            if normalized not in normalized_roles:
                normalized_roles.append(normalized)
        roles = Role.query.filter(Role.name.in_(normalized_roles)).all()
        role_map = {role.name: role for role in roles}
        missing = [name for name in normalized_roles if name not in role_map]
        if missing:
            return jsonify({'error': 'Roles desconocidos', 'missing': missing}), 400
        user.roles = [role_map[name] for name in normalized_roles]
        if user.roles:
            user.rol = user.roles[0].name
    if payload.clave:
        ok, errors = password_policy_checks(payload.clave)
        if not ok:
            return jsonify({'error': 'Politica de contrasena', 'details': errors}), 400
        hashed = hash_password(payload.clave)
        if not password_not_reused(user, hashed):
            return jsonify({'error': 'Politica de contrasena', 'details': ['No puede reutilizar contrasenas recientes']}), 400
        user.clave_hash = hashed
        update_password_metadata(user)
        register_password_history(user, hashed)
        revoke_sessions = True
        audit_event(
            'password.admin_reset',
            user_id=user.id,
            ip=request.headers.get('X-Forwarded-For', request.remote_addr),
            user_agent=request.headers.get('User-Agent'),
            metadata={'actor': getattr(g, 'current_user', None).id if getattr(g, 'current_user', None) else None},
        )
    if revoke_sessions:
        revoke_all_tokens(user)
    db.session.commit()
    return jsonify({'status': 'ok'})


@auth_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@auth_required
@roles_required('admin')
def admin_delete_user(user_id: int):
    if g.current_user.id == user_id:
        return jsonify({'error': 'No puede eliminar su propio usuario'}), 400
    user = Usuario.query.get_or_404(user_id)
    revoke_all_tokens(user)
    audit_event(
        'user.admin_delete',
        user_id=user.id,
        ip=request.headers.get('X-Forwarded-For', request.remote_addr),
        user_agent=request.headers.get('User-Agent'),
        metadata={'actor': g.current_user.id, 'deleted_user_id': user.id},
    )
    db.session.delete(user)
    db.session.commit()
    return jsonify({'status': 'ok'})

@auth_bp.route('/roles', methods=['GET'])
@auth_required
def get_roles():
    """Devuelve listado de roles disponibles para asignación."""
    from app.security.rbac import ROLE_MATRIX
    
    # Construir lista limpia de roles
    roles_list = []
    seen = set()
    
    # Roles principales
    for role_key in sorted(ROLE_MATRIX.keys()):
        if role_key not in seen:
            roles_list.append({
                "value": role_key,
                "label": role_key.title() if role_key != 'operador' else 'Usuario'
            })
            seen.add(role_key)
            
    return jsonify(roles_list)


@auth_bp.route('/admin/users/<int:user_id>/unlock', methods=['POST'])
@auth_required
@roles_required('admin')
def admin_unlock_user(user_id: int):
    """Desbloquear manualmente una cuenta bloqueada por intentos fallidos."""
    user = Usuario.query.get_or_404(user_id)
    
    if not user.is_locked:
        return jsonify({'error': 'El usuario no está bloqueado'}), 400
    
    # Desbloquear la cuenta
    user.is_locked = False
    user.locked_until = None
    user.failed_login_attempts = 0
    
    audit_event(
        'user.admin_unlock',
        user_id=user.id,
        ip=request.headers.get('X-Forwarded-For', request.remote_addr),
        user_agent=request.headers.get('User-Agent'),
        metadata={'actor': g.current_user.id, 'unlocked_user_id': user.id},
    )
    
    db.session.commit()
    return jsonify({'status': 'ok', 'message': f'Usuario {user.email} desbloqueado exitosamente'})
