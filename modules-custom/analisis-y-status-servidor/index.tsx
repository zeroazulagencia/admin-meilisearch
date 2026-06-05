'use client';

import { useState, useEffect, useCallback } from 'react';

const BASE = '/api/custom-module21/analisis-y-status-servidor';

type TabId = 'servidores' | 'wordpress' | 'config' | 'criticos' | 'logs';

const tabs: { id: TabId; label: string }[] = [
  { id: 'servidores', label: 'Servidores' },
  { id: 'wordpress', label: 'WordPress' },
  { id: 'criticos', label: 'Criticos' },
  { id: 'config', label: 'Configuracion' },
  { id: 'logs', label: 'Logs' },
];

// ══════════════════════════════════
// TIPOS
// ══════════════════════════════════
interface ProcessInfo {
  user: string; pid: string; cpu: string; mem: string; vsz: string; rss: string;
  tty: string; state: string; start: string; time: string; command: string;
}
interface StatusData {
  hostname: string; kernel: string; uptime: string; loadAvg: string;
  disk: { total: string; used: string; avail: string; pct: number };
  memory: { total: string; used: string; avail: string; pct: number };
  swap: { total: string; used: string; pct: number } | null;
  topCpu: ProcessInfo[]; topMem: ProcessInfo[]; phpFpm: ProcessInfo[];
}
interface WpBlock {
  type: 'card-grid' | 'progress' | 'table' | 'list' | 'code' | 'pie';
  title: string;
  cards?: { label: string; value: string; color?: string }[];
  pct?: number;
  barLabel?: string;
  headers?: string[];
  rows?: string[][];
  items?: string[];
  count?: number;
  text?: string;
  pieDisk?: { total: number; used: number; totalLabel: string; usedLabel: string; pct: number };
  slices?: { label: string; value: number; humanSize: string; pct: number; color: string }[];
}

// ══════════════════════════════════
// COMPONENTES VISUALES
// ══════════════════════════════════

function Spinner() {
  return <div className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
}

