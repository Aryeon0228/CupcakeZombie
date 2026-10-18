import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio, json
from playwright.async_api import async_playwright
S = json.load(open('solutions.json'))['sol']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        ctx = await b.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=1, is_mobile=True, has_touch=True, locale='ko-KR')
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto((ROOT / 'out/www/index.html').as_uri()); await pg.wait_for_timeout(2400)
        await pg.screenshot(path='../out/n_title.png')
        # (stage index, delay after first tap)
        for li, ms in [(43, 1700), (40, 1500), (50, 300), (52, 1300), (59, 200)]:
            await pg.evaluate(f'startStage({li})'); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'../out/n_{li+1}_intro.png')
            await pg.evaluate('hideIntro()'); await pg.wait_for_timeout(400)
            if ms > 300:
                await pg.evaluate(f'fireAt({S[li][0]})'); await pg.wait_for_timeout(ms)
            await pg.screenshot(path=f'../out/n_{li+1}.png')
            for _ in range(100):
                await pg.wait_for_timeout(100)
                if not await pg.evaluate('busy'): break
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
