import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio
from playwright.async_api import async_playwright
URL = (ROOT / 'out/www/index.html').as_uri()
FIND = """() => { for (let i=0;i<state.cells.length;i++){ if(!canTarget(state,i)) continue; const r=playTurn(state,i); if(r.res==='win') return i; } return state.cells.findIndex(Boolean); }"""
async def cellxy(pg, i):
    box = await pg.locator('#board').bounding_box()
    g = await pg.evaluate('({S, padX, padTop, W: state.W})')
    r, c = divmod(i, g['W'])
    return box['x'] + g['padX'] + (c + 0.5) * g['S'], box['y'] + g['padTop'] + (r + 0.5) * g['S']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL); await pg.wait_for_timeout(800)
        await pg.screenshot(path='../out/m_title.png')
        await pg.click('#mapBtn'); await pg.wait_for_timeout(400)
        await pg.screenshot(path='../out/m_map.png')
        await pg.evaluate('startStage(5)'); await pg.wait_for_timeout(400)
        await pg.screenshot(path='../out/m_intro.png')
        await pg.click('#introGo'); await pg.wait_for_timeout(300)
        i = await pg.evaluate(FIND)
        x, y = await cellxy(pg, i)
        await pg.touchscreen.tap(x, y); await pg.wait_for_timeout(300)
        await pg.screenshot(path='../out/m_select.png')
        await pg.click('#fireCta'); await pg.wait_for_timeout(1300)
        await pg.screenshot(path='../out/m_mid.png')
        await pg.wait_for_timeout(3800)
        await pg.screenshot(path='../out/m_win.png')
        # out-of-spores flow + hint
        await pg.evaluate('startStage(2)'); await pg.evaluate('hideIntro()'); await pg.wait_for_timeout(200)
        wrong = await pg.evaluate("""() => { for (let i=0;i<state.cells.length;i++){ if(!canTarget(state,i)) continue; if (playTurn(state,i).res==='out') return i; } return -1; }""")
        await pg.evaluate(f'fireAt({wrong})')
        for _ in range(80):
            await pg.wait_for_timeout(100)
            if not await pg.evaluate('busy'): break
        await pg.wait_for_timeout(600)
        await pg.screenshot(path='../out/m_out.png')
        await pg.evaluate('() => { onHint(); }'); await pg.wait_for_timeout(400)
        await pg.screenshot(path='../out/m_hint.png')
        await pg.evaluate("() => { save.hints = 0; hintCell = -1; onHint(); }"); await pg.wait_for_timeout(500)
        await pg.screenshot(path='../out/m_ad.png')
        await pg.click('#adSkip'); await pg.wait_for_timeout(300)
        await pg.evaluate("openSettings()"); await pg.wait_for_timeout(400)
        await pg.screenshot(path='../out/m_settings.png')
        await pg.click('#settingsClose'); await pg.wait_for_timeout(300)
        await pg.evaluate("startDaily()"); await pg.wait_for_timeout(400)
        await pg.screenshot(path='../out/m_daily.png')
        sw = await pg.evaluate('document.documentElement.scrollWidth')
        print('scrollWidth', sw); print('\n'.join(errs) or 'no errors')
        await b.close()
asyncio.run(main())
