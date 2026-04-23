'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedLayout from '@/components/ProtectedLayout';
import ModuleLoading from '@/components/ModuleLoading';

// Static imports for known modules
import ModVerificadorMobilia from '@/modules-custom/verificador-mobilia';
import ModHolaMundo from '@/modules-custom/hola-mundo';
import ModLogLeadsSuvi from '@/modules-custom/log-leads-suvi';
import ModGeneradorCartaLaboral from '@/modules-custom/generador-carta-laboral';
import ModConsultaCumpleanos from '@/modules-custom/consulta-de-cumplea-os';
import ModLlamadaSara from '@/modules-custom/llamada-sara';
import ModSuviOpportunity from '@/modules-custom/suvi-opportunity';
import ModBackupDropbox from '@/modules-custom/backup-dropbox';
import ModBiuryPagos from '@/modules-custom/biury-pagos';
import ModGeneradorBackupsMeilisearch from '@/modules-custom/generador-de-backups-meilisearch';
import ModSyncDataTablerosGain from '@/modules-custom/sync-data-tableros-gain';
import ModSistemaCambioFondosPlacas from '@/modules-custom/sistema-de-cambio-de-fondos-y-placas';
import ModUptimeDashboard from '@/modules-custom/uptime-dashboard-ecosistema-autolarte';
import ModEndpointsAnaliticaBiury from '@/modules-custom/endpoints-anal-tica-biury';

const MODULES_MAP: Record<string, any> = {
  'verificador-mobilia': ModVerificadorMobilia,
  'hola-mundo': ModHolaMundo,
  'log-leads-suvi': ModLogLeadsSuvi,
  'generador-carta-laboral': ModGeneradorCartaLaboral,
  'consulta-de-cumplea-os': ModConsultaCumpleanos,
  'llamada-sara': ModLlamadaSara,
  'suvi-opportunity': ModSuviOpportunity,
  'backup-dropbox': ModBackupDropbox,
  'biury-pagos': ModBiuryPagos,
  'generador-de-backups-meilisearch': ModGeneradorBackupsMeilisearch,
  'sync-data-tableros-gain': ModSyncDataTablerosGain,
  'sistema-de-cambio-de-fondos-y-placas': ModSistemaCambioFondosPlacas,
  'uptime-dashboard-ecosistema-autolarte': ModUptimeDashboard,
  'endpoints-anal-tica-biury': ModEndpointsAnaliticaBiury,
};

interface Module {
  id: number;
  title: string;
  folder_name: string;
  description: string | null;
  agent_name: string;
  client_name?: string;
}

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params?.id;

  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ModuleComponent, setModuleComponent] = useState<any>(null);
  const [loadingComponent, setLoadingComponent] = useState(true);

  useEffect(() => {
    if (!moduleId) return;

    const loadModule = async () => {
      try {
        setLoading(true);
        console.log('[MODULE DETAIL] Loading module ID:', moduleId);
        const res = await fetch(`/api/modules/${moduleId}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        const data = await res.json();
        console.log('[MODULE DETAIL] API response:', data);

        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'No se pudo cargar el módulo');
        }

        if (!data.module?.folder_name) {
          throw new Error('El módulo no tiene folder_name. Módulo: ' + JSON.stringify(data.module));
        }

        setModule(data.module);
        
        const moduleFolderName = data.module.folder_name;
        console.log('[MODULE DETAIL] folder_name:', moduleFolderName);
        
        setLoadingComponent(true);
        try {
          const Component = MODULES_MAP[moduleFolderName];
          if (Component) {
            setModuleComponent(() => Component);
            console.log('[MODULE DETAIL] Component loaded from map');
          } else {
            throw new Error(`Módulo "${moduleFolderName}" no está registrado en el mapa de módulos`);
          }
        } catch (e: any) {
          console.error('[MODULE DETAIL] Import error:', e);
          setError(`El módulo "${moduleFolderName}" no tiene implementación o hay un error en el código. Error: ${e?.message || e}`);
        } finally {
          setLoadingComponent(false);
        }
      } catch (e: any) {
        console.error('[MODULE DETAIL] Error:', e);
        setError(e?.message || 'Error al cargar el módulo');
      } finally {
        setLoading(false);
      }
    };

    loadModule();
  }, [moduleId]);

  if (loading) {
    return (
      <ProtectedLayout>
        <ModuleLoading />
      </ProtectedLayout>
    );
  }

  if (error || !module) {
    return (
      <ProtectedLayout>
        <div className="max-w-2xl mx-auto mt-10">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-red-900 mb-2">Error al cargar el módulo</h3>
                <p className="text-red-800 mb-4">{error || 'Módulo no encontrado'}</p>
                <button
                  onClick={() => router.push('/modulos')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Volver a Módulos
                </button>
              </div>
            </div>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => router.push('/modulos')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Volver"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{module.title}</h1>
            </div>
            <div className="ml-14 text-sm text-gray-600">
              <span className="font-medium">{module.agent_name}</span>
              {module.client_name && <span> · Cliente: {module.client_name}</span>}
            </div>
            <div className="ml-14 mt-1 text-xs text-gray-500 font-mono bg-gray-100 inline-block px-2 py-1 rounded">
              📁 {module.folder_name}
            </div>
          </div>
        </div>
        {module.description && (
          <div className="mt-4 ml-14 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
            {module.description}
          </div>
        )}
      </div>

      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${module.folder_name === 'sync-data-tableros-gain' ? 'p-4 md:p-6' : ''}`}>
        {loadingComponent ? (
          <ModuleLoading />
        ) : ModuleComponent ? (
          <Suspense fallback={
            <ModuleLoading />
          }>
            {module.folder_name === 'sync-data-tableros-gain' ? (
              <div className="p-4 md:p-6">
                <ModuleComponent moduleData={module} />
              </div>
            ) : (
              <ModuleComponent moduleData={module} />
            )}
          </Suspense>
        ) : (
          <div className="p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-2">Componente no encontrado</h3>
                  <p className="text-yellow-800 mb-3">
                    El módulo <code className="bg-yellow-100 px-1 rounded">{module.folder_name}</code> no tiene un archivo <code className="bg-yellow-100 px-1 rounded">index.tsx</code> o tiene errores.
                  </p>
                  <p className="text-sm text-yellow-700">
                    Ruta esperada: <code className="bg-yellow-100 px-1 rounded text-xs">modules-custom/{module.folder_name}/index.tsx</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
