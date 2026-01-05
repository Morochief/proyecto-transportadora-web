import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Save, FileText, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

const CAMPOS_MANUALES = [
  1, 5, 6, 8, 13, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27,
  28, 29, 32, 33, 34, 35, 36, 38, 39, 41
];

export default function MIC({ crtId, crtNumero, onClose, modo = "generar" }) {
  const [mic, setMic] = useState({});
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (crtId || crtNumero) {
      const endpoint = `http://localhost:5000/api/mic/cargar-datos-crt/${crtId || crtNumero}`;
      axios.get(endpoint).then(res => setMic(res.data)).catch(err => toast.error("Error cargando CRT"));
    }
  }, [crtId, crtNumero]);

  const handleChange = e => setMic({ ...mic, [e.target.name]: e.target.value });

  const guardarMic = async () => {
    setGuardando(true);
    try {
      const url = crtId ? `http://localhost:5000/api/mic-guardados/crear-desde-crt/${crtId}` : `http://localhost:5000/api/mic-guardados/`;
      const payload = crtId ? mic : { ...mic, crt_id: null };
      await axios.post(url, payload);
      toast.success("✅ MIC Guardado");
      if (onClose) onClose();
    } catch (e) { toast.error("❌ Error al guardar"); }
    finally { setGuardando(false); }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
      <ToastContainer position="top-right" />
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-indigo-600" /> Datos MIC
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-3">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Campo 1 (Transportadora)</label>
          <textarea name="campo_1_transporte" value={mic.campo_1_transporte || ''} readOnly rows={3} className="w-full p-2 border border-slate-200 bg-slate-50 rounded text-sm text-slate-600" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Campo 11 (Placa) *</label>
          <input name="campo_11_placa" value={mic.campo_11_placa || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Campo 12 (Modelo)</label>
          <input name="campo_12_modelo_chasis" value={mic.campo_12_modelo_chasis || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" />
        </div>
        {/* Simplified view for other fields as this component seems less used than ModalMICCompleto */}
        {Object.keys(mic).filter(k => k.startsWith('campo_') && !['campo_1_transporte', 'campo_11_placa', 'campo_12_modelo_chasis'].includes(k)).map(k => (
          <div key={k}>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 truncate" title={k}>{k.replace('campo_', '')}</label>
            <input name={k} value={mic[k] || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded hover:bg-slate-50 text-slate-700">Cancelar</button>
        <button onClick={guardarMic} disabled={guardando} className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold flex items-center gap-2">
          {guardando ? 'Guardando...' : 'Guardar'} <Save className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}