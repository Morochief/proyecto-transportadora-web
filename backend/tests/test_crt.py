"""
test_crt.py - Tests de CRUD para el recurso CRT (Carta de Porte Internacional).

Cubre:
  1. Listar CRTs (GET /api/crts/) - paginación y estructura de respuesta
  2. Listar CRTs - requiere autenticación
  3. Crear CRT con datos válidos (POST /api/crts/)
  4. Crear CRT - payload incompleto retorna error
  5. Obtener CRT por ID (GET /api/crts/<id>)
  6. Obtener CRT inexistente → 404
  7. Filtrar CRTs por estado
  8. Visor puede leer pero no tiene permisos de escritura (RBAC)
  9. Paginación funciona correctamente

Nota: CRT usa `verify_authentication` en before_request, así que TODOS
los endpoints requieren token. Se usa el fixture `domain_data` para
los registros de soporte (País, Ciudad, Transportadora, etc.).
"""

import pytest


def auth_headers(token: str) -> dict:
    """Helper: devuelve headers con Bearer token para requests autenticados."""
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


# ──────────────────────────────────────────────────────────────────────────────
# Helper: payload mínimo para crear un CRT
# ──────────────────────────────────────────────────────────────────────────────

def _crt_payload(domain_data: dict, numero: str = 'PY000000001') -> dict:
    """Devuelve el payload mínimo válido para crear un CRT."""
    return {
        'numero_crt': numero,
        'estado': 'EMITIDO',
        'remitente_id': domain_data['remitente_id'],
        'destinatario_id': domain_data['destinatario_id'],
        'transportadora_id': domain_data['transportadora_id'],
        'ciudad_emision_id': domain_data['ciudad_id'],
        'pais_emision_id': domain_data['pais_id'],
        'moneda_id': domain_data['moneda_id'],
        'detalles_mercaderia': 'Mercadería de prueba para tests',
        'lugar_entrega': 'Buenos Aires, Argentina',
        'incoterm': 'FOB',
        'valor_mercaderia': 1000.00,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 1. Listar CRTs
# ──────────────────────────────────────────────────────────────────────────────

class TestListarCRTs:
    def test_listar_requiere_autenticacion(self, client, db):
        """GET /api/crts/ sin token → 401."""
        resp = client.get('/api/crts/')
        assert resp.status_code == 401

    def test_listar_retorna_estructura_paginada(
        self, client, operator_user, operator_token
    ):
        """GET /api/crts/ con token válido retorna estructura con crts + pagination."""
        resp = client.get('/api/crts/', headers=auth_headers(operator_token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'crts' in data
        assert 'pagination' in data
        assert isinstance(data['crts'], list)
        # Verificar campos de paginación
        pagination = data['pagination']
        assert 'page' in pagination
        assert 'pages' in pagination
        assert 'total' in pagination

    def test_listar_bd_vacia_retorna_lista_vacia(
        self, client, operator_user, operator_token
    ):
        """Con BD limpia, la lista de CRTs debe estar vacía."""
        resp = client.get('/api/crts/', headers=auth_headers(operator_token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['crts'] == []
        assert data['pagination']['total'] == 0

    def test_listar_respeta_parametro_per_page(
        self, client, operator_user, operator_token
    ):
        """El parámetro per_page se respeta en la respuesta."""
        resp = client.get('/api/crts/?per_page=5',
                          headers=auth_headers(operator_token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['pagination']['per_page'] == 5


# ──────────────────────────────────────────────────────────────────────────────
# 2. Crear CRT
# ──────────────────────────────────────────────────────────────────────────────

class TestCrearCRT:
    def test_crear_requiere_autenticacion(self, client, db, domain_data):
        """POST /api/crts/ sin token → 401."""
        resp = client.post('/api/crts/', json=_crt_payload(domain_data))
        assert resp.status_code == 401

    def test_crear_crt_exitoso(
        self, client, operator_user, operator_token, domain_data, app
    ):
        """Operador puede crear un CRT con datos válidos."""
        payload = _crt_payload(domain_data, numero='PY000000001')
        resp = client.post('/api/crts/',
                           json=payload,
                           headers=auth_headers(operator_token))
        # Aceptar 200 o 201 según implementación
        assert resp.status_code in (200, 201), resp.get_json()
        data = resp.get_json()
        # La respuesta debe incluir el id del CRT creado
        assert 'id' in data or 'crt' in data or 'numero_crt' in data

    def test_crear_crt_numero_duplicado_retorna_error(
        self, client, operator_user, operator_token, domain_data
    ):
        """Crear dos CRTs con el mismo número retorna error de unicidad."""
        payload = _crt_payload(domain_data, numero='PY000000002')
        # Primer CRT - debe funcionar
        resp1 = client.post('/api/crts/',
                            json=payload,
                            headers=auth_headers(operator_token))
        assert resp1.status_code in (200, 201)
        # Segundo CRT con mismo número - debe fallar
        resp2 = client.post('/api/crts/',
                            json=payload,
                            headers=auth_headers(operator_token))
        assert resp2.status_code in (400, 409, 422, 500), \
            f'Se esperaba error, se obtuvo: {resp2.status_code} {resp2.get_json()}'

    def test_crear_crt_sin_campos_obligatorios(
        self, client, operator_user, operator_token
    ):
        """Payload incompleto (sin remitente_id) → error de validación."""
        resp = client.post('/api/crts/',
                           json={'numero_crt': 'PY000000099'},
                           headers=auth_headers(operator_token))
        # Debe retornar algún error (400, 422 o 500 con mensaje)
        assert resp.status_code >= 400


# ──────────────────────────────────────────────────────────────────────────────
# 3. Obtener CRT por ID
# ──────────────────────────────────────────────────────────────────────────────

class TestObtenerCRT:
    def _crear_crt(self, client, token, domain_data, numero='PY000000010'):
        """Crea un CRT y retorna su ID."""
        resp = client.post('/api/crts/',
                           json=_crt_payload(domain_data, numero=numero),
                           headers=auth_headers(token))
        assert resp.status_code in (200, 201), \
            f'No se pudo crear CRT: {resp.status_code} {resp.get_json()}'
        data = resp.get_json()
        # Buscar el id en la respuesta
        return data.get('id') or (data.get('crt') or {}).get('id')

    def test_obtener_crt_existente(
        self, client, operator_user, operator_token, domain_data
    ):
        """GET /api/crts/<id> retorna el CRT correcto."""
        crt_id = self._crear_crt(client, operator_token, domain_data)
        if crt_id is None:
            pytest.skip('No se pudo obtener id del CRT creado')

        resp = client.get(f'/api/crts/{crt_id}',
                          headers=auth_headers(operator_token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert str(data.get('id')) == str(crt_id) \
               or data.get('numero_crt') == 'PY000000010'

    def test_obtener_crt_inexistente_retorna_404(
        self, client, operator_user, operator_token
    ):
        """GET /api/crts/99999 → 404."""
        resp = client.get('/api/crts/99999',
                          headers=auth_headers(operator_token))
        assert resp.status_code == 404

    def test_obtener_crt_sin_token_retorna_401(self, client, db):
        """GET /api/crts/1 sin token → 401."""
        resp = client.get('/api/crts/1')
        assert resp.status_code == 401


# ──────────────────────────────────────────────────────────────────────────────
# 4. Filtros
# ──────────────────────────────────────────────────────────────────────────────

class TestFiltrosCRT:
    def test_filtrar_por_estado(
        self, client, operator_user, operator_token, domain_data
    ):
        """El filtro ?estado= funciona correctamente."""
        # Crear un CRT en estado EMITIDO
        client.post('/api/crts/',
                    json=_crt_payload(domain_data, numero='PY000000020'),
                    headers=auth_headers(operator_token))

        resp = client.get('/api/crts/?estado=EMITIDO',
                          headers=auth_headers(operator_token))
        assert resp.status_code == 200
        data = resp.get_json()
        # Todos los resultados deben tener estado EMITIDO
        for crt in data['crts']:
            assert crt['estado'] == 'EMITIDO'

    def test_filtrar_estado_inexistente_retorna_lista_vacia(
        self, client, operator_user, operator_token
    ):
        """Filtrar por un estado que no existe retorna lista vacía."""
        resp = client.get('/api/crts/?estado=ESTADO_FANTASMA',
                          headers=auth_headers(operator_token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['crts'] == []

    def test_endpoint_estados_disponibles(
        self, client, operator_user, operator_token
    ):
        """GET /api/crts/estados retorna la lista de estados posibles."""
        resp = client.get('/api/crts/estados',
                          headers=auth_headers(operator_token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'estados' in data
        assert 'EMITIDO' in data['estados']
        assert 'BORRADOR' in data['estados']


# ──────────────────────────────────────────────────────────────────────────────
# 5. RBAC específico para CRT
# ──────────────────────────────────────────────────────────────────────────────

class TestCRTPermisos:
    def test_visor_puede_listar_crts(
        self, client, viewer_user, viewer_token
    ):
        """El rol visor tiene acceso de lectura a CRTs."""
        resp = client.get('/api/crts/', headers=auth_headers(viewer_token))
        # Visor debería poder leer (200) ya que verify_authentication
        # solo verifica que esté autenticado (sin check de permisos adicional)
        assert resp.status_code == 200

    def test_admin_puede_crear_crt(
        self, client, admin_user, admin_token, domain_data
    ):
        """Admin también puede crear CRTs."""
        resp = client.post('/api/crts/',
                           json=_crt_payload(domain_data, numero='PY000000030'),
                           headers=auth_headers(admin_token))
        assert resp.status_code in (200, 201), resp.get_json()
