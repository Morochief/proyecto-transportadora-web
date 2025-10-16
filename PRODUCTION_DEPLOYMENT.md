# 🚀 Guía de Despliegue a Producción

Esta guía te ayudará a desplegar el Sistema de Transportadora en un entorno de producción de forma segura y eficiente.

## 📋 Índice

1. [Requisitos Previos](#requisitos-previos)
2. [Inicio Rápido - Desarrollo](#inicio-rápido---desarrollo)
3. [Preparación para Producción](#preparación-para-producción)
4. [Despliegue con Docker](#despliegue-con-docker)
5. [Configuración de SSL/TLS](#configuración-de-ssltls)
6. [Backups y Recuperación](#backups-y-recuperación)
7. [Monitoreo y Logs](#monitoreo-y-logs)
8. [Seguridad](#seguridad)
9. [Troubleshooting](#troubleshooting)

---

## 📦 Requisitos Previos

### Para Desarrollo
- Windows 10/11 con PowerShell 5.1+
- Docker Desktop 20.10+
- Python 3.11+ (para modo local)
- Node.js 18+ (para modo local)
- Git

### Para Producción
- Linux Ubuntu 20.04+ / Debian 11+ / RHEL 8+
- Docker 20.10+ y Docker Compose 2.0+
- 4GB RAM mínimo (8GB recomendado)
- 20GB espacio en disco (50GB+ para producción)
- Dominio configurado (para SSL)

---

## ⚡ Inicio Rápido - Desarrollo

### Opción 1: Docker (Recomendado)

**Windows:**
```powershell
# Iniciar todo con un comando
.\start-dev.ps1 -Docker

# Detener servicios
.\start-dev.ps1 -Stop

# Limpiar todo (bases de datos, volúmenes, etc.)
.\start-dev.ps1 -Clean
```

**Linux/Mac:**
```bash
# Hacer ejecutable
chmod +x start-dev.sh

# Iniciar servicios
./start-dev.sh --docker

# Detener servicios
./start-dev.sh --stop
```

### Opción 2: Modo Local

```powershell
# Windows
.\start-dev.ps1 -Local

# Linux/Mac
./start-dev.sh --local
```

### Servicios Disponibles

Después de iniciar, accede a:

- 🌐 **Frontend:** http://localhost:3000
- 🔧 **Backend API:** http://localhost:5000
- 📊 **API Docs:** http://localhost:5000/api/docs
- 📧 **Mailhog:** http://localhost:8025
- 🗄️ **pgAdmin:** http://localhost:5050
- ⚡ **Go CRT API:** http://localhost:8080
- 📄 **PDF Service:** http://localhost:3002

**Credenciales por defecto:**
- Usuario: `admin`
- Email: `admin@transportadora.local`
- Contraseña: `ChangeMe123!` (cambiar en `.env`)

---

## 🔧 Preparación para Producción

### 1. Configurar Variables de Entorno

```bash
# Copiar ejemplo
cp .env.example .env

# Editar con valores de producción
nano .env
```

**Variables CRÍTICAS a cambiar:**

```bash
# SEGURIDAD - Generar claves aleatorias
SECRET_KEY=<generar-clave-aleatoria-64-caracteres>
JWT_SECRET_KEY=<generar-otra-clave-aleatoria-64-caracteres>

# BASE DE DATOS
DATABASE_URL=postgresql://usuario:password@host:5432/logistica

# FRONTEND Y CORS
CORS_ALLOW_ORIGINS=https://tu-dominio.com
FRONTEND_URL=https://tu-dominio.com
REACT_APP_API_URL=https://api.tu-dominio.com/api

# SMTP (ejemplo con Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_TLS=true
SMTP_USERNAME=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
MAIL_FROM=noreply@tu-dominio.com

# ADMIN
DEFAULT_ADMIN_PASSWORD=<password-seguro-temporal>
```

### 2. Generar Claves Secretas

**En Python:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

**En PowerShell:**
```powershell
-join ((48..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**En Linux:**
```bash
openssl rand -base64 48
```

### 3. Configurar Base de Datos

#### PostgreSQL Externo

```bash
# Conectar a tu servidor PostgreSQL
psql -h tu-host -U usuario

# Crear base de datos
CREATE DATABASE logistica;
CREATE USER transportadora WITH PASSWORD 'password-seguro';
GRANT ALL PRIVILEGES ON DATABASE logistica TO transportadora;
```

#### PostgreSQL con Docker

La configuración está en `docker-compose.prod.yml`, asegúrate de cambiar:

```yaml
POSTGRES_USER: usuario_produccion
POSTGRES_PASSWORD: password_muy_seguro
POSTGRES_DB: logistica
```

---

## 🐳 Despliegue con Docker

### Paso 1: Clonar Repositorio

```bash
cd /opt
git clone <tu-repositorio> transportadora
cd transportadora
```

### Paso 2: Configurar Entorno

```bash
# Copiar y editar .env
cp .env.example .env
nano .env

# Verificar configuración
cat .env
```

### Paso 3: Build de Imágenes

```bash
# Producción
docker-compose -f docker-compose.prod.yml build

# Verificar imágenes creadas
docker images | grep transportadora
```

### Paso 4: Iniciar Servicios

```bash
# Iniciar en background
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Ver estado
docker-compose -f docker-compose.prod.yml ps
```

### Paso 5: Verificar Salud

```bash
# Backend health check
curl http://localhost:5000/api/health

# Frontend
curl http://localhost/

# Base de datos
docker-compose -f docker-compose.prod.yml exec db pg_isready
```

### Comandos Útiles

```bash
# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart

# Ver logs de un servicio específico
docker-compose -f docker-compose.prod.yml logs -f backend

# Ejecutar comando en contenedor
docker-compose -f docker-compose.prod.yml exec backend flask shell

# Detener todo
docker-compose -f docker-compose.prod.yml down

# Detener y eliminar volúmenes (¡CUIDADO!)
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🔒 Configuración de SSL/TLS

### Opción 1: Nginx Reverse Proxy + Let's Encrypt

#### 1. Instalar Certbot

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# RHEL/CentOS
sudo yum install certbot python3-certbot-nginx
```

#### 2. Obtener Certificado

```bash
# Detener servicios temporalmente
docker-compose -f docker-compose.prod.yml down

# Obtener certificado
sudo certbot certonly --standalone -d tu-dominio.com -d www.tu-dominio.com

# Reiniciar servicios
docker-compose -f docker-compose.prod.yml up -d
```

#### 3. Configurar Nginx

Crear `nginx-proxy.conf`:

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 4. Renovación Automática

```bash
# Test de renovación
sudo certbot renew --dry-run

# Cron job para renovación automática
sudo crontab -e

# Agregar línea:
0 0 * * * certbot renew --quiet && systemctl reload nginx
```

### Opción 2: Cloudflare

1. Agregar dominio a Cloudflare
2. Configurar DNS A record apuntando a tu servidor
3. Habilitar SSL/TLS en modo "Full"
4. Configurar Origin Certificates en Cloudflare
5. Habilitar:
   - Always Use HTTPS
   - Automatic HTTPS Rewrites
   - HTTP Strict Transport Security (HSTS)

---

## 💾 Backups y Recuperación

### Backup Automático de Base de Datos

Crear script `backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/transportadora/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="logistica_backup_$DATE.sql.gz"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Backup
docker-compose -f /opt/transportadora/docker-compose.prod.yml exec -T db \
    pg_dump -U postgres logistica | gzip > "$BACKUP_DIR/$FILENAME"

# Mantener solo últimos 30 backups
find $BACKUP_DIR -name "logistica_backup_*.sql.gz" -type f -mtime +30 -delete

echo "Backup completado: $FILENAME"
```

```bash
# Hacer ejecutable
chmod +x backup-db.sh

# Programar con cron (diario a las 2 AM)
crontab -e
0 2 * * * /opt/transportadora/backup-db.sh >> /var/log/backup-db.log 2>&1
```

### Restaurar desde Backup

```bash
# Detener servicios
docker-compose -f docker-compose.prod.yml down

# Restaurar
gunzip < backups/logistica_backup_FECHA.sql.gz | \
docker-compose -f docker-compose.prod.yml exec -T db \
    psql -U postgres logistica

# Reiniciar servicios
docker-compose -f docker-compose.prod.yml up -d
```

### Backup Completo del Sistema

```bash
#!/bin/bash
# backup-full.sh
BACKUP_ROOT="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup de base de datos
docker-compose -f docker-compose.prod.yml exec -T db \
    pg_dump -U postgres logistica | gzip > "$BACKUP_ROOT/db_$DATE.sql.gz"

# Backup de archivos subidos (si aplica)
tar -czf "$BACKUP_ROOT/uploads_$DATE.tar.gz" backend/uploads/

# Backup de configuración
tar -czf "$BACKUP_ROOT/config_$DATE.tar.gz" .env docker-compose.prod.yml

echo "Backup completo finalizado: $DATE"
```

---

## 📊 Monitoreo y Logs

### Ver Logs en Tiempo Real

```bash
# Todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Backend únicamente
docker-compose -f docker-compose.prod.yml logs -f backend

# Últimas 100 líneas
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Logs Estructurados

Los logs del backend están en formato JSON para facilitar integración con SIEM:

```bash
# Ver logs del backend
docker-compose -f docker-compose.prod.yml exec backend tail -f logs/app.log

# Filtrar por nivel
docker-compose -f docker-compose.prod.yml exec backend \
    cat logs/app.log | jq 'select(.level=="ERROR")'
```

### Métricas con Docker Stats

```bash
# Ver uso de recursos en tiempo real
docker stats

# Específico para nuestros servicios
docker stats $(docker ps --filter name=transportadora --format "{{.Names}}")
```

### Health Checks

```bash
# Script de monitoreo simple
#!/bin/bash
# health-check.sh

services=("frontend" "backend" "db")

for service in "${services[@]}"; do
    status=$(docker-compose -f docker-compose.prod.yml ps $service --format json | jq -r '.Health')
    echo "$service: $status"
done
```

### Integración con Monitoring Tools

#### Prometheus + Grafana (Opcional)

Ver archivo `docker-compose.monitoring.yml` para configuración completa.

#### Logs a Syslog

En `docker-compose.prod.yml`, agregar:

```yaml
logging:
  driver: syslog
  options:
    syslog-address: "tcp://localhost:514"
    tag: "{{.Name}}"
```

---

## 🛡️ Seguridad

### Checklist de Seguridad

- [ ] Cambiar todas las contraseñas por defecto
- [ ] Generar claves secretas únicas y seguras
- [ ] Configurar SSL/TLS
- [ ] Habilitar firewall
- [ ] Configurar backups automáticos
- [ ] Actualizar dependencias regularmente
- [ ] Revisar logs de auditoría
- [ ] Configurar rate limiting
- [ ] Habilitar MFA para todos los usuarios
- [ ] Configurar SMTP con credenciales seguras

### Firewall (UFW - Ubuntu)

```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Permitir PostgreSQL solo desde localhost
sudo ufw allow from 127.0.0.1 to any port 5432

# Ver estado
sudo ufw status
```

### Actualizar Dependencias

```bash
# Backend
cd backend
pip list --outdated
pip install --upgrade -r requirements.txt

# Frontend
cd frontend
npm outdated
npm update

# Rebuild imágenes
docker-compose -f docker-compose.prod.yml build --no-cache
```

### Escaneo de Vulnerabilidades

```bash
# Python
pip install safety
safety check -r backend/requirements.txt

# Node.js
cd frontend
npm audit
npm audit fix

# Docker
docker scan transportadora-backend:prod
```

---

## 🔍 Troubleshooting

### El backend no inicia

```bash
# Ver logs detallados
docker-compose -f docker-compose.prod.yml logs backend

# Verificar base de datos
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -l

# Verificar migraciones
docker-compose -f docker-compose.prod.yml exec backend flask db current

# Aplicar migraciones manualmente
docker-compose -f docker-compose.prod.yml exec backend flask db upgrade
```

### Error de conexión a la base de datos

```bash
# Verificar que PostgreSQL esté corriendo
docker-compose -f docker-compose.prod.yml ps db

# Verificar conectividad
docker-compose -f docker-compose.prod.yml exec backend \
    python -c "from app import db; print(db.engine.url)"

# Verificar credenciales
docker-compose -f docker-compose.prod.yml exec db \
    psql -U postgres -c "\du"
```

### Frontend no carga

```bash
# Verificar build
docker-compose -f docker-compose.prod.yml exec frontend ls -la /usr/share/nginx/html

# Verificar nginx
docker-compose -f docker-compose.prod.yml exec frontend nginx -t

# Ver logs nginx
docker-compose -f docker-compose.prod.yml logs frontend
```

### Problemas de CORS

```bash
# Verificar variable de entorno
docker-compose -f docker-compose.prod.yml exec backend env | grep CORS

# Test desde curl
curl -H "Origin: https://tu-dominio.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:5000/api/auth/login -v
```

### Alto uso de memoria

```bash
# Ver consumo
docker stats --no-stream

# Ajustar límites en docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 512M
```

### Reinicio completo

```bash
# Detener todo
docker-compose -f docker-compose.prod.yml down

# Eliminar contenedores y volúmenes (¡CUIDADO CON LOS DATOS!)
docker-compose -f docker-compose.prod.yml down -v

# Rebuild completo
docker-compose -f docker-compose.prod.yml build --no-cache

# Iniciar
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📚 Recursos Adicionales

- [Documentación Flask](https://flask.palletsprojects.com/)
- [Documentación React](https://react.dev/)
- [Docker Compose](https://docs.docker.com/compose/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Nginx](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)

---

## 🆘 Soporte

Para problemas o preguntas:

1. Revisar logs: `docker-compose -f docker-compose.prod.yml logs`
2. Consultar este documento
3. Revisar issues en el repositorio
4. Contactar al equipo de desarrollo

---

**¡Listo para producción! 🎉**
