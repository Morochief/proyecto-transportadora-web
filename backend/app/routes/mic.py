# ========== IMPORTS COMPLETOS Y ORDENADOS ==========
from flask import Blueprint, request, jsonify, send_file
from sqlalchemy.orm import joinedload
from datetime import datetime
from app.models import db, MIC, CRT, Ciudad, Transportadora
from app.utils.layout_mic import generar_micdta_pdf_con_datos

mic_bp = Blueprint('mic', __name__, url_prefix='/api/mic')

# ========== UTIL MULTILÍNEA ==========


def join_lines(*parts):
    """Une los campos con salto de línea solo si existen."""
    return "\n".join([str(p) for p in parts if p])

# ✅ NUEVA FUNCIÓN: Formatear entidad con documento (sin usar requests)


def formatear_con_documento(entidad):
    """
    Formatea una entidad (transportadora, remitente, destinatario) con sus datos de documento
    Ejemplo de salida:
    EMPRESA XYZ S.A.
    RUC: 80012345-6
    Av. Principal 1234
    Asunción - Paraguay
    """
    if not entidad:
        return ""

    lines = []

    # 1. Nombre de la entidad
    if hasattr(entidad, 'nombre') and entidad.nombre:
        lines.append(entidad.nombre)

    # 2. Documento (RUC, CI, CNPJ, etc.)
    documento = ""
    tipo_documento = ""

    if hasattr(entidad, 'documento') and entidad.documento:
        documento = entidad.documento
    if hasattr(entidad, 'tipo_documento') and entidad.tipo_documento:
        tipo_documento = entidad.tipo_documento

    if documento and tipo_documento:
        lines.append(f"{tipo_documento}: {documento}")
    elif documento:  # Si hay documento pero no tipo
        lines.append(f"DOC: {documento}")

    # 3. Dirección
    if hasattr(entidad, 'direccion') and entidad.direccion:
        lines.append(entidad.direccion)

    # 4. Ciudad - País
    if hasattr(entidad, 'ciudad') and entidad.ciudad:
        if entidad.ciudad.pais:
            lines.append(
                f"{entidad.ciudad.nombre} - {entidad.ciudad.pais.nombre}")
        else:
            lines.append(entidad.ciudad.nombre)

    return "\n".join(lines)

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

# ========== CRUD MIC COMPLETO ==========


