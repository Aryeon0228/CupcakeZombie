import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio
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
        # slow the game clock 8x so frames can be captured
        await pg.evaluate("(()=>{const pn=performance.now.bind(performance);const t0=pn();performance.now=()=>t0+(pn()-t0)/8;const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>raf(()=>f(performance.now()));})()")
        await pg.wait_for_timeout(300)
        await pg.evaluate(f'window.__t0=performance.now();fireAt({idx})')
        for k in range(12):
            await pg.wait_for_timeout(450)
            e = await pg.evaluate('Math.round(performance.now()-__t0)')
            await pg.screenshot(path=f'../out/sq_{k}.png', clip={'x': box[0]-60, 'y': box[1]-110, 'width': 120, 'height': 150})
            print(k, e)
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
