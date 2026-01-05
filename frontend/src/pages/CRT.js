import React, { useEffect, useState } from "react";
import api from "../api/api";
import Select from "react-select";
import {
  FileText, User, MapPin, Truck, Package, DollarSign, Calendar, Info,
  Save, Eye, FileCheck, AlertCircle, ChevronRight, CheckCircle, Calculator
} from "lucide-react";
import ModalMICCompleto from "./ModalMICCompleto";
import CRTPreview from "../components/CRTPreview";

// Helper functions
function hoyISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatoFecha(fecha) {
  if (!fecha) return "";
  const [yyyy, mm, dd] = fecha.split("-");
  return `${dd}-${mm}-${yyyy}`;
}

const INCOTERMS = [
  { value: "EXW", label: "EXW" }, { value: "FCA", label: "FCA" }, { value: "FOB", label: "FOB" },
  { value: "CPT", label: "CPT" }, { value: "CIP", label: "CIP" }, { value: "DAP", label: "DAP" },
  { value: "DDP", label: "DDP" },
];

function CRT() {
  // State definitions (Kept identical to original)
  const [remitentes, setRemitentes] = useState([]);
  const [transportadoras, setTransportadoras] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [paises, setPaises] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [ciudad7, setCiudad7] = useState(null);
  const [fecha7, setFecha7] = useState(hoyISO());
  const [monedaGasto, setMonedaGasto] = useState(null);
  const [selectedTransportadora, setSelectedTransportadora] = useState(null);
  const [monedaTouched, setMonedaTouched] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [lugarEntregaManual, setLugarEntregaManual] = useState(false);
  const [crtEmitido, setCrtEmitido] = useState(null);
  const [modalMICOpen, setModalMICOpen] = useState(false);
  const [loadingMIC, setLoadingMIC] = useState(false);
  const [diagnosticoMIC, setDiagnosticoMIC] = useState(null);
  const [loadingEmitir, setLoadingEmitir] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const [form, setForm] = useState({
    numero_crt: "", fecha_emision: hoyISO(), estado: "EMITIDO",
    remitente_id: null, destinatario_id: null, consignatario_id: null, notificar_a_id: null,
    transportadora_id: null, ciudad_emision_id: null, pais_emision_id: null,
    lugar_entrega: "", fecha_entrega: "", detalles_mercaderia: "",
    peso_bruto: "", peso_neto: "", volumen: "",
    incoterm: "", moneda_id: null, valor_incoterm: "", valor_mercaderia: "",
    declaracion_mercaderia: "", valor_flete_externo: "", valor_reembolso: "",
    factura_exportacion: "", nro_despacho: "", transporte_sucesivos: "",
    observaciones: "", formalidades_aduana: "", fecha_firma: "", gastos: [],
    local_responsabilidad: "", firma_remitente_id: null, firma_transportador_id: null, firma_destinatario_id: null,
  });

  const [gastoActual, setGastoActual] = useState({ tramo: "", valor_remitente: "", valor_destinatario: "" });

  // Effects & Logic (Kept identical but cleaned up)
  const mostrarVistaPrevia = () => {
    const previewData = {
      ...form,
      remitente: remitentes.find(r => r.id === form.remitente_id)?.nombre || '',
      destinatario: remitentes.find(r => r.id === form.destinatario_id)?.nombre || '',
      consignatario: remitentes.find(r => r.id === form.consignatario_id)?.nombre || '',
      notificar_a: remitentes.find(r => r.id === form.notificar_a_id)?.nombre || '',
      transportadora: transportadoras.find(t => t.id === form.transportadora_id)?.nombre || '',
      moneda: monedas.find(m => m.id === form.moneda_id)?.codigo || '',
      ciudad_emision: ciudades.find(c => c.id === form.ciudad_emision_id)?.nombre || '',
      pais_emision: paises.find(p => p.id === form.pais_emision_id)?.nombre || '',
      gastos: gastoActual.tramo ? [gastoActual] : [],
      numero_crt: form.numero_crt || 'Sin asignar',
      estado: form.estado || 'BORRADOR',
      fecha_emision: form.fecha_emision,
      remitente_direccion: remitentes.find(r => r.id === form.remitente_id)?.direccion || '',
      remitente_ciudad: ciudades.find(c => c.id === remitentes.find(r => r.id === form.remitente_id)?.ciudad_id)?.nombre || '',
      remitente_pais: paises.find(p => p.id === ciudades.find(c => c.id === remitentes.find(r => r.id === form.remitente_id)?.ciudad_id)?.pais_id)?.nombre || '',
      destinatario_direccion: remitentes.find(r => r.id === form.destinatario_id)?.direccion || '',
      destinatario_ciudad: ciudades.find(c => c.id === remitentes.find(r => r.id === form.destinatario_id)?.ciudad_id)?.nombre || '',
      destinatario_pais: paises.find(p => p.id === ciudades.find(c => c.id === remitentes.find(r => r.id === form.destinatario_id)?.ciudad_id)?.pais_id)?.nombre || '',
      consignatario_direccion: remitentes.find(r => r.id === form.consignatario_id)?.direccion || '',
      consignatario_ciudad: ciudades.find(c => c.id === remitentes.find(r => r.id === form.consignatario_id)?.ciudad_id)?.nombre || '',
      consignatario_pais: paises.find(p => p.id === ciudades.find(c => c.id === remitentes.find(r => r.id === form.consignatario_id)?.ciudad_id)?.pais_id)?.nombre || '',
      transportadora_direccion: transportadoras.find(t => t.id === form.transportadora_id)?.direccion || '',
      transportadora_ciudad: ciudades.find(c => c.id === transportadoras.find(t => t.id === form.transportadora_id)?.ciudad_id)?.nombre || '',
      transportadora_pais: paises.find(p => p.id === ciudades.find(c => c.id === transportadoras.find(t => t.id === form.transportadora_id)?.ciudad_id)?.pais_id)?.nombre || '',
    };
    setPreviewData(previewData);
    setPreviewOpen(true);
  };

  const descargarPDFFromPreview = async () => {
    if (!crtEmitido) { alert("Primero debe emitir el CRT antes de descargar el PDF"); return; }
    try {
      const response = await fetch(`http://localhost:5000/api/crts/${crtEmitido.id}/pdf`, { method: "POST" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) { alert("Error descargando PDF: " + error.message); }
  };

  const optCiudadPais = (ciudades, paises) => ciudades.map((c) => {
    const pais = paises.find((p) => p.id === c.pais_id);
    return { value: c.id, label: `${c.nombre.toUpperCase()} - ${(pais?.nombre || "").toUpperCase()}`, ciudad: c.nombre, pais: pais?.nombre || "", pais_id: c.pais_id };
  });
  const opt = (arr, label = "nombre") => arr.map((x) => ({ ...x, value: x.id, label: x[label] }));

  // Load Initial Data
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [paisesRes, ciudadesRes, remitentesRes] = await Promise.all([
          api.get("/paises/"), api.get("/ciudades/"), api.get("/remitentes/")
        ]);
        setPaises(paisesRes.data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setCiudades(ciudadesRes.data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setRemitentes((remitentesRes.data.items || remitentesRes.data).sort((a, b) => a.nombre.localeCompare(b.nombre)));

        try {
          const tr = await api.get("/transportadoras/");
          setTransportadoras((tr.data.items || tr.data).sort((a, b) => a.nombre.localeCompare(b.nombre)));
        } catch { setTransportadoras([]); }

        try {
          const mr = await api.get("/monedas/");
          setMonedas(mr.data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        } catch { setMonedas([]); }

      } catch (error) { console.error("Error loading data", error); }
    };
    loadAllData();
  }, []);

  // Autocomplete Logic
  useEffect(() => {
    if (form.destinatario_id && remitentes.length && ciudades.length && paises.length && !lugarEntregaManual) {
      const dest = remitentes.find(r => r.id === form.destinatario_id);
      if (dest?.ciudad_id) {
        const c = ciudades.find(c => c.id === dest.ciudad_id);
        if (c) {
          const p = paises.find(p => p.id === c.pais_id);
          if (p) setForm(prev => ({ ...prev, lugar_entrega: `${c.nombre.toUpperCase()} - ${p.nombre.toUpperCase()}` }));
        }
      }
    }
  }, [form.destinatario_id, remitentes, ciudades, paises, lugarEntregaManual]);

  useEffect(() => {
    if (form.remitente_id && remitentes.length && ciudades.length && paises.length) {
      const r = remitentes.find(r => r.id === form.remitente_id);
      if (r?.ciudad_id) {
        const c = ciudades.find(c => c.id === r.ciudad_id);
        if (c) setCiudad7({ value: c.id, label: `${c.nombre.toUpperCase()} - ${(paises.find(p => p.id === c.pais_id)?.nombre || "").toUpperCase()}`, ciudad: c.nombre, pais: paises.find(p => p.id === c.pais_id)?.nombre || "", pais_id: c.pais_id });
      }
    }
  }, [form.remitente_id, remitentes, ciudades, paises]);

  useEffect(() => {
    if (ciudad7 && fecha7) setForm((f) => ({ ...f, local_responsabilidad: `${ciudad7.ciudad.toUpperCase()} - ${ciudad7.pais.toUpperCase()}-${formatoFecha(fecha7)}` }));
  }, [ciudad7, fecha7]);

  useEffect(() => {
    if (monedas.length && (!monedaGasto || !monedas.some(m => m.id === monedaGasto.value))) {
      const dolar = monedas.find(m => m.codigo?.includes("USD")) || monedas[0];
      if (dolar) setMonedaGasto({ value: dolar.id, label: `${dolar.codigo} - ${dolar.nombre}` });
    }
  }, [monedas, monedaGasto]);

  useEffect(() => {
    if (selectedTransportadora?.id && selectedTransportadora.codigo) {
      api.get(`/crts/next_number?transportadora_id=${selectedTransportadora.id}&codigo=${selectedTransportadora.codigo}`)
        .then((res) => setForm((f) => ({ ...f, numero_crt: res.data.next_number })))
        .catch(() => setForm((f) => ({ ...f, numero_crt: "" })));
    } else { setForm((f) => ({ ...f, numero_crt: "" })); }
  }, [selectedTransportadora]);

  useEffect(() => { if (form.remitente_id && !form.firma_remitente_id) setForm(f => ({ ...f, firma_remitente_id: form.remitente_id })); }, [form.remitente_id, form.firma_remitente_id]);
  useEffect(() => { if (form.transportadora_id && !form.firma_transportador_id) setForm(f => ({ ...f, firma_transportador_id: form.transportadora_id })); }, [form.transportadora_id, form.firma_transportador_id]);
  useEffect(() => { if (form.destinatario_id && !form.firma_destinatario_id) setForm(f => ({ ...f, firma_destinatario_id: form.destinatario_id })); }, [form.destinatario_id, form.firma_destinatario_id]);

  useEffect(() => {
    if (form.gastos.length > 0) {
      const g0 = form.gastos[0];
      setForm(f => ({ ...f, valor_flete_externo: (g0.valor_remitente && parseFloat(g0.valor_remitente) > 0) ? g0.valor_remitente : (g0.valor_destinatario || "") }));
    } else { setForm(f => ({ ...f, valor_flete_externo: "" })); }
  }, [form.gastos]);

  // Handlers
  const handleRemitente = (opt) => setForm(f => ({ ...f, remitente_id: opt?.value || null }));
  const handleDestinatario = (opt) => { setLugarEntregaManual(false); setForm(f => ({ ...f, destinatario_id: opt?.value || null, consignatario_id: !f.consignatario_id && opt ? opt.value : f.consignatario_id, notificar_a_id: !f.notificar_a_id && opt ? opt.value : f.notificar_a_id })); };
  const handleConsignatario = (opt) => setForm(f => ({ ...f, consignatario_id: opt?.value || null }));
  const handleNotificarA = (opt) => setForm(f => ({ ...f, notificar_a_id: opt?.value || null }));
  const handleInput = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleCiudadPais = (opt) => setForm(f => ({ ...f, ciudad_emision_id: opt?.value || null, pais_emision_id: opt?.pais_id || null }));
  const handleSelect = (name, opt) => setForm(f => ({ ...f, [name]: opt?.value || null }));
  const handleIncoterm = (opt) => setForm(f => ({ ...f, incoterm: opt?.value || "" }));
  const handleMonedaGasto = (opt) => { setMonedaGasto(opt); setMonedaTouched(true); };

  const handleValorGastoInput = (e, f) => {
    let v = e.target.value.replace(/[^\d.,]/g, "").replace(/\.(?=.*\.)/g, "").replace(/,/g, ",");
    setGastoActual(g => ({ ...g, [f]: v }));
  };
  const handleValorGastoBlur = (e, f) => {
    let val = e.target.value.replace(/\./g, "").replace(",", ".");
    let num = parseFloat(val);
    setGastoActual(g => ({ ...g, [f]: isNaN(num) ? "" : num.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }));
  };
  const handleAddGasto = () => {
    if (!gastoActual.tramo) return;
    const n = (v) => typeof v === "string" ? parseFloat(v.replace(/\./g, "").replace(",", ".")) : v;
    setForm(f => ({ ...f, gastos: [...f.gastos, { ...gastoActual, valor_remitente: n(gastoActual.valor_remitente), valor_destinatario: n(gastoActual.valor_destinatario) }] }));
    setGastoActual({ tramo: "", valor_remitente: "", valor_destinatario: "" });
  };
  const handleRemoveGasto = (idx) => setForm(f => ({ ...f, gastos: f.gastos.filter((_, i) => i !== idx) }));

  // Validation
  const validateForm = () => {
    const err = {};
    const req = [
      'remitente_id', 'destinatario_id', 'consignatario_id', 'notificar_a_id', 'transportadora_id',
      'ciudad_emision_id', 'lugar_entrega', 'detalles_mercaderia', 'peso_bruto', 'peso_neto',
      'incoterm', 'valor_incoterm', 'declaracion_mercaderia', 'factura_exportacion', 'observaciones'
    ];
    req.forEach(k => { if (!form[k]) err[k] = "Campo obligatorio"; });
    if (!monedaGasto?.value) err.moneda_id = "Moneda obligatoria";
    if (!ciudad7) err.ciudad7 = "Obligatorio";
    if (!form.firma_remitente_id) err.firma_remitente_id = "Obligatorio";
    if (!form.firma_transportador_id) err.firma_transportador_id = "Obligatorio";
    if (!form.firma_destinatario_id) err.firma_destinatario_id = "Obligatorio";
    setFormErrors(err); return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setMonedaTouched(true);
    if (!validateForm()) { alert("Complete los campos obligatorios"); return; }
    if (!monedaGasto?.value) return;
    setLoadingEmitir(true);
    try {
      const monedaCodigo = monedaGasto ? monedas.find(m => m.id === monedaGasto.value)?.codigo || monedaGasto.label : "";
      const response = await api.post("/crts/", {
        ...form, gastos: form.gastos.map(g => ({ ...g, moneda: monedaCodigo })),
        moneda_id: monedaGasto.value
      });

      const parseSn = (str) => { if (!str) return 0; return parseFloat(str.toString().replace(/\./g, '').replace(',', '.')) || 0; };
      const totalFlete = form.gastos.reduce((a, g) => a + parseSn(g.valor_remitente) + parseSn(g.valor_destinatario), 0);
      const valorDeclarado = parseSn(form.declaracion_mercaderia);

      const crtData = {
        ...response.data, ...form, id: response.data.id,
        transportadora: selectedTransportadora, moneda: monedaCodigo, total_flete: totalFlete, seguro: valorDeclarado > 0 ? valorDeclarado * 0.01 : 0
      };
      setCrtEmitido(crtData);

      const pdfRes = await fetch(`http://localhost:5000/api/crts/${crtData.id}/pdf`, { method: "POST" });
      if (pdfRes.ok) {
        const b = await pdfRes.blob();
        const u = window.URL.createObjectURL(b);
        const l = document.createElement('a'); l.href = u; document.body.appendChild(l); l.click(); document.body.removeChild(l);
      }
      alert("CRT emitido y PDF descargado");
      setForm(f => ({ ...f, gastos: [] })); setMonedaTouched(false); setFormErrors({});
    } catch (e) { alert("Error al emitir CRT"); }
    finally { setLoadingEmitir(false); }
  };

  const handleGenerateMIC = async (micData) => {
    setLoadingMIC(true); setDiagnosticoMIC(null);
    try {
      // 1. Guardar el MIC en backend
      const saveRes = await api.post(`/mic-guardados/crear-desde-crt/${crtEmitido.id}`, micData);
      const { id, pdf_url } = saveRes.data;

      alert("MIC Guardado con éxito. Descargando PDF...");

      // 2. Descargar el PDF generado
      const pdfRes = await api.get(pdf_url, { responseType: 'blob' });

      const b = new Blob([pdfRes.data], { type: 'application/pdf' });
      const u = window.URL.createObjectURL(b);
      const l = document.createElement('a'); l.href = u; document.body.appendChild(l); l.click(); document.body.removeChild(l);

    } catch (e) {
      console.error(e);
      alert("Error guardando/generando MIC: " + (e.response?.data?.error || e.message));
    }
    finally { setLoadingMIC(false); }
  };

  const totalRemitente = form.gastos.reduce((acc, g) => acc + (parseFloat(g.valor_remitente) || 0), 0);
  const totalDestinatario = form.gastos.reduce((acc, g) => acc + (parseFloat(g.valor_destinatario) || 0), 0);
  const monedaCodigo = monedaGasto ? monedas.find((m) => m.id === monedaGasto.value)?.codigo || monedaGasto.label : "";

  // Helper for error styles
  const errClass = (k) => formErrors[k] ? "border-red-500 rounded-lg" : "border-slate-300 rounded-lg";

  return (
    <div className="min-h-full space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Nuevo CRT</h1>
          <p className="text-slate-500 mt-1">Carta de Porte Internacional por Carretera</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Card 1: Entidades */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-200">
            <User className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-lg text-slate-800">1. Entidades Intervinientes</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">1. Remitente *</label>
              <Select options={opt(remitentes)} value={opt(remitentes).find(x => x.value === form.remitente_id)} onChange={handleRemitente} placeholder="Seleccionar..." className={errClass('remitente_id')} />
              {formErrors.remitente_id && <span className="text-xs text-red-500 font-medium">Requerido</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">4. Destinatario *</label>
              <Select options={opt(remitentes)} value={opt(remitentes).find(x => x.value === form.destinatario_id)} onChange={handleDestinatario} placeholder="Seleccionar..." className={errClass('destinatario_id')} />
              {formErrors.destinatario_id && <span className="text-xs text-red-500 font-medium">Requerido</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">6. Consignatario *</label>
              <Select options={opt(remitentes)} value={opt(remitentes).find(x => x.value === form.consignatario_id)} onChange={(o) => handleSelect('consignatario_id', o)} placeholder="Seleccionar..." className={errClass('consignatario_id')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">9. Notificar a *</label>
              <Select options={opt(remitentes)} value={opt(remitentes).find(x => x.value === form.notificar_a_id)} onChange={(o) => handleSelect('notificar_a_id', o)} placeholder="Seleccionar..." className={errClass('notificar_a_id')} />
            </div>
          </div>
        </div>

        {/* Card 2: Transporte y Ruta */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-200">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-lg text-slate-800">2. Transporte y Ruta</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">2. Número CRT</label>
              <input type="text" value={form.numero_crt} disabled className="w-full p-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-500 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">3. Transportador *</label>
              <Select options={opt(transportadoras)} value={opt(transportadoras).find(x => x.value === form.transportadora_id)} onChange={(o) => { handleSelect("transportadora_id", o); setSelectedTransportadora(o); }} placeholder="Seleccionar..." className={errClass('transportadora_id')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">5. Emisión *</label>
              <Select options={optCiudadPais(ciudades, paises)} value={optCiudadPais(ciudades, paises).find(x => x.value === form.ciudad_emision_id)} onChange={handleCiudadPais} placeholder="Ciudad / País" className={errClass('ciudad_emision_id')} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">7. Responsabilidad (Lugar, País, Fecha) *</label>
              <div className="flex gap-2">
                <div className="flex-1"><Select options={optCiudadPais(ciudades, paises)} value={ciudad7} onChange={setCiudad7} placeholder="Ciudad / País" className={errClass('ciudad7')} /></div>
                <input type="date" value={fecha7} onChange={(e) => setFecha7(e.target.value)} className="w-40 p-2 border border-slate-300 rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">8. Entrega (Lugar, País, Plazo) *</label>
              <Select options={optCiudadPais(ciudades, paises)} value={optCiudadPais(ciudades, paises).find(x => x.label === form.lugar_entrega)} onChange={(o) => { setLugarEntregaManual(true); setForm(f => ({ ...f, lugar_entrega: o?.label || "" })); }} placeholder="Lugar Entrega" className={errClass('lugar_entrega')} />
            </div>
          </div>
        </div>

        {/* Card 3: Carga */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-200">
            <Package className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-lg text-slate-800">3. Detalles de Carga</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">11. Descripción de Mercaderías *</label>
              <textarea name="detalles_mercaderia" value={form.detalles_mercaderia} onChange={handleInput} rows={6} className={`w-full p-2 border rounded-lg resize-none ${errClass('detalles_mercaderia')}`}></textarea>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">12. Peso Bruto (Kg) *</label>
                  <input type="text" name="peso_bruto" value={form.peso_bruto} onChange={(e) => setForm({ ...form, peso_bruto: e.target.value.replace(/[^\d,]/g, '') })} className={`w-full p-2 border rounded-lg text-right ${errClass('peso_bruto')}`} placeholder="0,000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Peso Neto (Kg) *</label>
                  <input type="text" name="peso_neto" value={form.peso_neto} onChange={(e) => setForm({ ...form, peso_neto: e.target.value.replace(/[^\d,]/g, '') })} className={`w-full p-2 border rounded-lg text-right ${errClass('peso_neto')}`} placeholder="0,000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">13. Volumen (m³) *</label>
                <input type="text" name="volumen" value={form.volumen} onChange={(e) => setForm({ ...form, volumen: e.target.value.replace(/[^\d,]/g, '') })} className="w-full p-2 border border-slate-300 rounded-lg text-right" placeholder="0,000" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">14. Valor (Incoterm) *</label>
              <div className="flex gap-2">
                <div className="w-24"><Select options={INCOTERMS} value={INCOTERMS.find(x => x.value === form.incoterm)} onChange={handleIncoterm} placeholder="Tipo" className={errClass('incoterm')} /></div>
                <input type="text" name="valor_incoterm" value={form.valor_incoterm} onChange={(e) => setForm({ ...form, valor_incoterm: e.target.value.replace(/[^\d,]/g, '') })} className={`flex-1 p-2 border rounded-lg text-right ${errClass('valor_incoterm')}`} placeholder="0,00" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Moneda *</label>
              <Select options={opt(monedas)} value={monedaGasto} onChange={handleMonedaGasto} placeholder="Seleccionar..." getOptionLabel={o => o.codigo ? `${o.codigo} - ${o.nombre}` : o.label} className={errClass('moneda_id')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">16. Valor Declarado *</label>
              <input type="text" name="declaracion_mercaderia" value={form.declaracion_mercaderia} onChange={(e) => setForm({ ...form, declaracion_mercaderia: e.target.value.replace(/[^\d,]/g, '') })} className={`w-full p-2 border rounded-lg text-right ${errClass('declaracion_mercaderia')}`} placeholder="0,00" />
            </div>
          </div>
        </div>

        {/* Card 4: Gastos */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-200">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-lg text-slate-800">4. Gastos a Pagar (Campo 15)</h3>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Concepto / Tramo</label>
                <input value={gastoActual.tramo} onChange={e => setGastoActual({ ...gastoActual, tramo: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="Ej. Flete Asunción - Foz" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Remitente</label>
                <input value={gastoActual.valor_remitente} onChange={e => handleValorGastoInput(e, 'valor_remitente')} onBlur={e => handleValorGastoBlur(e, 'valor_remitente')} className="w-full p-2 border border-slate-300 rounded-lg text-right text-sm" placeholder="0,00" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Destinatario</label>
                <input value={gastoActual.valor_destinatario} onChange={e => handleValorGastoInput(e, 'valor_destinatario')} onBlur={e => handleValorGastoBlur(e, 'valor_destinatario')} className="w-full p-2 border border-slate-300 rounded-lg text-right text-sm" placeholder="0,00" />
              </div>
              <div>
                <button type="button" onClick={handleAddGasto} className="w-full bg-indigo-600 text-white p-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">Agregar</button>
              </div>
            </div>
          </div>

          {form.gastos.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-500 bg-opacity-50">
                  <tr>
                    <th className="p-3 text-left font-semibold">Concepto</th>
                    <th className="p-3 text-right font-semibold">Remitente ({monedaCodigo})</th>
                    <th className="p-3 text-right font-semibold">Destinatario ({monedaCodigo})</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.gastos.map((g, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3">{g.tramo}</td>
                      <td className="p-3 text-right">{parseFloat(g.valor_remitente || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right">{parseFloat(g.valor_destinatario || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-center"><button type="button" onClick={() => handleRemoveGasto(i)} className="text-red-500 hover:text-red-700 font-bold">×</button></td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold text-slate-700">
                    <td className="p-3 text-right">TOTALES:</td>
                    <td className="p-3 text-right">{totalRemitente.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right">{totalDestinatario.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Card 5: Firmas y Finalización */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-200">
            <FileCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-lg text-slate-800">5. Firmas y Documentos</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">17. Documentos Anexos</label>
              <input type="text" name="factura_exportacion" value={form.factura_exportacion} onChange={handleInput} placeholder="Factura Exportación" className={`w-full p-2 border rounded-lg mb-2 ${errClass('factura_exportacion')}`} />
              <input type="text" name="nro_despacho" value={form.nro_despacho} onChange={handleInput} placeholder="Nro Despacho" className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">22. Observaciones</label>
              <textarea name="observaciones" value={form.observaciones} onChange={handleInput} rows={3} className={`w-full p-2 border rounded-lg resize-none ${errClass('observaciones')}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">21. Firma Remitente *</label>
              <Select options={opt(remitentes)} value={opt(remitentes).find(x => x.value === form.firma_remitente_id)} onChange={(o) => setForm(f => ({ ...f, firma_remitente_id: o?.value }))} placeholder="Seleccionar..." className={errClass('firma_remitente_id')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">23. Firma Transportador *</label>
              <Select options={opt(transportadoras)} value={opt(transportadoras).find(x => x.value === form.firma_transportador_id)} onChange={(o) => setForm(f => ({ ...f, firma_transportador_id: o?.value }))} placeholder="Seleccionar..." className={errClass('firma_transportador_id')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">24. Firma Destinatario *</label>
              <Select options={opt(remitentes)} value={opt(remitentes).find(x => x.value === form.firma_destinatario_id)} onChange={(o) => setForm(f => ({ ...f, firma_destinatario_id: o?.value }))} placeholder="Seleccionar..." className={errClass('firma_destinatario_id')} />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row justify-end gap-3 pt-4">
          {crtEmitido && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 mr-auto">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">CRT {crtEmitido.numero_crt} Emitido</span>
            </div>
          )}

          <button type="submit" disabled={loadingEmitir} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loadingEmitir ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            Emitir CRT
          </button>

          {crtEmitido && (
            <button type="button" onClick={() => setModalMICOpen(true)} className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-lg flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300">
              <FileCheck className="w-5 h-5" />
              Emitir MIC
            </button>
          )}
        </div>

      </form>

      <ModalMICCompleto isOpen={modalMICOpen} onClose={() => { setModalMICOpen(false); setDiagnosticoMIC(null); }} crt={crtEmitido} onGenerate={handleGenerateMIC} loading={loadingMIC} diagnostico={diagnosticoMIC} />
      <CRTPreview crtData={previewData} onClose={() => setPreviewOpen(false)} onDownloadPDF={descargarPDFFromPreview} isOpen={previewOpen} />
    </div>
  );
}

export default CRT;