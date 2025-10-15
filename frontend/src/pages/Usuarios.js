import React, { useEffect, useState } from 'react';

import api from '../api/api';
import FormModal from '../components/FormModal';
import './Usuarios.css';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const formFields = [
    { name: 'nombre_completo', label: 'Nombre completo', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'telefono', label: 'Telefono', type: 'tel', required: false },
    { name: 'rol', label: 'Rol principal', type: 'text', required: true },
    { name: 'estado', label: 'Estado', type: 'text', required: false },
    { name: 'clave', label: 'Clave (solo nuevo usuario o cambio)', type: 'password', required: false },
  ];

  const loadUsuarios = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await api.get('/auth/admin/users');
      setUsuarios(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsuarios();
  }, []);

  const handleAdd = () => {
    setEditUser(null);
    setModalError('');
    setModalOpen(true);
  };

  const handleEdit = (user) => {
    setEditUser({
      ...user,
      nombre_completo: user.display_name || user.usuario,
      rol: user.roles?.[0] || 'operador',
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Seguro que desea eliminar al usuario?')) {
      return;
    }
    try {
      await api.delete(`/usuarios/${id}`);
      loadUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar');
    }
  };

  const handleSubmit = async (data) => {
    setModalError('');
    try {
      if (!editUser && !data.clave) {
        setModalError('La clave es obligatoria para nuevos usuarios');
        return;
      }
      if (editUser) {
        const payload = {
          nombre: data.nombre_completo,
          telefono: data.telefono,
          estado: data.estado,
          email: data.email,
          roles: [data.rol],
        };
        if (data.clave) {
          payload.clave = data.clave;
        }
        await api.patch(`/auth/admin/users/${editUser.id}`, payload);
      } else {
        await api.post('/auth/register', {
          nombre: data.nombre_completo,
          email: data.email,
          usuario: data.email.split('@')[0],
          password: data.clave,
          telefono: data.telefono,
          role: data.rol,
        });
      }
      setModalOpen(false);
      setModalError('');
      loadUsuarios();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'No se pudo guardar';
      const details = err.response?.data?.details;
      setModalError(details ? `${errorMsg}: ${details.join(', ')}` : errorMsg);
    }
  };

  // Filter users based on search term
  const filteredUsuarios = usuarios.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (user.display_name?.toLowerCase() || '').includes(searchLower) ||
      (user.email?.toLowerCase() || '').includes(searchLower) ||
      (user.roles?.join(', ').toLowerCase() || '').includes(searchLower)
    );
  });

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get role class
  const getRoleClass = (role) => {
    const roleMap = {
      admin: 'role-admin',
      operador: 'role-operador',
      supervisor: 'role-supervisor',
      auditor: 'role-auditor',
    };
    return roleMap[role?.toLowerCase()] || 'role-operador';
  };

  // Get status class
  const getStatusClass = (status) => {
    const statusMap = {
      activo: 'badge-activo',
      inactivo: 'badge-inactivo',
      suspendido: 'badge-suspendido',
    };
    return statusMap[status?.toLowerCase()] || 'badge-activo';
  };

  // Calculate statistics
  const totalUsuarios = usuarios.length;
  const usuariosActivos = usuarios.filter((u) => u.estado?.toLowerCase() === 'activo').length;
  const usuariosMFA = usuarios.filter((u) => u.mfa_enabled).length;

  return (
    <div className="usuarios-container">
      {/* Header Section */}
      <div className="usuarios-header">
        <div className="usuarios-header-content">
          <h2>Gestión de Usuarios</h2>
          <p>Administra los usuarios y sus permisos en el sistema</p>
        </div>
        <div className="usuarios-stats">
          <div className="stat-card">
            <span className="stat-number">{totalUsuarios}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{usuariosActivos}</span>
            <span className="stat-label">Activos</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{usuariosMFA}</span>
            <span className="stat-label">MFA</span>
          </div>
        </div>
        <button className="btn-nuevo-usuario" onClick={handleAdd}>
          Nuevo Usuario
        </button>
      </div>

      {/* Error Alert */}
      {error && <div className="error-alert">{error}</div>}

      {/* Table Section */}
      <div className="usuarios-table-container">
        <div className="usuarios-table-header">
          <h3>Lista de Usuarios</h3>
          <div className="usuarios-search">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Buscar por nombre, email o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p style={{ marginTop: '16px', color: '#718096' }}>Cargando usuarios...</p>
          </div>
        ) : filteredUsuarios.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No se encontraron usuarios</h3>
            <p>
              {searchTerm
                ? 'Intenta con otro término de búsqueda'
                : 'Comienza agregando tu primer usuario'}
            </p>
          </div>
        ) : (
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Roles</th>
                <th>Estado</th>
                <th>MFA</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{getInitials(user.display_name || user.usuario)}</div>
                      <div className="user-info">
                        <span className="user-name">{user.display_name || user.usuario}</span>
                        <span className="user-email">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {(user.roles || []).map((role, idx) => (
                      <span key={idx} className={`role-badge ${getRoleClass(role)}`}>
                        {role}
                      </span>
                    ))}
                  </td>
                  <td>
                    <span className={`badge ${getStatusClass(user.estado)}`}>
                      {user.estado || 'activo'}
                    </span>
                  </td>
                  <td>
                    <span className={`mfa-badge ${user.mfa_enabled ? 'mfa-enabled' : 'mfa-disabled'}`}>
                      {user.mfa_enabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-action btn-edit" onClick={() => handleEdit(user)}>
                        ✏️ Editar
                      </button>
                      <button className="btn-action btn-delete" onClick={() => handleDelete(user.id)}>
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <FormModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setModalError('');
          }}
          onSubmit={handleSubmit}
          fields={formFields}
          initialValues={editUser || {}}
          title={editUser ? 'Editar usuario' : 'Crear usuario'}
          error={modalError}
        />
      )}
    </div>
  );
}

export default Usuarios;
