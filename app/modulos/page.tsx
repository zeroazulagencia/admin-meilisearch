'use client';

import { useEffect, useMemo, useState } from 'react';
import AgentCard, { AgentCardMetric } from '@/components/ui/AgentCard';
import ProtectedLayout from '@/components/ProtectedLayout';
import NoticeModal from '@/components/ui/NoticeModal';
import settings from '@/settings.json';
import { getPermissions } from '@/utils/permissions';
import AgentSelector from '@/components/ui/AgentSelector';

interface Agent {
  id: number;
  name: string;
  client_id: number;
  conversation_agent_name?: string;
  photo?: string | null;
  status?: string;
}

interface ModuleItem {
  id: number;
  agent_id: number;
  title: string;
  folder_name: string;
  is_active: number;
  description: string | null;
  agent_name: string;
  agent_photo?: string | null;
  client_name?: string;
  client_id?: number;
  created_at: string;
  error_count?: number;
}

export default function ModulosPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [formData, setFormData] = useState({ agent_id: '', title: '', description: '' });
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<Agent | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'activos' | 'inactivos' | 'todos'>('activos');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [togglingModuleId, setTogglingModuleId] = useState<number | null>(null);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => a.name.localeCompare(b.name));
  }, [agents]);

  const filteredModules = useMemo(() => {
    let result = modules;
    if (selectedAgentFilter) {
      result = result.filter(m => m.agent_id === selectedAgentFilter.id);
    }
    if (selectedStatusFilter === 'activos') {
      result = result.filter(m => m.is_active === 1);
    } else if (selectedStatusFilter === 'inactivos') {
      result = result.filter(m => m.is_active === 0);
    }
    return result;
  }, [modules, selectedAgentFilter, selectedStatusFilter]);

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
        // Filtrar solo agentes activos
        agentsToShow = agentsToShow.filter((agent: Agent) => agent.status === 'active');
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

  const toggleModuleActive = async (moduleId: number, nextActive: boolean) => {
    try {
      setTogglingModuleId(moduleId);
      const res = await fetch(`/api/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive ? 1 : 0 }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo actualizar el modulo');
      setAlertModal({ isOpen: true, title: 'Exito', message: data.message || 'Modulo actualizado.', type: 'success' });
      const permissions = getPermissions();
      loadModulesWithPermissions(isAdmin, permissions);
    } catch (error: any) {
      console.error('[MODULOS] Error cambiando estado:', error);
      setAlertModal({ isOpen: true, title: 'Error', message: 'No se pudo cambiar el estado: ' + (error?.message || 'Error desconocido'), type: 'error' });
    } finally {
      setTogglingModuleId(null);
    }
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

      {/* Filtros (solo visibles para admin): Agente + Estado */}
      {isAdmin && (
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div className="w-full sm:w-72">
            <AgentSelector
              label="Seleccionar Agente"
              agents={agents}
              selectedAgent={selectedAgentFilter}
              onChange={(agent) => {
                if (agent && typeof agent !== 'string') {
                  setSelectedAgentFilter(agent as Agent);
                } else {
                  setSelectedAgentFilter(null);
                }
              }}
              placeholder="Seleccionar agente..."
              loading={loadingAgents}
              className="w-full"
            />
          </div>

          <div className="w-full sm:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as 'activos' | 'inactivos' | 'todos')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent text-sm bg-white"
            >
              <option value="activos">Solo activos</option>
              <option value="inactivos">Solo inactivos</option>
              <option value="todos">Todos los estados</option>
            </select>
          </div>

          <span className="text-sm text-gray-500 pb-2">{filteredModules.length} modulo(s)</span>
        </div>
      )}

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
          {filteredModules.map((module) => {
            // Legacy: si is_active no viene (viejos) o es null, se considera activo salvo los 6 legacy desactivados
            const LEGACY_DISABLED = [
              'bridge-siigo',
              'sincronizador-usados-autolarte',
              'verificador-mobilia',
              'endpoints-anal-tica-biury',
              'sistema-de-cambio-de-fondos-y-placas',
              'biury-pagos',
            ];
            const isDisabled = module.is_active === undefined || module.is_active === null
              ? LEGACY_DISABLED.includes(module.folder_name)
              : module.is_active === 0;

            const metrics: AgentCardMetric[] = [];
            if (module.folder_name) {
              metrics.push({
                icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
                text: module.folder_name,
              });
            }
            if ([1, 6].includes(module.id) && (module.error_count || 0) > 0) {
              metrics.push({
                icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                text: `${module.error_count} error${module.error_count !== 1 ? 'es' : ''}`,
              });
            }
            metrics.push({
              icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
              text: new Date(module.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
              alignRight: true,
            });

            const clientName = module.agent_name + (module.client_name ? ` · ${module.client_name}` : '');

            return (
              <AgentCard
                key={module.id}
                agent={{
                  id: module.agent_id,
                  name: module.title,
                  photo: module.agent_photo,
                  description: module.description,
                  status: isDisabled ? 'inactive' : 'active',
                }}
                clientName={clientName}
                metrics={metrics}
                canEdit={true}
                onEdit={() => { window.location.href = `/modulos/${module.id}`; }}
                onDelete={isAdmin ? () => toggleModuleActive(module.id, !isDisabled) : undefined}
                deleteLabel={isDisabled ? 'Activar' : 'Desactivar'}
              />
            );
          })}
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
