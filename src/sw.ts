/// <reference lib="webworker" />

// Service Worker for Schedule Lite PWA
// Hand-written, stale-while-revalidate strategy for API calls

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'schedule-lite-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
];

// Install: precache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('schedule-lite-') && name !== SHELL_CACHE && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: routing strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-only for auth endpoints (never cache)
  if (url.pathname.startsWith('/api/auth/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Stale-while-revalidate for sheets API
  if (url.pathname.startsWith('/api/sheets/')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            // Only cache successful responses
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });

          // Return cached response immediately if available, fetch in background
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Cache-first for app shell assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
