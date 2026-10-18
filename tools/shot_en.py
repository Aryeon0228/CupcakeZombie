import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio
from playwright.async_api import async_playwright
URL = (ROOT / 'out/www/index.html').as_uri()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, locale='en-US')
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL); await pg.wait_for_timeout(800)
        print('lang', await pg.evaluate('LANG'))
        await pg.screenshot(path='../out/e_title.png')
        await pg.click('#mapBtn'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='../out/e_map.png')
        await pg.evaluate('startStage(20)'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='../out/e_intro.png')
        await pg.click('#introGo'); await pg.wait_for_timeout(200)
        wrong = await pg.evaluate("""() => { for (let i=0;i<state.cells.length;i++){ if(!canTarget(state,i)) continue; if (playTurn(state,i).res==='lost') return i; } return -1; }""")
        box = await pg.locator('#board').bounding_box(); g = await pg.evaluate('({S, padX, padTop, W: state.W})')
        i = await pg.evaluate("state.cells.findIndex(c=>c&&!c.inf)")
        r, c = divmod(i, g['W'])
        await pg.touchscreen.tap(box['x'] + g['padX'] + (c + 0.5) * g['S'], box['y'] + g['padTop'] + (r + 0.5) * g['S']); await pg.wait_for_timeout(300)
        await pg.screenshot(path='../out/e_select.png')
        await pg.evaluate(f'fireAt({wrong if wrong >= 0 else i})')
        for _ in range(100):
            await pg.wait_for_timeout(100)
            if not await pg.evaluate('busy'): break
        await pg.wait_for_timeout(700)
        await pg.screenshot(path='../out/e_result.png')
        await pg.click('#resultClose'); await pg.wait_for_timeout(200)
        await pg.click('#helpBtn'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='../out/e_legend.png')
        await pg.click('#legendClose'); await pg.wait_for_timeout(200)
        await pg.evaluate("openSettings()"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='../out/e_settings.png')
        await pg.click('.segbtn[data-lang="ko"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='../out/e_settings_ko.png')
        await pg.click('#settingsClose'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='../out/e_after_ko.png')
        print('\n'.join(errs) or 'no errors')
        await b.close()
asyncio.run(main())
