'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAgents, Agent } from '@/utils/useAgents';
import { meilisearchAPI, Index } from '@/utils/meilisearch';
import { n8nAPI, Workflow } from '@/utils/n8n';

interface Client {
  id: number;
  name: string;
  email?: string;
  company?: string;
}

export default function EditarAgente() {
  const router = useRouter();
  const params = useParams();
  const { agents, initialized: agentsInitialized, updateAgent } = useAgents();
  const [clients, setClients] = useState<Client[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    photo: '',
    client_id: 0
  });
  const [uploading, setUploading] = useState(false);
  const [availableIndexes, setAvailableIndexes] = useState<Index[]>([]);
  const [loadingIndexes, setLoadingIndexes] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState<string[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableWorkflows, setAvailableWorkflows] = useState<Workflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [workflowSearchQuery, setWorkflowSearchQuery] = useState('');
  const [availableConversationAgents, setAvailableConversationAgents] = useState<string[]>([]);
  const [loadingConversationAgents, setLoadingConversationAgents] = useState(false);
  const [selectedConversationAgent, setSelectedConversationAgent] = useState<string>('');

  useEffect(() => {
    // Cargar clientes desde MySQL
    const loadClients = async () => {
      try {
        const res = await fetch('/api/clients');
        const data = await res.json();
        if (data.ok && data.clients) {
          setClients(data.clients);
        }
      } catch (err) {
        console.error('Error cargando clientes:', err);
      }
    };
    
    loadClients();
  }, []);

  useEffect(() => {
    console.log('[EDIT-AGENTE] agentsInitialized:', agentsInitialized, 'agents count:', agents.length);
    if (agentsInitialized) {
      const agentId = parseInt(params.id as string);
      console.log('[EDIT-AGENTE] Looking for agent ID:', agentId);
      const agent = agents.find(a => a.id === agentId);
      console.log('[EDIT-AGENTE] Found agent:', agent);
      
      if (agent) {
        setCurrentAgent(agent);
        setFormData({
          name: agent.name,
          description: agent.description,
          photo: agent.photo,
        client_id: agent.client_id
      });
      setSelectedIndexes(agent.knowledge?.indexes || []);
      setSelectedWorkflows(agent.workflows?.workflowIds || []);
      setSelectedConversationAgent(agent.conversation_agent_name || '');
    } else {
      console.log('[EDIT-AGENTE] Agent not found in agents list, redirecting');
      router.push('/agentes');
    }
  }
}, [agentsInitialized, agents, params.id, router]);

  useEffect(() => {
    loadIndexes();
    loadWorkflows();
    loadConversationAgents();
  }, []);

  const loadConversationAgents = async () => {
    setLoadingConversationAgents(true);
    try {
      const INDEX_UID = 'bd_conversations_dworkers';
      const uniqueAgents = new Set<string>();
      let currentOffset = 0;
      const batchLimit = 1000;
      let hasMore = true;

      while (hasMore) {
        const data = await meilisearchAPI.getDocuments(INDEX_UID, batchLimit, currentOffset);
        data.results.forEach((doc: any) => {
          if (doc.agent && typeof doc.agent === 'string') {
            uniqueAgents.add(doc.agent);
          }
        });
        if (data.results.length < batchLimit) {
          hasMore = false;
        } else {
          currentOffset += batchLimit;
        }
      }
      
      const sortedAgents = Array.from(uniqueAgents).sort();
      setAvailableConversationAgents(sortedAgents);
    } catch (error) {
      console.error('Error loading conversation agents:', error);
    } finally {
      setLoadingConversationAgents(false);
    }
  };

  const loadWorkflows = async () => {
    setLoadingWorkflows(true);
    try {
      const workflows = await n8nAPI.getWorkflows();
      setAvailableWorkflows(workflows);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const handleToggleWorkflow = (workflowId: string) => {
    setSelectedWorkflows(prev => {
      if (prev.includes(workflowId)) {
        return prev.filter(id => id !== workflowId);
      } else {
        return [...prev, workflowId];
      }
    });
  };

  const loadIndexes = async () => {
    setLoadingIndexes(true);
    try {
      const indexes = await meilisearchAPI.getIndexes();
      setAvailableIndexes(indexes);
    } catch (error) {
      console.error('Error loading indexes:', error);
    } finally {
      setLoadingIndexes(false);
    }
  };

  const handleToggleIndex = (indexId: string) => {
    setSelectedIndexes(prev => {
      if (prev.includes(indexId)) {
        return prev.filter(id => id !== indexId);
      } else {
        return [...prev, indexId];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const client = clients.find(c => c.id === formData.client_id);
    
    if (!currentAgent) return;

    updateAgent(currentAgent.id, {
      name: formData.name,
      description: formData.description,
      photo: formData.photo,
      client_id: formData.client_id,
      client_name: client?.name,
      knowledge: {
        indexes: selectedIndexes
      },
      workflows: {
        workflowIds: selectedWorkflows
      },
      conversation_agent_name: selectedConversationAgent || undefined
    });

    router.push('/agentes');
  };

  if (!currentAgent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Editar Agente</h1>
          <p className="mt-2 text-gray-600">Actualiza la información del agente y configura su conocimiento</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Agente */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Información General</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente *
                </label>
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={0}>Seleccionar cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foto
                </label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 1 * 1024 * 1024) {
                        alert('La imagen no puede ser mayor a 1 MB');
                        return;
                      }

                      setUploading(true);
                      try {
                        const uploadFormData = new FormData();
                        uploadFormData.append('file', file);

                        const response = await fetch('/api/upload-agent-avatar', {
                          method: 'POST',
                          body: uploadFormData
                        });

                        const data = await response.json();

                        if (response.ok) {
                          setFormData({ ...formData, photo: data.url });
                        } else {
                          alert(data.error || 'Error al subir la imagen');
                        }
                      } catch (error) {
                        console.error('Error uploading image:', error);
                        alert('Error al subir la imagen');
                      } finally {
                        setUploading(false);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
                {formData.photo && (
                  <div className="mt-2">
                    <img
                      src={formData.photo}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <p className="text-xs text-gray-500 mt-1">Preview de la imagen</p>
                  </div>
                )}
                {uploading && (
                  <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    Subiendo imagen...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Identificador de Conversaciones */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Identificador de Conversaciones</h2>
            
            {loadingConversationAgents ? (
              <div className="flex items-center gap-2 text-gray-600">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <p>Cargando agentes de conversaciones...</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agente para Conversaciones
                </label>
                <select
                  value={selectedConversationAgent}
                  onChange={(e) => setSelectedConversationAgent(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar agente de conversaciones...</option>
                  {availableConversationAgents.map((agent) => (
                    <option key={agent} value={agent}>
                      {agent}
                    </option>
                  ))}
                </select>
                {selectedConversationAgent && (
                  <p className="mt-2 text-sm text-gray-500">
                    Este agente se asociará con las conversaciones del agente &quot;<strong>{selectedConversationAgent}</strong>&quot; en la base de datos.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Configuración de Conocimiento */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Conocimiento del Agente</h2>
            
            {loadingIndexes ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Selecciona los índices de Meilisearch que este agente puede consultar:
                </p>
                
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Buscar índice..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableIndexes
                    .filter((index) => 
                      index.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (index.name && index.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .sort((a, b) => {
                      // Índices seleccionados primero
                      const aSelected = selectedIndexes.includes(a.uid);
                      const bSelected = selectedIndexes.includes(b.uid);
                      if (aSelected && !bSelected) return -1;
                      if (!aSelected && bSelected) return 1;
                      return 0;
                    })
                    .map((index) => (
                    <label
                      key={index.uid}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedIndexes.includes(index.uid)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIndexes.includes(index.uid)}
                        onChange={() => handleToggleIndex(index.uid)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-medium text-gray-900">{index.uid}</p>
                        {index.name && (
                          <p className="text-sm text-gray-500">{index.name}</p>
                        )}
                      </div>
                      {index.primaryKey && (
                        <span className="text-xs text-gray-400">{index.primaryKey}</span>
                      )}
                    </label>
                  ))}
                </div>
                
                {availableIndexes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay índices disponibles
                  </div>
                )}

                {selectedIndexes.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Índices seleccionados: {selectedIndexes.length}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedIndexes.map((indexId) => {
                        const index = availableIndexes.find(i => i.uid === indexId);
                        return (
                          <span key={indexId} className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                            {index?.uid}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Configuración de Flujos n8n */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Flujos n8n del Agente</h2>
            
            {loadingWorkflows ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Selecciona los flujos de n8n que este agente puede ejecutar:
                </p>
                
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Buscar flujo..."
                    value={workflowSearchQuery}
                    onChange={(e) => setWorkflowSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableWorkflows
                    .filter((workflow) => 
                      workflow.name.toLowerCase().includes(workflowSearchQuery.toLowerCase())
                    )
                    .sort((a, b) => {
                      const aSelected = selectedWorkflows.includes(a.id);
                      const bSelected = selectedWorkflows.includes(b.id);
                      if (aSelected && !bSelected) return -1;
                      if (!aSelected && bSelected) return 1;
                      return 0;
                    })
                    .map((workflow) => (
                    <label
                      key={workflow.id}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedWorkflows.includes(workflow.id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedWorkflows.includes(workflow.id)}
                        onChange={() => handleToggleWorkflow(workflow.id)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-medium text-gray-900">{workflow.name}</p>
                        <p className="text-sm text-gray-500">ID: {workflow.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {workflow.active && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Activo
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                
                {availableWorkflows.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay flujos disponibles
                  </div>
                )}

                {selectedWorkflows.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-900 mb-2">
                      Flujos seleccionados: {selectedWorkflows.length}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedWorkflows.map((workflowId) => {
                        const workflow = availableWorkflows.find(w => w.id === workflowId);
                        return (
                          <span key={workflowId} className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                            {workflow?.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/agentes')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

