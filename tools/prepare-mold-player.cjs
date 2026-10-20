const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

// Keep the approved artwork intact; only fit a runtime copy to the existing
// sprite canvas so the HUD's layout and bottom-anchored puff stay unchanged.
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets_extended/mold-outline-v2');
const source = path.join(dir, 'master.png');
const destination = path.join(root, 'assets/mold_player.png');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function main() {
  await sharp(source)
    .resize(240, 237, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(destination);
  const image = sharp(destination);
  const metadata = await image.metadata();
  const stats = await image.stats();
  if (metadata.width !== 240 || metadata.height !== 237 || !metadata.hasAlpha ||
      stats.channels[3].min !== 0 || stats.channels[3].max !== 255) {
    throw new Error('Runtime mold must retain its original canvas size and transparency.');
  }
  const manifest = {
    approved_variant: 'mold-player-outline-v2',
    master: 'assets_extended/mold-outline-v2/master.png',
    runtime: 'assets/mold_player.png',
    master_sha256: hash(source),
    runtime_sha256: hash(destination),
    canvas: [metadata.width, metadata.height],
    has_alpha: metadata.hasAlpha,
    bytes: fs.statSync(destination).size,
    preparation: 'Aspect-preserving resize, transparent contain fit, no redrawing or recoloring',
    consumer: 'Existing moldImg HUD artwork and its puff animation'
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
