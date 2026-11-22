// ===================== NUTRITION — LOT 1 : type de jour, restant, repas, portion auto, ajout rapide, poids tendance =====================
// Contrat public (utilisé aussi par la Cuisine) : window.dayType(dateISO) et window.dayTargets(dateISO).
const DAY_TYPES = { muscu: ["🏋️", "Muscu"], sport: ["⚽", "Sport"], cardio: ["🏃", "Cardio"], repos: ["😌", "Repos"] };
const SPORT_ACTS = /foot|padel|tennis|basket|hand|rugby|volley|squash|badminton|autre/i; // sports collectifs / raquette → « sport »
const WT_ALPHA = 0.1; // lissage du poids (moyenne mobile exponentielle)
const MEAL_WEIGHTS_DEFAULT = { "Collation": 0.5 }; // poids relatif des repas (1 par défaut), réglable : profile.mealWeights
const nutCfg = () => { const p = profile(); return { on: p.cycleOn !== false, pct: p.cyclePct != null ? +p.cyclePct : 10, plan: Array.isArray(p.weekPlan) ? p.weekPlan : null }; };

// séances faites, indexées par date (une seule lecture par calcul)
function doneIndex() { const I = {}; (typeof workouts === "function" ? workouts() : []).forEach(w => { if (!w.start) return; const k = dateKey(new Date(w.start)); I[k] = true; }); return I; }
function actType(d) { const a = d.acts || []; if (!a.length) return null; return a.some(x => SPORT_ACTS.test(x.type || "")) ? "sport" : "cardio"; }
// type prévu : réglage « semaine type » du profil, sinon deviné sur les 4 dernières semaines
function plannedType(k, I) {
  const wd = (parseKey(k).getDay() + 6) % 7; const plan = nutCfg().plan;
  if (plan && plan[wd]) return plan[wd];
  const g = guessWeek(I); return g[wd];
}
function guessWeek(I) {
  I = I || doneIndex(); const cnt = [...Array(7)].map(() => ({ m: 0, s: 0, c: 0 })); const end = todayKey();
  for (let i = 1; i <= 28; i++) { const k = addDays(end, -i), wd = (parseKey(k).getDay() + 6) % 7; if (I[k]) cnt[wd].m++; else { const t = actType(day(k)); if (t === "sport") cnt[wd].s++; else if (t === "cardio") cnt[wd].c++; } }
  return cnt.map(c => c.m >= 2 ? "muscu" : c.s >= 2 ? "sport" : c.c >= 2 ? "cardio" : "repos");
}
function dayTypeInfo(k, I) {
  I = I || doneIndex(); const d = day(k);
  if (d.dayType && DAY_TYPES[d.dayType]) return { type: d.dayType, src: "manuel" };
  if (I[k]) return { type: "muscu", src: "fait" };
  const a = actType(d); if (a) return { type: a, src: "fait" };
  return { type: plannedType(k, I), src: "prévu" };
}
function dayType(k) { return dayTypeInfo(k || todayKey()).type; }
// Objectifs du jour : même moyenne sur la semaine (lun→dim) que l'objectif actuel, glucides déplacés vers les jours d'entraînement.
function dayTargets(k) {
  k = k || todayKey(); const T = targets(); const C = nutCfg(); const I = doneIndex();
  const type = dayTypeInfo(k, I).type;
  const base = { kcal: T.kcal, p: T.p, g: T.c, l: T.f, c: T.c, f: T.f, type, cycle: false };
  if (!C.on || !C.pct) return base;
  const e = Math.max(0, Math.min(30, C.pct)) / 100; const M = { muscu: 1 + e, sport: 1 + e, cardio: 1 + e / 2, repos: 1 - e };
  const ws = weekKey(parseKey(k)); let s = 0; for (let i = 0; i < 7; i++) s += M[dayTypeInfo(addDays(ws, i), I).type] || 1;
  const kcal = Math.max(T.p * 4 + T.f * 9, T.kcal * (M[type] || 1) / (s / 7));
  const c = Math.max(0, (kcal - T.p * 4 - T.f * 9) / 4);
  return { kcal: r0(kcal), p: T.p, g: r0(c), l: T.f, c: r0(c), f: T.f, type, cycle: true };
}
window.dayType = dayType; window.dayTargets = dayTargets;

