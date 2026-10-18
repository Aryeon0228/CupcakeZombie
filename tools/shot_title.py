import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        for name, vw, vh in [('t_15', 393, 852), ('t_se', 375, 667)]:
            ctx = await b.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='ko-KR')
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
            await pg.goto((ROOT / 'out/www/index.html').as_uri()); await pg.wait_for_timeout(2600)
            await pg.screenshot(path=f'../out/{name}.png')
            await pg.wait_for_timeout(1500); await pg.screenshot(path=f'../out/{name}_b.png')
            await ctx.close()
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
