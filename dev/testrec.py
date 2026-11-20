import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--ignore-gpu-blocklist"])
    pg = await b.new_page(viewport={"width":390,"height":844}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("file:///home/claude/app/index.local.html"); await pg.wait_for_timeout(600)
    await pg.click("text=+ Ajouter un aliment"); await pg.click("button[data-act=addTab][data-v=recipes]"); await pg.click("button[data-act=recNew]")
    await pg.fill("#recName","Batch riz poulet"); await pg.fill("#recPortions","4")
    for q in ["riz cru","poulet cru"]:
      await pg.fill("input[data-input=recQ]", q); await pg.wait_for_timeout(100); await pg.click("#recRes .entry >> nth=0")
    await pg.fill("input[data-input=recG][data-i='0']","400"); await pg.fill("input[data-input=recG][data-i='1']","800")
    await pg.click("button[data-act=recSave]"); await pg.wait_for_timeout(200)
    await pg.click("[data-act=recPick] >> nth=0"); await pg.click("button[data-act=recP][data-v='0.5']"); await pg.click("button[data-act=recAdd]"); await pg.wait_for_timeout(300)
    t = await pg.inner_text("#app"); print([l for l in t.split("\n") if "Batch" in l or "g ·" in l][:3])
    await pg.click("button[data-act=copyOpen]"); await pg.wait_for_timeout(200); print((await pg.inner_text(".sheet"))[:120].replace("\n"," | "))
    await pg.click("button[data-act=closeSheet]")
    # séance pour récup
    await pg.click("nav button[data-v=workout]"); await pg.click("button[data-v=Bras]"); await pg.wait_for_timeout(200)
    await pg.locator('input[data-input=draft][data-i="0"][data-k=w]').fill("12.5"); await pg.locator('input[data-input=draft][data-i="0"][data-k=r]').fill("8")
    for _ in range(3): await pg.click('button[data-act=logSet][data-i="0"]'); await pg.wait_for_timeout(150); await pg.locator('input[data-input=draft][data-i="0"][data-k=r]').fill("8")
    await pg.click("button[data-act=finishW]"); await pg.wait_for_timeout(400)
    await pg.screenshot(path="recov.png", full_page=True)
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
