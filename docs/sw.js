const SITEPASS_SW_VERSION = 'v23.7.385';
const SITEPASS_CACHE = 'sitepass-v23.7.385';
const SITEPASS_CORE = [
  './',
  './index.html',
  './sitepass.webmanifest',
  './assets/img/sitepass-hero-logo.png',
  './assets/img/sitepass-hero-logo-clean.png',
  './assets/img/js-construction-badge.png',
  './terms/person-consent.html',
  './assets/css/style.css',
  './assets/js/config.js',
  './assets/js/supabase-api.js',
  './assets/js/storage.js',
  './assets/js/terms.js',
  './assets/js/admin-members.js',
  './assets/js/admin-detail.js',
  './assets/js/auth-social.js',
  './assets/js/pwa-update.js',
  './assets/js/qr-share.js',
  './assets/js/archive.js',
  './assets/js/equipment-register.js',
  './assets/js/person-auth.js',
  './assets/js/camera-scan.js',
  './assets/js/admin-payments.js',
  './assets/js/recipient-view.js',
  './assets/js/document-output.js',
  './assets/js/app-core-auth-speed-01.js',
  './assets/js/app-core-auth-speed-02.js',
  './assets/js/app-core-auth-speed-03.js',
  './assets/js/app-core-auth-speed-04.js',
  './assets/js/app-camera-docs-speed-01.js',
  './assets/js/app-camera-docs-speed-02.js',
  './assets/js/app-camera-docs-speed-03.js',
  './assets/js/app-camera-docs-speed-04.js',
  './assets/js/app-register-share-payment-speed-01.js',
  './assets/js/app-register-share-payment-speed-02.js',
  './assets/js/app-register-share-payment-speed-03.js',
  './assets/js/app-register-share-payment-speed-04.js',
  './assets/js/app-admin-boot-speed-01.js',
  './assets/js/app-admin-boot-speed-02.js',
  './assets/js/app-admin-boot-speed-03.js',
  './assets/js/push-notify.js',
  './assets/js/sitepass-v23-7-351-sens-integration.js',
  './assets/js/app.bundle.js'
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
        return (await caches.match('./index.html')) || Response.error();
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
