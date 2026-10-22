// npm install --no-save playwright; CHROME_PATH can select a local browser.
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..'), solutions = require('./solutions.json').sol;
(async()=>{
 const browser = await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const errors=[], report={}; fs.mkdirSync(path.join(root,'out/qa'),{recursive:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/fonts.googleapis.com/**',r=>r.abort());
 await page.goto('file://'+path.join(root,'out/www/index.html'));
 await page.waitForFunction(()=>typeof IMG!=='undefined'&&IMG.blueberry&&IMG.cinnamon_roll);
 await page.evaluate(()=>{save.sound=false;save.haptics=false;window.requestAnimationFrame=()=>0;
 // Synthetic PointerEvents have no native capture; real capture is checked with UI gestures.
 const captured=new Set();canvas.setPointerCapture=id=>captured.add(id);canvas.hasPointerCapture=id=>captured.has(id);canvas.releasePointerCapture=id=>captured.delete(id);});
 await page.waitForTimeout(80);
 await page.addStyleTag({content:'.screen{transition:none!important}'});
 report.viewport=[];
 for(const [width,height] of [[320,568],[390,844],[430,932]]){
  await page.setViewportSize({width,height});
  const geometry=await page.evaluate(()=>{startStage(199);hideIntro();layout();drawBg();frame(now+16);const r=canvas.getBoundingClientRect(),w=boardWrap.getBoundingClientRect();return {logical:[CW,CH],actual:[r.width,r.height],within:r.left>=w.left&&r.right<=w.right+1&&r.top>=w.top&&r.bottom<=w.bottom+1,bodyOverflow:document.documentElement.scrollWidth>innerWidth};});
  assert.ok(geometry.within);assert.equal(geometry.bodyOverflow,false);
  assert.ok(Math.abs(geometry.actual[0]/geometry.logical[0]-geometry.actual[1]/geometry.logical[1])<.003);
  report.viewport.push({width,height,...geometry});
  await page.waitForTimeout(40);await page.evaluate(()=>{frame(now+16);drawBg();});
  await page.screenshot({path:path.join(root,`out/qa/after-${width}.png`)});
 }
 await page.setViewportSize({width:390,height:844});
 report.input=await page.evaluate(()=>{
  startStage(60);hideIntro();layout();frame(now+16);
  const b=canvas.getBoundingClientRect(),p={x:b.left+cxOf(12),y:b.top+cyOf(12)};
  const ev=(type,x,y,kind='mouse')=>canvas.dispatchEvent(new PointerEvent(type,{clientX:x,clientY:y,pointerId:1,isPrimary:true,pointerType:kind,bubbles:true}));
  ev('pointerdown',p.x,p.y);ev('pointerup',p.x+30,p.y); const dragPreviews=selected===12&&!busy;
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  ev('pointerdown',p.x,p.y);ev('pointerup',p.x,p.y);const previews=selected===12&&!busy;
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));const escapeClears=selected===-1;
  ev('pointerdown',p.x,p.y);ev('pointerup',p.x,p.y);ev('pointerdown',p.x,p.y);ev('pointerup',p.x,p.y);const secondFires=busy&&state.turn===1;
  return {dragPreviews,previews,escapeClears,secondFires};
 }); console.log(report.input); Object.values(report.input).forEach(v=>assert.equal(v,true));
 report.animation=await page.evaluate(()=>{
  const start=projs.find(p=>p.style==='drop').t0;
  const counts=[];for(const t of [0,200,419,420,475,520,610,680]){frame(start+t);counts.push({t,drops:projs.filter(p=>p.style==='drop').length,landParticles:particles.filter(p=>p.kind==='land').length,pose:dropPose(t)});}
  return counts;
 });
 assert.ok(report.animation.every(v=>v.drops<=1&&v.landParticles===0));
 assert.equal(report.animation.at(-1).drops,0);
 for(const t of [250,420,475,580]){
  await page.evaluate(t=>{startStage(60);hideIntro();layout();fireAt(12);frame(now+t);drawBg();},t);
  await page.screenshot({path:path.join(root,`out/qa/drop-${t}.png`)});
 }
 const runs=[];
 for(let i=0;i<solutions.length;i++){
  const r=await page.evaluate(({i,seq})=>{
   startStage(i);hideIntro();layout();
   for(const idx of seq){
    const before=state.turn,b=canvas.getBoundingClientRect();
    const ev=type=>canvas.dispatchEvent(new PointerEvent(type,{clientX:b.left+cxOf(idx)*b.width/CW,clientY:b.top+cyOf(idx)*b.height/CH,pointerId:2,isPrimary:true,pointerType:'touch',bubbles:true}));
    ev('pointerdown');ev('pointerup');
    if(selected!==idx||state.turn!==before)throw Error('Preview failed '+(i+1));
    ev('pointerdown');ev('pointerup');
    if(state.turn!==before+1)throw Error('Fire failed '+(i+1));
    let ticks=0;while(busy&&ticks++<1800)frame(now+50);
    if(busy)throw Error('Stuck '+(i+1));
   }
   for(let k=0;k<40;k++)frame(now+50); // the win celebration runs 1.5s before the result sheet
   return {stage:i+1,result,stars:starsOf(i),fresh:freshCount(state)};
  },{i,seq:solutions[i]});
  assert.equal(r.result,'win');assert.equal(r.stars,3);assert.equal(r.fresh,0);runs.push(r);
  if((i+1)%50===0)console.log('UI replay',i+1);
 }
 report.stages=runs.length;report.totalStars=await page.evaluate(()=>totalStars());
 assert.equal(report.totalStars,solutions.length*3);
 report.map=await page.evaluate(()=>{showScreen('map');jumpToChapter(20);const a=$('chapter-20').getBoundingClientRect(),b=$('chapterList').getBoundingClientRect();return {chapters:$('chapterChips').children.length,buttons:document.querySelectorAll('.stage-btn').length,chapter20Visible:a.top>=b.top&&a.top<b.bottom};});
 assert.deepEqual(report.map,{chapters:Math.ceil(solutions.length/10),buttons:solutions.length,chapter20Visible:true});
 await page.screenshot({path:path.join(root,'out/qa/map-20.png')});
 report.sound=await page.evaluate(async()=>{save.sound=true;tone(500,.05);const exists=!!audioBus;save.sound=false;syncSound();await new Promise(r=>setTimeout(r,160));return {busCreated:exists,muted:audioBus.gain.value<.001};});
 assert.equal(report.sound.busCreated,true);assert.equal(report.sound.muted,true);
 // A fresh page evaluates the OS motion preference at startup.
 const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),rp=await reduced.newPage();
 rp.on('pageerror',e=>errors.push(e.message));await rp.route('**/fonts.googleapis.com/**',r=>r.abort());await rp.goto('file://'+path.join(root,'out/www/index.html'));
 await rp.waitForFunction(()=>typeof IMG!=='undefined'&&IMG.blueberry);
 report.reducedMotion=await rp.evaluate(()=>{save.sound=false;save.haptics=false;startStage(60);hideIntro();layout();fireAt(12);frame(now+DROP+50);return reduceMotion;});assert.equal(report.reducedMotion,true);
 report.errors=errors;assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(root,'docs/ui-verification.json'),JSON.stringify(report,null,2));
 await browser.close();console.log(JSON.stringify({stages:report.stages,stars:report.totalStars,errors}));
})().catch(e=>{console.error(e);process.exit(1);});
