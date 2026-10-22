const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const { LEVELS } = require(path.join(root, 'src/levels.js'));
const platform = app.slice(0, app.indexOf('function haptic('));
const progress = app.slice(app.indexOf('const starsOf ='), app.indexOf('// ---------- title ----------'));
const start = app.slice(app.indexOf('function startStage('), app.indexOf('function startDaily('));
const reports = [];
function env(nativeBuild, nativeRuntime) {
  const x = { window: nativeRuntime === undefined ? {} : { Capacitor: { isNativePlatform: () => nativeRuntime } },
    LEVELS, save: { stars: {}, level: 0 }, mode: 'daily', li: -1, loads: [], writes: 0, notices: 0, messages: [],
    motionNotice(){x.notices++}, haptic(){}, t:k=>k, toast:m=>x.messages.push(m),
    writeSave(){x.writes++}, loadLevel:d=>x.loads.push(d) };
  vm.createContext(x);
  vm.runInContext(platform.replace('/*NATIVE_BUILD*/false', '/*NATIVE_BUILD*/' + nativeBuild) + progress + start, x);
  return x;
}
for (const [name, build, runtime, free] of [
  ['web',false,undefined,true],['Capacitor web platform',false,false,true],
  ['native runtime iOS/Android',false,true,false],['native build without bridge',true,undefined,false],
  ['native build with bridge',true,true,false],['native build with web runtime',true,false,false]
]) {
  const x=env(build,runtime);
  const open=vm.runInContext('LEVELS.filter((_,i)=>unlocked(i)).length',x);
  assert.equal(open,free?LEVELS.length:1,name);
  assert.equal(x.startStage(LEVELS.length-1),free,name+' last stage');
  assert.equal(x.loads.length,free?1:0);
  assert.deepEqual(x.save.stars,{},'selection must never award fake stars');
  if(free){ assert.equal(x.li,LEVELS.length-1); assert.equal(x.save.level,LEVELS.length-1); }
  else {
    assert.equal(x.writes,0);assert.equal(x.notices,0);assert.equal(x.li,-1);
    assert.equal(x.startStage(0),true);x.save.stars[0]=2;
    assert.equal(x.startStage(1),true);assert.equal(x.startStage(2),false);
    assert.equal(x.startStage(0),true,'cleared stages stay replayable');
    assert.deepEqual(x.save.stars,{0:2});
  }
  const snap={level:x.save.level,li:x.li,writes:x.writes,loads:x.loads.length};
  for(const bad of [-1,LEVELS.length,1.5,NaN,Infinity,'2',null,undefined]){
    assert.equal(x.startStage(bad),false,name+' invalid index '+bad);
    assert.equal(vm.runInContext('unlocked(value)',Object.assign(x,{value:bad})),false);
  }
  assert.deepEqual({level:x.save.level,li:x.li,writes:x.writes,loads:x.loads.length},snap);
  reports.push({name,open,total:LEVELS.length,free});
}
console.log('PASS: web free selection, native progression/entry guard, invalid input, no fabricated stars. '+JSON.stringify(reports));

