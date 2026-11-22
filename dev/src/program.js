// ===================== PROGRAMMES, REMPLACEMENTS, SÉANCE FANTÔME =====================
// exercices faisables dans TA salle = ceux des machines de la salle 3D (+ exercices perso)
function gymExIds() { const s = new Set(); GYM_MACHINES.forEach(m => m.ex.forEach(id => s.add(id))); Object.keys(customEx()).forEach(id => s.add(id)); return s; }
function banned() { return new Set(Store.get("program", {}).banned || []); }
function allEx() { return Object.values(EX).concat(Object.values(customEx())); }
// note de proximité entre deux exercices (mêmes muscles principaux, même muscle ciblé…)
function exSimilarity(a, b) {
  const A = getEx(a), B = getEx(b); let s = 0;
  A.focus.forEach(m => { if (B.focus.includes(m)) s += 4; else if (B.prim.includes(m)) s += 2; });
  A.prim.forEach(m => { if (B.prim.includes(m)) s += 2; else if (B.sec.includes(m)) s += 0.5; });
  const gA = new Set(A.prim.map(m => MUSCLES[m]?.[1])); B.prim.forEach(m => { if (gA.has(MUSCLES[m]?.[1])) s += 1; });
  if ((ALTERNATIVES[a] || []).includes(b)) s += 3;
  return s;
}
function replacementsFor(exId, exclude = []) {
  const ok = gymExIds(), ban = banned(), ex = new Set([exId, ...exclude]);
  return allEx().filter(x => !ex.has(x.id) && !ban.has(x.id) && ok.has(x.id)).map(x => ({ id: x.id, s: exSimilarity(exId, x.id) })).filter(x => x.s >= 1).sort((p, q) => q.s - p.s).map(x => x.id);
}
// ---------- « Je ne veux pas faire cet exo » ----------
function refuseSheet(i, ctx = "live") {
  return () => {
    const cur = ctx === "live" ? liveWorkout()?.ex[i]?.id : S.gen?.days[S.genDay]?.ex[i]?.id; if (!cur) return "";
    const inW = ctx === "live" ? (liveWorkout().ex || []).map(e => e.id) : S.gen.days[S.genDay].ex.map(e => e.id);
    const alts = replacementsFor(cur, inW).slice(0, 4);
    return `<div class="row between"><h2>Pas envie de « ${esc(getEx(cur).name)} » ?</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
      <p class="sm mut">Je te propose des exercices de ta salle qui travaillent les mêmes muscles :</p>
      ${alts.map((id, k) => { const x = getEx(id); return `<div class="entry" data-act="refusePick" data-v="${id}" data-i="${i}" data-ctx="${ctx}"><div style="width:84px;flex:none">${bodyThumbHTML({ prim: x.prim, sec: x.sec, focus: x.focus })}</div><div class="grow"><div class="b">${esc(x.name)}${k === 0 ? ` <span class="pill">conseillé</span>` : ""}</div><div class="xs mut">${x.focus.map(m => MUSCLES[m][0]).join(", ")}</div></div><div class="mut">›</div></div>`; }).join("") || `<p class="sm">Aucun équivalent trouvé dans ta salle.</p>`}
      <label class="row" style="gap:10px;margin-top:12px"><input type="checkbox" id="banForever" style="width:22px;height:22px"> <span class="sm">Ne plus jamais me proposer cet exercice</span></label>
      ${ctx === "live" ? `<button class="sec small" style="margin-top:8px" data-act="refuseDrop" data-i="${i}">Juste le retirer de la séance</button>` : ""}`;
  };
}
function banEx(id) { const doc = clone(Store.get("program", {})); doc.banned = [...new Set([...(doc.banned || []), id])]; // retire aussi des modèles
  doc.templates = doc.templates || {}; Object.entries(program()).forEach(([n, t]) => { if (t.ex.includes(id)) { const r = replacementsFor(id, t.ex)[0]; doc.templates[n] = Object.assign({}, t, { ex: t.ex.map(e => e === id ? r : e).filter(Boolean) }); } });
  Store.set("program", doc); }
