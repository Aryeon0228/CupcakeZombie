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
        # butter stage 2-6 (index 15), lemon stage 5-4 (index 43)
        for li in [15, 43]:
            await pg.evaluate(f'startStage({li})'); await pg.evaluate('hideIntro()'); await pg.wait_for_timeout(600)
            await pg.screenshot(path=f'../out/rt_{li+1}.png')
        # lemon pending + zombie: fire a lemon on 5-4 and watch
        idx = await pg.evaluate("state.cells.findIndex(c=>c&&c.t==='l')")
        await pg.evaluate(f'fireAt({idx})'); await pg.wait_for_timeout(900)
        await pg.screenshot(path='../out/rt_pend.png')
        await pg.wait_for_timeout(3000); await pg.screenshot(path='../out/rt_after.png')
        # butter lid pop
        await pg.evaluate('startStage(15)'); await pg.evaluate('hideIntro()'); await pg.wait_for_timeout(400)
        bi = await pg.evaluate("state.cells.findIndex(c=>c&&c.t==='b')")
        await pg.evaluate(f'fireAt({bi})'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='../out/rt_lid.png')
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
