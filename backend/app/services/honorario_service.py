import logging
from datetime import datetime
from app import db
from app.models import Honorario, Transportadora, CRT

logger = logging.getLogger(__name__)

def crear_honorario_desde_crt(crt):
    """
    Crea automáticamente un honorario para el CRT recién creado.
    Asigna monto de la transportadora vinculada y campos básicos.
    """
    try:
        existe = Honorario.query.filter_by(crt_id=crt.id).first()
        if existe:
            return

        if not crt.transportadora or not crt.transportadora.honorarios:
            logger.warning(f"CRT {crt.id} no tiene transportadora o transportadora sin honorarios definidos. No se crea honorario auto.")
            return

        nuevo_honorario = Honorario(
            descripcion=f"Honorarios CRT {crt.numero_crt}",
            monto=crt.transportadora.honorarios,
            transportadora_id=crt.transportadora.id,
            moneda_id=crt.transportadora.moneda_honorarios_id or 1,
            fecha=datetime.now().date(),
            crt_id=crt.id,
            tipo_operacion='EXPORTACION'
        )
        db.session.add(nuevo_honorario)
        db.session.commit()
        logger.info(f"Honorario auto-generated for CRT {crt.numero_crt}")
        
    except Exception as e:
        logger.error(f"Error auto-generating honorario for CRT {crt.id}: {e}")

def verificar_crear_honorario(mic):
    """
    Busca el honorario existente (creado por el CRT) 
    y actualiza los datos del MIC (Placa, Chofer, Número).
    Si no existe, lo crea (fallback).
    """
    try:
        if not mic.crt_id:
            return
            
        honorario = Honorario.query.filter_by(crt_id=mic.crt_id).first()
        
        placas = f"{mic.campo_11_placa or ''} / {mic.campo_15_placa_semi or ''}"
        
        if honorario:
            honorario.mic_numero = mic.campo_23_numero_campo2_crt
            honorario.chofer = mic.chofer
            honorario.placas = placas
            db.session.commit()
            logger.info(f"Honorario updated for CRT {mic.crt_id} with MIC data")
            return

        crt = CRT.query.get(mic.crt_id)
        if not crt or not crt.transportadora_id:
            return
            
        transp = Transportadora.query.get(crt.transportadora_id)
        if not transp or not transp.honorarios:
            return
            
        nuevo_honorario = Honorario(
            descripcion=f"Honorarios CRT {crt.numero_crt} / MIC {mic.campo_23_numero_campo2_crt}",
            monto=transp.honorarios,
            transportadora_id=transp.id,
            moneda_id=transp.moneda_honorarios_id or 1,
            fecha=datetime.now().date(),
            crt_id=crt.id,
            mic_numero=mic.campo_23_numero_campo2_crt,
            chofer=mic.chofer,
            placas=placas,
            tipo_operacion='EXPORTACION'
        )
        db.session.add(nuevo_honorario)
        db.session.commit()
        logger.info(f"Honorario auto-created (fallback) for CRT {crt.numero_crt}")
        
    except Exception as e:
        logger.error(f"Error auto-updating/creating honorario: {e}")
