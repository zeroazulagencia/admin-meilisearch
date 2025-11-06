'use client';

import ProtectedLayout from '@/components/ProtectedLayout';

export default function DBManager() {
  return (
    <ProtectedLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">DB Manager</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
        </div>
        <p className="text-gray-500">Esta sección estará disponible pronto.</p>
      </div>
    </ProtectedLayout>
  );
}

