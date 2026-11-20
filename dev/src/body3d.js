// ===================== CORPS 3D ANATOMIQUE =====================
// Modèle : BodyParts3D (© The Database Center for Life Science, licence CC BY-SA 2.1 Japon),
// 214 pièces (muscles séparés par faisceau, os, peau), simplifiées et compressées pour le téléphone.
const BODY = { url: "anatomy/", data: null, loading: null, thumbs: {}, pending: new Set(), tr: null, scenes: {}, failed: false };
const BODY_COL = { prim: 0xd90429, sec: 0xff8a00, rest: 0xc09086, restDark: 0x8d625a, bone: 0xece5d3, skin: 0xf2c9a8 };
// noms français des muscles « neutres » (ceux qui ne sont rattachés à aucun groupe de l'app)
const BODY_FR = { "sternocleidomastoid": "Sterno-cléido-mastoïdien", "serratus anterior": "Dentelé antérieur", "sartorius": "Sartorius (couturier)", "tensor fasciae latae": "Tenseur du fascia lata",
  "tibialis anterior": "Tibial antérieur", "fibularis longus": "Long fibulaire", "fibularis brevis": "Court fibulaire", "extensor digitorum longus": "Long extenseur des orteils",
  "extensor carpi radialis longus": "Long extenseur radial du carpe", "extensor carpi radialis brevis": "Court extenseur radial du carpe", "extensor digitorum": "Extenseur des doigts",
  "extensor digiti minimi": "Extenseur du petit doigt", "extensor carpi ulnaris": "Extenseur ulnaire du carpe", "splenius capitis": "Splénius de la tête", "levator scapulae": "Élévateur de la scapula",
  "coracobrachialis": "Coraco-brachial", "internal oblique": "Oblique interne", "iliotibial tract": "Bandelette ilio-tibiale", "gluteus minimus": "Petit fessier",
  "extensor pollicis brevis": "Court extenseur du pouce", "extensor pollicis longus": "Long extenseur du pouce", "flexor digitorum longus": "Long fléchisseur des orteils",
  "tibialis posterior": "Tibial postérieur", "flexor hallucis longus": "Long fléchisseur de l'hallux", "extensor hallucis longus": "Long extenseur de l'hallux", "platysma": "Platysma" };