@mic_bp.route('/generate_pdf_from_crt/<int:crt_id>', methods=['POST'])
def generar_pdf_mic_desde_crt(crt_id):
    """
    ✅ ACTUALIZADO: Genera un PDF del MIC directamente desde un CRT con documentos,
    usando tu lógica original de SQLAlchemy (SIN requests)
    """
    try:
        user_data = request.json if request.is_json else {}

        # ✅ USAR TU LÓGICA ORIGINAL: SQLAlchemy en lugar de requests
        crt = CRT.query.options(
            joinedload(CRT.remitente),
            joinedload(CRT.transportadora).joinedload(
                Transportadora.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.destinatario),
            joinedload(CRT.consignatario),
            joinedload(CRT.moneda),
            joinedload(CRT.gastos),
            joinedload(CRT.ciudad_emision).joinedload(Ciudad.pais)
        ).get_or_404(crt_id)

        print(f"🔍 CRT cargado desde base de datos: {crt.numero_crt}")
        print(
            f"🚛 Transportadora: {crt.transportadora.nombre if crt.transportadora else 'N/A'}")
        print(
            f"📤 Remitente: {crt.remitente.nombre if crt.remitente else 'N/A'}")
        print(
            f"📥 Destinatario: {crt.destinatario.nombre if crt.destinatario else 'N/A'}")

        # ✅ NUEVO: Usar formateo con documentos para campos 1, 33, 34, 35
        campo_1_formateado = formatear_con_documento(crt.transportadora)
        campo_33_formateado = formatear_con_documento(crt.remitente)
        campo_34_formateado = formatear_con_documento(crt.destinatario)
        campo_35_formateado = formatear_con_documento(
            crt.consignatario) if crt.consignatario else campo_34_formateado

        print(
            f"✅ Campo 1 formateado ({len(campo_1_formateado)} chars): {campo_1_formateado[:100]}...")
        print(
            f"✅ Campo 33 formateado ({len(campo_33_formateado)} chars): {campo_33_formateado[:100]}...")
        print(
            f"✅ Campo 34 formateado ({len(campo_34_formateado)} chars): {campo_34_formateado[:100]}...")

        # ✅ ACTUALIZADO: Usar tu estructura original + campos con documentos
        mic_data = {
            # ✅ CAMPOS CON DOCUMENTOS INCLUIDOS
            "campo_1_transporte": campo_1_formateado,
            "campo_33_datos_campo1_crt": campo_33_formateado,
            "campo_34_datos_campo4_crt": campo_34_formateado,
            "campo_35_datos_campo6_crt": campo_35_formateado,

            # ✅ TU LÓGICA ORIGINAL MANTENIDA
            "campo_2_numero": "",
            "campo_3_transporte": "",
            "campo_4_estado": "PROVISORIO",
            "campo_5_hoja": "1 / 1",
            "campo_6_fecha": crt.fecha_emision.strftime('%Y-%m-%d') if crt.fecha_emision else "",
            "campo_7_pto_seguro": "",
            "campo_8_destino": crt.lugar_entrega or "",
            "campo_9_datos_transporte": campo_1_formateado,  # Mismo que campo 1
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

        # ✅ ACTUALIZADO: Manejar el campo_38 del frontend correctamente
        if user_data:
            if 'campo_38' in user_data:
                user_data['campo_38_datos_campo11_crt'] = user_data.pop(
                    'campo_38')
            mic_data.update(user_data)

        # === BLINDAJE: SIEMPRE iguala el campo 9 al campo 1 antes de generar PDF ===
        mic_data["campo_9_datos_transporte"] = mic_data["campo_1_transporte"]

        # --- DEBUG ---
        print("="*60)
        print("🚛 Campo 1 (Transportador con doc):",
              repr(mic_data['campo_1_transporte'][:120]))
        print("📤 Campo 33 (Remitente con doc):", repr(
            mic_data['campo_33_datos_campo1_crt'][:120]))
        print("📥 Campo 34 (Destinatario con doc):", repr(
            mic_data['campo_34_datos_campo4_crt'][:120]))
        print("📋 Campo 35 (Consignatario con doc):", repr(
            mic_data['campo_35_datos_campo6_crt'][:120]))
        print("📦 Campo 38:", repr(
            mic_data['campo_38_datos_campo11_crt'][:120]))
        print("="*60)

        # Generar el PDF usando tu función existente
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            filename = tmp_file.name

        generar_micdta_pdf_con_datos(mic_data, filename)

        response = send_file(filename, as_attachment=True,
                             download_name=f"MIC_CRT_{crt.numero_crt or crt.id}.pdf")
        response.call_on_close(lambda: os.unlink(filename))
        return response

    except Exception as e:
        import traceback
        print("="*50)
        print("ERROR EN /generate_pdf_from_crt:")
        print(traceback.format_exc())
        print("="*50)
        return jsonify({"error": str(e)}), 500


@mic_bp.route('/<int:mic_id>/pdf', methods=['GET'])
def mic_pdf(mic_id):
    mic = MIC.query.get_or_404(mic_id)
    mic_data = to_dict_mic(mic)

    # BLINDAJE también aquí
    mic_data["campo_9_datos_transporte"] = mic_data["campo_1_transporte"]

    filename = f"mic_{mic.id}.pdf"
    print("======================")
    print("Campo 1:", repr(mic_data['campo_1_transporte']))
    print("Campo 9:", repr(mic_data['campo_9_datos_transporte']))
    print("Campo 38:", repr(mic_data['campo_38_datos_campo11_crt']))
    print("======================")

    generar_micdta_pdf_con_datos(mic_data, filename)
    return send_file(filename, as_attachment=True)

# Recuerda: registrar el blueprint en tu app principal
# from app.routes.mic import mic_bp
# app.register_blueprint(mic_bp)
