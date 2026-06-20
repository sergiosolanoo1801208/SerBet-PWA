<meta name='viewport' content='width=device-width, initial-scale=1'/>// sw.js - Service Worker para SerBet
const CACHE_NAME = 'serbet-v1.0';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalación: cachear archivos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando archivos iniciales');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación: limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

// Estrategia híbrida: Network First para HTML, Cache First para recursos
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Si es navegación a una página HTML
  if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match('/index.html');
        })
    );
  } else {
    // Para recursos (CSS, JS, imágenes, fuentes)
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
              return response;
            })
            .catch(() => {
              // Fallback genérico
              return new Response('Recurso no disponible offline', { status: 404 });
            });
        })
    );
  }
});