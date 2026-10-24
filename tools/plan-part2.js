// Part 2, chapters 24–26: two new cupcakes, one timing rule and one routing rule.
// coconut snow (k): spreads nothing; when it spoils, snow covers the eight cells around it for the rest of the turn — pop it last.
// grapefruit yogurt (f): spreads like a muffin, but whatever it infects turns sour and cannot pass spores on — the chain ends there.
// The other seventeen flavors of the new menu stay in reserve (no rule, not on the shelf) until a rule needs them.
const INTRO = {
  k: { kind: 'type', t: 'k', title: '코코넛 스노우', text: '상하는 순간 둘레 여덟 칸에 눈이 내려요. 눈 맞은 컵케익은 이번 턴엔 안 상해요. 연쇄 맨 마지막에 터뜨리세요.' },
  f: { kind: 'type', t: 'f', title: '자몽 요거트', text: '상하면 위·아래·양옆으로 옮기지만, 자몽한테 옮은 컵케익은 시큼해서 더는 못 옮겨요. 자몽을 먼저 쏘면 양쪽 길이 끊겨요.' },
};
const EN = { chapters: {}, stages: {}, intros: {
  k: { title: 'Coconut Snow', text: 'The moment it spoils, snow falls on the eight cells around it. Snowed-on cupcakes can\'t spoil this turn. Pop it last in a chain.' },
  f: { title: 'Grapefruit Yogurt', text: 'Spreads up, down, left and right, but whatever it infects turns sour and can\'t pass spores on. Shoot the grapefruit first and both sides of the path are cut.' },
} };
const B = { W: 6, H: 6, density: 0.56, tries: 14000 };
const themes = [
  [24, '눈 내리는 진열대', 'Snow on the Shelf', 'k', { o: 1, x: .8, s: .2, c: .3, m: .3, u: .3, l: .2, k: .5 }, { k: 1 },
    '코코넛이 상하면 둘레에 눈이 내려요. 연쇄가 코코넛에 일찍 닿으면 거기서 끊겨요.',
    'Snow falls around a spoiled coconut. If the chain reaches it early, the chain ends there.',
    ['첫눈', '눈 위의 발자국', '코코아 한 잔', '눈사람 셋', '눈 녹기 전에', '작은 눈밭', '마지막에 터뜨리기', '난로 앞에서', '눈보라 손님', '하얀 진열대'],
    ['First Snow', 'Footprints in Snow', 'A Cup of Cocoa', 'Three Snowmen', 'Before the Snow Melts', 'Little Snowfield', 'Pop It Last', 'By the Fireplace', 'Blizzard Customers', 'The White Shelf'],
    [
      { grid: ['ooo', 'oko', 'ooo'], customers: [], spores: 2, intro: INTRO.k },
      { spores: 2, require: { k: 1 }, minCells: 14, maxFirst: 3, minWaves: 5 },
      { spores: 2, greedy: true, minFirst: 2, maxFirst: 6, minCells: 15, feature: undefined },
      { spores: 2, require: { k: 2 }, minCells: 16, maxFirst: 2, minWaves: 5 },
      { spores: 3, require: { k: 2 }, customerTurns: [1], minCells: 17, maxFirst: 2, minWaves: 5, greedy: false },
      { spores: 2, require: { k: 1 }, W: 5, H: 5, density: .62, minCells: 12, maxCells: 18, maxFirst: 2 },
      { spores: 3, require: { k: 2 }, wraps: 1, minCells: 17, maxFirst: 2, minWaves: 5 },
      { spores: 2, greedy: true, minFirst: 2, maxFirst: 5, minCells: 15, feature: undefined },
      { spores: 3, require: { k: 2 }, customerTurns: [1, 2], minCells: 19, maxFirst: 2, greedy: false, minWaves: 5 },
      { spores: 3, require: { k: 3 }, W: 7, H: 7, customerTurns: [2], kids: [1], minCells: 23, maxCells: 32, maxFirst: 2, greedy: false, minWaves: 6, tries: 20000 },
    ]],
  [25, '시큼한 자몽', 'Sour Grapefruit', 'f', { o: 1, x: .8, s: .25, c: .35, m: .3, u: .3, b: .2, e: .2, f: .5 }, { f: 1 },
    '자몽이 옮긴 컵케익은 상하지만 더는 못 옮겨요. 자몽 너머로 가려면 다른 길이 필요해요.',
    'A cupcake the grapefruit infects spoils but spreads no further. Getting past it takes another route.',
    ['자몽 한 조각', '끊긴 길', '요거트 쉬는 시간', '돌아가는 길', '시큼한 손님', '작은 자몽', '두 갈래 자몽', '달콤한 휴식', '자몽과 비닐', '시큼한 진열대'],
    ['A Slice of Grapefruit', 'The Cut Path', 'Yogurt Break', 'The Long Way Around', 'Sour Customers', 'Little Grapefruit', 'Forked Grapefruit', 'Sweet Rest', 'Grapefruit and Wrap', 'The Sour Shelf'],
    [
      { grid: ['oofoo'], customers: [], spores: 2, intro: INTRO.f },
      { spores: 2, require: { f: 1 }, minCells: 14, maxFirst: 3, minWaves: 5 },
      { spores: 2, greedy: true, minFirst: 2, maxFirst: 6, minCells: 15, feature: undefined },
      { spores: 2, require: { f: 2 }, minCells: 16, maxFirst: 2, minWaves: 5 },
      { spores: 3, require: { f: 2 }, customerTurns: [1], minCells: 17, maxFirst: 2, minWaves: 5, greedy: false },
      { spores: 2, require: { f: 1 }, W: 5, H: 5, density: .62, minCells: 12, maxCells: 18, maxFirst: 2 },
      { spores: 3, require: { f: 2 }, orders: [1], minCells: 17, maxFirst: 2, minWaves: 5 },
      { spores: 2, greedy: true, minFirst: 2, maxFirst: 5, minCells: 15, feature: undefined },
      { spores: 3, require: { f: 2 }, wraps: 2, customerTurns: [1, 2], minCells: 19, maxFirst: 2, greedy: false, minWaves: 5 },
      { spores: 3, require: { f: 3 }, W: 7, H: 7, customerTurns: [1], pickies: [2], minCells: 23, maxCells: 32, maxFirst: 2, greedy: false, minWaves: 6, tries: 20000 },
    ]],
  [26, '눈과 자몽', 'Snow and Grapefruit', 'k', { o: 1, x: .8, s: .2, c: .3, m: .3, u: .3, l: .2, e: .2, k: .4, f: .4 }, { k: 1, f: 1 },
    '코코넛은 마지막에, 자몽은 길이 끊기는 자리를 생각하면서. 둘을 같이 써요.',
    'Coconut last, grapefruit where the path may break. Both rules at once.',
    ['눈과 자몽', '차가운 시큼함', '겨울 티타임', '눈 속의 자몽', '얼어붙은 길', '작은 겨울', '순서가 전부', '마지막 쉼표', '눈보라와 시큼', '겨울 진열대 마감'],
    ['Snow and Grapefruit', 'Cold and Sour', 'Winter Tea Time', 'Grapefruit in the Snow', 'Frozen Path', 'Little Winter', 'Order Is Everything', 'One Last Pause', 'Blizzard and Sour', 'Winter Shelf Closing'],
    [
      { spores: 2, require: { k: 1, f: 1 }, minCells: 14, maxCells: 20, maxFirst: 3, feature: 'f' },
      { spores: 2, require: { k: 1, f: 1 }, minCells: 15, maxFirst: 2, minWaves: 5, feature: 'k' },
      { spores: 2, greedy: true, minFirst: 2, maxFirst: 6, minCells: 15, feature: undefined },
      { spores: 2, require: { k: 1, f: 2 }, minCells: 16, maxFirst: 2, minWaves: 5, feature: 'f' },
      { spores: 3, require: { k: 2, f: 1 }, customerTurns: [1], minCells: 17, maxFirst: 2, minWaves: 5, greedy: false, feature: 'k' },
      { spores: 2, require: { k: 1, f: 1 }, W: 5, H: 5, density: .62, minCells: 12, maxCells: 18, maxFirst: 2, feature: 'f' },
      { spores: 3, require: { k: 2, f: 2 }, kids: [1], minCells: 17, maxFirst: 2, minWaves: 5, feature: 'k' },
      { spores: 2, greedy: true, minFirst: 2, maxFirst: 5, minCells: 15, feature: undefined },
      { spores: 3, require: { k: 2, f: 2 }, wraps: 1, customerTurns: [1, 2], minCells: 19, maxFirst: 2, greedy: false, minWaves: 5, feature: 'f' },
      { spores: 3, require: { k: 3, f: 2 }, W: 7, H: 7, customerTurns: [1, 2], orders: [2], minCells: 24, maxCells: 32, maxFirst: 1, greedy: false, minWaves: 6, tries: 20000, feature: 'k' },
    ]],
];
const CH = [];
for (const [no, name, name_en, feature, weights, required, tip, tip_en, names, names_en, specs] of themes) {
  const stages = specs.map((sp, j) => {
    const st = { name: names[j], tip, ...B, weights: { ...weights }, require: { ...required }, feature, ...sp };
    if ('feature' in sp && sp.feature === undefined) delete st.feature;
    if (!st.grid) { Object.assign(st, require('./curve-targets.js').targets(no, j, st.spores)); st.tries = Math.max(st.tries || 0, 30000); }
    EN.stages[no + '-' + (j + 1)] = [names_en[j], tip_en];
    return st;
  });
  CH.push({ no, name, stages }); EN.chapters[no] = name_en;
}
module.exports = { CH, EN };
