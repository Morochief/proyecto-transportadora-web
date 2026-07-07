import React, { useEffect, useState, useCallback } from "react";
import api from "../api/api";
import { Search, Plus, Edit3, Trash2, Users, FileText, MapPin, Building2, CreditCard, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { toast } from 'react-toastify';
import EnhancedTable from '../components/EnhancedTable';
import FormModal from '../components/FormModal';

// Componente de Paginación
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const renderPageButton = (page, isActive = false) => (
    <button
      key={page}
      onClick={() => typeof page === 'number' && onPageChange(page)}
      disabled={page === '...'}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive
          ? 'bg-indigo-600 text-white'
          : page === '...'
            ? 'text-slate-400 cursor-default'
            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
        }`}
    >
      {page}
    </button>
  );

  return (
    <div className="flex items-center justify-center space-x-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span>Página {currentPage} de {totalPages}</span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

function Remitentes() {
  const [remitentes, setRemitentes] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRemitente, setEditRemitente] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({ current_page: 1, pages: 1, total: 0 });
  const [currentSearch, setCurrentSearch] = useState("");
  const [sortBy, setSortBy] = useState("nombre");
  const [sortOrder, setSortOrder] = useState("asc");

  const formFields = [
    {
      name: "tipo_documento", label: "Tipo de Documento", required: true, type: "select",
      options: [
        { value: "", label: "-- Seleccionar --" },
        { value: "RUC", label: "RUC" }, { value: "CNPJ", label: "CNPJ" }, { value: "RUT", label: "RUT" },
        { value: "CUIT", label: "CUIT" }, { value: "CUIL", label: "CUIL" }, { value: "CPF", label: "CPF" },
        { value: "CI", label: "CI" }, { value: "DNI", label: "DNI" }, { value: "PASAPORTE", label: "Pasaporte" },
        { value: "OTRO", label: "Otro" },
      ],
    },
    { name: "numero_documento", label: "Número de Documento", required: true, type: "text", placeholder: "Ej: 80084948-5" },
    { name: "nombre", label: "Nombre del Remitente", required: true },
    { name: "direccion", label: "Dirección Completa", required: true },
    {
      name: "ciudad_id", label: "Ciudad", required: true, type: "select",
      options: [{ value: "", label: "-- Seleccionar --" }, ...ciudades.map((c) => ({ value: c.id, label: c.nombre }))],
    },
  ];

  const fetchCiudades = async () => {
    try {
      const res = await api.get("/ciudades/");
      setCiudades(Array.isArray(res.data) ? res.data : []);
    } catch (error) { console.error(error); }
  };

  const fetchRemitentes = useCallback(async (page = 1, search = "", sortField = sortBy, sortDirection = sortOrder) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({ page: page.toString(), per_page: '50', sort_by: sortField, sort_order: sortDirection });
      if (search) queryParams.set('q', search);

      const res = await api.get(`/remitentes/?${queryParams}`);
      setRemitentes(Array.isArray(res.data.items) ? res.data.items : []);
      setPagination({ current_page: res.data.current_page, pages: res.data.pages, total: res.data.total });
    } catch (error) {
      setRemitentes([]); setPagination({ current_page: 1, pages: 1, total: 0 });
    } finally { setIsLoading(false); }
  }, [sortBy, sortOrder]);

  useEffect(() => {
    fetchCiudades();
    fetchRemitentes(1, "", sortBy, sortOrder);
  }, [fetchRemitentes, sortBy, sortOrder]);

  const handlePageChange = (page) => fetchRemitentes(page, currentSearch, sortBy, sortOrder);

  const handleSearch = (searchTerm) => {
    setCurrentSearch(searchTerm);
    setTimeout(() => fetchRemitentes(1, searchTerm, sortBy, sortOrder), 500);
  };

  const handleSort = (field) => {
    const newSortOrder = (sortBy === field && sortOrder === 'asc') ? 'desc' : 'asc';
    setSortBy(field); setSortOrder(newSortOrder);
    fetchRemitentes(1, currentSearch, field, newSortOrder);
  };

  const handleAdd = () => { setEditRemitente(null); setModalOpen(true); };
  const handleEdit = (remitente) => { setEditRemitente(remitente); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este remitente?")) {
      try {
        await api.delete(`/remitentes/${id}`);
        fetchRemitentes(pagination.current_page, currentSearch, sortBy, sortOrder);
      } catch (e) { toast.error("Error al eliminar"); }
    }
  };

  const handleSubmit = async (data) => {
    if (!data.ciudad_id) { toast.warning("Debes seleccionar una ciudad."); return; }
    try {
      const submitData = { ...data, ciudad_id: parseInt(data.ciudad_id, 10) };
      if (editRemitente) await api.put(`/remitentes/${editRemitente.id}`, submitData);
      else await api.post("/remitentes/", submitData);
      setModalOpen(false);
      fetchRemitentes(pagination.current_page, currentSearch, sortBy, sortOrder);
    } catch (e) { toast.error("Error al guardar: " + (e.response?.data?.error || e.message)); }
  };

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Gestión de Remitentes</h1>
          <p className="text-slate-500 mt-1">Directorio de remitentes y clientes.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            <span>Nuevo Remitente</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total</div>
          <div className="text-3xl font-bold text-slate-800 mt-2">{pagination.total}</div>
        </div>
      </div>

      <EnhancedTable
        columns={[
          { field: "tipo_documento", label: "Tipo" },
          { field: "numero_documento", label: "Nro. Doc" },
          { field: "nombre", label: "Nombre" },
          { field: "direccion", label: "Dirección" },
          { field: "ciudad_nombre", label: "Ciudad" },
        ]}
        data={remitentes}
        onEdit={handleEdit}
        onDelete={handleDelete}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        loading={isLoading}
        searchPlaceholder="Buscar remitentes..."
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialValues={editRemitente}
        fields={formFields}
        title={editRemitente ? "Editar Remitente" : "Nuevo Remitente"}
      />
    </div>
  );
}

export default Remitentes;