# 🚛 Sistema de Gestión de Transportadora

Aplicación web moderna para la gestión integral de una empresa de transporte internacional, especializada en la emisión y control de documentos CRTs y MIC/DTA.

## 🚀 Tecnologías

El proyecto utiliza una arquitectura de microservicios contenerizada:

*   **Backend**: Python 3.11 + Flask (API REST)
*   **Base de Datos**: PostgreSQL 14 (con SQLAlchemy ORM)
*   **Frontend**: React.js (Node 18)
*   **Servidor Web**: Nginx (Reverse Proxy)
*   **Generación PDF**: ReportLab (Nativo en Python)
*   **Infraestructura**: Docker + Docker Compose

## ✨ Características Principales

*   **Emisión de CRT**: Generación de Carta de Porte Internacional con validación automática y exportación a PDF.
*   **MIC/DTA**: Gestión de Manifiestos Internacionales de Carga.
*   **Facturación**: Emisión y seguimiento de facturas de exportación.
*   **Clientes y Proveedores**: ABM completo con historial de operaciones.
*   **Seguridad**: Autenticación JWT y sistema de roles (RBAC).
*   **Monitorización**: Logs estructurados y chequeos de salud.

## 🛠️ Requisitos Previos

*   **Docker Desktop** (Windows/Mac/Linux)
*   **WSL 2** (Recomendado en Windows para mejor rendimiento)

## ⚡ Instalación y Despliegue

1.  **Clonar el repositorio**:
    ```bash
    git clone <ruta-del-repo>
    cd proyecto-transportadora-web
    ```

2.  **Iniciar la aplicación**:
    Todo el sistema se levanta con un solo comando:
    ```bash
    docker compose up -d --build
    ```
    *Esto construirá los contenedores de Backend y Frontend, e iniciará la Base de Datos.*

3.  **Acceder al Sistema**:
    *   **Frontend**: [http://localhost:3000](http://localhost:3000)
    *   **API Backend**: http://localhost:5000
    *   **PgAdmin** (Gestión DB): http://localhost:5050

## 🔑 Credenciales por Defecto

Al iniciar por primera vez, se puede crear un usuario administrador ejecutando:

```bash
# Entrar al contenedor del backend
docker compose exec backend bash

# Ejecutar script de creación de admin
python create-admin.py
```
*   **Usuario**: `admin`
*   **Email**: `admin@transportadora.local`
*   **Password**: (La que asigne el script o `Admin123!`)

## 📂 Estructura del Proyecto

```
/
├── backend/                # Código fuente API Flask
│   ├── app/                # Lógica del negocio (Rutas, Modelos)
│   ├── migrations/         # Migraciones de Base de Datos
│   └── generar_crt.py      # Motor de generación de PDFs
├── frontend/               # Código fuente React
│   ├── src/                # Componentes y páginas
│   └── public/             # Assets estáticos
├── nginx.conf              # Configuración del Proxy
├── docker-compose.yml      # Orquestación de servicios
└── Dockerfile.*            # Recetas de construcción
```

## 🔧 Comandos Útiles

**Ver logs en tiempo real:**
```bash
docker compose logs -f backend
```

**Reiniciar un servicio específico:**
```bash
docker compose restart frontend
```

**Detener todo:**
```bash
docker compose down
```

## 🔒 Seguridad

El sistema implementa múltiples capas de seguridad:

### Autenticación
*   **JWT con Cookies HttpOnly**: Los tokens de refresco se almacenan en cookies HttpOnly, protegiéndolos de ataques XSS.
*   **MFA (Autenticación Multifactor)**: Soporte para TOTP y códigos de respaldo.
*   **Bloqueo de Cuenta**: Protección contra ataques de fuerza bruta con bloqueo temporal.
*   **Historial de Contraseñas**: Previene reutilización de contraseñas anteriores.

### Autorización
*   **RBAC (Control de Acceso Basado en Roles)**: Roles granulares con permisos específicos.
*   **Logs de Auditoría**: Registro completo de acciones de usuarios.

### Infraestructura
*   **CORS Configurado**: Orígenes permitidos explícitamente definidos.
*   **CSP Headers**: Content Security Policy implementado.
*   **PostgreSQL Restringido**: Base de datos solo accesible desde localhost.

## 🛠️ Entorno de Desarrollo

### Hot-Reload
El proyecto está configurado para desarrollo en caliente:
*   **Backend (Flask)**: Cambios en archivos `.py` recargan automáticamente.
*   **Frontend (React)**: Cambios en archivos `.js` se reflejan al instante.

### Debugging
Configuración de VS Code incluida (`.vscode/launch.json`):
*   **Python: Flask (Docker)** - Debugging remoto del backend en puerto 5678
*   **Chrome: Frontend** - Debugging del React

### Archivos de Desarrollo
```
Dockerfile.frontend.dev   # Frontend con npm start (hot-reload)
Dockerfile.backend.dev    # Backend con Flask debug + debugpy
docker-compose.yml        # Configuración de desarrollo
docker-compose.prod.yml   # Configuración de producción
```

## 📝 Notas Técnicas

*   La generación de PDFs para CRTs y MICs se realiza nativamente en Python utilizando `reportlab`.
*   Los tokens de refresco se envían como cookies HttpOnly, el frontend usa `withCredentials: true`.

---
*Transportadora Web © 2026*
