from flask import Blueprint, request, jsonify
from app.models import Honorario, Transportadora, Moneda
from app import db
from app.security.decorators import verify_authentication

honorarios_bp = Blueprint('honorarios', __name__, url_prefix='/api/honorarios')
honorarios_bp.before_request(verify_authentication)

@honorarios_bp.route('/', methods=['GET'])
def listar_honorarios():
    from app.models import CRT, MIC
    
    # Parámetros de paginación
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 15, type=int)
    
    # Filtros
    search = request.args.get('search', '', type=str)
    tipo_operacion = request.args.get('tipo_operacion', '', type=str)
    transportadora_id = request.args.get('transportadora_id', type=int)
    
    # Query base
    query = Honorario.query
    
    # Aplicar filtros
    if tipo_operacion:
        query = query.filter(Honorario.tipo_operacion == tipo_operacion)
    if transportadora_id:
        query = query.filter(Honorario.transportadora_id == transportadora_id)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            db.or_(
                Honorario.descripcion.ilike(search_term),
                Honorario.mic_numero.ilike(search_term),
                Honorario.chofer.ilike(search_term),
                Honorario.observaciones.ilike(search_term)
            )
        )
    
    # Ordenar y paginar
    query = query.order_by(Honorario.id.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    
    resultado = []
    for h in paginated.items:
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
            "tipo_operacion": h.tipo_operacion or "EXPORTACION",
            "observaciones": h.observaciones or "",
            "mic_numero": h.mic_numero or (mic_data.campo_23_numero_campo2_crt if mic_data else ""),
            "chofer": h.chofer or (mic_data.chofer if (mic_data and hasattr(mic_data, 'chofer')) else ""),
            "placas": h.placas or (f"{mic_data.campo_11_placa or ''} / {mic_data.campo_15_placa_semi or ''}" if mic_data else ""),
            "crt_numero": crt_data.numero_crt if crt_data else "N/A",
            "exportador": crt_data.remitente.nombre if (crt_data and crt_data.remitente) else "N/A",
            "importador": crt_data.destinatario.nombre if (crt_data and crt_data.destinatario) else "N/A",
        })
    
    return jsonify({
        "items": resultado,
        "total": paginated.total,
        "pages": paginated.pages,
        "current_page": page,
        "per_page": per_page
    })

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
        observaciones=data.get('observaciones'),
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
    honorario.observaciones = data.get('observaciones', honorario.observaciones)
    honorario.tipo_operacion = data.get('tipo_operacion', honorario.tipo_operacion)
    
    if 'mic_numero' in data: honorario.mic_numero = data['mic_numero']
    if 'chofer' in data: honorario.chofer = data['chofer']
    if 'placas' in data: honorario.placas = data['placas']

    db.session.commit()
    return jsonify({"message": "Honorario actualizado"})

@honorarios_bp.route('/<int:id>', methods=['DELETE'])
def eliminar_honorario(id):
    honorario = Honorario.query.get_or_404(id)
    db.session.delete(honorario)
    db.session.commit()
    return jsonify({"message": "Honorario eliminado"})
