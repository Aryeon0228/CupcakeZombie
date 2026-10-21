// ---- Cupcake Zombie: pure game logic (shared by the page, the solver and the level generator) ----
const TYPES = {
  o: { key: 'basic',        name: '초코 머핀',   name_en: 'Choco Muffin',       pattern: 'plus',  style: 'hop'   },
  x: { key: 'berry',        name: '딸기 컵케익', name_en: 'Strawberry Cupcake', pattern: 'diag',  style: 'zip'   },
  s: { key: 'sprinkle',     name: '스프링클',    name_en: 'Sprinkles',          pattern: 'all8',  style: 'burst' },
  c: { key: 'cherry',       name: '체리',        name_en: 'Cherry',             pattern: 'lines', style: 'roll'  },
  m: { key: 'cream',        name: '휘핑크림',    name_en: 'Whipped Cream',      pattern: 'plus2', style: 'lob'   },
  b: { key: 'butter',       name: '버터',        name_en: 'Butter',             pattern: 'plus',  style: 'hop', lid: 1 },
  g: { key: 'earl_grey',    name: '얼그레이',    name_en: 'Earl Grey',          pattern: 'scent', style: 'waft'  },
  l: { key: 'lemon_yogurt', name: '레몬요거트',  name_en: 'Lemon Yogurt',       pattern: 'plus',  style: 'hop', delay: 1 },
  e: { key: 'espresso',     name: '에스프레소',  name_en: 'Espresso',           pattern: 'plus',  style: 'hop', strong: 1 },
  n: { key: 'mint_choco',   name: '민트초코',    name_en: 'Mint Choco',         pattern: 'none',  wall: 1 },
  u: { key: 'blueberry',    name: '블루베리',    name_en: 'Blueberry',          pattern: 'diag2', style: 'hop' },
  r: { key: 'cinnamon_roll',name: '시나몬롤',    name_en: 'Cinnamon Roll',      pattern: 'ring2', style: 'burst' },
};
const DIRS4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG4 = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const DEFLECT = {
  '/':  ([dr, dc]) => [-dc, -dr],
  '\\': ([dr, dc]) => [dc, dr],
};

// grid chars: '.' empty well, lowercase = cupcake, UPPERCASE = cupcake in plastic wrap,
// '/' and '\' = spatula that turns rolling cherries 90 degrees
function parseLevel(def) {
  const rows = def.grid;
  const H = rows.length, W = rows[0].length;
  const cells = [], tiles = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const ch = rows[r][c];
    if (ch === '/' || ch === '\\') { cells.push(null); tiles.push(ch); continue; }
    tiles.push(null);
    if (ch === '.' || ch === ' ') { cells.push(null); continue; }
    const t = ch.toLowerCase();
    if (!TYPES[t]) throw new Error('bad cell ' + ch);
    cells.push({ t, wrap: ch !== t && !TYPES[t].wall, lid: TYPES[t].lid || 0, inf: false, pend: false, wall: !!TYPES[t].wall });
  }
  return { W, H, cells, tiles, customers: (def.customers || []).map(k => ({ ...k })), spores: def.spores, turn: 0 };
}

function cloneState(s) {
  return { W: s.W, H: s.H, cells: s.cells.map(c => c && { ...c }), tiles: s.tiles, customers: s.customers.map(k => ({ ...k })), spores: s.spores, turn: s.turn };
}

const isWall = (s, i) => !!(s.cells[i] && s.cells[i].wall);

