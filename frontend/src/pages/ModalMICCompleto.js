import React, { useState, useEffect } from 'react';
import { X, Save, FileText } from 'lucide-react';

const ModalMICCompleto = ({ 
  isOpen, 
  onClose, 
  crt, 
  onGenerate,
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    // SECCIÓN 1: Información del Transporte
    campo_1_porteador: '',
    campo_2_numero: '',
    campo_3_transporte: '',
    campo_7_pto_seguro: '',
    campo_8_destino: '',

    // SECCIÓN 2: Datos del Vehículo
    campo_10_numero: '',
    campo_11_placa: '',
    campo_12_modelo_chasis: '',
    campo_14_anio: '',
    campo_15_placa_semi: '',

    // SECCIÓN 3: Información Aduanera
    campo_24_aduana: '',
    campo_26_pais: '520-PARAGUAY',

    // SECCIÓN 4: Valores y Montos (editables)
    campo_27_valor_campo16: '',
    campo_28_total: '',
    campo_29_seguro: '',

    // SECCIÓN 5: Mercadería
    campo_30_tipo_bultos: '',
    campo_31_cantidad: '',
    campo_32_peso_bruto: '',
    campo_37_valor_manual: '',

    // SECCIÓN 6: Documentos y Referencias
    campo_36_factura_despacho: '',
    campo_40_tramo: '',

    // SECCIÓN 7: Campos de Solo Lectura (pre-llenados)
    campo_4_estado: 'PROVISORIO',
    campo_5_hoja: '1 / 1',
    campo_6_fecha: new Date().toISOString().split('T')[0],
    campo_13_siempre_45: '45 TON',
    campo_25_moneda: '',
  });

  const [transportadoras, setTransportadoras] = useState([]);

  // Cargar transportadoras cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      const cargarTransportadoras = async () => {
        try {
          const response = await fetch('http://localhost:5000/api/transportadoras/');
          const data = await response.json();
          setTransportadoras(data.items || []);
        } catch (error) {
          console.error('Error cargando transportadoras:', error);
          setTransportadoras([]);
        }
      };
      cargarTransportadoras();
    }
  }, [isOpen]);

  // Prellenar datos del CRT cuando se abre el modal
  useEffect(() => {
    if (isOpen && crt) {
      setFormData(prev => ({
        ...prev,
        campo_1_porteador: crt.transportadora_id || '',
        campo_2_numero: crt.transportadora_rol_contribuyente || '',
        campo_8_destino: crt.lugar_entrega || '',
        campo_10_numero: crt.transportadora_rol_contribuyente || '',
        campo_25_moneda: crt.moneda || '',
        campo_27_valor_campo16: crt.declaracion_mercaderia || '',
        campo_32_peso_bruto: crt.peso_bruto || '',
        campo_36_factura_despacho: `${crt.factura_exportacion || ''} ${crt.nro_despacho || ''}`.trim(),
      }));
    }
  }, [isOpen, crt]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    onGenerate(formData);
  };

  const resetForm = () => {
    setFormData({
      campo_1_porteador: crt?.transportadora_id || '',
      campo_2_numero: crt?.transportadora_rol_contribuyente || '',
      campo_3_transporte: '',
      campo_7_pto_seguro: '',
      campo_8_destino: crt?.lugar_entrega || '',
      campo_10_numero: crt?.transportadora_rol_contribuyente || '',
      campo_11_placa: '',
      campo_12_modelo_chasis: '',
      campo_14_anio: '',
      campo_15_placa_semi: '',
      campo_24_aduana: '',
      campo_26_pais: '520-PARAGUAY',
      campo_27_valor_campo16: crt?.declaracion_mercaderia || '',
      campo_28_total: '',
      campo_29_seguro: '',
      campo_30_tipo_bultos: '',
      campo_31_cantidad: '',
      campo_32_peso_bruto: crt?.peso_bruto || '',
      campo_37_valor_manual: '',
      campo_36_factura_despacho: `${crt?.factura_exportacion || ''} ${crt?.nro_despacho || ''}`.trim(),
      campo_40_tramo: '',
      campo_4_estado: 'PROVISORIO',
      campo_5_hoja: '1 / 1',
      campo_6_fecha: new Date().toISOString().split('T')[0],
      campo_13_siempre_45: '45 TON',
      campo_25_moneda: crt?.moneda || '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Completar Datos MIC</h2>
              <p className="text-blue-100">CRT: {crt?.numero_crt || 'N/A'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 pr-8">
          <div className="space-y-6">
            {/* FORMULARIO UNIFICADO - TODOS LOS CAMPOS ORGANIZADOS POR NÚMERO */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Campo 1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 1 - Nombre del porteador
                  </label>
                  <select
                    value={formData.campo_1_porteador}
                    onChange={(e) => handleInputChange('campo_1_porteador', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Seleccionar transportadora</option>
                    {transportadoras.map((transportadora) => (
                      <option key={transportadora.id} value={transportadora.id}>
                        {transportadora.nombre}
                      </option>
                    ))}
                  </select>
                  <small className="text-gray-500">Del CRT transportadora</small>
                </div>

                {/* Campo 3 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 3 - Tránsito aduanero
                  </label>
                  <select
                    value={formData.campo_3_transporte}
                    onChange={(e) => handleInputChange('campo_3_transporte', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                  >
                    <option value="">Seleccionar opción</option>
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>

                {/* Campo 4 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 4 - Nº
                  </label>
                  <input
                    type="text"
                    value={formData.campo_4_estado}
                    readOnly
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>

                {/* Campo 2 */}
                <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 2 - Rol de contribuyente
                  </label>
                  <input
                    type="text"
                    value={formData.campo_2_numero}
                    onChange={(e) => handleInputChange('campo_2_numero', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Rol del Contribuyente"
                  />
                </div>

                {/* Campo 5 - Debajo del Campo 3 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 5 - Hoja
                  </label>
                  <input
                    type="text"
                    value={formData.campo_5_hoja}
                    readOnly
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>

                {/* Campo 6 - Debajo del Campo 4 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 6 - Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.campo_6_fecha}
                    onChange={(e) => handleInputChange('campo_6_fecha', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                  />
                </div>

                {/* Campo 7 */}
                <div className="md:col-span-2 lg:col-span-3 xl:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 7 - Aduana, ciudad y país de partida
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.campo_7_pto_seguro}
                      onChange={(e) => handleInputChange('campo_7_pto_seguro', e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Seleccionar aduana</option>
                      <option value="ASUNCIÓN, PARAGUAY">ASUNCIÓN, PARAGUAY</option>
                      <option value="CIUDAD DEL ESTE, PARAGUAY">CIUDAD DEL ESTE, PARAGUAY</option>
                      <option value="ENCARNACIÓN, PARAGUAY">ENCARNACIÓN, PARAGUAY</option>
                      <option value="PEDRO JUAN CABALLERO, PARAGUAY">PEDRO JUAN CABALLERO, PARAGUAY</option>
                      <option value="PUERTO FALCÓN, PARAGUAY">PUERTO FALCÓN, PARAGUAY</option>
                      <option value="BUENOS AIRES, ARGENTINA">BUENOS AIRES, ARGENTINA</option>
                      <option value="SÃO PAULO, BRASIL">SÃO PAULO, BRASIL</option>
                      <option value="RIO DE JANEIRO, BRASIL">RIO DE JANEIRO, BRASIL</option>
                      <option value="SANTOS, BRASIL">SANTOS, BRASIL</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const nuevaAduana = prompt('Ingrese nueva aduana (Ej: CIUDAD, PAÍS):');
                        if (nuevaAduana && nuevaAduana.trim()) {
                          handleInputChange('campo_7_pto_seguro', nuevaAduana.trim());
                        }
                      }}
                      className="px-3 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      title="Agregar nueva aduana"
                    >
                      ➕
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.campo_7_pto_seguro) {
                          // eslint-disable-next-line no-restricted-globals
                          const confirmar = confirm(`¿Eliminar "${formData.campo_7_pto_seguro}" de la lista?`);
                          if (confirmar) {
                            handleInputChange('campo_7_pto_seguro', '');
                          }
                        } else {
                          alert('Selecciona una aduana primero para eliminarla.');
                        }
                      }}
                      className="px-3 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      title="Eliminar aduana seleccionada"
                    >
                      ❌
                    </button>
                  </div>
                  <small className="text-gray-500 mt-1 block">
                    Selecciona una aduana o agrega una nueva con el botón ➕
                  </small>
                </div>

                {/* Campo 8 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 8 - Destino
                  </label>
                  <input
                    type="text"
                    value={formData.campo_8_destino}
                    onChange={(e) => handleInputChange('campo_8_destino', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Ciudad/Puerto de destino"
                  />
                  <small className="text-gray-500">Del CRT lugar de entrega</small>
                </div>

                {/* Campo 10 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 10 - Rol del Contribuyente
                  </label>
                  <input
                    type="text"
                    value={formData.campo_10_numero}
                    onChange={(e) => handleInputChange('campo_10_numero', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="Rol del Contribuyente"
                  />
                </div>

                {/* Campo 11 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 11 - Placa de camión *
                  </label>
                  <input
                    type="text"
                    value={formData.campo_11_placa}
                    onChange={(e) => handleInputChange('campo_11_placa', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="ABC-1234"
                  />
                </div>

                {/* Campo 12 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 12 - Marca y número
                  </label>
                  <input
                    type="text"
                    value={formData.campo_12_modelo_chasis}
                    onChange={(e) => handleInputChange('campo_12_modelo_chasis', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="Marca y número del vehículo"
                  />
                </div>

                {/* Campo 13 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 13 - Capacidad (Solo lectura)
                  </label>
                  <input
                    type="text"
                    value={formData.campo_13_siempre_45}
                    readOnly
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>

                {/* Campo 14 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 14 - Año del Vehículo
                  </label>
                  <input
                    type="number"
                    min="1980"
                    max="2030"
                    value={formData.campo_14_anio}
                    onChange={(e) => handleInputChange('campo_14_anio', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="2024"
                  />
                </div>

                {/* Campo 15 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 15 - Placa Semirremolque
                  </label>
                  <input
                    type="text"
                    value={formData.campo_15_placa_semi}
                    onChange={(e) => handleInputChange('campo_15_placa_semi', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="XYZ-5678"
                  />
                </div>

                {/* Campo 24 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 24 - Aduana
                  </label>
                  <select
                    value={formData.campo_24_aduana}
                    onChange={(e) => handleInputChange('campo_24_aduana', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  >
                    <option value="">Seleccionar aduana</option>
                    <option value="ASUNCIÓN">ASUNCIÓN</option>
                    <option value="CIUDAD DEL ESTE">CIUDAD DEL ESTE</option>
                    <option value="ENCARNACIÓN">ENCARNACIÓN</option>
                    <option value="PEDRO JUAN CABALLERO">PEDRO JUAN CABALLERO</option>
                    <option value="PUERTO FALCÓN">PUERTO FALCÓN</option>
                  </select>
                </div>

                {/* Campo 25 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 25 - Moneda (Solo lectura)
                  </label>
                  <input
                    type="text"
                    value={formData.campo_25_moneda}
                    readOnly
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>

                {/* Campo 26 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 26 - País (Solo lectura)
                  </label>
                  <input
                    type="text"
                    value={formData.campo_26_pais}
                    readOnly
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>

                {/* Campo 27 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 27 - Valor Declarado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.campo_27_valor_campo16}
                    onChange={(e) => handleInputChange('campo_27_valor_campo16', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
                    placeholder="0.00"
                  />
                  <small className="text-gray-500">Del CRT Campo 16</small>
                </div>

                {/* Campo 28 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 28 - Total Flete
                  </label>
                  <input
                    type="text"
                    value={formData.campo_28_total}
                    onChange={(e) => handleInputChange('campo_28_total', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
                    placeholder="1.500,00"
                  />
                  <small className="text-gray-500">Calculado automáticamente</small>
                </div>

                {/* Campo 29 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 29 - Seguro
                  </label>
                  <input
                    type="text"
                    value={formData.campo_29_seguro}
                    onChange={(e) => handleInputChange('campo_29_seguro', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
                    placeholder="150,00"
                  />
                  <small className="text-gray-500">Calculado automáticamente</small>
                </div>

                {/* Campo 30 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 30 - Tipo de Bultos
                  </label>
                  <select
                    value={formData.campo_30_tipo_bultos}
                    onChange={(e) => handleInputChange('campo_30_tipo_bultos', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="CAJAS">CAJAS</option>
                    <option value="PALLETS">PALLETS</option>
                    <option value="BOLSAS">BOLSAS</option>
                    <option value="CONTENEDORES">CONTENEDORES</option>
                    <option value="TAMBORES">TAMBORES</option>
                    <option value="OTROS">OTROS</option>
                  </select>
                </div>

                {/* Campo 31 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 31 - Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.campo_31_cantidad}
                    onChange={(e) => handleInputChange('campo_31_cantidad', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    placeholder="0"
                  />
                </div>

                {/* Campo 32 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 32 - Peso Bruto (kg)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.campo_32_peso_bruto}
                    onChange={(e) => handleInputChange('campo_32_peso_bruto', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    placeholder="0.000"
                  />
                  <small className="text-gray-500">Del CRT</small>
                </div>

                {/* Campo 36 */}
                <div className="md:col-span-2 lg:col-span-3 xl:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 36 - Factura y Despacho
                  </label>
                  <textarea
                    rows="2"
                    value={formData.campo_36_factura_despacho}
                    onChange={(e) => handleInputChange('campo_36_factura_despacho', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                    placeholder="Información de facturas y números de despacho"
                  />
                  <small className="text-gray-500">Del CRT factura y despacho</small>
                </div>

                {/* Campo 37 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 37 - Valor Manual
                  </label>
                  <input
                    type="text"
                    value={formData.campo_37_valor_manual}
                    onChange={(e) => handleInputChange('campo_37_valor_manual', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
                    placeholder="Valor adicional"
                  />
                </div>

                {/* Campo 40 */}
                <div className="md:col-span-2 lg:col-span-3 xl:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campo 40 - Tramo
                  </label>
                  <input
                    type="text"
                    value={formData.campo_40_tramo}
                    onChange={(e) => handleInputChange('campo_40_tramo', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Descripción del tramo"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 border-t p-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              🔄 Resetear Formulario
            </button>
            <span className="text-sm text-gray-500">
              * Campos marcados son obligatorios
            </span>
          </div>
          
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.campo_11_placa}
              className={`px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors ${
                loading || !formData.campo_11_placa
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Generar PDF MIC</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalMICCompleto;