> **État au 26/11/2026** : lot 2 **en ligne** (publié le 22/11). Fiche à tenir à jour par le domaine à chaque livraison (sections Fonctionnalités, Bugs, État, Prochaines étapes). Source : historique de la conversation claude.ai d'origine, lue en entier le 26/11.

# Contexte — section Nutrition

Source : conversation claude.ai « Nutrition » (dcc944b0-98da-4caa-ad1e-9ebe81a01516), 6 tours, lue en entier. Dernière mise à jour : 22/11/2026.

## 1. Rôle et périmètre
- Fichiers possédés : `dev/src/nutrition.js` (≈180 lignes) et `dev/src/nutri2.js` (≈139 lignes au départ).
- Fiche de section : `claude/fiche-nutrition-cuisine.md` (commune avec Cuisine).
- Fichiers partagés (`ui.js`, `core.js`, `actions.js`, `style.css`, `build.py`) : petits branchements ; CSS en fin de `style.css` section « Nutrition ».
- Contrats à ne pas renommer : `dayType`, `dayTargets` (dans `nutri2.js`), `tDay` (dans `core.js`).

## 2. Fonctionnalités développées (lot 2)
Dans `nutri2.js` (bloc « NUTRITION — LOT 2 : écran Aujourd'hui épuré ») :
- `viewTodayN()` : nouvel écran Aujourd'hui ; branché par **une seule ligne dans `ui.js`** : `views.today = typeof viewTodayN === "function" ? viewTodayN : viewToday`.
- `nutEntryRow(e)` : ligne d'entrée du journal (mini-photo `dishImg(..., {size:"mini"})` si `e.src` = plan/recette).
- `dailyStripN(d, k)` : pastilles du suivi du jour ; seules les remplies s'affichent, les vides regroupées en une pastille « ＋ pas, sommeil, sport ».
- `nextMealLine(k, T)` : « Prochain repas · … » au lieu de tous les repas restants.
- Menu « ⋯ » (`<details class="nmore">`) regroupant Copier hier / Grouper par repas / Enregistrer en favori ; état ouvert mémorisé dans `S.nMore` (via `onclick` sur le summary) pour qu'un rafraîchissement (synchro 60 s) ne le referme pas ; fermé après un choix.
- Repli « Fibres, sucres, sel… » (`<details class="ndet">`) : fibres, sucres, sel, saturés + micronutriments (`MICRO_REFS`).
- `dayTypePillHTML(k)` : kcal retirées de la pastille du type de jour.
- `weightPillVal(d, k)` : pastille poids = tendance seule (« ⚖️ 78 kg » (exemple)) ; pesée brute dans la fiche détail (`#inW`).
Dans `nutrition.js` :
- `weekReview()` + nouveau `checkinCardHTML()` : **Bilan de la semaine en 3 lignes**, carte neutre `.wkrev` : Poids tendance (± kg vs semaine d'avant), Apport moyen (sur N jours), Objectif kcal (± changement) · pourquoi (« dépense ≈ X − 5 % » via `adaptiveTDEE()` ou « calculé par formule (peu de pesées) »). ✕ masque jusqu'à la semaine suivante (`checkinSeen`), tap → historique (`checkinHist`). L'ancien `checkinData()` (gros check-in) supprimé.
- Point 3 du lot (séance commencée non finie = jour muscu) : fonctionnait déjà, test ajouté (`dayTypeInfo(todayKey())` = `{type:"muscu", src:"fait"}`).
CSS ajouté : `.nmore`, `.nmore-in`, `.ndet`, `.wkrev .wkrev-l`.

## 3. Décisions validées par Vuthy
- Consignes lot 2 (Vuthy) : ménage de l'écran Aujourd'hui avec avant/après ; bilan de semaine en carte courte et neutre (≤ 3 lignes) ; « Une séance commencée mais pas finie compte déjà comme jour muscu (garder comme ça) » ; « Propose-moi avant de coder ce qui n'est pas dans cette liste ».
- Claude a proposé (hors liste) de raccourcir la pastille poids à « ⚖️ 78 kg » (exemple) → **Vuthy : « oui »** (≈ 22/11/2026). Codé et poussé.
- Vuthy n'a pas commenté explicitement les captures avant/après du ménage ; Claude a écrit « prêt à fusionner, après ton accord sur les captures ».

## 4. Idées retenues / abandonnées
Retiré de l'écran Aujourd'hui (avec raison) :
- Salutation « Salut Vuthy 👋 » + date + objectif (date déjà dans la bande des jours ; prénom codé en dur).
- 4 tuiles Aliment / Séance / Poids / Frigo (doublons de « + Ajouter », de la barre d'onglets, de la pastille poids).
- Bouton « Recette avec mon frigo » (déjà dans Cuisine ; « Que manger ensuite ? » tient compte du frigo).
- Kcal dans la pastille du type de jour (déjà dans l'anneau).
- Texte d'aide de la journée vide.
Replié : micronutriments, Copier hier/Grouper/Favori (menu ⋯ ; sur journée vide « ↺ Même chose qu'hier (X kcal) » reste en gros bouton), pastilles vides, repas restants → prochain repas.
Gardé : anneau kcal restantes, 3 anneaux P/G/L, « + Ajouter », « 💡 Que manger ensuite ? », pastille type de jour, liste des repas.

## 5. Recherches et concurrents
- Non abordé dans cette conversation (logique d'ajustement de type MacroFactor héritée de l'app).

## 6. Choix techniques et visuels
- Carte bilan sans couleur ni rouge.
- Mesures : 29 → 19 contrôles visibles (dont 9 pour la bande des jours), 262 → 173 mots, hauteur 1 620 → 1 136 px.

## 7. Consignes spécifiques de Vuthy
- Respecter d'abord la règle de simplicité ; proposer avant de coder tout ce qui sort de la liste.
- Partir de `integ-lot1` (et non de `main`) pour créer `sec/nutrition`.

## 8. Bugs connus et limites
- Bug trouvé et corrigé : le menu « ⋯ » se refermait tout seul à chaque redessin (synchro toutes les 60 s).
- Environnement : sur `integ-lot1`, `testscenarios.py` plante si `vendor/` n'est pas accessible depuis `dev/` (à signaler à la Coordination).
- Fausse alerte notée : `normN` existe bien (dans `fridge.js`).
- Recoupement avec Design : Design doit faire une maquette du même écran ; Nutrition a changé *ce qui est affiché*, Design *l'apparence* → Design devrait partir de cette version.

## 9. État de la branche
- `sec/nutrition` (depuis `integ-lot1`, commit de départ « le toast ne cache plus le minuteur de repos »), poussée.
- Commit 1 : « Nutrition lot 2 : écran Aujourd'hui épuré + bilan de la semaine en 3 lignes » (hash non cité).
- Commit 2 : `c2fda6e` « Nutrition : pastille poids = tendance seule ; menu « ⋯ » qui ne se referme plus tout seul ».
- Tests : `testscenarios.py` 75/75 ; `testnut2.py` 20/20 (3 fois de suite).
- Statut : **prêt à fusionner**.

## 10. Prochaines étapes
- Demandes venues de Cuisine (Vuthy a dit « ooui » dans la conversation Cuisine) :
  1. Ramener l'écran « Mes besoins » (`needsHTML`) dans la partie Nutrition, à l'endroit le plus simple, puis prévenir Cuisine (qui le retirera de l'onglet Plan).
  2. Supprimer l'ancienne `viewKitchen` de `nutrition.js` (remplacée par `cuisine2.js`) ; garder `mealPlanHTML`, `ideasHTML`, `needsHTML`.
- Retour du Test : l'écran Aujourd'hui reste à 22 contrôles (> 2-3 actions).

## 11. Dépendances
- Cuisine : `needsHTML`, `viewKitchen`, `mealPlanHTML`, `ideasHTML` vivent dans `nutrition.js` ; `copyYesterday` retire maintenant du frigo (Cuisine).
- Muscu/Programmes : `dayType` (séance commencée = jour muscu ; activité `acts` = jour cardio).
- Photos des plats (`dishImg` de `dishimg.js`) utilisées dans `nutEntryRow`.
- Design : apparence de l'écran Aujourd'hui, barre de navigation.

## 12. Astuces techniques
- Build : `cd dev && python3 build.py --local` ; `node --check /tmp/all.js`.
- `testnut2.py` attend un serveur sur 8771 : `(python3 -m http.server 8771 &)` depuis `dev/`.
- Lien local non commité : `ln -s ../vendor vendor; ln -s ../anatomy anatomy; ln -s ../icons icons` dans `dev/`.
- Script de captures : Playwright, `localStorage.clear()`, `demoSeed()`, `Store.set('checkinSeen',{})`, `#nav` mis en `position:static` pour capture pleine page ; comptage des contrôles visibles par JS.
- Ne pas commiter `dev/shots` modifiés par les tests (`git checkout -- dev/shots`).
