import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 693}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='ko-KR')
        pg = await ctx.new_page()
        await pg.goto((ROOT / 'out/www/index.html').as_uri()); await pg.wait_for_timeout(4000)
        print(await pg.evaluate("document.fonts.check('20px Jua')"))
        await pg.screenshot(path='../out/pf_title.png')
        await b.close()
asyncio.run(main())
