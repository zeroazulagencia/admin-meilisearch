'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface OAuthStatus {
  oauth_configured: boolean;
  has_active_tokens: boolean;
  instance_url: string | null;
  consumer_key: string | null;
  token_expiry: string | null;
  is_expired: boolean;
  time_until_expiry_minutes: number | null;
}

export default function OAuthSalesforcePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<OAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const oauthSuccess = searchParams.get('oauth_success');
  const oauthError = searchParams.get('oauth_error');
  const instanceUrl = searchParams.get('instance_url');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/oauth/salesforce/status');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = () => {
    window.location.href = '/api/oauth/salesforce/authorize';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/oauth/salesforce/refresh', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        alert('✅ Token renovado exitosamente');
        fetchStatus();
      } else {
        alert(`❌ Error: ${data.error}\n\n${data.hint || ''}`);
      }
    } catch (error) {
      alert('❌ Error renovando token');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-8 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🔐 OAuth Salesforce</h1>
          <p className="text-gray-600 mb-6">Configuración de autenticación con Salesforce</p>

          {/* Mensajes de OAuth */}
          {oauthSuccess && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
              <div className="flex items-center">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <p className="font-bold text-green-900">¡Autorización exitosa!</p>
                  <p className="text-green-700 text-sm">Conectado a: {instanceUrl}</p>
                </div>
              </div>
            </div>
          )}

          {oauthError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
              <div className="flex items-center">
                <span className="text-2xl mr-3">❌</span>
                <div>
                  <p className="font-bold text-red-900">Error en autorización</p>
                  <p className="text-red-700 text-sm">{decodeURIComponent(oauthError)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Estado actual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 font-medium">Credenciales OAuth</span>
                <span className={`text-2xl ${status?.oauth_configured ? '' : 'opacity-30'}`}>
                  {status?.oauth_configured ? '✅' : '❌'}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {status?.oauth_configured ? 'Configuradas' : 'No configuradas'}
              </p>
              {status?.consumer_key && (
                <p className="text-xs text-gray-400 mt-1 font-mono">{status.consumer_key}</p>
              )}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 font-medium">Tokens Activos</span>
                <span className={`text-2xl ${status?.has_active_tokens ? '' : 'opacity-30'}`}>
                  {status?.has_active_tokens ? '✅' : '❌'}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {status?.has_active_tokens ? 'Disponibles' : 'No disponibles'}
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 font-medium">Instancia Salesforce</span>
                <span className="text-2xl">🌐</span>
              </div>
              <p className="text-sm text-gray-500">
                {status?.instance_url || 'No configurada'}
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 font-medium">Estado del Token</span>
                <span className={`text-2xl ${status?.is_expired ? 'opacity-30' : ''}`}>
                  {status?.is_expired ? '⏰' : status?.token_expiry ? '✅' : '❌'}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {status?.is_expired 
                  ? 'Expirado' 
                  : (status?.time_until_expiry_minutes !== null && status?.time_until_expiry_minutes !== undefined)
                    ? `Expira en ${status.time_until_expiry_minutes} min`
                    : 'Sin token'}
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="space-y-4">
            {!status?.has_active_tokens && (
              <button
                onClick={handleAuthorize}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
              >
                🚀 Autorizar Salesforce
              </button>
            )}

            {status?.has_active_tokens && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-green-600 hover:to-teal-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refreshing ? '⏳ Renovando...' : '♻️ Renovar Token Manualmente'}
              </button>
            )}

            <button
              onClick={() => router.push('/modulos/1')}
              className="w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-all"
            >
              ← Volver al Dashboard
            </button>
          </div>

          {/* Documentación */}
          <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
            <h3 className="font-bold text-blue-900 mb-2">📚 Configuración del Connected App</h3>
            <p className="text-blue-800 text-sm mb-3">
              Antes de autorizar, asegúrate de configurar el Callback URL en tu Connected App de Salesforce:
            </p>
            <div className="bg-white p-3 rounded border border-blue-200 font-mono text-sm">
              https://workers.zeroazul.com/api/oauth/salesforce/callback
            </div>
            <p className="text-blue-700 text-xs mt-3">
              Setup → App Manager → [Tu Connected App] → Edit → Callback URL
            </p>
          </div>

          {/* Información técnica */}
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <details>
              <summary className="cursor-pointer font-medium text-gray-700">
                🔧 Información Técnica
              </summary>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p>• Los access tokens expiran cada 2 horas</p>
                <p>• La renovación es automática usando refresh tokens</p>
                <p>• Si eliminas el refresh token, deberás re-autorizar</p>
                <p>• El sistema maneja automáticamente tokens expirados</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
