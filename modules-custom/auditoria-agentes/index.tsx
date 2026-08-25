'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from 'recharts';

const BASE = '/api/custom-module25/auditoria-agentes';

// ════════════════════ TIPOS ════════════════════
type Summary = {
  total_conversations?: number;
  audited_count?: number;
  overall_score?: number;
  verdict?: string;
  nivel?: string;
  category_distribution?: Record<string, number>;
  criteria_averages?: Record<string, number>;
  general_analysis?: string;
  top_suggestions?: string[];
};

type Example = {
  conversation_id?: string;
  nivel?: string;
  verdict?: string;
  puntaje_general?: number;
  scores?: Record<string, number>;
  resumen?: string;
  fortalezas?: string[];
  puntos_de_mejora?: { titulo?: string; descripcion?: string; recomendacion?: string; impacto?: string }[];
  sugerencia_prompt?: string;
  key_moment?: string;
  transcript?: string;
};

type Registro = {
  id: number;
  agente_id: string;
  cliente_id_workers: string | null;
  cliente_empresa: string | null;
  agent_display_name: string | null;
  plataforma: string | null;
  audit_start: string;
  audit_end: string;
  summary: Summary | null;
  examples: Example[] | null;
  received_at: string;
};

type TabId = 'analisis' | 'comparativa' | 'config';

const NIVEL_COLORS: Record<string, string> = {
  Excelente: '#10B981', Bueno: '#3B82F6', Aceptable: '#F59E0B',
  Regular: '#F97316', Deficiente: '#EF4444',
  acierto: '#10B981', revisar: '#F59E0B', error: '#EF4444',
};
const DEFAULT_NIVELES = ['Excelente', 'Bueno', 'Aceptable', 'Regular', 'Deficiente'];
const DEFAULT_VERDICTS = ['acierto', 'revisar', 'error'];
const CRITERIAS = ['precision', 'tono', 'resolucion', 'claridad', 'seguimiento'];
const CRITERIA_LABEL: Record<string, string> = {
  precision: 'Precisión', tono: 'Tono', resolucion: 'Resolución',
  claridad: 'Claridad', seguimiento: 'Seguimiento',
};

const tabs: { id: TabId; label: string }[] = [
  { id: 'analisis', label: 'Análisis' },
  { id: 'comparativa', label: 'Comparativa' },
  { id: 'config', label: 'Configuración' },
];

function Spinner() {
  return <div className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function round1(n: unknown) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? Math.round(x * 10) / 10 : 0;
}

// ════════════════════ COMPONENTE PRINCIPAL ════════════════════
export default function AuditoriaAgentesModule() {
  const [tab, setTab] = useState<TabId>('analisis');
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [agentes, setAgentes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgente, setSelectedAgente] = useState<string>('');

  const [config, setConfig] = useState<Record<string, string>>({});
  const [configDirty, setConfigDirty] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/auditoria/`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error al cargar');
      setRegistros(json.registros || []);
      const ags = (json.agentes || []).map((a: any) => a.agente);
      setAgentes(ags);
      if (ags.length > 0) setSelectedAgente((prev) => (prev ? prev : ags[0]));
    } catch (e: any) {
      setError(e.message || 'Error al cargar auditorías');
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`${BASE}/config/`, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) setConfig(json.config || {});
    } catch { /* silencio */ }
  };

  useEffect(() => { loadData(); loadConfig(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const datosAgente = useMemo(() => {
    return registros.filter((r) => !selectedAgente || r.agente_id === selectedAgente);
  }, [registros, selectedAgente]);

  const saveConfig = async () => {
    try {
      const res = await fetch(`${BASE}/config/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (json.ok) { setConfigDirty(false); loadConfig(); }
      else alert(json.error || 'Error al guardar');
    } catch (e: any) { alert(e.message || 'Error'); }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Auditoría Agentes</h2>
          <p className="text-xs text-gray-500">
            Resultados de auditorías automáticas de bots WhatsApp/Instagram generadas por n8n.
          </p>
        </div>
        {agentes.length > 0 && tab !== 'config' && (
          <select
            value={selectedAgente}
            onChange={(e) => setSelectedAgente(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            {agentes.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-8 justify-center">
          <Spinner /> Cargando auditorías…
        </div>
      )}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">⚠️ {error}</div>
      )}

      {!loading && !error && tab === 'analisis' && (
        <AnalisisView registros={datosAgente} agente={selectedAgente} />
      )}
      {!loading && !error && tab === 'comparativa' && (
        <ComparativaView registros={registros} />
      )}
      {!loading && !error && tab === 'config' && (
        <ConfigView config={config} setConfig={setConfig} configDirty={configDirty}
          setConfigDirty={setConfigDirty} onSave={saveConfig} />
      )}
    </div>
  );
}

