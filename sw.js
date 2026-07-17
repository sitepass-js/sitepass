const SITEPASS_SW_VERSION = 'v23.7.541-test';
const SITEPASS_CACHE = 'sitepass-fast-v23.7.541-test';
const SITEPASS_SHELL = [
  './index.html',
  './share.html',
  './assets/css/style.css?v=23.7.541-test',
  './assets/css/sitepass-chat-v460.css?v=23.7.541-test',
  './assets/js/sitepass-chat-v460.js?v=23.7.541-test',
  './assets/js/config.js?v=23.7.541-test',
  './assets/js/sitepass-error-monitor-v537.js?v=23.7.541-test',
  './assets/js/pwa-update.js?v=23.7.541-test',
  './assets/js/app-core-auth-speed-04.js?v=23.7.541-test',
  './assets/js/app-admin-boot-speed-03.js?v=23.7.541-test',
  './assets/js/app-register-share-payment-speed-02.js?v=23.7.541-test',
  './assets/js/app-register-share-payment-speed-03.js?v=23.7.541-test',
  './assets/js/app-register-share-payment-speed-04.js?v=23.7.541-test',
  './assets/js/qr-share.js?v=23.7.541-test'
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

async function cachedAcrossVersions(request){
  return currentCacheMatch(request);
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
  const isNavigate = req.mode === 'navigate';

  if (sameOrigin && isNavigate) {
    event.respondWith((async () => {
      const scopeUrl = new URL(self.registration.scope);
      let cacheKey = req;
      const isRecipient = url.pathname.endsWith('/share.html');
      if (url.pathname === scopeUrl.pathname || url.pathname.endsWith('/index.html')) {
        cacheKey = new Request(new URL('./index.html', self.registration.scope));
      } else if (isRecipient) {
        cacheKey = new Request(new URL('./share.html', self.registration.scope));
      }

      // v510: 담당자 링크화면은 캐시를 즉시 보여주고 최신 파일은 뒤에서 갱신합니다.
      // 기존 network-first 7초 대기 때문에 링크화면 진입이 느려지는 현상을 막습니다.
      if (isRecipient) {
        const cached = await currentCacheMatch(cacheKey);
        const networkPromise = fetch(req, { cache:'no-store' })
          .then(fresh => putCurrent(cacheKey, fresh.clone()).then(() => fresh))
          .catch(() => null);
        if (cached) {
          networkPromise.catch(() => null);
          return cached;
        }
        const fresh = await networkPromise;
        if (fresh) return fresh;
        return Response.error();
      }

      try {
        const fresh = await withTimeout(fetch(req, { cache:'no-store' }), 7000);
        await putCurrent(cacheKey, fresh.clone());
        return fresh;
      } catch (e) {
        const current = await currentCacheMatch(cacheKey);
        if (current) return current;
        try { return await fetch(req, { cache:'no-store' }); }
        catch (err) { return Response.error(); }
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
