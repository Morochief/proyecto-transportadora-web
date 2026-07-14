import logging
from app import db
from app.models import CRT

logger = logging.getLogger(__name__)

def get_next_crt_number(transportadora_id, codigo):
    """
    Calcula el siguiente número secuencial para un CRT de una transportadora,
    evitando colisiones e incrementando correctamente el secuencial.
    """
    if not transportadora_id or not codigo or len(codigo) != 11 or not codigo.startswith("PY") or not codigo[2:].isdigit():
        raise ValueError("Código inicial o ID de transportadora inválido")

    ultimo_crt = (
        CRT.query
        .filter(
            CRT.transportadora_id == transportadora_id,
            CRT.numero_crt.startswith("PY"),
            db.func.length(CRT.numero_crt) == 11
        )
        .order_by(CRT.numero_crt.desc())
        .first()
    )

    if ultimo_crt and ultimo_crt.numero_crt:
        try:
            ultimo_num = int(ultimo_crt.numero_crt[2:])
            siguiente = ultimo_num + 1
        except Exception:
            siguiente = int(codigo[2:])
    else:
        siguiente = int(codigo[2:])

    return f"PY{siguiente:09d}"
