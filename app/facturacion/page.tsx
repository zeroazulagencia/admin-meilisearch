'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import { getPermissions } from '@/utils/permissions';

export default function Facturacion() {
  const permissions = getPermissions();
  const isClient = permissions?.type === 'client';

  // Si es cliente, mostrar mensaje de "en construcción"
  if (isClient) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center max-w-md">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">En construcción</h2>
            <p className="text-gray-600">Esta sección está en desarrollo y estará disponible pronto.</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Facturación</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stripe */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => window.location.href = '/facturacion/stripe'}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Stripe</h2>
          </div>
          <p className="text-gray-600">Gestiona tus pagos y facturación con Stripe</p>
        </div>

        {/* Alegra */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => window.location.href = '/facturacion/alegra'}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Alegra</h2>
          </div>
          <p className="text-gray-600">Gestiona tu contabilidad y facturación con Alegra</p>
        </div>
      </div>
    </ProtectedLayout>
  );
}

