'use client';

import { useState, useEffect, useRef } from 'react';
import AgentSelector from '@/components/ui/AgentSelector';

interface TopBarProps {
  selectedAgentName: string | null;
  onAgentChange: (agentName: string | null) => void;
  totalUnreadCount: number;
}

export default function TopBar({ selectedAgentName, onAgentChange, totalUnreadCount }: TopBarProps) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        const data = await response.json();
        if (data.ok && data.agents) {
          setAgents(data.agents.filter((a: any) => a.status === 'active'));
        }
      } catch (e: any) {
        console.error('[TopBar] Error cargando agentes:', e?.message);
      } finally {
        setLoadingAgents(false);
      }
    };

    loadAgents();
  }, []);

  // Cerrar menu al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (period: string) => {
    if (!selectedAgentName) return;
    setExporting(true);
    setShowExportMenu(false);

    try {
      const response = await fetch(
        `/api/omnicanalidad/export-xlsx?agent_name=${encodeURIComponent(selectedAgentName)}&period=${period}`
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error en exportacion');
      }

      // Descargar el archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversaciones_${selectedAgentName}_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('[TopBar] Error exportando:', e?.message);
      alert('Error al exportar: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

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

      {/* Center Section - Export Button */}
      <div className="flex items-center gap-3">
        {selectedAgentName && (
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar XLSX
                </>
              )}
            </button>

            {showExportMenu && (
              <div className="absolute left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                <button
                  onClick={() => handleExport('day')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Último día
                </button>
                <button
                  onClick={() => handleExport('week')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Última semana
                </button>
                <button
                  onClick={() => handleExport('month')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Último mes
                </button>
                <button
                  onClick={() => handleExport('year')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Último año
                </button>
                <div className="border-t border-gray-100" />
                <button
                  onClick={() => handleExport('all')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Todas las conversaciones
                </button>
              </div>
            )}
          </div>
        )}
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
