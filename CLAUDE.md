# App muscu + nutrition de Vuthy — règles pour Claude Code

PWA en ligne sur https://crakizi.github.io/muscu (dépôt **public** `crakizi/muscu`). Réponds toujours en **français simple** : Vuthy ne programme pas, ne lui demande jamais de taper une commande.

## Source de vérité (à lire au démarrage, dans cet ordre)
1. `docs/ETAT.md` — état actuel : fonctions en ligne, tâches en cours par domaine, bugs, décisions en attente, dépendances. **Toujours à jour.**
2. `docs/journal.md` — dernières modifications importantes (les 3 premières entrées suffisent).
3. `docs/regles.md` — règles de travail, domaines, branches, conflits, livraison, publication.
4. Selon la tâche : `docs/architecture.md`, `docs/design-system.md`, `docs/domaines/<domaine>.md`, `docs/vision-produit.md`, `docs/feuille-de-route.md`, `docs/decisions.md`.
5. Contexte privé (sur le Mac de Vuthy seulement, jamais commité) : `CLAUDE.local.md` et `.private/` — profil de Vuthy, cahier des charges complet, analyses des concurrents, historique des anciennes conversations.

## Les 3 règles qui priment
1. **Simplicité** : un écran = un but, 2-3 actions visibles au plus, le reste replié ; dire ce qui a été retiré.
2. **S'inspirer des meilleures apps, à notre sauce** : dire de quelle app vient l'idée et ce qu'on améliore.
3. **Ne rien casser** : jamais de push sur `main` sans le « publie » de Vuthy ; jamais supprimer de fichier ou de branche, ni réécrire l'historique ; données hors ligne préservées ; clés et données personnelles jamais dans le dépôt public.

## Organisation
- **Coordination** = la session principale : elle reçoit les demandes de Vuthy, les répartit aux sous-agents de domaine (`.claude/agents/` : nutrition, cuisine, muscu, programmes, amis, design, testeur), vérifie, fusionne et publie (skill `publier`).
- **Domaines** = un sous-agent ou une session par domaine, sur sa branche `sec/<domaine>` (worktree conseillé pour travailler en parallèle), qui livre avec la skill `livrer`.
- Toute modification importante est tracée dans `docs/journal.md` et `docs/ETAT.md` pour que les autres sessions la voient.

## Commandes utiles
- Compiler : `cd dev && python3 build.py --local` (copier/lier `../vendor`, `../icons` dans `dev/` si absents).
- Tests : `cd dev && python3 -m http.server 8765 &` puis `python3 testscenarios.py` (Playwright + Chrome).
