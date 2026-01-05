import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle, ArrowRight } from 'lucide-react';
import api from '../api/api';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 font-bold text-2xl">!</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Enlace Inválido</h2>
          <p className="text-slate-500 mb-6">El enlace de recuperación es inválido o ha expirado.</p>
          <Link to="/forgot-password" className="text-indigo-600 font-bold hover:underline">Solicitar nuevo enlace</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo restablecer la clave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        <div className="bg-indigo-700 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            {done ? <CheckCircle className="w-8 h-8 text-white" /> : <Lock className="w-8 h-8 text-white" />}
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{done ? '¡Contraseña Actualizada!' : 'Nueva Contraseña'}</h2>
        </div>

        <div className="p-8">
          {done ? (
            <div className="text-center space-y-6">
              <p className="text-slate-600">Tu contraseña ha sido actualizada correctamente. Ya puedes acceder a tu cuenta.</p>
              <Link to="/login" className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-lg">
                Iniciar Sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Nueva Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
              >
                {loading ? 'Guardando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
