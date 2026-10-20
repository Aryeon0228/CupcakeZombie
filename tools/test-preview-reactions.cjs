const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const env = {};
vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(root, 'src/logic.js'), 'utf8'), env);
const render = fs.readFileSync(path.join(root, 'src/game-render.js'), 'utf8');
vm.runInContext(render.slice(render.indexOf('function previewOf('), render.indexOf('\nconst PREVIEW_OUTLINES')), env);
vm.runInContext(fs.readFileSync(path.join(root, 'src/cupcake-reactions.js'), 'utf8'), env);
const stages = require('../src/levels.js').LEVELS;
let cases = 0;
// The displayed first-hop targets must match real rule hits, including wraps,
// lids and delayed lemons, without mutating the board or leaking later waves.
for (const def of stages) {
  const state = env.parseLevel(def), saved = JSON.stringify(state);
  for (let i = 0; i < state.cells.length; i++) {
    if (!env.canTarget(state, i)) continue;
    const preview = env.previewOf(state, i), real = env.fire(state, i);
    const firstHop = [...new Set((real.waves[1] || []).filter(h => h.from === i).map(h => h.idx))].sort((a,b)=>a-b);
    assert.deepEqual(Array.from(preview.targets).sort((a,b)=>a-b), firstHop, `Preview differs at ${def.name} / ${i}`);
    assert.equal(JSON.stringify(state), saved, 'Preview changed live board');
    cases++;
  }
}
const sample = env.parseLevel({grid:['oLo','nen','obo'],spores:3,customers:[]});
sample.cells[1].inf = true; // A wrapped zombie is affected by strong espresso.
assert.ok(env.previewOf(sample,4).targets.includes(1));
sample.cells[1].wrap = false;
assert.ok(!env.previewOf(sample,4).targets.includes(1));
for (let age = -10; age <= 1000; age += 5) {
  const pose = env.cupcakeReactionPose(age);
  assert.ok(pose.eyes >= 1 && pose.eyes <= 1.42);
  assert.ok(pose.arms >= 0 && pose.arms <= 1.23);
  if(age<0||age>=460) assert.equal(pose.active,false);
  assert.equal(env.cupcakeReactionPose(age,true).active,false);
}
assert.ok(env.cupcakeReactionPose(100).active);
console.log(`PASS: ${cases} real first-hop previews match 200 stages without mutation; strong wrap hit; reaction settles at 460ms; reduced motion is still.`);
