// Level generator + analyzer for Cupcake Zombie v2
const L = require('../src/logic.js');

const key = L.stateKey;

function analyze(def, opts = {}) {
  const s0 = L.parseLevel(def);
  const memo = new Map();
  function best(s) { // min extra spores to win from s within the level's own budget (Infinity if impossible)
    const k = key(s);
    if (memo.has(k)) return memo.get(k);
    let b = Infinity;
    for (let i = 0; i < s.cells.length && b > 1; i++) {
      if (!L.canTarget(s, i)) continue;
      const { state, res } = L.playTurn(s, i);
      if (res === 'win') b = 1;
      else if (res === 'play') b = Math.min(b, 1 + best(state));
    }
    memo.set(k, b);
    return b;
  }
  const winsFrom = s => best(s) <= s.spores;

  const firstWin = [];
  let total = 0, maxWaves = 0, minSurvivorsWrong = Infinity;
  for (let i = 0; i < s0.cells.length; i++) {
    if (!L.canTarget(s0, i)) continue;
    total++;
    const { state, res, waves } = L.playTurn(s0, i);
    const ok = res === 'win' || (res === 'play' && winsFrom(state));
    if (ok) { firstWin.push(i); maxWaves = Math.max(maxWaves, waves.length); }
    else if (def.spores === 1) minSurvivorsWrong = Math.min(minSurvivorsWrong, L.freshCount(state));
  }

  // optimistic greedy: always pick a move that leaves the fewest fresh cupcakes (any tie may be chosen)
  const gmemo = new Map();
  function greedy(s) {
    const k = key(s);
    if (gmemo.has(k)) return gmemo.get(k);
    let bestFresh = Infinity, cands = [];
    for (let i = 0; i < s.cells.length; i++) {
      if (!L.canTarget(s, i)) continue;
      const r = L.playTurn(s, i);
      const f = r.res === 'lost' ? Infinity : L.freshCount(r.state);
      if (f < bestFresh) { bestFresh = f; cands = [r]; } else if (f === bestFresh) cands.push(r);
    }
    const ok = cands.some(r => r.res === 'win' || (r.res === 'play' && greedy(r.state)));
    gmemo.set(k, ok);
    return ok;
  }
  const greedyWins = greedy(s0);

  // winning sequences (to check e.g. that a wrapped cupcake must be shot directly)
  let seqs = [];
  if (opts.sequences) {
    (function walk(s, seq) {
      if (seqs.length > 400) return;
      for (let i = 0; i < s.cells.length; i++) {
        if (!L.canTarget(s, i)) continue;
        const r = L.playTurn(s, i);
        if (r.res === 'win') seqs.push(seq.concat(i));
        else if (r.res === 'play' && winsFrom(r.state)) walk(r.state, seq.concat(i));
      }
    })(s0, []);
  }
  const fewer = def.spores > 1 ? solvableWith(def, def.spores - 1) : false;
  return { firstWin, first: firstWin.length, total, maxWaves, greedyWins, minSurvivorsWrong, fewer, seqs, cupcakes: s0.cells.filter(Boolean).length };
}

// Difficulty curve of a board: bits = -log2(chance that uniformly random legal play wins); traps = wrong openings that
// spoil at least as much as the best right opening. Costly (full tree), so fits() only calls it after every cheaper check.
function curve(def) {
  const root = L.parseLevel(def), memo = new Map();
  function value(s) {
    const k = key(s) + '|' + s.spores;
    if (memo.has(k)) return memo.get(k);
    let p = 0, wins = 0, n = 0;
    for (let i = 0; i < s.cells.length; i++) {
      if (!L.canTarget(s, i)) continue;
      n++;
      const t = L.playTurn(s, i);
      if (t.res === 'win') { p += 1; wins += 1; }
      else if (t.res === 'play') { const v = value(t.state); p += v.p; wins += v.wins; }
    }
    const v = { p: n ? p / n : 0, wins }; memo.set(k, v); return v;
  }
  const fresh0 = L.freshCount(root), firsts = [];
  for (let i = 0; i < root.cells.length; i++) {
    if (!L.canTarget(root, i)) continue;
    const t = L.playTurn(root, i);
    firsts.push({ spoil: fresh0 - L.freshCount(t.state), win: t.res === 'win' || (t.res === 'play' && value(t.state).wins > 0) });
  }
  const v = value(root), winning = firsts.filter(f => f.win), dead = firsts.filter(f => !f.win);
  const bestWinSpoil = winning.length ? Math.max(...winning.map(f => f.spoil)) : 0;
  return { bits: v.p > 0 ? -Math.log2(v.p) : Infinity, traps: dead.filter(f => f.spoil >= bestWinSpoil).length };
}

