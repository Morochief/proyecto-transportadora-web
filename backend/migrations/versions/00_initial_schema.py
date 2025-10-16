"""initial schema - create all base tables"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '00_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create paises table
    op.create_table(
        'paises',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('codigo', sa.String(10), unique=True, nullable=False),
    )

    # Create ciudades table
    op.create_table(
        'ciudades',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('pais_id', sa.Integer(), sa.ForeignKey(
            'paises.id'), nullable=False),
    )

    # Create monedas table
    op.create_table(
        'monedas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('codigo', sa.String(10), nullable=False),
        sa.Column('nombre', sa.String(50), nullable=False),
        sa.Column('simbolo', sa.String(5), nullable=False),
    )

    # Create usuarios table (basic version before auth module enhancements)
    op.create_table(
        'usuarios',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nombre_completo', sa.String(120), nullable=False),
        sa.Column('usuario', sa.String(50), unique=True, nullable=False),
        # Will be made NOT NULL in auth module migration
        sa.Column('email', sa.String(255), unique=True, nullable=True),
        sa.Column('telefono', sa.String(30), nullable=True),
        sa.Column('clave_hash', sa.String(256), nullable=False),
        sa.Column('rol', sa.String(20), nullable=False,
                  server_default='operador'),
        sa.Column('estado', sa.String(15), nullable=False,
                  server_default='activo'),
        sa.Column('creado_en', sa.DateTime(), nullable=False,
                  server_default=sa.func.now()),
    )

    # Create remitentes table
    op.create_table(
        'remitentes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('tipo_documento', sa.String(30), nullable=True),
        sa.Column('numero_documento', sa.String(40), nullable=True),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('direccion', sa.String(120), nullable=True),
        sa.Column('ciudad_id', sa.Integer(), sa.ForeignKey(
            'ciudades.id'), nullable=True),
    )

    # Create transportadoras table
    op.create_table(
        'transportadoras',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('codigo', sa.String(30), nullable=False),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('direccion', sa.String(120), nullable=True),
        sa.Column('ciudad_id', sa.Integer(), sa.ForeignKey(
            'ciudades.id'), nullable=True),
        sa.Column('tipo_documento', sa.String(30), nullable=True),
        sa.Column('numero_documento', sa.String(40), nullable=True),
        sa.Column('telefono', sa.String(100), nullable=True),
        sa.Column('rol_contribuyente', sa.String(50), nullable=True),
        sa.Column('moneda_honorarios_id', sa.Integer(),
                  sa.ForeignKey('monedas.id'), nullable=True),
    )

    # Create honorarios table
    op.create_table(
        'honorarios',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('descripcion', sa.String(120), nullable=True),
        sa.Column('monto', sa.Numeric(18, 2), nullable=False),
        sa.Column('transportadora_id', sa.Integer(), sa.ForeignKey(
            'transportadoras.id'), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('moneda_id', sa.Integer(), sa.ForeignKey(
            'monedas.id'), nullable=False),
    )

    # Create movimientos table
    op.create_table(
        'movimientos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('fecha', sa.DateTime(), nullable=False,
                  server_default=sa.func.now()),
        sa.Column('monto', sa.Numeric(18, 2), nullable=False),
        sa.Column('moneda_id', sa.Integer(), sa.ForeignKey(
            'monedas.id'), nullable=True),
        sa.Column('remitente_id', sa.Integer(), sa.ForeignKey(
            'remitentes.id'), nullable=True),
        sa.Column('transportadora_id', sa.Integer(), sa.ForeignKey(
            'transportadoras.id'), nullable=True),
        sa.Column('usuario_id', sa.Integer(), sa.ForeignKey(
            'usuarios.id'), nullable=True),
        sa.Column('tipo', sa.String(40), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('estado', sa.String(20), server_default='pendiente'),
    )

    # Create reportes table
    op.create_table(
        'reportes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('tipo', sa.String(40), nullable=True),
        sa.Column('datos', sa.Text(), nullable=True),
        sa.Column('generado_por', sa.Integer(),
                  sa.ForeignKey('usuarios.id'), nullable=True),
        sa.Column('generado_en', sa.DateTime(), server_default=sa.func.now()),
    )

    # Create config_impresora table
    op.create_table(
        'config_impresora',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('configuracion_json', sa.Text(), nullable=False),
    )

    # Create parametros table
    op.create_table(
        'parametros',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('clave', sa.String(80), unique=True, nullable=False),
        sa.Column('valor', sa.String(180), nullable=False),
    )

    # Create crts table
    op.create_table(
        'crts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('numero_crt', sa.String(30), unique=True, nullable=False),
        sa.Column('fecha_emision', sa.DateTime(),
                  server_default=sa.func.now()),
        sa.Column('estado', sa.String(20), server_default='EMITIDO'),
        sa.Column('remitente_id', sa.Integer(), sa.ForeignKey(
            'remitentes.id'), nullable=False),
        sa.Column('destinatario_id', sa.Integer(),
                  sa.ForeignKey('remitentes.id'), nullable=False),
        sa.Column('consignatario_id', sa.Integer(),
                  sa.ForeignKey('remitentes.id'), nullable=True),
        sa.Column('notificar_a_id', sa.Integer(),
                  sa.ForeignKey('remitentes.id'), nullable=True),
        sa.Column('firma_destinatario_id', sa.Integer(),
                  sa.ForeignKey('remitentes.id'), nullable=True),
        sa.Column('transportadora_id', sa.Integer(), sa.ForeignKey(
            'transportadoras.id'), nullable=False),
        sa.Column('ciudad_emision_id', sa.Integer(),
                  sa.ForeignKey('ciudades.id'), nullable=False),
        sa.Column('pais_emision_id', sa.Integer(),
                  sa.ForeignKey('paises.id'), nullable=False),
        sa.Column('lugar_entrega', sa.String(120), nullable=True),
        sa.Column('fecha_entrega', sa.Date(), nullable=True),
        sa.Column('detalles_mercaderia', sa.Text(), nullable=True),
        sa.Column('peso_bruto', sa.Numeric(18, 3), nullable=True),
        sa.Column('peso_neto', sa.Numeric(18, 3), nullable=True),
        sa.Column('volumen', sa.Numeric(18, 5), nullable=True),
        sa.Column('incoterm', sa.String(10), nullable=True),
        sa.Column('moneda_id', sa.Integer(), sa.ForeignKey(
            'monedas.id'), nullable=False),
        sa.Column('valor_incoterm', sa.Numeric(18, 2), nullable=True),
        sa.Column('valor_mercaderia', sa.Numeric(18, 2), nullable=True),
        sa.Column('declaracion_mercaderia', sa.String(40), nullable=True),
        sa.Column('valor_flete_externo', sa.Numeric(18, 2), nullable=True),
        sa.Column('valor_reembolso', sa.Numeric(18, 2), nullable=True),
        sa.Column('factura_exportacion', sa.String(40), nullable=True),
        sa.Column('nro_despacho', sa.String(40), nullable=True),
        sa.Column('transporte_sucesivos', sa.Text(), nullable=True),
        sa.Column('observaciones', sa.Text(), nullable=True),
        sa.Column('formalidades_aduana', sa.Text(), nullable=True),
        sa.Column('fecha_firma', sa.DateTime(), nullable=True),
        sa.Column('usuario_id', sa.Integer(), sa.ForeignKey(
            'usuarios.id'), nullable=True),
    )

    # Create crt_gastos table
    op.create_table(
        'crt_gastos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('crt_id', sa.Integer(), sa.ForeignKey(
            'crts.id'), nullable=False),
        sa.Column('tramo', sa.String(120), nullable=False),
        sa.Column('valor_remitente', sa.Numeric(18, 2), nullable=True),
        sa.Column('moneda_remitente_id', sa.Integer(),
                  sa.ForeignKey('monedas.id'), nullable=True),
        sa.Column('valor_destinatario', sa.Numeric(18, 2), nullable=True),
        sa.Column('moneda_destinatario_id', sa.Integer(),
                  sa.ForeignKey('monedas.id'), nullable=True),
    )

    # Create mics table
    op.create_table(
        'mics',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('crt_id', sa.Integer(), sa.ForeignKey(
            'crts.id'), nullable=True),
        sa.Column('campo_1_transporte', sa.String(150), nullable=True),
        sa.Column('campo_2_numero', sa.String(30), nullable=True),
        sa.Column('campo_3_transporte', sa.String(150), nullable=True),
        sa.Column('campo_4_estado', sa.String(
            30), server_default='PROVISORIO'),
        sa.Column('campo_5_hoja', sa.String(20), server_default='1 / 1'),
        sa.Column('campo_6_fecha', sa.Date(), nullable=True),
        sa.Column('campo_7_pto_seguro', sa.String(100), nullable=True),
        sa.Column('campo_8_destino', sa.String(100), nullable=True),
        sa.Column('campo_9_datos_transporte', sa.String(200), nullable=True),
        sa.Column('campo_10_numero', sa.String(30), nullable=True),
        sa.Column('campo_11_placa', sa.String(20), nullable=True),
        sa.Column('campo_12_modelo_chasis', sa.String(80), nullable=True),
        sa.Column('campo_13_siempre_45', sa.String(10), server_default='45'),
        sa.Column('campo_14_anio', sa.String(10), nullable=True),
        sa.Column('campo_15_placa_semi', sa.String(20), nullable=True),
        sa.Column('campo_16_asteriscos_1', sa.String(
            20), server_default='******'),
        sa.Column('campo_17_asteriscos_2', sa.String(
            20), server_default='******'),
        sa.Column('campo_18_asteriscos_3', sa.String(
            20), server_default='******'),
        sa.Column('campo_19_asteriscos_4', sa.String(
            20), server_default='******'),
        sa.Column('campo_20_asteriscos_5', sa.String(
            20), server_default='******'),
        sa.Column('campo_21_asteriscos_6', sa.String(
            20), server_default='******'),
        sa.Column('campo_22_asteriscos_7', sa.String(
            20), server_default='******'),
        sa.Column('campo_23_numero_campo2_crt', sa.String(30), nullable=True),
        sa.Column('campo_24_aduana', sa.String(100), nullable=True),
        sa.Column('campo_25_moneda', sa.String(30), nullable=True),
        sa.Column('campo_26_pais', sa.String(30), nullable=True),
        sa.Column('campo_27_valor_campo16', sa.Numeric(18, 2), nullable=True),
        sa.Column('campo_28_total', sa.Numeric(18, 2), nullable=True),
        sa.Column('campo_29_seguro', sa.Numeric(18, 2), nullable=True),
        sa.Column('campo_30_tipo_bultos', sa.String(30), nullable=True),
        sa.Column('campo_31_cantidad', sa.Numeric(10, 2), nullable=True),
        sa.Column('campo_32_peso_bruto', sa.Numeric(18, 3), nullable=True),
        sa.Column('campo_33_datos_campo1_crt', sa.String(200), nullable=True),
        sa.Column('campo_34_datos_campo4_crt', sa.String(200), nullable=True),
        sa.Column('campo_35_datos_campo6_crt', sa.String(200), nullable=True),
        sa.Column('campo_36_factura_despacho', sa.String(100), nullable=True),
        sa.Column('campo_37_valor_manual', sa.String(100), nullable=True),
        sa.Column('campo_38_datos_campo11_crt', sa.Text(), nullable=True),
        sa.Column('campo_40_tramo', sa.String(200), nullable=True),
        sa.Column('creado_en', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('mics')
    op.drop_table('crt_gastos')
    op.drop_table('crts')
    op.drop_table('parametros')
    op.drop_table('config_impresora')
    op.drop_table('reportes')
    op.drop_table('movimientos')
    op.drop_table('honorarios')
    op.drop_table('transportadoras')
    op.drop_table('remitentes')
    op.drop_table('usuarios')
    op.drop_table('monedas')
    op.drop_table('ciudades')
    op.drop_table('paises')
