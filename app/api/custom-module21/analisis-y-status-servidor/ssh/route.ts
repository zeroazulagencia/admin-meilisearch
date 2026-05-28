import { NextRequest, NextResponse } from 'next/server';
import { getAllConfig } from '@/utils/modulos/analisis-y-status-servidor-21/config';
import { query } from '@/utils/db';
import { Client } from 'ssh2';

export const dynamic = 'force-dynamic';

// ── Comandos permitidos ──
const ALLOWED_COMMANDS: Record<string, string> = {
  status: 'SYS_STRUCTURED', // especial: retorna JSON estructurado
  uptime: 'uptime',
  disk: 'df -h /',
  memory: 'free -h',
  os: 'uname -a',
  processes: 'ps aux --sort=-%mem | head -15',
  docker: 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker no disponible"',
  nginx: 'nginx -t 2>&1; echo "---"; systemctl status nginx --no-pager 2>/dev/null | head -10 || echo "Nginx no disponible"',
  'wp-site': `echo "=== DIR ==="; ls -la /var/www/comunicacionesnew/ 2>/dev/null | head -5; echo "---"; echo "=== WP-CONFIG ==="; head -25 /var/www/comunicacionesnew/wp-config.php 2>/dev/null || echo "No encontrado"; echo "---"; echo "=== VERSION ==="; grep "\\$wp_version" /var/www/comunicacionesnew/wp-includes/version.php 2>/dev/null || echo "No version.php"; echo "---"; echo "=== WP-CLI ==="; which wp 2>/dev/null && wp --path=/var/www/comunicacionesnew core version 2>/dev/null || echo "WP-CLI no disponible"; echo "---"; echo "=== THEMES ==="; ls /var/www/comunicacionesnew/wp-content/themes/ 2>/dev/null | head -10`,
  'wp-plugins': `echo "=== PLUGINS ==="; ls -d /var/www/comunicacionesnew/wp-content/plugins/*/ 2>/dev/null | while read p; do echo "  $(basename $p)"; done; echo "---"; echo "=== WP-CLI ==="; which wp >/dev/null 2>&1 && wp --path=/var/www/comunicacionesnew plugin list --format=table 2>/dev/null || echo "WP-CLI no disponible para status"`,
'wp-logs': `echo "=== PHP-FPM ==="; n=$(pgrep -ac php-fpm 2>/dev/null); if [ "$n" -gt 0 ] 2>/dev/null; then echo "Activo ($n procesos)"; pgrep -al php-fpm 2>/dev/null | head -5; else echo "No PHP-FPM detectado"; fi; echo "---"; echo "=== NGINX ==="; ls /etc/nginx/sites-enabled/ 2>/dev/null | head -10; echo "---"; echo "=== DEBUG.LOG ==="; tail -30 /var/www/comunicacionesnew/wp-content/debug.log 2>/dev/null || echo "No debug.log"; echo "---"; echo "=== PHP ERROR LOG ==="; tail -20 /var/log/php*-fpm.log 2>/dev/null || echo "No php log"; echo "---"; echo "=== DISK WP ==="; du -sh /var/www/comunicacionesnew/ 2>/dev/null`,
'wp-security-audit': `echo "=== SCAN ==="; find /var/www/comunicacionesnew/ -type f -name '*.zip' -o -type f -name '*.rar' -o -type f -name '*.7z' -o -type f -name '*.tar.gz' -o -type f -name '*.tgz' -o -type f -name '*.tar.bz2' -o -type f -name '*.sql' -o -type f -name '*.sql.gz' -o -type f -name '*.dump' -o -type f -name '*.bak' -o -type f -name '*.old' -o -type f -name '.env' -o -type f -name '.env.*' -o -type f -iname '*backup*' -o -type f -iname '*credentials*' -o -type f -iname '*export*' -o -type f -iname '*db_*' -o -type f -iname '*database*' 2>/dev/null | while IFS= read -r f; do size=$(stat --format="%s" "$f" 2>/dev/null); mtime=$(stat --format="%y" "$f" 2>/dev/null); ext=$(echo "$f" | awk -F. '{print $NF}'); ext_l=$(echo "$ext" | tr '[:upper:]' '[:lower:]'); risk="BAJO"; case "$ext_l" in zip|rar|7z|gz|bz2|xz|tgz) risk="MEDIO";; sql|dump|bak) risk="ALTO";; esac; case "$f" in *.env*|*credentials*) risk="CRITICO";; *backup*|*dump*|*database*) risk="ALTO";; esac; echo "$risk|$size|$mtime|$f"; done | sort -t"|" -k1.1,1.6 -k2 -rn | head -100; echo "---"; echo "=== SUMMARY ==="; find /var/www/comunicacionesnew/ -type f -name '*.zip' -o -type f -name '*.rar' -o -type f -name '*.7z' -o -type f -name '*.tar.gz' -o -type f -name '*.tgz' -o -type f -name '*.tar.bz2' -o -type f -name '*.sql' -o -type f -name '*.sql.gz' -o -type f -name '*.dump' -o -type f -name '*.bak' -o -type f -name '*.old' -o -type f -name '.env' -o -type f -name '.env.*' -o -type f -iname '*backup*' -o -type f -iname '*credentials*' -o -type f -iname '*export*' -o -type f -iname '*db_*' -o -type f -iname '*database*' 2>/dev/null | wc -l`,
  'wp-file-audit': `echo "=== DETAILS ==="; find /var/www/comunicacionesnew/ -type f -size +5M ! -path '*/cache/*' ! -path '*/tmp/*' ! -path '*/.git/*' 2>/dev/null | while IFS= read -r f; do size=$(stat --format="%s" "$f" 2>/dev/null); mtime=$(stat --format="%y" "$f" 2>/dev/null); ext=$(echo "$f" | awk -F. '{print $NF}'); echo "$ext|$size|$mtime|$f"; done | sort -t"|" -k2 -rn | head -100; echo "---"; echo "=== BY_TYPE ==="; find /var/www/comunicacionesnew/ -type f -size +5M ! -path '*/cache/*' ! -path '*/tmp/*' ! -path '*/.git/*' 2>/dev/null | while IFS= read -r f; do size=$(stat --format="%s" "$f" 2>/dev/null); ext=$(echo "$f" | awk -F. '{print $NF}'); echo "$ext|$size"; done | awk -F'|' '{ext=$1; sz=$2; if(ext ~ /^(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/) c="images"; else if(ext ~ /^(pdf)$/) c="pdf"; else if(ext ~ /^(zip|tar|gz|bz2|xz|7z|rar|tgz)$/) c="archive"; else if(ext ~ /^(mp4|avi|mkv|mov|wmv|flv)$/) c="video"; else if(ext ~ /^(mp3|wav|ogg|flac|aac|wma)$/) c="audio"; else c="other"; a[c]+=sz; n[c]++} END{for(c in a) print c "|" a[c] "|" n[c]}'; echo "---"; echo "=== WP_SIZE ==="; du -sb /var/www/comunicacionesnew/ 2>/dev/null | awk '{print $1}'; echo "---"; echo "=== DISK ==="; df -B1 / 2>/dev/null | tail -1 | awk '{print $2 "|" \$3 "|" \$5}'; echo "---"; echo "=== SUMMARY ==="; find /var/www/comunicacionesnew/ -type f -size +5M ! -path '*/cache/*' ! -path '*/tmp/*' ! -path '*/.git/*' 2>/dev/null | wc -l`,
};// ── Rate limiter ──
const REQUEST_LIMIT = 10;
const WINDOW_MS = 60_000;
const AUTO_DISABLE_AFTER = 3;
const DISABLE_DURATION_MS = 30 * 60 * 1000;

