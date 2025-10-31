'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import settings from '../../settings.json';

interface AgentDB {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  photo?: string;
  email?: string;
  phone?: string;
  agent_code?: string;
  status?: string;
  knowledge?: any;
  workflows?: any;
  conversation_agent_name?: string;
}

interface Client {
  id: number;
  name: string;
  email?: string;
  company?: string;
}

export default function Agentes() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentDB[]>([]);
  const [agentsLoading, setAgentsLoading] = useState<boolean>(true);
  const [clients, setClients] = useState<Client[]>([]);
  
  useEffect(() => {
    // Cargar clientes desde MySQL
    const loadClients = async () => {
      try {
        console.log('[AGENTES] UI version:', settings?.proyecto?.version || 'unknown');
        if (typeof window !== 'undefined') {
          try {
            console.log('[AGENTES] LocalStorage admin_agents exists?:', !!localStorage.getItem('admin_agents'));
            console.log('[AGENTES] LocalStorage admin_clients exists?:', !!localStorage.getItem('admin_clients'));
          } catch (e) {
            console.warn('[AGENTES] Unable to read localStorage keys');
          }
        }
        console.log('[AGENTES] Loading clients...');
        const res = await fetch('/api/clients');
        const data = await res.json();
        console.log('[AGENTES] Clients response:', data);
        if (data.ok && data.clients) {
          console.log('[AGENTES] Setting clients (count):', data.clients.length);
          setClients(data.clients);
        }
      } catch (err) {
        console.error('[AGENTES] Error cargando clientes:', err);
      }
    };
    
    loadClients();
  }, []);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        console.log('[AGENTES] Loading agents from MySQL...');
        const res = await fetch('/api/agents');
        const data = await res.json();
        console.log('[AGENTES] Agents response ok?:', data?.ok, 'count:', Array.isArray(data?.agents) ? data.agents.length : 'n/a');
        if (data.ok && data.agents) {
          try {
            const ids = data.agents.map((a: any) => a.id);
            console.log('[AGENTES] Agents IDs:', ids);
          } catch {}
          setAgents(data.agents);
        }
      } catch (err) {
        console.error('[AGENTES] Error cargando agentes:', err);
      } finally {
        setAgentsLoading(false);
      }
    };
    loadAgents();
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentDB | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    photo: '',
    client_id: 0
  });
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAgent) {
        console.log('[AGENTES] Updating agent ID:', editingAgent.id);
        // Actualizar en MySQL
        const res = await fetch(`/api/agents/${editingAgent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: formData.client_id,
            name: formData.name,
            description: formData.description,
            photo: formData.photo,
          })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Error al actualizar agente');
      } else {
        console.log('[AGENTES] Creating agent with client_id:', formData.client_id);
        // Crear en MySQL
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: formData.client_id,
            name: formData.name,
            description: formData.description,
            photo: formData.photo,
            status: 'active'
          })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Error al crear agente');
      }

      // Recargar lista
      console.log('[AGENTES] Reloading agents after save...');
      const resList = await fetch('/api/agents');
      const listData = await resList.json();
      if (listData.ok && listData.agents) {
        console.log('[AGENTES] New agents count:', listData.agents.length);
        setAgents(listData.agents);
      }

      resetForm();
    } catch (err: any) {
      alert(err.message || 'Error al guardar el agente');
    }
  };

  const handleEdit = (agent: AgentDB) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description || '',
      photo: agent.photo || '',
      client_id: agent.client_id
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este agente?')) return;
    try {
      const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al eliminar agente');
      setAgents(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {!agentsLoading && agents.map((agent) => (
            <div key={agent.id} className="bg-white rounded-lg shadow overflow-hidden">
              {agent.photo && (
                <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                  <img 
                    src={agent.photo} 
                    alt={agent.name}
                    className="w-32 h-32 rounded-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{agent.name}</h3>
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-400 uppercase">Cliente:</span>
                  <p className="text-sm font-medium text-blue-600 truncate">{clients.find(c => c.id === agent.client_id)?.name || 'Sin asignar'}</p>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{agent.description}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/agentes/${agent.id}/editar`)}
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

