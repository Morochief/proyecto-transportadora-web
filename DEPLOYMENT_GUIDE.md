# 📘 Guía Completa de Despliegue y Desarrollo

Este documento resume todas las mejoras implementadas para iniciar el proyecto fácilmente y prepararlo para producción.

---

## 🎯 ¿Qué se ha implementado?

### 1. Scripts de Inicio Automático

#### Windows: `start-dev.ps1`
Script PowerShell que inicia todo el proyecto con un solo comando.

**Opciones disponibles:**
```powershell
.\start-dev.ps1 -Docker    # Iniciar con Docker (recomendado)
.\start-dev.ps1 -Local     # Iniciar localmente (backend/frontend local, DB en Docker)
.\start-dev.ps1 -Stop      # Detener todos los servicios
.\start-dev.ps1 -Clean     # Limpiar todo (elimina datos)
```

#### Linux/Mac: `start-dev.sh`
Script Bash equivalente para sistemas Unix.

**Opciones disponibles:**
```bash
./start-dev.sh --docker    # Iniciar con Docker
./start-dev.sh --local     # Iniciar localmente
./start-dev.sh --stop      # Detener servicios
./start-dev.sh --clean     # Limpiar todo
```

### 2. Configuración de Producción

#### `docker-compose.prod.yml`
Configuración Docker Compose optimizada para producción con:
- Gunicorn como servidor WSGI (4 workers)
- Nginx para servir el frontend
- Health checks para todos los servicios
- Límites de recursos (CPU/memoria)
- Restart policies
- Networks aisladas
- Volúmenes nombrados

#### Dockerfiles de Producción
- **`Dockerfile.backend`**: Build multi-stage para backend optimizado
- **`Dockerfile.frontend`**: Build multi-stage con nginx
- **`docker-entrypoint-backend.sh`**: Script de inicialización automática

#### Configuración Nginx
- **`nginx.conf`**: Configuración principal de nginx
- **`default.conf`**: Configuración del virtual host con:
  - Security headers (CSP, X-Frame-Options, etc.)
  - Compresión gzip
  - Cache de assets estáticos
  - SPA routing para React

### 3. Variables de Entorno

#### `.env.example`
Template completo con todas las variables necesarias:
- Configuración de seguridad (JWT, SECRET_KEY)
- Base de datos
- SMTP/Email
- CORS y URLs
- Administrador por defecto
- Políticas de contraseñas
- Rate limiting
- MFA
- Auditoría y logs
- Zona horaria

### 4. Documentación

#### `QUICK_START.md`
Guía rápida con:
- Comandos para iniciar todo
- URLs de todos los servicios
- Credenciales por defecto
- Comandos útiles de Docker
- Solución de problemas comunes
- Workflow de desarrollo

#### `PRODUCTION_DEPLOYMENT.md`
Guía completa de producción con:
- Requisitos previos
- Configuración paso a paso
- SSL/TLS con Let's Encrypt
- Backups y recuperación
- Monitoreo y logs
- Checklist de seguridad
- Troubleshooting detallado

#### `PRODUCTION_CHECKLIST.md`
Checklist exhaustivo con más de 100 items para verificar antes de producción:
- Seguridad
- Base de datos
- Backend
- Frontend
- Docker
- Networking y DNS
- Monitoreo
- Email
- Testing
- Documentación

### 5. Herramientas Adicionales

#### `health-check.ps1`
Script de verificación de salud que chequea:
- Estado de contenedores Docker
- Endpoints HTTP
- Base de datos
- Recursos del sistema
- Errores recientes en logs

#### `.gitignore`
Configurado para excluir:
- Variables de entorno (`.env`)
- Archivos temporales
- Node modules
- Python cache
- Logs y backups
- Certificados SSL

### 6. Dependencias Actualizadas

#### `backend/requirements.txt`
Agregado **gunicorn** para producción:
```
gunicorn==21.2.0
```

---

## 🚀 Inicio Rápido

### Desarrollo - Primera Vez

```powershell
# 1. Clonar repositorio
git clone <tu-repo>
cd proyecto-transportadora-web

# 2. Copiar configuración
copy .env.example .env

# 3. Iniciar todo
.\start-dev.ps1 -Docker

# 4. Esperar 10-15 segundos y abrir
# http://localhost:3000
```

### Uso Diario

```powershell
# Iniciar
.\start-dev.ps1 -Docker

# Trabajar...

# Detener al terminar el día
.\start-dev.ps1 -Stop
```

---

## 🏭 Despliegue a Producción

### Preparación

1. **Configurar servidor:**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install docker.io docker-compose
   ```

2. **Clonar y configurar:**
   ```bash
   cd /opt
   git clone <tu-repo> transportadora
   cd transportadora
   
   # Configurar .env
   cp .env.example .env
   nano .env  # Editar con valores de producción
   ```

3. **Variables críticas a cambiar:**
   ```bash
   SECRET_KEY=<generar-clave-aleatoria>
   JWT_SECRET_KEY=<generar-otra-clave>
   DATABASE_URL=postgresql://user:pass@host/db
   CORS_ALLOW_ORIGINS=https://tu-dominio.com
   REACT_APP_API_URL=https://api.tu-dominio.com/api
   # ... y más (ver .env.example)
   ```

4. **Desplegar:**
   ```bash
   docker-compose -f docker-compose.prod.yml build
   docker-compose -f docker-compose.prod.yml up -d
   ```

5. **Verificar:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   docker-compose -f docker-compose.prod.yml logs -f
   ```

