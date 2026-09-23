const SITEPASS_SW_VERSION = 'v23.7.784r14-step93-admin-support-chats-security-reinforcement';
const SITEPASS_CACHE = 'sitepass-fast-23.7.781r14-step93-admin-support-chats-message-scroll-transaction-fix';
const SITEPASS_CHAT_PRESENCE_V40 = new Map();
const SITEPASS_SHELL = [
  './index.html',
  './share.html',
  './recipient-share.html',
  './assets/css/style.css?v=23.7.561-test',
  './assets/css/features/admin/members/members.css?step=90-v733r2b-member-card-layout',
  './assets/css/features/admin/equipment-personnel/equipment-personnel.css?step=90-v733r2b-registration-status-move',
  './assets/css/features/admin/notifications/notifications.css?step=92-v775-admin-notifications-modular',
  './assets/css/features/admin/member-chats/member-chats.css?step=92-v775-admin-member-chats-modular',
  './assets/css/sitepass-admin-inquiry-v670.css?step=93-v784-security-reinforcement-compat-shell',
  './assets/css/features/admin/support-chats/support-chats.css?step=93-v784-admin-support-chats-security-reinforcement',
  './assets/css/sitepass-archive-v562.css?v=23.7.567-test',
  './assets/css/sitepass-chat-v460.css?v=23.7.712-step84-v40-fixed-room-mobile-ux',
  './assets/css/sitepass-member-link-chat-v566.css?v=23.7.773-r14-member-chat-enter-newline-auto-resize',
  './assets/js/sitepass-chat-v667.js?step=84-v40-fixed-room-mobile-ux',
  './assets/js/features/equipment-link/link-api.js?step=82-v28',
  './assets/js/features/equipment-link/request.js?step=82-v28',
  './assets/js/features/equipment-link/approval.js?step=82-v28',
  './assets/js/features/equipment-link/revoke.js?step=82-v28',
  './assets/js/features/equipment-link/badge.js?step=82-v28',
  './assets/js/sitepass-realtime-v664.js?step=84-v40-mobile-chat-realtime-push-pwa',
  './assets/js/sitepass-member-link-chat-v663.js?step=r14-member-chat-enter-newline-auto-resize-v773',
  './assets/js/features/chat/notifications.js?step=84-v39-chat-role-modularization',
  './assets/js/features/chat/pinned-rooms.js?step=84-v39-chat-role-modularization',
  './assets/js/features/chat/member-chat-list.js?step=84-v39-chat-role-modularization',
  './assets/js/features/chat/member-chat-room.js?step=84-v39-chat-role-modularization',
  './assets/js/features/chat/realtime.js?step=84-v40-mobile-chat-realtime-push-pwa',
  './assets/js/features/chat/presence-v40.js?step=84-v40-mobile-chat-realtime-push-pwa',
  './assets/js/sitepass-push-deeplink-v597.js?v=23.7.601-step84-native-fcm-click-candidate-v1',
  './assets/js/sitepass-native-push-v1.js?step=84-native-fcm-server-integration-candidate-v1',
  './assets/js/push-notify.js?step=92-v775-notification-bridge-only',
  './assets/js/config.js?step=90-v732r1a-safe-init',
  './assets/js/sitepass-error-monitor-v537.js?v=23.7.698-75-shadow-lookup-scale',
  './assets/js/pwa-update.js?v=23.7.570-test',
  './assets/js/app-core-auth-speed-04.js?step=90-v732r1-person-auth-binding-failclosed',
  './assets/js/app-admin-boot-speed-03.js?step=90-v733r2a-registration-management-label',
  './assets/js/features/admin/core/admin-auth.js?step=87-admin-failclosed-v2',
  './assets/js/features/admin/core/permissions.js?step=87-admin-failclosed-v2',
  './assets/js/features/admin/core/admin-api-client.js?step=87-admin-core-shared-v1',
  './assets/js/features/admin/core/admin-router.js?step=87-admin-core-shared-v1',
  './assets/js/features/admin/core/admin-layout.js?step=87-admin-core-shared-v1',
  './assets/js/features/admin/shared/search.js?step=87-admin-core-shared-v1',
  './assets/js/features/admin/shared/pagination.js?step=87-admin-core-shared-v1',
  './assets/js/features/admin/shared/loading.js?step=87-admin-core-shared-v1',
  './assets/js/features/admin/shared/table.js?step=87-admin-core-shared-v1',
  './assets/js/features/admin/shared/modal.js?step=87-admin-core-shared-v1',
  './assets/js/features/admin/notifications/api.js?step=92-v775-admin-notifications-modular',
  './assets/js/features/admin/notifications/operation.js?step=92-v775-admin-notifications-modular',
  './assets/js/features/admin/member-chats/api.js?step=92-v775-admin-member-chats-modular',
  './assets/js/features/admin/member-chats/operation.js?step=92-v775-admin-member-chats-modular',
  './assets/js/features/admin/support-chats/api.js?step=93-v784-admin-support-chats-security-reinforcement',
  './assets/js/features/admin/support-chats/status.js?step=93-v784-admin-support-chats-security-reinforcement',
  './assets/js/features/admin/support-chats/room-list.js?step=93-v784-admin-support-chats-security-reinforcement',
  './assets/js/features/admin/support-chats/room-detail.js?step=93-v784-admin-support-chats-security-reinforcement',
  './assets/js/features/admin/support-chats/input.js?step=93-v784-admin-support-chats-security-reinforcement',
  './assets/js/features/admin/support-chats/search.js?step=93-v784-admin-support-chats-security-reinforcement',
  './assets/js/features/admin/support-chats/realtime.js?step=93-v784-admin-support-chats-security-reinforcement',
  './assets/js/features/admin/support-chats/support-page.js?step=93-v784-admin-support-chats-security-reinforcement',
  './assets/js/features/admin/support-chats/support-chats.test.js?step=93-v784-admin-support-chats-security-reinforcement-test',
  './assets/js/features/admin/members/state.js?step=89-v731r3',
  './assets/js/features/admin/members/api.js?step=89-v731r2',
  './assets/js/features/admin/members/status.js?step=89-v731r3',
  './assets/js/features/admin/members/search.js?step=89-v731r3',
  './assets/js/features/admin/members/detail.js?step=89-v731r3',
  './assets/js/features/admin/members/list.js?step=90-v733r2b-member-card-layout',
  './assets/js/features/admin/members/test.js?step=89-v731r3',
  './assets/js/admin-members.js?step=89-v731r3-member-folder-split',
  './assets/js/features/admin/equipment-personnel/state.js?step=90-v733r2',
  './assets/js/features/admin/equipment-personnel/api.js?step=90-v733r2',
  './assets/js/features/admin/equipment-personnel/detail.js?step=90-v733r2',
  './assets/js/features/admin/equipment-personnel/list.js?step=90-v733r2',
  './assets/js/features/admin/equipment-personnel/page.js?step=90-v733r2b-registration-status-move',
  './assets/js/features/admin/equipment-personnel/test.js?step=90-v733r2',
  './assets/js/app-register-share-payment-speed-02.js?step=90-v732r1c-secure-save-preflight',
  './assets/js/features/share/member-view.js?step=83-v34-share-role-modularization',
  './assets/js/features/share/share-create.js?step=83-v34-share-role-modularization',
  './assets/js/features/share/recipient-view.js?step=83-v34-share-role-modularization',
  './assets/js/features/share/download.js?step=83-v34-share-role-modularization',
  './assets/js/features/share/print.js?step=83-v34-share-role-modularization',
  './assets/js/app-register-share-payment-speed-03.js?step=r14-friend-chat-recipient-share-fresh-token-fix-v764',
  './assets/js/app-register-share-payment-speed-04.js?v=23.7.676-72-e3-server-signature-consumption',
  './assets/js/sitepass-detail-refresh-v700.js?v=23.7.700-75-detail-refresh-restore-v2',
  './assets/js/sitepass-archive-v562.js?step=82-v29-equipment-link-cache-boundary-fix',
  './assets/js/sitepass-shadow-lookup-v698.js?v=23.7.698-75-shadow-lookup-scale',
  './assets/js/qr-share.js?v=23.7.676-72-e3-server-signature-consumption'
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
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'SITEPASS_CHAT_PRESENCE_V40') {
    const clientId = String(event.source && event.source.id || data.clientInstanceId || '');
    if (!clientId) return;
    SITEPASS_CHAT_PRESENCE_V40.set(clientId, {
      clientInstanceId: String(data.clientInstanceId || ''),
      recipientKeys: Array.isArray(data.recipientKeys)
        ? data.recipientKeys.map(value => String(value || '').trim().toLowerCase()).filter(Boolean)
        : [],
      foreground: data.foreground === true,
      visible: data.visible === true,
      focused: data.focused === true,
      roomType: sitepassNormalizeRoomTypeV40(data.roomType),
      roomId: sitepassNormalizeRoomIdV40(data.roomType, data.roomId),
      updatedAt: String(data.updatedAt || '')
    });
  }
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
      const isRecipient = url.pathname.endsWith('/share.html') || url.pathname.endsWith('/recipient-share.html');
      if (url.pathname === scopeUrl.pathname || url.pathname.endsWith('/index.html')) {
        cacheKey = new Request(new URL('./index.html', self.registration.scope));
      } else if (isRecipient) {
        cacheKey = new Request(new URL(url.pathname.endsWith('/recipient-share.html') ? './recipient-share.html' : './share.html', self.registration.scope));
      }

      // v575-42: 외부 수신자 화면은 잠금된 최신 UX/보안 코드를 우선한다.
      // 과거 cache-first 때문에 이전 recipient/share 화면이 먼저 살아나는 회귀를 차단한다.
      // 네트워크가 실제로 실패할 때만 현재 버전 캐시를 fallback으로 사용한다.
      if (isRecipient) {
        try {
          const fresh = await withTimeout(fetch(req, { cache:'no-store' }), 2500);
          if (fresh && fresh.ok) {
            await putCurrent(cacheKey, fresh.clone());
            return fresh;
          }
        } catch (e) {}
        const cached = await currentCacheMatch(cacheKey);
        if (cached) return cached;
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

function sitepassNormalizeRoomTypeV40(value){
  const type = String(value || '').trim().toLowerCase();
  if (type === 'admin_inquiry') return 'admin';
  return ['system','share','expiry','admin','member_chat'].includes(type) ? type : '';
}

function sitepassNormalizeRoomIdV40(roomType, roomId){
  const type = sitepassNormalizeRoomTypeV40(roomType);
  if (type === 'admin') return 'admin';
  if (['system','share','expiry'].includes(type)) return type;
  return type === 'member_chat' ? String(roomId || '').trim().toLowerCase() : '';
}

function sitepassPushDataV40(payload){
  const nested = payload && payload.data && typeof payload.data === 'object'
    ? payload.data
    : {};
  const data = Object.assign({}, nested);
  data.url = data.url || payload.url || './';
  data.roomType = data.roomType || data.room_type || payload.roomType || payload.room_type || '';
  data.roomId = data.roomId || data.room_id || payload.roomId || payload.room_id || '';
  data.recipientMember = data.recipientMember || data.recipient_member ||
    payload.recipientMember || payload.recipient_member || '';
  data.recipientMemberUuid = data.recipientMemberUuid || data.recipient_member_uuid ||
    payload.recipientMemberUuid || payload.recipient_member_uuid || '';
  data.recipientAuthUserId = data.recipientAuthUserId || data.recipient_auth_user_id ||
    payload.recipientAuthUserId || payload.recipient_auth_user_id || '';
  data.messageId = data.messageId || data.message_id || payload.messageId || payload.message_id || '';
  data.eventKey = data.eventKey || data.event_key || payload.eventKey || payload.event_key || '';
  data.roomType = sitepassNormalizeRoomTypeV40(data.roomType);
  data.roomId = sitepassNormalizeRoomIdV40(data.roomType, data.roomId);
  return data;
}

function sitepassRecipientKeysV40(data){
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const values = [];
  [
    data && data.recipientMember,
    data && data.recipientMemberUuid,
    data && data.recipientAuthUserId
  ].concat(Array.isArray(data && data.recipientKeys) ? data.recipientKeys : []).forEach(value => {
    const key = String(value || '').trim().toLowerCase();
    if (uuid.test(key) && !values.includes(key)) values.push(key);
  });
  return values;
}

async function sitepassShouldSuppressChatPushV40(data){
  const roomType = sitepassNormalizeRoomTypeV40(data && data.roomType);
  const roomId = sitepassNormalizeRoomIdV40(roomType, data && data.roomId);
  if (!['admin','member_chat'].includes(roomType) || !roomId) return false;

  const recipientKeys = sitepassRecipientKeysV40(data);
  /* Missing recipient identity is fail-open: show the Push, never hide it. */
  if (!recipientKeys.length) return false;

  const clientList = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
  const activeIds = new Set(clientList.map(client => String(client.id || '')));
  for (const key of SITEPASS_CHAT_PRESENCE_V40.keys()) {
    if (!activeIds.has(key)) SITEPASS_CHAT_PRESENCE_V40.delete(key);
  }

  for (const client of clientList) {
    const presence = SITEPASS_CHAT_PRESENCE_V40.get(String(client.id || ''));
    if (!presence) continue;
    const clientVisible = client.visibilityState === 'visible' &&
      (client.focused === true || (typeof client.focused === 'undefined' && presence.focused === true));
    const sameRecipient = presence.recipientKeys.some(key => recipientKeys.includes(key));
    if (
      clientVisible &&
      presence.foreground === true &&
      presence.visible === true &&
      sameRecipient &&
      presence.roomType === roomType &&
      presence.roomId === roomId
    ) return true;
  }
  return false;
}

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch (e) { try { payload = { body: event.data ? event.data.text() : '' }; } catch (err) { payload = {}; } }
  const data = sitepassPushDataV40(payload);
  const title = payload.title || 'SitePass';
  const options = {
    body: payload.body || 'SitePass에서 확인할 알림이 있습니다.',
    icon: payload.icon || './icons/sitepass-icon-192.png',
    badge: payload.badge || './icons/sitepass-icon-192.png',
    tag: payload.tag || data.eventKey || data.messageId || 'sitepass-push',
    data,
    /*
     * 같은 tag의 새 채팅 알림도 Android가 다시 알리도록 요청한다.
     * 실제 소리/진동 최종 허용 여부는 Android/브라우저 알림 채널 정책을 따른다.
     */
    renotify: payload.renotify !== false,
    silent: false,
    vibrate: Array.isArray(payload.vibrate) && payload.vibrate.length
      ? payload.vibrate
      : [180, 80, 180]
  };
  event.waitUntil((async () => {
    if (await sitepassShouldSuppressChatPushV40(data)) {
      const clientList = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
      clientList.forEach(client => {
        try { client.postMessage({ type:'SITEPASS_CHAT_PUSH_SUPPRESSED_V40', data }); } catch(e) {}
      });
      return;
    }
    await self.registration.showNotification(title, options);
  })());
});

