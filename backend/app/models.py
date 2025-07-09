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
    transportadoras = db.relationship('Transportadora', backref='ciudad', lazy=True)

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nombre_completo = db.Column(db.String(100), nullable=False)
    usuario = db.Column(db.String(50), unique=True, nullable=False)
    clave_hash = db.Column(db.String(256), nullable=False)
    rol = db.Column(db.String(20), nullable=False, default='operador')
    estado = db.Column(db.String(15), nullable=False, default='activo')
    creado_en = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    movimientos = db.relationship('Movimiento', backref='usuario', lazy=True)
    reportes = db.relationship('Reporte', backref='usuario', lazy=True)

class Moneda(db.Model):
    __tablename__ = 'monedas'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(10), nullable=False)
    nombre = db.Column(db.String(50), nullable=False)
    simbolo = db.Column(db.String(5), nullable=False)
    movimientos = db.relationship('Movimiento', backref='moneda', lazy=True)

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
    codigo_interno = db.Column(db.String(30))
    nombre = db.Column(db.String(100), nullable=False)
    direccion = db.Column(db.String(120))
    ciudad_id = db.Column(db.Integer, db.ForeignKey('ciudades.id'))
    tipo_documento = db.Column(db.String(30))
    numero_documento = db.Column(db.String(40))
    telefono = db.Column(db.String(30))
    honorarios = db.Column(db.Numeric(18,2))
    honorarios_registrados = db.relationship('Honorario', backref='transportadora', lazy=True)
    movimientos = db.relationship('Movimiento', backref='transportadora', lazy=True)

class Honorario(db.Model):
    __tablename__ = 'honorarios'
    id = db.Column(db.Integer, primary_key=True)
    descripcion = db.Column(db.String(120))
    monto = db.Column(db.Numeric(18,2), nullable=False)
    transportadora_id = db.Column(db.Integer, db.ForeignKey('transportadoras.id'), nullable=False)
    fecha = db.Column(db.Date, nullable=False, default=datetime.utcnow)

class Movimiento(db.Model):
    __tablename__ = 'movimientos'
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    monto = db.Column(db.Numeric(18,2), nullable=False)
    moneda_id = db.Column(db.Integer, db.ForeignKey('monedas.id'))
    remitente_id = db.Column(db.Integer, db.ForeignKey('remitentes.id'))
    transportadora_id = db.Column(db.Integer, db.ForeignKey('transportadoras.id'))
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

# ---------- MODELO CRT Y GASTOS CRT CORREGIDOS ----------

class CRT(db.Model):
    __tablename__ = "crts"
    id = db.Column(db.Integer, primary_key=True)
    numero_crt = db.Column(db.String(30), unique=True, nullable=False)
    fecha_emision = db.Column(db.DateTime, default=datetime.utcnow)
    estado = db.Column(db.String(20), default="EMITIDO")
    remitente_id = db.Column(db.Integer, db.ForeignKey('remitentes.id'), nullable=False)
    destinatario_id = db.Column(db.Integer, db.ForeignKey('remitentes.id'), nullable=False)
    consignatario_id = db.Column(db.Integer, db.ForeignKey('remitentes.id'), nullable=True)
    transportadora_id = db.Column(db.Integer, db.ForeignKey('transportadoras.id'), nullable=False)
    ciudad_emision_id = db.Column(db.Integer, db.ForeignKey('ciudades.id'), nullable=False)
    pais_emision_id = db.Column(db.Integer, db.ForeignKey('paises.id'), nullable=False)
    lugar_entrega = db.Column(db.String(120))
    fecha_entrega = db.Column(db.Date)
    detalles_mercaderia = db.Column(db.Text)
    peso_bruto = db.Column(db.Numeric(18,3))
    peso_neto = db.Column(db.Numeric(18,3))
    volumen = db.Column(db.Numeric(18,5))
    incoterm = db.Column(db.String(10))
    moneda_id = db.Column(db.Integer, db.ForeignKey('monedas.id'), nullable=False)
    valor_incoterm = db.Column(db.Numeric(18,2))
    valor_mercaderia = db.Column(db.Numeric(18,2))
    declaracion_mercaderia = db.Column(db.String(40))
    gastos = db.relationship('CRT_Gasto', backref='crt', cascade="all, delete-orphan", lazy=True)
    valor_flete_externo = db.Column(db.Numeric(18,2))
    valor_reembolso = db.Column(db.Numeric(18,2))
    factura_exportacion = db.Column(db.String(40))
    nro_despacho = db.Column(db.String(40))
    transporte_sucesivos = db.Column(db.Text)
    observaciones = db.Column(db.Text)
    formalidades_aduana = db.Column(db.Text)
    fecha_firma = db.Column(db.DateTime)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))

    # ---- RELACIONES PARA SQLALCHEMY ----
    remitente = db.relationship('Remitente', foreign_keys=[remitente_id])
    destinatario = db.relationship('Remitente', foreign_keys=[destinatario_id])
    consignatario = db.relationship('Remitente', foreign_keys=[consignatario_id])
    transportadora = db.relationship('Transportadora', foreign_keys=[transportadora_id])
    moneda = db.relationship('Moneda', foreign_keys=[moneda_id])

class CRT_Gasto(db.Model):
    __tablename__ = "crt_gastos"
    id = db.Column(db.Integer, primary_key=True)
    crt_id = db.Column(db.Integer, db.ForeignKey('crts.id'), nullable=False)
    tramo = db.Column(db.String(120), nullable=False)
    valor_remitente = db.Column(db.Numeric(18,2))
    moneda_remitente_id = db.Column(db.Integer, db.ForeignKey('monedas.id'))
    valor_destinatario = db.Column(db.Numeric(18,2))
    moneda_destinatario_id = db.Column(db.Integer, db.ForeignKey('monedas.id'))

    moneda_remitente = db.relationship('Moneda', foreign_keys=[moneda_remitente_id])
    moneda_destinatario = db.relationship('Moneda', foreign_keys=[moneda_destinatario_id])