// ---------- séance fantôme : comparaison série par série avec la dernière fois ----------
function ghostCmp(cur, prev) { if (!prev) return null; if (+cur.w === +prev.w) return Math.sign(cur.r - prev.r); const a = e1rm(cur), b = e1rm(prev); if (Math.abs(a - b) / b < 0.01) return 0; return a > b ? 1 : -1; }
function ghostBadge(c) { return c == null ? "" : c > 0 ? `<span class="gh up" title="mieux que la dernière fois">▲</span>` : c < 0 ? `<span class="gh down" title="moins bien que la dernière fois">▼</span>` : `<span class="gh eq" title="pareil">＝</span>`; }
function ghostSummary(e, last) {
  if (!last) return ""; const cur = (e.sets || []).filter(s => !s.wu), prev = (last.sets || []).filter(s => !s.wu); if (!cur.length) return "";
  const n = Math.min(cur.length, prev.length); let up = 0, dn = 0, eq = 0; for (let j = 0; j < n; j++) { const c = ghostCmp(cur[j], prev[j]); c > 0 ? up++ : c < 0 ? dn++ : eq++; }
  const vC = cur.slice(0, n).reduce((t, s) => t + s.w * s.r, 0), vP = prev.slice(0, n).reduce((t, s) => t + s.w * s.r, 0); const dv = vP ? Math.round((vC - vP) / vP * 100) : 0;
  const verdict = up > dn ? "📈 Tu progresses" : dn > up ? "📉 Un peu en dessous" : "➡️ Stable";
  return `<div class="xs" style="margin:4px 0"><b>${verdict}</b> vs dernière fois : ${up}▲ ${eq}＝ ${dn}▼ · volume ${dv >= 0 ? "+" : ""}${dv} %</div>`;
}
// ---------- générateur de programme ----------
// volumes hebdo par muscle : 10-12 séries (entretien/progression) et 16-20 pour les muscles prioritaires
// (relation dose-réponse : Schoenfeld et al. 2017, J Sports Sci ; Pelland et al. 2024, méta-régression).
const SPLITS = {
  2: [["Full body A", "all"], ["Full body B", "all"]],
  3: [["Push (pecs, épaules, triceps)", "push"], ["Pull (dos, biceps)", "pull"], ["Jambes", "legs"]],
  4: [["Haut A", "upper"], ["Bas A", "legs"], ["Haut B", "upper"], ["Bas B", "legs"]],
  5: [["Push", "push"], ["Pull", "pull"], ["Jambes", "legs"], ["Haut", "upper"], ["Bas", "legs"]],
  6: [["Push A", "push"], ["Pull A", "pull"], ["Jambes A", "legs"], ["Push B", "push"], ["Pull B", "pull"], ["Jambes B", "legs"]]
};
const DAY_GROUPS = {
  push: ["Pectoraux", "Épaules avant", "Épaules latérales", "Triceps"], pull: ["Dos – largeur", "Dos – épaisseur", "Épaules arrière", "Biceps", "Avant-bras", "Trapèzes"],
  legs: ["Quadriceps", "Ischios", "Fessiers", "Mollets", "Adducteurs", "Abdos", "Lombaires"],
  upper: ["Pectoraux", "Dos – largeur", "Dos – épaisseur", "Épaules latérales", "Épaules arrière", "Biceps", "Triceps"],
  all: ["Pectoraux", "Dos – largeur", "Dos – épaisseur", "Épaules latérales", "Biceps", "Triceps", "Quadriceps", "Ischios", "Fessiers", "Abdos"]
};
function genProgram(o) {
  const split = SPLITS[o.days] || SPLITS[3]; const prio = new Set(o.prio || []); const ok = gymExIds(), ban = banned();
  const cnt = {}; split.forEach(([, k]) => DAY_GROUPS[k].forEach(g => cnt[g] = (cnt[g] || 0) + 1));
  const weekly = g => prio.has(g) ? 18 : ["Avant-bras", "Trapèzes", "Lombaires", "Adducteurs", "Abdos", "Mollets"].includes(g) ? 6 : 10;
  const maxSets = Math.max(8, Math.floor((o.minutes - 8) / 3.2));
  const cands = allEx().filter(x => ok.has(x.id) && !ban.has(x.id));
  const isCompound = x => x.prim.length + x.sec.length >= 3;
  const used = {};
  const days = split.map(([name, k], di) => {
    const groups = DAY_GROUPS[k].slice().sort((a, b) => (prio.has(b) ? 1 : 0) - (prio.has(a) ? 1 : 0));
    // séries visées pour chaque muscle ce jour-là, ramenées à ce qui tient dans la durée choisie
    // on vise le volume complet, puis on réduit tant que la séance ne tient pas dans la durée choisie
    const usedSnap = Object.assign({}, used); let ex;
    for (let f = 1; f >= 0.3; f -= 0.05) {
      Object.keys(used).forEach(k => delete used[k]); Object.assign(used, usedSnap); ex = [];
      const needs = groups.map(g => weekly(g) / cnt[g] * f);
    // séries « dures » restantes par muscle ; un exercice compte 1 série pour ses muscles principaux
    // et 0,5 pour ses muscles secondaires (comptage fractionné, Pelland 2024)
    const rem = {}; groups.forEach((g, gi) => rem[g] = needs[gi]);
    const grpOf = ms => [...new Set(ms.map(m => MUSCLES[m]?.[1]).filter(Boolean))];
    groups.forEach(g => {
      const pool = cands.filter(x => grpOf(x.prim).includes(g))
        .sort((a, b) => ((used[a.id] || 0) - (used[b.id] || 0)) * 3 + (isCompound(b) - isCompound(a)) * 2 + ((o.keep || []).includes(b.id) - (o.keep || []).includes(a.id)));
      while (rem[g] >= 1.5 && pool.length) {
        const x = pool.shift(); if (ex.some(e => e.id === x.id)) continue;
        const sets = rem[g] >= 4.5 ? 4 : rem[g] >= 2.5 ? 3 : 2;
        ex.push({ id: x.id, sets }); used[x.id] = (used[x.id] || 0) + 1;
        grpOf(x.prim).forEach(h => { if (h in rem) rem[h] -= sets; });
        grpOf(x.sec).filter(h => !grpOf(x.prim).includes(h)).forEach(h => { if (h in rem) rem[h] -= sets * 0.5; });
      }
    });
      if (ex.reduce((t, e) => t + e.sets, 0) <= maxSets) break;
    }
    ex.sort((a, b) => isCompound(getEx(b.id)) - isCompound(getEx(a.id)));
    return { name, ex, total: ex.reduce((t, e) => t + e.sets, 0) };
  });
  return { days, opts: o };
}
function genSheet() {
  const G = S.genOpt || (S.genOpt = { days: 3, minutes: 60, prio: [], goal: "hyp" });
  const prog = S.gen;
  return `<div class="row between"><h2>Créer un programme</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    <p class="sm mut">Seulement avec les machines de <b>ta salle</b> (UAX), sans les exercices que tu as refusés.</p>
    <h3>Séances par semaine</h3><div class="chips">${[2, 3, 4, 5, 6].map(n => `<button class="chip ${G.days === n ? "on" : ""}" data-act="genSet" data-k="days" data-v="${n}">${n}</button>`).join("")}</div>
    <h3>Durée d'une séance</h3><div class="chips">${[45, 60, 75, 90].map(n => `<button class="chip ${G.minutes === n ? "on" : ""}" data-act="genSet" data-k="minutes" data-v="${n}">${n} min</button>`).join("")}</div>
    <h3>Muscles prioritaires</h3><div class="chips">${VOLUME_GROUPS.map(g => `<button class="chip ${G.prio.includes(g) ? "on" : ""}" data-act="genPrio" data-v="${esc(g)}">${esc(g)}</button>`).join("")}</div>
    <button style="width:100%;margin-top:12px" data-act="genGo">${prog ? "Régénérer" : "Proposer un programme"}</button>
    ${prog ? `<div style="margin-top:12px">${prog.days.map((d, di) => `<div class="card"><div class="row between"><h3 style="margin:0">${esc(d.name)}</h3><span class="xs mut">${d.total} séries · ~${Math.round(d.total * 3.2 + 8)} min</span></div>
      ${d.ex.map((e, i) => { const x = getEx(e.id); return `<div class="entry"><div style="width:64px;flex:none">${bodyThumbHTML({ prim: x.prim, sec: x.sec, focus: x.focus })}</div><div class="grow"><div class="sm b">${esc(x.name)}</div><div class="xs mut">${e.sets} séries · ${x.prim.map(m => MUSCLES[m]?.[1]).filter((v, k, a) => a.indexOf(v) === k).join(", ")}</div></div><button class="ghost small" data-act="genRefuse" data-d="${di}" data-i="${i}" title="Je ne veux pas cet exercice">🚫</button></div>`; }).join("")}</div>`).join("")}
      <p class="xs mut">Volume = séries <b>par muscle et par semaine</b> (pas par séance) : ~10, 16-20 pour les prioritaires, 6 pour les petits muscles. Seules les séries dures comptent (0 à 3 répétitions en réserve). Un exercice compte 1 série pour ses muscles principaux et ½ pour les secondaires : un développé couché fait aussi travailler triceps et épaules avant (Schoenfeld 2017 ; Pelland 2024). Les gros exercices passent en premier.</p>
      <div class="row" style="gap:8px"><button class="grow" data-act="genSave" data-v="replace">Remplacer mon programme</button><button class="sec grow" data-act="genSave" data-v="add">Ajouter à côté</button></div></div>` : ""}`;
}
const PROG_ACT = {
  refuse: el => openSheet(refuseSheet(+el.dataset.i, "live")),
  refusePick: el => { const i = +el.dataset.i, id = el.dataset.v, ctx = el.dataset.ctx; const ban = $("#banForever")?.checked;
    if (ctx === "live") { const old = liveWorkout().ex[i].id; updW(w => { w.ex[i].id = id; }); delete S.draft[i]; if (ban) banEx(old); closeSheet(); toast(ban ? "Remplacé, et je ne te le proposerai plus" : "Exercice remplacé"); }
    else { const d = S.gen.days[S.genDay]; const old = d.ex[i].id; d.ex[i].id = id; if (ban) banEx(old); openSheet(genSheet); } },
  refuseDrop: el => { const i = +el.dataset.i; const old = liveWorkout().ex[i].id; const ban = $("#banForever")?.checked; updW(w => w.ex.splice(i, 1)); S.draft = {}; if (ban) banEx(old); closeSheet(); },
  genOpen: () => { S.gen = null; openSheet(genSheet); },
  genSet: el => { S.genOpt[el.dataset.k] = +el.dataset.v; renderSheet(); },
  genPrio: el => { const g = el.dataset.v, p = S.genOpt.prio; const k = p.indexOf(g); k >= 0 ? p.splice(k, 1) : p.push(g); renderSheet(); },
  genGo: () => { S.gen = genProgram(Object.assign({ keep: Object.values(program()).flatMap(t => t.ex) }, S.genOpt)); renderSheet(); },
  genRefuse: el => { S.genDay = +el.dataset.d; openSheet(refuseSheet(+el.dataset.i, "gen")); },
  genSave: el => { const doc = clone(Store.get("program", {})); const t = {}; S.gen.days.forEach(d => t[d.name] = { warmup: true, ex: d.ex.map(e => e.id), sets: Object.fromEntries(d.ex.map(e => [e.id, e.sets])) });
    if (el.dataset.v === "replace") { doc.templates = t; doc.only = true; } else doc.templates = Object.assign(doc.templates || {}, t);
    Store.set("program", doc); S.gen = null; closeSheet(); toast("Programme enregistré 💪"); },
  energyInfo: () => openSheet(energyExplainSheet),
};

