from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
import traceback

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    db.init_app(app)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    migrate = Migrate(app, db)

    with app.app_context():
        # 🔹 Se eliminó import y registro de auth_bp
        # 🔹 Puedes quitar usuarios_bp si no lo necesitas
        from .routes.paises import paises_bp
        from .routes.ciudades import ciudades_bp
        from .routes.remitentes import remitentes_bp
        from .routes.transportadoras import transportadoras_bp
        from .routes.monedas import monedas_bp
        from .routes.honorarios import honorarios_bp
        from .routes.movimientos import movimientos_bp
        from .routes.reportes import reportes_bp
        from .routes.parametros import parametros_bp
        from app.routes.crt import crt_bp
        from app.routes.mic import mic_bp

        # ✅ Se registran solo los módulos necesarios
        app.register_blueprint(paises_bp)
        app.register_blueprint(ciudades_bp)
        app.register_blueprint(remitentes_bp)
        app.register_blueprint(transportadoras_bp)
        app.register_blueprint(monedas_bp)
        app.register_blueprint(honorarios_bp)
        app.register_blueprint(movimientos_bp)
        app.register_blueprint(reportes_bp)
        app.register_blueprint(parametros_bp)
        app.register_blueprint(crt_bp)
        app.register_blueprint(mic_bp)

    # 🚀 CORRIGE HEADERS DE CORS DESPUÉS DE CADA RESPUESTA
    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

    # 🚀 RUTA para OPTIONS de cualquier ruta /api/*
    @app.route("/api/<path:path>", methods=["OPTIONS"])
    def options_api(path):
        return '', 204

    # 🚀 RUTA para favicon
    @app.route('/favicon.ico')
    def favicon():
        return '', 204

    # 🚀 HANDLER GLOBAL PARA ERRORES
    @app.errorhandler(Exception)
    def handle_exception(e):
        trace = traceback.format_exc()
        print("\n" + trace)
        return jsonify({
            "error": str(e),
            "trace": trace
        }), 500

    # ✅ Activa el modo debug
    app.debug = True

    return app
