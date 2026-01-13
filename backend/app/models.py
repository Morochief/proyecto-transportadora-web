from . import db
from datetime import datetime


class Pais(db.Model):
    __tablename__ = 'paises'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    codigo = db.Column(db.String(10), unique=True, nullable=False)
    ciudades = db.relationship('Ciudad', backref='pais', lazy=True)


class Ciudad(db.Model):
    __tablename__ = 'ciudades'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    pais_id = db.Column(db.Integer, db.ForeignKey('paises.id'), nullable=False)
    remitentes = db.relationship('Remitente', backref='ciudad', lazy=True)
    transportadoras = db.relationship(
        'Transportadora', backref='ciudad', lazy=True)
    aduanas = db.relationship('Aduana', backref='ciudad', lazy=True)


class Aduana(db.Model):
    __tablename__ = 'aduanas'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), unique=True, nullable=False)
    nombre = db.Column(db.String(150), nullable=False)
    ciudad_id = db.Column(db.Integer, db.ForeignKey('ciudades.id'), nullable=True)


class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nombre_completo = db.Column(db.String(120), nullable=False)
    display_name = db.Column(db.String(120), nullable=True)
    usuario = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    telefono = db.Column(db.String(30), nullable=True)
    clave_hash = db.Column(db.String(256), nullable=False)
    rol = db.Column(db.String(20), nullable=False,
                    default='operador')  # legado
    estado = db.Column(db.String(15), nullable=False,
                       default='activo')  # legado
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_locked = db.Column(db.Boolean, nullable=False, default=False)
    locked_until = db.Column(db.DateTime, nullable=True)
    failed_login_attempts = db.Column(db.Integer, nullable=False, default=0)
    password_changed_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow)
    password_expires_at = db.Column(db.DateTime, nullable=True)
    mfa_enabled = db.Column(db.Boolean, nullable=False, default=False)
    mfa_secret_encrypted = db.Column(db.LargeBinary, nullable=True)
    mfa_backup_codes_salt = db.Column(db.String(128), nullable=True)
    last_login_at = db.Column(db.DateTime, nullable=True)
    last_login_ip = db.Column(db.String(45), nullable=True)
    last_login_user_agent = db.Column(db.String(255), nullable=True)
    creado_en = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow, onupdate=datetime.utcnow)

    movimientos = db.relationship('Movimiento', backref='usuario', lazy=True)
    reportes = db.relationship('Reporte', backref='usuario', lazy=True)
    roles = db.relationship('Role', secondary='user_roles',
                            back_populates='users', lazy='selectin')
    refresh_tokens = db.relationship(
        'RefreshToken', backref='user', lazy=True, cascade='all, delete-orphan')
    password_history = db.relationship(
        'PasswordHistory', backref='user', lazy=True, cascade='all, delete-orphan')
    login_attempts = db.relationship(
        'LoginAttempt', backref='user', lazy=True, cascade='all, delete-orphan')
    audit_logs = db.relationship(
        'AuditLog', backref='user', lazy=True, cascade='all, delete-orphan')
    backup_codes = db.relationship(
        'BackupCode', backref='user', lazy=True, cascade='all, delete-orphan')

    def primary_role(self):
        return self.roles[0].name if self.roles else self.rol

    @property
    def created_at(self):
        return self.creado_en

    def __repr__(self) -> str:
        return f"<Usuario id={self.id} email={self.email} activo={self.is_active}>"


class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow, onupdate=datetime.utcnow)

    users = db.relationship('Usuario', secondary='user_roles',
                            back_populates='roles', lazy='selectin')
    permissions = db.relationship(
        'Permission', secondary='role_permissions', back_populates='roles', lazy='selectin')

    def __repr__(self) -> str:
        return f"<Role {self.name}>"


