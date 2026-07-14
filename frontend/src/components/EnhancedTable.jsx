import React, { useState } from "react";
import { Search, Edit3, Trash2, Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Truck } from "lucide-react";

const EnhancedTable = ({
  columns,
  data = [],
  onEdit,
  onDelete,
  loading,
  expandable = false,
  renderExpandedContent,
  searchPlaceholder = "Buscar...",
  emptyIcon = null,
  emptyMessage = "No se encontraron registros",
  // Paginación Externa
  currentPage,
  totalPages,
  onPageChange,
  // Búsqueda Externa
  onSearchChange,
  // Acciones Personalizadas
  actions,
  // Slot superior derecho
  headerRight,
  title,
  totalItems,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Solo buscar localmente si no hay búsqueda externa controlada
  const searchedData = onSearchChange
    ? data
    : data.filter((item) =>
        Object.values(item).some((value) =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );

  // Solo ordenar localmente
  const sortedData = [...searchedData].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    const comparison = aVal.toString().localeCompare(bVal.toString(), undefined, {
      numeric: true,
      sensitivity: "base",
    });
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    newExpanded.has(id) ? newExpanded.delete(id) : newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-indigo-600" />
        <p>Cargando datos...</p>
      </div>
    );
  }

  const EmptyIcon = emptyIcon || Truck;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Top Header con Título, Search, y Botones */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {title && <h2 className="text-lg font-bold text-slate-800">{title}</h2>}
          {totalItems !== undefined && (
            <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {totalItems} registros
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl justify-end">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
            />
          </div>
          {headerRight}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {expandable && <th className="px-4 py-3 w-10"></th>}
              {columns.map((column) => (
                <th
                  key={column.field}
                  onClick={() => column.sortable !== false && handleSort(column.field)}
                  className={`px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${
                    column.sortable !== false ? "cursor-pointer hover:bg-slate-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {sortField === column.field && (
                      sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete || actions) && (
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedData.map((item, index) => {
              const isExpanded = expandedRows.has(item.id);
              return (
                <React.Fragment key={item.id || index}>
                  <tr className="hover:bg-slate-50 transition-colors group">
                    {expandable && (
                      <td className="px-4 py-4">
                        <button onClick={() => toggleRow(item.id)} className="p-1 hover:bg-slate-200 rounded transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                        </button>
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={column.field} className="px-6 py-4 text-slate-700 text-sm">
                        {column.render ? column.render(item[column.field], item) : (item[column.field] ?? <span className="text-slate-400">-</span>)}
                      </td>
                    ))}
                    {(onEdit || onDelete || actions) && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-100 group-hover:opacity-100 transition-opacity">
                          {actions && actions(item)}
                          {onEdit && (
                            <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Editar">
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  {expandable && isExpanded && renderExpandedContent && (
                    <tr>
                      <td colSpan={columns.length + (onEdit || onDelete || actions ? 2 : 1)} className="p-0">
                        {renderExpandedContent(item)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {sortedData.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">
            <EmptyIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>

      {/* Paginación */}
      {currentPage !== undefined && totalPages !== undefined && onPageChange && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-300 rounded hover:bg-white disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-300 rounded hover:bg-white disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTable;
