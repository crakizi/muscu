// ===================== FRIGO (inventaire) =====================
const fridgeDoc = () => Store.get("fridge", {});
const fridgeItems = () => (fridgeDoc().items || []).filter(i => i && i.qty > 0);
function saveFridgeItems(items) { const d = clone(fridgeDoc()) || {}; d.items = items; Store.set("fridge", d); }
const normN = s => (s || "").toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)/g, "").trim();
const qtyTxt = it => it.unit === "pc" ? `${r1(it.qty)} pièce${it.qty > 1 ? "s" : ""}` : it.qty >= 1000 ? `${r1(it.qty / 1000)} kg` : `${r0(it.qty)} g`;
function fridgeFind(name) {
  const n = normN(name); if (!n) return null;
  const items = fridgeItems();
  const W = s => s.split(/[^a-z0-9]+/).filter(w => w.length > 2 && !["les", "des", "aux", "avec", "cuit", "cru", "crue", "cuite"].includes(w));
  const nw = W(n);
  return items.find(i => normN(i.name) === n) || items.find(i => { const mw = W(normN(i.name)); if (!mw.length || !nw.length) return false; const [a, b] = mw.length <= nw.length ? [mw, nw] : [nw, mw]; return a.every(w => b.some(x => x === w || x === w + "s" || w === x + "s")); }) || null;
}
// quand il mange quelque chose qui est dans le frigo, on le retire
function fridgeConsume(name, g) {
  const it = fridgeFind(name); if (!it || !(g > 0)) return null;
  const items = clone(fridgeDoc().items || []); const x = items.find(i => i.id === it.id);
  x.qty = x.unit === "pc" ? x.qty - g / (x.gPerPc || 100) : x.qty - g;
  if (x.qty <= 0.05) x.qty = 0;
  saveFridgeItems(items.filter(i => i.qty > 0));
  return x;
}
function fridgeAdd(list) {
  const items = clone(fridgeDoc().items || []);
  list.forEach(n => {
    const ex = items.find(i => normN(i.name) === normN(n.name) && i.unit === n.unit && (i.zone || "frigo") === (n.zone || "frigo"));
    if (ex) { ex.qty += n.qty; if (n.exp && (!ex.exp || n.exp < ex.exp)) ex.exp = n.exp; } else items.push(Object.assign({ id: uid(), added: Date.now(), zone: "frigo", unit: "g" }, n, { cat: n.cat || guessCat(n.name) }));
  });
  saveFridgeItems(items);
}
function fridgeText() { return fridgeItems().map(i => `${i.name} (${qtyTxt(i)}, ${FRIDGE_ZONES[i.zone || "frigo"]})`).join(", "); }

// ---- péremption (date facultative « exp » sur chaque article, AAAA-MM-JJ) ----
function expDays(it) { if (!it || !it.exp) return null; const d = parseKey(it.exp), t = parseKey(todayKey()); return Math.round((d - t) / 864e5); }
const expSoon = it => { const d = expDays(it); return d != null && d <= 3; };
const expTxt = it => { const d = expDays(it); return d == null ? "" : d < 0 ? "périmé" : d === 0 ? "aujourd'hui" : d === 1 ? "demain" : `dans ${d} j`; };
function fridgeRow(i) {
  const e = expTxt(i);
  return `<div class="entry"><div data-act="fridgeEdit" data-v="${i.id}" style="flex:1"><div>${esc(i.name)}${e ? ` <span class="tag${expSoon(i) ? " soon" : ""}">${e}</span>` : ""}</div><div class="xs mut">${qtyTxt(i)} · ${FRIDGE_CATS[i.cat] || ""}</div></div><button class="small sec" data-act="fridgeEat" data-v="${i.id}">Manger</button></div>`;
}
// ---- API frigo pour les autres modules ----
function pantryList() { return fridgeItems().map(i => ({ id: i.id, name: i.name, qty: i.qty, unit: i.unit || "g", gPerPc: i.gPerPc || null, zone: i.zone || "frigo", cat: i.cat || "", exp: i.exp || null, daysLeft: expDays(i) })); }
function pantryHas(nom) { return !!fridgeFind(nom); }
function pantryUse(nom, qte) { return fridgeConsume(nom, +qte || 0); }
Object.assign(window, { pantryList, pantryHas, pantryUse });