// ===================== BASE D'EXERCICES : matériel, photos, variantes =====================
// Photos : free-exercise-db (domaine public, github.com/yuhonas/free-exercise-db), 2 images début/fin.
const FEDB = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c/exercises/";
const exImg = (p, k = 0) => p ? `${FEDB}${p}/${k}.jpg` : "";
const EQ_LABEL = { libre: "Poids libre", machine: "Machine", poulie: "Poulie" };
// id : [matériel, photo, variantes [matériel, nom, ce que ça change (par rapport à l'exercice), exercice de l'app, photo]]
const EX_DB = {
  lat_raise_cable: ["poulie", "Cable_Seated_Lateral_Raise", [
    ["poulie", "Câble derrière le dos", "Encore plus de tension en bas", "", ""], ["poulie", "Penché vers la poulie (lean-away)", "Plus d'amplitude", "", ""],
    ["libre", "Haltères debout", "Rien en bas, tout en haut ; faisable partout", "lat_raise_db", "Side_Lateral_Raise"], ["libre", "Allongé sur le côté", "Tension en bas, comme la poulie", "", "Lying_One-Arm_Lateral_Raise"],
    ["machine", "Machine élévations latérales", "Guidé : facile d'aller à l'échec", "", ""]]],
  lat_raise_db: ["libre", "Side_Lateral_Raise", [
    ["libre", "Assis", "Supprime l'élan", "", "Seated_Side_Lateral_Raise"], ["libre", "Allongé sur le côté", "Tension en bas du mouvement", "", "Lying_One-Arm_Lateral_Raise"],
    ["poulie", "Unilatéral poulie basse", "Tension aussi en bas : souvent plus efficace", "lat_raise_cable", "Cable_Seated_Lateral_Raise"],
    ["machine", "Machine élévations latérales", "Guidé, aucun élan possible", "", ""]]],
  shoulder_press: ["machine", "Machine_Shoulder_Military_Press", [
    ["machine", "Smith assis", "Plus lourd, trajectoire fixe", "", "Smith_Machine_Overhead_Shoulder_Press"],
    ["libre", "Haltères assis", "Plus d'amplitude, chaque bras seul", "", "Dumbbell_Shoulder_Press"], ["libre", "Barre debout (militaire)", "Plus lourd, demande du gainage", "", "Barbell_Shoulder_Press"],
    ["poulie", "Poulies basses assis", "Tension constante, trajectoire libre", "", "Seated_Cable_Shoulder_Press"]]],
  face_pull: ["poulie", "Face_Pull", [
    ["poulie", "Assis au sol", "Supprime la triche avec le dos", "", ""],
    ["libre", "Oiseau haltères penché", "Sans poulie ; moins de coiffe", "", "Reverse_Flyes"],
    ["machine", "Oiseau machine", "Arrière d'épaule isolé, moins de trapèze", "rear_delt_fly", "Reverse_Machine_Flyes"]]],
  rear_delt_fly: ["machine", "Reverse_Machine_Flyes", [
    ["machine", "Unilatéral", "Plus d'amplitude", "", ""],
    ["libre", "Oiseau haltères penché", "Sans machine, plus dur à stabiliser", "", "Reverse_Flyes"],
    ["poulie", "Oiseau poulies croisées", "Tension constante", "", "Cable_Rear_Delt_Fly"], ["poulie", "Face pull", "Ajoute trapèze moyen et coiffe", "face_pull", "Face_Pull"]]],
  tri_oh_cable: ["poulie", "Cable_Rope_Overhead_Triceps_Extension", [
    ["poulie", "Unilatéral", "Plus d'amplitude", "", ""],
    ["libre", "Haltère à deux mains", "Sans poulie ; moins de tension en haut", "", "Standing_Dumbbell_Triceps_Extension"], ["libre", "Barre EZ couché (skull crusher)", "Plus lourd, chef long un peu moins étiré", "", "EZ-Bar_Skullcrusher"],
    ["machine", "Machine triceps", "Guidé, facile d'aller à l'échec", "", "Machine_Triceps_Extension"]]],
  tri_push_uni: ["poulie", "Triceps_Pushdown", [
    ["poulie", "Corde à deux mains", "Plus rapide, un peu plus lourd", "tri_push_rope", "Triceps_Pushdown_-_Rope_Attachment"], ["poulie", "Prise inversée", "Plus de chef médial", "", "Reverse_Grip_Triceps_Pushdown"],
    ["libre", "Kickback haltère", "Tension surtout en fin de mouvement", "", "Tricep_Dumbbell_Kickback"],
    ["machine", "Dips machine", "Bien plus lourd, un peu de pecs", "", "Dip_Machine"]]],
  tri_push_rope: ["poulie", "Triceps_Pushdown_-_Rope_Attachment", [
    ["poulie", "Barre en V", "Plus lourd, moins d'écartement en bas", "", "Triceps_Pushdown_-_V-Bar_Attachment"], ["poulie", "Unilatéral", "Chaque bras seul, plus d'amplitude", "tri_push_uni", "Triceps_Pushdown"],
    ["libre", "Kickback haltère", "Tension surtout en fin de mouvement", "", "Tricep_Dumbbell_Kickback"],
    ["machine", "Dips machine", "Bien plus lourd, un peu de pecs", "", "Dip_Machine"]]],
  dips: ["libre", "Dips_-_Triceps_Version", [
    ["libre", "Buste penché", "Plus de pectoraux", "", "Dips_-_Chest_Version"], ["libre", "Lestés", "Ceinture de lest pour progresser", "", ""],
    ["machine", "Dips machine", "Charge réglable, plus stable", "", "Dip_Machine"], ["machine", "Dips assistés", "Contrepoids : pour finir une série", "", ""],
    ["poulie", "Pushdown corde", "Triceps seuls, sans pecs ni épaules", "tri_push_rope", "Triceps_Pushdown_-_Rope_Attachment"]]],
  hammer_rope: ["poulie", "Cable_Hammer_Curls_-_Rope_Attachment", [
    ["libre", "Curl marteau haltères", "Peu de tension en bas", "", "Hammer_Curls"], ["libre", "Marteau croisé", "Vers l'épaule opposée : plus de brachial", "", "Cross_Body_Hammer_Curl"],
    ["libre", "Marteau incliné", "Plus d'étirement", "", "Incline_Hammer_Curls"]]],
  bayesian_curl: ["poulie", "", [
    ["poulie", "Assis sur un banc", "Supprime l'élan", "", ""], ["poulie", "Curl face à la poulie", "Bras devant : moins d'étirement, plus de contraction", "", "Standing_Biceps_Cable_Curl"],
    ["libre", "Curl incliné haltères", "Même étirement, sans poulie", "incline_db_curl", "Incline_Dumbbell_Curl"],
    ["machine", "Curl machine", "Guidé ; bras devant, moins d'étirement", "", "Machine_Bicep_Curl"]]],
  incline_db_curl: ["libre", "Incline_Dumbbell_Curl", [
    ["libre", "Prise marteau inclinée", "Plus de brachial et brachio-radial", "", "Incline_Hammer_Curls"],
    ["poulie", "Bayesian (coude derrière)", "Même étirement, tension constante", "bayesian_curl", ""],
    ["machine", "Curl machine", "Guidé ; moins d'étirement", "", "Machine_Bicep_Curl"]]],
  preacher_curl: ["libre", "Preacher_Curl", [
    ["libre", "Unilatéral haltère", "Chaque bras seul", "", "One_Arm_Dumbbell_Preacher_Curl"],
    ["machine", "Machine pupitre", "Tension plus régulière", "", "Machine_Preacher_Curls"],
    ["poulie", "Pupitre à la poulie", "Tension aussi en haut", "", "Cable_Preacher_Curl"]]],
  cable_crunch: ["poulie", "Cable_Crunch", [
    ["poulie", "Avec rotation", "Ajoute les obliques", "", "Kneeling_Cable_Crunch_With_Alternating_Oblique_Twists"],
    ["machine", "Crunch machine", "Assis, guidé, facile à charger", "", "Ab_Crunch_Machine"],
    ["libre", "Crunch lesté au sol", "Sans matériel ; amplitude plus courte", "", "Weighted_Crunches"]]],
  incline_press_machine: ["machine", "Leverage_Incline_Chest_Press", [
    ["machine", "Smith incliné", "Barre guidée, plus lourd", "", "Smith_Machine_Incline_Bench_Press"],
    ["libre", "Haltères inclinés", "Plus d'amplitude, plus de stabilisation", "db_incline_press", "Incline_Dumbbell_Press"], ["libre", "Barre inclinée", "Plus lourd, amplitude limitée", "", "Barbell_Incline_Bench_Press_-_Medium_Grip"],
    ["poulie", "Développé incliné poulie", "Tension constante", "", "Incline_Cable_Chest_Press"]]],
  bench_press: ["libre", "Barbell_Bench_Press_-_Medium_Grip", [
    ["libre", "Haltères", "Plus d'amplitude, moins lourd", "", "Dumbbell_Bench_Press"], ["libre", "Prise serrée", "Plus de triceps", "", "Close-Grip_Barbell_Bench_Press"],
    ["machine", "Chest press", "Guidé : échec sans risque", "chest_press", "Leverage_Chest_Press"], ["machine", "Smith", "Barre guidée, plus stable", "", "Smith_Machine_Bench_Press"],
    ["poulie", "Développé poulie debout", "Tension constante, plus léger", "", "Standing_Cable_Chest_Press"]]],
  db_incline_press: ["libre", "Incline_Dumbbell_Press", [
    ["libre", "Prise neutre", "Plus doux pour les épaules", "", "Hammer_Grip_Incline_DB_Bench_Press"],
    ["machine", "Incliné machine", "Guidé, facile d'aller à l'échec", "incline_press_machine", "Leverage_Incline_Chest_Press"],
    ["poulie", "Développé incliné poulie", "Tension constante", "", "Incline_Cable_Chest_Press"]]],
  chest_press: ["machine", "Leverage_Chest_Press", [
    ["machine", "Unilatéral", "Un bras à la fois", "", ""],
    ["libre", "Développé couché barre", "Plus lourd, plus technique", "bench_press", "Barbell_Bench_Press_-_Medium_Grip"], ["libre", "Haltères", "Plus d'amplitude", "", "Dumbbell_Bench_Press"],
    ["poulie", "Développé poulie debout", "Tension constante", "", "Standing_Cable_Chest_Press"]]],
  pec_fly_machine: ["machine", "Butterfly", [
    ["poulie", "Poulies vis-à-vis", "Tension constante, angle réglable", "", "Cable_Crossover"], ["poulie", "Poulies basses vers le haut", "Accent haut des pecs", "", "Low_Cable_Crossover"],
    ["libre", "Écarté haltères couché", "Étirement max, rien en haut", "", "Dumbbell_Flyes"]]],
  lat_pulldown_pron: ["poulie", "Wide-Grip_Lat_Pulldown", [
    ["poulie", "Prise neutre serrée", "Plus d'amplitude, bas des dorsaux", "", "V-Bar_Pulldown"], ["poulie", "Un bras", "Plus d'étirement", "", "One_Arm_Lat_Pulldown"],
    ["poulie", "Bras tendus (pull-over)", "Grand dorsal isolé, sans biceps", "", "Straight-Arm_Pulldown"],
    ["libre", "Tractions", "Poids du corps : plus dur, plus de gainage", "pull_up", "Pullups"],
    ["machine", "Tirage convergent", "Guidé, chaque bras indépendant", "", ""]]],
  pull_up: ["libre", "Pullups", [
    ["libre", "Chin-up (supination)", "Plus de biceps", "", "Chin-Up"], ["libre", "Lestées", "Pour progresser au-delà de 12 reps", "", ""],
    ["machine", "Tractions assistées", "Contrepoids : plus de reps", "", ""],
    ["poulie", "Tirage vertical", "Charge réglable, plus facile à doser", "lat_pulldown_pron", "Wide-Grip_Lat_Pulldown"]]],
  row_neutral_close: ["poulie", "Seated_Cable_Rows", [
    ["poulie", "Unilatéral", "Plus d'amplitude et de rotation", "", "Seated_One-arm_Cable_Pulley_Rows"], ["poulie", "Coudes ouverts, prise large", "Haut du dos, arrière d'épaule", "row_pron_wide", ""],
    ["libre", "Rowing haltère", "Un bras, appui sur banc", "db_row", "One-Arm_Dumbbell_Row"], ["libre", "Rowing barre penché", "Plus lourd, sollicite les lombaires", "", "Bent_Over_Barbell_Row"],
    ["machine", "Machine appui poitrine", "Aucune triche du bas du dos", "", "Lying_T-Bar_Row"]]],
  row_pron_wide: ["poulie", "", [
    ["poulie", "Prise neutre serrée", "Plus de grand dorsal", "row_neutral_close", "Seated_Cable_Rows"],
    ["libre", "Rowing barre prise large", "Plus lourd, demande du gainage", "", "Bent_Over_Barbell_Row"],
    ["machine", "T-bar avec appui", "Stable, épaisseur du dos", "", "Lying_T-Bar_Row"]]],
  db_row: ["libre", "One-Arm_Dumbbell_Row", [
    ["libre", "Allongé sur banc incliné", "Aucune triche possible", "", "Dumbbell_Incline_Row"],
    ["poulie", "Unilatéral poulie", "Tension constante", "", "Seated_One-arm_Cable_Pulley_Rows"],
    ["machine", "Machine appui poitrine", "Plus lourd, stable", "", "Lying_T-Bar_Row"]]],
  shrug: ["libre", "Dumbbell_Shrug", [
    ["libre", "Barre", "Plus lourd", "", "Barbell_Shrug"],
    ["machine", "Machine / Smith", "Stable, très lourd", "", "Leverage_Shrug"],
    ["poulie", "Poulies basses", "Tension constante", "", "Cable_Shrugs"]]],
  squat: ["libre", "Barbell_Squat", [
    ["libre", "Front squat", "Buste droit, plus de quadriceps", "", "Front_Barbell_Squat"], ["libre", "Goblet squat", "Haltère devant : technique facile", "", "Goblet_Squat"],
    ["machine", "Hack squat", "Dos calé : quadriceps, moins de lombaires", "hack_squat", "Hack_Squat"], ["machine", "Smith", "Guidé, pieds en avant possibles", "", "Smith_Machine_Squat"]]],
  leg_press: ["machine", "Leg_Press", [
    ["machine", "Pieds hauts et larges", "Plus de fessiers et d'ischios", "", ""], ["machine", "Pieds bas et serrés", "Plus de quadriceps", "", "Narrow_Stance_Leg_Press"],
    ["libre", "Squat barre", "Plus de gainage et de lombaires", "squat", "Barbell_Squat"]]],
  hack_squat: ["machine", "Hack_Squat", [
    ["machine", "Pieds serrés", "Encore plus de quadriceps", "", "Narrow_Stance_Hack_Squats"], ["machine", "Presse à cuisses", "Plus facile pour le dos", "leg_press", "Leg_Press"],
    ["libre", "Squat barre", "Plus de fessiers et de gainage", "squat", "Barbell_Squat"]]],
  leg_ext: ["machine", "Leg_Extensions", [
    ["machine", "Unilatéral", "Un côté à la fois", "", "Single-Leg_Leg_Extension"], ["machine", "Buste penché en arrière", "Étire le droit fémoral", "", ""],
    ["poulie", "Poulie basse à la cheville", "Sans machine dédiée", "", ""]]],
  bulgarian: ["libre", "Split_Squat_with_Dumbbells", [
    ["libre", "Fentes", "Pied arrière au sol : plus facile", "lunges", "Dumbbell_Lunges"],
    ["machine", "Au Smith", "Plus stable, plus lourd", "", "Smith_Single-Leg_Split_Squat"]]],
  lunges: ["libre", "Dumbbell_Lunges", [
    ["libre", "Fentes arrière", "Plus doux pour les genoux", "", "Dumbbell_Rear_Lunge"], ["libre", "Fentes marchées", "Plus d'équilibre et de cardio", "", "Barbell_Walking_Lunge"],
    ["libre", "Fente bulgare", "Pied arrière surélevé : plus dur", "bulgarian", "Split_Squat_with_Dumbbells"],
    ["machine", "Fente au Smith", "Stable", "", "Smith_Single-Leg_Split_Squat"]]],
  rdl: ["libre", "Romanian_Deadlift", [
    ["libre", "Haltères", "Trajectoire plus libre", "", "Stiff-Legged_Dumbbell_Deadlift"],
    ["machine", "Smith", "Guidé", "", "Smith_Machine_Stiff-Legged_Deadlift"], ["machine", "Leg curl assis", "Ischios seuls, sans lombaires", "seated_leg_curl", "Seated_Leg_Curl"],
    ["poulie", "Pull-through", "Plus de fessiers, moins de lombaires", "", "Pull_Through"]]],
  seated_leg_curl: ["machine", "Seated_Leg_Curl", [
    ["machine", "Buste penché en avant", "Encore plus d'étirement", "", ""], ["machine", "Couché", "Moins d'étirement, un peu de mollets", "lying_leg_curl", "Lying_Leg_Curls"],
    ["libre", "Leg curl sur ballon", "Sans machine", "", "Ball_Leg_Curl"]]],
  lying_leg_curl: ["machine", "Lying_Leg_Curls", [
    ["machine", "Assis", "Plus d'étirement : plus d'hypertrophie", "seated_leg_curl", "Seated_Leg_Curl"], ["machine", "Debout unilatéral", "Un côté à la fois", "", "Standing_Leg_Curl"],
    ["libre", "Leg curl sur ballon", "Sans machine", "", "Ball_Leg_Curl"]]],
  hip_thrust: ["libre", "Barbell_Hip_Thrust", [
    ["libre", "Glute bridge au sol", "Amplitude plus courte, plus simple", "", "Barbell_Glute_Bridge"], ["libre", "Unilatéral", "Corrige les déséquilibres", "", "Single_Leg_Glute_Bridge"],
    ["machine", "Machine hip thrust", "Rapide à installer", "", ""],
    ["poulie", "Pull-through", "Fessiers en position étirée", "", "Pull_Through"]]],
  adductor_machine: ["machine", "Thigh_Adductor", [
    ["poulie", "Poulie basse à la cheville", "Un côté, plus d'amplitude", "", ""],
    ["libre", "Copenhagen plank", "Poids du corps + gainage", "", ""]]],
  abductor_machine: ["machine", "Thigh_Abductor", [
    ["machine", "Buste penché en avant", "Plus de moyen fessier", "", ""],
    ["poulie", "Poulie basse debout", "Un côté à la fois", "", ""],
    ["libre", "Élastique aux genoux", "Sans machine", "", ""]]],
  calf_standing: ["machine", "Standing_Calf_Raises", [
    ["machine", "Assis", "Genou plié : surtout soléaire", "calf_seated", "Seated_Calf_Raise"], ["machine", "Presse à cuisses", "Sans machine dédiée", "", "Calf_Press_On_The_Leg_Press_Machine"],
    ["libre", "Une jambe sur une marche", "Plus d'amplitude", "", "Standing_Dumbbell_Calf_Raise"]]],
  calf_seated: ["machine", "Seated_Calf_Raise", [
    ["machine", "Debout", "Jambe tendue : plus de gastrocnémiens", "calf_standing", "Standing_Calf_Raises"],
    ["libre", "Haltère sur le genou", "Sans machine", "", "Dumbbell_Seated_One-Leg_Calf_Raise"]]],
  back_ext: ["machine", "Hyperextensions_Back_Extensions", [
    ["machine", "Reverse hyper", "Bas du dos sans compression", "", "Reverse_Hyperextension"],
    ["libre", "Good morning", "Plus lourd, plus technique", "", "Stiff_Leg_Barbell_Good_Morning"],
    ["poulie", "Pull-through", "Plus de fessiers", "", "Pull_Through"]]]
};

