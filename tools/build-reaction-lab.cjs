const fs = require('node:fs'), path = require('node:path');
const { loadRigAssets } = require('./rig-assets.cjs');
const root = path.resolve(__dirname, '..');
const assets = loadRigAssets(root);
for (const key of ['basic', 'butter']) assets[key] = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets', key + '.png')).toString('base64');
const rig = fs.readFileSync(path.join(root, 'src/cupcake-reactions.js'), 'utf8');
const render = fs.readFileSync(path.join(root, 'src/game-render.js'), 'utf8');
const bodyMotion = render.slice(render.indexOf('function cupcakePose('), render.indexOf('\nfunction drawCupcake('));
const measure = render.slice(render.indexOf('function measure('), render.indexOf('\nfunction loadImages('));
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>버터도, 파닥! · 컵케이크 반응실</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#eee4d3;color:#49342e;font:15px/1.5 -apple-system,BlinkMacSystemFont,sans-serif}main{max-width:460px;margin:auto;padding:24px 20px 30px}.eyebrow{font-size:11px;letter-spacing:.15em;font-weight:800;color:#7a7d40;margin:0 0 6px}h1{font-size:28px;line-height:1.2;margin:0 0 8px}.intro{margin:0 0 18px;color:#776151}button{font:inherit;font-weight:750;padding:10px 14px;min-height:44px;border:2px solid #584235;border-radius:13px;background:#fff9eb;box-shadow:0 4px #584235;color:#49342e;cursor:pointer;touch-action:manipulation}button:active{transform:translateY(3px);box-shadow:0 1px #584235}button:focus-visible,input:focus-visible{outline:3px solid #769eac;outline-offset:4px}button:disabled{opacity:.5;cursor:wait}.flavors{display:flex;gap:10px;margin:16px 0}.flavors button[aria-pressed=true]{background:#f7d374}.stage{background:#fff8e9;border:3px solid #584235;border-radius:24px;box-shadow:0 6px #c4ad92;overflow:hidden}canvas{width:100%;aspect-ratio:720/666;display:block;touch-action:manipulation}.caption{margin:0;padding:0 12px 12px;text-align:center;font-size:12px;color:#806c59}.controls{display:flex;gap:10px;margin:20px 0 16px}.controls button{flex:1}.controls .primary{background:#bdd6ad}.toggles{display:flex;gap:8px 16px;flex-wrap:wrap;margin:0 0 16px}.toggles label{display:flex;align-items:center;gap:5px;min-height:32px;font-size:13px;cursor:pointer}input{accent-color:#65824c}input[type=checkbox]{width:17px;height:17px}.scrub{display:block;background:#e4d7c4;border-radius:14px;padding:12px 14px;font-size:12px}.scrub span{display:flex;justify-content:space-between}input[type=range]{width:100%;display:block;margin:10px 0 0}output{font-variant-numeric:tabular-nums}.note{font-size:12px;color:#806c59;margin:16px 0 0}.back{display:inline-block;margin-top:14px;font-size:13px;color:#53713b} @media(max-width:350px){main{padding:16px}h1{font-size:25px}.intro{font-size:13px}.toggles{gap:4px 10px}}@media(prefers-reduced-motion:reduce){button:active{transform:none}}
</style>
<main><p class="eyebrow">CUPCAKE ZOMBIE · REACTION LAB</p><h1>버터도, 파닥!</h1><p class="intro">시크한 얼굴로 버티다가… 팔은 솔직하네.</p>
<div class="flavors" role="group" aria-label="컵케이크 선택"><button data-flavor="butter" aria-pressed="true">버터</button><button data-flavor="basic" aria-pressed="false">초코 머핀</button></div>
<div class="stage"><canvas id="sample" width="720" height="666" aria-label="버터 컵케이크. 아래 버튼으로 반응을 재생할 수 있어요."></canvas><p class="caption" id="caption">분리해 준 원화로 움직여요 · 발 위치는 고정</p></div>
<div class="controls"><button id="play" class="primary" disabled>뽀잉 + 파닥!</button><button id="slow" disabled>천천히 보기</button></div>
<div class="toggles" role="group" aria-label="움직임 비교"><label><input id="bodyMotion" type="checkbox" checked>몸통 뽀잉</label><label><input id="armsMotion" type="checkbox" checked>팔 파닥</label><label><input id="eyesMotion" type="checkbox" checked>눈 깜짝</label></div>
<label class="scrub"><span>동작 살펴보기 <output id="age">불러오는 중</output></span><input id="scrub" aria-label="애니메이션 시간" type="range" min="0" max="460" value="460" disabled></label>
<p class="note" id="note">모자 아래 눈매와 입은 그대로. 따로 준 큰 눈은 깜짝 놀랄 때만 나타나요.</p>
<a class="back" href="./#stage-16">게임에서도 버터 만나기 →</a></main>
<script>const IMG={},META={};${rig}\n${bodyMotion}\n${measure}
const cv=document.getElementById('sample'),g=cv.getContext('2d'),slider=document.getElementById('scrub'),ageLabel=document.getElementById('age'),media=matchMedia('(prefers-reduced-motion: reduce)');
const checks={body:document.getElementById('bodyMotion'),arms:document.getElementById('armsMotion'),eyes:document.getElementById('eyesMotion')};
let flavor='butter',frame=null,age=460,ready=false;
function draw(next=460){
 age=Math.min(460,Math.max(0,next));if(!ready)return;
 const key=flavor,m=META[key],sc=key==='butter'?3.15:3.8;
 const body=checks.body.checked?cupcakePose({bumpAt:-1,peekAt:0},age,media.matches):{sx:1,sy:1};
 const p=cupcakeReactionPose(age,media.matches);
 if(!checks.arms.checked)p.arms=0;if(!checks.eyes.checked)p.eyes=1;
 g.clearRect(0,0,720,666);g.fillStyle='#ded4bc';g.beginPath();g.ellipse(360,548,156,22,0,0,Math.PI*2);g.fill();
 if(!p.active||!drawCupcakeRig(g,key,360,548,sc,body.sx,body.sy,p)){
   g.save();g.translate(360,548);g.scale(sc*body.sx,sc*body.sy);g.drawImage(IMG[key],-m.ax,-m.ay);g.restore();
 }
 slider.value=age;ageLabel.textContent=media.matches?'동작 줄이기':age>=460?'평소':Math.round(age)+'ms';
}
function stop(){cancelAnimationFrame(frame);frame=null;}
function play(speed=1){if(!ready)return;stop();if(media.matches){draw();return}const start=performance.now();function tick(t){draw((t-start)/speed);if(age<460)frame=requestAnimationFrame(tick);else frame=null}frame=requestAnimationFrame(tick)}
document.getElementById('play').onclick=()=>play();document.getElementById('slow').onclick=()=>play(3);cv.onclick=()=>play();
slider.oninput=()=>{stop();draw(Number(slider.value))};
for(const check of Object.values(checks))check.onchange=()=>{if(frame!==null)draw(age);else if(age>=460)play();else draw(age)};
for(const button of document.querySelectorAll('[data-flavor]'))button.onclick=()=>{
 stop();flavor=button.dataset.flavor;
 for(const b of document.querySelectorAll('[data-flavor]'))b.setAttribute('aria-pressed',String(b===button));
 document.querySelector('h1').textContent=flavor==='butter'?'버터도, 파닥!':'앗, 나 불렀어?';
 document.querySelector('.intro').textContent=flavor==='butter'?'시크한 얼굴로 버티다가… 팔은 솔직하네.':'초코 머핀도 뽀잉과 파닥을 함께.';
 cv.setAttribute('aria-label',(flavor==='butter'?'버터':'초코 머핀')+' 컵케이크. 아래 버튼으로 반응을 재생할 수 있어요.');
 document.getElementById('note').textContent=flavor==='butter'?'모자 아래 눈매와 입은 그대로. 따로 준 큰 눈은 깜짝 놀랄 때만 나타나요.':'기존 그림의 팔과 눈을 분리해서 움직여요. 몸통 뽀잉도 그대로 살아 있어요.';
 document.getElementById('caption').textContent=flavor==='butter'?'분리해 준 원화로 움직여요 · 발 위치는 고정':'초코 머핀 첫 시안 · 발 위치는 고정';
 draw();
};
media.addEventListener('change',()=>{stop();draw()});
Promise.all(Object.entries(${JSON.stringify(assets)}).map(([key,src])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{IMG[key]=im;META[key]={...measure(im),k:1};resolve()};im.onerror=()=>reject(new Error('image'));im.src=src}))).then(()=>{
 installCupcakeRigs();ready=true;document.getElementById('play').disabled=false;document.getElementById('slow').disabled=false;slider.disabled=false;draw();
}).catch(()=>{ageLabel.textContent='그림을 불러오지 못했어요. 새로고침해 주세요.'});
</script></html>`;
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
fs.writeFileSync(path.join(root, 'out/reaction-lab.html'), html);
console.log('Built out/reaction-lab.html with butter artist layers and shared production motion.');
