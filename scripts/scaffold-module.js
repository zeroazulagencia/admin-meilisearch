#!/usr/bin/env node
/**
 * Scaffold de módulo admin-meilisearch
 * -------------------------------------
 * Crea un módulo custom completo con las 3 pestañas base (Inicio/Configuración/Documentación),
 * lo registra en MODULES_MAP y (opcionalmente) en BD.
 *
 * Uso:
 *   node scripts/scaffold-module.js "Mi Módulo" [--agent 3] [--db] [--title "Titulo"]
 *
 * Opciones:
 *   --title    Título (si no se pasa, se deriva del nombre)
 *   --agent    ID del agente (requerido con --db)
 *   --db       Insertar también en la BD (usa la config de ./lib/db o variables de entorno)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.env.SCAFFOLD_ROOT || path.join(__dirname, '..');
const MODULES_DIR = process.env.SCAFFOLD_MODULES_DIR || path.join(ROOT, 'modules-custom');
const TMPL = fs.readFileSync(
  process.env.SCAFFOLD_TEMPLATE || path.join(__dirname, 'templates', 'module-index.tsx'),
  'utf8'
);
const MODULES_PAGE = process.env.SCAFFOLD_MODULES_PAGE || path.join(ROOT, 'app', 'modulos', '[id]', 'page.tsx');

// ---- parseo args ----
function arg(flags, def = null) {
  const i = process.argv.findIndex((a) => a.startsWith('--'));
  void i;
  for (let idx = 0; idx < process.argv.length; idx++) {
    if (flags.includes(process.argv[idx])) {
      return process.argv[idx + 1];
    }
  }
  return def;
}
function flag(flags) {
  return process.argv.some((a) => flags.includes(a));
}

// ---- helpers ----
function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}
function toComponentName(str) {
  return slugify(str)
    .split('-')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function fail(msg) {
  console.error('❌ ' + msg);
  process.exit(1);
}

// ---- entradas ----
const nameArg = process.argv[2];
if (!nameArg) fail('Nombre del módulo requerido. Uso: node scripts/scaffold-module.js "Mi Módulo"');
const title = arg(['--title']) || nameArg;
const folder = slugify(nameArg);
if (!folder) fail('No se pudo derivar un folder_name válido de: ' + nameArg);
const componentName = 'Mod' + toComponentName(nameArg);
const doDB = flag(['--db', '--only']);

// ---- 1. crear carpeta + index.tsx ----
const moduleDir = path.join(MODULES_DIR, folder);
fs.mkdirSync(moduleDir, { recursive: true });
const content = TMPL.replace(/__MODULE_COMPONENT_NAME__/g, componentName);
const outFile = path.join(moduleDir, 'index.tsx');
fs.writeFileSync(outFile, content);
console.log(`✅ Creando ${path.relative(ROOT, outFile)}`);
console.log(`   📦 Componente: ${componentName} (folder: ${folder})`);

// ---- 2. registrar en MODULES_MAP + import ----
if (!fs.existsSync(MODULES_PAGE)) {
  console.warn(`⚠️  No se encontró ${MODULES_PAGE}. Omitiendo registro en MODULES_MAP.`);
} else {
  let src = fs.readFileSync(MODULES_PAGE, 'utf8');

  // import
  const importLine = `import ${componentName} from '@/modules-custom/${folder}';`;
  if (!src.includes(`'@/modules-custom/${folder}'`)) {
    src = src.replace(/(\/\/ Static imports for known modules\n?)/, `$1${importLine}\n`);
    console.log(`🔗 Import añadido: ${componentName}`);
  }

  // MODULES_MAP entry
  const entry = `  '${folder}': ${componentName},`;
  if (!src.includes(`'${folder}':`)) {
    // Localizar la primera línea que cierra el objeto MODULES_MAP (objeto plano, cierra con '};')
    const lines = src.split('\n');
    const mapStartLine = lines.findIndex(l => l.includes('const MODULES_MAP'));
    let insertAt = -1;
    for (let i = 0; i < lines.length; i++) {
      if (i <= mapStartLine) continue;
      if (/^\};\s*$/.test(lines[i])) { insertAt = i; break; }
    }
    if (insertAt === -1) {
      console.warn('⚠️  No se pudo localizar el cierre de MODULES_MAP. Regístralo manualmente.');
    } else {
      lines.splice(insertAt, 0, entry);
      src = lines.join('\n');
      console.log(`🔗 MODULES_MAP actualizado: '${folder}'`);
    }
  }
  fs.writeFileSync(MODULES_PAGE, src);
}

console.log('\n🎉 Módulo listo:');
console.log(`   http://localhost:3000/modulos/${folder}`);
console.log(`\nPróximos pasos manuales:`);
console.log(`   1. Edita modules-custom/${folder}/index.tsx`);
console.log(`   2. (Si aplica) agrégalo/elimínalo de DISABLED_MODULES en app/modulos/page.tsx`);
if (doDB) {
  const agentId = arg(['--agent']);
  const esc = String(title).replace(/'/g, "''");
  console.log('\n💾 Para crear el registro en BD ejecuta:\n');
  console.log(`   INSERT INTO modules (agent_id, title, folder_name, description) VALUES (${agentId || '?'}, '${esc}', '${folder}', NULL);`);
  console.log('\n   O crea el módulo desde la UI en /modulos para que se registre automáticamente.');
}

console.log('');

