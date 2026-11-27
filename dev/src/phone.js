// ===================== FORMAT TÉLÉPHONE (section Design) =====================
// Sur un grand écran (Mac, navigateur d'ordinateur, iPad), l'app s'affiche dans un iPhone simulé (390 × 844) :
// la page devient un simple « support » qui contient un cadre (iframe) où tourne la vraie app (?inphone=1).
// Le support ne lance PAS l'app (pas de synchro, pas de données) : il n'y a qu'une seule app qui tourne.
// Jamais de cadre : sur un téléphone, dans l'app iPhone (pont Santé), dans un cadre, avec ?ds (page d'aperçu),
// au retour de connexion Spotify (?code=), ou avec ?nophone=1 (« Ouvrir en grand »).
const PHONE = (() => {
  const q = new URLSearchParams(location.search);
  const inPhone = q.has("inphone");
  let top = true; try { top = window.top === window.self; } catch (e) { top = false; }
  const native = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.health);
  const host = !inPhone && top && !native && !q.has("ds") && !q.has("nophone") && !q.get("code") && Math.min(innerWidth, screen.width || innerWidth) >= 700;
  return { inPhone, host };
})();

// Appelée au démarrage (actions.js). Renvoie true si la page est le support (l'app ne démarre pas ici).
function phoneBoot() {
  const h = document.documentElement;
  if (PHONE.inPhone) { h.classList.add("in-phone"); phoneStatusBar(); return false; }
  if (!PHONE.host) return false;
  h.classList.add("phone-host");
  const dark = () => { const p = typeof themePref === "function" ? themePref() : "clair"; return p === "sombre" || (p === "auto" && matchMedia("(prefers-color-scheme: dark)").matches); };
  const paint = () => h.classList.toggle("dark", dark());
  paint(); addEventListener("storage", e => { if (e.key === "muscu_theme") paint(); }); // le thème choisi dans l'app suit
  const src = location.pathname + "?inphone=1" + location.hash;
  document.body.innerHTML = `<div class="phone-stage"><div class="phone" id="phone"><iframe src="${src}" title="Muscu & Nutrition" allow="camera; microphone; clipboard-read; clipboard-write; fullscreen; screen-wake-lock"></iframe>
    <i class="phone-island"></i><i class="phone-home"></i></div><a class="phone-out" href="${location.pathname}?nophone=1">Ouvrir en grand</a></div>`;
  const fit = () => { const s = Math.min(1, (innerHeight - 56) / 868, (innerWidth - 32) / 414); document.getElementById("phone").style.zoom = s.toFixed(3); };
  fit(); addEventListener("resize", fit);
  return true;
}

// Barre d'état façon iPhone (heure + icônes), dans l'app quand elle tourne dans le cadre
function phoneStatusBar() {
  const el = document.createElement("div"); el.className = "phone-status"; el.setAttribute("aria-hidden", "true");
  const icons = `<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.2 6.6a6.8 6.8 0 0 1 9.6 0l-1.4 1.4a4.8 4.8 0 0 0-6.8 0zM.8 4.2a10.2 10.2 0 0 1 14.4 0L13.8 5.6a8.2 8.2 0 0 0-11.6 0z"/></svg>
    <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="22" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="9" rx="2"/><path d="M24 4.5v4a2 2 0 0 0 0-4z" opacity=".4"/></svg>`;
  const tick = () => { const d = new Date(); el.innerHTML = `<b>${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}</b><span>${icons}</span>`; };
  tick(); setInterval(tick, 20000);
  document.body.appendChild(el);
}
