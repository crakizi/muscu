// ===================== ACTIONS =====================
function updDay(fn) { const d = clone(day(S.day)); d.entries = d.entries || []; d.acts = d.acts || []; fn(d); saveDay(S.day, d); }
function updW(fn) { const w = liveWorkout(); if (!w) return; const id = w._id; const o = clone(Store.get(id)); fn(o); Store.set(id, o); }
let _searchRes = [];
function resetAdd(meal) { S.add = { tab: S.add?.tab || "search", meal: meal || "", q: "", sel: null, g: 100, items: null, busy: false, note: "", img: null, blob: null, scan: null, err: "" }; }
function aiErr(e) { if (e?.code === "no_key" || e?.code === "offline") return e.message; return e?.code === "not_granted" ? "L'IA n'est pas autorisée ou pas disponible ici (ouvre l'app depuis claude.ai et accepte la demande)." : e?.code === "rate_limited" ? "Trop de demandes à l'IA, réessaie dans une minute." : "Erreur IA : " + (e?.message || e?.code || "inconnue"); }
function itemsFromAI(res) {
  return (res?.items || []).filter(x => x && x.name).map(x => ({ name: x.name, grams: +x.grams || 100, per100: Object.fromEntries(NUTR_KEYS.map(k => [k, +x.per100?.[k] || 0])), micro100: x.micro100 || null, confidence: x.confidence || "" }));
}
function scheduleTimer() { clearInterval(window._wt); window._wt = setInterval(() => { const w = liveWorkout(); const el = $("#wTimer"); if (w && el) el.textContent = fmtDur(Date.now() - w.start); }, 1000); }

