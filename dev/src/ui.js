// ===================== THÈME =====================
function themePref() { try { return localStorage.getItem("muscu_theme") || "clair"; } catch (e) { return "clair"; } }
function applyTheme() { const p = themePref(); const dark = p === "sombre" || (p === "auto" && matchMedia("(prefers-color-scheme: dark)").matches); document.documentElement.classList.toggle("dark", dark); }
const isDark = () => document.documentElement.classList.contains("dark");
applyTheme();
// ===================== ÉTAT UI =====================
const S = { tab: "today", day: todayKey(), sheet: null, add: { tab: "search", meal: null, q: "", sel: null, g: 100, items: null, busy: false, note: "", img: null, scan: null, err: "" },
  draft: {}, aiOut: {}, busy: {}, chat: [], progEx: null, histOpen: null };
let charts = [];
function toast(msg) { $$(".toast").forEach(x => x.remove()); const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
function isEditing() { const a = document.activeElement; return a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.type !== "file"; }
let pendingRender = false;
function render() {
  if (isEditing()) { pendingRender = true; return; }
  pendingRender = false;
  const views = { today: viewToday, fridge: viewKitchen, workout: viewWorkout, progress: viewProgress, coach: viewCoach, profile: viewProfile };
  const sy = window.scrollY;
  $("#app").classList.toggle("wide", (S.tab === "workout" && S.wMode === "3d") || S.tab === "fridge"); $("#app").classList.toggle("full", S.tab === "workout" && S.wMode === "3d");
  $("#app").innerHTML = (views[S.tab] || viewToday)();
  $("#nav").innerHTML = navHTML();

  renderSheet();
  window.scrollTo(0, sy);
  if (S.tab === "progress") drawCharts();
  const holder = $("#scene3d");
  if (holder && S.tab === "fridge") { mount3D("fridge", holder, buildFridge); updateFridge3D(fridgeItems()); }
  else if (holder && S.tab === "workout") mount3D("gym", holder, buildGym);
  else V3.active = null;
}
function renderSheet() {
  const el = $("#sheet");
  if (!S.sheet) { el.innerHTML = ""; return; }
  el.innerHTML = `<div class="sheet-bg" data-act="closeSheetBg"><div class="sheet">${S.sheet()}</div></div>`;
  if (typeof bodyAfterSheet === "function") bodyAfterSheet();
}
function openSheet(fn) { S.sheet = fn; renderSheet(); }
function closeSheet() { S.sheet = null; S.bodyEx = null; renderSheet(); if (typeof V3 !== "undefined" && V3.active && V3.active.key === "body") { V3.active = V3.prevActive && V3.prevActive.renderer.domElement.isConnected ? V3.prevActive : null; } if (typeof V3 !== "undefined" && V3.clearSel) V3.clearSel(); }
document.addEventListener("focusout", () => setTimeout(() => { if (pendingRender && !isEditing()) render(); }, 50));

const ICONS = {
  today: '<path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  workout: '<path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  progress: '<path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  coach: '<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>',
  fridge: '<rect x="6" y="2.5" width="12" height="19" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M6 9.5h12M9 5.5v2M9 12.5v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  profile: '<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'
};
function navHTML() {
  const L = { today: "Aujourd'hui", fridge: "Cuisine", workout: "Séance", progress: "Progrès", coach: "Coach", profile: "Profil" };
  const btn = k => `<button class="${S.tab === k ? "on" : ""}" data-act="tab" data-v="${k}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg>${L[k]}${k === "workout" && liveWorkout() ? " •" : ""}</button>`;
  const keys = Object.keys(L);
  return keys.slice(0, 3).map(btn).join("") + `<button class="scanbtn" data-act="scanHub" aria-label="Scanner un aliment"><span><svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 9v6M10 9v6M13 9v6M17 9v6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg></span>Scanner</button>` + keys.slice(3).map(btn).join("");
}
function statusBanner() {
  if (Store.banner) return Store.banner();
  if (Store.mode === "local") return `<div class="banner">Mode aperçu : les données sont gardées seulement dans ce navigateur. Ouvre l'app depuis son lien claude.ai pour activer la synchro iPhone ↔ Mac.</div>`;
  if (Store.offline) return `<div class="banner">Connexion aux données impossible pour l'instant : ce qui s'affiche peut ne pas être à jour.</div>`;
  if (!Store.loaded) return `<div class="banner"><span class="spin"></span> Chargement de tes données…</div>`;
  return "";
}

// ===================== AUJOURD'HUI =====================
function ring(val, max, color, size = 118) {
  const r = size / 2 - 9, c = 2 * Math.PI * r, p = Math.min(1, max ? val / max : 0);
  return `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="var(--chip)" stroke-width="10" fill="none"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${val > max * 1.05 ? "var(--red)" : color}" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/></svg>`;
}
function macroBar(label, v, max, color) {
  return `<div class="grow"><div class="row between xs"><span class="b">${label}</span><span class="mut">${r0(v)} / ${max} g</span></div><div class="bar"><i style="width:${Math.min(100, max ? v / max * 100 : 0)}%;background:${v > max * 1.1 ? "var(--red)" : color}"></i></div></div>`;
}
function viewToday() {
  const k = S.day, d = day(k), t = dayTotals(k), T = targets();
  const left = T.kcal - t.kcal;
  const sugarMax = r0(T.kcal * 0.1 / 4), satMax = r0(T.kcal * 0.1 / 9);
  const mini = (lab, v, ref, max) => `<span class="${max ? (v > ref ? "tag red" : "tag") : (v >= ref ? "tag grn" : "tag")}">${lab} ${r1(v)}/${ref} g</span>`;
  const entryRow = e => `<div class="entry" data-act="editEntry" data-v="${e.id}">${e.src === "plan" || e.src === "recette" ? dishImg(e.name, { size: "mini" }) : ""}<div class="grow"><div>${esc(e.name)}${e.brand ? ` <span class="mut xs">${esc(e.brand)}</span>` : ""}</div><div class="mut xs">${e.src === "estim" ? "estimation" : e.g + " g"} · P ${r0(e.n.p)} · G ${r0(e.n.c)} · L ${r0(e.n.f)}${e.meal ? " · " + esc(e.meal) : ""}${e.src === "ia" ? " · estimé IA" : ""}</div></div><div class="b">${r0(e.n.kcal)}</div></div>`;
  const all = (d.entries || []).slice().sort((x, y) => (y.t || 0) - (x.t || 0));
  const groups = S.byMeal ? ["", ...MEALS].map(m => [m, all.filter(e => (e.meal || "") === m)]).filter(([m, es]) => es.length) : [];
  const meals = `<div class="card"><div class="row between"><h3 style="margin:0">Ce que j'ai mangé <span class="mut sm">${r0(t.kcal)} kcal</span></h3><div class="row" style="gap:6px"><button class="small sec" data-act="copyYesterday" title="Copier tout ce que j'ai mangé hier">↺ Copier hier</button><button class="small" data-act="openAdd" data-v="">+ Ajouter</button></div></div>
    ${all.length ? `<div class="row xs" style="margin:8px 0 2px;gap:6px"><button class="chip ${S.byMeal ? "" : "on"}" data-act="byMeal" data-v="0">Tout</button><button class="chip ${S.byMeal ? "on" : ""}" data-act="byMeal" data-v="1">Par repas</button>${all.length ? `<button class="ghost small" style="margin-left:auto" data-act="favMeal" data-v="__all">★ Favori</button>` : ""}</div>` : ""}
    ${!all.length && (day(addDays(k, -1)).entries || []).length ? `<button class="sec" style="width:100%;margin:6px 0" data-act="copyYesterday">↺ Même chose qu'hier (${r0(dayTotals(addDays(k, -1)).kcal)} kcal) : tout copier</button>` : ""}
    ${!all.length && k <= todayKey() ? `<button class="ghost small" style="width:100%;margin:2px 0 4px" data-act="estimOpen">🤷 Journée oubliée ? Mets une estimation de tes kcal de la journée</button>` : ""}
    ${!all.length ? `<p class="mut sm">${k > todayKey() ? "Jour à venir : prépare tes repas à l'avance, ils seront comptés ce jour-là." : "Rien pour l'instant."} Touche <b>Scanner</b> en bas, ou « + Ajouter ». Pas besoin de choisir un repas.</p>` : S.byMeal ? groups.map(([m, es]) => `<div class="xs b mut" style="margin-top:10px">${esc(mealLabel(m))} · ${r0(es.reduce((s, e) => s + e.n.kcal, 0))} kcal</div>` + es.map(entryRow).join("")).join("") : all.map(entryRow).join("")}
  </div>`;
  const scale = (key, lab) => `<div><div class="xs mut">${lab}</div><div class="scale">${[1, 2, 3, 4, 5].map(i => `<button class="${d[key] === i ? "on" : ""}" data-act="setScale" data-k="${key}" data-v="${i}">${i}</button>`).join("")}</div></div>`;
  const h = new Date().getHours(); const hello = h < 6 ? "Bonne nuit" : h < 13 ? "Bonjour" : h < 19 ? "Salut" : "Bonsoir";
  return `${statusBanner()}
  ${k === todayKey() ? `<div class="hello"><img src="icons/icon-192.png" alt="" onerror="this.remove()"><div><div class="b" style="font-size:18px">${hello} Vuthy 👋</div><div class="xs mut">${fmtDay(k)} · objectif : ${esc(GOALS[profile().goal].label)}</div></div></div>
  ${onboardingHTML()}
  ${checkinCardHTML()}
  ${deloadAdvice() && !isDeload() ? deloadCardHTML() : ""}
  ${bilans().length && bilanDue() ? `<button class="sec" style="width:100%;margin-bottom:8px" data-act="blOpen">📸 C'est l'heure de ton bilan de la semaine (à jeun)</button>` : ""}
  <div class="qa"><button data-act="openAdd" data-v=""><span>🍽️</span>Aliment</button><button data-act="tab" data-v="workout"><span>🏋️</span>Séance</button><button data-act="quickWeight"><span>⚖️</span>Poids</button><button data-act="tab" data-v="fridge"><span>🧊</span>Frigo</button></div>` : ""}
${weekStripHTML(k)}
  ${k > todayKey() ? "" : dailyStripHTML(d)}
  <div class="card" style="margin-top:4px"><div class="row" style="gap:14px">
    <div class="ring">${ring(t.kcal, T.kcal, "var(--acc)")}<div class="in"><div class="big">${r0(Math.abs(left))}</div><div class="xs mut">${left >= 0 ? "kcal restantes" : "kcal en trop"}</div></div></div>
    <div class="grow" style="display:flex;flex-direction:column;gap:9px">
      <div class="xs mut">${r0(t.kcal)} / ${T.kcal} kcal${t.actKcal ? ` · sport +${r0(t.actKcal)} kcal` : ""}</div>
      ${macroBar("Protéines", t.p, T.p, "var(--p)")}${macroBar("Glucides", t.c, T.c, "var(--c)")}${macroBar("Lipides", t.f, T.f, "var(--f)")}
    </div></div>
    <div class="chips" style="margin-top:10px">${mini("Fibres", t.fib, 30)}${mini("Sucres", t.sugar, sugarMax, 1)}${mini("Sel", t.salt, 5, 1)}${mini("Saturés", t.satfat, satMax, 1)}</div>
    ${Object.keys(t.micro).length ? `<details style="margin-top:8px"><summary class="xs mut">Micronutriments (estimés pour les aliments analysés par l'IA)</summary><div class="chips" style="margin-top:6px">${Object.entries(MICRO_REFS).map(([m, [l, u, ref]]) => t.micro[m] != null ? `<span class="tag ${t.micro[m] >= ref ? "grn" : ""}">${l} ${r0(t.micro[m])}/${ref} ${u}</span>` : "").join("")}</div><p class="xs mut">Repères EFSA pour un homme adulte.</p></details>` : ""}
    <div class="row" style="margin-top:10px;gap:6px"><button class="chip" data-act="aiFinish">💡 Que manger ensuite ?</button><button class="chip" data-act="aiFridge">🧊 Recette avec mon frigo</button></div>
    ${S.aiOut.today ? `<div class="ai-out">${aiRich(S.aiOut.today)}</div>` : ""}
  </div>
  ${meals}`;
}

// ---- suivi du jour : une seule ligne de pastilles, le détail s'ouvre en feuille ----
function dailyStripHTML(d) {
  const p = profile(); const sport = (d.acts || []).reduce((t, a) => t + a.min, 0);
  const pill = (ico, val, ph) => `<button class="dpill ${val ? "" : "empty"}" data-act="openDaily">${ico} ${val || ph}</button>`;
  return `<div class="dstrip">${pill("⚖️", d.weight ? r1(d.weight) + " kg" : "", "Poids")}${pill("👣", d.steps ? d.steps.toLocaleString("fr-FR") : "", "Pas")}${pill("😴", d.sleep ? d.sleep + " h" : "", "Sommeil")}${pill("⚽", sport ? sport + " min" : "", "Sport")}${p.moodTrack ? pill("🙂", d.mood ? d.mood + "/5" : "", "Humeur") : ""}</div>`;
}
function dailySheet() {
  const d = day(S.day); const p = profile();
  const scale = (key, lab) => `<div><div class="xs mut">${lab}</div><div class="scale">${[1, 2, 3, 4, 5].map(i => `<button class="${d[key] === i ? "on" : ""}" data-act="setScale" data-k="${key}" data-v="${i}">${i}</button>`).join("")}</div></div>`;
  return `<div class="row between"><h2>Suivi du jour</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    ${d.health ? `<div class="banner" style="background:#fde8ef;color:#9d174d">❤️ Apple Santé : ${d.steps ? d.steps.toLocaleString("fr-FR") + " pas · " : ""}${d.health.active} kcal actives${d.sleep ? " · sommeil " + d.sleep + " h" : ""}</div>` : ""}
    <div class="row"><div class="grow"><label>Poids (au réveil, à jeun, après les toilettes)</label><input id="inW" type="number" step="0.1" inputmode="decimal" value="${d.weight || ""}" placeholder="80.2"></div>
    <div class="grow"><label>Pas</label><input id="inSteps" type="number" inputmode="numeric" value="${d.steps || ""}" placeholder="8500"></div>
    <div class="grow"><label>Sommeil (h)</label><input id="inSleep" type="number" step="0.25" inputmode="decimal" value="${d.sleep || ""}" placeholder="7.5"></div></div>
    <button style="width:100%;margin-top:8px" data-act="saveDaily">Enregistrer</button>
    <h3 style="margin-top:14px">Sport en plus (foot, padel…)</h3>
    ${(d.acts || []).map((a, i) => `<div class="entry"><span>${esc(a.type)} · ${a.min} min</span><span>${r0(a.kcal)} kcal <button class="danger small" data-act="delAct" data-v="${i}">✕</button></span></div>`).join("")}
    <div class="row" style="margin-top:6px"><select id="actType">${Object.keys(ACTIVITIES).map(a => `<option>${a}</option>`).join("")}</select><input id="actMin" type="number" inputmode="numeric" placeholder="min" style="width:80px"><button class="small" data-act="addAct">Ajouter</button></div>
    ${p.moodTrack ? `<div style="display:grid;gap:8px;margin-top:14px">${scale("mood", "Humeur")}${scale("energy", "Énergie")}${scale("stress", "Stress")}</div>` : ""}
    <details style="margin-top:14px"><summary class="xs mut">Options</summary>
      <label class="row" style="margin-top:8px;gap:6px"><input type="checkbox" style="width:auto" data-act="moodTrack" ${p.moodTrack ? "checked" : ""}> Noter aussi humeur, énergie et stress</label>
      <label class="row" style="margin-top:8px;gap:6px"><input type="checkbox" style="width:auto" data-act="toggleIncomplete" ${d.incomplete ? "checked" : ""}> Journée mal notée (ignorée par le calcul adaptatif)</label></details>`;
}

function onboardingHTML() {
  if (LS_get("muscu_onb_hide")) return "";
  const st = [];
  st.push({ ok: !!Store.get("profile", {}).weight, t: "Vérifier ton profil (poids, objectif)", act: "tab", v: "profile" });
  if (typeof Sync !== "undefined") { st.push({ ok: !!Sync.sess(), t: "Créer ton compte pour synchroniser iPhone ↔ Mac", act: "tab", v: "profile" }); st.push({ ok: !!(Store.get("settings", {}).geminiKey), t: "Ajouter ta clé IA (photos, recettes, coach)", act: "tab", v: "profile" }); }
  if (typeof SP !== "undefined" && SP.clientId()) st.push({ ok: !!SP.tok(), t: "Connecter Spotify (facultatif)", act: "spLogin", v: "" });
  st.push({ ok: Store.ids("d-").some(id => (Store.get(id).entries || []).length), t: "Noter ton premier repas", act: "openAdd", v: "" });
  st.push({ ok: Store.ids("w-").length > 0, t: "Lancer ta première séance", act: "tab", v: "workout" });
  if (st.every(s => s.ok)) return "";
  const n = st.filter(s => s.ok).length;
  return `<div class="card steps"><div class="row between"><h3 style="margin:0">Bien démarrer · ${n}/${st.length}</h3><button class="ghost small" data-act="onbHide">Masquer</button></div>
    ${st.map((s, i) => `<div class="step ${s.ok ? "done" : ""}"><div class="num">${s.ok ? "✓" : i + 1}</div><div class="grow sm ${s.ok ? "mut" : ""}">${s.t}</div>${s.ok ? "" : `<button class="small sec" data-act="${s.act}" data-v="${s.v}">Go</button>`}</div>`).join("")}</div>`;
}
function LS_get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
// ---------- Feuille d'ajout ----------
function addSheet() {
  const A = S.add;
  const tabs = [["search", "Rechercher"], ["scan", "📷 Scanner"], ["photo", "Photo du plat"], ["ia", "Décrire (IA)"], ["recipes", "Recettes"], ["fav", "Favoris"]];
  let body = "";
  if (A.items) body = pendingItemsHTML();
  else if (A.sel) body = selFoodHTML();
  else if (A.tab === "search") {
    const res = A.offRes || searchFoods(A.q);
    body = `<input id="q" placeholder="ex. poulet, riz, skyr…" value="${esc(A.q)}" autocomplete="off" data-input="q">
      <div class="mut xs" style="margin:6px 0">${A.q ? res.length + " résultat(s)" : "Récents"}</div>
      <div id="qres">${foodList(res)}</div>
      ${HAS_OFF && A.q ? `<button class="sec small" style="margin-top:8px;width:100%" data-act="offSearch" ${A.offBusy ? "disabled" : ""}>${A.offBusy ? '<span class="spin"></span>' : "🔎 Chercher « " + esc(A.q) + " » dans les produits du supermarché (Open Food Facts)"}</button>` : ""}
      <div class="mut xs" style="margin-top:8px">Pas trouvé ? Utilise « Décrire (IA) » ou « Code-barres » : l'aliment sera ensuite enregistré dans tes aliments.</div>`;
  } else if (A.tab === "ia") {
    body = `<label>Décris ce que tu as mangé (utilise le micro du clavier pour dicter)</label><textarea id="iaTxt" placeholder="ex. 200 g de riz, un blanc de poulet, une cuillère d'huile d'olive et un skyr">${esc(A.note)}</textarea>
      <button style="margin-top:8px;width:100%" data-act="aiText" ${A.busy ? "disabled" : ""}>${A.busy ? '<span class="spin"></span> Analyse…' : "Analyser"}</button>`;
  } else if (A.tab === "photo") {
    body = `<label class="btn" style="display:block;text-align:center">📷 Prendre / choisir une photo<input type="file" accept="image/*" capture="environment" data-file="photo" style="display:none"></label>
      ${A.img ? `<img class="thumb" src="${A.img}">` : ""}
      <label>Précision (optionnel)</label><input id="photoNote" placeholder="ex. cuit à l'huile, sauce à part…" value="${esc(A.note)}">
      <button style="margin-top:8px;width:100%" data-act="aiPhoto" ${!A.blob || A.busy ? "disabled" : ""}>${A.busy ? '<span class="spin"></span> Analyse…' : "Estimer les calories"}</button>`;
  } else if (A.tab === "scan") {
    const sc = A.scan || {};
    body = sc.step === "label" ? `<div class="banner">Code ${esc(sc.barcode || "?")} introuvable (ni dans tes aliments ni dans Open Food Facts). Prends en photo le <b>tableau nutritionnel</b> (et l'avant du paquet si tu veux) : il sera enregistré pour les prochaines fois.</div>
        <label class="btn" style="display:block;text-align:center">📸 Photo(s) de l'étiquette<input type="file" accept="image/*" multiple data-file="prodphotos" style="display:none"></label>
        ${A.busy ? `<p class="c"><span class="spin"></span> Lecture de l'étiquette…</p>` : ""}`
      : `${A.busy ? `<p class="c"><span class="spin"></span> Recherche du produit…</p>` : ""}
        <button style="width:100%;font-size:17px;padding:16px" data-act="scanLive">📷 Scanner le code-barres</button>
        <p class="xs mut c" style="margin:6px 0 14px">La caméra s'ouvre et lit le code toute seule.</p>
        <label class="btn" style="display:block;text-align:center;background:var(--chip);color:var(--txt)">📸 Photo du produit et/ou de ses valeurs nutritionnelles<input type="file" accept="image/*" multiple data-file="prodphotos" style="display:none"></label>
        <p class="xs mut c" style="margin:6px 0 14px">1 à 3 photos : l'avant du paquet, le tableau « Información nutricional »… L'IA lit le nom et les valeurs.</p>
        <div class="row"><label class="btn sec small" style="background:var(--chip);color:var(--txt);white-space:nowrap">Photo du code<input type="file" accept="image/*" capture="environment" data-file="barcode" style="display:none"></label><input id="bcManual" inputmode="numeric" placeholder="ou tape le code"><button class="small sec" data-act="bcManual">OK</button></div>`;
  } else if (A.tab === "recipes") { body = recipesTabHTML();
  } else if (A.tab === "fav") {
    const favs = Store.get("favs", { items: [] }).items || [];
    body = favs.length ? favs.map(f => `<div class="entry"><div><div>${esc(f.name)}</div><div class="mut xs">${f.entries.length} aliment(s) · ${r0(f.entries.reduce((s, e) => s + scaleNutr(e.per100, e.g).kcal, 0))} kcal</div></div><div class="row"><button class="danger small" data-act="delFav" data-v="${f.id}">✕</button><button class="small" data-act="addFav" data-v="${f.id}">Ajouter</button></div></div>`).join("")
      : `<p class="mut sm">Aucun favori. Dans l'écran Aujourd'hui, touche ★ sur un repas pour l'enregistrer.</p>`;
  }
  return `<div class="row between"><h2>Ajouter un aliment</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    <div class="chips" style="margin:6px 0 10px"><span class="xs mut" style="align-self:center">Repas (facultatif) :</span>${["", ...MEALS].map(m => `<button class="chip ${A.meal === m ? "on" : ""}" data-act="addMeal" data-v="${m}">${mealLabel(m)}</button>`).join("")}</div>
    ${A.items || A.sel ? "" : `<div class="chips" style="margin-bottom:10px">${tabs.map(([k, l]) => `<button class="chip ${A.tab === k ? "on" : ""}" data-act="addTab" data-v="${k}">${l}</button>`).join("")}</div>`}
    ${A.err ? `<div class="banner" style="background:#fde2e3;color:#7f1d1d">${esc(A.err)}</div>` : ""}${body}`;
}
function foodList(res) {
  return res.map((f, i) => `<div class="entry" data-act="selFood" data-i="${i}"><div><div>${esc(f.name)}${f.brand ? ` <span class="mut xs">${esc(f.brand)}</span>` : ""}</div><div class="mut xs">${r0(f.per100.kcal)} kcal · P ${r1(f.per100.p)} · G ${r1(f.per100.c)} · L ${r1(f.per100.f)} /100 g${f.src === "perso" ? " · mes aliments" : f.src === "récent" ? " · récent" : ""}</div></div><div class="mut">›</div></div>`).join("") || `<p class="mut sm">Aucun résultat.</p>`;
}
function selFoodHTML() {
  const f = S.add.sel, g = +S.add.g || 0, n = scaleNutr(f.per100, g);
  const ports = portionsFor(f);
  return `<h3>${esc(f.name)}</h3><div class="mut xs">${r0(f.per100.kcal)} kcal / 100 g${f.brand ? " · " + esc(f.brand) : ""}</div>
    <label>Portion</label><div class="chips">${ports.map(([l, v]) => `<button class="chip ${+S.add.g === v ? "on" : ""}" data-act="gSet" data-v="${v}">${esc(l)} <span class="xs" style="opacity:.7">${v} g</span></button>`).join("")}</div>
    <label>Quantité (g)</label><div class="stepper"><button data-act="gStep" data-v="-10">−</button><input id="gIn" type="number" inputmode="decimal" value="${g}" data-input="g"><button data-act="gStep" data-v="10">+</button></div>
    <div class="row xs" style="gap:6px;margin-top:6px"><span class="mut">Nombre :</span>${[0.5, 1, 2, 3].map(k => `<button class="chip" data-act="gMul" data-v="${k}">×${k}</button>`).join("")}</div>
    <div class="card" style="margin-top:10px" id="selN"><b>${r0(n.kcal)} kcal</b> · P ${r1(n.p)} g · G ${r1(n.c)} g · L ${r1(n.f)} g</div>
    <div class="row"><button class="sec grow" data-act="selBack">Retour</button><button class="grow" data-act="selAdd">Ajouter</button></div>`;
}
function pendingItemsHTML() {
  const A = S.add; const it = A.items;
  const tot = it.reduce((s, x) => s + (x.per100?.kcal || 0) * x.grams / 100, 0);
  return `${A.img ? `<img class="thumb" src="${A.img}">` : ""}<h3>Vérifie et ajuste les quantités</h3>
    ${it.map((x, i) => `<div class="entry"><div class="grow"><div>${esc(x.name)} ${x.confidence && x.confidence !== "haute" ? `<span class="tag org">confiance ${esc(x.confidence)}</span>` : ""}</div><div class="mut xs">${r0((x.per100?.kcal || 0) * x.grams / 100)} kcal · P ${r1((x.per100?.p || 0) * x.grams / 100)} g</div></div>
      <input type="number" inputmode="decimal" value="${r0(x.grams)}" style="width:76px" data-input="itemG" data-i="${i}"><span class="xs mut">g</span><button class="danger small" data-act="delItem" data-v="${i}">✕</button></div>`).join("")}
    ${A.aiNote ? `<p class="xs mut">${esc(A.aiNote)}</p>` : ""}
    <div class="b" style="margin:8px 0">Total : ${r0(tot)} kcal</div>
    <label class="row" style="gap:6px"><input type="checkbox" id="saveFoods" style="width:auto" checked> Enregistrer ces aliments dans « mes aliments »</label>
    <div class="row" style="margin-top:10px"><button class="sec grow" data-act="itemsCancel">Annuler</button><button class="grow" data-act="itemsAdd">Ajouter au repas</button></div>`;
}
function editEntrySheet(id) {
  return () => {
    const d = day(S.day); const e = (d.entries || []).find(x => x.id === id); if (!e) return "";
    return `<div class="row between"><h2>${esc(e.name)}</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
      <label>Quantité (g)</label><input id="eg" type="number" inputmode="decimal" value="${e.g}">
      <label>Repas (facultatif)</label><select id="em"><option value="">Sans repas</option>${MEALS.map(m => `<option ${m === e.meal ? "selected" : ""}>${m}</option>`).join("")}</select>
      <p class="sm mut">${r0(e.per100.kcal)} kcal · P ${r1(e.per100.p)} · G ${r1(e.per100.c)} · L ${r1(e.per100.f)} pour 100 g</p>
      <div class="row"><button class="danger grow" data-act="delEntry" data-v="${id}">Supprimer</button><button class="sec grow" data-act="entryToFood" data-v="${id}">Mettre dans mes aliments</button><button class="grow" data-act="saveEntry" data-v="${id}">Enregistrer</button></div>`;
  };
}

