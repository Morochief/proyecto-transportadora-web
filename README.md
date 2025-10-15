# Sistema de Transporte – Módulo de Autenticación/Autorización

Este proyecto incorpora un módulo integral de autenticación, autorización y observabilidad SOC sobre la plataforma logística existente (Flask + SQLAlchemy en el backend y React en el frontend).

## Características clave
- **JWT de corta duración** (15 min) con refresh tokens rotativos (7 días) almacenados cifrados y auditados.
- **RBAC** con roles (dmin, operador, isor) y permisos finos (envios:*, usuarios:*, etc.).
- **MFA TOTP (RFC 6238)** con enrolamiento, códigos de respaldo y revocación.
- **Política de contraseñas**: mínimo 12 caracteres, complejidad obligatoria, historial (N=5) y bloqueo tras intentos fallidos.
- **Rate limiting** y bloqueo temporal de cuentas tras 10 intentos/15min.
- **Auditoría estructurada** en tabla udit_logs + hook opcional a SIEM.
- **Esquemas Pydantic** para validar las solicitudes de auth.
- **OpenAPI** expuesto en GET /api/docs con ejemplos de requests/responses.
- **Mailhog** para pruebas de recuperación de contraseña.
- **Tests unitarios básicos** de hashing/TOTP (pytest).
- **Docker Compose** con backend, frontend, PostgreSQL, Mailhog y pgAdmin.

## Configuración rápida
1. Copiá el ejemplo de entorno y personalizá secretos:
   `ash
   cp .env.example .env
   `
2. Levantá toda la pila con Docker Compose:
   `ash
   docker compose up --build
   `
   Servicios expuestos:
   - API Flask: http://localhost:5000
   - Frontend CRA: http://localhost:3000
   - Mailhog UI (SMTP de prueba): http://localhost:8025
   - pgAdmin: http://localhost:5050
3. Primer arranque: se crea automáticamente un usuario admin (DEFAULT_ADMIN_*). La consola imprime la clave temporal.

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
| Método | Path | Descripción |
| ------ | ---- | ----------- |
| POST | /api/auth/register | Alta de usuario (requiere rol dmin). |
| POST | /api/auth/login | Inicio de sesión (maneja MFA). |
| POST | /api/auth/logout | Revoca refresh token. |
| POST | /api/auth/refresh | Entrega nuevo access token. |
| POST | /api/auth/forgot | Envío de enlace de recuperación. |
| POST | /api/auth/reset | Aplica nueva clave con token. |
| POST | /api/auth/mfa/enroll | Genera secreto, QR y códigos de respaldo. |
| POST | /api/auth/mfa/verify | Confirma TOTP y habilita MFA. |
| POST | /api/auth/mfa/disable | Revoca MFA. |
| POST | /api/auth/change-password | Cambia clave autenticado. |
| GET | /api/me | Perfil, roles y permisos. |
| GET | /api/auth/admin/users | Listado administrativo. |
| PATCH | /api/auth/admin/users/:id | Actualiza roles/estado. |

Consulta la especificación completa en GET /api/docs.

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
- **Auditoría** (udit_logs) para: login OK/KO, MFA on/off, reset password, cambios de rol, refresh revocado.
- **Logs JSON** (python-json-logger) listos para ingesta en SIEM. Variables ENABLE_SIEM_HOOKS y AUDIT_SIEM_ENDPOINT permiten enviar eventos externos.
- **CORS** restringido por configuración, cabeceras CSP y anti-sniff en todas las respuestas.

## Frontend
- Estado global con zustand (src/store/authStore.js).
- Guardas de ruta con PrivateRoute que aceptan oles y permissions.
- Vistas: Login (con MFA), Perfil (habilitar/rotar MFA), Recuperación de clave, Gestión de usuarios con RBAC.
- Navbar contextual según rol.
- i18n básico (src/i18n.js) fijado a es.

## Tests
`ash
make backend-test
`
Ejecuta pruebas unitarias de hashing y MFA (pytest). Agregar casos de integración E2E está recomendado antes de despliegues productivos.

## Notas operativas
- Ajustá PASSWORD_EXPIRATION_DAYS si requerís caducidad periódica.
- MAIL_LINK_TTL_MINUTES controla vigencia del token de recuperación.
- Para integrar SIEM, definí AUDIT_SIEM_ENDPOINT y opcionalmente AUDIT_SIEM_TOKEN.
- Usa pgadmin para inspeccionar nuevas tablas (oles, permissions, login_attempts, etc.).

¡Listo! El sistema queda endurecido para entornos SOC con MFA, RBAC y trazabilidad completa.
