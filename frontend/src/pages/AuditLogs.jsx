import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { Search, Filter, Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, AlertCircle, Info, PauseCircle, Activity } from 'lucide-react';

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

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({ page: 1, per_page: 20, action: '', level: '', search: '', start_date: '', end_date: '' });
  const [availableActions, setAvailableActions] = useState([]);
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
    fetchActions();
    // eslint-disable-next-line
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => { if (value) params.append(key, value); });
      const response = await api.get(`/security/audit-logs?${params}`);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (err) { setToast({ message: 'Error cargando logs', type: 'error' }); } finally { setLoading(false); }
  };

  const fetchActions = async () => {
    try { const response = await api.get('/security/audit-logs/actions'); setAvailableActions(response.data); } catch (err) { console.error(err); }
  };

  const handleFilterChange = (key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  const handlePageChange = (newPage) => setFilters((prev) => ({ ...prev, page: newPage }));
  const clearFilters = () => setFilters({ page: 1, per_page: 20, action: '', level: '', search: '', start_date: '', end_date: '' });

  const formatDate = (dateString) => new Date(dateString).toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const getLevelBadge = (level) => {
    switch (level) {
      case 'INFO': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"><Info className="w-3 h-3" /> INFO</span>;
      case 'WARNING': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><PauseCircle className="w-3 h-3" /> WARNING</span>; // PauseCircle as Warning icon replacement
      case 'ERROR': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200"><AlertCircle className="w-3 h-3" /> ERROR</span>;
      case 'CRITICAL': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 font-bold"><Activity className="w-3 h-3" /> CRITICAL</span>;
      default: return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">{level}</span>;
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Fecha', 'Usuario', 'Acción', 'Nivel', 'IP'];
    const rows = logs.map(l => [l.id, formatDate(l.created_at), l.user_email || 'Sistema', l.action, l.level, l.ip || 'N/A']);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `audit-logs-${new Date().toISOString()}.csv`;
    link.click();
    setToast({ message: 'Exportado exitosamente', type: 'success' });
  };

  return (
    <div className="min-h-full space-y-6 animate-in fade-in duration-500">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Logs de Auditoría</h1>
          <p className="text-slate-500 mt-1">Registro de actividad y seguridad del sistema.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportToCSV} disabled={logs.length === 0} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por IP, usuario..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Todas las acciones</option>
              {availableActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Todos los niveles</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
          <button onClick={clearFilters} className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm font-medium transition-colors">
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acción</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nivel</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">IP</th>
                <th className="px-6 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-500">Cargando...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-500">No se encontraron logs</td></tr>
              ) : (
                logs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${expandedLog === log.id ? 'bg-slate-50' : ''}`}
                    >
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-slate-900">{log.user_name || 'Sistema'}</div>
                        <div className="text-xs text-slate-500">{log.user_email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{log.action}</td>
                      <td className="px-6 py-4 text-sm">{getLevelBadge(log.level)}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-mono">{log.ip || '-'}</td>
                      <td className="px-6 py-4 text-slate-400">
                        {expandedLog === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr className="bg-slate-50">
                        <td colSpan="6" className="px-6 py-0">
                          <div className="py-4 pl-4 border-l-2 border-indigo-500 ml-2 space-y-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detalles Técnicos</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-500 block text-xs">ID Log</span>
                                <span className="font-mono text-slate-700">{log.id}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-xs">User Agent</span>
                                <span className="text-slate-700 break-all">{log.user_agent}</span>
                              </div>
                            </div>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="mt-4">
                                <span className="text-slate-500 block text-xs mb-1">Metadata</span>
                                <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs overflow-x-auto font-mono">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Pag {pagination.page} de {pagination.pages} ({pagination.total} total)
            </div>
            <div className="flex gap-2">
              <button onClick={() => handlePageChange(pagination.page - 1)} disabled={!pagination.has_prev} className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => handlePageChange(pagination.page + 1)} disabled={!pagination.has_next} className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLogs;
