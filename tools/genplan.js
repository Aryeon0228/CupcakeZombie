// Generate every stage in plan.js (and the daily pool). Resumable: skips stages already in genout/plan.
const fs = require('fs'), path = require('path');
const G = require('./gen.js');
const { CH, DAILY } = require('./plan.js');
const outDir = require('path').join(__dirname, 'genout/plan'); fs.mkdirSync(outDir, { recursive: true });
const which = process.argv[2]; // e.g. "1,3" chapters, or "daily"
if (which === 'daily') {
  const want = +process.argv[3] || 120;
  const file = path.join(outDir, 'daily.json');
  const have = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
  for (let k = have.length; k < want; k++) {
    const t0 = Date.now();
    const res = G.search({ ...DAILY, salt: 5000 + k }, DAILY.tries, 1);
    if (!res.length) { console.log('daily', k, 'none'); have.push(null); }
    else { have.push({ grid: res[0].def.grid, customers: res[0].def.customers, spores: DAILY.spores, first: res[0].a.first, waves: res[0].a.maxWaves }); console.log('daily', k, `first=${res[0].a.first} waves=${res[0].a.maxWaves} ${Date.now() - t0}ms`); }
    fs.writeFileSync(file, JSON.stringify(have));
  }
} else {
  const chapters = which.split(',').map(Number);
  for (const ch of CH) {
    if (!chapters.includes(ch.no)) continue;
    ch.stages.forEach((st, i) => {
      if (st.hand || st.grid) return;
      const file = path.join(outDir, `${ch.no}-${i + 1}.json`);
      if (fs.existsSync(file) && JSON.parse(fs.readFileSync(file, 'utf8'))) return;
      const t0 = Date.now();
      const spec = { ...st, salt: ch.no * 100 + i + 1, timeBudgetMs: i === 9 ? 240000 : 120000 };
      // Search within a time budget; if the difficulty band cannot be hit, relax it step by step rather than giving up.
      const steps = [
        s => s,
        s => ({ ...s, minBits: s.minBits != null ? s.minBits - 0.6 : undefined, maxBits: s.maxBits != null ? s.maxBits + 0.6 : undefined }),
        s => { const r = { ...s }; delete r.minTraps; return r; },
        s => { const r = { ...s }; delete r.minTraps; delete r.minBits; delete r.maxBits; return r; },
        s => { const r = { ...s }; delete r.minTraps; delete r.minBits; delete r.maxBits; delete r.greedy; return r; },
      ];
      let res = [], relaxed = 0;
      for (let k = 0; k < steps.length && !res.length; k++) { relaxed = k; res = G.search(steps[k](spec), spec.tries || 5000, 3); }
      if (!res.length) { console.log(`${ch.no}-${i + 1} ${st.name}: NONE (${Date.now() - t0}ms)`); fs.writeFileSync(file, 'null'); return; }
      const best = res[0];
      if (best.a.bits == null) { const c = G.curve(best.def); best.a.bits = c.bits; best.a.traps = c.traps; }
      if (relaxed) console.log(`  (relaxed ${relaxed})`);
      fs.writeFileSync(file, JSON.stringify({ grid: best.def.grid, customers: best.def.customers, spores: st.spores, a: { first: best.a.first, total: best.a.total, waves: best.a.maxWaves, greedy: best.a.greedyWins, surv: best.a.minSurvivorsWrong, n: best.a.cupcakes, bits: best.a.bits, traps: best.a.traps } }));
      console.log(`${ch.no}-${i + 1} ${st.name}: first=${best.a.first}/${best.a.total} waves=${best.a.maxWaves} greedy=${best.a.greedyWins} n=${best.a.cupcakes} bits=${best.a.bits != null ? best.a.bits.toFixed(1) : '-'} traps=${best.a.traps ?? '-'} (${Date.now() - t0}ms)`);
    });
  }
}

