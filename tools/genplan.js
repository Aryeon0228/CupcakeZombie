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
      if (st.hand) return;
      const file = path.join(outDir, `${ch.no}-${i + 1}.json`);
      if (fs.existsSync(file)) return;
      const t0 = Date.now();
      const spec = { ...st, salt: ch.no * 100 + i + 1 };
      let res = G.search(spec, spec.tries || 5000, 3);
      if (!res.length) { console.log(`${ch.no}-${i + 1} ${st.name}: NONE (${Date.now() - t0}ms)`); fs.writeFileSync(file, 'null'); return; }
      const best = res[0];
      fs.writeFileSync(file, JSON.stringify({ grid: best.def.grid, customers: best.def.customers, spores: st.spores, a: { first: best.a.first, total: best.a.total, waves: best.a.maxWaves, greedy: best.a.greedyWins, surv: best.a.minSurvivorsWrong, n: best.a.cupcakes } }));
      console.log(`${ch.no}-${i + 1} ${st.name}: first=${best.a.first}/${best.a.total} waves=${best.a.maxWaves} greedy=${best.a.greedyWins} surv=${best.a.minSurvivorsWrong} n=${best.a.cupcakes} (${Date.now() - t0}ms)`);
    });
  }
}
