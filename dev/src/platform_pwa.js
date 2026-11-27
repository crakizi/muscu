// ===================== PLATEFORME : APP HORS-LIGNE (PWA) =====================
// Données : stockées sur l'appareil (fonctionne sans internet), synchronisées avec Supabase dès qu'il y a du réseau.
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast("Stockage de l'appareil plein !"); return false; } } };
const CFG = () => Object.assign({ url: (typeof BUILD_CFG !== "undefined" && BUILD_CFG.url) || "", anon: (typeof BUILD_CFG !== "undefined" && BUILD_CFG.anon) || "" }, LS.get("muscu_cfg", {}));

const Store = {
  docs: {}, meta: { upd: {}, dirty: {}, lastPull: null }, mode: "local", listeners: [], loaded: true, syncing: false, lastSync: null, syncErr: "",
  init() {
    this.docs = LS.get("muscu_v1", {}) || {}; this.meta = Object.assign({ upd: {}, dirty: {}, lastPull: null }, LS.get("muscu_meta", {}));
    Object.keys(this.docs).forEach(k => { if (this.docs[k] === null && !this.meta.dirty[k]) delete this.docs[k]; });
    this.emit();
    window.addEventListener("online", () => { this.emit(); Sync.run(); });
    window.addEventListener("offline", () => this.emit());
    document.addEventListener("visibilitychange", () => { if (!document.hidden) Sync.run(); });
    setInterval(() => Sync.run(), 60000);
    Sync.run();
  },
  persist() { LS.set("muscu_v1", this.docs); LS.set("muscu_meta", this.meta); },
  get(id, def) { const v = this.docs[id]; return v !== undefined && v !== null ? v : def; },
  set(id, obj) { this.docs[id] = obj; this.meta.upd[id] = Date.now(); this.meta.dirty[id] = true; this.persist(); this.emit(); Sync.soon(); },
  del(id) { this.docs[id] = null; this.meta.upd[id] = Date.now(); this.meta.dirty[id] = true; this.persist(); this.emit(); Sync.soon(); },
  ids(prefix) { return Object.keys(this.docs).filter(k => k.startsWith(prefix) && this.docs[k]); },
  on(fn) { this.listeners.push(fn); },
  emit() { clearTimeout(this._emitT); this._emitT = setTimeout(() => this.listeners.forEach(f => f()), 30); },
  banner() {
    if (!navigator.onLine) return `<div class="banner">Hors-ligne : tout ce que tu notes est gardé sur l'appareil et sera synchronisé au retour d'internet.</div>`;
    if (window._updReady) return `<div class="banner row between"><span>✨ Nouvelle version disponible</span><button class="small" onclick="location.reload()">Mettre à jour</button></div>`;
    if (this.syncErr) return `<div class="banner">Synchro en pause : ${esc(this.syncErr)}</div>`;
    return "";
  }
};

