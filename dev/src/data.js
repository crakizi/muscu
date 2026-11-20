// ===================== DONNÉES DE BASE =====================
// Aliments courants : valeurs moyennes pour 100 g (kcal, prot, gluc, lip, fibres). u = portion type en g
const FOODS_BASE = [
  ["Blanc de poulet (cuit)",165,31,0,3.6,0],["Blanc de poulet (cru)",110,23,0,1.5,0],["Cuisse de poulet (cuite)",210,26,0,11,0],
  ["Blanc de dinde (cuit)",135,29,0,1.5,0],["Bœuf haché 5% (cru)",121,21,0,5,0],["Bœuf haché 15% (cru)",215,18.5,0,15,0],
  ["Steak de bœuf (cuit)",200,30,0,8,0],["Filet de porc (cuit)",165,29,0,5,0],["Jambon blanc",110,20,1,3,0,30],
  ["Jamón serrano",240,30,0,13,0,20],["Chorizo",450,24,2,38,0,20],["Thon au naturel (boîte)",110,25,0,1,0,56],
  ["Thon à l'huile égoutté",190,26,0,9,0,56],["Saumon (cru)",200,20,0,13,0,125],["Sardines à l'huile égouttées",210,24,0,12,0,60],
  ["Œuf entier",145,12.5,0.7,10,0,60],["Blanc d'œuf",50,11,0.7,0.2,0,33],["Riz blanc (cru)",355,7,79,0.6,1.3],
  ["Riz blanc (cuit)",130,2.7,28,0.3,0.4],["Riz basmati (cuit)",120,3,26,0.4,0.5],["Pâtes (crues)",355,12.5,71,1.5,3],
  ["Pâtes (cuites)",155,5.5,30,0.9,1.8],["Pomme de terre (cuite)",85,2,18,0.1,1.8],["Patate douce (cuite)",90,2,20,0.1,3.3],
  ["Frites",310,3.5,40,15,3.5],["Flocons d'avoine",375,13,60,7,10,50],["Baguette / pain blanc",270,9,55,1.5,3,40],["Pain complet",245,10,42,3.5,7,35],
  ["Pain de mie",265,8,48,4,3,27],["Tortilla de blé (wrap)",310,8,52,7.5,3,40],["Lentilles (cuites)",115,9,17,0.4,8],
  ["Pois chiches (cuits)",140,7.5,19,2.5,7.5],["Haricots rouges (cuits)",125,8.5,17,0.5,6],["Quinoa (cuit)",120,4.4,21,1.9,2.8],
  ["Lait demi-écrémé",46,3.3,4.8,1.6,0,250],["Lait entier",64,3.2,4.7,3.6,0,250],["Yaourt nature",60,4,5,3,0,125],
  ["Skyr / yaourt protéiné",60,10.5,4,0.2,0,150],["Fromage blanc 0%",47,7.5,4,0.1,0,100],["Mozzarella",250,18,2,19,0,125],
  ["Emmental",380,28,0,29,0,30],["Queso fresco (Burgos)",190,12,3,14,0,60],["Whey protéine",380,78,7,5,0,30],
  ["Créatine",0,0,0,0,0,5],["Beurre",745,0.7,0.6,82,0,10],["Huile d'olive",900,0,0,100,0,10],["Beurre de cacahuète",600,25,14,50,6,15],
  ["Amandes",600,21,9,52,12,30],["Noix",690,15,7,65,6.5,30],["Banane",90,1.1,21,0.3,2.6,120],["Pomme",52,0.3,12,0.2,2.4,150],
  ["Orange",47,0.9,10,0.1,2.2,150],["Fraises",33,0.7,6,0.3,2],["Kiwi",61,1.1,12,0.5,3,75],["Myrtilles",57,0.7,12,0.3,2.4],
  ["Avocat",160,2,2,15,6.7,100],["Brocoli (cuit)",35,2.4,4,0.4,3.3],["Épinards",23,2.9,1.4,0.4,2.2],["Haricots verts",31,1.8,4.5,0.2,3.4],
  ["Tomate",18,0.9,2.9,0.2,1.2,120],["Concombre",15,0.7,2.6,0.1,0.5],["Carotte",41,0.9,7.6,0.2,2.8,80],["Courgette",17,1.2,2.2,0.3,1],
  ["Poivron",26,1,4.5,0.3,2],["Oignon",40,1.1,7.6,0.1,1.7],["Salade verte",15,1.3,1.5,0.2,1.3],["Champignons",22,3.1,0.5,0.3,1],
  ["Ratatouille",60,1.3,6,3,2],["Gazpacho",45,0.9,4.5,2.5,1,250],["Velouté / soupe de légumes",40,1,5,1.5,1.5,300],
  ["Légumes surgelés poêlés",45,2,6,1.5,3],["Sauce tomate",50,1.5,7,1.5,1.5],["Houmous",250,7,14,18,6],
  ["Pizza margherita",250,11,30,9,2],["Burger (sandwich)",260,13,28,11,1.5,220],["Kebab (sandwich)",230,12,22,10,1.5,350],
  ["Tortilla española",190,6.5,13,12.5,1,150],["Croissant",410,8,45,21,2.5,60],["Chocolat noir 70%",580,8,34,42,11,20],
  ["Coca-Cola",42,0,10.6,0,0,330],["Bière",43,0.5,3.6,0,0,330],["Jus d'orange",45,0.7,10,0.2,0.2,250],["Miel",304,0.3,82,0,0,15],
  ["Confiture",250,0.4,60,0.1,1,15],["Céréales corn flakes",375,7,84,0.9,3,40],["Galletas María",440,7,76,11,2.5,6]
].map((a,i)=>({id:"b"+i,name:a[0],per100:{kcal:a[1],p:a[2],c:a[3],f:a[4],fib:a[5]},unit:a[6]||null,src:"base"}));

