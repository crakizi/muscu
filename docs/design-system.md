# Design system

_Référence pour toutes les sessions. Mis à jour le 26/11/2026 (design system 2, branche `sec/design-systeme`, **aperçu non publié**)._

## 0. Où en est-on ?
| Sujet | Statut |
|---|---|
| Formes façon **Liftin'** (cartes très arrondies, grands titres, police système, barre floutée) | ✅ Validé (26/11) — gardé dans le design system 2 |
| Palettes **Nutrition** (Deep Ocean), **Cuisine** (Warm Earth), **Progression** (Slate Blue) | ✅ Validées par Vuthy (26/11) |
| Palette **Musculation** : **Black Cherry (option 19)** | ✅ Choisie par Vuthy (26/11, « je choisi black cherry ») ; les 4 autres restent dans l'aperçu pour mémoire |
| **Identité commune** (accueil, barre d'onglets, profil, réglages) : **neutre + accents par univers** (« contextuel ») | ✅ Choisie par Vuthy (26/11, « Neutre + accents ») : surfaces neutres, l'onglet actif prend la couleur de son univers. Neutre seul et bleu pétrole écartés |
| **Intensité** : couleurs **affirmées** demandées (« pas assez prononcé ») d'après sa maquette : fonds bien teintés, grande carte profonde par univers, boutons pastel pleins à texte profond → style **C renforcé** | ✅ Direction validée (26/11) ; C est la valeur par défaut de l'aperçu. A et B restent comparables |
| Accent unique bleu `#1f6bff` (`sec/design-liftin`, choisi le 26/11 en journée) | ⚠️ Remplacé par les couleurs par univers ; le bleu du logo reste possible pour la marque (identité commune non tranchée) |
| **Écran Accueil** + barre à 5 onglets (Accueil · Nutrition · Cuisine · [Scanner] · Séance · Progrès) ; Coach et Profil en icônes en haut de l'accueil | ✅ Accueil validé par Vuthy (26/11, « Oui, l'accueil ») ; la barre est une proposition de Coordination visible dans l'aperçu, à confirmer en le regardant |
| Personnalisation par l'utilisateur (mode, palette muscu, intensité) | 🧩 Architecture prête, **pas** dans les réglages avant validation |

