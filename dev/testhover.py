import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    ctx = await b.new_context(viewport={"width":1200,"height":900}); pg = await ctx.new_page(); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("http://localhost:8765/index.local.html"); await pg.wait_for_timeout(500)
    await pg.click("nav button[data-v=workout]"); await pg.click("button[data-act=wMode][data-v='3d']"); await pg.wait_for_timeout(2000)
    n = await pg.evaluate("""(()=>{const S3=V3.scenes.gym; const g=S3.pickables.find(x=>x.userData.pick==='incline'); tint(g,0x2563eb,0.8);
      let lit=0; S3.pickables.forEach(o=>{ if(o===g) return; o.traverse(m=>{ if(m.isMesh&&m.material&&m.material.emissive&&m.material.emissive.getHex()===0x2563eb) lit++; }); }); return lit;})()""")
    print("meshes wrongly highlighted on other machines:", n)
    # thumbnails: first visit then reload -> should be instant from cache
    await pg.evaluate("S.wMode='list'; render()"); await pg.click("button[data-act=startW]"); await pg.wait_for_timeout(6000)
    await pg.reload(); await pg.wait_for_timeout(50)
    await pg.click("nav button[data-v=workout]"); await pg.wait_for_timeout(250)
    print("after reload, waiting placeholders:", await pg.evaluate("document.querySelectorAll('.bthumb.wait').length"), "imgs:", await pg.evaluate("document.querySelectorAll('img.bthumb').length"), "svg 2D in cards:", await pg.evaluate("document.querySelectorAll('[data-act=showMusc] svg').length"))
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
