'use client';

import { useState } from 'react';

type TabId = 'inicio' | 'config' | 'logs';

const TABS: { id: TabId; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'config', label: 'Configuración' },
  { id: 'logs', label: 'Logs' },
];

export default function SincronizadorUsadosAutolarte() {
  const [activeTab, setActiveTab] = useState<TabId>('inicio');

  const tabs = TABS.map((t) => (
    <button
      key={t.id}
      onClick={() => setActiveTab(t.id)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
        activeTab === t.id
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {t.label}
    </button>
  ));

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Estado</p>
                <p className="text-2xl font-bold text-gray-400">—</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Última sincronización</p>
                <p className="text-2xl font-bold text-gray-400">—</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Registros sincronizados</p>
                <p className="text-2xl font-bold text-gray-400">0</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 italic">Pronto disponible</p>
          </div>
        );

      case 'config':
        return (
          <div className="space-y-4 max-w-lg">
            <p className="text-sm text-gray-400 italic">Pronto disponible</p>
          </div>
        );

      case 'logs':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 italic">Pronto disponible</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Sincronizador Usados Autolarte</h1>
        <p className="text-sm text-gray-500 mt-1">Sincronización de vehículos usados</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">{tabs}</div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        {renderContent()}
      </div>
    </div>
  );
}