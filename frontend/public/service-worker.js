const CACHE_NAME = 'mozaik-rh-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('[Service Worker] Erreur de cache:', error);
      })
  );
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Stratégie de cache: Network First (données temps réel prioritaires)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Pour les API calls, toujours aller chercher sur le réseau (temps réel)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Pas de connexion. Les données temps réel ne sont pas disponibles.' }),
            { 
              headers: { 'Content-Type': 'application/json' },
              status: 503
            }
          );
        })
    );
    return;
  }

  // Pour les ressources statiques, utiliser le cache en priorité
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          // Retourner depuis le cache
          return response;
        }
        // Sinon, aller sur le réseau
        return fetch(request).then((response) => {
          // Ne pas cacher les réponses non-OK
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Cloner la réponse
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Fallback pour les pages
        return caches.match('/');
      })
  );
});