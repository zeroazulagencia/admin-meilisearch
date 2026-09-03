'use client';

import { useEffect, useState } from 'react';
import AgentAvatar from '@/components/ui/AgentAvatar';

interface ModuleItem {
  id: number;
  agent_id: number;
  title: string;
  folder_name: string;
  is_active: number;
  description: string | null;
  agent_name: string;
  agent_photo?: string | null;
  client_name?: string;
  created_at: string;
}

export default function AgentModulesListModule() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/modules')
      .then(r => r.json())
      .then(data => {
        const list = data.modules ?? [];
        setModules(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#5DE1E5]" />
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No hay módulos registrados
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {modules.map((mod) => {
        const isDisabled = mod.is_active === undefined || mod.is_active === null
          ? false
          : mod.is_active === 0;
        return (
          <div
            key={mod.id}
            className={`bg-white rounded-xl border p-4 transition-all ${
              isDisabled
                ? 'border-gray-200 opacity-50 grayscale'
                : 'border-gray-200 hover:border-[#5DE1E5] hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3 mb-3">
              <AgentAvatar photo={mod.agent_photo} name={mod.agent_name} size={10} />
              <div className="min-w-0 flex-1">
                <h3 className={`text-sm font-semibold truncate ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                  {mod.title}
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  {mod.agent_name}{mod.client_name ? ` · ${mod.client_name}` : ''}
                </p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {new Date(mod.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
              </span>
            </div>
            {mod.description && (
              <p className={`text-xs line-clamp-2 ${isDisabled ? 'text-gray-300' : 'text-gray-400'}`}>
                {mod.description}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-mono">{mod.folder_name}</span>
              {isDisabled ? (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-500">
                  Inactivo
                </span>
              ) : (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  Activo
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}