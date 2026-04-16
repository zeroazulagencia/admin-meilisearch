'use client';

import { useState, useMemo, useEffect } from 'react';
import { Document } from '@/utils/meilisearch';
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
  requiredFields?: Set<string>;
}

function detectFieldType(value: any): string {
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object' && value !== null) return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string' && value.includes('<')) return 'html';
  return 'string';
}

export default function DocumentEditor({ document, indexUid, onSave, onCancel, readOnly = false, canAddFields = true, canRemoveFields = true, primaryKey = null, requiredFields = new Set() }: DocumentEditorProps) {
  const [formData, setFormData] = useState<Document>({});
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [openQuickFillMenu, setOpenQuickFillMenu] = useState<string | null>(null);
  const [quickFillSuccess, setQuickFillSuccess] = useState<{ field: string; message: string } | null>(null);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  useEffect(() => {
    if (!document || Object.keys(document).length === 0) {
      if (canAddFields && primaryKey) {
        setFormData({ [primaryKey]: '' });
      } else {
        setFormData(document || {});
      }
      return;
    }

    const nextData = { ...document };
    if (primaryKey && nextData[primaryKey] === undefined) {
      if (document && primaryKey in document) {
        nextData[primaryKey] = document[primaryKey];
      } else if (canAddFields) {
        nextData[primaryKey] = '';
      }
    }
    setFormData(nextData);
  }, [document, primaryKey, canAddFields]);

  const isNewDocument = useMemo(() => {
    if (!document) return true;
    if (Object.keys(document).length === 0) return true;
    if (primaryKey && (!document[primaryKey] || document[primaryKey] === '')) return true;
    return false;
  }, [document, primaryKey]);

  const [idField, nonIdFields] = useMemo(() => {
    const entries = Object.entries(formData);
    if (!primaryKey) {
      return [null, entries];
    }
    const idEntry = entries.find(([key]) => key === primaryKey) || null;
    const rest = entries.filter(([key]) => key !== primaryKey);
    return [idEntry, rest];
  }, [formData, primaryKey]);

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

  // Funciones para generar valores automáticos
  const generateRandomNumber = (): number => {
    return Math.floor(Math.random() * 1000000);
  };

  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const getTodayISO = (): string => {
    return new Date().toISOString();
  };

  const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  const getTimestamp = (): number => {
    return Date.now();
  };

  const insertQuickValue = (key: string, valueType: string) => {
    const fieldType = detectFieldType(formData[key]);
    let value: any;
    let successMessage = '';

    switch (valueType) {
      case 'random-number':
        value = fieldType === 'number' ? generateRandomNumber() : generateRandomNumber().toString();
        successMessage = `Número random insertado: ${value}`;
        break;
      case 'uuid':
        value = generateUUID();
        successMessage = `UUID insertado: ${value.substring(0, 8)}...`;
        break;
      case 'today-iso':
        value = getTodayISO();
        successMessage = `Fecha/hora insertada: ${value}`;
        break;
      case 'today-date':
        value = getTodayDate();
        successMessage = `Fecha insertada: ${value}`;
        break;
      case 'timestamp':
        value = fieldType === 'number' ? getTimestamp() : getTimestamp().toString();
        successMessage = `Timestamp insertado: ${value}`;
        break;
      case 'empty-string':
        value = '';
        successMessage = 'String vacío insertado';
        break;
      case 'empty-array':
        value = [];
        successMessage = 'Array vacío [] insertado';
        break;
      case 'example-array':
        value = ['item1', 'item2', 'item3'];
        successMessage = 'Array de ejemplo con 3 items insertado';
        break;
      case 'empty-object':
        value = {};
        successMessage = 'Objeto vacío {} insertado';
        break;
      default:
        return;
    }

    updateField(key, value);
    setOpenQuickFillMenu(null);
    
    // Mostrar mensaje de éxito temporal
    setQuickFillSuccess({ field: key, message: successMessage });
    setTimeout(() => {
      setQuickFillSuccess(null);
    }, 3000);
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

  // Cerrar menú al hacer clic fuera
useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openQuickFillMenu && !(event.target as Element).closest('.quick-fill-menu-container')) {
        setOpenQuickFillMenu(null);
      }
    };
    if (openQuickFillMenu && typeof window !== 'undefined') {
      window.document.addEventListener('mousedown', handleClickOutside);
      return () => window.document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openQuickFillMenu]);

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">
          {readOnly ? 'Ver Documento' : (document ? 'Editar Documento' : 'Nuevo Documento')}
        </h2>
      </div>
      
      <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
        {idField && (
          <div className="space-y-2 border rounded-lg p-4 border-blue-200 bg-blue-50">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-blue-900">
                {idField[0]}
                <span className="ml-1 text-red-500 font-bold">*</span>
                {!readOnly && (
                  <span className="ml-2 text-xs text-blue-700">
                    (ID del documento)
                  </span>
                )}
              </label>
              {!readOnly && (
                <button
                  onClick={() => insertQuickValue(idField[0], 'uuid')}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-xs"
                >
                  Generar UUID
                </button>
              )}
            </div>
            {renderFieldEditor(idField[0], idField[1])}
            <p className="text-xs text-blue-700">
              El ID se utiliza como clave primaria en Meilisearch. Mantén este valor cuando edites un documento existente para evitar duplicados.
            </p>
          </div>
        )}

        {nonIdFields.map(([key, value]) => {
          const isPrimaryKey = key === primaryKey;
          const isRequired = requiredFields.has(key);
          const isEmpty = !value || (typeof value === 'string' && !value.trim());
          const hasError = isRequired && isEmpty;
          return (
          <div key={key} className={`space-y-2 border rounded-lg p-4 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex justify-between items-center">
              <label className={`text-sm font-medium ${hasError ? 'text-red-700' : 'text-gray-700'}`}>
                {key}
                {isRequired && <span className="ml-1 text-red-500 font-bold">*</span>}
                {!readOnly && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({detectFieldType(value)})
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                {!readOnly && (
                  <div className="relative quick-fill-menu-container">
                    <button
                      onClick={() => setOpenQuickFillMenu(openQuickFillMenu === key ? null : key)}
                      className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs flex items-center gap-1"
                      title="Insertar valor automático"
                    >
                      ⚡ Rápido
                    </button>
                    {openQuickFillMenu === key && (
                      <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50 quick-fill-menu-container">
                        <div className="py-1">
                          <button
                            onClick={() => insertQuickValue(key, 'random-number')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <span>🔢</span> Número Random
                          </button>
                          <button
                            onClick={() => insertQuickValue(key, 'uuid')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <span>🆔</span> UUID
                          </button>
                          <button
                            onClick={() => insertQuickValue(key, 'today-iso')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <span>📅</span> Hoy (ISO DateTime)
                          </button>
                          <button
                            onClick={() => insertQuickValue(key, 'today-date')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <span>📆</span> Hoy (Fecha)
                          </button>
                          <button
                            onClick={() => insertQuickValue(key, 'timestamp')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <span>⏰</span> Timestamp
                          </button>
                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            onClick={() => insertQuickValue(key, 'empty-string')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <span>📝</span> String Vacío
                          </button>
                          <button
                            onClick={() => insertQuickValue(key, 'empty-array')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <span>📋</span> Array Vacío []
                          </button>
                          <button
                            onClick={() => insertQuickValue(key, 'example-array')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <span>📋</span> Array Ejemplo [3 items]
                          </button>
                          <button
                            onClick={() => insertQuickValue(key, 'empty-object')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <span>📦</span> Objeto Vacío {}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
            </div>
            {renderFieldEditor(key, value)}
            {quickFillSuccess && quickFillSuccess.field === key && (
              <div className="mt-2 px-3 py-2 bg-green-100 border border-green-300 rounded text-sm text-green-800 flex items-center gap-2 transition-opacity duration-300 animate-pulse">
                <span className="text-green-600 font-bold">✓</span>
                <span className="font-medium">{quickFillSuccess.message}</span>
              </div>
            )}
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
              // Verificar si es un nuevo documento
              const isNewDocument = !document || (Object.keys(document).length === 0) || (primaryKey && !document[primaryKey]);
              
              // Validar que todos los campos obligatorios estén presentes
              const missingFields: string[] = [];
              requiredFields.forEach(field => {
                if (!formData[field] || (typeof formData[field] === 'string' && !formData[field].toString().trim())) {
                  missingFields.push(field);
                }
              });
              
              if (missingFields.length > 0) {
                setAlertModal({
                  isOpen: true,
                  title: 'Campos obligatorios',
                  message: `Los siguientes campos son obligatorios y no pueden estar vacíos: ${missingFields.join(', ')}`,
                  type: 'error',
                });
                return;
              }
              
              // Validar que si es un nuevo documento, tenga el primaryKey
              if (isNewDocument && canAddFields && primaryKey && (!formData[primaryKey] || !formData[primaryKey].toString().trim())) {
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
