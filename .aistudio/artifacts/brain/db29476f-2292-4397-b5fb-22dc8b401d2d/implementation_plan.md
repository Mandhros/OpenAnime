# PWA Web Cast — Diffuseur Chromecast & Guide GitHub Pages

Application web progressive (PWA) ultra-légère conçue pour les smartphones Android et le web moderne, permettant de diffuser facilement des vidéos d'hébergeurs externes (MP4, WebM et flux HLS `.m3u8`) sur une télévision équipée de Chromecast ou Google Cast, accompagnée d'un studio d'exportation de code vanilla autonome et d'un guide complet de déploiement GitHub Pages.

## Décisions Clés & Réponses Validées

> [!IMPORTANT]
> Les options suivantes ont été confirmées pour garantir une compatibilité maximale sur mobile et TV :

- **Support HLS / m3u8** : Intégration de `hls.js` dans le lecteur local pour assurer une lecture fluide des flux de direct et VOD m3u8 sur tous les navigateurs mobiles et desktop, tout en déléguant le décodage natif HLS au Chromecast.
- **Historique & Raccourcis** : Système de stockage local (`localStorage`) sans serveur pour mémoriser les dernières vidéos diffusées et gérer des favoris avec étiquetage personnalisé.
- **Export & Guide GitHub Pages** : Module interactif intégré avec onglets de visualisation de code, bouton « Copier en 1 clic », téléchargement direct des fichiers statiques vanilla (`index.html`, `manifest.json`, `sw.js`), et guide pas-à-pas détaillé pour le déploiement gratuit sur GitHub Pages.

---

## 1. Vue d'Ensemble & Concept

### Qu'est-ce que l'application ?
Une PWA mobile-first réactive qui transforme n'importe quel smartphone Android en télécommande Chromecast universelle pour les flux vidéo du web. L'utilisateur colle simplement l'URL directe d'un fichier vidéo (MP4, WebM) ou d'un flux de streaming adaptatif (HLS `.m3u8`), teste la lecture localement sur son écran, puis lance la diffusion sur son écran TV via le bouton officiel `<google-cast-launcher>`.

### Cas d'usage & Public cible
- Utilisateurs de smartphones Android souhaitant visionner des vidéos hébergées sur le web ou serveurs personnels sur leur TV de salon sans installer d'application lourde depuis le Play Store.
- Développeurs et créateurs souhaitant héberger gratuitement leur propre PWA Cast autonome sur GitHub Pages (ou tout hébergeur statique HTTPS).

### Bénéfices majeurs
- **Zéro installation obligatoire** : Accessible instantanément depuis un lien web, installable sur l'écran d'accueil en 1 tap grâce au Service Worker et au Manifest PWA.
- **Google Cast SDK Sender v1 Officiel** : Intégration conforme au Cast Framework avec état de session, contrôleur multimédia (lecture, pause, recherche temporelle, volume, mise en sourdine).
- **Double fonction** : Lecteur Cast actif immédiat dans l'interface + suite de fichiers standalone prête à être poussée sur GitHub Pages.

---

## 2. Expérience Utilisateur & Design Visuel

### Parcours Utilisateur
1. **Saisie ou Sélection de flux** : Saisie d'une URL de vidéo directe, collage rapide depuis le presse-papier, ou choix parmi des flux d'exemple vérifiés (MP4 Big Buck Bunny, flux HLS Sintel, etc.).
2. **Contrôle & Prévisualisation** :
   - Clic sur **Lecture locale** : démarre la vidéo sur le lecteur intégré (avec gestion automatique MP4/HLS).
   - Clic sur **Bouton Cast** (`google-cast-launcher`) : ouvre la boîte de dialogue native Android/Chrome de sélection du Chromecast sur le réseau Wi-Fi local.
3. **Session de Diffusion Active** :
   - Télécommande de lecture synchronisée : barre de progression, boutons lecture/pause, curseur de volume, informations du média et déconnexion.
4. **Gestion des Favoris & Historique** :
   - Enregistrement des flux favoris avec titre personnalisé.
   - Historique automatique des 10 dernières URL lues avec rechargement en un clic.
5. **Espace Guide & Fichiers GitHub Pages** :
   - Onglets dédiés affichant le code source pur et commenté de chaque fichier (`index.html`, `manifest.json`, `sw.js`).
   - Guide pas-à-pas illustré avec commandes Git, étapes dans l'interface GitHub et conseils de contournement CORS.

### Identité Visuelle & Ergonomie
- **Palette & Ambiance** : Thème sombre premium moderne (`slate-950` / `slate-900`) optimisé pour une utilisation devant la TV (faible éblouissement) avec accents bleu Chromecast (`#1a73e8` / `#3b82f6`) et touches ambrées pour les favoris.
- **Typographie** : `Plus Jakarta Sans` pour les titres et l'interface, complétée par `JetBrains Mono` / `font-mono` pour la manipulation des URL et l'affichage du code.
- **Ergonomie Mobile Thumb-Zone** :
   - Commandes principales et champ d'URL dans la zone naturelle d'atteinte du pouce.
   - Cibles tactiles d'au moins 48px de hauteur pour éviter les erreurs de manipulation sur smartphone.
   - Bouton flottant d'installation PWA (`PWAInstallButton`) réactif au `beforeinstallprompt`.

