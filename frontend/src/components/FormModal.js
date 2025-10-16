import React, { useState, useEffect } from "react";
import { FiX, FiSave, FiUserPlus } from 'react-icons/fi';

function FormModal({ open, onClose, onSubmit, initialValues, fields, title, error }) {
  const [formData, setFormData] = useState(initialValues || {});
  const editUser = initialValues && initialValues.id; // Check if editing

  useEffect(() => {
    setFormData(initialValues || {});
  }, [initialValues]);

  if (!open) return null;

  const disabled = fields.some(
    (f) => f.required && (!formData[f.name] || formData[f.name] === "")
  );

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-8 min-w-[400px] max-w-[600px] shadow-2xl transform transition-all"
        style={{
          animation: 'slideIn 0.3s ease-out',
        }}
      >
        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
        
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <FiX size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 px-5 py-4 rounded-lg mb-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <span className="font-semibold">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm mb-2 font-semibold text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.type === "select" ? (
                <select
                  name={field.name}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  required={field.required ? true : undefined}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                >
                  <option value="">
                    {field.placeholder || `---Seleccionar ${field.label}---`}
                  </option>
                  {field.options &&
                    field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  type={field.type || "text"}
                  name={field.name}
                  value={formData[field.name] || ""}
                  onChange={handleChange}
                  required={field.required ? true : undefined}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                  placeholder={field.placeholder || `Ingrese ${field.label.toLowerCase()}`}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={disabled}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              {editUser ? (
                <>
                  <FiSave size={18} />
                  Actualizar
                </>
              ) : (
                <>
                  <FiUserPlus size={18} />
                  Crear
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormModal;
