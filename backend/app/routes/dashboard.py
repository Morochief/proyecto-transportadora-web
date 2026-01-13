"""Dashboard routes for aggregated statistics."""

from flask import Blueprint, jsonify
from sqlalchemy import func

from app import db
from app.models import Pais, Ciudad, Remitente, Transportadora, Moneda, Aduana, Honorario, CRT
from app.security.decorators import auth_required

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


@dashboard_bp.route('/stats', methods=['GET'])
@auth_required
def get_dashboard_stats():
    """Get aggregated statistics for dashboard in a single query."""
    try:
        stats = {
            'paises': db.session.query(func.count(Pais.id)).scalar() or 0,
            'ciudades': db.session.query(func.count(Ciudad.id)).scalar() or 0,
            'remitentes': db.session.query(func.count(Remitente.id)).scalar() or 0,
            'transportadoras': db.session.query(func.count(Transportadora.id)).scalar() or 0,
            'monedas': db.session.query(func.count(Moneda.id)).scalar() or 0,
            'aduanas': db.session.query(func.count(Aduana.id)).scalar() or 0,
            'honorarios': db.session.query(func.count(Honorario.id)).scalar() or 0,
            'crt': db.session.query(func.count(CRT.id)).scalar() or 0,
            'totalHonorarios': db.session.query(func.coalesce(func.sum(Honorario.monto), 0)).scalar() or 0,
            'usuarios': 0,  # TODO: add user count if needed
            'mic': 0,  # TODO: add MIC count when model is ready
            'usuariosConectados': 1,  # TODO: implement active sessions count
        }
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
