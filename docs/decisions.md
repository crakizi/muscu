# Décisions validées et idées abandonnées

_Ne contient que ce que Vuthy a réellement validé (sa réponse entre guillemets quand elle est connue). Les simples propositions de Claude sont dans `docs/ETAT.md` (« en attente ») ou les fiches de domaine._

## Produit
| Date | Décision | Réponse de Vuthy |
|---|---|---|
| 17/11 | PWA gratuite, hors ligne, synchro Supabase, IA Gemini avec clé saisie dans l'app | cahier des charges V1 |
| 17/11 | Objectif calorique ajusté chaque semaine selon le poids réel (façon MacroFactor) | cahier des charges V1 |
| 20/11 | Amis = fusion Hevy (social, muscu) + MyNetDiary (confidentialité, nutrition) ; privé par défaut | section 10 du cahier |
| 21/11 | On code d'abord pour Vuthy seul ; multi-comptes et public plus tard | journal V1.8 |
| 21/11 | Photos de plats via Pollinations, clé dans Profil | journal V1.8 |
| 22/11 | Positionnement : app nutrition pensée pour les sportifs, muscu détaillée, les deux reliées ; nutrition et sport soignés autant l'un que l'autre ; « tout-en-un mais pas trop lourd » | vision du 22/11 |
| 22/11 | Gratuit pour tout ce qui n'utilise pas l'IA ; IA payante (elle coûte) | vision du 22/11 |
| 22/11 | Salle personnalisée (photos, matériel) **en pause** jusqu'à ce que le reste soit au point | vision du 22/11 |
| 22/11 | Règle n°1 simplicité (« pas mille boutons, mille trucs à lire ») ; règle n°2 s'inspirer des meilleures apps « en y ajoutant notre touche » | messages du 22/11 |
| 22/11 | Économiser les tokens | « je veux bien économiser les tokens » |
| 22/11 | Fiche Nutrition + Cuisine validée | « oui c'est bien » |
| 22/11 | Copier hier retire du frigo ; préparer un batch retire ses ingrédients (puis « Mangé » ne retire plus rien) ; « Mangé » d'un batch au jour affiché ; séance commencée = jour muscu | consignes collées (valant validation) |
| 22/11 | Budget saisi à la main ; objectif du jour suit la séance prévue puis faite ; note façon Yuka reportée | choix par défaut non contestés |
| 22/11 | « Mes besoins » revient dans Nutrition ; supprimer l'ancienne `viewKitchen` | « ooui » (conversation Cuisine) |
| 22/11 | Pastille poids = tendance seule | « oui » (conversation Nutrition) |
| 22/11 | Muscu lot 1 (fiche exercice, 1 tap) poussé | « oui » (conversation Muscu) |
| 22/11 | Publication des lots 1-2 | « publie » |
| 22/11 | Amis : profil en 2 parties (🍽️ Alimentation, 🏋️ Sport), partage « sur mon profil », profil privé (code + acceptation) ou public (pseudo, sans validation), copie de diète recalculée selon ses objectifs | conversation Amis |
| 26/11 | Design inspiré de **Liftin'** | « j'aime bcp le design de lifting » |
| 26/11 | Accent du design : **bleu** `#1f6bff` (sombre `#3d86ff`), l'orange est écarté — **remplacé le soir même** par les couleurs par univers (ligne suivante) | « Bleu » |
| 26/11 | Design system par univers : palettes **validées** Nutrition = Deep Ocean (`#103B49 #208A91 #BBD9DD #EDF4F5 #172B36`), Cuisine = Warm Earth (`#81543D #B77C55 #D4AB86 #EBD6C1 #F6EFE6`), Progression = Slate Blue (`#303E5C #526889 #8296B5 #C6D2E4 #EDF0F6`) ; muscu : 5 finalistes (19, 21, 22, 25, 28) non tranchées ; identité commune non tranchée ; app premium, ni toute blanche ni toute noire, adaptée hommes et femmes, couleurs fonctionnelles indépendantes, WCAG AA | cahier « Direction artistique » du 26/11 (« palettes officiellement validées ») |
| 26/11 | Palette musculation : **Black Cherry** (option 19) ; couleurs **affirmées** comme sa maquette (fonds teintés, grande carte profonde par univers, boutons pastel) → style C renforcé | « je choisi black cherry » ; « pas assez prononcé […] on voit vrmt le contraste de couleur jaie bcp » |
| 26/11 | Identité des écrans communs : **neutre + accents par univers** (onglet actif à la couleur de son univers) | « Neutre + accents » |
| 26/11 | Écran **Accueil** en tuiles par univers (d'après sa maquette) ; il devient le premier onglet | « Oui, l'accueil » |
| 27/11 | Barre d'onglets : Accueil · Nutrition · Cuisine · [Scanner] · Séance · Progrès ; Coach et Profil en icônes en haut de l'accueil ; « Aujourd'hui » renommé « Nutrition » | « Oui, elle me va » |
| 26/11 | Migrer tout le développement vers Claude Code, spécialisation par domaine et coordination centrale | demande du 26/11 |

## Idées abandonnées ou refusées
| Idée | Raison |
|---|---|
| Diète ON/OFF manuelle (FitSelf) | Vuthy n'en veut pas ; remplacée par le type de jour automatique |
| Pollinations sans clé | 1 image / 45 s puis « Free limit reached » |
| Design vert (`sec/design`) | « jaime pas le rendu » ; remplacé par la direction Liftin' |
| Une conversation claude.ai par section coordonnée à la main | trop de copier-coller, compactage fréquent |
| Tâches planifiées par section | bloquées sans accord, jugées « galère » |
| Fil social imposé, j'aime, commentaires, classements (lot 1 Amis) | règle de simplicité ; le social doit être facultatif |
| Roue de réduction, compte à rebours, paywall avant usage, demande de note précoce, « IMC surpoids » | pratiques détestées dans les apps analysées |
| Calories par photo comme méthode principale | sous-estimation ≈ 33 % ; l'IA doit découper en aliments modifiables |
| Calories de la montre ajoutées telles quelles | ≈ 28 % d'erreur ; la dépense vient du poids tendance et des apports |
| Bouton « Recette avec mon frigo » dans Aujourd'hui | doublon (retiré par Nutrition, à confirmer par Vuthy) |
| Photo « Penché vers la poulie » | montrait le mauvais mouvement |
