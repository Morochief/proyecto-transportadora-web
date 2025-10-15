# Sistema de Transporte � M�dulo de Autenticaci�n/Autorizaci�n

Este proyecto incorpora un m�dulo integral de autenticaci�n, autorizaci�n y observabilidad SOC sobre la plataforma log�stica existente (Flask + SQLAlchemy en el backend y React en el frontend).

## Caracter�sticas clave
- **JWT de corta duraci�n** (15 min) con refresh tokens rotativos (7 d�as) almacenados cifrados y auditados.
- **RBAC** con roles (dmin, operador, isor) y permisos finos (envios:*, usuarios:*, etc.).
- **MFA TOTP (RFC 6238)** con enrolamiento, c�digos de respaldo y revocaci�n.
- **Pol�tica de contrase�as**: m�nimo 12 caracteres, complejidad obligatoria, historial (N=5) y bloqueo tras intentos fallidos.
- **Rate limiting** y bloqueo temporal de cuentas tras 10 intentos/15min.
- **Auditor�a estructurada** en tabla udit_logs + hook opcional a SIEM.
- **Esquemas Pydantic** para validar las solicitudes de auth.
- **OpenAPI** expuesto en GET /api/docs con ejemplos de requests/responses.
- **Mailhog** para pruebas de recuperaci�n de contrase�a.
- **Tests unitarios b�sicos** de hashing/TOTP (pytest).
- **Docker Compose** con backend, frontend, PostgreSQL, Mailhog y pgAdmin.

## Configuraci�n r�pida
1. Copi� el ejemplo de entorno y personaliz� secretos:
   `ash
   cp .env.example .env
   `
2. Levant� toda la pila con Docker Compose:
   `ash
   docker compose up --build
   `
   Servicios expuestos:
   - API Flask: http://localhost:5000
   - Frontend CRA: http://localhost:3000
   - Mailhog UI (SMTP de prueba): http://localhost:8025
   - pgAdmin: http://localhost:5050
3. Primer arranque: se crea autom�ticamente un usuario admin (DEFAULT_ADMIN_*). La consola imprime la clave temporal.

### Desarrollo sin Docker
`ash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
make backend-install
make backend-test  # opcional
cd frontend && npm install && npm start
`
Asegurate de que DATABASE_URL apunte a tu instancia local.

## Endpoints principales
| M�todo | Path | Descripci�n |
| ------ | ---- | ----------- |
| POST | /api/auth/register | Alta de usuario (requiere rol dmin). |
| POST | /api/auth/login | Inicio de sesi�n (maneja MFA). |
| POST | /api/auth/logout | Revoca refresh token. |
| POST | /api/auth/refresh | Entrega nuevo access token. |
| POST | /api/auth/forgot | Env�o de enlace de recuperaci�n. |
| POST | /api/auth/reset | Aplica nueva clave con token. |
| POST | /api/auth/mfa/enroll | Genera secreto, QR y c�digos de respaldo. |
| POST | /api/auth/mfa/verify | Confirma TOTP y habilita MFA. |
| POST | /api/auth/mfa/disable | Revoca MFA. |
| POST | /api/auth/change-password | Cambia clave autenticado. |
| GET | /api/me | Perfil, roles y permisos. |
| GET | /api/auth/admin/users | Listado administrativo. |
| PATCH | /api/auth/admin/users/:id | Actualiza roles/estado. |

Consulta la especificaci�n completa en GET /api/docs.

### Respuestas relevantes
`json
POST /api/auth/login {
  "identifier": "admin@transportadora.local",
  "password": "ClaveSegura123!",
  "mfa_code": "123456" // opcional
}
`
- 200 ? { "access_token": "...", "refresh_token": "...", "user": {"roles": ["admin"], ...} }
- 202 ? { "mfa_required": true, "methods": {"totp": true, "backup": true} }

## Seguridad aplicada
- **Bloqueo inteligente**: estado is_locked + locked_until, reinicio al login correcto.
- **Intentos fallidos** registrados en login_attempts con IP y user-agent.
- **Auditor�a** (udit_logs) para: login OK/KO, MFA on/off, reset password, cambios de rol, refresh revocado.
- **Logs JSON** (python-json-logger) listos para ingesta en SIEM. Variables ENABLE_SIEM_HOOKS y AUDIT_SIEM_ENDPOINT permiten enviar eventos externos.
- **CORS** restringido por configuraci�n, cabeceras CSP y anti-sniff en todas las respuestas.

## Frontend
- Estado global con zustand (src/store/authStore.js).
- Guardas de ruta con PrivateRoute que aceptan oles y permissions.
- Vistas: Login (con MFA), Perfil (habilitar/rotar MFA), Recuperaci�n de clave, Gesti�n de usuarios con RBAC.
- Navbar contextual seg�n rol.
- i18n b�sico (src/i18n.js) fijado a es.

## Tests
`ash
make backend-test
`
Ejecuta pruebas unitarias de hashing y MFA (pytest). Agregar casos de integraci�n E2E est� recomendado antes de despliegues productivos.

## Notas operativas
- Ajust� PASSWORD_EXPIRATION_DAYS si requer�s caducidad peri�dica.
- MAIL_LINK_TTL_MINUTES controla vigencia del token de recuperaci�n.
- Para integrar SIEM, defin� AUDIT_SIEM_ENDPOINT y opcionalmente AUDIT_SIEM_TOKEN.
- Usa pgadmin para inspeccionar nuevas tablas (oles, permissions, login_attempts, etc.).

�Listo! El sistema queda endurecido para entornos SOC con MFA, RBAC y trazabilidad completa.
