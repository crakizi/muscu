import asyncio, os, json
from playwright.async_api import async_playwright
PORT = os.environ.get("PORT", "8771"); SH = "shots/nutrition/"; os.makedirs(SH, exist_ok=True)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = await b.new_page(viewport={"width":390,"height":844}); errs=[]; fails=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    def ok(c, m):
      print(("OK   " if c else "FAIL ")+m)
      if not c: fails.append(m)
    await pg.goto(f"http://localhost:{PORT}/index.local.html"); await pg.wait_for_timeout(500)
    await pg.evaluate("localStorage.setItem('muscu_onb_hide','1')")
    # 14 jours de pesées + une séance aujourd'hui
    await pg.evaluate("""for(let i=1;i<=14;i++){const k=addDays(todayKey(),-i); Store.set('d-'+k,{entries:[],acts:[],weight:80+(i%3)*0.6})}
      Store.set('profile',Object.assign({},Store.get('profile',{}),{weekPlan:['muscu','repos','muscu','repos','muscu','sport','repos']}));
      Store.set('w-1',{live:false,name:'Haut',start:Date.now()-3600e3,end:Date.now(),ex:[]});
      updDay(d=>{d.weight=81.2; d.entries.push(makeEntry({name:'Poulet',per100:{kcal:110,p:23,c:0,f:2}},200,'Déjeuner'))}); render()""")
    r = await pg.evaluate("JSON.stringify([dayType(todayKey()), dayTargets(todayKey()), targets().kcal])")
    t, T, base = json.loads(r); ok(t == "muscu", f"type du jour = muscu ({t})")
    ok(T["kcal"] > base and T["p"] == json.loads(await pg.evaluate("JSON.stringify(targets().p)")), f"jour muscu plus de kcal ({T['kcal']} > {base}), protéines constantes")
    # moyenne hebdo = objectif
    avg = await pg.evaluate("(()=>{const ws=weekKey(parseKey(todayKey()));let s=0;for(let i=0;i<7;i++)s+=dayTargets(addDays(ws,i)).kcal;return s/7})()")
    ok(abs(avg - base) <= 2, f"moyenne hebdo {avg:.1f} ≈ {base}")
    ok(await pg.evaluate("typeof window.dayType==='function' && typeof window.dayTargets==='function'"), "contrat window.dayType/dayTargets")
    ok(await pg.locator(".dtpill").count() == 1, "pastille type de jour affichée")
    ok(await pg.locator(".mrings .mring").count() == 3, "3 anneaux P/G/L")
    await pg.evaluate("Store.set('checkinSeen',{week:weekKey()}); render(); window.scrollTo(0, document.querySelector('.dstrip').getBoundingClientRect().top + scrollY - 60)"); await pg.wait_for_timeout(200)
    await pg.screenshot(path=SH+"1_journal_restant.png")
    # modification manuelle
    await pg.click(".dtpill"); await pg.click("button[data-act=dtSet][data-v=repos]"); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("dayType(todayKey())") == "repos", "type modifié à la main → repos")
    ok(await pg.evaluate("dayTargets(todayKey()).kcal < targets().kcal"), "jour repos moins de kcal")
    await pg.click(".dtpill"); await pg.click("button[data-act=dtSet][data-v='']"); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("dayType(todayKey())") == "muscu", "retour auto")
    # dépassement : jamais de rouge
    await pg.evaluate("updDay(d=>d.entries.push(makeEntry({name:'Pizza',per100:{kcal:5000,p:10,c:400,f:300}},100,'Dîner'))); render()")
    txt = await pg.inner_text(".ring .in"); ok("+" in txt and "en plus" in txt, f"dépassé affiché « +… kcal en plus » ({txt.strip()[:30]})")
    red = await pg.evaluate("[...document.querySelectorAll('.card svg circle')].some(c=>/red/.test(c.getAttribute('stroke')))")
    ok(not red, "aucun anneau rouge")
    await pg.evaluate("updDay(d=>d.entries=d.entries.filter(e=>e.name!=='Pizza')); render()")
    # objectif par repas
    await pg.click(".nmore summary"); await pg.click("button[data-act=byMeal][data-v='1']"); await pg.wait_for_timeout(200)
    h = await pg.locator(".mhint").count(); ok(h >= 2, f"objectif sous les repas vides ({h})")
    await pg.evaluate("window.scrollTo(0, document.querySelector('.mhint').getBoundingClientRect().top + scrollY - 400)"); await pg.wait_for_timeout(200)
    await pg.screenshot(path=SH+"2_par_repas.png")
    sh = json.loads(await pg.evaluate("JSON.stringify(mealShares(todayKey()))")); ok("Petit-déj" not in sh and "Dîner" in sh, f"repas restants après le déjeuner : {list(sh)}")
    # portion auto
    await pg.evaluate("S.add.meal='Dîner'"); await pg.evaluate("openSheet(addSheet); S.add.sel={name:'Skyr',per100:{kcal:60,p:10,c:4,f:0.2}}; S.add.g=100; renderSheet()")
    await pg.fill("#pgV", "30"); await pg.click("button[data-act=pgGo][data-m=p]"); await pg.wait_for_timeout(150)
    ok(await pg.evaluate("S.add.g") == 300, "30 g de protéines → 300 g de skyr")
    await (await pg.query_selector(".sheet")).screenshot(path=SH+"3_portion_auto.png")
    await pg.click("button[data-act=pgGo][data-m=kcal]"); ok(await pg.evaluate("S.add.g") == 50, "30 kcal → 50 g")
    # ajout rapide
    await pg.evaluate("closeSheet(); resetAdd(''); S.add.tab='quick'; openSheet(addSheet)")
    await pg.fill("#qaN", "kebab"); await pg.fill("#qaP", "40"); await pg.fill("#qaC", "80"); await pg.fill("#qaF", "30")
    await (await pg.query_selector(".sheet")).screenshot(path=SH+"4_ajout_rapide.png")
    await pg.click("button[data-act=qaSave]"); await pg.wait_for_timeout(200)
    e = json.loads(await pg.evaluate("JSON.stringify(day(todayKey()).entries.find(e=>e.name==='kebab'))"))
    ok(e and round(e["n"]["kcal"]) == 750, f"kebab 4/4/9 = 750 kcal ({e and e['n']['kcal']})")
    # poids tendance
    W = json.loads(await pg.evaluate("JSON.stringify(weightTrendAt())")); ok(W["raw"] == 81.2 and W["trend"] != 81.2, f"tendance {W['trend']} ≠ pesée {W['raw']}")
    pill = await pg.inner_text(".dstrip .dpill"); ok(str(W["trend"]) in pill and "81.2" not in pill, f"pastille poids = tendance seule : {pill}")
    await pg.click(".dstrip .dpill"); await pg.wait_for_timeout(200); ok(await pg.input_value("#inW") == "81.2", "pesée brute dans la fiche détail"); await pg.evaluate("closeSheet()")
    # réglage profil : désactiver
    await pg.click("nav button[data-v=profile]"); await pg.wait_for_timeout(300)
    await pg.locator("text=Objectifs selon le jour").scroll_into_view_if_needed(); await pg.screenshot(path=SH+"5_profil_reglages.png")
    await pg.click("input[data-act=cycleOn]"); await pg.wait_for_timeout(150)
    ok(await pg.evaluate("dayTargets(todayKey()).kcal === targets().kcal"), "désactivé → objectif fixe")
    print("\n".join(errs) or "no errors"); await b.close()
    if fails or errs: raise SystemExit(1)
asyncio.run(main())
