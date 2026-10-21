const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const assets = {};
// Art ships as WebP (tools/compress-assets.py writes assets/webp/ twins); a twin older than its source is ignored so retouched PNGs are never shadowed.
let stale = [];
function art(src) {
  const twin = path.join(root, 'assets/webp', path.basename(src).replace(/\.(png|jpg)$/i, '.webp'));
  if (fs.existsSync(twin) && fs.statSync(twin).mtimeMs >= fs.statSync(src).mtimeMs) return { mime: 'image/webp', buf: fs.readFileSync(twin) };
  if (fs.existsSync(twin)) stale.push(path.basename(src));
  return { mime: /\.png$/i.test(src) ? 'image/png' : 'image/jpeg', buf: fs.readFileSync(src) };
}
const dataURL = src => { const a = art(src); return `data:${a.mime};base64,` + a.buf.toString('base64'); };
for (const f of fs.readdirSync(path.join(root, 'assets')).sort()) if (/\.png$/i.test(f)) assets[f.replace(/\.png$/i, '')] = dataURL(path.join(root, 'assets', f));
const { loadRigAssets } = require('./rig-assets.cjs');
Object.assign(assets, loadRigAssets(root));
const rd = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const { LEVELS, CHAPTERS, DAILY } = require(path.join(root, 'src/levels.js'));
let page = rd('page.html');
const put = (k, v) => { page = page.replace(k, () => v); };
put('/*TITLE_LOGO*/', (() => { const twin = path.join(root, 'assets/webp/logo.webp'), src = path.join(root, 'logo/cupcake-zombie-logo.png'); return fs.existsSync(twin) && fs.statSync(twin).mtimeMs >= fs.statSync(src).mtimeMs ? 'data:image/webp;base64,' + fs.readFileSync(twin).toString('base64') : 'data:image/png;base64,' + fs.readFileSync(src).toString('base64'); })());
put('/*ASSETS*/null', JSON.stringify(assets));
put('/*SOUNDS*/null', JSON.stringify({ button: fs.readFileSync(path.join(root, 'assets/audio/ui-click.wav')).toString('base64'), meow: fs.readFileSync(path.join(root, 'assets/audio/cupcake-nya.wav')).toString('base64') }));
const scaleFile = path.join(root, 'assets/scale.json');
put('/*SPRITE_K*/null', fs.existsSync(scaleFile) ? fs.readFileSync(scaleFile, 'utf8') : '{}');
put('/*LOGIC*/', rd('logic.js'));
put('/*LEVELS*/null', JSON.stringify(LEVELS));
put('/*CHAPTERS*/null', JSON.stringify(CHAPTERS));
put('/*DAILY*/null', JSON.stringify(DAILY));
// Backgrounds: bg_ch1..bg_ch4.jpg per chapter (title/map/daily use ch1). Missing chapters fall back to bg.jpg.
let BG = null;
const bgDir = path.join(root, 'assets/bg');
if (fs.existsSync(bgDir) && !process.env.NO_BG) {
  const meta = JSON.parse(fs.readFileSync(path.join(bgDir, 'bg.json'), 'utf8'));
  const load = stem => {
    const f = path.join(bgDir, stem + '.jpg');
    if (!fs.existsSync(f) || !meta[stem]) return null;
    const buf = fs.readFileSync(f);
    let i = 2, w = 0, h = 0;
    while (i < buf.length) { if (buf[i] !== 0xFF) { i++; continue; } const m = buf[i + 1]; if (m >= 0xC0 && m <= 0xC3) { h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break; } i += 2 + buf.readUInt16BE(i + 2); }
    return { src: dataURL(f), w, h, ...meta[stem] };
  };
  const base = load('bg');
  const per = [1, 2, 3, 4].map(n => load('bg_ch' + n));
  if (base || per.some(Boolean)) {
    const list = per.map(x => x || base || per.find(Boolean));
    const srcs = [...new Set(list.map(x => x.src))];
    BG = { srcs, ch: list.map(x => ({ ...x, src: srcs.indexOf(x.src) })) };
  }
  console.log('backgrounds:', per.map((x, k) => x ? 'ch' + (k + 1) : '-').join(' '), base ? '+ fallback bg.jpg' : '');
}
put('/*BG*/null', JSON.stringify(BG));
put('/*HEAD*/', rd('strings.js') + '\n' + rd('app-head.js'));
put('/*RENDER*/', rd('cupcake-reactions.js') + '\n' + rd('game-render.js'));
put('/*COLLECTION_CSS*/', rd('collection.css'));
put('/*COLLECTION*/', rd('collection.js'));
put('/*UI_INTERACTIONS*/', rd('ui-interactions.js'));
put('/*APP*/', rd('app.js'));
fs.mkdirSync(path.join(root, 'out/www'), { recursive: true });
fs.writeFileSync(path.join(root, 'out/cupcake-zombie.html'), page);
const standalone = '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="default">\n<meta name="theme-color" content="#FBEFF1">\n<style>:root{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n' + page + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(root, 'out/www/index.html'), standalone);
// Capacitor www: same page plus the native bridge scripts in front of the game script
const capDir = path.join(root, 'capacitor/www');
if (fs.existsSync(capDir)) {
  const vendor = ['vendor/capacitor.js', 'vendor/haptics.js', 'vendor/splash-screen.js', 'vendor/status-bar.js', 'native.js'].map(f => `<script src="${f}"></script>`).join('\n');
  const capPage = standalone.replace('<script>\nconst ASSETS', () => vendor + '\n<script>\nconst ASSETS');
  fs.writeFileSync(path.join(capDir, 'index.html'), capPage);
}
if (stale.length) console.log('stale webp twins ignored (run python3 tools/compress-assets.py):', stale.join(' '));
console.log('built', (page.length / 1024).toFixed(0) + 'KB', LEVELS.length, 'levels', DAILY.length, 'daily');

