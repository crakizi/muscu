> **Mise à jour 26/11/2026 (soir)** : design system 2 par univers sur `sec/design-systeme` (aperçu non publié) — tout est dans `docs/design-system.md` (à lire en premier). Le reste de cette fiche est l'historique.
>
> **État au 26/11/2026** : la direction verte décrite ci-dessous (`sec/design`) **n'a pas été retenue** par Vuthy. Direction actuelle : **façon Liftin'**, branche `sec/design-liftin` (`11888e8`), voir `docs/design-system.md`. Cette fiche reste utile pour l'audit, les règles proposées et les dépendances. Fiche à tenir à jour par le domaine à chaque livraison (sections Fonctionnalités, Bugs, État, Prochaines étapes). Source : historique de la conversation claude.ai d'origine, lue en entier le 26/11.

# Contexte — section Design (titre de la conversation : « Disign »)

Source : conversation claude.ai « Disign » (38b23fca-94bc-43b4-ba73-15621ecd6a6f), 10 tours, lue en entier (gros tour de maquettes lu via l'export). Dernière mise à jour : 22/11/2026 (canevas créé le 22/11/2026 vers 19 h 30 UTC).

## 1. Rôle et périmètre
- Esthétique et navigation de toute l'app ; maquettes / captures avant-après d'abord, puis code ; signaler les écrans trop chargés.
- Fichiers : `dev/src/style.css` (162 lignes au départ ; section « Design system » à créer en tête) et la navigation dans `dev/src/ui.js` (528 lignes) ; petite accroche dans `actions.js`.
- Pas de fiche Design à part : sa fiche = section « Conversation Design » d'`organisation-conversations.md`.
- Contenu des écrans Séance/Cuisine/Aujourd'hui = sections Muscu/Cuisine/Nutrition ; Design fournit les composants communs.

## 2. Fonctionnalités développées
**Maquettes (canevas d'artifact « Refonte design — app Muscu & Nutrition », slug `13cd78c6-632d-45c6-994b-52c5ffa8296e`)** : boards Avant (captures de la version en ligne) et Après (interactifs) pour Aujourd'hui (`Main.dc.html`), Séance en cours (`Seance.dc.html`), Cuisine (`Cuisine.dc.html`), + `DesignSystem.dc.html` (design system & navigation). Réglages Tweaks : clair/sombre, accent vert/bleu. Fichiers locaux dans `/home/claude/design/project/`.

**Code dans l'app (branche `sec/design`)** :
- `style.css` : jetons en tête (`/* Design system (section Design) : couleurs et jetons */`)
  - clair : `--bg:#f4f5f7; --card:#fff; --txt:#101114; --mut:#5e6470; --line:#ecedf0; --acc:#0a7a45` (vert foncé pour texte/liens/onglet actif) ; `--acc2:#e6f7ee; --accf:#12b76a` (vert vif pour aplats) ; `--on:#052814` (texte foncé sur vert) ; `--onacc:#fff` ; `--p:#e0457b` (protéines rose) ; `--c:#e89611` (glucides ambre) ; `--f:#7a5af0` (lipides violet) ; `--grad:var(--accf)` (plus de dégradé).
  - sombre : `--bg:#0e0f12; --card:#191b20; --acc:#3ddc84; --accf:#3ddc84; --on:#04210f; --p:#f0628f; --c:#f2a93b; --f:#9479f5`.
  - boutons pleins `background:var(--grad); color:var(--on)` ; ancien dégradé `#2563eb → #7c3aed` supprimé.
  - composants communs en fin de fichier : `.chip.on`, `button.ghost`, `.card` (ombre, bordure en sombre), `nav.tabs` (grille 5 colonnes), `button.plusbtn` (rond 54 px vert au centre), `.seg` (onglets segmentés une rangée), `.hub` (feuille « + »).
- `ui.js` (bloc « NAVIGATION (section Design) ») : `NAV_TABS` = Aujourd'hui · Cuisine · **+** · Sport · Progrès ; `NAV_ME` = {progress, coach, profile} affichés en onglets segmentés en haut de Progrès (`meNavHTML()` injecté avant la vue dans `render`) ; `addHubSheet()` (Aliment, Scanner, Poids, Séance) ; `NAV_ACT` (`addHub`, `hubGo` → `ACT.openAdd`, `ACT.scanHub`, `ACT.quickWeight`, `tab workout`) ; « • » sur Sport si séance en cours.
- `actions.js` : `Object.assign(ACT, NAV_ACT, DISH_ACT, …)`.
- `testscenarios.py` : `tab(v)` passe par Progrès pour Coach/Profil.
- Page d'aperçu publiée (artifact « Aperçu design vert — Muscu & Nutrition ») : build PWA + `demo_seed.js` injecté, bannière masquée, données fictives (synchro/IA/scan inactifs).

## 3. Décisions validées par Vuthy
- « on va s'inspirer des designs des meilleures applis avec l'avis des gens, vasy change tout les design » (demande initiale, ≈ 22/11/2026).
- Question « quelle couleur ? » → Claude propose le vert → **Vuthy : « vasy on essaye »** (≈ 22/11) : essai du vert validé (essai, pas validation finale).
- **Vuthy : « non ya pas sur l appli »** (il ne voyait pas le changement dans l'app) → Claude code l'essai dans l'app.
- Pas encore validé : le vert définitif, le « prêt à fusionner » de `sec/design`.
- Questions de Claude restées sans réponse explicite : (1) accent bleu ou autre (de fait l'essai vert), (2) renommer « Séance » en « Sport » (codé dans l'essai), (3) Design fournit les composants, Muscu/Cuisine les appliquent ?
- Nom de branche : Vuthy a demandé `sec/disign`, Claude a créé **`sec/design`** (nom prévu par la doc d'organisation) et a proposé de renommer si Vuthy y tient — pas de réponse.

## 4. Idées retenues / abandonnées
- Proposé au tour 3 : nav 7 → 5 ; Coach = carte dans Progrès, Profil derrière la pastille « V » ; **finalement codé** : Coach et Profil en onglets segmentés en haut de Progrès.
- Règles proposées : un seul bouton plein par écran ; pas de dégradé ni d'emoji ; pas de rouge « dépassé » ; clair et sombre avec les mêmes composants.
- Séance (maquette) : tableau SÉRIE | PRÉC. | KG | REPS | ✓, validation en 1 tap ; RIR, échauffement, notes et conseil dans un appui sur la série ; « Dernière fois » → colonne PRÉC.
- Cuisine (maquette) : une rangée d'onglets ; un tap sur un aliment ouvre ses actions (fini les 25 « Manger ») ; frigo 3D derrière une icône.
- Couleurs déconseillées : rouge/orange (alerte, confusion glucides), violet (lipides), noir seul (froid pour la nutrition). Bleu = comme tout le monde (Hevy, Strong, Alpha Progression, JEFIT, MyFitnessPal).

## 5. Recherches et concurrents
- Lu : `consignes.md`, `analyse-apps-detaillee.md`, `analyse-apps-iphone-en-cours.md` + recherche projet ; recherches web (Reddit/avis : Hevy, Strong, MacroFactor, plaintes « calorie tracker cluttered »).
- Retenu : Strong/Hevy (écrans propres, saisie rapide d'une série, tableau de séance, repos auto) ; MacroFactor (sobriété, pas de jeux ni badges) ; MyFitnessPal à éviter (lent, encombré) ; MacrosFirst (tests iPhone de Vuthy : une couleur fixe par macro partout).
- Vert : Lifesum, Yuka, FatSecret (santé), Gravl (vert citron sur noir, énergie) ; texte foncé sur vert comme Spotify / Gravl. Claude a précisé que les études « couleur qui donne envie » sont fragiles : l'important est une seule couleur, partout, bien contrastée.

## 6. Choix techniques et visuels
- Accent unique vert : `#12B76A` (clair, aplats) / `#0A7A45` (texte clair) / `#3DDC84` (sombre). Contrastes calculés (WCAG) pour choisir les tons.
- Le vert « série faite » = l'accent (une couleur de moins).
- Macros P/G/L : rose / ambre / violet.
- Barre du bas 7 → 5 boutons.

## 7. Consignes spécifiques de Vuthy
- S'inspirer des meilleures apps et des avis des gens ; tout changer.
- Partir de `integ-lot1`.

## 8. Bugs connus et limites
- Constats sur la version en ligne : 7 boutons en bas (« Aujourd'hui » coupé) ; dégradé bleu-violet sur 3-5 boutons par écran ; emoji mêlés aux icônes ; Séance : 1 exercice = carte de ~700 px ; Cuisine : tuiles emoji, frigo 3D plein écran, « Manger » ×25 ; Progrès ≈ 6 500 px de défilement avec barres rouges sur 15 muscles.
- Limites de l'essai : anneau des calories encore turquoise ; emoji restants dans Cuisine, Séance, Progrès ; titre de l'écran Sport encore « Séance » (écrans des autres sections non touchés).
- Le tableau DesignSystem du canevas montre encore les couleurs du bleu (à mettre à jour après choix).
- Claude n'a pas pu ouvrir la page d'aperçu lui-même (à vérifier par Vuthy).
- Tentative d'aligner `sec/design` sur `main` par reset + push forcé refusée par l'outil → simple fusion de `main` dans la branche.

## 9. État de la branche
- `sec/design` (depuis `integ-lot1`, + fusion de `main`), poussée. Commit : « Design : accent vert, plus de dégradé, barre du bas 4 onglets + bouton « + » » (hash non cité).
- Tests : 76/76.
- **Attend Vuthy** : dire si le vert lui plaît et « prêt à fusionner », puis transmettre à la Coordination ; rien n'est publié sur crakizi.github.io/muscu.

## 10. Prochaines étapes
- Après validation : même nettoyage (couleurs, emoji, titres) dans les écrans des autres sections, avec chacune.
- Mettre à jour le tableau du design system du canevas.
- Prévenir la conversation Test du changement de `tab()`.

## 11. Dépendances
- Nutrition (écran Aujourd'hui : Nutrition a changé le contenu, Design l'apparence), Muscu (carte de séance désormais dans `program.js`), Cuisine (navigation, frigo), Programmes (entrée dans Sport), Amis (entrée depuis Profil, qui est maintenant un onglet de Progrès), Test (`tab()`).
- `ui.js` modifié par plusieurs sections → conflits probables à la fusion.

## 12. Astuces techniques
- Captures : Playwright, `device_scale_factor=2`, `.banner{display:none!important}`, mode sombre via `document.documentElement.classList.add('dark')`, planche composée avec PIL.
- Aperçu partageable : `python3 build.py` (PWA) puis injection de `demo_seed.js` dans le HTML et publication en artifact ; **supprimer ensuite `dev/index.html` généré** pour ne pas le commiter.
- Maquettes : type d'artifact canevas (`create_from_type`), fichiers `*.dc.html` (classe `Component extends DCLogic`, props éditables via `data-props`), publiés avec `publish_files` en mode patch.
