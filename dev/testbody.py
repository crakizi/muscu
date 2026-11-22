import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--ignore-gpu-blocklist","--enable-unsafe-swiftshader"])
    pg = await b.new_page(viewport={"width":1100,"height":900}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    pg.on("console", lambda m: m.type=="error" and errs.append("CONSOLE "+m.text))
    await pg.goto("http://localhost:8765/index.local.html"); await pg.wait_for_timeout(800)
    await pg.evaluate("S.exMedia='3d'; S.bodyEx='lat_raise_cable'; openSheet(exMuscleSheet('lat_raise_cable'))"); await pg.wait_for_timeout(6000)
    el = await pg.query_selector(".sheet"); await el.screenshot(path="body1.png")
    await pg.click("button[data-act=bodyView][data-v=back]"); await pg.wait_for_timeout(1200)
    await (await pg.query_selector("#body3d")).screenshot(path="body2.png")
    await pg.evaluate("closeSheet()")
    await pg.evaluate("document.body.insertAdjacentHTML('beforeend', '<div id=tt style=\"position:fixed;top:0;left:0;width:600px;background:#fff;z-index:99;display:flex\"><div style=width:200px>'+bodyThumbHTML({prim:['pec_mid','pec_up'],sec:['delt_ant','triceps_latmed'],focus:['pec_up']})+'</div><div style=width:200px>'+bodyThumbHTML({prim:['hamstrings'],sec:['glutes_max'],focus:['hamstrings']})+'</div></div>')"); await pg.wait_for_timeout(4000)
    await (await pg.query_selector("#tt")).screenshot(path="body3.png")
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