const CHEF_RULES = `Tu es un chef cuisinier pédagogue ET un nutritionniste. Pour chaque recette donne : 1) les ingrédients PESÉS en grammes (poids CRU, en précisant cru/cuit), 2) le matériel (poêle, four, casserole, airfryer…), 3) les étapes numérotées avec durées précises, feu (doux/moyen/vif) ou four (température en °C, chaleur tournante ou statique, préchauffage, position de la grille), 4) les repères de cuisson (température à cœur : poulet 74 °C, porc 63 °C ; couleur, texture), 5) les erreurs à éviter et une astuce de chef, 6) kcal et macros de SA portion. Pas de markdown lourd, français, précis. ${DISH_RULE}`;
const ACT = {
  tab: el => { S.tab = el.dataset.v; S.sheet = null; window.scrollTo(0, 0); render(); },
  closeSheet: () => closeSheet(),
  closeSheetBg: (el, ev) => { if (ev.target === el) closeSheet(); },
  dayNav: el => { S.day = addDays(S.day, +el.dataset.v); if (S.day > maxPlanDay()) S.day = maxPlanDay(); S.aiOut.today = ""; render(); },
  dayGo: el => { S.day = el.dataset.v; S.aiOut.today = ""; if (S.sheet) closeSheet(); render(); },
  weekSheet: () => openSheet(weekSheet),
  gymFull: () => { S.gymFull = !S.gymFull; render(); },
  estimOpen: () => { S.estim = { meal: "" }; openSheet(estimSheet); },
  estimQuick: el => { S.estim.kcal = +el.dataset.v; S.estim.p = $("#estP").value; S.estim.name = $("#estN").value; renderSheet(); },
  estimSave: () => { const kcal = +$("#estK").value; if (!kcal) { toast("Indique les calories"); return; }
    const T = targets(); let p = +$("#estP").value || 0; if (!p) p = kcal * (T.p * 4 / T.kcal) / 4;
    const rest = Math.max(0, kcal - p * 4), cs = T.c * 4 / (T.c * 4 + T.f * 9 || 1);
    const per100 = { kcal, p: r1(p), c: r1(rest * cs / 4), f: r1(rest * (1 - cs) / 9), fib: 0, sugar: 0, satfat: 0, salt: 0 };
    updDay(d => d.entries.push(makeEntry({ name: "Estimation de la journée" + ($("#estN").value.trim() ? " · " + $("#estN").value.trim() : ""), per100, src: "estim" }, 100, "")));
    closeSheet(); toast("Estimation ajoutée"); render(); },
  copyYesterday: () => { const es = day(addDays(S.day, -1)).entries || []; if (!es.length) { toast("Rien de noté la veille"); return; } updDay(d => es.forEach(e => d.entries.push(Object.assign(clone(e), { id: uid(), t: Date.now() })))); toast(`${es.length} aliment(s) copiés d'hier`); render(); },
  // ----- ajout repas
  openAdd: el => { S.sheet = null; resetAdd(el.dataset.v || defaultMeal()); openSheet(addSheet); },
  addMeal: el => { S.add.meal = el.dataset.v; renderSheet(); },
  addTab: el => { S.add.tab = el.dataset.v; S.add.err = ""; S.add.img = null; S.add.blob = null; S.add.scan = null; renderSheet(); },
  selFood: el => { const f = _searchRes[+el.dataset.i]; S.add.sel = f; S.add.g = f.lastG || f.unit || 100; S.add.baseG = S.add.g; renderSheet(); },
  offSearch: async () => { S.add.offBusy = true; renderSheet(); const res = await offSearch(S.add.q); S.add.offBusy = false;
    if (!res.length) { toast("Rien trouvé en ligne"); renderSheet(); return; }
    S.add.offRes = res; _searchRes = res; $("#qres").innerHTML = foodList(res); $$(".sheet button[data-act=offSearch]").forEach(b => b.remove()); },
  selBack: () => { S.add.sel = null; renderSheet(); },
  gStep: el => { S.add.g = Math.max(0, (+S.add.g || 0) + +el.dataset.v); renderSheet(); },
  gSet: el => { S.add.g = +el.dataset.v; S.add.baseG = +el.dataset.v; renderSheet(); },
  gMul: el => { S.add.g = Math.round((S.add.baseG || +S.add.g || 100) * +el.dataset.v); renderSheet(); },
  selAdd: () => { const g = +($("#gIn")?.value || S.add.g); if (!g) return; const f = S.add.sel; if (f.src === "off" && !myFoods()["bc" + f.barcode]) saveMyFood(f); updDay(d => d.entries.push(makeEntry(f, g, S.add.meal))); const fx = fridgeConsume(f.name, g); toast(`${f.name} ajouté${fx ? " · retiré du frigo" : ""}`); S.add.sel = null; S.add.q = ""; closeSheet(); },
  aiText: async () => {
    const txt = $("#iaTxt").value.trim(); if (!txt) return; S.add.note = txt; S.add.busy = true; S.add.err = ""; renderSheet();
    try { const res = await aiMealText(txt); S.add.items = itemsFromAI(res); S.add.aiNote = res?.note || ""; if (!S.add.items.length) S.add.err = "Rien de reconnu, reformule."; }
    catch (e) { S.add.err = aiErr(e); }
    S.add.busy = false; renderSheet();
  },
  aiPhoto: async () => {
    S.add.note = $("#photoNote")?.value || ""; S.add.busy = true; S.add.err = ""; renderSheet();
    try { const res = await aiMealPhoto(S.add.blob, S.add.note); S.add.items = itemsFromAI(res); S.add.aiNote = res?.note || ""; if (!S.add.items.length) S.add.err = "Aucun aliment reconnu sur la photo."; }
    catch (e) { S.add.err = aiErr(e); }
    S.add.busy = false; renderSheet();
  },
  delItem: el => { S.add.items.splice(+el.dataset.v, 1); if (!S.add.items.length) S.add.items = null; renderSheet(); },
  itemsCancel: () => { S.add.items = null; renderSheet(); },
  itemsAdd: () => {
    const save = $("#saveFoods")?.checked;
    updDay(d => S.add.items.forEach(x => { const f = { name: x.name, per100: x.per100, micro100: x.micro100, src: "ia" }; d.entries.push(makeEntry(f, x.grams, S.add.meal)); }));
    if (save) S.add.items.forEach(x => { if (!allFoods().some(f => f.name.toLowerCase() === x.name.toLowerCase())) saveMyFood({ name: x.name, per100: x.per100, micro100: x.micro100, unit: r0(x.grams) }); });
    const out = S.add.items.filter(x => fridgeConsume(x.name, x.grams)).length;
    toast(`${S.add.items.length} aliment(s) ajouté(s)${out ? ` · ${out} retiré(s) du frigo` : ""}`); S.add.items = null; closeSheet();
  },
  scanHub: () => Scanner.open(code => { resetAdd(defaultMeal()); S.add.tab = "scan"; openSheet(addSheet); handleBarcode(code); }, "Scanne un code-barres, ou choisis une photo", true),
  scanLive: () => Scanner.open(code => { S.add.tab = "scan"; if (!S.sheet) openSheet(addSheet); handleBarcode(code); }),
  fridgeScan: () => Scanner.open(async code => { let f = myFoods()["bc" + code]; if (!f) { toast("Recherche du produit…"); f = await offBarcode(code); if (f) f = saveMyFood(f); }
    if (!f) { toast("Produit inconnu : prends l'étiquette en photo"); S.fq = ""; openSheet(fridgeAddSheet); return; } S._fpick = f; openSheet(fridgeQtySheet(f)); }, "Scanne un produit pour ton frigo"),
  bcManual: () => { const v = ($("#bcManual").value || "").replace(/\D/g, ""); if (v) handleBarcode(v); },
  // ----- entrées
  editEntry: el => openSheet(editEntrySheet(el.dataset.v)),
  saveEntry: el => { const g = +$("#eg").value, m = $("#em").value; updDay(d => { const e = d.entries.find(x => x.id === el.dataset.v); if (e && g > 0) { const ne = makeEntry(e, g, m); ne.id = e.id; ne.src = e.src; ne.brand = e.brand; Object.assign(e, ne); } }); closeSheet(); },
  delEntry: el => { updDay(d => d.entries = d.entries.filter(x => x.id !== el.dataset.v)); closeSheet(); },
  entryToFood: el => { const e = day(S.day).entries.find(x => x.id === el.dataset.v); if (e) { saveMyFood({ name: e.name, brand: e.brand, per100: e.per100, micro100: e.micro100, unit: e.g }); toast("Ajouté à mes aliments"); } },
  byMeal: el => { S.byMeal = el.dataset.v === "1"; render(); },
  favMeal: el => {
    const es = day(S.day).entries.filter(e => el.dataset.v === "__all" || e.meal === el.dataset.v); if (!es.length) return;
    openSheet(() => `<h2>Enregistrer en favori</h2><input id="favName" value="${esc(es.map(e => e.name).slice(0, 3).join(", "))}"><div class="row" style="margin-top:10px"><button class="sec grow" data-act="closeSheet">Annuler</button><button class="grow" data-act="favSave" data-v="${el.dataset.v}">Enregistrer</button></div>`);
  },
  favSave: el => { const es = day(S.day).entries.filter(e => el.dataset.v === "__all" || e.meal === el.dataset.v); const doc = clone(Store.get("favs", { items: [] })); doc.items = doc.items || [];
    doc.items.unshift({ id: uid(), name: $("#favName").value || "Favori", entries: es.map(e => ({ name: e.name, brand: e.brand, g: e.g, per100: e.per100, micro100: e.micro100, unit: e.unit })) }); Store.set("favs", doc); toast("Favori enregistré"); closeSheet(); },
  addFav: el => { const f = (Store.get("favs", { items: [] }).items || []).find(x => x.id === el.dataset.v); if (!f) return; updDay(d => f.entries.forEach(e => d.entries.push(makeEntry(e, e.g, S.add.meal)))); f.entries.forEach(e => fridgeConsume(e.name, e.g)); toast("Favori ajouté"); closeSheet(); },
  delFav: el => { const doc = clone(Store.get("favs", { items: [] })); doc.items = (doc.items || []).filter(x => x.id !== el.dataset.v); Store.set("favs", doc); renderSheet(); },
  // ----- suivi du jour
  openDaily: () => openSheet(dailySheet),
  saveDaily: () => { updDay(d => { const w = parseFloat($("#inW").value), st = parseInt($("#inSteps").value), sl = parseFloat($("#inSleep").value); d.weight = w > 0 ? w : null; d.steps = st > 0 ? st : null; d.sleep = sl > 0 ? sl : null; }); toast("Enregistré"); if (S.sheet === dailySheet) closeSheet(); },
  setScale: el => { updDay(d => d[el.dataset.k] = d[el.dataset.k] === +el.dataset.v ? null : +el.dataset.v); if (S.sheet) renderSheet(); },
  addAct: () => { const type = $("#actType").value, min = +$("#actMin").value; if (!min) return; const kcal = ACTIVITIES[type] * latestWeight() * min / 60 * 0.85; updDay(d => d.acts.push({ type, min, kcal })); if (S.sheet) renderSheet(); },
  delAct: el => { updDay(d => d.acts.splice(+el.dataset.v, 1)); if (S.sheet) renderSheet(); },
  toggleIncomplete: el => updDay(d => d.incomplete = el.checked),
  aiFinish: async () => {
    const t = dayTotals(S.day), T = tDay(S.day); const eaten = day(S.day).entries.map(e => `${e.meal}: ${e.name} ${e.g} g`).join("; ") || "rien";
    S.aiOut.today = "…"; render();
    try { await aiText(`${USER_CTX()}\nAujourd'hui il a déjà mangé : ${eaten}. Total : ${r0(t.kcal)} kcal, P ${r0(t.p)} g, G ${r0(t.c)} g, L ${r0(t.f)} g, fibres ${r0(t.fib)} g. Il est ${new Date().getHours()} h.\nIl lui reste : ${r0(T.kcal - t.kcal)} kcal, P ${r0(T.p - t.p)} g, G ${r0(T.c - t.c)} g, L ${r0(T.f - t.f)} g.\nCe qu'il a dans son frigo/placard : ${fridgeText() || "inconnu"}. Propose 2 options concrètes pour finir la journée, en privilégiant ce qu'il a déjà. ${CHEF_RULES} Si le budget est déjà dépassé, dis-le simplement et propose comment compenser demain sans extrême. Réponds en français, court, sans markdown lourd.`, txt => { S.aiOut.today = txt; const o = $(".ai-out"); if (o) o.textContent = txt; }); }
    catch (e) { S.aiOut.today = aiErr(e); } render();
  },
  aiFridge: () => openSheet(() => `<div class="row between"><h2>Recette avec ce que j'ai</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    ${fridgeItems().length ? `<p class="xs mut">Inventaire du frigo pris en compte automatiquement : ${esc(fridgeText())}</p>` : ""}<label>Autres choses que tu as (optionnel)</label><textarea id="fridge">${esc(Store.get("fridge", {}).txt || "")}</textarea>
    <label class="row" style="gap:6px"><input type="checkbox" id="fridgeKeep" style="width:auto" checked> Garder cette note</label>
    <button style="width:100%;margin-top:8px" data-act="aiFridgeGo" ${S.busy.fridge ? "disabled" : ""}>${S.busy.fridge ? '<span class="spin"></span>' : "Trouver une recette"}</button>${S.aiOut.fridge ? `<div class="ai-out" id="fridgeOut">${aiRich(S.aiOut.fridge)}</div>` : `<div id="fridgeOut"></div>`}`),
  aiFridgeGo: async () => {
    const txt = $("#fridge").value.trim(); if (!txt && !fridgeItems().length) return; if ($("#fridgeKeep").checked) Store.set("fridge", Object.assign(clone(fridgeDoc()) || {}, { txt }));
    const t = dayTotals(S.day), T = tDay(S.day); S.busy.fridge = true; S.aiOut.fridge = ""; renderSheet();
    try { await aiText(`${USER_CTX()}\nIl a chez lui : ${txt}${fridgeText() ? ". Inventaire de son frigo : " + fridgeText() : ""}.\nIl lui reste aujourd'hui ${r0(T.kcal - t.kcal)} kcal et ${r0(T.p - t.p)} g de protéines.\nPropose 1 à 2 recettes faites avec ces ingrédients (il peut manquer au plus 1-2 basiques : sel, épices, huile), qui intègrent des légumes sans effort. ${CHEF_RULES} Ajoute à la fin la version batch pour 3-4 jours (quantités ×, conservation au frigo/congélateur, réchauffage).`, txt2 => { S.aiOut.fridge = txt2; const o = $("#fridgeOut"); if (o) { o.className = "ai-out"; o.textContent = txt2; } }); }
    catch (e) { S.aiOut.fridge = aiErr(e); }
    S.busy.fridge = false; renderSheet();
  },
  // ----- séance
  startW: el => { const n = el.dataset.v; const P = program()[n] || { ex: [] }; const id = "w-" + Date.now(); S.draft = {}; S.warmOpen = !!P.warmup;
    Store.set(id, { live: true, name: n, start: Date.now(), ex: P.ex.map(e => ({ id: e, sets: [] })), warm: {}, notes: "" }); scheduleTimer(); },
  toggleWarm: () => { S.warmOpen = !S.warmOpen; render(); },
  warmChk: el => updW(w => { w.warm = w.warm || {}; w.warm[el.dataset.v] = el.checked; }),
  showMusc: el => { S.bodyEx = el.dataset.v; openSheet(exMuscleSheet(el.dataset.v)); },
  dStep: el => { const i = +el.dataset.i, k = el.dataset.k; const dr = S.draft[i]; const inp = $(`input[data-input=draft][data-i="${i}"][data-k="${k}"]`); let cur = parseFloat(inp?.value); if (isNaN(cur)) cur = k === "r" ? repRange(liveWorkout().ex[i].id)[1] - +el.dataset.v : 0; dr[k] = Math.max(0, r1(cur + +el.dataset.v)); render(); },
  dRir: el => { const dr = S.draft[+el.dataset.i]; const v = +el.dataset.v; dr.rir = dr.rir === v ? null : v; dr.wu = false; render(); },
  dWu: el => { const dr = S.draft[+el.dataset.i]; dr.wu = !dr.wu; render(); },
  exDone: el => { const i = +el.dataset.i; updW(w => { w.ex[i].done = true; }); setTimeout(() => { const n = document.querySelectorAll("#app .card")[0]; const nx = [...document.querySelectorAll('[data-act="logSet"]')][0]; if (nx) nx.closest(".card").scrollIntoView({ behavior: "smooth", block: "start" }); }, 80); },
  exReopen: el => { const i = +el.dataset.i; updW(w => { w.ex[i].done = false; }); },
  logSet: el => {
    const i = +el.dataset.i; const dr = S.draft[i];
    const wv = parseFloat($(`input[data-input=draft][data-i="${i}"][data-k="w"]`).value), rv = parseInt($(`input[data-input=draft][data-i="${i}"][data-k="r"]`).value);
    if (!(rv > 0) || isNaN(wv)) { toast("Indique la charge et les reps"); return; }
    dr.w = wv; dr.r = dr.wu ? "" : rv; const rirDone = dr.rir; dr.rir = null; restStart(liveWorkout().ex[i].id, !!dr.wu);
    updW(w => w.ex[i].sets.push({ w: wv, r: rv, rir: dr.wu ? null : rirDone ?? null, wu: !!dr.wu, t: Date.now() }));
    if (dr.wu) dr.wu = false;
    const h = exerciseHistory(liveWorkout().ex[i].id, liveWorkout()._id); const best = h.flatMap(x => x.sets).reduce((b, s) => Math.max(b, e1rm(s)), 0);
    if (!dr.wu && best && e1rm({ w: wv, r: rv }) > best) toast("🏆 Nouveau record (1RM estimé) !");
  },
  delSet: el => updW(w => w.ex[+el.dataset.i].sets.splice(+el.dataset.j, 1)),
  rmEx: el => { const i = +el.dataset.i; updW(w => w.ex.splice(i, 1)); S.draft = {}; },
  exUp: el => { const i = +el.dataset.i; if (!i) return; updW(w => { const t = w.ex[i]; w.ex[i] = w.ex[i - 1]; w.ex[i - 1] = t; }); S.draft = {}; },
  swapEx: el => openSheet(exPickerSheet("swap", +el.dataset.i)),
  addEx: () => { S.exQ = ""; openSheet(exPickerSheet("add")); },
  pickEx: el => { const id = el.dataset.v; if (el.dataset.mode === "swap") { const i = +el.dataset.i; updW(w => { w.ex[i].id = id; }); delete S.draft[i]; } else updW(w => w.ex.push({ id, sets: [] })); closeSheet(); },
  createEx: () => { const name = $("#newExName").value.trim(); if (!name) return; const m = $("#newExMuscle").value; const id = "c_" + uid();
    const doc = clone(Store.get("program", {})); doc.customEx = doc.customEx || {}; doc.customEx[id] = { id, name, cat: "Mes exercices", prim: [m], sec: [], focus: [m] }; Store.set("program", doc);
    updW(w => w.ex.push({ id, sets: [] })); closeSheet(); },
  finishW: () => { const notes = $("#wNotes")?.value || ""; updW(w => { w.live = false; w.end = Date.now(); w.notes = notes; w.ex = w.ex.filter(e => (e.sets || []).length); }); clearInterval(window._wt); S.draft = {}; restStop(); const lw = workouts().find(x => !x.live && x.end); toast("Séance enregistrée 💪" + (lw ? ` · ≈ ${r0(workoutKcal(lw))} kcal` : "")); },
  cancelW: () => openSheet(() => `<h2>Abandonner la séance ?</h2><p class="sm mut">Les séries notées seront supprimées.</p><div class="row"><button class="sec grow" data-act="closeSheet">Non</button><button class="grow" style="background:var(--red)" data-act="cancelWok">Oui, supprimer</button></div>`),
  cancelWok: () => { const w = liveWorkout(); if (w) Store.del(w._id); S.draft = {}; closeSheet(); },
  openHist: el => openSheet(histSheet(el.dataset.v)),
  delW: el => { Store.del(el.dataset.v); closeSheet(); },
  cam: el => { const S3 = V3.scenes[el.dataset.k]; if (S3) camMove(S3, el.dataset.v); },
  wMode: el => { S.wMode = el.dataset.v; render(); },
  gymPickEx: el => {
    const id = el.dataset.v; let w = liveWorkout();
    if (!w) { const wid = "w-" + Date.now(); Store.set(wid, { live: true, name: "Séance", start: Date.now(), ex: [], warm: {}, notes: "" }); scheduleTimer(); w = liveWorkout(); }
    if (!(w.ex || []).some(e => e.id === id)) updW(o => o.ex.push({ id, sets: [] }));
    openSheet(gymExSheet(id));
  },
  // ----- frigo
  fridgeEdit: el => openSheet(fridgeItemSheet(el.dataset.v)),
  fridgeSave: el => { const items = clone(fridgeDoc().items || []); const it = items.find(i => i.id === el.dataset.v); if (!it) return;
    it.qty = parseFloat($("#fiQ").value) || 0; it.unit = $("#fiU").value; it.gPerPc = parseFloat($("#fiP").value) || null; it.zone = $("#fiZ").value; it.cat = $("#fiC").value; if ($("#fiE")) it.exp = $("#fiE").value || null;
    saveFridgeItems(items.filter(i => i.qty > 0)); closeSheet(); },
  fridgeDel: el => { saveFridgeItems((fridgeDoc().items || []).filter(i => i.id !== el.dataset.v)); closeSheet(); },
  fridgeEat: el => openSheet(fridgeEatSheet(el.dataset.v)),
  fridgeEatGo: async el => {
    const it = (fridgeDoc().items || []).find(i => i.id === el.dataset.v); if (!it) return; const g = parseFloat($("#feG").value); const meal = $("#feM").value; if (!(g > 0)) return;
    let food = it.per100 ? { name: it.name, per100: it.per100, micro100: it.micro100, src: "frigo" } : allFoods().find(f => normN(f.name) === normN(it.name));
    if (!food) { S.busy.eat = true; renderSheet(); try { const r = await aiMealText(`${g} g de ${it.name}`); const x = itemsFromAI(r)[0]; if (x) food = { name: it.name, per100: x.per100, micro100: x.micro100, src: "ia" }; } catch (e) { toast(aiErr(e)); } S.busy.eat = false; }
    if (!food) { renderSheet(); return; }
    const k = todayKey(); const d = clone(day(k)); d.entries = d.entries || []; d.acts = d.acts || []; d.entries.push(makeEntry(food, g, meal)); saveDay(k, d);
    fridgeConsume(it.name, g); toast(`${it.name} : ${r0(g)} g ajouté au journal`); closeSheet(); },
  fridgeAddOpen: () => { S.fq = ""; openSheet(fridgeAddSheet); },
  fridgePick: el => { const i = +el.dataset.i; const f = i < 0 ? { name: S.fq } : S._fres[i]; S._fpick = f; openSheet(fridgeQtySheet(f)); },
  fridgeQtyGo: () => { const f = S._fpick; const q = parseFloat($("#fqQ").value); if (!(q > 0)) return;
    fridgeAdd([{ name: f.name, qty: q, unit: $("#fqU").value, gPerPc: parseFloat($("#fqP").value) || null, zone: $("#fqZ").value, exp: $("#fqE")?.value || null, per100: f.per100 || null, micro100: f.micro100 || null }]); toast("Rangé dans le frigo"); closeSheet(); },
  fridgeShop: () => { S.shop = {}; openSheet(fridgeShopSheet); },
  shopGo: async () => { const txt = $("#shopTxt").value.trim(); if (!txt) return; S.shop.txt = txt; S.shop.busy = true; S.shop.err = ""; renderSheet();
    try { const r = await aiShop(txt); S.shop.items = (r?.items || []).filter(x => x && x.name && x.qty > 0); if (!S.shop.items.length) S.shop.err = "Rien reconnu."; } catch (e) { S.shop.err = aiErr(e); }
    S.shop.busy = false; renderSheet(); },
  shopDel: el => { S.shop.items.splice(+el.dataset.v, 1); renderSheet(); },
  shopReset: () => { S.shop = { txt: S.shop.txt }; renderSheet(); },
  shopAdd: () => { fridgeAdd(S.shop.items.map(x => ({ name: x.name, qty: +x.qty, unit: x.unit === "pc" ? "pc" : "g", gPerPc: x.gPerPc || null, cat: FRIDGE_CATS[x.cat] ? x.cat : guessCat(x.name), zone: FRIDGE_ZONES[x.zone] ? x.zone : "frigo", per100: x.per100 || null })));
    toast(`${S.shop.items.length} aliment(s) rangé(s)`); S.shop = {}; closeSheet(); },
  quick: () => openSheet(() => `<div class="row between"><h2>Ajouter</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    <div class="qa" style="grid-template-columns:repeat(2,1fr)"><button data-act="openAdd" data-v=""><span>🍽️</span>Un aliment</button><button data-act="quickWeight"><span>⚖️</span>Mon poids</button><button data-act="tab" data-v="workout"><span>🏋️</span>Une séance</button><button data-act="fridgeShop"><span>🛒</span>Mes courses</button></div>`),
  quickWeight: () => openSheet(() => `<div class="row between"><h2>Poids du jour</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    <p class="xs mut">À faire <b>le matin au réveil, à jeun, après être passé aux toilettes</b>, tous les jours si tu peux : ton poids de la semaine est la moyenne de tes pesées du lundi au dimanche (jusqu'à 7).</p><input id="qW" type="number" step="0.1" inputmode="decimal" value="${day(todayKey()).weight || ""}" placeholder="ex. 80.2" style="font-size:22px;text-align:center">
    <button style="width:100%;margin-top:10px" data-act="quickWeightGo">Enregistrer</button>`),
  quickWeightGo: () => { const w = parseFloat($("#qW").value); if (!(w > 30)) return; const k = todayKey(); const d = clone(day(k)); d.entries = d.entries || []; d.acts = d.acts || []; d.weight = w; saveDay(k, d); toast(`Poids enregistré : ${w} kg`); closeSheet(); },
  gymNames: el => { S.gymNames = el.dataset.v; $$('[data-act="gymNames"]').forEach(b => b.classList.toggle("on", b === el)); const S3 = V3.scenes.gym; if (S3) S3.dirty = performance.now() + 300; },
  inv3d: () => { try { localStorage.setItem("muscu_inv3d", localStorage.getItem("muscu_inv3d") === "1" ? "0" : "1"); } catch (e) {} render(); },
  setTheme: el => { try { localStorage.setItem("muscu_theme", el.dataset.v); } catch (e) {} applyTheme(); Object.values(V3.scenes).forEach(s => s.renderer.dispose()); V3.scenes = {}; render(); },
  onbHide: () => { try { localStorage.setItem("muscu_onb_hide", "1"); } catch (e) {} render(); },
  // ----- coach
  aiWeek: async () => {
    S.busy.week = true; S.aiOut.week = "…"; render();
    try { await aiText(`${USER_CTX()}\nVoici ses données des 7 derniers jours (JSON) :\n${JSON.stringify(weekSummary())}\n\nFais un bilan hebdomadaire en français, ton neutre et scientifique : 1) ce qui va bien, 2) les 3 priorités concrètes pour la semaine prochaine (nutrition et entraînement, avec chiffres), 3) une remarque sur la progression des charges. Appuie-toi sur le consensus scientifique (méta-analyses récentes : volume, proximité de l'échec, protéines, déficit modéré) et cite brièvement l'étude quand c'est utile. Pas de blabla, pas de markdown lourd. Si des données manquent, dis-le en une phrase.`, txt => { S.aiOut.week = txt; const o = $$(".ai-out")[0]; if (o && S.tab === "coach") o.textContent = txt; }, "complex"); }
    catch (e) { S.aiOut.week = aiErr(e); }
    S.busy.week = false; render();
  },
  chatSend: async () => {
    const q = $("#chatIn").value.trim(); if (!q) return;
    S.chat.push({ role: "user", content: q }); S.chat.push({ role: "assistant", content: "…" }); S.busy.chat = true; render();
    const transcript = S.chat.slice(0, -1).map(m => (m.role === "user" ? "Lui : " : "Toi : ") + m.content).join("\n");
    try { const txt = await aiText(`${USER_CTX()}\nRésumé de sa semaine (JSON) : ${JSON.stringify(weekSummary())}\nTu es son coach musculation/nutrition. Réponds en français, de façon neutre, scientifique et concise, en t'appuyant sur les études (cite-les brièvement). Pas de markdown lourd. ${DISH_RULE.replace("proposé", "que tu proposes (s'il y en a)")}\nConversation :\n${transcript}\nRéponds à sa dernière question.`, t => { S.chat[S.chat.length - 1].content = t; const os = $$(".ai-out"); if (os.length) os[os.length - 1].textContent = t; });
      S.chat[S.chat.length - 1].content = txt; }
    catch (e) { S.chat[S.chat.length - 1].content = aiErr(e); }
    S.busy.chat = false; render();
  },
  chatClear: () => { S.chat = []; render(); },
  // ----- profil
  setGoal: el => { Store.set("profile", Object.assign({}, Store.get("profile", {}), { goal: el.dataset.v })); toast("Objectif : " + GOALS[el.dataset.v].label); },
  saveProfile: () => { const p = Object.assign({}, Store.get("profile", {}));
    ["age", "height", "weight", "protPerKg", "fatPerKg", "increment"].forEach(k => { const v = parseFloat($("#p_" + k).value); if (v > 0) p[k] = v; });
    const mk = parseFloat($("#p_manualKcal").value); p.manualKcal = mk > 0 ? mk : null; p.activity = parseFloat($("#p_activity").value);
    Store.set("profile", p); toast("Profil enregistré"); },
  exportData: async () => { try { await navigator.clipboard.writeText(JSON.stringify(Store.docs)); toast("Sauvegarde copiée : colle-la dans une note"); } catch (e) { toast("Copie refusée par le navigateur"); } },
  importData: () => openSheet(() => `<h2>Restaurer une sauvegarde</h2><p class="sm mut">Colle le texte copié avec « Copier une sauvegarde ». Les documents existants avec le même nom seront remplacés.</p><textarea id="impTxt"></textarea><div class="row" style="margin-top:8px"><button class="sec grow" data-act="closeSheet">Annuler</button><button class="grow" data-act="importGo">Restaurer</button></div>`),
  importGo: () => { try { const o = JSON.parse($("#impTxt").value); Object.entries(o).forEach(([k, v]) => { if (v && typeof v === "object") Store.set(k, v); }); toast("Restauré"); closeSheet(); } catch (e) { toast("Texte invalide"); } },
};

