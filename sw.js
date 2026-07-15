const SITEPASS_SW_VERSION = 'v23.7.505';
const SITEPASS_CACHE = 'sitepass-fast-v23.7.505';
const SITEPASS_PREVIOUS_CACHE = 'sitepass-fast-v23.7.504';
const SITEPASS_OLDER_CACHE = 'sitepass-fast-v23.7.503';
const SITEPASS_SHELL = [
  './index.html',
  './recipient.html?v=505',
  './assets/css/style.css?v=23.7.505',
  './assets/js/config.js?v=23.7.505',
  './assets/js/pwa-update.js?v=23.7.505',
  './assets/js/app-core-auth-speed-04.js?v=23.7.505',
  './assets/js/app-admin-boot-speed-03.js?v=23.7.500',
  './assets/js/app-register-share-payment-speed-02.js?v=23.7.496',
  './assets/js/app-register-share-payment-speed-03.js?v=23.7.505',
  './assets/js/app-register-share-payment-speed-04.js?v=23.7.496',
  './assets/js/qr-share.js?v=23.7.505'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SITEPASS_CACHE).then(cache => Promise.allSettled(
      SITEPASS_SHELL.map(url => fetch(url, { cache:'no-store' }).then(res => {
        if (res && res.ok) return cache.put(url, res.clone());
        return null;
      }))
    ))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => /sitepass/i.test(key) && key !== SITEPASS_CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function withTimeout(promise, ms){
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

async function putCurrent(request, response){
  if (!response || !response.ok) return response;
  try {
    const cache = await caches.open(SITEPASS_CACHE);
    await cache.put(request, response.clone());
  } catch (e) {}
  return response;
}

async function currentCacheMatch(request){
  try { return (await caches.open(SITEPASS_CACHE)).match(request); }
  catch (e) { return null; }
}

async function staleWhileRevalidate(request){
  const cached = await currentCacheMatch(request);
  const networkPromise = fetch(request).then(res => putCurrent(request, res)).catch(() => null);
  if (cached) {
    networkPromise.catch(() => null);
    return cached;
  }
  return (await networkPromise) || Response.error();
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.pathname.endsWith('/app-version.json')) {
    event.respondWith(fetch(req, { cache:'no-store' }));
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isNavigate = req.mode === 'navigate';

  if (isNavigate) {
    event.respondWith((async () => {
      try {
        const fresh = await withTimeout(fetch(req, { cache:'no-store' }), 7000);
        await putCurrent(req, fresh.clone());
        return fresh;
      } catch (e) {
        const isRecipient = /\/recipient\.html$/i.test(url.pathname);
        const fallback = isRecipient
          ? ((await currentCacheMatch('./recipient.html?v=505')) || (await currentCacheMatch(req)))
          : ((await currentCacheMatch('./index.html')) || (await currentCacheMatch(req)));
        return fallback || Response.error();
      }
    })());
    return;
  }

  if (sameOrigin) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  event.respondWith(fetch(req));
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (e) { try { payload = { body: event.data ? event.data.text() : '' }; } catch (err) { payload = {}; } }
  const title = payload.title || 'SitePass 알림';
  const options = {
    body: payload.body || 'SitePass에서 확인할 알림이 있습니다.',
    icon: payload.icon || './icons/sitepass-icon-192.png',
    badge: payload.badge || './icons/sitepass-icon-192.png',
    tag: payload.tag || 'sitepass-push',
    data: payload.data || { url: payload.url || './', createdAt: new Date().toISOString() },
    renotify: payload.renotify !== false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || './';
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    for (const client of clientsList) {
      if ('focus' in client) {
        try { await client.focus(); if ('navigate' in client) await client.navigate(targetUrl); return; } catch (e) {}
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
  })());
});
