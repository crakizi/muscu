# Test de la section Amis (lot 1) avec un faux serveur Supabase en mémoire (règles de dev/schema.sql reproduites).
# Lancer depuis dev/ : python3 build.py --pwa && python3 testamis.py
import asyncio, json, os, re, subprocess, time, uuid, urllib.parse as U
from playwright.async_api import async_playwright
D = os.path.dirname(os.path.abspath(__file__)); PORT = 8781; SH = f"{D}/shots/amis/"; os.makedirs(SH, exist_ok=True)
ME, AYA, LEO = "11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222", "33333333-3333-3333-3333-333333333333"
DB = {"profiles": {AYA: {"user_id": AYA, "pseudo": "Aya", "code": "AYA123", "is_public": False}, LEO: {"user_id": LEO, "pseudo": "Leo", "code": "LEO999", "is_public": True}},
      "links": [], "shares": []}
def share(owner, kind, sec, title, summary, payload): DB["shares"].append({"id": str(uuid.uuid4()), "owner": owner, "kind": kind, "section": sec, "ref": "x", "title": title, "summary": summary, "payload": payload, "created_at": time.time()})
share(AYA, "recipe", "food", "Bolognaise d'Aya", "4 parts · 520 kcal la part", {"name": "Bolognaise d'Aya", "portions": 4, "ings": [{"name": "Boeuf haché 5%", "g": 500, "per100": {"kcal": 125, "p": 21, "c": 0, "f": 5}}, {"name": "Pâtes crues", "g": 320, "per100": {"kcal": 355, "p": 12, "c": 72, "f": 1.5}}]})
share(AYA, "meal", "food", "Déjeuner : Skyr, Banane", "2 aliments · 260 kcal · P 18 g", {"meal": "Déjeuner", "items": [{"name": "Skyr", "g": 150, "per100": {"kcal": 63, "p": 11, "c": 4, "f": 0.2}}, {"name": "Banane", "g": 120, "per100": {"kcal": 89, "p": 1.1, "c": 23, "f": 0.3}}]})
share(AYA, "diet", "food", "Diète 2 jours", "≈ 2000 kcal par jour · 2 repas", {"kcal": 2000, "shopping": [], "days": [{"day": "Lundi", "meals": [{"meal": "Déjeuner", "name": "Poulet riz", "kcal": 1000, "p": 60, "c": 120, "f": 20, "ingredients": [{"name": "poulet", "g": 200}]}, {"meal": "Dîner", "name": "Omelette", "kcal": 1000, "p": 50, "c": 80, "f": 40, "ingredients": [{"name": "oeufs", "g": 240}]}]}]})
share(AYA, "workout", "sport", "Push d'Aya", "2 exercices · 6 séries", {"name": "Push d'Aya", "ex": [{"id": "incline_press_machine", "name": "Développé incliné", "sets": [{"w": 30, "r": 10}] * 3}, {"id": "aya_custom_dips", "name": "Dips lestés", "cat": "Mes exercices", "prim": ["triceps"], "sets": [{"w": 10, "r": 8}] * 3}]})
def friends(a, b): return any(l["status"] == "accepted" and {l["requester"], l["target"]} == {a, b} for l in DB["links"])
def can_see(owner): return owner == ME or DB["profiles"].get(owner, {}).get("is_public") or friends(ME, owner)
CALLS = []
async def api(route):
  req = route.request; u = U.urlparse(req.url); path = u.path; q = U.parse_qs(u.query); m = req.method; body = json.loads(req.post_data) if req.post_data else None
  CALLS.append(f"{m} {path}")
  def ok(data=None, st=200): return route.fulfill(status=st, content_type="application/json", body=json.dumps(data) if data is not None else "")
  def err(msg, st=400): return route.fulfill(status=st, content_type="application/json", body=json.dumps({"message": msg}))
  if path.startswith("/rest/v1/docs"): return await ok([] if m == "GET" else None, 200 if m == "GET" else 201)
  if path == "/rest/v1/rpc/fr_me": p = DB["profiles"].get(ME); return await ok(p)
  if path == "/rest/v1/rpc/fr_add":
    c = body["p_code"].strip(); t = next((p for p in DB["profiles"].values() if p["code"] == c.upper() or (p["is_public"] and p["pseudo"].lower() == c.lower())), None)
    if not t: return await err("code ou pseudo introuvable")
    if t["user_id"] == ME: return await err("c'est ton propre code")
    st = "accepted" if t["is_public"] else "pending"; DB["links"].append({"requester": ME, "target": t["user_id"], "status": st})
    return await ok({"user_id": t["user_id"], "pseudo": t["pseudo"], "status": st})
  if path == "/rest/v1/rpc/fr_answer":
    for l in DB["links"]:
      if l["requester"] == body["p_from"] and l["target"] == ME: l["status"] = "accepted"
    if not body["p_ok"]: DB["links"] = [l for l in DB["links"] if not (l["requester"] == body["p_from"] and l["target"] == ME)]
    return await ok(None, 204)
  if path == "/rest/v1/rpc/fr_leave":
    DB["shares"] = [s for s in DB["shares"] if s["owner"] != ME]; DB["links"] = [l for l in DB["links"] if ME not in (l["requester"], l["target"])]; DB["profiles"].pop(ME, None); return await ok(None, 204)
  if path == "/rest/v1/fr_profiles":
    if m == "POST":
      if any(p["pseudo"].lower() == body["pseudo"].lower() for p in DB["profiles"].values()): return await err("duplicate key value violates unique constraint", 409)
      DB["profiles"][ME] = {"user_id": ME, "pseudo": body["pseudo"], "code": "VUT777", "is_public": False}; return await ok(None, 201)
    if m == "PATCH": DB["profiles"][ME].update({k: v for k, v in body.items() if k in ("pseudo", "is_public")}); return await ok(None, 204)
    ids = re.findall(r"[0-9a-f-]{36}", q.get("user_id", [""])[0]); return await ok([{k: p[k] for k in ("user_id", "pseudo", "is_public")} for p in DB["profiles"].values() if p["user_id"] in ids and (can_see(p["user_id"]) or any({l["requester"], l["target"]} == {ME, p["user_id"]} for l in DB["links"]))])
  if path == "/rest/v1/fr_links":
    if m == "DELETE": DB["links"] = [l for l in DB["links"] if ME not in (l["requester"], l["target"]) or not (set([l["requester"], l["target"]]) <= set(re.findall(r"[0-9a-f-]{36}", u.query)))]; return await ok(None, 204)
    return await ok([l for l in DB["links"] if ME in (l["requester"], l["target"])])
  if path == "/rest/v1/fr_shares":
    if m == "POST": row = dict(body, id=str(uuid.uuid4()), owner=ME, created_at=time.time()); DB["shares"].append(row); return await ok([row], 201)
    if m == "DELETE": sid = q["id"][0][3:]; DB["shares"] = [s for s in DB["shares"] if not (s["id"] == sid and s["owner"] == ME)]; return await ok(None, 204)
    owner = q["owner"][0][3:]; rows = [s for s in DB["shares"] if s["owner"] == owner and can_see(owner)]
    return await ok(sorted(rows, key=lambda s: -s["created_at"]))
  return await err("route inconnue " + path, 404)
