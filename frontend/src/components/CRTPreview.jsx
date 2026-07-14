import React from 'react';
import { FileText, Download, X, ExternalLink } from 'lucide-react';
import api from '../api/api';

const CRTPreview = ({ crtData, onClose, onDownloadPDF, isOpen }) => {
    if (!isOpen || !crtData) return null;

    const abrirPDF = () => {
        api.post(`/crts/${crtData.id}/pdf`, {}, { responseType: 'blob' })
            .then(res => {
                const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                window.open(url, '_blank');
            })
            .catch(err => console.error('Error abriendo PDF:', err));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <FileText className="w-8 h-8" />
                        <div>
                            <h2 className="text-xl font-bold">Vista Previa CRT</h2>
                            <p className="text-blue-100 text-sm">Nº: {crtData.numero_crt || 'Sin asignar'}</p>
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
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-10 h-10 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Documento CRT Listo</h3>
                        <p className="text-slate-600 text-sm">
                            El PDF se abrirá en una nueva pestaña de tu navegador
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={abrirPDF}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium text-lg shadow-md"
                        >
                            <ExternalLink className="w-5 h-5" />
                            <span>Abrir PDF en Nueva Pestaña</span>
                        </button>

                        <button
                            onClick={onDownloadPDF}
                            className="w-full px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2 font-medium"
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

export default CRTPreview;