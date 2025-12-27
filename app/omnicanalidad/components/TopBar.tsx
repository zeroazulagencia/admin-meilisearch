'use client';

import { useState, useEffect } from 'react';
import AgentSelector from '@/components/ui/AgentSelector';

interface TopBarProps {
  selectedAgentName: string | null;
  onAgentChange: (agentName: string | null) => void;
  totalUnreadCount: number;
}

export default function TopBar({ selectedAgentName, onAgentChange, totalUnreadCount }: TopBarProps) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        const data = await response.json();
        if (data.ok && data.agents) {
          setAgents(data.agents);
        }
      } catch (e: any) {
        console.error('[TopBar] Error cargando agentes:', e?.message);
      } finally {
        setLoadingAgents(false);
      }
    };

    loadAgents();
  }, []);

  const selectedAgent = agents.find(a => a.conversation_agent_name === selectedAgentName) || null;

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">Omnicanalidad</h1>
        <div className="w-64">
          <AgentSelector
            label=""
            agents={agents}
            selectedAgent={selectedAgent}
            onChange={(agent) => {
              if (agent === 'all' || agent === null) {
                onAgentChange(null);
              } else if (typeof agent === 'object' && agent.conversation_agent_name) {
                onAgentChange(agent.conversation_agent_name);
              }
            }}
            placeholder="Seleccionar agente..."
            loading={loadingAgents}
            getDisplayText={(agent) => agent.name || agent.conversation_agent_name || 'Sin nombre'}
          />
        </div>
        {totalUnreadCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">No leídos:</span>
            <span className="inline-flex items-center justify-center px-2 py-1 bg-[#3B82F6] text-white text-xs font-medium rounded-full">
              {totalUnreadCount}
            </span>
          </div>
        )}
      </div>

      {/* Center Section - Sort/Filter Icons */}
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Right Section - User Profile & Actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">Usuario Admin</p>
            <p className="text-xs text-gray-500">Omnicanalidad</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#5DE1E5] flex items-center justify-center">
            <span className="text-sm font-semibold text-white">UA</span>
          </div>
        </div>
        <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
          Close details
        </button>
        <div className="relative">
          <button className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            Resolve
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
