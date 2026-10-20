// Collection is cosmetic: it never changes the puzzle rules or star rewards.
const CARD_ORDER = ['o', 'x', 's', 'c', 'm', 'b', 'g', 'l', 'e', 'n', 'u', 'r'];
function tastesInLevel(level) {
  const chars = (level?.grid || []).join('').toLowerCase();
  return CARD_ORDER.filter(k => chars.includes(k));
}
function addCollectionClear(book, level, stars) {
  if (!(Number(stars) > 0)) return [];
  const rating = Math.min(3, Math.max(1, Math.floor(Number(stars))));
  const rewards = [];
  for (const k of tastesInLevel(level)) {
    const before = Number(book[k]) || 0;
    if (rating > before) { book[k] = rating; rewards.push({ type: k, before, stars: rating }); }
  }
  return rewards;
}
function recoverCollection(progress, levels) {
  const book = {};
  for (const k of CARD_ORDER) {
    const n = Number(progress.collection?.[k]);
    if (Number.isFinite(n) && n > 0) book[k] = Math.min(3, Math.max(1, Math.floor(n)));
  }
  for (const [id, stars] of Object.entries(progress.stars || {})) {
    const i = Number(id);
    if (Number.isInteger(i) && levels[i]) addCollectionClear(book, levels[i], stars);
  }
  return book;
}

