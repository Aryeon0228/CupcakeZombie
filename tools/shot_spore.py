import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        ctx = await b.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='ko-KR')
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT / 'out/www/index.html').as_uri()); await pg.wait_for_timeout(1500)
        await pg.evaluate('startStage(1)'); await pg.evaluate('hideIntro()'); await pg.wait_for_timeout(600)
        idx = await pg.evaluate("state.cells.findIndex((c,i)=>c&&canTarget(state,i)&&i>state.W*2)")
        box = await pg.evaluate(f"(()=>{{const r=canvas.getBoundingClientRect();return [r.left+cxOf({idx}), r.top+cyOf({idx})]}})()")
        await pg.evaluate(f'fireAt({idx})')
        t = 0
        for k, ms in enumerate([250, 200, 80, 60, 60, 70, 90]):
            await pg.wait_for_timeout(ms); t += ms
            await pg.screenshot(path=f'../out/sp_{k}.png', clip={'x': box[0]-60, 'y': box[1]-110, 'width': 120, 'height': 150})
        # intro card with spores
        await pg.evaluate('startStage(5)'); await pg.wait_for_timeout(600)
        await pg.screenshot(path='../out/sp_intro.png')
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
