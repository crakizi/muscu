# Architecture technique

## Vue d'ensemble
- **PWA** (web app installable, hors ligne) publiée sur GitHub Pages : https://crakizi.github.io/muscu (dépôt public `crakizi/muscu`, branche `main`).
- **Un seul fichier HTML compilé** : les sources `dev/src/*.js` + `dev/src/style.css` sont concaténées par `dev/build.py`.
  - `python3 build.py --local` → `dev/index.local.html` (test local, bandeau « Mode aperçu »).
  - `python3 build.py --pwa` → `dev/dist/` à copier à la racine (`index.html`, `sw.js`, `version.json`) pour publier.
  - Avant de compiler sur un clone neuf : copier (ou lier) `vendor/`, `icons/`, `anatomy/` de la racine dans `dev/`, sinon l'app et les tests plantent.
- **Apps natives** (hors dépôt, sur le Mac de Vuthy : `~/Applications/MuscuApp`) : app Mac « Muscu » (SwiftUI + WKWebView) qui affiche la PWA, et app iOS (SwiftUI + WKWebView + HealthKit) écrite mais pas encore installée sur l'iPhone. Nécessaires plus tard pour Apple Watch, widgets, Live Activity.

## Données
- **Sur l'appareil** : `localStorage` via l'objet `Store` (`core.js`, `data.js`) ; IndexedDB pour les photos de physique (`photos.js`, jamais synchronisées) et les photos de plats (`dishimg.js`, base `muscu_dishimg`, non synchronisée). Service worker `sw.js` pour le hors ligne.
- **Synchronisation** : Supabase (projet `muscu`, offre gratuite, région Europe). Table `docs` protégée par RLS (chaque utilisateur ne lit que ses lignes). Synchro au démarrage, toutes les 60 s et au retour du réseau ; en conflit, la dernière écriture gagne. La configuration publique (URL + clé « anon », publique par conception) est dans `dev/pwa_config.json`.
- **Migrations** : toujours douces (ajouter des champs, ne jamais casser l'ancien format).

## Services externes
| Service | Usage | Clé |
|---|---|---|
| Google Gemini | IA : saisie texte/photo, coach, recettes, plan de repas, bilan | Saisie par l'utilisateur dans Profil → IA, synchronisée, **jamais dans le code** |
| Pollinations | Photos réalistes des plats | Saisie dans Profil → Photos des plats, jamais dans le code |
| Open Food Facts | Code-barres et recherche de produits | Aucune |
| free-exercise-db | Photos d'exercices (jsDelivr, épinglé `@f00c92c`) | Aucune |
| Supabase | Synchro, et bientôt comptes Amis | Clé anon publique dans `pwa_config.json` |

Ordre des modèles Gemini : 3.8-flash → 3.5-flash → 3.5-flash-lite → flash-latest → flash-lite-latest → 3.1-flash-lite (passe au suivant si erreur 503).

## Fichiers sources (`dev/src/`) et domaine propriétaire
| Fichier | Domaine | Rôle |
|---|---|---|
| `core.js` | Commun | Store, calculs (BMR, poids, totaux du jour, dépense adaptative), `targets()`, `tDay()` |
| `data.js` | Commun | Base d'aliments et d'exercices, portions |
| `ui.js` | Commun / Design | Rendu, navigation, thème, écrans principaux (Aujourd'hui, Séance, Progrès, Profil) |
| `actions.js` | Commun | Actions des boutons (`data-act`), IA, minuteurs |
| `extras.js` | Muscu | Minuteur de repos, divers |
| `energy.js` | Muscu | Calories par série (Scott 2014) |
| `nutrition.js` | Nutrition | Ajustement hebdo, plan de repas, idées, besoins (ancienne `viewKitchen` remplacée par `cuisine2.js`) |
| `nutri2.js` | Nutrition | Type de jour, objectifs selon le jour, anneaux, objectif par repas, portion auto, ajout rapide, poids tendance |
| `fridge.js` | Cuisine | Frigo (articles, péremption, consommation) |
| `recipes.js` | Cuisine | Recettes perso |
| `cuisine2.js` | Cuisine | Navigation Cuisine, avec ce que j'ai, courses, budget, batch |
| `dishimg.js` | Cuisine / IA | Photos de plats |
| `program.js` | Muscu | Exercices de la salle, remplacements, refus 🚫, générateur |
| `fatigue.js` | Muscu | Charge, récupération, décharge |
| `body3d.js`, `anim.js`, `scene3d.js` | Muscu | Corps 3D, mannequin animé, salle 3D (Three.js 0.147) |
| `bilan.js`, `photos.js` | Progrès | Bilan hebdo, photos de physique |
| `scanner.js` | Nutrition | Scanner (code-barres, étiquette, photo) |
| `coachdata.js` | IA | Données du coach |
| `platform_pwa.js` / `platform_claude.js` | Commun | Accès IA et plateforme selon la cible |
| `spotify.js` | Divers | Barre musique Spotify (PWA) |
| `style.css` | Design | Section « Design system » en tête (Design), puis sections par domaine à la fin |
| `phone.js` | Design | Format téléphone sur grand écran (iPhone simulé, cadre `?inphone=1`) ; accroche dans `actions.js` (démarrage) et `platform_pwa.js` (mises à jour) |
| `theme.css`, `theme.js` (branche `sec/design-systeme`) | Design | Design system 2 par univers ; inactif sans `?ds=` dans l'adresse ; voir `docs/design-system.md` |
| `friends.js` (branche `sec/amis`) | Amis | Amis et partage |
| `programs2.js` (à créer) | Programmes | Programmes cardio, brûle-graisse, camp, abdos |

## Contrats entre domaines (ne pas renommer)
- **Nutrition expose** : `dayType(dateISO)` → `'muscu' | 'cardio' | 'sport' | 'repos'` ; `dayTargets(dateISO)` → `{kcal,p,g,l,c,f,type,cycle}` ; `tDay(dateISO)` = `targets()` complété par `dayTargets` (utilisé par l'IA).
- **Cuisine expose** : `pantryList()`, `pantryHas(nom)`, `pantryUse(nom, g)`.
- **Muscu → Nutrition** : une séance faite (ou commencée) ce jour-là donne le type « muscu ». **Programmes → Nutrition** : une séance de programme faite donne « cardio ».
- **Journal** : ajout d'un aliment via `makeEntry` + `saveDay` (Cuisine l'utilise pour « Mangé »).
- **Amis** : copie d'une diète recalculée selon les objectifs de celui qui copie (`dayTargets`).

## Tests (Playwright, Chrome)
- `dev/demo_seed.js` : données d'exemple réalistes (4 semaines de repas, pesées, séances, frigo, recettes, batch, prix), fonction `demoSeed()`. **Jamais incluses dans l'app** (un test le vérifie).
- `dev/testscenarios.py` : tests de bout en bout (76 vérifications) entre Nutrition, Cuisine, Muscu, IA sans clé et rechargement.
- Tests de domaine : `testnut2.py`, `testnut.py`, `testtoday.py` (Nutrition), `testcuisine.py` (Cuisine), `testmuscu.py`, `testanim.py`, `testprog.py` (Muscu), `testamis.py` (branche Amis), `testdesign.py` (branche design), `testdesign2.py` (contrastes du design system 2, branche `sec/design-systeme`). Depuis le design system 2, l'app s'ouvre sur l'Accueil et Coach/Profil ne sont plus dans la barre : passer par `nav button[data-v=home]` puis `.dsh-ib[data-v=coach|profile]`.
- Tests obsolètes (cassés avant les lots, à mettre à jour ou supprimer avec l'accord de Vuthy) : `test.py`, `test2.py`, `testrec.py`, `testnav.py`, `testui.py`, `testdish2.py`.
- Serveur local : `python3 -m http.server <port>` dans `dev/` ; Chrome : `/usr/bin/google-chrome` avec `--no-sandbox` dans les environnements cloud ; captures 390×844.
