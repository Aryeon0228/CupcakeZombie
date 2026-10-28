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
  for (const k of ['basic', 'berry', 'sprinkle', 'cherry', 'cream', 'butter_open', 'butter', 'earl_grey', 'lemon_yogurt', 'pending_lemon_yogurt', 'espresso', 'blueberry', 'cinnamon_roll', 'coconut_snow', 'grapefruit_yogurt']) {
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
let AC = null, audioBus = null, lastChainNote = -Infinity;
const BUS_GAIN = 3.5; // master: chain notes ~-17 dBFS RMS, meow ~-11, peaks held at -1.4 by the limiter (0.7 left everything 15 dB too quiet)
let audioResume = null;
const soundBuffers = {}, soundVersions = { button: 0, meow: 0 };
function resumeAudio(a) {
  if (a.state === 'running') return Promise.resolve();
  if (!audioResume) audioResume = a.resume().finally(() => { audioResume = null; });
  return audioResume;
}
function audio() {
  if (!save.sound) return null;
  try {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      audioBus = AC.createGain();
      const limiter = AC.createDynamicsCompressor();
      limiter.threshold.value = -6; limiter.knee.value = 6; limiter.ratio.value = 12; // safety brickwall: only real peaks get squashed
      limiter.attack.value = 0.003; limiter.release.value = 0.12;
      audioBus.connect(limiter).connect(AC.destination);
    }
    audioBus.gain.setTargetAtTime(BUS_GAIN, AC.currentTime, 0.01);
    if (AC.state === 'suspended' || AC.state === 'interrupted') resumeAudio(AC).catch(() => {});
  } catch (e) { return null; }
  return AC;
}
function syncSound() {
  if (!save.sound) { soundVersions.button++; soundVersions.meow++; } // Cancel pending sounds when muted.
  if (!AC || !audioBus) return;
  const g = audioBus.gain; g.cancelScheduledValues(AC.currentTime);
  if (save.sound) g.setTargetAtTime(BUS_GAIN, AC.currentTime, 0.01); else g.setValueAtTime(0, AC.currentTime); // muting is immediate
}
function buttonSound() { return playUISound('button'); }
function cupcakeSound() { return playUISound('meow'); }
const lastVoice = {};
async function playUISound(key, pitch = 1) {
  const a = audio(); if (!a) return;
  const version = ++soundVersions[key];
  try {
    if (!soundBuffers[key]) {
      const bytes = Uint8Array.from(atob(SOUNDS[key]), c => c.charCodeAt(0));
      soundBuffers[key] = a.decodeAudioData(bytes.buffer).catch(e => { delete soundBuffers[key]; throw e; });
    }
    const [buffer] = await Promise.all([soundBuffers[key], resumeAudio(a)]);
    if (!save.sound || version !== soundVersions[key] || a.state !== 'running') return;
    const source = a.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pitch;
    const gain = a.createGain(); gain.gain.value = key === 'meow' ? 0.75 : 0.6;
    source.connect(gain).connect(audioBus);
    source.onended = () => { source.disconnect(); gain.disconnect(); if (lastVoice[key] && lastVoice[key].source === source) lastVoice[key] = null; };
    // A new meow cuts the one still ringing (25ms fade) so quick taps and drags never stack up.
    const prev = lastVoice[key], t0 = a.currentTime + 0.005;
    if (prev && key === 'meow') { try { prev.gain.gain.setTargetAtTime(0, t0, 0.008); prev.source.stop(t0 + 0.05); } catch (e) {} }
    lastVoice[key] = { source, gain };
    source.start(t0);
  } catch (e) { /* Audio availability must never block navigation. */ }
}

