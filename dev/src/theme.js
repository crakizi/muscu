// ===================== DESIGN SYSTEM 2 — APERÇU (section Design) =====================
// INACTIF par défaut. Ne s'allume que si l'adresse contient « ?ds=… » (page dev/apercu-design.html).
// N'écrit RIEN dans le stockage ni dans les réglages : tout passe par l'adresse ou par postMessage
// de la page d'aperçu (même origine). Ne touche à aucune donnée ni à aucun calcul.
const DS = { ctrl: false, on: false, o: { muscu: "ruby", style: "a", commun: "neutre", mode: "" } };
const DS_UNIV = { today: "nutrition", fridge: "cuisine", workout: "muscu", progress: "progression", coach: "commun", profile: "commun", home: "commun" };

function dsSet(o) {
  Object.assign(DS.o, o || {});
  if ("on" in (o || {})) DS.on = !!o.on;
  const h = document.documentElement, x = DS.o;
  if (DS.on) { h.dataset.ds = "2"; h.dataset.dsMuscu = x.muscu; h.dataset.dsStyle = x.style; h.dataset.dsCommun = x.commun; }
  else ["ds", "dsMuscu", "dsStyle", "dsCommun", "u"].forEach(k => delete h.dataset[k]);
  if (x.mode) h.classList.toggle("dark", x.mode === "dark"); // aperçu seulement : pas de localStorage
}

// Après chaque rendu : univers de l'écran, carte principale, graphiques
function dsAfter() {
  const h = document.documentElement, nav = document.getElementById("nav");
  [...document.querySelectorAll("#app .banner")].forEach(b => { if (/Mode aperçu/.test(b.textContent)) b.remove(); });
  if (!DS.on) { if (nav) delete nav.dataset.u; return; }
  h.dataset.u = DS_UNIV[S.tab] || "commun"; if (nav) nav.dataset.u = "commun";
  document.querySelectorAll(".ds-hero").forEach(e => e.classList.remove("ds-hero"));
  const app = document.getElementById("app"); let hero = null;
  if (S.tab === "home") hero = app.querySelector(".dsh-hero");
  else if (S.tab === "today") hero = app.querySelector(".ring")?.closest(".card");
  else if (S.tab === "progress") hero = app.querySelector("canvas")?.closest(".card");
  else if (S.tab === "workout") hero = app.querySelector(".set,.exhead")?.closest(".card") || app.querySelector(".card");
  else hero = app.querySelector(".card");
  if (hero) hero.classList.add("ds-hero");
  dsCharts();
}
// Les graphiques (Chart.js) ont des couleurs écrites dans ui.js : en aperçu on les remplace par les jetons.
function dsCharts() {
  if (typeof Chart === "undefined" || !Chart.instances) return;
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  const dark = document.documentElement.classList.contains("dark");
  const map = { "#94a3b8": v("--chart-2") || v("--pro-soft"), "#2563eb": dark ? v("--pro-accent-dk") : v("--pro-deep"), "#60a5fa": dark ? "#4A5A78" : v("--pro-pastel"),
    "#f59e0b": v("--fn-warn-fill"), "#e5484d": dark ? v("--mus-accent-dk") : v("--mus-accent") };
  Object.values(Chart.instances).forEach(c => {
    let ch = false;
    c.data.datasets.forEach(d => ["borderColor", "backgroundColor"].forEach(k => { const o = String(d["_ds_" + k] || d[k] || "").toLowerCase(); if (map[o]) { d["_ds_" + k] = o; d[k] = map[o]; ch = true; } }));
    c.options.scales && Object.values(c.options.scales).forEach(s => { s.grid = Object.assign(s.grid || {}, { color: v("--line") }); s.ticks = Object.assign(s.ticks || {}, { color: v("--mut") }); });
    if (ch) c.update("none");
  });
}

