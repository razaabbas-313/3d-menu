const CACHE_NAME = 'atelier-v0.2.0-core';
const MODELS_CACHE_NAME = 'atelier-models-v1';
const MAX_CACHED_MODELS = 8;
const MAX_MODEL_BYTES = 25 * 1024 * 1024; // 25 MB per model cap

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== MODELS_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and analytics tracking events
  if (request.method !== 'GET' || url.pathname.includes('/events') || url.pathname.includes('/auth/')) {
    return;
  }

  // 1. Handle .glb 3D models with size cap and bounded cache
  if (url.pathname.endsWith('.glb')) {
    event.respondWith(
      caches.open(MODELS_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const contentLength = networkResponse.headers.get('content-length');
            const size = contentLength ? parseInt(contentLength, 10) : 0;
            // Only cache if under size cap
            if (size <= MAX_MODEL_BYTES) {
              const clone = networkResponse.clone();
              trimCache(MODELS_CACHE_NAME, MAX_CACHED_MODELS).then(() => {
                cache.put(request, clone);
              });
            }
          }
          return networkResponse;
        } catch {
          return cachedResponse || new Response(null, { status: 504, statusText: 'Offline 3D Model Unavailable' });
        }
      })
    );
    return;
  }

  // 2. Handle public menu snapshots: Stale-While-Revalidate
  if (url.pathname.includes('/public/') && url.pathname.endsWith('/menu.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. Static assets (JS, CSS, images, fonts): Cache-first with network fallback
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
        );
      })
    );
    return;
  }

  // 4. Navigation requests: serve SPA shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const shell = await cache.match('/');
        return shell || (await cache.match('/index.html'));
      })
    );
  }
});

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxItems);
  }
}
