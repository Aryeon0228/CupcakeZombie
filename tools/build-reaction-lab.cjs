const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname,'..');
const art = 'data:image/png;base64,' + fs.readFileSync(path.join(root,'assets/basic.png')).toString('base64');
const rig = fs.readFileSync(path.join(root,'src/cupcake-reactions.js'),'utf8');
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>컵케이크 · 파닥 실험</title>
<style>*{box-sizing:border-box}body{margin:0;background:#e7ddcc;color:#49342e;font:16px/1.5 -apple-system,sans-serif}main{max-width:420px;margin:28px auto;padding:20px}h1{font-size:24px;margin:0 0 8px}p{margin:0 0 20px}canvas{width:100%;aspect-ratio:1;display:block;border:3px solid #584235;border-radius:24px;background:#fff7e7;touch-action:manipulation}button{font:inherit;padding:12px 18px;border:2px solid #584235;border-radius:14px;background:#fff8ec;box-shadow:0 4px #584235;color:#49342e;cursor:pointer}button:active{transform:translateY(3px);box-shadow:0 1px #584235}.controls{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}label{display:block;margin:16px 0}input[type=range]{width:100%}.note{font-size:13px;color:#78634f}output{font-variant-numeric:tabular-nums}</style>
<main><h1>앗, 나 불렀어?</h1><p>초코 머핀 · 눈 동그랗게 + 팔 파닥</p><canvas id="sample" width="720" height="720" aria-label="클릭하면 잠깐 놀라는 초코 머핀"></canvas><div class="controls"><button id="play">한 번 파닥!</button><button id="slow">천천히 보기</button></div><label>동작 살펴보기 <output id="age">평소</output><input id="scrub" aria-label="애니메이션 시간" type="range" min="0" max="460" value="460"></label><p class="note">원화의 몸통·컵·토핑은 그대로 두고, 기존 팔과 눈을 따로 움직이는 시안이에요.</p></main>
<script>const IMG={},META={};${rig}
const cv=document.getElementById('sample'),g=cv.getContext('2d'),im=new Image(),slider=document.getElementById('scrub'),ageLabel=document.getElementById('age');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let started=-1,speed=1,frame=null;
function draw(age=460){g.clearRect(0,0,720,720);g.fillStyle='#ddd4bb';g.beginPath();g.ellipse(360,580,160,25,0,0,Math.PI*2);g.fill();if(!drawCupcakeReaction(g,'basic',360,580,3.65,1,1,age,reduced)){g.drawImage(im,360-META.basic.ax*3.65,580-META.basic.ay*3.65,im.width*3.65,im.height*3.65)}slider.value=Math.min(460,Math.max(0,age));ageLabel.textContent=age>=460?'평소':Math.round(age)+'ms';}
function play(s=1){cancelAnimationFrame(frame);speed=s;started=performance.now();function tick(t){const age=(t-started)/speed;draw(age);if(age<460)frame=requestAnimationFrame(tick)}frame=requestAnimationFrame(tick);}
im.onload=()=>{IMG.basic=im;META.basic={ax:56,ay:115,k:1};prepareCupcakeRig('basic');draw();};
document.getElementById('play').onclick=()=>play();document.getElementById('slow').onclick=()=>play(3);cv.onclick=()=>play();slider.oninput=()=>{cancelAnimationFrame(frame);draw(Number(slider.value))};im.src=${JSON.stringify(art)};
</script></html>`;
fs.mkdirSync(path.join(root,'out'),{recursive:true});
fs.writeFileSync(path.join(root,'out/reaction-lab.html'),html);
console.log('Built out/reaction-lab.html');
