// ===================== OUTILS =====================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const r0 = n => Math.round(n || 0);
const r1 = n => Math.round((n || 0) * 10) / 10;
const clone = o => JSON.parse(JSON.stringify(o ?? null));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, "0");
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => dateKey(new Date());
const parseKey = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); };
const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const fmtDay = k => { const d = parseKey(k); return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`; };
const fmtDur = ms => { const s = Math.max(0, Math.round(ms / 1000)); const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)}` : `${m}:${pad(s % 60)}`; };
const NUTR_KEYS = ["kcal", "p", "c", "f", "fib", "sugar", "satfat", "salt"];

// ===================== PROFIL & OBJECTIFS =====================
const PROFILE_DEFAULT = { sex: "m", age: 26, height: 176.5, weight: 80, activity: 1.55, goal: "recomp", protPerKg: 2.0, fatPerKg: 0.9, manualKcal: null, increment: 2.5 };
const GOALS = {
  maintien: { label: "Maintien", factor: 0, rate: [-0.15, 0.15] },
  recomp: { label: "Recomposition (un peu plus sec + muscle)", factor: -0.05, rate: [-0.3, 0.05] },
  masse: { label: "Prise de masse", factor: 0.08, rate: [0.15, 0.5] },
  seche: { label: "Sèche", factor: -0.2, rate: [-1.0, -0.4] }
};
const profile = () => Object.assign({}, PROFILE_DEFAULT, Store.get("profile", {}));
const day = k => Store.get("d-" + k, null) || { entries: [], acts: [] };
const saveDay = (k, d) => Store.set("d-" + k, d);

function latestWeight() {
  const ks = Store.ids("d-").map(x => x.slice(2)).sort();
  for (let i = ks.length - 1; i >= 0; i--) { const w = Store.get("d-" + ks[i]).weight; if (w) return w; }
  return profile().weight;
}
function bmr(p, w) { return 10 * w + 6.25 * p.height - 5 * p.age + (p.sex === "f" ? -161 : 5); }

// Série de poids lissée (tendance, moyenne mobile exponentielle)
function weightSeries(days = 120) {
  const out = []; let trend = null; const end = todayKey();
  for (let i = days; i >= 0; i--) {
    const k = addDays(end, -i); const w = Store.get("d-" + k)?.weight;
    if (w) trend = trend == null ? w : trend + 0.1 * (w - trend);
    if (trend != null) out.push({ k, w: w || null, t: trend });
  }
  return out;
}
function dayTotals(k) {
  const d = day(k); const t = {}; NUTR_KEYS.forEach(n => t[n] = 0); t.micro = {};
  (d.entries || []).forEach(e => {
    NUTR_KEYS.forEach(n => t[n] += e.n?.[n] || 0);
    Object.entries(e.micro || {}).forEach(([m, v]) => t.micro[m] = (t.micro[m] || 0) + (+v || 0));
  });
  t.actKcal = (d.acts || []).reduce((s, a) => s + (a.kcal || 0), 0);
  return t;
}
// Estimation adaptative de la dépense (type MacroFactor) : apports réels vs évolution du poids
function adaptiveTDEE() {
  const end = addDays(todayKey(), -1); const N = 28; const intake = []; const pts = [];
  for (let i = N - 1; i >= 0; i--) {
    const k = addDays(end, -i); const t = dayTotals(k); const d = Store.get("d-" + k);
    if (t.kcal >= 1200 && !(d && d.incomplete)) intake.push(t.kcal);
    if (d?.weight) pts.push([N - 1 - i, d.weight]);
  }
  if (intake.length < 10 || pts.length < 4 || pts[pts.length - 1][0] - pts[0][0] < 10) return { ok: false, days: intake.length, weighs: pts.length };
  const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx); // kg/jour
  const avg = intake.reduce((a, b) => a + b, 0) / intake.length;
  return { ok: true, tdee: avg - slope * 7700, avgIntake: avg, slopeWeek: slope * 7, days: intake.length, weighs: pts.length };
}
function targets() {
  const p = profile(); const w = latestWeight();
  const formula = bmr(p, w) * p.activity;
  const ad = adaptiveTDEE();
  let tdee = formula, source = "formule (Mifflin-St Jeor × activité)";
  if (ad.ok) { tdee = Math.min(formula * 1.25, Math.max(formula * 0.75, ad.tdee)); source = `adaptative : tes apports réels et l'évolution de ton poids sur ${ad.days} j`; }
  let kcal = tdee * (1 + GOALS[p.goal].factor);
  if (ad.ok && p.autoAdjust !== false && typeof weeklyAdjust === "function") { const A = weeklyAdjust(tdee, GOALS[p.goal].factor, ad); kcal = A.kcal; source = `ajustée chaque lundi d'après tes vraies données (${ad.days} j)`; }
  if (p.manualKcal) { kcal = +p.manualKcal; source = "valeur manuelle"; }
  const prot = p.protPerKg * w, fat = Math.max(p.fatPerKg * w, kcal * 0.2 / 9);
  const carb = Math.max(0, (kcal - prot * 4 - fat * 9) / 4);
  return { kcal: r0(kcal), p: r0(prot), f: r0(fat), c: r0(carb), fib: 30, tdee: r0(tdee), formula: r0(formula), adaptive: ad, source, weight: w };
}