class Permission(db.Model):
    __tablename__ = 'permissions'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)

    roles = db.relationship('Role', secondary='role_permissions',
                            back_populates='permissions', lazy='selectin')

    def __repr__(self) -> str:
        return f"<Permission {self.key}>"


class UserRole(db.Model):
    __tablename__ = 'user_roles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'usuarios.id', ondelete='CASCADE'), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey(
        'roles.id', ondelete='CASCADE'), nullable=False)
    # Removed FK to avoid ambiguity
    assigned_by = db.Column(db.Integer, nullable=True)
    assigned_at = db.Column(db.DateTime, nullable=False,
                            default=datetime.utcnow)

    user = db.relationship('Usuario', foreign_keys=[user_id], backref=db.backref(
        'user_role_links', cascade='all, delete-orphan', viewonly=True), overlaps='roles,users')
    role = db.relationship('Role', foreign_keys=[role_id], backref=db.backref(
        'role_user_links', cascade='all, delete-orphan', viewonly=True), overlaps='roles,users')

    __table_args__ = (db.UniqueConstraint(
        'user_id', 'role_id', name='uq_user_role'),)


class RolePermission(db.Model):
    __tablename__ = 'role_permissions'
    id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey(
        'roles.id', ondelete='CASCADE'), nullable=False)
    permission_id = db.Column(db.Integer, db.ForeignKey(
        'permissions.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)

    role = db.relationship('Role', foreign_keys=[role_id], backref=db.backref(
        'role_permission_links', cascade='all, delete-orphan', viewonly=True), overlaps='permissions,roles')
    permission = db.relationship('Permission', foreign_keys=[permission_id], backref=db.backref(
        'permission_role_links', cascade='all, delete-orphan', viewonly=True), overlaps='permissions,roles')

    __table_args__ = (db.UniqueConstraint(
        'role_id', 'permission_id', name='uq_role_permission'),)


class PasswordHistory(db.Model):
    __tablename__ = 'password_history'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'usuarios.id', ondelete='CASCADE'), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)

    __table_args__ = (
        db.Index('ix_password_history_user_created', 'user_id', 'created_at'),)


class LoginAttempt(db.Model):
    __tablename__ = 'login_attempts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'usuarios.id', ondelete='SET NULL'), nullable=True)
    email = db.Column(db.String(255), nullable=False)
    ip = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.String(255), nullable=True)
    success = db.Column(db.Boolean, nullable=False)
    mfa_required = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)

    __table_args__ = (
        db.Index('ix_login_attempts_email_created', 'email', 'created_at'),
        db.Index('ix_login_attempts_ip_created', 'ip', 'created_at'),
    )


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'usuarios.id', ondelete='SET NULL'), nullable=True)
    action = db.Column(db.String(120), nullable=False)
    metadata_json = db.Column(db.JSON, nullable=True)
    ip = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)
    level = db.Column(db.String(20), nullable=False, default='INFO')

    __table_args__ = (db.Index('ix_audit_logs_created', 'created_at'),)


class RefreshToken(db.Model):
    __tablename__ = 'refresh_tokens'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'usuarios.id', ondelete='CASCADE'), nullable=False)
    token_id = db.Column(db.String(64), nullable=False)
    token_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked_at = db.Column(db.DateTime, nullable=True)
    replaced_by_token_id = db.Column(db.String(64), nullable=True)
    ip = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)

    __table_args__ = (
        db.UniqueConstraint('token_id', name='uq_refresh_token_id'),
        db.Index('ix_refresh_tokens_user_active', 'user_id', 'revoked_at'),
    )


class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'usuarios.id', ondelete='CASCADE'), nullable=False)
    token_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        db.UniqueConstraint('token_hash', name='uq_password_reset_token_hash'),
        db.Index('ix_password_reset_user', 'user_id'),
    )


