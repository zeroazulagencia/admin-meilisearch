'use client';

import { useState } from 'react';

export default function Modulo15Module({
  moduleData,
}: {
  moduleData?: {
    id: number;
    title: string;
    folder_name: string;
    agent_name: string;
  };
}) {
  const [activeTab, setActiveTab] = useState<'inicio' | 'config' | 'logs'>('inicio');

  const tabs = [
    { id: 'inicio' as const, label: 'Inicio' },
    { id: 'config' as const, label: 'Configuración' },
    { id: 'logs' as const, label: 'Logs' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Módulo 15</h2>
          <div className="flex gap-1 border-b border-gray-200 mt-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === t.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'inicio' && (
          <div className="p-4 text-gray-500">Pestaña Inicio - Vacía</div>
        )}

        {activeTab === 'config' && (
          <div className="p-4 text-gray-500">Pestaña Configuración - Vacía</div>
        )}

        {activeTab === 'logs' && (
          <div className="p-4 text-gray-500">Pestaña Logs - Vacía</div>
        )}
      </div>
    </div>
  );
}