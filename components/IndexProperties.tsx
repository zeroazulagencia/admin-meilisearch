'use client';

import { useEffect, useState } from 'react';
import { meilisearchAPI, Index, IndexStats, IndexSettings } from '@/utils/meilisearch';

interface IndexPropertiesProps {
  indexUid: string;
}

export default function IndexProperties({ indexUid }: IndexPropertiesProps) {
  const [index, setIndex] = useState<Index | null>(null);
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [settings, setSettings] = useState<IndexSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmbeddingModal, setShowEmbeddingModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true); // Cerrado por defecto
  const [lastDocument, setLastDocument] = useState<any>(null);
  const [newEmbedder, setNewEmbedder] = useState({
    name: 'openai',
    source: 'openAi',
    apiKey: '',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    documentTemplate: '',
    documentTemplateMaxBytes: 51200
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
      // Cargar el último documento para obtener el template
      const documents = await meilisearchAPI.getDocuments(indexUid, 1, 0);
      if (documents.results.length > 0) {
        const doc = documents.results[0];
        setLastDocument(doc);
        // Generar template a partir del documento
        const template = Object.keys(doc).map(key => `{{doc.${key}}}`).join('\n');
        setNewEmbedder({
          ...newEmbedder,
          documentTemplate: template
        });
      }
      setShowEmbeddingModal(true);
    } catch (err) {
      console.error('Error loading last document:', err);
      setShowEmbeddingModal(true);
    }
  };

  const handleUpdateEmbedders = async () => {
    try {
      console.log('=== INICIO CONFIGURACIÓN EMBEDDING ===');
      console.log('1. Índice:', indexUid);
      
      const currentEmbedders = settings?.embedders || {};
      console.log('2. Embedders actuales:', currentEmbedders);
      
      const updatedEmbedders = {
        ...currentEmbedders,
        [newEmbedder.name]: {
          source: newEmbedder.source,
          ...(newEmbedder.apiKey && { apiKey: newEmbedder.apiKey }),
          model: newEmbedder.model,
          dimensions: newEmbedder.dimensions,
          ...(newEmbedder.documentTemplate && { documentTemplate: newEmbedder.documentTemplate }),
          documentTemplateMaxBytes: newEmbedder.documentTemplateMaxBytes
        }
      };

      console.log('3. Enviando embedders:', JSON.stringify(updatedEmbedders, null, 2));
      
      const result = await meilisearchAPI.updateEmbedders(indexUid, updatedEmbedders);
      console.log('4. Respuesta de actualización:', result);
      
      setShowEmbeddingModal(false);
      console.log('5. Modal cerrado');
      
      // Esperar a que la tarea termine
      console.log('6. Esperando a que termine la tarea...');
      if (result.taskUid) {
        let taskStatus = 'enqueued';
        let attempts = 0;
        while (taskStatus !== 'succeeded' && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
          try {
            const taskResponse = await fetch(`/api/meilisearch/tasks/${result.taskUid}`);
            const taskData = await taskResponse.json();
            taskStatus = taskData.status;
            console.log(`   Intento ${attempts}: Estado de la tarea:`, taskStatus);
            if (taskStatus === 'failed') {
              console.error('   ❌ La tarea falló:', taskData);
              console.error('   Detalles del error:', taskData.error);
            }
          } catch (err) {
            console.error('   Error verificando tarea:', err);
          }
        }
        console.log('7. Tarea completada con estado:', taskStatus);
      }
      
      console.log('8. Recargando propiedades...');
      await loadProperties();
      
      console.log('9. Verificando configuración guardada...');
      const verifySettings = await meilisearchAPI.getIndexSettings(indexUid);
      console.log('10. Settings obtenidos:', verifySettings);
      console.log('11. Embedders en settings:', verifySettings.embedders);
      
      alert('Embedding configurado correctamente');
      console.log('=== FIN CONFIGURACIÓN EMBEDDING ===');
    } catch (err: any) {
      console.error('=== ERROR EN CONFIGURACIÓN EMBEDDING ===');
      console.error('Error:', err);
      console.error('Detalles del error:', err.response?.data);
      alert(`Error al configurar el embedding: ${err.response?.data?.message || err.message}`);
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
          <h2 className="text-xl font-semibold text-gray-800">Propiedades del Índice</h2>
          <div className="flex items-center space-x-2">
            {index && stats && (
              <div className="text-sm text-gray-500">
                {stats.numberOfDocuments} docs • {stats.isIndexing ? 'Indexando' : 'Listo'}
              </div>
            )}
            <svg 
              className={`w-5 h-5 text-gray-500 transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      {!isCollapsed && (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
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
          <div>
            <p className="text-sm text-gray-600">Documentos</p>
            <p className="text-lg font-medium text-gray-900">{stats.numberOfDocuments}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Estado</p>
            <p className="text-lg font-medium text-gray-900">
              {stats.isIndexing ? 'Indexando' : 'Listo'}
            </p>
          </div>
        </div>

        {settings && (
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

            {settings.filterableAttributes && settings.filterableAttributes.length > 0 && (
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

            {settings.searchableAttributes && settings.searchableAttributes.length > 0 && (
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

            {settings.sortableAttributes && settings.sortableAttributes.length > 0 && (
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
        
        {Object.keys(stats.fieldDistribution).length > 0 && (
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key de OpenAI</label>
                <input
                  type="password"
                  value={newEmbedder.apiKey}
                  onChange={(e) => setNewEmbedder({ ...newEmbedder, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent font-mono text-xs"
                />
                <p className="text-xs text-gray-500 mt-1">Necesaria para generar embeddings</p>
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
                <p className="text-xs text-gray-500 mt-1">Generado automáticamente desde el último documento del índice</p>
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
    </div>
  );
}

