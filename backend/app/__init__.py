from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    db.init_app(app)
    CORS(app)
    with app.app_context():
        from .routes.auth import auth_bp
        from .routes.usuarios import usuarios_bp
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


        app.register_blueprint(auth_bp)
        app.register_blueprint(usuarios_bp)
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
    return app
