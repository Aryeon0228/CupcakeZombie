// ---------- platform adapters (web mock now, native plugins later) ----------
// The app build stays sequential even when the native bridge has not loaded.
const NATIVE_BUILD = /*NATIVE_BUILD*/false;
const Native = NATIVE_BUILD || !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const WEB_STAGE_SELECT = !Native;
function haptic(kind = 'light') {
  if (!save.haptics) return;
  try {
    const H = window.CZ_HAPTICS || (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics);
    if (H) { kind === 'success' ? H.notification({ type: 'SUCCESS' }) : H.impact({ style: kind === 'medium' ? 'MEDIUM' : 'LIGHT' }); }
    else if (navigator.vibrate) navigator.vibrate(kind === 'success' ? [20, 40, 30] : kind === 'medium' ? 18 : 8);
  } catch (e) {}
}
// Ads / Store: the native build swaps these for AdMob + StoreKit through window.CZ_NATIVE_*; on the web a mock sheet stands in.
const Ads = {
  async rewarded(kind) { if (Native && window.CZ_NATIVE_ADS) return window.CZ_NATIVE_ADS.rewarded(kind); return mockAd('rewarded', kind); },
  async interstitial() { if (save.noAds) return true; if (Native && window.CZ_NATIVE_ADS) return window.CZ_NATIVE_ADS.interstitial(); return mockAd('interstitial'); },
};
const Store = {
  price: '₩3,900',
  async buyRemoveAds() { if (Native && window.CZ_NATIVE_STORE) return window.CZ_NATIVE_STORE.buy('remove_ads'); return mockPurchase(); },
  async restore() { if (Native && window.CZ_NATIVE_STORE) return window.CZ_NATIVE_STORE.restore(); return save.noAds; },
};
let adResolve = null, adTimer = 0;
function mockAd(type, kind) {
  return new Promise(res => {
    adResolve = res;
    const sh = $('adSheet');
    $('adTitle').textContent = type === 'rewarded' ? (kind === 'hint' ? t('ad.hint') : t('ad.spore')) : t('ad.title');
    $('adSub').textContent = t('ad.sub');
    const btn = $('adDone'); btn.disabled = true;
    let left = type === 'rewarded' ? 5 : 3;
    btn.textContent = t('ad.wait', { n: left });
    clearInterval(adTimer);
    adTimer = setInterval(() => { left--; if (left <= 0) { clearInterval(adTimer); btn.disabled = false; btn.textContent = type === 'rewarded' ? t('ad.claim') : t('ad.close'); } else btn.textContent = t('ad.wait', { n: left }); }, 1000);
    openSheet('adSheet');
  });
}
$('adDone').onclick = () => { closeSheet('adSheet'); if (adResolve) adResolve(true); adResolve = null; };
$('adSkip').onclick = () => { clearInterval(adTimer); closeSheet('adSheet'); if (adResolve) adResolve(false); adResolve = null; };
function mockPurchase() { return new Promise(res => setTimeout(() => res(true), 400)); }

// ---------- screens & sheets ----------
let screen = 'title';
function showScreen(name) {
  screen = name;
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 'scr-' + name));
  requestAnimationFrame(drawBg);
  if (name === 'map') renderMap();
  if (name === 'collection') renderCollection();
  if (name === 'title') renderTitle();
  if (name === 'play') requestAnimationFrame(layout);
}
function openSheet(id) { const el = $(id); el.hidden = false; requestAnimationFrame(() => el.classList.add('open')); }
function closeSheet(id) { const el = $(id); el.classList.remove('open'); setTimeout(() => { if (!el.classList.contains('open')) el.hidden = true; }, 220); }
let toastTimer = 0;
function toast(msg, ms = 1800) { const t = $('toast'); t.textContent = msg; t.hidden = false; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.hidden = true, 250); }, ms); }

// ---------- progress ----------
const starsOf = i => save.stars[i] || 0;
const validStage = i => Number.isInteger(i) && i >= 0 && i < LEVELS.length;
const unlocked = i => validStage(i) && (WEB_STAGE_SELECT || i === 0 || starsOf(i - 1) > 0);
const totalStars = () => LEVELS.reduce((a, _, i) => a + starsOf(i), 0);
function nextStage() { const i = LEVELS.findIndex((_, k) => !starsOf(k)); return i < 0 ? LEVELS.length - 1 : i; }
function starsFor(m) { return m === 0 ? 3 : m <= 2 ? 2 : 1; }
function currentStars() { let s = starsFor(mistakes); if (usedHint) s = Math.min(s, 2); if (boosted) s = 1; return s; }
function dateKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function dailyIndex(d = new Date()) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000) % DAILY.length; }
function dailyDef() { const d = new Date(); const p = DAILY[dailyIndex(d)]; return { ...p, daily: true }; }
const levelName = d => d.daily ? t('daily.name') : tl(d, 'name');
const levelTip = d => d.daily ? t('daily.tip', { date: localeDate(new Date()) }) : tl(d, 'tip');

// ---------- title ----------
function renderTitle() {
  const n = nextStage();
  $('playBtn').textContent = totalStars() === 0 ? t('title.play') : t('title.continue', { n: n + 1 });
  $('titleStars').textContent = `★ ${totalStars()} / ${LEVELS.length * 3}`;
  const done = !!save.daily[dateKey()];
  $('dailyBtn').innerHTML = `${t('title.daily')} ${done ? `<span class="chip">${t('title.dailyDone')}</span>` : ''}`;
  $('streak').textContent = save.streak.count > 1 ? t('title.streak', { n: save.streak.count }) : '';
}
$('playBtn').onclick = () => startStage(nextStage());
$('mapBtn').onclick = () => showScreen('map');
$('dailyBtn').onclick = () => startDaily();
$('settingsBtn').onclick = () => openSettings();