// ===================== CARTE DES MUSCLES =====================
const MUSC_FRONT = [["traps_up", 40, 26, 6, 2.3, 22], ["delt_ant", 33, 32, 3.5, 5.5, 20], ["delt_lat", 28.5, 33, 3, 6, 8], ["pec_up", 42, 35, 7.5, 3, -8], ["pec_mid", 42, 42, 8, 4.5, 0],
  ["biceps_long", 25.5, 48, 1.8, 8, 8], ["biceps_short", 27.8, 48, 1.8, 8, 8], ["brachialis", 23.4, 58.5, 1.6, 4, 8], ["brachioradialis", 21.6, 72, 2.2, 7, 8], ["forearm", 24.6, 82, 2.2, 8, 8],
  ["abs", 50, 62, 5.5, 15, 0, 1], ["obliques", 38.5, 66, 3, 10, 5], ["quads", 42.5, 124, 5.5, 17, -3], ["adductors", 47.6, 116, 2.3, 10, -8], ["calves", 40, 170, 2.6, 12, 0]];
const MUSC_BACK = [["traps_up", 42, 26, 7, 2.6, 18], ["traps_mid", 44, 38, 5, 5, 0], ["traps_low", 46, 50, 3, 7, -15], ["rot_cuff", 37, 40, 4.5, 3.5, 0], ["delt_post", 30, 33, 3.8, 5, -15],
  ["delt_lat", 27, 33, 2.6, 5.5, 8], ["teres", 34, 47, 4, 2, 30], ["lats", 38.5, 58, 5.5, 12, -14], ["erectors", 47.2, 76, 2.2, 11, 0], ["triceps_long", 27, 48, 1.9, 8, 8],
  ["triceps_latmed", 24.4, 50, 1.8, 7, 8], ["forearm", 21.6, 78, 2.4, 10, 8], ["glutes_med", 40, 96, 5, 3.2, -10], ["glutes_max", 43.5, 106, 6.5, 7, 0], ["hamstrings", 43, 130, 5.2, 15, -3], ["calves", 42, 165, 4, 11, 0]];
