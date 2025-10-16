# Sistema de Transportadora - Plataforma Logística Completa

Sistema integral de gestión de transporte con módulo avanzado de autenticación, autorización y observabilidad SOC sobre plataforma logística (Flask + SQLAlchemy en backend, React en frontend).

## 🚀 Inicio Rápido

### Arrancar Todo de Una Vez

**Windows:**
```powershell
# Iniciar todos los servicios con Docker
.\start-dev.ps1 -Docker

# Detener servicios
.\start-dev.ps1 -Stop
```

**Linux/Mac:**
```bash
chmod +x start-dev.sh  # Solo primera vez
./start-dev.sh --docker
```

**Acceder a:** http://localhost:3000 (Frontend) | http://localhost:5000 (API)

> 📖 **Guía completa:** Ver [QUICK_START.md](QUICK_START.md) | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 🌟 Características Principales

- **JWT de corta duración** (15 min) con refresh tokens rotativos (7 días) almacenados cifrados y auditados
- **RBAC** con roles (admin, operador, visor) y permisos finos (envios:*, usuarios:*, etc.)
- **MFA TOTP (RFC 6238)** con enrolamiento, códigos de respaldo y revocación
- **Política de contraseñas**: mínimo 12 caracteres, complejidad obligatoria, historial (N=5) y bloqueo tras intentos fallidos
- **Rate limiting** y bloqueo temporal de cuentas tras 10 intentos/15min
- **Auditoría estructurada** en tabla audit_logs + hook opcional a SIEM
- **Esquemas Pydantic** para validar las solicitudes de auth
- **OpenAPI** expuesto en GET /api/docs con ejemplos de requests/responses
- **Docker Compose** con backend, frontend, PostgreSQL, Mailhog y pgAdmin

---

## 📋 Servicios Disponibles

Después de iniciar con `start-dev.ps1 -Docker`:

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Frontend** | http://localhost:3000 | Aplicación React |
| **Backend API** | http://localhost:5000 | API REST |
| **API Docs** | http://localhost:5000/api/docs | Swagger/OpenAPI |
| **Mailhog** | http://localhost:8025 | Servidor SMTP de prueba |
| **pgAdmin** | http://localhost:5050 | Admin PostgreSQL |
| **Go CRT API** | http://localhost:8080 | API de CRT |
| **PDF Service** | http://localhost:3002 | Generador de PDFs |

**Credenciales por defecto:**
- Usuario: `admin` | Email: `admin@transportadora.local`
- Contraseña: `ChangeMe123!` (configurar en `.env`)

---

## 🔧 Configuración Inicial

1. **Copiar configuración de entorno:**
   ```bash
   cp .env.example .env
   ```

2. **Editar `.env` con tus valores** (opcional para desarrollo):
   ```bash
   # Windows
   notepad .env
   
   # Linux/Mac
   nano .env
   ```

3. **Iniciar servicios** (ver sección "Inicio Rápido" arriba)

---

## 🔐 API Endpoints Principales

| Método | Path | Descripción |
| ------ | ---- | ----------- |
| POST | /api/auth/register | Alta de usuario (requiere rol admin) |
| POST | /api/auth/login | Inicio de sesión (maneja MFA) |
| POST | /api/auth/logout | Revoca refresh token |
| POST | /api/auth/refresh | Entrega nuevo access token |
| POST | /api/auth/forgot | Envío de enlace de recuperación |
| POST | /api/auth/reset | Aplica nueva clave con token |
| POST | /api/auth/mfa/enroll | Genera secreto, QR y códigos de respaldo |
| POST | /api/auth/mfa/verify | Confirma TOTP y habilita MFA |
| POST | /api/auth/mfa/disable | Revoca MFA |
| POST | /api/auth/change-password | Cambia clave autenticado |
| GET | /api/me | Perfil, roles y permisos |
| GET | /api/auth/admin/users | Listado administrativo |
| PATCH | /api/auth/admin/users/:id | Actualiza roles/estado |

Consulta la especificación completa en GET /api/docs.

### Ejemplo de Login

```json
POST /api/auth/login
{
  "identifier": "admin@transportadora.local",
  "password": "ClaveSegura123!",
  "mfa_code": "123456"  // opcional
}
```

**Respuestas:**
- 200 → `{ "access_token": "...", "refresh_token": "...", "user": {"roles": ["admin"], ...} }`
- 202 → `{ "mfa_required": true, "methods": {"totp": true, "backup": true} }`

---

## 🛡️ Seguridad

- **Bloqueo inteligente**: estado `is_locked` + `locked_until`, reinicio al login correcto
- **Intentos fallidos** registrados en `login_attempts` con IP y user-agent
- **Auditoría** (`audit_logs`) para: login OK/KO, MFA on/off, reset password, cambios de rol, refresh revocado
- **Logs JSON** (python-json-logger) listos para ingesta en SIEM
- **CORS** restringido por configuración, cabeceras CSP y anti-sniff en todas las respuestas

---

## 🎨 Frontend

- Estado global con zustand (`src/store/authStore.js`)
- Guardas de ruta con `PrivateRoute` que aceptan roles y permissions
- Vistas: Login (con MFA), Perfil (habilitar/rotar MFA), Recuperación de clave, Gestión de usuarios con RBAC
- Navbar contextual según rol
- i18n básico (`src/i18n.js`)

---

## 📚 Documentación

