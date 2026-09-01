'use client';

import { useEffect, useState } from 'react';

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

const AgentAvatar = ({ photo, name, size = 14 }: { photo?: string | null; name: string; size?: number }) => {
  const [imgError, setImgError] = useState(false);
  const px = size * 4;
  return (
    <div
      className="shrink-0 rounded-full overflow-hidden bg-gray-100 ring-2 ring-white"
      style={{ width: px, height: px, minWidth: px, minHeight: px }}
    >
      {photo && !imgError ? (
        <img alt="" src={photo} className="w-full h-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#5DE1E5] to-[#4BC5C9] flex items-center justify-center text-white font-bold" style={{ fontSize: px * 0.4 }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status?: string }) => {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
    pause: 'bg-yellow-100 text-yellow-700',
  };
  const labels: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    pause: 'Pausado',
  };
  const color = colors[status || ''] || 'bg-gray-100 text-gray-500';
  const label = labels[status || ''] || status || 'Desconocido';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'active' ? 'bg-green-500' : status === 'pause' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
      {label}
    </span>
  );
};

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
          const clientName = agent.client_name
            ? agent.client_name.charAt(0).toUpperCase() + agent.client_name.slice(1)
            : '';
          const agentCode = agent.agent_code || agent.id;
          const workflowCount = agent.workflows?.workflowIds?.length || 0;
          const indexCount = agent.knowledge?.indexes || 0;

          return (
            <div
              key={agent.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#5DE1E5] hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-3">
                <AgentAvatar photo={agent.photo} name={agent.name} size={10} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#5DE1E5] transition-colors">
                      {agent.name.toUpperCase()}
                    </h3>
                    <StatusBadge status={agent.status} />
                  </div>
                  {agent.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{agent.description}</p>
                  )}
                </div>
              </div>

              {clientName && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {clientName}
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 21h10" />
                  </svg>
                  {workflowCount} flujo{workflowCount !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {indexCount} índice{indexCount !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1 ml-auto">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  #{agentCode}
                </span>
              </div>
            </div>
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