'use client';

import { useState, useEffect } from 'react';

interface Row {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string;
  tipo: string;
  form_variant?: string | null;
  processing_status: string;
  current_step: string | null;
  error_message: string | null;
  salesforce_opportunity_id: string | null;
  received_at: string;
  completed_at: string | null;
  payload_raw?: Record<string, string> | string | null;
}

interface Stats {
  total: number;
  completados: number;
  errores: number;
  en_proceso: number;
}

const BASE = '/api/custom-module6/suvi-opportunity';
const WEBHOOK_BASE = typeof window !== 'undefined' ? `${window.location.origin}/api/module-webhooks/6` : 'https://workers.zeroazul.com/api/module-webhooks/6';

const STATUS_LABELS: Record<string, string> = {
  recibido: '1/2 Recibido',
  creando_cuenta: '2/2 Enviando...',
  creando_oportunidad: '2/2 Enviando...',
  completado: '2/2 Enviado',
  error: 'Error',
};

export default function SuviOpportunityModule({ moduleData }: { moduleData?: { title?: string } }) {
  const [data, setData] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ tipo: '', status: '' });
  const [config, setConfig] = useState<Record<string, string | null>>({});
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reenviandoId, setReenviandoId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'oportunidades' | 'documentacion'>('oportunidades');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.tipo) params.set('tipo', filters.tipo);
      if (filters.status) params.set('status', filters.status);
      const res = await fetch(`${BASE}?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setData(json.data || []);
        setStats(json.stats || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`${BASE}/config`);
      const json = await res.json();
      if (json.ok) setConfig(json.config || {});
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, [filters.tipo, filters.status]);
  useEffect(() => { loadConfig(); }, []);

  const getVariacion = (row: Row): string => {
    if (row.form_variant) return row.form_variant;
    const payload = row.payload_raw;
    if (payload == null || typeof payload === 'string') return '-';
    const keys = Object.keys(payload);
    if (keys.some((k) => k.startsWith('fields[') && k.endsWith('][value]'))) return 'Formulario proyecto';
    return '-';
  };

  const copyUrl = (url: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(url);
  };

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`${BASE}/${id}`);
      const json = await res.json();
      if (json.ok) setDetailData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetailData(null);
  };

  const reenviar = async (id: number) => {
    setReenviandoId(id);
    try {
      const res = await fetch(`${BASE}/reenviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.ok) {
        await load();
        if (detailId === id) await openDetail(id);
      } else {
        alert(json.error || 'Error al reenviar');
      }
    } catch (e) {
      alert('Error al reenviar');
    } finally {
      setReenviandoId(null);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'oportunidades' as const, label: 'Oportunidades' },
          { id: 'documentacion' as const, label: 'Documentación' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'oportunidades' && (
        <>
          {stats && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex flex-wrap items-center gap-6">
                <div><span className="text-sm text-gray-500">Total</span><span className="ml-2 font-bold text-gray-900">{stats.total}</span></div>
                <div><span className="text-sm text-gray-500">Enviados</span><span className="ml-2 font-bold text-green-600">{stats.completados}</span></div>
                <div><span className="text-sm text-gray-500">Errores</span><span className="ml-2 font-bold text-red-600">{stats.errores}</span></div>
                <div><span className="text-sm text-gray-500">En proceso</span><span className="ml-2 font-bold text-amber-600">{stats.en_proceso}</span></div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex flex-wrap gap-2">
              <select
                value={filters.tipo}
                onChange={(e) => setFilters((f) => ({ ...f, tipo: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">Todos los tipos</option>
                <option value="ventas">Ventas</option>
                <option value="credito">Crédito</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="recibido">Recibido</option>
                <option value="creando_cuenta">Creando cuenta</option>
                <option value="creando_oportunidad">Creando oportunidad</option>
                <option value="completado">Completado</option>
                <option value="error">Error</option>
              </select>
              <button type="button" onClick={() => load()} className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700">Actualizar</button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-12 w-12 border-4 border-t-transparent rounded-full" style={{ borderColor: '#5DE1E5' }} />
              </div>
            ) : data.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No hay registros</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variación</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cuenta SF</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recibido</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition">
                        <td className="px-2 py-2 text-xs font-mono text-gray-900">{r.id}</td>
                        <td className="px-2 py-2 text-xs text-gray-700">{r.email}</td>
                        <td className="px-2 py-2 text-xs text-gray-700">{r.nombre} {r.apellido}</td>
                        <td className="px-2 py-2 text-xs">{r.tipo}</td>
                        <td className="px-2 py-2 text-xs">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.processing_status === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {STATUS_LABELS[r.processing_status] ?? r.processing_status}
                          </span>
                          {r.error_message && <span className="block text-xs text-red-500 truncate max-w-[180px]" title={r.error_message}>{r.error_message}</span>}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-600">{getVariacion(r)}</td>
                        <td className="px-2 py-2 text-xs text-gray-900">{r.salesforce_opportunity_id || '-'}</td>
                        <td className="px-2 py-2 text-xs text-gray-500">{r.received_at ? formatDate(r.received_at) : '-'}</td>
                        <td className="px-2 py-2 text-xs">
                          <button type="button" onClick={() => openDetail(r.id)} className="text-[#5DE1E5] hover:opacity-80 font-medium mr-2">
                            Ver detalle
                          </button>
                          <button
                            type="button"
                            onClick={() => reenviar(r.id)}
                            disabled={reenviandoId === r.id}
                            className="text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50"
                          >
                            {reenviandoId === r.id ? 'Enviando...' : 'Reenviar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'documentacion' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Sincronizador Forms Web SUVI (Módulo 6)</h2>
            <p className="text-sm text-gray-500">
              Recibe envíos por webhook (ventas o crédito), guarda en BD y permite variantes de formularios. Sin IA ni Meta. Variantes: Formulario proyecto (form[id]=b08bdc3), Interes crédito (form[id]=c197850). Misma estructura fields[Campo][value].
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Flujo de procesamiento</p>
            <div className="space-y-3">
              {[
                { paso: '01', titulo: 'Lead recibido', desc: 'POST al webhook /ventas o /credito. Se guarda el registro en modulos_suvi_6_opportunities con payload_raw y estado recibido. El tipo (ventas o crédito) viene del webhook usado.' },
                { paso: '02', titulo: 'Organizar datos', desc: 'Se detecta la variante del formulario por form[id] y se extraen los campos del payload.\n\nVariantes registradas:\n• Formulario proyecto (form[id]=b08bdc3) — OK\n• Interes crédito (form[id]=c197850) — OK\n• Landing Crédito (form[id]=ecbe21e) — OK\n\nCampos: Formulario proyecto/Interes crédito usan FirstName, LastName, Email, MobilePhone, Pais_de_Residencia__c, Ciudad_de_Residencia__c, Proyecto.\nLanding Crédito usa name, field_78cc91b (apellido), email, message (teléfono), field_a27c238 (país). País sin prefijo se normaliza (ej. Colombia → Colombia(+57)).' },
                { paso: '03', titulo: 'Cuenta en Salesforce', desc: 'Resolución inteligente: se buscan cuentas por email (Correo_Electr_nico__c) Y por teléfono (Phone). Si hay candidatos, se prioriza:\n1. La que tenga oportunidades asociadas.\n2. Si empatan, la más antigua (CreatedDate).\n3. Si empatan, email pesa más que teléfono.\nSe actualiza la cuenta ganadora con los datos nuevos (Name, Phone, Prefijo, Ciudad). Si no hay candidatos, se crea por UPSERT con email como External ID.' },
                { paso: '04', titulo: 'Proyecto', desc: 'Si el payload trae un ID de Proyecto__c (ej. a04QU00000C6uyHYAR) se valida contra valid_project_ids y se usa directamente. Si trae un nombre, se busca por Name en SF. Si no hay match o viene vacío, fallback: se elige un Id al azar de valid_project_ids.' },
                { paso: '05', titulo: 'Buscar oportunidad previa', desc: 'Se consulta en Salesforce si la cuenta (AccountId) ya tiene una Opportunity del mismo RecordType (ventas o crédito). Si existe, se reutiliza el OwnerId (asesor) de esa oportunidad para la nueva.' },
                { paso: '06', titulo: 'Asesor (ruleta)', desc: 'Solo si no se encontró oportunidad previa en el paso 05. Según tipo se usa el GroupId configurado y se elige un asesor al azar de los GroupMember.' },
                { paso: '07', titulo: 'Oportunidad en Salesforce', desc: 'Se crea la Opportunity con AccountId, OwnerId (asesor del paso 05 o 06), Proyecto__c, RecordTypeId (ventas=0124W000000OiIrQAK o crédito=0124W000000OiImQAK), StageName=Nuevo, LeadSource=Módulo 6.' },
              ].map(({ paso, titulo, desc }) => (
                <div key={paso} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">{paso}</span>
                  </div>
                  <div className="flex-1 pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-sm font-semibold text-gray-800">{titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{desc}</p>
                  </div>
                </div>
              ))}
              <div className="mt-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Asesores Ventas (Grupo 00G4W000006rHIN) — 7</p>
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full text-xs">
                    <thead><tr className="bg-gray-100"><th className="px-3 py-1 text-left text-gray-500">Nombre</th><th className="px-3 py-1 text-left text-gray-500">Email</th><th className="px-3 py-1 text-left text-gray-500">ID</th></tr></thead>
                    <tbody>
                      {[
                        ['Paola Fernandez','paola.fernandez@suviviendainternacional.com','0054W00000Cq7TjQAJ'],
                        ['Eliana Guzman','eliana.guzman@suviviendainternacional.com','0054W00000Cq7TlQAJ'],
                        ['Nancy Ortiz','nancy.ortiz@suviviendainternacional.com','0054W00000Cq7URQAZ'],
                        ['Marcela Ospina','marcela.ospina@suviviendainternacional.com','0054W00000Cq7UWQAZ'],
                        ['Angélica Montaño','angelica.montano@suviviendainternacional.com','0054W00000Cq7UqQAJ'],
                        ['Jaime Ocampo','jaime.ocampo@suviviendainternacional.com','005QU000007MSo1YAG'],
                        ['Johana Torres','johana.torres@suviviendainternacional.com','005QU00000O7FEDYA3'],
                      ].map(([n,e,id]) => <tr key={id} className="border-t border-gray-100"><td className="px-3 py-1">{n}</td><td className="px-3 py-1 text-gray-500">{e}</td><td className="px-3 py-1 font-mono text-gray-400">{id}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Asesores Crédito (Grupo 00G4W000006rHII) — 10</p>
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full text-xs">
                    <thead><tr className="bg-gray-100"><th className="px-3 py-1 text-left text-gray-500">Nombre</th><th className="px-3 py-1 text-left text-gray-500">Email</th><th className="px-3 py-1 text-left text-gray-500">ID</th></tr></thead>
                    <tbody>
                      {[
                        ['Wendy Jaramillo','wendy.jaramillo@suviviendainternacional.com','0054W00000CpnenQAB'],
                        ['Sara Durango','sara.durango@suviviendainternacional.com','005QU000006SOK7YAO'],
                        ['Melisa Mona','melisa.mona@suviviendainternacional.com','005QU00000NOuztYAD'],
                        ['Jonathan Alfonso','jonathan.jimenez@suviviendainternacional.com','005QU00000OX23dYAD'],
                        ['Juan Florez','juan.florez@suviviendainternacional.com','0054W00000FweRfQAJ'],
                        ['Paola Fernandez','paola.fernandez@suviviendainternacional.com','0054W00000Cq7TjQAJ'],
                        ['Ximena García','ximena.garcia@suviviendainternacional.com','0054W00000F5js1QAB'],
                        ['Paula Trochez','paula.trochez@suviviendainternacional.com','0054W00000FRkyHQAT'],
                        ['Alexandra Ramirez','alexandra.ramirez@suviviendainternacional.com','0054W00000Cq7UvQAJ'],
                        ['Vanessa Camacho','vanessa.camacho@suviviendainternacional.com','005QU00000WJkSvYAL'],
                      ].map(([n,e,id]) => <tr key={id} className="border-t border-gray-100"><td className="px-3 py-1">{n}</td><td className="px-3 py-1 text-gray-500">{e}</td><td className="px-3 py-1 font-mono text-gray-400">{id}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Webhooks</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-4 overflow-x-auto font-mono whitespace-pre">
{`POST ${WEBHOOK_BASE}/ventas    Body: JSON o form-urlencoded. Se captura todo.
POST ${WEBHOOK_BASE}/credito   Body: JSON o form-urlencoded. Se captura todo.

Sin headers ni validación de origen. Variante form Salesforce: se extraen
fields[FirstName][value], fields[LastName][value], fields[Email][value],
fields[MobilePhone][value], fields[Pais_de_Residencia__c][value],
fields[Ciudad_de_Residencia__c][value], fields[Proyecto][value].`}
            </pre>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Rutas del módulo</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-4 overflow-x-auto font-mono whitespace-pre">
{`GET  ${BASE}                    Listado (query: page, limit, tipo, status, search)
GET  ${BASE}/[id]               Detalle de un registro
GET  ${BASE}/config             Config (webhook_secret enmascarado)
PUT  ${BASE}/config             Actualizar config
POST ${BASE}/reenviar           Body: { "id": number } — reprocesar registro`}
            </pre>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tablas</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-4 overflow-x-auto font-mono whitespace-pre">
{`modulos_suvi_6_opportunities   Registros (email, nombre, apellido, telefono, tipo, payload_raw, processing_status, etc.)
modulos_suvi_6_config           Config (webhook_secret, salesforce_group_id_ventas/credito, record_type_*, valid_project_ids)`}
            </pre>
          </div>
        </div>
      )}

      {/* Modal de detalle (misma estructura que módulo 1) */}
      {detailId != null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#5DE1E5] text-gray-900 p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Detalle del lead</h2>
                  <p className="text-gray-700 font-mono text-sm">#{detailId}</p>
                </div>
                <div className="flex items-center gap-2">
                  {detailId != null && (
                    <button
                      type="button"
                      onClick={() => reenviar(detailId)}
                      disabled={reenviandoId === detailId}
                      className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                      {reenviandoId === detailId ? 'Enviando...' : 'Reenviar'}
                    </button>
                  )}
                  <button
                    onClick={closeDetail}
                    className="text-gray-700 hover:bg-gray-900 hover:bg-opacity-10 p-2 rounded-lg transition"
                  >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {detailLoading ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-gray-500">Cargando...</p>
                </div>
              ) : detailData ? (
                <>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Estado actual</h3>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        detailData.processing_status === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {STATUS_LABELS[detailData.processing_status] ?? detailData.processing_status}
                      </span>
                      {detailData.current_step && (
                        <span className="text-gray-600 text-sm">{detailData.current_step}</span>
                      )}
                    </div>
                    {detailData.error_message && detailData.processing_status === 'error' && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-800 text-sm font-medium">{detailData.error_message}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Progreso del lead</h3>
                    <div className="space-y-4">
                      {[
                        { n: 1, title: 'Lead recibido', done: true, date: detailData.received_at, detail: `ID: ${detailData.id}, Tipo: ${detailData.tipo}`, desc: 'Lead recibido por webhook (formulario web)' },
                        { n: 2, title: 'Organizar datos', done: true, detail: detailData.form_variant ? `Variante ${detailData.form_variant} → campos extraídos` : 'Campos extraídos del payload', desc: 'Nombre, apellido, email, teléfono, país, ciudad, proyecto' },
                        { n: 3, title: 'Cuenta en Salesforce', done: !!detailData.salesforce_account_id, detail: detailData.salesforce_account_id || null, desc: 'Resolución por email + teléfono → prioriza con oportunidades' },
                        { n: 4, title: 'Proyecto asignado', done: !!detailData.proyecto_id, detail: detailData.proyecto_id || null, desc: 'Por ID directo o fallback valid_project_ids' },
                        { n: 5, title: 'Buscar oportunidad previa', done: !!detailData.salesforce_owner_id, detail: detailData.salesforce_owner_id ? `Asesor: ${detailData.salesforce_owner_id}` : null, desc: 'Si la cuenta ya tiene Opportunity del mismo tipo → reutiliza asesor' },
                        { n: 6, title: 'Asesor (ruleta)', done: !!detailData.salesforce_owner_id, detail: !detailData.salesforce_owner_id ? null : detailData.salesforce_owner_id, desc: 'Solo si no hay oportunidad previa: ruleta aleatoria del grupo' },
                        { n: 7, title: 'Oportunidad creada', done: !!detailData.salesforce_opportunity_id, detail: detailData.salesforce_opportunity_id || null, desc: 'RecordType según webhook (ventas/crédito)' },
                      ].map((step, idx) => {
                        const isError = detailData.processing_status === 'error' && !step.done && (step.n >= 3);
                        const circleClass = step.done ? 'bg-green-100 border-green-500' : isError ? 'bg-red-100 border-red-500' : 'bg-gray-100 border-gray-300';
                        return (
                          <div key={step.n} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${circleClass}`}>
                                {step.done ? (
                                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <span className={`text-sm font-bold ${isError ? 'text-red-600' : 'text-gray-500'}`}>{step.n}</span>
                                )}
                              </div>
                              {idx < 6 && <div className="w-0.5 h-6 bg-gray-300 mt-1" />}
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900">{step.n}. {step.title}</h4>
                                {step.date && <span className="text-xs text-gray-500">{formatDate(step.date)}</span>}
                                {step.done && !step.date && <span className="text-xs text-gray-500">Completado</span>}
                              </div>
                              <p className="text-sm text-gray-600 mt-0.5">{step.desc}</p>
                              {step.detail && <div className="text-xs text-gray-500 mt-1 font-mono">{step.detail}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Datos del lead</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Variación</span><span>{detailData.form_variant ?? '-'}</span></div>
                      <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Nombre</span><span className="font-medium">{detailData.nombre} {detailData.apellido}</span></div>
                      <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Email</span><span>{detailData.email}</span></div>
                      <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Teléfono</span><span>{detailData.telefono}</span></div>
                      <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">País</span><span>{detailData.pais ?? '-'}</span></div>
                      <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Ciudad</span><span>{detailData.ciudad ?? '-'}</span></div>
                      <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Proyecto</span><span>{detailData.nombre_proyecto ?? '-'}</span></div>
                    </div>
                  </div>

                  {detailData.payload_raw != null && Object.keys(detailData.payload_raw).length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Payload recibido</h4>
                      <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg p-4 overflow-x-auto overflow-y-auto max-h-80 font-mono whitespace-pre">
                        <code>{JSON.stringify(detailData.payload_raw, null, 2)}</code>
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-gray-500">No se pudo cargar el detalle.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
