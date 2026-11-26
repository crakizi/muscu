> **État au 26/11/2026** : les vérifications de `test/lot2` sont intégrées à `main` (76 vérifications). Fiche à tenir à jour par le domaine à chaque livraison (sections Fonctionnalités, Bugs, État, Prochaines étapes). Source : historique de la conversation claude.ai d'origine, lue en entier le 26/11.

# Contexte — section Test

Source : conversation claude.ai « Test » (cfad9229-2b93-4982-93d7-11503d189a14), 2 tours, lue en entier. Dernière mise à jour : 22/11/2026.

## 1. Rôle et périmètre
- Rôle : testeur. Fusionne les branches de sections dans une branche de test temporaire, lance les tests de bout en bout, ajoute des vérifications, mesure la simplicité écran par écran, fait un rapport.
- Fichier considéré comme « le sien » : `dev/testscenarios.py` (les sections l'ont aussi modifié).
- Ne pousse jamais sur `main` ; c'est la Coordination qui fusionne.

## 2. Fonctionnalités développées (tests)
- Branche `test/lot2` = `integ-lot1` + `sec/nutrition` + `sec/cuisine`, avec 4 vérifications Cuisine ajoutées dans `testscenarios.py` (après `shot("08_batch.png")`) :
  - « Cuisine : une seule rangée de 4 onglets » (`.cztabs .ktab` = 4, pas de `.czsubs`) ;
  - « Plan : Mes besoins replié, accessible » (`button[data-act=czFold][data-v=besoins]`) ;
  - « batch Mangé au jour affiché (hier) » (`czBatchEat` sur `bDemo1`, entrée « Chili con carne », `left` passe à 1) ;
  - « batch Mangé ne retire rien du frigo » ; puis remise en état des données.
- Script d'audit de simplicité `/tmp/simp.py` (non commité) : compte contrôles visibles, contrôles du 1er écran, blocs de texte, mots, hauteur en écrans, rangées d'onglets, par vue (en forçant `S.tab='fridge'; S.kTab=...; S.cz=...`).

## 3. Décisions validées par Vuthy
- Aucune réponse de Vuthy dans cette conversation (un seul message de lancement).

## 4. Idées retenues / abandonnées
- Proposé (non validé) : supprimer ou mettre à jour les vieux tests cassés (`testrec`, `testnav`, `testui`, `testdish2`).
- Proposé : renvoyer à Cuisine (et Design) la simplification du Frigo.
- Signalé à confirmer par Vuthy : Nutrition a retiré le bouton « Recette avec mon frigo » d'Aujourd'hui (seul raccourci Nutrition → Cuisine).

## 5. Recherches et concurrents
- Non abordé.

## 6. Choix techniques
- Résolution des conflits de fusion (`style.css`, `testscenarios.py`) en gardant les deux côtés.
- Worktrees git temporaires (`/tmp/wn` pour sec/nutrition seule, `/tmp/wb` pour la base) pour comparer.

## 7. Consignes de Vuthy
- « Lis organisation-conversations.md, vision-produit.md et ta partie dans consignes.md, puis commence. Code : dépôt crakizi/muscu, branche de départ integ-lot1. »

## 8. Bugs connus et limites (rapport du 22/11)
- **Aucun bug de l'app trouvé.** 80/80 vérifications sur la fusion.
- Test fragile `testnut2.py` (clic dans le menu « ⋯ » juste après l'ouverture) : 1 échec sur 7 ; la cause réelle (rafraîchissement d'écran toutes les 60 s qui refermait le menu) a ensuite été corrigée côté Nutrition (commit `c2fda6e`).
- Vieux tests obsolètes qui échouent déjà sur la base : `testrec`, `testnav`, `testui`, `testdish2` (pointent vers un ancien chemin `/home/claude/app`). Pas une régression.
- Écrans trop chargés (règle n°1) :
  | Écran | Boutons visibles | Hauteur | Constat |
  |---|---|---|---|
  | Cuisine › Frigo | 65 | 3,2 écrans | Bouton « Manger » sur chacun des 21 articles ; frigo 3D avec 7 boutons qui masque la liste ; « À finir vite » en double |
  | Aujourd'hui | 22 | 1,1 | encore au-dessus de 2-3 actions mais mieux (31 → 22 boutons, 178 → 129 mots) |
  | Cuisine › Plan | 16 | 1,4 | correct |
  | Cuisine › Recettes | 17 | 1,4 | correct |
  | Cuisine › Courses | 9 | 0,7 | OK |

## 9. État / branche
- Branche `test/lot2` poussée (fusion nutrition + cuisine + 4 vérifs), hash non cité.
- Résultats : base `integ-lot1` 69/69 ; fusion 76/76 avant ajouts ; 80/80 après ajouts. Tests de section (`testnut`, `testnut2`, `testcuisine`, `testtoday`, `testprog`, `testph`) OK.
- À ce moment, `sec/design` et `sec/programme` n'avaient rien livré par rapport à `integ-lot1`.
- Attend : que Vuthy/Coordination dise quand une autre section est prête.

## 10. Prochaines étapes
- Tester les branches suivantes (design, muscu, amis, programme) quand elles sont prêtes ; ajouter les vérifs manquantes au scénario commun.
- Décider du sort des vieux tests cassés.

## 11. Dépendances
- Toutes les sections (tests de bout en bout). Design a modifié `tab()` dans `testscenarios.py` (Coach/Profil passent par Progrès) — à intégrer.

## 12. Astuces techniques
- **Sur un clone neuf, copier `vendor/` et `anatomy/` (et `icons/`) de la racine dans `dev/`** sinon l'app plante au chargement en local (three.js, Chart.js absents) et les tests échouent avec une fausse piste « normN non défini ». Les exclure via `.git/info/exclude` (`index.local.html`, `vendor/`, `anatomy/`).
- Build : `cd dev && python3 build.py --local` → `dev/index.local.html` ; le JS assemblé est aussi écrit dans `/tmp/all.js` (vérif : `node --check /tmp/all.js`).
- Playwright + Chrome : `chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=swiftshader"])`, viewport 390×844.
- Certains tests attendent un serveur déjà lancé : `python3 -m http.server 8765` et `8771` depuis `dev/`.
- Jeu de démo : `pg.add_script_tag(path="dev/demo_seed.js"); pg.evaluate("demoSeed()")`.
- Certains vieux tests attendent un lien `/home/claude/app` → `dev/`.
- Commits de test : `git -c user.name="Claude (Test)" -c user.email=noreply@anthropic.com commit`.
- `git checkout -- dev/shots` avant fusion (les captures changent à chaque run).
