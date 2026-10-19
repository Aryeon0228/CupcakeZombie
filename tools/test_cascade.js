// The page's clocked cascade (planCascade + planRelease) must end in the same state as logic.playTurn.
const fs = require('fs');
const L = require('../src/logic.js'); Object.assign(global, L);
const src = fs.readFileSync(require('path').join(__dirname, '../src/game-render.js'), 'utf8');
let seed = 20261020;
const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
const i0 = src.indexOf('const DROP ='), i1 = src.indexOf('const tileBump');
eval(src.slice(i0, i1) + '; global.planCascade = planCascade; global.planRelease = planRelease;');
const { LEVELS } = require('../src/levels.js');
let checks = 0, bad = 0;
for (const def of LEVELS) for (let rep = 0; rep < 40; rep++) {
  let s = parseLevel(def); s.spores = 6; s.customers = [];
  for (let step = 0; step < 5; step++) {
    const opts = s.cells.map((c, i) => canTarget(s, i) ? i : -1).filter(i => i >= 0);
    if (!opts.length) break;
    const i = opts[Math.floor(random() * opts.length)];
    const turn = playTurn(s, i);
    const p = planCascade(s, [{ idx: i, t: 0, direct: true }]);
    p.sim.spores--; p.sim.turn++;
    for (let k = 0; k < turn.ticks.length; k++) planRelease(p.sim);
    checks++;
    if (stateKey(turn.state) !== stateKey(p.sim)) { bad++; if (bad < 5) console.log('MISMATCH', def.name, i, stateKey(turn.state), stateKey(p.sim)); }
    if (turn.res !== 'play') break;
    s = turn.state;
  }
}
console.log('levels', LEVELS.length, 'checks', checks, 'mismatches', bad);
// random boards with every type, wraps and spatulas
{
  const chars = 'oxscmbglenurOXGLEUR/\\..';
  let c2 = 0, b2 = 0;
  for (let n = 0; n < 3000; n++) {
    const W = 4 + (n % 4), H = 4 + ((n >> 2) % 4);
    const grid = []; for (let r = 0; r < H; r++) { let row = ''; for (let c = 0; c < W; c++) row += chars[Math.floor(random() * chars.length)]; grid.push(row); }
    let s = parseLevel({ grid, spores: 6, customers: [] });
    for (let step = 0; step < 4; step++) {
      const opts = s.cells.map((c, i) => canTarget(s, i) ? i : -1).filter(i => i >= 0);
      if (!opts.length) break;
      const i = opts[Math.floor(random() * opts.length)];
      const turn = playTurn(s, i);
      const p = planCascade(s, [{ idx: i, t: 0, direct: true }]); p.sim.spores--; p.sim.turn++;
      for (let k = 0; k < turn.ticks.length; k++) planRelease(p.sim);
      c2++; if (stateKey(turn.state) !== stateKey(p.sim)) { b2++; if (b2 < 4) console.log('RAND MISMATCH', grid.join('|'), i); }
      if (turn.res !== 'play') break; s = turn.state;
    }
  }
  console.log('random checks', c2, 'mismatches', b2);
  bad += b2;
}


if (bad) process.exitCode = 1;