// ---- pastille du type de jour (journal) ----
function dayTypePillHTML(k) {
  const D = dayTypeInfo(k); const [ic, l] = DAY_TYPES[D.type];
  const edit = S.dtEdit === k ? `<div class="chips" style="margin:6px 0 0">${[["", "Auto"], ...Object.entries(DAY_TYPES).map(([v, [i, n]]) => [v, i + " " + n])].map(([v, n]) => `<button class="chip ${(day(k).dayType || "") === v ? "on" : ""}" data-act="dtSet" data-v="${v}">${n}</button>`).join("")}</div>` : "";
  return `<div class="dtype"><button class="dtpill" data-act="dtEdit">${ic} Jour ${l.toLowerCase()} <span class="xs mut">· ${D.src}</span></button>${edit}</div>`;
}

// ---- anneaux « restant » : couleur fixe par macro, jamais de rouge ----
function ringN(val, max, color, size) {
  const r = size / 2 - (size > 80 ? 9 : 6), w = size > 80 ? 10 : 7, c = 2 * Math.PI * r, p = Math.min(1, max ? val / max : 0);
  return `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="var(--chip)" stroke-width="${w}" fill="none"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/></svg>`;
}
const leftTxt = (left, u) => left >= 0 ? `<div class="big">${r0(left)}</div><div class="xs mut">${u} restant${u === "kcal" ? "es" : "s"}</div>` : `<div class="big over">+${r0(-left)}</div><div class="xs mut">${u} en plus</div>`;
function remainHTML(t, T) {
  const mac = (lab, v, goal, col) => { const left = goal - v; return `<div class="mring"><div class="ring sm2">${ringN(v, goal, col, 60)}<div class="in">${left >= 0 ? `<b>${r0(left)}</b><span class="xs mut">g</span>` : `<b class="over">+${r0(-left)}</b><span class="xs mut">g</span>`}</div></div><div class="xs"><span class="dot" style="background:${col}"></span>${lab}</div><div class="xs mut">${r0(v)} / ${goal} g</div></div>`; };
  return `<div class="row" style="gap:14px;align-items:center">
    <div class="ring">${ringN(t.kcal, T.kcal, "var(--kc)", 118)}<div class="in">${leftTxt(T.kcal - t.kcal, "kcal")}</div></div>
    <div class="grow"><div class="xs mut" style="margin-bottom:6px">${r0(t.kcal)} / ${T.kcal} kcal${t.actKcal ? ` · sport +${r0(t.actKcal)} kcal` : ""}</div>
      <div class="mrings">${mac("Protéines", t.p, T.p, "var(--p)")}${mac("Glucides", t.c, T.c, "var(--c)")}${mac("Lipides", t.f, T.f, "var(--f)")}</div></div></div>`;
}

// ---- objectif par repas : les repas restants se partagent ce qui reste ----
function mealShares(k, T) {
  if (k < todayKey()) return {};
  T = T || dayTargets(k); const es = day(k).entries || []; const t = dayTotals(k);
  const W = Object.assign({}, MEAL_WEIGHTS_DEFAULT, profile().mealWeights || {});
  let last = -1; MEALS.forEach((m, i) => { if (es.some(e => e.meal === m)) last = i; });
  const rest = MEALS.filter((m, i) => i > last);
  const sw = rest.reduce((s, m) => s + (W[m] ?? 1), 0); if (!sw) return {};
  const lk = Math.max(0, T.kcal - t.kcal), lp = Math.max(0, T.p - t.p); const o = {};
  rest.forEach(m => { const f = (W[m] ?? 1) / sw; o[m] = { kcal: r0(lk * f), p: r0(lp * f) }; });
  return o;
}
const shareTxt = s => `≈ ${s.kcal} kcal · P ${s.p} g`;
function mealHintLine(k, T) { const M = mealShares(k, T); const ks = Object.keys(M); if (!ks.length || !ks.some(m => M[m].kcal)) return ""; return `<div class="mhint xs mut">Repas restants : ${ks.map(m => `${esc(m)} ${shareTxt(M[m])}`).join(" · ")}</div>`; }
function mealGroupsHTML(k, all, entryRow, T) {
  const M = mealShares(k, T);
  return ["", ...MEALS].map(m => { const es = all.filter(e => (e.meal || "") === m); if (!es.length && !(m && M[m])) return "";
    return `<div class="xs b mut" style="margin-top:10px">${esc(mealLabel(m))}${es.length ? ` · ${r0(es.reduce((s, e) => s + e.n.kcal, 0))} kcal` : ""}</div>` + (es.length ? es.map(entryRow).join("") : `<div class="mhint xs mut row between"><span>Objectif : ${shareTxt(M[m])}</span><button class="ghost small" data-act="openAdd" data-v="${esc(m)}">+ Ajouter</button></div>`); }).join("");
}

