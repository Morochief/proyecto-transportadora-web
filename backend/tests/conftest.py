"""
conftest.py - Fixtures compartidas para todos los tests del backend.

Estrategia:
- SQLite en memoria para aislar cada sesión de tests (rápido, sin efectos secundarios)
- App con scope 'session' (costosa de crear, se reutiliza en toda la suite)
- DB/client con scope 'function' para limpiar datos entre tests
- Fixtures de tokens separadas para admin, operador y visor
"""

import pytest

from app import create_app, db as _db
from app.models import Role, Usuario
from app.security.passwords import hash_password
from app.security.rbac import ensure_roles_permissions
from app.security.tokens import build_access_payload, encode_jwt


# ──────────────────────────────────────────────────────────────────────────────
# App factory con configuración de tests
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope='session')
def app():
    """
    App Flask con SQLite en memoria.
    Scope=session: se crea una vez para toda la suite; cada test limpia
    sus datos a través del fixture `db`.
    """
    flask_app = create_app()
    flask_app.config.update({
        # Core
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        # JWT
        'SECRET_KEY': 'test-secret-key-not-for-production',
        'JWT_SECRET_KEY': 'test-jwt-secret-not-for-production',
        'JWT_ALGORITHM': 'HS256',
        'JWT_ISSUER': 'proyecto-transportadora-web',
        'JWT_AUDIENCE': 'proyecto-transportadora-clients',
        'ACCESS_TOKEN_EXPIRES': 15,
        'REFRESH_TOKEN_EXPIRES': 7,
        'ROTATE_REFRESH_TOKENS': True,
        # Passwords (relajadas para tests)
        'PASSWORD_MIN_LENGTH': 8,
        'PASSWORD_COMPLEXITY_REGEX': r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$',
        'PASSWORD_HISTORY_SIZE': 3,
        'PASSWORD_EXPIRATION_DAYS': 0,
        # Security (umbrales altos para no interferir)
        'ACCOUNT_LOCK_THRESHOLD': 99,
        'ACCOUNT_LOCK_WINDOW_MINUTES': 15,
        'LOGIN_RATE_LIMIT_PER_MINUTE': 999,
        'LOGIN_RATE_LIMIT_BACKOFF_FACTOR': 2.0,
        # MFA
        'MFA_BACKUP_CODES': 10,
        'MFA_ISSUER': 'ProyectoTransportadora',
        'MFA_ENCRYPTION_KEY': None,
        # Admin seed
        'DEFAULT_ADMIN_EMAIL': 'admin@test.local',
        'DEFAULT_ADMIN_NAME': 'Admin Test',
        'DEFAULT_ADMIN_USERNAME': 'admin',
        'DEFAULT_ADMIN_PASSWORD': 'AdminTest123!',
        # Misc
        'PREFERRED_URL_SCHEME': 'http',
        'REDIS_ENABLED': False,
        'REDIS_URL': None,
        'STRUCTURED_LOGGING': False,
        'ENABLE_SIEM_HOOKS': False,
        'MAIL_LINK_TTL_MINUTES': 30,
        'RESET_TOKEN_EXPIRATION_MINUTES': 30,
        'CORS_ALLOW_ORIGINS': ['*'],
        'FRONTEND_URL': 'http://localhost:3000',
    })
    with flask_app.app_context():
        _db.create_all()
        try:
            ensure_roles_permissions()
        except Exception:
            pass
        yield flask_app
        _db.drop_all()


# ──────────────────────────────────────────────────────────────────────────────
# DB y Client por función (fresh por cada test)
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope='function')
def db(app):
    """
    Proporciona la sesión de base de datos y hace rollback tras cada test.
    Garantiza aislamiento completo entre tests.
    """
    with app.app_context():
        yield _db
        _db.session.rollback()
        # Limpiar tablas que contienen datos de test (en orden para FK)
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()
        # Re-inicializar roles/permisos base
        try:
            ensure_roles_permissions()
        except Exception:
            pass


@pytest.fixture(scope='function')
def client(app, db):
    """Cliente HTTP de Flask para tests de endpoints."""
    return app.test_client()


# ──────────────────────────────────────────────────────────────────────────────
# Helpers internos
# ──────────────────────────────────────────────────────────────────────────────

