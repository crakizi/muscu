// ===================== CUISINE (lot 1) : avec ce que j'ai, courses, budget, batch =====================
// Données (toutes hors ligne, créées à la volée, aucune migration destructive) :
//  "shoplist" {items:[{id,name,qty,unit,aisle,done,src,cost}], log:[{id,t,cost}]}
//  "prices"   {items:{<nom normalisé>:{name,price,per:"kg"|"pc"}}, week:<budget hebdo €>}
//  "batch"    {items:[{id,name,portions,left,portionG,per:{kcal,p,c,f},date}]}
const CZ_AISLES = [["fl", "Fruits & légumes"], ["viande", "Viandes & poissons"], ["cremerie", "Crèmerie"], ["epicerie", "Épicerie"], ["surgele", "Surgelés"], ["boisson", "Boissons"], ["autre", "Autre"]];
const CZ_CAT2AISLE = { legume: "fl", fruit: "fl", viande: "viande", poisson: "viande", laitier: "cremerie", fromage: "cremerie", oeufs: "cremerie", feculent: "epicerie", sauce: "epicerie", surgele: "surgele", boisson: "boisson" };
const CZ_BASICS = /^(sel|poivre|eau|sel et poivre|sel, poivre)$/;
const czAisle = name => CZ_CAT2AISLE[guessCat(name || "")] || "autre";
const eur = v => v == null ? "—" : v.toFixed(2).replace(".", ",") + " €";
const shopDoc = () => Store.get("shoplist", { items: [], log: [] });
const shopItems = () => shopDoc().items || [];
const priceDoc = () => Store.get("prices", { items: {}, week: null });
const batchItems = () => Store.get("batch", { items: [] }).items || [];
function saveShop(fn) { const d = clone(shopDoc()); d.items = d.items || []; d.log = d.log || []; fn(d); d.log = d.log.filter(l => l.t > Date.now() - 60 * 864e5); Store.set("shoplist", d); }

// ---- correspondance de noms (même logique que le frigo) ----
function czMatch(list, name, get = x => x.name) {
  const n = normN(name); if (!n) return null;
  const W = s => s.split(/[^a-z0-9]+/).filter(w => w.length > 2 && !["les", "des", "aux", "avec", "cuit", "cru", "crue", "cuite"].includes(w));
  const nw = W(n);
  return list.find(i => normN(get(i)) === n) || list.find(i => { const mw = W(normN(get(i))); if (!mw.length || !nw.length) return false; const [a, b] = mw.length <= nw.length ? [mw, nw] : [nw, mw]; return a.every(w => b.some(x => x === w || x === w + "s" || w === x + "s")); }) || null;
}
const haveG = it => it.unit === "pc" ? it.qty * (it.gPerPc || 100) : it.qty;
function gPerPcOf(name) { const f = fridgeFind(name); if (f?.gPerPc) return f.gPerPc; const fd = czMatch(allFoods(), name); return fd?.unit || null; }

// ---- objectifs du jour (contrat agent Nutrition : window.dayTargets → {kcal,p,g,l}) ----
function czTargets(k) {
  if (typeof window.dayTargets === "function") { try { const t = window.dayTargets(k); if (t && +t.kcal) return { kcal: +t.kcal, p: +t.p || 0, c: +(t.g ?? t.c) || 0, f: +(t.l ?? t.f) || 0 }; } catch (e) {} }
  const T = targets(); return { kcal: T.kcal, p: T.p, c: T.c, f: T.f };
}
function czRemaining() { const k = todayKey(); const T = czTargets(k); const t = dayTotals(k); return { kcal: Math.max(0, T.kcal - t.kcal), p: Math.max(0, T.p - t.p), c: Math.max(0, T.c - t.c), f: Math.max(0, T.f - t.f) }; }
function czFit(m, R) { // 0..1 : une portion qui comble ce qui reste du jour sans le dépasser
  if (!m || !(m.kcal > 0) || !(R.kcal > 0)) return 0;
  const k = Math.abs(m.kcal - R.kcal) / Math.max(R.kcal, 300), p = R.p > 0 ? Math.max(0, Math.min(R.p, 60) - (m.p || 0)) / Math.max(Math.min(R.p, 60), 20) : 0;
  return Math.max(0, Math.min(1, 1 - 0.5 * Math.min(1, k) - 0.5 * p));
}

