import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--ignore-gpu-blocklist"])
    ctx = await b.new_context(viewport={"width":390,"height":844}, color_scheme="dark")
    pg = await ctx.new_page(); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("http://localhost:8765/"); await pg.wait_for_timeout(1500)
    await pg.screenshot(path="ui1.png", full_page=False)
    await pg.click("#fab"); await pg.wait_for_timeout(300); await pg.screenshot(path="ui2.png")
    await pg.click(".sheet button[data-act=quickWeight]"); await pg.fill("#qW","80.4"); await pg.click("button[data-act=quickWeightGo]"); await pg.wait_for_timeout(300)
    await pg.click("nav button[data-v=workout]"); await pg.wait_for_timeout(500); await pg.screenshot(path="ui3.png")
    await pg.click("button[data-act=wMode][data-v='3d']"); await pg.wait_for_timeout(2000); await pg.screenshot(path="ui4.png")
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