function muscleSVG(prim = [], sec = [], focus = [], mini = false, colors = null) {
  const cls = id => "m" + (prim.includes(id) ? " prim" : sec.includes(id) ? " sec" : "") + (focus.includes(id) ? " focus" : "");
  const shapes = (list, ox) => list.map(([id, cx, cy, rx, ry, rot, single]) => {
    const one = (x, r) => `<ellipse class="${cls(id)}" ${colors && colors[id] ? `style="fill:${colors[id]};opacity:.9"` : ""} cx="${ox + x}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${ox + x} ${cy})"><title>${MUSCLES[id][0]}</title></ellipse>`;
    return single ? one(cx, rot) : one(cx, rot) + one(100 - cx, -rot);
  }).join("");
  const sil = ox => {
    const L = (x1, y1, x2, y2, w) => `<line class="sil" x1="${ox + x1}" y1="${y1}" x2="${ox + x2}" y2="${y2}" stroke-width="${w}"/><line class="sil" x1="${ox + 100 - x1}" y1="${y1}" x2="${ox + 100 - x2}" y2="${y2}" stroke-width="${w}"/>`;
    return `<circle class="sil" cx="${ox + 50}" cy="13" r="8" stroke-width="1.2"/><path class="sil" stroke-width="1.2" d="M${ox + 33},27 Q${ox + 50},22 ${ox + 67},27 L${ox + 66},62 Q${ox + 63},86 ${ox + 64},100 L${ox + 36},100 Q${ox + 37},86 ${ox + 34},62 Z"/>` +
      L(30, 30, 24.5, 66, 1.2) + L(24.5, 66, 21, 100, 1.2) + L(43, 100, 42.5, 148, 1.2) + L(42.5, 148, 42, 192, 1.2);
  };
  return `<svg class="musc" viewBox="0 0 210 196" style="width:100%;max-width:420px;display:block;margin:auto">${sil(0)}${shapes(MUSC_FRONT, 0)}${sil(110)}${shapes(MUSC_BACK, 110)}
    ${mini ? "" : `<text x="50" y="195" font-size="6" text-anchor="middle" fill="var(--mut)">Face</text><text x="160" y="195" font-size="6" text-anchor="middle" fill="var(--mut)">Dos</text>`}</svg>`;
}
function exMuscleSheet(exId) {
  return () => {
    const x = getEx(exId);
    return `<div class="row between"><h2>${esc(x.name)}</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
      <div class="chips" style="margin-bottom:8px"><button class="chip ${S.bodyAnim === false ? "" : "on"}" data-act="bodyMode" data-v="1">🎬 Mouvement</button><button class="chip ${S.bodyAnim === false ? "on" : ""}" data-act="bodyMode" data-v="0">💪 Muscles (statique)</button></div>
      ${body3DHolderHTML("min(64vh, 620px)", S.bodyAnim !== false)}
      <div class="row xs" style="gap:12px;justify-content:center;margin:6px 0"><span><b style="color:#d90429">●</b> principal</span><span><b style="color:#ff8a00">●</b> secondaire</span><span>clignote = partie ciblée</span></div>
      <h3>Muscles principaux</h3><ul class="sm">${x.prim.map(m => `<li>${MUSCLES[m][0]}${x.focus.includes(m) ? " <b>(ciblé)</b>" : ""}</li>`).join("")}</ul>
      ${x.sec.length ? `<h3>Secondaires</h3><ul class="sm">${x.sec.map(m => `<li>${MUSCLES[m][0]}</li>`).join("")}</ul>` : ""}
      ${x.note ? `<div class="reco">${esc(x.note)}</div>` : ""}
      ${EX_VARIANTS[x.id] ? `<h3>Variantes populaires</h3>${EX_VARIANTS[x.id].map(([n, d]) => `<div class="entry" style="align-items:flex-start"><div><div class="sm b">${esc(n)}</div><div class="xs mut">${esc(d)}</div></div></div>`).join("")}` : ""}
      ${EX_CUES[x.id] ? `<h3>Exécution</h3><ol class="sm">${EX_CUES[x.id].map(c => `<li>${esc(c)}</li>`).join("")}</ol>` : ""}
      <h3>Rôle des muscles travaillés</h3>${x.prim.concat(x.sec).filter((m, k, a) => a.indexOf(m) === k && MUSCLE_INFO[m]).map(m => `<p class="sm" style="margin:4px 0"><b>${esc(MUSCLES[m][0])}</b> — ${esc(MUSCLE_INFO[m])}</p>`).join("")}
      ${(() => { const alts = typeof replacementsFor === "function" ? replacementsFor(x.id).slice(0, 3) : []; return alts.length ? `<h3>Alternatives dans ta salle</h3><p class="sm">${alts.map(a => esc(getEx(a).name)).join(" · ")}</p>` : ""; })()}
      ${(() => { const h = exerciseHistory(x.id)[0]; const ws = h ? (h.sets || []).filter(z => !z.wu) : []; if (!ws.length) return ""; return `<p class="xs mut">🔥 Ta dernière fois (${ws.map(z => z.w + "×" + z.r).join(", ")}) ≈ ${r0(exKcal(x.id, ws))} kcal (<a href="#" data-act="energyInfo" style="color:var(--acc)">calcul</a>)</p>`; })()}`;
  };
}

