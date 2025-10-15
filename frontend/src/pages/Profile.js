import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import api from '../api/api';
import useAuthStore from '../store/authStore';
import { login as storeLogin } from '../utils/auth';
import Toast from '../components/Toast';
import PasswordStrength from '../components/PasswordStrength';
import '../styles/Profile.css';

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
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="auth-card">Cargando...</div>;
  }

  return (
    <div className="profile-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <h2>Mi Perfil</h2>
      
      {profile && (
        <div className="profile-grid">
          <div className="profile-card">
            <h3>Información Personal</h3>
            <div className="info-row">
              <span className="label">Nombre:</span>
              <span className="value">{profile.display_name || profile.usuario}</span>
            </div>
            <div className="info-row">
              <span className="label">Email:</span>
              <span className="value">{profile.email}</span>
            </div>
            <div className="info-row">
              <span className="label">Roles:</span>
              <span className="value">
                {profile.roles?.map(role => (
                  <span key={role} className="role-badge">{role}</span>
                ))}
              </span>
            </div>
            <div className="info-row">
              <span className="label">MFA:</span>
              <span className="value">
                <span className={`status-badge ${profile.mfa_enabled ? 'enabled' : 'disabled'}`}>
                  {profile.mfa_enabled ? '✓ Habilitado' : '✕ Deshabilitado'}
                </span>
              </span>
            </div>
            <div className="info-row">
              <span className="label">Último acceso:</span>
              <span className="value">{formatDate(profile.last_login_at)}</span>
            </div>
          </div>

          <div className="profile-card">
            <h3>Actividad Reciente</h3>
            <div className="login-attempts">
              {loginAttempts.length > 0 ? (
                <div className="attempts-list">
                  {loginAttempts.slice(0, 5).map((attempt, idx) => (
                    <div key={idx} className={`attempt-item ${attempt.success ? 'success' : 'failed'}`}>
                      <span className="attempt-icon">
                        {attempt.success ? '✓' : '✕'}
                      </span>
                      <div className="attempt-details">
                        <div className="attempt-time">{formatDate(attempt.created_at)}</div>
                        <div className="attempt-info">
                          {attempt.ip} • {attempt.user_agent?.substring(0, 40)}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No hay intentos de acceso recientes</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="security-sections">
        <section className="profile-section">
          <h3>Cambiar Contraseña</h3>
          <form onSubmit={handlePasswordChange} className="password-form">
            <div className="form-group">
              <label>Contraseña Actual</label>
              <input
                type="password"
                placeholder="Ingrese su contraseña actual"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Nueva Contraseña</label>
              <input
                type="password"
                placeholder="Ingrese su nueva contraseña"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                required
              />
              <PasswordStrength password={passwords.newPassword} policy={passwordPolicy} />
            </div>
            <button type="submit" className="btn-primary">Actualizar Contraseña</button>
          </form>
        </section>

        <section className="profile-section">
          <h3>Autenticación Multi-Factor (MFA)</h3>
          <p className="section-description">
            La autenticación de dos factores añade una capa adicional de seguridad a su cuenta.
          </p>
          {profile?.mfa_enabled ? (
            <div className="mfa-enabled">
              <div className="status-message success">
                ✓ MFA está actualmente habilitado en su cuenta
              </div>
              <button onClick={handleDisableMfa} className="btn-danger">Deshabilitar MFA</button>
            </div>
          ) : (
            <div className="mfa-disabled">
              <div className="status-message warning">
                ⚠ Su cuenta no tiene MFA habilitado. Se recomienda activarlo.
              </div>
              <button onClick={handleEnrollMfa} className="btn-primary">Habilitar MFA</button>
            </div>
          )}
          
          {mfaData && (
            <div className="mfa-enroll-card">
              <h4>Configurar MFA</h4>
              <div className="mfa-steps">
                <div className="mfa-step">
                  <span className="step-number">1</span>
                  <div className="step-content">
                    <p>Escanea este código QR con tu aplicación de autenticación:</p>
                    <div className="qr-code-container">
                      <QRCodeSVG 
                        value={mfaData.otpauth_url} 
                        size={200}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <p className="qr-alternative">O ingresa manualmente este código secreto:</p>
                    <div className="secret-box">
                      <code>{mfaData.secret}</code>
                    </div>
                  </div>
                </div>
                
                <div className="mfa-step">
                  <span className="step-number">2</span>
                  <div className="step-content">
                    <p>Guarda estos códigos de respaldo en un lugar seguro:</p>
                    <div className="backup-codes">
                      {mfaData.backup_codes.map((code, idx) => (
                        <span key={idx} className="backup-code">{code}</span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mfa-step">
                  <span className="step-number">3</span>
                  <div className="step-content">
                    <p>Ingresa el código de 6 dígitos de tu aplicación:</p>
                    <div className="verify-form">
                      <input
                        type="text"
                        placeholder="000000"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                        maxLength="6"
                        className="mfa-code-input"
                      />
                      <button onClick={handleVerifyMfa} className="btn-primary" disabled={mfaCode.length !== 6}>
                        Confirmar MFA
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Profile;
