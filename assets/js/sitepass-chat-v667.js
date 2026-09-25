/* SitePass STEP81 V22 alert UI read-state sync
 * PC <-> mobile server union sync for recipient-share read state and expiry UI state.
 * Fail-open: existing local behavior remains available if sync RPC is unavailable.
 * Account-switch guard: local member auth UID must match current Supabase session UID before upload/apply.
 */
/* SitePass 23.7.680-73-system-notification-render-race-fix
 * Keep system-notification rendering bound to the current system room, not to a stale openSequence.
 * Prevent a successful 200 response from leaving the UI stuck on "알림을 불러오는 중입니다." after same-room reopen.
 */
/* SitePass 23.7.678-73-system-notification-member-guard
 * Skip the member-only system-notification room RPC for admin/non-member sessions.
 */
/* SitePass 23.7.667-58-fixed-room-render-isolation
 * Prevent expiry polling loop from rendering into an open share-history room.
 */
/* SitePass 23.7.666-58-share-read-clear-fix
 * Fix room visibility predicate so share history is marked read only while the visible share room is actually open.
 */
/* SitePass 23.7.665-58-share-unread-visibility-fix
 * Clear stale fixed-room state when leaving 알림/채팅 and require visible chat screen before auto-read.
 */
/* SitePass 23.7.664-58-realtime-admin-inquiry
 * Auth-scoped Realtime invalidation + canonical server 관리자문의.
 */
/* SitePass v23.7.599-55-chat-panel-isolation
 * 기존 채팅/서버 원본 유지 + 공유기록 제외 선택 삭제(내 화면 숨김) + Push 딥링크 연동
 */
