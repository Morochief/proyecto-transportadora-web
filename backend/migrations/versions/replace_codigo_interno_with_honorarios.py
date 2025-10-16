"""Replace codigo_interno with honorarios and moneda_honorarios_id in Transportadora

Revision ID: replace_codigo_interno
Revises: None
Create Date: 2025-09-04 21:41:44.249000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'replace_codigo_interno'
down_revision = 'auth_module_rbac'  # Depends on initial schema
branch_labels = None
depends_on = None


def upgrade():
    # Check if transportadoras table exists and column exists before dropping
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Only drop if table and column exist
    if 'transportadoras' in inspector.get_table_names():
        columns = [col['name']
                   for col in inspector.get_columns('transportadoras')]
        if 'codigo_interno' in columns:
            op.drop_column('transportadoras', 'codigo_interno')

        # Add the new columns if they don't exist
        if 'honorarios' not in columns:
            op.add_column('transportadoras', sa.Column(
                'honorarios', sa.Numeric(18, 2), nullable=True))

        if 'moneda_honorarios_id' not in columns:
            op.add_column('transportadoras', sa.Column(
                'moneda_honorarios_id', sa.Integer(), nullable=True))
            op.create_foreign_key(
                'fk_transportadoras_moneda_honorarios',
                'transportadoras',
                'monedas',
                ['moneda_honorarios_id'],
                ['id']
            )


def downgrade():
    # Remove the foreign key and columns
    op.drop_constraint('fk_transportadoras_moneda_honorarios',
                       'transportadoras', type_='foreignkey')
    op.drop_column('transportadoras', 'moneda_honorarios_id')
    op.drop_column('transportadoras', 'honorarios')

    # Add back the old codigo_interno column
    op.add_column('transportadoras', sa.Column(
        'codigo_interno', sa.String(30), nullable=True))
