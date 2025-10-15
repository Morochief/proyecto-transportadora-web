import React, { useState } from 'react';

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

  if (sent) {
    return (
      <div className="auth-card">
        <h2>Revisa tu correo</h2>
        <p>Hemos enviado un enlace para restablecer tu clave.</p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h2>Recuperar clave</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar enlace'}
        </button>
        {error && <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>}
      </form>
    </div>
  );
}

export default ForgotPassword;
