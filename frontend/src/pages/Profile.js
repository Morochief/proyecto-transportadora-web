import React, { useEffect, useState } from 'react';

import api from '../api/api';
import useAuthStore from '../store/authStore';
import { login as storeLogin } from '../utils/auth';

function Profile() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState({ current: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [mfaData, setMfaData] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/auth/me');
        setProfile(response.data);
        const session = useAuthStore.getState();
        storeLogin({
          user: response.data,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        });
      } catch (err) {
        setError('No se pudo obtener el perfil');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.post('/auth/change-password', {
        current_password: passwords.current,
        new_password: passwords.newPassword,
      });
      setPasswords({ current: '', newPassword: '' });
      setMessage('Clave actualizada');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar la clave');
    }
  };

  const handleEnrollMfa = async () => {
    setError('');
    try {
      const response = await api.post('/auth/mfa/enroll');
      setMfaData(response.data);
      setMessage('Escanea el codigo y confirma con el TOTP');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo iniciar MFA');
    }
  };

  const handleVerifyMfa = async () => {
    setError('');
    try {
      await api.post('/auth/mfa/verify', { code: mfaCode });
      setMessage('MFA habilitado');
      setMfaData(null);
      setMfaCode('');
      const response = await api.get('/auth/me');
      setProfile(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Codigo MFA invalido');
    }
  };

  const handleDisableMfa = async () => {
    setError('');
    try {
      await api.post('/auth/mfa/disable');
      setMessage('MFA deshabilitado');
      const response = await api.get('/auth/me');
      setProfile(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo deshabilitar MFA');
    }
  };

  if (loading) {
    return <div className="auth-card">Cargando...</div>;
  }

  return (
    <div className="profile-page">
      <h2>Perfil</h2>
      {profile && (
        <div className="profile-card">
          <p><strong>Nombre:</strong> {profile.display_name || profile.usuario}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Roles:</strong> {profile.roles?.join(', ')}</p>
          <p><strong>MFA:</strong> {profile.mfa_enabled ? 'Habilitado' : 'Deshabilitado'}</p>
        </div>
      )}

      <section className="profile-section">
        <h3>Cambiar clave</h3>
        <form onSubmit={handlePasswordChange}>
          <input
            type="password"
            placeholder="Clave actual"
            value={passwords.current}
            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Nueva clave"
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            required
          />
          <button type="submit">Actualizar</button>
        </form>
      </section>

      <section className="profile-section">
        <h3>Multi Factor</h3>
        {profile?.mfa_enabled ? (
          <button onClick={handleDisableMfa}>Deshabilitar MFA</button>
        ) : (
          <button onClick={handleEnrollMfa}>Habilitar MFA</button>
        )}
        {mfaData && (
          <div className="mfa-enroll">
            <p>Escanea este secreto en tu app TOTP:</p>
            <code>{mfaData.secret}</code>
            <p>URL: <span>{mfaData.otpauth_url}</span></p>
            <p>Codigos de respaldo:</p>
            <ul>
              {mfaData.backup_codes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
            <input
              type="text"
              placeholder="Codigo TOTP"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
            />
            <button onClick={handleVerifyMfa}>Confirmar MFA</button>
          </div>
        )}
      </section>

      {message && <div style={{ color: 'green' }}>{message}</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}

export default Profile;
