> **État au 26/11/2026** : proposition faite, **aucun code**, en attente de la validation de Vuthy. Fiche à tenir à jour par le domaine à chaque livraison (sections Fonctionnalités, Bugs, État, Prochaines étapes). Source : historique de la conversation claude.ai d'origine, lue en entier le 26/11.

# Contexte — section Programmes (hors musculation)

Source : conversation claude.ai « Programme » (3aebf090-f41b-4ca8-854f-1de552e0e9ea), 4 tours, lue en entier. Dernière mise à jour de la conversation : 22/11/2026 (les messages ne sont pas datés un par un).

## 1. Rôle et périmètre
- Section « Programmes » hors musculation : brûle-graisse, cardio, « camp », abdos.
- Fichier possédé : `dev/src/programs2.js` (n'existait pas encore ; à créer dans `dev/src/` et à ajouter à la liste des fichiers de `dev/build.py` par une petite accroche).
- Fichiers partagés (`ui.js`, `core.js`, `actions.js`, `style.css`) : accroches légères seulement ; CSS en fin de `style.css` dans une section « Programmes ».
- Contrats partagés à ne pas renommer : `dayType`, `dayTargets`, `tDay`, `pantry*`.
- Contrat clé : une séance faite doit compter comme **jour cardio** (`dayType`) pour la Nutrition. Claude a constaté que si la séance est enregistrée comme activité du jour (`acts`), la Nutrition la classe déjà automatiquement en jour cardio (fonction `actType` dans `nutri2.js`) : rien à modifier chez Nutrition.
- Aucune fiche de section « Programmes » n'existe dans le projet (seule `fiche-nutrition-cuisine.md`). Claude a proposé de la rédiger avec Vuthy ; pas de réponse.

## 2. Fonctionnalités développées
- Aucune. Branche créée et poussée, sans modification.

## 3. Décisions validées par Vuthy
- Consigne de Vuthy (lot 1) : « Propose-moi d'abord une liste courte de programmes (5 au maximum), et comment on les suit (minuteur, intervalles), en t'inspirant des meilleures apps. Après ma validation, code dans `programs2.js`. Une séance faite doit compter comme jour cardio (`dayType`) pour la nutrition. »
- **Aucune validation de la proposition** : la conversation s'arrête sur la question de Claude.

## 4. Idées retenues / abandonnées
Proposition de Claude (NON validée par Vuthy) :
| # | Programme | Format | Durée | Où | Inspiré de |
|---|---|---|---|---|---|
| 1 | Cardio zone 2 | Effort continu facile | 30-45 min | Tapis, escalier, vélo, dehors | Apple Fitness, Zones |
| 2 | HIIT brûle-graisse | 30 s à fond / 30 s doux, 10-12 fois | ≈ 20 min | Air bike, rameur, tapis | Timers Seconds, Tabata |
| 3 | Camp | Circuit poids du corps : 5 exos × 40 s / 20 s pause, 3-4 tours | ≈ 25 min | Partout | Bootcamp, Nike Training Club |
| 4 | Abdos | 5 exos × 40 s / 20 s pause, 2 tours | 8-12 min | Tapis de sol | 7 Minute Workout |
| 5 (option) | Course 0 → 5 km | Marche/course alternées, 3×/sem sur 8 sem | ≈ 30 min | Dehors | Couch to 5K (NHS) |
- Claude conseillait de garder les 4 premiers, le 5e seulement si Vuthy court vraiment.
- 3 niveaux par programme ; en fin de séance une seule question « Facile / Bien / Dur » qui ajuste la séance suivante (plus d'intervalles, pauses plus courtes, tour en plus).
- Abandonné/refusé : non abordé.

## 5. Recherches et concurrents
- Apps citées comme inspiration : Apple Fitness, Zones, Timers Seconds, Tabata, Nike Training Club, 7 Minute Workout, Couch to 5K (NHS). Pas de recherche web visible dans la conversation (seulement lecture des docs projet et grep du code).
- Kcal estimées avec les METs du Compendium d'Ainsworth et le poids.

## 6. Choix techniques et visuels (proposés, non validés)
- Un seul minuteur, 3 modes : chrono continu (zone 2, FC cible calculée selon l'âge du profil), intervalles (grand compte à rebours, couleur Effort/Récup, répétition 4/10), circuit (exercice en cours en grand, suivant en petit, n° du tour).
- Écran de séance : 2 boutons visibles seulement (Pause, Terminer) ; bip + vibration à chaque changement ; écran allumé ; « Passer un exercice » et « changer de niveau » sous « Plus ».
- Fin : résumé 1 ligne (durée + kcal), question Facile/Bien/Dur, bouton « ✓ Fait » qui note dans le journal du jour (`acts`).
- Emplacement : entrée « Programmes » dans la partie Sport, sans nouvel onglet ; liste de 4 cartes (nom, durée, niveau). Place exacte à décider par la conversation Design.
- Claude a proposé de montrer d'abord une maquette de l'écran minuteur avant de coder.

## 7. Consignes spécifiques de Vuthy
- Respecter d'abord la règle de simplicité de `organisation-conversations.md`.
- 5 programmes maximum, s'inspirer des meilleures apps, proposer avant de coder.
- Partir de `integ-lot1` et créer `sec/programme`.

## 8. Bugs connus et limites
- Non abordé (rien codé).

## 9. Travaux en cours / état de la branche
- Branche `sec/programme` créée depuis `integ-lot1` (commit de départ `3a3c210`, correctif du toast qui cachait le minuteur de repos), poussée sur crakizi/muscu, **aucun commit propre**.
- **Attend Vuthy** : valider les 4 programmes (avec ou sans le 5e) et dire s'il veut d'abord une maquette du minuteur.

## 10. Prochaines étapes
1. Obtenir la validation de Vuthy sur la liste.
2. (Option) maquette de l'écran minuteur.
3. Coder `dev/src/programs2.js`, l'ajouter à `build.py`, enregistrer la séance dans `acts` (→ jour cardio), test dédié + `testscenarios.py`, captures 390×844.

## 11. Dépendances
- Nutrition : `dayType` / `actType` (une activité `acts` = jour cardio).
- Design : place de l'entrée Programmes dans la navigation ; Design a renommé l'onglet « Séance » en « Sport » dans sa branche (Aujourd'hui · Cuisine · + · Sport · Progrès), justement pour y accueillir les programmes cardio/abdos.
- Muscu : partie Sport partagée.

## 12. Astuces techniques
- Sources dans `dev/src/`, build `dev/build.py` (liste des fichiers JS dans build.py).
- Pas de CLAUDE.md trouvé dans le dépôt à l'époque.
- Push : `git -c push.negotiate=true push -u origin sec/programme`.
