// Service Worker pour CastFlow PWA
const CACHE_NAME = 'castflow-pwa-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Installation : mise en cache des ressources de base de la PWA
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Interception des requêtes : stratégie Cache-First avec fallback Réseau
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes Cast SDK externes ou les flux vidéo volumineux (m3u8/mp4)
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('google.com') ||
    event.request.url.includes('.mp4') ||
    event.request.url.includes('.m3u8') ||
    event.request.url.includes('.ts')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Mettre en cache les fichiers statiques de même origine
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          (event.request.url.endsWith('.js') || event.request.url.endsWith('.css') || event.request.url.endsWith('.png') || event.request.url.endsWith('.svg'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback hors-ligne pour la navigation HTML
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
