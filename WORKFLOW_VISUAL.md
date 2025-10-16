# 📊 Guía Visual - Workflows del Proyecto

Este documento proporciona diagramas visuales de los principales flujos de trabajo.

---

## 🚀 Workflow de Desarrollo

```
┌─────────────────────────────────────────────────────────────┐
│  INICIO DE DESARROLLO                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ Primera Vez?            │
              └───────┬─────────────┬───┘
                      │             │
                 Sí   │             │  No
                      ▼             │
          ┌─────────────────────┐   │
          │ cp .env.example .env│   │
          └──────────┬──────────┘   │
                     │              │
                     └──────┬───────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  .\start-dev.ps1 -Docker│
              └───────────┬─────────────┘
                          │
                          ▼
          ┌───────────────────────────────┐
          │  Servicios Iniciando...       │
          │  - PostgreSQL                 │
          │  - Backend (Flask)            │
          │  - Frontend (React)           │
          │  - Mailhog                    │
          │  - pgAdmin                    │
          │  - Go CRT API                 │
          │  - PDF Service                │
          └───────────┬───────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │  Esperar ~10 segundos           │
        └─────────────┬───────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │  ✅ Todo listo!                 │
        │  http://localhost:3000          │
        └─────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │  DESARROLLAR                    │
        │  - Editar código                │
        │  - Hot reload automático        │
        │  - Ver logs si es necesario     │
        └─────────────┬───────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │  .\start-dev.ps1 -Stop          │
        │  (Al terminar el día)           │
        └─────────────────────────────────┘
```

---

## 🏭 Workflow de Producción

```
┌─────────────────────────────────────────────────────────────┐
│  PREPARACIÓN PARA PRODUCCIÓN                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ Clonar en servidor      │
              │ /opt/transportadora     │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Configurar .env         │
              │ - SECRET_KEY            │
              │ - JWT_SECRET_KEY        │
              │ - DATABASE_URL          │
              │ - SMTP                  │
              │ - CORS_ALLOW_ORIGINS    │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Revisar CHECKLIST       │
              │ (100+ items)            │
              └───────────┬─────────────┘
                          │
                          ▼
    ┌───────────────────────────────────────────┐
    │ docker-compose -f docker-compose.prod.yml │
    │ build                                     │
    └───────────┬───────────────────────────────┘
                │
                ▼
    ┌───────────────────────────────────────────┐
    │ docker-compose -f docker-compose.prod.yml │
    │ up -d                                     │
    └───────────┬───────────────────────────────┘
                │
                ▼
    ┌─────────────────────────────────┐
    │  Verificar Health Checks        │
    │  - docker-compose ps            │
    │  - docker-compose logs -f       │
    │  - curl endpoints               │
    └─────────────┬───────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │  Configurar SSL/TLS             │
    │  - Certbot                      │
    │  - Nginx proxy                  │
    │  - Renovación automática        │
    └─────────────┬───────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │  Configurar Backups             │
    │  - Script diario                │
    │  - Cron job                     │
    │  - Probar restore               │
    └─────────────┬───────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │  Configurar Monitoreo           │
    │  - Logs centralizados           │
    │  - Alertas                      │
    │  - Métricas                     │
    └─────────────┬───────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │  ✅ Producción Lista            │
    │  Monitorear continuamente       │
    └─────────────────────────────────┘
```

---

## 🔍 Workflow de Troubleshooting

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ PROBLEMA DETECTADO                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ Ejecutar Health Check   │
              │ .\health-check.ps1      │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ ¿Qué servicio falla?    │
              └───┬─────────┬───────┬───┘
                  │         │       │
        Backend   │         │       │  Base de Datos
                  │         │       │
                  │         │       └─────────────┐
                  │         │ Frontend            │
                  │         │                     │
                  ▼         ▼                     ▼
    ┌──────────────────┐  ┌──────────┐  ┌────────────────┐
    │ Ver logs backend │  │Ver logs  │  │ Verificar DB   │
    │ docker-compose   │  │frontend  │  │ pg_isready     │
    │ logs backend     │  └────┬─────┘  │ psql -l        │
    └──────┬───────────┘       │        └────────┬───────┘
           │                   │                 │
           ▼                   ▼                 ▼
    ┌──────────────────┐  ┌──────────┐  ┌────────────────┐
    │ Verificar:       │  │Verificar:│  │ Verificar:     │
    │ - Migraciones    │  │- Build   │  │ - Conexión     │
    │ - Variables env  │  │- nginx   │  │ - Credenciales │
    │ - Dependencias   │  │- Assets  │  │ - Volúmenes    │
    └──────┬───────────┘  └────┬─────┘  └────────┬───────┘
           │                   │                 │
           │                   │                 │
           └───────────┬───────┴─────────────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │ ¿Problema resuelto?   │
           └─────┬─────────────┬───┘
                 │             │
             Sí  │             │  No
                 ▼             │
    ┌────────────────────┐    │
    │ ✅ Continuar       │    │
    │ Monitorear         │    │
    └────────────────────┘    │
                              ▼
                  ┌───────────────────────┐
                  │ Revisar documentación │
                  │ PRODUCTION_DEPLOYMENT │
                  │ #troubleshooting      │
                  └───────────┬───────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │ ¿Aún sin solución?    │
                  │ - Logs más detallados │
                  │ - Recrear contenedor  │
                  │ - Contactar soporte   │
                  └───────────────────────┘
