# Muscu lot 1 : fiche exercice (photos, variantes par matériel) + saisie d'une série en 1-2 taps.
# Lancer depuis dev/ après `python3 build.py --local` : python3 testmuscu.py [prefixe_captures]
# Les photos free-exercise-db sont servies depuis une copie locale si FEDB_DIR est défini (pas d'accès réseau en test).
import asyncio, json, subprocess, os, sys, time
from playwright.async_api import async_playwright
D = os.path.dirname(os.path.abspath(__file__)); PORT = int(os.environ.get("PORT", "8774"))
PFX = sys.argv[1] if len(sys.argv) > 1 else "apres"; SH = f"{D}/shots/muscu/"; os.makedirs(SH, exist_ok=True)
FEDB_DIR = os.environ.get("FEDB_DIR")
RES = {"ok": 0, "bad": []}
def check(name, cond, info=""):
  if cond: RES["ok"] += 1
  else: RES["bad"].append(name)
  print(("OK   " if cond else "FAIL ") + name + (f"  ({info})" if info != "" else ""))
async def sheetshot(pg, path):
  h = await pg.evaluate("(()=>{const s=document.querySelector('.sheet');s.style.maxHeight='none';return s.scrollHeight})()")
  await pg.set_viewport_size({"width": 390, "height": h + 60}); await pg.wait_for_timeout(400)
  await pg.screenshot(path=path, animations="disabled"); await pg.set_viewport_size({"width": 390, "height": 844}); return h
