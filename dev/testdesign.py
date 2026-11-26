# Captures 390×844 des 3 écrans clés (Aujourd'hui, Séance en cours, Cuisine) pour la section Design.
# Usage (depuis dev/, après `python3 build.py --local`) : python3 testdesign.py <préfixe> [accent:bleu|orange] [clair|sombre]
import asyncio, os, subprocess, sys, time
from playwright.async_api import async_playwright
D = os.path.dirname(os.path.abspath(__file__)); OUT = f"{D}/shots/design/"; os.makedirs(OUT, exist_ok=True)
PORT = int(os.environ.get("PORT", "8781")); PRE = sys.argv[1] if len(sys.argv) > 1 else "x"
ACC = sys.argv[2] if len(sys.argv) > 2 else ""; THEME = sys.argv[3] if len(sys.argv) > 3 else "clair"
async def main():
  srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT)], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--use-gl=swiftshader"])
      pg = await b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2); errs = []
      pg.on("pageerror", lambda e: errs.append(str(e)))
      await pg.goto(f"http://localhost:{PORT}/index.local.html"); await pg.wait_for_timeout(400)
      await pg.evaluate(f"localStorage.clear(); localStorage.setItem('muscu_theme','{THEME}')")
      await pg.reload(); await pg.wait_for_timeout(400)
      await pg.add_script_tag(path=f"{D}/demo_seed.js"); await pg.evaluate("demoSeed()")
      await pg.reload(); await pg.wait_for_timeout(700)
      if ACC: await pg.evaluate(f"document.documentElement.dataset.accent='{ACC}'")
      async def tab(v): await pg.click(f"nav button[data-v={v}]"); await pg.wait_for_timeout(400)
      async def shot(n): await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(150); await pg.screenshot(path=f"{OUT}{PRE}_{n}.png")
      await tab("today"); await shot("1_aujourdhui")
      await tab("workout"); await pg.click("button[data-act=startW][data-v=Bras]"); await pg.wait_for_timeout(400)
      await pg.fill("input[data-input=draft][data-i='0'][data-k=r]", "8"); await pg.click("button[data-act=logSet][data-i='0']"); await pg.wait_for_timeout(2800)
      await shot("2_seance")
      await tab("fridge"); await pg.wait_for_timeout(500); await shot("3_cuisine")
      print(PRE, "ok", errs[:3])
      await b.close()
  finally: srv.terminate()
asyncio.run(main())
