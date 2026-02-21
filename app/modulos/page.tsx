'use client';

import { useEffect, useMemo, useState, Fragment } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import NoticeModal from '@/components/ui/NoticeModal';
import settings from '@/settings.json';
import { getPermissions } from '@/utils/permissions';
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, ComboboxButton } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';

interface Agent {
  id: number;
  name: string;
  client_id: number;
  conversation_agent_name?: string;
  photo?: string | null;
}

interface ModuleItem {
  id: number;
  agent_id: number;
  title: string;
  folder_name: string;
  description: string | null;
  agent_name: string;
  agent_photo?: string | null;
  client_name?: string;
  client_id?: number;
  created_at: string;
}

export default function ModulosPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [formData, setFormData] = useState({ agent_id: '', title: '', description: '' });
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<Agent | null>(null);
  const [agentQuery, setAgentQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => a.name.localeCompare(b.name));
  }, [agents]);

  const filteredAgentsForCombobox = useMemo(() => {
    if (!agentQuery) return sortedAgents;
    return sortedAgents.filter(agent =>
      agent.name.toLowerCase().includes(agentQuery.toLowerCase())
    );
  }, [sortedAgents, agentQuery]);

  const filteredModules = useMemo(() => {
    if (!selectedAgentFilter) return modules;
    return modules.filter(m => m.agent_id === selectedAgentFilter.id);
  }, [modules, selectedAgentFilter]);

  useEffect(() => {
    const permissions = getPermissions();
    const adminStatus = permissions?.type === 'admin';
    setIsAdmin(adminStatus);
    loadAgentsWithPermissions(adminStatus, permissions);
    loadModulesWithPermissions(adminStatus, permissions);
  }, []);

  const loadAgentsWithPermissions = async (isAdminUser: boolean, permissions: any) => {
    try {
      setLoadingAgents(true);
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.ok) {
        let agentsToShow = data.agents || [];
        if (!isAdminUser) {
          const userClientId = permissions?.clientId;
          if (userClientId) {
            agentsToShow = agentsToShow.filter((agent: Agent) => agent.client_id === userClientId);
          } else {
            agentsToShow = [];
          }
        }
        setAgents(agentsToShow);
      } else {
        throw new Error(data.error || 'No se pudieron cargar los agentes');
      }
    } catch (error: any) {
      console.error('[MODULOS] Error cargando agentes:', error);
      setAlertModal({ isOpen: true, title: 'Error', message: 'No se pudieron cargar los agentes: ' + (error?.message || 'Error desconocido'), type: 'error' });
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadModulesWithPermissions = async (isAdminUser: boolean, permissions: any) => {
    try {
      setLoadingModules(true);
      const res = await fetch('/api/modules');
      const data = await res.json();
      if (data.ok) {
        let modulesToShow = data.modules || [];
        if (!isAdminUser) {
          const userClientId = permissions?.clientId;
          if (userClientId) {
            modulesToShow = modulesToShow.filter((module: ModuleItem) => module.client_id === userClientId);
          } else {
            modulesToShow = [];
          }
        }
        setModules(modulesToShow);
      } else {
        throw new Error(data.error || 'No se pudieron cargar los modulos');
      }
    } catch (error: any) {
      console.error('[MODULOS] Error cargando modulos:', error);
      setAlertModal({ isOpen: true, title: 'Error', message: 'No se pudieron cargar los modulos: ' + (error?.message || 'Error desconocido'), type: 'error' });
    } finally {
      setLoadingModules(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agent_id || !formData.title.trim()) {
      setAlertModal({ isOpen: true, title: 'Validacion', message: 'Selecciona un agente y escribe un titulo.', type: 'warning' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: Number(formData.agent_id),
          title: formData.title.trim(),
          description: formData.description.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo crear el modulo');

      setAlertModal({ isOpen: true, title: 'Exito', message: 'Modulo creado correctamente.', type: 'success' });
      setFormData({ agent_id: '', title: '', description: '' });
      setShowCreateModal(false);
      const permissions = getPermissions();
      loadModulesWithPermissions(isAdmin, permissions);
    } catch (error: any) {
      console.error('[MODULOS] Error creando modulo:', error);
      setAlertModal({ isOpen: true, title: 'Error', message: 'No se pudo crear el modulo: ' + (error?.message || 'Error desconocido'), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const AgentAvatar = ({ photo, name, size = 'md' }: { photo?: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-sm' };
    const [imgError, setImgError] = useState(false);
    
    if (photo && !imgError) {
      return <img src={photo} alt={name} className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0`} onError={() => setImgError(true)} />;
    }
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-[#5DE1E5] to-[#4BC5C9] flex items-center justify-center text-white font-bold flex-shrink-0`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <ProtectedLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modulos</h1>
          <p className="text-gray-600 mt-1">Modulos asociados a tus agentes.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
            Version {settings.proyecto.version}
          </span>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] transition-colors font-semibold text-sm"
            >
              Crear modulo
            </button>
          )}
        </div>
      </div>

      {/* Filtro con Combobox searchable */}
      <div className="flex items-center gap-3 mb-6">
        <Combobox value={selectedAgentFilter} onChange={setSelectedAgentFilter}>
          <div className="relative w-72">
            <div className="relative">
              <ComboboxInput
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent text-sm bg-white"
                displayValue={(agent: Agent | null) => agent?.name || ''}
                onChange={(e) => setAgentQuery(e.target.value)}
                placeholder="Buscar agente..."
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                {selectedAgentFilter ? (
                  <AgentAvatar photo={selectedAgentFilter.photo} name={selectedAgentFilter.name} size="sm" />
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
              <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </ComboboxButton>
            </div>
            <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg border border-gray-200">
              <ComboboxOption
                value={null}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-[#5DE1E5] text-white' : 'text-gray-900'}`
                }
              >
                {({ selected, active }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      Todos los agentes
                    </span>
                    {selected && (
                      <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-[#5DE1E5]'}`}>
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </ComboboxOption>
              {filteredAgentsForCombobox.map((agent) => (
                <ComboboxOption
                  key={agent.id}
                  value={agent}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-[#5DE1E5] text-white' : 'text-gray-900'}`
                  }
                >
                  {({ selected, active }) => (
                    <>
                      <div className="flex items-center gap-2">
                        <AgentAvatar photo={agent.photo} name={agent.name} size="sm" />
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {agent.name}
                        </span>
                      </div>
                      {selected && (
                        <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-[#5DE1E5]'}`}>
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </ComboboxOption>
              ))}
            </ComboboxOptions>
          </div>
        </Combobox>
        <span className="text-sm text-gray-500">{filteredModules.length} modulo(s)</span>
      </div>

      {/* Grid de cards */}
      {loadingModules ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin h-10 w-10 border-4 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {selectedAgentFilter ? 'No hay modulos para este agente.' : 'Aun no hay modulos registrados.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredModules.map((module) => (
            <div
              key={module.id}
              onClick={() => window.location.href = `/modulos/${module.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-[#5DE1E5] hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <AgentAvatar photo={module.agent_photo} name={module.agent_name} size="lg" />
                <span className="text-xs text-gray-400">
                  {new Date(module.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-[#4BC5C9] transition-colors">{module.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {module.agent_name}
                {module.client_name ? ` - ${module.client_name}` : ''}
              </p>
              {module.description && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{module.description}</p>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400 font-mono">{module.folder_name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear modulo */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Crear nuevo modulo</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agente *</label>
                <select
                  value={formData.agent_id}
                  onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent text-sm"
                  disabled={loadingAgents || isSubmitting}
                  required
                >
                  <option value="">Selecciona un agente</option>
                  {sortedAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} {agent.conversation_agent_name ? `(${agent.conversation_agent_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titulo *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent text-sm"
                  maxLength={255}
                  placeholder="Nombre del modulo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent text-sm"
                  placeholder="Describe brevemente la funcionalidad del modulo"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] transition-colors font-semibold text-sm disabled:opacity-70"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear modulo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <NoticeModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </ProtectedLayout>
  );
}
