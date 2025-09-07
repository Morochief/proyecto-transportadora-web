# ========== IMPORTS COMPLETOS Y ORDENADOS ==========
from flask import Blueprint, request, jsonify, send_file
from sqlalchemy.orm import joinedload
from datetime import datetime
from app.models import db, MIC, CRT, CRT_Gasto, Ciudad, Transportadora, Remitente
from app.utils.layout_mic import generar_micdta_pdf_con_datos_y_diagnostico

mic_bp = Blueprint('mic', __name__, url_prefix='/api/mic')

# ========== UTIL MULTILÍNEA ========== 


def join_lines(*parts):
    """Une los campos con salto de línea solo si existen."""
    return "\n".join([str(p) for p in parts if p])

# ✅ NUEVA FUNCIÓN MEJORADA: Formatear entidad COMPLETA con todos los datos del CRT


def formatear_entidad_completa_crt(entidad):
    """
    ✅ MEJORADA: Formatea una entidad (transportadora, remitente, destinatario)
    con TODOS sus datos exactamente como están en el CRT

    Ejemplo de salida esperada:
    JOSAPAR - JOAQUIM OLIVEIRA S/A. PARTICIPACOES
    RUA SESMARIA ROCHA, S/N - RURAL
    ITAQUI - RS -BRASIL
    CNPJ:87456562/0008.07
    """
    if not entidad:
        return ""

    lines = []

    # 1. ✅ NOMBRE COMPLETO (línea principal)
    if hasattr(entidad, 'nombre') and entidad.nombre:
        lines.append(entidad.nombre.strip())

    # 2. ✅ DIRECCIÓN COMPLETA (puede ser multilínea)
    if hasattr(entidad, 'direccion') and entidad.direccion:
        direccion = entidad.direccion.strip()
        # Si la dirección tiene saltos de línea, respetarlos
        if '\n' in direccion:
            for linea_dir in direccion.split('\n'):
                if linea_dir.strip():
                    lines.append(linea_dir.strip())
        else:
            lines.append(direccion)

    # 3. ✅ CIUDAD - ESTADO/PROVINCIA - PAÍS
    ciudad_line = ""
    if hasattr(entidad, 'ciudad') and entidad.ciudad:
        # Ciudad
        if entidad.ciudad.nombre:
            ciudad_line = entidad.ciudad.nombre.strip()

        # País (agregar solo si existe)
        if entidad.ciudad.pais and entidad.ciudad.pais.nombre:
            pais = entidad.ciudad.pais.nombre.strip()
            if ciudad_line:
                ciudad_line += f" - {pais}"
            else:
                ciudad_line = pais

    if ciudad_line:
        lines.append(ciudad_line)

    # 4. ✅ DOCUMENTO COMPLETO (tipo:número)
    documento_line = ""
    tipo_documento = ""
    numero_documento = ""

    # Obtener tipo de documento
    if hasattr(entidad, 'tipo_documento') and entidad.tipo_documento:
        tipo_documento = entidad.tipo_documento.strip()

    # Obtener número de documento
    if hasattr(entidad, 'numero_documento') and entidad.numero_documento:
        numero_documento = entidad.numero_documento.strip()

    # Formar línea de documento
    if tipo_documento and numero_documento:
        documento_line = f"{tipo_documento}:{numero_documento}"
    elif numero_documento:  # Si solo hay número, usar formato genérico
        documento_line = f"DOC:{numero_documento}"

    if documento_line:
        lines.append(documento_line)

    # 5. ✅ INFORMACIÓN ADICIONAL (teléfono para transportadoras)
    if hasattr(entidad, 'telefono') and entidad.telefono:
        telefono = entidad.telefono.strip()
        if telefono:
            lines.append(f"Tel: {telefono}")

    resultado = "\n".join(lines)

    # Debug para verificar el formateo
    tipo_entidad = "Desconocida"
    if hasattr(entidad, 'codigo'):  # Es transportadora
        tipo_entidad = "Transportadora"
    else:  # Es remitente/destinatario/consignatario
        tipo_entidad = "Remitente/Destinatario"

    print(f"🎯 FORMATEO {tipo_entidad}:")
    print(f"   📝 Nombre: '{getattr(entidad, 'nombre', 'N/A')}'")
    print(f"   📍 Dirección: '{getattr(entidad, 'direccion', 'N/A')}'")
    print(
        f"   🏙️ Ciudad: '{getattr(entidad.ciudad, 'nombre', 'N/A') if hasattr(entidad, 'ciudad') and entidad.ciudad else 'N/A'}'")
    print(f"   🌍 País: '{getattr(entidad.ciudad.pais, 'nombre', 'N/A') if hasattr(entidad, 'ciudad') and entidad.ciudad and entidad.ciudad.pais else 'N/A'}'")
    print(f"   📄 Tipo Doc: '{getattr(entidad, 'tipo_documento', 'N/A')}'")
    print(f"   🔢 Núm Doc: '{getattr(entidad, 'numero_documento', 'N/A')}'")
    print(f"   📞 Teléfono: '{getattr(entidad, 'telefono', 'N/A')}'")
    print(f"   📋 RESULTADO ({len(lines)} líneas):")
    for i, line in enumerate(lines, 1):
        print(f"      Línea {i}: '{line}'")
    print(
        f"   📄 TEXTO FINAL ({len(resultado)} chars): '{resultado[:100]}{'...' if len(resultado) > 100 else ''}'")
    print()

    return resultado

