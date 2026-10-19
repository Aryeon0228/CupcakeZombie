// Exercise the real pointer handlers without a browser. Rule transitions use
// the real game logic; rendering/audio are replaced by observation-only stubs.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const {parseLevel, canTarget, playTurn} = require('../src/logic.js');
const {LEVELS} = require('../src/levels.js');
const solutions = require('./solutions.json').sol;
const src = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const fragment = src.slice(src.indexOf('// ---------- input ----------'), src.indexOf("$('undoBtn').onclick"));
const listeners = {}, win = {}, captured = new Set(), fired = [], sounds = [];
const canvas = { style: {}, addEventListener:(k,f)=>listeners[k]=f, setPointerCapture:id=>captured.add(id), hasPointerCapture:id=>captured.has(id), releasePointerCapture(id){captured.delete(id);listeners.lostpointercapture({pointerId:id});} };
const env = { canvas, window:{addEventListener:(k,f)=>win[k]=f}, state:null, screen:'play', now:1000, S:60, vis:[], hover:-1, selected:-1, cursorShown:false, busy:false, result:null, introOpen:false, canTarget,
  cellAt(e){const c=Math.floor(e.clientX/60),r=Math.floor(e.clientY/60);return c>=0&&c<env.state.W&&r>=0&&r<env.state.H?r*env.state.W+c:-1;},
  tone:(...a)=>sounds.push(a), haptic(){}, toast(){}, t:k=>k, updateHint(){}, renderHUD(){},
  fireAt(i){assert.ok(canTarget(env.state,i));fired.push(i);const turn=playTurn(env.state,i);env.state=turn.state;env.result=turn.res==='play'?null:turn.res;env.busy=true;env.selected=-1;}
};
vm.createContext(env);vm.runInContext(fragment,env);
function load(d={grid:['oooon','os.oo'],spores:3,customers:[]}){
  env.resetBoardPress();Object.assign(env,{state:parseLevel(d),selected:-1,hover:-1,busy:false,result:null,introOpen:false,screen:'play'});
  env.vis=env.state.cells.map(c=>c&&({peekAt:-1,gone:false}));fired.length=0;sounds.length=0;env.now+=1000;
}
function event(type,i,kind='touch',extra={}){const x=(i%env.state.W)*60+30,y=Math.floor(i/env.state.W)*60+30;env.now+=20;listeners[type]({pointerId:1,isPrimary:true,button:0,pointerType:kind,clientX:x,clientY:y,...extra});}
function tap(i,kind='touch'){event('pointerdown',i,kind);event('pointerup',i,kind);}
const checks=[];
function check(name,fn){fn();checks.push(name);}
for(const kind of ['mouse','touch','pen'])check(kind+' first tap selects; second tap fires',()=>{
  load();tap(1,kind);assert.equal(env.selected,1);assert.equal(fired.length,0);tap(1,kind);assert.deepEqual(fired,[1]);assert.equal(captured.size,0);
});
check('mouse hover reacts once without selecting or firing',()=>{
  load();event('pointermove',0,'mouse');const at=env.vis[0].peekAt;assert.ok(at>=0);env.now+=800;event('pointermove',0,'mouse');assert.equal(env.vis[0].peekAt,at);assert.equal(env.selected,-1);assert.equal(fired.length,0);assert.equal(sounds.length,0);
});
check('quick swipe visits crossed cells; release selects and later tap fires',()=>{
  load();event('pointerdown',0);event('pointermove',3);event('pointerup',3);
  for(let i=0;i<=3;i++)assert.ok(env.vis[i].peekAt>=0,'Skipped cupcake '+i);
  assert.equal(env.selected,3);assert.equal(fired.length,0);assert.equal(sounds.length,1,'Audio is throttled');tap(3);assert.deepEqual(fired,[3]);
});
check('out-and-back swipe on selected cupcake never fires on release',()=>{
  load();tap(0);event('pointerdown',0);event('pointermove',2);event('pointermove',0);event('pointerup',0);assert.equal(env.selected,0);assert.equal(fired.length,0);tap(0);assert.deepEqual(fired,[0]);
});
check('within-cell drag exceeding slop never confirms',()=>{
  load();tap(0);event('pointerdown',0);event('pointermove',0,'touch',{clientX:48});event('pointerup',0);assert.equal(fired.length,0);
});
check('outside release, empty cell, wall and spoiled cupcake cannot fire',()=>{
  load();tap(0);event('pointerdown',0);event('pointermove',0,'touch',{clientX:-20});event('pointerup',0,'touch',{clientX:-20});assert.equal(env.selected,-1);
  tap(7);tap(7);assert.equal(fired.length,0);tap(4);tap(4);assert.equal(env.selected,-1);assert.equal(fired.length,0);
  env.state.cells[1].inf=true;tap(1);tap(1);assert.equal(env.selected,-1);assert.equal(fired.length,0);
});
for(const kind of ['pointercancel','lostpointercapture','blur'])check(kind+' clears without firing',()=>{
  load();tap(0);event('pointerdown',0);if(kind==='blur')win.blur();else event(kind,0);event('pointerup',0);assert.equal(env.selected,-1);assert.equal(fired.length,0);assert.equal(captured.size,0);
});
check('secondary pointer cannot overwrite or release primary gesture',()=>{
  load();event('pointerdown',0);event('pointerdown',2,'touch',{pointerId:2,isPrimary:false});event('pointerup',2,'touch',{pointerId:2,isPrimary:false});event('pointerup',0);assert.equal(env.selected,0);assert.equal(fired.length,0);
});
check('busy, result and intro block pointer reactions',()=>{
  for(const extra of [{busy:true},{result:'win'},{introOpen:true},{screen:'map'}]){load();Object.assign(env,extra);event('pointermove',0,'mouse');tap(0);assert.equal(env.selected,-1);assert.equal(env.vis[0].peekAt,-1);assert.equal(fired.length,0);}
});
check('reentering a cupcake during cooldown does not restart motion',()=>{
  load();event('pointermove',0,'mouse');const at=env.vis[0].peekAt;event('pointermove',1,'mouse');event('pointermove',0,'mouse');assert.equal(env.vis[0].peekAt,at);env.now+=400;event('pointermove',1,'mouse');event('pointermove',0,'mouse');assert.ok(env.vis[0].peekAt>at);
});
let turns=0;
for(let i=0;i<LEVELS.length;i++){
  load(LEVELS[i]);
  for(const idx of solutions[i]){
    env.busy=false;const n=env.state.turn;tap(idx);assert.equal(env.selected,idx,'Stage '+(i+1)+' preview');assert.equal(env.state.turn,n);tap(idx);assert.equal(env.state.turn,n+1);turns++;
  }
  assert.equal(env.result,'win','Stage '+(i+1)+' must still clear');
}
const report={checks,stages:LEVELS.length,turns,scope:'Real pointer handlers and game rules in a Node VM; native browser gestures and iOS hardware require separate checks.'};
if(process.argv.includes('--report'))fs.writeFileSync(path.join(root,'docs/input-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(`PASS: ${checks.length} input checks; ${LEVELS.length} solutions / ${turns} turns replayed through tap-to-preview and tap-to-fire.`);