### SSL/TLS con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot

# Obtener certificado
sudo certbot certonly --standalone -d tu-dominio.com

# Configurar renovación automática
sudo crontab -e
# Agregar: 0 0 * * * certbot renew --quiet
```

---

## 📊 Arquitectura de Producción

```
                    ┌─────────────────┐
                    │   Internet      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Nginx (SSL)    │
                    │  Port 80/443    │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────▼────────┐         ┌─────────▼────────┐
     │   Frontend      │         │   Backend API    │
     │   (React+Nginx) │         │   (Flask+Gunicorn)│
     │   Port 80       │         │   Port 5000      │
     └─────────────────┘         └─────────┬────────┘
                                           │
                                  ┌────────▼────────┐
                                  │   PostgreSQL    │
                                  │   Port 5432     │
                                  └─────────────────┘
```

---

## 🔐 Seguridad

### Antes de Producción

1. **Generar claves secretas:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

2. **Cambiar todas las contraseñas:**
   - Admin de la aplicación
   - PostgreSQL
   - pgAdmin
   - SMTP

3. **Configurar firewall:**
   ```bash
   sudo ufw enable
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

4. **Revisar checklist completo:**
   Ver [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md)

---

## 🛠️ Comandos Útiles

### Docker Compose

```bash
# Ver logs
docker-compose logs -f backend

# Reiniciar servicio
docker-compose restart backend

# Ejecutar comando en contenedor
docker-compose exec backend flask shell

# Ver estadísticas
docker stats

# Backup de base de datos
docker-compose exec db pg_dump -U postgres logistica > backup.sql
```

### Mantenimiento

```bash
# Actualizar código
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Ver salud del sistema
.\health-check.ps1  # Windows
./health-check.sh   # Linux

# Limpiar imágenes viejas
docker system prune -a
```

---

## 📋 Servicios y Puertos

| Servicio | Puerto | URL | Descripción |
|----------|--------|-----|-------------|
| Frontend | 3000 | http://localhost:3000 | Aplicación React |
| Backend | 5000 | http://localhost:5000 | API Flask |
| PostgreSQL | 5432 | localhost:5432 | Base de datos |
| Mailhog | 8025 | http://localhost:8025 | SMTP testing |
| pgAdmin | 5050 | http://localhost:5050 | DB admin |
| Go CRT API | 8080 | http://localhost:8080 | API Go |
| PDF Service | 3002 | http://localhost:3002 | PDF generator |

---

## 🐛 Troubleshooting

### Backend no inicia

```bash
# Ver logs
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

### Problemas de permisos (Linux)

```bash
# Dar permisos a scripts
chmod +x start-dev.sh
chmod +x health-check.sh
chmod +x docker-entrypoint-backend.sh
```

---

## 📚 Documentos Relacionados

- [`QUICK_START.md`](QUICK_START.md) - Inicio rápido y comandos básicos
- [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md) - Guía detallada de producción
- [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md) - Checklist pre-deployment
- [`SECURITY_FEATURES.md`](SECURITY_FEATURES.md) - Características de seguridad
- [`README.md`](README.md) - Documentación general

---

## 🎯 Próximos Pasos Recomendados

### Corto Plazo
1. ✅ Probar inicio con `.\start-dev.ps1 -Docker`
2. ✅ Familiarizarse con los servicios
3. ✅ Revisar logs con `docker-compose logs -f`

### Antes de Producción
1. ⏳ Revisar y completar `PRODUCTION_CHECKLIST.md`
2. ⏳ Configurar backups automáticos
3. ⏳ Configurar SSL/TLS
4. ⏳ Configurar monitoreo
5. ⏳ Ejecutar pruebas de carga

### Producción
1. ⏳ Desplegar en staging primero
2. ⏳ Ejecutar smoke tests
3. ⏳ Configurar dominio y DNS
4. ⏳ Desplegar a producción
5. ⏳ Monitorear y optimizar

---

## 💡 Tips

- **Hot Reload**: En desarrollo, los cambios se reflejan automáticamente
- **Logs**: Siempre revisar logs cuando algo falle
- **Backups**: Configurar desde el día 1
- **Seguridad**: Nunca commitear `.env` al repositorio
- **Monitoreo**: Configurar alertas antes de producción

---

## 🆘 Soporte

1. Revisar documentación en este repositorio
2. Revisar logs: `docker-compose logs -f`
3. Ejecutar health check: `.\health-check.ps1`
4. Consultar troubleshooting en `PRODUCTION_DEPLOYMENT.md`

---

**¡Todo listo para desarrollar y desplegar! 🚀**

Última actualización: 2025-10-16
