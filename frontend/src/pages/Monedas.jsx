import React, { useState, useEffect } from "react";
import api from "../api/api";
import { Search, Plus, Coins, DollarSign, Hash, Edit3, Trash2, Loader2 } from "lucide-react";
import { toast } from 'react-toastify';
import EnhancedTable from '../components/EnhancedTable';
import FormModal from '../components/FormModal';

// Componente principal
const Monedas = () => {
  const [monedas, setMonedas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMoneda, setEditMoneda] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const formFields = [
    { name: "codigo", label: "Código", required: true },
    { name: "nombre", label: "Nombre", required: true },
    { name: "simbolo", label: "Símbolo", required: true },
  ];

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
        searchPlaceholder="Buscar monedas..."
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editMoneda}
        fields={formFields}
        title={editMoneda ? "Editar Moneda" : "Nueva Moneda"}
      />
    </div>
  );
};

export default Monedas;