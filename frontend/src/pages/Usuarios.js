import React, { useEffect, useState } from 'react';

import api from '../api/api';
import FormModal from '../components/FormModal';
import Table from '../components/Table';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [error, setError] = useState('');

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
    try {
      const response = await api.get('/auth/admin/users');
      setUsuarios(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los usuarios');
    }
  };

  useEffect(() => {
    loadUsuarios();
  }, []);

  const handleAdd = () => {
    setEditUser(null);
    setModalOpen(true);
  };

  const handleEdit = (user) => {
    setEditUser({
      ...user,
      nombre_completo: user.display_name || user.usuario,
      rol: user.roles?.[0] || 'operador',
    });
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
    setError('');
    try {
      if (!editUser && !data.clave) {
        setError('La clave es obligatoria para nuevos usuarios');
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
      loadUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Usuarios</h2>
        <button onClick={handleAdd}>Nuevo usuario</button>
      </div>
      {error && <div style={{ color: 'red', marginBottom: '8px' }}>{error}</div>}
      <Table
        data={usuarios}
        columns={[
          { field: 'display_name', label: 'Nombre' },
          { field: 'email', label: 'Email' },
          { field: 'roles', label: 'Roles', render: (value = []) => (Array.isArray(value) ? value.join(', ') : '') },
          { field: 'estado', label: 'Estado' },
          { field: 'mfa_enabled', label: 'MFA', render: (value) => (value ? 'Activo' : 'Inactivo') },
        ]}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      {modalOpen && (
        <FormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          fields={formFields}
          initialValues={editUser || {}}
          title={editUser ? 'Editar usuario' : 'Crear usuario'}
        />
      )}
    </div>
  );
}

export default Usuarios;
