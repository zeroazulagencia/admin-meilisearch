'use client';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Admin Conocimiento</h2>
            <p className="text-gray-600 text-sm">Administra tus índices de Meilisearch</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Ejecuciones</h2>
            <p className="text-gray-600 text-sm">Revisa las ejecuciones de n8n</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Estadísticas</h2>
            <p className="text-gray-600 text-sm">Próximamente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
