// ===================== AMIS (lot 1) =====================
// Facultatif, privé par défaut, désactivable entièrement (Profil → Amis).
// On ajoute à son profil une copie figée d'une séance, d'une recette, d'un repas ou d'une diète.
// Le profil a deux sections : Alimentation et Sport. Les amis copient en 1 tap. SQL : dev/schema.sql.
const FR = { me: undefined, links: [], people: {}, mine: [], shares: {}, loading: false, err: "" };
const FR_KIND = { workout: ["🏋️", "sport", "Séance"], recipe: ["🍳", "food", "Recette"], meal: ["🍽️", "food", "Repas"], diet: ["📅", "food", "Diète"] };

const frAvail = () => typeof Sync !== "undefined" && !!Sync.sess();
const frOn = () => !!(Store.get("settings", {}) || {}).friendsOn && frAvail();
const frMeId = () => Sync.sess()?.user?.id;
const frApi = (path, opt) => Sync.api(path, opt);
const frRpc = (fn, body = {}) => frApi(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(body) });
const frErr = e => { const m = String(e?.message || e || ""); return /does not exist|404|PGRST/.test(m) ? "Amis pas encore installé sur le serveur (dev/schema.sql)." : /duplicate|unique/.test(m) ? "Pseudo déjà pris." : m; };

async function frLoad(force) {
  if (!frOn() || (FR.loading && !force)) return; FR.loading = true; FR.err = "";
  try {
    FR.me = await frRpc("fr_me");
    if (FR.me) {
      const me = frMeId();
      FR.links = await frApi("/rest/v1/fr_links?select=requester,target,status") || [];
      const ids = [...new Set(FR.links.map(l => l.requester === me ? l.target : l.requester))];
      FR.people = {}; if (ids.length) (await frApi(`/rest/v1/fr_profiles?select=user_id,pseudo,is_public&user_id=in.(${ids.join(",")})`) || []).forEach(p => FR.people[p.user_id] = p);
      FR.mine = await frApi(`/rest/v1/fr_shares?select=id,kind,ref,section,title,summary,created_at&owner=eq.${me}&order=created_at.desc`) || [];
    }
  } catch (e) { FR.err = frErr(e); }
  FR.loading = false; FR.loaded = true; render(); if (S.sheet) renderSheet();
}
async function frLoadShares(uid) {
  try { FR.shares[uid] = await frApi(`/rest/v1/fr_shares?select=id,kind,section,title,summary,payload,created_at&owner=eq.${uid}&order=created_at.desc`) || []; }
  catch (e) { FR.shares[uid] = []; FR.err = frErr(e); }
  render();
}
const frFriends = () => { const me = frMeId(); return FR.links.filter(l => l.status === "accepted").map(l => FR.people[l.requester === me ? l.target : l.requester]).filter(Boolean); };
const frRequests = () => FR.links.filter(l => l.status === "pending" && l.target === frMeId()).map(l => FR.people[l.requester]).filter(Boolean);
const frSent = () => FR.links.filter(l => l.status === "pending" && l.requester === frMeId()).map(l => FR.people[l.target]).filter(Boolean);
const frInit = p => esc((p?.pseudo || "?").slice(0, 1).toUpperCase());

// --- Carte dans Profil ---
function frProfileCard() {
  if (!frAvail()) return `<div class="card"><h2>Amis</h2><p class="xs mut">Connecte-toi (Synchronisation) pour utiliser Amis.</p></div>`;
  if (!frOn()) return `<div class="card row between"><div><h2 style="margin:0">Amis</h2><div class="xs mut">Désactivé · rien n'est partagé</div></div><button class="sec small" data-act="frEnable">Activer</button></div>`;
  if (!FR.loaded) setTimeout(frLoad, 0);
  const n = frFriends().length, rq = frRequests().length;
  return `<div class="card entry" data-act="tab" data-v="friends" style="border:0"><div><h2 style="margin:0">Amis${rq ? ` <span class="fr-dot">${rq}</span>` : ""}</h2><div class="xs mut">${FR.me ? `${n} ami${n > 1 ? "s" : ""} · profil ${FR.me.is_public ? "public" : "privé"}` : "À configurer"}</div></div><div class="mut">›</div></div>`;
}

