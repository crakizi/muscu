// ===================== RECETTES PERSO =====================
const recipes = () => Store.get("recipes", { items: [] }).items || [];
function recipeTotals(r) {
  const t = { g: 0, n: {}, micro: {} };
  (r.ings || []).forEach(i => { t.g += +i.g || 0; NUTR_KEYS.forEach(k => t.n[k] = (t.n[k] || 0) + (i.per100?.[k] || 0) * (+i.g || 0) / 100);
    Object.entries(i.micro100 || {}).forEach(([m, v]) => t.micro[m] = (t.micro[m] || 0) + (+v || 0) * (+i.g || 0) / 100); });
  return t;
}
function recipeAsFood(r) {
  const t = recipeTotals(r); const g = r.cookedG || t.g || 1; const per100 = {}; NUTR_KEYS.forEach(k => per100[k] = (t.n[k] || 0) / g * 100);
  const micro100 = {}; Object.entries(t.micro).forEach(([m, v]) => micro100[m] = v / g * 100);
  return { name: r.name, per100, micro100, unit: Math.round(g / (r.portions || 1)), src: "recette", recipeId: r.id };
}
function recipesTabHTML() {
  const rs = recipes();
  return `<button class="sec" style="width:100%;margin-bottom:10px" data-act="recNew">+ Créer une recette</button>
    ${rs.length ? rs.map(r => { const f = recipeAsFood(r); return `<div class="entry"><div class="grow" data-act="recPick" data-v="${r.id}"><div class="b">${esc(r.name)}</div><div class="xs mut">${r.portions || 1} portion(s) · ${r0(f.per100.kcal * f.unit / 100)} kcal et P ${r0(f.per100.p * f.unit / 100)} g par portion</div></div><button class="ghost small" data-act="recEdit" data-v="${r.id}">✎</button></div>`; }).join("")
      : `<p class="mut sm">Aucune recette. Crée tes plats habituels une fois (ex. ton batch de riz-poulet), puis ajoute-les en 1 clic en choisissant le nombre de portions.</p>`}`;
}
function recipePortionSheet(id) {
  return () => {
    const r = recipes().find(x => x.id === id); if (!r) return ""; const f = recipeAsFood(r); const p = S.recPortions || 1; const g = Math.round(f.unit * p);
    return `<div class="row between"><h2>${esc(r.name)}</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
      <label>Nombre de portions</label><div class="stepper"><button data-act="recP" data-v="-0.5">−</button><input id="recPIn" type="number" step="0.5" value="${p}" data-input="recP"><button data-act="recP" data-v="0.5">+</button></div>
      <p class="sm" id="recPInfo"><b>${r0(f.per100.kcal * g / 100)} kcal</b> · P ${r1(f.per100.p * g / 100)} g · G ${r1(f.per100.c * g / 100)} g · L ${r1(f.per100.f * g / 100)} g · ${g} g</p>
      <button style="width:100%" data-act="recAdd" data-v="${id}">Ajouter à ma journée</button>`;
  };
}
function recipeEditSheet() {
  const R = S.rec; const t = recipeTotals(R); const res = R.q ? searchFoods(R.q).slice(0, 8) : []; S._recRes = res;
  return `<div class="row between"><h2>${R.id ? "Modifier" : "Nouvelle"} recette</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    <label>Nom</label><input id="recName" value="${esc(R.name)}" placeholder="ex. Batch riz poulet curry">
    <div class="row"><div class="grow"><label>Nombre de portions</label><input id="recPortions" type="number" step="1" value="${R.portions || 1}"></div><div class="grow"><label>Poids cuit total (g, facultatif)</label><input id="recCooked" type="number" value="${R.cookedG || ""}" placeholder="si tu pèses le plat fini"></div></div>
    <h3 style="margin-top:12px">Ingrédients (poids cru)</h3>
    ${(R.ings || []).map((i, k) => `<div class="entry"><div class="grow sm">${esc(i.name)}</div><input type="number" value="${r0(i.g)}" style="width:76px" data-input="recG" data-i="${k}"><span class="xs mut">g</span><button class="danger small" data-act="recDelIng" data-v="${k}">✕</button></div>`).join("") || `<p class="mut sm">Aucun ingrédient.</p>`}
    <p class="xs b">Total : ${r0(t.n.kcal || 0)} kcal · P ${r0(t.n.p || 0)} g · G ${r0(t.n.c || 0)} g · L ${r0(t.n.f || 0)} g · ${r0(t.g)} g</p>
    <input placeholder="Ajouter un ingrédient (ex. riz cru, poulet…)" value="${esc(R.q || "")}" data-input="recQ" autocomplete="off">
    <div id="recRes">${res.map((f, k) => `<div class="entry" data-act="recAddIng" data-i="${k}"><span class="sm">${esc(f.name)}</span><span class="mut">+</span></div>`).join("")}</div>
    <details style="margin-top:8px"><summary class="sm" style="color:var(--acc)">Ou décris la recette (IA)</summary><textarea id="recAi" placeholder="ex. 500 g de riz cru, 800 g de blanc de poulet, 1 brique de lait de coco, 2 c. à soupe de curry"></textarea><button class="small" style="margin-top:6px" data-act="recAiGo" ${S.busy.rec ? "disabled" : ""}>${S.busy.rec ? '<span class="spin"></span>' : "Analyser les ingrédients"}</button></details>
    <div class="row" style="margin-top:14px">${R.id ? `<button class="danger grow" data-act="recDel">Supprimer</button>` : ""}<button class="grow" data-act="recSave">Enregistrer la recette</button></div>`;
}
function saveRecipeFromForm() {
  const R = S.rec; R.name = ($("#recName")?.value || R.name || "").trim(); R.portions = Math.max(1, parseFloat($("#recPortions")?.value) || R.portions || 1); R.cookedG = parseFloat($("#recCooked")?.value) || null;
}
// ===================== COPIER UN AUTRE JOUR =====================
function copyDaySheet() {
  const k = S.copyFrom || addDays(S.day, -1); const es = day(k).entries || [];
  if (!S.copySel || S.copySelDay !== k) { S.copySel = es.map(() => true); S.copySelDay = k; }
  return `<div class="row between"><h2>Copier depuis un autre jour</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    <div class="row"><button class="sec small" data-act="copyNav" data-v="-1">‹</button><input type="date" id="copyDate" value="${k}" max="${todayKey()}" style="text-align:center"><button class="sec small" data-act="copyNav" data-v="1">›</button></div>
    ${es.length ? es.map((e, i) => `<label class="entry" style="cursor:pointer;margin:0;color:var(--txt);font-size:15px"><span><input type="checkbox" style="width:auto;margin-right:8px" data-act="copyChk" data-v="${i}" ${S.copySel[i] ? "checked" : ""}>${esc(e.name)} <span class="xs mut">${e.g} g${e.meal ? " · " + esc(e.meal) : ""}</span></span><span class="b">${r0(e.n.kcal)}</span></label>`).join("")
      : `<p class="mut sm">Rien de noté le ${fmtDay(k)}.</p>`}
    ${es.length ? `<button style="width:100%;margin-top:10px" data-act="copyGo">Copier ${S.copySel.filter(Boolean).length} aliment(s) vers ${S.day === todayKey() ? "aujourd'hui" : fmtDay(S.day)}</button>` : ""}`;
}
// ===================== RÉCUPÉRATION DES MUSCLES =====================
// Charge = séries dures (principal 1, secondaire 0,5) qui décroît avec le temps (récupération ~48-72 h selon le volume).
function muscleFatigue() {
  const now = Date.now(); const f = {}; Object.keys(MUSCLES).forEach(m => f[m] = 0);
  workouts().forEach(w => { const h = (now - (w.end || w.start)) / 3600000; if (h > 120 || w.live) return; const decay = Math.exp(-h / 30);
    (w.ex || []).forEach(e => { const n = workSets(e).length; if (!n) return; const x = getEx(e.id);
      x.prim.forEach(m => f[m] = (f[m] || 0) + n * decay); x.sec.forEach(m => f[m] = (f[m] || 0) + n * 0.5 * decay); }); });
  const rec = {}; Object.keys(f).forEach(m => rec[m] = Math.max(0, Math.min(1, 1 - f[m] / 6))); return rec; // 1 = récupéré
}
const recColor = r => r >= 0.85 ? "#22c55e" : r >= 0.6 ? "#eab308" : r >= 0.35 ? "#f97316" : "#ef4444";
function recoveryCardHTML() {
  const rec = muscleFatigue(); const colors = {}; Object.entries(rec).forEach(([m, r]) => colors[m] = recColor(r));
  const groupRec = {}; Object.entries(rec).forEach(([m, r]) => { const g = MUSCLES[m][1]; groupRec[g] = Math.min(groupRec[g] ?? 1, r); });
  const tired = Object.entries(groupRec).filter(([g, r]) => r < 0.6).sort((a, b) => a[1] - b[1]);
  const P = program(); const score = n => { const ids = (P[n]?.ex || []).flatMap(id => getEx(id).prim); return ids.length ? ids.reduce((s, m) => s + rec[m], 0) / ids.length : null; };
  const best = Object.keys(P).map(n => [n, score(n)]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1])[0];
  return `<div class="card"><h2>Récupération des muscles</h2>
    <div style="max-width:300px;margin:auto;cursor:pointer" data-act="bodyRecovery">${bodyThumbHTML({ colors })}</div>
    <div class="row" style="justify-content:center;gap:8px;margin-top:6px"><button class="sec small" data-act="bodyRecovery">Voir en 3D</button><button class="sec small" data-act="bodyAtlas">Anatomie 3D</button></div>
    <div class="row xs" style="gap:10px;justify-content:center;margin:6px 0"><span><b style="color:#22c55e">●</b> récupéré</span><span><b style="color:#eab308">●</b> presque</span><span><b style="color:#f97316">●</b> fatigué</span><span><b style="color:#ef4444">●</b> à reposer</span></div>
    ${tired.length ? `<p class="sm">À laisser reposer : <b>${tired.map(([g, r]) => `${g} (${Math.round(r * 100)} %)`).join(", ")}</b></p>` : `<p class="sm">Tous tes muscles sont récupérés 💪</p>`}
    ${best ? `<div class="reco good sm">Séance conseillée aujourd'hui : <b>${esc(best[0])}</b> (muscles récupérés à ${Math.round(best[1] * 100)} %)</div>` : ""}
    <p class="xs mut">Estimation à partir de tes séries des 5 derniers jours (muscle principal = 1 série, secondaire = ½) ; récupération d'environ 48 à 72 h selon le volume.</p></div>`;
}
const RECIPE_ACT = {
  recNew: () => { S.rec = { name: "", portions: 4, ings: [], q: "" }; openSheet(recipeEditSheet); },
  recEdit: el => { const r = recipes().find(x => x.id === el.dataset.v); if (!r) return; S.rec = Object.assign({ q: "" }, clone(r)); openSheet(recipeEditSheet); },
  recAddIng: el => { saveRecipeFromForm(); const f = S._recRes[+el.dataset.i]; S.rec.ings.push({ name: f.name, g: f.unit || 100, per100: f.per100, micro100: f.micro100 || null }); S.rec.q = ""; renderSheet(); },
  recDelIng: el => { saveRecipeFromForm(); S.rec.ings.splice(+el.dataset.v, 1); renderSheet(); },
  recAiGo: async () => { const txt = $("#recAi").value.trim(); if (!txt) return; saveRecipeFromForm(); S.busy.rec = true; renderSheet();
    try { const r = await aiMealText(txt + " (ingrédients CRUS d'une recette, donne les valeurs pour 100 g crus)"); itemsFromAI(r).forEach(x => S.rec.ings.push({ name: x.name, g: x.grams, per100: x.per100, micro100: x.micro100 })); } catch (e) { toast(aiErr(e)); }
    S.busy.rec = false; renderSheet(); },
  recSave: () => { saveRecipeFromForm(); const R = S.rec; if (!R.name || !R.ings.length) { toast("Donne un nom et au moins un ingrédient"); return; }
    const doc = clone(Store.get("recipes", { items: [] })); doc.items = doc.items || []; const item = { id: R.id || uid(), name: R.name, portions: R.portions, cookedG: R.cookedG, ings: R.ings };
    const i = doc.items.findIndex(x => x.id === item.id); if (i >= 0) doc.items[i] = item; else doc.items.unshift(item); Store.set("recipes", doc); toast("Recette enregistrée"); S.add.tab = "recipes"; openSheet(addSheet); },
  recDel: () => { const doc = clone(Store.get("recipes", { items: [] })); doc.items = (doc.items || []).filter(x => x.id !== S.rec.id); Store.set("recipes", doc); S.add.tab = "recipes"; openSheet(addSheet); },
  recPick: el => { S.recPortions = 1; openSheet(recipePortionSheet(el.dataset.v)); },
  recP: el => { S.recPortions = Math.max(0.5, (parseFloat($("#recPIn")?.value) || 1) + +el.dataset.v); renderSheet(); },
  recAdd: el => { const r = recipes().find(x => x.id === el.dataset.v); if (!r) return; const f = recipeAsFood(r); const p = parseFloat($("#recPIn")?.value) || S.recPortions || 1; const g = f.unit * p;
    updDay(d => d.entries.push(makeEntry(f, g, S.add?.meal || ""))); const frac = g / (r.cookedG || recipeTotals(r).g || g); (r.ings || []).forEach(i => fridgeConsume(i.name, i.g * frac));
    toast(`${r.name} ajouté (${p} portion${p > 1 ? "s" : ""})`); closeSheet(); },
  copyOpen: () => { S.copyFrom = addDays(S.day, -1); S.copySel = null; openSheet(copyDaySheet); },
  copyNav: el => { const k = addDays(S.copyFrom || addDays(S.day, -1), +el.dataset.v); if (k > todayKey()) return; S.copyFrom = k; S.copySel = null; renderSheet(); },
  copyGo: () => { const es = (day(S.copyFrom).entries || []).filter((e, i) => S.copySel[i]); updDay(d => es.forEach(e => d.entries.push(Object.assign(clone(e), { id: uid(), t: Date.now() })))); toast(`${es.length} aliment(s) copié(s)`); closeSheet(); }
};
