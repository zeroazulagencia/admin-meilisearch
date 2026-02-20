'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

type CallStatus = 'cargando' | 'listo' | 'conectando' | 'en-llamada' | 'colgado' | 'error';

const TOKEN_URL = '/api/custom-module5/llamada-sara/token';
const FINALIZAR_URL = '/api/custom-module5/llamada-sara/finalizar';

export default function LlamadaSaraPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const room = Array.isArray(params?.room) ? params.room[0] : (params?.room ?? '');
  const role = searchParams?.get('role') || 'cliente';

  const [status, setStatus] = useState<CallStatus>('cargando');
  const [errorMsg, setErrorMsg] = useState('');
  const [muted, setMuted] = useState(false);

  const deviceRef = useRef<any>(null);
  const callRef = useRef<any>(null);

  const fetchToken = useCallback(async () => {
    const res = await fetch(`${TOKEN_URL}?room=${encodeURIComponent(room)}&role=${encodeURIComponent(role)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error al obtener token');
    return data.token as string;
  }, [room, role]);

  const finalizarLlamada = useCallback(async () => {
    try {
      await fetch(FINALIZAR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: room }),
      });
    } catch {}
  }, [room]);

  useEffect(() => {
    if (!room) return;
    let device: any;

    const setup = async () => {
      try {
        const jwt = await fetchToken();
        const { Device } = await import('@twilio/voice-sdk');

        device = new Device(jwt, { logLevel: 1 });
        deviceRef.current = device;

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
      const call = await deviceRef.current.connect({ params: { room } });
      callRef.current = call;

      call.on('accept', () => setStatus('en-llamada'));
      call.on('disconnect', () => {
        setStatus('colgado');
        callRef.current = null;
        finalizarLlamada();
      });
      call.on('error', (err: any) => {
        setErrorMsg(err?.message || 'Error');
        setStatus('error');
      });
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus('error');
    }
  };

  const colgar = () => {
    callRef.current?.disconnect();
    callRef.current = null;
    setStatus('colgado');
    finalizarLlamada();
  };

  const toggleMute = () => {
    if (!callRef.current) return;
    const next = !muted;
    callRef.current.mute(next);
    setMuted(next);
  };

  const statusConfig: Record<CallStatus, { color: string; textColor: string; label: string }> = {
    cargando:    { color: 'bg-gray-400', textColor: 'text-gray-500', label: 'Iniciando...' },
    listo:       { color: 'bg-blue-500', textColor: 'text-blue-600', label: 'Listo para conectar' },
    conectando:  { color: 'bg-yellow-500', textColor: 'text-yellow-600', label: 'Conectando...' },
    'en-llamada':{ color: 'bg-green-500', textColor: 'text-green-600', label: 'En llamada' },
    colgado:     { color: 'bg-gray-400', textColor: 'text-gray-500', label: 'Llamada finalizada' },
    error:       { color: 'bg-red-500', textColor: 'text-red-600', label: 'Error' },
  };

  const current = statusConfig[status];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-sm p-8 text-center space-y-6">

        <div>
          <h1 className="text-xl font-bold text-gray-900">Modulo de llamadas PromtaDx</h1>
          <p className="text-xs text-gray-400 font-mono mt-1 break-all">{room}</p>
          {role === 'asesor' && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Asesor</span>
          )}
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className={`w-3 h-3 rounded-full ${current.color} ${(status === 'cargando' || status === 'conectando') ? 'animate-pulse' : ''}`} />
          <span className={`text-sm font-semibold ${current.textColor}`}>
            {current.label}
          </span>
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
              Unirse a la llamada
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
                {muted ? 'Silenciado' : 'Silenciar'}
              </button>
              <button
                onClick={colgar}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Colgar
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

        <p className="text-xs text-gray-400">DWORKERS - Modulo de llamadas PromtaDx</p>
      </div>
    </div>
  );
}
