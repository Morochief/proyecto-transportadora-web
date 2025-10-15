import React, { useEffect, useState } from 'react';
import api from '../api/api';
import Toast from '../components/Toast';
import '../styles/Sessions.css';

function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/security/sessions');
      setSessions(response.data);
    } catch (err) {
      showToast('Error al cargar las sesiones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('¿Está seguro de cerrar esta sesión?')) {
      return;
    }

    try {
      await api.delete(`/security/sessions/${sessionId}`);
      showToast('Sesión cerrada exitosamente', 'success');
      fetchSessions();
    } catch (err) {
      showToast('Error al cerrar la sesión', 'error');
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm('¿Está seguro de cerrar todas las demás sesiones? Solo permanecerá activa la sesión actual.')) {
      return;
    }

    try {
      const response = await api.post('/security/sessions/revoke-all');
      showToast(`${response.data.revoked_count} sesión(es) cerrada(s)`, 'success');
      fetchSessions();
    } catch (err) {
      showToast('Error al cerrar las sesiones', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseUserAgent = (ua) => {
    if (!ua) return { browser: 'Desconocido', os: 'Desconocido' };
    
    // Simple user agent parsing
    let browser = 'Desconocido';
    let os = 'Desconocido';

    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS')) os = 'iOS';

    return { browser, os };
  };

  if (loading) {
    return (
      <div className="sessions-page">
        <div className="loading">Cargando sesiones...</div>
      </div>
    );
  }

  return (
    <div className="sessions-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="sessions-header">
        <h2>Administrar Sesiones</h2>
        <p className="sessions-description">
          Estas son todas las sesiones activas en su cuenta. Puede cerrar sesiones individuales o cerrar todas excepto la actual.
        </p>
      </div>

      {sessions.length > 1 && (
        <div className="sessions-actions">
          <button onClick={handleRevokeAll} className="btn-danger">
            Cerrar Todas las Demás Sesiones
          </button>
        </div>
      )}

      <div className="sessions-list">
        {sessions.length === 0 ? (
          <div className="no-sessions">
            <p>No hay sesiones activas</p>
          </div>
        ) : (
          sessions.map((session) => {
            const { browser, os } = parseUserAgent(session.user_agent);
            const isExpiringSoon = new Date(session.expires_at) - new Date() < 24 * 60 * 60 * 1000;

            return (
              <div
                key={session.id}
                className={`session-card ${session.is_current ? 'current-session' : ''}`}
              >
                {session.is_current && (
                  <div className="current-badge">Sesión Actual</div>
                )}

                <div className="session-info">
                  <div className="session-device">
                    <span className="device-icon">🖥️</span>
                    <div className="device-details">
                      <div className="device-name">
                        {browser} en {os}
                      </div>
                      <div className="device-ip">IP: {session.ip || 'Desconocida'}</div>
                    </div>
                  </div>

                  <div className="session-meta">
                    <div className="meta-item">
                      <span className="meta-label">Creada:</span>
                      <span className="meta-value">{formatDate(session.created_at)}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Expira:</span>
                      <span className={`meta-value ${isExpiringSoon ? 'expiring-soon' : ''}`}>
                        {formatDate(session.expires_at)}
                        {isExpiringSoon && ' ⚠️'}
                      </span>
                    </div>
                  </div>
                </div>

                {!session.is_current && (
                  <div className="session-actions">
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="btn-revoke"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Sessions;
