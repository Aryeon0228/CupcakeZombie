import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        for lang in ['ko-KR','en-US']:
            ctx = await b.new_context(viewport={'width': 393, 'height': 852}, is_mobile=True, has_touch=True, locale=lang)
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
            await pg.goto((ROOT / 'out/www/index.html').as_uri()); await pg.wait_for_timeout(1200)
            for k in ['out','lost']:
                await pg.evaluate('startStage(20)'); await pg.evaluate('hideIntro()'); await pg.wait_for_timeout(300)
                await pg.evaluate(f"showResult('{k}')"); await pg.wait_for_timeout(700)
                await pg.screenshot(path=f'../out/lose_{lang[:2]}_{k}.png')
                await pg.evaluate("closeSheet && closeSheet('resultSheet')") if await pg.evaluate("typeof closeSheet==='function'") else None
            await ctx.close()
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
