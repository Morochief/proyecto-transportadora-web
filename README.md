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

## 📝 Notas de Desarrollo

*   La generación de PDFs para CRTs y MICs se realiza nativamente en Python utilizando `reportlab`, lo que garantiza rapidez y precisión en el diseño, sin depender de servicios externos.
*   El proyecto está configurado para desarrollo en caliente (hot-reload) tanto en backend como frontend.

---
*Transportadora Web © 2025*