// ===================== SÉANCE =====================
function viewWorkout() {
  const w = liveWorkout(); const mode = S.wMode || "list";
  const spb = typeof spBarHTML === "function" ? spBarHTML() : "";
  const toggle = spb + `<div class="chips" style="margin-bottom:10px"><button class="chip ${mode === "list" ? "on" : ""}" data-act="wMode" data-v="list">Liste</button><button class="chip ${mode === "3d" ? "on" : ""}" data-act="wMode" data-v="3d">Salle 3D</button></div>`;
  if (mode === "3d") return `${statusBanner()}<div class="row between"><h1>${w ? esc(w.name) : "Salle 3D"}</h1>${w ? `<span class="mut" id="wTimer">${fmtDur(Date.now() - w.start)}</span>` : ""}</div>${toggle}
    <div class="${S.gymFull ? "gymfs" : "gymbox"}"><div id="scene3d" style="height:100%;width:100%;overflow:hidden;background:var(--chip)"></div>
      <button class="gymfsbtn" data-act="gymFull" title="${S.gymFull ? "Quitter le plein écran" : "Plein écran"}">${S.gymFull ? "✕ Fermer" : "⛶ Plein écran"}</button>
    <div class="row gymctl" style="gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center"><span class="xs mut">Noms :</span>${[["auto", "Sans chevauchement"], ["all", "Tous"], ["none", "Aucun"]].map(([k, l]) => `<button class="chip ${(S.gymNames || "auto") === k ? "on" : ""}" data-act="gymNames" data-v="${k}">${l}</button>`).join("")}
      <select data-act="gymGoto" style="width:auto;margin-left:auto"><option value="">Aller à une machine…</option>${GYM_MACHINES.map(m => `<option value="${m.id}">${esc(m.label)}</option>`).join("")}</select></div></div>
    <p class="xs mut c">Touche une machine → choisis l'exercice → note tes séries. Trackpad : tourne 2 doigts pour faire pivoter la salle, pince pour zoomer, glisse pour te déplacer.</p>
    ${w ? `<div class="card"><h3>Dans cette séance</h3>${(w.ex || []).map(e => `<div class="entry" data-act="gymPickEx" data-v="${e.id}"><span class="sm">${esc(getEx(e.id).name)}</span><span class="xs mut">${workSets(e).length} série(s) ›</span></div>`).join("") || `<p class="mut sm">Aucun exercice.</p>`}
      <button style="width:100%;margin-top:8px" data-act="finishW">Terminer la séance</button></div>` : ""}`;
  if (w) return toggle + liveView(w);
  const P = program(); const hist = workouts().filter(x => !x.live).slice(0, 30);
  return `${statusBanner()}<h1>Séance</h1>${toggle}${deloadCardHTML()}${recoveryCardHTML()}
    <div class="card"><h2>Démarrer</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${Object.keys(P).map(n => `<button data-act="startW" data-v="${esc(n)}">${esc(n)}</button>`).join("")}</div>
    <p class="xs mut">Ton programme est préchargé. Pendant la séance, 🚫 remplace un exercice que tu ne veux pas faire.</p>
    <button class="sec" style="width:100%;margin-top:6px" data-act="genOpen">✨ Créer un programme pour ma salle</button></div>
    <div class="card"><h2>Historique</h2>${hist.map(h => {
      const sets = (h.ex || []).reduce((s, e) => s + workSets(e).length, 0);
      const vol = (h.ex || []).reduce((s, e) => s + workSets(e).reduce((a, x) => a + x.w * x.r, 0), 0);
      return `<div class="entry" data-act="openHist" data-v="${h._id}"><div><div class="b">${esc(h.name)}</div><div class="mut xs">${fmtDay(dateKey(new Date(h.start)))} · ${fmtDur((h.end || h.start) - h.start)} · ${sets} séries · ${r0(vol)} kg soulevés · ≈ ${r0(workoutKcal(h))} kcal</div></div><div class="mut">›</div></div>`;
    }).join("") || `<p class="mut sm">Aucune séance enregistrée.</p>`}</div>`;
}
function liveView(w) {
  const P = program()[w.name] || {};
  const warm = P.warmup ? `<div class="card"><label class="row" style="gap:10px;color:var(--txt);font-size:15px;margin:0"><input type="checkbox" style="width:22px;height:22px" data-act="warmAll" ${w.warmDone ? "checked" : ""}> <b>Échauffement fait</b></label>
    <details style="margin-top:6px"><summary class="xs mut">Voir le détail (poulie, unilatéral, ~8 reps léger)</summary><ul class="sm" style="margin:6px 0 0">${WARMUP_UPPER.map(([n]) => `<li>${esc(n)}</li>`).join("")}</ul></details></div>` : "";
  return `${statusBanner()}<div class="row between"><h1>${esc(w.name)}</h1><span class="mut" id="wTimer">${fmtDur(Date.now() - w.start)}</span></div>
    <div class="xs mut" style="margin:-6px 0 8px">🔥 Séance : ≈ <b>${r0(workoutKcal(w))} kcal</b> dépensées par les séries (≈ ${r0(workoutKcalGross(w))} kcal avec ton métabolisme de repos) · <a href="#" data-act="energyInfo" style="color:var(--acc)">calcul</a></div>
    <div class="row sm" style="margin:-4px 0 10px"><span class="mut">Date :</span><input type="date" id="wDate" value="${dateKey(new Date(w.start))}" style="width:auto;padding:5px 8px" max="${todayKey()}"><span class="xs mut">(change-la pour noter une séance passée)</span></div>
    ${warm}${(w.ex || []).map((e, i) => exCard(w, e, i)).join("")}
    <button class="sec" style="width:100%;margin-bottom:10px" data-act="addEx">+ Ajouter un exercice</button>
    <div class="card"><label>Notes de séance</label><textarea id="wNotes" placeholder="sensations, douleurs, machine prise…">${esc(w.notes || "")}</textarea>
    <div class="row" style="margin-top:10px"><button class="danger grow" data-act="cancelW">Abandonner</button><button class="grow" data-act="finishW">Terminer la séance</button></div></div>`;
}
function exCard(w, e, i) {
  if (e.done) { const x0 = getEx(e.id); const ws = (e.sets || []).filter(s => !s.wu);
    return `<div class="card exdone" data-act="exReopen" data-i="${i}"><div class="row between" style="align-items:center"><div><div class="b">✅ ${esc(x0.name)}</div>
      <div class="xs mut">${ws.length} série${ws.length > 1 ? "s" : ""} · ${ws.map(s => `${s.w}×${s.r}${s.rir != null ? ` @${s.rir}` : ""}`).join(" · ")}</div></div><button class="ghost small" data-act="exReopen" data-i="${i}">Modifier</button></div></div>`; }
  const x = getEx(e.id); const sug = suggestion(e.id, w._id); const hist = exerciseHistory(e.id, w._id);
  const last = hist[0]; const [lo, hi] = repRange(e.id);
  const lastW = (e.sets || []).filter(s => !s.wu).slice(-1)[0]; const dr = S.draft[i] || (S.draft[i] = { w: lastW?.w ?? sug.w ?? "", r: lastW?.r ?? "", rir: null, wu: false });
  const alts = ALTERNATIVES[e.id] || [];
  const prev = (e.sets || []);
  const dl = isDeload() ? `<div class="reco xs" style="margin:6px 0">🔋 Décharge : fais environ <b>${Math.max(1, Math.round((program()[w.name]?.sets?.[e.id] || 3) / 2))} série(s)</b> à la charge habituelle, en gardant 3-4 reps en réserve.</div>` : "";
  return `<div class="card">${dl}<div class="exhead"><div style="display:flex;gap:10px;align-items:flex-start"><div style="width:110px;flex:none;cursor:pointer;text-align:center" data-act="showMusc" data-v="${e.id}">${bodyThumbHTML({ prim: x.prim, sec: x.sec, focus: x.focus })}<div class="xs" style="color:var(--acc,#3b82f6)">🎬 Comment faire</div></div><div><h3 style="margin:0">${esc(x.name)}</h3><div class="xs mut">${x.focus.map(m => MUSCLES[m][0]).join(", ")}</div></div></div>
    <div class="row" style="gap:2px">${alts.length ? `<button class="ghost small" data-act="swapEx" data-i="${i}" title="Variante">⇄</button>` : ""}<button class="ghost small" data-act="refuse" data-i="${i}" title="Je ne veux pas faire cet exercice">🚫</button><button class="ghost small" data-act="exUp" data-i="${i}" title="Monter">↑</button><button class="danger small" data-act="rmEx" data-i="${i}" title="Retirer">✕</button></div></div>
    <div class="row sm" style="margin:6px 0;gap:6px;flex-wrap:wrap"><span class="mut">Fourchette :</span><select data-act="range" data-v="${e.id}" style="width:auto;padding:4px 6px">${[[6, 8], [6, 10], [8, 10], [8, 12], [10, 15], [12, 20]].map(([a, b]) => `<option value="${a}-${b}" ${a === lo && b === hi ? "selected" : ""}>${a}-${b} reps</option>`).join("")}</select></div>
    ${last ? `<div class="xs mut">Dernière fois (${fmtDay(dateKey(new Date(last.date)))}) : ${last.sets.map(s => `${s.w}×${s.r}${s.rir != null ? ` @${s.rir}` : ""}`).join(" · ")}</div>` : ""}
    <div class="reco ${sug.up ? "good" : ""} sm">${esc(sug.text)}</div>
    ${prev.length ? `<div class="set xs mut"><span>#</span><span>kg</span><span>reps</span><span>RIR · repos</span><span></span></div>` : ""}
    ${prev.map((s, j) => { const rest = j > 0 ? s.t - prev[j - 1].t : null; const n = prev.slice(0, j + 1).filter(z => !z.wu).length; const ghostSet = !s.wu && last ? (last.sets || []).filter(z => !z.wu)[n - 1] : null;
      return `<div class="set ${s.wu ? "wu" : ""}"><span class="mut">${s.wu ? "É" : n}</span><span class="b">${s.w}</span><span class="b">${s.r} ${s.wu ? "" : ghostBadge(ghostCmp(s, ghostSet))}</span><span class="xs">${s.rir != null && !s.wu ? "RIR " + s.rir : ""}${rest ? ` · ${fmtDur(rest)}` : ""}</span><button class="danger small" data-act="delSet" data-i="${i}" data-j="${j}">✕</button></div>`; }).join("")}
    ${ghostSummary(e, last)}
    ${(() => { const done = prev.length ? exKcal(e.id, prev) : 0; const nW = prev.filter(z => !z.wu).length; const gs = last ? (last.sets || []).filter(z => !z.wu)[nW] : null;
      return `${gs ? `<div class="ghostline xs">👻 Série ${nW + 1} la dernière fois : <b>${gs.w} kg × ${gs.r}</b>${gs.rir != null ? ` @RIR ${gs.rir}` : ""} — à égaler ou battre</div>` : ""}
      <div class="xs mut" style="margin-top:4px">🔥 ${done ? `≈ <b>${r0(done)} kcal</b> pour ces séries` : `Prévu (${hi} reps à ${dr.w || "?"} kg) : ≈ ${dr.w ? r0(setKcal(e.id, +dr.w, hi)) : "?"} kcal / série`} <a href="#" data-act="energyInfo" style="color:var(--acc)">comment ?</a></div>`; })()}
    <div style="border-top:1px solid var(--line);margin-top:8px;padding-top:8px">
      <div class="row"><div class="grow"><div class="xs mut">Charge (kg)</div><div class="stepper"><button data-act="dStep" data-i="${i}" data-k="w" data-v="-${profile().increment}">−</button><input type="number" inputmode="decimal" value="${dr.w}" data-input="draft" data-i="${i}" data-k="w"><button data-act="dStep" data-i="${i}" data-k="w" data-v="${profile().increment}">+</button></div>${BARBELL.has(e.id) && dr.w ? plateHTML(+dr.w) : ""}</div>
      <div class="grow"><div class="xs mut">Reps</div><div class="stepper"><button data-act="dStep" data-i="${i}" data-k="r" data-v="-1">−</button><input type="number" inputmode="numeric" value="${dr.r}" data-input="draft" data-i="${i}" data-k="r" placeholder="${hi}"><button data-act="dStep" data-i="${i}" data-k="r" data-v="1">+</button></div></div></div>
      <div class="row" style="margin-top:8px;flex-wrap:wrap"><span class="xs mut">RIR (reps en réserve)</span>${[0, 1, 2, 3, 4].map(v => `<button class="chip ${dr.rir === v && !dr.wu ? "on" : ""}" data-act="dRir" data-i="${i}" data-v="${v}">${v === 4 ? "4+" : v}</button>`).join("")}<button class="chip ${dr.wu ? "on" : ""}" data-act="dWu" data-i="${i}">Échauff.</button></div>
      <div class="row" style="margin-top:8px;gap:8px"><button class="grow" data-act="logSet" data-i="${i}">Valider la série</button>${prev.some(z => !z.wu) ? `<button class="sec small" style="flex:none;padding:8px 12px" data-act="exDone" data-i="${i}" title="Replier l'exercice">✓ Exercice fini</button>` : ""}</div></div></div>`;
}
function exPickerSheet(mode, idx) {
  return () => {
    const q = (S.exQ || "").toLowerCase();
    const all = Object.values(EX).concat(Object.values(customEx()));
    const list = mode === "swap" ? (ALTERNATIVES[liveWorkout().ex[idx].id] || []).map(getEx) : all.filter(x => !q || (x.name + " " + x.cat).toLowerCase().includes(q));
    const cats = [...new Set(list.map(x => x.cat))];
    return `<div class="row between"><h2>${mode === "swap" ? "Choisir une variante" : "Ajouter un exercice"}</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
      ${mode === "swap" ? "" : `<input placeholder="Rechercher…" value="${esc(S.exQ || "")}" data-input="exQ" autocomplete="off">`}
      <div id="exList">${cats.map(c => `<h3 style="margin-top:12px">${esc(c)}</h3>` + list.filter(x => x.cat === c).map(x => `<div class="entry" data-act="pickEx" data-v="${x.id}" data-mode="${mode}" data-i="${idx ?? ""}"><div><div>${esc(x.name)}</div><div class="xs mut">${x.prim.map(m => MUSCLES[m]?.[0]).join(", ")}</div></div><div class="mut">+</div></div>`).join("")).join("")}</div>
      ${mode === "swap" ? "" : `<h3 style="margin-top:14px">Exercice qui n'est pas dans la liste</h3><div class="row"><input id="newExName" placeholder="nom de l'exercice"><select id="newExMuscle" style="width:auto">${Object.entries(MUSCLES).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select></div><button class="small" style="margin-top:6px" data-act="createEx">Créer et ajouter</button>`}`;
  };
}
function histSheet(id) {
  return () => {
    const w = Store.get(id); if (!w) return "";
    return `<div class="row between"><h2>${esc(w.name)}</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
      <p class="mut sm">${fmtDay(dateKey(new Date(w.start)))} · ${fmtDur((w.end || w.start) - w.start)}</p>
      ${(w.ex || []).map(e => `<div class="card"><h3>${esc(getEx(e.id).name)}</h3>${(e.sets || []).map(s => `<div class="sm ${s.wu ? "mut" : ""}">${s.wu ? "Échauff. " : ""}${s.w} kg × ${s.r}${s.rir != null && !s.wu ? ` · RIR ${s.rir}` : ""}</div>`).join("")}</div>`).join("")}
      ${w.notes ? `<div class="reco">${esc(w.notes)}</div>` : ""}
      <button class="danger" data-act="delW" data-v="${id}">Supprimer cette séance</button>`;
  };
}

// ===================== PROGRÈS =====================
function viewProgress() {
  const exIds = [...new Set(workouts().flatMap(w => (w.ex || []).filter(e => workSets(e).length).map(e => e.id)))];
  if (!S.progEx || !exIds.includes(S.progEx)) S.progEx = exIds[0] || null;
  const vol = weeklyVolume(7);
  const recs = exIds.map(id => { const h = exerciseHistory(id); const best = h.flatMap(x => x.sets).reduce((b, s) => !b || e1rm(s) > e1rm(b) ? s : b, null); return { id, best }; }).filter(x => x.best);
  return `${statusBanner()}<h1>Progrès</h1>
    ${bilanCardHTML()}
    <div class="card"><h2>Poids</h2><canvas id="chW" height="180"></canvas><p class="xs mut">Points = pesées · ligne = tendance lissée (moins sensible à l'eau et au sel).</p></div>
    <div class="card"><h2>Calories (14 derniers jours)</h2><canvas id="chK" height="180"></canvas></div>
    <div class="card"><h2>Progression par exercice</h2>${exIds.length ? `<select data-act="progEx">${exIds.map(id => `<option value="${id}" ${id === S.progEx ? "selected" : ""}>${esc(getEx(id).name)}</option>`).join("")}</select><canvas id="chE" height="180" style="margin-top:8px"></canvas><p class="xs mut">1RM estimé (formule d'Epley) de ta meilleure série + charge max de chaque séance.</p>` : `<p class="mut sm">Enregistre des séances pour voir ta progression.</p>`}</div>
    <div class="card"><h2>Volume des 7 derniers jours</h2><p class="xs mut">Séries dures par muscle (secondaire = ½). Repère des études : ~10-20 séries/semaine pour l'hypertrophie (Schoenfeld 2017, Pelland 2024).</p>
      <table class="vol">${VOLUME_GROUPS.map(g => { const v = vol[g]; const col = v >= 10 ? "var(--grn)" : v >= 6 ? "var(--org)" : "var(--red)";
        return `<tr><td style="width:42%">${g}</td><td><div class="bar"><i style="width:${Math.min(100, v / 20 * 100)}%;background:${col}"></i></div></td><td style="width:40px;text-align:right">${r1(v)}</td></tr>`; }).join("")}</table></div>
    ${photosCardHTML()}
    <div class="card"><h2>Records</h2>${recs.map(x => `<div class="entry"><span class="sm">${esc(getEx(x.id).name)}</span><span class="sm b">${x.best.w} kg × ${x.best.r} <span class="mut xs">(1RM ≈ ${r0(e1rm(x.best))})</span></span></div>`).join("") || `<p class="mut sm">—</p>`}</div>`;
}
function drawCharts() {
  charts.forEach(c => c.destroy()); charts = [];
  if (typeof Chart === "undefined") { $$("canvas").forEach(c => c.outerHTML = `<p class="mut sm">Graphique indisponible (bibliothèque non chargée).</p>`); return; }
  const css = getComputedStyle(document.documentElement); const mut = css.getPropertyValue("--mut").trim(), line = css.getPropertyValue("--line").trim();
  Chart.defaults.color = mut; Chart.defaults.borderColor = line; Chart.defaults.font.family = "-apple-system,system-ui,sans-serif";
  const ws = weightSeries(90);
  if ($("#chW")) charts.push(new Chart($("#chW"), { type: "line", data: { labels: ws.map(x => fmtDay(x.k)), datasets: [
    { label: "Pesée", data: ws.map(x => x.w), showLine: false, pointRadius: 3, borderColor: "#94a3b8", backgroundColor: "#94a3b8" },
    { label: "Tendance", data: ws.map(x => r1(x.t)), pointRadius: 0, borderColor: "#2563eb", tension: .3 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 6 } } } } }));
  const ks = [...Array(14)].map((_, i) => addDays(todayKey(), i - 13)); const T = targets();
  if ($("#chK")) charts.push(new Chart($("#chK"), { type: "bar", data: { labels: ks.map(k => fmtDay(k).split(" ").slice(0, 2).join(" ")), datasets: [
    { label: "Apports", data: ks.map(k => r0(dayTotals(k).kcal)), backgroundColor: "#60a5fa", borderRadius: 4 },
    { type: "line", label: "Cible", data: ks.map(() => T.kcal), borderColor: "#f59e0b", pointRadius: 0, borderDash: [5, 4] }] }, options: { plugins: { legend: { display: false } } } }));
  if ($("#chE") && S.progEx) { const h = exerciseHistory(S.progEx).slice().reverse();
    charts.push(new Chart($("#chE"), { type: "line", data: { labels: h.map(x => fmtDay(dateKey(new Date(x.date)))), datasets: [
      { label: "1RM estimé", data: h.map(x => r1(Math.max(...x.sets.map(e1rm)))), borderColor: "#e5484d", tension: .25 },
      { label: "Charge max", data: h.map(x => Math.max(...x.sets.map(s => s.w))), borderColor: "#94a3b8", borderDash: [4, 4], tension: .25 }] }, options: { plugins: { legend: { position: "bottom" } } } })); }
}

// ===================== COACH =====================
function computeRecos() {
  const R = []; const T = targets(); const p = profile();
  const ks = [...Array(7)].map((_, i) => addDays(todayKey(), -1 - i)).filter(k => dayTotals(k).kcal >= 800);
  if (ks.length < 4) R.push({ l: "warn", t: "Note tes repas chaque jour", x: `Seulement ${ks.length} journée(s) bien notée(s) sur les 7 derniers jours. Le calcul adaptatif de ta dépense a besoin d'au moins 10 jours notés et de pesées régulières (3-4 par semaine minimum).` });
  if (ks.length) {
    const avg = f => ks.reduce((s, k) => s + dayTotals(k)[f], 0) / ks.length;
    const ap = avg("p"), ak = avg("kcal"), af = avg("fib");
    if (ap < T.p * 0.9) R.push({ l: "bad", t: "Protéines trop basses", x: `Moyenne ${r0(ap)} g/j pour une cible de ${T.p} g (${p.protPerKg} g/kg). Les méta-analyses (Morton 2018) situent le plafond d'efficacité vers 1,6 g/kg, jusqu'à 2,2 g/kg pour être large, surtout en léger déficit. Facile à corriger : skyr, whey, blanc de poulet, œufs.` });
    else R.push({ l: "good", t: "Protéines OK", x: `Moyenne ${r0(ap)} g/j (cible ${T.p} g).` });
    const diff = ak - T.kcal;
    if (Math.abs(diff) > T.kcal * 0.1) R.push({ l: "warn", t: diff > 0 ? "Au-dessus de ta cible calorique" : "En dessous de ta cible calorique", x: `Moyenne ${r0(ak)} kcal/j pour une cible de ${T.kcal} (${diff > 0 ? "+" : ""}${r0(diff)}).` });
    if (af < 25) R.push({ l: "warn", t: "Pas assez de fibres", x: `Moyenne ${r0(af)} g/j (repère EFSA : 25 g minimum, idéal ~30 g). Solution sans effort : un bol de gazpacho ou de velouté par jour (~250-300 ml), des lentilles ou pois chiches en bocal, des fruits rouges dans le skyr, des légumes surgelés poêlés 5 min.` });
  }
  const ws = weightSeries(28);
  if (ws.length > 10) {
    const a = ws[Math.max(0, ws.length - 15)].t, b = ws[ws.length - 1].t; const rate = (b - a) / a * 100 / 2; const [lo, hi] = GOALS[p.goal].rate;
    const msg = `Tendance : ${rate > 0 ? "+" : ""}${Math.round(rate * 100) / 100} % du poids par semaine. Repère pour « ${GOALS[p.goal].label} » : entre ${lo} et ${hi} %/sem.`;
    R.push({ l: rate < lo || rate > hi ? "warn" : "good", t: rate < lo || rate > hi ? "Rythme d'évolution du poids hors cible" : "Rythme du poids cohérent avec ton objectif", x: msg });
  }
  const vol = weeklyVolume(7); const hasW = workouts().some(w => !w.live && w.start > Date.now() - 7 * 864e5);
  if (hasW) {
    const low = VOLUME_GROUPS.filter(g => vol[g] > 0 && vol[g] < 8 && !["Avant-bras", "Lombaires", "Trapèzes", "Coiffe des rotateurs", "Adducteurs"].includes(g));
    if (low.length) R.push({ l: "warn", t: "Volume bas sur certains muscles", x: `${low.map(g => `${g} (${r1(vol[g])} séries)`).join(", ")}. Les études dose-réponse (Schoenfeld 2017) montrent plus d'hypertrophie vers 10-20 séries dures/semaine. Si un de ces muscles est une priorité, ajoute 2-4 séries par semaine.` });
    const legs = vol["Quadriceps"] + vol["Ischios"];
    if (legs < 4) R.push({ l: "warn", t: "Jambes peu travaillées cette semaine", x: "Le foot et le padel ne remplacent pas les séries lourdes pour l'hypertrophie des jambes." });
  }
  const stal = [...new Set(workouts().flatMap(w => (w.ex || []).map(e => e.id)))].filter(stalled);
  if (stal.length) R.push({ l: "warn", t: "Stagnation détectée", x: `${stal.map(id => getEx(id).name).join(", ")} : pas de progrès du 1RM estimé sur les 3 dernières séances. Pistes : vérifie le sommeil et les protéines, change de variante, ou fais une semaine allégée (deload, −40 % de volume).` });
  const sl = [...Array(7)].map((_, i) => Store.get("d-" + addDays(todayKey(), -i))?.sleep).filter(Boolean);
  if (sl.length >= 3) { const a = sl.reduce((x, y) => x + y, 0) / sl.length; if (a < 7) R.push({ l: "warn", t: "Sommeil court", x: `Moyenne ${r1(a)} h. En dessous de 7 h, la récupération et la composition corporelle en pâtissent (en déficit, moins de sommeil = plus de muscle perdu, Nedeltcheva 2010).` }); }
  return R;
}
function viewCoach() {
  const T = targets(); const ad = T.adaptive; const R = computeRecos();
  return `${statusBanner()}<h1>Coach</h1>
    <div class="card"><h2>Ta dépense et tes cibles</h2>
      <div class="row wrap" style="gap:16px"><div><div class="big">${T.tdee}</div><div class="xs mut">kcal/j de dépense estimée</div></div><div><div class="big">${T.kcal}</div><div class="xs mut">kcal/j cible</div></div></div>
      <p class="sm">P ${T.p} g · G ${T.c} g · L ${T.f} g</p>
      <p class="xs mut">Source : ${esc(T.source)}. ${ad.ok ? `Apports moyens ${r0(ad.avgIntake)} kcal, poids ${ad.slopeWeek > 0 ? "+" : ""}${Math.round(ad.slopeWeek * 100) / 100} kg/sem → dépense réelle ≈ ${r0(ad.tdee)} kcal. Formule seule : ${T.formula} kcal.` : `Le mode adaptatif s'active après ~10 jours notés et 4 pesées sur 10 jours (actuellement ${ad.days} j, ${ad.weighs} pesées). Il recalcule ta vraie dépense à partir de tes apports et de l'évolution de ton poids, et ajuste tes cibles chaque semaine.`}</p></div>
    <div class="card"><h2>Recommandations</h2>${R.map(r => `<div class="reco ${r.l}"><div class="b sm">${esc(r.t)}</div><div class="sm">${esc(r.x)}</div></div>`).join("") || `<p class="mut sm">Pas encore assez de données.</p>`}</div>
    <div class="card"><h2>Bilan IA de la semaine</h2><p class="xs mut">Analyse de tes 7 derniers jours (nutrition, poids, séances, sommeil), fondée sur les études.</p>
      <button data-act="aiWeek" ${S.busy.week ? "disabled" : ""}>${S.busy.week ? '<span class="spin"></span> Analyse…' : "Lancer le bilan"}</button>${S.aiOut.week ? `<div class="ai-out">${esc(S.aiOut.week)}</div>` : ""}</div>
    <div class="card"><h2>Pose une question au coach</h2>
      ${S.chat.map(m => `<div class="ai-out" style="${m.role === "user" ? "background:var(--acc2)" : ""}">${m.role === "user" ? esc(m.content) : aiRich(m.content)}</div>`).join("")}
      <textarea id="chatIn" placeholder="ex. Est-ce que je devrais faire mes biceps avant mes triceps ? Combien de créatine par jour ?" style="margin-top:8px"></textarea>
      <div class="row" style="margin-top:6px"><button class="grow" data-act="chatSend" ${S.busy.chat ? "disabled" : ""}>${S.busy.chat ? '<span class="spin"></span>' : "Envoyer"}</button>${S.chat.length ? `<button class="sec" data-act="chatClear">Effacer</button>` : ""}</div></div>`;
}
function weekSummary() {
  const days = [...Array(7)].map((_, i) => addDays(todayKey(), -i)).reverse().map(k => { const t = dayTotals(k), d = day(k); return { jour: k, kcal: r0(t.kcal), prot: r0(t.p), gluc: r0(t.c), lip: r0(t.f), fibres: r0(t.fib), poids: d.weight || null, sommeil: d.sleep || null, pas: d.steps || null, humeur: d.mood || null, energie: d.energy || null, stress: d.stress || null, sport: (d.acts || []).map(a => a.type + " " + a.min + "min").join(", ") }; });
  const ws = workouts().filter(w => !w.live && w.start > Date.now() - 7 * 864e5).map(w => ({ seance: w.name, date: dateKey(new Date(w.start)), exercices: (w.ex || []).map(e => ({ nom: getEx(e.id).name, series: workSets(e).map(s => `${s.w}kg×${s.r}${s.rir != null ? "@RIR" + s.rir : ""}`) })), notes: w.notes || "" }));
  const T = targets();
  return { cibles: { kcal: T.kcal, prot: T.p, gluc: T.c, lip: T.f, depense_estimee: T.tdee, source: T.source }, jours: days, seances: ws, volume_7j: weeklyVolume(7), alertes: computeRecos().map(r => r.t) };
}

// ===================== PROFIL =====================
function viewProfile() {
  const p = profile(); const T = targets();
  const f = (id, lab, v, step = "1", extra = "") => `<div><label>${lab}</label><input id="p_${id}" type="number" step="${step}" inputmode="decimal" value="${v ?? ""}" ${extra}></div>`;
  const nW = workouts().filter(w => !w.live).length, nB = (typeof bilans === "function" ? bilans().length : 0), wk = typeof weekWeights === "function" ? weekWeights(weekKey()) : { avg: null };
  const nDays = Store.ids("d-").filter(k => (Store.get(k)?.entries || []).length).length;
  return `${statusBanner()}<h1>Profil</h1>
    <div class="card profhead"><div class="row" style="gap:14px;align-items:center"><div class="avatar">V</div><div><div class="b" style="font-size:20px">Vuthy</div>
      <div class="xs mut">${p.age || "?"} ans · ${p.height || "?"} cm · ${wk.avg ?? r1(latestWeight())} kg${wk.avg ? " (moyenne de la semaine)" : ""}</div><div class="xs">🎯 ${esc(GOALS[p.goal].label)} · ${T.kcal} kcal</div></div></div>
      <div class="pstats"><div><b>${nW}</b><span>séances</span></div><div><b>${nDays}</b><span>jours notés</span></div><div><b>🔥 ${typeof streakDays === "function" ? streakDays() : 0}</b><span>d'affilée</span></div><div><b>${nB}</b><span>bilans</span></div></div>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px"><button class="sec small" data-act="blOpen">📸 Bilan de la semaine</button><button class="sec small" data-act="checkinHist">📋 Check-ins</button><button class="sec small" data-act="quickWeight">⚖️ Mon poids</button></div></div>
    <div class="card"><h2>Objectif</h2><div class="chips">${Object.entries(GOALS).map(([k, g]) => `<button class="chip ${p.goal === k ? "on" : ""}" data-act="setGoal" data-v="${k}">${g.label}</button>`).join("")}</div>
      <p class="xs mut">Change quand tu veux : les cibles se recalculent tout de suite. Maintien = 0 %, Recomposition = −5 %, Masse = +8 %, Sèche = −20 % par rapport à ta dépense.</p></div>
    <div class="card"><h2>Mes infos</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:0 10px">
      ${f("age", "Âge", p.age)}${f("height", "Taille (cm)", p.height, "0.5")}${f("weight", "Poids de départ (kg)", p.weight, "0.1")}
      <div><label>Activité hors muscu</label><select id="p_activity">${[[1.4, "Peu actif (assis)"], [1.55, "Modéré (étudiant + muscu)"], [1.7, "Actif"], [1.85, "Très actif"]].map(([v, l]) => `<option value="${v}" ${+p.activity === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      ${f("protPerKg", "Protéines (g/kg)", p.protPerKg, "0.1")}${f("fatPerKg", "Lipides (g/kg)", p.fatPerKg, "0.1")}
      ${f("manualKcal", "Kcal manuelles (vide = auto)", p.manualKcal, "10")}${f("increment", "Cran de charge (kg)", p.increment, "0.5")}</div>
      <button style="margin-top:10px" data-act="saveProfile">Enregistrer</button>
      <p class="xs mut">Cibles actuelles : ${T.kcal} kcal · P ${T.p} g · G ${T.c} g · L ${T.f} g. Le poids utilisé est ta dernière pesée (${r1(T.weight)} kg).</p></div>
    <div class="card"><h2>Apparence</h2><div class="chips">${[["clair", "☀️ Clair"], ["sombre", "🌙 Sombre"], ["auto", "Auto (comme le Mac/iPhone)"]].map(([k, l]) => `<button class="chip ${themePref() === k ? "on" : ""}" data-act="setTheme" data-v="${k}">${l}</button>`).join("")}</div><div class="row between" style="margin-top:10px"><span class="sm">Inverser le sens de rotation à 2 doigts (3D)</span><button class="chip ${localStorage.getItem("muscu_inv3d") === "1" ? "on" : ""}" data-act="inv3d">${localStorage.getItem("muscu_inv3d") === "1" ? "Inversé" : "Normal"}</button></div></div>
    ${syncCardHTML()}
    ${typeof SP !== "undefined" && SP.clientId() ? `<div class="card"><h2>Spotify</h2>${SP.tok() ? `<p class="sm">Connecté ✓ (contrôle depuis l'onglet Séance)</p><button class="small sec" data-act="spLogout">Déconnecter</button>` : `<button class="small" style="background:#1db954" data-act="spLogin">Connecter Spotify</button>`}</div>` : ""}
    <div class="card"><h2>Données</h2><p class="xs mut">${Store.mode === "cloud" ? "Synchronisées en ligne entre ton iPhone et ton Mac." : "Stockées dans ce navigateur (mode aperçu)."} ${Store.ids("d-").length} jours · ${Store.ids("w-").length} séances · ${Object.keys(myFoods()).length} aliments perso.</p>
      <div class="row"><button class="sec" data-act="exportData">Copier une sauvegarde</button><button class="sec" data-act="importData">Restaurer</button></div></div>
    <div class="card"><h2>Installer sur l'iPhone</h2><p class="sm">Dans Safari : ouvre cette page → bouton Partager → « Sur l'écran d'accueil ». L'app s'ouvre ensuite comme une vraie app.</p></div>`;
}

// ===== semaine en haut du journal (navigation passé / futur, à la manière de FitSelf) =====
const DAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];
function weekStart(k) { const d = parseKey(k); const off = (d.getDay() + 6) % 7; return addDays(k, -off); }
function maxPlanDay() { return addDays(weekStart(todayKey()), 13); } // jusqu'à la fin de la semaine prochaine
function streakDays() {
  let k = todayKey(), n = 0; if (!(day(k).entries || []).length) k = addDays(k, -1);
  while (n < 400 && (day(k).entries || []).length) { n++; k = addDays(k, -1); } return n;
}
function weekStripHTML(k) {
  const ws = weekStart(k), today = todayKey(), T = targets();
  const cells = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const d = addDays(ws, i), es = day(d).entries || [], kc = es.length ? dayTotals(d).kcal : 0;
    const okRange = T.kcal && Math.abs(kc - T.kcal) <= T.kcal * 0.1;
    const dis = d > maxPlanDay();
    return `<button class="wd ${d === k ? "on" : ""} ${d === today ? "today" : ""} ${d > today ? "fut" : ""}" data-act="dayGo" data-v="${d}" ${dis ? "disabled" : ""}>
      <span class="xs">${DAY_LETTERS[parseKey(d).getDay()]}</span><b>${parseKey(d).getDate()}</b>
      <i>${es.length ? (d > today ? "○" : okRange ? "✓" : "•") : ""}</i></button>`;
  }).join("");
  const st = streakDays();
  const title = k === today ? "Aujourd'hui" : k === addDays(today, -1) ? "Hier" : k === addDays(today, 1) ? "Demain" : fmtDay(k);
  return `<div class="row between" style="margin-top:4px"><h2 style="margin:0;position:relative">${title}${k > today ? ' <span class="tag">prévu</span>' : ""}
      <input type="date" class="datepick" value="${k}" max="${maxPlanDay()}" data-act="dayPick" aria-label="Choisir un jour"></h2>
    <div class="row" style="gap:8px">${k !== today ? `<button class="chip" data-act="dayGo" data-v="${today}">Aujourd'hui</button>` : ""}<span class="b" title="Jours notés d'affilée">🔥 ${st}</span><button class="ghost small" data-act="weekSheet" title="Ma semaine">📊</button></div></div>
  <div class="week"><button class="ghost" data-act="dayNav" data-v="-7" aria-label="Semaine précédente">‹</button>${cells}<button class="ghost" data-act="dayNav" data-v="7" ${addDays(ws, 7) > maxPlanDay() ? "disabled" : ""} aria-label="Semaine suivante">›</button></div>`;
}
function weekSheet() {
  const T = targets(), today = todayKey(); const ks = []; let k = today;
  for (let i = 0; i < 60 && ks.length < 7; i++, k = addDays(k, -1)) if ((day(k).entries || []).length) ks.push(k);
  ks.reverse(); const tot = ks.map(x => dayTotals(x));
  const avg = f => tot.length ? tot.reduce((s, t) => s + t[f], 0) / tot.length : 0;
  const inT = tot.filter(t => Math.abs(t.kcal - T.kcal) <= T.kcal * 0.1).length; const mx = Math.max(T.kcal * 1.3, ...tot.map(t => t.kcal));
  return `<div class="row between"><h2>Ma semaine</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    ${!ks.length ? `<p class="mut">Aucun jour noté pour l'instant.</p>` : `<p class="sm mut">Moyenne des ${ks.length} derniers jours notés.</p>
    <div class="card"><div class="row between"><span>Calories</span><b>${r0(avg("kcal"))} / ${T.kcal} kcal</b></div>
    <div class="row between xs mut"><span>Protéines ${r0(avg("p"))}/${T.p} g</span><span>Glucides ${r0(avg("c"))}/${T.c} g</span><span>Lipides ${r0(avg("f"))}/${T.f} g</span></div>
    <p class="sm" style="margin-bottom:0"><b>${inT}/${ks.length}</b> jours dans l'objectif (±10 %)</p></div>
    <div class="card"><div style="display:flex;align-items:flex-end;gap:6px;height:140px;position:relative">
      <div style="position:absolute;left:0;right:0;bottom:${T.kcal / mx * 100}%;border-top:2px dashed var(--acc);opacity:.6"></div>
      ${ks.map((x, i) => `<div style="flex:1;text-align:center" data-act="dayGo" data-v="${x}"><div style="height:${tot[i].kcal / mx * 120}px;border-radius:6px 6px 0 0;background:${Math.abs(tot[i].kcal - T.kcal) <= T.kcal * 0.1 ? "var(--ok,#22c55e)" : "var(--chip)"}"></div><div class="xs mut">${DAY_LETTERS[parseKey(x).getDay()]}${parseKey(x).getDate()}</div></div>`).join("")}
    </div><p class="xs mut">Pointillés = ton objectif. Vert = à ±10 %. Touche une barre pour ouvrir le jour.</p></div>`}`;
}

function estimSheet() {
  const E = S.estim;
  return `<div class="row between"><h2>Journée oubliée</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    <p class="sm mut" style="margin-top:0">Tu n'as rien pesé ni noté aujourd'hui ? Mets ce que tu penses avoir mangé sur <b>toute la journée</b>. C'est marqué « estimation » dans ton journal. Pour repère, ton objectif est de ${targets().kcal} kcal.</p>
    <label class="sm">Calories de la journée<input type="number" inputmode="numeric" id="estK" value="${E.kcal || ""}" placeholder="ex : 2500" style="font-size:22px"></label>
    <div class="chips" style="margin:8px 0">${[1500, 1800, 2000, 2200, 2500, 2800, 3000, 3500, 4000].map(v => `<button class="chip ${+E.kcal === v ? "on" : ""}" data-act="estimQuick" data-v="${v}">${v}</button>`).join("")}</div>
    <label class="sm">Dont protéines (g, optionnel)<input type="number" inputmode="numeric" id="estP" value="${E.p || ""}" placeholder="laisser vide si tu ne sais pas"></label>
    <label class="sm">Description (optionnel)<input id="estN" value="${esc(E.name || "")}" placeholder="ex : journée chez mes parents, resto le soir"></label>
    <button style="width:100%;margin-top:14px" data-act="estimSave">Ajouter l'estimation de la journée</button>`;
}
