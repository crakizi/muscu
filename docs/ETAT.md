# État du projet — source de vérité

_Mis à jour le 26/11/2026 (design system 2). Chaque session met à jour sa ligne et la date à chaque livraison ; la Coordination met à jour le reste à chaque publication._

## En ligne (`main`, https://crakizi.github.io/muscu)
Dernière publication : 27/11/2026 (design system 2 ; `main` avant publication : `45069f8`). Contenu : V1 à V1.8 + Nutrition lots 1-2, Cuisine lots 1-2, Muscu lot 1 + design system 2 (couleurs par univers, Accueil, barre 5 onglets) + format téléphone sur grand écran (27/11, corrigé pour Safari / app Mac le même jour). Détail : `docs/journal.md` et les fiches `docs/domaines/`.
Sauvegarde de l'état au 26/11 : bundle git complet `muscu-sauvegarde-2026-11-26.bundle` + projet natif `MuscuApp-natif-2026-11-26.tgz` dans `~/Applications/Muscu-sauvegardes/` sur le Mac ; branches `sauv/*` dans le bundle.

## Tâches par domaine
| Domaine | Branche | Statut | Dernier commit | Ce qui attend |
|---|---|---|---|---|
| Nutrition | `sec/nutrition` | En ligne (lot 2) | `c2fda6e` | Prochain lot : ramener « Mes besoins » dans Nutrition ; supprimer l'ancienne `viewKitchen` de `nutrition.js` (accord de Vuthy « ooui » via Cuisine) ; Aujourd'hui encore à 22 contrôles |
| Cuisine | `sec/cuisine` | En ligne (lot 2) | — | Alléger le Frigo (65 boutons) : un tap sur un aliment ouvre ses actions, frigo 3D derrière une icône ; retirer « Mes besoins » de Plan quand Nutrition l'a repris ; corriger le bug « Copier hier » (voir Bugs) |
| Muscu | `sec/muscu` | En ligne (lot 1) | `1560b59` | Rien de demandé ; idées dans `docs/feuille-de-route.md` |
| Programmes | `sec/programme` | Proposition faite, **attend Vuthy** | — (aucun code) | Valider la liste (zone 2, HIIT, Camp, Abdos, + option Course 0→5 km) et dire s'il veut une maquette du minuteur |
| Amis | `sec/amis` | Codé, **non fusionné** | `fcc2301` | Vuthy doit exécuter la partie AMIS de `dev/schema.sql` dans Supabase et activer les inscriptions ; puis test réel et fusion |
| Design | `sec/design-systeme` | **En ligne** (27/11) ; **format téléphone en ligne** (27/11) | voir branche | Design system 2 actif par défaut : Black Cherry, couleurs affirmées (style C), neutre + accents, Accueil + barre 5 onglets. Tests 77/77, Cuisine 28/28, Muscu 14/14, Nutrition testnut2 OK, contrastes 0 sous le seuil. Captures `dev/shots/design2/planche-5-*` |
| Design (Liftin') | `sec/design-liftin` | Remplacée par `sec/design-systeme` (formes Liftin' reprises) | `11888e8` | Ne pas fusionner telle quelle ; accent bleu remplacé par les couleurs par univers |
| Design (ancien) | `sec/design` | **Non retenu** (vert) | — | Garder en archive, ne pas fusionner |
| Tests | `test/lot2` | Vérifications déjà intégrées dans `main` | — | Mettre à jour ou supprimer les vieux tests cassés (accord de Vuthy requis) |

## Bugs connus
| Gravité | Domaine | Bug |
|---|---|---|
| Moyenne | Cuisine / Nutrition | « Copier hier retire du frigo » : 1 vérification échoue sur `main` (75/76 dans `testscenarios.py`) |
| Faible | Muscu | Photo de l'élévation latérale à la poulie = version assise à deux bras ; Bayesian curl et tirage prise large sans photo (3D affichée) ; photos indisponibles hors ligne (CDN) |
| Faible | Muscu (3D) | Pas de décor pour les dips ni de plateforme pour la presse ; mains un peu hautes au face pull |
| Faible | Tests | Tests obsolètes : `test.py`, `test2.py`, `testrec.py`, `testnav.py`, `testui.py`, `testdish2.py` |
| Faible | Tests | `testnut2.py` parfois instable (clic trop rapide dans « ⋯ ») |

## Décisions en attente de Vuthy
1. Design system 2 (`docs/design-system.md` §0) : ~~palette musculation~~ (Black Cherry choisie), ~~intensité~~ (couleurs affirmées, style C), ~~identité commune~~ (neutre + accents), ~~écran Accueil~~ (oui) ; ~~barre d'onglets~~ (validée le 27/11) ; intégré et **publié le 27/11** ; puis 2ᵉ passe (séance à grosses lignes, 5 onglets).
2. Liste des programmes cardio.
3. Activation des comptes Amis dans Supabase (c'est lui qui le fait, guidé pas à pas).
4. Faut-il garder le raccourci « Recette avec mon frigo » dans Aujourd'hui (retiré par Nutrition) ?
5. Vieux tests cassés : supprimer ou mettre à jour.
7. Clé Pollinations : Vuthy n'a peut-être jamais réussi à la coller dans Profil → Photos des plats (il ne pouvait pas la copier) ; aucune vraie photo de plat n'a été vérifiée. À refaire avec lui.
6. Nom de l'onglet « Séance » ou « Sport » (proposé par Design pour accueillir les Programmes).

## Dépendances entre domaines (à surveiller)
- `ui.js` est touché par Design (navigation), Nutrition (`views.today`), Muscu (cartes déplacées vers `program.js`), Amis (accroches) → fusionner un domaine à la fois.
- `needsHTML`, `mealPlanHTML`, `ideasHTML` vivent dans `nutrition.js` mais s'affichent dans Cuisine.
- La carte d'exercice de séance est dans `program.js` (Muscu) : la 2ᵉ passe Design de l'écran Séance doit se faire avec Muscu.
- Programmes enregistre ses séances dans `acts` → Nutrition les compte comme « cardio » (`actType` dans `nutri2.js`).
- Amis réutilise `replacementsFor` (Muscu) et les objectifs `dayTargets` (Nutrition) pour recalculer les copies.

## Annonces aux autres sessions
- 27/11 : **design system 2 publié**. Toutes les branches `sec/*` doivent fusionner `origin/main` avant leur prochaine tâche (nouvelle barre d'onglets, Accueil, jetons de couleur).
- 27/11 : design system 2 **intégré** sur `sec/design-systeme` : l'app s'ouvre sur l'**Accueil** ; barre Accueil · Nutrition · Cuisine · [Scanner] · Séance · Progrès ; **Coach et Profil** sont en icônes en haut de l'Accueil (les tests passent par là : voir `tab()` de `testscenarios.py`). Toute nouvelle couleur passe par un jeton (`docs/design-system.md` §6 et §10).
- 26/11 (soir) : **design system 2** sur `sec/design-systeme` (aperçu seulement, rien de publié). Nouvelles règles de couleur dans `docs/design-system.md` : plus de couleur en dur, jetons sémantiques, univers par écran (`data-u`), couleurs fonctionnelles fixes (macros, succès, erreur…). Les 3 palettes Nutrition / Cuisine / Progression sont validées.
- 26/11 : migration vers Claude Code. Nouvelles règles dans `CLAUDE.md` et `docs/regles.md` ; anciens fichiers d'organisation dans `docs/archive/`. Toute branche `sec/*` doit fusionner `origin/main` avant de reprendre.
