"""Tests para la API REST del sistema Transportadora Web."""


class TestHealth:
    def test_health_endpoint(self, client):
        resp = client.get('/api/health')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['status'] == 'ok'
        assert 'Sistema logistico en linea' in data['message']


class TestAuth:
    def test_login_success(self, client):
        resp = client.post('/api/auth/login', json={
            'identifier': 'admin',
            'password': 'AdminTest123!',
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'access_token' in data
        assert 'user' in data
        assert data['user']['email'] == 'admin@test.local'

    def test_login_invalid_password(self, client):
        resp = client.post('/api/auth/login', json={
            'identifier': 'admin',
            'password': 'WrongPass123!',
        })
        assert resp.status_code == 401

    def test_login_invalid_user(self, client):
        resp = client.post('/api/auth/login', json={
            'identifier': 'noexiste',
            'password': 'SomePass123!',
        })
        assert resp.status_code == 401

    def test_login_validation_error(self, client):
        resp = client.post('/api/auth/login', json={
            'identifier': '',
            'password': '',
        })
        assert resp.status_code == 400

    def test_refresh_no_cookie(self, client):
        """Refresh sin cookie ni token debe dar 401 (no 400)."""
        resp = client.post('/api/auth/refresh', json={})
        assert resp.status_code == 401

    def test_refresh_with_cookie(self, client):
        """Login should set refresh token cookie."""
        login_resp = client.post('/api/auth/login', json={
            'identifier': 'admin',
            'password': 'AdminTest123!',
        })
        assert login_resp.status_code == 200
        set_cookie = login_resp.headers.get('Set-Cookie', '')
        assert 'refresh_token' in set_cookie, 'No refresh cookie set'

    def test_me_authenticated(self, client, auth_headers):
        resp = client.get('/api/auth/me', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['email'] == 'admin@test.local'
        assert 'admin' in data['roles']

    def test_me_unauthenticated(self, client):
        resp = client.get('/api/auth/me')
        assert resp.status_code == 401

    def test_password_policy_endpoint(self, client, auth_headers):
        resp = client.get('/api/security/password-policy', headers=auth_headers)
        assert resp.status_code == 200


class TestPaises:
    def test_list_paises_authenticated(self, client, auth_headers):
        resp = client.get('/api/paises/', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)

    def test_list_paises_unauthenticated(self, client):
        resp = client.get('/api/paises/')
        assert resp.status_code == 401

    def test_create_pais(self, client, auth_headers):
        resp = client.post('/api/paises/', json={
            'codigo': 'XX',
            'nombre': 'Testlandia',
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.get_json()
        assert 'id' in data

    def test_create_pais_missing_fields(self, client, auth_headers):
        resp = client.post('/api/paises/', json={
            'codigo': 'YY',
        }, headers=auth_headers)
        assert resp.status_code == 400

    def test_create_delete_pais(self, client, auth_headers):
        resp = client.post('/api/paises/', json={
            'codigo': 'ZZ',
            'nombre': 'Zululandia',
        }, headers=auth_headers)
        assert resp.status_code == 201
        pais_id = resp.get_json()['id']

        resp = client.delete(f'/api/paises/{pais_id}', headers=auth_headers)
        assert resp.status_code == 200


class TestCiudades:
    def test_crud_flow(self, client, auth_headers):
        # Crear país primero
        resp = client.post('/api/paises/', json={
            'codigo': 'TT',
            'nombre': 'Test',
        }, headers=auth_headers)
        pais_id = resp.get_json()['id']

        # Crear ciudad
        resp = client.post('/api/ciudades/', json={
            'nombre': 'TestCity',
            'pais_id': pais_id,
        }, headers=auth_headers)
        assert resp.status_code == 201
        ciudad_id = resp.get_json()['id']

        # Listar
        resp = client.get('/api/ciudades/', headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.get_json()) >= 1

        # Eliminar
        resp = client.delete(f'/api/ciudades/{ciudad_id}', headers=auth_headers)
        assert resp.status_code == 200
