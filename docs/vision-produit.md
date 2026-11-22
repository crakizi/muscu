# Vision produit — app muscu + nutrition grand public

_Décidée par Vuthy le 22 novembre 2026. Elle complète le cahier des charges (`claude/cahier-des-charges.md`), dont la section 10 (amis et partage) reste valable._

## Le principe
- **Un tout-en-un pas lourd** : une partie **Nutrition** et une partie **Sport**, aussi soignées l'une que l'autre, **reliées entre elles** selon les besoins de la personne. Pas deux apps collées ensemble.
- L'accent est mis sur ce qui marche le mieux, c'est-à-dire la nutrition (voir « Pourquoi la nutrition d'abord » plus bas), sans délaisser le sport.
- La méthode : reprendre les meilleures fonctions et le meilleur design des apps analysées (`claude/synthese-demandes-utilisateurs.md`, rapport de tests iPhone), les améliorer selon les attentes des utilisateurs, et tout personnaliser **sans en faire trop**.
- L'IA est la partie payante (elle a un coût). Le reste est gratuit, sans pub.

## Les parties
1. **Nutrition** : journal, base d'aliments, diète ultra personnalisée selon les préférences, les goûts, les besoins et **surtout le sport fait ou non** ce jour-là.
2. **Cuisine** :
   - frigo (inventaire) ;
   - recettes avec ce qu'on a à la maison ;
   - liste de courses reliée à la diète **et** au budget.
3. **Sport, musculation** :
   - programmes personnalisés ;
   - base d'exercices détaillée avec vidéos et explications ;
   - muscles ciblés ;
   - variantes en poids libre, machine ou poulie.
4. **Sport, autres programmes** : brûle-graisse, cardio, « camp », abdos.
5. **Amis** :
   - partager ses plats, sa diète, ses entraînements et ses recettes ;
   - copier les entraînements, recettes et repas des autres.
6. **Personnalisation (le lien)** : le profil, les objectifs et les séances réelles pilotent la diète. La phase nutritionnelle pilote les conseils d'entraînement.
7. **Salle personnalisée** (photos, description, matériel disponible → programmes très précis) : **en pause**. On la reprend quand le reste est au point.

## Ce qui nous distingue (vérifié le 22/11/2026)
- **Les fonctions prises une par une existent déjà ailleurs.**
  - Amis et copie de séances : Hevy.
  - Copie de repas entre amis : MyFitnessPal. Il n'y a pas de vrai partage de recettes, et le fil d'actualité a été retiré en 2024.
  - Frigo + recettes + liste de courses avec budget : beaucoup d'apps de cuisine (Forkcast, IngrediPal, Cooklist, Chef AI…).
- **Ce qui n'existe pas, c'est l'ensemble réuni dans une seule app pour les sportifs.**
  - Partage social qui couvre à la fois les séances et la nutrition (repas, recettes, diètes).
  - Frigo, courses et budget reliés à une diète qui suit les séances réelles.
  - Base muscu détaillée, puis plus tard la salle personnalisée.
- Le social doit pouvoir être désactivé entièrement et rester privé par défaut. Beaucoup d'utilisateurs rejettent un social imposé.

## Pourquoi la nutrition d'abord
- Les apps de calories rapportent bien plus que celles de muscu. MyFitnessPal a fait environ 310 M$ en 2023 et Cal AI de 30 à 40 M$ par an en moins de 2 ans. Hevy, leader muscu, serait autour de 1 M$ par mois (estimation Adapty).
- La musculation, elle, distingue l'app et fidélise ses utilisateurs.

## Organisation du travail
- Un agent par partie, chacun avec une fiche (périmètre, fonctions, critères « terminé »).
- Un coordinateur qui garde la cohérence : données communes, design, navigation, lien sport ↔ nutrition.
- Point technique à trancher avant l'ouverture au public :
  - comptes multi-utilisateurs ;
  - serveur qui garde les clés d'IA, avec quotas et abonnement (aujourd'hui, la clé Gemini de Vuthy est stockée dans son profil) ;
  - mentions légales et RGPD pour les données de santé.
