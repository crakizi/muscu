// ===================== SPOTIFY (contrôle de la musique) =====================
// OAuth PKCE sans serveur. Le retour de connexion peut arriver dans un autre contexte (Safari au lieu de l'app) :
// la page de retour échange le code puis dépose les jetons dans Supabase (table spotify_link) sous un identifiant aléatoire,
// que l'app récupère. Les jetons sont ensuite gardés dans les réglages synchronisés (iPhone + Mac).
const SP = {
  scopes: "user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative",
  redirect: () => location.origin + location.pathname.replace(/index\.html$/, ""),
  clientId: () => aiSettings().spotifyClientId || (typeof BUILD_CFG !== "undefined" && BUILD_CFG.spotifyClientId) || "",
  tok: () => aiSettings().spotify || null,
  saveTok(t) { Store.set("settings", Object.assign({}, aiSettings(), { spotify: t })); },
  now: null, playlists: null, err: "", busy: false,
  b64url(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); },
  rnd(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return this.b64url(a).slice(0, n); },
  async login() {
    if (!this.clientId()) { toast("Spotify pas encore configuré"); return; }
    const verifier = this.rnd(64), link = this.rnd(32);
    const challenge = this.b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    const state = btoa(JSON.stringify({ v: verifier, l: link }));
    LS.set("sp_pending", { link, t: Date.now() });
    const u = "https://accounts.spotify.com/authorize?" + new URLSearchParams({ client_id: this.clientId(), response_type: "code", redirect_uri: this.redirect(), code_challenge_method: "S256", code_challenge: challenge, scope: this.scopes, state });
    this.pollLink(link);
    window.open(u, "_blank") || (location.href = u);
  },
  // Page de retour (?code=...) : échange le code, puis transmet les jetons à l'app via Supabase.
  async handleRedirect() {
    const q = new URLSearchParams(location.search); if (!q.get("code") || !q.get("state")) return false;
    let st; try { st = JSON.parse(atob(q.get("state"))); } catch (e) { return false; }
    document.body.innerHTML = `<div style="font:16px -apple-system,system-ui;padding:40px;text-align:center;color:#888">Connexion à Spotify…</div>`;
    try {
      const r = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code: q.get("code"), redirect_uri: this.redirect(), client_id: this.clientId(), code_verifier: st.v }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error_description || j.error || r.status);
      const t = { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + j.expires_in * 1000 };
      const c = CFG(); await fetch(c.url + "/rest/v1/spotify_link", { method: "POST", headers: { apikey: c.anon, Authorization: "Bearer " + c.anon, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ id: st.l, payload: t }) });
      document.body.innerHTML = `<div style="font:17px -apple-system,system-ui;padding:40px;text-align:center"><div style="font-size:44px">✅</div><b>Spotify est connecté.</b><p style="color:#888">Tu peux fermer cette page et revenir dans l'app.</p><a href="${this.redirect()}" style="color:#2563eb">Ouvrir l'app</a></div>`;
    } catch (e) { document.body.innerHTML = `<div style="font:16px -apple-system,system-ui;padding:40px;text-align:center">Erreur Spotify : ${esc(e.message)}<p><a href="${this.redirect()}">Revenir à l'app</a></p></div>`; }
    return true;
  },
  pollLink(link) {
    clearInterval(this._poll); const t0 = Date.now(); const c = CFG();
    this._poll = setInterval(async () => {
      if (Date.now() - t0 > 300000) { clearInterval(this._poll); return; }
      if (this.tok()) { clearInterval(this._poll); return; }
      try { const r = await fetch(c.url + "/rest/v1/rpc/take_spotify_link", { method: "POST", headers: { apikey: c.anon, Authorization: "Bearer " + c.anon, "Content-Type": "application/json" }, body: JSON.stringify({ link_id: link }) });
        const p = await r.json(); if (p && p.access) { this.saveTok(p); clearInterval(this._poll); toast("Spotify connecté 🎵"); this.refreshNow(); } } catch (e) {}
    }, 2500);
  },
  async token() {
    let t = this.tok(); if (!t) return null;
    if (Date.now() > t.exp - 60000) {
      const r = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: t.refresh, client_id: this.clientId() }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { if (j.error === "invalid_grant") { this.saveTok(null); this.err = "Reconnecte Spotify (Profil)"; } throw new Error(j.error_description || "Spotify indisponible"); }
      t = { access: j.access_token, refresh: j.refresh_token || t.refresh, exp: Date.now() + j.expires_in * 1000 }; this.saveTok(t);
    }
    return t.access;
  },
  async api(path, opts = {}) {
    const a = await this.token(); if (!a) throw new Error("Spotify non connecté");
    const r = await fetch("https://api.spotify.com/v1" + path, Object.assign({}, opts, { headers: Object.assign({ Authorization: "Bearer " + a, "Content-Type": "application/json" }, opts.headers || {}) }));
    if (r.status === 204 || r.status === 202) return null;
    const j = await r.json().catch(() => null);
    if (!r.ok) { const m = j?.error?.reason === "NO_ACTIVE_DEVICE" || r.status === 404 ? "Ouvre Spotify sur ton téléphone ou ton Mac, lance un son, puis réessaie." : j?.error?.message || "erreur " + r.status; throw new Error(m); }
    return j;
  },
  async refreshNow() {
    if (!this.tok() || !navigator.onLine) return;
    try { this.now = await this.api("/me/player?additional_types=track,episode"); this.err = ""; } catch (e) { this.err = e.message; }
    const el = $("#spBar"); if (el) el.outerHTML = spBarHTML();
  },
  async cmd(kind) {
    try {
      const playing = this.now?.is_playing;
      if (kind === "toggle") await this.api(playing ? "/me/player/pause" : "/me/player/play", { method: "PUT" });
      if (kind === "next") await this.api("/me/player/next", { method: "POST" });
      if (kind === "prev") await this.api("/me/player/previous", { method: "POST" });
      setTimeout(() => this.refreshNow(), 450);
    } catch (e) { toast(e.message); }
  },
  async playContext(uri) {
    try { let dev = null; if (!this.now?.device) { const d = await this.api("/me/player/devices"); dev = (d.devices || []).find(x => x.is_active) || (d.devices || [])[0]; if (!dev) throw new Error("Aucun appareil Spotify ouvert : ouvre Spotify sur ton téléphone ou ton Mac."); }
      await this.api("/me/player/play" + (dev ? "?device_id=" + dev.id : ""), { method: "PUT", body: JSON.stringify({ context_uri: uri }) }); toast("Lecture lancée 🎵"); setTimeout(() => this.refreshNow(), 700); }
    catch (e) { toast(e.message); }
  },
  async loadPlaylists() { try { const j = await this.api("/me/playlists?limit=50"); this.playlists = j.items || []; } catch (e) { this.playlists = []; toast(e.message); } renderSheet(); },
  start() { clearInterval(this._t); this._t = setInterval(() => { if (!document.hidden && $("#spBar")) this.refreshNow(); }, 5000); this.refreshNow(); }
};
function spBarHTML() {
  if (!SP.clientId()) return `<div id="spBar"></div>`;
  if (!SP.tok()) return `<div id="spBar" class="card row between" style="padding:10px 14px"><span class="sm">🎵 Contrôle ta musique depuis l'app</span><button class="small" style="background:#1db954" data-act="spLogin">Connecter Spotify</button></div>`;
  const n = SP.now, it = n?.item; const img = it?.album?.images?.slice(-1)[0]?.url || it?.images?.[0]?.url;
  return `<div id="spBar" class="card" style="padding:10px 12px"><div class="row" style="gap:10px">
    ${img ? `<img src="${esc(img)}" style="width:46px;height:46px;border-radius:8px;flex:none">` : `<div style="width:46px;height:46px;border-radius:8px;background:#1db954;display:flex;align-items:center;justify-content:center;flex:none">🎵</div>`}
    <div class="grow" style="min-width:0"><div class="b sm" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it ? esc(it.name) : SP.err ? esc(SP.err) : "Rien en lecture"}</div><div class="xs mut" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it ? esc((it.artists || []).map(a => a.name).join(", ") || it.show?.name || "") : ""}${n?.device ? " · " + esc(n.device.name) : ""}</div></div>
    <button class="ghost" data-act="spCmd" data-v="prev" aria-label="Précédent">⏮</button><button class="ghost" style="font-size:20px" data-act="spCmd" data-v="toggle">${n?.is_playing ? "⏸" : "▶️"}</button><button class="ghost" data-act="spCmd" data-v="next" aria-label="Suivant">⏭</button><button class="ghost small" data-act="spLists">≡</button>
  </div></div>`;
}
function spListsSheet() {
  const l = SP.playlists;
  return `<div class="row between"><h2>Mes playlists</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
    ${l === null ? `<p class="c"><span class="spin"></span></p>` : l.map(p => `<div class="entry" data-act="spPlay" data-v="${esc(p.uri)}"><div class="row" style="gap:10px">${p.images?.length ? `<img src="${esc(p.images[p.images.length - 1].url)}" style="width:44px;height:44px;border-radius:6px">` : ""}<div><div class="sm b">${esc(p.name)}</div><div class="xs mut">${p.tracks?.total ?? p.items?.total ?? ""} titres</div></div></div><span>▶️</span></div>`).join("") || `<p class="mut sm">Aucune playlist.</p>`}`;
}
Object.assign(PLATFORM_ACT, {
  spLogin: () => SP.login(),
  spCmd: el => SP.cmd(el.dataset.v),
  spLists: () => { SP.playlists = null; openSheet(spListsSheet); SP.loadPlaylists(); },
  spPlay: el => { SP.playContext(el.dataset.v); closeSheet(); },
  spLogout: () => { SP.saveTok(null); toast("Spotify déconnecté"); render(); }
});
const IS_SP_REDIRECT = !!new URLSearchParams(location.search).get("code");
if (IS_SP_REDIRECT) SP.handleRedirect();
function spBoot() { const p = LS.get("sp_pending", null); if (p && Date.now() - p.t < 300000 && !SP.tok()) SP.pollLink(p.link); SP.start(); }
