# 🔧 GUÍA RÁPIDA DE SOLUCIÓN - Sistema de Login

## ✅ Problemas Encontrados y Solucionados

### 1. ✅ Importación Circular (RESUELTO)
**Archivo:** `backend/app/security/rbac.py`  
**Cambio:** Las importaciones de `db` y modelos se movieron dentro de las funciones para evitar circular imports.

### 2. ✅ Dependencias Faltantes (RESUELTO)
**Archivo:** `backend/requirements.txt`  
**Agregadas:**
- pydantic==2.9.2
- pydantic[email]
- python-json-logger==2.0.7
- cryptography==43.0.3
- pyotp==2.9.0

---

## 🚀 Instrucciones de Instalación

### Opción 1: Ejecutar Script Automático (RECOMENDADO)

```powershell
# Desde la raíz del proyecto
.\setup.ps1
```

### Opción 2: Instalación Manual

```powershell
# 1. Crear entorno virtual
python -m venv venv

# 2. Activar entorno virtual
.\venv\Scripts\Activate.ps1

# 3. Instalar dependencias del backend
cd backend
pip install -r requirements.txt

# 4. Aplicar migraciones de base de datos
flask db upgrade

# 5. Volver a la raíz y verificar
cd ..
python -c "from app import create_app; app = create_app(); print('✓ Backend OK')"

# 6. Instalar dependencias del frontend
cd frontend
npm install

# 7. Volver a raíz
cd ..
```

---

## 🏃 Cómo Ejecutar el Proyecto

### Terminal 1 - Backend
```powershell
cd d:\Proyectos-Morochief\proyecto-transportadora-web\backend
.\..venv\Scripts\Activate.ps1  # Activar venv
python run.py
```

El backend se ejecutará en: **http://localhost:5000**

### Terminal 2 - Frontend
```powershell
cd d:\Proyectos-Morochief\proyecto-transportadora-web\frontend
npm start
```

El frontend se ejecutará en: **http://localhost:3000**

---

## 🔑 Credenciales de Acceso

La primera vez que se inicia el backend, se crea automáticamente un usuario administrador.

**IMPORTANTE:** La contraseña se genera aleatoriamente y se muestra en la consola del backend. Buscar este mensaje:

```
============================
Admin seed creado
Usuario: admin
Email:   admin@transportadora.local
Clave temporal: [CONTRASEÑA AQUÍ]
============================
```

**Copiar la contraseña temporal** y usarla para hacer login.

### Opciones de Login:
- **Con usuario:** admin
- **Con email:** admin@transportadora.local
- **Contraseña:** La que se muestra en consola

---

## 🔍 Verificación del Sistema

### 1. Verificar que el backend esté funcionando:
```powershell
# Abrir navegador o usar curl
http://localhost:5000/api/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "message": "Sistema logistico en linea",
  "version": "2.0"
}
```

### 2. Verificar base de datos:
```powershell
cd backend
python -c "from app import create_app, db; from app.models import Usuario; app = create_app(); app.app_context().push(); print(f'Usuarios en DB: {Usuario.query.count()}')"
```

### 3. Probar endpoint de login:
```powershell
# Usando PowerShell
$body = @{
    identifier = "admin"
    password = "TU_CONTRASEÑA_TEMPORAL"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $body -ContentType "application/json"
```

---

## 🐛 Solución de Problemas Comunes

### Error: "No module named 'pydantic'"
**Solución:** Activar venv e instalar dependencias
```powershell
.\venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### Error: "ImportError: cannot import name 'db'"
**Solución:** Ya resuelto en `rbac.py`. Si persiste, verificar que tienes la última versión del archivo.

### Error: "Cuenta bloqueada" al hacer login
**Solución:** Demasiados intentos fallidos. Esperar 15 minutos o limpiar la tabla:
```powershell
cd backend
python -c "from app import create_app, db; from app.models import Usuario; app = create_app(); app.app_context().push(); u = Usuario.query.filter_by(usuario='admin').first(); u.is_locked = False; u.failed_login_attempts = 0; db.session.commit(); print('✓ Usuario desbloqueado')"
```

### Error: "Credenciales inválidas"
**Causas posibles:**
1. Contraseña incorrecta - Verificar la contraseña temporal en la consola del backend
2. Usuario no existe - Verificar en la base de datos
3. Cuenta deshabilitada - Verificar campo `is_active` y `estado`

### Frontend no se conecta al backend
**Solución:** Verificar variable de entorno en frontend
```powershell
# Crear o editar: frontend/.env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 📊 Arquitectura del Login

