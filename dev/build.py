import sys, base64, os, shutil, json, hashlib
target = 'pwa' if '--pwa' in sys.argv else ('local' if '--local' in sys.argv else 'claude')
src='src/'
css=open(src+'style.css').read()
plat=['platform_pwa.js','spotify.js'] if target=='pwa' else ['platform_claude.js']
js='\n'.join(open(src+f).read() for f in ['data.js','coachdata.js','core.js',*plat,'scene3d.js','body3d.js','anim.js','scanner.js','ui.js','fridge.js','nutrition.js','recipes.js','extras.js','energy.js','program.js','photos.js','bilan.js','actions.js'])
logo=base64.b64encode(open('brand/logo-180.png','rb').read()).decode()
if target=='pwa':
  cfg=json.load(open('pwa_config.json')) if os.path.exists('pwa_config.json') else {"url":"","anon":""}
  import time
  BV=str(int(time.time()))
  js='const BUILD_CFG = '+json.dumps(cfg)+';\nconst BUILD_VERSION = "'+BV+'";\n'+js.replace('https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js','vendor/zxing.min.js')
  libs='<script src="vendor/chart.umd.min.js"></script><script src="vendor/three.min.js"></script><script src="vendor/OrbitControls.js"></script>'
  head='<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/icon-180.png"><link rel="icon" href="icons/icon-192.png">'
elif target=='local':
  libs='<script src="vendor/three.min.js"></script><script src="vendor/OrbitControls.js"></script><script src="vendor/chart.umd.min.js"></script>'
  head=f'<link rel="icon" href="data:image/png;base64,{logo}">'
else:
  libs='<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script><script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script><script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>'
  head=f'<link rel="icon" href="data:image/png;base64,{logo}">'
html=f'''<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Muscu"><meta name="theme-color" content="#1d4ed8">
{head}
<title>Muscu & Nutrition</title>
<style>{css}
#app{{padding-top:calc(12px + env(safe-area-inset-top))}}</style>
{libs}
</head><body><div id="app"></div><nav class="tabs" id="nav"></nav><div id="sheet"></div>
<script>
{js}
</script></body></html>'''
open('/tmp/all.js','w').write(js)
if target=='pwa':
  d='dist'; os.makedirs(d+'/icons',exist_ok=True); os.makedirs(d+'/vendor',exist_ok=True)
  open(d+'/index.html','w').write(html)
  for f in ['three.min.js','OrbitControls.js','chart.umd.min.js','zxing.min.js']: shutil.copy('vendor/'+f, d+'/vendor/'+f)
  os.makedirs(d+'/anatomy',exist_ok=True)
  for f in ['body2.json','body2.bin','LICENSE.txt']: shutil.copy('anatomy/'+f, d+'/anatomy/'+f)
  from PIL import Image
  im=Image.open('brand/logo-1024.png').convert('RGBA')
  for s in [180,192,512]: im.resize((s,s),Image.LANCZOS).save(f'{d}/icons/icon-{s}.png')
  # icône "maskable" : logo sur fond plein
  bg=Image.new('RGBA',(512,512),(18,40,110,255)); sm=im.resize((410,410),Image.LANCZOS); bg.paste(sm,(51,51),sm); bg.save(d+'/icons/icon-maskable-512.png')
  json.dump({"name":"Muscu & Nutrition","short_name":"Muscu","start_url":"./","scope":"./","display":"standalone","background_color":"#0b1a3f","theme_color":"#1d4ed8","lang":"fr",
    "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icons/icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]},open(d+'/manifest.webmanifest','w'),ensure_ascii=False,indent=1)
  ver=BV
  json.dump({'v':BV},open(d+'/version.json','w'))
  files=['./','index.html','manifest.webmanifest','icons/icon-180.png','icons/icon-192.png','icons/icon-512.png','vendor/three.min.js','vendor/OrbitControls.js','vendor/chart.umd.min.js','vendor/zxing.min.js']
  open(d+'/sw.js','w').write(f'''const C = "muscu-{ver}";
const FILES = {json.dumps(files)};
self.addEventListener("install", e => {{ e.waitUntil(caches.open(C).then(c => c.addAll(FILES.map(f => new Request(f, {{ cache: "reload" }})))).then(() => self.skipWaiting())); }});
self.addEventListener("activate", e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C && !k.startsWith("muscu-anatomy")).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener("fetch", e => {{
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.endsWith("version.json")) return; // Supabase, IA, Open Food Facts : réseau direct
  if (e.request.mode === "navigate") {{ e.respondWith(fetch(e.request, {{ cache: "no-store" }}).then(r => {{ const cp = r.clone(); caches.open(C).then(c => c.put("index.html", cp)); return r; }}).catch(() => caches.match("index.html"))); return; }}
  // modèle anatomique (2 Mo) : cache séparé qui survit aux mises à jour de l'app
  if (u.pathname.includes("/anatomy/")) {{ e.respondWith(caches.open("muscu-anatomy-1").then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => {{ if (r.ok) c.put(e.request, r.clone()); return r; }})))); return; }}
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {{ const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }})));
}});
''')
  open(d+'/.nojekyll','w').write('')
  print('pwa built', ver)
else:
  open('index.local.html' if target=='local' else 'index.html','w').write(html); print(target,'built')
