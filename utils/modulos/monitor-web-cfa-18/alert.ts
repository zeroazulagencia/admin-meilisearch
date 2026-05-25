import { query } from '@/utils/db';

const CONFIG_TABLE = 'modulos_monitor_web_cfa_18_config';
const LOGS_TABLE = 'modulos_monitor_web_cfa_18_logs';

const EMAILIT_URL = process.env.EMAILIT_API_URL || 'https://api.emailit.com/v2/emails';
const EMAILIT_FROM = process.env.EMAILIT_FROM || 'SERENA de WORKERS <zero@zeroazul.com>';
const EMAILIT_KEY = process.env.EMAILIT_API_KEY || '';

async function getConfig(key: string): Promise<string | null> {
  const [rows] = await query<{ config_value: string | null }>(
    `SELECT config_value FROM ${CONFIG_TABLE} WHERE config_key = ?`,
    [key]
  );
  return rows[0]?.config_value ?? null;
}

async function setConfig(key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO ${CONFIG_TABLE} (config_key, config_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [key, value]
  );
}

/** Cuenta fallos consecutivos desde el más reciente hacia atrás */
async function getConsecutiveFailures(): Promise<number> {
  const [rows] = await query<any>(
    `SELECT status_code, content_valid, waf_detected
     FROM ${LOGS_TABLE}
     ORDER BY checked_at DESC
     LIMIT 10`
  );

  let count = 0;
  for (const row of rows || []) {
    const isFail =
      row.status_code !== 200 ||
      !row.content_valid ||
      row.waf_detected;
    if (isFail) {
      count++;
    } else {
      break; // Se encontró un OK, ahí para
    }
  }
  return count;
}

async function sendEmail(toList: string[], subject: string, text: string): Promise<boolean> {
  if (!EMAILIT_KEY) {
    console.error('[ALERT CFA] EMAILIT_API_KEY no configurada');
    return false;
  }

  try {
    const payload = {
      from: EMAILIT_FROM,
      to: toList,
      subject,
      text,
      headers: {
        'List-Unsubscribe': '<mailto:zero@zeroazul.com?subject=unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };

    const res = await fetch(EMAILIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${EMAILIT_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[ALERT CFA] Emailit error ${res.status}: ${err}`);
      return false;
    }

    return true;
  } catch (e: any) {
    console.error(`[ALERT CFA] Error enviando email: ${e?.message}`);
    return false;
  }
}

export async function checkAndAlert(): Promise<{ alerted: boolean; consecutiveFailures: number }> {
  const consecutive = await getConsecutiveFailures();

  if (consecutive < 3) {
    // Si se recuperó (<3 fallos), reseteamos estado de alerta
    await setConfig('alert_sent_at', '');
    await setConfig('alert_streak_count', String(consecutive));
    return { alerted: false, consecutiveFailures: consecutive };
  }

  // Verificar si ya enviamos alerta para este streak
  const alertSentAt = await getConfig('alert_sent_at');
  if (alertSentAt) {
    // Ya se alertó, no spamear
    await setConfig('alert_streak_count', String(consecutive));
    return { alerted: false, consecutiveFailures: consecutive };
  }

  // Enviar alerta
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const body = `Alerta de disponibilidad - Monitor Web CFA

El sitio https://www.cfa.com.co/ lleva ${consecutive} verificaciones consecutivas fallidas.

Ultimo chequeo: ${timestamp}
Fallos consecutivos: ${consecutive}

Esto fue detectado por el sistema automatico de monitoreo de WORKERS.
Por favor revisa el estado del sitio y del WAF.`;

  const ok = await sendEmail(
    ['cristian.parada@zeroazul.com', 'alejandro.morales@zeroazul.com'],
    `[ALERTA] CFA caido - ${consecutive} verificaciones fallidas`,
    body
  );

  if (ok) {
    await setConfig('alert_sent_at', timestamp);
    await setConfig('alert_streak_count', String(consecutive));
    console.log(`[ALERT CFA] Alerta enviada OK - ${consecutive} fallos consecutivos`);
    return { alerted: true, consecutiveFailures: consecutive };
  }

  return { alerted: false, consecutiveFailures: consecutive };
}