const CZ_SUBS = [["frigo", "🧊 Frigo"], ["courses", "🛒 Courses"], ["recettes", "🍲 Avec ce que j'ai"], ["batch", "🍱 Batch"], ["budget", "💶 Budget"]];
function viewFridge() {
  const items = fridgeItems(); const sub = S.cz || "frigo";
  const cnt = { courses: typeof shopItems === "function" ? shopItems().filter(x => !x.done).length : 0, batch: typeof batchItems === "function" ? batchItems().reduce((t, b) => t + (b.left > 0 ? b.left : 0), 0) : 0 };
  const subs = `<div class="chips czsubs" style="margin-bottom:10px">${CZ_SUBS.map(([k, l]) => `<button class="chip ${sub === k ? "on" : ""}" data-act="czSub" data-v="${k}">${l}${cnt[k] ? ` <b>${cnt[k]}</b>` : ""}</button>`).join("")}</div>`;
  const head = `${statusBanner()}<div class="row between"><h1>Mon frigo</h1></div>${subs}`;
  if (sub !== "frigo" && typeof cuisineSubHTML === "function") return head + cuisineSubHTML(sub);
  const soon = items.filter(expSoon).sort((a, b) => expDays(a) - expDays(b));
  const soonCard = soon.length ? `<div class="card czsoon"><h3>⏳ À finir vite <span class="mut sm">${soon.length}</span></h3>${soon.map(fridgeRow).join("")}<button class="sec small" style="margin-top:6px" data-act="czSub" data-v="recettes">Recettes qui les utilisent</button></div>` : "";
  const zones = Object.keys(FRIDGE_ZONES).map(z => {
    const list = items.filter(i => (i.zone || "frigo") === z); if (!list.length) return "";
    return `<div class="card"><h3>${FRIDGE_ZONES[z]} <span class="mut sm">${list.length}</span></h3>${list.map(fridgeRow).join("")}</div>`;
  }).join("");
  return `${head}${soonCard}
    <div id="scene3d" style="height:60vh;min-height:380px;border-radius:16px;overflow:hidden;margin-bottom:10px;background:var(--chip)"></div>
    <p class="xs mut c" style="margin-top:-4px">Fais glisser pour tourner, pince pour zoomer, touche un aliment pour le modifier.</p>
    <div class="row" style="margin-bottom:10px"><button class="grow" data-act="fridgeAddOpen">+ Ajouter</button><button class="sec grow" data-act="fridgeShop">Courses (IA)</button></div>
    <button class="sec" style="width:100%;margin-bottom:12px" data-act="aiFridge">👨‍🍳 Recette avec ce que j'ai</button>
    ${zones || `<div class="card"><p class="mut sm">Ton frigo est vide. Ajoute ce que tu as (même partiellement) : quand tu manges un aliment présent dans le frigo, il est retiré automatiquement.</p></div>`}`;
}
function fridgeItemSheet(id) {
  return () => {
    const it = (fridgeDoc().items || []).find(i => i.id === id); if (!it) return "";
    return `<div class="row between"><h2>${esc(it.name)}</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
      <div class="row"><div class="grow"><label>Quantité</label><input id="fiQ" type="number" inputmode="decimal" value="${r1(it.qty)}"></div>
      <div><label>Unité</label><select id="fiU"><option value="g" ${it.unit !== "pc" ? "selected" : ""}>g</option><option value="pc" ${it.unit === "pc" ? "selected" : ""}>pièces</option></select></div>
      <div class="grow"><label>g par pièce</label><input id="fiP" type="number" inputmode="decimal" value="${it.gPerPc || ""}"></div></div>
      <div class="row"><div class="grow"><label>Rangement</label><select id="fiZ">${Object.entries(FRIDGE_ZONES).map(([k, v]) => `<option value="${k}" ${(it.zone || "frigo") === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="grow"><label>Catégorie</label><select id="fiC">${Object.entries(FRIDGE_CATS).map(([k, v]) => `<option value="${k}" ${it.cat === k ? "selected" : ""}>${v}</option>`).join("")}</select></div></div>
      <label>À consommer avant (facultatif)</label><input id="fiE" type="date" value="${it.exp || ""}">
      <div class="row" style="margin-top:12px"><button class="danger grow" data-act="fridgeDel" data-v="${id}">Supprimer</button><button class="sec grow" data-act="fridgeEat" data-v="${id}">Manger</button><button class="grow" data-act="fridgeSave" data-v="${id}">Enregistrer</button></div>`;
  };
}
function fridgeEatSheet(id) {
  return () => {
    const it = (fridgeDoc().items || []).find(i => i.id === id); if (!it) return "";
    const food = it.per100 ? it : allFoods().find(f => normN(f.name) === normN(it.name)) || null;
    const def = it.unit === "pc" ? (it.gPerPc || 100) : Math.min(it.qty, 150);
    return `<div class="row between"><h2>Manger : ${esc(it.name)}</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
      <label>Quantité mangée (g)</label><input id="feG" type="number" inputmode="decimal" value="${r0(def)}">
      <label>Repas (facultatif)</label><select id="feM"><option value="">Sans repas</option>${MEALS.map(m => `<option>${m}</option>`).join("")}</select>
      ${food ? "" : `<p class="xs mut">Valeurs nutritionnelles inconnues pour cet aliment : l'IA va les estimer.</p>`}
      <button style="width:100%;margin-top:10px" data-act="fridgeEatGo" data-v="${id}" ${S.busy.eat ? "disabled" : ""}>${S.busy.eat ? '<span class="spin"></span>' : "Ajouter au journal et retirer du frigo"}</button>`;
  };
}
function fridgeAddSheet() {
  const q = S.fq || ""; const res = searchFoods(q).slice(0, 12); S._fres = res;
  return `<div class="row between"><h2>Ajouter au frigo</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    <div class="row" style="margin-bottom:8px"><button class="grow" data-act="fridgeScan">📷 Scanner un code-barres</button><label class="btn grow" style="text-align:center;background:var(--chip);color:var(--txt)">📸 Photo produit<input type="file" accept="image/*" multiple data-file="fridgephotos" style="display:none"></label></div>
    <input placeholder="Aliment (ex. blanc de poulet, skyr…)" value="${esc(q)}" data-input="fq" autocomplete="off">
    <div id="fres">${fridgeResHTML(res, q)}</div>`;
}
function fridgeResHTML(res, q) {
  return (q ? `<div class="entry" data-act="fridgePick" data-i="-1"><div><b>« ${esc(q)} »</b><div class="xs mut">ajouter tel quel</div></div><div class="mut">+</div></div>` : "") +
    res.map((f, i) => `<div class="entry" data-act="fridgePick" data-i="${i}"><div>${esc(f.name)}${f.brand ? ` <span class="xs mut">${esc(f.brand)}</span>` : ""}</div><div class="mut">+</div></div>`).join("");
}
function fridgeQtySheet(food) {
  return () => `<div class="row between"><h2>${esc(food.name)}</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    <div class="row"><div class="grow"><label>Quantité</label><input id="fqQ" type="number" inputmode="decimal" value="${food.unit ? 1 : 500}"></div>
    <div><label>Unité</label><select id="fqU"><option value="g" ${food.unit ? "" : "selected"}>g</option><option value="pc" ${food.unit ? "selected" : ""}>pièces</option></select></div>
    <div class="grow"><label>g par pièce</label><input id="fqP" type="number" inputmode="decimal" value="${food.unit || ""}"></div></div>
    <label>Rangement</label><select id="fqZ">${Object.entries(FRIDGE_ZONES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
    <label>À consommer avant (facultatif)</label><input id="fqE" type="date">
    <button style="width:100%;margin-top:10px" data-act="fridgeQtyGo">Ajouter</button>`;
}
function fridgeShopSheet() {
  const F = S.shop || (S.shop = {});
  if (F.items) return `<div class="row between"><h2>Vérifie tes courses</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    ${F.items.map((x, i) => `<div class="entry"><div class="grow">${esc(x.name)}<div class="xs mut">${FRIDGE_ZONES[x.zone] || "Frigo"} · ${FRIDGE_CATS[x.cat] || ""}</div></div><input type="number" inputmode="decimal" value="${r1(x.qty)}" style="width:70px" data-input="shopQ" data-i="${i}"><span class="xs mut">${x.unit === "pc" ? "pc" : "g"}</span><button class="danger small" data-act="shopDel" data-v="${i}">✕</button></div>`).join("")}
    <div class="row" style="margin-top:10px"><button class="sec grow" data-act="shopReset">Recommencer</button><button class="grow" data-act="shopAdd">Tout ranger</button></div>`;
  return `<div class="row between"><h2>Courses (IA)</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    <label>Décris ce que tu as acheté (ou dicte-le)</label><textarea id="shopTxt" placeholder="ex. 1 kg de blanc de poulet, 12 œufs, 4 skyr Hacendado, 1 brocoli, 6 bananes, 1 kg de riz">${esc(F.txt || "")}</textarea>
    <button style="width:100%;margin-top:8px" data-act="shopGo" ${F.busy ? "disabled" : ""}>${F.busy ? '<span class="spin"></span> Analyse…' : "Analyser"}</button>
    <p class="xs mut c">ou</p><label class="btn sec" style="display:block;text-align:center;background:var(--chip);color:var(--txt)">📷 Photo du ticket ou des courses<input type="file" accept="image/*" data-file="shop" style="display:none"></label>
    ${F.err ? `<div class="banner">${esc(F.err)}</div>` : ""}`;
}
async function aiShop(text, blob) {
  return aiJSON(`Tu ranges les courses d'un étudiant (supermarchés Alcampo, Mercadona, Ahorramas en Espagne). ${text ? "Il décrit : " + text : "Voici une photo de son ticket de caisse ou de ses courses : lis chaque produit alimentaire."}
Pour chaque aliment donne : name (nom simple en français), qty (nombre), unit ("g" pour un poids, "pc" pour des pièces/pots/unités), gPerPc (poids d'une pièce en g si unit=pc), cat (une parmi : laitier, viande, poisson, oeufs, legume, fruit, fromage, boisson, sauce, feculent, surgele, autre), zone (frigo, congel ou placard selon où ça se range), per100 (valeurs nutritionnelles pour 100 g : kcal, p, c, f, fib, sugar, satfat, salt).
Ignore ce qui n'est pas alimentaire. Réponds UNIQUEMENT en JSON : {"items":[{"name":"","qty":n,"unit":"g","gPerPc":null,"cat":"","zone":"frigo","per100":{"kcal":n,"p":n,"c":n,"f":n,"fib":n,"sugar":n,"satfat":n,"salt":n}}]}`, blob ? [blob] : null);
}

// ===================== SALLE 3D : choix machine → exercice → saisie =====================
function machineSheet(mid) {
  return () => {
    const m = GYM_MACHINES.find(x => x.id === mid); if (!m) return "";
    return `<div class="row between"><h2>${esc(m.label)}</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
      ${m.ex.length ? `<p class="sm mut">Quel exercice fais-tu sur cette machine ?</p>` : `<p class="sm">Zone cardio (tapis, vélos, rameurs). Note ton cardio dans Aujourd'hui → « Sport en plus ».</p>`}
      ${m.ex.map(id => { const x = getEx(id); return `<div class="entry" data-act="gymPickEx" data-v="${id}"><div style="width:96px;flex:none">${bodyThumbHTML({ prim: x.prim, sec: x.sec, focus: x.focus })}</div><div class="grow"><div class="b">${esc(x.name)}</div><div class="xs mut">${x.focus.map(f => MUSCLES[f][0]).join(", ")}</div></div><button class="sec small" data-act="showMusc" data-v="${id}" title="Voir comment faire">🎬</button><div class="mut">›</div></div>`; }).join("")}
      ${m.ex.length ? `<p class="xs mut">🎬 = voir le mannequin faire le mouvement, avec les variantes.</p>` : ""}`;
  };
}
function gymExSheet(exId) {
  return () => {
    const w = liveWorkout(); if (!w) return ""; const i = (w.ex || []).findIndex(e => e.id === exId); if (i < 0) return "";
    return `<div class="row between"><span class="mut sm">${esc(w.name)} · ${fmtDur(Date.now() - w.start)}</span><button class="sec small" data-act="closeSheet">Fermer</button></div>${exCard(w, w.ex[i], i)}`;
  };
}
