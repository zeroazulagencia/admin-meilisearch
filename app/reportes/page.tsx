'use client';

import { useState, useEffect } from 'react';
import { meilisearchAPI, Document } from '@/utils/meilisearch';
import { getPermissions, getUserId } from '@/utils/permissions';
import ProtectedLayout from '@/components/ProtectedLayout';
import AlertModal from '@/components/ui/AlertModal';

interface ReportDocument {
  id: string;
  type: string;
  datetime: string;
  agent: string;
  report?: string; // Solo se carga cuando se abre el modal
}

interface AgentDB {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  photo?: string;
  conversation_agent_name?: string;
}

export default function Reportes() {
  const [allPlatformAgents, setAllPlatformAgents] = useState<AgentDB[]>([]);
  const [agentsInitialized, setAgentsInitialized] = useState<boolean>(false);
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedPlatformAgent, setSelectedPlatformAgent] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<ReportDocument | null>(null);
  const [reportHtml, setReportHtml] = useState<string>('');
  const [loadingReportDetail, setLoadingReportDetail] = useState(false);

  const INDEX_UID = 'bd_reports_dworkers';

  // Inicializar fechas con HOY como default
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    setDateFrom(todayStr);
    setDateTo(todayStr);
  }, []);

  useEffect(() => {
    if (selectedPlatformAgent !== 'all' && selectedPlatformAgent) {
      const agent = allPlatformAgents.find(a => a.id === parseInt(selectedPlatformAgent));
      if (agent?.conversation_agent_name) {
        setSelectedAgent(agent.conversation_agent_name);
      }
    } else {
      setSelectedAgent('all');
      setReports([]);
    }
  }, [selectedPlatformAgent, allPlatformAgents]);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        let list: AgentDB[] = data.ok ? data.agents : [];
        const permissions = getPermissions();
        const userId = getUserId();
        if (permissions && userId && permissions.type !== 'admin' && !permissions.reportes?.viewAll) {
          list = list.filter(a => a.client_id === parseInt(userId));
        }
        setAllPlatformAgents(list);
      } catch (e) {
        console.error('Error cargando agentes:', e);
      } finally {
        setAgentsInitialized(true);
      }
    };
    loadAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent !== 'all') {
      loadReports();
    }
  }, [selectedAgent, dateFrom, dateTo, searchQuery]);

  const loadReports = async () => {
    try {
      setLoadingReports(true);
      
      const allDocuments: ReportDocument[] = [];
      
      // Si hay búsqueda, usar búsqueda de Meilisearch
      let searchFailed = false;
      if (searchQuery && searchQuery.trim()) {
        try {
          const filters: string[] = [];
          filters.push(`agent = "${selectedAgent}"`);
          
          if (dateFrom && dateTo) {
            const fromDateISO = new Date(dateFrom + 'T00:00:00Z').toISOString();
            const toDateISO = new Date(dateTo + 'T23:59:59Z').toISOString();
            filters.push(`datetime >= "${fromDateISO}"`);
            filters.push(`datetime <= "${toDateISO}"`);
          }
          
          const searchResults = await meilisearchAPI.searchDocuments(
            INDEX_UID,
            searchQuery,
            1000,
            0,
            { filter: filters.join(' AND ') }
          );
          
          // Filtrar y validar que los documentos tengan los campos requeridos
          const validReports = searchResults.hits.filter((doc: any): doc is ReportDocument => {
            return doc.id && doc.type && doc.datetime && doc.agent;
          });
          allDocuments.push(...validReports);
        } catch (err: any) {
          searchFailed = true;
        }
      }
      
      // Si no hay búsqueda o si la búsqueda falló, cargar todos los documentos normalmente
      if (!searchQuery || !searchQuery.trim() || searchFailed) {
        let currentOffset = 0;
        const batchLimit = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const data = await meilisearchAPI.getDocuments(INDEX_UID, batchLimit, currentOffset);
          
          const filtered = data.results.filter((doc: any): doc is ReportDocument => {
            const isAgent = doc.agent === selectedAgent;
            
            let isInDateRange = true;
            if (dateFrom && doc.datetime) {
              const docDate = new Date(doc.datetime);
              const fromDate = new Date(dateFrom + 'T00:00:00');
              const toDate = new Date(dateTo + 'T23:59:59');
              isInDateRange = docDate >= fromDate && docDate <= toDate;
            }
            
            return isAgent && isInDateRange && doc.id && doc.type && doc.datetime;
          });
          
          allDocuments.push(...filtered);
          
          if (data.results.length < batchLimit) {
            hasMore = false;
          } else {
            currentOffset += batchLimit;
          }
        }
      }
      
      // Ordenar por datetime descendente (más recientes primero)
      allDocuments.sort((a, b) => {
        const dateA = new Date(a.datetime).getTime();
        const dateB = new Date(b.datetime).getTime();
        return dateB - dateA;
      });
      
      setReports(allDocuments);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleViewReport = async (report: ReportDocument) => {
    setSelectedReport(report);
    setLoadingReportDetail(true);
    
    try {
      // Obtener el documento completo con el campo report
      const doc = await meilisearchAPI.getDocument(INDEX_UID, report.id);
      setReportHtml(doc.report || '');
    } catch (err) {
      console.error('Error loading report detail:', err);
      setReportHtml('');
    } finally {
      setLoadingReportDetail(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <ProtectedLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reportes</h1>
      
      {/* Selector de Agente de la Plataforma */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Agente de la Plataforma
        </label>
        {!agentsInitialized ? (
          <div className="text-sm flex items-center gap-2 text-[#5DE1E5]">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-[#5DE1E5]"></div>
            Cargando agentes de la plataforma...
          </div>
        ) : (
          <>
            <select
              value={selectedPlatformAgent}
              onChange={(e) => setSelectedPlatformAgent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
            >
              <option value="all">Todos los agentes</option>
              {allPlatformAgents.map((agent) => (
                <option key={agent.id} value={agent.id.toString()}>
                  {agent.name} {agent.conversation_agent_name ? `(${agent.conversation_agent_name})` : '(sin identificar)'}
                </option>
              ))}
            </select>
            {selectedPlatformAgent !== 'all' && selectedPlatformAgent && (
              <div className="mt-3 flex items-center gap-3">
                {(() => {
                  const agent = allPlatformAgents.find(a => a.id === parseInt(selectedPlatformAgent));
                  return agent ? (
                    <>
                      {agent.photo && (
                        <img
                          src={agent.photo}
                          alt={agent.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{agent.name}</p>
                        {agent.description && (
                          <p className="text-sm text-gray-500">{agent.description}</p>
                        )}
                        {agent.conversation_agent_name && (
                          <p className="text-xs text-gray-400">ID: {agent.conversation_agent_name}</p>
                        )}
                      </div>
                    </>
                  ) : null;
                })()}
              </div>
            )}
          </>
        )}
      </div>

      {/* Búsqueda y Filtro de Fechas */}
      {selectedAgent !== 'all' && selectedPlatformAgent !== 'all' && selectedPlatformAgent && (
        <>
          {/* Campo de Búsqueda */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar por Palabras Clave
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en reportes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm text-[#5DE1E5] hover:underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>

          {/* Filtro de Fechas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Filtrar por Rango de Fechas
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#5DE1E5' } as React.CSSProperties & { '--tw-ring-color': string }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Listado de Reportes */}
      {loadingReports ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full border-[#5DE1E5]"></div>
        </div>
      ) : selectedAgent === 'all' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-gray-500">
            Por favor, selecciona un agente para ver sus reportes.
          </p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-gray-500">
            No hay reportes disponibles para el agente seleccionado.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agente
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {report.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(report.datetime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {report.agent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewReport(report)}
                        className="text-[#5DE1E5] hover:text-[#4DD1D5] transition-colors"
                      >
                        Ver Reporte
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para mostrar el reporte */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Reporte</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedReport.type} - {formatDate(selectedReport.datetime)} - {selectedReport.agent}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setReportHtml('');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto">
              {loadingReportDetail ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full border-[#5DE1E5]"></div>
                </div>
              ) : reportHtml ? (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: reportHtml }}
                />
              ) : (
                <p className="text-gray-500">No hay contenido disponible para este reporte.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}