// Muscles (id → nom affiché, groupe pour le volume)
const MUSCLES = {
  delt_ant:["Deltoïde – faisceau antérieur","Épaules avant"], delt_lat:["Deltoïde – faisceau moyen (latéral)","Épaules latérales"],
  delt_post:["Deltoïde – faisceau postérieur","Épaules arrière"], rot_cuff:["Coiffe des rotateurs (infra-épineux, petit rond, sous-scapulaire)","Coiffe des rotateurs"],
  pec_up:["Grand pectoral – faisceau claviculaire (haut)","Pectoraux"], pec_mid:["Grand pectoral – faisceau sternal (milieu/bas)","Pectoraux"],
  biceps_long:["Biceps – chef long","Biceps"], biceps_short:["Biceps – chef court","Biceps"], brachialis:["Brachial","Biceps"],
  brachioradialis:["Brachio-radial","Avant-bras"], forearm:["Fléchisseurs de l'avant-bras","Avant-bras"],
  triceps_long:["Triceps – chef long","Triceps"], triceps_latmed:["Triceps – chefs latéral et médial","Triceps"],
  lats:["Grand dorsal","Dos – largeur"], teres:["Grand rond","Dos – largeur"], traps_up:["Trapèze supérieur","Trapèzes"],
  traps_mid:["Trapèze moyen + rhomboïdes","Dos – épaisseur"], traps_low:["Trapèze inférieur","Dos – épaisseur"],
  erectors:["Érecteurs du rachis (lombaires)","Lombaires"], abs:["Grand droit de l'abdomen","Abdos"], obliques:["Obliques","Abdos"],
  glutes_max:["Grand fessier","Fessiers"], glutes_med:["Moyen fessier","Fessiers"], quads:["Quadriceps","Quadriceps"],
  hamstrings:["Ischio-jambiers","Ischios"], adductors:["Adducteurs","Adducteurs"], calves:["Mollets (gastrocnémiens, soléaire)","Mollets"]
};
const VOLUME_GROUPS = ["Pectoraux","Dos – largeur","Dos – épaisseur","Épaules avant","Épaules latérales","Épaules arrière","Biceps","Triceps","Avant-bras","Abdos","Quadriceps","Ischios","Fessiers","Mollets","Adducteurs","Lombaires","Trapèzes","Coiffe des rotateurs"];

