import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/api';
import useAuthStore from '../store/authStore';
import { login as storeLogin } from '../utils/auth';
import PasswordStrength from '../components/PasswordStrength';
import { User, Mail, Shield, Clock, Lock, Smartphone, CheckCircle, AlertTriangle, XCircle, Activity, Globe, Monitor } from 'lucide-react';

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
    type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
      type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
        'bg-blue-50 text-blue-800 border-blue-200';

  return (
    <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg border shadow-lg flex items-center gap-3 ${styles} animate-in slide-in-from-right duration-300`}>
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
    </div>
  );
};

function Profile() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState({ current: '', newPassword: '' });
  const [toast, setToast] = useState(null);
  const [mfaData, setMfaData] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [passwordPolicy, setPasswordPolicy] = useState(null);
  const [loginAttempts, setLoginAttempts] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, policyRes, attemptsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/security/password-policy'),
          api.get('/security/login-attempts'),
        ]);
        setProfile(profileRes.data);
        setPasswordPolicy(policyRes.data);
        setLoginAttempts(attemptsRes.data);
        const session = useAuthStore.getState();
        storeLogin({
          user: profileRes.data,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        });
      } catch (err) {
        showToast('No se pudo obtener el perfil', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    try {
      await api.post('/auth/change-password', {
        current_password: passwords.current,
        new_password: passwords.newPassword,
      });
      setPasswords({ current: '', newPassword: '' });
      showToast('Contraseña actualizada exitosamente', 'success');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'No se pudo actualizar la contraseña';
      const details = err.response?.data?.details;
      showToast(details ? `${errorMsg}: ${details.join(', ')}` : errorMsg, 'error');
    }
  };

  const handleEnrollMfa = async () => {
    try {
      const response = await api.post('/auth/mfa/enroll');
      setMfaData(response.data);
      showToast('Escanea el código QR y confirma con el código TOTP', 'info');
    } catch (err) {
      showToast(err.response?.data?.error || 'No se pudo iniciar MFA', 'error');
    }
  };

  const handleVerifyMfa = async () => {
    try {
      await api.post('/auth/mfa/verify', { code: mfaCode });
      setMfaData(null);
      setMfaCode('');
      const response = await api.get('/auth/me');
      setProfile(response.data);
      showToast('MFA habilitado exitosamente', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Código MFA inválido', 'error');
    }
  };

  const handleDisableMfa = async () => {
    if (!window.confirm('¿Está seguro de deshabilitar MFA? Esto reducirá la seguridad de su cuenta.')) {
      return;
    }
    try {
      await api.post('/auth/mfa/disable');
      const response = await api.get('/auth/me');
      setProfile(response.data);
      showToast('MFA deshabilitado', 'warning');
    } catch (err) {
      showToast(err.response?.data?.error || 'No se pudo deshabilitar MFA', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando perfil...</div>;
  }

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-500">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Mi Perfil</h1>
        <p className="text-slate-500 mt-1">Gestiona tu información personal y seguridad de la cuenta.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Personal Info & Activity */}
        <div className="space-y-8 lg:col-span-2">

          {/* Personal Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-800">Información Personal</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Nombre Completo</div>
                  <div className="text-lg font-medium text-slate-900">{profile.display_name || profile.usuario}</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Correo Electrónico</div>
                  <div className="text-lg font-medium text-slate-900">{profile.email}</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Roles</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.roles?.map(role => (
                      <span key={role} className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 capitalize">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Último Acceso</div>
                  <div className="text-lg font-medium text-slate-900">{formatDate(profile.last_login_at)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-800">Actividad Reciente</h3>
            </div>
            <div className="divide-y divide-slate-200">
              {loginAttempts.length > 0 ? (
                loginAttempts.slice(0, 5).map((attempt, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${attempt.success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {attempt.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">Inicio de sesión {attempt.success ? 'exitoso' : 'fallido'}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {attempt.user_agent ? attempt.user_agent.split(' ')[0] : 'Unknown'}</span>
                          <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {attempt.ip}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(attempt.created_at)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500 text-sm">No hay intentos de acceso recientes.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Security */}
        <div className="space-y-8">

          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-800">Seguridad</h3>
            </div>
            <div className="p-6 space-y-6">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <h4 className="text-sm font-medium text-slate-700">Cambiar Contraseña</h4>
                <div className="space-y-3">
                  <div>
                    <input
                      type="password"
                      placeholder="Contraseña actual"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="Nueva contraseña"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                    {passwords.newPassword && passwordPolicy && <div className="mt-2"><PasswordStrength password={passwords.newPassword} policy={passwordPolicy} /></div>}
                  </div>
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium">
                  Actualizar Contraseña
                </button>
              </form>

              <div className="border-t border-slate-200 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    2FA (MFA)
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${profile.mfa_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {profile.mfa_enabled ? 'Activado' : 'Desactivado'}
                  </span>
                </div>

                {profile.mfa_enabled ? (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-500 bg-emerald-50 p-3 rounded border border-emerald-100 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>La autenticación de dos factores está activa. Tu cuenta está más segura.</span>
                    </div>
                    <button onClick={handleDisableMfa} className="w-full border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 py-2 rounded-lg transition-colors text-sm font-medium">
                      Desactivar MFA
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-500 bg-amber-50 p-3 rounded border border-amber-100 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>Se recomienda activar el doble factor de autenticación para mejorar la seguridad.</span>
                    </div>
                    {!mfaData ? (
                      <button onClick={handleEnrollMfa} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                        Activar MFA
                      </button>
                    ) : (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex justify-center bg-white p-2 rounded border border-slate-200">
                          <QRCodeSVG value={mfaData.otpauth_url} size={150} level="H" />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-xs text-slate-500">Escanea el QR o usa este código:</p>
                          <code className="text-xs font-mono bg-slate-200 px-2 py-1 rounded block w-full text-center break-all">{mfaData.secret}</code>
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Código de 6 dígitos"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-center tracking-widest font-mono"
                          />
                          <button onClick={handleVerifyMfa} disabled={mfaCode.length !== 6} className="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
                            Confirmar
                          </button>
                        </div>
                        <div className="text-xs text-slate-400">
                          Guarda estos códigos de respaldo:
                          <div className="grid grid-cols-2 gap-1 mt-1 font-mono text-[10px]">
                            {mfaData.backup_codes.slice(0, 4).map(c => <span key={c}>{c}</span>)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
