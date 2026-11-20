// ===================== PHOTOS DE PHYSIQUE (restent sur l'appareil, jamais envoyées) =====================
const PH = { db: null, list: [], urls: {} };
function phDB() {
  if (PH.db) return Promise.resolve(PH.db);
  return new Promise((res, rej) => { const r = indexedDB.open("muscu_photos", 1); r.onupgradeneeded = () => r.result.createObjectStore("p", { keyPath: "id" }); r.onsuccess = () => { PH.db = r.result; res(PH.db); }; r.onerror = () => rej(r.error); });
}
async function phLoad() { const db = await phDB(); return new Promise(res => { const out = []; const c = db.transaction("p").objectStore("p").openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push(cur.value); cur.continue(); } else { PH.list = out.sort((a, b) => b.date.localeCompare(a.date) || b.t - a.t); res(PH.list); } }; }); }
async function phAdd(blob, view, date) { const db = await phDB(); const it = { id: uid(), t: Date.now(), date: date || todayKey(), view, blob, w: r1(latestWeight()) }; await new Promise(r => { const tx = db.transaction("p", "readwrite"); tx.objectStore("p").put(it); tx.oncomplete = r; }); await phLoad(); return it; }
async function phDel(id) { const db = await phDB(); await new Promise(r => { const tx = db.transaction("p", "readwrite"); tx.objectStore("p").delete(id); tx.oncomplete = r; }); if (PH.urls[id]) { URL.revokeObjectURL(PH.urls[id]); delete PH.urls[id]; } await phLoad(); }
function phURL(it) { return PH.urls[it.id] || (PH.urls[it.id] = URL.createObjectURL(it.blob)); }
const PH_VIEWS = [["face", "Face"], ["profil", "Profil"], ["dos", "Dos"]];
function photosCardHTML() {
  if (!window.indexedDB) return "";
  if (!PH.loaded) { PH.loaded = true; phLoad().then(() => { if (S.tab === "progress") render(); }).catch(() => {}); }
  const v = S.phView || "face"; const list = PH.list.filter(p => p.view === v);
  const A = list.find(p => p.id === S.phA) || list[list.length - 1], B = list.find(p => p.id === S.phB) || list[0];
  const cmp = A && B && A !== B ? `<div class="phcmp" style="position:relative;border-radius:14px;overflow:hidden;aspect-ratio:3/4;background:#000;margin-top:8px">
      <img src="${phURL(A)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
      <div id="phTop" style="position:absolute;inset:0;clip-path:inset(0 0 0 ${S.phSplit ?? 50}%)"><img src="${phURL(B)}" style="width:100%;height:100%;object-fit:cover"></div>
      <div style="position:absolute;top:0;bottom:0;left:${S.phSplit ?? 50}%;width:2px;background:#fff" id="phLine"></div>
      <span class="tag" style="position:absolute;left:8px;top:8px">${fmtDay(A.date)} · ${A.w || "?"} kg</span><span class="tag" style="position:absolute;right:8px;top:8px">${fmtDay(B.date)} · ${B.w || "?"} kg</span></div>
      <input type="range" min="0" max="100" value="${S.phSplit ?? 50}" data-input="phSplit" style="width:100%;margin-top:6px">` : "";
  return `<div class="card"><h2>Photos de physique</h2><p class="xs mut">Restent uniquement sur cet appareil (jamais envoyées ni synchronisées). Astuce : même lumière, même endroit, le matin à jeun.</p>
    <div class="chips">${PH_VIEWS.map(([k, l]) => `<button class="chip ${v === k ? "on" : ""}" data-act="phView" data-v="${k}">${l}</button>`).join("")}</div>
    <label class="btn" style="display:block;text-align:center;margin-top:8px">📸 Ajouter une photo (${PH_VIEWS.find(x => x[0] === v)[1]})<input type="file" accept="image/*" capture="user" data-file="physique" hidden></label>
    ${list.length ? `<div style="display:flex;gap:6px;overflow-x:auto;margin-top:8px">${list.map(p => `<div style="flex:none;width:72px;text-align:center"><img src="${phURL(p)}" data-act="phPick" data-v="${p.id}" style="width:72px;height:96px;object-fit:cover;border-radius:10px;border:3px solid ${p === A ? "#f59e0b" : p === B ? "#2563eb" : "transparent"}"><div class="xs mut">${fmtDay(p.date)}</div><button class="danger small" data-act="phDel" data-v="${p.id}" style="padding:2px 6px">✕</button></div>`).join("")}</div>
      <p class="xs mut">Touche une photo pour choisir « avant » (orange) puis « après » (bleu).</p>` : `<p class="sm mut">Aucune photo pour l'instant.</p>`}${cmp}</div>`;
}
const PH_ACT = {
  phView: el => { S.phView = el.dataset.v; S.phA = S.phB = null; render(); },
  phPick: el => { const id = el.dataset.v; if (!S.phNext || S.phNext === "A") { S.phA = id; S.phNext = "B"; } else { S.phB = id; S.phNext = "A"; } render(); },
  phDel: el => { const id = el.dataset.v; if (S.phDelArm !== id) { S.phDelArm = id; toast("Touche encore ✕ pour supprimer cette photo"); return; } S.phDelArm = null; phDel(id).then(render); },
};
