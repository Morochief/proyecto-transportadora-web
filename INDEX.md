# 📚 Índice de Documentación - Sistema de Transportadora

Esta es la guía de navegación para toda la documentación del proyecto.

---

## 🎯 Empezar Aquí

Si eres nuevo en el proyecto, sigue este orden:

1. **[QUICK_START.md](QUICK_START.md)** ⭐ **EMPIEZA AQUÍ**
   - Cómo arrancar todo de una vez
   - URLs de servicios
   - Comandos básicos
   - Solución de problemas comunes

2. **[README_NEW.md](README_NEW.md)** 
   - Documentación general del proyecto
   - Características principales
   - Estructura del proyecto

3. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**
   - Guía integral de todo el sistema
   - Resumen de todas las mejoras
   - Workflows completos

---

## 📖 Documentación por Categoría

### 🚀 Desarrollo

| Documento | Descripción | ¿Cuándo usar? |
|-----------|-------------|---------------|
| **[QUICK_START.md](QUICK_START.md)** | Inicio rápido y comandos útiles | Todos los días |
| **[WORKFLOW_VISUAL.md](WORKFLOW_VISUAL.md)** | Diagramas de flujos de trabajo | Para entender procesos |
| Scripts `start-dev.*` | Scripts de inicio automático | Iniciar el proyecto |
| Script `health-check.ps1` | Verificación de salud | Diagnosticar problemas |

**Archivos clave:**
- `start-dev.ps1` - Inicio en Windows
- `start-dev.sh` - Inicio en Linux/Mac
- `health-check.ps1` - Health check
- `.env.example` - Template de configuración
- `docker-compose.yml` - Docker para desarrollo

---

### 🏭 Producción

| Documento | Descripción | ¿Cuándo usar? |
|-----------|-------------|---------------|
| **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)** | Guía completa de despliegue | Desplegar a producción |
| **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** | 100+ items a verificar | Antes de producción |
| **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** | Guía integral del sistema | Referencia completa |

**Archivos clave:**
- `docker-compose.prod.yml` - Docker para producción
- `Dockerfile.backend` - Backend optimizado
- `Dockerfile.frontend` - Frontend optimizado
- `nginx.conf` - Configuración Nginx
- `default.conf` - Virtual host Nginx
- `docker-entrypoint-backend.sh` - Inicialización backend

---

### 🔐 Seguridad

| Documento | Descripción | ¿Cuándo usar? |
|-----------|-------------|---------------|
| **[SECURITY_FEATURES.md](SECURITY_FEATURES.md)** | Características de seguridad | Entender seguridad |
| Sección en **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** | Checklist de seguridad | Pre-producción |

**Características:**
- JWT de corta duración
- MFA/TOTP
- RBAC (roles y permisos)
- Rate limiting
- Auditoría completa
- Políticas de contraseñas

---

### 👥 Usuarios y Permisos

| Documento | Descripción | ¿Cuándo usar? |
|-----------|-------------|---------------|
| **[USUARIOS_CUSTOMIZATION_GUIDE.md](USUARIOS_CUSTOMIZATION_GUIDE.md)** | Gestión de usuarios | Administrar usuarios |
| **[USUARIOS_UI_IMPROVEMENTS.md](USUARIOS_UI_IMPROVEMENTS.md)** | Mejoras de UI | Ver mejoras visuales |

---

### 🐛 Troubleshooting

