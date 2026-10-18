import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for lang, setup, name in [('en-US', "showScreen('map')", 'w_map'), ('ko-KR', "startStage(27);hideIntro()", 'w_hud'), ('en-US', "startStage(59);hideIntro();openSheet('legendSheet')", 'w_leg'), ('ko-KR', "1", 'w_title')]:
            ctx = await b.new_context(viewport={'width': 320, 'height': 568}, device_scale_factor=2, is_mobile=True, has_touch=True, locale=lang)
            pg = await ctx.new_page()
            await pg.goto((ROOT / 'out/www/index.html').as_uri()); await pg.wait_for_timeout(1500)
            await pg.evaluate(setup); await pg.wait_for_timeout(700)
            await pg.screenshot(path=f'../out/{name}.png'); await ctx.close()
        await b.close()
asyncio.run(main())
