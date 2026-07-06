# Arquitectura del Sistema — Transportadora Web

> Sistema de gestión integral para transporte internacional de cargas,
> especializado en emisión de CRT (Carta de Porte Internacional) y MIC/DTA
> (Manifiesto Internacional de Carga / Declaración de Tránsito Aduanero).

---

## Índice

1. [Stack Tecnológico](#1-stack-tecnológico)
2. [Arquitectura General](#2-arquitectura-general)
3. [Backend (Flask)](#3-backend-flask)
4. [Frontend (React 19)](#4-frontend-react-19)
5. [Infraestructura (Docker)](#5-infraestructura-docker)
6. [Seguridad](#6-seguridad)
7. [Modelo de Datos](#7-modelo-de-datos)
8. [Generación PDF](#8-generación-pdf)
9. [Flujo de Negocio](#9-flujo-de-negocio)
10. [API Endpoints](#10-api-endpoints)
11. [Deuda Técnica y Riesgos](#11-deuda-técnica-y-riesgos)

---

## 1. Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Backend** | Python + Flask | 3.11 / 3.1 | API REST |
| **ORM** | SQLAlchemy + Flask-SQLAlchemy | 2.0 / 3.1 | Acceso a datos |
| **Migraciones** | Alembic / Flask-Migrate | 1.16 / 4.1 | Esquema evolutivo |
| **Validación** | Pydantic | 2.9 | Schemas de request |
| **Auth** | PyJWT + Werkzeug | 2.10 / 3.1 | JWT + hashing |
| **MFA** | pyotp + cryptography (Fernet) | 2.9 / 43.0 | TOTP + backup codes |
| **PDF** | ReportLab | 4.4 | Generación nativa de documentos |
| **BD** | PostgreSQL / SQLite | 14 / - | Persistencia |
| **Frontend** | React | 19.1 | SPA |
| **Bundler** | Vite | 5.4 | Dev server + build |
| **Estado** | Zustand | 4.5 | Estado global |
| **Router** | React Router DOM | 7.6 | SPA routing |
| **HTTP** | Axios | 1.10 | Cliente HTTP con interceptores |
| **Estilos** | Tailwind CSS | 3.4 | Utility-first CSS |
| **Animaciones** | Framer Motion | 12.23 | UI animations |
| **Iconos** | Lucide React | 0.263 | Iconos |
| **Infra** | Docker + Docker Compose | - | Contenedores |

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGINX (Frontend SPA)                     │
│                   (proxy inverso opcional en prod)               │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/HTTPS
┌───────────────────────────▼─────────────────────────────────────┐
│                          React 19 SPA                            │
│                     Vite dev (3000) / Nginx (80)                  │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Zustand  │ │ Axios    │ │ React    │ │ Tailwind │            │
│  │  (store)  │ │ (client) │ │ Router   │ │ (styles) │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API (JSON)
┌───────────────────────────▼─────────────────────────────────────┐
│                         Flask 3.1 API                             │
│                    Gunicorn (5000) / Debug (5678)                  │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │    Routes    │  │  Services   │  │  Security   │               │
│  │ (15 BPs)     │  │ (Auth/Email)│  │ (JWT/RBAC)  │               │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘               │
│         │                │                │                       │
│  ┌──────▼────────────────▼────────────────▼──────┐               │
│  │             SQLAlchemy ORM (21 tablas)         │               │
│  └──────────────────────────┬────────────────────┘               │
│                             │                                     │
│  ┌──────────────────────────▼────────────────────┐               │
│  │              PostgreSQL 14 / SQLite            │               │
│  └────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

**Patrón arquitectónico:** Monolito modular con separación en capas:
- **Routes** (controladores delgados) → **Services** (lógica de negocio) → **ORM** (datos)
- Frontend SPA con estado global vía Zustand y comunicación REST con Axios

---

## 3. Backend (Flask)

### 3.1 Estructura de Módulos

```
backend/
├── app/
│   ├── __init__.py          # App factory (create_app)
│   ├── models.py            # 21 modelos SQLAlchemy
│   ├── docs.py              # OpenAPI spec embebida
│   ├── seeds.py             # Admin seed
│   ├── routes/              # 15 blueprints
│   │   ├── auth.py          # Login, register, MFA, refresh
│   │   ├── security.py      # Sesiones, audit logs, login attempts
│   │   ├── usuarios.py      # CRUD usuarios (deprecado)
│   │   ├── crt.py           # CRT CRUD + PDF (~1.3K lines)
│   │   ├── mic.py           # MIC: carga datos CRT
│   │   ├── mic_guardados.py # MIC persistente CRUD + PDF
│   │   ├── honorarios.py    # Honorarios CRUD
│   │   ├── dashboard.py     # Estadísticas
│   │   ├── paises.py, ciudades.py, remitentes.py,
│   │   │   transportadoras.py, monedas.py, aduanas.py
│   ├── schemas/auth.py      # Pydantic models
│   ├── security/            # Sub-sistema de seguridad
│   │   ├── tokens.py        # JWT encode/decode/refresh
│   │   ├── rbac.py          # Role-Permission matrix
│   │   ├── passwords.py     # Hashing + policy + history
│   │   ├── mfa.py           # TOTP + backup codes
│   │   ├── encryption.py    # Fernet simétrico
│   │   └── decorators.py    # @auth_required, @roles_required
│   ├── services/
│   │   ├── auth_service.py  # Autenticación completa (700+ lines)
│   │   ├── email_service.py # SMTP multi-perfil
│   │   └── audit_service.py # Auditoría + SIEM
│   └── utils/
│       ├── layout_crt.py    # Plantilla PDF CRT (ReportLab)
│       ├── layout_mic.py    # Plantilla PDF MIC/DTA (ReportLab)
│       ├── crt_helpers.py   # Parsing numérico
│       ├── crt_serializers.py
│       ├── logging_config.py# JSON structured logging
│       └── security.py      # Re-exports
├── config.py                # Config centralizada (env-driven)
├── wsgi.py                  # Entry point producción
├── migrations/              # 8 versiones Alembic
└── tests/test_security.py   # Tests (1 archivo)
```

### 3.2 Patrón App Factory

```python
def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    configure_logging(app)
    db.init_app(app)
    CORS(app, resources={r'/api/*': ...}, supports_credentials=True)
    Migrate(app, db)

    with app.app_context():
        for bp in [paises_bp, ..., dashboard_bp]:
            app.register_blueprint(bp)
        ensure_roles_permissions()
        ensure_admin_user()

    @app.after_request
    def add_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        # ...
    return app
```

### 3.3 Patrón Service Layer

El `auth_service.py` encapsula la lógica más compleja del sistema:

```
authenticate()
├── _check_rate_limit(ip)           # Rate limiting por IP
├── find_user(identifier)            # Email o usuario
├── _unlock_if_needed(user)          # Auto-unlock
├── check_active(user)               # Cuenta activa
├── check_locked(user)               # Cuenta bloqueada
├── verify_password(password, hash)  # PBKDF2-SHA256
├── handle_mfa(user, code/backup)    # TOTP o backup code
├── issue_tokens(user)               # JWT access + refresh
└── audit_event('login.success')     # Auditoría
```

### 3.4 Configuración (40+ variables de entorno)

| Grupo | Variables clave | Default |
|-------|----------------|---------|
| BD | `DATABASE_URL` | `sqlite:///logistica.db` |
| JWT | `ACCESS_TOKEN_EXPIRES_MINUTES` | 15 |
| JWT | `REFRESH_TOKEN_EXPIRES_DAYS` | 7 |
| Passwords | `PASSWORD_MIN_LENGTH` | 12 |
| Passwords | `PASSWORD_HISTORY_SIZE` | 5 |
| Rate Limit | `ACCOUNT_LOCK_THRESHOLD` | 10 |
| Rate Limit | `LOGIN_RATE_LIMIT_PER_MINUTE` | 5 |
| MFA | `MFA_BACKUP_CODES` | 10 |
| Timezone | `TIMEZONE` | `America/Asuncion` |
| Logging | `STRUCTURED_LOGGING` | `true` |

---

## 4. Frontend (React 19)

### 4.1 Estructura

```
frontend/
├── src/
│   ├── App.jsx                # Router + bootstrapSession()
│   ├── api/api.js             # Axios + interceptors + refresh queue
│   ├── store/authStore.js     # Zustand con persistencia parcial
│   ├── utils/auth.js          # login, logout, bootstrapSession
│   ├── components/
│   │   ├── Layout.jsx         # Layout principal + navbar
│   │   ├── Navbar.jsx         # Navegación con dropdowns animados
│   │   ├── PrivateRoute.jsx   # Guard: auth + roles + permisos
│   │   ├── EnhancedTable.jsx  # Tabla con búsqueda
│   │   ├── Table.jsx          # Tabla legacy
│   │   ├── FormModal.jsx      # Modal genérico
│   │   ├── Toast.jsx          # Notificaciones
│   │   ├── PasswordStrength.jsx
│   │   ├── ThemeToggle.jsx    # Claro/oscuro
│   │   ├── CRTPreview.jsx     # Vista previa CRT
│   │   └── MICPreview.jsx     # Vista previa MIC
│   └── pages/                 # 20+ páginas
│       ├── Login.jsx          # Login con MFA
│       ├── Dashboard.jsx      # Panel principal
│       ├── Profile.jsx        # Perfil + MFA enrollment
│       ├── CRT.jsx            # Formulario CRT (678 lines)
│       ├── ListarCRT.jsx      # Historial CRT (783 lines)
│       ├── ModalMICCompleto.jsx # Modal MIC (581 lines)
│       ├── MICsGuardados.jsx  # Historial MICs
│       └── ... (CRUD pages)
```

### 4.2 Sistema de Estado (Zustand)

```javascript
const useAuthStore = create(
  persist(
    (set) => ({
      user: null,        // Persistido en localStorage
      accessToken: null, // Solo en memoria (no persiste)
      authReady: false,  // Flag de inicialización
      setSession: ({ user, accessToken }) => set({ user, accessToken }),
      clearSession: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'auth-state',
      partialize: (state) => ({ user: state.user }), // Solo user persiste
    }
  )
);
```

### 4.3 Sistema de Autenticación

```
bootstrapSession()
├── accessToken en memoria? → OK (authReady=true)
├── user persistido? No → No hay sesión (authReady=true)
└── user persistido? Sí → refreshSession()
    ├── POST /auth/refresh (cookie HttpOnly)
    ├── GET /auth/me → setSession()
    └── falla → clearSession()

Interceptor Axios:
request → añade Authorization: Bearer <token>
response 401 → refreshSession() → encola requests → reintenta
```

### 4.4 Sistema de Routing

- **React Router DOM v7** con 20 rutas
- `PrivateRoute` protege 17 rutas con verificación de roles
- Navbar con 4 secciones: Dashboard, Documentos, Catálogos, Admin
- Catch-all redirige a `/`

---

## 5. Infraestructura (Docker)

### 5.1 Desarrollo (`docker-compose.yml`)

```
┌──────────────────────────────────────────┐
│           DOCKER HOST (desarrollo)        │
│                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Backend   │ │ Frontend │ │ DB       │ │
│  │ Flask     │ │ Vite     │ │ PG 14    │ │
│  │ :5000     │ │ :3000    │ │ :5432    │ │
│  │ debug:5678│ │ HMR      │ │ localhost │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐               │
│  │ MailHog  │ │ pgAdmin  │               │
│  │ :8025    │ │ :5050    │               │
│  └──────────┘ └──────────┘               │
└──────────────────────────────────────────┘
```

**Características:** Hot-reload, bind mounts, debug remoto (debugpy), MailHog

### 5.2 Producción (`docker-compose.prod.yml`)

```
┌──────────────────────────────────────────┐
│             DOCKER HOST (producción)      │
│  app-network (bridge aislada)             │
│                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Backend   │ │ Frontend │ │ DB       │ │
│  │ Gunicorn  │ │ Nginx    │ │ PG 14    │ │
│  │ :5000     │ │ :80      │ │ :5432    │ │
│  │ 2CPU/2GB  │ │ 0.5/512  │ │ 1CPU/1GB │ │
│  │ healthchk │ │ healthchk│ │ healthchk│ │
│  └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐               │
│  │ Go CRT   │ │ PDF Svc  │               │
│  │ :8080    │ │ :3002    │               │
│  └──────────┘ └──────────┘               │
└──────────────────────────────────────────┘
```

### 5.3 Entrypoint

```
docker-entrypoint.sh
├── Espera PostgreSQL (pg_isready loop)
├── pip install -r requirements.txt (dev)
├── flask db upgrade (migraciones automáticas)
├── ensure_admin_user() (seed)
└── exec "$@" (CMD)
```

---

## 6. Seguridad

### 6.1 Autenticación

| Mecanismo | Implementación |
|-----------|---------------|
| **JWT Access** | HS256, 15 min, payload con roles y permisos |
| **Refresh Token** | 64 chars aleatorios, hash SHA-256 en BD, rotación |
| **HttpOnly Cookie** | Refresh token en cookie con `Secure`, `SameSite=Lax`, `path=/api/auth` |
| **MFA TOTP** | pyotp, validación ventana ±1, QR enrollment |
| **Backup Codes** | 10 códigos, hasheados con SHA-256 + salt |
| **MFA Secrets** | Encriptados con Fernet (AES-128-CBC) |

### 6.2 Política de Contraseñas

- Mínimo 12 caracteres
- Mayúscula + minúscula + dígito + especial
- Historial: últimas 5 contraseñas
- Expiración: configurable (default sin expiración)
- Hashing: PBKDF2-SHA256 con salt

### 6.3 Rate Limiting y Bloqueo

- 5 intentos/minuto por IP (con backoff exponencial ×2)
- 10 intentos fallidos en 15 min → bloqueo de cuenta
- Desbloqueo manual por admin

### 6.4 RBAC

```
admin    → 15 permisos (acceso completo)
operador → 7 permisos (operaciones diarias)
visor    → 3 permisos (solo lectura)
```

**Permisos granulares:** `envios:*`, `transportes:*`, `usuarios:*`, `reportes:ver`, `mfa:gestionar`, `auditoria:ver`

### 6.5 Auditoría

- Eventos registrados: login, logout, register, cambio password, CRUD en módulos críticos
- Niveles: INFO, WARNING, CRITICAL
- SIEM hook opcional (HTTP POST)

### 6.6 Headers HTTP

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
Access-Control-Allow-Credentials: true
```

---

## 7. Modelo de Datos

### 7.1 Catálogos Base

```
Pais ──1:N── Ciudad ──1:N── Aduana
Moneda
Remitente (reusable como remitente/destinatario/consignatario/notificar_a/firma)
Transportadora (con honorarios y moneda)
```

### 7.2 Documentos Centrales

```
CRT ──1:N── CRT_Gasto (gastos del flete por tramo)
CRT ──1:N── MIC (manifiesto derivado)
CRT ──1:N── Honorario (honorarios vinculados)
CRT ──N:1── Remitente (x5 roles)
CRT ──N:1── Transportadora
CRT ──N:1── Usuario (creador)

MIC ──1:N── Honorario (actualiza nº mic, chofer, placas)
Transportadora ──1:N── Honorario
```

### 7.3 Seguridad

```
Usuario M:N Role (via user_roles)
Role M:N Permission (via role_permissions)
Usuario 1:N RefreshToken
Usuario 1:N PasswordHistory
Usuario 1:N LoginAttempt
Usuario 1:N BackupCode
Usuario 1:N AuditLog
```

### 7.4 Tablas (21)

| Tabla | Tipo | Registros típicos |
|-------|------|-------------------|
| `paises`, `ciudades`, `aduanas`, `monedas` | Catálogo | 4-50 |
| `remitentes`, `transportadoras` | Entidad | 50-500 |
| `crts`, `crt_gastos` | Documento | 100-10K |
| `mics` | Documento | 100-10K |
| `honorarios` | Financiero | 100-5K |
| `usuarios`, `roles`, `permissions` | Seguridad | 1-20 |
| `refresh_tokens`, `audit_logs`, `login_attempts` | Auditoría | 1K-100K |

---

## 8. Generación PDF

### 8.1 PDF CRT

- **ReportLab Canvas** con coordenadas absolutas
- 35 rectángulos + 1 círculo (estándar ATIT/Cono Sur)
- 24 campos numerados
- Tabla de gastos (Campo 15) con formato latinoamericano (1.234,56)
- Búsqueda binaria de font-size para ajuste de texto
- Partición de palabras largas con regex `[\/\-\.]`

### 8.2 PDF MIC/DTA

- **ReportLab Canvas** con tamaño personalizado (1700×2800 px)
- 41 campos en grilla de 4 columnas
- **Fuentes Unicode:** DejaVuSans con fallback Helvetica
- **Funciones de renderizado:**
  - `draw_multiline_text_adaptive()` — ajuste dinámico de fuente
  - `draw_campo40_robust()` — función específica para ruta
  - `draw_campo39()` — texto legal bilingüe
  - `fit_text_box()` — búsqueda binaria con leading ratio
- Debug con emojis y niveles (processing, success, warning, error)

### 8.3 Campos especiales del MIC

| Campo | Contenido | Técnica |
|-------|-----------|---------|
| 38 | Descripción de mercaderías | Ajuste dinámico adaptativo (5-14pt) |
| 39 | Texto legal + firma + fecha | Función específica |
| 40 | Ruta y plazo | Función robusta (margin=6pt) |
| 1,9,33,34,35 | Entidades | Multilínea con topes (16pt/15pt/10pt) |

---

## 9. Flujo de Negocio

```
1. Registrar TRANSPORTADORA (con honorarios)
2. Registrar REMITENTE / DESTINATARIO
3. Crear CRT (Carta de Porte)
   ↓ (automático)
   Crear HONORARIO vinculado
   ↓
4. Generar PDF CRT
5. Asociar MIC al CRT
   ↓ (automático)
   Actualizar HONORARIO con datos MIC
   ↓
6. Generar PDF MIC/DTA
7. Gestionar honorarios (opcional)
```

---

## 10. API Endpoints

### Autenticación (11 endpoints)

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/api/auth/login` | Público (con MFA) |
| POST | `/api/auth/refresh` | Cookie |
| POST | `/api/auth/logout` | JWT |
| POST | `/api/auth/register` | admin |
| POST | `/api/auth/change-password` | JWT |
| POST | `/api/auth/forgot` | Público |
| POST | `/api/auth/reset` | Público |
| GET | `/api/auth/me` | JWT |
| POST | `/api/auth/mfa/enroll` | JWT |
| POST | `/api/auth/mfa/verify` | JWT |
| POST | `/api/auth/mfa/disable` | JWT |

### Seguridad (7 endpoints)

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/api/security/password-policy` | Público |
| GET | `/api/security/login-attempts` | JWT |
| GET | `/api/security/sessions` | JWT |
| DELETE | `/api/security/sessions/{id}` | JWT |
| POST | `/api/security/sessions/revoke-all` | JWT |
| GET | `/api/security/audit-logs` | admin |
| GET | `/api/security/audit-logs/actions` | admin |

### Documentos (18 endpoints)

| Método | Ruta | Auth |
|--------|------|------|
| GET/POST | `/api/crts/` | JWT |
| GET/PUT/DELETE | `/api/crts/{id}` | JWT |
| POST | `/api/crts/{id}/pdf` | JWT |
| POST | `/api/crts/{id}/duplicate` | JWT |
| GET | `/api/crts/next_number` | JWT |
| GET | `/api/crts/estados` | JWT |
| GET | `/api/crts/{id}/campo15` | JWT |
| GET | `/api/mic/cargar-datos-crt/{id}` | JWT |
| POST | `/api/mic/generate_pdf_from_crt/{id}` | JWT |
| GET/POST | `/api/mic-guardados/` | JWT |
| GET/PUT/DELETE | `/api/mic-guardados/{id}` | JWT |
| POST | `/api/mic-guardados/{id}/restaurar` | JWT |
| GET | `/api/mic-guardados/{id}/pdf` | JWT |
| POST | `/api/mic-guardados/crear-desde-crt/{id}` | JWT |
| POST | `/api/mic-guardados/search` | JWT |
| GET | `/api/mic-guardados/stats` | JWT |

### Catálogos (7 CRUDs)

| Recurso | Endpoint |
|---------|----------|
| Países | `/api/paises/` |
| Ciudades | `/api/ciudades/` |
| Remitentes | `/api/remitentes/` |
| Transportadoras | `/api/transportadoras/` |
| Aduanas | `/api/aduanas/` |
| Monedas | `/api/monedas/` |
| Honorarios | `/api/honorarios/` |

### Administración (5 endpoints)

| Método | Ruta |
|--------|------|
| GET/POST | `/api/auth/admin/users` |
| PATCH/DELETE | `/api/auth/admin/users/{id}` |
| POST | `/api/auth/admin/users/{id}/unlock` |
| GET | `/api/auth/roles` |
| GET | `/api/dashboard/stats` |

---

## 11. Deuda Técnica y Riesgos

### 🔴 Crítico

| Item | Impacto |
|------|---------|
| **Sin tests automatizados** | Solo 1 archivo de test (`test_security.py`). Sin frontend tests. Alto riesgo de regresión. |
| **Duplicación masiva de componentes CRUD** | `EnhancedTable` y `EnhancedFormModal` redefinidos inline en 4+ páginas (~400 líneas c/u). |
| **Dos sistemas de Toast** | `components/Toast.jsx` + `react-toastify` + Toast inline en páginas CRUD. |
| **Sin SSL/TLS** | Nginx proxy con Certbot no activado en prod. |

### 🟡 Medio

| Item | Impacto |
|------|---------|
| **i18n incompleta** | Configurado pero solo tiene `welcome: 'Bienvenido'`. Todo hardcodeado en español. |
| **Encoding corrupto** | Varios archivos con acentos malinterpretados (UTF-8 como Latin-1). |
| **Debounce inconsistente** | Búsqueda client-side sin debounce en EnhancedTable. |
| **React-Select vs select nativo** | CRT/MIC usan react-select con búsqueda; CRUD pages usan `<select>` nativo. |
| **Sin caché de datos maestros** | Países/ciudades se recargan en cada navegación. |
| **Backend Dockerfile sin multi-stage** | Imagen de ~400MB vs ~150MB posible. |
| **Rate limiting en memoria** | No persiste entre reinicios (mejorable con Redis). |

### 🟢 Bajo

| Item | Impacto |
|------|---------|
| **Placeholder estático** | `"Buscar honorarios..."` en todas las EnhancedTable. |
| **Código muerto** | `mostrarVistaPrevia` definida pero no llamada en CRT.jsx. |
| **Immer sin uso** | En package.json pero no importado. |
| **CSS modules vs inline** | Conviven 3 sistemas de estilos. |
| **Usuario admin con rol 'admin' sin MFA** | Por defecto sin MFA habilitado. |

---

## Estructura del Repositorio

```
proyecto-transportadora-web/
├── backend/
│   ├── app/             # Código fuente Flask
│   ├── migrations/      # 8 versiones Alembic
│   ├── tests/           # 1 archivo de test
│   ├── config.py        # Config env-driven
│   ├── wsgi.py          # Entry point
│   └── requirements.txt # 21 dependencias
├── frontend/
│   ├── src/             # Código fuente React
│   ├── public/          # Assets estáticos
│   ├── package.json     # 14 dependencias
│   └── vite.config.js
├── Dockerfile.backend*
├── Dockerfile.frontend*
├── docker-compose*.yml (dev + prod)
├── nginx.conf
├── default.conf
├── docker-entrypoint-backend.sh
└── .env.example
```

---

*Documento generado con análisis estático del código fuente.*
*Última actualización: Julio 2026*