class BackupCode(db.Model):
    __tablename__ = 'backup_codes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey(
        'usuarios.id', ondelete='CASCADE'), nullable=False)
    salt = db.Column(db.String(64), nullable=False)
    code_hash = db.Column(db.String(256), nullable=False)
    used = db.Column(db.Boolean, nullable=False, default=False)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)

    __table_args__ = (
        db.Index('ix_backup_codes_user', 'user_id'),
        db.UniqueConstraint('user_id', 'code_hash',
                            name='uq_backup_code_hash'),
    )


class Moneda(db.Model):
    __tablename__ = 'monedas'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(10), nullable=False)
    nombre = db.Column(db.String(50), nullable=False)
    simbolo = db.Column(db.String(5), nullable=False)
    movimientos = db.relationship('Movimiento', backref='moneda', lazy=True)
    honorarios = db.relationship('Honorario', backref='moneda', lazy=True)


class Remitente(db.Model):
    __tablename__ = 'remitentes'
    id = db.Column(db.Integer, primary_key=True)
    tipo_documento = db.Column(db.String(30))
    numero_documento = db.Column(db.String(40))
    nombre = db.Column(db.String(100), nullable=False)
    direccion = db.Column(db.String(120))
    ciudad_id = db.Column(db.Integer, db.ForeignKey('ciudades.id'))
    movimientos = db.relationship('Movimiento', backref='remitente', lazy=True)


class Transportadora(db.Model):
    __tablename__ = 'transportadoras'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(30), nullable=False)
    honorarios = db.Column(db.Numeric(18, 2))
    moneda_honorarios_id = db.Column(db.Integer, db.ForeignKey('monedas.id'))
    nombre = db.Column(db.String(100), nullable=False)
    direccion = db.Column(db.String(120))
    ciudad_id = db.Column(db.Integer, db.ForeignKey('ciudades.id'))
    tipo_documento = db.Column(db.String(30))
    numero_documento = db.Column(db.String(40))
    telefono = db.Column(db.String(100))
    rol_contribuyente = db.Column(db.String(50), nullable=True)
    honorarios_registrados = db.relationship(
        'Honorario', backref='transportadora', lazy=True)
    movimientos = db.relationship(
        'Movimiento', backref='transportadora', lazy=True)
    moneda_honorarios = db.relationship(
        'Moneda', foreign_keys=[moneda_honorarios_id])


class Honorario(db.Model):
    __tablename__ = 'honorarios'
    id = db.Column(db.Integer, primary_key=True)
    descripcion = db.Column(db.String(120))
    monto = db.Column(db.Numeric(18, 2), nullable=False)
    transportadora_id = db.Column(db.Integer, db.ForeignKey(
        'transportadoras.id'), nullable=False)
    fecha = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    moneda_id = db.Column(db.Integer, db.ForeignKey(
        'monedas.id'), nullable=False)
    crt_id = db.Column(db.Integer, db.ForeignKey('crts.id'), nullable=True) # Link to CRT
    tipo_operacion = db.Column(db.String(20), default='EXPORTACION')  # EXPORTACION o IMPORTACION
    observaciones = db.Column(db.Text)  # Campo para observaciones adicionales
    
    # Nuevos campos para datos manuales/auto del MIC
    mic_numero = db.Column(db.String(50))
    chofer = db.Column(db.String(100))
    placas = db.Column(db.String(100))

    crt = db.relationship('CRT', backref='honorarios')


class Movimiento(db.Model):
    __tablename__ = 'movimientos'
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    monto = db.Column(db.Numeric(18, 2), nullable=False)
    moneda_id = db.Column(db.Integer, db.ForeignKey('monedas.id'))
    remitente_id = db.Column(db.Integer, db.ForeignKey('remitentes.id'))
    transportadora_id = db.Column(
        db.Integer, db.ForeignKey('transportadoras.id'))
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    tipo = db.Column(db.String(40))
    descripcion = db.Column(db.Text)
    estado = db.Column(db.String(20), default='pendiente')


