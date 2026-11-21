// ===================== PHOTOS DES PLATS (générées par IA, gardées sur l'appareil) =====================
// Chaque plat, collation ou recette reçoit une photo réaliste générée une seule fois, puis mise en cache (IndexedDB).
// 1) Pollinations avec la clé de Profil → Photos des plats (solde gratuit des Quêtes) ; 2) sinon Gemini image, si la clé Gemini y a accès.
const DI = { db: null, urls: {}, state: {}, meta: {}, src: {}, queue: [], busy: false };
const DIMG_MODELS = [["tongyi-mai/z-image-turbo", "Réaliste · ≈ 0,004 $ la photo"], ["black-forest-labs/flux.1.1-pro", "Très réaliste · ≈ 0,03 $ la photo"]];
const DIMG_GEMINI = ["gemini-3.1-flash-image", "gemini-3.1-flash-lite-image", "gemini-3.1-flash-image-preview", "gemini-2.5-flash-image"];
const DISH_RULE = `Commence CHAQUE plat, collation ou recette proposé par une ligne seule au format exact : « 🍽️ Nom du plat | short English visual description of the finished dish for a food photo (main ingredients, how it is plated) ». N'utilise le symbole 🍽️ nulle part ailleurs.`;

function dishKey(name) { return String(name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim().slice(0, 90); }
function dishHash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h) % 1e9; }
function diDB() {
  if (DI.db) return Promise.resolve(DI.db);
  return new Promise((res, rej) => { const r = indexedDB.open("muscu_dishimg", 1); r.onupgradeneeded = () => r.result.createObjectStore("d", { keyPath: "key" }); r.onsuccess = () => { DI.db = r.result; res(DI.db); }; r.onerror = () => rej(r.error); });
}
async function diGet(key) { const db = await diDB(); return new Promise(res => { const q = db.transaction("d").objectStore("d").get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }
async function diPut(it) { const db = await diDB(); return new Promise(res => { const tx = db.transaction("d", "readwrite"); tx.objectStore("d").put(it); tx.oncomplete = res; tx.onerror = res; }); }
async function diDel(key) { const db = await diDB(); return new Promise(res => { const tx = db.transaction("d", "readwrite"); tx.objectStore("d").delete(key); tx.oncomplete = res; tx.onerror = res; }); }

function dishPrompt(m) {
  const what = m.desc ? `${m.desc} (dish name: ${m.name})` : `the dish "${m.name}"`;
  const ings = (m.ings || []).filter(Boolean).slice(0, 8).join(", ");
  return `Photorealistic professional food photograph of a real, home-cooked single portion of ${what}.${ings ? " Visible ingredients: " + ings + "." : ""} Served on a simple plate or in a bowl as appropriate, appetizing but realistic, natural soft daylight from a window, 45-degree angle, shallow depth of field, true-to-life colors and textures, kitchen table background. No text, no labels, no watermark, no people, no hands, no cutlery in the foreground.`;
}
// Réduit l'image (≤ 900 px, JPEG) pour garder le cache léger.
async function diShrink(blob) {
  try { const bm = await createImageBitmap(blob); const s = Math.min(1, 900 / Math.max(bm.width, bm.height)); const c = document.createElement("canvas"); c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s);
    c.getContext("2d").drawImage(bm, 0, 0, c.width, c.height); return await new Promise(r => c.toBlob(b => r(b || blob), "image/jpeg", 0.85)); } catch (e) { return blob; }
}
async function diGemini(prompt) {
  const key = typeof aiSettings === "function" ? aiSettings().geminiKey : null;
  if (!key || !navigator.onLine) return null;
  let bad = {}; try { bad = JSON.parse(localStorage.getItem("dimg_bad") || "{}"); } catch (e) {}
  const mark = m => { bad[m] = Date.now(); try { localStorage.setItem("dimg_bad", JSON.stringify(bad)); } catch (e) {} };
  for (const m of DIMG_GEMINI) {
    if (bad[m] && Date.now() - bad[m] < 864e5) continue; // modèle refusé : on réessaie demain
    for (const withCfg of [true, false]) {
      const gen = withCfg ? { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "4:3" } } : { responseModalities: ["TEXT", "IMAGE"] };
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 60000); let r;
      try { r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: gen }) }); }
      catch (e) { clearTimeout(to); return null; } clearTimeout(to);
      if (r.status === 400 && withCfg) continue; // ancienne version sans imageConfig
      if (r.status === 429) { const t = await r.text().catch(() => ""); if (/limit:\s*0|free_tier/i.test(t)) { mark(m); break; } return null; } // quota du moment : Pollinations prend le relais
      if (!r.ok) { mark(m); break; }
      const j = await r.json().catch(() => ({}));
      const p = (j.candidates?.[0]?.content?.parts || []).find(x => x.inlineData?.data || x.inline_data?.data);
      if (!p) { mark(m); break; }
      const d = p.inlineData || p.inline_data; const bin = atob(d.data); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return { blob: new Blob([u8], { type: d.mimeType || d.mime_type || "image/png" }), src: "Gemini" };
    }
  }
  return null;
}
async function diPollinations(prompt, seed) {
  const st = typeof aiSettings === "function" ? aiSettings() : {};
  if (!st.pollKey) return null;
  if (!navigator.onLine) throw { code: "offline" };
  const model = st.pollModel || DIMG_MODELS[0][0];
  const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&width=1024&height=768&seed=${seed}`;
  for (let i = 0; i < 3; i++) {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 120000); let r;
    try { r = await fetch(url, { signal: ctl.signal, headers: { Authorization: "Bearer " + st.pollKey } }); } catch (e) { clearTimeout(to); throw { code: "net" }; }
    clearTimeout(to);
    if (r.ok && /image/.test(r.headers.get("content-type") || "")) return { blob: await r.blob(), src: "Pollinations" };
    if (r.status === 401) throw { code: "badkey" };
    if (r.status === 402) throw { code: "nobalance" };
    if (r.status !== 429 && r.status < 500) throw { code: "err" + r.status };
    await new Promise(res => setTimeout(res, (+r.headers.get("retry-after") || 5) * 1000));
  }
  throw { code: "busy" };
}
async function diGenerate(k, fresh) {
  const m = DI.meta[k]; const prompt = dishPrompt(m); const seed = fresh ? Math.floor(Math.random() * 1e9) : dishHash(k);
  const out = (await diPollinations(prompt, seed)) || (await diGemini(prompt));
  if (!out) throw { code: "nokey" };
  const blob = await diShrink(out.blob); await diPut({ key: k, blob, src: out.src, name: m.name, t: Date.now() });
  return { blob, src: out.src };
}
function diShow(k) {
  document.querySelectorAll(`[data-dish="${k}"]`).forEach(el => { el.innerHTML = diInner(k); el.classList.toggle("dimg-wait", !DI.urls[k]); });
  if (S.sheet === dishSheet && S.dishSheet === k) renderSheet();
}
function diRevoke(k) { if (String(DI.urls[k] || "").startsWith("blob:")) URL.revokeObjectURL(DI.urls[k]); }
function diImgErr(k) { if (DI.state[k] === "err") return; DI.state[k] = "err"; diRevoke(k); delete DI.urls[k]; diDel(k).catch(() => {}); diShow(k); }
function diInner(k) {
  if (DI.urls[k]) return `<img src="${esc(DI.urls[k])}" alt="" onerror="diImgErr('${k}')">`;
  if (DI.state[k] === "err") return `<span class="dimg-ph">📷<small>${{ nokey: "Clé à ajouter", badkey: "Clé refusée", nobalance: "Solde vide", offline: "Hors ligne" }[DI.why] || "Réessayer"}</small></span>`;
  return `<span class="dimg-ph"><span class="spin"></span></span>`;
}
async function diPump() {
  if (DI.busy) return; DI.busy = true;
  while (DI.queue.length) {
    const { k, fresh } = DI.queue.shift();
    try { const r = await diGenerate(k, fresh); diRevoke(k); DI.urls[k] = URL.createObjectURL(r.blob); DI.src[k] = r.src; DI.state[k] = "ok"; DI.why = ""; }
    catch (e) { DI.state[k] = "err"; DI.why = e?.code || "err";
      if (["nokey", "badkey", "nobalance"].includes(DI.why)) { const stop = DI.queue.splice(0); stop.forEach(q => { DI.state[q.k] = "err"; diShow(q.k); }); } }
    diShow(k);
  }
  DI.busy = false;
}
async function diEnsure(k) {
  if (DI.state[k]) return; DI.state[k] = "loading";
  try { const it = window.indexedDB ? await diGet(k) : null; if (it) { DI.urls[k] = URL.createObjectURL(it.blob); DI.src[k] = it.src; DI.state[k] = "ok"; diShow(k); return; } } catch (e) {}
  DI.queue.push({ k }); diPump();
}
// HTML de la photo d'un plat. size : "thumb" (à côté du plat) ou "wide" (au-dessus d'une recette).
function dishImg(name, o = {}) {
  const k = dishKey(name); if (!k) return "";
  DI.meta[k] = Object.assign({ name }, DI.meta[k] || {}, Object.fromEntries(Object.entries({ desc: o.desc, ings: o.ings }).filter(([, v]) => v && (v.length ?? 1))));
  if (!DI.urls[k]) setTimeout(() => diEnsure(k), 0);
  return `<div class="dimg dimg-${o.size || "thumb"}${DI.urls[k] ? "" : " dimg-wait"}" data-dish="${k}" data-act="dishView" data-v="${k}">${diInner(k)}</div>`;
}
// Texte de l'IA → texte avec une photo pour chaque plat (lignes « 🍽️ Nom | description »).
function aiRich(t) {
  t = String(t ?? ""); const pre = [], dishes = []; let cur = null;
  for (const l of t.split("\n")) {
    const m = l.match(/^\s*[#*\s]*🍽️?\s*(.+?)\s*$/u);
    if (m) { const [nm, ...rest] = m[1].split("|"); cur = { name: nm.replace(/^[*#\s:]+|[*#\s:]+$/g, ""), desc: rest.join("|").replace(/[*#]/g, "").trim(), body: [] }; dishes.push(cur); }
    else (cur ? cur.body : pre).push(l);
  }
  if (!dishes.length) return esc(t);
  return esc(pre.join("\n").trim()) + dishes.map(d => `<div class="dish">${dishImg(d.name, { desc: d.desc, size: "wide" })}<div class="b dish-name">${esc(d.name)}</div>${esc(d.body.join("\n").trim())}</div>`).join("");
}
function dishSheet() {
  const k = S.dishSheet; const m = DI.meta[k] || { name: k };
  return `<div class="row between"><h2>${esc(m.name)}</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    <div class="dimg dimg-big${DI.urls[k] ? "" : " dimg-wait"}" data-dish="${k}">${diInner(k)}</div>
    <p class="xs mut">Photo générée par IA${DI.src[k] ? " (" + DI.src[k] + ")" : ""} pour illustrer le plat : l'aspect réel peut varier. Gardée uniquement sur cet appareil.</p>
    <button class="sec" style="width:100%" data-act="dishRegen" data-v="${k}" ${DI.state[k] === "loading" ? "disabled" : ""}>↻ Nouvelle photo</button>`;
}
const DISH_ACT = {
  dishView: (el, ev) => { ev?.stopPropagation?.(); const k = el.dataset.v; if (DI.state[k] === "err") { if (["nokey", "badkey"].includes(DI.why)) { toast("Ajoute ta clé Pollinations dans Profil → Photos des plats"); return; } if (DI.why === "nobalance") { toast("Solde Pollinations vide : fais une Quête sur enter.pollinations.ai"); return; } delete DI.state[k]; diEnsure(k); diShow(k); return; } if (!DI.urls[k]) return; S.dishSheet = k; openSheet(dishSheet); },
  dishRegen: async el => { const k = el.dataset.v; DI.state[k] = "loading"; renderSheet();
    await diDel(k).catch(() => {}); diRevoke(k); delete DI.urls[k]; diShow(k); DI.queue.unshift({ k, fresh: true }); diPump(); },
};
