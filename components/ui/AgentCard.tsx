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
  onEdit?: () => void;
  onDelete?: () => void;
  /** If true shows "Editar" (teal) / "Eliminar"; if false shows "Ver Detalle" (gray) */
  canEdit?: boolean;
}

export default function AgentCard({ agent, clientName, metrics = [], onEdit, onDelete, canEdit }: AgentCardProps) {
  const isActive = agent.status === 'active';

  return (
    <div
      className={`rounded-xl p-5 transition-all group ${
        isActive
          ? 'bg-white border border-gray-200 hover:border-[#5DE1E5] hover:shadow-sm'
          : 'bg-gray-50 border border-gray-200 opacity-70 grayscale-[0.3]'
      }`}
    >
      {/* Avatar + info con tooltip de ancho completo */}
      {agent.description ? (
        <div className="group/tooltip relative">
          <div className="flex items-start gap-4">
            <AgentAvatar photo={agent.photo} name={agent.name} size={14} />
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
          <div className="absolute bottom-full left-0 right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-normal text-center z-50">
            {agent.description}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          <AgentAvatar photo={agent.photo} name={agent.name} size={14} />
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
          </div>
        </div>
      )}

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

      {/* Acciones — mismo markup en todas las páginas */}
      {(onEdit || onDelete) && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                canEdit
                  ? 'text-gray-900 hover:opacity-90'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
              style={canEdit ? { backgroundColor: '#5DE1E5' } : {}}
            >
              {canEdit ? 'Editar' : 'Ver Detalle'}
            </button>
          )}
          {canEdit && onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
}