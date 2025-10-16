"""auth module overhaul"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

# revision identifiers, used by Alembic.
revision = 'auth_module_rbac'
down_revision = '00_initial_schema'
branch_labels = None
depends_on = None


def upgrade():
    # usuarios table enhancements
    with op.batch_alter_table('usuarios') as batch:
        batch.add_column(
            sa.Column('display_name', sa.String(length=120), nullable=True))
        batch.add_column(sa.Column('is_active', sa.Boolean(),
                         server_default=sa.text('TRUE'), nullable=False))
        batch.add_column(sa.Column('is_locked', sa.Boolean(),
                         server_default=sa.text('FALSE'), nullable=False))
        batch.add_column(
            sa.Column('locked_until', sa.DateTime(), nullable=True))
        batch.add_column(sa.Column('failed_login_attempts',
                         sa.Integer(), server_default='0', nullable=False))
        batch.add_column(sa.Column('password_changed_at',
                         sa.DateTime(), nullable=True))
        batch.add_column(sa.Column('password_expires_at',
                         sa.DateTime(), nullable=True))
        batch.add_column(sa.Column('mfa_enabled', sa.Boolean(),
                         server_default=sa.text('FALSE'), nullable=False))
        batch.add_column(sa.Column('mfa_secret_encrypted',
                         sa.LargeBinary(), nullable=True))
        batch.add_column(sa.Column('mfa_backup_codes_salt',
                         sa.String(length=128), nullable=True))
        batch.add_column(
            sa.Column('last_login_at', sa.DateTime(), nullable=True))
        batch.add_column(
            sa.Column('last_login_ip', sa.String(length=45), nullable=True))
        batch.add_column(sa.Column('last_login_user_agent',
                         sa.String(length=255), nullable=True))
        batch.add_column(sa.Column('updated_at', sa.DateTime(), nullable=True))

    # backfill email values if null
    usuarios = table('usuarios', column('id', sa.Integer),
                     column('email', sa.String))
    conn = op.get_bind()
    results = conn.execute(
        sa.select(usuarios.c.id, usuarios.c.email)).fetchall()
    for user_id, email in results:
        if email is None or email == '':
            conn.execute(
                sa.text("UPDATE usuarios SET email = :email WHERE id = :id"),
                {'email': f'user{user_id}@local.invalid', 'id': user_id},
            )
    conn.execute(sa.text(
        "UPDATE usuarios SET display_name = COALESCE(display_name, nombre_completo)"))
    conn.execute(sa.text(
        "UPDATE usuarios SET password_changed_at = COALESCE(password_changed_at, CURRENT_TIMESTAMP)"))
    conn.execute(sa.text(
        "UPDATE usuarios SET is_active = CASE WHEN estado = 'activo' THEN TRUE ELSE FALSE END"))
    conn.execute(sa.text("UPDATE usuarios SET is_locked = FALSE"))
    conn.execute(sa.text("UPDATE usuarios SET failed_login_attempts = 0"))

    with op.batch_alter_table('usuarios') as batch:
        batch.alter_column('email', existing_type=sa.String(
            length=255), nullable=False)
        batch.alter_column('is_active', server_default=None)
        batch.alter_column('is_locked', server_default=None)
        batch.alter_column('failed_login_attempts', server_default=None)
        batch.alter_column('mfa_enabled', server_default=None)

    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=50), nullable=False, unique=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(),
                  server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(),
                  server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('key', sa.String(length=100), nullable=False, unique=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(),
                  server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'user_roles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey(
            'usuarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role_id', sa.Integer(), sa.ForeignKey(
            'roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assigned_by', sa.Integer(),
                  sa.ForeignKey('usuarios.id'), nullable=True),
        sa.Column('assigned_at', sa.DateTime(),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'role_id', name='uq_user_role'),
    )

    op.create_table(
        'role_permissions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('role_id', sa.Integer(), sa.ForeignKey(
            'roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('permission_id', sa.Integer(), sa.ForeignKey(
            'permissions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('role_id', 'permission_id',
                            name='uq_role_permission'),
    )

    op.create_table(
        'password_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey(
            'usuarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('password_hash', sa.String(length=256), nullable=False),
        sa.Column('created_at', sa.DateTime(),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_password_history_user_created',
                    'password_history', ['user_id', 'created_at'])

    op.create_table(
        'login_attempts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey(
            'usuarios.id', ondelete='SET NULL'), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('ip', sa.String(length=45), nullable=False),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('mfa_required', sa.Boolean(), nullable=False,
                  server_default=sa.text('FALSE')),
        sa.Column('created_at', sa.DateTime(),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_login_attempts_email_created',
                    'login_attempts', ['email', 'created_at'])
    op.create_index('ix_login_attempts_ip_created',
                    'login_attempts', ['ip', 'created_at'])

    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey(
            'usuarios.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(length=120), nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('ip', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('level', sa.String(length=20),
                  nullable=False, server_default='INFO'),
        sa.Column('created_at', sa.DateTime(),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_audit_logs_created', 'audit_logs', ['created_at'])

    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey(
            'usuarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_id', sa.String(length=64), nullable=False),
        sa.Column('token_hash', sa.String(length=256), nullable=False),
        sa.Column('created_at', sa.DateTime(),
                  server_default=sa.func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('replaced_by_token_id', sa.String(length=64), nullable=True),
        sa.Column('ip', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.UniqueConstraint('token_id', name='uq_refresh_token_id'),
    )
    op.create_index('ix_refresh_tokens_user_active',
                    'refresh_tokens', ['user_id', 'revoked_at'])

    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey(
            'usuarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(length=256), nullable=False),
        sa.Column('created_at', sa.DateTime(),
                  server_default=sa.func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('token_hash', name='uq_password_reset_token_hash'),
    )
    op.create_index('ix_password_reset_user',
                    'password_reset_tokens', ['user_id'])

    op.create_table(
        'backup_codes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey(
            'usuarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('salt', sa.String(length=64), nullable=False),
        sa.Column('code_hash', sa.String(length=256), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False,
                  server_default=sa.text('FALSE')),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'code_hash',
                            name='uq_backup_code_hash'),
    )
    op.create_index('ix_backup_codes_user', 'backup_codes', ['user_id'])


def downgrade():
    op.drop_index('ix_backup_codes_user', table_name='backup_codes')
    op.drop_table('backup_codes')
    op.drop_index('ix_password_reset_user', table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')
    op.drop_index('ix_refresh_tokens_user_active', table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
    op.drop_index('ix_audit_logs_created', table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_index('ix_login_attempts_ip_created', table_name='login_attempts')
    op.drop_index('ix_login_attempts_email_created',
                  table_name='login_attempts')
    op.drop_table('login_attempts')
    op.drop_index('ix_password_history_user_created',
                  table_name='password_history')
    op.drop_table('password_history')
    op.drop_table('role_permissions')
    op.drop_table('user_roles')
    op.drop_table('permissions')
    op.drop_table('roles')
    with op.batch_alter_table('usuarios') as batch:
        batch.drop_column('updated_at')
        batch.drop_column('last_login_user_agent')
        batch.drop_column('last_login_ip')
        batch.drop_column('last_login_at')
        batch.drop_column('mfa_backup_codes_salt')
        batch.drop_column('mfa_secret_encrypted')
        batch.drop_column('mfa_enabled')
        batch.drop_column('password_expires_at')
        batch.drop_column('password_changed_at')
        batch.drop_column('failed_login_attempts')
        batch.drop_column('locked_until')
        batch.drop_column('is_locked')
        batch.drop_column('is_active')
        batch.drop_column('display_name')
    op.alter_column('usuarios', 'email', existing_type=sa.String(
        length=255), nullable=True)
