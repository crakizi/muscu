// ===================== BILAN DE LA SEMAINE =====================
// Photos des poses (restent sur l'appareil, IndexedDB « muscu_photos »), petit bilan, mensurations optionnelles,
// puis comparaison avec le bilan d'il y a ~1 semaine et d'il y a ~1 mois (ou le plus proche qui existe).
const POSES = [
  { k: "face", l: "Face", d: "Debout, bras le long du corps, relâché", main: true },
  { k: "profil", l: "Profil", d: "De côté (côté droit), bras le long du corps", main: true },
  { k: "dos", l: "Dos", d: "De dos, bras le long du corps, relâché", main: true },
  { k: "fdb", l: "Double biceps face", d: "Bras pliés à hauteur des épaules, contracté", main: false },
  { k: "ddb", l: "Double biceps dos", d: "De dos, bras pliés, dorsaux écartés", main: false },
  { k: "abs", l: "Abdos & cuisses", d: "Mains derrière la tête, abdos et cuisses contractés", main: false },
];
const MEASURES = [["taille", "Tour de taille (nombril)"], ["poitrine", "Poitrine"], ["bras", "Bras (contracté)"], ["cuisse", "Cuisse"], ["fesses", "Hanches / fesses"], ["mollet", "Mollet"], ["epaules", "Épaules"], ["cou", "Cou"]];
const BL_SCALES = [["energie", "Énergie"], ["faim", "Faim"], ["recup", "Récup / sommeil"], ["motiv", "Motivation"]];

// silhouettes simples pour guider la pose
function poseSVG(k) {
  const head = `<circle cx="30" cy="11" r="7"/>`;
  const legs = `<path d="M24 52 L22 84 M36 52 L38 84"/>`;
  const torso = k === "profil" ? `<path d="M30 18 C35 26 35 44 30 52"/>` : `<path d="M22 20 L38 20 L36 52 L24 52 Z"/>`;
  const arms = { face: "M22 22 L18 50 M38 22 L42 50", profil: "M30 22 L32 50", dos: "M22 22 L18 50 M38 22 L42 50", fdb: "M22 22 L10 22 L10 8 M38 22 L50 22 L50 8", ddb: "M22 22 L10 22 L10 8 M38 22 L50 22 L50 8", abs: "M22 22 L16 10 L28 6 M38 22 L44 10 L32 6" }[k];
  const back = k === "dos" || k === "ddb" ? `<path d="M30 21 L30 50" stroke-dasharray="2 3"/>` : "";
  return `<svg viewBox="0 0 60 88" width="44" height="64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="opacity:.55">${head}${torso}${back}<path d="${arms}"/>${legs}</svg>`;
}
const bilans = () => (Store.get("bilans", { items: [] }).items || []).slice().sort((a, b) => a.date.localeCompare(b.date));
function saveBilan(b) { const doc = clone(Store.get("bilans", { items: [] })); doc.items = (doc.items || []).filter(x => x.id !== b.id); doc.items.push(b); Store.set("bilans", doc); }
function weekAvgWeight(k) { const w = [0, 1, 2, 3, 4, 5, 6].map(i => day(addDays(k, -i)).weight).filter(Boolean); return w.length ? r1(w.reduce((s, x) => s + x, 0) / w.length) : null; }
function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 864e5); }
function agoText(n) { // 9 → « il y a 1 semaine et 2 jours », 38 → « il y a 1 mois et 1 semaine »
  if (n <= 0) return "aujourd'hui"; if (n < 7) return `il y a ${n} jour${n > 1 ? "s" : ""}`;
  const parts = [];
  if (n < 30) { const w = Math.floor(n / 7), d = n % 7; parts.push(`${w} semaine${w > 1 ? "s" : ""}`); if (d) parts.push(`${d} jour${d > 1 ? "s" : ""}`); }
  else { const m = Math.floor(n / 30), w = Math.round((n - m * 30) / 7); parts.push(`${m} mois`); if (w) parts.push(`${w} semaine${w > 1 ? "s" : ""}`); }
  return "il y a " + parts.join(" et ");
}
// bilan de référence : le plus récent d'il y a au moins 5 jours (semaine), et le plus proche de 30 jours parmi ceux d'il y a au moins 21 jours (mois)
function refBilans(cur) {
  const prev = bilans().filter(b => b.id !== cur.id && b.date < cur.date);
  const week = prev.filter(b => daysBetween(b.date, cur.date) >= 5).pop() || null;
  const monthC = prev.filter(b => daysBetween(b.date, cur.date) >= 21 && b !== week);
  const month = monthC.sort((a, b) => Math.abs(daysBetween(a.date, cur.date) - 30) - Math.abs(daysBetween(b.date, cur.date) - 30))[0] || null;
  return { week, month };
}
function bilanDue() { const l = bilans().pop(); return !l || daysBetween(l.date, todayKey()) >= 7; }
function photoOf(b, pose) { const id = b?.photos?.[pose]; return id ? PH.list.find(p => p.id === id) : null; }