interface RateBucket {
  timestamps: number[];
  consecutiveViolations: number;
  disabled: boolean;
  disabledAt: number | null;
}
const rateMap = new Map<string, RateBucket>();

function cleanOldBuckets() {
  const now = Date.now();
  rateMap.forEach((bucket, key) => {
    if (bucket.disabled && bucket.disabledAt && (now - bucket.disabledAt) > DISABLE_DURATION_MS) rateMap.delete(key);
  });
}
setInterval(cleanOldBuckets, 60_000);

function checkRateLimit(ip: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  let bucket = rateMap.get(ip);
  if (!bucket) {
    bucket = { timestamps: [], consecutiveViolations: 0, disabled: false, disabledAt: null };
    rateMap.set(ip, bucket);
  }
  if (bucket.disabled) {
    if (bucket.disabledAt && (now - bucket.disabledAt) > DISABLE_DURATION_MS) {
      bucket.disabled = false;
      bucket.disabledAt = null;
      bucket.consecutiveViolations = 0;
      bucket.timestamps = [];
    } else {
      const remaining = Math.ceil(((bucket.disabledAt || 0) + DISABLE_DURATION_MS - now) / 1000);
      return { allowed: false, reason: `SSH endpoint deshabilitado por exceso de solicitudes. Reintentar en ${remaining}s` };
    }
  }
  bucket.timestamps = bucket.timestamps.filter(t => now - t < WINDOW_MS);
  if (bucket.timestamps.length >= REQUEST_LIMIT) {
    bucket.consecutiveViolations++;
    if (bucket.consecutiveViolations >= AUTO_DISABLE_AFTER) {
      bucket.disabled = true;
      bucket.disabledAt = now;
      return { allowed: false, reason: `SSH endpoint deshabilitado por 30 min por abuso reiterado` };
    }
    return { allowed: false, reason: `Demasiadas solicitudes SSH (${REQUEST_LIMIT}/min). Espera un momento.` };
  }
  bucket.consecutiveViolations = 0;
  bucket.timestamps.push(now);
  return { allowed: true };
}

