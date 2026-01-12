import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, Edit3, Trash2, Building2, Flag, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

// Configuración de la API
const API_BASE_URL = "http://localhost:5000/api";

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
            placeholder="Buscar..."
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
                  <td key={column.field} className="px-6 py-4 text-slate-700">
                    {column.field === 'id' ? (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {item[column.field]}
                      </span>
                    ) : column.field === 'pais' ? (
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-slate-400" />
                        <span>{item[column.field]}</span>
                      </div>
                    ) : (
                      item[column.field]
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
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>No se encontraron registros</p>
          </div>
        )}
      </div>
    </div>
  );
};

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

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nombre || formData.nombre.trim().length < 2) {
      newErrors.nombre = "Nombre requerido";
    }
    if (!formData.pais_id) {
      newErrors.pais_id = "Seleccione un país";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
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
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                {field.type === 'select' ? (
                  <select
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, parseInt(e.target.value) || e.target.value)}
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
                    readOnly={field.readOnly}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${field.readOnly ? 'bg-slate-50 text-slate-500' : ''
                      } ${errors[field.name] ? 'border-red-300' : 'border-slate-300'}`}
                  />
                )}
              </div>
              {errors[field.name] && <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>}
            </div>
          ))}

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Cancelar</button>
            <button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex justify-center items-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialValues ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationToast = ({ message, type, onClose }) => {
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

function Ciudades() {
  const [ciudades, setCiudades] = useState([]);
  const [paises, setPaises] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCiudad, setEditCiudad] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const formFields = [
    ...(editCiudad ? [{ name: "id", label: "Código", readOnly: true, type: "text" }] : []),
    { name: "nombre", label: "Nombre de la Ciudad", required: true },
    {
      name: "pais_id", label: "País", required: true, type: "select",
      options: [{ value: "", label: "---Seleccionar País---" }, ...paises.map((p) => ({ value: p.id, label: p.nombre }))]
    },
  ];

  const showNotification = (message, type = 'info') => setNotification({ message, type });

  const apiCall = async (url, method = 'GET', data = null) => {
    const config = { method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined };
    const res = await fetch(`${API_BASE_URL}${url}`, config);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  };

  const fetchPaises = useCallback(async () => {
    try {
      const response = await apiCall('/paises/');
      setPaises(response);
    } catch (error) { setPaises([]); }
  }, []);

  const fetchCiudades = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiCall('/ciudades/');
      setCiudades(response);
    } catch (error) { setCiudades([]); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    const loadData = async () => { await fetchPaises(); await fetchCiudades(); };
    loadData();
  }, [fetchPaises, fetchCiudades]);

  const handleAdd = () => { setEditCiudad(null); setModalOpen(true); };
  const handleEdit = (ciudad) => { setEditCiudad(ciudad); setModalOpen(true); };
  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta ciudad?")) return;
    try {
      await apiCall(`/ciudades/${id}`, 'DELETE');
      setCiudades(prev => prev.filter(c => c.id !== id));
      showNotification('Ciudad eliminada', 'success');
    } catch (error) { showNotification('Error al eliminar', 'error'); }
  };

  const handleSubmit = async (data) => {
    try {
      const paisSelected = paises.find(p => p.id === data.pais_id);
      if (editCiudad) {
        await apiCall(`/ciudades/${editCiudad.id}`, 'PUT', data);
        setCiudades(prev => prev.map(c => c.id === editCiudad.id ? { ...c, ...data, pais: paisSelected?.nombre || '' } : c));
        showNotification('Ciudad actualizada', 'success');
      } else {
        const res = await apiCall('/ciudades/', 'POST', data);
        setCiudades(prev => [...prev, { ...data, id: res.id || Date.now(), pais: paisSelected?.nombre || '' }]);
        showNotification('Ciudad creada', 'success');
      }
      setModalOpen(false);
    } catch (error) { showNotification('Error al guardar', 'error'); }
  };

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Gestión de Ciudades</h1>
          <p className="text-slate-500 mt-1">Administra las ciudades por país del sistema.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            <span>Nueva Ciudad</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Ciudades</div>
          <div className="text-3xl font-bold text-slate-800 mt-2">{ciudades.length}</div>
        </div>
      </div>

      <EnhancedTable
        columns={[{ field: "id", label: "Código" }, { field: "nombre", label: "Ciudad" }, { field: "pais", label: "País" }]}
        data={ciudades}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
      />

      <EnhancedFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editCiudad}
        fields={formFields}
        title={editCiudad ? "Editar Ciudad" : "Nueva Ciudad"}
      />
      {notification && <NotificationToast {...notification} onClose={() => setNotification(null)} />}
    </div>
  );
}

export default Ciudades;