import asyncio, sys
from playwright.async_api import async_playwright
EX = sys.argv[1].split(",") if len(sys.argv)>1 else None
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    pg = await b.new_page(viewport={"width":700,"height":900}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    pg.on("console", lambda m: m.type=="error" and errs.append("CONSOLE "+m.text))
    await pg.goto("http://localhost:8765/index.local.html"); await pg.wait_for_timeout(500)
    ids = EX or await pg.evaluate("Object.keys(EX_ANIM)")
    first=True
    for i in ids:
      await pg.evaluate(f"S.bodyEx='{i}'; S.bodyAnim=true; openSheet(exMuscleSheet('{i}'))")
      await pg.wait_for_timeout(9000 if first else 900); first=False
      await pg.evaluate("ANIM.playing=false")
      for t in (0,1):
        await pg.evaluate(f"(()=>{{const S3=V3.scenes.body; applyPose(S3.grp,ANIM.A,ANIM.B,{t}); S3.dirty=performance.now()+400;}})()")
        await pg.wait_for_timeout(350)
        el = await pg.query_selector("#body3d"); await el.screenshot(path=f"an/{i}_{t}.png")
      await pg.evaluate("ANIM.playing=true; closeSheet()")
    print("\n".join(errs[:10]) or "no errors"); await b.close()
asyncio.run(main())
