// ===================== MINUTEUR DE REPOS + ÉCRAN ALLUMÉ =====================
// Après chaque série validée : compte à rebours flottant (durée selon l'exercice, réglable et mémorisée),
// vibration + bip à la fin. Pendant une séance, l'écran reste allumé (Wake Lock).
const COMPOUND = new Set(["squat", "bench_press", "rdl", "leg_press", "hack_squat", "hip_thrust", "pull_up", "lat_pulldown_pron", "row_neutral_close", "row_pron_wide", "incline_press_machine", "chest_press", "db_incline_press", "shoulder_press", "dips", "bulgarian", "db_row"]);
const REST = { end: 0, total: 0, exId: null, iv: null };
function restDefault(exId) {
  try { const m = JSON.parse(localStorage.getItem("muscu_rest") || "{}"); if (m[exId]) return m[exId]; } catch (e) {}
  return COMPOUND.has(exId) ? 150 : 90;
}
function restSave(exId, sec) { try { const m = JSON.parse(localStorage.getItem("muscu_rest") || "{}"); m[exId] = sec; localStorage.setItem("muscu_rest", JSON.stringify(m)); } catch (e) {} }
function restStart(exId, warmup) {
  const sec = warmup ? 60 : restDefault(exId);
  REST.exId = exId; REST.total = sec; REST.end = Date.now() + sec * 1000; REST.done = false; restTick();
  clearInterval(REST.iv); REST.iv = setInterval(restTick, 250);
}
function restStop() { clearInterval(REST.iv); REST.iv = null; REST.end = 0; const el = document.getElementById("restBar"); if (el) el.remove(); }
function restBeep() {
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
  try { const A = window.AudioContext || window.webkitAudioContext; const ctx = REST.ctx || (REST.ctx = new A());
    [0, 0.25].forEach(t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.18);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2); }); } catch (e) {}
}
function restTick() {
  if (!REST.end) return; let el = document.getElementById("restBar");
  if (!el) { el = document.createElement("div"); el.id = "restBar"; el.className = "restbar"; document.body.appendChild(el);
    el.addEventListener("click", e => { const b = e.target.closest("[data-r]"); if (!b) return; const k = b.dataset.r;
      if (k === "x") return restStop();
      const d = +k; REST.end += d * 1000; REST.total = Math.max(15, REST.total + d); if (REST.exId) restSave(REST.exId, Math.max(15, Math.round((restDefault(REST.exId) + d) / 15) * 15)); restTick(); }); }
  const left = Math.max(0, Math.round((REST.end - Date.now()) / 1000));
  if (left === 0 && !REST.done) { REST.done = true; restBeep(); setTimeout(restStop, 4000); }
  const pct = REST.total ? Math.min(100, 100 * (1 - left / REST.total)) : 100;
  el.classList.toggle("over", left === 0);
  el.innerHTML = `<div class="restfill" style="width:${pct}%"></div><div class="restin"><span>${left === 0 ? "C'est reparti 💪" : "Repos"}</span><b>${fmtDur(left * 1000)}</b>
    <button data-r="-15">−15 s</button><button data-r="15">+15 s</button><button data-r="x" aria-label="Fermer">✕</button></div>`;
}
// écran allumé pendant la séance
let WAKE = null;
async function wakeSync() {
  const want = !!(typeof liveWorkout === "function" && liveWorkout()) && document.visibilityState === "visible";
  try {
    if (want && !WAKE && navigator.wakeLock) { WAKE = await navigator.wakeLock.request("screen"); WAKE.addEventListener("release", () => { WAKE = null; }); }
    else if (!want && WAKE) { await WAKE.release(); WAKE = null; }
  } catch (e) { WAKE = null; }
}
document.addEventListener("visibilitychange", () => { wakeSync(); if (REST.end) restTick(); });

// ===================== CALCULATEUR DE DISQUES =====================
function platesFor(total, bar = 20) {
  const per = (total - bar) / 2; if (per < 0) return null; const P = [25, 20, 15, 10, 5, 2.5, 1.25]; let r = per; const out = [];
  P.forEach(p => { while (r >= p - 1e-9) { out.push(p); r = r1(r - p); } }); return { per, out, rest: r };
}
function plateHTML(total) {
  const x = platesFor(total); if (!x) return "";
  return `<div class="xs mut" style="margin-top:4px">🏋️ Par côté (barre 20 kg) : <b>${x.out.length ? x.out.join(" + ") : "rien"}</b>${x.rest ? ` <span class="mut">(+${x.rest} kg impossible)</span>` : ""}</div>`;
}
const BARBELL = new Set(["squat", "bench_press", "rdl", "hip_thrust", "shrug"]);
