> **État au 26/11/2026** : branche `sec/amis` (`fcc2301`) **non fusionnée** ; SQL non appliqué dans Supabase. Fiche à tenir à jour par le domaine à chaque livraison (sections Fonctionnalités, Bugs, État, Prochaines étapes). Source : historique de la conversation claude.ai d'origine, lue en entier le 26/11.

# Contexte — section Amis (+ historique « Photos des plats » V1.8)

Source : conversation claude.ai « Amis » (99c60807-9ad1-41ad-a3a3-70905c3a1564), 36 tours, lue en entier (dernier tour lu via l'export). Dernière mise à jour : 22/11/2026. La conversation a 3 phases : (A) question amis → section 10 du cahier des charges (20/11/2026) ; (B) photos des plats V1.8 publiées directement sur `main` (nuit du 21/11/2026) ; (C) lancement de la section Amis sur `sec/amis` (22/11/2026).

## 1. Rôle et périmètre
- Section Amis : fichier possédé **`dev/src/friends.js`** (nouveau), la partie « AMIS » de **`dev/schema.sql`**, le test **`dev/testamis.py`**.
- Petits ajouts dans `ui.js`, `actions.js`, `build.py`, `style.css`. 0 fichier d'une autre section modifié : les boutons « Ajouter à mon profil » sont ajoutés depuis `friends.js` (hooks `frHooks`).
- Historique de cette conversation : elle a aussi créé **`dev/src/dishimg.js`** (photos des plats) et modifié `platform_pwa.js`, `nutrition.js`, `recipes.js`, `ui.js`, `actions.js`, `build.py`, `style.css`.
- Contrat Supabase : la table `docs` (données perso) reste lisible par son seul propriétaire.

## 2. Fonctionnalités développées
### B. Photos des plats (V1.8, en ligne sur crakizi.github.io/muscu)
- `dishimg.js` : chaque plat/collation/recette créé par l'IA reçoit une photo générée **une seule fois**, mise en cache dans IndexedDB `muscu_dishimg` (non synchronisée), réduite ≤ 900 px JPEG (`diShrink`).
- Fonctions : `dishKey`, `dishHash`, `diDB/diGet/diPut/diDel`, `dishPrompt` (prompt anglais photoréaliste, sans texte ni mains), `diPollinations`, `diGemini`, `diGenerate`, `diPump` (file d'attente), `diEnsure`, `diShow`, `diInner`, `diRevoke`, `diImgErr`, `dishImg(name, {desc, ings, size})` (tailles `thumb`, `mini`, `wide`, `big`), `aiRich(texte)` (transforme les lignes « 🍽️ Nom | description anglaise » en blocs avec photo), `dishSheet`, actions `DISH_ACT` (`dishView`, `dishRegen`).
- Règle `DISH_RULE` ajoutée aux `CHEF_RULES` et au prompt du coach ; plan de repas avec champ JSON `photo_en`.
- 7 emplacements : « 💡 Que manger ensuite ? », « 🧊 Recette avec mon frigo », Idées recettes (+ gardées), Plan de repas (vignette), Coach, Recettes perso (liste + fiche), Journal (mini-photo pour entrées `src` plan/recette).
- Service : **Pollinations avec clé** (`https://gen.pollinations.ai/image/<prompt>?model=…&width=1024&height=768&seed=…`, en-tête `Authorization: Bearer sk_…`), modèles `DIMG_MODELS` : `tongyi-mai/z-image-turbo` (« Réaliste », ≈ 0,004 $/photo, défaut) et `black-forest-labs/flux.1.1-pro` (« Très réaliste », ≈ 0,03 $). Repli Gemini image (`DIMG_GEMINI` : gemini-3.1-flash-image, …-lite-image, …-preview, gemini-2.5-flash-image) seulement sans clé Pollinations ; modèle refusé ignoré 24 h (`localStorage dimg_bad`).
- Erreurs gérées : `nokey` (« Clé à ajouter »), `badkey` (401), `nobalance` (402, « Solde vide »), `offline`, `busy` (429 avec retry-after).
- Réglages : carte **Profil → Photos des plats** dans `platform_pwa.js` (`#pollKey` type password, `#pollModel`, action `pollSave` qui exige le préfixe `sk_`) ; clé stockée dans `settings` (synchronisée), jamais dans le code.
- Tailles finales (après retours de Vuthy) : `.dimg-thumb` 84 px, `.dimg-mini` 46 px, `.dimg-wide` 16/9 max 200 px, `.dimg-big` max 70vh ; plan de repas = vignette 84 px à gauche ; plus de bouton « ↻ Nouvelle photo » dans la feuille.
- Tests : `dev/testdish.py`, `dev/testdish2.py` (Pollinations simulé par `page.route`), `testdish3.py`.

### C. Amis lot 1 (branche `sec/amis`, non fusionnée)
- **Désactivé par défaut** ; carte « Amis · Activer » dans Profil ; tant que désactivé, aucun bouton de partage et aucun appel serveur.
- **Pseudo** unique (seul nom visible). **Profil privé par défaut** ; public en option (réglages repliés : pseudo, privé/public, « Désactiver Amis »).
- Ajout d'un ami : par code ou lien d'invitation (« 🔗 Inviter ») → demande à accepter/refuser si profil privé ; profil public ajouté directement par pseudo. Code d'invitation visible seulement par son propriétaire.
- **Profil en 2 sections : 🍽️ Alimentation** (recettes, repas, diètes) **et 🏋️ Sport** (séances, programmes) ; « Retirer » sur son propre profil.
- **« Ajouter à mon profil »** sur séance terminée (en bas de sa fiche), recette, repas du journal, plan de repas : copie figée sans notes ni dates.
- **« Copier »** chez un ami : séance → mes séances (renommée si doublon) ; recette → mes recettes ; repas → journal au jour affiché ; diète → remplace mon plan après confirmation en ligne « Remplacer mon plan ? » (pas de pop-up), **portions ajustées à mes kcal**.
- Désactiver retire du serveur profil, partages et amis ; ce qui a été copié reste.
- Fonctions : `viewFriends`, `frProfileView`, `frProfileCard`, `frShareBtn`, `frHooks`, `frApply`, `frBuild`, `frHash`, `frLoad`, `frLoadShares`, `frApi`, `frRpc`, `frInit`, `frOn`, `frAvail`, `frErr`, `frFriends`, `frRequests`, `frSent`, `frMeId` ; `FR_ACT`, `FR_KIND` ; actions `frEnable`, `frDisable`, `frCreate`, `frRename`, `frPublic`, `frInvite`, `frAdd`, `frAnswer`, `frOpen`, `frBack`, `frSec`, `frShare`, `frUnshare`, `frCopy`, `frRemove`, `frSetT` ; état `S.frView`, `S.frSec`, `S.frSet`, `S.frConfirm`, `S.frPrefill`.
- SQL (`dev/schema.sql`, partie AMIS) : tables `fr_profiles`, `fr_links`, `fr_shares` ; fonctions `fr_add`, `fr_answer`, `fr_me`, `fr_leave`, `fr_is_friend`, `fr_can_see` ; politiques RLS (« fr profils le sien / lecture », « fr liens lecture / retirer », « fr partages les miens / lecture »). Testé sur Postgres 16 local : 11 tests de confidentialité OK, script relançable.

## 3. Décisions validées par Vuthy
- (20/11) « est-ce que la fonctionnalité des amis est dispo dans les autres applis ? j'aimerais bien l'ajouter… partager des séances/photos… recette ou diète ou journée diète » → proposition → **« ok parfait prends les meilleures fonctionnalités de Hevy j'aime bcp et MyNetDiary ça me paraît très bien si tu mélanges les deux »** → section 10 du cahier des charges.
- (20/11) **« ou plus tard mettre l'app grand public donc ils peuvent aussi suivre diète et séance »** → V4 multi-comptes, V5 ouverture au public (10.6).
- (21/11) **« fais ça mtn »** : photo réaliste à côté de chaque plat créé par l'IA, dès qu'un plat/collation/recette est créé.
- (21/11) **« ok pour l'instant on code pour moi, on verra quand j'aurai fini l'appli là on adaptera »** : pas de multi-comptes/serveur IA pour l'instant.
- (21/11) « du coup je laisse Gemini ou je crée Pollinations » → conseil Pollinations → **« vasy je me suis connecté… je te laisse faire le reste »** ; puis « c bon » (connecté dans le navigateur intégré) ; « c bon j'ai copié » ; puis « ça marche pas copie toi » / « je peux pas copier ».
- (21/11) **« ne propose pas de nouvelle photo lorsque j'appuie sur la photo. et aussi mets-les en plus grand car c'est tout petit »** → fait ; puis **« non mais là c'est bcp trop grand »** → taille intermédiaire.
- (22/11) Lancement section Amis ; sur la maquette : **« moi je pense que c'est bien d'avoir la section alimentation d'un côté et la section sport de l'autre, moi je peux décider de partager sur mon profil et qqn qui m'a en amis peut m'ajouter, et on peut ajouter soit en privé soit en public (on peut changer dans les paramètres) »**.
- (22/11) Aux 2 questions (ouvrir l'inscription Supabase ? diète copiée telle quelle ou recalculée ?) : **« oui »** → Claude interprète : inscription ouverte + portions recalculées automatiquement (interprétation de Claude pour la 2e question, à confirmer si besoin).

## 4. Idées retenues / abandonnées
- Cahier des charges section 10 (proposé et accepté) : fil d'amis Hevy (cartes de séance, j'aime, commentaires, copier séance/programme, comparaison sur un exercice, visibilité en fin de séance Privée/Amis/Amis choisis, image de partage) + MyNetDiary (journal partagé ami par ami, désactivé par défaut ; poids/mensurations/photos/bilans/sommeil toujours privés ; recette/repas/journée/diète copiables avec portions recalculées) ; notifications = pastille seulement ; 10.6 public : suivre un profil public, fil Découvrir, signalement, RGPD.
- **Repoussé hors du lot 1** (simplicité) : j'aime, commentaires, classements, comparaison, fil d'actualité/Découvrir, photos/vidéos jointes, notifications, partage auto du journal, 8e onglet (entrée par Profil).
- Remplacé par le choix de Vuthy : partage à des amis précis (« Tous mes amis / Choisir ») → partage **sur son profil** en 2 sections.
- Photos : **Pollinations sans clé abandonné** (1 image / 45 s puis image jaune « Free limit reached », origine localhost bloquée, réalisme moyen) ; Gemini « Nano Banana » non retenu (pas dans l'offre gratuite ; activer la facturation rendrait payants tous les appels IA → il faudrait une 2e clé plafonnée) ; Pexels (vraies photos mais pas la recette exacte) non retenu ; bouton « Nouvelle photo » retiré à la demande de Vuthy.
- Pour le public (plus tard) : serveur intermédiaire (Edge Function Supabase) qui garde les clés, quotas par compte, abonnement premium (Stripe), cache partagé, option « mettre sa propre clé » ; l'offre gratuite Gemini ne convient pas (quotas, données utilisées par Google).

## 5. Recherches et concurrents
- **Hevy** : fil des séances des gens suivis (stats durée/volume/records), partage de routines/dossiers, selfies/vidéos, j'aime/commentaires, copier une séance, profil privé avec demande, séance privée possible.
- **Strong, Fitbod** : aucune fonction sociale. **Arvo** : « Gym Crew » sur invitation, 8 partenaires, réactions emoji.
- **MyFitnessPal** : amis limités, pas de partage de recette direct, copie de repas d'un ami si partage activé, fil d'actualité retiré fin juin 2024.
- **MyNetDiary** : journal visible par un ami choisi, poids/mensurations/notes privés, désactivé par défaut, réglage ami par ami, groupes de recettes.
- Apps IA (MacroFactor, Cal AI, Fitbod) : clé côté serveur, IA payée par l'abonnement, limites par personne, modèles bon marché, cache.
- Pollinations (site enter.pollinations.ai) : porte-monnaie prépayé, rechargeable gratuitement par des « Quêtes » ; doc API `APIDOCS.md`.

## 6. Choix techniques et visuels
- Supabase existant (table `docs` RLS) ; Amis = 3 tables + RLS (un ami ne lit un partage que si l'amitié est acceptée et la visibilité le permet) ; on ajoute uniquement par code (personne ne peut lister les comptes) sauf profil public par pseudo.
- Partage = copie figée (snapshot) de l'élément.
- Photos : une par plat, cache local, pas de synchro (Mac et iPhone génèrent chacun les leurs).

## 7. Consignes spécifiques de Vuthy
- On code pour Vuthy seul pour l'instant ; ouverture au public plus tard.
- Pas de bouton « Nouvelle photo » ; photos ni trop petites ni trop grandes.
- Partage organisé en Alimentation / Sport, sur son profil, privé ou public réglable.

## 8. Bugs connus et limites
- **La clé Pollinations n'a peut-être jamais été collée dans l'app** : Vuthy n'arrivait pas à la copier (« ça marche pas copie toi », « je peux pas copier »). Claude a refusé de la copier lui-même et l'a seulement sélectionnée (cadre orange) dans le navigateur intégré. Génération avec la vraie clé **jamais testée** ; logo Pollinations sur les photos avec clé non vérifié. [clé saisie par Vuthy, non recopiée] — clé « App Muscu - photos des plats », plafond 2 $, solde des Quêtes uniquement, droits Texte + Image ; 0,25 $ de solde gagné (Quête « créer une clé »), d'autres Quêtes (+0,25 $ chacune : modèle image, modèle texte).
- Le bouton « Copy » de Pollinations ne marchait pas dans le navigateur intégré.
- Amis : **rien testé sur le vrai Supabase** ; SQL non appliqué ; inscription non encore ouverte. Dans l'aperçu `build.py --local`, Amis affiche seulement « Connecte-toi » (pas de synchro).
- Corrigé : les réglages Amis se refermaient à chaque action (impossible de confirmer « Désactiver »).
- Phase B : les commits photos ont été **poussés directement sur `main`** avec `index.html`/`sw.js`/`version.json` à la racine (avant l'organisation par sections ; contraire aux règles actuelles).
- Le Test a signalé `testdish2.py` comme vieux test qui échoue.
- Un premier refus d'écriture GitHub venait d'un contrôle de sécurité de la session (accès demandé de lui-même), accordé après confirmation de Vuthy.

## 9. État de la branche
- `sec/amis` depuis `integ-lot1` (rebasée sur la dernière version), commit **`fcc2301`** « Amis lot 1 : profil Alimentation/Sport, ajout par code ou pseudo, privé/public, copie en 1 tap, SQL + RLS », poussé. Tests : `testamis.py` 33/33 (faux serveur Supabase), `testscenarios.py` 69/69. **Prêt à fusionner** selon Claude.
- Commits sur `main` (phase B) : « Photos réalistes des plats créés par l'IA (Pollinations), réglages Profil → Photos des plats » ; « Photos des plats plus grandes, plus de bouton « Nouvelle photo » » ; « Photos des plats : taille intermédiaire ».
- **Attend Vuthy** : (1) coller la partie AMIS de `dev/schema.sql` dans Supabase SQL Editor et l'exécuter ; (2) Authentication → Sign In / Providers → Email → activer « Allow new users to sign up » ; (3) dire à la Coordination que `sec/amis` est prête ; (4) coller la clé Pollinations dans Profil → Photos des plats et vérifier une première vraie photo ; faire les Quêtes.

## 10. Prochaines étapes
- Test réel sur Supabase après application du SQL.
- Plus tard (V4/V5) : multi-comptes complet (tout ce qui est propre à Vuthy devient réglage : programme, salle UAX, aliments), serveur IA, ouverture au public.
- Journal de dev (« À faire ») : coller la clé Pollinations, installer l'app native iPhone + widget, positions des machines, Spotify, idées RP Hypertrophy/Liftosaur/décharge, récap de fin de séance, série validée auto, salle 3D par utilisateur, décor dips/presse, échauffement jambes, nom de la rotation à 90°.

## 11. Dépendances
- Muscu : copier une séance (remplacement d'exercice absent, `replacementsFor`), `saveWorkout`, `workouts`, `sessions`, `program`.
- Nutrition/Cuisine : `recipes`, `mealplan`, `makeEntry`, `updDay`, `targets()` (recalcul des portions), `recipeTotals`, `recipeAsFood`.
- Design : entrée Amis depuis Profil (Profil devient un onglet de Progrès dans `sec/design`).
- Photos des plats utilisées par Nutrition (`nutEntryRow`) et Cuisine.
- Supabase (`platform_pwa.js` : `auth`, `Sync`).

## 12. Astuces techniques
- Pollinations : CORS OK pour `https://crakizi.github.io` ; sans clé, l'origine localhost est bloquée (403).
- Tester les photos sans réseau : `page.route("https://gen.pollinations.ai/**", …)` qui renvoie une image locale.
- Build PWA : `python3 build.py --pwa` → `dev/dist/` (index.html, sw.js, version.json) ; publication (Coordination seulement) = copie à la racine puis push `main` ; vérif en ligne : `curl -s https://crakizi.github.io/muscu/index.html | grep -c <marqueur>` après ~40 s.
- Serveur de test à la racine du dépôt pour `/dev/dist/index.html` : `python3 -m http.server 8765` depuis `/home/claude/muscu`.
- SQL testé dans un Postgres 16 jetable local (avec `auth.uid()` simulé).
- Navigateur intégré (remote-devices Claude_Browser) : séparé du Chrome/Safari de Vuthy ; Cmd+Maj+B pour l'afficher.
