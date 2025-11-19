'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import NoticeModal from '@/components/ui/NoticeModal';
import settings from '@/settings.json';

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
  description: string | null;
  agent_name: string;
  client_name?: string;
  created_at: string;
}

export default function ModulosPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [formData, setFormData] = useState({ agent_id: '', title: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => a.name.localeCompare(b.name));
  }, [agents]);

  const loadAgents = async () => {
    try {
      setLoadingAgents(true);
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.ok) {
        setAgents(data.agents || []);
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
        setModules(data.modules || []);
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Módulos registrados</h2>
            <span className="text-sm text-gray-500">{modules.length} módulo(s)</span>
          </div>
          {loadingModules ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin h-10 w-10 border-4 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              Aún no hay módulos registrados.
            </div>
          ) : (
            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {modules.map((module) => (
                <div key={module.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#5DE1E5] transition-colors">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                    <span className="text-xs text-gray-500">
                      {new Date(module.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Asociado a <span className="font-medium text-gray-900">{module.agent_name}</span>
                    {module.client_name ? ` · Cliente: ${module.client_name}` : ''}
                  </p>
                  {module.description && (
                    <p className="text-sm text-gray-700 mt-3 whitespace-pre-line">
                      {module.description}
                    </p>
                  )}
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
    </ProtectedLayout>
  );
}


