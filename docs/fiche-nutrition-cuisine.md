# Fiche section 1 — Nutrition + Cuisine (à valider par Vuthy)

_Rédigée le 22 novembre 2026. Base : `vision-produit.md`, `synthese-demandes-utilisateurs.md`, `analyse-apps-reddit.md`, `analyse-fitself.md`, rapport de tests iPhone, journal de développement._

## 1. Ce qui existe déjà (on garde, on peaufine)
- **Journal :** semaine cliquable, série 🔥, « Même chose qu'hier », « Journée oubliée ? », kcal et macros avec repères OMS/EFSA.
- **Saisie :** recherche, Open Food Facts (code-barres), IA texte et photo, favoris, portions S/M/L.
- **Objectifs :** ajustement automatique chaque lundi (façon MacroFactor), 24 micronutriments EFSA.
- **Cuisine :** Frigo 3D, plan de repas IA sur 3/5/7 jours avec liste de courses et batch cooking, idées de recettes, recettes perso en mode chef, photos des plats.

## 2. Ce qu'on reprend des meilleures apps, avec notre touche

### Nutrition
| Fonction | Modèle | Notre touche |
|---|---|---|
| Objectifs différents selon le jour | MacrosFirst (jour entraînement 2 760 kcal), FatSecret, Lose It!/Yazio (week-end) | Le type de jour se règle **tout seul** d'après la séance prévue ou faite (muscu lourde, cardio, repos, foot) |
| Restant en anneaux, couleur fixe par macro, P/G/L sur chaque ligne | MacrosFirst, Yazio, Lifesum | Jamais de rouge « dépassé » : un ton neutre |
| Objectif par repas, recalculé après chaque repas | Lifesum, Yazio | Les repas restants se rééquilibrent si on a trop ou trop peu mangé |
| Langage naturel → aliments modifiables | MacrosFirst | L'IA s'appuie sur la base (Open Food Facts + Ciqual + BEDCA), chaque ligne est corrigeable |
| Portion automatique (« combien de grammes pour 40 g de protéines ? ») | MacrosFirst | Proposée aussi dans les recettes et le plan |
| Ajout rapide en kcal ou macros seules (pizza, kebab) | FitSelf | Une estimation IA possible à partir d'une phrase |
| Repas types, reprendre hier, habituels de ce repas | FitSelf, MyFitnessPal | Les « habituels » s'apprennent tout seuls |
| Poids tendance lissé et plage de dépense | MacroFactor, Happy Scale | Le poids tendance est au centre, la pesée brute passe en second |
| Bilan hebdo expliqué, avec l'historique des décisions | Carbon, MacroFactor | Il explique aussi l'effet des séances de la semaine |
| Phases de diète avec date de fin | Carbon | Les phases (sèche, masse, maintien) changent les conseils sport |
| Note santé d'un produit scanné | Yuka | Pastille simple, sans culpabiliser |

### Cuisine
| Fonction | Modèle | Notre touche |
|---|---|---|
| Recettes classées selon ce qu'on a (« il te manque 1 ingrédient ») | Pantry, Cooklist, What To Cook | Triées aussi par **macros restantes du jour** |
| Plan de la semaine selon l'objectif + liste avec seulement ce qui manque | Forkcast, IngrediPal | Le plan suit les jours d'entraînement de la semaine |
| Coût par recette et budget de la semaine | IngrediPal, Forkcast | Budget réglable, avec un choix « moins cher » pour chaque repas |
| Liste triée par rayon, cochée → frigo rempli | Pantry, Reciplease | Prix moyens Alcampo/Mercadona plus tard |
| Batch cooking : portions restantes, consommées depuis le journal | EasyPantry | Un tap « Mangé » enlève du frigo et note dans le journal |
| Dates de péremption, alertes | Pantry | Recettes « à finir vite » mises en avant |
| Ingrédients pesés crus, étapes, conseil du coach | FitSelf | Déjà en place, à garder |

## 3. Le lien avec le sport (ce qui nous distingue)
- La séance prévue ou faite fixe l'objectif du jour. Les glucides sont plus hauts autour des grosses séances.
- Les calories des séances **ne sont pas ajoutées telles quelles**, car l'Apple Watch se trompe d'environ 28 %. La dépense vient du poids tendance et des apports. Les séances servent à répartir les calories entre les jours.
- Repas d'avant et d'après séance suggérés à l'heure de la séance prévue.
- Le bilan hebdo croise poids, apports et performances, avec une alerte si la force baisse en déficit.

## 4. Gratuit et payant
- **Gratuit :**
  - journal, code-barres, base d'aliments, objectifs par jour, poids tendance ;
  - frigo, liste de courses, recettes perso, budget simple ;
  - export des données.
- **IA (payant, à son coût) :** photo, texte et voix, plan de repas généré, recettes générées à partir du frigo, bilan hebdo rédigé, photos des plats.
- **À éviter :** roue de réduction, compte à rebours, paywall avant usage, demande de note trop tôt, IMC « surpoids » affiché à un pratiquant.

## 5. Découpage en agents (chacun travaille seul dans son dossier)
| Agent | Périmètre | Fichiers |
|---|---|---|
| **Nutrition** | Journal, saisie, objectifs par jour, poids tendance, bilan hebdo | Modules nutrition de `dev/src` |
| **Cuisine** | Frigo, recettes, plan de repas, liste de courses, budget | Modules cuisine de `dev/src` |
| **Testeur / intégrateur** | Fusion des branches, tests automatiques, vérification que tout coïncide (le frigo baisse quand on note un repas, le plan suit les objectifs, etc.), essai sur iPhone et Mac | Tous, en lecture ; il ne publie qu'après accord de Vuthy |

- **Contrat commun entre agents :** chaque agent lit les objectifs du jour via une seule fonction, et le frigo via une seule autre. Le testeur vérifie qu'aucun agent ne touche aux fichiers des autres.
- **Validation :** chaque agent livre sur sa branche avec captures d'écran. Vuthy valide, puis le testeur fusionne et publie sur crakizi.github.io/muscu.

## 6. Critères « terminé »
- Noter un repas habituel prend 2 taps au plus.
- Aucune perte de données hors ligne.
- Tests automatiques au vert.
- Rien de propre à Vuthy dans le code : tout est un réglage, pour préparer le multi-comptes.
- Captures d'écran validées par Vuthy.
