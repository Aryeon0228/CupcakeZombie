const assert = require('node:assert/strict');
const L = require('../src/logic.js');
const board = (type, patches = {}) => {
  const rows = Array.from({length:5}, () => Array(5).fill('o'));
  rows[2][2] = type;
  for (const [i,c] of Object.entries(patches)) rows[Math.floor(i / 5)][i % 5] = c;
  return L.parseLevel({grid:rows.map(r=>r.join('')),spores:3});
};
const targets = s => L.targetsOf(s,12).sort((a,b)=>a-b);
assert.deepEqual(targets(board('u')), [0,4,6,8,16,18,20,24]);
assert.deepEqual(targets(board('u',{6:'.'})), [0,4,8,16,18,20,24]);
assert.deepEqual(targets(board('u',{6:'n'})), [4,8,16,18,20,24]);
assert.deepEqual(targets(board('r')), [0,2,4,10,14,20,22,24]);
assert.deepEqual(targets(board('r',{7:'.'})), [0,2,4,10,14,20,22,24]);
assert.deepEqual(targets(board('r',{7:'n',6:'n'})), [4,10,14,20,22,24]);
for (const type of ['u','r']) {
  const s = board(type.toUpperCase());
  const sealed = L.hitCell(s,{idx:12,direct:false});
  assert.equal(sealed.kind,'sealed'); assert.equal(!!sealed.spread,false);
  const opened = L.hitCell(s,{idx:12,strong:true});
  assert.equal(opened.spread,true); assert.equal(s.cells[12].wrap,false);
  const direct = board(type.toUpperCase());
  assert.equal(L.hitCell(direct,{idx:12,direct:true}).spread,true);
  assert.equal(direct.cells[12].wrap,false);
  const edge = L.parseLevel({grid:[type+'o','oo'],spores:1});
  assert.deepEqual(L.targetsOf(edge,0),type==='u'?[3]:[]);
}
console.log('New flavors: exact directions, skipped cells, mint blocking, wrappers and edges passed.');
