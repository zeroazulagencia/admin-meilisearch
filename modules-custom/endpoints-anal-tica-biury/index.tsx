'use client';

import { useState, useEffect } from 'react';

type Tab = 'modulos' | 'config' | 'docs';

interface WPConfig {
  wp_db_host: string;
  wp_db_port: string;
  wp_db_name: string;
  wp_db_user: string;
  wp_db_password: string;
  wp_table_prefix: string;
  api_token: string;
  zoho_client_id: string;
  zoho_client_secret: string;
  zoho_refresh_token: string;
  treli_token: string;
  treli_api_key: string;
}

const DEFAULT_CONFIG: WPConfig = {
  wp_db_host: '34.174.19.215',
  wp_db_port: '3306',
  wp_db_name: 'dbsgpylt1rjqoi',
  wp_db_user: 'uvrx5d6hs4yle',
  wp_db_password: 'xxam486bq0wg',
  wp_table_prefix: 'anu_',
  api_token: '',
  zoho_client_id: '1000.VIZSD6KOBZ1DF3BV32YPAZEBD0AKBL',
  zoho_client_secret: 'abb036ee87418516817a6c3397327a2876e7bcea66',
  zoho_refresh_token: '1000.832191142a3f9abbf25e43131c2a9863.8c473f179940b8ca4398bf2273137946',
  treli_token: 'Yml1cnk6NGMwMWY4LTU2ZDU4OS00NzViMGEtOGY4ODlhLWIxMjM4Mw==',
  treli_api_key: '',
};

const ENDPOINTS = [
  { name: 'Clientes', method: 'GET', path: 'https://workers.zeroazul.com/api/custom-module13/biury/clientes', status: 'active', description: 'Usuarios WP no admin + metadatos' },
  { name: 'Zoho Contacts', method: 'GET', path: 'https://workers.zeroazul.com/api/custom-module13/zoho/contacts', status: 'active', description: 'Contacts de Zoho CRM' },
  { name: 'Historial Shipping', method: 'GET', path: 'https://workers.zeroazul.com/api/custom-module13/zoho/contact', status: 'active', description: 'Historial de cambio de dirección' },
  { name: 'Zoho Invoices', method: 'GET', path: 'https://workers.zeroazul.com/api/custom-module13/zoho/invoices', status: 'active', description: 'Facturación e historial de pedidos' },
  { name: 'Zoho Products', method: 'GET', path: 'https://workers.zeroazul.com/api/custom-module13/zoho/products', status: 'active', description: 'Catálogo de productos' },
  { name: 'Cancelaciones', method: 'GET', path: 'https://workers.zeroazul.com/api/custom-module13/zoho/cancelaciones', status: 'active', description: 'Cancelaciones de suscripciones' },
  { name: 'Obs. Segmentación', method: 'GET', path: 'https://workers.zeroazul.com/api/custom-module13/zoho/obs-segmentacion-desp', status: 'active', description: 'Observaciones de segmentación y despacho' },
  { name: 'Cajas Adicionales', method: 'GET', path: 'https://workers.zeroazul.com/api/custom-module13/zoho/cajas-adicionales', status: 'active', description: 'Cajas adicionales de clientes' },
  { name: 'Treli Payment', method: 'GET', path: 'https://workers.zeroazul.com/api/custom-module13/treli/payment', status: 'active', description: 'Datos de pago en Treli' },
  { name: 'Treli Cobros', method: 'GET', path: 'https://workers.zeroazul.com/api/custom-module13/treli/cobros', status: 'active', description: 'Cobros aprobados por fecha' },
];

