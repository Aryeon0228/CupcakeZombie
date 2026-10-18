import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=1, is_mobile=True, locale='ko-KR')
        pg = await ctx.new_page(); await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto((ROOT / 'out/www/index.html').as_uri()); await pg.wait_for_timeout(1500)
        box = await pg.evaluate("(()=>{const r=document.getElementById('chase').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()")
        print(box, await pg.evaluate("getComputedStyle(document.getElementById('chase')).getPropertyValue('--chaseDur')"))
        for k in range(6):
            await pg.screenshot(path=f'../out/c_{k}.png', clip={'x':0,'y':box[1]-10,'width':393,'height':box[3]+20}); await pg.wait_for_timeout(1000)
        await b.close()
asyncio.run(main())
