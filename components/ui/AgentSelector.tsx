'use client';

import { useState } from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/16/solid';
import { CheckIcon } from '@heroicons/react/20/solid';

interface Agent {
  id: number | string;
  name: string;
  photo?: string | null;
  description?: string | null;
  client_id?: number;
  [key: string]: any; // Para campos adicionales
}

interface AgentSelectorProps {
  label: string;
  agents: Agent[];
  selectedAgent: Agent | null | string; // Puede ser el objeto completo o un string ID
  onChange: (agent: Agent | null | string) => void; // Puede retornar el agente o 'all'
  placeholder?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  getDisplayText?: (agent: Agent) => string;
  loading?: boolean;
  className?: string;
}

const AgentAvatar = ({ photo, name, size = 8 }: { photo?: string | null; name: string; size?: number }) => {
  const [imgError, setImgError] = useState(false);
  
  if (photo && !imgError) {
    return (
      <img
        alt=""
        src={photo}
        className={`size-${size} shrink-0 rounded-full bg-gray-100 object-cover`}
        style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div 
      className={`shrink-0 rounded-full bg-gradient-to-br from-[#5DE1E5] to-[#4BC5C9] flex items-center justify-center text-white font-bold`}
      style={{ width: `${size * 4}px`, height: `${size * 4}px`, fontSize: `${size * 1.5}px` }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

export default function AgentSelector({
  label,
  agents,
  selectedAgent,
  onChange,
  placeholder = 'Seleccionar agente...',
  includeAllOption = false,
  allOptionLabel = 'Todos los agentes',
  getDisplayText,
  loading = false,
  className = ''
}: AgentSelectorProps) {
  // Resolver el agente seleccionado
  const getSelectedAgentObject = (): Agent | null => {
    if (!selectedAgent) return null;
    if (typeof selectedAgent === 'string') {
      if (selectedAgent === 'all') return null;
      return agents.find(a => a.id.toString() === selectedAgent) || null;
    }
    return selectedAgent;
  };

  const currentSelected = getSelectedAgentObject();

  // Crear opción "Todos" si es necesario
  const allOption = includeAllOption ? { id: 'all', name: allOptionLabel, photo: null } : null;
  const displayAgents = allOption ? [allOption, ...agents] : agents;

  const getAgentDisplayText = (agent: Agent): string => {
    if (getDisplayText) return getDisplayText(agent);
    return agent.name;
  };

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
      <Listbox
        value={currentSelected}
        onChange={(agent) => {
          if (!agent) {
            onChange(null);
            return;
          }
          // Si es la opción "all", pasar string 'all'
          if (agent.id === 'all') {
            onChange('all');
          } else {
            onChange(agent);
          }
        }}
      >
        <div className="relative mt-2">
          <ListboxButton className="grid w-full cursor-default grid-cols-1 rounded-md bg-white py-2 pr-3 pl-3 text-left text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#5DE1E5] sm:text-sm/6 border border-gray-300">
            <span className="col-start-1 row-start-1 flex items-center gap-3 pr-7">
              {currentSelected ? (
                <AgentAvatar photo={currentSelected.photo} name={currentSelected.name} size={8} />
              ) : (
                <div className="size-8 shrink-0 rounded-full bg-gray-100"></div>
              )}
              <span className="block truncate">
                {currentSelected ? getAgentDisplayText(currentSelected) : placeholder}
              </span>
            </span>
            <ChevronUpDownIcon
              aria-hidden="true"
              className="col-start-1 row-start-1 size-5 self-center justify-self-end text-gray-500 sm:size-4"
            />
          </ListboxButton>

          <ListboxOptions
            transition
            className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 sm:text-sm border border-gray-200"
          >
            {displayAgents.map((agent) => {
              const isSelected = currentSelected?.id === agent.id;
              return (
                <ListboxOption
                  key={agent.id}
                  value={agent}
                  className="group relative cursor-default py-2 pr-9 pl-3 text-gray-900 select-none data-[focus]:bg-[#5DE1E5] data-[focus]:text-white data-[focus]:outline-hidden"
                >
                  {({ focus, selected }) => (
                    <>
                      <div className="flex items-center">
                        <AgentAvatar photo={agent.photo} name={agent.name} size={8} />
                        <span className={`ml-3 block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                          {getAgentDisplayText(agent)}
                        </span>
                      </div>

                      {selected && (
                        <span className={`absolute inset-y-0 right-0 flex items-center pr-4 ${focus ? 'text-white' : 'text-[#5DE1E5]'}`}>
                          <CheckIcon aria-hidden="true" className="size-5" />
                        </span>
                      )}
                    </>
                  )}
                </ListboxOption>
              );
            })}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  );
}

