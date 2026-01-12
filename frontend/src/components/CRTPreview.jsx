import React from 'react';
import { FileText, Download, X, Eye } from 'lucide-react';

const CRTPreview = ({ crtData, onClose, onDownloadPDF, isOpen }) => {
  if (!isOpen || !crtData) return null;

  // Función para formatear números
  const formatNumber = (num, decimals = 2) => {
    if (!num || num === '') return '';
    try {
      const number = parseFloat(num.toString().replace(',', '.'));
      return number.toLocaleString('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    } catch {
      return num;
    }
  };

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Eye className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Vista Previa CRT</h2>
              <p className="text-blue-100">Número: {crtData.numero_crt || 'Sin asignar'}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onDownloadPDF}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gray-50 border rounded-lg p-6">
            {/* CRT Layout Simulation */}
            <div className="bg-white border rounded-lg p-8 shadow-sm">
              {/* Header Section */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">CARTA DE PORTE</h1>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Número: <strong>{crtData.numero_crt || 'Sin asignar'}</strong></span>
                  <span>Fecha: <strong>{formatDate(crtData.fecha_emision)}</strong></span>
                  <span>Estado: <strong className={`px-2 py-1 rounded text-xs ${
                    crtData.estado === 'EMITIDO' ? 'bg-green-100 text-green-800' :
                    crtData.estado === 'BORRADOR' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>{crtData.estado}</strong></span>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Campo 1 - Remitente */}
                  <div className="border rounded p-3">
                    <h4 className="font-bold text-sm text-blue-900 mb-2">1. Remitente</h4>
                    <div className="text-sm">
                      <p className="font-semibold">{crtData.remitente || 'No especificado'}</p>
                      <p className="text-gray-600">{crtData.remitente_direccion}</p>
                      <p className="text-gray-600">{crtData.remitente_ciudad} - {crtData.remitente_pais}</p>
                    </div>
                  </div>

                  {/* Campo 4 - Destinatario */}
                  <div className="border rounded p-3">
                    <h4 className="font-bold text-sm text-blue-900 mb-2">4. Destinatario</h4>
                    <div className="text-sm">
                      <p className="font-semibold">{crtData.destinatario || 'No especificado'}</p>
                      <p className="text-gray-600">{crtData.destinatario_direccion}</p>
                      <p className="text-gray-600">{crtData.destinatario_ciudad} - {crtData.destinatario_pais}</p>
                    </div>
                  </div>

                  {/* Campo 6 - Consignatario */}
                  <div className="border rounded p-3">
                    <h4 className="font-bold text-sm text-blue-900 mb-2">6. Consignatario</h4>
                    <div className="text-sm">
                      <p className="font-semibold">{crtData.consignatario || 'No especificado'}</p>
                      <p className="text-gray-600">{crtData.consignatario_direccion}</p>
                      <p className="text-gray-600">{crtData.consignatario_ciudad} - {crtData.consignatario_pais}</p>
                    </div>
                  </div>

                  {/* Campo 9 - Notificar a */}
                  <div className="border rounded p-3">
                    <h4 className="font-bold text-sm text-blue-900 mb-2">9. Notificar a</h4>
                    <div className="text-sm">
                      <p className="font-semibold">{crtData.notificar_a || 'No especificado'}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Campo 2 - Número */}
                  <div className="border rounded p-3">
                    <h4 className="font-bold text-sm text-blue-900 mb-2">2. Número</h4>
                    <p className="text-sm font-mono">{crtData.numero_crt || 'Sin asignar'}</p>
                  </div>

                  {/* Campo 3 - Transportadora */}
                  <div className="border rounded p-3">
                    <h4 className="font-bold text-sm text-blue-900 mb-2">3. Transportadora</h4>
                    <div className="text-sm">
                      <p className="font-semibold">{crtData.transportadora || 'No especificado'}</p>
                      <p className="text-gray-600">{crtData.transportadora_direccion}</p>
                      <p className="text-gray-600">{crtData.transportadora_ciudad} - {crtData.transportadora_pais}</p>
                    </div>
                  </div>

                  {/* Campo 5 - Ciudad de Emisión */}
                  <div className="border rounded p-3">
                    <h4 className="font-bold text-sm text-blue-900 mb-2">5. Ciudad de Emisión</h4>
                    <p className="text-sm">{crtData.ciudad_emision} - {crtData.pais_emision}</p>
                  </div>

                  {/* Campo 7 - Local de Responsabilidad */}
                  <div className="border rounded p-3">
                    <h4 className="font-bold text-sm text-blue-900 mb-2">7. Local de Responsabilidad</h4>
                    <p className="text-sm">{crtData.remitente_ciudad} - {crtData.remitente_pais} - {formatDate(crtData.fecha_emision)}</p>
                  </div>

                  {/* Campo 8 - Lugar de Entrega */}
                  <div className="border rounded p-3">
                    <h4 className="font-bold text-sm text-blue-900 mb-2">8. Lugar de Entrega</h4>
                    <p className="text-sm">{crtData.lugar_entrega || 'No especificado'}</p>
                  </div>

                  {/* Campo 10 - Transporte Sucesivos */}
                  <div className="border rounded p-3">
                    <h4 className="font-bold text-sm text-blue-900 mb-2">10. Transporte Sucesivos</h4>
                    <p className="text-sm">{crtData.transporte_sucesivos || 'No especificado'}</p>
                  </div>
                </div>
              </div>

              {/* Campo 11 - Detalles de Mercadería */}
              <div className="border rounded p-3 mb-6">
                <h4 className="font-bold text-sm text-blue-900 mb-2">11. Detalles de Mercadería</h4>
                <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                  {crtData.detalles_mercaderia || 'No especificado'}
                </div>
              </div>

              {/* Medidas y Pesos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="border rounded p-3">
                  <h4 className="font-bold text-sm text-blue-900 mb-2">12. Peso Bruto</h4>
                  <p className="text-lg font-mono">{formatNumber(crtData.peso_bruto, 3)} kg</p>
                </div>
                <div className="border rounded p-3">
                  <h4 className="font-bold text-sm text-blue-900 mb-2">Peso Neto</h4>
                  <p className="text-lg font-mono">{formatNumber(crtData.peso_neto, 3)} kg</p>
                </div>
                <div className="border rounded p-3">
                  <h4 className="font-bold text-sm text-blue-900 mb-2">13. Volumen</h4>
                  <p className="text-lg font-mono">{formatNumber(crtData.volumen, 5)} m³</p>
                </div>
              </div>

              {/* Valores y Incoterms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="border rounded p-3">
                  <h4 className="font-bold text-sm text-blue-900 mb-2">14. Incoterm y Valor</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{crtData.incoterm || 'No especificado'}</span>
                    <span className="text-lg font-mono font-bold">{crtData.moneda} {formatNumber(crtData.valor_incoterm)}</span>
                  </div>
                </div>
                <div className="border rounded p-3">
                  <h4 className="font-bold text-sm text-blue-900 mb-2">Valor Mercadería</h4>
                  <p className="text-lg font-mono font-bold">{crtData.moneda} {formatNumber(crtData.valor_mercaderia)}</p>
                </div>
              </div>

              {/* Campo 15 - Gastos */}
              {crtData.gastos && crtData.gastos.length > 0 && (
                <div className="border rounded p-3 mb-6">
                  <h4 className="font-bold text-sm text-blue-900 mb-3">15. Custos a Pagar / Gastos a Pagar</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Descripción</th>
                          <th className="text-right p-2">Remitente</th>
                          <th className="text-center p-2">Moneda</th>
                          <th className="text-right p-2">Destinatario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {crtData.gastos.map((gasto, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">{gasto.tramo || ''}</td>
                            <td className="text-right p-2 font-mono">{formatNumber(gasto.valor_remitente)}</td>
                            <td className="text-center p-2">{gasto.moneda_remitente || crtData.moneda}</td>
                            <td className="text-right p-2 font-mono">{formatNumber(gasto.valor_destinatario)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 font-bold bg-gray-50">
                          <td className="p-2">TOTAL</td>
                          <td className="text-right p-2 font-mono">
                            {formatNumber(crtData.gastos.reduce((sum, g) => sum + parseFloat(g.valor_remitente || 0), 0))}
                          </td>
                          <td className="text-center p-2">{crtData.moneda}</td>
                          <td className="text-right p-2 font-mono">
                            {formatNumber(crtData.gastos.reduce((sum, g) => sum + parseFloat(g.valor_destinatario || 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Valores Adicionales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="border rounded p-3">
                  <h4 className="font-bold text-sm text-blue-900 mb-2">16. Declaración Valor</h4>
                  <p className="text-lg font-mono font-bold">{crtData.moneda} {formatNumber(crtData.declaracion_mercaderia)}</p>
                </div>
                <div className="border rounded p-3">
                  <h4 className="font-bold text-sm text-blue-900 mb-2">17. Documentos Anexos</h4>
                  <p className="text-sm">Factura: {crtData.factura_exportacion || 'No especificada'}</p>
                  <p className="text-sm">Despacho: {crtData.nro_despacho || 'No especificado'}</p>
                </div>
                <div className="border rounded p-3">
                  <h4 className="font-bold text-sm text-blue-900 mb-2">18. Formalidades Aduana</h4>
                  <p className="text-sm whitespace-pre-wrap">{crtData.formalidades_aduana || 'No especificadas'}</p>
                </div>
              </div>

              {/* Valores Finales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="border rounded p-3">
                  <h4 className="font-bold text-sm text-blue-900 mb-2">19. Valor Flete Externo</h4>
                  <p className="text-lg font-mono font-bold">{crtData.moneda} {formatNumber(crtData.valor_flete_externo)}</p>
                </div>
                <div className="border rounded p-3">
                  <h4 className="font-bold text-sm text-blue-900 mb-2">20. Valor Reembolso</h4>
                  <p className="text-lg font-mono font-bold">{crtData.moneda} {formatNumber(crtData.valor_reembolso)}</p>
                </div>
              </div>

              {/* Observaciones */}
              <div className="border rounded p-3 mb-6">
                <h4 className="font-bold text-sm text-blue-900 mb-2">22. Declaraciones y Observaciones</h4>
                <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                  {crtData.observaciones || 'Sin observaciones'}
                </div>
              </div>

              {/* Firmas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded p-3 text-center">
                  <h4 className="font-bold text-sm text-blue-900 mb-2">21. Firma Remitente</h4>
                  <p className="text-sm font-semibold">{crtData.remitente || 'No especificado'}</p>
                  <p className="text-xs text-gray-600">Fecha: {formatDate(crtData.fecha_firma)}</p>
                </div>
                <div className="border rounded p-3 text-center">
                  <h4 className="font-bold text-sm text-blue-900 mb-2">23. Firma Transportador</h4>
                  <p className="text-sm font-semibold">{crtData.transportadora || 'No especificado'}</p>
                  <p className="text-xs text-gray-600">Fecha: {formatDate(crtData.fecha_firma)}</p>
                </div>
                <div className="border rounded p-3 text-center">
                  <h4 className="font-bold text-sm text-blue-900 mb-2">24. Firma Destinatario</h4>
                  <p className="text-sm font-semibold">{crtData.destinatario || 'No especificado'}</p>
                  <p className="text-xs text-gray-600">Fecha: {formatDate(crtData.fecha_firma)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t p-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cerrar Vista Previa
          </button>
          <button
            onClick={onDownloadPDF}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CRTPreview;