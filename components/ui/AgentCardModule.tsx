'use client';

import { useEffect, useState } from 'react';
import AgentCard from '@/components/ui/AgentCard';

interface Agent {
  id: number;
  name: string;
  photo?: string | null;
  description?: string | null;
  client_name?: string;
  client_id?: number;
  agent_code?: string;
  status?: string;
  email?: string;
  phone?: string;
  knowledge?: { indexes?: number };
  workflows?: { workflowIds?: number[] };
}

export default function AgentCardModule() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data.agents ?? [];
        setAgents(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? agents : agents.filter(a => a.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#5DE1E5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-[#5DE1E5] text-black'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400">{filtered.length} agente{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(agent => {
          const isActive = agent.status === 'active';
          const clientName = agent.client_name
            ? agent.client_name.charAt(0).toUpperCase() + agent.client_name.slice(1)
            : '';
          const agentCode = agent.agent_code || agent.id;
          const workflowCount = agent.workflows?.workflowIds?.length || 0;
          const indexCount = agent.knowledge?.indexes || 0;

          return (
            <AgentCard
              key={agent.id}
              agent={agent}
              clientName={clientName}
              metrics={[
                {
                  icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 21h10" />
                  </svg>,
                  text: `${workflowCount} flujo${workflowCount !== 1 ? 's' : ''}`
                },
                {
                  icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>,
                  text: `${indexCount} índice${indexCount !== 1 ? 's' : ''}`
                },
                {
                  icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>,
                  text: `#${agentCode}`,
                  alignRight: true
                }
              ]}
            >
              <div className="flex flex-wrap gap-1.5">
                <button className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors">
                  info
                </button>
                <button className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                  confirm
                </button>
                <button className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
                  warning
                </button>
                <button className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                  error
                </button>
              </div>
            </AgentCard>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No hay agentes con ese estado
        </div>
      )}
    </div>
  );
}