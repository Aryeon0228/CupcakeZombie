// ---------- copy ----------
const TYPE_TINT = { basic: '120, 214, 196', berry: '246, 206, 80', sprinkle: '244, 160, 190', cherry: '232, 96, 104', cream: '186, 140, 104', butter: '130, 176, 232', earl_grey: '186, 160, 222', lemon_yogurt: '255, 236, 140', espresso: '214, 112, 96', mint_choco: '0, 0, 0' };
Object.assign(TYPE_TINT, {blueberry:'120, 143, 220', cinnamon_roll:'207, 157, 101'});

// ---------- dom ----------
const $ = id => document.getElementById(id);
const canvas = $('board'), ctx = canvas.getContext('2d');
const dropCanvas = $('dropCanvas'), dropCtx = dropCanvas.getContext('2d');
let dropOrigin = { x: 0, y: 0, ceiling: 0 };
const boardWrap = $('boardWrap');

// ---------- storage (per-device progress) ----------
const STORE_KEY = 'cupcake-zombie-v3';
function loadSave() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
function writeSave(o) { try { localStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch (e) {} }
const save = Object.assign({ stars: {}, daily: {}, streak: { last: '', count: 0 }, hints: 3, noAds: false, sound: true, haptics: true, motion: 'auto', motionNoticed: false, seen: [], clears: 0, adClears: 0, level: 0 }, loadSave());

// ---------- game state ----------
let li = 0, def = null, state = null, undoStack = [];
let mode = 'stage'; // 'stage' | 'daily'
let mistakes = 0, usedHint = false, boosted = false, hintCell = -1;
let vis = [];
let hover = -1, selected = -1, cursor = -1, cursorShown = false;
let busy = false, result = null, introOpen = false;
let particles = [], projs = [], timeline = [], texts = [];
let arm = null;
let S = 64, padX = 20, padTop = 40, padBot = 20, CW = 300, CH = 300, DPR = 1;
let now = performance.now();
// Motion: 'auto' follows the OS "reduce motion" flag (often switched on by IT on shared PCs), the player can override it in Settings.
const osReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let reduceMotion = osReduceMotion;
function syncMotion() {
  reduceMotion = save.motion === 'on' ? false : save.motion === 'off' ? true : osReduceMotion;
  document.documentElement.classList.toggle('reduce-motion', reduceMotion);
}
syncMotion();

// ---------- board geometry ----------
function layout() {
  if (!state) return;
  const css = getComputedStyle(boardWrap);
  const wrapW = Math.max(1, (boardWrap.clientWidth || 360) - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight));
  const wrapH = Math.max(1, (boardWrap.clientHeight || 420) - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom));
  const s = Math.min(wrapW / (state.W + 0.8), wrapH / (state.H + 1.2), 110);
  S = Math.max(1, Math.floor(s));
  padX = Math.round(S * 0.4); padTop = Math.round(S * 0.7); padBot = Math.round(S * 0.5);
  CW = state.W * S + padX * 2; CH = state.H * S + padTop + padBot;
  DPR = Math.min(2.5, window.devicePixelRatio || 1);
  canvas.style.width = CW + 'px'; canvas.style.height = CH + 'px';
  // Setting either bitmap dimension clears the canvas, even if unchanged.
  const bitmapW = Math.round(CW * DPR), bitmapH = Math.round(CH * DPR);
  if (canvas.width !== bitmapW) canvas.width = bitmapW;
  if (canvas.height !== bitmapH) canvas.height = bitmapH;
  const appRect = $('app').getBoundingClientRect(), boardRect = canvas.getBoundingClientRect();
  const dropW = Math.round(appRect.width * DPR), dropH = Math.round(appRect.height * DPR);
  if (dropCanvas.width !== dropW) dropCanvas.width = dropW;
  if (dropCanvas.height !== dropH) dropCanvas.height = dropH;
  dropOrigin = { x: boardRect.left - appRect.left, y: boardRect.top - appRect.top,
    ceiling: $('scr-play').querySelector('.bar').getBoundingClientRect().bottom - boardRect.top };
  requestAnimationFrame(drawBg);
}
// Background art in three slices: shop (top), parchment band (middle, stretched), under-shelf (bottom).
// Play screen: the band hugs the tray, so any board size and any phone height lines up.
// Other screens: shop at the top of the screen, under-shelf at the bottom.
const bgImages = new Map();
function currentBg() {
  if (!BG) return null;
  let ch = 1;
  if (typeof screen !== 'undefined' && screen === 'play' && typeof mode !== 'undefined' && mode === 'stage') { const c = CHAPTERS.find(c => li >= c.from && li <= c.to); if (c) ch = c.no; }
  const e = BG.ch[(ch - 1) % BG.ch.length];
  return { ...e, src: BG.srcs[e.src] };
}
function drawBg() {
  const cv = $('bgCanvas'), app = $('app');
  const bg = currentBg();
  if (!bg) { cv.hidden = true; app.classList.remove('has-bg'); return; }
  let bgImage = bgImages.get(bg.src);
  if (!bgImage) { bgImage = new Image(); bgImage.onload = drawBg; bgImage.src = bg.src; bgImages.set(bg.src, bgImage); return; }
  if (!bgImage.complete || !bgImage.naturalWidth) return;
  app.classList.add('has-bg'); $('scr-play').classList.add('has-bg');
  const ar = app.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = ar.width, H = ar.height;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const [b0, b1] = bg.band, iw = bg.w, ih = bg.h, sc = W / iw;
  const topH = b0 * sc, botH = (ih - b1) * sc;
  let midTop, midBot;
  if (screen === 'play' && state) {
    const cr = canvas.getBoundingClientRect();
    const gap = S * 0.18;
    midTop = cr.top - ar.top + padTop + S * 0.16 - gap;
    midBot = midTop + gap * 2 + state.H * S + S * 0.16;
  } else { midTop = topH; midBot = H - botH; }
  if (midBot < midTop) midBot = midTop;
  g.fillStyle = bg.wall; g.fillRect(0, 0, W, Math.max(0, midTop - topH) + 1);
  g.fillStyle = bg.floor; g.fillRect(0, midBot + botH - 1, W, H);
  g.drawImage(bgImage, 0, b1, iw, ih - b1, 0, midBot, W, botH);
  g.drawImage(bgImage, 0, b0, iw, b1 - b0, 0, midTop, W, midBot - midTop);
  // The shop slice sits on the band. When the tray is low on a tall phone, zoom the shop a little (cropping the sides)
  // and extend its top edge upward, so no flat wall colour shows above the shelves.
  const z = Math.min(1.4, Math.max(1, midTop / topH)), sh = topH * z, sw = W * z, sx = (W - sw) / 2;
  g.drawImage(bgImage, 0, 0, iw, b0, sx, midTop - sh, sw, sh);
  if (midTop - sh > 0) g.drawImage(bgImage, 0, 0, iw, 6, sx, 0, sw, midTop - sh + 1);
}
const cxOf = i => padX + ((i % state.W) + 0.5) * S;
const cyOf = i => padTop + (Math.floor(i / state.W) + 0.5) * S;
const baseY = i => cyOf(i) + S * 0.34;
const wellY = i => cyOf(i) + S * 0.24;
const spriteScale = () => S * 0.9 / UNIT;
function cellAt(ev) {
  const r = canvas.getBoundingClientRect();
  const x = ev.clientX - r.left, y = ev.clientY - r.top;
  const c = Math.floor((x - padX) / S);
  const rr = Math.floor((y - padTop + S * 0.12) / S);
  if (c < 0 || c >= state.W || rr < 0 || rr >= state.H) return -1;
  return rr * state.W + c;
}

