from functools import wraps
from typing import Callable, Optional

from flask import Response, g, jsonify, request

from app.models import Usuario
from app.security.rbac import get_user_permissions
from app.security.tokens import decode_jwt


def _unauthorized(message: str, status: int = 401) -> Response:
    return jsonify({'error': message}), status


def _load_user_from_token() -> Optional[Usuario]:
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ', 1)[1].strip()
    try:
        payload = decode_jwt(token)
    except ValueError:
        return None
    user = Usuario.query.get(int(payload['sub']))
    if not user or not user.is_active or user.estado != 'activo':
        return None
    g.jwt_payload = payload
    return user


def auth_required(fn: Callable) -> Callable:
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = getattr(g, 'current_user', None)
        if not user:
            user = _load_user_from_token()
        if not user:
            return _unauthorized('Autenticacion requerida')
        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def permissions_required(*permission_keys: str) -> Callable:
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user:
                user = _load_user_from_token()
            if not user:
                return _unauthorized('Autenticacion requerida')
            user_permissions = get_user_permissions(user)
            missing = [perm for perm in permission_keys if perm not in user_permissions]
            if missing:
                return _unauthorized('Permisos insuficientes', status=403)
            g.current_user = user
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def roles_required(*roles: str) -> Callable:
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user:
                user = _load_user_from_token()
            if not user:
                return _unauthorized('Autenticacion requerida')
            user_roles = {role.name for role in user.roles}
            if not any(role in user_roles for role in roles):
                return _unauthorized('Rol no autorizado', status=403)
            g.current_user = user
            return fn(*args, **kwargs)

        return wrapper

    return decorator
