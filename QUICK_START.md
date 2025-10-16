# 🚀 Inicio Rápido

## ⚡ Arrancar Todo el Proyecto de Una Vez

### Windows

```powershell
# Opción 1: Con Docker (Recomendado - Todo en contenedores)
.\start-dev.ps1 -Docker

# Opción 2: Local (Backend y Frontend locales, DB en Docker)
.\start-dev.ps1 -Local

# Detener todos los servicios
.\start-dev.ps1 -Stop

# Limpiar todo (¡elimina datos!)
.\start-dev.ps1 -Clean
```

### Linux / Mac

```bash
# Hacer ejecutable (solo la primera vez)
chmod +x start-dev.sh

# Opción 1: Con Docker (Recomendado)
./start-dev.sh --docker

# Opción 2: Local
./start-dev.sh --local

# Detener servicios
./start-dev.sh --stop

# Limpiar todo
./start-dev.sh --clean
```

---

## 🌐 Acceder a los Servicios

Después de iniciar, abre tu navegador en:

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Frontend** | http://localhost:3000 | Aplicación web principal |
| **Backend API** | http://localhost:5000 | API REST |
| **API Docs** | http://localhost:5000/api/docs | Documentación Swagger/OpenAPI |
| **Mailhog** | http://localhost:8025 | Servidor SMTP de prueba |
| **pgAdmin** | http://localhost:5050 | Administrador de PostgreSQL |
| **Go CRT API** | http://localhost:8080 | API de CRT en Go |
| **PDF Service** | http://localhost:3002 | Servicio de generación de PDFs |

---

## 🔐 Credenciales por Defecto

**Usuario:**
- Username: `admin`
- Email: `admin@transportadora.local`
- Password: `ChangeMe123!` (o la configurada en `.env`)

**pgAdmin:**
- Email: `admin@local`
- Password: `admin123`

**Base de datos PostgreSQL:**
- User: `postgres`
- Password: `postgres`
- Database: `logistica`

---

## 📋 Primera Configuración (Solo Una Vez)

1. **Copiar archivo de configuración:**
   ```bash
   # Windows
   copy .env.example .env
   
   # Linux/Mac
   cp .env.example .env
   ```

2. **Editar `.env` según necesidad** (opcional para desarrollo):
   ```bash
   # Windows
   notepad .env
   
   # Linux/Mac
   nano .env
   ```

3. **Iniciar servicios** (usar comandos de arriba)

---

## 🛠️ Comandos Útiles

### Docker Compose

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend

# Ver estado de servicios
docker-compose ps

# Reiniciar un servicio
docker-compose restart backend

# Reconstruir imágenes
docker-compose up --build
```

### Backend

```bash
# Entrar al contenedor
docker-compose exec backend bash

# Ejecutar shell de Flask
docker-compose exec backend flask shell

# Aplicar migraciones
docker-compose exec backend flask db upgrade

# Crear migración
docker-compose exec backend flask db migrate -m "descripcion"

# Resetear contraseña admin
docker-compose exec backend python reset_password_simple.py
```

### Frontend

```bash
# Entrar al contenedor
docker-compose exec frontend sh

# Instalar nueva dependencia
cd frontend
npm install nombre-paquete
```

### Base de datos

```bash
# Conectar a PostgreSQL
docker-compose exec db psql -U postgres -d logistica

# Backup de base de datos
docker-compose exec db pg_dump -U postgres logistica > backup.sql

# Restaurar backup
cat backup.sql | docker-compose exec -T db psql -U postgres logistica
```

---

## 🐛 Solución de Problemas Comunes

### Puerto ya en uso

```bash
# Windows - Ver qué está usando el puerto
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Linux/Mac
lsof -i :3000
lsof -i :5000

# Detener proceso
# Windows
taskkill /PID <numero_pid> /F
# Linux/Mac
kill -9 <numero_pid>
```

### Base de datos no conecta

```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps db

# Reiniciar PostgreSQL
docker-compose restart db

# Ver logs de PostgreSQL
docker-compose logs db
```

### Frontend no actualiza cambios

```bash
# Limpiar cache de npm
cd frontend
npm cache clean --force
rm -rf node_modules
npm install

# O reconstruir contenedor
docker-compose up --build frontend
```

### Backend no arranca

```bash
# Ver logs detallados
docker-compose logs backend

# Verificar variables de entorno
docker-compose exec backend env

# Reinstalar dependencias
docker-compose exec backend pip install -r requirements.txt
```

---

## 🔄 Workflow de Desarrollo

1. **Iniciar proyecto:** `.\start-dev.ps1 -Docker`
2. **Hacer cambios en el código**
3. **Ver cambios automáticamente** (hot reload activado)
4. **Ver logs:** `docker-compose logs -f backend frontend`
5. **Detener al terminar:** `.\start-dev.ps1 -Stop`

---

## 📚 Próximos Pasos

- 📖 Ver [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) para despliegue a producción
- 🔒 Ver [SECURITY_FEATURES.md](SECURITY_FEATURES.md) para configuración de seguridad
- 📊 Ver API Docs en http://localhost:5000/api/docs
- 👥 Ver [USUARIOS_CUSTOMIZATION_GUIDE.md](USUARIOS_CUSTOMIZATION_GUIDE.md) para gestión de usuarios

---

## 💡 Tips

- **Hot Reload:** Los cambios en código se reflejan automáticamente (no reiniciar)
- **Logs:** Siempre revisar logs con `docker-compose logs -f` cuando algo falle
- **Persistencia:** Los datos en PostgreSQL persisten entre reinicios
- **Clean Start:** Usa `-Clean` solo si quieres empezar desde cero

---

¿Problemas? Revisa la [guía de troubleshooting](PRODUCTION_DEPLOYMENT.md#troubleshooting) o los logs de los servicios.