(function(){
  'use strict';

  var NOTICE_KEY = 'sitepass_chat_notice_settings_v460';
  var LEGACY_NOTICE_KEY = 'sitepass_chat_notice_settings_v445';
  var LEGACY_ADMIN_MESSAGES_KEY = 'sitepass_admin_chat_messages_v445';
  var CONTACTS_KEY = 'sitePass_v23_7_7_update_original_corrected_contacts';
  var CURRENT_MEMBER_KEYS = [
    'sitePass_v23_7_7_update_original_corrected_currentMember',
    'sitePass_v23_7_7_update_original_corrected_pwa_auto_member_v23_7_145',
    'sitePass_v23_7_7_update_original_corrected_browser_auto_member_v23_7_395'
  ];
  var EXPIRY_DELETED_PREFIX = 'sitepass_expiry_deleted_v460:';
  var EXPIRY_READ_PREFIX = 'sitepass_expiry_read_v467:';
  var EXPIRY_MILESTONE_LOG_PREFIX = 'sitepass_expiry_milestone_log_v467:';
  var EXPIRY_TEST_PREFIX = 'sitepass_expiry_test_v479:';
  var ADMIN_DELETED_PREFIX = 'sitepass_admin_chat_deleted_v466:';
  var SYSTEM_NOTIFICATION_DELETED_PREFIX_V597 = 'sitepass_system_notification_deleted_v597:';
  var currentRoomId = '';
  var navWrapped = false;
  var deleteMode = false;
  var selectedDeleteGroups = Object.create(null);
  var lastExpiryUnreadCount479 = -1;
  var SHARE_TRACKING_CACHE_PREFIX_V521 = 'sitepass_recipient_share_events_cache_v577:';
  var SHARE_EVENT_READ_PREFIX_V577 = 'sitepass_recipient_share_events_read_v577:';
  var shareTrackingRowsV521 = [];
  var shareTrackingLoadingV521 = false;
  var shareTrackingLastFetchAtV521 = 0;
  var chatOpenSequenceV522 = 0;
  var CHAT_ROOM_SESSION_KEY_V532 = 'sitepass_chat_room_v532';
  var alertUiStateSyncLoadingV22 = false;
  var alertUiStateSyncPendingV22 = false;
  var alertUiStateSyncLastAtV22 = 0;
  var alertUiStateSyncTimerV22 = 0;
  var alertUiStateSyncApplyingV22 = false;
  var ALERT_UI_STATE_SYNC_MIN_INTERVAL_V22 = 4000;
  var fixedRoomEntryStateV40 = null;
  var fixedRoomScrollRequestV40 = 0;
  var fixedRoomViewportFrameV40 = 0;
  var fixedRoomMobileUxBoundV40 = false;


  /* 6구간-50단계: 기존 채팅과 분리된 V2 SitePass 시스템 알림 고정방. */
  var SYSTEM_NOTIFICATION_ROOM_ID_V585 = 'system';
  var systemNotificationRoomV585 = null;
  var systemNotificationItemsV585 = [];
  var systemNotificationRoomLoadedV585 = false;
  var systemNotificationItemsLoadedV585 = false;
  var systemNotificationRoomLoadingV585 = false;
  var systemNotificationItemsLoadingV585 = false;
  var systemNotificationLastFetchAtV585 = 0;
  var systemNotificationLastReadAtV585 = 0;

  /* STEP85: 회원 고객센터 canonical 서버 상태는 SitePassSupportV85.room이 소유합니다. */

  function isExplicitSignedOutV79(){
    try {
      var authEventStateV79 =
        window.SitePassAuthEvents &&
        typeof window.SitePassAuthEvents.getState === 'function'
          ? window.SitePassAuthEvents.getState()
          : null;
      return !!(
        authEventStateV79 &&
        Number(authEventStateV79.revision || 0) > 0 &&
        String(authEventStateV79.type || '') === 'SIGNED_OUT'
      );
    } catch(e) {
      return false;
    }
  }

  function supportRootV85(){
    return window.SitePassSupportV85 || null;
  }

  function supportRoomV85(){
    var root = supportRootV85();
    return root && root.room ? root.room : null;
  }

  function supportUiV85(){
    var root = supportRootV85();
    return root && root.ui ? root.ui : null;
  }

  function adminInquiryLoadedV85(){
    var room = supportRoomV85();

    return !!room &&
      typeof room.isLoaded === 'function' &&
      !!room.isLoaded();
  }

  async function refreshAdminInquiryRoomV664(force){
    var room = supportRoomV85();

    if (!room || typeof room.refresh !== 'function') {
      return false;
    }

    return room.refresh(!!force);
  }

  function adminInquiryUnreadV664(){
    var room = supportRoomV85();

    if (!room || typeof room.unread !== 'function') {
      return 0;
    }

    return Math.max(
      0,
      Number(room.unread()) || 0
    );
  }

  function adminInquiryMessagesV664(){
    var ui = supportUiV85();

    if (!ui || typeof ui.messages !== 'function') {
      return [];
    }

    return ui.messages(nowText);
  }

  async function markAdminInquiryReadV664(){
    var room = supportRoomV85();

    if (!room || typeof room.markRead !== 'function') {
      return false;
    }

    return room.markRead();
  }

  function rememberChatRoomV532(roomId){
    try {
      if (roomId && ROOMS[roomId]) sessionStorage.setItem(CHAT_ROOM_SESSION_KEY_V532, roomId);
      else sessionStorage.removeItem(CHAT_ROOM_SESSION_KEY_V532);
      sessionStorage.setItem('sitepass_last_screen_v491', 'contactScreen');
    } catch(e) {}
  }

  function rememberedChatRoomV532(){
    try {
      var roomId = String(sessionStorage.getItem(CHAT_ROOM_SESSION_KEY_V532) || '');
      return ROOMS[roomId] ? roomId : '';
    } catch(e) { return ''; }
  }

  /* v23.7.553-recovery-test
     새 알림이 들어오는 순간 서버 재조회와 화면 전환이 겹쳐 첫 클릭이 먹히지 않는 현상을 막습니다.
     알림/채팅 화면과 방 패널은 서버 응답을 기다리지 않고 즉시 열고, 서버자료는 뒤에서 갱신합니다. */
  function forceContactScreenVisibleV522(){
    var contact = $('contactScreen');
    if (!contact) return false;
    try {
      if (typeof window.showScreen === 'function') window.showScreen('contactScreen');
    } catch(e) {}
    try {
      document.querySelectorAll('.screen').forEach(function(screen){
        var active = screen === contact;
        screen.classList.toggle('hidden', !active);
        if (active) {
          screen.style.display = '';
          screen.style.visibility = '';
          screen.style.opacity = '';
          screen.style.pointerEvents = '';
        } else {
          screen.style.display = 'none';
          screen.style.visibility = 'hidden';
          screen.style.opacity = '0';
          screen.style.pointerEvents = 'none';
        }
      });
      document.body.classList.add('sitepass-app-nav-active');
      var nav = $('sitepassBottomAppNav');
      if (nav) {
        nav.classList.remove('hidden');
        nav.querySelectorAll('button[data-target]').forEach(function(button){
          button.classList.toggle('active', button.getAttribute('data-target') === 'contactScreen');
        });
      }
    } catch(e) {}
    return true;
  }

  function applyChatPanelStateV522(roomId){
    var listPanel = $('sitepassChatListPanel');
    var roomPanel = $('sitepassChatRoomPanel');
    var memberRoomPanel = $('sp566MemberRoomPanel');
    var openRoom = !!roomId;

    /* v23.7.599-55
       회원 1:1 채팅방을 본 뒤 고정방을 열 때 두 상세 패널이 함께 남지 않도록
       고정방/목록 전환에서 회원채팅 상세 패널을 항상 닫습니다. */
    if (memberRoomPanel) memberRoomPanel.classList.add('hidden');
    if (listPanel) listPanel.classList.toggle('sitepass-chat-hidden', openRoom);
    if (roomPanel) roomPanel.classList.toggle('sitepass-chat-hidden', !openRoom);
  }

  function stabilizeChatOpenV522(roomId, sequence){
    [0, 50, 160].forEach(function(delay){
      setTimeout(function(){
        if (sequence !== chatOpenSequenceV522) return;
        if (roomId && currentRoomId !== roomId) return;
        if (!roomId && currentRoomId) return;
        forceContactScreenVisibleV522();
        applyChatPanelStateV522(roomId || '');
        if (roomId) renderMessages(roomId);
        else renderRoomList();
      }, delay);
    });
  }

  var ROOMS = {
    system: { title: 'SitePass 알림', icon: '🔔', desc: 'SitePass 시스템 알림을 확인합니다.', type: 'system_notification' },
    expiry: { title: '만료알림', icon: '⏰', desc: 'D-30·D-15·D-7·D-DAY 만료 알림을 확인합니다.', type: 'system' },
    share: { title: '공유기록', icon: '🔗', desc: '전송·열람·다운로드·인쇄·만료·회수 기록을 확인합니다.', type: 'system' },
    admin: { title: '관리자문의', icon: '👨‍💼', desc: '관리자와 1:1로 메시지를 주고받습니다.', type: 'admin' }
  };

  function $(id){ return document.getElementById(id); }
  function nowText(value){
    var d = value ? new Date(value) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    return String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0') + ' '
      + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function escapeAttr(value){ return escapeHtml(value); }

  /*
   * STEP84 V40 fixed-room mobile UX.
   *
   * Mobile fixed rooms used BODY as the real scroll container while the
   * desktop layout used #sitepassChatMessages.  Keep one resolver for both
   * layouts, snapshot unread state before read-marking, and guard every async
   * position request with the existing room/open sequence.
   */
  function isFixedRoomMobileV40(){
    try { return !!(window.matchMedia && window.matchMedia('(max-width: 919px)').matches); }
    catch(e) { return false; }
  }

  function fixedRoomVisibleV40(roomId, sequence){
    if (!roomId || currentRoomId !== roomId) return false;
    if (typeof sequence === 'number' && sequence !== chatOpenSequenceV522) return false;
    return isChatScreenVisible482(roomId);
  }

  function fixedRoomUnreadCountV40(roomId){
    if (roomId === SYSTEM_NOTIFICATION_ROOM_ID_V585) return systemNotificationUnreadV585();
    return unreadCount(roomId);
  }

  function fixedRoomFirstUnreadMessageIdV40(roomId){
    if (roomId === SYSTEM_NOTIFICATION_ROOM_ID_V585) {
      var systemRows = visibleSystemNotificationItemsV597();
      var explicitSystemUnread = systemRows.find(function(item){
        return item && item.isRead !== true && !item.readAt && !item.read_at;
      });
      if (explicitSystemUnread) {
        return String(explicitSystemUnread.notificationId || explicitSystemUnread.notification_id || '');
      }
      var systemUnread = Math.max(0, Number(systemNotificationUnreadV585()) || 0);
      if (systemUnread > 0 && systemRows.length) {
        var systemIndex = Math.max(0, systemRows.length - systemUnread);
        return String(systemRows[systemIndex].notificationId || systemRows[systemIndex].notification_id || '');
      }
      return '';
    }

    var rows = messagesFor(roomId);
    var unreadRow = rows.find(function(message){ return message && message.unread === true; });
    if (!unreadRow) unreadRow = rows.find(function(message){ return message && message.read === false; });
    return unreadRow ? String(unreadRow.id || '') : '';
  }

  function fixedRoomDataReadyV40(roomId){
    if (roomId === SYSTEM_NOTIFICATION_ROOM_ID_V585) return !!systemNotificationItemsLoadedV585;
    if (roomId === 'admin') return adminInquiryLoadedV85();
    return roomId === 'share' || roomId === 'expiry';
  }

  function settleFixedRoomEntryV40(roomId, sequence){
    var state = fixedRoomEntryStateV40;
    if (!state || state.roomId !== roomId || state.sequence !== sequence || state.mode !== 'pending') return false;
    if (!fixedRoomDataReadyV40(roomId)) return false;
    var unread = Math.max(0, Number(fixedRoomUnreadCountV40(roomId)) || 0);
    state.unreadCount = unread;
    state.mode = unread > 0 ? 'unread' : 'latest';
    state.anchorId = unread > 0 ? fixedRoomFirstUnreadMessageIdV40(roomId) : '';
    return true;
  }

  function beginFixedRoomEntryV40(roomId, sequence){
    fixedRoomScrollRequestV40 += 1;
    fixedRoomEntryStateV40 = {
      roomId: roomId,
      sequence: sequence,
      mode: 'pending',
      anchorId: '',
      unreadCount: 0,
      completed: false
    };
    if (roomId === 'expiry') settleFixedRoomEntryV40(roomId, sequence);
  }

  function clearFixedRoomMobileStateV40(){
    fixedRoomScrollRequestV40 += 1;
    fixedRoomEntryStateV40 = null;
    var panel = $('sitepassChatRoomPanel');
    if (panel) panel.style.removeProperty('--sitepass-fixed-room-height-v40');
  }

  function fixedRoomMessageElementV40(messageId){
    var box = $('sitepassChatMessages');
    if (!box) return null;
    if (!messageId) return box.querySelector('.sitepass-chat-message-row');
    var rows = box.querySelectorAll('.sitepass-chat-message-row[data-message-id]');
    for (var index = 0; index < rows.length; index += 1) {
      if (String(rows[index].getAttribute('data-message-id') || '') === String(messageId)) return rows[index];
    }
    return null;
  }

  function fixedRoomScrollTargetV40(){
    var box = $('sitepassChatMessages');
    if (box) {
      try {
        var boxStyle = window.getComputedStyle(box);
        if (/auto|scroll/.test(String(boxStyle.overflowY || ''))) {
          return { type:'element', node:box };
        }
      } catch(e) {}
    }

    var candidates = [document.scrollingElement, document.body, document.documentElement];
    var selected = null;
    var selectedRange = -1;
    var seen = [];
    candidates.forEach(function(node){
      if (!node || seen.indexOf(node) >= 0) return;
      seen.push(node);
      var range = Math.max(0, Number(node.scrollHeight || 0) - Number(node.clientHeight || 0));
      if (Number(node.scrollTop || 0) > 0 || range > selectedRange) {
        selected = node;
        selectedRange = range;
      }
    });
    return selected ? { type:'document', node:selected } : null;
  }

  function fixedRoomScrollLimitV40(target){
    return target && target.node
      ? Math.max(0, Number(target.node.scrollHeight || 0) - Number(target.node.clientHeight || 0))
      : 0;
  }

  function fixedRoomIsNearLatestV40(target){
    if (!target || !target.node) return true;
    var limit = fixedRoomScrollLimitV40(target);
    var tolerance = 24;
    try {
      tolerance = Math.max(12, (parseFloat(window.getComputedStyle(target.node).lineHeight) || 12) * 2);
    } catch(e) {}
    return limit - Number(target.node.scrollTop || 0) <= tolerance;
  }

  function captureFixedRoomScrollV40(){
    var target = fixedRoomScrollTargetV40();
    if (!target || !target.node) return null;
    return {
      type: target.type,
      node: target.node,
      scrollTop: Number(target.node.scrollTop || 0),
      nearLatest: fixedRoomIsNearLatestV40(target)
    };
  }

  function fixedRoomVisibleBoundsV40(){
    var viewport = window.visualViewport;
    var top = viewport ? Number(viewport.offsetTop || 0) : 0;
    var height = viewport ? Number(viewport.height || window.innerHeight || 0) : Number(window.innerHeight || 0);
    return { top:top, bottom:top + height, height:height };
  }

  function applyFixedRoomPositionV40(mode, anchorId){
    var target = fixedRoomScrollTargetV40();
    var box = $('sitepassChatMessages');
    if (!target || !target.node || !box) return false;
    var anchor = mode === 'unread'
      ? fixedRoomMessageElementV40(anchorId)
      : box.querySelector('.sitepass-chat-message-row:last-child');

    if (target.type === 'element') {
      if (mode === 'latest' || !anchor) {
        target.node.scrollTop = target.node.scrollHeight;
      } else {
        var boxRect = target.node.getBoundingClientRect();
        var anchorRect = anchor.getBoundingClientRect();
        var nextTop = Number(target.node.scrollTop || 0) + anchorRect.top - boxRect.top;
        target.node.scrollTop = Math.max(0, Math.min(fixedRoomScrollLimitV40(target), nextTop));
      }
      return true;
    }

    if (!anchor) anchor = box;
    var bounds = fixedRoomVisibleBoundsV40();
    var anchorBounds = anchor.getBoundingClientRect();
    var desiredTop = bounds.top + 8;
    var desiredBottom = bounds.bottom - 8;
    var composer = $('sitepassChatComposer');
    var nav = $('sitepassBottomAppNav');
    try {
      if (composer && !composer.classList.contains('sitepass-chat-hidden')) {
        desiredBottom = Math.min(desiredBottom, composer.getBoundingClientRect().top - 8);
      } else if (nav && !nav.classList.contains('hidden')) {
        desiredBottom = Math.min(desiredBottom, nav.getBoundingClientRect().top - 8);
      }
    } catch(e) {}
    var delta = mode === 'unread'
      ? anchorBounds.top - desiredTop
      : anchorBounds.bottom - desiredBottom;
    var documentTop = Number(target.node.scrollTop || 0) + delta;
    target.node.scrollTop = Math.max(0, Math.min(fixedRoomScrollLimitV40(target), documentTop));
    return true;
  }

  function restoreFixedRoomScrollV40(memory){
    var target = fixedRoomScrollTargetV40();
    if (!memory || !target || !target.node || target.node !== memory.node) return false;
    if (memory.nearLatest) target.node.scrollTop = target.node.scrollHeight;
    else target.node.scrollTop = Math.max(0, Math.min(fixedRoomScrollLimitV40(target), memory.scrollTop));
    return true;
  }

  function queueFixedRoomPositionV40(roomId, sequence, position, memory, completeEntry){
    var token = ++fixedRoomScrollRequestV40;
    [0, 50, 160].forEach(function(delay){
      setTimeout(function(){
        if (token !== fixedRoomScrollRequestV40 || !fixedRoomVisibleV40(roomId, sequence)) return;
        refreshFixedRoomViewportV40();
        if (position) applyFixedRoomPositionV40(position.mode, position.anchorId || '');
        else if (memory) restoreFixedRoomScrollV40(memory);
      }, delay);
    });
    if (completeEntry) {
      setTimeout(function(){
        var state = fixedRoomEntryStateV40;
        if (token !== fixedRoomScrollRequestV40 || !state) return;
        if (state.roomId === roomId && state.sequence === sequence) state.completed = true;
      }, 190);
    }
  }

  function afterFixedRoomRenderV40(roomId, memory){
    if (!fixedRoomVisibleV40(roomId, chatOpenSequenceV522)) return;
    var state = fixedRoomEntryStateV40;
    if (state && state.roomId === roomId && state.sequence === chatOpenSequenceV522 && !state.completed) {
      if (state.mode !== 'pending') {
        queueFixedRoomPositionV40(roomId, state.sequence, {
          mode: state.mode,
          anchorId: state.anchorId
        }, null, true);
      }
      return;
    }
    if (memory) queueFixedRoomPositionV40(roomId, chatOpenSequenceV522, null, memory, false);
  }

  function refreshFixedRoomViewportV40(){
    var panel = $('sitepassChatRoomPanel');
    if (!panel) return;
    if (!currentRoomId || !isFixedRoomMobileV40() || panel.classList.contains('sitepass-chat-hidden')) {
      panel.style.removeProperty('--sitepass-fixed-room-height-v40');
      return;
    }
    if (fixedRoomViewportFrameV40) return;
    var schedule = window.requestAnimationFrame || function(callback){ return setTimeout(callback, 0); };
    fixedRoomViewportFrameV40 = schedule(function(){
      fixedRoomViewportFrameV40 = 0;
      if (!currentRoomId || !isFixedRoomMobileV40() || panel.classList.contains('sitepass-chat-hidden')) return;
      var bounds = fixedRoomVisibleBoundsV40();
      var panelRect = panel.getBoundingClientRect();
      var visibleTop = Math.max(bounds.top, panelRect.top);
      var visibleBottom = bounds.bottom;
      var nav = $('sitepassBottomAppNav');
      if (nav && !nav.classList.contains('hidden')) {
        var navRect = nav.getBoundingClientRect();
        if (navRect.top < visibleBottom && navRect.bottom > bounds.top) visibleBottom = Math.min(visibleBottom, navRect.top);
      }
      var parentPaddingBottom = 0;
      try { parentPaddingBottom = parseFloat(window.getComputedStyle(panel.parentElement).paddingBottom) || 0; }
      catch(e) {}
      var available = Math.max(0, Math.floor(visibleBottom - visibleTop - parentPaddingBottom));
      panel.style.setProperty('--sitepass-fixed-room-height-v40', available + 'px');
    });
  }

  function resizeAdminTextareaV40(textarea){
    if (!textarea) return;
    var style;
    try { style = window.getComputedStyle(textarea); } catch(e) { style = null; }
    var minHeight = Math.max(0, parseFloat(style && style.minHeight) || 54);
    var maxHeight = Math.max(minHeight, parseFloat(style && style.maxHeight) || 150);
    textarea.style.height = 'auto';
    var nextHeight = Math.max(minHeight, Math.min(maxHeight, Number(textarea.scrollHeight || minHeight)));
    textarea.style.height = nextHeight + 'px';
    textarea.style.overflowY = Number(textarea.scrollHeight || 0) > maxHeight + 1 ? 'auto' : 'hidden';
  }

  function queueAdminLatestV40(){
    if (currentRoomId !== 'admin') return;
    queueFixedRoomPositionV40('admin', chatOpenSequenceV522, { mode:'latest', anchorId:'' }, null, false);
  }

  function bindFixedRoomMobileUxV40(){
    if (fixedRoomMobileUxBoundV40) return;
    fixedRoomMobileUxBoundV40 = true;
    var viewportHandler = function(){
      refreshFixedRoomViewportV40();
      if (currentRoomId === 'admin' && document.activeElement === $('sitepassChatText')) queueAdminLatestV40();
    };
    window.addEventListener('resize', viewportHandler);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', viewportHandler);
      window.visualViewport.addEventListener('scroll', viewportHandler);
    }
    document.addEventListener('focusin', function(event){
      if (event.target !== $('sitepassChatText') || currentRoomId !== 'admin') return;
      resizeAdminTextareaV40(event.target);
      refreshFixedRoomViewportV40();
      queueAdminLatestV40();
    });
    document.addEventListener('focusout', function(event){
      if (event.target !== $('sitepassChatText') || currentRoomId !== 'admin') return;
      setTimeout(function(){
        refreshFixedRoomViewportV40();
        queueAdminLatestV40();
      }, 0);
    });
    document.addEventListener('input', function(event){
      if (event.target !== $('sitepassChatText')) return;
      resizeAdminTextareaV40(event.target);
      refreshFixedRoomViewportV40();
      if (currentRoomId === 'admin' && document.activeElement === event.target) queueAdminLatestV40();
    });
  }


  function systemNotificationTextV585(item){
    var type = String(item && (item.notificationType || item.notification_type) || '');
    if (type === 'member_link_accepted') return '장비 연동이 완료되었습니다.';
    if (type === 'member_link_revoked') return '장비 연동이 해제되었습니다.';
    return '새로운 SitePass 알림이 있습니다.';
  }

  function normalizeSystemNotificationRoomV585(value){
    var room = Array.isArray(value) ? (value[0] || null) : value;
    if (room && room.sitepass_get_my_system_notification_room_v1) {
      room = room.sitepass_get_my_system_notification_room_v1;
    }
    if (!room || room.roomKey !== 'sitepass_system_notifications') return null;
    return room;
  }

  function systemNotificationUnreadV585(){
    return Math.max(0, Number(systemNotificationRoomV585 && systemNotificationRoomV585.unreadCount) || 0);
  }

  function systemNotificationLatestTextV585(){
    if (systemNotificationItemsLoadedV585) {
      var visible = visibleSystemNotificationItemsV597();
      if (visible.length) return systemNotificationTextV585(visible[visible.length - 1]);
      return '새 시스템 알림이 없습니다.';
    }
    if (!systemNotificationRoomLoadedV585) return 'SitePass 시스템 알림을 확인합니다.';
    if (!systemNotificationRoomV585 || !systemNotificationRoomV585.latest) return '새 시스템 알림이 없습니다.';
    return systemNotificationTextV585(systemNotificationRoomV585.latest);
  }

  async function refreshSystemNotificationRoomV585(force){
    if (isExplicitSignedOutV79()) return false;
    try {
      if (typeof window.isAdminLoggedIn === 'function' && window.isAdminLoggedIn()) return false;
      if (typeof window.isMemberLoggedIn === 'function' && !window.isMemberLoggedIn()) return false;
    } catch(e) { return false; }
    var client = window.sitepassSupabase;
    if (!client || typeof client.rpc !== 'function') return false;
    var now = Date.now();
    if (!force && systemNotificationRoomLoadedV585 && now - systemNotificationLastFetchAtV585 < 10000) return true;
    if (systemNotificationRoomLoadingV585) return false;
    systemNotificationRoomLoadingV585 = true;
    var requestStartedAt = Date.now();
    try {
      var result = await client.rpc('sitepass_get_my_system_notification_room_v1');
      if (result && !result.error) {
        var room = normalizeSystemNotificationRoomV585(result.data);
        if (room) {
          if (requestStartedAt < systemNotificationLastReadAtV585 && Number(room.unreadCount || 0) > 0) {
            room.unreadCount = 0;
            if (room.latest) room.latest.isRead = true;
          }
          systemNotificationRoomV585 = room;
          systemNotificationRoomLoadedV585 = true;
          systemNotificationLastFetchAtV585 = Date.now();
          renderRoomList();
          return true;
        }
      }
    } catch(e) {}
    finally { systemNotificationRoomLoadingV585 = false; }
    return false;
  }

  function renderSystemNotificationMessagesV585(state){
    var box = $('sitepassChatMessages');
    if (!box) return;
    var scrollMemory = captureFixedRoomScrollV40();
    var rows = visibleSystemNotificationItemsV597();
    box.classList.toggle('selecting', deleteMode);
    if (state === 'loading' && !systemNotificationItemsLoadedV585) {
      box.innerHTML = '<div class="sitepass-chat-message-row system"><div class="sitepass-chat-bubble system"><span class="meta">SitePass · 안내</span><div class="sitepass-chat-bubble-text">알림을 불러오는 중입니다.</div></div></div>';
      afterFixedRoomRenderV40(SYSTEM_NOTIFICATION_ROOM_ID_V585, scrollMemory);
      return;
    }
    if (state === 'error' && !systemNotificationItemsLoadedV585) {
      box.innerHTML = '<div class="sitepass-chat-message-row system"><div class="sitepass-chat-bubble system"><span class="meta">SitePass · 안내</span><div class="sitepass-chat-bubble-text">알림을 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</div></div></div>';
      afterFixedRoomRenderV40(SYSTEM_NOTIFICATION_ROOM_ID_V585, scrollMemory);
      return;
    }
    if (!rows.length) {
      box.innerHTML = '<div class="sitepass-chat-message-row system"><div class="sitepass-chat-bubble system"><span class="meta">SitePass · 안내</span><div class="sitepass-chat-bubble-text">새 시스템 알림이 없습니다.</div></div></div>';
      updateDeleteBar();
      afterFixedRoomRenderV40(SYSTEM_NOTIFICATION_ROOM_ID_V585, scrollMemory);
      return;
    }
    box.innerHTML = rows.map(function(item){
      var id = String(item.notificationId || item.notification_id || '');
      var createdAt = item.createdAt || item.created_at || '';
      var checkboxHtml = deleteMode
        ? '<label class="sitepass-chat-select-check" title="선택"><input type="checkbox" data-delete-group="' + escapeAttr(id) + '" onchange="return sitepassToggleChatMessageSelect465(\'' + escapeAttr(id) + '\', this.checked)"' + (selectedDeleteGroups[id] ? ' checked' : '') + '><span aria-hidden="true">✓</span></label>'
        : '';
      return '<div class="sitepass-chat-message-row system" data-message-id="' + escapeAttr(id) + '" data-delete-group="' + escapeAttr(id) + '">'
        + checkboxHtml
        + '<div class="sitepass-chat-bubble system">'
        + '<span class="meta">SitePass · ' + escapeHtml(nowText(createdAt)) + '</span>'
        + '<div class="sitepass-chat-bubble-text">' + escapeHtml(systemNotificationTextV585(item)) + '</div>'
        + '</div></div>';
    }).join('');
    updateDeleteBar();
    if (!deleteMode) afterFixedRoomRenderV40(SYSTEM_NOTIFICATION_ROOM_ID_V585, scrollMemory);
  }

  async function refreshSystemNotificationItemsV585(markRead, openSequence){
    if (isExplicitSignedOutV79()) return false;
    try {
      if (typeof window.isAdminLoggedIn === 'function' && window.isAdminLoggedIn()) return false;
      if (typeof window.isMemberLoggedIn === 'function' && !window.isMemberLoggedIn()) return false;
    } catch(e) { return false; }
    var client = window.sitepassSupabase;
    if (!client || typeof client.rpc !== 'function') {
      if (currentRoomId === SYSTEM_NOTIFICATION_ROOM_ID_V585) renderSystemNotificationMessagesV585('error');
      return false;
    }
    if (systemNotificationItemsLoadingV585) return false;
    systemNotificationItemsLoadingV585 = true;
    try {
      var listResult = await client.rpc('sitepass_list_my_member_notifications_v2', {
        p_before_created_at: null,
        p_before_notification_id: null,
        p_limit: 50
      });
      if (!listResult || listResult.error) throw new Error('SYSTEM_NOTIFICATION_LIST_FAILED');
      var data = listResult.data || {};
      systemNotificationItemsV585 = Array.isArray(data.items) ? data.items : [];
      systemNotificationItemsLoadedV585 = true;
      if (currentRoomId === SYSTEM_NOTIFICATION_ROOM_ID_V585) {
        var activeOpenSequence = typeof openSequence === 'number' ? openSequence : chatOpenSequenceV522;
        settleFixedRoomEntryV40(SYSTEM_NOTIFICATION_ROOM_ID_V585, activeOpenSequence);
        renderSystemNotificationMessagesV585();
      }

      if (markRead) {
        var readResult = await client.rpc('sitepass_mark_my_member_notifications_read_v2');
        if (!readResult || readResult.error) throw new Error('SYSTEM_NOTIFICATION_READ_FAILED');
        systemNotificationLastReadAtV585 = Date.now();
        systemNotificationItemsV585.forEach(function(item){
          item.isRead = true;
          if (!item.readAt) item.readAt = new Date().toISOString();
        });
        if (systemNotificationRoomV585) {
          systemNotificationRoomV585.unreadCount = Math.max(0, Number(readResult.data && readResult.data.remainingUnreadCount) || 0);
          if (systemNotificationRoomV585.latest) systemNotificationRoomV585.latest.isRead = true;
        }
        renderRoomList();
        await refreshSystemNotificationRoomV585(true);
        if (currentRoomId === SYSTEM_NOTIFICATION_ROOM_ID_V585) {
          renderSystemNotificationMessagesV585();
        }
      }
      return true;
    } catch(e) {
      if (currentRoomId === SYSTEM_NOTIFICATION_ROOM_ID_V585) {
        var fallbackOpenSequence = typeof openSequence === 'number' ? openSequence : chatOpenSequenceV522;
        settleFixedRoomEntryV40(SYSTEM_NOTIFICATION_ROOM_ID_V585, fallbackOpenSequence);
        renderSystemNotificationMessagesV585('error');
      }
      return false;
    } finally {
      systemNotificationItemsLoadingV585 = false;
    }
  }
  function loadJson(key, fallback){
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch(e) { return fallback; }
  }
  function saveJson(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
  }
  function normalize(value){ return String(value || '').trim().toLowerCase(); }
  function cleanPhone(value){ return String(value || '').replace(/[^0-9]/g, ''); }
  function hashText(value){
    var text = String(value || '');
    var hash = 2166136261;
    for (var i=0; i<text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
  }

  function getCurrentMember(){
    try {
      if (typeof window.getCurrentMemberTest === 'function') {
        var member = window.getCurrentMemberTest();
        if (member && typeof member === 'object') return member;
      }
    } catch(e) {}
    var stores = [sessionStorage, localStorage];
    for (var s=0; s<stores.length; s++) {
      for (var k=0; k<CURRENT_MEMBER_KEYS.length; k++) {
        try {
          var parsed = JSON.parse(stores[s].getItem(CURRENT_MEMBER_KEYS[k]) || 'null');
          if (parsed && typeof parsed === 'object') return parsed;
        } catch(e) {}
      }
    }
    return null;
  }

  function stripLoginPrefix(value){
    return String(value || '').trim()
      .replace(/^SITEPASS-LOGIN-/i, '')
      .replace(/^SITEPASS-/i, '');
  }

  function currentIdentity(){
    var member = getCurrentMember() || {};
    var loginId = String(member.supabaseLoginId || member.login_id || member.loginId || member.signupId || '').trim();
    if (!loginId) loginId = stripLoginPrefix(member.providerId || member.id || member.userId || '');
    if (!loginId) loginId = cleanPhone(member.phone || member.mobile || '');
    var name = String(member.name || member.companyName || '').trim();
    return {
      loginId: loginId,
      key: normalize(loginId || member.providerId || member.id || member.phone || name || 'guest'),
      name: name,
      phone: cleanPhone(member.phone || member.mobile || member.phoneNumber || ''),
      email: String(member.email || '').trim().toLowerCase(),
      member: member
    };
  }

  function shareTrackingCacheKeyV521(){ return SHARE_TRACKING_CACHE_PREFIX_V521 + (currentIdentity().key || 'guest'); }
  function shareEventReadKeyV577(){ return SHARE_EVENT_READ_PREFIX_V577 + (currentIdentity().key || 'guest'); }
  function loadShareEventReadIdsV577(){
    var rows = loadJson(shareEventReadKeyV577(), []);
    return Array.isArray(rows) ? rows.map(function(v){ return String(v || ''); }).filter(Boolean) : [];
  }
  function saveShareEventReadIdsV577(ids){
    var unique = Array.from(new Set((ids || []).map(function(v){ return String(v || ''); }).filter(Boolean))).slice(-1000);
    saveJson(shareEventReadKeyV577(), unique);
    return unique;
  }
  function shareTimeTextV521(value){
    var d = value ? new Date(value) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    var hour = d.getHours();
    var period = hour < 12 ? '오전' : '오후';
    var displayHour = hour % 12 || 12;
    return (d.getMonth()+1) + '월 ' + d.getDate() + '일 ' + period + ' ' + displayHour + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function normalizeShareTrackingRowV521(row){
    if (!row || typeof row !== 'object') return null;
    var eventId = String(row.eventId || row.event_id || row.id || '').trim();
    var eventType = String(row.eventType || row.event_type || '').trim().toLowerCase();
    if (!eventId || ['sent','opened','downloaded','printed','expired','revoked'].indexOf(eventType) < 0) return null;
    return {
      event_id:eventId,
      token_id:String(row.tokenId || row.token_id || ''),
      event_type:eventType,
      event_at:row.eventAt || row.event_at || '',
      actor_type:String(row.actorType || row.actor_type || ''),
      channel:String(row.channel || ''),
      equipment_id:String(row.equipmentId || row.equipment_id || ''),
      equipment_no:String(row.equipmentNo || row.equipment_no || ''),
      equipment_name:String(row.equipmentName || row.equipment_name || ''),
      token_state:String(row.tokenState || row.token_state || ''),
      expires_at:row.expiresAt || row.expires_at || '',
      revoked_at:row.revokedAt || row.revoked_at || '',
      document_id:String(row.documentId || row.document_id || ''),
      file_id:String(row.fileId || row.file_id || ''),
      source:String(row.source || ''),
      recipient_channel:String(row.recipientChannel || row.recipient_channel || ''),
      recipient_name:String(row.recipientName || row.recipient_name || ''),
      recipient_phone:String(row.recipientPhone || row.recipient_phone || ''),
      recipient_context_resolved:
        row.recipientContextResolved === true ||
        row.recipient_context_resolved === true
    };
  }
  function loadShareTrackingCacheV521(){
    var rows = loadJson(shareTrackingCacheKeyV521(), []);
    shareTrackingRowsV521 = Array.isArray(rows) ? rows.map(normalizeShareTrackingRowV521).filter(Boolean) : [];
    return shareTrackingRowsV521;
  }
  function saveShareTrackingCacheV521(rows){
    shareTrackingRowsV521 = (Array.isArray(rows) ? rows : []).map(normalizeShareTrackingRowV521).filter(Boolean).slice(0,200);
    saveJson(shareTrackingCacheKeyV521(), shareTrackingRowsV521);
    return shareTrackingRowsV521;
  }
  function mergeShareTrackingRowV521(){
    // v577부터 공유 기록방의 원본은 Recipient V2 Event RPC 하나만 사용한다.
    // Legacy tracking row를 캐시에 섞지 않고 서버 원본을 다시 읽는다.
    refreshShareTrackingServerV521(true);
    return null;
  }
  async function refreshShareTrackingServerV521(force){
    if (isExplicitSignedOutV79()) return {ok:false, skipped:true, signedOut:true};
    try {
      if (typeof window.isAdminLoggedIn === 'function' && window.isAdminLoggedIn()) return {ok:false, skipped:true, admin:true};
      if (typeof window.isMemberLoggedIn === 'function' && !window.isMemberLoggedIn()) return {ok:false, skipped:true};
    } catch(e) {}
    if (!window.sitepassSupabase || typeof window.sitepassSupabase.rpc !== 'function') return {ok:false, skipped:true};
    var now = Date.now();
    if (shareTrackingLoadingV521) return {ok:true, cached:true, loading:true};
    if (!force && now - shareTrackingLastFetchAtV521 < 25000) return {ok:true, cached:true};
    shareTrackingLoadingV521 = true;
    shareTrackingLastFetchAtV521 = now;
    try {
      var result = await window.sitepassSupabase.rpc('sitepass_get_my_recipient_share_events_v3', {
        p_limit: 200,
        p_offset: 0
      });
      if (result && result.error) throw result.error;
      var payload = Array.isArray(result && result.data) ? (result.data[0] || {}) : ((result && result.data) || {});
      var rows = payload && Array.isArray(payload.items) ? payload.items : [];
      saveShareTrackingCacheV521(rows);
      renderRoomList();
      if (currentRoomId === 'share' && isChatScreenVisible482('share')) {
        settleFixedRoomEntryV40('share', chatOpenSequenceV522);
        renderMessages('share');
        setTimeout(function(){
          if (currentRoomId === 'share' && isChatScreenVisible482('share') && unreadCount('share') > 0) {
            markShareTrackingReadV521();
          }
        }, 350);
      }
      return {ok:true, rows:shareTrackingRowsV521, total:Number(payload.total || rows.length || 0)};
    } catch(e) {
      console.warn('SitePass Recipient 공유기록 서버조회 실패:', e);
      return {ok:false, message:e && e.message ? e.message : String(e || '')};
    } finally {
      shareTrackingLoadingV521 = false;
    }
  }
  async function markShareTrackingReadV521(){
    var rows = loadShareTrackingCacheV521();
    var ids = loadShareEventReadIdsV577();
    rows.forEach(function(row){ if (row && row.event_id) ids.push(row.event_id); });
    saveShareEventReadIdsV577(ids);
    queueAlertUiStateSyncV22(80);
    renderRoomList();
    if (currentRoomId === 'share') renderMessages('share');
    return true;
  }

  function noticeSettings(){
    var base = loadJson(NOTICE_KEY, null);
    if (!base || typeof base !== 'object') base = loadJson(LEGACY_NOTICE_KEY, {});
    ['expiry','share','admin'].forEach(function(room){
      if (typeof base[room] !== 'boolean') base[room] = true;
    });
    saveJson(NOTICE_KEY, base);
    return base;
  }
  function roomPushApiV595(){ return window.SitePassRoomPushV595 || null; }
  function roomNoticeOn(roomId){
    var api = roomPushApiV595();
    if (api && typeof api.get === 'function') return api.get(roomId, null) !== false;
    if (roomId === 'system') return true;
    return !!noticeSettings()[roomId];
  }
  function roomPushBusyV595(roomId){
    var api = roomPushApiV595();
    return !!(api && typeof api.isBusy === 'function' && api.isBusy(roomId, null));
  }
  function setRoomNotice(roomId, on){
    var api = roomPushApiV595();
    if (api && typeof api.set === 'function') return api.set(roomId, null, !!on, { interactive:true });
    var settings = noticeSettings();
    settings[roomId] = !!on;
    saveJson(NOTICE_KEY, settings);
    return Promise.resolve(true);
  }
  function roomPushToggleHtmlV595(roomId, on, className){
    var busy = roomPushBusyV595(roomId);
    var label = busy ? '저장 중' : (on ? '알림 ON' : '알림 OFF');
    return '<em role="button" tabindex="0" data-sp595-room-type="' + escapeAttr(roomId) + '" aria-label="' + escapeAttr(ROOMS[roomId].title + ' 휴대폰 Push ' + (on ? '끄기' : '켜기')) + '" aria-pressed="' + (on ? 'true' : 'false') + '" class="' + className + (on ? '' : ' off') + (busy ? ' sp595-push-busy' : '') + '" onclick="return window.SitePassRoomPushV595.handleToggle(event,this.getAttribute(&quot;data-sp595-room-type&quot;),null)" onkeydown="return window.SitePassRoomPushV595.handleKey(event,this.getAttribute(&quot;data-sp595-room-type&quot;),null)">' + label + '</em>';
  }

  function safeItems460(){
    try { if (typeof window.safeItems === 'function') return window.safeItems(); } catch(e) {}
    try { if (typeof window.getItems === 'function') return window.getItems(); } catch(e) {}
    try { if (typeof safeItems === 'function') return safeItems(); } catch(e) {}
    try { if (typeof getItems === 'function') return getItems(); } catch(e) {}
    return [];
  }
  function itemTitle(item){
    return String((item && (item.equipmentName || item.equipmentType || item.name || item.bundleTitle || item.title)) || '등록 장비');
  }
  function itemNo(item){
    return String((item && (item.equipmentNo || item.carNo || item.vehicleNo || item.code)) || '번호 미입력');
  }

  function expiryDeletedKey(){ return EXPIRY_DELETED_PREFIX + (currentIdentity().key || 'guest'); }
  function expiryReadKey(){ return EXPIRY_READ_PREFIX + (currentIdentity().key || 'guest'); }
  function expiryMilestoneLogKey(){ return EXPIRY_MILESTONE_LOG_PREFIX + (currentIdentity().key || 'guest'); }
  function expiryTestKey479(){ return EXPIRY_TEST_PREFIX + (currentIdentity().key || 'guest'); }
  function adminDeletedKey(){ return ADMIN_DELETED_PREFIX + (currentIdentity().key || 'guest'); }
  function systemNotificationDeletedKeyV597(){ return SYSTEM_NOTIFICATION_DELETED_PREFIX_V597 + (currentIdentity().key || 'guest'); }
  function expiryTestMode479(){
    try {
      if (sessionStorage.getItem('sitepass_expiry_test_mode_v481') === '1') return true;
      return new URLSearchParams(window.location.search || '').get('expirytest') === '1';
    } catch(e) { return false; }
  }
  function loadExpiryTestLogs479(){
    var rows = loadJson(expiryTestKey479(), []);
    return Array.isArray(rows) ? rows.filter(function(row){ return row && row.id && row.readId; }) : [];
  }
  function saveExpiryTestLogs479(rows){ saveJson(expiryTestKey479(), Array.isArray(rows) ? rows : []); }
  function deletedIds(key){
    var rows = loadJson(key, []);
    return Array.isArray(rows) ? rows : [];
  }
  function saveDeletedIds(key, rows){ saveJson(key, Array.from(new Set(rows || []))); }
  function deletedExpiryIds(){ return deletedIds(expiryDeletedKey()); }
  function saveDeletedExpiryIds(rows){ saveDeletedIds(expiryDeletedKey(), rows); }
  function readExpiryIds(){ return deletedIds(expiryReadKey()); }
  function saveReadExpiryIds(rows){ saveDeletedIds(expiryReadKey(), rows); }

  function uniqueStringListV22(values, limit){
    var seen = Object.create(null);
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function(value){
      var textValue = String(value || '').trim();
      if (!textValue || seen[textValue]) return;
      seen[textValue] = true;
      out.push(textValue);
    });
    return typeof limit === 'number' && limit > 0 ? out.slice(-limit) : out;
  }

  function currentLocalMemberIdentityV22(){
    var member = getCurrentMember() || {};
    return {
      memberId: String(member.memberId || member.member_id || member.id || '').trim(),
      authUid: String(member.authUserId || member.auth_user_id || member.supabaseAuthUserId || '').trim()
    };
  }

  async function localMemberMatchesAuthSessionV22(client){
    var local = currentLocalMemberIdentityV22();
    if (!local.memberId || !local.authUid) return null;
    try {
      if (!client || !client.auth || typeof client.auth.getSession !== 'function') return null;
      var result = await client.auth.getSession();
      var session = result && result.data && result.data.session;
      var sessionUid = String(session && session.user && session.user.id || '').trim();
      if (!sessionUid || sessionUid.toLowerCase() !== local.authUid.toLowerCase()) return null;
      return local;
    } catch(e) {
      return null;
    }
  }

  function mergeExpiryMilestoneLogsV22(localRows, serverRows){
    var byId = Object.create(null);
    (Array.isArray(serverRows) ? serverRows : []).forEach(function(row){
      if (!row || typeof row !== 'object') return;
      var id = String(row.id || '').trim();
      if (!id) return;
      byId[id] = row;
    });
    (Array.isArray(localRows) ? localRows : []).forEach(function(row){
      if (!row || typeof row !== 'object') return;
      var id = String(row.id || '').trim();
      if (!id) return;
      byId[id] = row;
    });
    return Object.keys(byId).map(function(id){ return byId[id]; }).sort(function(a,b){
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    }).slice(-400);
  }

  function applyServerAlertUiStateV22(payload, expectedMemberId){
    if (!payload || payload.ok !== true) return false;
    var serverMemberId = String(payload.memberId || '').trim();
    var local = currentLocalMemberIdentityV22();
    if (!serverMemberId || !expectedMemberId || serverMemberId !== expectedMemberId) return false;
    if (!local.memberId || local.memberId !== expectedMemberId) return false;

    alertUiStateSyncApplyingV22 = true;
    try {
      saveShareEventReadIdsV577(
        uniqueStringListV22(
          loadShareEventReadIdsV577().concat(
            Array.isArray(payload.shareReadEventIds) ? payload.shareReadEventIds : []
          ),
          1000
        )
      );

      saveReadExpiryIds(
        uniqueStringListV22(
          readExpiryIds().concat(
            Array.isArray(payload.expiryReadIds) ? payload.expiryReadIds : []
          ),
          1000
        )
      );

      saveDeletedExpiryIds(
        uniqueStringListV22(
          deletedExpiryIds().concat(
            Array.isArray(payload.expiryDeletedIds) ? payload.expiryDeletedIds : []
          ),
          1000
        )
      );

      saveExpiryMilestoneLogs467(
        mergeExpiryMilestoneLogsV22(
          loadExpiryMilestoneLogs467(),
          Array.isArray(payload.expiryMilestoneLogs) ? payload.expiryMilestoneLogs : []
        )
      );

      /* 서버 history를 현재 장비/서류 상태와 즉시 재조정하여
         변경된 만료일의 과거 UI row가 화면에 다시 나타나지 않게 합니다. */
      syncExpiryMilestoneLogs467();
    } finally {
      alertUiStateSyncApplyingV22 = false;
    }

    try { renderRoomList(); } catch(e) {}
    try { updateHomeExpiryUnread479(true); } catch(e) {}
    try { updateBottomUnreadBadge(); } catch(e) {}
    try {
      if (currentRoomId === 'expiry' || currentRoomId === 'share') {
        renderMessages(currentRoomId);
      }
    } catch(e) {}
    return true;
  }

  async function syncAlertUiStateV22(force){
    if (isExplicitSignedOutV79()) return {ok:false, skipped:true, signedOut:true};
    try {
      if (typeof window.isAdminLoggedIn === 'function' && window.isAdminLoggedIn()) {
        return {ok:false, skipped:true, admin:true};
      }
      if (typeof window.isMemberLoggedIn === 'function' && !window.isMemberLoggedIn()) {
        return {ok:false, skipped:true, member:false};
      }
    } catch(e) {}

    var client = window.sitepassSupabase;
    if (!client || typeof client.rpc !== 'function') return {ok:false, skipped:true, noClient:true};

    var now = Date.now();
    if (!force && alertUiStateSyncLastAtV22 && now - alertUiStateSyncLastAtV22 < ALERT_UI_STATE_SYNC_MIN_INTERVAL_V22) {
      return {ok:true, cached:true};
    }
    if (alertUiStateSyncLoadingV22) {
      alertUiStateSyncPendingV22 = true;
      return {ok:true, loading:true};
    }

    var localIdentity = await localMemberMatchesAuthSessionV22(client);
    if (!localIdentity) return {ok:false, skipped:true, identityMismatch:true};

    alertUiStateSyncLoadingV22 = true;
    alertUiStateSyncPendingV22 = false;

    try {
      var result = await client.rpc('sitepass_sync_my_alert_ui_state_v1', {
        p_share_read_event_ids: uniqueStringListV22(loadShareEventReadIdsV577(), 1000),
        p_expiry_read_ids: uniqueStringListV22(readExpiryIds(), 1000),
        p_expiry_deleted_ids: uniqueStringListV22(deletedExpiryIds(), 1000),
        p_expiry_milestone_logs: loadExpiryMilestoneLogs467().slice(-400)
      });
      if (!result || result.error) throw (result && result.error) || new Error('ALERT_UI_STATE_SYNC_FAILED');

      var payload = Array.isArray(result.data) ? (result.data[0] || null) : result.data;
      if (!applyServerAlertUiStateV22(payload, localIdentity.memberId)) {
        return {ok:false, skipped:true, memberMismatch:true};
      }

      alertUiStateSyncLastAtV22 = Date.now();
      return {ok:true, data:payload};
    } catch(e) {
      console.warn('SitePass 알림 읽음상태 기기간 동기화 실패:', e);
      return {ok:false, message:e && e.message ? e.message : String(e || '')};
    } finally {
      alertUiStateSyncLoadingV22 = false;
      if (alertUiStateSyncPendingV22) {
        alertUiStateSyncPendingV22 = false;
        setTimeout(function(){ syncAlertUiStateV22(true); }, 60);
      }
    }
  }

  function queueAlertUiStateSyncV22(delay){
    if (alertUiStateSyncApplyingV22 || isExplicitSignedOutV79()) return;
    clearTimeout(alertUiStateSyncTimerV22);
    alertUiStateSyncTimerV22 = setTimeout(function(){
      syncAlertUiStateV22(true);
    }, Math.max(0, Number(delay) || 0));
  }

  window.sitepassSyncAlertUiStateV22 = function(force){
    return syncAlertUiStateV22(force !== false);
  };

  function deletedAdminGroups(){ return deletedIds(adminDeletedKey()); }
  function saveDeletedAdminGroups(rows){ saveDeletedIds(adminDeletedKey(), rows); }
  function deletedSystemNotificationIdsV597(){ return deletedIds(systemNotificationDeletedKeyV597()); }
  function saveDeletedSystemNotificationIdsV597(rows){ saveDeletedIds(systemNotificationDeletedKeyV597(), rows); }
  function visibleSystemNotificationItemsV597(){
    var deleted = deletedSystemNotificationIdsV597();
    return (Array.isArray(systemNotificationItemsV585) ? systemNotificationItemsV585 : []).filter(function(item){
      var id = String(item && (item.notificationId || item.notification_id) || '');
      return !!id && deleted.indexOf(id) < 0;
    });
  }

  function parseExpiryDate467(value){
    var text = String(value || '').trim();
    if (!text) return null;
    var matched = text.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    var date;
    if (matched) date = new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]));
    else date = new Date(text);
    if (!date || isNaN(date.getTime())) return null;
    date.setHours(0,0,0,0);
    return date;
  }

  function localDateKey467(date){
    if (!date || isNaN(date.getTime())) return '';
    return date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
  }

  function displayDate467(value){
    var date = value instanceof Date ? value : parseExpiryDate467(value);
    if (!date) return String(value || '미입력');
    return date.getFullYear() + '.' + String(date.getMonth()+1).padStart(2,'0') + '.' + String(date.getDate()).padStart(2,'0');
  }

  function hasAttachedExpiryDocument467(doc){
    if (!doc || typeof doc !== 'object') return false;
    if (doc.fileName || doc.fileUrl || doc.dataUrl || doc.previewUrl || doc.storagePath || doc.storage_path || doc.attached === true || doc.uploaded === true) return true;
    if (Array.isArray(doc.pages) && doc.pages.length) return true;
    if (Array.isArray(doc.files) && doc.files.length) return true;
    return false;
  }

  function expiryDocumentStates467(){
    var today = new Date();
    today.setHours(0,0,0,0);
    var states = [];
    safeItems460().forEach(function(item, itemIndex){
      var docsObject = item && item.docs && typeof item.docs === 'object' ? item.docs : {};
      var itemStable = String(item.code || item.id || item.shareCode || item.equipmentNo || item.carNo || item.vehicleNo || itemNo(item) || ('item-' + itemIndex));
      Object.keys(docsObject).forEach(function(docKey){
        var doc = docsObject[docKey];
        if (!doc || typeof doc !== 'object') return;
        var status = String(doc.status || '').trim();
        var raw = (window.sitePassGetEffectiveDocExpireDateV486 && window.sitePassGetEffectiveDocExpireDateV486(doc)) || doc.expireDate || doc.expiryDate || doc.expiredAt || '';
        var managed = doc.expiry === true || !!raw || status === '만료' || status === '만료임박';
        if (!managed) return;
        var base = itemStable + '|' + String(docKey || doc.key || doc.title || 'document');
        var common = {
          docBaseKey: base,
          itemTitle: itemTitle(item),
          itemNo: itemNo(item),
          docTitle: String(doc.title || doc.label || doc.name || doc.fileName || docKey || '서류'),
          rawExpireDate: String(raw || '')
        };
        if (!raw) {
          if (!hasAttachedExpiryDocument467(doc)) return;
          common.state = 'missing';
          common.expireDate = '';
          common.diffDays = null;
          states.push(common);
          return;
        }
        var end = parseExpiryDate467(raw);
        if (!end) {
          common.state = 'invalid';
          common.expireDate = String(raw || '');
          common.diffDays = null;
          states.push(common);
          return;
        }
        common.state = 'valid';
        common.expireDate = localDateKey467(end);
        common.diffDays = Math.round((end.getTime() - today.getTime()) / 86400000);
        states.push(common);
      });
    });
    return states;
  }

  function milestoneLabel467(value){ return Number(value) === 0 ? 'D-DAY' : 'D-' + Number(value); }

  function initialMilestone467(diffDays){
    if (typeof diffDays !== 'number' || diffDays > 30) return null;
    if (diffDays <= 0) return 0;
    if (diffDays <= 7) return 7;
    if (diffDays <= 15) return 15;
    return 30;
  }

  function expiryMilestoneText467(state, milestone){
    var label = milestoneLabel467(milestone);
    var lines = [
      state.itemTitle + ' ' + state.itemNo,
      state.docTitle + ' · ' + label + ' 알림',
      '만료일: ' + displayDate467(state.expireDate)
    ];
    if (state.diffDays === milestone) {
      lines.push(milestone === 0 ? '오늘 만료됩니다.' : '만료일까지 ' + milestone + '일 남았습니다.');
    } else if (typeof state.diffDays === 'number' && state.diffDays > 0) {
      lines.push('알림 기준일이 지나 현재 D-' + state.diffDays + '입니다.');
    } else if (state.diffDays === 0) {
      lines.push('오늘 만료됩니다.');
    } else if (typeof state.diffDays === 'number') {
      lines.push('현재 만료일이 ' + Math.abs(state.diffDays) + '일 지났습니다.');
    }
    return lines.join('\n');
  }

  function loadExpiryMilestoneLogs467(){
    var rows = loadJson(expiryMilestoneLogKey(), []);
    return Array.isArray(rows) ? rows.filter(function(row){ return row && typeof row === 'object' && row.id; }) : [];
  }

  function saveExpiryMilestoneLogs467(rows){
    var list = Array.isArray(rows) ? rows.slice(-400) : [];
    saveJson(expiryMilestoneLogKey(), list);
    if (!alertUiStateSyncApplyingV22) queueAlertUiStateSyncV22(120);
  }

  function syncExpiryMilestoneLogs467(){
    var states = expiryDocumentStates467();
    var currentByBase = Object.create(null);
    states.forEach(function(state){ currentByBase[state.docBaseKey] = state; });
    var logs = loadExpiryMilestoneLogs467().filter(function(row){
      var state = currentByBase[row.docBaseKey];
      if (!state) return false;
      if (state.state === 'valid') return row.type === 'milestone' && row.expireDate === state.expireDate;
      return row.type === state.state;
    });
    var changed = false;
    var nowIso = new Date().toISOString();

    states.forEach(function(state){
      var rowsForDoc = logs.filter(function(row){ return row.docBaseKey === state.docBaseKey; });
      if (state.state === 'missing' || state.state === 'invalid') {
        if (!rowsForDoc.some(function(row){ return row.type === state.state; })) {
          var stateEventKey = state.docBaseKey + '|' + state.state;
          logs.push({
            id: 'expiry-' + hashText(stateEventKey),
            readId: 'expiry-read-' + hashText(stateEventKey),
            eventKey: stateEventKey,
            docBaseKey: state.docBaseKey,
            type: state.state,
            expireDate: state.expireDate || '',
            createdAt: nowIso,
            text: state.itemTitle + ' ' + state.itemNo + '\n' + state.docTitle + ' · ' + (state.state === 'missing' ? '만료일이 입력되지 않았습니다.' : '만료일 형식을 확인해주세요.')
          });
          changed = true;
        }
        return;
      }
      if (state.diffDays > 30) return;
      var existingMilestones = rowsForDoc.filter(function(row){ return row.type === 'milestone'; }).map(function(row){ return Number(row.milestone); });
      var toCreate = [];
      var currentMilestone = initialMilestone467(state.diffDays);
      /* v23.7.481: 현재 날짜에 해당하는 가장 가까운 단계만 한 번 생성합니다.
         D-DAY에 처음 앱을 열었다고 D-30·D-15·D-7 알림까지 한꺼번에 만들지 않습니다. */
      if (currentMilestone !== null && existingMilestones.indexOf(currentMilestone) < 0) {
        toCreate.push(currentMilestone);
      }
      toCreate.forEach(function(milestone, offset){
        var eventKey = state.docBaseKey + '|' + state.expireDate + '|D' + milestone;
        logs.push({
          id: 'expiry-' + hashText(eventKey),
          readId: 'expiry-read-' + hashText(eventKey),
          eventKey: eventKey,
          docBaseKey: state.docBaseKey,
          type: 'milestone',
          milestone: milestone,
          expireDate: state.expireDate,
          createdAt: new Date(Date.now() + offset).toISOString(),
          text: expiryMilestoneText467(state, milestone)
        });
        changed = true;
      });
    });

    logs.sort(function(a,b){ return String(a.createdAt || '').localeCompare(String(b.createdAt || '')); });
    if (changed || logs.length !== loadExpiryMilestoneLogs467().length) saveExpiryMilestoneLogs467(logs);
    return logs;
  }

  function expiryMessages(includeDeleted){
    var items = safeItems460();
    var deleted = deletedExpiryIds();
    var readIds = readExpiryIds();
    var messages = [{
      id: 'expiry-guide', from: 'SitePass', kind: 'system', time: '안내',
      text: '만료일이 있는 서류는 D-30·D-15·D-7·D-DAY에 자동 알림이 생성됩니다. 삭제 버튼을 누른 뒤 필요한 알림만 선택해 삭제할 수 있습니다.',
      deletable: false
    }];
    var logs = syncExpiryMilestoneLogs467().concat(loadExpiryTestLogs479());
    var actual = [];
    logs.forEach(function(row){
      if (!includeDeleted && deleted.indexOf(row.id) >= 0) return;
      actual.push({
        id: row.id,
        readId: row.readId,
        deleteGroupId: row.id,
        docBaseKey: row.docBaseKey || row.id,
        from: 'SitePass',
        kind: 'system',
        time: nowText(row.createdAt),
        deletable: true,
        read: readIds.indexOf(row.readId) >= 0,
        receipt: readIds.indexOf(row.readId) >= 0 ? '읽음' : '안 읽음',
        receiptClass: readIds.indexOf(row.readId) >= 0 ? 'read' : 'unread',
        text: String(row.text || '')
      });
    });
    if (!items.length) {
      actual.push({
        id: 'expiry-empty', from: 'SitePass', kind: 'system', time: '안내', deletable: false,
        text: '아직 등록된 장비가 없어 만료 알림이 없습니다. 장비 등록 후 이 방에서 만료 알림을 확인할 수 있습니다.'
      });
    } else if (!actual.length) {
      actual.push({
        id: 'expiry-cleared', from: 'SitePass', kind: 'system', time: '안내', deletable: false,
        text: '현재 새로 도착한 만료 알림이 없습니다. 다음 알림은 D-30·D-15·D-7·D-DAY에 생성됩니다.'
      });
    }
    return messages.concat(actual);
  }

  // v587: 서버 감사기록 원본은 그대로 보존하고 공유기록방의 표시만 묶는다.
  // 1) 같은 Token + downloaded/printed + 1초 이내 연속 파일 이벤트는 기존처럼 한 줄 묶음.
  // 2) expired는 같은 장비 + 정확히 같은 expiry sweep 시각일 때만 한 줄 묶음.
  // sent/opened/revoked 및 서로 다른 장비/시각의 expired는 이벤트 1건당 한 줄을 유지한다.
  function groupShareTrackingRowsV581(rows){
    var source = Array.isArray(rows) ? rows.filter(function(row){
      return !!(row && row.event_id && row.event_type);
    }).slice() : [];
    source.sort(function(a,b){
      return new Date(a.event_at || 0).getTime() - new Date(b.event_at || 0).getTime();
    });

    var groups = [];
    source.forEach(function(row){
      var eventType = String(row.event_type || '').toLowerCase();
      var tokenId = String(row.token_id || '');
      var equipmentKey = String(row.equipment_id || row.equipment_no || row.equipment_name || '').trim();
      var eventTimeKey = String(row.event_at || '').trim();
      var eventTime = new Date(row.event_at || 0).getTime();
      var fileBundle = eventType === 'downloaded' || eventType === 'printed';
      var expiryBundle = eventType === 'expired';
      var last = groups.length ? groups[groups.length - 1] : null;
      var withinFileWindow = !!(
        fileBundle && last && last.file_bundle &&
        last.event_type === eventType &&
        last.token_id === tokenId &&
        isFinite(eventTime) && eventTime > 0 &&
        isFinite(last.last_time) && last.last_time > 0 &&
        eventTime >= last.last_time &&
        eventTime - last.last_time <= 1000
      );
      var sameExpirySweep = !!(
        expiryBundle && last && last.expiry_bundle &&
        last.event_type === 'expired' &&
        last.equipment_key === equipmentKey &&
        equipmentKey &&
        eventTimeKey &&
        last.event_time_key === eventTimeKey
      );
      var shouldBundle = withinFileWindow || sameExpirySweep;

      if (!shouldBundle) {
        groups.push({
          bundleable:fileBundle,
          file_bundle:fileBundle,
          expiry_bundle:expiryBundle,
          event_type:eventType,
          token_id:tokenId,
          equipment_key:equipmentKey,
          event_time_key:eventTimeKey,
          first_row:row,
          last_time:isFinite(eventTime) ? eventTime : 0,
          event_ids:[String(row.event_id || '')],
          file_ids:row.file_id ? [String(row.file_id)] : []
        });
        return;
      }

      last.last_time = eventTime;
      last.event_ids.push(String(row.event_id || ''));
      if (row.file_id) {
        var fileId = String(row.file_id);
        if (last.file_ids.indexOf(fileId) < 0) last.file_ids.push(fileId);
      }
    });
    return groups;
  }

  function shareMessages(){
    var messages = [{
      id: 'share-guide', from: 'SitePass', kind: 'system', time: '안내',
      text: 'Recipient 링크의 전송·열람·다운로드·인쇄·만료·회수 기록을 서버 기준으로 확인합니다. 한 번에 처리한 여러 다운로드·인쇄 파일은 한 줄로 묶어 표시합니다.'
    }];
    var rows = loadShareTrackingCacheV521().slice();
    var readIds = loadShareEventReadIdsV577();
    var events = [];
    var labels = {
      sent:'링크 전송',
      opened:'담당자 링크 열람',
      downloaded:'서류 다운로드',
      printed:'서류 인쇄 요청',
      expired:'담당자 링크 만료',
      revoked:'담당자 링크 회수'
    };
    groupShareTrackingRowsV581(rows).forEach(function(group){
      var row = group && group.first_row;
      if (!row) return;
      var equipment = String(row.equipment_no || row.equipment_name || '장비서류').trim();
      var channel = row.channel === 'sms' ? '문자' : (row.channel === 'kakao' ? '카카오톡' : (row.channel === 'email' ? '이메일' : ''));
      var label = labels[row.event_type] || row.event_type;
      var prefix = row.event_type === 'sent' && channel ? channel + ' ' : '';
      var fileCount = Array.isArray(group.file_ids) ? group.file_ids.length : 0;
      var fileSuffix = group.bundleable && fileCount > 1 ? ' · ' + fileCount + '개 파일' : '';
      var expiryCount = row.event_type === 'expired' && Array.isArray(group.event_ids) ? group.event_ids.length : 0;
      var expirySuffix = expiryCount > 1 ? ' · ' + expiryCount + '건' : '';
      var recipientLine = '';
      if (row.recipient_context_resolved === true && row.recipient_channel === 'sms') {
        var recipientParts = [
          String(row.recipient_name || '').trim(),
          String(row.recipient_phone || '').trim()
        ].filter(Boolean);
        if (recipientParts.length) {
          recipientLine =
            recipientParts.join(' · ') +
            (row.event_type === 'sent' ? '' : '로 전송한 링크');
        }
      }
      var allRead = (group.event_ids || []).every(function(eventId){ return readIds.indexOf(eventId) >= 0; });
      events.push({
        id:'share-v2-' + String((group.event_ids && group.event_ids[0]) || row.event_id),
        from:'SitePass', kind:'system', time:shareTimeTextV521(row.event_at),
        sortAt:row.event_at,
        text:
          equipment + ' · ' + prefix + label + fileSuffix + expirySuffix +
          (recipientLine ? '\n' + recipientLine : ''),
        read:allRead
      });
    });
    events.sort(function(a,b){ return new Date(a.sortAt || 0) - new Date(b.sortAt || 0); });
    messages = messages.concat(events);
    if (messages.length === 1) {
      messages.push({
        id:'share-empty', from:'SitePass', kind:'system', time:'안내',
        text:'아직 Recipient 링크 공유 기록이 없습니다. 링크를 전송하거나 담당자가 열람·다운로드·인쇄하면 이 방에 표시됩니다.'
      });
    }
    return messages;
  }

  function getContactsSafe(){
    try { if (typeof window.getContacts === 'function') return window.getContacts(); } catch(e) {}
    try { if (typeof getContacts === 'function') return getContacts(); } catch(e) {}
    var rows = loadJson(CONTACTS_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }
  function setContactsSafe(rows){
    try { if (typeof window.setContacts === 'function') { window.setContacts(rows); return; } } catch(e) {}
    try { if (typeof setContacts === 'function') { setContacts(rows); return; } } catch(e) {}
    saveJson(CONTACTS_KEY, rows || []);
  }

  function isContactForIdentity(item, identity){
    if (!item) return false;
    var rowKey = normalize(item.memberLoginId || item.member_login_id || item.memberKey || item.loginId || '');
    if (rowKey && identity.key) return rowKey === identity.key || rowKey === normalize(identity.loginId);
    if (item.source === 'sitepass_chat_v460') return true;
    return false;
  }

  function adminMessages(){
    var base = [{
      id: 'admin-guide', from: '관리자', kind: 'admin', time: '안내', deletable: false,
      text: '관리자와 1:1로 대화할 수 있습니다. 메시지를 보내면 관리자 답변이 이 방에 이어서 표시됩니다.'
    }];

    if (adminInquiryLoadedV85()) {
      return base.concat(adminInquiryMessagesV664());
    }

    /* 서버 원본 전환 직후 첫 조회 전까지만 구버전 브라우저 자료를 읽기 전용으로 표시합니다. */
    var identity = currentIdentity();
    var contacts = getContactsSafe().filter(function(item){ return isContactForIdentity(item, identity); });
    contacts.sort(function(a,b){ return new Date(a.createdAt || 0) - new Date(b.createdAt || 0); });
    contacts.forEach(function(item){
      var rawContactId = String(item.id || hashText((item.message || '') + '|' + (item.createdAt || '')));
      base.push({
        id: 'legacy-member-' + rawContactId,
        from: '나', kind: 'me', time: nowText(item.createdAt), text: item.message || '', deletable: false
      });
      if (item.reply) {
        base.push({
          id: 'legacy-admin-' + rawContactId,
          from: '관리자', kind: 'admin', time: nowText(item.repliedAt), text: item.reply || '', deletable: false
        });
      }
    });
    return base;
  }

  function messagesFor(roomId){
    if (roomId === 'expiry') return expiryMessages(false);
    if (roomId === 'share') return shareMessages();
    return adminMessages();
  }

  function markExpiryRoomRead(){
    var rows = expiryMessages(false).filter(function(msg){ return !!msg.deletable && !!msg.readId; });
    var ids = readExpiryIds();
    var changed = false;
    rows.forEach(function(msg){
      if (ids.indexOf(msg.readId) < 0) { ids.push(msg.readId); changed = true; }
    });
    if (changed) {
      saveReadExpiryIds(ids);
      queueAlertUiStateSyncV22(80);
    }
    return changed;
  }

  function markAdminRepliesReadByMember(){
    markAdminInquiryReadV664();
    return true;
  }

  function isChatScreenVisible482(roomId){
    var screen = $('contactScreen');
    var panel = $('sitepassChatRoomPanel');
    var expectedRoomId = roomId || currentRoomId;

    if (!screen || !panel || !expectedRoomId) return false;
    if (screen.classList.contains('hidden') || panel.classList.contains('sitepass-chat-hidden')) return false;

    try {
      var screenStyle = window.getComputedStyle(screen);
      var panelStyle = window.getComputedStyle(panel);

      if (
        screenStyle.display === 'none'
        || screenStyle.visibility === 'hidden'
        || panelStyle.display === 'none'
        || panelStyle.visibility === 'hidden'
      ) {
        return false;
      }
    } catch(e) {}

    return currentRoomId === expectedRoomId;
  }

  function unreadCount(roomId){
    if (roomId === 'expiry') {
      return expiryMessages(false).filter(function(msg){ return !!msg.deletable && !msg.read; }).length;
    }
    if (roomId === 'share') {
      var readIds = loadShareEventReadIdsV577();
      return groupShareTrackingRowsV581(loadShareTrackingCacheV521()).reduce(function(total,group){
        var allRead = (group.event_ids || []).every(function(eventId){ return readIds.indexOf(eventId) >= 0; });
        if (!allRead) total += 1;
        return total;
      }, 0);
    }
    if (roomId === 'admin') {
      return adminInquiryUnreadV664();
    }
    return 0;
  }

  function totalUnreadCount(){ return unreadCount('expiry') + unreadCount('share') + unreadCount('admin'); }

  function updateHomeExpiryUnread479(force){
    var count = unreadCount('expiry');
    var badge = document.getElementById('sitepassHomeExpiryCount465');
    if (badge) {
      badge.textContent = String(count);
      badge.classList.toggle('hidden', count < 1);
      badge.setAttribute('aria-label', '읽지 않은 만료 알림 ' + count + '건');
      badge.title = '읽지 않은 만료 알림 ' + count + '건';
    }
    if (force || count !== lastExpiryUnreadCount479) {
      lastExpiryUnreadCount479 = count;
      try { window.dispatchEvent(new CustomEvent('sitepass-expiry-unread-changed', { detail: { count: count } })); } catch(e) {}
    }
    return count;
  }

  window.sitepassGetExpiryUnreadCount479 = function(){ return unreadCount('expiry'); };
  window.sitepassGetFixedBottomUnreadCount460 = function(){ return totalUnreadCount(); };
  window.sitepassRefreshExpiryAlerts479 = function(){
    syncExpiryMilestoneLogs467();
    updateHomeExpiryUnread479(true);
    renderRoomList();
    if (currentRoomId === 'expiry') renderMessages('expiry');
    return unreadCount('expiry');
  };

  function updateBottomUnreadBadge(){
    var button = document.querySelector('#sitepassBottomAppNav button[data-target="contactScreen"]');
    if (!button) return;
    var legacyMemberBadge = button.querySelector('.sp566-member-unread-badge');
    if (legacyMemberBadge) {
      legacyMemberBadge.remove();
    }
    var badge = button.querySelector('.sitepass-bottom-unread-badge');
    if (!badge) {
      badge = document.createElement('i');
      badge.className = 'sitepass-bottom-unread-badge';
      badge.setAttribute('aria-label', '읽지 않은 알림 수');
      button.appendChild(badge);
    }
    var memberUnread = typeof window.sitepassGetMemberLinkChatUnreadCount566 === 'function'
      ? Number(window.sitepassGetMemberLinkChatUnreadCount566() || 0)
      : 0;
    var count = Math.max(0, totalUnreadCount() + memberUnread);
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.toggle('hidden', count < 1);
    badge.title = '읽지 않은 알림 ' + count + '건';
    updateHomeExpiryUnread479(false);
  }

  function latestText(roomId){
    var messages = messagesFor(roomId);
    var last = messages[messages.length - 1];
    return last ? String(last.text || '').replace(/\n/g, ' ').slice(0, 120) : ROOMS[roomId].desc;
  }

  function compactRoomDateV592(value){
    var d = value ? new Date(value) : null;
    if (!d || isNaN(d.getTime())) return '';
    var now = new Date();
    if (d.getFullYear() === now.getFullYear()) {
      return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
    }
    return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }

  function roomListTimeV592(roomId){
    if (roomId === 'system') {
      var latest = systemNotificationRoomV585 && systemNotificationRoomV585.latest;
      return compactRoomDateV592(latest && (latest.createdAt || latest.created_at)) || '모두 읽음';
    }
    var messages = messagesFor(roomId);
    var last = messages[messages.length - 1];
    if (!last) return '모두 읽음';
    var raw = last.sortAt || last.createdAt || last.created_at || last.eventAt || last.event_at || '';
    var compact = compactRoomDateV592(raw);
    if (compact) return compact;
    var display = String(last.time || '').trim();
    if (display && display !== '안내' && display !== '읽음' && display !== '전송됨') return display;
    return '모두 읽음';
  }

  /* R10NO: 통합목록 정렬용 읽기전용 원본 활동시각.
   * 기존 방 렌더링/클릭/Push/읽음 로직은 변경하지 않는다.
   */
  function roomListSortAtR10NOV1(roomId){
    if (roomId === 'system') {
      var systemLatest = systemNotificationRoomV585 && systemNotificationRoomV585.latest;
      return String(
        systemLatest &&
        (
          systemLatest.sortAt ||
          systemLatest.createdAt ||
          systemLatest.created_at ||
          systemLatest.eventAt ||
          systemLatest.event_at ||
          ''
        ) || ''
      );
    }
    var rows = messagesFor(roomId);
    var latestRow = rows[rows.length - 1];
    if (!latestRow) return '';
    return String(
      latestRow.sortAt ||
      latestRow.createdAt ||
      latestRow.created_at ||
      latestRow.eventAt ||
      latestRow.event_at ||
      ''
    );
  }

  function renderRoomList(){
    var list = $('sitepassChatRoomList');
    if (!list) return;
    var pushApi = roomPushApiV595();
    if (pushApi && typeof pushApi.refresh === 'function') pushApi.refresh(false);

    var systemUnread = systemNotificationUnreadV585();
    var systemMeta = systemUnread > 0 ? '안 읽음 ' + systemUnread + '개' : roomListTimeV592('system');
    var systemPreview = systemNotificationLatestTextV585();
    var systemOn = roomNoticeOn('system');
    var systemHtml = '<button type="button" class="sitepass-chat-room-item sp592-room-grid sp595-room-grid" data-room="sitepass_system_notifications" data-sp595-open-room="system" data-sp-r10no-sort-at="' + escapeAttr(roomListSortAtR10NOV1('system')) + '" onclick="return sitepassOpenChatRoom460(this.getAttribute(&quot;data-sp595-open-room&quot;))">'
      + '<span class="sitepass-chat-room-ident sp592-room-ident"><span class="sitepass-chat-room-icon">🔔</span><b title="SitePass 알림">SitePass 알림</b></span>'
      + '<small class="sitepass-chat-room-preview sp592-room-preview" title="' + escapeAttr(systemPreview) + '">' + escapeHtml(systemPreview) + '</small>'
      + '<span class="sitepass-chat-room-meta sp595-room-meta">' + roomPushToggleHtmlV595('system', systemOn, 'sitepass-chat-pill sp595-room-push-toggle') + '<i class="sitepass-chat-time' + (systemUnread > 0 ? ' sp592-room-unread' : '') + '">' + escapeHtml(systemMeta) + '</i></span>'
      + '</button>';
    var legacyHtml = ['share','expiry','admin'].map(function(roomId){
      var room = ROOMS[roomId];
      var on = roomNoticeOn(roomId);
      var unread = unreadCount(roomId);
      var preview = latestText(roomId);
      var metaText = unread > 0 ? '안 읽음 ' + unread + '개' : roomListTimeV592(roomId);
      return '<button type="button" class="sitepass-chat-room-item sp592-room-grid sp595-room-grid" data-sp595-open-room="' + escapeAttr(roomId) + '" data-sp-r10no-sort-at="' + escapeAttr(roomListSortAtR10NOV1(roomId)) + '" onclick="return sitepassOpenChatRoom460(this.getAttribute(&quot;data-sp595-open-room&quot;))">'
        + '<span class="sitepass-chat-room-ident sp592-room-ident"><span class="sitepass-chat-room-icon">' + room.icon + '</span><b title="' + escapeAttr(room.title) + '">' + escapeHtml(room.title) + '</b></span>'
        + '<small class="sitepass-chat-room-preview sp592-room-preview" title="' + escapeAttr(preview) + '">' + escapeHtml(preview) + '</small>'
        + '<span class="sitepass-chat-room-meta sp595-room-meta">' + roomPushToggleHtmlV595(roomId, on, 'sitepass-chat-pill sp595-room-push-toggle') + '<i class="sitepass-chat-time' + (unread > 0 ? ' sp592-room-unread' : '') + '">' + escapeHtml(metaText) + '</i></span>'
        + '</button>';
    }).join('');
    list.innerHTML = systemHtml + legacyHtml;
    updateBottomUnreadBadge();
  }

  function selectedCount(){
    return Object.keys(selectedDeleteGroups).filter(function(key){ return !!selectedDeleteGroups[key]; }).length;
  }

  function updateDeleteBar(){
    var bar = $('sitepassChatDeleteBar');
    var count = $('sitepassChatDeleteCount');
    var confirmButton = $('sitepassChatDeleteConfirm');
    var headerButton = $('sitepassChatDeleteSelect');
    if (bar) bar.classList.toggle('sitepass-chat-hidden', !deleteMode);
    if (count) count.textContent = selectedCount() + '개 선택';
    if (confirmButton) confirmButton.disabled = selectedCount() === 0;
    if (headerButton) headerButton.classList.toggle('sitepass-chat-hidden', deleteMode || currentRoomId === 'share' || !currentRoomId);
  }

  function resetDeleteMode(){
    deleteMode = false;
    selectedDeleteGroups = Object.create(null);
    updateDeleteBar();
  }

  function renderMessages(roomId){
    if (roomId === SYSTEM_NOTIFICATION_ROOM_ID_V585) {
      renderSystemNotificationMessagesV585(systemNotificationItemsLoadedV585 ? '' : 'loading');
      return;
    }
    var box = $('sitepassChatMessages');
    if (!box) return;
    var scrollMemory = captureFixedRoomScrollV40();
    var messages = messagesFor(roomId);
    box.classList.toggle('selecting', deleteMode);
    box.innerHTML = messages.map(function(msg){
      var kind = escapeHtml(msg.kind || 'system');
      var groupId = String(msg.deleteGroupId || msg.id || '');
      var checkboxHtml = (deleteMode && msg.deletable)
        ? '<label class="sitepass-chat-select-check" title="선택"><input type="checkbox" data-delete-group="' + escapeAttr(groupId) + '" onchange="return sitepassToggleChatMessageSelect465(\'' + escapeAttr(groupId) + '\', this.checked)"' + (selectedDeleteGroups[groupId] ? ' checked' : '') + '><span aria-hidden="true">✓</span></label>'
        : '';
      var receiptHtml = msg.receipt
        ? '<span class="sitepass-chat-read-receipt ' + escapeHtml(msg.receiptClass || '') + '">' + escapeHtml(msg.receipt) + '</span>'
        : '';
      return '<div class="sitepass-chat-message-row ' + kind + '" data-message-id="' + escapeAttr(msg.id || '') + '" data-delete-group="' + escapeAttr(groupId) + '">'
        + checkboxHtml
        + '<div class="sitepass-chat-bubble ' + kind + '">'
        + '<span class="meta">' + escapeHtml(msg.from || 'SitePass') + ' · ' + escapeHtml(msg.time || '') + '</span>'
        + '<div class="sitepass-chat-bubble-text">' + escapeHtml(msg.text || '').replace(/\n/g, '<br>') + '</div>'
        + receiptHtml
        + '</div></div>';
    }).join('');
    updateDeleteBar();
    if (!deleteMode) afterFixedRoomRenderV40(roomId, scrollMemory);
  }

  function ensureExpiryTestTools479(){
    var panel = $('sitepassChatRoomPanel');
    var messages = $('sitepassChatMessages');
    if (!panel || !messages) return null;
    var tools = $('sitepassExpiryTestTools479');
    if (!tools) {
      tools = document.createElement('div');
      tools.id = 'sitepassExpiryTestTools479';
      tools.className = 'sitepass-expiry-test-tools479 sitepass-chat-hidden';
      tools.innerHTML = '<b>테스트용 만료알림</b><span>날짜를 기다리지 않고 D-30·D-15·D-7·D-DAY와 읽음 처리를 확인합니다.</span>'
        + '<div><button type="button" onclick="return sitepassCreateExpiryTestAlerts479()">테스트 알림 4개 만들기</button>'
        + '<button type="button" class="secondary" onclick="return sitepassClearExpiryTestAlerts479()">테스트 알림 지우기</button></div>';
      panel.insertBefore(tools, messages);
    }
    tools.classList.toggle('sitepass-chat-hidden', !(expiryTestMode479() && currentRoomId === 'expiry'));
    return tools;
  }

  function showRoomActions(roomId){
    var deleteSelect = $('sitepassChatDeleteSelect');
    if (deleteSelect) deleteSelect.classList.toggle('sitepass-chat-hidden', roomId === 'share' || !roomId);
    ensureExpiryTestTools479();
    updateDeleteBar();
  }

  function refreshComposerVisibility(){
    var composer = $('sitepassChatComposer');
    if (composer) composer.classList.toggle('sitepass-chat-hidden', currentRoomId !== 'admin' || deleteMode);
  }

  window.sitepassOpenChatRoom460 = function(roomId){
    if (!ROOMS[roomId]) roomId = 'admin';
    var openSequence = ++chatOpenSequenceV522;
    currentRoomId = roomId;
    beginFixedRoomEntryV40(roomId, openSequence);
    rememberChatRoomV532(roomId);
    resetDeleteMode();
    forceContactScreenVisibleV522();
    applyChatPanelStateV522(roomId);
    if (roomId === 'expiry') markExpiryRoomRead();
    if (roomId === 'admin') {
      refreshAdminInquiryRoomV664(true).then(function(){
        if (currentRoomId !== 'admin' || openSequence !== chatOpenSequenceV522) return;
        settleFixedRoomEntryV40('admin', openSequence);
        markAdminInquiryReadV664();
      });
    }
    if (roomId === SYSTEM_NOTIFICATION_ROOM_ID_V585) {
      renderSystemNotificationMessagesV585('loading');
      refreshSystemNotificationItemsV585(true, openSequence);
    }
    if (roomId === 'share') {
      refreshShareTrackingServerV521(true).then(function(refreshResult){
        if (currentRoomId !== 'share' || openSequence !== chatOpenSequenceV522) return;
        if (!refreshResult || !refreshResult.loading) settleFixedRoomEntryV40('share', openSequence);
        forceContactScreenVisibleV522();
        applyChatPanelStateV522('share');
        renderMessages('share');
        renderRoomList();
        setTimeout(function(){
          if (currentRoomId === 'share' && isChatScreenVisible482('share')) {
            markShareTrackingReadV521();
          }
        }, 350);
      });
    }
    var room = ROOMS[roomId];

    var icon = $('sitepassChatRoomIcon');
    var title = $('sitepassChatRoomTitle');
    var desc = $('sitepassChatRoomDesc');
    var toggle = $('sitepassChatNoticeToggle');

    if (icon) icon.textContent = room.icon;
    if (title) title.textContent = room.title;
    if (desc) desc.textContent = room.desc;
    if (toggle) {
      var roomOn = roomNoticeOn(roomId);
      var roomBusy = roomPushBusyV595(roomId);
      toggle.classList.remove('sitepass-chat-hidden');
      toggle.setAttribute('data-room', roomId);
      toggle.setAttribute('aria-pressed', roomOn ? 'true' : 'false');
      toggle.disabled = roomBusy;
      toggle.textContent = roomBusy ? '저장 중' : (roomOn ? '알림 ON' : '알림 OFF');
      toggle.classList.toggle('off', !roomOn);
    }
    showRoomActions(roomId);
    refreshComposerVisibility();
    refreshFixedRoomViewportV40();
    renderMessages(roomId);
    renderRoomList();
    updateBottomUnreadBadge();
    stabilizeChatOpenV522(roomId, openSequence);
    return false;
  };

  window.sitepassBackToChatList460 = function(){
    ++chatOpenSequenceV522;
    currentRoomId = '';
    clearFixedRoomMobileStateV40();
    rememberChatRoomV532('');
    resetDeleteMode();
    var listPanel = $('sitepassChatListPanel');
    var roomPanel = $('sitepassChatRoomPanel');
    if (roomPanel) roomPanel.classList.add('sitepass-chat-hidden');
    if (listPanel) listPanel.classList.remove('sitepass-chat-hidden');
    renderRoomList();
    return false;
  };

  window.sitepassOpenChatInbox460 = function(options){
    options = options || {};
    var openSequence = ++chatOpenSequenceV522;
    currentRoomId = '';
    clearFixedRoomMobileStateV40();
    if (!options.preserveRememberedRoom) rememberChatRoomV532('');
    resetDeleteMode();
    forceContactScreenVisibleV522();
    applyChatPanelStateV522('');
    renderRoomList();
    updateBottomUnreadBadge();
    refreshSystemNotificationRoomV585(true);
    // 서버 알림 조회는 화면을 연 뒤 백그라운드에서 진행합니다.
    Promise.resolve(refreshShareTrackingServerV521(false)).then(function(){
      if (openSequence !== chatOpenSequenceV522 || currentRoomId) return;
      forceContactScreenVisibleV522();
      applyChatPanelStateV522('');
      renderRoomList();
    });
    stabilizeChatOpenV522('', openSequence);
    return false;
  };

  /* v23.7.553-recovery-test - 새로고침에서는 목록으로 강제 초기화하지 않고
     사용자가 보고 있던 만료알림방·공유기록방·관리자채팅방을 정확히 복원합니다. */
  window.sitepassRestoreChatStateV532 = function(){
    var roomId = rememberedChatRoomV532();
    if (roomId) return window.sitepassOpenChatRoom460(roomId);
    return window.sitepassOpenChatInbox460({ preserveRememberedRoom:true });
  };

  window.sitepassOpenExpiryFromHome479 = function(){
    try {
      if (typeof window.sitepassBottomNavGo === 'function') window.sitepassBottomNavGo('contactScreen');
      else if (typeof window.showScreen === 'function') window.showScreen('contactScreen');
    } catch(e) {}
    setTimeout(function(){ window.sitepassOpenChatRoom460('expiry'); }, 80);
    return false;
  };

  window.sitepassRefreshShareHistoryV520 = function(){
    try { refreshShareTrackingServerV521(true); } catch(e) {}
    try { renderRoomList(); } catch(e) {}
    try { if (currentRoomId === 'share') renderMessages('share'); } catch(e) {}
    return true;
  };
  window.sitePassAddShareTrackingRowV521 = function(){
    // Legacy tracking 알림은 더 이상 공유 기록방 데이터로 직접 합치지 않는다.
    try { refreshShareTrackingServerV521(true); } catch(e) {}
    return true;
  };
  window.addEventListener('sitepass-share-history-updated-v520', function(){
    try { window.sitepassRefreshShareHistoryV520(); } catch(e) {}
  });
  window.addEventListener('sitepass-share-tracking-updated-v521', function(event){
    try { window.sitePassAddShareTrackingRowV521(event && event.detail); } catch(e) {}
  });

  window.addEventListener('sitepass-recipient-share-events-updated-v577', function(){
    try { refreshShareTrackingServerV521(true); } catch(e) {}
  });

  window.sitepassOpenShareFromHome479 = function(){
    try {
      if (typeof window.sitepassBottomNavGo === 'function') window.sitepassBottomNavGo('contactScreen');
      else if (typeof window.showScreen === 'function') window.showScreen('contactScreen');
    } catch(e) {}
    setTimeout(function(){ window.sitepassOpenChatRoom460('share'); }, 80);
    return false;
  };

  window.sitepassCreateExpiryTestAlerts479 = function(){
    if (!expiryTestMode479()) return false;
    var batch = Date.now();
    var now = new Date();
    var stages = [30,15,7,0];
    var rows = stages.map(function(stage, index){
      var label = milestoneLabel467(stage);
      var eventKey = 'v482-test|' + batch + '|' + stage;
      var due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + stage);
      return {
        id: 'expiry-test-' + hashText(eventKey),
        readId: 'expiry-test-read-' + hashText(eventKey),
        eventKey: eventKey,
        docBaseKey: 'v482-test-doc-' + stage,
        type: 'test',
        milestone: stage,
        expireDate: localDateKey467(due),
        createdAt: new Date(Date.now() + index).toISOString(),
        text: '[테스트] 굴착기 00테스트' + String(index + 1) + '\n안전교육 이수증 · ' + label + ' 알림\n만료일: ' + displayDate467(due)
      };
    });
    saveExpiryTestLogs479(rows);
    // 같은 테스트 ID가 과거에 읽음 처리된 적이 있어도 새로 만든 4개는 반드시 안 읽음으로 시작합니다.
    var newReadIds = rows.map(function(row){ return row.readId; });
    saveReadExpiryIds(readExpiryIds().filter(function(id){ return newReadIds.indexOf(id) < 0; }));
    resetDeleteMode();
    renderRoomList();
    updateHomeExpiryUnread479(true);
    updateBottomUnreadBadge();

    // 테스트 버튼은 만료 알림방 안에서 누르므로, 홈으로 이동하기 전에 방을 닫아야
    // 백그라운드 2.5초 읽음 타이머가 새 알림 4개를 즉시 읽음 처리하지 않습니다.
    try { if (typeof window.sitepassBackToChatList460 === 'function') window.sitepassBackToChatList460(); } catch(e) {}
    try {
      if (typeof window.sitepassBottomNavGo === 'function') window.sitepassBottomNavGo('homeScreen');
      else if (typeof window.showScreen === 'function') window.showScreen('homeScreen');
    } catch(e) {}
    [0, 60, 180, 500, 1200].forEach(function(delay){
      setTimeout(function(){
        updateHomeExpiryUnread479(true);
        updateBottomUnreadBadge();
      }, delay);
    });
    try { alert('테스트 알림 4개를 만들었습니다. 홈에 숫자 4가 표시됩니다. 숫자를 누르면 만료 알림방으로 이동하고, 실제로 방을 열었을 때만 읽음 처리되어 숫자가 사라집니다.'); } catch(e) {}
    return false;
  };

  window.sitepassClearExpiryTestAlerts479 = function(){
    saveExpiryTestLogs479([]);
    resetDeleteMode();
    if (currentRoomId === 'expiry') renderMessages('expiry');
    renderRoomList();
    updateHomeExpiryUnread479(true);
    try { alert('테스트 알림을 지웠습니다.'); } catch(e) {}
    return false;
  };

  window.sitepassToggleChatNotice460 = function(event){
    var toggle = $('sitepassChatNoticeToggle');
    var roomId = (toggle && toggle.getAttribute('data-room')) || currentRoomId || 'admin';
    var api = roomPushApiV595();
    if (api && typeof api.handleToggle === 'function') {
      api.handleToggle(event || window.event, roomId, null);
      return false;
    }
    var next = !roomNoticeOn(roomId);
    setRoomNotice(roomId, next);
    if (toggle) {
      toggle.textContent = next ? '알림 ON' : '알림 OFF';
      toggle.classList.toggle('off', !next);
    }
    renderRoomList();
    return false;
  };

  window.sitepassStartDeleteMode465 = function(){
    if (!currentRoomId || currentRoomId === 'share') return false;
    var deletable = currentRoomId === SYSTEM_NOTIFICATION_ROOM_ID_V585
      ? visibleSystemNotificationItemsV597().length > 0
      : messagesFor(currentRoomId).some(function(msg){ return !!msg.deletable; });
    if (!deletable) {
      var emptyText = currentRoomId === 'expiry'
        ? '삭제할 만료 알림이 없습니다.'
        : currentRoomId === SYSTEM_NOTIFICATION_ROOM_ID_V585
          ? '삭제할 SitePass 알림이 없습니다.'
          : '삭제할 채팅이 없습니다.';
      alert(emptyText);
      return false;
    }
    deleteMode = true;
    selectedDeleteGroups = Object.create(null);
    refreshComposerVisibility();
    renderMessages(currentRoomId);
    return false;
  };

  window.sitepassToggleChatMessageSelect465 = function(groupId, checked){
    var id = String(groupId || '');
    if (!id) return false;
    if (checked) selectedDeleteGroups[id] = true;
    else delete selectedDeleteGroups[id];
    var boxes = document.querySelectorAll('#sitepassChatMessages input[data-delete-group="' + (window.CSS && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"')) + '"]');
    Array.prototype.forEach.call(boxes, function(box){ box.checked = !!checked; });
    updateDeleteBar();
    return false;
  };

  window.sitepassCancelDeleteMode465 = function(){
    resetDeleteMode();
    refreshComposerVisibility();
    renderMessages(currentRoomId);
    return false;
  };

  window.sitepassConfirmSelectedDelete465 = function(){
    var groups = Object.keys(selectedDeleteGroups).filter(function(key){ return !!selectedDeleteGroups[key]; });
    if (!groups.length) {
      alert('삭제할 항목을 선택해주세요.');
      return false;
    }
    var message = currentRoomId === 'admin'
      ? '선택한 대화를 내 화면에서 삭제할까요? 질문과 답변이 연결된 경우 함께 숨겨지며 서버 원본은 유지됩니다.'
      : currentRoomId === SYSTEM_NOTIFICATION_ROOM_ID_V585
        ? '선택한 SitePass 알림을 내 화면에서 삭제할까요? 서버 알림 원본은 유지됩니다.'
        : '선택한 만료 알림을 내 화면에서 삭제할까요? 원본 알림 기록은 유지됩니다.';
    if (!confirm(message)) return false;
    if (currentRoomId === 'expiry') {
      saveDeletedExpiryIds(deletedExpiryIds().concat(groups));
      queueAlertUiStateSyncV22(80);
    } else if (currentRoomId === 'admin') {
      saveDeletedAdminGroups(deletedAdminGroups().concat(groups));
    } else if (currentRoomId === SYSTEM_NOTIFICATION_ROOM_ID_V585) {
      saveDeletedSystemNotificationIdsV597(deletedSystemNotificationIdsV597().concat(groups));
    }
    resetDeleteMode();
    refreshComposerVisibility();
    renderMessages(currentRoomId);
    renderRoomList();
    return false;
  };

  // 이전 버전 개별/전체삭제 호출이 남아 있어도 선택삭제 모드로 연결합니다.
  window.sitepassDeleteChatMessage460 = function(){ return window.sitepassStartDeleteMode465(); };
  window.sitepassDeleteAllExpiry460 = function(){ return window.sitepassStartDeleteMode465(); };

  window.sitepassSubmitAdminChat460 = async function(){
    var room = supportRoomV85();

    var textValue =
      $('sitepassChatText')
        ? $('sitepassChatText').value.trim()
        : '';

    if (!room || typeof room.send !== 'function') {
      alert('서버 연결을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
      return false;
    }

    if (!textValue) {
      alert('메시지 내용을 입력해주세요.');
      return false;
    }

    try {
      await room.send(textValue);

      if ($('sitepassChatText')) {
        $('sitepassChatText').value = '';
        resizeAdminTextareaV40($('sitepassChatText'));
      }

      renderMessages('admin');
      renderRoomList();
      queueAdminLatestV40();
    } catch(e) {
      alert('관리자 문의를 보내지 못했습니다. 잠시 후 다시 시도해주세요.');
    }

    return false;
  };

  function wrapBottomNav(){
    if (window.sitepassChatRoutingManagedV532) return;
    if (navWrapped || typeof window.sitepassBottomNavGo !== 'function') return;
    navWrapped = true;
    var previous = window.sitepassBottomNavGo;
    window.sitepassBottomNavGo = function(target){
      if (target === 'usageGuideScreen') target = 'contactScreen';

      if (target === 'contactScreen') {
        window.sitepassOpenChatInbox460();
      } else {
        /*
         * 58단계 공유기록 미읽음 보정:
         * 다른 하단 탭으로 이동한 뒤에도 currentRoomId='share'가 남아 있으면,
         * Realtime 갱신 시 보이지 않는 공유기록 방을 열린 것으로 오판하여
         * 새 미읽음 이벤트를 350ms 뒤 자동 읽음 처리한다.
         *
         * 채팅 화면을 벗어나는 순간 열린 고정방 상태를 명시적으로 해제한다.
         */
        currentRoomId = null;
        chatOpenSequenceV522 += 1;
        clearFixedRoomMobileStateV40();
        resetDeleteMode();
      }

      return previous.apply(this, arguments.length ? [target] : arguments);
    };
  }

  function init(){
    bindFixedRoomMobileUxV40();
    resizeAdminTextareaV40($('sitepassChatText'));
    loadShareTrackingCacheV521();
    syncAlertUiStateV22(false);
    renderRoomList();
    refreshSystemNotificationRoomV585(false);
    refreshAdminInquiryRoomV664(false);
    wrapBottomNav();
    updateBottomUnreadBadge();
    updateHomeExpiryUnread479(true);
    refreshShareTrackingServerV521(false);
  }

  /*
   * STEP84 V39 chat responsibility bridge.
   *
   * 목적:
   * - 기존 검증된 알림/고정방 구현을 이동하거나 복제하지 않는다.
   * - 새 features/chat 모듈이 내부 closure 함수 전체를 다시 열지 않고
   *   필요한 최소 공개 경계만 호출하도록 한다.
   * - 회원 간 메시지 저장/첨부/Realtime 구현은 이 bridge에 포함하지 않는다.
   */
  window.SitePassChatFeatureBridgeV39 = Object.freeze({
    notifications: Object.freeze({
      refresh: function(force){
        return Promise.resolve(refreshSystemNotificationRoomV585(!!force));
      },
      open: function(){
        return window.sitepassOpenChatRoom460('system');
      },
      unread: function(){
        return Number(systemNotificationUnreadV585() || 0);
      },
      getState: function(){
        return {
          currentRoomId: currentRoomId || '',
          open: currentRoomId === SYSTEM_NOTIFICATION_ROOM_ID_V585,
          loaded: !!systemNotificationRoomLoadedV585,
          unread: Number(systemNotificationUnreadV585() || 0)
        };
      }
    }),

    pinnedRooms: Object.freeze({
      roomIds: Object.freeze(['system', 'share', 'expiry', 'admin']),
      render: function(){
        renderRoomList();
        return true;
      },
      openRoom: function(roomId){
        return window.sitepassOpenChatRoom460(String(roomId || ''));
      },
      openInbox: function(options){
        return window.sitepassOpenChatInbox460(options || {});
      },
      backToList: function(){
        return window.sitepassBackToChatList460();
      },
      getState: function(){
        return {
          currentRoomId: currentRoomId || '',
          roomIds: ['system', 'share', 'expiry', 'admin']
        };
      }
    })
  });

  window.SitePassFixedRoomMobileUxV40 = Object.freeze({
    version: 'step84-v40-fixed-room-mobile-ux',
    getState: function(){
      var target = fixedRoomScrollTargetV40();
      var panel = $('sitepassChatRoomPanel');
      var textarea = $('sitepassChatText');
      return {
        roomId: currentRoomId || '',
        openSequence: chatOpenSequenceV522,
        visible: !!(currentRoomId && isChatScreenVisible482(currentRoomId)),
        mobile: isFixedRoomMobileV40(),
        scrollTarget: target && target.type === 'element' ? 'sitepassChatMessages' : 'document',
        scrollTop: target && target.node ? Number(target.node.scrollTop || 0) : 0,
        scrollHeight: target && target.node ? Number(target.node.scrollHeight || 0) : 0,
        clientHeight: target && target.node ? Number(target.node.clientHeight || 0) : 0,
        entry: fixedRoomEntryStateV40 ? {
          roomId: fixedRoomEntryStateV40.roomId,
          mode: fixedRoomEntryStateV40.mode,
          unreadCount: fixedRoomEntryStateV40.unreadCount,
          anchorId: fixedRoomEntryStateV40.anchorId,
          completed: fixedRoomEntryStateV40.completed
        } : null,
        panelHeight: panel ? panel.getBoundingClientRect().height : 0,
        visualViewportHeight: window.visualViewport ? Number(window.visualViewport.height || 0) : Number(window.innerHeight || 0),
        textareaHeight: textarea ? textarea.getBoundingClientRect().height : 0,
        textareaScrollHeight: textarea ? Number(textarea.scrollHeight || 0) : 0
      };
    }
  });

  window.sitepassOpenChatRoom445 = window.sitepassOpenChatRoom460;

  window.addEventListener('sitepass-realtime-invalidation-v664', function(event){
    var topic = String(event && event.detail && event.detail.topic || '');
    if (topic === 'system_notification') {
      refreshSystemNotificationRoomV585(true);
      if (currentRoomId === SYSTEM_NOTIFICATION_ROOM_ID_V585) {
        refreshSystemNotificationItemsV585(true, chatOpenSequenceV522);
      }
    } else if (topic === 'share_history') {
      refreshShareTrackingServerV521(true);
    } else if (topic === 'expiry_notification') {
      refreshShareTrackingServerV521(true);
      renderRoomList();
    }
  });
  window.addEventListener('sitepass-support-room-updated-v85', function(){
    if (currentRoomId === 'admin') {
      settleFixedRoomEntryV40(
        'admin',
        chatOpenSequenceV522
      );
    }

    renderRoomList();

    if (currentRoomId === 'admin') {
      renderMessages('admin');
    }
  });

  window.sitepassBackToChatList445 = window.sitepassBackToChatList460;
  window.addEventListener('sitepass-room-push-updated-v595', function(){
    renderRoomList();
    if (currentRoomId) {
      var toggle = $('sitepassChatNoticeToggle');
      if (toggle) {
        var on = roomNoticeOn(currentRoomId);
        var busy = roomPushBusyV595(currentRoomId);
        toggle.disabled = busy;
        toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
        toggle.textContent = busy ? '저장 중' : (on ? '알림 ON' : '알림 OFF');
        toggle.classList.toggle('off', !on);
      }
    }
  });

  window.sitepassToggleChatNotice445 = window.sitepassToggleChatNotice460;
  window.sitepassSubmitAdminChat445 = window.sitepassSubmitAdminChat460;

  document.addEventListener('DOMContentLoaded', function(){
    init();
    setTimeout(init, 120);
    setTimeout(init, 600);
  });
  window.addEventListener('pageshow', function(){ setTimeout(init, 100); });
  window.addEventListener('focus', function(){
    queueAlertUiStateSyncV22(120);
    refreshShareTrackingServerV521(false);
    refreshSystemNotificationRoomV585(true);
  });
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) {
      queueAlertUiStateSyncV22(120);
      refreshShareTrackingServerV521(false);
      refreshSystemNotificationRoomV585(true);
    }
  });
  setInterval(function(){
    var screen = $('contactScreen');
    var panelOpen = !!screen && !screen.classList.contains('hidden')
      && !$('sitepassChatRoomPanel')?.classList.contains('sitepass-chat-hidden');
    if (!deleteMode && panelOpen && currentRoomId === 'admin') {
      markAdminRepliesReadByMember();
      renderMessages('admin');
    }
    // 만료알림 자동 읽음·렌더는 실제 만료알림 방이 보일 때만 실행합니다.
    // 공통 가시성만 확인하면 공유기록 방에서도 expiry를 강제로 렌더링하여
    // share ↔ expiry 내용이 2.5초마다 번갈아 표시되는 교차 렌더가 발생합니다.
    if (!deleteMode
        && currentRoomId === 'expiry'
        && isChatScreenVisible482('expiry')) {
      markExpiryRoomRead();
      renderMessages('expiry');
    }
    if (!document.hidden) {
      refreshShareTrackingServerV521(false);
    }
    renderRoomList();
    updateBottomUnreadBadge();
  }, 2500);
})();
