from flask import Blueprint, jsonify, request, g
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import Role, Usuario
from app.security.decorators import auth_required, roles_required
from app.security.rbac import ensure_roles_permissions, normalize_role
from app.services.audit_service import audit_event
from app.utils.security import (
    hash_password,
    password_not_reused,
    password_policy_checks,
    register_password_history,
    revoke_all_tokens,
    update_password_metadata,
)


usuarios_bp = Blueprint('usuarios', __name__, url_prefix='/api/usuarios')


@usuarios_bp.before_request
def _deprecated_api():
    if request.method == 'OPTIONS':
        return None
    return jsonify({'error': 'Endpoint deprecado. Use /api/auth/admin/users.'}), 410


@usuarios_bp.route('/', methods=['GET'])
@auth_required
@roles_required('admin')
def listar_usuarios():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 15, type=int)
    search = request.args.get('search', '', type=str)
    
    query = Usuario.query
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            db.or_(
                Usuario.nombre_completo.ilike(search_term),
                Usuario.usuario.ilike(search_term),
                Usuario.email.ilike(search_term)
            )
        )
    
    usuarios = query.order_by(Usuario.id.desc()).paginate(page=page, per_page=per_page)
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

    ok, errors = password_policy_checks(data['clave'])
    if not ok:
        return jsonify({'error': 'Politica de contrasena', 'details': errors}), 400

    ensure_roles_permissions()
    role_name = normalize_role(data.get('rol', 'operador'))
    role = Role.query.filter_by(name=role_name).first()
    if not role:
        return jsonify({'error': 'Rol desconocido'}), 400

    usuario = Usuario(
        nombre_completo=data['nombre_completo'],
        display_name=data['nombre_completo'],
        usuario=data['usuario'].lower(),
        email=data['email'].lower(),
        telefono=data.get('telefono'),
        clave_hash=hash_password(data['clave']),
        rol=role_name,
        estado=data.get('estado', 'activo'),
        is_active=data.get('estado', 'activo') == 'activo',
    )
    usuario.roles.append(role)
    try:
        db.session.add(usuario)
        db.session.flush()
        register_password_history(usuario, usuario.clave_hash)
        update_password_metadata(usuario)
        audit_event(
            'user.admin_create',
            user_id=usuario.id,
            ip=request.headers.get('X-Forwarded-For', request.remote_addr),
            user_agent=request.headers.get('User-Agent'),
            metadata={'actor': getattr(g, 'current_user', None).id if getattr(g, 'current_user', None) else None},
        )
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
    revoke_sessions = False
    if 'nombre_completo' in data:
        usuario.nombre_completo = data['nombre_completo']
        usuario.display_name = data['nombre_completo']
    if 'telefono' in data:
        usuario.telefono = data['telefono']
    if 'estado' in data:
        usuario.estado = data['estado']
        usuario.is_active = usuario.estado == 'activo'
        if not usuario.is_active:
            revoke_sessions = True
    if 'email' in data:
        usuario.email = data['email'].lower()
    if 'rol' in data:
        ensure_roles_permissions()
        role_name = normalize_role(data['rol'])
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            return jsonify({'error': 'Rol desconocido'}), 400
        usuario.roles = [role]
        usuario.rol = role.name
    if data.get('clave'):
        ok, errors = password_policy_checks(data['clave'])
        if not ok:
            return jsonify({'error': 'Politica de contrasena', 'details': errors}), 400
        hashed = hash_password(data['clave'])
        if not password_not_reused(usuario, hashed):
            return jsonify({'error': 'Politica de contrasena', 'details': ['No puede reutilizar contrasenas recientes']}), 400
        usuario.clave_hash = hashed
        update_password_metadata(usuario)
        register_password_history(usuario, hashed)
        revoke_sessions = True
        audit_event(
            'password.admin_reset',
            user_id=usuario.id,
            ip=request.headers.get('X-Forwarded-For', request.remote_addr),
            user_agent=request.headers.get('User-Agent'),
            metadata={'actor': getattr(g, 'current_user', None).id if getattr(g, 'current_user', None) else None},
        )
    if revoke_sessions:
        revoke_all_tokens(usuario)
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