// ---- portion automatique (fiche d'ajout d'un aliment) ----
function portionGoalHTML(f) {
  const s = mealShares(S.day || todayKey())[S.add.meal]; const P = f.per100 || {};
  const same = S.add.pgFor === f.name; const mode = (same && S.add.pgMode) || (P.p >= 3 ? "p" : "kcal");
  const v = same && S.add.pgV != null ? S.add.pgV : (mode === "p" ? (s?.p || 30) : (s?.kcal || 400));
  return `<div class="pgoal row xs"><span class="mut">Pour</span><input id="pgV" type="number" inputmode="decimal" value="${v}"><div class="chips" style="margin:0">${P.p > 0 ? `<button class="chip ${mode === "p" ? "on" : ""}" data-act="pgGo" data-m="p">g de protéines</button>` : ""}${P.kcal > 0 ? `<button class="chip ${mode === "kcal" ? "on" : ""}" data-act="pgGo" data-m="kcal">kcal</button>` : ""}</div></div>`;
}

// ---- ajout rapide (kcal seules ou macros) ----
function quickAddHTML() {
  return `<p class="xs mut" style="margin-top:0">Pour un plat sans étiquette (kebab, resto…). Mets les kcal, ou seulement les macros : les kcal seront calculées (P×4 + G×4 + L×9).</p>
    <label>Nom</label><input id="qaN" placeholder="ex. kebab" autocomplete="off">
    <div class="qagrid"><div><label>Kcal</label><input id="qaK" type="number" inputmode="decimal" placeholder="auto"></div><div><label>Protéines (g)</label><input id="qaP" type="number" inputmode="decimal"></div><div><label>Glucides (g)</label><input id="qaC" type="number" inputmode="decimal"></div><div><label>Lipides (g)</label><input id="qaF" type="number" inputmode="decimal"></div></div>
    <button style="width:100%;margin-top:10px" data-act="qaSave">Ajouter</button>`;
}
function quickEntry(name, kcal, p, c, f, meal) {
  const per100 = { kcal, p, c, f, fib: 0, sugar: 0, satfat: 0, salt: 0 };
  return Object.assign(makeEntry({ name, per100, src: "rapide" }, 100, meal), { quick: true });
}

// ---- poids tendance (EMA) ----
function weightTrendAt(k) {
  k = k || todayKey(); let tr = null, raw = null, rawK = null;
  for (let i = 180; i >= 0; i--) { const x = addDays(k, -i), w = +(Store.get("d-" + x)?.weight || 0); if (w) { tr = tr == null ? w : tr + WT_ALPHA * (w - tr); raw = w; rawK = x; } }
  return { trend: tr == null ? null : r1(tr), raw, rawK };
}
function weightPillVal(d, k) { if (!d.weight) return ""; const W = weightTrendAt(k); return `${W.trend ?? r1(d.weight)} kg <span class="xs mut">tendance · pesée ${r1(d.weight)}</span>`; }
function weightLineHTML() { const W = weightTrendAt(); return W.trend == null ? "" : `<div class="row" style="gap:14px;align-items:baseline;margin-bottom:6px"><div><span class="big">${W.trend}</span> <span class="sm">kg</span><div class="xs mut">tendance lissée</div></div><div class="sm mut">dernière pesée : ${r1(W.raw)} kg<div class="xs">${fmtDay(W.rawK)}</div></div></div>`; }

