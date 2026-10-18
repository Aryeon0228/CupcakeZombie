import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio, json
from playwright.async_api import async_playwright
S = json.load(open('solutions.json'))
async def run_seq(pg, seq):
    for i in seq:
        await pg.evaluate(f'fireAt({i})')
        for _ in range(100):
            await pg.wait_for_timeout(100)
            if not await pg.evaluate('busy'): break
    await pg.wait_for_timeout(800)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, locale='en-US')
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto((ROOT / 'out/www/index.html').as_uri()); await pg.wait_for_timeout(600)
        out = []
        for li, seq in enumerate(S['sol']):
            await pg.evaluate(f'startStage({li})'); await pg.evaluate('hideIntro()')
            await run_seq(pg, seq)
            out.append(f"{li+1}:{await pg.evaluate('result')}/{await pg.evaluate(f'save.stars[{li}]||0')}")
        await pg.evaluate('startDaily()'); await pg.evaluate('hideIntro()')
        idx = await pg.evaluate('dailyIndex()')
        print('daily index', idx)
        print(' '.join(out)); print(errs or 'no errors')
        await b.close()
asyncio.run(main())