// ── Auditoría ──
const AUDIT_TABLE = 'modulos_analisis_y_status_servidor_21_audit';

async function logAudit(command: string, status: string, outputPreview: string, clientIp: string) {
  try {
    await query(
      `INSERT INTO ${AUDIT_TABLE} (command, status, output_preview, client_ip) VALUES (?, ?, ?, ?)`,
      [command.substring(0, 500), status.substring(0, 20), outputPreview.substring(0, 200), clientIp.substring(0, 45)]
    );
  } catch (e) { console.error('[SSH AUDIT] Error logging:', e); }
}

// ── Execute single SSH command ──
function executeSSH(username: string, host: string, port: number, password: string, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => { conn.end(); reject(new Error('Timeout SSH (15s)')); }, 15_000);
    conn.on('ready', () => {
      clearTimeout(timeout);
      conn.exec(command, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        stream.on('close', (code: number) => {
          conn.end();
          if (stderr && !stdout) reject(new Error(stderr.trim()));
          else resolve(stdout.trim());
        }).on('data', (data: Buffer) => { stdout += data.toString(); })
        .stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
      });
    }).on('error', (err) => { clearTimeout(timeout); reject(err); })
    .connect({ host, port, username, password, readyTimeout: 10_000, keepaliveInterval: 0 });
  });
}

// ═══════════════════════════════════════════════
// PARSERS — convierten texto crudo a estructuras
// ═══════════════════════════════════════════════

interface ProcessInfo {
  user: string; pid: string; cpu: string; mem: string; vsz: string; rss: string;
  tty: string; state: string; start: string; time: string; command: string;
}

interface StatusStructured {
  hostname: string;
  kernel: string;
  uptime: string;
  loadAvg: string;
  disk: { total: string; used: string; avail: string; pct: number };
  memory: { total: string; used: string; avail: string; pct: number };
  swap: { total: string; used: string; pct: number } | null;
  topCpu: ProcessInfo[];
  topMem: ProcessInfo[];
  phpFpm: ProcessInfo[];
}

function parseDisk(line: string): { total: string; used: string; avail: string; pct: number } {
  // /dev/vda1  154G  58G   97G  38% /
  const parts = line.trim().split(/\s+/);
  return {
    total: parts[1] || '?',
    used: parts[2] || '?',
    avail: parts[3] || '?',
    pct: parseInt(parts[4]) || 0,
  };
}

function parseMemorySection(memData: string): { memory: StatusStructured['memory']; swap: StatusStructured['swap'] } {
  const lines = memData.split('\n').filter(l => l.trim());
  const memLine = lines.find(l => l.startsWith('Mem:')) || '';
  const swapLine = lines.find(l => l.startsWith('Swap:')) || '';

  const memParts = memLine.trim().split(/\s+/);
  const swapParts = swapLine.trim().split(/\s+/);

  // Mem: total used free shared buff/cache available
  // Swap: total used free
  const total = memParts[1] || '?';
  const used = memParts[2] || '?';
  const avail = memParts[6] || '?';

  // Parse numeric for percentage
  const parseGb = (s: string): number => {
    const n = parseFloat(s);
    if (s.endsWith('Gi')) return n;
    if (s.endsWith('Mi')) return n / 1024;
    if (s.endsWith('Ti')) return n * 1024;
    return n;
  };

  const totalGb = parseGb(total);
  const usedGb = parseGb(used);
  const pct = totalGb > 0 ? Math.round((usedGb / totalGb) * 100) : 0;

  let swap = null;
  if (swapParts.length >= 3) {
    const sTotal = parseGb(swapParts[1]);
    const sUsed = parseGb(swapParts[2]);
    swap = {
      total: swapParts[1],
      used: swapParts[2],
      pct: sTotal > 0 ? Math.round((sUsed / sTotal) * 100) : 0,
    };
  }

  return {
    memory: { total, used, avail, pct },
    swap,
  };
}

