// ===================== MOTEUR 3D (Three.js) =====================
const V3 = { scenes: {}, active: null, raf: null };
const has3D = () => typeof THREE !== "undefined";
function M(color, o = {}) { const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.1 }, o)); m.color.convertSRGBToLinear(); return m; }
function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 20) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); m.castShadow = true; return m; }
function sph(r, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat); m.position.set(x, y, z); m.castShadow = true; return m; }
function labelSprite(text, scale = 1, bg = "rgba(20,22,26,.85)") {
  const c = document.createElement("canvas"); const ctx = c.getContext("2d"); const fs = 44; ctx.font = `600 ${fs}px -apple-system,system-ui,sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 36; c.width = w; c.height = fs + 26;
  ctx.font = `600 ${fs}px -apple-system,system-ui,sans-serif`; ctx.fillStyle = bg; const r = 18;
  ctx.beginPath(); ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, c.height, r); ctx.arcTo(w, c.height, 0, c.height, r); ctx.arcTo(0, c.height, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(text, 18, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, sizeAttenuation: false }));
  const k = 0.04 * scale; s.scale.set(c.width / c.height * k, k, 1); s.renderOrder = 10; return s;
}
function makeScene(key, opts) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.shadowMap.enabled = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(isDark() ? (opts.bg || 0x1b1e24) : (opts.bgLight || 0xe4e8ef));
  const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 100); cam.position.set(...opts.cam);
  // Salle : contrôles « carte » (glisser = se déplacer, clic droit / 2 doigts = tourner, molette / pincer = zoom)
  const controls = opts.map && THREE.MapControls ? new THREE.MapControls(cam, renderer.domElement) : new THREE.OrbitControls(cam, renderer.domElement);
  controls.target.set(...opts.target); controls.enableDamping = true; controls.dampingFactor = 0.12;
  controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = opts.minD || 1; controls.maxDistance = opts.maxD || 20;
  if (opts.map) { controls.screenSpacePanning = false; controls.panSpeed = 1.2; controls.rotateSpeed = 0.7; controls.zoomSpeed = 1.2; controls.keyPanSpeed = 25; try { controls.listenToKeyEvents(window); } catch (e) {} }
  controls.update();
  // Trackpad Mac : 2 doigts = tourner la salle, pincer = zoom. Molette de souris classique = zoom.
  controls.enableZoom = false;
  renderer.domElement.addEventListener("wheel", e => {
    e.preventDefault(); S3.anim = null;
    const t = controls.target, off = cam.position.clone().sub(t);
    const mouseWheel = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 60 && Number.isInteger(e.deltaY));
    if (e.ctrlKey || mouseWheel) {
      const k = Math.exp((e.ctrlKey ? e.deltaY * 0.01 : Math.sign(e.deltaY) * 0.15));
      off.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, off.length() * k)));
    } else {
      const sp = new THREE.Spherical().setFromVector3(off);
      sp.theta += (localStorage.getItem("muscu_inv3d") === "1" ? -1 : 1) * e.deltaX * 0.006; sp.phi = Math.max(0.12, Math.min(controls.maxPolarAngle, sp.phi + e.deltaY * 0.004));
      off.setFromSpherical(sp);
    }
    cam.position.copy(t).add(off); controls.update();
  }, { passive: false });
  // Safari (trackpad Mac / iPhone) : pincer = zoom, TOURNER les 2 doigts = faire pivoter la salle dans le même sens que les doigts
  let gScale = 1, gRot = 0; renderer.domElement.addEventListener("gesturestart", e => { e.preventDefault(); gScale = 1; gRot = 0; });
  renderer.domElement.addEventListener("gesturechange", e => { e.preventDefault(); S3.anim = null;
    const off = cam.position.clone().sub(controls.target); off.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, off.length() * gScale / e.scale))); gScale = e.scale; cam.position.copy(controls.target).add(off);
    const dr = (e.rotation || 0) - gRot; gRot = e.rotation || 0; if (dr) rotateView(S3, dr * Math.PI / 180); controls.update(); });
  // écran tactile : rotation des 2 doigts (twist)
  let tAng = null; const ang2 = t => Math.atan2(t[1].clientY - t[0].clientY, t[1].clientX - t[0].clientX);
  renderer.domElement.addEventListener("touchstart", e => { tAng = e.touches.length === 2 ? ang2(e.touches) : null; }, { passive: true });
  renderer.domElement.addEventListener("touchmove", e => { if (e.touches.length !== 2 || tAng == null || typeof GestureEvent !== "undefined") return; const a = ang2(e.touches); let d = a - tAng; tAng = a;
    if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; rotateView(S3, d); controls.update(); }, { passive: true });
  renderer.domElement.addEventListener("touchend", () => { tAng = null; }, { passive: true });
  if (THREE.TOUCH) controls.touches = { ONE: opts.map ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  if (opts.bounds) controls.addEventListener("change", () => { const b = opts.bounds, t = controls.target; const cx = Math.max(b[0], Math.min(b[1], t.x)), cz = Math.max(b[2], Math.min(b[3], t.z)); if (cx !== t.x || cz !== t.z) { const dx = cx - t.x, dz = cz - t.z; t.x = cx; t.z = cz; cam.position.x += dx; cam.position.z += dz; } });
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444455, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(5, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); scene.add(sun);
  const S3 = { key, renderer, scene, cam, controls, pickables: [], onPick: opts.onPick, hover: null, home: { cam: [...opts.cam], target: [...opts.target] }, anim: null };

  // tap vs glisser
  let down = null; const ray = new THREE.Raycaster(); const v = new THREE.Vector2();
  const hit = e => { const r = renderer.domElement.getBoundingClientRect(); v.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v, cam); const hits = ray.intersectObjects(S3.pickables, true); if (!hits.length) return null; let o = hits[0].object; while (o && !o.userData.pick) o = o.parent; return o; };
  renderer.domElement.addEventListener("pointerdown", e => { down = [e.clientX, e.clientY, Date.now()]; });
  renderer.domElement.addEventListener("pointermove", e => {
    if (e.pointerType === "touch" || (down && e.buttons)) return;
    const o = hit(e); if (o === S3.hover) return;
    if (S3.hover && S3.hover !== S3.selected) tint(S3.hover, null);
    S3.hover = o; if (o && o !== S3.selected) tint(o, 0x1d4ed8, 0.35);
    renderer.domElement.style.cursor = o ? "pointer" : "grab";
    if (S3.tip) { S3.tip.style.display = o ? "block" : "none"; if (o) { S3.tip.textContent = o.userData.label || ""; S3.tip.style.left = (e.offsetX + 14) + "px"; S3.tip.style.top = (e.offsetY + 10) + "px"; } }
  });
  renderer.domElement.addEventListener("dblclick", e => { const o = hit(e); if (o) flyTo(S3, o.getWorldPosition(new THREE.Vector3())); });
  renderer.domElement.addEventListener("pointerleave", () => { if (S3.hover && S3.hover !== S3.selected) tint(S3.hover, null); S3.hover = null; if (S3.tip) S3.tip.style.display = "none"; });
  renderer.domElement.addEventListener("pointerup", e => {
    if (!down) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); const dt = Date.now() - down[2]; down = null;
    if (moved > 8 || dt > 600) return;
    const r = renderer.domElement.getBoundingClientRect(); v.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (S && S.sheet) return; // une seule machine à la fois
    const o = hit(e); if (o) { select3D(S3, o); S3.onPick && S3.onPick(o.userData.pick); }
  });
  const wake = () => { S3.dirty = performance.now() + 600; };
  controls.addEventListener("change", wake); ["pointermove", "pointerdown", "wheel", "gesturechange"].forEach(ev => renderer.domElement.addEventListener(ev, wake, { passive: true }));
  V3.scenes[key] = S3; return S3;
}
// fait tourner le contenu de l'écran dans le sens des aiguilles d'une montre de « a » radians (a < 0 : sens inverse)
function rotateView(S3, a) {
  const t = S3.controls.target, off = S3.cam.position.clone().sub(t);
  off.applyAxisAngle(new THREE.Vector3(0, 1, 0), (localStorage.getItem("muscu_inv3d") === "1" ? -1 : 1) * ROT_SIGN * a); S3.cam.position.copy(t).add(off); S3.dirty = performance.now() + 400;
}
const ROT_SIGN = 1;
// surbrillance : la couleur d'origine est mémorisée une seule fois, donc plusieurs clics rapides ne laissent plus de machine « bloquée » en couleur
function tint(o, hex, k = 0.6) { Object.values(V3.scenes).forEach(s3 => s3.dirty = performance.now() + 300);
  // chaque objet reçoit ses propres copies de matériaux : sinon le survol colorait toutes les machines qui partagent le même matériau
  if (!o.userData.matsOwned) { const map = new Map(); o.traverse(m => { if (m.isMesh && m.material && !Array.isArray(m.material)) { if (!map.has(m.material)) map.set(m.material, m.material.clone()); m.material = map.get(m.material); } }); o.userData.matsOwned = true; }
  o.traverse(m => { if (!m.isMesh || !m.material || !m.material.emissive) return; const mt = m.material; if (mt.userData.base === undefined) mt.userData.base = mt.emissive.getHex(); if (hex == null) { mt.emissive.setHex(mt.userData.base); mt.emissiveIntensity = 1; } else { mt.emissive.setHex(hex); mt.emissiveIntensity = k; } }); }
function select3D(S3, o) { if (S3.selected && S3.selected !== o) tint(S3.selected, null); S3.selected = o; tint(o, 0x2563eb, 0.75); }
V3.clearSel = () => Object.values(V3.scenes).forEach(S3 => { if (S3.selected) { tint(S3.selected, null); S3.selected = null; } if (S3.hover) { tint(S3.hover, null); S3.hover = null; } });
function mount3D(key, holder, build) {
  if (!has3D()) { holder.innerHTML = `<p class="mut sm c" style="padding:30px">La 3D n'a pas pu se charger (connexion ?).</p>`; return null; }
  let S3 = V3.scenes[key]; if (!S3) { S3 = build(); }
  holder.style.position = "relative"; holder.appendChild(S3.renderer.domElement);
  if (!S3.tip) { S3.tip = document.createElement("div"); S3.tip.style.cssText = "position:absolute;pointer-events:none;background:rgba(17,24,39,.88);color:#fff;font:600 13px -apple-system,system-ui;padding:6px 10px;border-radius:10px;display:none;white-space:nowrap;z-index:2"; }
  holder.appendChild(S3.tip);
  if (key !== "body" && !holder.querySelector(".navpad")) { const pad = document.createElement("div"); pad.className = "navpad"; pad.innerHTML = navPadHTML(key); holder.appendChild(pad);
    const hint = document.createElement("div"); hint.style.cssText = "pointer-events:none;position:absolute;left:10px;top:10px;z-index:3;background:var(--card);color:var(--mut);font:12px -apple-system,system-ui;padding:6px 10px;border-radius:10px;box-shadow:var(--shadow);max-width:60%";
    hint.textContent = key === "gym" ? "Tourner 2 doigts = pivoter · pincer = zoom · glisser = se déplacer · double-clic = aller à la machine" : "Glisser = tourner · pincer = zoom"; holder.appendChild(hint); }
  if (!S3._ro) { S3._ro = new ResizeObserver(() => { const h2 = S3.renderer.domElement.parentElement; if (!h2) return; const w2 = h2.clientWidth, hh = h2.clientHeight; if (w2 && hh) { S3.renderer.setSize(w2, hh); S3.cam.aspect = w2 / hh; S3.cam.updateProjectionMatrix(); } }); } S3._ro.disconnect(); S3._ro.observe(holder);
  const w = holder.clientWidth || 360, h = holder.clientHeight || 300; S3.renderer.setSize(w, h); S3.cam.aspect = w / h; S3.cam.updateProjectionMatrix();
  S3.dirty = performance.now() + 1500; V3.active = S3; if (!V3.raf) loop3D(); return S3;
}
// ---- déplacements par boutons / animations ----
function flyTo(S3, target, camPos) {
  const t0 = S3.controls.target.clone(), c0 = S3.cam.position.clone();
  const t1 = target.clone(); const c1 = camPos ? camPos.clone() : t1.clone().add(c0.clone().sub(t0).setLength(Math.min(7, c0.distanceTo(t0))));
  S3.anim = { t0, c0, t1, c1, s: performance.now(), d: 650 };
}
function camMove(S3, kind) {
  const c = S3.controls, cam = S3.cam, t = c.target; const off = cam.position.clone().sub(t);
  if (kind === "in" || kind === "out") { const k = kind === "in" ? 0.7 : 1.4; const len = Math.max(c.minDistance, Math.min(c.maxDistance, off.length() * k)); flyTo(S3, t, t.clone().add(off.setLength(len))); return; }
  if (kind === "left" || kind === "right") { const a = (kind === "left" ? 1 : -1) * Math.PI / 6; const o2 = off.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a); flyTo(S3, t, t.clone().add(o2)); return; }
  if (kind === "top") { flyTo(S3, t, t.clone().add(new THREE.Vector3(0.01, Math.max(14, off.length()), 0.6))); return; }
  if (kind === "home") { flyTo(S3, new THREE.Vector3(...S3.home.target), new THREE.Vector3(...S3.home.cam)); return; }
  const fwd = t.clone().sub(cam.position); fwd.y = 0; fwd.normalize(); const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const step = Math.max(1.5, off.length() * 0.18); const d = kind === "up" ? fwd.multiplyScalar(step) : kind === "down" ? fwd.multiplyScalar(-step) : kind === "pl" ? right.multiplyScalar(-step) : right.multiplyScalar(step);
  flyTo(S3, t.clone().add(d), cam.position.clone().add(d));
}
function navPadHTML(key) {
  const b = (k, l, t) => `<button class="sec small" data-act="cam" data-k="${key}" data-v="${k}" title="${t}" style="width:40px;height:40px;padding:0;font-size:17px;box-shadow:var(--shadow)">${l}</button>`;
  return `<div style="position:absolute;right:10px;bottom:10px;display:grid;grid-template-columns:repeat(3,40px);gap:6px;z-index:3">
    ${b("left", "⟲", "Tourner à gauche")}${b("up", "▲", "Avancer")}${b("right", "⟳", "Tourner à droite")}
    ${b("pl", "◀", "Aller à gauche")}${b("home", "⌂", "Vue de départ")}${b("pr", "▶", "Aller à droite")}
    ${b("in", "＋", "Zoomer")}${b("down", "▼", "Reculer")}${b("out", "－", "Dézoomer")}
    <div></div>${b("top", "⬒", "Vue de dessus")}<div></div></div>`;
}
function loop3D() {
  V3.raf = requestAnimationFrame(loop3D);
  const S3 = V3.active; if (!S3 || !S3.renderer.domElement.isConnected) return;
  if (S3.anim) { const a = S3.anim; let k = Math.min(1, (performance.now() - a.s) / a.d); k = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    S3.controls.target.lerpVectors(a.t0, a.t1, k); S3.cam.position.lerpVectors(a.c0, a.c1, k); if (k >= 1) S3.anim = null; }
  S3.controls.update();
  // rendu à la demande : on ne redessine que pendant un mouvement / une animation (économise la batterie)
  const now = performance.now(); if (!S3.tick && !S3.anim && now > (S3.dirty || 0)) return;
  if (S3.tick) S3.tick(now / 1000); if (S3.key === "gym") gymLabels(S3); S3.renderer.render(S3.scene, S3.cam);
}

