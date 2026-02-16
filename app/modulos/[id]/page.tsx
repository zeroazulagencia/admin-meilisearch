'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedLayout from '@/components/ProtectedLayout';

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
        const res = await fetch(`/api/modules/${moduleId}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'No se pudo cargar el módulo');
        }

        setModule(data.module);

        if (data.module?.folder_name) {
          setLoadingComponent(true);
          try {
            const component = await import(`@/modules-custom/${data.module.folder_name}/index.tsx`);
            setModuleComponent(() => component.default);
          } catch (e) {
            console.error('[MODULE DETAIL] Error cargando componente:', e);
            setError(`El módulo "${data.module.folder_name}" no tiene implementación o hay un error en el código.`);
          } finally {
            setLoadingComponent(false);
          }
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
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: '#5DE1E5' }}></div>
            <p className="text-gray-600">Cargando módulo...</p>
          </div>
        </div>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loadingComponent ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin h-10 w-10 border-4 border-t-transparent rounded-full mx-auto mb-3" style={{ borderColor: '#5DE1E5' }}></div>
              <p className="text-gray-600">Cargando componente...</p>
            </div>
          </div>
        ) : ModuleComponent ? (
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin h-10 w-10 border-4 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }}></div>
            </div>
          }>
            <ModuleComponent moduleData={module} />
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