function solvableWith(def, k) {
  const s0 = L.parseLevel({ ...def, spores: k });
  const memo = new Map();
  function win(s) {
    const kk = key(s);
    if (memo.has(kk)) return memo.get(kk);
    let ok = false;
    for (let i = 0; i < s.cells.length && !ok; i++) {
      if (!L.canTarget(s, i)) continue;
      const r = L.playTurn(s, i);
      if (r.res === 'win' || (r.res === 'play' && win(r.state))) ok = true;
    }
    memo.set(kk, ok);
    return ok;
  }
  return win(s0);
}

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function generate(spec, seed) {
  const R = rng(seed);
  const { W, H, density, weights, wraps = 0, deflectors = 0, symmetric = false } = spec;
  const pick = () => { const tot = Object.values(weights).reduce((a, b) => a + b, 0); let x = R() * tot; for (const [k, v] of Object.entries(weights)) { if ((x -= v) < 0) return k; } return 'o'; };
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (symmetric && c >= Math.ceil(W / 2)) { if (g[r][W - 1 - c] !== '.') g[r][c] = pick(); continue; }
    if (R() < density) g[r][c] = pick();
  }
  for (const [t, n] of Object.entries(spec.require || {})) {
    let have = g.flat().filter(ch => ch === t).length, guard = 0;
    while (have < n && guard++ < 300) { const r = Math.floor(R() * H), c = Math.floor(R() * W); if (g[r][c] !== '.' && g[r][c] !== t) { g[r][c] = t; have++; } }
  }
  let w = 0, guard = 0;
  while (w < wraps && guard++ < 300) { const r = Math.floor(R() * H), c = Math.floor(R() * W); if (/[oxsmc]/.test(g[r][c])) { g[r][c] = g[r][c].toUpperCase(); w++; } }
  let d = 0; guard = 0;
  while (d < deflectors && guard++ < 300) { const r = Math.floor(R() * H), c = Math.floor(R() * W); if (g[r][c] === '.') { g[r][c] = R() < 0.5 ? '/' : '\\'; d++; } }
  const customers = [];
  for (const turn of (spec.customerTurns || [])) {
    let guard2 = 0;
    while (guard2++ < 300) { const r = Math.floor(R() * H), c = Math.floor(R() * W); if (/[a-mo-zA-MO-Z]/.test(g[r][c]) && !customers.some(k => k.r === r && k.c === c)) { customers.push({ r, c, turn }); break; } }
  }
  const cake = (r, c) => r >= 0 && r < H && c >= 0 && c < W && /[a-mo-zA-MO-Z]/.test(g[r][c]);
  const used = (r, c) => customers.some(k => (k.cells || [[k.r, k.c]]).some(([kr, kc]) => kr === r && kc === c));
  // kid: two cupcakes side by side, both must be spoiled
  for (const turn of (spec.kids || [])) {
    let guard2 = 0;
    while (guard2++ < 400) {
      const r = Math.floor(R() * H), c = Math.floor(R() * W), [dr, dc] = L.DIRS4[Math.floor(R() * 4)];
      if (cake(r, c) && cake(r + dr, c + dc) && !used(r, c) && !used(r + dr, c + dc)) { customers.push({ r, c, turn, kind: 'kid', cells: [[r, c], [r + dr, c + dc]] }); break; }
    }
  }
  // delivery order: a whole row (or column) of cupcakes, at least three of them
  for (const turn of (spec.orders || [])) {
    let guard2 = 0;
    while (guard2++ < 400) {
      const vertical = R() < 0.35, line = vertical ? Math.floor(R() * W) : Math.floor(R() * H);
      const cells = [];
      for (let k = 0; k < (vertical ? H : W); k++) { const r = vertical ? k : line, c = vertical ? line : k; if (cake(r, c) && !used(r, c)) cells.push([r, c]); }
      const any = (vertical ? Array.from({ length: H }, (_, k) => [k, line]) : Array.from({ length: W }, (_, k) => [line, k])).some(([r, c]) => used(r, c));
      if (cells.length >= 3 && cells.length <= 5 && !any) { customers.push({ r: cells[0][0], c: cells[0][1], turn, kind: 'order', cells, vertical }); break; }
    }
  }
  // picky: a cupcake with at least one cupcake neighbour (otherwise the rule never matters)
  for (const turn of (spec.pickies || [])) {
    let guard2 = 0;
    while (guard2++ < 400) {
      const r = Math.floor(R() * H), c = Math.floor(R() * W);
      if (cake(r, c) && !used(r, c) && L.DIRS4.some(([dr, dc]) => cake(r + dr, c + dc))) { customers.push({ r, c, turn, kind: 'picky' }); break; }
    }
  }
  // trim fully empty outer rows/cols
  let grid = g.map(row => row.join(''));
  const shift = (dr, dc) => customers.forEach(k => { k.r += dr; k.c += dc; if (k.cells) k.cells = k.cells.map(([r, c]) => [r + dr, c + dc]); });
  while (grid.length && /^[.]+$/.test(grid[0])) { grid.shift(); shift(-1, 0); }
  while (grid.length && /^[.]+$/.test(grid[grid.length - 1])) grid.pop();
  while (grid[0] && grid.every(r => r[0] === '.')) { grid = grid.map(r => r.slice(1)); shift(0, -1); }
  while (grid[0] && grid.every(r => r[r.length - 1] === '.')) grid = grid.map(r => r.slice(0, -1));
  return { spores: spec.spores, grid, customers };
}

