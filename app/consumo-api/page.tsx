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
}

export default function ConsumoAPI() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminServices, setAdminServices] = useState<ServiceInfo[]>([]);

  useEffect(() => {
    const permissions = getPermissions();
    const admin = permissions?.type === 'admin';
    setIsAdmin(admin || false);

    if (admin) {
      // Servicios solo para admin con verificación de estado
      const services: ServiceInfo[] = [
        {
          name: 'Meilisearch',
          status: 'Verificando...',
          isLoading: true
        },
        {
          name: 'N8N',
          status: 'Verificando...',
          isLoading: true
        },
        {
          name: 'Alegra',
          status: 'Verificando...',
          isLoading: true
        },
        {
          name: 'Stripe',
          status: 'Verificando...',
          isLoading: true
        }
      ];
      setAdminServices(services);

      // Verificar estado de cada servicio
      services.forEach((service, index) => {
        checkServiceStatus(service.name.toLowerCase(), index);
      });
    }
  }, []);

  const checkServiceStatus = async (serviceName: string, index: number) => {
    try {
      const response = await fetch(`/api/services/status?service=${serviceName}`);
      const data = await response.json();
      
      setAdminServices(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: data.message || 'OFFLINE',
          isOnline: data.online || false,
          isLoading: false
        };
        return updated;
      });
    } catch (error) {
      setAdminServices(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'OFFLINE',
          isOnline: false,
          isLoading: false
        };
        return updated;
      });
    }
  };

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
    },
    {
      name: 'AWS Lightsail',
      status: 'Activo',
      dashboardUrl: 'https://lightsail.aws.amazon.com/ls/webapp/home/instances'
    },
    {
      name: 'AWS Billing',
      status: 'Activo',
      dashboardUrl: 'https://us-east-1.console.aws.amazon.com/billing/home#/'
    },
    {
      name: 'RapidAPI',
      status: 'Activo',
      dashboardUrl: 'https://rapidapi.com/org/11034001/transactions/subscribed'
    },
    {
      name: 'Claude (Anthropic)',
      status: 'Activo',
      dashboardUrl: 'https://platform.claude.com/settings/billing'
    }
  ];

  return (
    <ProtectedLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Consumo API</h1>
      
      <div className="mb-6 p-4 rounded-xl border border-[#5DE1E5] bg-[rgba(93,225,229,0.1)]">
        <p className="text-sm text-[#0369a1]">
          <strong>Nota:</strong> Verifica regularmente el estado de créditos de cada servicio para asegurar su disponibilidad.
        </p>
      </div>

      {/* Servicios solo para Admin */}
      {isAdmin && adminServices.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Estado de Servicios (Solo Admin)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {adminServices.map((service, index) => (
              <div key={`admin-${index}`} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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
                
                {service.isLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5DE1E5]"></div>
                    Verificando...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold text-gray-900 mb-4">Dashboards de Servicios</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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
                className="inline-flex items-center px-4 py-2 text-gray-900 rounded-lg hover:opacity-90 transition-all text-sm font-medium w-full justify-center"
                style={{ backgroundColor: '#5DE1E5' }}
              >
                Ver Dashboard →
              </a>
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

