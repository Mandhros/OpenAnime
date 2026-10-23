# CastFlow - Progressive Web App pour Chromecast sur GitHub Pages

Application web autonome et légère permettant de diffuser (caster) des vidéos externes (fichiers MP4, WebM et flux HLS `.m3u8`) sur une télévision via Chromecast depuis un smartphone Android ou navigateur Chrome.

## Fichiers inclus
- `index.html` : Interface responsive HTML5, lecteur local avec support HLS.js, bouton officiel `<google-cast-launcher>` et logique d'émission Cast SDK v1.
- `manifest.json` : Configuration PWA (icônes, couleur de thème, mode `standalone`).
- `sw.js` : Service Worker pour le fonctionnement hors-ligne et l'installation sur smartphone.
- `icon.svg`, `icon-192.png`, `icon-512.png` : Icônes conformes pour écran d'accueil Android et iOS.

## Procédure de Déploiement sur GitHub Pages (100% Gratuit)
1. Créez un nouveau dépôt public sur [GitHub](https://github.com/new).
2. Déposez ces fichiers à la racine de votre branche `main`.
3. Allez dans **Settings > Pages** de votre dépôt.
4. Dans **Build and deployment**, choisissez la branche **main** et le dossier **/ (root)**, puis cliquez sur **Save**.
5. Ouvrez l'adresse `https://<votre-pseudo>.github.io/<nom-depot>/` dans Chrome sur votre smartphone Android et touchez **« Ajouter à l'écran d'accueil »**.
