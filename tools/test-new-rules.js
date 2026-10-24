// Part-2 rules: coconut snow (frost) and grapefruit yogurt (sour).
const assert = require('assert');
const L = require('../src/logic.js');
const inf = s => s.cells.map((c, i) => c && c.inf ? i : -1).filter(i => i >= 0);
const P = (grid, spores = 3, customers = []) => L.parseLevel({ grid, spores, customers });

// --- coconut: spreads nothing, snow stops the neighbours for the turn
// o k o   shoot the coconut: only it spoils; the muffins on either side are frosted, not spoiled
let r = L.playTurn(P(['oko']), 0 * 0 + 1);
assert.deepEqual(inf(r.state), [1], 'a coconut shot directly spoils alone');
assert.equal(r.res, 'play');
assert.ok(!r.state.cells[0].frost && !r.state.cells[2].frost, 'snow has melted by the time the turn is over');
assert.deepEqual(r.waves[0][0].frosted, [0, 2], 'the wave reports what the coconut frosted');

// chain order: muffin row o o k o o — shoot the left end. Wave 1 spoils 0, wave 2 spoils 1, wave 3 spoils 2 (coconut),
// then snow covers 1 and 3; 3 is fresh and gets frosted, so the chain stops there.
r = L.playTurn(P(['ookoo']), 0);
assert.deepEqual(inf(r.state), [0, 1, 2], 'the chain dies at the coconut: 3 is frosted, 4 never reached');
const frostedHits = r.waves.flat().filter(h => h.kind === 'frosted');
assert.equal(frostedHits.length, 0, 'nothing even reached 3 (the coconut spreads nothing)');

// snow blocks spores that arrive later in the same turn from elsewhere:
//   k o o
//   o o o   shoot (1,0): wave1 (1,0); wave2 (0,0)=coconut and (1,1); wave3 from (1,1): (0,1),(1,2),(2,1)? no third row.
// After wave 2 the coconut frosts (0,1),(1,1 already inf). So (0,1) is frosted and the wave-3 spore from (1,1) thuds.
r = L.playTurn(P(['koo', 'ooo']), 3);
assert.ok(!r.state.cells[1].inf, '(0,1) stayed fresh under the snow');
assert.ok(r.waves.flat().some(h => h.kind === 'frosted' && h.idx === 1), 'the spore that reached (0,1) is reported as frosted');
assert.deepEqual(inf(r.state), [0, 2, 3, 4, 5], 'the bottom row, the coconut and (0,2) (reached from (1,2), outside the snow) spoil');
// the next turn the snow is gone: shooting (0,1) spoils it
const r2 = L.playTurn(r.state, 1);
assert.deepEqual(inf(r2.state), [0, 1, 2, 3, 4, 5]); assert.equal(r2.res, 'win');

// hits already in flight in the coconut's own wave still land (frost is applied after the wave)
//   o k   shoot the top-left muffin: wave 2 hits the coconut (0,1) and the muffin (1,0) together; (1,1) is reached in wave 3
//   o o   from (1,0) — but (1,1) is frosted by the coconut after wave 2, so it stays fresh.
r = L.playTurn(P(['ok', 'oo']), 0);
assert.deepEqual(inf(r.state), [0, 1, 2], '(1,0) landed in the same wave as the coconut; (1,1) was frosted');

// a chilled lemon that was hit before the snow still spoils at the end of the turn, but its spores land on snow:
//   m l k   the cream hits the lemon (dist 1) and the coconut (dist 2) in one wave; the coconut frosts (1,1) under the lemon
//   . o .
r = L.playTurn(P(['mlk', '.o.']), 0);
assert.ok(r.state.cells[1].inf, 'the lemon went bad at the end of the turn'); assert.ok(r.state.cells[2].inf);
assert.ok(!r.state.cells[4].inf, 'the lemon\'s spread hit snow');
assert.ok(r.ticks[0].flat().some(h => h.kind === 'frosted' && h.idx === 4), 'reported as a frosted hit in the release tick');

// --- grapefruit: spreads like a muffin, victims are spoiled but silent
// o f o o   shoot the grapefruit: 0 and 2 spoil sour, 3 is never reached
r = L.playTurn(P(['ofoo']), 1);
assert.deepEqual(inf(r.state), [0, 1, 2], 'the grapefruit\'s neighbours spoil but do not pass it on');
assert.ok(r.state.cells[0].sour && r.state.cells[2].sour && !r.state.cells[1].sour, 'victims are sour, the grapefruit itself is not');
assert.ok(r.waves[1].every(h => h.sour && !h.spread), 'sour hits are flagged for the page');
// shooting the muffin next to it: 0 spoils normally and spreads to the grapefruit, which spreads to 2 (sour); 3 stays fresh
r = L.playTurn(P(['ofoo']), 0);
assert.deepEqual(inf(r.state), [0, 1, 2]); assert.ok(!r.state.cells[0].sour);
// a direct shot on a sour-infected cell is impossible (already spoiled) and a later normal spore does nothing
assert.ok(!L.canTarget(r.state, 2));
// sour chilled lemon: spoils at the end of the turn without spreading
r = L.playTurn(P(['flo']), 0);
assert.ok(r.state.cells[1].inf && r.state.cells[1].sour, 'the lemon hit by the grapefruit went bad sour');
assert.ok(!r.state.cells[2].inf, 'and did not spread');
// sour spore on a butter lid just pops the lid; the next (normal) hit spoils it normally
r = L.playTurn(P(['fb', 'o.']), 0);
assert.equal(r.state.cells[1].lid, 0); assert.ok(!r.state.cells[1].inf);
// an espresso next to a grapefruit: strong spores are not sour; the grapefruit's own spores are sour but not strong
r = L.playTurn(P(['efO']), 0); // wrapped muffin hit by the grapefruit from the side: sealed (inf, still wrapped)
assert.ok(r.state.cells[2].inf && r.state.cells[2].wrap, 'sealed by a sour spore');

// --- state keys: a sour chilled lemon differs from a plain one; snow never leaks into the key
const a = P(['fl']), b = P(['ol']);
const ra = L.fire(a, 0).state, rb = L.fire(b, 0).state;
assert.notEqual(L.stateKey(ra), L.stateKey(rb));
assert.ok(!L.stateKey(L.fire(P(['oko']), 1).state).includes('F'));

// --- generator switches
L.RULES.frost = false;
r = L.playTurn(P(['koo', 'ooo']), 3);
assert.deepEqual(inf(r.state), [0, 1, 2, 3, 4, 5], 'without frost the whole shelf spoils');
L.RULES.frost = true;
L.RULES.sour = false;
r = L.playTurn(P(['ofoo']), 1);
assert.deepEqual(inf(r.state), [0, 1, 2, 3], 'without sour the grapefruit is a muffin');
L.RULES.sour = true;

console.log('Part-2 rules: coconut snow and grapefruit yogurt pass.');
