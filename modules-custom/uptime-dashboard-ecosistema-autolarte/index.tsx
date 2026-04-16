'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ServiceSectionResult, TotalsResult, VehicleSampleResult, VcardSampleResult } from './utils/types';

const API_BASE = '/api/custom-module12/uptime-dashboard-ecosistema-autolarte';

function sanitizeRoute(route: string): string {
  if (!route) return '';
  return route.replace(/\.php/g, '').replace(/=XXX/g, '=XXX');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('es-CO');
  } catch { return '-'; }
}

function CheckDot({ ok }: { ok: boolean }) {
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${ok ? 'bg-green-500' : 'bg-red-500'}`} />;
}

function ServiceCard({ service, onVerify, isLoading }: { service: any; onVerify: () => void; isLoading: boolean }) {
  const isEnDesarrollo = service.status === 'en_desarrollo';
  const isOnline = service.status === 'online';
  const statusColor = isEnDesarrollo ? 'bg-gray-400' : isOnline ? 'bg-green-500' : 'bg-red-500';
  const statusText = isEnDesarrollo ? 'En desarrollo...' : isOnline ? 'En linea' : 'Fuera de linea';

  const hasExecutions = service.fetch_executions;
  const execStatusText = service.last_execution_status === 'success' ? 'Funciono' :
    service.last_execution_status === 'error' ? 'Error' :
    service.last_execution_status === 'running' ? 'En ejecucion' :
    service.last_execution_error ? 'Error al obtener' : 'Sin datos';
  const execStatusColor = service.last_execution_status === 'success' ? 'text-green-600' :
    service.last_execution_status === 'error' ? 'text-red-600' :
    service.last_execution_error ? 'text-red-600' : 'text-gray-500';

  const showInventarioTotals = service.name === 'CRM Inventario';
  const showVehiculosTotals = service.name === 'WordPress API Vehiculos';
  const showFondosImg = service.name === 'Modelo de Ajuste de Fondos' && (window as any)._vehicleImages?.fondos_image;
  const showPlacasImg = service.name === 'Modelo de Ajuste de Placas' && (window as any)._vehicleImages?.placas_image;

  const cartaChecks = service.carta_checks || [];
  const conocimientoChecks = service.conocimiento_checks || [];
  const birthdayChecks = service.birthday_checks || [];
  const webSegChecks = service.web_seguridad_checks || [];
  const marcasChecks = service.conocimiento_marcas_checks || [];

  const renderChecks = (checks: any[]) => checks.map((c: any, i: number) => (
    <div key={i} className="flex items-start gap-2 text-xs mt-1">
      <CheckDot ok={c.ok} />
      <div className="min-w-0 flex-1">
        <span>{c.label}</span>
        <span className="break-all text-gray-600 ml-1">{c.url}</span>
        {!c.ok && c.error && <span className="text-red-600 block mt-0.5">{c.error}</span>}
      </div>
    </div>
  ));

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center">
          <span className={`${statusColor} w-2.5 h-2.5 rounded-full mr-2`}></span>
          <span className="text-xs font-medium">{statusText}</span>
        </div>
        {!isEnDesarrollo && service.response_time_ms && (
          <span className="text-xs text-gray-600">{service.response_time_ms}ms</span>
        )}
      </div>

      <h4 className="font-medium text-gray-800">{service.name}</h4>
      <p className="text-xs text-gray-400 mt-1 font-mono break-all whitespace-normal">{sanitizeRoute(service.route)}</p>
      {service.description && <p className="text-xs text-gray-500 mt-1">{service.description}</p>}

      {showInventarioTotals && (window as any)._totals && (
        <p className="text-xs mt-2"><span className="text-gray-500">Total:</span> <span className="font-medium">{(window as any)._totals.inventario}</span></p>
      )}
      {showVehiculosTotals && (window as any)._totals && (
        <p className="text-xs mt-2"><span className="text-gray-500">Total:</span> <span className="font-medium">{(window as any)._totals.vehiculos}</span></p>
      )}

      {hasExecutions && (
        <p className="text-xs mt-2">
          <span className="text-gray-500">Ultima ejecucion:</span> {formatDate(service.last_execution_at)} <span className={`${execStatusColor} font-medium`}>{execStatusText}</span>
        </p>
      )}

      {service.test_chat && service.chat_response && (
        <p className="text-xs mt-2"><span className="text-gray-500">Chat:</span> <span className="text-gray-700">{service.chat_response.substring(0, 120)}{service.chat_response.length > 120 ? '...' : ''}</span></p>
      )}

      {service.test_carta_laboral && cartaChecks.length > 0 && (
        <div className="mt-2">{renderChecks(cartaChecks)}</div>
      )}

      {service.test_conocimiento_intranet && conocimientoChecks.length > 0 && (
        <div className="mt-2">{renderChecks(conocimientoChecks)}</div>
      )}

      {service.test_birthday_search && birthdayChecks.length > 0 && (
        <div className="mt-2">{renderChecks(birthdayChecks)}</div>
      )}

      {service.test_web_seguridad && webSegChecks.length > 0 && (
        <div className="mt-2">{renderChecks(webSegChecks)}</div>
      )}

      {service.test_conocimiento_marcas && marcasChecks.length > 0 && (
        <div className="mt-2">{renderChecks(marcasChecks)}</div>
      )}

      {service.test_datos_usuarios && service.datos_usuarios_search_term && (
        <p className="text-xs mt-2 text-gray-500">Busqueda: {service.datos_usuarios_search_term}</p>
      )}

      {service.test_vcards_search && service.vcards_search_term && (
        <p className="text-xs mt-2 text-gray-500">Busqueda: {service.vcards_search_term}</p>
      )}

      {showFondosImg && (
        <img src={(window as any)._vehicleImages.fondos_image} alt="" className="mt-2 rounded max-h-20 object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
      )}
      {showPlacasImg && (
        <img src={(window as any)._vehicleImages.placas_image} alt="" className="mt-2 rounded max-h-20 object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
      )}

      {!isEnDesarrollo && service.error && (
        <p className="mt-2 text-xs text-red-600">Error: {service.error}</p>
      )}

      {!isEnDesarrollo && (
        <p className="mt-2">
          <button
            onClick={onVerify}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? '...' : 'Verificar'}
          </button>
        </p>
      )}
    </div>
  );
}

function SectionCard({ section, sectionIndex, onVerifyService, loadingService }: { section: any; sectionIndex: number; onVerifyService: (si: number, i: number) => void; loadingService: string | null }) {
  const isVcard = section.title === 'Flujo VCARD (Actualizacion)';
  const isSincronizador = section.title === 'Sincronizador CRM + Usados (y retoque foto)';

  const diagramId = section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const diagrams: Record<string, string> = {
    'sistema-de-pago-autolarte': `flowchart LR
A["Api Cartera<br/>Autenticacion"] --> B["Conector<br/>Carga facturas"]
B --> C["Usuario<br/>Selecciona"]
C --> D["Wompi API<br/>Crea link"]
D --> E["Checkout<br/>Pago"]
E --> F["Event Handler<br/>Aplica pago"]`,
    'agente-lucas': `flowchart LR
A["Chat message"] --> B["AI Agent"]
B --> C["Respond Webhook"]
B --> D["search_employee"]
B --> E["search_intranet"]
B --> F["carta_laboral"]
B --> G["Conocimiento general"]
B --> H["Marcas"]
B --> I["Cumpleanos"]
B --> J["VCARDs"]`,
    'flujo-vcard-(actualizacion)': `flowchart LR
A["Formulario<br/>solicitud"] --> B["Sistema VCARDs"]
C["Form Trigger"] --> D["Extract File"]
D --> E["API Automation"]
E --> F["Outlook"]
G["Cron semanal"] --> H["Lista pendientes"]
H --> I["Buscador search"]
I --> J["Outlook mail"]`,
    'sincronizador-crm-+-usados-(y-retoque-foto)': `flowchart LR
A["Zero Azul<br/>Schedule 6h"] --> B["Actualizar Usados"]
B --> C["CRM Inventario"]
C --> D["Modelo Ajuste<br/>Fondos"]
D --> E["WordPress<br/>POST/PUT/DELETE"]
B --> E
E --> F["Zero Azul obtiene<br/>CRM + WP"]
F --> G["Comparar<br/>verdes/rojos"]
G --> H["Reporte HTML"]
H --> I["Gmail"]
H --> J["Workers<br/>Zero Azul"]`
  };

  const headerLinks: Record<string, React.ReactNode> = {
    'Flujo VCARD (Actualizacion)': (
      <div className="space-y-1">
        <a href="https://automation.zeroazul.com/form-test/16a250f0-603d-4c9c-9c4f-c0167d061d7a" target="_blank" rel="noopener" className="text-xs text-gray-300 hover:text-white block">Formulario solicitud VCARD</a>
        <a href="https://automation.zeroazul.com/workflow/225dqcGd1dfLsJAr" target="_blank" rel="noopener" className="text-xs text-gray-300 hover:text-white block">Workflow</a>
        <a href="https://tarjetav.co/v/autolarte" target="_blank" rel="noopener" className="text-xs text-gray-300 hover:text-white block">tarjetav.co/v/autolarte</a>
      </div>
    ),
    'Sistema de Pago Autolarte': (
      <a href="https://autolarte.com.co/pagos-en-linea/" target="_blank" rel="noopener" className="text-xs text-gray-300 hover:text-white block">https://autolarte.com.co/pagos-en-linea/</a>
    ),
    'Agente Lucas': (
      <a href="https://automation.zeroazul.com/workflow/61DSxtMYOoeUn3Zn" target="_blank" rel="noopener" className="text-xs text-gray-300 hover:text-white block">Workflow Lucas</a>
    ),
    'Sincronizador CRM + Usados (y retoque foto)': (
      <a href="https://automation.zeroazul.com/workflow/NDDll4OQV5TWDcZt" target="_blank" rel="noopener" className="text-xs text-gray-300 hover:text-white block">https://automation.zeroazul.com/workflow/NDDll4OQV5TWDcZt</a>
    )
  };

  const descriptions: Record<string, string> = {
    'Sistema de Pago Autolarte': 'El usuario ingresa su cedula. El Conector autentica en Api Cartera, carga las facturas y las muestra. El usuario selecciona facturas y confirma. Se crea un payment_link en Wompi API y redirige al checkout. El usuario paga. Wompi envia webhook al Event Handler.',
    'Agente Lucas': 'LUCAS es el asistente del grupo Autolarte. Recibe mensajes por webhook (chat). El AI Agent con GPT-4o usa herramientas: search_employee (datos empleado Sigha), search_intranet (busqueda intranet), carta_laboral (genera carta), Conocimiento general, Marcas, Cumpleanos, VCARDs.',
    'Flujo VCARD (Actualizacion)': 'Flujo 1 - Solicitud: Formulario VCARD. Flujo 2 - Mail recordatorio: Cron semanal obtiene VCARDs pendientes, filtra por email, envia mail con link complete-vcard. Flujo 3 - Actualizacion manual: Empleado recibe mail, completa formulario.',
    'Sincronizador CRM + Usados (y retoque foto)': 'Zero Azul Automation cada 6h obtiene inventario CRM, crea/actualiza en WordPress, retoca fotos con Modelo de Ajuste de Fondos y Placas. Luego genera reporte y envia por Gmail.'
  };

  const [showDiagram, setShowDiagram] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-gray-800 text-white px-6 py-3">
        <h3 className="text-lg font-semibold">{section.title}</h3>
        {headerLinks[section.title]}
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {section.services.map((service: any, serviceIndex: number) => {
            const loadingKey = `${sectionIndex}-${serviceIndex}`;
            return (
              <ServiceCard
                key={loadingKey}
                service={service}
                onVerify={() => onVerifyService(sectionIndex, serviceIndex)}
                isLoading={loadingService === loadingKey}
              />
            );
          })}
        </div>

        {diagrams[diagramId] && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            {descriptions[section.title] && (
              <p className="text-sm text-gray-700 mb-4">{descriptions[section.title]}</p>
            )}
            <div>
              <button
                onClick={() => setShowDiagram(!showDiagram)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                <span className="text-xs">{showDiagram ? '▼' : '▶'}</span> Ver diagrama
              </button>
              {showDiagram && (
                <pre className="mermaid mt-2 bg-gray-50 p-4 rounded-lg overflow-x-auto" style={{ width: '100%' }}>
                  {diagrams[diagramId]}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigTab() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/config`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setConfig(data.config);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      setMessage({ type: data.success ? 'success' : 'error', text: data.success ? 'Configuracion guardada' : data.error });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Cargando...</div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Configuracion de Credenciales</h2>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">n8n</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input
            type="password"
            value={config['n8n_api_key'] || ''}
            onChange={e => setConfig({ ...config, 'n8n_api_key': e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            placeholder="eyJhbGci..."
          />
        </div>

        <h3 className="font-semibold text-gray-800 pt-4">Sigha</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={config['sigha_email'] || ''}
              onChange={e => setConfig({ ...config, 'sigha_email': e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="email@autolarte.com.co"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clave</label>
            <input
              type="password"
              value={config['sigha_clave'] || ''}
              onChange={e => setConfig({ ...config, 'sigha_clave': e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="clave"
            />
          </div>
        </div>

        <h3 className="font-semibold text-gray-800 pt-4">Outlook</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
            <input
              type="text"
              value={config['outlook_client_id'] || ''}
              onChange={e => setConfig({ ...config, 'outlook_client_id': e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              placeholder="guid"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
            <input
              type="password"
              value={config['outlook_client_secret'] || ''}
              onChange={e => setConfig({ ...config, 'outlook_client_secret': e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              placeholder="secret"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50 text-sm font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar Configuracion'}
        </button>
        {message && (
          <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}

function DocsTab() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Documentacion</h2>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Secciones del Panel</h3>
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <h4 className="font-medium">Sincronizador CRM + Usados</h4>
            <p>Sincroniza el inventario del CRM con WordPress. Incluye retoque de fotos con IA.</p>
          </div>
          <div>
            <h4 className="font-medium">Agente Lucas</h4>
            <p>Asistente IA que responde consultas sobre Autolarte, empleados, cumpleanos, VCARDs, etc.</p>
          </div>
          <div>
            <h4 className="font-medium">Flujo VCARD</h4>
            <p>Sistema de gestion de tarjetas de presentacionVCARDs) de empleados.</p>
          </div>
          <div>
            <h4 className="font-medium">Web y Seguridad</h4>
            <p>Monitorea los sitios web del ecosistema Autolarte y verifica que no haya redirecciones problematicas.</p>
          </div>
          <div>
            <h4 className="font-medium">Sistema de Pago</h4>
            <p>Panel de pagos en linea con integracion Wompi y consulta de cartera.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UptimeDashboard() {
  const [sections, setSections] = useState<ServiceSectionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [loadingService, setLoadingService] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'config' | 'docs'>('status');

  const loadServices = useCallback(async () => {
    try {
      const [servicesRes, totalsRes, vehiclesRes] = await Promise.all([
        fetch(`${API_BASE}/services`),
        fetch(`${API_BASE}/totals`),
        fetch(`${API_BASE}/vehicles-sample`)
      ]);

      const servicesData = await servicesRes.json();
      const totalsData = await totalsRes.json();
      const vehiclesData = await vehiclesRes.json();

      if (servicesData.success) {
        setSections(servicesData.sections);
        setLastUpdate(new Date().toLocaleString('es-CO'));
      }

      (window as any)._totals = totalsData;
      (window as any)._vehicleImages = vehiclesData;
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'status') {
      loadServices();
    }
  }, [activeTab, loadServices]);

  const handleVerifyService = async (sectionIndex: number, serviceIndex: number) => {
    const key = `${sectionIndex}-${serviceIndex}`;
    setLoadingService(key);
    try {
      const res = await fetch(`${API_BASE}/check?section=${sectionIndex}&service=${serviceIndex}`);
      const data = await res.json();
      if (data.success) {
        setSections(prev => prev.map((section, si) => {
          if (si !== sectionIndex) return section;
          return {
            ...section,
            services: section.services.map((service, svcIdx) => {
              if (svcIdx !== serviceIndex) return service;
              return data.service;
            })
          };
        }));
      }
    } catch (error) {
      console.error('Error verifying service:', error);
    } finally {
      setLoadingService(null);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Mermaid) {
      (window as any).Mermaid.run();
    }
  }, [sections]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8 pb-20">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Autolarte</h1>
            <p className="text-gray-600">Panel de Status de Servicios</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('status')}
              className={`px-3 py-1 text-sm rounded ${activeTab === 'status' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border'}`}
            >
              Status
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1 text-sm rounded ${activeTab === 'config' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border'}`}
            >
              Config
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-1 text-sm rounded ${activeTab === 'docs' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border'}`}
            >
              Docs
            </button>
          </div>
        </header>

        {activeTab === 'status' && (
          <>
            {loading ? (
              <div className="text-center text-gray-500 py-12">Cargando servicios...</div>
            ) : sections.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No hay servicios configurados</div>
            ) : (
              <div className="flex flex-col gap-6">
                {sections.map((section, sectionIndex) => (
                  <SectionCard
                    key={sectionIndex}
                    section={section}
                    sectionIndex={sectionIndex}
                    onVerifyService={handleVerifyService}
                    loadingService={loadingService}
                  />
                ))}
              </div>
            )}

            {lastUpdate && (
              <div className="mt-6 text-sm text-gray-500 text-center">
                Ultima actualizacion: {lastUpdate}
              </div>
            )}
          </>
        )}

        {activeTab === 'config' && <ConfigTab />}
        {activeTab === 'docs' && <DocsTab />}
      </div>

      <footer className="fixed bottom-0 w-full bg-gray-800 text-white text-center py-2 text-sm">
        Uptime Dashboard v1.0 - Autolarte
      </footer>
    </div>
  );
}
