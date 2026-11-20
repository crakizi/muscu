import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    pg = await b.new_page(viewport={"width":1200,"height":900})
    await pg.goto("http://localhost:8765/index.local.html"); await pg.wait_for_timeout(500)
    await pg.click("nav button[data-v=workout]"); await pg.click("button[data-act=wMode][data-v='3d']"); await pg.wait_for_timeout(2000)
    r = await pg.evaluate("""(()=>{const S3=V3.scenes.gym; const P=new THREE.Vector3(5,0,0).add(S3.controls.target);
      const sa=()=>{S3.cam.updateMatrixWorld(); const q=P.clone().project(S3.cam); const c=S3.controls.target.clone().project(S3.cam); return Math.atan2(-(q.y-c.y), q.x-c.x);}; // écran, y vers le bas
      const a0=sa(); rotateView(S3, 0.2); S3.controls.update(); const a1=sa(); return [a0,a1];})()""")
    print("screen angle (y down) before/after clockwise 0.2:", r, "-> increases = clockwise OK" if r[1]>r[0] else "-> WRONG sign")
    await b.close()
asyncio.run(main())
