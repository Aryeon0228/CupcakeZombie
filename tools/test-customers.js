// Rules for the customer kinds: kid (two cupcakes at once), delivery order (a whole line), picky (neighbours must be clean too).
const assert = require('assert');
const L = require('../src/logic.js');

// o o o
// o . o   one spore, plain muffins spread in a plus
// o o o
const grid = ['ooo', 'o.o', 'ooo'];
function play(customers, idx, spores = 1) {
  const s = L.parseLevel({ grid, spores, customers });
  return L.playTurn(s, idx);
}
// Shooting the top-left muffin spoils (0,0),(0,1),(1,0) then (0,2),(2,0) ... actually the plus pattern chains along the ring:
let r = play([], 0);
const spoiled = r.state.cells.map((c, i) => c && c.inf ? i : -1).filter(i => i >= 0);
assert.deepEqual(spoiled, [0, 1, 2, 3, 5, 6, 7, 8], 'the ring spoils completely from one shot');

// --- kid: both cells spoiled -> fine; one fresh -> lost
// use 2 spores and a board where one shot leaves some fresh: shoot (0,0) on a board with a gap
const grid2 = ['oo.o', 'o..o'];
const s2 = () => L.parseLevel({ grid: grid2, spores: 2, customers: [{ r: 0, c: 3, turn: 1, kind: 'kid', cells: [[0, 3], [1, 3]] }] });
r = L.playTurn(s2(), 0); // left cluster spoils, right pair stays fresh
assert.equal(r.res, 'lost', 'kid takes a fresh cupcake -> lost');
assert.equal(r.cust[0].fresh, true); assert.deepEqual(r.cust[0].taken, [3, 7]);
r = L.playTurn(s2(), 3); // right pair spoils; left cluster fresh but no customer there
assert.equal(r.res, 'play', 'kid finds both spoiled -> game goes on');
assert.equal(r.cust[0].fresh, false); assert.deepEqual(r.cust[0].taken, []);
// one of the two spoiled is still a loss
const s2b = L.parseLevel({ grid: ['o.o', 'o.o'], spores: 2, customers: [{ r: 0, c: 0, turn: 1, kind: 'kid', cells: [[0, 0], [0, 2]] }] });
r = L.playTurn(s2b, 0);
assert.equal(r.res, 'lost', 'kid with one fresh of two -> lost');

// --- order: whole line
const s3 = (idx) => L.playTurn(L.parseLevel({ grid: ['ooo', '...', 'ooo'], spores: 2, customers: [{ r: 2, c: 0, turn: 1, kind: 'order', cells: [[2, 0], [2, 1], [2, 2]] }] }), idx);
assert.equal(s3(0).res, 'lost', 'order line still fresh -> lost');
assert.equal(s3(6).res, 'play', 'order line fully spoiled -> fine');

// --- picky: neighbours matter
const picky = { r: 1, c: 1, turn: 1, kind: 'picky' };
const s4 = (g, idx) => L.playTurn(L.parseLevel({ grid: g, spores: 2, customers: [picky] }), idx);
// centre fresh, left neighbour spoiled -> refused, not lost
r = s4(['.o.', 'go.', '.o.'], 3); // g at (1,0) is earl grey: its scent reaches only other earl greys, so nothing else spoils
assert.equal(r.res, 'play', 'picky sees a spoiled neighbour -> walks away');
assert.equal(r.cust[0].refused, true); assert.equal(r.cust[0].fresh, false);
assert.equal(r.state.cells[4].inf, false, 'the picky one\'s cupcake is still fresh and still needs spoiling');
// centre fresh, all neighbours fresh -> lost
r = L.playTurn(L.parseLevel({ grid: ['x...', '.o..', '...x'], spores: 2, customers: [picky] }), 11);
assert.equal(r.res, 'lost', 'picky with everything clean -> buys it -> lost');
// centre spoiled -> fine (yuck)
r = s4(['.o.', '.o.', '.o.'], 4);
assert.equal(r.res, 'win', 'all spoiled is a win anyway');
r = L.playTurn(L.parseLevel({ grid: ['.o.', '.o.', '.o.', '...', 'x..'], spores: 2, customers: [picky] }), 4);
assert.equal(r.res, 'play'); assert.equal(r.cust[0].fresh, false); assert.equal(!!r.cust[0].refused, false);

// --- customerCells and ordinary customers unchanged
const s5 = L.parseLevel({ grid: ['oo'], spores: 1, customers: [{ r: 0, c: 1, turn: 1 }] });
assert.deepEqual(L.customerCells(s5, s5.customers[0]), [1]);
assert.equal(L.playTurn(s5, 0).res, 'win');

// stateKey must not change with customer kinds (the solver keys on cells + turn only)
console.log('Customer kinds: kid, delivery order and picky rules pass.');