// ---------- fiche exercice : photo (ou 3D), muscles ciblés, variantes par matériel ----------
// i = position de l'exercice dans la séance en cours (actions « Utiliser », « Pas envie », etc.)
function exMuscleSheet(exId, i) {
  S.exEq = null;
  return () => {
    const x = getEx(exId), db = EX_DB[exId], live = i != null && liveWorkout()?.ex[i]?.id === exId;
    const img = db?.[1], media = img && S.exMedia !== "3d" ? "photo" : "3d";
    const mn = m => esc(MUSCLES[m]?.[0] || m);
    const also = x.prim.filter(m => !x.focus.includes(m)).concat(x.sec);
    const groups = db ? Object.keys(EQ_LABEL).filter(k => db[2].some(v => v[0] === k)) : [];
    const cur = groups.includes(S.exEq) ? S.exEq : groups.includes(db?.[0]) ? db[0] : groups[0];
    const row = ([, n, d, id, p]) => `<div class="entry exv">${p ? `<div class="exvt"><img src="${exImg(p)}" loading="lazy" alt="" onerror="this.parentNode.remove()"></div>` : ""}
      <div class="grow"><div class="sm b">${esc(n)}</div><div class="xs mut">${esc(d)}</div></div>${id && live ? `<button class="ghost small" data-act="useVar" data-v="${id}" data-i="${i}">Utiliser</button>` : ""}</div>`;
    const cues = EX_CUES[x.id] || [], roles = x.prim.concat(x.sec).filter((m, k, a) => a.indexOf(m) === k && MUSCLE_INFO[m]);
    const [lo, hi] = repRange(exId);
    return `<div class="row between"><h2 style="margin:0">${esc(x.name)}</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
      ${img ? `<div class="chips exmedia"><button class="chip ${media === "photo" ? "on" : ""}" data-act="exMedia" data-v="photo">Photo</button><button class="chip ${media === "3d" ? "on" : ""}" data-act="exMedia" data-v="3d">3D</button></div>` : ""}
      ${media === "photo" ? `<div class="exph"><img src="${exImg(img, 0)}" alt="" onerror="this.parentNode.remove()"><img class="b" src="${exImg(img, 1)}" alt=""></div>` : body3DHolderHTML("min(46vh, 420px)", true)}
      <div class="exmus"><span class="xs mut">Ciblé</span>${x.focus.map(m => `<span class="mtag p">${mn(m)}</span>`).join("")}${also.length ? `<br><span class="xs mut">Aussi</span>${also.map(m => `<span class="mtag">${mn(m)}</span>`).join("")}` : ""}</div>
      ${groups.length ? `<h3>Variantes</h3><div class="chips">${groups.map(k => `<button class="chip ${k === cur ? "on" : ""}" data-act="exEq" data-v="${k}">${EQ_LABEL[k]}</button>`).join("")}</div>
        ${groups.map(k => `<div class="exvar ${k === cur ? "on" : ""}" data-eq="${k}">${db[2].filter(v => v[0] === k).map(row).join("")}</div>`).join("")}` : ""}
      ${cues.length || x.note || roles.length ? `<details class="exhow"><summary>Bien le faire</summary>${cues.length ? `<ol class="sm">${cues.map(c => `<li>${esc(c)}</li>`).join("")}</ol>` : ""}${x.note ? `<div class="reco sm">${esc(x.note)}</div>` : ""}
        ${roles.map(m => `<p class="xs" style="margin:4px 0"><b>${mn(m)}</b> — ${esc(MUSCLE_INFO[m])}</p>`).join("")}${img ? `<p class="xs mut">Photos : free-exercise-db (domaine public).</p>` : ""}</details>` : ""}
      ${live ? `<div class="exacts"><label class="xs mut">Reps visées <select data-act="range" data-v="${exId}">${[[6, 8], [6, 10], [8, 10], [8, 12], [10, 15], [12, 20]].map(([a, b]) => `<option value="${a}-${b}" ${a === lo && b === hi ? "selected" : ""}>${a}-${b}</option>`).join("")}</select></label>
        <div class="row" style="gap:6px"><button class="ghost small" data-act="refuse" data-i="${i}">🚫 Pas envie</button>${i > 0 ? `<button class="ghost small" data-act="exMove" data-i="${i}">↑ Monter</button>` : ""}<button class="ghost small dangertxt" data-act="exDrop" data-i="${i}">Retirer</button></div></div>` : ""}`;
  };
}

