'use client';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Admin Conocimiento</h2>
            <p className="text-gray-600 text-sm mb-4">Administra tus índices de Meilisearch</p>
            <a href="/admin-conocimiento" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ir a Admin →
            </a>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Ejecuciones</h2>
            <p className="text-gray-600 text-sm mb-4">Revisa las ejecuciones de n8n</p>
            <a href="/ejecuciones" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ver ejecuciones →
            </a>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Conversaciones</h2>
            <p className="text-gray-600 text-sm mb-4">Revisa conversaciones por agente</p>
            <a href="/conversaciones" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ver conversaciones →
            </a>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Consumo API</h2>
            <p className="text-gray-600 text-sm mb-4">Monitorea créditos y consumo de las APIs</p>
            <a href="/consumo-api" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Ver consumo →
            </a>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Estadísticas</h2>
            <p className="text-gray-600 text-sm mb-4">Próximamente</p>
            <span className="text-gray-400 text-sm font-medium">En desarrollo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
