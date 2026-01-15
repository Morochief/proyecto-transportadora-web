from flask import Blueprint, request, jsonify
from app.models import Remitente, Ciudad
from app import db
from app.security.decorators import verify_authentication

remitentes_bp = Blueprint('remitentes', __name__, url_prefix='/api/remitentes')
remitentes_bp.before_request(verify_authentication)

# Listar remitentes (paginado, búsqueda por nombre/documento)


@remitentes_bp.route('/', methods=['GET'])
def listar_remitentes():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)  # Cambiar de 10 a 50
    q = request.args.get('q', '', type=str).strip()
    sort_by = request.args.get('sort_by', 'nombre', type=str)
    sort_order = request.args.get('sort_order', 'asc', type=str)

    query = Remitente.query

    if q:
        search = f"%{q}%"
        query = query.filter(
            db.or_(
                Remitente.nombre.ilike(search),
                Remitente.numero_documento.ilike(search)
            )
        )

    # Definir campos válidos para ordenar
    valid_sort_fields = {
        'id': Remitente.id,
        'nombre': Remitente.nombre,
        'tipo_documento': Remitente.tipo_documento,
        'numero_documento': Remitente.numero_documento,
        'direccion': Remitente.direccion,
        'ciudad_nombre': Ciudad.nombre
    }

    # Aplicar ordenamiento
    if sort_by in valid_sort_fields:
        order_column = valid_sort_fields[sort_by]
        if sort_order == 'desc':
            order_column = order_column.desc()
        else:
            order_column = order_column.asc()

        # Si ordena por ciudad, necesitamos hacer join
        if sort_by == 'ciudad_nombre':
            query = query.join(Ciudad)

        query = query.order_by(order_column)
    else:
        # Orden por defecto
        query = query.order_by(Remitente.nombre.asc())

    remitentes = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False  # Evitar errores si la página no existe
    )

    return jsonify({
        "items": [
            {
                "id": r.id,
                "nombre": r.nombre,
                "tipo_documento": r.tipo_documento,
                "numero_documento": r.numero_documento,
                "direccion": r.direccion,
                "ciudad_id": r.ciudad_id,
                "ciudad_nombre": r.ciudad.nombre if r.ciudad else ""
            }
            for r in remitentes.items
        ],
        "total": remitentes.total,
        "pages": remitentes.pages,
        "current_page": remitentes.page
    })

# Crear remitente


@remitentes_bp.route('/', methods=['POST'])
def crear_remitente():
    try:
        data = request.json
        if not data.get('nombre') or not data.get('ciudad_id'):
            return jsonify({"error": "Faltan campos obligatorios"}), 400

        ciudad = Ciudad.query.get(data['ciudad_id'])
        if not ciudad:
            return jsonify({"error": "Ciudad no encontrada"}), 404

        remitente = Remitente(
            nombre=data['nombre'],
            tipo_documento=data.get('tipo_documento'),
            numero_documento=data.get('numero_documento'),
            direccion=data.get('direccion'),
            ciudad_id=data['ciudad_id']
        )

        db.session.add(remitente)
        db.session.commit()

        return jsonify({"message": "Remitente creado", "id": remitente.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Modificar remitente


@remitentes_bp.route('/<int:id>', methods=['PUT'])
def modificar_remitente(id):
    try:
        remitente = Remitente.query.get_or_404(id)
        data = request.json

        remitente.nombre = data.get('nombre', remitente.nombre)
        remitente.tipo_documento = data.get(
            'tipo_documento', remitente.tipo_documento)
        remitente.numero_documento = data.get(
            'numero_documento', remitente.numero_documento)
        remitente.direccion = data.get('direccion', remitente.direccion)

        if data.get('ciudad_id'):
            ciudad = Ciudad.query.get(data['ciudad_id'])
            if not ciudad:
                return jsonify({"error": "Ciudad no encontrada"}), 404
            remitente.ciudad_id = data['ciudad_id']

        db.session.commit()
        return jsonify({"message": "Remitente modificado"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Eliminar remitente


@remitentes_bp.route('/<int:id>', methods=['DELETE'])
def eliminar_remitente(id):
    try:
        remitente = Remitente.query.get_or_404(id)
        db.session.delete(remitente)
        db.session.commit()
        return jsonify({"message": "Remitente eliminado"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