// ---------- carte d'exercice pendant la séance : une série = 1 tap (2 si on ajuste) ----------
function exDraft(w, e, i) {
  const [lo, hi] = repRange(e.id); const sug = suggestion(e.id, w._id); const last = exerciseHistory(e.id, w._id)[0];
  const ws = (e.sets || []).filter(s => !s.wu), lastW = ws.slice(-1)[0], gs = last ? last.sets.filter(z => !z.wu)[ws.length] : null;
  const dr = S.draft[i] || (S.draft[i] = { w: lastW?.w ?? sug.w ?? gs?.w ?? "", r: "", rir: null, wu: false });
  // reps toujours pré-remplies : la série précédente, sinon l'objectif du conseil (charge montée → bas de fourchette ; sinon +1 rep vs la dernière fois)
  if (dr.r === "" || dr.r == null) dr.r = lastW?.r ?? (sug.up ? lo : gs ? Math.min(Math.max(gs.r + 1, lo), hi) : hi);
  return dr;
}
const setLbl = dr => dr.w !== "" && dr.r !== "" ? `${dr.w} kg × ${dr.r}` : "";
function exCard(w, e, i) {
  if (e.done) { const x0 = getEx(e.id); const ws = (e.sets || []).filter(s => !s.wu);
    return `<div class="card exdone" data-act="exReopen" data-i="${i}"><div class="row between" style="align-items:center"><div><div class="b">✅ ${esc(x0.name)}</div>
      <div class="xs mut">${ws.length} série${ws.length > 1 ? "s" : ""} · ${ws.map(s => `${s.w}×${s.r}${s.rir != null ? ` @${s.rir}` : ""}`).join(" · ")}</div></div><button class="ghost small" data-act="exReopen" data-i="${i}">Modifier</button></div></div>`; }
  const x = getEx(e.id); const sug = suggestion(e.id, w._id); const last = exerciseHistory(e.id, w._id)[0];
  const prev = e.sets || [], nW = prev.filter(s => !s.wu).length, lastSets = last ? last.sets.filter(z => !z.wu) : [];
  const dr = exDraft(w, e, i);
  const dl = isDeload() ? `<div class="reco xs" style="margin:6px 0">🔋 Décharge : environ <b>${Math.max(1, Math.round((program()[w.name]?.sets?.[e.id] || 3) / 2))} série(s)</b> à la charge habituelle, 3-4 reps en réserve.</div>` : "";
  return `<div class="card">${dl}<div class="exhead" data-act="exInfo" data-v="${e.id}" data-i="${i}"><div class="exth">${bodyThumbHTML({ prim: x.prim, sec: x.sec, focus: x.focus })}</div>
      <div class="grow"><h3 style="margin:0">${esc(x.name)}</h3><div class="xs mut">${x.focus.map(m => MUSCLES[m][0]).join(", ")}</div></div><span class="exmore" title="Détails, variantes">⋯</span></div>
    ${last ? `<div class="xs mut exlast">Dernière fois (${fmtDay(dateKey(new Date(last.date)))}) : ${lastSets.map((s, k) => `<span class="${k === nW ? "nx" : ""}">${s.w}×${s.r}${s.rir != null ? ` @${s.rir}` : ""}</span>`).join(" · ")}</div>` : ""}
    <div class="reco ${sug.up ? "good" : ""} sm">${esc(sug.text)}</div>
    ${prev.map((s, j) => { const rest = j > 0 ? s.t - prev[j - 1].t : null; const n = prev.slice(0, j + 1).filter(z => !z.wu).length; const ghostSet = !s.wu ? lastSets[n - 1] : null;
      return `<div class="set ${s.wu ? "wu" : ""}"><span class="mut">${s.wu ? "É" : n}</span><span class="b">${s.w} kg</span><span class="b">× ${s.r} ${s.wu ? "" : ghostBadge(ghostCmp(s, ghostSet))}</span><span class="xs">${s.rir != null && !s.wu ? "RIR " + s.rir : ""}${rest ? ` · ${fmtDur(rest)}` : ""}</span><button class="danger small" data-act="delSet" data-i="${i}" data-j="${j}">✕</button></div>`; }).join("")}
    ${ghostSummary(e, last)}
    <div class="exin"><div class="row"><div class="grow"><div class="xs mut">kg</div><div class="stepper"><button data-act="dStep" data-i="${i}" data-k="w" data-v="-${profile().increment}">−</button><input type="number" inputmode="decimal" value="${dr.w}" data-input="draft" data-i="${i}" data-k="w"><button data-act="dStep" data-i="${i}" data-k="w" data-v="${profile().increment}">+</button></div>${BARBELL.has(e.id) && dr.w ? plateHTML(+dr.w) : ""}</div>
      <div class="grow"><div class="xs mut">Reps</div><div class="stepper"><button data-act="dStep" data-i="${i}" data-k="r" data-v="-1">−</button><input type="number" inputmode="numeric" value="${dr.r}" data-input="draft" data-i="${i}" data-k="r"><button data-act="dStep" data-i="${i}" data-k="r" data-v="1">+</button></div></div></div>
      <div class="row exrir"><span class="xs mut">RIR</span>${[0, 1, 2, 3, 4].map(v => `<button class="chip ${dr.rir === v && !dr.wu ? "on" : ""}" data-act="dRir" data-i="${i}" data-v="${v}">${v === 4 ? "4+" : v}</button>`).join("")}<button class="chip ${dr.wu ? "on" : ""}" data-act="dWu" data-i="${i}">Échauff.</button></div>
      <div class="row" style="margin-top:8px;gap:8px"><button class="grow" data-act="logSet" data-i="${i}">✓ <span class="vl">${setLbl(dr) || "Valider la série"}</span></button>${nW ? `<button class="sec small" style="flex:none;padding:8px 12px" data-act="exDone" data-i="${i}" title="Replier l'exercice">Fini</button>` : ""}</div></div></div>`;
}
// le bouton Valider suit ce qu'on tape au clavier
document.addEventListener("input", ev => { const el = ev.target; if (el.dataset?.input !== "draft") return; const i = el.dataset.i;
  const v = k => $(`input[data-input=draft][data-i="${i}"][data-k="${k}"]`)?.value ?? ""; const b = $(`[data-act=logSet][data-i="${i}"] .vl`);
  if (b) b.textContent = setLbl({ w: v("w"), r: v("r") }) || "Valider la série"; });
Object.assign(PROG_ACT, {
  exInfo: el => { S.bodyEx = el.dataset.v; openSheet(exMuscleSheet(el.dataset.v, +el.dataset.i)); },
  exMedia: el => { S.exMedia = el.dataset.v; S.bodyAnim = true; renderSheet(); },
  exEq: el => { S.exEq = el.dataset.v; $$(".sheet [data-act=exEq]").forEach(b => b.classList.toggle("on", b === el)); $$(".sheet .exvar").forEach(d => d.classList.toggle("on", d.dataset.eq === S.exEq)); },
  useVar: el => { const i = +el.dataset.i, id = el.dataset.v; updW(w => { w.ex[i].id = id; }); delete S.draft[i]; closeSheet(); toast("Variante choisie : " + getEx(id).name); },
  exMove: el => { closeSheet(); ACT.exUp(el); },
  exDrop: el => { closeSheet(); ACT.rmEx(el); },
});
