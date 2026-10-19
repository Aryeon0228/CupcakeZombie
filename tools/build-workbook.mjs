import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const D=JSON.parse(await fs.readFile(path.join(root,'docs/stages.json'),'utf8'));
const out=path.join(root,'outputs/cupcake-zombie-200');await fs.mkdir(out,{recursive:true});
const wb=Workbook.create(),overview=wb.worksheets.add('장별 설계'),stages=wb.worksheets.add('스테이지'),answers=wb.worksheets.add('정답');
const font='Arial',ink='#49342E',sage='#4C6539',light='#F4EFE5';
function base(s,range,title,widths){s.showGridLines=false;const r=s.getRange(range);r.format.font={name:font,size:11,color:ink};r.format.verticalAlignment='center';r.format.rowHeight=28;s.getRange('A2').values=[[title]];s.getRange('A2').format.font={name:font,size:16,bold:true,color:ink};s.getRange('A2').format.rowHeight=32;for(let i=0;i<widths.length;i++)s.getRangeByIndexes(0,i,1,1).format.columnWidthPx=widths[i];}
function table(s,address,name){const t=s.tables.add(address,true,name);t.style='TableStyleLight1';const r=t.getHeaderRowRange();r.format.fill=sage;r.format.font={name:font,size:11,bold:true,color:'#FFFFFF'};r.format.horizontalAlignment='center';r.format.rowHeight=34;}
base(stages,'A1:N206','스테이지 설계',[62,48,175,70,64,64,80,70,300,64,180,64,70,100]);
stages.getRange('A3').values=[['난도는 설계 분류입니다. 실제 플레이 시간과 실패 횟수로 보정하기 전 상태입니다.']];
stages.getRange('A4').values=[['출처: 이 버전의 docs/stages.json. 기존 판 기준: github.com/Aryeon0228/CupcakeZombie/commit/aa1a62f']];
stages.getRange('A3:N4').format.font={name:font,size:11,color:'#79685C'};
stages.getRange('A6:N6').values=[['번호','장','이름','판 크기','포자','최소 수','설계 난도','컵케이크','등장 종류와 개수','비닐','손님 도착 위치','주걱','성공 첫 수','탐욕법 성공']];
stages.getRange('A7:N206').values=D.stages.map(s=>[s.number,s.chapter,s.name,`${s.width}×${s.height}`,s.spores,s.minimumMoves,s.plannedDifficulty,s.cupcakes,Object.entries(s.counts).map(([k,n])=>`${D.types[k].name} ${n}`).join(', '),s.wrapped,s.customers.length?s.customers.map(c=>`${c.turn}턴: ${c.r+1}행 ${c.c+1}열`).join('\n'):'없음',s.spatulas,s.firstOptions,s.greedySolves?'성공':'실패']);
stages.getRange('A7:N206').format.rowHeight=64;stages.getRange('I7:K206').format.wrapText=true;
for(const c of ['A','B','E','F','H','J','L','M']){stages.getRange(`${c}7:${c}206`).setNumberFormat('0');stages.getRange(`${c}7:${c}206`).format.horizontalAlignment='right';}
table(stages,'A6:N206','StageDesign');stages.getRange('A7:N206').format.autofitRows();stages.freezePanes.freezeRows(6);stages.freezePanes.freezeColumns(3);
stages.getRange('G7:G206').conditionalFormats.add('containsText',{text:'도전',format:{fill:'#F4DBCC',font:{color:'#81442E'}}});
stages.getRange('G7:G206').conditionalFormats.add('containsText',{text:'쉬어가기',format:{fill:'#E8EEDB',font:{color:sage}}});
base(overview,'A1:H27','컵케익 좀비 200 스테이지',[48,210,95,80,95,90,90,260]);overview.tabColor=sage;
overview.getRange('A3').values=[['기존 1–60 유지. 새 61–200은 두 가지 새 맛과 기존 규칙을 조합합니다.']];
overview.getRange('A4').values=[['각 장의 마지막 두 판은 순서 판단을 강화했습니다. 도감에서 판 그림과 상세 특성을 확인할 수 있습니다.']];
overview.getRange('A5').values=[['1–60의 도전·쉬어가기 분류는 새로 매기지 않아 n.a.로 표시합니다.']];
overview.getRange('A6:H6').values=[['장','주제','구간','판 수','평균 최소 수','도전 판','쉬어가기 판','핵심 규칙']];
const focus=['십자·대각선·주변 연쇄','체리·크림·버터 뚜껑','손님 기한과 비닐 포장','주걱 경로와 종합 문제','얼그레이 연결과 레몬 지연','민트 벽과 에스프레소','대각선 1·2칸 점프','주변을 건너뛰는 2칸 고리','비닐과 직접 타격','민트 벽과 우회','얼그레이 원거리 연결','레몬 지연과 손님 순서','버터 뚜껑과 센 포자','체리와 주걱 경로','서로 다른 범위 연결','여러 주문의 기한','5×5 공간 배치','포장을 사이에 둔 분리 연쇄','종합 규칙과 고객 기한','전체 규칙의 종합 피날레'];
overview.getRange('A7:H26').values=D.chapters.map((c,i)=>[c.no,c.name,`${c.from+1}–${c.to+1}`,null,null,null,null,focus[i]]);
overview.getRange('D7:G26').formulas=D.chapters.map((c,i)=>{const r=7+i;return [`=COUNTIFS('스테이지'!$B$7:$B$206,$A${r})`,`=AVERAGEIFS('스테이지'!$F$7:$F$206,'스테이지'!$B$7:$B$206,$A${r})`,`=IF($A${r}<=6,"n.a.",COUNTIFS('스테이지'!$B$7:$B$206,$A${r},'스테이지'!$G$7:$G$206,"도전"))`,`=IF($A${r}<=6,"n.a.",COUNTIFS('스테이지'!$B$7:$B$206,$A${r},'스테이지'!$G$7:$G$206,"쉬어가기"))`];});
overview.getRange('E7:E26').setNumberFormat('0.0');overview.getRange('D27').formulas=[['=SUM(D7:D26)']];overview.getRange('B27').values=[['전체 스테이지']];overview.getRange('A27:H27').format.fill=light;overview.getRange('A27:H27').format.font.bold=true;table(overview,'A6:H26','Chapters');
const trace=D.stages.flatMap(s=>s.trace.map((v,i)=>[s.number,s.name,i+1,v.row,v.column,v.name,v.wrapped?'비닐 직접 열기':v.lid?'버터 뚜껑 있음':'일반 타격',v.spoiledAfter,v.freshAfter,v.customers.length?v.customers.map(c=>`${c.row}행 ${c.column}열: 상함`).join(', '):'없음',v.outcome==='win'?'클리어':'계속']));
const last=6+trace.length;
base(answers,`A1:K${last}`,'최소 포자 정답',[62,175,62,55,55,120,160,85,85,250,80]);
answers.getRange('A3').values=[['좌상단은 1행 1열. 가능한 최소 포자 해법 중 한 가지입니다. 같은 위치를 두 번 맞히는 수순도 있습니다.']];
answers.getRange('A4').values=[['한 수의 연쇄, 손님 확인, 레몬 지연 감염이 모두 끝난 뒤 다음 수를 누릅니다.']];
answers.getRange('A6:K6').values=[['번호','스테이지','순서','행','열','맞힐 컵케이크','타격 전 상태','새로 상함','남은 신선','이번 턴 손님','결과']];
answers.getRange(`A7:K${last}`).values=trace;answers.getRange(`A7:K${last}`).format.rowHeight=38;answers.getRange(`J7:J${last}`).format.wrapText=true;
table(answers,`A6:K${last}`,'Solutions');answers.freezePanes.freezeRows(6);answers.freezePanes.freezeColumns(2);
wb.recalculate();
assert.equal(overview.getRange('D27').values[0][0],200);
// Check that the chapter totals react to their data, then restore the verified source.
stages.getRange('B7').values=[[2]];wb.recalculate();assert.equal(overview.getRange('D7').values[0][0],9);assert.equal(overview.getRange('D8').values[0][0],11);
stages.getRange('B7').values=[[1]];wb.recalculate();assert.equal(overview.getRange('D7').values[0][0],10);
for(const range of ['장별 설계!A25:H27','스테이지!A204:N206',`정답!A${last-2}:K${last}`]){const r=await wb.inspect({kind:'table',range,include:'values,formulas',tableMaxRows:4,tableMaxCols:14,maxChars:3000});console.log(r.ndjson);}
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:10},maxChars:1200})).ndjson);
for(const [sheetName,range,file]of [['장별 설계','A1:H14','workbook-chapters.png'],['스테이지','A1:N11','workbook-stages.png'],['정답','A1:K13','workbook-solutions.png'],['스테이지','A202:N206','workbook-stage-200.png']]){const b=await wb.render({sheetName,range,scale:1,format:'png'});await fs.writeFile(path.join(root,'out/qa',file),new Uint8Array(await b.arrayBuffer()));}
const xlsx=await SpreadsheetFile.exportXlsx(wb);await xlsx.save(path.join(out,'CupcakeZombie-200-stage-design.xlsx'));
console.log('Exported',trace.length,'solution steps.');
