// Difficulty metrics for every stage, from a full search of the move tree.
// node tools/difficulty.js  ->  tools/genout/difficulty.json (plotted by tools/difficulty_plot.py)
const L = require('../src/logic.js');
const { LEVELS } = require('../src/levels.js');
const planA = require('./plan.js'), planB = require('./plan-extra.js');
const CHAPTERS = [...planA.CH, ...planB.CH].map(c => c.name);

function analyze(def) {
  const root = L.parseLevel(def);
  const memo = new Map();
  // value(state) = { p: win chance of uniformly random legal play, wins: winning sequences, min: fewest spores to win }
  function value(s) {
    const k = L.stateKey(s) + '|' + s.spores;
    if (memo.has(k)) return memo.get(k);
    let p = 0, wins = 0, min = Infinity, n = 0;
    for (let i = 0; i < s.cells.length; i++) {
      if (!L.canTarget(s, i)) continue;
      n++;
      const t = L.playTurn(s, i);
      if (t.res === 'win') { p += 1; wins += 1; min = Math.min(min, 1); }
      else if (t.res === 'play') { const v = value(t.state); p += v.p; wins += v.wins; if (v.wins) min = Math.min(min, v.min + 1); }
    }
    const v = { p: n ? p / n : 0, wins, min };
    memo.set(k, v); return v;
  }
  const fresh0 = L.freshCount(root);
  const firsts = [];
  for (let i = 0; i < root.cells.length; i++) {
    if (!L.canTarget(root, i)) continue;
    const t = L.playTurn(root, i);
    const spoil = fresh0 - L.freshCount(t.state);
    const win = t.res === 'win' || (t.res === 'play' && value(t.state).wins > 0);
    const leftover = t.state.cells.map((c, j) => c && !c.inf && !c.wall ? j : -1).filter(j => j >= 0);
    firsts.push({ i, spoil, win, left: leftover.length, leftover, res: t.res });
  }
  const v = value(root);
  const winning = firsts.filter(f => f.win), dead = firsts.filter(f => !f.win);
  const bestWinSpoil = winning.length ? Math.max(...winning.map(f => f.spoil)) : 0;
  // greedy play: always the move that spoils the most right now
  let g = root, gres = 'play';
  while (gres === 'play') {
    let best = null;
    for (let i = 0; i < g.cells.length; i++) {
      if (!L.canTarget(g, i)) continue;
      const t = L.playTurn(g, i), spoil = L.freshCount(g) - L.freshCount(t.state);
      if (!best || spoil > best.spoil) best = { spoil, t };
    }
    if (!best) break;
    g = best.t.state; gres = best.t.res;
  }
  const types = new Set(root.cells.filter(c => c && !c.wall).map(c => c.t));
  return {
    cupcakes: fresh0, types: types.size, spores: def.spores, customers: (def.customers || []).length,
    wraps: root.cells.filter(c => c && c.wrap).length, walls: root.cells.filter(c => c && c.wall).length,
    targets: firsts.length, winFirst: winning.length,
    pRandom: v.p, bits: v.p > 0 ? -Math.log2(v.p) : null, wins: v.wins, minSpores: v.wins ? v.min : null,
    traps: dead.filter(f => f.spoil >= bestWinSpoil).length,      // wrong moves that spoil at least as much as the best right move
    near: dead.filter(f => f.left <= 2).length,                    // wrong moves leaving 1–2 cupcakes ("so close")
    exploit: def.spores === 1 ? dead.filter(f => f.left === 1).length : 0, // 1-spore undo trick: miss, see the one left, undo, shoot it
    greedy: gres === 'win',
    // undo trick, general form: miss, look at what is left, undo, then open on one of those leftovers. Share of wrong openings that give the answer away this way.
    undoHint: dead.length ? dead.filter(f => f.left <= 3 && f.leftover.some(j => winning.some(w => w.i === j))).length / dead.length : 0,
  };
}

const rows = LEVELS.map((def, i) => {
  const t0 = Date.now(); const m = analyze(def);
  return { stage: i + 1, chapter: Math.floor(i / 10) + 1, name: def.name, ...m, ms: Date.now() - t0 };
});
require('fs').mkdirSync(__dirname + '/genout', { recursive: true });
require('fs').writeFileSync(__dirname + '/genout/difficulty.json', JSON.stringify({ chapters: CHAPTERS, rows }, null, 1));
console.log('stages', rows.length, 'unsolvable', rows.filter(r => !r.wins).map(r => r.stage), 'slowest ms', Math.max(...rows.map(r => r.ms)));