// Where a cupcake's spores go once it goes bad.
// Returns [{ to, path, style, dist }] — path lists every cell passed through, ending at `to`.
// Misses (into empty wells, off the board, or into a mint-choco wall) come back with to: -1 when includeMisses is set.
function spreadsOf(s, idx, includeMisses) {
  const { W, H, cells, tiles } = s;
  const r = Math.floor(idx / W), c = idx % W;
  const t = TYPES[cells[idx].t];
  const out = [];
  const inside = (rr, cc) => rr >= 0 && rr < H && cc >= 0 && cc < W;
  const add = (rr, cc, dist = 1) => {
    if (!inside(rr, cc)) return false;
    const i = rr * W + cc;
    if (cells[i] && !cells[i].wall) { out.push({ to: i, path: [i], style: t.style, dist }); return true; }
    if (includeMisses) out.push({ to: -1, path: [i], style: t.style, dist, miss: true, wall: !!(cells[i] && cells[i].wall) });
    return !(cells[i] && cells[i].wall);
  };
  if (t.pattern === 'plus') DIRS4.forEach(([dr, dc]) => add(r + dr, c + dc));
  else if (t.pattern === 'diag') DIAG4.forEach(([dr, dc]) => add(r + dr, c + dc));
  else if (t.pattern === 'all8') DIRS4.concat(DIAG4).forEach(([dr, dc]) => add(r + dr, c + dc));
  else if (t.pattern === 'plus2') DIRS4.forEach(([dr, dc]) => {
    // a mint-choco wall stops the cream from jumping over it
    if (inside(r + dr, c + dc) && isWall(s, (r + dr) * W + c + dc)) { add(r + dr, c + dc, 1); return; }
    add(r + dr, c + dc, 1); add(r + 2 * dr, c + 2 * dc, 2);
  });
  else if (t.pattern === 'diag2') DIAG4.forEach(([dr, dc]) => {
    if (inside(r + dr, c + dc) && isWall(s, (r + dr) * W + c + dc)) { add(r + dr, c + dc); return; }
    add(r + dr, c + dc); add(r + 2 * dr, c + 2 * dc, 2);
  });
  else if (t.pattern === 'ring2') DIRS4.concat(DIAG4).forEach(([dr, dc]) => {
    // The eight rays skip the adjacent cell, but a mint wall blocks that ray.
    if (inside(r + dr, c + dc) && isWall(s, (r + dr) * W + c + dc)) { if (includeMisses) add(r + dr, c + dc); return; }
    add(r + 2 * dr, c + 2 * dc, 2);
  });
  else if (t.pattern === 'lines') DIRS4.forEach(d0 => {
    let d = d0, rr = r, cc = c;
    const path = [];
    for (let guard = 0; guard < W * H * 4; guard++) {
      rr += d[0]; cc += d[1];
      if (!inside(rr, cc)) { if (includeMisses && path.length) out.push({ to: -1, path: path.slice(), style: 'roll', exit: [rr, cc], miss: true }); return; }
      const i = rr * W + cc;
      if (cells[i] && cells[i].wall) { if (includeMisses) out.push({ to: -1, path: path.concat(i), style: 'roll', miss: true, wall: true }); return; }
      path.push(i);
      if (cells[i]) { out.push({ to: i, path: path.slice(), style: 'roll' }); return; }
      if (tiles[i]) d = DEFLECT[tiles[i]](d);
    }
  });
  else if (t.pattern === 'scent') {
    // earl grey: the scent reaches every other earl grey on the shelf, however far
    for (let i = 0; i < cells.length; i++) if (i !== idx && cells[i] && cells[i].t === cells[idx].t) {
      const d = Math.abs(Math.floor(i / W) - r) + Math.abs((i % W) - c);
      out.push({ to: i, path: [i], style: 'waft', dist: d });
    }
  }
  return out;
}
function targetsOf(s, idx) { return spreadsOf(s, idx).map(x => x.to); }

// pattern offsets for the small legend diagrams
function patternOffsets(p) {
  if (p === 'plus') return DIRS4;
  if (p === 'diag') return DIAG4;
  if (p === 'all8') return DIRS4.concat(DIAG4);
  if (p === 'plus2') return DIRS4.concat(DIRS4.map(([a, b]) => [2 * a, 2 * b]));
  if (p === 'diag2') return DIAG4.concat(DIAG4.map(([a, b]) => [2 * a, 2 * b]));
  if (p === 'ring2') return DIRS4.concat(DIAG4).map(([a, b]) => [2 * a, 2 * b]);
  if (p === 'lines' || p === 'scent' || p === 'none') return p;
  return [];
}

function canTarget(s, idx) {
  const cell = s.cells[idx];
  return !!cell && !cell.inf && !cell.wall;
}

// One hit on one cell. Mutates the cell and says what happened.
// hit: { idx, direct (the player's own spore), strong (from espresso), release (a chilled lemon finally going bad) }
// kind: 'none' | 'infect' | 'lid' | 'sealed' (wrapped: spoiled but cannot spread) | 'pending' (lemon: spoils next turn)
// The final spoiled set never depends on the order hits arrive in, so the page can play them on its own clock.
function hitCell(s, hit) {
  const cell = s.cells[hit.idx];
  if (!cell || cell.wall) return { kind: 'none' };
  if (cell.inf) {
    // espresso tears open a wrap that already went bad inside, and it starts spreading
    if (cell.wrap && hit.strong) { cell.wrap = false; return { kind: 'infect', torn: true, late: true, spread: true }; }
    return { kind: 'none' };
  }
  const T = TYPES[cell.t];
  if (T.delay && !hit.release) {
    if (cell.pend) return { kind: 'none' };
    cell.pend = true; return { kind: 'pending' };
  }
  let torn = false;
  if (cell.wrap) {
    if (!hit.direct && !hit.strong) { cell.inf = true; return { kind: 'sealed' }; }
    cell.wrap = false; torn = true;
  }
  let lidPop = false;
  if (cell.lid > 0) {
    if (hit.strong) { cell.lid = 0; lidPop = true; }
    else { cell.lid--; return { kind: 'lid', torn }; }
  }
  cell.pend = false;
  cell.inf = true;
  return { kind: 'infect', torn, lidPop, spread: true };
}

