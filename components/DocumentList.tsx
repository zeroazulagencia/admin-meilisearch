'use client';

import { useState, useEffect } from 'react';
import { meilisearchAPI, Document } from '@/utils/meilisearch';
import DocumentEditor from './DocumentEditor';
import AlertModal from './ui/AlertModal';

interface DocumentListProps {
  indexUid: string;
  onLoadPdf?: () => void;
  onLoadWeb?: () => void;
  uploadProgressCount?: number;
  onRefresh?: () => void;
}

export default function DocumentList({ indexUid, onLoadPdf, onLoadWeb, uploadProgressCount = 0, onRefresh }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [detectedEmbedderName, setDetectedEmbedderName] = useState<string>('openai');
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });
  const [searchParams, setSearchParams] = useState({
    matchingStrategy: 'all',
    rankingScoreThreshold: 0.1, // Threshold más bajo para mostrar más resultados
    semanticRatio: 0.5,
    hybrid: null as any,
    embedderName: 'openai' // Nombre del embedder, se detectará automáticamente
  });

  useEffect(() => {
    if (indexUid) {
      loadDocuments();
      detectEmbedderName();
    }
  }, [indexUid, offset]);

  const detectEmbedderName = async () => {
    try {
      const settings = await meilisearchAPI.getIndexSettings(indexUid);
      if (settings.embedders && Object.keys(settings.embedders).length > 0) {
        const embedderName = Object.keys(settings.embedders)[0];
        setDetectedEmbedderName(embedderName);
        console.log('🔍 Embedder detectado:', embedderName);
      }
    } catch (err) {
      console.error('Error detectando embedder:', err);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setIsSearching(false);
      const data = await meilisearchAPI.getDocuments(indexUid, limit, offset);
      console.log('Get documents API response:', data);
      setDocuments(data.results || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      setDocuments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // Si no hay query, cargar documentos normales
      await loadDocuments();
      return;
    }

    try {
      setLoading(true);
      setIsSearching(true);
      
      // Iniciar timer para spinner mínimo de 3 segundos
      const startTime = Date.now();
      
      // Usar searchDocuments cuando hay búsqueda
      const params = useAI ? {
        hybridEmbedder: detectedEmbedderName,
        hybridSemanticRatio: searchParams.semanticRatio,
        matchingStrategy: searchParams.matchingStrategy,
        rankingScoreThreshold: searchParams.rankingScoreThreshold
      } : undefined;
      
      const data = await meilisearchAPI.searchDocuments(indexUid, searchQuery, limit, offset, params);
      console.log('Search API response:', data);
      setDocuments(data.hits || []);
      setTotal(data.totalHits || data.total || 0);
      
      // Calcular tiempo restante para completar 1.5 segundos
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 1500 - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
    } catch (err: any) {
      console.error('Error searching documents:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      console.error('Full error response:', err.response);
      console.error('Error response data:', err.response?.data);
      console.error('Error details from API:', err.response?.data?.details);
      console.error('Request config:', err.config);
      setDocuments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const refreshDocuments = async () => {
    // Forzar recarga completa
    await loadDocuments();
  };

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc);
    setShowEditor(true);
  };

  const handleCreate = () => {
    // Crear plantilla basada en el último documento guardado
    if (documents.length > 0) {
      const lastDoc = documents[0];
      const template: Document = {};
      
      // Copiar estructura de campos pero sin valores
      Object.keys(lastDoc).forEach(key => {
        const value = lastDoc[key];
        if (Array.isArray(value)) {
          template[key] = [];
        } else if (typeof value === 'object' && value !== null) {
          template[key] = {};
        } else if (typeof value === 'boolean') {
          template[key] = false;
        } else if (typeof value === 'number') {
          template[key] = 0;
        } else {
          template[key] = '';
        }
      });
      
      setEditingDoc(template);
    } else {
      setEditingDoc(null);
    }
    setShowEditor(true);
  };

  const handleSave = async (docToSave: Document) => {
    if (!docToSave) return;

    try {
      setSaving(true);
      // Meilisearch usa POST para agregar o actualizar documentos
      // Si el documento tiene la primary key, lo actualiza, si no, lo crea
      await meilisearchAPI.addDocuments(indexUid, [docToSave]);
      
      // Esperar un momento para que Meilisearch procese la actualización
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setShowEditor(false);
      setEditingDoc(null);
      
      // Recargar documentos
      await loadDocuments();
      
      // Notificar al padre para refrescar el índice
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error saving document:', err);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al guardar el documento',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('¿Está seguro de eliminar este documento?')) return;

    try {
      setDeleting(true);
      const primaryKey = Object.keys(doc)[0];
      await meilisearchAPI.deleteDocument(indexUid, doc[primaryKey] as string);
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadDocuments();
      
      // Notificar al padre para refrescar el índice
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al eliminar el documento',
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDocs.size === 0) return;
    if (!confirm(`¿Está seguro de eliminar ${selectedDocs.size} documento(s)?`)) return;

    try {
      setDeleting(true);
      await meilisearchAPI.deleteDocuments(indexUid, Array.from(selectedDocs));
      setSelectedDocs(new Set());
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadDocuments();
      
      // Notificar al padre para refrescar el índice
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error deleting documents:', err);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al eliminar los documentos',
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="inline-block animate-spin h-6 w-6 border-2 border-gray-600 border-t-transparent rounded-full mr-3"></div>
          <span className="text-gray-600">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Documentos ({total})
            </h2>
            <div className="space-x-2 flex gap-2">
              {selectedDocs.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? '⏳ Eliminando...' : `Eliminar Seleccionados (${selectedDocs.size})`}
                </button>
              )}
              {onLoadWeb && (
                <button
                  onClick={onLoadWeb}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: '#5DE1E5', color: '#000000' }}
                >
                  Cargar desde URL
                </button>
              )}
              {onLoadPdf && (
                <button
                  onClick={onLoadPdf}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: '#5DE1E5', color: '#000000' }}
                >
                  Cargar PDF {uploadProgressCount > 0 && <span className="ml-1 text-xs">({uploadProgressCount} errores)</span>}
                </button>
              )}
              <button
                onClick={handleCreate}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#5DE1E5', color: '#000000' }}
              >
                Nuevo Documento
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder="Buscar documentos..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {loading && <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>}
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setOffset(0);
                    handleSearch(); // Usar la función de búsqueda que maneja ambos casos
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
            
            {searchQuery && (
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                    className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                  />
                  <span className="text-gray-700">Buscar con IA</span>
                </label>
                
                {useAI && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-gray-700">Matching:</label>
                      <div className="group relative">
                        <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          Estrategia de coincidencia: All (todas) o Last (última)
                        </div>
                      </div>
                      <select
                        value={searchParams.matchingStrategy}
                        onChange={(e) => setSearchParams({ ...searchParams, matchingStrategy: e.target.value })}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="all">Matching: All</option>
                        <option value="last">Matching: Last</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-gray-700">Semantic Ratio:</label>
                      <div className="group relative">
                        <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          Balance entre búsqueda semántica (0.5) y texto tradicional (0.5)
                        </div>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={searchParams.semanticRatio}
                        onChange={(e) => setSearchParams({ ...searchParams, semanticRatio: parseFloat(e.target.value) })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-gray-700">Threshold:</label>
                      <div className="group relative">
                        <svg className="w-4 h-4 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          Umbral mínimo de relevancia (0.1) para mostrar más resultados
                        </div>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={searchParams.rankingScoreThreshold}
                        onChange={(e) => setSearchParams({ ...searchParams, rankingScoreThreshold: parseFloat(e.target.value) })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDocs(new Set(documents.map(d => String(Object.values(d)[0]))));
                      } else {
                        setSelectedDocs(new Set());
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contenido
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc, idx) => {
                const docId = String(Object.values(doc)[0]);
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedDocs.has(docId)}
                        onChange={() => toggleSelect(docId)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 space-y-1">
                        {Object.entries(doc).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="line-clamp-2">
                            <span className="font-medium text-gray-700">{key}:</span>{' '}
                            <span className="text-gray-600">
                              {typeof value === 'string' && value.length > 50 
                                ? `${value.substring(0, 50)}...` 
                                : typeof value === 'object' 
                                  ? JSON.stringify(value).substring(0, 50) + '...'
                                  : String(value)}
                            </span>
                          </div>
                        ))}
                        {Object.keys(doc).length > 3 && (
                          <div className="text-xs text-gray-400 italic">
                            +{Object.keys(doc).length - 3} campos más
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(doc)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        disabled={deleting}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting ? '⏳...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {isSearching && <span className="mr-2">🔍 Buscando:</span>}
            {total > 0 ? (
              <>Mostrando {offset + 1} - {Math.min(offset + documents.length, total)} de {total}</>
            ) : (
              <>No hay resultados</>
            )}
          </div>
          <div className="space-x-2">
            <button
              onClick={async () => {
                const newOffset = Math.max(0, offset - limit);
                setOffset(newOffset);
                if (isSearching) {
                  await handleSearch();
                } else {
                  await loadDocuments();
                }
              }}
              disabled={offset === 0}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              onClick={async () => {
                const newOffset = offset + limit;
                setOffset(newOffset);
                if (isSearching) {
                  await handleSearch();
                } else {
                  await loadDocuments();
                }
              }}
              disabled={isSearching ? (documents.length < limit) : (offset + limit >= total)}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {saving && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="inline-block animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                  <p className="text-gray-700 font-medium">Guardando documento...</p>
                </div>
              </div>
            )}
            <DocumentEditor
              document={editingDoc}
              indexUid={indexUid}
              onSave={(formData) => handleSave(formData)}
              onCancel={() => {
                setShowEditor(false);
                setEditingDoc(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de alertas */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </>
  );
}

