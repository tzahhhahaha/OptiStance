// OptiStance service worker.
// Strategy:
//  - Page navigations are NETWORK-FIRST so new builds take effect on the next
//    open (cache only serves as an offline fallback).
//  - Static assets are content-hashed by Vite (assets/index-<hash>.js), so
//    cache-first is safe and fast for them.
// Bump CACHE_NAME whenever the caching strategy changes so old caches are
// purged by the activate handler.
const CACHE_NAME = 'optistance-app-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

  const isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    (async () => {
      if (isNavigation) {
        // Always try the network for page loads so newly deployed builds are
        // picked up immediately; fall back to the cached shell when offline.
        try {
          const fresh = await fetch(event.request);
          const copy = fresh.clone();
          const cache = await caches.open(CACHE_NAME);
          void cache.put(event.request, copy);
          void cache.put('/index.html', copy.clone());
          return fresh;
        } catch {
          return (await caches.match(event.request)) || (await caches.match('/index.html'));
        }
      }

      // Hashed assets / other same-origin GETs: cache-first with network fallback.
      const cached = await caches.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      const copy = response.clone();
      void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    })()
  );
});