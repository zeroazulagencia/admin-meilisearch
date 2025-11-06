'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedLayout from '@/components/ProtectedLayout';
import AlertModal from '@/components/ui/AlertModal';

interface Client {
  id: number;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  permissions?: any;
}

interface Agent {
  id: number;
  name: string;
  photo?: string;
  description?: string;
  status?: string;
  client_id?: number;
}

export default function EditarCliente() {
  const router = useRouter();
  const params = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
  });

  const [permissions, setPermissions] = useState({
    canLogin: false,
    canManageAgents: false,
    canManageClients: false,
    canManageKnowledge: false,
    canViewReports: false,
    canViewConversations: false,
    canManageWorkflows: false,
    canManageWhatsApp: false,
    canManageFacturacion: false,
    canManageDB: false,
    canViewConsumoAPI: false,
    canViewRoadmap: false,
  });

  useEffect(() => {
    const loadClient = async () => {
      try {
        const res = await fetch(`/api/clients/${params.id}`);
        const data = await res.json();
        if (data.ok && data.client) {
          const clientData: Client = data.client;
          setClient(clientData);
          setFormData({
            name: clientData.name || '',
            email: clientData.email || '',
            company: clientData.company || '',
            phone: clientData.phone || '',
          });

          // Cargar permisos
          try {
            const perms = typeof clientData.permissions === 'string' 
              ? JSON.parse(clientData.permissions) 
              : (clientData.permissions || {});
            setPermissions({
              canLogin: perms.canLogin !== false,
              canManageAgents: perms.canManageAgents === true,
              canManageClients: perms.canManageClients === true,
              canManageKnowledge: perms.canManageKnowledge === true,
              canViewReports: perms.canViewReports === true,
              canViewConversations: perms.canViewConversations === true,
              canManageWorkflows: perms.canManageWorkflows === true,
              canManageWhatsApp: perms.canManageWhatsApp === true,
              canManageFacturacion: perms.canManageFacturacion === true,
              canManageDB: perms.canManageDB === true,
              canViewConsumoAPI: perms.canViewConsumoAPI === true,
              canViewRoadmap: perms.canViewRoadmap === true,
            });
          } catch {
            setPermissions({
              canLogin: true,
              canManageAgents: false,
              canManageClients: false,
              canManageKnowledge: false,
              canViewReports: false,
              canViewConversations: false,
              canManageWorkflows: false,
              canManageWhatsApp: false,
              canManageFacturacion: false,
              canManageDB: false,
              canViewConsumoAPI: false,
              canViewRoadmap: false,
            });
          }
        } else {
          router.push('/clientes');
        }
      } catch (err) {
        console.error('Error cargando cliente:', err);
        router.push('/clientes');
      } finally {
        setLoading(false);
      }
    };

    const loadAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        if (data.ok && data.agents) {
          // Filtrar agentes por client_id
          const clientAgents = data.agents.filter((agent: Agent) => agent.client_id === parseInt(params.id as string));
          setAgents(clientAgents);
        }
      } catch (err) {
        console.error('Error cargando agentes:', err);
      }
    };

    if (params.id) {
    loadClient();
      loadAgents();
    }
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          permissions: permissions
        })
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al actualizar');

      setAlertModal({
        isOpen: true,
        title: 'Éxito',
        message: 'Cliente actualizado correctamente',
        type: 'success',
      });

      setTimeout(() => {
        router.push('/clientes');
      }, 1500);
    } catch (err: any) {
      console.error('Error guardando:', err);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: err.message || 'Error al guardar cambios',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full border-[#5DE1E5]"></div>
        </div>
      </ProtectedLayout>
    );
  }

  if (!client) {
    return (
      <ProtectedLayout>
        <div className="text-center py-8">
          <p className="text-gray-600">Cliente no encontrado</p>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Cliente</h1>
        <p className="mt-2 text-gray-600">Actualiza la información del cliente y sus permisos</p>
        </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda - Datos del cliente */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 pb-12">
              <h2 className="text-base/7 font-semibold text-gray-900 mb-6">Información del Cliente</h2>
              
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="name" className="block text-sm/6 font-medium text-gray-900">
                  Nombre *
                </label>
                  <div className="mt-2">
                <input
                      id="name"
                      name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                />
                  </div>
              </div>

                <div className="sm:col-span-3">
                  <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900">
                    Email *
                </label>
                  <div className="mt-2">
                <input
                      id="email"
                      name="email"
                  type="email"
                      required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                />
              </div>
              </div>

                <div className="sm:col-span-3">
                  <label htmlFor="company" className="block text-sm/6 font-medium text-gray-900">
                  Empresa
                </label>
                  <div className="mt-2">
                <input
                      id="company"
                      name="company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                />
                  </div>
              </div>

                <div className="sm:col-span-3">
                  <label htmlFor="phone" className="block text-sm/6 font-medium text-gray-900">
                    Teléfono
                </label>
                  <div className="mt-2">
                    <input
                      id="phone"
                      name="phone"
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] sm:text-sm/6"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha - Activos */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 pb-12">
              <h2 className="text-base/7 font-semibold text-gray-900 mb-6">Activos</h2>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Agentes</h3>
                {agents.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay agentes asociados</p>
                ) : (
                  <div className="space-y-3">
                    {agents.map((agent) => (
                  <div 
                    key={agent.id} 
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/agentes/${agent.id}/editar`)}
                  >
                        {agent.photo ? (
                          <img
                            src={agent.photo}
                            alt={agent.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 text-sm font-medium">
                              {agent.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{agent.name}</p>
                          {agent.status && (
                            <p className="text-xs text-gray-500">{agent.status}</p>
                        )}
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Permisos - Abajo, dos por línea */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8 pb-12">
          <h2 className="text-base/7 font-semibold text-gray-900 mb-6">Permisos</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canLogin"
                checked={permissions.canLogin}
                onChange={(e) => setPermissions({ ...permissions, canLogin: e.target.checked })}
                className="w-5 h-5 text-[#5DE1E5] border-gray-300 rounded focus:ring-[#5DE1E5]"
              />
              <label htmlFor="canLogin" className="text-sm font-medium text-gray-900">
                Puede iniciar sesión
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canManageAgents"
                checked={permissions.canManageAgents}
                onChange={(e) => setPermissions({ ...permissions, canManageAgents: e.target.checked })}
                className="w-5 h-5 text-[#5DE1E5] border-gray-300 rounded focus:ring-[#5DE1E5]"
              />
              <label htmlFor="canManageAgents" className="text-sm font-medium text-gray-900">
                Gestionar agentes
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canManageClients"
                checked={permissions.canManageClients}
                onChange={(e) => setPermissions({ ...permissions, canManageClients: e.target.checked })}
                className="w-5 h-5 text-[#5DE1E5] border-gray-300 rounded focus:ring-[#5DE1E5]"
              />
              <label htmlFor="canManageClients" className="text-sm font-medium text-gray-900">
                Gestionar clientes
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canManageKnowledge"
                checked={permissions.canManageKnowledge}
                onChange={(e) => setPermissions({ ...permissions, canManageKnowledge: e.target.checked })}
                className="w-5 h-5 text-[#5DE1E5] border-gray-300 rounded focus:ring-[#5DE1E5]"
              />
              <label htmlFor="canManageKnowledge" className="text-sm font-medium text-gray-900">
                Gestionar conocimiento
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canViewReports"
                checked={permissions.canViewReports}
                onChange={(e) => setPermissions({ ...permissions, canViewReports: e.target.checked })}
                className="w-5 h-5 text-[#5DE1E5] border-gray-300 rounded focus:ring-[#5DE1E5]"
              />
              <label htmlFor="canViewReports" className="text-sm font-medium text-gray-900">
                Ver reportes
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canViewConversations"
                checked={permissions.canViewConversations}
                onChange={(e) => setPermissions({ ...permissions, canViewConversations: e.target.checked })}
                className="w-5 h-5 text-[#5DE1E5] border-gray-300 rounded focus:ring-[#5DE1E5]"
              />
              <label htmlFor="canViewConversations" className="text-sm font-medium text-gray-900">
                Ver conversaciones
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canManageWorkflows"
                checked={permissions.canManageWorkflows}
                onChange={(e) => setPermissions({ ...permissions, canManageWorkflows: e.target.checked })}
                className="w-5 h-5 text-[#5DE1E5] border-gray-300 rounded focus:ring-[#5DE1E5]"
              />
              <label htmlFor="canManageWorkflows" className="text-sm font-medium text-gray-900">
                Gestionar flujos
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canManageWhatsApp"
                checked={permissions.canManageWhatsApp}
                onChange={(e) => setPermissions({ ...permissions, canManageWhatsApp: e.target.checked })}
                className="w-5 h-5 text-[#5DE1E5] border-gray-300 rounded focus:ring-[#5DE1E5]"
              />
              <label htmlFor="canManageWhatsApp" className="text-sm font-medium text-gray-900">
                Gestionar WhatsApp
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canManageFacturacion"
                checked={permissions.canManageFacturacion}
                onChange={(e) => setPermissions({ ...permissions, canManageFacturacion: e.target.checked })}
                className="w-5 h-5 text-[#5DE1E5] border-gray-300 rounded focus:ring-[#5DE1E5]"
              />
              <label htmlFor="canManageFacturacion" className="text-sm font-medium text-gray-900">
                Gestionar facturación
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canManageDB"
                checked={permissions.canManageDB}
                onChange={(e) => setPermissions({ ...permissions, canManageDB: e.target.checked })}
                className="w-5 h-5 text-[#5DE1E5] border-gray-300 rounded focus:ring-[#5DE1E5]"
              />
              <label htmlFor="canManageDB" className="text-sm font-medium text-gray-900">
                Gestionar DB Manager
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canViewConsumoAPI"
                checked={permissions.canViewConsumoAPI}
                onChange={(e) => setPermissions({ ...permissions, canViewConsumoAPI: e.target.checked })}
                className="w-5 h-5 text-[#5DE1E5] border-gray-300 rounded focus:ring-[#5DE1E5]"
              />
              <label htmlFor="canViewConsumoAPI" className="text-sm font-medium text-gray-900">
                Ver consumo API
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canViewRoadmap"
                checked={permissions.canViewRoadmap}
                onChange={(e) => setPermissions({ ...permissions, canViewRoadmap: e.target.checked })}
                className="w-5 h-5 text-[#5DE1E5] border-gray-300 rounded focus:ring-[#5DE1E5]"
              />
              <label htmlFor="canViewRoadmap" className="text-sm font-medium text-gray-900">
                Ver roadmap
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-x-6">
            <button
              type="button"
              onClick={() => router.push('/clientes')}
            className="text-sm/6 font-semibold text-gray-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
            disabled={saving}
            className="rounded-md bg-[#5DE1E5] px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs hover:bg-[#4BC5C9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5DE1E5] disabled:opacity-50"
            >
            {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </ProtectedLayout>
  );
}