function parseUptime(line: string): { uptime: string; loadAvg: string } {
  //  00:35:59 up 43 days,  5:40,  1 user,  load average: 0.12, 0.09, 0.08
  const loadMatch = line.match(/load average:\s*(.+)/);
  const uptimeMatch = line.match(/up\s+(.+?),\s+\d+ user/);
  return {
    uptime: uptimeMatch ? uptimeMatch[1].trim() : line,
    loadAvg: loadMatch ? loadMatch[1].trim() : 'N/A',
  };
}

function parsePsTable(block: string): ProcessInfo[] {
  const lines = block.trim().split('\n').filter(l => l.trim());
  if (lines.length <= 1) return []; // header only
  const results: ProcessInfo[] = [];
  // Skip header line (USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Match: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
    const m = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/);
    if (m) {
      results.push({
        user: m[1], pid: m[2], cpu: m[3], mem: m[4], vsz: m[5], rss: m[6],
        tty: m[7], state: m[8], start: m[9], time: m[10], command: m[11].trim(),
      });
    }
  }
  return results;
}

function parseStatusStructured(raw: string): StatusStructured {
  // Split by === markers
  const sections: Record<string, string> = {};
  let currentSection = '';
  raw.split('\n').forEach(line => {
    const m = line.match(/^=== (.+) ===$/);
    if (m) {
      currentSection = m[1];
      sections[currentSection] = '';
    } else if (currentSection && line !== '---') {
      sections[currentSection] += line + '\n';
    }
  });

  // Parse SISTEMA
  const sistemaText = (sections['SISTEMA'] || '').trim();
  const sistemaLines = sistemaText.split('\n').filter(l => l.trim());
  const unameLine = sistemaLines[0] || '';
  const hostname = unameLine.match(/^(\S+)/)?.[1] || unameLine;
  const kernel = unameLine.match(/\d+\.\d+\.\d+[^\s]*/)?.[0] || '';

  // Parse uptime line (second line)
  const uptimeRaw = sistemaLines[1] || '';
  const { uptime, loadAvg } = parseUptime(uptimeRaw);

  // Parse disk
  const diskRaw = (sections['TOP CPU'] ? '' : ''); // disk is in raw df output, before TOP CPU
  const diskLines = sistemaText.split('\n');
  const dfLine = diskLines.find(l => l.startsWith('/dev/')) || '';
  const disk = parseDisk(dfLine);

  // Parse free -h (in SISTEMA, after df)
  const memStartIdx = sistemaLines.findIndex(l => l.startsWith('Mem:'));
  const memBlock = memStartIdx >= 0
    ? sistemaLines.slice(memStartIdx).join('\n')
    : '';
  const { memory, swap } = parseMemorySection(memBlock);

  // Parse process sections
  const topCpu = parsePsTable(sections['TOP CPU'] || '');
  const topMem = parsePsTable(sections['TOP MEM'] || '');
  const phpFpm = parsePsTable(sections['PHP-FPM'] || '');

  // Load avg from LOAD AVG section
  const loadAvgSection = (sections['LOAD AVG'] || '').trim();
  const finalLoadAvg = loadAvgSection || loadAvg;

  return { hostname, kernel, uptime, loadAvg: finalLoadAvg, disk, memory, swap, topCpu, topMem, phpFpm };
}

// ═══════════════════════════════════════════════
// STRUCTURED BLOCK — formato genérico para UI
// ═══════════════════════════════════════════════

interface StructuredBlock {
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

// ═══════════════════════════════════════════════
// PARSERS — WordPress
// ═══════════════════════════════════════════════

function splitSections(raw: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let current = '';
  raw.split('\n').forEach(line => {
    const m = line.match(/^=== (.+) ===$/);
    if (m) { current = m[1]; sections[current] = ''; }
    else if (current && line !== '---') sections[current] += line + '\n';
  });
  return sections;
}

function parseWpSite(raw: string): StructuredBlock[] {
  const sec = splitSections(raw);
  const blocks: StructuredBlock[] = [];

  // Versión
  const v = (sec['VERSION'] || '').match(/\$wp_version\s*=\s*'([^']+)'/)?.[1] || '?';
  const w = (sec['WP-CLI'] || '').trim().split('\n');
  blocks.push({
    type: 'card-grid', title: 'WordPress',
    cards: [
      { label: 'Version', value: v },
      { label: 'WP-CLI', value: w.length > 1 ? `✓ ${w[1].trim()}` : '✗ No disponible', color: w.length > 1 ? 'green' : 'red' },
    ],
  });

  // Temas
  const themes = (sec['THEMES'] || '').trim().split('\n').filter(l => l.trim() && !l.includes('index.php'));
  if (themes.length) {
    blocks.push({ type: 'list', title: 'Temas instalados', items: themes, count: themes.length });
  }

