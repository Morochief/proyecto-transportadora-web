import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

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
    return <div className="auth-card">Token invalido</div>;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirm) {
      setError('Las claves no coinciden');
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

  if (done) {
    return (
      <div className="auth-card">
        <h2>Clave actualizada</h2>
        <p>Ya puedes iniciar sesion con tu nueva clave.</p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h2>Restablecer clave</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Nueva clave"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirmar clave"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Actualizando...' : 'Guardar clave'}
        </button>
        {error && <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>}
      </form>
    </div>
  );
}

export default ResetPassword;
