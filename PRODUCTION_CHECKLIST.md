# ✅ Checklist de Despliegue a Producción

Use esta lista para asegurar que su aplicación está lista para producción.

## 🔐 Seguridad

### Credenciales y Secretos
- [ ] Cambiar `SECRET_KEY` por una clave aleatoria de 64+ caracteres
- [ ] Cambiar `JWT_SECRET_KEY` por una clave diferente y aleatoria
- [ ] Cambiar contraseña de `DEFAULT_ADMIN_PASSWORD`
- [ ] Cambiar contraseña de PostgreSQL (`POSTGRES_PASSWORD`)
- [ ] Cambiar credenciales de pgAdmin
- [ ] Configurar SMTP con credenciales reales (no Mailhog)
- [ ] Verificar que `.env` está en `.gitignore`
- [ ] No commitear claves secretas al repositorio

### Configuración de Seguridad
- [ ] Configurar SSL/TLS (HTTPS)
- [ ] Configurar `CORS_ALLOW_ORIGINS` solo con dominios permitidos
- [ ] Habilitar `RATE_LIMIT_ENABLED=true`
- [ ] Configurar `MAX_LOGIN_ATTEMPTS` y `LOGIN_ATTEMPT_WINDOW`
- [ ] Verificar política de contraseñas (`PASSWORD_MIN_LENGTH`, etc.)
- [ ] Habilitar MFA para usuarios críticos
- [ ] Configurar firewall (UFW, iptables, security groups)
- [ ] Deshabilitar puerto 5432 (PostgreSQL) desde internet
- [ ] Configurar headers de seguridad en nginx

### Auditoría
- [ ] Habilitar `STRUCTURED_LOGGING=1`
- [ ] Configurar nivel de logs apropiado (`LOG_LEVEL=INFO` o `WARNING`)
- [ ] Configurar integración con SIEM si es necesario
- [ ] Revisar tabla `audit_logs` regularmente

---

## 🗄️ Base de Datos

### Configuración
- [ ] Usar PostgreSQL en servidor dedicado (no SQLite)
- [ ] Configurar conexión cifrada (SSL/TLS)
- [ ] Configurar pool de conexiones apropiado
- [ ] Aplicar todas las migraciones: `flask db upgrade`
- [ ] Verificar índices en tablas críticas
- [ ] Configurar timezone correcto

### Backups
- [ ] Configurar backups automáticos diarios
- [ ] Probar proceso de restauración
- [ ] Guardar backups en ubicación segura/remota
- [ ] Configurar retención de backups (30+ días)
- [ ] Documentar procedimiento de recuperación ante desastres

---

## 🔧 Backend

### Configuración
- [ ] Cambiar `FLASK_ENV=production`
- [ ] Usar gunicorn o uWSGI (no Flask development server)
- [ ] Configurar workers: `--workers 4` (ajustar según CPU)
- [ ] Configurar timeout apropiado: `--timeout 120`
- [ ] Configurar límites de memoria en Docker
- [ ] Verificar variables de entorno críticas

### Dependencias
- [ ] Actualizar todas las dependencias a versiones estables
- [ ] Ejecutar `safety check` para vulnerabilidades
- [ ] Revisar `pip list --outdated`
- [ ] Fijar versiones exactas en `requirements.txt`

### Performance
- [ ] Configurar cache (Redis) si es necesario
- [ ] Optimizar queries N+1
- [ ] Configurar connection pooling
- [ ] Implementar rate limiting por endpoint crítico

---

## 🎨 Frontend

### Build
- [ ] Cambiar `REACT_APP_ENV=production`
- [ ] Configurar `REACT_APP_API_URL` con URL real
- [ ] Ejecutar build optimizado: `npm run build`
- [ ] Verificar que bundle está minificado
- [ ] Verificar que source maps están deshabilitados (o protegidos)

### Performance
- [ ] Configurar compresión gzip/brotli en nginx
- [ ] Configurar cache de assets estáticos
- [ ] Implementar lazy loading de rutas
- [ ] Optimizar imágenes y assets
- [ ] Configurar CDN si es necesario

### SEO (si aplica)
- [ ] Configurar meta tags
- [ ] Configurar robots.txt
- [ ] Configurar sitemap.xml
- [ ] Implementar SSR si es necesario

---

## 🐳 Docker

### Imágenes
- [ ] Usar imágenes base oficiales y actualizadas
- [ ] Ejecutar contenedores como usuario no-root
- [ ] Minimizar tamaño de imágenes (multi-stage builds)
- [ ] Escanear imágenes: `docker scan <imagen>`
- [ ] Taggear imágenes con versión, no solo `:latest`

### Compose
- [ ] Usar `docker-compose.prod.yml` en producción
- [ ] Configurar `restart: unless-stopped`
- [ ] Configurar health checks
- [ ] Configurar límites de recursos (CPU, memoria)
- [ ] Usar networks aisladas
- [ ] Configurar volúmenes nombrados para persistencia

---

## 🌐 Networking y DNS

### DNS
- [ ] Configurar registros A/AAAA apuntando a servidor
- [ ] Configurar registro CNAME para www si aplica
- [ ] Configurar SPF/DKIM/DMARC para email
- [ ] Verificar propagación DNS

