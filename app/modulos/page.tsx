'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import NoticeModal from '@/components/ui/NoticeModal';
import settings from '@/settings.json';
import { getPermissions } from '@/utils/permissions';

interface Agent {
  id: number;
  name: string;
  client_id: number;
  conversation_agent_name?: string;
}

interface ModuleItem {
  id: number;
  agent_id: number;
  title: string;
  folder_name: string;
  description: string | null;
  agent_name: string;
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
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>(''); // Nuevo: filtro por agente
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; moduleId: number | null; moduleName: string }>({
    isOpen: false,
    moduleId: null,
    moduleName: '',
  });

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => a.name.localeCompare(b.name));
  }, [agents]);

  // Filtrar módulos por agente seleccionado
  const filteredModules = useMemo(() => {
    if (!selectedAgentFilter) return modules;
    return modules.filter(m => m.agent_id === Number(selectedAgentFilter));
  }, [modules, selectedAgentFilter]);

  const loadAgents = async () => {
    try {
      setLoadingAgents(true);
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.ok) {
        let agentsToShow = data.agents || [];
        
        // Si no es admin, filtrar solo agentes del mismo cliente
        if (!isAdmin) {
          const permissions = getPermissions();
          const userClientId = permissions?.clientId;
          
          if (userClientId) {
            agentsToShow = agentsToShow.filter((agent: Agent) => {
              return agent.client_id === userClientId;
            });
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
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'No se pudieron cargar los agentes: ' + (error?.message || 'Error desconocido'),
        type: 'error',
      });
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadModules = async () => {
    try {
      setLoadingModules(true);
      const res = await fetch('/api/modules');
      const data = await res.json();
      if (data.ok) {
        let modulesToShow = data.modules || [];
        
        // Si no es admin, filtrar solo módulos de agentes del mismo cliente
        if (!isAdmin) {
          const permissions = getPermissions();
          const userClientId = permissions?.clientId;
          
          if (userClientId) {
            // Filtrar módulos donde el client_id del agente coincida
            modulesToShow = modulesToShow.filter((module: ModuleItem) => {
              return module.client_id === userClientId;
            });
          } else {
            // Si no tiene clientId, no mostrar módulos
            modulesToShow = [];
          }
        }
        
        setModules(modulesToShow);
      } else {
        throw new Error(data.error || 'No se pudieron cargar los módulos');
      }
    } catch (error: any) {
      console.error('[MODULOS] Error cargando módulos:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'No se pudieron cargar los módulos: ' + (error?.message || 'Error desconocido'),
        type: 'error',
      });
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => {
    // Verificar si el usuario es admin
    const permissions = getPermissions();
    setIsAdmin(permissions?.type === 'admin');
    
    loadAgents();
    loadModules();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agent_id || !formData.title.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Validación',
        message: 'Selecciona un agente y escribe un título.',
        type: 'warning',
      });
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
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo crear el módulo');
      }

      setAlertModal({
        isOpen: true,
        title: 'Éxito',
        message: 'Módulo creado correctamente.',
        type: 'success',
      });
      setFormData({ agent_id: '', title: '', description: '' });
      loadModules();
    } catch (error: any) {
      console.error('[MODULOS] Error creando módulo:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'No se pudo crear el módulo: ' + (error?.message || 'Error desconocido'),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteModule = async (moduleId: number) => {
    try {
      const res = await fetch(`/api/modules/${moduleId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo eliminar el módulo');
      }

      setAlertModal({
        isOpen: true,
        title: 'Éxito',
        message: 'Módulo eliminado correctamente.',
        type: 'success',
      });
      setConfirmDelete({ isOpen: false, moduleId: null, moduleName: '' });
      loadModules();
    } catch (error: any) {
      console.error('[MODULOS] Error eliminando módulo:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'No se pudo eliminar el módulo: ' + (error?.message || 'Error desconocido'),
        type: 'error',
      });
    }
  };

  return (
    <ProtectedLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Módulos</h1>
          <p className="text-gray-600 mt-1">Registra módulos asociados a tus agentes para organizar sus funcionalidades.</p>
        </div>
        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
          Versión {settings.proyecto.version}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Crear nuevo módulo</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agente *</label>
              <select
                value={formData.agent_id}
                onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                maxLength={255}
                placeholder="Nombre del módulo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                placeholder="Describe brevemente la funcionalidad del módulo"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] transition-colors font-semibold disabled:opacity-70"
            >
              {isSubmitting ? 'Guardando...' : 'Crear módulo'}
            </button>
          </form>
        </div>
        )}

        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${isAdmin ? '' : 'lg:col-span-2'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Módulos registrados</h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedAgentFilter}
                onChange={(e) => setSelectedAgentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent text-sm"
              >
                <option value="">Todos los agentes</option>
                {sortedAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {filteredModules.length} módulo(s)
              </span>
            </div>
          </div>
          {loadingModules ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin h-10 w-10 border-4 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {selectedAgentFilter ? 'No hay módulos para este agente.' : 'Aún no hay módulos registrados.'}
            </div>
          ) : (
            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {filteredModules.map((module) => (
                <div key={module.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#5DE1E5] transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Asociado a <span className="font-medium text-gray-900">{module.agent_name}</span>
                        {module.client_name ? ` · Cliente: ${module.client_name}` : ''}
                      </p>
                      <div className="text-xs text-gray-500 mt-2">
                        📁 {module.folder_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-gray-500">
                        {new Date(module.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  {module.description && (
                    <p className="text-sm text-gray-700 mt-3 whitespace-pre-line">
                      {module.description}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => window.open(`/modulos/${module.id}`, '_blank')}
                      className="flex-1 px-4 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      Abrir Módulo
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setConfirmDelete({ isOpen: true, moduleId: module.id, moduleName: module.title })}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                        title="Eliminar módulo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NoticeModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Modal de confirmación de eliminación */}
      {confirmDelete.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Confirmar eliminación</h3>
            </div>
            <p className="text-gray-700 mb-6">
¿Estás seguro de que deseas eliminar el módulo <strong>&quot;{confirmDelete.moduleName}&quot;</strong>? Esta acción no se puede deshacer.

            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete({ isOpen: false, moduleId: null, moduleName: '' })}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmDelete.moduleId && handleDeleteModule(confirmDelete.moduleId)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}


