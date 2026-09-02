'use client';

import AgentAvatar from '@/components/ui/AgentAvatar';
import StatusBadge from '@/components/ui/StatusBadge';
import { ReactNode } from 'react';

export interface AgentCardMetric {
  icon: ReactNode;
  text: string;
  alignRight?: boolean;
}

interface AgentCardProps {
  agent: {
    id: number;
    name: string;
    photo?: string | null;
    description?: string | null;
    status?: string;
  };
  clientName?: string;
  metrics?: AgentCardMetric[];
  children?: ReactNode;
}

export default function AgentCard({ agent, clientName, metrics = [], children }: AgentCardProps) {
  const isActive = agent.status === 'active';
  const isInactive = agent.status === 'inactive';

  return (
    <div
      className={`rounded-xl p-5 transition-all group ${
        isActive
          ? 'bg-white border border-gray-200 hover:border-[#5DE1E5] hover:shadow-sm'
          : 'bg-gray-50 border border-gray-200 opacity-70 grayscale-[0.3]'
      }`}
    >
      {/* Avatar + info */}
      <div className="flex items-start gap-4">
        <AgentAvatar photo={agent.photo} name={agent.name} size={14} description={agent.description} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={`text-sm font-semibold truncate transition-colors ${
                isActive ? 'text-gray-900 group-hover:text-[#5DE1E5]' : 'text-gray-500'
              }`}
            >
              {agent.name.toUpperCase()}
            </h3>
            <StatusBadge status={agent.status} />
          </div>
          {agent.description && (
            <p
              className={`text-xs mt-1 line-clamp-2 ${
                isActive ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              {agent.description}
            </p>
          )}
        </div>
      </div>

      {/* Cliente */}
      {clientName && (
        <div className={`mt-3 pt-3 border-t ${isActive ? 'border-gray-100' : 'border-gray-200'}`}>
          <div className={`flex items-center gap-2 text-xs ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {clientName}
          </div>
        </div>
      )}

      {/* Métricas */}
      {metrics.length > 0 && (
        <div className={`mt-3 flex items-center gap-3 text-xs flex-wrap ${isActive ? 'text-gray-400' : 'text-gray-300'}`}>
          {metrics.map((m, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1${m.alignRight ? ' ml-auto' : ''}`}
            >
              {m.icon}
              {m.text}
            </span>
          ))}
        </div>
      )}

      {/* Acciones */}
      {children && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}