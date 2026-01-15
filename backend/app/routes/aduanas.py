from flask import Blueprint, request, jsonify
from app import db
from app import db
from app.security.decorators import roles_required, verify_authentication

aduanas_bp = Blueprint('aduanas', __name__, url_prefix='/api/aduanas')
aduanas_bp.before_request(verify_authentication)

@aduanas_bp.route('/', methods=['GET'])
# @roles_required('operador') # Opcional
def get_aduanas():
    from app.models import Aduana
    aduanas = Aduana.query.order_by(Aduana.nombre).all()

    return jsonify([{
        'id': a.id,
        'codigo': a.codigo,
        'nombre': a.nombre,
        'ciudad_id': a.ciudad_id,
        'ciudad': a.ciudad.nombre if a.ciudad else None
    } for a in aduanas])

@aduanas_bp.route('/', methods=['POST'])
@roles_required('admin')
def create_aduana():
    from app.models import Aduana
    data = request.json
    if not data or not data.get('nombre') or not data.get('codigo'):
        return jsonify({'error': 'Faltan datos requeridos (nombre, codigo)'}), 400
    
    nueva_aduana = Aduana(
        nombre=data['nombre'],
        codigo=data['codigo'],
        ciudad_id=data.get('ciudad_id')
    )
    db.session.add(nueva_aduana)
    db.session.commit()
    return jsonify({'message': 'Aduana creada', 'id': nueva_aduana.id}), 201

@aduanas_bp.route('/<int:id>', methods=['PUT'])
@roles_required('admin')
def update_aduana(id):
    from app.models import Aduana
    aduana = Aduana.query.get_or_404(id)
    data = request.json
    
    aduana.nombre = data.get('nombre', aduana.nombre)
    aduana.codigo = data.get('codigo', aduana.codigo)
    aduana.ciudad_id = data.get('ciudad_id', aduana.ciudad_id)
    
    db.session.commit()
    return jsonify({'message': 'Aduana actualizada'})

@aduanas_bp.route('/<int:id>', methods=['DELETE'])
@roles_required('admin')
def delete_aduana(id):
    from app.models import Aduana
    aduana = Aduana.query.get_or_404(id)
    db.session.delete(aduana)
    db.session.commit()
    return jsonify({'message': 'Aduana eliminada'})
