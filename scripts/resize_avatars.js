const sharp = require('sharp');
const path = require('path');

const files = [
  '1787533880562-q1h38-ai.jpg',
  '1787533920522-qqdny-ai.jpg',
  '1787533955337-vql7fr-ai.jpg'
];
const dir = '/root/admin-meilisearch/public/agent-avatars';

(async () => {
  for (const f of files) {
    const p = path.join(dir, f);
    const meta = await sharp(p).metadata();
    console.log(f, 'antes:', meta.width + 'x' + meta.height, 'formato:', meta.format);
    await sharp(p)
      .resize(500, 500, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(path.join(dir, '500_' + f));
    const nm = await sharp(path.join(dir, '500_' + f)).metadata();
    const fs = (await sharp(path.join(dir, '500_' + f)).toBuffer()).length;
    console.log('  -> 500_' + f, nm.width + 'x' + nm.height, Math.round(fs/1024) + 'KB');
  }
})().catch(e => { console.error(e); process.exit(1); });