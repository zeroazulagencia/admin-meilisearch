'use client';

import { useState, useEffect } from 'react';
import { meilisearchAPI, Document } from '@/utils/meilisearch';
import { getPermissions, getUserId } from '@/utils/permissions';
import ProtectedLayout from '@/components/ProtectedLayout';
import AgentSelector from '@/components/ui/AgentSelector';

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
  reports_agent_name?: string;
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
  const [selectedReport, setSelectedReport] = useState<ReportDocument | null>(null);
  const [reportHtml, setReportHtml] = useState<string>('');
  const [loadingReportDetail, setLoadingReportDetail] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [deletingReport, setDeletingReport] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ isOpen: boolean; reportId: string | null }>({
    isOpen: false,
    reportId: null,
  });

  const INDEX_UID = 'bd_reports_dworkers';

  // Inicializar fechas: desde el inicio del mes actual hasta hoy
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const firstDayStr = firstDayOfMonth.toISOString().split('T')[0]; // YYYY-MM-DD
    
    setDateFrom(firstDayStr);
    setDateTo(todayStr);
  }, []);

  useEffect(() => {
    if (selectedPlatformAgent !== 'all' && selectedPlatformAgent) {
      const agent = allPlatformAgents.find(a => a.id === parseInt(selectedPlatformAgent));
      if (agent?.reports_agent_name) {
        setSelectedAgent(agent.reports_agent_name);
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
        // Filtrar solo agentes que tienen reports_agent_name asociado
        list = list.filter(a => a.reports_agent_name && a.reports_agent_name.trim() !== '');
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
  }, [selectedAgent, dateFrom, dateTo]);

  const loadReports = async () => {
    try {
      setLoadingReports(true);
      
      const allDocuments: ReportDocument[] = [];
      
      // Cargar todos los documentos normalmente
      let currentOffset = 0;
      const batchLimit = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const data = await meilisearchAPI.getDocuments(INDEX_UID, batchLimit, currentOffset);
        
        const filtered = data.results.filter((doc: any): doc is ReportDocument => {
          const isAgent = doc.agent === selectedAgent;
          
          let isInDateRange = true;
          if (dateFrom && dateTo && doc.datetime) {
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

  const formatDateHuman = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return 'Hace unos momentos';
      } else if (diffMins < 60) {
        return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
      } else if (diffHours < 24) {
        return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
      } else if (diffDays === 1) {
        return 'Ayer';
      } else if (diffDays < 7) {
        return `Hace ${diffDays} días`;
      } else {
        return date.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch {
      return dateStr;
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('¿Está seguro de eliminar este reporte? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingReport(reportId);
    try {
      await meilisearchAPI.deleteDocument(INDEX_UID, reportId);
      
      // Esperar un momento para que Meilisearch procese la eliminación
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Recargar la lista de reportes
      await loadReports();
      
      // Si el reporte eliminado estaba abierto, cerrar el modal
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
        setReportHtml('');
      }
    } catch (err) {
      console.error('Error eliminando reporte:', err);
      alert('Error al eliminar el reporte. Por favor, intenta nuevamente.');
    } finally {
      setDeletingReport(null);
      setShowDeleteConfirm({ isOpen: false, reportId: null });
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedReport || !reportHtml) return;

    // Crear un nuevo documento HTML para el PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const agentInfo = allPlatformAgents.find(a => a.reports_agent_name === selectedReport.agent);
    const agentName = agentInfo?.name || selectedReport.agent;

    // Procesar el HTML para convertir degradados y estilos incompatibles
    let processedHtml = reportHtml;
    
    // Crear un parser DOM temporal para procesar el HTML correctamente
    const parser = new DOMParser();
    const doc = parser.parseFromString(reportHtml, 'text/html');
    
    // Función para extraer el primer color de un gradiente
    const getFirstColorFromGradient = (gradient: string): string => {
      // Buscar colores en formato hex, rgb, rgba
      const colorMatch = gradient.match(/#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)/i);
      if (colorMatch) {
        return colorMatch[0];
      }
      // Si no encuentra color, usar azul por defecto para elementos azules
      if (gradient.includes('blue') || gradient.includes('#3b82f6') || gradient.includes('#2563eb')) {
        return '#3b82f6';
      }
      return '#f3f4f6'; // Color gris por defecto
    };
    
    // Procesar todos los elementos con estilos inline
    const allElements = doc.querySelectorAll('*');
    allElements.forEach((el: Element) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style) {
        const bg = htmlEl.style.background || htmlEl.style.backgroundColor;
        if (bg && bg.includes('gradient')) {
          const solidColor = getFirstColorFromGradient(bg);
          htmlEl.style.background = solidColor;
          htmlEl.style.backgroundColor = solidColor;
        }
      }
      
      // Procesar atributos style
      const styleAttr = htmlEl.getAttribute('style');
      if (styleAttr && styleAttr.includes('gradient')) {
        const newStyle = styleAttr.replace(/background[^;]*linear-gradient[^;()]*\([^)]*\)[^;]*;?/gi, (match) => {
          const solidColor = getFirstColorFromGradient(match);
          return `background: ${solidColor} !important;`;
        });
        htmlEl.setAttribute('style', newStyle);
      }
    });
    
    // Obtener el HTML procesado
    processedHtml = doc.body.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${selectedReport.type} - ${formatDate(selectedReport.datetime)}</title>
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            body {
              font-family: Arial, sans-serif;
              padding: 0;
              margin: 0;
              max-width: 100%;
              background: white;
              color: #1f2937;
            }
            
            .header {
              margin-bottom: 15px;
              padding-bottom: 10px;
              padding-top: 0;
              margin-top: 0;
              border-bottom: 2px solid #e5e7eb;
            }
            
            .type-badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 4px;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 10px;
              background-color: #3b82f6 !important;
              color: white !important;
              border: 1px solid #2563eb;
            }
            
            .date {
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 10px;
            }
            
            .agent-info {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
            }
            
            .agent-photo {
              width: 50px;
              height: 50px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid #e5e7eb;
            }
            
            .agent-name {
              font-size: 14px;
              color: #6b7280;
            }
            
            .content {
              margin-top: 10px;
              line-height: 1.6;
            }
            
            .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
              color: #1f2937;
              margin-top: 24px;
              margin-bottom: 12px;
              font-weight: 600;
            }
            
            .content p {
              margin-bottom: 12px;
              color: #374151;
            }
            
            .content ul, .content ol {
              margin-bottom: 12px;
              padding-left: 24px;
            }
            
            .content li {
              margin-bottom: 6px;
              color: #374151;
            }
            
            .content img {
              max-width: 100%;
              height: auto;
              border: 1px solid #e5e7eb;
              margin: 12px 0;
            }
            
            .content table {
              width: 100%;
              border-collapse: collapse;
              margin: 16px 0;
            }
            
            .content table th,
            .content table td {
              border: 1px solid #e5e7eb;
              padding: 8px 12px;
              text-align: left;
            }
            
            .content table th {
              background-color: #f9fafb !important;
              font-weight: 600;
              color: #1f2937;
            }
            
            .content code {
              background-color: #f3f4f6;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: 'Courier New', monospace;
              font-size: 0.9em;
            }
            
            .content pre {
              background-color: #f9fafb;
              border: 1px solid #e5e7eb;
              padding: 12px;
              border-radius: 4px;
              overflow-x: auto;
            }
            
            .content blockquote {
              border-left: 4px solid #3b82f6;
              padding-left: 16px;
              margin: 16px 0;
              color: #6b7280;
            }
            
            /* Convertir todos los gradientes restantes a colores sólidos */
            [style*="gradient"] {
              background: #3b82f6 !important;
            }
            
            /* Asegurar que los colores de fondo se impriman */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            /* Preservar contenido visible - asegurar que el texto sea negro */
            .content * {
              color: #1f2937 !important;
            }
            
            /* Asegurar que los elementos con fondo azul tengan texto blanco */
            [style*="background"][style*="#3b82f6"],
            [style*="background"][style*="#2563eb"],
            [style*="background"][style*="blue"] {
              color: white !important;
            }
            
            /* Asegurar visibilidad de texto en todos los elementos */
            div, span, p, h1, h2, h3, h4, h5, h6, table, tr, td, th, li, ul, ol {
              color: #1f2937 !important;
            }
            
            /* Elementos con fondo azul deben tener texto blanco */
            div[style*="background"][style*="#3b82f6"],
            div[style*="background"][style*="#2563eb"],
            span[style*="background"][style*="#3b82f6"],
            span[style*="background"][style*="#2563eb"] {
              color: white !important;
            }
            
            @media print {
              @page {
                margin: 0.3cm 1cm 1cm 1cm;
                size: A4;
              }
              
              body {
                padding: 0 !important;
                margin: 0 !important;
                background: white;
              }
              
              .header {
                padding-top: 0 !important;
                margin-top: 0 !important;
                margin-bottom: 8px !important;
                padding-bottom: 8px !important;
                page-break-after: avoid;
              }
              
              .content {
                margin-top: 0 !important;
                padding-top: 0 !important;
              }
              
              .type-badge {
                margin-top: 0 !important;
                margin-bottom: 5px !important;
              }
              
              .date {
                margin-top: 0 !important;
                margin-bottom: 5px !important;
              }
              
              .content {
                page-break-inside: avoid;
              }
              
              .agent-info {
                page-break-inside: avoid;
                margin-top: 40px;
              }
              
              /* Ocultar elementos que no deben imprimirse */
              .no-print {
                display: none !important;
              }
              
              /* Asegurar que las imágenes se impriman */
              img {
                max-width: 100% !important;
                page-break-inside: avoid;
              }
              
              /* Evitar cortes de página en elementos importantes */
              h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
              }
              
              p, li {
                orphans: 3;
                widows: 3;
              }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0;">
          <div class="header" style="margin-top: 0; padding-top: 0;">
            <div class="type-badge" style="margin-top: 0;">${selectedReport.type}</div>
            <div class="date" style="margin-top: 0;">${formatDate(selectedReport.datetime)}</div>
          </div>
          <div class="content" style="margin-top: 0; padding-top: 0;">
            ${processedHtml}
          </div>
          <div class="agent-info">
            ${agentInfo?.photo ? `<img src="${agentInfo.photo}" alt="${agentName}" class="agent-photo" />` : ''}
            <div>
              <div class="agent-name"><strong>Creado por:</strong> ${agentName}</div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Esperar a que se cargue el contenido y luego imprimir/descargar PDF
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <ProtectedLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <button
          onClick={() => setShowCodeModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          title="Ver instrucciones de inserción"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
      </div>
      
      {/* Selector de Agente de la Plataforma */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <AgentSelector
          label="Seleccionar Agente de la Plataforma"
          agents={allPlatformAgents}
          selectedAgent={selectedPlatformAgent}
          onChange={(agent) => {
            if (typeof agent === 'string') {
              setSelectedPlatformAgent(agent);
            } else if (agent === null) {
              setSelectedPlatformAgent('all');
            } else {
              setSelectedPlatformAgent(agent.id.toString());
            }
          }}
          placeholder="Todos los agentes"
          includeAllOption={true}
          allOptionLabel="Todos los agentes"
          getDisplayText={(agent) => {
            if (agent.id === 'all') return agent.name;
            return `${agent.name} ${agent.reports_agent_name ? `(${agent.reports_agent_name})` : '(sin identificar)'}`;
          }}
          loading={!agentsInitialized}
          className="w-full"
        />
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
                    {agent.reports_agent_name && (
                      <p className="text-xs text-gray-400">ID: {agent.reports_agent_name}</p>
                    )}
                  </div>
                </>
              ) : null;
            })()}
          </div>
        )}
      </div>

      {/* Filtro de Fechas */}
      {selectedAgent !== 'all' && selectedPlatformAgent !== 'all' && selectedPlatformAgent && (
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
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="text-[#5DE1E5] hover:text-[#4DD1D5] transition-colors"
                        >
                          Ver Reporte
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          disabled={deletingReport === report.id}
                          className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          title="Eliminar reporte"
                        >
                          {deletingReport === report.id ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                              <span>Eliminando...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Eliminar</span>
                            </>
                          )}
                        </button>
                      </div>
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
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header del Modal */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1.5 text-sm font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      {selectedReport.type}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDateHuman(selectedReport.datetime)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatDate(selectedReport.datetime)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={!reportHtml || loadingReportDetail}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descargar PDF
                  </button>
                  <button
                    onClick={() => {
                      setSelectedReport(null);
                      setReportHtml('');
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {/* Información del Agente */}
              {(() => {
                const agentInfo = allPlatformAgents.find(a => a.reports_agent_name === selectedReport.agent);
                const agentName = agentInfo?.name || selectedReport.agent;
                return (
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                    {agentInfo?.photo ? (
                      <img
                        src={agentInfo.photo}
                        alt={agentName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                        <span className="text-gray-500 font-semibold text-lg">
                          {agentName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{agentName}</p>
                      {agentInfo?.description && (
                        <p className="text-xs text-gray-500">{agentInfo.description}</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* Contenido del Reporte */}
            <div className="p-6 flex-1 overflow-auto bg-gray-50">
              {loadingReportDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-10 w-10 border-4 border-t-transparent rounded-full border-[#5DE1E5]"></div>
                  <p className="ml-3 text-gray-600">Cargando reporte...</p>
                </div>
              ) : reportHtml ? (
                <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
                  <style dangerouslySetInnerHTML={{
                    __html: `
                      .report-html-content {
                        width: 100%;
                      }
                      .report-html-content * {
                        box-sizing: border-box;
                      }
                      .report-html-content img {
                        max-width: 100%;
                        height: auto;
                      }
                      .report-html-content table {
                        width: 100%;
                        border-collapse: collapse;
                      }
                      .report-html-content a {
                        color: #2563eb;
                        text-decoration: underline;
                      }
                    `
                  }} />
                  <div 
                    className="report-html-content"
                    dangerouslySetInnerHTML={{ __html: reportHtml }}
                  />
                  
                  {/* Footer con información del creador */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    {(() => {
                      const agentInfo = allPlatformAgents.find(a => a.reports_agent_name === selectedReport.agent);
                      const agentName = agentInfo?.name || selectedReport.agent;
                      return (
                        <div className="flex items-center gap-3">
                          {agentInfo?.photo ? (
                            <img
                              src={agentInfo.photo}
                              alt={agentName}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                              <span className="text-gray-500 font-semibold">
                                {agentName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Creado por:</span> {agentName}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-8 text-center">
                  <p className="text-gray-500">No hay contenido disponible para este reporte.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Instrucciones de Código */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header del Modal */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Insertar Reporte en Meilisearch</h2>
                    <p className="text-sm text-gray-500">Instrucciones usando curl</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Contenido del Modal */}
            <div className="p-6 flex-1 overflow-auto bg-gray-50">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="space-y-6">
                  {/* Información del Endpoint */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Endpoint</h3>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <div className="text-green-400">POST</div>
                      <div className="mt-1">https://server-search.zeroazul.com/indexes/{INDEX_UID}/documents</div>
                    </div>
                  </div>

                  {/* Ejemplo de curl */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Ejemplo con curl</h3>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{`curl -X POST 'https://server-search.zeroazul.com/indexes/bd_reports_dworkers/documents' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_MEILISEARCH_API_KEY' \\
  -d '{
    "id": "report-001",
    "type": "Agent",
    "datetime": "2024-01-15T10:30:00Z",
    "agent": "nombre-del-agente",
    "report": "<h1>Contenido del Reporte</h1><p>Aquí va el contenido HTML del reporte...</p>"
  }'`}</pre>
                    </div>
                  </div>

                  {/* Estructura del Documento */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Estructura del Documento</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="space-y-2 text-sm font-mono text-gray-700">
                        <div><span className="text-blue-600">id</span>: <span className="text-gray-600">string (requerido) - Identificador único del reporte</span></div>
                        <div><span className="text-blue-600">type</span>: <span className="text-gray-600">string (requerido) - Tipo de reporte: &quot;Agent&quot; o &quot;RPA&quot;</span></div>
                        <div><span className="text-blue-600">datetime</span>: <span className="text-gray-600">string ISO 8601 (requerido) - Fecha y hora del reporte</span></div>
                        <div><span className="text-blue-600">agent</span>: <span className="text-gray-600">string (requerido) - Nombre del agente (debe coincidir con reports_agent_name)</span></div>
                        <div><span className="text-blue-600">report</span>: <span className="text-gray-600">string HTML (opcional) - Contenido del reporte en formato HTML</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Notas Importantes */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Notas Importantes</h3>
                    <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                      <li>El campo <code className="bg-gray-200 px-1 rounded">type</code> solo puede ser <code className="bg-gray-200 px-1 rounded">&quot;Agent&quot;</code> o <code className="bg-gray-200 px-1 rounded">&quot;RPA&quot;</code></li>
                      <li>El campo <code className="bg-gray-200 px-1 rounded">agent</code> debe coincidir exactamente con el <code className="bg-gray-200 px-1 rounded">reports_agent_name</code> configurado en el agente</li>
                      <li>El campo <code className="bg-gray-200 px-1 rounded">datetime</code> debe estar en formato ISO 8601 (ejemplo: 2024-01-15T10:30:00Z)</li>
                      <li>El campo <code className="bg-gray-200 px-1 rounded">id</code> debe ser único para cada reporte</li>
                      <li>El campo <code className="bg-gray-200 px-1 rounded">report</code> acepta HTML válido</li>
                      <li>Necesitarás tu API Key de Meilisearch para autenticación</li>
                    </ul>
                  </div>

                  {/* Ejemplo con múltiples documentos */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Insertar múltiples reportes</h3>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{`curl -X POST 'https://server-search.zeroazul.com/indexes/bd_reports_dworkers/documents' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_MEILISEARCH_API_KEY' \\
  -d '[
    {
      "id": "report-001",
      "type": "Agent",
      "datetime": "2024-01-15T10:30:00Z",
      "agent": "nombre-del-agente",
      "report": "<h1>Reporte 1</h1>"
    },
    {
      "id": "report-002",
      "type": "RPA",
      "datetime": "2024-01-16T10:30:00Z",
      "agent": "nombre-del-agente",
      "report": "<h1>Reporte 2</h1>"
    }
  ]'`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}

