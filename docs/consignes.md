# Consignes en cours par section

_Écrites par la conversation Coordination (centre de contrôle). Chaque conversation lit **sa** partie, l'applique, puis dit « fait » ou « prêt à fusionner ». Règles communes et règle de simplicité : `claude/organisation-conversations.md`._

**22/11 au soir : version publiée.** Nutrition lots 1-2, Cuisine lots 1-2 et Muscu lot 1 sont maintenant sur `main` (en ligne). Avant de continuer, chaque section met sa branche à jour depuis `main` (`git fetch && git merge origin/main`). Amis, Design et Programmes partent aussi de `main`.

## Nutrition — lot 2 (22/11)
1. Fais le ménage dans l'écran Aujourd'hui : compte les boutons et les textes visibles, et replie ou retire ce qui n'est pas essentiel. Montre un avant/après à Vuthy.
2. Bilan de la semaine en une carte courte et neutre : poids tendance, apport moyen, nouvel objectif et pourquoi, en 3 lignes au maximum.
3. Une séance commencée mais pas finie compte déjà comme jour muscu (garder comme ça).
- Propose à Vuthy, avant de coder, tout ce qui n'est pas dans cette liste.

## Cuisine — lot 2 (22/11)
1. Il y a aujourd'hui deux rangées d'onglets dans Cuisine, et Batch et Budget sont cachés à droite. Simplifie en une seule navigation claire. Montre un avant/après à Vuthy.
2. « Copier hier » retire aussi du frigo les aliments qui y sont.
3. Préparer un batch retire ses ingrédients du frigo. Ensuite, « Mangé » ne retire plus rien.
4. « Mangé » sur un batch note le repas au jour affiché dans le journal, pas forcément aujourd'hui.

## Muscu — lot 1 (22/11)
1. Rends la base d'exercices plus détaillée sans alourdir l'écran : muscles ciblés et variantes en poids libre, machine et poulie, avec ce que chaque variante change. Images possibles : free-exercise-db (domaine public).
2. La saisie d'une série doit se faire en 1 à 2 taps (vérifie, puis simplifie si besoin).
- Laisse la salle personnalisée de côté (en pause).
- Montre des captures à Vuthy avant de pousser.

## Programmes — lot 1 (22/11)
Crée la partie Programmes hors musculation : brûle-graisse, cardio, « camp » et abdos.
1. Propose d'abord à Vuthy une liste courte de programmes (5 au maximum) et comment on les suit (minuteur, intervalles), en t'inspirant des meilleures apps.
2. Après sa validation, code dans `programs2.js`. Une séance faite doit compter comme jour cardio (`dayType`) pour la nutrition.

## Design — lot 1 (22/11)
Tu gères l'esthétique de toute l'app : couleurs, typographie, espacements, icônes, composants communs, clair/sombre, navigation et cohérence entre toutes les sections. La règle de simplicité est ta priorité.
1. Fais d'abord un audit de l'app actuelle (crakizi.github.io/muscu ou build local), écran par écran : ce qui est trop chargé, incohérent ou peu lisible.
2. Propose un design system court (palette, typo, 5 à 6 composants) et la structure de navigation, avec des maquettes avant/après de 3 écrans clés : Aujourd'hui, Séance, Cuisine. Inspire-toi des apps les plus épurées de nos analyses (MacrosFirst, Strong, Hevy, Lifesum ; voir `claude/analyse-apps-iphone-en-cours.md`).
3. Ne code rien avant que Vuthy ait validé les maquettes.

## Amis — lot 1 (22/11)
Base : section 10 du cahier des charges (`claude/cahier-des-charges.md`), mais en version **simple** (règle n°1). Le social doit être **facultatif, privé par défaut et désactivable entièrement**.
1. Propose d'abord à Vuthy le strict minimum utile, en 1 écran Amis : ajouter un ami (code ou lien d'invitation), voir ce qu'il partage, copier en 1 tap une séance, une recette, un repas ou une diète. Pas de « j'aime », commentaires ni classements dans ce lot sauf si Vuthy le demande.
2. Prévois la technique : comptes multi-utilisateurs Supabase (tables profils publics, amitiés, partages), règles RLS (un ami ne lit que ce qui est partagé avec lui), rien de privé partagé par défaut. Écris le SQL dans `dev/schema.sql` sans l'exécuter : Vuthy l'appliquera lui-même dans Supabase.
3. Ne code rien avant la validation de Vuthy. Ensuite, code dans un nouveau fichier `friends.js`, en réutilisant les fonctions de copie existantes (journal, recettes, séances).

## Test — en continu (22/11)
Tu es le testeur. Tu ne codes pas de fonctions, tu vérifies que tout marche ensemble.
1. Tu maintiens `dev/demo_seed.js` (données d'exemple réalistes, jamais incluses dans l'app) et `dev/testscenarios.py` (69 vérifications de bout en bout aujourd'hui).
2. Quand Vuthy te dit qu'une section est prête, récupère sa branche (`sec/<section>`), fusionne-la **dans une branche de test temporaire** avec `integ-lot1`, puis lance tous les tests. Ajoute des vérifications pour les nouvelles fonctions de cette section.
3. Vérifie aussi la simplicité : sur chaque écran modifié, compte les boutons et textes visibles et signale ce qui dépasse la règle n°1. Prends des captures.
4. Rapport court à Vuthy : vérifications réussies/échouées, bugs (gravité, section responsable), écrans trop chargés. Corrige seulement les très petits bugs évidents (commit séparé) ; le reste est renvoyé à la section concernée.
5. Tu ne publies jamais et ne pousses jamais sur `main` : c'est la Coordination qui fusionne et publie.