function bodyPartLabel(p) {
  if (p.g && MUSCLES[p.g]) return MUSCLES[p.g][0];
  if (p.g === "_b") return "Os";
  const n = p.n.replace(/\b(left|right)\b ?/g, "").replace(/humeral head of /, "").trim();
  return BODY_FR[n] || n;
}
function bodyLoad() {
  if (BODY.loading) return BODY.loading;
  if (!has3D()) return Promise.reject(new Error("3D indisponible"));
  BODY.loading = Promise.all([fetch(BODY.url + "body2.json").then(r => { if (!r.ok) throw new Error("json"); return r.json(); }), fetch(BODY.url + "body2.bin").then(r => { if (!r.ok) throw new Error("bin"); return r.arrayBuffer(); })])
    .then(([h, buf]) => {
      // positions quantifiées (int16), indices (uint16), puis peau : 2 os + 1 poids par sommet (uint8)
      const vq = new Int16Array(buf, 0, h.vbytes / 2), iq = new Uint16Array(buf, h.vbytes, h.ibytes / 2), sk = new Uint8Array(buf, h.vbytes + h.ibytes);
      const lo = h.lo, sc = h.scale;
      BODY.bones = h.bones; BODY.joints = h.joints;
      BODY.data = h.parts.map(p => {
        const pos = new Float32Array(p.vc * 3), si = new Uint16Array(p.vc * 4), sw = new Float32Array(p.vc * 4);
        for (let i = 0; i < p.vc; i++) {
          const o = p.vo + i * 3; pos[i * 3] = (vq[o] + 32500) * sc + lo[0]; pos[i * 3 + 1] = (vq[o + 1] + 32500) * sc + lo[1]; pos[i * 3 + 2] = (vq[o + 2] + 32500) * sc + lo[2];
          const k = p.so + i * 3; si[i * 4] = sk[k]; si[i * 4 + 1] = sk[k + 1]; const w = sk[k + 2] / 255; sw[i * 4] = w; sw[i * 4 + 1] = 1 - w;
        }
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(new Uint16Array(iq.subarray(p.io, p.io + p.ic)), 1));
        g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
        g.computeVertexNormals(); g.computeBoundingSphere(); return { p: { n: p.n, g: p.g, s: p.s }, g };
      });
      return BODY.data;
    }).catch(e => { BODY.failed = true; BODY.loading = null; throw e; });
  return BODY.loading;
}
// crée un groupe 3D articulé (chaque appel a son propre squelette et ses propres matériaux)
function bodyGroup(opt = {}) {
  const grp = new THREE.Group(); grp.userData.meshes = [];
  const bones = BODY.bones.map(b => { const o = new THREE.Bone(); o.name = b.n; return o; });
  BODY.bones.forEach((b, i) => { const par = b.p >= 0 ? BODY.bones[b.p].pos : [0, 0, 0]; bones[i].position.set(b.pos[0] - par[0], b.pos[1] - par[1], b.pos[2] - par[2]); if (b.p >= 0) bones[b.p].add(bones[i]); });
  grp.add(bones[0]); grp.updateMatrixWorld(true);
  const skel = new THREE.Skeleton(bones);
  grp.userData.bones = Object.fromEntries(bones.map(b => [b.name, b])); grp.userData.rest = Object.fromEntries(bones.map(b => [b.name, b.position.clone()])); grp.userData.skel = skel;
  BODY.data.forEach(({ p, g }) => {
    if (p.g === "_skin" && opt.noSkin) return;
    let mat;
    if (p.g === "_skin") mat = new THREE.MeshStandardMaterial({ color: BODY_COL.skin, transparent: true, opacity: 0.13, depthWrite: false, roughness: 0.9 });
    else if (p.g === "_b") mat = new THREE.MeshStandardMaterial({ color: BODY_COL.bone, roughness: 0.7 });
    else mat = new THREE.MeshPhysicalMaterial({ color: BODY_COL.rest, roughness: 0.42, metalness: 0.0, clearcoat: 0.35, clearcoatRoughness: 0.5 });
    mat.color.convertSRGBToLinear();
    const m = new THREE.SkinnedMesh(g, mat); m.bind(skel, new THREE.Matrix4()); m.frustumCulled = false;
    m.userData.part = p; m.renderOrder = p.g === "_skin" ? 5 : 0; m.castShadow = p.g !== "_skin";
    m.visible = p.g !== "_skin" || !!opt.skin; grp.add(m); grp.userData.meshes.push(m);
  });
  return grp;
}
// colorie : prim / sec / focus (clignote) ou une couleur par muscle (récupération)
function bodyPaint(grp, o = {}) {
  const prim = o.prim || [], sec = o.sec || [], focus = o.focus || [], colors = o.colors;
  const dark = isDark(); grp.userData.focus = [];
  grp.userData.meshes.forEach(m => {
    const g = m.userData.part.g; const mt = m.material; if (g === "_skin" || g === "_b") return;
    let c = dark ? BODY_COL.restDark : BODY_COL.rest, e = 0x000000;
    if (colors && colors[g]) c = new THREE.Color(colors[g]);
    else if (prim.includes(g)) { c = BODY_COL.prim; e = 0x5a0010; }
    else if (sec.includes(g)) { c = BODY_COL.sec; e = 0x3a2200; }
    (typeof c === "number" ? mt.color.setHex(c) : mt.color.copy(c)).convertSRGBToLinear(); mt.emissive.setHex(e); mt.emissiveIntensity = 1; mt.userData.e0 = e;
    if (!colors && focus.includes(g)) grp.userData.focus.push(m);
  });
}
function bodyAddLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b6b7a, 0.55));
  const k = new THREE.DirectionalLight(0xffffff, 0.6); k.position.set(1.5, 3, 3); scene.add(k);
  const b = new THREE.DirectionalLight(0xffffff, 0.35); b.position.set(-2, 2.5, -3); scene.add(b);
}

