const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const events={},windows={},tones=[];
const env={document:{addEventListener:(k,f)=>(events[k]??=[]).push(f)},window:{addEventListener:(k,f)=>(windows[k]??=[]).push(f)},reduceMotion:false,matchMedia:()=>({matches:false}),performance:{now:()=>100},tone:(...args)=>tones.push(args)};
vm.createContext(env);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../src/ui-interactions.js'),'utf8'),env);
function button(){const classes=new Set(),animations=[];return{disabled:false,isConnected:true,classes,animations,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},closest(){return this},matches:()=>false,getBoundingClientRect:()=>({left:0,top:0,right:100,bottom:50}),animate(frames,options){const a={frames,options,cancelled:false,cancel(){this.cancelled=true}};animations.push(a);return a}}}
function emit(name,b,extra={}){const e={target:b,pointerId:1,clientX:20,clientY:20,button:0,isPrimary:true,...extra};for(const f of events[name]||[])f(e)}
const b=button();emit('pointerdown',b);assert.ok(b.classes.has('ui-pressed'));emit('pointerup',b);assert.equal(b.classes.size,0);assert.equal(b.animations.length,1);assert.equal(b.animations[0].options.duration,340);
emit('pointerdown',b);assert.equal(b.animations[0].cancelled,true);emit('pointercancel',b);assert.equal(b.classes.size,0);assert.equal(b.animations.length,1);
emit('pointerdown',b);emit('pointermove',b,{clientX:60});emit('pointerup',b);assert.equal(b.animations.length,1);assert.equal(b.classes.size,0);
emit('pointerdown',b);emit('pointerup',b,{clientX:150});assert.equal(b.animations.length,1);
b.disabled=true;emit('pointerdown',b);emit('pointerup',b);assert.equal(b.animations.length,1);assert.equal(b.classes.size,0);b.disabled=false;
emit('pointerdown',b,{isPrimary:false});emit('pointerup',b);assert.equal(b.animations.length,1);
env.reduceMotion=true;emit('pointerdown',b);emit('pointerup',b);assert.equal(b.animations.length,1);env.reduceMotion=false;
emit('keydown',b,{key:'Enter',repeat:false});assert.ok(b.classes.has('ui-pressed'));emit('keyup',b,{key:'Enter'});assert.equal(b.animations.length,2);assert.equal(b.classes.size,0);
emit('pointerdown',b);for(const f of windows.blur)f();assert.equal(b.classes.size,0);emit('pointerup',b);assert.equal(b.animations.length,2);
emit('click',b);emit('click',b);assert.equal(tones.length,1);
console.log('PASS: button release, rapid repress cancellation, drag/outside/cancel/blur, disabled and secondary inputs, keyboard, reduced motion, and sound throttling.');