  // Config destacada
  const config = sec['WP-CONFIG'] || '';
  const cache = config.match(/define\(\s*'WP_CACHE'\s*,\s*(true|false)/i);
  const prefix = config.match(/table_prefix\s*=\s*'([^']+)'/);
  const fields: { label: string; value: string; color?: string }[] = [
    { label: 'WP_CACHE', value: cache?.[1] || 'No definido', color: cache?.[1] === 'true' ? 'green' : 'yellow' },
  ];
  if (prefix) fields.push({ label: 'Prefijo DB', value: prefix[1] });
  blocks.push({ type: 'card-grid', title: 'Configuracion', cards: fields });

  // Directorio
  const dir = sec['DIR'] || '';
  const dirLines = dir.trim().split('\n').filter(l => l.trim());
  const totalMatch = dir.trim().match(/total\s+(\d+)/);
  blocks.push({
    type: 'card-grid', title: 'Directorio',
    cards: [
      { label: 'Items', value: `${dirLines.length - 1}` },
      { label: 'Tamano', value: totalMatch ? `${(parseInt(totalMatch[1]) / 1024).toFixed(1)} KB` : '?' },
      { label: 'Ruta', value: '/var/www/comunicacionesnew/' },
    ],
  });

  return blocks;
}

function parseWpPlugins(raw: string): StructuredBlock[] {
  const sec = splitSections(raw);
  const blocks: StructuredBlock[] = [];

  // Listado de plugins
  const plugins = (sec['PLUGINS'] || '').trim().split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('plugins') && !l.startsWith('index'));
  if (plugins.length) {
    blocks.push({ type: 'list', title: 'Plugins instalados', items: plugins, count: plugins.length });
  }

  // WP-CLI
  const cli = (sec['WP-CLI'] || '').trim();
  const cliLines = cli.split('\n');
  if (cliLines.length > 1) {
    const headerLine = cliLines[0];
    const dataLines = cliLines.slice(1).filter(l => l.trim() && !l.includes('WP-CLI no'));
    if (headerLine.includes('name') || headerLine.includes('status')) {
      const rows = dataLines.map(l => {
        const parts = l.trim().split(/\s{2,}/);
        return parts;
      });
      blocks.push({
        type: 'table', title: 'Estado de plugins (WP-CLI)',
        headers: ['Plugin', 'Status'],
        rows: rows.map(r => [r[0] || '', r[1] || '']),
      });
    }
  } else {
    blocks.push({ type: 'code', title: 'WP-CLI', text: cli });
  }

  return blocks;
}