// ===================== SALLE DE SPORT 3D =====================
// Reconstitution de l'UAX Fitness Center (Villanueva de la Cañada), d'après les photos officielles UAX et BH Fitness
// (équipementier de la salle) : halle aux murs gris anthracite et charpente apparente, lettrage « UAX FITNESS CENTER »
// au fond, sol caoutchouc noir avec marquages blancs (cercles, échelles), piste en gazon vert à gauche,
// plateforme parquet au premier plan avec les machines à disques BH (cadres argent, assises rouges),
// machines guidées BH à carter gris le long du mur gauche + 2 multi-postes à bras blancs,
// rack fonctionnel noir (RFT) + poulie double au centre, grand portique gris à crochets rouges + espaliers au fond,
// râteliers d'haltères hexagonales devant le miroir (fond droit), racks gris à droite, tapis courbes / air bike / rameurs.
const GYM_MACHINES = [
  // mur gauche : machines guidées BH (carter gris, assises rouges)
  { id: "pulldown", label: "Tirage vertical", pos: [-11, 0, -5.6], rot: Math.PI / 2, build: "sel_pulldown", ex: ["lat_pulldown_pron", "pull_up"] },
  { id: "row", label: "Tirage horizontal", pos: [-11, 0, -3.6], rot: Math.PI / 2, build: "sel_row", ex: ["row_neutral_close", "row_pron_wide"] },
  { id: "pecdeck", label: "Pec fly / Oiseau", pos: [-11, 0, -1.6], rot: Math.PI / 2, build: "sel_pecdeck", ex: ["pec_fly_machine", "rear_delt_fly"] },
  { id: "legext", label: "Leg extension", pos: [-11, 0, 0.4], rot: Math.PI / 2, build: "sel_legext", ex: ["leg_ext"] },
  { id: "legcurl", label: "Leg curl assis", pos: [-11, 0, 2.3], rot: Math.PI / 2, build: "sel_legcurl", ex: ["seated_leg_curl", "lying_leg_curl"] },
  { id: "adductor", label: "Adducteurs / abducteurs", pos: [-11, 0, 4.2], rot: Math.PI / 2, build: "sel_adductor", ex: ["adductor_machine", "abductor_machine"] },
  { id: "multi1", label: "Multi-poste poulies", pos: [-9.3, 0, 6.3], rot: Math.PI / 2, build: "multistation", ex: ["lat_raise_cable", "tri_push_rope", "tri_push_uni", "face_pull", "hammer_rope", "cable_crunch"] },
  // plateforme parquet : machines à disques BH
  { id: "incline", label: "Développé incliné (disques)", pos: [-6.4, 0.08, 3.6], rot: Math.PI, build: "pl_incline", ex: ["incline_press_machine", "chest_press"] },
  { id: "chestpl", label: "Développé couché (disques)", pos: [-4.0, 0.08, 3.6], rot: Math.PI, build: "pl_chest", ex: ["chest_press", "incline_press_machine"] },
  { id: "pshoulder", label: "Développé épaules (disques)", pos: [-1.6, 0.08, 3.6], rot: Math.PI, build: "pl_shoulder", ex: ["shoulder_press"] },
  { id: "ppulldown", label: "Tirage iso-latéral (disques)", pos: [0.8, 0.08, 3.6], rot: Math.PI, build: "pl_pulldown", ex: ["lat_pulldown_pron"] },
  { id: "prow", label: "Rowing iso-latéral (disques)", pos: [-6.4, 0.08, 6.2], rot: Math.PI, build: "pl_row", ex: ["row_neutral_close", "row_pron_wide", "db_row"] },
  { id: "legpress", label: "Presse à cuisses 45°", pos: [-3.8, 0.08, 6.4], rot: Math.PI, build: "pl_legpress", ex: ["leg_press", "calf_seated"] },
  { id: "hack", label: "Hack squat", pos: [-1.3, 0.08, 6.4], rot: Math.PI, build: "pl_hack", ex: ["hack_squat", "calf_standing"] },
  { id: "preacher", label: "Pupitre biceps", pos: [1.0, 0.08, 6.4], rot: Math.PI, build: "pl_preacher", ex: ["preacher_curl"] },
  // centre : zone fonctionnelle
  { id: "cable", label: "Poulie double réglable", pos: [-2.2, 0, -1.6], rot: 0, build: "dual_cable", ex: ["lat_raise_cable", "tri_oh_cable", "tri_push_uni", "tri_push_rope", "hammer_rope", "bayesian_curl", "cable_crunch", "face_pull"] },
  { id: "rig", label: "Rack fonctionnel (tractions, dips)", pos: [-5.2, 0, -1.8], rot: 0, build: "rft", ex: ["pull_up", "dips", "back_ext"] },
  { id: "multi2", label: "Multi-poste poulies 2", pos: [-9.3, 0, -7.0], rot: 0, build: "multistation", ex: ["lat_raise_cable", "tri_oh_cable", "bayesian_curl", "face_pull"] },
  { id: "benches", label: "Bancs réglables", pos: [2.4, 0, -0.6], rot: 0, build: "benches", ex: ["db_incline_press", "incline_db_curl", "lat_raise_db", "db_row", "shoulder_press", "bulgarian", "hip_thrust"] },
  { id: "backext", label: "Banc lombaires 45°", pos: [-0.2, 0, 0.9], rot: -Math.PI / 4, build: "hyper", ex: ["back_ext"] },
  // fond : portique gris + espaliers, haltères devant le miroir
  { id: "overrig", label: "Portique + espaliers", pos: [0.5, 0, -6.6], rot: 0, build: "overrig", ex: ["pull_up"] },
  { id: "dumbbells", label: "Haltères + bancs", pos: [6.2, 0, -6.3], rot: 0, build: "dumbbells", ex: ["db_incline_press", "incline_db_curl", "lat_raise_db", "db_row", "rdl", "lunges", "shrug"] },
  // droite : racks
  { id: "rack", label: "Rack + banc", pos: [10.6, 0, -1.6], rot: -Math.PI / 2, build: "rack", ex: ["squat", "bench_press", "hip_thrust", "shrug"] },
  { id: "rack2", label: "Rack 2 (squat / soulevé)", pos: [10.6, 0, 1.4], rot: -Math.PI / 2, build: "rack", ex: ["squat", "rdl", "bench_press"] },
  // fond gauche : tapis courbes, air bike, rameur
  { id: "sleds", label: "Tapis courbes + air bike", pos: [-5.4, 0, -6.9], rot: 0, build: "sleds", ex: [] },
  { id: "cardio", label: "Tapis + escalier", pos: [6.8, 0, 5.4], rot: 0, build: "cardio", ex: [] }
];
// ---------- matériaux communs ----------
const GYMMAT = {};
function gm() {
  if (GYMMAT.ok) return GYMMAT;
  Object.assign(GYMMAT, { ok: true,
    silver: M(0xc5cad1, { metalness: 0.75, roughness: 0.28 }), grey: M(0x8d949c, { metalness: 0.5, roughness: 0.4 }), shroud: M(0x757c85, { metalness: 0.35, roughness: 0.45 }),
    black: M(0x1b1c1f, { metalness: 0.4, roughness: 0.5 }), red: M(0xb81f2a, { roughness: 0.62 }), plate: M(0x141516, { roughness: 0.55 }), white: M(0xf2f2f2, { metalness: 0.3, roughness: 0.3 }),
    chrome: M(0xe2e5e9, { metalness: 0.9, roughness: 0.15 }), cable: M(0x0e0e0e), rubber: M(0x222326, { roughness: 0.9 }), yellow: M(0xf4c20d, { roughness: 0.5 }) });
  return GYMMAT;
}
// tube rond entre deux points
function tubeAB(a, b, r, mat) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), mat); m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); m.castShadow = true; return m; }
// tube carré entre deux points (cadres)
function barAB(a, b, w, mat) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), mat); m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); m.castShadow = true; return m; }
function rbox(w, h, d, mat, x, y, z, r = 0.03) { // coussin arrondi
  const sh = new THREE.Shape(); const ww = w / 2 - r, hh = d / 2 - r;
  sh.moveTo(-ww, -d / 2); sh.lineTo(ww, -d / 2); sh.quadraticCurveTo(w / 2, -d / 2, w / 2, -hh); sh.lineTo(w / 2, hh); sh.quadraticCurveTo(w / 2, d / 2, ww, d / 2);
  sh.lineTo(-ww, d / 2); sh.quadraticCurveTo(-w / 2, d / 2, -w / 2, hh); sh.lineTo(-w / 2, -hh); sh.quadraticCurveTo(-w / 2, -d / 2, -ww, -d / 2);
  const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(-Math.PI / 2); g.translate(0, -h / 2, 0); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.castShadow = true; return m; }
