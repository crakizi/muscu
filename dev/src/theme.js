// ===================== DESIGN SYSTEM 2 (section Design) =====================
// ACTIF par défaut (choix de Vuthy du 26-27/11 : Black Cherry, style C, neutre + accents, accueil).
// « ?ds=0 » dans l'adresse = ancien design (comparaison). Les autres paramètres (?ds=1&m=…&s=…&c=…&mode=…&screen=…)
// et postMessage servent seulement à la page dev/apercu-design.html. Rien n'est écrit dans le stockage
// ni dans les réglages ; aucune donnée ni aucun calcul n'est touché.
const DS = { ctrl: false, on: true, o: { muscu: "cherry", style: "c", commun: "contextuel", mode: "" } };

// Couleur d'un jeton, résolue en « rgb(...) » (Chart.js, canvas) ou en nombre 0xRRGGBB (Three.js).
// Fonctionne aussi pour les jetons calculés (color-mix). el = élément dont on prend le contexte (carte foncée…).
function dsColor(name, fallback, el) {
  if (!DS.on) return fallback;
  const p = document.createElement("i"); p.style.cssText = `display:none;color:var(${name})`; (el || document.body).appendChild(p);
  const c = getComputedStyle(p).color; p.remove();
  const m = c.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/);
  return m ? `rgb(${Math.round(m[1] * 255)}, ${Math.round(m[2] * 255)}, ${Math.round(m[3] * 255)})` : (c || fallback);
}
function dsHex(name, fallback) {
  if (!DS.on) return fallback;
  const m = (dsColor(name, "") || "").match(/(\d+),\s*(\d+),\s*(\d+)/);
  return m ? (+m[1] << 16) | (+m[2] << 8) | +m[3] : fallback;
}
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
  if (DS.ctrl) [...document.querySelectorAll("#app .banner")].forEach(b => { if (/Mode aperçu/.test(b.textContent)) b.remove(); });
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
// Couleurs des graphiques (lues par drawCharts dans ui.js) : jetons Progression, lisibles sur la carte foncée.
function dsChartColors(canvas) {
  const el = canvas && canvas.closest(".card");
  return { point: dsColor("--chart-2", "#94a3b8", el), trend: dsColor("--chart-1", "#2563eb", el), bars: dsColor("--chart-3", "#60a5fa", el),
    target: dsColor("--fn-warn-fill", "#f59e0b", el), rm: dsColor("--mus-accent", "#e5484d", el), grid: dsColor("--line", "", el), tick: dsColor("--mut", "", el) };
}
// Axes : après le rendu, la carte principale a pu devenir foncée → on relit ses couleurs.
function dsCharts() {
  if (!DS.on || typeof Chart === "undefined" || !Chart.instances) return;
  Object.values(Chart.instances).forEach(c => {
    const C = dsChartColors(c.canvas);
    c.options.scales && Object.values(c.options.scales).forEach(s => { s.grid = Object.assign(s.grid || {}, { color: C.grid }); s.ticks = Object.assign(s.ticks || {}, { color: C.tick }); });
    c.data.datasets.forEach(d => { if (d._ds) ["borderColor", "backgroundColor"].forEach(k => { if (d._ds[k]) d[k] = C[d._ds[k]]; }); });
    c.update("none");
  });
}

// ---- Accueil : une tuile par univers, d'après la maquette de Vuthy (validé le 26/11) ----
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
  const ib = (tab, lab) => `<button class="ghost dsh-ib" data-act="tab" data-v="${tab}" aria-label="${lab}" title="${lab}"><svg viewBox="0 0 24 24">${ICONS[tab]}</svg></button>`;
  return `<div class="row between"><h1>Bonjour</h1><div class="row" style="gap:2px">${DS.ctrl ? '<span class="tag" style="margin-right:6px">Démo</span>' : ""}${ib("coach", "Coach")}${ib("profile", "Profil")}</div></div>
  <div class="dsh-grid">
    ${tile("nutrition", "Nutrition", "today", DS_ICON.nutrition, `${kc.left} kcal`, "Calories restantes", 100 - kc.pct)}
    ${tile("cuisine", "Cuisine", "fridge", DS_ICON.cuisine, `${soon} à finir vite`, `${fr} aliments au frigo`, fr ? Math.round(100 * soon / fr) : 0)}
    ${tile("muscu", "Musculation", "workout", ICONS.workout, esc(next), `${nex} exercices · ${nb} cette sem.`, pctW)}
    ${tile("progression", "Progression", "progress", ICONS.progress, `${f1(w)} kg`, dw == null ? "Poids tendance" : `${dw <= 0 ? "▼" : "▲"} ${f1(Math.abs(dw))} kg en 30 jours`, 60)}
  </div>`;
}

// ---- Barre d'onglets avec Accueil (validée le 27/11) : 5 onglets + Scanner au centre ; Coach et Profil passent en haut de l'accueil ----
ICONS.home = '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>';
function dsNavHTML() {
  const L = { home: "Accueil", today: "Nutrition", fridge: "Cuisine", workout: "Séance", progress: "Progrès" };
  const btn = k => `<button class="${S.tab === k || (k === "home" && (S.tab === "coach" || S.tab === "profile")) ? "on" : ""}" data-act="tab" data-v="${k}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg>${L[k]}${k === "workout" && liveWorkout() ? " •" : ""}</button>`;
  const ks = Object.keys(L);
  const scan = `<button class="scanbtn" data-act="scanHub" aria-label="Scanner un aliment"><span><svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 9v6M10 9v6M13 9v6M17 9v6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg></span>Scanner</button>`;
  return ks.slice(0, 3).map(btn).join("") + scan + ks.slice(3).map(btn).join("");
}

// ---- Branchements (seulement en mode aperçu) ----
(function dsInit() {
  const q = new URLSearchParams(location.search);
  DS.ctrl = q.has("ds") && q.get("ds") !== "0"; // page d'aperçu (contrôles, données de démo)
  const _render = render, _nav = navHTML;
  navHTML = function () { return DS.on ? dsNavHTML() : _nav.apply(this, arguments); };
  render = function () {
    if (DS.on && S.tab === "home") { if (isEditing()) return; document.getElementById("app").innerHTML = dsHomeHTML(); document.getElementById("nav").innerHTML = navHTML(); renderSheet(); }
    else _render.apply(this, arguments);
    dsAfter();
  };
  dsSet({ on: q.get("ds") !== "0", muscu: q.get("m") || DS.o.muscu, style: q.get("s") || DS.o.style, commun: q.get("c") || DS.o.commun, mode: q.get("mode") || "" });
  if (DS.on && !q.get("screen")) S.tab = "home"; // l'app s'ouvre sur l'accueil
  if (!q.has("ds")) return;
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
