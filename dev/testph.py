import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    pg = await b.new_page(viewport={"width":430,"height":932}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("http://localhost:8765/index.local.html"); await pg.wait_for_timeout(500)
    await pg.evaluate("""(async()=>{for(const [c,d] of [['#8a6',addDays(todayKey(),-60)],['#a86',todayKey()]]){const cv=document.createElement('canvas');cv.width=300;cv.height=400;const x=cv.getContext('2d');x.fillStyle=c;x.fillRect(0,0,300,400);x.fillStyle='#fff';x.font='40px sans-serif';x.fillText(d,20,200);const bl=await new Promise(r=>cv.toBlob(r,'image/jpeg'));await phAdd(bl,'face',d);} })()""")
    await pg.wait_for_timeout(500)
    await pg.click("nav button[data-v=progress]"); await pg.wait_for_timeout(1500)
    el = await pg.query_selector(".card:has(h2:text('Photos de physique'))"); await el.screenshot(path="ph.png")
    await pg.evaluate("S.bodyEx='seated_leg_curl'; openSheet(exMuscleSheet('seated_leg_curl'))"); await pg.wait_for_timeout(5000)
    await pg.screenshot(path="exs.png", full_page=False)
    await pg.evaluate("document.querySelector('.sheet').scrollTop=600"); await pg.wait_for_timeout(300); await pg.screenshot(path="exs2.png")
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
