// ===================== JEU DE DONNÉES D'EXEMPLE (tests uniquement) =====================
// Injecté par dev/testscenarios.py (page.add_script_tag) puis demoSeed(). N'est PAS dans la liste de build.py :
// il n'est jamais inclus dans l'app publiée. Toutes les dates sont relatives à aujourd'hui.
// Profil : homme 26 ans, 177 cm, 80 kg, recomposition. Semaine type : lun. Bras, mar. Pecs/Dos, jeu. Jambes, sam. foot.
(function () {
  let seed = 42; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // aléatoire reproductible
  const P = (kcal, p, c, f, fib = 0, sugar = 0, satfat = 0, salt = 0) => ({ kcal, p, c, f, fib, sugar, satfat, salt });
  const F = {
    avoine: ["Flocons d'avoine", P(372, 13.5, 58.7, 7, 10, 1, 1.2, 0)], whey: ["Whey protéine", P(380, 78, 6, 5, 0, 4, 2.5, 0.5)],
    banane: ["Banane", P(90, 1.1, 20, 0.3, 2.6, 17, 0.1, 0)], lait: ["Lait demi-écrémé", P(46, 3.3, 4.8, 1.6, 0, 4.8, 1, 0.1)],
    oeufs: ["Œufs", P(140, 12.5, 0.7, 9.8, 0, 0.7, 2.7, 0.3)], pain: ["Pain complet", P(247, 9, 41, 3.4, 7, 4, 0.7, 1.1)],
    skyr: ["Skyr nature", P(60, 10, 4, 0.2, 0, 4, 0.1, 0.1)], granola: ["Granola", P(450, 9, 62, 17, 7, 20, 3, 0.3)],
    poulet: ["Blanc de poulet (cuit)", P(165, 31, 0, 3.6)], riz: ["Riz basmati (cuit)", P(130, 2.7, 28, 0.3, 0.4)],
    brocoli: ["Brocoli (cuit)", P(35, 2.4, 4, 0.4, 3.3, 1.4, 0.1, 0)], pates: ["Pâtes (cuites)", P(150, 5.5, 30, 0.9, 1.8)],
    boeuf: ["Bœuf haché 5% (cuit)", P(170, 27, 0, 7, 0, 0, 3, 0.2)], tomate: ["Sauce tomate", P(45, 1.5, 7, 1.2, 1.5, 5, 0.2, 0.9)],
    lentilles: ["Lentilles (cuites)", P(116, 9, 20, 0.4, 7.9, 1.8, 0.1, 0)], chorizo: ["Chorizo", P(450, 24, 2, 38, 0, 1, 14, 3.5)],
    saumon: ["Saumon (cuit)", P(206, 22, 0, 13, 0, 0, 3, 0.1)], patate: ["Patate douce (cuite)", P(90, 2, 21, 0.1, 3.3, 6.5, 0, 0.1)],
    yaourt: ["Yaourt grec", P(97, 9, 4, 5, 0, 4, 3.3, 0.1)], amandes: ["Amandes", P(580, 21, 9, 50, 12, 4, 3.8, 0)],
    barre: ["Barre protéinée", P(360, 33, 35, 12, 8, 3, 5, 0.6)], pizza: ["Pizza jambon fromage", P(250, 11, 30, 9, 2, 3, 4, 1.3)],
    thon: ["Thon au naturel (boîte)", P(110, 25, 0, 1)], salade: ["Salade verte", P(15, 1.3, 1.5, 0.2, 1.3, 0.8, 0, 0)],
    huile: ["Huile d'olive", P(900, 0, 0, 100, 0, 0, 14, 0)], pomme: ["Pomme", P(53, 0.3, 12, 0.2, 2.4, 10, 0, 0)],
    tortilla: ["Tortilla de patatas", P(190, 6.5, 15, 11, 1.5, 1, 2, 0.8)], jambon: ["Jamón serrano", P(240, 30, 0, 13, 0, 0, 4.5, 4)]
  };
  const it = (k, g) => ({ name: F[k][0], per100: F[k][1], g });
  const MENUS = {
    "Petit-déj": [[it("avoine", 80), it("whey", 30), it("banane", 120), it("lait", 250)], [it("oeufs", 150), it("pain", 80), it("jambon", 30)], [it("skyr", 300), it("granola", 50), it("banane", 120)]],
    "Déjeuner": [[it("poulet", 180), it("riz", 250), it("brocoli", 150), it("huile", 10)], [it("pates", 300), it("boeuf", 150), it("tomate", 120)], [it("lentilles", 300), it("chorizo", 40), it("pain", 50)], [it("poulet", 200), it("patate", 250), it("salade", 80), it("huile", 10)]],
    "Collation": [[it("yaourt", 170), it("amandes", 25)], [it("barre", 60), it("pomme", 150)], [it("skyr", 150), it("banane", 120)]],
    "Dîner": [[it("oeufs", 180), it("pain", 60), it("salade", 80), it("huile", 8)], [it("saumon", 150), it("patate", 250), it("brocoli", 120)], [it("thon", 120), it("riz", 200), it("tomate", 80)], [it("tortilla", 250), it("salade", 80), it("huile", 8)]]
  };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const T0 = (k, h, m) => { const d = parseKey(k); d.setHours(h, m || 0, 0, 0); return d.getTime(); };
  const SPLIT = {
    0: ["Bras", [["lat_raise_cable", 7.5], ["tri_oh_cable", 22.5], ["hammer_rope", 25], ["tri_push_uni", 12.5], ["bayesian_curl", 12.5], ["cable_crunch", 40]]],
    1: ["Pecs/Dos", [["incline_press_machine", 60], ["lat_pulldown_pron", 65], ["pec_fly_machine", 55], ["row_neutral_close", 65], ["rear_delt_fly", 30]]],
    3: ["Jambes", [["squat", 100], ["leg_press", 180], ["rdl", 90], ["seated_leg_curl", 50], ["leg_ext", 55], ["calf_standing", 80]]]
  };
  // progression sur 4 semaines : reps qui montent puis +2,5 kg (cf. suggestion() : 6-8 reps)
  const PROG = [[0, [7, 6, 6]], [0, [8, 7, 7]], [0, [8, 8, 8]], [2.5, [7, 7, 6]]];
  const COMPOUND_WU = new Set(["incline_press_machine", "lat_pulldown_pron", "squat", "leg_press", "rdl", "row_neutral_close"]);

  window.DEMO = { foods: F, skipped: [], forgotten: [], incomplete: [], footDays: [], gymDays: [] };
  window.demoSeed = function () {
    const t = todayKey(); const docs = {}; seed = 42; Object.assign(DEMO, { skipped: [], forgotten: [], incomplete: [], footDays: [], gymDays: [] });
    docs.profile = { sex: "m", age: 26, height: 177, weight: 80, activity: 1.55, goal: "recomp", protPerKg: 2.0, fatPerKg: 0.9, manualKcal: null, increment: 2.5 };
    docs.program = { templates: { "Jambes": { warmup: false, ex: SPLIT[3][1].map(x => x[0]) } }, ranges: {}, banned: [] };
    // ---- 28 jours passés ----
    for (let i = 28; i >= 1; i--) {
      const k = addDays(t, -i); const wd = (parseKey(k).getDay() + 6) % 7; const wk = Math.min(3, Math.floor((28 - i) / 7));
      const d = { entries: [], acts: [] };
      const forgotten = i === 9 || i === 17; const incomplete = i === 12;
      if (forgotten) DEMO.forgotten.push(k);
      if (!forgotten) MEALS.forEach(meal => {
        if (incomplete && meal !== "Petit-déj") return; if (meal === "Collation" && rnd() < 0.3) return;
        let menu = pick(MENUS[meal]); if (meal === "Dîner" && wd >= 5 && rnd() < 0.5) menu = [it("pizza", 350)];
        menu.forEach(x => { const g = Math.round(x.g * (1.15 + rnd() * 0.3) / 5) * 5; const e = makeEntry({ name: x.name, per100: x.per100 }, g, meal); e.t = T0(k, { "Petit-déj": 8, "Déjeuner": 14, "Collation": 17, "Dîner": 21 }[meal], 15); d.entries.push(e); });
      });
      if (incomplete) { d.incomplete = true; DEMO.incomplete.push(k); }
      if (rnd() < 0.85) d.weight = Math.round((80.6 - (28 - i) * 0.03 + (rnd() - 0.5) * 0.9) * 10) / 10;
      if (wd === 5) { d.acts.push({ type: "Foot", min: 90, kcal: Math.round(7 * 80 * 1.5 * 0.85) }); DEMO.footDays.push(k); }
      docs["d-" + k] = d;
      const S0 = SPLIT[wd]; if (!S0) continue;
      if (wd === 3 && i >= 8 && i <= 14) { DEMO.skipped.push(k); continue; } // une séance jambes sautée (il y a 2 semaines)
      const [inc, reps] = PROG[wk]; let ts = T0(k, 18, 30); const start = ts;
      const ex = S0[1].map(([id, w0]) => {
        const w = Math.round((w0 + inc * (w0 >= 40 ? 2 : 1)) * 10) / 10; const sets = [];
        if (COMPOUND_WU.has(id)) { sets.push({ w: Math.round(w * 0.5 / 2.5) * 2.5, r: 8, rir: null, wu: true, t: ts }); ts += 90e3; }
        reps.forEach((r, j) => { sets.push({ w, r, rir: j === reps.length - 1 ? (rnd() < 0.5 ? 1 : 2) : (rnd() < 0.4 ? 2 : null), wu: false, t: ts }); ts += 150e3 + Math.round(rnd() * 30e3); });
        ts += 60e3; return { id, sets };
      });
      docs["w-" + start] = { live: false, name: S0[0], start, end: ts, ex, warm: {}, notes: wk === 3 && wd === 0 ? "Bonnes sensations, coude OK" : "" };
      DEMO.gymDays.push(k);
    }
    // ---- aujourd'hui : petit-déj noté + pesée ----
    docs["d-" + t] = { entries: MENUS["Petit-déj"][0].map(x => makeEntry({ name: x.name, per100: x.per100 }, x.g, "Petit-déj")), acts: [], weight: 79.4 };
    // ---- frigo (~20 articles, 3 qui périment bientôt) ----
    const fr = (name, qty, unit, zone, cat, exp, gPerPc) => Object.assign({ id: "f" + name.replace(/\W+/g, "").slice(0, 10).toLowerCase(), name, qty, unit, zone, cat, added: Date.now() - 3 * 864e5 }, exp != null ? { exp: addDays(t, exp) } : {}, gPerPc ? { gPerPc } : {});
    docs.fridge = { items: [
      fr("blanc de poulet", 600, "g", "frigo", "viande", 1), fr("yaourt grec", 3, "pc", "frigo", "laitier", 2, 170), fr("épinards frais", 200, "g", "frigo", "legume", 0),
      fr("œufs", 10, "pc", "frigo", "oeufs", 12, 60), fr("lait demi-écrémé", 1500, "g", "frigo", "laitier", 6), fr("skyr nature", 4, "pc", "frigo", "laitier", 9, 150),
      fr("bœuf haché 5%", 500, "g", "frigo", "viande", 4), fr("jamón serrano", 150, "g", "frigo", "viande", 15), fr("emmental râpé", 200, "g", "frigo", "fromage", 20),
      fr("brocoli", 400, "g", "frigo", "legume", 5), fr("tomates", 4, "pc", "frigo", "legume", 6, 120), fr("pommes", 5, "pc", "frigo", "fruit", 14, 150),
      fr("bananes", 4, "pc", "placard", "fruit", 4, 120), fr("riz basmati", 1500, "g", "placard", "feculent"), fr("pâtes", 1000, "g", "placard", "feculent"),
      fr("flocons d'avoine", 800, "g", "placard", "feculent"), fr("lentilles", 500, "g", "placard", "feculent"), fr("sauce tomate", 2, "pc", "placard", "sauce", 60, 400),
      fr("thon au naturel", 3, "pc", "placard", "poisson", 300, 80), fr("haricots verts surgelés", 1000, "g", "congel", "surgele", 120), fr("saumon surgelé", 2, "pc", "congel", "surgele", 90, 125)
    ] };
    // ---- 5 recettes perso ----
    const ri = (name, g, k) => ({ name, g, per100: F[k][1] });
    docs.recipes = { items: [
      { id: "rDemo1", name: "Poulet riz brocoli", portions: 3, ings: [ri("blanc de poulet", 500, "poulet"), ri("riz basmati", 250, "riz"), ri("brocoli", 300, "brocoli")] },
      { id: "rDemo2", name: "Bolognaise maison", portions: 4, ings: [ri("bœuf haché 5%", 500, "boeuf"), ri("pâtes", 400, "pates"), ri("sauce tomate", 400, "tomate"), ri("oignon", 100, "salade")] },
      { id: "rDemo3", name: "Omelette épinards emmental", portions: 1, ings: [ri("œufs", 180, "oeufs"), ri("épinards frais", 100, "salade"), ri("emmental râpé", 30, "chorizo")] },
      { id: "rDemo4", name: "Lentilles chorizo", portions: 3, ings: [ri("lentilles", 300, "lentilles"), ri("chorizo", 120, "chorizo"), ri("carottes", 200, "salade"), ri("oignon", 100, "salade")] },
      { id: "rDemo5", name: "Overnight oats skyr", portions: 1, ings: [ri("flocons d'avoine", 80, "avoine"), ri("skyr nature", 150, "skyr"), ri("bananes", 120, "banane")] }
    ] };
    // ---- 2 préparations batch ----
    docs.batch = { items: [
      { id: "bDemo1", name: "Chili con carne", portions: 5, left: 3, portionG: 400, per: { kcal: 560, p: 42, c: 55, f: 16 }, date: addDays(t, -2), recipeId: null },
      { id: "bDemo2", name: "Poulet curry riz", portions: 4, left: 4, portionG: 380, per: { kcal: 610, p: 48, c: 70, f: 13 }, date: addDays(t, -1), recipeId: "rDemo1" }
    ] };
    // ---- prix moyens (~10 aliments) + budget ----
    const pr = {}; [["blanc de poulet", 7.5, "kg"], ["riz basmati", 2.2, "kg"], ["brocoli", 2.5, "kg"], ["bœuf haché 5%", 9.9, "kg"], ["pâtes", 1.3, "kg"], ["œufs", 0.25, "pc"],
      ["skyr nature", 0.9, "pc"], ["chorizo", 11, "kg"], ["lentilles", 2, "kg"], ["oignon", 1.6, "kg"], ["carottes", 1.2, "kg"]].forEach(([n, v, u]) => pr[normN(n)] = { name: n, price: v, per: u });
    docs.prices = { items: pr, week: 60 };
    docs.shoplist = { items: [], log: [] };
    // ---- plan de repas existant (format de nutrition.js) ----
    docs.mealplan = { created: Date.now() - 2 * 864e5, opt: { days: 2, meals: 2, batch: true, time: 30, likes: "" }, days: [
      { day: "Lundi", meals: [{ meal: "Déjeuner", name: "Poulet riz brocoli", kcal: 650, p: 52, c: 78, f: 12, ingredients: [{ name: "blanc de poulet", g: 180 }, { name: "riz basmati", g: 90 }, { name: "brocoli", g: 150 }] },
        { meal: "Dîner", name: "Omelette épinards", kcal: 480, p: 32, c: 10, f: 34, ingredients: [{ name: "œufs", g: 180 }, { name: "épinards frais", g: 100 }] }] },
      { day: "Mardi", meals: [{ meal: "Déjeuner", name: "Bolognaise", kcal: 720, p: 45, c: 90, f: 18, ingredients: [{ name: "bœuf haché 5%", g: 150 }, { name: "pâtes", g: 110 }, { name: "courgette", g: 150 }] },
        { meal: "Dîner", name: "Saumon patate douce", kcal: 620, p: 38, c: 55, f: 24, ingredients: [{ name: "saumon", g: 150 }, { name: "patate douce", g: 250 }] }] }
    ], shopping: [] };
    docs.checkinSeen = { week: weekKey() };
    Object.entries(docs).forEach(([k, v]) => Store.set(k, v));
    try { localStorage.setItem("muscu_onb_hide", "1"); } catch (e) {}
    return Object.keys(docs).length;
  };
})();
