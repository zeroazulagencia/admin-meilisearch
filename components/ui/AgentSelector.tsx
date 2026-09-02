'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import AgentAvatar from '@/components/ui/AgentAvatar';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import { CheckIcon } from '@heroicons/react/20/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Agent {
  id: number | string;
  name: string;
  photo?: string | null;
  description?: string | null;
  client_id?: number;
  client_name?: string;
  status?: string;
  [key: string]: any;
}

interface AgentSelectorProps {
  label: string;
  agents: Agent[];
  selectedAgent: Agent | null | string;
  onChange: (agent: Agent | null | string) => void;
  placeholder?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  loading?: boolean;
  className?: string;
}

function formatAgent(agent: Agent): string {
  const nameUpper = agent.name.toUpperCase();
  const clientName = agent.client_name
    ? agent.client_name.charAt(0).toUpperCase() + agent.client_name.slice(1)
    : '';
  return clientName ? `${nameUpper} - ${clientName}` : nameUpper;
}

export default function AgentSelector({
  label,
  agents,
  selectedAgent,
  onChange,
  placeholder = 'Seleccionar agente...',
  includeAllOption = false,
  allOptionLabel = 'Todos los agentes',
  loading = false,
  className = '',
}: AgentSelectorProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getSelectedAgentObject = (): Agent | null => {
    if (!selectedAgent) return null;
    if (typeof selectedAgent === 'string') {
      if (selectedAgent === 'all') return null;
      return agents.find(a => a.id.toString() === selectedAgent) || null;
    }
    return selectedAgent;
  };

  const currentSelected = getSelectedAgentObject();

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Opción "Todos" si aplica
  const allOption = includeAllOption ? { id: 'all' as const, name: allOptionLabel, photo: null, client_name: undefined, status: undefined, description: undefined } : null;
  const displayAgents = allOption ? [allOption, ...agents] : agents;

  const filteredAgents = useMemo(
    () =>
      query === ''
        ? displayAgents
        : displayAgents.filter(a => {
            if (a.id === 'all') return true;
            const text = formatAgent(a).toLowerCase();
            const name = a.name.toLowerCase();
            const client = (a.client_name ?? '').toLowerCase();
            return (
              text.includes(query.toLowerCase()) ||
              name.includes(query.toLowerCase()) ||
              client.includes(query.toLowerCase())
            );
          }),
    [displayAgents, query]
  );

  if (loading) {
    return (
      <div className={className}>
        {label && <label className="block text-sm/6 font-medium text-gray-900 mb-2">{label}</label>}
        <div className="text-sm flex items-center gap-2 text-[#5DE1E5]">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-[#5DE1E5]"></div>
          Cargando agentes...
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && <label className="block text-sm/6 font-medium text-gray-900 mb-2">{label}</label>}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder}
            value={currentSelected && !open ? formatAgent(currentSelected) : query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5DE1E5] focus:border-[#5DE1E5] transition-shadow"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
          >
            <ChevronDownIcon
              className={`size-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {open && (
          <div className="absolute z-10 mt-1.5 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg text-sm max-h-64 overflow-auto">
            {filteredAgents.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-400">
                No se encontraron agentes
              </div>
            ) : (
              filteredAgents.map(agent => {
                const isSelected = currentSelected?.id === agent.id;
                const isAll = agent.id === 'all';
                const isInactive = !isAll && agent.status && agent.status !== 'active';

                return (
                  <div
                    key={agent.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (isAll) {
                        onChange('all');
                      } else {
                        onChange(agent);
                      }
                      setQuery('');
                      setOpen(false);
                    }}
                    className={`group relative cursor-default py-2 pl-3 pr-9 select-none ${
                      isInactive ? 'text-gray-400 hover:text-gray-500 hover:bg-gray-50' : 'text-gray-900 hover:bg-[#5DE1E5] hover:text-white'
                    } ${
                      isSelected ? 'bg-[#5DE1E5]/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isAll ? (
                        <div
                          className="shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium"
                          style={{ width: 48, height: 48, minWidth: 48, minHeight: 48 }}
                        >
                          <span className="text-lg">⊞</span>
                        </div>
                      ) : (
                        <AgentAvatar photo={agent.photo} name={agent.name} size={12} description={agent.description} />
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm ${
                            isSelected ? 'font-semibold' : 'font-normal'
                          }`}
                        >
                          {formatAgent(agent)}
                        </span>
                      </div>
                      {!isAll && isInactive && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                          Inactivo
                        </span>
                      )}
                      {isSelected && (
                        <span className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                          isInactive ? 'text-gray-300' : 'text-[#5DE1E5] group-hover:text-white'
                        }`}>
                          <CheckIcon className="size-4" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
