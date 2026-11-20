import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"])
    pg = await b.new_page(viewport={"width":390,"height":844})
    errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE "+m.text) if m.type=="error" else None)
    await pg.goto("file:///home/claude/app/index.local.html"); await pg.wait_for_timeout(800)
    # frigo
    await pg.click("nav button[data-v=fridge]"); await pg.wait_for_timeout(500)
    for name,q in [("skyr","4"),("poulet","800"),("tomate","3"),("lait","1"),("oeuf","12"),("riz cru","1000"),("banane","5")]:
      await pg.click("button[data-act=fridgeAddOpen]"); await pg.fill("input[data-input=fq]", name); await pg.wait_for_timeout(100)
      await pg.click("#fres .entry >> nth=1" if name not in ("oeuf",) else "#fres .entry >> nth=1"); await pg.wait_for_timeout(100)
      await pg.fill("#fqQ", q); 
      if name=="riz cru": await pg.select_option("#fqZ","placard")
      await pg.click("button[data-act=fridgeQtyGo]"); await pg.wait_for_timeout(200)
    await pg.wait_for_timeout(800)
    await pg.screenshot(path="f1.png", full_page=True)
    # manger depuis aujourd'hui : poulet 180g
    await pg.click("nav button[data-v=today]"); await pg.click("text=+ Ajouter un repas"); await pg.fill("#q","poulet cuit"); await pg.wait_for_timeout(100)
    await pg.click("#qres .entry >> nth=0"); await pg.fill("#gIn","200"); await pg.click("button[data-act=selAdd]"); await pg.wait_for_timeout(300)
    await pg.click("nav button[data-v=fridge]"); await pg.wait_for_timeout(500)
    txt = await pg.inner_text("#app"); print([l for l in txt.split("\n") if "poulet" in l.lower() or "g ·" in l][:6])
    # séance + salle 3D
    await pg.click("nav button[data-v=workout]"); await pg.click("button[data-v=Bras]"); await pg.wait_for_timeout(300)
    await pg.screenshot(path="w1.png")
    await pg.click("button[data-act=wMode][data-v='3d']"); await pg.wait_for_timeout(1200)
    await pg.screenshot(path="g1.png")
    # simuler un pick
    await pg.evaluate("ACT_PICK_MACHINE('cable')"); await pg.wait_for_timeout(300)
    await pg.screenshot(path="g2.png")
    await pg.click("#sheet [data-act=gymPickEx][data-v=tri_oh_cable]"); await pg.wait_for_timeout(300)
    await pg.screenshot(path="g3.png")
    # clic réel au centre du canvas
    print("\n".join(errs) or "no errors")
    await b.close()
asyncio.run(main())
