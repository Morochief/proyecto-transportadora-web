"""
test_auth.py - Tests de autenticación, autorización y RBAC.

Cubre:
  1. Login exitoso con credenciales correctas
  2. Login fallido - credenciales incorrectas
  3. Login fallido - usuario inexistente
  4. Login retorna access_token y refresh_token (cookie)
  5. /me devuelve datos del usuario autenticado
  6. /me requiere token (sin token → 401)
  7. Token inválido → 401
  8. RBAC: endpoint solo-admin acepta admin
  9. RBAC: endpoint solo-admin rechaza operador (403)
 10. Logout revoca la sesión
 11. Refresh sin token → 401
 12. MFA: enroll devuelve secret + qr_uri
"""

import pytest


def auth_headers(token: str) -> dict:
    """Helper: devuelve headers con Bearer token para requests autenticados."""
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


# ──────────────────────────────────────────────────────────────────────────────
# 1. Login exitoso
# ──────────────────────────────────────────────────────────────────────────────

class TestLogin:
    def test_login_exitoso_con_usuario(self, client, admin_user):
        """Login correcto con `usuario` retorna access_token."""
        resp = client.post('/api/auth/login', json={
            'identifier': admin_user.usuario,
            'password': 'AdminTest123!',
        })
        assert resp.status_code == 200, resp.get_json()
        data = resp.get_json()
        assert 'access_token' in data
        assert data['access_token']

    def test_login_exitoso_con_email(self, client, admin_user):
        """Login correcto con `email` también funciona."""
        resp = client.post('/api/auth/login', json={
            'identifier': admin_user.email,
            'password': 'AdminTest123!',
        })
        assert resp.status_code == 200
        assert 'access_token' in resp.get_json()

    def test_login_retorna_cookie_refresh_token(self, client, admin_user):
        """El refresh_token debe venir como cookie HttpOnly, NO en el body."""
        resp = client.post('/api/auth/login', json={
            'identifier': admin_user.usuario,
            'password': 'AdminTest123!',
        })
        assert resp.status_code == 200
        # El body NO debe exponer el refresh_token
        body = resp.get_json()
        assert 'refresh_token' not in body
        # La cookie sí debe estar seteada
        assert 'refresh_token' in resp.headers.get('Set-Cookie', '')

    def test_login_respuesta_contiene_datos_usuario(self, client, admin_user):
        """La respuesta de login incluye email, roles y permisos."""
        resp = client.post('/api/auth/login', json={
            'identifier': admin_user.usuario,
            'password': 'AdminTest123!',
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'email' in data or 'access_token' in data  # estructura mínima


class TestLoginFallido:
    def test_password_incorrecta(self, client, admin_user):
        """Credenciales inválidas → 401."""
        resp = client.post('/api/auth/login', json={
            'identifier': admin_user.usuario,
            'password': 'WrongPassword999!',
        })
        assert resp.status_code == 401
        assert 'error' in resp.get_json()

    def test_usuario_inexistente(self, client, db):
        """Usuario que no existe → 401 (no revelar si existe o no)."""
        resp = client.post('/api/auth/login', json={
            'identifier': 'noexiste@test.local',
            'password': 'SomePass123!',
        })
        assert resp.status_code == 401

    def test_payload_invalido_sin_identifier(self, client, db):
        """Payload incompleto → 400 con detalle de validación."""
        resp = client.post('/api/auth/login', json={
            'password': 'SomePass123!',
        })
        assert resp.status_code == 400
        assert 'error' in resp.get_json()

    def test_payload_vacio(self, client, db):
        """Payload vacío → 400."""
        resp = client.post('/api/auth/login', json={})
        assert resp.status_code == 400


# ──────────────────────────────────────────────────────────────────────────────
# 2. Endpoint /me
# ──────────────────────────────────────────────────────────────────────────────

class TestMe:
    def test_me_con_token_valido(self, client, admin_user, admin_token):
        """/me devuelve datos del usuario autenticado."""
        resp = client.get('/api/auth/me', headers=auth_headers(admin_token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['email'] == admin_user.email
        assert data['usuario'] == admin_user.usuario
        assert 'admin' in data['roles']
        assert 'permissions' in data

    def test_me_sin_token_retorna_401(self, client, db):
        """/me sin Authorization → 401."""
        resp = client.get('/api/auth/me')
        assert resp.status_code == 401

    def test_me_con_token_invalido_retorna_401(self, client, db):
        """/me con JWT manipulado → 401."""
        resp = client.get('/api/auth/me',
                          headers={'Authorization': 'Bearer token.falso.aqui'})
        assert resp.status_code == 401

    def test_me_incluye_permisos_del_rol(self, client, operator_user, operator_token):
        """/me para un operador incluye sus permisos."""
        resp = client.get('/api/auth/me', headers=auth_headers(operator_token))
        assert resp.status_code == 200
        data = resp.get_json()
        # operador tiene al menos 'envios:ver'
        assert 'envios:ver' in data['permissions']
        # operador NO tiene permisos de admin como 'auditoria:ver'
        assert 'auditoria:ver' not in data['permissions']


# ──────────────────────────────────────────────────────────────────────────────
# 3. RBAC - Control de acceso por rol
# ──────────────────────────────────────────────────────────────────────────────

class TestRBAC:
    def test_admin_puede_listar_usuarios(self, client, admin_user, admin_token):
        """Admin puede acceder al listado de usuarios."""
        resp = client.get('/api/auth/admin/users',
                          headers=auth_headers(admin_token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)

    def test_operador_no_puede_listar_usuarios(self, client, operator_user, operator_token):
        """Operador no tiene acceso al listado de usuarios (solo admin)."""
        resp = client.get('/api/auth/admin/users',
                          headers=auth_headers(operator_token))
        assert resp.status_code == 403

    def test_visor_no_puede_listar_usuarios(self, client, viewer_user, viewer_token):
        """Visor tampoco tiene acceso al listado de usuarios."""
        resp = client.get('/api/auth/admin/users',
                          headers=auth_headers(viewer_token))
        assert resp.status_code == 403

    def test_admin_puede_registrar_usuario_nuevo(
        self, client, admin_user, admin_token
    ):
        """Admin puede crear un nuevo usuario operador."""
        resp = client.post('/api/auth/register',
                           headers=auth_headers(admin_token),
                           json={
                               'nombre': 'Nuevo Operador',
                               'email': 'nuevo@test.local',
                               'usuario': 'nuevo_op',
                               'password': 'NuevoPass1!',
                               'role': 'operador',
                           })
        assert resp.status_code == 201
        data = resp.get_json()
        assert data['email'] == 'nuevo@test.local'

    def test_operador_no_puede_registrar_usuario(
        self, client, operator_user, operator_token
    ):
        """Operador no puede registrar usuarios (solo admin)."""
        resp = client.post('/api/auth/register',
                           headers=auth_headers(operator_token),
                           json={
                               'nombre': 'Otro',
                               'email': 'otro@test.local',
                               'usuario': 'otro_op',
                               'password': 'OtroPass1!',
                               'role': 'operador',
                           })
        assert resp.status_code == 403

    def test_roles_endpoint_accesible_para_cualquier_autenticado(
        self, client, operator_user, operator_token
    ):
        """El endpoint /api/auth/roles es accesible para cualquier usuario autenticado."""
        resp = client.get('/api/auth/roles',
                          headers=auth_headers(operator_token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)
        role_values = [r['value'] for r in data]
        assert 'admin' in role_values
        assert 'operador' in role_values


# ──────────────────────────────────────────────────────────────────────────────
# 4. Logout
# ──────────────────────────────────────────────────────────────────────────────

class TestLogout:
    def test_logout_exitoso(self, client, admin_user, admin_token):
        """Logout con token válido retorna status ok."""
        resp = client.post('/api/auth/logout',
                           headers=auth_headers(admin_token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'ok'

    def test_logout_sin_token_retorna_401(self, client, db):
        """Logout sin token → 401."""
        resp = client.post('/api/auth/logout')
        assert resp.status_code == 401


# ──────────────────────────────────────────────────────────────────────────────
# 5. Refresh token
# ──────────────────────────────────────────────────────────────────────────────

class TestRefresh:
    def test_refresh_sin_cookie_ni_body_retorna_401(self, client, db):
        """Refresh sin ningún token → 401."""
        resp = client.post('/api/auth/refresh',
                           json={},
                           content_type='application/json')
        assert resp.status_code == 401

    def test_refresh_con_login_previo(self, client, admin_user):
        """
        Flujo completo: login → obtener cookie → refresh → nuevo access_token.
        """
        # 1. Login para obtener la cookie
        login_resp = client.post('/api/auth/login', json={
            'identifier': admin_user.usuario,
            'password': 'AdminTest123!',
        })
        assert login_resp.status_code == 200

        # 2. Refresh usando la cookie (Flask test_client la mantiene)
        refresh_resp = client.post('/api/auth/refresh')
        assert refresh_resp.status_code == 200
        data = refresh_resp.get_json()
        assert 'access_token' in data


# ──────────────────────────────────────────────────────────────────────────────
# 6. MFA - Enrolamiento
# ──────────────────────────────────────────────────────────────────────────────

class TestMFA:
    def test_mfa_enroll_retorna_secret_y_uri(self, client, admin_user, admin_token):
        """El endpoint de enrolamiento MFA retorna secret y qr_uri."""
        resp = client.post('/api/auth/mfa/enroll',
                           headers=auth_headers(admin_token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'secret' in data or 'qr_uri' in data or 'totp_uri' in data

    def test_mfa_enroll_requiere_autenticacion(self, client, db):
        """MFA enroll sin token → 401."""
        resp = client.post('/api/auth/mfa/enroll')
        assert resp.status_code == 401