let collectionReturn = 'title', cardType = null, cardFlipped = false, cardGesture = null, cardClickCancelled = false;
let lastCardRewards = [];
function cardFinish(stars) { return ['paper', 'paper', 'gold', 'aurora'][stars] || 'paper'; }
function cardCount() { return CARD_ORDER.filter(k => save.collection[k] > 0).length; }
function openCollection(from = screen) {
  collectionReturn = from === 'collection' ? collectionReturn : from;
  closeSheet('resultSheet'); closeSheet('legendSheet');
  showScreen('collection');
}
function renderCollection() {
  const count = cardCount();
  $('collectionCount').textContent = t('collection.count', { n: count, total: CARD_ORDER.length });
  $('collectionProgress').value = count; $('collectionProgress').max = CARD_ORDER.length;
  const grid = $('collectionGrid'); grid.innerHTML = '';
  for (const k of CARD_ORDER) {
    const rating = save.collection[k] || 0, ty = TYPES[k];
    const b = document.createElement('button');
    b.className = 'collection-tile ' + (rating ? cardFinish(rating) : 'uncollected');
    b.dataset.type = k;
    b.setAttribute('aria-label', rating ? `${tl(ty, 'name')} · ${t('collection.finish' + rating)} · ${rating}★` : t('collection.lockedLabel', { name: tl(ty, 'name') }));
    b.innerHTML = `<span class="card-number">NO. ${String(CARD_ORDER.indexOf(k) + 1).padStart(2, '0')}</span><span class="mini-art"><img src="${ASSETS[ty.key]}" alt="">${rating ? '' : '<span class="card-question">?</span>'}</span><span class="mini-name">${rating ? tl(ty, 'name') : '???'}</span><span class="mini-stars">${rating ? '★'.repeat(rating) : t('collection.uncollected')}</span>`;
    b.onclick = () => {
      if (!rating) { const first = LEVELS.findIndex(l => tastesInLevel(l).includes(k)); toast(t('collection.unlock', { n: first + 1, name: tl(ty, 'name') })); return; }
      showCupcakeCard(k);
    };
    grid.appendChild(b);
  }
}
function showCupcakeCard(k) {
  if (!save.collection[k]) return;
  cardType = k; cardFlipped = false; cardGesture = null; cardClickCancelled = false;
  const rating = save.collection[k], ty = TYPES[k], mint = k === 'n';
  const zombie = ASSETS['zombie_' + ty.key] || ASSETS.zombieB;
  const card = $('cupcakeCard');
  card.className = 'collector-card ' + cardFinish(rating);
  card.style.setProperty('--flavor', `rgb(${mint ? '137,207,185' : TYPE_TINT[ty.key] || '210,180,150'})`);
  const face = (back) => `<span class="card-face ${back ? 'card-back' : 'card-front'}"><span class="card-topline"><span>${t('collection.finish' + rating)}</span><span>NO. ${String(CARD_ORDER.indexOf(k) + 1).padStart(2, '0')}</span></span><span class="card-picture"><span class="card-state">${t(back ? (mint ? 'collection.mint' : 'collection.zombie') : 'collection.fresh')}</span><img src="${back && !mint ? zombie : ASSETS[ty.key]}" alt=""><span class="card-glint">✦</span></span><span class="card-name">${tl(ty, 'name')}</span><span class="card-rule">${t('rule.' + ty.key)}</span><span class="card-stats"><span><small>${t('collection.spread')}</small>${patternSVG(ty.key)}</span><span><small>${t('collection.best')}</small><strong>${'★'.repeat(rating)}</strong></span><span><small>${t('collection.state')}</small><strong class="state-word">${t(back ? (mint ? 'collection.mint' : 'collection.zombie') : 'collection.fresh')}</strong></span></span></span>`;
  $('cardRotator').innerHTML = face(false) + face(true);
  resetCardTilt(); updateCardFace(); openSheet('cardSheet'); card.focus({ preventScroll: true });
}
function updateCardFace() {
  $('cupcakeCard').classList.toggle('flipped', cardFlipped);
  $('cupcakeCard').setAttribute('aria-pressed', String(cardFlipped));
  const label = t(cardFlipped ? (cardType === 'n' ? 'collection.mint' : 'collection.zombie') : 'collection.fresh');
  $('cupcakeCard').setAttribute('aria-label', `${typeName(cardType)} · ${label}. ${t('collection.flip')}`);
  $('cardFrontLabel').textContent = `${typeName(cardType)} · ${label}`;
  $('cardRotator').querySelector('.card-front').setAttribute('aria-hidden', String(cardFlipped));
  $('cardRotator').querySelector('.card-back').setAttribute('aria-hidden', String(!cardFlipped));
}
function resetCardTilt() {
  const c = $('cardTilt'); c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); c.style.setProperty('--shine', '50%');
}
function tiltCard(e) {
  if (reduceMotion) return;
  const r = $('cardStage').getBoundingClientRect();
  const x = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1));
  const y = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1));
  $('cardTilt').style.setProperty('--rx', `${-y * 6}deg`); $('cardTilt').style.setProperty('--ry', `${x * 7}deg`);
  $('cardTilt').style.setProperty('--shine', `${50 + x * 35}%`);
}
$('cupcakeCard').addEventListener('pointerdown', e => {
  if (e.isPrimary === false || e.button > 0) return;
  cardGesture = { id: e.pointerId, x: e.clientX, y: e.clientY }; cardClickCancelled = false; tiltCard(e);
});
$('cupcakeCard').addEventListener('pointermove', e => {
  if (e.isPrimary === false) return;
  if (cardGesture && cardGesture.id === e.pointerId && Math.hypot(e.clientX - cardGesture.x, e.clientY - cardGesture.y) > 12) cardClickCancelled = true;
  tiltCard(e);
});
$('cupcakeCard').addEventListener('pointerup', e => { cardGesture = null; if (e.pointerType !== 'mouse') resetCardTilt(); });
$('cupcakeCard').addEventListener('pointercancel', () => { cardGesture = null; cardClickCancelled = true; resetCardTilt(); });
$('cupcakeCard').addEventListener('pointerleave', resetCardTilt);
$('cupcakeCard').onclick = e => {
  if (e.detail !== 0 && cardClickCancelled) { cardClickCancelled = false; return; }
  cardFlipped = !cardFlipped; updateCardFace(); tone(cardFlipped ? 420 : 660, .08, 'sine', .022, .8);
};
$('collectionBtn').onclick = () => openCollection('title');
$('mapCollectionBtn').onclick = () => openCollection('map');
$('collectionBack').onclick = () => { closeSheet('cardSheet'); showScreen(collectionReturn); if (collectionReturn === 'play' && result) showResult(result, currentStars()); };
$('cardClose').onclick = () => { closeSheet('cardSheet'); resetCardTilt(); document.querySelector(`.collection-tile[data-type="${cardType}"]`)?.focus({ preventScroll: true }); };
document.addEventListener('keydown', e => {
  if (e.key === 'Tab' && !$('cardSheet').hidden) {
    e.preventDefault(); ($('cupcakeCard') === document.activeElement ? $('cardClose') : $('cupcakeCard')).focus(); return;
  }
  if (e.key !== 'Escape') return;
  if (!$('cardSheet').hidden) { e.stopImmediatePropagation(); $('cardClose').click(); }
  else if (screen === 'collection') { e.stopImmediatePropagation(); $('collectionBack').click(); }
});
function renderCardRewards() {
  const box = $('cardRewards'); box.innerHTML = ''; box.hidden = !lastCardRewards.length;
  if (box.hidden) return;
  const title = document.createElement('p'); title.textContent = t('collection.reward'); box.appendChild(title);
  const row = document.createElement('div'); row.className = 'reward-cards';
  for (const reward of lastCardRewards) {
    const b = document.createElement('button'), ty = TYPES[reward.type]; b.className = 'btn reward-card';
    b.innerHTML = `<img src="${ASSETS[ty.key]}" alt=""><span>${tl(ty, 'name')}<small>${reward.before ? t('collection.upgrade') : 'NEW!'} · ${t('collection.finish' + reward.stars)}</small></span>`;
    b.onclick = () => { openCollection('play'); showCupcakeCard(reward.type); }; row.appendChild(b);
  }
  box.appendChild(row);
}
