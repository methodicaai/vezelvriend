// Service worker of the oefen-app: makes it installable and lets it open
// without a connection. Only the app shell (page, styles, script, icons) is
// cached. Customer data from /api/ is never cached, so nothing personal stays
// on the device. Bump VERSION when the shell changes.
const VERSION = 'mijn-vezelvriend-v1';
const SHELL = ['/app/', '/app/app.css', '/app/app.js', '/app/icon.svg', '/app/icon-192.png', '/app/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith('/app/')) return;
  // Network first, so updates show up straight away; the cache is only the offline fallback.
  event.respondWith(fetch(event.request)
    .then((response) => {
      const copy = response.clone();
      if (response.ok) caches.open(VERSION).then((cache) => cache.put(event.request, copy));
      return response;
    })
    .catch(() => caches.match(event.request).then((hit) => hit || caches.match('/app/'))));
});
