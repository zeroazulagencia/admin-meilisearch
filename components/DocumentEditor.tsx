'use client';

import { useState, useEffect } from 'react';
import { Document } from '@/utils/meilisearch';

interface DocumentEditorProps {
  document: Document | null;
  indexUid: string;
  onSave: (formData: Document) => void;
  onCancel: () => void;
}

function detectFieldType(value: any): string {
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object' && value !== null) return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string' && value.includes('<')) return 'html';
  return 'string';
}

export default function DocumentEditor({ document, indexUid, onSave, onCancel }: DocumentEditorProps) {
  const [formData, setFormData] = useState<Document>({});

  useEffect(() => {
    if (document) {
      setFormData(document);
    } else {
      setFormData({});
    }
  }, [document]);

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const addField = () => {
    const newKey = prompt('Nombre del nuevo campo:');
    if (newKey) {
      setFormData(prev => ({ ...prev, [newKey]: '' }));
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

    switch (type) {
      case 'array':
        return (
          <textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateField(key, parsed);
              } catch {
                updateField(key, e.target.value);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
            rows={6}
          />
        );

      case 'object':
        return (
          <textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateField(key, parsed);
              } catch {
                updateField(key, e.target.value);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
            rows={8}
          />
        );

      case 'html':
        return (
          <textarea
            value={value}
            onChange={(e) => updateField(key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
            rows={8}
          />
        );

      case 'boolean':
        return (
          <select
            value={value.toString()}
            onChange={(e) => updateField(key, e.target.value === 'true')}
            className="w-full px-3 py-2 border border-gray-300 rounded"
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
            onChange={(e) => updateField(key, parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        );

      default:
        if (isLongString) {
          return (
            <textarea
              value={value}
              onChange={(e) => updateField(key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              rows={4}
            />
          );
        }
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateField(key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">
          {document ? 'Editar Documento' : 'Nuevo Documento'}
        </h2>
      </div>
      
      <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
        {Object.entries(formData).map(([key, value]) => (
          <div key={key} className="space-y-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">
                {key}
                <span className="ml-2 text-xs text-gray-500">
                  ({detectFieldType(value)})
                </span>
              </label>
              <button
                onClick={() => removeField(key)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                title="Eliminar campo"
              >
                ✕ Eliminar
              </button>
            </div>
            {renderFieldEditor(key, value)}
          </div>
        ))}

        <button
          onClick={addField}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          + Agregar Campo
        </button>
      </div>

      <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            onSave(formData);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full hidden" id="save-spinner"></span>
          Guardar
        </button>
      </div>
    </div>
  );
}

