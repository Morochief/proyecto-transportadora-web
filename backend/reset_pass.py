#!/usr/bin/env python3
"""
Simple password reset script - works with current database
Run: python reset_pass.py [new_password]
"""
import sys
from werkzeug.security import generate_password_hash

# Get password from command line or use default
if len(sys.argv) > 1:
    NEW_PASSWORD = sys.argv[1]
else:
    NEW_PASSWORD = "Admin123!@#"

# Generate hash
password_hash = generate_password_hash(NEW_PASSWORD, method='pbkdf2:sha256', salt_length=16)

print("=" * 70)
print("PASSWORD RESET SCRIPT")
print("=" * 70)
print(f"\nNew password: {NEW_PASSWORD}")
print(f"\nPassword hash: {password_hash}")
print("\n" + "=" * 70)
print("OPTION 1: Run this SQL directly in your PostgreSQL client:")
print("=" * 70)
print(f"""
UPDATE usuarios 
SET clave_hash = '{password_hash}',
    failed_login_attempts = 0,
    is_locked = FALSE,
    locked_until = NULL,
    is_active = TRUE,
    estado = 'activo'
WHERE usuario = 'admin';
""")
print("=" * 70)
print("OPTION 2: Run with Flask app context:")
print("=" * 70)
print("python reset_pass_flask.py")
print("=" * 70)
