'use client';

import { useState, useEffect } from 'react';
import { meilisearchAPI, Document } from '@/utils/meilisearch';
import { getPermissions, getUserId } from '@/utils/permissions';
import ProtectedLayout from '@/components/ProtectedLayout';
import AgentSelector from '@/components/ui/AgentSelector';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [generatingPDF, setGeneratingPDF] = useState(false);
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

  const handleDownloadPDF = async () => {
    if (!selectedReport || !reportHtml) return;

    setGeneratingPDF(true);

    let pdfContainer: HTMLDivElement | null = null;

    try {
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
      
      // Eliminar márgenes y padding superiores de todos los elementos
      if (htmlEl.style) {
        // Eliminar márgenes y padding superiores
        htmlEl.style.marginTop = '0';
        htmlEl.style.paddingTop = '0';
        
        // Procesar gradientes
        const bg = htmlEl.style.background || htmlEl.style.backgroundColor;
        if (bg && bg.includes('gradient')) {
          const solidColor = getFirstColorFromGradient(bg);
          htmlEl.style.background = solidColor;
          htmlEl.style.backgroundColor = solidColor;
        }
      }
      
      // Procesar atributos style
      let styleAttr = htmlEl.getAttribute('style');
      if (styleAttr) {
        // Eliminar margin-top y padding-top del style attribute
        styleAttr = styleAttr.replace(/margin-top\s*:\s*[^;]+;?/gi, '');
        styleAttr = styleAttr.replace(/padding-top\s*:\s*[^;]+;?/gi, '');
        styleAttr = styleAttr.replace(/margin\s*:\s*[^;]+;?/gi, (match) => {
          // Si es margin completo, mantener solo los lados que no sean top
          return match.replace(/margin\s*:\s*([^;]+)/i, (m, values) => {
            const parts = values.trim().split(/\s+/);
            if (parts.length === 4) {
              // margin: top right bottom left -> margin: 0 right bottom left
              return `margin: 0 ${parts[1]} ${parts[2]} ${parts[3]}`;
            } else if (parts.length === 2) {
              // margin: top/bottom left/right -> margin: 0 left/right
              return `margin: 0 ${parts[1]}`;
            }
            return m;
          });
        });
        
        // Agregar margin-top y padding-top explícitos a 0
        if (!styleAttr.includes('margin-top')) {
          styleAttr += ' margin-top: 0;';
        }
        if (!styleAttr.includes('padding-top')) {
          styleAttr += ' padding-top: 0;';
        }
        
        // Procesar gradientes
        if (styleAttr.includes('gradient')) {
          styleAttr = styleAttr.replace(/background[^;]*linear-gradient[^;()]*\([^)]*\)[^;]*;?/gi, (match) => {
            const solidColor = getFirstColorFromGradient(match);
            return `background: ${solidColor} !important;`;
          });
        }
        
        htmlEl.setAttribute('style', styleAttr);
      } else {
        // Si no tiene style, agregar uno para eliminar márgenes superiores
        htmlEl.setAttribute('style', 'margin-top: 0; padding-top: 0;');
      }
    });
    
      // Obtener el HTML procesado
      processedHtml = doc.body.innerHTML;
      
      // Limpiar elementos que puedan causar superposición
      // Eliminar cualquier elemento con position absolute o fixed que pueda interferir
      processedHtml = processedHtml.replace(/position\s*:\s*(absolute|fixed)/gi, 'position: static');
      // Asegurar que no haya z-index muy altos en el contenido
      processedHtml = processedHtml.replace(/z-index\s*:\s*\d+/gi, 'z-index: 0');
      // Eliminar cualquier overlay o elemento que pueda estar causando problemas
      processedHtml = processedHtml.replace(/<div[^>]*class="[^"]*overlay[^"]*"[^>]*>.*?<\/div>/gis, '');

      // Crear un elemento temporal fuera de la vista para renderizar el PDF
      pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.top = '0';
      // Tamaño carta: 8.5 x 11 pulgadas = 816 x 1056 píxeles a 96dpi
      // Usamos un ancho más eficiente para el contenido
      pdfContainer.style.width = '816px';
      pdfContainer.style.backgroundColor = '#f5f5f5';
      pdfContainer.style.padding = '0';
      pdfContainer.style.margin = '0';
      pdfContainer.innerHTML = `
        <div class="pdf-container" style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 0; width: 100%; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); font-family: Arial, sans-serif; color: #1f2937;">
          <div class="pdf-header" style="margin-top: 0; padding-top: 0; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
            <div style="margin-top: 0; padding-top: 0; margin-bottom: 8px;">
              <div style="font-size: 22px; font-weight: 700; color: #111827; margin-top: 0; padding-top: 0; margin-bottom: 4px;">DWORKERS - Agentes IA</div>
              <div style="font-size: 14px; font-weight: 500; color: #6b7280; margin-top: 0; padding-top: 0; margin-bottom: 6px;">By Zero Azul</div>
              <div style="font-size: 12px; color: #3b82f6; margin-top: 0; padding-top: 0;">
                <a href="https://dworkers.zeroazul.com" style="color: #3b82f6; text-decoration: none;">dworkers.zeroazul.com</a>
              </div>
            </div>
          </div>
          <div class="content" style="margin-top: 0; padding-top: 0; line-height: 1.6; width: 100%; max-width: 100%; box-sizing: border-box; position: relative; z-index: 0;">
            ${processedHtml}
          </div>
          <div class="agent-info" style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb; display: flex; align-items: flex-start; gap: 20px; background: #f9fafb; padding: 25px; border-radius: 8px; position: relative; z-index: 10; overflow: visible;">
            ${agentInfo?.photo ? `<img src="${agentInfo.photo}" alt="${agentName}" style="width: 80px; height: 80px; border-radius: 10px; object-fit: cover; border: 3px solid #e5e7eb; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); flex-shrink: 0;" />` : `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; width: 80px; height: 80px; border-radius: 10px; border: 3px solid #e5e7eb; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); font-weight: bold; flex-shrink: 0;">${agentName.charAt(0).toUpperCase()}</div>`}
            <div style="flex: 1;">
              <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600;">Generado por</div>
              <div style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 12px; line-height: 1.3;">${agentName}</div>
              ${agentInfo?.description ? `<div style="font-size: 13px; color: #4b5563; line-height: 1.6; margin-bottom: 15px;">${agentInfo.description}</div>` : ''}
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 12px; color: #6b7280; line-height: 1.5; margin-bottom: 5px;">
                  Este reporte fue generado automáticamente por un agente de inteligencia artificial.
                </div>
                <div style="font-size: 12px; color: #6b7280; line-height: 1.5; margin-bottom: 5px;">
                  Para más información, visita: 
                  <span style="color: #3b82f6; font-weight: 500;">dworkers.zeroazul.com</span>
                </div>
                <div style="font-size: 11px; color: #9ca3af; margin-top: 8px; font-style: italic;">
                  DWORKERS - Empleados Digitales con Inteligencia Artificial
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(pdfContainer);

      // Esperar a que las imágenes se carguen
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Capturar el elemento con html2canvas - escala reducida para optimizar peso
      const canvas = await html2canvas(pdfContainer, {
        backgroundColor: '#f5f5f5',
        scale: 1.5, // Reducido de 2 a 1.5 para optimizar peso
        useCORS: true,
        logging: false,
        width: pdfContainer.offsetWidth,
        height: pdfContainer.offsetHeight,
        windowWidth: pdfContainer.offsetWidth,
        windowHeight: pdfContainer.offsetHeight,
      });

      // Crear PDF con jsPDF en tamaño carta (letter)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter', // Tamaño carta: 8.5 x 11 pulgadas
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calcular ratio para que el contenido use todo el ancho de la página
      const widthRatio = pdfWidth / imgWidth;
      const ratio = widthRatio; // Usar solo el ratio de ancho para mantener proporciones
      
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;

      // Convertir altura de página a píxeles del canvas original (sin escalar)
      const pageHeightInOriginalPixels = pdfHeight / ratio;
      
      // Dividir la imagen en páginas
      let yPosition = 0;
      let pageNumber = 0;

      while (yPosition < imgHeight) {
        if (pageNumber > 0) {
          pdf.addPage();
        }

        // Calcular cuánto de la imagen cabe en esta página
        const remainingHeight = imgHeight - yPosition;
        const heightForThisPage = Math.min(pageHeightInOriginalPixels, remainingHeight);
        
        // Crear un canvas temporal para esta porción de la imagen
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgWidth;
        pageCanvas.height = heightForThisPage;
        const pageCtx = pageCanvas.getContext('2d');
        
        if (pageCtx) {
          // Dibujar solo la porción de la imagen que corresponde a esta página
          pageCtx.drawImage(
            canvas,
            0, yPosition,           // Coordenadas de origen en la imagen original
            imgWidth, heightForThisPage,  // Dimensiones a copiar
            0, 0,                    // Coordenadas de destino en el nuevo canvas
            imgWidth, heightForThisPage   // Dimensiones en el nuevo canvas
          );
          
          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.85);
          const pageScaledHeight = heightForThisPage * ratio;
          
          pdf.addImage(pageImgData, 'JPEG', 0, 0, imgScaledWidth, pageScaledHeight);
        }
        
        yPosition += pageHeightInOriginalPixels;
        pageNumber++;
      }

      // Descargar el PDF
      pdf.save(`reporte-${selectedReport.type}-${formatDate(selectedReport.datetime).replace(/\//g, '-')}.pdf`);

      // Limpiar el elemento temporal
      if (pdfContainer && document.body.contains(pdfContainer)) {
        document.body.removeChild(pdfContainer);
      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      if (pdfContainer && document.body.contains(pdfContainer)) {
        document.body.removeChild(pdfContainer);
      }
      alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    } finally {
      setGeneratingPDF(false);
    }
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
                    disabled={!reportHtml || loadingReportDetail || generatingPDF}
                    className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium ${
                      generatingPDF 
                        ? 'bg-gray-400 text-white' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {generatingPDF ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generando PDF...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Descargar PDF
                      </>
                    )}
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

