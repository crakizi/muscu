# Design system 2 (section Design) : contrastes WCAG 2.2 AA sur la VRAIE app, toutes combinaisons.
# Lancer depuis dev/ après `python3 build.py --local` : python3 testdesign2.py
# - vérifie que sans « ?ds » l'app est strictement inchangée ;
# - mesure les contrastes (texte 4,5:1 ; gros texte et éléments graphiques 3:1) pour
#   5 palettes muscu × 3 intensités × 2 modes × 3 identités communes × 8 écrans ;
# - écrit le rapport dans docs/rapport-accessibilite-design.md et des captures dans shots/design2/.
import asyncio, json, subprocess, os, time
from playwright.async_api import async_playwright
D = os.path.dirname(os.path.abspath(__file__)); PORT = int(os.environ.get("PORT", "8774"))
CHROME = os.environ.get("CHROME") or next((c for c in ["/usr/bin/google-chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"] if os.path.exists(c)), None)
SH = f"{D}/shots/design2/"; os.makedirs(SH, exist_ok=True)
REPORT = os.path.join(D, "..", "docs", "rapport-accessibilite-design.md")
MUSCU = ["cherry", "ruby", "pome", "graphite", "carbon"]; STYLES = ["a", "b", "c"]; MODES = ["light", "dark"]; COMMUN = ["neutre", "petrole", "contextuel"]
SCREENS = ["home", "today", "fridge", "workout", "live", "rest", "progress", "profile"]

MEASURE = r"""() => {
  const parse = s => { s = s.trim(); let m;
    if ((m = s.match(/^rgba?\(([^)]+)\)/))) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    if ((m = s.match(/^color\(srgb ([^)]+)\)/))) { const p = m[1].split(/[ \/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; }
    return null; };
  const over = (f, b) => { const a = f[3]; return [f[0] * a + b[0] * (1 - a), f[1] * a + b[1] * (1 - a), f[2] * a + b[2] * (1 - a), 1]; };
  const bgOf = el => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } }
    let b = [255, 255, 255, 1]; const pg = parse(getComputedStyle(document.body).backgroundColor); if (pg && pg[3] > 0) b = pg;
    for (let i = stack.length - 1; i >= 0; i--) b = over(stack[i], b); return b; };
  const L = c => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const vis = e => e && e.offsetParent !== null && e.getBoundingClientRect().width > 0;
  const out = [];
  const txt = (name, el, min) => { if (!vis(el)) return; const b = bgOf(el); const f = over(parse(getComputedStyle(el).color), b); out.push([name, Math.round(ratio(f, b) * 100) / 100, min]); };
  const gfx = (name, el, prop, min) => { if (!vis(el)) return; const b = bgOf(el.parentElement); const c = parse(getComputedStyle(el)[prop]); if (!c) return; out.push([name, Math.round(ratio(over(c, b), b) * 100) / 100, min]); };
  const q = s => document.querySelector(s);
  txt("texte principal (titre)", q("#app h1"), 4.5);
  txt("texte secondaire sur carte", q("#app .card .mut, #app .card .xs.mut"), 4.5);
  txt("texte de carte", q("#app .card .b, #app .card h2, #app .card h3"), 4.5);
  const prim = [...document.querySelectorAll("#app button")].find(b => vis(b) && !/\b(sec|ghost|danger|chip|small|link)\b/.test(b.className) && !b.closest(".chips,.seg,.week,.stepper,.scale,.qa,nav,.dsh-grid") && b.textContent.trim().length > 2);
  txt("bouton principal", prim, 4.5);
  txt("bouton secondaire", [...document.querySelectorAll("#app button.sec")].find(vis), 4.5);
  txt("puce active", [...document.querySelectorAll("#app .chip.on, #app .wd.on b")].find(vis), 4.5);
  txt("onglet actif (barre du bas)", q("nav.tabs button.on"), 4.5);
  txt("onglet inactif (barre du bas)", q("nav.tabs button:not(.on):not(.scanbtn)"), 4.5);
  gfx("bouton Scanner (forme)", q("nav.tabs .scanbtn span"), "backgroundColor", 3);
  const hero = q(".ds-hero"); if (hero) { txt("carte principale : texte", hero.querySelector(".big, .b, h2, h3, .dsh-v") || hero, 4.5); txt("carte principale : texte secondaire", hero.querySelector(".mut"), 4.5); }
  txt("minuteur de repos", q(".restbar .restin b"), 4.5);
  document.querySelectorAll(".mrings .dot").forEach((d, i) => gfx("macro " + ["P", "G", "L"][i] + " (pastille)", d, "backgroundColor", 3));
  { const r = q(".ds-hero .reco, .ds-hero .banner"); if (r) txt("encadré conseil (carte principale)", r, 4.5); }
  txt("étiquette", [...document.querySelectorAll("#app .tag")].find(vis), 4.5);
  txt("champ de saisie", [...document.querySelectorAll("#app input:not([type=checkbox]):not([type=date]), #app select")].find(vis), 4.5);
  return out;
}"""

