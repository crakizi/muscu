// ===================== MANNEQUIN ANIMÉ : comment faire l'exercice =====================
// Le modèle anatomique est articulé (19 os placés sur les vraies articulations du squelette BodyParts3D).
// Chaque exercice = une position de départ (A) et une position d'arrivée (B), en angles articulaires,
// jouées en boucle : phase concentrique ≈ 1 s, excentrique ≈ 1,6 s, petite pause en haut et en bas.
// Conventions (corps tourné vers +Z, gauche = +X) :
//   épaule : flex (bras vers l'avant), abd (bras sur le côté), rot (rotation externe) · coude : elbow (flexion)
//   hanche : hip (flexion), habd (écartement) · genou : knee (flexion) · cheville : ank (+ = pointe vers le haut)
//   tronc : spine / chest (penché en avant +), neck · clav (épaules qui montent)
//   base : rx (corps basculé : -90 = couché sur le dos, +90 = sur le ventre), ry, dy / dz (déplacement du bassin)
const D2R = Math.PI / 180;
const BASES = {
  stand: {},
  seat: { hip: 90, knee: 90, dy: -0.36, dz: -0.02 },
  seatRecl: { hip: 80, knee: 90, dy: -0.36, rx: -12 },
  bench: { rx: -90, dy: -0.26, hip: 15, knee: 95 },
  incline: { rx: -55, dy: -0.32, hip: 60, knee: 95 },
  prone: { rx: 90, dy: -0.32 },
  kneel: { knee: 90, ank: -40, dy: -0.47 },
  hang: { dy: 0.25 },
  bentOver: { rx: 70, hip: 70, knee: 18, dy: -0.12 },
  thrust: {},
};
// équipement : db = haltère dans chaque main, bar = barre, handle = poignées, rope = corde, none
const PATTERNS = {
  latRaise: { base: "stand", eq: "db", A: { abd: 12, elbow: 15, flex: 8 }, B: { abd: 88, elbow: 15, flex: 12 } },
  latRaiseCable: { base: "stand", eq: "handle", side: "L", A: { abd: 0, elbow: 15, flex: 10 }, B: { abd: 88, elbow: 15, flex: 12 } },
  shoulderPress: { base: "seat", eq: "handle", A: { abd: 80, rot: 90, elbow: 100 }, B: { abd: 165, rot: 90, elbow: 15 } },
  facePull: { base: "stand", eq: "rope", A: { flex: 85, elbow: 5 }, B: { abd: 80, flex: 10, rot: 40, elbow: 115 } },
  rearFly: { base: "seat", eq: "handle", A: { flex: 85, elbow: 10 }, B: { abd: 85, flex: 0, elbow: 10 } },
  pecFly: { base: "seat", eq: "handle", A: { abd: 80, elbow: 25 }, B: { flex: 85, abd: 0, elbow: 25 } },
  pushdown: { base: "stand", eq: "rope", A: { spine: 10, flex: 15, elbow: 100 }, B: { spine: 10, flex: 5, elbow: 3 } },
  pushdownUni: { base: "stand", eq: "handle", side: "L", A: { spine: 8, flex: 12, elbow: 100 }, B: { spine: 8, flex: 3, elbow: 3 } },
  overheadExt: { base: "stand", eq: "rope", A: { spine: 18, flex: 165, elbow: 145 }, B: { spine: 18, flex: 165, elbow: 10 } },
  dips: { base: "hang", eq: "none", A: { dy: -0.05, flex: -45, elbow: 95, spine: 15, knee: 70 }, B: { dy: 0.25, flex: 0, elbow: 5, spine: 8, knee: 70 } },
  curl: { base: "stand", eq: "db", A: { elbow: 8, flex: 0 }, B: { elbow: 140, flex: 10 } },
  hammer: { base: "stand", eq: "rope", A: { elbow: 8, rot: -60 }, B: { elbow: 135, rot: -60, flex: 8 } },
  bayesian: { base: "stand", eq: "handle", side: "L", A: { flex: -30, elbow: 5, spine: 5 }, B: { flex: -25, elbow: 135, spine: 5 } },
  inclineCurl: { base: "incline", eq: "db", A: { flex: -35, elbow: 5 }, B: { flex: -30, elbow: 140 } },
  preacher: { base: "seat", eq: "bar", A: { flex: 50, elbow: 20, spine: 15 }, B: { flex: 50, elbow: 135, spine: 15 } },
  cableCrunch: { base: "kneel", eq: "rope", A: { spine: 10, chest: 0, flex: 150, elbow: 130, hip: 10 }, B: { spine: 45, chest: 30, flex: 150, elbow: 130, hip: 35 } },
  benchPress: { base: "bench", eq: "bar", A: { abd: 65, elbow: 100, flex: 15 }, B: { flex: 88, abd: 12, elbow: 5 } },
  inclinePress: { base: "incline", eq: "handle", A: { abd: 65, elbow: 100, flex: 15 }, B: { flex: 95, abd: 12, elbow: 5 } },
  dbIncline: { base: "incline", eq: "db", A: { abd: 70, elbow: 100, flex: 10 }, B: { flex: 95, abd: 8, elbow: 5 } },
  chestPress: { base: "seat", eq: "handle", A: { abd: 65, elbow: 100, flex: 10 }, B: { flex: 85, abd: 12, elbow: 5 } },
  pulldown: { base: "seat", eq: "bar", A: { abd: 160, rot: 90, elbow: 10 }, B: { abd: 55, rot: 90, elbow: 125, spine: -8 } },
  pullup: { base: "hang", eq: "bar", A: { abd: 165, rot: 90, elbow: 5, dy: 0.05, knee: 60 }, B: { abd: 50, rot: 90, elbow: 125, dy: 0.45, knee: 60 } },
  row: { base: "seat", eq: "handle", A: { flex: 80, elbow: 5, spine: 18, knee: 30, hip: 80 }, B: { flex: -15, elbow: 100, spine: 0, knee: 30, hip: 80 } },
  rowWide: { base: "seat", eq: "bar", A: { flex: 80, elbow: 5, spine: 18, knee: 30, hip: 80 }, B: { abd: 70, flex: -8, elbow: 95, spine: 0, knee: 30, hip: 80 } },
  dbRow: { base: "bentOver", eq: "db", side: "L", A: { flex: 75, elbow: 5 }, B: { flex: -15, elbow: 100 } },
  shrug: { base: "stand", eq: "db", A: { clav: 0, elbow: 3 }, B: { clav: 14, elbow: 3 } },
  squat: { base: "stand", eq: "barBack", A: { abd: 62, rot: 90, elbow: 150, flex: -18 }, B: { hip: 105, knee: 115, ank: 28, spine: 30, dy: -0.38, abd: 62, rot: 90, elbow: 150, flex: -18 } },
  hack: { base: "stand", eq: "none", A: { abd: 20, flex: 25, elbow: 135 }, B: { hip: 105, knee: 115, ank: 25, spine: 10, dy: -0.36, abd: 20, flex: 25, elbow: 135 } },
  legPress: { base: "seatRecl", eq: "none", A: { hip: 120, knee: 100, rx: -40, dy: -0.4 }, B: { hip: 50, knee: 8, rx: -40, dy: -0.4 } },
  legExt: { base: "seat", eq: "none", A: { knee: 90 }, B: { knee: 5 } },
  seatedCurl: { base: "seat", eq: "none", A: { knee: 10 }, B: { knee: 105 } },
  lyingCurl: { base: "prone", eq: "none", A: { knee: 5 }, B: { knee: 115 } },
  rdl: { base: "stand", eq: "bar", A: { elbow: 3 }, B: { rx: 78, hip: 72, knee: 18, ank: 5, spine: 6, flex: 82, elbow: 3, dy: -0.1, dz: -0.05 } },
  hipThrust: { base: "thrust", eq: "barHip", A: { rx: -58, dy: -0.66, hip: 58, knee: 95, flex: 35, elbow: 70 }, B: { rx: -90, dy: -0.44, hip: 2, knee: 90, flex: 35, elbow: 70 } },
  calfStand: { base: "stand", eq: "none", A: { ank: 15 }, B: { ank: -35, dy: 0.07 } },
  calfSeat: { base: "seat", eq: "none", A: { ank: 15 }, B: { ank: -35 } },
  lunge: { base: "stand", eq: "db", A: { L: { hip: 25 }, R: { hip: -15 } }, B: { L: { hip: 85, knee: 90, ank: 15 }, R: { hip: -15, knee: 95 }, dy: -0.38, spine: 5 } },
  bulgarian: { base: "stand", eq: "db", A: { L: { hip: 20, knee: 10 }, R: { hip: -30, knee: 80 } }, B: { L: { hip: 85, knee: 95, ank: 18 }, R: { hip: -25, knee: 115 }, dy: -0.4, spine: 15 } },
  adductor: { base: "seat", eq: "none", A: { habd: 40 }, B: { habd: 3 } },
  abductor: { base: "seat", eq: "none", A: { habd: 3 }, B: { habd: 40, spine: 10 } },
  backExt: { base: "stand", eq: "none", A: { rx: 125, hip: 80, dy: -0.25, flex: 25, abd: 15, elbow: 140 }, B: { rx: 45, hip: 0, dy: -0.25, flex: 25, abd: 15, elbow: 140 } },
};
const EX_ANIM = {
  lat_raise_cable: "latRaiseCable", lat_raise_db: "latRaise", shoulder_press: "shoulderPress", face_pull: "facePull", rear_delt_fly: "rearFly",
  tri_oh_cable: "overheadExt", tri_push_uni: "pushdownUni", tri_push_rope: "pushdown", dips: "dips", hammer_rope: "hammer", bayesian_curl: "bayesian",
  incline_db_curl: "inclineCurl", preacher_curl: "preacher", cable_crunch: "cableCrunch", incline_press_machine: "inclinePress", bench_press: "benchPress",
  db_incline_press: "dbIncline", chest_press: "chestPress", pec_fly_machine: "pecFly", lat_pulldown_pron: "pulldown", pull_up: "pullup",
  row_neutral_close: "row", row_pron_wide: "rowWide", db_row: "dbRow", shrug: "shrug", squat: "squat", leg_press: "legPress", hack_squat: "hack",
  leg_ext: "legExt", bulgarian: "bulgarian", lunges: "lunge", rdl: "rdl", seated_leg_curl: "seatedCurl", lying_leg_curl: "lyingCurl", hip_thrust: "hipThrust",
  adductor_machine: "adductor", abductor_machine: "abductor", calf_standing: "calfStand", calf_seated: "calfSeat", back_ext: "backExt"
};
function animFor(exId) { const x = getEx(exId); if (EX_ANIM[exId]) return PATTERNS[EX_ANIM[exId]];
  // exercices perso : on devine d'après le muscle principal
  const m = x.prim[0] || ""; return PATTERNS[{ delt_lat: "latRaise", delt_ant: "shoulderPress", delt_post: "rearFly", pec_mid: "chestPress", pec_up: "inclinePress", lats: "pulldown", traps_mid: "row",
    biceps_long: "curl", biceps_short: "curl", triceps_long: "overheadExt", triceps_latmed: "pushdown", quads: "legExt", hamstrings: "seatedCurl", glutes_max: "hipThrust", calves: "calfStand", abs: "cableCrunch" }[m] || "curl"]; }
