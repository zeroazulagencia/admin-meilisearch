'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAgents } from '@/utils/useAgents';

interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  clave?: string;
  permissions?: any;
}

export default function EditarCliente() {
  const router = useRouter();
  const params = useParams();
  const { agents, initialized: agentsInitialized } = useAgents();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    clave: ''
  });
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [associatedAgents, setAssociatedAgents] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    
    const clientId = params.id as string;
    
    // Cargar cliente desde MySQL
    const loadClient = async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}`);
        const data = await res.json();
        if (data.ok && data.client) {
          const client = data.client;
          setCurrentClient(client);
          setFormData({
            name: client.name,
            email: client.email || '',
            phone: client.phone || '',
            company: client.company || '',
            clave: client.clave || ''
          });
          try {
            setPermissions(typeof client.permissions === 'string' ? JSON.parse(client.permissions) : (client.permissions || {}));
          } catch {
            setPermissions({});
          }
          
          // Buscar agentes asociados desde localStorage
          if (agentsInitialized) {
            const agentsForClient = agents.filter(a => a.client_id === parseInt(clientId));
            setAssociatedAgents(agentsForClient);
          }
        } else {
          router.push('/clientes');
        }
      } catch (err) {
        console.error('Error cargando cliente:', err);
        router.push('/clientes');
      }
    };
    
    loadClient();
  }, [params?.id, router, agents, agentsInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentClient) return;

    try {
      const res = await fetch(`/api/clients/${currentClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          clave: formData.clave,
          permissions
        })
      });
      const data = await res.json();
      if (data.ok) {
        router.push('/clientes');
      } else {
        alert('Error al actualizar: ' + (data.error || 'Desconocido'));
      }
    } catch (err) {
      alert('Error al actualizar cliente');
    }
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

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, clave: password });
  };

  if (!agentsInitialized || !currentClient) {
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.clave}
                      onChange={(e) => setFormData({ ...formData, clave: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    title="Generar contraseña aleatoria"
                  >
                    🔑
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Permisos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Permisos del Sistema</h2>
            <p className="text-sm text-gray-500 mb-4">Selecciona los permisos que tendrá este cliente</p>

            {/* Tipo de Perfil */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Perfil
              </label>
              <select
                value={permissions.type || 'client'}
                onChange={(e) => {
                  const type = e.target.value;
                  if (type === 'admin') {
                    // Configurar permisos de admin (todos activos)
                    setPermissions({
                      canLogin: true,
                      login: true,
                      type: 'admin',
                      dashboard: { viewOwn: true, editOwn: true, viewAll: true, editAll: true },
                      conocimiento: { viewOwn: true, editOwn: true, viewAll: true, editAll: true },
                      ejecuciones: { viewOwn: true, viewAll: true },
                      conversaciones: { viewOwn: true, viewAll: true },
                      informes: { viewOwn: true, editOwn: true, viewAll: true, editAll: true, createOwn: true, createAll: true },
                      consumoApi: { viewOwn: true, viewAll: true },
                      clientes: { viewOwn: true, editOwn: true, viewAll: true, editAll: true, createOwn: true, createAll: true },
                      agentes: { viewOwn: true, editOwn: true, viewAll: true, editAll: true, createOwn: true, createAll: true }
                    });
                  } else {
                    // Configurar permisos básicos de cliente
                    setPermissions({
                      canLogin: true,
                      login: true,
                      type: 'client',
                      dashboard: { viewOwn: true, editOwn: true, viewAll: false, editAll: false },
                      conocimiento: { viewOwn: true, editOwn: false, viewAll: false, editAll: false },
                      ejecuciones: { viewOwn: true, viewAll: false },
                      conversaciones: { viewOwn: true, viewAll: false },
                      informes: { viewOwn: true, editOwn: false, viewAll: false, editAll: false, createOwn: false, createAll: false },
                      consumoApi: { viewOwn: true, viewAll: false },
                      clientes: { viewOwn: false, editOwn: false, viewAll: false, editAll: false, createOwn: false, createAll: false },
                      agentes: { viewOwn: false, editOwn: false, viewAll: false, editAll: false, createOwn: false, createAll: false }
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="client">Cliente (Perfil Normal)</option>
                <option value="admin">Super Admin (Acceso Completo)</option>
              </select>
            </div>

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