// ---------- Synchronisation Supabase ----------
const Sync = {
  sess() { return LS.get("muscu_sess", null); },
  setSess(s) { LS.set("muscu_sess", s); Store.mode = s ? "cloud" : "local"; },
  async api(path, opts = {}) {
    const c = CFG(); const s = await this.token();
    const r = await fetch(c.url + path, Object.assign({}, opts, { headers: Object.assign({ apikey: c.anon, Authorization: "Bearer " + (s ? s.access_token : c.anon), "Content-Type": "application/json" }, opts.headers || {}) }));
    if (!r.ok) { let m = r.status + ""; try { const j = await r.json(); m = j.msg || j.message || j.error_description || j.error || m; } catch (e) {} throw new Error(m); }
    return r.status === 204 ? null : r.json().catch(() => null);
  },
  async auth(kind, email, password) {
    const c = CFG(); const path = kind === "signup" ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
    const r = await fetch(c.url + path, { method: "POST", headers: { apikey: c.anon, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.msg || j.error_description || j.message || "Erreur " + r.status);
    if (!j.access_token) throw new Error("Compte créé : confirme ton e-mail puis connecte-toi.");
    this.setSess({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000, user: { id: j.user?.id, email: j.user?.email } });
    Store.meta.lastPull = null; Store.meta.firstSync = true; Store.persist();
    await this.run(true);
  },
  logout() { this.setSess(null); Store.emit(); },
  async token() {
    let s = this.sess(); if (!s) return null;
    if (Date.now() > s.expires_at - 60000) {
      const c = CFG();
      const r = await fetch(c.url + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: { apikey: c.anon, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
      if (!r.ok) { if (r.status === 400 || r.status === 401) { this.setSess(null); throw new Error("reconnecte-toi dans Profil"); } throw new Error("connexion"); }
      const j = await r.json(); s = Object.assign(s, { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000 }); this.setSess(s);
    }
    return s;
  },
  soon() { clearTimeout(this._t); this._t = setTimeout(() => this.run(), 1500); },
  async run(force) {
    const c = CFG(); const s = this.sess(); Store.mode = s ? "cloud" : "local";
    if (!c.url || !s || !navigator.onLine || (Store.syncing && !force)) return;
    Store.syncing = true;
    try {
      const sess = await this.token(); if (!sess) return;
      // 1) récupérer les changements faits sur l'autre appareil
      const since = Store.meta.lastPull || "1970-01-01T00:00:00Z"; let changed = false; const remoteIds = new Set();
      for (let page = 0; page < 50; page++) {
        const rows = await this.api(`/rest/v1/docs?select=id,data,deleted,server_ts&server_ts=gt.${encodeURIComponent(Store.meta.lastPull || since)}&order=server_ts.asc&limit=500`);
        if (!rows || !rows.length) break;
        rows.forEach(r => { remoteIds.add(r.id); if (Store.meta.dirty[r.id]) return; if (r.deleted) delete Store.docs[r.id]; else Store.docs[r.id] = r.data; changed = true; Store.meta.lastPull = r.server_ts; });
        Store.meta.lastPull = rows[rows.length - 1].server_ts; if (rows.length < 500) break;
      }
      if (Store.meta.firstSync) { Object.keys(Store.docs).forEach(k => { if (!remoteIds.has(k) && Store.docs[k]) { Store.meta.dirty[k] = true; Store.meta.upd[k] = Store.meta.upd[k] || Date.now(); } }); Store.meta.firstSync = false; }
      // 2) envoyer ce qui a été modifié ici
      const ids = Object.keys(Store.meta.dirty);
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const rows = chunk.map(id => ({ user_id: sess.user.id, id, data: Store.docs[id] ?? null, deleted: Store.docs[id] == null, updated_at: new Date(Store.meta.upd[id] || Date.now()).toISOString() }));
        await this.api("/rest/v1/docs?on_conflict=user_id,id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });
        chunk.forEach(id => { delete Store.meta.dirty[id]; if (Store.docs[id] === null) delete Store.docs[id]; });
      }
      Store.syncErr = ""; Store.lastSync = Date.now(); Store.persist(); if (changed || ids.length) Store.emit();
    } catch (e) { Store.syncErr = e.message || "erreur réseau"; Store.emit(); }
    finally { Store.syncing = false; }
  }
};

// ---------- IA : Google Gemini (clé gratuite) ----------
const aiSettings = () => Store.get("settings", {});
async function blobToB64(b) { return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(b); }); }
async function gemini(parts, json) {
  const key = aiSettings().geminiKey;
  if (!key) throw { code: "no_key", message: "Ajoute ta clé IA gratuite (Gemini) dans Profil → IA." };
  if (!navigator.onLine) throw { code: "offline", message: "Pas de connexion : l'IA revient dès que tu as internet." };
  const models = [...new Set([window._gemOK, aiSettings().model, "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.1-flash-lite"].filter(Boolean))];
  let last = null;
  for (const m of models) {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 40000);
    let r;
    try { r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: json ? { responseMimeType: "application/json", temperature: 0.3 } : { temperature: 0.6 } }) }); }
    catch (e) { last = "délai dépassé"; continue; } finally { clearTimeout(to); }
    if ([404, 500, 503].includes(r.status)) { last = r.status === 503 ? "IA surchargée, réessaie" : "modèle indisponible"; continue; }
    if (r.status === 429) throw { code: "rate_limited", message: "quota gratuit atteint, réessaie dans une minute" };
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw { code: "error", message: j.error?.message || "erreur " + r.status };
    window._gemOK = m;
    return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
  }
  throw { code: "error", message: last || "aucun modèle disponible" };
}
async function ai() { return aiSettings().geminiKey ? true : null; }
async function aiJSON(prompt, images) {
  const parts = [{ text: prompt }];
  for (const b of images || []) parts.push({ inline_data: { mime_type: b.type || "image/jpeg", data: await blobToB64(b) } });
  const txt = await gemini(parts, true);
  try { return JSON.parse(txt.replace(/^```(json)?|```$/g, "").trim()); } catch (e) { const m = txt.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw { code: "error", message: "réponse IA illisible" }; }
}
async function aiText(prompt, onText) { const t = await gemini([{ text: prompt }], false); onText && onText(t); return t; }

