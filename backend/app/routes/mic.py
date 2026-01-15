# ========== IMPORTS COMPLETOS Y ORDENADOS ==========
import os
import tempfile
import logging
from flask import Blueprint, request, jsonify, send_file
from sqlalchemy.orm import joinedload
from datetime import datetime
from app.models import db, MIC, CRT, CRT_Gasto, Ciudad, Transportadora, Remitente
from app.utils.layout_mic import generar_micdta_pdf_con_datos_y_diagnostico
from app.security.decorators import verify_authentication

mic_bp = Blueprint('mic', __name__, url_prefix='/api/mic')
mic_bp.before_request(verify_authentication)
logger = logging.getLogger(__name__)

# ========== UTIL MULTILINEA ==========


def join_lines(*parts):
    """Une los campos con salto de linea solo si existen."""
    return "\n".join([str(p) for p in parts if p])

# NUEVA FUNCION MEJORADA: Formatear entidad COMPLETA con todos los datos del CRT


def formatear_entidad_completa_crt(entidad):
    """Formatea una entidad con los datos del CRT en texto multilinea."""
    if not entidad:
        return ""

    lines = []

    if hasattr(entidad, 'nombre') and entidad.nombre:
        lines.append(entidad.nombre.strip())

    if hasattr(entidad, 'direccion') and entidad.direccion:
        direccion = entidad.direccion.strip()
        if '\n' in direccion:
            for linea_dir in direccion.split('\n'):
                if linea_dir.strip():
                    lines.append(linea_dir.strip())
        else:
            lines.append(direccion)

    ciudad_line = ""
    if hasattr(entidad, 'ciudad') and entidad.ciudad:
        if entidad.ciudad.nombre:
            ciudad_line = entidad.ciudad.nombre.strip()
        if entidad.ciudad.pais and entidad.ciudad.pais.nombre:
            pais = entidad.ciudad.pais.nombre.strip()
            ciudad_line = f"{ciudad_line} - {pais}" if ciudad_line else pais

    if ciudad_line:
        lines.append(ciudad_line)

    tipo_documento = entidad.tipo_documento.strip() if hasattr(entidad, 'tipo_documento') and entidad.tipo_documento else ""
    numero_documento = entidad.numero_documento.strip() if hasattr(entidad, 'numero_documento') and entidad.numero_documento else ""

    if tipo_documento and numero_documento:
        lines.append(f"{tipo_documento}:{numero_documento}")
    elif numero_documento:
        lines.append(f"DOC:{numero_documento}")

    if hasattr(entidad, 'telefono') and entidad.telefono:
        telefono = entidad.telefono.strip()
        if telefono:
            lines.append(f"Tel: {telefono}")

    resultado = "\n".join(lines)

    tipo_entidad = "Remitente/Destinatario"
    if hasattr(entidad, 'codigo'):
        tipo_entidad = "Transportadora"

    if logger.isEnabledFor(logging.DEBUG):
        logger.debug(
            "Formatted %s entity with %d lines (%d chars)",
            tipo_entidad,
            len(lines),
            len(resultado),
        )

    return resultado

def procesar_gastos_crt_para_mic(gastos_crt):
    """Procesa gastos del CRT y separa montos de flete y seguro."""
    if not gastos_crt:
        return {
            "campo_28_total": "",
            "campo_29_seguro": ""
        }

    logger.debug("Processing %d CRT expenses", len(gastos_crt))

    valor_seguro = 0.0
    valor_flete_total = 0.0

    for index, gasto in enumerate(gastos_crt, 1):
        tramo = (gasto.tramo or "").strip().lower()

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

        es_seguro = "seguro" in tramo
        if es_seguro:
            valor_seguro += valor_gasto
        else:
            valor_flete_total += valor_gasto

        if logger.isEnabledFor(logging.DEBUG):
            logger.debug(
                "Expense %d classified as %s: %.2f %s",
                index,
                'seguro' if es_seguro else 'flete',
                valor_gasto,
                moneda_usada or '',
            )

    def format_number(num):
        if num == 0:
            return ""
        try:
            formatted = f"{num:,.2f}"
            formatted = formatted.replace(",", "X").replace(".", ",").replace("X", ".")
            return formatted
        except Exception:
            return str(num) if num != 0 else ""

    resultado = {
        "campo_28_total": format_number(valor_flete_total),
        "campo_29_seguro": format_number(valor_seguro)
    }

    logger.debug(
        "Computed CRT expenses summary: flete=%s, seguro=%s",
        resultado["campo_28_total"],
        resultado["campo_29_seguro"],
    )

    return resultado

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
def generate_pdf_from_crt(crt_id):
    try:
        datos = request.get_json()

        logger.info("Generating MIC PDF from CRT", extra={'crt_id': crt_id})
        if logger.isEnabledFor(logging.DEBUG):
            payload_keys = sorted(datos.keys()) if isinstance(datos, dict) else []
            logger.debug("Payload keys: %s", payload_keys)

        if 'campo_38' in datos:
            datos['campo_38_datos_campo11_crt'] = datos.pop('campo_38')

        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            filename = tmp_file.name

        from app.utils.layout_mic import generar_micdta_pdf_con_datos
        generar_micdta_pdf_con_datos(datos, filename)

        if not os.path.exists(filename):
            logger.error("MIC PDF generation failed, file not found: %s", filename)
            return {"error": "PDF no generado"}, 500

        file_size = os.path.getsize(filename)
        logger.debug("Sending MIC PDF %s (%d bytes)", filename, file_size)

        response = send_file(
            filename,
            as_attachment=True,
            download_name=f"mic_{crt_id}.pdf",
            mimetype='application/pdf'
        )
        response.call_on_close(lambda: os.unlink(filename))
        return response

    except Exception as e:
        logger.exception("Error generating MIC PDF for CRT", extra={'crt_id': crt_id})
        return {"error": str(e)}, 500
