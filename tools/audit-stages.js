const assert=require('assert'),fs=require('fs'),path=require('path');
const hash = value => require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex');
const L=require('../src/logic.js'),G=require('./gen.js'),{LEVELS,CHAPTERS,DAILY}=require('../src/levels.js'),{CH}=require('./plan.js');
function solve(def){const memo=new Map();function go(s){const key=L.stateKey(s);if(memo.has(key))return memo.get(key);let best=null;for(let i=0;i<s.cells.length;i++){if(!L.canTarget(s,i))continue;const r=L.playTurn(s,i);let seq=r.res==='win'?[i]:r.res==='play'?go(r.state):null;if(seq&&r.res==='play')seq=[i,...seq];if(seq&&(!best||seq.length<best.length))best=seq;if(best&&best.length===1)break;}memo.set(key,best);return best;}return go(L.parseLevel(def));}
function canonical(def){let g=def.grid.map(r=>r.split('')),cs=(def.customers||[]).map(x=>({...x}));const keys=[];for(let k=0;k<4;k++){const H=g.length,W=g[0].length;for(const mirror of [false,true]){const a=mirror?g.map(row=>row.slice().reverse().map(c=>c==='/'?'\\':c==='\\'?'/':c)):g;const customers=cs.map(c=>({...c,c:mirror?W-1-c.c:c.c})).sort((a,b)=>a.turn-b.turn||a.r-b.r||a.c-b.c);keys.push(JSON.stringify([def.spores,a.map(r=>r.join('')),customers]));}g=Array.from({length:W},(_,r)=>Array.from({length:H},(_,c)=>{const v=g[H-1-c][r];return v==='/'?'\\':v==='\\'?'/':v;}));cs=cs.map(c=>({...c,r:c.c,c:H-1-c.r}));}return keys.sort()[0];}
const rows=[],seen=new Map(),sol=[],dupes=[];
for(let i=0;i<LEVELS.length;i++){const d=LEVELS[i],ch=CHAPTERS.find(c=>i>=c.from&&i<=c.to),spec=CH.find(c=>c.no===ch.no).stages[i-ch.from];
 const state=L.parseLevel(d);assert(state.W<=7&&state.H<=7);assert(d.grid.every(r=>r.length===state.W));
 const counts={};state.cells.forEach(c=>{if(c)counts[c.t]=(counts[c.t]||0)+1;});
 const a=G.analyze(d,{sequences:spec.feature==='wrap'}),seq=solve(d);assert(seq&&seq.length,'Unsolvable '+(i+1));if(i>=60){assert(!a.fewer,'Extra spore '+(i+1));if(!spec.grid)assert(G.fits(spec,d,a),'Recipe mismatch '+(i+1));}
 const trace=[];let s=state;for(const idx of seq){assert(L.canTarget(s,idx));const cell=s.cells[idx],r=L.playTurn(s,idx);trace.push({index:idx,row:Math.floor(idx/s.W)+1,column:idx%s.W+1,type:cell.t,name:L.TYPES[cell.t].name,wrapped:cell.wrap,lid:cell.lid,spoiledAfter:s.cells.filter((c,j)=>c&&!c.inf&&r.state.cells[j].inf).length,freshAfter:L.freshCount(r.state),outcome:r.res,customers:r.cust.map(c=>({row:c.k.r+1,column:c.k.c+1,fresh:c.fresh}))});s=r.state;}assert(trace.at(-1).outcome==='win','Replay '+(i+1));
 const key=canonical(d);if(seen.has(key))dupes.push([seen.get(key),i+1]);else seen.set(key,i+1);
 const row={number:i+1,chapter:ch.no,chapterName:ch.name,name:d.name,name_en:d.name_en,width:state.W,height:state.H,spores:d.spores,minimumMoves:seq.length,designFocus:spec.designFocus||ch.name,teaching:!!d.intro,plannedDifficulty:d.intro?'도입':i<60?'기존':spec.difficultyBand==='休憩'?'쉬어가기':spec.difficultyBand==='挑戦'?'도전':'기본',tip:d.tip,counts,cupcakes:L.freshCount(state),walls:counts.n||0,wrapped:state.cells.filter(c=>c&&c.wrap).length,spatulas:state.tiles.filter(Boolean).length,customers:d.customers||[],winningFirstMoves:a.firstWin.map(idx=>({index:idx,row:Math.floor(idx/state.W)+1,column:idx%state.W+1})),firstOptions:a.first,totalOptions:a.total,greedySolves:a.greedyWins,waves:a.maxWaves,solution:seq,trace,grid:d.grid};
 rows.push(row);sol.push(seq);
}
assert.strictEqual(LEVELS.length,200);assert.strictEqual(CHAPTERS.length,20);assert.strictEqual(dupes.filter(x=>x[1]>60).length,0,'Duplicate boards under symmetry');
// Fingerprints of the original aa1a62f campaign and daily pool: reproducible without local QA files.
assert.equal(hash(LEVELS.slice(0,60)), '13d792d4fd59f7d0fd764cad340e47f3e57c2210c901f2af90adc9d81fbf80ef');
assert.equal(hash(DAILY), '4983310c6099221253c4309d5fc1dc18c85ca7ad601bb15dd66945de6e274a25');
const preserved=true;
const dailySol=DAILY.map((d,i)=>{const a=solve(d);assert(a,'Daily '+i);return a;});
fs.mkdirSync(path.join(__dirname,'../docs'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'../docs/stages.json'),JSON.stringify({sourceCommit:'aa1a62ffb80878ccbd52dbfcc9f2f5895508727f',coordinateConvention:'좌상단이 1행 1열. 정답은 가능한 최소 포자 해법 중 한 가지.',difficultyNote:'설계 난도는 사람의 플레이 시간으로 보정하기 전 분류입니다.',chapters:CHAPTERS,types:L.TYPES,stages:rows},null,2));
fs.writeFileSync(path.join(__dirname,'solutions.json'),JSON.stringify({sol,daily:dailySol}));
const report={stages:rows.length,chapters:CHAPTERS.length,daily:DAILY.length,allSolutionsReplayed:true,duplicatePairs:dupes,newStagesUseMinimumBudget:true,original60AndDailyPreserved:preserved,newStageCount:140,newTypes:['u','r'],maxBoard:[Math.max(...rows.map(r=>r.width)),Math.max(...rows.map(r=>r.height))]};
fs.writeFileSync(path.join(__dirname,'../docs/stage-verification.json'),JSON.stringify(report,null,2));console.log(report);
module.exports={solve,canonical};