// Exercices : id, nom, catégorie, principaux, secondaires, focus (clignote), note scientifique
const EX = {};
function ex(id,name,cat,prim,sec,focus,note){EX[id]={id,name,cat,prim,sec,focus:focus||prim,note:note||""};}
ex("lat_raise_cable","Élévation latérale unilatérale – poulie basse (cuff)","Épaules",["delt_lat"],["traps_up","delt_ant"],["delt_lat"],"À la poulie, la tension reste forte en bas du mouvement, là où les haltères n'en donnent presque pas.");
ex("lat_raise_db","Élévation latérale haltères","Épaules",["delt_lat"],["traps_up"],["delt_lat"]);
ex("shoulder_press","Développé épaules (machine/haltères)","Épaules",["delt_ant"],["delt_lat","triceps_latmed","triceps_long"],["delt_ant"]);
ex("face_pull","Face pull poulie","Épaules",["delt_post","traps_mid"],["rot_cuff"],["delt_post"]);
ex("rear_delt_fly","Oiseau machine (pec deck inversé) unilatéral","Épaules",["delt_post"],["traps_mid"],["delt_post"]);
ex("tri_oh_cable","Extension triceps au-dessus de la tête – dos à la poulie haute","Triceps",["triceps_long"],["triceps_latmed"],["triceps_long"],"Maeo et al. 2023 : les extensions bras au-dessus de la tête (chef long étiré) ont donné plus d'hypertrophie que les pushdowns.");
ex("tri_push_uni","Extension triceps unilatérale vers le bas – poulie haute","Triceps",["triceps_latmed"],["triceps_long"],["triceps_latmed"],"Bras le long du corps : accent sur les chefs latéral et médial. Complément logique de l'extension au-dessus de la tête.");
ex("tri_push_rope","Pushdown corde","Triceps",["triceps_latmed"],["triceps_long"],["triceps_latmed"]);
ex("dips","Dips","Triceps",["triceps_latmed","pec_mid"],["delt_ant","triceps_long"],["triceps_latmed"]);
ex("hammer_rope","Curl marteau à la corde","Biceps",["brachialis","brachioradialis"],["biceps_long","biceps_short"],["brachialis"],"Prise neutre : plus de brachial et de brachio-radial qu'un curl classique.");
ex("bayesian_curl","Curl coude derrière le corps (Bayesian) – poulie","Biceps",["biceps_long","biceps_short"],["brachialis"],["biceps_long"],"Biceps travaillé en position étirée (bonnes données sur l'hypertrophie en étirement). L'accent spécifique sur le chef long est logique mais peu prouvé directement.");
ex("incline_db_curl","Curl incliné haltères (banc)","Biceps",["biceps_long","biceps_short"],["brachialis"],["biceps_long"],"Même logique d'étirement que le Bayesian curl.");
ex("preacher_curl","Curl pupitre","Biceps",["biceps_short","biceps_long"],["brachialis"],["biceps_short"]);
ex("cable_crunch","Crunch à la poulie","Abdos",["abs"],["obliques"],["abs"]);
ex("incline_press_machine","Développé incliné machine – prise neutre","Pectoraux",["pec_up","pec_mid"],["delt_ant","triceps_latmed"],["pec_up"]);
ex("bench_press","Développé couché barre","Pectoraux",["pec_mid","pec_up"],["delt_ant","triceps_latmed","triceps_long"],["pec_mid"]);
ex("db_incline_press","Développé incliné haltères","Pectoraux",["pec_up","pec_mid"],["delt_ant","triceps_latmed"],["pec_up"]);
ex("chest_press","Chest press machine","Pectoraux",["pec_mid","pec_up"],["delt_ant","triceps_latmed"],["pec_mid"]);
ex("pec_fly_machine","Pec fly machine","Pectoraux",["pec_mid","pec_up"],["delt_ant"],["pec_mid"]);
ex("lat_pulldown_pron","Tirage vertical – prise pronation","Dos",["lats","teres"],["biceps_long","biceps_short","traps_low","delt_post"],["lats"]);
ex("pull_up","Tractions","Dos",["lats","teres"],["biceps_long","biceps_short","traps_low"],["lats"]);
ex("row_neutral_close","Tirage horizontal – prise neutre serrée","Dos",["lats","traps_mid"],["biceps_long","biceps_short","delt_post","teres"],["lats"],"Coudes près du corps : le grand dorsal fait la majorité du travail.");
ex("row_pron_wide","Tirage horizontal – pronation, coudes ouverts","Dos",["traps_mid","delt_post"],["lats","traps_low","biceps_long"],["traps_mid"],"Coudes écartés : haut du dos, trapèze moyen, rhomboïdes et arrière d'épaule.");
ex("db_row","Rowing haltère unilatéral","Dos",["lats","traps_mid"],["biceps_long","delt_post"],["lats"]);
ex("shrug","Shrugs","Dos",["traps_up"],[],["traps_up"]);
ex("squat","Squat barre","Jambes",["quads","glutes_max"],["adductors","erectors"],["quads"]);
ex("leg_press","Presse à cuisses","Jambes",["quads","glutes_max"],["adductors"],["quads"]);
ex("hack_squat","Hack squat","Jambes",["quads"],["glutes_max","adductors"],["quads"]);
ex("leg_ext","Leg extension","Jambes",["quads"],[],["quads"]);
ex("bulgarian","Fente bulgare","Jambes",["quads","glutes_max"],["adductors","glutes_med"],["glutes_max"]);
ex("lunges","Fentes","Jambes",["quads","glutes_max"],["adductors"],["quads"]);
ex("rdl","Soulevé de terre roumain","Jambes",["hamstrings","glutes_max"],["erectors","adductors"],["hamstrings"]);
ex("seated_leg_curl","Leg curl assis","Jambes",["hamstrings"],[],["hamstrings"],"Le leg curl assis (ischios étirés à la hanche) a donné plus d'hypertrophie que le couché (Maeo 2021).");
ex("lying_leg_curl","Leg curl couché","Jambes",["hamstrings"],["calves"],["hamstrings"]);
ex("hip_thrust","Hip thrust","Jambes",["glutes_max"],["hamstrings","glutes_med"],["glutes_max"]);
ex("adductor_machine","Machine adducteurs","Jambes",["adductors"],[],["adductors"]);
ex("abductor_machine","Machine abducteurs","Jambes",["glutes_med"],[],["glutes_med"]);
ex("calf_standing","Mollets debout","Jambes",["calves"],[],["calves"]);
ex("calf_seated","Mollets assis","Jambes",["calves"],[],["calves"]);
ex("back_ext","Extension lombaire (banc 45°)","Jambes",["erectors","glutes_max"],["hamstrings"],["erectors"]);

