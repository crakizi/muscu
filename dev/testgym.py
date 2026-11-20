import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--ignore-gpu-blocklist"])
    pg = await b.new_page(viewport={"width":1200,"height":900}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("http://localhost:8765/index.local.html"); await pg.wait_for_timeout(600)
    await pg.click("nav button[data-v=workout]"); await pg.click("button[data-act=wMode][data-v='3d']"); await pg.wait_for_timeout(2500)
    el = await pg.query_selector("#scene3d"); await el.screenshot(path="gym1.png")
    await pg.evaluate("ACT_PICK_MACHINE('cardio')"); await pg.wait_for_timeout(300)
    print((await pg.inner_text(".sheet"))[:200])
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
