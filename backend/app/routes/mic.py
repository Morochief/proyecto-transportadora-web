# ========== IMPORTS COMPLETOS Y ORDENADOS ==========
from flask import Blueprint, request, jsonify, send_file
from sqlalchemy.orm import joinedload
from datetime import datetime
from app.models import db, MIC, CRT, Ciudad, Transportadora, Remitente
from app.utils.layout_mic import generar_micdta_pdf_con_datos

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

# ========== GENERAR PDF DESDE CRT MEJORADO ==========


@mic_bp.route('/generate_pdf_from_crt/<int:crt_id>', methods=['POST'])
def generar_pdf_mic_desde_crt(crt_id):
    """
    ✅ ACTUALIZADO: Genera un PDF del MIC directamente desde un CRT
    con clonación COMPLETA de datos exactamente como están en el CRT
    """
    try:
        user_data = request.json if request.is_json else {}

        print(f"🔍 INICIANDO CLONACIÓN COMPLETA CRT -> MIC (ID: {crt_id})")
        print("="*80)

        # ✅ CARGAR CRT CON TODAS LAS RELACIONES NECESARIAS
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
            joinedload(CRT.gastos),
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
        print()

        # ✅ FORMATEAR DATOS COMPLETOS CON LA NUEVA FUNCIÓN
        print("🎯 INICIANDO FORMATEO COMPLETO DE ENTIDADES...")
        print("-" * 60)

        # Campo 1 y 9: Transportadora completa
        campo_1_transportadora = formatear_entidad_completa_crt(
            crt.transportadora)

        # Campo 33: Remitente completo
        campo_33_remitente = formatear_entidad_completa_crt(crt.remitente)

        # Campo 34: Destinatario completo
        campo_34_destinatario = formatear_entidad_completa_crt(
            crt.destinatario)

        # Campo 35: Consignatario completo (o destinatario si no hay consignatario)
        campo_35_consignatario = formatear_entidad_completa_crt(
            crt.consignatario) if crt.consignatario else campo_34_destinatario

        print("✅ FORMATEO COMPLETO TERMINADO")
        print("-" * 60)

        # ✅ VERIFICACIÓN DE CONTENIDO CLONADO
        print("🔍 VERIFICACIÓN DE CLONACIÓN:")
        print(
            f"📋 Campo 1 (Transportadora): {len(campo_1_transportadora)} chars")
        print(
            f"   Preview: {campo_1_transportadora[:80]}{'...' if len(campo_1_transportadora) > 80 else ''}")
        print(f"📋 Campo 33 (Remitente): {len(campo_33_remitente)} chars")
        print(
            f"   Preview: {campo_33_remitente[:80]}{'...' if len(campo_33_remitente) > 80 else ''}")
        print(f"📋 Campo 34 (Destinatario): {len(campo_34_destinatario)} chars")
        print(
            f"   Preview: {campo_34_destinatario[:80]}{'...' if len(campo_34_destinatario) > 80 else ''}")
        print(
            f"📋 Campo 35 (Consignatario): {len(campo_35_consignatario)} chars")
        print(
            f"   Preview: {campo_35_consignatario[:80]}{'...' if len(campo_35_consignatario) > 80 else ''}")
        print()

        # ✅ CONSTRUIR DATOS MIC CON CLONACIÓN COMPLETA
        mic_data = {
            # ✅ CAMPOS PRINCIPALES CON DATOS COMPLETOS CLONADOS
            "campo_1_transporte": campo_1_transportadora,
            "campo_9_datos_transporte": campo_1_transportadora,  # Mismo que campo 1
            "campo_33_datos_campo1_crt": campo_33_remitente,
            "campo_34_datos_campo4_crt": campo_34_destinatario,
            "campo_35_datos_campo6_crt": campo_35_consignatario,

            # ✅ OTROS CAMPOS DEL CRT CLONADOS
            "campo_2_numero": "",
            "campo_3_transporte": "",
            "campo_4_estado": "PROVISORIO",
            "campo_5_hoja": "1 / 1",
            "campo_6_fecha": crt.fecha_emision.strftime('%Y-%m-%d') if crt.fecha_emision else "",
            "campo_7_pto_seguro": "",
            "campo_8_destino": crt.lugar_entrega or "",
            "campo_10_numero": "",
            "campo_11_placa": "",
            "campo_12_modelo_chasis": "",
            "campo_13_siempre_45": "45 TON",
            "campo_14_anio": "",
            "campo_15_placa_semi": "",
            "campo_16_asteriscos_1": "******",
            "campo_17_asteriscos_2": "******",
            "campo_18_asteriscos_3": "******",
            "campo_19_asteriscos_4": "******",
            "campo_20_asteriscos_5": "******",
            "campo_21_asteriscos_6": "******",
            "campo_22_asteriscos_7": "******",
            "campo_23_numero_campo2_crt": crt.numero_crt or "",
            "campo_24_aduana": "",
            "campo_25_moneda": crt.moneda.nombre if crt.moneda else "",
            "campo_26_pais": "520-PARAGUAY",
            "campo_27_valor_campo16": str(crt.declaracion_mercaderia or ""),
            "campo_28_total": "",
            "campo_29_seguro": "",
            "campo_30_tipo_bultos": "",
            "campo_31_cantidad": "",
            "campo_32_peso_bruto": str(crt.peso_bruto or ""),
            "campo_36_factura_despacho": (
                f"Factura: {crt.factura_exportacion or ''} | Despacho: {crt.nro_despacho or ''}"
                if crt.factura_exportacion or crt.nro_despacho else ""
            ),
            "campo_37_valor_manual": "",
            "campo_38_datos_campo11_crt": (crt.detalles_mercaderia or "")[:1500],
            "campo_40_tramo": "",
        }

        # ✅ APLICAR DATOS DEL USUARIO (si los hay)
        if user_data:
            if 'campo_38' in user_data:
                user_data['campo_38_datos_campo11_crt'] = user_data.pop(
                    'campo_38')
            mic_data.update(user_data)

        # ✅ RESUMEN FINAL DE CLONACIÓN
        print("🎯 RESUMEN DE CLONACIÓN COMPLETA:")
        print(
            f"   📋 Campo 1 (Transportadora): {len(mic_data['campo_1_transporte'])} chars - {'✅ CON DATOS' if mic_data['campo_1_transporte'] else '❌ VACÍO'}")
        print(
            f"   📋 Campo 33 (Remitente): {len(mic_data['campo_33_datos_campo1_crt'])} chars - {'✅ CON DATOS' if mic_data['campo_33_datos_campo1_crt'] else '❌ VACÍO'}")
        print(
            f"   📋 Campo 34 (Destinatario): {len(mic_data['campo_34_datos_campo4_crt'])} chars - {'✅ CON DATOS' if mic_data['campo_34_datos_campo4_crt'] else '❌ VACÍO'}")
        print(
            f"   📋 Campo 35 (Consignatario): {len(mic_data['campo_35_datos_campo6_crt'])} chars - {'✅ CON DATOS' if mic_data['campo_35_datos_campo6_crt'] else '❌ VACÍO'}")
        print(
            f"   📦 Campo 38 (Mercadería): {len(mic_data['campo_38_datos_campo11_crt'])} chars - {'✅ CON DATOS' if mic_data['campo_38_datos_campo11_crt'] else '❌ VACÍO'}")
        print("="*80)

        # Generar el PDF
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            filename = tmp_file.name

        generar_micdta_pdf_con_datos(mic_data, filename)

        response = send_file(filename, as_attachment=True,
                             download_name=f"MIC_CRT_{crt.numero_crt or crt.id}.pdf")
        response.call_on_close(lambda: os.unlink(filename))

        print(f"✅ PDF MIC GENERADO EXITOSAMENTE para CRT {crt.numero_crt}")
        return response

    except Exception as e:
        import traceback
        print("="*50)
        print("❌ ERROR EN CLONACIÓN CRT -> MIC:")
        print(traceback.format_exc())
        print("="*50)
        return jsonify({"error": str(e)}), 500


