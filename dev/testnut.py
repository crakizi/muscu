import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    pg = await b.new_page(viewport={"width":430,"height":932}); errs=[]
    pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
    await pg.goto("http://localhost:8765/index.local.html"); await pg.wait_for_timeout(500)
    # données simulées : 20 jours de repas + pesées
    await pg.evaluate("""for(let i=1;i<=20;i++){const k=addDays(todayKey(),-i); Store.set('d-'+k,{entries:[{id:'x'+i,meal:'',name:'repas',g:100,n:{kcal:2600,p:160,c:300,f:80,fib:25,sugar:0,satfat:0,salt:0},micro:{}}],acts:[],weight: i%4===0? 80.5 - (20-i)*0.03 : undefined})}""")
    await pg.evaluate("""Store.set('mealplan',{days:[{day:'Lundi',meals:[{meal:'Déjeuner',name:'Poulet riz courgettes',kcal:700,p:55,c:80,f:15,prep_min:25,ingredients:[{name:'poulet',g:180},{name:'riz',g:90}],steps:'1. Cuire le riz 12 min'}]}],shopping:[{aisle:'Viandes',items:[{name:'poulet',qty:'1 kg'}]}],batch:'Dimanche : ...'})""")
    await pg.click("nav button[data-v=fridge]"); await pg.wait_for_timeout(1500)
    await pg.screenshot(path="n_frigo.png")
    await pg.click("button[data-act=kTab][data-v=plan]"); await pg.click("button[data-act=czFold][data-v=besoins]"); await pg.wait_for_timeout(500)  # « Mes besoins » : replié dans Plan (Cuisine lot 2)
    await pg.screenshot(path="n_besoins.png", full_page=True)
    await pg.click("button[data-act=kTab][data-v=plan]"); await pg.wait_for_timeout(500)
    await pg.screenshot(path="n_plan.png")
    await pg.click("button[data-act=mpEat]"); await pg.wait_for_timeout(300)
    print(await pg.evaluate("day(todayKey()).entries.map(e=>e.name+' '+Math.round(e.n.kcal))"))
    print(await pg.evaluate("JSON.stringify(Store.get('adjust')) + ' ' + JSON.stringify(targets().source)"))
    await pg.click("button[data-act=kTab][data-v=recettes]"); await pg.click("button[data-act=czFold][data-v=idees]"); await pg.wait_for_timeout(300)  # idées : repliées dans Recettes
    print("\n".join(errs) or "no errors"); await b.close()
asyncio.run(main())
