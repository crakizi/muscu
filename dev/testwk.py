import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.webkit.launch()
    pg = await b.new_page(viewport={"width":1200,"height":800}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE "+m.text) if m.type=="error" else None)
    await pg.goto("https://crakizi.github.io/muscu/"); await pg.wait_for_timeout(3000)
    print((await pg.inner_text("body"))[:200]); print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