async def main():
  srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
  ok = bad = 0; fails = {}; worst = {}; errs = []
  try:
    async with async_playwright() as p:
      b = await p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--use-gl=swiftshader", "--ignore-gpu-blocklist"])
      pg = await b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
      pg.on("pageerror", lambda e: errs.append(str(e)))
      base = f"http://localhost:{PORT}/index.local.html"
      await pg.goto(base); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)
      await pg.add_script_tag(path=f"{D}/demo_seed.js"); await pg.evaluate("demoSeed()"); await pg.reload(); await pg.wait_for_timeout(600)
      # 1. sans ?ds : rien ne change
      st = await pg.evaluate("[document.documentElement.dataset.ds||'', getComputedStyle(document.documentElement).getPropertyValue('--acc').trim(), typeof DS!=='undefined' && DS.ctrl]")
      same = st[0] == "" and st[1].lower() == "#2563eb" and st[2] is False
      print(("OK   " if same else "FAIL ") + "app normale inchangée sans ?ds", st); ok += same; bad += (not same)
      # 2. combinaisons
      await pg.goto(base + "?ds=1&screen=today"); await pg.wait_for_timeout(700)
      await pg.add_style_tag(content="*,*::before,*::after{transition:none!important;animation:none!important}")  # mesurer l'état final, pas une transition
      for mode in MODES:
        for style in STYLES:
          for commun in COMMUN:
            for m in (MUSCU if commun == "neutre" else ["cherry"]):
              for scr in (SCREENS if commun == "neutre" else ["home", "profile", "today"]):
                if m != "cherry" and scr not in ("live", "rest", "workout", "home"): continue
                await pg.evaluate(f"dsSet({{on:true,muscu:'{m}',style:'{style}',commun:'{commun}',mode:'{mode}'}}); dsScreen('{scr}')"); await pg.wait_for_timeout(120)
                res = await pg.evaluate(MEASURE)
                for name, r, mn in res:
                  key = f"{name}"; combo = f"{m}/{style}/{mode}/{commun}/{scr}"
                  if key not in worst or r < worst[key][0]: worst[key] = (r, combo, mn)
                  if r >= mn: ok += 1
                  else: bad += 1; fails.setdefault(key, []).append(f"{combo} = {r}")
                if commun == "neutre" and (m == "cherry" or scr in ("live", "home")) and scr in ("home", "today", "fridge", "live", "progress"):
                  await pg.evaluate("window.scrollTo(0,0)"); await pg.screenshot(path=f"{SH}{scr}_{m}_{style}_{mode}.png")
      await pg.evaluate("dsSet({on:false}); render()")
      await b.close()
  finally:
    srv.terminate()
  # rapport
  lines = ["# Rapport d'accessibilité — design system 2 (aperçu)", "", f"_Généré par `dev/testdesign2.py` le {time.strftime('%d/%m/%Y %H:%M')}. Mesures sur la vraie app (données de démo), WCAG 2.2 AA : texte ≥ 4,5:1, éléments graphiques ≥ 3:1._", "",
           f"**Résultat : {ok} vérifications réussies, {bad} sous le seuil.**", "", "## Pire cas par élément", "", "| Élément | Contraste le plus faible | Seuil | Combinaison (palette/style/mode/commun/écran) |", "|---|---|---|---|"]
  for k, (r, c, mn) in sorted(worst.items()): lines.append(f"| {k} | {r}:1 {'✅' if r >= mn else '❌'} | {mn}:1 | {c} |")
  if fails:
    lines += ["", "## Sous le seuil (détail)", ""]
    for k, v in fails.items(): lines.append(f"- **{k}** ({len(v)}) : " + " ; ".join(v[:8]) + (" …" if len(v) > 8 else ""))
  if errs: lines += ["", "## Erreurs JavaScript", ""] + [f"- {e}" for e in errs[:10]]
  open(REPORT, "w").write("\n".join(lines) + "\n")
  print(f"\nOK {ok}  SOUS LE SEUIL {bad}  ERREURS JS {len(errs)}")
  for k, v in fails.items(): print("FAIL", k, len(v), v[:3])
asyncio.run(main())
