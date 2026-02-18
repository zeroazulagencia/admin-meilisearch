'use client';

import { useEffect } from 'react';

export default function GeneradorCartaLaboral({ moduleData }: { moduleData?: any }) {
  useEffect(() => {
    console.log('Modulo Generador Carta Laboral cargado', moduleData);
  }, []);

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto text-center py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Generador Carta Laboral
        </h1>
        <p className="text-gray-500 text-base">
          Agente: <span className="font-medium text-gray-700">{moduleData?.agent_name}</span>
          {' · '}
          Cliente: <span className="font-medium text-gray-700">{moduleData?.client_name}</span>
        </p>
        <div className="mt-8 inline-block bg-blue-50 border border-blue-200 rounded-xl px-6 py-4 text-blue-700 text-sm font-medium">
          Modulo en construccion
        </div>
      </div>
    </div>
  );
}
