import pytest
from flask import Flask

from app.security.mfa import generate_secret, verify_totp
from app.security.passwords import hash_password, password_policy_checks, verify_password


@pytest.fixture
def app_context():
  app = Flask(__name__)
  app.config['PASSWORD_MIN_LENGTH'] = 12
  app.config['PASSWORD_COMPLEXITY_REGEX'] = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$'
  app.config['PASSWORD_HISTORY_SIZE'] = 5
  app.config['PASSWORD_EXPIRATION_DAYS'] = 0
  with app.app_context():
    yield


def test_password_hash_and_verify(app_context):
  raw = 'ClaveSegura123!'
  hashed = hash_password(raw)
  assert hashed != raw
  assert verify_password(raw, hashed)
  assert not verify_password('otraClave', hashed)


def test_password_policy_check(app_context):
  ok, errors = password_policy_checks('ClaveSegura123!')
  assert ok
  assert errors == []
  ko, errors = password_policy_checks('short')
  assert not ko
  assert errors


def test_totp_generation(app_context):
  secret = generate_secret()
  assert len(secret) >= 16
  # Using pyotp through verify function to ensure code is correct in current window
  import pyotp
  totp = pyotp.TOTP(secret)
  code = totp.now()
  assert verify_totp(secret, code)