class Reporte(db.Model):
    __tablename__ = 'reportes'
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(40))
    datos = db.Column(db.Text)
    generado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    generado_en = db.Column(db.DateTime, default=datetime.utcnow)


class ConfigImpresora(db.Model):
    __tablename__ = 'config_impresora'
    id = db.Column(db.Integer, primary_key=True)
    configuracion_json = db.Column(db.Text, nullable=False)


class Parametro(db.Model):
    __tablename__ = 'parametros'
    id = db.Column(db.Integer, primary_key=True)
    clave = db.Column(db.String(80), unique=True, nullable=False)
    valor = db.Column(db.String(180), nullable=False)

# CRT y CRT_Gasto


class CRT(db.Model):
    __tablename__ = "crts"
    id = db.Column(db.Integer, primary_key=True)
    numero_crt = db.Column(db.String(30), unique=True, nullable=False)
    fecha_emision = db.Column(db.DateTime, default=datetime.utcnow)
    estado = db.Column(db.String(20), default="EMITIDO")
    remitente_id = db.Column(db.Integer, db.ForeignKey(
        'remitentes.id'), nullable=False)
    destinatario_id = db.Column(
        db.Integer, db.ForeignKey('remitentes.id'), nullable=False)
    consignatario_id = db.Column(
        db.Integer, db.ForeignKey('remitentes.id'), nullable=True)
    notificar_a_id = db.Column(db.Integer, db.ForeignKey(
        'remitentes.id'), nullable=True)  # NUEVO
    firma_destinatario_id = db.Column(db.Integer, db.ForeignKey(
        'remitentes.id'), nullable=True)  # Campo 24: Destinatario firma
    transportadora_id = db.Column(db.Integer, db.ForeignKey(
        'transportadoras.id'), nullable=False)
    ciudad_emision_id = db.Column(
        db.Integer, db.ForeignKey('ciudades.id'), nullable=False)
    pais_emision_id = db.Column(
        db.Integer, db.ForeignKey('paises.id'), nullable=False)
    lugar_entrega = db.Column(db.String(120))
    fecha_entrega = db.Column(db.Date)
    detalles_mercaderia = db.Column(db.Text)
    peso_bruto = db.Column(db.Numeric(18, 3))
    peso_neto = db.Column(db.Numeric(18, 3))
    volumen = db.Column(db.Numeric(18, 5))
    incoterm = db.Column(db.String(10))
    moneda_id = db.Column(db.Integer, db.ForeignKey(
        'monedas.id'), nullable=False)
    valor_incoterm = db.Column(db.Numeric(18, 2))
    valor_mercaderia = db.Column(db.Numeric(18, 2))
    declaracion_mercaderia = db.Column(db.String(40))
    gastos = db.relationship('CRT_Gasto', backref='crt',
                             cascade="all, delete-orphan", lazy=True)
    valor_flete_externo = db.Column(db.Numeric(18, 2))
    valor_reembolso = db.Column(db.Numeric(18, 2))
    factura_exportacion = db.Column(db.String(40))
    nro_despacho = db.Column(db.String(40))
    transporte_sucesivos = db.Column(db.Text)
    observaciones = db.Column(db.Text)
    formalidades_aduana = db.Column(db.Text)
    fecha_firma = db.Column(db.DateTime)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))

    # 🔥 RELATIONSHIPS PARA JOINS
    remitente = db.relationship('Remitente', foreign_keys=[remitente_id])
    destinatario = db.relationship('Remitente', foreign_keys=[destinatario_id])
    consignatario = db.relationship(
        'Remitente', foreign_keys=[consignatario_id])
    notificar_a = db.relationship('Remitente', foreign_keys=[
        notificar_a_id])  # NUEVO
    firma_destinatario = db.relationship('Remitente', foreign_keys=[
                                         firma_destinatario_id])  # Campo 24
    transportadora = db.relationship('Transportadora')
    ciudad_emision = db.relationship('Ciudad')
    pais_emision = db.relationship('Pais')
    moneda = db.relationship('Moneda')
    usuario = db.relationship('Usuario')


