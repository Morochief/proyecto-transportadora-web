import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

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
      const payload = {
        identifier,
        password,
      };
      if (mfaRequired) {
        if (mfaCode) {
          payload.mfa_code = mfaCode;
        }
        if (backupCode) {
          payload.backup_code = backupCode;
        }
      }
      const response = await api.post('/auth/login', payload);
      if (response.data?.mfa_required) {
        setMfaRequired(true);
        setMfaMethods(response.data.methods || {});
        setError('Se requiere codigo MFA');
        return;
      }
      const { access_token: accessToken, refresh_token: refreshToken, user } = response.data;
      storeLogin({ user, accessToken, refreshToken });
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('No se pudo iniciar sesion');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Iniciar sesión</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Email o usuario"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Clave"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {mfaRequired && (
          <div className="login-mfa-section">
            {mfaMethods.totp && (
              <input
                type="text"
                placeholder="Código TOTP"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
              />
            )}
            {mfaMethods.backup && (
              <input
                type="text"
                placeholder="Código de respaldo"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
              />
            )}
          </div>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Verificando...' : 'Ingresar'}
        </button>
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <Link to="/forgot-password">¿Olvidaste tu clave?</Link>
        </div>
        {error && <div className="login-error">{error}</div>}
      </form>
    </div>
  );
}

export default Login;
