import React, { useEffect, useState } from 'react';
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
  X
} from 'lucide-react';

import useAuthStore from '../store/authStore';
import { isLoggedIn, logout, onAuthChange } from '../utils/auth';

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

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/usuarios', label: 'Usuarios', icon: Users, adminOnly: true },
    { path: '/perfil', label: 'Perfil', icon: UserCircle },
    { path: '/paises', label: 'Países', icon: Globe2 },
    { path: '/ciudades', label: 'Ciudades', icon: Building2 },
    { path: '/remitentes', label: 'Remitentes', icon: Contact },
    { path: '/transportadoras', label: 'Transportadoras', icon: Truck },
    { path: '/crt', label: 'Nuevo CRT', icon: FileText, highlight: true },
    { path: '/listar-crt', label: 'Historial CRT', icon: FileText },
    { path: '/monedas', label: 'Monedas', icon: Coins },
    { path: '/honorarios', label: 'Honorarios', icon: Wallet },
    { path: '/sesiones', label: 'Sesiones', icon: ShieldCheck },
    { path: '/audit-logs', label: 'Auditoría', icon: History, adminOnly: true },
  ];

  const visibleItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-indigo-500/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              Logística
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center space-x-1">
            {visibleItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 group
                    ${item.highlight
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/30'
                      : isActive
                        ? 'text-white bg-slate-800'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-300'}`} />
                  {item.label}
                  {isActive && !item.highlight && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
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
            <div className="xl:hidden flex items-center">
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
            className="xl:hidden border-t border-indigo-500/20 bg-slate-900/95 backdrop-blur-xl"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {visibleItems.map((item) => {
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