// ---------- miniatures (une seule scène hors écran, rendue en image et mise en cache) ----------
function bodyKey(o) { return JSON.stringify([o.prim || [], o.sec || [], o.focus || [], o.colors || null, isDark()]); }
function bodyThumbRender(o) {
  if (!BODY.tr) {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setPixelRatio(1); r.setSize(440, 470); r.outputEncoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene(); bodyAddLights(scene); const grp = bodyGroup({ noSkin: true }); scene.add(grp);
    const cam = new THREE.OrthographicCamera(-0.465, 0.465, 0.99, -0.99, 0.1, 10);
    BODY.tr = { r, scene, grp, cam };
  }
  const { r, scene, grp, cam } = BODY.tr; bodyPaint(grp, o);
  grp.userData.focus.forEach(m => { m.material.emissive.setHex(0xff2a55); m.material.emissiveIntensity = 0.55; });
  r.setScissorTest(true); r.setClearColor(0x000000, 0);
  [[0, 0], [220, Math.PI]].forEach(([x, rot]) => {
    r.setViewport(x, 0, 220, 470); r.setScissor(x, 0, 220, 470); r.clear();
    cam.position.set(Math.sin(rot) * 3, 0.94, Math.cos(rot) * 3); cam.lookAt(0, 0.94, 0); cam.updateProjectionMatrix(); r.render(scene, cam);
  });
  r.setScissorTest(false);
  const u = r.domElement.toDataURL("image/webp", 0.9); return u.startsWith("data:image/webp") ? u : r.domElement.toDataURL("image/png");
}
function bodyThumbHTML(o = {}, mini = true) {
  const key = bodyKey(o); const url = BODY.thumbs[key];
  const style = `width:100%;display:block;margin:auto;max-width:${mini ? 200 : 420}px;aspect-ratio:440/470`;
  if (url) return `<img class="bthumb" src="${url}" alt="muscles" style="${style}">`;
  if (!BODY.failed && has3D()) {
    BODY.pending.add(key); setTimeout(bodyFlush, 0);
    return `<div class="bthumb wait" data-bkey="${esc(key)}" style="${style}"></div>`;
  }
  return muscleSVG(o.prim, o.sec, o.focus, mini, o.colors);
}
// miniatures gardées entre deux lancements (IndexedDB) → affichage instantané
function thumbDB() { return BODY.tdb || (BODY.tdb = new Promise((res, rej) => { const r = indexedDB.open("muscu_thumbs", 1); r.onupgradeneeded = () => r.result.createObjectStore("t"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); }
function thumbSave(key, url) { if (!window.indexedDB) return; thumbDB().then(db => db.transaction("t", "readwrite").objectStore("t").put(url, key)).catch(() => {}); }
function thumbPreload() { if (!window.indexedDB) return Promise.resolve(); return thumbDB().then(db => new Promise(res => { const st = db.transaction("t").objectStore("t"); const c = st.openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { BODY.thumbs[cur.key] = cur.value; cur.continue(); } else res(); }; c.onerror = () => res(); })).catch(() => {}); }
let bodyFlushing = false;
function bodyPlace(key) { document.querySelectorAll(".bthumb.wait").forEach(el => { if (el.dataset.bkey === key) el.outerHTML = `<img class="bthumb" src="${BODY.thumbs[key]}" alt="muscles" style="${el.getAttribute("style")}">`; }); }
function bodyFlush() {
  if (bodyFlushing || !BODY.pending.size) return; bodyFlushing = true;
  BODY.preloaded.then(() => {
    // 1) celles déjà en cache : tout de suite, sans charger le modèle
    [...BODY.pending].forEach(key => { if (BODY.thumbs[key]) { BODY.pending.delete(key); bodyPlace(key); } });
    if (!BODY.pending.size) return;
    // 2) les nouvelles : rendu 3D
    return bodyLoad().then(() => {
      const keys = [...BODY.pending]; BODY.pending.clear();
      keys.forEach(key => { const [prim, sec, focus, colors] = JSON.parse(key);
        if (!BODY.thumbs[key]) { try { BODY.thumbs[key] = bodyThumbRender({ prim, sec, focus, colors }); thumbSave(key, BODY.thumbs[key]); } catch (e) { return; } }
        bodyPlace(key); });
    });
  }).catch(() => {}).finally(() => { bodyFlushing = false; if (BODY.pending.size) setTimeout(bodyFlush, 0); });
}
BODY.preloaded = thumbPreload();

// ---------- vue 3D interactive (fiche exercice, carte de récupération, atlas) ----------
function body3DHolderHTML(h = 460, anim = false) {
  const H = typeof h === "number" ? h + "px" : h;
  return `<div id="body3d" style="height:${H};border-radius:16px;overflow:hidden;background:var(--bg2,#e9edf3);position:relative">
    <div class="mut sm c" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center" id="body3dWait"><span class="spin"></span>&nbsp;Chargement du corps 3D…</div>
    ${anim ? `<div id="animPhase" class="xs" style="position:absolute;left:10px;bottom:10px;z-index:4;background:rgba(17,24,39,.72);color:#fff;border-radius:10px;padding:5px 9px;pointer-events:none"></div>` : ""}</div>
    ${anim ? `<div class="chips" style="justify-content:center;margin-top:8px"><button class="chip on" data-act="animPlay">${ANIM.playing ? "⏸ Pause" : "▶ Lecture"}</button>${[[0.5, "Lent"], [1, "Normal"]].map(([v, l]) => `<button class="chip ${ANIM.speed === v ? "on" : ""}" data-act="animSpeed" data-v="${v}">${l}</button>`).join("")}</div>` : ""}
    <div class="chips" style="justify-content:center;margin-top:8px">
      <button class="chip" data-act="bodyView" data-v="front">Face</button><button class="chip" data-act="bodyView" data-v="back">Dos</button><button class="chip" data-act="bodyView" data-v="side">Profil</button>
      <button class="chip ${S.bodySkin ? "on" : ""}" data-act="bodyToggle" data-v="skin">Peau</button><button class="chip ${S.bodyBones === false ? "" : "on"}" data-act="bodyToggle" data-v="bones">Os</button>
      <button class="chip ${S.bodyIso ? "on" : ""}" data-act="bodyToggle" data-v="iso">Isoler</button></div>
    <div id="bodyInfo" class="sm" style="min-height:22px;text-align:center;margin-top:6px"></div>`;
}
function bodyMount(holder, o) {
  bodyLoad().then(() => {
    if (!holder.isConnected) return;
    let S3 = V3.scenes.body;
    if (!S3) {
      S3 = makeScene("body", { cam: [0, 0.95, 2.15], target: [0, 0.9, 0], bg: 0x1d2128, bgLight: 0xeef1f6, minD: 0.35, maxD: 4.5 });
      S3.scene.children.filter(c => c.isLight).forEach(l => S3.scene.remove(l)); bodyAddLights(S3.scene);
      S3.controls.maxPolarAngle = Math.PI; S3.controls.screenSpacePanning = true;
      S3.grp = bodyGroup({ skin: true }); S3.scene.add(S3.grp);
      const ray = new THREE.Raycaster(), v = new THREE.Vector2(); let down = null;
      const pick = e => { const r = S3.renderer.domElement.getBoundingClientRect(); v.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v, S3.cam);
        const hits = ray.intersectObjects(S3.grp.userData.meshes.filter(m => m.visible && m.userData.part.g !== "_skin"), false); return hits[0] ? hits[0].object : null; };
      const el = S3.renderer.domElement;
      el.addEventListener("pointerdown", e => down = [e.clientX, e.clientY]);
      el.addEventListener("pointermove", e => { if (e.pointerType === "touch" || e.buttons) return; const m = pick(e); bodyHover(S3, m);
        if (S3.tip) { S3.tip.style.display = m ? "block" : "none"; if (m) { S3.tip.textContent = bodyPartLabel(m.userData.part); S3.tip.style.left = (e.offsetX + 14) + "px"; S3.tip.style.top = (e.offsetY + 10) + "px"; } } });
      el.addEventListener("pointerleave", () => { bodyHover(S3, null); if (S3.tip) S3.tip.style.display = "none"; });
      el.addEventListener("pointerup", e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return; down = null; const m = pick(e); bodyHover(S3, m); bodyInfo(m && m.userData.part); });
      S3.renderer.shadowMap.enabled = true;
      S3.tick = t => { const k = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 5)); (S3.grp.userData.focus || []).forEach(m => { if (m !== S3.hov) { m.material.emissive.setHex(0xff1744); m.material.emissiveIntensity = k * 0.8; } }); if (S3.animOn) animTick(S3, t * 1000); };
    }
    S3.opts = o; bodyPaint(S3.grp, o); bodyApplyToggles(S3);
    const w = holder.querySelector("#body3dWait"); if (w) w.remove();
    V3.prevActive = V3.active && V3.active !== S3 ? V3.active : V3.prevActive;
    mount3D("body", holder, () => S3);
    // animation de l'exercice (ou pose neutre)
    if (o.anim) { S3.animOn = true; animSetup(S3, o.anim); ANIM.phaseEl = holder.querySelector("#animPhase"); bodyFitAnim(S3, o.view); return; }
    S3.animOn = false; ANIM.pat = null; ANIM.phaseEl = null; (S3.grp.userData.eq || []).forEach(x => x.parent && x.parent.remove(x)); if (S3.props) { S3.scene.remove(S3.props); S3.props = null; }
    Object.values(S3.grp.userData.bones).forEach(b => b.quaternion.identity()); S3.grp.userData.bones.root.position.copy(S3.grp.userData.rest.root);
    if (o.view) bodyView(o.view, true);
    if (o.prim && o.prim.length) { // cadrer sur les muscles travaillés
      const bb = new THREE.Box3(); S3.grp.userData.meshes.forEach(m => { if (o.prim.includes(m.userData.part.g)) bb.expandByObject(m); });
      if (!bb.isEmpty()) { const c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3()); const d = Math.max(0.9, Math.min(2.1, Math.max(sz.x, sz.y) * 1.9));
        const back = o.view === "back"; S3.controls.target.set(0, c.y, 0); S3.cam.position.set(0, c.y + 0.05, back ? -d : d); S3.controls.update(); }
    }
  }).catch(() => { holder.innerHTML = `<div style="padding:16px">${muscleSVG(o.prim, o.sec, o.focus, false, o.colors)}<p class="xs mut c">Corps 3D indisponible hors connexion la première fois.</p></div>`; });
}
function bodyHover(S3, m) {
  if (S3.hov === m) return;
  if (S3.hov) { const mt = S3.hov.material; mt.emissive.setHex(mt.userData.e0 || 0); mt.emissiveIntensity = 1; }
  S3.hov = m; if (m) { m.material.emissive.setHex(0x2563eb); m.material.emissiveIntensity = 0.45; }
}
function bodyInfo(p) {
  const el = $("#bodyInfo"); if (!el) return;
  if (!p || p.g === "_b") { el.innerHTML = p ? "Os" : ""; return; }
  if (!MUSCLES[p.g]) { el.innerHTML = `<b>${esc(bodyPartLabel(p))}</b>`; return; }
  const ok = typeof gymExIds === "function" ? gymExIds() : null; const exs = Object.values(EX).filter(x => x.prim.includes(p.g) && (!ok || ok.has(x.id))).slice(0, 6);
  el.innerHTML = `<b>${esc(MUSCLES[p.g][0])}</b>${MUSCLE_INFO[p.g] ? `<div class="xs" style="margin-top:3px">${esc(MUSCLE_INFO[p.g])}</div>` : ""}${exs.length ? `<div class="xs mut" style="margin-top:3px">Dans ta salle : ${exs.map(x => esc(x.name)).join(" · ")}</div>` : ""}`;
}
function bodyApplyToggles(S3) {
  const o = S3.opts || {}; const hl = new Set([...(o.prim || []), ...(o.sec || [])]);
  S3.grp.userData.meshes.forEach(m => { const g = m.userData.part.g;
    if (g === "_skin") m.visible = !!S.bodySkin;
    else if (g === "_b") m.visible = S.bodyBones !== false;
    else m.visible = !(S.bodyIso && hl.size && !hl.has(g));
  });
}
// cadre la caméra sur tout le mouvement (positions de départ et d'arrivée)
function bodyFitAnim(S3, view) {
  const bb = new THREE.Box3(); const tmp = new THREE.Vector3();
  [0, 1].forEach(t => { applyPose(S3.grp, ANIM.A, ANIM.B, t); S3.grp.updateMatrixWorld(true); Object.values(S3.grp.userData.bones).forEach(b => bb.expandByPoint(b.getWorldPosition(tmp))); });
  applyPose(S3.grp, ANIM.A, ANIM.B, 0); bb.expandByScalar(0.14); bb.min.y = Math.min(bb.min.y, 0);
  const c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3()); const d = Math.max(1.4, Math.max(sz.y, sz.x, sz.z) * 1.35);
  const side = ANIM.pat && ["bench", "incline", "prone", "seatRecl", "kneel", "bentOver"].includes(ANIM.pat.base) || ["rdl", "row", "rowWide", "legPress", "dbRow", "seatedCurl", "lyingCurl", "calfSeat", "abductor", "backExt", "hipThrust", "dips", "squat", "hack", "lunge", "bulgarian", "seatedCurl", "legExt", "cableCrunch", "overheadExt", "pushdown"].includes(EX_ANIM[ANIM.exId]);
  const seated = ANIM.pat && ["seat", "seatRecl"].includes(ANIM.pat.base) && !side;
  const dir = side ? new THREE.Vector3(1, 0.22, 0.55) : seated ? new THREE.Vector3(0.75, 0.25, 1) : view === "back" ? new THREE.Vector3(-0.35, 0.18, -1) : new THREE.Vector3(0.45, 0.18, 1);
  S3.controls.target.copy(c); S3.cam.position.copy(c).add(dir.normalize().multiplyScalar(d)); S3.controls.update(); S3.dirty = performance.now() + 500;
}
function bodyView(v, instant) {
  const S3 = V3.scenes.body; if (!S3) return; const t = new THREE.Vector3(0, 0.9, 0);
  const p = v === "back" ? new THREE.Vector3(0, 1.0, -2.15) : v === "side" ? new THREE.Vector3(2.15, 1.0, 0) : new THREE.Vector3(0, 1.0, 2.15);
  if (instant) { S3.controls.target.copy(t); S3.cam.position.copy(p); S3.controls.update(); } else flyTo(S3, t, p);
}
// vue conseillée selon les muscles (dos pour dos/ischios/triceps…)
const BODY_BACK = new Set(["delt_post", "rot_cuff", "triceps_long", "triceps_latmed", "lats", "teres", "traps_mid", "traps_low", "erectors", "glutes_max", "glutes_med", "hamstrings", "calves"]);
function bodyBestView(prim) { const b = prim.filter(m => BODY_BACK.has(m)).length; return b > prim.length / 2 ? "back" : "front"; }
const BODY_ACT = {
  bodyMode: el => { S.bodyAnim = el.dataset.v === "1"; const c = $("#body3d canvas"); renderSheet(); },
  animPlay: el => { ANIM.playing = !ANIM.playing; ANIM.t0 = performance.now() - (ANIM.pausedAt || 0); el.textContent = ANIM.playing ? "⏸ Pause" : "▶ Lecture"; if (!ANIM.playing) ANIM.pausedAt = performance.now() - ANIM.t0; },
  animSpeed: el => { ANIM.speed = +el.dataset.v; ANIM.t0 = performance.now(); $$('[data-act="animSpeed"]').forEach(b => b.classList.toggle("on", b === el)); },
  bodyView: el => bodyView(el.dataset.v),
  bodyToggle: el => { const k = el.dataset.v; if (k === "skin") S.bodySkin = !S.bodySkin; else if (k === "bones") S.bodyBones = S.bodyBones === false; else S.bodyIso = !S.bodyIso;
    el.classList.toggle("on"); const S3 = V3.scenes.body; if (S3) bodyApplyToggles(S3); },
  bodyAtlas: () => openSheet(bodyAtlasSheet),
  bodyRecovery: () => openSheet(bodyRecoverySheet),
};
function bodyAtlasSheet() {
  return `<div class="row between"><h2>Anatomie 3D</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    <p class="xs mut">Touche un muscle pour voir son nom et les exercices qui le travaillent.</p>${body3DHolderHTML(520)}
    <p class="xs mut c" style="margin-top:8px">Modèle anatomique BodyParts3D © DBCLS, CC BY-SA 2.1 JP.</p>`;
}
function bodyRecoverySheet() {
  return `<div class="row between"><h2>Récupération en 3D</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>${body3DHolderHTML(500)}
    <div class="row xs" style="gap:10px;justify-content:center;margin:6px 0"><span><b style="color:#22c55e">●</b> récupéré</span><span><b style="color:#eab308">●</b> presque</span><span><b style="color:#f97316">●</b> fatigué</span><span><b style="color:#ef4444">●</b> à reposer</span></div>`;
}
// appelé après chaque affichage de feuille : monte la vue 3D si la feuille en contient une
function bodyAfterSheet() {
  const h = $("#body3d"); if (!h || h.querySelector("canvas")) return;
  const f = S.sheet; let o = {};
  if (f === bodyRecoverySheet) { const rec = muscleFatigue(); o.colors = {}; Object.entries(rec).forEach(([m, r]) => o.colors[m] = recColor(r)); }
  else if (S.bodyEx) { const x = getEx(S.bodyEx); o = { prim: x.prim, sec: x.sec, focus: x.focus, view: bodyBestView(x.prim), anim: S.bodyAnim === false ? null : S.bodyEx }; }
  bodyMount(h, o);
}