// Breadth-first cascade from a set of starting hits.
function cascade(s, seeds) {
  const waves = [];
  let frontier = seeds.map(h => ({ from: -1, ...h }));
  while (frontier.length) {
    const wave = [], next = [];
    for (const hit of frontier) {
      const r = hitCell(s, hit);
      if (r.kind === 'none') continue;
      wave.push({ ...hit, ...r });
      if (r.spread) {
        const strong = !!TYPES[s.cells[hit.idx].t].strong;
        for (const sp of spreadsOf(s, hit.idx)) next.push({ idx: sp.to, from: hit.idx, direct: false, strong });
      }
    }
    if (wave.length) waves.push(wave);
    frontier = next;
  }
  return waves;
}

// Fire a spore at idx.
function fire(s0, idx) {
  const s = cloneState(s0);
  const waves = cascade(s, [{ idx, direct: true }]);
  s.spores -= 1;
  s.turn += 1;
  return { state: s, waves };
}

// Chilled lemons go bad and spread (end of the turn, after customers).
function hasPending(s) { return s.cells.some(c => c && c.pend); }
function releasePending(s) {
  const seeds = [];
  s.cells.forEach((c, i) => { if (c && c.pend) seeds.push({ idx: i, direct: false, release: true }); });
  return cascade(s, seeds);
}

function freshCount(s) { return s.cells.filter(c => c && !c.inf && !c.wall).length; }

// Every cell a customer reaches for: one cupcake, or several for a kid (two side by side) and a delivery order (a whole line).
function customerCells(s, k) { return (k.cells || [[k.r, k.c]]).map(([r, c]) => r * s.W + c); }
// After a turn: customers due this turn take their cupcake (a chilled lemon still counts as fresh).
// kinds: undefined = buys the cupcake if it is fresh; 'kid' / 'order' = buys all of their cells, lost if any is fresh;
// 'picky' = buys only when the cupcake AND every neighbouring cupcake are fresh — one spoiled neighbour and they walk away (refused).
function customerCheck(s) {
  const due = s.customers.filter(k => k.turn === s.turn && !k.done);
  const result = [];
  for (const k of due) {
    k.done = true;
    const idxs = customerCells(s, k);
    const freshIdx = idxs.filter(i => s.cells[i] && !s.cells[i].inf);
    if (k.kind === 'picky') {
      const i = idxs[0], r = Math.floor(i / s.W), c = i % s.W;
      const nearSpoiled = DIRS4.some(([dr, dc]) => { const rr = r + dr, cc = c + dc; if (rr < 0 || rr >= s.H || cc < 0 || cc >= s.W) return false; const n = s.cells[rr * s.W + cc]; return !!(n && n.inf); });
      const fresh = freshIdx.length > 0;
      result.push({ k, fresh: fresh && !nearSpoiled, refused: fresh && nearSpoiled, taken: fresh && !nearSpoiled ? [i] : [] });
    } else result.push({ k, fresh: freshIdx.length > 0, taken: freshIdx });
  }
  return result;
}

// One full turn as the rules see it: fire → customers → chilled lemons spoil → verdict.
// When the spores run out, remaining chilled lemons keep spoiling until nothing is chilled.
function playTurn(s, idx) {
  const { state, waves } = fire(s, idx);
  const ticks = [];
  if (freshCount(state) === 0) return { state, waves, ticks, cust: [], res: 'win' };
  const cust = customerCheck(state);
  if (cust.some(c => c.fresh)) return { state, waves, ticks, cust, res: 'lost' };
  if (hasPending(state)) ticks.push(releasePending(state));
  if (freshCount(state) === 0) return { state, waves, ticks, cust, res: 'win' };
  if (state.spores <= 0) {
    while (hasPending(state) && ticks.length < 50) ticks.push(releasePending(state));
    if (freshCount(state) === 0) return { state, waves, ticks, cust, res: 'win' };
    return { state, waves, ticks, cust, res: 'out' };
  }
  return { state, waves, ticks, cust, res: 'play' };
}

// state key for solvers
function stateKey(s) { return s.turn + '|' + s.cells.map(c => c ? (c.inf ? (c.wrap ? 'S' : 'I') : (c.pend ? 'P' : '') + (c.wrap ? 'W' : '') + c.lid) : '_').join(','); }

if (typeof module !== 'undefined') module.exports = { TYPES, DIRS4, DIAG4, parseLevel, cloneState, spreadsOf, targetsOf, hitCell, cascade, fire, releasePending, hasPending, playTurn, freshCount, customerCheck, customerCells, canTarget, patternOffsets, stateKey };

