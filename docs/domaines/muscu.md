> **État au 26/11/2026** : lot 1 **en ligne** (publié le 22/11). Fiche à tenir à jour par le domaine à chaque livraison (sections Fonctionnalités, Bugs, État, Prochaines étapes). Source : historique de la conversation claude.ai d'origine, lue en entier le 26/11.

# Contexte — section Muscu

Source : conversation claude.ai « Muscu » (f8ba5116-cae9-4260-b681-9bf2a6783f0f), 6 tours, lue en entier (le gros tour de travail lu via l'export, détails des commandes résumés). Dernière mise à jour : 22/11/2026.

## 1. Rôle et périmètre
- Fichiers possédés (dans `dev/src/`) : `program.js`, `fatigue.js`, `body3d.js`, `anim.js`, `scene3d.js`.
- Fichiers partagés : petites accroches seulement ; CSS en fin de `style.css` section « Muscu ».
- Contrats Nutrition/Cuisine à ne pas renommer : `dayType`, `dayTargets`, `tDay`, `pantry*`.
- Pas de fiche Muscu dans le projet (Claude a proposé de la rédiger ; pas de réponse).

## 2. Fonctionnalités développées (lot 1)
- **Base d'exercices `EX_DB`** (dans `program.js`) : 40/40 exercices complétés (matériel, photo, variantes) ; **133 variantes** rédigées avec ce qu'elles changent (ex. « Haltères debout : rien en bas, tout en haut ») ; libellés `EQ_LABEL`.
- **Photos free-exercise-db** (domaine public) : constante `FEDB`, chargées depuis le CDN `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c/exercises/` ; 38/40 exercices ont une photo (2 images en alternance, début puis fin du mouvement), les 2 autres s'affichent en 3D.
- **Fiche exercice** (déplacée de `ui.js` vers `program.js`) : photo + bouton « 3D » (corps animé) ; muscles en pastilles « Ciblé » / « Aussi » ; variantes en 3 onglets Poids libre / Machine / Poulie, avec photo et phrase ; en séance, bouton « Utiliser » (`useVar`) remplace l'exercice ; repli « Bien le faire » (consignes, note scientifique, rôle des muscles) ; « Reps visées » (fourchette) ; « Pas envie », « Monter », « Retirer » (en rouge) en bas de la fiche. Hauteur 1 780 → 788 px.
- **Carte d'exercice en séance** (`exCard`, déplacée de `ui.js` vers `program.js`) : charge et reps toujours pré-remplies avec l'objectif du conseil (+1 rep vs dernière fois) ; bouton « ✓ 25 kg × 8 » (`logSet`) → **1 tap** pour noter une série (2 si on change reps/charge ; avant : 3 ou plus).
- Fonctions/actions vues dans le code : `exCard`, `exDraft`, `exMuscleSheet`, `ghostBadge`, `ghostCmp`, `ghostSummary`, `repRange`, `replacementsFor`, `suggestion`, `body3DHolderHTML`, `bodyThumbHTML` ; actions `exInfo`, `exEq`, `exMedia`, `useVar`, `logSet`, `dStep`, `dRir`, `dWu`, `delSet`, `exDone`, `exDrop`, `exMove`, `exReopen`, `refuse`, `range`, `showMusc`.
- Nouveau test `dev/testmuscu.py` (14 vérifications).

## 3. Décisions validées par Vuthy
- Consigne lot 1 (Vuthy) : « Rends la base d'exercices plus détaillée, sans alourdir l'écran : muscles ciblés et variantes en poids libre, machine et poulie, avec ce que chaque variante change. Pour les images, tu peux utiliser free-exercise-db (domaine public). La saisie d'une série doit se faire en 1 à 2 taps. Laisse la salle personnalisée de côté (en pause). Montre-moi des captures avant de pousser. »
- Après les captures, **Vuthy : « oui »** (≈ 22/11/2026) → branche poussée.

## 4. Idées retenues / abandonnées
Retiré ou replié (lot 1) :
- Boutons ⇄ 🚫 ↑ ✕ sur chaque exercice → remplacés par « ⋯ » qui ouvre la fiche.
- Fourchette de reps → dans la fiche (« Reps visées »).
- Ligne « 👻 Série N la dernière fois » (la série à battre est surlignée dans « Dernière fois ») et estimation kcal par série (le total reste en haut).
- Dans la fiche : boutons Mouvement/Statique, liste « Alternatives dans ta salle » (liée à la salle perso, en pause), détail des kcal.
- Photo de « Penché vers la poulie » retirée (montrait un buste penché en avant, pas sur le côté).
- Salle personnalisée : en pause (consigne de Vuthy).

## 5. Recherches et concurrents
- free-exercise-db (yuhonas, domaine public, 800+ exercices avec photos début/fin) clonée et fouillée pour faire correspondre les exercices.
- Pas d'analyse de concurrents dans cette conversation.

## 6. Choix techniques et visuels
- Photos via jsDelivr épinglé sur le commit `f00c92c` ; sans réseau la photo est masquée et la 3D reste.
- Cases vides cachées quand une variante n'a pas de photo ; « Retirer » en rouge ; minuteur de repos masqué sur les captures.

## 7. Consignes spécifiques de Vuthy
- Simplicité d'abord ; salle personnalisée en pause ; captures avant de pousser ; partir de `integ-lot1`.

## 8. Bugs connus et limites
- Élévation latérale à la poulie : la photo montre la version assise à deux bras, pas l'unilatérale (pas mieux dans la base).
- Curl Bayesian et tirage prise large : pas de photo → 3D.
- Photos hors ligne non garanties (CDN).
- `testscenarios.py` échouait tant que `vendor/`, `icons/`, `anatomy/` n'étaient pas copiés dans `dev/` (comme l'indique le README).

