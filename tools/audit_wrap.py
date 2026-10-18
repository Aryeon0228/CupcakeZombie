import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio, json, sys
from playwright.async_api import async_playwright
DETECT = r"""
() => {
  const out = [];
  const vis = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.hidden) return false; } return true; };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const word = c => /[\p{L}\p{N}]/u.test(c);
  const byEl = new Map();
  for (let n; (n = walker.nextNode());) {
    const p = n.parentElement; if (!p || !n.data.trim() || !vis(p)) continue;
    if (p.closest('script,style,svg')) continue;
    const r = document.createRange(); let prevTop = null, prevCh = '';
    for (let i = 0; i < n.data.length; i++) {
      const ch = n.data[i]; if (ch === '\n') continue;
      r.setStart(n, i); r.setEnd(n, i + 1); const rs = r.getClientRects(); if (!rs.length) continue;
      const top = rs[0].top;
      if (prevTop !== null && top > prevTop + 4 && word(prevCh) && word(ch)) out.push({ kind: 'mid-word', text: p.textContent.trim().slice(0, 80), at: n.data.slice(Math.max(0,i-4), i) + '|' + n.data.slice(i, i+4) });
      if (rs[0].width > 0) { prevTop = top; prevCh = ch; }
    }
  }
  // orphans: block elements whose last line holds 1-2 characters
  for (const el of document.querySelectorAll('p,h1,h2,h3,.hintline,.toast,li,button,span,div')) {
    if (!vis(el) || el.children.length) continue;
    const t = el.textContent.trim(); if (t.length < 6) continue;
    const r = document.createRange(); r.selectNodeContents(el);
    const lines = [...r.getClientRects()].filter(x => x.width > 0);
    const tops = [...new Set(lines.map(x => Math.round(x.top)))];
    if (tops.length < 2) continue;
    const last = lines.filter(x => Math.round(x.top) === tops[tops.length - 1]).reduce((a, x) => a + x.width, 0);
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (last < fs * 2.2) out.push({ kind: 'orphan', text: t.slice(0, 80) });
  }
  return out;
}
"""
async def main():
    found = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for lang in ['ko-KR', 'en-US']:
            for w, h in [(320, 568), (375, 667), (393, 852)]:
                ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, locale=lang)
                pg = await ctx.new_page()
                await pg.goto((ROOT / 'out/www/index.html').as_uri()); await pg.wait_for_timeout(1500)
                async def chk(label):
                    for f in await pg.evaluate(DETECT):
                        key = (f['kind'], f['text'], f.get('at',''))
                        found.setdefault(key, []).append(f'{lang[:2]}{w} {label}')
                await chk('title')
                await pg.evaluate("showScreen('map')"); await pg.wait_for_timeout(300); await chk('map')
                n = await pg.evaluate('LEVELS.length')
                for i in range(n):
                    await pg.evaluate(f'startStage({i})'); await pg.wait_for_timeout(250)
                    await chk(f'stage{i+1}-intro')
                    await pg.evaluate('hideIntro()'); await pg.wait_for_timeout(150); await chk(f'stage{i+1}')
                for i, k in [(20, 'out'), (20, 'lost'), (5, 'win')]:
                    await pg.evaluate(f'startStage({i})'); await pg.evaluate('hideIntro()')
                    await pg.evaluate(f"showResult('{k}', 3)"); await pg.wait_for_timeout(500); await chk(f'result-{k}')
                    await pg.evaluate("document.querySelectorAll('.sheet').forEach(s=>{s.classList.remove('open');s.hidden=true})")
                await pg.evaluate('startStage(59)'); await pg.evaluate('hideIntro()')
                for fn in ['openSettings()', "openSheet('legendSheet')"]:
                    try:
                        await pg.evaluate(fn); await pg.wait_for_timeout(500); await chk(fn)
                    except Exception as e: print('ERR', fn, e)
                    await pg.evaluate("document.querySelectorAll('.sheet').forEach(s=>{s.classList.remove('open');s.hidden=true})")
                await ctx.close()
        await b.close()
    for (kind, text, at), where in sorted(found.items()):
        print(kind, '|', text, '|', at, '|', len(where), where[:3])
    print('total', len(found))
asyncio.run(main())
