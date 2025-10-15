import React, { useEffect, useState } from 'react';
import api from '../api/api';
import Toast from '../components/Toast';
import '../styles/AuditLogs.css';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    per_page: 20,
    action: '',
    level: '',
    user_id: '',
    search: '',
    start_date: '',
    end_date: '',
  });
  const [availableActions, setAvailableActions] = useState([]);
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
    fetchActions();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await api.get(`/security/audit-logs?${params}`);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (err) {
      showToast('Error al cargar los logs de auditoría', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchActions = async () => {
    try {
      const response = await api.get('/security/audit-logs/actions');
      setAvailableActions(response.data);
    } catch (err) {
      console.error('Error fetching actions:', err);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      per_page: 20,
      action: '',
      level: '',
      user_id: '',
      search: '',
      start_date: '',
      end_date: '',
    });
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
      second: '2-digit',
    });
  };

  const getLevelClass = (level) => {
    const levelMap = {
      INFO: 'level-info',
      WARNING: 'level-warning',
      ERROR: 'level-error',
      CRITICAL: 'level-critical',
    };
    return levelMap[level] || 'level-info';
  };

  const getLevelIcon = (level) => {
    const iconMap = {
      INFO: 'ℹ️',
      WARNING: '⚠️',
      ERROR: '❌',
      CRITICAL: '🔥',
    };
    return iconMap[level] || 'ℹ️';
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Fecha', 'Usuario', 'Acción', 'Nivel', 'IP'];
    const rows = logs.map((log) => [
      log.id,
      formatDate(log.created_at),
      log.user_email || 'Sistema',
      log.action,
      log.level,
      log.ip || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${new Date().toISOString()}.csv`;
    link.click();
    
    showToast('Logs exportados exitosamente', 'success');
  };

  return (
    <div className="audit-logs-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="audit-header">
        <h2>Logs de Auditoría</h2>
        <p className="audit-description">
          Registro completo de todas las acciones realizadas en el sistema
        </p>
      </div>

      <div className="audit-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label>Buscar</label>
            <input
              type="text"
              placeholder="IP, acción..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Acción</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <option value="">Todas</option>
              {availableActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Nivel</label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Desde</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Hasta</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
            />
          </div>
        </div>

        <div className="filters-actions">
          <button onClick={clearFilters} className="btn-secondary">
            Limpiar Filtros
          </button>
          <button onClick={exportToCSV} className="btn-primary" disabled={logs.length === 0}>
            Exportar CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Cargando logs...</div>
      ) : (
        <>
          <div className="logs-table">
            {logs.length === 0 ? (
              <div className="no-logs">
                <p>No se encontraron logs con los filtros aplicados</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Nivel</th>
                    <th>IP</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr
                        className={`log-row ${expandedLog === log.id ? 'expanded' : ''}`}
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      >
                        <td>{formatDate(log.created_at)}</td>
                        <td>
                          <div className="user-info">
                            <div className="user-name">{log.user_name || 'Sistema'}</div>
                            <div className="user-email">{log.user_email || '-'}</div>
                          </div>
                        </td>
                        <td>
                          <span className="action-badge">{log.action}</span>
                        </td>
                        <td>
                          <span className={`level-badge ${getLevelClass(log.level)}`}>
                            {getLevelIcon(log.level)} {log.level}
                          </span>
                        </td>
                        <td>{log.ip || 'N/A'}</td>
                        <td>
                          <button className="expand-btn">
                            {expandedLog === log.id ? '▼' : '▶'}
                          </button>
                        </td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr className="log-details-row">
                          <td colSpan="6">
                            <div className="log-details">
                              <div className="detail-section">
                                <h4>Detalles Completos</h4>
                                <div className="detail-grid">
                                  <div className="detail-item">
                                    <span className="detail-label">ID:</span>
                                    <span className="detail-value">{log.id}</span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="detail-label">User Agent:</span>
                                    <span className="detail-value">{log.user_agent || 'N/A'}</span>
                                  </div>
                                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                                    <div className="detail-item full-width">
                                      <span className="detail-label">Metadata:</span>
                                      <pre className="metadata-json">
                                        {JSON.stringify(log.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.has_prev}
                className="page-btn"
              >
                ← Anterior
              </button>
              <span className="page-info">
                Página {pagination.page} de {pagination.pages} ({pagination.total} total)
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.has_next}
                className="page-btn"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AuditLogs;
