import React, { useState, useEffect } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import './ThemeToggle.css';

function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    // Get theme from localStorage or default to 'light'
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn"
      aria-label="Toggle theme"
      title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
    >
      {theme === 'light' ? (
        <FiMoon size={20} className="theme-icon" />
      ) : (
        <FiSun size={20} className="theme-icon" />
      )}
    </button>
  );
}

export default ThemeToggle;
