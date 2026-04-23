'use client';

import { useState, useEffect } from 'react';

export default function VerificadorMobiliaModule({
  moduleData,
}: {
  moduleData?: {
    id: number;
    title: string;
    folder_name: string;
    agent_name: string;
  };
}) {
  const [activeTab, setActiveTab] = useState<'inicio' | 'config' | 'docs'>('inicio');

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Módulo Verificador Mobilia</h2>
          <div className="flex gap-1 border-b border-gray-200 mt-2">
            {([
              { id: 'inicio' as const, label: 'Inicio' },
              { id: 'config' as const, label: 'Configuración' },
              { id: 'docs' as const, label: 'Documentación' },
            ]).map((t) => (
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
          <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-xl p-6 text-white">
            <h3 className="text-2xl font-bold mb-2">Hola Mundo!</h3>
            <p className="text-green-100">Módulo "Verificador Mobilia" en desarrollo</p>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm text-gray-600">Configuración del módulo Verificador Mobilia</p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                API Key de Mobilia
              </label>
              <input
                type="password"
                placeholder="Pegar API key"
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
            >
              Guardar Configuración
            </button>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Documentación - Verificador Mobilia
            </h3>
            <div className="prose prose-sm max-w-none text-gray-700">
              <p>Este módulo está en desarrollo.</p>
              <p>Próximamente podrás verificar inventory de Mobilia desde este módulo.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}