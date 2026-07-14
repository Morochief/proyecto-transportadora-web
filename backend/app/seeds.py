import secrets

from flask import current_app
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.security.mfa import (
    encrypt_secret,
    generate_backup_codes,
    generate_secret,
    hash_backup_code,
    totp_uri,
)
from app.security.passwords import hash_password
from app.security.rbac import ensure_roles_permissions, sync_legacy_role


def _generate_temp_password() -> str:
    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%&*'
    return ''.join(secrets.choice(alphabet) for _ in range(16))


def ensure_admin_user() -> None:
    from app import db
    from app.models import BackupCode, Role, Usuario

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
        email = cfg.get('DEFAULT_ADMIN_EMAIL')
        username = cfg.get('DEFAULT_ADMIN_USERNAME')
        password = cfg.get('DEFAULT_ADMIN_PASSWORD')

        if not all([email, username, password]):
            if not cfg.get('DEBUG') and not cfg.get('TESTING'):
                raise RuntimeError(
                    "CRÍTICO: DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_USERNAME y "
                    "DEFAULT_ADMIN_PASSWORD deben estar configurados en producción."
                )
            return

        temp_password = password or _generate_temp_password()

        mfa_secret = None
        backup_codes = []
        if not current_app.config.get('TESTING', False):
            mfa_secret = generate_secret()
            encrypted = encrypt_secret(mfa_secret)
            backup_codes = generate_backup_codes(cfg.get('MFA_BACKUP_CODES', 10))
            uri = totp_uri(mfa_secret, cfg['DEFAULT_ADMIN_EMAIL'], cfg.get('MFA_ISSUER', 'ProyectoTransportadora'))

        user = Usuario(
            nombre_completo=cfg['DEFAULT_ADMIN_NAME'],
            display_name=cfg['DEFAULT_ADMIN_NAME'],
            email=cfg['DEFAULT_ADMIN_EMAIL'],
            usuario=cfg['DEFAULT_ADMIN_USERNAME'],
            clave_hash=hash_password(temp_password),
            rol='admin',
            estado='activo',
            is_active=True,
            mfa_secret_encrypted=encrypted if mfa_secret else None,
            mfa_enabled=mfa_secret is not None,
        )

        if backup_codes:
            for raw_code in backup_codes:
                salt, digest = hash_backup_code(raw_code)
                user.backup_codes.append(BackupCode(salt=salt, code_hash=digest))

        user.roles.append(admin_role)
        sync_legacy_role(user)
        db.session.add(user)
        db.session.commit()
        print('============================')
        print('Admin seed creado')
        print(f"Usuario: {user.usuario}")
        print(f"Email:   {user.email}")
        print(f"Clave temporal: {temp_password}")
        print(f"MFA:     {'Habilitado' if mfa_secret else 'Deshabilitado'}")
        if mfa_secret:
            print(f"TOTP URI: {uri}")
            print("Códigos de respaldo (GUARDAR):")
            for i, code in enumerate(backup_codes, 1):
                print(f"  {i}. {code}")
        print('============================')
    except (OperationalError, ProgrammingError):
        db.session.rollback()
