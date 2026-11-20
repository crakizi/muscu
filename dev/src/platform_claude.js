// ===================== STOCKAGE (sync en ligne via db, sinon local) =====================
const Store = {
  docs: {}, mode: "local", col: null, listeners: [], loaded: false, queue: {}, timers: {},
  async init() {
    try {
      const raw = localStorage.getItem("muscu_v1");
      if (raw) this.docs = JSON.parse(raw) || {};
    } catch (e) {}
    this.emit();
    let db = null, user = null, id = null;
    try { db = await claude.use("db"); user = await claude.use("user"); id = user ? await user.id() : null; } catch (e) {}
    if (!db || !id) { this.loaded = true; this.mode = "local"; this.emit(); return; }
    this.mode = "cloud";
    this.col = db.collection("data/users/" + id);
    const timer = setTimeout(() => { if (!this.loaded) { this.offline = true; this.emit(); } }, 10000);
    this.col.onSnapshot(snap => {
      const next = {};
      snap.docs.forEach(d => { if (d.exists) next[d.id] = clone(d.data()); });
      // garder les écritures locales en attente
      Object.keys(this.queue).forEach(k => { if (this.queue[k] !== undefined) next[k] = this.queue[k]; });
      const firstCloud = !this.loaded;
      this.docs = next;
      if (!snap.metadata.fromCache) { this.loaded = true; this.offline = false; clearTimeout(timer); }
      this.emit();
      if (firstCloud && !snap.metadata.fromCache) this.migrateLocal();
    }, err => { this.offline = true; this.loaded = true; clearTimeout(timer); this.emit(); });
  },
  migrateLocal() {
    // si des données locales existaient (aperçu), les pousser une seule fois
    try {
      const raw = localStorage.getItem("muscu_v1"); if (!raw) return;
      const loc = JSON.parse(raw) || {};
      Object.keys(loc).forEach(k => { if (!this.docs[k]) this.set(k, loc[k]); });
      localStorage.removeItem("muscu_v1");
    } catch (e) {}
  },
  get(id, def) { return this.docs[id] !== undefined ? this.docs[id] : def; },
  set(id, obj) {
    this.docs[id] = obj;
    this.emit();
    if (this.mode === "local") { try { localStorage.setItem("muscu_v1", JSON.stringify(this.docs)); } catch (e) {} return; }
    this.queue[id] = obj;
    clearTimeout(this.timers[id]);
    this.timers[id] = setTimeout(() => this.flush(id), 500);
  },
  async flush(id) {
    if (this.writing?.[id]) { this.timers[id] = setTimeout(() => this.flush(id), 300); return; }
    this.writing = this.writing || {};
    const obj = this.queue[id];
    this.writing[id] = true;
    try {
      if (obj === null) await this.col.doc(id).delete(); else await this.col.doc(id).set(obj);
      if (this.queue[id] === obj) delete this.queue[id];
    } catch (e) {
      if (e && e.code === "unavailable") { setTimeout(() => this.flush(id), 1500 + Math.random() * 1000); }
      else { toast("Erreur d'enregistrement : " + (e?.message || e?.code || "")); delete this.queue[id]; }
    } finally { this.writing[id] = false; }
  },
  del(id) { delete this.docs[id]; this.emit(); if (this.mode === "local") { try { localStorage.setItem("muscu_v1", JSON.stringify(this.docs)); } catch (e) {} return; } this.queue[id] = null; this.flush(id); },
  ids(prefix) { return Object.keys(this.docs).filter(k => k.startsWith(prefix) && this.docs[k]); },
  on(fn) { this.listeners.push(fn); },
  emit() { clearTimeout(this._emitT); this._emitT = setTimeout(() => this.listeners.forEach(f => f()), 30); }
};

let _sample = null;
async function ai() { if (_sample === null) { try { _sample = await claude.use("sample"); } catch (e) { _sample = false; } } return _sample || null; }
async function aiJSON(prompt, images, tier) {
  const s = await ai(); if (!s) throw { code: "not_granted", message: "IA indisponible ici" };
  const opts = { modelTier: tier || "default" };
  if (images && images.length) opts.images = images;
  return await s.json(prompt, opts);
}
async function aiText(prompt, onText, tier) {
  const s = await ai(); if (!s) throw { code: "not_granted", message: "IA indisponible ici" };
  const r = await s(prompt, { modelTier: tier || "default", onText: onText ? ({ text }) => onText(text) : undefined, cache: false });
  return r.text;
}
const HAS_OFF = false; async function offBarcode() { return null; } async function offSearch() { return []; }
function syncCardHTML() { return ""; } const PLATFORM_ACT = {};