// ===================== ALIMENTS =====================
const myFoods = () => Store.get("foods", { items: {} }).items || {};
function allFoods() { return [...Object.values(myFoods()), ...FOODS_BASE]; }
function scaleNutr(per100, g) { const o = {}; NUTR_KEYS.forEach(k => { if (per100[k] != null) o[k] = (+per100[k] || 0) * g / 100; }); return o; }
function searchFoods(q) {
  const norm = s => s.toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const words = norm(q).split(/\s+/).filter(Boolean);
  const recents = recentFoods();
  if (!words.length) return recents.slice(0, 15);
  const seen = new Set(); const res = [];
  [...recents, ...allFoods()].forEach(f => {
    const key = f.name + "|" + (f.brand || ""); if (seen.has(key)) return;
    const hay = norm(f.name + " " + (f.brand || "") + " " + (f.barcode || ""));
    const hw = hay.split(/[^a-z0-9%]+/); if (words.every(w => hw.some(x => x.startsWith(w)))) { seen.add(key); res.push(f); }
  });
  return res.slice(0, 40);
}
function recentFoods() {
  const ks = Store.ids("d-").sort().reverse().slice(0, 21); const seen = new Set(); const out = [];
  ks.forEach(k => (Store.get(k).entries || []).slice().reverse().forEach(e => {
    if (!e.per100 || seen.has(e.name)) return; seen.add(e.name);
    out.push({ id: "r-" + e.name, name: e.name, brand: e.brand, per100: e.per100, unit: e.unit, micro100: e.micro100, src: "récent", lastG: e.g });
  }));
  return out;
}
function saveMyFood(f) {
  const doc = clone(Store.get("foods", { items: {} })); doc.items = doc.items || {};
  const id = f.barcode ? "bc" + f.barcode : (f.id && f.id.startsWith("m") ? f.id : "m" + uid());
  doc.items[id] = Object.assign({}, f, { id, src: "perso" });
  Store.set("foods", doc); return doc.items[id];
}
function makeEntry(food, g, meal) {
  const micro = {};
  if (food.micro100) Object.entries(food.micro100).forEach(([m, v]) => micro[m] = (+v || 0) * g / 100);
  return { id: uid(), meal, name: food.name, brand: food.brand || "", g: r0(g), per100: food.per100, unit: food.unit || null, micro100: food.micro100 || null, n: scaleNutr(food.per100, g), micro, src: food.src || "", t: Date.now() };
}
function defaultMeal() { return ""; } // par défaut : ajouté à la journée, sans repas (comme demandé)
const mealLabel = m => m || "Sans repas";
const MEALS = ["Petit-déj", "Déjeuner", "Collation", "Dîner"];

