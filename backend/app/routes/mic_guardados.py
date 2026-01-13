# ========== RUTAS PARA MICs GUARDADOS ==========
from flask import Blueprint, request, jsonify, send_file
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta
from app.models import db, MIC, CRT, Ciudad, Transportadora, Remitente
from app.utils.layout_mic import generar_micdta_pdf_con_datos
import tempfile
import logging
import os

logger = logging.getLogger(__name__)

# Blueprint para MICs guardados
mic_guardados_bp = Blueprint(
    'mic_guardados', __name__, url_prefix='/api/mic-guardados')

# ========== CREAR MIC Y GUARDARLO ==========


@mic_guardados_bp.route('/', methods=['POST'])
def crear_mic_guardado():
    """
    âœ… Crea un MIC completo desde datos del formulario y lo guarda en BD
    """
    try:
        data = request.json

        logger.info("Creating stored MIC")
        if logger.isEnabledFor(logging.DEBUG):
            payload_keys = sorted(data.keys()) if isinstance(data, dict) else []
            logger.debug("Payload keys: %s", payload_keys)

        # Validar campos requeridos bÃ¡sicos
        campos_requeridos = ['campo_23_numero_campo2_crt']
        for campo in campos_requeridos:
            if not data.get(campo):
                return jsonify({"error": f"Campo requerido: {campo}"}), 400

        # Auto-completar campos 16-22 con ****** si estÃ¡n vacÃ­os
        campos_asteriscos = [16, 17, 18, 19, 20, 21, 22]
        for num in campos_asteriscos:
            campo_key = f'campo_{num}_asteriscos_{num-15}'
            if not data.get(campo_key) or data.get(campo_key).strip() == "":
                data[campo_key] = "******"

        # Asegurar que campo 9 = campo 1 (datos transportadora)
        if data.get('campo_1_transporte') and not data.get('campo_9_datos_transporte'):
            data['campo_9_datos_transporte'] = data['campo_1_transporte']

        # Procesar fecha si viene como string
        fecha_emision = None
        if data.get('campo_6_fecha'):
            try:
                if isinstance(data['campo_6_fecha'], str):
                    fecha_emision = datetime.strptime(
                        data['campo_6_fecha'], '%Y-%m-%d').date()
                else:
                    fecha_emision = data['campo_6_fecha']
            except ValueError:
                fecha_emision = datetime.now().date()
        else:
            fecha_emision = datetime.now().date()

        # Crear el MIC en base de datos
        mic = MIC(
            crt_id=data.get('crt_id'),
            campo_1_transporte=data.get('campo_1_transporte', ''),
            campo_2_numero=data.get('campo_2_numero', ''),
            campo_3_transporte=data.get('campo_3_transporte', ''),
            campo_4_estado=data.get('campo_4_estado', 'PROVISORIO'),
            campo_5_hoja=data.get('campo_5_hoja', '1 / 1'),
            campo_6_fecha=fecha_emision,
            campo_7_pto_seguro=data.get('campo_7_pto_seguro', ''),
            campo_8_destino=data.get('campo_8_destino', ''),
            campo_9_datos_transporte=data.get('campo_9_datos_transporte', ''),
            campo_10_numero=data.get('campo_10_numero', ''),
            campo_11_placa=data.get('campo_11_placa', ''),
            campo_12_modelo_chasis=data.get('campo_12_modelo_chasis', ''),
            campo_13_siempre_45=data.get('campo_13_siempre_45', '45 TON'),
            campo_14_anio=data.get('campo_14_anio', ''),
            campo_15_placa_semi=data.get('campo_15_placa_semi', ''),
            campo_16_asteriscos_1=data.get('campo_16_asteriscos_1', '******'),
            campo_17_asteriscos_2=data.get('campo_17_asteriscos_2', '******'),
            campo_18_asteriscos_3=data.get('campo_18_asteriscos_3', '******'),
            campo_19_asteriscos_4=data.get('campo_19_asteriscos_4', '******'),
            campo_20_asteriscos_5=data.get('campo_20_asteriscos_5', '******'),
            campo_21_asteriscos_6=data.get('campo_21_asteriscos_6', '******'),
            campo_22_asteriscos_7=data.get('campo_22_asteriscos_7', '******'),
            campo_23_numero_campo2_crt=data.get(
                'campo_23_numero_campo2_crt', ''),
            campo_24_aduana=data.get('campo_24_aduana', ''),
            campo_25_moneda=data.get('campo_25_moneda', ''),
            campo_26_pais=data.get('campo_26_pais', '520-PARAGUAY'),
            campo_27_valor_campo16=data.get('campo_27_valor_campo16', ''),
            campo_28_total=data.get('campo_28_total', ''),
            campo_29_seguro=data.get('campo_29_seguro', ''),
            campo_30_tipo_bultos=data.get('campo_30_tipo_bultos', ''),
            campo_31_cantidad=data.get('campo_31_cantidad', ''),
            campo_32_peso_bruto=data.get('campo_32_peso_bruto', ''),
            campo_33_datos_campo1_crt=data.get(
                'campo_33_datos_campo1_crt', ''),
            campo_34_datos_campo4_crt=data.get(
                'campo_34_datos_campo4_crt', ''),
            campo_35_datos_campo6_crt=data.get(
                'campo_35_datos_campo6_crt', ''),
            campo_36_factura_despacho=data.get(
                'campo_36_factura_despacho', ''),
            campo_37_valor_manual=data.get('campo_37_valor_manual', ''),
            campo_38_datos_campo11_crt=data.get(
                'campo_38_datos_campo11_crt', ''),
            campo_40_tramo=data.get('campo_40_tramo', ''),
            chofer=data.get('chofer', ''),
            creado_en=datetime.now()
        )

        db.session.add(mic)
        db.session.commit()
        
        # Verificar y crear honorario automÃ¡ticamente
        verificar_crear_honorario(mic)

        return jsonify({
            "message": "MIC creado y guardado exitosamente",
            "id": mic.id,
            "numero_carta_porte": mic.campo_23_numero_campo2_crt,
            "estado": mic.campo_4_estado,
            "fecha_creacion": mic.creado_en.strftime('%Y-%m-%d %H:%M:%S'),
            "pdf_url": f"/mic-guardados/{mic.id}/pdf"
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.exception("Error creating stored MIC")
        return jsonify({"error": str(e)}), 500

def verificar_crear_honorario(mic):
    """
    ACTUALIZADO: Ahora busca el honorario existente (creado por el CRT) 
    y actualiza los datos del MIC (Placa, Chofer, NÃºmero).
    Si no existe, lo crea (fallback).
    """
    try:
        from app.models import Honorario, Transportadora, CRT
        
        if not mic.crt_id:
            return
            
        # Verificar si ya existe honorario para este CRT
        honorario = Honorario.query.filter_by(crt_id=mic.crt_id).first()
        
        # Datos del MIC para actualizar
        placas = f"{mic.campo_11_placa or ''} / {mic.campo_15_placa_semi or ''}"
        
        if honorario:
            # Actualizar existente
            honorario.mic_numero = mic.campo_23_numero_campo2_crt
            honorario.chofer = mic.chofer
            honorario.placas = placas
            # Nota: Si el usuario ya editÃ³ manualmente estos campos, esto los sobreescribirÃ¡ ?
            # Requerimiento: "AUTOCOMPLETADO". Asumimos que la generaciÃ³n de MIC manda sobre lo manual previo.
            db.session.commit()
            logger.info(f"Honorario updated for CRT {mic.crt_id} with MIC data")
            return

        # Si NO existe, aplicar lÃ³gica de creaciÃ³n (Fallback)
        # Cargar CRT y Transportadora
        crt = CRT.query.get(mic.crt_id)
        if not crt or not crt.transportadora_id:
            return
            
        transp = Transportadora.query.get(crt.transportadora_id)
        if not transp or not transp.honorarios:
            return
            
        # Crear Honorario
        nuevo_honorario = Honorario(
            descripcion=f"Honorarios CRT {crt.numero_crt} / MIC {mic.campo_23_numero_campo2_crt}",
            monto=transp.honorarios,
            transportadora_id=transp.id,
            moneda_id=transp.moneda_honorarios_id or 1,
            fecha=datetime.now().date(),
            crt_id=crt.id,
            mic_numero=mic.campo_23_numero_campo2_crt,
            chofer=mic.chofer,
            placas=placas
        )
        db.session.add(nuevo_honorario)
        db.session.commit()
        logger.info(f"Honorario auto-created (fallback) for CRT {crt.numero_crt}")
        
    except Exception as e:
        logger.error(f"Error auto-updating/creating honorario: {e}")

# ========== LISTAR MICs GUARDADOS ==========


@mic_guardados_bp.route('/', methods=['GET'])
def listar_mics_guardados():
    """
    âœ… Lista todos los MICs guardados con paginaciÃ³n y filtros
    """
    try:
        # ParÃ¡metros de consulta
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get(
            'per_page', 20, type=int), 100)  # MÃ¡ximo 100
        estado = request.args.get('estado', '').strip()
        numero_carta = request.args.get('numero_carta', '').strip()
        fecha_desde = request.args.get('fecha_desde', '').strip()
        fecha_hasta = request.args.get('fecha_hasta', '').strip()

        logger.info("Listing stored MICs", extra={'page': page, 'per_page': per_page})
        if logger.isEnabledFor(logging.DEBUG):
            logger.debug("Filters -> estado=%s numero=%s fecha_desde=%s fecha_hasta=%s", estado, numero_carta, fecha_desde, fecha_hasta)

        # Construir query base
        query = MIC.query.options(joinedload(MIC.crt))

        # Aplicar filtros
        if estado:
            query = query.filter(MIC.campo_4_estado.ilike(f'%{estado}%'))

        if numero_carta:
            query = query.filter(
                MIC.campo_23_numero_campo2_crt.ilike(f'%{numero_carta}%'))

        if fecha_desde:
            try:
                fecha_desde_dt = datetime.strptime(
                    fecha_desde, '%Y-%m-%d').date()
                query = query.filter(MIC.campo_6_fecha >= fecha_desde_dt)
            except ValueError:
                pass

        if fecha_hasta:
            try:
                fecha_hasta_dt = datetime.strptime(
                    fecha_hasta, '%Y-%m-%d').date()
                query = query.filter(MIC.campo_6_fecha <= fecha_hasta_dt)
            except ValueError:
                pass

        # Ordenar por fecha de creaciÃ³n (mÃ¡s recientes primero)
        query = query.order_by(MIC.id.desc())

        # Paginar
        mics_paginados = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Formatear resultados
        mics_data = []
        for mic in mics_paginados.items:
            mic_data = {
                "id": mic.id,
                "crt_id": mic.crt_id,
                "numero_carta_porte": mic.campo_23_numero_campo2_crt,
                "estado": mic.campo_4_estado,
                "fecha_emision": mic.campo_6_fecha.strftime('%Y-%m-%d') if mic.campo_6_fecha else "",
                "transportadora": mic.campo_1_transporte[:100] + "..." if len(mic.campo_1_transporte or "") > 100 else (mic.campo_1_transporte or ""),
                "destino": mic.campo_8_destino or "",
                "placa_camion": mic.campo_11_placa or "",
                "peso_bruto": str(mic.campo_32_peso_bruto or ""),
                "moneda": mic.campo_25_moneda or "",
                "creado_en": mic.creado_en.strftime('%Y-%m-%d %H:%M:%S') if mic.creado_en else "",
                "crt_numero": mic.crt.numero_crt if mic.crt else "N/A"
            }
            mics_data.append(mic_data)

        resultado = {
            "mics": mics_data,
            "pagination": {
                "page": mics_paginados.page,
                "pages": mics_paginados.pages,
                "per_page": mics_paginados.per_page,
                "total": mics_paginados.total,
                "has_next": mics_paginados.has_next,
                "has_prev": mics_paginados.has_prev
            },
            "filtros_aplicados": {
                "estado": estado,
                "numero_carta": numero_carta,
                "fecha_desde": fecha_desde,
                "fecha_hasta": fecha_hasta
            }
        }

        logger.debug("Listing MICs page=%s total=%s", resultado['pagination']['page'], resultado['pagination']['total'])
        return jsonify(resultado)

    except Exception as e:
        logger.exception("Error listing stored MICs")
        return jsonify({"error": str(e)}), 500

# ========== OBTENER MIC POR ID ==========


@mic_guardados_bp.route('/<int:mic_id>', methods=['GET'])
def obtener_mic_por_id(mic_id):
    """
    âœ… Obtiene un MIC especÃ­fico por ID con todos sus datos
    """
    try:
        logger.info("Fetching stored MIC", extra={'mic_id': mic_id})

        mic = MIC.query.options(joinedload(MIC.crt)).get_or_404(mic_id)

        # FunciÃ³n helper para convertir a string seguro
        def safe_str(val):
            return "" if val is None else str(val)

        mic_data = {
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
            "chofer": safe_str(mic.chofer),
            "creado_en": mic.creado_en.strftime('%Y-%m-%d %H:%M:%S') if mic.creado_en else "",
            "crt_numero": mic.crt.numero_crt if mic.crt else "N/A"
        }

        return jsonify(mic_data)

    except Exception as e:
        logger.exception("Error fetching stored MIC", extra={'mic_id': mic_id})
        return jsonify({"error": str(e)}), 404

# ========== ACTUALIZAR MIC ==========


@mic_guardados_bp.route('/<int:mic_id>', methods=['PUT'])
def actualizar_mic(mic_id):
    """
    âœ… Actualiza un MIC existente
    """
    try:
        logger.info("Marking stored MIC as void", extra={'mic_id': mic_id})

        mic = MIC.query.get_or_404(mic_id)
        data = request.json

        logger.info("Updating stored MIC", extra={'mic_id': mic_id})
        if logger.isEnabledFor(logging.DEBUG):
            logger.debug("Payload keys: %s", sorted(data.keys()) if isinstance(data, dict) else [])

        # Actualizar campos permitidos
        campos_actualizables = [
            'campo_1_transporte', 'campo_2_numero', 'campo_3_transporte', 'campo_4_estado',
            'campo_5_hoja', 'campo_6_fecha', 'campo_7_pto_seguro', 'campo_8_destino',
            'campo_9_datos_transporte', 'campo_10_numero', 'campo_11_placa', 'campo_12_modelo_chasis',
            'campo_13_siempre_45', 'campo_14_anio', 'campo_15_placa_semi', 'campo_16_asteriscos_1',
            'campo_17_asteriscos_2', 'campo_18_asteriscos_3', 'campo_19_asteriscos_4', 'campo_20_asteriscos_5',
            'campo_21_asteriscos_6', 'campo_22_asteriscos_7', 'campo_23_numero_campo2_crt', 'campo_24_aduana',
            'campo_25_moneda', 'campo_26_pais', 'campo_27_valor_campo16', 'campo_28_total',
            'campo_29_seguro', 'campo_30_tipo_bultos', 'campo_31_cantidad', 'campo_32_peso_bruto',
            'campo_33_datos_campo1_crt', 'campo_34_datos_campo4_crt', 'campo_35_datos_campo6_crt',
            'campo_36_factura_despacho', 'campo_37_valor_manual', 'campo_38_datos_campo11_crt', 'campo_40_tramo',
            'chofer'
        ]

        campos_actualizados = []
        for campo in campos_actualizables:
            if campo in data:
                if campo == 'campo_6_fecha' and data[campo]:
                    # Procesar fecha especialmente
                    try:
                        if isinstance(data[campo], str):
                            setattr(mic, campo, datetime.strptime(
                                data[campo], '%Y-%m-%d').date())
                        else:
                            setattr(mic, campo, data[campo])
                    except ValueError:
                        continue
                else:
                    setattr(mic, campo, data[campo])
                campos_actualizados.append(campo)

        # Asegurar que campo 9 = campo 1 si se actualiza campo 1
        if 'campo_1_transporte' in data and not data.get('campo_9_datos_transporte'):
            mic.campo_9_datos_transporte = data['campo_1_transporte']
            if 'campo_9_datos_transporte' not in campos_actualizados:
                campos_actualizados.append('campo_9_datos_transporte')

        db.session.commit()
        
        # Verificar y crear honorario automÃ¡ticamente
        verificar_crear_honorario(mic)

        return jsonify({
            "message": "MIC actualizado exitosamente",
            "id": mic.id,
            "campos_actualizados": campos_actualizados,
            "numero_carta_porte": mic.campo_23_numero_campo2_crt,
            "estado": mic.campo_4_estado
        })

    except Exception as e:
        db.session.rollback()
        logger.exception("Error updating stored MIC", extra={'mic_id': mic_id})
        return jsonify({"error": str(e)}), 500

# ========== ELIMINAR MIC ==========


@mic_guardados_bp.route('/<int:mic_id>', methods=['DELETE'])
def eliminar_mic(mic_id):
    """
    âœ… Elimina un MIC (opcional: soft delete o hard delete)
    Param: ?hard_delete=true para eliminar fÃ­sicamente.
    """
    try:
        mic = MIC.query.get_or_404(mic_id)
        numero_carta = mic.campo_23_numero_campo2_crt
        
        hard_delete = request.args.get('hard_delete', 'false').lower() == 'true'

        if hard_delete:
            # Eliminar fÃ­sicamente
            db.session.delete(mic)
            mensaje = "MIC eliminado definitivamente"
            estado_final = "ELIMINADO"
        else:
            # Soft delete: cambiar estado a ANULADO
            mic.campo_4_estado = "ANULADO"
            mensaje = "MIC anulado exitosamente"
            estado_final = "ANULADO"

        db.session.commit()

        return jsonify({
            "message": mensaje,
            "id": mic_id,
            "numero_carta_porte": numero_carta,
            "estado": estado_final
        })

    except Exception as e:
        db.session.rollback()
        logger.exception("Error deleting/annulling stored MIC", extra={'mic_id': mic_id})
        return jsonify({"error": str(e)}), 500


# ========== RESTAURAR MIC ==========


@mic_guardados_bp.route('/<int:mic_id>/restaurar', methods=['POST'])
def restaurar_mic(mic_id):
    """
    âœ… Restaura un MIC anulado (cambia estado a PROVISORIO)
    """
    try:
        mic = MIC.query.get_or_404(mic_id)
        
        if mic.campo_4_estado != "ANULADO":
             return jsonify({"error": "Solo se pueden restaurar MICs anulados"}), 400

        mic.campo_4_estado = "PROVISORIO"
        db.session.commit()

        return jsonify({
            "message": "MIC restaurado exitosamente",
            "id": mic.id,
            "numero_carta_porte": mic.campo_23_numero_campo2_crt,
            "estado": "PROVISORIO"
        })

    except Exception as e:
        db.session.rollback()
        logger.exception("Error restoring stored MIC", extra={'mic_id': mic_id})
        return jsonify({"error": str(e)}), 500


# ========== GENERAR PDF DESDE MIC GUARDADO ==========


@mic_guardados_bp.route('/<int:mic_id>/pdf', methods=['GET'])
def generar_pdf_mic_guardado(mic_id):
    """
    âœ… Genera PDF de un MIC guardado
    """
    try:
        logger.info("Generating stored MIC PDF", extra={'mic_id': mic_id})

        mic = MIC.query.get_or_404(mic_id)

        # Convertir MIC a dict para el generador de PDF
        def safe_str(val):
            return "" if val is None else str(val)

        mic_data = {
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
            "campo_40_tramo": safe_str(mic.campo_40_tramo) + (f"\nCHOFER: {mic.chofer}" if mic.chofer else "")
        }

        # Generar archivo temporal
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            filename = tmp_file.name

        generar_micdta_pdf_con_datos(mic_data, filename)

        # Función para sanitizar nombres de archivo
        def sanitize_filename(text):
            if not text:
                return "N-A"
            # Tomar solo primeras palabras si es muy largo
            text = str(text).strip()
            if len(text) > 50:
                text = text[:50]
            # Eliminar caracteres inválidos
            import re
            text = re.sub(r'[<>:"/\\|?*\n\r]', '', text)
            text = text.replace('  ', ' ').strip()
            return text or "N-A"

        # Formato: [Transportadora] - [Nº CRT] - [Exportador] - [Importador]
        transportadora = sanitize_filename(mic.campo_1_transporte)
        numero_crt = sanitize_filename(mic.campo_23_numero_campo2_crt) or f"MIC-{mic.id}"
        exportador = sanitize_filename(mic.campo_33_datos_campo1_crt)
        importador = sanitize_filename(mic.campo_34_datos_campo4_crt)
        
        download_name = f"{transportadora} - {numero_crt} - {exportador} - {importador}.pdf"
        logger.debug("Sending stored MIC PDF %s", download_name)

        response = send_file(
            filename,
            as_attachment=not request.args.get('inline', 'false').lower() == 'true',
            download_name=download_name,
            mimetype='application/pdf'
        )

        # Limpiar archivo temporal despuÃ©s de enviarlo
        response.call_on_close(lambda: os.unlink(filename))

        return response

    except Exception as e:
        logger.exception("Error generating stored MIC PDF", extra={'mic_id': mic_id})
        return jsonify({"error": str(e)}), 500

# ========== ESTADÃSTICAS ==========


@mic_guardados_bp.route('/stats', methods=['GET'])
def obtener_estadisticas():
    """Obtiene estadisticas generales de MICs guardados."""
    try:
        logger.info("Fetching stored MIC statistics")

        now = datetime.now()
        today_start = datetime.combine(now.date(), datetime.min.time())
        tomorrow_start = today_start + timedelta(days=1)
        week_ago = now - timedelta(days=7)
        six_months_ago = now - timedelta(days=180)

        stats_estado = (
            db.session.query(
                MIC.campo_4_estado,
                db.func.count(MIC.id).label('cantidad')
            )
            .group_by(MIC.campo_4_estado)
            .all()
        )

        total_mics = MIC.query.count()

        mics_hoy = (
            MIC.query
            .filter(MIC.creado_en >= today_start, MIC.creado_en < tomorrow_start)
            .count()
        )

        mics_semana = MIC.query.filter(MIC.creado_en >= week_ago).count()

        mics_recientes = MIC.query.filter(MIC.creado_en >= six_months_ago).all()
        stats_por_mes = {}
        for mic in mics_recientes:
            if mic.creado_en:
                mes_clave = mic.creado_en.strftime('%Y-%m')
                stats_por_mes[mes_clave] = stats_por_mes.get(mes_clave, 0) + 1

        por_mes = [
            {'mes': mes, 'cantidad': stats_por_mes[mes]}
            for mes in sorted(stats_por_mes.keys())
        ]

        resultado = {
            'total_mics': total_mics,
            'mics_hoy': mics_hoy,
            'mics_semana': mics_semana,
            'por_estado': [
                {'estado': estado, 'cantidad': cantidad}
                for estado, cantidad in stats_estado
            ],
            'por_mes': por_mes
        }

        logger.debug("Stats summary: total=%s hoy=%s semana=%s", total_mics, mics_hoy, mics_semana)

        return jsonify(resultado)

    except Exception as e:
        logger.exception("Error fetching stored MIC statistics")
        return jsonify({'error': str(e)}), 500
@mic_guardados_bp.route('/search', methods=['POST'])
def busqueda_avanzada():
    """
    âœ… BÃºsqueda avanzada de MICs con mÃºltiples criterios
    """
    try:
        data = request.json

        logger.info("Searching stored MICs")
        if logger.isEnabledFor(logging.DEBUG):
            logger.debug("Search criteria: %s", data)

        query = MIC.query.options(joinedload(MIC.crt))

        # Aplicar filtros dinÃ¡micos
        if data.get('numero_carta'):
            query = query.filter(MIC.campo_23_numero_campo2_crt.ilike(
                f"%{data['numero_carta']}%"))

        if data.get('transportadora'):
            query = query.filter(MIC.campo_1_transporte.ilike(
                f"%{data['transportadora']}%"))

        if data.get('placa'):
            query = query.filter(
                MIC.campo_11_placa.ilike(f"%{data['placa']}%"))

        if data.get('estado'):
            query = query.filter(MIC.campo_4_estado == data['estado'])

        if data.get('destino'):
            query = query.filter(
                MIC.campo_8_destino.ilike(f"%{data['destino']}%"))

        if data.get('fecha_desde'):
            try:
                fecha_desde = datetime.strptime(
                    data['fecha_desde'], '%Y-%m-%d').date()
                query = query.filter(MIC.campo_6_fecha >= fecha_desde)
            except ValueError:
                pass

        if data.get('fecha_hasta'):
            try:
                fecha_hasta = datetime.strptime(
                    data['fecha_hasta'], '%Y-%m-%d').date()
                query = query.filter(MIC.campo_6_fecha <= fecha_hasta)
            except ValueError:
                pass

        if data.get('peso_min'):
            try:
                peso_min = float(data['peso_min'])
                query = query.filter(MIC.campo_32_peso_bruto >= peso_min)
            except (ValueError, TypeError):
                pass

        if data.get('peso_max'):
            try:
                peso_max = float(data['peso_max'])
                query = query.filter(MIC.campo_32_peso_bruto <= peso_max)
            except (ValueError, TypeError):
                pass

        # Ordenamiento
        orden = data.get('orden', 'fecha_desc')
        if orden == 'fecha_asc':
            query = query.order_by(MIC.campo_6_fecha.asc())
        elif orden == 'fecha_desc':
            query = query.order_by(MIC.campo_6_fecha.desc())
        elif orden == 'numero_asc':
            query = query.order_by(MIC.campo_23_numero_campo2_crt.asc())
        elif orden == 'numero_desc':
            query = query.order_by(MIC.campo_23_numero_campo2_crt.desc())
        else:
            query = query.order_by(MIC.id.desc())

        # PaginaciÃ³n
        page = data.get('page', 1)
        per_page = min(data.get('per_page', 20), 100)

        mics_paginados = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Formatear resultados
        mics_data = []
        for mic in mics_paginados.items:
            mic_data = {
                "id": mic.id,
                "numero_carta_porte": mic.campo_23_numero_campo2_crt,
                "estado": mic.campo_4_estado,
                "fecha_emision": mic.campo_6_fecha.strftime('%Y-%m-%d') if mic.campo_6_fecha else "",
                "transportadora": (mic.campo_1_transporte or "")[:100],
                "destino": mic.campo_8_destino or "",
                "placa_camion": mic.campo_11_placa or "",
                "peso_bruto": str(mic.campo_32_peso_bruto or ""),
                "moneda": mic.campo_25_moneda or "",
                "creado_en": mic.creado_en.strftime('%Y-%m-%d %H:%M:%S') if mic.creado_en else ""
            }
            mics_data.append(mic_data)

        resultado = {
            "mics": mics_data,
            "pagination": {
                "page": mics_paginados.page,
                "pages": mics_paginados.pages,
                "per_page": mics_paginados.per_page,
                "total": mics_paginados.total,
                "has_next": mics_paginados.has_next,
                "has_prev": mics_paginados.has_prev
            },
            "criterios_busqueda": data
        }

        return jsonify(resultado)

    except Exception as e:
        logger.exception("Error searching stored MICs")
        return jsonify({"error": str(e)}), 500

# ========== CREAR DESDE CRT Y GUARDAR ==========



@mic_guardados_bp.route('/crear-desde-crt/<int:crt_id>', methods=['POST'])
def crear_mic_desde_crt_y_guardar(crt_id):
    """
    âœ… Crea un MIC desde un CRT, permite ediciÃ³n y lo guarda en BD
    """
    try:
        logger.info("Creating stored MIC from CRT", extra={'crt_id': crt_id})
        user_data = request.json if request.is_json else {}


        # Reutilizar la lÃ³gica existente del mÃ³dulo MIC
        from app.routes.mic import formatear_entidad_completa_crt, procesar_gastos_crt_para_mic
        from sqlalchemy.orm import joinedload

        # Cargar CRT con todas las relaciones
        crt = CRT.query.options(
            joinedload(CRT.remitente).joinedload(Remitente.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.transportadora).joinedload(Transportadora.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.destinatario).joinedload(Remitente.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.consignatario).joinedload(Remitente.ciudad).joinedload(Ciudad.pais),
            joinedload(CRT.moneda),
            joinedload(CRT.gastos),
            joinedload(CRT.ciudad_emision).joinedload(Ciudad.pais)
        ).get_or_404(crt_id)

        # Formatear entidades completas
        campo_1_transportadora = formatear_entidad_completa_crt(
            crt.transportadora)
        campo_33_remitente = formatear_entidad_completa_crt(crt.remitente)
        campo_34_destinatario = formatear_entidad_completa_crt(
            crt.destinatario)
        campo_35_consignatario = formatear_entidad_completa_crt(
            crt.consignatario) if crt.consignatario else campo_34_destinatario

        # Procesar gastos
        gastos_procesados = procesar_gastos_crt_para_mic(crt.gastos)

        # Helper para limpiar decimales (1.200,50 -> 1200.50)
        def clean_decimal(val):
            if not val:
                return 0.0
            if isinstance(val, (int, float)):
                return float(val)
            try:
                # Si es string, limpiamos posibles formatos
                val_str = str(val).strip()
                # Caso "1.200,50" (Europeo/Sudamericano)
                if ',' in val_str and '.' in val_str:
                     # Asumimos que el punto es miles y la coma decimal si ambos estÃ¡n
                     # Ojo: podrÃ­a ser al revÃ©s "1,200.50".
                     # Simple heurÃ­stica: el Ãºltimo separador es el decimal.
                     last_comma = val_str.rfind(',')
                     last_dot = val_str.rfind('.')
                     if last_comma > last_dot: 
                         # Caso 1.200,50 -> Quitamos puntos, reemplazamos coma
                         val_str = val_str.replace('.', '').replace(',', '.')
                     else:
                         # Caso 1,200.50 -> Quitamos comas
                         val_str = val_str.replace(',', '')
                elif ',' in val_str:
                    # Caso "1200,50" o "1,200"
                    # Si tiene mÃ¡s de una coma, es separador de miles (inexacto pero comÃºn)
                    if val_str.count(',') > 1:
                        val_str = val_str.replace(',', '')
                    else:
                        val_str = val_str.replace(',', '.')
                elif '.' in val_str:
                    # Caso "1200.50" -> OK
                    pass
                
                return float(val_str)
            except ValueError:
                return 0.0

        # Construir datos base del MIC
        mic_data_base = {
            "crt_id": crt.id,
            "campo_1_transporte": campo_1_transportadora,
            "campo_9_datos_transporte": campo_1_transportadora,
            "campo_33_datos_campo1_crt": campo_33_remitente,
            "campo_34_datos_campo4_crt": campo_34_destinatario,
            "campo_35_datos_campo6_crt": campo_35_consignatario,
            "campo_28_total": clean_decimal(gastos_procesados["campo_28_total"]),
            "campo_29_seguro": clean_decimal(gastos_procesados["campo_29_seguro"]),
            "campo_2_numero": "",
            "campo_3_transporte": "",
            "campo_4_estado": "PROVISORIO",
            "campo_5_hoja": "1 / 1",
            "campo_6_fecha": crt.fecha_emision.strftime('%Y-%m-%d') if crt.fecha_emision else datetime.now().strftime('%Y-%m-%d'),
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
            "campo_27_valor_campo16": clean_decimal(crt.declaracion_mercaderia),
            "campo_30_tipo_bultos": "",
            "campo_31_cantidad": clean_decimal(getattr(crt, 'cantidad_bultos', 0)),
            "campo_32_peso_bruto": str(crt.peso_bruto or ""),
            "campo_36_factura_despacho": (
                f"Factura: {crt.factura_exportacion or ''} | Despacho: {crt.nro_despacho or ''}"
                if crt.factura_exportacion or crt.nro_despacho else ""
            ),
            "campo_37_valor_manual": 0.0,
            "campo_38_datos_campo11_crt": (crt.detalles_mercaderia or "")[:1500],
            "campo_40_tramo": "",
        }

        # Aplicar datos del usuario (sobrescribir campos base si se proporcionan)
        mic_data_final = {**mic_data_base, **user_data}
        
        # Limpiar numÃ©ricos en user_data si vinieron
        if 'campo_27_valor_campo16' in user_data: mic_data_final['campo_27_valor_campo16'] = clean_decimal(user_data['campo_27_valor_campo16'])
        if 'campo_28_total' in user_data: mic_data_final['campo_28_total'] = clean_decimal(user_data['campo_28_total'])
        if 'campo_29_seguro' in user_data: mic_data_final['campo_29_seguro'] = clean_decimal(user_data['campo_29_seguro'])
        if 'campo_31_cantidad' in user_data: mic_data_final['campo_31_cantidad'] = clean_decimal(user_data['campo_31_cantidad'])
        if 'campo_37_valor_manual' in user_data: mic_data_final['campo_37_valor_manual'] = clean_decimal(user_data['campo_37_valor_manual'])

        # Procesar fecha
        fecha_emision = None
        if mic_data_final.get('campo_6_fecha'):
            try:
                if isinstance(mic_data_final['campo_6_fecha'], str):
                    fecha_emision = datetime.strptime(
                        mic_data_final['campo_6_fecha'], '%Y-%m-%d').date()
                else:
                    fecha_emision = mic_data_final['campo_6_fecha']
            except ValueError:
                fecha_emision = datetime.now().date()
        else:
            fecha_emision = datetime.now().date()

        # Crear MIC en base de datos
        mic = MIC(
            crt_id=crt.id,
            campo_1_transporte=mic_data_final.get('campo_1_transporte', ''),
            campo_2_numero=mic_data_final.get('campo_2_numero', ''),
            campo_3_transporte=mic_data_final.get('campo_3_transporte', ''),
            campo_4_estado=mic_data_final.get('campo_4_estado', 'PROVISORIO'),
            campo_5_hoja=mic_data_final.get('campo_5_hoja', '1 / 1'),
            campo_6_fecha=fecha_emision,
            campo_7_pto_seguro=mic_data_final.get('campo_7_pto_seguro', ''),
            campo_8_destino=mic_data_final.get('campo_8_destino', ''),
            campo_9_datos_transporte=mic_data_final.get(
                'campo_9_datos_transporte', ''),
            campo_10_numero=mic_data_final.get('campo_10_numero', ''),
            campo_11_placa=mic_data_final.get('campo_11_placa', ''),
            campo_12_modelo_chasis=mic_data_final.get(
                'campo_12_modelo_chasis', ''),
            campo_13_siempre_45=mic_data_final.get(
                'campo_13_siempre_45', '45 TON'),
            campo_14_anio=mic_data_final.get('campo_14_anio', ''),
            campo_15_placa_semi=mic_data_final.get('campo_15_placa_semi', ''),
            campo_16_asteriscos_1=mic_data_final.get(
                'campo_16_asteriscos_1', '******'),
            campo_17_asteriscos_2=mic_data_final.get(
                'campo_17_asteriscos_2', '******'),
            campo_18_asteriscos_3=mic_data_final.get(
                'campo_18_asteriscos_3', '******'),
            campo_19_asteriscos_4=mic_data_final.get(
                'campo_19_asteriscos_4', '******'),
            campo_20_asteriscos_5=mic_data_final.get(
                'campo_20_asteriscos_5', '******'),
            campo_21_asteriscos_6=mic_data_final.get(
                'campo_21_asteriscos_6', '******'),
            campo_22_asteriscos_7=mic_data_final.get(
                'campo_22_asteriscos_7', '******'),
            campo_23_numero_campo2_crt=mic_data_final.get(
                'campo_23_numero_campo2_crt', ''),
            campo_24_aduana=mic_data_final.get('campo_24_aduana', ''),
            campo_25_moneda=mic_data_final.get('campo_25_moneda', ''),
            campo_26_pais=mic_data_final.get('campo_26_pais', '520-PARAGUAY'),
            campo_27_valor_campo16=mic_data_final.get(
                'campo_27_valor_campo16', 0.0),
            campo_28_total=mic_data_final.get('campo_28_total', 0.0),
            campo_29_seguro=mic_data_final.get('campo_29_seguro', 0.0),
            campo_30_tipo_bultos=mic_data_final.get(
                'campo_30_tipo_bultos', ''),
            campo_31_cantidad=mic_data_final.get('campo_31_cantidad', 0.0),
            campo_32_peso_bruto=mic_data_final.get('campo_32_peso_bruto', ''),
            campo_33_datos_campo1_crt=mic_data_final.get(
                'campo_33_datos_campo1_crt', ''),
            campo_34_datos_campo4_crt=mic_data_final.get(
                'campo_34_datos_campo4_crt', ''),
            campo_35_datos_campo6_crt=mic_data_final.get(
                'campo_35_datos_campo6_crt', ''),
            campo_36_factura_despacho=mic_data_final.get(
                'campo_36_factura_despacho', ''),
            campo_37_valor_manual=mic_data_final.get(
                'campo_37_valor_manual', 0.0),
            campo_38_datos_campo11_crt=mic_data_final.get(
                'campo_38_datos_campo11_crt', ''),
            campo_40_tramo=mic_data_final.get('campo_40_tramo', ''),
            chofer=mic_data_final.get('chofer', ''),
            creado_en=datetime.now()
        )
        
        db.session.add(mic)
        db.session.commit()
        
        # Verificar y crear honorario automÃ¡ticamente
        verificar_crear_honorario(mic)

        return jsonify({
            "message": "MIC creado desde CRT y guardado exitosamente",
            "id": mic.id,
            "crt_id": crt.id,
            "crt_numero": crt.numero_crt,
            "numero_carta_porte": mic.campo_23_numero_campo2_crt,
            "estado": mic.campo_4_estado,
            "fecha_creacion": mic.creado_en.strftime('%Y-%m-%d %H:%M:%S'),
            "gastos_procesados": {
                "flete": mic_data_final.get('campo_28_total', ''),
                "seguro": mic_data_final.get('campo_29_seguro', '')
            },
            "pdf_url": f"/mic-guardados/{mic.id}/pdf"
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

