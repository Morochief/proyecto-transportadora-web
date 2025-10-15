from typing import Iterable, Set

from flask import current_app

PERMISSIONS_BASE = {
    'envios:crear',
    'envios:ver',
    'envios:editar',
    'envios:borrar',
    'transportes:crear',
    'transportes:ver',
    'transportes:editar',
    'transportes:borrar',
    'usuarios:ver',
    'usuarios:crear',
    'usuarios:editar',
    'usuarios:bloquear',
    'reportes:ver',
    'mfa:gestionar',
    'auditoria:ver',
}

ROLE_MATRIX = {
    'admin': PERMISSIONS_BASE,
    'operador': {
        'envios:crear', 'envios:ver', 'envios:editar',
        'transportes:crear', 'transportes:ver', 'transportes:editar',
        'reportes:ver',
    },
    'visor': {
        'envios:ver', 'transportes:ver', 'reportes:ver'
    },
}


def ensure_roles_permissions() -> None:
    from app import db
    from app.models import Permission, Role, RolePermission

    existing_permissions = {p.key: p for p in Permission.query.all()}
    for perm_key in sorted(PERMISSIONS_BASE):
        if perm_key not in existing_permissions:
            db.session.add(Permission(
                key=perm_key, description=perm_key.replace(':', ' ').title()))
    db.session.flush()

    permissions = {p.key: p for p in Permission.query.all()}
    for role_name, perms in ROLE_MATRIX.items():
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            role = Role(name=role_name, description=f"Rol {role_name}")
            db.session.add(role)
            db.session.flush()
        current = {rp.permission.key for rp in role.role_permission_links}
        missing = set(perms) - current
        for perm_key in missing:
            db.session.add(RolePermission(role_id=role.id,
                           permission_id=permissions[perm_key].id))
    db.session.commit()


def get_user_permissions(user) -> Set[str]:
    """Get all permissions for a user based on their roles."""
    perm_keys: Set[str] = set()
    for role in user.roles:
        perm_keys.update({perm.key for perm in role.permissions})
    return perm_keys


def user_has_permission(user, permission: str) -> bool:
    """Check if user has a specific permission."""
    return permission in get_user_permissions(user)


def sync_legacy_role(user) -> None:
    """Sync legacy 'rol' field with new roles system."""
    from app.models import Role

    if user.rol and not any(role.name == user.rol for role in user.roles):
        role = Role.query.filter_by(name=user.rol).first()
        if role:
            user.roles.append(role)
        else:
            default_role = Role.query.filter_by(name='operador').first()
            if default_role:
                user.roles.append(default_role)
    if user.roles:
        user.rol = user.roles[0].name
    else:
        user.rol = 'operador'