| Sección | Ubicación | Qué cubre |
|---------|-----------|-----------|
| Problemas Comunes | [QUICK_START.md](QUICK_START.md#solución-de-problemas-comunes) | Errores frecuentes |
| Troubleshooting Completo | [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md#troubleshooting) | Problemas avanzados |
| Health Check | Script `health-check.ps1` | Diagnóstico automático |

---

## 🗂️ Archivos por Tipo

### Scripts Ejecutables

```bash
start-dev.ps1              # Inicio Windows
start-dev.sh               # Inicio Linux/Mac  
health-check.ps1           # Health check
docker-entrypoint-backend.sh  # Inicialización backend
```

### Configuración Docker

```bash
docker-compose.yml         # Desarrollo
docker-compose.prod.yml    # Producción
Dockerfile.backend         # Backend
Dockerfile.frontend        # Frontend
```

### Configuración Nginx

```bash
nginx.conf                 # Config principal
default.conf              # Virtual host
```

### Variables de Entorno

```bash
.env.example              # Template
.env                      # Tu configuración (no commitear)
.gitignore               # Archivos a ignorar
```

### Documentación

```bash
# Principales
QUICK_START.md            # ⭐ Inicio rápido
README_NEW.md             # Documentación general
DEPLOYMENT_GUIDE.md       # Guía integral

# Producción
PRODUCTION_DEPLOYMENT.md  # Despliegue detallado
PRODUCTION_CHECKLIST.md   # Checklist 100+ items

# Específicos
SECURITY_FEATURES.md      # Seguridad
USUARIOS_CUSTOMIZATION_GUIDE.md  # Usuarios
WORKFLOW_VISUAL.md        # Diagramas

# Resúmenes
RESUMEN_MEJORAS.md        # Mejoras implementadas
INDEX.md                  # Este archivo
```

---

## 🎓 Guías por Escenario

### Escenario 1: "Soy nuevo, quiero desarrollar"

1. Lee [QUICK_START.md](QUICK_START.md)
2. Ejecuta `.\start-dev.ps1 -Docker`
3. Abre http://localhost:3000
4. ¡Empieza a desarrollar!

### Escenario 2: "Tengo un problema"

1. Ejecuta `.\health-check.ps1`
2. Revisa [QUICK_START.md](QUICK_START.md#solución-de-problemas-comunes)
3. Revisa logs: `docker-compose logs -f`
4. Si persiste, ver [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md#troubleshooting)

### Escenario 3: "Voy a desplegar a producción"

1. Lee [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)
2. Sigue [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
3. Configura `.env` con valores de producción
4. Ejecuta `docker-compose -f docker-compose.prod.yml up -d`
5. Configura SSL/TLS
6. Configura backups
7. Monitorea

### Escenario 4: "Necesito configurar seguridad"

1. Lee [SECURITY_FEATURES.md](SECURITY_FEATURES.md)
2. Revisa sección de seguridad en [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)
3. Genera claves secretas
4. Configura SMTP real
5. Habilita MFA para usuarios

### Escenario 5: "Necesito gestionar usuarios"

1. Lee [USUARIOS_CUSTOMIZATION_GUIDE.md](USUARIOS_CUSTOMIZATION_GUIDE.md)
2. Usa el panel de administración en `/usuarios`
3. Asigna roles y permisos
4. Configura políticas de contraseñas en `.env`

---

## 🔍 Búsqueda Rápida

### ¿Cómo...?

| Pregunta | Respuesta |
|----------|-----------|
| ¿Iniciar el proyecto? | `.\start-dev.ps1 -Docker` |
| ¿Detener servicios? | `.\start-dev.ps1 -Stop` |
| ¿Ver logs? | `docker-compose logs -f [servicio]` |
| ¿Verificar salud? | `.\health-check.ps1` |
| ¿Hacer backup de DB? | `docker-compose exec db pg_dump...` |
| ¿Aplicar migraciones? | `docker-compose exec backend flask db upgrade` |
| ¿Resetear password admin? | `docker-compose exec backend python reset_password_simple.py` |
| ¿Configurar SSL? | Ver [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md#configuración-de-ssltls) |
| ¿Configurar backups? | Ver [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md#backups-y-recuperación) |

### URLs Importantes

```
Frontend:     http://localhost:3000
Backend API:  http://localhost:5000
API Docs:     http://localhost:5000/api/docs
Mailhog:      http://localhost:8025
pgAdmin:      http://localhost:5050
Go CRT API:   http://localhost:8080
PDF Service:  http://localhost:3002
```

---

## 📊 Estadísticas del Proyecto

### Documentación
- **Guías:** 10 documentos principales
- **Líneas:** ~3,500+ líneas de documentación
- **Scripts:** 4 scripts ejecutables
- **Configs:** 6 archivos de configuración

### Características
- **Servicios:** 7 (PostgreSQL, Backend, Frontend, Mailhog, pgAdmin, Go API, PDF)
- **Endpoints API:** 13+ principales
- **Roles:** 3 (admin, operador, visor)
- **Seguridad:** MFA, RBAC, JWT, Rate Limiting, Auditoría

---

## 🎯 Próximos Pasos

### Para Desarrolladores
1. ✅ Leer [QUICK_START.md](QUICK_START.md)
2. ✅ Ejecutar `start-dev.ps1 -Docker`
3. ✅ Familiarizarse con el código
4. ⏳ Revisar [WORKFLOW_VISUAL.md](WORKFLOW_VISUAL.md)

### Para DevOps/SysAdmin
1. ✅ Leer [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
2. ✅ Revisar [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)
3. ⏳ Configurar servidor de staging
4. ⏳ Configurar backups automáticos
5. ⏳ Configurar monitoreo

### Para Gerencia de Proyecto
1. ✅ Leer [README_NEW.md](README_NEW.md)
2. ✅ Leer [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
3. ⏳ Planificar despliegue a producción
4. ⏳ Definir SLAs y métricas

---

## 📞 Soporte

1. **Documentación:** Revisar este índice
2. **Health Check:** Ejecutar `.\health-check.ps1`
3. **Logs:** `docker-compose logs -f`
4. **Troubleshooting:** Ver guías específicas

---

## 🔄 Mantenimiento de Documentación

Esta documentación debe actualizarse cuando:
- Se agreguen nuevas características
- Se modifiquen workflows
- Se descubran nuevos problemas comunes
- Se actualicen dependencias importantes

---

**Última actualización:** 2025-10-16  
**Versión de la documentación:** 1.0  
**Estado:** ✅ Completo y actualizado