## 1. Comment voir et comparer (sans toucher au code)
- Page **`dev/apercu-design.html`** : elle affiche la **vraie app** dans des cadres avec des **données de démonstration** (`dev/demo_seed.js`). Boutons : palette muscu, intensité A/B/C, clair/sombre, identité commune, écran (accueil, nutrition, cuisine, séance, séance en cours, minuteur de repos, progression, profil, fenêtre d'ajout), vues côte à côte (5 palettes, 3 intensités, 4 univers, écrans communs, mobile/ordinateur, avant/après), et « Actuel (en ligne) » pour revenir au design actuel.
- Lancement : serveur local sur le dossier `dev/` (config `apercu-design` de `.claude/launch.json` sur le Mac, port 8790), puis http://localhost:8790/apercu-design.html. La page **refuse de tourner hors localhost** (sinon les données de démo pourraient se mélanger aux vraies).
- Planches fixes : `dev/shots/design2/planche-*.png` (régénérées par `dev/testdesign2.py`).

## 2. Architecture des jetons (`dev/src/theme.css`)
Le fichier est concaténé **après** `style.css` par `build.py`. **Tout est sous `html[data-ds]`** : sans cet attribut, l'app est strictement identique (vérifié par `testdesign2.py`). `dev/src/theme.js` pose l'attribut **seulement** si l'adresse contient `?ds=` (aperçu) ; il n'écrit rien dans le stockage.

| Couche | Exemples | Règle |
|---|---|---|
| 1. Primitives | `--ocean-900`, `--earth-600`, `--ruby-200`, `--n-500`, `--d-card` | Valeurs d'origine des palettes. Ne jamais les utiliser directement dans un composant. |
| 2. Rôles par univers | `--nut-*`, `--cui-*`, `--mus-*`, `--pro-*`, `--com-*` : `deep`, `accent`, `mid`, `soft`, `pastel`, `wash`, `on`, `*-dk` | Un univers = un jeu de rôles. La palette muscu choisie remplit `--mus-*` (`data-ds-muscu`). |
| 2b. Univers courant | `--u-*` | Recopié depuis le rôle selon `data-u` (posé sur `<html>` par écran, ou sur n'importe quel élément : ex. les cartes de l'accueil). |
| 3. Sémantique | `--surface-page`, `--surface-card`, `--surface-soft`, `--surface-sunken`, `--text-1`, `--text-2`, `--border`, `--separator`, `--action`, `--on-action`, `--action-soft`, `--on-action-soft`, `--accent`, `--title`, `--focus`, `--chart-1..3` | **Ce que les composants utilisent.** Recalculé partout où `data-u` change. |
| 3b. Alias historiques | `--bg`, `--card`, `--txt`, `--mut`, `--line`, `--chip`, `--acc`, `--acc2`, `--grad`, `--kc`, `--p/--c/--f`, `--red/--org/--grn` | Branchés sur la couche 3 : tout le code existant suit sans modification. |
| 4. Modes et intensités | `.dark`, `data-ds-style=a|b|c`, `.ds-hero` | Le sombre n'est pas une inversion : fond commun `#0F1114`, surfaces `#181B20`/`#20242A`, accents éclaircis (`*-dk`). |
| Fonctionnel | `--fn-ok/err/warn/info`, `--fn-record`, `--fn-up/down`, `--mac-p/c/f/fib`, `--musc-prim/sec`, `--rec-ok/mid/low` | **Indépendant des univers** (voir §4). |
| Fondations | `--font`, `--fs-xs…2xl`, `--fw-*`, `--sp-1…6` (4/8/12/16/24/32), `--r-sm/md/lg/pill` (10/14/20/999), `--dur-fast/--dur/--ease`, `--elev-1/2` | Communes à tous les univers. |

Attributs sur `<html>` : `data-ds` (allumé), `data-u` (univers de l'écran), `data-ds-muscu` (`cherry|ruby|pome|graphite|carbon`), `data-ds-style` (`a|b|c`), `data-ds-commun` (`neutre|petrole|contextuel`), classe `dark`.
Dans l'aperçu, l'app s'ouvre sur l'**Accueil** (`S.tab = "home"`) ; la barre d'onglets devient Accueil · Nutrition · Cuisine · [Scanner] · Séance · Progrès (`dsNavHTML`), l'onglet « Aujourd'hui » s'appelle « Nutrition », Coach et Profil sont en icônes en haut de l'accueil (barre 7 → 5 onglets + Scanner).
Univers par écran : Accueil → `commun`, Aujourd'hui → `nutrition`, Cuisine → `cuisine`, Séance → `muscu`, Progrès → `progression`, Coach/Profil/barre d'onglets/accueil → `commun`. Le minuteur de repos garde la couleur muscu sur tous les onglets.
Valeurs par défaut de l'aperçu : Black Cherry et style C (choix de Vuthy) ; identité commune « contextuel » (choix de Vuthy).

## 3. Les palettes et leurs rôles
| Univers | deep (actions) | accent (texte) | mid (graphiques) | pastel | wash (fond) | Sombre : accent / bouton |
|---|---|---|---|---|---|---|
| Nutrition — Deep Ocean ✅ | `#103B49` | `#1A6F75`* | `#208A91` | `#BBD9DD` | `#EDF4F5` | `#6EB2B7`* / `#BBD9DD` (texte `#103B49`) ; teinte `#172B36` |
| Cuisine — Warm Earth ✅ | `#81543D` | `#81543D` | `#B77C55` | `#EBD6C1` | `#F6EFE6` | `#D4AB86` / `#D4AB86` (texte `#2B1A10`*) |
| Progression — Slate Blue ✅ | `#303E5C` | `#526889` | `#526889` | `#C6D2E4` | `#EDF0F6` | `#8296B5` / `#C6D2E4` (texte `#303E5C`) |
| Muscu 19 Black Cherry ✅ choisie | `#702D44` | `#702D44` | `#702D44` | `#DFC0CE` | `#F6EAF0` | `#DFC0CE` / `#DFC0CE` |
| Muscu 21 Ruby ⏳ | `#A12C53` | `#A12C53` | `#A12C53` | `#F1C9D8` | `#FCEFF4` | `#DE88A6`* / `#F1C9D8` |
| Muscu 22 Pomegranate ⏳ | `#B34559` | `#B34559` | `#B34559` | `#F1CED5` | `#FBEFF1` | `#DD8998` / `#F1CED5` |
| Muscu 25 Graphite ⏳ | `#181818` | `#383838` | `#383838` | `#C7C7C7` | `#F0F0F0` | `#C7C7C7` / `#F0F0F0` |
| Muscu 28 Carbon Yellow ⏳ | `#20211D` (texte jaune `#E9DB76`) | `#494B39` | `#C7BA49` | `#E9DB76` | `#F7F5E5` | `#C7BA49` / `#E9DB76` |
| Commun neutre (proposition) | `#1F2329` | `#1F2329` | `#4A515C` | `#DADDE2` | `#F3F4F6` | `#E6E8EB` |
| Commun bleu pétrole (proposition) | = Nutrition | | | | `#F1F5F6` | = Nutrition |
| Commun contextuel ✅ choisi | = neutre, mais l'onglet actif de la barre prend la couleur de son univers | | | | | |

\* Nuances **dérivées** pour l'accessibilité (les couleurs d'origine restent dans les primitives) : `#1A6F75` (turquoise assombri : `#208A91` ne fait que 4,1:1 sur blanc), `#6EB2B7` (mélange turquoise/pastel), `#2B1A10` (texte sur sable), `#DE88A6` (rubis éclairci pour le sombre), `#5E3A28` (carte principale Cuisine en style C).
Les teintes « 900 » des palettes muscu (`#361923`, `#50182D`, `#58232D`…) servent aux cartes principales du style C et au minuteur de repos.

## 4. Couleurs fonctionnelles (identiques dans tous les univers)
| Rôle | Clair | Sombre | Règle |
|---|---|---|---|
| Succès / objectif atteint | `#2E7D4F` | `#6CC495` | Toujours avec ✓ ou un texte |
| Erreur | `#C8372D` | `#F2867C` | Seulement pour une vraie erreur, avec texte. Jamais pour « dépassé » (règle 3 : gris neutre) |
| Avertissement | texte `#9A5B00`, pastille `#E9A23B` | `#F0B44C` | Avec « ! » ou texte |
| Information | `#2F5FB3` | `#8DB2F0` | |
| Record personnel | `#A0710A` | `#E8C15A` | Toujours avec 🏆 ou « record » |
| Évolution positive / négative | succès / **gris neutre** | | ▲ ▼ toujours affichés ; jamais de rouge pour une baisse |
| Protéines / Glucides / Lipides / Fibres | `#4F6BED` / `#B87512` / `#9B6BDF` / `#3F8A5D` | `#8EA2F5` / `#E9A23B` / `#B99AEE` / `#6CC495` | Toujours avec le nom ou P/G/L |
| Muscle principal / secondaire | `#C8553D` / `#E3A15A` | `#EE8A70` / `#F2BE7E` | Anatomie et étiquettes de muscles |
| Récupération ok / en cours / fatigué | `#3F9C6B` / `#E3A15A` / `#C8553D` | éclaircis | Avec texte (« récupéré », « 48 h »…) |

Pourquoi : une palette muscu rouge ne doit pas faire ressembler les boutons à des erreurs (les boutons muscu sont bordeaux/framboise profonds, l'erreur est un rouge-orangé avec texte) ; Carbon Yellow met le jaune en **texte sur fond noir**, jamais en fond de toutes les actions (le jaune resterait « avertissement »).

## 5. Les trois intensités
- **A — Minimaliste** : fond neutre légèrement teinté de l'univers, cartes blanches, couleur seulement sur les actions et repères.
- **B — Immersif** : fond et cartes teintés, puces et cartes secondaires colorées, titres colorés.
- **C — Premium contrasté (renforcé, retenu)** : d'après la maquette de Vuthy du 26/11. Fond bien teinté (pastel 30 % + fond de l'univers), cartes légèrement teintées, **une carte principale profonde** (`.ds-hero` : anneaux du jour, exercice en cours, frigo « à finir vite », graphique de poids), boutons secondaires **pastel pleins** avec texte profond, titres en couleur profonde. Accueil : une tuile par univers (titre coloré, carte profonde avec icône, valeur, barre, bouton « Consulter » pastel).
Répartition visée (direction, pas une règle) : ~60 % surfaces neutres/teintées, ~30 % couleurs secondaires (pastels), ~10 % accents profonds.

## 6. Règles de design (pour toutes les sessions)
1. **Aucune couleur en dur** dans un composant : utiliser les jetons sémantiques (couche 3) ou fonctionnels. Nouvelle couleur = nouveau jeton documenté ici.
2. Un écran appartient à **un univers** (`data-u`) ; les écrans communs restent `commun`. Un élément d'un autre univers posé ailleurs (ex. carte Cuisine sur l'accueil) porte son propre `data-u`.
3. Une seule action « pleine » (`--action`) par zone ; les autres en `button.sec` (`--action-soft`) ou `ghost`.
4. Jamais d'information **par la couleur seule** (icône, signe ou texte en plus).
5. Pas de dégradé (l'ancien `--grad` est maintenant une couleur pleine), ombres légères (`--elev-1`), pas d'écran entièrement blanc ou entièrement noir.
6. Transitions courtes (`--dur` 200 ms) et respect de « réduire les animations » du téléphone.
7. Mêmes formes partout (arrondis, espacements, icônes, barre d'onglets) : seule la couleur change d'un univers à l'autre.

## 7. Accessibilité (WCAG 2.2 AA)
- Seuils : texte ≥ 4,5:1 ; gros texte et éléments graphiques (anneaux, pastilles, bouton Scanner) ≥ 3:1 ; focus clavier visible (`outline` 2 px `--focus`).
- Vérification automatique : `dev/testdesign2.py` mesure les contrastes **réels dans l'app** pour 5 palettes × 3 intensités × 2 modes × 3 identités × 8 écrans. Rapport : `docs/rapport-accessibilite-design.md` (26/11 : **0 sous le seuil** ; ~2 100 mesures depuis l'accueil en tuiles).
- Toute nouvelle combinaison (nouvel écran, nouvelle palette) doit repasser ce test.

## 8. Composants partagés (classes existantes, branchées sur les jetons)
`.card` (+ `.ds-hero`), `button` (principal), `button.sec`, `button.ghost`, `button.danger`, `.chip` / `.chip.on`, `.seg`, `.stepper`, `.scale`, `input/select/textarea`, `.banner`, `.reco`, `.tag` (+ `.red/.grn/.org/.soon`), `.toast`, `.sheet`, `nav.tabs` (+ `.scanbtn`), `.wd` (jours), `.ktab` (onglets Cuisine), `.ring` / `.mring` (anneaux), `.bar`, `.restbar` (minuteur), `.musc` (anatomie), `.mtag` (muscles), `.gh` (▲ ▼), `.avatar`. Accueil (proposition) : `.dsh-grid`, `.dsh-card`, `.dsh-hero`.

## 9. Personnalisation future (prête, non activée)
Les choix tiennent en 4 valeurs : mode (`clair|sombre|auto`, existe déjà dans Profil), `muscu`, `style`, `commun`. Pour les proposer un jour : un réglage « Apparence » qui appelle `dsSet({...})` et mémorise les valeurs (avec « Réinitialiser » = valeurs par défaut). **À ne pas ajouter avant le choix de Vuthy** ; l'expérience par défaut ne doit pas changer.

## 10. Conventions pour la suite
- Code d'un domaine : n'utiliser que `var(--…)` sémantiques ; si l'écran a une carte principale, la marquer (aujourd'hui `theme.js` la devine).
- Graphiques Chart.js : couleurs encore en dur dans `ui.js` (`drawCharts`) ; l'aperçu les remplace à la volée (`dsCharts`). À l'intégration : lire les jetons `--chart-*` au lieu des hex.
- Intégration définitive (après validation) : supprimer la condition `?ds` dans `theme.js`, retirer les anciens jetons de tête de `style.css`, puis nettoyer les couleurs en dur listées dans l'audit (§11) domaine par domaine.