const WARMUP_UPPER = [
  ["Rotation externe – poulie, coude au corps","rot_cuff"],["Rotation interne – poulie, coude au corps","rot_cuff"],
  ["Rotation à 90° (coude 90°, paume vers le sol) – nom à confirmer","rot_cuff"],["Extension triceps vers le bas puis au-dessus de la tête","triceps_long"],
  ["Curl prise neutre","biceps_long"],["Pull-over","lats"],["Élévation latérale","delt_lat"],["Élévation frontale","delt_ant"]
];
const PROGRAM_DEFAULT = {
  "Bras":{warmup:true,ex:["lat_raise_cable","tri_oh_cable","hammer_rope","tri_push_uni","bayesian_curl","cable_crunch"]},
  "Pecs/Dos":{warmup:true,ex:["incline_press_machine","lat_pulldown_pron","pec_fly_machine","row_neutral_close","rear_delt_fly"]},
  "Jambes":{warmup:false,ex:[]},
  "Séance libre":{warmup:false,ex:[]}
};
const ALTERNATIVES = {row_neutral_close:["row_pron_wide","db_row"],row_pron_wide:["row_neutral_close"],bayesian_curl:["incline_db_curl","preacher_curl"],incline_db_curl:["bayesian_curl"],lat_pulldown_pron:["pull_up"],lat_raise_cable:["lat_raise_db"],tri_push_uni:["tri_push_rope"]};

// Repères (homme adulte) — EFSA (valeurs de référence UE) et OMS
const REFS = {
  fib:{label:"Fibres",unit:"g",min:25,src:"EFSA : 25 g/j minimum"},
  sugar:{label:"Sucres",unit:"g",maxPctKcal:10,src:"OMS : sucres libres < 10 % des kcal (ici : sucres totaux, donc indicatif)"},
  salt:{label:"Sel",unit:"g",max:5,src:"OMS : < 5 g/j"},
  satfat:{label:"Graisses saturées",unit:"g",maxPctKcal:10,src:"OMS : < 10 % des kcal"}
};
const MICRO_REFS = { // EFSA, homme 18-29 / adulte
  calcium:["Calcium","mg",950],iron:["Fer","mg",11],magnesium:["Magnésium","mg",350],potassium:["Potassium","mg",3500],
  zinc:["Zinc","mg",11],vitC:["Vitamine C","mg",110],vitD:["Vitamine D","µg",15],vitB12:["Vitamine B12","µg",4],
  folate:["Folates (B9)","µg",330],vitA:["Vitamine A","µg",750]
};
const ACTIVITIES = {"Foot":7,"Padel":6,"Course à pied":9,"Vélo":7,"Marche rapide":4.3,"Natation":7,"Autre":5};

