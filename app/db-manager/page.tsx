'use client';

import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import AlertModal from '@/components/ui/AlertModal';
import Modal from '@/components/ui/Modal';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

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

  // Cargar lista de tablas
  useEffect(() => {
    loadTables();
  }, []);

  // Cargar datos cuando cambia la tabla o la página
  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable, currentPage);
    }
  }, [selectedTable, currentPage]);

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
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;

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
        // Excluir campos automáticos: id, created_at, updated_at
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
      
      // Filtrar campos automáticos y vacíos
      const filteredData: any = {};
      const autoFields = ['created_at', 'updated_at'];
      
      for (const key in formData) {
        // Excluir campos automáticos y solo incluir campos que fueron modificados
        if (!autoFields.includes(key)) {
          filteredData[key] = formData[key];
        }
      }
      
      // Encontrar la clave primaria
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

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">DB Manager</h1>
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

        {/* Modal de edición */}
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

        {/* Modal de creación */}
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

        {/* Modal de alertas */}
        <AlertModal
          isOpen={alert.show}
          onClose={() => setAlert({ ...alert, show: false })}
          message={alert.message}
          type={alert.type}
        />
      </div>
    </ProtectedLayout>
  );
}
