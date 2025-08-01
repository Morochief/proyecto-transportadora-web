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
    Genera un PDF del MIC directamente desde un CRT,
    permitiendo que ciertos campos sean editados por el usuario antes de generar el PDF.
    """
    try:
        user_data = request.json if request.is_json else {}

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

        # --- TRANSPORTE multilínea (para campo 1 y 9) ---
        _transporte_multilinea = join_lines(
            crt.transportadora.nombre if crt.transportadora else "",
            crt.transportadora.direccion if crt.transportadora else "",
            crt.transportadora.ciudad.nombre if crt.transportadora and crt.transportadora.ciudad else "",
            crt.transportadora.ciudad.pais.nombre if crt.transportadora and crt.transportadora.ciudad and crt.transportadora.ciudad.pais else ""
        )

        mic_data = {
            "campo_1_transporte": _transporte_multilinea,
            "campo_2_numero": "",
            "campo_3_transporte": "",
            "campo_4_estado": "PROVISORIO",
            "campo_5_hoja": "1 / 1",
            "campo_6_fecha": crt.fecha_emision.strftime('%Y-%m-%d') if crt.fecha_emision else "",
            "campo_7_pto_seguro": "",
            "campo_8_destino": crt.lugar_entrega or "",
            "campo_9_datos_transporte": _transporte_multilinea,
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
            "campo_33_datos_campo1_crt": join_lines(
                crt.remitente.nombre if crt.remitente else "",
                crt.remitente.direccion if crt.remitente else "",
                crt.remitente.ciudad.nombre if crt.remitente and crt.remitente.ciudad else "",
                crt.remitente.ciudad.pais.nombre if crt.remitente and crt.remitente.ciudad and crt.remitente.ciudad.pais else ""
            ) if crt.remitente else "",
            "campo_34_datos_campo4_crt": join_lines(
                crt.destinatario.nombre if crt.destinatario else "",
                crt.destinatario.direccion if crt.destinatario else "",
                crt.destinatario.ciudad.nombre if crt.destinatario and crt.destinatario.ciudad else "",
                crt.destinatario.ciudad.pais.nombre if crt.destinatario and crt.destinatario.ciudad and crt.destinatario.ciudad.pais else ""
            ) if crt.destinatario else "",
            "campo_35_datos_campo6_crt": join_lines(
                crt.consignatario.nombre if crt.consignatario else "",
                crt.consignatario.direccion if crt.consignatario else "",
                crt.consignatario.ciudad.nombre if crt.consignatario and crt.consignatario.ciudad else "",
                crt.consignatario.ciudad.pais.nombre if crt.consignatario and crt.consignatario.ciudad and crt.consignatario.ciudad.pais else ""
            ) if crt.consignatario else "",
            "campo_36_factura_despacho": (
                f"Factura: {crt.factura_exportacion or ''} | Despacho: {crt.nro_despacho or ''}"
                if crt.factura_exportacion or crt.nro_despacho else ""
            ),
            "campo_37_valor_manual": "",
            "campo_38_datos_campo11_crt": (crt.detalles_mercaderia or "")[:1500],
            "campo_40_tramo": "",
        }

        # <--- Aquí se actualiza con los datos recibidos desde el frontend:
        if user_data:
            mic_data.update(user_data)

        # === BLINDAJE: SIEMPRE iguala el campo 9 al campo 1 antes de generar PDF ===
        mic_data["campo_9_datos_transporte"] = mic_data["campo_1_transporte"]

        # --- DEBUG opcional ---
        print("======================")
        print("Campo 1:", repr(mic_data['campo_1_transporte']))
        print("Campo 9:", repr(mic_data['campo_9_datos_transporte']))
        print("======================")

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

    # BLINDAJE también aquí, si quieres (opcional)
    mic_data["campo_9_datos_transporte"] = mic_data["campo_1_transporte"]

    filename = f"mic_{mic.id}.pdf"
    print("======================")
    print("Campo 1:", repr(mic_data['campo_1_transporte']))
    print("Campo 9:", repr(mic_data['campo_9_datos_transporte']))
    print("======================")

    generar_micdta_pdf_con_datos(mic_data, filename)
    return send_file(filename, as_attachment=True)

# Recuerda: registrar el blueprint en tu app principal
# from app.routes.mic import mic_bp
# app.register_blueprint(mic_bp)
