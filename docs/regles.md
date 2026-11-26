# Règles de développement

## Règle n°1 : la simplicité (prioritaire sur tout)
- Peu de fonctions, mais bonnes. On n'ajoute pas tout ce qui existe ailleurs : seulement ce qui sert vraiment.
- Un écran = un but principal, 2 ou 3 actions visibles au plus ; le reste est replié (« ⋯ », « Plus », réglages avancés).
- Textes courts ; pas d'explication affichée en permanence (aide « ? » si besoin).
- Avant d'ajouter un bouton, se demander si on peut en retirer un. Chaque livraison dit ce qui a été **retiré ou replié**.
- En cas de doute, ne pas ajouter : proposer à Vuthy.

## Règle n°2 : s'inspirer des meilleures apps, à notre sauce
Avant de proposer ou de coder une fonction, regarder ce que font les meilleures apps (analyses dans le contexte privé `.private/analyses/`, voir `CLAUDE.local.md`). Dans chaque proposition : de quelle app vient l'idée, et ce qu'on améliore (plus simple, mieux relié sport ↔ nutrition).

## Règle n°3 : respect de l'utilisateur
Pas de pop-up, pas de pub, pas de pistage, jamais de rouge culpabilisant (« dépassé » en gris neutre), pas d'« IMC surpoids ». Rien de propre à Vuthy en dur dans le code : tout est un réglage (préparation du multi-comptes). Données hors ligne préservées. Clés jamais dans le code. Le dépôt est **public** : aucune donnée personnelle de Vuthy ni stratégie privée dans les fichiers commités.

## Domaines et fichiers
Chaque domaine a sa fiche dans `docs/domaines/<domaine>.md` et son sous-agent dans `.claude/agents/<domaine>.md`.

| Domaine | Fichiers possédés | Branche |
|---|---|---|
| Nutrition | `nutrition.js`, `nutri2.js`, `scanner.js` | `sec/nutrition` |
| Cuisine | `fridge.js`, `recipes.js`, `cuisine2.js`, `dishimg.js` | `sec/cuisine` |
| Muscu | `program.js`, `fatigue.js`, `body3d.js`, `anim.js`, `scene3d.js`, `extras.js`, `energy.js` | `sec/muscu` |
| Programmes | `programs2.js` (à créer) | `sec/programme` |
| Amis | `friends.js`, `dev/schema.sql` | `sec/amis` |
| Design | section « Design system » en tête de `style.css`, navigation dans `ui.js` | `sec/design-liftin` |
| Tests | `dev/demo_seed.js`, `dev/testscenarios.py`, `dev/test*.py` | — (avec chaque livraison) |

Fichiers partagés (`ui.js`, `core.js`, `actions.js`, `data.js`, `build.py`, `style.css`) : seulement de **petits points d'accroche**, protégés par `typeof f === "function"`. CSS d'un domaine ajouté **à la fin** de `style.css`, dans une section à son nom. Contrats entre domaines : voir `docs/architecture.md` (ne jamais les renommer).

## Branches, sessions et worktrees
- `main` = ce qui est en ligne. **Personne ne pousse sur `main`** sauf la Coordination, après accord de Vuthy.
- Une branche par domaine (`sec/<domaine>`), toujours mise à jour depuis `main` avant de commencer (`git fetch && git merge origin/main`).
- Pour travailler sur plusieurs domaines en même temps sur le Mac : un **worktree** par domaine (`git worktree add ../muscu-<domaine> sec/<domaine>`), une session Claude Code par worktree. Sinon, la session Coordination délègue aux **sous-agents** (`.claude/agents/`), chacun dans son worktree.
- Ne jamais supprimer une branche ni réécrire l'historique (pas de `push --force`, pas de `reset --hard` sur une branche poussée).

## Éviter les conflits
1. Chaque domaine reste dans ses fichiers.
2. CSS en fin de fichier, dans sa section.
3. Avant de livrer : fusionner `origin/main` dans sa branche et relancer les tests.
4. Seule la Coordination fusionne dans `main`, un domaine à la fois, avec `testscenarios.py` au vert après chaque fusion.
5. Si deux domaines doivent toucher la même fonction partagée : le noter dans `docs/ETAT.md` (« Dépendances ») avant de coder.

## Livrer (domaine) — voir la skill `livrer`
Compiler, lancer son test + `dev/testscenarios.py`, captures 390×844 avant/après, pousser sa branche, mettre à jour sa ligne dans `docs/ETAT.md`, rapport à Vuthy : fait / retiré ou replié / d'où vient l'idée / tests / questions. Dire « prêt à fusionner ».

## Publier (Coordination seulement) — voir la skill `publier`
Après accord de Vuthy : fusionner dans `main`, tous les tests, `build.py --pwa`, copier `dev/dist/*` à la racine, vérifier le site en ligne, ajouter une entrée dans `docs/journal.md`, mettre à jour `docs/ETAT.md`.

## Communication avec Vuthy
- En français, simple, sans jargon : il ne programme pas. Ne jamais lui demander de taper une commande.
- Compte-rendu structuré : récapitulatif chiffré, détail par élément, problèmes rencontrés.
- Toujours montrer des captures avant de publier. Prix aussi en euros.
- Ne jamais saisir de mot de passe ni de code à sa place, ne rien payer, ne rien publier sans son accord.
