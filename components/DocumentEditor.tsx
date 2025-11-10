'use client';

import { useState, useEffect } from 'react';
import { Document } from '@/utils/meilisearch';
import { getPermissions } from '@/utils/permissions';
import NoticeModal from './ui/NoticeModal';

interface DocumentEditorProps {
  document: Document | null;
  indexUid: string;
  onSave: (formData: Document) => void;
  onCancel: () => void;
  readOnly?: boolean;
  canAddFields?: boolean;
  canRemoveFields?: boolean;
  primaryKey?: string | null;
}

function detectFieldType(value: any): string {
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object' && value !== null) return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string' && value.includes('<')) return 'html';
  return 'string';
}

export default function DocumentEditor({ document, indexUid, onSave, onCancel, readOnly = false, canAddFields = true, canRemoveFields = true, primaryKey = null }: DocumentEditorProps) {
  const [formData, setFormData] = useState<Document>({});
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  useEffect(() => {
    if (document) {
      // Si es cliente y hay primaryKey, filtrarlo
      const permissions = getPermissions();
      const isClient = permissions?.type !== 'admin';
      if (isClient && primaryKey && document[primaryKey] !== undefined) {
        const filtered = { ...document };
        delete filtered[primaryKey];
        setFormData(filtered);
      } else {
        setFormData(document);
      }
    } else {
      // Si es un nuevo documento y tiene permisos de crear, agregar el primaryKey como campo obligatorio
      if (canAddFields && primaryKey) {
        setFormData({ [primaryKey]: '' });
      } else {
        setFormData({});
      }
    }
  }, [document, primaryKey, canAddFields]);

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const addField = () => {
    setShowAddFieldModal(true);
    setNewFieldName('');
  };

  const handleAddField = () => {
    if (newFieldName && newFieldName.trim()) {
      setFormData(prev => ({ ...prev, [newFieldName.trim()]: '' }));
      setShowAddFieldModal(false);
      setNewFieldName('');
    }
  };

  const removeField = (key: string) => {
    setFormData(prev => {
      const newData = { ...prev };
      delete newData[key];
      return newData;
    });
  };

  const renderFieldEditor = (key: string, value: any) => {
    const type = detectFieldType(value);
    const stringValue = typeof value === 'string' ? value : String(value);
    const isLongString = stringValue.length > 100 || stringValue.includes('\n');
    const disabledClass = readOnly ? 'bg-gray-50 cursor-not-allowed opacity-60' : '';

    switch (type) {
      case 'array':
        return (
          <textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              if (readOnly) return;
              try {
                const parsed = JSON.parse(e.target.value);
                updateField(key, parsed);
              } catch {
                updateField(key, e.target.value);
              }
            }}
            disabled={readOnly}
            className={`w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm ${disabledClass}`}
            rows={6}
          />
        );

      case 'object':
        return (
          <textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              if (readOnly) return;
              try {
                const parsed = JSON.parse(e.target.value);
                updateField(key, parsed);
              } catch {
                updateField(key, e.target.value);
              }
            }}
            disabled={readOnly}
            className={`w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm ${disabledClass}`}
            rows={8}
          />
        );

      case 'html':
        return (
          <textarea
            value={value}
            onChange={(e) => {
              if (readOnly) return;
              updateField(key, e.target.value);
            }}
            disabled={readOnly}
            className={`w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm ${disabledClass}`}
            rows={8}
          />
        );

      case 'boolean':
        return (
          <select
            value={value.toString()}
            onChange={(e) => {
              if (readOnly) return;
              updateField(key, e.target.value === 'true');
            }}
            disabled={readOnly}
            className={`w-full px-3 py-2 border border-gray-300 rounded ${disabledClass}`}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => {
              if (readOnly) return;
              updateField(key, parseFloat(e.target.value) || 0);
            }}
            disabled={readOnly}
            className={`w-full px-3 py-2 border border-gray-300 rounded ${disabledClass}`}
          />
        );

      default:
        if (isLongString) {
          return (
            <textarea
              value={value}
              onChange={(e) => {
                if (readOnly) return;
                updateField(key, e.target.value);
              }}
              disabled={readOnly}
              className={`w-full px-3 py-2 border border-gray-300 rounded ${disabledClass}`}
              rows={4}
            />
          );
        }
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => {
              if (readOnly) return;
              updateField(key, e.target.value);
            }}
            disabled={readOnly}
            className={`w-full px-3 py-2 border border-gray-300 rounded ${disabledClass}`}
          />
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">
          {readOnly ? 'Ver Documento' : (document ? 'Editar Documento' : 'Nuevo Documento')}
        </h2>
      </div>
      
      <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
        {Object.entries(formData).map(([key, value]) => {
          const isPrimaryKey = key === primaryKey;
          const isRequired = !document && canAddFields && isPrimaryKey;
          return (
          <div key={key} className="space-y-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">
                {key}
                {isRequired && <span className="ml-1 text-red-500">*</span>}
                {!readOnly && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({detectFieldType(value)})
                  </span>
                )}
              </label>
              {!readOnly && canRemoveFields && !isPrimaryKey && (
                <button
                  onClick={() => removeField(key)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  title="Eliminar campo"
                >
                  ✕ Eliminar
                </button>
              )}
            </div>
            {renderFieldEditor(key, value)}
          </div>
          );
        })}

        {!readOnly && canAddFields && (
          <button
            onClick={addField}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            + Agregar Campo
          </button>
        )}
      </div>

      <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          {readOnly ? 'Cerrar' : 'Cancelar'}
        </button>
        {!readOnly && (
          <button
            onClick={() => {
              // Validar que si es un nuevo documento, tenga el primaryKey
              if (!document && canAddFields && primaryKey && (!formData[primaryKey] || !formData[primaryKey].toString().trim())) {
                setAlertModal({
                  isOpen: true,
                  title: 'Campo obligatorio',
                  message: `El campo "${primaryKey}" es obligatorio para crear un nuevo documento`,
                  type: 'error',
                });
                return;
              }
              onSave(formData);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full hidden" id="save-spinner"></span>
            Guardar
          </button>
        )}
      </div>

      {/* Modal para agregar campo */}
      {showAddFieldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Agregar Campo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del nuevo campo
                </label>
                <input
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddField();
                    } else if (e.key === 'Escape') {
                      setShowAddFieldModal(false);
                      setNewFieldName('');
                    }
                  }}
                  placeholder="Ingrese el nombre del campo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddFieldModal(false);
                  setNewFieldName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddField}
                disabled={!newFieldName || !newFieldName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agregar
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

