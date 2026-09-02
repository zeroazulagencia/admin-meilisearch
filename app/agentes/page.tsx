'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import settings from '../../settings.json';
import ProtectedLayout from '@/components/ProtectedLayout';
import NoticeModal from '@/components/ui/NoticeModal';
import AgentAvatar from '@/components/ui/AgentAvatar';
import StatusBadge from '@/components/ui/StatusBadge';
import { getPermissions, getUserId } from '@/utils/permissions';

interface AgentDB {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  photo?: string;
  email?: string;
  phone?: string;
  agent_code?: string;
  status?: string;
  knowledge?: any;
  workflows?: any;
  conversation_agent_name?: string;
  client_name?: string;
}

interface Client {
  id: number;
  name: string;
  email?: string;
  company?: string;
}

interface Module {
  id: number;
  agent_id: number;
  title: string;
}

function parseWorkflows(w: any): { count: number; ids: string[] } {
  if (!w) return { count: 0, ids: [] };
  try {
    const parsed = typeof w === 'string' ? JSON.parse(w) : w;
    if (parsed?.workflowIds && Array.isArray(parsed.workflowIds)) {
      return { count: parsed.workflowIds.length, ids: parsed.workflowIds };
    }
  } catch {}
  return { count: 0, ids: [] };
}

function parseKnowledge(k: any): { count: number; names: string[] } {
  if (!k) return { count: 0, names: [] };
  try {
    const parsed = typeof k === 'string' ? JSON.parse(k) : k;
    if (parsed?.indexes && Array.isArray(parsed.indexes)) {
      return { count: parsed.indexes.length, names: parsed.indexes };
    }
  } catch {}
  return { count: 0, names: [] };
}

