import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio
from playwright.async_api import async_playwright
URL = (ROOT / 'out/www/index.html').as_uri()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, vw, vh, lvl in [('bg_iphone15', 393, 852, 24), ('bg_iphone15_7x7', 393, 852, 39), ('bg_se', 375, 667, 24), ('bg_ipad', 820, 1180, 24), ('bg_title', 393, 852, -1), ('bg_map', 393, 852, -2)]:
            ctx = await b.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=2, has_touch=True, is_mobile=True)
            pg = await ctx.new_page()
            await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
            await pg.goto(URL); await pg.wait_for_timeout(700)
            if lvl >= 0:
                await pg.evaluate(f'startStage({lvl})'); await pg.evaluate('hideIntro()')
            elif lvl == -2:
                await pg.evaluate("showScreen('map')")
            await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'../out/{name}.png')
            await ctx.close()
        await b.close()
asyncio.run(main())
