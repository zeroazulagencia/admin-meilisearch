'use client';

import { useState, useEffect } from 'react';

type TabId = 'inicio' | 'config' | 'documentacion';

interface ModuleData {
  id: number;
  title: string;
  folder_name: string;
  description?: string | null;
  agent_name?: string;
  agent_id?: number;
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'config', label: 'Configuración' },
  { id: 'documentacion', label: 'Documentación' },
];

export default function __MODULE_COMPONENT_NAME__({ moduleData }: { moduleData: ModuleData }) {
  const [activeTab, setActiveTab] = useState<TabId>('inicio');

  return (
    <div className="w-full p-4 md:p-6 space-y-4">
      {/* TABS */}
      <div className="flex gap-1 border-b border-gray-200">
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

      {/* CONTENIDO */}
      <div className="bg-white border border-gray-200 rounded-xl">
        {activeTab === 'inicio' && (
          <div className="space-y-4 p-2">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
              <h3 className="text-xl font-bold mb-1">{moduleData.title}</h3>
              <p className="text-purple-100 text-sm">
                {moduleData.description || 'Módulo generado con el scaffold.'}
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500">
              <p className="text-4xl mb-2">🏗️</p>
              <p className="font-medium text-gray-700">Bienvenido a {moduleData.title}</p>
              <p className="text-sm mt-1">Aquí va el contenido de la pestaña Inicio.</p>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Configuración</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
              Aquí van los campos de configuración del módulo (claves, endpoints, etc.).
            </div>
          </div>
        )}

        {activeTab === 'documentacion' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Documentación</h3>
            <div className="prose prose-sm max-w-none text-sm text-gray-700 prose-p:my-1">
              <p>Agrega aquí la documentación de uso del módulo.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
