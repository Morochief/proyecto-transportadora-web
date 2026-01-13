import React, { useEffect, useState } from "react";
import api from "../api/api";
import { Search, Plus, Edit3, Trash2, DollarSign, Truck, Calendar, Loader2, ChevronDown, ChevronUp } from "lucide-react";

// Componente Table
const EnhancedTable = ({ columns, data, onEdit, onDelete, loading, expandable = false, renderExpandedContent }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedRows, setExpandedRows] = useState(new Set());

    const filteredData = data.filter(item =>
        Object.values(item).some(value =>
            value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
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

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Search Header */}
            <div className="p-6 border-b border-slate-200">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar honorarios..."
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
                            {expandable && <th className="px-4 py-3 w-10"></th>}
                            {columns.map((column) => (
                                <th key={column.field} className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    {column.label}
                                </th>
                            ))}
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredData.map((item, index) => {
                            const isExpanded = expandedRows.has(item.id);
                            return (
                                <React.Fragment key={item.id || index}>
                                    <tr className="hover:bg-slate-50 transition-colors group">
                                        {expandable && (
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => toggleRow(item.id)}
                                                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-4 h-4 text-slate-600" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-slate-600" />
                                                    )}
                                                </button>
                                            </td>
                                        )}
                                        {columns.map((column) => (
                                            <td key={column.field} className="px-6 py-4 text-slate-700 text-sm">
                                                {column.render ? column.render(item[column.field], item) : item[column.field]}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandable && isExpanded && renderExpandedContent && (
                                        <tr>
                                            <td colSpan={columns.length + 2} className="p-0">
                                                {renderExpandedContent(item)}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>

                {filteredData.length === 0 && !loading && (
                    <div className="text-center py-12 text-slate-500">
                        <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p>No se encontraron registros de honorarios</p>
                    </div>
                )}
            </div>
        </div>
    );
};