# ========== NUEVA FUNCIÓN: Procesar gastos CRT para campos MIC ========== 


def procesar_gastos_crt_para_mic(gastos_crt):
    """
    ✅ NUEVA: Procesa los gastos del CRT para separar Seguro vs Flete en el MIC

    Lógica:
    - Si el tramo contiene "seguro" (case insensitive) -> va al campo 29 (Seguro)
    - Todos los demás gastos se suman -> van al campo 28 (Flete)

    Args:
        gastos_crt: Lista de objetos CRT_Gasto del CRT

    Returns:
        dict: {
            "campo_28_total": "valor_flete_sumado",  # Suma de no-seguros
            "campo_29_seguro": "valor_seguro"       # Valor del seguro
        }
    """
    if not gastos_crt:
        return {
            "campo_28_total": "",
            "campo_29_seguro": ""
        }

    print(f"🧮 PROCESANDO {len(gastos_crt)} GASTOS DEL CRT:")

    valor_seguro = 0.0
    valor_flete_total = 0.0

    for i, gasto in enumerate(gastos_crt, 1):
        tramo = (gasto.tramo or "").strip().lower()

        # Determinar valor a usar (priorizar remitente, luego destinatario)
        valor_gasto = 0.0
        moneda_usada = ""

        if gasto.valor_remitente and gasto.valor_remitente not in [None, "None", ""]:
            try:
                valor_gasto = float(gasto.valor_remitente)
                moneda_usada = gasto.moneda_remitente.nombre if gasto.moneda_remitente else ""
            except (ValueError, TypeError):
                valor_gasto = 0.0
        elif gasto.valor_destinatario and gasto.valor_destinatario not in [None, "None", ""]:
            try:
                valor_gasto = float(gasto.valor_destinatario)
                moneda_usada = gasto.moneda_destinatario.nombre if gasto.moneda_destinatario else ""
            except (ValueError, TypeError):
                valor_gasto = 0.0

        # Verificar si es seguro
        es_seguro = "seguro" in tramo

        if es_seguro:
            valor_seguro += valor_gasto
            print(
                f"   🛡️ Gasto {i} - SEGURO: '{gasto.tramo}' = {valor_gasto} {moneda_usada}")
        else:
            valor_flete_total += valor_gasto
            print(
                f"   🚛 Gasto {i} - FLETE: '{gasto.tramo}' = {valor_gasto} {moneda_usada}")

    # Formatear resultados
    def format_number(num):
        """Formatear número con comas como separador de miles"""
        if num == 0:
            return ""
        try:
            # Formatear con 2 decimales y comas
            formatted = f"{num:,.2f}"
            # Cambiar punto por coma decimal (formato español/paraguayo)
            formatted = formatted.replace(",", "X").replace(
                ".", ",").replace("X", ".")
            return formatted
        except:
            return str(num) if num != 0 else ""

    resultado = {
        "campo_28_total": format_number(valor_flete_total),
        "campo_29_seguro": format_number(valor_seguro)
    }

    print(f"📊 RESULTADO DEL PROCESAMIENTO:")
    print(f"   🚛 Total Flete (Campo 28): '{resultado['campo_28_total']}'")
    print(f"   🛡️ Total Seguro (Campo 29): '{resultado['campo_29_seguro']}'")
    print()

    return resultado

# ========== SERIALIZADOR DETALLADO ========== 

