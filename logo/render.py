import asyncio, json, sys
from playwright.async_api import async_playwright
src, out = sys.argv[1], sys.argv[2]
html = open(src).read().replace('__SPRITES__', open('sprites.json').read())
open('_render.html','w').write(html)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1040,'height':680}, device_scale_factor=1)
        errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/v3/logo/_render.html'); await pg.wait_for_function('document.body.dataset.ready', timeout=15000); await pg.wait_for_timeout(300)
        print(await pg.evaluate("document.fonts.check('40px Jua')"), errs or 'ok')
        await pg.locator('#logo').screenshot(path=out, omit_background=True)
        await b.close()
asyncio.run(main())