export default function EndpointsAnaliticaBiury() {
  const [activeTab, setActiveTab] = useState<Tab>('modulos');
  const [config, setConfig] = useState<WPConfig>(DEFAULT_CONFIG);
  const [configMsg, setConfigMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [clientesLoading, setClientesLoading] = useState(false);
  const [clientesData, setClientesData] = useState<any>(null);
  const [clientesError, setClientesError] = useState<string | null>(null);
  const [clientesFilters, setClientesFilters] = useState({ limit: '100', offset: '0', email: '', search: '' });

  const [zohoLoading, setZohoLoading] = useState(false);
  const [zohoData, setZohoData] = useState<any>(null);
  const [zohoError, setZohoError] = useState<string | null>(null);
  const [zohoFilters, setZohoFilters] = useState({ limit: '100', offset: '0', email: '', phone: '' });

  const [zohoHistoryLoading, setZohoHistoryLoading] = useState(false);
  const [zohoHistoryData, setZohoHistoryData] = useState<any>(null);
  const [zohoHistoryError, setZohoHistoryError] = useState<string | null>(null);
  const [zohoHistoryId, setZohoHistoryId] = useState('');

  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesData, setInvoicesData] = useState<any>(null);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [invoicesFilters, setInvoicesFilters] = useState({ limit: '50', offset: '0', contact_id: '' });

  const [productsLoading, setProductsLoading] = useState(false);
  const [productsData, setProductsData] = useState<any>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsFilters, setProductsFilters] = useState({ limit: '50', offset: '0' });

  const [cancelacionesLoading, setCancelacionesLoading] = useState(false);
  const [cancelacionesData, setCancelacionesData] = useState<any>(null);
  const [cancelacionesError, setCancelacionesError] = useState<string | null>(null);
  const [cancelacionesFilters, setCancelacionesFilters] = useState({ limit: '50', offset: '0' });

  const [segmentacionLoading, setSegmentacionLoading] = useState(false);
  const [segmentacionData, setSegmentacionData] = useState<any>(null);
  const [segmentacionError, setSegmentacionError] = useState<string | null>(null);
  const [segmentacionFilters, setSegmentacionFilters] = useState({ limit: '50', offset: '0' });

  const [cajasLoading, setCajasLoading] = useState(false);
  const [cajasData, setCajasData] = useState<any>(null);
  const [cajasError, setCajasError] = useState<string | null>(null);
  const [cajasFilters, setCajasFilters] = useState({ limit: '50', offset: '0' });

  const [treliLoading, setTreliLoading] = useState(false);
  const [treliData, setTreliData] = useState<any>(null);
  const [treliError, setTreliError] = useState<string | null>(null);
  const [treliPaymentId, setTreliPaymentId] = useState('');

  const [cobrosLoading, setCobrosLoading] = useState(false);
  const [cobrosData, setCobrosData] = useState<any>(null);
  const [cobrosError, setCobrosError] = useState<string | null>(null);
  const [cobrosFilters, setCobrosFilters] = useState({ start_date: '', end_date: '', limit: '50', cursor: '' });

  const [resultKey, setResultKey] = useState<string>('');

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/custom-module13/config');
      const data = await res.json();
      if (data.ok && data.config) {
        setConfig((prev) => ({ ...prev, ...data.config }));
      }
    } catch (e) {
      console.error('Error loading config:', e);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    setConfigMsg('');
    try {
      const res = await fetch('/api/custom-module13/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.ok) {
        setConfigMsg('Configuración guardada correctamente');
      } else {
        setConfigMsg('Error: ' + (data.error || 'Error desconocido'));
      }
    } catch (e: any) {
      setConfigMsg('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const getClientes = async () => {
    setClientesLoading(true);
    setClientesError(null);
    setClientesData(null);
    setResultKey('clientes');
    try {
      let url = `/api/custom-module13/biury/clientes?limit=${clientesFilters.limit}&offset=${clientesFilters.offset}`;
      if (clientesFilters.email) url += `&email=${encodeURIComponent(clientesFilters.email)}`;
      if (clientesFilters.search) url += `&search=${encodeURIComponent(clientesFilters.search)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setClientesData(data);
      } else {
        setClientesError(data.error || 'Error desconocido');
      }
    } catch (e: any) {
      setClientesError(e.message);
    } finally {
      setClientesLoading(false);
    }
  };

  const getZohoContacts = async () => {
    setZohoLoading(true);
    setZohoError(null);
    setZohoData(null);
    setResultKey('zoho');
    try {
      let url = `/api/custom-module13/zoho/contacts?limit=${zohoFilters.limit}&offset=${zohoFilters.offset}`;
      if (zohoFilters.email) url += `&email=${encodeURIComponent(zohoFilters.email)}`;
      if (zohoFilters.phone) url += `&phone=${encodeURIComponent(zohoFilters.phone)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setZohoData(data);
      } else {
        setZohoError(data.error || 'Error desconocido');
      }
    } catch (e: any) {
      setZohoError(e.message);
    } finally {
      setZohoLoading(false);
    }
  };

  const getZohoHistory = async () => {
    if (!zohoHistoryId.trim()) {
      setZohoHistoryError('Ingresa un ID de contacto');
      return;
    }
    setZohoHistoryLoading(true);
    setZohoHistoryError(null);
    setZohoHistoryData(null);
    setResultKey('zohoHistory');
    try {
      const res = await fetch(`/api/custom-module13/zoho/contact?id=${zohoHistoryId.trim()}`);
      const data = await res.json();
      if (data.ok) {
        setZohoHistoryData(data);
      } else {
        setZohoHistoryError(data.error || 'Error desconocido');
      }
    } catch (e: any) {
      setZohoHistoryError(e.message);
    } finally {
      setZohoHistoryLoading(false);
    }
  };

  const getInvoices = async () => {
    setInvoicesLoading(true);
    setInvoicesError(null);
    setInvoicesData(null);
    setResultKey('invoices');
    try {
      let url = `/api/custom-module13/zoho/invoices?limit=${invoicesFilters.limit}&offset=${invoicesFilters.offset}`;
      if (invoicesFilters.contact_id) url += `&contact_id=${invoicesFilters.contact_id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setInvoicesData(data);
      } else {
        setInvoicesError(data.error || 'Error desconocido');
      }
    } catch (e: any) {
      setInvoicesError(e.message);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const getProducts = async () => {
    setProductsLoading(true);
    setProductsError(null);
    setProductsData(null);
    setResultKey('products');
    try {
      const res = await fetch(`/api/custom-module13/zoho/products?limit=${productsFilters.limit}&offset=${productsFilters.offset}`);
      const data = await res.json();
      if (data.ok) {
        setProductsData(data);
      } else {
        setProductsError(data.error || 'Error desconocido');
      }
    } catch (e: any) {
      setProductsError(e.message);
    } finally {
      setProductsLoading(false);
    }
  };

  const getCancelaciones = async () => {
    setCancelacionesLoading(true);
    setCancelacionesError(null);
    setCancelacionesData(null);
    setResultKey('cancelaciones');
    try {
      const res = await fetch(`/api/custom-module13/zoho/cancelaciones?limit=${cancelacionesFilters.limit}&offset=${cancelacionesFilters.offset}`);
      const data = await res.json();
      if (data.ok) {
        setCancelacionesData(data);
      } else {
        setCancelacionesError(data.error || 'Error desconocido');
      }
    } catch (e: any) {
      setCancelacionesError(e.message);
    } finally {
      setCancelacionesLoading(false);
    }
  };

  const getSegmentacion = async () => {
    setSegmentacionLoading(true);
    setSegmentacionError(null);
    setSegmentacionData(null);
    setResultKey('segmentacion');
    try {
      const res = await fetch(`/api/custom-module13/zoho/obs-segmentacion-desp?limit=${segmentacionFilters.limit}&offset=${segmentacionFilters.offset}`);
      const data = await res.json();
      if (data.ok) {
        setSegmentacionData(data);
      } else {
        setSegmentacionError(data.error || 'Error desconocido');
      }
    } catch (e: any) {
      setSegmentacionError(e.message);
    } finally {
      setSegmentacionLoading(false);
    }
  };

  const getCajas = async () => {
    setCajasLoading(true);
    setCajasError(null);
    setCajasData(null);
    setResultKey('cajas');
    try {
      const res = await fetch(`/api/custom-module13/zoho/cajas-adicionales?limit=${cajasFilters.limit}&offset=${cajasFilters.offset}`);
      const data = await res.json();
      if (data.ok) {
        setCajasData(data);
      } else {
        setCajasError(data.error || 'Error desconocido');
      }
    } catch (e: any) {
      setCajasError(e.message);
    } finally {
      setCajasLoading(false);
    }
  };

  const getTreliPayment = async () => {
    if (!treliPaymentId.trim()) {
      setTreliError('Ingresa un ID de pago');
      return;
    }
    setTreliLoading(true);
    setTreliError(null);
    setTreliData(null);
    setResultKey('treli');
    try {
      const res = await fetch(`/api/custom-module13/treli/payment?payment_id=${treliPaymentId.trim()}`);
      const data = await res.json();
      if (data.ok) {
        setTreliData(data);
      } else {
        setTreliError(data.error || 'Error desconocido');
      }
    } catch (e: any) {
      setTreliError(e.message);
    } finally {
      setTreliLoading(false);
    }
  };

  const getCobros = async () => {
    setCobrosLoading(true);
    setCobrosError(null);
    setCobrosData(null);
    setResultKey('cobros');
    try {
      let url = `/api/custom-module13/treli/cobros?limit=${cobrosFilters.limit}`;
      if (cobrosFilters.start_date) url += `&start_date=${cobrosFilters.start_date}`;
      if (cobrosFilters.end_date) url += `&end_date=${cobrosFilters.end_date}`;
      if (cobrosFilters.cursor) url += `&cursor=${cobrosFilters.cursor}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setCobrosData(data);
      } else {
        setCobrosError(data.error || 'Error desconocido');
      }
    } catch (e: any) {
      setCobrosError(e.message);
    } finally {
      setCobrosLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          {(['modulos', 'config', 'docs'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab === 'modulos' && 'Módulos'}
              {tab === 'config' && 'Configuración'}
              {tab === 'docs' && 'Documentación'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'modulos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ENDPOINTS.map((ep, idx) => (
              <div key={idx} className={`bg-white rounded-xl shadow-sm border p-6 ${
                ep.status === 'active' ? 'border-green-200 hover:border-green-400' : 'border-gray-200 opacity-50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                    ep.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {ep.method}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    ep.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {ep.status}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{ep.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{ep.description}</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-3">{ep.path}</code>
                
                {ep.name === 'Clientes' && ep.status === 'active' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Limit"
                        value={clientesFilters.limit}
                        onChange={(e) => setClientesFilters({ ...clientesFilters, limit: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Offset"
                        value={clientesFilters.offset}
                        onChange={(e) => setClientesFilters({ ...clientesFilters, offset: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Email (filtro)"
                      value={clientesFilters.email}
                      onChange={(e) => setClientesFilters({ ...clientesFilters, email: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Buscar (login, email, nombre)"
                      value={clientesFilters.search}
                      onChange={(e) => setClientesFilters({ ...clientesFilters, search: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                    <button
                      onClick={getClientes}
                      disabled={clientesLoading}
                      className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 text-sm"
                    >
                      {clientesLoading ? 'Cargando...' : 'Ejecutar'}
                    </button>
                  </div>
                )}
                
                {ep.name === 'Zoho Contacts' && ep.status === 'active' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Limit"
                        value={zohoFilters.limit}
                        onChange={(e) => setZohoFilters({ ...zohoFilters, limit: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Offset"
                        value={zohoFilters.offset}
                        onChange={(e) => setZohoFilters({ ...zohoFilters, offset: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Email (filtro)"
                      value={zohoFilters.email || ''}
                      onChange={(e) => setZohoFilters({ ...zohoFilters, email: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Teléfono (filtro)"
                      value={zohoFilters.phone || ''}
                      onChange={(e) => setZohoFilters({ ...zohoFilters, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                    <button
                      onClick={getZohoContacts}
                      disabled={zohoLoading}
                      className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 text-sm"
                    >
                      {zohoLoading ? 'Cargando...' : 'Obtener Contacts'}
                    </button>
                  </div>
                )}
                
                {ep.name === 'Historial Shipping' && ep.status === 'active' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Contact ID"
                      value={zohoHistoryId}
                      onChange={(e) => setZohoHistoryId(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                    <button
                      onClick={getZohoHistory}
                      disabled={zohoHistoryLoading}
                      className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 text-sm"
                    >
                      {zohoHistoryLoading ? 'Cargando...' : 'Ver Historial'}
                    </button>
                  </div>
                )}

                {ep.name === 'Zoho Invoices' && ep.status === 'active' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Limit"
                        value={invoicesFilters.limit}
                        onChange={(e) => setInvoicesFilters({ ...invoicesFilters, limit: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Offset"
                        value={invoicesFilters.offset}
                        onChange={(e) => setInvoicesFilters({ ...invoicesFilters, offset: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Contact ID (opcional)"
                      value={invoicesFilters.contact_id}
                      onChange={(e) => setInvoicesFilters({ ...invoicesFilters, contact_id: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                    <button
                      onClick={getInvoices}
                      disabled={invoicesLoading}
                      className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 text-sm"
                    >
                      {invoicesLoading ? 'Cargando...' : 'Obtener Facturas'}
                    </button>
                  </div>
                )}

                {ep.name === 'Zoho Products' && ep.status === 'active' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Limit"
                        value={productsFilters.limit}
                        onChange={(e) => setProductsFilters({ ...productsFilters, limit: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Offset"
                        value={productsFilters.offset}
                        onChange={(e) => setProductsFilters({ ...productsFilters, offset: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <button
                      onClick={getProducts}
                      disabled={productsLoading}
                      className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 text-sm"
                    >
                      {productsLoading ? 'Cargando...' : 'Obtener Productos'}
                    </button>
                  </div>
                )}

                {ep.name === 'Cancelaciones' && ep.status === 'active' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Limit"
                        value={cancelacionesFilters.limit}
                        onChange={(e) => setCancelacionesFilters({ ...cancelacionesFilters, limit: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Offset"
                        value={cancelacionesFilters.offset}
                        onChange={(e) => setCancelacionesFilters({ ...cancelacionesFilters, offset: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <button
                      onClick={getCancelaciones}
                      disabled={cancelacionesLoading}
                      className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 text-sm"
                    >
                      {cancelacionesLoading ? 'Cargando...' : 'Obtener Cancelaciones'}
                    </button>
                  </div>
                )}

                {ep.name === 'Obs. Segmentación' && ep.status === 'active' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Limit"
                        value={segmentacionFilters.limit}
                        onChange={(e) => setSegmentacionFilters({ ...segmentacionFilters, limit: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Offset"
                        value={segmentacionFilters.offset}
                        onChange={(e) => setSegmentacionFilters({ ...segmentacionFilters, offset: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <button
                      onClick={getSegmentacion}
                      disabled={segmentacionLoading}
                      className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 text-sm"
                    >
                      {segmentacionLoading ? 'Cargando...' : 'Obtener Segmentación'}
                    </button>
                  </div>
                )}

                {ep.name === 'Cajas Adicionales' && ep.status === 'active' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Limit"
                        value={cajasFilters.limit}
                        onChange={(e) => setCajasFilters({ ...cajasFilters, limit: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Offset"
                        value={cajasFilters.offset}
                        onChange={(e) => setCajasFilters({ ...cajasFilters, offset: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <button
                      onClick={getCajas}
                      disabled={cajasLoading}
                      className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 text-sm"
                    >
                      {cajasLoading ? 'Cargando...' : 'Obtener Cajas'}
                    </button>
                  </div>
                )}

                {ep.name === 'Treli Payment' && ep.status === 'active' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Payment ID"
                      value={treliPaymentId}
                      onChange={(e) => setTreliPaymentId(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                    <button
                      onClick={getTreliPayment}
                      disabled={treliLoading}
                      className="w-full px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 text-sm"
                    >
                      {treliLoading ? 'Cargando...' : 'Obtener Pago'}
                    </button>
                  </div>
                )}

                {ep.name === 'Treli Cobros' && ep.status === 'active' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        placeholder="Fecha inicio"
                        value={cobrosFilters.start_date}
                        onChange={(e) => setCobrosFilters({ ...cobrosFilters, start_date: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="date"
                        placeholder="Fecha fin"
                        value={cobrosFilters.end_date}
                        onChange={(e) => setCobrosFilters({ ...cobrosFilters, end_date: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Limit"
                        value={cobrosFilters.limit}
                        onChange={(e) => setCobrosFilters({ ...cobrosFilters, limit: e.target.value })}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Cursor (next)"
                        value={cobrosFilters.cursor}
                        onChange={(e) => setCobrosFilters({ ...cobrosFilters, cursor: e.target.value })}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <button
                      onClick={getCobros}
                      disabled={cobrosLoading}
                      className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 text-sm"
                    >
                      {cobrosLoading ? 'Cargando...' : 'Obtener Cobros'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {clientesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {clientesError}
            </div>
          )}

          {zohoError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {zohoError}
            </div>
          )}

          {zohoHistoryError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {zohoHistoryError}
            </div>
          )}

          {invoicesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {invoicesError}
            </div>
          )}

          {productsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {productsError}
            </div>
          )}

          {cancelacionesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {cancelacionesError}
            </div>
          )}

          {segmentacionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {segmentacionError}
            </div>
          )}

          {cajasError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {cajasError}
            </div>
          )}

          {treliError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {treliError}
            </div>
          )}

          {cobrosError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {cobrosError}
            </div>
          )}

          {(clientesData || zohoData || zohoHistoryData || invoicesData || productsData || cancelacionesData || segmentacionData || cajasData || treliData || cobrosData) && resultKey && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Resultado</h3>
                <span className="text-sm text-gray-500">
                  {resultKey === 'clientes' ? `${clientesData?.data?.length || 0} clientes` : 
                   resultKey === 'zohoHistory' ? `Historial: ${zohoHistoryData?.total_changes || 0} cambios` : 
                   resultKey === 'invoices' ? `${invoicesData?.data?.length || 0} facturas` :
                   resultKey === 'products' ? `${productsData?.data?.length || 0} productos` :
                   resultKey === 'cancelaciones' ? `${cancelacionesData?.data?.length || 0} cancelaciones` :
                   resultKey === 'segmentacion' ? `${segmentacionData?.data?.length || 0} registros` :
                   resultKey === 'cajas' ? `${cajasData?.data?.length || 0} cajas` :
                   resultKey === 'treli' ? 'Pago Treli' :
                   resultKey === 'cobros' ? `${cobrosData?.data?.length || 0} cobros` :
                   `${zohoData?.data?.length || 0} contacts`}
                </span>
              </div>
              <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(
                  resultKey === 'clientes' ? clientesData : 
                  resultKey === 'zohoHistory' ? zohoHistoryData : 
                  resultKey === 'invoices' ? invoicesData :
                  resultKey === 'products' ? productsData :
                  resultKey === 'cancelaciones' ? cancelacionesData :
                  resultKey === 'segmentacion' ? segmentacionData :
                  resultKey === 'cajas' ? cajasData :
                  resultKey === 'treli' ? treliData :
                  resultKey === 'cobros' ? cobrosData :
                  zohoData, 
                  null, 2
                )}
              </pre>
            </div>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Configuración</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Host de Base de Datos</label>
              <input
                type="text"
                value={config.wp_db_host}
                onChange={(e) => setConfig({ ...config, wp_db_host: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Puerto</label>
              <input
                type="text"
                value={config.wp_db_port}
                onChange={(e) => setConfig({ ...config, wp_db_port: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de Base de Datos</label>
              <input
                type="text"
                value={config.wp_db_name}
                onChange={(e) => setConfig({ ...config, wp_db_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuario de Base de Datos</label>
              <input
                type="text"
                value={config.wp_db_user}
                onChange={(e) => setConfig({ ...config, wp_db_user: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña de Base de Datos</label>
              <input
                type="password"
                value={config.wp_db_password}
                onChange={(e) => setConfig({ ...config, wp_db_password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prefijo de Tablas</label>
              <input
                type="text"
                value={config.wp_table_prefix}
                onChange={(e) => setConfig({ ...config, wp_table_prefix: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">API Token</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Token para llamadas externas</label>
              <input
                type="text"
                value={config.api_token || ''}
                onChange={(e) => setConfig({ ...config, api_token: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Zoho CRM OAuth</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client ID</label>
              <input
                type="text"
                value={config.zoho_client_id || ''}
                onChange={(e) => setConfig({ ...config, zoho_client_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Client Secret</label>
              <input
                type="password"
                value={config.zoho_client_secret || ''}
                onChange={(e) => setConfig({ ...config, zoho_client_secret: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Refresh Token</label>
              <input
                type="text"
                value={config.zoho_refresh_token || ''}
                onChange={(e) => setConfig({ ...config, zoho_refresh_token: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Treli API</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Authorization Token (Basic Auth)</label>
              <input
                type="text"
                value={config.treli_token || ''}
                onChange={(e) => setConfig({ ...config, treli_token: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">API Key (sk_live_...)</label>
              <input
                type="text"
                value={config.treli_api_key || ''}
                onChange={(e) => setConfig({ ...config, treli_api_key: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
            {configMsg && (
              <span className={`text-sm ${configMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {configMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Documentación API - Módulo 13 Biury</h2>
          
          {/* Autenticación */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <h3 className="text-lg font-semibold mb-3 text-red-800">Autenticación - IMPORTANTE</h3>
            <p className="text-sm text-red-700 mb-4">
              <strong>Todos los endpoints requieren autenticación</strong> mediante el token configurado en la pestaña "Configuración".
            </p>
            
            <div className="space-y-4">
              <div>
                <p className="font-medium text-sm text-red-800 mb-2">Cómo enviar el token:</p>
                <code className="text-xs bg-red-100 px-2 py-1 rounded block">
                  Authorization: Bearer TU_API_TOKEN
                </code>
              </div>
              
              <div>
                <p className="font-medium text-sm text-red-800 mb-2">Ejemplo completo con curl:</p>
                <pre className="text-xs bg-red-100 p-3 rounded overflow-x-auto">
{`# Reemplaza TU_API_TOKEN con el token configurado en "Configuración"
curl -X GET "https://workers.zeroazul.com/api/custom-module13/biury/clientes?limit=10" \\
  -H "Authorization: Bearer TU_API_TOKEN" \\
  -H "Accept: application/json"`}
                </pre>
              </div>
              
              <div className="bg-red-100 p-3 rounded">
                <p className="text-sm text-red-800">
                  <strong>Si no se envía el token correcto:</strong> Retornará error 401 Unauthorized
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            {/* WordPress Clientes */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-indigo-600">Clientes WordPress</h3>
              <p className="text-sm text-gray-600 mb-3">Usuarios de WordPress (excluye administradores) con metadatos</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-3">GET /api/custom-module13/biury/clientes</code>
              <div className="text-sm">
                <p className="font-medium mb-2">Parámetros:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>limit</code> - Límite de resultados (default: 100)</li>
                  <li><code>offset</code> - Offset para paginación (default: 0)</li>
                  <li><code>email</code> - Filtrar por email (contiene)</li>
                  <li><code>search</code> - Buscar en user_login, email o display_name</li>
                </ul>
              </div>
              <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
                <p className="font-medium">Ejemplos:</p>
                <code className="block text-gray-600">/api/custom-module13/biury/clientes?limit=50&offset=0</code>
                <code className="block text-gray-600">/api/custom-module13/biury/clientes?email=jessica</code>
                <code className="block text-gray-600">/api/custom-module13/biury/clientes?search=torres</code>
              </div>
            </div>

            {/* Zoho Contacts */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-indigo-600">Zoho Contacts</h3>
              <p className="text-sm text-gray-600 mb-3">Contactos de Zoho CRM</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-3">GET /api/custom-module13/zoho/contacts</code>
              <div className="text-sm">
                <p className="font-medium mb-2">Parámetros:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>limit</code> - Límite de resultados (default: 100)</li>
                  <li><code>offset</code> - Offset para paginación (default: 0)</li>
                  <li><code>email</code> - Filtrar por email exacto</li>
                  <li><code>phone</code> - Filtrar por teléfono</li>
                  <li><code>analyze</code> - Analizar campos de shipping (true/false)</li>
                </ul>
              </div>
              <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
                <p className="font-medium">Ejemplos:</p>
                <code className="block text-gray-600">/api/custom-module13/zoho/contacts?limit=50&offset=0</code>
                <code className="block text-gray-600">/api/custom-module13/zoho/contacts?email=test@biury.co</code>
                <code className="block text-gray-600">/api/custom-module13/zoho/contacts?phone=312</code>
              </div>
            </div>

            {/* Zoho Contact History */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-indigo-600">Zoho Historial Shipping</h3>
              <p className="text-sm text-gray-600 mb-3">Historial de cambios de dirección de envío</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-3">GET /api/custom-module13/zoho/contact</code>
              <div className="text-sm">
                <p className="font-medium mb-2">Parámetros:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>id</code> - ID del contacto en Zoho (requerido)</li>
                </ul>
              </div>
              <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
                <p className="font-medium">Ejemplo:</p>
                <code className="block text-gray-600">/api/custom-module13/zoho/contact?id=5406198000006575005</code>
              </div>
            </div>

            {/* Zoho Invoices */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-indigo-600">Zoho Invoices</h3>
              <p className="text-sm text-gray-600 mb-3">Facturación e historial de pedidos</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-3">GET /api/custom-module13/zoho/invoices</code>
              <div className="text-sm">
                <p className="font-medium mb-2">Parámetros:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>limit</code> - Límite de resultados (default: 50)</li>
                  <li><code>offset</code> - Offset para paginación (default: 0)</li>
                  <li><code>contact_id</code> - Filtrar por ID de contacto</li>
                  <li><code>invoice_number</code> - Filtrar por número de factura</li>
                </ul>
              </div>
              <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
                <p className="font-medium">Ejemplos:</p>
                <code className="block text-gray-600">/api/custom-module13/zoho/invoices?limit=50&offset=0</code>
                <code className="block text-gray-600">/api/custom-module13/zoho/invoices?contact_id=5406198000006575005</code>
                <code className="block text-gray-600">/api/custom-module13/zoho/invoices?invoice_number=5406198000031370196</code>
              </div>
            </div>

            {/* Zoho Products */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-indigo-600">Zoho Products</h3>
              <p className="text-sm text-gray-600 mb-3">Catálogo de productos</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-3">GET /api/custom-module13/zoho/products</code>
              <div className="text-sm">
                <p className="font-medium mb-2">Parámetros:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>limit</code> - Límite de resultados (default: 50)</li>
                  <li><code>offset</code> - Offset para paginación (default: 0)</li>
                  <li><code>category</code> - Filtrar por categoría</li>
                </ul>
              </div>
              <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
                <p className="font-medium">Ejemplos:</p>
                <code className="block text-gray-600">/api/custom-module13/zoho/products?limit=50&offset=0</code>
                <code className="block text-gray-600">/api/custom-module13/zoho/products?category=Limpieza</code>
              </div>
            </div>

            {/* Zoho Cancelaciones */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-indigo-600">Zoho Cancelaciones</h3>
              <p className="text-sm text-gray-600 mb-3">Cancelaciones de suscripciones</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-3">GET /api/custom-module13/zoho/cancelaciones</code>
              <div className="text-sm">
                <p className="font-medium mb-2">Parámetros:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>limit</code> - Límite de resultados (default: 50)</li>
                  <li><code>offset</code> - Offset para paginación (default: 0)</li>
                  <li><code>contact_id</code> - Filtrar por ID de contacto</li>
                  <li><code>status</code> - Filtrar por estado (Accion: Pausada, Cancelada, Activa)</li>
                </ul>
              </div>
              <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
                <p className="font-medium">Ejemplos:</p>
                <code className="block text-gray-600">/api/custom-module13/zoho/cancelaciones?limit=50&offset=0</code>
                <code className="block text-gray-600">/api/custom-module13/zoho/cancelaciones?status=Pausada</code>
              </div>
            </div>

            {/* Zoho Obs Segmentacion */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-indigo-600">Zoho Obs. Segmentación</h3>
              <p className="text-sm text-gray-600 mb-3">Observaciones de segmentación y despacho</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-3">GET /api/custom-module13/zoho/obs-segmentacion-desp</code>
              <div className="text-sm">
                <p className="font-medium mb-2">Parámetros:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>limit</code> - Límite de resultados (default: 50)</li>
                  <li><code>offset</code> - Offset para paginación (default: 0)</li>
                </ul>
              </div>
              <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
                <p className="font-medium">Ejemplo:</p>
                <code className="block text-gray-600">/api/custom-module13/zoho/obs-segmentacion-desp?limit=50&offset=0</code>
              </div>
            </div>

            {/* Zoho Cajas Adicionales */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-indigo-600">Zoho Cajas Adicionales</h3>
              <p className="text-sm text-gray-600 mb-3">Cajas adicionales de clientes</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-3">GET /api/custom-module13/zoho/cajas-adicionales</code>
              <div className="text-sm">
                <p className="font-medium mb-2">Parámetros:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>limit</code> - Límite de resultados (default: 50)</li>
                  <li><code>offset</code> - Offset para paginación (default: 0)</li>
                </ul>
              </div>
              <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
                <p className="font-medium">Ejemplo:</p>
                <code className="block text-gray-600">/api/custom-module13/zoho/cajas-adicionales?limit=50&offset=0</code>
              </div>
            </div>

            {/* Treli Payment */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-cyan-600">Treli Payment</h3>
              <p className="text-sm text-gray-600 mb-3">Datos de pago en Treli (old API)</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-3">GET /api/custom-module13/treli/payment</code>
              <div className="text-sm">
                <p className="font-medium mb-2">Parámetros:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>payment_id</code> - ID del pago (requerido)</li>
                </ul>
              </div>
              <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
                <p className="font-medium">Ejemplo:</p>
                <code className="block text-gray-600">/api/custom-module13/treli/payment?payment_id=12345</code>
              </div>
            </div>

            {/* Treli Cobros */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-cyan-600">Treli Cobros</h3>
              <p className="text-sm text-gray-600 mb-3">Cobros aprobados (solo status=paid)</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-3">GET /api/custom-module13/treli/cobros</code>
              <div className="text-sm">
                <p className="font-medium mb-2">Parámetros:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li><code>limit</code> - Límite de resultados (default: 100)</li>
                  <li><code>start_date</code> - Fecha inicio (YYYY-MM-DD)</li>
                  <li><code>end_date</code> - Fecha fin (YYYY-MM-DD)</li>
                  <li><code>cursor</code> - Cursor para paginación (next_cursor)</li>
                </ul>
              </div>
              <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
                <p className="font-medium">Ejemplos:</p>
                <code className="block text-gray-600">/api/custom-module13/treli/cobros?limit=50</code>
                <code className="block text-gray-600">/api/custom-module13/treli/cobros?start_date=2026-04-01&end_date=2026-04-18</code>
                <code className="block text-gray-600">/api/custom-module13/treli/cobros?cursor=col_xxx&limit=50</code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}