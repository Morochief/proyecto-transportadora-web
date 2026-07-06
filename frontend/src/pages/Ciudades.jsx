import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, Edit3, Trash2, Building2, Flag, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from 'react-toastify';
import api from "../api/api";
import EnhancedTable from '../components/EnhancedTable';
import FormModal from '../components/FormModal';
) => {
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

function Ciudades() {
  const [ciudades, setCiudades] = useState([]);
  const [paises, setPaises] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCiudad, setEditCiudad] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formFields = [
    ...(editCiudad ? [{ name: "id", label: "Código", readOnly: true, type: "text" }] : []),
    { name: "nombre", label: "Nombre de la Ciudad", required: true },
    {
      name: "pais_id", label: "País", required: true, type: "select",
      options: [{ value: "", label: "---Seleccionar País---" }, ...paises.map((p) => ({ value: p.id, label: p.nombre }))]
    },
  ];

  const apiCall = async (url, method = 'GET', data = null) => {
    try {
      const res = await api({ method, url, data });
      return res.data;
    } catch (err) {
      throw new Error(`Error ${err.response?.status || 500}`);
    }
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
      toast.success('Ciudad eliminada');
    } catch (error) { toast.error('Error al eliminar'); }
  };

  const handleSubmit = async (data) => {
    try {
      const paisSelected = paises.find(p => p.id === data.pais_id);
      if (editCiudad) {
        await apiCall(`/ciudades/${editCiudad.id}`, 'PUT', data);
        setCiudades(prev => prev.map(c => c.id === editCiudad.id ? { ...c, ...data, pais: paisSelected?.nombre || '' } : c));
        toast.success('Ciudad actualizada');
      } else {
        const res = await apiCall('/ciudades/', 'POST', data);
        setCiudades(prev => [...prev, { ...data, id: res.id || Date.now(), pais: paisSelected?.nombre || '' }]);
        toast.success('Ciudad creada');
      }
      setModalOpen(false);
    } catch (error) { toast.error('Error al guardar'); }
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
    </div>
  );
}

export default Ciudades;