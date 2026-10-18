import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=2, has_touch=True, is_mobile=True)
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto((ROOT / 'out/www/index.html').as_uri()); await pg.wait_for_timeout(700)
        await pg.screenshot(path='../out/ch_title.png')
        for lvl in [2, 14, 24, 39]:
            await pg.evaluate(f'startStage({lvl})'); await pg.evaluate('hideIntro()'); await pg.wait_for_timeout(500)
            if lvl == 24:
                i = await pg.evaluate("state.cells.findIndex(c=>c&&!c.inf)")
                await pg.evaluate(f'fireAt({i})'); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f'../out/ch_{lvl}.png')
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