// ---- prix et coûts ----
function priceOf(name) { const P = priceDoc().items || {}; const n = normN(name); return P[n] || czMatch(Object.values(P), name) || null; }
function costOf(name, g, pcs) {
  const p = priceOf(name); if (!p || !(p.price > 0)) return null;
  if (p.per === "pc") { if (pcs > 0) return p.price * pcs; const gp = gPerPcOf(name); return p.price * (g > 0 && gp ? g / gp : 1); }
  if (!(g > 0) && pcs > 0) { const gp = gPerPcOf(name) || 100; g = pcs * gp; }
  return g > 0 ? p.price * g / 1000 : null;
}
function costIngs(ings) { let c = 0, known = 0, n = 0; (ings || []).forEach(i => { if (CZ_BASICS.test(normN(i.name))) return; n++; const v = costOf(i.name, +i.g || 0, i.pc); if (v != null) { c += v; known++; } }); return { cost: known ? c : null, known, n }; }
const costTxt = (C, div = 1) => C.cost == null ? `<span class="mut">prix inconnus</span>` : `≈ ${eur(C.cost / div)}${C.known < C.n ? ` <span class="mut">(${C.known}/${C.n} prix connus)</span>` : ""}`;

// ---- recettes : perso + idées gardées (texte IA analysé) ----
function parseIngLine(l) {
  l = l.replace(/^\s*[-•*·–]+\s*|\s*[*_]+/g, "").replace(/\(.*?\)/g, "").trim(); if (!l || l.length > 90) return null;
  const U = { kg: 1000, g: 1, ml: 1, cl: 10, l: 1000 }; let m;
  if ((m = l.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l)\b\.?\s*(?:de\s+|d['’]\s*)?(.+)$/i))) return { name: m[3].replace(/[,;].*$/, "").trim(), g: parseFloat(m[1].replace(",", ".")) * U[m[2].toLowerCase()] };
  if ((m = l.match(/^(.+?)\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l)\b/i))) return { name: m[1].trim(), g: parseFloat(m[2].replace(",", ".")) * U[m[3].toLowerCase()] };
  if ((m = l.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/))) return { name: m[2].replace(/[,;].*$/, "").trim(), pc: parseFloat(m[1].replace(",", ".")) };
  return null;
}
function parseIdeaDishes(note) {
  const out = []; let cur = null, inIng = false;
  String(note.text || "").split("\n").forEach(raw => {
    const l = raw.trim(); const d = l.match(/^[#*\s]*🍽️?\s*(.+?)\s*$/u);
    if (d) { cur = { name: d[1].split("|")[0].replace(/^[*#\s:]+|[*#\s:]+$/g, ""), ings: [], body: [] }; out.push(cur); inIng = false; return; }
    if (!cur || !l) return; cur.body.push(l);
    if (/ingr[ée]dient/i.test(l)) { inIng = true; const after = l.split(/:\s*/).slice(1).join(":"); if (after) after.split(/[,;]/).forEach(x => { const p = parseIngLine(x); if (p) cur.ings.push(p); }); return; }
    if (/mat[ée]riel|[ée]tapes?|pr[ée]paration|cuisson|rep[èe]res|erreurs?|astuce|macros|^\d+\)/i.test(l)) { inIng = false; return; }
    const p = parseIngLine(l); if (p && (inIng || p.g)) cur.ings.push(p);
  });
  return out.filter(x => x.name && x.ings.length).map((x, i) => {
    const B = x.body.join(" "), n = re => { const m = B.match(re); return m ? +m[1] : 0; };
    const per = { kcal: n(/(\d{2,4})\s*kcal/i), p: n(/(?:\bP\b|prot[ée]ines?)\s*[:=]?\s*(\d+)\s*g/i) || n(/(\d+)\s*g\s*(?:de\s*)?prot/i), c: n(/(?:\bG\b|glucides)\s*[:=]?\s*(\d+)/i), f: n(/(?:\bL\b|lipides)\s*[:=]?\s*(\d+)/i) };
    return { kind: "idee", id: note.id + ":" + i, name: x.name, ings: x.ings, portions: 1, per };
  });
}
function czRecipes() {
  const perso = recipes().map(r => { const f = recipeAsFood(r); const u = f.unit; return { kind: "perso", id: r.id, name: r.name, ings: (r.ings || []).map(i => ({ name: i.name, g: +i.g || 0 })), portions: r.portions || 1, per: { kcal: f.per100.kcal * u / 100, p: f.per100.p * u / 100, c: f.per100.c * u / 100, f: f.per100.f * u / 100 } }; });
  const ideas = (Store.get("notes", { items: [] }).items || []).flatMap(parseIdeaDishes);
  return [...perso, ...ideas];
}
function czAvail(ings) {
  const list = (ings || []).filter(i => !CZ_BASICS.test(normN(i.name)));
  const have = [], miss = [], urgent = [];
  list.forEach(i => { const it = fridgeFind(i.name); if (it) { have.push(i); if (expSoon(it)) urgent.push(it); } else miss.push(i); });
  return { n: list.length, have: have.length, miss, urgent };
}
function recipesAvailHTML() {
  const R = czRemaining();
  const rows = czRecipes().map(r => Object.assign(r, { A: czAvail(r.ings), fit: czFit(r.per, R), C: costIngs(r.ings) }));
  rows.sort((a, b) => (b.A.have / (b.A.n || 1) + 0.1 * b.A.urgent.length) - (a.A.have / (a.A.n || 1) + 0.1 * a.A.urgent.length) || b.fit - a.fit);
  const card = r => `<div class="entry czrec" style="align-items:flex-start">${dishImg(r.name, { ings: r.ings.map(i => i.name) })}<div class="grow">
      <div class="b sm">${esc(r.name)} <span class="tag">${r.kind === "perso" ? "ma recette" : "idée gardée"}</span></div>
      <div class="sm czav"><b>${r.A.have}/${r.A.n}</b>${r.A.miss.length ? ` — il manque : ${r.A.miss.map(i => esc(i.name)).join(", ")}` : " — tout est là ✓"}</div>
      ${r.A.urgent.length ? `<div class="xs">⏳ utilise : ${r.A.urgent.map(i => `${esc(i.name)} (${expTxt(i)})`).join(", ")}</div>` : ""}
      <div class="xs mut">${r.per.kcal ? `${r0(r.per.kcal)} kcal · P ${r0(r.per.p)} g / portion` : "macros non précisées"}${r.fit >= 0.7 ? ` · <b style="color:var(--acc)">colle à ce qu'il te reste</b>` : ""} · ${costTxt(r.C, r.portions)}${r.portions > 1 ? "/portion" : ""}</div>
      <div class="row" style="gap:6px;margin-top:4px">${r.kind === "perso" ? `<button class="small" data-act="recPick" data-v="${r.id}">Manger</button>` : ""}${r.A.miss.length ? `<button class="small sec" data-act="czRecShop" data-v="${esc(r.id)}">🛒 Ajouter les manquants</button>` : ""}</div></div></div>`;
  return `<div class="card"><h2>Avec ce que j'ai</h2><p class="xs mut">Reste du jour : ${r0(R.kcal)} kcal · P ${r0(R.p)} g</p>
    ${rows.length ? rows.map(card).join("") : `<p class="mut sm">Aucune recette pour l'instant. Crée-en une, ou garde des idées ci-dessous.</p>`}</div>`;
}

// ---- liste de courses ----
function shopAddMissing(ings, src) { // ings : [{name, g?, pc?}] (quantités totales voulues) → n'ajoute que ce qui manque
  const need = {};
  ings.forEach(i => { if (!i.name || CZ_BASICS.test(normN(i.name))) return; const k = normN(i.name); const x = need[k] || (need[k] = { name: i.name, g: 0, pc: 0 }); x.g += +i.g || 0; x.pc += +i.pc || 0; });
  let added = 0;
  saveShop(d => Object.values(need).forEach(x => {
    const it = fridgeFind(x.name); let g = x.g, pc = x.pc;
    if (it) { if (it.unit === "pc" && pc && !g) pc -= it.qty; else if (g) g -= haveG(it); else return; if (g <= 0 && pc <= 0) return; }
    const unit = g > 0 ? "g" : pc > 0 ? "pc" : ""; const qty = unit === "g" ? Math.ceil(g / 10) * 10 : unit === "pc" ? Math.ceil(pc) : 0;
    const ex = d.items.find(s => !s.done && normN(s.name) === normN(x.name) && (s.unit || "") === unit);
    if (ex) ex.qty = (ex.qty || 0) + qty; else d.items.push({ id: uid(), name: x.name, qty, unit, aisle: czAisle(x.name), done: false, src: src || "" });
    added++;
  }));
  return added;
}
const shopQtyTxt = s => !s.qty ? "" : s.unit === "pc" ? `${s.qty} pc` : s.qty >= 1000 ? `${r1(s.qty / 1000)} kg` : `${s.qty} g`;
const shopCost = s => costOf(s.name, s.unit === "g" ? s.qty : 0, s.unit === "pc" ? s.qty : 0);
function shopText() {
  const its = shopItems().filter(s => !s.done);
  return "Liste de courses\n" + CZ_AISLES.map(([k, l]) => { const L = its.filter(s => (s.aisle || "autre") === k); return L.length ? `\n${l}\n${L.map(s => `- ${s.name}${s.qty ? " (" + shopQtyTxt(s) + ")" : ""}`).join("\n")}` : ""; }).join("") + "\n";
}
function shopListHTML() {
  const its = shopItems(); const todo = its.filter(s => !s.done);
  const tot = todo.reduce((t, s) => { const c = shopCost(s); if (c != null) { t.c += c; t.k++; } return t; }, { c: 0, k: 0 });
  const groups = CZ_AISLES.map(([k, l]) => { const L = its.filter(s => (s.aisle || "autre") === k); if (!L.length) return "";
    return `<h3>${l}</h3>${L.map(s => { const c = shopCost(s); return `<label class="entry czshop" style="align-items:center;cursor:pointer;margin:0;color:var(--txt);font-size:15px"><span class="row" style="gap:8px"><input type="checkbox" style="width:20px;height:20px" data-act="czShopChk" data-v="${s.id}" ${s.done ? "checked" : ""}><span${s.done ? ' style="text-decoration:line-through;opacity:.55"' : ""}>${esc(s.name)} <span class="xs mut">${shopQtyTxt(s)}</span></span></span><span class="xs mut">${c != null ? eur(c) : ""}</span><button class="ghost small" data-act="czShopDel" data-v="${s.id}">✕</button></label>`; }).join("")}`; }).join("");
  return `<div class="card"><div class="row between"><h2>🛒 Liste de courses</h2><span class="sm b">${tot.k ? "≈ " + eur(tot.c) : ""}</span></div>
    ${its.length ? `<p class="xs mut">Coché = rangé dans le frigo.</p>` : ""}
    ${its.length ? groups : `<p class="mut sm">Liste vide.</p>`}
    <input id="czShopN" placeholder="Ajouter un article (ex. 6 œufs, 500 g de riz)" style="margin-top:10px"><div class="row" style="margin-top:6px;gap:6px"><select id="czShopA" class="grow">${CZ_AISLES.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}<option value="" selected>Rayon auto</option></select><button class="small" data-act="czShopAdd">+</button></div>
    <div class="row" style="margin-top:8px;gap:6px">${Store.get("mealplan", null) ? `<button class="sec small grow" data-act="czPlanShop">Depuis mon plan de repas</button>` : ""}${todo.length ? `<button class="sec small grow" data-act="czShare">Partager la liste</button>` : ""}${its.some(s => s.done) ? `<button class="sec small grow" data-act="czShopClear">Retirer les cochés</button>` : ""}</div>
    ${S.czShare ? `<textarea id="czShareTxt" readonly style="margin-top:8px;height:140px">${esc(shopText())}</textarea>` : ""}
    ${tot.k < todo.length ? `<p class="xs mut">${todo.length - tot.k} article(s) sans prix : prix à renseigner dans 💶 Budget.</p>` : ""}</div>`;
}

// ---- budget ----
function weekSpent() { const w0 = parseKey(weekKey()).getTime(); return (shopDoc().log || []).filter(l => l.t >= w0).reduce((t, l) => t + (+l.cost || 0), 0); }
function budgetHTML() {
  const P = priceDoc(); const known = Object.entries(P.items || {});
  const todo = shopItems().filter(s => !s.done); const planned = todo.reduce((t, s) => t + (shopCost(s) || 0), 0); const spent = weekSpent(); const B = +P.week || 0;
  const names = new Map(); [...todo.map(s => s.name), ...recipes().flatMap(r => (r.ings || []).map(i => i.name)), ...(Store.get("mealplan", null)?.days || []).flatMap(d => d.meals.flatMap(m => (m.ingredients || []).map(i => i.name)))]
    .forEach(n => { if (n && !CZ_BASICS.test(normN(n)) && !priceOf(n) && !names.has(normN(n))) names.set(normN(n), n); });
  const row = (key, name, p) => `<div class="entry czprice" data-prow="${esc(key)}" data-n="${esc(name)}" style="align-items:center"><span class="grow sm">${esc(name)}</span><input type="number" inputmode="decimal" step="0.01" min="0" value="${p ? p.price : ""}" placeholder="€" style="width:76px" data-cz="price"><select data-cz="price" style="width:auto">${[["kg", "€/kg"], ["pc", "€/unité"]].map(([v, l]) => `<option value="${v}" ${(p?.per || "kg") === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>`;
  const pct = x => B ? Math.min(100, x / B * 100) : 0;
  return `<div class="card"><h2>💶 Budget de la semaine</h2>
    <div class="row" style="gap:8px;align-items:center"><label class="sm" style="margin:0">Budget hebdo (€)</label><input id="czBudget" type="number" inputmode="decimal" min="0" step="1" value="${B || ""}" placeholder="ex. 60" style="width:90px" data-cz="budget"></div>
    ${B ? `<div class="bar czgauge" style="margin-top:10px;display:flex"><i style="width:${pct(spent)}%;background:var(--acc)"></i><i style="width:${Math.max(0, Math.min(100 - pct(spent), pct(planned)))}%;background:var(--acc);opacity:.35;border-radius:0"></i></div>
      <p class="sm">${eur(spent)} achetés + ${eur(planned)} sur la liste · budget ${eur(B)} · ${spent + planned <= B ? `reste ${eur(B - spent - planned)}` : `${eur(spent + planned - B)} au-dessus`}</p>` : `<p class="xs mut">Fixe un budget pour suivre tes achats de la semaine (articles cochés dans la liste).</p>`}</div>
    <div class="card"><h2>Mes prix moyens</h2><p class="xs mut">Saisis le prix que tu paies d'habitude ; il est retenu pour estimer le coût des recettes, du plan et de la liste.</p>
      ${known.map(([k, p]) => row(k, p.name, p)).join("") || `<p class="mut sm">Aucun prix enregistré.</p>`}
      ${names.size ? `<h3>Sans prix</h3>${[...names].slice(0, 15).map(([k, n]) => row(k, n, null)).join("")}` : ""}
      <input id="czPriceN" placeholder="Autre aliment" style="margin-top:8px"><div class="row" style="margin-top:6px;gap:6px"><input id="czPriceV" class="grow" type="number" inputmode="decimal" step="0.01" placeholder="€" style="width:70px"><select id="czPriceU" class="grow"><option value="kg">€/kg</option><option value="pc">€/unité</option></select><button class="small" data-act="czPriceAdd">+</button></div></div>`;
}
function setPrice(key, name, price, per) { const d = clone(priceDoc()); d.items = d.items || {}; if (price > 0) d.items[key] = { name, price, per }; else delete d.items[key]; Store.set("prices", d); }

// ---- batch cooking ----
function batchHTML() {
  const B = S.czB || {}; const its = batchItems();
  const live = its.filter(b => b.left > 0), done = its.filter(b => !(b.left > 0));
  const row = b => `<div class="entry czbatch" style="align-items:center"><div class="grow"><div class="b sm">${esc(b.name)}</div><div class="xs mut">${b.left}/${b.portions} portion(s) · ${r0(b.per.kcal)} kcal · P ${r0(b.per.p)} · G ${r0(b.per.c)} · L ${r0(b.per.f)} · préparé ${b.date ? fmtDay(b.date) : ""}</div></div>${b.left > 0 ? `<button class="small" data-act="czBatchEat" data-v="${b.id}">Mangé</button>` : `<button class="ghost small" data-act="czBatchDel" data-v="${b.id}">✕</button>`}</div>`;
  const f = (id, l, v, t = "number") => `<div class="grow"><label>${l}</label><input id="${id}" type="${t}" ${t === "number" ? 'inputmode="decimal"' : ""} value="${esc(v ?? "")}"></div>`;
  return `<div class="card"><h2>🍱 Mes préparations</h2>${live.length ? live.map(row).join("") : `<p class="mut sm">Aucune préparation en cours.</p>`}${done.length ? `<details><summary class="xs mut">Terminées (${done.length})</summary>${done.map(row).join("")}</details>` : ""}</div>
    ${czFold("batchNew", "+ Nouvelle préparation", () => batchFormHTML(B, f))}`;
}
function batchFormHTML(B, f) {
  return `<div class="card"><h2>Nouvelle préparation</h2>
      ${recipes().length ? `<label>Partir d'une recette (facultatif)</label><select data-cz="bRec"><option value="">—</option>${recipes().map(r => `<option value="${r.id}" ${B.rec === r.id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select>${B.rec ? `<p class="xs mut" style="margin:4px 0 0">Ses ingrédients seront retirés du frigo.</p>` : ""}` : ""}
      ${f("czBN", "Nom", B.name, "text")}
      <div class="row">${f("czBP", "Portions", B.portions || 4)}${f("czBG", "Poids d'une portion (g)", B.portionG || "")}</div>
      <div class="row">${f("czBk", "kcal / portion", B.kcal)}${f("czBp", "P (g)", B.p)}${f("czBc", "G (g)", B.c)}${f("czBf", "L (g)", B.f)}</div>
      ${f("czBD", "Préparé le", B.date || todayKey(), "date")}
      <button style="width:100%;margin-top:10px" data-act="czBatchSave">Enregistrer la préparation</button></div>`;
}

// ---- coût du plan de repas (injecté dans l'onglet Plan, sans toucher nutrition.js) ----
function planIngs(P) { return (P?.days || []).flatMap(d => d.meals.flatMap(m => (m.ingredients || []).map(i => ({ name: i.name, g: +i.g || 0 })))); }
function planExtrasHTML() {
  const P = Store.get("mealplan", null); if (!P?.days?.length) return "";
  const days = P.days.map(d => ({ day: d.day, C: costIngs(d.meals.flatMap(m => m.ingredients || [])) }));
  const tot = costIngs(planIngs(P));
  return `<div class="card czplan"><h2>💶 Coût estimé du plan</h2>${days.map(d => `<div class="row between sm"><span>${esc(d.day)}</span><span>${costTxt(d.C)}</span></div>`).join("")}
    <div class="row between sm b" style="margin-top:6px"><span>Total</span><span>${costTxt(tot)}</span></div>
    <button class="sec" style="width:100%;margin-top:10px" data-act="czPlanShop">🛒 Ajouter ce qui manque à ma liste</button>
    </div>`;
}

// ---- navigation Cuisine (lot 2) : une seule rangée de 4 onglets ----
// Frigo · Recettes (avec ce que j'ai + idées IA) · Plan (plan + batch + besoins) · Courses (liste + budget).
// Remplace la vue de nutrition.js sans modifier ce fichier (cuisine2.js est chargé après).
const CZ_TABS = [["frigo", "🧊", "Frigo"], ["recettes", "🍲", "Recettes"], ["plan", "📅", "Plan"], ["courses", "🛒", "Courses"]];
const CZ_OLD = { idees: "recettes", besoins: "plan", batch: "plan", budget: "courses" }; // anciens onglets → nouveaux
const czTab = () => { const k = CZ_OLD[S.kTab] || S.kTab; return CZ_TABS.some(t => t[0] === k) ? k : "frigo"; };
const czFold = (key, label, html) => { const on = (S.czFold || {})[key];
  return `<button class="sec czfold" style="width:100%;margin:2px 0 10px;justify-content:space-between" data-act="czFold" data-v="${key}"><span>${label}</span><span>${on ? "▴" : "▾"}</span></button>${on ? html() : ""}`; };
function budgetLine() { const B = +priceDoc().week || 0; if (!B) return "💶 Budget et prix"; return `💶 Budget : ${eur(weekSpent())} / ${eur(B)}`; }
// Plan de repas (nutrition.js) : sa liste de courses fait doublon avec l'onglet Courses → remplacée par le coût + « ajouter ce qui manque »
function czPlanHTML() {
  const T = document.createElement("template"); T.innerHTML = mealPlanHTML();
  const shop = [...T.content.querySelectorAll(".card")].find(c => /Liste de courses/.test(c.querySelector("h2")?.textContent || ""));
  const x = document.createElement("template"); x.innerHTML = planExtrasHTML();
  if (shop) shop.replaceWith(x.content); else T.content.appendChild(x.content);
  // un plan existe déjà : le formulaire « Refaire un plan » est replié
  const form = Store.get("mealplan", null)?.days?.length ? [...T.content.querySelectorAll(".card")].find(c => (c.querySelector("h2")?.textContent || "").trim() === "Plan de repas") : null;
  let formH = ""; if (form) { formH = form.outerHTML; form.remove(); }
  const d = document.createElement("div"); d.appendChild(T.content); return d.innerHTML + (form ? czFold("planNew", "🔄 Refaire un plan", () => formH) : "");
}
function viewKitchen() {
  const k = czTab(); const n = shopItems().filter(x => !x.done).length;
  const tabs = `<div class="ktabs cztabs">${CZ_TABS.map(([v, ic, l]) => `<button class="ktab ${k === v ? "on" : ""}" data-act="kTab" data-v="${v}"><span>${ic}</span>${l}${v === "courses" && n ? ` <b class="czbadge">${n}</b>` : ""}</button>`).join("")}</div>`;
  let body;
  if (k === "frigo") body = viewFridge();
  else if (k === "recettes") body = recipesAvailHTML() + czFold("idees", "💡 Nouvelles idées (IA)", ideasHTML);
  else if (k === "plan") body = czPlanHTML() + batchHTML() + czFold("besoins", "📊 Mes besoins du jour", needsHTML);
  else body = shopListHTML() + czFold("budget", budgetLine(), budgetHTML);
  return statusBanner() + tabs + body;
}

// ---- saisie (prix, budget, recette de départ du batch) ----
document.addEventListener("change", ev => {
  const el = ev.target; const k = el.dataset?.cz; if (!k) return;
  if (k === "price") { const row = el.closest("[data-prow]"); const v = parseFloat(String(row.querySelector("input").value).replace(",", ".")); setPrice(row.dataset.prow, row.dataset.n, v, row.querySelector("select").value); }
  else if (k === "budget") { const d = clone(priceDoc()); d.items = d.items || {}; d.week = parseFloat(el.value) || null; Store.set("prices", d); }
  else if (k === "bRec") { const r = recipes().find(x => x.id === el.value); if (!r) { S.czB = {}; render(); return; } const f = recipeAsFood(r); const u = f.unit;
    S.czB = { rec: r.id, name: r.name, portions: r.portions || 1, portionG: u, kcal: r0(f.per100.kcal * u / 100), p: r0(f.per100.p * u / 100), c: r0(f.per100.c * u / 100), f: r0(f.per100.f * u / 100), date: todayKey() }; render(); }
});

const CZ_ACT = {
  czSub: el => { S.kTab = CZ_OLD[el.dataset.v] || el.dataset.v; S.czShare = false; window.scrollTo(0, 0); render(); },
  czFold: el => { S.czFold = S.czFold || {}; S.czFold[el.dataset.v] = !S.czFold[el.dataset.v]; render(); },
  // « Copier hier » (bouton du journal) : remplace la version d'actions.js pour retirer aussi du frigo ce qui y est
  copyYesterday: () => { const es = day(addDays(S.day, -1)).entries || []; if (!es.length) { toast("Rien de noté la veille"); return; }
    updDay(d => es.forEach(e => d.entries.push(Object.assign(clone(e), { id: uid(), t: Date.now() })))); const out = entriesConsume(es);
    toast(`${es.length} aliment(s) copiés d'hier` + (out ? ` · ${out} retiré(s) du frigo` : "")); render(); },
  czRecShop: el => { const r = czRecipes().find(x => x.id === el.dataset.v); if (!r) return; const n = shopAddMissing(r.ings, r.name); toast(n ? `${n} article(s) ajouté(s) à la liste` : "Tout est déjà dans ton frigo"); },
  czPlanShop: () => { const P = Store.get("mealplan", null); let ings = planIngs(P);
    if (!ings.length) ings = (P?.shopping || []).flatMap(s => (s.items || []).map(i => parseIngLine(`${i.qty || ""} ${i.name}`) || { name: i.name }));
    const n = shopAddMissing(ings, "plan"); toast(n ? `${n} article(s) manquant(s) ajouté(s)` : "Rien ne manque"); },
  czShopAdd: () => { const t = ($("#czShopN")?.value || "").trim(); if (!t) return; const p = parseIngLine(t) || { name: t }; const a = $("#czShopA")?.value;
    saveShop(d => d.items.push({ id: uid(), name: p.name, qty: p.g ? r0(p.g) : p.pc || 0, unit: p.g ? "g" : p.pc ? "pc" : "", aisle: a || czAisle(p.name), done: false, src: "main" })); },
  czShopChk: el => { el.blur(); // sinon la case garde le focus et l'écran (total, budget) ne se met à jour qu'au tap suivant
    const s = shopItems().find(x => x.id === el.dataset.v); if (!s) return; const on = el.checked;
    const zone = s.aisle === "surgele" ? "congel" : s.aisle === "epicerie" || s.aisle === "boisson" ? "placard" : "frigo";
    if (on) fridgeAdd([{ name: s.name, qty: s.qty || 1, unit: s.unit === "g" ? "g" : "pc", zone }]);
    else fridgeConsume(s.name, s.unit === "g" ? s.qty : (s.qty || 1) * (gPerPcOf(s.name) || 100));
    const c = shopCost(s);
    saveShop(d => { const x = d.items.find(i => i.id === s.id); x.done = on; d.log = d.log.filter(l => l.id !== s.id); if (on && c != null) d.log.push({ id: s.id, t: Date.now(), cost: c }); });
    toast(on ? `${s.name} rangé dans le frigo` : `${s.name} remis sur la liste`); },
  czShopDel: el => saveShop(d => { d.items = d.items.filter(i => i.id !== el.dataset.v); }),
  czShopClear: () => saveShop(d => { d.items = d.items.filter(i => !i.done); }),
  czShare: async () => { const txt = shopText(); S.czShare = true; render();
    try { if (navigator.share) { await navigator.share({ title: "Liste de courses", text: txt }); return; } await navigator.clipboard.writeText(txt); toast("Liste copiée"); } catch (e) {} },
  czPriceAdd: () => { const n = ($("#czPriceN")?.value || "").trim(); const v = parseFloat(($("#czPriceV")?.value || "").replace(",", ".")); if (!n || !(v > 0)) return; setPrice(normN(n), n, v, $("#czPriceU").value); },
  czBatchSave: () => { const v = id => $("#" + id)?.value || ""; const num = id => parseFloat(v(id).replace(",", ".")) || 0; const name = v("czBN").trim(); const portions = Math.max(1, Math.round(num("czBP")));
    if (!name) { toast("Donne un nom à la préparation"); return; }
    const d = clone(Store.get("batch", { items: [] })); d.items = d.items || [];
    // les ingrédients sont retirés du frigo à la préparation (recette de départ × portions préparées / portions de la recette)
    const r = recipes().find(x => x.id === S.czB?.rec); let out = 0;
    if (r) { const k = portions / (r.portions || 1); (r.ings || []).forEach(i => { if (fridgeConsume(i.name, (+i.g || 0) * k)) out++; }); }
    d.items.unshift({ id: uid(), name, portions, left: portions, portionG: num("czBG") || null, per: { kcal: num("czBk"), p: num("czBp"), c: num("czBc"), f: num("czBf") }, date: v("czBD") || todayKey(), recipeId: r?.id || null, used: !!r });
    S.czB = {}; S.czFold = Object.assign(S.czFold || {}, { batchNew: false }); Store.set("batch", d); toast("Préparation enregistrée" + (out ? ` · ${out} ingrédient(s) retiré(s) du frigo` : "")); },
  // « Mangé » : note 1 portion au jour affiché dans le journal (S.day) ; ne retire rien du frigo (déjà fait à la préparation)
  czBatchEat: el => { const d = clone(Store.get("batch", { items: [] })); const b = (d.items || []).find(x => x.id === el.dataset.v); if (!b || !(b.left > 0)) return;
    const g = b.portionG || 100; const per100 = { kcal: b.per.kcal / g * 100, p: b.per.p / g * 100, c: b.per.c / g * 100, f: b.per.f / g * 100, fib: 0, sugar: 0, satfat: 0, salt: 0 };
    const k = S.day || todayKey(); const dd = clone(day(k)); dd.entries = dd.entries || []; dd.acts = dd.acts || []; dd.entries.push(makeEntry({ name: b.name, per100, src: "batch" }, g, "")); saveDay(k, dd);
    b.left -= 1; Store.set("batch", d); toast(`${b.name} : 1 portion notée ${k === todayKey() ? "aujourd'hui" : "le " + fmtDay(k)} (reste ${b.left})`); },
  czBatchDel: el => { const d = clone(Store.get("batch", { items: [] })); d.items = (d.items || []).filter(x => x.id !== el.dataset.v); Store.set("batch", d); },
};
Object.assign(RECIPE_ACT, CZ_ACT);
