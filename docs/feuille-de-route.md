# Feuille de route

_Ordre de priorité proposé ; Vuthy décide. Ce qui est en cours est dans `docs/ETAT.md`._

## Maintenant (décisions de Vuthy attendues)
1. **Design façon Liftin'** : choisir l'accent, 2ᵉ passe (séance à grosses lignes, cartes illustrées, 5 onglets), puis publier.
2. **Corriger** le bug « Copier hier retire du frigo ».
3. **Alléger le Frigo** (65 boutons → un tap sur l'aliment ouvre ses actions, frigo 3D derrière une icône).
4. **Nutrition** : « Mes besoins » ramené dans Nutrition ; supprimer l'ancienne `viewKitchen`.
5. **Programmes** cardio / HIIT / camp / abdos (après validation de la liste) : un minuteur, 3 modes, 2 boutons visibles, séance comptée « cardio » pour la nutrition.
6. **Amis** : activer les comptes dans Supabase, tester en vrai, fusionner.

## Ensuite (idées validées ou issues des analyses, à proposer à Vuthy une par une)
- Bilan hebdo expliqué avec historique des décisions (Carbon) ; phases de diète avec date de fin (Carbon).
- Base d'aliments Ciqual (France) et BEDCA (Espagne), en plus d'Open Food Facts.
- Saisie IA en langage naturel découpée en aliments modifiables, partout (MacrosFirst).
- Récap de fin de séance + image story (tonnage comparé à un objet, FitSelf).
- Série validée automatiquement quand charge + reps sont remplies (FitSelf) — réponse de Vuthy attendue depuis le 20/11.
- Échauffement calculé + disques sur l'échauffement (Alpha, Gravl, MyoAdapt).
- Charge conseillée selon la dernière fois et le RIR ; décharge automatique (Alpha, RP).
- Retours pump / courbatures / fatigue par muscle pour ajuster le volume (RP).
- Supersets et exercice alternatif prévu (FitSelf).
- Bouton « ? » d'aide par écran ; « Annuler » après suppression.
- Import Strong / Hevy, export CSV/JSON.
- Échauffement jambes ; nom exact de l'exercice de rotation à 90°.

## Plus tard
- App native : installer l'app iOS (HealthKit) sur l'iPhone, puis widgets, Live Activity (minuteur de repos sur l'écran verrouillé), Apple Watch autonome.
- Salle personnalisée par utilisateur (photos, matériel → programmes précis ; idée Gravl « trouvez votre salle »).
- Multi-comptes et ouverture au public : serveur intermédiaire (Edge Function Supabase) qui garde les clés IA, quotas, abonnement (~3,99 €/mois ou 30-35 €/an, essai sans piège), mentions légales et RGPD (données de santé), signalement et blocage.
- Spotify (app développeur à créer par Vuthy).
