const SITEPASS_SW_VERSION = 'v23.7.497';
const SITEPASS_CACHE = 'sitepass-fast-v23.7.497';
const SITEPASS_PREVIOUS_CACHE = 'sitepass-fast-v23.7.496';
const SITEPASS_OLDER_CACHE = 'sitepass-fast-v23.7.495';
const SITEPASS_SHELL = [
  './index.html',
  './assets/css/style.css?v=23.7.494',
  './assets/js/config.js?v=23.7.497',
  './assets/js/app-register-share-payment-speed-02.js?v=23.7.496',
  './assets/js/app-register-share-payment-speed-03.js?v=23.7.497',
  './assets/js/app-register-share-payment-speed-04.js?v=23.7.496',
  './assets/js/qr-share.js?v=23.7.496'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  // v23.7.494: 설치 단계에서 앱 전체 파일을 미리 받지 않습니다.
  // 화면에 꼭 필요한 HTML/CSS만 가볍게 준비하고 나머지는 실제 사용 시 캐시합니다.
  event.waitUntil(
    caches.open(SITEPASS_CACHE).then(cache => Promise.allSettled(
      SITEPASS_SHELL.map(url => fetch(url, { cache:'no-cache' }).then(res => {
        if (res && res.ok) return cache.put(url, res.clone());
        return null;
      }))
    ))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // 바로 전 v496과 v495 캐시는 유지하여 변경되지 않은 JS·이미지를 다시 받지 않게 합니다.
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

async function cachedAcrossVersions(request){
  try {
    // 현재 v497 캐시를 먼저 보고, 없을 때 v496·v495 캐시를 차례로 재사용합니다.
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
    // 최신 파일 확인은 뒤에서 진행하고 사용자는 캐시된 화면을 즉시 봅니다.
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
      const cached = (await cachedAcrossVersions('./index.html')) || (await cachedAcrossVersions(req));
      try {
        // GitHub 응답이 빠르면 최신 HTML을 사용하고, 지연되면 기존 화면을 즉시 엽니다.
        const fresh = await withTimeout(fetch(req, { cache:'no-cache' }), 900);
        await putCurrent('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        if (cached) {
          fetch(req, { cache:'no-cache' }).then(res => putCurrent('./index.html', res)).catch(() => null);
          return cached;
        }
        try { return await fetch(req); } catch (err) { return Response.error(); }
      }
    })());
    return;
  }

  if (sameOrigin) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Supabase API 응답은 캐시하지 않고, CDN 정적 라이브러리만 브라우저 기본 캐시를 사용합니다.
  event.respondWith(fetch(req));
});

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    try { payload = { body: event.data ? event.data.text() : '' }; } catch (err) { payload = {}; }
  }
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
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      if ('focus' in client) {
        try {
          await client.focus();
          if ('navigate' in client) await client.navigate(targetUrl);
          return;
        } catch (e) {}
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
  })());
});
