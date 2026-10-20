// Button feedback never delays or repeats the button's own action.
const springButtons = '.btn, .stage-btn, .collection-tile, .segbtn';
const buttonPresses = new Map(), buttonSprings = new WeakMap();
let lastButtonNote = -Infinity;
function springButton(target) { return target?.closest?.(springButtons); }
function stopButtonSpring(b) { buttonSprings.get(b)?.cancel(); buttonSprings.delete(b); }
function pressButton(b) {
  if (!b || b.disabled) return;
  stopButtonSpring(b); b.classList.add('ui-pressed');
}
function releaseButton(b, bounce = true) {
  if (!b) return;
  b.classList.remove('ui-pressed');
  if (!bounce || b.disabled || !b.isConnected || reduceMotion || !b.animate) return;
  const hovering = matchMedia('(hover: hover) and (pointer: fine)').matches && b.matches(':hover');
  const rest = hovering ? 'translateY(-2px) rotate(-0.6deg) scale(1.035)' : 'translateY(0) rotate(0deg) scale(1)';
  const a = b.animate([
    { transform: 'translate(2px,3px) scale(1.04,.9)', offset: 0 },
    { transform: 'translateY(-3px) scale(.97,1.09)', offset: .3 },
    { transform: 'translateY(1px) scale(1.025,.975)', offset: .58 },
    { transform: 'translateY(-1px) scale(.995,1.015)', offset: .8 },
    { transform: rest, offset: 1 }
  ], { duration: 340, easing: 'ease-out' });
  buttonSprings.set(b, a);
  a.onfinish = () => { if (buttonSprings.get(b) === a) buttonSprings.delete(b); };
}
document.addEventListener('pointerdown', e => {
  if (e.isPrimary === false || e.button > 0) return;
  const b = springButton(e.target); if (!b || b.disabled) return;
  buttonPresses.set(e.pointerId, { b, x: e.clientX, y: e.clientY, moved: false }); pressButton(b);
}, true);
document.addEventListener('pointermove', e => {
  const p = buttonPresses.get(e.pointerId); if (!p) return;
  if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 12) { p.moved = true; releaseButton(p.b, false); }
}, true);
function endButtonPress(e, cancelled = false) {
  const p = buttonPresses.get(e.pointerId); if (!p) return;
  buttonPresses.delete(e.pointerId);
  const r = p.b.getBoundingClientRect();
  const inside = e.clientX >= r.left - 4 && e.clientX <= r.right + 4 && e.clientY >= r.top - 4 && e.clientY <= r.bottom + 4;
  releaseButton(p.b, !cancelled && !p.moved && inside);
}
document.addEventListener('pointerup', e => endButtonPress(e), true);
document.addEventListener('pointercancel', e => endButtonPress(e, true), true);
window.addEventListener('blur', () => { for (const p of buttonPresses.values()) releaseButton(p.b, false); buttonPresses.clear(); });
document.addEventListener('keydown', e => { if (!e.repeat && (e.key === ' ' || e.key === 'Enter')) pressButton(springButton(e.target)); }, true);
document.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') releaseButton(springButton(e.target)); }, true);
document.addEventListener('focusout', e => releaseButton(springButton(e.target), false), true);
document.addEventListener('click', e => {
  const b = e.target?.closest?.('button'); if (!b || b.disabled) return;
  const t = performance.now();
  if (t - lastButtonNote > 65) { lastButtonNote = t; buttonSound(); }
}, true);
