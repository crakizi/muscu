import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--ignore-gpu-blocklist"])
    pg = await b.new_page(viewport={"width":1400,"height":900}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("file:///home/claude/app/index.local.html"); await pg.wait_for_timeout(600)
    await pg.click("nav button[data-v=workout]"); await pg.click("button[data-act=wMode][data-v='3d']"); await pg.wait_for_timeout(1500)
    T="JSON.stringify(V3.scenes.gym.controls.target.toArray().map(x=>+x.toFixed(2)))"
    print("t0", await pg.evaluate(T))
    box = await (await pg.query_selector("#scene3d")).bounding_box()
    cx, cy = box['x']+box['width']/2, box['y']+box['height']/2
    await pg.mouse.move(cx,cy); await pg.mouse.down(); await pg.mouse.move(cx+200,cy+80, steps=10); await pg.mouse.up(); await pg.wait_for_timeout(500)
    print("after drag", await pg.evaluate(T))
    await pg.click("button[data-act=cam][data-v=up]"); await pg.wait_for_timeout(800); print("after ▲", await pg.evaluate(T))
    await pg.click("button[data-act=cam][data-v=right]"); await pg.wait_for_timeout(800)
    await pg.click("button[data-act=cam][data-v=in]"); await pg.wait_for_timeout(800)
    await pg.screenshot(path="nav.png")
    await pg.click("button[data-act=cam][data-v=home]"); await pg.wait_for_timeout(800); print("home", await pg.evaluate(T))
    # scanner tab render
    await pg.click("nav button[data-v=today]"); await pg.click("text=+ Ajouter un repas"); await pg.click("button[data-act=addTab][data-v=scan]"); await pg.wait_for_timeout(300)
    await pg.screenshot(path="scan.png")
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
