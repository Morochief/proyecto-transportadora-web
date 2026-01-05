import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import api from '../api/api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="bg-slate-800 p-8 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Mail className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Recuperar Contraseña</h2>
          <p className="text-slate-400 text-sm mt-1">Te enviaremos un enlace de recuperación</p>
        </div>

        <div className="p-8">
          {sent ? (
            <div className="text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <Send className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">¡Correo enviado!</h3>
                <p className="text-slate-600 text-sm mt-2">Revisa tu bandeja de entrada (y spam) para encontrar el enlace de restablecimiento.</p>
              </div>
              <Link to="/login" className="block w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors">Volver al Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Correo Electrónico</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                    placeholder="ejemplo@empresa.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar Enlace'}
              </button>

              <div className="text-center mt-6">
                <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 group">
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
