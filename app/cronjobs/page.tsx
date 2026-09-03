'use client';

import { useEffect, useState, useMemo } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import AgentSelector from '@/components/ui/AgentSelector';
import { getPermissions } from '@/utils/permissions';

interface Agent {
  id: number;
  name: string;
  client_id: number;
  conversation_agent_name?: string;
  photo?: string | null;
  status?: string;
}

interface CronEntry {
  schedule: string;
  module_id: number | null;
  module_title: string | null;
  folder_name: string | null;
  agent_id: number | null;
  agent_name: string | null;
  command: string;
  is_active: boolean;
}

export default function CronjobsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cronjobs, setCronjobs] = useState<CronEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCronjobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/cronjobs');
      const data = await res.json();
      if (data.ok) {
        setCronjobs(data.cronjobs || []);
      } else {
        throw new Error(data.error || 'Error al cargar cronjobs');
      }
    } catch (e: any) {
      setError(e?.message || 'Error al cargar cronjobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const permissions = getPermissions();
    const isAdmin = permissions?.type === 'admin';
    if (!isAdmin) return;

    const load = async () => {
      try {
        const resAgents = await fetch('/api/agents');
        const dataAgents = await resAgents.json();
        if (dataAgents.ok) {
          const allAgents = (dataAgents.agents || [])
            .filter((a: Agent) => a.status === 'active');
          setAgents(allAgents);
        }
      } catch {
        // silencioso
      }
      await loadCronjobs();
    };
    load();
  }, []);

  // Filtrar cronjobs por agente seleccionado
  const filteredCronjobs = useMemo(() => {
    if (!selectedAgent) return cronjobs;
    return cronjobs.filter(c => c.agent_id === selectedAgent.id);
  }, [cronjobs, selectedAgent]);

  // Extraer el schedule humano
  const formatSchedule = (schedule: string): string => {
    const parts = schedule.split(/\s+/);
    if (parts.length < 5) return schedule;
    const [min, hour, , , ] = parts;
    return `Diario ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  };

  return (
    <ProtectedLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cronjobs</h1>
          <p className="text-gray-600 mt-1">Tareas programadas asociadas a módulos.</p>
        </div>
        <button
          onClick={loadCronjobs}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Recargar'}
        </button>
      </div>

      {/* Filtro por agente */}
      <div className="w-full sm:w-72 mb-6">
        <AgentSelector
          label="Filtrar por Agente"
          agents={agents}
          selectedAgent={selectedAgent}
          onChange={(agent) => {
            if (agent && typeof agent !== 'string') {
              setSelectedAgent(agent as Agent);
            } else {
              setSelectedAgent(null);
            }
          }}
          placeholder="Todos los agentes..."
          loading={false}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin h-10 w-10 border-4 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
        </div>
      )}

      {/* Tabla */}
      {!loading && !error && filteredCronjobs.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          {selectedAgent ? 'Este agente no tiene cronjobs asociados.' : 'No hay cronjobs configurados.'}
        </div>
      )}

      {!loading && filteredCronjobs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Agente</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Módulo</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Horario</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Comando</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredCronjobs.map((entry, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap">
                    {entry.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        Desactivado
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {entry.agent_name || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                    {entry.module_title ? (
                      <a href={`/modulos/${entry.module_id}`} className="text-[#5DE1E5] hover:underline font-medium">
                        {entry.module_title}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatSchedule(entry.schedule)}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500 font-mono max-w-md truncate" title={entry.command}>
                    {entry.command.length > 60 ? entry.command.substring(0, 60) + '...' : entry.command}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        Total: {filteredCronjobs.length} cronjob(s){selectedAgent ? ` para el agente seleccionado` : ''}
      </div>
    </ProtectedLayout>
  );
}