// ---------- map ----------
// ---------- stage map: every chapter is a shelf, every stage a cupcake on it ----------
// A locked stage sits under a glass cloche, the next stage has a spore hovering over it, and a cleared stage has gone bad.
const shelfArtCache = {};
function shelfArt(key, mode) {
  const id = key + '|' + mode;
  if (shelfArtCache[id]) return shelfArtCache[id];
  if (!IMG[key] || !META[key]) return '';
  const dpr = Math.min(3, window.devicePixelRatio || 1), W = 66, H = 74;
  const c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  drawSpriteAt(g, key, W / 2, H - 3, 46 / UNIT);
  if (mode === 'locked') { g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#d6cabd'; g.fillRect(0, 0, W, H); }
  return (shelfArtCache[id] = c.toDataURL());
}
// The cupcake that stands for a stage: the flavor it introduces, else its most common flavor (plain muffins count half).
function stageFlavor(i) {
  const def = LEVELS[i];
  if (def.intro && def.intro.kind === 'type' && TYPES[def.intro.t] && !TYPES[def.intro.t].wall) return def.intro.t;
  const n = {};
  for (const row of def.grid) for (const ch of row) { const t = ch.toLowerCase(); if (TYPES[t] && !TYPES[t].wall) n[t] = (n[t] || 0) + (t === 'o' ? 0.5 : 1); }
  return Object.keys(n).sort((a, b) => n[b] - n[a])[0] || 'o';
}
function chapterFlavor(ch) {
  for (let i = ch.from; i <= ch.to; i++) { const d = LEVELS[i]; if (d.intro && d.intro.kind === 'type' && !TYPES[d.intro.t].wall) return d.intro.t; }
  const n = {}; for (let i = ch.from; i <= ch.to; i++) { const f = stageFlavor(i); n[f] = (n[f] || 0) + 1; }
  return Object.keys(n).sort((a, b) => n[b] - n[a])[0];
}
function renderMap() {
  $('mapStars').textContent = `★ ${totalStars()} / ${LEVELS.length * 3}`;
  const box = $('chapterList'); box.innerHTML = '';
  const jump = $('chapterChips'); jump.innerHTML = '';
  const next = nextStage();
  const focus = WEB_STAGE_SELECT && validStage(save.level) ? save.level : next;
  $('stageJumpForm').hidden = !WEB_STAGE_SELECT;
  if (WEB_STAGE_SELECT) {
    $('stageJumpNote').textContent = t('map.freeSelect', { n: LEVELS.length });
    $('stageNumber').max = LEVELS.length;
    $('stageNumber').value = focus + 1;
  }
  $('mapContinue').textContent = t('title.continue', { n: next + 1 });
  for (const ch of CHAPTERS) {
    const got = LEVELS.slice(ch.from, ch.to + 1).reduce((a, _, k) => a + starsOf(ch.from + k), 0);
    const wrap = document.createElement('section'); wrap.className = 'chapter shelf'; wrap.id = 'chapter-' + ch.no;
    const chip = document.createElement('button'); chip.className = 'chip' + (got === (ch.to - ch.from + 1) * 3 ? ' done' : ''); chip.dataset.no = ch.no; chip.setAttribute('role', 'tab');
    chip.textContent = t('map.chip', { n: ch.no }); chip.title = tl(ch, 'name');
    chip.onclick = () => jumpToChapter(ch.no);
    jump.appendChild(chip);
    const face = shelfArt(TYPES[chapterFlavor(ch)].key, 'fresh');
    wrap.innerHTML = `<div class="chap-head">${face ? `<img class="chap-face" src="${face}" alt="">` : ''}<div class="chap-text"><span class="eyebrow">${t('map.chapter', { n: ch.no })}</span><h3>${tl(ch, 'name')}</h3></div><span class="small">★ ${got} / ${(ch.to - ch.from + 1) * 3}</span></div>`;
    for (let row = ch.from; row <= ch.to; row += 5) {
      const plank = document.createElement('div'); plank.className = 'plank';
      for (let i = row; i < Math.min(row + 5, ch.to + 1); i++) {
        const b = document.createElement('button');
        const st = starsOf(i), open = unlocked(i), ty = TYPES[stageFlavor(i)];
        b.className = 'stage-btn' + (st ? ' done' : '') + (open ? '' : ' locked');
        if (i === next) { b.classList.add('next-stage'); b.setAttribute('aria-current', 'step'); }
        const art = st ? shelfArt(IMG['zombie_' + ty.key] ? 'zombie_' + ty.key : 'zombieB', 'zombie') : shelfArt(ty.key, open ? 'fresh' : 'locked');
        b.innerHTML = `<span class="art">${i === next && typeof ASSETS !== 'undefined' && ASSETS.spore_round ? `<img class="spore" src="${ASSETS.spore_round}" alt="">` : ''}<img class="cake" src="${art}" alt="">${open ? '' : '<span class="cloche"></span>'}${st ? `<span class="st">${starsHTML(st)}</span>` : ''}</span><span class="n">${i + 1}</span>`;
        b.setAttribute('aria-label', t('map.ariaStage', { n: i + 1, name: tl(LEVELS[i], 'name') }) + (open ? (st ? t('map.ariaStars', { n: st }) : '') : t('map.ariaLocked')));
        b.onclick = () => { if (open) startStage(i); else { haptic(); toast(t('map.locked')); } };
        plank.appendChild(b);
      }
      wrap.appendChild(plank);
    }
    box.appendChild(wrap);
  }
  requestAnimationFrame(() => jumpToChapter(CHAPTERS.find(ch => focus >= ch.from && focus <= ch.to).no));
}
// Submit also works with Enter; range checks apply to programmatic submits too.
$('stageJumpForm').onsubmit = e => {
  e.preventDefault();
  if (!WEB_STAGE_SELECT || screen !== 'map') return;
  const input = $('stageNumber'), index = input.valueAsNumber - 1;
  if (!validStage(index)) { toast(t('map.stageRange', { n: LEVELS.length })); input.focus(); return; }
  startStage(index);
};
function jumpToChapter(no) {
  const box = $('chapterList'), chapter = $('chapter-' + no);
  if (chapter) box.scrollTop += chapter.getBoundingClientRect().top - box.getBoundingClientRect().top - 16;
  markChapterChip(no);
}
function markChapterChip(no) {
  const chips = $('chapterChips');
  for (const c of chips.children) { const on = +c.dataset.no === +no; c.classList.toggle('on', on); c.setAttribute('aria-selected', on); if (on) { const r = c.getBoundingClientRect(), b = chips.getBoundingClientRect(); if (r.left < b.left || r.right > b.right) c.scrollIntoView({ block: 'nearest', inline: 'center' }); } }
}
// the chip row follows the shelf being scrolled
$('chapterList').addEventListener('scroll', () => {
  const box = $('chapterList'), top = box.getBoundingClientRect().top + box.clientHeight * 0.35;
  // The last shelf cannot always align with the top of a tall viewport.
  if (box.scrollTop + box.clientHeight >= box.scrollHeight - 2) {
    const last = box.lastElementChild;
    if (last) markChapterChip(last.id.replace('chapter-', ''));
    return;
  }
  let best = null;
  for (const el of box.querySelectorAll('.chapter')) { if (el.getBoundingClientRect().top <= top) best = el; }
  if (best) markChapterChip(best.id.replace('chapter-', ''));
}, { passive: true });
$('mapContinue').onclick = () => startStage(nextStage());
const LOCK = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2" fill="#B9A89C"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="#B9A89C" stroke-width="2"/></svg>';
function starsHTML(n) { return [0, 1, 2].map(i => `<i class="${i < n ? 'on' : 'off'}">★</i>`).join(''); }
$('mapBack').onclick = () => showScreen('title');

// ---------- settings ----------
function openSettings() {
  $('setSound').checked = save.sound; $('setHaptic').checked = save.haptics;
  $('setMotion').checked = !reduceMotion;
  const note = $('setMotionNote'); note.hidden = !osReduceMotion; note.textContent = osReduceMotion ? t('set.motionOs') : '';
  $('noAdsBtn').textContent = save.noAds ? t('set.noAdsDone') : t('set.noAds', { price: Store.price });
  $('noAdsBtn').disabled = save.noAds;
  $('hintCount').textContent = t('set.hints', { n: save.hints });
  applyLang();
  $('resetConfirm').hidden = true;
  openSheet('settingsSheet');
}
$('setSound').onchange = e => { save.sound = e.target.checked; syncSound(); writeSave(save); $('setSound2').checked = save.sound; if (save.sound) buttonSound(); };
$('setHaptic').onchange = e => { save.haptics = e.target.checked; writeSave(save); haptic('medium'); };
$('setMotion').onchange = e => { save.motion = e.target.checked ? 'on' : 'off'; syncMotion(); writeSave(save); };
$('noAdsBtn').onclick = async () => { const ok = await Store.buyRemoveAds(); if (ok) { save.noAds = true; writeSave(save); openSettings(); toast(t('toast.noAds')); } };
$('restoreBtn').onclick = async () => { const ok = await Store.restore(); if (ok) { save.noAds = true; writeSave(save); openSettings(); toast(t('toast.restored')); } else toast(t('toast.noRestore')); };
document.querySelectorAll('.segbtn').forEach(b => { b.onclick = () => setLang(b.dataset.lang); });
function setLang(l) {
  if (!LANGS.includes(l) || l === LANG) return;
  LANG = l; save.lang = l; writeSave(save); haptic();
  applyLang();
  if (screen === 'title') renderTitle();
  if (screen === 'map') renderMap();
  if (screen === 'collection') { renderCollection(); if (!$('cardSheet').hidden && cardType) showCupcakeCard(cardType); }
  if (state) { renderHUD(); renderLegend(); updateHint(); if (introOpen) showIntro(); if (result && screen === 'play') showResult(result, currentStars()); }
  $('noAdsBtn').textContent = save.noAds ? t('set.noAdsDone') : t('set.noAds', { price: Store.price });
  $('hintCount').textContent = t('set.hints', { n: save.hints });
}
$('resetBtn2').onclick = () => { $('resetConfirm').hidden = false; };
$('resetYes').onclick = () => { try { localStorage.removeItem(STORE_KEY); } catch (e) {} location.reload(); };
$('resetNo').onclick = () => { $('resetConfirm').hidden = true; };
$('settingsClose').onclick = () => closeSheet('settingsSheet');

// ---------- loading a level ----------
function rebuildVis() {
  vis = state.cells.map((c, i) => c && {
    t: c.t, zombie: c.inf, lid: c.lid, wrap: c.wrap, sealed: c.inf && c.wrap, pend: c.pend, sour: !!c.sour, sourAt: -1, frost: false, frostAt: -1, meltAt: -1,
    zv: ((i * 7 + li * 3) % 3 === 0) ? 'zombieA' : 'zombieB',
    flip: ((i * 5 + li) % 4) === 1,
    phase: (i * 1.37) % (Math.PI * 2),
    infAt: -1, bumpAt: -1, bumpAmp: 0, swayAt: -1, swayAmp: 0, peekAt: -1, reactAt: -1, flashAt: -1, gone: false,
  });
}
function loadLevel(d, opts = {}) {
  def = d;
  lastCardRewards = []; $('cardRewards').hidden = true; closeSheet('cardSheet');
  state = parseLevel(def);
  undoStack = [];
  if (!opts.keepMistakes) { mistakes = 0; usedHint = false; boosted = false; }
  hintCell = -1;
  particles = []; projs = []; timeline = []; texts = []; arm = null;
  resetBoardPress();
  busy = false; result = null; hover = -1; selected = -1;
  cursor = state.cells.findIndex(Boolean);
  rebuildVis();
  closeSheet('resultSheet'); closeSheet('legendSheet');
  showScreen('play');
  layout(); renderHUD(); renderLegend(); updateHint();
  if (def.intro && opts.intro !== false && mode === 'stage' && !save.seen.includes(li)) showIntro(); else hideIntro();
}
// Shared PCs often have the OS "reduce motion" flag on; say so once, because it hides most of the game's feedback.
function motionNotice() {
  if (!osReduceMotion || save.motion !== 'auto' || save.motionNoticed) return;
  save.motionNoticed = true; writeSave(save);
  setTimeout(() => toast(t('toast.motion'), 4500), 600);
}
function startStage(i) {
  if (!validStage(i)) return false;
  if (!unlocked(i)) { haptic(); toast(t('map.locked')); return false; }
  motionNotice();
  mode = 'stage'; li = i;
  save.level = li; writeSave(save);
  loadLevel(LEVELS[li]);
  return true;
}
function startDaily() { mode = 'daily'; li = -1; loadLevel(dailyDef()); }
function restart() {
  if (busy || introOpen) return;
  if (undoStack.length) mistakes++;
  haptic();
  loadLevel(def, { keepMistakes: true, intro: false });
}
function undo() {
  if (busy || introOpen || !undoStack.length) return;
  resetBoardPress(); hover = -1; selected = -1;
  mistakes++;
  state = undoStack.pop();
  hintCell = -1;
  particles = []; projs = []; texts = []; arm = null; timeline = [];
  closeSheet('resultSheet'); result = null;
  rebuildVis(); renderHUD(); updateHint(); haptic();
}

// ---------- firing ----------
function fireAt(idx) {
  if (busy || result || introOpen || !canTarget(state, idx)) return;
  audio(); haptic('medium');
  const prev = state;
  const contactOffset = (sporeContactY(idx) - cyOf(idx)) / S;
  const turn = playTurn(state, idx);
  const plan = planCascade(prev, [{ idx, t: DROP, direct: true }]);
  undoStack.push(prev);
  state = turn.state;
  turn.cust.forEach(c => { c.k.pending = true; });
  busy = true; selected = -1; hintCell = -1;
  renderHUD(); updateHint();
  projs.push({ style: 'drop', to: idx, contactOffset, t0: now, dur: DROP });
  const mold = $('moldImg'); if (mold) { mold.classList.remove('puff'); void mold.offsetWidth; mold.classList.add('puff'); }
  tone(640, 0.16, 'sine', 0.025, 0.65);
  const maxT = scheduleFlights(plan, 0);
  let maxDepth = 0;
  for (const h of plan.hits) if (h.kind === 'infect' || h.kind === 'sealed') maxDepth = Math.max(maxDepth, h.depth);
    const end = maxT + 520;
  if (maxDepth >= 4) at(end - 300, () => { floatText(CW / 2, padTop + state.H * S * 0.45, t('fx.chain', { n: maxDepth + 1 }), '#5B7A21', 0.62, 1300); tone(note(8), 0.3, 'sine', 0.07, 1.5); });
  at(end, () => customerPhase(turn.cust, 0, () => playTicks(turn.ticks.length, plan.sim, () => finish(turn.res))));
}
// chilled lemons spoil at the end of the turn, one generation per tick
function scheduleFlights(plan, base) {
  let maxT = base;
  for (const f of plan.flights) {
    projs.push({ ...f, t0: now + base + f.t0 });
    if (f.style === 'roll') f.path.forEach((c, k) => { if (state.tiles[c]) at(base + f.t0 + 95 * (k + 1), () => { tone(1200, 0.06, 'square', 0.025); bumpTile(c); }); });
    if (f.miss) at(base + f.t0 + f.dur, () => missLand(f));
    maxT = Math.max(maxT, base + f.t0 + f.dur);
  }
  for (const h of plan.hits) { at(base + h.t, () => { applyHit(h); if (h.kind === 'infect') haptic(); }); maxT = Math.max(maxT, base + h.t); }
  return maxT;
}
function playTicks(n, sim, done) {
  if (n <= 0) { done(); return; }
  const rel = planRelease(sim);
  const end = scheduleFlights(rel, 250);
  at(end + 450, () => playTicks(n - 1, sim, done));
}

// The shelf has gone bad: the zombies shamble and sway in a slow wave across the tray with stink rising,
// sprinkles rain down for the player, and a stamp slams on.
function chapterDone() { return mode === 'stage' && li % 10 === 9 && li < LEVELS.length - 1; }
function celebrate(stars) {
  const last = mode === 'stage' && li === LEVELS.length - 1;
  const text = last ? t('res.bakery') : chapterDone() ? t('res.chapterStamp', { n: Math.floor(li / 10) + 1 }) : t('res.wiped');
  if (reduceMotion) { stamp(text, '#5B7A21', 900); return; }
  for (let i = 0; i < vis.length; i++) if (vis[i]) {
    const delay = (i % state.W) * 90 + Math.floor(i / state.W) * 40;
    sway(i, delay, 0.15); at(delay + 120, () => { if (vis[i] && isZombieShown(vis[i])) stink(i); });
  }
  at(260, () => stamp(text, '#5B7A21', 1400));
  at(380, () => confetti(stars === 3 ? 52 : 36));
  at(700, () => tone(110, 0.5, 'sawtooth', 0.03, 0.8)); // a low, lazy groan under the sway
}
function finish(res) {
  busy = false;
  for (const v of vis) if (v && v.frost) { v.frost = false; v.meltAt = now; } // the snow melts with the turn
  renderHUD(); updateHint();
  if (res === 'win') {
    const stars = currentStars();
    lastCardRewards = addCollectionClear(save.collection, def, stars);
    if (mode === 'stage') { save.stars[li] = Math.max(starsOf(li), stars); save.clears++; }
    else {
      const k = dateKey(); save.daily[k] = Math.max(save.daily[k] || 0, stars);
      const y = new Date(); y.setDate(y.getDate() - 1);
      if (save.streak.last !== k) { save.streak.count = save.streak.last === dateKey(y) ? save.streak.count + 1 : 1; save.streak.last = k; }
    }
    writeSave(save);
    haptic('success');
    [0, 4, 7, 12].forEach((s, i) => tone(note(s), 0.32, 'triangle', 0.09, 1, i * 0.09));
    celebrate(stars);
    at(reduceMotion ? 600 : (innerHeight < 700 ? 2200 : 1500), () => showResult('win', stars));
  } else if (res === 'lost') {
    tone(330, 0.3, 'triangle', 0.08, 0.7); tone(247, 0.4, 'triangle', 0.08, 0.7, 0.18);
    showResult('lost');
  } else if (res === 'out') {
    tone(300, 0.3, 'triangle', 0.07, 0.6);
    at(300, () => showResult('out'));
  }
}

// ---------- hint & boost ----------
function solveNext(s) {
  const key = stateKey;
  const memo = new Map();
  function best(st) {
    const k = key(st); if (memo.has(k)) return memo.get(k);
    let b = Infinity;
    for (let i = 0; i < st.cells.length && b > 1; i++) {
      if (!canTarget(st, i)) continue;
      const r = playTurn(st, i);
      if (r.res === 'win') b = 1; else if (r.res === 'play') b = Math.min(b, 1 + best(r.state));
    }
    memo.set(k, b); return b;
  }
  let bi = -1, bv = Infinity;
  for (let i = 0; i < s.cells.length; i++) {
    if (!canTarget(s, i)) continue;
    const r = playTurn(s, i);
    const v = r.res === 'win' ? 1 : r.res === 'play' ? 1 + best(r.state) : Infinity;
    if (v < bv) { bv = v; bi = i; }
  }
  return bv <= s.spores ? bi : -1;
}
async function onHint() {
  if (busy || introOpen || result === 'win') return;
  if (result) { undo(); }
  if (hintCell >= 0) { toast(t('toast.marked')); return; }
  if (save.hints <= 0) {
    const ok = await Ads.rewarded('hint');
    if (!ok) return;
    save.hints += 1; writeSave(save); renderHUD();
  }
  const i = solveNext(state);
  if (i < 0) { toast(t('toast.unsolvable')); return; }
  save.hints -= 1; usedHint = true; hintCell = i; writeSave(save);
  haptic('medium'); tone(880, 0.12, 'sine', 0.06, 1.3);
  renderHUD(); updateHint();
}
async function onBoost() {
  if (busy || introOpen) return;
  const ok = await Ads.rewarded('spore');
  if (!ok) return;
  boosted = true; state.spores += 1;
  closeSheet('resultSheet'); result = null;
  floatText(CW / 2, padTop + state.H * S * 0.4, t('fx.boost'), '#5B7A21', 0.5, 1200);
  tone(note(6), 0.2, 'triangle', 0.08);
  renderHUD(); updateHint();
}
function drawHintMarker(T) {
  if (hintCell < 0 || busy || result) return;
  const x = cxOf(hintCell), y = cyOf(hintCell) - S * 0.95 + Math.sin(T * 6) * S * 0.06;
  ctx.save();
  ctx.setLineDash([5, 4]); ctx.lineDashOffset = -T * 24; ctx.lineWidth = 3; ctx.strokeStyle = '#F2B53A';
  ctx.beginPath(); ctx.ellipse(cxOf(hintCell), wellY(hintCell), S * 0.5, S * 0.34, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#F2B53A'; ctx.strokeStyle = '#4A2E27'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + S * 0.18); ctx.lineTo(x - S * 0.14, y); ctx.lineTo(x - S * 0.06, y); ctx.lineTo(x - S * 0.06, y - S * 0.16); ctx.lineTo(x + S * 0.06, y - S * 0.16); ctx.lineTo(x + S * 0.06, y); ctx.lineTo(x + S * 0.14, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ---------- result sheet ----------
async function showResult(kind, stars) {
  result = kind;
  if (kind === 'win') renderCardRewards(); else $('cardRewards').hidden = true;
  $('resChapter').hidden = !(kind === 'win' && chapterDone());
  const sh = $('resultSheet');
  sh.classList.toggle('win', kind === 'win'); sh.classList.toggle('lose', kind !== 'win');
  const total = state.cells.filter(Boolean).length;
  const btns = $('resBtns'); btns.innerHTML = '';
  const mk = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.innerHTML = label; b.onclick = fn; btns.appendChild(b); return b; };
  const st = $('resStars');
  if (kind === 'win') {
    st.hidden = false; [...st.children].forEach((s, i) => s.className = i < stars ? 'on' : '');
    if (mode === 'daily') {
      $('resEyebrow').textContent = t('res.dailyClear');
      $('resTitle').textContent = save.streak.count > 1 ? t('res.streak', { n: save.streak.count }) : t('res.wiped');
      setText($('resMsg'), t('res.tomorrow'));
      mk(t('res.home'), 'go', () => showScreen('title'));
      mk(t('res.retry'), '', () => loadLevel(def, { intro: false }));
    } else {
      $('resEyebrow').textContent = t('res.stageClear', { n: li + 1 });
      $('resTitle').textContent = li === LEVELS.length - 1 ? t('res.bakery') : chapterDone() ? t('res.chapterDone', { n: Math.floor(li / 10) + 1 }) : t('res.wiped');
      if (chapterDone()) {
        const ch = CHAPTERS[Math.floor(li / 10)], nx = CHAPTERS[Math.floor(li / 10) + 1];
        const got = LEVELS.slice(ch.from, ch.to + 1).reduce((a, _, k) => a + starsOf(ch.from + k), 0);
        const face = shelfArt(TYPES[chapterFlavor(ch)].key, 'fresh'), nface = nx ? shelfArt(TYPES[chapterFlavor(nx)].key, 'fresh') : '';
        $('resChapter').innerHTML = `<span class="rc-done"><img src="${face}" alt=""><span><b>${tl(ch, 'name')}</b><small>★ ${got} / ${(ch.to - ch.from + 1) * 3}</small></span></span>` +
          (nx ? `<span class="rc-arrow">→</span><span class="rc-next"><img src="${nface}" alt=""><span><small>${t('res.chapterNext', { n: nx.no })}</small><b>${tl(nx, 'name')}</b></span></span>` : '');
      }
      setText($('resMsg'), stars === 3 ? t('res.msg3', { n: total }) : boosted ? t('res.msgBoost') : usedHint ? t('res.msgHint') : t('res.msgUndo', { n: total }));
      if (li < LEVELS.length - 1) mk(t('res.next'), 'go', async () => { await maybeInterstitial(); startStage(li + 1); });
      else mk(t('res.list'), 'go', () => showScreen('map'));
      mk(t('res.retry'), '', () => loadLevel(def, { intro: false }));
    }
  } else {
    st.hidden = true;
    const fresh = freshCount(state);
    $('resEyebrow').textContent = mode === 'daily' ? t('play.daily') : t('res.stage', { n: li + 1 });
    if (kind === 'lost') {
      const k = state.customers.find(c => c.turn === state.turn && customerCells(state, c).some(j => state.cells[j] && !state.cells[j].inf));
      const j = k && customerCells(state, k).find(j => state.cells[j] && !state.cells[j].inf), cell = j >= 0 && state.cells[j];
      $('resTitle').textContent = t(k && k.kind === 'order' ? 'res.lostOrder' : 'res.lost');
      setText($('resMsg'), t(k && k.kind === 'kid' ? 'res.lostKidMsg' : k && k.kind === 'order' ? 'res.lostOrderMsg' : 'res.lostMsg', { name: cell ? typeName(cell.t) : 'cupcake' }));
      mk(t('res.undo'), 'go', undo);
    } else {
      $('resTitle').textContent = t('res.out');
      setText($('resMsg'), t('res.outMsg', { n: fresh, s: plural(fresh) }));
      mk(t('res.undo'), 'go', undo);
      mk(`${AD_ICON} ${t('res.boost')}`, '', onBoost);
    }
    mk(save.hints > 0 ? t('res.hintN', { n: save.hints }) : `${AD_ICON} ${t('res.hintAd')}`, '', onHint);
    mk(t('res.retry'), '', restart);
  }
  openSheet('resultSheet');
  updateHint();
}
const AD_ICON = '<svg viewBox="0 0 20 14" width="18" height="13" aria-hidden="true"><rect x="1" y="1" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 4.5v5l4-2.5z" fill="currentColor"/></svg>';
async function maybeInterstitial() {
  if (save.noAds || mode !== 'stage' || li < 3) return;
  if (save.clears - save.adClears < 3) return;
  save.adClears = save.clears; writeSave(save);
  await Ads.interstitial();
}

// ---------- intro card ----------
function showIntro() {
  const it = def.intro;
  introOpen = true;
  $('introTag').textContent = tl(it, 'tag') || t('intro.new');
  $('introTitle').textContent = tl(it, 'title');
  setText($('introText'), tl(it, 'text'));
  const art = $('introArt'); art.innerHTML = '';
  if (it.kind === 'type') {
    const im = document.createElement('img'); im.src = ASSETS[TYPES[it.t].key]; im.alt = ''; art.appendChild(im);
    art.insertAdjacentHTML('beforeend', patternSVG(TYPES[it.t].key));
  } else {
    const c = document.createElement('canvas'); c.width = 220; c.height = 208; c.style.height = '104px';
    art.appendChild(c); drawIntroArt(c, it.kind);
  }
  $('intro').hidden = false;
}
function hideIntro() { introOpen = false; $('intro').hidden = true; }
$('introGo').onclick = () => { if (mode === 'stage' && !save.seen.includes(li)) save.seen.push(li); writeSave(save); hideIntro(); audio(); haptic(); };
function drawIntroArt(c, kind) {
  const g = c.getContext('2d'); const sc = 150 / UNIT;
  if (kind === 'start') { drawSpriteAt(g, 'basic', 60, 200, sc); drawSpriteAt(g, 'zombieB', 160, 200, sc); drawSpore(g, 110, 40, 16, 0, 1); }
  else if (kind === 'spores') { drawSpore(g, 70, 104, 30); drawSpore(g, 150, 104, 30, 0.5); }
  else if (kind === 'cust') { drawSpriteAt(g, 'basic', 110, 204, sc); drawHand(g, 110, 36, 34, false); drawTag(g, 172, 70, 20, 1, 0); }
  else if (kind === 'kid') { const s2 = 120 / UNIT; drawSpriteAt(g, 'basic', 70, 204, s2); drawSpriteAt(g, 'berry', 150, 204, s2); drawHand(g, 110, 40, 26, false); drawTag(g, 110, 100, 18, 1, 0, '#F2A33A'); }
  else if (kind === 'order') { const s2 = 86 / UNIT; [40, 110, 180].forEach((x, i) => drawSpriteAt(g, ['basic', 'sprinkle', 'berry'][i], x, 200, s2)); g.strokeStyle = '#5B8E3E'; g.lineWidth = 4; g.setLineDash([10, 7]); roundRect(g, 4, 112, 212, 100, 14); g.stroke(); g.setLineDash([]); drawTag(g, 200, 112, 20, 2, 0, '#5B8E3E'); }
  else if (kind === 'picky') { const s2 = 100 / UNIT; drawSpriteAt(g, 'zombieB', 50, 206, s2); drawSpriteAt(g, 'basic', 125, 206, s2); drawSpriteAt(g, 'berry', 200, 206, s2); drawHand(g, 125, 44, 30, false, '#F7CFAE'); drawTag(g, 178, 70, 20, 1, 0, '#8E5EA8'); g.strokeStyle = '#8E5EA8'; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); g.ellipse(50, 206, 40, 14, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(200, 206, 40, 14, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
  else if (kind === 'wrap') { drawSpriteAt(g, 'berry', 110, 200, sc); drawWrap(g, 110, 202, 150); }
  else if (kind === 'defl') { drawSpatula(g, 110, 110, 190, '/'); drawMoldCherry(g, 40, 160, 18, 0.4); g.strokeStyle = '#5B7A21'; g.setLineDash([6, 6]); g.lineWidth = 3; g.beginPath(); g.moveTo(60, 160); g.lineTo(110, 160); g.lineTo(110, 30); g.stroke(); }
}

// ---------- HUD ----------
function renderHUD() {
  const mold = $('moldImg');
  if (ASSETS.mold_player && !mold.hasAttribute('src')) mold.src = ASSETS.mold_player;
  mold.hidden = !ASSETS.mold_player;
  // Keep the live region stable: announce a change in stock, not each HUD refresh.
  for (const [id, text] of [['sporeLabel', t('hud.spores')], ['sporeCount', String(state.spores)], ['sporeUnit', t('hud.sporeUnit')]]) {
    if ($(id).textContent !== text) $(id).textContent = text;
  }
  $('pips').classList.toggle('empty', state.spores === 0);
  const pending = state.customers.filter(c => !c.done && c.turn > state.turn);
  // the customer chip repeats the board's red tag: soonest arrival in the dot, how many are coming beside it
  const soon = pending.length ? Math.min(...pending.map(c => c.turn - state.turn)) : 0;
  $('custInfo').innerHTML = pending.length ? `<span class="cust-chip${soon <= 1 ? ' soon' : ''}"><i class="tagdot">${soon}</i>${t('hud.customers', { n: pending.length, s: plural(pending.length) })}</span>` : '';
  const st = currentStars();
  $('starNow').innerHTML = starsHTML(st);
  // the stars speak for themselves: the rule card on stage 1 (and the ? button) already explain the three-star rule
  $('starText').textContent = '';
  $('undoBtn').disabled = busy || !undoStack.length;
  $('hintLabel').innerHTML = save.hints > 0 ? `${t('play.hint')} <span class="k">${save.hints}</span>` : `${t('play.hint')} ${AD_ICON}`;
  const ch = mode === 'stage' ? CHAPTERS.find(c => li >= c.from && li <= c.to) : null;
  $('stageLabel').textContent = mode === 'daily' ? localeDate(new Date()) : t('play.stageLabel', { ch: ch ? ch.no : '', n: li + 1 });
  $('stageName').textContent = levelName(def);
}
function patternSVG(key) {
  const ty = TYPES[Object.keys(TYPES).find(k => TYPES[k].key === key)], p = ty.pattern;
  const N = 5, cell = 9, gap = 1.5, o = 0.5;
  let s = `<svg viewBox="0 0 ${N * cell + (N - 1) * gap + 1} ${N * cell + (N - 1) * gap + 1}" aria-hidden="true">`;
  const hit = new Set(), snow = new Set();
  const offs = patternOffsets(p);
  if (offs === 'lines') [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b]) => hit.add(`${2 + 2 * a},${2 + 2 * b}`));
  else if (offs === 'scent') ['0,0', '0,4', '4,1', '3,4'].forEach(k => hit.add(k));
  else if (offs !== 'none') offs.forEach(([a, b]) => hit.add(`${2 + a},${2 + b}`));
  if (ty.frost) DIRS4.concat(DIAG4).forEach(([a, b]) => snow.add(`${2 + a},${2 + b}`)); // the coconut's snow ring
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const x = o + c * (cell + gap), y = o + r * (cell + gap);
    let fill = '#F3E9E1', stroke = '';
    if (r === 2 && c === 2) fill = offs === 'none' && !ty.frost ? '#5FB8A8' : '#4A2E27';
    else if (snow.has(`${r},${c}`)) { fill = '#DCEFFF'; stroke = ' stroke="#5E8FB8" stroke-width="0.8"'; }
    else if (offs === 'scent' && hit.has(`${r},${c}`)) { fill = '#BBA3DE'; }
    else if (hit.has(`${r},${c}`)) fill = ty.sour ? '#F48FA6' : '#93B743';
    else if (offs === 'lines' && (r === 2 || c === 2) && Math.abs(r - 2) + Math.abs(c - 2) === 1) { fill = '#FFF9F2'; stroke = ' stroke="#93B743" stroke-dasharray="2 1.5"'; }
    s += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2.5" fill="${fill}"${stroke}/>`;
  }
  return s + '</svg>';
}
function seenTypeBefore(t) { if (mode !== 'stage') return true; for (let i = 0; i < li; i++) if (LEVELS[i].grid.join('').toLowerCase().includes(t)) return true; return false; }
function renderLegend() {
  $('legendTip').textContent = levelTip(def);
  $('introAgain').hidden = !def.intro;
  const lg = $('legend'); lg.innerHTML = '';
  const flat = def.grid.join('');
  for (const tk of Object.keys(TYPES)) {
    if (!flat.toLowerCase().includes(tk)) continue;
    const ty = TYPES[tk];
    const row = document.createElement('div'); row.className = 'leg'; row.dataset.key = ty.key;
    row.innerHTML = `<img src="${ASSETS[ty.key]}" alt=""><div class="txt"><b>${tl(ty, 'name')}${seenTypeBefore(tk) ? '' : '<span class="new">NEW</span>'}</b>${t('rule.' + ty.key)}</div>${patternSVG(ty.key)}`;
    lg.appendChild(row);
  }
  const extra = (key, name, rule, isNew, draw) => {
    const row = document.createElement('div'); row.className = 'leg'; row.dataset.key = key;
    row.innerHTML = `<canvas class="ico" width="80" height="80"></canvas><div class="txt"><b>${name}${isNew ? '<span class="new">NEW</span>' : ''}</b>${rule}</div><span></span>`;
    lg.appendChild(row); draw(row.querySelector('canvas').getContext('2d'));
  };
  const hasWrap = g => /[A-Z]/.test(g.join('')), hasDefl = g => /[\/\\]/.test(g.join(''));
  const before = fn => mode === 'stage' && !LEVELS.slice(0, li).some(fn);
  if (hasWrap(def.grid)) extra('wrap', t('leg.wrap'), t('rule.wrap'), before(l => hasWrap(l.grid)), g => { drawSpriteAt(g, 'basic', 40, 76, 62 / UNIT); drawWrap(g, 40, 76, 64); });
  if (hasDefl(def.grid)) extra('defl', t('leg.defl'), t('rule.defl'), before(l => hasDefl(l.grid)), g => drawSpatula(g, 40, 40, 74, '/'));
  const hasKind = (l, kind) => (l.customers || []).some(k => (k.kind || 'cust') === kind);
  if (hasKind(def, 'cust')) extra('cust', t('leg.cust'), t('rule.cust'), before(l => hasKind(l, 'cust')), g => { drawHand(g, 36, 30, 24, false); drawTag(g, 58, 58, 13, 1, 0); });
  if (hasKind(def, 'kid')) extra('kid', t('leg.kid'), t('rule.kid'), before(l => hasKind(l, 'kid')), g => { drawHand(g, 36, 30, 19, false); drawTag(g, 58, 58, 13, 1, 0, '#F2A33A'); });
  if (hasKind(def, 'order')) extra('order', t('leg.order'), t('rule.order'), before(l => hasKind(l, 'order')), g => { g.strokeStyle = '#5B8E3E'; g.lineWidth = 2.5; g.setLineDash([5, 4]); roundRect(g, 8, 24, 60, 40, 8); g.stroke(); g.setLineDash([]); drawTag(g, 62, 26, 11, 2, 0, '#5B8E3E'); });
  if (hasKind(def, 'picky')) extra('picky', t('leg.picky'), t('rule.picky'), before(l => hasKind(l, 'picky')), g => { drawHand(g, 36, 30, 24, false); drawTag(g, 58, 58, 13, 1, 0, '#8E5EA8'); });
}
// Wrap each sentence so a line breaks between sentences rather than inside one when it can
const esc = x => String(x).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const sents = h => String(h).split(/(?<=[.!?])\s+(?=[^\s])/).map(p => `<span class="sent">${p}</span>`).join(' ');
function setText(el, text) { el.innerHTML = sents(esc(text)); }
function tutorialStage() { return mode === 'stage' && li === 0; }
function updateHint() {
  const i = hover >= 0 ? hover : selected >= 0 ? selected : (cursorShown ? cursor : -1);
  const el = $('hintLine');
  if (i >= 0 && state.cells[i]) {
    const c = state.cells[i], ty = TYPES[c.t];
    let s = c.inf ? (c.wrap ? t('hint.sealedInf') : c.sour ? t('hint.sourInf') : t('hint.inf')) : c.pend ? t('hint.pending') : t('rule.' + ty.key);
    if (!c.inf && c.wrap) s = t('hint.wrapPrefix') + t('rule.wrap');
    if (!c.inf && c.t === 'b') s += c.lid > 0 ? t('hint.lidOn') : t('hint.lidOff');
    const k = state.customers.find(k => !k.done && customerCells(state, k).includes(i));
    if (k && !c.inf) { const n = k.turn - state.turn; s += t('hint.' + (k.kind || 'cust'), { n, s: plural(n) }); }
    el.innerHTML = sents(`<b>${c.inf ? t('hint.spoiled') : ''}${tl(ty, 'name')}</b> ${s}`);
    if (i === selected && !busy && !result && canTarget(state, i)) el.innerHTML += `<span class="selection-tip">${t('hint.confirm')}</span>`;
  } else if (i >= 0 && state.tiles[i]) el.innerHTML = sents(`<b>${t('hint.spatula')}</b> ${t('rule.defl')}`);
  else if (busy) el.innerHTML = sents(t('hint.busy'));
  else if (result) el.innerHTML = '';
  else if (hintCell >= 0) el.innerHTML = sents(t('hint.hint'));
  else el.innerHTML = ''; // no standing tutorial line: the rule card and the ? button cover it, and the box fills once a cupcake is picked
  fitHint(el);
}
// The hint box has a fixed height so the board never jumps; long rule text steps down a size or two instead of clipping.
function fitHint(el) {
  el.style.fontSize = '';
  for (const px of [14, 13, 12]) { if (el.scrollHeight <= el.clientHeight + 1) break; el.style.fontSize = px + 'px'; }
}

// ---------- input ----------
let press = null;
let lastPeekNote = -Infinity;
function resetBoardPress() {
  const down = press; press = null;
  if (down && canvas.hasPointerCapture(down.id)) canvas.releasePointerCapture(down.id);
}
function boardInputReady() { return !!state && screen === 'play' && !busy && !result && !introOpen; }
function pointPreview(e, pick = false, audible = false) {
  const i = cellAt(e);
  const h = i >= 0 && (state.cells[i] || state.tiles[i]) ? i : -1;
  const entered = h !== hover, previousSelection = selected;
  if (entered) {
    hover = h; cursorShown = false;
    if (h >= 0 && vis[h] && !vis[h].gone && (vis[h].peekAt < 0 || now - vis[h].peekAt >= 350)) {
      vis[h].peekAt = now;
      if (audible && now - lastPeekNote >= 115) {
        lastPeekNote = now;
        cupcakeSound(h);
      }
    }
  }
  if (pick) {
    selected = canTarget(state, h) ? h : -1;
    if (selected >= 0 && selected !== previousSelection && vis[selected]) vis[selected].reactAt = now;
  }
  canvas.style.cursor = canTarget(state, h) ? 'pointer' : 'default';
  return entered || selected !== previousSelection;
}
function sweepPreview(e) {
  const down = press;
  if (!down || down.id !== e.pointerId) return;
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12 || cellAt(e) !== down.cell) down.moved = true;
  // Cover cells crossed between sparse touch events, even during a quick swipe.
  const dx = e.clientX - down.lastX, dy = e.clientY - down.lastY;
  const steps = Math.min(100, Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(4, S / 3))));
  let changed = false;
  for (let n = 1; n <= steps; n++) changed = pointPreview({ clientX: down.lastX + dx * n / steps, clientY: down.lastY + dy * n / steps }, true, true) || changed;
  down.lastX = e.clientX; down.lastY = e.clientY;
  if (changed) updateHint();
}
canvas.addEventListener('pointerdown', e => {
  if (e.isPrimary === false || e.button > 0 || press || !boardInputReady()) return;
  const i = cellAt(e);
  press = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, cell: i, confirm: selected === i && canTarget(state, i), moved: false };
  canvas.setPointerCapture(e.pointerId);
  pointPreview(e, true, true);
  // A mouse has already hovered the cell, so pointPreview sees no "entry" and stays silent: the press itself must meow.
  if (i >= 0 && state.cells[i] && vis[i] && !vis[i].gone && now - lastPeekNote >= 115) { lastPeekNote = now; cupcakeSound(i); }
  if (canTarget(state, i) && vis[i] && !vis[i].gone) vis[i].reactAt = now;
  updateHint();
});
function cancelBoardPress(e) {
  if (!press || (e && e.pointerId !== press.id)) return;
  resetBoardPress(); hover = -1; selected = -1;
  updateHint();
}
canvas.addEventListener('pointercancel', cancelBoardPress);
canvas.addEventListener('lostpointercapture', cancelBoardPress);
window.addEventListener('blur', () => cancelBoardPress());
canvas.addEventListener('pointermove', e => {
  if (e.isPrimary === false || !boardInputReady()) return;
  if (press) { sweepPreview(e); return; }
  if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
  if (pointPreview(e)) updateHint();
});
canvas.addEventListener('pointerleave', () => { if (!press) { hover = -1; if (state) updateHint(); } });
canvas.addEventListener('pointerup', e => {
  const down = press;
  if (!down || down.id !== e.pointerId) return;
  if (!boardInputReady()) { cancelBoardPress(e); return; }
  sweepPreview(e);
  resetBoardPress(); cursorShown = false;
  const i = cellAt(e);
  if (e.pointerType !== 'mouse') hover = -1;
  // Releasing a swipe only selects. A separate, stationary tap confirms it.
  if (!down.moved && down.confirm && i === down.cell && canTarget(state, i)) fireAt(i);
  else if (!down.moved && selected >= 0) haptic();
  else if (!down.moved && i >= 0 && state.cells[i]?.wall) toast(t('toast.wall'));
  renderHUD(); updateHint();
});
$('undoBtn').onclick = undo;
$('resetBtn').onclick = restart;
$('hintBtn').onclick = onHint;
$('helpBtn').onclick = () => { $('setSound2').checked = save.sound; openSheet('legendSheet'); };
$('setSound2').onchange = e => { save.sound = e.target.checked; syncSound(); writeSave(save); $('setSound').checked = save.sound; if (save.sound) buttonSound(); };
$('legendClose').onclick = () => closeSheet('legendSheet');
$('introAgain').onclick = () => { closeSheet('legendSheet'); if (!busy && def.intro) showIntro(); };
$('backBtn').onclick = () => { if (busy) return; showScreen(mode === 'daily' ? 'title' : 'map'); };
$('resultClose').onclick = () => { closeSheet('resultSheet'); };
canvas.addEventListener('keydown', e => {
  if (introOpen) return;
  const W = state.W, H = state.H;
  const mv = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
  if (mv) {
    e.preventDefault();
    let r = Math.floor(cursor / W), c = cursor % W;
    for (let k = 0; k < Math.max(W, H); k++) { r = (r + mv[0] + H) % H; c = (c + mv[1] + W) % W; if (state.cells[r * W + c]) break; }
    cursor = r * W + c; cursorShown = true; hover = -1; updateHint();
  } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (cursor >= 0) { cursorShown = true; fireAt(cursor); updateHint(); } }
});
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('button, input') && (e.key === 'Enter' || e.key === ' ')) return;
  const k = e.key.toLowerCase();
  if (introOpen) { if (k === 'enter' || k === 'escape') $('introGo').click(); return; }
  if (screen !== 'play') return;
  if (k === 'escape') { cancelBoardPress(); selected = -1; hover = -1; renderHUD(); updateHint(); }
  else if (k === 'z' || k === 'u') undo();
  else if (k === 'r') restart();
  else if (k === 'n' && result === 'win' && mode === 'stage' && li < LEVELS.length - 1) startStage(li + 1);
});
let resizeRaf = 0;
new ResizeObserver(() => { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(() => state && layout()); }).observe(boardWrap);
window.addEventListener('resize', () => { if (state) layout(); drawBg(); });

// ---------- boot ----------
async function boot(data) {
  save.collection = recoverCollection(save, LEVELS); writeSave(save);
  LANG = LANGS.includes(save.lang) ? save.lang : detectLang();
  applyLang();
  await loadImages();
  installCupcakeRigs();
  if (META.basic) UNIT = META.basic.w;
  buildTints();
  drawBg();
  requestAnimationFrame(t => { now = t; requestAnimationFrame(frame); });
  if (!(data && data.screen === 'play' && startStage(data.level))) showScreen('title');
  try { await document.fonts.ready; if (state) renderHUD(); } catch (e) {}
}
try { window.claude?.hot?.snapshot?.(() => ({ screen, level: li })); } catch (e) {}
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});


