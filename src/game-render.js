// ---------- images (anchors are measured at load, so new art can be dropped in at any resolution) ----------
const IMG = {}, META = {}, TINT = {};
let UNIT = 115; // width of the plain muffin sprite; every sprite is drawn relative to it
function measure(im) {
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const { data } = g.getImageData(0, 0, c.width, c.height);
  let bottom = 0;
  for (let y = c.height - 1; y >= 0 && !bottom; y--) for (let x = 0; x < c.width; x++) if (data[(y * c.width + x) * 4 + 3] > 40) { bottom = y; break; }
  let sx = 0, n = 0;
  const y0 = Math.floor(bottom - c.height * 0.35);
  for (let y = Math.max(0, y0); y <= bottom; y++) for (let x = 0; x < c.width; x++) if (data[(y * c.width + x) * 4 + 3] > 40) { sx += x; n++; }
  return { w: c.width, h: c.height, ax: n ? sx / n : c.width / 2, ay: bottom || c.height };
}
function loadImages() {
  return Promise.all(Object.entries(ASSETS).map(([k, src]) => new Promise(res => {
    const im = new Image();
    im.onload = () => { IMG[k] = im; try { META[k] = measure(im); } catch (e) { META[k] = { w: im.naturalWidth, h: im.naturalHeight, ax: im.naturalWidth / 2, ay: im.naturalHeight }; } META[k].k = (SPRITE_K && SPRITE_K[k]) || 1; res(); };
    im.onerror = res;
    im.src = src;
  })));
}
function buildTints() {
  for (const k of ['basic', 'berry', 'sprinkle', 'cherry', 'cream', 'butter_open', 'butter', 'earl_grey', 'lemon_yogurt', 'pending_lemon_yogurt', 'espresso']) {
    const m = META[k], im = IMG[k];
    if (!im) continue;
    const c = document.createElement('canvas'); c.width = m.w; c.height = m.h;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(118, 150, 52, 0.62)';
    g.fillRect(0, 0, m.w, m.h);
    let seed = k.length * 97;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 22; i++) {
      const x = rnd() * m.w, y = m.h * 0.15 + rnd() * m.h * 0.6, r = (4 + rnd() * 11) * m.w / 115;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const col = rnd() < 0.5 ? '232, 244, 196' : '190, 214, 120';
      gr.addColorStop(0, `rgba(${col}, 0.95)`); gr.addColorStop(1, `rgba(${col}, 0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    TINT[k] = c;
  }
}
const zombieKey = (v) => IMG['zombie_' + TYPES[v.t].key] ? 'zombie_' + TYPES[v.t].key : v.zv;


// ---------- audio ----------
let AC = null;
function audio() {
  if (!save.sound) return null;
  try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return null; }
  return AC;
}
function tone(freq, dur = 0.16, type = 'triangle', vol = 0.12, slide = 0, delay = 0) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(vol = 0.18, cutoff = 900, dur = 0.22) {
  const a = audio(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination); s.start();
}
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];
const note = i => 262 * Math.pow(2, SCALE[Math.min(i, SCALE.length - 1)] / 12);


// ---------- timeline ----------
function at(ms, fn) { timeline.push({ t: now + ms, fn }); }
function runTimeline() {
  if (!timeline.length) return;
  timeline.sort((a, b) => a.t - b.t);
  while (timeline.length && timeline[0].t <= now) timeline.shift().fn();
}


// ---------- drawing primitives ----------
const rand = (a, b) => a + Math.random() * (b - a);
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
// a fuzzy mold spore: soft halo, hairs with little knobs, speckled core
// Hand-drawn spore (round in flight, squashed on landing). Both frames share one crop and scale:
// the round body is 763 source px wide; (633, 634) is its flight centre, y 1006 its contact point.
const SPORE_ART = { ox: 196, oy: 250, k: 128 / 763, cx: 633, cy: 634, by: 1006, ref: 763 };
// where a dropped spore touches the cupcake: a little below the top of its sprite
function sporeContactY(i) {
  const c = state.cells[i], key = c && TYPES[c.t].key, m = key && META[key];
  if (!m) return cyOf(i) - S * 0.3 + S * 0.2;
  return baseY(i) - m.ay * (m.k || 1) * spriteScale() * 0.8;
}
function drawSporeArt(g, key, x, y, D, rot = 0, alpha = 1, bottom = false) {
  const im = IMG[key]; if (!im) return;
  const A = SPORE_ART, s = D / A.ref / A.k;
  const ax = (A.cx - A.ox) * A.k, ay = ((bottom ? A.by : A.cy) - A.oy) * A.k;
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha *= alpha;
  g.drawImage(im, -ax * s, -ay * s, im.width * s, im.height * s);
  g.restore();
}
function drawSpore(g, x, y, r, rot = 0, alpha = 1, hairs = 11) {
  if (IMG.spore_round) { drawSporeArt(g, 'spore_round', x, y, r * 2.7, Math.sin(rot * 1.7) * 0.22, alpha); return; }
  g.save();
  g.translate(x, y); g.rotate(rot); g.globalAlpha = alpha;
  const hg = g.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.3);
  hg.addColorStop(0, 'rgba(206, 228, 150, 0.5)'); hg.addColorStop(1, 'rgba(206, 228, 150, 0)');
  g.fillStyle = hg; g.beginPath(); g.arc(0, 0, r * 2.3, 0, Math.PI * 2); g.fill();
  g.lineCap = 'round';
  for (let k = 0; k < hairs; k++) {
    const a = k / hairs * Math.PI * 2 + Math.sin(now / 260 + k) * 0.12;
    const L1 = r * (1.45 + (k % 3) * 0.12);
    g.strokeStyle = '#6E8F2C'; g.lineWidth = Math.max(1, r * 0.13);
    g.beginPath(); g.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); g.lineTo(Math.cos(a) * L1, Math.sin(a) * L1); g.stroke();
    g.fillStyle = '#EEF6D6'; g.lineWidth = Math.max(0.8, r * 0.09);
    g.beginPath(); g.arc(Math.cos(a) * L1, Math.sin(a) * L1, Math.max(1.2, r * 0.2), 0, Math.PI * 2); g.fill(); g.stroke();
  }
  const cg = g.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  cg.addColorStop(0, '#F4FADF'); cg.addColorStop(0.45, '#A9C95A'); cg.addColorStop(1, '#5E7E24');
  g.fillStyle = cg; g.strokeStyle = '#4A2E27'; g.lineWidth = Math.max(1.2, r * 0.17);
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = 'rgba(74, 70, 30, 0.55)';
  [[0.3, 0.25, 0.14], [-0.2, 0.4, 0.1], [0.42, -0.15, 0.09]].forEach(([a, b, s]) => { g.beginPath(); g.arc(a * r, b * r, s * r, 0, Math.PI * 2); g.fill(); });
  g.restore();
}
function drawMoldCherry(g, x, y, r, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.strokeStyle = '#4A2E27'; g.lineWidth = Math.max(1.5, r * 0.16); g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, -r * 0.8); g.quadraticCurveTo(r * 0.3, -r * 1.6, r * 0.9, -r * 1.9); g.stroke();
  const cg = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  cg.addColorStop(0, '#FF9AA0'); cg.addColorStop(0.4, '#E0414E'); cg.addColorStop(1, '#9C2230');
  g.fillStyle = cg; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = 'rgba(160, 200, 90, 0.9)';
  [[0.35, 0.3, 0.28], [-0.4, 0.2, 0.2], [0.05, -0.45, 0.16]].forEach(([a, b, s]) => { g.beginPath(); g.arc(a * r, b * r, s * r, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.4, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); g.fill();
  g.restore();
}
function drawCreamBlob(g, x, y, r, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.strokeStyle = '#4A2E27'; g.lineWidth = Math.max(1.3, r * 0.14); g.fillStyle = '#FFF7EA';
  const blobs = [[0, 0.15, 1], [-0.55, 0.3, 0.7], [0.55, 0.3, 0.72], [0.05, -0.55, 0.62]];
  blobs.forEach(([a, b, s]) => { g.beginPath(); g.arc(a * r, b * r, s * r, 0, Math.PI * 2); g.stroke(); });
  blobs.forEach(([a, b, s]) => { g.beginPath(); g.arc(a * r, b * r, s * r - g.lineWidth / 2, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = 'rgba(147, 183, 67, 0.95)';
  [[0.3, 0.1], [-0.4, 0.35], [0.1, -0.5], [0.55, 0.5]].forEach(([a, b]) => { g.beginPath(); g.arc(a * r, b * r, r * 0.12, 0, Math.PI * 2); g.fill(); });
  g.restore();
}
function drawSpatula(g, x, y, s, kind) {
  // kind '/' runs bottom-left to top-right; '\' runs top-left to bottom-right
  g.save(); g.translate(x, y);
  g.scale(1, 0.74);
  g.rotate(kind === '/' ? -Math.PI / 4 : Math.PI / 4);
  g.strokeStyle = '#4A2E27'; g.lineWidth = Math.max(1.5, s * 0.035);
  g.fillStyle = '#C98A52';
  roundRect(g, -s * 0.46, -s * 0.05, s * 0.5, s * 0.1, s * 0.05); g.fill(); g.stroke();
  const bg = g.createLinearGradient(0, -s * 0.15, 0, s * 0.15);
  bg.addColorStop(0, '#F1C98E'); bg.addColorStop(1, '#D9A46A');
  g.fillStyle = bg;
  roundRect(g, -s * 0.02, -s * 0.15, s * 0.48, s * 0.3, s * 0.12); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = Math.max(1, s * 0.02);
  g.beginPath(); g.moveTo(s * 0.06, -s * 0.08); g.lineTo(s * 0.36, -s * 0.08); g.stroke();
  g.restore();
}
function drawWrap(g, x, by, w, alpha = 1, flash = 0) {
  const h = w * 1.18;
  g.save(); g.globalAlpha = alpha;
  roundRect(g, x - w / 2, by - h, w, h + 2, w * 0.22);
  g.fillStyle = `rgba(214, 236, 255, ${0.26 + flash * 0.3})`; g.fill();
  g.lineWidth = 2 + flash * 2; g.strokeStyle = 'rgba(255, 255, 255, 0.9)'; g.stroke();
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(110, 150, 190, 0.55)'; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2.2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - w * 0.32, by - h * 0.6); g.lineTo(x - w * 0.18, by - h * 0.78); g.stroke();
  g.beginPath(); g.moveTo(x - w * 0.34, by - h * 0.42); g.lineTo(x - w * 0.3, by - h * 0.48); g.stroke();
  const ty = by - h - 1;
  g.fillStyle = '#F08EA0'; g.strokeStyle = '#4A2E27'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(x, ty); g.lineTo(x - w * 0.16, ty - w * 0.1); g.lineTo(x - w * 0.16, ty + w * 0.08); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x, ty); g.lineTo(x + w * 0.16, ty - w * 0.1); g.lineTo(x + w * 0.16, ty + w * 0.08); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.arc(x, ty, w * 0.04, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}
function drawTag(g, x, y, r, n, pulse) {
  g.save(); g.translate(x, y);
  const s = 1 + pulse * 0.12; g.scale(s, s);
  g.fillStyle = '#DB4B58'; g.strokeStyle = '#4A2E27'; g.lineWidth = 2;
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#FFF9F2'; g.font = `${Math.round(r * 1.25)}px Jua, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 0, r * 0.08);
  g.restore();
}
function drawHand(g, x, y, r, grab) {
  g.save(); g.translate(x, y);
  g.fillStyle = '#F7CFAE'; g.strokeStyle = '#4A2E27'; g.lineWidth = Math.max(1.5, r * 0.09);
  const fw = r * 0.34, spread = grab ? 0.55 : 1;
  for (let k = 0; k < 4; k++) { const fx = (-1.5 + k) * fw * 1.05 * spread; roundRect(g, fx - fw / 2, -r * 0.05, fw, r * (k === 1 || k === 2 ? 1.1 : 0.95), fw / 2); g.fill(); g.stroke(); }
  g.beginPath(); g.ellipse(0, -r * 0.2, r * 0.75, r * 0.62, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.save(); g.translate(-r * 0.62, -r * 0.05); g.rotate(0.7); roundRect(g, -fw / 2, -fw * 0.2, fw, r * 0.7, fw / 2); g.fill(); g.stroke(); g.restore();
  g.restore();
}
function drawSpriteAt(g, key, x, by, sc, rot = 0, sx = 1, sy = 1, flip = false, alpha = 1, src) {
  const m = META[key], im = src || IMG[key];
  if (!im || !m) return;
  sc *= m.k || 1;
  g.save(); g.translate(x, by); g.rotate(rot); g.scale(sc * sx * (flip ? -1 : 1), sc * sy); g.globalAlpha = alpha;
  g.drawImage(im, -m.ax, -m.ay);
  g.restore();
}
function sporeSVG(used) {
  if (typeof ASSETS !== 'undefined' && ASSETS.spore_round) return `<img class="pip${used ? ' used' : ''}" src="${ASSETS.spore_round}" alt="">`;
  let hairs = '';
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    hairs += `<line x1="${(c * 6.5).toFixed(1)}" y1="${(s * 6.5).toFixed(1)}" x2="${(c * 11.5).toFixed(1)}" y2="${(s * 11.5).toFixed(1)}"/><circle cx="${(c * 12).toFixed(1)}" cy="${(s * 12).toFixed(1)}" r="1.7" fill="#EEF6D6"/>`;
  }
  return `<svg viewBox="-16 -16 32 32" class="${used ? 'used' : ''}" aria-hidden="true"><circle r="14" fill="#DDEBB8" opacity=".5"/><g stroke="#6E8F2C" stroke-width="1.2">${hairs}</g><circle r="7.5" fill="#93B743" stroke="#4A2E27" stroke-width="1.6"/><circle cx="-2.4" cy="-2.6" r="2.6" fill="#F4FADF"/><circle cx="2.4" cy="2" r="1.1" fill="#4A461E" opacity=".55"/></svg>`;
}

// ---------- effects ----------
function moldPuffs(i, n = 12, spread = 0.42) {
  const x = cxOf(i), y = cyOf(i) - S * 0.12;
  const cols = ['228, 240, 198', '170, 204, 96', '255, 255, 240', '196, 222, 140'];
  for (let k = 0; k < n; k++) {
    const a = rand(0, Math.PI * 2), d = rand(0.05, spread) * S;
    particles.push({ kind: 'puff', x: x + Math.cos(a) * d * 0.9, y: y + Math.sin(a) * d * 0.7, vx: Math.cos(a) * rand(4, 18), vy: Math.sin(a) * rand(4, 14) - 10, r: rand(0.07, 0.15) * S, born: now + rand(0, 90), life: rand(520, 900), col: cols[k % cols.length] });
  }
}
function sporeDust(x, y, n = 8, spd = 1) {
  for (let k = 0; k < n; k++) {
    const a = rand(0, Math.PI * 2), sp = rand(30, 110) * spd;
    particles.push({ kind: 'mote', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, r: rand(1.4, 3) * (S / 70), born: now, life: rand(500, 900), drag: 2.5 });
  }
}
function trailMote(x, y) { particles.push({ kind: 'mote', x: x + rand(-2, 2), y: y + rand(-2, 2), vx: rand(-8, 8), vy: rand(-14, -4), r: rand(1, 2.2) * (S / 70), born: now, life: rand(350, 650), drag: 1 }); }
function sprinkleBurst(i) {
  const x = cxOf(i), y = cyOf(i) - S * 0.45;
  const cols = ['#F48FB1', '#FFE082', '#81D4FA', '#A5D6A7', '#FFFFFF', '#CE93D8'];
  for (let k = 0; k < 16; k++) {
    const a = rand(0, Math.PI * 2), sp = rand(80, 220);
    particles.push({ kind: 'stick', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, rot: rand(0, 6), vr: rand(-12, 12), r: S * 0.05, born: now, life: rand(600, 900), grav: 600, col: cols[k % cols.length] });
  }
}
function creamSplat(x, y) {
  for (let k = 0; k < 7; k++) {
    const a = rand(Math.PI, Math.PI * 2), sp = rand(40, 120);
    particles.push({ kind: 'cream', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(0.04, 0.08) * S, born: now, life: rand(400, 650), grav: 500 });
  }
}
function frostBurst(i, amt = 1) {
  const x = cxOf(i), y = cyOf(i) - S * 0.2;
  for (let k = 0; k < Math.round(12 * amt); k++) {
    const a = rand(0, Math.PI * 2), sp = rand(30, 110);
    particles.push({ kind: 'flake', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, r: rand(0.035, 0.07) * S, rot: rand(0, 6), vr: rand(-4, 4), born: now, life: rand(600, 1000), drag: 2 });
  }
}
function lidFly(i) {
  const sc = spriteScale();
  const y = baseY(i) - (META.butter ? META.butter.ay - 30 * META.butter.w / 115 : 110) * sc;
  particles.push({ kind: 'img', img: 'butter_lid', x: cxOf(i) + 8 * sc, y, vx: rand(-90, 90), vy: -260, rot: 0, vr: rand(-9, 9), sc, born: now, life: 900, grav: 900 });
}
function wrapShreds(i) {
  const x = cxOf(i), y = cyOf(i) - S * 0.2;
  for (let k = 0; k < 10; k++) {
    const a = rand(0, Math.PI * 2), sp = rand(60, 170);
    particles.push({ kind: 'shard', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, rot: rand(0, 6), vr: rand(-10, 10), r: rand(0.05, 0.1) * S, born: now, life: 700, grav: 500 });
  }
}
function stink(i) {
  const x = cxOf(i) + rand(-0.2, 0.25) * S, y = cyOf(i) - S * 0.55;
  particles.push({ kind: 'stink', x, y, vx: rand(-4, 4), vy: -16, born: now, life: 1700, w: rand(0.12, 0.2) * S, ph: rand(0, 6) });
}
function floatText(x, y, str, col = '#4A2E27', size = 0.32, life = 900) { texts.push({ x, y, str, col, size, born: now, life }); }
function bump(i, amp = 0.18) { if (vis[i]) { vis[i].bumpAt = now; vis[i].bumpAmp = amp; } }
const pick = arr => arr[Math.floor(Math.random() * arr.length)];


// ---------- cascade: same rules as logic.fire, played out on a clock ----------
const DROP = 520, INCUBATE = 150;
function travelTime(sp) {
  if (sp.style === 'roll') return 95 * sp.path.length + 60;
  if (sp.style === 'lob') return sp.dist === 2 ? 430 : 320;
  if (sp.style === 'zip') return 190;
  if (sp.style === 'burst') return 250;
  if (sp.style === 'waft') return 380 + 40 * Math.min(8, sp.dist || 1);
  return 230;
}
// Same rules as logic.cascade (hitCell), played out on a clock. seeds: [{ idx, t, direct?, release? }]
function planCascade(s0, seeds, mutate) {
  const sim = mutate ? s0 : cloneState(s0);
  const hits = [], flights = [];
  const queue = seeds.map(h => ({ from: -1, depth: 0, ...h }));
  while (queue.length) {
    queue.sort((a, b) => a.t - b.t);
    const h = queue.shift();
    const r = hitCell(sim, h);
    if (r.kind === 'none') { if (h.from >= 0 && sim.cells[h.idx]) hits.push({ ...h, kind: 'thud' }); continue; }
    hits.push({ ...h, ...r });
    if (!r.spread) continue;
    const t0 = h.t + INCUBATE;
    const strong = !!TYPES[sim.cells[h.idx].t].strong;
    for (const sp of spreadsOf(sim, h.idx, true)) {
      if (sp.to >= 0 && sim.cells[sp.to].inf && !(sim.cells[sp.to].wrap && strong) && sp.style !== 'roll') continue;
      const dur = travelTime(sp);
      flights.push({ ...sp, from: h.idx, t0, dur, depth: h.depth, strong });
      if (sp.to >= 0) queue.push({ t: t0 + dur, idx: sp.to, from: h.idx, direct: false, strong, depth: h.depth + 1 });
    }
  }
  return { hits, flights, sim };
}
// The chilled lemons of one end-of-turn, as a cascade starting at time 0.
function planRelease(sim) {
  const seeds = [];
  sim.cells.forEach((c, i) => { if (c && c.pend) seeds.push({ idx: i, t: 0, direct: false, release: true }); });
  return planCascade(sim, seeds, true);
}

const tileBump = {};
function bumpTile(i) { tileBump[i] = now; }

function missLand(f) {
  if (f.style === 'roll') return;
  const c = f.path[f.path.length - 1];
  const x = cxOf(c), y = wellY(c) - S * 0.05;
  if (f.style === 'lob') creamSplat(x, y); else sporeDust(x, y, 5, 0.6);
}

function applyHit(h) {
  const v = vis[h.idx]; if (!v) return;
  const x = cxOf(h.idx), y = cyOf(h.idx);
  if (h.kind === 'thud') { bump(h.idx, 0.06); return; }
  if (h.direct) { sporeDust(x, y - S * 0.2, 16); noise(0.16, 700); }
  if (h.torn) { v.wrap = false; wrapShreds(h.idx); tone(900, 0.08, 'square', 0.03, 0.4); }
  if (h.kind === 'pending') {
    v.pend = true; v.pendAt = now; bump(h.idx, 0.18);
    frostBurst(h.idx); tone(1400, 0.15, 'sine', 0.05, 0.7);
    floatText(x, y - S * 0.8, t('fx.pending'), '#5E8FB8', 0.26, 900);
    return;
  }
  if (h.release) { v.pend = false; frostBurst(h.idx, 0.6); }
  if (h.lidPop) { v.lid = 0; lidFly(h.idx); floatText(x, y - S * 0.75, t('fx.espresso'), '#6B3E2A', 0.26, 800); }
  if (h.late) { v.wrap = false; v.sealed = false; wrapShreds(h.idx); tone(900, 0.08, 'square', 0.03, 0.4); bump(h.idx, 0.14); return; }
  if (h.kind === 'lid') {
    v.lid = Math.max(0, v.lid - 1);
    lidFly(h.idx); bump(h.idx, 0.22);
    tone(660, 0.12, 'sine', 0.09, 1.8);
    floatText(x, y - S * 0.75, t('fx.lid'), '#7C5D51', 0.26, 800);
    return;
  }
  v.infAt = now;
  v.sealed = h.kind === 'sealed';
  bump(h.idx, 0.12);
  moldPuffs(h.idx, h.kind === 'sealed' ? 6 : 12, h.kind === 'sealed' ? 0.25 : 0.42);
  if (!h.direct) sporeDust(x, y - S * 0.25, 6, 0.7);
  if (v.t === 's' && h.kind === 'infect') at(INCUBATE - 20, () => { sprinkleBurst(h.idx); noise(0.08, 3000, 0.12); });
  tone(note(h.depth), 0.2, 'triangle', 0.1);
  if (h.kind === 'sealed') { v.flashAt = now; tone(180, 0.12, 'square', 0.03); floatText(x, y - S * 0.8, t('fx.sealed'), '#6E8FB4', 0.24, 800); }
}

function customerPhase(list, k, done) {
  if (k >= list.length) { done(); return; }
  const c = list[k];
  const idx = c.k.r * state.W + c.k.c;
  arm = { idx, t0: now, fresh: c.fresh };
  const DUR = c.fresh ? 1250 : 1100;
  at(430, () => {
    if (c.fresh) { vis[idx] && (vis[idx].gone = true); floatText(cxOf(idx), cyOf(idx) - S * 0.95, pick(t('yum')), '#7C5D51', 0.3, 1000); tone(392, 0.12, 'triangle', 0.08); tone(523, 0.18, 'triangle', 0.08, 1, 0.1); }
    else { floatText(cxOf(idx), cyOf(idx) - S * 0.95, pick(t('yuck')), '#DB4B58', 0.36, 1100); tone(220, 0.35, 'sawtooth', 0.04, 0.6); bump(idx, 0.2); }
  });
  at(DUR, () => { arm = null; c.k.pending = false; customerPhase(list, k + 1, done); });
}


// ---------- frame ----------
function frame(t) {
  const dt = Math.min(0.05, (t - now) / 1000);
  now = t;
  runTimeline();
  if (state && screen === 'play') draw(dt);
  requestAnimationFrame(frame);
}
function isZombieShown(v) { return v.infAt >= 0 ? (now - v.infAt >= 230) : v.zombie; }

// Hand-drawn tray: the base is 9-sliced so the rim keeps its thickness on any board shape,
// and the tray with its wells is cached until the layout changes.
const TRAY_PAD = { tray_base: 5.22, tray_well: 2.18 };
let trayCache = { key: '', cv: null };
// Equal gap (0.34 cell) between the outermost wells and the rim on all four sides.
// Wells span x ±0.4 around the cell centre and y [cy+0.0, cy+0.48]; cupcakes in the top row may stand above the rim.
function trayRect() { return { x: padX - S * 0.24, y: padTop + S * 0.16, w: state.W * S + S * 0.48, h: state.H * S + S * 0.16 }; }
function drawTrayArt(g) {
  const { x, y, w, h } = trayRect();
  const im = IMG.tray_base, p = TRAY_PAD.tray_base;
  const sx0 = p, sy0 = p, sw = im.width - 2 * p, sh = im.height - 2 * p;
  const c = sw * 0.12, d = Math.min(S * 0.42, Math.min(w, h) / 2); // rim inner edge lands ~0.22 cell in
  g.fillStyle = 'rgba(74, 46, 39, 0.16)'; roundRect(g, x + 6, y + 9, w, h, S * 0.3); g.fill();
  const xs = [[sx0, c, x, d], [sx0 + c, sw - 2 * c, x + d, w - 2 * d], [sx0 + sw - c, c, x + w - d, d]];
  const ys = [[sy0, c, y, d], [sy0 + c, sh - 2 * c, y + d, h - 2 * d], [sy0 + sh - c, c, y + h - d, d]];
  for (const [sx, sw2, dx, dw] of xs) for (const [sy, sh2, dy, dh] of ys) g.drawImage(im, sx, sy, sw2, sh2, dx - 0.3, dy - 0.3, dw + 0.6, dh + 0.6);
  const wl = IMG.tray_well, q = TRAY_PAD.tray_well;
  for (let i = 0; i < state.W * state.H; i++) g.drawImage(wl, q, q, wl.width - 2 * q, wl.height - 2 * q, cxOf(i) - S * 0.4, wellY(i) - S * 0.24, S * 0.8, S * 0.48);
}
function drawTray() {
  if (IMG.tray_base && IMG.tray_well) {
    const key = [S, state.W, state.H, DPR, CW, CH].join('|');
    if (trayCache.key !== key) {
      const cv = trayCache.cv || document.createElement('canvas');
      cv.width = Math.round(CW * DPR); cv.height = Math.round(CH * DPR);
      const g = cv.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, CW, CH);
      drawTrayArt(g); trayCache = { key, cv };
    }
    ctx.drawImage(trayCache.cv, 0, 0, CW, CH);
  } else drawTrayPlain();
  // a soft colour pool in the well tells the cupcake type at a glance
  ctx.save();
  for (let i = 0; i < state.W * state.H; i++) {
    const v = vis[i];
    if (!v || v.gone || isZombieShown(v) || TYPES[v.t].wall) continue;
    ctx.fillStyle = `rgba(${TYPE_TINT[TYPES[v.t].key]}, 0.42)`;
    ctx.beginPath(); ctx.ellipse(cxOf(i), wellY(i) + S * 0.01, S * 0.32, S * 0.19, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawTrayPlain() {
  const { x, y, w, h } = trayRect();
  ctx.save();
  ctx.fillStyle = 'rgba(74, 46, 39, 0.16)';
  roundRect(ctx, x + 6, y + 9, w, h, S * 0.3); ctx.fill();
  const gr = ctx.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#EEF0F3'); gr.addColorStop(0.5, '#D3D8DF'); gr.addColorStop(1, '#BAC1CA');
  ctx.fillStyle = gr; roundRect(ctx, x, y, w, h, S * 0.3); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#4A2E27'; ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  roundRect(ctx, x + 5, y + 5, w - 10, h - 10, S * 0.24); ctx.stroke();
  for (let i = 0; i < state.W * state.H; i++) {
    const cx = cxOf(i), cy = wellY(i), rx = S * 0.4, ry = S * 0.26;
    const wg = ctx.createRadialGradient(cx, cy - ry * 0.6, ry * 0.2, cx, cy, rx);
    wg.addColorStop(0, '#9AA2AD'); wg.addColorStop(0.75, '#B9C0C9'); wg.addColorStop(1, '#E9ECF0');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(74, 46, 39, 0.35)'; ctx.stroke();
  }
  ctx.restore();
}

function draw(dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, CW, CH);
  drawTray();
  const sc = spriteScale(), T = now / 1000, W = state.W;

  // spatulas
  state.tiles.forEach((tk, i) => {
    if (!tk) return;
    const b = tileBump[i] ? Math.max(0, 1 - (now - tileBump[i]) / 300) : 0;
    drawSpatula(ctx, cxOf(i), wellY(i) - S * 0.02 - b * S * 0.06, S * (0.82 + b * 0.08), tk);
  });

  const scared = new Set();
  vis.forEach((v, i) => {
    if (!v || !isZombieShown(v) || v.gone) return;
    const r = Math.floor(i / W), c = i % W;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < state.H && cc >= 0 && cc < W) scared.add(rr * W + cc); }
  });

  const focusIdx = introOpen ? -1 : hover >= 0 ? hover : selected >= 0 ? selected : (cursorShown ? cursor : -1);
  const canPreview = focusIdx >= 0 && !busy && !result && state.cells[focusIdx] && !state.cells[focusIdx].inf;
  if (focusIdx >= 0 && !result && !introOpen) {
    ctx.save(); ctx.setLineDash([6, 5]); ctx.lineDashOffset = -T * 20; ctx.lineWidth = 3;
    ctx.strokeStyle = canPreview ? '#5B7A21' : 'rgba(74,46,39,0.4)';
    ctx.beginPath(); ctx.ellipse(cxOf(focusIdx), wellY(focusIdx), S * 0.46, S * 0.32, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  for (const k of state.customers) {
    if (k.done && !k.pending) continue;
    const i = k.r * W + k.c;
    if (!state.cells[i] || (state.cells[i].inf && !k.pending) || (vis[i] && vis[i].gone)) continue;
    ctx.save(); ctx.fillStyle = 'rgba(219, 75, 88, 0.25)';
    ctx.beginPath(); ctx.ellipse(cxOf(i), wellY(i), S * 0.44, S * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  for (let i = 0; i < vis.length; i++) {
    const v = vis[i];
    if (!v || v.gone) continue;
    if (arm && arm.idx === i && arm.fresh && now - arm.t0 > 430) continue;
    drawCupcake(i, v, sc, T, scared.has(i));
  }

  if (canPreview) drawPreview(focusIdx, T);

  for (const k of state.customers) {
    if (k.done && !k.pending) continue;
    const i = k.r * W + k.c;
    if (!state.cells[i] || (state.cells[i].inf && !k.pending) || (vis[i] && vis[i].gone)) continue;
    const left = k.turn - state.turn;
    drawTag(ctx, cxOf(i) + S * 0.33, cyOf(i) - S * 0.5, S * 0.15, left > 0 ? left : '!', left <= 1 ? (Math.sin(T * 6) * 0.5 + 0.5) : 0);
  }

  drawHintMarker(T);
  drawProjectiles(sc);
  drawParticles(dt);
  drawArm(sc);
  drawTexts();
  if (!reduceMotion) vis.forEach((v, i) => { if (v && !v.gone && isZombieShown(v) && !v.sealed && Math.random() < dt * 0.09) stink(i); });
}

// pattern preview: where this cupcake's spores would go if it went bad right now
function drawPreview(i, T) {
  const spreads = spreadsOf(state, i, true);
  ctx.save();
  ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.lineDashOffset = -T * 16; ctx.lineCap = 'round';
  for (const sp of spreads) {
    const fresh = sp.to >= 0 && !state.cells[sp.to].inf;
    ctx.strokeStyle = fresh ? 'rgba(91, 122, 33, 0.75)' : 'rgba(91, 122, 33, 0.28)';
    ctx.beginPath();
    if (sp.style === 'roll') {
      ctx.moveTo(cxOf(i), wellY(i));
      sp.path.forEach(c => ctx.lineTo(cxOf(c), wellY(c)));
      if (sp.miss && sp.exit) ctx.lineTo(padX + (sp.exit[1] + 0.5) * S, padTop + (sp.exit[0] + 0.5) * S + S * 0.24);
    } else {
      const c = sp.path[sp.path.length - 1];
      const ax = cxOf(i), ay = cyOf(i) - S * 0.25, bx = cxOf(c), by = cyOf(c) - S * 0.2;
      const lift = sp.style === 'lob' ? S * (sp.dist === 2 ? 0.9 : 0.5) : S * 0.25;
      ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - lift, bx, by);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const sp of spreads) {
    if (sp.to < 0 || state.cells[sp.to].inf) continue;
    drawSpore(ctx, cxOf(sp.to), cyOf(sp.to) - S * 0.2, S * 0.085 * (1 + Math.sin(T * 5 + sp.to) * 0.08), T * 0.6, 1, 9);
  }
  ctx.restore();
}

function drawCupcake(i, v, sc, T, scared) {
  const x0 = cxOf(i), by = baseY(i);
  const zombie = isZombieShown(v);
  let rot = 0, sx = 1, sy = 1, dx = 0, dy = 0;
  if (!reduceMotion) {
    if (zombie) rot = Math.sin(T * 1.7 + v.phase) * 0.055;
    else {
      dy = Math.sin(T * 2.4 + v.phase) * S * 0.012;
      sy = 1 + Math.sin(T * 2.4 + v.phase) * 0.012; sx = 2 - sy;
      if (scared) { dx = Math.sin(T * 47 + v.phase * 3) * S * 0.012; rot = Math.sin(T * 31 + v.phase) * 0.02; }
    }
    if (v.bumpAt >= 0) { const e = (now - v.bumpAt) / 1000; if (e < 0.7) { const k = v.bumpAmp * Math.exp(-e * 7) * Math.cos(e * 26); sy *= 1 - k; sx *= 1 + k * 0.8; } }
  }
  ctx.save(); ctx.fillStyle = 'rgba(60, 40, 40, 0.18)';
  ctx.beginPath(); ctx.ellipse(x0, by - S * 0.04, S * 0.33, S * 0.09, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  let freshKey = v.t === 'b' ? (v.lid > 0 ? 'butter' : 'butter_open') : TYPES[v.t].key;
  if (v.pend && !zombie) {
    if (IMG['pending_' + freshKey]) freshKey = 'pending_' + freshKey;
    if (!reduceMotion) { dx += Math.sin(T * 60 + v.phase) * S * 0.018; rot = Math.sin(T * 40) * 0.025; }
  }
  if (!zombie) {
    drawSpriteAt(ctx, freshKey, x0 + dx, by + dy, sc, rot, sx, sy);
    if (v.infAt >= 0 && TINT[freshKey]) { const p = Math.min(1, (now - v.infAt) / 230); drawSpriteAt(ctx, freshKey, x0 + dx, by + dy, sc, rot + Math.sin(now / 18) * 0.05 * p, sx, sy, false, p, TINT[freshKey]); }
  } else drawSpriteAt(ctx, zombieKey(v), x0 + dx, by + dy, sc, rot, sx, sy, v.flip);
  if (v.wrap) { const fl = v.flashAt >= 0 ? Math.max(0, 1 - (now - v.flashAt) / 500) : 0; drawWrap(ctx, x0 + dx, by + dy + 2, S * 0.86, 1, fl); }
}

function pathPoint(pts, p) {
  let total = 0; const seg = [];
  for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(d); total += d; }
  let d = p * total;
  for (let k = 0; k < seg.length; k++) { if (d <= seg[k] || k === seg.length - 1) { const f = seg[k] ? Math.min(1, d / seg[k]) : 1; return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f, p * total]; } d -= seg[k]; }
  return [pts[pts.length - 1][0], pts[pts.length - 1][1], total];
}

function drawProjectiles(sc) {
  projs = projs.filter(f => now < f.t0 + f.dur + 40);
  for (const f of projs) {
    if (now < f.t0) continue;
    const p = Math.min(1, (now - f.t0) / f.dur);
    if (f.style === 'drop') {
      const tx = cxOf(f.to), ty = IMG.spore_round ? sporeContactY(f.to) - S * 0.405 * (SPORE_ART.by - SPORE_ART.cy) / SPORE_ART.ref : cyOf(f.to) - S * 0.3;
      const e = 1 - Math.pow(1 - p, 2.2);
      const x = tx + Math.sin(p * Math.PI * 2.2) * S * 0.18 * (1 - p), y = -S * 0.3 + (ty + S * 0.3) * e;
      if (Math.random() < 0.7) trailMote(x, y);
      drawSpore(ctx, x, y, S * 0.15, p * 3, 1, 12);
      continue;
    }
    const a = f.from;
    if (f.style === 'roll') {
      const pts = [[cxOf(a), wellY(a) - S * 0.1]].concat(f.path.map(c => [cxOf(c), wellY(c) - S * 0.1]));
      if (f.miss && f.exit) pts.push([padX + (f.exit[1] + 0.5) * S, padTop + (f.exit[0] + 0.5) * S + S * 0.14]);
      const [x, y, dist] = pathPoint(pts, p);
      const r = S * 0.12;
      const alpha = f.miss ? Math.min(1, (1 - p) * 4) : 1;
      ctx.save(); ctx.globalAlpha = alpha; drawMoldCherry(ctx, x, y - r * 0.4, r, dist / r); ctx.restore();
      if (Math.random() < 0.5) trailMote(x, y);
      continue;
    }
    const c = f.path[f.path.length - 1];
    const ax = cxOf(a), ay = cyOf(a) - S * 0.3;
    const bx = cxOf(c), by = f.miss ? wellY(c) - S * 0.05 : cyOf(c) - S * 0.22;
    if (f.style === 'lob') {
      const lift = S * (f.dist === 2 ? 1.0 : 0.6);
      const x = ax + (bx - ax) * p, y = ay + (by - ay) * p - Math.sin(Math.PI * p) * lift;
      drawCreamBlob(ctx, x, y, S * 0.1, p * 4);
      continue;
    }
    const e = f.style === 'zip' ? p : 1 - Math.pow(1 - p, 1.6);
    const lift = f.style === 'zip' ? S * 0.12 : f.style === 'burst' ? S * 0.3 : S * 0.38;
    const x = ax + (bx - ax) * e, y = ay + (by - ay) * e - Math.sin(Math.PI * e) * lift;
    if (Math.random() < 0.8) trailMote(x, y);
    if (f.style === 'zip') {
      ctx.save(); ctx.strokeStyle = 'rgba(147, 183, 67, 0.45)'; ctx.lineWidth = S * 0.06; ctx.lineCap = 'round';
      const back = Math.max(0, e - 0.25), bx2 = ax + (bx - ax) * back, by2 = ay + (by - ay) * back - Math.sin(Math.PI * back) * lift;
      ctx.beginPath(); ctx.moveTo(bx2, by2); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
    }
    drawSpore(ctx, x, y, S * 0.075, p * 5, 1, 9);
  }
}

function drawParticles(dt) {
  particles = particles.filter(p => now < p.born + p.life);
  for (const p of particles) {
    if (now < p.born) continue;
    const age = (now - p.born) / p.life;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.grav) p.vy += p.grav * dt;
    if (p.drag) { p.vx *= Math.max(0, 1 - p.drag * dt); p.vy *= Math.max(0, 1 - p.drag * dt); }
    if (p.vr) p.rot += p.vr * dt;
    ctx.save();
    if (p.kind === 'puff') {
      const r = p.r * (0.4 + age * 1.1), a = (1 - age) * 0.9;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(${p.col}, ${a})`); g.addColorStop(0.6, `rgba(${p.col}, ${a * 0.6})`); g.addColorStop(1, `rgba(${p.col}, 0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'land') {
      // touch down: round 40ms, squash 110ms, round 110ms with a small rebound, then melt into the cupcake
      const e = now - p.born, up = e > 150 ? Math.sin(Math.min(1, (e - 150) / 110) * Math.PI) * S * 0.04 : 0;
      ctx.globalAlpha = e > 230 ? Math.max(0, 1 - (e - 230) / 70) : 1;
      drawSporeArt(ctx, e >= 40 && e < 150 ? 'spore_squash' : 'spore_round', p.x, p.y - up, p.D, 0, 1, true);
    } else if (p.kind === 'mote') {
      ctx.globalAlpha = (1 - age) * 0.9;
      ctx.fillStyle = '#EEF6D6'; ctx.strokeStyle = '#7E9E3A'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (p.kind === 'img') {
      const m = META[p.img]; if (!m) { ctx.restore(); continue; }
      ctx.globalAlpha = 1 - Math.max(0, age - 0.7) / 0.3;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(p.sc, p.sc);
      ctx.drawImage(IMG[p.img], -m.w / 2, -m.h / 2);
    } else if (p.kind === 'shard') {
      ctx.globalAlpha = 1 - age; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = 'rgba(220, 238, 255, 0.85)'; ctx.strokeStyle = 'rgba(110,150,190,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-p.r, -p.r * 0.4); ctx.lineTo(p.r, -p.r * 0.7); ctx.lineTo(p.r * 0.5, p.r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (p.kind === 'stick') {
      ctx.globalAlpha = 1 - Math.max(0, age - 0.6) / 0.4; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.col; ctx.strokeStyle = 'rgba(74,46,39,0.6)'; ctx.lineWidth = 0.8;
      roundRect(ctx, -p.r, -p.r * 0.28, p.r * 2, p.r * 0.56, p.r * 0.28); ctx.fill(); ctx.stroke();
    } else if (p.kind === 'cream') {
      ctx.globalAlpha = 1 - age; ctx.fillStyle = '#FFF7EA'; ctx.strokeStyle = 'rgba(74,46,39,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (p.kind === 'flake') {
      ctx.globalAlpha = 1 - age; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.strokeStyle = '#8FC3EA'; ctx.lineWidth = Math.max(1, p.r * 0.35); ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-p.r, 0); ctx.lineTo(p.r, 0); ctx.stroke(); }
    } else if (p.kind === 'stink') {
      ctx.globalAlpha = Math.sin(Math.PI * age) * 0.4;
      ctx.strokeStyle = '#7C6A3E'; ctx.lineWidth = Math.max(1.2, S * 0.025); ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) { const yy = p.y - k * p.w * 0.12, xx = p.x + Math.sin(k * 0.9 + p.ph + age * 4) * p.w * 0.18; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawArm(sc) {
  if (!arm) return;
  const i = arm.idx, e = now - arm.t0;
  const tx = cxOf(i), ty = cyOf(i) - S * 0.62;
  let y;
  if (e < 430) { const p = e / 430; y = -S * 0.6 + (ty + S * 0.6) * (1 - Math.pow(1 - p, 3)); }
  else if (e < 600) y = ty;
  else { const p = Math.min(1, (e - 600) / (arm.fresh ? 600 : 380)); y = ty - (ty + S * 1.4) * p * p; }
  const shake = !arm.fresh && e > 430 && e < 650 ? Math.sin(e / 18) * S * 0.04 : 0;
  const x = tx + shake;
  ctx.save();
  ctx.fillStyle = '#9CC3E6'; ctx.strokeStyle = '#4A2E27'; ctx.lineWidth = 2.2;
  roundRect(ctx, x - S * 0.2, -S, S * 0.4, y + S * 0.85, S * 0.12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFF9F2'; roundRect(ctx, x - S * 0.23, y - S * 0.28, S * 0.46, S * 0.14, S * 0.06); ctx.fill(); ctx.stroke();
  ctx.restore();
  if (arm.fresh && e > 430) {
    const v = vis[i];
    const key = v.t === 'b' ? (v.lid > 0 ? 'butter' : 'butter_open') : TYPES[v.t].key;
    drawSpriteAt(ctx, key, x, y + S * 0.95, sc, Math.sin(e / 90) * 0.06);
  }
  drawHand(ctx, x, y, S * 0.24, arm.fresh && e > 430);
}

function drawTexts() {
  texts = texts.filter(t => now < t.born + t.life);
  for (const t of texts) {
    const age = (now - t.born) / t.life;
    const pop = age < 0.15 ? 0.6 + age / 0.15 * 0.5 : 1.1 - Math.min(0.1, (age - 0.15));
    ctx.save();
    ctx.globalAlpha = age > 0.7 ? 1 - (age - 0.7) / 0.3 : 1;
    ctx.translate(t.x, t.y - age * S * 0.4); ctx.scale(pop, pop);
    ctx.font = `${Math.round(S * t.size)}px Jua, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, S * t.size * 0.22); ctx.strokeStyle = '#FFF9F2'; ctx.strokeText(t.str, 0, 0);
    ctx.fillStyle = t.col; ctx.fillText(t.str, 0, 0);
    ctx.restore();
  }
}

