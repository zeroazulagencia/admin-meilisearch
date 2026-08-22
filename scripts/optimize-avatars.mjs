import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const AVATAR_DIR = '/root/admin-meilisearch/public/agent-avatars';
const MAX_SIZE = 500;
const QUALITY = 85;

async function main() {
  console.log('🚀 Optimizando avatares...');
  
  const files = await fs.readdir(AVATAR_DIR);
  let processed = 0;
  let optimized = 0;
  let errors = 0;
  let totalSaved = 0;
  
  for (const file of files) {
    if (file === '.gitkeep') continue;
    
    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
    
    const inputPath = path.join(AVATAR_DIR, file);
    
    try {
      const stats = await fs.stat(inputPath);
      const originalSize = stats.size;
      
      // Resize to buffer first (can't write to same file directly with sharp)
      const outputBuffer = await sharp(inputPath)
        .resize(MAX_SIZE, MAX_SIZE, {
          fit: 'cover',
          position: 'centre',
        })
        .jpeg({ quality: QUALITY })
        .toBuffer();
      
      // Overwrite the file
      await fs.writeFile(inputPath, outputBuffer);
      
      const newStats = await fs.stat(inputPath);
      const saved = originalSize - newStats.size;
      totalSaved += saved;
      optimized++;
      processed++;
      
      const ratio = ((saved / originalSize) * 100).toFixed(0);
      console.log(`✅ ${file}: ${(originalSize/1024/1024).toFixed(2)}MB → ${(newStats.size/1024).toFixed(1)}KB (-${ratio}%)`);
    } catch (err) {
      console.error(`❌ ${file}:`, err.message);
      errors++;
    }
  }
  
  console.log(`\n📊 Resumen:`);
  console.log(`   Procesados: ${processed}`);
  console.log(`   Optimizados: ${optimized}`);
  console.log(`   Errores: ${errors}`);
  console.log(`   Total ahorrado: ${(totalSaved/1024/1024).toFixed(2)} MB`);
}

main().catch(console.error);