---

## 3. Décisions Clés & Architecture Technique

### Décision 1 : Intégration du SDK Google Cast Web Sender
- **Approche** : Chargement asynchrone du SDK officiel `cast_sender.js?loadCastFramework=1` et initialisation du `cast.framework.CastContext` avec l'ID d'application récepteur par défaut `CC1AD845` (Default Media Receiver officiel de Google).
- **Raison** : Compatible nativement avec les Chromecast standard, Chromecast avec Google TV et Android TV sans nécessiter de compte développeur Cast payant.
- **Gestion des métadonnées** : Injection du type MIME approprié (`video/mp4` ou `application/x-mpegurl`) selon l'extension de l'URL pour un décodage optimal par la TV.

### Décision 2 : Support HLS Hybride
- **Approche** : Utilisation de `hls.js` pour la prévisualisation dans le navigateur web local lorsque le navigateur ne supporte pas nativement HLS (ex: Chrome Android/Desktop), tout en transmettant l'URL brute m3u8 au Chromecast qui gère nativement le format.

### Décision 3 : Architecture Déployable sur GitHub Pages
- **Approche** :
  1. L'application interactive présente un environnement complet avec un visualiseur et un exportateur de code.
  2. Un dossier statique dédié (`/public/github-pages-bundle/`) est généré avec les 3 fichiers vanilla stricts (`index.html`, `manifest.json`, `sw.js`) pour permettre au développeur de cloner ou copier-coller sans aucune dépendance Node.js ni build step.

---

## 4. Architecture Système & Flux de Données

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Smartphone Android / Navigateur                │
│                                                                        │
│  ┌─────────────────────────┐           ┌────────────────────────────┐  │
│  │     Champ URL Vidéo     │           │   Contrôleur Chromecast    │  │
│  │   (MP4 / HLS .m3u8)     │           │  <google-cast-launcher>    │  │
│  └────────────┬────────────┘           └─────────────┬──────────────┘  │
│               │                                      │                 │
│               ▼                                      ▼                 │
│  ┌─────────────────────────┐           ┌────────────────────────────┐  │
│  │      Lecteur Local      │           │     Google Cast SDK        │  │
│  │ (HTML5 Video + HLS.js)  │           │   (RemotePlayerController) │  │
│  └────────────┬────────────┘           └─────────────┬──────────────┘  │
│               │                                      │                 │
│               ▼                                      ▼ (Wi-Fi Local)   │
│  ┌─────────────────────────┐           ┌────────────────────────────┐  │
│  │ Historique/Favoris PWA  │           │  Télévision / Chromecast   │  │
│  │      localStorage       │           │  Default Media Receiver    │  │
│  └─────────────────────────┘           └────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │     Générateur & Exportateur pour GitHub Pages          │
       │                                                          │
       │  • index.html (Vanilla Cast Sender + HLS + CSS pur)     │
       │  • manifest.json (Configuration PWA installable)        │
       │  • sw.js (Cache offline Service Worker)                 │
       │  • Guide de déploiement pas-à-pas en 5 étapes           │
       └──────────────────────────────────────────────────────────┘
```

### Fichiers Vanilla Clés pour GitHub Pages
1. **`index.html`** :
   - Structure sémantique HTML5 responsive.
   - Script Google Cast Sender SDK et callback d'initialisation globale `__onGCastApiAvailable`.
   - Bouton de cast `<google-cast-launcher id="castbutton">`.
   - Script HLS.js chargé depuis un CDN fiable avec fallback natif.
   - Interface épurée avec boutons tactiles ergonomiques, barre d'état et historique.
2. **`manifest.json`** :
   - Nom complet, nom court (`Cast Video`), `display: "standalone"`, `start_url: "./"`, thèmes et icônes SVG/PNG conformes.
3. **`sw.js`** :
   - Stratégie de mise en cache "Cache-First" pour l'UI de l'application et "Network-First" pour les ressources dynamiques, garantissant l'accès hors-ligne à l'interface de contrôle.
4. **Guide de Déploiement** :
   - Création de dépôt sur GitHub.
   - Envoi des fichiers via l'interface web ou commandes Git CLI.
   - Activation de GitHub Pages dans les options `Settings > Pages > Branch main / root`.
   - Rappels cruciaux : obligation du protocole HTTPS (fourni par défaut par GitHub Pages) pour le SDK Cast et gestion du header CORS (`Access-Control-Allow-Origin: *`) sur les vidéos externes.

---

## Vérification et Critères de Succès
- Interface 100% fonctionnelle dans le navigateur avec lecteur local vidéo et support HLS.
- Bouton Cast `<google-cast-launcher>` synchronisé avec l'état de l'API Google Cast.
- Bouton d'installation PWA opérationnel avec gestion du mode autonome et instructions iOS/Android.
- Code vanilla complet accessible avec copie en un clic et téléchargement zip/fichier unique.
- Guide de déploiement clair et accessible aux débutants comme aux utilisateurs avancés.
