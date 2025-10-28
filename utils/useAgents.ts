import { useState, useEffect } from 'react';
import { Client, useClients } from './useClients';

export interface Agent {
  id: number;
  name: string;
  description: string;
  photo: string;
  client_id: number;
  client_name?: string;
  knowledge?: {
    indexes: string[]; // Lista de IDs de índices de Meilisearch
  };
  workflows?: {
    workflowIds: string[]; // Lista de IDs de workflows de n8n
  };
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Cargar desde localStorage
    const stored = localStorage.getItem('admin_agents');
    if (stored) {
      try {
        const parsedAgents = JSON.parse(stored);
        setAgents(parsedAgents);
      } catch (e) {
        console.error('Error loading agents from localStorage:', e);
      }
    } else {
      // Datos iniciales
      const initialAgents: Agent[] = [
        { id: 1, name: 'amavu', description: 'Agente principal', photo: '', client_id: 1, client_name: 'Zero Azul Agencia', knowledge: { indexes: ['bd_conversations_dworkers'] }, workflows: { workflowIds: [] } },
        { id: 2, name: 'amistoso', description: 'Agente amistoso', photo: '', client_id: 1, client_name: 'Zero Azul Agencia', knowledge: { indexes: [] }, workflows: { workflowIds: [] } }
      ];
      setAgents(initialAgents);
      localStorage.setItem('admin_agents', JSON.stringify(initialAgents));
    }
    setInitialized(true);
  }, []);

  const addAgent = (agent: Agent) => {
    const updatedAgents = [...agents, agent];
    setAgents(updatedAgents);
    localStorage.setItem('admin_agents', JSON.stringify(updatedAgents));
  };

  const updateAgent = (id: number, updatedAgent: Partial<Agent>) => {
    const updatedAgents = agents.map(a => 
      a.id === id ? { ...a, ...updatedAgent } : a
    );
    setAgents(updatedAgents);
    localStorage.setItem('admin_agents', JSON.stringify(updatedAgents));
  };

  const deleteAgent = (id: number) => {
    const updatedAgents = agents.filter(a => a.id !== id);
    setAgents(updatedAgents);
    localStorage.setItem('admin_agents', JSON.stringify(updatedAgents));
  };

  return {
    agents,
    initialized,
    addAgent,
    updateAgent,
    deleteAgent
  };
}

