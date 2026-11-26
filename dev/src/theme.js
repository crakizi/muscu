// ===================== DESIGN SYSTEM 2 — APERÇU (section Design) =====================
// INACTIF par défaut. Ne s'allume que si l'adresse contient « ?ds=… » (page dev/apercu-design.html).
// N'écrit RIEN dans le stockage ni dans les réglages : tout passe par l'adresse ou par postMessage
// de la page d'aperçu (même origine). Ne touche à aucune donnée ni à aucun calcul.
const DS = { ctrl: false, on: false, o: { muscu: "cherry", style: "c", commun: "neutre", mode: "" } };
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
  if (S.tab === "home") hero = null; // l'accueil a ses propres cartes profondes
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
    const hs = getComputedStyle(c.canvas.closest(".card") || document.documentElement), hv = n => hs.getPropertyValue(n).trim(); // carte foncée : axes lisibles
    c.options.scales && Object.values(c.options.scales).forEach(s => { s.grid = Object.assign(s.grid || {}, { color: hv("--line") }); s.ticks = Object.assign(s.ticks || {}, { color: hv("--mut") }); });
    c.update("none");
  });
}

// ---- Accueil général (PROPOSITION, aperçu seulement) : une tuile par univers, d'après la maquette de Vuthy ----
const DS_ICON = {
  nutrition: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2.5-3 5.5S15 13 17 13v8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  cuisine: '<path d="M4 10h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6zM2 10h20M9 6.5c0-1 .8-2 2-2h2c1.2 0 2 1 2 2V10H9z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>'
};
function dsHomeHTML() {
  const k = todayKey(); let kc = { left: "—", pct: 0 }, soon = 0, fr = 0, w = null, dw = null, next = "—", nex = 0, pctW = 0, nb = 0;
  try { const t = dayTotals(k), T = tDay(k); kc = { left: Math.round(T.kcal - t.kcal), pct: Math.min(100, Math.round(100 * t.kcal / T.kcal)) }; } catch (e) {}
  try { const it = fridgeItems(); fr = it.length; soon = it.filter(expSoon).length; } catch (e) {}
  try { const ws = weightSeries(30); if (ws.length) { w = ws[ws.length - 1].t; dw = w - ws[0].t; } } catch (e) {}
  try { const lw = liveWorkout(), P = program(); const n = lw ? lw.name : Object.keys(P)[0];
    next = n || "—"; const ex = lw ? lw.ex : (P[n] && P[n].ex) || []; nex = ex.length;
    pctW = lw && nex ? Math.round(100 * ex.filter(e => (e.sets || []).length).length / nex) : 0;
    nb = workouts().filter(x => !x.live && Date.now() - x.start < 7 * 864e5).length; } catch (e) {}
  const f1 = n => (n == null ? "—" : (Math.round(n * 10) / 10).toString().replace(".", ","));
  const tile = (u, title, tab, icon, v, sub, pct) => `<div class="dsh-tile" data-u="${u}"><div class="dsh-t">${title}</div>
    <button class="dsh-deep" data-act="tab" data-v="${tab}"><svg viewBox="0 0 24 24">${icon}</svg><span class="dsh-v">${v}</span><span class="dsh-s">${sub}</span><span class="dsh-bar"><i style="width:${pct}%"></i></span></button>
    <button class="dsh-go" data-act="tab" data-v="${tab}">Consulter</button></div>`;
  return `<div class="row between"><h1>Bonjour</h1><span class="tag">Données de démo</span></div>
  <div class="dsh-grid">
    ${tile("nutrition", "Nutrition", "today", DS_ICON.nutrition, `${kc.left} kcal`, "Calories restantes", 100 - kc.pct)}
    ${tile("cuisine", "Cuisine", "fridge", DS_ICON.cuisine, `${soon} à finir vite`, `${fr} aliments au frigo`, fr ? Math.round(100 * soon / fr) : 0)}
    ${tile("muscu", "Musculation", "workout", ICONS.workout, esc(next), `${nex} exercices · ${nb} séance(s) cette semaine`, pctW)}
    ${tile("progression", "Progression", "progress", ICONS.progress, `${f1(w)} kg`, dw == null ? "Poids tendance" : `${dw <= 0 ? "▼" : "▲"} ${f1(Math.abs(dw))} kg en 30 jours`, 60)}
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
  dsSet({ on: q.get("ds") !== "0", muscu: q.get("m") || "cherry", style: q.get("s") || "c", commun: q.get("c") || "neutre", mode: q.get("mode") || "" });
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
