import asyncio
from playwright.async_api import async_playwright
SHOTS=[("pl",[-3.5,0,4.8],[-3.5,3.2,10.5]),("left",[-10,0,0],[-5.5,2.6,1.5]),("func",[-3.5,0,-2],[-1,2.8,3.5]),("back",[4,0,-6],[4,2.5,-1]),("racks",[10,0,0],[6,2.6,0.5])]
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--ignore-gpu-blocklist","--enable-unsafe-swiftshader"])
    pg = await b.new_page(viewport={"width":1200,"height":900}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("http://localhost:8765/index.local.html"); await pg.wait_for_timeout(600)
    await pg.click("nav button[data-v=workout]"); await pg.click("button[data-act=wMode][data-v='3d']"); await pg.wait_for_timeout(2500)
    el = await pg.query_selector("#scene3d"); await el.screenshot(path="gym1.png")
    for n,t,c in SHOTS:
      await pg.evaluate(f"(()=>{{const S3=V3.scenes.gym;S3.controls.target.set({t[0]},{t[1]},{t[2]});S3.cam.position.set({c[0]},{c[1]},{c[2]});S3.controls.update();}})()"); await pg.wait_for_timeout(700)
      await el.screenshot(path=f"gz_{n}.png")
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
