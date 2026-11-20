import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    pg = await b.new_page(viewport={"width":430,"height":932}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("http://localhost:8765/index.local.html"); await pg.wait_for_timeout(500)
    # fake previous session
    await pg.evaluate("""Store.set('w-1',{live:false,name:'Bras',start:Date.now()-3*864e5,end:Date.now()-3*864e5+3600e3,ex:[{id:'lat_raise_cable',sets:[{w:10,r:8,rir:2,t:1},{w:10,r:7,rir:1,t:2},{w:10,r:6,rir:1,t:3}]}]})""")
    await pg.click("nav button[data-v=workout]"); await pg.wait_for_timeout(300)
    await pg.click("button[data-act=startW]"); await pg.wait_for_timeout(1500)
    for w,r in [(10,9),(10,7),(9,6)]:
      await pg.evaluate(f"S.draft[0].w={w}; render()")
      inp = await pg.query_selector("input[data-input=draft][data-i='0'][data-k='r']"); await inp.fill(str(r))
      await pg.click("button[data-act=logSet][data-i='0']"); await pg.wait_for_timeout(300)
    await pg.evaluate("restStop()"); await pg.wait_for_timeout(1500)
    el = await pg.query_selector(".card:has(button[data-act=logSet])"); await el.screenshot(path="p_card.png")
    await pg.click("button[data-act=refuse][data-i='1']"); await pg.wait_for_timeout(2500)
    await (await pg.query_selector(".sheet")).screenshot(path="p_refuse.png")
    await pg.click(".sheet .entry[data-act=refusePick]"); await pg.wait_for_timeout(500)
    print(await pg.evaluate("liveWorkout().ex.map(e=>e.id)"))
    await pg.evaluate("ACT.finishW()"); await pg.wait_for_timeout(500)
    await pg.click("button[data-act=genOpen]"); await pg.click("button[data-act=genPrio][data-v='Épaules latérales']"); await pg.click("button[data-act=genGo]"); await pg.wait_for_timeout(3000)
    await (await pg.query_selector(".sheet")).screenshot(path="p_gen.png")
    print(await pg.evaluate("S.gen.days.map(d=>d.name+': '+d.ex.map(e=>e.id+'x'+e.sets).join(', ')).join('\\n')"))
    await pg.click("button[data-act=energyInfo]") if await pg.query_selector("button[data-act=energyInfo]") else None
    await pg.evaluate("openSheet(energyExplainSheet)"); await pg.wait_for_timeout(300)
    await (await pg.query_selector(".sheet")).screenshot(path="p_en.png")
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
