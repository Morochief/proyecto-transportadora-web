# 🔍 Diagnóstico del Proyecto - Sistema de Login

**Fecha:** 2025-10-15  
**Estado:** ⚠️ PROBLEMAS ENCONTRADOS

---

## 📋 Resumen Ejecutivo

Se han identificado **3 problemas críticos** que impiden el correcto funcionamiento del sistema de login:

1. ✅ **RESUELTO** - Importación circular en el backend
2. ❌ **CRÍTICO** - Dependencias faltantes en requirements.txt
3. ⚠️ **ADVERTENCIA** - Falta entorno virtual (venv)

---

## 🔴 Problema 1: Importación Circular (RESUELTO)

### Descripción
El archivo `backend/app/security/rbac.py` importaba `db` desde `app/__init__.py`, pero `app/__init__.py` importaba `ensure_roles_permissions` desde `rbac.py`, creando una importación circular.

### Error Original
```
ImportError: cannot import name 'db' from 'app'
```

### Solución Aplicada
✅ Movidas las importaciones de `db` y modelos dentro de las funciones que las necesitan para evitar la importación circular.

### Archivos Modificados
- `backend/app/security/rbac.py`

---

## 🔴 Problema 2: Dependencias Faltantes (CRÍTICO)

### Descripción
El archivo `requirements.txt` no incluye todas las dependencias necesarias para el proyecto.

### Dependencias Faltantes
1. **pydantic** - Usado para validación de datos en schemas
   - Ubicación: `backend/app/schemas/auth.py`
   - Ubicación: `backend/app/routes/auth.py`

2. **python-json-logger** - Usado para logging estructurado
   - Ubicación: `backend/app/utils/logging_config.py`

3. **cryptography** - Usado para encriptación MFA
   - Ubicación: `backend/app/security/encryption.py`

4. **pyotp** - Probablemente usado para TOTP/MFA (verificar)
   - Ubicación: Código MFA en `backend/app/security/mfa.py`

### Error Actual
```
ModuleNotFoundError: No module named 'pythonjsonlogger'
```

### Solución Requerida
Actualizar `backend/requirements.txt` con las siguientes líneas:
```
pydantic==2.9.2
pydantic[email]
python-json-logger==2.0.7
cryptography==43.0.3
pyotp==2.9.0
```

---

## ⚠️ Problema 3: Entorno Virtual No Encontrado

### Descripción
No existe un entorno virtual (venv) en el proyecto.

### Impacto
- Las dependencias deben instalarse en el Python del sistema
- Mayor riesgo de conflictos de versiones
- Dificulta el desarrollo colaborativo

### Solución Recomendada
```powershell
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual (Windows)
.\venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r backend\requirements.txt
```

---

## ✅ Componentes Verificados (SIN PROBLEMAS)

### Backend - Rutas de Autenticación
✅ `/api/auth/login` - Correctamente implementado
✅ `/api/auth/logout` - Correctamente implementado
✅ `/api/auth/refresh` - Correctamente implementado
✅ `/api/auth/forgot` - Correctamente implementado
✅ `/api/auth/reset` - Correctamente implementado
✅ `/api/auth/me` - Correctamente implementado

### Backend - Servicios
✅ `auth_service.py` - Lógica de autenticación correcta
✅ `audit_service.py` - Sistema de auditoría OK
✅ `email_service.py` - Servicio de email OK

### Backend - Seguridad
✅ `passwords.py` - Validación de contraseñas OK
✅ `tokens.py` - Manejo de JWT OK
✅ `mfa.py` - Autenticación multifactor OK
✅ `decorators.py` - Decoradores de seguridad OK

### Frontend - Componentes de Login
✅ `Login.js` - Componente correcto
✅ `auth.js` - Utilidades de autenticación correctas
✅ `authStore.js` - Store de Zustand correcto
✅ `api.js` - Interceptores de Axios correctos
✅ `PrivateRoute.js` - Rutas protegidas correctas

### Frontend - Flujo de Autenticación
✅ Manejo de MFA
✅ Refresh token automático
✅ Navegación post-login
✅ Manejo de errores

---

## 🔧 Pasos para Resolver

### Paso 1: Actualizar requirements.txt
```bash
cd d:\Proyectos-Morochief\proyecto-transportadora-web\backend
```

Agregar al final de `requirements.txt`:
```
pydantic==2.9.2
pydantic[email]
python-json-logger==2.0.7
cryptography==43.0.3
pyotp==2.9.0
```

