'use client';

import { useState } from 'react';
import { Index } from '@/utils/meilisearch';
import IndexSelector from '@/components/IndexSelector';
import IndexProperties from '@/components/IndexProperties';
import DocumentList from '@/components/DocumentList';

export default function AdminConocimiento() {
  const [selectedIndex, setSelectedIndex] = useState<Index | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Conocimiento</h1>
        
        <div className="space-y-6">
          <IndexSelector onSelectIndex={setSelectedIndex} />

          {selectedIndex && (
            <>
              <IndexProperties indexUid={selectedIndex.uid} />
              <DocumentList indexUid={selectedIndex.uid} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}