function plateDisc(r, x, y, z, axis = "x") { const G = gm(); const g = new THREE.Group();
  const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 28), G.plate); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 14), G.chrome);
  g.add(d, hub); if (axis === "x") g.rotation.z = Math.PI / 2; else if (axis === "z") g.rotation.x = Math.PI / 2; g.position.set(x, y, z); d.castShadow = true; return g; }
function stickerTex(text, bg = "#5f666e", fg = "#ffffff") { const c = document.createElement("canvas"); c.width = 256; c.height = 128; const x = c.getContext("2d");
  x.fillStyle = bg; x.fillRect(0, 0, 256, 128); x.fillStyle = fg; x.font = "bold 70px Georgia,serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 128, 68); return new THREE.CanvasTexture(c); }
let UAX_TEX = null;
// carter de pile de charges BH (gris, fenêtre noire, autocollant UAX)
function shroud(g, x, z, h = 1.9, rot = 0) { const G = gm(); const t = new THREE.Group();
  t.add(box(0.5, h, 0.34, G.shroud, 0, h / 2, 0)); t.add(box(0.12, h * 0.8, 0.012, G.black, 0, h * 0.48, 0.172)); t.add(box(0.52, 0.06, 0.36, G.black, 0, h, 0));
  if (!UAX_TEX) UAX_TEX = stickerTex("UAX"); const st = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: UAX_TEX })); st.position.set(0, h - 0.22, 0.172); t.add(st);
  t.position.set(x, 0, z); t.rotation.y = rot; g.add(t); return t; }
