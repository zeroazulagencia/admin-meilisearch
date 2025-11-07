'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedLayout from '@/components/ProtectedLayout';
import NoticeModal from '@/components/ui/NoticeModal';

interface ClientDB {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  clave?: string;
  permissions?: any;
}

export default function Clientes() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientDB | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    usuario: '',
    clave: '',
    company: '',
    email: '',
    phone: ''
  });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingClient) {
      // Actualizar - redireccionar a la página de edición
      router.push(`/clientes/${editingClient.id}/editar`);
    } else {
      // Crear en MySQL
      try {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.ok) {
          // Recargar página para ver el nuevo cliente
          window.location.reload();
        } else {
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: 'Error al crear cliente: ' + (data.error || 'Desconocido'),
            type: 'error',
          });
        }
      } catch (err) {
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: 'Error al crear cliente',
          type: 'error',
        });
      }
    }
    
    resetForm();
  };

  const handleEdit = (client: ClientDB) => {
    router.push(`/clientes/${client.id}/editar`);
  };

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning'; onConfirm?: () => void; deleteId?: number }>({
    isOpen: false,
    message: '',
    type: 'warning',
  });

  const handleDelete = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar eliminación',
      message: '¿Estás seguro de eliminar este cliente?',
      type: 'warning',
      deleteId: id,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/clients/${id}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.ok) {
            // Recargar clientes
            const res2 = await fetch('/api/clients');
            const data2 = await res2.json();
            if (data2.ok && data2.clients) {
              setClients(data2.clients);
            }
          } else {
            setAlertModal({
              isOpen: true,
              title: 'Error',
              message: 'Error al eliminar cliente',
              type: 'error',
            });
          }
        } catch (err) {
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: 'Error al eliminar cliente',
            type: 'error',
          });
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({ name: '', usuario: '', clave: '', company: '', email: '', phone: '' });
    setEditingClient(null);
    setShowForm(false);
  };

  useEffect(() => {
    // Cargar clientes desde MySQL
    const loadClients = async () => {
      try {
        console.log('Loading clients...');
        const res = await fetch('/api/clients');
        const data = await res.json();
        console.log('Clients loaded:', data);
        if (data.ok && data.clients) {
          setClients(data.clients);
        }
      } catch (err) {
        console.error('Error cargando clientes:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadClients();
  }, []);

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full border-[#5DE1E5]"></div>
        </div>
        <NoticeModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
        />
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nuevo Cliente
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuario
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.usuario}
                    onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clave
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.clave}
                    onChange={(e) => setFormData({ ...formData, clave: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 text-gray-900 rounded-lg hover:opacity-90 transition-all"
                  style={{ backgroundColor: '#5DE1E5' }}
                >
                  {editingClient ? 'Actualizar' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Perfil
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
              </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => {
                let permissions: any = {};
                try {
                  permissions = typeof client.permissions === 'string' ? JSON.parse(client.permissions) : (client.permissions || {});
                } catch {
                  permissions = {};
                }
                const isAdmin = permissions?.type === 'admin';
                
                return (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${isAdmin ? 'bg-purple-100 text-purple-800' : ''}`}
                        style={!isAdmin ? { backgroundColor: 'rgba(93, 225, 229, 0.1)', color: '#0369a1' } : {}}
                      >
                        {isAdmin ? 'Super Admin' : 'Cliente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.phone}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => router.push(`/clientes/${client.id}/editar`)}
                      className="mr-4 transition-colors"
                      style={{ color: '#5DE1E5' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#4DD1D5'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#5DE1E5'}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
    </ProtectedLayout>
  );
}

