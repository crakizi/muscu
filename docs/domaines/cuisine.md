> **État au 26/11/2026** : lot 2 **en ligne** (publié le 22/11). Bug ouvert : la vérification « Copier hier retire du frigo » échoue sur `main` (75/76). Fiche à tenir à jour par le domaine à chaque livraison (sections Fonctionnalités, Bugs, État, Prochaines étapes). Source : historique de la conversation claude.ai d'origine, lue en entier le 26/11.

# Contexte — section Cuisine

Source : conversation claude.ai « Cuisine » (2bde4a18-2ca0-4dc2-bad0-2a16cc03d90c), 6 tours, lue en entier (gros tour de travail lu via l'export). Dernière mise à jour : 22/11/2026.

## 1. Rôle et périmètre
- Fichiers possédés : `dev/src/fridge.js`, `dev/src/recipes.js`, `dev/src/cuisine2.js`.
- Fiche : `claude/fiche-nutrition-cuisine.md`.
- Contrats : garde `pantryList`, `pantryHas`, `pantryUse` ; lit les objectifs du jour avec `dayType`, `dayTargets`, `tDay`.
- Fichiers partagés : petites accroches ; CSS en fin de `style.css` section « Cuisine ».
- Clone de travail utilisé : `/home/claude/muscu-repo` (et non `/home/claude/muscu`).

## 2. Fonctionnalités développées (lot 2)
1. **Une seule navigation** : 2 rangées (4 + 5 = 9 entrées) → 1 rangée de 4 onglets **Frigo · Recettes · Plan · Courses** (constantes `CZ_TABS`, `CZ_SUBS`, `CZ_OLD`, état `S.kTab`, `S.cz`, replis `S.czFold` / action `czFold`, `cuisineSubHTML`, `czPlanHTML`, `budgetLine`). Remplace la barre de `viewKitchen` (dans `nutrition.js`) depuis `cuisine2.js` sans toucher à `nutrition.js`.
   - Recettes : « Avec ce que j'ai », puis idées IA repliées.
   - Plan : le plan, puis les préparations (Batch) ; « Nouvelle préparation » repliée ; « Mes besoins » replié en bas ; la 2e liste de courses du plan IA remplacée par coût du plan + « Ajouter ce qui manque à ma liste » (`czPlanShop`) ; « Refaire un plan » replié quand un plan existe.
   - Courses : la liste, puis budget replié avec résumé visible (« 💶 Budget : 0,00 € / 60,00 € ») ; l'onglet affiche le nombre d'articles à acheter ; « Coché = rangé dans le frigo » seulement si la liste n'est pas vide.
   - Frigo : titre « Mon frigo » retiré ; bouton IA « Recette avec ce que j'ai » retiré (doublon) ; texte d'aide sous le frigo 3D retiré ; « Courses (IA) » renommé « 🧾 Ranger mes courses ». 47 → 41 boutons visibles.
2. **« Copier hier » retire du frigo** (bouton du journal et « Copier depuis un autre jour ») via `entriesConsume` / `pantryUse` : aliment présent retiré ; recette perso → ingrédients au prorata de la portion ; portion de batch non retirée. Message : « 12 aliment(s) copiés d'hier · 7 retiré(s) du frigo ».
3. **Préparer un batch retire ses ingrédients** (si la préparation part d'une recette, selon le nombre de portions ; le formulaire `batchFormHTML` le signale en une ligne). Ensuite « Mangé » ne retire plus rien. Préparation saisie à la main sans recette : rien retiré.
4. **« Mangé » sur un batch** (`czBatchEat`) note au **jour affiché** du journal (`S.day`) ; message « aujourd'hui » ou « le 20 nov. ».
- Bug corrigé au passage : cocher un article de courses ne mettait à jour total/budget qu'au tap suivant (la case gardait le focus → `isEditing` bloquait le rendu) ; correctif : `blur()` après le clic.

## 3. Décisions validées par Vuthy
- Consignes lot 2 de Vuthy : une seule navigation claire avec avant/après ; « Copier hier » retire du frigo ; préparer un batch retire les ingrédients puis « Mangé » ne retire plus rien ; « Mangé » sur un batch note au jour affiché.
- À la question « À trancher » (déplacer « Mes besoins » vers Nutrition ; faire supprimer par Nutrition l'ancienne barre d'onglets / `viewKitchen`), **Vuthy : « ooui »** (≈ 22/11/2026). Claude n'a rien changé chez lui (fichier `nutrition.js` hors périmètre) et a rédigé un message pour Nutrition/Coordination.

## 4. Idées retenues / abandonnées
- Voir point 2 (retraits/replis avec leurs raisons : doublons, confusion de nom « Courses (IA) » vs onglet Courses).

## 5. Recherches et concurrents
- Non abordé.

## 6. Choix techniques et visuels
- Navigation en une rangée de 4 ; contenus secondaires repliés ; textes raccourcis (« Reste du jour : X kcal · P Y g »).

## 7. Consignes spécifiques de Vuthy
- Simplicité d'abord ; partir de `integ-lot1`.

## 8. Bugs connus et limites
- App ne se chargeait pas en local (three.js, Chart.js manquants dans `dev/`) → liens locaux non commités vers `vendor/` et `anatomy/`.
- Retour du Test (après fusion) : **Frigo encore très chargé** : 65 boutons visibles, 3,2 écrans ; « Manger » sur chacun des 21 articles ; frigo 3D avec 7 boutons qui masque la liste ; « À finir vite » en double. Design propose : un tap sur un aliment ouvre ses actions, frigo 3D derrière une icône.
- Le scénario fait varier les grammes d'un jour à l'autre (190 g de bœuf et non 150 g) : valeur attendue du test corrigée.

## 9. État de la branche
- `sec/cuisine` depuis `integ-lot1`, poussée, 2 commits (hash non cités) :
  1. « Cuisine lot 2 : une seule navigation (Frigo · Recettes · Plan · Courses), retraits du frigo (Copier hier, préparation d'un batch), Mangé au jour affiché » ;
  2. « Captures à jour (testcuisine + testscenarios, nouvelle navigation Cuisine) ».
- Tests : `testcuisine.py` 28/28, `testscenarios.py` 70/70. **Prêt à fusionner** (confirmé après le « ooui »).
- Tests modifiés hors périmètre : `testscenarios.py` et `testnut.py` (sélecteurs des sous-onglets) + vérif « Copier hier retire du frigo » (le test remet le frigo dans son état d'avant).

## 10. Prochaines étapes
- Dès que Nutrition a placé « Mes besoins » chez elle, retirer le pli « Mes besoins » de l'onglet Plan.
- Alléger le Frigo (retour Test/Design).

## 11. Dépendances
- Nutrition : `needsHTML`, `mealPlanHTML`, `ideasHTML`, ancienne `viewKitchen` dans `nutrition.js` ; `copyYesterday`.
- Message à transmettre à Nutrition (rédigé par Cuisine) : « 1. L'écran Mes besoins (`needsHTML`) revient dans la partie Nutrition… Préviens Cuisine quand il est en place. 2. Tu peux supprimer l'ancienne `viewKitchen` de `nutrition.js`… Garde `mealPlanHTML`, `ideasHTML` et `needsHTML`. »
- Photos des plats (`dishimg.js`, conversation Amis) affichées dans recettes perso et plan de repas.
- Amis : « Ajouter à mon profil » sur recette et plan de repas (accroche depuis `friends.js`).

## 12. Astuces techniques
- `normN` est défini dans `fridge.js` (pas de bug).
- `Store.set` déclenche un rendu sauf si un champ est en cours d'édition (`isEditing`) : penser au `blur()` sur les cases à cocher.
- Tests : `dev/testcuisine.py`, `dev/testscenarios.py` ; build `python3 build.py --local`.