// paramètres → rotations des os
function poseParams(pat, which) {
  const P = Object.assign({}, BASES[pat.base] || {}, pat[which]); const side = s => Object.assign({}, P, P[s] || {});
  const out = {}; const L = side("L"), R = side("R");
  // exercice unilatéral : le bras inactif reste le long du corps
  if (pat.side === "L") ["flex", "abd", "rot", "elbow"].forEach(k => { R[k] = (pat.A[k] != null && k !== "elbow") ? 0 : (k === "elbow" ? 10 : 0); });
  out.L = L; out.R = R; out.g = P; return out;
}
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function qOf(x, y, z, order = "ZXY") { _e.set(x * D2R, y * D2R, z * D2R, order); return new THREE.Quaternion().setFromEuler(_e); }
function bonesPose(pp) {
  const Q = {}; const g = pp.g;
  Q.root = qOf(g.rx || 0, g.ry || 0, 0, "YXZ"); Q.spine = qOf(g.spine || 0, 0, 0); Q.chest = qOf(g.chest || 0, 0, 0); Q.neck = qOf(-(g.spine || 0) * 0.3 + (g.neck || 0), 0, 0);
  [["L", 1], ["R", -1]].forEach(([S, sg]) => { const p = pp[S];
    Q["clav" + S] = qOf(0, 0, sg * (p.clav || 0));
    // bras : Rz(abd) · Rx(-flex) · Ry(rot)
    Q["ua" + S] = new THREE.Quaternion().setFromEuler(new THREE.Euler(-(p.flex || 0) * D2R, sg * (p.rot || 0) * D2R, sg * (p.abd || 0) * D2R, "ZXY"));
    Q["fa" + S] = qOf(-(p.elbow || 0), 0, 0); Q["hd" + S] = qOf(0, 0, 0);
    Q["th" + S] = new THREE.Quaternion().setFromEuler(new THREE.Euler(-(p.hip || 0) * D2R, 0, sg * (p.habd || 0) * D2R, "ZXY"));
    Q["sh" + S] = qOf(p.knee || 0, 0, 0); Q["ft" + S] = qOf(-(p.ank || 0), 0, 0);
  });
  return { Q, dy: g.dy || 0, dz: g.dz || 0 };
}
function applyPose(grp, A, B, t) {
  const bones = grp.userData.bones, rest = grp.userData.rest;
  Object.keys(bones).forEach(n => { const qa = A.Q[n], qb = B.Q[n]; if (qa && qb) bones[n].quaternion.copy(qa).slerp(qb, t); else bones[n].quaternion.identity(); });
  bones.root.position.copy(rest.root).add(new THREE.Vector3(0, A.dy + (B.dy - A.dy) * t, A.dz + (B.dz - A.dz) * t));
  updateTwoHand(grp);
}
// ---------- matériel tenu en main / décor ----------
function equipMeshes(grp, pat) {
  (grp.userData.eq || []).forEach(o => o.parent && o.parent.remove(o)); grp.userData.eq = [];
  const G = gm(); const B = grp.userData.bones; const J = BODY.joints;
  const handOff = S => new THREE.Vector3(...J["hd" + S]).sub(new THREE.Vector3(...J["wr" + S])).multiplyScalar(0.5);
  const add = (S, obj) => { obj.position.copy(handOff(S)); B["hd" + S].add(obj); grp.userData.eq.push(obj); };
  const sides = pat.side === "L" ? ["L"] : ["L", "R"];
  const db = () => { const d = new THREE.Group(); d.add(tubeAB([-0.07, 0, 0], [0.07, 0, 0], 0.014, G.chrome)); [-0.09, 0.09].forEach(x => { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 6), G.plate); h.rotation.z = Math.PI / 2; h.position.x = x; d.add(h); }); return d; };
  const handle = () => { const d = new THREE.Group(); d.add(tubeAB([-0.06, 0, 0], [0.06, 0, 0], 0.016, G.black)); d.add(tubeAB([0, 0, 0], [0, 0.6, 0], 0.003, G.cable)); return d; };
  if (pat.eq === "db") sides.forEach(S => add(S, db()));
  if (pat.eq === "handle") sides.forEach(S => add(S, handle()));
  if (pat.eq === "rope") sides.forEach(S => { const d = new THREE.Group(); d.add(tubeAB([0, -0.04, 0], [0, 0.04, 0], 0.018, G.black)); add(S, d); });
  if (pat.eq === "bar") { const d = new THREE.Group(); const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.5, 14), G.chrome); bar.rotation.z = Math.PI / 2; d.add(bar); grp.add(d); grp.userData.eq.push(d); grp.userData.twoHand = d; }
  if (pat.eq === "barBack" || pat.eq === "barHip") { const d = new THREE.Group(); d.add(tubeAB([-1.0, 0, 0], [1.0, 0, 0], 0.016, G.chrome)); [-0.85, 0.85].forEach(x => d.add(plateDisc(0.225, x, 0, 0)));
    if (pat.eq === "barBack") { d.position.set(0, J.nec[1] - J.che[1] - 0.02, -0.08); B.chest.add(d); } else { d.position.set(0, 0.0, 0.14); B.root.add(d); } grp.userData.eq.push(d); }
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function updateTwoHand(grp) { const d = grp.userData.twoHand; if (!d || !d.parent) return; const B = grp.userData.bones, J = BODY.joints;
  grp.updateMatrixWorld(true);
  const grip = (S, v) => { v.set(...J["hd" + S]).sub(new THREE.Vector3(...J["wr" + S])).multiplyScalar(0.5); B["hd" + S].localToWorld(v.add(new THREE.Vector3(0, 0, 0))); return v; };
  // localToWorld attend un point local : décalage depuis le pivot du poignet
  _a.set(...J.hdL).sub(new THREE.Vector3(...J.wrL)).multiplyScalar(0.5); B.hdL.localToWorld(_a);
  _b.set(...J.hdR).sub(new THREE.Vector3(...J.wrR)).multiplyScalar(0.5); B.hdR.localToWorld(_b);
  d.position.copy(_a).add(_b).multiplyScalar(0.5); d.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), _a.clone().sub(_b).normalize()); }
