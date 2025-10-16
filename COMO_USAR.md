# 🎯 Cómo Usar Este Sistema - Guía Definitiva

## ✨ Lo Más Importante

### Para Arrancar Todo de Una Vez

```powershell
# Windows - Un solo comando arranca TODO
.\start-dev.ps1 -Docker

# Esperar 10-15 segundos y listo!
# Abre http://localhost:3000
```

```bash
# Linux/Mac
chmod +x start-dev.sh  # Solo primera vez
./start-dev.sh --docker
```

**¡Eso es todo!** 🎉 No necesitas hacer nada más para desarrollo.

---

## 🚀 Inicio Rápido (Primer Día)

### Paso 1: Configuración Inicial (Una sola vez)

```powershell
# 1. Copiar configuración
copy .env.example .env

# 2. (Opcional) Editar .env si quieres cambiar algo
notepad .env
```

### Paso 2: Arrancar Todo

```powershell
.\start-dev.ps1 -Docker
```

### Paso 3: Acceder

Abre tu navegador en: **http://localhost:3000**

**Credenciales:**
- Usuario: `admin`
- Email: `admin@transportadora.local`
- Contraseña: `ChangeMe123!`

---

## 📋 Servicios Que Arrancan Automáticamente

Cuando ejecutas `start-dev.ps1 -Docker`, se inician:

| Servicio | URL | ¿Para qué sirve? |
|----------|-----|------------------|
| **Frontend** | http://localhost:3000 | Tu aplicación web |
| **Backend** | http://localhost:5000 | API REST |
| **API Docs** | http://localhost:5000/api/docs | Documentación de la API |
| **Base de Datos** | localhost:5432 | PostgreSQL |
| **Mailhog** | http://localhost:8025 | Ver emails de prueba |
| **pgAdmin** | http://localhost:5050 | Administrar base de datos |
| **Go CRT API** | http://localhost:8080 | API de CRT |
| **PDF Service** | http://localhost:3002 | Generador de PDFs |

---

## 💻 Uso Diario

### Iniciar Proyecto

```powershell
.\start-dev.ps1 -Docker
```

### Trabajar Normalmente

- Edita archivos en `backend/` o `frontend/`
- Los cambios se ven automáticamente (hot reload)
- No necesitas reiniciar nada

### Ver Logs (Si algo falla)

```powershell
# Ver todos los logs
docker-compose logs -f

# Ver solo backend
docker-compose logs -f backend

# Ver solo frontend
docker-compose logs -f frontend
```

### Detener Todo al Terminar el Día

```powershell
.\start-dev.ps1 -Stop
```

### Limpiar Todo (Empezar de cero)

```powershell
# ⚠️ CUIDADO: Esto borra la base de datos
.\start-dev.ps1 -Clean
```

---

## 🔧 Comandos Útiles

### Docker Compose

```powershell
# Ver estado de servicios
docker-compose ps

# Reiniciar un servicio
docker-compose restart backend

# Ver logs recientes
docker-compose logs --tail=100 backend

# Ejecutar comando en contenedor
docker-compose exec backend flask shell
```

### Base de Datos

```powershell
# Conectar a PostgreSQL
docker-compose exec db psql -U postgres -d logistica

# Backup
docker-compose exec db pg_dump -U postgres logistica > backup.sql

# Restaurar
type backup.sql | docker-compose exec -T db psql -U postgres logistica

# Aplicar migraciones
docker-compose exec backend flask db upgrade
```

### Backend

```powershell
# Entrar al contenedor
docker-compose exec backend bash

# Resetear contraseña de admin
docker-compose exec backend python reset_password_simple.py

# Ejecutar tests
docker-compose exec backend pytest
```

---

## 🐛 Solución de Problemas

### Problema: "Puerto ya en uso"

```powershell
# Ver qué está usando el puerto
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Detener proceso
taskkill /PID <numero_pid> /F
```

### Problema: "Backend no arranca"

```powershell
# 1. Ver logs
docker-compose logs backend

# 2. Verificar migraciones
docker-compose exec backend flask db current
docker-compose exec backend flask db upgrade

# 3. Reiniciar
docker-compose restart backend
```

### Problema: "Frontend no carga"

```powershell
# 1. Ver logs
docker-compose logs frontend

# 2. Verificar build
docker-compose exec frontend ls /usr/share/nginx/html

# 3. Reconstruir
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Problema: "Base de datos no conecta"

```powershell
# 1. Verificar que PostgreSQL esté corriendo
docker-compose ps db

# 2. Verificar salud
docker-compose exec db pg_isready

