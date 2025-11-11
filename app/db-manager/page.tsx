'use client';

import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import NoticeModal from '@/components/ui/NoticeModal';
import Modal from '@/components/ui/Modal';
import { PencilIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { meilisearchAPI, Index, Document } from '@/utils/meilisearch';

interface Table {
  name: string;
}

interface Column {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_KEY: string;
  COLUMN_DEFAULT: any;
}

interface TableData {
  data: any[];
  columns: Column[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function DBManager() {
  // Estado para tabs
  const [activeTab, setActiveTab] = useState<'db' | 'meilisearch'>('db');

  // Estados para Base de Datos
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [alert, setAlert] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({
    show: false,
    message: '',
    type: 'info'
  });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning'; onConfirm?: () => void }>({
    isOpen: false,
    message: '',
    type: 'warning',
  });

  // Estados para Meilisearch
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<string>('');
  const [meilisearchDocuments, setMeilisearchDocuments] = useState<Document[]>([]);
  const [meilisearchLoading, setMeilisearchLoading] = useState(false);
  const [meilisearchCurrentPage, setMeilisearchCurrentPage] = useState(1);
  const [meilisearchTotal, setMeilisearchTotal] = useState(0);
  const [meilisearchLimit] = useState(50);
  const [showMeilisearchEditModal, setShowMeilisearchEditModal] = useState(false);
  const [showMeilisearchCreateModal, setShowMeilisearchCreateModal] = useState(false);
  const [showMeilisearchCreateIndexModal, setShowMeilisearchCreateIndexModal] = useState(false);
  const [editingMeilisearchDoc, setEditingMeilisearchDoc] = useState<Document | null>(null);
  const [meilisearchFormData, setMeilisearchFormData] = useState<any>({});
  const [newIndexUid, setNewIndexUid] = useState('');
  const [newIndexPrimaryKey, setNewIndexPrimaryKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [primaryKey, setPrimaryKey] = useState<string | null>(null);

  // Cargar lista de tablas (solo si el tab de BD está activo)
  useEffect(() => {
    if (activeTab === 'db') {
      loadTables();
    }
  }, [activeTab]);

  // Cargar índices de Meilisearch (solo si el tab de Meilisearch está activo)
  useEffect(() => {
    if (activeTab === 'meilisearch') {
      loadIndexes();
    }
  }, [activeTab]);

  // Cargar datos cuando cambia la tabla o la página (BD)
  useEffect(() => {
    if (activeTab === 'db' && selectedTable) {
      loadTableData(selectedTable, currentPage);
    }
  }, [selectedTable, currentPage, activeTab]);

  // Cargar documentos cuando cambia el índice o la página (Meilisearch)
  useEffect(() => {
    if (activeTab === 'meilisearch' && selectedIndex && !isSearching) {
      loadMeilisearchDocuments();
    }
  }, [selectedIndex, meilisearchCurrentPage, activeTab]);

  // Cargar primary key cuando cambia el índice seleccionado
  useEffect(() => {
    if (activeTab === 'meilisearch' && selectedIndex) {
      loadPrimaryKey();
    }
  }, [selectedIndex, activeTab]);

  // ========== FUNCIONES BASE DE DATOS ==========
  const loadTables = async () => {
    try {
      const res = await fetch('/api/db-manager/tables');
      const data = await res.json();
      if (data.ok) {
        setTables(data.tables);
      } else {
        showAlert('Error al cargar tablas', 'error');
      }
    } catch (e: any) {
      showAlert('Error al cargar tablas: ' + e.message, 'error');
    }
  };

  const loadTableData = async (tableName: string, page: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/db-manager/tables/${tableName}?page=${page}&limit=50`);
      const data = await res.json();
      if (data.ok) {
        setTableData(data);
      } else {
        showAlert('Error al cargar datos: ' + data.error, 'error');
      }
    } catch (e: any) {
      showAlert('Error al cargar datos: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar eliminación',
      message: '¿Estás seguro de eliminar este registro?',
      type: 'warning',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/db-manager/tables/${selectedTable}?id=${id}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.ok) {
            showAlert('Registro eliminado exitosamente', 'success');
            loadTableData(selectedTable, currentPage);
          } else {
            showAlert('Error al eliminar: ' + data.error, 'error');
          }
        } catch (e: any) {
          showAlert('Error al eliminar: ' + e.message, 'error');
        }
      }
    });
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormData({ ...record });
    setShowEditModal(true);
  };

  const handleCreate = () => {
    setEditingRecord(null);
    const initialData: any = {};
    if (tableData?.columns) {
      tableData.columns.forEach(col => {
        if (col.COLUMN_NAME !== 'id' && 
            col.COLUMN_NAME !== 'created_at' && 
            col.COLUMN_NAME !== 'updated_at' &&
            col.COLUMN_KEY !== 'PRI') {
          initialData[col.COLUMN_NAME] = col.COLUMN_DEFAULT || '';
        }
      });
    }
    setFormData(initialData);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      const url = `/api/db-manager/tables/${selectedTable}`;
      const method = editingRecord ? 'PUT' : 'POST';
      
      const filteredData: any = {};
      const autoFields = ['created_at', 'updated_at'];
      
      for (const key in formData) {
        if (!autoFields.includes(key)) {
          filteredData[key] = formData[key];
        }
      }
      
      const primaryKey = tableData?.columns.find(col => col.COLUMN_KEY === 'PRI');
      const pkColumn = primaryKey?.COLUMN_NAME || 'id';
      const pkValue = editingRecord ? editingRecord[pkColumn] : null;
      
      const body = editingRecord ? { ...filteredData, [pkColumn]: pkValue } : filteredData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.ok) {
        showAlert(editingRecord ? 'Registro actualizado exitosamente' : 'Registro creado exitosamente', 'success');
        setShowEditModal(false);
        setShowCreateModal(false);
        loadTableData(selectedTable, currentPage);
      } else {
        showAlert('Error: ' + data.error, 'error');
      }
    } catch (e: any) {
      showAlert('Error: ' + e.message, 'error');
    }
  };

  // ========== FUNCIONES MEILISEARCH ==========
  const loadIndexes = async () => {
    try {
      setMeilisearchLoading(true);
      const indexesList = await meilisearchAPI.getIndexes();
      setIndexes(indexesList);
    } catch (e: any) {
      showAlert('Error al cargar índices: ' + e.message, 'error');
    } finally {
      setMeilisearchLoading(false);
    }
  };

  const loadPrimaryKey = async () => {
    try {
      const index = await meilisearchAPI.getIndex(selectedIndex);
      setPrimaryKey(index.primaryKey || null);
    } catch (e: any) {
      console.error('Error cargando primary key:', e);
      setPrimaryKey(null);
    }
  };

  const loadMeilisearchDocuments = async () => {
    if (!selectedIndex) return;
    try {
      setMeilisearchLoading(true);
      const offset = (meilisearchCurrentPage - 1) * meilisearchLimit;
      const data = await meilisearchAPI.getDocuments(selectedIndex, meilisearchLimit, offset);
      setMeilisearchDocuments(data.results || []);
      setMeilisearchTotal(data.total || 0);
    } catch (e: any) {
      showAlert('Error al cargar documentos: ' + e.message, 'error');
      setMeilisearchDocuments([]);
      setMeilisearchTotal(0);
    } finally {
      setMeilisearchLoading(false);
    }
  };

  const handleMeilisearchSearch = async () => {
    if (!selectedIndex || !searchQuery.trim()) {
      setIsSearching(false);
      loadMeilisearchDocuments();
      return;
    }
    
    try {
      setMeilisearchLoading(true);
      setIsSearching(true);
      const offset = (meilisearchCurrentPage - 1) * meilisearchLimit;
      const data = await meilisearchAPI.searchDocuments(selectedIndex, searchQuery, meilisearchLimit, offset);
      setMeilisearchDocuments(data.hits || []);
      setMeilisearchTotal(data.totalHits || 0);
    } catch (e: any) {
      showAlert('Error al buscar documentos: ' + e.message, 'error');
      setMeilisearchDocuments([]);
      setMeilisearchTotal(0);
    } finally {
      setMeilisearchLoading(false);
    }
  };

  const handleMeilisearchCreateIndex = async () => {
    if (!newIndexUid.trim()) {
      showAlert('El UID del índice es requerido', 'error');
      return;
    }
    
    try {
      await meilisearchAPI.createIndex(newIndexUid, newIndexPrimaryKey || undefined);
      showAlert('Índice creado exitosamente', 'success');
      setShowMeilisearchCreateIndexModal(false);
      setNewIndexUid('');
      setNewIndexPrimaryKey('');
      loadIndexes();
    } catch (e: any) {
      showAlert('Error al crear índice: ' + e.message, 'error');
    }
  };

  const handleMeilisearchDeleteIndex = async (indexUid: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar el índice "${indexUid}"? Esta acción no se puede deshacer.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await meilisearchAPI.deleteIndex(indexUid);
          showAlert('Índice eliminado exitosamente', 'success');
          if (selectedIndex === indexUid) {
            setSelectedIndex('');
            setMeilisearchDocuments([]);
          }
          loadIndexes();
        } catch (e: any) {
          showAlert('Error al eliminar índice: ' + e.message, 'error');
        }
      }
    });
  };

  const handleMeilisearchEdit = (doc: Document) => {
    setEditingMeilisearchDoc(doc);
    setMeilisearchFormData({ ...doc });
    setShowMeilisearchEditModal(true);
  };

  const handleMeilisearchCreate = () => {
    setEditingMeilisearchDoc(null);
    setMeilisearchFormData({});
    setShowMeilisearchCreateModal(true);
  };

  const handleMeilisearchSave = async () => {
    if (!selectedIndex) return;
    
    try {
      if (editingMeilisearchDoc) {
        // Actualizar documento existente
        const docId = primaryKey && editingMeilisearchDoc[primaryKey] 
          ? editingMeilisearchDoc[primaryKey] 
          : editingMeilisearchDoc.id || Object.values(editingMeilisearchDoc)[0];
        
        await meilisearchAPI.updateDocument(selectedIndex, String(docId), meilisearchFormData);
        showAlert('Documento actualizado exitosamente', 'success');
      } else {
        // Crear nuevo documento
        await meilisearchAPI.addDocuments(selectedIndex, [meilisearchFormData]);
        showAlert('Documento creado exitosamente', 'success');
      }
      
      setShowMeilisearchEditModal(false);
      setShowMeilisearchCreateModal(false);
      if (isSearching) {
        handleMeilisearchSearch();
      } else {
        loadMeilisearchDocuments();
      }
    } catch (e: any) {
      showAlert('Error: ' + e.message, 'error');
    }
  };

  const handleMeilisearchDelete = async (doc: Document) => {
    if (!selectedIndex) return;
    
    const docId = primaryKey && doc[primaryKey] 
      ? doc[primaryKey] 
      : doc.id || Object.values(doc)[0];
    
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar este documento?`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await meilisearchAPI.deleteDocument(selectedIndex, String(docId));
          showAlert('Documento eliminado exitosamente', 'success');
          if (isSearching) {
            handleMeilisearchSearch();
          } else {
            loadMeilisearchDocuments();
          }
        } catch (e: any) {
          showAlert('Error al eliminar documento: ' + e.message, 'error');
        }
      }
    });
  };

  // ========== FUNCIONES UTILITARIAS ==========
  const showAlert = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlert({ show: true, message, type });
  };

  const renderField = (column: Column, value: any) => {
    if (column.DATA_TYPE === 'json') {
      return <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-w-xs">{JSON.stringify(value, null, 2)}</pre>;
    }
    if (typeof value === 'string' && value.length > 100) {
      return <span className="text-xs text-gray-500">{value.substring(0, 100)}...</span>;
    }
    return <span>{value !== null && value !== undefined ? String(value) : <span className="text-gray-400">NULL</span>}</span>;
  };

  const renderMeilisearchField = (key: string, value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">NULL</span>;
    }
    if (typeof value === 'object') {
      return <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-w-xs">{JSON.stringify(value, null, 2)}</pre>;
    }
    if (typeof value === 'string' && value.length > 100) {
      return <span className="text-xs text-gray-500">{value.substring(0, 100)}...</span>;
    }
    return <span>{String(value)}</span>;
  };

  const getMeilisearchTotalPages = () => {
    return Math.ceil(meilisearchTotal / meilisearchLimit);
  };

  // Obtener todas las claves de los documentos para mostrar columnas
  const getMeilisearchColumns = (): string[] => {
    const allKeys = new Set<string>();
    meilisearchDocuments.forEach(doc => {
      Object.keys(doc).forEach(key => allKeys.add(key));
    });
    return Array.from(allKeys).sort();
  };

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">DB Manager</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('db')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'db'
                  ? 'text-[#5DE1E5] border-b-2 border-[#5DE1E5]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Base de Datos
            </button>
            <button
              onClick={() => setActiveTab('meilisearch')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'meilisearch'
                  ? 'text-[#5DE1E5] border-b-2 border-[#5DE1E5]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Meilisearch
            </button>
          </div>

          <div className="p-6">
            {/* Tab: Base de Datos */}
            {activeTab === 'db' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Gestión de Base de Datos</h2>
                  {selectedTable && (
                    <button
                      onClick={handleCreate}
                      className="flex items-center gap-2 px-4 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] transition-colors font-medium"
                    >
                      <PlusIcon className="w-5 h-5" />
                      Nuevo Registro
                    </button>
                  )}
                </div>

                {/* Selector de tabla */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Seleccionar Tabla</label>
                  <select
                    value={selectedTable}
                    onChange={(e) => {
                      setSelectedTable(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                  >
                    <option value="">Selecciona una tabla...</option>
                    {tables.map(table => (
                      <option key={table.name} value={table.name}>{table.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tabla de datos */}
                {selectedTable && tableData && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                      <h2 className="text-lg font-semibold text-gray-900">Datos de: {selectedTable}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Total: {tableData.pagination.total} registros | Página {tableData.pagination.page} de {tableData.pagination.totalPages}
                      </p>
                    </div>

                    {loading ? (
                      <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#5DE1E5]"></div>
                        <p className="mt-4 text-gray-500">Cargando datos...</p>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {tableData.columns.map(column => (
                                  <th
                                    key={column.COLUMN_NAME}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                  >
                                    {column.COLUMN_NAME}
                                    {column.COLUMN_KEY === 'PRI' && <span className="text-blue-600 ml-1">*</span>}
                                  </th>
                                ))}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Acciones
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {tableData.data.length === 0 ? (
                                <tr>
                                  <td colSpan={tableData.columns.length + 1} className="px-6 py-8 text-center text-gray-500">
                                    No hay registros en esta tabla
                                  </td>
                                </tr>
                              ) : (
                                tableData.data.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    {tableData.columns.map(column => (
                                      <td key={column.COLUMN_NAME} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {renderField(column, row[column.COLUMN_NAME])}
                                      </td>
                                    ))}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleEdit(row)}
                                          className="text-[#5DE1E5] hover:text-[#4BC5C9] transition-colors"
                                          title="Editar"
                                        >
                                          <PencilIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            const primaryKey = tableData.columns.find(col => col.COLUMN_KEY === 'PRI');
                                            const idValue = primaryKey ? row[primaryKey.COLUMN_NAME] : row.id;
                                            handleDelete(idValue);
                                          }}
                                          className="text-red-600 hover:text-red-700 transition-colors"
                                          title="Eliminar"
                                        >
                                          <TrashIcon className="w-5 h-5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Paginación */}
                        {tableData.pagination.totalPages > 1 && (
                          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <button
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                              Anterior
                            </button>
                            <span className="text-sm text-gray-700">
                              Página {currentPage} de {tableData.pagination.totalPages}
                            </span>
                            <button
                              onClick={() => setCurrentPage(p => Math.min(tableData.pagination.totalPages, p + 1))}
                              disabled={currentPage === tableData.pagination.totalPages}
                              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                              Siguiente
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Meilisearch */}
            {activeTab === 'meilisearch' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Gestión de Meilisearch</h2>
                  <button
                    onClick={() => setShowMeilisearchCreateIndexModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] transition-colors font-medium"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Nuevo Índice
                  </button>
                </div>

                {/* Lista de índices */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Seleccionar Índice</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedIndex}
                      onChange={(e) => {
                        setSelectedIndex(e.target.value);
                        setMeilisearchCurrentPage(1);
                        setSearchQuery('');
                        setIsSearching(false);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                    >
                      <option value="">Selecciona un índice...</option>
                      {indexes.map(index => (
                        <option key={index.uid} value={index.uid}>
                          {index.uid} {index.primaryKey && `(PK: ${index.primaryKey})`}
                        </option>
                      ))}
                    </select>
                    {selectedIndex && (
                      <button
                        onClick={() => handleMeilisearchDeleteIndex(selectedIndex)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        title="Eliminar índice"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Búsqueda y acciones */}
                {selectedIndex && (
                  <>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              setMeilisearchCurrentPage(1);
                              handleMeilisearchSearch();
                            }
                          }}
                          placeholder="Buscar documentos..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                        />
                        <button
                          onClick={() => {
                            setMeilisearchCurrentPage(1);
                            handleMeilisearchSearch();
                          }}
                          className="px-4 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] transition-colors font-medium flex items-center gap-2"
                        >
                          <MagnifyingGlassIcon className="w-5 h-5" />
                          Buscar
                        </button>
                        {searchQuery && (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setIsSearching(false);
                              setMeilisearchCurrentPage(1);
                              loadMeilisearchDocuments();
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Limpiar
                          </button>
                        )}
                        <button
                          onClick={handleMeilisearchCreate}
                          className="flex items-center gap-2 px-4 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] transition-colors font-medium"
                        >
                          <PlusIcon className="w-5 h-5" />
                          Nuevo Documento
                        </button>
                      </div>
                    </div>

                    {/* Tabla de documentos */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900">Documentos de: {selectedIndex}</h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Total: {meilisearchTotal} documentos | Página {meilisearchCurrentPage} de {getMeilisearchTotalPages()}
                        </p>
                      </div>

                      {meilisearchLoading ? (
                        <div className="p-8 text-center">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#5DE1E5]"></div>
                          <p className="mt-4 text-gray-500">Cargando documentos...</p>
                        </div>
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  {getMeilisearchColumns().map(column => (
                                    <th
                                      key={column}
                                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      {column}
                                      {column === primaryKey && <span className="text-blue-600 ml-1">*</span>}
                                    </th>
                                  ))}
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {meilisearchDocuments.length === 0 ? (
                                  <tr>
                                    <td colSpan={getMeilisearchColumns().length + 1} className="px-6 py-8 text-center text-gray-500">
                                      No hay documentos en este índice
                                    </td>
                                  </tr>
                                ) : (
                                  meilisearchDocuments.map((doc, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                      {getMeilisearchColumns().map(column => (
                                        <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                          {renderMeilisearchField(column, doc[column])}
                                        </td>
                                      ))}
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleMeilisearchEdit(doc)}
                                            className="text-[#5DE1E5] hover:text-[#4BC5C9] transition-colors"
                                            title="Editar"
                                          >
                                            <PencilIcon className="w-5 h-5" />
                                          </button>
                                          <button
                                            onClick={() => handleMeilisearchDelete(doc)}
                                            className="text-red-600 hover:text-red-700 transition-colors"
                                            title="Eliminar"
                                          >
                                            <TrashIcon className="w-5 h-5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Paginación */}
                          {getMeilisearchTotalPages() > 1 && (
                            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                              <button
                                onClick={() => setMeilisearchCurrentPage(p => Math.max(1, p - 1))}
                                disabled={meilisearchCurrentPage === 1}
                                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                              >
                                Anterior
                              </button>
                              <span className="text-sm text-gray-700">
                                Página {meilisearchCurrentPage} de {getMeilisearchTotalPages()}
                              </span>
                              <button
                                onClick={() => setMeilisearchCurrentPage(p => Math.min(getMeilisearchTotalPages(), p + 1))}
                                disabled={meilisearchCurrentPage === getMeilisearchTotalPages()}
                                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                              >
                                Siguiente
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal de edición BD */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Editar Registro - ${selectedTable}`}
        >
          <div className="space-y-4">
            {tableData?.columns.filter(col => 
              col.COLUMN_NAME !== 'id' && 
              col.COLUMN_KEY !== 'PRI' &&
              col.COLUMN_NAME !== 'created_at' &&
              col.COLUMN_NAME !== 'updated_at'
            ).map(column => (
              <div key={column.COLUMN_NAME}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {column.COLUMN_NAME}
                  {column.IS_NULLABLE === 'NO' && <span className="text-red-500 ml-1">*</span>}
                </label>
                {column.DATA_TYPE === 'json' ? (
                  <textarea
                    value={JSON.stringify(formData[column.COLUMN_NAME] || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        setFormData({ ...formData, [column.COLUMN_NAME]: JSON.parse(e.target.value) });
                      } catch {
                        // Ignorar si no es JSON válido
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent font-mono text-sm"
                    rows={6}
                  />
                ) : column.DATA_TYPE.includes('text') || column.DATA_TYPE.includes('varchar') ? (
                  <textarea
                    value={formData[column.COLUMN_NAME] || ''}
                    onChange={(e) => setFormData({ ...formData, [column.COLUMN_NAME]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                    rows={3}
                  />
                ) : (
                  <input
                    type={column.DATA_TYPE.includes('int') ? 'number' : column.DATA_TYPE === 'datetime' || column.DATA_TYPE === 'timestamp' ? 'datetime-local' : 'text'}
                    value={formData[column.COLUMN_NAME] || ''}
                    onChange={(e) => setFormData({ ...formData, [column.COLUMN_NAME]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] font-medium"
              >
                Guardar
              </button>
            </div>
          </div>
        </Modal>

        {/* Modal de creación BD */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={`Nuevo Registro - ${selectedTable}`}
        >
          <div className="space-y-4">
            {tableData?.columns.filter(col => 
              col.COLUMN_NAME !== 'id' && 
              col.COLUMN_KEY !== 'PRI' &&
              col.COLUMN_NAME !== 'created_at' &&
              col.COLUMN_NAME !== 'updated_at'
            ).map(column => (
              <div key={column.COLUMN_NAME}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {column.COLUMN_NAME}
                  {column.IS_NULLABLE === 'NO' && <span className="text-red-500 ml-1">*</span>}
                </label>
                {column.DATA_TYPE === 'json' ? (
                  <textarea
                    value={JSON.stringify(formData[column.COLUMN_NAME] || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        setFormData({ ...formData, [column.COLUMN_NAME]: JSON.parse(e.target.value) });
                      } catch {
                        // Ignorar si no es JSON válido
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent font-mono text-sm"
                    rows={6}
                  />
                ) : column.DATA_TYPE.includes('text') || column.DATA_TYPE.includes('varchar') ? (
                  <textarea
                    value={formData[column.COLUMN_NAME] || ''}
                    onChange={(e) => setFormData({ ...formData, [column.COLUMN_NAME]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                    rows={3}
                  />
                ) : (
                  <input
                    type={column.DATA_TYPE.includes('int') ? 'number' : column.DATA_TYPE === 'datetime' || column.DATA_TYPE === 'timestamp' ? 'datetime-local' : 'text'}
                    value={formData[column.COLUMN_NAME] || ''}
                    onChange={(e) => setFormData({ ...formData, [column.COLUMN_NAME]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] font-medium"
              >
                Crear
              </button>
            </div>
          </div>
        </Modal>

        {/* Modal de creación de índice Meilisearch */}
        <Modal
          isOpen={showMeilisearchCreateIndexModal}
          onClose={() => setShowMeilisearchCreateIndexModal(false)}
          title="Nuevo Índice"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UID del Índice <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newIndexUid}
                onChange={(e) => setNewIndexUid(e.target.value)}
                placeholder="nombre-del-indice"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Key (opcional)
              </label>
              <input
                type="text"
                value={newIndexPrimaryKey}
                onChange={(e) => setNewIndexPrimaryKey(e.target.value)}
                placeholder="id"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowMeilisearchCreateIndexModal(false);
                  setNewIndexUid('');
                  setNewIndexPrimaryKey('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleMeilisearchCreateIndex}
                className="px-4 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] font-medium"
              >
                Crear
              </button>
            </div>
          </div>
        </Modal>

        {/* Modal de edición de documento Meilisearch */}
        <Modal
          isOpen={showMeilisearchEditModal}
          onClose={() => setShowMeilisearchEditModal(false)}
          title={`Editar Documento - ${selectedIndex}`}
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {Object.keys(meilisearchFormData).map(key => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key}
                  {key === primaryKey && <span className="text-blue-600 ml-1">*</span>}
                </label>
                {typeof meilisearchFormData[key] === 'object' ? (
                  <textarea
                    value={JSON.stringify(meilisearchFormData[key], null, 2)}
                    onChange={(e) => {
                      try {
                        setMeilisearchFormData({ ...meilisearchFormData, [key]: JSON.parse(e.target.value) });
                      } catch {
                        // Ignorar si no es JSON válido
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent font-mono text-sm"
                    rows={6}
                  />
                ) : (
                  <textarea
                    value={String(meilisearchFormData[key] || '')}
                    onChange={(e) => setMeilisearchFormData({ ...meilisearchFormData, [key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                    rows={3}
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowMeilisearchEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleMeilisearchSave}
                className="px-4 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] font-medium"
              >
                Guardar
              </button>
            </div>
          </div>
        </Modal>

        {/* Modal de creación de documento Meilisearch */}
        <Modal
          isOpen={showMeilisearchCreateModal}
          onClose={() => setShowMeilisearchCreateModal(false)}
          title={`Nuevo Documento - ${selectedIndex}`}
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {meilisearchDocuments.length > 0 ? (
              // Si hay documentos, usar la estructura del primer documento como template
              Object.keys(meilisearchDocuments[0]).map(key => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {key}
                    {key === primaryKey && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {typeof meilisearchDocuments[0][key] === 'object' ? (
                    <textarea
                      value={JSON.stringify(meilisearchFormData[key] || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          setMeilisearchFormData({ ...meilisearchFormData, [key]: JSON.parse(e.target.value) });
                        } catch {
                          // Ignorar si no es JSON válido
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent font-mono text-sm"
                      rows={6}
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(meilisearchFormData[key] || '')}
                      onChange={(e) => setMeilisearchFormData({ ...meilisearchFormData, [key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent"
                    />
                  )}
                </div>
              ))
            ) : (
              // Si no hay documentos, permitir crear campos manualmente
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campo (JSON)
                </label>
                <textarea
                  value={JSON.stringify(meilisearchFormData, null, 2)}
                  onChange={(e) => {
                    try {
                      setMeilisearchFormData(JSON.parse(e.target.value));
                    } catch {
                      // Ignorar si no es JSON válido
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5DE1E5] focus:border-transparent font-mono text-sm"
                  rows={10}
                  placeholder='{"campo1": "valor1", "campo2": "valor2"}'
                />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowMeilisearchCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleMeilisearchSave}
                className="px-4 py-2 bg-[#5DE1E5] text-gray-900 rounded-lg hover:bg-[#4BC5C9] font-medium"
              >
                Crear
              </button>
            </div>
          </div>
        </Modal>

        {/* Modal de alertas */}
        <NoticeModal
          isOpen={alert.show}
          onClose={() => setAlert({ ...alert, show: false })}
          message={alert.message}
          type={alert.type}
        />
        
        {/* Modal de confirmación */}
        <NoticeModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          showCancel={true}
          onConfirm={confirmModal.onConfirm}
        />
      </div>
    </ProtectedLayout>
  );
}