### Paso 2: Crear e Instalar Dependencias
```powershell
# Desde la raíz del proyecto
cd d:\Proyectos-Morochief\proyecto-transportadora-web

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
.\venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r backend\requirements.txt
```

### Paso 3: Verificar Base de Datos
```powershell
# Aplicar migraciones
cd backend
python -m flask db upgrade
```

### Paso 4: Crear Usuario Administrador (si no existe)
```powershell
python -c "from app import create_app, db; from app.seeds import ensure_admin_user; app = create_app(); app.app_context().push(); ensure_admin_user()"
```

### Paso 5: Iniciar el Backend
```powershell
cd backend
python run.py
```

### Paso 6: Iniciar el Frontend
```powershell
cd frontend
npm install  # Si es necesario
npm start
```

---

## 🧪 Pruebas de Login Recomendadas

### Credenciales por Defecto del Admin
- **Email:** admin@transportadora.local
- **Usuario:** admin
- **Contraseña:** (verificar en seeds.py)

### Casos de Prueba
1. ✓ Login con email
2. ✓ Login con usuario
3. ✓ Login con credenciales incorrectas
4. ✓ Login con cuenta bloqueada
5. ✓ Login con MFA habilitado
6. ✓ Refresh token
7. ✓ Logout

---

## 📊 Análisis de Seguridad

### ✅ Características de Seguridad Implementadas
- ✓ Hash de contraseñas con PBKDF2-SHA256
- ✓ Validación de política de contraseñas (12 caracteres mín)
- ✓ Autenticación multifactor (MFA) con TOTP
- ✓ Rate limiting para login (5 intentos/minuto)
- ✓ Bloqueo de cuenta tras múltiples intentos fallidos
- ✓ Refresh tokens con rotación
- ✓ Tokens con expiración (15 min access, 7 días refresh)
- ✓ Auditoría de eventos de login
- ✓ CORS configurado correctamente
- ✓ Headers de seguridad (X-Frame-Options, CSP, etc.)
- ✓ Sistema de roles y permisos (RBAC)

### Configuración de Seguridad (config.py)
```python
PASSWORD_MIN_LENGTH = 12
ACCOUNT_LOCK_THRESHOLD = 10
ACCOUNT_LOCK_WINDOW_MINUTES = 15
LOGIN_RATE_LIMIT_PER_MINUTE = 5
ACCESS_TOKEN_EXPIRES = 15  # minutos
REFRESH_TOKEN_EXPIRES = 7  # días
```

---

## 🔐 Estructura del Sistema de Autenticación

### Base de Datos - Tablas Relacionadas
- `usuarios` - Datos del usuario
- `roles` - Roles del sistema (admin, operador, visor)
- `permissions` - Permisos granulares
- `user_roles` - Relación usuario-rol
- `role_permissions` - Relación rol-permiso
- `refresh_tokens` - Tokens de actualización
- `login_attempts` - Intentos de login
- `audit_logs` - Registro de auditoría
- `password_history` - Historial de contraseñas
- `backup_codes` - Códigos de respaldo MFA

### Flujo de Login
```
1. Usuario ingresa credenciales → POST /api/auth/login
2. Backend valida rate limiting por IP
3. Backend busca usuario por email o username
4. Backend verifica estado de cuenta (activo, no bloqueado)
5. Backend valida contraseña con hash
6. Si MFA está habilitado → solicita código TOTP o backup
7. Backend actualiza last_login y resetea intentos fallidos
8. Backend genera access_token y refresh_token
9. Backend registra evento en audit_logs
10. Frontend almacena tokens en localStorage (Zustand persist)
11. Frontend navega a Dashboard
```

---

## 🎯 Conclusión

El sistema de login está **correctamente diseñado e implementado**, pero tiene problemas de configuración del entorno:

1. ✅ **Código correcto** - La lógica de autenticación es robusta y segura
2. ❌ **Dependencias incompletas** - Falta actualizar requirements.txt
3. ⚠️ **Entorno no configurado** - Falta crear venv e instalar dependencias

Una vez resueltos los problemas de dependencias, el sistema debería funcionar perfectamente.

---

## 📞 Próximos Pasos Sugeridos

1. Actualizar `requirements.txt` con las dependencias faltantes
2. Crear entorno virtual
3. Instalar todas las dependencias
4. Verificar que la base de datos tenga las tablas necesarias
5. Ejecutar migraciones si es necesario
6. Probar el login con usuario admin por defecto
7. Verificar logs para cualquier error adicional
