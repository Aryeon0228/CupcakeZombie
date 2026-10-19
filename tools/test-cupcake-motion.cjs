const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/game-render.js'),'utf8');
const fragment=source.slice(source.indexOf('function cupcakePose('),source.indexOf('\nfunction pathPoint('));
const calls=[];
const env={now:0,reduceMotion:false,S:64,ctx:{save(){},restore(){},beginPath(){},ellipse(){},fill(){}},IMG:{pending_lemon_yogurt:{}},TINT:{basic:{},lemon_yogurt:{}},TYPES:{o:{key:'basic'},l:{key:'lemon_yogurt'},m:{key:'mint_choco'}},cxOf:()=>100,baseY:()=>200,zombieKey:()=> 'zombieB',drawSpriteAt:(...args)=>calls.push(args.slice(1)),drawWrap(){},isZombieShown:v=>v.infAt>=0?env.now-v.infAt>=230:v.zombie};
vm.createContext(env);vm.runInContext(fragment,env);
const base={t:'o',infAt:-1,bumpAt:-1,bumpAmp:0,peekAt:-1,zombie:false,wrap:false,phase:1,pend:false};
for(const extra of [{},{zombie:true},{t:'l',pend:true},{t:'m'}]){
const v={...base,...extra};let first;
for(let t=0;t<=5000;t+=17){env.now=t;calls.length=0;env.drawCupcake(0,v,1);if(!first)first=JSON.stringify(calls);assert.equal(JSON.stringify(calls),first,'Resting sprite changed with time');}
}
const hit={...base,bumpAt:1000,bumpAmp:.22};let moved=false;
for(let t=990;t<=1600;t+=5){const p=env.cupcakePose(hit,t,false);assert.ok(p.sx>.95&&p.sx<1.08&&p.sy>.88&&p.sy<1.05);if(p.sy<1)moved=true;if(t<1000||t>=1420){assert.equal(p.sx,1);assert.equal(p.sy,1);}}
assert.ok(moved,'Hit reaction should remain visible');
const peek={...base,peekAt:1000};let squashed=false,stretched=false;
for(let t=990;t<=1600;t+=5){const p=env.cupcakePose(peek,t,false);assert.ok(p.sx>=.967&&p.sx<=1.02&&p.sy>=.965&&p.sy<=1.06);squashed||=p.sy<1;stretched||=p.sy>1;if(t<1000||t>=1300){assert.equal(p.sx,1);assert.equal(p.sy,1);}const still=env.cupcakePose(peek,t,true);assert.equal(still.sx,1);assert.equal(still.sy,1);}
assert.ok(squashed&&stretched,'Pointer entry briefly squashes and stretches');
for(let t=1000;t<1420;t+=5){assert.deepEqual(env.cupcakePose({...hit,peekAt:1100},t,false),env.cupcakePose(hit,t,false),'A hover must not add to a hit reaction');}
for(let t=1000;t<1420;t+=5){const p=env.cupcakePose(hit,t,true);assert.equal(p.sx,1);assert.equal(p.sy,1);}
const infect={...base,bumpAt:0,bumpAmp:.12,infAt:0};
for(let t=0;t<230;t+=10){env.now=t;calls.length=0;env.drawCupcake(0,infect,1);assert.equal(calls.length,2);assert.deepEqual(calls[0].slice(1,7),calls[1].slice(1,7),'Infection tint must share the sprite pose');assert.equal(calls[0][1],100);assert.equal(calls[0][2],200);}
console.log('PASS: resting sprites stay fixed; pointer response settles at 300ms and hit at 420ms; reduced motion is still; hit and hover do not stack; tint and body stay aligned.');
