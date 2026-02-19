'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';

type CallStatus = 'cargando' | 'listo' | 'conectando' | 'en-llamada' | 'colgado' | 'error';

const TOKEN_URL = '/api/custom-module5/llamada-sara/token';

export default function LlamadaSaraPage() {
  const params = useParams();
  const room = Array.isArray(params?.room) ? params.room[0] : (params?.room ?? '');

  const [status, setStatus] = useState<CallStatus>('cargando');
  const [errorMsg, setErrorMsg] = useState('');
  const [muted, setMuted] = useState(false);

  const deviceRef = useRef<any>(null);
  const callRef = useRef<any>(null);

  const fetchToken = useCallback(async () => {
    const res = await fetch(`${TOKEN_URL}?room=${encodeURIComponent(room)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error al obtener token');
    return data.token as string;
  }, [room]);

  useEffect(() => {
    if (!room) return;
    let device: any;

    const setup = async () => {
      try {
        const jwt = await fetchToken();

        // Import dinámico para evitar SSR
        const { Device } = await import('@twilio/voice-sdk');

        device = new Device(jwt, { logLevel: 1 });
        deviceRef.current = device;

        // v2.x usa 'registered' (no 'ready')
        device.on('registered', () => setStatus('listo'));

        device.on('error', (twilioError: any) => {
          setErrorMsg(twilioError?.message || 'Error de dispositivo');
          setStatus('error');
        });

        await device.register();
      } catch (e: any) {
        setErrorMsg(e.message || 'Error al inicializar');
        setStatus('error');
      }
    };

    setup();
    return () => { device?.destroy(); };
  }, [room, fetchToken]);

  const conectar = async () => {
    if (!deviceRef.current) return;
    setStatus('conectando');
    try {
      // En v2.x connect() retorna un objeto Call; los eventos van en el Call
      const call = await deviceRef.current.connect({ params: { room } });
      callRef.current = call;

      call.on('accept', () => setStatus('en-llamada'));
      call.on('disconnect', () => { setStatus('colgado'); callRef.current = null; });
      call.on('error', (err: any) => { setErrorMsg(err?.message || 'Error'); setStatus('error'); });
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus('error');
    }
  };

  const colgar = () => {
    callRef.current?.disconnect();
    setStatus('colgado');
  };

  const toggleMute = () => {
    if (!callRef.current) return;
    const next = !muted;
    callRef.current.mute(next);
    setMuted(next);
  };

  const statusLabels: Record<CallStatus, string> = {
    cargando:    'Iniciando...',
    listo:       'Listo para conectar',
    conectando:  'Conectando...',
    'en-llamada':'En llamada',
    colgado:     'Llamada finalizada',
    error:       'Error',
  };

  const statusColors: Record<CallStatus, string> = {
    cargando:    'text-gray-500',
    listo:       'text-blue-600',
    conectando:  'text-yellow-600',
    'en-llamada':'text-green-600',
    colgado:     'text-gray-500',
    error:       'text-red-600',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-sm p-8 text-center space-y-6">

        <div className="text-5xl">📞</div>

        <div>
          <h1 className="text-xl font-bold text-gray-900">Llamada SARA</h1>
          <p className="text-xs text-gray-400 font-mono mt-1 break-all">{room}</p>
        </div>

        <div className={`text-sm font-semibold ${statusColors[status]}`}>
          {statusLabels[status]}
        </div>

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3">
          {status === 'listo' && (
            <button
              onClick={conectar}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
            >
              📞 Unirse a la llamada
            </button>
          )}

          {status === 'en-llamada' && (
            <div className="flex gap-3">
              <button
                onClick={toggleMute}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                  muted ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {muted ? '🔇 Silenciado' : '🎤 Mutear'}
              </button>
              <button
                onClick={colgar}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                📵 Colgar
              </button>
            </div>
          )}

          {(status === 'cargando' || status === 'conectando') && (
            <div className="flex items-center justify-center gap-2 py-3 text-gray-500">
              <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-gray-400 rounded-full" />
              <span className="text-sm">{status === 'cargando' ? 'Cargando...' : 'Conectando...'}</span>
            </div>
          )}

          {status === 'colgado' && (
            <p className="text-sm text-gray-500">Puedes cerrar esta ventana.</p>
          )}
        </div>

        <p className="text-xs text-gray-400">DWORKERS · Sara · Módulo 5</p>
      </div>
    </div>
  );
}
