// OptiStance service worker.
//
// Strategy:
//  - Page navigations are STALE-WHILE-REVALIDATE. The cached shell is served
//    immediately and a fresh copy is fetched in the background for next time.
//  - Static assets are content-hashed by Vite (assets/index-<hash>.js), so
//    cache-first is safe and fast for them.
// Bump CACHE_NAME whenever the caching strategy changes so old caches are
// purged by the activate handler.
//
// Why navigations changed from network-first: on a slow or flaky connection a
// network-first navigation blocks the first paint on a full round trip and only
// falls back to cache after that request fails or times out. For an app whose
// whole point is working with poor connectivity -- in a gym, in a school with
// patchy wifi -- that turned every launch into a wait. Serving the cached shell
// first and updating it behind the scenes makes launch instant and still gets
// the new build on the next open.
//
// The trade-off is deliberate: an athlete may briefly be on the previous build
// after a deploy. That is the right way round for this app, because the failure
// mode of the alternative is not opening at all.
const CACHE_NAME = 'optistance-app-v5';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

// Vite emits content-hashed filenames, so anything under /assets/ is immutable.
const isImmutableAsset = (url) => url.pathname.startsWith('/assets/');

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
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Content-hashed build output: serve from cache, fill it if missing. These
  // never change for a given URL, so there is nothing to revalidate.
  if (isImmutableAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })()
    );
    return;
  }

  // Navigations: stale-while-revalidate against the app shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = (await cache.match(request)) || (await cache.match('/index.html'));

        const network = fetch(request)
          .then((fresh) => {
            if (fresh && fresh.ok) {
              const copy = fresh.clone();
              void cache.put(request, copy);
              void cache.put('/index.html', copy.clone());
            }
            return fresh;
          })
          .catch(() => null);

        // If there is something cached, hand it over now and let the refresh
        // finish in the background. Only block on the network when there is
        // genuinely nothing to show, which is the genuine first-visit case.
        if (cached) {
          void network;
          return cached;
        }

        const fresh = await network;
        return (
          fresh ||
          new Response('OptiStance is offline and has not been cached yet.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        );
      })()
    );
  }
});
