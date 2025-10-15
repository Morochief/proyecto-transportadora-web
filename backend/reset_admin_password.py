#!/usr/bin/env python3
"""
Script to reset admin user password
"""
import sys
from app import create_app, db
from app.models import Usuario
from app.security.passwords import hash_password


def reset_admin_password(new_password=None):
    """Reset admin user password"""
    app = create_app()

    with app.app_context():
        # Find admin user
        admin = Usuario.query.filter_by(usuario='admin').first()

        if not admin:
            print("❌ Admin user not found!")
            return False

        # If no password provided, generate a simple one
        if not new_password:
            new_password = "Admin123!@#"

        # Hash the new password
        admin.clave_hash = hash_password(new_password)

        # Reset login attempts and unlock account
        admin.failed_login_attempts = 0
        admin.is_locked = False
        admin.locked_until = None
        admin.is_active = True
        admin.estado = 'activo'

        # Save changes
        db.session.commit()

        print("=" * 60)
        print("✅ Admin password reset successfully!")
        print("=" * 60)
        print(f"Usuario: {admin.usuario}")
        print(f"Email:   {admin.email}")
        print(f"Nueva contraseña: {new_password}")
        print("=" * 60)
        print("\nNOTA: Cambia esta contraseña después de iniciar sesión.")

        return True


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Use password from command line
        password = sys.argv[1]
        reset_admin_password(password)
    else:
        # Use default password
        reset_admin_password()
