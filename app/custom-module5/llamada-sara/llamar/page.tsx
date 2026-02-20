'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type PageStatus = 'cargando' | 'sin_asesor' | 'ocupado' | 'solicitando' | 'conectando' | 'en-llamada' | 'finalizada' | 'error';

const BASE = '/api/custom-module5/llamada-sara';

function generarClienteId() {
  return 'cli_' + Math.random().toString(36).substring(2, 10);
}

export default function LlamarPage() {
  const [status, setStatus] = useState<PageStatus>('cargando');
  const [errorMsg, setErrorMsg] = useState('');
  const [muted, setMuted] = useState(false);
  const [roomId, setRoomId] = useState('');

  const clienteIdRef = useRef(generarClienteId());
  const deviceRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const limpiarPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const finalizarLlamada = useCallback(async (room: string) => {
    try {
      await fetch(`${BASE}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: room }),
      });
    } catch {}
  }, []);

  const solicitarLlamada = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/cliente/solicitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteIdRef.current }),
      });
      const data = await res.json();

      if (data.ok && data.room_id) {
        limpiarPolling();
        setRoomId(data.room_id);
        setStatus('conectando');
        return data.room_id;
      }

      if (data.razon === 'sin_asesor') {
        setStatus('sin_asesor');
        limpiarPolling();
        return null;
      }

      if (data.razon === 'ocupado') {
        setStatus('ocupado');
        return null;
      }

      setErrorMsg(data.error || 'Error desconocido');
      setStatus('error');
      return null;
    } catch (e: any) {
      setErrorMsg(e.message || 'Error de conexion');
      setStatus('error');
      return null;
    }
  }, [limpiarPolling]);

  const conectarTwilio = useCallback(async (room: string) => {
    try {
      const tokenRes = await fetch(`${BASE}/token?room=${encodeURIComponent(room)}&role=cliente`);
      const tokenData = await tokenRes.json();
      if (!tokenData.ok) throw new Error(tokenData.error || 'Error al obtener token');

      const { Device } = await import('@twilio/voice-sdk');
      const device = new Device(tokenData.token, { logLevel: 1 });
      deviceRef.current = device;

      device.on('error', (twilioError: any) => {
        setErrorMsg(twilioError?.message || 'Error de dispositivo');
        setStatus('error');
      });

      await device.register();

      const call = await device.connect({ params: { room } });
      callRef.current = call;

      call.on('accept', () => setStatus('en-llamada'));
      call.on('disconnect', () => {
        setStatus('finalizada');
        callRef.current = null;
        finalizarLlamada(room);
      });
      call.on('error', (err: any) => {
        setErrorMsg(err?.message || 'Error en llamada');
        setStatus('error');
      });
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al conectar');
      setStatus('error');
    }
  }, [finalizarLlamada]);

  useEffect(() => {
    const iniciar = async () => {
      setStatus('solicitando');
      const room = await solicitarLlamada();
      if (room) {
        await conectarTwilio(room);
      }
    };
    iniciar();

    return () => {
      limpiarPolling();
      deviceRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (status === 'ocupado') {
      limpiarPolling();
      pollingRef.current = setInterval(async () => {
        const room = await solicitarLlamada();
        if (room) {
          await conectarTwilio(room);
        }
      }, 3000);
    }
    return () => { if (status !== 'ocupado') limpiarPolling(); };
  }, [status, solicitarLlamada, conectarTwilio, limpiarPolling]);

  useEffect(() => {
    if (status === 'conectando' && roomId) {
      conectarTwilio(roomId);
    }
  }, [status, roomId, conectarTwilio]);

  const colgar = () => {
    callRef.current?.disconnect();
    callRef.current = null;
    setStatus('finalizada');
    if (roomId) finalizarLlamada(roomId);
  };

  const toggleMute = () => {
    if (!callRef.current) return;
    const next = !muted;
    callRef.current.mute(next);
    setMuted(next);
  };

  const reintentar = async () => {
    setStatus('solicitando');
    setErrorMsg('');
    const room = await solicitarLlamada();
    if (room) {
      await conectarTwilio(room);
    }
  };

  const statusConfig: Record<PageStatus, { color: string; text: string }> = {
    cargando:    { color: 'bg-gray-400', text: 'Iniciando...' },
    solicitando: { color: 'bg-gray-400', text: 'Solicitando llamada...' },
    sin_asesor:  { color: 'bg-red-500',  text: 'No hay asesores disponibles' },
    ocupado:     { color: 'bg-yellow-500', text: 'El asesor esta en otra llamada, por favor espere' },
    conectando:  { color: 'bg-yellow-500', text: 'Conectando...' },
    'en-llamada':{ color: 'bg-green-500', text: 'En llamada' },
    finalizada:  { color: 'bg-gray-400', text: 'Llamada finalizada' },
    error:       { color: 'bg-red-500',  text: 'Error' },
  };

  const current = statusConfig[status];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-sm p-8 text-center space-y-6">

        <div>
          <h1 className="text-xl font-bold text-gray-900">Llamada SARA</h1>
          <p className="text-xs text-gray-400 mt-1">DWORKERS - Modulo 5</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className={`w-3 h-3 rounded-full ${current.color} ${(status === 'ocupado' || status === 'conectando' || status === 'solicitando' || status === 'cargando') ? 'animate-pulse' : ''}`} />
          <span className={`text-sm font-semibold ${
            status === 'en-llamada' ? 'text-green-600' :
            status === 'sin_asesor' || status === 'error' ? 'text-red-600' :
            status === 'ocupado' || status === 'conectando' ? 'text-yellow-600' :
            'text-gray-500'
          }`}>
            {current.text}
          </span>
        </div>

        {status === 'error' && errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {(status === 'cargando' || status === 'solicitando' || status === 'conectando') && (
          <div className="flex items-center justify-center py-3">
            <div className="animate-spin h-6 w-6 border-2 border-t-transparent border-blue-500 rounded-full" />
          </div>
        )}

        {status === 'ocupado' && (
          <div className="flex items-center justify-center py-3">
            <div className="animate-spin h-6 w-6 border-2 border-t-transparent border-yellow-500 rounded-full" />
          </div>
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

        {(status === 'sin_asesor' || status === 'error') && (
          <button
            onClick={reintentar}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Reintentar
          </button>
        )}

        {status === 'finalizada' && (
          <p className="text-sm text-gray-500">Llamada finalizada. Gracias.</p>
        )}
      </div>
    </div>
  );
}
