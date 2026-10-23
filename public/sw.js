// Service Worker pour OpenAnime PWA - Version 3
const CACHE_NAME = 'openanime-pwa-v3';

// Ressources critiques hors-ligne
const PRECACHE_ASSETS = [
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Installation : pré-mise en cache sans bloquer
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pré-mise en cache partielle:', err);
      });
    })
  );
});

// Activation : suppression stricte des anciens caches corrompus ou obsolètes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Suppression ancien cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Interception des requêtes :
// 1. Navigation HTML -> NETWORK-FIRST (pour éviter l'écran blanc des déploiements)
// 2. Fichiers statiques JS/CSS avec hash -> STALE-WHILE-REVALIDATE / CACHE-FIRST
// 3. Vidéos et flux Cast -> PASSER DIRECTEMENT AU RÉSEAU
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorer les requêtes non GET, les flux vidéo, Chromecast et requêtes externes
  if (
    request.method !== 'GET' ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('google.com') ||
    url.pathname.includes('.mp4') ||
    url.pathname.includes('.m3u8') ||
    url.pathname.includes('.ts') ||
    url.pathname.includes('/api/')
  ) {
    return;
  }

  // 1. Pour la page HTML principale (navigation) : RÉSEAU D'ABORD
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Si hors ligne, retourner la dernière page en cache
          return caches.match(request).then((cached) => {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // 2. Pour les assets statiques de l'application (JS, CSS, images locales)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          (url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.png') ||
           url.pathname.endsWith('.svg') ||
           url.pathname.endsWith('.json'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
