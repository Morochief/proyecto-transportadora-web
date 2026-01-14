import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Users,
  UserCircle,
  Globe2,
  Building2,
  Truck,
  FileText,
  Coins,
  Wallet,
  ShieldCheck,
  History,
  LogOut,
  Contact,
  Menu,
  X,
  ChevronDown,
  FolderOpen,
  Settings
} from 'lucide-react';

import useAuthStore from '../store/authStore';
import { isLoggedIn, logout, onAuthChange } from '../utils/auth';

// Componente Dropdown reutilizable
function NavDropdown({ label, icon: Icon, items, isActive }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Verificar si algún ítem del dropdown está activo
  const hasActiveChild = items.some(item => location.pathname === item.path);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
          ${hasActiveChild
            ? 'text-white bg-slate-800'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
          }`}
      >
        <Icon className={`w-4 h-4 ${hasActiveChild ? 'text-indigo-400' : 'text-slate-400'}`} />
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50"
          >
            {items.map((item) => {
              const ItemIcon = item.icon;
              const isItemActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors
                    ${isItemActive
                      ? 'bg-indigo-600/20 text-indigo-300'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                  <ItemIcon className={`w-4 h-4 ${isItemActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => onAuthChange(setLoggedIn), []);

  if (!loggedIn) return null;

  const isAdmin = (user?.roles || []).includes('admin');

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
    navigate('/login', { replace: true });
  };

  // ITEMS PRINCIPALES (siempre visibles)
  const mainItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/crt', label: 'Nuevo CRT', icon: FileText, highlight: true },
    { path: '/listar-crt', label: 'Historial CRT', icon: History },
  ];

  // CATÁLOGOS (dropdown)
  const catalogItems = [
    { path: '/paises', label: 'Países', icon: Globe2 },
    { path: '/ciudades', label: 'Ciudades', icon: Building2 },
    { path: '/remitentes', label: 'Remitentes', icon: Contact },
    { path: '/transportadoras', label: 'Transportadoras', icon: Truck },
    { path: '/aduanas', label: 'Aduanas', icon: Building2 },
    { path: '/monedas', label: 'Monedas', icon: Coins },
  ];

  // ADMINISTRACIÓN (dropdown, solo admin)
  const adminItems = [
    { path: '/usuarios', label: 'Usuarios', icon: Users },
    { path: '/sesiones', label: 'Sesiones', icon: ShieldCheck },
    { path: '/audit-logs', label: 'Auditoría', icon: History },
    { path: '/honorarios', label: 'Honorarios', icon: Wallet },
    { path: '/mics-guardados', label: 'MICs Guardados', icon: FileText },
  ];

  // Todos los items para el menú móvil
  const allMobileItems = [
    ...mainItems,
    ...catalogItems,
    ...(isAdmin ? adminItems : []),
    { path: '/perfil', label: 'Perfil', icon: UserCircle },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-indigo-500/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200 hidden xl:block">
              Logística
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {/* Items principales */}
            {mainItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-1.5
                    ${item.highlight
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/30'
                      : isActive
                        ? 'text-white bg-slate-800'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}

            {/* Dropdown Catálogos */}
            <NavDropdown
              label="Catálogos"
              icon={FolderOpen}
              items={catalogItems}
            />

            {/* Dropdown Admin (solo si es admin) */}
            {isAdmin && (
              <NavDropdown
                label="Admin"
                icon={Settings}
                items={adminItems}
              />
            )}

            {/* Perfil */}
            <Link
              to="/perfil"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5
                ${location.pathname === '/perfil'
                  ? 'text-white bg-slate-800'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <UserCircle className="w-4 h-4 text-slate-400" />
              Perfil
            </Link>
          </div>

          {/* User Actions & Mobile Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-2 text-slate-300 hover:text-red-400 transition-colors px-3 py-2 rounded-md hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Salir</span>
            </button>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              >
                {isMobileMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-indigo-500/20 bg-slate-900/95 backdrop-blur-xl"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {allMobileItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium flex items-center gap-3
                      ${isActive
                        ? 'bg-indigo-600/20 text-indigo-300'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-3 mt-4"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default Navbar;
