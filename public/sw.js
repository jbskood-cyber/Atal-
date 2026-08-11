const CACHE = 'atal-shell-v2';
const CORE_ASSETS = ['/manifest.webmanifest', '/icon.svg'];

async function precacheAppShell() {
  const cache = await caches.open(CACHE);
  const response = await fetch('/', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Unable to precache app shell: ${response.status}`);
  }

  const html = await response.clone().text();
  await cache.put('/', response);

  const referencedAssets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin)
    .filter((url) => !url.pathname.startsWith('/api/') && url.pathname !== '/sw.js')
    .map((url) => `${url.pathname}${url.search}`);

  await cache.addAll([...new Set([...CORE_ASSETS, ...referencedAssets])]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
          }
          return response;
        })
        .catch(() => caches.match(request, { ignoreVary: true }).then((cached) => cached || caches.match('/', { ignoreVary: true }))),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, response.clone())));
      }
      return response;
    })),
  );
});