```
[Navegador] 
    ↓
[Login.js] → Envía {identifier, password}
    ↓
[api.js] → POST /api/auth/login
    ↓
[Backend: auth.py] → Valida request
    ↓
[auth_service.py] → Procesa autenticación
    ↓
    ├─→ Rate limiting (5 intentos/min)
    ├─→ Buscar usuario por email o username
    ├─→ Verificar estado (activo, no bloqueado)
    ├─→ Verificar contraseña (hash PBKDF2)
    ├─→ Verificar MFA (si está habilitado)
    ├─→ Generar tokens (access + refresh)
    └─→ Registrar en audit_logs
    ↓
[Respuesta JSON]
    {
      "access_token": "eyJ...",
      "refresh_token": "eyJ...",
      "user": {
        "id": 1,
        "email": "admin@transportadora.local",
        "usuario": "admin",
        "roles": ["admin"],
        "permissions": [...]
      }
    }
    ↓
[authStore.js] → Guarda en localStorage
    ↓
[Navigate] → Redirige a Dashboard
```

---

## 🔒 Seguridad Implementada

- ✅ Hash de contraseñas: PBKDF2-SHA256
- ✅ Contraseñas mínimo 12 caracteres
- ✅ MFA con TOTP (Google Authenticator)
- ✅ Rate limiting: 5 intentos por minuto
- ✅ Bloqueo automático: 10 intentos fallidos
- ✅ Tokens JWT con expiración
- ✅ Refresh token rotation
- ✅ Auditoría completa de eventos
- ✅ CORS configurado
- ✅ Headers de seguridad (CSP, X-Frame-Options)
- ✅ Roles y permisos granulares (RBAC)

---

## 📁 Archivos Modificados

1. **backend/app/security/rbac.py**
   - Movidas importaciones dentro de funciones

2. **backend/requirements.txt**
   - Agregadas 5 dependencias faltantes

3. **DIAGNOSTIC_REPORT.md** (NUEVO)
   - Reporte completo del diagnóstico

4. **setup.ps1** (NUEVO)
   - Script de configuración automatizada

5. **QUICK_FIX.md** (ESTE ARCHIVO)
   - Guía rápida de solución

---

## ✅ Checklist de Verificación

- [ ] Entorno virtual creado y activado
- [ ] Dependencias de Python instaladas
- [ ] Migraciones de base de datos aplicadas
- [ ] Usuario admin creado (verificar consola)
- [ ] Backend ejecutándose en http://localhost:5000
- [ ] Frontend instalado (npm install)
- [ ] Frontend ejecutándose en http://localhost:3000
- [ ] Contraseña temporal copiada
- [ ] Login exitoso con credenciales admin
- [ ] Redirige correctamente al Dashboard

---

## 📞 Contacto y Soporte

Si después de seguir esta guía aún tienes problemas:

1. Verificar logs del backend en la consola
2. Verificar logs del frontend en la consola del navegador (F12)
3. Revisar DIAGNOSTIC_REPORT.md para detalles técnicos
4. Verificar que todos los servicios estén ejecutándose

**Logs útiles:**
```powershell
# Ver logs de login attempts
cd backend
python -c "from app import create_app, db; from app.models import LoginAttempt; app = create_app(); app.app_context().push(); for a in LoginAttempt.query.order_by(LoginAttempt.created_at.desc()).limit(5): print(f'{a.email} - {a.success} - {a.created_at}')"
```

---

**¡Sistema listo para usar! 🎉**