async def main():
  srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT)], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--use-gl=swiftshader", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"])
      pg = await b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2); errs = []
      pg.on("pageerror", lambda e: errs.append(str(e)))
      if FEDB_DIR:
        async def fedb(route):
          rel = route.request.url.split("/exercises/", 1)[1]; f = os.path.join(FEDB_DIR, rel)
          await (route.fulfill(path=f, content_type="image/jpeg") if os.path.exists(f) else route.fulfill(status=404))
        await pg.route("**/free-exercise-db@*/exercises/**", fedb)
      ev = lambda e: pg.evaluate(f"JSON.stringify({e})")
      await pg.goto(f"http://localhost:{PORT}/index.local.html"); await pg.wait_for_timeout(500)
      await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
      await pg.add_script_tag(path=f"{D}/demo_seed.js"); await pg.evaluate("demoSeed()"); await pg.reload(); await pg.wait_for_timeout(700)
      await pg.click("nav button[data-v=workout]"); await pg.wait_for_timeout(300)
      await pg.click("button[data-act=startW][data-v=Bras]"); await pg.wait_for_timeout(1500)
      await pg.screenshot(path=SH + PFX + "_1_seance.png")
      card = pg.locator("#app .card").nth(0 if PFX == "avant" else 1)
      if PFX == "avant":
        await pg.evaluate("ACT.showMusc(document.querySelector('[data-act=showMusc]'))"); await pg.wait_for_timeout(4000)
        h = await pg.evaluate("document.querySelector('.sheet').scrollHeight"); print("hauteur fiche avant :", h)
        await sheetshot(pg, SH + "avant_2_fiche.png"); return
      # ---------- saisie d'une série ----------
      vals = json.loads(await ev("[document.querySelector('input[data-input=draft][data-i=\"0\"][data-k=w]').value, document.querySelector('input[data-input=draft][data-i=\"0\"][data-k=r]').value]"))
      check("série 1 pré-remplie (charge + reps)", vals[0] != "" and vals[1] != "", vals)
      lbl = await pg.inner_text("button[data-act=logSet][data-i='0']"); check("bouton Valider affiche la série", f"{vals[0]} kg × {vals[1]}" in lbl, lbl)
      await pg.click("button[data-act=logSet][data-i='0']"); await pg.wait_for_timeout(300)  # 1 tap
      s = json.loads(await ev("liveWorkout().ex[0].sets"))
      check("1 tap : série enregistrée", len(s) == 1 and s[0]["w"] == float(vals[0]) and s[0]["r"] == int(vals[1]), s)
      await pg.click("button[data-act=dStep][data-i='0'][data-k=r][data-v='-1']"); await pg.click("button[data-act=logSet][data-i='0']"); await pg.wait_for_timeout(300)  # 2 taps
      s = json.loads(await ev("liveWorkout().ex[0].sets"))
      check("2 taps : une rep de moins", len(s) == 2 and s[1]["r"] == s[0]["r"] - 1, s)
      first = json.loads(await ev("(()=>{const e=liveWorkout().ex[1];return [S.draft[1]?.r ?? null]})()"))
      check("exercice sans série : reps pré-remplies aussi", await pg.input_value("input[data-input=draft][data-i='1'][data-k=r]") != "")
      await pg.evaluate("restStop(); document.querySelectorAll('.toast').forEach(t=>t.remove()); window.scrollTo(0,0)"); await pg.wait_for_timeout(300)
      await pg.screenshot(path=SH + "apres_1_seance.png")
      await pg.locator("#app .card").nth(2).screenshot(path=SH + "apres_1c_carte_neuve.png", animations="disabled")
      await card.screenshot(path=SH + "apres_1b_carte.png", animations="disabled")
      # ---------- fiche exercice ----------
      await pg.click("[data-act=exInfo][data-i='0'] >> nth=0"); await pg.wait_for_timeout(1200); await pg.evaluate("restStop()")
      ft = await pg.inner_text(".sheet")
      check("fiche : muscles ciblés", "Ciblé" in ft)
      check("fiche : 3 familles de variantes", all(k in ft for k in ["Poids libre", "Machine", "Poulie"]))
      check("fiche : photo free-exercise-db", await pg.locator(".sheet .exph img").count() == 2)
      h = await pg.evaluate("document.querySelector('.sheet').scrollHeight"); print("hauteur fiche après :", h)
      await sheetshot(pg, SH + "apres_2_fiche.png")
      await pg.click(".sheet [data-act=exEq][data-v=libre]"); await pg.wait_for_timeout(200)
      await sheetshot(pg, SH + "apres_3_fiche_libre.png")
      # utiliser une variante = remplacer l'exercice dans la séance
      v = pg.locator(".sheet .exvar.on [data-act=useVar]").first; vid = await v.get_attribute("data-v"); await v.click(); await pg.wait_for_timeout(300)
      check("variante utilisée dans la séance", json.loads(await ev("liveWorkout().ex[0].id")) == vid, vid)
      # 3D toujours disponible
      await pg.click("[data-act=exInfo][data-i='1'] >> nth=0"); await pg.wait_for_timeout(300)
      await pg.click(".sheet [data-act=exMedia][data-v='3d']"); await pg.wait_for_timeout(2500)
      check("vue 3D dans la fiche", await pg.locator("#body3d").count() == 1)
      await pg.evaluate("closeSheet()")
      # toutes les fiches s'ouvrent sans erreur, et chaque variante liée existe
      bad = json.loads(await ev("Object.keys(EX).filter(id=>{try{S.bodyEx=null;S.exMedia='photo';openSheet(exMuscleSheet(id));return !document.querySelector('.sheet')}catch(e){return true}})"))
      await pg.evaluate("closeSheet()")
      check("toutes les fiches s'ouvrent", not bad, bad)
      check("chaque exercice a ses variantes", json.loads(await ev("Object.keys(EX).filter(id=>!EX_DB[id])")) == [])
      check("variantes liées valides", json.loads(await ev("Object.values(EX_DB).flatMap(d=>d[2]).filter(v=>v[3]&&!EX[v[3]]).map(v=>v[3])")) == [])
      check("aucune erreur JS", not errs, errs)
  finally:
    srv.terminate()
  print(f"\nOK {RES['ok']}/{RES['ok'] + len(RES['bad'])}  ÉCHECS : {RES['bad']}")
asyncio.run(main())
