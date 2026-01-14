import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import Select from 'react-select'; // Importando react-select

const ModalMICCompleto = ({ isOpen, onClose, crt, onGenerate, loading = false, diagnostico, micToEdit = null, onUpdate = null }) => {
  const isEditMode = !!micToEdit;
  const [formData, setFormData] = useState({
    campo_1_porteador: '', campo_2_numero: '', campo_3_transporte: '', campo_7_pto_seguro: '',
    campo_8_destino: '', campo_9_datos_transporte: '', campo_10_numero: '', campo_11_placa: '',
    campo_12_modelo_chasis: '', campo_14_anio: '', campo_15_placa_semi: '',
    campo_24_aduana: 'BRASIL - MULTILOG - FOZ DO IGUAZU 508 - 030', campo_26_pais: '520-PARAGUAY',
    campo_27_valor_campo16: '', campo_28_total: '', campo_29_seguro: '', campo_30_tipo_bultos: '',
    campo_31_cantidad: '', campo_32_peso_bruto: '', campo_37_valor_manual: '',
    campo_36_factura_despacho: '', campo_40_tramo: '', campo_chofer: '', campo_4_estado: 'PROVISORIO',
    campo_5_hoja: '1 / 1', campo_6_fecha: new Date().toISOString().split('T')[0],
    campo_13_siempre_45: '45 TON', campo_25_moneda: '',
    campo_16_asteriscos_1: '******', campo_17_asteriscos_2: '******', campo_18_asteriscos_3: '******',
    campo_19_asteriscos_4: '******', campo_20_asteriscos_5: '******', campo_21_asteriscos_6: '******',
    campo_22_asteriscos_7: '******',
  });

  const [transportadoras, setTransportadoras] = useState([]);

  const [aduanas, setAduanas] = useState([]); // Nuevo estado para aduanas

  const getTransportadoraNombre = useCallback((id) => {
    if (!id) return '';
    const transportadora = transportadoras.find(t => t.id.toString() === id.toString());
    return transportadora?.nombre || '';
  }, [transportadoras]);

  // Cargar Transportadoras y Aduanas
  useEffect(() => {
    if (isOpen) {
      // Cargar Transportadoras
      fetch('http://localhost:5000/api/transportadoras/')
        .then(res => res.json())
        .then(data => setTransportadoras(data.items || []))
        .catch(err => console.error('Error cargando transportadoras:', err));

      // Cargar Aduanas
      fetch('http://localhost:5000/api/aduanas/')
        .then(res => res.json())
        .then(data => setAduanas(data || []))
        .catch(err => console.error('Error cargando aduanas:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isEditMode && micToEdit) {
      // Modo edición: cargar datos del MIC existente
      fetch(`http://localhost:5000/api/mic-guardados/${micToEdit.id}`)
        .then(res => res.json())
        .then(mic => {
          setFormData({
            campo_1_transporte: mic.campo_1_transporte || '',
            campo_2_numero: mic.campo_2_numero || '',
            campo_3_transporte: mic.campo_3_transporte || '',
            campo_4_estado: mic.campo_4_estado || 'PROVISORIO',
            campo_5_hoja: mic.campo_5_hoja || '1 / 1',
            campo_6_fecha: mic.campo_6_fecha ? mic.campo_6_fecha.split('/').reverse().join('-') : new Date().toISOString().split('T')[0],
            campo_7_pto_seguro: mic.campo_7_pto_seguro || '',
            campo_8_destino: mic.campo_8_destino || '',
            campo_9_datos_transporte: mic.campo_9_datos_transporte || '',
            campo_10_numero: mic.campo_10_numero || '',
            campo_11_placa: mic.campo_11_placa || '',
            campo_12_modelo_chasis: mic.campo_12_modelo_chasis || '',
            campo_13_siempre_45: mic.campo_13_siempre_45 || '45 TON',
            campo_14_anio: mic.campo_14_anio || '',
            campo_15_placa_semi: mic.campo_15_placa_semi || '',
            campo_23_numero_campo2_crt: mic.campo_23_numero_campo2_crt || '',
            campo_24_aduana: mic.campo_24_aduana || '',
            campo_25_moneda: mic.campo_25_moneda || '',
            campo_26_pais: mic.campo_26_pais || '',
            campo_27_valor_campo16: mic.campo_27_valor_campo16 || '',
            campo_28_total: mic.campo_28_total || '',
            campo_29_seguro: mic.campo_29_seguro || '',
            campo_30_tipo_bultos: mic.campo_30_tipo_bultos || '',
            campo_31_cantidad: mic.campo_31_cantidad || '',
            campo_32_peso_bruto: mic.campo_32_peso_bruto || '',
            campo_33_datos_campo1_crt: mic.campo_33_datos_campo1_crt || '',
            campo_34_datos_campo4_crt: mic.campo_34_datos_campo4_crt || '',
            campo_35_datos_campo6_crt: mic.campo_35_datos_campo6_crt || '',
            campo_36_factura_despacho: mic.campo_36_factura_despacho || '',
            campo_37_valor_manual: mic.campo_37_valor_manual || '',
            campo_38_datos_campo11_crt: mic.campo_38_datos_campo11_crt || '',
            campo_40_tramo: mic.campo_40_tramo || '',
            chofer: mic.chofer || '',
            campo_16_asteriscos_1: mic.campo_16_asteriscos_1 || '******',
            campo_17_asteriscos_2: mic.campo_17_asteriscos_2 || '******',
            campo_18_asteriscos_3: mic.campo_18_asteriscos_3 || '******',
            campo_19_asteriscos_4: mic.campo_19_asteriscos_4 || '******',
            campo_20_asteriscos_5: mic.campo_20_asteriscos_5 || '******',
            campo_21_asteriscos_6: mic.campo_21_asteriscos_6 || '******',
            campo_22_asteriscos_7: mic.campo_22_asteriscos_7 || '******',
          });
        })
        .catch(err => console.error('Error cargando MIC para edición:', err));
    } else if (isOpen && crt && !isEditMode) {
      // Modo creación: cargar datos del CRT
      const endpoint = `http://localhost:5000/api/mic/cargar-datos-crt/${crt.id || crt.numero_crt}`;
      fetch(endpoint)
        .then(res => res.json())
        .then(datos => {
          setFormData(prev => ({
            ...prev, ...datos,
            campo_37_valor_manual: '',
            campo_9_datos_transporte: datos.campo_9_datos_transporte || getTransportadoraNombre(datos.campo_1_transporte?.split('\n')[0] || ''),
          }));
        })
        .catch(err => {
          console.error('Error cargando datos del CRT:', err);
          setFormData(prev => ({
            ...prev,
            campo_8_destino: crt.lugar_entrega || '',
            campo_27_valor_campo16: crt.declaracion_mercaderia || '',
            campo_32_peso_bruto: crt.peso_bruto || '',
            campo_36_factura_despacho: `${crt.factura_exportacion || ''} ${crt.nro_despacho || ''}`.trim(),
          }));
        });
    }
  }, [isOpen, crt, micToEdit, isEditMode, getTransportadoraNombre]);

  useEffect(() => {
    if (formData.campo_1_porteador) {
      const transportadoraNombre = getTransportadoraNombre(formData.campo_1_porteador);
      if (transportadoraNombre && transportadoraNombre !== formData.campo_9_datos_transporte) {
        setFormData(prev => ({ ...prev, campo_9_datos_transporte: transportadoraNombre }));
      }
    }
  }, [formData.campo_1_porteador, formData.campo_9_datos_transporte, getTransportadoraNombre]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.campo_11_placa) {
      alert('El campo "Placa de camión" es obligatorio');
      return;
    }

    const datosPDF = {
      campo_1_transporte: formData.campo_1_transporte || '',
      campo_9_datos_transporte: formData.campo_9_datos_transporte || '',
      campo_2_numero: formData.campo_2_numero,
      campo_3_transporte: formData.campo_3_transporte || 'NO',
      campo_4_estado: formData.campo_4_estado || 'PROVISORIO',
      campo_5_hoja: formData.campo_5_hoja || '1 / 1',
      campo_6_fecha: formData.campo_6_fecha ? formData.campo_6_fecha.split('-').reverse().join('/') : '',
      campo_39: formData.campo_6_fecha ? formData.campo_6_fecha.split('-').reverse().join('/') : '',
      campo_7_pto_seguro: formData.campo_7_pto_seguro,
      campo_8_destino: formData.campo_8_destino,
      campo_10_numero: formData.campo_10_numero,
      campo_11_placa: formData.campo_11_placa,
      campo_12_modelo_chasis: formData.campo_12_modelo_chasis,
      campo_13_siempre_45: formData.campo_13_siempre_45 || '45 TON',
      campo_14_anio: formData.campo_14_anio,
      campo_15_placa_semi: formData.campo_15_placa_semi,
      campo_16_asteriscos_1: formData.campo_16_asteriscos_1, campo_17_asteriscos_2: formData.campo_17_asteriscos_2,
      campo_18_asteriscos_3: formData.campo_18_asteriscos_3, campo_19_asteriscos_4: formData.campo_19_asteriscos_4,
      campo_20_asteriscos_5: formData.campo_20_asteriscos_5, campo_21_asteriscos_6: formData.campo_21_asteriscos_6,
      campo_22_asteriscos_7: formData.campo_22_asteriscos_7,
      campo_23_numero_campo2_crt: isEditMode ? formData.campo_23_numero_campo2_crt : (crt?.numero_crt || ''),
      campo_24_aduana: formData.campo_24_aduana,
      campo_25_moneda: formData.campo_25_moneda || 'USD',
      campo_26_pais: formData.campo_26_pais || '520-PARAGUAY',
      campo_27_valor_campo16: formData.campo_27_valor_campo16,
      campo_28_total: formData.campo_28_total,
      campo_29_seguro: formData.campo_29_seguro,
      campo_30_tipo_bultos: formData.campo_30_tipo_bultos,
      campo_31_cantidad: formData.campo_31_cantidad,
      campo_32_peso_bruto: formData.campo_32_peso_bruto,
      campo_33_datos_campo1_crt: formData.campo_33_datos_campo1_crt || '',
      campo_34_datos_campo4_crt: formData.campo_34_datos_campo4_crt || '',
      campo_35_datos_campo6_crt: formData.campo_35_datos_campo6_crt || '',
      campo_38_datos_campo11_crt: formData.campo_38_datos_campo11_crt || '',
      campo_36_factura_despacho: formData.campo_36_factura_despacho,
      campo_37_valor_manual: formData.campo_37_valor_manual,
      campo_40_tramo: formData.campo_40_tramo,
      chofer: formData.chofer,
    };

    const datosPDFSeguros = {};
    for (const [key, value] of Object.entries(datosPDF)) {
      datosPDFSeguros[key] = (value === null || value === undefined) ? '' : value.toString();
    }

    if (isEditMode && onUpdate) {
      onUpdate(micToEdit.id, datosPDFSeguros);
    } else {
      onGenerate(datosPDFSeguros);
    }
  };

  const resetForm = () => {
    const totalFleteFormatted = crt?.total_flete ? crt.total_flete.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('.', ',') : '';
    const seguroFormatted = crt?.seguro ? crt.seguro.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('.', ',') : '';
    // Peso Neto logic removed as per request to leave field 37 blank

    setFormData({
      campo_1_porteador: crt?.transportadora_id || '',
      campo_2_numero: crt?.transportadora?.rol_contribuyente || crt?.transportadora_rol_contribuyente || '',
      campo_3_transporte: crt?.transporte_sucesivos || '',
      campo_7_pto_seguro: crt?.ciudad_emision_id || '',
      campo_8_destino: crt?.lugar_entrega || '',
      campo_9_datos_transporte: crt?.transportadora?.nombre || '',
      campo_10_numero: crt?.transportadora?.rol_contribuyente || crt?.transportadora_rol_contribuyente || '',
      campo_11_placa: crt?.placa_camion || crt?.placa_vehiculo || 'ABC-1234',
      campo_12_modelo_chasis: crt?.marca_modelo || crt?.modelo_vehiculo || '',
      campo_14_anio: crt?.anio_vehiculo || new Date().getFullYear().toString(),
      campo_15_placa_semi: crt?.placa_semi || '',
      campo_24_aduana: crt?.aduana || 'BRASIL - MULTILOG - FOZ DO IGUAZU 508 - 030',
      campo_26_pais: '520-PARAGUAY',
      campo_27_valor_campo16: crt?.declaracion_mercaderia || '',
      campo_28_total: totalFleteFormatted,
      campo_29_seguro: seguroFormatted,
      campo_30_tipo_bultos: crt?.tipo_bultos || 'CAJAS',
      campo_31_cantidad: crt?.cantidad_bultos || '1',
      campo_32_peso_bruto: crt?.peso_bruto || '',
      campo_37_valor_manual: '', // Dejar en blanco para llenado manual
      campo_36_factura_despacho: `${crt?.factura_exportacion || ''} ${crt?.nro_despacho || ''}`.trim(),
      campo_40_tramo: crt?.tramo || crt?.detalles_mercaderia?.substring(0, 50) || '',
      campo_4_estado: 'PROVISORIO',
      campo_5_hoja: '1 / 1',
      campo_6_fecha: new Date().toISOString().split('T')[0],
      campo_13_siempre_45: '45 TON',
      campo_25_moneda: crt?.moneda || '',
      campo_16_asteriscos_1: '******', campo_17_asteriscos_2: '******', campo_18_asteriscos_3: '******',
      campo_19_asteriscos_4: '******', campo_20_asteriscos_5: '******', campo_21_asteriscos_6: '******',
      campo_22_asteriscos_7: '******',
    });
  };

  // Convert aduanas to options for React-Select
  const aduanaOptions = aduanas.map(a => ({ value: a.nombre, label: `${a.codigo} - ${a.nombre}` }));

  // Custom Styles for Select to match Tailwind
  const selectStyles = {
    control: (base) => ({
      ...base,
      borderColor: '#e2e8f0',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
      padding: '0.1rem',
      '&:hover': { borderColor: '#cbd5e1' }
    }),
    valueContainer: (base) => ({ ...base, padding: '0 8px' }),
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">

        {/* HEADER */}
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-indigo-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{isEditMode ? 'Editar MIC' : 'Completar Datos MIC'}</h2>
              <p className="text-slate-500 text-sm">{isEditMode ? `MIC #${micToEdit?.id}` : `CRT: ${crt?.numero_crt || 'N/A'}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {diagnostico && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-blue-800">Diagnóstico de Generación de PDF</h3>
                <dl className="mt-1 grid grid-cols-2 gap-x-4 text-xs text-blue-700">
                  <div><span className="font-semibold">Fuente:</span> {diagnostico.campo_38?.font_size_used}pt</div>
                  <div><span className="font-semibold">Líneas:</span> {diagnostico.campo_38?.lines_drawn}</div>
                  <div><span className="font-semibold">Truncado:</span> {diagnostico.campo_38?.truncated ? 'Sí' : 'No'}</div>
                  <div><span className="font-semibold">Área:</span> {diagnostico.campo_38?.effective_area}</div>
                </dl>
              </div>
            </div>
          )}

          <div className="space-y-6">

            {/* SECCION: DATOS GENERALES */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Datos Generales del M.I.C. / D.T.A.</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 4 - Estado</label>
                  <select value={formData.campo_4_estado} onChange={(e) => handleInputChange('campo_4_estado', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm">
                    <option value="PROVISORIO">PROVISORIO</option>
                    <option value="DEFINITIVO">DEFINITIVO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 5 - Hoja</label>
                  <input type="text" value={formData.campo_5_hoja} onChange={(e) => handleInputChange('campo_5_hoja', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 6 - Fecha</label>
                  <input type="date" value={formData.campo_6_fecha} onChange={(e) => handleInputChange('campo_6_fecha', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CRT Referencia</label>
                  <input type="text" value={crt?.numero_crt || ''} disabled className="w-full p-2 border border-slate-200 bg-slate-100 rounded-lg text-sm" />
                </div>
              </div>
            </div>

            {/* SECCION: ENTIDADES */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Entidades</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 1 - Transportadora (ID)</label>
                  <input value={formData.campo_1_transporte || ''} readOnly className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 text-sm" />
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 9 - Nombre Transportista (Editable)</label>
                  <input type="text" value={formData.campo_9_datos_transporte || ''} onChange={(e) => handleInputChange('campo_9_datos_transporte', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 2 - Rol Contribuyente</label>
                  <input type="text" value={formData.campo_2_numero} onChange={(e) => handleInputChange('campo_2_numero', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 10 - Rol Contribuyente</label>
                  <input type="text" value={formData.campo_10_numero} onChange={(e) => handleInputChange('campo_10_numero', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              {/* ReadOnly CRT Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                {[
                  { l: "Campo 33 - Remitente", f: "campo_33_datos_campo1_crt" },
                  { l: "Campo 34 - Destinatario", f: "campo_34_datos_campo4_crt" },
                  { l: "Campo 35 - Consignatario", f: "campo_35_datos_campo6_crt" },
                ].map(x => (
                  <div key={x.f}>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{x.l}</label>
                    <textarea value={formData[x.f] || ''} readOnly rows="2" className="w-full p-2 border border-slate-200 rounded text-xs bg-white resize-none" />
                  </div>
                ))}
              </div>
            </div>

            {/* SECCION: VEHICULO */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm border-l-4 border-l-indigo-500">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Datos del Vehículo Original</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Campo 11 - Placa Camión *</label>
                  <input type="text" value={formData.campo_11_placa} onChange={(e) => handleInputChange('campo_11_placa', e.target.value)} className="w-full p-2 border border-indigo-200 rounded-lg text-sm bg-white font-medium" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 12 - Marca y Nro Chasis Camión</label>
                  <input type="text" value={formData.campo_12_modelo_chasis} onChange={(e) => handleInputChange('campo_12_modelo_chasis', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 13 - Capacidad</label>
                  <input type="text" value={formData.campo_13_siempre_45} onChange={(e) => handleInputChange('campo_13_siempre_45', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 14 - Año Fab.</label>
                  <input type="number" value={formData.campo_14_anio} onChange={(e) => handleInputChange('campo_14_anio', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 15 - Placa Semi</label>
                  <input type="text" value={formData.campo_15_placa_semi} onChange={(e) => handleInputChange('campo_15_placa_semi', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 3 - Tránsito Aduanero</label>
                  <select value={formData.campo_3_transporte} onChange={(e) => handleInputChange('campo_3_transporte', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm">
                    <option value="">Seleccionar...</option><option value="SI">SI</option><option value="NO">NO</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECCION: RUTA Y ADUANA */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Ruta y Aduanas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 7 - Aduana de Partida</label>
                  <Select
                    options={aduanaOptions}
                    value={aduanaOptions.find(op => op.value === formData.campo_7_pto_seguro) || { label: formData.campo_7_pto_seguro, value: formData.campo_7_pto_seguro }}
                    onChange={op => handleInputChange('campo_7_pto_seguro', op?.value || '')}
                    placeholder="Seleccionar..."
                    isClearable
                    styles={selectStyles}
                  />
                  {/* Fallback for text input if needed or just use Select with create option? keeping simple for now */}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 8 - Ciudad/País Destino</label>
                  <input type="text" value={formData.campo_8_destino} onChange={(e) => handleInputChange('campo_8_destino', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 24 - Aduana de Destino/Cruce</label>
                  <Select
                    options={aduanaOptions}
                    value={aduanaOptions.find(op => op.value === formData.campo_24_aduana) || { label: formData.campo_24_aduana, value: formData.campo_24_aduana }}
                    onChange={op => handleInputChange('campo_24_aduana', op?.value || '')}
                    placeholder="Seleccionar..."
                    isClearable
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 26 - Origen de las Mercaderías</label>
                  <input type="text" value={formData.campo_26_pais} onChange={(e) => handleInputChange('campo_26_pais', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Campo 40 - Ruta / Tramo</label>
                    <button
                      onClick={() => {
                        // 1. Origen (Campo 7 - Aduana)
                        const selectedAduanaObj = aduanas.find(a => a.nombre === formData.campo_7_pto_seguro);
                        const aduanaName = selectedAduanaObj ? selectedAduanaObj.nombre : (formData.campo_7_pto_seguro || '');
                        const originCity = selectedAduanaObj ? selectedAduanaObj.ciudad : 'CIUDAD DEL ESTE';

                        // 2. Destino (Campo 8 & 26)
                        const destinoLugar = formData.campo_8_destino || '';
                        const destinoPais = formData.campo_26_pais || '';
                        const cleanCountry = (str) => str.replace(/^\d+-/, '').trim();
                        const destCountryName = cleanCountry(destinoPais).toUpperCase();

                        // 3. Aduana Destino (Campo 24)
                        const aduanaDestino = formData.campo_24_aduana || '';

                        // 4. Gateway Logic via Country
                        let gateway = "";
                        if (destCountryName.includes("BRASIL")) {
                          gateway = "MULTILOG-FOZ DO IGUAZU";
                        } else if (destCountryName.includes("ARGENTINA")) {
                          gateway = "CLORINDA";
                        } else if (destCountryName.includes("CHILE")) {
                          gateway = "JAMA";
                        } else {
                          gateway = "FRONTERA";
                        }

                        // Construct String
                        // FORMAT: ORIGEN:[AduanaName]-[OriginCity];SALIDA: [OriginCity]-[OriginCity]; DESTINO: [Country]-[DestCity]-[AduanaDest];DESTINO ENTRADA: [Country]-[DestCity]-[Gateway];
                        const routeText = `ORIGEN:${aduanaName}-${originCity};SALIDA: ${originCity}-${originCity}; DESTINO: ${destCountryName}-${destinoLugar}-${aduanaDestino};DESTINO ENTRADA: ${destCountryName}-${destinoLugar}-${gateway};`;

                        handleInputChange('campo_40_tramo', routeText);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                      type="button"
                    >
                      ⚡ Generar Ruta Automática
                    </button>
                  </div>
                  <textarea value={formData.campo_40_tramo} onChange={(e) => handleInputChange('campo_40_tramo', e.target.value)} rows="5" className="w-full p-2 border border-slate-300 rounded-lg text-sm resize-y font-mono" placeholder="Ej: ORIGEN: ... DESTINO: ... " />

                  <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chofer</label>
                    <input
                      type="text"
                      value={formData.campo_chofer || ''}
                      onChange={(e) => handleInputChange('campo_chofer', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                      placeholder="Ingrese el nombre del chofer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCION: VALORES Y CARGA */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Valores y Carga</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 25 - Moneda</label>
                  <input type="text" value={formData.campo_25_moneda} onChange={(e) => handleInputChange('campo_25_moneda', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 27 - Valor FOB</label>
                  <input type="text" value={formData.campo_27_valor_campo16} onChange={(e) => handleInputChange('campo_27_valor_campo16', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm text-right" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 28 - Flete</label>
                  <input type="text" value={formData.campo_28_total} onChange={(e) => handleInputChange('campo_28_total', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm text-right" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 29 - Seguro</label>
                  <input type="text" value={formData.campo_29_seguro} onChange={(e) => handleInputChange('campo_29_seguro', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm text-right" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 30 - Tipo Bultos</label>
                  <input type="text" value={formData.campo_30_tipo_bultos} onChange={(e) => handleInputChange('campo_30_tipo_bultos', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 31 - Cantidad</label>
                  <input type="text" value={formData.campo_31_cantidad} onChange={(e) => handleInputChange('campo_31_cantidad', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 32 - Peso Bruto</label>
                  <input type="text" value={formData.campo_32_peso_bruto} onChange={(e) => handleInputChange('campo_32_peso_bruto', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm text-right" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 37 - Número de precintos</label>
                  <input
                    type="text"
                    value={formData.campo_37_valor_manual}
                    onChange={(e) => handleInputChange('campo_37_valor_manual', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm text-right"
                  />
                </div>
              </div>
            </div>

            {/* SECCION: DOCUMENTOS Y OBS */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Documentos y Observaciones</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 36 - Documentos Anexos (Facturas, Despachos, etc)</label>
                  <textarea value={formData.campo_36_factura_despacho} onChange={(e) => handleInputChange('campo_36_factura_despacho', e.target.value)} rows="3" className="w-full p-2 border border-slate-300 rounded-lg text-sm resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo 38 - Observaciones / Formalidades Aduaneras</label>
                  <textarea value={formData.campo_38_datos_campo11_crt || ''} onChange={(e) => handleInputChange('campo_38_datos_campo11_crt', e.target.value)} rows="3" className="w-full p-2 border border-slate-300 rounded-lg text-sm resize-none" />
                </div>
              </div>
            </div>
          </div>

          {/* SECCION: CAMPOS RESERVADOS */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Campos Reservados (16-22)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map(i => {
                const fieldName = `campo_${15 + i}_asteriscos_${i}`;
                return (
                  <div key={fieldName}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campo {15 + i}</label>
                    <input type="text" value={formData[fieldName] || ''} onChange={(e) => handleInputChange(fieldName, e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                )
              })}
            </div>
          </div>

        </div>


        {/* FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 flex justify-between items-center">
          <button onClick={resetForm} className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
            <RefreshCw className="w-4 h-4" /> Resetear
          </button>

          <div className="flex space-x-3">
            <button onClick={onClose} className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-white transition-colors font-medium">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={loading || !formData.campo_11_placa} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isEditMode ? 'Guardar Cambios' : 'Generar PDF MIC'}</span>
            </button>
          </div>
        </div>
      </div>
    </div >
  );
};

export default ModalMICCompleto;
