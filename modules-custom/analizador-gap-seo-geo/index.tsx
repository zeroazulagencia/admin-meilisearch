'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// ─── TYPES ───

type TabId = 'analizador' | 'configuracion' | 'documentacion';

interface ModuleData {
  id: number;
  title: string;
  folder_name: string;
  description?: string | null;
  agent_name?: string;
  agent_id?: number;
}

interface CompetitorEntry {
  id: string;
  url: string;
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'analizador', label: 'Analizador' },
  { id: 'configuracion', label: 'Configuración' },
  { id: 'documentacion', label: 'Documentación' },
];

const CONFIG_API = '/api/custom-module28/analizador-gap-seo-geo/config';

function formatCompetitorUrl(url: string): string {
  let u = url.trim();
  if (!u) return '';
  if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
  return u;
}

interface TestResult {
  status: 'idle' | 'testing' | 'ok' | 'error';
  statusCode?: number;
  ms?: number;
  error?: string;
}

type GapClassification = 'fortaleza' | 'brecha_competitiva' | 'oportunidad_mejora' | 'sin_presencia_detectada' | 'descartada_validar';
type Priority = 'alta' | 'media' | 'baja';

interface ClassifiedGapItem {
  keyword: string;
  searchVolume: number | null;
  clientRank: number | null;
  competitorRank: number | null;
  competitorName: string;
  classification: GapClassification;
  brandType: string;
  relevance: string;
  priority: Priority;
  priorityReason: string;
  suggestedAction: string;
}

interface DomainMetrics {
  domain: string;
  organicKeywords: number | null;
  totalBacklinks: number | null;
  referringDomains: number | null;
  estimatedMonthlyTraffic: number | null;
  domainAuthority: number | null;
}

interface DomainKeywordItem {
  keyword: string;
  searchVolume: number | null;
  rankAbsolute: number | null;
  estimatedTraffic: number | null;
}

interface Finding {
  title: string;
  description: string;
  evidence: string;
}

interface PrioritizedAction {
  action: string;
  affectedPage: string | null;
  keywords: string[];
  evidence: string;
  businessBenefit: string;
  priority: Priority;
  priorityReason: string;
  trackingIndicator: string;
}

interface GeoStatus {
  status: 'sin_integracion';
  note: string;
  suggestedQueries: string[];
}

interface AiQueryResult {
  model: string;
  modelName: string;
  mentionsClient: boolean;
  snippet: string;
  status: 'ok' | 'error';
  error?: string;
}

interface AiPresenceResult {
  lastEvaluated: string;
  clientDomain: string;
  queries: {
    query: string;
    models: AiQueryResult[];
  }[];
  summary: {
    totalQueries: number;
    totalMentions: number;
    modelsEvaluated: number;
    modelsOk: number;
    modelsErrored: number;
    score: number;
  };
}

/** Asociación del cron automático al módulo (modulos_luis_28_config.ai_presence_cron) */
interface AiCronAssociation {
  enabled: boolean;
  every_days: number;
  schedule: string;
  schedule_human?: string;
  job_id: string;
  last_run_at?: string;
  last_score?: number;
  last_mentions?: number;
  last_models_ok?: number;
  next_run_at?: string;
}

interface AnalysisReport {
  executiveDiagnosis: string;
  findings: Finding[];
  prioritizedActions: PrioritizedAction[];
  gapCategories: {
    fortalezas: ClassifiedGapItem[];
    brechasCompetitivas: ClassifiedGapItem[];
    oportunidadesMejora: ClassifiedGapItem[];
    sinPresencia: ClassifiedGapItem[];
    descartadasValidar: ClassifiedGapItem[];
  };
  geo: GeoStatus;
  competitiveSummary: string;
  dataQualityNotes: string[];
}

interface AnalyzeResult {
  client: DomainMetrics;
  competitors: DomainMetrics[];
  gapItems: ClassifiedGapItem[];
  clientKeywords: DomainKeywordItem[];
  competitorKeywords?: { domain: string; keyword: string; searchVolume: number | null; rankAbsolute: number | null }[];
  visibilityGaps?: { competitor: string; keyword: string; rank: number | null; volume: number | null }[];
  competitorOverlap?: { domain: string; ranked: number; shared: number; absent: number; brandOmitted: number; offTopic?: number }[];
  totalCost: number;
  analyzedAt: string;
  report: AnalysisReport;
}

const ANALYZE_API = '/api/custom-module28/analizador-gap-seo-geo/analyze';
const DOMAIN_COUNTRY = 'Colombia';

// ─── HELPERS ───

const fmtNumES = (n: number | null | undefined) => {
  if (n == null) return 'Sin datos';
  return new Intl.NumberFormat('es-CO').format(Math.round(n));
};

const fmtDateShort = (iso: string) => {
  try {
    const d = new Date(iso);
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return iso; }
};

const cleanDomain = (url: string) =>
  url.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '');

// ─── SKELETON (carga inicial) ───

function SkeletonBar() {
  return <div className="h-3 bg-gray-200 rounded animate-pulse" />;
}

// ─── BARRA HORIZONTAL COMPARATIVA ───

