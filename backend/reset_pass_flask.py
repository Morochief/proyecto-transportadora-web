#!/usr/bin/env python3
"""
Flask app context password reset - uses your DATABASE_URL
Set DATABASE_URL environment variable first!
"""
import sys
import os

# CONFIGURE YOUR DATABASE HERE:
# Uncomment and edit this line with your PostgreSQL credentials:
# os.environ['DATABASE_URL'] = 'postgresql://username:password@host:port/database'

from app import create_app, db
from app.models import Usuario
from app.security.passwords import hash_password

def reset_password(new_pass=None):
    """Reset admin password"""
    if not new_pass:
        new_pass = "Admin123!@#"
    
    app = create_app()
    
    with app.app_context():
        print("\n" + "=" * 70)
        print(f"Database: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print("=" * 70)
        
        # Find admin
        admin = Usuario.query.filter_by(usuario='admin').first()
        
        if not admin:
            print("❌ Admin user not found!")
            print("\nListing all users:")
            users = Usuario.query.all()
            for u in users:
                print(f"  - {u.usuario} ({u.email})")
            return False
        
        # Reset password
        admin.clave_hash = hash_password(new_pass)
        admin.failed_login_attempts = 0
        admin.is_locked = False
        admin.locked_until = None
        admin.is_active = True
        admin.estado = 'activo'
        
        db.session.commit()
        
        print("\n✅ PASSWORD RESET SUCCESSFUL!")
        print("=" * 70)
        print(f"Usuario:  {admin.usuario}")
        print(f"Email:    {admin.email}")
        print(f"Password: {new_pass}")
        print("=" * 70)
        print("\n⚠️  Please change this password after logging in!")
        print()
        
        return True

if __name__ == "__main__":
    password = sys.argv[1] if len(sys.argv) > 1 else None
    reset_password(password)
