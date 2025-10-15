import React from 'react';
import '../styles/PasswordStrength.css';

const PasswordStrength = ({ password, policy }) => {
  const calculateStrength = () => {
    if (!password) return { score: 0, label: '', percentage: 0 };

    let score = 0;
    const checks = {
      length: password.length >= (policy?.min_length || 8),
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      digit: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    if (checks.length) score += 20;
    if (checks.uppercase) score += 20;
    if (checks.lowercase) score += 20;
    if (checks.digit) score += 20;
    if (checks.special) score += 20;

    // Bonus for extra length
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    score = Math.min(100, score);

    let label = 'Muy débil';
    let color = '#ef4444';
    
    if (score >= 80) {
      label = 'Muy fuerte';
      color = '#10b981';
    } else if (score >= 60) {
      label = 'Fuerte';
      color = '#22c55e';
    } else if (score >= 40) {
      label = 'Media';
      color = '#f59e0b';
    } else if (score >= 20) {
      label = 'Débil';
      color = '#f97316';
    }

    return { score, label, percentage: score, color, checks };
  };

  const { score, label, percentage, color, checks } = calculateStrength();

  if (!password) return null;

  return (
    <div className="password-strength-container">
      <div className="strength-bar">
        <div
          className="strength-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div className="strength-label" style={{ color }}>
        {label}
      </div>
      <div className="password-requirements">
        <div className={`requirement ${checks?.length ? 'met' : ''}`}>
          {checks?.length ? '✓' : '○'} {policy?.min_length || 8}+ caracteres
        </div>
        {policy?.require_uppercase && (
          <div className={`requirement ${checks?.uppercase ? 'met' : ''}`}>
            {checks?.uppercase ? '✓' : '○'} Mayúsculas
          </div>
        )}
        {policy?.require_lowercase && (
          <div className={`requirement ${checks?.lowercase ? 'met' : ''}`}>
            {checks?.lowercase ? '✓' : '○'} Minúsculas
          </div>
        )}
        {policy?.require_digit && (
          <div className={`requirement ${checks?.digit ? 'met' : ''}`}>
            {checks?.digit ? '✓' : '○'} Números
          </div>
        )}
        {policy?.require_special && (
          <div className={`requirement ${checks?.special ? 'met' : ''}`}>
            {checks?.special ? '✓' : '○'} Caracteres especiales
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordStrength;
