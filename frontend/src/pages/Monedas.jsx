import React, { useState, useEffect } from "react";
import api from "../api/api";
import { Search, Plus, Coins, DollarSign, Hash, Edit3, Trash2, Loader2 } from "lucide-react";
import { toast } from 'react-toastify';
import EnhancedTable from '../components/EnhancedTable';
import FormModal from '../components/FormModal';

// Componente Table

// Modal para crear/editar moneda) => {
  const [formData, setFormData] = useState({ codigo: '', nombre: '', simbolo: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(initialValues || { codigo: '', nombre: '', simbolo: '' });
      setErrors({});
    }
  }, [open, initialValues]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!formData.codigo) newErrors.codigo = 'El código es obligatorio';
    if (!formData.nombre) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.simbolo) newErrors.simbolo = 'El símbolo es obligatorio';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Código <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => handleChange('codigo', e.target.value.toUpperCase())}
                placeholder="USD"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${errors.codigo ? 'border-red-300' : 'border-slate-300'
                  }`}
              />
            </div>
            {errors.codigo && <p className="text-red-500 text-xs mt-1">{errors.codigo}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                placeholder="Dólar Estadounidense"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${errors.nombre ? 'border-red-300' : 'border-slate-300'
                  }`}
              />
            </div>
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Símbolo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.simbolo}
                onChange={(e) => handleChange('simbolo', e.target.value)}
                placeholder="$"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${errors.simbolo ? 'border-red-300' : 'border-slate-300'
                  }`}
              />
            </div>
            {errors.simbolo && <p className="text-red-500 text-xs mt-1">{errors.simbolo}</p>}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex justify-center items-center gap-2 transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialValues ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente principal
const Monedas = () => {
  const [monedas, setMonedas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMoneda, setEditMoneda] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMonedas();
  }, []);

  const fetchMonedas = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/monedas/");
      setMonedas(res.data);
    } catch (error) {
      console.error('Error fetching monedas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editMoneda) {
        await api.put(`/monedas/${editMoneda.id}`, formData);
      } else {
        await api.post("/monedas/", formData);
      }
      setModalOpen(false);
      setEditMoneda(null);
      fetchMonedas();
    } catch (error) {
      toast.error("Error al guardar: " + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = (moneda) => {
    setEditMoneda(moneda);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta moneda?")) {
      try {
        await api.delete(`/monedas/${id}`);
        fetchMonedas();
      } catch (error) {
        toast.error("Error al eliminar: " + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleAdd = () => {
    setEditMoneda(null);
    setModalOpen(true);
  };

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Gestión de Monedas</h1>
          <p className="text-slate-500 mt-1">Configuración de divisas para transacciones.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            <span>Nueva Moneda</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Monedas</div>
          <div className="text-3xl font-bold text-slate-800 mt-2">{monedas.length}</div>
        </div>
      </div>

      <EnhancedTable
        columns={[
          {
            field: "codigo", label: "Código",
            render: (val) => <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200 text-sm font-medium">{val}</span>
          },
          { field: "nombre", label: "Nombre" },
          {
            field: "simbolo", label: "Símbolo",
            render: (val) => <span className="font-bold text-slate-800 bg-amber-50 text-amber-600 px-2 py-1 rounded">{val}</span>
          }
        ]}
        data={monedas}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editMoneda}
        title={editMoneda ? "Editar Moneda" : "Nueva Moneda"}
      />
    </div>
  );
};

export default Monedas;  );
};

export default Monedas;