def to_dict_mic(mic):
    def safe_str(val):
        return "" if val is None else str(val)

    return {
        "id": mic.id,
        "crt_id": mic.crt_id,
        "campo_1_transporte": safe_str(mic.campo_1_transporte),
        "campo_2_numero": safe_str(mic.campo_2_numero),
        "campo_3_transporte": safe_str(mic.campo_3_transporte),
        "campo_4_estado": safe_str(mic.campo_4_estado),
        "campo_5_hoja": safe_str(mic.campo_5_hoja),
        "campo_6_fecha": mic.campo_6_fecha.strftime('%Y-%m-%d') if mic.campo_6_fecha else "",
        "campo_7_pto_seguro": safe_str(mic.campo_7_pto_seguro),
        "campo_8_destino": safe_str(mic.campo_8_destino),
        "campo_9_datos_transporte": safe_str(mic.campo_9_datos_transporte),
        "campo_10_numero": safe_str(mic.campo_10_numero),
        "campo_11_placa": safe_str(mic.campo_11_placa),
        "campo_12_modelo_chasis": safe_str(mic.campo_12_modelo_chasis),
        "campo_13_siempre_45": safe_str(mic.campo_13_siempre_45),
        "campo_14_anio": safe_str(mic.campo_14_anio),
        "campo_15_placa_semi": safe_str(mic.campo_15_placa_semi),
        "campo_16_asteriscos_1": safe_str(mic.campo_16_asteriscos_1),
        "campo_17_asteriscos_2": safe_str(mic.campo_17_asteriscos_2),
        "campo_18_asteriscos_3": safe_str(mic.campo_18_asteriscos_3),
        "campo_19_asteriscos_4": safe_str(mic.campo_19_asteriscos_4),
        "campo_20_asteriscos_5": safe_str(mic.campo_20_asteriscos_5),
        "campo_21_asteriscos_6": safe_str(mic.campo_21_asteriscos_6),
        "campo_22_asteriscos_7": safe_str(mic.campo_22_asteriscos_7),
        "campo_23_numero_campo2_crt": safe_str(mic.campo_23_numero_campo2_crt),
        "campo_24_aduana": safe_str(mic.campo_24_aduana),
        "campo_25_moneda": safe_str(mic.campo_25_moneda),
        "campo_26_pais": safe_str(mic.campo_26_pais),
        "campo_27_valor_campo16": safe_str(mic.campo_27_valor_campo16),
        "campo_28_total": safe_str(mic.campo_28_total),
        "campo_29_seguro": safe_str(mic.campo_29_seguro),
        "campo_30_tipo_bultos": safe_str(mic.campo_30_tipo_bultos),
        "campo_31_cantidad": safe_str(mic.campo_31_cantidad),
        "campo_32_peso_bruto": safe_str(mic.campo_32_peso_bruto),
        "campo_33_datos_campo1_crt": safe_str(mic.campo_33_datos_campo1_crt),
        "campo_34_datos_campo4_crt": safe_str(mic.campo_34_datos_campo4_crt),
        "campo_35_datos_campo6_crt": safe_str(mic.campo_35_datos_campo6_crt),
        "campo_36_factura_despacho": safe_str(mic.campo_36_factura_despacho),
        "campo_37_valor_manual": safe_str(mic.campo_37_valor_manual),
        "campo_38_datos_campo11_crt": safe_str(mic.campo_38_datos_campo11_crt),
        "campo_40_tramo": safe_str(mic.campo_40_tramo),
        "creado_en": mic.creado_en.strftime('%Y-%m-%d %H:%M:%S') if getattr(mic, "creado_en", None) else ""
    }

# ========== GENERAR PDF DESDE CRT COMPLETO ========== 


@mic_bp.route('/generate_pdf_from_crt/<int:crt_id>', methods=['POST'])
def generar_pdf_mic_desde_crt(crt_id):
    """
    ✅ ACTUALIZADO: Genera un PDF del MIC directamente desde un CRT
    con clonación COMPLETA de datos Y procesamiento de gastos Seguro vs Flete
    """
    try:
        user_data = request.json if request.is_json else {}

        print(f"🔍 INICIANDO CLONACIÓN COMPLETA CRT -> MIC (ID: {crt_id})")
        print("="*80)

        # ✅ CARGAR CRT CON TODAS LAS RELACIONES NECESARIAS (INCLUYENDO GASTOS)
        crt = CRT.query.options(
            joinedload(CRT.remitente).joinedload(
                Remitente.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.transportadora).joinedload(
                Transportadora.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.destinatario).joinedload(
                Remitente.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.consignatario).joinedload(
                Remitente.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.moneda),
            # ✅ IMPORTANTE: Cargar gastos con monedas
            joinedload(CRT.gastos).joinedload(CRT_Gasto.moneda_remitente),
            joinedload(CRT.gastos).joinedload(CRT_Gasto.moneda_destinatario),
            joinedload(CRT.ciudad_emision).joinedload(Ciudad.pais)
        ).get_or_404(crt_id)

        print(f"✅ CRT CARGADO: {crt.numero_crt}")
        print(
            f"🚛 Transportadora: {crt.transportadora.nombre if crt.transportadora else 'N/A'}")
        print(
            f"📤 Remitente: {crt.remitente.nombre if crt.remitente else 'N/A'}")
        print(
            f"📥 Destinatario: {crt.destinatario.nombre if crt.destinatario else 'N/A'}")
        print(
            f"📦 Consignatario: {crt.consignatario.nombre if crt.consignatario else 'N/A'}")
        print(f"💰 Gastos: {len(crt.gastos) if crt.gastos else 0} items")
        print()

        # ✅ FORMATEAR DATOS COMPLETOS CON LA FUNCIÓN EXISTENTE
        print("🎯 INICIANDO FORMATEO COMPLETO DE ENTIDADES...")
        print("-