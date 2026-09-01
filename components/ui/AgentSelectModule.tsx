'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import { CheckIcon } from '@heroicons/react/20/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Agent {
  id: number;
  name: string;
  status: string;
  photo?: string | null;
  description?: string | null;
  client_id?: number;
  agent_code?: string;
  client_name?: string;
}

function formatAgent(agent: Agent): string {
  const nameUpper = agent.name.toUpperCase();
  const clientName = agent.client_name
    ? agent.client_name.charAt(0).toUpperCase() + agent.client_name.slice(1)
    : '';
  return clientName ? `${nameUpper} - ${clientName}` : nameUpper;
}

const AgentTooltip = ({ description, children }: { description?: string | null; children: React.ReactNode }) => {
  if (!description) return <>{children}</>;
  return (
    <div className="group/tooltip relative inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-normal max-w-[220px] text-center z-50">
        {description}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-gray-900 rotate-45" />
      </div>
    </div>
  );
};

const AgentAvatar = ({
  photo,
  name,
  size = 12,
  description,
}: {
  photo?: string | null;
  name: string;
  size?: number;
  description?: string | null;
}) => {
  const [imgError, setImgError] = useState(false);
  const px = size * 4;

  const avatar = (
    <div
      className="shrink-0 rounded-full overflow-hidden bg-gray-100"
      style={{ width: px, height: px, minWidth: px, minHeight: px }}
    >
      {photo && !imgError ? (
        <img
          alt=""
          src={photo}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#5DE1E5] to-[#4BC5C9] flex items-center justify-center text-white font-bold text-xs">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
  return <AgentTooltip description={description}>{avatar}</AgentTooltip>;
};

export default function AgentSelectModule() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => {
        const list = data.agents ?? data.data ?? (Array.isArray(data) ? data : []);
        setAgents(list);
      })
      .catch(err => console.error('Error loading agents:', err))
      .finally(() => setLoading(false));
  }, []);

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

  const statusFilteredAgents = useMemo(
    () =>
      agents.filter(a => {
        if (showActive && a.status === 'active') return true;
        if (showInactive && a.status !== 'active') return true;
        return false;
      }),
    [agents, showActive, showInactive]
  );

  const searchFilteredAgents = useMemo(
    () =>
      query === ''
        ? statusFilteredAgents
        : statusFilteredAgents.filter(a => {
            const label = formatAgent(a).toLowerCase();
            const name = a.name.toLowerCase();
            const client = (a.client_name ?? '').toLowerCase();
            return (
              label.includes(query.toLowerCase()) ||
              name.includes(query.toLowerCase()) ||
              client.includes(query.toLowerCase()) ||
              a.id.toString() === query
            );
          }),
    [statusFilteredAgents, query]
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-600">
          Selector de agentes con búsqueda y filtro por estado.
        </p>
      </div>

      {/* Props */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          Props / Parámetros
        </h3>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showActive}
              onChange={e => {
                setShowActive(e.target.checked);
                setQuery('');
              }}
              className="w-4 h-4 rounded border-gray-300 text-[#5DE1E5] focus:ring-[#5DE1E5]"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">showActive</span>
              <p className="text-xs text-gray-500">Mostrar agentes activos</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => {
                setShowInactive(e.target.checked);
                setQuery('');
              }}
              className="w-4 h-4 rounded border-gray-300 text-[#5DE1E5] focus:ring-[#5DE1E5]"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">showInactive</span>
              <p className="text-xs text-gray-500">Mostrar agentes inactivos</p>
            </div>
          </label>
        </div>

        <div className="text-xs text-gray-500">
          {loading ? (
            <span>Cargando agentes...</span>
          ) : (
            <span>
              {statusFilteredAgents.length} de {agents.length} agente
              {agents.length !== 1 ? 's' : ''} visible
              {statusFilteredAgents.length !== 1 ? 's' : ''}
              {!showActive && !showInactive && ' (selecciona al menos un filtro)'}
            </span>
          )}
        </div>
      </div>

      {/* Agent Select */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          Agent Select
        </h3>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-[#5DE1E5]" />
            Cargando agentes...
          </div>
        ) : (
          <div ref={containerRef} className="relative">
            {/* Input de búsqueda */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar agente..."
                value={query}
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

            {/* Dropdown */}
            {open && (
              <div className="absolute z-10 mt-1.5 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg text-sm max-h-64 overflow-auto">
                {searchFilteredAgents.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-gray-400">
                    No se encontraron agentes
                  </div>
                ) : (
                  searchFilteredAgents.map(agent => {
                    const agentLabel = formatAgent(agent);
                    const isSelected = selected?.id === agent.id;
                    return (
                      <div
                        key={agent.id}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelected(agent);
                          setQuery('');
                          setOpen(false);
                        }}
                        className={`group relative cursor-default py-2 pl-3 pr-9 select-none ${
                          isSelected ? 'bg-[#5DE1E5]/10' : ''
                        } ${
                          agent.status !== 'active' && agent.status !== undefined
                            ? 'text-gray-400 hover:text-gray-500 hover:bg-gray-50'
                            : 'text-gray-900 hover:bg-[#5DE1E5] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <AgentAvatar photo={agent.photo} name={agent.name} size={12} description={agent.description} />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span
                              className={`block truncate text-sm ${
                                isSelected ? 'font-semibold' : 'font-normal'
                              }`}
                            >
                              {agentLabel}
                            </span>
                          </div>

                          {agent.status !== 'active' && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 group-hover:bg-white/20 group-hover:text-white">
                              Inactivo
                            </span>
                          )}

                          {isSelected && (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#5DE1E5] group-hover:text-white">
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
        )}
      </div>

      {/* Selected agent card */}
      {selected && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-4">
          <AgentAvatar photo={selected.photo} name={selected.name} size={14} description={selected.description} />
          <div>
            <p className="text-sm font-semibold text-gray-900">{formatAgent(selected)}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                  selected.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {selected.status === 'active' ? 'Activo' : 'Inactivo'}
              </span>
              <span className="text-xs text-gray-400">ID #{selected.id}</span>
            </div>
          </div>
        </div>
      )}

      {/* Código de ejemplo */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider">
          Uso
        </h3>
        <pre className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto">
{`// Ejemplo de uso con props
<AgentSelect
  showActive={${showActive}}
  showInactive={${showInactive}}
  placeholder="Buscar agente..."
  onChange={(agent) => console.log(agent)}
/>`}</pre>
      </div>
    </div>
  );
}