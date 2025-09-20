import React, { useEffect, useState } from "react";
import api from "../api/api";
import Select from "react-select";
import ModalMICCompleto from "./ModalMICCompleto";
import CRTPreview from "../components/CRTPreview";

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
  { value: "EXW", label: "EXW" },
  { value: "FCA", label: "FCA" },
  { value: "FOB", label: "FOB" },
  { value: "CPT", label: "CPT" },
  { value: "CIP", label: "CIP" },
  { value: "DAP", label: "DAP" },
  { value: "DDP", label: "DDP" },
];

function CRT() {
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
  const [crtEmitido, setCrtEmitido] = useState(null); // Estado para guardar info del CRT emitido
  const [modalMICOpen, setModalMICOpen] = useState(false); // Estado para controlar el modal MIC
  const [loadingMIC, setLoadingMIC] = useState(false); // Estado para loading del MIC
  const [diagnosticoMIC, setDiagnosticoMIC] = useState(null);
  const [loadingEmitir, setLoadingEmitir] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false); // Estado para controlar la vista previa
  const [previewData, setPreviewData] = useState(null); // Datos para la vista previa

  // Función para mostrar vista previa
  const mostrarVistaPrevia = () => {
    // Preparar datos para la vista previa
    const previewData = {
      ...form,
      // Agregar información de entidades relacionadas
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
      // Agregar direcciones y ciudades
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

  // Función para descargar PDF desde vista previa
  const descargarPDFFromPreview = async () => {
    if (!crtEmitido) {
      alert("Primero debe emitir el CRT antes de descargar el PDF");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/crts/${crtEmitido.id}/pdf`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // No establecer download name para usar el nombre del servidor
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando PDF:", error);
      alert("Error descargando PDF: " + error.message);
    }
  };

  const optCiudadPais = (ciudades, paises) =>
    ciudades.map((c) => {
      const pais = paises.find((p) => p.id === c.pais_id);
      return {
        value: c.id,
        label: `${c.nombre.toUpperCase()} - ${(
          pais?.nombre || ""
        ).toUpperCase()}`,
        ciudad: c.nombre,
        pais: pais?.nombre || "",
        pais_id: c.pais_id,
      };
    });

  const opt = (arr, label = "nombre") =>
    arr.map((x) => ({ ...x, value: x.id, label: x[label] }));


  const [form, setForm] = useState({
    numero_crt: "",
    fecha_emision: hoyISO(),
    estado: "EMITIDO",
    remitente_id: null,
    destinatario_id: null,
    consignatario_id: null,
    notificar_a_id: null,
    transportadora_id: null,
    ciudad_emision_id: null,
    pais_emision_id: null,
    lugar_entrega: "",
    fecha_entrega: "",
    detalles_mercaderia: "",
    peso_bruto: "",
    peso_neto: "",
    volumen: "",
    incoterm: "",
    moneda_id: null,
    valor_incoterm: "",
    valor_mercaderia: "",
    declaracion_mercaderia: "",
    valor_flete_externo: "",
    valor_reembolso: "",
    factura_exportacion: "",
    nro_despacho: "",
    transporte_sucesivos: "",
    observaciones: "",
    formalidades_aduana: "",
    fecha_firma: "",
    gastos: [],
    local_responsabilidad: "",
    firma_remitente_id: null,
    firma_transportador_id: null,
    firma_destinatario_id: null,
  });

  const [gastoActual, setGastoActual] = useState({
    tramo: "",
    valor_remitente: "",
    valor_destinatario: "",
  });

  useEffect(() => {
    if (monedas.length) {
      const exists = monedas.some(
        (m) => m.id === (monedaGasto && monedaGasto.value)
      );
      if (!monedaGasto || !exists) {
        let dolar =
          monedas.find(
            (m) => m.codigo && m.codigo.toUpperCase().includes("USD")
          ) || monedas[0];
        if (dolar)
          setMonedaGasto({
            value: dolar.id,
            label: `${dolar.codigo} - ${dolar.nombre}`,
          });
      }
    }
  }, [monedas, monedaGasto]);

  // ========== REEMPLAZAR EL useEffect DE CARGA DE DATOS ==========
  // ===============================================
  // 🎯 MANTENER TU api.js ORIGINAL - CORREGIR RUTAS
  // ===============================================

  // Tu api.js está bien: baseURL: "http://localhost:5000/api"
  // El problema son las rutas en el nuevo código

  // ❌ CÓDIGO INCORRECTO (que agregamos):
  // api.get("/api/paises/") → http://localhost:5000/api/api/paises/

  // ✅ CÓDIGO CORRECTO (para tu configuración):
  // api.get("/paises/") → http://localhost:5000/api/paises/

  useEffect(() => {
    console.log("🔍 Cargando datos iniciales - RUTAS CORREGIDAS...");

    const loadAllData = async () => {
      try {
        // ✅ PAÍSES - SIN /api/ porque ya está en baseURL
        console.log("📡 Cargando países desde /paises/...");
        const paisesRes = await api.get("/paises/"); // ← Quitamos /api/
        console.log(
          "✅ Países cargados:",
          paisesRes.data.length,
          paisesRes.data
        );
        // Ordenar países alfabéticamente por nombre
        const paisesOrdenados = paisesRes.data.sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
        );
        setPaises(paisesOrdenados);

        // ✅ CIUDADES - SIN /api/ porque ya está en baseURL
        console.log("📡 Cargando ciudades desde /ciudades/...");
        const ciudadesRes = await api.get("/ciudades/"); // ← Quitamos /api/
        console.log(
          "✅ Ciudades cargadas:",
          ciudadesRes.data.length,
          ciudadesRes.data
        );
        // Ordenar ciudades alfabéticamente por nombre
        const ciudadesOrdenadas = ciudadesRes.data.sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
        );
        setCiudades(ciudadesOrdenadas);

        // ✅ REMITENTES - SIN /api/ porque ya está en baseURL
        console.log("📡 Cargando remitentes desde /remitentes/...");
        const remitentesRes = await api.get("/remitentes/"); // ← Quitamos /api/
        console.log(
          "✅ Remitentes cargados:",
          remitentesRes.data.items?.length || remitentesRes.data.length
        );
        console.log(
          "📋 Estructura remitentes:",
          remitentesRes.data.items?.[0] || remitentesRes.data[0]
        );
        // Ordenar remitentes alfabéticamente por nombre
        const remitentesOrdenados = (remitentesRes.data.items || remitentesRes.data)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
        setRemitentes(remitentesOrdenados);

        // ✅ TRANSPORTADORAS - Usar ruta correcta con /api/
        console.log("📡 Cargando transportadoras...");
        try {
          const transportadorasRes = await api.get("/transportadoras/");
          console.log(
            "✅ Transportadoras cargadas:",
            transportadorasRes.data.items?.length ||
              transportadorasRes.data.length
          );
          // Ordenar transportadoras alfabéticamente por nombre
          const transportadorasOrdenadas = (transportadorasRes.data.items || transportadorasRes.data)
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
          setTransportadoras(transportadorasOrdenadas);
        } catch (error) {
          console.log("❌ Error en transportadoras:", error);
          // Fallback: intentar con URL absoluta
          try {
            const response = await fetch(
              "http://localhost:5000/api/transportadoras/"
            );
            const data = await response.json();
            setTransportadoras(data.items || data);
            console.log("✅ Transportadoras cargadas con fetch fallback");
          } catch (fetchError) {
            console.log("❌ Fallback también falló:", fetchError);
            setTransportadoras([]);
          }
        }

        // ✅ MONEDAS - Usar ruta correcta con /api/
        console.log("📡 Cargando monedas...");
        try {
          const monedasRes = await api.get("/monedas/");
          console.log("✅ Monedas cargadas:", monedasRes.data.length);
          // Ordenar monedas alfabéticamente por nombre
          const monedasOrdenadas = monedasRes.data.sort((a, b) =>
            a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
          );
          setMonedas(monedasOrdenadas);
        } catch (error) {
          console.log("❌ Error en monedas:", error);
          // Fallback: intentar con URL absoluta
          try {
            const response = await fetch("http://localhost:5000/api/monedas/");
            const data = await response.json();
            // Ordenar monedas alfabéticamente por nombre
            const monedasOrdenadas = data.sort((a, b) =>
              a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
            );
            setMonedas(monedasOrdenadas);
            console.log("✅ Monedas cargadas con fetch fallback");
          } catch (fetchError) {
            console.log("❌ Fallback monedas falló:", fetchError);
            // Fallback final con datos básicos (ya ordenados)
            const monedasBackup = [
              { id: 2, codigo: "PYG", nombre: "Guaraní Paraguayo" },
              { id: 1, codigo: "USD", nombre: "Dólar Americano" },
            ];
            setMonedas(monedasBackup);
            console.log("✅ Monedas cargadas desde backup:", monedasBackup);
          }
        }
      } catch (error) {
        console.error("❌ Error general en carga de datos:", error);
        console.error("🔍 Detalles del error:", {
          url: error.config?.url,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
      }
    };

    loadAllData();
  }, []);

  // ===============================================
  // 🔍 COMPARACIÓN DE RUTAS:
  // ===============================================

  /*
TU CONFIGURACIÓN ACTUAL:
- baseURL: "http://localhost:5000/api" 

RUTAS QUE FUNCIONAN:
✅ api.get("/paises/") → http://localhost:5000/api/paises/
✅ api.get("/ciudades/") → http://localhost:5000/api/ciudades/
✅ api.get("/remitentes/") → http://localhost:5000/api/remitentes/
✅ api.get("/transportadoras/") → http://localhost:5000/api/transportadoras/
✅ api.get("/monedas/") → http://localhost:5000/api/monedas/

RUTAS QUE NO FUNCIONAN (las que estábamos usando):
❌ api.get("/api/paises/") → http://localhost:5000/api/api/paises/
❌ api.get("/api/ciudades/") → http://localhost:5000/api/api/ciudades/
❌ api.get("/api/remitentes/") → http://localhost:5000/api/api/remitentes/
❌ api.get("../transportadoras/") → http://localhost:5000/transportadoras/
❌ api.get("../monedas/") → http://localhost:5000/monedas/
*/

  // ===============================================
  // 📝 INSTRUCCIONES:
  // ===============================================

  /*
1. ✅ REEMPLAZA solo el useEffect de carga de datos con el código de arriba
2. ✅ MANTÉN todo lo demás igual (tu api.js, otros useEffects, etc.)
3. ✅ RECARGA la página
4. ✅ DEBERÍAS VER en la consola:
   - "✅ Países cargados: 3 [array]"
   - "✅ Ciudades cargadas: 16 [array]" 
   - "✅ Remitentes cargados: [número] [array]"
   - "🎉 === TODOS LOS DATOS CARGADOS ==="
   - "🎯 ✅ PERFECTO: Autocompletado debería funcionar"

5. ✅ SELECCIONA un destinatario y verifica que se autocomplete el campo 8
*/

  // ===============================================
  // 🎯 ESTO RESPETA TU CONFIGURACIÓN ORIGINAL
  // ===============================================

  // - No cambiamos tu api.js
  // - No cambiamos tu estructura de rutas
  // - Solo corregimos las llamadas para que coincidan con tu configuración
  // - Agregamos fallbacks por si algún endpoint tiene problemas

  // ===============================================
  // 🔍 DEBUG ESPECÍFICO PARA TUS DATOS
  // ===============================================

  

  useEffect(() => {
    if (paises.length > 0 && ciudades.length > 0 && remitentes.length > 0) {
      console.log("🎉 === TODOS LOS DATOS CARGADOS ===");

      // Verificar que coincidan con tu BD
      console.log("🌍 PAÍSES CARGADOS EN FRONTEND:");
      paises.forEach((p) => {
        console.log(
          `  ID: ${p.id} | Nombre: ${p.nombre} | Código: ${p.codigo}`
        );
      });

      console.log("🏙️ PRIMERAS 5 CIUDADES:");
      ciudades.slice(0, 5).forEach((c) => {
        const pais = paises.find((p) => p.id === c.pais_id);
        console.log(
          `  ${c.nombre} (ID: ${c.id}) → ${
            pais ? pais.nombre : "PAÍS NO ENCONTRADO"
          } (pais_id: ${c.pais_id})`
        );
      });

      console.log("👥 PRIMEROS 3 REMITENTES:");
      remitentes.slice(0, 3).forEach((r) => {
        const ciudad = ciudades.find((c) => c.id === r.ciudad_id);
        console.log(
          `  ${r.nombre} → ciudad_id: ${r.ciudad_id} (${
            ciudad ? ciudad.nombre : "CIUDAD NO ENCONTRADA"
          })`
        );
      });

      // Verificar específicamente si ASUNCION existe
      const asuncion = ciudades.find((c) =>
        c.nombre.toUpperCase().includes("ASUNCION")
      );
      if (asuncion) {
        console.log("✅ ASUNCIÓN encontrada:", asuncion);
        const paraguay = paises.find((p) => p.id === asuncion.pais_id);
        console.log("✅ Paraguay encontrado:", paraguay);
      } else {
        console.log("❌ ASUNCIÓN no encontrada en las ciudades");
      }

      // Verificar relaciones válidas
      const ciudadesConPaisValido = ciudades.filter((c) =>
        paises.some((p) => p.id === c.pais_id)
      );
      console.log(
        `🔗 Ciudades con país válido: ${ciudadesConPaisValido.length}/${ciudades.length}`
      );

      const remitentesConCiudadValida = remitentes.filter(
        (r) => r.ciudad_id && ciudades.some((c) => c.id === r.ciudad_id)
      );
      console.log(
        `🔗 Remitentes con ciudad válida: ${remitentesConCiudadValida.length}/${remitentes.length}`
      );

      if (
        ciudadesConPaisValido.length === ciudades.length &&
        remitentesConCiudadValida.length > 0
      ) {
        console.log("🎯 ✅ PERFECTO: Autocompletado debería funcionar");
      } else {
        console.log("🚨 PROBLEMA: Revisa las relaciones");
      }
    }
  }, [paises, ciudades, remitentes]);

  // ===============================================
  // 🎯 AUTOCOMPLETADO CAMPO 8 - VERSIÓN FINAL
  // ===============================================

  useEffect(() => {
    console.log("🎯 === AUTOCOMPLETADO CAMPO 8 - EJECUTANDO ===");

    // Log de condiciones
    console.log("Condiciones para autocompletado:");
    console.log("- destinatario_id:", form.destinatario_id);
    console.log("- remitentes disponibles:", remitentes.length);
    console.log("- ciudades disponibles:", ciudades.length);
    console.log("- países disponibles:", paises.length);
    console.log("- lugar_entrega_manual:", lugarEntregaManual);

    if (
      form.destinatario_id &&
      remitentes.length > 0 &&
      ciudades.length > 0 &&
      paises.length > 0 &&
      !lugarEntregaManual
    ) {
      console.log("✅ Condiciones cumplidas, buscando destinatario...");

      // Buscar destinatario
      const destinatario = remitentes.find(
        (r) => r.id === form.destinatario_id
      );
      console.log("🔍 Destinatario encontrado:", destinatario);

      if (destinatario) {
        if (destinatario.ciudad_id) {
          console.log("🔍 Buscando ciudad con ID:", destinatario.ciudad_id);

          // Buscar ciudad
          const ciudad = ciudades.find((c) => c.id === destinatario.ciudad_id);
          console.log("🏙️ Ciudad encontrada:", ciudad);

          if (ciudad) {
            console.log("🔍 Buscando país con ID:", ciudad.pais_id);

            // Buscar país
            const pais = paises.find((p) => p.id === ciudad.pais_id);
            console.log("🌍 País encontrado:", pais);

            if (pais) {
              // Generar lugar autocompletado
              const lugarAuto = `${ciudad.nombre.toUpperCase()} - ${pais.nombre.toUpperCase()}`;
              console.log("📍 Lugar generado:", lugarAuto);

              // Actualizar formulario siempre cuando cambie el destinatario
              setForm((prevForm) => {
                console.log("🎉 ✅ AUTOCOMPLETANDO CAMPO 8 CON:", lugarAuto);
                return { ...prevForm, lugar_entrega: lugarAuto };
              });
            } else {
              console.log(
                "❌ País no encontrado para pais_id:",
                ciudad.pais_id
              );
              console.log(
                "Países disponibles:",
                paises.map((p) => ({ id: p.id, nombre: p.nombre }))
              );
            }
          } else {
            console.log(
              "❌ Ciudad no encontrada para ciudad_id:",
              destinatario.ciudad_id
            );
            console.log(
              "Ciudades disponibles:",
              ciudades.map((c) => ({ id: c.id, nombre: c.nombre }))
            );
          }
        } else {
          console.log("❌ Destinatario sin ciudad_id:", destinatario);
        }
      } else {
        console.log(
          "❌ Destinatario no encontrado con ID:",
          form.destinatario_id
        );
        console.log(
          "Remitentes disponibles:",
          remitentes.map((r) => ({ id: r.id, nombre: r.nombre }))
        );
      }
    } else {
      console.log("⏳ Esperando datos completos o lugar_entrega modificado manualmente...");
    }
  }, [form.destinatario_id, remitentes, ciudades, paises, lugarEntregaManual]);

  // ===============================================
  // 📝 INSTRUCCIONES PARA PROBAR:
  // ===============================================

  /*
1. ✅ Reemplaza tus useEffects con el código de arriba
2. ✅ Abre la consola del navegador (F12)
3. ✅ Recarga la página
4. ✅ Busca estos mensajes:
   - "🎉 === TODOS LOS DATOS CARGADOS ==="
   - "🎯 ✅ PERFECTO: Autocompletado debería funcionar"
   - "✅ ASUNCIÓN encontrada"
   - "✅ Paraguay encontrado"

5. ✅ Selecciona un destinatario
6. ✅ Busca el mensaje:
   - "🎉 ✅ AUTOCOMPLETANDO CAMPO 8 CON: [ciudad] - [país]"

7. ✅ Verifica que el campo 8 se llene automáticamente

Si ves algún error o mensaje ❌, compártelo conmigo.
*/

  useEffect(() => {
    if (
      form.remitente_id &&
      remitentes.length &&
      ciudades.length &&
      paises.length
    ) {
      const remitente = remitentes.find((r) => r.id === form.remitente_id);
      if (remitente && remitente.ciudad_id) {
        const ciudad = ciudades.find((c) => c.id === remitente.ciudad_id);
        if (ciudad) {
          setCiudad7({
            value: ciudad.id,
            label: `${ciudad.nombre.toUpperCase()} - ${(
              paises.find((p) => p.id === ciudad.pais_id)?.nombre || ""
            ).toUpperCase()}`,
            ciudad: ciudad.nombre,
            pais: paises.find((p) => p.id === ciudad.pais_id)?.nombre || "",
            pais_id: ciudad.pais_id,
          });
        }
      }
    }
  }, [form.remitente_id, remitentes, ciudades, paises]);

  useEffect(() => {
    if (ciudad7 && fecha7) {
      setForm((f) => ({
        ...f,
        local_responsabilidad: `${ciudad7.ciudad.toUpperCase()} - ${ciudad7.pais.toUpperCase()}-${formatoFecha(
          fecha7
        )}`,
      }));
    }
  }, [ciudad7, fecha7]);

  const handleValorGastoInput = (e, campo) => {
    let v = e.target.value
      .replace(/[^\d.,]/g, "")
      .replace(/\.(?=.*\.)/g, "")
      .replace(/,/g, ",");
    setGastoActual((g) => ({ ...g, [campo]: v }));
  };

  const handleValorGastoBlur = (e, campo) => {
    let val = e.target.value.replace(/\./g, "").replace(",", ".");
    let num = parseFloat(val);
    setGastoActual((g) => ({
      ...g,
      [campo]: isNaN(num)
        ? ""
        : num.toLocaleString("es-ES", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
    }));
  };

  const handleMonedaGasto = (option) => {
    setMonedaGasto(option);
    setMonedaTouched(true);
  };

  // Validation function
  const validateForm = () => {
    const errors = {};
    const requiredFields = [
      { key: 'remitente_id', label: 'Remitente' },
      { key: 'destinatario_id', label: 'Destinatario' },
      { key: 'consignatario_id', label: 'Consignatario' },
      { key: 'notificar_a_id', label: 'Notificar a' },
      { key: 'transportadora_id', label: 'Transportadora' },
      { key: 'ciudad_emision_id', label: 'Ciudad de emisión' },
      { key: 'lugar_entrega', label: 'Lugar de entrega' },
      { key: 'detalles_mercaderia', label: 'Detalles de mercadería' },
      { key: 'peso_bruto', label: 'Peso bruto' },
      { key: 'peso_neto', label: 'Peso neto' },
      { key: 'incoterm', label: 'Incoterm' },
      { key: 'valor_incoterm', label: 'Valor incoterm' },
      { key: 'declaracion_mercaderia', label: 'Declaración de mercadería' },
      { key: 'factura_exportacion', label: 'Factura de exportación' },
      { key: 'observaciones', label: 'Observaciones' }
    ];

    requiredFields.forEach(field => {
      if (!form[field.key] || form[field.key] === '') {
        errors[field.key] = `${field.label} es obligatorio`;
      }
    });

    // Special validation for currency (monedaGasto)
    if (!monedaGasto || !monedaGasto.value) {
      errors.moneda_id = 'Moneda es obligatorio';
    }

    // Special validation for ciudad7 (field 7)
    if (!ciudad7) {
      errors.ciudad7 = 'Ciudad y fecha de responsabilidad es obligatorio';
    }

    // Special validation for signature fields
    if (!form.firma_remitente_id) {
      errors.firma_remitente_id = 'Firma del remitente es obligatorio';
    }
    if (!form.firma_transportador_id) {
      errors.firma_transportador_id = 'Firma del transportador es obligatorio';
    }
    if (!form.firma_destinatario_id) {
      errors.firma_destinatario_id = 'Firma del destinatario es obligatorio';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper function to get field error
  const getFieldError = (fieldName) => {
    return formErrors[fieldName];
  };

  // Helper function to get field class with validation
  const getFieldClass = (fieldName, baseClass = "block w-full rounded border px-2 py-1") => {
    const hasError = formErrors[fieldName];
    return hasError ? `${baseClass} border-red-500` : baseClass;
  };

  const handleAddGasto = () => {
    if (!gastoActual.tramo) return;
    const normaliza = (v) =>
      typeof v === "string"
        ? parseFloat(v.replace(/\./g, "").replace(",", "."))
        : v;
    setForm((f) => ({
      ...f,
      gastos: [
        ...f.gastos,
        {
          ...gastoActual,
          valor_remitente: normaliza(gastoActual.valor_remitente),
          valor_destinatario: normaliza(gastoActual.valor_destinatario),
        },
      ],
    }));
    setGastoActual({ tramo: "", valor_remitente: "", valor_destinatario: "" });
  };

  const handleRemoveGasto = (idx) =>
    setForm((f) => ({ ...f, gastos: f.gastos.filter((_, i) => i !== idx) }));

  const totalRemitente = form.gastos.reduce(
    (acc, g) => acc + (parseFloat(g.valor_remitente) || 0),
    0
  );
  const totalDestinatario = form.gastos.reduce(
    (acc, g) => acc + (parseFloat(g.valor_destinatario) || 0),
    0
  );

  const monedaCodigo = monedaGasto
    ? monedas.find((m) => m.id === monedaGasto.value)?.codigo ||
      monedaGasto.label
    : "";

  useEffect(() => {
    if (form.gastos.length > 0) {
      const primerGasto = form.gastos[0];
      const primerValor =
        primerGasto.valor_remitente &&
        parseFloat(primerGasto.valor_remitente) > 0
          ? primerGasto.valor_remitente
          : primerGasto.valor_destinatario || "";
      setForm((f) => ({
        ...f,
        valor_flete_externo: primerValor,
      }));
    } else {
      setForm((f) => ({
        ...f,
        valor_flete_externo: "",
      }));
    }
  }, [form.gastos]);

  // Autocompletado de firmas
  useEffect(() => {
    if (form.remitente_id && !form.firma_remitente_id) {
      setForm((f) => ({ ...f, firma_remitente_id: form.remitente_id }));
    }
  }, [form.remitente_id, form.firma_remitente_id]);

  useEffect(() => {
    if (form.transportadora_id && !form.firma_transportador_id) {
      setForm((f) => ({ ...f, firma_transportador_id: form.transportadora_id }));
    }
  }, [form.transportadora_id, form.firma_transportador_id]);

  useEffect(() => {
    if (form.destinatario_id && !form.firma_destinatario_id) {
      setForm((f) => ({ ...f, firma_destinatario_id: form.destinatario_id }));
    }
  }, [form.destinatario_id, form.firma_destinatario_id]);

  const handleValorIncotermChange = (e) => {
    let val = e.target.value.replace(/[^\d,]/g, "");
    val = val.replace(/(,)(?=.*,)/g, "");
    setForm((f) => ({ ...f, valor_incoterm: val }));
  };
  const handleValorIncotermBlur = (e) => {
    let raw = e.target.value.replace(/\./g, "").replace(",", ".");
    let num = parseFloat(raw);
    setForm((f) => ({
      ...f,
      valor_incoterm: isNaN(num) ? "" : num.toFixed(2).replace(".", ","),
    }));
  };

  const handlePesoInput = (e) => {
    let v = e.target.value.replace(/[^\d,]/g, "");
    v = v.replace(/(,)(?=.*,)/g, "");
    setForm((f) => ({ ...f, [e.target.name]: v }));
  };
  const handlePesoBlur = (e) => {
    let raw = e.target.value.replace(/\./g, "").replace(",", ".");
    let num = parseFloat(raw);
    setForm((f) => ({
      ...f,
      [e.target.name]: isNaN(num) ? "" : num.toFixed(3).replace(".", ","),
    }));
  };

  const handleVolumenInput = (e) => {
    let v = e.target.value.replace(/[^\d,]/g, "");
    v = v.replace(/(,)(?=.*,)/g, "");
    setForm((f) => ({ ...f, volumen: v }));
  };
  const handleVolumenBlur = (e) => {
    let raw = e.target.value.replace(/\./g, "").replace(",", ".");
    let num = parseFloat(raw);
    setForm((f) => ({
      ...f,
      volumen: isNaN(num) ? "" : num.toFixed(5).replace(".", ","),
    }));
  };

  const handleDeclaracionInput = (e) => {
    let v = e.target.value.replace(/[^\d,]/g, "");
    v = v.replace(/(,)(?=.*,)/g, "");
    setForm((f) => ({ ...f, declaracion_mercaderia: v }));
  };
  const handleDeclaracionBlur = (e) => {
    let raw = e.target.value.replace(/\./g, "").replace(",", ".");
    let num = parseFloat(raw);
    setForm((f) => ({
      ...f,
      declaracion_mercaderia: isNaN(num)
        ? ""
        : num.toFixed(2).replace(".", ","),
    }));
  };

  const handleIncoterm = (option) => {
    setForm((f) => ({ ...f, incoterm: option ? option.value : "" }));
  };

  useEffect(() => {
    if (
      selectedTransportadora &&
      selectedTransportadora.id &&
      selectedTransportadora.codigo
    ) {
      api
        .get(
          `/crts/next_number?transportadora_id=${selectedTransportadora.id}&codigo=${selectedTransportadora.codigo}`
        )
        .then((res) =>
          setForm((f) => ({ ...f, numero_crt: res.data.next_number }))
        )
        .catch(() => setForm((f) => ({ ...f, numero_crt: "" })));
    } else {
      setForm((f) => ({ ...f, numero_crt: "" }));
    }
  }, [selectedTransportadora]);

  const handleRemitente = (option) =>
    setForm((f) => ({ ...f, remitente_id: option ? option.value : null }));
  const handleDestinatario = (option) => {
    setLugarEntregaManual(false); // Reset flag when destinatario changes
    setForm((f) => ({
      ...f,
      destinatario_id: option ? option.value : null,
      consignatario_id:
        !f.consignatario_id && option ? option.value : f.consignatario_id,
      notificar_a_id:
        !f.notificar_a_id && option ? option.value : f.notificar_a_id,
    }));
  };
  const handleConsignatario = (option) =>
    setForm((f) => ({ ...f, consignatario_id: option ? option.value : null }));
  const handleNotificarA = (option) =>
    setForm((f) => ({ ...f, notificar_a_id: option ? option.value : null }));
  const handleInput = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleCiudadPais = (option) =>
    setForm((f) => ({
      ...f,
      ciudad_emision_id: option ? option.value : null,
      pais_emision_id: option ? option.pais_id : null,
    }));
  const handleSelect = (name, option) =>
    setForm((f) => ({ ...f, [name]: option ? option.value : null }));
  const handleCiudad7 = (option) => setCiudad7(option);
  const handleFecha7 = (e) => setFecha7(e.target.value);

  const handleFirmaRemitente = (option) =>
    setForm((f) => ({ ...f, firma_remitente_id: option ? option.value : null }));
  const handleFirmaTransportador = (option) =>
    setForm((f) => ({ ...f, firma_transportador_id: option ? option.value : null }));
  const handleFirmaDestinatario = (option) =>
    setForm((f) => ({ ...f, firma_destinatario_id: option ? option.value : null }));

  const handleLugarEntregaSelect = (option) => {
    setLugarEntregaManual(true);
    setForm((f) => ({
      ...f,
      lugar_entrega: option ? option.label : "",
    }));
  };

  // Función para manejar la generación de PDF desde el modal
  const handleGenerateMIC = async (micData) => {
    console.log('🎯 Iniciando generación de MIC...');
    console.log('📋 Datos MIC recibidos:', micData);
    console.log('📋 CRT emitido:', crtEmitido);

    if (!crtEmitido || !crtEmitido.id) {
      alert("No hay CRT emitido para generar MIC");
      return;
    }

    setLoadingMIC(true);
    setDiagnosticoMIC(null); // Reset diagnostics
    try {
      console.log('📡 Enviando solicitud a API...');
      const response = await api.post(`/mic/generate_pdf_from_crt/${crtEmitido.id}`, micData, {
        responseType: 'blob' // Importante: especificar que esperamos un blob (archivo binario)
      });
      console.log('✅ Respuesta de API:', response);

      // Extraer diagnóstico del encabezado
      const diagnosticoHeader = response.headers['x-pdf-diagnostico'];
      if (diagnosticoHeader) {
        try {
          const diagnosticoData = JSON.parse(diagnosticoHeader);
          console.log('📊 Diagnóstico recibido:', diagnosticoData);
          setDiagnosticoMIC(diagnosticoData);
        } catch (e) {
          console.error('❌ Error al parsear diagnóstico:', e);
        }
      }

      // Crear un enlace de descarga para el PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // No establecer download name para usar el nombre del servidor
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // No cerrar el modal para poder ver el diagnóstico
      // setModalMICOpen(false); 
      alert("MIC generado exitosamente. Revisa el diagnóstico.");
    } catch (error) {
      console.error('❌ Error al generar MIC:', error);
      console.error('❌ Detalles del error:', error.response?.data);
      alert("Error al generar MIC: " + (error.response?.data?.error || error.message));
    } finally {
      setLoadingMIC(false);
    }
  };

  const monedaObligatoria = !monedaGasto || !monedaGasto.value;
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMonedaTouched(true);

    // Validate form
    if (!validateForm()) {
      alert("Por favor complete todos los campos obligatorios marcados con *");
      return;
    }

    if (monedaObligatoria) return;

    setLoadingEmitir(true);

    try {
      const response = await api.post("/crts/", {
        ...form,
        gastos: form.gastos.map((g) => ({
          ...g,
          moneda: monedaCodigo,
        })),
        moneda_id: monedaGasto ? monedaGasto.value : null,
        firma_remitente_id: form.firma_remitente_id,
        firma_transportador_id: form.firma_transportador_id,
        firma_destinatario_id: form.firma_destinatario_id,
      });

      // Función para convertir formato español a número
      const parseSpanishNumber = (str) => {
        if (!str || str === '') return 0;
        // Remover puntos (separadores de miles) y convertir coma a punto decimal
        const cleanStr = str.toString().replace(/\./g, '').replace(',', '.');
        return parseFloat(cleanStr) || 0;
      };

      // Calcular total de flete desde los gastos
      const totalFlete = form.gastos.reduce((total, gasto) => {
        const valorRemitente = parseSpanishNumber(gasto.valor_remitente);
        const valorDestinatario = parseSpanishNumber(gasto.valor_destinatario);
        return total + valorRemitente + valorDestinatario;
      }, 0);

      // Calcular seguro (ejemplo: 1% del valor declarado)
      const valorDeclarado = parseSpanishNumber(form.declaracion_mercaderia);
      const seguro = valorDeclarado > 0 ? (valorDeclarado * 0.01) : 0; // 1% del valor declarado

      console.log('🔢 Cálculos para MIC:', {
        totalFlete,
        valorDeclarado,
        seguro,
        gastosCount: form.gastos.length,
        gastos: form.gastos
      });

      // Guardar la información del CRT emitido
      const crtData = {
        id: response.data.id,
        numero_crt: form.numero_crt,
        fecha_emision: form.fecha_emision,
        estado: form.estado,
        remitente_id: form.remitente_id,
        destinatario_id: form.destinatario_id,
        transportadora_id: form.transportadora_id,
        detalles_mercaderia: form.detalles_mercaderia,
        lugar_entrega: form.lugar_entrega,
        declaracion_mercaderia: form.declaracion_mercaderia,
        peso_bruto: form.peso_bruto,
        peso_neto: form.peso_neto,
        volumen: form.volumen,
        factura_exportacion: form.factura_exportacion,
        nro_despacho: form.nro_despacho,
        moneda_id: form.moneda_id,
        valor_incoterm: form.valor_incoterm,
        valor_mercaderia: form.valor_mercaderia,
        transporte_sucesivos: form.transporte_sucesivos,
        observaciones: form.observaciones,
        ciudad_emision_id: form.ciudad_emision_id,
        pais_emision_id: form.pais_emision_id,
        gastos: form.gastos, // Incluir gastos para cálculos
        // Información adicional para el modal MIC
        transportadora: selectedTransportadora,
        moneda: monedas.find(m => m.id === form.moneda_id)?.codigo,
        total_flete: totalFlete,
        seguro: seguro,
        // Agregar otros campos relevantes para el MIC
      };
      setCrtEmitido(crtData);

      console.log('✅ CRT emitido con datos para MIC:', crtData);

      // Después de emitir el CRT, generar y descargar el PDF automáticamente
      try {
        console.log('📄 Generando PDF del CRT emitido...');
        const pdfResponse = await fetch(`http://localhost:5000/api/crts/${crtData.id}/pdf`, {
          method: "POST",
        });

        if (!pdfResponse.ok) {
          throw new Error(`HTTP ${pdfResponse.status}`);
        }

        const blob = await pdfResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // No establecer download name para usar el nombre del servidor
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log('✅ PDF generado y descargado');

      } catch (pdfError) {
        console.error('❌ Error generando PDF:', pdfError);
        alert("CRT emitido correctamente, pero hubo un error generando el PDF: " + pdfError.message);
      }

      alert("CRT emitido correctamente - PDF generado y descargado");
      setForm((f) => ({ ...f, gastos: [] }));
      setMonedaTouched(false);
      setFormErrors({});
    } catch (e) {
      alert("Error al emitir CRT: " + (e.response?.data?.error || e.message));
    } finally {
      setLoadingEmitir(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-4 text-center text-indigo-700">
          SALIDA DE CARGAMENTO
        </h2>
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg p-6 border"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  1. Nome e endereço do remetente *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Nombre y domicilio del remitente
                </span>
                <Select
                  options={opt(remitentes)}
                  value={
                    opt(remitentes).find(
                      (x) => x.value === form.remitente_id
                    ) || null
                  }
                  onChange={handleRemitente}
                  placeholder="Seleccione una opción"
                  isClearable
                  className={getFieldError('remitente_id') ? 'border-red-500' : ''}
                />
                {getFieldError('remitente_id') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('remitente_id')}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  4. Nome e endereço do destinatário *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Nombre y domicilio del destinatario
                </span>
                <Select
                  options={opt(remitentes)}
                  value={
                    opt(remitentes).find(
                      (x) => x.value === form.destinatario_id
                    ) || null
                  }
                  onChange={handleDestinatario}
                  placeholder="Seleccione una opción"
                  isClearable
                  className={getFieldError('destinatario_id') ? 'border-red-500' : ''}
                />
                {getFieldError('destinatario_id') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('destinatario_id')}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  6. Nome e endereço do consignatário *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Nombre y domicilio del consignatario
                </span>
                <Select
                  options={opt(remitentes)}
                  value={
                    opt(remitentes).find(
                      (x) => x.value === form.consignatario_id
                    ) || null
                  }
                  onChange={handleConsignatario}
                  placeholder="Seleccione una opción"
                  isClearable
                  className={getFieldError('consignatario_id') ? 'border-red-500' : ''}
                />
                {getFieldError('consignatario_id') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('consignatario_id')}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  9. Notificar a: *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Notificar a
                </span>
                <Select
                  options={opt(remitentes)}
                  value={
                    opt(remitentes).find(
                      (x) => x.value === form.notificar_a_id
                    ) || null
                  }
                  onChange={handleNotificarA}
                  placeholder="Seleccione una opción"
                  isClearable
                  className={getFieldError('notificar_a_id') ? 'border-red-500' : ''}
                />
                {getFieldError('notificar_a_id') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('notificar_a_id')}
                  </span>
                )}
              </label>
              <label className="block h-full">
                <span className="font-bold text-xs text-blue-900">
                  11. Quantidade e categoria de volumes, marcas e números, tipos
                  de mercadorias, contêineres e acessórios *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Cantidad y clase de bultos, marcas y números, tipo de
                  mercancías, contenedores y accesorios
                </span>
                <textarea
                  name="detalles_mercaderia"
                  value={form.detalles_mercaderia}
                  onChange={handleInput}
                  className={getFieldClass("detalles_mercaderia", "block w-full rounded border px-2 py-1")}
                  rows={7}
                  style={{ minHeight: "110px" }}
                />
                {getFieldError('detalles_mercaderia') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('detalles_mercaderia')}
                  </span>
                )}
              </label>
            </div>
            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  2. Número
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">Número</span>
                <input
                  type="text"
                  name="numero_crt"
                  value={form.numero_crt}
                  disabled
                  className="block w-full rounded border px-2 py-1 bg-gray-200 text-gray-600 cursor-not-allowed"
                />
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  3. Nome e endereço do transportador *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Nombre y domicilio del porteador
                </span>
                <Select
                  options={opt(transportadoras)}
                  value={
                    opt(transportadoras).find(
                      (x) => x.value === form.transportadora_id
                    ) || null
                  }
                  onChange={(opt) => {
                    handleSelect("transportadora_id", opt);
                    setSelectedTransportadora(opt);
                  }}
                  placeholder="Seleccione una opción"
                  isClearable
                  isSearchable
                  className={getFieldError('transportadora_id') ? 'border-red-500' : ''}
                />
                {getFieldError('transportadora_id') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('transportadora_id')}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  5. Local e país de emissão *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Lugar y país de emisión
                </span>
                <Select
                  options={optCiudadPais(ciudades, paises)}
                  value={
                    optCiudadPais(ciudades, paises).find(
                      (x) => x.value === form.ciudad_emision_id
                    ) || null
                  }
                  onChange={handleCiudadPais}
                  placeholder="Seleccione una opción"
                  isClearable
                  isSearchable
                  className={getFieldError('ciudad_emision_id') ? 'border-red-500' : ''}
                />
                {getFieldError('ciudad_emision_id') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('ciudad_emision_id')}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  7. Local, país e data que o transportador se responsabiliza
                  pela mercadoria *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Lugar, país y fecha en que el portador se hace cargo de las
                  mercancias
                </span>
                <div className="flex flex-row gap-2 items-center">
                  <Select
                    options={optCiudadPais(ciudades, paises)}
                    value={ciudad7}
                    onChange={handleCiudad7}
                    placeholder="Ciudad y País"
                    isClearable
                    isSearchable
                    className={`flex-1 ${getFieldError('ciudad7') ? 'border-red-500' : ''}`}
                  />
                  <input
                    type="date"
                    value={fecha7}
                    onChange={handleFecha7}
                    className="rounded border px-2 py-1 w-[140px]"
                  />
                </div>
                {getFieldError('ciudad7') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('ciudad7')}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  8. Localidade, país e prazo de entrega *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Lugar, país y plazo de entrega
                </span>
                <Select
                  options={optCiudadPais(ciudades, paises)}
                  value={
                    optCiudadPais(ciudades, paises).find(
                      (x) => x.label === form.lugar_entrega
                    ) || null
                  }
                  onChange={handleLugarEntregaSelect}
                  placeholder="Seleccione una opción"
                  isClearable
                  isSearchable
                  className={getFieldError('lugar_entrega') ? 'border-red-500' : ''}
                />
                {getFieldError('lugar_entrega') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('lugar_entrega')}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  10. Transporte sucessivos
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Porteadores sucesivos
                </span>
                <input
                  type="text"
                  name="transporte_sucesivos"
                  value={form.transporte_sucesivos}
                  onChange={handleInput}
                  className="block w-full rounded border px-2 py-1"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
            <div>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  12 Peso Bruto em Kg. / Peso Bruto en Kg. *
                </span>
                <div className="flex gap-2 mt-1">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-blue-900 mb-1">
                      PB:
                    </span>
                    <input
                      type="text"
                      name="peso_bruto"
                      value={form.peso_bruto}
                      onChange={handlePesoInput}
                      onBlur={handlePesoBlur}
                      className={getFieldClass("peso_bruto", "block rounded border px-2 py-1 w-[120px] text-right")}
                      inputMode="decimal"
                      placeholder="0,000"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-blue-900 mb-1">
                      PN:
                    </span>
                    <input
                      type="text"
                      name="peso_neto"
                      value={form.peso_neto}
                      onChange={handlePesoInput}
                      onBlur={handlePesoBlur}
                      className={getFieldClass("peso_neto", "block rounded border px-2 py-1 w-[120px] text-right")}
                      inputMode="decimal"
                      placeholder="0,000"
                    />
                  </div>
                </div>
                {getFieldError('peso_bruto') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('peso_bruto')}
                  </span>
                )}
                {getFieldError('peso_neto') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('peso_neto')}
                  </span>
                )}
              </label>
            </div>
            <div>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  13. Volume em m³
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Volumen en m.cu
                </span>
                <input
                  type="text"
                  name="volumen"
                  value={form.volumen}
                  onChange={handleVolumenInput}
                  onBlur={handleVolumenBlur}
                  className="block w-full rounded border px-2 py-1 text-right"
                  placeholder="0,00000"
                  inputMode="decimal"
                />
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block font-bold text-xs text-blue-900 mb-1">
                14 Valor / Valor
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-blue-800">
                    Tipo *
                  </label>
                  <Select
                    options={INCOTERMS}
                    value={
                      INCOTERMS.find((opt) => opt.value === form.incoterm) ||
                      null
                    }
                    onChange={handleIncoterm}
                    placeholder="Tipo"
                    isClearable
                    className={getFieldError('incoterm') ? 'border-red-500' : ''}
                  />
                  {getFieldError('incoterm') && (
                    <span className="text-xs text-red-500 font-bold block mt-1">
                      {getFieldError('incoterm')}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-blue-800">
                    Valor: *
                  </label>
                  <input
                    type="text"
                    name="valor_incoterm"
                    value={form.valor_incoterm}
                    onChange={handleValorIncotermChange}
                    onBlur={handleValorIncotermBlur}
                    placeholder="0,00"
                    className={getFieldClass("valor_incoterm", "block w-full rounded border px-2 py-1 text-right")}
                    inputMode="decimal"
                  />
                  {getFieldError('valor_incoterm') && (
                    <span className="text-xs text-red-500 font-bold block mt-1">
                      {getFieldError('valor_incoterm')}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-blue-800">
                    Seleccione la moneda: *
                  </label>
                  <Select
                    options={opt(monedas)}
                    value={monedaGasto}
                    onChange={handleMonedaGasto}
                    placeholder="Moneda"
                    isClearable
                    className={
                      "w-full " +
                      (getFieldError('moneda_id') || (monedaTouched && monedaObligatoria)
                        ? "border-red-500 border-2"
                        : "")
                    }
                    getOptionLabel={(opt) =>
                      opt.codigo ? `${opt.codigo} - ${opt.nombre}` : opt.label
                    }
                    getOptionValue={(opt) => opt.value}
                  />
                  {(getFieldError('moneda_id') || (monedaTouched && monedaObligatoria)) && (
                    <span className="text-xs text-red-500 font-bold block mt-1">
                      {getFieldError('moneda_id') || 'Moneda obligatoria'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-2">
            <div className="flex-1 min-w-[420px] bg-slate-50 p-2 rounded border">
              <span className="font-bold text-xs text-blue-900">
                15. Custos a Pagar / Gastos a Pagar
              </span>
              <div className="flex gap-2 mt-1 items-center">
                <input
                  placeholder="Descripción"
                  name="tramo"
                  value={gastoActual.tramo}
                  onChange={(e) =>
                    setGastoActual({ ...gastoActual, tramo: e.target.value })
                  }
                  className="rounded border px-2 py-1 w-44"
                />
                <input
                  type="text"
                  placeholder="Valor remitente"
                  name="valor_remitente"
                  value={gastoActual.valor_remitente}
                  onChange={(e) => handleValorGastoInput(e, "valor_remitente")}
                  onBlur={(e) => handleValorGastoBlur(e, "valor_remitente")}
                  className="rounded border px-2 py-1 w-32 text-right"
                  inputMode="decimal"
                />
                <input
                  type="text"
                  placeholder="Valor destinatario"
                  name="valor_destinatario"
                  value={gastoActual.valor_destinatario}
                  onChange={(e) =>
                    handleValorGastoInput(e, "valor_destinatario")
                  }
                  onBlur={(e) => handleValorGastoBlur(e, "valor_destinatario")}
                  className="rounded border px-2 py-1 w-32 text-right"
                  inputMode="decimal"
                />
                <Select
                  options={opt(monedas)}
                  value={monedaGasto}
                  onChange={handleMonedaGasto}
                  placeholder="Moneda"
                  isClearable
                  className={
                    "w-32 " +
                    (monedaTouched && monedaObligatoria
                      ? "border-red-500 border-2"
                      : "")
                  }
                  getOptionLabel={(opt) =>
                    opt.codigo ? `${opt.codigo} - ${opt.nombre}` : opt.label
                  }
                  getOptionValue={(opt) => opt.value}
                />
                <button
                  type="button"
                  onClick={handleAddGasto}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded transition"
                  title="Agregar gasto"
                >
                  +
                </button>
              </div>
              <table className="w-full border mt-2 rounded text-xs">
                <thead>
                  <tr className="bg-sky-100 text-sky-800">
                    <th className="p-2 font-semibold">Descripción</th>
                    <th className="p-2 font-semibold">Valor Remitente</th>
                    <th className="p-2 font-semibold">Valor Destinatario</th>
                    <th className="p-2 font-semibold">Moneda</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.gastos.map((g, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{g.tramo}</td>
                      <td className="p-2 text-right">
                        {parseFloat(g.valor_remitente || 0).toLocaleString(
                          "es-ES",
                          { minimumFractionDigits: 2 }
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {parseFloat(g.valor_destinatario || 0).toLocaleString(
                          "es-ES",
                          { minimumFractionDigits: 2 }
                        )}
                      </td>
                      <td className="p-2">{monedaCodigo}</td>
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveGasto(idx)}
                          className="bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded"
                          title="Quitar gasto"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-2 items-center mt-2 font-bold">
                <span className="text-xs">Total {monedaCodigo}:</span>
                <input
                  value={totalRemitente.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                  })}
                  className="rounded border px-2 py-1 w-28 text-right bg-gray-100"
                  disabled
                />
                <span className="text-xs">{monedaCodigo}</span>
                <input
                  value={totalDestinatario.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                  })}
                  className="rounded border px-2 py-1 w-28 text-right bg-gray-100"
                  disabled
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-80">
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  16. Declaração do valor das mercadorias *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Declaración del valor de las mercaderías
                </span>
                <input
                  type="text"
                  name="declaracion_mercaderia"
                  value={form.declaracion_mercaderia}
                  onChange={handleDeclaracionInput}
                  onBlur={handleDeclaracionBlur}
                  className={getFieldClass("declaracion_mercaderia", "block w-full rounded border px-2 py-1 text-right")}
                  placeholder="0,00"
                  inputMode="decimal"
                />
                {getFieldError('declaracion_mercaderia') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('declaracion_mercaderia')}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  17. Documentos Anexos *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Documentos Anexos
                </span>
                <input
                  type="text"
                  name="factura_exportacion"
                  value={form.factura_exportacion}
                  onChange={handleInput}
                  placeholder="Factura de Exportación Nº"
                  className={getFieldClass("factura_exportacion", "block w-full rounded border px-2 py-1 mb-1")}
                />
                {getFieldError('factura_exportacion') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('factura_exportacion')}
                  </span>
                )}
                <input
                  type="text"
                  name="nro_despacho"
                  value={form.nro_despacho}
                  onChange={handleInput}
                  placeholder="Despacho Nº"
                  className="block w-full rounded border px-2 py-1"
                />
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  18. Instruções sobre formalidades de alfândega
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Instrucciones sobre formalidades de aduana
                </span>
                <textarea
                  name="formalidades_aduana"
                  value={form.formalidades_aduana}
                  onChange={handleInput}
                  className="block w-full rounded border px-2 py-1"
                  rows={2}
                />
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  19. Valor do frete Externo
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Monto del Flete Externo
                </span>
                <input
                  type="number"
                  step="0.01"
                  name="valor_flete_externo"
                  value={form.valor_flete_externo}
                  onChange={handleInput}
                  className="block w-full rounded border px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="0.00"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
            <div>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  20. Valor do Reembolso Contra Entrega
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Monto de Reembolso Contra Entrega
                </span>
                <input
                  type="number"
                  step="0.01"
                  name="valor_reembolso"
                  value={form.valor_reembolso}
                  onChange={handleInput}
                  className="block w-full rounded border px-2 py-1"
                />
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  21. Nombre y firma del remitente *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Nombre y firma del remitente
                </span>
                <Select
                  options={opt(remitentes)}
                  value={
                    opt(remitentes).find(
                      (x) => x.value === form.firma_remitente_id
                    ) || null
                  }
                  onChange={handleFirmaRemitente}
                  placeholder="Seleccione firma del remitente"
                  isClearable
                  className={getFieldError('firma_remitente_id') ? 'border-red-500' : ''}
                />
                {getFieldError('firma_remitente_id') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('firma_remitente_id')}
                  </span>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Fecha: {fecha7 ? formatoFecha(fecha7) : "--/--/----"}
                </div>
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  23. Nombre y firma del transportador *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Nombre y firma del transportador
                </span>
                <Select
                  options={opt(transportadoras)}
                  value={
                    opt(transportadoras).find(
                      (x) => x.value === form.firma_transportador_id
                    ) || null
                  }
                  onChange={handleFirmaTransportador}
                  placeholder="Seleccione firma del transportador"
                  isClearable
                  className={getFieldError('firma_transportador_id') ? 'border-red-500' : ''}
                />
                {getFieldError('firma_transportador_id') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('firma_transportador_id')}
                  </span>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Fecha: {fecha7 ? formatoFecha(fecha7) : "--/--/----"}
                </div>
              </label>
            </div>
            <div>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  22. Declarações e observações *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Declaraciones y observaciones
                </span>
                <textarea
                  name="observaciones"
                  value={form.observaciones}
                  onChange={handleInput}
                  className={getFieldClass("observaciones", "block w-full rounded border px-2 py-1 mb-1")}
                  rows={2}
                />
                {getFieldError('observaciones') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('observaciones')}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="font-bold text-xs text-blue-900">
                  24. Nombre y firma del destinatario *
                </span>
                <br />
                <span className="font-bold text-xs text-blue-700">
                  Nombre y firma del destinatario
                </span>
                <Select
                  options={opt(remitentes)}
                  value={
                    opt(remitentes).find(
                      (x) => x.value === form.firma_destinatario_id
                    ) || null
                  }
                  onChange={handleFirmaDestinatario}
                  placeholder="Seleccione firma del destinatario"
                  isClearable
                  className={getFieldError('firma_destinatario_id') ? 'border-red-500' : ''}
                />
                {getFieldError('firma_destinatario_id') && (
                  <span className="text-xs text-red-500 font-bold block mt-1">
                    {getFieldError('firma_destinatario_id')}
                  </span>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Fecha: {fecha7 ? formatoFecha(fecha7) : "--/--/----"}
                </div>
              </label>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 justify-end mt-8">
            {/* Indicador visual de CRT emitido */}
            {crtEmitido && (
              <div className="flex items-center gap-2 text-green-700 font-semibold">
                <span className="text-2xl">✅</span>
                <span>CRT {crtEmitido.numero_crt} emitido - Listo para MIC</span>
              </div>
            )}

            <button
              type="button"
              onClick={mostrarVistaPrevia}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition flex items-center gap-2"
            >
              👁️ Vista Previa
            </button>
            <button
              type="submit"
              disabled={loadingEmitir}
              className={`font-bold py-3 px-10 rounded-xl shadow-lg transition flex items-center gap-2 ${
                loadingEmitir
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-700 hover:bg-indigo-800 text-white'
              }`}
            >
              {loadingEmitir ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generando PDF...</span>
                </>
              ) : (
                <span>Emitir CRT + PDF</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!crtEmitido || !crtEmitido.id) {
                  alert("Primero debes emitir el CRT antes de generar el MIC.");
                  return;
                }
                setModalMICOpen(true);
              }}
              className="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-10 rounded-xl shadow-lg transition"
            >
              Emitir MIC
            </button>
          </div>
        </form>
      </div>

      {/* Modal MIC */}
      <ModalMICCompleto
        isOpen={modalMICOpen}
        onClose={() => {
          setModalMICOpen(false);
          setDiagnosticoMIC(null); // Limpiar diagnóstico al cerrar
        }}
        crt={crtEmitido}
        onGenerate={handleGenerateMIC}
        loading={loadingMIC}
        diagnostico={diagnosticoMIC}
      />

      {/* Modal de Vista Previa CRT */}
      <CRTPreview
        crtData={previewData}
        onClose={() => setPreviewOpen(false)}
        onDownloadPDF={descargarPDFFromPreview}
        isOpen={previewOpen}
      />
    </div>
  );
}

export default CRT;