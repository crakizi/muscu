# Design system

## Direction choisie
Vuthy aime beaucoup le design de **Liftin'** (26/11/2026) : style apps natives Apple. La proposition verte précédente (`sec/design`) n'a **pas** été retenue.

Ce qu'on reprend de Liftin' (sans copier sa marque, ni son rose) :
- fond gris très clair (noir en sombre), beaucoup d'air ;
- grands titres gras façon iOS ;
- cartes blanches très arrondies avec ombre légère ;
- **une seule couleur d'accent**, utilisée avec parcimonie ;
- grandes cartes illustrées pour les séances ;
- grosses lignes de séries lisibles (« 6 × 20 kg »), cercle à gauche : 1 tap = série faite ;
- minuteur de repos en pilule en bas ;
- barre d'onglets iOS simple (icône + libellé), police système.

## Jetons (branche `sec/design-liftin`, en tête de `dev/src/style.css`)
| Jeton | Clair | Sombre |
|---|---|---|
| `--bg` | `#f2f2f7` | `#000` |
| `--card` | `#fff` | `#1c1c1e` |
| `--txt` / `--mut` | `#111114` / `#8a8a8e` | `#f5f5f7` / `#8e8e93` |
| `--line` / `--chip` | `#e6e6eb` / `#ebebf0` | `#2c2c2e` |
| `--acc` (A, défaut) | `#1f6bff` (bleu du logo) | `#3d86ff` |
| `--acc` (B, `html[data-accent=orange]`) | `#ff6a1f` | `#ff7a33` |
| Macros | P `#2563eb`, G `#f59e0b`, L `#a855f7` | idem |
| Rayons | carte 22px, contrôle 14px, pilule 999px | |
| Espacements | 4 / 8 / 12 / 16 / 24 px | |
| Police | `-apple-system, "SF Pro Text", Inter, system-ui` | |

Composants : `.card`, bouton principal (capsule accent), `button.sec` (gris, texte accent), `button.ghost`, champs remplis sans bordure, `.chip`, `.seg` (contrôle segmenté), `nav.tabs` (barre floutée), `.entry` (liste), `.ring` (anneaux), `.set` (ligne de série), pilule de repos.

## Décisions en attente de Vuthy
1. **Accent** : A bleu ou B orange.
2. **2ᵉ passe** (recommandée, car la 1ʳᵉ reste loin de Liftin') : écran Séance à très grosses lignes de séries (1 tap), réglages (RIR, ±) repliés, carte illustrée par séance du programme ; **5 onglets** au lieu de 7 (iOS en recommande 5 au maximum), par exemple Aujourd'hui · Séance · Cuisine · Progrès · Profil, Coach et Scanner ailleurs.
3. Couleur de l'anneau kcal (turquoise, venant de Nutrition) à harmoniser avec l'accent.

## Références visuelles
Captures réelles des apps concurrentes (privées, sur le Mac) : `~/Applications/WDA/_shots/galerie-muscu.jpg`, `galerie-nutrition.jpg`, et `liftin/` (10 écrans de Liftin'). Planche avant/après de la 1ʳᵉ passe : `dev/shots/design/` sur la branche `sec/design-liftin`.