function PieChart({ block, size = 180 }: { block: WpBlock; size?: number }) {
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Disk donut: total vs used
  if (block.pieDisk) {
    const { pct, usedLabel, totalLabel } = block.pieDisk;
    const usedOffset = circumference * (1 - pct / 100);
    const color = pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : '#3B82F6';
    return (
      <div className="flex flex-col items-center gap-3">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} />
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={+usedOffset.toFixed(2)}
            transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
          <text x={cx} y={cy - 6} textAnchor="middle" fill="#111827" style={{ fontSize: 22, fontWeight: 700 }}>{pct}%</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="#6B7280" style={{ fontSize: 10 }}>
            {usedLabel} / {totalLabel}
          </text>
        </svg>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} /> Usado {usedLabel}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-200" /> Libre</span>
        </div>
      </div>
    );
  }

  // Types donut: multi-segment
  if (block.slices && block.slices.length > 0) {
    const sorted = [...block.slices].sort((a, b) => b.pct - a.pct);
    let cumulativeOffset = 0;
    return (
      <div className="flex flex-col items-center gap-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#F3F4F6" strokeWidth={strokeWidth} />
          {sorted.map((slice, i) => {
            const segLen = (circumference * slice.pct) / 100;
            const dashArray = `${segLen.toFixed(1)} ${(circumference - segLen).toFixed(1)}`;
            const dashOffset = -cumulativeOffset;
            cumulativeOffset += segLen;
            return (
              <circle key={i} cx={cx} cy={cy} r={radius} fill="none" stroke={slice.color} strokeWidth={strokeWidth}
                strokeDasharray={dashArray} strokeDashoffset={dashOffset.toFixed(1)}
                transform={`rotate(-90 ${cx} ${cy})`} />
            );
          })}
        </svg>
        <div className="grid grid-cols-1 gap-1.5 w-full max-w-xs">
          {sorted.map((slice, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="text-gray-700 truncate">{slice.label}</span>
              <span className="text-gray-500 ml-auto font-mono">{slice.humanSize}</span>
              <span className="text-gray-400 font-mono w-8 text-right">{slice.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function ProgressBar({ pct, color = 'blue', label }: { pct: number; color?: string; label: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500', green: 'bg-green-500', yellow: 'bg-yellow-500',
    orange: 'bg-orange-500', red: 'bg-red-500',
  };
  const barColor = pct > 80 ? 'red' : pct > 60 ? 'orange' : color;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div className={`${colors[barColor] || 'bg-blue-500'} h-3 rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function DiskSection({ disk }: { disk: StatusData['disk'] }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide text-xs">Disco</h3>
      <ProgressBar pct={disk.pct} color="blue" label={`${disk.used} usado de ${disk.total}`} />
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white border rounded p-2">
          <div className="text-lg font-bold text-gray-900">{disk.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-white border rounded p-2">
          <div className="text-lg font-bold text-yellow-600">{disk.used}</div>
          <div className="text-xs text-gray-500">Usado</div>
        </div>
        <div className="bg-white border rounded p-2">
          <div className="text-lg font-bold text-green-600">{disk.avail}</div>
          <div className="text-xs text-gray-500">Disponible</div>
        </div>
      </div>
    </div>
  );
}

function MemorySection({ memory, swap }: { memory: StatusData['memory']; swap: StatusData['swap'] | null }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide text-xs">Memoria</h3>
      <ProgressBar pct={memory.pct} color="green" label={`${memory.used} usado de ${memory.total}`} />
      {swap && <ProgressBar pct={swap.pct} color="yellow" label={`Swap: ${swap.used} usado de ${swap.total}`} />}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white border rounded p-2">
          <div className="text-lg font-bold text-gray-900">{memory.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-white border rounded p-2">
          <div className="text-lg font-bold text-yellow-600">{memory.used}</div>
          <div className="text-xs text-gray-500">Usado</div>
        </div>
        <div className="bg-white border rounded p-2">
          <div className="text-lg font-bold text-green-600">{memory.avail}</div>
          <div className="text-xs text-gray-500">Disponible</div>
        </div>
      </div>
    </div>
  );
}

function SystemCard({ hostname, kernel, uptime, loadAvg }: { hostname: string; kernel: string; uptime: string; loadAvg: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border rounded p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Hostname</div>
          <div className="text-sm font-semibold text-gray-900 mt-1 truncate">{hostname}</div>
        </div>
        <div className="bg-white border rounded p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Kernel</div>
          <div className="text-sm font-semibold text-gray-900 mt-1">{kernel}</div>
        </div>
        <div className="bg-white border rounded p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Uptime</div>
          <div className="text-sm font-semibold text-gray-900 mt-1">{uptime}</div>
        </div>
        <div className="bg-white border rounded p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Load Avg</div>
          <div className="text-sm font-semibold text-gray-900 mt-1 font-mono">{loadAvg}</div>
        </div>
      </div>
    </div>
  );
}

function ProcessTable({ title, data, highlightCpu, highlightMem }: {
  title: string;
  data: ProcessInfo[];
  highlightCpu?: boolean;
  highlightMem?: boolean;
}) {
  if (!data.length) return null;
  const maxCpu = Math.max(...data.map(p => parseFloat(p.cpu)), 0);
  const maxMem = Math.max(...data.map(p => parseFloat(p.mem)), 0);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide text-xs">
        {title} <span className="text-gray-400 font-normal normal-case">({data.length} procesos)</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="text-left text-gray-500 uppercase tracking-wider border-b border-gray-300">
              <th className="py-2 pr-3">USER</th>
              <th className="py-2 pr-3">PID</th>
              {highlightCpu && <th className="py-2 pr-3 text-right">%CPU</th>}
              {highlightMem && <th className="py-2 pr-3 text-right">%MEM</th>}
              <th className="py-2 pr-3 text-right">RSS</th>
              <th className="py-2 pr-3">START</th>
              <th className="py-2">COMMAND</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => {
              const cpuPct = maxCpu > 0 ? (parseFloat(p.cpu) / maxCpu) * 100 : 0;
              const memPct = maxMem > 0 ? (parseFloat(p.mem) / maxMem) * 100 : 0;
              const isPhp = p.command.includes('php-fpm') || p.command.includes('php');
              const isMysql = p.command.includes('mysql');
              return (
                <tr key={i} className={`border-b border-gray-200 ${i % 2 === 0 ? 'bg-white' : ''}`}>
                  <td className="py-1.5 pr-3 text-gray-700">{p.user}</td>
                  <td className="py-1.5 pr-3 text-gray-500 font-mono">{p.pid}</td>
                  {highlightCpu && (
                    <td className="py-1.5 pr-3 text-right">
                      <span className={`font-mono ${parseFloat(p.cpu) > 1 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                        {p.cpu}%
                      </span>
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full inline-block ml-1 align-middle">
                        <div className={`h-1.5 rounded-full ${cpuPct > 50 ? 'bg-red-400' : cpuPct > 20 ? 'bg-yellow-400' : 'bg-blue-400'}`}
                          style={{ width: `${Math.min(cpuPct, 100)}%` }} />
                      </div>
                    </td>
                  )}
                  {highlightMem && (
                    <td className="py-1.5 pr-3 text-right">
                      <span className={`font-mono ${parseFloat(p.mem) > 1 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                        {p.mem}%
                      </span>
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full inline-block ml-1 align-middle">
                        <div className={`h-1.5 rounded-full ${memPct > 50 ? 'bg-red-400' : memPct > 20 ? 'bg-yellow-400' : 'bg-green-400'}`}
                          style={{ width: `${Math.min(memPct, 100)}%` }} />
                      </div>
                    </td>
                  )}
                  <td className="py-1.5 pr-3 text-right font-mono text-gray-600">{p.rss}</td>
                  <td className="py-1.5 pr-3 text-gray-500">{p.start}</td>
                  <td className="py-1.5">
                    <span className={`${isPhp ? 'text-purple-700 font-medium' : isMysql ? 'text-orange-700 font-medium' : 'text-gray-700'}`}>
                      {p.command}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════
// STRUCTURED BLOCKS — render genérico para WordPress
// ══════════════════════════════════

function StructuredBlocksView({ blocks }: { blocks: WpBlock[] }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-700 bg-green-50 border-green-200',
    yellow: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    red: 'text-red-700 bg-red-50 border-red-200',
  };

  const [logFilter, setLogFilter] = useState<string>('all');
  const [secFilter, setSecFilter] = useState<string>('all');
  const [tablePage, setTablePage] = useState<Record<number, number>>({});

  // Si hay tabla de logs, extraer tipos disponibles
  const availableTypes = new Set<string>();
  for (const block of blocks) {
    if (block.type === 'table' && block.headers?.includes('Tipo')) {
      block.rows?.forEach(r => {
        const tipo = r[2] || '';
        if (tipo.startsWith('E_') || tipo.startsWith('PHP')) availableTypes.add(tipo);
      });
    }
  }
  const logTypes = ['all', 'E_ERROR', ...Array.from(availableTypes)];

  // Extraer extensiones de archivos para filtro de auditoria de seguridad
  const availableExts = new Set<string>();
  for (const block of blocks) {
    if (block.type === 'table' && block.headers?.includes('Riesgo')) {
      block.rows?.forEach(r => {
        const filename = r[r.length - 1] || '';
        const ext = filename.includes('.') ? '.' + (filename.split('.').pop() || '') : '';
        if (ext && ext.length < 10) availableExts.add(ext);
      });
    }
  }
  const fileExts = Array.from(availableExts).sort();

  function tipoColor(tipo: string): string {
    if (tipo.includes('FATAL') || tipo === 'E_ERROR' || tipo === 'E_COMPILE_ERROR') return 'text-red-700 bg-red-50 font-semibold';
    if (tipo.includes('WARNING') || tipo === 'E_WARNING' || tipo === 'E_CORE_WARNING' || tipo === 'E_USER_WARNING') return 'text-yellow-700 bg-yellow-50';
    if (tipo.includes('DEPRECATED') || tipo === 'E_DEPRECATED' || tipo === 'E_USER_DEPRECATED') return 'text-blue-700 bg-blue-50';
    if (tipo.includes('NOTICE') || tipo === 'E_NOTICE' || tipo === 'E_USER_NOTICE' || tipo === 'E_STRICT') return 'text-gray-600 bg-gray-50';
    return 'text-gray-700';
  }

  function tipoGroup(tipo: string): string {
    if (['E_ERROR', 'E_COMPILE_ERROR', 'E_CORE_ERROR', 'E_PARSE', 'PHP Fatal error'].includes(tipo)) return 'error';
    if (['E_WARNING', 'E_CORE_WARNING', 'E_COMPILE_WARNING', 'E_USER_WARNING', 'PHP Warning', 'PHP Startup'].includes(tipo)) return 'warning';
    if (['E_DEPRECATED', 'E_USER_DEPRECATED', 'PHP Deprecated'].includes(tipo)) return 'deprecated';
    return 'notice';
  }

  const filterPills = [
    { key: 'all', label: 'Todos' },
    { key: 'error', label: 'Errores', color: 'text-red-700' },
    { key: 'warning', label: 'Warnings', color: 'text-yellow-700' },
    { key: 'deprecated', label: 'Deprecated', color: 'text-blue-700' },
    { key: 'notice', label: 'Notices', color: 'text-gray-600' },
  ];

  function shouldShowRow(row: string[]): boolean {
    if (logFilter === 'all') return true;
    const tipo = row[2] || '';
    return tipoGroup(tipo) === logFilter;
  }

  return (
    <>
      {(() => {
        const pieBlocks: { node: React.ReactNode; idx: number }[] = [];

        function makeNode(block: WpBlock, i: number): React.ReactNode {
          if (block.type === 'card-grid') {
            return (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide text-xs">{block.title}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {block.cards?.map((card, j) => {
                    const colorClass = card.color ? colorMap[card.color] || 'bg-white border-gray-200' : 'bg-white border-gray-200';
                    return (
                      <div key={j} className={`border rounded-lg p-3 ${colorClass}`}>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</div>
                        <div className="text-sm font-semibold text-gray-900 mt-1">{card.value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (block.type === 'list') {
            return (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide text-xs">
                  {block.title} <span className="text-gray-400 font-normal normal-case">({block.count || block.items?.length || 0})</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                  {block.items?.map((item, j) => (
                    <div key={j} className="bg-white border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-800 truncate" title={item}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (block.type === 'table') {
            const isLogTable = block.headers?.includes('Tipo');
            const isSecurityTable = block.headers?.includes('Riesgo');
            const isFileAuditTable = block.title?.startsWith('Archivos') && block.headers?.includes('Ruta');
            const filteredRows = isLogTable ? (block.rows || []).filter(shouldShowRow) : isSecurityTable ? (block.rows || []).filter(r => secFilter === 'all' || (r[r.length - 1] || '').endsWith(secFilter)) : (block.rows || []);
            const PAGE_SIZE = 15;
            const totalPages = isLogTable ? 1 : Math.ceil(filteredRows.length / PAGE_SIZE);
            const page = tablePage[i] || 0;
            const safePage = Math.min(page, Math.max(0, totalPages - 1));
            const pagedRows = isLogTable ? filteredRows : filteredRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
            return (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide text-xs">{block.title}</h3>
                {isLogTable && (
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    {filterPills.map(p => {
                      const count = p.key === 'all'
                        ? (block.rows?.length || 0)
                        : (block.rows || []).filter(r => tipoGroup(r[2] || '') === p.key).length;
                      return (
                        <button key={p.key} type="button" onClick={() => setLogFilter(p.key)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                            logFilter === p.key
                              ? 'bg-gray-800 text-white border-gray-800'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                          }`}>
                          {p.label} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
                {isSecurityTable && fileExts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    <button type="button" onClick={() => setSecFilter('all')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                        secFilter === 'all'
                          ? 'bg-gray-800 text-white border-gray-800'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                      }`}>
                      Todos ({block.rows?.length || 0})
                    </button>
                    {fileExts.map(ext => {
                      const count = (block.rows || []).filter(r => (r[r.length - 1] || '').endsWith(ext)).length;
                      return (
                        <button key={ext} type="button" onClick={() => setSecFilter(ext)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                            secFilter === ext
                              ? 'bg-gray-800 text-white border-gray-800'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                          }`}>
                          {ext} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs whitespace-nowrap">
                    <thead>
                      <tr className="text-left text-gray-500 uppercase tracking-wider border-b border-gray-300">
                        {block.headers?.map((h, j) => (
                          <th key={j} className="py-2 pr-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((row, r) => {
                        const isLogTypeCol = isLogTable && row[2];
                        return (
                        <tr key={r} className={`border-b border-gray-200 ${r % 2 === 0 ? 'bg-white' : ''}`}>
                          {row.map((cell, c) => {
                            // Color Riesgo column (security audit) — filename column break
                            if (isSecurityTable && c === 0) {
                              const riskColor = cell === 'CRITICO' ? 'text-red-700 bg-red-50 font-semibold'
                                : cell === 'ALTO' ? 'text-orange-700 bg-orange-50'
                                : cell === 'MEDIO' ? 'text-yellow-700 bg-yellow-50'
                                : 'text-green-700 bg-green-50';
                              return <td key={c} className={`py-1.5 pr-3 rounded ${riskColor}`}>{cell}</td>;
                            }
                            // Filename column in security table — allow wrapping
                            if (isSecurityTable && c === row.length - 1) {
                              return <td key={c} className="py-1.5 pr-3 text-gray-700 break-all whitespace-normal">{cell}</td>;
                            }
                            // Color Tipo column (log table)
                            if (isLogTable && c === 2) {
                              return <td key={c} className={`py-1.5 pr-3 rounded ${tipoColor(cell)}`}>{cell}</td>;
                            }
                            // Color status column (last)
                            if (c === row.length - 1 && !isLogTable && !isSecurityTable) {
                              return (
                                <td key={c} className={`py-1.5 pr-3 text-gray-700${isFileAuditTable ? ' break-all whitespace-normal' : ''}`}>
                                  <span className={`${cell.toLowerCase() === 'active' || cell.toLowerCase() === 'must-use' ? 'text-green-700 font-medium' : cell.toLowerCase() === 'inactive' ? 'text-red-600' : ''}`}>{cell}</span>
                                </td>
                              );
                            }
                            return <td key={c} className="py-1.5 pr-3 text-gray-700">{cell}</td>;
                          })}
                        </tr>
                        );})}
                    </tbody>
                  </table>
                </div>
                {!isLogTable && totalPages > 1 && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                    <button type="button" disabled={safePage === 0} onClick={() => setTablePage(p => ({ ...p, [i]: safePage - 1 }))}
                      className={`px-2 py-1 rounded border ${safePage === 0 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
                      Anterior
                    </button>
                    <span>Pagina {safePage + 1} de {totalPages} ({filteredRows.length} archivos)</span>
                    <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setTablePage(p => ({ ...p, [i]: safePage + 1 }))}
                      className={`px-2 py-1 rounded border ${safePage >= totalPages - 1 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            );
          }

          if (block.type === 'code') {
            return (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide text-xs">{block.title}</h3>
                <pre className="text-sm text-gray-800 bg-white border border-gray-200 rounded p-3 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{block.text}</pre>
              </div>
            );
          }

          if (block.type === 'progress') {
            return (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide text-xs">{block.title}</h3>
                <ProgressBar pct={block.pct || 0} label={block.barLabel || ''} />
              </div>
            );
          }

          if (block.type === 'pie') {
            return (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide text-xs">{block.title}</h3>
                <PieChart block={block} />
              </div>
            );
          }

          return null;
        }

        const result: React.ReactNode[] = [];

        function flushPies() {
          if (pieBlocks.length === 0) return;
          if (pieBlocks.length === 1) {
            result.push(pieBlocks[0].node);
          } else {
            result.push(
              <div key={`pie-grid-${pieBlocks[0].idx}`} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pieBlocks.map(pb => pb.node)}
              </div>
            );
          }
          pieBlocks.length = 0;
        }

        blocks.forEach((block, i) => {
          const node = makeNode(block, i);
          if (block.type === 'pie' && node) {
            pieBlocks.push({ node, idx: i });
          } else {
            flushPies();
            if (node) result.push(node);
          }
        });
        flushPies();

        return result;
      })()}
    </>
  );
}

// ══════════════════════════════════
// LOG TABLE VIEWER — formatea logs como tabla con filtros
// ══════════════════════════════════

function LogTableViewer({ output, label }: { output: string; label: string }) {
  const [logLevelFilter, setLogLevelFilter] = useState<string>('all');
  const [logTablePage, setLogTablePage] = useState(0);

  // Parse lineas y detectar nivel
  const lines = output.split('\n').filter(l => l.trim());
  const parsed = lines.map((line, idx) => {
    // Detectar nivel en la linea
    let level = 'info';
    const upper = line.toUpperCase();
    if (/FATAL|CRITICAL|EMERG/i.test(upper)) level = 'fatal';
    else if (/ERROR|FAILED|DENIED|REFUSED|SEVERE/i.test(upper)) level = 'error';
    else if (/WARN(ING)?/i.test(upper)) level = 'warn';
    else if (/NOTICE|INFO|DEBUG/i.test(upper)) level = 'info';
    else if (/TRACE|VERBOSE/i.test(upper)) level = 'debug';
    return { line, level, idx };
  });

  // Contar por nivel
  const counts: Record<string, number> = { all: parsed.length };
  for (const p of parsed) {
    counts[p.level] = (counts[p.level] || 0) + 1;
  }

  // Niveles disponibles
  const levels = [
    { key: 'all', label: 'Todos' },
    { key: 'fatal', label: 'Fatal', cls: 'text-red-700 bg-red-100' },
    { key: 'error', label: 'Error', cls: 'text-orange-700 bg-orange-50' },
    { key: 'warn', label: 'Warning', cls: 'text-yellow-700 bg-yellow-50' },
    { key: 'info', label: 'Info', cls: 'text-blue-700 bg-blue-50' },
    { key: 'debug', label: 'Debug', cls: 'text-gray-500 bg-gray-100' },
  ];

  const filtered = logLevelFilter === 'all' ? parsed : parsed.filter(p => p.level === logLevelFilter);
  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(logTablePage, Math.max(0, totalPages - 1));
  const pagedRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function levelBadge(level: string) {
    const lvl = levels.find(l => l.key === level);
    if (!lvl || lvl.key === 'all') return null;
    return <span className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded ${lvl.cls}`}>{level.toUpperCase()}</span>;
  }

  function levelClass(level: string) {
    if (level === 'fatal') return 'text-red-700 bg-red-50 font-semibold';
    if (level === 'error') return 'text-orange-700 bg-orange-50';
    if (level === 'warn') return 'text-yellow-700 bg-yellow-50';
    if (level === 'info') return 'text-blue-700 bg-blue-50';
    if (level === 'debug') return 'text-gray-500';
    return '';
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 truncate">{label}</h3>
        <span className="text-xs text-gray-400">{lines.length} lineas</span>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {levels.map(l => (
          <button key={l.key} type="button" onClick={() => { setLogLevelFilter(l.key); setLogTablePage(0); }}
            className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
              logLevelFilter === l.key
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
            }`}>
            {l.label} ({counts[l.key] || 0})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="text-left text-gray-500 uppercase tracking-wider border-b border-gray-300">
              <th className="py-2 pr-3 w-14">Nivel</th>
              <th className="py-2 pr-3">Linea</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((p) => (
              <tr key={p.idx} className={`border-b border-gray-200 ${p.idx % 2 === 0 ? 'bg-white' : ''}`}>
                <td className={`py-1.5 pr-3 rounded ${levelClass(p.level)}`}>
                  {levelBadge(p.level)}
                </td>
                <td className="py-1.5 pr-3 text-gray-700 font-mono whitespace-pre-wrap break-all">{p.line}</td>
              </tr>
            ))}
            {pagedRows.length === 0 && (
              <tr><td colSpan={2} className="py-4 text-center text-gray-400 text-xs">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
          <button type="button" disabled={safePage === 0} onClick={() => setLogTablePage(p => p - 1)}
            className={`px-2 py-1 rounded border ${safePage === 0 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
            Anterior
          </button>
          <span>Pagina {safePage + 1} de {totalPages} ({filtered.length} lineas)</span>
          <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setLogTablePage(p => p + 1)}
            className={`px-2 py-1 rounded border ${safePage >= totalPages - 1 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════

export default function AnalisisStatusServidor({ moduleData }: { moduleData?: { id: number; title: string } }) {
  const [activeTab, setActiveTab] = useState<TabId>('servidores');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');

  // Servidores
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [sshLoading, setSshLoading] = useState(false);

  // WordPress
  const [wpBlocks, setWpBlocks] = useState<WpBlock[] | null>(null);
  const [wpLoadingSite, setWpLoadingSite] = useState(false);
  const [wpLoadingPlugins, setWpLoadingPlugins] = useState(false);
  const [wpLoadingLogs, setWpLoadingLogs] = useState(false);
  const [wpLoadingAuditor, setWpLoadingAuditor] = useState(false);
  const [wpLoadingSecurity, setWpLoadingSecurity] = useState(false);

  // Criticos
  const [critBlocks, setCritBlocks] = useState<WpBlock[] | null>(null);
  const [critLoading, setCritLoading] = useState(false);

  // Config
  const [saveSuccess, setSaveSuccess] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [wpCacheStatus, setWpCacheStatus] = useState<string | null>(null);
  const [wpCacheColor, setWpCacheColor] = useState<string>('yellow');
  const [wpCacheLoading, setWpCacheLoading] = useState(false);
  const [flushCacheBlocks, setFlushCacheBlocks] = useState<any[] | null>(null);
  const [flushCacheLoading, setFlushCacheLoading] = useState(false);

  // Logs
  const [logCategory, setLogCategory] = useState('nginx-ssl');
  const [selectedLogKey, setSelectedLogKey] = useState<string | null>(null);
  const [logOutputs, setLogOutputs] = useState<Record<string, string>>({});
  const [logLoading, setLogLoading] = useState<Record<string, boolean>>({});
  const [logInfos, setLogInfos] = useState<Record<string, { label: string; desc: string }>>({});

  const LOG_CATEGORIES = [
    { id: 'nginx-ssl', label: 'NGINX 443' },
    { id: 'nginx-8080', label: 'NGINX 8080' },
    { id: 'php', label: 'PHP' },
    { id: 'mysql', label: 'MySQL' },
    { id: 'sistema', label: 'Sistema' },
    { id: 'wordpress', label: 'WordPress' },
    { id: 'hermes', label: 'Hermes' },
  ];

  const LOG_FILES_BY_CATEGORY: Record<string, { key: string; label: string; desc: string; source: string }[]> = {
    'nginx-ssl': [
      { key: 'project_access', label: 'project_access.log', desc: 'Trafico del sitio (X-RDWR-IP)', source: 'ssh' },
      { key: 'project_error', label: 'project_error.log', desc: 'Errores de nginx (comfamiliar)', source: 'ssh' },
      { key: 'nginx_access', label: 'access.log', desc: 'Trafico default server', source: 'ssh' },
      { key: 'nginx_error', label: 'error.log', desc: 'Errores generales nginx', source: 'ssh' },
    ],
    'nginx-8080': [
      { key: 'puerto8080_access', label: 'puerto8080_access.log', desc: 'Trafico puerto 8080', source: 'ssh' },
      { key: 'puerto8080_error', label: 'puerto8080_error.log', desc: 'Errores puerto 8080', source: 'ssh' },
    ],
    'php': [
      { key: 'php8_3_fpm', label: 'php8.3-fpm.log', desc: 'PHP-FPM activo (~5 KB)', source: 'ssh' },
      { key: 'php8_4_fpm', label: 'php8.4-fpm.log', desc: 'PHP-FPM 8.4 (inactivo)', source: 'ssh' },
      { key: 'php8_4_slow', label: 'php8.4-fpm.slow.log', desc: 'Scripts lentos (~37 KB)', source: 'ssh' },
    ],
    'mysql': [
      { key: 'mysql_error', label: 'mysql/error.log', desc: 'Errores de MySQL (568,190 lineas)', source: 'ssh' },
    ],
    'sistema': [
      { key: 'syslog', label: 'syslog', desc: 'Log del sistema (~8 MB diarios)', source: 'ssh' },
      { key: 'auth', label: 'auth.log', desc: 'Intentos SSH/sudo (~10 MB)', source: 'ssh' },
      { key: 'kern', label: 'kern.log', desc: 'Kernel (~5 MB)', source: 'ssh' },
      { key: 'dpkg', label: 'dpkg.log', desc: 'Paquetes instalados', source: 'ssh' },
    ],
    'wordpress': [
      { key: 'wp_debug', label: 'wp-content/debug.log', desc: 'Errores PHP/WP (~38 MB)', source: 'ssh' },
    ],
    'hermes': [
      { key: 'hermes_agent', label: 'agent.log', desc: 'Log de Hermes Agent (~473 KB)', source: 'local' },
      { key: 'hermes_errors', label: 'errors.log', desc: 'Errores de Hermes (~13 KB)', source: 'local' },
      { key: 'hermes_gateway', label: 'gateway.log', desc: 'Gateway de Hermes (~212 KB)', source: 'local' },
    ],
  };

  const fetchLog = useCallback(async (logKey: string, source: string) => {
    setErrorMsg('');
    setLogLoading(prev => ({ ...prev, [logKey]: true }));
    try {
      const url = source === 'local' ? `${BASE}/read-local-log/` : `${BASE}/ssh/`;
      const body = source === 'local'
        ? JSON.stringify({ logKey, lines: 100 })
        : JSON.stringify({ command: 'read-log', logKey, lines: 100 });
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error');
      setLogOutputs(prev => ({ ...prev, [logKey]: json.output }));
      if (json.logInfo) setLogInfos(prev => ({ ...prev, [logKey]: json.logInfo }));
    } catch (e: any) { setErrorMsg(e?.message || 'Error de red'); }
    finally { setLogLoading(prev => ({ ...prev, [logKey]: false })); }
  }, []);

  const fetchConfig = useCallback(async () => {
    setErrorMsg('');
    setConfigLoading(true);
    try {
      const res = await fetch(`${BASE}/config/`, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok && json.config) setConfig(json.config);
    } catch (e: any) { setErrorMsg(e?.message || 'Error de red'); }
    finally { setConfigLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === 'config') { fetchConfig(); } }, [activeTab, fetchConfig]);
  useEffect(() => { if (activeTab === 'servidores' && statusData) { fetchWpCacheStatus(); } }, [activeTab, statusData]);

  async function fetchWpCacheStatus() {
    setErrorMsg('');
    setWpCacheStatus(null);
    setWpCacheLoading(true);
    try {
      const res = await fetch(`${BASE}/ssh/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'wp-config-status' }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error SSH');
      if (json.structured?.[0]?.cards?.[0]) {
        setWpCacheStatus(json.structured[0].cards[0].value);
        setWpCacheColor(json.structured[0].cards[0].color || 'yellow');
      }
    } catch (e: any) { setErrorMsg(e?.message || 'Error de red'); }
    finally { setWpCacheLoading(false); }
  }

  async function runFlushCaches() {
    setErrorMsg('');
    setFlushCacheBlocks(null);
    setFlushCacheLoading(true);
    try {
      const res = await fetch(`${BASE}/ssh/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'flush-caches' }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error SSH');
      if (json.structured) setFlushCacheBlocks(json.structured);
    } catch (e: any) { setErrorMsg(e?.message || 'Error de red'); }
    finally { setFlushCacheLoading(false); }
  }

  async function runWpCommand(command: string, setLoading: (v: boolean) => void) {
    setErrorMsg('');
    setWpBlocks(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/ssh/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error SSH');
      if (json.structured) setWpBlocks(json.structured);
    } catch (e: any) { setErrorMsg(e?.message || 'Error de red'); }
    finally { setLoading(false); }
  }

  async function runCritCommand(command: string) {
    setErrorMsg('');
    setCritBlocks(null);
    setCritLoading(true);
    try {
      const res = await fetch(`${BASE}/ssh/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error SSH');
      if (json.structured) setCritBlocks(json.structured);
    } catch (e: any) { setErrorMsg(e?.message || 'Error de red'); }
    finally { setCritLoading(false); }
  }

  async function fetchStatus() {
    setErrorMsg('');
    setStatusData(null);
    setSshLoading(true);
    try {
      const res = await fetch(`${BASE}/ssh/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'status' }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Error SSH');
      setStatusData(json.structured);
    } catch (e: any) { setErrorMsg(e?.message || 'Error de red'); }
    finally { setSshLoading(false); }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{moduleData?.title || 'Analisis y status servidor'}</h2>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{tab.label}</button>
        ))}
      </div>

      {errorMsg && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 whitespace-pre-wrap font-mono">{errorMsg}</div>
      )}

      {/* ════════ SERVIDORES ════════ */}
      {activeTab === 'servidores' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Estado del servidor</h3>
            <button type="button" disabled={sshLoading} onClick={fetchStatus}
              className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors flex items-center gap-2 ${
                sshLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}>
              {sshLoading && <Spinner />}
              Consultar status
            </button>
          </div>

          {sshLoading && !statusData && (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Spinner /> Consultando servidor...</div>
          )}

          {statusData && !sshLoading && (
            <div className="space-y-4">
              <SystemCard hostname={statusData.hostname} kernel={statusData.kernel} uptime={statusData.uptime} loadAvg={statusData.loadAvg} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DiskSection disk={statusData.disk} />
                <MemorySection memory={statusData.memory} swap={statusData.swap} />
              </div>
              <ProcessTable title="TOP CPU" data={statusData.topCpu} highlightCpu />
              <ProcessTable title="TOP MEM" data={statusData.topMem} highlightMem />
              <ProcessTable title="PHP-FPM Workers" data={statusData.phpFpm} highlightCpu highlightMem />
            </div>
          )}

          {/* Estado de caches */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide text-xs">WP_CACHE</h3>
            {wpCacheLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500"><Spinner /> Consultando...</div>
            ) : wpCacheStatus ? (
              <div className={`inline-block border rounded-lg px-4 py-2 text-sm font-semibold ${
                wpCacheColor === 'green' ? 'text-green-700 bg-green-50 border-green-200' : 'text-yellow-700 bg-yellow-50 border-yellow-200'
              }`}>
                {wpCacheStatus}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No disponible</div>
            )}
          </div>

          {/* Boton borrado cache fuerte */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide text-xs">Cache fuerte</h3>
            <p className="text-xs text-gray-500">Limpia Nginx, PHP-FPM, transients WordPress, temporales y object cache.</p>
            <button type="button" disabled={flushCacheLoading} onClick={runFlushCaches}
              className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors flex items-center gap-2 ${
                flushCacheLoading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
              }`}>
              {flushCacheLoading && <Spinner />}
              Borrado cache fuerte
            </button>
            {flushCacheBlocks && flushCacheBlocks.length > 0 && (
              <div className="space-y-2">
                {flushCacheBlocks.map((block: any, i: number) => (
                  block.type === 'card-grid' ? (
                    <div key={i} className="flex items-center gap-3">
                      {block.cards?.map((card: any, j: number) => (
                        <span key={j} className={`text-sm font-semibold ${
                          card.color === 'green' ? 'text-green-700' : 'text-red-700'
                        }`}>{card.value}</span>
                      ))}
                    </div>
                  ) : block.type === 'code' ? (
                    <pre key={i} className="text-xs text-gray-800 bg-white border border-gray-200 rounded p-3 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{block.text}</pre>
                  ) : null
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════ WORDPRESS ════════ */}
      {activeTab === 'wordpress' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {([
              ['Estado del sitio', 'wp-site', wpLoadingSite, setWpLoadingSite] as const,
              ['Plugins', 'wp-plugins', wpLoadingPlugins, setWpLoadingPlugins] as const,
            ]).map(([label, cmd, loading, setLoading]) => (
              <button key={cmd} type="button" disabled={loading} onClick={() => runWpCommand(cmd, setLoading)}
                className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors flex items-center gap-2 ${
                  loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}>
                {loading && <Spinner />}{label}
              </button>
            ))}
            <button type="button" disabled={wpLoadingAuditor} onClick={() => runWpCommand('wp-file-audit', setWpLoadingAuditor)}
              className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors flex items-center gap-2 ${
                wpLoadingAuditor ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
              }`}>
              {wpLoadingAuditor && <Spinner />}Auditor archivos
            </button>
            <button type="button" disabled={wpLoadingSecurity} onClick={() => runWpCommand('wp-security-audit', setWpLoadingSecurity)}
              className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors flex items-center gap-2 ${
                wpLoadingSecurity ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
              }`}>
              {wpLoadingSecurity && <Spinner />}Auditoria seguridad
            </button>
          </div>
          {wpBlocks && wpBlocks.length > 0 && !wpLoadingSite && !wpLoadingPlugins && !wpLoadingLogs && !wpLoadingAuditor && !wpLoadingSecurity && (
            <div className="space-y-4">
              <StructuredBlocksView blocks={wpBlocks} />
            </div>
          )}
        </div>
      )}

      {/* ════════ CRITICOS ════════ */}
      {activeTab === 'criticos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={critLoading} onClick={() => runCritCommand('crit-precheck')}
              className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors flex items-center gap-2 ${
                critLoading ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
              }`}>
              {critLoading && <Spinner />}Pre-verificar
            </button>
            <button type="button" disabled={critLoading} onClick={() => runCritCommand('crit-kill')}
              className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors flex items-center gap-2 ${
                critLoading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
              }`}>
              {critLoading && <Spinner />}Liberar procesos
            </button>
            <button type="button" disabled={critLoading} onClick={() => runCritCommand('crit-restart-nginx')}
              className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors flex items-center gap-2 ${
                critLoading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
              }`}>
              {critLoading && <Spinner />}Reiniciar Nginx
            </button>
          </div>
          {critBlocks && critBlocks.length > 0 && !critLoading && (
            <div className="space-y-4">
              <StructuredBlocksView blocks={critBlocks} />
            </div>
          )}
        </div>
      )}

      {/* ════════ CONFIG ════════ */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          {configLoading && <div className="flex items-center gap-2 text-sm text-gray-500"><Spinner /> Cargando configuracion...</div>}
          {saveSuccess && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">{saveSuccess}</div>}

          {!configLoading && (
            <>
              {/* SSH Config */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide text-xs">Configuracion SSH</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['usuario', 'ip', 'puerto', 'password'] as const).map(field => (
                  <div key={field} className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 capitalize">{field === 'puerto' ? 'Puerto' : field === 'usuario' ? 'Usuario' : field.toUpperCase()}</label>
                    <input type={field === 'password' ? 'password' : 'text'}
                      value={config[field] || ''}
                      onChange={e => setConfig(prev => ({ ...prev, [field]: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={field === 'password' ? '......' : field === 'ip' ? '192.168.1.1' : field === 'puerto' ? '22' : 'root'} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button type="button" disabled={configSaving}
                  onClick={async () => {
                    setErrorMsg(''); setSaveSuccess(''); setConfigSaving(true);
                    try {
                      const res = await fetch(`${BASE}/config/`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ usuario: config.usuario || '', ip: config.ip || '', puerto: config.puerto || '', password: config.password || '' }),
                      });
                      const json = await res.json();
                      if (!json.ok) throw new Error(json.error || 'Error al guardar');
                      setSaveSuccess('Configuracion guardada correctamente');
                      setTimeout(() => setSaveSuccess(''), 3000);
                    } catch (e: any) { setErrorMsg(e?.message || 'Error de red'); }
                    finally { setConfigSaving(false); }
                  }}
                  className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors flex items-center gap-2 ${
                    configSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}>
                  {configSaving && <Spinner />}
                  Guardar configuracion
                </button>
              </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════ LOGS ════════ */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Sub-tabs por categoria */}
          <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
            {LOG_CATEGORIES.map(cat => (
              <button key={cat.id} type="button" onClick={() => { setLogCategory(cat.id); setErrorMsg(''); setSelectedLogKey(null); }}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px whitespace-nowrap ${
                  logCategory === cat.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>{cat.label}</button>
            ))}
          </div>

          {/* Archivos de la categoria activa como tabs */}
          <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
            {LOG_FILES_BY_CATEGORY[logCategory]?.map(f => (
              <button key={f.key} type="button" disabled={logLoading[f.key]}
                onClick={() => {
                  if (!logOutputs[f.key]) fetchLog(f.key, f.source);
                  setSelectedLogKey(f.key);
                }}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5 ${
                  selectedLogKey === f.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {logLoading[f.key] && <Spinner />}
                {f.label}
              </button>
            ))}
          </div>

          {/* Output del log seleccionado */}
          {selectedLogKey && logOutputs[selectedLogKey] && (
            <LogTableViewer key={selectedLogKey} output={logOutputs[selectedLogKey]} label={logInfos[selectedLogKey]?.label || selectedLogKey} />
          )}
        </div>
      )}
    </div>
  );
}