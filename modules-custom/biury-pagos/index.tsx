'use client';

import { useState, useEffect } from 'react';

interface LogRow {
  id: number;
  payment_id: string;
  customer_document: string;
  product_name: string;
  gateway: string;
  total: number;
  siigo_response: string | null;
  status: string;
  created_at: string;
  payload_raw?: string | null;
}

interface Stats {
  total: number;
  success: number;
  error: number;
  filtered: number;
}

interface ProductRule {
  id?: string;
  matcher: string | string[];
  account_code: string;
  description?: string | null;
  gateway_matcher?: string | null;
  active?: boolean;
}

interface ReprocessResultRow {
  payment_id: string;
  status: string;
  message?: string;
}

interface ReprocessModalState {
  open: boolean;
  title: string;
  status: 'running' | 'success' | 'error';
  summary: string;
  results: ReprocessResultRow[] | null;
}

interface CatalogsResponse {
  available_products?: string[];
  available_gateways?: string[];
  gateway_empty_value?: string;
}

const BASE = '/api/custom-module8/biury-pagos';
const WEBHOOK_URL = 'https://workers.zeroazul.com/api/module-webhooks/8/webhook';
const PAGE_SIZE = 50;
const FALLBACK_LABEL = 'Sin gateway (fallback)';
const FALLBACK_SENTINEL_PREFIX = 'fallback-';
const MATCH_ANY_SENTINEL = '*';
const createInitialReprocessModalState = (): ReprocessModalState => ({
  open: false,
  title: '',
  status: 'running',
  summary: '',
  results: null,
});

const cloneRule = (rule: ProductRule): ProductRule => ({
  ...rule,
  matcher: Array.isArray(rule.matcher) ? [...rule.matcher] : rule.matcher,
});

