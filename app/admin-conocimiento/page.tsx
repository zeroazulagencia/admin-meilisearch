'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const [pdfIdPrefix, setPdfIdPrefix] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Estados para los pasos del modal PDF
  const [pdfStep, setPdfStep] = useState<'text' | 'fields' | 'review'>('text');
  const [indexFields, setIndexFields] = useState<string[]>([]);
  const [selectedIdField, setSelectedIdField] = useState<string>('');
  const [selectedTextField, setSelectedTextField] = useState<string>('');
  const [preparedChunks, setPreparedChunks] = useState<Array<{ id: string; text: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Array<{
    chunkIndex: number;
    taskUid: number;
    status: 'pending' | 'processing' | 'succeeded' | 'failed';
    message: string;
  }>>([]);
  
  // Calcular cantidad de chunks basado en el símbolo [separador]
  const calculateChunks = (text: string): number => {
    if (!text || text.trim().length === 0) return 1;
    const separators = (text.match(/\[separador\]/g) || []).length;
    return separators + 1; // Si hay n separadores, hay n+1 chunks
  };

  // Cargar campos del índice desde un documento de ejemplo
  const loadIndexFields = async () => {
    if (!selectedIndex) return;
    
    try {
      // Obtener un documento de ejemplo para ver la estructura
      const documents = await meilisearchAPI.getDocuments(selectedIndex.uid, 1, 0);
      if (documents.results.length > 0) {
        const sampleDoc = documents.results[0];
        const fields = Object.keys(sampleDoc);
        setIndexFields(fields);
        // Seleccionar primeros campos por defecto si existen
        if (fields.length > 0) {
          setSelectedIdField(fields[0]);
          if (fields.length > 1) {
            setSelectedTextField(fields[1]);
          } else {
            setSelectedTextField(fields[0]);
          }
        }
      } else {
        // Si no hay documentos, usar campos comunes
        const commonFields = ['id', 'text', 'content', 'title', 'body'];
        setIndexFields(commonFields);
        setSelectedIdField(commonFields[0]);
        setSelectedTextField(commonFields[1] || commonFields[0]);
      }
    } catch (error) {
      console.error('[PDF-UPLOAD] Error cargando campos del índice:', error);
      // Campos por defecto
      const defaultFields = ['id', 'text', 'content'];
      setIndexFields(defaultFields);
      setSelectedIdField(defaultFields[0]);
      setSelectedTextField(defaultFields[1]);
    }
  };

  // Dividir texto en chunks y generar IDs
  const prepareChunks = () => {
    if (!pdfText || pdfText.includes('Error:')) return;
    
    // Dividir por [separador]
    const chunks = pdfText.split('[separador]').map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
    
    // Generar IDs para cada chunk
    const chunksWithIds = chunks.map((text, index) => {
      const id = pdfIdPrefix ? `${pdfIdPrefix}${Date.now()}-${index + 1}` : `chunk-${Date.now()}-${index + 1}`;
      return { id, text };
    });
    
    setPreparedChunks(chunksWithIds);
  };

  // Subir chunks a Meilisearch uno por uno
  const uploadChunks = async () => {
    if (!selectedIndex || preparedChunks.length === 0) {
      console.error('[PDF-UPLOAD] No hay índice seleccionado o chunks preparados');
      return;
    }

    console.log('[PDF-UPLOAD] Iniciando subida de chunks:', {
      indexUid: selectedIndex.uid,
      chunksCount: preparedChunks.length,
      idField: selectedIdField,
      textField: selectedTextField
    });

    setUploading(true);
    setUploadProgress([]);

    for (let i = 0; i < preparedChunks.length; i++) {
      const chunk = preparedChunks[i];
      console.log(`[PDF-UPLOAD] Procesando chunk ${i + 1}/${preparedChunks.length}:`, chunk);
      
      // Crear documento con los campos seleccionados
      const document: any = {
        [selectedIdField]: chunk.id,
        [selectedTextField]: chunk.text
      };

      console.log(`[PDF-UPLOAD] Documento a crear:`, document);

      try {
        // Inicializar progreso
        setUploadProgress(prev => [...prev, {
          chunkIndex: i,
          taskUid: 0,
          status: 'pending',
          message: `Creando documento ${i + 1}/${preparedChunks.length}...`
        }]);

        console.log(`[PDF-UPLOAD] Llamando a addDocuments para chunk ${i + 1}...`);
        // Agregar documento a Meilisearch
        const response = await meilisearchAPI.addDocuments(selectedIndex.uid, [document]);
        console.log(`[PDF-UPLOAD] Respuesta de addDocuments:`, response);
        console.log(`[PDF-UPLOAD] Tipo de respuesta:`, typeof response);
        console.log(`[PDF-UPLOAD] Keys de respuesta:`, Object.keys(response || {}));
        
        // Meilisearch devuelve taskUid directamente o en response.taskUid
        const taskUid = response?.taskUid || (response as any)?.taskUid || response?.uid || 0;
        console.log(`[PDF-UPLOAD] Task UID extraído:`, taskUid);
        
        if (!taskUid || taskUid === 0) {
          console.warn(`[PDF-UPLOAD] No se encontró taskUid en la respuesta para chunk ${i + 1}`);
        }
        
        // Actualizar progreso con task UID
        setUploadProgress(prev => {
          const updated = [...prev];
          updated[i] = {
            chunkIndex: i,
            taskUid: taskUid || 0,
            status: 'processing',
            message: taskUid > 0 ? `Task ${taskUid} generada. Consultando estado...` : 'Documento enviado, esperando confirmación...'
          };
          return updated;
        });

        // Consultar estado de la task cada 3 segundos hasta completar
        if (taskUid > 0) {
          console.log(`[PDF-UPLOAD] Iniciando seguimiento de task ${taskUid} para chunk ${i + 1}`);
          await checkTaskStatus(i, taskUid);
        } else {
          // Si no hay taskUid, esperar un momento y asumir éxito
          console.log(`[PDF-UPLOAD] No hay taskUid, esperando 2 segundos y asumiendo éxito...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          setUploadProgress(prev => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              status: 'succeeded',
              message: 'Documento creado exitosamente'
            };
            return updated;
          });
        }
      } catch (error: any) {
        console.error(`[PDF-UPLOAD] Error subiendo chunk ${i + 1}:`, error);
        console.error(`[PDF-UPLOAD] Error completo:`, JSON.stringify(error, null, 2));
        setUploadProgress(prev => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            status: 'failed',
            message: `Error: ${error.message || error.response?.data?.message || 'Error desconocido'}`
          };
          return updated;
        });
      }
    }

    console.log('[PDF-UPLOAD] Finalizada subida de todos los chunks');
    setUploading(false);
  };

  // Consultar estado de una task cada 3 segundos
  const checkTaskStatus = (chunkIndex: number, taskUid: number, maxAttempts: number = 60) => {
    console.log(`[PDF-UPLOAD] Iniciando seguimiento de task ${taskUid} para chunk ${chunkIndex}`);
    let attempts = 0;
    let intervalId: NodeJS.Timeout | null = null;
    let isCompleted = false;

    const checkTask = async () => {
      if (isCompleted) {
        console.log(`[PDF-UPLOAD] Task ${taskUid} ya completada, deteniendo intervalo`);
        if (intervalId) clearInterval(intervalId);
        return;
      }

      try {
        attempts++;
        console.log(`[PDF-UPLOAD] Consultando task ${taskUid} (intento ${attempts}/${maxAttempts})...`);
        
        const task = await meilisearchAPI.getTask(taskUid);
        console.log(`[PDF-UPLOAD] Respuesta completa de getTask:`, JSON.stringify(task, null, 2));
        console.log(`[PDF-UPLOAD] Tipo de task:`, typeof task);
        console.log(`[PDF-UPLOAD] Keys de task:`, task ? Object.keys(task) : 'task es null/undefined');
        
        // Meilisearch puede devolver status como 'succeeded', 'failed', 'enqueued', 'processing'
        // También puede estar en task.status, task.state, task.type, o directamente en la respuesta
        const status = task?.status || task?.state || task?.type || (task as any)?.task?.status || 'unknown';
        console.log(`[PDF-UPLOAD] Estado extraído de task ${taskUid}:`, status);
        
        if (status === 'succeeded' || status === 'taskSucceeded' || status === 'documentAdditionOrUpdate') {
          console.log(`[PDF-UPLOAD] ✅ Task ${taskUid} completada exitosamente`);
          isCompleted = true;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          setUploadProgress(prev => {
            const updated = [...prev];
            if (updated[chunkIndex]) {
              updated[chunkIndex] = {
                ...updated[chunkIndex],
                status: 'succeeded',
                message: 'Documento procesado exitosamente'
              };
            }
            return updated;
          });
        } else if (status === 'failed' || status === 'taskFailed') {
          console.error(`[PDF-UPLOAD] ❌ Task ${taskUid} falló`);
          const error = task?.error || task?.errorMessage || (task as any)?.task?.error || 'Error desconocido';
          
          // Extraer mensaje de error de forma más legible
          let errorMessage = 'Error desconocido';
          if (typeof error === 'string') {
            errorMessage = error;
          } else if (error && typeof error === 'object') {
            // Meilisearch devuelve error.message
            errorMessage = error.message || error.errorMessage || JSON.stringify(error);
          }
          
          // Limpiar mensaje de error para que sea más legible
          // Reemplazar saltos de línea y hacer más legible
          errorMessage = errorMessage
            .replace(/\\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          isCompleted = true;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          setUploadProgress(prev => {
            const updated = [...prev];
            if (updated[chunkIndex]) {
              updated[chunkIndex] = {
                ...updated[chunkIndex],
                status: 'failed',
                message: errorMessage
              };
            }
            return updated;
          });
        } else {
          // Actualizar mensaje mientras procesa
          console.log(`[PDF-UPLOAD] ⏳ Task ${taskUid} aún procesando (${status})...`);
          setUploadProgress(prev => {
            const updated = [...prev];
            if (updated[chunkIndex]) {
              updated[chunkIndex] = {
                ...updated[chunkIndex],
                status: 'processing',
                message: `Procesando... (${status}) - intento ${attempts}/${maxAttempts}`
              };
            }
            return updated;
          });
        }

        // Si excede máximo de intentos, detener
        if (attempts >= maxAttempts && !isCompleted) {
          console.warn(`[PDF-UPLOAD] ⚠️ Task ${taskUid} excedió máximo de intentos`);
          isCompleted = true;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          setUploadProgress(prev => {
            const updated = [...prev];
            if (updated[chunkIndex]) {
              updated[chunkIndex] = {
                ...updated[chunkIndex],
                status: 'failed',
                message: 'Tiempo de espera agotado'
              };
            }
            return updated;
          });
        }
      } catch (error: any) {
        console.error(`[PDF-UPLOAD] ❌ Error consultando task ${taskUid}:`, error);
        console.error(`[PDF-UPLOAD] Error completo:`, JSON.stringify(error, null, 2));
        console.error(`[PDF-UPLOAD] Error response:`, error.response?.data);
        isCompleted = true;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        setUploadProgress(prev => {
          const updated = [...prev];
          if (updated[chunkIndex]) {
            updated[chunkIndex] = {
              ...updated[chunkIndex],
              status: 'failed',
              message: `Error consultando task: ${error.message || error.response?.data?.message || 'Error desconocido'}`
            };
          }
          return updated;
        });
      }
    };

    // Primera consulta inmediata
    checkTask();
    
    // Luego consultar cada 3 segundos
    intervalId = setInterval(() => {
      if (!isCompleted) {
        checkTask();
      } else {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    }, 3000);
  };

  // Agregar separador en la posición del cursor
  const addSeparator = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = pdfText;
      
      // Guardar posición de scroll
      const scrollTop = textarea.scrollTop;
      
      // Insertar [separador] en la posición del cursor
      const newText = currentText.slice(0, start) + '[separador]' + currentText.slice(end);
      setPdfText(newText);
      
      // Restaurar posición del cursor y scroll después del separador
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPosition = start + '[separador]'.length;
          textareaRef.current.setSelectionRange(newPosition, newPosition);
          // Restaurar posición de scroll
          textareaRef.current.scrollTop = scrollTop;
        }
      }, 0);
    }
  };

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
                  // Solo limpiar si NO hay progreso activo o completado
                  if (!uploading && uploadProgress.length === 0) {
                    setShowPdfModal(false);
                    setPdfText('');
                    setPdfIdPrefix('');
                    setPdfStep('text');
                    setIndexFields([]);
                    setSelectedIdField('');
                    setSelectedTextField('');
                    setPreparedChunks([]);
                  } else {
                    // Si hay progreso, solo cerrar modal pero mantener progreso
                    setShowPdfModal(false);
                  }
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
                      console.log('[PDF-UPLOAD] Datos parseados (completo):', JSON.stringify(data, null, 2));
                      console.log('[PDF-UPLOAD] Datos parseados (resumen):', {
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
                        console.error('[PDF-UPLOAD] Datos de error (completo):', JSON.stringify(data, null, 2));
                        console.error('[PDF-UPLOAD] Error message:', data.error);
                        console.error('[PDF-UPLOAD] Debug info:', data.debug);
                        const errorMessage = data.error || 'Error desconocido';
                        setPdfText(`Error: No se pudo extraer texto del PDF. ${errorMessage}`);
                      }
                    } catch (error: any) {
                      console.error('[PDF-UPLOAD] Error al procesar PDF:', error);
                      console.error('[PDF-UPLOAD] Detalles del error (completo):', JSON.stringify({
                        message: error.message,
                        stack: error.stack,
                        name: error.name,
                        toString: error.toString()
                      }, null, 2));
                      setPdfText(`Error al procesar el PDF: ${error.message || 'Error desconocido'}`);
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
              
              
              {pdfText && pdfText.includes('Error:') && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{pdfText}</p>
                </div>
              )}

              {/* Paso 1: Edición de texto */}
              {pdfStep === 'text' && pdfText && !pdfText.includes('Error:') && (
                <div className="mt-6 space-y-4 border-t border-gray-200 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prefijo del ID para Meilisearch
                    </label>
                    <input
                      type="text"
                      value={pdfIdPrefix}
                      onChange={(e) => setPdfIdPrefix(e.target.value)}
                      placeholder="Ej: pdf-doc-"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Texto Extraído (editable)
                      </label>
                      <button
                        type="button"
                        onClick={addSeparator}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        ➕ Agregar Separador
                      </button>
                    </div>
                    <p className="mb-2 text-xs text-gray-500">
                      Haz clic en el botón &quot;Agregar Separador&quot; para insertar <code className="bg-gray-100 px-1 py-0.5 rounded">[separador]</code> en la posición del cursor. 
                      Cada <code className="bg-gray-100 px-1 py-0.5 rounded">[separador]</code> indica un punto de división entre chunks.
                    </p>
                    <div className="relative">
                      <textarea
                        ref={textareaRef}
                        value={pdfText}
                        onChange={(e) => setPdfText(e.target.value)}
                        className="w-full h-96 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-mono overflow-auto focus:ring-2 focus:ring-blue-500 focus:border-blue-500 relative z-10"
                        style={{ 
                          position: 'relative',
                          zIndex: 10
                        }}
                      />
                      {/* Vista previa con separadores resaltados - overlay invisible */}
                      <div 
                        className="absolute inset-0 pointer-events-none px-4 py-2 text-sm font-mono whitespace-pre-wrap break-words overflow-auto border border-transparent rounded-lg"
                        style={{ 
                          zIndex: 1,
                          color: 'transparent',
                          userSelect: 'none'
                        }}
                        aria-hidden="true"
                      >
                        {pdfText.split('[separador]').map((part, index, array) => (
                          <React.Fragment key={index}>
                            {part}
                            {index < array.length - 1 && (
                              <span className="bg-blue-500 text-white font-bold px-1 rounded" style={{ color: 'transparent' }}>
                                [separador]
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      {/* Overlay con separadores visibles */}
                      <div 
                        className="absolute inset-0 pointer-events-none px-4 py-2 text-sm font-mono whitespace-pre-wrap break-words overflow-auto border border-transparent rounded-lg"
                        style={{ 
                          zIndex: 2,
                          background: 'transparent'
                        }}
                        aria-hidden="true"
                      >
                        {pdfText.split('[separador]').map((part, index, array) => {
                          // Calcular posición del texto para alinearlo con el textarea
                          const textBefore = array.slice(0, index).join('[separador]') + part;
                          return (
                            <React.Fragment key={index}>
                              <span style={{ visibility: 'hidden' }}>{part}</span>
                              {index < array.length - 1 && (
                                <span className="bg-blue-500 text-white font-bold px-1 rounded" style={{ visibility: 'visible' }}>
                                  [separador]
                                </span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                    {/* Indicador visual de separadores */}
                    <div className="mt-2 text-xs text-gray-500">
                      {pdfText.split('[separador]').length - 1 > 0 && (
                        <p className="text-blue-600">
                          {pdfText.split('[separador]').length - 1} separador(es) detectado(s) - 
                          <span className="bg-blue-500 text-white font-bold px-1 rounded font-mono">[separador]</span> resaltado en azul
                        </p>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-600">
                      Chunks detectados: <strong>{calculateChunks(pdfText)}</strong> {calculateChunks(pdfText) === 1 ? 'chunk' : 'chunks'} 
                      ({pdfText.match(/\[separador\]/g)?.length || 0} separadores <code className="bg-gray-100 px-1 py-0.5 rounded">[separador]</code>)
                    </p>
                  </div>
                </div>
              )}

              {/* Paso 2: Selección de campos */}
              {pdfStep === 'fields' && (
                <div className="mt-6 space-y-4 border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Seleccionar Campos del Índice
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Elige qué campos del índice <strong>{selectedIndex?.uid}</strong> se usarán para el ID y el texto del chunk.
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campo para el ID
                    </label>
                    <select
                      value={selectedIdField}
                      onChange={(e) => setSelectedIdField(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {indexFields.map((field) => (
                        <option key={field} value={field}>
                          {field}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campo para el Texto del Chunk
                    </label>
                    <select
                      value={selectedTextField}
                      onChange={(e) => setSelectedTextField(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {indexFields.map((field) => (
                        <option key={field} value={field}>
                          {field}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Paso 3: Verificación final */}
              {pdfStep === 'review' && (
                <div className="mt-6 space-y-4 border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Verificación Final de Chunks
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Revisa todos los chunks que se crearán en el índice <strong>{selectedIndex?.uid}</strong>.
                  </p>
                  
                  {!uploading && (
                    <>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {preparedChunks.map((chunk, index) => (
                          <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="text-xs font-medium text-gray-500 mb-1">
                                  Chunk {index + 1} de {preparedChunks.length}
                                </p>
                                <p className="text-sm font-semibold text-gray-800 mb-2">
                                  <span className="text-gray-500">{selectedIdField}:</span> {chunk.id}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">
                                {selectedTextField}:
                              </p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto bg-white p-2 rounded border">
                                {chunk.text.substring(0, 200)}{chunk.text.length > 200 ? '...' : ''}
                              </p>
                              {chunk.text.length > 200 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  ({chunk.text.length} caracteres en total)
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Resumen:</strong> Se crearán {preparedChunks.length} {preparedChunks.length === 1 ? 'documento' : 'documentos'} en el índice.
                        </p>
                      </div>
                    </>
                  )}

                  {/* Log de progreso de subida - siempre visible si hay progreso */}
                  {uploadProgress.length > 0 && (
                    <div className="space-y-3 max-h-96 overflow-y-auto border-t border-gray-200 pt-4 mt-4">
                      <h4 className="text-md font-semibold text-gray-800">
                        Progreso de Subida
                        {uploading && <span className="ml-2 text-sm text-gray-500 font-normal">(en proceso...)</span>}
                        {!uploading && uploadProgress.every(p => p.status === 'succeeded' || p.status === 'failed') && (
                          <span className="ml-2 text-sm text-gray-500 font-normal">(completado)</span>
                        )}
                      </h4>
                      {uploadProgress.map((progress, idx) => (
                        <div key={idx} className={`p-3 border rounded-lg ${
                          progress.status === 'succeeded' ? 'bg-green-50 border-green-200' :
                          progress.status === 'failed' ? 'bg-red-50 border-red-200' :
                          progress.status === 'processing' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Chunk {progress.chunkIndex + 1} de {preparedChunks.length}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                              progress.status === 'succeeded' ? 'bg-green-500 text-white' :
                              progress.status === 'failed' ? 'bg-red-500 text-white' :
                              progress.status === 'processing' ? 'bg-yellow-500 text-white' :
                              'bg-gray-500 text-white'
                            }`}>
                              {progress.status === 'succeeded' ? '✓ Completado' :
                               progress.status === 'failed' ? '✗ Error' :
                               progress.status === 'processing' ? '⏳ Procesando' :
                               '⏱ Pendiente'}
                            </span>
                          </div>
                          <p className={`text-xs ${
                            progress.status === 'failed' ? 'text-red-700 font-medium' :
                            progress.status === 'succeeded' ? 'text-green-700' :
                            'text-gray-600'
                          }`}>
                            {progress.message}
                          </p>
                          {progress.taskUid > 0 && (
                            <p className="text-xs text-gray-500 mt-1">Task UID: {progress.taskUid}</p>
                          )}
                          {progress.status === 'failed' && (
                            <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                              <strong>Detalles del error:</strong> El embedder del índice requiere campos adicionales que no están presentes en el documento. El error indica que el campo <code className="bg-red-200 px-1 rounded">producto</code> es requerido por el <code>documentTemplate</code> del embedder, pero solo se están enviando los campos <code className="bg-red-200 px-1 rounded">{selectedIdField}</code> y <code className="bg-red-200 px-1 rounded">{selectedTextField}</code>. Verifica que el documento incluya todos los campos referenciados en el <code>documentTemplate</code> del embedder o ajusta el template para usar solo los campos disponibles.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  // Solo limpiar si NO hay progreso activo o completado
                  // Si hay progreso, mantenerlo para referencia
                  if (!uploading && uploadProgress.length === 0) {
                    setShowPdfModal(false);
                    setPdfText('');
                    setPdfIdPrefix('');
                    setPdfStep('text');
                    setIndexFields([]);
                    setSelectedIdField('');
                    setSelectedTextField('');
                    setPreparedChunks([]);
                  } else if (!uploading) {
                    // Si hay progreso pero no está subiendo, solo cerrar modal pero mantener progreso
                    setShowPdfModal(false);
                    setPdfStep('text');
                    // Mantener uploadProgress visible para referencia
                  } else {
                    // Si está subiendo, solo cerrar el modal pero mantener todo
                    setShowPdfModal(false);
                  }
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {uploading ? 'Cerrar (subiendo...)' : uploadProgress.length > 0 ? 'Cerrar (ver resultados)' : 'Cancelar'}
              </button>
              {pdfText && !pdfText.includes('Error:') && (
                <button
                  onClick={async () => {
                    if (pdfStep === 'text') {
                      // Paso 1: Ir al paso de selección de campos
                      loadIndexFields();
                      setPdfStep('fields');
                    } else if (pdfStep === 'fields') {
                      // Paso 2: Preparar chunks y mostrar verificación
                      prepareChunks();
                      setPdfStep('review');
                    } else if (pdfStep === 'review' && !uploading) {
                      // Paso 3: Subir chunks a Meilisearch
                      await uploadChunks();
                    }
                  }}
                  disabled={
                    (pdfStep === 'fields' && (!selectedIdField || !selectedTextField)) ||
                    uploading
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading && (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  )}
                  {pdfStep === 'text' ? 'Siguiente' : 
                   pdfStep === 'fields' ? 'Verificar Chunks' : 
                   uploading ? 'Subiendo...' : 'Finalizar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


