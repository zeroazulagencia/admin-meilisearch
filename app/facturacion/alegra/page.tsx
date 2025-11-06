'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import { useRouter } from 'next/navigation';

export default function Alegra() {
  const router = useRouter();

  return (
    <ProtectedLayout>
      <div className="mb-6">
        <button
          onClick={() => router.push('/facturacion')}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Facturación
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Alegra</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <p className="text-gray-500">Esta sección estará disponible pronto.</p>
      </div>
    </ProtectedLayout>
  );
}

