
import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Usuarios from './pages/Usuarios';
import Paises from './pages/Paises';
import Ciudades from './pages/Ciudades';
import Remitentes from './pages/Remitentes';
import Transportadoras from './pages/Transportadoras';
import Monedas from './pages/Monedas';
import Honorarios from './pages/Honorarios';
import CRT from './pages/CRT';
import ListarCRT from './pages/ListarCRT';
import MICNuevo from './pages/MICNuevo';
import MICDetalle from './pages/MICDetalle';
import ListarMIC from './pages/ListarMIC';
import MICsGuardados from './pages/MICsGuardados';
import Sessions from './pages/Sessions';
import AuditLogs from './pages/AuditLogs';

function App() {
  return (
    <Router>
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
          path="/mic/nuevo"
          element={
            <PrivateRoute>
              <Layout>
                <MICNuevo />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/mic/:id"
          element={
            <PrivateRoute>
              <Layout>
                <MICDetalle />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/mic"
          element={
            <PrivateRoute>
              <Layout>
                <ListarMIC />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/mics-guardados"
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
    </Router>
  );
}

export default App;