@mic_bp.route('/cargar-datos-crt/<int:crt_id>', methods=['GET'])
def cargar_datos_crt(crt_id):
    """Carga datos completos de un CRT y los adapta al formato MIC."""
    try:
        logger.info("Loading CRT %s for MIC payload", crt_id)

        crt = CRT.query.options(
            joinedload(CRT.remitente).joinedload(Remitente.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.transportadora).joinedload(Transportadora.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.destinatario).joinedload(Remitente.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.consignatario).joinedload(Remitente.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.moneda),
            joinedload(CRT.gastos).joinedload(CRT_Gasto.moneda_remitente),
            joinedload(CRT.gastos).joinedload(CRT_Gasto.moneda_destinatario),
            joinedload(CRT.ciudad_emision).joinedload(Ciudad.pais)
        ).get_or_404(crt_id)

        transportadora_formateada = formatear_entidad_completa_crt(crt.transportadora)
        remitente_formateado = formatear_entidad_completa_crt(crt.remitente)
        destinatario_formateado = formatear_entidad_completa_crt(crt.destinatario)
        consignatario_formateado = formatear_entidad_completa_crt(crt.consignatario) if crt.consignatario else destinatario_formateado

        gastos_procesados = procesar_gastos_crt_para_mic(crt.gastos)

        datos_mic = {
            "campo_1_transporte": transportadora_formateada,
            "campo_9_datos_transporte": crt.transportadora.nombre if crt.transportadora else "",
            "campo_2_numero": crt.transportadora.rol_contribuyente if crt.transportadora and crt.transportadora.rol_contribuyente else "",
            "campo_3_transporte": "",
            "campo_4_estado": "PROVISORIO",
            "campo_5_hoja": "1 / 1",
            "campo_6_fecha": crt.fecha_emision.strftime('%Y-%m-%d') if crt.fecha_emision else datetime.now().strftime('%Y-%m-%d'),
            "campo_7_pto_seguro": "",
            "campo_8_destino": crt.lugar_entrega or "",
            "campo_10_numero": crt.transportadora.rol_contribuyente if crt.transportadora and crt.transportadora.rol_contribuyente else "",
            "campo_11_placa": getattr(crt, 'placa_camion', '') or "",
            "campo_12_modelo_chasis": getattr(crt, 'marca_modelo', '') or "",
            "campo_13_siempre_45": "45 TON",
            "campo_14_anio": str(getattr(crt, 'anio_vehiculo', '')) if getattr(crt, 'anio_vehiculo', '') else "",
            "campo_15_placa_semi": getattr(crt, 'placa_semi', '') or "",
            "campo_16_asteriscos_1": "******",
            "campo_17_asteriscos_2": "******",
            "campo_18_asteriscos_3": "******",
            "campo_19_asteriscos_4": "******",
            "campo_20_asteriscos_5": "******",
            "campo_21_asteriscos_6": "******",
            "campo_22_asteriscos_7": "******",
            "campo_23_numero_campo2_crt": crt.numero_crt or "",
            "campo_24_aduana": getattr(crt, 'aduana', '') or "",
            "campo_25_moneda": crt.moneda.nombre if crt.moneda else "DOLAR AMERICANO",
            "campo_26_pais": "520-PARAGUAY",
            "campo_27_valor_campo16": crt.declaracion_mercaderia or "",
            "campo_28_total": gastos_procesados["campo_28_total"],
            "campo_29_seguro": gastos_procesados["campo_29_seguro"],
            "campo_30_tipo_bultos": getattr(crt, 'tipo_bultos', '') or "CAJAS",
            "campo_31_cantidad": str(getattr(crt, 'cantidad_bultos', '')) if getattr(crt, 'cantidad_bultos', '') else "1",
            "campo_32_peso_bruto": crt.peso_bruto or "",
            "campo_33_datos_campo1_crt": remitente_formateado,
            "campo_34_datos_campo4_crt": destinatario_formateado,
            "campo_35_datos_campo6_crt": consignatario_formateado,
            "campo_36_factura_despacho": f"{crt.factura_exportacion or ''} {crt.nro_despacho or ''}".strip(),
            "campo_37_valor_manual": crt.peso_neto or "",
            "campo_38_datos_campo11_crt": crt.detalles_mercaderia or "",
            "campo_38": crt.detalles_mercaderia or "",
            "campo_40_tramo": getattr(crt, 'tramo', '') or "",
        }

        logger.debug(
            "Prepared MIC data for CRT %s (transportadora=%s, remitente=%s, gastos=%d)",
            crt_id,
            bool(crt.transportadora),
            bool(crt.remitente),
            len(crt.gastos or []),
        )

        return jsonify(datos_mic)

    except Exception as e:
        logger.exception("Error loading CRT for MIC", extra={'crt_id': crt_id})
        return jsonify({"error": str(e)}), 500
