#!/bin/bash
set -e

echo "=== Backend Initialization ==="

# Esperar a que PostgreSQL esté disponible
echo "Waiting for PostgreSQL..."
while ! pg_isready -h db -p 5432 > /dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL is ready!"

# Install dependencies in development mode
if [ -f requirements.txt ]; then
    echo "Installing Python dependencies..."
    pip install --user --no-cache-dir -r requirements.txt
fi

# Run migrations
echo "Running database migrations..."
flask db upgrade

# Crear usuario admin si no existe
echo "Ensuring admin user exists..."
python -c "
from app import create_app
from app.seeds import ensure_admin_user
app = create_app()
with app.app_context():
    ensure_admin_user()
"

echo "=== Initialization complete ==="

# Ejecutar comando pasado al contenedor
exec "$@"
