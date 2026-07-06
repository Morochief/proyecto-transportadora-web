import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, Edit3, Trash2, Globe, MapPin, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
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
    if (formData.codigo) {
      if (formData.codigo.length !== 2) newErrors.codigo = "El código debe tener 2 caracteres";
    }
    if (!formData.nombre || formData.nombre.trim().length < 2) {
      newErrors.nombre = "Nombre requerido";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const dataToSubmit = { ...formData, codigo: formData.codigo?.toUpperCase() };
      await onSubmit(dataToSubmit);
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
              <input
                type={field.type || "text"}
                value={formData[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                maxLength={field.name === 'codigo' ? 2 : undefined}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${errors[field.name] ? 'border-red-300' : 'border-slate-300'}`}
              />
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

function Paises() {
  const [paises, setPaises] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPais, setEditPais] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const formFields = [
    { name: "codigo", label: "Código ISO (2 letras)", required: true, maxLength: 2 },
    { name: "nombre", label: "Nombre del País", required: true },
  ];

  const apiCall = async (url, method = 'GET', data = null) => {
    const config = { method, headers: { 'Content-Type': 'application/json' }, data, url };
    try {
      const res = await api(url, config);
      return res.data;
    } catch (err) {
      throw new Error(`Error ${err.response?.status || 500}`);
    }
  };

  const fetchPaises = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiCall('/paises/');
      setPaises(response);
    } catch (error) {
      // Fallback for demo/dev if API fails
      setPaises([
        { id: 1, codigo: 'PY', nombre: 'Paraguay' },
        { id: 2, codigo: 'AR', nombre: 'Argentina' },
        { id: 3, codigo: 'BR', nombre: 'Brasil' },
        { id: 4, codigo: 'UY', nombre: 'Uruguay' },
        { id: 5, codigo: 'BO', nombre: 'Bolivia' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPaises(); }, [fetchPaises]);

  const handleAdd = () => { setEditPais(null); setModalOpen(true); };
  const handleEdit = (pais) => { setEditPais(pais); setModalOpen(true); };
  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este país?")) return;
    try {
      await apiCall(`/paises/${id}`, 'DELETE');
      setPaises(prev => prev.filter(p => p.id !== id));
      toast.success('País eliminado');
    } catch (error) { toast.error('Error al eliminar'); }
  };

  const handleSubmit = async (data) => {
    try {
      if (editPais) {
        await apiCall(`/paises/${editPais.id}`, 'PUT', data);
        setPaises(prev => prev.map(p => p.id === editPais.id ? { ...p, ...data } : p));
        toast.success('País actualizado');
      } else {
        const res = await apiCall('/paises/', 'POST', data);
        setPaises(prev => [...prev, { ...data, id: res.id || Date.now() }]);
        toast.success('País creado');
      }
      setModalOpen(false);
    } catch (error) { toast.error('Error al guardar'); }
  };

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Gestión de Países</h1>
          <p className="text-slate-500 mt-1">Configuración de países y regiones para operaciones internacionales.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            <span>Nuevo País</span>
          </button>
        </div>
      </div>

      {/* Stats (Simplified) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Países</div>
          <div className="text-3xl font-bold text-slate-800 mt-2">{paises.length}</div>
        </div>
      </div>

      <EnhancedTable
        columns={[{ field: "codigo", label: "Código" }, { field: "nombre", label: "Nombre" }]}
        data={paises}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
      />

      <EnhancedFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editPais}
        fields={formFields}
        title={editPais ? "Editar País" : "Nuevo País"}
      />
    </div>
  );
}

export default Paises;