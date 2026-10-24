// Difficulty targets per (chapter, stage-in-chapter) for the generated chapters 5–23.
// bits = -log2(chance that random legal play wins): 4 ≈ one in sixteen, 8 ≈ one in 256.
// The chapter body climbs slowly from chapter to chapter; inside a chapter the shape is
// intro, warm-up, rest, body, hard, small, body+, rest, hard+, finale — a staircase, not a cliff.
const SHAPE = [-0.6, -0.2, -1.0, 0, 0.9, -0.5, 0.3, -0.8, 1.5, 2.3];
function targets(no, j, spores) {
  // Part 2 (chapters 24+) teaches new rules, so it starts a notch below the end of part 1 and climbs faster.
  const base = no >= 24 ? 5.0 + (no - 24) * 0.6 : 3.7 + (no - 5) * 0.17; // ch5 3.7 → ch20 6.25 → ch23 6.76; ch24 5.0 → ch26 6.2
  let t = base + SHAPE[j];
  if (no === 23 && j === 9) t = 9.8; // the last shelf of part 1 is the hardest of part 1
  if (no === 26 && j === 9) t = 8.8;
  const hard = j === 4 || j === 8 || j === 9, rest = j === 2 || j === 7;
  const out = {};
  if (spores >= 2) { const tol = j === 9 ? 0.7 : 0.6; out.minBits = +(t - tol).toFixed(2); out.maxBits = +(t + tol).toFixed(2); }
  // a tempting wrong opening (spoils as much as the right one) only exists with three spores; two-spore boards never have one
  if (!rest && spores >= 3) out.minTraps = j === 9 && no >= 10 ? 2 : 1;
  if ((no === 23 || no === 26) && j === 9) out.minTraps = 3;
  // "the biggest chain is not the answer" needs three spores; with two, the biggest chain is the answer almost by definition
  if (hard && spores >= 3) out.greedy = false;
  else if (rest) out.greedy = true;
  else if (j === 6 && no >= 13 && spores >= 3) out.greedy = false;
  return out;
}
module.exports = { targets, SHAPE };
