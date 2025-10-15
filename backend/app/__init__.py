from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate

from app.security.rbac import ensure_roles_permissions
from app.utils.logging_config import configure_logging
from .seeds import ensure_admin_user

import traceback


db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    configure_logging(app)
    db.init_app(app)
    CORS(
        app,
        resources={
            r'/api/*': {'origins': app.config.get('CORS_ALLOW_ORIGINS', ['*'])}},
        supports_credentials=True,
    )
    Migrate(app, db)

    with app.app_context():
        from .routes.paises import paises_bp
        from .routes.ciudades import ciudades_bp
        from .routes.remitentes import remitentes_bp
        from .routes.transportadoras import transportadoras_bp
        from .routes.monedas import monedas_bp
        from .routes.honorarios import honorarios_bp
        from .routes.crt import crt_bp
        from .routes.mic import mic_bp
        from .routes.mic_guardados import mic_guardados_bp
        from .routes.usuarios import usuarios_bp
        from .routes.auth import auth_bp
        from .routes.security import security_bp
        from .docs import docs_bp

        for bp in [
            paises_bp,
            ciudades_bp,
            remitentes_bp,
            transportadoras_bp,
            monedas_bp,
            honorarios_bp,
            crt_bp,
            mic_bp,
            mic_guardados_bp,
            auth_bp,
            usuarios_bp,
            security_bp,
            docs_bp,
        ]:
            app.register_blueprint(bp)

        try:
            ensure_roles_permissions()
            ensure_admin_user()
        except Exception as e:
            # Tables may not exist yet during first migration
            app.logger.warning(f'Could not initialize roles/admin: {e}')

    @app.after_request
    def add_security_headers(response):
        allowed_origins = app.config.get('CORS_ALLOW_ORIGINS', ['*'])
        origin = request.headers.get('Origin')
        if '*' in allowed_origins:
            cors_origin = '*' if origin is None else origin
        elif origin in allowed_origins:
            cors_origin = origin
        else:
            cors_origin = allowed_origins[0] if allowed_origins else '*'
        response.headers['Access-Control-Allow-Origin'] = cors_origin
        response.headers['Access-Control-Allow-Methods'] = app.config.get(
            'CORS_ALLOW_METHODS', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
        response.headers['Access-Control-Allow-Headers'] = app.config.get(
            'CORS_ALLOW_HEADERS', 'Content-Type, Authorization')
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Content-Security-Policy'] = (
            f"default-src {app.config.get('CSP_DEFAULT_SRC', "'self'")}; "
            f"script-src {app.config.get('CSP_SCRIPT_SRC', "'self'")}; "
            f"style-src {app.config.get('CSP_STYLE_SRC', "'self'")};"
        )
        return response

    @app.route('/api/<path:path>', methods=['OPTIONS'])
    def options_api(path):
        return '', 204

    @app.route('/favicon.ico')
    def favicon():
        return '', 204

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'ok',
            'message': 'Sistema logistico en linea',
            'version': '2.0',
        })

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({'error': 'Endpoint no encontrado'}), 404

    @app.errorhandler(500)
    def internal_error(_):
        return jsonify({'error': 'Error interno del servidor'}), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        trace = traceback.format_exc()
        app.logger.error('Unhandled exception', extra={'trace': trace})
        return jsonify({'error': 'Error interno del servidor'}), 500

    app.debug = app.config.get('DEBUG', False)
    return app
