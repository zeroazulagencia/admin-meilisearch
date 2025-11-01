'use client';

import { useState, useEffect } from 'react';
import { Index, meilisearchAPI } from '@/utils/meilisearch';
import IndexProperties from '@/components/IndexProperties';
import DocumentList from '@/components/DocumentList';

interface AgentDB {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  photo?: string;
  knowledge?: any;
}

export default function AdminConocimiento() {
  const [agents, setAgents] = useState<AgentDB[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentDB | null>(null);
  const [availableIndexes, setAvailableIndexes] = useState<Index[]>([]);
  const [loadingIndexes, setLoadingIndexes] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<Index | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfText, setPdfText] = useState<string>('');
  const [loadingPdf, setLoadingPdf] = useState(false);

  const loadAgentIndexes = async () => {
    if (!selectedAgent?.knowledge?.indexes) {
      setAvailableIndexes([]);
      setSelectedIndex(null);
      return;
    }

    setLoadingIndexes(true);
    try {
      const allIndexes = await meilisearchAPI.getIndexes();
      const agentIndexes = allIndexes.filter(index => 
        selectedAgent.knowledge?.indexes.includes(index.uid)
      );
      setAvailableIndexes(agentIndexes);
      
      // No seleccionar índice por defecto
      setSelectedIndex(null);
    } catch (error) {
      console.error('Error loading indexes:', error);
    } finally {
      setLoadingIndexes(false);
    }
  };

  // No seleccionar agente por defecto

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        if (data.ok && data.agents) {
          // Normalizar knowledge para garantizar estructura consistente
          const normalized = data.agents.map((a: any) => {
            let knowledge: any = { indexes: [] };
            try {
              if (a.knowledge) {
                if (typeof a.knowledge === 'string') {
                  knowledge = JSON.parse(a.knowledge);
                } else if (typeof a.knowledge === 'object') {
                  knowledge = a.knowledge;
                }
              }
            } catch (e) {
              console.error(`[ADMIN-CONOCIMIENTO] Error parsing knowledge for agent ${a.id}:`, e);
              knowledge = { indexes: [] };
            }
            if (!knowledge || typeof knowledge !== 'object') knowledge = { indexes: [] };
            if (!Array.isArray(knowledge.indexes)) knowledge.indexes = [];
            return { ...a, knowledge } as AgentDB;
          });
          console.log('[ADMIN-CONOCIMIENTO] Agents loaded:', normalized.length);
          console.log('[ADMIN-CONOCIMIENTO] Sample agent indexes:', normalized.slice(0, 3).map((x: any) => ({ id: x.id, indexes: x.knowledge?.indexes })));
          setAgents(normalized);
        }
      } catch (e) {
        console.error('Error cargando agentes:', e);
      } finally {
        setAgentsLoading(false);
      }
    };
    loadAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      loadAgentIndexes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent]);

  if (agentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Conocimiento</h1>
        
        <div className="space-y-6">
          {/* Selector de Agente */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Agente
            </label>
            <select
              value={selectedAgent?.id || ''}
              onChange={(e) => {
                const agent = agents.find(a => a.id === parseInt(e.target.value));
                setSelectedAgent(agent || null);
                setSelectedIndex(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar agente...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} {(() => { try { const k = typeof agent.knowledge === 'string' ? JSON.parse(agent.knowledge) : (agent.knowledge || {}); return k.indexes?.length ? `(${k.indexes.length} índices)` : '(sin índices)'; } catch { return '(sin índices)'; } })()}
                </option>
              ))}
            </select>
            {selectedAgent && (
              <div className="mt-3 flex items-center gap-3">
                {selectedAgent.photo && (
                  <img
                    src={selectedAgent.photo}
                    alt={selectedAgent.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900">{selectedAgent.name}</p>
                  {selectedAgent.description && (
                    <p className="text-sm text-gray-500">{selectedAgent.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lista de Índices del Agente */}
          {loadingIndexes ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : selectedAgent && availableIndexes.length > 0 ? (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Índice
                </label>
                <select
                  value={selectedIndex?.uid || ''}
                  onChange={(e) => {
                    const index = availableIndexes.find(i => i.uid === e.target.value);
                    setSelectedIndex(index || null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar índice...</option>
                  {availableIndexes.map((index) => (
                    <option key={index.uid} value={index.uid}>
                      {index.uid} {index.name ? `- ${index.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedIndex && (
                <>
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowPdfModal(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        📄 Cargar PDF
                      </button>
                    </div>
                  </div>
                  <IndexProperties indexUid={selectedIndex.uid} />
                  <DocumentList indexUid={selectedIndex.uid} />
                </>
              )}
            </>
          ) : selectedAgent && availableIndexes.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">
                {selectedAgent?.name} no tiene índices asociados. Configura su conocimiento desde la página de Agentes.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal para Cargar PDF */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Cargar PDF</h2>
              <button
                onClick={() => {
                  setShowPdfModal(false);
                  setPdfText('');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar archivo PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  disabled={loadingPdf}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      console.log('[PDF-UPLOAD] No se seleccionó ningún archivo');
                      return;
                    }
                    
                    console.log('[PDF-UPLOAD] Archivo seleccionado:', {
                      name: file.name,
                      type: file.type,
                      size: file.size,
                      lastModified: new Date(file.lastModified).toISOString()
                    });
                    
                    setLoadingPdf(true);
                    setPdfText('');
                    
                    try {
                      console.log('[PDF-UPLOAD] Creando FormData...');
                      const formData = new FormData();
                      formData.append('file', file);
                      console.log('[PDF-UPLOAD] FormData creado, enviando a API...');
                      
                      const response = await fetch('/api/parse-pdf', {
                        method: 'POST',
                        body: formData
                      });
                      
                      console.log('[PDF-UPLOAD] Respuesta recibida:', {
                        status: response.status,
                        statusText: response.statusText,
                        ok: response.ok
                      });
                      
                      const data = await response.json();
                      console.log('[PDF-UPLOAD] Datos parseados:', {
                        success: data.success,
                        textLength: data.text?.length || 0,
                        pages: data.pages,
                        hasText: !!data.text,
                        error: data.error,
                        debug: data.debug
                      });
                      
                      if (data.success && data.text) {
                        console.log('[PDF-UPLOAD] Éxito: Texto extraído, longitud:', data.text.length);
                        console.log('[PDF-UPLOAD] Primeros 200 caracteres:', data.text.substring(0, 200));
                        setPdfText(data.text);
                      } else {
                        console.error('[PDF-UPLOAD] Error: No se pudo extraer texto');
                        console.error('[PDF-UPLOAD] Datos de error:', data);
                        setPdfText('Error: No se pudo extraer texto del PDF. El archivo puede contener solo imágenes.');
                      }
                    } catch (error: any) {
                      console.error('[PDF-UPLOAD] Error al procesar PDF:', error);
                      console.error('[PDF-UPLOAD] Detalles del error:', {
                        message: error.message,
                        stack: error.stack,
                        name: error.name
                      });
                      setPdfText('Error al procesar el PDF. Por favor intenta de nuevo.');
                    } finally {
                      setLoadingPdf(false);
                      console.log('[PDF-UPLOAD] Proceso completado');
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
              </div>
              
              {loadingPdf && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                  <p className="ml-3 text-gray-600">Procesando PDF...</p>
                </div>
              )}
              
              {pdfText && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Texto Extraído:
                  </label>
                  <textarea
                    readOnly
                    value={pdfText}
                    className="w-full h-96 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono overflow-auto"
                  />
                </div>
              )}
              
              {pdfText && pdfText.includes('Error:') && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{pdfText}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