class CRT_Gasto(db.Model):
    __tablename__ = "crt_gastos"
    id = db.Column(db.Integer, primary_key=True)
    crt_id = db.Column(db.Integer, db.ForeignKey('crts.id'), nullable=False)
    tramo = db.Column(db.String(120), nullable=False)
    valor_remitente = db.Column(db.Numeric(18, 2))
    moneda_remitente_id = db.Column(db.Integer, db.ForeignKey('monedas.id'))
    valor_destinatario = db.Column(db.Numeric(18, 2))
    moneda_destinatario_id = db.Column(db.Integer, db.ForeignKey('monedas.id'))

    moneda_remitente = db.relationship(
        'Moneda', foreign_keys=[moneda_remitente_id])
    moneda_destinatario = db.relationship(
        'Moneda', foreign_keys=[moneda_destinatario_id])


class MIC(db.Model):
    __tablename__ = "mics"
    id = db.Column(db.Integer, primary_key=True)
    crt_id = db.Column(db.Integer, db.ForeignKey('crts.id'))
    campo_1_transporte = db.Column(db.String(150))
    campo_2_numero = db.Column(db.String(30))
    campo_3_transporte = db.Column(db.String(150))
    campo_4_estado = db.Column(db.String(30), default='PROVISORIO')
    campo_5_hoja = db.Column(db.String(20), default='1 / 1')
    campo_6_fecha = db.Column(db.Date)
    campo_7_pto_seguro = db.Column(db.String(100))
    campo_8_destino = db.Column(db.String(100))
    campo_9_datos_transporte = db.Column(db.String(200))
    campo_10_numero = db.Column(db.String(30))
    campo_11_placa = db.Column(db.String(20))
    campo_12_modelo_chasis = db.Column(db.String(80))
    campo_13_siempre_45 = db.Column(db.String(10), default='45')
    campo_14_anio = db.Column(db.String(10))
    campo_15_placa_semi = db.Column(db.String(20))
    campo_16_asteriscos_1 = db.Column(db.String(20), default='******')
    campo_17_asteriscos_2 = db.Column(db.String(20), default='******')
    campo_18_asteriscos_3 = db.Column(db.String(20), default='******')
    campo_19_asteriscos_4 = db.Column(db.String(20), default='******')
    campo_20_asteriscos_5 = db.Column(db.String(20), default='******')
    campo_21_asteriscos_6 = db.Column(db.String(20), default='******')
    campo_22_asteriscos_7 = db.Column(db.String(20), default='******')
    campo_23_numero_campo2_crt = db.Column(db.String(30))
    campo_24_aduana = db.Column(db.String(100))
    campo_25_moneda = db.Column(db.String(30))
    campo_26_pais = db.Column(db.String(30))
    campo_27_valor_campo16 = db.Column(db.Numeric(18, 2))
    campo_28_total = db.Column(db.Numeric(18, 2))
    campo_29_seguro = db.Column(db.Numeric(18, 2))
    campo_30_tipo_bultos = db.Column(db.String(30))
    campo_31_cantidad = db.Column(db.Numeric(10, 2))
    campo_32_peso_bruto = db.Column(db.Numeric(18, 3))
    campo_33_datos_campo1_crt = db.Column(db.String(200))
    campo_34_datos_campo4_crt = db.Column(db.String(200))
    campo_35_datos_campo6_crt = db.Column(db.String(200))
    campo_36_factura_despacho = db.Column(db.String(100))
    campo_37_valor_manual = db.Column(db.String(100))
    campo_38_datos_campo11_crt = db.Column(db.Text)
    campo_40_tramo = db.Column(db.Text)
    chofer = db.Column(db.String(100))  # Nuevo campo Chofer
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)

    crt = db.relationship('CRT', backref=db.backref('mics', lazy=True))
