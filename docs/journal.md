# Journal des changements

_Les entrées les plus récentes en haut. Chaque publication (Coordination) et chaque changement important d'organisation ajoute une entrée. Les sessions lisent les 3 premières au démarrage. L'historique détaillé V1 → V1.8 (17-21/11) est dans le contexte privé `.private/projet/journal-developpement.md`._

## 26/11/2026 — Migration vers Claude Code
- Organisation : `CLAUDE.md` réécrit ; source de vérité dans `docs/` (ETAT, architecture, règles, design system, décisions, feuille de route, journal, fiches par domaine) ; sous-agents `.claude/agents/` (nutrition, cuisine, muscu, programmes, amis, design, testeur) ; skills `.claude/skills/livrer` et `publier`.
- Anciennes règles des conversations claude.ai déplacées dans `docs/archive/`.
- Contexte privé (profil de Vuthy, cahier des charges complet, analyses des concurrents, historique des conversations) dans `.private/` et `CLAUDE.local.md`, ignorés par git.
- Sauvegarde complète avant migration (bundle de toutes les branches) sur le Mac.
- Branche `sec/design-liftin` (design façon Liftin') créée le 26/11, non publiée.

## 22/11/2026 — Publication lots 1 + 2 (`d7b808a`)
- **Nutrition** : type de jour automatique (muscu / cardio / sport / repos, d'après la séance faite puis prévue) et objectifs selon le jour (±10 % glucides, moyenne hebdo conservée) ; anneaux « restant » sans rouge ; objectif par repas ; portion automatique ; ajout rapide ; poids tendance lissé ; écran Aujourd'hui épuré (29 → 19 contrôles) avec menu « ⋯ » ; bilan de la semaine en 3 lignes.
- **Cuisine** : une seule navigation Frigo · Recettes · Plan · Courses ; « À finir vite » ; recettes « avec ce que j'ai » ; courses avec seulement le manquant, par rayon ; budget ; batch cooking (préparer retire du frigo, « Mangé » au jour affiché) ; « Copier hier » retire du frigo.
- **Muscu** : base `EX_DB` (40 exercices, 133 variantes poids libre / machine / poulie), photos free-exercise-db, fiche exercice allégée, série notée en 1 tap.
- **IA** : suggestions basées sur les objectifs du jour (`tDay`).
- **Tests** : `demo_seed.js` + `testscenarios.py` (76 vérifications), `testnut2.py`, `testcuisine.py`, `testmuscu.py`.
- Docs : `CLAUDE.md` (règles 1 et 2), `docs/` (vision, organisation, consignes, fiches).

## 17-21/11/2026 — V1 à V1.8
Voir `.private/projet/journal-developpement.md` (résumé : PWA hors ligne, synchro Supabase, IA Gemini, salle 3D UAX, corps 3D et mannequin animé, calories par série, séance fantôme, générateur de programme, frigo 3D, plan de repas, recettes chef, bilan hebdo, photos de physique, photos de plats Pollinations, app Mac).