function parseLogRows(text: string): { timestamp: string; type: string; message: string }[] {
  // PHP error log lines: [27-May-2026 22:07:07 UTC] E_WARNING: message
  // Debug.log: same format but often has Stack trace lines too
  const rows: { timestamp: string; type: string; message: string }[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  for (const line of lines) {
    // Skip stack trace lines
    if (line.match(/^(#\d+|Stack trace|require|include)/)) continue;
    if (line.startsWith('=== SKIP ===')) continue;
    const m = line.match(/^\[([^\]]+)\]\s+(\S+?):\s+(.+)/);
    if (m) {
      rows.push({ timestamp: m[1], type: m[2], message: m[3] });
    }
  }
  return rows;
}

function parseWpLogs(raw: string): StructuredBlock[] {
  const sec = splitSections(raw);
  const blocks: StructuredBlock[] = [];

  // PHP-FPM status — new detection with pgrep
  const fpm = (sec['PHP-FPM'] || '').trim();
  const fpmActive = fpm.includes('Activo') || fpm.includes(' active');
  blocks.push({
    type: 'card-grid', title: 'PHP-FPM',
    cards: [
      { label: 'Estado', value: fpmActive ? '✓ Activo' : '✗ Inactivo / No encontrado', color: fpmActive ? 'green' : 'red' },
    ],
  });

  // NGINX sites
  const nginx = (sec['NGINX'] || '').trim().split('\n').filter(l => l.trim());
  if (nginx.length) {
    blocks.push({ type: 'list', title: 'Sitios Nginx', items: nginx, count: nginx.length });
  }

  // Debug log — parse as table
  const debugText = (sec['DEBUG.LOG'] || '').trim();
  if (debugText && !debugText.includes('No debug.log')) {
    const rows = parseLogRows(debugText);
    if (rows.length > 0) {
      blocks.push({
        type: 'table', title: `Debug.log (${rows.length} lines)`,
        headers: ['#', 'Fecha', 'Tipo', 'Mensaje'],
        rows: rows.slice(0, 30).map((r, i) => [String(i + 1), r.timestamp, r.type, r.message.substring(0, 80)]),
      });
    } else {
      const rawLines = debugText.split('\n').filter(l => l.trim());
      blocks.push({
        type: 'card-grid', title: 'Debug.log',
        cards: [{ label: 'Lineas', value: `${rawLines.length} (sin errores parseables)` }],
      });
    }
  } else {
    blocks.push({
      type: 'card-grid', title: 'Debug.log',
      cards: [{ label: 'Estado', value: 'No existe / Vacio' }],
    });
  }

  // PHP error log — parse as table
  const phpErr = (sec['PHP ERROR LOG'] || '').trim();
  if (phpErr && !phpErr.includes('No php log')) {
    const rows = parseLogRows(phpErr);
    if (rows.length > 0) {
      blocks.push({
        type: 'table', title: `PHP Error Log (${rows.length} lines)`,
        headers: ['#', 'Fecha', 'Tipo', 'Mensaje'],
        rows: rows.slice(0, 30).map((r, i) => [String(i + 1), r.timestamp, r.type, r.message.substring(0, 80)]),
      });
    } else {
      const rawLines = phpErr.split('\n').filter(l => l.trim());
      blocks.push({
        type: 'code', title: `PHP Error Log (${rawLines.length} lines)`,
        text: rawLines.slice(0, 10).join('\n'),
      });
    }
  }

  // Disk WP
  const disk = (sec['DISK WP'] || '').trim();
  if (disk) {
    const parts = disk.split(/\s+/);
    blocks.push({
      type: 'card-grid', title: 'Disco WordPress',
      cards: [{ label: 'Tamano', value: parts[0] || disk }],
    });
  }

  return blocks;
}

function parseFileAudit(raw: string): StructuredBlock[] {
  const blocks: StructuredBlock[] = [];
  const sec = splitSections(raw);

  // ── Disk pie chart ──
  const diskLine = (sec['DISK'] || '').trim();
  if (diskLine) {
    const parts = diskLine.split('|');
    if (parts.length >= 2) {
      const totalBytes = parseInt(parts[0], 10);
      const usedBytes = parseInt(parts[1], 10);
      const pctStr = (parts[2] || '').replace('%', '');
      const pct = parseInt(pctStr, 10);
      if (totalBytes > 0 && !isNaN(totalBytes)) {
        blocks.push({
          type: 'pie', title: 'Disco del servidor',
          pieDisk: {
            total: totalBytes,
            used: usedBytes,
            totalLabel: formatBytes(totalBytes),
            usedLabel: formatBytes(usedBytes),
            pct,
          },
        });
      }
    }
  }

  // ── WP Size card ──
  const wpSizeText = (sec['WP_SIZE'] || '').trim();
  if (wpSizeText) {
    const sz = parseInt(wpSizeText, 10);
    if (!isNaN(sz)) {
      blocks.push({
        type: 'card-grid', title: 'Tamano total WP',
        cards: [{ label: 'Peso total', value: formatBytes(sz) }],
      });
    }
  }

  // ── Summary ──
  const summaryText = (sec['SUMMARY'] || '').trim();
  const totalCount = parseInt(summaryText, 10) || 0;

  // ── Detail rows: ext|size|mtime|path ──
  const detailLines = (sec['DETAILS'] || '').trim().split('\n').filter(l => l.includes('|'));
  const dataRows: { ext: string; size: string; sizeBytes: number; mtime: string; path: string }[] = [];
  for (const line of detailLines) {
    const parts = line.split('|');
    if (parts.length >= 4) {
      const ext = parts[0];
      const sizeBytes = parseInt(parts[1], 10);
      if (isNaN(sizeBytes)) continue;
      const mtime = parts[2].replace(/\.\d+/, '');
      dataRows.push({ ext, size: formatBytes(sizeBytes), sizeBytes, mtime, path: parts.slice(3).join('|') });
    }
  }

  // ── By-type pie (calculated from DETAILS data) ──
  const typeCategories: Record<string, { bytes: number; count: number }> = {};
  const extToCategory: Record<string, string> = {
    jpg: 'images', jpeg: 'images', png: 'images', gif: 'images',
    webp: 'images', bmp: 'images', svg: 'images', ico: 'images',
    pdf: 'pdf',
    zip: 'archive', tar: 'archive', gz: 'archive', bz2: 'archive',
    xz: 'archive', '7z': 'archive', rar: 'archive', tgz: 'archive',
    mp4: 'video', avi: 'video', mkv: 'video', mov: 'video',
    wmv: 'video', flv: 'video',
    mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio',
    aac: 'audio', wma: 'audio',
  };
  for (const row of dataRows) {
    const cat = extToCategory[row.ext.toLowerCase()] || 'other';
    if (!typeCategories[cat]) typeCategories[cat] = { bytes: 0, count: 0 };
    typeCategories[cat].bytes += row.sizeBytes;
    typeCategories[cat].count++;
  }
  const totalBytes = Object.values(typeCategories).reduce((s, c) => s + c.bytes, 0);
  if (totalBytes > 0) {
    const sliceColors: Record<string, string> = {
      images: '#3B82F6', pdf: '#EF4444', archive: '#F59E0B',
      video: '#8B5CF6', audio: '#10B981', other: '#6B7280',
    };
    const sliceLabels: Record<string, string> = {
      images: 'Imagenes', pdf: 'PDF', archive: 'Archivos ZIP/TAR',
      video: 'Videos', audio: 'Audio', otros: 'Otros',
    };
    const slices = Object.entries(typeCategories)
      .filter(([_, c]) => c.bytes > 0)
      .sort((a, b) => b[1].bytes - a[1].bytes)
      .map(([key, c]) => ({
        label: `${sliceLabels[key] || key} (${c.count} arch.)`,
        value: c.bytes,
        humanSize: formatBytes(c.bytes),
        pct: Math.round((c.bytes / totalBytes) * 100),
        color: sliceColors[key] || '#6B7280',
      }));
    blocks.push({
      type: 'pie', title: 'Archivos >5MB por tipo',
      slices,
    });
  }

  // Summary card
  if (totalCount > 0 || dataRows.length > 0) {
    blocks.push({
      type: 'card-grid', title: 'Auditor de archivos (>5MB)',
      cards: [
        { label: 'Archivos', value: String(totalCount || dataRows.length) },
        { label: 'Peso total', value: formatBytes(totalBytes) },
        { label: 'Ruta', value: '/var/www/comunicacionesnew/' },
      ],
    });
  }

  // Files table
  if (dataRows.length > 0) {
    blocks.push({
      type: 'table', title: `Archivos (mostrando ${dataRows.length} de ${totalCount})`,
      headers: ['Ext', 'Tamano', 'Modificado', 'Ruta'],
      rows: dataRows.map(r => [r.ext, r.size, r.mtime, r.path]),
    });
  } else {
    blocks.push({
      type: 'card-grid', title: 'Resultado',
      cards: [{ label: 'Estado', value: 'No se encontraron archivos >5MB' }],
    });
  }

  return blocks;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${Math.round(bytes / 1048576)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

// ═══════════════════════════════════════════════
// Security audit parser
// ═══════════════════════════════════════════════

interface SecurityFile {
  risk: string;
  size: string;
  date: string;
  path: string;
}

function parseSecurityAudit(raw: string): StructuredBlock[] {
  const blocks: StructuredBlock[] = [];
  const sec = splitSections(raw);

  const scanText = (sec['SCAN'] || '').trim();
  const summaryText = (sec['SUMMARY'] || '').trim();
  const totalCount = parseInt(summaryText, 10) || 0;

  if (!scanText) {
    blocks.push({
      type: 'card-grid', title: 'Auditoria de seguridad',
      cards: [{ label: 'Estado', value: 'No se pudo escanear el servidor' }],
    });
    return blocks;
  }

  // Parse scan lines
  const lines = scanText.split('\n').filter(l => l.includes('|'));
  const files: SecurityFile[] = [];

  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length >= 4) {
      const sizeBytes = parseInt(parts[1], 10);
      files.push({
        risk: parts[0],
        size: formatBytes(sizeBytes),
        date: parts[2].replace(/\.\d+/, ''),
        path: parts.slice(3).join('|'),
      });
    }
  }

  // Risk summary cards
  if (files.length > 0) {
    const criCount = files.filter(f => f.risk === 'CRITICO').length;
    const altoCount = files.filter(f => f.risk === 'ALTO').length;
    const medioCount = files.filter(f => f.risk === 'MEDIO').length;

    blocks.push({
      type: 'card-grid', title: `Auditoria de seguridad — ${totalCount} archivos sensibles`,
      cards: [
        { label: 'Criticos', value: String(criCount) },
        { label: 'Altos', value: String(altoCount) },
        { label: 'Medios', value: String(medioCount) },
        { label: 'Ruta', value: '/var/www/comunicacionesnew/' },
      ],
    });

    // Files table
    blocks.push({
      type: 'table', title: `Archivos expuestos (mostrando ${files.length} de ${totalCount})`,
      headers: ['Riesgo', 'Tamano', 'Modificado', 'Ruta'],
      rows: files.map(f => [f.risk, f.size, f.date, f.path.substring(0, 90)]),
    });
  } else {
    blocks.push({
      type: 'card-grid', title: 'Auditoria de seguridad',
      cards: [{ label: 'Estado', value: 'Sin archivos sensibles detectados' }],
    });
  }

  return blocks;
}

// ═══════════════════════════════════════════════
// POST handler
// ═══════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  try {
    const { allowed, reason } = checkRateLimit(clientIp);
    if (!allowed) {
      await logAudit('RATE_LIMITED', 'denied', reason || '', clientIp);
      return NextResponse.json({ ok: false, error: reason }, { status: 429 });
    }

    const body = await request.json();
    const commandKey = body.command as string;

    if (!commandKey || !ALLOWED_COMMANDS[commandKey]) {
      await logAudit(`INVALID:${commandKey || '(empty)'}`, 'denied', 'Comando no permitido', clientIp);
      return NextResponse.json({
        ok: false,
        error: `Comando no permitido. Usa uno de: ${Object.keys(ALLOWED_COMMANDS).join(', ')}`,
        allowed_commands: Object.keys(ALLOWED_COMMANDS),
      }, { status: 400 });
    }

    const config = await getAllConfig();
    const { ip, puerto, usuario, password } = config;
    if (!ip || !usuario || !password) {
      return NextResponse.json({ ok: false, error: 'Configuracion SSH incompleta' }, { status: 400 });
    }
    const portNum = parseInt(puerto || '22');

    // ── Comando status: devuelve JSON estructurado ──
    if (commandKey === 'status') {
      // Comando compuesto que genera output parseable
      const rawCommand = `echo "=== SISTEMA ==="; uname -a; echo "---"; uptime; echo "---"; df -h /; echo "---"; free -h; echo "---"; echo "=== TOP CPU ==="; ps aux --sort=-%cpu | head -15; echo "---"; echo "=== TOP MEM ==="; ps aux --sort=-%mem | head -10; echo "---"; echo "=== PHP-FPM ==="; ps aux | grep -E "php|fpm" | grep -v grep | head -15; echo "---"; echo "=== LOAD AVG ==="; cat /proc/loadavg`;

      const rawOutput = await executeSSH(usuario, ip, portNum, password, rawCommand);
      const structured = parseStatusStructured(rawOutput);
      await logAudit('status', 'ok', `${structured.hostname} | CPU:${structured.topCpu.length} | MEM:${structured.topMem.length} | PHP:${structured.phpFpm.length}`, clientIp);
      return NextResponse.json({ ok: true, structured });
    }

    // ── Comandos WordPress: devuelven JSON estructurado ──
    if (commandKey === 'wp-site' || commandKey === 'wp-plugins' || commandKey === 'wp-logs') {
      const cmd = ALLOWED_COMMANDS[commandKey];
      const rawOutput = await executeSSH(usuario, ip, portNum, password, cmd);
      let blocks: StructuredBlock[] = [];

      if (commandKey === 'wp-site') blocks = parseWpSite(rawOutput);
      else if (commandKey === 'wp-plugins') blocks = parseWpPlugins(rawOutput);
      else if (commandKey === 'wp-logs') blocks = parseWpLogs(rawOutput);

      await logAudit(commandKey, 'ok', blocks.map(b => b.title).filter(Boolean).join(', ').substring(0, 200), clientIp);
      return NextResponse.json({ ok: true, output: rawOutput, structured: blocks });
    }

    // ── File audit: JSON estructurado ──
    if (commandKey === 'wp-file-audit') {
      const cmd = ALLOWED_COMMANDS[commandKey];
      const rawOutput = await executeSSH(usuario, ip, portNum, password, cmd);
      const blocks = parseFileAudit(rawOutput);
      await logAudit('wp-file-audit', 'ok', `${blocks.length} bloques`, clientIp);
      return NextResponse.json({ ok: true, output: rawOutput, structured: blocks });
    }

    // ── Security audit: JSON estructurado ──
    if (commandKey === 'wp-security-audit') {
      const cmd = ALLOWED_COMMANDS[commandKey];
      const rawOutput = await executeSSH(usuario, ip, portNum, password, cmd);
      const blocks = parseSecurityAudit(rawOutput);
      await logAudit('wp-security-audit', 'ok', `${blocks.length} bloques`, clientIp);
      return NextResponse.json({ ok: true, output: rawOutput, structured: blocks });
    }

    // ── Otros comandos: texto crudo ──
    const cmd = ALLOWED_COMMANDS[commandKey];
    const output = await executeSSH(usuario, ip, portNum, password, cmd);
    await logAudit(commandKey, 'ok', output.substring(0, 200), clientIp);
    return NextResponse.json({ ok: true, output });
  } catch (error: any) {
    const msg = error?.message || 'Error SSH';
    await logAudit('ERROR', 'error', msg, clientIp);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}