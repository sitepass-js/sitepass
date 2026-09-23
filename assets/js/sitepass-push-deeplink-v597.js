/* SitePass v23.7.601-v40-push-direct-open-1 */
(function(){
  'use strict';
  var FIXED = ['system','share','expiry','admin'];
  var FIXED_TITLES = {
    system:'SitePass 알림',
    share:'공유기록',
    expiry:'만료알림',
    admin:'관리자문의'
  };
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var running = false;
  var completed = false;
  var pendingTarget = null;

  function normalizeTarget(roomType, roomId){
    var type = String(roomType || '').trim().toLowerCase();
    var id = String(roomId || '').trim();

    if (type === 'admin_inquiry') type = 'admin';
    if (FIXED.indexOf(type) >= 0) return { roomType:type, roomId:'' };
    if (type === 'member_chat' && UUID_RE.test(id)) {
      return { roomType:type, roomId:id };
    }
    return null;
  }

  function request(){
    if (pendingTarget) {
      return {
        roomType: pendingTarget.roomType,
        roomId: pendingTarget.roomId
      };
    }

    try {
      var params = new URLSearchParams(window.location.search || '');
      return normalizeTarget(
        params.get('pushRoom'),
        params.get('pushRoomId')
      );
    } catch(e) {}

    return null;
  }

  function cleanUrl(){
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete('pushRoom');
      url.searchParams.delete('pushRoomId');
      history.replaceState(history.state || {}, document.title || 'SitePass', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash);
    } catch(e) {}
  }

  function memberReady(){
    try {
      if (typeof window.isAdminLoggedIn === 'function' && window.isAdminLoggedIn()) return false;
      return typeof window.isMemberLoggedIn === 'function' && window.isMemberLoggedIn();
    } catch(e) { return false; }
  }

  function openInbox(){
    try {
      if (typeof window.sitepassOpenAlertChatList532 === 'function') window.sitepassOpenAlertChatList532({skipHistory:true,replace:true,restoreState:false});
      else if (typeof window.sitepassOpenChatInbox460 === 'function') window.sitepassOpenChatInbox460({skipHistory:true,replace:true,restoreState:false});
      else if (typeof window.showScreen === 'function') window.showScreen('contactScreen',{skipHistory:true,replace:true});
    } catch(e) {}
  }

  function visible(element){
    if (!element) return false;
    try {
      var style = window.getComputedStyle(element);
      return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        !element.classList.contains('hidden') &&
        !element.classList.contains('sitepass-chat-hidden');
    } catch(e) { return false; }
  }

  function memberUiReady(roomId){
    try {
      var api = window.SitePassMemberLinkChatV566;
      var state = api && typeof api.getState === 'function' ? api.getState() : null;
      var rooms = state && state.list && Array.isArray(state.list.rooms) ? state.list.rooms : [];
      var roomExists = rooms.some(function(room){
        return String(room && room.roomId || '') === String(roomId || '');
      });
      return !!(
        api &&
        typeof api.openRoom === 'function' &&
        roomExists &&
        document.getElementById('contactScreen') &&
        document.getElementById('sitepassChatListPanel') &&
        document.getElementById('sitepassChatRoomPanel') &&
        document.getElementById('sp566MemberRoomPanel')
      );
    } catch(e) { return false; }
  }

  function memberRoomOpened(roomId){
    try {
      var api = window.SitePassMemberLinkChatV566;
      var state = api && typeof api.getState === 'function' ? api.getState() : null;
      var contact = document.getElementById('contactScreen');
      var list = document.getElementById('sitepassChatListPanel');
      var fixed = document.getElementById('sitepassChatRoomPanel');
      var member = document.getElementById('sp566MemberRoomPanel');
      var title = String((document.getElementById('sp566MemberRoomTitle') || {}).textContent || '').trim();
      return !!(
        state &&
        String(state.currentRoomId || '') === String(roomId || '') &&
        visible(contact) &&
        !visible(list) &&
        !visible(fixed) &&
        visible(member) &&
        title
      );
    } catch(e) { return false; }
  }

  function fixedRoomOpened(roomType){
    try {
      var contact = document.getElementById('contactScreen');
      var list = document.getElementById('sitepassChatListPanel');
      var fixed = document.getElementById('sitepassChatRoomPanel');
      var member = document.getElementById('sp566MemberRoomPanel');
      var title = String((document.getElementById('sitepassChatRoomTitle') || {}).textContent || '').trim();
      return !!(
        visible(contact) &&
        !visible(list) &&
        visible(fixed) &&
        !visible(member) &&
        title === FIXED_TITLES[roomType]
      );
    } catch(e) { return false; }
  }

  function complete(timer){
    clearInterval(timer);
    completed = true;
    running = false;
    pendingTarget = null;
    cleanUrl();
  }

  function tryOpen(){
    if (running || completed) return;
    var target = request();
    if (!target) return;
    running = true;

    var tries = 0;
    var inboxRequested = false;
    var openRequestedAt = 0;
    var stableChecks = 0;
    var timer = setInterval(function(){
      tries += 1;

      if (!memberReady()) {
        if (tries >= 240) {
          clearInterval(timer);
          running = false;
        }
        return;
      }

      /*
       * 회원채팅 딥링크는 로그인 가드·채팅목록 전환이 비동기로
       * 완료된 뒤 상세방을 열어야 한다. URL은 실제 패널이 안정적으로
       * 열린 것을 확인한 뒤에만 정리한다.
       */
      if (target.roomType === 'member_chat') {
        if (memberRoomOpened(target.roomId)) {
          stableChecks += 1;
          if (stableChecks >= 10) complete(timer);
          return;
        }

        stableChecks = 0;

        if (!inboxRequested) {
          openInbox();
          inboxRequested = true;
          return;
        }

        if (!memberUiReady(target.roomId)) {
          if (tries >= 240) {
            clearInterval(timer);
            running = false;
          }
          return;
        }

        var contact = document.getElementById('contactScreen');
        var list = document.getElementById('sitepassChatListPanel');
        if (!visible(contact) || !visible(list)) {
          if (tries >= 240) {
            clearInterval(timer);
            running = false;
          }
          return;
        }

        if (!openRequestedAt || Date.now() - openRequestedAt >= 900) {
          try {
            window.SitePassMemberLinkChatV566.openRoom(target.roomId);
            openRequestedAt = Date.now();
          } catch(e) {}
        }

        if (tries >= 240) {
          clearInterval(timer);
          running = false;
        }
        return;
      }

      /* 기존 고정방 경로는 유지하되 실제 단일 패널 노출 후 URL을 정리한다. */
      if (fixedRoomOpened(target.roomType)) {
        stableChecks += 1;
        if (stableChecks >= 3) complete(timer);
        return;
      }

      stableChecks = 0;
      if (!inboxRequested) {
        openInbox();
        inboxRequested = true;
      }

      if (
        typeof window.sitepassOpenChatRoom460 === 'function' &&
        (!openRequestedAt || Date.now() - openRequestedAt >= 500)
      ) {
        try {
          window.sitepassOpenChatRoom460(target.roomType);
          openRequestedAt = Date.now();
        } catch(e) {}
      }

      if (tries >= 240) {
        clearInterval(timer);
        running = false;
      }
    }, 100);
  }

  /*
   * 이미 열린 PWA에서 Service Worker가 알림 클릭을 전달하면
   * 페이지 재부팅 없이 동일한 기존 방 열기 API를 사용한다.
   */
  if (
    navigator.serviceWorker &&
    typeof navigator.serviceWorker.addEventListener === 'function'
  ) {
    navigator.serviceWorker.addEventListener('message', function(event){
      var message = event && event.data || {};
      if (message.type !== 'SITEPASS_PUSH_OPEN_ROOM_V40') return;

      var data = message.data && typeof message.data === 'object'
        ? message.data
        : {};

      var target = normalizeTarget(
        data.roomType || data.room_type,
        data.roomId || data.room_id
      );

      if (!target) return;

      pendingTarget = target;
      completed = false;

      if (!running) {
        setTimeout(tryOpen, 0);
      }
    });
  }

  /*
   * Capacitor Native Push 클릭도 기존 동일 target 정규화/방 열기 상태기계를
   * 그대로 사용합니다. Native lifecycle 모듈은 방 DOM이나 채팅 API를 직접
   * 호출하지 않고 이 이벤트만 전달합니다.
   */
  window.addEventListener('sitepass-native-push-open-v1', function(event){
    var data = event && event.detail && typeof event.detail === 'object'
      ? event.detail
      : {};

    var target = normalizeTarget(
      data.roomType || data.room_type,
      data.roomId || data.room_id
    );

    if (!target) return;

    pendingTarget = target;
    completed = false;

    if (!running) {
      setTimeout(tryOpen, 0);
    }
  });

  document.addEventListener('DOMContentLoaded', tryOpen, {once:true});
  window.addEventListener('pageshow', function(){ setTimeout(tryOpen, 50); });
  setTimeout(tryOpen, 300);
})();
