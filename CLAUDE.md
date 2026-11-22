# Règles pour toute session Claude qui travaille sur cette app

App PWA muscu + nutrition de Vuthy (crakizi.github.io/muscu). Réponds en français.

## À lire au démarrage
1. `docs/organisation-conversations.md` : rôles, règles de branches, fichiers de chaque section, contrats entre sections.
2. `docs/consignes.md` : ta tâche en cours (lis seulement la partie de ta section).
3. `docs/vision-produit.md` ; puis la fiche de ta section si elle existe (`docs/fiche-*.md`).
`docs/` est une copie tenue à jour par la conversation Coordination. Le cahier des charges et le journal de développement complets sont dans le projet claude.ai « Mon app Muscu et nutrition ».

## Règle n°1 : la simplicité
Peu de fonctions, mais bonnes. Un écran = un but principal, 2 ou 3 actions visibles au plus, le reste replié. Textes courts. Chaque livraison dit ce qui a été retiré ou replié. En cas de doute, ne pas ajouter : demander à Vuthy.

## Règle n°2 : s'inspirer des meilleures apps
Avant toute proposition, lire les analyses des apps concurrentes (voir `docs/organisation-conversations.md`, règle n°2) et dire de quelle app vient l'idée et ce qu'on améliore.

## Règles de travail
- Une branche par section (`sec/<section>`), partie de `main` (à jour). Jamais de push sur `main`, jamais de modification de `index.html` / `sw.js` à la racine : seule la Coordination publie, après accord de Vuthy.
- Rester dans les fichiers de sa section ; petits points d'accroche seulement dans `ui.js`, `core.js`, `actions.js`, `build.py` ; CSS ajouté en fin de `style.css` dans une section à son nom.
- Économiser les tokens : grep avant de lire, ne pas relire des fichiers entiers inutilement.
- Compiler : voir `dev/README.md` (`python3 build.py --local`). Tests de bout en bout : `dev/testscenarios.py` avec les données `dev/demo_seed.js` (jamais incluses dans l'app).
- Rien de propre à Vuthy en dur dans le code (tout en réglage) ; données hors ligne préservées (migrations douces) ; pas de pop-up ; jamais de rouge culpabilisant.
- Clés (Gemini, Pollinations, Supabase) : jamais dans le code.
- Avant de livrer : compiler, lancer son test + `testscenarios.py`, captures 390×844, pousser sa branche, dire « prêt à fusionner ».
