# =============================================================================
# Health Check Script - Sistema de Transportadora
# =============================================================================
# Este script verifica el estado de todos los servicios
# Uso: .\health-check.ps1

$ErrorActionPreference = "Continue"

function Write-Status {
    param($Service, $Status, $Message)
    $icon = if ($Status -eq "OK") { "✓" } elseif ($Status -eq "WARN") { "⚠" } else { "✗" }
    $color = if ($Status -eq "OK") { "Green" } elseif ($Status -eq "WARN") { "Yellow" } else { "Red" }
    Write-Host "$icon " -ForegroundColor $color -NoNewline
    Write-Host "$Service`: " -NoNewline
    Write-Host $Message -ForegroundColor $color
}

Write-Host "`n=== Health Check - Sistema de Transportadora ===" -ForegroundColor Cyan
Write-Host "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# =============================================================================
# VERIFICAR DOCKER
# =============================================================================
Write-Host "Docker Services:" -ForegroundColor Magenta
try {
    docker --version | Out-Null
    $dockerRunning = $true
} catch {
    Write-Status "Docker" "ERROR" "Docker no está instalado o no está en el PATH"
    $dockerRunning = $false
}

if ($dockerRunning) {
    # Verificar servicios Docker
    $services = @("db", "backend", "frontend", "mailhog", "pgadmin", "go-crt-api", "pdf-service")
    
    foreach ($service in $services) {
        try {
            $container = docker-compose ps $service --format json 2>$null | ConvertFrom-Json
            if ($container) {
                $state = $container.State
                if ($state -eq "running") {
                    Write-Status $service "OK" "Running"
                } else {
                    Write-Status $service "ERROR" "State: $state"
                }
            } else {
                Write-Status $service "WARN" "Not found"
            }
        } catch {
            Write-Status $service "WARN" "Could not check status"
        }
    }
}

Write-Host ""

# =============================================================================
# VERIFICAR ENDPOINTS HTTP
# =============================================================================
Write-Host "HTTP Endpoints:" -ForegroundColor Magenta

$endpoints = @{
    "Frontend" = "http://localhost:3000"
    "Backend API" = "http://localhost:5000/api/health"
    "API Docs" = "http://localhost:5000/api/docs"
    "Mailhog UI" = "http://localhost:8025"
    "pgAdmin" = "http://localhost:5050"
    "Go CRT API" = "http://localhost:8080"
    "PDF Service" = "http://localhost:3002"
}

foreach ($endpoint in $endpoints.GetEnumerator()) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint.Value -TimeoutSec 5 -UseBasicParsing 2>$null
        if ($response.StatusCode -eq 200) {
            Write-Status $endpoint.Key "OK" "HTTP $($response.StatusCode)"
        } else {
            Write-Status $endpoint.Key "WARN" "HTTP $($response.StatusCode)"
        }
    } catch {
        Write-Status $endpoint.Key "ERROR" "Not responding"
    }
}

Write-Host ""

# =============================================================================
# VERIFICAR BASE DE DATOS
# =============================================================================
Write-Host "Database:" -ForegroundColor Magenta

if ($dockerRunning) {
    try {
        $dbCheck = docker-compose exec -T db pg_isready -U postgres 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Status "PostgreSQL" "OK" "Accepting connections"
            
            # Verificar base de datos logistica
            $dbExists = docker-compose exec -T db psql -U postgres -lqt 2>$null | Select-String "logistica"
            if ($dbExists) {
                Write-Status "Database 'logistica'" "OK" "Exists"
            } else {
                Write-Status "Database 'logistica'" "WARN" "Not found"
            }
        } else {
            Write-Status "PostgreSQL" "ERROR" "Not ready"
        }
    } catch {
        Write-Status "PostgreSQL" "ERROR" "Could not check"
    }
}

Write-Host ""

# =============================================================================
# VERIFICAR RECURSOS
# =============================================================================
Write-Host "Resources:" -ForegroundColor Magenta

if ($dockerRunning) {
    try {
        $stats = docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>$null
        if ($stats) {
            Write-Host $stats
        }
    } catch {
        Write-Status "Docker Stats" "WARN" "Could not retrieve stats"
    }
}

Write-Host ""

# =============================================================================
# VERIFICAR LOGS RECIENTES
# =============================================================================
Write-Host "Recent Errors:" -ForegroundColor Magenta

if ($dockerRunning) {
    try {
        $backendErrors = docker-compose logs --tail=50 backend 2>$null | Select-String "ERROR"
        $errorCount = ($backendErrors | Measure-Object).Count
        
        if ($errorCount -eq 0) {
            Write-Status "Backend Errors" "OK" "No recent errors"
        } elseif ($errorCount -lt 5) {
            Write-Status "Backend Errors" "WARN" "$errorCount errors in last 50 lines"
        } else {
            Write-Status "Backend Errors" "ERROR" "$errorCount errors in last 50 lines"
        }
    } catch {
        Write-Status "Backend Logs" "WARN" "Could not check logs"
    }
}

Write-Host ""

# =============================================================================
# RESUMEN
# =============================================================================
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para ver logs detallados:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f [servicio]" -ForegroundColor Gray
Write-Host ""
Write-Host "Para reiniciar un servicio:" -ForegroundColor Yellow
Write-Host "  docker-compose restart [servicio]" -ForegroundColor Gray
Write-Host ""
Write-Host "Para detener todo:" -ForegroundColor Yellow
Write-Host "  .\start-dev.ps1 -Stop" -ForegroundColor Gray
Write-Host ""