```

---

## 🔐 Workflow de Autenticación (Usuario)

```
┌─────────────────────────────────────────────────────────────┐
│  USUARIO INTENTA LOGIN                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ POST /api/auth/login    │
              │ {email, password}       │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Validar credenciales    │
              └───┬─────────────────┬───┘
                  │                 │
            Válidas│                 │ Inválidas
                  │                 │
                  ▼                 ▼
    ┌─────────────────────┐  ┌──────────────────┐
    │ ¿MFA habilitado?    │  │ 401 Unauthorized │
    └──┬──────────────┬───┘  │ Incrementar      │
       │              │      │ intentos fallidos│
    Sí │              │ No   └──────────────────┘
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────────┐
│ 202 MFA     │  │ 200 OK          │
│ Required    │  │ {access_token,  │
│ {methods}   │  │  refresh_token} │
└──────┬──────┘  └─────────────────┘
       │
       ▼
┌─────────────────────┐
│ Usuario ingresa     │
│ código TOTP         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ POST /api/auth/login│
│ {email, password,   │
│  mfa_code}          │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Validar TOTP        │
└──┬──────────────┬───┘
   │              │
Válido│            │ Inválido
   │              │
   ▼              ▼
┌─────────────┐  ┌──────────────┐
│ 200 OK      │  │ 401 Invalid  │
│ {tokens...} │  │ MFA code     │
└─────────────┘  └──────────────┘
       │
       ▼
┌─────────────────────┐
│ Usuario autenticado │
│ Acceso a la app     │
└─────────────────────┘
```

---

## 🔄 Workflow de Actualización

```
┌─────────────────────────────────────────────────────────────┐
│  ACTUALIZAR CÓDIGO EN PRODUCCIÓN                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ Backup completo         │
              │ - Base de datos         │
              │ - Archivos              │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Notificar usuarios      │
              │ Ventana de mantenimiento│
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Git pull en servidor    │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Rebuild imágenes        │
              │ docker-compose build    │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Detener servicios       │
              │ docker-compose down     │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Aplicar migraciones DB  │
              │ (si hay)                │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Iniciar servicios       │
              │ docker-compose up -d    │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │ Health checks           │
              │ - Servicios up?         │
              │ - Endpoints OK?         │
              │ - DB conectada?         │
              └───────────┬─────────────┘
                          │
                    ¿Todo OK?
                          │
              ┌───────────┴─────────────┐
              │                         │
           Sí │                         │ No
              │                         │
              ▼                         ▼
    ┌─────────────────┐     ┌──────────────────┐
    │ Smoke tests     │     │ ROLLBACK         │
    │ - Login         │     │ 1. docker down   │
    │ - API básica    │     │ 2. Restaurar     │
    │ - Frontend      │     │    backup        │
    └────────┬────────┘     │ 3. docker up     │
             │              └──────────────────┘
             ▼
    ┌─────────────────┐
    │ Monitorear logs │
    │ 15-30 minutos   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ ✅ Actualización│
    │ completada      │
    │ Notificar users │
    └─────────────────┘
```

---

## 📊 Arquitectura de Servicios

```
┌─────────────────────────────────────────────────────────────┐
│                         INTERNET                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │    Nginx Reverse Proxy (SSL)       │
        │    Puerto 80/443                   │
        └────────┬───────────────────────────┘
                 │
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────────────┐   ┌──────────────────────┐
│   Frontend      │   │   Backend API        │
│   React + Nginx │   │   Flask + Gunicorn   │
│   Puerto 80     │   │   Puerto 5000        │
└─────────────────┘   └──────────┬───────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌───────────────────┐     ┌──────────────────┐
        │   PostgreSQL      │     │  Servicios Aux   │
        │   Puerto 5432     │     │  - Mailhog       │
        │                   │     │  - pgAdmin       │
        └───────────────────┘     │  - Go CRT API    │
                                  │  - PDF Service   │
                                  └──────────────────┘

Volúmenes Persistentes:
├── pgdata_prod (Base de datos)
└── backend_logs (Logs de aplicación)
```

---

## 📈 Monitoreo Continuo

```
┌─────────────────────────────────────────────────────────────┐
│  MONITOREO Y MANTENIMIENTO                                  │
└─────────────────────────────────────────────────────────────┘

DIARIO:
  ├── Revisar logs de errores
  │   └── docker-compose logs --tail=100 backend | grep ERROR
  ├── Verificar backups completados
  │   └── ls -lh /backups
  └── Revisar alertas
      └── ./health-check.ps1

SEMANAL:
  ├── Revisar métricas de performance
  │   └── docker stats
  ├── Revisar audit logs
  │   └── Consultar tabla audit_logs
  └── Actualizar dependencias de seguridad
      └── pip list --outdated

MENSUAL:
  ├── Actualizar todas las dependencias
  │   ├── pip install -U -r requirements.txt
  │   └── npm update
  ├── Probar proceso de restore
  │   └── Backup → Nueva DB → Verificar
  ├── Revisar usuarios inactivos
  │   └── DELETE FROM usuarios WHERE last_login < ...
  └── Limpiar datos obsoletos
      └── Logs antiguos, sesiones expiradas

TRIMESTRAL:
  ├── Auditoría de seguridad completa
  │   └── Seguir PRODUCTION_CHECKLIST.md
  ├── Renovar certificados SSL
  │   └── certbot renew
  ├── Revisar y actualizar documentación
  │   └── README, deployment guides
  └── Capacity planning
      └── Proyectar crecimiento, recursos
```

---

**Este documento proporciona una visión visual de los principales workflows del sistema.**

Para más detalles, consultar la documentación específica en cada guía.
