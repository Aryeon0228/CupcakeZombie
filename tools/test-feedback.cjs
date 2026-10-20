const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const render = fs.readFileSync(path.join(root,'src/game-render.js'),'utf8');
async function main() {
  let releaseDecode, releaseResume, starts = [], decoded = 0, instances = 0;
  const param = () => ({value: 0, setTargetAtTime(v){this.value=v},setValueAtTime(v){this.value=v},cancelScheduledValues(){}});
  const node = () => ({connect(){return this},disconnect(){}});
  class Audio {
    constructor(){instances++;this.state='suspended';this.currentTime=0;this.destination={};}
    createGain(){return {...node(),gain:param()};}
    createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};}
    resume(){return new Promise(r=>{releaseResume=()=>{this.state='running';r();};});}
    decodeAudioData(){decoded++;return new Promise(r=>{releaseDecode=()=>r({duration:.21});});}
    createBufferSource(){return {...node(),playbackRate:{value:1},start(t){starts.push(t)}};}
  }
  const env={window:{AudioContext:Audio},save:{sound:true},SOUNDS:{button:'AA==',meow:'AA=='},atob:s=>Buffer.from(s,'base64').toString('binary')};
  vm.createContext(env);
  vm.runInContext(render.slice(render.indexOf('let AC ='),render.indexOf('\nfunction tone(')),env);
  const first=env.buttonSound();
  assert.equal(starts.length,0);
  releaseDecode();releaseResume();await first;
  assert.equal(starts.length,1,'first gesture survives suspended context');
  await env.buttonSound();assert.equal(decoded,1,'decode cached');
  const pending=env.cupcakeSound(1);
  env.save.sound=false;env.syncSound();releaseDecode();await pending;
  assert.equal(starts.length,2,'muting cancels pending audio');
  assert.equal(vm.runInContext('audioBus.gain.value',env),0,'mute is immediate');
  await env.buttonSound();assert.equal(starts.length,2);
  assert.equal(instances,1);
  env.save.sound=true;await env.cupcakeSound(2);assert.equal(starts.length,3);

  const motion={};vm.createContext(motion);
  vm.runInContext(fs.readFileSync(path.join(root,'src/cupcake-reactions.js'),'utf8'),motion);
  for(const [key,profile] of Object.entries(vm.runInContext('CUPCAKE_RIG_PROFILES',motion))){
    const png=fs.readFileSync(path.join(root,'assets',key+'.png'));
    assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],Array.from(profile.size),key+' rig must match source canvas');
  }
  for(const age of [0,460,1000,8000,60000,3600000]){
    const p=motion.cupcakeReactionPose(age,false,true);
    assert.equal(p.active,true);assert.ok(p.arms>=0&&p.arms<=1.18);
    assert.equal(motion.cupcakeReactionPose(age,true,true).active,false);
  }
  assert.notEqual(motion.cupcakeReactionPose(8000,false,true).arms,motion.cupcakeReactionPose(8080,false,true).arms);
  assert.equal(motion.cupcakeReactionPose(8000).active,false,'one-shot lab remains finite');
  const calls=[],drop={DROP:420,LAND:260,projs:[],now:0,S:60,reduceMotion:false,dropOrigin:{ceiling:-120},ctx:{},dropCtx:{},
    cxOf:()=>120,cyOf:()=>60,META:{mold_drop:{w:240,k:1}},IMG:{mold_drop:{}},drawSpriteAt:(...a)=>calls.push(a)};
  vm.createContext(drop);vm.runInContext(render.slice(render.indexOf('function dropPose('),render.indexOf('function drawParticles(')),drop);
  for(const age of [350,420,475,600]){
    drop.projs=[{style:'drop',to:1,contactOffset:-.2,t0:0,dur:420}];drop.now=age;drop.drawProjectiles(1);
    assert.equal(calls.at(-1)[1],'mold_drop');
    assert.equal(calls.at(-1)[0],drop.dropCtx,'large mold uses unclipped layer');
  }
  assert.equal(calls[1][3],calls[2][3],'squash keeps contact point');
  assert.ok(calls[2][6]>1&&calls[2][7]<1,'landing widens and flattens');
  drop.reduceMotion=true;drop.now=350;let count=calls.length;drop.drawProjectiles(1);assert.equal(calls.length,count);
  drop.now=475;drop.drawProjectiles(1);assert.equal(calls.at(-1)[6],1);assert.equal(calls.at(-1)[7],1);
  drop.now=680;drop.drawProjectiles(1);assert.equal(drop.projs.length,0);
  console.log('PASS: first-click audio resume, decode cache, mute/pending cancellation; continuous selected arms and reduced motion; large-mold contact, squash, unclipped flight and cleanup.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
