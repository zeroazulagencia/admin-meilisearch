'use client';

import { useEffect, useState } from 'react';
import { meilisearchAPI, Index, IndexStats, IndexSettings } from '@/utils/meilisearch';
import NoticeModal from './ui/NoticeModal';

interface IndexPropertiesProps {
  indexUid: string;
  isClient?: boolean;
}

export default function IndexProperties({ indexUid, isClient = false }: IndexPropertiesProps) {
  const [index, setIndex] = useState<Index | null>(null);
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [settings, setSettings] = useState<IndexSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmbeddingModal, setShowEmbeddingModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true); // Cerrado por defecto
  const [lastDocument, setLastDocument] = useState<any>(null);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [newEmbedder, setNewEmbedder] = useState({
    name: 'openai',
    source: 'openAi',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    documentTemplate: '',
    documentTemplateMaxBytes: 51200
  });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  useEffect(() => {
    if (indexUid) {
      loadProperties();
    }
  }, [indexUid]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      console.log('📥 Cargando propiedades del índice:', indexUid);
      const [indexData, statsData, settingsData] = await Promise.all([
        meilisearchAPI.getIndex(indexUid),
        meilisearchAPI.getIndexStats(indexUid),
        meilisearchAPI.getIndexSettings(indexUid)
      ]);
      console.log('📦 Index data:', indexData);
      console.log('📊 Stats data:', statsData);
      console.log('⚙️ Settings data:', settingsData);
      console.log('⚙️ Settings data completo (stringify):', JSON.stringify(settingsData, null, 2));
      console.log('🤖 Embedders en settings:', settingsData.embedders);
      console.log('🤖 Keys de settings:', settingsData ? Object.keys(settingsData) : 'no settings');
      setIndex(indexData);
      setStats(statsData);
      setSettings(settingsData);
    } catch (err) {
      console.error('Error loading properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEmbeddingModal = async () => {
    try {
      // Obtener estadísticas para saber cuántos documentos hay
      const statsData = await meilisearchAPI.getIndexStats(indexUid);
      const totalDocuments = statsData.numberOfDocuments || 0;
      
      let commonFieldsArray: string[] = [];
      
      if (totalDocuments > 0) {
        // Obtener TODOS los documentos en lotes para encontrar campos comunes
        const limit = 1000; // Máximo permitido por Meilisearch
        const allDocuments: any[] = [];
        let offset = 0;
        
        // Obtener todos los documentos en lotes
        while (allDocuments.length < totalDocuments) {
          const batch = await meilisearchAPI.getDocuments(indexUid, limit, offset);
          if (batch.results.length === 0) break;
          allDocuments.push(...batch.results);
          offset += limit;
          if (batch.results.length < limit) break; // No hay más documentos
        }
        
        if (allDocuments.length > 0) {
          const firstDoc = allDocuments[0];
          setLastDocument(firstDoc);
          
          // Obtener campos que existen en TODOS los documentos
          const allFields = new Set(Object.keys(firstDoc));
          allDocuments.forEach(doc => {
            const docFields = new Set(Object.keys(doc));
            // Mantener solo campos que existen en todos los documentos
            allFields.forEach(field => {
              if (!docFields.has(field)) {
                allFields.delete(field);
              }
            });
          });
          
          commonFieldsArray = Array.from(allFields);
          
          // Generar template solo con campos que existen en todos los documentos
          const template = commonFieldsArray.map(key => `{{doc.${key}}}`).join('\n');
          setNewEmbedder({
            ...newEmbedder,
            documentTemplate: template
          });
          
          console.log('✅ Campos comunes encontrados:', commonFieldsArray);
          console.log(`✅ Validado contra ${allDocuments.length} documentos del índice`);
        }
      } else {
        // Si no hay documentos, usar campos de fieldDistribution si están disponibles
        if (stats && stats.fieldDistribution) {
          commonFieldsArray = Object.keys(stats.fieldDistribution);
          const template = commonFieldsArray.map(key => `{{doc.${key}}}`).join('\n');
          setNewEmbedder({
            ...newEmbedder,
            documentTemplate: template
          });
          console.log('⚠️ No hay documentos, usando campos de fieldDistribution:', commonFieldsArray);
        }
      }
      
      // Guardar campos disponibles para mostrarlos en el modal
      setAvailableFields(commonFieldsArray);
      setShowEmbeddingModal(true);
    } catch (err) {
      console.error('Error loading documents:', err);
      // Intentar usar campos de fieldDistribution como fallback
      if (stats && stats.fieldDistribution) {
        const fieldsFromStats = Object.keys(stats.fieldDistribution);
        setAvailableFields(fieldsFromStats);
        const template = fieldsFromStats.map(key => `{{doc.${key}}}`).join('\n');
        setNewEmbedder({
          ...newEmbedder,
          documentTemplate: template
        });
        console.log('⚠️ Error cargando documentos, usando campos de fieldDistribution:', fieldsFromStats);
      }
      setShowEmbeddingModal(true);
    }
  };

  // Validar que los campos del template existan en todos los documentos
  const validateTemplateFields = async (template: string): Promise<{ valid: boolean; missingFields: string[]; availableFields: string[] }> => {
    try {
      // Extraer campos del template
      const templateFields = (template.match(/\{\{doc\.(\w+)\}\}/g) || [])
        .map(match => match.replace(/\{\{doc\.|\}\}/g, ''));
      
      if (templateFields.length === 0) {
        return { valid: false, missingFields: [], availableFields: [] };
      }
      
      // Obtener estadísticas del índice para saber cuántos documentos hay
      const stats = await meilisearchAPI.getIndexStats(indexUid);
      const totalDocuments = stats.numberOfDocuments || 0;
      
      if (totalDocuments === 0) {
        return { valid: true, missingFields: [], availableFields: [] };
      }
      
      // Obtener TODOS los documentos en lotes para validar campos comunes
      const limit = 1000; // Máximo permitido por Meilisearch
      const allDocuments: any[] = [];
      let offset = 0;
      
      // Obtener todos los documentos en lotes
      while (allDocuments.length < totalDocuments) {
        const batch = await meilisearchAPI.getDocuments(indexUid, limit, offset);
        if (batch.results.length === 0) break;
        allDocuments.push(...batch.results);
        offset += limit;
        if (batch.results.length < limit) break; // No hay más documentos
      }
      
      console.log(`🔍 Validando contra ${allDocuments.length} documentos del índice`);
      
      if (allDocuments.length === 0) {
        return { valid: true, missingFields: [], availableFields: [] };
      }
      
      // Obtener campos que existen en TODOS los documentos
      const firstDocFields = new Set(Object.keys(allDocuments[0]));
      const commonFields = new Set(firstDocFields);
      
      allDocuments.forEach((doc, index) => {
        const docFields = new Set(Object.keys(doc));
        commonFields.forEach(field => {
          if (!docFields.has(field)) {
            commonFields.delete(field);
          }
        });
      });
      
      console.log(`✅ Campos comunes encontrados en todos los documentos:`, Array.from(commonFields));
      
      // Verificar qué campos del template faltan
      const missingFields = templateFields.filter(field => !commonFields.has(field));
      
      return {
        valid: missingFields.length === 0,
        missingFields,
        availableFields: Array.from(commonFields)
      };
    } catch (err) {
      console.error('Error validando campos:', err);
      return { valid: false, missingFields: [], availableFields: [] };
    }
  };

  const handleUpdateEmbedders = async () => {
    try {
      console.log('=== INICIO CONFIGURACIÓN EMBEDDING ===');
      console.log('1. Índice:', indexUid);
      
      // Validar campos del template ANTES de enviar
      if (newEmbedder.documentTemplate) {
        console.log('1.1. Validando campos del template...');
        const validation = await validateTemplateFields(newEmbedder.documentTemplate);
        
        if (!validation.valid) {
          console.error('❌ Validación fallida. Campos faltantes:', validation.missingFields);
          console.log('✅ Campos disponibles:', validation.availableFields);
          
          const missingFieldsText = validation.missingFields.join(', ');
          const availableFieldsText = validation.availableFields.length > 0 
            ? validation.availableFields.join(', ')
            : 'ninguno';
          
          setAlertModal({
            isOpen: true,
            title: 'Error de Validación',
            message: `El template incluye campos que no existen en todos los documentos:\n\n❌ Campos faltantes: ${missingFieldsText}\n\n✅ Campos disponibles: ${availableFieldsText}\n\nPor favor, ajusta el template para usar solo campos que existan en todos los documentos.`,
            type: 'error',
          });
          return;
        }
        console.log('✅ Validación exitosa. Todos los campos existen en los documentos.');
      }
      
      const currentEmbedders = settings?.embedders || {};
      console.log('2. Embedders actuales:', currentEmbedders);
      
      // Preparar embedders sin API key (el servidor la agregará automáticamente)
      const updatedEmbedders = {
        ...currentEmbedders,
        [newEmbedder.name]: {
          source: newEmbedder.source,
          // No incluir apiKey aquí, el servidor la agregará desde variables de entorno
          model: newEmbedder.model,
          dimensions: newEmbedder.dimensions,
          ...(newEmbedder.documentTemplate && { documentTemplate: newEmbedder.documentTemplate }),
          documentTemplateMaxBytes: newEmbedder.documentTemplateMaxBytes
        }
      };

      console.log('3. Enviando embedders (sin API key, se agregará en servidor):', JSON.stringify(updatedEmbedders, null, 2));
      
      // Usar API route del servidor que agregará automáticamente la API key desde variables de entorno
      const result = await fetch(`/api/meilisearch/indexes/${indexUid}/settings/embedders`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEmbedders)
      }).then(res => res.json());
      console.log('4. Respuesta de actualización:', result);
      
      setShowEmbeddingModal(false);
      console.log('5. Modal cerrado');
      
      // Esperar a que la tarea termine
      console.log('6. Esperando a que termine la tarea...');
      if (result.taskUid) {
        let taskStatus = 'enqueued';
        let attempts = 0;
        let lastError: any = null;
        while (taskStatus !== 'succeeded' && taskStatus !== 'failed' && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
          try {
            const taskResponse = await fetch(`/api/meilisearch/tasks/${result.taskUid}`);
            const taskData = await taskResponse.json();
            taskStatus = taskData.status;
            console.log(`   Intento ${attempts}: Estado de la tarea:`, taskStatus);
            
            if (taskStatus === 'failed') {
              lastError = taskData.error || taskData;
              console.error('   ❌ La tarea falló:', taskData);
              console.error('   Detalles del error:', lastError);
              
              // Si falló, mostrar error inmediatamente y salir del loop
              break;
            }
          } catch (err) {
            console.error('   Error verificando tarea:', err);
          }
        }
        
        console.log('7. Tarea completada con estado:', taskStatus);
        
        if (taskStatus === 'failed') {
          // Extraer mensaje de error más detallado
          let errorMessage = 'Error desconocido al configurar el embedding';
          
          if (lastError) {
            if (lastError.message) {
              errorMessage = lastError.message;
            } else if (typeof lastError === 'string') {
              errorMessage = lastError;
            } else {
              errorMessage = JSON.stringify(lastError);
            }
          }
          
          // Si el error menciona campos faltantes, mostrar mensaje más claro
          if (errorMessage.includes('missing field') || errorMessage.includes('invalid_document_fields')) {
            errorMessage = `Error: El template incluye campos que no existen en todos los documentos.\n\n${errorMessage}\n\nPor favor, ajusta el template para usar solo campos que existan en todos los documentos.`;
          }
          
          setAlertModal({
            isOpen: true,
            title: 'Error al Configurar Embedding',
            message: errorMessage,
            type: 'error',
          });
          return;
        }
      }
      
      console.log('8. Recargando propiedades...');
      await loadProperties();
      
      console.log('9. Verificando configuración guardada...');
      const verifySettings = await meilisearchAPI.getIndexSettings(indexUid);
      console.log('10. Settings obtenidos:', verifySettings);
      console.log('11. Embedders en settings:', verifySettings.embedders);
      
      setAlertModal({
        isOpen: true,
        title: 'Éxito',
        message: 'Embedding configurado correctamente',
        type: 'success',
      });
      console.log('=== FIN CONFIGURACIÓN EMBEDDING ===');
    } catch (err: any) {
      console.error('=== ERROR EN CONFIGURACIÓN EMBEDDING ===');
      console.error('Error:', err);
      console.error('Detalles del error:', err.response?.data);
      
      let errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
      
      // Mejorar mensaje de error si es sobre campos faltantes
      if (errorMessage.includes('missing field') || errorMessage.includes('invalid_document_fields')) {
        errorMessage = `Error: El template incluye campos que no existen en todos los documentos.\n\n${errorMessage}\n\nPor favor, ajusta el template para usar solo campos que existan en todos los documentos.`;
      }
      
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: `Error al configurar el embedding: ${errorMessage}`,
        type: 'error',
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Cargando propiedades...</p>
      </div>
    );
  }

  if (!index || !stats) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div 
        className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            {isClient ? 'Conocimiento del Agente' : 'Propiedades del Índice'}
          </h2>
          <div className="flex items-center space-x-2">
            {!isClient && index && stats && (
              <div className="text-sm text-gray-500">
                {stats.numberOfDocuments} docs • {stats.isIndexing ? 'Indexando' : 'Listo'}
              </div>
            )}
            {!isClient && (
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
      </div>
      {!isCollapsed && (
        <div className="p-6 space-y-6">
          <div className={`grid gap-4 ${isClient ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {!isClient && (
            <>
              <div>
                <p className="text-sm text-gray-600">UID</p>
                <p className="text-lg font-medium text-gray-900">{index.uid}</p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Clave Primaria</p>
                  <div className="group relative">
                    <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      Campo único que identifica cada documento
                    </div>
                  </div>
                </div>
                <p className="text-lg font-medium text-gray-900">{index.primaryKey || 'No definida'}</p>
              </div>
            </>
          )}
          <div>
            <p className="text-sm text-gray-600">Documentos</p>
            <p className="text-lg font-medium text-gray-900">{stats.numberOfDocuments}</p>
          </div>
          {!isClient && (
            <div>
              <p className="text-sm text-gray-600">Estado</p>
              <p className="text-lg font-medium text-gray-900">
                {stats.isIndexing ? 'Indexando' : 'Listo'}
              </p>
            </div>
          )}
        </div>

        {settings && !isClient && (
          <>
            {settings.embedders && Object.keys(settings.embedders).length > 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm font-semibold text-gray-700">Embedding de IA Habilitado</p>
                  <div className="group relative">
                    <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      Configuración de embeddings para búsqueda semántica
                    </div>
                  </div>
                </div>
                {Object.entries(settings.embedders).map(([name, config]) => (
                  <div key={name} className="mb-3 last:mb-0 p-3 bg-white rounded border border-gray-200">
                    <p className="text-xs font-semibold text-gray-800 mb-2">Configuración: {name}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">Fuente:</span>
                        <span className="ml-2 text-gray-900 font-medium">{config.source || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Modelo:</span>
                        <span className="ml-2 text-gray-900 font-medium">{config.model || 'N/A'}</span>
                      </div>
                      {config.documentTemplate && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Template:</span>
                          <span className="ml-2 text-gray-900 font-medium text-xs break-words">{config.documentTemplate}</span>
                        </div>
                      )}
                      {config.documentTemplateMaxBytes && (
                        <div>
                          <span className="text-gray-600">Max Bytes:</span>
                          <span className="ml-2 text-gray-900 font-medium">{config.documentTemplateMaxBytes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm font-semibold text-gray-700">Embedding de IA: No configurado</p>
                  <div className="group relative">
                    <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      Los embeddings permiten búsqueda semántica con IA
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-3">Este índice no tiene embeddings de IA configurados</p>
                <button
                  onClick={handleOpenEmbeddingModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  Configurar Embedding
                </button>
              </div>
            )}

            {!isClient && settings.filterableAttributes && settings.filterableAttributes.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Campos Filtrables</p>
                <div className="flex flex-wrap gap-2">
                  {settings.filterableAttributes.map((attr) => (
                    <span key={attr} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      {attr}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!isClient && settings.searchableAttributes && settings.searchableAttributes.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Campos Buscables</p>
                <div className="flex flex-wrap gap-2">
                  {settings.searchableAttributes.map((attr) => (
                    <span key={attr} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      {attr}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!isClient && settings.sortableAttributes && settings.sortableAttributes.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Campos Ordenables</p>
                <div className="flex flex-wrap gap-2">
                  {settings.sortableAttributes.map((attr) => (
                    <span key={attr} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      {attr}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {!isClient && Object.keys(stats.fieldDistribution).length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Distribución de Campos</p>
            <div className="space-y-2">
              {Object.entries(stats.fieldDistribution).map(([field, count]) => (
                <div key={field} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">{field}</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {showEmbeddingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Configurar Embedding de IA</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fuente</label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600">
                  OpenAI
                </div>
                <p className="text-xs text-gray-500 mt-1">La API Key se obtiene automáticamente desde las variables de entorno del servidor</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600">
                  text-embedding-3-small
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dimensiones</label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600">
                  1536
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <textarea
                  value={newEmbedder.documentTemplate}
                  onChange={(e) => setNewEmbedder({ ...newEmbedder, documentTemplate: e.target.value })}
                  placeholder="Template para procesar documentos"
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent font-mono text-xs"
                />
                <p className="text-xs text-gray-500 mt-1">Generado automáticamente desde campos comunes del índice</p>
                {availableFields.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs font-semibold text-blue-800 mb-1">Campos disponibles:</p>
                    <div className="flex flex-wrap gap-1">
                      {availableFields.map(field => (
                        <span key={field} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                          {field}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600 mt-2">💡 Solo usa campos que existan en todos los documentos del índice</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Bytes</label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600">
                  51200
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowEmbeddingModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateEmbedders}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de alertas */}
      <NoticeModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}

