import asyncio, json
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = await b.new_page(viewport={"width":390,"height":844})
    errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE "+m.text) if m.type=="error" else None)
    await pg.goto("file:///home/claude/app/index.local.html"); await pg.wait_for_timeout(800)
    await pg.screenshot(path="s1.png", full_page=True)
    # ajout aliment
    await pg.click("text=+ Ajouter un repas"); await pg.wait_for_timeout(200)
    await pg.fill("#q","poulet"); await pg.wait_for_timeout(200)
    await pg.click("#qres .entry >> nth=0"); await pg.wait_for_timeout(200)
    await pg.fill("#gIn","180"); await pg.click("button[data-act=selAdd]"); await pg.wait_for_timeout(300)
    await pg.click("text=+ Ajouter un repas"); await pg.fill("#q","riz cuit"); await pg.wait_for_timeout(100); await pg.click("#qres .entry >> nth=0"); await pg.click("button[data-act=selAdd]"); await pg.wait_for_timeout(300)
    await pg.fill("#inW","80.4"); await pg.click("button[data-act=saveDaily]"); await pg.wait_for_timeout(300)
    await pg.screenshot(path="s2.png", full_page=True)
    # seance
    await pg.click("nav button[data-v=workout]"); await pg.wait_for_timeout(200)
    await pg.click("button[data-v=Bras]"); await pg.wait_for_timeout(300)
    inp = pg.locator('input[data-input=draft][data-i="0"][data-k=w]'); await inp.fill("12.5")
    await pg.locator('input[data-input=draft][data-i="0"][data-k=r]').fill("8")
    await pg.click('button[data-act=logSet][data-i="0"]'); await pg.wait_for_timeout(300)
    await pg.locator('input[data-input=draft][data-i="0"][data-k=r]').fill("7")
    await pg.click('button[data-act=logSet][data-i="0"]'); await pg.wait_for_timeout(300)
    await pg.click('button[data-act=dStep][data-i="1"][data-k=w][data-v="2.5"]'); await pg.wait_for_timeout(200)
    await pg.screenshot(path="s3.png", full_page=True)
    await pg.click('div[data-act=showMusc][data-v=lat_raise_cable]'); await pg.wait_for_timeout(300)
    await pg.screenshot(path="s4.png")
    await pg.click("button[data-act=closeSheet]")
    await pg.click("button[data-act=finishW]"); await pg.wait_for_timeout(300)
    for t in ["progress","coach","profile"]:
      await pg.click(f"nav button[data-v={t}]"); await pg.wait_for_timeout(600)
      await pg.screenshot(path=f"s_{t}.png", full_page=True)
    print("\n".join(errs) or "no errors")
    await b.close()
asyncio.run(main())
