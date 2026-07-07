# Transportadora Web — Skill de proyecto

> Sistema de gestión integral para transporte internacional de cargas,
> especializado en emisión de CRT (Carta de Porte Internacional) y MIC/DTA.
> Stack: Flask 3.1 + React 19 + PostgreSQL 14 + Docker + Redis 7.

## Backup y restauración de la base de datos

**Antes de cualquier operación riesgosa** (migraciones, limpieza de DB, reinicios forzados):

```bash
docker compose exec -T db pg_dump -U postgres logistica > backups/timestamp_nombre.sql
```

**Restaurar** un backup:

```bash
docker compose exec -T db psql -U postgres -d logistica < backups/timestamp_nombre.sql
```

**Regla fija:** cuando el asistente vaya a ejecutar `flask db upgrade`, `flask db downgrade`, borrar `alembic_version`, o cualquier operación que modifique el esquema, DEBE preguntar primero si el usuario quiere un backup antes de proceder.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.11 + Flask 3.1 + Gunicorn |
| ORM | SQLAlchemy 2.0 + Flask-SQLAlchemy 3.1 |
| Migraciones | Alembic / Flask-Migrate |
| Validación | Pydantic 2.9 |
| Auth | PyJWT 2.10 (HS256) + Werkzeug |
| MFA | pyotp + cryptography (Fernet AES-128-CBC) |
| PDF | ReportLab 4.4 (coordenadas absolutas) |
| BD | PostgreSQL 14 (prod) / SQLite (dev) |
| Cache / Rate limit | Redis 7 (con fallback a DB) |
| Frontend | React 19.1 + Vite 5.4 + Tailwind 3.4 |
| Router | React Router DOM 7.6 |
| Estado | Zustand 4.5 |
| HTTP | Axios 1.10 |
| Iconos | Lucide React |
| Infra | Docker Compose (dev + prod profiles) |

## Arquitectura

Monolito modular con capas: Routes (delgados) → Services (lógica) → ORM (datos).
Frontend SPA con estado global vía Zustand y comunicación REST con Axios.

```
Backend:  app/routes/ (15 blueprints) → app/services/ → SQLAlchemy
Frontend: Zustand store → Axios interceptors → API REST
```

### Servicios Docker (dev)

- `db`: PostgreSQL 14
- `redis`: Redis 7 (rate limiting + futuro caché)
- `mailhog`: Captura de correos en desarrollo (:8025)
- `backend`: Flask con hot-reload (:5000)
- `frontend`: Vite con HMR (:3000)
- `pgadmin`: Administración DB (:5050)

## Patrones y convenciones

### Backend

- **App Factory:** `create_app()` en `app/__init__.py`. Inicializa DB, CORS, Migrate, rate limiter, seeds.
- **Service Layer:** `auth_service.py` encapsula toda la lógica de autenticación (700+ líneas).
- **Config env-driven:** 40+ variables en `config.py` leídas de entorno con defaults seguros.
- **Rate limiting:** Redis sliding window con fallback a DB. Se inicializa con `rate_limiter.init_app(app)` en la app factory.
- **MFA en seed admin:** El admin seed genera TOTP + backup codes automáticamente (excepto en TESTING=True).

### Frontend

- **Componentes compartidos:** `EnhancedTable`, `FormModal`, `Toast`.
- **Auth flow:** `bootstrapSession()` → refresh token cookie → `GET /auth/me`.
- **Routing:** `PrivateRoute` con verificación de roles.
- **Estilos:** Tailwind CSS como sistema único. No usar CSS modules ni clases globales sueltas.

### Docker

- Dev y prod tienen archivos separados (`docker-compose.yml` / `docker-compose.prod.yml`).
- `docker-entrypoint-backend.sh` ejecuta migraciones automáticas (`flask db upgrade`) al arrancar.
- Después de reconstruir el backend (`docker compose up -d --build backend`), las migraciones corren solas.

## Deuda técnica saldada

### Sesión anterior (críticos y altos)

| Item | Solución |
|------|----------|
| Sin tests automatizados | Tests agregados para auth + security |
| Duplicación de componentes CRUD | `EnhancedTable` y `FormModal` como componentes compartidos |
| Dos sistemas de Toast | Unificado a `react-toastify` |
| Sin SSL/TLS | Pendiente (requiere Certbot + dominio) |

### Esta sesión (medios y bajos)

| Item | Solución |
|------|----------|
| Rate limiting en memoria | Redis 7 con fallback a DB |
| Placeholder estático | `searchPlaceholder` contextual en cada página |
| Código muerto CRT.jsx | `mostrarVistaPrevia`, `CRTPreview` y estados eliminados |
| Immer sin uso | Eliminado de package.json |
| CSS modules vs inline | `App.css` reducido de 266→4 líneas; solo Tailwind |
| Admin sin MFA | Seed genera TOTP + backup codes |
| FormModal inline rotos | Componentes inline `FormModal` (~100 líneas c/u) eliminados de 6 páginas |
| Toast duplicado en ListarCRT | Import duplicado eliminado |
| Key duplicada en Usuarios | `label` duplicado eliminado |

## Seguridad

- JWT access token: 15 min HS256 con roles y permisos en payload.
- Refresh token: 64 chars aleatorios, hash SHA-256 en BD, con rotación.
- MFA TOTP con backup codes (10, hasheados con SHA-256 + salt).
- Rate limiting: 5 intentos/min por IP (backoff ×2), 10 fallos → bloqueo 15 min.
- Passwords: 12+ chars, mayúscula + minúscula + dígito + especial, historial 5.
- Headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, CSP.

## Operaciones comunes

### Reconstruir backend con cambios
```bash
docker compose up -d --build backend
```

### Ver logs del backend
```bash
docker compose logs --tail=50 backend
```

### Entrar a la DB
```bash
docker compose exec -T db psql -U postgres -d logistica -c "SQL AQUÍ"
```

### Backup rápido (antes de migraciones)
```bash
docker compose exec -T db pg_dump -U postgres logistica > backup.sql
```

### Correr tests del backend
```bash
cd backend && python -m pytest tests/ -v
```
