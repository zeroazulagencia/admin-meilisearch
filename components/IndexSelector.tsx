'use client';

import { useEffect, useState, useRef } from 'react';
import { meilisearchAPI, Index } from '@/utils/meilisearch';

interface IndexSelectorProps {
  onSelectIndex: (index: Index) => void;
}

export default function IndexSelector({ onSelectIndex }: IndexSelectorProps) {
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<Index | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadIndexes();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadIndexes = async () => {
    try {
      setLoading(true);
      const data = await meilisearchAPI.getIndexes();
      setIndexes(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar índices');
    } finally {
      setLoading(false);
    }
  };

  const filteredIndexes = indexes.filter(index =>
    index.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectIndex = (index: Index) => {
    setSelectedIndex(index);
    setIsOpen(false);
    setSearchQuery('');
    onSelectIndex(index);
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <p className="text-gray-600">Cargando índices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadIndexes}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Seleccionar Índice</h2>
      </div>
      <div className="p-6">
        <div className="relative" ref={dropdownRef}>
          <input
            type="text"
            value={isOpen ? searchQuery : (selectedIndex?.uid || '')}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Buscar índice..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
              {filteredIndexes.length === 0 ? (
                <div className="px-4 py-3 text-gray-500 text-sm">
                  No se encontraron índices
                </div>
              ) : (
                filteredIndexes.map((index) => (
                  <button
                    key={index.uid}
                    onClick={() => handleSelectIndex(index)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                  >
                    <div className="font-medium text-gray-900">{index.uid}</div>
                    {index.primaryKey && (
                      <div className="text-xs text-gray-500">PK: {index.primaryKey}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        
        {selectedIndex && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Índice seleccionado:</span> {selectedIndex.uid}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
