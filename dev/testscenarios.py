# Scénarios de bout en bout sur un jeu de données réaliste (dev/demo_seed.js, injecté seulement ici).
# Lancer depuis dev/ après `python3 build.py --local` : python3 testscenarios.py  (serveur local lancé sur le port 8773)
import asyncio, json, subprocess, os, time
from playwright.async_api import async_playwright
D = os.path.dirname(os.path.abspath(__file__)); PORT = int(os.environ.get("PORT", "8773")); SH = f"{D}/shots/scenarios/"; os.makedirs(SH, exist_ok=True)
RES = {"ok": [], "bad": []}; SECTION = [""]
def check(name, cond, info=""):
  (RES["ok"] if cond else RES["bad"]).append(f"[{SECTION[0]}] {name}")
  print(("OK   " if cond else "FAIL ") + f"[{SECTION[0]}] {name}" + (f"  ({info})" if info != "" else ""))
async def main():
  srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT)], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--use-gl=swiftshader", "--ignore-gpu-blocklist"])
      pg = await b.new_page(viewport={"width": 390, "height": 844}); errs = []; cons = []
      pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
      pg.on("console", lambda m: cons.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
      J = lambda expr: pg.evaluate(f"JSON.stringify({expr})")
      async def ev(expr): return json.loads(await J(expr))
      async def tab(v): await pg.click(f"nav button[data-v={v}]"); await pg.wait_for_timeout(350)
      async def shot(n, full=False): await pg.screenshot(path=SH + n, full_page=full)
      async def toast(): return " ".join(await pg.locator(".toast").all_inner_texts())
      await pg.goto(f"http://localhost:{PORT}/index.local.html"); await pg.wait_for_timeout(500)
      await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(500)
      await pg.add_script_tag(path=f"{D}/demo_seed.js")
      n = await pg.evaluate("demoSeed()"); DEMO = await ev("DEMO")
      await pg.reload(); await pg.wait_for_timeout(700)  # les données doivent survivre au rechargement
      await pg.add_script_tag(path=f"{D}/demo_seed.js")  # pour DEMO.foods (sans réinjecter)
      t = await pg.evaluate("todayKey()")
      SECTION[0] = "Données"
      check("jeu de données chargé après rechargement", await pg.evaluate("Store.ids('d-').length") == 29 and await pg.evaluate("Store.ids('w-').length") == len(DEMO["gymDays"]), f"{n} docs, {len(DEMO['gymDays'])} séances")
      check("seed absent du build", "demoSeed" not in open(f"{D}/index.local.html").read())

      # ===================== NUTRITION =====================
      SECTION[0] = "Nutrition"
      gym, foot = DEMO["gymDays"][-1], DEMO["footDays"][-1]
      sunday = await pg.evaluate("[1,2,3,4,5,6,7].map(i=>addDays(todayKey(),-i)).find(k=>parseKey(k).getDay()===0)")
      ti = await ev(f"[dayTypeInfo('{gym}'), dayTypeInfo('{foot}'), dayTypeInfo('{sunday}'), dayTypeInfo('{DEMO['skipped'][0]}')]")
      check("jour de séance → muscu (fait)", ti[0] == {"type": "muscu", "src": "fait"}, ti[0])
      check("jour de foot → sport (fait)", ti[1] == {"type": "sport", "src": "fait"}, ti[1])
      check("dimanche sans rien → repos (prévu)", ti[2] == {"type": "repos", "src": "prévu"}, ti[2])
      check("jeudi sauté → muscu prévu (deviné sur 4 sem.)", ti[3] == {"type": "muscu", "src": "prévu"}, ti[3])
      wk = await ev("(()=>{const ws=weekKey(parseKey(todayKey()));let s=0;for(let i=0;i<7;i++)s+=dayTargets(addDays(ws,i)).kcal;return [s/7, targets().kcal]})()")
      check("moyenne hebdo des objectifs = objectif", abs(wk[0] - wk[1]) <= 2, f"{wk[0]:.1f} vs {wk[1]}")
      T = await ev("[dayTargets(todayKey()), dayTotals(todayKey()).kcal, targets()]")
      check("protéines identiques chaque jour", T[0]["p"] == T[2]["p"])
      check("objectif adaptatif actif (28 j de données)", T[2]["adaptive"]["ok"], T[2]["source"])
      check("3 anneaux P/G/L", await pg.locator(".mrings .mring").count() == 3)
      ring = await pg.inner_text(".ring .in"); left = round(T[0]["kcal"] - T[1])
      check("anneau kcal = objectif du jour − mangé", str(left) in ring.replace(" ", "").replace(" ", ""), f"{ring.strip()[:30]} / attendu {left}")
      check("pastille type de jour", await pg.locator(".dtpill").count() == 1)
      await pg.evaluate("window.scrollTo(0, document.querySelector('.dstrip').getBoundingClientRect().top + scrollY - 60)"); await shot("01_journal_aujourdhui.png")
      # poids tendance
      W = await ev("weightTrendAt()"); check("poids tendance ≠ pesée brute", W["raw"] == 79.4 and W["trend"] != 79.4 and 79 < W["trend"] < 81, W)
      # objectif par repas
      await pg.click("button[data-act=byMeal][data-v='1']"); await pg.wait_for_timeout(200)
      sh = await ev("mealShares(todayKey())"); check("objectif par repas : petit-déj déjà fait exclu", "Petit-déj" not in sh and "Déjeuner" in sh, list(sh))
      check("indications sous les repas vides", await pg.locator(".mhint").count() >= 2)
      # portion auto
      await pg.evaluate("S.add.meal='Collation'; openSheet(addSheet); S.add.sel={name:'Skyr nature',per100:DEMO.foods.skyr[1]}; S.add.g=100; renderSheet()")
      await pg.fill("#pgV", "25"); await pg.click("button[data-act=pgGo][data-m=p]"); await pg.wait_for_timeout(150)
      check("portion auto : 25 g de protéines → 250 g de skyr", await pg.evaluate("S.add.g") == 250)
      # ajout rapide
      await pg.evaluate("closeSheet(); resetAdd(''); S.add.tab='quick'; openSheet(addSheet)")
      await pg.fill("#qaN", "Bocadillo"); await pg.fill("#qaP", "30"); await pg.fill("#qaC", "60"); await pg.fill("#qaF", "20")
      await (await pg.query_selector(".sheet")).screenshot(path=SH + "02_ajout_rapide.png")
      await pg.click("button[data-act=qaSave]"); await pg.wait_for_timeout(200)
      e = await ev("day(todayKey()).entries.find(e=>e.name==='Bocadillo')"); check("ajout rapide 4/4/9 = 540 kcal", e and round(e["n"]["kcal"]) == 540)
      # copier hier
      await pg.evaluate("S.day = addDays(todayKey(), -1); render()"); await pg.wait_for_timeout(100)
      ny = await pg.evaluate("day(addDays(todayKey(),-1)).entries.length"); n0 = await pg.evaluate("day(todayKey()).entries.length")
      await pg.evaluate("S.day = todayKey(); render()"); await pg.wait_for_timeout(100)
      fz0 = await pg.evaluate("JSON.stringify(Store.get('fridge'))"); bf0 = await pg.evaluate("pantryList().find(i=>i.name==='bœuf haché 5%').qty")
      await pg.click("button[data-act=copyYesterday] >> nth=0"); await pg.wait_for_timeout(250)
      n1 = await pg.evaluate("day(todayKey()).entries.length"); check("« Copier hier » ajoute tout hier", ny > 0 and n1 == n0 + ny, f"{n0}+{ny}→{n1}")
      bf1 = await pg.evaluate("pantryList().find(i=>i.name==='bœuf haché 5%').qty"); gy = await pg.evaluate("day(addDays(todayKey(),-1)).entries.filter(e=>e.name.startsWith('Bœuf')).reduce((t,e)=>t+e.g,0)")
      check("« Copier hier » retire du frigo (bœuf d'hier)", gy > 0 and bf1 == bf0 - gy, f"{bf0}-{gy}→{bf1}")
      await pg.evaluate(f"Store.set('fridge', {fz0})")  # frigo remis comme avant : la suite du scénario garde ses chiffres
      ids = await ev("day(todayKey()).entries.map(e=>e.id)"); check("copies avec des id neufs", len(set(ids)) == len(ids))
      await pg.evaluate("updDay(d=>d.entries=d.entries.slice(0," + str(n0) + ")); render()")
      # journée oubliée
      fk = DEMO["forgotten"][0]
      await pg.evaluate(f"S.day='{fk}'; render()"); await pg.wait_for_timeout(150)
      check("journée oubliée : bouton d'estimation", await pg.locator("button[data-act=estimOpen]").count() == 1)
      check("journée oubliée : « même chose qu'hier » proposé", await pg.locator("#app button[data-act=copyYesterday]").count() >= 1)
      await pg.click("button[data-act=estimOpen]"); await pg.wait_for_timeout(150); await pg.fill("#estK", "2400"); await pg.fill("#estN", "resto")
      await (await pg.query_selector(".sheet")).screenshot(path=SH + "03_journee_oubliee.png")
      await pg.click("button[data-act=estimSave]"); await pg.wait_for_timeout(200)
      es = await ev(f"[dayTotals('{fk}').kcal, day('{fk}').entries[0].src]"); check("estimation enregistrée (2400 kcal)", round(es[0]) == 2400 and es[1] == "estim", es)
      inc = DEMO["incomplete"][0]; check("jour mal noté ignoré par le calcul adaptatif", await pg.evaluate(f"day('{inc}').incomplete") is True)
      await pg.evaluate("S.day = todayKey(); render()")

      # ===================== CUISINE =====================
      SECTION[0] = "Cuisine"
      await tab("fridge"); txt = await pg.inner_text("#app")
      check("frigo : 21 articles", await pg.evaluate("fridgeItems().length") == 21)
      soon = await ev("pantryList().filter(i=>i.daysLeft!=null&&i.daysLeft<=3).map(i=>i.name)")
      check("3 articles à finir vite", sorted(soon) == sorted(["blanc de poulet", "yaourt grec", "épinards frais"]), soon)
      st = await pg.inner_text(".czsoon") if await pg.locator(".czsoon").count() else ""
      check("bloc « À finir vite » avec les 3", "À finir vite" in txt and all(x in st for x in ["blanc de poulet", "yaourt grec", "épinards frais"]) and "aujourd'hui" in st, st[:80])
      await shot("04_frigo.png")
      # ajouter un article par l'interface
      await pg.click("button[data-act=fridgeAddOpen]"); await pg.fill("input[data-input=fq]", "courgettes"); await pg.click("[data-act=fridgePick][data-i='-1']"); await pg.wait_for_timeout(100)
      await pg.fill("#fqQ", "3"); await pg.select_option("#fqU", "pc"); await pg.fill("#fqP", "200"); await pg.fill("#fqE", await pg.evaluate("addDays(todayKey(),2)"))
      await pg.click("button[data-act=fridgeQtyGo]"); await pg.wait_for_timeout(250)
      c = await ev("pantryList().find(i=>i.name==='courgettes')"); check("ajout au frigo (3 courgettes, péremption J+2)", c and c["qty"] == 3 and c["unit"] == "pc" and c["daysLeft"] == 2, c)
      check("nouvel article → « À finir vite »", "courgettes" in (await pg.inner_text(".czsoon")))
      # retirer un article
      fid = await pg.evaluate("pantryList().find(i=>i.name==='emmental râpé').id")
      await pg.click(f"[data-act=fridgeEdit][data-v='{fid}'] >> nth=0"); await pg.wait_for_timeout(150); await pg.click(f"button[data-act=fridgeDel][data-v='{fid}']"); await pg.wait_for_timeout(200)
      check("retrait du frigo", not await pg.evaluate("pantryHas('emmental râpé')") and await pg.evaluate("fridgeItems().length") == 21)
      # avec ce que j'ai
      await pg.click("button[data-act=kTab][data-v=recettes]"); await pg.wait_for_timeout(300); txt = await pg.inner_text("#app")
      check("recette 3/4 il manque oignon", "3/4 — il manque : oignon" in txt)
      check("recette 1/4 (lentilles chorizo)", "1/4 — il manque" in txt)
      check("omelette : emmental retiré → 2/3", "2/3 — il manque : emmental râpé" in txt)
      await shot("05_avec_ce_que_jai.png")
      await pg.click("button[data-act=czRecShop][data-v=rDemo2]"); await pg.wait_for_timeout(200)
      items = await ev("shopItems().map(s=>[s.name,s.qty,s.unit])"); check("« Ajouter les manquants » n'ajoute que l'oignon", items == [["oignon", 100, "g"]], items)
      # cocher → frigo + budget
      await pg.click("button[data-act=kTab][data-v=courses]"); await pg.click("button[data-act=czFold][data-v=budget]"); await pg.wait_for_timeout(200); b0 = await pg.inner_text("#app")
      check("budget : oignon prévu 0,16 €", "0,00 € achetés + 0,16 € sur la liste" in b0)
      await pg.check("input[data-act=czShopChk] >> nth=0"); await pg.wait_for_timeout(300)
      o = await ev("pantryList().find(i=>i.name==='oignon')"); check("coché → oignon dans le frigo (100 g)", o and o["qty"] == 100, o)
      await shot("06_courses.png")
      await pg.wait_for_timeout(100); b1 = await pg.inner_text("#app")
      check("budget recalculé (0,16 € achetés, reste 59,84 €)", "0,16 € achetés + 0,00 € sur la liste" in b1 and "reste 59,84 €" in b1, b1[b1.find("Budget"):b1.find("Budget")+400].replace(chr(10)," | "))
      await shot("07_budget.png")
      # batch
      await pg.click("button[data-act=kTab][data-v=plan]"); await pg.wait_for_timeout(200)
      k0 = await pg.evaluate("dayTotals(todayKey()).kcal")
      await pg.click("button[data-act=czBatchEat][data-v=bDemo1]"); await pg.wait_for_timeout(250)
      bl = await ev("[batchItems().find(b=>b.id==='bDemo1').left, dayTotals(todayKey()).kcal, day(todayKey()).entries.slice(-1)[0].name]")
      check("batch « Mangé » → portions 3→2", bl[0] == 2)
      check("batch « Mangé » → journal +560 kcal", round(bl[1] - k0) == 560 and bl[2] == "Chili con carne", bl)
      await shot("08_batch.png")
      # noter un repas avec un aliment du frigo
      await pg.evaluate("S.tab='today'; render(); resetAdd('Déjeuner'); openSheet(addSheet); S.add.sel={name:'Blanc de poulet (cuit)',per100:DEMO.foods.poulet[1]}; S.add.g=150; renderSheet()")
      await pg.wait_for_timeout(100); await pg.fill("#gIn", "150"); await pg.click("button[data-act=selAdd]"); await pg.wait_for_timeout(250)
      check("aliment noté → frigo baisse (poulet 600→450 g)", await pg.evaluate("pantryList().find(i=>i.name==='blanc de poulet').qty") == 450)
      # recette perso « Manger » → ingrédients retirés
      r0 = await ev("[pantryList().find(i=>i.name==='riz basmati').qty]")
      await pg.evaluate("ACT.recPick({dataset:{v:'rDemo1'}})"); await pg.wait_for_timeout(150)
      if await pg.locator("button[data-act=recAdd]").count():
        await pg.click("button[data-act=recAdd]"); await pg.wait_for_timeout(250)
        check("recette mangée → riz du frigo baisse", await pg.evaluate("pantryList().find(i=>i.name==='riz basmati').qty") < r0[0])
      else: check("recette mangée (bouton recAdd introuvable)", False)
      await pg.evaluate("closeSheet()")
      # repas du plan « Mangé » : le frigo devrait baisser aussi
      fq0 = await pg.evaluate("pantryList().find(i=>i.name==='brocoli').qty")
      await pg.evaluate("ACT.mpEat({dataset:{d:'0',m:'0'}})"); await pg.wait_for_timeout(200)
      check("repas du plan « Mangé » → frigo baisse (brocoli)", await pg.evaluate("pantryList().find(i=>i.name==='brocoli').qty") < fq0)

      # ===================== MUSCU =====================
      SECTION[0] = "Muscu"
      pre = await ev("[dayTypeInfo(todayKey()), dayTargets(todayKey()).kcal]")
      await tab("workout"); await shot("09_seance_accueil.png")
      await pg.click("button[data-act=startW][data-v=Bras]"); await pg.wait_for_timeout(400)
      w = await ev("liveWorkout()"); check("séance Bras démarrée (6 exos)", w and len(w["ex"]) == 6)
      wv = await pg.input_value("input[data-input=draft][data-i='0'][data-k=w]")
      check("charge pré-remplie = dernière charge (10 kg)", wv == "10", wv)
      check("rappel « dernière fois »", "Dernière fois" in await pg.inner_text("#app"))
      check("ligne fantôme série 1", "Série 1 la dernière fois" in await pg.inner_text("#app"))
      await pg.fill("input[data-input=draft][data-i='0'][data-k=r]", "8"); await pg.click("button[data-act=dRir][data-i='0'][data-v='2']"); await pg.click("button[data-act=logSet][data-i='0']"); await pg.wait_for_timeout(300)
      check("record détecté (10×8)", "Nouveau record" in await toast())
      check("minuteur de repos affiché (2:30)", await pg.locator("#restBar").count() == 1 and await pg.evaluate("REST.total") == 150)
      s = await ev("liveWorkout().ex[0].sets[0]"); check("série enregistrée avec RIR", s["w"] == 10 and s["r"] == 8 and s["rir"] == 2, s)
      check("reps pré-remplies pour la série 2", await pg.input_value("input[data-input=draft][data-i='0'][data-k=r]") == "8")
      await pg.fill("input[data-input=draft][data-i='0'][data-k=r]", "7"); await pg.click("button[data-act=logSet][data-i='0']"); await pg.wait_for_timeout(250)
      await pg.fill("input[data-input=draft][data-i='0'][data-k=r]", "5"); await pg.click("button[data-act=logSet][data-i='0']"); await pg.wait_for_timeout(250)
      gh = await pg.locator(".card >> nth=1").locator(".gh").evaluate_all("els=>els.map(e=>e.className)") if False else await pg.evaluate("[...document.querySelectorAll('.gh')].slice(0,3).map(e=>e.className.split(' ')[1])")
      check("fantôme ▲ ＝ ▼ (8>7, 7=7, 5<6)", gh == ["up", "eq", "down"], gh)
      check("résumé vs dernière fois", "1▲ 1＝ 1▼" in await pg.inner_text("#app"))
      await pg.evaluate("window.scrollTo(0,0)"); await shot("10_seance_live.png")
      # refus d'exercice
      await pg.click("button[data-act=refuse][data-i='1']"); await pg.wait_for_timeout(200)
      alts = await pg.locator("[data-act=refusePick]").count(); check("🚫 propose des remplaçants", alts >= 1, alts)
      await (await pg.query_selector(".sheet")).screenshot(path=SH + "11_refus.png")
      await pg.check("#banForever"); await pg.click("[data-act=refusePick] >> nth=0"); await pg.wait_for_timeout(250)
      r = await ev("[liveWorkout().ex[1].id, Store.get('program',{}).banned, program()['Bras'].ex.includes('tri_oh_cable')]")
      check("exercice remplacé + banni + retiré du modèle", r[0] != "tri_oh_cable" and "tri_oh_cable" in r[1] and not r[2], r)
      # fiche exercice
      await pg.click("[data-act=showMusc][data-v=lat_raise_cable] >> nth=0"); await pg.wait_for_timeout(600)
      ft = await pg.inner_text(".sheet"); check("fiche exercice (muscles, alternatives)", "Rôle des muscles" in ft and "Alternatives" in ft)
      await shot("12_fiche_exercice.png"); await pg.evaluate("closeSheet()")
      # terminer → lien nutrition
      await pg.click("#app button[data-act=finishW] >> nth=-1"); await pg.wait_for_timeout(400)
      post = await ev("[dayTypeInfo(todayKey()), dayTargets(todayKey()).kcal, workouts()[0]]")
      check("séance terminée et enregistrée", not post[2]["live"] and post[2]["end"] and len(post[2]["ex"]) == 1)
      check("séance faite → jour muscu (fait)", post[0] == {"type": "muscu", "src": "fait"}, f"avant {pre[0]}")
      check("objectif du jour mis à jour", post[1] > pre[1] if pre[0]["type"] == "repos" else post[1] == pre[1] if pre[0]["type"] in ("muscu", "sport") else post[1] > pre[1], f"{pre[1]} → {post[1]}")
      await tab("today"); check("pastille « Jour muscu · fait »", "Jour muscu" in await pg.inner_text(".dtpill") and "fait" in await pg.inner_text(".dtpill"))
      # générateur de programme
      await tab("workout"); await pg.click("button[data-act=genOpen]"); await pg.wait_for_timeout(200); await pg.click("button[data-act=genGo]"); await pg.wait_for_timeout(300)
      g = await ev("[S.gen.days.length, S.gen.days.flatMap(d=>d.ex.map(e=>e.id))]")
      check("générateur : 3 séances", g[0] == 3)
      check("générateur : exercice refusé absent", "tri_oh_cable" not in g[1])
      check("générateur : seulement des exos de la salle", await pg.evaluate("S.gen.days.flatMap(d=>d.ex).every(e=>gymExIds().has(e.id))"))
      await (await pg.query_selector(".sheet")).screenshot(path=SH + "13_generateur.png"); await pg.evaluate("closeSheet()")
      # progrès
      await tab("progress"); await pg.wait_for_timeout(500); pt = await pg.inner_text("#app")
      rec = await ev("(()=>{const h=exerciseHistory('squat').flatMap(x=>x.sets);const b=h.reduce((b,s)=>!b||e1rm(s)>e1rm(b)?s:b,null);return [b.w,b.r,Math.round(e1rm(b))]})()")
      check("records : squat cohérent", f"{rec[0]} kg × {rec[1]}" in pt and f"1RM ≈ {rec[2]}" in pt, rec)
      check("record du jour (10 kg × 8)", "10 kg × 8" in pt)
      vol = await ev("weeklyVolume(7)"); row = await pg.evaluate("[...document.querySelectorAll('table.vol tr')].find(r=>r.cells[0].textContent==='Quadriceps').cells[2].textContent")
      check("volume par muscle = calcul (Quadriceps)", float(row) == round(vol["Quadriceps"], 1) and vol["Quadriceps"] > 0, f"{row} / {vol['Quadriceps']}")
      check("graphiques poids/kcal/1RM", await pg.evaluate("charts.length") >= 3)
      await shot("14_progres.png"); await pg.evaluate("window.scrollTo(0, document.querySelector('#chE').getBoundingClientRect().top + scrollY - 80)"); await shot("15_progres_1rm.png")

      # ===================== IA sans clé =====================
      SECTION[0] = "IA"
      await tab("coach"); await pg.fill("#chatIn", "Je mange assez de protéines ?"); await pg.click("button[data-act=chatSend]"); await pg.wait_for_timeout(500)
      ct = await pg.inner_text("#app"); check("coach sans IA : message clair, pas de plantage", "pas disponible" in ct or "IA" in ct)
      await shot("16_coach_sans_ia.png")

      # ===================== ROBUSTESSE =====================
      SECTION[0] = "Robustesse"
      before = await pg.evaluate("JSON.stringify(Object.keys(Store.docs).sort().map(k=>[k,Store.docs[k]]))")
      await pg.reload(); await pg.wait_for_timeout(700)
      after = await pg.evaluate("JSON.stringify(Object.keys(Store.docs).sort().map(k=>[k,Store.docs[k]]))")
      check("rechargement : toutes les données identiques", before == after)
      for v in ["today", "fridge", "workout", "progress", "coach", "profile"]: await tab(v)
      await tab("today"); await shot("17_apres_rechargement.png")
      check("aucune erreur JS", not errs, errs[:3])
      check("aucune erreur console", not cons, cons[:3])
      await b.close()
  finally:
    srv.terminate()
  print(f"\nOK {len(RES['ok'])}/{len(RES['ok']) + len(RES['bad'])}  ÉCHECS : {RES['bad']}")
  if RES["bad"]: raise SystemExit(1)
asyncio.run(main())
