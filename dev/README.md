# Code source de l'app Muscu (pour Claude)

- `src/*.js`, `src/style.css` : code de l'app, compilé en un seul fichier par `build.py`.
- `python3 build.py --pwa` → `dist/` (à copier à la racine du dépôt) ; `python3 build.py --local` → `index.local.html` pour les tests.
- Avant de compiler : copier aussi `vendor/`, `icons/`, `anatomy/` depuis la racine du dépôt dans le dossier de travail.
- `body/build_rig.py` : construit `anatomy/body2.*` (mannequin articulé) depuis BodyParts3D (dépôt GitHub Kevin-Mattheus-Moerman/bodyparts3d).
- `test*.py` : tests Playwright (serveur local `python3 -m http.server 8765`).
- App Mac native (SwiftUI + WKWebView) : sur le Mac de Vuthy, ~/Applications/MuscuApp.
- Historique et décisions : doc projet `claude/journal-developpement.md`.
