'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedLayout from '@/components/ProtectedLayout';
import NoticeModal from '@/components/ui/NoticeModal';
import { getPermissions } from '@/utils/permissions';

interface AgentSmall {
  id: number;
  name: string;
  photo?: string | null;
  status?: string | null;
  monthly_value_usd?: number | null;
}

interface ClientDB {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  clave?: string;
  permissions?: any;
  agents?: AgentSmall[];
  totalMonthlyValue?: number;
}

const SmallAvatar = ({ photo, name, status }: { photo?: string | null; name: string; status?: string | null }) => {
  const [imgError, setImgError] = useState(false);
  const inactive = status === 'inactive';
  return (
    <div title={name} className={`relative shrink-0 rounded-full overflow-hidden ${inactive ? 'grayscale opacity-40 ring-1 ring-gray-300' : ''}`}>
      {photo && !imgError ? (
        <img
          src={photo}
          alt={name}
          className={`w-8 h-8 rounded-full object-cover border border-gray-200 ${inactive ? 'grayscale opacity-40' : ''}`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`w-8 h-8 rounded-full ${inactive ? 'bg-gray-200 text-gray-600' : 'bg-gradient-to-br from-[#5DE1E5] to-[#4BC5C9]'} flex items-center justify-center border border-gray-200 ${inactive ? 'opacity-60' : ''}`}>
          <span className={`${inactive ? 'text-gray-500' : 'text-white'} font-semibold text-xs`}>{name.charAt(0).toUpperCase()}</span>
        </div>
      )}
    </div>
  );
};

const formatCOP = (val: number): string => {
  if (!val || val <= 0) return '-';
  return '$' + val.toLocaleString('es-CO') + ' COP';
};

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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingClient) {
      router.push(`/clientes/${editingClient.id}/editar`);
    } else {
      try {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.ok) {
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

  const handleDelete = async (id: number, name: string) => {
    try {
      const res = await fetch('/api/clients/check-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        setAlertModal({ isOpen: true, title: 'Error', message: 'Error al verificar clientes', type: 'error' });
        return;
      }

      if (!res.ok || !data.ok) {
        console.log('[handleDelete] BLOCKED - showing error alert');
        const agentsList = data.agents?.map((a: any) => a.name).join(', ') || '';
        setAlertModal({
          isOpen: true,
          title: 'No se puede eliminar',
          message: `${data.error}${agentsList ? `\n\nAgentes asociados: ${agentsList}` : ''}`,
          type: 'error',
        });
        return;
      }
      
      console.log('[handleDelete] OK - showing confirm modal');

      // No agents - show confirmation modal
      setConfirmModal({
        isOpen: true,
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de eliminar "${name}"? Esta acción no se puede deshacer.`,
        type: 'warning',
        deleteId: id,
        onConfirm: async () => {
          console.log('[handleDelete] Confirmed - executing DELETE');
          try {
            const delRes = await fetch(`/api/clients/${id}`, {
              method: 'DELETE',
            });
            const delData = await delRes.json();
            if (delData.ok) {
              // Refresh list - force fresh data from server
              const refreshRes = await fetch('/api/clients-all', { cache: 'no-store' });
              const refreshData = await refreshRes.json();
              if (refreshData.ok && refreshData.clients) {
                setClients(refreshData.clients);
              }
              setConfirmModal({ isOpen: false, title: '', message: '', type: 'info', deleteId: undefined, onConfirm: () => {} });
            } else {
              setAlertModal({
                isOpen: true,
                title: 'Error',
                message: delData.error || 'Error al eliminar cliente',
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
    } catch (err) {
      console.error('[handleDelete] Exception:', err);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error inesperado al verificar cliente',
        type: 'error',
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', usuario: '', clave: '', company: '', email: '', phone: '' });
    setEditingClient(null);
    setShowForm(false);
  };

  useEffect(() => {
    const permissions = getPermissions();
    if (permissions) {
      const userIsAdmin = permissions.type === 'admin';
      setIsAdmin(userIsAdmin);
      if (!userIsAdmin) {
        setLoading(false);
        router.push('/dashboard');
        return;
      }
    } else {
      setLoading(false);
      router.push('/dashboard');
      return;
    }

    const loadClients = async () => {
      try {
        const res = await fetch('/api/clients-all');
        const data = await res.json();
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
  }, [router]);

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full border-[#5DE1E5]"></div>
        </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input type="text" required value={formData.usuario} onChange={(e) => setFormData({ ...formData, usuario: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clave</label>
                <input type="password" required value={formData.clave} onChange={(e) => setFormData({ ...formData, clave: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 text-gray-900 rounded-lg hover:opacity-90 transition-all" style={{ backgroundColor: '#5DE1E5' }}>
                {editingClient ? 'Actualizar' : 'Guardar'}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agentes</th>
                {isAdmin && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensual</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Empresa</th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => {
                const clientIsAdmin = client.permissions?.type === 'admin';
                return (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${clientIsAdmin ? 'bg-purple-100 text-purple-800' : ''}`}
                        style={!clientIsAdmin ? { backgroundColor: 'rgba(93, 225, 229, 0.1)', color: '#0369a1' } : {}}
                      >
                        {clientIsAdmin ? 'Super Admin' : 'Cliente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.agents && client.agents.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {client.agents.map((agent) => (
                            <SmallAvatar key={agent.id} photo={agent.photo} name={agent.name} status={agent.status} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    {(isAdmin) && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatCOP(client.totalMonthlyValue || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                          {client.company}
                        </td>
                      </>
                    )}
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
                        onClick={() => handleDelete(client.id, client.name)}
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
      </div>

      {/* Alert Modal */}
      <NoticeModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Confirm Delete Modal */}
      <NoticeModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        showCancel={true}
        onConfirm={confirmModal.onConfirm}
      />
    </ProtectedLayout>
  );
}