// does the featured mechanic actually matter?
function featureMatters(spec, def, a) {
  const f = spec.feature;
  if (!f) return true;
  const solvable = d => solvableWith(d, d.spores);
  if (f === 'l') {
    // lemons must change the answer: as plain muffins the winning first moves differ
    const d2 = { ...def, grid: def.grid.map(r => r.replace(/l/g, 'o').replace(/L/g, 'O')) };
    const b = analyze(d2);
    return b.first !== a.first;
  }
  if ('xscmgleur'.includes(f)) {
    const d2 = { ...def, grid: def.grid.map(r => r.replace(new RegExp(f, 'g'), 'o').replace(new RegExp(f.toUpperCase(), 'g'), 'O')) };
    return !solvable(d2);
  }
  if (f === 'n') {
    // the walls must matter: with them gone (empty wells), the board plays differently
    const d2 = { ...def, grid: def.grid.map(r => r.replace(/n/g, '.')) };
    const b = analyze(d2);
    return b.first !== a.first || b.fewer;
  }
  if (f === 'b') {
    const d2 = { ...def, grid: def.grid.map(r => r.replace(/b/g, 'o')) };
    const b = analyze(d2);
    return b.fewer || b.first > a.first;
  }
  if (f === 'wrap') {
    // every winning line must tear at least one wrap by shooting it directly
    const s0 = L.parseLevel(def);
    return a.seqs.length > 0 && a.seqs.every(seq => seq.some(i => s0.cells[i] && s0.cells[i].wrap));
  }
  if (f === 'cust' || f === 'kid' || f === 'order') {
    // the customers must change the answer
    const b = analyze({ ...def, customers: [] });
    return b.first > a.first;
  }
  if (f === 'picky') {
    // the leniency must be used: as an ordinary customer the stage gets harder (fewer openings) or unsolvable,
    // and the customer must still matter at all
    const plain = analyze({ ...def, customers: def.customers.map(k => k.kind === 'picky' ? { r: k.r, c: k.c, turn: k.turn } : k) });
    const none = analyze({ ...def, customers: [] });
    return plain.first < a.first && none.first > a.first;
  }
  if (f === 'defl') {
    const d2 = { ...def, grid: def.grid.map(r => r.replace(/[\/\\]/g, '.')) };
    return !solvable(d2);
  }
  return true;
}