function sitepassPushTargetUrlV597(data){
  data = sitepassPushDataV40({ data:data || {} });
  const roomType = sitepassNormalizeRoomTypeV40(data && data.roomType);
  const roomId = sitepassNormalizeRoomIdV40(roomType, data && data.roomId);
  const fixed = ['system','share','expiry','admin'];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let target;
  try { target = new URL(String(data && data.url || './'), self.registration.scope); }
  catch (e) { target = new URL('./', self.registration.scope); }
  const scope = new URL(self.registration.scope);
  if (target.origin !== scope.origin || !target.pathname.startsWith(scope.pathname)) target = new URL('./', self.registration.scope);
  target.searchParams.delete('pushRoom');
  target.searchParams.delete('pushRoomId');
  if (fixed.includes(roomType)) target.searchParams.set('pushRoom', roomType);
  else if (roomType === 'member_chat' && uuid.test(roomId)) {
    target.searchParams.set('pushRoom', 'member_chat');
    target.searchParams.set('pushRoomId', roomId);
  }
  return target.href;
}

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = sitepassPushTargetUrlV597(data);
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type:'window', includeUncontrolled:true });

    /*
     * 이미 열린 SitePass PWA가 있으면 전체 페이지 navigate로 재부팅하지 않고
     * 현재 클라이언트에 정확한 방 열기 요청을 전달한다.
     * 앱이 완전히 닫힌 경우에만 pushRoom URL로 새 창을 연다.
     */
    for (const client of clientsList) {
      if (!('focus' in client)) continue;

      try {
        await client.focus();

        if ('postMessage' in client) {
          client.postMessage({
            type: 'SITEPASS_PUSH_OPEN_ROOM_V40',
            data,
            targetUrl
          });
          return;
        }

        if ('navigate' in client) {
          await client.navigate(targetUrl);
          return;
        }
      } catch (e) {}
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }
  })());
});
