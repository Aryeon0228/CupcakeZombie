import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio, json
from playwright.async_api import async_playwright
S = json.load(open('solutions.json'))['sol']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        ctx = await b.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='ko-KR')
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT / 'out/www/index.html').as_uri()); await pg.wait_for_timeout(1500)
        for li in [0, 13, 38, 59]:
            await pg.evaluate(f'startStage({li})'); await pg.evaluate('hideIntro()'); await pg.wait_for_timeout(600)
            await pg.screenshot(path=f'../out/tr_{li+1}.png')
        await pg.evaluate(f'fireAt({S[59][0]})'); await pg.wait_for_timeout(2600)
        await pg.screenshot(path='../out/tr_60b.png')
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
