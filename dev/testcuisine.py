# Test Cuisine lots 1-2 (navigation à 4 onglets, retraits du frigo) : frigo (péremption), avec ce que j'ai, courses, budget, batch, plan. Serveur : python3 -m http.server 8772 (dans dev/)
import asyncio, json, subprocess, os, time
from playwright.async_api import async_playwright
D = os.path.dirname(os.path.abspath(__file__)); PORT = 8772
async def main():
  srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT)], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
  ok = []; bad = []
  def check(name, cond, info=""): (ok if cond else bad).append(name + (f" [{info}]" if info and not cond else ""))
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--use-gl=swiftshader", "--ignore-gpu-blocklist"])
      pg = await b.new_page(viewport={"width": 390, "height": 844}); errs = []
      pg.on("pageerror", lambda e: errs.append("PAGEERR " + str(e)))
      await pg.goto(f"http://localhost:{PORT}/index.local.html"); await pg.wait_for_timeout(600)
      await pg.evaluate("""() => {
        const t = todayKey(), P = (k,p,c,f) => ({kcal:k,p,c,f,fib:0,sugar:0,satfat:0,salt:0});
        Store.set("fridge", {items:[{id:"a",name:"blanc de poulet",qty:500,unit:"g",zone:"frigo",cat:"viande",exp:addDays(t,1)},{id:"b",name:"riz",qty:1000,unit:"g",zone:"placard",cat:"feculent"},{id:"c",name:"yaourt nature",qty:4,unit:"pc",gPerPc:125,zone:"frigo",cat:"laitier",exp:addDays(t,10)}]});
        Store.set("recipes", {items:[{id:"r1",name:"Riz poulet crème",portions:4,ings:[{name:"blanc de poulet",g:400,per100:P(110,23,0,1.5)},{name:"riz",g:300,per100:P(350,7,78,1)},{name:"crème fraîche",g:200,per100:P(300,2,3,30)}]}]});
        Store.set("notes", {items:[{id:"n1",t:Date.now(),text:"🍽️ Omelette aux épinards | omelette dorée\\nIngrédients :\\n- 3 œufs\\n- 100 g d'épinards\\n- sel, poivre\\nÉtapes\\n1. Bats les œufs.\\nMacros : 320 kcal · P 24 g · G 4 g · L 22 g"}]});
        Store.set("mealplan", {created:Date.now(),days:[{day:"Lundi",meals:[{meal:"Déjeuner",name:"Poulet riz brocoli",kcal:650,p:50,c:80,f:12,ingredients:[{name:"blanc de poulet",g:700},{name:"riz",g:100},{name:"brocoli",g:200}]}]}],shopping:[]});
      }""")
      await pg.click("nav button[data-v=fridge]"); await pg.wait_for_timeout(500)
      t = await pg.inner_text("#app"); check("à finir vite", "À finir vite" in t and "demain" in t)
      await pg.screenshot(path=f"{D}/shots/cuisine/1-frigo.png")
      # date de péremption via la fiche
      await pg.click(".czsoon [data-act=fridgeEdit]"); await pg.fill("#fiE", "2030-01-01"); await pg.click("button[data-act=fridgeSave]"); await pg.wait_for_timeout(200)
      check("péremption modifiable", await pg.evaluate("fridgeDoc().items.find(i=>i.id==='a').exp") == "2030-01-01")
      await pg.evaluate("""() => { const d = clone(fridgeDoc()); d.items.find(i=>i.id==='a').exp = addDays(todayKey(),1); Store.set("fridge", d); }""")
      # avec ce que j'ai
      check("une seule rangée d'onglets", await pg.locator(".cztabs .ktab").count() == 4 and await pg.locator(".czsubs").count() == 0)
      await pg.click("button[data-act=czSub][data-v=recettes]"); await pg.wait_for_timeout(300)
      t = await pg.inner_text("#app")
      check("« Recettes qui les utilisent » → onglet Recettes", await pg.locator(".cztabs .ktab.on[data-v=recettes]").count() == 1)
      check("2/3 il manque crème", "2/3 — il manque : crème fraîche" in t)
      check("idée gardée analysée", "Omelette aux épinards" in t and "0/2" in t)
      order = await pg.locator(".czrec .b.sm").all_inner_texts(); check("tri dispo", order[0].startswith("Riz poulet"))
      check("ingrédient prioritaire", "utilise : blanc de poulet" in t)
      await pg.screenshot(path=f"{D}/shots/cuisine/2-avec-ce-que-jai.png")
      await pg.click("button[data-act=czRecShop][data-v=r1]"); await pg.wait_for_timeout(200)
      # courses
      await pg.click("button[data-act=kTab][data-v=courses]"); await pg.wait_for_timeout(200)
      await pg.click("button[data-act=czPlanShop]"); await pg.wait_for_timeout(200)
      items = await pg.evaluate("shopItems().map(s=>[s.name,s.qty,s.unit,s.aisle])")
      names = [i[0] for i in items]
      check("que les manquants", "riz" not in names and "crème fraîche" in names and "brocoli" in names)
      check("complément poulet 200 g", ["blanc de poulet", 200, "g", "viande"] in items)
      # budget
      await pg.click("button[data-act=czFold][data-v=budget]"); await pg.wait_for_timeout(200)
      await pg.fill("#czBudget", "50"); await pg.press("#czBudget", "Tab"); await pg.wait_for_timeout(200)
      row = pg.locator(".czprice[data-n='crème fraîche'] input"); await row.fill("4"); await row.press("Tab"); await pg.wait_for_timeout(200)
      await pg.fill("#czPriceN", "blanc de poulet"); await pg.fill("#czPriceV", "8"); await pg.click("button[data-act=czPriceAdd]"); await pg.wait_for_timeout(200)
      check("prix retenus", await pg.evaluate("Object.keys(priceDoc().items).length") == 2 and await pg.evaluate("priceDoc().week") == 50)
      t = await pg.inner_text("#app"); check("total liste", "≈ 2,40 €" in t)  # 0,8 € crème + 1,6 € poulet
      await pg.check("input[data-act=czShopChk] >> nth=0"); await pg.wait_for_timeout(300)
      check("coché → frigo", await pg.evaluate("pantryHas('crème fraîche') || pantryHas('brocoli') || pantryList().length > 3"))
      await pg.click("button[data-act=czShare]"); await pg.wait_for_timeout(200)
      txt = await pg.input_value("#czShareTxt"); check("texte partageable", "Liste de courses" in txt and "Viandes" in txt)
      await pg.screenshot(path=f"{D}/shots/cuisine/3-courses.png", full_page=True)
      check("budget replié dans Courses, résumé visible", "Budget : 0,00 € /" in t or "Budget :" in t)
      check("jauge", await pg.locator(".czgauge").count() == 1)
      await pg.screenshot(path=f"{D}/shots/cuisine/4-budget.png")
      # batch
      await pg.click("button[data-act=kTab][data-v=plan]"); await pg.wait_for_timeout(200)
      check("plan : pas de 2e liste de courses", "Liste de courses" not in await pg.inner_text("#app"))
      await pg.click("button[data-act=czFold][data-v=batchNew]"); await pg.wait_for_timeout(200)
      await pg.select_option("select[data-cz=bRec]", "r1"); await pg.wait_for_timeout(200)
      check("prérempli depuis recette", await pg.input_value("#czBN") == "Riz poulet crème")
      q0 = await pg.evaluate("[pantryList().find(i=>i.name==='blanc de poulet').qty, pantryList().find(i=>i.name==='riz').qty]")
      await pg.click("button[data-act=czBatchSave]"); await pg.wait_for_timeout(200)
      q1 = await pg.evaluate("[pantryList().find(i=>i.name==='blanc de poulet').qty, pantryList().find(i=>i.name==='riz').qty]")
      check("préparer un batch retire ses ingrédients", q1 == [q0[0] - 400, q0[1] - 300], f"{q0} → {q1}")
      fr = await pg.evaluate("JSON.stringify(pantryList())")
      await pg.click("button[data-act=czBatchEat]"); await pg.wait_for_timeout(300)
      check("batch mangé", await pg.evaluate("batchItems()[0].left") == 3 and await pg.evaluate("(day(todayKey()).entries||[]).length") == 1)
      check("« Mangé » ne retire plus rien du frigo", await pg.evaluate("JSON.stringify(pantryList())") == fr)
      # « Mangé » note au jour affiché dans le journal
      await pg.evaluate("S.day = addDays(todayKey(), -2)")
      await pg.click("button[data-act=czBatchEat] >> nth=0"); await pg.wait_for_timeout(300)
      check("« Mangé » au jour affiché", await pg.evaluate("(day(addDays(todayKey(),-2)).entries||[]).filter(e=>e.src==='batch').length") == 1 and await pg.evaluate("(day(todayKey()).entries||[]).length") == 1)
      check("toast avec la date", "le " in " ".join(await pg.locator(".toast").all_inner_texts()))
      # « Copier hier » retire du frigo ce qui y est (aliment simple + recette perso ; pas les portions de batch)
      await pg.evaluate("""() => { const y = addDays(todayKey(), -1); const P = {kcal:350,p:7,c:78,f:1,fib:0,sugar:0,satfat:0,salt:0};
        const d = clone(day(y)); d.entries = [makeEntry({name:"riz", per100:P}, 100, ""), makeEntry({name:"Poulet curry", per100:P, src:"batch"}, 300, "")]; saveDay(y, d); S.day = todayKey(); }""")
      r0q = await pg.evaluate("pantryList().find(i=>i.name==='riz').qty")
      await pg.evaluate("ACT.copyYesterday()"); await pg.wait_for_timeout(300)
      check("Copier hier retire du frigo", await pg.evaluate("pantryList().find(i=>i.name==='riz').qty") == r0q - 100)
      check("toast Copier hier", "retiré(s) du frigo" in " ".join(await pg.locator(".toast").all_inner_texts()))
      await pg.evaluate("S.day = todayKey()")
      await pg.screenshot(path=f"{D}/shots/cuisine/5-batch.png")
      # plan de repas : coût injecté
      await pg.click("button[data-act=kTab][data-v=plan]"); await pg.wait_for_timeout(300)
      t = await pg.inner_text("#app"); check("coût du plan", "Coût estimé du plan" in t)
      # API frigo + contrat dayTargets
      rq = await pg.evaluate("pantryList().find(i=>i.name==='riz').qty")
      check("pantryUse", await pg.evaluate("pantryUse('riz', 100).qty") == rq - 100)
      await pg.evaluate("window.dayTargets = () => ({kcal:3000,p:200,g:300,l:80})")
      await pg.click("button[data-act=kTab][data-v=recettes]"); await pg.wait_for_timeout(200)
      t = await pg.inner_text("#app"); rk = await pg.evaluate("Math.round(3000 - dayTotals(todayKey()).kcal)"); check("dayTargets utilisé", f"Reste du jour : {rk} kcal" in t)
      print("\n".join(errs) or "no errors"); await b.close()
  finally:
    srv.terminate()
  print(f"OK {len(ok)}/{len(ok)+len(bad)}", "ÉCHECS:", bad)
asyncio.run(main())
