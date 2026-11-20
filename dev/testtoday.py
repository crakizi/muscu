import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = await b.new_page(viewport={"width":430,"height":932}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("http://localhost:8765/index.local.html"); await pg.wait_for_timeout(500)
    await pg.evaluate("updDay(d=>{d.weight=80.4;d.steps=7200}); render()")
    await pg.screenshot(path="td1.png", full_page=True)
    await pg.click(".dpill"); await pg.wait_for_timeout(300)
    await pg.fill("#inSleep","7.5"); await pg.click("button[data-act=saveDaily]"); await pg.wait_for_timeout(300)
    print(await pg.evaluate("JSON.stringify([day(todayKey()).sleep, !!S.sheet])"))
    await pg.click(".dpill"); await pg.wait_for_timeout(300); await (await pg.query_selector(".sheet")).screenshot(path="td2.png")
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
