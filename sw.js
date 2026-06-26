const SITEPASS_CACHE = 'sitepass-v23-7-122-real-beta';
const SITEPASS_ASSETS = [
  './',
  './index.html',
  './sitepass.webmanifest',
  './js-construction-logo.png',
  './icons/sitepass-icon-180.png',
  './icons/sitepass-icon-192.png',
  './icons/sitepass-icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SITEPASS_CACHE).then(cache => cache.addAll(SITEPASS_ASSETS).catch(() => undefined))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== SITEPASS_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(SITEPASS_CACHE).then(cache => cache.put(event.request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});
