# Script de Configuración y Reparación del Proyecto
# Ejecutar desde la raíz del proyecto

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACIÓN DEL SISTEMA DE TRANSPORTADORA" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar ubicación
$currentPath = Get-Location
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "❌ ERROR: Ejecutar este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

Write-Host "📂 Directorio actual: $currentPath" -ForegroundColor Green
Write-Host ""

# Paso 1: Crear entorno virtual
Write-Host "📦 Paso 1: Verificando entorno virtual..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "  ✓ Entorno virtual encontrado" -ForegroundColor Green
} else {
    Write-Host "  ⚙ Creando entorno virtual..." -ForegroundColor Yellow
    python -m venv venv
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Entorno virtual creado" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Error al crear entorno virtual" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Paso 2: Activar entorno virtual e instalar dependencias
Write-Host "📚 Paso 2: Instalando dependencias del backend..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Entorno virtual activado" -ForegroundColor Green
} else {
    Write-Host "  ⚠ No se pudo activar automáticamente. Activar manualmente:" -ForegroundColor Yellow
    Write-Host "    .\venv\Scripts\Activate.ps1" -ForegroundColor Cyan
}

Write-Host "  ⚙ Instalando paquetes Python..." -ForegroundColor Yellow
pip install -r backend\requirements.txt --quiet --disable-pip-version-check
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Dependencias de Python instaladas" -ForegroundColor Green
} else {
    Write-Host "  ❌ Error al instalar dependencias" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Paso 3: Verificar la aplicación
Write-Host "🔍 Paso 3: Verificando aplicación Flask..." -ForegroundColor Yellow
$testResult = python -c "from app import create_app; app = create_app(); print('OK')" 2>&1
if ($testResult -match "OK") {
    Write-Host "  ✓ Aplicación Flask verificada correctamente" -ForegroundColor Green
} else {
    Write-Host "  ❌ Error al verificar aplicación:" -ForegroundColor Red
    Write-Host "  $testResult" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Revisar DIAGNOSTIC_REPORT.md para más detalles" -ForegroundColor Yellow
}
Write-Host ""

# Paso 4: Verificar base de datos
Write-Host "🗄 Paso 4: Verificando base de datos..." -ForegroundColor Yellow
Set-Location backend
if (Test-Path "logistica.db") {
    Write-Host "  ✓ Base de datos encontrada: logistica.db" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Base de datos no encontrada. Aplicando migraciones..." -ForegroundColor Yellow
    flask db upgrade
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Migraciones aplicadas" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Error al aplicar migraciones" -ForegroundColor Red
    }
}
Set-Location ..
Write-Host ""

# Paso 5: Verificar usuario admin
Write-Host "👤 Paso 5: Verificando usuario administrador..." -ForegroundColor Yellow
$adminCheck = python -c "from app import create_app, db; from app.models import Usuario; app = create_app(); app.app_context().push(); admin = Usuario.query.filter_by(usuario='admin').first(); print('EXISTS' if admin else 'MISSING')" 2>&1
if ($adminCheck -match "EXISTS") {
    Write-Host "  ✓ Usuario admin existe" -ForegroundColor Green
} elseif ($adminCheck -match "MISSING") {
    Write-Host "  ⚙ Creando usuario admin..." -ForegroundColor Yellow
    python -c "from app import create_app; from app.seeds import ensure_admin_user; app = create_app(); app.app_context().push(); ensure_admin_user()"
    Write-Host "  ✓ Usuario admin creado" -ForegroundColor Green
} else {
    Write-Host "  ⚠ No se pudo verificar usuario admin" -ForegroundColor Yellow
}
Write-Host ""

# Paso 6: Verificar frontend
Write-Host "🎨 Paso 6: Verificando frontend..." -ForegroundColor Yellow
Set-Location frontend
if (Test-Path "node_modules") {
    Write-Host "  ✓ Dependencias de Node.js instaladas" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Dependencias de Node.js no encontradas" -ForegroundColor Yellow
    Write-Host "  Ejecutar: cd frontend && npm install" -ForegroundColor Cyan
}
Set-Location ..
Write-Host ""

# Resumen
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACIÓN COMPLETADA" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Activar entorno virtual (si no está activado):" -ForegroundColor White
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Iniciar el backend:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Cyan
Write-Host "   python run.py" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. En otra terminal, iniciar el frontend:" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Cyan
Write-Host "   npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Abrir navegador en: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "5. Login por defecto:" -ForegroundColor White
Write-Host "   Usuario: admin" -ForegroundColor Cyan
Write-Host "   Email: admin@transportadora.local" -ForegroundColor Cyan
Write-Host "   Contraseña: (verificar en backend/app/seeds.py)" -ForegroundColor Cyan
Write-Host ""
Write-Host "📄 Ver DIAGNOSTIC_REPORT.md para más información" -ForegroundColor Yellow
Write-Host ""
