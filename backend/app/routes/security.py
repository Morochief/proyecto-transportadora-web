"""Security endpoints for session management and audit logs"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from flask import Blueprint, jsonify, request, g
from sqlalchemy import and_, desc, or_

from app import db
from app.models import AuditLog, LoginAttempt, RefreshToken, Usuario
from app.security.decorators import auth_required, roles_required, verify_authentication
from app.security.tokens import find_valid_refresh_token, revoke_token
from app.services.audit_service import audit_event

security_bp = Blueprint('security', __name__, url_prefix='/api/security')
security_bp.before_request(verify_authentication)
logger = logging.getLogger(__name__)


@security_bp.route('/sessions', methods=['GET'])
@auth_required
def get_user_sessions():
    """Get all active sessions for the current user"""
    user: Usuario = g.current_user

    # Get all non-revoked refresh tokens
    sessions = (
        RefreshToken.query
        .filter(
            and_(
                RefreshToken.user_id == user.id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > datetime.utcnow()
            )
        )
        .order_by(desc(RefreshToken.created_at))
        .all()
    )

    return jsonify([
        {
            'id': session.id,
            'token_id': session.token_id,
            'created_at': session.created_at.isoformat() if session.created_at else None,
            'expires_at': session.expires_at.isoformat() if session.expires_at else None,
            'ip': session.ip,
            'user_agent': session.user_agent,
            'is_current': session.token_id == request.headers.get('X-Token-Id'),
        }
        for session in sessions
    ])


@security_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@auth_required
def revoke_session(session_id: int):
    """Revoke a specific session"""
    user: Usuario = g.current_user

    session = RefreshToken.query.filter_by(
        id=session_id,
        user_id=user.id
    ).first_or_404()

    if session.revoked_at:
        return jsonify({'error': 'Session already revoked'}), 400

    revoke_token(session)
    db.session.commit()

    audit_event(
        'session.revoked',
        user_id=user.id,
        ip=request.headers.get('X-Forwarded-For', request.remote_addr),
        user_agent=request.headers.get('User-Agent'),
        metadata={'session_id': session_id}
    )

    return jsonify({'status': 'ok'})


@security_bp.route('/sessions/revoke-all', methods=['POST'])
@auth_required
def revoke_all_sessions():
    """Revoke all sessions except the current one"""
    user: Usuario = g.current_user
    current_token_id = request.headers.get('X-Token-Id')

    # Get all active sessions
    sessions = (
        RefreshToken.query
        .filter(
            and_(
                RefreshToken.user_id == user.id,
                RefreshToken.revoked_at.is_(None)
            )
        )
        .all()
    )

    revoked_count = 0
    for session in sessions:
        if session.token_id != current_token_id:
            revoke_token(session)
            revoked_count += 1

    db.session.commit()

    audit_event(
        'sessions.revoked_all',
        user_id=user.id,
        ip=request.headers.get('X-Forwarded-For', request.remote_addr),
        user_agent=request.headers.get('User-Agent'),
        metadata={'revoked_count': revoked_count}
    )

    return jsonify({'status': 'ok', 'revoked_count': revoked_count})


@security_bp.route('/audit-logs', methods=['GET'])
@auth_required
@roles_required('admin')
def get_audit_logs():
    """Get audit logs with filtering (admin only)"""
    # Parse query parameters
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 100)
    user_id = request.args.get('user_id', type=int)
    action = request.args.get('action', type=str)
    level = request.args.get('level', type=str)
    start_date = request.args.get('start_date', type=str)
    end_date = request.args.get('end_date', type=str)
    search = request.args.get('search', type=str)

    # Build query
    query = AuditLog.query

    # Apply filters
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    if action:
        query = query.filter(AuditLog.action.ilike(f'%{action}%'))

    if level:
        query = query.filter(AuditLog.level == level.upper())

    if start_date:
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(AuditLog.created_at >= start)
        except ValueError:
            pass

    if end_date:
        try:
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(AuditLog.created_at <= end)
        except ValueError:
            pass

    if search:
        query = query.filter(
            or_(
                AuditLog.action.ilike(f'%{search}%'),
                AuditLog.ip.ilike(f'%{search}%')
            )
        )

    # Order by most recent first
    query = query.order_by(desc(AuditLog.created_at))

    # Paginate
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'logs': [
            {
                'id': log.id,
                'user_id': log.user_id,
                'user_email': log.user.email if log.user else None,
                'user_name': log.user.display_name if log.user else None,
                'action': log.action,
                'level': log.level,
                'ip': log.ip,
                'user_agent': log.user_agent,
                'metadata': log.metadata_json,
                'created_at': log.created_at.isoformat() if log.created_at else None,
            }
            for log in pagination.items
        ],
        'pagination': {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev,
        }
    })


@security_bp.route('/audit-logs/actions', methods=['GET'])
@auth_required
@roles_required('admin')
def get_audit_actions():
    """Get list of unique audit actions"""
    actions = db.session.query(AuditLog.action).distinct().all()
    return jsonify([action[0] for action in actions if action[0]])


@security_bp.route('/login-attempts', methods=['GET'])
@auth_required
def get_login_attempts():
    """Get login attempts for the current user"""
    user: Usuario = g.current_user

    # Get last 20 login attempts
    attempts = (
        LoginAttempt.query
        .filter(LoginAttempt.user_id == user.id)
        .order_by(desc(LoginAttempt.created_at))
        .limit(20)
        .all()
    )

    return jsonify([
        {
            'id': attempt.id,
            'ip': attempt.ip,
            'user_agent': attempt.user_agent,
            'success': attempt.success,
            'mfa_required': attempt.mfa_required,
            'created_at': attempt.created_at.isoformat() if attempt.created_at else None,
        }
        for attempt in attempts
    ])


@security_bp.route('/password-policy', methods=['GET'])
def get_password_policy():
    """Get password policy requirements"""
    from flask import current_app
    cfg = current_app.config

    return jsonify({
        'min_length': cfg.get('PASSWORD_MIN_LENGTH', 8),
        'require_uppercase': cfg.get('PASSWORD_REQUIRE_UPPERCASE', True),
        'require_lowercase': cfg.get('PASSWORD_REQUIRE_LOWERCASE', True),
        'require_digit': cfg.get('PASSWORD_REQUIRE_DIGIT', True),
        'require_special': cfg.get('PASSWORD_REQUIRE_SPECIAL', True),
        'history_limit': cfg.get('PASSWORD_HISTORY_LIMIT', 5),
        'expiration_days': cfg.get('PASSWORD_EXPIRATION_DAYS', 90),
    })