// ════════════════════ ANÁLISIS POR AGENTE ════════════════════
function AnalisisView({ registros, agente }: { registros: Registro[]; agente: string }) {
  const [openExample, setOpenExample] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const distFrom = (r: Registro) => {
    const d = r.summary?.category_distribution || {};
    return [...DEFAULT_NIVELES, ...DEFAULT_VERDICTS]
      .filter((k) => (d[k] ?? 0) > 0)
      .map((k) => ({ name: k, value: d[k] ?? 0 }));
  };
  const critFrom = (r: Registro) => {
    const crit = r.summary?.criteria_averages || {};
    return CRITERIAS.map((k) => ({ name: CRITERIA_LABEL[k], value: round1(crit[k]) }));
  };

  if (registros.length === 0) {
    return (
      <div className="text-gray-500 text-sm py-8 text-center">
        No hay auditorías para <b>{agente || '…'}</b> todavía. Conecta n8n al endpoint y recibirás resultados aquí.
      </div>
    );
  }

  const sorted = [...registros].sort((a, b) => a.audit_start.localeCompare(b.audit_start));
  const current = selectedIdx != null ? sorted[selectedIdx] : sorted[sorted.length - 1];
  const currentIdx = selectedIdx != null ? selectedIdx : sorted.length - 1;

  const trendData = sorted.map((r) => ({
    periodo: r.audit_start.slice(0, 10),
    score: round1(r.summary?.overall_score),
  }));

  const distData = distFrom(current);
  const critData = critFrom(current);

  return (
    <div className="space-y-4">
      {sorted.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <span>Período:</span>
          {sorted.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setSelectedIdx(i)}
              className={`px-2 py-1 rounded border text-xs ${
                i === currentIdx ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {r.audit_start.slice(0, 10)}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Score general" value={round1(current.summary?.overall_score)} sub={current.summary?.nivel || '—'} />
        <StatCard label="Veredicto" value={current.summary?.verdict || '—'} />
        <StatCard label="Auditadas" value={current.summary?.audited_count ?? 0} sub={`de ${current.summary?.total_conversations ?? 0} totales`} />
        <StatCard label="Plataforma" value={current.plataforma || '—'} sub={current.cliente_empresa || 'Sin cliente'} />
      </div>

      {current.summary?.general_analysis && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
          {current.summary.general_analysis}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Evolución del score</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Distribución de categorías</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {distData.map((entry, i) => (
                    <Cell key={i} fill={NIVEL_COLORS[entry.name] || '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Promedios por criterio</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={critData}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
              <Radar dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {current.summary?.top_suggestions?.length ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Sugerencias accionables</h3>
          <ul className="space-y-2">
            {current.summary.top_suggestions.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-blue-600 shrink-0">•</span>{s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Casos auditados ({current.examples?.length || 0})</h3>
        {!current.examples?.length && <div className="text-sm text-gray-400">Sin casos</div>}
        <div className="space-y-2">
          {(current.examples || []).map((ex, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg">
              <button
                onClick={() => setOpenExample(openExample === i ? null : i)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: NIVEL_COLORS[ex.nivel || ex.verdict || '#9CA3AF'] }} />
                <span className="font-medium text-gray-800">{ex.nivel || ex.verdict}</span>
                <span className="text-gray-500 text-xs">{(ex.puntaje_general ?? '—')} / 10</span>
                <span className="ml-auto text-gray-400">{openExample === i ? '▾' : '▸'}</span>
              </button>
              {openExample === i && (
                <div className="px-3 pb-3 space-y-3">
                  {ex.resumen && <div className="text-sm text-gray-700">{ex.resumen}</div>}
                  {ex.scores && Object.keys(ex.scores).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(ex.scores).map(([k, v]) => (
                        <span key={k} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5">
                          {CRITERIA_LABEL[k] || k}: <b>{v}</b>
                        </span>
                      ))}
                    </div>
                  )}
                  {ex.fortalezas?.length ? (
                    <div>
                      <div className="text-xs font-semibold text-green-700 mb-1">Fortalezas</div>
                      <ul className="text-sm text-gray-700 space-y-0.5">
                        {ex.fortalezas.map((f, j) => <li key={j}>• {f}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  {ex.puntos_de_mejora?.length ? (
                    <div>
                      <div className="text-xs font-semibold text-amber-700 mb-1">Puntos de mejora</div>
                      <ul className="text-sm text-gray-700 space-y-2">
                        {ex.puntos_de_mejora.map((p, j) => (
                          <li key={j} className="bg-white border border-gray-200 rounded p-2">
                            <b>{p.titulo}</b>
                            <div>{p.descripcion}</div>
                            <div className="text-xs text-blue-700 mt-1">→ {p.recomendacion}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {ex.key_moment && (
                    <div className="text-xs italic text-gray-500">“{ex.key_moment}”</div>
                  )}
                  {ex.transcript && (
                    <details className="bg-white border border-gray-200 rounded">
                      <summary className="px-3 py-2 text-xs font-medium text-blue-700 cursor-pointer">Ver transcript</summary>
                      <pre className="px-3 pb-3 text-xs text-gray-600 whitespace-pre-wrap max-h-72 overflow-auto">{ex.transcript}</pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════ COMPARATIVA ════════════════════
function ComparativaView({ registros }: { registros: Registro[] }) {
  if (registros.length === 0) return <div className="text-gray-500 text-sm py-6 text-center">Sin datos</div>;

  const porAgente: Record<string, { score: number; nivel: string; n: number; empresa: string | null; plataforma: string | null; fecha: string }> = {};

  registros.forEach((r) => {
    const a = r.agente_id;
    if (!porAgente[a] || r.audit_start > porAgente[a].fecha) {
      porAgente[a] = {
        score: round1(r.summary?.overall_score),
        nivel: r.summary?.nivel || '—',
        n: 1,
        empresa: r.cliente_empresa,
        plataforma: r.plataforma,
        fecha: r.audit_start,
      };
    } else {
      porAgente[a].n++;
    }
  });

  const masterList = Object.entries(porAgente).map(([k, v]) => ({ name: k, score: v.score }));

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Score promedio por agente</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={masterList}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="score" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(porAgente).map(([ag, v]) => (
          <div key={ag} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="font-semibold text-gray-900">{ag}</div>
            <div className="text-xs text-gray-500 mb-2">{v.empresa || 'Sin cliente'} · {v.plataforma || '—'}</div>
            <div className="text-3xl font-bold text-gray-900">{round1(v.score)}</div>
            <div className="text-xs text-gray-500">{v.n} auditoría(s) · últ. {v.fecha?.slice(0, 10)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════ CONFIGURACIÓN ════════════════════
function ConfigView({ config, setConfig, configDirty, setConfigDirty, onSave }:
  { config: Record<string, string>; setConfig: (c: Record<string, string>) => void; configDirty: boolean; setConfigDirty: (b: boolean) => void; onSave: () => void }) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">API Key del receptor</h3>
        <p className="text-xs text-gray-500">
                  n8n debe enviar esta clave en el header <code className="bg-white border border-gray-200 rounded px-1">X-API-Key</code> (o <code>Authorization: Bearer ...</code>) al llamar <code>POST /api/audit-responses</code>.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={config.api_key || ''}
                    onChange={(e) => { setConfig({ ...config, api_key: e.target.value }); setConfigDirty(true); }}
                    placeholder="Clave secreta (genérala y pégala aquí)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-mono flex-1"
                  />
                  <button
                    onClick={() => setShowKey((v) => !v)}
                    title={showKey ? 'Ocultar clave' : 'Mostrar clave completa'}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 hover:bg-gray-100"
                  >{showKey ? '🙈' : '👁️'}</button>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(config.api_key || ''); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-blue-600 hover:bg-gray-100"
                  >{copied ? '✓ Copiada' : 'Copiar'}</button>
                </div>
        {configDirty && (
          <div className="flex items-center gap-2">
            <button onClick={onSave} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium">Guardar</button>
            <button onClick={() => { setConfigDirty(false); }} className="text-gray-500 text-sm">Descartar</button>
          </div>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Endpoint para n8n</h3>
        <div className="text-sm space-y-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded p-2 justify-between">
            <code className="text-xs">POST /api/audit-responses</code>
            <button
              onClick={() => navigator.clipboard?.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/audit-responses`)}
              className="text-xs text-blue-600 hover:underline"
            >Copiar URL</button>
          </div>
          <div className="text-xs text-gray-500">Headers: <code>Content-Type: application/json</code> + <code>X-API-Key: &lt;tu clave&gt;</code></div>
          <div className="text-xs text-gray-500">Body: un objeto por agente con <code>agente_id</code>, <code>audit_period.start/end</code>, <code>summary</code> y <code>examples</code>.</div>
        </div>
      </div>
    </div>
  );
}