const generateTempRuleId = () => `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getRuleKey = (rule: ProductRule, index: number) => rule.id || `rule-${index}`;

const normalizeMatcherArray = (matcher: ProductRule['matcher']): string[] => {
  if (Array.isArray(matcher)) {
    return Array.from(
      new Set(
        matcher
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter((item) => item.length > 0)
      )
    );
  }
  if (typeof matcher === 'string') {
    const trimmed = matcher.trim();
    if (!trimmed || trimmed === MATCH_ANY_SENTINEL) return [];
    return [trimmed];
  }
  return [];
};

const normalizeRuleForDraft = (rule: ProductRule, sentinelValue: string): ProductRule => {
  const cloned = cloneRule(rule);
  const isFallback = cloned.gateway_matcher === sentinelValue;

  if (isFallback) {
    return {
      ...cloned,
      matcher: MATCH_ANY_SENTINEL,
      description: cloned.description || FALLBACK_LABEL,
      gateway_matcher: sentinelValue,
      active: cloned.active === false ? false : true,
    };
  }

  const matcherArray = normalizeMatcherArray(cloned.matcher);
  return {
    ...cloned,
    matcher: matcherArray.length ? matcherArray : MATCH_ANY_SENTINEL,
  };
};

const sanitizeMatcherForSave = (matcher: ProductRule['matcher']): string | string[] => {
  if (typeof matcher === 'string') {
    const trimmed = matcher.trim();
    return trimmed === MATCH_ANY_SENTINEL || trimmed === '' ? MATCH_ANY_SENTINEL : trimmed;
  }
  if (Array.isArray(matcher)) {
    const cleaned = matcher
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item !== MATCH_ANY_SENTINEL);
    if (!cleaned.length) {
      return MATCH_ANY_SENTINEL;
    }
    return Array.from(new Set(cleaned));
  }
  return MATCH_ANY_SENTINEL;
};

const sanitizeGatewayMatcher = (
  gateway: string | null | undefined,
  sentinelValue: string
): string | null => {
  if (!gateway) return null;
  const trimmed = gateway.trim();
  if (!trimmed) return null;
  if (trimmed === sentinelValue) return sentinelValue;
  return trimmed;
};

interface Module8Props {
  moduleData?: { title?: string };
}

export default function BiuryPagosModule({ moduleData }: Module8Props) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Record<string, string | null>>({});
  const [productRules, setProductRules] = useState<ProductRule[]>([]);
  const [productRulesDraft, setProductRulesDraft] = useState<ProductRule[]>([]);
  const [productRulesSaving, setProductRulesSaving] = useState(false);
  const [hasProductRuleChanges, setHasProductRuleChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'config' | 'documentacion'>('logs');
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ access_key: '', siigo_username: '', siigo_access_key: '' });
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<LogRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reprocessLoading, setReprocessLoading] = useState(false);
  const [reprocessDetailLoading, setReprocessDetailLoading] = useState(false);
  const [bulkIds, setBulkIds] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<ReprocessResultRow[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<ReprocessResultRow[]>([]);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeSample, setCodeSample] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authResult, setAuthResult] = useState<Record<string, unknown> | string | null>(null);
  const [page, setPage] = useState(1);
  const [reprocessModal, setReprocessModal] = useState<ReprocessModalState>(createInitialReprocessModalState());
  const updatingConfig =
    configForm.access_key.trim() !== '' ||
    configForm.siigo_username.trim() !== '' ||
    configForm.siigo_access_key.trim() !== '';

  const load = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const res = await fetch(`${BASE}?limit=${PAGE_SIZE}&offset=${offset}`);
      const json = await res.json();
      if (json.ok) {
        setLogs(json.data || []);
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
      if (json.ok) {
        setConfig(json.config || {});
         const rules = Array.isArray(json.product_rules) ? json.product_rules : [];
         const sentinel = json.gateway_empty_value || '';
         setProductRules(rules);
         setEmptyGatewaySentinel(sentinel);
         const normalizedDraft = ensureFallbackRule(
            rules.map((rule: ProductRule) => normalizeRuleForDraft(rule, sentinel)),
            sentinel
         );
         setProductRulesDraft(normalizedDraft);
         setHasProductRuleChanges(false);
         const catalogs: CatalogsResponse = json;
         setAvailableProducts(catalogs.available_products || []);
        setAvailableGateways((catalogs.available_gateways || []).map((gw) => gw.trim()).filter(Boolean));
        const fallback = normalizedDraft.find((rule) => rule.gateway_matcher === sentinel);
        setFallbackRuleId(fallback?.id || null);
        if (fallback?.account_code) {
          setFallbackSuggestionAccountCode(fallback.account_code);
        }
        setEnsureFallbackError(null);
        detectConflicts(normalizedDraft);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { if (activeTab === 'logs') load(); }, [activeTab, page]);
  useEffect(() => { if (activeTab === 'config') loadConfig(); }, [activeTab]);

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: configForm.access_key || null,
          siigo_username: configForm.siigo_username || null,
          siigo_access_key: configForm.siigo_access_key || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        await loadConfig();
        setShowConfig(false);
        setConfigForm({ access_key: '', siigo_username: '', siigo_access_key: '' });
      } else {
        alert(json.error || 'Error al guardar');
      }
    } catch (e) {
      alert('Error al guardar');
    } finally {
      setSavingConfig(false);
    }
  };

  const updateRuleField = (index: number, field: keyof ProductRule, value: string | boolean | string[] | null) => {
    setProductRulesDraft((prev) => {
      const next = prev.map((rule, i) => {
        if (i !== index) return rule;
        if (field === 'matcher') {
          const nextMatcher = Array.isArray(value)
            ? value
            : typeof value === 'string'
              ? value
              : MATCH_ANY_SENTINEL;
          return { ...rule, matcher: nextMatcher };
        }
        if (field === 'gateway_matcher') {
          const gatewayValue = typeof value === 'string' ? value : '';
          const sanitizedGateway = sanitizeGatewayMatcher(gatewayValue, emptyGatewaySentinel);
          return { ...rule, gateway_matcher: sanitizedGateway };
        }
        return { ...rule, [field]: value };
      });
      const ensured = ensureFallbackRule(next);
      setHasProductRuleChanges(true);
      detectConflicts(ensured);
      return ensured;
    });
  };

  const ensureFallbackRule = (
    incomingRules?: ProductRule[],
    sentinelOverride?: string
  ): ProductRule[] => {
    const sentinelValue = sentinelOverride ?? emptyGatewaySentinel;
    const baseSource = incomingRules ?? productRulesDraft;
    const base = baseSource.map((rule) => normalizeRuleForDraft(rule, sentinelValue));
    if (!sentinelValue) return base;
    const existingFallback = base.find((rule) => rule.gateway_matcher === sentinelValue);
    if (existingFallback) {
      if (existingFallback.active === false) {
        existingFallback.active = true;
        setEnsureFallbackError('La regla "Sin gateway" debe permanecer activa. Reactivada automáticamente.');
      } else {
        setEnsureFallbackError(null);
      }
      return base;
    }
    const fallbackRule: ProductRule = {
      id: `${FALLBACK_SENTINEL_PREFIX}${Date.now()}`,
      matcher: MATCH_ANY_SENTINEL,
      account_code: fallbackSuggestionAccountCode || '',
      description: FALLBACK_LABEL,
      gateway_matcher: sentinelValue,
      active: true,
    };
    setEnsureFallbackError('Se creó automáticamente la regla de fallback. Completa los campos obligatorios.');
    return [...base, fallbackRule];
  };

  const addProductRule = () => {
    setProductRulesDraft((prev) => {
      const next = [
        ...prev,
        {
          id: generateTempRuleId(),
          matcher: MATCH_ANY_SENTINEL,
          account_code: '',
          description: '',
          gateway_matcher: null,
          active: true,
        },
      ];
      const ensured = ensureFallbackRule(next);
      setHasProductRuleChanges(true);
      detectConflicts(ensured);
      return ensured;
    });
  };

  const removeProductRule = (index: number) => {
    setProductRulesDraft((prev) => {
      const target = prev[index];
      if (target?.gateway_matcher === emptyGatewaySentinel) {
        alert('La regla "Sin gateway" no se puede eliminar. Debe existir siempre.');
        return prev;
      }
      setHasProductRuleChanges(true);
      const next = prev.filter((_, i) => i !== index);
      const ensured = ensureFallbackRule(next);
      detectConflicts(ensured);
      return ensured;
    });
  };

  const toggleRuleActive = (index: number) => {
    setProductRulesDraft((prev) => {
      const target = prev[index];
      if (target?.gateway_matcher === emptyGatewaySentinel && target?.active !== false) {
        alert('No puedes desactivar la regla "Sin gateway".');
        return prev;
      }
      const next = prev.map((rule, i) =>
        i === index ? { ...rule, active: rule.active === false ? true : rule.active ? false : true } : rule
      );
      setHasProductRuleChanges(true);
      const ensured = ensureFallbackRule(next);
      detectConflicts(ensured);
      return ensured;
    });
  };

  const resetProductRulesForm = () => {
    const sentinel = emptyGatewaySentinel;
    const restored = productRules.map((rule) => normalizeRuleForDraft(rule, sentinel));
    const ensured = ensureFallbackRule(restored);
    setProductRulesDraft(ensured);
    setHasProductRuleChanges(false);
    detectConflicts(ensured);
  };

  const serializeRulesForSave = (draftRules: ProductRule[]): ProductRule[] => {
    return draftRules.map((rule) => {
      const sanitizedMatcher = sanitizeMatcherForSave(rule.matcher);
      const sanitizedGateway = sanitizeGatewayMatcher(rule.gateway_matcher || null, emptyGatewaySentinel);
      return {
        ...rule,
        matcher: sanitizedMatcher,
        gateway_matcher: sanitizedGateway,
      };
    });
  };

  const validateRulesBeforeSave = (draftRules: ProductRule[]): string | null => {
    for (const rule of draftRules) {
      const accountCode = (rule.account_code || '').trim();
      if (!accountCode) {
        if (rule.gateway_matcher === emptyGatewaySentinel) {
          return 'Completa la cuenta contable de la regla "Sin gateway".';
        }
        return 'Todas las reglas activas deben tener una cuenta contable.';
      }

      const matcher = rule.matcher;
      if (Array.isArray(matcher) && matcher.length === 0) {
        return 'Selecciona al menos un producto o marca "Todos los productos".';
      }
    }
    return null;
  };

  const saveProductRules = async () => {
    const validationError = validateRulesBeforeSave(productRulesDraft);
    if (validationError) {
      alert(validationError);
      return;
    }

    setProductRulesSaving(true);
    try {
      const payload = serializeRulesForSave(productRulesDraft);
      const res = await fetch(`${BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_rules: payload }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert(json.error || 'Error al guardar reglas');
        return;
      }
      await loadConfig();
      setHasProductRuleChanges(false);
    } catch (e) {
      alert('Error al guardar reglas');
      console.error(e);
    } finally {
      setProductRulesSaving(false);
    }
  };

  const detectConflicts = (rules: ProductRule[]) => {
    const issues: Record<string, string> = {};
    const map = new Map<string, Set<string>>();

    for (const rule of rules) {
      if (rule.active === false) continue;
      const matcherValues = Array.isArray(rule.matcher) ? rule.matcher : [rule.matcher];
      for (const matcherValue of matcherValues) {
        const normalizedMatcher = (matcherValue || '').toString().trim().toLowerCase() || MATCH_ANY_SENTINEL;
        const isFallback = rule.gateway_matcher === emptyGatewaySentinel;
        const normalizedGateway = isFallback
          ? emptyGatewaySentinel
          : (rule.gateway_matcher || '').trim().toLowerCase();
        const key = `${normalizedMatcher}__${normalizedGateway || 'any'}`;
        if (!map.has(key)) {
          map.set(key, new Set());
        }
        map.get(key)!.add((rule.account_code || '').trim());
      }
    }

    map.forEach((accounts, key) => {
      if (accounts.size > 1) {
        issues[key] = 'Hay reglas activas con la misma combinación de producto/gateway pero diferentes cuentas contables.';
      }
    });

    setRuleConflicts(issues);
    setShowConflictSummary(Object.keys(issues).length > 0);
  };

  const openDetail = async (id: number) => {
    setDetailId(id);
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

  const closeReprocessModal = () => {
    setReprocessModal(createInitialReprocessModalState());
  };

  const reprocessErrors = async (options?: { status?: 'error' | 'filtered' }) => {
    const statusLabel = options?.status === 'filtered' ? 'filtrados' : 'errores';
    setReprocessLoading(true);
    setReprocessModal({
      open: true,
      title: `Reprocesando ${statusLabel}`,
      status: 'running',
      summary: 'Procesando lotes…',
      results: null,
    });
    try {
      const body: Record<string, any> = { limit: 50 };
      if (options?.status) {
        body.status = options.status;
      }
      const res = await fetch(`${BASE}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(text.slice(0, 200) || 'Respuesta no válida del servidor');
      }
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || 'Error al reprocesar');
      }
      setReprocessModal({
        open: true,
        title: `Reprocesando ${statusLabel}`,
        status: 'success',
        summary: `Procesados ${json.processed || 0} registros. OK: ${json.success || 0}, Fallidos: ${json.failed || 0}.`,
        results: Array.isArray(json.results) ? json.results : null,
      });
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error desconocido';
      setReprocessModal({
        open: true,
        title: `Reprocesando ${statusLabel}`,
        status: 'error',
        summary: message,
        results: null,
      });
    } finally {
      setReprocessLoading(false);
    }
  };

  const testAuth = async () => {
    setAuthLoading(true);
    setAuthResult(null);
    try {
      const res = await fetch(`${BASE}/test-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await res.json() : await res.text();
      setAuthResult(payload);
      setShowAuthModal(true);
    } catch (e) {
      alert('Error al probar autenticacion');
    } finally {
      setAuthLoading(false);
    }
  };

  const reprocessDetail = async () => {
    if (!detailId) return;
    setReprocessDetailLoading(true);
    try {
      const res = await fetch(`${BASE}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: detailId }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert(json.error || 'Error al reprocesar');
      }
      await openDetail(detailId);
      await load();
    } catch (e) {
      alert('Error al reprocesar');
    } finally {
      setReprocessDetailLoading(false);
    }
  };

  const reprocessBulk = async () => {
    const ids = bulkIds
      .split(/[\n,]+/)
      .map((id) => id.trim())
      .filter(Boolean);
    if (!ids.length) {
      setReprocessModal({
        open: true,
        title: 'Reproceso masivo',
        status: 'error',
        summary: 'Ingresa al menos un ID de pago Treli.',
        results: null,
      });
      return;
    }

    setBulkLoading(true);
    setBulkResults([]);
    setReprocessModal({
      open: true,
      title: 'Reproceso masivo',
      status: 'running',
      summary: 'Procesando lotes…',
      results: null,
    });
    try {
      const res = await fetch(`${BASE}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_ids: ids }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(text.slice(0, 200) || `Respuesta inválida (HTTP ${res.status})`);
      }
      const payload = await res.json();
      if (!res.ok || !payload?.ok) {
        const message = typeof payload?.error === 'string' ? payload.error : `Error al reprocesar (HTTP ${res.status})`;
        throw new Error(message);
      }
      setBulkResults(payload.results || []);
      setReprocessModal({
        open: true,
        title: 'Reproceso masivo',
        status: 'success',
        summary: `Procesados ${payload.processed || ids.length} pagos. OK: ${payload.success || 0}, Fallidos: ${payload.failed || 0}.`,
        results: Array.isArray(payload.results) ? payload.results : null,
      });
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al reprocesar';
      setReprocessModal({
        open: true,
        title: 'Reproceso masivo',
        status: 'error',
        summary: message,
        results: null,
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const importLogs = async () => {
    if (!importFile) {
      alert('Selecciona un archivo .txt');
      return;
    }
    if (!importFile.name.toLowerCase().endsWith('.txt')) {
      alert('Solo se permite .txt');
      return;
    }
    if (importFile.size > 100 * 1024 * 1024) {
      alert('El archivo supera 100 MB');
      return;
    }

    setImportLoading(true);
    setImportResults([]);
    try {
      const content = await importFile.text();
      const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
      const chunkSize = 200;
      let allResults: Array<{ payment_id: string; status: string; message?: string }> = [];

      for (let i = 0; i < lines.length; i += chunkSize) {
        const chunk = lines.slice(i, i + chunkSize);
        const res = await fetch(`${BASE}/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lines: chunk }),
        });
        const contentType = res.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await res.json() : await res.text();
        if (!res.ok || !payload?.ok) {
          const message = typeof payload === 'string' ? payload : payload?.error;
          alert(message || `Error al importar (HTTP ${res.status})`);
          return;
        }
        allResults = allResults.concat(payload.results || []);
      }

      setImportResults(allResults);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al importar';
      alert(message);
      console.error(e);
    } finally {
      setImportLoading(false);
    }
  };

  const [availableProducts, setAvailableProducts] = useState<string[]>([]);
  const [availableGateways, setAvailableGateways] = useState<string[]>([]);
  const [emptyGatewaySentinel, setEmptyGatewaySentinel] = useState('');
  const [ruleConflicts, setRuleConflicts] = useState<Record<string, string>>({});
  const [showConflictSummary, setShowConflictSummary] = useState(false);
  const [fallbackRuleId, setFallbackRuleId] = useState<string | null>(null);
  const [ensureFallbackError, setEnsureFallbackError] = useState<string | null>(null);
  const [fallbackSuggestionAccountCode, setFallbackSuggestionAccountCode] = useState('');

  const formatDate = (s: string) => {
    return new Date(s).toLocaleString('es-CO', { 
      dateStyle: 'short', 
      timeStyle: 'short' 
    });
  };

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP' 
    }).format(n);
  };

  const formatGateway = (value: string | null | undefined, fallback = 'desconocida (treli)') => {
    if (!value) return fallback;
    const clean = String(value).trim();
    if (!clean || clean.toLowerCase() === 'unknown') return fallback;
    return clean;
  };

  const parseSiigoResponse = (raw?: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const buildCodeSample = () => {
    const username = config.siigo_username || 'TU_SIIGO_USERNAME';
    const accessKey = config.siigo_access_key || 'TU_SIIGO_ACCESS_KEY';
    const paymentId = `evt_${Math.random().toString(36).slice(2, 10)}`;
    const total = 266700;
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return `curl -sS -X POST "https://api.siigo.com/auth" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Partner-Id: biury" \
  -H "User-Agent: Dworkers-Biury/1.0" \
  --data-raw '{"username":"${username}","access_key":"${accessKey}"}'

curl -sS -X POST "https://api.siigo.com/v1/vouchers" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer TOKEN_AQUI" \
  -H "Partner-Id: biury" \
  -H "User-Agent: Dworkers-Biury/1.0" \
  --data-raw '{"document":{"id":8923},"date":"${today}","type":"Detailed","customer":{"identification":"1090367807"},"items":[{"account":{"code":"11200501","movement":"Debit"},"description":"Wompi","value":"${total.toFixed(2)}"},{"account":{"code":"28050501","movement":"Credit"},"description":"Anticipos Clientes","value":"${total.toFixed(2)}","due":{"prefix":"CC","consecutive":"${paymentId}","quote":1,"date":"${due}"}}],"observations":"Treli Payment ID: ${paymentId}"}'`;
  };

  const parsePayload = (raw?: string | null) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const source = parsed?.data ?? parsed;
      const item = Array.isArray(source?.items) && source.items.length ? source.items[0] : null;
      const items = Array.isArray(source?.items) ? source.items : [];
      const billing = source?.transaction?.transaction_billing || {};
      const customer = {
        first_name: billing.first_name || '',
        last_name: billing.last_name || '',
        email: source?.customer?.email || source?.billing?.email || '',
        phone: billing.phone || source?.customer?.phone || '',
        document:
          source?.billing?.document ||
          billing.identification ||
          source?.transaction?.billing?.document ||
          'unknown',
        address_1: billing.address_1 || source?.billing_address?.address_1 || '',
        address_2: billing.address_2 || source?.billing_address?.address_2 || '',
        city: billing.city || source?.billing_address?.city || '',
        state: billing.state || source?.billing_address?.state || '',
        country: billing.country || source?.billing_address?.country || '',
      };
      return {
        payment_id: source?.payment_id || source?.id || source?.transaction?.id || 'unknown',
        customer_document:
          source?.billing?.document ||
          source?.transaction?.transaction_billing?.identification ||
          source?.transaction?.billing?.document ||
          'unknown',
        product_name: item?.name || 'unknown',
        gateway:
          source?.payment_gateway_name ||
          source?.payment_method_gateway ||
          source?.transaction?.payment_method_gateway ||
          'unknown',
        total:
          source?.totals?.total ||
          source?.total ||
          source?.transaction?.amount ||
          item?.total ||
          0,
        customer,
        items,
      };
    } catch {
      return null;
    }
  };

  const tabs = [
    { id: 'logs', label: 'Logs' },
    { id: 'config', label: 'Configuración' },
    { id: 'documentacion', label: 'Documentación' },
  ] as const;

  return (
    <div className="space-y-6 p-2.5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biury Pagos → Siigo</h1>
          <p className="text-sm text-gray-500 mt-1">Integración de pagos Treli al software contable Siigo</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!Object.keys(config).length) {
                await loadConfig();
              }
              const sample = buildCodeSample();
              setCodeSample(sample);
              setShowCodeModal(true);
            }}
            className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </button>
          <button
            onClick={testAuth}
            disabled={authLoading}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm disabled:opacity-50"
          >
            {authLoading ? 'Probando...' : 'Probar autenticacion'}
          </button>
          <button
            onClick={() => load()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'logs' && (
        <>
          <div className="text-xs text-gray-500">
            Mostrando solo pagos BiuryBox Trimestre
          </div>
          {stats && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase">Exitosos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.success}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase">Errores</p>
                  <p className="text-2xl font-bold text-red-600">{stats.error}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase">Filtrados</p>
                  <p className="text-2xl font-bold text-gray-400">{stats.filtered}</p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3 mt-4">
                <div className="text-sm text-gray-600 font-medium">Acciones rápidas</div>
                <button
                  onClick={() => reprocessErrors({ status: 'error' })}
                  type="button"
                  disabled={reprocessLoading}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {reprocessLoading ? 'Procesando...' : 'Reprocesar errores'}
                </button>
                <button
                  onClick={() => reprocessErrors({ status: 'filtered' })}
                  type="button"
                  disabled={reprocessLoading}
                  className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-black disabled:opacity-50"
                >
                  {reprocessLoading ? 'Procesando...' : 'Reprocesar filtrados'}
                </button>
                <button
                  onClick={() => setShowBulkModal(true)}
                  type="button"
                  className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                >
                  Reproceso masivo
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  type="button"
                  className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-black"
                >
                  Importar log
                </button>
                <button
                  onClick={() => load()}
                  type="button"
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                >
                  Actualizar tabla
                </button>
              </div>
            </>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No hay registros</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gateway</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{log.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{log.payment_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.product_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatGateway(log.gateway)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(log.total)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            log.status === 'success' ? 'bg-green-100 text-green-800' :
                            log.status === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(log.created_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openDetail(log.id)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {stats && stats.total > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Pagina {page} de {Math.max(1, Math.ceil(stats.total / PAGE_SIZE))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(stats.total / PAGE_SIZE)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'config' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Configuración</h2>
            <p className="text-sm text-gray-500">Credenciales y reglas de filtrado + cuentas contables</p>
          </div>

      {!showConfig ? (
          <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Access key (webhook)</p>
                  <p className="text-xs text-gray-500 font-mono">{config.access_key || 'No configurado'}</p>
                </div>
                <button
                  onClick={() => setShowConfig(true)}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Actualizar
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Usuario Siigo</p>
                  <p className="text-xs text-gray-500 font-mono">{config.siigo_username || 'No configurado'}</p>
                </div>
                <button
                  onClick={() => setShowConfig(true)}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Actualizar
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Access key Siigo</p>
                  <p className="text-xs text-gray-500 font-mono">{config.siigo_access_key || 'No configurado'}</p>
                </div>
                <button
                  onClick={() => setShowConfig(true)}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Actualizar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access key</label>
              <input
                type="password"
                value={configForm.access_key}
                onChange={(e) => setConfigForm({ ...configForm, access_key: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Nueva access key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario Siigo</label>
              <input
                type="text"
                value={configForm.siigo_username}
                onChange={(e) => setConfigForm({ ...configForm, siigo_username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Usuario de Siigo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access key Siigo</label>
              <input
                type="password"
                value={configForm.siigo_access_key}
                onChange={(e) => setConfigForm({ ...configForm, siigo_access_key: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Access key de Siigo"
              />
            </div>
            <div className="flex gap-2">
                <button
                  onClick={saveConfig}
                  disabled={!updatingConfig || savingConfig}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {savingConfig ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => {
                    setShowConfig(false);
                    setConfigForm({ access_key: '', siigo_username: '', siigo_access_key: '' });
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                >
                  Cancelar
                </button>
            </div>
          </div>
        )}

      <div className="pt-6 border-t border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Productos permitidos</h3>
            <p className="text-sm text-gray-500">Define qué productos procesa el módulo y su cuenta contable</p>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
            {showConflictSummary && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
                <span>Conflictos detectados en las reglas activas.</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={resetProductRulesForm}
                disabled={!hasProductRuleChanges || productRulesSaving}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Restablecer
              </button>
              <button
                onClick={saveProductRules}
                disabled={!hasProductRuleChanges || productRulesSaving}
                className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-black disabled:opacity-50"
              >
                {productRulesSaving ? 'Guardando...' : 'Guardar reglas'}
              </button>
            </div>
            <button
              onClick={() => {
                const ensured = ensureFallbackRule(undefined, emptyGatewaySentinel);
                if (ensured.length === productRulesDraft.length) {
                  addProductRule();
                } else {
                  setProductRulesDraft(ensured);
                  setHasProductRuleChanges(true);
                  detectConflicts(ensured);
                }
              }}
              className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Agregar regla
            </button>
          </div>
        </div>

        {ensureFallbackError && (
          <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            {ensureFallbackError}
          </div>
        )}
        {productRulesDraft.length === 0 ? (
          <div className="text-sm text-gray-500">No hay reglas configuradas.</div>
        ) : (
          <div className="space-y-3">
            {productRulesDraft.map((rule, index) => {
              const matcherValue = rule.matcher;
              const gatewayValue = rule.gateway_matcher || '';
              const normalizedGatewayValue =
                gatewayValue === emptyGatewaySentinel
                  ? emptyGatewaySentinel
                  : gatewayValue.trim().toLowerCase() || 'any';
              const normalizedMatcher = Array.isArray(matcherValue)
                ? matcherValue.map((item) => item.toLowerCase()).sort().join(',')
                : (matcherValue || '').toString().trim().toLowerCase();
              const normalizedKey = `${normalizedMatcher || MATCH_ANY_SENTINEL}__${normalizedGatewayValue}`;
              const conflictMessage = ruleConflicts[normalizedKey];
              return (
                <div
                  key={getRuleKey(rule, index)}
                  className={`border rounded-lg p-4 space-y-3 ${conflictMessage ? 'border-red-300 bg-red-50/50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Regla #{index + 1}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={rule.active !== false}
                        onChange={() => toggleRuleActive(index)}
                        className="rounded"
                      />
                      Activa
                    </label>
                     <button
                       onClick={() => removeProductRule(index)}
                       className="text-xs text-red-600 hover:text-red-700"
                     >
                       Eliminar
                     </button>
                  </div>
                </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Productos permitidos</label>
                      {availableProducts.length ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            <button
                              type="button"
                              onClick={() => updateRuleField(index, 'matcher', MATCH_ANY_SENTINEL)}
                              className={`px-2 py-1 rounded border text-xs ${
                                rule.matcher === MATCH_ANY_SENTINEL
                                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              Todos los productos
                            </button>
                            <button
                              type="button"
                              onClick={() => updateRuleField(index, 'matcher', [])}
                              className={`px-2 py-1 rounded border text-xs ${
                                Array.isArray(rule.matcher)
                                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              Seleccionar manualmente
                            </button>
                          </div>
                          {Array.isArray(rule.matcher) ? (
                            <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                              {availableProducts.map((product) => {
                                const selected = Array.isArray(rule.matcher) && rule.matcher.includes(product);
                                return (
                                  <label key={product} className="flex items-center justify-between px-3 py-2 text-sm text-gray-700">
                                    <span className="pr-4 truncate" title={product}>
                                      {product}
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={(e) => {
                                        setProductRulesDraft((prev) => {
                                          const next = prev.map((r, i) => {
                                            if (i !== index) return r;
                                            const current = Array.isArray(r.matcher) ? [...r.matcher] : [];
                                            if (e.target.checked) {
                                              if (!current.includes(product)) current.push(product);
                                            } else {
                                              const pos = current.indexOf(product);
                                              if (pos >= 0) current.splice(pos, 1);
                                            }
                                            return { ...r, matcher: current };
                                          });
                                          setHasProductRuleChanges(true);
                                          detectConflicts(next);
                                          return next;
                                        });
                                      }}
                                    />
                                  </label>
                                );
                              })}
                              {rule.matcher.length === 0 && (
                                <div className="text-xs text-gray-500 px-3 py-2">
                                  Selecciona al menos un producto para esta regla.
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              Esta regla aplica para todos los productos registrados.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            value={Array.isArray(rule.matcher) ? rule.matcher.join('\n') : rule.matcher || ''}
                            onChange={(e) => {
                              const values = e.target.value
                                .split(/\r?\n/)
                                .map((v) => v.trim())
                                .filter(Boolean);
                              updateRuleField(index, 'matcher', values.length ? values : MATCH_ANY_SENTINEL);
                            }}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="BiuryBox Trimestre\nOtro producto"
                          />
                          <p className="text-[11px] text-gray-500">
                            Si dejas este campo vacío, la regla aplicará para todos los productos.
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta contable (Siigo)</label>
                      <input
                        type="text"
                        value={rule.account_code || ''}
                        onChange={(e) => updateRuleField(index, 'account_code', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                        placeholder="11200501"
                      />
                      {(!rule.account_code || !rule.account_code.trim()) && (
                        <p className="text-[11px] text-red-600 mt-1">
                          Este campo es obligatorio para procesar el débito contable.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Gateway (opcional)</label>
                      {availableGateways.length ? (
                        <div className="relative">
                          <select
                            value={rule.gateway_matcher || ''}
                            onChange={(e) => updateRuleField(index, 'gateway_matcher', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                          >
                            <option value="">Cualquier gateway</option>
                            {availableGateways.map((gateway) => (
                              <option key={gateway} value={gateway}>
                                {gateway === emptyGatewaySentinel ? FALLBACK_LABEL : gateway}
                              </option>
                            ))}
                          </select>
                          {rule.gateway_matcher === emptyGatewaySentinel && (
                            <p className="text-[11px] text-blue-600 mt-1">
                              Esta es la regla fallback obligatoria. No se puede desactivar.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={rule.gateway_matcher || ''}
                            onChange={(e) => updateRuleField(index, 'gateway_matcher', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="wompi, mercadopago, etc"
                          />
                          <p className="text-[11px] text-gray-500">
                            Deja el campo vacío para aplicar esta regla sin filtrar por gateway.
                          </p>
                        </div>
                      )}
                    </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                    <input
                      type="text"
                      value={rule.description || ''}
                      onChange={(e) => updateRuleField(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Ej: Trimestre Wompi"
                    />
                  </div>
                </div>
                {conflictMessage ? (
                  <p className="text-xs text-red-600">{conflictMessage}</p>
                ) : (
                  <p className="text-xs text-gray-500">
                    El matcher se evalúa por coincidencia parcial y no distingue mayúsculas. Selecciona "Sin gateway" para aplicar
                    la regla cuando Treli no identifica el origen del pago.
                  </p>
                )}
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  )}

      {activeTab === 'documentacion' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Biury Pagos → Siigo (Módulo 8)</h2>
            <p className="text-sm text-gray-500">
              Recibe webhooks de Treli (pagos WooCommerce), filtra productos "BiuryBox Trimestre" 
              y crea comprobantes contables en Siigo.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Flujo de procesamiento</p>
            <div className="space-y-3">
              {[
                { paso: '01', titulo: 'Webhook recibido', desc: 'POST al webhook /8/webhook con payload de Treli. Se extrae content del body.' },
                { paso: '02', titulo: 'Filtrar producto', desc: 'Se verifica si el primer item del pedido contiene "BiuryBox Trimestre". Si no, se marca como filtrado (no error).' },
                { paso: '03', titulo: 'Validar acceso', desc: 'Se valida email (administrativa@biury.co) y access_key contra la config.' },
                { paso: '04', titulo: 'Crear voucher Siigo', desc: 'Se arma el payload del comprobante:\n- Wompi → cuenta 11200501 (débito)\n- MercadoPago → cuenta 11100501 (débito)\n- Contra-partida: 28050501 (Anticipos Clientes) a 3 meses\n- Cliente: identificación del billing\n- Observaciones: Treli Payment ID' },
                { paso: '05', titulo: 'Guardar log', desc: 'Se registra en modulos_biury_8_logs con status success/error/filtered y la respuesta de Siigo.' },
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
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Webhook</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-4 overflow-x-auto font-mono whitespace-pre">
{`POST ${WEBHOOK_URL}
Content-Type: application/json

{
  "content": {
    "payment_id": "treli_123",
    "billing": { "document": "12345678" },
    "payment_gateway_name": "Wompi",
    "totals": { "total": 299000 },
    "items": [{ "name": "BiuryBox Trimestre" }]
  }
}`}
            </pre>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Rutas del módulo</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-4 overflow-x-auto font-mono whitespace-pre">
{`GET  ${BASE}                    Listado de logs
GET  ${BASE}/[id]               Detalle de un registro
GET  ${BASE}/config             Config (enmascarada)
PUT  ${BASE}/config             Actualizar config`}
            </pre>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tablas</p>
            <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg px-4 py-4 overflow-x-auto font-mono whitespace-pre">
{`modulos_biury_8_config       access_key
modulos_biury_8_logs          Registros de pagos`}
            </pre>
          </div>
        </div>
      )}

      {detailId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-blue-500 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-1">Detalle del registro</h2>
                  <p className="text-blue-100 font-mono text-sm">#{detailId}</p>
                </div>
                <button
                  onClick={reprocessDetail}
                  disabled={reprocessDetailLoading}
                  className="px-3 py-2 bg-white/20 text-white text-xs rounded-lg hover:bg-white/30 disabled:opacity-50"
                >
                  {reprocessDetailLoading ? 'Reprocesando...' : 'Reprocesar en Siigo'}
                </button>
                <button
                  onClick={closeDetail}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {detailLoading ? (
                <p className="text-gray-500">Cargando...</p>
              ) : detailData ? (
                <div className="space-y-4">
                  {detailData.payload_raw && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Datos Treli (payload)</p>
                      {(() => {
                        const payload = parsePayload(detailData.payload_raw);
                        if (!payload) return <p className="text-sm text-gray-500">Payload no disponible</p>;
                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Payment ID</p>
                              <p className="text-sm font-mono text-gray-900">{payload.payment_id}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Documento</p>
                              <p className="text-sm font-mono text-gray-900">{payload.customer_document}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Producto</p>
                              <p className="text-sm text-gray-900">{payload.product_name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Gateway</p>
                              <p className="text-sm text-gray-900">{formatGateway(payload.gateway)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Total</p>
                              <p className="text-sm text-gray-900">{formatCurrency(Number(payload.total))}</p>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Cliente</p>
                              <p className="text-sm text-gray-900">
                                {[payload.customer?.first_name, payload.customer?.last_name]
                                  .filter(Boolean)
                                  .join(' ') || 'Sin nombre'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Documento</p>
                              <p className="text-sm font-mono text-gray-900">{payload.customer?.document || 'unknown'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Email</p>
                              <p className="text-sm text-gray-900">{payload.customer?.email || 'Sin email'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Telefono</p>
                              <p className="text-sm text-gray-900">{payload.customer?.phone || 'Sin telefono'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500 uppercase">Direccion</p>
                              <p className="text-sm text-gray-900">
                                {[payload.customer?.address_1, payload.customer?.address_2].filter(Boolean).join(' ') || 'Sin direccion'}
                                {payload.customer?.city ? `, ${payload.customer.city}` : ''}
                                {payload.customer?.state ? `, ${payload.customer.state}` : ''}
                                {payload.customer?.country ? `, ${payload.customer.country}` : ''}
                              </p>
                            </div>
                          </div>
                          {Array.isArray(payload.items) && payload.items.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-2">Productos</p>
                              <div className="divide-y divide-gray-200 border border-gray-100 rounded-lg">
                                {payload.items.map((item: any, index: number) => (
                                  <div key={`${item?.id || index}`} className="p-3 grid grid-cols-4 gap-3 text-sm">
                                    <div className="col-span-2 text-gray-900">
                                      <div>{item?.name || 'Producto'}</div>
                                      <div className="text-xs text-gray-500">
                                        SKU: {item?.product?.product_invoicing_id || item?.product?.product_merchant_id || 'Sin SKU'}
                                      </div>
                                    </div>
                                    <div className="text-gray-600">x{item?.quantity || 1}</div>
                                    <div className="text-gray-900 text-right">
                                      {formatCurrency(Number(item?.total || item?.subtotal || item?.unit_price || 0))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Payment ID</p>
                      <p className="text-sm font-mono text-gray-900">{detailData.payment_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Documento</p>
                      <p className="text-sm font-mono text-gray-900">{detailData.customer_document}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Producto</p>
                      <p className="text-sm text-gray-900">{detailData.product_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Gateway</p>
                      <p className="text-sm text-gray-900">{formatGateway(detailData.gateway, 'desconocida')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Total</p>
                      <p className="text-sm text-gray-900">{formatCurrency(detailData.total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Estado</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        detailData.status === 'success' ? 'bg-green-100 text-green-800' :
                        detailData.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {detailData.status}
                      </span>
                    </div>
                  </div>
                  {detailData.siigo_response && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Respuesta Siigo</p>
                      {(() => {
                        const response = parseSiigoResponse(detailData.siigo_response);
                        if (!response) {
                          return <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-3 overflow-x-auto">{detailData.siigo_response}</pre>;
                        }
                        const status = response.status;
                        const contentType = response.contentType;
                        const isHtml = typeof response.body === 'string' && response.body.trim().startsWith('<');
                        return (
                          <div className="space-y-3">
                            <div className="text-xs text-gray-500">
                              Estado HTTP: <span className="font-mono">{status ?? 'N/A'}</span>
                              {contentType ? ` · ${contentType}` : ''}
                            </div>
                            {isHtml ? (
                              <iframe
                                title="Siigo HTML"
                                srcDoc={response.body}
                                className="w-full h-64 border border-gray-200 rounded-lg"
                                sandbox=""
                              />
                            ) : response.data ? (
                              <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-3 overflow-x-auto">
{JSON.stringify(response.data, null, 2)}
                              </pre>
                            ) : response.body ? (
                              <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-3 overflow-x-auto">{response.body}</pre>
                            ) : (
                              <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-3 overflow-x-auto">{detailData.siigo_response}</pre>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {detailData.siigo_response && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Respuesta Siigo</p>
                      <pre className="bg-gray-900 text-gray-300 text-xs rounded-lg p-4 overflow-x-auto font-mono whitespace-pre-wrap">
                        {detailData.siigo_response}
                      </pre>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500 uppercase">Fecha</p>
                    <p className="text-sm text-gray-900">{formatDate(detailData.created_at)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-red-500">Error al cargar detalle</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-1">CODE</h2>
                  <p className="text-gray-300 text-sm">Copia y pega desde tu terminal local</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(codeSample || '');
                      } catch (e) {
                        alert('No se pudo copiar');
                      }
                    }}
                    className="px-3 py-2 bg-white/20 text-white text-xs rounded-lg hover:bg-white/30"
                  >
                    Copiar
                  </button>
                  <button
                    onClick={() => setShowCodeModal(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
{codeSample}
              </pre>
            </div>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-blue-500 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-1">Reproceso masivo</h2>
                  <p className="text-blue-100 text-sm">IDs de pago Treli separados por coma o salto de linea</p>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={bulkIds}
                onChange={(e) => setBulkIds(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder="col_TyT.."
              />
              <div className="flex justify-end">
                <button
                  onClick={reprocessBulk}
                  disabled={bulkLoading}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {bulkLoading ? 'Reprocesando...' : 'Reprocesar IDs'}
                </button>
              </div>
              {bulkResults.length > 0 && (
                <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {bulkResults.map((result) => (
                    <div key={result.payment_id} className="px-3 py-2 flex items-center justify-between text-sm">
                      <div className="font-mono text-gray-700">{result.payment_id}</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          result.status === 'success' ? 'bg-green-100 text-green-700' :
                          result.status === 'filtered' ? 'bg-gray-100 text-gray-600' :
                          result.status === 'not_found' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {result.status}
                        </span>
                        {result.message && (
                          <span className="text-xs text-gray-500 max-w-[320px] truncate" title={result.message}>
                            {result.message}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-1">Importar log</h2>
                  <p className="text-gray-300 text-sm">Archivo .txt con un JSON por linea (max 100 MB)</p>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="file"
                accept=".txt"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              <div className="flex justify-end">
                <button
                  onClick={importLogs}
                  disabled={importLoading}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-black disabled:opacity-50"
                >
                  {importLoading ? 'Importando...' : 'Importar'}
                </button>
              </div>
              {importResults.length > 0 && (
                <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {importResults.map((result) => (
                    <div key={result.payment_id} className="px-3 py-2 flex items-center justify-between text-sm">
                      <div className="font-mono text-gray-700">{result.payment_id}</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          result.status === 'created' ? 'bg-green-100 text-green-700' :
                          result.status === 'updated' ? 'bg-blue-100 text-blue-700' :
                          result.status === 'skipped' ? 'bg-gray-100 text-gray-600' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {result.status}
                        </span>
                        {result.message && (
                          <span className="text-xs text-gray-500 max-w-[320px] truncate" title={result.message}>
                            {result.message}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-1">Probar autenticacion</h2>
                  <p className="text-gray-300 text-sm">Siigo auth request/response</p>
                </div>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
            {authResult ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">Request</p>
                    <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
{typeof authResult === 'string' ? authResult : JSON.stringify((authResult as Record<string, unknown>)?.request || {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-2">Response</p>
                    <pre className="bg-gray-900 text-gray-200 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
{typeof authResult === 'string' ? authResult : JSON.stringify((authResult as Record<string, unknown>)?.response || authResult, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Sin respuesta</p>
              )}
            </div>
          </div>
        </div>
      )}
      {reprocessModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div
              className={`sticky top-0 p-6 rounded-t-xl text-white ${
                reprocessModal.status === 'success'
                  ? 'bg-green-600'
                  : reprocessModal.status === 'error'
                    ? 'bg-red-600'
                    : 'bg-blue-600'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-1">{reprocessModal.title}</h2>
                  <p className="text-white/80 text-sm">
                    {reprocessModal.status === 'running'
                      ? 'Procesando registros, esto puede tardar varios minutos...'
                      : reprocessModal.summary}
                  </p>
                </div>
                <div className="flex gap-2">
                  {reprocessModal.status === 'running' && (
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                        <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" />
                      </svg>
                      En progreso
                    </div>
                  )}
                  <button
                    onClick={closeReprocessModal}
                    className="text-white hover:bg-white/20 p-2 rounded-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {reprocessModal.results && reprocessModal.results.length > 0 ? (
                <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                  {reprocessModal.results.map((result) => (
                    <div key={`${result.payment_id}-${result.status}`} className="px-3 py-2 flex items-center justify-between text-sm">
                      <div className="font-mono text-gray-700">{result.payment_id}</div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            result.status === 'success'
                              ? 'bg-green-100 text-green-700'
                              : result.status === 'filtered'
                                ? 'bg-gray-100 text-gray-600'
                                : result.status === 'already_processed'
                                  ? 'bg-blue-100 text-blue-600'
                                  : result.status === 'not_found'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {result.status}
                        </span>
                        {result.message && (
                          <span className="text-xs text-gray-500 max-w-[320px] truncate" title={result.message}>
                            {result.message}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {reprocessModal.status === 'running'
                    ? 'El informe completo aparecerá aquí cuando termine.'
                    : reprocessModal.summary}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
