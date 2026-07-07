import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, Edit3, Trash2, Building2, Flag, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from 'react-toastify';
import api from "../api/api";
import EnhancedTable from '../components/EnhancedTable';
import FormModal from '../components/FormModal';

function Ciudades() {
  const [ciudades, setCiudades] = useState([]);
  const [paises, setPaises] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCiudad, setEditCiudad] = useState(null);
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
        searchPlaceholder="Buscar ciudades..."
      />

      <FormModal
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