# ===============================================
# 🔍 SCRIPT DE DIAGNÓSTICO CORREGIDO
# ===============================================
# Guarda como: fix_database.py

import os
import sys

# Agregar el directorio actual al path de Python
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Intentar diferentes formas de importar según la estructura del proyecto
try:
    # Opción 1: Si tu app está en el directorio raíz
    from app import create_app, db
    from app.models import Pais, Ciudad, Remitente, Transportadora, Moneda
    print("✅ Importación exitosa: app en directorio raíz")
except ImportError:
    try:
        # Opción 2: Si tu app está en subdirectorio
        sys.path.insert(0, os.path.join(current_dir, 'backend'))
        from app import create_app, db
        from app.models import Pais, Ciudad, Remitente, Transportadora, Moneda
        print("✅ Importación exitosa: app en subdirectorio backend")
    except ImportError:
        try:
            # Opción 3: Si tienes estructura diferente
            from main import app as flask_app, db
            # Necesitarías importar los modelos según tu estructura
            print("✅ Importación exitosa: usando main.py")
        except ImportError:
            print("❌ No se pudo importar la aplicación Flask")
            print("📁 Estructura de archivos en este directorio:")
            for item in os.listdir(current_dir):
                print(f"  - {item}")
            print("\n🔧 SOLUCIONES:")
            print("1. Asegúrate de que el script esté en el directorio raíz del proyecto")
            print("2. Verifica que tengas un archivo __init__.py en el directorio app")
            print("3. O ejecuta el script desde el directorio correcto")
            sys.exit(1)

def verificar_estructura_proyecto():
    """Verifica la estructura del proyecto"""
    print("📁 Verificando estructura del proyecto...")
    
    archivos_importantes = [
        'app.py', 'main.py', 'run.py', 'app/__init__.py', 
        'backend/app.py', 'requirements.txt', 'config.py'
    ]
    
    print("Archivos encontrados:")
    for archivo in archivos_importantes:
        if os.path.exists(archivo):
            print(f"  ✅ {archivo}")
        else:
            print(f"  ❌ {archivo}")

def crear_app_context():
    """Crea el contexto de la aplicación"""
    try:
        app = create_app()
        return app
    except Exception as e:
        print(f"❌ Error creando la aplicación: {e}")
        print("🔧 Verifica tu configuración de base de datos")
        return None

def consulta_sql_directa():
    """Ejecuta consultas SQL directas para diagnóstico"""
    print("\n🔍 === CONSULTAS SQL PARA EJECUTAR MANUALMENTE ===\n")
    
    print("📋 Copia y pega estas consultas en tu cliente SQL:\n")
    
    print("-- 1. VERIFICAR PAÍSES")
    print("SELECT id, nombre, codigo FROM paises ORDER BY id;")
    print()
    
    print("-- 2. VERIFICAR CIUDADES Y SUS RELACIONES")
    print("""SELECT 
    c.id as ciudad_id,
    c.nombre as ciudad_nombre,
    c.pais_id,
    p.nombre as pais_nombre,
    CASE 
        WHEN p.id IS NULL THEN 'PROBLEMA'
        ELSE 'OK'
    END as estado
FROM ciudades c
LEFT JOIN paises p ON c.pais_id = p.id
ORDER BY c.nombre;""")
    print()
    
    print("-- 3. ENCONTRAR CIUDADES CON PROBLEMAS")
    print("""SELECT 
    c.id,
    c.nombre,
    c.pais_id as pais_id_invalido
FROM ciudades c
WHERE c.pais_id NOT IN (SELECT id FROM paises);""")
    print()
    
    print("-- 4. VERIFICAR REMITENTES")
    print("""SELECT 
    r.id,
    r.nombre,
    r.ciudad_id,
    c.nombre as ciudad_nombre,
    p.nombre as pais_nombre
FROM remitentes r
LEFT JOIN ciudades c ON r.ciudad_id = c.id
LEFT JOIN paises p ON c.pais_id = p.id
LIMIT 10;""")
    print()
    
    print("-- 5. INSERTAR PAÍSES BÁSICOS (si no existen)")
    print("""INSERT INTO paises (nombre, codigo) VALUES 
('Paraguay', 'PY'),
('Brasil', 'BR'),
('Argentina', 'AR'),
('Uruguay', 'UY'),
('Bolivia', 'BO')
ON CONFLICT (codigo) DO NOTHING;""")
    print()
    
    print("-- 6. INSERTAR CIUDADES BÁSICAS PARA PARAGUAY")
    print("""INSERT INTO ciudades (nombre, pais_id) VALUES 
('Asunción', (SELECT id FROM paises WHERE codigo = 'PY')),
('Ciudad del Este', (SELECT id FROM paises WHERE codigo = 'PY')),
('Encarnación', (SELECT id FROM paises WHERE codigo = 'PY')),
('Pedro Juan Caballero', (SELECT id FROM paises WHERE codigo = 'PY'));""")
    print()
    
    print("-- 7. CORREGIR CIUDADES HUÉRFANAS (asignar a Paraguay)")
    print("""UPDATE ciudades 
SET pais_id = (SELECT id FROM paises WHERE codigo = 'PY' LIMIT 1)
WHERE pais_id NOT IN (SELECT id FROM paises);""")
    print()
    
    print("-- 8. CORREGIR REMITENTES HUÉRFANOS (asignar a Asunción)")
    print("""UPDATE remitentes 
SET ciudad_id = (SELECT id FROM ciudades WHERE nombre = 'Asunción' LIMIT 1)
WHERE ciudad_id IS NOT NULL 
AND ciudad_id NOT IN (SELECT id FROM ciudades);""")
    print()
    
    print("-- 9. INSERTAR MONEDAS BÁSICAS")
    print("""INSERT INTO monedas (codigo, nombre, simbolo) VALUES 
('USD', 'Dólar Americano', '$'),
('PYG', 'Guaraní Paraguayo', '₲'),
('BRL', 'Real Brasileño', 'R$'),
('ARS', 'Peso Argentino', '$')
ON CONFLICT (codigo) DO NOTHING;""")

