# Script de Inicio Rapido - Modo Desarrollo
# Uso: .\start-dev.ps1

param(
    [switch]$Docker,
    [switch]$Local,
    [switch]$Stop,
    [switch]$Clean
)

$ErrorActionPreference = "Continue"

# Verificar ubicacion
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "Error: Ejecutar desde la raiz del proyecto" -ForegroundColor Red
    exit 1
}

# DETENER SERVICIOS
if ($Stop) {
    Write-Host "
Deteniendo servicios..." -ForegroundColor Magenta
    
    if (Test-Path ".dev-pids.json") {
        Write-Host "Deteniendo procesos locales..." -ForegroundColor Cyan
        $pids = Get-Content ".dev-pids.json" | ConvertFrom-Json
        
        foreach ($pid in $pids.PSObject.Properties) {
            try {
                Stop-Process -Id $pid.Value -Force -ErrorAction SilentlyContinue
                Write-Host "Proceso $($pid.Name) detenido" -ForegroundColor Green
            } catch {
                Write-Host "No se pudo detener proceso $($pid.Name)" -ForegroundColor Yellow
            }
        }
        Remove-Item ".dev-pids.json"
    }
    
    Write-Host "Deteniendo contenedores Docker..." -ForegroundColor Cyan
    docker-compose down
    Write-Host "Servicios detenidos" -ForegroundColor Green
    exit 0
}

# LIMPIEZA COMPLETA
if ($Clean) {
    Write-Host "
Limpieza completa del proyecto" -ForegroundColor Magenta
    Write-Host "Esto eliminara todos los datos y volumenes" -ForegroundColor Yellow
    $confirm = Read-Host "Continuar? (y/N)"
    
    if ($confirm -eq 'y') {
        docker-compose down -v
        Remove-Item -Recurse -Force "backend/__pycache__" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "backend/app/__pycache__" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "frontend/node_modules" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "frontend/build" -ErrorAction SilentlyContinue
        Remove-Item -Force "backend/logistica.db" -ErrorAction SilentlyContinue
        Write-Host "Limpieza completada" -ForegroundColor Green
    }
    exit 0
}

# MODO DOCKER
if ($Docker) {
    Write-Host "
=== Iniciando con Docker Compose ===" -ForegroundColor Magenta
    
    # Verificar Docker
    try {
        $null = docker --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Docker no disponible"
        }
    } catch {
        Write-Host "Docker no esta instalado o no esta en el PATH" -ForegroundColor Red
        exit 1
    }
    
    # Verificar archivo .env
    if (-not (Test-Path ".env")) {
        Write-Host "Archivo .env no encontrado, creando desde .env.example..." -ForegroundColor Yellow
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Write-Host "Edita el archivo .env con tus configuraciones" -ForegroundColor Cyan
        } else {
            Write-Host "Continuando con variables de entorno por defecto" -ForegroundColor Yellow
        }
    }
    
    Write-Host "Construyendo e iniciando servicios..." -ForegroundColor Cyan
    docker-compose up --build -d
    
    Write-Host "Servicios Docker iniciados" -ForegroundColor Green
    Write-Host "Esperando que los servicios esten listos..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    Write-Host "
=== Servicios disponibles ===" -ForegroundColor Magenta
    Write-Host "Frontend:        http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Backend API:     http://localhost:5000" -ForegroundColor Cyan
    Write-Host "API Docs:        http://localhost:5000/api/docs" -ForegroundColor Cyan
    Write-Host "Mailhog:         http://localhost:8025" -ForegroundColor Cyan
    Write-Host "pgAdmin:         http://localhost:5050" -ForegroundColor Cyan
    Write-Host "Go CRT API:      http://localhost:8080" -ForegroundColor Cyan
    Write-Host "PDF Service:     http://localhost:3002" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Credenciales por defecto:" -ForegroundColor Yellow
    Write-Host "  Usuario: admin" -ForegroundColor White
    Write-Host "  Email: admin@transportadora.local" -ForegroundColor White
    Write-Host ""
    Write-Host "Ver logs: docker-compose logs -f [servicio]" -ForegroundColor Cyan
    Write-Host "Detener: .\start-dev.ps1 -Stop" -ForegroundColor Cyan
    
    exit 0
}

# MODO POR DEFECTO - MOSTRAR AYUDA
Write-Host "
=== Script de Inicio Rapido ===" -ForegroundColor Magenta
Write-Host ""
Write-Host "Uso:" -ForegroundColor Yellow
Write-Host "  .\start-dev.ps1 -Docker    Iniciar con Docker Compose (recomendado)" -ForegroundColor Gray
Write-Host "  .\start-dev.ps1 -Local     Iniciar localmente (Python + Node.js)" -ForegroundColor Gray
Write-Host "  .\start-dev.ps1 -Stop      Detener todos los servicios" -ForegroundColor Gray
Write-Host "  .\start-dev.ps1 -Clean     Limpiar y resetear el proyecto" -ForegroundColor Gray
Write-Host ""
Write-Host "Ejemplo:" -ForegroundColor Yellow
Write-Host "  .\start-dev.ps1 -Docker" -ForegroundColor Cyan
Write-Host ""
