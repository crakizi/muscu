import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"])
    pg = await b.new_page(viewport={"width":390,"height":844}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("file:///home/claude/app/index.local.html"); await pg.wait_for_timeout(800)
    await pg.click("button[data-act=scanHub]"); await pg.wait_for_timeout(2500)
    await pg.screenshot(path="hub.png"); await pg.click("#scanClose"); await pg.wait_for_timeout(300); await pg.screenshot(path="navbar.png", clip={"x":0,"y":744,"width":390,"height":100})
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
