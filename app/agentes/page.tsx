'use client';

import { useState } from 'react';
import { useAgents, Agent } from '@/utils/useAgents';
import { useClients } from '@/utils/useClients';
import { meilisearchAPI, Index } from '@/utils/meilisearch';

export default function Agentes() {
  const { agents, initialized: agentsInitialized, addAgent, updateAgent, deleteAgent } = useAgents();
  const { clients, initialized: clientsInitialized } = useClients();
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    photo: '',
    client_id: 0
  });
  const [uploading, setUploading] = useState(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [selectedAgentForKnowledge, setSelectedAgentForKnowledge] = useState<Agent | null>(null);
  const [availableIndexes, setAvailableIndexes] = useState<Index[]>([]);
  const [loadingIndexes, setLoadingIndexes] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const client = clients.find(c => c.id === formData.client_id);
    
    if (editingAgent) {
      // Actualizar
      updateAgent(editingAgent.id, {
        ...formData,
        client_name: client?.name
      });
    } else {
      // Crear
      const newAgent: Agent = {
        id: Date.now(),
        ...formData,
        client_name: client?.name
      };
      addAgent(newAgent);
    }
    
    resetForm();
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description,
      photo: agent.photo,
      client_id: agent.client_id
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este agente?')) {
      deleteAgent(id);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', photo: '', client_id: 0 });
    setEditingAgent(null);
    setShowForm(false);
    // Limpiar el input de archivo
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleOpenKnowledgeModal = async (agent: Agent) => {
    setSelectedAgentForKnowledge(agent);
    setSelectedIndexes(agent.knowledge?.indexes || []);
    setShowKnowledgeModal(true);
    
    // Cargar índices disponibles
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

  const handleSaveKnowledge = () => {
    if (selectedAgentForKnowledge) {
      updateAgent(selectedAgentForKnowledge.id, {
        knowledge: {
          indexes: selectedIndexes
        }
      });
      setShowKnowledgeModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agentes</h1>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nuevo Agente
          </button>
        </div>

        {showForm && (
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingAgent ? 'Editar Agente' : 'Nuevo Agente'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
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
                    Cliente
                  </label>
                  <select
                    required
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="0">Selecciona un cliente</option>
                    {clientsInitialized && clients.map((client) => (
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
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
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
                        // Validar tamaño (1 MB)
                        if (file.size > 1 * 1024 * 1024) {
                          alert('La imagen no puede ser mayor a 1 MB');
                          return;
                        }
                        
                        setUploading(true);
                        
                        try {
                          // Subir archivo
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
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingAgent ? 'Actualizar' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agentsInitialized && agents.map((agent) => (
            <div key={agent.id} className="bg-white rounded-lg shadow overflow-hidden">
              {agent.photo && (
                <img 
                  src={agent.photo} 
                  alt={agent.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{agent.name}</h3>
                <p className="text-sm text-gray-500 mb-2 truncate">{agent.client_name}</p>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{agent.description}</p>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(agent)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                  <button
                    onClick={() => handleOpenKnowledgeModal(agent)}
                    className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Configurar Conocimiento
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal de Conocimiento */}
        {showKnowledgeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Configurar Conocimiento - {selectedAgentForKnowledge?.name}
                </h2>
                <button
                  onClick={() => setShowKnowledgeModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="px-6 py-4 overflow-y-auto flex-1">
                {loadingIndexes ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      Selecciona los índices de Meilisearch que este agente puede consultar:
                    </p>
                    
                    <div className="space-y-2">
                      {availableIndexes.map((index) => (
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
                  </>
                )}
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowKnowledgeModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveKnowledge}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

