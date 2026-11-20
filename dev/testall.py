import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--ignore-gpu-blocklist","--enable-unsafe-swiftshader"])
    pg = await b.new_page(viewport={"width":430,"height":932}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("http://localhost:8765/index.local.html"); await pg.wait_for_timeout(600)
    await pg.click("nav button[data-v=workout]"); await pg.wait_for_timeout(300)
    await pg.click("button[data-act=startW]"); await pg.wait_for_timeout(5000)
    await pg.screenshot(path="t_w1.png")
    await pg.evaluate("S.draft[0]={w:60,r:'',rir:2,wu:false}; render()")
    inp = await pg.query_selector("input[data-input=draft][data-i='0'][data-k='r']"); await inp.fill("10")
    await pg.click("button[data-act=logSet][data-i='0']"); await pg.wait_for_timeout(1500)
    await pg.screenshot(path="t_w2.png")
    # wheel sign test on gym
    await pg.evaluate("restStop(); S.wMode='3d'; render()"); await pg.wait_for_timeout(1500)
    th0 = await pg.evaluate("(()=>{const S3=V3.scenes.gym;const o=S3.cam.position.clone().sub(S3.controls.target);return Math.atan2(o.x,o.z)})()")
    c = await pg.query_selector("#scene3d canvas"); bb = await c.bounding_box()
    await pg.mouse.move(bb['x']+bb['width']/2, bb['y']+bb['height']/2)
    await pg.mouse.wheel(40, 0); await pg.wait_for_timeout(300)
    th1 = await pg.evaluate("(()=>{const S3=V3.scenes.gym;const o=S3.cam.position.clone().sub(S3.controls.target);return Math.atan2(o.x,o.z)})()")
    print("theta", th0, th1)
    await pg.evaluate("S.tab='today'; S.wMode='list'; S.tab='workout'; render()"); await pg.wait_for_timeout(300)
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