def diagnosticar_con_flask():
    """Diagnóstica usando Flask si está disponible"""
    app = crear_app_context()
    if not app:
        return False
    
    with app.app_context():
        try:
            print("\n🔍 === DIAGNÓSTICO CON FLASK ===\n")
            
            # Verificar países
            paises = Pais.query.all()
            print(f"🌍 Países en BD: {len(paises)}")
            for pais in paises:
                print(f"  - {pais.nombre} (ID: {pais.id}, Código: {pais.codigo})")
            
            # Verificar ciudades
            ciudades = Ciudad.query.all()
            print(f"\n🏙️ Ciudades en BD: {len(ciudades)}")
            pais_ids_validos = [p.id for p in paises]
            
            ciudades_validas = 0
            for ciudad in ciudades:
                if ciudad.pais_id in pais_ids_validos:
                    pais_nombre = next(p.nombre for p in paises if p.id == ciudad.pais_id)
                    print(f"  ✅ {ciudad.nombre} → {pais_nombre}")
                    ciudades_validas += 1
                else:
                    print(f"  ❌ {ciudad.nombre} → pais_id: {ciudad.pais_id} (INVÁLIDO)")
            
            print(f"\n📊 Resumen: {ciudades_validas}/{len(ciudades)} ciudades válidas")
            
            # Verificar remitentes
            remitentes_count = Remitente.query.count()
            print(f"👥 Remitentes en BD: {remitentes_count}")
            
            if ciudades_validas == len(ciudades) and len(paises) > 0:
                print("✅ DATOS CORRECTOS - El autocompletado debería funcionar")
            else:
                print("❌ DATOS INCORRECTOS - Ejecuta las consultas SQL de arriba")
            
            return True
            
        except Exception as e:
            print(f"❌ Error en diagnóstico: {e}")
            return False

def main():
    """Función principal"""
    print("🚀 === DIAGNÓSTICO DE BASE DE DATOS ===\n")
    
    # Verificar estructura
    verificar_estructura_proyecto()
    
    # Intentar diagnóstico con Flask
    if not diagnosticar_con_flask():
        print("\n📋 Como no se pudo usar Flask, usa las consultas SQL:")
        consulta_sql_directa()
    
    print("\n🎯 === PRÓXIMOS PASOS ===")
    print("1. Ejecuta las consultas SQL en tu cliente de base de datos")
    print("2. Verifica que los países y ciudades tengan relaciones correctas")
    print("3. Prueba el autocompletado en el frontend")
    print("4. Si persisten problemas, comparte los resultados de las consultas SQL")

if __name__ == "__main__":
    main()