// ---- réglages (profil) ----
function dayTypeCardHTML() {
  const C = nutCfg(); const g = guessWeek(); const L = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  return `<div class="card"><h2>Objectifs selon le jour</h2>
    <label class="row" style="gap:10px"><input type="checkbox" data-act="cycleOn" ${C.on ? "checked" : ""} style="width:22px;height:22px"><span class="sm">Adapter les kcal au type de jour (plus de glucides les jours d'entraînement)</span></label>
    <div class="row sm" style="gap:8px;margin-top:6px"><span>Écart</span><div class="chips" style="margin:0">${[5, 10, 15, 20].map(n => `<button class="chip ${C.pct === n ? "on" : ""}" data-act="cyclePct" data-v="${n}">±${n} %</button>`).join("")}</div></div>
    <h3>Semaine type</h3><p class="xs mut" style="margin-top:0">Sert quand la séance n'est pas encore faite. « Auto » = deviné sur tes 4 dernières semaines.</p>
    ${L.map((l, i) => { const cur = C.plan?.[i] || ""; return `<div class="row xs" style="gap:4px;margin:3px 0"><b style="width:34px">${l}</b>${[["", `Auto (${DAY_TYPES[g[i]][1].toLowerCase()})`], ...Object.entries(DAY_TYPES).map(([v, [ic]]) => [v, ic])].map(([v, n]) => `<button class="chip ${cur === v ? "on" : ""}" data-act="wkPlan" data-d="${i}" data-v="${v}">${n}</button>`).join("")}</div>`; }).join("")}
    <p class="xs mut">Protéines identiques tous les jours ; la moyenne de la semaine reste égale à ton objectif (et à l'ajustement du lundi).</p></div>`;
}
const setProf = fn => { const pr = clone(Store.get("profile", {})) || {}; fn(pr); Store.set("profile", pr); };
Object.assign(NUT_ACT, {
  dtEdit: () => { S.dtEdit = S.dtEdit === S.day ? null : S.day; render(); },
  dtSet: el => { updDay(d => { if (el.dataset.v) d.dayType = el.dataset.v; else delete d.dayType; }); S.dtEdit = null; render(); },
  cycleOn: el => setProf(p => p.cycleOn = el.checked),
  cyclePct: el => setProf(p => p.cyclePct = +el.dataset.v),
  wkPlan: el => setProf(p => { const a = Array.isArray(p.weekPlan) ? p.weekPlan.slice() : ["", "", "", "", "", "", ""]; a[+el.dataset.d] = el.dataset.v; p.weekPlan = a.some(Boolean) ? a : null; }),
  pgGo: el => { const f = S.add.sel; const m = el.dataset.m; const v = parseFloat($("#pgV")?.value); const per = +(f.per100?.[m] || 0); if (!(v > 0) || !per) return;
    S.add.pgMode = m; S.add.pgV = v; S.add.pgFor = f.name; S.add.g = Math.round(v / per * 100); renderSheet(); },
  qaSave: () => { const n = v => parseFloat(($(v)?.value || "").replace(",", ".")) || 0; const p = n("#qaP"), c = n("#qaC"), f = n("#qaF"); let k = n("#qaK");
    if (!k) k = p * 4 + c * 4 + f * 9; if (!k) { toast("Indique les kcal ou les macros"); return; }
    const name = ($("#qaN")?.value || "").trim() || "Ajout rapide";
    updDay(d => d.entries.push(quickEntry(name, r0(k), p, c, f, S.add.meal || ""))); toast(`${name} ajouté · ${r0(k)} kcal`); closeSheet(); },
});