# 3. Reiniciar
docker-compose restart db
```

### Verificar Salud del Sistema

```powershell
.\health-check.ps1
```

---

## 🏭 Para Producción

### Preparación Básica

1. **Editar `.env` con valores reales:**
   ```bash
   # Generar claves secretas
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   
   # Editar .env y cambiar:
   SECRET_KEY=<clave-generada>
   JWT_SECRET_KEY=<otra-clave-generada>
   DATABASE_URL=postgresql://user:pass@host/db
   CORS_ALLOW_ORIGINS=https://tu-dominio.com
   # ... más configuraciones
   ```

2. **Usar Docker Compose de producción:**
   ```bash
   docker-compose -f docker-compose.prod.yml build
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Configurar SSL/TLS:**
   ```bash
   # Instalar Certbot
   sudo apt install certbot
   
   # Obtener certificado
   sudo certbot certonly --standalone -d tu-dominio.com
   ```

4. **Configurar backups automáticos**

### Documentación Completa de Producción

📖 **Lee primero:** [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) (100+ items a verificar)

📖 **Guía paso a paso:** [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)

---

## 📚 Documentación Disponible

### Para Empezar
- **[QUICK_START.md](QUICK_START.md)** - Inicio rápido detallado
- **[INDEX.md](INDEX.md)** - Índice de toda la documentación
- **Este archivo** - Resumen ejecutivo

### Para Desarrollar
- **[WORKFLOW_VISUAL.md](WORKFLOW_VISUAL.md)** - Diagramas de flujos
- **[README_NEW.md](README_NEW.md)** - Documentación técnica

### Para Producción
- **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)** - Despliegue detallado
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - Checklist completo
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Guía integral

### Específicos
- **[SECURITY_FEATURES.md](SECURITY_FEATURES.md)** - Características de seguridad
- **[USUARIOS_CUSTOMIZATION_GUIDE.md](USUARIOS_CUSTOMIZATION_GUIDE.md)** - Gestión de usuarios
- **[RESUMEN_MEJORAS.md](RESUMEN_MEJORAS.md)** - Mejoras implementadas

---

## ❓ Preguntas Frecuentes

### ¿Tengo que iniciar cada servicio por separado?

**No.** Ejecuta `.\start-dev.ps1 -Docker` y todo arranca automáticamente.

### ¿Los cambios se ven automáticamente?

**Sí.** El hot reload está activado para backend y frontend.

### ¿Necesito instalar PostgreSQL en mi máquina?

**No.** PostgreSQL corre en Docker automáticamente.

### ¿Necesito instalar dependencias manualmente?

**No.** Docker instala todo automáticamente. Si usas modo local (`-Local`), el script instala las dependencias.

### ¿Los datos persisten entre reinicios?

**Sí.** Los datos de PostgreSQL persisten en volúmenes de Docker.

### ¿Cómo borro todo y empiezo de cero?

```powershell
.\start-dev.ps1 -Clean
```

### ¿Qué hago si algo no funciona?

1. Ejecuta `.\health-check.ps1`
2. Revisa los logs: `docker-compose logs -f`
3. Lee [QUICK_START.md](QUICK_START.md#solución-de-problemas-comunes)

### ¿Cómo despliego a producción?

1. Lee [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)
2. Sigue [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)

---

## 🎯 Flujo de Trabajo Recomendado

### Cada Día

```
1. Llegar → .\start-dev.ps1 -Docker
2. Trabajar (editar código)
3. Ver cambios automáticamente
4. Terminar → .\start-dev.ps1 -Stop
```

### Cuando Hay Problemas

```
1. .\health-check.ps1
2. docker-compose logs -f
3. Revisar guías de troubleshooting
4. Reiniciar servicio: docker-compose restart [servicio]
```

### Antes de Producción

```
1. Leer PRODUCTION_CHECKLIST.md
2. Configurar .env con valores reales
3. Seguir PRODUCTION_DEPLOYMENT.md
4. Hacer deploy con docker-compose.prod.yml
```

---

## 💡 Tips Importantes

✅ **Siempre usa** `start-dev.ps1` para desarrollo  
✅ **No commitees** el archivo `.env` al repositorio  
✅ **Revisa los logs** cuando algo falle  
✅ **Hot reload** está activado - no reinicies manualmente  
✅ **Los datos persisten** - puedes detener y volver a iniciar  
✅ **Usa `-Clean`** solo si quieres empezar de cero  
✅ **Lee la documentación** antes de producción  

---

## 🆘 Ayuda Rápida

| Necesito | Comando |
|----------|---------|
| Iniciar todo | `.\start-dev.ps1 -Docker` |
| Detener todo | `.\start-dev.ps1 -Stop` |
| Ver logs | `docker-compose logs -f` |
| Ver salud | `.\health-check.ps1` |
| Reiniciar servicio | `docker-compose restart backend` |
| Limpiar todo | `.\start-dev.ps1 -Clean` |
| Ayuda detallada | Leer [QUICK_START.md](QUICK_START.md) |

---

## 🎉 ¡Listo!

Ya tienes todo lo necesario para:
- ✅ Desarrollar cómodamente
- ✅ Diagnosticar problemas
- ✅ Desplegar a producción

**¿Dudas?** Revisa el [INDEX.md](INDEX.md) para encontrar la documentación específica que necesitas.

---

**Última actualización:** 2025-10-16