function tone(freq, dur = 0.16, type = 'triangle', vol = 0.12, slide = 0, delay = 0) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audioBus); o.start(t); o.stop(t + dur + 0.02);
  o.onended = () => { o.disconnect(); g.disconnect(); };
}
function noise(vol = 0.18, cutoff = 900, dur = 0.22) {
  const a = audio(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(audioBus); s.start();
  s.onended = () => { s.disconnect(); f.disconnect(); g.disconnect(); };
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
// Customer kinds: colour of the tag, the highlight under the cupcake and the sleeve of the arm.
const CUST_STYLE = {
  normal: { tag: '#DB4B58', glow: 'rgba(219, 75, 88, 0.25)', sleeve: '#9CC3E6', hand: 1 },
  kid:    { tag: '#F2A33A', glow: 'rgba(242, 163, 58, 0.3)',  sleeve: '#F6D56A', hand: 0.8 },
  order:  { tag: '#5B8E3E', glow: 'rgba(91, 142, 62, 0.22)',  sleeve: '#8FBF7A', hand: 1 },
  picky:  { tag: '#8E5EA8', glow: 'rgba(142, 94, 168, 0.25)', sleeve: '#C9A7E0', hand: 1 },
};
const custStyle = k => CUST_STYLE[k && k.kind] || CUST_STYLE.normal;
function drawTag(g, x, y, r, n, pulse, col = '#DB4B58', blink = false) {
  g.save(); g.translate(x, y);
  const s = 1 + pulse * 0.16; g.scale(s, s);
  // a paper ring keeps the tag readable over any cupcake; the last turn flashes brighter
  g.fillStyle = 'rgba(255,249,242,0.95)'; g.beginPath(); g.arc(0, 0, r + 3, 0, Math.PI * 2); g.fill();
  g.fillStyle = blink && Math.floor(now / 260) % 2 === 0 ? '#FF4F62' : col; g.strokeStyle = '#4A2E27'; g.lineWidth = 2;
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#FFF9F2'; g.font = `${Math.round(r * 1.25)}px Jua, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 0, r * 0.08);
  g.restore();
}
function drawHand(g, x, y, r, grab, skin = '#F7CFAE') {
  g.save(); g.translate(x, y);
  g.fillStyle = skin; g.strokeStyle = '#4A2E27'; g.lineWidth = Math.max(1.5, r * 0.09);
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
// Sprinkle confetti raining over the whole tray.
function confetti(n = 44) {
  if (reduceMotion || !state) return;
  const { x, y, w } = trayRect();
  const cols = ['#F48FB1', '#FFE082', '#81D4FA', '#A5D6A7', '#FFFFFF', '#CE93D8', '#FF8A65'];
  for (let k = 0; k < n; k++) {
    particles.push({ kind: 'stick', x: rand(x, x + w), y: y - rand(S * 0.3, S * 2.2), vx: rand(-30, 30), vy: rand(10, 60), rot: rand(0, 6), vr: rand(-9, 9), r: S * rand(0.045, 0.065), born: now + rand(0, 260), life: rand(1500, 2300), grav: 380, drag: 0.6, col: cols[k % cols.length] });
  }
}
// Rubber stamp slammed onto the board: scales down with a thump, holds, then fades.
function stamp(str, col = '#5B7A21', life = 1500) { texts.push({ x: CW / 2, y: padTop + state.H * S * 0.42, str, col, size: 0.46, born: now, life, stamp: true }); }
const pick = arr => arr[Math.floor(Math.random() * arr.length)];


// ---------- cascade: same rules as logic.fire, played out on a clock ----------
const DROP = 420, LAND = 260, INCUBATE = 150;
function travelTime(sp) {
  if (sp.style === 'roll') return 95 * sp.path.length + 60;
  if (sp.style === 'lob') return sp.dist === 2 ? 430 : 320;
  if (sp.style === 'zip') return 190;
  if (sp.style === 'burst') return 250;
  if (sp.style === 'waft') return 380 + 40 * Math.min(8, sp.dist || 1);
  return 230;
}
// Same rules as logic.cascade (hitCell), with a clock attached. seeds: [{ idx, t, direct?, release? }]
// Walks the cascade wave by wave in the same order as the rules do, so snow from a coconut falls between the same waves
// here as there; each hit still carries its own time (t) for the animation.
function planCascade(s0, seeds, mutate) {
  const sim = mutate ? s0 : cloneState(s0);
  const hits = [], flights = [];
  let frontier = seeds.map(h => ({ from: -1, depth: 0, ...h }));
  while (frontier.length) {
    const wave = [], next = [];
    for (const h of frontier) {
      const r = hitCell(sim, h);
      if (r.kind === 'none') { if (h.from >= 0 && sim.cells[h.idx]) hits.push({ ...h, kind: 'thud' }); continue; }
      const hit = { ...h, ...r }; hits.push(hit); wave.push(hit);
      if (!r.spread) continue;
      const t0 = h.t + INCUBATE;
      const ty = TYPES[sim.cells[h.idx].t], strong = !!ty.strong, sour = !!ty.sour && RULES.sour;
      for (const sp of spreadsOf(sim, h.idx, true)) {
        if (sp.to >= 0 && sim.cells[sp.to].inf && !(sim.cells[sp.to].wrap && strong) && sp.style !== 'roll') continue;
        const dur = travelTime(sp);
        flights.push({ ...sp, from: h.idx, t0, dur, depth: h.depth, strong, sour });
        if (sp.to >= 0) next.push({ t: t0 + dur, idx: sp.to, from: h.idx, direct: false, strong, sour, depth: h.depth + 1 });
      }
    }
    frostAfterWave(sim, wave);
    frontier = next;
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
  if (h.kind === 'frosted') { // the spore lands on snow and fizzles
    bump(h.idx, 0.05); frostBurst(h.idx, 0.4); tone(1500, 0.08, 'sine', 0.03, 0.8); noise(0.03, 2500, 0.05);
    return;
  }
  if (h.direct) {
    if (!reduceMotion) sporeDust(x, sporeContactY(h.idx), 7, 0.55);
    tone(360, 0.085, 'sine', 0.065, 0.55); noise(0.045, 650, 0.07);
    // no meow here: the 0.45s "nyaa" sits 18 dB above the chain notes and buried the melody's start (the meow lives on tap/drag)
  }
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
  // sour: spoiled by a grapefruit, so it keeps its spores to itself
  if (h.sour && h.kind === 'infect') { v.sour = true; v.sourAt = now; floatText(x, y - S * 0.8, t('fx.sour'), '#E0607A', 0.26, 900); tone(520, 0.1, 'square', 0.025, 0.6); }
  // snow: the coconut's neighbours are covered for the rest of the turn
  if (h.frosted && h.frosted.length) at(INCUBATE, () => {
    for (const j of h.frosted) { const w = vis[j]; if (!w) continue; w.frost = true; w.frostAt = now; w.meltAt = -1; frostBurst(j, 0.7); }
    tone(1760, 0.22, 'sine', 0.05, 1); tone(2093, 0.3, 'sine', 0.035, 1, 0.08);
    floatText(x, y - S * 0.85, t('fx.frost'), '#5E8FB8', 0.28, 900);
  });
  // One note for simultaneous hits, so a large cascade keeps a readable rhythm.
  if (now - lastChainNote >= 45) {
    lastChainNote = now;
    tone(note(h.depth), 0.18, v.t === 'u' ? 'sine' : 'triangle', 0.15); // the rising scale is the reward; keep it clearly above the thud and the spore noise
  }
  if (h.kind === 'sealed') { v.flashAt = now; tone(180, 0.12, 'square', 0.03); floatText(x, y - S * 0.8, t('fx.sealed'), '#6E8FB4', 0.24, 800); }
}

function customerPhase(list, k, done) {
  if (k >= list.length) { done(); return; }
  const c = list[k], cells = customerCells(state, c.k);
  // the hand goes for the fresh one it will take; otherwise the middle of what it ordered
  const idx = c.fresh && c.taken && c.taken.length ? c.taken[0] : cells[Math.floor((cells.length - 1) / 2)];
  arm = { idx, t0: now, fresh: c.fresh, kind: c.k.kind, refused: !!c.refused };
  const DUR = c.fresh ? 1250 : 1100;
  at(430, () => {
    if (c.fresh) { vis[idx] && (vis[idx].gone = true); floatText(cxOf(idx), cyOf(idx) - S * 0.95, pick(t('yum')), '#7C5D51', 0.3, 1000); tone(392, 0.12, 'triangle', 0.08); tone(523, 0.18, 'triangle', 0.08, 1, 0.1); }
    else if (c.refused) { floatText(cxOf(idx), cyOf(idx) - S * 0.95, pick(t('pickyNo')), '#8E5EA8', 0.3, 1100); tone(330, 0.14, 'triangle', 0.05, 0.8); tone(262, 0.2, 'triangle', 0.05, 0.9, 0.14); }
    else {
      const big = cells.length > 1;
      floatText(cxOf(idx), cyOf(idx) - S * 0.95, pick(t(big ? 'yuckBig' : 'yuck')), custStyle(c.k).tag, big ? 0.42 : 0.36, 1100);
      tone(220, 0.35, 'sawtooth', 0.04, 0.6); if (big) tone(165, 0.4, 'sawtooth', 0.035, 0.6, 0.08);
      cells.forEach((i, n) => at(n * 40, () => bump(i, 0.2)));
    }
  });
  at(DUR, () => { arm = null; c.k.pending = false; customerPhase(list, k + 1, done); });
}


// ---------- frame ----------
function frame(t) {
  const dt = Math.min(0.05, (t - now) / 1000);
  now = t;
  dropCtx.setTransform(1, 0, 0, 1, 0, 0);
  dropCtx.clearRect(0, 0, dropCanvas.width, dropCanvas.height);
  dropCtx.setTransform(DPR, 0, 0, DPR, dropOrigin.x * DPR, dropOrigin.y * DPR);
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
  const sc = spriteScale(), T = now / 1000, W = state.W, H = state.H;

  // spatulas
  state.tiles.forEach((tk, i) => {
    if (!tk) return;
    const b = tileBump[i] ? Math.max(0, 1 - (now - tileBump[i]) / 300) : 0;
    drawSpatula(ctx, cxOf(i), wellY(i) - S * 0.02 - b * S * 0.06, S * (0.82 + b * 0.08), tk);
  });

  const focusIdx = introOpen ? -1 : hover >= 0 ? hover : selected >= 0 ? selected : (cursorShown ? cursor : -1);
  const canPreview = focusIdx >= 0 && !busy && !result && canTarget(state, focusIdx);
  const preview = canPreview ? previewOf(state, focusIdx) : null;
  syncPreviewFeeling(focusIdx, preview);
  if (focusIdx >= 0 && !result && !introOpen) {
    ctx.save(); ctx.lineWidth = Math.max(2, S * 0.045);
    ctx.fillStyle = canPreview ? 'rgba(246,200,93,.3)' : 'rgba(74,46,39,.06)';
    ctx.strokeStyle = canPreview ? '#806022' : 'rgba(74,46,39,0.4)';
    ctx.beginPath(); ctx.ellipse(cxOf(focusIdx), wellY(focusIdx), S * 0.43, S * 0.28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // Environmental cues sit below the cupcakes; traveling baby spores stay above.
  if (preview) drawPreview(focusIdx, T, preview);
  for (const k of state.customers) {
    if (k.done && !k.pending) continue;
    const st = custStyle(k), cells = customerCells(state, k);
    ctx.save();
    if (k.kind === 'order' && cells.length > 1) { // the delivery box: a dashed outline around the whole line
      const xs = cells.map(i => cxOf(i)), ys = cells.map(i => wellY(i));
      ctx.strokeStyle = st.tag; ctx.lineWidth = 2.5; ctx.setLineDash([S * 0.12, S * 0.08]); ctx.lineDashOffset = -T * 20;
      roundRect(ctx, Math.min(...xs) - S * 0.48, Math.min(...ys) - S * 0.95, Math.max(...xs) - Math.min(...xs) + S * 0.96, Math.max(...ys) - Math.min(...ys) + S * 1.3, S * 0.18); ctx.stroke(); ctx.setLineDash([]);
    }
    if (k.kind === 'picky') { // the neighbours it inspects
      const r0 = k.r, c0 = k.c;
      for (const [dr, dc] of DIRS4) { const r = r0 + dr, c = c0 + dc; if (r < 0 || r >= H || c < 0 || c >= W) continue; const j = r * W + c; if (!state.cells[j] || state.cells[j].wall) continue;
        ctx.strokeStyle = st.tag; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5; ctx.setLineDash([S * 0.07, S * 0.06]);
        ctx.beginPath(); ctx.ellipse(cxOf(j), wellY(j), S * 0.4, S * 0.27, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    }
    for (const i of cells) {
      if (!state.cells[i] || (state.cells[i].inf && !k.pending) || (vis[i] && vis[i].gone)) continue;
      ctx.fillStyle = st.glow; ctx.beginPath(); ctx.ellipse(cxOf(i), wellY(i), S * 0.44, S * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  for (let i = 0; i < vis.length; i++) {
    const v = vis[i];
    if (!v) continue;
    if (v.gone) { if (!(arm && arm.idx === i)) drawSoldGhost(i, v, sc); continue; }
    if (arm && arm.idx === i && arm.fresh && now - arm.t0 > 430) continue;
    if (preview && (i === focusIdx || preview.targets.includes(i) || preview.frost.includes(i))) drawPreviewOutline(i, v, sc);
    drawCupcake(i, v, sc);
  }

  if (preview) {
    drawPreviewFlights();
    if (selected === focusIdx) drawPreviewTears(focusIdx);
  }

  for (const k of state.customers) {
    if (k.done && !k.pending) continue;
    const left = k.turn - state.turn, cells = customerCells(state, k), st = custStyle(k);
    const spots = k.kind === 'order' ? [cells[cells.length - 1]] : cells;
    for (const i of spots) {
      if (!state.cells[i] || (state.cells[i].inf && !k.pending && k.kind !== 'order') || (vis[i] && vis[i].gone)) continue;
      drawTag(ctx, cxOf(i) + S * 0.34, cyOf(i) - S * 0.52, S * 0.2, left > 0 ? left : '!', left <= 1 ? (Math.sin(T * 6) * 0.5 + 0.5) : 0, st.tag, left <= 1 && !reduceMotion);
    }
  }

  drawHintMarker(T);
  drawProjectiles(sc);
  drawParticles(dt);
  drawArm(sc);
  drawTexts();
  if (!reduceMotion) vis.forEach((v, i) => { if (v && !v.gone && isZombieShown(v) && !v.sealed && Math.random() < dt * 0.09) stink(i); });
}

// Only the first outward spread is previewed. A lid/pending lemon does not
// promise an immediate chain; the rules and hint still describe that state.
function previewOf(s, i) {
  if (!canTarget(s, i)) return { spreads: [], targets: [], frost: [], sour: false };
  const trial = cloneState(s);
  if (!hitCell(trial, { idx: i, direct: true }).spread) return { spreads: [], targets: [], frost: [], sour: false };
  const spreads = spreadsOf(trial, i, true);
  const ty = TYPES[trial.cells[i].t], strong = !!ty.strong, sour = !!ty.sour;
  const targets = [...new Set(spreads.filter(sp =>
    sp.to >= 0 && hitCell(trial, { idx: sp.to, direct: false, strong, sour }).kind !== 'none'
  ).map(sp => sp.to))];
  // a coconut shows where its snow will fall instead of a route
  const frost = ty.frost ? ringOf(trial, i).filter(j => !trial.cells[j].inf && !trial.cells[j].pend) : [];
  return { spreads, targets, frost, sour };
}
// A selection is one self-contained performance. Switching focus/state, firing,
// undoing or restarting discards it immediately; no delayed callbacks mutate play.
const PREVIEW_PERIOD = 2300;
let previewFeeling = { source: -1, state: null, held: false, started: 0, routes: [], targets: new Map() };
function syncPreviewFeeling(source, preview) {
  if (!preview) { previewFeeling.source = -1; previewFeeling.state = null; return; }
  const held = selected === source;
  if (previewFeeling.source === source && previewFeeling.state === state && previewFeeling.held === held) return;
  const routes = preview.spreads.filter(sp => preview.targets.includes(sp.to)).map((sp, rank) => ({
    ...sp, delay: 90 + rank * 45, duration: 350 + Math.min(3, sp.dist || 1) * 60
  }));
  const targets = new Map();
  for (const route of routes) {
    const arrival = route.delay + route.duration;
    if (!targets.has(route.to) || arrival < targets.get(route.to).arrival) targets.set(route.to, { arrival, kind: 'target' });
  }
  (preview.frost || []).forEach((j, n) => targets.set(j, { arrival: 180 + n * 45, kind: 'frost' }));
  previewFeeling = { source, state, held, started: now, routes, targets };
}
function previewEmotion(i) {
  const quiet = { kind: '', dy: 0, sx: 1, sy: 1, arms: 0, eyes: 1, active: false };
  if (previewFeeling.source < 0) return quiet;
  const age = Math.max(0, now - previewFeeling.started);
  if (i === previewFeeling.source) {
    const active = previewFeeling.held && !reduceMotion;
    return { ...quiet, kind: 'source', active, arms: active ? (.92 + .52 * Math.sin(age / 230 * Math.PI * 2)) * Math.min(1, age / 100) : 0, eyes: active ? 1.45 : 1 };
  }
  const target = previewFeeling.targets.get(i);
  if (!target) return quiet;
  const phase = age % PREVIEW_PERIOD - target.arrival;
  const active = !reduceMotion && phase >= 0 && phase < 400;
  const strength = age < PREVIEW_PERIOD ? 1 : .55;
  const pop = active ? Math.sin(phase / 400 * Math.PI) * strength : 0;
  return { kind: target.kind, active, dy: -S * .055 * pop, sx: 1 - .025 * pop, sy: 1 + .065 * pop,
    arms: pop * (.55 + .28 * Math.sin(phase / 160 * Math.PI * 2)), eyes: 1 + .2 * pop };
}
function previewFace(i) {
  const v = vis[i], key = freshSpriteKey(v), m = META[key], profile = CUPCAKE_RIG_PROFILES[key];
  const armY = profile && profile.arms.length ? profile.arms.reduce((s, a) => s + a.pivot[1], 0) / profile.arms.length : m.ay - m.w * .35;
  const faceY = armY - m.w * .30, sc = spriteScale() * (m.k || 1);
  return { x: cxOf(i), y: baseY(i) + (faceY - m.ay) * sc, half: m.w * .22 * sc };
}
function previewFlightPoint(route, p) {
  const source = previewFeeling.source;
  if (route.style === 'roll') {
    const pts = [[cxOf(source), wellY(source) - S * .15], ...route.path.map(j => [cxOf(j), wellY(j) - S * .15])];
    return pathPoint(pts, p);
  }
  const a = previewFace(source), b = previewFace(route.to);
  const lift = S * (route.style === 'lob' ? .55 : .30), q = 1 - p;
  return [q*q*a.x + 2*q*p*(a.x+b.x)/2 + p*p*b.x, q*q*a.y + 2*q*p*(Math.min(a.y,b.y)-lift) + p*p*b.y];
}
function drawPreviewFlights() {
  if (reduceMotion || previewFeeling.source < 0 || !IMG.spore_round) return;
  const age = (now - previewFeeling.started) % PREVIEW_PERIOD;
  const size = Math.min(22, Math.max(14, S * .30));
  for (const route of previewFeeling.routes) {
    const p = (age - route.delay) / route.duration;
    if (p < 0 || p > 1) continue;
    const [x,y] = previewFlightPoint(route, p);
    ctx.save(); ctx.translate(x,y); ctx.rotate(Math.sin(p*Math.PI) * .22);
    ctx.globalAlpha = .92 * Math.min(1,p/.12,(1-p)/.12);
    ctx.shadowColor = '#fff9e6'; ctx.shadowBlur = 3;
    ctx.drawImage(IMG.spore_round,-size/2,-size/2,size,size); ctx.restore();
  }
}
function drawPreviewTears(i) {
  if (reduceMotion || previewFeeling.source !== i || !previewFeeling.held) return;
  const face = previewFace(i), age = now - previewFeeling.started, r = Math.max(2.6, S * .055);
  for (const side of [-1,1]) {
    const q = ((age + (side > 0 ? 340 : 0)) % 780) / 780;
    const x = face.x + side * (face.half + S * (.02 + q * .16));
    const y = face.y + S * (.03 + q * .19 - Math.sin(q*Math.PI) * .12);
    ctx.save(); ctx.translate(x,y); ctx.rotate(side * (.7 + q * .25));
    ctx.globalAlpha = Math.sin(q*Math.PI) * .92;
    ctx.fillStyle = '#B7E4ED'; ctx.strokeStyle = '#6D6556'; ctx.lineWidth = Math.max(.8,S*.018);
    ctx.beginPath(); ctx.moveTo(0,-r*1.7); ctx.bezierCurveTo(r*1.2,-r*.2,r*1.25,r,0,r*1.2);ctx.bezierCurveTo(-r*1.25,r,-r*1.2,-r*.2,0,-r*1.7);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle = '#FFFCEF';ctx.beginPath();ctx.ellipse(-r*.2,0,r*.22,r*.4,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}
const PREVIEW_OUTLINES = {};
function previewOutlineArt(key, kind = 'target') {
  const cacheKey = key + ':' + kind;
  if (PREVIEW_OUTLINES[cacheKey]) return PREVIEW_OUTLINES[cacheKey];
  const rig = prepareCupcakeRig(key);
  const im = rig ? rig.body : IMG[key], m = META[key]; if (!im || !m) return null;
  const pad = Math.ceil(10 / (m.k || 1));
  const art = document.createElement('canvas'); art.width = im.width + pad * 2; art.height = im.height + pad * 2;
  const g = art.getContext('2d');
  const colors = kind === 'source' ? ['#926A3F','#FFE2A4'] : kind === 'frost' ? ['#7EABC0','#EFFBFF'] : ['#72874A','#FFF9E8'];
  for (const [radius, color] of [[8, colors[0]], [5.5, colors[1]]]) {
    const layer = document.createElement('canvas'); layer.width = art.width; layer.height = art.height;
    const l = layer.getContext('2d'), r = radius / (m.k || 1);
    for (let n = 0; n < 20; n++) {
      const a = n * Math.PI / 10; l.drawImage(im, pad + Math.cos(a) * r, pad + Math.sin(a) * r);
    }
    l.globalCompositeOperation = 'source-in'; l.fillStyle = color; l.fillRect(0, 0, layer.width, layer.height);
    g.drawImage(layer, 0, 0);
  }
  return PREVIEW_OUTLINES[cacheKey] = { art, pad };
}
function freshSpriteKey(v) {
  let key = v.t === 'b' ? (v.lid > 0 ? 'butter' : 'butter_open') : TYPES[v.t].key;
  if (v.pend && IMG['pending_' + key]) key = 'pending_' + key;
  return key;
}
function zombieFlip(v) {
  // Flavor artwork keeps its authored facing (and readable BUTTER lettering).
  // Only the original generic zombies still use their randomized facing.
  return !IMG['zombie_' + TYPES[v.t].key] && !!v.flip;
}
function drawPreviewOutline(i, v, sc) {
  const zombie = isZombieShown(v);
  const emotion = previewEmotion(i);
  const key = zombie ? zombieKey(v) : freshSpriteKey(v), m = META[key], outline = previewOutlineArt(key, emotion.kind);
  if (!outline || !m) return;
  const pose = cupcakePose(v);
  ctx.save(); ctx.translate(cxOf(i), baseY(i) + emotion.dy); ctx.scale(sc * (m.k || 1) * pose.sx * emotion.sx * (zombie && zombieFlip(v) ? -1 : 1), sc * (m.k || 1) * pose.sy * emotion.sy);
  ctx.drawImage(outline.art, -m.ax - outline.pad, -m.ay - outline.pad); ctx.restore();
}
function drawPreview(i, T, preview = previewOf(state, i)) {
  ctx.save();
  // where the snow will fall: a soft blue ring and a little flake over each neighbour
  for (const j of (preview.frost || [])) {
    const x = cxOf(j), y = wellY(j), bob = reduceMotion ? 0 : Math.sin(T * 3 + j) * S * 0.02;
    ctx.fillStyle = 'rgba(214, 236, 255, 0.5)'; ctx.strokeStyle = 'rgba(94, 143, 184, 0.8)'; ctx.lineWidth = Math.max(1.5, S * 0.03);
    ctx.beginPath(); ctx.ellipse(x, y, S * 0.4, S * 0.26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const fy = cyOf(j) - S * 0.3 + bob, r = S * 0.07;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(2, S * 0.035); ctx.lineCap = 'round';
    ctx.beginPath(); for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; ctx.moveTo(x - Math.cos(a) * r, fy - Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r, fy + Math.sin(a) * r); } ctx.stroke();
    ctx.strokeStyle = 'rgba(94, 143, 184, 0.9)'; ctx.lineWidth = Math.max(1, S * 0.015); ctx.stroke();
  }
  // sour: the targets will spoil but keep their spores to themselves
  if (preview.sour) for (const j of preview.targets) drawSourBadge(ctx, cxOf(j) + S * 0.3, cyOf(j) - S * 0.78, S * 0.1);
  ctx.restore();
}

// Resting sprites keep their original pixels and a fixed foot point. Hits and
// pointer entries get one bounded response, with no repeating idle animation.
function cupcakePose(v, time = now, reduced = reduceMotion) {
  if (reduced) return { sx: 1, sy: 1 };
  // A fresh sprite finishes its infection fade at 230 ms. Give the newly
  // revealed zombie its own single squash/stretch instead of inheriting only
  // the tiny tail of the original hit. Deriving this from infAt avoids queued
  // callbacks replaying after undo/restart or extending when a frame is late.
  const revealAge = v.infAt >= 0 ? time - v.infAt - 230 : -1;
  const laterHit = v.bumpAt > v.infAt + 230 && time >= v.bumpAt && time - v.bumpAt < 420;
  if (revealAge >= 0 && revealAge < 380 && !laterHit) {
    const q = revealAge / 380;
    const k = q < 0.28
      ? 0.10 * Math.sin(q / 0.28 * Math.PI) ** 2
      : -0.12 * Math.sin((q - 0.28) / 0.72 * Math.PI) ** 2;
    return { sx: 1 + k * 0.55, sy: 1 - k };
  }
  const p = (time - v.bumpAt) / 420;
  let k = v.bumpAt >= 0 && p >= 0 && p < 1
    ? Math.min(0.12, v.bumpAmp) * Math.sin(p * Math.PI * 2) * (1 - p) ** 2
    : 0;
  const q = (time - v.peekAt) / 300;
  if (!(v.bumpAt >= 0 && p >= 0 && p < 1) && v.peekAt >= 0 && q >= 0 && q < 1) {
    k = q < 0.22 ? 0.035 * Math.sin(q / 0.22 * Math.PI) : -0.06 * Math.sin((q - 0.22) / 0.78 * Math.PI) ** 2;
  }
  return { sx: 1 + k * 0.55, sy: 1 - k };
}
// Celebration shamble: zombies are slow and heavy, so they do not jump — they sway on their feet with a lazy
// lurch (tilt about the feet, a slump into each lean) while stink wafts up, one after another across the tray.
const SWAY = 1300;
function sway(i, delay = 0, amp = 0.15) { if (vis[i]) { vis[i].swayAt = now + delay; vis[i].swayAmp = amp; } }
function swayPose(v) {
  const p = v.swayAt >= 0 ? (now - v.swayAt) / SWAY : -1;
  if (reduceMotion || !(p >= 0 && p < 1)) return { rot: 0, sx: 1, sy: 1, dy: 0 };
  const env = Math.sin(p * Math.PI); // eases in and out
  const rot = (v.swayAmp || 0.15) * Math.sin(p * Math.PI * 3) * env; // one and a half slow lurches
  const lean = Math.abs(Math.sin(p * Math.PI * 3)) * env;
  return { rot, sx: 1 + 0.05 * lean, sy: 1 - 0.07 * lean, dy: 0 };
}
// A cupcake a customer carried off leaves a faint ghost and a SOLD tag, so the lost screen can show which one it was.
function drawSoldGhost(i, v, sc) {
  const x0 = cxOf(i), by = baseY(i);
  ctx.save();
  ctx.setLineDash([S * 0.08, S * 0.06]); ctx.strokeStyle = 'rgba(219, 75, 88, 0.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x0, wellY(i), S * 0.42, S * 0.28, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.globalAlpha = 0.26; drawSpriteAt(ctx, freshSpriteKey(v), x0, by, sc); ctx.globalAlpha = 1;
  const px = Math.max(10, Math.round(S * 0.17)); ctx.font = `${px}px Jua, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const label = t('fx.sold'), w = ctx.measureText(label).width + px * 0.9, h = px * 1.5, y = cyOf(i) - S * 0.5;
  ctx.translate(x0, y); ctx.rotate(-0.1);
  ctx.fillStyle = '#DB4B58'; ctx.strokeStyle = '#4A2E27'; ctx.lineWidth = 1.5; roundRect(ctx, -w / 2, -h / 2, w, h, px * 0.3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFF9F2'; ctx.fillText(label, 0, px * 0.05);
  ctx.restore();
}
// Snow on a frosted cupcake: a soft white cap with a cool tint over the sprite, a few sparkles, melting away at the end of the turn.
function drawSnow(g, x, by, w, alpha, T) {
  g.save(); g.globalAlpha = alpha;
  const top = by - w * 1.02;
  g.fillStyle = 'rgba(214, 236, 255, 0.42)';
  g.beginPath(); g.ellipse(x, by - w * 0.5, w * 0.46, w * 0.56, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#FFFFFF'; g.strokeStyle = 'rgba(120, 165, 205, 0.7)'; g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x - w * 0.46, top + w * 0.22);
  g.quadraticCurveTo(x - w * 0.42, top - w * 0.02, x - w * 0.2, top + w * 0.04);
  g.quadraticCurveTo(x - w * 0.05, top - w * 0.12, x + w * 0.12, top + w * 0.02);
  g.quadraticCurveTo(x + w * 0.3, top - w * 0.06, x + w * 0.46, top + w * 0.2);
  g.quadraticCurveTo(x + w * 0.3, top + w * 0.3, x + w * 0.1, top + w * 0.24);
  g.quadraticCurveTo(x - w * 0.15, top + w * 0.36, x - w * 0.46, top + w * 0.22);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#FFFFFF';
  for (let k = 0; k < 4; k++) {
    const a = T * 1.3 + k * 1.7, sx = x + Math.cos(a) * w * 0.3, sy = by - w * (0.35 + 0.3 * Math.abs(Math.sin(a * 0.7))), r = w * (0.025 + 0.015 * (0.5 + 0.5 * Math.sin(T * 5 + k)));
    g.beginPath(); g.moveTo(sx - r * 2, sy); g.lineTo(sx, sy - r * 0.6); g.lineTo(sx + r * 2, sy); g.lineTo(sx, sy + r * 0.6); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(sx, sy - r * 2); g.lineTo(sx + r * 0.6, sy); g.lineTo(sx, sy + r * 2); g.lineTo(sx - r * 0.6, sy); g.closePath(); g.fill();
  }
  g.restore();
}
// The sour badge on a cupcake a grapefruit spoiled: a pink drop with a crossed-out spore.
function drawSourBadge(g, x, y, r) {
  g.save();
  g.fillStyle = '#F48FA6'; g.strokeStyle = '#4A2E27'; g.lineWidth = Math.max(1.2, r * 0.14);
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = '#4A2E27'; g.lineWidth = Math.max(1.4, r * 0.2); g.lineCap = 'round';
  g.beginPath(); g.moveTo(x - r * 0.42, y - r * 0.42); g.lineTo(x + r * 0.42, y + r * 0.42); g.moveTo(x + r * 0.42, y - r * 0.42); g.lineTo(x - r * 0.42, y + r * 0.42); g.stroke();
  g.restore();
}
function drawCupcake(i, v, sc) {
  const emotion = previewEmotion(i);
  const x0 = cxOf(i), sw = swayPose(v), by = baseY(i) + emotion.dy;
  const zombie = isZombieShown(v);
  const pose = cupcakePose(v), sx = pose.sx * sw.sx * emotion.sx, sy = pose.sy * sw.sy * emotion.sy;
  ctx.save(); ctx.fillStyle = 'rgba(60, 40, 40, 0.18)';
  ctx.beginPath(); ctx.ellipse(x0, by - S * 0.04, S * 0.33, S * 0.09, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  const freshKey = freshSpriteKey(v);
  if (!zombie) {
    const react = emotion.active && v.infAt < 0 &&
      drawCupcakeRig(ctx, freshKey, x0, by, sc, sx, sy, emotion);
    if (!react) drawSpriteAt(ctx, freshKey, x0, by, sc, 0, sx, sy);
    // The tint shares the exact same pose; rotating a second copy made two
    // outlines shimmer against each other during the infection fade.
    if (v.infAt >= 0 && TINT[freshKey]) { const p = Math.min(1, (now - v.infAt) / 230); drawSpriteAt(ctx, freshKey, x0, by, sc, 0, sx, sy, false, p, TINT[freshKey]); }
  } else drawSpriteAt(ctx, zombieKey(v), x0, by, sc, sw.rot, sx, sy, zombieFlip(v));
  if (v.wrap) { const fl = v.flashAt >= 0 ? Math.max(0, 1 - (now - v.flashAt) / 500) : 0; drawWrap(ctx, x0, by + 2, S * 0.86, 1, fl); }
  if (v.frost || (v.meltAt >= 0 && now - v.meltAt < 450)) {
    const grow = v.frostAt >= 0 ? Math.min(1, (now - v.frostAt) / 260) : 1, melt = v.frost ? 1 : Math.max(0, 1 - (now - v.meltAt) / 450);
    drawSnow(ctx, x0, by - S * 0.02, S * 0.8 * (0.85 + 0.15 * grow), grow * melt, now / 1000);
  }
  if (v.sour && zombie) { const pop = v.sourAt >= 0 ? Math.min(1, (now - v.sourAt) / 220) : 1; drawSourBadge(ctx, x0 + S * 0.3, by - S * 0.78, S * 0.11 * (0.6 + 0.4 * pop)); }
}

function pathPoint(pts, p) {
  let total = 0; const seg = [];
  for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(d); total += d; }
  let d = p * total;
  for (let k = 0; k < seg.length; k++) { if (d <= seg[k] || k === seg.length - 1) { const f = seg[k] ? Math.min(1, d / seg[k]) : 1; return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f, p * total]; } d -= seg[k]; }
  return [pts[pts.length - 1][0], pts[pts.length - 1][1], total];
}

// A single bottom-anchored object owns flight, compression and recovery.
function dropPose(age, dur = DROP) {
  if (age < dur) { const p = Math.max(0, age / dur); return { fall: p * p, squash: 0, lift: 0, alpha: Math.min(1, p * 6) }; }
  const t = age - dur;
  const squash = t < 55 ? t / 55 : t < 100 ? 1 : Math.max(0, 1 - (t - 100) / 90);
  const lift = t >= 100 && t < 190 ? Math.sin((t - 100) / 90 * Math.PI) * 0.025 : 0;
  return { fall: 1, squash, lift, alpha: Math.max(0, Math.min(1, (LAND - t) / 80)) };
}
function drawProjectiles(sc) {
  projs = projs.filter(f => now < f.t0 + f.dur + (f.style === 'drop' ? LAND : 0));
  for (const f of projs) {
    if (now < f.t0) continue;
    const p = Math.min(1, (now - f.t0) / f.dur);
    if (f.style === 'drop') {
      const age = now - f.t0, pose = dropPose(age, f.dur);
      const tx = cxOf(f.to), ty = cyOf(f.to) + f.contactOffset * S;
      // The parent falls over the shop, outside the board's clipped bitmap.
      const sy = Math.max(dropOrigin.ceiling + S * .9, ty - S * 2.5);
      const x = tx + (reduceMotion ? 0 : Math.sin(p * Math.PI) * S * 0.035);
      const y = reduceMotion ? ty : sy + (ty - sy) * pose.fall - S * pose.lift;
      if (reduceMotion && age < f.dur) continue;
      // Keep the parent's usual smiling mouth throughout the drop and squash.
      const key = 'mold_player', m = META[key];
      if (m && IMG[key]) {
        const squash = reduceMotion ? 0 : pose.squash;
        const size = S * .82 / m.w;
        drawSpriteAt(dropCtx, key, x, y, size / (m.k || 1), 0,
          1 + squash * .3, 1 - squash * .52, false, pose.alpha);
      }
      continue;
    }
    if (reduceMotion) continue;
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
  if (reduceMotion) return;
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
  const shake = !arm.fresh && !arm.refused && e > 430 && e < 650 ? Math.sin(e / 18) * S * 0.04 : 0;
  const x = tx + shake + (arm.refused && e > 430 && e < 600 ? Math.sin((e - 430) / 170 * Math.PI) * S * 0.1 : 0); // picky waves it off
  const st = custStyle(arm), hr = S * 0.24 * st.hand;
  ctx.save();
  ctx.fillStyle = st.sleeve; ctx.strokeStyle = '#4A2E27'; ctx.lineWidth = 2.2;
  roundRect(ctx, x - S * 0.2, -S, S * 0.4, y + S * 0.85, S * 0.12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFF9F2'; roundRect(ctx, x - S * 0.23, y - S * 0.28, S * 0.46, S * 0.14, S * 0.06); ctx.fill(); ctx.stroke();
  ctx.restore();
  if (arm.fresh && e > 430) {
    const v = vis[i];
    const key = v.t === 'b' ? (v.lid > 0 ? 'butter' : 'butter_open') : TYPES[v.t].key;
    drawSpriteAt(ctx, key, x, y + S * 0.95, sc, Math.sin(e / 90) * 0.06);
  }
  drawHand(ctx, x, y, hr, arm.fresh && e > 430);
}

function drawStamp(t, age) {
  const inT = Math.min(1, age * t.life / 200); // 200ms slam
  const sc = reduceMotion ? 1 : 1.9 - 0.9 * (1 - Math.pow(1 - inT, 3)) + (inT >= 1 ? 0 : 0) ;
  const settle = reduceMotion || inT < 1 ? 1 : 1 + 0.04 * Math.sin(Math.min(1, (age * t.life - 200) / 180) * Math.PI);
  ctx.save();
  ctx.globalAlpha = (age > 0.78 ? 1 - (age - 0.78) / 0.22 : 1) * (reduceMotion ? 1 : Math.min(1, inT * 1.5));
  ctx.translate(t.x, t.y); ctx.rotate(-0.12); ctx.scale(sc * settle, sc * settle);
  const px = Math.round(S * t.size);
  ctx.font = `${px}px Jua, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const w = ctx.measureText(t.str).width + px * 0.9, h = px * 1.5;
  ctx.fillStyle = 'rgba(255, 249, 242, 0.92)'; ctx.strokeStyle = t.col; ctx.lineWidth = Math.max(3, px * 0.09);
  roundRect(ctx, -w / 2, -h / 2, w, h, px * 0.3); ctx.fill(); ctx.stroke();
  ctx.setLineDash([px * 0.18, px * 0.12]); ctx.lineWidth = Math.max(1.5, px * 0.04);
  roundRect(ctx, -w / 2 + px * 0.16, -h / 2 + px * 0.16, w - px * 0.32, h - px * 0.32, px * 0.22); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = t.col; ctx.fillText(t.str, 0, px * 0.04);
  ctx.restore();
}
function drawTexts() {
  texts = texts.filter(t => now < t.born + t.life);
  for (const t of texts) {
    const age = (now - t.born) / t.life;
    if (t.stamp) { drawStamp(t, age); continue; }
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



