import React, { useState, useEffect } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Search, Plus, Filter, Download, FileText, Trash2, Edit3, Eye, Copy,
  Printer, FileCheck, Truck, MapPin, Calendar, DollarSign, Package,
  ChevronLeft, ChevronRight, X, Save, AlertCircle, Info, CheckCircle
} from "lucide-react";
import Modal from "./Modal";

import ModalMICCompleto from "./ModalMICCompleto";
import CRTPreview from "../components/CRTPreview";

// Componente Toast personalizado para mantener consistencia visual si es necesario, 
// o usamos Toastify pero intentamos que se vea bien.

function ListarCRT() {
  // ========== ESTADOS EXISTENTES (MANTENIDOS) ==========
  const [crts, setCrts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPDF, setLoadingPDF] = useState(null);
  const [loadingMIC, setLoadingMIC] = useState(null);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const navigate = useNavigate();

  // ========== NUEVOS ESTADOS PARA MEJORAS ==========
  const [usarPaginadoBackend, setUsarPaginadoBackend] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filtrosAvanzados, setFiltrosAvanzados] = useState({
    estado: "",
    transportadora_id: "",
    fecha_desde: "",
    fecha_hasta: "",
  });
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);
  const [estados, setEstados] = useState([]);
  const [transportadoras, setTransportadoras] = useState([]);
  const [crtEditando, setCrtEditando] = useState(null);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalMIC, setModalMIC] = useState({
    isOpen: false,
    crt: null,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // ========== NUEVOS ESTADOS PARA ENTIDADES Y CAMPO 15 ==========
  const [entidades, setEntidades] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [paises, setPaises] = useState([]);
  const [campo15Items, setCampo15Items] = useState([]);

  const itemsPerPage = 10;

  // ========== FUNCIONES AUXILIARES PARA FORMATEO NUMÉRICO ==========
  const formatearEntradaNumerica = (valor) => {
    if (!valor) return "";
    return valor.toString().replace(".", ",");
  };

  const parsearEntradaNumerica = (valor) => {
    if (!valor) return "";
    const valorLimpio = valor.toString().replace(",", ".");
    const numero = parseFloat(valorLimpio);
    return isNaN(numero) ? "" : numero;
  };

  const manejarEntradaNaturalComa = (e, callback) => {
    let valor = e.target.value;
    const caracteresPermitidos = /^-?[\d,]*$/;
    if (!caracteresPermitidos.test(valor)) {
      e.preventDefault();
      return;
    }
    const comas = (valor.match(/,/g) || []).length;
    if (comas > 1) {
      e.preventDefault();
      return;
    }
    if (valor.includes(',')) {
      const partes = valor.split(',');
      if (partes[1] && partes[1].length > 2) {
        valor = partes[0] + ',' + partes[1].substring(0, 2);
      }
    }
    callback(valor);
  };

  const autocompletarValorFleteExterno = (campo15Items) => {
    if (campo15Items.length === 0) return '';
    const primerItem = campo15Items[0];
    if (!primerItem) return '';
    const valor = primerItem.valor_remitente || primerItem.valor_destinatario || '';
    return parsearEntradaNumerica(valor);
  };

  // ========== EFECTOS Y CARGA DE DATOS ==========
  useEffect(() => {
    const inicializar = async () => {
      await cargarDatosIniciales();
      cargarCRTs();
    };
    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (campo15Items.length > 0 && modalEditar) {
      const primerValor = autocompletarValorFleteExterno(campo15Items);
      if (primerValor) {
        const campoFleteExterno = document.querySelector('input[name="valor_flete_externo"]');
        if (campoFleteExterno && !campoFleteExterno.value) {
          campoFleteExterno.value = formatearEntradaNumerica(primerValor);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campo15Items, modalEditar]);

  const cargarDatosIniciales = async () => {
    try {
      const [estRes, transRes, entRes, monRes, ciuRes, paiRes] = await Promise.all([
        api.get("/crts/estados"),
        api.get("/crts/data/transportadoras"),
        api.get("/crts/data/entidades"),
        api.get("/crts/data/monedas"),
        api.get("/ciudades/"),
        api.get("/paises/")
      ]);

      setEstados(estRes.data.estados || []);
      setTransportadoras((transRes.data.items || []).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setEntidades((entRes.data.items || []).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setMonedas((monRes.data.items || []).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setCiudades((ciuRes.data || []).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setPaises((paiRes.data || []).sort((a, b) => a.nombre.localeCompare(b.nombre)));

    } catch (error) {
      console.log("⚠️ Error cargando datos auxiliares:", error.message);
      toast.warn("Algunos datos auxiliares no se pudieron cargar");
    }
  };

  const cargarCRTs = () => {
    setLoading(true);
    if (usarPaginadoBackend || Object.values(filtrosAvanzados).some((v) => v !== "")) {
      cargarCRTsPaginado();
    } else {
      api.get("/crts")
        .then((res) => {
          setCrts(res.data);
          setFiltered(res.data);
          setTotalItems(res.data.length);
          setTotalPages(Math.ceil(res.data.length / itemsPerPage));
          toast.success("✅ CRTs cargados");
        })
        .catch(() => toast.error("❌ Error al cargar CRTs"))
        .finally(() => setLoading(false));
    }
  };

  const cargarCRTsPaginado = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage,
        per_page: itemsPerPage,
        q: query,
        ...Object.fromEntries(Object.entries(filtrosAvanzados).filter(([_, value]) => value !== "")),
      });

      const response = await api.get(`/crts/paginated?${params}`);
      const data = response.data;
      setCrts(data.crts || []);
      setFiltered(data.crts || []);
      setTotalItems(data.pagination.total);
      setTotalPages(data.pagination.pages);
      setCurrentPage(data.pagination.page);
      toast.success("✅ CRTs cargados con filtros avanzados");
    } catch (error) {
      setUsarPaginadoBackend(false);
      cargarCRTs();
    }
  };

  useEffect(() => {
    if (!usarPaginadoBackend) {
      const lower = query.toLowerCase();
      setFiltered(crts.filter((c) =>
        (c.numero_crt || "").toLowerCase().includes(lower) ||
        (c.estado || "").toLowerCase().includes(lower) ||
        (c.transportadora || "").toLowerCase().includes(lower) ||
        (c.remitente || "").toLowerCase().includes(lower) ||
        (c.destinatario || "").toLowerCase().includes(lower) ||
        (c.factura_exportacion || "").toLowerCase().includes(lower)
      ));
      setCurrentPage(1);
    }
  }, [query, crts, usarPaginadoBackend]);

  useEffect(() => {
    if (!usarPaginadoBackend) {
      setTotalItems(filtered.length);
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    }
  }, [filtered, usarPaginadoBackend]);

  // ========== CRUD ACTIONS ==========
  const imprimirPDF = async (crt_id) => {
    setLoadingPDF(crt_id);
    try {
      const res = await api.post(`/crts/${crt_id}/pdf`, {}, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("📄 PDF CRT descargado");
    } catch (err) {
      toast.error("❌ Error generando PDF CRT");
    } finally {
      setLoadingPDF(null);
    }
  };

  const eliminarCRT = async (crt_id) => {
    if (!window.confirm("¿Eliminar este CRT?")) return;
    try {
      await api.delete(`/crts/${crt_id}`);
      toast.success("✅ CRT eliminado");
      cargarCRTs();
    } catch (err) {
      toast.error("❌ Error al eliminar");
    }
  };

  const emitirMIC = async (crt) => {
    if (!crt.numero_crt) {
      toast.warn("Primero debes emitir el CRT antes de generar el MIC.");
      return;
    }
    setModalMIC({ isOpen: true, crt: crt });
  };

  const generarPDFMIC = async (datosModal) => {
    const crt = modalMIC.crt;
    if (!crt) return;
    setLoadingMIC(crt.id);
    try {
      // 1. Guardar MIC
      const saveResponse = await api.post(`/mic-guardados/crear-desde-crt/${crt.id}`, datosModal);
      const { pdf_url } = saveResponse.data;

      // 2. Descargar PDF
      const pdfResponse = await api.get(pdf_url, {
        responseType: "blob", timeout: 30000
      });

      const blob = new Blob([pdfResponse.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);

      toast.success(`✅ MIC Guardado y PDF generado`);
      setModalMIC({ isOpen: false, crt: null });
    } catch (error) {
      console.error(error);
      toast.error(`❌ Error al guardar/generar MIC: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoadingMIC(null);
    }
  };

  const cerrarModalMIC = () => setModalMIC({ isOpen: false, crt: null });

  const mostrarVistaPrevia = async (crt) => {
    try {
      const response = await api.get(`/crts/${crt.id}`);
      const crtData = response.data;
      const previewData = {
        ...crtData,
        remitente: entidades.find(e => e.id === crtData.remitente_id)?.nombre || crtData.remitente || '',
        destinatario: entidades.find(e => e.id === crtData.destinatario_id)?.nombre || crtData.destinatario || '',
        consignatario: entidades.find(e => e.id === crtData.consignatario_id)?.nombre || crtData.consignatario || '',
        notificar_a: entidades.find(e => e.id === crtData.notificar_a_id)?.nombre || crtData.notificar_a || '',
        transportadora: transportadoras.find(t => t.id === crtData.transportadora_id)?.nombre || crtData.transportadora || '',
        moneda: monedas.find(m => m.id === crtData.moneda_id)?.codigo || '',
        ciudad_emision: ciudades.find(c => c.id === crtData.ciudad_emision_id)?.nombre || '',
        pais_emision: paises.find(p => p.id === crtData.pais_emision_id)?.nombre || '',
        remitente_direccion: entidades.find(e => e.id === crtData.remitente_id)?.direccion || '',
        remitente_ciudad: ciudades.find(c => c.id === entidades.find(e => e.id === crtData.remitente_id)?.ciudad_id)?.nombre || '',
        remitente_pais: paises.find(p => p.id === ciudades.find(c => c.id === entidades.find(e => e.id === crtData.remitente_id)?.ciudad_id)?.pais_id)?.nombre || '',
        destinatario_direccion: entidades.find(e => e.id === crtData.destinatario_id)?.direccion || '',
        destinatario_ciudad: ciudades.find(c => c.id === entidades.find(e => e.id === crtData.destinatario_id)?.ciudad_id)?.nombre || '',
        destinatario_pais: paises.find(p => p.id === ciudades.find(c => c.id === entidades.find(e => e.id === crtData.destinatario_id)?.ciudad_id)?.pais_id)?.nombre || '',
        transportadora_direccion: transportadoras.find(t => t.id === crtData.transportadora_id)?.direccion || '',
        transportadora_ciudad: ciudades.find(c => c.id === transportadoras.find(t => t.id === crtData.transportadora_id)?.ciudad_id)?.nombre || '',
        transportadora_pais: paises.find(p => p.id === ciudades.find(c => c.id === transportadoras.find(t => t.id === crtData.transportadora_id)?.ciudad_id)?.pais_id)?.nombre || '',
      };
      setPreviewData(previewData);
      setPreviewOpen(true);
    } catch (error) { toast.error('Error obteniendo datos para vista previa'); }
  };

  const descargarPDFFromPreview = async () => {
    if (!previewData) return;
    try {
      const response = await api.post(`/crts/${previewData.id}/pdf`, {}, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) { alert("Error descargando PDF"); }
  };

  const aplicarFiltrosAvanzados = () => {
    setUsarPaginadoBackend(true);
    setCurrentPage(1);
    cargarCRTsPaginado();
  };

  const limpiarFiltros = () => {
    setQuery("");
    setFiltrosAvanzados({ estado: "", transportadora_id: "", fecha_desde: "", fecha_hasta: "" });
    setUsarPaginadoBackend(false);
    setCurrentPage(1);
    cargarCRTs();
  };

  const duplicarCRT = async (crtId) => {
    try {
      const response = await api.post(`/crts/${crtId}/duplicate`);
      toast.success(`✅ CRT duplicado: ${response.data.nuevo_numero}`);
      cargarCRTs();
    } catch (error) { toast.error("❌ Error duplicando CRT"); }
  };

  const editarCRT = (crtId) => {
    navigate(`/crt/editar/${crtId}`);
  };

  const agregarCampo15Item = () => {
    const nuevosItems = [...campo15Items, { id: null, descripcion_gasto: "", valor_remitente: "", moneda_remitente: "USD", valor_destinatario: "", moneda_destinatario: "USD" }];
    setCampo15Items(nuevosItems);
    if (nuevosItems.length === 1) toast.info("💡 Primer tramo se autocopia a Flete Ext.", { autoClose: 3000 });
  };

  const eliminarCampo15Item = (index) => setCampo15Items(campo15Items.filter((_, i) => i !== index));

  const actualizarCampo15Item = (index, campo, valor) => {
    const nuevosItems = [...campo15Items];
    if (campo === 'valor_remitente' || campo === 'valor_destinatario') {
      const valorProcesado = parsearEntradaNumerica(valor);
      nuevosItems[index] = { ...nuevosItems[index], [campo]: valorProcesado };
      if (index === 0 && valorProcesado) {
        const campoFleteExterno = document.querySelector('input[name="valor_flete_externo"]');
        if (campoFleteExterno) {
          campoFleteExterno.value = formatearEntradaNumerica(valorProcesado);
          campoFleteExterno.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    } else {
      nuevosItems[index] = { ...nuevosItems[index], [campo]: valor };
    }
    setCampo15Items(nuevosItems);
  };

  const calcularTotales = () => {
    const totalRemitente = campo15Items.reduce((total, item) => total + (parseFloat(item.valor_remitente) || 0), 0);
    const totalDestinatario = campo15Items.reduce((total, item) => total + (parseFloat(item.valor_destinatario) || 0), 0);
    return { totalRemitente, totalDestinatario };
  };

  const buscarEntidadPorId = (id) => entidades.find((e) => e.id === parseInt(id))?.nombre || "";
  const buscarTransportadoraPorId = (id) => transportadoras.find((t) => t.id === parseInt(id))?.nombre || "";
  const buscarMonedaPorId = (id) => { const m = monedas.find((m) => m.id === parseInt(id)); return m ? `${m.codigo} - ${m.nombre}` : ""; };

  const guardarCambios = async (e) => {
    e.preventDefault();
    if (!crtEditando) return;
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      const camposNumericos = ["peso_bruto", "peso_neto", "volumen", "valor_incoterm", "valor_mercaderia", "declaracion_mercaderia", "valor_flete_externo", "valor_reembolso"];
      camposNumericos.forEach((campo) => { if (data[campo]) data[campo] = parsearEntradaNumerica(data[campo]); });
      data.campo15_items = JSON.stringify(campo15Items);

      await api.put(`/crts/${crtEditando.id}`, data);
      toast.success("✅ CRT actualizado");
      setModalEditar(false);
      setCrtEditando(null);
      setCampo15Items([]);
      cargarCRTs();
    } catch (error) { toast.error("❌ Error actualizando CRT"); }
  };

  const currentItems = usarPaginadoBackend ? filtered : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-full space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Historial CRT</h1>
          <p className="text-slate-500 mt-1">Gestión de Cartas de Porte Internacional / Manifesto Internacional de Carga.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border ${mostrarFiltrosAvanzados ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
          </button>
          <button onClick={() => navigate('/crt/nuevo')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            <span>Nuevo CRT</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row (Optional) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div><p className="text-sm font-medium text-slate-500">Total CRTs</p><p className="text-2xl font-bold text-slate-800">{totalItems}</p></div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FileText className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div><p className="text-sm font-medium text-slate-500">En Tránsito</p><p className="text-2xl font-bold text-slate-800">{crts.filter(c => c.estado === 'EN_TRANSITO').length}</p></div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Truck className="w-6 h-6" /></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por número, entidad, factura..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (usarPaginadoBackend) setTimeout(() => aplicarFiltrosAvanzados(), 500);
              }}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Filtros Avanzados */}
        {mostrarFiltrosAvanzados && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Estado</label>
              <select value={filtrosAvanzados.estado} onChange={(e) => setFiltrosAvanzados({ ...filtrosAvanzados, estado: e.target.value })} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500">
                <option value="">Todos</option>
                {estados.map(e => <option key={e} value={e}>{e.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Transportadora</label>
              <select value={filtrosAvanzados.transportadora_id} onChange={(e) => setFiltrosAvanzados({ ...filtrosAvanzados, transportadora_id: e.target.value })} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500">
                <option value="">Todas</option>
                {transportadoras.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Desde</label>
              <input type="date" value={filtrosAvanzados.fecha_desde} onChange={(e) => setFiltrosAvanzados({ ...filtrosAvanzados, fecha_desde: e.target.value })} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Hasta</label>
              <input type="date" value={filtrosAvanzados.fecha_hasta} onChange={(e) => setFiltrosAvanzados({ ...filtrosAvanzados, fecha_hasta: e.target.value })} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500" />
            </div>
            <div className="lg:col-span-4 flex justify-end gap-2 mt-2">
              <button onClick={limpiarFiltros} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-md transition-colors">Limpiar</button>
              <button onClick={aplicarFiltrosAvanzados} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm">Aplicar Filtros</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3">Número</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Transportadora</th>
                <th className="px-6 py-3">Remitente / Destinatario</th>
                <th className="px-6 py-3">Factura</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-500">Cargando datos...</td></tr>
              ) : currentItems.map((crt) => (
                <tr key={crt.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <button onClick={() => navigate(`/crt/${crt.id}`)} className="font-bold text-indigo-600 hover:underline">{crt.numero_crt}</button>
                    <div className="text-xs text-slate-400 mt-1">{crt.fecha_emision || 'Sin fecha'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${crt.estado === 'EMITIDO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      crt.estado === 'BORRADOR' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        crt.estado === 'EN_TRANSITO' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                      {crt.estado.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{crt.transportadora}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-sm">
                      <span className="font-medium text-slate-700">{crt.remitente}</span>
                      <span className="text-slate-400 text-xs">🡢 {crt.destinatario}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{crt.factura_exportacion || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => mostrarVistaPrevia(crt)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Ver"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => imprimirPDF(crt.id)} disabled={loadingPDF === crt.id} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="PDF">{loadingPDF === crt.id ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <FileText className="w-4 h-4" />}</button>
                      <button onClick={() => editarCRT(crt.id)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" title="Editar"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => duplicarCRT(crt.id)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Duplicar"><Copy className="w-4 h-4" /></button>
                      {crt.estado === "EMITIDO" && (
                        <button onClick={() => emitirMIC(crt)} disabled={loadingMIC === crt.id} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all" title="MIC">{loadingMIC === crt.id ? <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /> : <FileCheck className="w-4 h-4" />}</button>
                      )}
                      <button onClick={() => eliminarCRT(crt.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Mostrando {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} registros
          </div>
          <div className="flex gap-2">
            <button onClick={() => { const p = Math.max(1, currentPage - 1); setCurrentPage(p); if (usarPaginadoBackend) cargarCRTsPaginado(); }} disabled={currentPage === 1} className="p-2 border border-slate-300 rounded hover:bg-white disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => { const p = Math.min(totalPages, currentPage + 1); setCurrentPage(p); if (usarPaginadoBackend) cargarCRTsPaginado(); }} disabled={currentPage === totalPages} className="p-2 border border-slate-300 rounded hover:bg-white disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

      </div>


      <ModalMICCompleto isOpen={modalMIC.isOpen} onClose={cerrarModalMIC} crt={modalMIC.crt} onGenerate={generarPDFMIC} loading={loadingMIC === modalMIC.crt?.id} />
      <CRTPreview crtData={previewData} onClose={() => setPreviewOpen(false)} onDownloadPDF={descargarPDFFromPreview} isOpen={previewOpen} />

      {/* Inline Modal for Editing - Stylized */}
      {modalEditar && crtEditando && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Edit3 className="w-5 h-5 text-indigo-600" /> Editar CRT {crtEditando.numero_crt}</h3>
              <button onClick={() => setModalEditar(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-50/50">
              <form onSubmit={guardarCambios} id="form-edit-crt">
                {/* Basic Info */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                  <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Información Básica</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Número CRT *</label>
                      <input type="text" name="numero_crt" defaultValue={crtEditando.numero_crt} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Estado *</label>
                      <select name="estado" defaultValue={crtEditando.estado} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                        {["BORRADOR", "EMITIDO", "EN_TRANSITO", "ENTREGADO", "FINALIZADO", "CANCELADO"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Emisión</label>
                      <input type="date" name="fecha_emision" defaultValue={crtEditando.fecha_emision} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>

                {/* Entidades */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                  <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2"><Truck className="w-4 h-4" /> Entidades</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { label: 'Remitente', name: 'remitente_id', currentId: crtEditando.remitente_id, currentName: crtEditando.remitente },
                      { label: 'Destinatario', name: 'destinatario_id', currentId: crtEditando.destinatario_id, currentName: crtEditando.destinatario },
                      { label: 'Consignatario', name: 'consignatario_id', currentId: crtEditando.consignatario_id, currentName: crtEditando.consignatario },
                      { label: 'Notificar A', name: 'notificar_a_id', currentId: crtEditando.notificar_a_id, currentName: crtEditando.notificar_a }
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
                        <select name={field.name} defaultValue={field.currentId || ""} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                          <option value="">Seleccionar...</option>
                          {entidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                        </select>
                        {field.currentId && <p className="text-xs text-slate-400 mt-1">Actual: {buscarEntidadPorId(field.currentId) || field.currentName}</p>}
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Transportadora</label>
                      <select name="transportadora_id" defaultValue={crtEditando.transportadora_id || ""} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                        <option value="">Seleccionar...</option>
                        {transportadoras.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
                      <select name="moneda_id" defaultValue={crtEditando.moneda_id || ""} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                        <option value="">Seleccionar...</option>
                        {monedas.map(m => <option key={m.id} value={m.id}>{m.codigo} - {m.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Medidas y Pesos */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                  <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2"><Package className="w-4 h-4" /> Medidas y Pesos (Use coma para decimales)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['peso_bruto', 'peso_neto', 'volumen'].map(field => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{field.replace('_', ' ')}</label>
                        <input type="text" name={field} defaultValue={formatearEntradaNumerica(crtEditando[field] || "")} onChange={(e) => manejarEntradaNaturalComa(e, (v) => e.target.value = v)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="0,00" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Campo 15 */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2"><DollarSign className="w-4 h-4" /> Campo 15 - Gastos</h4>
                    <button type="button" onClick={agregarCampo15Item} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors shadow-sm"><Plus className="w-3 h-3" /> Agregar Gasto</button>
                  </div>

                  {campo15Items.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                          <tr>
                            <th className="px-4 py-2 border-b">Descripción</th>
                            <th className="px-4 py-2 border-b text-center col-span-2">Remitente</th>
                            <th className="px-4 py-2 border-b text-center col-span-2">Destinatario</th>
                            <th className="px-4 py-2 border-b w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {campo15Items.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="p-2">
                                <input type="text" value={item.descripcion_gasto} onChange={(e) => actualizarCampo15Item(index, "descripcion_gasto", e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm" placeholder="Descripción..." />
                              </td>
                              <td className="p-2">
                                <div className="flex gap-1">
                                  <select value={item.moneda_remitente} onChange={(e) => actualizarCampo15Item(index, "moneda_remitente", e.target.value)} className="w-20 p-2 border border-slate-300 rounded text-xs bg-slate-50">{monedas.map(m => <option key={m.id} value={m.codigo}>{m.codigo}</option>)}</select>
                                  <input type="text" value={formatearEntradaNumerica(item.valor_remitente)} onChange={(e) => manejarEntradaNaturalComa(e, (v) => actualizarCampo15Item(index, "valor_remitente", v))} className="w-full p-2 border border-slate-300 rounded text-sm text-right" placeholder="0,00" />
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="flex gap-1">
                                  <select value={item.moneda_destinatario} onChange={(e) => actualizarCampo15Item(index, "moneda_destinatario", e.target.value)} className="w-20 p-2 border border-slate-300 rounded text-xs bg-slate-50">{monedas.map(m => <option key={m.id} value={m.codigo}>{m.codigo}</option>)}</select>
                                  <input type="text" value={formatearEntradaNumerica(item.valor_destinatario)} onChange={(e) => manejarEntradaNaturalComa(e, (v) => actualizarCampo15Item(index, "valor_destinatario", v))} className="w-full p-2 border border-slate-300 rounded text-sm text-right" placeholder="0,00" />
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                <button type="button" onClick={() => eliminarCampo15Item(index)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-500">
                      <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No hay gastos registrados en Campo 15</p>
                    </div>
                  )}
                </div>

                {/* Other Fields (grouped for brevity in display, but functional) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                  <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4 border-b pb-2">Otros Valores</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Valor Flete Externo (Auto)</label>
                      <input type="text" name="valor_flete_externo" defaultValue={formatearEntradaNumerica(crtEditando.valor_flete_externo || "")} onChange={(e) => manejarEntradaNaturalComa(e, (v) => e.target.value = v)} className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Valor Reembolso</label>
                      <input type="text" name="valor_reembolso" defaultValue={formatearEntradaNumerica(crtEditando.valor_reembolso || "")} onChange={(e) => manejarEntradaNaturalComa(e, (v) => e.target.value = v)} className="w-full p-2.5 border border-slate-300 rounded-lg" />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setModalEditar(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-white text-slate-700 font-medium transition-colors">Cancelar</button>
              <button form="form-edit-crt" type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors flex items-center gap-2"><Save className="w-4 h-4" /> Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListarCRT;
