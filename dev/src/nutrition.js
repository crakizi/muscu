// ===================== CUISINE : plan de repas, idées, besoins, ajustement hebdo =====================
// ---- Repères officiels EFSA (Dietary Reference Values, summary report 2017, tableaux 2, 5 et 9 — homme adulte) ----
const DRV_MALE = [
  // [clé, nom, unité, valeur, type (PRI = apport de référence, AI = apport satisfaisant), sources alimentaires]
  ["calcium", "Calcium", "mg", 950, "PRI (≥ 25 ans)", "laitages, fromage, eaux minérales calciques, tofu, amandes"],
  ["iron", "Fer", "mg", 11, "PRI", "viande rouge, boudin, lentilles, pois chiches, épinards + vitamine C"],
  ["magnesium", "Magnésium", "mg", 350, "AI", "oléagineux, chocolat noir, céréales complètes, légumineuses"],
  ["potassium", "Potassium", "mg", 3500, "AI", "pommes de terre, bananes, légumineuses, tomates, yaourt"],
  ["zinc", "Zinc", "mg", 11.7, "PRI (phytates moyens)", "bœuf, œufs, fromage, graines de courge"],
  ["selenium", "Sélénium", "µg", 70, "AI", "noix du Brésil, thon, œufs, viande"],
  ["iodine", "Iode", "µg", 150, "AI", "sel iodé, laitages, œufs, poisson"],
  ["copper", "Cuivre", "mg", 1.6, "AI", "abats, cacao, noix, légumineuses"],
  ["phosphorus", "Phosphore", "mg", 550, "AI", "viande, laitages, œufs, céréales"],
  ["vitA", "Vitamine A", "µg", 750, "PRI", "carotte, patate douce, épinards, œufs, foie"],
  ["vitD", "Vitamine D", "µg", 15, "AI (peu de soleil)", "saumon, sardine, œufs, soleil ; souvent complément en hiver"],
  ["vitE", "Vitamine E", "mg", 13, "AI", "huile de tournesol, amandes, noisettes"],
  ["vitK", "Vitamine K", "µg", 70, "AI", "légumes verts (brocoli, épinards), salade"],
  ["vitC", "Vitamine C", "mg", 110, "PRI", "poivron, kiwi, agrumes, brocoli"],
  ["thiamin", "Vitamine B1", "mg", null, "PRI 0,1 mg/MJ", "porc, céréales complètes, légumineuses"],
  ["vitB2", "Vitamine B2", "mg", 1.6, "PRI", "laitages, œufs, viande"],
  ["niacin", "Vitamine B3", "mg", null, "PRI 1,6 mg/MJ", "volaille, thon, cacahuètes"],
  ["pantothenic", "Vitamine B5", "mg", 5, "AI", "presque tous les aliments"],
  ["vitB6", "Vitamine B6", "mg", 1.7, "PRI", "volaille, banane, pommes de terre, pois chiches"],
  ["biotin", "Vitamine B8", "µg", 40, "AI", "œufs, oléagineux"],
  ["folate", "Folates (B9)", "µg", 330, "PRI (DFE)", "légumes verts, lentilles, pois chiches"],
  ["vitB12", "Vitamine B12", "µg", 4, "AI", "viande, œufs, laitages, poisson"],
  ["choline", "Choline", "mg", 400, "AI", "œufs (≈ 150 mg/œuf), viande, soja"],
  ["omega3", "Oméga-3 EPA + DHA", "mg", 250, "AI", "saumon, sardine, maquereau ; complément d'huile de poisson"],
];
function drvValue(d, kcal) { if (d[3] != null) return d[3]; const mj = (kcal || 2500) * 0.004184; return d[0] === "thiamin" ? r1(0.1 * mj) : r1(1.6 * mj); }
// ---- ajustement automatique de l'objectif chaque lundi (méthode « dépense adaptative ») ----
function weekKey(d = new Date()) { const t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return dateKey(t); }
function weeklyAdjust(tdee, factor, ad) {
  const wk = weekKey(); const A = Store.get("adjust", {}) || {};
  if (A.week === wk && A.kcal) return A;
  const kcal = r0(tdee * (1 + factor));
  const N = { week: wk, kcal, tdee: r0(tdee), prev: A.kcal || null, slope: ad?.slopeWeek != null ? Math.round(ad.slopeWeek * 100) / 100 : null, hist: [...(A.hist || []), ...(A.kcal ? [[A.week, A.kcal]] : [])].slice(-12) };
  setTimeout(() => Store.set("adjust", N), 0); return N;
}
// ---- vue Cuisine ----
function viewKitchen() {
  const k = S.kTab || "frigo";
  const tabs = `<div class="chips" style="margin-bottom:10px">${[["frigo", "🧊 Frigo"], ["plan", "📅 Plan de repas"], ["idees", "💡 Idées recettes"], ["besoins", "📊 Mes besoins"]].map(([v, l]) => `<button class="chip ${k === v ? "on" : ""}" data-act="kTab" data-v="${v}">${l}</button>`).join("")}</div>`;
  if (k === "frigo") return viewFridge().replace(/(<\/h1>[\s\S]*?<\/div>)/, "$1" + tabs);
  const body = k === "plan" ? mealPlanHTML() : k === "idees" ? ideasHTML() : needsHTML();
  return `${statusBanner()}<h1>Cuisine</h1>${tabs}${body}`;
}
// ---- plan de repas (IA) ----
function mealPlanHTML() {
  const P = Store.get("mealplan", null); const o = S.mpOpt || (S.mpOpt = { days: 5, meals: 4, batch: true, time: 30, likes: "" });
  const T = targets();
  const form = `<div class="card"><h2>Plan de repas</h2><p class="sm mut">Construit sur tes cibles (${T.kcal} kcal · P ${T.p} g · G ${T.c} g · L ${T.f} g), ton frigo, tes magasins et ton matériel de cuisine.</p>
    <h3>Nombre de jours</h3><div class="chips">${[3, 5, 7].map(n => `<button class="chip ${o.days === n ? "on" : ""}" data-act="mpSet" data-k="days" data-v="${n}">${n} jours</button>`).join("")}</div>
    <h3>Repas par jour</h3><div class="chips">${[3, 4, 5].map(n => `<button class="chip ${o.meals === n ? "on" : ""}" data-act="mpSet" data-k="meals" data-v="${n}">${n}</button>`).join("")}</div>
    <h3>Temps de cuisine max par repas</h3><div class="chips">${[15, 30, 45].map(n => `<button class="chip ${o.time === n ? "on" : ""}" data-act="mpSet" data-k="time" data-v="${n}">${n} min</button>`).join("")}<button class="chip ${o.batch ? "on" : ""}" data-act="mpBatch">Batch cooking</button></div>
    <h3>Envies / à éviter (facultatif)</h3><input id="mpLikes" value="${esc(o.likes || "")}" placeholder="ex : plats espagnols, pas de champignons, budget serré…">
    <button style="width:100%;margin-top:10px" data-act="mpGo" ${S.busy.mp ? "disabled" : ""}>${S.busy.mp ? '<span class="spin"></span> Je prépare ton plan… (≈ 30 s)' : P ? "Refaire un plan" : "Créer mon plan"}</button></div>`;
  if (!P) return form;
  const today = (new Date().getDay() + 6) % 7;
  const days = P.days.map((d, di) => { const tot = d.meals.reduce((t, m) => ({ kcal: t.kcal + (+m.kcal || 0), p: t.p + (+m.p || 0) }), { kcal: 0, p: 0 });
    return `<details class="card" ${di === 0 ? "open" : ""}><summary><b>${esc(d.day)}</b> <span class="xs mut">· ${r0(tot.kcal)} kcal · P ${r0(tot.p)} g</span></summary>
      ${d.meals.map((m, mi) => `<div class="entry" style="align-items:flex-start"><div class="grow"><div class="xs mut">${esc(m.meal || "")}${m.prep_min ? ` · ${m.prep_min} min` : ""}</div><div class="b sm">${esc(m.name)}</div>
        <div class="xs mut">${r0(m.kcal)} kcal · P ${r0(m.p)} · G ${r0(m.c)} · L ${r0(m.f)}</div><div class="xs">${(m.ingredients || []).map(i => `${esc(i.name)} ${r0(i.g)} g`).join(" · ")}</div>
        ${m.steps ? `<details><summary class="xs" style="color:var(--acc)">Recette</summary><div class="xs" style="white-space:pre-wrap">${esc(m.steps)}</div></details>` : ""}</div>
        <button class="small sec" data-act="mpEat" data-d="${di}" data-m="${mi}">Mangé</button></div>`).join("")}</details>`; }).join("");
  const shop = (P.shopping || []).map(s => `<h3>${esc(s.aisle)}</h3>${(s.items || []).map(i => `<label class="row" style="gap:8px"><input type="checkbox" style="width:18px;height:18px"><span class="sm">${esc(i.name)} <span class="mut">${esc(i.qty || "")}</span></span></label>`).join("")}`).join("");
  return `${days}<div class="card"><h2>🛒 Liste de courses</h2>${shop || `<p class="mut sm">—</p>`}</div>${P.batch ? `<div class="card"><h2>🍱 Batch cooking</h2><div class="sm" style="white-space:pre-wrap">${esc(P.batch)}</div></div>` : ""}${form}`;
}
async function mealPlanGo() {
  const o = S.mpOpt; o.likes = $("#mpLikes")?.value || ""; const T = targets();
  S.busy.mp = true; render();
  try {
    const res = await aiJSON(`${USER_CTX()}
Crée un PLAN DE REPAS de ${o.days} jours, ${o.meals} repas par jour, qui atteint chaque jour ≈ ${T.kcal} kcal (±5 %), protéines ≥ ${T.p} g, glucides ≈ ${T.c} g, lipides ≈ ${T.f} g, fibres ≥ 25 g, et des légumes chaque jour (soupes, veloutés, poêlées de surgelés, sauces mixées).
Temps de cuisine max ${o.time} min par repas. ${o.batch ? "Organise-le en BATCH COOKING : 1 ou 2 sessions de cuisine (dimanche/mercredi) et des restes réutilisés." : ""} Utilise en priorité ce qu'il a : ${fridgeText() || "inconnu"}. Produits faciles à trouver chez Mercadona / Alcampo / Ahorramas. ${o.likes ? "Contraintes : " + o.likes + "." : ""}
Valeurs nutritionnelles réalistes (tables Ciqual/USDA), ingrédients pesés CRUS en grammes.
Réponds UNIQUEMENT en JSON : {"days":[{"day":"Lundi","meals":[{"meal":"Petit-déjeuner","name":"...","kcal":0,"p":0,"c":0,"f":0,"prep_min":10,"ingredients":[{"name":"flocons d'avoine","g":80}],"steps":"1. ... 2. ... (temps, feu/four °C)"}]}],"shopping":[{"aisle":"Viandes","items":[{"name":"blanc de poulet","qty":"1,2 kg"}]}],"batch":"plan de la session batch cooking, étape par étape"}`);
    if (!res?.days?.length) throw { message: "plan vide" };
    Store.set("mealplan", Object.assign(res, { created: Date.now(), opt: clone(o) }));
  } catch (e) { toast(aiErr(e)); }
  S.busy.mp = false; render();
}
// ---- idées de recettes (IA) ----
const IDEA_CATS = [["breakfast", "🥣 Petit-déj protéiné"], ["fast", "⚡ Prêt en 15 min"], ["batch", "🍱 Batch pour 4 jours"], ["veg", "🥦 Légumes sans effort"], ["sweet", "🍫 Dessert protéiné"], ["spain", "🇪🇸 Plats espagnols healthy"], ["cheap", "💶 Petit budget"], ["fridge", "🧊 Avec mon frigo"]];
function ideasHTML() {
  return `<div class="card"><h2>Idées de recettes</h2><p class="sm mut">Recettes « mode chef » adaptées à tes macros, ton matériel (four, poêle, casserole, micro-ondes, cuiseur à riz) et tes goûts.</p>
    <div class="chips">${IDEA_CATS.map(([k, l]) => `<button class="chip ${S.ideaCat === k ? "on" : ""}" data-act="ideaGo" data-v="${k}" ${S.busy.idea ? "disabled" : ""}>${l}</button>`).join("")}</div>
    ${S.busy.idea ? `<p class="sm"><span class="spin"></span> Le chef réfléchit…</p>` : ""}${S.aiOut.idea ? `<div class="ai-out">${esc(S.aiOut.idea)}</div><button class="sec small" data-act="ideaSave">Garder ces idées</button>` : ""}</div>
    ${(Store.get("notes", { items: [] }).items || []).length ? `<div class="card"><h2>Idées gardées</h2>${Store.get("notes").items.map(n => `<details><summary class="sm">${fmtDay(dateKey(new Date(n.t)))} — ${esc(n.text.split("\n").find(l => l.trim()) || "")}</summary><div class="xs" style="white-space:pre-wrap">${esc(n.text)}</div><button class="danger small" data-act="ideaDel" data-v="${n.id}">Supprimer</button></details>`).join("")}</div>` : ""}`;
}
async function ideaGo(cat) {
  const T = targets(); const L = Object.fromEntries(IDEA_CATS)[cat];
  S.ideaCat = cat; S.busy.idea = true; S.aiOut.idea = ""; render();
  try { await aiText(`${USER_CTX()}\nPropose 3 recettes différentes, catégorie : « ${L} »${cat === "fridge" ? " avec ce qu'il a : " + (fridgeText() || "inconnu") : ""}. Une portion doit tenir dans ses cibles (par repas ≈ ${r0(T.kcal / 4)} kcal et ≥ ${r0(T.p / 4)} g de protéines, sauf dessert ≈ 250 kcal / 20 g). ${CHEF_RULES}`, t => { S.aiOut.idea = t; }); }
  catch (e) { toast(aiErr(e)); }
  S.busy.idea = false; render();
}
// ---- besoins journaliers ----
function needsHTML() {
  const T = targets(); const p = profile(); const w = r1(T.weight); const t = dayTotals(S.day || todayKey());
  const row = (l, cur, goal, u, note) => { const pct = goal ? Math.min(100, cur / goal * 100) : 0; return `<div style="margin:8px 0"><div class="row between sm"><span><b>${l}</b> <span class="xs mut">${note || ""}</span></span><span>${cur != null ? r0(cur) + " / " : ""}${goal} ${u}</span></div>${cur != null ? `<div class="bar"><i style="width:${pct}%;background:${pct >= 100 ? "#16a34a" : "var(--acc)"}"></i></div>` : ""}</div>`; };
  const A = Store.get("adjust", null);
  return `<div class="card"><h2>Tes besoins du jour</h2>
    ${row("Énergie", t.kcal, T.kcal, "kcal", `· ${T.source}`)}
    ${row("Protéines", t.p, T.p, "g", `· ${p.protPerKg} g/kg × ${w} kg`)}
    ${row("Glucides", t.c, T.c, "g", "· le reste de l'énergie")}
    ${row("Lipides", t.f, T.f, "g", `· ≥ 20 % des kcal`)}
    ${row("Fibres", t.fib, 25, "g", "· EFSA ≥ 25 g")}
    ${row("Eau", null, 2.5, "L", "· EFSA, boissons + aliments")}
    <details style="margin-top:8px"><summary class="xs" style="color:var(--acc)">D'où viennent ces chiffres ?</summary><ul class="xs">
      <li><b>Protéines</b> : chez les pratiquants de musculation, le gain de masse maigre plafonne autour de 1,6 g/kg/j (méta-analyse de Morton et al. 2018, Br J Sports Med), avec une marge jusqu'à 2,2 g/kg. Tu es à ${p.protPerKg} g/kg (réglable dans Profil).</li>
      <li><b>Lipides</b> : EFSA 20-35 % de l'énergie ; je garde au moins ${p.fatPerKg} g/kg pour les hormones.</li>
      <li><b>Glucides</b> : EFSA 45-60 % de l'énergie ; ici c'est le reste une fois protéines et lipides placés, pour alimenter l'entraînement.</li>
      <li><b>Énergie</b> : Mifflin-St Jeor × activité, puis corrigée par tes vraies données (apports + évolution du poids).</li></ul></details></div>
    <div class="card"><h2>Ajustement automatique</h2>
      <label class="row" style="gap:10px"><input type="checkbox" data-act="autoAdj" ${p.autoAdjust !== false ? "checked" : ""} style="width:22px;height:22px"><span class="sm">Recalculer mon objectif chaque lundi</span></label>
      ${A ? `<p class="sm">Semaine du ${fmtDay(A.week)} : <b>${A.kcal} kcal/j</b>${A.prev ? ` (avant : ${A.prev})` : ""}. Dépense réelle estimée ≈ ${A.tdee} kcal${A.slope != null ? `, poids ${A.slope >= 0 ? "+" : ""}${A.slope} kg/sem` : ""}.</p>` : `<p class="sm mut">Il faut environ 10 jours de repas notés et 4 pesées pour lancer l'ajustement. En attendant, j'utilise la formule.</p>`}
      <p class="xs mut">Même principe que MacroFactor : ta vraie dépense = ce que tu manges − (variation de poids × 7 700 kcal/kg). L'objectif reste fixe toute la semaine pour éviter le yoyo.</p></div>
    <div class="card"><h2>Vitamines et minéraux</h2><p class="xs mut">Repères officiels EFSA pour un homme adulte (PRI = couvre 97,5 % des gens ; AI = apport jugé suffisant). Barre = ce que tu as mangé aujourd'hui (aliments dont la composition est connue).</p>
      ${DRV_MALE.map(d => { const v = drvValue(d, T.kcal); const cur = t.micro?.[d[0]]; return `<div style="margin:7px 0"><div class="row between sm"><span><b>${d[1]}</b> <span class="xs mut">${d[4]}</span></span><span>${cur != null ? r1(cur) + " / " : ""}${v} ${d[2]}</span></div>${cur != null ? `<div class="bar"><i style="width:${Math.min(100, cur / v * 100)}%;background:${cur >= v ? "#16a34a" : "var(--acc)"}"></i></div>` : ""}<div class="xs mut">${d[5]}</div></div>`; }).join("")}
      <p class="xs mut">Source : EFSA, Dietary Reference Values for nutrients — Summary report (2017, mis à jour), tableaux 2, 5 et 9. Sodium : l'OMS recommande moins de 5 g de sel/jour.</p></div>`;
}
const NUT_ACT = {
  kTab: el => { S.kTab = el.dataset.v; render(); },
  mpSet: el => { S.mpOpt.likes = $("#mpLikes")?.value || S.mpOpt.likes; S.mpOpt[el.dataset.k] = +el.dataset.v; render(); },
  mpBatch: () => { S.mpOpt.likes = $("#mpLikes")?.value || S.mpOpt.likes; S.mpOpt.batch = !S.mpOpt.batch; render(); },
  mpGo: () => mealPlanGo(),
  mpEat: el => { const P = Store.get("mealplan"); const m = P.days[+el.dataset.d].meals[+el.dataset.m]; const g = (m.ingredients || []).reduce((t, i) => t + (+i.g || 0), 0) || 100;
    const per100 = { kcal: m.kcal / g * 100, p: m.p / g * 100, c: m.c / g * 100, f: m.f / g * 100, fib: 0, sugar: 0, satfat: 0, salt: 0 };
    S.day = todayKey(); updDay(d => d.entries.push(makeEntry({ name: m.name, per100, src: "plan" }, g, m.meal || ""))); toast("Ajouté à aujourd'hui ✓"); },
  ideaGo: el => ideaGo(el.dataset.v),
  ideaSave: () => { const doc = clone(Store.get("notes", { items: [] })); doc.items = doc.items || []; doc.items.unshift({ id: uid(), t: Date.now(), text: S.aiOut.idea }); Store.set("notes", doc); toast("Idées gardées ✓"); },
  ideaDel: el => { const doc = clone(Store.get("notes", { items: [] })); doc.items = (doc.items || []).filter(n => n.id !== el.dataset.v); Store.set("notes", doc); },
  autoAdj: el => { const pr = clone(Store.get("profile", {})); pr.autoAdjust = el.checked; Store.set("profile", pr); },
};