@mic_bp.route('/<int:mic_id>/pdf', methods=['GET'])
def mic_pdf(mic_id):
    mic = MIC.query.get_or_404(mic_id)
    mic_data = to_dict_mic(mic)

    # BLINDAJE: Asegurar que campo 9 = campo 1
    mic_data["campo_9_datos_transporte"] = mic_data["campo_1_transporte"]

    filename = f"mic_{mic.id}.pdf"
    print("🎯 GENERANDO PDF DESDE MIC GUARDADO:")
    print(f"   📋 Campo 1: {len(mic_data['campo_1_transporte'])} chars")
    print(f"   📋 Campo 9: {len(mic_data['campo_9_datos_transporte'])} chars")
    print(
        f"   📦 Campo 38: {len(mic_data['campo_38_datos_campo11_crt'])} chars")

    generar_micdta_pdf_con_datos(mic_data, filename)
    return send_file(filename, as_attachment=True)

# ✅ NUEVA RUTA: Verificar clonación de datos específicos


@mic_bp.route('/verify_clone/<int:crt_id>', methods=['GET'])
def verificar_clonacion(crt_id):
    """
    Ruta de verificación para mostrar cómo se clonarían los datos del CRT al MIC
    """
    try:
        crt = CRT.query.options(
            joinedload(CRT.remitente).joinedload(
                Remitente.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.transportadora).joinedload(
                Transportadora.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.destinatario).joinedload(
                Remitente.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.consignatario).joinedload(
                Remitente.ciudad).joinedload(Ciudad.pais),
        ).get_or_404(crt_id)

        # Formatear datos
        campo_1 = formatear_entidad_completa_crt(crt.transportadora)
        campo_33 = formatear_entidad_completa_crt(crt.remitente)
        campo_34 = formatear_entidad_completa_crt(crt.destinatario)
        campo_35 = formatear_entidad_completa_crt(
            crt.consignatario) if crt.consignatario else campo_34

        return jsonify({
            "crt_numero": crt.numero_crt,
            "clonacion": {
                "campo_1_transportadora": {
                    "texto": campo_1,
                    "lineas": campo_1.split('\n'),
                    "longitud": len(campo_1)
                },
                "campo_33_remitente": {
                    "texto": campo_33,
                    "lineas": campo_33.split('\n'),
                    "longitud": len(campo_33)
                },
                "campo_34_destinatario": {
                    "texto": campo_34,
                    "lineas": campo_34.split('\n'),
                    "longitud": len(campo_34)
                },
                "campo_35_consignatario": {
                    "texto": campo_35,
                    "lineas": campo_35.split('\n'),
                    "longitud": len(campo_35)
                }
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