// ---- Accueil général (PROPOSITION, aperçu seulement) : les 4 univers en cartes ----
function dsHomeHTML() {
  const k = todayKey(); let kc = { left: 0, pct: 0 }, soon = 0, fr = 0, w = null, dw = null, next = "—", nb = 0;
  try { const t = dayTotals(k), T = tDay(k); kc = { left: Math.round(T.kcal - t.kcal), pct: Math.min(100, Math.round(100 * t.kcal / T.kcal)), p: Math.round(t.p), P: T.p }; } catch (e) {}
  try { const it = fridgeItems(); fr = it.length; soon = it.filter(expSoon).length; } catch (e) {}
  try { const ws = weightSeries(30); if (ws.length) { w = ws[ws.length - 1].t; dw = w - ws[0].t; } } catch (e) {}
  try { const lw = liveWorkout(); const ks = Object.keys(program()); next = lw ? lw.name + " (en cours)" : ks[0] || "—"; nb = workouts().filter(x => !x.live && Date.now() - x.start < 7 * 864e5).length; } catch (e) {}
  const sw = u => `<span class="dsh-sw">${["deep", "mid", "pastel"].map(r => `<i style="background:var(--${u}-${r})"></i>`).join("")}</span>`;
  const f1 = n => (n == null ? "—" : (Math.round(n * 10) / 10).toString().replace(".", ","));
  return `<div class="row between"><h1>Bonjour</h1><span class="tag">Données de démo</span></div>
  <div class="card dsh-hero" data-u="nutrition"><div class="dsh-k">Aujourd'hui · Nutrition</div>
    <div class="row between" style="margin-top:6px"><div><div class="big">${kc.left}</div><div class="xs mut">kcal restantes</div></div>
    <div class="c"><div class="b">${kc.p ?? "—"} / ${kc.P ?? "—"} g</div><div class="xs mut">protéines</div></div></div>
    <div class="bar" style="margin-top:12px"><i style="width:${kc.pct}%;background:var(--kc)"></i></div>
    <div class="row" style="margin-top:12px;gap:8px"><button data-act="tab" data-v="today">Ajouter un repas</button><button class="sec" data-act="tab" data-v="today">Journal</button></div></div>
  <div class="dsh-grid">
    <button class="dsh-card" data-u="muscu" data-act="tab" data-v="workout"><span class="dsh-k">Séance ${sw("mus")}</span><span class="dsh-v">${esc(next)}</span><span class="xs mut">${nb} séance(s) cette semaine</span></button>
    <button class="dsh-card" data-u="cuisine" data-act="tab" data-v="fridge"><span class="dsh-k">Cuisine ${sw("cui")}</span><span class="dsh-v">${soon} à finir vite</span><span class="xs mut">${fr} aliments au frigo</span></button>
    <button class="dsh-card" data-u="progression" data-act="tab" data-v="progress"><span class="dsh-k">Progression ${sw("pro")}</span><span class="dsh-v">${f1(w)} kg</span><span class="xs mut">${dw == null ? "" : (dw <= 0 ? "▼ " : "▲ ") + f1(Math.abs(dw)) + " kg en 30 j (tendance)"}</span></button>
    <button class="dsh-card" data-u="commun" data-act="tab" data-v="profile"><span class="dsh-k">Profil</span><span class="dsh-v">Réglages</span><span class="xs mut">Objectifs, apparence</span></button>
  </div>`;
}

// ---- Branchements (seulement en mode aperçu) ----
(function dsInit() {
  const q = new URLSearchParams(location.search); if (!q.has("ds")) return; // app normale : rien ne change
  DS.ctrl = true;
  const _render = render;
  render = function () {
    if (DS.on && S.tab === "home") { if (isEditing()) return; document.getElementById("app").innerHTML = dsHomeHTML(); document.getElementById("nav").innerHTML = navHTML(); renderSheet(); }
    else _render.apply(this, arguments);
    dsAfter();
  };
  dsSet({ on: q.get("ds") !== "0", muscu: q.get("m") || "ruby", style: q.get("s") || "a", commun: q.get("c") || "neutre", mode: q.get("mode") || "" });
  window.addEventListener("message", e => {
    if (e.origin !== location.origin || !e.data || !e.data.ds) return;
    const d = e.data.ds; dsSet(d);
    if (d.screen) dsScreen(d.screen); else render();
  });
  if (q.get("screen")) setTimeout(() => dsScreen(q.get("screen")), 0);
})();
function dsScreen(s) {
  S.sheet = null;
  if (s === "live" || s === "rest") {
    S.tab = "workout"; S.wMode = "list";
    if (!liveWorkout()) { const n = Object.keys(program())[0]; if (n && ACT.startW) ACT.startW({ dataset: { v: n } }); }
    render();
    if (s === "rest" && ACT.logSet && !document.getElementById("restBar")) { const b = document.querySelector("button[data-act=logSet]"); if (b) ACT.logSet(b); }
    return;
  }
  if (s === "sheet") { S.tab = "today"; render(); if (ACT.openAdd) ACT.openAdd({ dataset: {} }); dsAfter(); return; }
  S.tab = s; render(); window.scrollTo(0, 0);
}
