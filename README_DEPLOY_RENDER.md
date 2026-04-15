Guide de déploiement rapide — Render

1. Pré-requis

- Compte Render (https://render.com)
- Code source disponible (repo GitHub/GitLab/Bitbucket) ou archive prête à téléverser

2. Paramètres de service

- Type: Web Service
- Branch / source: choisis le repo où se trouve ce projet
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: `Node` (Render détecte via `package.json`)

3. Variables d'environnement utiles

- `PORT` (Render fixe automatiquement) — pas nécessaire
- `LIVE_SEARCH=0` (par défaut) — activer `1` si vous fournissez `SERPAPI_KEY`
- `SERPAPI_KEY` — clé SerpAPI si vous activez `LIVE_SEARCH`

4. Remarques

- `server/search-api.js` inclut déjà `app.use(cors())`, donc CORS est autorisé.
- Si vous ne pouvez pas déployer Node sur one.com, déployez seulement le dossier `server` sur Render et laissez le frontpointant vers l'API publique via `window.API_BASE`.

5. Après déploiement

- Obtenez l'URL du service (ex: `https://mon-app.onrender.com`) et dans `index.html` ajoutez avant le script `search-ui.js`:
  `<script>window.API_BASE='https://mon-app.onrender.com';</script>`

6. Alternative (Docker)

- Render accepte aussi un `Dockerfile` si vous préférez construire une image.

Si tu veux, je peux ajouter un `render.yaml` et un `Dockerfile` minimal dans le dépôt. Veux-tu que je les crée maintenant ?
