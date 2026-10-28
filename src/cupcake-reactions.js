// Paper-cut rigs share motion but keep each flavor's own artwork and anchors.
// The muffin uses runtime cutouts. Butter uses the artist's untouched layers.
const CUPCAKE_RIG_PROFILES = {
  basic: {
    size: [115, 118],
    arms: [
      { pivot: [11, 74], side: 1, cut: [[9.5, 71], [12, 79], [14, 88], [0, 88], [0, 71]] },
      { pivot: [102, 75], side: -1, cut: [[103, 71], [99.5, 78], [96, 89], [115, 89], [115, 71]] }
    ],
    eyes: [{ x: 31, y: 30, rx: 6, ry: 8 }, { x: 79, y: 33, rx: 6, ry: 8 }]
  },
  butter: {
    size: [115, 146],
    body: 'rig_butter_body',
    arms: [
      { source: 'rig_butter_Rhand', pivot: [12, 103], side: 1 },
      { source: 'rig_butter_Lhand', pivot: [100, 102], side: -1 }
    ],
    // Fade the supplied larger eye over the body's existing resting pupil.
    // R/L filenames are the character's sides, not the viewer's sides.
    eyes: [{ source: 'rig_butter_eyes', crop: [25, 56, 11, 15],
      x: 28, y: 64, rx: 5.5, ry: 7.5, overlay: true }]
  }
};
// Anchors in each source PNG, outside the paper cup edge.
for (const [key, size, left, right, reach] of [
  ['berry', [115,152], [11,106], [101,107], 17],
  ['sprinkle', [113,164], [10,112], [103,117], 14],
  ['cherry', [115,178], [11,132], [101,133], 18],
  ['cream', [115,157], [11,112], [101,113], 18],
  ['butter_open', [115,146], [12,103], [100,102], 18],
  ['earl_grey', [233,381], [26,280], [207,281], 32],
  ['lemon_yogurt', [233,350], [22,250], [209,249], 32],
  ['pending_lemon_yogurt', [242,356], [27,267], [215,267], 30],
  ['espresso', [233,379], [28,283], [209,282], 32],
  ['blueberry', [256,360], [30,252], [225,251], 34],
  ['cinnamon_roll', [256,360], [36,243], [220,240], 34],
  ['coconut_snow', [329,322], [72,229], [252,234], 31],
  ['grapefruit_yogurt', [328,330], [75,241], [254,245], 35]
]) {
  const arm = ([x,y], side) => ({ pivot: [x,y], side,
    cut: [[x-side*1.5,y-4], [x+side*reach*.22,y+reach],
      [side>0?0:size[0],y+reach], [side>0?0:size[0],y-4]] });
  CUPCAKE_RIG_PROFILES[key] = { size, arms: [arm(left,1),arm(right,-1)], eyes: [] };
}
const CUPCAKE_RIG_CACHE = {};
function rigCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function rigPolygon(g, points) {
  g.beginPath(); points.forEach(([x, y], n) => n ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
}
function prepareCupcakeRig(key) {
  if (CUPCAKE_RIG_CACHE[key]) return CUPCAKE_RIG_CACHE[key];
  const profile = CUPCAKE_RIG_PROFILES[key], im = IMG[key];
  if (!profile || !im || im.width !== profile.size[0] || im.height !== profile.size[1]) return null;
  if (profile.body) {
    const keys = [profile.body, ...profile.arms.map(a => a.source), ...profile.eyes.map(e => e.source)];
    if (keys.some(k => !IMG[k] || IMG[k].width !== im.width || IMG[k].height !== im.height)) return null;
    const body = IMG[profile.body];
    const arms = profile.arms.map(a => ({ ...a, art: IMG[a.source] }));
    const eyes = profile.eyes.map(eye => {
      const art = rigCanvas(eye.crop[2], eye.crop[3]);
      art.getContext('2d').drawImage(IMG[eye.source], ...eye.crop, 0, 0, art.width, art.height);
      return { ...eye, art };
    });
    const rest = rigCanvas(im.width, im.height), g = rest.getContext('2d');
    arms.forEach(a => g.drawImage(a.art, 0, 0));
    g.drawImage(body, 0, 0);
    return CUPCAKE_RIG_CACHE[key] = { body, arms, eyes, rest };
  }
  const body = rigCanvas(im.width, im.height), b = body.getContext('2d');
  b.drawImage(im, 0, 0);
  const arms = profile.arms.map(a => {
    const art = rigCanvas(im.width, im.height), g = art.getContext('2d');
    g.save(); rigPolygon(g, a.cut); g.clip(); g.drawImage(im, 0, 0); g.restore();
    b.save(); b.globalCompositeOperation = 'destination-out'; rigPolygon(b, a.cut); b.fill(); b.restore();
    return { ...a, art };
  });
  const eyes = profile.eyes.map(eye => {
    const art = rigCanvas(eye.rx * 2, eye.ry * 2), g = art.getContext('2d');
    g.drawImage(im, eye.x - eye.rx, eye.y - eye.ry, art.width, art.height, 0, 0, art.width, art.height);
    const pixels = g.getImageData(0, 0, art.width, art.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      // Preserve the original brown pencil grain; exclude surrounding sponge.
      const r = pixels.data[i], green = pixels.data[i + 1], blue = pixels.data[i + 2];
      if (r > 155 || green > 108 || blue > 90) pixels.data[i + 3] = 0;
    }
    g.putImageData(pixels, 0, 0);
    return { ...eye, art };
  });
  return CUPCAKE_RIG_CACHE[key] = { body, arms, eyes, rest: im };
}
function installCupcakeRigs() {
  for (const [key, profile] of Object.entries(CUPCAKE_RIG_PROFILES)) {
    if (!profile.body) continue;
    const rig = prepareCupcakeRig(key);
    // Share the resting composite with tints/outlines. Retain the original foot
    // metadata so switching between normal and rig drawing never shifts it.
    if (rig) IMG[key] = rig.rest;
  }
}
function cupcakeReactionPose(age, reduced = false, held = false) {
  if (held && !reduced && age >= 0) {
    const ease = Math.min(1, age / 120);
    return { active: true, arms: ease * (.75 + .42 * Math.sin(age / 320 * Math.PI * 2)), eyes: 1 + .32 * ease };
  }
  if (reduced || age < 0 || age >= 460) return { active: false, arms: 0, eyes: 1 };
  const t = age / 460;
  const envelope = Math.sin(Math.PI * t) ** 0.8;
  // Two small flaps, with a quiet start and finish. Feet never move.
  return {
    active: true,
    arms: envelope * (0.85 + 0.38 * Math.sin(t * Math.PI * 4)),
    eyes: 1 + 0.42 * Math.sin(Math.PI * Math.min(1, age / 360)) ** 0.7
  };
}
function drawCupcakeReaction(g, key, x, by, sc, sx, sy, age, reduced = false, held = false) {
  const pose = cupcakeReactionPose(age, reduced, held);
  if (!pose.active) return false;
  return drawCupcakeRig(g, key, x, by, sc, sx, sy, pose);
}
function drawCupcakeRig(g, key, x, by, sc, sx, sy, pose) {
  const rig = prepareCupcakeRig(key), m = META[key];
  if (!rig || !m) return false;
  g.save(); g.translate(x, by); g.scale(sc * (m.k || 1) * sx, sc * (m.k || 1) * sy);
  g.translate(-m.ax, -m.ay);
  if (pose.arms === 0 && pose.eyes === 1) {
    g.drawImage(rig.rest, 0, 0); g.restore(); return true;
  }
  for (const arm of rig.arms) {
    g.save(); g.translate(...arm.pivot); g.rotate(arm.side * pose.arms);
    g.drawImage(arm.art, -arm.pivot[0], -arm.pivot[1]); g.restore();
  }
  g.drawImage(rig.body, 0, 0);
  for (const eye of rig.eyes) {
    g.save(); g.translate(eye.x, eye.y);
    if (eye.overlay) {
      g.globalAlpha *= Math.max(0, Math.min(1, (pose.eyes - 1) / 0.42));
      g.scale(1 + (pose.eyes - 1) * 0.25, 1 + (pose.eyes - 1) * 0.25);
    } else g.scale(pose.eyes, 1 + (pose.eyes - 1) * 0.55);
    g.drawImage(eye.art, -eye.rx, -eye.ry); g.restore();
  }
  g.restore();
  return true;
}