## 9. État de la branche
- `sec/muscu` depuis `integ-lot1` (départ `3a3c210`), commit **`1560b59`** « Muscu lot 1 : fiche exercice (photo free-exercise-db, muscles ciblés, variantes poids libre / machine / poulie) + saisie d'une série en 1 tap », **poussé**.
- Tests : scénarios 69/69, Muscu 14/14, animations 3D sans erreur. **Prêt à fusionner.**
- Pour la Coordination : `ui.js` modifié (carte de saisie + fiche exercice déplacées vers `program.js`, surtout du code retiré) ; 4 vérifs Muscu de `testscenarios.py` ajustées + `test.py`, `testanim.py`, `testbody.py`, `testph.py` adaptés ; nouveau `dev/testmuscu.py`.

## 10. Prochaines étapes
- Non abordé au-delà du lot 1 (salle perso en pause).

## 11. Dépendances
- Nutrition : une séance commencée = jour muscu (`dayType`).
- Design : Design propose un tableau de séance SÉRIE | PRÉC. | KG | REPS | ✓ et applique des composants communs ; la carte d'exercice est maintenant dans `program.js` (Muscu) → coordination nécessaire. Design a renommé « Séance » en « Sport ».
- Amis : « Copier une séance » remplace un exercice absent par un exercice des mêmes muscles (logique du refus 🚫, `replacementsFor`).
- Conflit possible à la fusion : `ui.js` est aussi modifié par Design (navigation), Nutrition (views.today), Amis (accroches).

## 12. Astuces techniques
- Copier `vendor/`, `icons/`, `anatomy/` dans `dev/` avant `python3 build.py --local`.
- Tests : `dev/testanim.py`, `dev/testmuscu.py`, `dev/testscenarios.py`.
- Captures dans `dev/shots/muscu/` (avant_*, apres_*), comparaisons `compare_saisie.jpg`, `compare_fiche.jpg`.
- Push : `git -c push.negotiate=true push -u origin sec/muscu`.
