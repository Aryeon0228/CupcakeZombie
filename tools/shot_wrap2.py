import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        shots = [('ko-KR',320,"startStage(27);hideIntro()",'x1'),('ko-KR',375,"startStage(43)",'x2'),('ko-KR',320,"startStage(20);hideIntro();showResult('out')",'x3'),('en-US',320,"startStage(44)",'x4'),('ko-KR',393,"startStage(0)",'x5')]
        for lang,w,setup,name in shots:
            ctx = await b.new_context(viewport={'width': w, 'height': 640}, device_scale_factor=2, is_mobile=True, has_touch=True, locale=lang)
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto((ROOT / 'out/www/index.html').as_uri()); await pg.wait_for_timeout(1500)
            await pg.evaluate(setup); await pg.wait_for_timeout(700)
            await pg.screenshot(path=f'../out/{name}.png'); await ctx.close()
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
