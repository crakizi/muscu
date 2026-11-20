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
