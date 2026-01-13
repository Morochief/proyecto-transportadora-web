from flask import Blueprint, request, jsonify
from app.models import Honorario, Transportadora, Moneda
from app import db

honorarios_bp = Blueprint('honorarios', __name__, url_prefix='/api/honorarios')

@honorarios_bp.route('/', methods=['GET'])
def listar_honorarios():
    from app.models import CRT, MIC  # Import locally to avoid circulars if any
    
    honorarios = Honorario.query.order_by(Honorario.id.desc()).all()
    resultado = []
    
    for h in honorarios:
        crt_data = h.crt
        mic_data = crt_data.mics[0] if (crt_data and crt_data.mics) else None
        
        resultado.append({
            "id": h.id,
            "codigo": h.id,
            "monto": float(h.monto),
            "transportadora_id": h.transportadora_id,
            "transportadora_nombre": h.transportadora.nombre if h.transportadora else "",
            "moneda_id": h.moneda_id,
            "moneda_nombre": h.moneda.nombre if h.moneda else "",
            "fecha": h.fecha.isoformat() if h.fecha else None,
            "descripcion": h.descripcion or "",
            
            # Datos extendidos vinculados
            # Datos extendidos (Prioridad: Campo en Honorario > Campo en RelaciÃ³n)
            # Esto permite ediciÃ³n manual que sobrescribe el dato automÃ¡tico,
            # pero sÃ­ el dato automÃ¡tico se actualiza (ej. nuevo MIC), se actualiza el campo en Honorario.
            
            "mic_numero": h.mic_numero or (mic_data.campo_23_numero_campo2_crt if mic_data else ""),
            "chofer": h.chofer or (mic_data.chofer if (mic_data and hasattr(mic_data, 'chofer')) else ""),
            "placas": h.placas or (f"{mic_data.campo_11_placa or ''} / {mic_data.campo_15_placa_semi or ''}" if mic_data else ""),
            
            "crt_numero": crt_data.numero_crt if crt_data else "N/A",
            "exportador": crt_data.remitente.nombre if (crt_data and crt_data.remitente) else "N/A",
            "importador": crt_data.destinatario.nombre if (crt_data and crt_data.destinatario) else "N/A",
        })
    return jsonify(resultado)

@honorarios_bp.route('/', methods=['POST'])
def crear_honorario():
    data = request.json
    monto = data.get('monto')
    transportadora_id = data.get('transportadora_id')
    moneda_id = data.get('moneda_id')
    if not monto or not transportadora_id or not moneda_id:
        return jsonify({"error": "Faltan campos obligatorios (monto, transportadora y moneda)"}), 400
    if not Moneda.query.get(moneda_id):
        return jsonify({"error": "Moneda no encontrada"}), 404
    honorario = Honorario(
        monto=monto,
        transportadora_id=transportadora_id,
        moneda_id=moneda_id,
        fecha=data.get('fecha'),
        descripcion=data.get('descripcion'),
        tipo_operacion=data.get('tipo_operacion', 'EXPORTACION'),
        mic_numero=data.get('mic_numero'),
        chofer=data.get('chofer'),
        placas=data.get('placas')
    )
    db.session.add(honorario)
    db.session.commit()
    return jsonify({"message": "Honorario creado", "id": honorario.id}), 201

@honorarios_bp.route('/<int:id>', methods=['PUT'])
def modificar_honorario(id):
    honorario = Honorario.query.get_or_404(id)
    data = request.json
    honorario.monto = data.get('monto', honorario.monto)
    honorario.transportadora_id = data.get('transportadora_id', honorario.transportadora_id)
    moneda_id = data.get('moneda_id', honorario.moneda_id)
    if not moneda_id or not Moneda.query.get(moneda_id):
        return jsonify({"error": "Moneda no encontrada o no definida"}), 400
    honorario.moneda_id = moneda_id
    honorario.fecha = data.get('fecha', honorario.fecha)
    honorario.descripcion = data.get('descripcion', honorario.descripcion)
    honorario.tipo_operacion = data.get('tipo_operacion', honorario.tipo_operacion)
    
    # Campos manuales opcionales
    if 'mic_numero' in data: honorario.mic_numero = data['mic_numero']
    if 'chofer' in data: honorario.chofer = data['chofer']
    if 'placas' in data: honorario.placas = data['placas']

    db.session.commit()
    return jsonify({"message": "Honorario modificado"})

@honorarios_bp.route('/<int:id>', methods=['DELETE'])
def eliminar_honorario(id):
    honorario = Honorario.query.get_or_404(id)
    db.session.delete(honorario)
    db.session.commit()
    return jsonify({"message": "Honorario eliminado"})
