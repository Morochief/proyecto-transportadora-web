import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, Edit3, Trash2, Globe, MapPin, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from 'react-toastify';
import api from "../api/api";
import EnhancedTable from '../components/EnhancedTable';
import FormModal from '../components/FormModal';

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
        searchPlaceholder="Buscar países..."
      />

      <FormModal
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