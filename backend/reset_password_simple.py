#!/usr/bin/env python3
"""Simple password reset using raw SQL"""
import re
import psycopg2
from werkzeug.security import generate_password_hash
import sys
import os
os.environ.setdefault(
    'DATABASE_URL', 'postgresql://user:password@localhost/dbname')


# Default password
NEW_PASSWORD = "Admin123!@#"

# Hash it
password_hash = generate_password_hash(
    NEW_PASSWORD, method='pbkdf2:sha256', salt_length=16)

# Get DATABASE_URL
db_url = os.environ.get('DATABASE_URL', '')

if not db_url or 'postgresql' not in db_url:
    print("=" * 60)
    print("❌ PostgreSQL DATABASE_URL not configured!")
    print("=" * 60)
    print("\nSet DATABASE_URL environment variable:")
    print('$env:DATABASE_URL="postgresql://user:pass@host/dbname"')
    print("\nOr edit this script with your database credentials.")
    sys.exit(1)

# Parse PostgreSQL URL
match = re.match(r'postgresql://([^:]+):([^@]+)@([^/]+)/(.+)', db_url)
if not match:
    print("Invalid DATABASE_URL format")
    sys.exit(1)

user, password, host, dbname = match.groups()

try:
    # Connect
    conn = psycopg2.connect(
        dbname=dbname,
        user=user,
        password=password,
        host=host.split(':')[0],
        port=host.split(':')[1] if ':' in host else 5432
    )
    cur = conn.cursor()

    # Update admin password
    cur.execute("""
        UPDATE usuarios 
        SET clave_hash = %s,
            failed_login_attempts = 0,
            is_locked = FALSE,
            locked_until = NULL,
            is_active = TRUE,
            estado = 'activo'
        WHERE usuario = 'admin'
        RETURNING usuario, email
    """, (password_hash,))

    result = cur.fetchone()
    conn.commit()

    if result:
        print("=" * 60)
        print("✅ Admin password reset successfully!")
        print("=" * 60)
        print(f"Usuario: {result[0]}")
        print(f"Email:   {result[1]}")
        print(f"Nueva contraseña: {NEW_PASSWORD}")
        print("=" * 60)
    else:
        print("❌ Admin user not found!")

    cur.close()
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
