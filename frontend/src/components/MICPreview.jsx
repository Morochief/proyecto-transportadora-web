import React, { useState } from 'react';
import { FileText, Download, X, Eye, Loader2 } from 'lucide-react';

const MICPreview = ({ micData, onClose, onDownloadPDF, isOpen }) => {
    const [loading, setLoading] = useState(true);

    if (!isOpen || !micData) return null;

    const pdfUrl = `http://localhost:5000/api/mic-guardados/${micData.id}/pdf`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-3">
                        <Eye className="w-6 h-6" />
                        <div>
                            <h2 className="text-xl font-bold">Vista Previa MIC/DTA</h2>
                            <p className="text-emerald-100 text-sm">Nº: {micData.campo_23_numero_campo2_crt || 'Sin asignar'}</p>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={onDownloadPDF}
                            className="bg-white text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-50 transition-colors flex items-center space-x-2 text-sm font-medium"
                        >
                            <Download className="w-4 h-4" />
                            <span>Descargar PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* PDF Viewer */}
                <div className="flex-1 relative bg-gray-100">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                            <div className="text-center">
                                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-emerald-600" />
                                <p className="text-slate-600">Cargando PDF...</p>
                            </div>
                        </div>
                    )}
                    <iframe
                        src={pdfUrl}
                        className="w-full h-full border-0"
                        title="Vista Previa MIC PDF"
                        onLoad={() => setLoading(false)}
                    />
                </div>

                {/* Footer */}
                <div className="bg-gray-50 border-t p-4 flex justify-between items-center shrink-0">
                    <p className="text-sm text-slate-600">
                        <FileText className="w-4 h-4 inline mr-2" />
                        Documento PDF generado del sistema
                    </p>
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                            Cerrar
                        </button>
                        <button
                            onClick={onDownloadPDF}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2 text-sm font-medium"
                        >
                            <Download className="w-4 h-4" />
                            <span>Descargar</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MICPreview;