// ===================== SÉANCES =====================
const program = () => { const d = Store.get("program", {}); return d.only ? Object.assign({}, clone(d.templates || {}), { "Séance libre": { warmup: false, ex: [] } }) : Object.assign({}, clone(PROGRAM_DEFAULT), d.templates || {}); };
const customEx = () => Store.get("program", {}).customEx || {};
const getEx = id => EX[id] || customEx()[id] || { id, name: id, cat: "Autre", prim: [], sec: [], focus: [] };
const repRange = id => (Store.get("program", {}).ranges || {})[id] || [6, 8];
function workouts() { return Store.ids("w-").map(k => Object.assign({ _id: k }, Store.get(k))).sort((a, b) => b.start - a.start); }
const liveWorkout = () => workouts().find(w => w.live);
const workSets = e => (e.sets || []).filter(s => !s.wu && s.r > 0);
const e1rm = s => s.w * (1 + s.r / 30); // Epley
function exerciseHistory(exId, excludeId) {
  const out = [];
  workouts().forEach(w => { if (w._id === excludeId) return; (w.ex || []).forEach(e => { if (e.id === exId && workSets(e).length) out.push({ date: w.start, sets: workSets(e), wid: w._id }); }); });
  return out; // plus récent d'abord
}
function suggestion(exId, excludeId) {
  const h = exerciseHistory(exId, excludeId); const [lo, hi] = repRange(exId); const inc = profile().increment;
  if (!h.length) return { text: `Première fois : trouve une charge pour ${lo}-${hi} reps à RIR 1-2.`, w: null };
  const last = h[0].sets; const topW = Math.max(...last.map(s => s.w));
  const atTop = last.filter(s => s.w === topW);
  if (atTop.every(s => s.r >= hi)) return { text: `Toutes tes séries à ${topW} kg ont atteint ${hi} reps → monte à ${r1(topW + inc)} kg (ou le cran suivant) et vise ${lo}+ reps.`, w: r1(topW + inc), up: true };
  if (atTop.some(s => s.r < lo)) return { text: `En dessous de ${lo} reps la dernière fois : garde ${topW} kg et vise ${lo}-${hi} reps.`, w: topW };
  return { text: `Garde ${topW} kg et essaie de faire +1 rep sur chaque série (objectif ${hi} reps partout).`, w: topW };
}
function stalled(exId) {
  const h = exerciseHistory(exId); if (h.length < 4) return false;
  const best = h.map(x => Math.max(...x.sets.map(e1rm)));
  return Math.max(best[0], best[1], best[2]) <= best[3] * 1.005;
}
function weeklyVolume(daysBack = 7) {
  const since = Date.now() - daysBack * 864e5; const vol = {}; VOLUME_GROUPS.forEach(g => vol[g] = 0);
  workouts().forEach(w => {
    if (w.start < since) return;
    (w.ex || []).forEach(e => {
      const n = workSets(e).length; if (!n) return; const x = getEx(e.id);
      const prim = new Set(x.prim.map(m => MUSCLES[m]?.[1]).filter(Boolean));
      const sec = new Set(x.sec.map(m => MUSCLES[m]?.[1]).filter(g => g && !prim.has(g)));
      prim.forEach(g => vol[g] += n); sec.forEach(g => vol[g] += n * 0.5);
    });
  });
  return vol;
}

