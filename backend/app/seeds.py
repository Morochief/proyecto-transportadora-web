import secrets

from flask import current_app
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.security.passwords import hash_password
from app.security.rbac import ensure_roles_permissions, sync_legacy_role


def _generate_temp_password() -> str:
    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%&*'
    return ''.join(secrets.choice(alphabet) for _ in range(16))


def ensure_admin_user() -> None:
    from app import db
    from app.models import Role, Usuario

    try:
        ensure_roles_permissions()
        admin_role = Role.query.filter_by(name='admin').first()
        if not admin_role:
            db.session.commit()
            return
        existing_admin = (
            Usuario.query
            .join(Usuario.roles)
            .filter(Role.name == 'admin')
            .first()
        )
        if existing_admin:
            return

        cfg = current_app.config
        temp_password = _generate_temp_password()
        user = Usuario(
            nombre_completo=cfg['DEFAULT_ADMIN_NAME'],
            display_name=cfg['DEFAULT_ADMIN_NAME'],
            email=cfg['DEFAULT_ADMIN_EMAIL'],
            usuario=cfg['DEFAULT_ADMIN_USERNAME'],
            clave_hash=hash_password(temp_password),
            rol='admin',
            estado='activo',
            is_active=True,
        )
        user.roles.append(admin_role)
        sync_legacy_role(user)
        db.session.add(user)
        db.session.commit()
        print('============================')
        print('Admin seed creado')
        print(f"Usuario: {user.usuario}")
        print(f"Email:   {user.email}")
        print(f"Clave temporal: {temp_password}")
        print('============================')
    except (OperationalError, ProgrammingError):
        db.session.rollback()
