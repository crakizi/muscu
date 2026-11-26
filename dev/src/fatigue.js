// ===================== FATIGUE CUMULÉE → DÉCHARGE CONSEILLÉE =====================
// Calcul caché : chaque semaine reçoit un score de fatigue (0 à 1) à partir de plusieurs signaux.
// La décharge n'est proposée que si la fatigue reste élevée plusieurs semaines de suite.
//
// Signaux par semaine (lundi → dimanche) :
//  1. nombre de séances par rapport à tes habitudes (médiane des 8 semaines d'avant)
//  2. séries dures (principal 1, secondaire ½) par rapport à tes habitudes
//  3. « jours rouges » : jours où au moins 2 groupes musculaires étaient à moins de 35 % de récupération
//  4. performances : part des séries moins bonnes que la dernière fois (▼)
//  5. effort : part des séries à RIR 0 (à l'échec)
//  6. ressenti : énergie / récup / motivation du bilan hebdo, énergie / stress / sommeil du journal
// Règle : décharge conseillée si ≥ 2 des 3 dernières semaines complètes ont un score ≥ 0,55
// (ou 1 seule ≥ 0,75 avec une semaine en cours déjà ≥ 0,55), au moins 5 semaines après la
// dernière décharge, et seulement si tu t'entraînes régulièrement (≥ 2 séances/sem. en moyenne).
const FAT = { cache: null, t: 0 };
const weekStartKey = k => { const d = parseKey(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dateKey(d); };
function loadAt(ts, ws) { // charge par muscle à un instant donné (même modèle que la carte de récupération)
  const f = {}; ws.forEach(w => { const h = (ts - (w.end || w.start)) / 3600000; if (h < 0 || h > 120 || w.live) return; const dec = Math.exp(-h / 30);
    (w.ex || []).forEach(e => { const n = workSets(e).length; if (!n) return; const x = getEx(e.id); if (!x) return;
      x.prim.forEach(m => f[m] = (f[m] || 0) + n * dec); x.sec.forEach(m => f[m] = (f[m] || 0) + n * 0.5 * dec); }); });
  const g = {}; Object.entries(f).forEach(([m, v]) => { const gr = MUSCLES[m]?.[1]; if (gr) g[gr] = Math.max(g[gr] || 0, v); }); return g;
}
function weekStats(ws0, ws) {
  const t0 = parseKey(ws0).getTime(), t1 = t0 + 7 * 864e5;
  const inW = ws.filter(w => !w.live && w.start >= t0 && w.start < t1);
  let sets = 0, down = 0, cmp = 0, fail = 0, rirN = 0;
  inW.forEach(w => (w.ex || []).forEach(e => { const x = getEx(e.id); const ss = workSets(e); if (!x) return;
    sets += ss.length * (1 + 0.5 * (x.sec.length ? 1 : 0));
    ss.forEach(s => { if (s.rir != null) { rirN++; if (s.rir === 0) fail++; } });
    const lw = ws.find(o => !o.live && o.start < w.start && (o.ex || []).some(q => q.id === e.id && workSets(q).length)); const last = lw ? { sets: workSets(lw.ex.find(q => q.id === e.id)) } : null;
    if (last) ss.forEach((s, j) => { const p = (last.sets || []).filter(q => !q.wu)[j]; if (p) { cmp++; if (ghostCmp(s, p) < 0) down++; } }); }));
  let red = 0; for (let i = 0; i < 7; i++) { const g = loadAt(t0 + i * 864e5 + 20 * 3600e3, ws); if (Object.values(g).filter(v => v >= 3.9).length >= 2) red++; }
  // ressenti (1 = mauvais, 5 = bon) → 0..1 de fatigue
  const feel = []; const bl = (typeof bilans === "function" ? bilans() : []).filter(b => b.date >= ws0 && b.date < addDays(ws0, 7));
  bl.forEach(b => ["energie", "recup", "motivation"].forEach(k => { if (b[k]) feel.push((5 - b[k]) / 4); }));
  for (let i = 0; i < 7; i++) { const d = day(addDays(ws0, i));
    if (d.energy) feel.push((5 - d.energy) / 4); if (d.stress) feel.push((d.stress - 1) / 4); if (d.sleep) feel.push(d.sleep < 6 ? 1 : d.sleep < 7 ? 0.5 : 0); }
  return { n: inW.length, sets, red, down: cmp >= 6 ? down / cmp : null, fail: rirN >= 6 ? fail / rirN : null, feel: feel.length ? feel.reduce((a, b) => a + b, 0) / feel.length : null };
}
function fatigueWeeks(nWeeks = 12) {
  const ws = workouts(); const sig = ws.length + "|" + (ws[0]?.end || 0) + "|" + todayKey() + "|" + (Store.get("bilans", {}).items || []).length;
  if (FAT.cache && FAT.sig === sig && Date.now() - FAT.t < 60000) return FAT.cache; const cur = weekStartKey(todayKey()); const out = [];
  for (let i = nWeeks - 1; i >= 0; i--) { const k = addDays(cur, -7 * i); out.push(Object.assign({ week: k }, weekStats(k, ws))); }
  const med = a => { const s = a.filter(x => x > 0).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  out.forEach((w, i) => { const prev = out.slice(Math.max(0, i - 8), i); const bn = med(prev.map(p => p.n)) || 3, bs = med(prev.map(p => p.sets)) || 40;
    const parts = [[Math.min(1, Math.max(0, (w.n / bn - 1) / 0.5)), 1], [Math.min(1, Math.max(0, (w.sets / bs - 1) / 0.4)), 1.2], [Math.min(1, Math.max(0, w.red - 2) / 4), 1.3]];
    if (w.down != null) parts.push([Math.min(1, w.down / 0.45), 1.4]);
    if (w.fail != null) parts.push([Math.min(1, w.fail / 0.5), 0.8]);
    if (w.feel != null) parts.push([w.feel, 1.2]);
    w.score = w.n ? parts.reduce((s, [v, k]) => s + v * k, 0) / parts.reduce((s, [, k]) => s + k, 0) : 0;
    w.why = []; if (w.n / bn >= 1.3) w.why.push(`${w.n} séances (d'habitude ${bn})`); if (w.sets / bs >= 1.25) w.why.push(`volume +${Math.round((w.sets / bs - 1) * 100)} %`);
    if (w.red >= 3) w.why.push(`${w.red} jours avec des muscles « à reposer »`); if (w.down != null && w.down >= 0.35) w.why.push(`${Math.round(w.down * 100)} % de séries en baisse`);
    if (w.fail != null && w.fail >= 0.4) w.why.push(`${Math.round(w.fail * 100)} % de séries à l'échec`); if (w.feel != null && w.feel >= 0.55) w.why.push("ressenti fatigué (énergie, récup, sommeil)"); });
  FAT.cache = out; FAT.sig = sig; FAT.t = Date.now(); return out;
}
function deloadAdvice() {
  const P = Store.get("deload", {}) || {}; const today = todayKey();
  if (P.until && P.until >= today) return { active: true, until: P.until };
  if (P.snooze && P.snooze >= today) return null;
  const W = fatigueWeeks(); const full = W.slice(-4, -1), cur = W[W.length - 1];
  const avgN = W.slice(-6).reduce((s, w) => s + w.n, 0) / 6; if (avgN < 2) return null;
  if (P.last && daysBetweenK(P.last, today) < 35) return null;
  const high = full.filter(w => w.score >= 0.55).length, veryHigh = full.some(w => w.score >= 0.75);
  if (!(high >= 2 || (veryHigh && cur.score >= 0.55))) return null;
  const why = [...new Set(full.concat(cur).flatMap(w => w.why))].slice(0, 4);
  return { advise: true, weeks: high, why };
}
const daysBetweenK = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
function deloadCardHTML() {
  const A = deloadAdvice(); if (!A) return "";
  if (A.active) return `<div class="card" style="border:2px solid var(--fn-ok,#22c55e)"><b>🔋 Semaine de décharge en cours</b> (jusqu'au ${fmtDay(A.until)})
    <p class="sm" style="margin:6px 0">Mêmes exercices et mêmes charges, mais <b>environ moitié moins de séries</b> et 3-4 répétitions en réserve (pas d'échec). Ton corps récupère et tu repars plus fort.</p>
    <button class="ghost small" data-act="deloadStop">Arrêter la décharge</button></div>`;
  return `<div class="card" style="border:2px solid var(--fn-warn-fill,#f97316)"><b>🔋 Une semaine de décharge serait utile</b>
    <p class="sm" style="margin:6px 0">Ta fatigue s'accumule depuis ${A.weeks >= 2 ? A.weeks + " semaines" : "plusieurs semaines"} : ${A.why.map(esc).join(" · ")}.</p>
    <p class="xs mut">Décharge = 1 semaine avec ~50 % des séries, mêmes charges, sans aller à l'échec.</p>
    <div class="row" style="gap:8px"><button class="grow" data-act="deloadStart">Faire ma décharge cette semaine</button><button class="sec" data-act="deloadSnooze">Pas maintenant</button></div></div>`;
}
const isDeload = () => { const P = Store.get("deload", {}) || {}; return !!(P.until && P.until >= todayKey()); };
const FAT_ACT = {
  deloadStart: () => { const P = clone(Store.get("deload", {}) || {}); P.until = addDays(todayKey(), 6); P.last = todayKey(); P.hist = [...(P.hist || []), todayKey()]; Store.set("deload", P); toast("Décharge activée pour 7 jours"); render(); },
  deloadStop: () => { const P = clone(Store.get("deload", {}) || {}); P.until = addDays(todayKey(), -1); Store.set("deload", P); render(); },
  deloadSnooze: () => { const P = clone(Store.get("deload", {}) || {}); P.snooze = addDays(todayKey(), 6); Store.set("deload", P); toast("Je te le reproposerai dans une semaine si la fatigue reste haute"); render(); },
};
