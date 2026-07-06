import pytest
from app import create_app
from app import db as _db
from app.security.rbac import ensure_roles_permissions


@pytest.fixture(scope='session')
def app():
    """Create Flask app with test config."""
    app = create_app()
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'SECRET_KEY': 'test-secret-key-for-tests-only',
        'JWT_SECRET_KEY': 'test-jwt-secret-key-for-tests-only',
        'PASSWORD_MIN_LENGTH': 8,
        'PASSWORD_COMPLEXITY_REGEX': r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$',
        'PASSWORD_HISTORY_SIZE': 3,
        'PASSWORD_EXPIRATION_DAYS': 0,
        'ACCOUNT_LOCK_THRESHOLD': 10,
        'LOGIN_RATE_LIMIT_PER_MINUTE': 100,
        'CORS_ALLOW_ORIGINS': 'http://localhost:3000,http://127.0.0.1:3000',
        'FRONTEND_URL': 'http://localhost:3000',
        'STRUCTURED_LOGGING': False,
        'DEFAULT_ADMIN_EMAIL': 'admin@test.local',
        'DEFAULT_ADMIN_USERNAME': 'admin',
        'DEFAULT_ADMIN_PASSWORD': 'AdminTest123!',
        'MFA_ENCRYPTION_KEY': None,
        'PREFERRED_URL_SCHEME': 'http',
    })
    return app


@pytest.fixture(scope='function')
def client(app):
    """Create test client with fresh DB each test."""
    with app.app_context():
        _db.create_all()
        ensure_roles_permissions()
        # Seed admin user
        from app.seeds import ensure_admin_user
        ensure_admin_user()
        yield app.test_client()
        _db.session.rollback()
        _db.drop_all()


@pytest.fixture(scope='function')
def auth_headers(client):
    """Login as admin and return Authorization headers."""
    resp = client.post('/api/auth/login', json={
        'identifier': 'admin',
        'password': 'AdminTest123!',
    })
    assert resp.status_code == 200, f'Login failed: {resp.get_json()}'
    token = resp.get_json()['access_token']
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
