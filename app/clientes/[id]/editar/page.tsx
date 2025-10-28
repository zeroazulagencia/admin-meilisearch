'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClients, Client } from '@/utils/useClients';
import { useAgents } from '@/utils/useAgents';

export default function EditarCliente({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { clients, initialized: clientsInitialized, updateClient } = useClients();
  const { agents, initialized: agentsInitialized } = useAgents();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [associatedAgents, setAssociatedAgents] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any>({});

  useEffect(() => {
    if (clientsInitialized && agentsInitialized) {
      const clientId = parseInt(params.id);
      const client = clients.find(c => c.id === clientId);
      
      if (client) {
        setCurrentClient(client);
        setFormData({
          name: client.name,
          email: client.email || '',
          phone: client.phone || '',
          company: client.company || ''
        });
        setPermissions(client.permissions || {});
        
        // Buscar agentes asociados
        const agentsForClient = agents.filter(a => a.client_id === clientId);
        setAssociatedAgents(agentsForClient);
      } else {
        router.push('/clientes');
      }
    }
  }, [clientsInitialized, agentsInitialized, clients, agents, params.id, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentClient) return;

    updateClient(currentClient.id, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      permissions
    });

    router.push('/clientes');
  };

  const togglePermission = (section: string, action: string) => {
    setPermissions((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [action]: !prev[section]?.[action]
      }
    }));
  };

  const SECTIONS = ['dashboard', 'conocimiento', 'ejecuciones', 'conversaciones', 'informes', 'consumoApi', 'clientes', 'agentes'];
  const ACTION_LABELS: Record<string, string> = {
    viewOwn: 'Ver propios',
    viewAll: 'Ver todos',
    editOwn: 'Editar propios',
    editAll: 'Editar todos',
    createOwn: 'Crear propios',
    createAll: 'Crear todos'
  };

  const getAvailableActions = (section: string) => {
    const actions = ['viewOwn', 'viewAll'];
    if (section !== 'ejecuciones' && section !== 'conversaciones' && section !== 'consumoApi') {
      actions.push('editOwn', 'editAll');
    }
    if (section === 'clientes' || section === 'agentes' || section === 'informes') {
      actions.push('createOwn', 'createAll');
    }
    return actions;
  };

  if (!clientsInitialized || !agentsInitialized || !currentClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Editar Cliente</h1>
          <p className="mt-2 text-gray-600">Actualiza la información del cliente</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Cliente */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Información General</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Permisos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Permisos del Sistema</h2>
            <p className="text-sm text-gray-500 mb-4">Selecciona los permisos que tendrá este cliente</p>

            {/* Login Checkbox */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canLogin || false}
                  onChange={(e) => setPermissions((prev: any) => ({ ...prev, canLogin: e.target.checked, login: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-3 text-base font-medium text-gray-900">
                  Permitir Login (acceso al sistema)
                </span>
              </label>
            </div>

            {/* Section Permissions */}
            <div className="space-y-4">
              {SECTIONS.map((section) => {
                const sectionName = section === 'consumoApi' ? 'Consumo API' : section.charAt(0).toUpperCase() + section.slice(1);
                const availableActions = getAvailableActions(section);
                
                return (
                  <div key={section} className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">{sectionName}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {availableActions.map((action) => (
                        <label key={action} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permissions[section]?.[action] || false}
                            onChange={() => togglePermission(section, action)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {ACTION_LABELS[action]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agentes Asociados */}
          {associatedAgents.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Agentes Asociados ({associatedAgents.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {associatedAgents.map((agent) => (
                  <div 
                    key={agent.id} 
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={() => router.push(`/agentes/${agent.id}/editar`)}
                  >
                    <div className="flex items-center gap-3">
                      {agent.photo && (
                        <div className="flex-shrink-0">
                          <img
                            src={agent.photo}
                            alt={agent.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
                        {agent.description && (
                          <p className="text-sm text-gray-500 line-clamp-2">{agent.description}</p>
                        )}
                        {agent.conversation_agent_name && (
                          <p className="text-xs text-gray-400 mt-1">ID: {agent.conversation_agent_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {associatedAgents.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">
                Este cliente no tiene agentes asociados.
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/clientes')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

