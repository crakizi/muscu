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
// ===================== GLISSER ENTRE LES SECTIONS (comme les onglets de Clash Royale) =====================
const SWIPE_TABS = ["today", "fridge", "workout", "progress", "coach", "profile"];
const SW = { on: false };
function swipeBlocked(t) {
  if (S.sheet || !SWIPE_TABS.includes(S.tab)) return true;
  for (let el = t; el && el !== document.body; el = el.parentElement) {
    if (el.id === "scene3d" || el.tagName === "CANVAS" || el.classList?.contains("navpad") || el.id === "nav") return true;
    if (/INPUT|TEXTAREA|SELECT/.test(el.tagName)) return true;
    const cs = getComputedStyle(el); if (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 4) return true;
  }
  return false;
}
function swipeGo(dir) { // dir = +1 → section de droite, -1 → section de gauche
  const i = SWIPE_TABS.indexOf(S.tab), j = i + dir; const app = $("#app");
  if (j < 0 || j >= SWIPE_TABS.length) { app.style.transition = "transform .2s"; app.style.transform = ""; return; }
  app.style.transition = "transform .16s ease-in, opacity .16s"; app.style.transform = `translateX(${-dir * 100}%)`; app.style.opacity = ".3";
  setTimeout(() => { S.tab = SWIPE_TABS[j]; S.sheet = null; window.scrollTo(0, 0); render();
    app.style.transition = "none"; app.style.transform = `translateX(${dir * 40}%)`; app.style.opacity = ".3";
    requestAnimationFrame(() => requestAnimationFrame(() => { app.style.transition = "transform .2s ease-out, opacity .2s"; app.style.transform = ""; app.style.opacity = ""; })); }, 150);
}
document.addEventListener("touchstart", e => { const tx = e.touches[0]?.clientX ?? 0; const fromEdge = tx < 28 || tx > window.innerWidth - 28;
  if (e.touches.length !== 1 || S.sheet || (!fromEdge && swipeBlocked(e.target))) { SW.on = false; return; }
  SW.on = true; SW.drag = false; SW.x = e.touches[0].clientX; SW.y = e.touches[0].clientY; SW.t = performance.now(); SW.dx = 0; }, { passive: true });
document.addEventListener("touchmove", e => { if (!SW.on) return; const dx = e.touches[0].clientX - SW.x, dy = e.touches[0].clientY - SW.y;
  if (!SW.drag) { if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { SW.on = false; return; } if (Math.abs(dx) > 14 && Math.abs(dx) > 1.3 * Math.abs(dy)) SW.drag = true; else return; }
  e.preventDefault(); const i = SWIPE_TABS.indexOf(S.tab); const edge = (dx > 0 && i === 0) || (dx < 0 && i === SWIPE_TABS.length - 1);
  SW.dx = dx; const app = $("#app"); app.classList.add("swiping"); app.style.transition = "none"; app.style.transform = `translateX(${edge ? dx * 0.2 : dx}px)`; }, { passive: false });
document.addEventListener("touchend", () => { if (!SW.on) return; SW.on = false; const app = $("#app"); app.classList.remove("swiping"); if (!SW.drag) return;
  const v = Math.abs(SW.dx) / Math.max(1, performance.now() - SW.t);
  if (Math.abs(SW.dx) > window.innerWidth * 0.22 || (v > 0.5 && Math.abs(SW.dx) > 40)) swipeGo(SW.dx < 0 ? 1 : -1);
  else { app.style.transition = "transform .2s ease-out"; app.style.transform = ""; } });
// Mac : glisser à deux doigts sur le trackpad
let wheelAcc = 0, wheelLock = 0, wheelT = 0;
document.addEventListener("wheel", e => { if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.5 || swipeBlocked(e.target)) return;
  const now = performance.now(); if (now < wheelLock) return; if (now - wheelT > 250) wheelAcc = 0; wheelT = now; wheelAcc += e.deltaX;
  if (Math.abs(wheelAcc) > 140) { wheelLock = now + 700; swipeGo(wheelAcc > 0 ? 1 : -1); wheelAcc = 0; } }, { passive: true });
