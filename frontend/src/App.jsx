
import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import { bootstrapSession } from './utils/auth';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Paises = lazy(() => import('./pages/Paises'));
const Ciudades = lazy(() => import('./pages/Ciudades'));
const Aduanas = lazy(() => import('./pages/Aduanas'));
const Remitentes = lazy(() => import('./pages/Remitentes'));
const Transportadoras = lazy(() => import('./pages/Transportadoras'));
const Monedas = lazy(() => import('./pages/Monedas'));
const Honorarios = lazy(() => import('./pages/Honorarios'));
const CRT = lazy(() => import('./pages/CRT'));
const ListarCRT = lazy(() => import('./pages/ListarCRT'));
const MICsGuardados = lazy(() => import('./pages/MICsGuardados'));
const Sessions = lazy(() => import('./pages/Sessions'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  useEffect(() => {
    bootstrapSession();
  }, []);

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover theme="light" />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/perfil"
            element={
              <PrivateRoute>
                <Layout>
                  <Profile />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/usuarios"
            element={
              <PrivateRoute roles={['admin']}>
                <Layout>
                  <Usuarios />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/paises"
            element={
              <PrivateRoute>
                <Layout>
                  <Paises />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/ciudades"
            element={
              <PrivateRoute>
                <Layout>
                  <Ciudades />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/aduanas"
            element={
              <PrivateRoute>
                <Layout>
                  <Aduanas />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/remitentes"
            element={
              <PrivateRoute>
                <Layout>
                  <Remitentes />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/transportadoras"
            element={
              <PrivateRoute>
                <Layout>
                  <Transportadoras />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/monedas"
            element={
              <PrivateRoute>
                <Layout>
                  <Monedas />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/honorarios"
            element={
              <PrivateRoute>
                <Layout>
                  <Honorarios />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/crt"
            element={
              <PrivateRoute>
                <Layout>
                  <CRT />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/crt/editar/:id"
            element={
              <PrivateRoute>
                <Layout>
                  <CRT />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/listar-crt"
            element={
              <PrivateRoute>
                <Layout>
                  <ListarCRT />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/mic"
            element={
              <PrivateRoute>
                <Layout>
                  <MICsGuardados />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/sesiones"
            element={
              <PrivateRoute>
                <Layout>
                  <Sessions />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/audit-logs"
            element={
              <PrivateRoute roles={['admin']}>
                <Layout>
                  <AuditLogs />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
