import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 393, 'height': 852}, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto((ROOT / 'out/www/index.html').as_uri()); await pg.wait_for_timeout(600)
        await pg.screenshot(path='../out/chk_title.png')
        await pg.click('#mapBtn'); await pg.wait_for_timeout(200)
        await pg.evaluate('startStage(0)'); await pg.wait_for_timeout(300)
        await pg.click('#introGo'); await pg.wait_for_timeout(200)
        await pg.evaluate('fireAt(state.cells.findIndex(Boolean))')
        for _ in range(80):
            await pg.wait_for_timeout(100)
            if not await pg.evaluate('busy'): break
        await pg.wait_for_timeout(900)
        await pg.screenshot(path='../out/chk_win.png')
        await pg.click('#resultClose'); await pg.wait_for_timeout(300); await pg.click('#backBtn'); await pg.wait_for_timeout(300)
        print('screen', await pg.evaluate('screen'))
        print(errs or 'no errors')
        await b.close()
asyncio.run(main())