// ===================== IA (Claude via la page) =====================
async function shrinkImage(file, max = 1280) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const sc = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return await new Promise(res => c.toBlob(res, "image/jpeg", 0.85));
}
const MICRO_KEYS_TXT = "calcium (mg), iron (mg), magnesium (mg), potassium (mg), zinc (mg), vitC (mg), vitD (µg), vitB12 (µg), folate (µg), vitA (µg)";
const ITEM_SCHEMA = `{"items":[{"name":"nom en français","grams":nombre,"per100":{"kcal":n,"p":protéines g,"c":glucides g,"f":lipides g,"fib":fibres g,"sugar":sucres g,"satfat":AG saturés g,"salt":sel g},"micro100":{${MICRO_KEYS_TXT.split(", ").map(x => '"' + x.split(" ")[0] + '":n').join(",")}},"confidence":"haute|moyenne|basse"}],"note":"remarque courte en français ou vide"}`;
async function aiMealText(text) {
  return aiJSON(`Tu es un nutritionniste. L'utilisateur vit près de Madrid (supermarchés Alcampo, Mercadona, Ahorramas) et en France. Décompose ce qu'il a mangé en aliments, estime les grammes (s'il ne précise pas, prends une portion réaliste pour un homme de 80 kg) et donne les valeurs nutritionnelles POUR 100 g de chaque aliment tel que consommé (cuit si cuit). Valeurs réalistes type tables CIQUAL/BEDCA.
Repas : """${text}"""
Réponds UNIQUEMENT en JSON : ${ITEM_SCHEMA}`);
}
async function aiMealPhoto(blob, note) {
  return aiJSON(`Tu es un nutritionniste expert en estimation visuelle des portions. Identifie chaque aliment de la photo, estime son poids en grammes (utilise assiette, couverts, emballages comme échelle), et donne les valeurs POUR 100 g de chaque aliment tel que présenté (huile de cuisson comprise si visible). Contexte : homme en Espagne/France.${note ? " Précision de l'utilisateur : " + note : ""}
Réponds UNIQUEMENT en JSON : ${ITEM_SCHEMA}`, [blob]);
}
async function aiLabel(blob) {
  return aiJSON(`Lis l'étiquette nutritionnelle de ce produit alimentaire (espagnol ou français). Donne les valeurs POUR 100 g (ou 100 ml) exactement comme écrites ("valor energético" en kcal, "grasas", "saturadas", "hidratos de carbono", "azúcares", "fibra", "proteínas", "sal"). Si une valeur n'est pas écrite, mets null. Lis aussi le nom, la marque et les chiffres du code-barres s'ils sont visibles, et la portion conseillée en g si indiquée.
Réponds UNIQUEMENT en JSON : {"name":"","brand":"","barcode":"chiffres ou vide","servingG":nombre ou null,"per100":{"kcal":n,"p":n,"c":n,"f":n,"fib":n,"sugar":n,"satfat":n,"salt":n}}`, [blob]);
}
async function aiBarcodeDigits(blob) {
  return aiJSON(`Lis les chiffres imprimés sous le code-barres (EAN-13 ou EAN-8) sur cette photo. Réponds UNIQUEMENT en JSON : {"barcode":"chiffres ou vide"}`, [blob], "quick");
}
const USER_CTX = () => { const p = profile(); const t = targets(); return `Profil : homme ${p.age} ans, ${p.height} cm, ${r1(t.weight)} kg, muscu depuis 7 ans (3-6 séances/sem, split Bras / Pecs-Dos / Jambes, 3×6-8 lourd, foot ou padel 1×/sem). Objectif : ${GOALS[p.goal].label}. Cibles du jour : ${t.kcal} kcal, P ${t.p} g, G ${t.c} g, L ${t.f} g. N'aime pas les fruits de mer ni le poisson (sauf thon, saumon, sardine de temps en temps). Trouve les légumes pénibles à cuisiner : privilégie soupes, veloutés, ratatouille, légumes mixés dans les sauces, surgelés poêlés. Fait ses courses chez Alcampo, Mercadona, Ahorramas (Villanueva de la Cañada, Madrid). Prend whey, créatine, vitamines/oméga-3. Matériel de cuisine : four, micro-ondes, plaques avec poêle et casserole, grille-pain, cuiseur à riz (PAS d'airfryer) : n'utilise que ce matériel.`; };