function bilanSheet() {
  if (!PH.loaded) { PH.loaded = true; phLoad().then(renderSheet).catch(() => {}); }
  const B = S.bl; const todayB = B.date === todayKey();
  const slot = p => { const ph = photoOf(B, p.k); return `<label class="pose ${ph ? "has" : ""}">${ph ? `<img src="${phURL(ph)}">` : poseSVG(p.k)}
      <span class="b xs">${esc(p.l)}</span><span class="xs mut">${ph ? "Touche pour changer" : esc(p.d)}</span>
      <input type="file" accept="image/*" data-file="pose" data-v="${p.k}" hidden></label>`; };
  const nPh = Object.keys(B.photos || {}).length;
  return `<div class="row between"><h2>📸 Bilan ${todayB ? "de la semaine" : "du " + fmtDay(B.date)}</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    <p class="sm mut" style="margin-top:0">Le matin, <b>à jeun</b>, après les toilettes, même endroit et même lumière. Touche une case : tu peux <b>prendre la photo</b> ou la <b>choisir dans ta galerie</b>. Les photos restent uniquement sur ce téléphone.</p>
    <h3>Photos (${nPh})</h3><div class="poses">${POSES.filter(p => p.main).map(slot).join("")}</div>
    <details ${POSES.some(p => !p.main && B.photos?.[p.k]) ? "open" : ""}><summary class="sm b" style="margin:8px 0">+ Poses bonus (double biceps, abdos)</summary><div class="poses">${POSES.filter(p => !p.main).map(slot).join("")}</div></details>
    <h3>Petit bilan</h3>
    <div class="row" style="gap:8px;align-items:center"><span class="sm">Poids à jeun</span><input type="number" step="0.1" inputmode="decimal" data-bl="weight" value="${B.weight ?? ""}" placeholder="kg" style="width:90px">
      <span class="xs mut">${weekAvgWeight(B.date) ? `moyenne 7 j : ${weekAvgWeight(B.date)} kg` : ""}</span></div>
    ${BL_SCALES.map(([k, l]) => `<div style="margin-top:8px"><div class="xs mut">${l} cette semaine</div><div class="scale">${[1, 2, 3, 4, 5].map(i => `<button class="${B[k] === i ? "on" : ""}" data-act="blScale" data-k="${k}" data-v="${i}">${i}</button>`).join("")}</div></div>`).join("")}
    <textarea data-bl="notes" rows="2" placeholder="Note (ressenti, écarts, douleur, ce que tu veux changer…)" style="margin-top:10px">${esc(B.notes || "")}</textarea>
    <details ${Object.keys(B.m || {}).length ? "open" : ""}><summary class="sm b" style="margin:10px 0">Mensurations (optionnel, en cm)</summary>
      <div class="grid2">${MEASURES.map(([k, l]) => `<label class="xs">${l}<input type="number" step="0.5" inputmode="decimal" data-bl="m.${k}" value="${B.m?.[k] ?? ""}"></label>`).join("")}</div></details>
    <button style="width:100%;margin-top:14px" data-act="blSave">Enregistrer et comparer</button>`;
}
function cmpBlock(cur, ref, label) {
  if (!ref) return "";
  const n = daysBetween(ref.date, cur.date);
  const poses = POSES.filter(p => photoOf(cur, p.k) && photoOf(ref, p.k));
  const dW = cur.weight && ref.weight ? r1(cur.weight - ref.weight) : null;
  const goal = profile().goal; const lossGood = goal === "cut" || goal === "recomp";
  const mRows = MEASURES.filter(([k]) => cur.m?.[k] && ref.m?.[k]).map(([k, l]) => { const d = r1(cur.m[k] - ref.m[k]); const good = k === "taille" ? d <= 0 : d >= 0; return `<span class="tag ${d === 0 ? "" : good ? "grn" : "red"}">${l} ${d > 0 ? "+" : ""}${d} cm</span>`; }).join(" ");
  return `<div class="card"><div class="row between"><h3 style="margin:0">${label}</h3><span class="xs mut">${agoText(n)}</span></div>
    <div class="xs mut">${fmtDay(ref.date)} → ${fmtDay(cur.date)}${dW !== null ? ` · poids <b style="color:var(--${(lossGood ? dW <= 0 : dW >= 0) ? "ok,#16a34a" : "txt"})">${dW > 0 ? "+" : ""}${dW} kg</b> (${ref.weight} → ${cur.weight} kg)` : ""}</div>
    ${mRows ? `<div style="margin-top:6px">${mRows}</div>` : ""}
    ${poses.length ? poses.map(p => `<div class="xs b" style="margin-top:10px">${p.l}</div><div class="phpair"><figure><img src="${phURL(photoOf(ref, p.k))}"><figcaption>${fmtDay(ref.date)}</figcaption></figure><figure><img src="${phURL(photoOf(cur, p.k))}"><figcaption>${fmtDay(cur.date)}</figcaption></figure></div>`).join("") : `<p class="xs mut">Pas de photo de la même pose à comparer.</p>`}</div>`;
}
function bilanCmpSheet() {
  const cur = bilans().find(b => b.id === S.blCmp); if (!cur) return "";
  const { week, month } = refBilans(cur);
  return `<div class="row between"><h2>Comparaison</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    ${!week && !month ? `<p class="mut">C'est ton premier bilan 🎉 La comparaison apparaîtra dès le prochain (dans une semaine).</p>` : ""}
    ${cmpBlock(cur, week, "Par rapport à la dernière fois")}${cmpBlock(cur, month, "Par rapport à il y a environ 1 mois")}
    <button class="sec" style="width:100%" data-act="blOpen" data-v="${cur.id}">Modifier ce bilan</button>`;
}
function bilanCardHTML() {
  const all = bilans(); const last = all[all.length - 1];
  if (!PH.loaded && window.indexedDB) { PH.loaded = true; phLoad().then(() => { if (S.tab === "progress") render(); }).catch(() => {}); }
  return `<div class="card"><div class="row between"><h2 style="margin:0">Bilan de la semaine</h2>${last ? `<span class="xs mut">dernier : ${agoText(daysBetween(last.date, todayKey()))}</span>` : ""}</div>
    <p class="xs mut">Une fois par semaine, le même jour, le matin à jeun : photos des poses, poids, petit ressenti. Mensurations si tu veux.</p>
    <button style="width:100%" data-act="blOpen">${last && last.date === todayKey() ? "Compléter le bilan d'aujourd'hui" : "📸 Faire mon bilan"}</button>
    ${all.length ? `<div style="display:flex;gap:8px;overflow-x:auto;margin-top:10px">${all.slice().reverse().map(b => { const ph = photoOf(b, "face") || POSES.map(p => photoOf(b, p.k)).find(Boolean); return `<div data-act="blCmp" data-v="${b.id}" style="flex:none;width:74px;text-align:center;cursor:pointer">${ph ? `<img src="${phURL(ph)}" style="width:74px;height:98px;object-fit:cover;border-radius:10px">` : `<div style="width:74px;height:98px;border-radius:10px;background:var(--chip);display:grid;place-items:center">${poseSVG("face")}</div>`}<div class="xs">${fmtDay(b.date).replace(/^\w+ /, "")}</div><div class="xs mut">${b.weight ? b.weight + " kg" : ""}</div></div>`; }).join("")}</div><p class="xs mut">Touche un bilan pour le comparer.</p>` : ""}</div>`;
}
function blReadForm() {
  document.querySelectorAll("[data-bl]").forEach(i => { const k = i.dataset.bl, v = i.value.trim();
    if (k.startsWith("m.")) { S.bl.m = S.bl.m || {}; const mk = k.slice(2); if (v) S.bl.m[mk] = +v.replace(",", "."); else delete S.bl.m[mk]; }
    else if (k === "weight") S.bl.weight = v ? +v.replace(",", ".") : null; else S.bl[k] = v; });
}
async function onPoseFile(pose, file) {
  if (!file) return; blReadForm();
  try { const b = await shrinkImage(file, 1400); const old = S.bl.photos?.[pose];
    const it = await phAdd(b, pose, S.bl.date);
    S.bl.photos = Object.assign({}, S.bl.photos, { [pose]: it.id }); if (old) phDel(old).catch(() => {});
    saveBilan(S.bl); toast("Photo ajoutée 📸"); } catch (e) { toast("Impossible d'enregistrer la photo"); }
  renderSheet();
}
const BL_ACT = {
  blOpen: el => { const id = el.dataset.v; const all = bilans();
    S.bl = clone(id ? all.find(b => b.id === id) : all.find(b => b.date === todayKey()) || { id: uid(), date: todayKey(), photos: {}, m: {}, weight: day(todayKey()).weight || null });
    openSheet(bilanSheet); },
  blScale: el => { blReadForm(); S.bl[el.dataset.k] = S.bl[el.dataset.k] === +el.dataset.v ? null : +el.dataset.v; renderSheet(); },
  blSave: () => { blReadForm(); const b = S.bl; if (!b.weight && !Object.keys(b.photos || {}).length) { toast("Ajoute au moins une photo ou ton poids"); return; }
    b.t = Date.now(); saveBilan(b);
    if (b.weight && b.date === todayKey() && !day(todayKey()).weight) { const d = clone(day(todayKey())); d.weight = b.weight; saveDay(todayKey(), d); }
    S.blCmp = b.id; openSheet(bilanCmpSheet); render(); },
  blCmp: el => { S.blCmp = el.dataset.v; openSheet(bilanCmpSheet); },
};