### SSL/TLS
- [ ] Obtener certificado SSL (Let's Encrypt o comercial)
- [ ] Configurar auto-renovación de certificados
- [ ] Forzar redirección HTTP → HTTPS
- [ ] Configurar HSTS header
- [ ] Verificar con SSL Labs (https://www.ssllabs.com/ssltest/)

### Firewall
- [ ] Permitir solo puertos necesarios (80, 443, SSH)
- [ ] Bloquear acceso directo a PostgreSQL desde internet
- [ ] Configurar fail2ban o similar
- [ ] Limitar acceso SSH a IPs conocidas

---

## 📊 Monitoreo

### Logs
- [ ] Centralizar logs (syslog, CloudWatch, etc.)
- [ ] Configurar rotación de logs
- [ ] Configurar alertas para errores críticos
- [ ] Implementar structured logging

### Métricas
- [ ] Monitorear uso de CPU
- [ ] Monitorear uso de memoria
- [ ] Monitorear uso de disco
- [ ] Monitorear latencia de API
- [ ] Monitorear tasa de errores 4xx/5xx

### Alertas
- [ ] Configurar alertas de uptime/downtime
- [ ] Configurar alertas de uso excesivo de recursos
- [ ] Configurar alertas de seguridad (intentos de login fallidos)
- [ ] Configurar alertas de errores de aplicación

### Herramientas Opcionales
- [ ] Configurar Prometheus + Grafana
- [ ] Configurar Sentry para error tracking
- [ ] Configurar New Relic o similar para APM
- [ ] Configurar Uptime Robot o similar

---

## 📧 Email

### SMTP
- [ ] Configurar servicio SMTP real (no Mailhog)
- [ ] Configurar autenticación SMTP
- [ ] Configurar TLS/SSL
- [ ] Verificar límites de envío
- [ ] Configurar dominio verificado

### Templates
- [ ] Revisar templates de email
- [ ] Verificar links de recuperación de contraseña
- [ ] Configurar `MAIL_FROM` con email válido
- [ ] Probar envío de emails

---

## 🧪 Testing

### Pre-Deploy
- [ ] Ejecutar tests unitarios: `pytest`
- [ ] Ejecutar tests de integración
- [ ] Probar flujo de registro/login
- [ ] Probar recuperación de contraseña
- [ ] Probar MFA
- [ ] Verificar permisos RBAC

### Staging
- [ ] Desplegar en ambiente de staging primero
- [ ] Ejecutar smoke tests
- [ ] Verificar migraciones de base de datos
- [ ] Probar con datos reales (anonimizados)

---

## 📝 Documentación

### Interna
- [ ] Documentar procedimientos de despliegue
- [ ] Documentar procedimientos de rollback
- [ ] Documentar procedimientos de backup/restore
- [ ] Documentar configuración de servidores
- [ ] Mantener changelog actualizado

### Externa
- [ ] Actualizar README.md
- [ ] Documentar API (OpenAPI/Swagger)
- [ ] Crear guía de usuario
- [ ] Crear FAQ

---

## 🚀 Deploy

### Pre-Deploy
- [ ] Notificar a usuarios de mantenimiento
- [ ] Hacer backup completo
- [ ] Verificar que todos los tests pasan
- [ ] Tag de release en Git

### Deploy
- [ ] Ejecutar en horario de bajo tráfico
- [ ] Aplicar migraciones de BD
- [ ] Desplegar nuevo código
- [ ] Verificar health checks
- [ ] Monitorear logs en tiempo real

### Post-Deploy
- [ ] Verificar funcionamiento básico
- [ ] Ejecutar smoke tests
- [ ] Monitorear métricas
- [ ] Notificar a usuarios que servicio está disponible
- [ ] Documentar issues encontrados

---

## 🔄 Mantenimiento Continuo

### Diario
- [ ] Revisar logs de errores
- [ ] Revisar alertas
- [ ] Verificar backups completados

### Semanal
- [ ] Revisar métricas de performance
- [ ] Revisar audit logs
- [ ] Actualizar dependencias de seguridad

### Mensual
- [ ] Actualizar todas las dependencias
- [ ] Revisar y optimizar queries lentas
- [ ] Probar proceso de restore
- [ ] Revisar usuarios inactivos
- [ ] Limpiar datos obsoletos

### Trimestral
- [ ] Auditoría de seguridad completa
- [ ] Renovar certificados SSL si es necesario
- [ ] Revisar y actualizar documentación
- [ ] Capacity planning

---

## 🎯 Criterios de Aceptación

Antes de marcar como "listo para producción", verificar:

- [ ] ✅ Todos los items de Seguridad completados
- [ ] ✅ Backups automáticos funcionando
- [ ] ✅ SSL/TLS configurado y verificado
- [ ] ✅ Monitoreo y alertas activos
- [ ] ✅ Tests pasando
- [ ] ✅ Documentación actualizada
- [ ] ✅ Plan de rollback definido
- [ ] ✅ Equipo capacitado en procedimientos

---

## 📞 Contactos de Emergencia

Documentar:
- [ ] Responsable de infraestructura
- [ ] Responsable de base de datos
- [ ] Responsable de desarrollo
- [ ] Proveedor de hosting
- [ ] Proveedor de DNS
- [ ] Proveedor de email

---

**Última revisión:** _[Fecha]_  
**Revisado por:** _[Nombre]_  
**Aprobado por:** _[Nombre]_
