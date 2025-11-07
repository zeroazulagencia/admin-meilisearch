'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import AgentSelector from '@/components/ui/AgentSelector';
import { useState, useEffect } from 'react';
import { getPermissions, getUserId } from '@/utils/permissions';

interface AgentDB {
  id: number;
  name: string;
  description?: string;
  photo?: string;
  whatsapp_business_account_id?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_access_token?: string;
  whatsapp_webhook_verify_token?: string;
  whatsapp_app_secret?: string;
}

export default function WhatsAppManager() {
  const [allAgents, setAllAgents] = useState<AgentDB[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentDB | null>(null);
  const [agentDetails, setAgentDetails] = useState<AgentDB | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        let list: AgentDB[] = data.ok ? data.agents : [];
        
        // Aplicar filtros de permisos
        const permissions = getPermissions();
        const userId = getUserId();
        if (permissions && userId && permissions.type !== 'admin' && !permissions['whatsapp-manager']?.viewAll) {
          list = list.filter(a => a.client_id === parseInt(userId));
        }
        
        // Filtrar solo agentes que tienen configuración completa de WhatsApp
        // Un agente tiene configuración completa si tiene todos los campos de WhatsApp
        list = list.filter(agent => {
          return agent.whatsapp_business_account_id && 
                 agent.whatsapp_phone_number_id && 
                 agent.whatsapp_access_token && 
                 agent.whatsapp_webhook_verify_token && 
                 agent.whatsapp_app_secret;
        });
        
        setAllAgents(list);
      } catch (e) {
        console.error('[WHATSAPP-MANAGER] Error cargando agentes:', e);
      } finally {
        setAgentsLoading(false);
      }
    };
    
    loadAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      loadAgentDetails(selectedAgent.id);
    } else {
      setAgentDetails(null);
    }
  }, [selectedAgent]);

  const loadAgentDetails = async (agentId: number) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      const data = await res.json();
      if (data.ok && data.agent) {
        setAgentDetails(data.agent);
      }
    } catch (e) {
      console.error('[WHATSAPP-MANAGER] Error cargando detalles del agente:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">WhatsApp Manager</h1>
        <p className="text-gray-600">
          Operaciones y configuración de WhatsApp Business API
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <AgentSelector
          label="Seleccionar Agente"
          agents={allAgents}
          selectedAgent={selectedAgent}
          onChange={(agent) => {
            if (agent && typeof agent === 'object' && agent.id !== 'all') {
              setSelectedAgent(agent as AgentDB);
            } else {
              setSelectedAgent(null);
            }
          }}
          placeholder="Seleccionar agente con configuración WhatsApp..."
          loading={agentsLoading}
          className="mb-6"
        />

        {loadingDetails && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#5DE1E5] mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Cargando detalles del agente...</p>
          </div>
        )}

        {agentDetails && !loadingDetails && (
          <div className="mt-6 space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Configuración WhatsApp</h2>
              <p className="text-sm text-gray-600">Información de configuración de WhatsApp Business API para {agentDetails.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Account ID
                </label>
                <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900">
                  {agentDetails.whatsapp_business_account_id || 'No configurado'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number ID
                </label>
                <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900">
                  {agentDetails.whatsapp_phone_number_id || 'No configurado'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Token
                </label>
                <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono">
                  {agentDetails.whatsapp_access_token || 'No configurado'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook Verify Token
                </label>
                <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono">
                  {agentDetails.whatsapp_webhook_verify_token || 'No configurado'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App Secret
                </label>
                <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono">
                  {agentDetails.whatsapp_app_secret || 'No configurado'}
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedAgent && !agentsLoading && allAgents.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No hay agentes con configuración completa de WhatsApp.</p>
            <p className="text-sm text-gray-400 mt-2">Configura los campos de WhatsApp en el editor de agentes para que aparezcan aquí.</p>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
