import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { isLoggedIn, logout } from "../utils/auth";
import {
  FaHome,
  FaUser,
  FaGlobe,
  FaCity,
  FaTruck,
  FaDollarSign,
  FaMoneyCheckAlt,
  FaFileAlt,
  FaCogs,
  FaFilePdf,
} from "react-icons/fa";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  //if (!isLoggedIn()) return null;

  const activeClass = (path) =>
    location.pathname.startsWith(path) ? "font-bold underline" : "";

  return (
    <nav className="bg-indigo-800 text-white px-6 py-3 flex items-center gap-4 flex-wrap">
      <Link
        to="/"
        className={`${activeClass(
          "/"
        )} flex items-center gap-1 hover:text-yellow-300`}
      >
        <FaHome /> Dashboard
      </Link>
      <Link
        to="/usuarios"
        className={`${activeClass(
          "/usuarios"
        )} flex items-center gap-1 hover:text-yellow-300`}
      >
        <FaUser /> Usuarios
      </Link>
      <Link
        to="/paises"
        className={`${activeClass(
          "/paises"
        )} flex items-center gap-1 hover:text-yellow-300`}
      >
        <FaGlobe /> Países
      </Link>
      <Link
        to="/ciudades"
        className={`${activeClass(
          "/ciudades"
        )} flex items-center gap-1 hover:text-yellow-300`}
      >
        <FaCity /> Ciudades
      </Link>
      <Link
        to="/remitentes"
        className={`${activeClass(
          "/remitentes"
        )} flex items-center gap-1 hover:text-yellow-300`}
      >
        <FaUser /> Remitentes
      </Link>
      <Link
        to="/transportadoras"
        className={`${activeClass(
          "/transportadoras"
        )} flex items-center gap-1 hover:text-yellow-300`}
      >
        <FaTruck /> Transportadoras
      </Link>
      <Link
        to="/crt"
        className={`${activeClass(
          "/crt"
        )} flex items-center gap-1 text-yellow-300 bg-indigo-900 px-3 py-1 rounded`}
      >
        <FaFilePdf /> CRT
      </Link>
      <Link
        to="/monedas"
        className={`${activeClass(
          "/monedas"
        )} flex items-center gap-1 hover:text-yellow-300`}
      >
        <FaDollarSign /> Monedas
      </Link>
      <Link
        to="/honorarios"
        className={`${activeClass(
          "/honorarios"
        )} flex items-center gap-1 hover:text-yellow-300`}
      >
        <FaMoneyCheckAlt /> Honorarios
      </Link>
      <span
        onClick={handleLogout}
        className="ml-auto cursor-pointer hover:text-red-300"
      >
        Cerrar sesión
      </span>
    </nav>
  );
}

export default Navbar;