// ===================== NUTRITION — LOT 2 : écran Aujourd'hui épuré =====================
// Un seul but : voir ce qui reste et noter ce qu'on mange. Le reste est replié.
function nutEntryRow(e) {
  return `<div class="entry" data-act="editEntry" data-v="${e.id}">${e.src === "plan" || e.src === "recette" ? dishImg(e.name, { size: "mini" }) : ""}<div class="grow"><div>${esc(e.name)}${e.brand ? ` <span class="mut xs">${esc(e.brand)}</span>` : ""}</div><div class="mut xs">${e.src === "estim" ? "estimation" : e.src === "rapide" ? "ajout rapide" : e.g + " g"} · P ${r0(e.n.p)} · G ${r0(e.n.c)} · L ${r0(e.n.f)}${e.meal ? " · " + esc(e.meal) : ""}</div></div><div class="b">${r0(e.n.kcal)}</div></div>`;
}
// suivi du jour : pastilles remplies seulement, les vides regroupées en une seule
function dailyStripN(d, k) {
  const p = profile(); const sport = (d.acts || []).reduce((t, a) => t + a.min, 0);
  const items = [["⚖️", weightPillVal(d, k), "poids"], ["👣", d.steps ? d.steps.toLocaleString("fr-FR") + " pas" : "", "pas"], ["😴", d.sleep ? d.sleep + " h" : "", "sommeil"], ["⚽", sport ? sport + " min" : "", "sport"], ...(p.moodTrack ? [["🙂", d.mood ? d.mood + "/5" : "", "humeur"]] : [])];
  const full = items.filter(i => i[1]), empty = items.filter(i => !i[1]);
  return `<div class="dstrip">${full.map(([ic, v]) => `<button class="dpill" data-act="openDaily">${ic} ${v}</button>`).join("")}${empty.length ? `<button class="dpill empty" data-act="openDaily">＋ ${empty.map(i => i[2]).join(", ")}</button>` : ""}</div>`;
}
// prochain repas seulement (au lieu de tous les repas restants)
function nextMealLine(k, T) { const M = mealShares(k, T); const m = Object.keys(M).find(x => M[x].kcal); return m ? `<div class="mhint xs mut">Prochain repas · ${esc(m)} ${shareTxt(M[m])}</div>` : ""; }
function viewTodayN() {
  const k = S.day, d = day(k), t = dayTotals(k), T = Object.assign(targets(), dayTargets(k)), today = todayKey();
  const all = (d.entries || []).slice().sort((x, y) => (y.t || 0) - (x.t || 0));
  const prevN = (day(addDays(k, -1)).entries || []).length;
  const sugarMax = r0(T.kcal * 0.1 / 4), satMax = r0(T.kcal * 0.1 / 9);
  const mini = (lab, v, ref, max) => `<span class="tag">${lab} ${r1(v)}/${ref} g</span>`;
  const micro = Object.keys(t.micro).length ? `<div class="chips" style="margin-top:6px">${Object.entries(MICRO_REFS).map(([m, [l, u, ref]]) => t.micro[m] != null ? `<span class="tag">${l} ${r0(t.micro[m])}/${ref} ${u}</span>` : "").join("")}</div>` : "";
  const more = all.length ? `<details class="nmore"><summary class="ghost small" aria-label="Plus d'options">⋯</summary><div class="nmore-in">
      <button class="chip" data-act="copyYesterday">↺ Copier hier</button>
      <button class="chip" data-act="byMeal" data-v="${S.byMeal ? 0 : 1}">${S.byMeal ? "Liste simple" : "Grouper par repas"}</button>
      <button class="chip" data-act="favMeal" data-v="__all">★ Enregistrer en favori</button></div></details>` : "";
  const list = !all.length
    ? `<p class="mut sm" style="margin:6px 0">${k > today ? "Jour à venir : tu peux déjà prévoir tes repas." : "Rien pour l'instant."}</p>
       ${prevN ? `<button class="sec" style="width:100%;margin:4px 0" data-act="copyYesterday">↺ Même chose qu'hier (${r0(dayTotals(addDays(k, -1)).kcal)} kcal)</button>` : ""}
       ${k <= today ? `<button class="ghost small" style="width:100%" data-act="estimOpen">Journée oubliée ? Estimer les kcal</button>` : ""}`
    : S.byMeal ? mealGroupsHTML(k, all, nutEntryRow, T) : all.map(nutEntryRow).join("") + nextMealLine(k, T);
  return `${statusBanner()}
  ${k === today ? `${onboardingHTML()}${checkinCardHTML()}${deloadAdvice() && !isDeload() ? deloadCardHTML() : ""}${bilans().length && bilanDue() ? `<button class="sec" style="width:100%;margin-bottom:8px" data-act="blOpen">📸 Bilan photo de la semaine</button>` : ""}` : ""}
  ${weekStripHTML(k)}
  ${k > today ? "" : dailyStripN(d, k)}
  ${dayTypePillHTML(k)}
  <div class="card" style="margin-top:4px">${remainHTML(t, T)}
    <details class="ndet"><summary class="xs mut">Fibres, sucres, sel…</summary><div class="chips" style="margin-top:6px">${mini("Fibres", t.fib, 30)}${mini("Sucres", t.sugar, sugarMax, 1)}${mini("Sel", t.salt, 5, 1)}${mini("Saturés", t.satfat, satMax, 1)}</div>${micro}</details>
    ${k === today ? `<button class="chip" style="margin-top:8px" data-act="aiFinish">💡 Que manger ensuite ?</button>` : ""}
    ${S.aiOut.today ? `<div class="ai-out">${aiRich(S.aiOut.today)}</div>` : ""}
  </div>
  <div class="card"><div class="row between"><h3 style="margin:0">Mangé <span class="mut sm">${r0(t.kcal)} kcal</span></h3><div class="row" style="gap:6px">${more}<button class="small" data-act="openAdd" data-v="">+ Ajouter</button></div></div>
    ${list}</div>`;
}
