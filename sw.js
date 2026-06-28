const SITEPASS_SW_VERSION = 'v23.7.174';
const SITEPASS_CACHE = 'sitepass-cache-v23-7-174';
const SITEPASS_CORE = [
  './',
  './index.html',
  './sitepass.webmanifest',
  './app-version.json',
  './icons/sitepass-icon-192.png',
  './icons/sitepass-icon-512.png',
  './icons/sitepass-icon-180.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SITEPASS_CACHE).then(cache => cache.addAll(SITEPASS_CORE).catch(() => null))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== SITEPASS_CACHE && /sitepass/i.test(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.pathname.endsWith('/app-version.json')) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/sitepass/')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(SITEPASS_CACHE);
        cache.put('./index.html', fresh.clone()).catch(() => null);
        return fresh;
      } catch (e) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(SITEPASS_CACHE);
      cache.put(req, fresh.clone()).catch(() => null);
      return fresh;
    } catch (e) {
      return (await caches.match(req)) || Response.error();
    }
  })());
});
