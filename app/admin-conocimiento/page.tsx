'use client';

import { useState, useEffect } from 'react';
import { Index, meilisearchAPI } from '@/utils/meilisearch';
import { useAgents, Agent } from '@/utils/useAgents';
import IndexProperties from '@/components/IndexProperties';
import DocumentList from '@/components/DocumentList';

export default function AdminConocimiento() {
  const { agents, initialized: agentsInitialized } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [availableIndexes, setAvailableIndexes] = useState<Index[]>([]);
  const [loadingIndexes, setLoadingIndexes] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<Index | null>(null);

  useEffect(() => {
    if (agentsInitialized && agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0]);
    }
  }, [agentsInitialized, agents]);

  useEffect(() => {
    if (selectedAgent) {
      loadAgentIndexes();
    }
  }, [selectedAgent]);

  const loadAgentIndexes = async () => {
    if (!selectedAgent?.knowledge?.indexes) {
      setAvailableIndexes([]);
      setSelectedIndex(null);
      return;
    }

    setLoadingIndexes(true);
    try {
      const allIndexes = await meilisearchAPI.getIndexes();
      const agentIndexes = allIndexes.filter(index => 
        selectedAgent.knowledge?.indexes.includes(index.uid)
      );
      setAvailableIndexes(agentIndexes);
      
      // Seleccionar el primer índice si hay alguno
      if (agentIndexes.length > 0 && !selectedIndex) {
        setSelectedIndex(agentIndexes[0]);
      } else if (agentIndexes.length === 0) {
        setSelectedIndex(null);
      }
    } catch (error) {
      console.error('Error loading indexes:', error);
    } finally {
      setLoadingIndexes(false);
    }
  };

  if (!agentsInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Conocimiento</h1>
        
        <div className="space-y-6">
          {/* Selector de Agente */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Agente
            </label>
            <select
              value={selectedAgent?.id || ''}
              onChange={(e) => {
                const agent = agents.find(a => a.id === parseInt(e.target.value));
                setSelectedAgent(agent || null);
                setSelectedIndex(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {agent.knowledge?.indexes.length ? `(${agent.knowledge.indexes.length} índices)` : '(sin índices)'}
                </option>
              ))}
            </select>
          </div>

          {/* Lista de Índices del Agente */}
          {loadingIndexes ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : availableIndexes.length > 0 ? (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Índices asociados a {selectedAgent?.name}
                </h2>
                <div className="space-y-2">
                  {availableIndexes.map((index) => (
                    <button
                      key={index.uid}
                      onClick={() => setSelectedIndex(index)}
                      className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                        selectedIndex?.uid === index.uid
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{index.uid}</p>
                          {index.name && (
                            <p className="text-sm text-gray-500">{index.name}</p>
                          )}
                        </div>
                        {index.primaryKey && (
                          <span className="text-xs text-gray-400">{index.primaryKey}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedIndex && (
                <>
                  <IndexProperties indexUid={selectedIndex.uid} />
                  <DocumentList indexUid={selectedIndex.uid} />
                </>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">
                {selectedAgent?.name} no tiene índices asociados. Configura su conocimiento desde la página de Agentes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


