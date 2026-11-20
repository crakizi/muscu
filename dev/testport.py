import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = await b.new_page(viewport={"width":390,"height":844}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("file:///home/claude/app/index.local.html"); await pg.wait_for_timeout(500)
    await pg.click("text=+ Ajouter un aliment"); await pg.fill("#q","oeuf"); await pg.wait_for_timeout(100)
    await pg.click("#qres .entry >> nth=0"); await pg.wait_for_timeout(200)
    await pg.click("button[data-act=gSet][data-v='58']"); await pg.click("button[data-act=gMul][data-v='3']"); await pg.wait_for_timeout(200)
    await pg.screenshot(path="port.png")
    print(await pg.input_value("#gIn")); print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
