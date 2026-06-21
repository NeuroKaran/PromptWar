// EcoPixel Service Worker - Offline caching strategy
// Per Games-skills.md PWA requirements: offline play, caching

const CACHE_NAME = 'ecopixel-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/assets/Map.webp',
  '/assets/Home.webp',
  '/assets/Cafe.webp',
  '/assets/Office.webp',
  '/assets/Map.png',
  '/assets/Home.png',
  '/assets/Cafe.png',
  '/assets/Office.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Cache-first for assets, network-first for pages
  if (event.request.url.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
  } else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