function buildMachine(type) {
  const g = new THREE.Group(); const G = gm();
  const seat = (x, y, z, w = 0.42, d = 0.4, mat = G.red) => g.add(rbox(w, 0.09, d, mat, x, y, z));
  const backPad = (x, y, z, ang, h = 0.7, w = 0.42) => { const b = rbox(w, 0.09, h, G.red, 0, 0, 0); const p = new THREE.Group(); b.rotation.x = Math.PI / 2; p.add(b); p.rotation.x = ang; p.position.set(x, y, z); g.add(p); return p; };
  const roller = (x, y, z, len = 0.42) => { const r = tubeAB([x - len / 2, y, z], [x + len / 2, y, z], 0.065, G.red); g.add(r); };
  const foot = (w, d, x = 0, z = 0, mat = G.silver) => { [-1, 1].forEach(sd => g.add(box(0.07, 0.06, d, mat, x + sd * (w / 2 - 0.035), 0.03, z))); [-1, 1].forEach(sd => g.add(box(w, 0.06, 0.07, mat, x, 0.03, z + sd * (d / 2 - 0.035)))); };
  switch (type) {
    // ---------- machines guidées BH ----------
    case "sel_pulldown":
      foot(0.9, 1.4, 0, 0.1); shroud(g, 0, -0.45, 2.2); g.add(barAB([0, 2.25, -0.45], [0, 2.25, 0.45], 0.09, G.silver)); g.add(barAB([0, 0.05, 0.55], [0, 1.0, 0.5], 0.08, G.silver));
      g.add(tubeAB([-0.6, 1.95, 0.45], [0.6, 1.95, 0.45], 0.018, G.chrome)); g.add(tubeAB([-0.6, 1.95, 0.45], [-0.75, 1.82, 0.45], 0.018, G.chrome)); g.add(tubeAB([0.6, 1.95, 0.45], [0.75, 1.82, 0.45], 0.018, G.chrome));
      g.add(tubeAB([0, 1.95, 0.45], [0, 2.22, 0.45], 0.008, G.cable)); seat(0, 0.5, 0.62); roller(0, 0.78, 0.5, 0.5); break;
    case "sel_row":
      foot(0.9, 1.5, 0, 0.1); shroud(g, 0, -0.5, 1.7); g.add(barAB([0, 0.05, 0.55], [0, 0.45, 0.6], 0.08, G.silver)); seat(0, 0.5, 0.6);
      g.add(barAB([0, 0.45, 0.25], [0, 0.95, 0.2], 0.07, G.silver)); backPad(0, 1.05, 0.22, 0.15, 0.5); g.add(tubeAB([-0.28, 1.02, -0.05], [0.28, 1.02, -0.05], 0.02, G.chrome));
      g.add(tubeAB([-0.28, 1.02, -0.05], [-0.28, 0.9, -0.05], 0.02, G.chrome), tubeAB([0.28, 1.02, -0.05], [0.28, 0.9, -0.05], 0.02, G.chrome)); break;
    case "sel_pecdeck":
      foot(1.0, 1.2); shroud(g, 0, -0.45, 2.0); seat(0, 0.55, 0.15); backPad(0, 1.05, -0.08, 0, 0.75);
      [-1, 1].forEach(s => { g.add(tubeAB([s * 0.12, 1.75, -0.2], [s * 0.62, 1.75, 0.0], 0.03, G.silver)); g.add(tubeAB([s * 0.62, 1.75, 0.0], [s * 0.62, 1.2, 0.05], 0.025, G.silver)); g.add(tubeAB([s * 0.62, 1.55, 0.05], [s * 0.62, 1.25, 0.05], 0.04, G.black)); }); break;
    case "sel_legext":
      foot(0.9, 1.2); shroud(g, -0.45, -0.4, 1.7); seat(0.05, 0.55, 0.05, 0.46, 0.46); backPad(0.05, 0.95, -0.22, -0.12, 0.65);
      g.add(barAB([0.05, 0.05, 0.05], [0.05, 0.5, 0.05], 0.08, G.silver)); g.add(tubeAB([0.32, 0.6, 0.25], [0.32, 0.22, 0.42], 0.025, G.silver)); roller(0.05, 0.25, 0.43, 0.48); [-1, 1].forEach(s => g.add(tubeAB([0.05 + s * 0.3, 0.7, -0.05], [0.05 + s * 0.3, 0.7, 0.2], 0.02, G.black))); break;
    case "sel_legcurl":
      foot(0.9, 1.3); shroud(g, -0.45, -0.45, 1.7); seat(0.05, 0.55, 0.0, 0.46, 0.46); backPad(0.05, 0.95, -0.25, -0.12, 0.65);
      g.add(barAB([0.05, 0.05, 0.0], [0.05, 0.5, 0.0], 0.08, G.silver)); roller(0.05, 0.68, 0.35, 0.48); roller(0.05, 0.5, 0.55, 0.48); g.add(tubeAB([0.32, 0.72, 0.3], [0.32, 0.5, 0.55], 0.025, G.silver)); break;
    case "sel_adductor":
      foot(1.0, 1.1); shroud(g, 0, -0.45, 1.7); seat(0, 0.5, 0.1, 0.48, 0.45); backPad(0, 0.88, -0.15, -0.35, 0.6);
      [-1, 1].forEach(s => { g.add(tubeAB([s * 0.2, 0.45, 0.1], [s * 0.35, 0.55, 0.55], 0.03, G.silver)); g.add(rbox(0.06, 0.06, 0.28, G.red, s * 0.38, 0.62, 0.5)); }); break;
    case "multistation": {
      foot(2.6, 1.6, 0, 0, G.black);
      [-0.95, 0.95].forEach(x => { shroud(g, x, -0.55, 2.15); g.add(barAB([x, 2.2, -0.55], [x, 2.2, 0.3], 0.1, G.black)); });
      g.add(barAB([-0.95, 2.25, -0.2], [0.95, 2.25, -0.2], 0.1, G.black));
      [-1, 1].forEach(s => { const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(s * 0.95, 2.2, 0.3), new THREE.Vector3(s * 1.15, 2.35, 0.9), new THREE.Vector3(s * 1.25, 1.6, 1.1));
        const arm = new THREE.Mesh(new THREE.TubeGeometry(c, 20, 0.035, 10), G.white); arm.castShadow = true; g.add(arm); g.add(tubeAB([s * 1.25, 1.6, 1.1], [s * 1.25, 1.2, 1.1], 0.006, G.cable)); });
      seat(0, 0.48, 0.35, 0.5, 0.4); g.add(barAB([0, 0.05, 0.35], [0, 0.45, 0.35], 0.07, G.black)); backPad(0, 0.95, 0.12, 0.0, 0.7);
      g.add(rbox(0.4, 0.08, 1.0, G.red, 0, 0.42, 1.1)); g.add(barAB([0, 0.05, 1.1], [0, 0.38, 1.1], 0.07, G.black)); break; }
    // ---------- machines à disques BH (cadres argent ronds, assises rouges) ----------
    case "pl_incline": case "pl_chest": case "pl_shoulder": {
      const ang = type === "pl_incline" ? -0.75 : type === "pl_chest" ? -0.25 : -0.12; const sy = type === "pl_shoulder" ? 0.55 : 0.5;
      foot(1.1, 1.5, 0, 0); g.add(tubeAB([0, 0.05, 0.55], [0, sy - 0.05, 0.45], 0.045, G.silver)); seat(0, sy, 0.45, 0.42, 0.42);
      g.add(tubeAB([0, 0.05, 0.3], [0, 1.25, 0.65], 0.045, G.silver)); backPad(0, sy + 0.45, 0.62, ang, 0.75);
      g.add(tubeAB([0, 0.05, -0.55], [0, 1.6, -0.5], 0.05, G.silver)); g.add(tubeAB([-0.55, 0.05, -0.55], [0.55, 0.05, -0.55], 0.045, G.silver));
      [-1, 1].forEach(s => { const p0 = [s * 0.1, 1.55, -0.5], p1 = [s * 0.42, type === "pl_shoulder" ? 1.55 : 1.1, 0.05], p2 = [s * 0.55, 0.85, -0.6];
        g.add(tubeAB(p0, p1, 0.035, G.silver)); g.add(tubeAB(p0, p2, 0.035, G.silver)); g.add(tubeAB([s * 0.42, p1[1], 0.05], [s * 0.42, p1[1] - 0.25, 0.12], 0.025, G.black));
        g.add(tubeAB([s * 0.52, 0.85, -0.6], [s * 0.72, 0.85, -0.6], 0.025, G.chrome)); g.add(plateDisc(0.23, s * 0.6, 0.85, -0.6)); g.add(plateDisc(0.17, s * 0.66, 0.85, -0.6)); });
      break; }
    case "pl_pulldown":
      foot(1.1, 1.5); g.add(tubeAB([0, 0.05, -0.55], [0, 2.25, -0.4], 0.055, G.silver)); g.add(tubeAB([0, 0.05, 0.55], [0, 0.45, 0.4], 0.045, G.silver)); seat(0, 0.5, 0.4); roller(0, 0.78, 0.25, 0.5);
      [-1, 1].forEach(s => { g.add(tubeAB([0, 2.2, -0.4], [s * 0.55, 1.95, 0.35], 0.035, G.silver)); g.add(tubeAB([s * 0.55, 1.95, 0.35], [s * 0.55, 1.65, 0.38], 0.025, G.black));
        g.add(tubeAB([0, 2.2, -0.4], [s * 0.5, 1.3, -0.7], 0.035, G.silver)); g.add(plateDisc(0.23, s * 0.62, 1.3, -0.7)); }); break;
    case "pl_row":
      foot(1.1, 1.6); g.add(tubeAB([0, 0.05, 0.6], [0, 0.45, 0.55], 0.045, G.silver)); seat(0, 0.5, 0.55); g.add(tubeAB([0, 0.05, 0.1], [0, 1.05, 0.12], 0.045, G.silver));
      const chest = backPad(0, 1.05, 0.15, 0.2, 0.45); chest.rotation.x = 0.2;
      [-1, 1].forEach(s => { g.add(tubeAB([s * 0.12, 1.3, -0.65], [s * 0.42, 1.0, -0.15], 0.035, G.silver)); g.add(tubeAB([s * 0.42, 1.05, -0.15], [s * 0.42, 0.75, -0.12], 0.025, G.black));
        g.add(tubeAB([s * 0.12, 1.3, -0.65], [s * 0.55, 0.8, -0.75], 0.035, G.silver)); g.add(plateDisc(0.23, s * 0.66, 0.8, -0.75)); });
      g.add(tubeAB([0, 0.05, -0.65], [0, 1.35, -0.65], 0.05, G.silver)); break;
    case "pl_legpress": {
      foot(1.2, 2.3, 0, 0); [-0.3, 0.3].forEach(x => g.add(tubeAB([x, 0.25, 1.0], [x, 1.7, -0.75], 0.05, G.silver)));
      const sledP = new THREE.Group(); sledP.add(box(0.75, 0.62, 0.05, G.black, 0, 0, 0)); sledP.add(box(0.8, 0.06, 0.25, G.silver, 0, -0.3, 0.1)); sledP.rotation.x = 0.78; sledP.position.set(0, 1.25, -0.35); g.add(sledP);
      [-1, 1].forEach(s => { g.add(tubeAB([s * 0.4, 1.1, -0.55], [s * 0.62, 1.1, -0.55], 0.025, G.chrome)); g.add(plateDisc(0.23, s * 0.5, 1.1, -0.55)); g.add(plateDisc(0.23, s * 0.56, 1.1, -0.55)); });
      seat(0, 0.35, 0.75, 0.5, 0.5); backPad(0, 0.65, 1.05, -0.85, 0.75, 0.5); [-1, 1].forEach(s => g.add(tubeAB([s * 0.3, 0.4, 0.75], [s * 0.3, 0.4, 0.5], 0.02, G.black))); break; }
    case "pl_hack": {
      foot(1.1, 1.8); [-0.3, 0.3].forEach(x => g.add(tubeAB([x, 0.1, 0.65], [x, 2.05, -0.15], 0.045, G.silver)));
      g.add(rbox(0.75, 0.06, 0.55, G.rubber, 0, 0.12, 0.55)); const sl = backPad(0, 1.3, 0.3, -0.38, 0.8, 0.45); [-1, 1].forEach(s => { g.add(rbox(0.12, 0.08, 0.25, G.red, s * 0.17, 1.82, 0.12)); g.add(tubeAB([s * 0.32, 1.45, 0.25], [s * 0.6, 1.45, 0.25], 0.025, G.chrome)); g.add(plateDisc(0.23, s * 0.48, 1.45, 0.25)); });
      break; }
    case "pl_preacher":
      foot(0.8, 1.1); g.add(tubeAB([0, 0.05, 0.25], [0, 0.48, 0.25], 0.045, G.silver)); seat(0, 0.52, 0.28); g.add(tubeAB([0, 0.05, -0.1], [0, 1.0, -0.15], 0.045, G.silver));
      const pp = backPad(0, 1.05, -0.12, -0.7, 0.4, 0.55); g.add(tubeAB([-0.3, 0.95, -0.42], [0.3, 0.95, -0.42], 0.018, G.chrome)); break;
    // ---------- zone fonctionnelle ----------
    case "dual_cable":
      foot(1.6, 0.7, 0, 0, G.black);
      [-0.7, 0.7].forEach(x => { g.add(box(0.12, 2.35, 0.12, G.black, x, 1.18, 0)); for (let i = 0; i < 20; i++) g.add(box(0.13, 0.025, 0.02, G.chrome, x, 0.3 + i * 0.1, 0.065));
        g.add(box(0.36, 1.15, 0.24, G.black, x, 0.6, -0.25)); const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 20), G.chrome); wh.rotation.x = Math.PI / 2; wh.position.set(x, 1.4, 0.12); g.add(wh);
        g.add(tubeAB([x, 1.4, 0.15], [x, 1.0, 0.18], 0.006, G.cable)); g.add(box(0.1, 0.03, 0.02, G.yellow, x, 1.4, 0.16)); });
      g.add(box(1.52, 0.12, 0.14, G.black, 0, 2.35, 0)); g.add(tubeAB([-0.6, 2.2, 0.25], [0.6, 2.2, 0.25], 0.02, G.chrome)); break;
    case "rft": {
      foot(1.6, 1.4, 0, 0, G.black); [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]].forEach(([x, z]) => g.add(box(0.1, 2.5, 0.1, G.black, x, 1.25, z)));
      g.add(box(1.5, 0.1, 0.1, G.black, 0, 2.5, -0.6), box(1.5, 0.1, 0.1, G.black, 0, 2.5, 0.6), box(0.1, 0.1, 1.3, G.black, -0.7, 2.5, 0), box(0.1, 0.1, 1.3, G.black, 0.7, 2.5, 0));
      g.add(tubeAB([-0.7, 2.35, 0.68], [0.7, 2.35, 0.68], 0.022, G.chrome)); g.add(box(0.6, 0.25, 0.04, G.black, 0, 2.2, -0.62));
      for (let i = 0; i < 5; i++) g.add(tubeAB([-0.7, 0.45 + i * 0.38, -0.62], [-0.1, 0.45 + i * 0.38, -0.62], 0.018, G.black));
      [-1, 1].forEach(s => g.add(tubeAB([0.7, 1.25, s * 0.15], [1.1, 1.25, s * 0.2], 0.022, G.chrome))); // barres de dips
      const balls = [0x2563eb, 0xef4444, 0xf59e0b, 0x16a34a]; balls.forEach((c, i) => g.add(sph(0.12, M(c, { roughness: 0.6 }), -0.45 + i * 0.3, 0.45, 0.45)));
      g.add(box(1.3, 0.04, 0.35, G.black, 0, 0.32, 0.45)); break; }
    case "overrig": {
      const LG = M(0x9aa0a8, { metalness: 0.6, roughness: 0.35 });
      [-3.6, 0, 3.6].forEach(x => { g.add(box(0.16, 2.9, 0.16, LG, x, 1.45, 0)); const tri = box(0.5, 0.35, 0.18, M(0x2b2e33), x, 2.75, 0); g.add(tri); });
      g.add(box(7.6, 0.18, 0.2, LG, 0, 2.9, 0)); for (let i = 0; i < 14; i++) g.add(box(0.06, 0.16, 0.12, G.red, -3.4 + i * 0.52, 2.73, 0.12));
      g.add(tubeAB([-3.5, 2.55, 0.35], [3.5, 2.55, 0.35], 0.02, G.chrome));
      [-2.5, -1.7, 1.7, 2.5].forEach(x => { [-0.38, 0.38].forEach(dx => g.add(box(0.06, 2.4, 0.06, M(0x5a4636), x + dx, 1.2, -0.25))); for (let i = 0; i < 14; i++) g.add(tubeAB([x - 0.38, 0.2 + i * 0.16, -0.25], [x + 0.38, 0.2 + i * 0.16, -0.25], 0.015, M(0xc8a27a))); });
      break; }
    case "hyper": foot(0.7, 1.3); g.add(tubeAB([0, 0.05, 0.55], [0, 0.95, -0.25], 0.045, G.silver)); const hp = backPad(0, 0.95, -0.2, -0.8, 0.35, 0.45); roller(0, 0.32, 0.45, 0.35); g.add(rbox(0.5, 0.05, 0.25, G.rubber, 0, 0.12, 0.6)); break;
    case "benches":
      for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 0.95; const ang = [0.0, -0.5, -0.9, 0.0][i];
        g.add(box(0.08, 0.06, 1.25, G.silver, x, 0.06, 0)); g.add(tubeAB([x, 0.06, 0.3], [x, 0.42, 0.25], 0.04, G.silver)); g.add(tubeAB([x, 0.06, -0.35], [x, 0.38, -0.25], 0.04, G.silver));
        g.add(rbox(0.28, 0.07, 0.45, G.red, x, 0.47, 0.32)); const bp = new THREE.Group(); const pd = rbox(0.28, 0.07, 0.8, G.red, 0, 0, -0.4); bp.add(pd); bp.position.set(x, 0.47, 0.08); bp.rotation.x = -ang; g.add(bp);
        g.add(tubeAB([x - 0.2, 0.06, 0.62], [x + 0.2, 0.06, 0.62], 0.03, G.silver)); }
      break;
    case "dumbbells": {
      g.add(box(7.2, 2.4, 0.04, M(0xa9c0d3, { metalness: 0.95, roughness: 0.05 }), 0, 1.4, -0.75)); // miroir
      [-2.4, 0, 2.4].forEach(cx => { [[-1.1], [1.1]].forEach(([dx]) => g.add(tubeAB([cx + dx, 0.05, -0.15], [cx + dx * 0.95, 0.85, -0.4], 0.04, G.silver)));
        [[0.48, -0.05], [0.82, -0.38]].forEach(([y, z], row) => { g.add(box(2.2, 0.04, 0.3, G.silver, cx, y, z)); for (let i = 0; i < 9; i++) { const kg = (row * 9 + i); const r = 0.055 + kg * 0.0025;
          const db = new THREE.Group(); db.add(tubeAB([-0.1, 0, 0], [0.1, 0, 0], 0.016, G.chrome)); [-0.12, 0.12].forEach(z2 => { const hb = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.07, 6), G.plate); hb.rotation.z = Math.PI / 2; hb.position.x = z2; hb.castShadow = true; db.add(hb); });
          db.rotation.y = Math.PI / 2; db.position.set(cx - 0.95 + i * 0.24, y + 0.03 + r, z); g.add(db); } }); });
      [-1.5, 1.5].forEach(x => { g.add(box(0.08, 0.06, 1.2, G.silver, x, 0.06, 1.3)); g.add(tubeAB([x, 0.06, 1.3], [x, 0.42, 1.3], 0.04, G.silver)); g.add(rbox(0.28, 0.07, 1.15, G.red, x, 0.47, 1.3)); });
      break; }
    case "rack": {
      const RG = M(0x8f969e, { metalness: 0.6, roughness: 0.35 });
      foot(1.3, 1.5, 0, 0, G.black); [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.45], [0.6, 0.45]].forEach(([x, z]) => { g.add(box(0.08, 2.4, 0.08, RG, x, 1.2, z)); for (let i = 0; i < 18; i++) g.add(box(0.02, 0.02, 0.02, G.black, x, 0.4 + i * 0.1, z + 0.041)); });
      g.add(box(1.28, 0.08, 0.08, RG, 0, 2.4, -0.5), box(1.28, 0.08, 0.08, RG, 0, 2.4, 0.45), box(0.08, 0.08, 1.0, RG, -0.6, 2.4, 0), box(0.08, 0.08, 1.0, RG, 0.6, 2.4, 0));
      g.add(tubeAB([-0.62, 2.28, 0.5], [0.62, 2.28, 0.5], 0.018, G.chrome));
      g.add(tubeAB([-1.1, 1.38, 0.45], [1.1, 1.38, 0.45], 0.016, G.chrome)); [-1, 1].forEach(s => { g.add(plateDisc(0.225, s * 0.85, 1.38, 0.45)); g.add(plateDisc(0.225, s * 0.9, 1.38, 0.45)); g.add(box(0.06, 0.04, 0.12, G.black, s * 0.6, 1.33, 0.5)); });
      [-1, 1].forEach(s => { g.add(tubeAB([s * 0.75, 0.3, -0.55], [s * 0.75, 0.3, -0.85], 0.02, G.chrome)); g.add(plateDisc(0.225, s * 0.75, 0.3, -0.62, "z")); g.add(plateDisc(0.16, s * 0.75, 0.3, -0.7, "z")); });
      g.add(box(0.08, 0.06, 1.2, G.silver, 0, 0.06, 0.0)); g.add(tubeAB([0, 0.06, 0], [0, 0.42, 0], 0.04, G.silver)); g.add(rbox(0.28, 0.07, 1.15, G.red, 0, 0.47, 0)); break; }
    case "sleds":
      for (let i = 0; i < 3; i++) { const x = -1.6 + i * 1.0; const deck = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.55, 40, 1, false, -0.3, 0.6), G.black); deck.rotation.z = Math.PI / 2; deck.rotation.y = Math.PI / 2; deck.position.set(x, 3.15, 0); deck.rotation.order = "YZX"; g.add(box(0.62, 0.15, 1.7, G.black, x, 0.18, 0));
        g.add(tubeAB([x - 0.32, 0.25, -0.75], [x - 0.32, 1.25, -0.4], 0.025, G.black), tubeAB([x + 0.32, 0.25, -0.75], [x + 0.32, 1.25, -0.4], 0.025, G.black), tubeAB([x - 0.32, 1.25, -0.4], [x + 0.32, 1.25, -0.4], 0.025, G.black)); }
      { const x = 1.9; g.add(box(0.15, 0.6, 1.0, G.black, x, 0.35, 0)); const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.18, 24), G.black); fan.rotation.z = Math.PI / 2; fan.position.set(x, 0.55, -0.35); g.add(fan); g.add(rbox(0.25, 0.07, 0.3, G.black, x, 0.95, 0.25)); g.add(tubeAB([x - 0.25, 0.6, -0.1], [x - 0.25, 1.25, 0.05], 0.02, G.black), tubeAB([x + 0.25, 0.6, -0.1], [x + 0.25, 1.25, 0.05], 0.02, G.black)); }
      { const x = 3.0; g.add(box(0.08, 0.06, 2.4, G.black, x, 0.3, 0.2)); const fw = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 24), G.black); fw.rotation.z = Math.PI / 2; fw.position.set(x, 0.55, -0.95); g.add(fw); g.add(rbox(0.25, 0.06, 0.28, G.black, x, 0.4, 0.4)); }
      break;
    case "cardio": { // 1 tapis de course + 1 escalier (stepmill)
      g.add(rbox(0.8, 0.18, 1.9, G.black, -0.7, 0.12, 0.1)); g.add(box(0.62, 0.02, 1.5, G.rubber, -0.7, 0.22, 0.15));
      g.add(tubeAB([-1.05, 0.2, -0.8], [-1.05, 1.3, -0.65], 0.035, G.grey)); g.add(tubeAB([-0.35, 0.2, -0.8], [-0.35, 1.3, -0.65], 0.035, G.grey));
      { const sc = box(0.7, 0.42, 0.06, G.black, -0.7, 1.45, -0.65); sc.rotation.x = -0.35; g.add(sc); const sc2 = box(0.6, 0.32, 0.01, M(0x3b82f6, { emissive: 0x1d4ed8, emissiveIntensity: 0.6 }), -0.7, 1.46, -0.61); sc2.rotation.x = -0.35; g.add(sc2); }
      const sx = 0.8; g.add(box(0.8, 1.6, 0.6, G.black, sx, 0.8, -0.55)); for (let i = 0; i < 6; i++) { const st = box(0.6, 0.05, 0.28, G.grey, sx, 0.25 + i * 0.22, -0.2 + i * -0.06); st.rotation.x = 0.5; g.add(st); }
      g.add(tubeAB([sx - 0.38, 0.4, 0.2], [sx - 0.38, 1.35, -0.3], 0.025, G.grey)); g.add(tubeAB([sx + 0.38, 0.4, 0.2], [sx + 0.38, 1.35, -0.3], 0.025, G.grey));
      { const sc = box(0.5, 0.35, 0.06, G.black, sx, 1.85, -0.35); sc.rotation.x = -0.3; g.add(sc); }
      break; }
  }
  return g;
}
function textPlane(text, w, h, color = "#d9d4c7", size = 120) {
  const c = document.createElement("canvas"); c.width = 2048; c.height = 256; const ctx = c.getContext("2d");
  ctx.fillStyle = color; ctx.font = `600 ${size}px Georgia, "Times New Roman", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 1024, 140);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true })); return m;
}
function parquetTex() { const c = document.createElement("canvas"); c.width = 512; c.height = 512; const x = c.getContext("2d");
  for (let r = 0; r < 16; r++) for (let k = 0; k < 4; k++) { const off = (r % 2) * 64; const v = 190 + Math.floor(Math.random() * 30); x.fillStyle = `rgb(${v},${v - 28},${v - 62})`; x.fillRect(k * 128 + off - 128, r * 32, 128, 32); x.fillRect(k * 128 + off, r * 32, 128, 32); x.strokeStyle = "rgba(90,60,30,.35)"; x.strokeRect(k * 128 + off, r * 32, 128, 32); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); t.encoding = THREE.sRGBEncoding; return t; }
function buildGym() {
  const S3 = makeScene("gym", { map: true, bounds: [-12, 12, -8, 8], cam: [-3.3, 8.6, 6.8], target: [-4, 0, -0.5], minD: 2.5, maxD: 34, bg: 0x1a1d22, onPick: id => ACT_PICK_MACHINE(id) });
  const sc = S3.scene; const W = 24, D = 16; const G = gm();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M(0x1e2024, { roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  // plateforme parquet au premier plan (machines à disques)
  sc.add(box(10.2, 0.08, 5.4, new THREE.MeshStandardMaterial({ map: parquetTex(), roughness: 0.75 }), -2.7, 0.04, 5.2));
  // piste en gazon (gauche) + lignes blanches
  sc.add(box(2.4, 0.03, 9, M(0x2f8f3a, { roughness: 1 }), -7.9, 0.015, -2.3)); [-1, 0, 1].forEach(s2 => sc.add(box(0.05, 0.035, 9, M(0xffffff), -7.9 + s2 * 1.1, 0.02, -2.3)));
  for (let i = 0; i < 5; i++) sc.add(box(2.3, 0.035, 0.05, M(0xffffff), -7.9, 0.02, -6.5 + i * 2));
  // marquages au sol (cercles, échelles d'agilité)
  const white = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
  [[-3.6, 0.6, 0.5], [-1.0, 0.9, 0.42], [0.6, -2.6, 0.75], [2.4, -2.9, 0.75], [4.2, -2.6, 0.75], [-4.2, -4.4, 0.4]].forEach(([x, z, r]) => { const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.06, r, 48), white); ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.01, z); sc.add(ring); });
  for (let i = 0; i < 6; i++) { [0, 0.7].forEach(dz => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.05), white); l.rotation.x = -Math.PI / 2; l.position.set(-5.8 + i * 0.6, 0.01, 0.9 + dz); sc.add(l); }); const v = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.7), white); v.rotation.x = -Math.PI / 2; v.position.set(-6.1 + i * 0.6, 0.01, 1.25); sc.add(v); }
  // murs anthracite, charpente, lettrage, tableaux blancs, porte, fenêtres hautes
  const wallM = M(0x34373d, { roughness: 0.9 }); const H = 6;
  sc.add(box(W, H, 0.15, wallM, 0, H / 2, -D / 2)); sc.add(box(0.15, H, D, wallM, -W / 2, H / 2, 0));
  sc.add(box(W, 0.06, 0.16, M(0x2a2c30), 0, 1.25, -D / 2 + 0.09));
  const t = textPlane("UAX FITNESS CENTER", 12, 1.5); t.position.set(1.5, 4.4, -D / 2 + 0.09); sc.add(t);
  [[-3.6, 2.3], [-2.4, 2.0]].forEach(([x, y]) => sc.add(box(0.95, 0.7, 0.03, M(0xf4f4f4), x, y, -D / 2 + 0.1)));
  sc.add(box(1.6, 2.3, 0.05, M(0x1b1c1f), 9.5, 1.15, -D / 2 + 0.1)); sc.add(box(0.5, 0.18, 0.02, new THREE.MeshBasicMaterial({ color: 0x16a34a }), 9.5, 2.55, -D / 2 + 0.11));
  for (let i = 0; i < 6; i++) sc.add(box(2.6, 0.7, 0.04, M(0xbfd6ea, { metalness: 0.8, roughness: 0.1, emissive: 0x6b8fb3, emissiveIntensity: 0.25 }), -9.6 + i * 3.8, 5.3, -D / 2 + 0.1));
  sc.add(new THREE.AmbientLight(0xffffff, 0.18));
  GYM_MACHINES.forEach(m => {
    const g = buildMachine(m.build); g.position.set(...m.pos); g.rotation.y = m.rot; g.userData.pick = m.id; g.userData.label = m.label + (m.ex.length ? " · " + m.ex.length + " exercice" + (m.ex.length > 1 ? "s" : "") : "");
    const lab = labelSprite(m.label, 1); lab.position.set(0, m.build === "overrig" ? 3.3 : 2.75, 0); lab.visible = false; g.add(lab); g.userData.lab = lab;
    sc.add(g); S3.pickables.push(g);
  });
  return S3;
}
// étiquettes : affichées seulement quand on est près de la machine (ou survol / sélection / mode « tous les noms »),
// et jamais deux étiquettes qui se chevauchent (la plus proche gagne)
function gymLabels(S3) {
  const mode = S.gymNames || "auto"; const cam = S3.cam; const shown = []; const W = S3.renderer.domElement.clientWidth || 800, H = S3.renderer.domElement.clientHeight || 600;
  const items = S3.pickables.map(g => ({ g, lab: g.userData.lab, d: cam.position.distanceTo(g.getWorldPosition(new THREE.Vector3())) })).filter(x => x.lab).sort((a, b) => a.d - b.d);
  items.forEach(({ g, lab, d }) => {
    const force = g === S3.hover || g === S3.selected; let vis = force || mode === "all" || mode === "auto";
    if (vis && !force) { const p = lab.getWorldPosition(new THREE.Vector3()).project(cam); const x = (p.x + 1) / 2 * W, y = (1 - p.y) / 2 * H; const w = lab.scale.x / 0.04 * 31, h = 36;
      if (p.z > 1 || shown.some(r => Math.abs(r[0] - x) < (r[2] + w) / 2 && Math.abs(r[1] - y) < h)) vis = false; else shown.push([x, y, w]); }
    lab.visible = vis;
  });
}
function gymGoto(id) { const S3 = V3.scenes.gym; const m = GYM_MACHINES.find(x => x.id === id); if (!S3 || !m) return; const p = new THREE.Vector3(...m.pos);
  const g = S3.pickables.find(x => x.userData.pick === id); if (g) select3D(S3, g); flyTo(S3, p, p.clone().add(new THREE.Vector3(Math.sin(m.rot) * 4.2, 3.2, Math.cos(m.rot) * 4.2))); }
let ACT_PICK_MACHINE = () => {};

// ===================== FRIGO 3D =====================
const FRIDGE_CATS = { laitier: "Produits laitiers", viande: "Viande", poisson: "Poisson", oeufs: "Œufs", legume: "Légumes", fruit: "Fruits", fromage: "Fromage", boisson: "Boissons", sauce: "Sauces / pots", feculent: "Féculents", surgele: "Surgelés", autre: "Autre" };
const FRIDGE_ZONES = { frigo: "Frigo", congel: "Congélateur", placard: "Placard" };
function guessCat(name) {
  const n = name.toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const R = [[/oeuf|huevo/, "oeufs"], [/lait|leche|skyr|yaourt|yogur|fromage blanc|kefir|creme/, "laitier"], [/emmental|mozza|queso|fromage|parmes|gouda|cheddar/, "fromage"],
    [/poulet|pollo|dinde|pavo|boeuf|ternera|porc|cerdo|jambon|jamon|chorizo|steak|viande|hache|lomo|saucisse/, "viande"], [/thon|atun|saumon|salmon|sardin|poisson/, "poisson"],
    [/tomate|carotte|zanahoria|courgette|calabac|poivron|pimiento|brocoli|epinard|espinaca|salade|lechuga|oignon|cebolla|concombre|pepino|champignon|haricot vert|legume|verdura|ratatouille|gazpacho/, "legume"],
    [/banane|platano|pomme|manzana|orange|naranja|fraise|fresa|kiwi|myrtille|arandano|avocat|aguacate|raisin|fruit|citron|limon/, "fruit"],
    [/coca|biere|cerveza|jus|zumo|eau|agua|soda|boisson/, "boisson"], [/sauce|salsa|houmous|hummus|confiture|miel|beurre de cacahuete|mayonn|ketchup|moutarde/, "sauce"],
    [/riz|arroz|pate|pasta|pain|pan |avoine|avena|lentille|pois chiche|quinoa|cereale|tortilla de ble|galleta/, "feculent"], [/surgel|congel/, "surgele"]];
  for (const [re, c] of R) if (re.test(n)) return c; return "autre";
}
function itemColor(name, cat) {
  const n = name.toLowerCase();
  const C = [["tomate", 0xe03a2f], ["carotte", 0xf08a24], ["zanahoria", 0xf08a24], ["courgette", 0x3f7d2c], ["brocoli", 0x2f7a33], ["epinard", 0x2c6b2f], ["épinard", 0x2c6b2f], ["poivron", 0xd92b2b], ["salade", 0x7cc35a], ["concombre", 0x3c8a3a], ["oignon", 0xd9c39a], ["champignon", 0xcbb8a0],
    ["banane", 0xf2d33c], ["pomme", 0xc92a2a], ["orange", 0xf39c12], ["fraise", 0xd6213b], ["kiwi", 0x7a5c2e], ["avocat", 0x355e2a], ["myrtille", 0x3b3f8f], ["citron", 0xf4e04d]];
  for (const [k, c] of C) if (n.includes(k)) return c;
  return { laitier: 0xf5f5f0, viande: 0xe08a8a, poisson: 0xb7c2cc, oeufs: 0xf1e3c8, legume: 0x4e9a3a, fruit: 0xe67e22, fromage: 0xf3c93b, boisson: 0x2f6fd6, sauce: 0xb5442c, feculent: 0xd9b26f, surgele: 0x9fd3f0, autre: 0x9aa1ac }[cat] || 0x9aa1ac;
}
function foodMesh(it) {
  const cat = it.cat || guessCat(it.name); const col = itemColor(it.name, cat); const g = new THREE.Group(); const m = M(col, { roughness: 0.55 });
  const n = it.name.toLowerCase();
  switch (cat) {
    case "laitier": if (/lait|leche/.test(n)) { g.add(box(0.11, 0.24, 0.07, M(0xf4f6f8), 0, 0.12, 0)); g.add(box(0.112, 0.06, 0.072, M(0x2b7bd8), 0, 0.17, 0)); }
      else { g.add(cyl(0.05, 0.04, 0.08, M(0xf7f7f2), 0, 0.04, 0)); g.add(cyl(0.052, 0.052, 0.006, M(/skyr|prot/.test(n) ? 0x2b67c9 : 0xe2463a), 0, 0.083, 0)); } break;
    case "viande": g.add(box(0.2, 0.04, 0.13, M(0x1d1f23), 0, 0.02, 0)); g.add(box(0.17, 0.035, 0.1, m, 0, 0.05, 0)); g.add(box(0.2, 0.012, 0.13, M(0xffffff, { transparent: true, opacity: 0.25 }), 0, 0.075, 0)); break;
    case "poisson": g.add(cyl(0.045, 0.045, 0.035, M(0xb7bec6, { metalness: 0.8, roughness: 0.25 }), 0, 0.018, 0)); g.add(cyl(0.046, 0.046, 0.012, M(0xd33b2c), 0, 0.03, 0)); break;
    case "oeufs": g.add(box(0.2, 0.04, 0.1, M(0xc8b79c), 0, 0.02, 0)); for (let i = 0; i < 6; i++) { const e = sph(0.022, M(0xf3e6cf), -0.07 + (i % 3) * 0.07, 0.055, i < 3 ? -0.025 : 0.025); e.scale.y = 1.3; g.add(e); } break;
    case "fromage": { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 20, 1, false, 0, Math.PI / 2.5), m); w.position.y = 0.03; g.add(w); } break;
    case "boisson": g.add(cyl(0.035, 0.035, 0.2, m, 0, 0.1, 0)); g.add(cyl(0.015, 0.03, 0.05, m, 0, 0.225, 0)); g.add(cyl(0.016, 0.016, 0.015, M(0xeeeeee), 0, 0.255, 0)); break;
    case "sauce": g.add(cyl(0.04, 0.04, 0.09, M(col, { transparent: true, opacity: 0.85 }), 0, 0.045, 0)); g.add(cyl(0.042, 0.042, 0.02, M(0xc9a227, { metalness: 0.7 }), 0, 0.1, 0)); break;
    case "feculent": g.add(box(0.12, 0.17, 0.05, m, 0, 0.085, 0)); g.add(box(0.1, 0.05, 0.051, M(0xffffff), 0, 0.11, 0)); break;
    case "surgele": { const b = box(0.16, 0.05, 0.12, M(0x9fd3f0, { roughness: 0.3 }), 0, 0.025, 0); g.add(b); g.add(box(0.06, 0.051, 0.06, M(col === 0x9fd3f0 ? 0x4e9a3a : col), 0.03, 0.026, 0)); } break;
    case "fruit": if (/banane|platano/.test(n)) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 16, Math.PI * 0.7), m); t.rotation.x = Math.PI / 2; t.position.y = 0.02; g.add(t); }
      else { g.add(sph(0.04, m, 0, 0.04, 0)); g.add(cyl(0.003, 0.003, 0.02, M(0x5b3a1a), 0, 0.085, 0)); } break;
    case "legume": if (/carott|zanahoria/.test(n)) { const c = cyl(0.018, 0.004, 0.14, m); c.rotation.z = Math.PI / 2; c.position.y = 0.02; g.add(c); }
      else if (/brocoli/.test(n)) { g.add(cyl(0.012, 0.015, 0.05, M(0x6fa85a), 0, 0.025, 0)); [[0, 0], [0.025, 0.01], [-0.025, 0.01], [0, -0.025]].forEach(([x, z]) => g.add(sph(0.025, m, x, 0.06, z))); }
      else if (/courgette|concombre|pepino|calabac/.test(n)) { const c = cyl(0.022, 0.022, 0.16, m); c.rotation.z = Math.PI / 2; c.position.y = 0.022; g.add(c); }
      else if (/salade|lechuga|epinard|espinaca/.test(n)) { g.add(box(0.15, 0.06, 0.1, M(0xffffff, { transparent: true, opacity: 0.35 }), 0, 0.03, 0)); g.add(sph(0.045, m, 0, 0.035, 0)); }
      else g.add(sph(0.038, m, 0, 0.038, 0)); break;
    default: g.add(box(0.1, 0.1, 0.08, m, 0, 0.05, 0));
  }
  return g;
}
function buildFridge() {
  const S3 = makeScene("fridge", { cam: [0.45, 1.3, 1.55], target: [0.12, 0.95, 0], minD: 0.8, maxD: 4.5, bg: 0x22262d, onPick: id => ACT_PICK_FRIDGE(id) });
  const sc = S3.scene; const white = M(0xeef1f4, { roughness: 0.35 }); const inner = M(0xf7f9fb, { roughness: 0.6 }); const glass = M(0xcfe8ff, { transparent: true, opacity: 0.35, roughness: 0.1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), M(0x3a3530, { roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  // frigo : 0.7 large, 1.8 haut, 0.65 profond, ouvert
  const W = 0.7, H = 1.8, D = 0.62; const f = new THREE.Group(); sc.add(f);
  f.add(box(W, 0.04, D, white, 0, 0.02, 0)); f.add(box(W, 0.04, D, white, 0, H, 0)); f.add(box(0.04, H, D, white, -W / 2, H / 2, 0)); f.add(box(0.04, H, D, white, W / 2, H / 2, 0)); f.add(box(W, H, 0.03, inner, 0, H / 2, -D / 2));
  f.add(box(W - 0.06, 0.03, D - 0.04, white, 0, 0.5, 0)); // séparation congélateur
  const shelves = [0.82, 1.12, 1.42]; shelves.forEach(y => f.add(box(W - 0.08, 0.012, D - 0.08, glass, 0, y, 0.01)));
  f.add(box(W - 0.1, 0.18, D - 0.1, glass, 0, 0.62, 0.02)); // bac à légumes
  const light = new THREE.PointLight(0xfff6e0, 0.6, 2.5); light.position.set(0, 1.7, 0.1); f.add(light);
  // porte ouverte
  const door = new THREE.Group(); door.position.set(W / 2, 0, D / 2); door.rotation.y = -1.9; f.add(door);
  door.add(box(0.04, H - 0.48, W, white, 0.02, 0.5 + (H - 0.48) / 2, -W / 2 + 0.0)); [0.75, 1.1, 1.45].forEach(y => door.add(box(0.12, 0.1, W - 0.08, glass, -0.07, y, -W / 2)));
  const fzDoor = box(W, 0.46, 0.04, white, 0, 0.26, D / 2 + 0.02); f.add(fzDoor); f.add(box(0.3, 0.03, 0.03, M(0x999999, { metalness: 0.8 }), 0, 0.42, D / 2 + 0.05));
  // placard à droite
  const pl = new THREE.Group(); pl.position.set(1.05, 0, -0.05); sc.add(pl); const wood = M(0xb08a5a, { roughness: 0.7 });
  pl.add(box(0.8, 0.03, 0.45, wood, 0, 0.9, 0), box(0.8, 0.03, 0.45, wood, 0, 1.3, 0), box(0.8, 0.03, 0.45, wood, 0, 1.7, 0), box(0.03, 0.83, 0.45, wood, -0.4, 1.3, 0), box(0.03, 0.83, 0.45, wood, 0.4, 1.3, 0), box(0.8, 0.83, 0.02, wood, 0, 1.3, -0.22));
  pl.add(box(0.85, 0.88, 0.5, M(0x8a6a44), 0, 0.44, 0));
  const lab = labelSprite("Placard", 0.6); lab.position.set(0, 1.85, 0); pl.add(lab); const lf = labelSprite("Frigo", 0.6); lf.position.set(0, 1.95, 0); f.add(lf);
  const lz = labelSprite("Congélateur", 0.5); lz.position.set(0, 0.48, D / 2 + 0.12); f.add(lz);
  S3.items = new THREE.Group(); sc.add(S3.items); S3.f = f; S3.door = door; S3.pl = pl; S3.sig = "";
  // emplacements
  S3.slots = {
    door: { g: door, pts: [0.75, 1.1, 1.45].flatMap(y => [-0.55, -0.35, -0.15].map(z => [-0.07, y + 0.05, z])) },
    top: { g: f, pts: [1.42 + 0.01, 1.12 + 0.01].flatMap(y => [-0.22, -0.07, 0.08, 0.22].flatMap(x => [[x, y, 0.12], [x, y, -0.1]])) },
    mid: { g: f, pts: [0.82 + 0.01].flatMap(y => [-0.22, -0.07, 0.08, 0.22].flatMap(x => [[x, y, 0.12], [x, y, -0.1]])) },
    drawer: { g: f, pts: [-0.2, -0.07, 0.06, 0.19].flatMap(x => [[x, 0.54, 0.12], [x, 0.54, -0.08]]) },
    freezer: { g: f, pts: [-0.18, 0, 0.18].flatMap(x => [[x, 0.06, 0.1], [x, 0.06, -0.12], [x, 0.24, 0.1], [x, 0.24, -0.12]]) },
    placard: { g: pl, pts: [0.92, 1.32].flatMap(y => [-0.3, -0.15, 0, 0.15, 0.3].flatMap(x => [[x, y, 0.08], [x, y, -0.1]])) }
  };
  return S3;
}
function zoneSlot(it) {
  if (it.zone === "congel") return "freezer"; if (it.zone === "placard") return "placard";
  const c = it.cat || guessCat(it.name); return c === "boisson" || c === "sauce" ? "door" : c === "legume" || c === "fruit" ? "drawer" : c === "viande" || c === "poisson" ? "mid" : "top";
}
function updateFridge3D(items) { if (V3.scenes.fridge) V3.scenes.fridge.dirty = performance.now() + 800;
  const S3 = V3.scenes.fridge; if (!S3) return;
  const sig = JSON.stringify(items.map(i => [i.id, i.name, i.cat, i.zone, i.qty > 0])); if (sig === S3.sig) return; S3.sig = sig;
  Object.values(S3.slots).forEach(s => (s.used || []).forEach(o => s.g.remove(o))); S3.pickables = [];
  Object.values(S3.slots).forEach(s => { s.used = []; s.i = 0; });
  items.filter(i => i.qty > 0).forEach(it => {
    let sl = S3.slots[zoneSlot(it)]; if (sl.i >= sl.pts.length) sl = [S3.slots.top, S3.slots.mid, S3.slots.placard].find(s => s.i < s.pts.length); if (!sl) return;
    const o = foodMesh(it); o.scale.setScalar(1.25); const p = sl.pts[sl.i++]; o.position.set(...p); o.rotation.y = (Math.random() - 0.5) * 0.4; o.userData.pick = it.id; o.userData.label = it.name + " · " + (it.unit === "pc" ? r1(it.qty) + " pc" : r0(it.qty) + " g");
    sl.g.add(o); sl.used.push(o); S3.pickables.push(o);
  });
}
let ACT_PICK_FRIDGE = () => {};