// ----- code-barres
let _zx = null;
function loadZXing() { if (_zx) return _zx; _zx = new Promise(res => { const s = document.createElement("script"); s.src = "https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js"; s.onload = () => res(window.ZXing || null); s.onerror = () => res(null); document.head.appendChild(s); setTimeout(() => res(window.ZXing || null), 8000); }); return _zx; }
async function decodeBarcode(file) {
  try { const Z = await loadZXing(); if (!Z) return null; const url = URL.createObjectURL(file);
    const hints = new Map(); hints.set(Z.DecodeHintType.TRY_HARDER, true);
    const reader = new Z.BrowserMultiFormatReader(hints); const r = await reader.decodeFromImageUrl(url); return r?.getText?.() || r?.text || null; } catch (e) { return null; }
}
async function handleBarcode(code) {
  const f = myFoods()["bc" + code];
  if (f) { S.add.sel = f; S.add.g = f.unit || 100; S.add.busy = false; renderSheet(); return; }
  S.add.busy = true; renderSheet();
  const off = await offBarcode(code);
  if (off) { const saved = saveMyFood(off); toast("Produit trouvé : " + off.name); S.add.sel = saved; S.add.g = saved.unit || 100; S.add.busy = false; renderSheet(); return; }
  S.add.scan = { step: "label", barcode: code }; S.add.busy = false; renderSheet();
}
async function onFile(kind, file) {
  if (!file) return; S.add.err = "";
  if (kind === "shop") { S.shop.busy = true; S.shop.err = ""; renderSheet(); try { const b = await shrinkImage(file, 1600); const r = await aiShop("", b); S.shop.items = (r?.items || []).filter(x => x && x.name && x.qty > 0); if (!S.shop.items.length) S.shop.err = "Rien reconnu sur la photo."; } catch (e) { S.shop.err = aiErr(e); } S.shop.busy = false; renderSheet(); return; }
  if (kind === "physique") { try { const b = await shrinkImage(file, 1400); await phAdd(b, S.phView || "face"); toast("Photo ajoutée 📸"); } catch (e) { toast("Impossible d'enregistrer la photo"); } render(); return; }
  if (kind === "photo") { S.add.blob = await shrinkImage(file); S.add.img = URL.createObjectURL(S.add.blob); renderSheet(); return; }
  if (kind === "barcode") {
    S.add.busy = true; renderSheet();
    let code = await decodeBarcode(file);
    if (!code) { try { const small = await shrinkImage(file, 1600); const r = await aiBarcodeDigits(small); code = (r?.barcode || "").replace(/\D/g, ""); } catch (e) { S.add.err = aiErr(e); } }
    if (!code) { S.add.busy = false; S.add.err = S.add.err || "Code illisible : reprends la photo plus près, ou tape le code."; renderSheet(); return; }
    handleBarcode(code); return;
  }
  if (kind === "label") {
    S.add.busy = true; renderSheet();
    try { const blob = await shrinkImage(file, 1600); const r = await aiLabel(blob);
      const per100 = Object.fromEntries(NUTR_KEYS.map(k => [k, r?.per100?.[k] == null ? 0 : +r.per100[k]]));
      if (!per100.kcal && !per100.p && !per100.c) throw { message: "étiquette illisible, reprends la photo bien à plat" };
      const code = S.add.scan?.barcode || (r.barcode || "").replace(/\D/g, "") || null;
      const food = saveMyFood({ name: r.name || "Produit scanné", brand: r.brand || "", barcode: code, per100, unit: r.servingG || null });
      toast("Produit enregistré dans tes aliments"); S.add.sel = food; S.add.g = food.unit || 100; S.add.scan = null;
    } catch (e) { S.add.err = e?.code ? aiErr(e) : "Erreur : " + (e?.message || ""); }
    S.add.busy = false; renderSheet();
  }
}

