import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Search, Filter, Eye, Download, Trash2, Calendar, Truck,
  FileText, CheckCircle, AlertCircle, X, ChevronLeft, ChevronRight, BarChart3, RefreshCw
} from "lucide-react";

export default function MICsGuardados() {
  const [mics, setMics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMic, setSelectedMic] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [perPage] = useState(15);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);

  const [filters, setFilters] = useState({
    estado: '', numero_carta: '', fecha_desde: '', fecha_hasta: '', transportadora: '', placa: '', destino: ''
  });

  // Modal de eliminaciÃ³n
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [micToDelete, setMicToDelete] = useState(null);

  const confirmDelete = (mic) => {
    setMicToDelete(mic);
    setShowDeleteModal(true);
  };

  const executeDelete = async (hardDelete = false) => {
    if (!micToDelete) return;
    try {
      await axios.delete(`http://localhost:5000/api/mic-guardados/${micToDelete.id}`, {
        params: { hard_delete: hardDelete }
      });
      toast.success(hardDelete ? '✅ MIC eliminado definitivamente' : '✅ MIC anulado');
      cargarMics(currentPage, filters);
      setShowDeleteModal(false);
      setMicToDelete(null);
    } catch (error) { toast.error('Error al eliminar/anular'); }
  };

  const restaurarMic = async (mic) => {
    if (!window.confirm(`¿Seguro desea restaurar el MIC ${mic.numero_carta_porte}?`)) return;
    try {
      await axios.post(`http://localhost:5000/api/mic-guardados/${mic.id}/restaurar`);
      toast.success('✅ MIC restaurado');
      cargarMics(currentPage, filters);
    } catch (error) { toast.error('Error al restaurar MIC'); }
  };

  const cargarMics = useCallback(async (page = 1, filtros = {}) => {
    setLoading(true);
    try {
      const params = { page, per_page: perPage, ...filtros };
      const response = await axios.get('http://localhost:5000/api/mic-guardados/', { params });
      setMics(response.data.mics);
      setCurrentPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.pages);
      setTotalItems(response.data.pagination.total);
      if (response.data.mics.length === 0 && Object.values(filtros).some(v => v)) {
        toast.info("🔍 No se encontraron MICs");
      }
    } catch (error) { toast.error("❌ Error cargando MICs"); }
    finally { setLoading(false); }
  }, [perPage]);

  const cargarEstadisticas = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/mic-guardados/stats');
      setStats(response.data);
    } catch (error) { console.error('Error stats', error); }
  };

  useEffect(() => { cargarMics(); cargarEstadisticas(); }, [cargarMics]);

  const aplicarFiltros = () => { cargarMics(1, filters); setCurrentPage(1); setShowFilters(false); };
  const limpiarFiltros = () => {
    setFilters({ estado: '', numero_carta: '', fecha_desde: '', fecha_hasta: '', transportadora: '', placa: '', destino: '' });
    cargarMics();
  };

  const verDetalles = async (micId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/mic-guardados/${micId}`);
      setSelectedMic(response.data);
      setShowModal(true);
    } catch (error) { toast.error('Error cargando detalles'); }
  };

  const descargarPDF = async (micId, numeroCarta) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/mic-guardados/${micId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url;
      link.download = `MIC_${numeroCarta || micId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('📄 PDF descargado');
    } catch (error) { toast.error('Error descargando PDF'); }
  };



  const formatearFecha = (fecha) => {
    if (!fecha) return "N/A";
    try { return new Date(fecha).toLocaleDateString('es-PY'); } catch { return fecha; }
  };

  return (
    <div className="min-h-full space-y-6 animate-in fade-in duration-500 pb-10">
      <ToastContainer position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">MICs Guardados</h1>
          <p className="text-slate-500 mt-1">Gestión de Manifiestos de Carga ({totalItems} registros)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowStats(!showStats)} className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition flex items-center gap-2 font-medium">
            <BarChart3 className="w-4 h-4" /> Estadísticas
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition flex items-center gap-2 font-medium">
            <Filter className="w-4 h-4" /> Filtros
          </button>
          <button onClick={() => cargarMics(currentPage, filters)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-md transition flex items-center gap-2 font-medium">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      {showStats && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-in slide-in-from-top-4">
          <StatCard label="Total MICs" value={stats.total_mics} color="indigo" />
          <StatCard label="Hoy" value={stats.mics_hoy} color="blue" />
          <StatCard label="Esta Semana" value={stats.mics_semana} color="purple" />
          {stats.por_estado.map((s, i) => (
            <StatCard key={i} label={s.estado} value={s.cantidad} color={s.estado === 'ANULADO' ? 'red' : 'emerald'} />
          ))}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            <div> <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label> <select value={filters.estado} onChange={e => setFilters({ ...filters, estado: e.target.value })} className="w-full p-2 border rounded-lg text-sm"><option value="">Todos</option><option value="PROVISORIO">PROVISORIO</option><option value="DEFINITIVO">DEFINITIVO</option><option value="ANULADO">ANULADO</option></select> </div>
            <div> <label className="block text-xs font-bold text-slate-500 mb-1">Nº Carta</label> <input value={filters.numero_carta} onChange={e => setFilters({ ...filters, numero_carta: e.target.value })} className="w-full p-2 border rounded-lg text-sm" placeholder="Buscar..." /> </div>
            <div> <label className="block text-xs font-bold text-slate-500 mb-1">Transportadora</label> <input value={filters.transportadora} onChange={e => setFilters({ ...filters, transportadora: e.target.value })} className="w-full p-2 border rounded-lg text-sm" placeholder="Buscar..." /> </div>
            <div> <label className="block text-xs font-bold text-slate-500 mb-1">Placa</label> <input value={filters.placa} onChange={e => setFilters({ ...filters, placa: e.target.value })} className="w-full p-2 border rounded-lg text-sm" placeholder="Buscar..." /> </div>
            <div> <label className="block text-xs font-bold text-slate-500 mb-1">Destino</label> <input value={filters.destino} onChange={e => setFilters({ ...filters, destino: e.target.value })} className="w-full p-2 border rounded-lg text-sm" placeholder="Buscar..." /> </div>
            <div> <label className="block text-xs font-bold text-slate-500 mb-1">Desde</label> <input type="date" value={filters.fecha_desde} onChange={e => setFilters({ ...filters, fecha_desde: e.target.value })} className="w-full p-2 border rounded-lg text-sm" /> </div>
            <div> <label className="block text-xs font-bold text-slate-500 mb-1">Hasta</label> <input type="date" value={filters.fecha_hasta} onChange={e => setFilters({ ...filters, fecha_hasta: e.target.value })} className="w-full p-2 border rounded-lg text-sm" /> </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={limpiarFiltros} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Limpiar</button>
            <button onClick={aplicarFiltros} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium">Aplicar Filtros</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Cargando datos...</div>
        ) : mics.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <FileText className="w-12 h-12 mb-2 opacity-20" />
            <p>No se encontraron MICs</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Nº Carta</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Transportadora</th>
                  <th className="px-6 py-3">Destino</th>
                  <th className="px-6 py-3">Placa</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mics.map(mic => (
                  <tr key={mic.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">#{mic.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{mic.numero_carta_porte || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${mic.estado === 'DEFINITIVO' ? 'bg-emerald-100 text-emerald-700' :
                        mic.estado === 'ANULADO' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{mic.estado}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatearFecha(mic.fecha_emision)}</td>
                    <td className="px-6 py-4 text-slate-600 truncate max-w-xs" title={mic.transportadora}>{mic.transportadora}</td>
                    <td className="px-6 py-4 text-slate-600">{mic.destino}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono">{mic.placa_camion}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => verDetalles(mic.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg" title="Ver Detalles"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => descargarPDF(mic.id, mic.numero_carta_porte)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg" title="Descargar PDF"><Download className="w-4 h-4" /></button>

                      {mic.estado === 'ANULADO' ? (
                        <button onClick={() => restaurarMic(mic)} className="p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg" title="Restaurar MIC"><RefreshCw className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => confirmDelete(mic)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg" title="Eliminar/Anular"><Trash2 className="w-4 h-4" /></button>
                      )}

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-sm text-slate-500">Página {currentPage} de {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => { if (currentPage > 1) { setCurrentPage(currentPage - 1); cargarMics(currentPage - 1, filters); } }} disabled={currentPage === 1} className="p-2 border rounded hover:bg-white disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => { if (currentPage < totalPages) { setCurrentPage(currentPage + 1); cargarMics(currentPage + 1, filters); } }} disabled={currentPage === totalPages} className="p-2 border rounded hover:bg-white disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {showDeleteModal && micToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-6 bg-white text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">¿Qué desea hacer con este MIC?</h3>
              <p className="text-slate-600 text-sm mb-6">
                MIC Nº <span className="font-mono font-bold">{micToDelete.numero_carta_porte}</span>
              </p>

              <div className="flex flex-col gap-3">
                <button onClick={() => executeDelete(false)} className="w-full py-3 px-4 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium rounded-lg border border-amber-200 transition-colors flex items-center justify-center gap-2">
                  <X className="w-4 h-4" /> Anular (Dejar en historial)
                </button>
                <button onClick={() => executeDelete(true)} className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-lg border border-red-200 transition-colors flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> Eliminar Totalmente
                </button>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-center">
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-500 hover:text-slate-700 font-medium text-sm">Cancelar operación</button>
            </div>
          </div>
        </div>
      )}

      {showModal && selectedMic && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Detalles MIC #{selectedMic.id}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="p-6 overflow-y-auto bg-white">
              <MICDetalles mic={selectedMic} />
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => descargarPDF(selectedMic.id, selectedMic.campo_23_numero_campo2_crt)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors flex items-center gap-2"><Download className="w-4 h-4" /> Descargar PDF</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-white text-slate-700 font-medium transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard = ({ label, value, color }) => (
  <div className={`bg-${color}-50 border border-${color}-100 p-4 rounded-xl flex flex-col items-center justify-center`}>
    <span className={`text-2xl font-bold text-${color}-700`}>{value}</span>
    <span className={`text-xs font-semibold text-${color}-600 uppercase tracking-wider`}>{label}</span>
  </div>
);

function MICDetalles({ mic }) {
  const fields = [
    { k: 'campo_23_numero_campo2_crt', l: 'Nº Carta' }, { k: 'campo_4_estado', l: 'Estado' }, { k: 'campo_6_fecha', l: 'Fecha' },
    { k: 'campo_1_transporte', l: 'Transportadora', full: true }, { k: 'campo_8_destino', l: 'Destino' },
    { k: 'campo_11_placa', l: 'Placa' }, { k: 'campo_12_modelo_chasis', l: 'Modelo' },
    { k: 'campo_28_total', l: 'Flete Total' }, { k: 'campo_27_valor_campo16', l: 'Valor FOT' },
    { k: 'campo_38_datos_campo11_crt', l: 'Mercadería', full: true }
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map(f => (
        <div key={f.k} className={`${f.full ? 'md:col-span-2' : ''} bg-slate-50 p-3 rounded-lg border border-slate-100`}>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{f.l}</label>
          <p className="text-sm text-slate-800 break-words whitespace-pre-wrap">{mic[f.k] || '-'}</p>
        </div>
      ))}
    </div>
  );
}