# CAMBIOS_CODEX

Documento con todos los cambios aplicados por Codex en este arbol de trabajo.

## Backend
- `backend/app/security/decorators.py`: agregado `verify_authentication` para usar en `before_request` y cargar usuario desde token.
- `backend/app/security/rbac.py`: agregado `DEFAULT_ROLE`, alias `usuario -> operador` y `normalize_role`.
- `backend/app/services/auth_service.py`: registro valida rol contra `ROLE_MATRIX`, normaliza `estado/is_active`, acepta `estado` en alta y aplica politicas de contrasena/historial.
- `backend/app/schemas/auth.py`: `RegisterRequest` incluye `estado`; `UpdateUserRequest` acepta `clave` para reset admin.
- `backend/app/routes/auth.py`: registro acepta `estado`; admin update soporta `estado`, `is_active`, roles normalizados y reset de clave con politica/historial; revoca sesiones cuando corresponde; agrega `DELETE /api/auth/admin/users/<id>`; agrega `GET /api/auth/roles`.
- `backend/app/routes/usuarios.py`: endpoint deprecado con respuesta 410; agrega politica de contrasena, historial, revocacion y auditoria en alta/edicion; normaliza roles.
- `backend/app/routes/security.py`: blueprint protegido con `before_request(verify_authentication)`.
- `backend/app/routes/dashboard.py`: agrega conteos de usuarios, MICs y sesiones activas via refresh tokens; protege con `before_request`.
- `backend/app/routes/crt.py`: protege con `before_request` y agrega `audit_event` al borrar CRT (incluye borrado de gastos).
- `backend/app/routes/mic_guardados.py`: protege con `before_request` y agrega `audit_event` al borrar/anular; asegura `estado_final` en soft delete.
- `backend/app/routes/mic.py`: protege con `before_request`.
- `backend/app/routes/honorarios.py`: protege con `before_request`.
- `backend/app/routes/transportadoras.py`: protege con `before_request`.
- `backend/app/routes/remitentes.py`: protege con `before_request`.
- `backend/app/routes/ciudades.py`: protege con `before_request`.
- `backend/app/routes/aduanas.py`: protege con `before_request`.
- `backend/app/routes/monedas.py`: protege con `before_request`.
- `backend/app/routes/paises.py`: protege con `before_request`.
- `backend/app/docs.py`: `/api/docs` ahora requiere rol `admin`; documenta delete de usuarios y `estado` en registro.
- `backend/config.py`: corrige regex de complejidad de contrasena (`\\d` -> `\d`).
- `backend/app/utils/layout_crt.py`: evita generar `CRT.pdf` al importar; solo en ejecucion directa.
- `backend/CRT.pdf`: eliminado artefacto generado.

## Frontend
- `frontend/src/store/authStore.js`: agrega `authReady`, migracion de version y deja de persistir `accessToken`.
- `frontend/src/api/api.js`: exporta `refreshSession` y evita limpiar sesion si aun hay `accessToken`.
- `frontend/src/utils/auth.js`: agrega `bootstrapSession` (refresh + `/auth/me`), setea `authReady` en login/logout.
- `frontend/src/components/PrivateRoute.jsx`: muestra pantalla de carga hasta `authReady`.
- `frontend/src/App.jsx`: llama `bootstrapSession` en el arranque.
- `frontend/src/pages/Login.jsx`: redirige si ya hay sesion al terminar bootstrap.
- `frontend/src/utils/roles.js`: mapea `operador` a etiqueta "Usuario" y expone opciones.
- `frontend/src/pages/Usuarios.jsx`: rol por select; estado como select (activo/inactivo/suspendido); envia `estado` al registrar; patch solo si hay estado; usa endpoint `DELETE /auth/admin/users/<id>`; mejora badge de estado.
- `frontend/src/pages/ListarCRT.jsx`: usa `/crts/` y acepta `pagination` opcional.
- `frontend/src/pages/MICsGuardados.jsx`: reemplaza axios por `api` con base y auth.
