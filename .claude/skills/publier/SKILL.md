---
name: publier
description: Procédure de la Coordination pour fusionner des branches de domaine dans main et publier l'app en ligne (crakizi.github.io/muscu). À utiliser seulement après un accord explicite de Vuthy (« publie »).
---
# Publier (Coordination seulement, après « publie » de Vuthy)

1. **Sauvegarde** : noter le commit actuel de `main` (`git rev-parse --short origin/main`) dans le rapport, pour pouvoir revenir en arrière.
2. **Branche d'intégration** : `git checkout -B integ-<date> origin/main`, puis fusionner les branches prêtes **une par une** (`git merge --no-edit origin/sec/<domaine>`). En cas de conflit : garder les changements des deux côtés (CSS : concaténer les sections), relancer les tests.
3. **Tests complets** : `build.py --local`, `testscenarios.py` et les tests de chaque domaine fusionné. Ne pas publier si une vérification nouvelle échoue.
4. **Montrer** à Vuthy les captures avant/après et le résultat des tests. Attendre son accord si ce n'est pas déjà fait pour ce contenu exact.
5. **Publier** : `git checkout main && git merge --no-edit integ-<date>`, puis dans `dev/` : `python3 build.py --pwa`, copier `dev/dist/*` à la racine (`index.html`, `sw.js`, `version.json`), vérifier rapidement la version racine dans un navigateur (aucune erreur JS, onglets qui s'ouvrent), commit « Publication : … », `git push origin main`.
6. **Vérifier en ligne** : après ~1 min, `curl -s https://crakizi.github.io/muscu/version.json` doit renvoyer la nouvelle version.
7. **Tracer** : ajouter une entrée datée en haut de `docs/journal.md` (domaines publiés, nouveautés, commits) et mettre `docs/ETAT.md` à jour (fonctions en ligne, lignes des domaines publiés → « en ligne », bugs).
8. **Prévenir les domaines** : les branches `sec/*` doivent fusionner `origin/main` avant leur prochaine tâche (c'est écrit dans `docs/ETAT.md`).
9. Rappeler à Vuthy de fermer puis rouvrir l'app sur l'iPhone et le Mac pour récupérer la mise à jour.
