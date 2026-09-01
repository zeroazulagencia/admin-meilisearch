'use client';

import { useState } from 'react';
import AgentSelectModule from '@/components/ui/AgentSelectModule';
import AgentCardModule from '@/components/ui/AgentCardModule';
import ProtectedLayout from '@/components/ProtectedLayout';

type ModuleId = 'agent-select' | 'agent-card' | null;

interface UIModule {
  id: ModuleId;
  name: string;
  description: string;
  icon: string;
}

const modules: UIModule[] = [
  {
    id: 'agent-select',
    name: 'Agent Select',
    description: 'Selector de agentes con filtro activos/inactivos',
    icon: '👤',
  },
  {
    id: 'agent-card',
    name: 'Agent Card',
    description: 'Tarjetas de agentes con info, estado y métricas',
    icon: '🪪',
  },
];

export default function UIPage() {
  const [activeModule, setActiveModule] = useState<ModuleId>(null);

  return (
    <ProtectedLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">UI</h1>
          <p className="text-gray-600 mt-1">Panel de configuración de interfaz</p>
        </div>

        {!activeModule ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(mod => (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-[#5DE1E5] hover:shadow-sm transition-all group"
              >
                <span className="text-2xl">{mod.icon}</span>
                <h3 className="text-sm font-semibold text-gray-900 mt-2 group-hover:text-[#5DE1E5] transition-colors">
                  {mod.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{mod.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setActiveModule(null)}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver a módulos
            </button>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              {activeModule === 'agent-select' && <AgentSelectModule />}
              {activeModule === 'agent-card' && <AgentCardModule />}
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}