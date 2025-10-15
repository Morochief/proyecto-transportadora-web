import json
from datetime import datetime
from typing import Any, Dict, Optional

import requests
from flask import current_app

from app import db
from app.models import AuditLog


def _should_send_siem() -> bool:
    cfg = current_app.config
    return cfg.get('ENABLE_SIEM_HOOKS') and bool(cfg.get('AUDIT_SIEM_ENDPOINT'))


def _send_to_siem(payload: Dict[str, Any]) -> None:
    try:
        headers = {'Content-Type': 'application/json'}
        token = current_app.config.get('AUDIT_SIEM_TOKEN')
        if token:
            headers['Authorization'] = f"Bearer {token}"
        requests.post(current_app.config['AUDIT_SIEM_ENDPOINT'], json=payload, timeout=3)
    except Exception:
        current_app.logger.warning('No se pudo enviar evento al SIEM', extra={'siem_payload': payload})


def audit_event(action: str, *, user_id: Optional[int], level: str = 'INFO', ip: Optional[str] = None, user_agent: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> None:
    metadata = metadata or {}
    log = AuditLog(
        user_id=user_id,
        action=action,
        metadata_json=metadata,
        ip=ip,
        user_agent=user_agent,
        level=level,
    )
    db.session.add(log)
    if _should_send_siem():
        payload = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'action': action,
            'user_id': user_id,
            'ip': ip,
            'user_agent': user_agent,
            'level': level,
            'metadata': metadata,
        }
        _send_to_siem(payload)
