'use client';

import AgentSelectModule from '@/components/ui/AgentSelectModule';
import ProtectedLayout from '@/components/ProtectedLayout';

export default function AgentSelectPage() {
  return (
    <ProtectedLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Select</h1>
          <p className="text-gray-600 mt-1">
            Módulo de selector de agentes — Panel de configuración de interfaz
          </p>
        </div>
        <AgentSelectModule />
      </div>
    </ProtectedLayout>
  );
}