import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--ignore-gpu-blocklist"])
    ctx = await b.new_context(viewport={"width":390,"height":844})
    pg = await ctx.new_page(); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE "+m.text) if m.type=="error" else None)
    await pg.goto("http://localhost:8765/"); await pg.wait_for_timeout(1500)
    sw = await pg.evaluate("navigator.serviceWorker.controller ? 'controlled' : 'not yet'")
    await pg.reload(); await pg.wait_for_timeout(1000)
    sw = await pg.evaluate("navigator.serviceWorker.controller ? 'controlled' : 'not yet'"); print("SW:", sw)
    await pg.click("text=+ Ajouter un aliment"); await pg.fill("#q","skyr"); await pg.wait_for_timeout(100); await pg.click("#qres .entry >> nth=0"); await pg.click("button[data-act=selAdd]"); await pg.wait_for_timeout(300)
    await ctx.set_offline(True)
    await pg.reload(); await pg.wait_for_timeout(1500)
    t = await pg.inner_text("#app"); print("OFFLINE OK:", "Skyr" in t, "| banner:", "Hors-ligne" in t)
    await pg.click("nav button[data-v=fridge]"); await pg.wait_for_timeout(800)
    print("3D canvas offline:", await pg.evaluate("!!document.querySelector('#scene3d canvas')"))
    await pg.click("nav button[data-v=today]"); await pg.click("button[data-act=tab][data-v=profile]"); await pg.wait_for_timeout(300)
    await pg.screenshot(path="p1.png", full_page=True)
    await pg.click("nav button[data-v=today]"); await pg.click("text=+ Ajouter un aliment"); await pg.click("button[data-act=addTab][data-v=ia]"); await pg.fill("#iaTxt","200g riz"); await pg.click("button[data-act=aiText]"); await pg.wait_for_timeout(500)
    print("AI msg:", (await pg.inner_text(".sheet"))[:300].replace("\n"," | "))
    print("\n".join(errs) or "no errors")
    await b.close()
asyncio.run(main())
