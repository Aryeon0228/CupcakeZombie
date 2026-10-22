// Run after node tools/build.js. Requires playwright and a Chromium browser.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),solutions=require('./solutions.json').sol;
const web=process.env.WEB_TEST_PAGE||path.join(root,'out/www/index.html');
const native=process.env.NATIVE_TEST_PAGE||path.join(root,'capacitor/www/index.html');
const qa=path.join(root,'out/qa-web-stage-select');fs.mkdirSync(qa,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname;
  if(p==='/index.html'||p==='/native.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(p==='/native.html'?native:web));}
  else if(p.startsWith('/vendor/')||p==='/native.js'){res.setHeader('Content-Type','text/javascript');res.end('');}
  else{res.statusCode=404;res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const errors=[],report={};
 async function fresh(kind='web',runtime=false){
  const c=await browser.newContext({viewport:{width:1000,height:900}});
  await c.addInitScript(({runtime})=>{
   localStorage.setItem('cupcake-zombie-v3',JSON.stringify({lang:'ko',sound:false,haptics:false,motion:'off',motionNoticed:true}));
   if(runtime)window.Capacitor={isNativePlatform:()=>true};
  },{runtime});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/fonts.googleapis.com/**',r=>r.abort());
  await p.goto(base+'/'+(kind==='native'?'native.html':'index.html'));
  await p.waitForFunction(()=>typeof IMG!=='undefined'&&IMG.basic&&document.getElementById('playBtn').textContent);
  return p;
 }
 async function playSolution(p,index){
  if(await p.evaluate(()=>introOpen))await p.locator('#introGo').click();
  const seq=solutions[index];assert.ok(Array.isArray(seq));
  for(const cell of seq){
   const pt=await p.evaluate(cell=>{const b=canvas.getBoundingClientRect();return {x:b.left+cxOf(cell)*b.width/CW,y:b.top+cyOf(cell)*b.height/CH,turn:state.turn}},cell);
   await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(40);
   assert.equal(await p.evaluate(()=>busy),false,'first click only previews');
   await p.mouse.click(pt.x,pt.y);
   await p.waitForFunction(turn=>state.turn===turn+1,pt.turn);
   await p.waitForFunction(()=>!busy,null,{timeout:20000});
  }
  await p.waitForFunction(()=>result==='win',null,{timeout:10000});
  await p.locator('#resultSheet.open').waitFor({state:'visible'});
 }
 try{
  const p=await fresh();
  await p.locator('#mapBtn').click();await p.waitForTimeout(120);
  report.web=await p.evaluate(()=>({stages:LEVELS.length,buttons:document.querySelectorAll('.stage-btn').length,locked:document.querySelectorAll('.stage-btn.locked').length,stars:totalStars(),free:WEB_STAGE_SELECT,form:!$('stageJumpForm').hidden}));
  assert.deepEqual(report.web,{stages:230,buttons:230,locked:0,stars:0,free:true,form:true});
  await p.screenshot({path:path.join(qa,'web-map.png')});
  const before=await p.evaluate(()=>({li,level:save.level,stars:totalStars()}));
  for(const value of ['', '0','231','1.5']){
   await p.locator('#stageNumber').fill(value);
   await p.locator('#stageJumpForm').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
   assert.equal(await p.evaluate(()=>screen),'map');
   assert.deepEqual(await p.evaluate(()=>({li,level:save.level,stars:totalStars()})),before);
  }
  await p.locator('#stageNumber').fill('230');await p.locator('#stageNumber').press('Enter');
  await p.waitForFunction(()=>screen==='play'&&li===229);
  assert.equal(await p.evaluate(()=>totalStars()),0);
  await p.screenshot({path:path.join(qa,'web-stage-230.png')});
  await playSolution(p,229);
  assert.equal(await p.evaluate(()=>starsOf(229)),3);
  assert.equal(await p.evaluate(()=>totalStars()),3,'only the played stage is awarded stars');
  await p.evaluate(()=>closeSheet('resultSheet'));await p.waitForTimeout(260);
  await p.locator('#backBtn').click();await p.waitForTimeout(200);
  report.returnToChapter=await p.evaluate(()=>({chapter:+document.querySelector('#chapterChips .on').dataset.no,value:$('stageNumber').value}));
  assert.deepEqual(report.returnToChapter,{chapter:23,value:'230'});
  await p.screenshot({path:path.join(qa,'web-map-last-chapter.png')});
  await p.locator('#chapterChips [data-no="1"]').click();await p.waitForTimeout(80);
  await p.locator('#chapter-1 .stage-btn').first().click();
  await p.waitForFunction(()=>screen==='play'&&li===0);
  if(await p.evaluate(()=>introOpen))await p.locator('#introGo').click();
  await p.locator('#backBtn').click();
  const layout=[];
  for(const width of [320,390,430]){
   await p.setViewportSize({width,height:844});await p.waitForTimeout(120);
   const r=await p.evaluate(()=>{const f=$('stageJumpForm').getBoundingClientRect(),a=$('app').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,formFits:f.left>=a.left&&f.right<=a.right,inputHeight:$('stageNumber').getBoundingClientRect().height};});
   assert.equal(r.overflow,false);assert.equal(r.formFits,true);assert.ok(r.inputHeight>=44);layout.push({width,...r});
  }
  report.responsive=layout;await p.screenshot({path:path.join(qa,'web-map-430.png')});
  await p.evaluate(()=>setLang('en'));
  assert.equal(await p.locator('label[for="stageNumber"]').textContent(),'Jump to stage');
  assert.match(await p.locator('#stageJumpNote').textContent(),/230/);
  report.english=true;
  report.native=[];
  for(const runtime of [false,true]){
   const np=await fresh('native',runtime);await np.setViewportSize({width:390,height:844});
   await np.locator('#mapBtn').click();await np.waitForTimeout(100);
   const r=await np.evaluate(()=>({native:Native,free:WEB_STAGE_SELECT,hidden:$('stageJumpForm').hidden,locked:document.querySelectorAll('.stage-btn.locked').length,stars:totalStars(),directLast:startStage(229)}));
   assert.deepEqual(r,{native:true,free:false,hidden:true,locked:229,stars:0,directLast:false});
   assert.equal(await np.evaluate(()=>screen),'map');
   await np.locator('#stageJumpForm').evaluate(f=>{document.getElementById('stageNumber').value=230;f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
   assert.equal(await np.evaluate(()=>screen),'map');
   await np.screenshot({path:path.join(qa,'native-map-'+runtime+'.png')});
   if(!runtime){
    await np.locator('#chapter-1 .stage-btn').nth(1).click();assert.equal(await np.evaluate(()=>screen),'map');
    await np.locator('#chapter-1 .stage-btn').first().click();await playSolution(np,0);
    await np.evaluate(()=>closeSheet('resultSheet'));await np.waitForTimeout(260);
    await np.locator('#backBtn').click();
    assert.equal(await np.locator('.stage-btn.locked').count(),228);
    await np.locator('#chapter-1 .stage-btn').nth(1).click();
    await np.waitForFunction(()=>screen==='play'&&li===1);
    report.nativeFirstClearUnlocksSecond=true;
   }
   report.native.push({runtimeBridge:runtime,...r});
  }
  assert.deepEqual(errors,[]);report.errors=errors;report.pass=true;
  fs.writeFileSync(path.join(root,'docs/web-stage-select-verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});

