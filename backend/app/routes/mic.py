# ========== IMPORTS COMPLETOS Y ORDENADOS ==========
from flask import Blueprint, request, jsonify, send_file
from sqlalchemy.orm import joinedload
from datetime import datetime
from app.models import db, MIC, CRT, Ciudad, Transportadora
from app.utils.layout_mic import generar_micdta_pdf_con_datos
import requests

mic_bp = Blueprint('mic', __name__, url_prefix='/api/mic')

# ========== UTIL MULTILÍNEA ==========


def join_lines(*parts):
    """Une los campos con salto de línea solo si existen."""
    return "\n".join([str(p) for p in parts if p])

# ✅ NUEVA FUNCIÓN: Formatear datos con documento desde el microservicio Go


def formatear_datos_con_documento_go(nombre, documento, tipo_documento, direccion=None):
    """
    Formatea los datos que vienen del microservicio Go con documentos
    Ejemplo de salida:
    EMPRESA XYZ S.A.
    RUC: 80012345-6
    Av. Principal 1234
    """
    if not nombre:
        return ""

    lines = [nombre]

    # Agregar documento si existe
    if documento and tipo_documento:
        lines.append(f"{tipo_documento}: {documento}")
    elif documento:
        lines.append(f"DOC: {documento}")

    # Agregar dirección si existe
    if direccion:
        lines.append(direccion)

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
    ✅ ACTUALIZADO: Genera un PDF del MIC desde un CRT obtenido del microservicio Go,
    incluyendo documentos en los campos 1, 33, 34, 35
    """
    try:
        user_data = request.json if request.is_json else {}

        # ✅ NUEVO: Obtener datos del microservicio Go
        print(f"🔍 Obteniendo CRT {crt_id} desde microservicio Go...")
        go_response = requests.get(f"http://localhost:8080/api/crts/{crt_id}")

        if go_response.status_code != 200:
            print(f"❌ Error del microservicio Go: {go_response.status_code}")
            return jsonify({"error": f"CRT {crt_id} no encontrado en microservicio Go"}), 404

        crt_data = go_response.json()
        print(f"✅ CRT obtenido: {crt_data.get('numero_crt', 'N/A')}")

        # ✅ NUEVO: Formatear campos con documentos usando datos del microservicio Go
        campo_1_formateado = formatear_datos_con_documento_go(
            crt_data.get('transportadora_nombre', ''),
            crt_data.get('transportadora_documento', ''),
            crt_data.get('transportadora_tipo_documento', ''),
            crt_data.get('transportadora_direccion', '')
        )

        campo_33_formateado = formatear_datos_con_documento_go(
            crt_data.get('remitente', ''),
            crt_data.get('remitente_documento', ''),
            crt_data.get('remitente_tipo_documento', '')
        )

        campo_34_formateado = formatear_datos_con_documento_go(
            crt_data.get('destinatario', ''),
            crt_data.get('destinatario_documento', ''),
            crt_data.get('destinatario_tipo_documento', '')
        )

        # Campo 35: Consignatario (usar destinatario por defecto)
        campo_35_formateado = campo_34_formateado

        print(
            f"🏢 Campo 1 formateado ({len(campo_1_formateado)} chars): {campo_1_formateado[:100]}...")
        print(
            f"📤 Campo 33 formateado ({len(campo_33_formateado)} chars): {campo_33_formateado[:100]}...")
        print(
            f"📥 Campo 34 formateado ({len(campo_34_formateado)} chars): {campo_34_formateado[:100]}...")

        # ✅ ACTUALIZADO: Construir mic_data con campos formateados
        mic_data = {
            # ✅ Campos con documentos incluidos
            "campo_1_transporte": campo_1_formateado,
            "campo_33_datos_campo1_crt": campo_33_formateado,
            "campo_34_datos_campo4_crt": campo_34_formateado,
            "campo_35_datos_campo6_crt": campo_35_formateado,

            # Campos normales desde el microservicio Go
            "campo_2_numero": "",
            "campo_3_transporte": "",
            "campo_4_estado": crt_data.get('estado', 'PROVISORIO'),
            "campo_5_hoja": "1 / 1",
            "campo_6_fecha": datetime.now().strftime('%Y-%m-%d'),  # Fecha actual por defecto
            "campo_7_pto_seguro": "",
            "campo_8_destino": "",  # Será llenado por el usuario
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
            "campo_23_numero_campo2_crt": crt_data.get('numero_crt', ''),
            "campo_24_aduana": "",
            "campo_25_moneda": "DOLAR AMERICANO",  # Por defecto
            "campo_26_pais": "520-PARAGUAY",
            "campo_27_valor_campo16": str(crt_data.get('declaracion_mercaderia', '')),
            "campo_28_total": "",
            "campo_29_seguro": "",
            "campo_30_tipo_bultos": "",
            "campo_31_cantidad": "",
            "campo_32_peso_bruto": str(crt_data.get('peso_bruto', '')),
            "campo_36_factura_despacho": crt_data.get('factura_exportacion', ''),
            "campo_37_valor_manual": "",
            "campo_38_datos_campo11_crt": (crt_data.get('detalles_mercaderia', '') or '')[:1500],
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

        # Generar el PDF
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            filename = tmp_file.name

        generar_micdta_pdf_con_datos(mic_data, filename)

        response = send_file(filename, as_attachment=True,
                             download_name=f"MIC_CRT_{crt_data.get('numero_crt', crt_id)}.pdf")
        response.call_on_close(lambda: os.unlink(filename))
        return response

    except requests.RequestException as e:
        print(f"❌ Error de conexión con microservicio Go: {e}")
        return jsonify({"error": f"Error conectando con microservicio Go: {str(e)}"}), 500
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
# from app.routes.mic import mic
