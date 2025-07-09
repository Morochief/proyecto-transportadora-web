from flask import Blueprint, request, jsonify
from app.models import Transportadora, Ciudad
from app import db

transportadoras_bp = Blueprint('transportadoras', __name__, url_prefix='/api/transportadoras')

# Listar transportadoras (búsqueda opcional)
@transportadoras_bp.route('/', methods=['GET'])
def listar_transportadoras():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    q = request.args.get('q', '', type=str).strip()
    query = Transportadora.query
    if q:
        search = f"%{q}%"
        query = query.filter(
            db.or_(
                Transportadora.nombre.ilike(search),
                Transportadora.codigo.ilike(search),
                Transportadora.codigo_interno.ilike(search),
                Transportadora.direccion.ilike(search)
            )
        )
    transportadoras = query.order_by(Transportadora.id.desc()).paginate(page=page, per_page=per_page)
    return jsonify({
        "items": [
            {
                "id": t.id,
                "codigo": t.codigo,
                "codigo_interno": t.codigo_interno,
                "nombre": t.nombre,
                "direccion": t.direccion,
                "ciudad_id": t.ciudad_id,
                "tipo_documento": t.tipo_documento,
                "numero_documento": t.numero_documento,
                "telefono": t.telefono,
                "honorarios": str(t.honorarios) if t.honorarios is not None else None
            }
            for t in transportadoras.items
        ],
        "total": transportadoras.total,
        "pages": transportadoras.pages,
        "current_page": transportadoras.page
    })

# Crear transportadora
@transportadoras_bp.route('/', methods=['POST'])
def crear_transportadora():
    data = request.json
    if not data.get('nombre') or not data.get('codigo') or not data.get('ciudad_id'):
        return jsonify({"error": "Faltan campos obligatorios"}), 400
    ciudad = Ciudad.query.get(data['ciudad_id'])
    if not ciudad:
        return jsonify({"error": "Ciudad no encontrada"}), 404
    transportadora = Transportadora(
        codigo=data['codigo'],
        codigo_interno=data.get('codigo_interno'),
        nombre=data['nombre'],
        direccion=data.get('direccion'),
        ciudad_id=data['ciudad_id'],
        tipo_documento=data.get('tipo_documento'),
        numero_documento=data.get('numero_documento'),
        telefono=data.get('telefono'),
        honorarios=data.get('honorarios')
    )
    db.session.add(transportadora)
    db.session.commit()
    return jsonify({"message": "Transportadora creada", "id": transportadora.id}), 201

# Modificar transportadora
@transportadoras_bp.route('/<int:id>', methods=['PUT'])
def modificar_transportadora(id):
    transportadora = Transportadora.query.get_or_404(id)
    data = request.json
    transportadora.codigo = data.get('codigo', transportadora.codigo)
    transportadora.codigo_interno = data.get('codigo_interno', transportadora.codigo_interno)
    transportadora.nombre = data.get('nombre', transportadora.nombre)
    transportadora.direccion = data.get('direccion', transportadora.direccion)
    if data.get('ciudad_id'):
        ciudad = Ciudad.query.get(data['ciudad_id'])
        if not ciudad:
            return jsonify({"error": "Ciudad no encontrada"}), 404
        transportadora.ciudad_id = data['ciudad_id']
    transportadora.tipo_documento = data.get('tipo_documento', transportadora.tipo_documento)
    transportadora.numero_documento = data.get('numero_documento', transportadora.numero_documento)
    transportadora.telefono = data.get('telefono', transportadora.telefono)
    if data.get('honorarios') is not None:
        transportadora.honorarios = data.get('honorarios')
    db.session.commit()
    return jsonify({"message": "Transportadora modificada"})

# Eliminar transportadora
@transportadoras_bp.route('/<int:id>', methods=['DELETE'])
def eliminar_transportadora(id):
    transportadora = Transportadora.query.get_or_404(id)
    db.session.delete(transportadora)
    db.session.commit()
    return jsonify({"message": "Transportadora eliminada"})