function fits(spec, def, a) {
  const counts = {};
  for (const t of def.grid.join('').toLowerCase()) counts[t] = (counts[t] || 0) + 1;
  if (Object.entries(spec.require || {}).some(([t, n]) => (counts[t] || 0) < n)) return false;
  if (a.cupcakes < (spec.minCells || 8) || a.cupcakes > (spec.maxCells || 99)) return false;
  if (a.first < 1 || a.first > (spec.maxFirst || 99) || a.first < (spec.minFirst || 1)) return false;
  if (a.fewer) return false;
  if (spec.spores === 1 && a.minSurvivorsWrong < (spec.minSurvivors || 1)) return false;
  if (spec.greedy === true && !a.greedyWins) return false;
  if (spec.greedy === false && a.greedyWins) return false;
  if (a.maxWaves < (spec.minWaves || 0)) return false;
  if (!featureMatters(spec, def, a)) return false;
  if (spec.minBits != null || spec.maxBits != null || spec.minTraps) {
    const c = curve(def);
    if (spec.minBits != null && c.bits < spec.minBits) return false;
    if (spec.maxBits != null && c.bits > spec.maxBits) return false;
    if (spec.minTraps && c.traps < spec.minTraps) return false;
    a.bits = c.bits; a.traps = c.traps;
  }
  return true;
}

function search(spec, tries, keep = 5) {
  const found = [];
  for (let k = 1; k <= tries; k++) {
    const seed = k * 7919 + (spec.salt || 0) * 104729;
    const def = generate(spec, seed);
    if (!def.grid.length) continue;
    const a = analyze(def, { sequences: spec.feature === 'wrap' });
    if (!fits(spec, def, a)) continue;
    found.push({ def, a, seed });
    if (found.length >= keep * 3) break;
  }
  const mid = spec.minBits != null && spec.maxBits != null ? (spec.minBits + spec.maxBits) / 2 : null;
  found.sort((p, q) => (mid != null ? Math.abs(p.a.bits - mid) - Math.abs(q.a.bits - mid) : 0) || (q.a.maxWaves - p.a.maxWaves) || (p.a.first - q.a.first));
  return found.slice(0, keep);
}

module.exports = { analyze, generate, search, fits, curve };

if (require.main === module) {
  const specs = require('./specs.js');
  const ids = process.argv[2].split(',');
  for (const id of ids) {
    const spec = specs.find(s => s.id === id);
    const t0 = Date.now();
    const res = search(spec, spec.tries || 2500);
    const lines = [`=== ${id} ${spec.name} (found ${res.length}, ${((Date.now() - t0) / 1000).toFixed(0)}s)`];
    for (const f of res) {
      lines.push(`seed=${f.seed} first=${f.a.first}/${f.a.total} waves=${f.a.maxWaves} greedy=${f.a.greedyWins} surv=${f.a.minSurvivorsWrong} n=${f.a.cupcakes} cust=${JSON.stringify(f.def.customers)}`);
      lines.push(JSON.stringify(f.def.grid));
      lines.push(f.def.grid.map(r => '   ' + r).join('\n'));
    }
    console.log(lines.join('\n'));
  }
}

