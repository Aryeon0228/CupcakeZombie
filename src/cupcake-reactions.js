// Runtime paper-cut rig. The PNG stays untouched; the existing hand-drawn
// pixels are separated into a body, two shoulder-pivoted arms and two eyes.
// Start with the original muffin. Other flavors need their own shoulder/eye
// anchors before they can share this rig and its motion.
const CUPCAKE_RIG_PROFILES = {
  basic: {
    size: [115, 118],
    arms: [
      { pivot: [11, 74], side: 1, cut: [[9.5, 71], [12, 79], [14, 88], [0, 88], [0, 71]] },
      { pivot: [102, 75], side: -1, cut: [[103, 71], [99.5, 78], [96, 89], [115, 89], [115, 71]] }
    ],
    eyes: [{ x: 31, y: 30, rx: 6, ry: 8 }, { x: 79, y: 33, rx: 6, ry: 8 }]
  }
};
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
  return CUPCAKE_RIG_CACHE[key] = { body, arms, eyes };
}
function cupcakeReactionPose(age, reduced = false) {
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
function drawCupcakeReaction(g, key, x, by, sc, sx, sy, age, reduced = false) {
  const pose = cupcakeReactionPose(age, reduced);
  if (!pose.active) return false;
  const rig = prepareCupcakeRig(key), m = META[key];
  if (!rig || !m) return false;
  g.save(); g.translate(x, by); g.scale(sc * (m.k || 1) * sx, sc * (m.k || 1) * sy);
  g.translate(-m.ax, -m.ay);
  for (const arm of rig.arms) {
    g.save(); g.translate(...arm.pivot); g.rotate(arm.side * pose.arms);
    g.drawImage(arm.art, -arm.pivot[0], -arm.pivot[1]); g.restore();
  }
  g.drawImage(rig.body, 0, 0);
  for (const eye of rig.eyes) {
    g.save(); g.translate(eye.x, eye.y); g.scale(pose.eyes, 1 + (pose.eyes - 1) * 0.55);
    g.drawImage(eye.art, -eye.rx, -eye.ry); g.restore();
  }
  g.restore();
  return true;
}
