// Chapters 7–20: authored themes, names, teaching beats, and solver-checked recipes.
// Recipes are deterministic; generated boards and their provenance live in genout/plan.
const INTRO = {
 u: {kind:'type',t:'u',title:'블루베리',text:'대각선으로 한 칸과 두 칸에 포자가 튀어요. 빈칸은 건너뛰지만 바로 앞 민트초코는 못 넘어요.'},
 r: {kind:'type',t:'r',title:'시나몬롤',text:'바로 옆은 건너뛰고, 십자와 대각선으로 두 칸 떨어진 여덟 곳에 퍼져요. 중간에 민트초코가 있으면 그 방향은 막혀요.'},
};
const themes = [
 [7,'보랏빛 도약','Blueberry Leaps','u',{o:1,x:.7,u:.65,m:.2}, {u:2},
  '블루베리의 두 칸 대각선을 따라가 보세요. 바로 앞 민트초코는 넘을 수 없어요.',
  'Trace the blueberry’s two-cell diagonals. A mint wall in the next cell blocks the jump.',
  ['블루베리 첫 점프','대각선 건너편','베리 한 줌','비스듬한 다리','두 점프의 교차점','작은 점프 연습','대각선 배달','보랏빛 쉼표','점프 순서','보랏빛 대연쇄'],
  ['First Blueberry Jump','Across the Diagonal','A Handful of Berries','Slanted Bridge','Crossing Jumps','Little Jump Practice','Diagonal Delivery','Purple Pause','Jump Order','The Blueberry Chain']],
 [8,'시나몬의 빈자리','Cinnamon’s Missing Middle','r',{o:1,x:.7,r:.55,u:.25}, {r:2},
  '시나몬 바로 옆은 안전해요. 두 칸 떨어진 자리와 가까운 자리를 나눠 생각해 보세요.',
  'Cells right beside cinnamon are skipped. Plan separately for nearby and distant cupcakes.',
  ['시나몬의 고리','바로 옆은 비워 두기','달콤한 간격','고리 밖의 친구','비어 있는 중심','한 입 쉬어가기','두 겹의 고리','시나몬 휴식','안쪽부터 바깥으로','고리의 끝'],
  ['Cinnamon Ring','Skip the Neighbor','Sweet Spacing','Outside the Ring','The Missing Middle','A Small Bite','Two Rings','Cinnamon Break','Inside and Outside','Ring Finale']],
 [9,'포장 작업대','The Wrapping Bench','wrap',{o:1,x:.8,s:.2,c:.3,u:.35,r:.2},{},
  '퍼져야 할 컵케이크가 포장돼 있다면 직접 쏴서 열어 주세요.',
  'A wrapped cupcake that must pass spores onward needs a direct shot.',
  ['얇은 비닐','열어야 할 다리','포장지 한 장','건너편 포장','뜯는 순서','작은 선물','포장된 도약','리본 없는 휴식','세 겹의 선택','작업대 정리'],
  ['Thin Plastic','Open the Bridge','One Wrapper','Wrapped Across','Opening Order','Small Gift','Wrapped Leap','Unwrapped Break','Three Choices','Clear the Bench']],
 [10,'민트 정원','Mint Garden','n',{o:1,x:.65,c:.6,m:.3,u:.45,r:.25,n:.6},{n:2,c:1},
  '민트초코는 상하지 않는 벽이에요. 막힌 방향 대신 돌아가는 연쇄를 찾아보세요.',
  'Mint Choco is an unspoiling wall. Find a route around its blocked directions.',
  ['정원 입구','민트 울타리','잎사귀 사이','돌아가는 점프','벽 너머의 체리','작은 화단','갈림길 정원','그늘 아래 쉼표','정원 미로','민트 정원 출구'],
  ['Garden Gate','Mint Hedge','Between Leaves','Jump Around','Cherry Beyond the Wall','Little Flowerbed','Garden Fork','Shade Break','Garden Maze','Garden Exit']],
 [11,'찻잔 너머','Beyond the Teacup','g',{o:1,x:.8,g:.65,u:.3,r:.25,c:.2},{g:3},
  '얼그레이의 향은 다른 얼그레이에게만 전해져요. 나머지는 별도의 연쇄로 이어 주세요.',
  'Earl Grey reaches only other Earl Greys. Connect the remaining cupcakes with another chain.',
  ['멀리 있는 찻잔','향기의 징검다리','따뜻한 한 모금','향과 대각선','닿지 않는 이웃','작은 티타임','향기 우편','찻잔의 쉼표','차가 식기 전에','찻잔 너머의 연쇄'],
  ['Distant Teacup','Stepping Scents','Warm Sip','Scent and Diagonals','Unreached Neighbor','Tiny Tea Time','Scent Mail','Teacup Pause','Before Tea Cools','Beyond the Teacup']],
 [12,'차가운 약속','Chilled Promises','l',{o:1,x:.8,l:.6,u:.3,c:.3,s:.2},{l:2},
  '손님 확인이 레몬의 해동보다 먼저예요. 신선한 채 팔리는 컵케이크가 없도록 순서를 잡으세요.',
  'Customers are checked before lemons thaw. Plan so no customer finds a fresh cupcake.',
  ['서리의 약속','한 박자 차이','차가운 휴식','먼저 오는 손님','서리 너머의 길','작은 냉장고','두 번째 약속','해동 시간','엇갈린 도착','마지막 해동'],
  ['Frost Promise','One Beat Apart','Chilled Break','Early Customer','Beyond the Frost','Small Cooler','Second Promise','Thaw Time','Crossed Arrivals','Final Thaw']],
 [13,'버터와 진한 커피','Butter and Strong Coffee','e',{o:1,x:.7,b:.6,e:.55,u:.25,r:.25},{b:2,e:2},
  '에스프레소의 센 포자는 버터 뚜껑과 비닐을 뚫어요. 커피가 닿을 자리를 먼저 보세요.',
  'Strong espresso spores open butter lids and wrappers. Trace where the coffee can reach.',
  ['아침의 버터','커피 한 방울','고소한 휴식','뚜껑의 교차로','한 방의 자리','작은 커피잔','포장을 뚫고','버터 타임','진한 순서','공방의 마지막 잔'],
  ['Morning Butter','Drop of Coffee','Buttery Break','Lid Crossing','One Strong Spot','Small Cup','Through the Wrap','Butter Time','Strong Order','The Last Cup']],
 [14,'체리 골목길','Cherry Alley','defl',{o:1,x:.7,c:.9,m:.25,u:.25},{c:3},
  '주걱에서 체리의 방향이 바뀌어요. 빈칸을 지나 처음 만나는 컵케이크까지 길을 따라가세요.',
  'Spatulas turn cherries. Follow each path through empty cells to its first cupcake.',
  ['골목 입구','한 번 꺾기','골목의 벤치','두 모퉁이','돌고 돌아','작은 샛길','대각선에서 만나요','체리 쉼터','출구를 향해','골목길 완주'],
  ['Alley Entrance','One Turn','Alley Bench','Two Corners','Roundabout','Small Side Street','Meet the Diagonal','Cherry Rest Stop','Toward the Exit','Through the Alley']],
 [15,'교차하는 포자','Crossing Spores','u',{o:1,x:.9,u:.6,r:.4,m:.35,s:.2},{u:2,r:1,m:1},
  '십자·대각선·두 칸 고리를 구별해 보세요. 방향이 다른 컵케이크들이 다리가 돼요.',
  'Separate plus, diagonal, and two-cell ring patterns. Different spreaders bridge the gaps.',
  ['교차로','엇갈린 대각선','포자 쉼표','멀고 가까운 다리','네 갈래 교차','작은 교차점','대각선 릴레이','엇박자 휴식','겹치는 영역','교차로의 끝'],
  ['Crossroads','Offset Diagonals','Spore Pause','Near and Far Bridges','Four-Way Crossing','Small Junction','Diagonal Relay','Offbeat Break','Overlapping Regions','Crossroads Finale']],
 [16,'단체 주문','Group Orders','cust',{o:1,x:.8,s:.25,c:.4,m:.3,u:.3,r:.25,e:.2},{},
  '빨간 숫자가 작은 손님부터 확인하세요. 한 번의 연쇄로 같은 턴의 주문을 함께 처리해야 해요.',
  'Check the earliest red numbers first. One chain may need to cover several orders.',
  ['주문표 한 장','함께 오는 손님','주문 사이 휴식','두 번째 테이블','동시 주문','작은 예약','세 번째 손님','주문 마감 전','줄 서는 시간','단체 주문 완료'],
  ['One Order Slip','Arriving Together','Between Orders','Second Table','Simultaneous Orders','Small Booking','Third Customer','Before Orders Close','Queue Time','All Orders Served']],
 [17,'작은 진열대','Little Shelves','r',{o:1,x:.8,u:.5,r:.5,m:.2,b:.15},{r:1,u:1},
  '작은 판일수록 한 자리의 역할이 커요. 시나몬이 건너뛴 가까운 컵케이크를 잊지 마세요.',
  'Every position matters on a small shelf. Remember the neighbors cinnamon skips.',
  ['손바닥 진열대','작은 간격','미니 휴식','다섯 칸의 선택','작은 고리','한 접시','좁은 대각선','작은 숨 고르기','빈칸 하나의 차이','작은 판의 피날레'],
  ['Palm-Sized Shelf','Little Gap','Mini Break','Five-Cell Choices','Small Ring','One Plate','Narrow Diagonal','Little Breather','One Empty Cell','Small Shelf Finale']],
 [18,'두 갈래 연쇄','Forked Chains','wrap',{o:1,x:.8,c:.4,u:.4,r:.3,g:.3,b:.25},{u:1,r:1},
  '포자를 나눠 쓸 영역을 먼저 찾아보세요. 포장 때문에 끊기는 길도 계산해야 해요.',
  'Find which regions need separate spores. Account for paths cut off by wrappers.',
  ['두 갈래 시작','떨어진 진열대','갈림길 휴식','첫 번째 다리','이어야 할 틈','작은 갈림길','향기와 포장','쉬어가는 연쇄','세 번의 연결','갈림길의 합류'],
  ['Two Beginnings','Separated Shelves','Fork Break','First Bridge','Bridge the Gap','Small Fork','Scent and Wrap','Resting Chain','Three Connections','Chains Reunited']],
 [19,'마지막 영업','The Last Service','cust',{o:1,x:.8,s:.2,c:.4,m:.25,b:.25,g:.3,l:.3,n:.25,e:.3,u:.35,r:.3},{u:1,r:1},
  '새로운 점프와 고리에 손님 순서까지 더해져요. 가장 크게 번지는 첫 수가 답인지 확인하세요.',
  'Combine jumps and rings with customer timing. Check whether the biggest first chain really works.',
  ['마지막 영업 시작','예약된 진열대','물 한 잔','동시에 울린 벨','밤의 교차점','작은 마지막 주문','차례를 지켜요','닫기 전 휴식','마지막 줄','오늘의 마지막 손님'],
  ['Last Service Begins','Reserved Shelf','A Glass of Water','Two Bells','Night Crossing','Small Last Order','Keep the Order','Before Closing','Final Queue','Last Customer Today']],
 [20,'곰팡이의 축제','The Mold Festival','r',{o:1,x:.8,s:.2,c:.45,m:.3,b:.25,g:.3,l:.3,n:.25,e:.35,u:.4,r:.45},{u:2,r:2},
  '지금까지 배운 방향과 시간차를 함께 써 보세요. 민트 벽과 포장, 손님까지 살펴보세요.',
  'Combine every direction and timing rule. Check mint walls, wrappers, and customers.',
  ['축제의 문','포자의 행진','축제 간식','커다란 고리','춤추는 연쇄','작은 축제','모두의 진열대','마지막 쉼표','199번째 포자','200번째 진열대'],
  ['Festival Gate','Spore Parade','Festival Snack','The Grand Ring','Dancing Chain','Little Festival','Everyone’s Shelf','One Last Pause','Spore 199','The 200th Shelf']],
];
const CH=[], EN={chapters:{},stages:{},intros:{
 u:{title:'Blueberry',text:'Spreads one and two cells along each diagonal. It crosses gaps, but an adjacent Mint Choco blocks that direction.'},
 r:{title:'Cinnamon Roll',text:'Skips adjacent cells and spreads exactly two cells along the four straight and four diagonal directions. Mint Choco in between blocks that ray.'},
}};
for(const [no,name,name_en,feature,weights,required,tip,tip_en,names,names_en] of themes){
 const stages=[];
 for(let j=0;j<10;j++){
  const rest=j===2||j===7, small=j===5||no===17, finale=j===9, hard=j===4||j===8||finale;
  let st={name:names[j],tip,W:small?5:finale?7:6,H:small?5:finale?7:6,
   density:small?.59:.55,weights:{...weights},require:{...required},
   spores:j===0||j===5?1:j>=8?3:2,minCells:small?12:finale?23:15,
   maxCells:small?20:finale?32:26,maxFirst:rest?6:hard?2:3,
   minFirst:rest?2:1,minWaves:hard?6:0,tries:12000,
   feature:rest?undefined:feature,designFocus:name,difficultyBand:rest?'休憩':hard?'挑戦':'練習'};
  if(rest)st.greedy=true;
  if(j>=8){st.greedy=false;st.maxFirst=finale?1:2;st.wraps=1;st.customerTurns=[1,2];}
  if(no===9||no===18){st.wraps=small?1:finale?3:2;st.density=.59;}
  if(no===10){st.density=.5;if(j>=6)st.deflectors=2;}
  if(no===12){st.customerTurns=j>=8?[1,2]:[1];st.spores=j===5?2:st.spores;}
  if(no===13&&j>=3)st.wraps=1;
  if(no===14){st.density=.40;st.deflectors=small?1:3;st.minCells=small?10:finale?20:13;}
  if(no===14&&finale){st.tries=120000;st.minCells=18;st.minWaves=6;}
  if(no===16||no===19)st.customerTurns=j===1||j===4?[1,1]:j>=8?[1,2,3]:j>=6?[1,2]:[1];
  if(no===16)st.spores=Math.max(2,st.spores);
  if(no===17){st.minCells=12;st.maxCells=20;st.minWaves=hard?5:0;}
  if(no>=19&&j>=3){st.wraps=rest?1:2;st.deflectors=2;}
  if(no===20&&j>=6)st.customerTurns=j>=8?[1,2,3]:[1];
  // Rest stages genuinely ease the decision count; avoid overconstraining them.
  if(rest){delete st.feature;st.minWaves=0;delete st.customerTurns;}
  // A one-spore opening cannot serve a second/third-turn order and is deliberately smaller.
  if(st.spores===1){st.maxCells=small?17:20;st.minCells=small?10:12;st.minSurvivors=2;delete st.greedy;}
  if(j===0&&no===7){st={...st,grid:['o...o','.o.o.','..u..','.o.o.','o...o'],customers:[],intro:INTRO.u,spores:1};}
  if(j===0&&no===8){st={...st,grid:['o.o.o','.....','o.r.o','.....','o.o.o'],customers:[],intro:INTRO.r,spores:1};}
  stages.push(st);EN.stages[no+'-'+(j+1)]=[names_en[j],tip_en];
 }
 CH.push({no,name,stages});EN.chapters[no]=name_en;
}
module.exports={CH,EN};

