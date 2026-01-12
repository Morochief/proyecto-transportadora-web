import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import api from '../api/api';
import { login as storeLogin } from '../utils/auth';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaMethods, setMfaMethods] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { identifier, password };
      if (mfaRequired) {
        if (mfaCode) payload.mfa_code = mfaCode;
        if (backupCode) payload.backup_code = backupCode;
      }

      const response = await api.post('/auth/login', payload);

      if (response.data?.mfa_required) {
        setMfaRequired(true);
        setMfaMethods(response.data.methods || {});
        setError(''); // Clear previous errors if we moved to MFA step
        setLoading(false); // Stop loading to let user input MFA
        return;
      }

      const { access_token: accessToken, user } = response.data;
      storeLogin({ user, accessToken });
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('No se pudo iniciar sesión. Verifique sus credenciales.');
      }
    } finally {
      if (!mfaRequired || (mfaRequired && (mfaCode || backupCode))) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Header Section */}
        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600 to-blue-700 opacity-90"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Bienvenido</h2>
            <p className="text-white/80 text-sm mt-1">Inicia sesión para continuar</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-start gap-2 animate-in slide-in-from-top-2">
                <div className="mt-0.5"><ShieldCheck className="w-4 h-4" /></div>
                <span>{error}</span>
              </div>
            )}

            {!mfaRequired ? (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario / Email</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                      placeholder="Ingresa tu usuario"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Contraseña</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-blue-600" />
                  <div>
                    <h4 className="font-bold text-sm">Verificación de Dos Pasos</h4>
                    <p className="text-xs opacity-80">Tu cuenta está protegida. Ingresa el código.</p>
                  </div>
                </div>

                {mfaMethods.totp && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Código Authenticator (TOTP)</label>
                    <input
                      type="text"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center text-lg tracking-widest font-mono"
                      placeholder="000 000"
                      autoFocus
                    />
                  </div>
                )}

                {mfaMethods.backup && !mfaCode && (
                  <div className="space-y-1 pt-2">
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase">O usa un código de respaldo</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>
                    <input
                      type="text"
                      value={backupCode}
                      onChange={(e) => setBackupCode(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center text-sm"
                      placeholder="Código de respaldo"
                    />
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>{mfaRequired ? 'Verificar Código' : 'Iniciar Sesión'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {!mfaRequired && (
              <div className="text-center mt-6">
                <Link to="/forgot-password" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1 group">
                  <KeyRound className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="mt-8 text-center text-slate-400 text-xs">
        <p>&copy; {new Date().getFullYear()} Proyecto Transportadora</p>
        <p className="mt-1">Sistema de Gestión de Carga Internacional</p>
      </div>
    </div>
  );
}

export default Login;