## 11. Audit du design actuel (26/11/2026, version en ligne)
- **Une seule couleur pour tout** : bleu `#2563eb` + dégradé bleu→indigo sur tous les boutons, puces et onglets ; aucun repère d'univers (nutrition, cuisine, séance se ressemblent).
- **Conflits de sens** : protéines = même bleu que les boutons ; glucides = même orange que les avertissements ; muscles sollicités en rouge « erreur ».
- **Couleurs en dur** : 42 couleurs différentes dans `style.css` (dont une quinzaine hors jetons : minuteur `#111827` + dégradé bleu/violet, ombres bleues, étiquettes rouges/vertes/oranges, ▲▼ rouge/vert, violet de la « séance fantôme ») ; ~35 dans le JS (`ui.js` graphiques et pastilles roses `#fde8ef`, `#22c55e`, Spotify `#1db954` ; `scene3d.js` / `body3d.js` décor 3D ; `recipes.js`, `scanner.js`) ; plus de 200 attributs `style="…"` dans les vues.
- **Sombre** : simple inversion de quelques jetons ; décors 3D (frigo, salle) restent clairs.
- **Dépendances** : `ui.js` (navigation, Progrès, Profil) est partagé ; anneaux dans `nutri2.js` (Nutrition), cartes de séance dans `program.js` (Muscu), Cuisine dans `cuisine2.js`/`fridge.js`. Le design system 2 ne modifie **aucun** de ces fichiers (seuls ajouts : `theme.css`, `theme.js`, 2 lignes dans `build.py`).
- **Limites de l'aperçu** : décors 3D (frigo, salle) et photos d'exercices non recolorés ; emojis encore présents dans certains titres ; l'accueil est une proposition (pas d'écran Accueil dans l'app aujourd'hui).

## Historique
- 22/11 : direction verte (`sec/design`) — non retenue.
- 26/11 (journée) : direction Liftin' (`sec/design-liftin`), accent bleu choisi.
- 26/11 (soir) : design system 2 par univers (`sec/design-systeme`) : 3 palettes validées ; puis Black Cherry choisie pour la muscu et couleurs affirmées (style C renforcé, accueil en tuiles) d'après la maquette de Vuthy. Puis identité commune « neutre + accents par univers » choisie.

## Références visuelles
Captures réelles des apps concurrentes (privées, sur le Mac) : `~/Applications/WDA/_shots/galerie-muscu.jpg`, `galerie-nutrition.jpg`, et `liftin/` (10 écrans de Liftin').
