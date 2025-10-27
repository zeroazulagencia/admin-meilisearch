'use client';

interface ServiceInfo {
  name: string;
  status: string;
  dashboardUrl: string;
}

export default function ConsumoAPI() {
  const services: ServiceInfo[] = [
    {
      name: 'OpenAI',
      status: 'Activo',
      dashboardUrl: 'https://platform.openai.com/usage'
    },
    {
      name: 'xAI (X)',
      status: 'Activo',
      dashboardUrl: 'https://console.x.ai'
    },
    {
      name: 'Gemini (Google)',
      status: 'Activo',
      dashboardUrl: 'https://console.cloud.google.com'
    },
    {
      name: 'Replicate',
      status: 'Activo',
      dashboardUrl: 'https://replicate.com/account/credits'
    },
    {
      name: 'Open Router',
      status: 'Activo',
      dashboardUrl: 'https://openrouter.ai/activity'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Consumo API</h1>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Verifica regularmente el estado de créditos de cada servicio para asegurar su disponibilidad.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  service.status === 'Activo' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {service.status}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Consulta el estado de créditos y uso en el dashboard oficial.
              </p>
              
              <a 
                href={service.dashboardUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium w-full justify-center"
              >
                Ver Dashboard →
              </a>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-900 mb-2">Recomendaciones:</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Monitorea regularmente el uso de cada API</li>
            <li>• Configura alertas en los dashboards cuando sea posible</li>
            <li>• Considera agregar fondos antes de que se agoten los créditos</li>
            <li>• Verifica los dashboards oficiales para información detallada</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