// ---------- Open Food Facts (base mondiale de produits, en ligne) ----------
function offToFood(p, code) {
  const n = p.nutriments || {}; const g = k => n[k + "_100g"] != null ? +n[k + "_100g"] : null;
  const kcal = g("energy-kcal") ?? (g("energy") != null ? g("energy") / 4.184 : null);
  if (kcal == null && g("proteins") == null) return null;
  return { name: (p.product_name_fr || p.product_name_es || p.product_name || "Produit").trim(), brand: (p.brands || "").split(",")[0].trim(), barcode: code || p.code || null,
    per100: { kcal: kcal || 0, p: g("proteins") || 0, c: g("carbohydrates") || 0, f: g("fat") || 0, fib: g("fiber") || 0, sugar: g("sugars") || 0, satfat: g("saturated-fat") || 0, salt: g("salt") || 0 },
    unit: p.serving_quantity ? Math.round(+p.serving_quantity) || null : null, src: "off" };
}
async function offBarcode(code) {
  if (!navigator.onLine) return null;
  try { const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=code,product_name,product_name_fr,product_name_es,brands,nutriments,serving_quantity`); const j = await r.json(); return j.status === 1 ? offToFood(j.product, code) : null; } catch (e) { return null; }
}
async function offSearch(q) {
  if (!navigator.onLine) return [];
  try { const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&json=1&page_size=20&fields=code,product_name,product_name_fr,product_name_es,brands,nutriments,serving_quantity`);
    const j = await r.json(); return (j.products || []).map(p => offToFood(p, p.code)).filter(Boolean); } catch (e) { return []; }
}
const HAS_OFF = true;

