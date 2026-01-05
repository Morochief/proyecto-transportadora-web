import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { Monitor, Smartphone, Globe, Clock, CheckCircle, AlertTriangle, Trash2, LogOut, Laptop } from 'lucide-react';

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
    type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
      'bg-blue-50 text-blue-800 border-blue-200';

  return (
    <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg border shadow-lg flex items-center gap-3 ${styles} animate-in slide-in-from-right duration-300`}>
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
    </div>
  );
};

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
    } catch (err) { setToast({ message: 'Error cargando sesiones', type: 'error' }); } finally { setLoading(false); }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('¿Está seguro de cerrar esta sesión?')) return;
    try {
      await api.delete(`/security/sessions/${sessionId}`);
      setToast({ message: 'Sesión cerrada', type: 'success' });
      fetchSessions();
    } catch (err) { setToast({ message: 'Error al cerrar sesión', type: 'error' }); }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm('¿Cerrar tadas las demás sesiones?')) return;
    try {
      const response = await api.post('/security/sessions/revoke-all');
      setToast({ message: `${response.data.revoked_count} sesiones cerradas`, type: 'success' });
      fetchSessions();
    } catch (err) { setToast({ message: 'Error al cerrar sesiones', type: 'error' }); }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const parseUserAgent = (ua) => {
    if (!ua) return { browser: 'Desconocido', os: 'Desconocido', icon: Monitor };
    let browser = 'Navegador';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    let os = 'OS';
    let icon = Monitor;
    if (ua.includes('Windows')) { os = 'Windows'; icon = Monitor; }
    else if (ua.includes('Mac')) { os = 'macOS'; icon = Laptop; }
    else if (ua.includes('Linux')) { os = 'Linux'; icon = Monitor; }
    else if (ua.includes('Android')) { os = 'Android'; icon = Smartphone; }
    else if (ua.includes('iOS')) { os = 'iOS'; icon = Smartphone; }

    return { browser, os, icon };
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando sesiones...</div>;

  return (
    <div className="min-h-full space-y-6 animate-in fade-in duration-500">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Sesiones Activas</h1>
          <p className="text-slate-500 mt-1">Gestiona los dispositivos donde tu cuenta está abierta.</p>
        </div>
        {sessions.length > 1 && (
          <button onClick={handleRevokeAll} className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium">
            <LogOut className="w-4 h-4" />
            Cerrar Todas las Demás
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800">Dispositivos Conectados</h3>
        </div>

        <div className="divide-y divide-slate-200">
          {sessions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No hay sesiones activas</div>
          ) : (
            sessions.map(session => {
              const { browser, os, icon: Icon } = parseUserAgent(session.user_agent);
              const isCurrent = session.is_current;
              return (
                <div key={session.id} className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${isCurrent ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isCurrent ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">{browser} en {os}</h4>
                        {isCurrent && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Este dispositivo</span>}
                      </div>
                      <div className="text-sm text-slate-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> IP: {session.ip || 'Desconocida'}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Activo desde: {formatDate(session.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="w-full md:w-auto px-4 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Cerrar Sesión
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Sessions;
