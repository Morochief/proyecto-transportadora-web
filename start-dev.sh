#!/bin/bash
# =============================================================================
# Script de Inicio Rápido - Modo Desarrollo (Linux/Mac)
# =============================================================================
# Este script inicia todos los servicios del proyecto con un solo comando
# Uso: ./start-dev.sh [--docker|--local|--stop|--clean]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

function log_success() { echo -e "${GREEN}✓${NC} $1"; }
function log_info() { echo -e "${CYAN}ℹ${NC} $1"; }
function log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
function log_error() { echo -e "${RED}✗${NC} $1"; }
function log_header() { echo -e "\n${MAGENTA}=== $1 ===${NC}"; }

# Verificar ubicación
if [ ! -f "docker-compose.yml" ]; then
    log_error "Ejecutar desde la raíz del proyecto"
    exit 1
fi

# =============================================================================
# PARSEAR ARGUMENTOS
# =============================================================================
MODE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --docker) MODE="docker"; shift ;;
        --local) MODE="local"; shift ;;
        --stop) MODE="stop"; shift ;;
        --clean) MODE="clean"; shift ;;
        *) log_error "Argumento desconocido: $1"; exit 1 ;;
    esac
done

# =============================================================================
# DETENER SERVICIOS
# =============================================================================
if [ "$MODE" = "stop" ]; then
    log_header "Deteniendo servicios"
    
    # Detener procesos locales si existen
    if [ -f ".dev-pids.txt" ]; then
        log_info "Deteniendo procesos locales..."
        while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
                log_success "Proceso $pid detenido"
            fi
        done < ".dev-pids.txt"
        rm -f ".dev-pids.txt"
    fi
    
    log_info "Deteniendo contenedores Docker..."
    docker-compose down
    log_success "Servicios detenidos"
    exit 0
fi

# =============================================================================
# LIMPIEZA COMPLETA
# =============================================================================
if [ "$MODE" = "clean" ]; then
    log_header "Limpieza completa del proyecto"
    log_warning "Esto eliminará todos los datos y volúmenes"
    read -p "¿Continuar? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        rm -rf backend/__pycache__ backend/app/__pycache__
        rm -rf frontend/node_modules frontend/build
        rm -f backend/logistica.db
        rm -f .dev-pids.txt
        log_success "Limpieza completada"
    fi
    exit 0
fi

# =============================================================================
# MODO DOCKER
# =============================================================================
if [ "$MODE" = "docker" ]; then
    log_header "Iniciando con Docker Compose"
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker no está instalado"
        exit 1
    fi
    
    # Verificar archivo .env
    if [ ! -f ".env" ]; then
        log_warning "Archivo .env no encontrado"
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "Creado .env desde .env.example - revisa la configuración"
        else
            log_warning "Continuando con variables de entorno por defecto"
        fi
    fi
    
    log_info "Construyendo e iniciando servicios..."
    docker-compose up --build -d
    
    log_success "Servicios Docker iniciados"
    log_info "Esperando que los servicios estén listos..."
    sleep 10
    
    log_header "Servicios disponibles"
    echo -e "${CYAN}🌐 Frontend:        http://localhost:3000${NC}"
    echo -e "${CYAN}🔧 Backend API:     http://localhost:5000${NC}"
    echo -e "${CYAN}📊 API Docs:        http://localhost:5000/api/docs${NC}"
    echo -e "${CYAN}📧 Mailhog:         http://localhost:8025${NC}"
    echo -e "${CYAN}🗄  pgAdmin:        http://localhost:5050${NC}"
    echo -e "${CYAN}⚡ Go CRT API:      http://localhost:8080${NC}"
    echo -e "${CYAN}📄 PDF Service:     http://localhost:3002${NC}"
    echo ""
    echo -e "${YELLOW}Credenciales por defecto:${NC}"
    echo -e "  Usuario: admin"
    echo -e "  Email: admin@transportadora.local"
    echo ""
    log_info "Ver logs: docker-compose logs -f [servicio]"
    log_info "Detener: ./start-dev.sh --stop"
    
    exit 0
fi

# =============================================================================
# MODO LOCAL
# =============================================================================
if [ "$MODE" = "local" ]; then
    log_header "Iniciando en modo local (sin Docker completo)"
    
    # Verificar Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 no está instalado"
        exit 1
    fi
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js no está instalado"
        exit 1
    fi
    
    # Crear entorno virtual
    if [ ! -d "venv" ]; then
        log_info "Creando entorno virtual..."
        python3 -m venv venv
    fi
    
    log_info "Activando entorno virtual..."
    source venv/bin/activate
    
    # Instalar dependencias backend
    if [ ! -d "venv/lib/python3.*/site-packages/flask" ]; then
        log_info "Instalando dependencias de Python..."
        pip install -q -r backend/requirements.txt
        log_success "Dependencias de Python instaladas"
    fi
    
    # Instalar dependencias frontend
    if [ ! -d "frontend/node_modules" ]; then
        log_info "Instalando dependencias de Node.js..."
        cd frontend
        npm install
        cd ..
        log_success "Dependencias de Node.js instaladas"
    fi
    
    # Iniciar servicios con Docker (solo DB y auxiliares)
    log_info "Iniciando PostgreSQL y servicios auxiliares..."
    docker-compose up -d db mailhog pgadmin
    sleep 5
    
    # Aplicar migraciones
    log_info "Aplicando migraciones..."
    cd backend
    export FLASK_APP=wsgi.py
    flask db upgrade 2>/dev/null || true
    cd ..
    
    # Iniciar backend
    log_info "Iniciando Backend..."
    cd backend
    python run.py &
    BACKEND_PID=$!
    echo $BACKEND_PID >> ../.dev-pids.txt
    cd ..
    
    sleep 3
    
    # Iniciar frontend
    log_info "Iniciando Frontend..."
    cd frontend
    BROWSER=none npm start &
    FRONTEND_PID=$!
    echo $FRONTEND_PID >> ../.dev-pids.txt
    cd ..
    
    log_success "Servicios locales iniciados"
    sleep 5
    
    log_header "Servicios disponibles"
    echo -e "${CYAN}🌐 Frontend:        http://localhost:3000${NC}"
    echo -e "${CYAN}🔧 Backend API:     http://localhost:5000${NC}"
    echo -e "${CYAN}📊 API Docs:        http://localhost:5000/api/docs${NC}"
    echo -e "${CYAN}📧 Mailhog:         http://localhost:8025${NC}"
    echo -e "${CYAN}🗄  pgAdmin:        http://localhost:5050${NC}"
    echo ""
    log_info "Detener: ./start-dev.sh --stop"
    
    exit 0
fi

# =============================================================================
# MODO POR DEFECTO - MOSTRAR AYUDA
# =============================================================================
log_header "Script de Inicio Rápido"
echo ""
echo -e "${YELLOW}Uso:${NC}"
echo -e "  ./start-dev.sh --docker    $(echo -e ${NC}Iniciar con Docker Compose \(recomendado\))"
echo -e "  ./start-dev.sh --local     $(echo -e ${NC}Iniciar localmente \(Python + Node.js\))"
echo -e "  ./start-dev.sh --stop      $(echo -e ${NC}Detener todos los servicios)"
echo -e "  ./start-dev.sh --clean     $(echo -e ${NC}Limpiar y resetear el proyecto)"
echo ""
echo -e "${YELLOW}Ejemplo:${NC}"
echo -e "  ${CYAN}./start-dev.sh --docker${NC}"
echo ""
