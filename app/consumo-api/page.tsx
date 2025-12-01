'use client';

import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import { getPermissions } from '@/utils/permissions';

interface ServiceInfo {
  name: string;
  status: string;
  dashboardUrl?: string;
  isOnline?: boolean;
  isLoading?: boolean;
  error?: string;
  reason?: string;
  serviceKey: string; // Clave para identificar el servicio en la API
  apiKey?: string; // API key del servicio (opcional)
  isEditing?: boolean; // Si está en modo edición
  checkUrl?: string; // URL para verificar si no tiene API key
}

export default function ConsumoAPI() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [services, setServices] = useState<ServiceInfo[]>([]);

  // Cargar API keys guardadas desde localStorage
  const loadApiKeys = () => {
    try {
      const saved = localStorage.getItem('service-api-keys');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  // Guardar API key
  const saveApiKey = (serviceKey: string, apiKey: string) => {
    try {
      const saved = loadApiKeys();
      saved[serviceKey] = apiKey;
      localStorage.setItem('service-api-keys', JSON.stringify(saved));
    } catch (e) {
      console.error('Error guardando API key:', e);
    }
  };

  const checkServiceStatus = async (service: ServiceInfo, index: number) => {
    // Actualizar estado a "Verificando..."
    setServices(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isLoading: true,
        status: 'Verificando...'
      };
      return updated;
    });

    try {
      const apiKeys = loadApiKeys();
      const apiKey = apiKeys[service.serviceKey] || service.apiKey || '';
      
      const params = new URLSearchParams({
        service: service.serviceKey
      });
      if (apiKey) {
        params.append('apiKey', apiKey);
      }
      if (service.checkUrl) {
        params.append('checkUrl', service.checkUrl);
      }

      const response = await fetch(`/api/services/status?${params.toString()}`);
      const data = await response.json();
      
      setServices(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: data.message || 'OFFLINE',
          isOnline: data.online || false,
          isLoading: false,
          error: data.error || undefined,
          reason: data.reason || data.error || undefined
        };
        return updated;
      });
    } catch (error: any) {
      setServices(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'OFFLINE',
          isOnline: false,
          isLoading: false,
          error: error?.message || 'Error de conexión',
          reason: error?.message || 'No se pudo conectar al servicio'
        };
        return updated;
      });
    }
  };

  const toggleEdit = (index: number) => {
    setServices(prev => {
      const updated = [...prev];
      const service = updated[index];
      // Si se está abriendo el modo edición, cargar la API key guardada
      if (!service.isEditing) {
        const apiKeys = loadApiKeys();
        service.apiKey = apiKeys[service.serviceKey] || service.apiKey || '';
      }
      updated[index] = {
        ...service,
        isEditing: !service.isEditing
      };
      return updated;
    });
  };

  const handleApiKeyChange = (index: number, value: string) => {
    setServices(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        apiKey: value
      };
      return updated;
    });
  };

  const handleSaveApiKey = (service: ServiceInfo, index: number) => {
    if (service.apiKey !== undefined) {
      saveApiKey(service.serviceKey, service.apiKey);
      toggleEdit(index);
      // Verificar estado después de guardar
      checkServiceStatus(service, index);
    }
  };

  useEffect(() => {
    const permissions = getPermissions();
    const admin = permissions?.type === 'admin';
    setIsAdmin(admin || false);

    const apiKeys = loadApiKeys();

    // Todos los servicios con verificación
    const allServices: ServiceInfo[] = [
      // Servicios internos (solo admin)
      ...(admin ? [{
        name: 'Meilisearch',
        status: 'Verificando...',
        isLoading: true,
        serviceKey: 'meilisearch',
        apiKey: apiKeys['meilisearch'] || '',
        checkUrl: ''
      }, {
        name: 'N8N',
        status: 'Verificando...',
        isLoading: true,
        serviceKey: 'n8n',
        apiKey: apiKeys['n8n'] || '',
        checkUrl: ''
      }, {
        name: 'Alegra',
        status: 'Verificando...',
        isLoading: true,
        serviceKey: 'alegra',
        apiKey: apiKeys['alegra'] || '',
        checkUrl: ''
      }, {
        name: 'Stripe',
        status: 'Verificando...',
        isLoading: true,
        serviceKey: 'stripe',
        apiKey: apiKeys['stripe'] || '',
        checkUrl: ''
      }] : []),
      // Servicios externos
      {
        name: 'OpenAI',
        status: 'Verificando...',
        dashboardUrl: 'https://platform.openai.com/usage',
        isLoading: true,
        serviceKey: 'openai',
        apiKey: apiKeys['openai'] || '',
        checkUrl: 'https://api.openai.com/v1/models'
      },
      {
        name: 'xAI (X)',
        status: 'Verificando...',
        dashboardUrl: 'https://console.x.ai',
        isLoading: true,
        serviceKey: 'xai',
        apiKey: apiKeys['xai'] || '',
        checkUrl: 'https://api.x.ai/v1/models'
      },
      {
        name: 'Gemini (Google)',
        status: 'Verificando...',
        dashboardUrl: 'https://console.cloud.google.com',
        isLoading: true,
        serviceKey: 'gemini',
        apiKey: apiKeys['gemini'] || '',
        checkUrl: 'https://generativelanguage.googleapis.com'
      },
      {
        name: 'Replicate',
        status: 'Verificando...',
        dashboardUrl: 'https://replicate.com/account/credits',
        isLoading: true,
        serviceKey: 'replicate',
        apiKey: apiKeys['replicate'] || '',
        checkUrl: 'https://api.replicate.com/v1/account'
      },
      {
        name: 'Open Router',
        status: 'Verificando...',
        dashboardUrl: 'https://openrouter.ai/activity',
        isLoading: true,
        serviceKey: 'openrouter',
        apiKey: apiKeys['openrouter'] || '',
        checkUrl: 'https://openrouter.ai/api/v1/models'
      },
      {
        name: 'AWS Lightsail',
        status: 'Verificando...',
        dashboardUrl: 'https://lightsail.aws.amazon.com/ls/webapp/home/instances',
        isLoading: true,
        serviceKey: 'aws-lightsail',
        apiKey: apiKeys['aws-lightsail'] || '',
        checkUrl: 'https://lightsail.aws.amazon.com'
      },
      {
        name: 'AWS Billing',
        status: 'Verificando...',
        dashboardUrl: 'https://us-east-1.console.aws.amazon.com/billing/home#/',
        isLoading: true,
        serviceKey: 'aws',
        apiKey: apiKeys['aws'] || '',
        checkUrl: 'https://lightsail.aws.amazon.com'
      },
      {
        name: 'RapidAPI',
        status: 'Verificando...',
        dashboardUrl: 'https://rapidapi.com/org/11034001/transactions/subscribed',
        isLoading: true,
        serviceKey: 'rapidapi',
        apiKey: apiKeys['rapidapi'] || '',
        checkUrl: 'https://rapidapi.com'
      },
      {
        name: 'Claude (Anthropic)',
        status: 'Verificando...',
        dashboardUrl: 'https://platform.claude.com/settings/billing',
        isLoading: true,
        serviceKey: 'claude',
        apiKey: apiKeys['claude'] || '',
        checkUrl: 'https://api.anthropic.com'
      }
    ];

    setServices(allServices);

    // Verificar estado de cada servicio
    allServices.forEach((service, index) => {
      checkServiceStatus(service, index);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <ProtectedLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Consumo API</h1>
      
      <div className="mb-6 p-4 rounded-xl border border-[#5DE1E5] bg-[rgba(93,225,229,0.1)]">
        <p className="text-sm text-[#0369a1]">
          <strong>Nota:</strong> Verifica regularmente el estado de créditos de cada servicio para asegurar su disponibilidad.
        </p>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-4">Estado de Servicios</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                service.isLoading
                  ? 'bg-gray-100 text-gray-600'
                  : service.isOnline
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {service.status}
              </span>
            </div>
            
            {/* Campo para editar API Key */}
            <div className="mb-4">
              {service.isEditing ? (
                <div className="space-y-2">
                  <input
                    type="password"
                    value={service.apiKey || ''}
                    onChange={(e) => handleApiKeyChange(index, e.target.value)}
                    placeholder="API Key (opcional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5DE1E5]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveApiKey(service, index)}
                      className="flex-1 px-3 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-all"
                      style={{ backgroundColor: '#5DE1E5' }}
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => toggleEdit(index)}
                      className="flex-1 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => toggleEdit(index)}
                  className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                >
                  {service.apiKey ? '✏️ Editar API Key' : '➕ Agregar API Key'}
                </button>
              )}
            </div>

            {service.isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5DE1E5]"></div>
                Verificando estado...
              </div>
            )}
            
            {!service.isLoading && service.isOnline && (
              <p className="text-sm text-gray-600 mb-4">
                Servicio activo y disponible.
              </p>
            )}
            
            {!service.isLoading && !service.isOnline && service.reason && (
              <div className="mb-4 text-xs text-red-600 bg-red-50 p-2 rounded">
                <strong>Error:</strong> {service.reason}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => checkServiceStatus(service, index)}
                disabled={service.isLoading}
                className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {service.isLoading ? 'Verificando...' : '🔄 Verificar'}
              </button>
              {service.dashboardUrl && (
                <a 
                  href={service.dashboardUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 text-gray-900 rounded-lg hover:opacity-90 transition-all text-sm font-medium"
                  style={{ backgroundColor: '#5DE1E5' }}
                >
                  Dashboard →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <h4 className="font-semibold text-yellow-900 mb-2">Recomendaciones:</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Monitorea regularmente el uso de cada API</li>
          <li>• Configura alertas en los dashboards cuando sea posible</li>
          <li>• Considera agregar fondos antes de que se agoten los créditos</li>
          <li>• Verifica los dashboards oficiales para información detallada</li>
        </ul>
      </div>
    </ProtectedLayout>
  );
}

