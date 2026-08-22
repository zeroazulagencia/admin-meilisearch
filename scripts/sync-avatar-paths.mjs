import mysql from 'mysql2/promise';
import fs from 'fs/promises';

const DB = { host: 'localhost', user: 'bitnami', password: 'ugTUn+gQd8E8', database: 'admin_dworkers' };
const AVATAR_DIR = '/root/admin-meilisearch/public/agent-avatars';

async function main() {
  const conn = await mysql.createConnection(DB);
  
  // Get all agents with photo references
  const [rows] = await conn.query(
    "SELECT id, name, photo FROM agents WHERE photo IS NOT NULL AND photo != '' ORDER BY id"
  );
  
  // Read disk files
  const diskFiles = await fs.readdir(AVATAR_DIR).catch(() => []);
  const diskSet = new Set(diskFiles);
  
  console.log(`${rows.length} agentes con fotos en BD\n`);
  console.log(`${diskFiles.length} archivos en disco:\n${[...diskSet].sort().join('\n')}\n`);
  
  let matched = 0;
  let notFound = 0;
  let alreadyOk = 0;
  
  for (const row of rows) {
    const url = row.photo || '';
    const filename = url.split('/').pop();
    
    if (!filename) continue;
    
    // Check exact match first
    if (diskSet.has(filename)) {
      if (url === `/agent-avatars/${filename}` || url === `/api/agent-avatars/${filename}`) {
        alreadyOk++;
        console.log(`✅ Agent ${row.id}: ${filename} (OK)`);
      } else {
        // Update path to correct format
        const newPath = `/agent-avatars/${filename}`;
        await conn.query("UPDATE agents SET photo = ? WHERE id = ?", [newPath, row.id]);
        console.log(`🔄 Agent ${row.id}: ${url} → ${newPath}`);
        matched++;
      }
    } else {
      // Try to find matching file by stripping extension variations
      const basename = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '');
      const candidates = [...diskSet].filter(f => f.startsWith(basename));
      
      if (candidates.length > 0) {
        // Take the first match (prefer .jpg)
        const bestMatch = candidates.find(f => f.endsWith('.jpg')) || candidates[0];
        const newPath = `/agent-avatars/${bestMatch}`;
        await conn.query("UPDATE agents SET photo = ? WHERE id = ?", [newPath, row.id]);
        console.log(`🔍 Agent ${row.id}: ${filename} → ${bestMatch} (matched by prefix)`);
        matched++;
      } else {
        console.warn(`❌ Agent ${row.id}: ${filename} NOT FOUND`);
        // Clear broken reference
        await conn.query("UPDATE agents SET photo = NULL WHERE id = ?", [row.id]);
        notFound++;
      }
    }
  }
  
  await conn.end();
  console.log(`\n📊 Resultado:`);
  console.log(`   Arregladas: ${matched}`);
  console.log(`   Ya OK: ${alreadyOk}`);
  console.log(`   No encontradas (limpiadas): ${notFound}`);
}

main().catch(console.error);
