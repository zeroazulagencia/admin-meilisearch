'use client';

import { useState, useEffect } from 'react';
import { meilisearchAPI, Document } from '@/utils/meilisearch';
import DocumentEditor from './DocumentEditor';

interface DocumentListProps {
  indexUid: string;
}

export default function DocumentList({ indexUid }: DocumentListProps) {
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
  const [searchParams, setSearchParams] = useState({
    matchingStrategy: 'all',
    rankingScoreThreshold: 0.0,
    hybrid: null as any
  });

  useEffect(() => {
    if (indexUid) {
      loadDocuments();
    }
  }, [indexUid, offset]);

  useEffect(() => {
    if (indexUid && searchQuery.trim()) {
      loadDocuments();
    }
  }, [useAI, searchParams]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      if (searchQuery.trim()) {
        setIsSearching(true);
        // Usar searchDocuments siempre cuando hay búsqueda
        const params = useAI ? {
          hybrid: { embedder: 'openai' }
        } : undefined;
        
        const data = await meilisearchAPI.searchDocuments(indexUid, searchQuery, limit, offset, params);
        console.log('Search API response:', data);
        setDocuments(data.hits || []);
        setTotal(data.totalHits || data.total || 0);
      } else {
        setIsSearching(false);
        const data = await meilisearchAPI.getDocuments(indexUid, limit, offset);
        console.log('Get documents API response:', data);
        setDocuments(data.results || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
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

  const refreshDocuments = async () => {
    // Forzar recarga completa
    await loadDocuments();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setTimeout(() => loadDocuments(), 0);
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
    } catch (err) {
      console.error('Error saving document:', err);
      alert('Error al guardar el documento');
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
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Error al eliminar el documento');
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
    } catch (err) {
      console.error('Error deleting documents:', err);
      alert('Error al eliminar los documentos');
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
        <p className="text-gray-600">Cargando documentos...</p>
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
            <div className="space-x-2">
              {selectedDocs.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? '⏳ Eliminando...' : `Eliminar Seleccionados (${selectedDocs.size})`}
                </button>
              )}
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Nuevo Documento
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar documentos..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>}
                Buscar
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setOffset(0);
                    setTimeout(() => loadDocuments(), 0);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-gray-700">Buscar con IA</span>
                </label>
                
                {useAI && (
                  <>
                    <select
                      value={searchParams.matchingStrategy}
                      onChange={(e) => setSearchParams({ ...searchParams, matchingStrategy: e.target.value })}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="all">Matching: All</option>
                      <option value="last">Matching: Last</option>
                    </select>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-gray-700">Threshold:</label>
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
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
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
    </>
  );
}