// ---------- Carte « Synchro & IA » du profil ----------
function syncCardHTML() {
  const c = CFG(), s = Sync.sess(), st = aiSettings();
  return `<div class="card"><h2>Synchronisation iPhone ↔ Mac</h2>
    ${!c.url ? `<p class="sm mut">Pas encore configurée.</p><label>URL Supabase</label><input id="cfgUrl" placeholder="https://xxxx.supabase.co"><label>Clé publique (anon)</label><input id="cfgAnon"><button class="small" style="margin-top:8px" data-act="cfgSave">Enregistrer</button>`
      : s ? `<p class="sm">Connecté : <b>${esc(s.user?.email || "")}</b><br><span class="xs mut">${Store.lastSync ? "Dernière synchro : " + new Date(Store.lastSync).toLocaleTimeString("fr-FR") : "Synchro en attente"}${Object.keys(Store.meta.dirty).length ? ` · ${Object.keys(Store.meta.dirty).length} modif(s) à envoyer` : ""}</span></p>
        <div class="row"><button class="small" data-act="syncNow">Synchroniser maintenant</button><button class="small sec" data-act="logout">Se déconnecter</button></div>`
      : `<p class="xs mut">Connecte-toi avec le même compte sur l'iPhone et le Mac pour avoir les mêmes données.</p><label>E-mail</label><input id="auEmail" type="email" autocomplete="username"><label>Mot de passe</label><input id="auPass" type="password" autocomplete="current-password">
        <div class="row" style="margin-top:8px"><button class="grow" data-act="login">Se connecter</button><button class="sec grow" data-act="signup">Créer le compte</button></div>`}
  </div>
  <div class="card"><h2>IA</h2><p class="xs mut">Photo des plats, description, étiquettes, recettes, coach : Google Gemini (clé gratuite sur aistudio.google.com).</p>
    <label>Clé API Gemini</label><input id="aiKey" type="password" value="${esc(st.geminiKey || "")}" placeholder="AIza…"><button class="small" style="margin-top:8px" data-act="aiKeySave">Enregistrer</button>
    ${st.geminiKey ? `<span class="tag grn" style="margin-left:8px">clé enregistrée</span>` : ""}</div>
  <div class="card"><h2>Photos des plats</h2><p class="xs mut">Une photo réaliste générée pour chaque plat, collation ou recette créé par l'IA, puis gardée sur l'appareil. Service : Pollinations (enter.pollinations.ai → Keys), payé avec ton solde gratuit des Quêtes.</p>
    <label>Clé Pollinations</label><input id="pollKey" type="password" value="${esc(st.pollKey || "")}" placeholder="sk_…">
    <label>Qualité</label><select id="pollModel">${DIMG_MODELS.map(([v, l]) => `<option value="${v}" ${(st.pollModel || DIMG_MODELS[0][0]) === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    <button class="small" style="margin-top:8px" data-act="pollSave">Enregistrer</button>${st.pollKey ? `<span class="tag grn" style="margin-left:8px">clé enregistrée</span>` : ""}
    ${S.pollBal ? `<p class="xs" style="margin-top:6px">${esc(S.pollBal)}</p>` : ""}</div>`;
}
const PLATFORM_ACT = {
  cfgSave: () => { LS.set("muscu_cfg", { url: $("#cfgUrl").value.trim().replace(/\/$/, ""), anon: $("#cfgAnon").value.trim() }); render(); },
  login: async () => { try { await Sync.auth("login", $("#auEmail").value.trim(), $("#auPass").value); toast("Connecté, synchro en cours"); } catch (e) { toast(e.message); } render(); },
  signup: async () => { try { await Sync.auth("signup", $("#auEmail").value.trim(), $("#auPass").value); toast("Compte créé et connecté"); } catch (e) { toast(e.message); } render(); },
  logout: () => { Sync.logout(); render(); },
  syncNow: async () => { await Sync.run(true); toast(Store.syncErr ? "Erreur : " + Store.syncErr : "Synchronisé"); render(); },
  aiKeySave: () => { Store.set("settings", Object.assign({}, aiSettings(), { geminiKey: $("#aiKey").value.trim() })); toast("Clé IA enregistrée"); },
  pollSave: () => { const k = $("#pollKey").value.trim(); if (k && !/^sk_/.test(k)) { toast("La clé doit commencer par sk_"); return; }
    Store.set("settings", Object.assign({}, aiSettings(), { pollKey: k, pollModel: $("#pollModel").value })); Object.keys(DI.state).forEach(x => { if (DI.state[x] !== "ok") delete DI.state[x]; }); toast("Photos des plats : réglages enregistrés"); render(); }
};
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
// ---------- Mises à jour automatiques ----------
async function checkUpdate() {
  if (!navigator.onLine || typeof BUILD_VERSION === "undefined" || !location.protocol.startsWith("http")) return;
  if (typeof PHONE !== "undefined" && PHONE.host) return; // le support du format téléphone ne se recharge pas : l'app dans le cadre s'en charge
  try {
    const j = await (await fetch("version.json?t=" + Date.now(), { cache: "no-store" })).json();
    if (j.v && j.v !== BUILD_VERSION) {
      const reg = await navigator.serviceWorker?.getRegistration(); if (reg) await reg.update().catch(() => {});
      if (S.sheet || isEditing() || liveWorkout()) { window._updReady = true; Store.emit(); return; }
      toast("Mise à jour de l'app…"); setTimeout(() => (typeof PHONE !== "undefined" && PHONE.inPhone ? window.top : window).location.reload(), 800); // format téléphone : recharger aussi le cadre
    }
  } catch (e) {}
}
setTimeout(checkUpdate, 1500); setInterval(checkUpdate, 5 * 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkUpdate(); });

// ---------- App iPhone native : pont Apple Santé ----------
const NATIVE = () => !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.health);
window.onNativeHealth = data => {
  try {
    if (!data || data.available === false) return;
    const k = todayKey(); const d = clone(day(k)); d.entries = d.entries || []; d.acts = d.acts || [];
    const before = JSON.stringify([d.steps, d.sleep, d.health]);
    if (data.steps != null) d.steps = Math.round(data.steps);
    if (data.sleepH != null && data.sleepH > 0) d.sleep = Math.round(data.sleepH * 4) / 4;
    d.health = { active: Math.round(data.activeKcal || 0), restingHR: data.restingHR || null, at: Date.now() };
    if (data.weightKg && data.weightDay === k && !d.weight) d.weight = Math.round(data.weightKg * 10) / 10;
    if (JSON.stringify([d.steps, d.sleep, d.health]) !== before || (data.weightKg && !day(k).weight && d.weight)) saveDay(k, d);
  } catch (e) {}
};
function askHealth() { if (NATIVE()) try { window.webkit.messageHandlers.health.postMessage({ type: "read" }); } catch (e) {} }
setTimeout(askHealth, 1200); setInterval(askHealth, 10 * 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) askHealth(); });