export default function Agentes() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentDB[]>([]);
  const [agentsLoading, setAgentsLoading] = useState<boolean>(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [searchName, setSearchName] = useState<string>('');
  const [filteredAgents, setFilteredAgents] = useState<AgentDB[]>([]);
  const [modulesByAgent, setModulesByAgent] = useState<Record<number, Module[]>>({});

  useEffect(() => {
    const loadClients = async () => {
      try {
        console.log('[AGENTES] UI version:', settings?.proyecto?.version || 'unknown');
        const res = await fetch('/api/clients');
        const data = await res.json();
        if (data.ok && data.clients) {
          setClients(data.clients);
        }
      } catch (err) {
        console.error('[AGENTES] Error cargando clientes:', err);
      }
    };
    loadClients();
  }, []);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        if (data.ok && data.agents) {
          let list: AgentDB[] = data.agents;

          const permissions = getPermissions();
          const userId = getUserId();

          if (permissions && userId && permissions.type !== 'admin') {
            const agentesPerms = permissions.agentes;
            if (agentesPerms) {
              if (agentesPerms.viewAll === true) {
              } else if (agentesPerms.viewOwn === true) {
                list = list.filter(a => a.client_id === parseInt(userId));
              } else {
                list = [];
              }
            } else {
              list = [];
            }
          }

          setAgents(list);
        }
      } catch (err) {
        console.error('[AGENTES] Error cargando agentes:', err);
      } finally {
        setAgentsLoading(false);
      }
    };
    loadAgents();
  }, []);

  // Cargar módulos y agrupar por agent_id
  useEffect(() => {
    const loadModules = async () => {
      try {
        const res = await fetch('/api/modules');
        const data = await res.json();
        if (data.ok && data.modules) {
          const grouped: Record<number, Module[]> = {};
          data.modules.forEach((m: Module) => {
            if (!grouped[m.agent_id]) grouped[m.agent_id] = [];
            grouped[m.agent_id].push(m);
          });
          setModulesByAgent(grouped);
        }
      } catch (err) {
        console.error('[AGENTES] Error cargando módulos:', err);
      }
    };
    loadModules();
  }, []);

  const sortedClients = [...clients].sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  const applyFilters = () => {
    let result = agents;

    if (selectedClientId !== 'all') {
      result = result.filter(a => a.client_id === parseInt(selectedClientId));
    }

    if (selectedStatus !== 'all') {
      result = result.filter(a => (a.status || 'active') === selectedStatus);
    }

    if (searchName.trim() !== '') {
      const q = searchName.trim().toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q));
    }

    setFilteredAgents(result);
  };

  useEffect(() => {
    applyFilters();
  }, [selectedClientId, selectedStatus, searchName, agents]);

  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentDB | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    photo: '',
    client_id: 0
  });
  const [uploading, setUploading] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAgent) {
        const res = await fetch(`/api/agents/${editingAgent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: formData.client_id,
            name: formData.name,
            description: formData.description,
            photo: formData.photo,
          })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Error al actualizar agente');
      } else {
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: formData.client_id,
            name: formData.name,
            description: formData.description,
            photo: formData.photo,
            status: 'active'
          })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Error al crear agente');
      }

      const resList = await fetch('/api/agents');
      const listData = await resList.json();
      if (listData.ok && listData.agents) {
        setAgents(listData.agents);
      }

      resetForm();
    } catch (err: any) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: err.message || 'Error al guardar el agente',
        type: 'error',
      });
    }
  };

  const handleEdit = (agent: AgentDB) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description || '',
      photo: agent.photo || '',
      client_id: agent.client_id
    });
    setShowForm(true);
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
      message: '¿Estás seguro de eliminar este agente?',
      type: 'warning',
      deleteId: id,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || 'Error al eliminar agente');
          setAgents(prev => prev.filter(a => a.id !== id));
        } catch (err: any) {
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: err.message || 'Error al eliminar',
            type: 'error',
          });
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', photo: '', client_id: 0 });
    setEditingAgent(null);
    setShowForm(false);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const permissions = getPermissions();
  const userId = getUserId();
  const canCreate = permissions?.type === 'admin' || permissions?.agentes?.createOwn === true || permissions?.agentes?.createAll === true;
  const canEdit = permissions?.type === 'admin' || permissions?.agentes?.editOwn === true || permissions?.agentes?.editAll === true;
  const canDelete = permissions?.type === 'admin' || permissions?.agentes?.editOwn === true || permissions?.agentes?.editAll === true;

  const canViewAgent = (agent: AgentDB) => {
    if (permissions?.type === 'admin') return true;
    if (permissions?.agentes?.viewAll === true) return true;
    if (permissions?.agentes?.viewOwn === true && userId && agent.client_id === parseInt(userId)) return true;
    return false;
  };

  const canEditAgent = (agent: AgentDB) => {
    if (permissions?.type === 'admin') return true;
    if (permissions?.agentes?.editAll === true) return true;
    if (permissions?.agentes?.editOwn === true && userId && agent.client_id === parseInt(userId)) return true;
    return false;
  };

  return (
    <ProtectedLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agentes</h1>
        {canCreate && (
          <button
            onClick={() => router.push('/agentes/crear')}
            className="px-4 py-2 text-gray-900 rounded-lg hover:opacity-90 transition-all"
            style={{ backgroundColor: '#5DE1E5' }}
          >
            + Nuevo Agente
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingAgent ? 'Editar Agente' : 'Nuevo Agente'}
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
                    Cliente
                  </label>
                  <select
                    required
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                  >
                    <option value="0">Selecciona un cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                  ></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Foto
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 1 * 1024 * 1024) {
                          setAlertModal({
                            isOpen: true,
                            title: 'Validación',
                            message: 'La imagen no puede ser mayor a 1 MB',
                            type: 'warning',
                          });
                          return;
                        }

                        setUploading(true);

                        try {
                          const uploadFormData = new FormData();
                          uploadFormData.append('file', file);

                          const response = await fetch('/api/upload-agent-avatar', {
                            method: 'POST',
                            body: uploadFormData
                          });

                          const data = await response.json();

                          if (response.ok) {
                            setFormData({ ...formData, photo: data.url });
                          } else {
                            setAlertModal({
                              isOpen: true,
                              title: 'Error',
                              message: data.error || 'Error al subir la imagen',
                              type: 'error',
                            });
                          }
                        } catch (error) {
                          console.error('Error uploading image:', error);
                          setAlertModal({
                            isOpen: true,
                            title: 'Error',
                            message: 'Error al subir la imagen',
                            type: 'error',
                          });
                        } finally {
                          setUploading(false);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                  {formData.photo && (
                    <div className="mt-2">
                      <img 
                        src={formData.photo} 
                        alt="Preview" 
                        className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <p className="text-xs text-gray-500 mt-1">Preview de la imagen</p>
                    </div>
                  )}
                  {uploading && (
                    <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
                      Subiendo imagen...
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 text-gray-900 rounded-lg hover:opacity-90 transition-all"
                  style={{ backgroundColor: '#5DE1E5' }}
                >
                  {editingAgent ? 'Actualizar' : 'Guardar'}
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

      {/* Filtros */}
      {permissions?.type === 'admin' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-full sm:w-72">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                >
                  <option value="all">Todos los clientes</option>
                  {sortedClients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-56">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>

              <div className="w-full sm:w-72">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                />
              </div>

              {(selectedClientId !== 'all' || selectedStatus !== 'all' || searchName.trim() !== '') && (
                <button
                  onClick={() => {
                    setSelectedClientId('all');
                    setSelectedStatus('all');
                    setSearchName('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
      )}

      {/* Grid de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!agentsLoading && filteredAgents.map((agent) => {
          const isInactive = agent.status === 'inactive';
          const workflowsInfo = parseWorkflows(agent.workflows);
          const knowledgeInfo = parseKnowledge(agent.knowledge);
          const agentModules = modulesByAgent[agent.id] || [];

          return (
            <div
              key={agent.id}
              className={`rounded-xl p-5 transition-all group ${
                isInactive
                  ? 'bg-gray-50 border border-gray-200 opacity-70 grayscale-[0.3]'
                  : 'bg-white border border-gray-200 hover:border-[#5DE1E5] hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <AgentAvatar photo={agent.photo} name={agent.name} size={14} description={agent.description} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-semibold truncate transition-colors ${
                      isInactive ? 'text-gray-500' : 'text-gray-900 group-hover:text-[#5DE1E5]'
                    }`}>
                      {agent.name.toUpperCase()}
                    </h3>
                    <StatusBadge status={agent.status} />
                  </div>
                  {agent.description && (
                    <p className={`text-xs mt-1 line-clamp-2 ${
                      isInactive ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {agent.description}
                    </p>
                  )}
                </div>
              </div>

              {(() => {
                const clientName = clients.find(c => c.id === agent.client_id)?.name || agent.client_name || '';
                return clientName ? (
                  <div className={`mt-3 pt-3 border-t ${isInactive ? 'border-gray-200' : 'border-gray-100'}`}>
                    <div className={`flex items-center gap-2 text-xs ${isInactive ? 'text-gray-400' : 'text-gray-500'}`}>
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {clientName}
                    </div>
                  </div>
                ) : null;
              })()}

              <div className={`mt-3 flex items-center gap-3 text-xs flex-wrap ${isInactive ? 'text-gray-300' : 'text-gray-400'}`}>
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 21h10" />
                  </svg>
                  {workflowsInfo.count} flujo{workflowsInfo.count !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {knowledgeInfo.count} índice{knowledgeInfo.count !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {agentModules.length} módulo{agentModules.length !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1 ml-auto">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  #{agent.agent_code || agent.id}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                {canViewAgent(agent) && (
                  <>
                    <button
                      onClick={() => router.push(`/agentes/${agent.id}/editar`)}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                        canEditAgent(agent)
                          ? 'text-gray-900 hover:opacity-90'
                          : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                      }`}
                      style={canEditAgent(agent) ? { backgroundColor: '#5DE1E5' } : {}}
                    >
                      {canEditAgent(agent) ? 'Editar' : 'Ver Detalle'}
                    </button>
                    {canEditAgent(agent) && (
                      <button
                        onClick={() => handleDelete(agent.id)}
                        className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Eliminar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <NoticeModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
      
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