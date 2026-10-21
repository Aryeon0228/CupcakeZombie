// Chapters 21–23: three new kinds of customer, one per chapter.
// kid = buys two cupcakes side by side at once; order = a delivery box takes a whole line; picky = walks away if a neighbour is spoiled.
// Body stages are tuned a notch harder than chapters 5–20 (fewer openings, a trap or two), finales are the hardest in the game so far.
const INTRO = {
  kid: { kind: 'kid', tag: '손님 등장', title: '꼬마 손님', text: '꼬마는 붙어 있는 컵케익 두 개를 한꺼번에 사 가요. 숫자만큼 턴이 지나기 전에 둘 다 상하게 만드세요. 하나라도 신선하면 집어 가요!' },
  order: { kind: 'order', tag: '손님 등장', title: '배달 주문', text: '점선 상자 안의 한 줄이 통째로 배달 나가요. 숫자만큼 턴이 지나기 전에 그 줄을 전부 상하게 만드세요. 상자에 신선한 게 하나라도 들어가면 실패!' },
  picky: { kind: 'picky', tag: '손님 등장', title: '깐깐한 손님', text: '깐깐한 손님은 옆 칸까지 깨끗해야 사 가요. 그 컵케익이나 옆 컵케익 중 하나만 상해 있어도 "흥" 하고 돌아가요. 상하게 만들 시간을 버는 거죠.' },
};
const EN = { chapters: {}, stages: {}, intros: {
  kid: { tag: 'New customer', title: 'Kid', text: 'A kid buys two cupcakes side by side at once. Spoil both before the turns run out. If either is fresh, the kid takes it!' },
  order: { tag: 'New customer', title: 'Delivery Order', text: 'The dashed box ships a whole line at once. Spoil every cupcake in it before the turns run out. One fresh cupcake in the box and you lose!' },
  picky: { tag: 'New customer', title: 'Picky Customer', text: 'A picky customer buys only if the cupcake and all its neighbors are clean. One spoiled cupcake next to it and they walk away — buying you time.' },
} };
const B = { W: 6, H: 6, density: 0.56, tries: 14000 };
const themes = [
  [21, '꼬마 손님', 'Little Customers', 'kid', { o: 1, x: .8, s: .25, c: .35, m: .3, u: .3 },
    '꼬마는 두 개를 같이 집어요. 둘 중 하나만 상해서는 소용없어요.',
    'A kid grabs two at once. Spoiling just one of the pair is not enough.',
    ['꼬마의 첫 주문', '둘이 한 묶음', '사탕 쉬는 시간', '언니랑 같이', '두 꼬마', '작은 손', '먼저 온 꼬마', '낮잠 시간', '세 번째 손가락', '꼬마들의 생일'],
    ['A Kid’s First Order', 'Two in a Bundle', 'Candy Break', 'With Big Sister', 'Two Kids', 'Little Hands', 'The Kid Came First', 'Nap Time', 'Third Finger', 'The Kids’ Birthday'],
    [
      { spores: 2, kids: [1], intro: INTRO.kid, density: .6, minCells: 14, maxCells: 20, maxFirst: 3 },
      { spores: 2, kids: [1], minCells: 15, maxFirst: 2, minWaves: 5 },
      { spores: 2, kids: [1], greedy: true, minFirst: 2, maxFirst: 6, minCells: 15 },
      { spores: 2, kids: [1], customerTurns: [1], minCells: 16, maxFirst: 2, minWaves: 5 },
      { spores: 3, kids: [1, 2], minCells: 17, maxFirst: 2, minWaves: 5, greedy: false },
      { spores: 2, kids: [1], W: 5, H: 5, density: .62, minCells: 12, maxCells: 18, maxFirst: 2 },
      { spores: 3, kids: [2], customerTurns: [1], minCells: 17, maxFirst: 2, minWaves: 5 },
      { spores: 2, kids: [1], greedy: true, minFirst: 2, maxFirst: 5, minCells: 15 },
      { spores: 3, kids: [1, 2], wraps: 1, minCells: 19, maxFirst: 2, greedy: false, minWaves: 5 },
      { spores: 3, kids: [1, 2], customerTurns: [2], W: 7, H: 7, minCells: 23, maxCells: 32, maxFirst: 2, greedy: false, minWaves: 6, tries: 20000 },
    ]],
  [22, '배달 주문', 'Delivery Orders', 'order', { o: 1, x: .8, s: .3, c: .4, m: .35, u: .3, r: .2 },
    '상자 안의 한 줄은 통째로 나가요. 그 줄을 먼저 끝내고 나머지를 생각하세요.',
    'The boxed line ships whole. Finish that line first, then think about the rest.',
    ['첫 배달 상자', '윗줄부터', '포장 쉬는 시간', '손님과 배달', '두 번째 상자', '작은 배달', '비닐 든 상자', '배달원의 낮잠', '마지막 주문서', '배달 트럭 출발'],
    ['First Delivery Box', 'Top Row First', 'Packing Break', 'Customer and Courier', 'Second Box', 'Small Delivery', 'Box with a Wrapper', 'Courier’s Nap', 'Last Order Slip', 'The Truck Leaves'],
    [
      { spores: 2, orders: [1], intro: INTRO.order, density: .6, minCells: 14, maxCells: 20, maxFirst: 3 },
      { spores: 2, orders: [1], minCells: 15, maxFirst: 2, minWaves: 5 },
      { spores: 2, orders: [1], greedy: true, minFirst: 2, maxFirst: 6, minCells: 15 },
      { spores: 2, orders: [1], customerTurns: [1], minCells: 16, maxFirst: 2, minWaves: 5 },
      { spores: 3, orders: [2], kids: [1], minCells: 17, maxFirst: 2, minWaves: 5, greedy: false },
      { spores: 2, orders: [1], W: 5, H: 5, density: .62, minCells: 12, maxCells: 18, maxFirst: 2 },
      { spores: 3, orders: [1], wraps: 1, minCells: 17, maxFirst: 2, minWaves: 5 },
      { spores: 2, orders: [1], greedy: true, minFirst: 2, maxFirst: 5, minCells: 15 },
      { spores: 3, orders: [2], customerTurns: [1], minCells: 19, maxFirst: 2, greedy: false, minWaves: 5 },
      { spores: 3, orders: [2], kids: [1], W: 7, H: 7, minCells: 23, maxCells: 32, maxFirst: 2, greedy: false, minWaves: 6, tries: 20000 },
    ]],
  [23, '깐깐한 손님', 'The Picky One', 'picky', { o: 1, x: .8, s: .25, c: .35, m: .3, g: .3, l: .3, e: .3, u: .3, r: .25 },
    '깐깐한 손님은 옆이 상하면 안 사요. 당장 못 상하게 하는 컵케익은 옆부터 더럽히세요.',
    'The picky one won’t buy next to mold. If you can’t spoil their cupcake yet, dirty a neighbor.',
    ['흥, 옆이 상했네', '옆자리 작전', '차 한 잔 쉬어 가기', '두 손님의 눈', '깐깐한 둘', '작은 가게의 손님', '꼬마와 깐깐이', '진열대 정리', '배달과 깐깐이', '오늘의 마지막 깐깐이'],
    ['Hmph, the Neighbor', 'Next-Door Plan', 'Tea Break', 'Two Pairs of Eyes', 'Two Picky Ones', 'Small Shop Visitor', 'Kid and the Picky One', 'Tidying the Shelf', 'Courier and the Picky One', 'Last Picky Customer'],
    [
      { spores: 2, pickies: [1], intro: INTRO.picky, density: .6, minCells: 14, maxCells: 20, maxFirst: 3 },
      { spores: 2, pickies: [1], minCells: 15, maxFirst: 2, minWaves: 5 },
      { spores: 2, pickies: [1], greedy: true, minFirst: 2, maxFirst: 6, minCells: 15 },
      { spores: 2, pickies: [1], customerTurns: [1], minCells: 16, maxFirst: 2, minWaves: 5 },
      { spores: 3, pickies: [1, 2], minCells: 18, maxFirst: 2, minWaves: 5, greedy: false },
      { spores: 2, pickies: [1], W: 5, H: 5, density: .62, minCells: 12, maxCells: 18, maxFirst: 2 },
      { spores: 3, pickies: [1], kids: [2], minCells: 17, maxFirst: 2, minWaves: 5 },
      { spores: 2, pickies: [1], greedy: true, minFirst: 2, maxFirst: 5, minCells: 15 },
      { spores: 3, pickies: [1], orders: [2], minCells: 18, maxFirst: 2, greedy: false, minWaves: 4, tries: 20000 },
      { spores: 3, pickies: [1], orders: [2], customerTurns: [2], W: 7, H: 7, minCells: 23, maxCells: 32, maxFirst: 2, greedy: false, minWaves: 6, tries: 20000 },
    ]],
];
const CH = [];
for (const [no, name, name_en, feature, weights, tip, tip_en, names, names_en, specs] of themes) {
  const stages = specs.map((sp, j) => {
    const st = { name: names[j], tip, ...B, weights: { ...weights }, feature, ...sp };
    if (st.spores === 1) { st.minSurvivors = st.minSurvivors || 2; delete st.greedy; }
    EN.stages[no + '-' + (j + 1)] = [names_en[j], tip_en];
    return st;
  });
  CH.push({ no, name, stages }); EN.chapters[no] = name_en;
}
module.exports = { CH, EN };
