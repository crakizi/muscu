---
name: livrer
description: Procédure pour livrer le travail d'un domaine de l'app (compiler, tester, captures, pousser la branche, mettre à jour ETAT, rapport à Vuthy). À utiliser à la fin de chaque tâche de domaine.
---
# Livrer une tâche de domaine

1. **Se mettre à jour** : `git fetch origin && git merge origin/main` dans la branche du domaine. En cas de conflit hors de tes fichiers, arrête-toi et signale-le.
2. **Compiler** : dans `dev/`, copier ou lier `../vendor`, `../icons`, `../anatomy` s'ils manquent, puis `python3 build.py --local`.
3. **Tester** : lancer le test du domaine (voir `docs/architecture.md`) puis `python3 testscenarios.py`. Tout doit être vert, sauf les échecs déjà présents sur `main` (à signaler, pas à masquer). Ajouter des vérifications pour les nouvelles fonctions.
4. **Captures** : 390×844, clair (et sombre si l'écran change d'aspect), avant/après, dans `dev/shots/<domaine>/`, avec les données d'exemple (`demo_seed.js`, `demoSeed()`).
5. **Simplicité** : compter les boutons et textes visibles avant/après ; noter ce qui a été retiré ou replié.
6. **Commit** clair en français, puis `git push origin <branche>`. Jamais sur `main`. Ne pas commiter `dev/index.local.html`, `dev/dist/`, ni les dossiers copiés `dev/vendor`, `dev/icons`, `dev/anatomy`.
7. **Mettre à jour** `docs/ETAT.md` (ta ligne : statut « prêt à fusionner », dernier commit) et ta fiche `docs/domaines/<domaine>.md` (Fait, Bugs, Prochaines étapes).
8. **Rapport à Vuthy** (français simple) :
   - récapitulatif chiffré (fonctions faites, tests réussis/total) ;
   - ce qui a été fait, ce qui a été **retiré ou replié**, de quelle app vient l'idée et ce qu'on améliore ;
   - captures ;
   - problèmes rencontrés ;
   - questions qui demandent sa décision.
   Terminer par « prêt à fusionner ».
