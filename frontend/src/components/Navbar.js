import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaCity, FaDollarSign, FaFilePdf, FaGlobe, FaHome, FaMoneyCheckAlt, FaTruck, FaUser } from 'react-icons/fa';

import useAuthStore from '../store/authStore';
import { isLoggedIn, logout, onAuthChange } from '../utils/auth';

const navLinkClass = (isActive, extra = '') => {
  const base = 'flex items-center gap-1 hover:text-yellow-300';
  return [base, isActive, extra].filter(Boolean).join(' ');
};

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());

  useEffect(() => onAuthChange(setLoggedIn), []);

  if (!loggedIn) {
    return null;
  }

  const isAdmin = (user?.roles || []).includes('admin');

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
    navigate('/login', { replace: true });
  };

  const activeClass = (path) => (location.pathname.startsWith(path) ? 'font-bold underline' : '');

  return (
    <nav className="bg-indigo-800 text-white px-6 py-3 flex items-center gap-4 flex-wrap">
      <Link to="/" className={navLinkClass(activeClass('/'))}>
        <FaHome /> Dashboard
      </Link>
      {isAdmin && (
        <Link to="/usuarios" className={navLinkClass(activeClass('/usuarios'))}>
          <FaUser /> Usuarios
        </Link>
      )}
      <Link to="/perfil" className={navLinkClass(activeClass('/perfil'))}>
        <FaUser /> Perfil
      </Link>
      <Link to="/paises" className={navLinkClass(activeClass('/paises'))}>
        <FaGlobe /> Paises
      </Link>
      <Link to="/ciudades" className={navLinkClass(activeClass('/ciudades'))}>
        <FaCity /> Ciudades
      </Link>
      <Link to="/remitentes" className={navLinkClass(activeClass('/remitentes'))}>
        <FaUser /> Remitentes
      </Link>
      <Link to="/transportadoras" className={navLinkClass(activeClass('/transportadoras'))}>
        <FaTruck /> Transportadoras
      </Link>
      <Link
        to="/crt"
        className={navLinkClass(activeClass('/crt'), 'text-yellow-300 bg-indigo-900 px-3 py-1 rounded')}
      >
        <FaFilePdf /> CRT
      </Link>
      <Link to="/monedas" className={navLinkClass(activeClass('/monedas'))}>
        <FaDollarSign /> Monedas
      </Link>
      <Link to="/honorarios" className={navLinkClass(activeClass('/honorarios'))}>
        <FaMoneyCheckAlt /> Honorarios
      </Link>
      <span onClick={handleLogout} className="ml-auto cursor-pointer hover:text-red-300">
        Cerrar sesion
      </span>
    </nav>
  );
}

export default Navbar;
