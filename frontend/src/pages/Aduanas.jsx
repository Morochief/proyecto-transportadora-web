import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, Check, MapPin, Building2, Globe } from 'lucide-react';
import api from '../api/api';
import Select from 'react-select';

function Aduanas() {
    const [aduanas, setAduanas] = useState([]);
    const [ciudades, setCiudades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [form, setForm] = useState({ id: null, codigo: '', nombre: '', ciudad_id: null });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [resAduanas, resCiudades] = await Promise.all([
                api.get('/aduanas/'),
                api.get('/ciudades/')
            ]);
            setAduanas(resAduanas.data);
            setCiudades(resCiudades.data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        } catch (err) {
            console.error("Error al cargar datos", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.codigo || !form.nombre) {
            setError('Código y Nombre son obligatorios');
            return;
        }

        try {
            if (form.id) {
                await api.put(`/aduanas/${form.id}`, form);
            } else {
                await api.post('/aduanas/', form);
            }
            setModalOpen(false);
            fetchData();
            resetForm();
        } catch (err) {
            setError('Error al guardar aduana. Verifica si el código ya existe.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar esta aduana?')) {
            try {
                await api.delete(`/aduanas/${id}`);
                fetchData();
            } catch (err) {
                alert('Error al eliminar');
            }
        }
    };

    const resetForm = () => {
        setForm({ id: null, codigo: '', nombre: '', ciudad_id: null });
        setError('');
    };

    const openEdit = (aduana) => {
        setForm(aduana);
        setModalOpen(true);
    };

    const filteredAduanas = aduanas.filter(a =>
        a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const optCiudades = ciudades.map(c => ({ value: c.id, label: c.nombre }));

    return (
        <div className="min-h-full space-y-6 animate-in fade-in duration-500 pb-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Aduanas</h1>
                    <p className="text-slate-500 mt-1">Gestión de códigos aduaneros</p>
                </div>
                <button
                    onClick={() => { resetForm(); setModalOpen(true); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-lg flex items-center gap-2 font-medium"
                >
                    <Plus className="w-5 h-5" /> Nueva Aduana
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar aduanas..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm text-slate-700"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-10 text-slate-500">Cargando aduanas...</div>
                ) : filteredAduanas.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        No se encontraron aduanas.
                    </div>
                ) : (
                    filteredAduanas.map((aduana) => (
                        <div key={aduana.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(aduana)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(aduana.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-start gap-3 mb-2">
                                <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                                    <Building2 className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{aduana.nombre}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-0.5 rounded border border-slate-200">{aduana.codigo}</span>
                                        {aduana.ciudad && (
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <MapPin className="w-3 h-3" />
                                                {aduana.ciudad}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">{form.id ? 'Editar Aduana' : 'Nueva Aduana'}</h2>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2"><X className="w-4 h-4" />{error}</div>}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Código *</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    value={form.codigo}
                                    onChange={e => setForm({ ...form, codigo: e.target.value })}
                                    placeholder="Ej: 046"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    value={form.nombre}
                                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                                    placeholder="Ej: ADUANA DE ENCARNACIÓN"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad (Opcional)</label>
                                <Select
                                    options={optCiudades}
                                    value={optCiudades.find(c => c.value === form.ciudad_id)}
                                    onChange={opt => setForm({ ...form, ciudad_id: opt?.value || null })}
                                    placeholder="Seleccionar..."
                                    isClearable
                                    className="text-sm"
                                />
                            </div>

                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 font-medium rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-md flex items-center gap-2">
                                    <Check className="w-4 h-4" /> Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Aduanas;