async function onProductPhotos(files) {
  if (!files.length) return; S.add.busy = true; S.add.err = ""; renderSheet();
  try {
    const blobs = []; for (const f of files) blobs.push(await shrinkImage(f, 1600));
    const r = await aiProductPhotos(blobs);
    const per100 = Object.fromEntries(NUTR_KEYS.map(k => [k, r?.per100?.[k] == null ? 0 : +r.per100[k]]));
    if (!per100.kcal && !per100.p && !per100.c) throw { message: "valeurs illisibles, reprends la photo bien à plat et nette" };
    const code = S.add.scan?.barcode || (r.barcode || "").replace(/\D/g, "") || null;
    const food = saveMyFood({ name: (r.name || "Produit") + (r.estime ? " (estimé)" : ""), brand: r.brand || "", barcode: code, per100, unit: r.servingG || null });
    toast(r.estime ? "Produit reconnu (valeurs estimées)" : "Étiquette lue et enregistrée"); S.add.sel = food; S.add.g = food.unit || 100; S.add.scan = null;
  } catch (e) { S.add.err = e?.code ? aiErr(e) : "Erreur : " + (e?.message || ""); }
  S.add.busy = false; renderSheet();
}
async function onFridgePhotos(files) {
  if (!files.length) return; toast("Lecture du produit…");
  try { const blobs = []; for (const f of files) blobs.push(await shrinkImage(f, 1600)); const r = await aiProductPhotos(blobs);
    const per100 = Object.fromEntries(NUTR_KEYS.map(k => [k, r?.per100?.[k] == null ? 0 : +r.per100[k]]));
    const f = saveMyFood({ name: r.name || "Produit", brand: r.brand || "", barcode: (r.barcode || "").replace(/\D/g, "") || null, per100, unit: r.servingG || null });
    S._fpick = f; openSheet(fridgeQtySheet(f)); } catch (e) { toast(e?.code ? aiErr(e) : "Erreur de lecture"); }
}
// ===================== ÉVÉNEMENTS =====================
document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-act]"); if (!el) return;
  const a = el.dataset.act; if (el.tagName === "SELECT" || (el.tagName === "INPUT" && el.type === "checkbox")) return;
  if (ACT[a]) { if (a !== "closeSheetBg") ev.preventDefault(); ACT[a](el, ev); }
});
document.addEventListener("change", ev => {
  const el = ev.target;
  if (el.dataset.file === "hubphoto" || el.dataset.file === "hubprod") { const files = [...(el.files || [])]; Scanner.close(); resetAdd(defaultMeal());
    if (el.dataset.file === "hubphoto") { S.add.tab = "photo"; openSheet(addSheet); (async () => { if (!files[0]) return; S.add.blob = await shrinkImage(files[0]); S.add.img = URL.createObjectURL(S.add.blob); renderSheet(); ACT.aiPhoto(); })(); }
    else { S.add.tab = "scan"; openSheet(addSheet); onProductPhotos(files.slice(0, 3)); }
    el.value = ""; return; }
  if (el.dataset.file === "pose") { onPoseFile(el.dataset.v, el.files?.[0]); el.value = ""; return; }
  if (el.dataset.file) { if (el.dataset.file === "prodphotos") onProductPhotos([...(el.files || [])].slice(0, 3)); else if (el.dataset.file === "fridgephotos") onFridgePhotos([...(el.files || [])].slice(0, 3)); else onFile(el.dataset.file, el.files?.[0]); el.value = ""; return; }
  if (el.dataset.act === "range") { const [a, b] = el.value.split("-").map(Number); const doc = clone(Store.get("program", {})); doc.ranges = doc.ranges || {}; doc.ranges[el.dataset.v] = [a, b]; Store.set("program", doc); return; }
  if (el.dataset.act === "progEx") { S.progEx = el.value; render(); return; }
  if (el.dataset.act === "moodTrack") { const pr = clone(Store.get("profile", {})); pr.moodTrack = el.checked; Store.set("profile", pr); renderSheet(); return; }
  if (el.dataset.act === "gymGoto") { if (el.value) gymGoto(el.value); el.value = ""; return; }
  if (el.dataset.act === "copyChk") { S.copySel[+el.dataset.v] = el.checked; renderSheet(); return; }
  if (el.dataset.act === "dayPick" && el.value) { S.day = el.value > maxPlanDay() ? maxPlanDay() : el.value; render(); return; }
  if (el.id === "copyDate" && el.value) { S.copyFrom = el.value; S.copySel = null; renderSheet(); return; }
  if (el.id === "wDate") { const w = liveWorkout(); if (w && el.value) { const t = new Date(w.start); const d = parseKey(el.value); d.setHours(t.getHours(), t.getMinutes()); const delta = d.getTime() - w.start; updW(o => { o.start += delta; o.ex.forEach(e => e.sets.forEach(s => s.t += delta)); }); } return; }
  if (el.dataset.act === "warmAll") { updW(w => w.warmDone = el.checked); return; }
  if (el.type === "checkbox" && el.dataset.act && ACT[el.dataset.act]) ACT[el.dataset.act](el, ev);
});
document.addEventListener("input", ev => {
  const el = ev.target; const k = el.dataset.input; if (!k) return;
  if (k === "q") { S.add.q = el.value; S.add.offRes = null; _searchRes = searchFoods(el.value); $("#qres").innerHTML = foodList(_searchRes); }
  else if (k === "g") { S.add.g = +el.value; const f = S.add.sel, n = scaleNutr(f.per100, +el.value || 0); $("#selN").innerHTML = `<b>${r0(n.kcal)} kcal</b> · P ${r1(n.p)} g · G ${r1(n.c)} g · L ${r1(n.f)} g`; }
  else if (k === "itemG") { S.add.items[+el.dataset.i].grams = +el.value || 0; }
  else if (k === "fq") { S.fq = el.value; const res = searchFoods(el.value).slice(0, 12); S._fres = res; $("#fres").innerHTML = fridgeResHTML(res, el.value); }
  else if (k === "shopQ") { S.shop.items[+el.dataset.i].qty = +el.value || 0; }
  else if (k === "recQ") { S.rec.q = el.value; const res = searchFoods(el.value).slice(0, 8); S._recRes = res; $("#recRes").innerHTML = res.map((f, i) => `<div class="entry" data-act="recAddIng" data-i="${i}"><span class="sm">${esc(f.name)}</span><span class="mut">+</span></div>`).join(""); }
  else if (k === "recG") { S.rec.ings[+el.dataset.i].g = +el.value || 0; }
  else if (k === "recP") { S.recPortions = parseFloat(el.value) || 1; }
  else if (k === "phSplit") { S.phSplit = +el.value; const t = $("#phTop"), l = $("#phLine"); if (t) t.style.clipPath = `inset(0 0 0 ${el.value}%)`; if (l) l.style.left = el.value + "%"; }
  else if (k === "draft") { const dr = S.draft[+el.dataset.i]; if (dr) dr[el.dataset.k] = el.value; }
  else if (k === "exQ") { S.exQ = el.value; const sh = exPickerSheet("add")(); const tmp = document.createElement("div"); tmp.innerHTML = sh; $("#exList").innerHTML = tmp.querySelector("#exList").innerHTML; }
});
// recalcul de la liste de recherche quand la feuille s'affiche
const _origRenderSheet = renderSheet;
renderSheet = function () { if (S.sheet === addSheet && !S.add.sel && !S.add.items && S.add.tab === "search") _searchRes = S.add.offRes || searchFoods(S.add.q); _origRenderSheet(); };

Object.assign(ACT, DISH_ACT, PLATFORM_ACT, RECIPE_ACT, BODY_ACT, PROG_ACT, NUT_ACT, PH_ACT, BL_ACT, FAT_ACT);
ACT_PICK_MACHINE = id => openSheet(machineSheet(id));
ACT_PICK_FRIDGE = id => openSheet(fridgeItemSheet(id));
Store.on(() => { render(); if (liveWorkout()) scheduleTimer(); wakeSync(); });
if ((typeof IS_SP_REDIRECT === "undefined" || !IS_SP_REDIRECT) && !(typeof phoneBoot === "function" && phoneBoot())) { render(); Store.init(); if (typeof spBoot === "function") spBoot(); } // phoneBoot : format téléphone sur grand écran (phone.js)
