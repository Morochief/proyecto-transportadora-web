import React, { useState } from "react";

export function useConfirm() {
  const [promise, setPromise] = useState(null);

  const confirm = () => new Promise((resolve) => {
    setPromise({ resolve });
  });

  const handleClose = () => {
    setPromise(null);
  };

  const handleConfirm = () => {
    promise?.resolve(true);
    handleClose();
  };

  const handleCancel = () => {
    promise?.resolve(false);
    handleClose();
  };

  const ConfirmationDialog = ({ title = "Confirmación", message = "¿Está seguro?" }) => {
    if (!promise) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          </div>
          <div className="p-6 text-sm text-slate-600 bg-white">
            {message}
          </div>
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
            <button onClick={handleCancel} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-white text-slate-700 font-medium transition-colors">Cancelar</button>
            <button onClick={handleConfirm} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors">Confirmar</button>
          </div>
        </div>
      </div>
    );
  };

  return [ConfirmationDialog, confirm];
}