def _create_user(role_name: str, email: str, usuario: str,
                 password: str = 'TestPass1!') -> Usuario:
    """Crea un usuario con el rol dado y lo persiste."""
    role = Role.query.filter_by(name=role_name).first()
    if not role:
        role = Role(name=role_name, description=f'Rol {role_name}')
        _db.session.add(role)
        _db.session.flush()

    user = Usuario(
        nombre_completo=f'Test {role_name.title()}',
        display_name=f'Test {role_name.title()}',
        email=email,
        usuario=usuario,
        clave_hash=hash_password(password),
        rol=role_name,
        estado='activo',
        is_active=True,
        mfa_enabled=False,
    )
    user.roles.append(role)
    _db.session.add(user)
    _db.session.commit()
    return user


def _make_token(user: Usuario) -> str:
    """Genera un JWT de acceso válido para el usuario."""
    from app.security.rbac import get_user_permissions
    perms = get_user_permissions(user)
    payload = build_access_payload(user, permissions=perms)
    return encode_jwt(payload)


# ──────────────────────────────────────────────────────────────────────────────
# Fixtures de usuarios
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope='function')
def admin_user(db, app):
    with app.app_context():
        return _create_user('admin', 'admin@test.local', 'admin_test',
                            password='AdminTest123!')


@pytest.fixture(scope='function')
def operator_user(db, app):
    with app.app_context():
        return _create_user('operador', 'operador@test.local', 'operador_test')


@pytest.fixture(scope='function')
def viewer_user(db, app):
    with app.app_context():
        return _create_user('visor', 'visor@test.local', 'visor_test')


# ──────────────────────────────────────────────────────────────────────────────
# Fixtures de tokens JWT
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope='function')
def admin_token(admin_user, app):
    """JWT Bearer válido para el usuario admin."""
    with app.app_context():
        user = Usuario.query.get(admin_user.id)
        return _make_token(user)


@pytest.fixture(scope='function')
def operator_token(operator_user, app):
    """JWT Bearer válido para el usuario operador."""
    with app.app_context():
        user = Usuario.query.get(operator_user.id)
        return _make_token(user)


@pytest.fixture(scope='function')
def viewer_token(viewer_user, app):
    """JWT Bearer válido para el usuario visor."""
    with app.app_context():
        user = Usuario.query.get(viewer_user.id)
        return _make_token(user)


# ──────────────────────────────────────────────────────────────────────────────
# Helper público para headers
# ──────────────────────────────────────────────────────────────────────────────

def auth_headers(token: str) -> dict:
    """Devuelve headers con Authorization Bearer + Content-Type JSON."""
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }


# ──────────────────────────────────────────────────────────────────────────────
# Datos de dominio mínimos para crear CRTs
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope='function')
def domain_data(db, app):
    """
    Crea los registros mínimos necesarios para operar con CRTs:
    País, Ciudad, Moneda, Remitente, Destinatario, Transportadora.
    Retorna dict con los IDs de cada entidad.
    """
    from app.models import Ciudad, Moneda, Pais, Remitente, Transportadora

    with app.app_context():
        pais = Pais(nombre='Paraguay', codigo='PY')
        _db.session.add(pais)
        _db.session.flush()

        ciudad = Ciudad(nombre='Asunción', pais_id=pais.id)
        _db.session.add(ciudad)
        _db.session.flush()

        moneda = Moneda(codigo='USD', nombre='Dólar Americano', simbolo='$')
        _db.session.add(moneda)
        _db.session.flush()

        remitente = Remitente(
            nombre='Exportadora Test SA',
            tipo_documento='RUC',
            numero_documento='12345678-9',
            ciudad_id=ciudad.id,
        )
        destinatario = Remitente(
            nombre='Importadora Test SRL',
            tipo_documento='RUC',
            numero_documento='98765432-1',
            ciudad_id=ciudad.id,
        )
        _db.session.add_all([remitente, destinatario])
        _db.session.flush()

        transportadora = Transportadora(
            codigo='TR001',
            nombre='Transportes Test SA',
            ciudad_id=ciudad.id,
        )
        _db.session.add(transportadora)
        _db.session.commit()

        return {
            'pais_id': pais.id,
            'ciudad_id': ciudad.id,
            'moneda_id': moneda.id,
            'remitente_id': remitente.id,
            'destinatario_id': destinatario.id,
            'transportadora_id': transportadora.id,
        }
