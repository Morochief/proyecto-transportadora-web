import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { isLoggedIn } from '../utils/auth';
import useAuthStore from '../store/authStore';

function PrivateRoute({ children, roles = [], permissions = [] }) {
  const location = useLocation();
  const { user, authReady } = useAuthStore();

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Cargando sesion...
      </div>
    );
  }

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles.length > 0) {
    const userRoles = new Set(user?.roles || []);
    const allowed = roles.some((role) => userRoles.has(role));
    if (!allowed) {
      return <Navigate to="/" replace />;
    }
  }

  if (permissions.length > 0) {
    const userPerms = new Set(user?.permissions || []);
    const allowed = permissions.every((perm) => userPerms.has(perm));
    if (!allowed) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default PrivateRoute;
