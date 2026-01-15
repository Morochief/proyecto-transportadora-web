import React, { useEffect, useState } from 'react';
import { FiEdit2, FiTrash2, FiSearch, FiLock, FiUnlock, FiUser, FiMail } from 'react-icons/fi';
import { HiOutlineUserAdd } from 'react-icons/hi';
import api from '../api/api';
import FormModal from '../components/FormModal';
import { roleOptions as defaultRoleOptions } from '../utils/roles';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [rolesList, setRolesList] = useState(defaultRoleOptions);
  const estadoOptions = [
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
    { value: 'suspendido', label: 'Suspendido' },
  ];

  const formFields = [
    { name: 'nombre_completo', label: 'Nombre completo', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'telefono', label: 'Telefono', type: 'tel', required: false },
    {
      name: 'rol',
      label: 'Rol principal',
      label: 'Rol principal',
      type: 'select',
      options: rolesList,
      required: true,
    },
    { name: 'estado', label: 'Estado', type: 'select', options: estadoOptions, required: false },
    { name: 'clave', label: 'Nueva Clave (dejar vacío para no cambiar)', type: 'password', required: false },
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

  const loadRoles = async () => {
    try {
      const response = await api.get('/auth/roles');
      if (response.data && response.data.length > 0) {
        setRolesList(response.data);
      }
    } catch (err) {
      console.error('Error cargando roles, usando defaults', err);
    }
  };

  useEffect(() => {
    loadUsuarios();
    loadRoles();
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
      estado: user.estado || 'activo',
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Seguro que desea eliminar al usuario?')) {
      return;
    }
    try {
      await api.delete(`/auth/admin/users/${id}`);
      loadUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar');
    }
  };

  const handleUnlock = async (id) => {
    if (!window.confirm('¿Seguro que desea desbloquear al usuario?')) {
      return;
    }
    try {
      await api.post(`/auth/admin/users/${id}/unlock`);
      loadUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo desbloquear');
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
          email: data.email,
          roles: [data.rol],
        };
        if (data.estado) {
          payload.estado = data.estado.toLowerCase();
        }
        if (data.clave) {
          payload.clave = data.clave;
        }
        await api.patch(`/auth/admin/users/${editUser.id}`, payload);
      } else {
        const estadoValue = (data.estado || 'activo').toLowerCase();
        await api.post('/auth/register', {
          nombre: data.nombre_completo,
          email: data.email,
          usuario: data.email.split('@')[0],
          password: data.clave,
          telefono: data.telefono,
          role: data.rol,
          estado: estadoValue,
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

  const filteredUsuarios = usuarios.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (user.display_name?.toLowerCase() || '').includes(searchLower) ||
      (user.email?.toLowerCase() || '').includes(searchLower) ||
      (user.roles?.join(', ').toLowerCase() || '').includes(searchLower)
    );
  });

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const totalUsuarios = usuarios.length;
  const usuariosActivos = usuarios.filter((u) => u.estado?.toLowerCase() === 'activo').length;
  const usuariosMFA = usuarios.filter((u) => u.mfa_enabled).length;

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Gestión de Usuarios</h1>
          <p className="text-slate-500 mt-1">Administra los usuarios y sus permisos en el sistema.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <HiOutlineUserAdd className="w-5 h-5" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Usuarios</div>
          <div className="text-3xl font-bold text-slate-800 mt-2">{totalUsuarios}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Activos</div>
          <div className="text-3xl font-bold text-emerald-600 mt-2">{usuariosActivos}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Con MFA</div>
          <div className="text-3xl font-bold text-indigo-600 mt-2">{usuariosMFA}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Search Bar */}
        <div className="p-6 border-b border-slate-200">
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o rol..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Cargando usuarios...</div>
          ) : filteredUsuarios.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FiUser className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No se encontraron usuarios</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roles</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">MFA</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsuarios.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          {getInitials(user.display_name || user.usuario)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{user.display_name || user.usuario}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-1">
                            <FiMail className="w-3 h-3" /> {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(user.roles || []).map((role, idx) => (
                          <span key={idx} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize
                            ${user.estado === 'activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          user.estado === 'inactivo' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            user.estado === 'suspendido' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {user.estado || 'activo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-1.5 text-sm ${user.mfa_enabled ? 'text-indigo-600 font-medium' : 'text-slate-400'}`}>
                        {user.mfa_enabled ? <FiLock className="w-4 h-4" /> : <FiUnlock className="w-4 h-4" />}
                        {user.mfa_enabled ? 'Activado' : 'Desactivado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        {user.is_locked && (
                          <button
                            onClick={() => handleUnlock(user.id)}
                            className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all"
                            title="Desbloquear cuenta"
                          >
                            <FiUnlock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
          initialValues={editUser || { rol: 'operador', estado: 'activo' }}
          title={editUser ? 'Editar usuario' : 'Crear usuario'}
          error={modalError}
        />
      )}
    </div>
  );
}

export default Usuarios;
