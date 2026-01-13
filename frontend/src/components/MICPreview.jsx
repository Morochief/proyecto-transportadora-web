import React from 'react';
import { FileText, Download, X, ExternalLink } from 'lucide-react';

const MICPreview = ({ micData, onClose, onDownloadPDF, isOpen }) => {
    if (!isOpen || !micData) return null;

    const pdfUrl = `http://localhost:5000/api/mic-guardados/${micData.id}/pdf?inline=true`;

    const abrirPDF = () => {
        window.open(pdfUrl, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <FileText className="w-8 h-8" />
                        <div>
                            <h2 className="text-xl font-bold">Vista Previa MIC/DTA</h2>
                            <p className="text-emerald-100 text-sm">Nº: {micData.campo_23_numero_campo2_crt || 'Sin asignar'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                        title="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Documento MIC/DTA Listo</h3>
                        <p className="text-slate-600 text-sm">
                            El PDF se abrirá en una nueva pestaña de tu navegador
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={abrirPDF}
                            className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2 font-medium text-lg shadow-md"
                        >
                            <ExternalLink className="w-5 h-5" />
                            <span>Abrir PDF en Nueva Pestaña</span>
                        </button>

                        <button
                            onClick={onDownloadPDF}
                            className="w-full px-6 py-3 bg-white border-2 border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center space-x-2 font-medium"
                        >
                            <Download className="w-5 h-5" />
                            <span>Descargar PDF</span>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 border-t p-4 text-center">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MICPreview;
