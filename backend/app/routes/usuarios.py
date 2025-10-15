from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import Role, Usuario
from app.security.decorators import auth_required, roles_required
from app.security.rbac import ensure_roles_permissions
from app.utils.security import hash_password


usuarios_bp = Blueprint('usuarios', __name__, url_prefix='/api/usuarios')


@usuarios_bp.route('/', methods=['GET'])
@auth_required
@roles_required('admin')
def listar_usuarios():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    usuarios = Usuario.query.order_by(Usuario.id.desc()).paginate(page=page, per_page=per_page)
    return jsonify({
        'items': [
            {
                'id': u.id,
                'nombre_completo': u.nombre_completo,
                'usuario': u.usuario,
                'roles': [role.name for role in u.roles],
                'estado': u.estado,
                'is_active': u.is_active,
                'email': u.email,
                'telefono': u.telefono,
                'creado_en': u.creado_en.strftime('%Y-%m-%d %H:%M'),
            }
            for u in usuarios.items
        ],
        'total': usuarios.total,
        'pages': usuarios.pages,
        'current_page': usuarios.page,
    })


@usuarios_bp.route('/', methods=['POST'])
@auth_required
@roles_required('admin')
def crear_usuario():
    data = request.get_json(force=True)
    required = ['usuario', 'clave', 'nombre_completo', 'email']
    missing = [field for field in required if not data.get(field)]
    if missing:
        return jsonify({'error': 'Faltan campos', 'missing': missing}), 400

    ensure_roles_permissions()
    usuario = Usuario(
        nombre_completo=data['nombre_completo'],
        display_name=data['nombre_completo'],
        usuario=data['usuario'].lower(),
        email=data['email'].lower(),
        telefono=data.get('telefono'),
        clave_hash=hash_password(data['clave']),
        rol=data.get('rol', 'operador'),
        estado=data.get('estado', 'activo'),
        is_active=data.get('estado', 'activo') == 'activo',
    )
    role_name = data.get('rol', 'operador')
    role = Role.query.filter_by(name=role_name).first()
    if role:
        usuario.roles.append(role)
    try:
        db.session.add(usuario)
        db.session.commit()
        return jsonify({'message': 'Usuario creado', 'id': usuario.id}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Nombre de usuario o email ya existe'}), 409


@usuarios_bp.route('/<int:user_id>', methods=['PUT'])
@auth_required
@roles_required('admin')
def modificar_usuario(user_id: int):
    usuario = Usuario.query.get_or_404(user_id)
    data = request.get_json(force=True)
    if 'nombre_completo' in data:
        usuario.nombre_completo = data['nombre_completo']
        usuario.display_name = data['nombre_completo']
    if 'telefono' in data:
        usuario.telefono = data['telefono']
    if 'estado' in data:
        usuario.estado = data['estado']
        usuario.is_active = usuario.estado == 'activo'
    if 'email' in data:
        usuario.email = data['email'].lower()
    if 'rol' in data:
        ensure_roles_permissions()
        role = Role.query.filter_by(name=data['rol']).first()
        if role:
            usuario.roles = [role]
            usuario.rol = role.name
    if data.get('clave'):
        usuario.clave_hash = hash_password(data['clave'])
    db.session.commit()
    return jsonify({'message': 'Usuario modificado'})


@usuarios_bp.route('/<int:user_id>', methods=['DELETE'])
@auth_required
@roles_required('admin')
def eliminar_usuario(user_id: int):
    usuario = Usuario.query.get_or_404(user_id)
    db.session.delete(usuario)
    db.session.commit()
    return jsonify({'message': 'Usuario eliminado'})