- **[QUICK_START.md](QUICK_START.md)** - Guía de inicio rápido y comandos útiles
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Guía completa de despliegue
- **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)** - Despliegue detallado a producción
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - Checklist pre-producción (100+ items)
- **[SECURITY_FEATURES.md](SECURITY_FEATURES.md)** - Características de seguridad
- **[USUARIOS_CUSTOMIZATION_GUIDE.md](USUARIOS_CUSTOMIZATION_GUIDE.md)** - Gestión de usuarios

---

## 🏭 Despliegue a Producción

```bash
# 1. Configurar variables de producción en .env
cp .env.example .env

# 2. Generar claves secretas
python -c "import secrets; print(secrets.token_urlsafe(48))"

# 3. Desplegar con Docker Compose de producción
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

> ⚠️ **Importante:** Revisar [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) antes de producción

### Variables Críticas a Cambiar

```bash
# Seguridad
SECRET_KEY=<generar-clave-aleatoria-64-caracteres>
JWT_SECRET_KEY=<generar-otra-clave-aleatoria-64-caracteres>

# Base de datos
DATABASE_URL=postgresql://usuario:password@host:5432/logistica

# CORS y URLs
CORS_ALLOW_ORIGINS=https://tu-dominio.com
FRONTEND_URL=https://tu-dominio.com
REACT_APP_API_URL=https://api.tu-dominio.com/api

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_TLS=true
SMTP_USERNAME=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
```

---

## 🛠️ Comandos Útiles

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend

# Reiniciar un servicio
docker-compose restart backend

# Health check
.\health-check.ps1  # Windows
./health-check.sh   # Linux/Mac

# Backup de base de datos
docker-compose exec db pg_dump -U postgres logistica > backup.sql

# Restaurar backup
cat backup.sql | docker-compose exec -T db psql -U postgres logistica

# Ejecutar shell de Flask
docker-compose exec backend flask shell

# Aplicar migraciones
docker-compose exec backend flask db upgrade

# Resetear contraseña admin
docker-compose exec backend python reset_password_simple.py
```

---

## 🧪 Testing

```bash
# Ejecutar tests del backend
make backend-test

# O con Docker
docker-compose exec backend pytest

# Con coverage
docker-compose exec backend pytest --cov=app --cov-report=html
```

---

## 🐛 Troubleshooting

### Backend no inicia

```bash
# Ver logs detallados
docker-compose logs backend

# Verificar migraciones
docker-compose exec backend flask db current
docker-compose exec backend flask db upgrade
```

### Frontend no carga

```bash
# Verificar build
docker-compose exec frontend ls /usr/share/nginx/html

# Reconstruir
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Error de base de datos

```bash
# Verificar PostgreSQL
docker-compose exec db pg_isready

# Verificar conexión
docker-compose exec backend python -c "from app import db; print(db.engine.url)"
```

### Más problemas

Ver sección de troubleshooting en [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md#troubleshooting)

---

## 📊 Estructura del Proyecto

```
.
├── backend/              # API Flask
│   ├── app/
│   │   ├── routes/      # Endpoints de la API
│   │   ├── models.py    # Modelos SQLAlchemy
│   │   ├── security/    # Autenticación, MFA, RBAC
│   │   ├── services/    # Lógica de negocio
│   │   └── utils/       # Utilidades
│   ├── migrations/      # Migraciones Alembic
│   └── tests/           # Tests unitarios
├── frontend/            # Aplicación React
│   ├── src/
│   │   ├── components/  # Componentes reutilizables
│   │   ├── pages/       # Vistas/páginas
│   │   ├── store/       # Estado global (Zustand)
│   │   └── utils/       # Utilidades
│   └── public/
├── go-crt-api/          # API Go para CRT
├── docker-compose.yml   # Docker Compose desarrollo
├── docker-compose.prod.yml  # Docker Compose producción
├── start-dev.ps1        # Script inicio Windows
├── start-dev.sh         # Script inicio Linux/Mac
├── health-check.ps1     # Health check Windows
└── .env.example         # Template variables de entorno
```

---

## 🔄 Workflow de Desarrollo

1. **Iniciar proyecto:** `.\start-dev.ps1 -Docker`
2. **Hacer cambios en el código** (hot reload activado)
3. **Ver logs:** `docker-compose logs -f backend frontend`
4. **Detener al terminar:** `.\start-dev.ps1 -Stop`

---

## 💡 Tips

- **Hot Reload**: Los cambios en código se reflejan automáticamente
- **Logs**: Siempre revisar logs con `docker-compose logs -f` cuando algo falle
- **Persistencia**: Los datos en PostgreSQL persisten entre reinicios
- **Clean Start**: Usa `-Clean` solo si quieres empezar desde cero
- **Seguridad**: Nunca commitear `.env` al repositorio

---

## 📝 Notas Operativas

- Ajustá `PASSWORD_EXPIRATION_DAYS` si requerís caducidad periódica
- `MAIL_LINK_TTL_MINUTES` controla vigencia del token de recuperación
- Para integrar SIEM, definí `AUDIT_SIEM_ENDPOINT` y opcionalmente `AUDIT_SIEM_TOKEN`
- Usá pgAdmin para inspeccionar tablas (roles, permissions, login_attempts, etc.)

---

## 🆘 Soporte

1. Revisar documentación en este repositorio
2. Revisar logs: `docker-compose logs -f`
3. Ejecutar health check: `.\health-check.ps1`
4. Consultar [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)

---

## 📄 Licencia

[Especificar licencia]

---

¡Listo! El sistema queda endurecido para entornos SOC con MFA, RBAC y trazabilidad completa.

**Última actualización:** 2025-10-16
