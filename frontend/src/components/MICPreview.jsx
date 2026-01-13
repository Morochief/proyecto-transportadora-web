import React from 'react';
import { FileText, Download, X, Eye } from 'lucide-react';

const MICPreview = ({ micData, onClose, onDownloadPDF, isOpen }) => {
    if (!isOpen || !micData) return null;

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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <Eye className="w-8 h-8" />
                        <div>
                            <h2 className="text-2xl font-bold">Vista Previa MIC/DTA</h2>
                            <p className="text-emerald-100">Nº: {micData.campo_23_numero_campo2_crt || 'Sin asignar'}</p>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={onDownloadPDF}
                            className="bg-white text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-50 transition-colors flex items-center space-x-2"
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
                        {/* MIC Layout Simulation */}
                        <div className="bg-white border rounded-lg p-8 shadow-sm">
                            {/* Header Section */}
                            <div className="text-center mb-8 border-b-2 border-emerald-600 pb-4">
                                <h1 className="text-3xl font-bold text-gray-800 mb-2">MANIFIESTO INTERNACIONAL DE CARGA</h1>
                                <h2 className="text-xl font-semibold text-emerald-700 mb-2">MIC/DTA</h2>
                                <div className="flex justify-between items-center text-sm text-gray-600 mt-4">
                                    <span>Nº Carta: <strong className="font-mono">{micData.campo_23_numero_campo2_crt || 'Sin asignar'}</strong></span>
                                    <span>Estado: <strong className={`px-2 py-1 rounded text-xs ${micData.campo_4_estado === 'DEFINITIVO' ? 'bg-emerald-100 text-emerald-800' :
                                            micData.campo_4_estado === 'ANULADO' ? 'bg-red-100 text-red-800' :
                                                'bg-amber-100 text-amber-800'
                                        }`}>{micData.campo_4_estado || 'PROVISORIO'}</strong></span>
                                    <span>Fecha: <strong>{formatDate(micData.campo_6_fecha)}</strong></span>
                                </div>
                            </div>

                            {/* Main Grid */}
                            <div className="space-y-6">
                                {/* Sección 1: Información de Transporte */}
                                <div className="border-2 border-emerald-200 rounded-lg p-4">
                                    <h3 className="text-lg font-bold text-emerald-800 mb-4 border-b border-emerald-200 pb-2">📋 Información de Transporte</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border rounded p-3 bg-emerald-50/30">
                                            <h4 className="font-bold text-sm text-emerald-900 mb-1">1. Transportadora</h4>
                                            <p className="text-sm font-semibold">{micData.campo_1_transporte || 'No especificado'}</p>
                                        </div>
                                        <div className="border rounded p-3 bg-emerald-50/30">
                                            <h4 className="font-bold text-sm text-emerald-900 mb-1">2/3. Origen/Destino</h4>
                                            <p className="text-sm">{micData.campo_7_origen || 'N/A'} → {micData.campo_8_destino || 'N/A'}</p>
                                        </div>
                                        <div className="border rounded p-3 bg-emerald-50/30">
                                            <h4 className="font-bold text-sm text-emerald-900 mb-1">8. Punto de Partida</h4>
                                            <p className="text-sm">{micData.campo_9_punto_partida || 'No especificado'}</p>
                                        </div>
                                        <div className="border rounded p-3 bg-emerald-50/30">
                                            <h4 className="font-bold text-sm text-emerald-900 mb-1">9. Punto de Destino</h4>
                                            <p className="text-sm">{micData.campo_10_punto_destino || 'No especificado'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sección 2: Vehículo */}
                                <div className="border-2 border-blue-200 rounded-lg p-4">
                                    <h3 className="text-lg font-bold text-blue-800 mb-4 border-b border-blue-200 pb-2">🚛 Datos del Vehículo</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="border rounded p-3 bg-blue-50/30">
                                            <h4 className="font-bold text-sm text-blue-900 mb-1">11. Placa Camión</h4>
                                            <p className="text-sm font-mono font-bold">{micData.campo_11_placa || 'N/A'}</p>
                                        </div>
                                        <div className="border rounded p-3 bg-blue-50/30">
                                            <h4 className="font-bold text-sm text-blue-900 mb-1">12. Modelo Chasis</h4>
                                            <p className="text-sm">{micData.campo_12_modelo_chasis || 'N/A'}</p>
                                        </div>
                                        <div className="border rounded p-3 bg-blue-50/30">
                                            <h4 className="font-bold text-sm text-blue-900 mb-1">13. Marca Chasis</h4>
                                            <p className="text-sm">{micData.campo_13_marca_chasis || 'N/A'}</p>
                                        </div>
                                        <div className="border rounded p-3 bg-blue-50/30">
                                            <h4 className="font-bold text-sm text-blue-900 mb-1">14. Nº Chasis</h4>
                                            <p className="text-sm font-mono text-xs">{micData.campo_14_numero_chasis || 'N/A'}</p>
                                        </div>
                                        <div className="border rounded p-3 bg-blue-50/30">
                                            <h4 className="font-bold text-sm text-blue-900 mb-1">15. Placa Semi</h4>
                                            <p className="text-sm font-mono font-bold">{micData.campo_15_placa_semi || 'N/A'}</p>
                                        </div>
                                        <div className="border rounded p-3 bg-blue-50/30">
                                            <h4 className="font-bold text-sm text-blue-900 mb-1">16. Marca Semi</h4>
                                            <p className="text-sm">{micData.campo_16_marca_semi || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sección 3: Valores y Pesos */}
                                <div className="border-2 border-purple-200 rounded-lg p-4">
                                    <h3 className="text-lg font-bold text-purple-800 mb-4 border-b border-purple-200 pb-2">💰 Valores y Medidas</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="border rounded p-3 bg-purple-50/30">
                                            <h4 className="font-bold text-sm text-purple-900 mb-1">16. Valor FOT</h4>
                                            <p className="text-lg font-mono font-bold text-purple-700">{formatNumber(micData.campo_27_valor_campo16)}</p>
                                        </div>
                                        <div className="border rounded p-3 bg-purple-50/30">
                                            <h4 className="font-bold text-sm text-purple-900 mb-1">28. Total Flete</h4>
                                            <p className="text-lg font-mono font-bold text-purple-700">{formatNumber(micData.campo_28_total)}</p>
                                        </div>
                                        <div className="border rounded p-3 bg-purple-50/30">
                                            <h4 className="font-bold text-sm text-purple-900 mb-1">Peso Total</h4>
                                            <p className="text-sm font-mono">{formatNumber(micData.campo_31_peso_bruto, 3)} kg</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sección 4: Mercadería */}
                                <div className="border-2 border-orange-200 rounded-lg p-4">
                                    <h3 className="text-lg font-bold text-orange-800 mb-4 border-b border-orange-200 pb-2">📦 Mercadería</h3>
                                    <div className="bg-orange-50/30 p-4 rounded border">
                                        <h4 className="font-bold text-sm text-orange-900 mb-2">11. Descripción</h4>
                                        <div className="bg-white p-3 rounded text-sm whitespace-pre-wrap border">
                                            {micData.campo_38_datos_campo11_crt || 'No especificado'}
                                        </div>
                                    </div>
                                </div>

                                {/* Sección 5: Países de Tránsito */}
                                <div className="border-2 border-teal-200 rounded-lg p-4">
                                    <h3 className="text-lg font-bold text-teal-800 mb-4 border-b border-teal-200 pb-2">🌎 Recorrido</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="border rounded p-3 bg-teal-50/30">
                                            <h4 className="font-bold text-sm text-teal-900 mb-1">19. País Exportación</h4>
                                            <p className="text-sm">{micData.campo_20_campo19_exportacion || 'N/A'}</p>
                                        </div>
                                        <div className="border rounded p-3 bg-teal-50/30">
                                            <h4 className="font-bold text-sm text-teal-900 mb-1">20. País Importación</h4>
                                            <p className="text-sm">{micData.campo_21_campo20_importacion || 'N/A'}</p>
                                        </div>
                                        <div className="border rounded p-3 bg-teal-50/30">
                                            <h4 className="font-bold text-sm text-teal-900 mb-1">21. Países Tránsito</h4>
                                            <p className="text-sm">{micData.campo_22_campo21_paises_transito || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sección 6: Chofer y Aduanas */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border-2 border-indigo-200 rounded-lg p-4">
                                        <h3 className="text-lg font-bold text-indigo-800 mb-3 border-b border-indigo-200 pb-2">👤 Chofer</h3>
                                        <div className="space-y-2">
                                            <div>
                                                <h4 className="text-xs font-bold text-indigo-700">Nombre</h4>
                                                <p className="text-sm">{micData.chofer || 'No especificado'}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-indigo-700">Documento</h4>
                                                <p className="text-sm font-mono">{micData.campo_18_documento_chofer || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-2 border-indigo-200 rounded-lg p-4">
                                        <h3 className="text-lg font-bold text-indigo-800 mb-3 border-b border-indigo-200 pb-2">🏛️ Aduanas</h3>
                                        <div className="space-y-2">
                                            <div>
                                                <h4 className="text-xs font-bold text-indigo-700">Salida</h4>
                                                <p className="text-sm">{micData.campo_24_aduana_salida || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-indigo-700">Destino</h4>
                                                <p className="text-sm">{micData.campo_25_aduana_destino || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Campo 40 - Observaciones */}
                                {micData.campo_40_observaciones && (
                                    <div className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
                                        <h3 className="text-lg font-bold text-slate-800 mb-3">📝 Observaciones</h3>
                                        <div className="bg-white p-4 rounded text-sm whitespace-pre-wrap border">
                                            {micData.campo_40_observaciones}
                                        </div>
                                    </div>
                                )}
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
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                    >
                        <FileText className="w-4 h-4" />
                        <span>Descargar PDF</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MICPreview;
