import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--ignore-gpu-blocklist"])
    pg = await b.new_page(viewport={"width":1400,"height":900}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("file:///home/claude/app/index.local.html"); await pg.wait_for_timeout(600)
    await pg.click("nav button[data-v=workout]"); await pg.click("button[data-act=wMode][data-v='3d']"); await pg.wait_for_timeout(1500)
    C="JSON.stringify(V3.scenes.gym.cam.position.toArray().map(x=>+x.toFixed(2)))"
    print("c0", await pg.evaluate(C))
    await pg.evaluate("document.querySelector('#scene3d canvas').dispatchEvent(new WheelEvent('wheel',{deltaX:40.5,deltaY:3.2,deltaMode:0,bubbles:true,cancelable:true}))")
    print("2 doigts", await pg.evaluate(C))
    await pg.evaluate("document.querySelector('#scene3d canvas').dispatchEvent(new WheelEvent('wheel',{deltaY:20,ctrlKey:true,deltaMode:0,bubbles:true,cancelable:true}))")
    print("pincer", await pg.evaluate(C))
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
