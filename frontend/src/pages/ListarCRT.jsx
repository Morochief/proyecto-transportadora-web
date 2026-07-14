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
import { useDebounce } from "../hooks/useDebounce";
import StatusBadge from "../components/StatusBadge";
import EnhancedTable from "../components/EnhancedTable";
import { useConfirm } from "../hooks/useConfirm.jsx";

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
  const debouncedQuery = useDebounce(query, 400);
  const [currentPage, setCurrentPage] = useState(1);

  const navigate = useNavigate();
  const [ConfirmDialog, confirm] = useConfirm();

  const columns = [
    {
      field: "numero_crt",
      label: "Número",
      render: (val, crt) => (
        <div>
          <button onClick={() => navigate(`/crt/editar/${crt.id}`)} className="font-bold text-indigo-600 hover:underline">{val}</button>
          <div className="text-xs text-slate-400 mt-1">{crt.fecha_emision || 'Sin fecha'}</div>
        </div>
      )
    },
    {
      field: "estado",
      label: "Estado",
      render: (val) => <StatusBadge status={val} />
    },
    {
      field: "transportadora",
      label: "Transportadora",
    },
    {
      field: "remitente",
      label: "Remitente / Destinatario",
      render: (val, crt) => (
        <div className="flex flex-col text-sm">
          <span className="font-medium text-slate-700">{val}</span>
          <span className="text-slate-400 text-xs">🡢 {crt.destinatario}</span>
        </div>
      )
    },
    {
      field: "factura_exportacion",
      label: "Factura",
      render: (val) => <span className="font-mono">{val || '-'}</span>
    },
    {
      field: "tiene_mic",
      label: "MIC",
      render: (val, crt) => crt.tiene_mic ? (
        <div className="flex flex-col items-start cursor-help" title={`MIC: ${crt.mic_numero} (${crt.mic_estado})`}>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${crt.mic_estado === 'ANULADO' ? 'bg-red-50 text-red-700 border-red-200' :
            crt.mic_estado === 'DEFINITIVO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              'bg-purple-50 text-purple-700 border-purple-200'
            }`}>
            <FileCheck className="w-3 h-3" />
            {crt.mics_count > 1 ? `${crt.mics_count} MICs` : (crt.mic_numero || 'Generado')}
          </span>
        </div>
      ) : <span className="text-slate-300 text-xs pl-2">-</span>
    }
  ];

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

  const itemsPerPage = 10;

  // ========== EFECTOS Y CARGA DE DATOS ==========
  useEffect(() => {
    const inicializar = async () => {
      await cargarAuxiliares();
      cargarCRTs();
    };
    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarAuxiliares = async () => {
    try {
      const [estRes, transRes, entRes, monRes, ciuRes, paiRes] = await Promise.all([
        api.get("/crts/estados"),
        api.get("/transportadoras/"),
        api.get("/crts/data/entidades"),
        api.get("/monedas/"),
        api.get("/ciudades/"),
        api.get("/paises/")
      ]);

      const transportadorasList = Array.isArray(transRes.data) ? transRes.data : (transRes.data?.items || []);
      const entidadesList = Array.isArray(entRes.data) ? entRes.data : (entRes.data?.items || []);
      const monedasList = Array.isArray(monRes.data) ? monRes.data : (monRes.data?.items || []);

      setEstados(estRes.data.estados || []);
      setTransportadoras(transportadorasList.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setEntidades(entidadesList.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setMonedas(monedasList.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setCiudades((ciuRes.data || []).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setPaises((paiRes.data || []).sort((a, b) => a.nombre.localeCompare(b.nombre)));

    } catch (error) {
      console.log("⚠️ Error cargando datos auxiliares:", error.message);
      toast.error("Algunos datos auxiliares no se pudieron cargar", { toastId: "aux-error" });
    }
  };

  const cargarCRTs = () => {
    setLoading(true);
    if (usarPaginadoBackend || Object.values(filtrosAvanzados).some((v) => v !== "")) {
      cargarCRTsPaginado();
    } else {
      api.get("/crts/")
        .then((res) => {
          // Soporte para nueva estructura unificada { crts: [], total: ... }
          const data = res.data;
          const listaCrts = Array.isArray(data) ? data : (data.crts || []);
          const total = Array.isArray(data)
            ? data.length
            : (data.pagination?.total || data.total || listaCrts.length);

          console.log("✅ Datos recibidos:", listaCrts.length, "CRTs");

          setCrts(listaCrts);
          setFiltered(listaCrts);
          setTotalItems(total);

          // Si es paginado desde backend, usar pages. Si no, calcular localmente
          const pages = (data.pagination && data.pagination.pages) || Math.ceil(total / itemsPerPage) || 1;
          setTotalPages(pages);
        })
        .catch((err) => {
          console.error("❌ Error cargando CRTs:", err);
          console.error("Error completo:", err.response?.data || err.message);
          toast.error("❌ Error al cargar CRTs");
        })
        .finally(() => setLoading(false));
    }
  };

  const cargarCRTsPaginado = async (page = currentPage) => {
    try {
      const params = new URLSearchParams({
        page: page,
        per_page: itemsPerPage,
        q: debouncedQuery,
        ...Object.fromEntries(Object.entries(filtrosAvanzados).filter(([_, value]) => value !== "")),
      });

      const response = await api.get(`/crts/?${params}`);
      const data = response.data;
      const listaCrts = data.crts || [];
      setCrts(listaCrts);
      setFiltered(listaCrts);
      setTotalItems(data.pagination?.total || listaCrts.length);
      setTotalPages(data.pagination?.pages || 1);
      setCurrentPage(data.pagination?.page || page);
    } catch (error) {
      setUsarPaginadoBackend(false);
      cargarCRTs();
    }
  };

  useEffect(() => {
    if (usarPaginadoBackend) {
      cargarCRTsPaginado(currentPage);
    }
  }, [currentPage, debouncedQuery, usarPaginadoBackend]);

  useEffect(() => {
    if (!usarPaginadoBackend) {
      const lower = debouncedQuery.toLowerCase();
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
  }, [debouncedQuery, crts, usarPaginadoBackend]);

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

  const eliminarCRT = async (crt_id, forceDelete = false) => {
    if (!forceDelete) {
      const ok = await confirm({
        title: "Eliminar CRT",
        message: "¿Está seguro de que desea eliminar este CRT?"
      });
      if (!ok) return;
    }

    try {
      const url = forceDelete ? `/crts/${crt_id}?force=true` : `/crts/${crt_id}`;
      const response = await api.delete(url);
      toast.success(`✅ ${response.data.message}`);
      cargarCRTs();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.requires_confirmation) {
        const data = err.response.data;
        const micsInfo = data.mics || [];

        let mensaje = `⚠️ ATENCIÓN: Este CRT tiene ${data.mics_count} MIC(s) vinculado(s):\n\n`;
        micsInfo.forEach((mic, i) => {
          mensaje += `${i + 1}. ${mic.numero} - Estado: ${mic.estado}\n`;
        });
        mensaje += `\n¿Desea ELIMINAR PERMANENTEMENTE el CRT junto con TODOS sus MICs asociados?\n\n`;
        mensaje += `⛔ Esta acción NO se puede deshacer.`;

        const okForce = await confirm({
          title: "Confirmar eliminación forzada",
          message: mensaje
        });
        if (okForce) {
          eliminarCRT(crt_id, true);
        }
      } else {
        toast.error("❌ Error al eliminar: " + (err.response?.data?.error || err.message));
      }
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

  const currentItems = usarPaginadoBackend ? filtered : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaderRight = (
    <div className="flex items-center gap-2">
      <button onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border ${mostrarFiltrosAvanzados ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
        <Filter className="w-4 h-4" />
        <span>Filtros</span>
      </button>
      <button onClick={() => navigate('/crt')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
        <Plus className="w-5 h-5" />
        <span>Nuevo CRT</span>
      </button>
    </div>
  );

  const tableActions = (crt) => (
    <div className="flex justify-end gap-1">
      <button onClick={() => mostrarVistaPrevia(crt)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Ver"><Eye className="w-4 h-4" /></button>
      <button onClick={() => imprimirPDF(crt.id)} disabled={loadingPDF === crt.id} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="PDF">{loadingPDF === crt.id ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <FileText className="w-4 h-4" />}</button>
      <button onClick={() => navigate(`/crt/editar/${crt.id}`)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" title="Editar"><Edit3 className="w-4 h-4" /></button>
      <button onClick={() => duplicarCRT(crt.id)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Duplicar"><Copy className="w-4 h-4" /></button>
      {crt.estado === "EMITIDO" && (
        <button onClick={() => emitirMIC(crt)} disabled={loadingMIC === crt.id} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all" title="MIC">{loadingMIC === crt.id ? <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /> : <FileCheck className="w-4 h-4" />}</button>
      )}
      <button onClick={() => eliminarCRT(crt.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
    </div>
  );

  return (
    <div className="min-h-full space-y-6 animate-in fade-in duration-500">
      <ConfirmDialog title="Eliminar CRT" message="¿Está seguro de que desea eliminar este CRT?" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Historial CRT</h1>
          <p className="text-slate-500 mt-1">Gestión de Cartas de Porte Internacional / Manifesto Internacional de Carga.</p>
        </div>
      </div>

      {/* Stats Cards Row */}
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

      {/* Filtros Avanzados */}
      {mostrarFiltrosAvanzados && (
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Enhanced Table Component */}
      <EnhancedTable
        columns={columns}
        data={currentItems}
        loading={loading}
        onSearchChange={(val) => setQuery(val)}
        searchPlaceholder="Buscar por número, entidad, factura..."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
        actions={tableActions}
        headerRight={tableHeaderRight}
        totalItems={totalItems}
      />

      <ModalMICCompleto isOpen={modalMIC.isOpen} onClose={cerrarModalMIC} crt={modalMIC.crt} onGenerate={generarPDFMIC} loading={loadingMIC === modalMIC.crt?.id} />
      <CRTPreview crtData={previewData} onClose={() => setPreviewOpen(false)} onDownloadPDF={descargarPDFFromPreview} isOpen={previewOpen} />
    </div>
  );
}

export default ListarCRT;
