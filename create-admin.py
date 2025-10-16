#!/usr/bin/env python3
"""Script para crear usuario administrador"""
from app.security.rbac import ensure_roles_permissions
from app.security.passwords import hash_password
from app.models import Usuario, Role
from app import create_app, db
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))


def create_admin():
    app = create_app()
    with app.app_context():
        # Ensure roles exist
        ensure_roles_permissions()

        # Check if admin already exists
        admin_role = Role.query.filter_by(name='admin').first()
        if not admin_role:
            print("❌ Admin role not found")
            return

        existing = Usuario.query.filter_by(usuario='admin').first()
        if existing:
            print("✅ Admin user already exists")
            print(f"   Username: admin")
            print(f"   Email: {existing.email}")
            print("   Password: Use password reset if you don't know it")
            return

        # Create admin user with simple password for first login
        password = "Admin123!"
        user = Usuario(
            nombre_completo="Super Administrador",
            display_name="Super Administrador",
            email="admin@transportadora.local",
            usuario="admin",
            clave_hash=hash_password(password),
            rol='admin',
            estado='activo',
            is_active=True,
        )
        user.roles.append(admin_role)
        db.session.add(user)
        db.session.commit()

        print("============================")
        print("✅ Admin user created successfully!")
        print(f"   Username: admin")
        print(f"   Email: admin@transportadora.local")
        print(f"   Password: {password}")
        print("============================")
        print("⚠️  Please change this password after first login!")


if __name__ == '__main__':
    create_admin()