function TrafficBarChart({
  data,
  clientDomain,
}: {
  data: { domain: string; traffic: number | null; isClient: boolean }[];
  clientDomain: string;
}) {
  const maxTraffic = Math.max(...data.map((d) => d.traffic ?? 0), 1);
  // Ordenar de mayor a menor
  const sorted = [...data].sort((a, b) => (b.traffic ?? 0) - (a.traffic ?? 0));

  return (
    <div className="space-y-3" role="img" aria-label="Comparación de visitas estimadas al mes entre competidores">
      {sorted.map((item) => {
        const pct = maxTraffic > 0 ? ((item.traffic ?? 0) / maxTraffic) * 100 : 0;
        const label = cleanDomain(item.domain);
        return (
          <div key={item.domain} className="flex items-center gap-3 group">
            <span className={`w-[110px] text-sm shrink-0 truncate ${
              item.isClient ? 'font-semibold text-[#172033]' : 'text-[#64748B]'
            }`} title={item.domain}>
              {label}{item.isClient ? '  · Tu sitio' : ''}
            </span>
            <div className="flex-1 h-4 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.isClient ? 'bg-[#2563EB]' : 'bg-[#94A3B8]'
                }`}
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
            <span className="w-[80px] text-right text-sm font-mono text-[#64748B] shrink-0">
              {item.traffic != null ? fmtNumES(item.traffic) : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── BARRA SEGMENTADA (indicador de fortalezas) ───

function SegmentBar({ green, red, gray }: { green: number; red: number; gray: number }) {
  const total = green + red + gray || 1;
  return (
    <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden flex" role="img" aria-label={`${green} lideras, ${red} pierdes, ${gray} descartadas`}>
      {green > 0 && <div className="h-full bg-[#10B981] rounded-l-full" style={{ width: `${(green / total) * 100}%` }} />}
      {red > 0 && <div className="h-full bg-[#EF4444]" style={{ width: `${(red / total) * 100}%` }} />}
      {gray > 0 && <div className="h-full bg-[#CBD5E1]" style={{ width: `${(gray / total) * 100}%` }} />}
    </div>
  );
}

// ─── INDICADOR PRINCIPAL ───

function IndicatorCard({
  title,
  value,
  subtitle,
  children,
  tooltip,
}: {
  title: string;
  value: string;
  subtitle: string;
  children?: React.ReactNode;
  tooltip?: string;
}) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 relative">
      <div className="flex items-start justify-between mb-1">
        <span className="text-xs font-medium text-[#64748B] uppercase tracking-wide">{title}</span>
        {tooltip && (
          <>
            <button
              type="button"
              className="w-4 h-4 rounded-full bg-[#E2E8F0] text-[#64748B] text-[10px] font-bold leading-none flex items-center justify-center hover:bg-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
              onFocus={() => setShowTip(true)}
              onBlur={() => setShowTip(false)}
              aria-label={tooltip}
            >?</button>
            {showTip && (
              <div className="absolute top-2 right-10 z-10 bg-[#172033] text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 max-w-[220px] shadow-lg" role="tooltip">
                {tooltip}
              </div>
            )}
          </>
        )}
      </div>
      <div className="text-[36px] font-bold text-[#172033] leading-tight mb-0.5 tracking-tight">{value}</div>
      <div className="text-sm text-[#64748B]">{subtitle}</div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

// ─── ACCIÓN ───

function ActionCard({
  number,
  title,
  description,
  tag,
  tagColor,
  onClick,
}: {
  number: string;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
  onClick?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const handleClick = () => {
    if (onClick) { onClick(); return; }
    setOpen((p) => !p);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
      <button
        type="button"
        onClick={handleClick}
        className="w-full text-left p-6 hover:bg-[#F8FAFC] transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#2563EB]"
        aria-expanded={onClick ? undefined : open}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="text-[11px] font-bold text-[#94A3B8] tracking-wide">{number}</span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${tagColor}`}>{tag}</span>
        </div>
        <h4 className="text-base font-semibold text-[#172033] mb-1">{title}</h4>
        <p className="text-sm text-[#64748B]">{description}</p>
      </button>
    </div>
  );
}

// ─── PANEL LATERAL DE DETALLE ───

function DetailPanel({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      // Focus trap básico — enfocar el botón de cerrar
      const btn = document.getElementById('panel-close-btn');
      btn?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} aria-hidden="true" />
      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-xl animate-slide-in">
        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-[#172033]">{title}</h3>
          <button
            id="panel-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            aria-label="Cerrar panel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18" /><path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ─── EXTRACTOR DE DATOS ───

interface DashboardData {
  clientDomain: string;
  analyzedAt: string;
  clientTraffic: number | null;
  competitors: DomainMetrics[];
  fortalezasCount: number;
  descartadasCount: number;
  brechasCount: number;
  totalGap: number;
  scorecard: {
    domain: string;
    lead: number;
    lose: number;
    loseBrand: number;
    total: number;
    leadUnbranded: number;
    sharedUnbranded: number;
  }[];
  topKeywords: { keyword: string; rank: number | null; volume: number | null }[];
  allGapItems: ClassifiedGapItem[];
  rivalAbove: {
    keyword: string;
    competitor: string;
    clientRank: number | null;
    competitorRank: number | null;
    volume: number | null;
  }[];
  brandedOmitted: { keyword: string; competitor: string }[];
  /** Visitas estimadas por dominio (el cliente y cada competidor) para comparar. */
  trafficRivals: { domain: string; traffic: number | null; isClient: boolean }[];
  /** Búsquedas donde un competidor aparece en Google y el cliente no está en el top 100. */
  visibilityGaps: { competitor: string; keyword: string; rank: number | null; volume: number | null }[];
  /** Cobertura por competidor: keywords orgánicas, búsquedas compartidas, etc. */
  competitorOverlap: { domain: string; ranked: number; shared: number; absent: number; brandOmitted: number; offTopic: number }[];
  actions: {
    primary: { title: string; description: string; tag: string; tagColor: string; detail: string; data: string; pages?: string; goal?: string; verify?: string }[];
    finding: { primary: string; secondary: string };
  };
  competitiveSummary: string | null;
  dataQualityNotes: string[];
  geoNote: string | null;
  geoSuggestions: string[];
}

function extractDashboardData(result: AnalyzeResult): DashboardData {
  const client = result.client;
  const comps = result.competitors;
  const report = result.report;
  const gap = report?.gapCategories || { fortalezas: [], brechasCompetitivas: [], oportunidadesMejora: [], sinPresencia: [], descartadasValidar: [] };

  const clientDomain = cleanDomain(client.domain);

  // Top keywords del cliente rank > 0, ordenadas por posicion y luego por volumen
  const topKw = (result.clientKeywords || [])
    .filter((k) => k.rankAbsolute != null && k.rankAbsolute > 0)
    .sort((a, b) => (a.rankAbsolute ?? 999) - (b.rankAbsolute ?? 999) || (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
    .slice(0, 5)
    .map((k) => ({ keyword: k.keyword, rank: k.rankAbsolute, volume: k.searchVolume }));

  // Si no hay suficientes, usar gapItems (fortalezas mejor rankeadas)
  const topFromGap = topKw.length < 3
    ? (gap.fortalezas || [])
        .filter((i) => i.clientRank != null && i.clientRank > 0 && i.brandType !== 'marca_competidora')
        .sort((a, b) => (a.clientRank ?? 999) - (b.clientRank ?? 999))
        .slice(0, 5 - topKw.length)
        .map((i) => ({ keyword: i.keyword, rank: i.clientRank, volume: i.searchVolume }))
    : [];

  const topSearches = [...topKw, ...topFromGap].slice(0, 5);

  // Hallazgo principal
  let findingPrimary = '';
  let findingSecondary = '';

  const maxComp = comps.reduce((best, c) => {
    const ct = c.estimatedMonthlyTraffic ?? 0;
    const bt = best.estimatedMonthlyTraffic ?? 0;
    return ct > bt ? c : best;
  }, comps[0]);

  const clientT = client.estimatedMonthlyTraffic ?? 0;
  const maxT = maxComp?.estimatedMonthlyTraffic ?? 0;

  if (clientT > 0 && maxT > 0 && maxComp) {
    const ratio = maxT / clientT;
    if (ratio >= 1.5) {
      findingPrimary = `${cleanDomain(maxComp.domain)} te supera en visitas desde Google: ${fmtNumES(maxT)} vs ${fmtNumES(clientT)} al mes.`;
      findingSecondary = 'Prioriza las búsquedas donde aparece y tú no.';
    } else if (clientT > maxT) {
      findingPrimary = `Lideras en visitas desde Google: ${fmtNumES(clientT)} vs ${fmtNumES(maxT)} de ${cleanDomain(maxComp.domain)}.`;
      findingSecondary = 'Mantén tus posiciones y amplía a búsquedas relacionadas.';
    } else {
      findingPrimary = `Empate en visitas desde Google con ${cleanDomain(maxComp.domain)}: ${fmtNumES(clientT)} vs ${fmtNumES(maxT)}.`;
      findingSecondary = 'Revisa las búsquedas donde ellos te superan.';
    }
  } else if (clientT === 0 && clientT !== null) {
    findingPrimary = 'Las visitas estimadas desde Google son muy bajas o no detectadas.';
    findingSecondary = 'Revisa la configuración del sitio y las búsquedas donde tienes presencia para identificar oportunidades de mejora.';
  } else {
    findingPrimary = 'No hay datos suficientes de tráfico para generar una comparación.';
    findingSecondary = 'Verifica que las URLs estén correctamente configuradas y que el sitio tenga datos de posicionamiento disponibles.';
  }

  // Si hay diagnosis ejecutiva, usarla como secundario
  if (report?.executiveDiagnosis) {
    findingSecondary = report.executiveDiagnosis;
  }

  // Acciones
  const actions: DashboardData['actions']['primary'] = [];
  const raActions = report?.prioritizedActions || [];

  if (raActions.length >= 1) {
    raActions.slice(0, 3).forEach((a) => {
      const tag = a.priority === 'alta' ? 'Prioritario' : a.priority === 'media' ? 'Recomendado' : 'Opcional';
      const tagColor = a.priority === 'alta'
        ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
        : a.priority === 'media'
          ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
          : 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]';
      actions.push({
        title: a.action,
        description: a.evidence.slice(0, 120) + (a.evidence.length > 120 ? '…' : ''),
        tag,
        tagColor,
        detail: a.action,
        data: a.evidence,
        pages: a.affectedPage || undefined,
        goal: a.businessBenefit,
        verify: a.trackingIndicator,
      });
    });
  }

  // Si faltan acciones del backend, generar a partir de datos
  if (actions.length === 0) {
    const fortalezas = gap.fortalezas || [];
    const brechas = gap.brechasCompetitivas || [];
    const sinPresencia = gap.sinPresencia || [];

    // Acción 1: explorar tráfico del competidor más fuerte
    if (maxComp && maxT > clientT && maxT > 0) {
      actions.push({
        title: `Explorar el tráfico de ${cleanDomain(maxComp.domain)}`,
        description: `Identificar las búsquedas fuera de tu marca que generan su volumen estimado de ${fmtNumES(maxT)} visitas al mes.`,
        tag: 'Investigar',
        tagColor: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]',
        detail: `Comparar las búsquedas donde ${cleanDomain(maxComp.domain)} aparece posicionado y tú no, para identificar oportunidades de contenido.`,
        data: `${cleanDomain(maxComp.domain)}: ${fmtNumES(maxT)} visitas estimadas, ${fmtNumES(maxComp.organicKeywords)} keywords orgánicas.`,
        goal: 'Identificar brechas de contenido y capturar tráfico nuevo.',
        verify: 'Monitorear la aparición de nuevas keywords en tu perfil orgánico.',
      });
    }

    // Acción 2: páginas mejor posicionadas
    const topPages = topSearches.slice(0, 3).filter((s) => s.keyword);
    if (topPages.length > 0) {
      const kwList = topPages.map((s) => s.keyword).join(', ');
      actions.push({
        title: `Revisar páginas para "${topPages[0].keyword}"`,
        description: `Comprobar fichas, precios e información de contacto en las búsquedas donde mejor te posicionas.`,
        tag: 'Mantener ventaja',
        tagColor: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
        detail: `Verificar que las páginas posicionadas para las búsquedas ${kwList} tengan información actualizada y completa.`,
        data: `Palabras clave: ${kwList}`,
        pages: topPages.map((s) => s.keyword).join(' | '),
        goal: 'Mantener y consolidar las primeras posiciones actuales.',
        verify: 'Revisar posición cada 15 días en las búsquedas listadas.',
      });
    }

    // Acción 3: GEO / IA
    actions.push({
      title: 'Evaluar presencia en IA',
      description: 'Comprobar si tu marca aparece en respuestas de asistentes de inteligencia artificial.',
      tag: 'Pendiente',
      tagColor: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
      detail: 'Realizar consultas manuales en ChatGPT, Gemini y Claude usando las búsquedas sugeridas para verificar si el sitio es mencionado.',
      data: 'Consultas sugeridas: "' + (report?.geo?.suggestedQueries || ['kenworth colombia', 'camiones kenworth precio']).join('", "') + '"',
      goal: 'Entender la visibilidad actual en asistentes IA antes de implementar estrategias GEO.',
      verify: 'Documentar menciones detectadas, asistentes evaluados y fecha de consulta.',
    });
  }

  // Marcador por competidor: busquedas compartidas donde lideras vs donde pierdes
  const perComp = new Map<string, { lead: number; lose: number; loseBrand: number; total: number; leadUnbranded: number; sharedUnbranded: number }>();
  for (const it of result.gapItems || []) {
    const s = perComp.get(it.competitorName) || { lead: 0, lose: 0, loseBrand: 0, total: 0, leadUnbranded: 0, sharedUnbranded: 0 };
    s.total++;
    if (it.classification === 'fortaleza') s.lead++;
    else if (it.classification === 'brecha_competitiva') {
      s.lose++;
      if (it.brandType === 'marca_competidora') s.loseBrand++;
    }
    if (it.brandType !== 'marca_propia') {
      s.sharedUnbranded++;
      if (it.classification === 'fortaleza') s.leadUnbranded++;
    }
    perComp.set(it.competitorName, s);
  }
  const scorecard = Array.from(perComp.entries())
    .map(([domain, s]) => ({ domain, ...s }))
    .sort((a, b) => b.total - a.total);

  // Busquedas donde el competidor esta POR ENCIMA.
  // Se excluyen las busquedas que llevan la marca del propio competidor
  // (ej. "kenworth casa inglesa"): ahi el rival gana por su nombre, no por
  // posicionamiento, asi que no cuentan como brecha real.
  const rivalAbove: DashboardData['rivalAbove'] = [];
  const brandedOmitted: { keyword: string; competitor: string }[] = [];
  for (const it of result.gapItems || []) {
    const rivalLeads =
      it.competitorRank != null && (it.clientRank == null || it.competitorRank < it.clientRank);
    if (!rivalLeads) continue;
    if (it.brandType === 'marca_competidora') {
      brandedOmitted.push({ keyword: it.keyword, competitor: it.competitorName });
      continue;
    }
    rivalAbove.push({
      keyword: it.keyword,
      competitor: it.competitorName,
      clientRank: it.clientRank ?? null,
      competitorRank: it.competitorRank ?? null,
      volume: it.searchVolume ?? null,
    });
  }
  rivalAbove.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

  // Visitas estimadas por dominio: el cliente primero y luego cada competidor
  const trafficRivals: DashboardData['trafficRivals'] = [
    { domain: clientDomain, traffic: client.estimatedMonthlyTraffic ?? null, isClient: true },
    ...comps.map((c) => ({ domain: c.domain, traffic: c.estimatedMonthlyTraffic ?? null, isClient: false })),
  ];

  const visibilityGaps: DashboardData['visibilityGaps'] = (result.visibilityGaps || [])
    .map((v) => ({ competitor: v.competitor, keyword: v.keyword, rank: v.rank ?? null, volume: v.volume ?? null }))
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

  const competitorOverlap: DashboardData['competitorOverlap'] = (result.competitorOverlap || []).map((o) => ({
    domain: o.domain,
    ranked: o.ranked ?? 0,
    shared: o.shared ?? 0,
    absent: o.absent ?? 0,
    brandOmitted: o.brandOmitted ?? 0,
    offTopic: o.offTopic ?? 0,
  }));

  return {
    clientDomain,
    analyzedAt: result.analyzedAt,
    clientTraffic: client.estimatedMonthlyTraffic,
    competitors: comps,
    fortalezasCount: gap.fortalezas?.length ?? 0,
    descartadasCount: gap.descartadasValidar?.length ?? 0,
    brechasCount: gap.brechasCompetitivas?.length ?? 0,
    totalGap: result.gapItems?.length ?? 0,
    scorecard,
    topKeywords: topSearches.slice(0, 3),
    allGapItems: result.gapItems || [],
    rivalAbove,
    brandedOmitted,
    trafficRivals,
    visibilityGaps,
    competitorOverlap,
    actions: {
      primary: actions.slice(0, 3),
      finding: { primary: findingPrimary, secondary: findingSecondary },
    },
    competitiveSummary: report?.competitiveSummary || null,
    dataQualityNotes: report?.dataQualityNotes || [],
    geoNote: report?.geo?.note || null,
    geoSuggestions: report?.geo?.suggestedQueries || [],
  };
}

// ─── TABLERO EJECUTIVO ───

function ExecutiveDashboard({
  result,
  onUpdate,
  updating,
  updateError,
  aiPresence,
  aiCron,
  onAiEval,
  aiLoading,
}: {
  result: AnalyzeResult;
  onUpdate: () => void;
  updating: boolean;
  updateError: string | null;
  aiPresence: AiPresenceResult | null;
  aiCron: AiCronAssociation | null;
  onAiEval: () => void;
  aiLoading: boolean;
}) {
  const data = useMemo(() => extractDashboardData(result), [result]);

  const [panel, setPanel] = useState<{
    type: 'busquedas' | 'detalle' | 'accion';
    actionIndex?: number;
  } | null>(null);

  const closePanel = useCallback(() => setPanel(null), []);

  const acciones = data.actions.primary;
  const report = result.report;
  const leadRival = data.scorecard[0];
  // Busquedas del competidor fuera del foco del cliente (otras lineas de su portafolio)
  const excludedOffTopic = data.competitorOverlap.reduce((sum, o) => sum + o.offTopic, 0);

  return (
    <div className="max-w-[1400px] mx-auto px-[32px] py-0 space-y-[24px]">
      {/* ═══ 1. ENCABEZADO ═══ */}
      <header className="flex items-start justify-between gap-4 py-4">
        <div>
          <h1 className="text-[30px] font-bold text-[#172033] leading-tight">Tu visibilidad digital</h1>
          <p className="text-sm text-[#64748B] mt-1">
            {data.clientDomain} · {DOMAIN_COUNTRY} · Actualizado el {fmtDateShort(data.analyzedAt)}
          </p>
        </div>
        <div className="flex items-start gap-3 shrink-0">
          {updateError && (
            <span className="text-xs text-[#DC2626] mt-1.5">{updateError}</span>
          )}
          <button
            type="button"
            onClick={onUpdate}
            disabled={updating}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1D4ED8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB]"
            aria-label="Actualizar análisis"
          >
            <svg
              className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 01-9 9 9 9 0 116.3-15.7" />
              <path d="M21 3v6h-6" />
            </svg>
            {updating ? 'Actualizando…' : 'Actualizar'}
          </button>
          <button
            type="button"
            onClick={onAiEval}
            disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white text-[#64748B] text-sm font-medium rounded-lg border border-[#CBD5E1] hover:bg-[#F8FAFC] disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB]"
            aria-label="Evaluar presencia en IA"
          >
            <svg
              className={`w-4 h-4 ${aiLoading ? 'animate-pulse' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            {aiLoading ? 'Evaluando IA…' : '🤖 IA'}
          </button>
        </div>
      </header>

      {/* ═══ 2. HALLAZGO PRINCIPAL ═══ */}
      <section className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[18px] font-semibold text-[#172033] leading-snug">{data.actions.finding.primary}</p>
          {data.actions.finding.secondary && (
            <p className="text-sm text-[#64748B] mt-1">{data.actions.finding.secondary}</p>
          )}
        </div>
      </section>

      {/* ═══ 3. TRES INDICADORES ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* A: Visitas */}
        <IndicatorCard
          title="Visitas desde Google"
          value={data.clientTraffic != null ? fmtNumES(data.clientTraffic) : 'Sin datos'}
          subtitle={data.clientTraffic != null ? `${data.clientDomain} · estimadas al mes` : `Sin datos para ${data.clientDomain}`}
          tooltip={`Visitas orgánicas estimadas que Google envía a ${data.clientDomain} según el modelo de DataForSEO. No es el dato de tu analítica. Debajo se compara con cada competidor en la misma unidad.`}
        >
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Tráfico orgánico estimado de {data.clientDomain}
          </div>
          {data.trafficRivals.length > 1 && (
            <div className="mt-2 pt-2 border-t border-[#F1F5F9] space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-[#94A3B8]">Mismo dato en cada competidor</div>
              {data.trafficRivals.slice(1).map((r) => (
                <div key={r.domain} className="flex items-center justify-between gap-2 text-[11px] text-[#64748B]">
                  <span className="truncate" title={r.domain}>{r.domain}</span>
                  <span className="whitespace-nowrap shrink-0">{r.traffic != null ? `${fmtNumES(r.traffic)}/mes` : 'sin dato'}</span>
                </div>
              ))}
            </div>
          )}
        </IndicatorCard>

        {/* B: Liderazgo */}
        <IndicatorCard
          title="Búsquedas donde lideras"
          value={`${data.fortalezasCount} de ${data.totalGap}`}
          subtitle={leadRival ? `búsquedas en común con ${leadRival.domain}` : 'Dentro de la muestra comparada'}
          tooltip={leadRival ? `De las ${data.totalGap} búsquedas donde aparecen tu sitio y ${leadRival.domain}, en ${data.fortalezasCount} estás mejor posicionado y en ${data.brechasCount} peor.` : 'Posiciones en Google sobre las búsquedas que ambos comparten.'}
        >
          <SegmentBar green={data.fortalezasCount} red={data.brechasCount} gray={data.descartadasCount} />
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#64748B] flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" />ganas en {data.fortalezasCount}
            </span>
            {data.brechasCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#EF4444] inline-block" />pierdes en {data.brechasCount}
              </span>
            )}
            {data.descartadasCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#CBD5E1] inline-block" />{data.descartadasCount} sin clasificar
              </span>
            )}
          </div>
          {leadRival && leadRival.loseBrand > 0 && (
            <div className="text-[11px] text-[#94A3B8] mt-1.5">
              {leadRival.loseBrand === leadRival.lose
                ? `Las ${leadRival.lose} que pierdes llevan la marca del competidor: ahí gana por su propio nombre, no por posicionamiento.`
                : `${leadRival.loseBrand} de las ${leadRival.lose} que pierdes llevan la marca del competidor.`}
            </div>
          )}
        </IndicatorCard>

        {/* C: IA */}
        <IndicatorCard
          title="Presencia en IA"
          value={aiPresence ? `${aiPresence.summary.totalMentions} de ${aiPresence.summary.modelsOk ?? (aiPresence.summary.totalQueries * aiPresence.summary.modelsEvaluated)}` : 'Sin medir'}
          subtitle={aiPresence ? `${aiPresence.summary.score}% · Actualizado ${new Date(aiPresence.lastEvaluated).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${(aiPresence.summary.modelsErrored ?? 0) > 0 ? ` · ${aiPresence.summary.modelsErrored} fallos` : ''}` : 'Pendiente de evaluación'}
          tooltip={aiPresence ? `Se preguntaron ${aiPresence.summary.totalQueries} búsquedas reales a ChatGPT, Claude y Gemini. Tu sitio apareció en ${aiPresence.summary.totalMentions} de ${aiPresence.summary.modelsOk ?? (aiPresence.summary.totalQueries * aiPresence.summary.modelsEvaluated)} respuestas. La evaluación se ejecuta con el botón 🤖 IA o automáticamente cuando corre el cron del módulo.` : 'No se han realizado consultas a asistentes de IA. Esta evaluación requiere ejecutar consultas reales en ChatGPT, Gemini y Claude.'}
        >
          {aiPresence ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      aiPresence.summary.score >= 50 ? 'bg-[#10B981]' : aiPresence.summary.score >= 25 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'
                    }`}
                    style={{ width: `${aiPresence.summary.score}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-[#64748B] w-8 text-right">{aiPresence.summary.score}%</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
                {aiPresence.queries.map((q, i) => {
                  const okModels = q.models.filter((m) => m.status !== 'error');
                  const mentions = okModels.filter((m) => m.mentionsClient).length;
                  return (
                    <span key={i} className="flex items-center gap-1" title={q.query}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${mentions > 0 ? 'bg-[#10B981]' : 'bg-[#CBD5E1]'}`} />
                      {okModels.length > 0 ? `${mentions}/${okModels.length}` : '—'}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Pendiente de configuración
            </div>
          )}
          {aiCron?.enabled && (
            <p className="text-[11px] text-[#64748B] mt-3 pt-2 border-t border-[#F1F5F9]">
              Evaluación automática cada {aiCron.every_days} días
              {aiCron.next_run_at
                ? ` · próxima ${new Date(aiCron.next_run_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                : ''}
            </p>
          )}
        </IndicatorCard>
      </div>

      {/* ═══ 4. COMPARACIÓN + BÚSQUEDAS DESTACADAS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
        {/* Comparación competidores */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
          <h3 className="text-[18px] font-semibold text-[#172033] mb-1">¿Cómo estás frente a otros?</h3>
          <p className="text-sm text-[#64748B] mb-5">Visitas estimadas al mes</p>
          <TrafficBarChart
            data={[
              { domain: result.client.domain, traffic: result.client.estimatedMonthlyTraffic, isClient: true },
              ...result.competitors.map((c) => ({
                domain: c.domain,
                traffic: c.estimatedMonthlyTraffic,
                isClient: false,
              })),
            ]}
            clientDomain={result.client.domain}
          />
          <p className="text-xs text-[#94A3B8] mt-4">Estimaciones de tráfico, no ventas.</p>
        </div>

        {/* Búsquedas con ventaja */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
          <h3 className="text-[18px] font-semibold text-[#172033] mb-1">¿Dónde ya tienes ventaja?</h3>
          <p className="text-sm text-[#64748B] mb-4">Tus mejores posiciones en Google</p>

          {data.topKeywords.length === 0 ? (
            <p className="text-sm text-[#94A3B8] italic">No se detectaron búsquedas con ventaja clara.</p>
          ) : (
            <div className="space-y-0 divide-y divide-[#F1F5F9]">
              {data.topKeywords.map((kw, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <span className="text-sm text-[#172033] truncate max-w-[70%]">{kw.keyword}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    kw.rank != null && kw.rank <= 3
                      ? 'bg-[#ECFDF5] text-[#059669]'
                      : kw.rank != null && kw.rank <= 10
                        ? 'bg-[#EFF6FF] text-[#2563EB]'
                        : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}>
                    Puesto {kw.rank ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F1F5F9]">
            <span className="text-xs text-[#64748B]">Protege estas posiciones</span>
            <button
              type="button"
              onClick={() => setPanel({ type: 'busquedas' })}
              className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] focus:outline-none focus:underline"
            >
              Ver búsquedas
            </button>
          </div>
        </div>
      </div>

      {/* ═══ 4b. DÓNDE TE SUPERA LA COMPETENCIA ═══ */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] p-6">
        <h3 className="text-[18px] font-semibold text-[#172033] mb-1">¿Dónde te supera la competencia?</h3>
        <p className="text-sm text-[#64748B] mb-4">
          Búsquedas sin tu marca donde hoy aparecen por encima de ti
        </p>

        {data.rivalAbove.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] px-4 py-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <p className="text-sm text-[#065F46]">
              Ninguna. En las búsquedas comparadas que no llevan marca, te mantienes por encima de tus competidores.
            </p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-[#F1F5F9]">
            {data.rivalAbove.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-[#172033] truncate max-w-[45%]" title={r.keyword}>{r.keyword}</span>
                <span className="text-xs text-[#64748B] whitespace-nowrap">
                  {cleanDomain(r.competitor)} puesto {r.competitorRank ?? '—'} · tú {r.clientRank ?? 'sin presencia'}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] whitespace-nowrap">
                  {r.volume != null ? `${fmtNumES(r.volume)}/mes` : 'Sin dato'}
                </span>
              </div>
            ))}
          </div>
        )}

        {(() => {
          const mon: any[] = (data as any).monitoredKeywords || [];
          const cat: any = (data as any).offerCatalog || null;
          const topicCount: Record<string, number> = {};
          for (const m of mon) for (const t of m.topics || []) topicCount[t] = (topicCount[t] || 0) + 1;
          const topics = Object.entries(topicCount).sort((a, b) => b[1] - a[1]);
          const comparables = mon.filter((m) => m.clientRank != null && m.rivalRank != null);
          const ganamos = comparables.filter((m) => m.clientRank < m.rivalRank);
          const perdemos = comparables.filter((m) => m.clientRank > m.rivalRank);
          const ausentes = mon.filter((m) => m.clientRank == null);

          if (!mon.length && !cat) return null;
          return (
            <div className="mt-5 pt-4 border-t border-[#F1F5F9]">
              <p className="text-sm font-medium text-[#172033] mb-1">Tu oferta vs. lo que cubre el competidor</p>
              <p className="text-xs text-[#64748B] mb-3">
                Rastreamos tu propio sitio ({cat?.pageCount ? `${fmtNumES(cat.pageCount)} páginas de ${data.clientDomain}` : data.clientDomain})
                para saber qué ofreces de verdad y solo contamos búsquedas que correspondan a eso.
              </p>

              {(() => {
                const allTopics: string[] = Object.keys((cat && cat.topics) || {}).filter((t) => (cat.topics ? cat.topics[t] > 0 : false));
                if (!allTopics.length && !topics.length) return null;
                const list = allTopics.length ? allTopics : topics.map(([t]) => t);
                const tagCount: Record<string, number> = Object.fromEntries(topics);
                return (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {list.map((t: string) => {
                      const n = tagCount[t] || 0;
                      return (
                        <span
                          key={t}
                          className={n > 0
                            ? 'text-[11px] px-2 py-0.5 rounded-full bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]'
                            : 'text-[11px] px-2 py-0.5 rounded-full bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'}
                          title={n > 0 ? `${n} búsqueda(s) de tu oferta que el competidor ya cubre` : 'Lo ofreces y tu competidor aún no aparece aquí'}
                        >
                          {t}{n > 0 ? `: ${fmtNumES(n)}` : ''}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}

              {(cat || mon.length > 0) && (
                <p className="text-[11px] text-[#94A3B8] -mt-2 mb-3">
                  En verde: temas tuyos que el competidor ya cubre. En gris: temas que ofreces y donde todavía no te compite.
                </p>
              )}

              {comparables.length > 0 && (
                <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3 mb-3">
                  <p className="text-[12px] text-[#475569]">
                    En <span className="font-semibold text-[#172033]">{ganamos.length} de {comparables.length}</span> búsquedas de tu oferta donde
                    ambos aparecen, vas <span className="font-semibold text-[#0F766E]">por encima</span> del competidor
                    {perdemos.length > 0 ? <> y te supera en <span className="font-semibold text-[#B45309]">{perdemos.length}</span></> : null}.
                  </p>
                </div>
              )}

              {ausentes.length > 0 && (
                <div className="rounded-lg bg-[#FFFBEB] border border-[#FDE68A] p-3 mb-3">
                  <p className="text-[12px] text-[#92400E]">
                    <span className="font-semibold">{fmtNumES(ausentes.length)} búsqueda{ausentes.length > 1 ? 's' : ''} de tu oferta donde no apareces</span> en
                    las primeras 100 posiciones y tu competidor sí. Es el hueco más claro de tu portafolio.
                  </p>
                </div>
              )}

              {mon.length > 0 && (
                <div className="divide-y divide-[#F1F5F9]">
                  {mon.slice(0, 10).map((m, i) => {
                    const teSupera = m.clientRank != null && m.rivalRank != null && m.clientRank > m.rivalRank;
                    const noAparece = m.clientRank == null;
                    const label = noAparece ? 'No apareces' : teSupera ? 'Te supera' : 'Vas por encima';
                    const cls = noAparece
                      ? 'bg-[#FEF2F2] text-[#DC2626]'
                      : teSupera
                      ? 'bg-[#FFFBEB] text-[#B45309]'
                      : 'bg-[#F0FDFA] text-[#0F766E]';
                    return (
                      <div key={`${m.domain}-${m.keyword}-${i}`} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="text-[13px] text-[#172033] truncate">{m.keyword}</p>
                          <p className="text-[11px] text-[#94A3B8]">
                            {m.domain}{m.rivalRank != null ? ` #${m.rivalRank}` : ''}
                            {m.clientRank != null ? ` · tú #${m.clientRank}` : ''}
                            {(m.topics || []).length ? ` · ${m.topics.join(', ')}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
                          <span className="text-[12px] text-[#64748B] whitespace-nowrap">
                            {m.volume != null ? `${fmtNumES(m.volume)}/mes` : 'sin dato'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {mon.length > 10 && (
                <p className="text-[11px] text-[#94A3B8] mt-2">
                  y {fmtNumES(mon.length - 10)} búsqueda{mon.length - 10 > 1 ? 's' : ''} más de tu oferta que el competidor cubre.
                </p>
              )}

              {excludedOffTopic > 0 && (
                <p className="text-[11px] text-[#94A3B8] mt-2">
                  No contamos {fmtNumES(excludedOffTopic)} búsqueda{excludedOffTopic > 1 ? 's' : ''} del competidor que no
                  corresponden a nada de lo que ofrece tu sitio (otros productos de su portafolio).
                </p>
              )}
            </div>
          );
        })()}

        {data.competitorOverlap.filter((o) => o.ranked > 0 && o.shared === 0).map((o) => (
          <div key={`no-overlap-${o.domain}`} className="mt-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3">
            <p className="text-[12px] text-[#475569]">
              <span className="font-medium text-[#172033]">{o.domain}</span> no compite por tus mismas búsquedas:
              de sus {fmtNumES(o.ranked)} búsquedas posicionadas, {fmtNumES(o.brandOmitted)} son de su propia marca
              {o.offTopic > 0 ? ` y ${fmtNumES(o.offTopic)} de otras líneas de su portafolio (fuera de tu foco)` : ''}.
              No aparece en las búsquedas por las que compites, así que no hay brechas que recuperar frente a este dominio.
            </p>
          </div>
        ))}

        {data.brandedOmitted.length > 0 && (
          <p className="text-xs text-[#94A3B8] mt-4 pt-3 border-t border-[#F1F5F9]">
            Omitimos {data.brandedOmitted.length} búsqueda{data.brandedOmitted.length > 1 ? 's' : ''} que llevan
            la marca del competidor ({data.brandedOmitted.map((b) => `"${b.keyword}"`).join(', ')}):
            ahí gana por su propio nombre, no por posicionamiento.
          </p>
        )}
      </section>

      {/* ═══ 5. ACCIONES ═══ */}
      <section>
        <h3 className="text-[18px] font-semibold text-[#172033] mb-1">Qué hacer ahora</h3>
        <p className="text-sm text-[#64748B] mb-4">3 acciones recomendadas</p>

        {acciones.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 text-center">
            <p className="text-sm text-[#64748B]">No hay acciones recomendadas disponibles. Ejecuta un análisis para obtener sugerencias.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {acciones.map((a, i) => (
              <ActionCard
                key={i}
                number={`0${i + 1}`}
                title={a.title}
                description={a.description}
                tag={a.tag}
                tagColor={a.tagColor}
                onClick={() => setPanel({ type: 'accion', actionIndex: i })}
              />
            ))}
          </div>
        )}
      </section>

      {/* ═══ 6. PIE ═══ */}
      <footer className="border-t border-[#E2E8F0] pt-4 pb-6 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-[#94A3B8]">
          Fuente: DataForSEO · Consulta: {fmtDateShort(data.analyzedAt)}
        </span>
        <button
          type="button"
          onClick={() => setPanel({ type: 'detalle' })}
          className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] focus:outline-none focus:underline"
        >
          Ver detalle técnico
        </button>
      </footer>

      {/* ═══ PANELES ═══ */}

      {/* Panel: Búsquedas */}
      <DetailPanel open={panel?.type === 'busquedas'} onClose={closePanel} title="Todas las búsquedas del análisis">
        <p className="text-sm text-[#64748B] mb-4">
          Las búsquedas están clasificadas según la comparación con los competidores. 
          <span className="block text-xs mt-1">"Puesto 1" es la primera posición orgánica en Google Colombia según DataForSEO.</span>
        </p>
        {data.allGapItems.length === 0 ? (
          <p className="text-sm text-[#94A3B8] italic">No hay datos disponibles.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left px-2 py-2 font-medium text-[#64748B] text-[11px] uppercase">Búsqueda</th>
                  <th className="text-right px-2 py-2 font-medium text-[#64748B] text-[11px] uppercase">Vol.</th>
                  <th className="text-center px-2 py-2 font-medium text-[#64748B] text-[11px] uppercase">Tu posición</th>
                  <th className="text-center px-2 py-2 font-medium text-[#64748B] text-[11px] uppercase">Competidor</th>
                  <th className="text-left px-2 py-2 font-medium text-[#64748B] text-[11px] uppercase">Clasif.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {data.allGapItems.map((item, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC]">
                    <td className="px-2 py-2 text-[#172033] max-w-[180px] truncate text-xs" title={item.keyword}>{item.keyword}</td>
                    <td className="px-2 py-2 text-right font-mono text-xs text-[#64748B]">{item.searchVolume != null ? fmtNumES(item.searchVolume) : '—'}</td>
                    <td className="px-2 py-2 text-center text-xs font-medium">{item.clientRank ?? '✗'}</td>
                    <td className="px-2 py-2 text-center text-xs text-[#64748B]">{item.competitorRank ?? '—'} <span className="text-[10px]">({cleanDomain(item.competitorName).split('.')[0]})</span></td>
                    <td className="px-2 py-2 text-xs">
                      {item.classification === 'fortaleza' && <span className="text-[#059669]">Fortaleza</span>}
                      {item.classification === 'brecha_competitiva' && <span className="text-[#DC2626]">Brecha</span>}
                      {item.classification === 'oportunidad_mejora' && <span className="text-[#D97706]">Oportunidad</span>}
                      {item.classification === 'sin_presencia_detectada' && <span className="text-[#7C3AED]">Sin presencia</span>}
                      {item.classification === 'descartada_validar' && <span className="text-[#94A3B8]">Descartada</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailPanel>

      {/* Panel: Detalle técnico */}
      <DetailPanel open={panel?.type === 'detalle'} onClose={closePanel} title="Detalle técnico del análisis">
        <div className="space-y-5 text-sm">
          <div>
            <h4 className="font-semibold text-[#172033] mb-2">Perfil del sitio</h4>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[#F1F5F9]">
                <tr><td className="py-1.5 text-[#64748B]">Keywords orgánicas (top 100)</td><td className="py-1.5 text-right font-mono">{fmtNumES(result.client.organicKeywords)}</td></tr>
                <tr><td className="py-1.5 text-[#64748B]">Backlinks totales</td><td className="py-1.5 text-right font-mono">{fmtNumES(result.client.totalBacklinks)}</td></tr>
                <tr><td className="py-1.5 text-[#64748B]">Dominios referentes</td><td className="py-1.5 text-right font-mono">{fmtNumES(result.client.referringDomains)}</td></tr>
                <tr>
                  <td className="py-1.5 text-[#64748B]">Ranking autoridad (backlinks)</td>
                  <td className="py-1.5 text-right font-mono">{result.client.domainAuthority != null ? result.client.domainAuthority : '—'}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[11px] text-[#94A3B8] mt-1">Ranking de DataForSEO. Más bajo = mejor perfil de enlaces. No es puntaje 0-100.</p>
          </div>

          <div>
            <h4 className="font-semibold text-[#172033] mb-2">Clasificaciones del análisis</h4>
            <ul className="space-y-1 text-[#64748B]">
              <li><span className="text-[#059669] font-medium">Fortaleza:</span> Tu sitio rankea mejor que el competidor.</li>
              <li><span className="text-[#DC2626] font-medium">Brecha competitiva:</span> El competidor rankea mejor que tu sitio.</li>
              <li><span className="text-[#D97706] font-medium">Oportunidad:</span> Tu sitio aparece pero fuera de posición óptima.</li>
              <li><span className="text-[#7C3AED] font-medium">Sin presencia:</span> No apareces en top 100; el competidor sí.</li>
              <li><span className="text-[#94A3B8] font-medium">Descartada:</span> Búsqueda sin marca propia o sin relevancia comprobada.</li>
            </ul>
          </div>

          {data.dataQualityNotes.length > 0 && (
            <div>
              <h4 className="font-semibold text-[#172033] mb-2">Notas sobre los datos</h4>
              <ul className="space-y-1 text-[#64748B] text-xs">
                {data.dataQualityNotes.map((n, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D97706] mt-0.5">•</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-3 border-t border-[#E2E8F0]">
            <h4 className="font-semibold text-[#172033] mb-2">Cobertura y limitaciones</h4>
            <ul className="space-y-1 text-[#64748B] text-xs">
              <li>• El análisis cubre los primeros 100 resultados de Google Colombia.</li>
              <li>• Las visitas son estimaciones de DataForSEO, no datos de Google Analytics.</li>
              <li>• Solo se comparan búsquedas donde al menos dos dominios aparecen en el top 100.</li>
              <li>• La presencia en IA no ha sido evaluada; requiere consultas reales a asistentes.</li>
              <li>• El ranking de autoridad refleja el perfil de enlaces; no es una métrica de calidad editorial.</li>
            </ul>
          </div>
        </div>
      </DetailPanel>

      {/* Panel: Acción detalle */}
      <DetailPanel
        open={panel?.type === 'accion' && panel.actionIndex != null}
        onClose={closePanel}
        title={panel?.actionIndex != null ? acciones[panel.actionIndex]?.title || 'Acción' : 'Acción'}
      >
        {panel?.actionIndex != null && acciones[panel.actionIndex] && (
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-[#172033] mb-1">Qué se recomienda hacer</h4>
              <p className="text-[#64748B]">{acciones[panel.actionIndex].detail}</p>
            </div>
            <div>
              <h4 className="font-semibold text-[#172033] mb-1">Dato que motiva la recomendación</h4>
              <p className="text-[#64748B]">{acciones[panel.actionIndex].data}</p>
            </div>
            {acciones[panel.actionIndex].pages && (
              <div>
                <h4 className="font-semibold text-[#172033] mb-1">Páginas o búsquedas involucradas</h4>
                <p className="text-[#64748B]">{acciones[panel.actionIndex].pages}</p>
              </div>
            )}
            {acciones[panel.actionIndex].goal && (
              <div>
                <h4 className="font-semibold text-[#172033] mb-1">Resultado esperado</h4>
                <p className="text-[#64748B]">{acciones[panel.actionIndex].goal}</p>
              </div>
            )}
            {acciones[panel.actionIndex].verify && (
              <div>
                <h4 className="font-semibold text-[#172033] mb-1">Cómo verificarlo</h4>
                <p className="text-[#64748B]">{acciones[panel.actionIndex].verify}</p>
              </div>
            )}
          </div>
        )}
      </DetailPanel>
    </div>
  );
}

// ─── ANALYZER TAB (orquesta el tablero) ───

function AnalyzerTab({ clientUrl, competitors }: { clientUrl: string; competitors: CompetitorEntry[] }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prevLoaded, setPrevLoaded] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [aiPresence, setAiPresence] = useState<AiPresenceResult | null>(null);
  const [aiCron, setAiCron] = useState<AiCronAssociation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const AI_PRESENCE_API = '/api/custom-module28/analizador-gap-seo-geo/ai-presence';

  // Cargar resultado previo
  useEffect(() => {
    if (prevLoaded) return;
    setPrevLoaded(true);
    Promise.all([
      fetch(ANALYZE_API).then((r) => r.json()),
      fetch(AI_PRESENCE_API).then((r) => r.json()),
    ])
      .then(([analJson, aiJson]) => {
        if (analJson.ok && analJson.hasResult && analJson.result) {
          setResult(analJson.result);
        }
        if (aiJson.ok && aiJson.hasResult && aiJson.result) {
          setAiPresence(aiJson.result);
        }
        if (aiJson.ok && aiJson.cron) {
          setAiCron(aiJson.cron);
        }
      })
      .catch(() => {});
  }, [prevLoaded]);

  const handleUpdate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUpdateError(null);
    try {
      const res = await fetch(ANALYZE_API, { method: 'POST' });
      const json = await res.json();
      if (json.ok && json.result) {
        setResult(json.result);
      } else {
        setUpdateError(json.error || 'Error al ejecutar análisis');
        // Conservar resultado anterior
      }
    } catch (e: any) {
      setUpdateError(e.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAIEvaluation = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await fetch(AI_PRESENCE_API, { method: 'POST' });
      const json = await res.json();
      if (json.ok && json.result) {
        setAiPresence(json.result);
      } else {
        setUpdateError(json.error || 'Error al evaluar presencia en IA');
      }
    } catch (e: any) {
      setUpdateError(e.message || 'Error de red');
    } finally {
      setAiLoading(false);
    }
  }, []);

  if (!result) {
    // Estados sin análisis o carga
    if (loading) {
      return (
        <div className="max-w-[1400px] mx-auto px-[32px] space-y-[24px] py-4">
          {/* Skeleton header */}
          <div className="flex justify-between items-start py-4">
            <div><div className="h-9 w-64 bg-gray-200 rounded animate-pulse mb-2" /><div className="h-4 w-48 bg-gray-100 rounded animate-pulse" /></div>
            <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          {/* Skeleton hallazgo */}
          <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          {/* Skeleton indicadores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-6">
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-3" />
                <div className="h-9 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
          {/* Skeleton gráfica */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
            <div className="h-5 w-64 bg-gray-200 rounded animate-pulse mb-4" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="flex-1 h-4 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="max-w-[1400px] mx-auto px-[32px] py-16 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-[#64748B] text-sm mb-4">{error}</p>
          <button
            type="button"
            onClick={handleUpdate}
            className="px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1D4ED8]"
          >
            Reintentar
          </button>
        </div>
      );
    }

    // Sin análisis
    return (
      <div className="max-w-[1400px] mx-auto px-[32px] py-16 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-lg font-semibold text-[#172033] mb-2">Todavía no hay un análisis disponible</p>
        <p className="text-sm text-[#64748B] mb-6">Este panel compara tu posicionamiento en Google Colombia frente a tus competidores.</p>
        <button
          type="button"
          onClick={handleUpdate}
          className="px-6 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1D4ED8] transition-colors shadow-sm"
        >
          Iniciar análisis
        </button>
      </div>
    );
  }

  return (
    <ExecutiveDashboard
      result={result}
      onUpdate={handleUpdate}
      updating={loading}
      updateError={updateError}
      aiPresence={aiPresence}
      aiCron={aiCron}
      onAiEval={handleAIEvaluation}
      aiLoading={aiLoading}
    />
  );
}

// ─── COMPONENTE PRINCIPAL ───

export default function ModAnalizadorGapSeoGeo({ moduleData }: { moduleData: ModuleData }) {
  const [activeTab, setActiveTab] = useState<TabId>('analizador');
  const [clientUrl, setClientUrl] = useState('');
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([]);
  const [apiKeyLogin, setApiKeyLogin] = useState('');
  const [apiKeyPassword, setApiKeyPassword] = useState('');
  const [apiKeyBase64, setApiKeyBase64] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clientTest, setClientTest] = useState<TestResult>({ status: 'idle' });
  const [compTests, setCompTests] = useState<Record<string, TestResult>>({});

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(CONFIG_API);
      const json = await res.json();
      if (json.ok) {
        const cfg = json.config || {};
        setClientUrl(cfg.client_url || '');
        setApiKeyLogin(cfg.api_key_login || '');
        setApiKeyPassword(cfg.api_key_password || '');
        setApiKeyBase64(cfg.api_key_base64 || '');
        setServerIp(cfg.server_ip || '');
        setOpenrouterApiKey(cfg.openrouter_api_key || '');
        let urls: string[] = [];
        if (cfg.competitor_urls) {
          try { const parsed = JSON.parse(cfg.competitor_urls); if (Array.isArray(parsed)) urls = parsed; }
          catch { urls = cfg.competitor_urls.split('\n').filter((u: string) => u.trim()); }
        }
        setCompetitors(urls.length > 0 ? urls.map((u: string, i: number) => ({ id: `c${i}`, url: u })) : [{ id: 'c0', url: '' }]);
        setConfigLoaded(true);
      }
    } catch { setConfigLoaded(true); }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const addCompetitor = () => setCompetitors((p) => [...p, { id: `c${Date.now()}`, url: '' }]);
  const removeCompetitor = (id: string) => setCompetitors((p) => p.filter((c) => c.id !== id));
  const updateCompetitor = (id: string, url: string) => setCompetitors((p) => p.map((c) => (c.id === id ? { ...c, url } : c)));

  const handleSave = async () => {
    setSaving(true);
    try {
      const validCompetitors = competitors.map((c) => formatCompetitorUrl(c.url)).filter((u) => u);
      const res = await fetch(CONFIG_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_url: clientUrl.trim() || null,
          competitor_urls: validCompetitors.length > 0 ? JSON.stringify(validCompetitors) : null,
          api_key_login: apiKeyLogin.trim() || null,
          api_key_password: apiKeyPassword.trim() || null,
          api_key_base64: apiKeyBase64.trim() || null,
          server_ip: serverIp.trim() || null,
          openrouter_api_key: openrouterApiKey.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else alert('Error al guardar: ' + (json.error || 'Desconocido'));
    } catch { alert('Error de red al guardar configuración'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-[#F6F8FC] min-h-screen">
      <div className="px-[32px] pt-6">
        {/* Pestañas */}
        <div className="flex border-b border-[#E2E8F0] max-w-[1400px] mx-auto" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#64748B] hover:text-[#172033]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'analizador' && <AnalyzerTab clientUrl={clientUrl} competitors={competitors} />}

      {activeTab === 'configuracion' && (
        <div className="max-w-3xl mx-auto px-[32px] py-6 space-y-6">
          <h3 className="text-lg font-bold text-[#172033]">Configuración del analizador GAP SEO + GEO</h3>
          <p className="text-sm text-[#64748B]">Configura las URLs y credenciales de API DataForSEO para ejecutar el análisis.</p>

          <div>
            <label className="block text-sm font-medium text-[#172033] mb-1">URL del cliente</label>
            <div className="flex gap-2">
              <input type="text" value={clientUrl} onChange={(e) => setClientUrl(e.target.value)}
                placeholder="https://tusitio.com"
                className="flex-1 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
              <button onClick={() => setClientTest({ status: 'testing' })}
                disabled={!clientUrl.trim()}
                className="px-3 py-2 text-xs font-medium bg-[#F1F5F9] text-[#64748B] rounded-lg hover:bg-[#E2E8F0] disabled:opacity-50">
                Probar
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-[#172033]">Competidores</label>
              <button onClick={addCompetitor} className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium">+ Añadir competidor</button>
            </div>
            <div className="space-y-2">
              {competitors.map((comp) => (
                <div key={comp.id} className="flex gap-2 items-center">
                  <input type="text" value={comp.url} onChange={(e) => updateCompetitor(comp.id, e.target.value)}
                    placeholder="https://competidor.com"
                    className="flex-1 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
                  {competitors.length > 1 && (
                    <button onClick={() => removeCompetitor(comp.id)} className="text-[#94A3B8] hover:text-[#DC2626] text-xs">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E2E8F0] pt-4">
            <h4 className="text-sm font-medium text-[#172033] mb-3">Credenciales API DataForSEO</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Login (email)</label>
                <input type="text" value={apiKeyLogin} onChange={(e) => setApiKeyLogin(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Password</label>
                <input type="password" value={apiKeyPassword} onChange={(e) => setApiKeyPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Base64 (alternativa)</label>
                <input type="text" value={apiKeyBase64} onChange={(e) => setApiKeyBase64(e.target.value)}
                  placeholder="base64-encoded credentials"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">IP del servidor (whitelist)</label>
                <input type="text" value={serverIp} onChange={(e) => setServerIp(e.target.value)}
                  placeholder="89.167.79.168"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* ── OpenRouter (Presencia en IA) ── */}
          <div className="border border-dashed border-[#CBD5E1] rounded-lg p-3">
            <h4 className="text-sm font-semibold text-[#172033] flex items-center gap-1.5 mb-2">
              🤖 Presencia en IA
            </h4>
            <p className="text-xs text-[#64748B] mb-3">Clave para consultar asistentes de IA (GPT-4o, Claude, Gemini) y evaluar si tu sitio aparece en sus respuestas generativas.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">OpenRouter API Key</label>
                <input type="password" value={openrouterApiKey} onChange={(e) => setOpenrouterApiKey(e.target.value)}
                  placeholder="sk-or-v1-••••••••••••"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB]">
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
            {saved && <span className="text-sm text-[#059669]">✓ Guardado</span>}
          </div>
        </div>
      )}

      {activeTab === 'documentacion' && (
        <div className="max-w-3xl mx-auto px-[32px] py-6 prose prose-sm prose-gray max-w-none">
          <h3 className="text-lg font-bold text-[#172033] mb-3">Documentación del Analizador GAP SEO + GEO</h3>
          <h4 className="font-semibold text-[#172033]">¿Qué hace este módulo?</h4>
          <p className="text-[#64748B]">Compara el posicionamiento orgánico de un sitio web frente a sus competidores en Google Colombia, identificando fortalezas, brechas competitivas y oportunidades de mejora.</p>
          <h4 className="font-semibold text-[#172033]">Fuente de datos</h4>
          <p className="text-[#64748B]">API DataForSEO v3 — endpoints: Backlinks Summary, Ranked Keywords (top 100), Domain Intersection.</p>
          <h4 className="font-semibold text-[#172033]">Interpretación de métricas</h4>
          <ul className="text-[#64748B]">
            <li><strong>Keywords orgánicas:</strong> Número de keywords donde el sitio aparece en los primeros 100 resultados de Google Colombia.</li>
            <li><strong>Tráfico estimado:</strong> Visitas mensuales estimadas desde tráfico orgánico. Fuente: DataForSEO ETV (Estimated Traffic Value).</li>
            <li><strong>Ranking autoridad:</strong> Posición en el ranking de backlinks de DataForSEO. Más bajo = mejor perfil de enlaces. No es un puntaje 0-100.</li>
            <li><strong>Competencia (PPC):</strong> Nivel de competencia publicitaria en Google Ads. No refleja dificultad SEO.</li>
          </ul>
        </div>
      )}
    </div>
  );
}