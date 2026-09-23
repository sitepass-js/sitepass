/* SitePass STEP84 V40 - per-device foreground chat presence
 *
 * The server still creates one durable outbox event.  This module only tells
 * this browser profile's Service Worker which exact room is visibly open so
 * that the same device can suppress a duplicate OS notification.
 */
(function(global){
  'use strict';

  var FIXED_ROOMS = ['system', 'share', 'expiry', 'admin'];
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var syncTimer = 0;
  var syncRevision = 0;
  var lastPayloadKey = '';
  var focused = true;
  var clientInstanceId = createInstanceId();

  function createInstanceId(){
    try {
      if (global.crypto && typeof global.crypto.randomUUID === 'function') {
        return global.crypto.randomUUID();
      }
    } catch(e) {}
    return 'presence-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function visible(element){
    if (!element) return false;
    try {
      var style = global.getComputedStyle(element);
      return !element.classList.contains('hidden') &&
        !element.classList.contains('sitepass-chat-hidden') &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    } catch(e) { return false; }
  }

  function documentFocused(){
    if (document.hidden || document.visibilityState === 'hidden') return false;
    try {
      return typeof document.hasFocus === 'function' ? document.hasFocus() : focused;
    } catch(e) { return focused; }
  }

  function fixedRoomId(){
    try {
      var api = global.SitePassChatPinnedRoomsV39;
      var state = api && typeof api.getState === 'function' ? api.getState() : null;
      var roomId = String(state && state.currentRoomId || '').trim().toLowerCase();
      return FIXED_ROOMS.indexOf(roomId) >= 0 ? roomId : '';
    } catch(e) { return ''; }
  }

  function memberRoomId(){
    try {
      var api = global.SitePassMemberLinkChatV566;
      var state = api && typeof api.getState === 'function' ? api.getState() : null;
      var roomId = String(state && state.currentRoomId || '').trim();
      return UUID_RE.test(roomId) ? roomId.toLowerCase() : '';
    } catch(e) { return ''; }
  }

  function activeRoom(){
    var contact = document.getElementById('contactScreen');
    var fixedPanel = document.getElementById('sitepassChatRoomPanel');
    var memberPanel = document.getElementById('sp566MemberRoomPanel');
    if (!visible(contact)) return { roomType:'', roomId:'' };

    var memberId = visible(memberPanel) ? memberRoomId() : '';
    if (memberId) return { roomType:'member_chat', roomId:memberId };

    var fixedId = visible(fixedPanel) ? fixedRoomId() : '';
    if (fixedId) return { roomType:fixedId, roomId:fixedId };
    return { roomType:'', roomId:'' };
  }

  function addRecipientKey(target, value){
    var key = String(value || '').trim().toLowerCase();
    if (!UUID_RE.test(key) || target.indexOf(key) >= 0) return;
    target.push(key);
  }

  async function recipientKeys(){
    var keys = [];
    try {
      var auth = global.SitePassAuthSession;
      if (auth && typeof auth.getUserId === 'function') addRecipientKey(keys, await auth.getUserId());
    } catch(e) {}
    try {
      var member = typeof global.getCurrentMemberTest === 'function'
        ? global.getCurrentMemberTest()
        : (typeof global.getCurrentMember === 'function' ? global.getCurrentMember() : null);
      [
        member && member.member_uuid,
        member && member.memberUuid,
        member && member.auth_user_id,
        member && member.authUserId,
        member && member.uuid,
        member && member.id
      ].forEach(function(value){ addRecipientKey(keys, value); });
    } catch(e) {}
    return keys;
  }

  function postToWorker(payload){
    if (!navigator.serviceWorker) return false;
    var sent = false;
    try {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(payload);
        sent = true;
      }
    } catch(e) {}
    try {
      navigator.serviceWorker.ready.then(function(registration){
        var worker = registration && (registration.active || registration.waiting || registration.installing);
        if (worker && worker !== navigator.serviceWorker.controller) worker.postMessage(payload);
      }).catch(function(){});
    } catch(e) {}
    return sent;
  }

  async function syncNow(force){
    var revision = ++syncRevision;
    var room = activeRoom();
    var keys = await recipientKeys();
    if (revision !== syncRevision) return false;
    var payload = {
      type: 'SITEPASS_CHAT_PRESENCE_V40',
      clientInstanceId: clientInstanceId,
      recipientKeys: keys,
      foreground: !document.hidden && document.visibilityState !== 'hidden' && documentFocused(),
      visible: !document.hidden && document.visibilityState !== 'hidden',
      focused: documentFocused(),
      roomType: room.roomType,
      roomId: room.roomId,
      updatedAt: new Date().toISOString()
    };
    var payloadKey = JSON.stringify([
      payload.recipientKeys,
      payload.foreground,
      payload.visible,
      payload.focused,
      payload.roomType,
      payload.roomId
    ]);
    if (!force && payloadKey === lastPayloadKey) return true;
    lastPayloadKey = payloadKey;
    return postToWorker(payload);
  }

  function scheduleSync(force){
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function(){ syncNow(!!force); }, 30);
  }

  function installObserver(){
    var contact = document.getElementById('contactScreen');
    if (!contact || typeof MutationObserver !== 'function') return;
    try {
      var observer = new MutationObserver(function(){ scheduleSync(false); });
      observer.observe(contact, {
        attributes: true,
        attributeFilter: ['class', 'style'],
        childList: true,
        characterData: true,
        subtree: true
      });
    } catch(e) {}
  }

  function boot(){
    installObserver();
    scheduleSync(true);
    document.addEventListener('visibilitychange', function(){ scheduleSync(true); });
    global.addEventListener('focus', function(){ focused = true; scheduleSync(true); });
    global.addEventListener('blur', function(){ focused = false; scheduleSync(true); });
    global.addEventListener('pageshow', function(){ focused = true; scheduleSync(true); });
    global.addEventListener('pagehide', function(){ focused = false; scheduleSync(true); });
    global.addEventListener('popstate', function(){ scheduleSync(false); });
    global.addEventListener('sitepass-realtime-invalidation-v664', function(){ scheduleSync(false); });
    try {
      var auth = global.SitePassAuthSession;
      if (auth && typeof auth.subscribe === 'function') {
        auth.subscribe(function(){ scheduleSync(true); });
      }
    } catch(e) {}
  }

  global.SitePassChatPresenceV40 = Object.freeze({
    sync: function(){ return syncNow(true); },
    getState: function(){
      var room = activeRoom();
      return {
        roomType: room.roomType,
        roomId: room.roomId,
        foreground: !document.hidden && document.visibilityState !== 'hidden' && documentFocused(),
        clientInstanceId: clientInstanceId
      };
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
})(window);
