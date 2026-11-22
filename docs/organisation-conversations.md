# Organisation : une conversation par section

_Décidé le 22 novembre 2026._

## Rôles
- **Conversation « Coordination »** : c'est la conversation principale. Elle seule fusionne les branches, lance les tests de bout en bout (`dev/testscenarios.py` + données `dev/demo_seed.js`) et publie sur `main` / crakizi.github.io/muscu, après accord de Vuthy.
- **Conversations de section** : Nutrition, Cuisine, Muscu, Programmes (cardio / brûle-graisse / abdos), Amis, Design.
- **Conversation « Test »** : vérifie chaque section prête avant la fusion (données d'exemple + tests de bout en bout + contrôle de simplicité). Elle ne publie pas. Chacune reçoit ses directives directement de Vuthy.

## Règle n°1 : la simplicité (prioritaire sur tout le reste)
- Peu de fonctions, mais bonnes. On n'ajoute pas tout ce qui existe ailleurs : seulement ce qui sert vraiment.
- Pas de mille boutons ni de mille textes à lire. Un écran a un seul but principal et au plus 2 ou 3 actions visibles ; le reste est replié (« Plus », réglages avancés).
- Textes courts. Pas d'explication affichée en permanence : une aide « ? » si besoin.
- Avant d'ajouter un bouton, se demander si on peut en retirer un. Chaque livraison dit ce qui a été **retiré ou replié**, pas seulement ce qui a été ajouté.
- En cas de doute, ne pas ajouter : proposer à Vuthy.

## Règle n°2 : s'inspirer des meilleures apps, à notre sauce
Avant de proposer ou de coder une fonction, lire ce que font les meilleures apps sur ce point, puis l'améliorer (plus simple, mieux relié sport ↔ nutrition). Dans chaque proposition, dire de quelle app vient l'idée et ce qu'on change.
- `claude/analyse-apps-detaillee.md` : fiche détaillée de 25 apps testées sur iPhone (écrans, boutons, saisie, design, prix).
- `claude/analyse-apps-iphone-en-cours.md` : leçons clés et ce qu'il faut éviter.
- `claude/synthese-demandes-utilisateurs.md` : ce que les utilisateurs demandent, détestent et acceptent de payer (forums et avis, FR + EN).
- `claude/analyse-apps-reddit.md` et `claude/analyse-fitself.md` : forums et analyse de FitSelf.
Ces documents sont dans le projet claude.ai (pas dans le dépôt public).

## Conversation « Design » (esthétique de toute l'app)
- Elle gère l'esthétique et la navigation de **l'app entière** : couleurs, typographie, espacements, icônes, composants communs (boutons, cartes, onglets, anneaux, listes), clair/sombre, cohérence entre sections, nombre d'éléments par écran.
- Elle possède le début de `style.css` (variables et composants communs, dans la section « Design system ») et la structure de navigation. Les sections réutilisent ses composants au lieu d'inventer les leurs.
- Elle propose d'abord des maquettes ou captures avant/après à Vuthy, puis code sur sa branche `sec/design`.
- Elle signale aux autres (via Vuthy ou la Coordination) les écrans trop chargés.

## Règles pour chaque conversation de section
1. Lire `claude/vision-produit.md` et la fiche de sa section (par ex. `claude/fiche-nutrition-cuisine.md`). Ne pas relire tout le code : grep d'abord, pour économiser les tokens.
2. Travailler sur **sa propre branche** `sec/<section>` du dépôt crakizi/muscu, partie de `main` à jour. **Ne jamais pousser sur `main`**, ne pas toucher `index.html` / `sw.js` à la racine.
3. Rester dans ses fichiers :

   | Section | Fichiers |
   |---|---|
   | Nutrition | `nutrition.js`, `nutri2.js` |
   | Cuisine | `fridge.js`, `recipes.js`, `cuisine2.js` |
   | Muscu | `program.js`, `fatigue.js`, `body3d.js`, `anim.js`, `scene3d.js` |
   | Programmes | nouveau fichier `programs2.js` |
   | Amis | nouveau fichier `friends.js`, `dev/schema.sql` |
   | Test | `dev/demo_seed.js`, `dev/testscenarios.py`, `dev/test*.py` |
   | Design | section « Design system » de `style.css`, navigation dans `ui.js` |

   Dans les fichiers partagés (`ui.js`, `core.js`, `actions.js`, `style.css`, `build.py`), faire seulement de petits points d'accroche. Ajouter le CSS **à la fin** de `style.css`, dans une section à son nom.
4. Contrats entre sections : `dayType`, `dayTargets`, `tDay` (Nutrition) ; `pantryList`, `pantryHas`, `pantryUse` (Cuisine). Ne pas les renommer.
5. Avant de livrer : compiler (`python3 build.py --local`), lancer son test et `dev/testscenarios.py`, prendre des captures, pousser sa branche, puis dire à Vuthy « prêt à fusionner ».
6. Chaque livraison est notée dans `claude/journal-developpement.md` par la Coordination au moment de la publication.
