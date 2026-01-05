import React, { useEffect, useState, useCallback } from "react";
import api from "../api/api";
import { Search, Plus, Edit3, Trash2, Users, FileText, MapPin, Building2, CreditCard, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Loader2 } from "lucide-react";

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

// Componente Table
const EnhancedTable = ({ columns, data, onEdit, onDelete, pagination, onPageChange, onSearch, onSort, sortBy, sortOrder, loading }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (onSearch) onSearch(value);
  };

  const handleSort = (field) => {
    if (onSort) onSort(field);
  };

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
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar remitentes..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
        {pagination && (
          <div className="text-sm text-slate-500">
            Total: {pagination.total} registros
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.field}
                  className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort(column.field)}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.label}</span>
                    <div className="flex flex-col">
                      <ChevronUp className={`w-3 h-3 ${sortBy === column.field && sortOrder === 'asc' ? 'text-indigo-600' : 'text-slate-300'}`} />
                      <ChevronDown className={`w-3 h-3 -mt-1 ${sortBy === column.field && sortOrder === 'desc' ? 'text-indigo-600' : 'text-slate-300'}`} />
                    </div>
                  </div>
                </th>
              ))}
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-slate-50 transition-colors group">
                {columns.map((column) => (
                  <td key={column.field} className="px-6 py-4 text-slate-700">
                    {column.field === 'tipo_documento' ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                        {item[column.field]}
                      </span>
                    ) : (
                      item[column.field]
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

        {data.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-slate-400" />
            </div>
            <p>No se encontraron remitentes</p>
          </div>
        )}
      </div>

      {/* Paginación */}
      {pagination && (
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <Pagination
            currentPage={pagination.current_page}
            totalPages={pagination.pages}
            onPageChange={onPageChange}
          />
        </div>
      )}
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
                    readOnly={field.readOnly}
                    placeholder={field.placeholder}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${field.readOnly ? 'bg-slate-50 text-slate-500' : ''
                      } ${errors[field.name] ? 'border-red-300' : 'border-slate-300'}`}
                  />
                )}
              </div>
              {errors[field.name] && <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>}
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
      } catch (e) { alert("Error al eliminar"); }
    }
  };

  const handleSubmit = async (data) => {
    if (!data.ciudad_id) { alert("Debes seleccionar una ciudad."); return; }
    try {
      const submitData = { ...data, ciudad_id: parseInt(data.ciudad_id, 10) };
      if (editRemitente) await api.put(`/remitentes/${editRemitente.id}`, submitData);
      else await api.post("/remitentes/", submitData);
      setModalOpen(false);
      fetchRemitentes(pagination.current_page, currentSearch, sortBy, sortOrder);
    } catch (e) { alert("Error al guardar: " + (e.response?.data?.error || e.message)); }
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
      />

      <EnhancedFormModal
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