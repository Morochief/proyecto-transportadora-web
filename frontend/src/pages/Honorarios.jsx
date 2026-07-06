import React, { useEffect, useState } from "react";
import api from "../api/api";
import { Search, Plus, Edit3, Trash2, DollarSign, Truck, Calendar, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from 'react-toastify';
import EnhancedTable from '../components/EnhancedTable';
import FormModal from '../components/FormModal';

// Componente Table con expansión

// Componente FormModal) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(initialValues || {});
      setErrors({});
    }
  }, [open, initialValues]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {fields.map((field) => (
            <div key={field.name} className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                {field.type === 'select' ? (
                  <select
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${errors[field.name] ? 'border-red-300' : 'border-slate-300'}`}
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || "text"}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    readOnly={field.readOnly}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${field.readOnly ? 'bg-slate-50 text-slate-500' : ''} ${errors[field.name] ? 'border-red-300' : 'border-slate-300'}`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0 flex gap-3">
          <button onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white font-medium">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex justify-center items-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {initialValues ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
};

function Honorarios() {
  const [honorarios, setHonorarios] = useState([]);
  const [transportadoras, setTransportadoras] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editHonorario, setEditHonorario] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 15;

  // Filtros
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  useEffect(() => {
    fetchData();
  }, [currentPage, search, filterTipo]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        per_page: perPage,
        ...(search && { search }),
        ...(filterTipo && { tipo_operacion: filterTipo })
      });

      const [transRes, monRes, honRes] = await Promise.all([
        api.get("/transportadoras/"),
        api.get("/monedas/"),
        api.get(`/honorarios/?${params}`)
      ]);
      setTransportadoras(transRes.data.items || transRes.data);
      setMonedas(monRes.data.items || monRes.data);
      setHonorarios(honRes.data.items || []);
      setTotalPages(honRes.data.pages || 1);
      setTotalItems(honRes.data.total || 0);
    } catch (err) {
      console.error("Error cargando datos", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditHonorario(null);
    setModalOpen(true);
  };

  const handleEdit = (honorario) => {
    setEditHonorario(honorario);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este honorario?")) {
      try {
        await api.delete(`/honorarios/${id}`);
        fetchData();
      } catch (e) {
        toast.error("Error al eliminar");
      }
    }
  };

  const handleSubmit = async (data) => {
    if (!data.transportadora_id || !data.moneda_id) {
      toast.warning("Debes seleccionar transportadora y moneda.");
      return;
    }
    try {
      if (editHonorario) await api.put(`/honorarios/${editHonorario.id}`, data);
      else await api.post("/honorarios/", data);
      setModalOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Error al guardar honorario: " + (e.response?.data?.error || e.message));
    }
  };

  const formFields = [
    {
      name: "transportadora_id", label: "Transportadora", required: true, type: "select",
      options: [{ value: "", label: "-- Seleccionar --" }, ...transportadoras.map((t) => ({ value: t.id, label: t.nombre }))]
    },
    { name: "monto", label: "Monto", required: true, type: "number", step: "0.01" },
    {
      name: "moneda_id", label: "Moneda", required: true, type: "select",
      options: [{ value: "", label: "-- Seleccionar --" }, ...monedas.map((m) => ({ value: m.id, label: m.nombre + " (" + m.simbolo + ")" }))]
    },
    {
      name: "tipo_operacion", label: "Tipo de Operación", required: true, type: "select",
      options: [
        { value: "EXPORTACION", label: "EXPORTACIÓN" },
        { value: "IMPORTACION", label: "IMPORTACIÓN" }
      ]
    },
    { name: "fecha", label: "Fecha", required: false, type: "date" },
    { name: "descripcion", label: "Descripción", required: false, type: "text" },
    { name: "mic_numero", label: "Número MIC (Manual/Auto)", required: false, type: "text", placeholder: "Opcional" },
    { name: "chofer", label: "Chofer", required: false, type: "text", placeholder: "Opcional" },
    { name: "placas", label: "Placas (Camión / Semi)", required: false, type: "text", placeholder: "Opcional" },
    { name: "observaciones", label: "Observaciones", required: false, type: "text", placeholder: "Opcional" }
  ];

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Gestión de Honorarios</h1>
          <p className="text-slate-500 mt-1">Registro de pagos y tarifas a transportadoras.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            <span>Nuevo Honorario</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-500 mb-1">Buscar</label>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="MIC, chofer, descripción..."
            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="w-48">
          <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo Operación</label>
          <select
            value={filterTipo}
            onChange={(e) => { setFilterTipo(e.target.value); setCurrentPage(1); }}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="">Todos</option>
            <option value="EXPORTACION">Exportación</option>
            <option value="IMPORTACION">Importación</option>
          </select>
        </div>
        <div className="text-sm text-slate-500">
          <span className="font-bold text-indigo-600">{totalItems}</span> registros
        </div>
      </div>

      <EnhancedTable
        columns={[
          {
            field: "codigo",
            label: "Código",
            render: (val) => <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">{val || '-'}</span>
          },
          {
            field: "transportadora_nombre",
            label: "Transportadora",
            render: (val) => (
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-700">{val || 'Desconocida'}</span>
              </div>
            )
          },
          {
            field: "monto",
            label: "Monto",
            render: (val, row) => (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded whitespace-nowrap">
                {parseFloat(val).toLocaleString('es-ES', { minimumFractionDigits: 2 })} {row.moneda_simbolo || ''}
              </span>
            )
          },
          {
            field: "tipo_operacion",
            label: "Tipo",
            render: (val) => (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${val === 'EXPORTACION'
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-green-100 text-green-800 border border-green-200'
                }`}>
                {val === 'EXPORTACION' ? '📤 Exportación' : '📥 Importación'}
              </span>
            )
          },
          {
            field: "crt_numero",
            label: "CRT",
            render: (val) => (
              <span className="font-mono text-xs text-slate-700">{val || 'N/A'}</span>
            )
          },
          {
            field: "mic_numero",
            label: "MIC",
            render: (val) => (
              <span className="font-mono text-xs text-emerald-600">{val || '-'}</span>
            )
          }
        ]}
        data={honorarios}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
        expandable={true}
        renderExpandedContent={(row) => (
          <div className="px-10 py-4 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Fecha</label>
                <div className="flex items-center gap-2 text-slate-700">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {row.fecha || '-'}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Descripción</label>
                <div className="text-slate-700">{row.descripcion || '-'}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Placas</label>
                <div className="text-slate-700">{row.placas || '-'}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Chofer</label>
                <div className="text-slate-700">{row.chofer || '-'}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Exportador</label>
                <div className="text-slate-700">{row.exportador || '-'}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Importador</label>
                <div className="text-slate-700">{row.importador || '-'}</div>
              </div>
              <div className="lg:col-span-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Observaciones</label>
                <div className="text-slate-700">{row.observaciones || '-'}</div>
              </div>
            </div>
          </div>
        )}
      />

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Página <span className="font-bold">{currentPage}</span> de <span className="font-bold">{totalPages}</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      <EnhancedFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editHonorario}
        fields={formFields}
        title={editHonorario ? "Editar Honorario" : "Nuevo Honorario"}
      />
    </div>
  );
}

export default Honorarios;