function propsFor(pat) { // décor fixe : siège, banc, poulie…
  const G = gm(); const g = new THREE.Group(); const base = pat.base;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, transparent: true, opacity: 0.25 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  if (base === "seat" || base === "seatRecl") { g.add(rbox(0.45, 0.09, 0.45, G.red, 0, 0.43, 0.04)); g.add(box(0.06, 0.4, 0.06, G.silver, 0, 0.2, 0.04)); if ([PATTERNS.shoulderPress, PATTERNS.chestPress, PATTERNS.pecFly, PATTERNS.legExt, PATTERNS.seatedCurl, PATTERNS.adductor, PATTERNS.abductor, PATTERNS.legPress].includes(pat)) { const b = rbox(0.42, 0.08, 0.7, G.red, 0, 0, 0); b.rotation.x = Math.PI / 2 + (base === "seatRecl" ? 0.5 : 0.08); b.position.set(0, 0.85, -0.17); g.add(b); } }
  if (base === "bench") { g.add(rbox(0.3, 0.08, 1.3, G.red, 0, 0.47, -0.35)); g.add(box(0.06, 0.43, 0.06, G.silver, 0, 0.21, -0.35)); }
  if (base === "incline") { g.add(rbox(0.35, 0.08, 0.4, G.red, 0, 0.45, 0.1)); const b = rbox(0.32, 0.08, 0.9, G.red, 0, 0, 0); b.rotation.x = -0.75 + Math.PI / 2 - Math.PI / 2; b.rotation.x = 0.85; b.position.set(0, 0.78, -0.25); g.add(b); }
  if (base === "thrust") { g.add(rbox(0.9, 0.08, 0.32, G.red, 0, 0.42, -0.55)); g.add(box(0.06, 0.4, 0.06, G.silver, 0, 0.2, -0.55)); }
  if (pat === PATTERNS.preacher) { const pad = rbox(0.45, 0.07, 0.3, G.red, 0, 0, 0); pad.rotation.x = 0.7; pad.position.set(0, 0.95, 0.35); g.add(pad); }
  if (pat === PATTERNS.pullup) { g.add(tubeAB([-0.8, 2.4, 0.03], [0.8, 2.4, 0.03], 0.02, G.black)); }
  if (pat === PATTERNS.backExt) { const pad = rbox(0.36, 0.07, 0.24, G.red, 0, 0, 0); pad.rotation.x = -Math.PI / 4; pad.position.set(0, 0.46, -0.07); g.add(pad); g.add(tubeAB([0, 0, -0.75], [0, 0.42, -0.12], 0.025, G.silver)); g.add(tubeAB([0, 0, -0.75], [0, 0.2, -0.68], 0.025, G.silver)); g.add(tubeAB([-0.14, 0.21, -0.67], [0.14, 0.21, -0.67], 0.045, G.red)); }
  if (base === "prone") { g.add(rbox(0.38, 0.08, 1.4, G.red, 0, 0.5, 0.05)); }
  return g;
}
// ---------- visionneuse ----------
const ANIM = { exId: null, playing: true, speed: 1, t0: 0 };
function animSetup(S3, exId) {
  const pat = animFor(exId); ANIM.exId = exId; ANIM.pat = pat;
  ANIM.A = bonesPose(poseParams(pat, "A")); ANIM.B = bonesPose(poseParams(pat, "B")); ANIM.t0 = performance.now();
  equipMeshes(S3.grp, pat); if (S3.props) S3.scene.remove(S3.props); S3.props = propsFor(pat); S3.scene.add(S3.props);
  applyPose(S3.grp, ANIM.A, ANIM.B, 0); S3.dirty = performance.now() + 1000;
}
// profil de vitesse d'une répétition : pause, montée (1 s), pause, descente (1,6 s)
function repPhase(sec) { const T = 3.2, x = sec % T; if (x < 0.3) return 0; if (x < 1.3) return ease((x - 0.3) / 1.0); if (x < 1.6) return 1; return 1 - ease((x - 1.6) / 1.6); }
function ease(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
function animTick(S3, now) {
  if (!ANIM.pat || !S3.grp) return; if (!ANIM.playing) return;
  const sec = (now - ANIM.t0) / 1000 * ANIM.speed; applyPose(S3.grp, ANIM.A, ANIM.B, repPhase(sec));
  if (ANIM.phaseEl) { const t = repPhase(sec); ANIM.phaseEl.textContent = (sec % 3.2) < 1.6 ? "▲ phase concentrique (on pousse / tire)" : "▼ phase excentrique (on freine, 1,5-2 s)"; }
}
