// ===================== DÉPENSE ÉNERGÉTIQUE DES SÉRIES =====================
// Base scientifique (mesures, pas des chiffres au hasard) :
//  • Scott, Luchini, Knausenberger & Steitz 2014, Central European Journal of Sport Sciences and Medicine 8(4):53-59.
//    Coût TOTAL d'une série = aérobie pendant l'effort + anaérobie (lactate) + EPOC (récupération), mesuré par
//    calorimétrie indirecte, 22 hommes (83 kg, 180,5 cm) et 16 femmes. Le coût est une fonction linéaire du TRAVAIL :
//    travail = charge (kg) × distance verticale parcourue (m) × répétitions.
//      squat      : coût (kJ) = 14.931 + 0.0942 × travail   (r = 0.977)
//      soulevé    : coût (kJ) = 56.592 + 0.102  × travail   (r = 0.997)
//      dév. incliné: coût (kJ) = 3.21  + 0.0911 × travail   (r = 0.947)
//      shrug      : coût (kJ) = 0.0455 + 0.246  × travail   (r = 0.921)
//      mollets    : coût (kJ) = 1.945 + 0.296  × travail    (r = 0.941)
//    Répartition moyenne : 18 % aérobie pendant la série, 31 % anaérobie, 51 % EPOC.
//  • Reis et al. 2017, PLoS One 12(7):e0181311 (58 hommes, 78,7 kg) : contrôle de cohérence pour les machines et
//    l'isolation (presse, leg extension, tirage, curl, triceps) et confirmation que les jambes coûtent plus cher.
//  • Robergs et al. 2007, J Strength Cond Res 21(1):123-130 : la charge et la distance parcourue prédisent le coût
//    (le poids du corps n'entre pas dans leur équation, sauf quand c'est lui qu'on soulève).
// Modélisation (calculs, pas de nouvelles données) :
//  • chaque exercice est rattaché au mouvement mesuré le plus proche (même masse musculaire / même schéma) ;
//  • la distance de référence (pour 180,5 cm) est ajustée à ta taille ;
//  • quand le corps bouge avec la charge (squat, fentes, tractions, dips…), la partie du corps soulevée est
//    ajoutée à la charge (travail = masse du « système » × distance, méthode de McBride et al. 2009) ;
//  • 1 kcal = 4,184 kJ. Résultat = dépense NETTE due à la série (au-dessus du repos).
const EN_MODELS = {
  squat: { a: 14.931, b: 0.0942, n: "squat (Scott 2014)" }, dead: { a: 56.592, b: 0.102, n: "soulevé de terre (Scott 2014)" },
  press: { a: 3.21, b: 0.0911, n: "développé incliné (Scott 2014)" }, isoUp: { a: 0.0455, b: 0.246, n: "shrug / petits muscles du haut (Scott 2014)" },
  isoLow: { a: 1.945, b: 0.296, n: "mollets / isolation des jambes (Scott 2014)" }
};
// m = modèle, d = distance verticale (m) pour 180,5 cm, bw = part du poids du corps soulevée, k = multiplicateur de charge (2 haltères)
const EN_EX = {
  lat_raise_cable: { m: "isoUp", d: 0.4 }, lat_raise_db: { m: "isoUp", d: 0.55, k: 2 }, shoulder_press: { m: "press", d: 0.5 }, face_pull: { m: "isoUp", d: 0.4 },
  rear_delt_fly: { m: "isoUp", d: 0.4 }, tri_oh_cable: { m: "isoUp", d: 0.4 }, tri_push_uni: { m: "isoUp", d: 0.35 }, tri_push_rope: { m: "isoUp", d: 0.35 },
  dips: { m: "press", d: 0.4, bw: 0.95 }, hammer_rope: { m: "isoUp", d: 0.4 }, bayesian_curl: { m: "isoUp", d: 0.45 }, incline_db_curl: { m: "isoUp", d: 0.45, k: 2 },
  preacher_curl: { m: "isoUp", d: 0.4 }, cable_crunch: { m: "isoUp", d: 0.35 }, incline_press_machine: { m: "press", d: 0.45 }, bench_press: { m: "press", d: 0.42 },
  db_incline_press: { m: "press", d: 0.45, k: 2 }, chest_press: { m: "press", d: 0.4 }, pec_fly_machine: { m: "isoUp", d: 0.4 },
  lat_pulldown_pron: { m: "press", d: 0.55 }, pull_up: { m: "press", d: 0.55, bw: 0.95 }, row_neutral_close: { m: "press", d: 0.4 }, row_pron_wide: { m: "press", d: 0.4 },
  db_row: { m: "press", d: 0.45 }, shrug: { m: "isoUp", d: 0.115 }, squat: { m: "squat", d: 0.55, bw: 0.88 }, leg_press: { m: "squat", d: 0.35 },
  hack_squat: { m: "squat", d: 0.4, bw: 0.88 }, leg_ext: { m: "isoLow", d: 0.3 }, bulgarian: { m: "squat", d: 0.4, bw: 0.88 }, lunges: { m: "squat", d: 0.4, bw: 0.88 },
  rdl: { m: "dead", d: 0.5 }, seated_leg_curl: { m: "isoLow", d: 0.3 }, lying_leg_curl: { m: "isoLow", d: 0.3 }, hip_thrust: { m: "squat", d: 0.25, bw: 0.4 },
  adductor_machine: { m: "isoLow", d: 0.25 }, abductor_machine: { m: "isoLow", d: 0.25 }, calf_standing: { m: "isoLow", d: 0.1, bw: 1 }, calf_seated: { m: "isoLow", d: 0.08 },
  back_ext: { m: "squat", d: 0.4, bw: 0.6 }
};
function enInfo(exId) { return EN_EX[exId] || { m: "isoUp", d: 0.4 }; }
// coût net d'UNE série en kcal
function setKcal(exId, w, reps, bodyW, heightCm) {
  const I = enInfo(exId), Mo = EN_MODELS[I.m]; if (!(reps > 0)) return 0;
  const p = profile(); const bw = bodyW || latestWeight(); const h = heightCm || p.height || 176;
  const load = (+w || 0) * (I.k || 1) + (I.bw || 0) * bw;
  const dist = I.d * h / 180.5;
  const work = load * dist * reps; // kg·m, comme dans Scott 2014
  return (Mo.a + Mo.b * work) / 4.184;
}
function exKcal(exId, sets) { return (sets || []).reduce((t, s) => t + setKcal(exId, s.w, s.r), 0); }
function workoutKcal(w) { return (w.ex || []).reduce((t, e) => t + exKcal(e.id, e.sets), 0); }
// dépense brute de la séance = nette + métabolisme de repos pendant la durée
function workoutKcalGross(w) { const p = profile(); const min = ((w.end || Date.now()) - w.start) / 60000; return workoutKcal(w) + bmr(p, latestWeight()) / 1440 * Math.max(0, min); }
function energyExplainSheet() {
  const p = profile(); const bw = r1(latestWeight());
  const ex1 = r0(3 * setKcal("squat", 100, 10, 80, 176.5)), ex2 = r0(3 * setKcal("squat", 130, 6, 75, 176.5));
  return `<div class="row between"><h2>Comment j'estime les calories</h2><button class="sec small" data-act="closeSheet">Fermer</button></div>
  <p class="sm">Ce n'est pas un chiffre au hasard : je pars de <b>mesures de laboratoire</b> (calorimétrie indirecte + lactate + récupération), puis je calcule pour toi.</p>
  <div class="reco sm"><b>Mesure de base — Scott et al. 2014</b> (38 personnes) : le coût d'une série dépend linéairement du <b>travail</b> = charge × distance × répétitions.<br>
  Squat : coût = 14,9 kJ + 0,0942 × travail · Soulevé : 56,6 + 0,102 × travail · Développé : 3,2 + 0,0911 × travail · Shrug : 0,05 + 0,246 × travail · Mollets : 1,9 + 0,296 × travail.<br>
  Ça inclut la série (18 %), l'énergie anaérobie (31 %) et la « post-combustion » EPOC (51 %).</div>
  <h3>Ce que je calcule pour toi</h3><ul class="sm">
  <li>Chaque exercice est rattaché au mouvement mesuré le plus proche (même schéma, même masse musculaire).</li>
  <li>La distance parcourue est ajustée à ta taille (${p.height} cm).</li>
  <li>Quand ton corps bouge avec la charge (squat, fentes, tractions, dips, mollets debout), j'ajoute la partie de ton poids (${bw} kg) qui est soulevée.</li>
  <li>Résultat = calories <b>en plus</b> du repos. La séance affiche aussi le total « brut » (avec ton métabolisme de repos pendant la durée).</li></ul>
  <h3>Exemple</h3><p class="sm">Squat 3 × 10 à 100 kg, 80 kg de corps → <b>≈ ${ex1} kcal</b>.<br>Squat 3 × 6 à 130 kg, 75 kg de corps → <b>≈ ${ex2} kcal</b>.</p>
  <p class="xs mut">Précision : ±20-30 % (variabilité entre personnes mesurée dans ces études). Les séances proches de l'échec coûtent un peu plus (Scott & Earnest 2011).
  Contrôle de cohérence avec Reis et al. 2017 (PLoS One) pour les machines et l'isolation ; Robergs et al. 2007 (JSCR) confirme que charge et distance sont les bons prédicteurs.</p>`;
}
