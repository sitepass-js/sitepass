const SITEPASS_SW_VERSION = 'v23.7.502';
const SITEPASS_CACHE = 'sitepass-fast-v23.7.502';
const SITEPASS_PREVIOUS_CACHE = 'sitepass-fast-v23.7.501';
const SITEPASS_OLDER_CACHE = 'sitepass-fast-v23.7.500';
const SITEPASS_SHELL = [
  './index.html',
  './assets/css/style.css?v=23.7.500',
  './assets/js/config.js?v=23.7.502',
  './assets/js/pwa-update.js?v=23.7.502',
  './assets/js/app-core-auth-speed-04.js?v=23.7.500',
  './assets/js/sitepass-recipient-route-v502.js?v=23.7.502',
  './assets/js/app-admin-boot-speed-03.js?v=23.7.500',
  './assets/js/app-register-share-payment-speed-02.js?v=23.7.496',
  './assets/js/app-register-share-payment-speed-03.js?v=23.7.502',
  './assets/js/app-register-share-payment-speed-04.js?v=23.7.496',
  './assets/js/qr-share.js?v=23.7.502'
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
    await Promise.all(keys.filter(key => {
      if (!/sitepass/i.test(key)) return false;
      return key !== SITEPASS_CACHE && key !== SITEPASS_PREVIOUS_CACHE && key !== SITEPASS_OLDER_CACHE;
    }).map(key => caches.delete(key)));
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

async function cachedAcrossVersions(request){
  try {
    const current = await caches.open(SITEPASS_CACHE);
    const currentHit = await current.match(request);
    if (currentHit) return currentHit;
    const previous = await caches.open(SITEPASS_PREVIOUS_CACHE);
    const previousHit = await previous.match(request);
    if (previousHit) return previousHit;
    const older = await caches.open(SITEPASS_OLDER_CACHE);
    return (await older.match(request)) || null;
  } catch (e) { return null; }
}

async function staleWhileRevalidate(request){
  const cached = await cachedAcrossVersions(request);
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
  const isNavigate = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/sitepass/');

  if (isNavigate) {
    event.respondWith((async () => {
      try {
        // v23.7.500: 온라인 새로고침에서는 이전 버전 HTML을 먼저 보여주지 않습니다.
        const fresh = await withTimeout(fetch(req, { cache:'no-store' }), 5000);
        await putCurrent('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        // 오프라인일 때만 현재 v500 캐시를 사용하며 v498/v497 HTML은 반환하지 않습니다.
        const current = (await currentCacheMatch('./index.html')) || (await currentCacheMatch(req));
        if (current) return current;
        try { return await fetch(req, { cache:'no-store' }); } catch (err) { return Response.error(); }
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
