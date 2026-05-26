'use client';

import { useEffect, useState } from 'react';

const BASE = '/api/custom-module20/generador-de-facturas-autolarte-zero-llc';
const CUSTOMER_ID = 'cus_Mk1Npqxg8BHBjG';

type TabId = 'facturas' | 'config';

const tabs: { id: TabId; label: string }[] = [
  { id: 'facturas', label: 'Facturas' },
  { id: 'config', label: 'Configuración' },
];

interface Invoice {
  id: string;
  number: string;
  created: number;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  invoice_pdf: string;
  hosted_invoice_url: string;
}

async function safeFetchJson(url: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(url, opts);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text().catch(() => '');
    const snippet = text.substring(0, 200);
    throw new Error(`Respuesta inesperada (${res.status}): ${snippet}`);
  }
  const json = await res.json();
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `Error ${res.status}`);
  }
  return json;
}

const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return key.substring(0, 4) + '...';
  return key.substring(0, 8) + '...' + key.slice(-4);
}

export default function GeneradorFacturasAutolarte({
  moduleData,
}: {
  moduleData?: { id: number; title: string };
}) {
  const [activeTab, setActiveTab] = useState<TabId>('facturas');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});
  const [configError, setConfigError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState('');

  useEffect(() => {
    if (activeTab === 'config') fetchConfig();
    if (activeTab === 'facturas') fetchInvoices();
  }, [activeTab]);

  async function fetchConfig() {
    setConfigError('');
    try {
      const json = await safeFetchJson(`${BASE}/config`);
      if (json.data) {
        setConfig(json.data);
      }
    } catch (e: any) {
      setConfigError(e?.message || 'Error de red');
    }
  }

  async function fetchInvoices() {
    setInvoicesLoading(true);
    setInvoicesError('');
    try {
      const json = await safeFetchJson(`${BASE}/invoices`);
      setInvoices(json.data || []);
    } catch (e: any) {
      setInvoicesError(e?.message || 'Error de red');
    } finally {
      setInvoicesLoading(false);
    }
  }

  async function handleSaveConfig() {
    setSaveMsg('');
    setConfigError('');
    try {
      await safeFetchJson(`${BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editConfig),
      });
      setSaveMsg('Configuración guardada');
      setConfig({ ...editConfig });
    } catch (e: any) {
      setConfigError(e?.message || 'Error guardando configuración');
    }
  }

  async function handleVerifyStripe() {
    setVerifying(true);
    setVerifyMsg(null);
    setConfigError('');
    try {
      const json = await safeFetchJson(`${BASE}/verify-stripe`, { method: 'POST' });
      if (json.ok) {
        const mode = json.data?.livemode ? 'Live' : 'Test';
        setVerifyMsg({ ok: true, text: `Key valida (modo ${mode})` });
      }
    } catch (e: any) {
      setVerifyMsg({ ok: false, text: e?.message || 'Error de red' });
    } finally {
      setVerifying(false);
    }
  }

  function formatCurrency(amount: number, currency: string): string {
    const value = amount / 100;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(value);
  }

  function formatDate(ts: number): string {
    return new Date(ts * 1000).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const statusLabels: Record<string, string> = {
    paid: 'Pagada',
    open: 'Pendiente',
    draft: 'Borrador',
    void: 'Anulada',
    uncollectible: 'Incobrable',
  };

  const statusColors: Record<string, string> = {
    paid: 'text-green-700 bg-green-50 border-green-200',
    open: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    void: 'text-gray-500 bg-gray-50 border-gray-200',
    uncollectible: 'text-red-700 bg-red-50 border-red-200',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{moduleData?.title || 'Generador de facturas Autolarte'}</h2>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'facturas' && (
        <div className="space-y-4">
          <div className="text-xs text-gray-500">Cliente: {CUSTOMER_ID}</div>

          {invoicesLoading && (
            <div className="text-sm text-gray-500">Cargando facturas...</div>
          )}

          {invoicesError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {invoicesError}
            </div>
          )}

          {!invoicesLoading && !invoicesError && invoices.length === 0 && (
            <div className="text-sm text-gray-500">No hay facturas para este cliente</div>
          )}

          {!invoicesLoading && invoices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-2 pr-4 font-medium">Factura</th>
                    <th className="py-2 pr-4 font-medium">Fecha</th>
                    <th className="py-2 pr-4 font-medium">Monto</th>
                    <th className="py-2 pr-4 font-medium">Estado</th>
                    <th className="py-2 font-medium">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 pr-4 text-gray-900">{inv.number || inv.id}</td>
                      <td className="py-3 pr-4 text-gray-700">{formatDate(inv.created)}</td>
                      <td className="py-3 pr-4 text-gray-900 font-medium">
                        {formatCurrency(inv.amount_due, inv.currency)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${statusColors[inv.status] || 'text-gray-700 bg-gray-50 border-gray-200'}`}>
                          {statusLabels[inv.status] || inv.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {inv.invoice_pdf ? (
                          <a
                            href={inv.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PDF
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-4 max-w-lg">
          {configError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {configError}
            </div>
          )}
          {saveMsg && (
            <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">
              {saveMsg}
            </div>
          )}
          {verifyMsg && (
            <div className={`text-sm border rounded p-3 ${
              verifyMsg.ok
                ? 'text-green-600 bg-green-50 border-green-200'
                : 'text-red-600 bg-red-50 border-red-200'
            }`}>
              {verifyMsg.text}
            </div>
          )}
          <div>
            <label className={labelClass}>Stripe API Key</label>
            {config.stripe_key && (
              <div className="text-xs text-gray-500 mb-1">
                Key actual: {maskKey(config.stripe_key)}
              </div>
            )}
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editConfig.stripe_key || ''}
              onChange={(e) => setEditConfig({ ...editConfig, stripe_key: e.target.value })}
              placeholder={config.stripe_key ? 'Escribe una nueva key para cambiarla' : 'sk_live_...'}
              type="password"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveConfig}
              className="bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Guardar configuración
            </button>
            <button
              onClick={handleVerifyStripe}
              disabled={verifying}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {verifying ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}