const C = "muscu-1795135624";
const FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "vendor/three.min.js", "vendor/OrbitControls.js", "vendor/chart.umd.min.js", "vendor/zxing.min.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C && !k.startsWith("muscu-anatomy")).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.endsWith("version.json")) return; // Supabase, IA, Open Food Facts : réseau direct
  if (e.request.mode === "navigate") { e.respondWith(fetch(e.request, { cache: "no-store" }).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put("index.html", cp)); return r; }).catch(() => caches.match("index.html"))); return; }
  // modèle anatomique (2 Mo) : cache séparé qui survit aux mises à jour de l'app
  if (u.pathname.includes("/anatomy/")) { e.respondWith(caches.open("muscu-anatomy-1").then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })))); return; }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; })));
});