// --- Écran Amis ---
function viewFriends() {
  if (!frOn()) { S.tab = "profile"; return viewProfile(); }
  if (!FR.loaded) setTimeout(frLoad, 0);
  const back = `<div class="row between" style="margin-bottom:6px"><button class="sec small" data-act="${S.frView ? "frBack" : "tab"}" data-v="profile">‹ ${S.frView ? "Amis" : "Profil"}</button>${FR.loading ? '<span class="spin"></span>' : ""}</div>`;
  const err = FR.err ? `<div class="reco">${esc(FR.err)}</div>` : "";
  if (!FR.loaded) return `${back}<h1>Amis</h1><p class="mut sm">Chargement…</p>`;
  if (!FR.me) return `${back}<h1>Amis</h1>${err}<div class="card"><h2>Ton pseudo</h2><p class="xs mut">C'est le seul nom que tes amis verront. Profil privé au départ.</p>
    <input id="frPseudo" maxlength="24" placeholder="ex. vuthy_fit"><button style="width:100%;margin-top:8px" data-act="frCreate">Créer mon profil Amis</button></div>`;
  if (S.frView) return back + frProfileView(S.frView) + err;
  const rq = frRequests(), fr = frFriends(), sent = frSent();
  return `${back}<h1>Amis</h1>${err}
    <div class="card"><div class="row" style="gap:8px"><button class="sec" data-act="frInvite">🔗 Inviter</button><input id="frCode" placeholder="Code ami" style="flex:1" value="${esc(S.frPrefill || "")}"><button data-act="frAdd">Ajouter</button></div>
      ${sent.length ? `<p class="xs mut" style="margin:6px 0 0">En attente : ${sent.map(p => esc(p.pseudo)).join(", ")}</p>` : ""}</div>
    ${rq.map(p => `<div class="card row between fr-req"><span class="sm"><b>${esc(p.pseudo)}</b> veut t'ajouter</span><span class="row" style="gap:6px"><button class="small" data-act="frAnswer" data-v="${p.user_id}" data-ok="1">Accepter</button><button class="small sec" data-act="frAnswer" data-v="${p.user_id}" data-ok="">Refuser</button></span></div>`).join("")}
    <div class="card"><div class="fr-people">
      <button class="fr-person" data-act="frOpen" data-v="${frMeId()}"><span class="fr-av fr-me">${frInit(FR.me)}</span>Moi</button>
      ${fr.map(p => `<button class="fr-person" data-act="frOpen" data-v="${p.user_id}"><span class="fr-av">${frInit(p)}</span>${esc(p.pseudo)}</button>`).join("")}
    </div>${fr.length ? "" : `<p class="xs mut" style="margin:8px 0 0">Invite un ami avec ton lien, ou entre son code.</p>`}</div>
    <details class="card" ${S.frSet ? "open" : ""}><summary class="sm" data-act="frSetT">Réglages</summary>
      <label>Pseudo</label><input id="frPseudo" maxlength="24" value="${esc(FR.me.pseudo)}">
      <label>Mon profil</label><div class="chips"><button class="chip ${FR.me.is_public ? "" : "on"}" data-act="frPublic" data-v="">Privé</button><button class="chip ${FR.me.is_public ? "on" : ""}" data-act="frPublic" data-v="1">Public</button></div>
      <p class="xs mut">${FR.me.is_public ? "Tout le monde peut te trouver par ton pseudo et voir ce que tu as ajouté à ton profil." : "Seuls tes amis voient ton profil. On t'ajoute avec ton code, et tu acceptes."} Ton journal, ton poids et tes photos restent toujours privés.</p>
      <div class="row" style="gap:8px"><button class="sec small" data-act="frRename">Enregistrer le pseudo</button><button class="danger small" data-act="frDisable">${S.frConfirm === "off" ? "Confirmer : tout retirer" : "Désactiver Amis"}</button></div>
    </details>`;
}
function frProfileView(uid) {
  const me = uid === frMeId(); const p = me ? FR.me : FR.people[uid];
  const list = me ? FR.mine : FR.shares[uid]; if (!me && !list) setTimeout(() => frLoadShares(uid), 0);
  const sec = S.frSec || "food"; const items = (list || []).filter(s => s.section === sec);
  const row = s => { const [ic] = FR_KIND[s.kind] || ["•"];
    const btn = me ? `<button class="small sec" data-act="frUnshare" data-v="${s.id}">Retirer</button>`
      : `<button class="small" data-act="frCopy" data-v="${s.id}">${S.frConfirm === s.id ? "Remplacer mon plan ?" : "Copier"}</button>`;
    return `<div class="entry"><span class="fr-ic">${ic}</span><div class="grow"><div class="b sm">${esc(s.title)}</div><div class="xs mut">${esc(s.summary || "")}</div></div>${btn}</div>`; };
  return `<div class="row" style="gap:12px;align-items:center;margin:4px 0 12px"><span class="fr-av fr-big ${me ? "fr-me" : ""}">${frInit(p)}</span><div><h1 style="margin:0">${esc(p?.pseudo || "")}</h1><div class="xs mut">${me ? `Ton profil · ${FR.me.is_public ? "public" : "privé"}` : "Ami"}</div></div></div>
    <div class="chips" style="margin-bottom:8px"><button class="chip ${sec === "food" ? "on" : ""}" data-act="frSec" data-v="food">🍽️ Alimentation</button><button class="chip ${sec === "sport" ? "on" : ""}" data-act="frSec" data-v="sport">🏋️ Sport</button></div>
    <div class="card">${list ? items.map(row).join("") || `<p class="mut sm">${me ? (sec === "food" ? "Ajoute une recette, un repas ou ta diète avec « Ajouter à mon profil »." : "Ajoute une séance terminée avec « Ajouter à mon profil ».") : "Rien ici pour l'instant."}</p>` : '<span class="spin"></span>'}</div>
    ${me ? "" : `<button class="sec small" data-act="frRemove" data-v="${uid}">${S.frConfirm === "rm" + uid ? "Confirmer" : "Retirer cet ami"}</button>`}`;
}

// --- Bouton « Ajouter à mon profil » (séance, recette, repas, diète) ---
function frShareBtn(kind, ref) {
  if (!frOn() || !FR.me) { if (frOn() && !FR.loaded) setTimeout(frLoad, 0); return ""; }
  const s = FR.mine.find(x => x.kind === kind && x.ref === String(ref));
  return s ? `<div class="row between fr-share"><span class="xs mut">✓ Sur ton profil Amis</span><button class="sec small" data-act="frUnshare" data-v="${s.id}">Retirer</button></div>`
    : `<button class="sec fr-share" style="width:100%" data-act="frShare" data-k="${kind}" data-v="${esc(String(ref))}">👥 Ajouter à mon profil</button>`;
}
function frBuild(kind, ref) {
  if (kind === "workout") {
    const w = Store.get(ref); if (!w) return null;
    const ex = (w.ex || []).filter(e => workSets(e).length).map(e => { const g = getEx(e.id); return { id: e.id, name: g.name, cat: g.cat, prim: g.prim || [], sec: g.sec || [], sets: workSets(e).map(s => ({ w: s.w, r: s.r })) }; });
    if (!ex.length) return null;
    return { title: w.name, summary: `${ex.length} exercices · ${ex.reduce((a, e) => a + e.sets.length, 0)} séries`, payload: { name: w.name, ex } };
  }
  if (kind === "recipe") {
    const r = recipes().find(x => x.id === ref); if (!r) return null; const f = recipeAsFood(r);
    return { title: r.name, summary: `${r.portions || 1} part${(r.portions || 1) > 1 ? "s" : ""} · ${r0(f.per100.kcal * f.unit / 100)} kcal la part`, payload: { name: r.name, portions: r.portions, cookedG: r.cookedG, ings: r.ings } };
  }
  if (kind === "meal") {
    const d = day(S.day); const e = (d.entries || []).find(x => x.id === ref); if (!e) return null;
    const ents = e.meal ? d.entries.filter(x => x.meal === e.meal) : [e];
    const kcal = ents.reduce((a, x) => a + (x.n?.kcal || 0), 0), p = ents.reduce((a, x) => a + (x.n?.p || 0), 0);
    return { title: e.meal ? `${e.meal} : ${ents.map(x => x.name).slice(0, 3).join(", ")}${ents.length > 3 ? "…" : ""}` : e.name, summary: `${ents.length} aliment${ents.length > 1 ? "s" : ""} · ${r0(kcal)} kcal · P ${r0(p)} g`,
      payload: { meal: e.meal || "", items: ents.map(x => ({ name: x.name, brand: x.brand || "", g: x.g, per100: x.per100, unit: x.unit || null })) } };
  }
  if (kind === "diet") {
    const P = Store.get("mealplan", null); if (!P?.days?.length) return null;
    const kcal = P.days.reduce((a, d) => a + d.meals.reduce((t, m) => t + (+m.kcal || 0), 0), 0) / P.days.length;
    return { title: `Diète ${P.days.length} jours`, summary: `≈ ${r0(kcal)} kcal par jour · ${P.days[0].meals.length} repas`, payload: { days: P.days, shopping: P.shopping || [], kcal } };
  }
  return null;
}
// Copie dans mes données (fonctions existantes : programme, recettes, journal, plan de repas).
function frApply(s) {
  const P = s.payload || {}; const from = FR.people[s.owner]?.pseudo || "un ami";
  if (s.kind === "workout") {
    const doc = clone(Store.get("program", {})); doc.templates = doc.templates || {}; doc.customEx = doc.customEx || {};
    (P.ex || []).forEach(e => { if (!EX[e.id] && !doc.customEx[e.id]) doc.customEx[e.id] = { id: e.id, name: e.name, cat: e.cat || "Mes exercices", prim: e.prim || [], sec: e.sec || [], focus: e.prim || [] }; });
    let name = P.name || "Séance"; const all = program(); if (all[name]) name = `${name} (${from})`; let i = 2; while (all[name]) name = `${P.name} (${from} ${i++})`;
    doc.templates[name] = { warmup: false, ex: (P.ex || []).map(e => e.id) }; Store.set("program", doc);
    return `« ${name} » ajoutée à tes séances`;
  }
  if (s.kind === "recipe") {
    const doc = clone(Store.get("recipes", { items: [] })); doc.items = doc.items || [];
    doc.items.unshift({ id: uid(), name: P.name, portions: P.portions, cookedG: P.cookedG, ings: clone(P.ings || []) }); Store.set("recipes", doc);
    return `« ${P.name} » ajoutée à tes recettes`;
  }
  if (s.kind === "meal") {
    updDay(d => (P.items || []).forEach(x => d.entries.push(makeEntry({ name: x.name, brand: x.brand, per100: x.per100, unit: x.unit, src: "ami" }, x.g, P.meal || null))));
    return `Repas noté le ${fmtDay(S.day)}`;
  }
  if (s.kind === "diet") {
    const T = targets(); const k = P.kcal > 0 ? Math.min(1.6, Math.max(0.6, T.kcal / P.kcal)) : 1;
    const days = clone(P.days || []).map(d => Object.assign(d, { meals: d.meals.map(m => Object.assign(m, { kcal: r0(m.kcal * k), p: r0(m.p * k), c: r0(m.c * k), f: r0(m.f * k), ingredients: (m.ingredients || []).map(i => Object.assign(i, { g: r0(i.g * k) })) })) }));
    Store.set("mealplan", { days, shopping: clone(P.shopping || []), created: Date.now(), from });
    return `Diète copiée, portions ajustées à tes ${T.kcal} kcal`;
  }
}

const FR_ACT = {
  frEnable: () => { Store.set("settings", Object.assign({}, Store.get("settings", {}), { friendsOn: true })); FR.loaded = false; S.tab = "friends"; render(); },
  frCreate: async () => { const ps = ($("#frPseudo")?.value || "").trim(); if (ps.length < 2) { toast("Choisis un pseudo (2 caractères minimum)"); return; }
    try { await frApi("/rest/v1/fr_profiles", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ pseudo: ps }) }); await frLoad(true); } catch (e) { toast(frErr(e)); } },
  frRename: async () => { const ps = ($("#frPseudo")?.value || "").trim(); if (ps.length < 2) return;
    try { await frApi(`/rest/v1/fr_profiles?user_id=eq.${frMeId()}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ pseudo: ps, updated_at: new Date().toISOString() }) }); FR.me.pseudo = ps; toast("Pseudo enregistré"); render(); } catch (e) { toast(frErr(e)); } },
  frPublic: async el => { const v = !!el.dataset.v; S.frSet = true; try { await frApi(`/rest/v1/fr_profiles?user_id=eq.${frMeId()}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_public: v, updated_at: new Date().toISOString() }) }); FR.me.is_public = v; render(); } catch (e) { toast(frErr(e)); } },
  frInvite: async () => { const link = `${location.origin}${location.pathname}#ami=${FR.me.code}`; const txt = `Ajoute-moi dans l'app (code ${FR.me.code}) : ${link}`;
    try { if (navigator.share) await navigator.share({ text: txt }); else { await navigator.clipboard.writeText(txt); toast(`Lien copié · code ${FR.me.code}`); } } catch (e) { toast(`Ton code : ${FR.me.code}`); } },
  frAdd: async () => { const c = ($("#frCode")?.value || "").trim(); if (!c) return;
    try { const r = await frRpc("fr_add", { p_code: c }); S.frPrefill = ""; toast(r.status === "accepted" ? `${r.pseudo} est ton ami` : `Demande envoyée à ${r.pseudo}`); await frLoad(true); } catch (e) { toast(frErr(e)); } },
  frAnswer: async el => { try { await frRpc("fr_answer", { p_from: el.dataset.v, p_ok: !!el.dataset.ok }); await frLoad(true); } catch (e) { toast(frErr(e)); } },
  frOpen: el => { S.frView = el.dataset.v; S.frSec = S.frSec || "food"; S.frConfirm = null; if (el.dataset.v !== frMeId()) delete FR.shares[el.dataset.v]; render(); },
  frSetT: () => { S.frSet = !S.frSet; render(); },
  frBack: () => { S.frView = null; S.frConfirm = null; render(); },
  frSec: el => { S.frSec = el.dataset.v; S.frConfirm = null; render(); },
  frShare: async el => { const k = el.dataset.k, ref = el.dataset.v; const b = frBuild(k, ref); if (!b) { toast("Rien à partager ici"); return; }
    el.disabled = true;
    try { const row = await frApi("/rest/v1/fr_shares", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(Object.assign({ section: FR_KIND[k][1], kind: k, ref: String(ref) }, b)) });
      FR.mine.unshift(Object.assign({}, (row || [])[0] || {}, { kind: k, ref: String(ref), section: FR_KIND[k][1], title: b.title, summary: b.summary })); toast("Ajouté à ton profil Amis"); }
    catch (e) { toast(frErr(e)); }
    render(); if (S.sheet) renderSheet(); },
  frUnshare: async el => { try { await frApi(`/rest/v1/fr_shares?id=eq.${el.dataset.v}`, { method: "DELETE" }); FR.mine = FR.mine.filter(x => x.id !== el.dataset.v); toast("Retiré de ton profil"); } catch (e) { toast(frErr(e)); } render(); if (S.sheet) renderSheet(); },
  frCopy: el => { const s = (FR.shares[S.frView] || []).find(x => x.id === el.dataset.v); if (!s) return;
    if (s.kind === "diet" && Store.get("mealplan", null) && S.frConfirm !== s.id) { S.frConfirm = s.id; render(); return; }
    S.frConfirm = null; s.owner = S.frView; toast(frApply(s)); render(); },
  frRemove: async el => { const u = el.dataset.v; if (S.frConfirm !== "rm" + u) { S.frConfirm = "rm" + u; render(); return; } const me = frMeId();
    try { await frApi(`/rest/v1/fr_links?or=(and(requester.eq.${me},target.eq.${u}),and(requester.eq.${u},target.eq.${me}))`, { method: "DELETE" }); S.frView = null; S.frConfirm = null; await frLoad(true); } catch (e) { toast(frErr(e)); } },
  frDisable: async () => { S.frSet = true; if (S.frConfirm !== "off") { S.frConfirm = "off"; render(); return; } S.frConfirm = null;
    try { if (FR.me) await frRpc("fr_leave"); } catch (e) { toast(frErr(e)); return; }
    Object.assign(FR, { me: undefined, links: [], people: {}, mine: [], shares: {}, loaded: false }); Store.set("settings", Object.assign({}, Store.get("settings", {}), { friendsOn: false }));
    S.tab = "profile"; S.frView = null; S.frSet = false; toast("Amis désactivé : profil et partages retirés"); render(); },
};
// Lien d'invitation : …/muscu/#ami=CODE → ouvre Amis avec le code prêt.
(function frHash() { const m = (location.hash || "").match(/ami=([A-Za-z0-9_-]{3,24})/); if (!m) return; S.frPrefill = m[1].toUpperCase(); history.replaceState(null, "", location.pathname);
  setTimeout(() => { if (frOn()) { S.tab = "friends"; render(); } else toast("Active Amis dans Profil pour ajouter ton ami"); }, 500); })();
// Points d'accroche sans toucher aux fichiers des autres sections : on complète leurs feuilles et écrans.
(function frHooks() {
  const wrap = (f, kind) => id => { const inner = f(id); return () => { const h = inner(); return h ? h + frShareBtn(kind, id) : h; }; };
  if (typeof histSheet === "function") histSheet = wrap(histSheet, "workout");
  if (typeof recipePortionSheet === "function") recipePortionSheet = wrap(recipePortionSheet, "recipe");
  if (typeof editEntrySheet === "function") editEntrySheet = wrap(editEntrySheet, "meal");
  if (typeof mealPlanHTML === "function") { const f = mealPlanHTML; mealPlanHTML = () => f() + (Store.get("mealplan", null)?.days?.length ? frShareBtn("diet", "plan") : ""); }
})();
