from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request, g
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
from app.security.rbac import ensure_roles_permissions, get_user_permissions
from app.security.tokens import find_valid_refresh_token
from app.services import auth_service
from app.services.auth_service import (
    MFARequired,
    AccountLocked,
    AuthServiceError,
    InvalidCredentials,
    PasswordPolicyError,
    RateLimitExceeded,
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
        return jsonify(result)
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
    payload, errors = _parse(RefreshRequest)
    refresh_token = payload.refresh_token if not errors else None
    auth_service.logout(g.current_user, refresh_token)
    return jsonify({'status': 'ok'})


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    payload, errors = _parse(RefreshRequest)
    if errors:
        return jsonify({'error': 'Datos invalidos', 'details': errors}), 400
    ctx = _client_context()
    record = find_valid_refresh_token(payload.refresh_token)
    if not record or not record.user:
        return jsonify({'error': 'Refresh token invalido'}), 401
    try:
        data = auth_service.refresh_session(record.user, payload.refresh_token, ip=ctx['ip'], user_agent=ctx['user_agent'])
        return jsonify(data)
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
    if payload.nombre is not None:
        user.nombre_completo = payload.nombre
        user.display_name = payload.nombre
    if payload.telefono is not None:
        user.telefono = payload.telefono
    if payload.estado is not None:
        user.estado = payload.estado
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.roles is not None:
        ensure_roles_permissions()
        roles = Role.query.filter(Role.name.in_(payload.roles)).all()
        role_map = {role.name: role for role in roles}
        missing = [name for name in payload.roles if name not in role_map]
        if missing:
            return jsonify({'error': 'Roles desconocidos', 'missing': missing}), 400
        user.roles = [role_map[name] for name in payload.roles]
        if user.roles:
            user.rol = user.roles[0].name
    db.session.commit()
    return jsonify({'status': 'ok'})
