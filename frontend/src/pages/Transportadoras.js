import React, { useEffect, useState } from "react";
import api from "../api/api";
import { Search, Plus, Edit3, Trash2, Truck, Phone, MapPin, Building2, CreditCard, FileText, DollarSign, Eye, Loader2 } from "lucide-react";

// Modal de Honorarios mejorado
const HonorariosModal = ({ open, onClose, transportadora, honorarios }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-800">Honorarios</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4 text-sm text-slate-500">
            Historial para <span className="font-semibold text-slate-700">{transportadora?.nombre}</span>
          </div>
          {honorarios.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {honorarios.map((h) => (
                <div key={h.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-500">{h.fecha}</span>
                    <span className="text-sm font-bold text-emerald-600">{h.monto}</span>
                  </div>
                  <p className="text-slate-700 text-sm">{h.descripcion}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay honorarios registrados</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end pt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente Table mejorado
const EnhancedTable = ({ columns, data, onEdit, onDelete, loading }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = data.filter(item =>
    Object.values(item).some(value =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-indigo-600" />
        <p>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Search Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar transportadoras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((column) => (
                <th key={column.field} className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {column.label}
                </th>
              ))}
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-slate-50 transition-colors group">
                {columns.map((column) => (
                  <td key={column.field} className="px-6 py-4 text-slate-700 text-sm">
                    {column.render ? (
                      column.render(item[column.field], item)
                    ) : (
                      item[column.field] || <span className="text-slate-400">-</span>
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>No se encontraron transportadoras</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente FormModal
const EnhancedFormModal = ({ open, onClose, onSubmit, initialValues, fields, title }) => {
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
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
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
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${errors[field.name] ? 'border-red-300' : 'border-slate-300'}`}
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

function Transportadoras() {
  const [transportadoras, setTransportadoras] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTrans, setEditTrans] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [honorariosModalOpen, setHonorariosModalOpen] = useState(false);
  const [selectedHonorarios, setSelectedHonorarios] = useState([]);
  const [selectedTransportadora, setSelectedTransportadora] = useState(null);

  const formFields = [
    { name: "codigo", label: "Código", required: true },
    { name: "honorarios", label: "Honorarios", required: false, type: "number", step: "0.01", placeholder: "0.00" },
    {
      name: "moneda_honorarios_id", label: "Moneda de Honorarios", required: false, type: "select",
      options: [{ value: "", label: "-- Seleccionar --" }, ...monedas.map((m) => ({ value: m.id, label: `${m.simbolo} - ${m.nombre}` }))],
    },
    { name: "nombre", label: "Nombre", required: true },
    { name: "direccion", label: "Dirección", required: false },
    {
      name: "ciudad_id", label: "Ciudad", required: true, type: "select",
      options: ciudades.map((c) => ({ value: c.id, label: c.nombre })),
    },
    {
      name: "tipo_documento", label: "Tipo de Documento", required: false, type: "select",
      options: [
        { value: "", label: "-- Seleccionar --" },
        { value: "RUC", label: "RUC" }, { value: "CNPJ", label: "CNPJ" }, { value: "RUT", label: "RUT" },
        { value: "CUIT", label: "CUIT" }, { value: "CUIL", label: "CUIL" }, { value: "CPF", label: "CPF" },
        { value: "CI", label: "CI" }, { value: "DNI", label: "DNI" }, { value: "PASAPORTE", label: "Pasaporte" },
        { value: "OTRO", label: "Otro" },
      ],
    },
    { name: "numero_documento", label: "Número de Documento", required: false },
    { name: "telefono", label: "Teléfono", required: false },
    { name: "rol_contribuyente", label: "Rol del Contribuyente", required: false },
  ];

  useEffect(() => {
    fetchCiudades();
    fetchMonedas();
    fetchTransportadoras();
  }, []);

  const fetchCiudades = async () => {
    try {
      const res = await api.get("/ciudades/");
      setCiudades(res.data);
    } catch (error) { console.error(error); }
  };

  const fetchMonedas = async () => {
    try {
      const res = await api.get("/monedas/");
      setMonedas(res.data);
    } catch (error) { console.error(error); }
  };

  const fetchTransportadoras = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/transportadoras/");
      setTransportadoras(res.data.items || res.data);
    } catch (error) { console.error(error); }
    finally { setIsLoading(false); }
  };

  const handleAdd = () => { setEditTrans(null); setModalOpen(true); };
  const handleEdit = (trans) => { setEditTrans(trans); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar esta transportadora?")) {
      await api.delete(`/transportadoras/${id}`);
      fetchTransportadoras();
    }
  };

  const handleSubmit = async (data) => {
    try {
      if (editTrans) await api.put(`/transportadoras/${editTrans.id}`, data);
      else await api.post("/transportadoras/", data);
      setModalOpen(false);
      fetchTransportadoras();
    } catch (e) { alert("Error al guardar: " + (e.response?.data?.error || e.message)); }
  };

  const openHonorariosModal = (transportadora) => {
    setSelectedHonorarios(Array.isArray(transportadora.honorarios) ? transportadora.honorarios : []);
    setSelectedTransportadora(transportadora);
    setHonorariosModalOpen(true);
  };

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Gestión de Transportadoras</h1>
          <p className="text-slate-500 mt-1">Administra las empresas de transporte y sus honorarios.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            <span>Nueva Transportadora</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total</div>
          <div className="text-3xl font-bold text-slate-800 mt-2">{transportadoras.length}</div>
        </div>
      </div>

      <EnhancedTable
        columns={[
          { field: "codigo", label: "Código" },
          {
            field: "honorarios", label: "Honorarios",
            render: (h, row) => row.honorarios && row.moneda_honorarios ? (
              <span className="text-emerald-700 font-medium">{parseFloat(row.honorarios).toLocaleString('es-ES', { minimumFractionDigits: 2 })} {row.moneda_honorarios.simbolo}</span>
            ) : <span className="text-slate-400">Sin honorarios</span>
          },
          { field: "nombre", label: "Nombre" },
          {
            field: "ciudad_id", label: "Ciudad",
            render: (id) => {
              const ciudad = ciudades.find(c => c.id === id);
              return ciudad ? ciudad.nombre : id;
            }
          },
          { field: "tipo_documento", label: "Tipo Doc" },
          { field: "numero_documento", label: "Nro. Doc" },
          { field: "telefono", label: "Teléfono" },
          {
            field: "honorarios_registrados", label: "Historial",
            render: (h, row) => (
              <button
                onClick={() => openHonorariosModal(row)}
                className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-1.5 rounded transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
            )
          }
        ]}
        data={transportadoras}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
      />

      <EnhancedFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editTrans}
        fields={formFields}
        title={editTrans ? "Editar Transportadora" : "Nueva Transportadora"}
      />

      <HonorariosModal
        open={honorariosModalOpen}
        onClose={() => setHonorariosModalOpen(false)}
        transportadora={selectedTransportadora}
        honorarios={selectedHonorarios}
      />
    </div>
  );
}

export default Transportadoras;