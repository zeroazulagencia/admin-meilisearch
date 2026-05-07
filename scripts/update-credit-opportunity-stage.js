const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function loadEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const env = {};
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      env[key] = value;
    });
    return env;
  } catch (e) {
    return {};
  }
}

async function getConfig(db, keys) {
  if (keys.length === 0) return {};
  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await db.execute(
    `SELECT config_key, config_value FROM modulos_suvi_12_config WHERE config_key IN (${placeholders})`,
    keys
  );
  const out = {};
  rows.forEach((row) => {
    out[row.config_key] = row.config_value;
  });
  return out;
}

async function setConfig(db, key, value) {
  await db.execute(
    `INSERT INTO modulos_suvi_12_config (config_key, config_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = ?`,
    [key, value, value]
  );
}

async function refreshAccessTokenIfNeeded(db, config) {
  const now = Date.now();
  const expiryTime = config.salesforce_token_expiry ? parseInt(config.salesforce_token_expiry, 10) : 0;
  const instanceUrl = config.salesforce_instance_url || 'https://suvivienda.my.salesforce.com';

  if (config.salesforce_access_token && now < expiryTime) {
    return { accessToken: config.salesforce_access_token, instanceUrl };
  }

  if (!config.salesforce_refresh_token) {
    throw new Error('No hay refresh token disponible. Debes autorizarte primero.');
  }

  if (!config.salesforce_consumer_key || !config.salesforce_consumer_secret) {
    throw new Error('Consumer Key y Secret no configurados');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.salesforce_consumer_key,
    client_secret: config.salesforce_consumer_secret,
    refresh_token: config.salesforce_refresh_token,
  });

  const res = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Error renovando token: ${error}`);
  }

  const tokens = await res.json();
  const newExpiry = Date.now() + (7200 * 1000);
  await setConfig(db, 'salesforce_access_token', tokens.access_token);
  await setConfig(db, 'salesforce_instance_url', tokens.instance_url || instanceUrl);
  await setConfig(db, 'salesforce_token_expiry', String(newExpiry));

  return { accessToken: tokens.access_token, instanceUrl: tokens.instance_url || instanceUrl };
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const envFromFile = loadEnvFile(path.join(repoRoot, '.env'));
  const env = { ...envFromFile, ...process.env };

  const db = await mysql.createConnection({
    host: env.MYSQL_HOST || 'localhost',
    user: env.MYSQL_USER || 'root',
    password: env.MYSQL_PASSWORD || '',
    database: env.MYSQL_DATABASE || 'admin_dworkers',
    port: env.MYSQL_PORT ? Number(env.MYSQL_PORT) : 3306,
  });

  try {
    const config = await getConfig(db, [
      'salesforce_access_token',
      'salesforce_refresh_token',
      'salesforce_token_expiry',
      'salesforce_instance_url',
      'salesforce_consumer_key',
      'salesforce_consumer_secret',
    ]);

    const { accessToken, instanceUrl } = await refreshAccessTokenIfNeeded(db, config);

    const [rows] = await db.execute(
      `SELECT id, salesforce_opportunity_id
       FROM modulos_suvi_6_opportunities
       WHERE tipo = 'credito'
         AND salesforce_opportunity_id IS NOT NULL
         AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)`
    );

    const opportunities = rows.filter((row) => row.salesforce_opportunity_id);

    if (opportunities.length === 0) {
      console.log('No hay oportunidades de credito para actualizar en el rango solicitado.');
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const row of opportunities) {
      const opportunityId = row.salesforce_opportunity_id;
      const res = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/Opportunity/${opportunityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ StageName: 'No contactado' }),
      });
      if (res.ok) {
        updated += 1;
      } else {
        failed += 1;
      }
    }

    console.log(`Oportunidades encontradas: ${opportunities.length}`);
    console.log(`Actualizadas: ${updated}`);
    console.log(`Fallidas: ${failed}`);
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