// Portions de base (poids comestible en g), par mot-clé du nom de l'aliment
const PORTIONS = [
  [/banane/i, [["Petite", 90], ["Moyenne", 120], ["Grande", 150]]],
  [/pomme(?! de terre)/i, [["Petite", 120], ["Moyenne", 160], ["Grande", 220]]],
  [/orange/i, [["Petite", 110], ["Moyenne", 150], ["Grande", 200]]],
  [/kiwi/i, [["1 kiwi", 75]]],
  [/avocat/i, [["½ avocat", 70], ["1 avocat", 140]]],
  [/tomate/i, [["Petite", 80], ["Moyenne", 120], ["Grande", 180]]],
  [/carotte/i, [["Moyenne", 70]]],
  [/pomme de terre/i, [["Petite", 100], ["Moyenne", 150], ["Grande", 250]]],
  [/blanc d.?(œ|oe)uf/i, [["1 blanc", 33], ["2 blancs", 66]]],
  [/(œ|oe)uf/i, [["S", 43], ["M", 50], ["L", 58], ["XL", 66]]],
  [/baguette/i, [["¼ baguette", 60], ["½ baguette", 125], ["Tranche", 25]]],
  [/pain de mie/i, [["1 tranche", 27], ["2 tranches", 54]]],
  [/pain/i, [["Tranche", 35], ["2 tranches", 70]]],
  [/tortilla de bl/i, [["1 wrap", 40]]],
  [/riz.*cuit/i, [["Bol", 150], ["Assiette", 250]]],
  [/riz.*cru/i, [["Portion", 75], ["Grosse portion", 100]]],
  [/p[âa]tes.*cuit/i, [["Assiette", 250], ["Grosse assiette", 350]]],
  [/p[âa]tes.*cru/i, [["Portion", 80], ["Grosse portion", 110]]],
  [/avoine/i, [["Petit bol", 40], ["Bol", 60], ["Grand bol", 80]]],
  [/(poulet|dinde)/i, [["½ filet", 75], ["1 filet", 150], ["Grand filet", 200]]],
  [/(steak|b(œ|oe)uf)/i, [["Steak", 120], ["Gros steak", 180]]],
  [/jambon|jam[oó]n/i, [["1 tranche", 30], ["2 tranches", 60]]],
  [/thon|at[uú]n/i, [["Petite boîte égouttée", 56], ["Grande boîte égouttée", 112]]],
  [/saumon/i, [["Pavé", 125]]],
  [/skyr|prot[ée]in/i, [["1 pot", 150]]],
  [/yaourt|yogur/i, [["1 pot", 125]]],
  [/lait|leche/i, [["Verre", 250], ["Bol", 300]]],
  [/whey/i, [["1 dose", 30], ["2 doses", 60]]],
  [/huile/i, [["1 c. à café", 4], ["1 c. à soupe", 10]]],
  [/beurre de cacahu/i, [["1 c. à soupe", 15]]],
  [/beurre/i, [["Noisette", 5], ["1 c. à soupe", 12]]],
  [/chocolat/i, [["1 carré", 5], ["4 carrés", 20]]],
  [/(fromage|emmental|mozza|queso)/i, [["Portion", 30], ["Boule de mozza", 125]]],
  [/amande|noix/i, [["Poignée", 30]]],
  [/(coca|bi[eè]re|soda|cerveza)/i, [["Canette 33 cl", 330], ["Bouteille 50 cl", 500]]],
  [/jus/i, [["Verre", 200]]],
  [/(soupe|velout|gazpacho)/i, [["Bol", 250], ["Grand bol", 400]]],
  [/pizza/i, [["1 part", 110], ["½ pizza", 220], ["Pizza entière", 430]]],
  [/croissant/i, [["1 croissant", 60]]],
  [/miel|confiture/i, [["1 c. à café", 7], ["1 c. à soupe", 20]]]
];
function portionsFor(f) {
  const out = []; if (f.unit) out.push([f.src === "off" || f.src === "perso" ? "1 portion (paquet)" : "1 portion", f.unit]);
  const hit = PORTIONS.find(([re]) => re.test(f.name)); if (hit) hit[1].forEach(p => out.push(p));
  if (f.lastG) out.push(["Dernière fois", f.lastG]);
  out.push(["100 g", 100]);
  const seen = new Set(); return out.filter(([l, g]) => { const k = l + g; if (seen.has(k)) return false; seen.add(k); return true; });
}
