'use client';

import { useState } from 'react';
import { useAgents, Agent } from '@/utils/useAgents';
import { useClients } from '@/utils/useClients';

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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({ ...formData, photo: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formData.photo && (
                    <div className="mt-2">
                      <img 
                        src={formData.photo} 
                        alt="Preview" 
                        className="w-32 h-32 object-cover rounded-lg"
                      />
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{agent.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{agent.client_name}</p>
                <p className="text-sm text-gray-600 mb-4">{agent.description}</p>
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