RES = {"ok": 0, "bad": []}
def check(name, cond, info=""):
  print(("OK   " if cond else "FAIL ") + name + (f"  ({info})" if info != "" else ""))
  if cond: RES["ok"] += 1
  else: RES["bad"].append(name)
async def main():
  srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT)], cwd=D + "/dist", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
      ctx = await b.new_context(viewport={"width": 390, "height": 844}, service_workers="block"); pg = await ctx.new_page(); errs = []
      pg.on("pageerror", lambda e: errs.append(str(e)))
      await pg.route("https://fake.supabase.co/**", api)
      await pg.goto(f"http://localhost:{PORT}/index.html"); await pg.wait_for_timeout(600)
      await pg.evaluate(f"""localStorage.clear(); LS.set('muscu_cfg', {{url:'https://fake.supabase.co', anon:'anon'}}); LS.set('muscu_sess', {{access_token:'t', refresh_token:'r', expires_at: Date.now()+864e5, user:{{id:'{ME}', email:'v@x.fr'}}}})""")
      await pg.add_script_tag(path=f"{D}/demo_seed.js"); await pg.evaluate("demoSeed()")
      await pg.reload(); await pg.wait_for_timeout(900)
      async def tab(v): await pg.evaluate(f"S.tab='{v}'; render()"); await pg.wait_for_timeout(400)
      async def click(sel): await pg.click(sel); await pg.wait_for_timeout(500)
      ev = lambda e: pg.evaluate(e)
      # 1. Désactivé par défaut : rien nulle part
      await tab("profile"); await pg.locator("[data-act=frEnable]").scroll_into_view_if_needed(); await pg.screenshot(path=SH + "1_profil_desactive.png")
      check("Amis désactivé par défaut (bouton Activer)", await pg.locator("[data-act=frEnable]").count() == 1)
      wid = await ev("Store.ids('w-').find(k => !Store.get(k).live)")
      await ev(f"openSheet(histSheet('{wid}'))"); await pg.wait_for_timeout(300)
      check("Pas de bouton de partage quand Amis est désactivé", await pg.locator("[data-act=frShare]").count() == 0)
      await ev("closeSheet()"); n0 = len(CALLS)
      check("Aucun appel serveur Amis tant que c'est désactivé", not any("/fr_" in c for c in CALLS))
      # 2. Activer → pseudo
      await click("[data-act=frEnable]")
      check("Écran de création du pseudo", await pg.locator("#frPseudo").count() == 1)
      await pg.screenshot(path=SH + "2_pseudo.png")
      await pg.fill("#frPseudo", "aya"); await click("[data-act=frCreate]")
      check("Pseudo déjà pris refusé", "pris" in " ".join(await pg.locator(".toast").all_inner_texts()))
      await pg.fill("#frPseudo", "Vuthy"); await click("[data-act=frCreate]"); await pg.wait_for_timeout(400)
      check("Profil Amis créé (privé)", (await ev("FR.me && FR.me.pseudo + '/' + FR.me.is_public")) == "Vuthy/false")
      # 3. Ajouter Aya (privée) → en attente ; Leo (public) par pseudo → ami tout de suite
      await pg.fill("#frCode", "aya123"); await click("[data-act=frAdd]"); await pg.wait_for_timeout(400)
      check("Demande envoyée à un profil privé", (await pg.locator("text=En attente").count()) == 1)
      await pg.fill("#frCode", "leo"); await click("[data-act=frAdd]"); await pg.wait_for_timeout(400)
      check("Profil public ajouté par pseudo sans validation", await ev("frFriends().map(p=>p.pseudo).join()") == "Leo")
      # Aya accepte (côté serveur) puis on recharge
      DB["links"][0]["status"] = "accepted"; await ev("frLoad(true)"); await pg.wait_for_timeout(500)
      check("Aya devient amie après acceptation", "Aya" in await ev("frFriends().map(p=>p.pseudo).join()"))
      await pg.screenshot(path=SH + "3_amis.png")
      # Demande reçue
      DB["profiles"]["44444444-4444-4444-4444-444444444444"] = {"user_id": "44444444-4444-4444-4444-444444444444", "pseudo": "Ismael", "code": "ISM000", "is_public": False}
      DB["links"].append({"requester": "44444444-4444-4444-4444-444444444444", "target": ME, "status": "pending"}); await ev("frLoad(true)"); await pg.wait_for_timeout(500)
      check("Demande reçue affichée", await pg.locator(".fr-req").count() == 1)
      await pg.screenshot(path=SH + "4_demande.png")
      await click("[data-act=frAnswer][data-ok='1']"); await pg.wait_for_timeout(400)
      check("Demande acceptée", "Ismael" in await ev("frFriends().map(p=>p.pseudo).join()"))
      # 4. Profil d'Aya : deux sections, copier
      await click(f"[data-act=frOpen][data-v='{AYA}']"); await pg.wait_for_timeout(600)
      check("Section Alimentation : 3 éléments", await pg.locator("[data-act=frCopy]").count() == 3)
      await pg.screenshot(path=SH + "5_profil_aya_alim.png")
      nrec = await ev("recipes().length")
      await click("[data-act=frCopy] >> nth=0")  # le plus récent = séance ? non : section food → diète en premier
      first = await ev("(FR.shares[S.frView]||[]).filter(s=>s.section==='food')[0].kind")
      if first == "diet":
        check("Diète : demande de confirmation en place (plan existant)", "Remplacer" in await pg.locator("[data-act=frCopy] >> nth=0").inner_text())
        await click("[data-act=frCopy] >> nth=0")
      T = await ev("targets().kcal"); mp = await ev("Store.get('mealplan')")
      check("Diète copiée, portions ajustées à mes kcal", mp.get("from") == "Aya" and abs(sum(m["kcal"] for m in mp["days"][0]["meals"]) - T) <= 2, f"{sum(m['kcal'] for m in mp['days'][0]['meals'])} vs {T}")
      for i, s in enumerate(await ev("(FR.shares[S.frView]||[]).filter(s=>s.section==='food').map(s=>s.kind)")):
        if s == "recipe": await click(f"[data-act=frCopy] >> nth={i}")
      check("Recette copiée dans mes recettes", await ev("recipes().length") == nrec + 1 and await ev("recipes()[0].name") == "Bolognaise d'Aya")
      ne = await ev("day(S.day).entries.length")
      for i, s in enumerate(await ev("(FR.shares[S.frView]||[]).filter(s=>s.section==='food').map(s=>s.kind)")):
        if s == "meal": await click(f"[data-act=frCopy] >> nth={i}")
      check("Repas copié dans le journal du jour affiché", await ev("day(S.day).entries.length") == ne + 2)
      await click("[data-act=frSec][data-v=sport]"); await pg.screenshot(path=SH + "6_profil_aya_sport.png")
      await click("[data-act=frCopy] >> nth=0")
      check("Séance copiée dans mes séances", "Push d'Aya" in await ev("Object.keys(program()).join('|')"))
      check("Exercice inconnu ajouté à mes exercices", await ev("getEx('aya_custom_dips').name") == "Dips lestés")
      await click("[data-act=frCopy] >> nth=0")
      check("Copier deux fois ne remplace pas : nouveau nom", "Push d'Aya (Aya)" in await ev("Object.keys(program()).join('|')"))
      # 5. Partager mes éléments
      await click("[data-act=frBack]")
      await ev(f"openSheet(histSheet('{wid}'))"); await pg.wait_for_timeout(300)
      check("Bouton « Ajouter à mon profil » sur une séance", await pg.locator("[data-act=frShare]").count() == 1)
      await click("[data-act=frShare]"); await pg.screenshot(path=SH + "7_seance_partagee.png")
      check("Séance ajoutée au profil, sans payload privé", any(s["owner"] == ME and s["kind"] == "workout" and "notes" not in s["payload"] and "start" not in s["payload"] for s in DB["shares"]))
      check("Bouton devient « Retirer »", await pg.locator(".fr-share >> text=Retirer").count() == 1)
      rid = await ev("recipes().find(r=>r.name!=='Bolognaise d\\'Aya').id")
      await ev(f"closeSheet(); openSheet(recipePortionSheet('{rid}'))"); await pg.wait_for_timeout(300); await click("[data-act=frShare]")
      eid = await ev("(day(S.day).entries||[])[0].id"); await ev(f"closeSheet(); openSheet(editEntrySheet('{eid}'))"); await pg.wait_for_timeout(300); await click("[data-act=frShare]")
      await ev("closeSheet(); S.tab='fridge'; S.kTab='plan'; S.czTab='plan'; render()"); await pg.wait_for_timeout(400)
      has_diet_btn = await pg.locator("[data-act=frShare][data-k=diet]").count()
      if has_diet_btn: await click("[data-act=frShare][data-k=diet]")
      check("Bouton de partage de la diète (plan de repas)", has_diet_btn == 1)
      mine = [s["kind"] for s in DB["shares"] if s["owner"] == ME]
      check("4 types partagés depuis mes données", sorted(mine) == ["diet", "meal", "recipe", "workout"], mine)
      await tab("friends"); await click(f"[data-act=frOpen][data-v='{ME}']"); await click("[data-act=frSec][data-v=food]"); await pg.screenshot(path=SH + "8_mon_profil.png")
      check("Mon profil : 3 éléments Alimentation", await pg.locator("[data-act=frUnshare]").count() == 3)
      await click("[data-act=frUnshare] >> nth=0")
      check("Retirer un élément de mon profil", len([s for s in DB["shares"] if s["owner"] == ME]) == 3)
      # 6. Réglages : public, retirer un ami, désactiver
      await click("[data-act=frBack]"); await click("details.card summary"); await click("[data-act=frPublic][data-v='1']")
      check("Profil passé en public", DB["profiles"][ME]["is_public"] is True)
      await pg.screenshot(path=SH + "9_reglages.png")
      await click(f"[data-act=frOpen][data-v='{LEO}']"); await click("[data-act=frRemove]"); await click("[data-act=frRemove]")
      check("Ami retiré (2 taps, sans pop-up)", "Leo" not in await ev("frFriends().map(p=>p.pseudo).join()"))
      await click("[data-act=frDisable]"); await click("[data-act=frDisable]")
      check("Désactiver retire profil, partages et liens du serveur", ME not in DB["profiles"] and not any(s["owner"] == ME for s in DB["shares"]) and not any(ME in (l["requester"], l["target"]) for l in DB["links"]))
      check("Retour à Profil avec Amis désactivé", await pg.locator("[data-act=frEnable]").count() == 1)
      check("Mes copies restent dans mes données", "Push d'Aya" in await ev("Object.keys(program()).join('|')"))
      # 7. Lien d'invitation
      await ev("Store.set('settings', Object.assign({}, Store.get('settings',{}), {friendsOn:true}))")
      await pg.goto("about:blank"); await pg.goto(f"http://localhost:{PORT}/index.html#ami=leo999"); await pg.wait_for_timeout(1500)
      check("Lien d'invitation ouvre Amis avec le code", await ev("S.tab") == "friends" and await ev("S.frPrefill") == "LEO999", await ev("S.tab+' '+S.frPrefill+' '+frOn()+' '+location.hash"))
      check("Aucune erreur JavaScript", not errs, errs[:3])
      await b.close()
  finally: srv.terminate()
  print(f"\n{RES['ok']} réussies, {len(RES['bad'])} échouées", RES["bad"])
asyncio.run(main())
