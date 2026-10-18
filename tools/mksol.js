// Find one winning line per stage (and per daily) for playall.py
const L = require('../src/logic.js');
const { LEVELS, DAILY } = require('../src/levels.js');
function solve(def) {
  const seen = new Set();
  const dfs = (s, seq) => {
    const k = L.stateKey(s) + '|' + s.spores; if (seen.has(k)) return null; seen.add(k);
    for (let i = 0; i < s.cells.length; i++) {
      if (!L.canTarget(s, i)) continue;
      const t = L.playTurn(s, i);
      if (t.res === 'win') return seq.concat(i);
      if (t.res === 'play') { const r = dfs(t.state, seq.concat(i)); if (r) return r; }
    }
    return null;
  };
  return dfs(L.parseLevel(def), []);
}
const sol = LEVELS.map(solve), dsol = (DAILY || []).map(solve);
const bad = sol.map((s, i) => s ? null : i + 1).filter(Boolean);
console.log('levels', sol.length, 'unsolved', bad);
require('fs').writeFileSync('solutions.json', JSON.stringify({ sol, dsol }));
