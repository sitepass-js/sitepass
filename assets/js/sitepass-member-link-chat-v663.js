/* SitePass 23.7.758 R14 - Kakao-style member chat scroll state
 * Message refreshes preserve the user's history-reading anchor without a timer.
 * Only initial entry, an explicit latest action, or a successful self-send follows latest.
 */
/* SitePass 23.7.663-57-latest-room-ordering
 * Step 57: member chat rooms use visible latest-message ordering only.
 * Unread counts remain badges and never influence room order.
 */
/*
 * SitePass v23.7.614-55-broadcast-button-no-popin-prehydrated
 * 4구간-37단계-7/7
 *
 * 회원 연동요청 홈 알림 + 회원간 채팅 + 요청 전체승인/거절
 *
 * 기존 만료알림/공유기록/관리자채팅 모듈은 교체하지 않는다.
 * 새 회원채팅 RPC 5개를 별도 UI 레이어에서만 사용한다.
 */
(function () {
  'use strict';

  var VERSION = 'v660';
  var CHAT_ATTACHMENT_BUCKET = 'sitepass-chat-attachments';
  var CHAT_ATTACHMENT_MAX_FILES = 10;
  var CHAT_ATTACHMENT_MAX_BYTES = 20971520;
  var DISMISS_KEY =
    'sitepass_member_link_chat_modal_dismissed_v566';
  var memberViewportFrameV663 = 0;
  var memberViewportRequestV663 = 0;
  var memberViewportBoundV663 = false;
  var memberViewportKeepLatestV663 = false;
  var memberResumeTimerV744 = 0;
  var memberResumePromiseV744 = null;
  var memberResumeQueuedV744 = false;
  var memberRoomDirtyV744 = false;
  var MEMBER_SCROLL_FOLLOW_LATEST_V758 = 'FOLLOW_LATEST';
  var MEMBER_SCROLL_READING_HISTORY_V758 = 'READING_HISTORY';
  var MEMBER_SCROLL_BOTTOM_TOLERANCE_V758 = 24;
  var memberRoomLoadSequenceV758 = 0;
  var memberScrollStateV758 = {
    roomId: '',
    mode: MEMBER_SCROLL_FOLLOW_LATEST_V758,
    forceLatestOnce: false,
    baselineReady: false,
    knownMessageIds: Object.create(null),
    unseenIncomingIds: Object.create(null),
    unseenIncomingCount: 0,
    interactionRevision: 0,
    applyingProgrammaticScroll: false,
    boundBox: null
  };
  var state = {
    list: null,
    listLoading: false,
    listError: '',
    refreshPromise: null,
    refreshPendingV40: false,
    currentRoomId: '',
    currentRoom: null,
    detail: null,
    detailLoading: false,
    detailError: '',
    pendingFiles: [],
    attachmentMenuOpen: false,
    attachmentDownloadBusy: {},
    contactSending: false,
    referencePickerOpen: false,
    referenceMode: '',
    referenceEquipmentRows: [],
    referenceSelectedEquipmentId: '',
    referenceDocuments: [],
    referenceLoading: false,
    referenceSending: false,
    referenceError: '',
    referenceContactMessageId: '',
    referenceContactName: '',
    referenceContactPhone: '',
    bulkSendOpen: false,
    bulkTargets: null,
    bulkTargetsLoading: false,
    bulkTargetsError: '',
    bulkTargetsLastAt: 0,
    bulkTargetsPromise: null,
    bulkTargetsSource: '',
    bulkTargetsResolved: false,
    bulkSearch: '',
    bulkPage: 1,
    bulkPageSize: 10,
    bulkTitle: '',
    bulkMessage: '',
    bulkSelectedOwnerIds: {},
    bulkBatchIdempotencyKey: '',
    bulkRoomIdempotencyKeys: {},
    bulkSending: false,
    bulkResult: null,
    bulkError: '',
    requestGroupExpanded: {},
    requestSummaryExpanded: false,
    sendBusy: false,
    decisionBusy: false,
    deleteMode: false,
    selectedDeleteMessageIds: {},
    deleteBusy: false,
    lastRefreshAt: 0,
    hooksInstalled: false,
    initialized: false
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function html(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function attr(value) {
    return html(value);
  }

  function hashTextV597(value) {
    var text = String(value || '');
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
  }

  function currentMemberDeleteKeyV597() {
    var keys = [
      'sitePass_v23_7_7_update_original_corrected_currentMember',
      'sitePass_v23_7_7_update_original_corrected_pwa_auto_member_v23_7_145',
      'sitePass_v23_7_7_update_original_corrected_browser_auto_member_v23_7_395'
    ];
    var stores = [window.sessionStorage, window.localStorage];
    for (var s = 0; s < stores.length; s += 1) {
      for (var k = 0; k < keys.length; k += 1) {
        try {
          var member = JSON.parse(stores[s].getItem(keys[k]) || 'null');
          if (!member || typeof member !== 'object') continue;
          var raw = member.supabaseLoginId || member.login_id || member.loginId || member.signupId || member.providerId || member.id || member.userId || member.phone || member.mobile || '';
          raw = String(raw || '').trim().toLowerCase();
          if (raw) return hashTextV597(raw);
        } catch (error) {}
      }
    }
    return 'member';
  }

  function memberHiddenKeyV597(roomId) {
    return 'sitepass_member_chat_hidden_v597:' + currentMemberDeleteKeyV597() + ':' + String(roomId || '');
  }

  function loadHiddenMessageIdsV597(roomId) {
    try {
      var rows = JSON.parse(localStorage.getItem(memberHiddenKeyV597(roomId)) || '[]');
      return Array.isArray(rows) ? rows.map(String).filter(Boolean) : [];
    } catch (error) { return []; }
  }

  function saveHiddenMessageIdsV597(roomId, rows) {
    var unique = Array.from(new Set((rows || []).map(String).filter(Boolean))).slice(-2000);
    try { localStorage.setItem(memberHiddenKeyV597(roomId), JSON.stringify(unique)); } catch (error) {}
    return unique;
  }

  function messageIdV597(message) {
    var direct = String(message && (message.messageId || message.message_id || message.id) || '').trim();
    if (direct) return direct;
    return 'local-' + hashTextV597([
      message && (message.createdAt || message.created_at),
      message && (message.senderMemberId || message.sender_member_id || message.senderDisplayName),
      message && (message.messageType || message.message_type),
      message && (message.messageText || message.message_text)
    ].join('|'));
  }

  function resetMemberScrollStateV758(roomId, forceLatest) {
    memberScrollStateV758.roomId = String(roomId || '');
    memberScrollStateV758.mode = MEMBER_SCROLL_FOLLOW_LATEST_V758;
    memberScrollStateV758.forceLatestOnce = forceLatest === true;
    memberScrollStateV758.baselineReady = false;
    memberScrollStateV758.knownMessageIds = Object.create(null);
    memberScrollStateV758.unseenIncomingIds = Object.create(null);
    memberScrollStateV758.unseenIncomingCount = 0;
    memberScrollStateV758.interactionRevision += 1;
    memberScrollStateV758.applyingProgrammaticScroll = false;
    renderMemberNewMessageIndicatorV758();
  }

  function ensureMemberScrollRoomV758() {
    var roomId = String(state.currentRoomId || '');
    if (memberScrollStateV758.roomId !== roomId) {
      resetMemberScrollStateV758(roomId, !!roomId);
    }
    return roomId;
  }

  function memberIsNearLatestV758(box) {
    if (!box) return true;
    var remaining = Math.max(
      0,
      Number(box.scrollHeight || 0) -
      Number(box.clientHeight || 0) -
      Number(box.scrollTop || 0)
    );
    return remaining <= MEMBER_SCROLL_BOTTOM_TOLERANCE_V758;
  }

  function memberShouldFollowLatestV758() {
    ensureMemberScrollRoomV758();
    return memberScrollStateV758.mode === MEMBER_SCROLL_FOLLOW_LATEST_V758;
  }

  function clearMemberUnseenIncomingV758() {
    memberScrollStateV758.unseenIncomingIds = Object.create(null);
    memberScrollStateV758.unseenIncomingCount = 0;
    renderMemberNewMessageIndicatorV758();
  }

  function requestMemberLatestV758(roomId) {
    roomId = String(roomId || '');
    if (!roomId || String(state.currentRoomId || '') !== roomId) return false;
    if (memberScrollStateV758.roomId !== roomId) {
      resetMemberScrollStateV758(roomId, true);
    }
    memberScrollStateV758.mode = MEMBER_SCROLL_FOLLOW_LATEST_V758;
    memberScrollStateV758.forceLatestOnce = true;
    clearMemberUnseenIncomingV758();
    return true;
  }

  function applyMemberProgrammaticScrollV758(box, apply) {
    if (!box || typeof apply !== 'function') return;
    memberScrollStateV758.applyingProgrammaticScroll = true;
    try { apply(); } catch (error) {}
    var release = function () {
      memberScrollStateV758.applyingProgrammaticScroll = false;
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(release);
    else setTimeout(release, 0);
  }

  function firstVisibleMemberMessageAnchorV758(box) {
    if (!box || typeof box.querySelectorAll !== 'function') return null;
    var boxRect;
    try { boxRect = box.getBoundingClientRect(); } catch (error) { return null; }
    var rows = box.querySelectorAll('[data-message-id]');
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var rect;
      try { rect = row.getBoundingClientRect(); } catch (error) { continue; }
      if (rect.bottom > boxRect.top + 1 && rect.top < boxRect.bottom - 1) {
        return {
          messageId: String(row.getAttribute('data-message-id') || ''),
          offsetTop: Number(rect.top || 0) - Number(boxRect.top || 0)
        };
      }
    }
    return null;
  }

  function captureMemberScrollV758(box) {
    ensureMemberScrollRoomV758();
    if (
      !memberScrollStateV758.forceLatestOnce &&
      memberIsNearLatestV758(box)
    ) {
      memberScrollStateV758.mode = MEMBER_SCROLL_FOLLOW_LATEST_V758;
      clearMemberUnseenIncomingV758();
    }
    return {
      roomId: String(state.currentRoomId || ''),
      mode: memberScrollStateV758.mode,
      forceLatest: memberScrollStateV758.forceLatestOnce === true,
      scrollTop: Number(box && box.scrollTop || 0),
      interactionRevision: memberScrollStateV758.interactionRevision,
      anchor: firstVisibleMemberMessageAnchorV758(box)
    };
  }

  function restoreMemberScrollV758(box, snapshot) {
    if (
      !box ||
      !snapshot ||
      snapshot.roomId !== String(state.currentRoomId || '') ||
      snapshot.roomId !== memberScrollStateV758.roomId ||
      snapshot.interactionRevision !== memberScrollStateV758.interactionRevision
    ) return;

    if (
      snapshot.forceLatest ||
      snapshot.mode === MEMBER_SCROLL_FOLLOW_LATEST_V758
    ) {
      memberScrollStateV758.forceLatestOnce = false;
      memberScrollStateV758.mode = MEMBER_SCROLL_FOLLOW_LATEST_V758;
      applyMemberProgrammaticScrollV758(box, function () {
        box.scrollTop = box.scrollHeight;
      });
      clearMemberUnseenIncomingV758();
      return;
    }

    var nextTop = snapshot.scrollTop;
    var anchor = snapshot.anchor;
    if (anchor && anchor.messageId) {
      var rows = box.querySelectorAll('[data-message-id]');
      var boxRect = box.getBoundingClientRect();
      for (var i = 0; i < rows.length; i += 1) {
        if (String(rows[i].getAttribute('data-message-id') || '') !== anchor.messageId) continue;
        var rowRect = rows[i].getBoundingClientRect();
        nextTop = Number(box.scrollTop || 0) +
          (Number(rowRect.top || 0) - Number(boxRect.top || 0)) -
          Number(anchor.offsetTop || 0);
        break;
      }
    }
    var limit = Math.max(0, Number(box.scrollHeight || 0) - Number(box.clientHeight || 0));
    nextTop = Math.max(0, Math.min(limit, Number(nextTop || 0)));
    memberScrollStateV758.mode = MEMBER_SCROLL_READING_HISTORY_V758;
    applyMemberProgrammaticScrollV758(box, function () {
      box.scrollTop = nextTop;
    });
  }

  function registerMemberRenderedMessagesV758(messages) {
    ensureMemberScrollRoomV758();
    messages = Array.isArray(messages) ? messages : [];
    var baselineReady = memberScrollStateV758.baselineReady;
    for (var i = 0; i < messages.length; i += 1) {
      var id = messageIdV597(messages[i]);
      if (!id) continue;
      if (
        baselineReady &&
        !memberScrollStateV758.knownMessageIds[id] &&
        messages[i].isMine !== true &&
        memberScrollStateV758.mode === MEMBER_SCROLL_READING_HISTORY_V758 &&
        !memberScrollStateV758.unseenIncomingIds[id]
      ) {
        memberScrollStateV758.unseenIncomingIds[id] = true;
        memberScrollStateV758.unseenIncomingCount += 1;
      }
      memberScrollStateV758.knownMessageIds[id] = true;
    }
    memberScrollStateV758.baselineReady = true;
    if (memberScrollStateV758.mode === MEMBER_SCROLL_FOLLOW_LATEST_V758) {
      memberScrollStateV758.unseenIncomingIds = Object.create(null);
      memberScrollStateV758.unseenIncomingCount = 0;
    }
    renderMemberNewMessageIndicatorV758();
  }

  function renderMemberNewMessageIndicatorV758() {
    var button = byId('sp758MemberNewMessageButton');
    if (!button) return;
    var count = Math.max(0, Number(memberScrollStateV758.unseenIncomingCount || 0));
    var visible = !!(
      count > 0 &&
      memberScrollStateV758.mode === MEMBER_SCROLL_READING_HISTORY_V758 &&
      memberScrollStateV758.roomId === String(state.currentRoomId || '') &&
      memberRoomVisibleV663()
    );
    button.classList.toggle('hidden', !visible);
    button.hidden = !visible;
    button.textContent = count > 1 ? '새 메시지 ' + count + '개 ↓' : '새 메시지 ↓';
    button.setAttribute('aria-label', count > 1 ? '새 메시지 ' + count + '개, 최신 메시지로 이동' : '새 메시지, 최신 메시지로 이동');
    var composer = byId('sp566MemberComposer');
    var composerVisible = !!(composer && !composer.classList.contains('hidden'));
    var composerHeight = composerVisible ? Math.max(0, Number(composer.getBoundingClientRect().height || 0)) : 0;
    button.style.bottom = Math.ceil(composerHeight + 12) + 'px';
  }

  function goToMemberLatestV758(event) {
    if (event) {
      try { event.preventDefault(); event.stopPropagation(); } catch (error) {}
    }
    var roomId = String(state.currentRoomId || '');
    if (!roomId) return false;
    requestMemberLatestV758(roomId);
    scrollMemberLatestV663();
    queueMemberViewportV663(true);
    return false;
  }

  function bindMemberMessageScrollV758() {
    var box = byId('sp566MemberMessages');
    if (!box || memberScrollStateV758.boundBox === box) return;
    memberScrollStateV758.boundBox = box;
    box.addEventListener('scroll', function () {
      if (
        memberScrollStateV758.applyingProgrammaticScroll ||
        memberScrollStateV758.roomId !== String(state.currentRoomId || '')
      ) return;
      memberScrollStateV758.interactionRevision += 1;
      if (memberIsNearLatestV758(box)) {
        memberScrollStateV758.mode = MEMBER_SCROLL_FOLLOW_LATEST_V758;
        clearMemberUnseenIncomingV758();
      } else {
        memberScrollStateV758.mode = MEMBER_SCROLL_READING_HISTORY_V758;
        renderMemberNewMessageIndicatorV758();
      }
    }, { passive: true });
  }

  function resetDeleteModeV597() {
    state.deleteMode = false;
    state.selectedDeleteMessageIds = {};
  }

  function parseRpcData(value) {
    var parsed = value;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (error) {}
    }
    return parsed;
  }

  function errorText(error) {
    if (!error) return '알 수 없는 오류';
    return String(
      error.message ||
        error.details ||
        error.hint ||
        error.error_description ||
        error
    );
  }

  function friendlyError(error) {
    var message = errorText(error);
    if (message.indexOf('AUTH_REQUIRED') >= 0) {
      return '로그인 상태를 다시 확인해주세요.';
    }
    if (message.indexOf('ACTIVE_MEMBER_REQUIRED') >= 0) {
      return '현재 채팅을 사용할 수 있는 정상 회원 상태가 아닙니다.';
    }
    if (
      message.indexOf(
        'CHAT_ROOM_NOT_FOUND_OR_NOT_ALLOWED'
      ) >= 0
    ) {
      return '이 채팅방을 열 수 없거나 접근권한이 없습니다.';
    }
    if (message.indexOf('CHAT_MESSAGE_TOO_LONG') >= 0) {
      return '메시지는 500자 이내로 입력해주세요.';
    }
    if (message.indexOf('CHAT_RATE_LIMIT_EXCEEDED') >= 0) {
      return '메시지를 너무 빠르게 보내고 있습니다. 잠시 후 다시 시도해주세요.';
    }
    if (message.indexOf('CHAT_MESSAGE_RATE_LIMITED') >= 0) {
      return '메시지를 너무 빠르게 보내고 있습니다. 잠시 후 다시 시도해주세요.';
    }
    if (message.indexOf('CHAT_REFERENCE_TYPE_INVALID') >= 0) {
      return '보낼 카드 종류를 확인해주세요.';
    }
    if (message.indexOf('EQUIPMENT_CARD_REFERENCE_SHAPE_INVALID') >= 0 || message.indexOf('DOCUMENT_REFERENCE_SHAPE_INVALID') >= 0) {
      return '선택한 장비·서류 정보를 확인해주세요.';
    }
    if (message.indexOf('CHAT_REFERENCE_NOT_FOUND_OR_NOT_ALLOWED') >= 0) {
      return '선택한 장비 또는 서류를 찾을 수 없거나 접근권한이 없습니다.';
    }
    if (message.indexOf('CHAT_REFERENCE_EQUIPMENT_NOT_LINKED_TO_ROOM') >= 0) {
      return '현재 이 채팅방에 연동된 장비가 아닙니다.';
    }
    if (message.indexOf('EQUIPMENT_PAYMENT_OR_SERVICE_REQUIRED') >= 0) {
      return '장비 결제 또는 서비스 상태를 확인해주세요.';
    }
    if (message.indexOf('CHAT_REFERENCE_DOCUMENT_NOT_READY') >= 0) {
      return '현재 보낼 수 있는 정상 서류가 아닙니다.';
    }
    if (message.indexOf('CHAT_DELETE_FOR_EVERYONE_NOT_ALLOWED') >= 0) {
      return '상대방이 이미 읽었거나 모두에게서 삭제할 수 없는 메시지가 포함되어 있습니다.';
    }
    if (message.indexOf('CHAT_DELETE_SCOPE_INVALID') >= 0) {
      return '메시지 삭제 범위를 확인해주세요.';
    }
    if (message.indexOf('CHAT_MESSAGE_DELETE_NOT_ALLOWED') >= 0) {
      return '삭제할 수 없거나 접근권한이 없는 메시지가 포함되어 있습니다.';
    }
    if (message.indexOf('MEMBER_CHAT_READ_ONLY') >= 0) {
      return '현재 연동 상태에서는 새 메시지를 보낼 수 없습니다.';
    }
    if (message.indexOf('BROADCAST_TARGET_REQUIRED') >= 0) {
      return '보낼 연동 소유회원을 한 명 이상 선택해주세요.';
    }
    if (message.indexOf('BROADCAST_TARGET_LIMIT_EXCEEDED') >= 0) {
      return '한 번에 최대 20명까지 보낼 수 있습니다.';
    }
    if (message.indexOf('BROADCAST_TARGET_NOT_ALLOWED') >= 0) {
      return '선택한 회원 중 현재 유효한 연동 소유회원이 아닌 대상이 있습니다. 목록을 새로고침해주세요.';
    }
    if (message.indexOf('BROADCAST_MESSAGE_INVALID') >= 0) {
      return '단체 공지 내용을 500자 이내로 입력해주세요.';
    }
    if (
      message.indexOf(
        'CHAT_REQUEST_GROUP_NOT_FOUND_OR_NOT_ALLOWED'
      ) >= 0
    ) {
      return '이미 처리됐거나 승인할 수 없는 연동 요청입니다.';
    }
    if (message.indexOf('CHAT_ATTACHMENT_MIME_NOT_ALLOWED') >= 0) {
      return '이 파일 형식은 첨부할 수 없습니다.';
    }
    if (message.indexOf('CHAT_ATTACHMENT_SIZE_INVALID') >= 0) {
      return '첨부파일은 파일당 20MB 이하만 보낼 수 있습니다.';
    }
    if (message.indexOf('CHAT_ATTACHMENT_COUNT_INVALID') >= 0) {
      return '한 번에 최대 10개 파일까지 보낼 수 있습니다.';
    }
    if (message.indexOf('CHAT_ATTACHMENT_DOWNLOAD_EXPIRED') >= 0) {
      return '이 파일은 30일 다운로드 기간이 만료되었습니다.';
    }
    if (message.indexOf('CHAT_ATTACHMENT_NOT_FOUND_OR_NOT_ALLOWED') >= 0) {
      return '파일을 찾을 수 없거나 다운로드 권한이 없습니다.';
    }
    if (message.indexOf('CHAT_ATTACHMENT_STORAGE_VERIFY_FAILED') >= 0) {
      return '업로드된 파일 확인에 실패했습니다. 다시 첨부해주세요.';
    }
    if (message.indexOf('CHAT_ATTACHMENT_NOT_PENDING_OR_NOT_ALLOWED') >= 0) {
      return '첨부파일 전송 상태를 확인할 수 없습니다. 다시 첨부해주세요.';
    }
    if (message.indexOf('ATTACHMENT_UPLOAD_WINDOW_EXPIRED') >= 0) {
      return '첨부 준비 시간이 만료되었습니다. 파일을 다시 선택해주세요.';
    }
    if (message.indexOf('CHAT_ATTACHMENT_RATE_LIMIT_EXCEEDED') >= 0) {
      return '첨부 요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.';
    }
    return message;
  }

  function isAdminMode() {
    try {
      return !!(
        typeof window.isAdminLoggedIn === 'function' &&
        window.isAdminLoggedIn()
      );
    } catch (error) {
      return false;
    }
  }

  function isMemberMode() {
    var authEventStateV79 = null;
    try {
      authEventStateV79 =
        window.SitePassAuthEvents &&
        typeof window.SitePassAuthEvents.getState === 'function'
          ? window.SitePassAuthEvents.getState()
          : null;
    } catch (error) {}
    if (
      authEventStateV79 &&
      Number(authEventStateV79.revision || 0) > 0 &&
      String(authEventStateV79.type || '') === 'SIGNED_OUT'
    ) {
      return false;
    }
    try {
      return !!(
        typeof window.isMemberLoggedIn === 'function' &&
        window.isMemberLoggedIn() &&
        !isAdminMode()
      );
    } catch (error) {
      return false;
    }
  }

  function screenVisible(id) {
    var screen = byId(id);
    if (!screen) return false;
    if (screen.classList.contains('hidden')) return false;
    var style = window.getComputedStyle
      ? window.getComputedStyle(screen)
      : null;
    return !style || style.display !== 'none';
  }

  /* STEP84 member-link mobile viewport only.
   * Message/RPC/Realtime/attachment/Back flows remain outside this helper.
   */
  function isMemberMobileViewportV663() {
    try {
      return window.matchMedia
        ? window.matchMedia('(max-width: 680px)').matches
        : Number(window.innerWidth || 0) <= 680;
    } catch (error) {
      return Number(window.innerWidth || 0) <= 680;
    }
  }

  function memberRoomVisibleV663() {
    var panel = byId('sp566MemberRoomPanel');
    return !!(
      state.currentRoomId &&
      panel &&
      !panel.hidden &&
      !panel.classList.contains('hidden') &&
      screenVisible('contactScreen')
    );
  }

  function memberVisibleBoundsV663() {
    var viewport = window.visualViewport;
    var top = viewport ? Number(viewport.offsetTop || 0) : 0;
    var height = viewport
      ? Number(viewport.height || window.innerHeight || 0)
      : Number(window.innerHeight || 0);
    return { top: top, bottom: top + height, height: height };
  }

  function scrollMemberLatestV663() {
    if (!memberRoomVisibleV663()) return;
    var messages = byId('sp566MemberMessages');
    if (!messages) return;
    memberScrollStateV758.mode = MEMBER_SCROLL_FOLLOW_LATEST_V758;
    memberScrollStateV758.forceLatestOnce = false;
    applyMemberProgrammaticScrollV758(messages, function () {
      messages.scrollTop = messages.scrollHeight;
    });
    clearMemberUnseenIncomingV758();
  }

  function refreshMemberViewportV663(keepLatest) {
    var panel = byId('sp566MemberRoomPanel');
    if (!panel) return;
    if (keepLatest) memberViewportKeepLatestV663 = true;
    if (!memberRoomVisibleV663() || !isMemberMobileViewportV663()) {
      panel.style.removeProperty('--sp663-member-visible-height');
      panel.style.removeProperty('--sp663-member-composer-height');
      memberViewportKeepLatestV663 = false;
      return;
    }
    if (memberViewportFrameV663) return;
    var frameToken = memberViewportRequestV663;
    var request = window.requestAnimationFrame || function (callback) {
      return setTimeout(callback, 0);
    };
    memberViewportFrameV663 = request(function () {
      memberViewportFrameV663 = 0;
      if (
        frameToken !== memberViewportRequestV663 ||
        !memberRoomVisibleV663() ||
        !isMemberMobileViewportV663()
      ) return;
      var bounds = memberVisibleBoundsV663();
      var panelRect = panel.getBoundingClientRect();
      var visibleTop = Math.max(bounds.top, panelRect.top);
      var visibleBottom = bounds.bottom;
      var nav = byId('sitepassBottomAppNav');
      if (nav && !nav.classList.contains('hidden')) {
        var navRect = nav.getBoundingClientRect();
        if (
          navRect.top < visibleBottom &&
          navRect.bottom > bounds.top
        ) {
          visibleBottom = Math.min(visibleBottom, navRect.top);
        }
      }
      var composer = byId('sp566MemberComposer');
      var composerHeight = 0;
      if (composer && !composer.classList.contains('hidden')) {
        composerHeight = Math.max(
          0,
          Math.ceil(composer.getBoundingClientRect().height || 0)
        );
      }
      var available = Math.max(0, Math.floor(visibleBottom - visibleTop));
      panel.style.setProperty('--sp663-member-visible-height', available + 'px');
      panel.style.setProperty('--sp663-member-composer-height', composerHeight + 'px');
      var shouldKeepLatest = memberViewportKeepLatestV663 && memberShouldFollowLatestV758();
      memberViewportKeepLatestV663 = false;
      if (shouldKeepLatest) scrollMemberLatestV663();
    });
  }

  function queueMemberViewportV663(keepLatest) {
    var token = ++memberViewportRequestV663;
    [0, 80, 180].forEach(function (delay) {
      setTimeout(function () {
        if (token !== memberViewportRequestV663 || !memberRoomVisibleV663()) return;
        var shouldKeepLatest = keepLatest && memberShouldFollowLatestV758();
        refreshMemberViewportV663(shouldKeepLatest);
        if (shouldKeepLatest) scrollMemberLatestV663();
        else renderMemberNewMessageIndicatorV758();
      }, delay);
    });
  }

  function hideMemberRoomPanelImmediatelyV663() {
    var panel = byId('sp566MemberRoomPanel');
    memberViewportRequestV663 += 1;
    memberViewportKeepLatestV663 = false;
    if (!panel) return;
    panel.classList.add('hidden');
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');
    panel.style.removeProperty('--sp663-member-visible-height');
    panel.style.removeProperty('--sp663-member-composer-height');
  }

  function resizeMemberMessageInputV773(textarea) {
    if (!textarea) return;
    var style;
    try { style = window.getComputedStyle(textarea); } catch (error) { style = null; }
    var minHeight = Math.max(0, parseFloat(style && style.minHeight) || 44);
    var maxHeight = Math.max(minHeight, parseFloat(style && style.maxHeight) || 96);
    textarea.style.height = 'auto';
    var scrollHeight = Number(textarea.scrollHeight || minHeight);
    var nextHeight = Math.max(minHeight, Math.min(maxHeight, scrollHeight));
    textarea.style.height = nextHeight + 'px';
    textarea.style.overflowY = scrollHeight > maxHeight + 1 ? 'auto' : 'hidden';
  }

  function bindMemberViewportV663() {
    if (memberViewportBoundV663) return;
    memberViewportBoundV663 = true;
    var viewportHandler = function () {
      refreshMemberViewportV663(memberShouldFollowLatestV758());
      renderMemberNewMessageIndicatorV758();
    };
    window.addEventListener('resize', viewportHandler);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', viewportHandler);
      window.visualViewport.addEventListener('scroll', viewportHandler);
    }
    document.addEventListener('focusin', function (event) {
      if (event.target !== byId('sp566MemberMessageInput')) return;
      queueMemberViewportV663(memberShouldFollowLatestV758());
    });
    document.addEventListener('focusout', function (event) {
      if (event.target !== byId('sp566MemberMessageInput')) return;
      queueMemberViewportV663(memberShouldFollowLatestV758());
    });
    document.addEventListener('input', function (event) {
      if (event.target !== byId('sp566MemberMessageInput')) return;
      resizeMemberMessageInputV773(event.target);
      refreshMemberViewportV663(memberShouldFollowLatestV758());
      renderMemberNewMessageIndicatorV758();
    });
  }

  async function rpc(name, params) {
    var api = window.SitePassSupabaseApi;
    if (!api || typeof api.rpc !== 'function') {
      throw new Error('Supabase RPC 연결을 확인하지 못했습니다.');
    }
    var result = await api.rpc(name, params || {});
    if (result && result.error) throw result.error;
    return parseRpcData(result ? result.data : null);
  }

  function newIdempotencyKey() {
    try {
      if (
        window.crypto &&
        typeof window.crypto.randomUUID === 'function'
      ) {
        return window.crypto.randomUUID();
      }
    } catch (error) {}

    if (
      !window.crypto ||
      typeof window.crypto.getRandomValues !== 'function'
    ) {
      throw new Error('안전한 요청 식별키를 만들 수 없습니다.');
    }

    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = Array.from(bytes).map(function (value) {
      return value.toString(16).padStart(2, '0');
    });
    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join('')
    ].join('-');
  }

  function formatTime(value) {
    var date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return '';
    var now = new Date();
    var today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    var target = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    var dayDiff = Math.round(
      (today.getTime() - target.getTime()) / 86400000
    );

    if (dayDiff === 0) {
      try {
        return date.toLocaleTimeString('ko-KR', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      } catch (error) {
        var hour = date.getHours();
        var period = hour < 12 ? '오전' : '오후';
        var displayHour = hour % 12 || 12;
        return (
          period +
          ' ' +
          displayHour +
          ':' +
          String(date.getMinutes()).padStart(2, '0')
        );
      }
    }

    if (dayDiff === 1) return '어제';

    if (date.getFullYear() === now.getFullYear()) {
      return (
        (date.getMonth() + 1) +
        '월 ' +
        date.getDate() +
        '일'
      );
    }

    return (
      date.getFullYear() +
      '. ' +
      (date.getMonth() + 1) +
      '. ' +
      date.getDate() +
      '.'
    );
  }

  function roomActivityTime(room) {
    var value = room && (
      room.lastMessageAt ||
      room.updatedAt ||
      room.updated_at ||
      room.createdAt ||
      room.created_at
    );
    var time = new Date(value || '').getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  function orderedRoomRows() {
    return rooms()
      .map(function (room, index) {
        return { room: room, index: index };
      })
      .sort(function (a, b) {
        var aTime = roomActivityTime(a.room);
        var bTime = roomActivityTime(b.room);
        if (aTime !== bTime) return bTime - aTime;

        var aRoomId = String(a.room.roomId || '');
        var bRoomId = String(b.room.roomId || '');
        var roomCompare = aRoomId.localeCompare(bRoomId);
        if (roomCompare !== 0) return roomCompare;

        return a.index - b.index;
      })
      .map(function (entry) {
        return entry.room;
      });
  }

  function ensureUi() {
    var legacyListPanel = byId('sitepassChatListPanel');
    var legacyRoomPanel = byId('sitepassChatRoomPanel');
    var legacyList = byId('sitepassChatRoomList');
    var card =
      legacyListPanel &&
      legacyListPanel.closest('.sitepass-chat-card');

    if (
      !legacyListPanel ||
      !legacyRoomPanel ||
      !legacyList ||
      !card
    ) {
      return false;
    }

    if (!byId('sp566MemberChatSection')) {
      var section = document.createElement('div');
      section.id = 'sp566MemberChatSection';
      section.className =
        'sp566-member-chat-section hidden';
      section.innerHTML =
        '<div class="sp566-member-chat-label sp606-member-chat-label">' +
          '<b>회원연동채팅</b>' +
          '<span id="sp566MemberPendingLabel">0건</span>' +
          '<button id="sp606InviteButton" type="button" class="sp606-invite-button hidden" onclick="return window.SitePassMemberLinkChatV566.openBulkSend(event)" aria-label="연동 소유회원에게 단체메시지 보내기">＋ 단체메시지</button>' +
        '</div>' +
        '<div id="sp566MemberRoomList" class="sp566-member-room-list"></div>' +
        '<button id="sp605BulkSendCard" type="button" class="sp605-bulk-send-card hidden" tabindex="-1" aria-hidden="true"></button>';
      legacyListPanel.insertBefore(
        section,
        legacyList.nextSibling
      );
    }

    var memberSection = byId('sp566MemberChatSection');
    if (
      memberSection &&
      memberSection.previousElementSibling !== legacyList
    ) {
      legacyListPanel.insertBefore(
        memberSection,
        legacyList.nextSibling
      );
    }

    if (!byId('sp566MemberRoomPanel')) {
      var roomPanel = document.createElement('div');
      roomPanel.id = 'sp566MemberRoomPanel';
      roomPanel.className =
        'sp566-member-room-panel hidden';
      roomPanel.innerHTML =
        '<div class="sp566-member-room-head sp606-member-room-head">' +
          '<div class="sp607-member-room-left">' +
            '<button type="button" class="sp566-member-room-back" onclick="return window.SitePassMemberLinkChatV566.backToList()" aria-label="채팅방 목록으로"><svg class="sp610-back-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
            '<div class="sp566-member-room-title sp606-member-room-title">' +
              '<b id="sp566MemberRoomTitle">회원연동채팅</b>' +
            '</div>' +
          '</div>' +
          '<button id="sp606MemberRequestToggle" type="button" class="sp606-member-request-toggle hidden" onclick="return window.SitePassMemberLinkChatV566.toggleRequestSummary(event)" aria-expanded="false">장비연동 요청 0대</button>' +
          '<div class="sp595-member-room-head-actions sp606-member-room-head-actions">' +
            '<div class="sp598-member-room-action-row">' +
              '<button id="sp597MemberDeleteStart" type="button" class="sp597-member-delete-start" onclick="return window.SitePassMemberLinkChatV566.startDeleteMode(event)">삭제</button>' +
              '<button id="sp595MemberRoomNoticeToggle" type="button" class="sp595-member-room-notice-toggle" onclick="return window.SitePassMemberLinkChatV566.toggleCurrentRoomPush(event)" aria-pressed="true">알림 ON</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="sp566MemberRequestGroups" class="sp566-member-request-groups"></div>' +
        '<div id="sp597MemberDeleteBar" class="sp597-member-delete-bar hidden">' +
          '<button type="button" class="sp597-member-delete-cancel" onclick="return window.SitePassMemberLinkChatV566.cancelDeleteMode(event)">취소</button>' +
          '<strong id="sp597MemberDeleteCount">0개 선택</strong>' +
          '<button id="sp597MemberDeleteConfirm" type="button" class="sp597-member-delete-confirm" onclick="return window.SitePassMemberLinkChatV566.confirmDelete(event)" disabled>선택 삭제</button>' +
        '</div>' +
        '<div id="sp566MemberMessages" class="sp566-member-messages"></div>' +
        '<button id="sp758MemberNewMessageButton" type="button" class="sp758-member-new-message hidden" hidden onclick="return window.SitePassMemberLinkChatV566.goToLatest(event)" aria-live="polite" aria-label="새 메시지, 최신 메시지로 이동">새 메시지 ↓</button>' +
        '<div id="sp566MemberComposer" class="sp566-member-composer hidden">' +
          '<div id="sp590AttachmentSelection" class="sp590-attachment-selection hidden"></div>' +
          '<div class="sp590-attachment-picker-wrap">' +
            '<button id="sp590AttachmentPlus" type="button" class="sp590-attachment-plus" onclick="return window.SitePassMemberLinkChatV566.toggleAttachmentMenu(event)" aria-label="첨부 및 공유" aria-expanded="false">+</button>' +
            '<div id="sp590AttachmentMenu" class="sp590-attachment-menu hidden" role="menu">' +
              '<button type="button" role="menuitem" onclick="return window.SitePassMemberLinkChatV566.openAttachmentPicker(event)">📎 사진 및 파일 첨부</button>' +
              '<button type="button" role="menuitem" onclick="return window.SitePassMemberLinkChatV566.openContactPicker(event)">📇 연락처 보내기</button>' +
              '<button type="button" role="menuitem" onclick="return window.SitePassMemberLinkChatV566.openRecipientSharePicker(event)">🔗 내 장비·서류 링크 보내기</button>' +
            '</div>' +
            '<input id="sp590AttachmentInput" class="sp590-attachment-input" type="file" multiple hidden accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.hwp,.hwpx" onchange="window.SitePassMemberLinkChatV566.handleAttachmentFiles(this.files)">' +
          '</div>' +
          '<textarea id="sp566MemberMessageInput" maxlength="500" rows="1" placeholder="메시지를 입력하세요." aria-label="회원 채팅 메시지"></textarea>' +
          '<button id="sp566MemberSendButton" type="button" onclick="return window.SitePassMemberLinkChatV566.sendMessage()">전송</button>' +
        '</div>' +
        '<div id="sp566MemberReadOnly" class="sp566-member-read-only hidden">현재 연동 상태에서는 대화 내용을 확인만 할 수 있습니다.</div>';
      card.insertBefore(roomPanel, legacyRoomPanel);

      var input = byId('sp566MemberMessageInput');
      if (input) {
        resizeMemberMessageInputV773(input);
      }
    }

    bindMemberMessageScrollV758();

    if (!byId('sp566LinkRequestModal')) {
      var modal = document.createElement('div');
      modal.id = 'sp566LinkRequestModal';
      modal.className =
        'sp566-link-request-modal hidden';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute(
        'aria-labelledby',
        'sp566LinkRequestModalTitle'
      );
      modal.innerHTML =
        '<div class="sp566-link-request-dialog">' +
          '<div class="sp566-link-request-dialog-icon">💬</div>' +
          '<h3 id="sp566LinkRequestModalTitle">장비 연동 요청이 있습니다</h3>' +
          '<p id="sp566LinkRequestModalText">회원이 보낸 장비 연동 요청을 채팅방에서 확인해주세요.</p>' +
          '<div class="sp566-link-request-dialog-actions">' +
            '<button type="button" class="later" onclick="return window.SitePassMemberLinkChatV566.dismissHomeModal()">나중에</button>' +
            '<button type="button" class="open" onclick="return window.SitePassMemberLinkChatV566.openHomeRequest()">확인하기</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
    }

    if (!byId('sp605BulkSendModal')) {
      var bulkModal = document.createElement('div');
      bulkModal.id = 'sp605BulkSendModal';
      bulkModal.className = 'sp605-bulk-send-modal hidden';
      bulkModal.setAttribute('role', 'dialog');
      bulkModal.setAttribute('aria-modal', 'true');
      bulkModal.setAttribute('aria-labelledby', 'sp605BulkSendTitle');
      bulkModal.innerHTML =
        '<div class="sp605-bulk-send-dialog sp606-group-send-dialog">' +
          '<div class="sp605-bulk-send-head">' +
            '<div>' +
              '<b id="sp605BulkSendTitle">단체메시지</b>' +
              '<small>선택한 회원에게 한 번 보내면 각 회원의 기존 1:1 채팅방으로 전달됩니다.</small>' +
            '</div>' +
            '<button type="button" aria-label="닫기" onclick="return window.SitePassMemberLinkChatV566.closeBulkSend(event)">×</button>' +
          '</div>' +
          '<div class="sp605-bulk-send-search-row">' +
            '<input id="sp605BulkSearch" type="search" maxlength="60" placeholder="회원명·장비번호 검색" oninput="window.SitePassMemberLinkChatV566.handleBulkSearch(this.value)">' +
            '<button id="sp605BulkSelectAll" type="button" onclick="return window.SitePassMemberLinkChatV566.toggleBulkSelectAll(event)">전체선택</button>' +
          '</div>' +
          '<div id="sp605BulkTargetSummary" class="sp605-bulk-target-summary">0명 선택</div>' +
          '<div id="sp605BulkTargetList" class="sp605-bulk-target-list"></div>' +
          '<div id="sp607BulkPager" class="sp607-bulk-pager">' +
            '<span id="sp607BulkRange">현재 0명 표시</span>' +
            '<div>' +
              '<button id="sp607BulkPrev" type="button" onclick="return window.SitePassMemberLinkChatV566.bulkPreviousPage(event)">이전</button>' +
              '<b id="sp607BulkPage">1 / 1 페이지</b>' +
              '<button id="sp607BulkNext" type="button" onclick="return window.SitePassMemberLinkChatV566.bulkNextPage(event)">다음</button>' +
            '</div>' +
          '</div>' +
          '<div id="sp605BulkResult" class="sp605-bulk-result hidden"></div>' +
          '<div class="sp606-group-composer">' +
            '<textarea id="sp605BulkMessageInput" maxlength="500" rows="1" placeholder="메시지를 입력하세요." oninput="window.SitePassMemberLinkChatV566.handleBulkMessage(this.value)"></textarea>' +
            '<button id="sp605BulkSendButton" type="button" onclick="return window.SitePassMemberLinkChatV566.sendBulkMessage(event)">보내기</button>' +
          '</div>' +
          '<p class="sp605-bulk-send-note">수신자는 다른 선택 회원을 볼 수 없고, 보낸 사람과의 기존 1:1 채팅방에서 받습니다.</p>' +
        '</div>';
      document.body.appendChild(bulkModal);
    }

    if (!byId('sp602ReferencePickerModal')) {
      var referenceModal = document.createElement('div');
      referenceModal.id = 'sp602ReferencePickerModal';
      referenceModal.className = 'sp602-reference-modal hidden';
      referenceModal.setAttribute('role', 'dialog');
      referenceModal.setAttribute('aria-modal', 'true');
      referenceModal.setAttribute('aria-labelledby', 'sp602ReferencePickerTitle');
      referenceModal.innerHTML =
        '<button type="button" class="sp602-reference-backdrop" aria-label="닫기" onclick="return window.SitePassMemberLinkChatV566.closeReferencePicker(event)"></button>' +
        '<section class="sp602-reference-sheet">' +
          '<div class="sp602-reference-sheet-head">' +
            '<div>' +
              '<small>친구 채팅 공유</small>' +
              '<b id="sp602ReferencePickerTitle">내 장비·서류 링크 보내기</b>' +
              '<p id="sp602ReferencePickerDesc">담당자에게 전달할 SitePass 링크의 장비를 선택해주세요.</p>' +
            '</div>' +
            '<button type="button" class="sp602-reference-close" aria-label="닫기" onclick="return window.SitePassMemberLinkChatV566.closeReferencePicker(event)">×</button>' +
          '</div>' +
          '<div id="sp602ReferencePickerBody" class="sp602-reference-picker-body"></div>' +
        '</section>';
      document.body.appendChild(referenceModal);
    }

    return true;
  }

  function rooms() {
    return state.list && Array.isArray(state.list.rooms)
      ? state.list.rooms
      : [];
  }

  function pendingIncomingGroups(room) {
    return room &&
      Array.isArray(room.incomingPendingGroups)
      ? room.incomingPendingGroups
      : [];
  }

  function pendingOutgoingGroups(room) {
    return room &&
      Array.isArray(room.outgoingPendingGroups)
      ? room.outgoingPendingGroups
      : [];
  }

  function pendingEquipmentCount(groups) {
    return (Array.isArray(groups) ? groups : []).reduce(
      function (total, group) {
        return total + Number(group.equipmentCount || 0);
      },
      0
    );
  }

  function incomingSignature() {
    return rooms()
      .reduce(function (values, room) {
        pendingIncomingGroups(room).forEach(function (group) {
          values.push(
            String(group.requestGroupId || '')
          );
        });
        return values;
      }, [])
      .filter(Boolean)
      .sort()
      .join('|');
  }

  function firstIncomingRoom() {
    return (
      rooms().find(function (room) {
        return pendingIncomingGroups(room).length > 0;
      }) || null
    );
  }

  var MEMBER_ROOM_NOTICE_KEY_V592 = 'sitepass_chat_notice_settings_v460';

  function roomPushApiV595() {
    return window.SitePassRoomPushV595 || null;
  }

  function memberRoomNoticeOnV592(roomId) {
    var api = roomPushApiV595();
    if (api && typeof api.get === 'function') {
      return api.get('member_chat', String(roomId || '')) !== false;
    }
    try {
      var raw = window.localStorage.getItem(MEMBER_ROOM_NOTICE_KEY_V592);
      var settings = raw ? JSON.parse(raw) : {};
      if (settings && typeof settings[String(roomId || '')] === 'boolean') {
        return settings[String(roomId || '')];
      }
    } catch (error) {}
    return true;
  }

  function memberRoomPushBusyV595(roomId) {
    var api = roomPushApiV595();
    return !!(
      api &&
      typeof api.isBusy === 'function' &&
      api.isBusy('member_chat', String(roomId || ''))
    );
  }

  function memberRoomPushToggleHtmlV595(roomId, on) {
    var busy = memberRoomPushBusyV595(roomId);
    var label = busy ? '저장 중' : (on ? '알림 ON' : '알림 OFF');
    return '<em role="button" tabindex="0" data-sp595-room-id="' + attr(roomId) + '" aria-label="회원 대화방 휴대폰 Push ' + (on ? '끄기' : '켜기') + '" aria-pressed="' + (on ? 'true' : 'false') + '" class="sp592-member-notice-pill sp595-room-push-toggle' + (on ? '' : ' off') + (busy ? ' sp595-push-busy' : '') + '" onclick="return window.SitePassRoomPushV595.handleToggle(event,&quot;member_chat&quot;,this.getAttribute(&quot;data-sp595-room-id&quot;))" onkeydown="return window.SitePassRoomPushV595.handleKey(event,&quot;member_chat&quot;,this.getAttribute(&quot;data-sp595-room-id&quot;))">' + label + '</em>';
  }

  function roomActiveEquipmentLabel(room) {
    var rows = Array.isArray(room && room.activeEquipment)
      ? room.activeEquipment
      : [];
    var seen = {};
    var unique = [];

    rows.forEach(function (item) {
      var no = String(item && item.equipmentNo || '').trim();
      if (!no || seen[no]) return;
      seen[no] = true;
      unique.push({
        equipmentNo: no,
        equipmentName: String(
          item && item.equipmentName || '장비'
        ).trim() || '장비'
      });
    });

    if (!unique.length) return '';

    unique.sort(function (a, b) {
      return a.equipmentNo.localeCompare(
        b.equipmentNo,
        'ko'
      );
    });

    var first = unique[0];
    var label =
      first.equipmentName + ' ' + first.equipmentNo;

    if (unique.length > 1) {
      label += ' 외 ' + (unique.length - 1) + '대';
    }

    return label;
  }


  function normalizeMemberDisplayNameV608(value) {
    var name = String(value || '').trim().replace(/\s*회원\s*$/, '');
    return name || 'SitePass';
  }

  function memberDisplayNameV608(room) {
    room = room || {};
    var counterpartUuid = String(
      room.counterpartMemberUuid ||
      room.counterpart_member_uuid ||
      ''
    ).trim();
    var fullName = normalizeMemberDisplayNameV608(
      room.counterpartFullName ||
      room.counterpart_full_name ||
      room.counterpartName ||
      room.counterpart_name ||
      room.counterpartDisplayName ||
      'SitePass'
    );

    return fullName;
  }

  function memberMessageSenderNameV609(message) {
    message = message || {};
    var senderUuid = String(message.senderMemberUuid || message.sender_member_uuid || message.senderMemberId || message.sender_member_id || '').trim();
    var name = normalizeMemberDisplayNameV608(message.senderFullName || message.sender_full_name || message.senderDisplayName || message.sender_display_name || 'SitePass');
    return name;
  }

  function currentRequestEquipmentNamesV608() {
    var seen = {};
    var names = [];
    function append(item) {
      var name = String(
        item && (item.equipmentName || item.equipment_name) || ''
      ).trim();
      var key = String(
        item && (item.equipmentId || item.equipment_id || item.equipmentNo || item.equipment_no || name) || ''
      ).trim();
      if (!name || !key || seen[key]) return;
      seen[key] = true;
      names.push(name);
    }

    currentVisibleRequestGroups().forEach(function (group) {
      (Array.isArray(group && group.items) ? group.items : []).forEach(append);
    });

    if (!names.length) {
      var room = state.currentRoom || {};
      (Array.isArray(room.activeEquipment) ? room.activeEquipment : []).forEach(append);
    }

    if (names.length <= 3) return names.join(', ');
    return names.slice(0, 2).join(', ') + ' 외 ' + (names.length - 2) + '대';
  }

  function bulkTargetDisplayNameV612(target) {
    target = target || {};
    var ownerUuid = String(
      target.ownerMemberUuid ||
      target.owner_member_uuid ||
      ''
    ).trim();
    var name = normalizeMemberDisplayNameV608(
      target.displayName ||
      target.display_name ||
      target.ownerName ||
      target.owner_name ||
      'SitePass'
    );

    return name;
  }

  function bulkTargets() {
    return Array.isArray(state.bulkTargets)
      ? state.bulkTargets
      : [];
  }

  function bulkTargetKey(target) {
    return String(
      target && (
        target.targetKey ||
        target.ownerMemberUuid ||
        target.owner_member_uuid ||
        target.roomId
      ) || ''
    ).trim();
  }

  function bulkTargetOwnerId(target) {
    return String(
      target && (
        target.ownerMemberUuid ||
        target.owner_member_uuid
      ) || ''
    ).trim();
  }

  function bulkTargetEquipmentLabel(target) {
    var rows = Array.isArray(target && target.equipment)
      ? target.equipment
      : [];
    var seen = {};
    var values = rows.map(function (item) {
      var no = String(item && (item.equipmentNo || item.equipment_no) || '').trim();
      var name = String(item && (item.equipmentName || item.equipment_name) || '장비').trim() || '장비';
      var key = String(item && (item.equipmentId || item.equipment_id) || no).trim();
      if (!key || seen[key]) return null;
      seen[key] = true;
      return { no: no, name: name };
    }).filter(Boolean);
    if (!values.length) return '활성 연동장비';
    values.sort(function (a, b) {
      return (a.no || a.name).localeCompare(b.no || b.name, 'ko');
    });
    var first = values[0];
    var label = first.name + (first.no ? ' ' + first.no : '');
    if (values.length > 1) label += ' 외 ' + (values.length - 1) + '대';
    return label;
  }

  function bulkSelectedOwnerIds() {
    return Object.keys(state.bulkSelectedOwnerIds || {})
      .filter(function (targetKey) {
        return state.bulkSelectedOwnerIds[targetKey] === true;
      });
  }

  function bulkVisibleTargets() {
    var query = String(state.bulkSearch || '').trim().toLowerCase();
    return bulkTargets().filter(function (target) {
      if (!query) return true;
      var searchable = [
        target.displayName,
        bulkTargetEquipmentLabel(target),
        (Array.isArray(target.equipment) ? target.equipment : [])
          .map(function (item) {
            return [
              item && (item.equipmentName || item.equipment_name),
              item && (item.equipmentNo || item.equipment_no)
            ].join(' ');
          })
          .join(' ')
      ].join(' ').toLowerCase();
      return searchable.indexOf(query) >= 0;
    });
  }

  function normalizeBroadcastTargetsV613(result) {
    if (!result || result.ok !== true || !Array.isArray(result.targets)) {
      return [];
    }
    return result.targets.filter(function (target) {
      return (
        !!bulkTargetOwnerId(target) &&
        !!String(target && (target.roomId || target.room_id) || '').trim()
      );
    }).map(function (target) {
      if (!target.roomId && target.room_id) target.roomId = target.room_id;
      return target;
    });
  }

  function linkedArchiveOwnerIdV613(item) {
    return String(
      item && (
        item.ownerMemberUuid ||
        item.owner_member_uuid ||
        item.counterpartMemberUuid ||
        item.counterpart_member_uuid
      ) || ''
    ).trim();
  }

  function linkedArchiveEquipmentV613(item) {
    return {
      equipmentId: String(item && (item.equipmentId || item.equipment_id) || '').trim(),
      equipmentNo: String(item && (item.equipmentNo || item.equipment_no) || '').trim(),
      equipmentName: String(item && (item.equipmentName || item.equipment_name) || '장비').trim() || '장비'
    };
  }

  function linkedArchiveItemAllowedV613(item) {
    var relation = String(
      item && (
        item.relationType ||
        item.relation_type ||
        item.sitePassRelationTypeV562
      ) || ''
    ).trim().toLowerCase();
    if (relation !== 'linked_in') return false;

    var serviceState = String(
      item && (item.serviceState || item.service_state) || ''
    ).trim().toLowerCase();
    if (serviceState && serviceState !== 'available') return false;

    return !!linkedArchiveOwnerIdV613(item);
  }

  async function loadLinkedArchiveItemsV613() {
    var page = 1;
    var totalPages = 1;
    var rows = [];

    do {
      var result = await rpc('sitepass_list_my_equipment_archive_v1', {
        p_page: page,
        p_page_size: 100,
        p_relation_type: 'linked_in',
        p_search: null
      });
      if (!result || result.ok !== true || !Array.isArray(result.items)) {
        throw new Error('연동받은 장비 자격을 확인하지 못했습니다.');
      }
      rows = rows.concat(result.items.filter(linkedArchiveItemAllowedV613));
      totalPages = Math.max(
        1,
        Number(
          result.paging && (
            result.paging.totalPages ||
            result.paging.total_pages
          ) || 1
        )
      );
      page += 1;
    } while (page <= totalPages && page <= 100);

    return rows;
  }

  function roomCounterpartIdV613(room) {
    return String(
      room && (
        room.counterpartMemberUuid ||
        room.counterpart_member_uuid ||
        room.ownerMemberUuid ||
        room.owner_member_uuid
      ) || ''
    ).trim();
  }

  function roomEquipmentMatchesV613(room, equipmentRows) {
    var expected = {};
    (equipmentRows || []).forEach(function (item) {
      var equipment = linkedArchiveEquipmentV613(item);
      if (equipment.equipmentId) expected['id:' + equipment.equipmentId] = true;
      if (equipment.equipmentNo) expected['no:' + equipment.equipmentNo] = true;
    });
    return (Array.isArray(room && room.activeEquipment) ? room.activeEquipment : [])
      .some(function (item) {
        var id = String(item && (item.equipmentId || item.equipment_id) || '').trim();
        var no = String(item && (item.equipmentNo || item.equipment_no) || '').trim();
        return !!(
          (id && expected['id:' + id]) ||
          (no && expected['no:' + no])
        );
      });
  }

  async function archiveGatedBroadcastTargetsV613() {
    var linkedItems = await loadLinkedArchiveItemsV613();
    if (!linkedItems.length) return [];

    var grouped = {};
    linkedItems.forEach(function (item) {
      var ownerId = linkedArchiveOwnerIdV613(item);
      if (!ownerId) return;
      if (!grouped[ownerId]) grouped[ownerId] = [];
      grouped[ownerId].push(item);
    });

    var roomRows = orderedRoomRows();
    return Object.keys(grouped).map(function (ownerId) {
      var equipmentRows = grouped[ownerId];
      var room = roomRows.find(function (candidate) {
        return (
          candidate &&
          candidate.chatWritable !== false &&
          roomCounterpartIdV613(candidate) === ownerId
        );
      });
      if (!room) {
        room = roomRows.find(function (candidate) {
          return (
            candidate &&
            candidate.chatWritable !== false &&
            roomEquipmentMatchesV613(candidate, equipmentRows)
          );
        });
      }
      if (!room || !String(room.roomId || '').trim()) return null;

      return {
        targetKey: 'owner:' + ownerId,
        ownerMemberUuid: ownerId,
        roomId: String(room.roomId || '').trim(),
        displayName: memberDisplayNameV608(room),
        equipmentCount: equipmentRows.length,
        equipment: equipmentRows.map(linkedArchiveEquipmentV613),
        chatWritable: true,
        eligibilitySource: 'equipment_archive_linked_in'
      };
    }).filter(Boolean);
  }

  function broadcastSendFallbackAllowedV613(error) {
    var message = errorText(error).toLowerCase();
    return (
      message.indexOf('sitepass_send_my_link_owner_broadcast_v1') >= 0 ||
      message.indexOf('could not find the function') >= 0 ||
      message.indexOf('pgrst202') >= 0 ||
      message.indexOf('schema cache') >= 0 ||
      message.indexOf('permission denied for function') >= 0 ||
      message.indexOf('does not exist') >= 0 ||
      message.indexOf('broadcast_target_not_allowed') >= 0
    );
  }

  async function refreshBulkTargets(force) {
    if (!isMemberMode()) {
      state.bulkTargets = [];
      state.bulkTargetsError = '';
      state.bulkTargetsLoading = false;
      state.bulkTargetsPromise = null;
      state.bulkTargetsSource = '';
      state.bulkTargetsResolved = true;
      renderBulkSendCard();
      renderBulkSendModal();
      return [];
    }

    var now = Date.now();
    if (
      !force &&
      Array.isArray(state.bulkTargets) &&
      now - state.bulkTargetsLastAt < 5000
    ) {
      return state.bulkTargets;
    }
    if (state.bulkTargetsPromise) return state.bulkTargetsPromise;

    state.bulkTargetsLoading = true;
    state.bulkTargetsError = '';
    /* v614: 강제 새로고침에서도 직전 자격 결과를 유지해 버튼이 사라졌다 다시 나타나는 pop-in을 막는다. */
    renderBulkSendCard();
    renderBulkSendModal();

    state.bulkTargetsPromise = (async function () {
      var dedicatedError = null;
      try {
        var dedicatedResult = await rpc(
          'sitepass_list_my_link_owner_broadcast_targets_v1',
          {}
        );
        var dedicatedTargets = normalizeBroadcastTargetsV613(dedicatedResult);
        if (dedicatedTargets.length) {
          state.bulkTargets = dedicatedTargets;
          state.bulkTargetsSource = 'dedicated_broadcast_rpc';
          state.bulkTargetsLastAt = Date.now();
          state.bulkTargetsError = '';
          return state.bulkTargets;
        }
      } catch (error) {
        dedicatedError = error;
      }

      /*
       * v612 회귀 복구:
       * 전용 RPC가 아직 설치되지 않았거나 빈 결과를 반환하는 환경에서는
       * 기존 서버 보관함 RPC의 linked_in 장비만 읽어 원소유자를 계산한다.
       * 일반 채팅방 존재만으로는 절대 노출하지 않으므로 원소유자 계정은 숨겨진다.
       */
      var archiveTargets = await archiveGatedBroadcastTargetsV613();
      state.bulkTargets = archiveTargets;
      state.bulkTargetsSource = archiveTargets.length
        ? 'equipment_archive_linked_in'
        : '';
      state.bulkTargetsLastAt = Date.now();
      state.bulkTargetsError = archiveTargets.length || !dedicatedError
        ? ''
        : friendlyError(dedicatedError);
      return state.bulkTargets;
    })()
      .catch(function (error) {
        state.bulkTargets = [];
        state.bulkTargetsSource = '';
        state.bulkTargetsError = friendlyError(error);
        return [];
      })
      .finally(function () {
        state.bulkTargetsResolved = true;
        state.bulkTargetsLoading = false;
        state.bulkTargetsPromise = null;
        renderBulkSendCard();
        renderBulkSendModal();
      });

    return state.bulkTargetsPromise;
  }

  function renderBulkSendCard() {
    var invite = byId('sp606InviteButton');
    var legacyCard = byId('sp605BulkSendCard');
    var count = bulkTargets().length;
    if (legacyCard) legacyCard.classList.add('hidden');
    if (!invite) return;
    invite.classList.toggle('hidden', state.bulkTargetsResolved !== true || count < 1);
    invite.disabled = count < 1 || state.bulkTargetsLoading === true;
    invite.textContent = '＋ 단체메시지';
    invite.setAttribute(
      'aria-label',
      '연동 소유회원 ' + count + '명 중 선택해 단체메시지 보내기'
    );
  }

  function renderBulkSendModal() {
    var modal = byId('sp605BulkSendModal');
    if (!modal) return;
    modal.classList.toggle('hidden', !state.bulkSendOpen);
    document.body.classList.toggle('sp606-group-send-open', state.bulkSendOpen);
    if (!state.bulkSendOpen) return;

    var search = byId('sp605BulkSearch');
    var message = byId('sp605BulkMessageInput');
    if (search && search.value !== state.bulkSearch) search.value = state.bulkSearch;
    if (message && message.value !== state.bulkMessage) message.value = state.bulkMessage;

    var targets = bulkTargets();
    var filtered = bulkVisibleTargets();
    var pageSize = Math.max(1, Number(state.bulkPageSize || 10));
    var pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    state.bulkPage = Math.min(Math.max(1, Number(state.bulkPage || 1)), pageCount);
    var pageStartIndex = (state.bulkPage - 1) * pageSize;
    var visible = filtered.slice(pageStartIndex, pageStartIndex + pageSize);
    var selected = bulkSelectedOwnerIds();
    var list = byId('sp605BulkTargetList');
    var summary = byId('sp605BulkTargetSummary');
    var selectAll = byId('sp605BulkSelectAll');
    var sendButton = byId('sp605BulkSendButton');
    var result = byId('sp605BulkResult');
    var range = byId('sp607BulkRange');
    var page = byId('sp607BulkPage');
    var previous = byId('sp607BulkPrev');
    var next = byId('sp607BulkNext');

    if (summary) {
      summary.textContent = '선택 ' + selected.length + '명 / 전체 ' + targets.length + '명';
    }

    if (range) {
      var shownFrom = filtered.length ? pageStartIndex + 1 : 0;
      var shownTo = filtered.length ? Math.min(pageStartIndex + visible.length, filtered.length) : 0;
      range.textContent = '현재 ' + shownFrom + '~' + shownTo + '명 표시';
    }
    if (page) page.textContent = state.bulkPage + ' / ' + pageCount + ' 페이지';
    if (previous) previous.disabled = state.bulkSending || state.bulkPage <= 1;
    if (next) next.disabled = state.bulkSending || state.bulkPage >= pageCount;

    if (selectAll) {
      var allVisibleSelected = filtered.length > 0 && filtered.every(function (target) {
        return state.bulkSelectedOwnerIds[bulkTargetKey(target)] === true;
      });
      selectAll.textContent = allVisibleSelected ? '선택해제' : '전체선택';
      selectAll.disabled = state.bulkSending || state.bulkTargetsLoading || filtered.length < 1;
    }

    if (list) {
      if (state.bulkTargetsLoading && !targets.length) {
        list.innerHTML = '<div class="sp605-bulk-empty">메시지를 보낼 회원을 확인하고 있습니다.</div>';
      } else if (state.bulkTargetsError && !targets.length) {
        list.innerHTML = '<div class="sp605-bulk-empty">' + html(state.bulkTargetsError) + '</div>';
      } else {
        list.innerHTML = visible.length
          ? visible.map(function (target) {
              var targetKey = bulkTargetKey(target);
              var displayName = bulkTargetDisplayNameV612(target) + ' 회원';
              var equipmentText = bulkTargetEquipmentLabel(target);
              var checked = state.bulkSelectedOwnerIds[targetKey] === true;
              return (
                '<label class="sp605-bulk-target-row' + (checked ? ' selected' : '') + '">' +
                  '<input type="checkbox" ' + (checked ? 'checked ' : '') +
                    'onchange="window.SitePassMemberLinkChatV566.toggleBulkTarget(\'' + attr(targetKey) + '\',this.checked)">' +
                  '<span class="sp605-bulk-target-avatar">👤</span>' +
                  '<span class="sp605-bulk-target-copy">' +
                    '<b>' + html(displayName) + '</b>' +
                    '<small>' + html(equipmentText) + '</small>' +
                  '</span>' +
                '</label>'
              );
            }).join('')
          : '<div class="sp605-bulk-empty">검색 결과가 없습니다.</div>';
      }
    }

    if (result) {
      var resultText = '';
      if (state.bulkError) resultText = state.bulkError;
      else if (state.bulkResult) {
        resultText = '전송 완료 ' + Number(state.bulkResult.targetCount || 0) + '명';
        if (Number(state.bulkResult.failedCount || 0) > 0) {
          resultText += ' · 실패 ' + Number(state.bulkResult.failedCount || 0) + '명';
        }
      }
      result.textContent = resultText;
      result.classList.toggle('hidden', !resultText);
      result.classList.toggle('error', !!state.bulkError || Number(state.bulkResult && state.bulkResult.failedCount || 0) > 0);
    }

    if (sendButton) {
      sendButton.disabled = state.bulkSending || selected.length < 1 || !String(state.bulkMessage || '').trim();
      sendButton.textContent = state.bulkSending ? '전송 중' : '보내기';
    }
  }

  function openBulkSend(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (state.bulkTargetsLoading) return false;

    state.bulkSearch = '';
    state.bulkPage = 1;
    state.bulkTitle = '';
    state.bulkMessage = '';
    state.bulkSelectedOwnerIds = {};
    state.bulkBatchIdempotencyKey = '';
    state.bulkRoomIdempotencyKeys = {};
    state.bulkSending = false;
    state.bulkResult = null;
    state.bulkError = '';

    refreshBulkTargets(true).then(function () {
      if (!bulkTargets().length) {
        state.bulkSendOpen = false;
        renderBulkSendCard();
        renderBulkSendModal();
        return;
      }
      state.bulkSendOpen = true;
      renderBulkSendModal();
      setTimeout(function () {
        var search = byId('sp605BulkSearch');
        if (search) search.focus();
      }, 50);
    });
    return false;
  }

  function closeBulkSend(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (state.bulkSending) return false;
    state.bulkSendOpen = false;
    renderBulkSendModal();
    return false;
  }

  function handleBulkSearch(value) {
    state.bulkSearch = String(value || '').slice(0, 60);
    state.bulkPage = 1;
    renderBulkSendModal();
  }

  function bulkPreviousPage(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (state.bulkSending) return false;
    state.bulkPage = Math.max(1, Number(state.bulkPage || 1) - 1);
    renderBulkSendModal();
    return false;
  }

  function bulkNextPage(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (state.bulkSending) return false;
    var pageSize = Math.max(1, Number(state.bulkPageSize || 10));
    var pageCount = Math.max(1, Math.ceil(bulkVisibleTargets().length / pageSize));
    state.bulkPage = Math.min(pageCount, Number(state.bulkPage || 1) + 1);
    renderBulkSendModal();
    return false;
  }

  function handleBulkTitle(value) {
    state.bulkTitle = String(value || '').slice(0, 60);
    renderBulkSendModal();
  }

  function handleBulkMessage(value) {
    state.bulkMessage = String(value || '').slice(0, 500);
    state.bulkError = '';
    renderBulkSendModal();
  }

  function toggleBulkTarget(targetKey, checked) {
    targetKey = String(targetKey || '').trim();
    if (!targetKey || state.bulkSending) return false;
    var eligible = bulkTargets().some(function (target) {
      return bulkTargetKey(target) === targetKey;
    });
    if (!eligible) return false;
    if (checked && bulkSelectedOwnerIds().length >= 20 && state.bulkSelectedOwnerIds[targetKey] !== true) {
      alert('한 번에 최대 20명까지 선택할 수 있습니다.');
      renderBulkSendModal();
      return false;
    }
    state.bulkSelectedOwnerIds[targetKey] = checked === true;
    state.bulkResult = null;
    state.bulkError = '';
    renderBulkSendModal();
    return false;
  }

  function toggleBulkSelectAll(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (state.bulkSending) return false;
    var visible = bulkVisibleTargets();
    var allSelected = visible.length > 0 && visible.every(function (target) {
      return state.bulkSelectedOwnerIds[bulkTargetKey(target)] === true;
    });
    if (allSelected) {
      visible.forEach(function (target) {
        delete state.bulkSelectedOwnerIds[bulkTargetKey(target)];
      });
    } else {
      var current = bulkSelectedOwnerIds().length;
      visible.forEach(function (target) {
        var targetKey = bulkTargetKey(target);
        if (state.bulkSelectedOwnerIds[targetKey] === true) return;
        if (current >= 20) return;
        state.bulkSelectedOwnerIds[targetKey] = true;
        current += 1;
      });
      if (visible.length > 20) alert('한 번에 최대 20명까지 선택할 수 있습니다.');
    }
    state.bulkResult = null;
    state.bulkError = '';
    renderBulkSendModal();
    return false;
  }

  async function sendBulkMessage(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (state.bulkSending) return false;

    var selectedKeys = bulkSelectedOwnerIds();
    var selectedTargets = bulkTargets().filter(function (target) {
      return selectedKeys.indexOf(bulkTargetKey(target)) >= 0;
    });
    var selectedOwnerIds = selectedTargets
      .map(bulkTargetOwnerId)
      .filter(Boolean);
    var body = String(state.bulkMessage || '').trim();

    if (!selectedOwnerIds.length) {
      state.bulkError = '단체메시지를 보낼 연동 소유회원을 한 명 이상 선택해주세요.';
      renderBulkSendModal();
      return false;
    }
    if (selectedOwnerIds.length > 20) {
      state.bulkError = '한 번에 최대 20명까지 보낼 수 있습니다.';
      renderBulkSendModal();
      return false;
    }
    if (!body) {
      state.bulkError = '메시지 내용을 입력해주세요.';
      renderBulkSendModal();
      return false;
    }
    if (body.length > 500) {
      state.bulkError = '메시지는 500자 이내로 입력해주세요.';
      renderBulkSendModal();
      return false;
    }
    if (!window.confirm('선택한 연동 소유회원 ' + selectedOwnerIds.length + '명의 기존 1:1 채팅방으로 같은 메시지를 보낼까요?')) {
      return false;
    }

    if (!state.bulkBatchIdempotencyKey) {
      state.bulkBatchIdempotencyKey = newIdempotencyKey();
    }
    state.bulkSending = true;
    state.bulkError = '';
    state.bulkResult = null;
    renderBulkSendModal();

    try {
      var result = null;
      try {
        result = await rpc('sitepass_send_my_link_owner_broadcast_v1', {
          p_owner_member_ids: selectedOwnerIds,
          p_message_text: body,
          p_idempotency_key: state.bulkBatchIdempotencyKey
        });
        if (
          !result ||
          result.ok !== true ||
          Number(result.targetCount || 0) !== selectedOwnerIds.length
        ) {
          throw new Error('단체메시지 전송 결과를 확인하지 못했습니다.');
        }
      } catch (dedicatedSendError) {
        if (!broadcastSendFallbackAllowedV613(dedicatedSendError)) {
          throw dedicatedSendError;
        }

        /* 전송 직전 linked_in 서버 자격을 다시 읽어 선택 대상 변조를 차단한다. */
        var freshTargets = await archiveGatedBroadcastTargetsV613();
        var freshByOwner = {};
        freshTargets.forEach(function (target) {
          freshByOwner[bulkTargetOwnerId(target)] = target;
        });
        var allowedTargets = selectedOwnerIds.map(function (ownerId) {
          return freshByOwner[ownerId] || null;
        }).filter(Boolean);
        if (allowedTargets.length !== selectedOwnerIds.length) {
          throw new Error('BROADCAST_TARGET_NOT_ALLOWED');
        }

        var sentCount = 0;
        var failures = [];
        for (var i = 0; i < allowedTargets.length; i += 1) {
          var target = allowedTargets[i];
          var targetKey = bulkTargetKey(target);
          if (!state.bulkRoomIdempotencyKeys[targetKey]) {
            state.bulkRoomIdempotencyKeys[targetKey] = newIdempotencyKey();
          }
          try {
            var sendResult = await rpc('sitepass_send_member_link_chat_message_v1', {
              p_room_id: String(target.roomId || '').trim(),
              p_message_text: body,
              p_idempotency_key: state.bulkRoomIdempotencyKeys[targetKey]
            });
            if (!sendResult || sendResult.ok !== true) {
              throw new Error('메시지 전송 결과를 확인하지 못했습니다.');
            }
            sentCount += 1;
          } catch (roomSendError) {
            failures.push({
              ownerMemberUuid: bulkTargetOwnerId(target),
              roomId: String(target.roomId || ''),
              error: friendlyError(roomSendError)
            });
          }
        }
        result = {
          ok: failures.length === 0,
          targetCount: sentCount,
          failedCount: failures.length,
          failures: failures,
          source: 'equipment_archive_linked_in_plus_room_rpc'
        };
        if (failures.length) {
          state.bulkResult = result;
          state.bulkError = sentCount + '명 전송 완료 · ' + failures.length + '명 전송 실패. 다시 누르면 성공한 방은 멱등 처리되고 실패한 방만 재시도됩니다.';
          return false;
        }
      }

      state.bulkResult = result;
      state.bulkSelectedOwnerIds = {};
      state.bulkRoomIdempotencyKeys = {};
      state.bulkBatchIdempotencyKey = '';
      state.bulkMessage = '';
      await refresh(true);
      await refreshBulkTargets(true);
      alert(selectedOwnerIds.length + '명의 연동 소유회원 개인채팅방으로 메시지를 보냈습니다.');
      state.bulkSendOpen = false;
    } catch (error) {
      state.bulkError = friendlyError(error);
    } finally {
      state.bulkSending = false;
      renderBulkSendCard();
      renderBulkSendModal();
    }
    return false;
  }

  function requestGroupDisplaySignature(group) {
    var status = String(group && group.groupStatus || 'pending');
    if (status !== 'accepted') return '';

    var items = Array.isArray(group && group.items)
      ? group.items
      : [];
    var keys = items
      .map(function (item) {
        return String(
          item && (
            item.equipmentId ||
            item.equipmentNo ||
            ''
          ) || ''
        ).trim();
      })
      .filter(Boolean)
      .sort();

    if (!keys.length) return '';
    return status + '|' + keys.join('|');
  }

  function visibleRequestGroups(groups) {
    var seen = {};
    return (Array.isArray(groups) ? groups : [])
      .filter(function (group) {
        var signature = requestGroupDisplaySignature(group);
        if (!signature) return true;
        if (seen[signature]) return false;
        seen[signature] = true;
        return true;
      });
  }

  function renderMemberRoomList() {
    if (!ensureUi()) return;
    var pushApi = roomPushApiV595();
    if (pushApi && typeof pushApi.refresh === 'function') pushApi.refresh(false);

    var section = byId('sp566MemberChatSection');
    var list = byId('sp566MemberRoomList');
    var label = byId('sp566MemberPendingLabel');
    if (!section || !list) return;

    if (!isMemberMode()) {
      section.classList.add('hidden');
      list.innerHTML = '';
      renderBulkSendCard();
      return;
    }

    if (state.listLoading && !state.list) {
      /* v614: 최초 자격 판정이 끝나기 전에는 회원채팅 섹션 전체를 숨겨 헤더 버튼이 뒤늦게 붙는 인상을 없앤다. */
      section.classList.add('hidden');
      list.innerHTML = '';
      renderBulkSendCard();
      return;
    }

    if (state.listError && !state.list) {
      section.classList.remove('hidden');
      list.innerHTML =
        '<div class="sp566-member-list-status">회원연동채팅을 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</div>';
      renderBulkSendCard();
      return;
    }

    if (state.list && state.bulkTargetsResolved !== true) {
      /* v614: 목록 응답만 먼저 도착해도 자격 판정 전 화면을 노출하지 않는다. */
      section.classList.add('hidden');
      list.innerHTML = '';
      renderBulkSendCard();
      return;
    }

    var roomRows = orderedRoomRows();
    if (!roomRows.length) {
      section.classList.add('hidden');
      list.innerHTML = '';
      renderBulkSendCard();
      return;
    }

    var incomingCount = Number(
      state.list.pendingIncomingEquipmentCount || 0
    );
    var outgoingCount = Number(
      state.list.pendingOutgoingEquipmentCount || 0
    );
    if (label) {
      label.textContent =
        incomingCount > 0
          ? '받은 요청 ' + incomingCount + '대'
          : outgoingCount > 0
            ? '보낸 요청 ' + outgoingCount + '대'
            : '대화 중';
    }

    section.classList.remove('hidden');
    list.innerHTML = roomRows
      .map(function (room) {
        var incoming = pendingEquipmentCount(
          pendingIncomingGroups(room)
        );
        var outgoing = pendingEquipmentCount(
          pendingOutgoingGroups(room)
        );
        var unread = Number(room.unreadCount || 0);
        var equipmentText = roomActiveEquipmentLabel(room);
        var previewText = String(
          room.lastMessageText ||
            '회원 연동 대화를 확인해주세요.'
        );
        var statusText =
          incoming > 0
            ? '받은 요청 ' + incoming + '대'
            : outgoing > 0
              ? '보낸 요청 ' + outgoing + '대'
              : room.chatWritable
                ? ''
                : '읽기 전용';
        var contentParts = [];
        if (statusText) contentParts.push(statusText);
        if (previewText) contentParts.push(previewText);
        var contentText = contentParts.join(' · ');
        var noticeOn = memberRoomNoticeOnV592(room.roomId);
        var metaText = unread > 0
          ? '안 읽음 ' + (unread > 99 ? '99+' : unread) + '개'
          : (formatTime(room.lastMessageAt) || '모두 읽음');
        var displayName = memberDisplayNameV608(room);
        var memberEquipmentLine = displayName + (equipmentText ? ' · ' + equipmentText : '');
        return (
          '<button type="button" class="sp566-member-room-button sp592-member-room-grid sp595-room-grid" onclick="return window.SitePassMemberLinkChatV566.openRoom(\'' +
          attr(room.roomId || '') +
          '\')">' +
            '<span class="sp592-member-room-ident">' +
              '<span class="sp566-member-room-icon">👤</span>' +
              '<span class="sp594-member-room-ident-copy">' +
                '<b title="' + attr(memberEquipmentLine) + '">' + html(memberEquipmentLine) + '</b>' +
              '</span>' +
            '</span>' +
            '<span class="sp592-member-room-content" title="' + attr(contentText) + '">' +
              html(contentText) +
            '</span>' +
            '<span class="sp566-member-room-meta sp595-room-meta">' +
              memberRoomPushToggleHtmlV595(room.roomId, noticeOn) +
              '<i class="' + (unread > 0 ? 'sp592-member-unread' : '') + '">' +
                html(metaText) +
              '</i>' +
            '</span>' +
          '</button>'
        );
      })
      .join('');
    renderBulkSendCard();
    if (state.bulkSendOpen) renderBulkSendModal();
  }

  window.sitepassGetMemberLinkChatUnreadCount566 = function () {
    return state.list
      ? Math.max(0, Number(state.list.totalUnread || 0))
      : 0;
  };

  function updateBottomUnreadBadge() {
    var button = document.querySelector(
      '#sitepassBottomAppNav button[data-target="contactScreen"]'
    );
    if (!button) return;

    var legacyMemberBadge = button.querySelector(
      '.sp566-member-unread-badge'
    );
    if (legacyMemberBadge) {
      legacyMemberBadge.remove();
    }

    var badge = button.querySelector(
      '.sitepass-bottom-unread-badge'
    );
    if (!badge) {
      badge = document.createElement('i');
      badge.className =
        'sitepass-bottom-unread-badge hidden';
      badge.setAttribute(
        'aria-label',
        '읽지 않은 알림 수'
      );
      button.appendChild(badge);
    }

    var fixedCount =
      typeof window.sitepassGetFixedBottomUnreadCount460 ===
      'function'
        ? Number(
            window.sitepassGetFixedBottomUnreadCount460() || 0
          )
        : 0;
    var memberCount = state.list
      ? Number(state.list.totalUnread || 0)
      : 0;
    var count = Math.max(0, fixedCount + memberCount);

    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.toggle('hidden', count < 1);
    badge.title = '읽지 않은 알림 ' + count + '건';
  }

  function maybeShowHomeModal() {
    if (
      !isMemberMode() ||
      !screenVisible('homeScreen') ||
      state.currentRoomId
    ) {
      return;
    }

    var signature = incomingSignature();
    var room = firstIncomingRoom();
    var modal = byId('sp566LinkRequestModal');
    if (!modal) return;

    if (!signature || !room) {
      modal.classList.add('hidden');
      delete modal.dataset.roomId;
      delete modal.dataset.signature;
      return;
    }

    var dismissed = '';
    try {
      dismissed = String(
        sessionStorage.getItem(DISMISS_KEY) || ''
      );
    } catch (error) {}
    if (dismissed === signature) return;

    var equipmentCount = pendingEquipmentCount(
      pendingIncomingGroups(room)
    );
    var message = byId('sp566LinkRequestModalText');
    if (message) {
      message.innerHTML =
        '<b>' +
        html(
          memberDisplayNameV608(room)
        ) +
        ' 회원</b>이 장비 <b>' +
        html(equipmentCount) +
        '대</b>의 연동 요청을 보냈습니다.<br>채팅방에서 장비를 확인하고 승인하거나 거절할 수 있습니다.';
    }

    modal.dataset.roomId = String(room.roomId || '');
    modal.dataset.signature = signature;
    modal.classList.remove('hidden');
  }

  function dismissHomeModal() {
    var modal = byId('sp566LinkRequestModal');
    if (!modal) return false;
    try {
      sessionStorage.setItem(
        DISMISS_KEY,
        String(modal.dataset.signature || '')
      );
    } catch (error) {}
    modal.classList.add('hidden');
    return false;
  }

  function openHomeRequest() {
    var modal = byId('sp566LinkRequestModal');
    var roomId = String(
      modal && modal.dataset.roomId
        ? modal.dataset.roomId
        : ''
    );
    dismissHomeModal();
    if (!roomId) return false;

    try {
      if (
        typeof window.sitepassBottomNavGo === 'function'
      ) {
        window.sitepassBottomNavGo('contactScreen');
      } else if (
        typeof window.showScreen === 'function'
      ) {
        window.showScreen('contactScreen');
      }
    } catch (error) {}

    setTimeout(function () {
      openRoom(roomId);
    }, 90);
    return false;
  }

  function showMemberRoomPanel(roomId) {
    if (!ensureUi()) return;
    var legacyList = byId('sitepassChatListPanel');
    var legacyRoom = byId('sitepassChatRoomPanel');
    var memberRoom = byId('sp566MemberRoomPanel');
    if (legacyList) {
      legacyList.classList.add('sitepass-chat-hidden');
    }
    if (legacyRoom) {
      legacyRoom.classList.add('sitepass-chat-hidden');
    }
    state.currentRoomId = String(roomId || '');
    if (memberRoom) {
      memberRoom.hidden = false;
      memberRoom.removeAttribute('aria-hidden');
      memberRoom.classList.remove('hidden');
    }
    queueMemberViewportV663(false);
  }

  function showChatListPanels() {
    hideMemberRoomPanelImmediatelyV663();
    var legacyList = byId('sitepassChatListPanel');
    var legacyRoom = byId('sitepassChatRoomPanel');
    if (legacyRoom) {
      legacyRoom.classList.add('sitepass-chat-hidden');
    }
    if (legacyList) {
      legacyList.classList.remove('sitepass-chat-hidden');
    }
    state.currentRoomId = '';
    memberRoomLoadSequenceV758 += 1;
    resetMemberScrollStateV758('', false);
    state.currentRoom = null;
    state.detail = null;
    state.detailLoading = false;
    state.detailError = '';
    revokePendingPreviewUrls(state.pendingFiles);
    state.pendingFiles = [];
    state.attachmentMenuOpen = false;
    state.referencePickerOpen = false;
    state.referenceMode = '';
    state.referenceSelectedEquipmentId = '';
    state.referenceDocuments = [];
    state.referenceError = '';
    state.requestSummaryExpanded = false;
    document.body.classList.remove('sp602-reference-modal-open');
    resetDeleteModeV597();
  }

  function backToList() {
    hideMemberRoomPanelImmediatelyV663();
    showChatListPanels();
    try {
      if (
        typeof window.sitepassBackToChatList460 ===
        'function'
      ) {
        window.sitepassBackToChatList460();
      }
    } catch (error) {}
    refresh(true);
    return false;
  }

  function groupStatusLabel(status) {
    if (status === 'accepted') return '승인됨';
    if (status === 'rejected') return '거절됨';
    if (status === 'cancelled') return '취소됨';
    return '승인 대기';
  }

  function currentVisibleRequestGroups() {
    var detail = state.detail || {};
    return visibleRequestGroups(
      Array.isArray(detail.requestGroups)
        ? detail.requestGroups
        : []
    );
  }

  function currentRequestEquipmentCount() {
    var seen = {};
    var count = 0;
    currentVisibleRequestGroups().forEach(function (group) {
      (Array.isArray(group && group.items) ? group.items : []).forEach(function (item) {
        var key = String(
          item && (
            item.equipmentId ||
            item.equipmentNo ||
            item.equipmentName
          ) || ''
        ).trim();
        if (!key || seen[key]) return;
        seen[key] = true;
        count += 1;
      });
    });
    return count;
  }

  function toggleRequestSummary(event) {
    if (event) {
      try {
        event.preventDefault();
        event.stopPropagation();
      } catch (error) {}
    }
    if (currentRequestEquipmentCount() < 1) return false;
    state.requestSummaryExpanded = state.requestSummaryExpanded !== true;
    renderRoomDetail();
    return false;
  }

  function toggleRequestGroup(requestGroupKey) {
    return toggleRequestSummary();
  }

  function renderRequestGroups() {
    var box = byId('sp566MemberRequestGroups');
    var groups = currentVisibleRequestGroups();
    if (!box) return;
    box.classList.toggle('hidden', !state.requestSummaryExpanded || !groups.length);
    if (!groups.length || !state.requestSummaryExpanded) {
      box.innerHTML = '';
      return;
    }

    box.innerHTML = groups
      .map(function (group) {
        var status = String(group.groupStatus || 'pending');
        var items = Array.isArray(group.items)
          ? group.items
          : [];
        var canRespond =
          group.canRespond === true &&
          status === 'pending';

        return (
          '<article class="sp566-member-request-card sp606-member-request-detail ' +
          attr(status) + '">' +
            '<div class="sp606-member-request-detail-head">' +
              '<b>장비 ' + html(items.length) + '대</b>' +
              '<span class="sp566-member-request-status">' +
                html(groupStatusLabel(status)) +
              '</span>' +
            '</div>' +
            '<div class="sp603-member-request-body">' +
              '<div class="sp566-member-request-items">' +
                items
                  .map(function (item) {
                    return (
                      '<div class="sp566-member-request-item">' +
                        '<span>' +
                          html(item.equipmentName || '장비') +
                        '</span>' +
                        '<span>' +
                          html(item.equipmentNo || '') +
                        '</span>' +
                      '</div>'
                    );
                  })
                  .join('') +
              '</div>' +
              (canRespond
                ? '<div class="sp566-member-request-actions">' +
                    '<button type="button" class="reject" ' +
                      (state.decisionBusy ? 'disabled ' : '') +
                      'onclick="return window.SitePassMemberLinkChatV566.respondGroup(\'' +
                      attr(group.requestGroupId || '') +
                      '\',\'rejected\')">거절</button>' +
                    '<button type="button" class="accept" ' +
                      (state.decisionBusy ? 'disabled ' : '') +
                      'onclick="return window.SitePassMemberLinkChatV566.respondGroup(\'' +
                      attr(group.requestGroupId || '') +
                      '\',\'accepted\')">' +
                      html(items.length) +
                      '대 전체 승인</button>' +
                  '</div>'
                : '') +
            '</div>' +
          '</article>'
        );
      })
      .join('');
  }

  function referenceTypeLabel(type) {
    type = String(type || '');
    if (type === 'equipment_card') return '장비카드';
    if (type === 'document_card') return '서류카드';
    if (type === 'renewal_request') return '서류갱신요청';
    return '장비·서류 카드';
  }

  function referenceTypeIcon(type) {
    type = String(type || '');
    if (type === 'equipment_card') return '🚜';
    if (type === 'renewal_request') return '🔄';
    return '📄';
  }

  function documentTypeLabel(type) {
    var labels = {
      businessLicense: '사업자등록증',
      equipmentRegistration: '장비등록증',
      equipmentInspection: '장비검사증',
      insurancePolicy: '보험증권',
      specSheet: '제원표',
      ndtInspection: '비파괴검사서',
      equipmentLedger: '장비대장',
      otherEquipment: '기타 장비서류'
    };
    return labels[String(type || '')] || '장비서류';
  }

  function formatReferenceDate(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    var date = new Date(raw.length === 10 ? raw + 'T00:00:00' : raw);
    if (Number.isNaN(date.getTime())) return raw;
    return date.getFullYear() + '년 ' + (date.getMonth() + 1) + '월 ' + date.getDate() + '일';
  }

  function referenceExpiryStatus(value) {
    var raw = String(value || '').trim();
    if (!raw) return 'no_expiry';
    var target = new Date(raw.length === 10 ? raw + 'T00:00:00' : raw);
    if (Number.isNaN(target.getTime())) return 'no_expiry';
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    if (targetDay < today) return 'expired';
    if (targetDay === today) return 'expires_today';
    return 'valid';
  }

  function referenceExpiryLabel(status, value) {
    status = String(status || '');
    var dateLabel = formatReferenceDate(value);
    if (status === 'expired') return dateLabel ? '만료 · ' + dateLabel : '만료';
    if (status === 'expires_today') return '오늘 만료';
    if (status === 'valid') return dateLabel ? '만료일 ' + dateLabel : '유효';
    return '만료일 없음';
  }

  function unavailableReferenceLabel(reason) {
    reason = String(reason || '');
    if (reason === 'LINK_REVOKED_OR_NOT_MATCHED') return '연동이 해제된 카드';
    if (reason === 'EQUIPMENT_UNAVAILABLE') return '사용할 수 없는 장비';
    if (reason === 'EQUIPMENT_PAYMENT_OR_SERVICE_REQUIRED') return '결제·서비스 확인 필요';
    if (reason === 'DOCUMENT_NOT_READY') return '서류 재등록 필요';
    return '현재 사용할 수 없음';
  }

  function activeReferenceEquipment() {
    var candidates = [];
    if (state.currentRoom && Array.isArray(state.currentRoom.activeEquipment)) {
      candidates = state.currentRoom.activeEquipment;
    } else if (state.detail && Array.isArray(state.detail.activeEquipment)) {
      candidates = state.detail.activeEquipment;
    }
    var seen = {};
    return candidates.map(function (row) {
      row = row && typeof row === 'object' ? row : {};
      return {
        equipmentId: String(row.equipmentId || row.equipment_id || '').trim(),
        equipmentNo: String(row.equipmentNo || row.equipment_no || '').trim(),
        equipmentName: String(row.equipmentName || row.equipment_name || '장비').trim() || '장비'
      };
    }).filter(function (row) {
      if (!row.equipmentId || seen[row.equipmentId]) return false;
      seen[row.equipmentId] = true;
      return true;
    }).sort(function (a, b) {
      return (a.equipmentNo || a.equipmentName).localeCompare(b.equipmentNo || b.equipmentName, 'ko');
    });
  }

  function normalizeReferenceDocuments(detail) {
    var documents = detail && Array.isArray(detail.documents) ? detail.documents : [];
    return documents.map(function (row) {
      row = row && typeof row === 'object' ? row : {};
      var version = row.current_version && typeof row.current_version === 'object' ? row.current_version : {};
      var expiryDate = String(version.expiry_date || row.expiry_date || '').trim();
      return {
        documentId: String(row.document_id || row.documentId || '').trim(),
        documentType: String(row.document_type || row.documentType || '').trim(),
        documentLabel: documentTypeLabel(row.document_type || row.documentType),
        status: String(row.status || '').trim(),
        versionId: String(version.version_id || row.current_version_id || '').trim(),
        expiryDate: expiryDate,
        expiryStatus: referenceExpiryStatus(expiryDate),
        fileCount: Array.isArray(version.files) ? version.files.length : 0
      };
    }).filter(function (row) {
      return !!row.documentId;
    }).sort(function (a, b) {
      var order = {
        businessLicense: 1,
        equipmentRegistration: 2,
        equipmentInspection: 3,
        insurancePolicy: 4
      };
      return (order[a.documentType] || 99) - (order[b.documentType] || 99) || a.documentLabel.localeCompare(b.documentLabel, 'ko');
    });
  }


  function normalizeRecipientShareEquipmentV751(result) {
    var rows = result && Array.isArray(result.equipment) ? result.equipment : [];
    return rows.map(function (row) {
      row = row && typeof row === 'object' ? row : {};
      return {
        equipmentId: String(row.equipmentId || row.equipment_id || '').trim(),
        equipmentCode: String(row.equipmentCode || row.equipment_code || row.code || '').trim(),
        equipmentNo: String(row.equipmentNo || row.equipment_no || '').trim(),
        equipmentName: String(row.equipmentName || row.equipment_name || '장비').trim() || '장비'
      };
    }).filter(function (row) {
      return !!row.equipmentId;
    });
  }

  async function openRecipientSharePickerV751(event) {
    if (event) {
      try { event.preventDefault(); event.stopPropagation(); } catch (error) {}
    }
    if (
      !state.currentRoomId ||
      !isMemberMode() ||
      state.sendBusy ||
      state.referenceSending ||
      state.referenceLoading
    ) return false;

    state.attachmentMenuOpen = false;
    state.referencePickerOpen = true;
    state.referenceMode = 'recipient_share';
    state.referenceEquipmentRows = [];
    state.referenceSelectedEquipmentId = '';
    state.referenceDocuments = [];
    state.referenceError = '';
    state.referenceContactMessageId = '';
    state.referenceContactName = '';
    state.referenceContactPhone = '';
    state.referenceLoading = true;

    renderAttachmentComposer();
    renderReferencePicker();

    try {
      var result = await rpc(
        'sitepass_list_my_friend_chat_recipient_share_equipment_v1',
        { p_room_id: state.currentRoomId }
      );
      if (
        !result ||
        result.ok !== true ||
        String(result.roomId || '') !== String(state.currentRoomId || '')
      ) {
        throw new Error('담당자 링크 장비 목록 결과를 확인하지 못했습니다.');
      }
      state.referenceEquipmentRows =
        normalizeRecipientShareEquipmentV751(result);
    } catch (error) {
      state.referenceError = friendlyError(error);
    } finally {
      state.referenceLoading = false;
      renderReferencePicker();
    }
    return false;
  }


  // SitePass v23.7.761 R14
  // 받은 연락처 카드 전용: 현재 친구채팅에 메시지를 만들지 않고
  // 연락처 snapshot의 전화번호로 Recipient Link SMS 작성창만 연다.
  async function openContactRecipientSharePickerV761(event, messageId) {
    if (event) {
      try { event.preventDefault(); event.stopPropagation(); } catch (error) {}
    }

    if (
      !state.currentRoomId ||
      !isMemberMode() ||
      state.sendBusy ||
      state.referenceSending ||
      state.referenceLoading
    ) return false;

    var contact =
      contactReferenceByMessageId(messageId);

    if (
      !contact ||
      contact.isMine === true ||
      !String(contact.phone || '').trim()
    ) {
      alert('받은 연락처 정보를 확인하지 못했습니다.');
      return false;
    }

    var phoneUri =
      contactPhoneUriValue(contact.phone);

    if (!phoneUri) {
      alert('전화번호 형식을 확인해주세요.');
      return false;
    }

    state.attachmentMenuOpen = false;
    state.referencePickerOpen = true;
    state.referenceMode = 'recipient_share_contact_sms';
    state.referenceEquipmentRows = [];
    state.referenceSelectedEquipmentId = '';
    state.referenceDocuments = [];
    state.referenceError = '';
    state.referenceContactMessageId = String(messageId || '').trim();
    state.referenceContactName = String(contact.name || '').trim();
    state.referenceContactPhone = String(contact.phone || '').trim();
    state.referenceLoading = true;

    renderAttachmentComposer();
    renderReferencePicker();

    try {
      var result = await rpc(
        'sitepass_list_my_friend_chat_recipient_share_equipment_v1',
        { p_room_id: state.currentRoomId }
      );

      if (
        !result ||
        result.ok !== true ||
        String(result.roomId || '') !== String(state.currentRoomId || '')
      ) {
        throw new Error('장비 링크 공유 목록 결과를 확인하지 못했습니다.');
      }

      state.referenceEquipmentRows =
        normalizeRecipientShareEquipmentV751(result);
    } catch (error) {
      state.referenceError = friendlyError(error);
    } finally {
      state.referenceLoading = false;
      renderReferencePicker();
    }

    return false;
  }

  async function sendContactRecipientShareSmsV761(event, equipmentId) {
    if (event) {
      try { event.preventDefault(); event.stopPropagation(); } catch (error) {}
    }

    equipmentId = String(equipmentId || '').trim();

    if (
      !equipmentId ||
      state.referenceMode !== 'recipient_share_contact_sms' ||
      !state.referenceContactPhone ||
      state.referenceSending
    ) return false;

    var selectedRow = null;
    var equipmentRows =
      Array.isArray(state.referenceEquipmentRows)
        ? state.referenceEquipmentRows
        : [];

    for (var i = 0; i < equipmentRows.length; i += 1) {
      if (String(equipmentRows[i].equipmentId || '') === equipmentId) {
        selectedRow = equipmentRows[i];
        break;
      }
    }

    if (!selectedRow) {
      state.referenceError = '선택한 장비 정보를 확인하지 못했습니다.';
      renderReferencePicker();
      return false;
    }

    state.referenceSending = true;
    state.referenceError = '';
    renderReferencePicker();

    var opened = false;

    try {
      var bridge =
        window.sitePassOpenContactRecipientSmsV761;

      if (typeof bridge !== 'function') {
        throw new Error(
          '문자 장비 링크 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.'
        );
      }

      var result =
        await bridge(
          equipmentId,
          String(selectedRow.equipmentCode || ''),
          selectedRow,
          {
            name:String(state.referenceContactName || ''),
            phone:String(state.referenceContactPhone || '')
          }
        );

      if (!result || result.ok !== true) {
        throw new Error(
          String(
            result && result.message ||
            '문자 장비 링크를 준비하지 못했습니다.'
          )
        );
      }

      opened = true;
    } catch (error) {
      state.referenceError = friendlyError(error);
    } finally {
      state.referenceSending = false;
    }

    if (!opened) {
      renderReferencePicker();
      return false;
    }

    state.referencePickerOpen = false;
    state.referenceMode = '';
    state.referenceEquipmentRows = [];
    state.referenceSelectedEquipmentId = '';
    state.referenceDocuments = [];
    state.referenceError = '';
    state.referenceContactMessageId = '';
    state.referenceContactName = '';
    state.referenceContactPhone = '';

    renderReferencePicker();
    return false;
  }


  async function sendRecipientShareMessageV752(event, equipmentId) {
    if (event) {
      try { event.preventDefault(); event.stopPropagation(); } catch (error) {}
    }

    equipmentId = String(equipmentId || '').trim();

    if (
      !equipmentId ||
      !state.currentRoomId ||
      !isMemberMode() ||
      state.referenceSending
    ) return false;
    var recipientRoomIdV758 = String(state.currentRoomId || '');

    var selectedRow = null;
    var equipmentRows =
      Array.isArray(state.referenceEquipmentRows)
        ? state.referenceEquipmentRows
        : [];

    for (var i = 0; i < equipmentRows.length; i += 1) {
      if (String(equipmentRows[i].equipmentId || '') === equipmentId) {
        selectedRow = equipmentRows[i];
        break;
      }
    }

    state.referenceSending = true;
    state.referenceError = '';
    renderReferencePicker();

    var sent = false;

    try {
      var bridge =
        window.sitePassPrepareRecipientShareForChatV752;

      if (typeof bridge !== 'function') {
        throw new Error(
          '담당자 링크 준비 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.'
        );
      }

      var prepared =
        await bridge(
          equipmentId,
          selectedRow
            ? String(selectedRow.equipmentCode || '')
            : '',
          selectedRow || null
        );

      if (
        !prepared ||
        prepared.ok !== true ||
        !prepared.recipientToken
      ) {
        throw new Error(
          String(
            prepared && prepared.message ||
            '담당자 링크를 준비하지 못했습니다.'
          )
        );
      }

      var result = await rpc(
        'sitepass_send_my_friend_chat_recipient_share_v2',
        {
          p_room_id: recipientRoomIdV758,
          p_equipment_id: equipmentId,
          p_recipient_token: String(prepared.recipientToken || ''),
          p_idempotency_key: newIdempotencyKey()
        }
      );

      if (!result || result.ok !== true) {
        throw new Error(
          '담당자 링크 채팅 전송 결과를 확인하지 못했습니다.'
        );
      }

      sent = true;
    } catch (error) {
      state.referenceError = friendlyError(error);
    } finally {
      state.referenceSending = false;
    }

    if (!sent) {
      renderReferencePicker();
      return false;
    }

    requestMemberLatestV758(recipientRoomIdV758);

    state.referencePickerOpen = false;
    state.referenceMode = '';
    state.referenceEquipmentRows = [];
    state.referenceSelectedEquipmentId = '';
    state.referenceDocuments = [];
    state.referenceError = '';

    renderReferencePicker();

    try {
      if (String(state.currentRoomId || '') === recipientRoomIdV758) {
        await loadRoom(recipientRoomIdV758);
        await refresh(true);
      }
    } catch (error) {
      console.warn(
        'SitePass 담당자 링크 채팅 전송 후 새로고침 실패:',
        error
      );
    }

    return false;
  }


  function renderReferencePicker() {
    var modal = byId('sp602ReferencePickerModal');
    var title = byId('sp602ReferencePickerTitle');
    var desc = byId('sp602ReferencePickerDesc');
    var body = byId('sp602ReferencePickerBody');
    if (!modal || !body) return;

    modal.classList.toggle('hidden', !state.referencePickerOpen);
    document.body.classList.toggle('sp602-reference-modal-open', state.referencePickerOpen);
    if (!state.referencePickerOpen) return;

    var mode = String(state.referenceMode || '');
    var equipmentRows = Array.isArray(state.referenceEquipmentRows) ? state.referenceEquipmentRows : [];

    if (mode === 'recipient_share_contact_sms') {
      if (title) title.textContent = '장비 링크 공유';
      if (desc) {
        var contactLabel =
          [state.referenceContactName, state.referenceContactPhone]
            .filter(Boolean)
            .join(' · ');
        desc.textContent =
          (contactLabel ? contactLabel + ' · ' : '') +
          '문자 작성창으로 보낼 장비 링크를 선택해주세요.';
      }

      if (state.referenceLoading) {
        body.innerHTML = '<div class="sp602-reference-status">장비 링크 목록을 불러오고 있습니다.</div>';
        return;
      }
      if (state.referenceError) {
        body.innerHTML = '<div class="sp602-reference-status error">' + html(state.referenceError) + '</div>';
        return;
      }
      if (!equipmentRows.length) {
        body.innerHTML = '<div class="sp602-reference-status">현재 공유할 수 있는 장비가 없습니다.</div>';
        return;
      }

      body.innerHTML =
        '<div class="sp602-reference-choice-list">' +
        equipmentRows.map(function (row) {
          return (
            '<button type="button" class="sp602-reference-choice" onclick="return window.SitePassMemberLinkChatV566.sendContactRecipientShareSms(event,\'' +
              attr(row.equipmentId) +
            '\')" ' +
              (state.referenceSending ? 'disabled' : '') +
            '>' +
              '<span class="sp602-reference-choice-icon">🔗</span>' +
              '<span class="sp602-reference-choice-copy"><b>' +
                html(row.equipmentNo || '장비번호 없음') +
              '</b><small>' +
                html(row.equipmentName || '장비') +
                ' · 담당자 링크</small></span>' +
              '<em>' +
                html(state.referenceSending ? '준비 중' : '문자로 공유') +
              '</em>' +
            '</button>'
          );
        }).join('') +
        '</div>';
      return;
    }

    if (mode === 'recipient_share') {
      if (title) title.textContent = '내 장비·서류 링크 보내기';
      if (desc) desc.textContent = '담당자에게 전달할 SitePass 링크의 장비를 선택해주세요.';

      if (state.referenceLoading) {
        body.innerHTML = '<div class="sp602-reference-status">담당자 링크 장비를 불러오고 있습니다.</div>';
        return;
      }
      if (state.referenceError) {
        body.innerHTML = '<div class="sp602-reference-status error">' + html(state.referenceError) + '</div>';
        return;
      }
      if (!equipmentRows.length) {
        body.innerHTML = '<div class="sp602-reference-status">현재 채팅으로 보낼 수 있는 내 장비가 없습니다.</div>';
        return;
      }

      body.innerHTML =
        '<div class="sp602-reference-choice-list">' +
        equipmentRows.map(function (row) {
          return (
            '<button type="button" class="sp602-reference-choice" onclick="return window.SitePassMemberLinkChatV566.sendRecipientShareMessage(event,\'' +
              attr(row.equipmentId) +
            '\')" ' +
              (state.referenceSending ? 'disabled' : '') +
            '>' +
              '<span class="sp602-reference-choice-icon">🔗</span>' +
              '<span class="sp602-reference-choice-copy"><b>' +
                html(row.equipmentNo || '장비번호 없음') +
              '</b><small>' +
                html(row.equipmentName || '장비') +
                ' · 담당자 링크</small></span>' +
              '<em>' +
                html(state.referenceSending ? '보내는 중' : '링크 보내기') +
              '</em>' +
            '</button>'
          );
        }).join('') +
        '</div>';
      return;
    }

    if (title) title.textContent = referenceTypeLabel(mode) + ' 보내기';
    if (desc) {
      desc.textContent = mode === 'equipment_card'
        ? '채팅방에 연동된 장비를 선택해주세요.'
        : (state.referenceSelectedEquipmentId ? '보낼 서류를 선택해주세요.' : '먼저 장비를 선택해주세요.');
    }

    if (state.referenceLoading) {
      body.innerHTML = '<div class="sp602-reference-status">장비·서류 정보를 불러오고 있습니다.</div>';
      return;
    }
    if (state.referenceError) {
      body.innerHTML = '<div class="sp602-reference-status error">' + html(state.referenceError) + '</div>';
      return;
    }
    if (!equipmentRows.length) {
      body.innerHTML = '<div class="sp602-reference-status">현재 이 채팅방에 보낼 수 있는 연동 장비가 없습니다.</div>';
      return;
    }

    if (mode === 'equipment_card' || !state.referenceSelectedEquipmentId) {
      body.innerHTML = '<div class="sp602-reference-choice-list">' + equipmentRows.map(function (row) {
        var action = mode === 'equipment_card'
          ? 'sendReferenceMessage(event,\'equipment_card\',\'' + attr(row.equipmentId) + '\',\'\')'
          : 'selectReferenceEquipment(event,\'' + attr(row.equipmentId) + '\')';
        return '<button type="button" class="sp602-reference-choice" onclick="return window.SitePassMemberLinkChatV566.' + action + '" ' + (state.referenceSending ? 'disabled' : '') + '>' +
          '<span class="sp602-reference-choice-icon">' + html(mode === 'equipment_card' ? '🚜' : '📁') + '</span>' +
          '<span class="sp602-reference-choice-copy"><b>' + html(row.equipmentNo || '장비번호 없음') + '</b><small>' + html(row.equipmentName || '장비') + '</small></span>' +
          '<em>' + html(mode === 'equipment_card' ? (state.referenceSending ? '보내는 중' : '보내기') : '서류 선택') + '</em>' +
        '</button>';
      }).join('') + '</div>';
      return;
    }

    var selected = equipmentRows.find(function (row) {
      return row.equipmentId === state.referenceSelectedEquipmentId;
    }) || {};
    var docs = Array.isArray(state.referenceDocuments) ? state.referenceDocuments : [];
    body.innerHTML =
      '<button type="button" class="sp602-reference-back" onclick="return window.SitePassMemberLinkChatV566.backReferenceEquipment(event)">‹ 장비 다시 선택</button>' +
      '<div class="sp602-reference-selected-equipment"><b>' + html(selected.equipmentNo || '장비번호 없음') + '</b><span>' + html(selected.equipmentName || '장비') + '</span></div>' +
      (docs.length
        ? '<div class="sp602-reference-choice-list document">' + docs.map(function (doc) {
            var ready = doc.status === 'verified' && !!doc.versionId && doc.fileCount > 0;
            var expiryClass = doc.expiryStatus === 'expired' ? ' expired' : (doc.expiryStatus === 'expires_today' ? ' today' : '');
            return '<button type="button" class="sp602-reference-choice document' + expiryClass + '" onclick="return window.SitePassMemberLinkChatV566.sendReferenceMessage(event,\'' + attr(mode) + '\',\'\',\'' + attr(doc.documentId) + '\')" ' + ((!ready || state.referenceSending) ? 'disabled' : '') + '>' +
              '<span class="sp602-reference-choice-icon">' + html(mode === 'renewal_request' ? '🔄' : '📄') + '</span>' +
              '<span class="sp602-reference-choice-copy"><b>' + html(doc.documentLabel) + '</b><small>' + html(referenceExpiryLabel(doc.expiryStatus, doc.expiryDate)) + (ready ? '' : ' · 전송 불가') + '</small></span>' +
              '<em>' + html(state.referenceSending ? '보내는 중' : (mode === 'renewal_request' ? '갱신 요청' : '보내기')) + '</em>' +
            '</button>';
          }).join('') + '</div>'
        : '<div class="sp602-reference-status">현재 보낼 수 있는 등록 서류가 없습니다.</div>');
  }

  function openReferencePicker(event, mode) {
    if (event) {
      try { event.preventDefault(); event.stopPropagation(); } catch (error) {}
    }
    mode = String(mode || '');
    if (['equipment_card', 'document_card', 'renewal_request'].indexOf(mode) < 0) return false;
    if (!state.currentRoomId || !isMemberMode() || state.sendBusy || state.referenceSending) return false;
    state.referenceMode = mode;
    state.referenceEquipmentRows = activeReferenceEquipment();
    state.referenceSelectedEquipmentId = '';
    state.referenceDocuments = [];
    state.referenceError = '';
    state.referenceLoading = false;
    state.referencePickerOpen = true;
    state.attachmentMenuOpen = false;
    renderAttachmentComposer();
    renderReferencePicker();
    return false;
  }

  function closeReferencePicker(event) {
    if (event) {
      try { event.preventDefault(); event.stopPropagation(); } catch (error) {}
    }
    if (state.referenceSending) return false;
    state.referencePickerOpen = false;
    state.referenceMode = '';
    state.referenceSelectedEquipmentId = '';
    state.referenceDocuments = [];
    state.referenceError = '';
    state.referenceContactMessageId = '';
    state.referenceContactName = '';
    state.referenceContactPhone = '';
    renderReferencePicker();
    return false;
  }

  async function selectReferenceEquipment(event, equipmentId) {
    if (event) {
      try { event.preventDefault(); event.stopPropagation(); } catch (error) {}
    }
    equipmentId = String(equipmentId || '').trim();
    if (!equipmentId || state.referenceLoading || state.referenceSending) return false;
    state.referenceSelectedEquipmentId = equipmentId;
    state.referenceDocuments = [];
    state.referenceError = '';
    state.referenceLoading = true;
    renderReferencePicker();
    try {
      var detail = await rpc('sitepass_get_equipment_detail_v1', {
        p_equipment_id: equipmentId
      });
      if (!detail || !detail.equipment || String(detail.equipment.equipment_id || '') !== equipmentId) {
        throw new Error('장비 서류 결과를 확인하지 못했습니다.');
      }
      state.referenceDocuments = normalizeReferenceDocuments(detail);
    } catch (error) {
      state.referenceError = friendlyError(error);
    } finally {
      state.referenceLoading = false;
      renderReferencePicker();
    }
    return false;
  }

  function backReferenceEquipment(event) {
    if (event) {
      try { event.preventDefault(); event.stopPropagation(); } catch (error) {}
    }
    if (state.referenceSending) return false;
    state.referenceSelectedEquipmentId = '';
    state.referenceDocuments = [];
    state.referenceError = '';
    renderReferencePicker();
    return false;
  }

  async function sendReferenceMessage(event, type, equipmentId, documentId) {
    if (event) {
      try { event.preventDefault(); event.stopPropagation(); } catch (error) {}
    }
    type = String(type || '');
    equipmentId = String(equipmentId || '').trim();
    documentId = String(documentId || '').trim();
    if (state.referenceSending || !state.currentRoomId || !isMemberMode()) return false;
    var referenceRoomIdV758 = String(state.currentRoomId || '');
    state.referenceSending = true;
    state.referenceError = '';
    renderReferencePicker();
    var sent = false;
    try {
      var result = await rpc('sitepass_send_member_link_chat_reference_v1', {
        p_room_id: referenceRoomIdV758,
        p_message_type: type,
        p_equipment_id: type === 'equipment_card' ? equipmentId : null,
        p_document_id: type === 'equipment_card' ? null : documentId,
        p_message_text: null,
        p_idempotency_key: newIdempotencyKey()
      });
      if (!result || result.ok !== true) throw new Error('카드 전송 결과를 확인하지 못했습니다.');
      sent = true;
    } catch (error) {
      state.referenceError = friendlyError(error);
    } finally {
      state.referenceSending = false;
    }
    if (!sent) {
      renderReferencePicker();
      return false;
    }
    requestMemberLatestV758(referenceRoomIdV758);
    state.referencePickerOpen = false;
    state.referenceMode = '';
    state.referenceSelectedEquipmentId = '';
    state.referenceDocuments = [];
    state.referenceError = '';
    renderReferencePicker();
    try {
      if (String(state.currentRoomId || '') === referenceRoomIdV758) {
        await loadRoom(referenceRoomIdV758);
        await refresh(true);
      }
    } catch (error) {
      console.warn('SitePass 참조카드 전송 후 새로고침 실패:', error);
    }
    return false;
  }

  function renderReferenceMessageCard(message, reference) {
    reference = reference && typeof reference === 'object' ? reference : null;
    var type = String(message && message.messageType || '');
    if (!reference) {
      return '<article class="sp602-reference-message unavailable"><header><span>' + html(referenceTypeIcon(type)) + '</span><div><b>' + html(referenceTypeLabel(type)) + '</b><small>카드 정보를 불러오지 못했습니다.</small></div><em>확인 필요</em></header></article>';
    }
    var snapshot = reference.snapshot && typeof reference.snapshot === 'object' ? reference.snapshot : {};
    var current = reference.current && typeof reference.current === 'object' ? reference.current : {};
    var available = reference.available === true;
    var reason = String(reference.unavailableReason || '');
    var expiryStatus = String(current.expiryStatus || snapshot.expiryStatus || 'no_expiry');
    var expiryDate = current.expiryDate || snapshot.expiryDate || '';
    var equipmentNo = current.equipmentNo || snapshot.equipmentNo || '장비번호 없음';
    var equipmentName = current.equipmentName || snapshot.equipmentName || '장비';
    var documentLabel = current.documentLabel || snapshot.documentLabel || '';
    var versionChanged = reference.documentVersionChanged === true;
    var title = snapshot.title || referenceTypeLabel(type);
    var statusLabel = available ? '사용 가능' : unavailableReferenceLabel(reason);
    var statusClass = available ? ' available' : ' unavailable';
    if (available && expiryStatus === 'expired') {
      statusLabel = '만료 · 갱신 필요';
      statusClass = ' expired';
    } else if (available && expiryStatus === 'expires_today') {
      statusLabel = '오늘 만료';
      statusClass = ' today';
    } else if (available && versionChanged) {
      statusLabel = '새 버전 등록됨';
      statusClass = ' changed';
    }
    var meta = [equipmentNo, equipmentName];
    if (documentLabel) meta.push(documentLabel);
    var detail = type === 'equipment_card'
      ? '채팅방에 연동된 장비 정보'
      : referenceExpiryLabel(expiryStatus, expiryDate);
    return '<article class="sp602-reference-message' + statusClass + '">' +
      '<header><span class="sp602-reference-message-icon">' + html(referenceTypeIcon(type)) + '</span>' +
        '<div><b>' + html(title) + '</b><small>' + html(meta.filter(Boolean).join(' · ')) + '</small></div>' +
        '<em>' + html(statusLabel) + '</em></header>' +
      '<footer><span>' + html(detail) + '</span><small>발송 시점 정보 보존 · 현재 상태 자동 확인</small></footer>' +
    '</article>';
  }

  // SitePass v23.7.759 R14 - received contact/link card share shortcuts.
  function renderContactMessageCard(message, reference) {
    reference =
      reference && typeof reference === 'object'
        ? reference
        : {};

    var snapshot =
      reference.snapshot &&
      typeof reference.snapshot === 'object'
        ? reference.snapshot
        : {};

    var name =
      String(
        snapshot.contactName || '연락처'
      ).trim() || '연락처';

    var phone =
      String(
        snapshot.contactPhone || ''
      ).trim();

    var messageId =
      messageIdV597(message);

    var receivedContactV759 =
      !!message && message.isMine !== true;

    if (!phone) {
      return (
        '<article class="sp602-reference-message unavailable">' +
          '<header>' +
            '<span class="sp602-reference-message-icon">📇</span>' +
            '<div><b>' +
              html(name) +
            '</b><small>전화번호를 확인하지 못했습니다.</small></div>' +
            '<em>확인 필요</em>' +
          '</header>' +
        '</article>'
      );
    }

    return (
      '<article class="sp602-reference-message sp746-contact-card">' +
        '<header>' +
          '<span class="sp602-reference-message-icon">📇</span>' +
          '<div><b>' +
            html(name) +
          '</b><small>' +
            html(phone) +
          '</small></div>' +
          '<em>연락처</em>' +
        '</header>' +
        '<footer class="sp746-contact-footer">' +
          '<span class="sp746-contact-actions">' +
            '<button type="button" onclick="return window.SitePassMemberLinkChatV566.contactAction(event,\'' +
              attr(messageId) +
            '\',\'call\')">전화</button>' +
            '<i aria-hidden="true">·</i>' +
            '<button type="button" onclick="return window.SitePassMemberLinkChatV566.contactAction(event,\'' +
              attr(messageId) +
            '\',\'sms\')">문자</button>' +
            '<i aria-hidden="true">·</i>' +
            '<button type="button" onclick="return window.SitePassMemberLinkChatV566.contactAction(event,\'' +
              attr(messageId) +
            '\',\'save\')">연락처 저장</button>' +
            (
              receivedContactV759
                ? (
                    '<i aria-hidden="true">·</i>' +
                    '<button type="button" onclick="return window.SitePassMemberLinkChatV566.openContactRecipientSharePicker(event,\'' +
                      attr(messageId) +
                    '\')">장비 링크 공유</button>'
                  )
                : ''
            ) +
          '</span>' +
        '</footer>' +
      '</article>'
    );
  }


  function recipientShareByMessageIdV751(messageId) {
    messageId = String(messageId || '').trim();
    var messages =
      state.detail && Array.isArray(state.detail.messages)
        ? state.detail.messages
        : [];

    for (var i = 0; i < messages.length; i += 1) {
      if (messageIdV597(messages[i]) !== messageId) continue;
      var share =
        messages[i].recipientShare &&
        typeof messages[i].recipientShare === 'object'
          ? messages[i].recipientShare
          : null;
      if (share) return share;
    }
    return null;
  }

  function recipientShareLinkV751(messageId) {
    var share = recipientShareByMessageIdV751(messageId);
    if (!share || share.available !== true) return '';

    var rawToken = String(share.recipientToken || '').trim();
    if (!rawToken) return '';

    var recipientView = window.SitePassShareRecipientView;
    if (
      !recipientView ||
      typeof recipientView.makeRecipientShareLink !== 'function'
    ) return '';

    return String(
      recipientView.makeRecipientShareLink(rawToken, '') || ''
    ).trim();
  }

  function recipientShareExpiryLabelV751(value) {
    var date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return '';
    try {
      return date.toLocaleString(
        'ko-KR',
        {
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }
      );
    } catch (error) {
      return (date.getMonth() + 1) + '월 ' + date.getDate() + '일 ' +
        formatTime(date.toISOString());
    }
  }

  var recipientShareNativeBusyV765 = false;

  function getSitePassNativeSharePluginV765() {
    try {
      return (
        window.Capacitor &&
        window.Capacitor.Plugins &&
        window.Capacitor.Plugins.SitePassShareNative
      ) || null;
    } catch (error) {
      return null;
    }
  }

  function isSitePassNativeAndroidV765() {
    try {
      var capacitorV765 =
        window.Capacitor &&
        typeof window.Capacitor === 'object'
          ? window.Capacitor
          : null;

      return !!(
        capacitorV765 &&
        typeof capacitorV765.isNativePlatform === 'function' &&
        capacitorV765.isNativePlatform() &&
        typeof capacitorV765.getPlatform === 'function' &&
        String(capacitorV765.getPlatform() || '').toLowerCase() === 'android'
      );
    } catch (error) {
      return false;
    }
  }

  var RECIPIENT_RETURN_KEY_PREFIX_V766 =
    'sitepass_member_chat_recipient_return_v766:';
  var RECIPIENT_RETURN_MAX_AGE_MS_V766 =
    2 * 60 * 60 * 1000;
  var recipientReturnArmedThisContextV766 = false;

  function recipientReturnStorageKeyV766() {
    return (
      RECIPIENT_RETURN_KEY_PREFIX_V766 +
      currentMemberDeleteKeyV597()
    );
  }

  function clearRecipientReturnV766() {
    try {
      sessionStorage.removeItem(
        recipientReturnStorageKeyV766()
      );
    } catch (error) {}
  }

  function clearAllRecipientReturnV766() {
    try {
      var keysV766 = [];
      for (
        var indexV766 = 0;
        indexV766 < sessionStorage.length;
        indexV766 += 1
      ) {
        var keyV766 =
          String(
            sessionStorage.key(indexV766) ||
            ''
          );
        if (
          keyV766.indexOf(
            RECIPIENT_RETURN_KEY_PREFIX_V766
          ) === 0
        ) {
          keysV766.push(keyV766);
        }
      }
      keysV766.forEach(function (keyV766) {
        sessionStorage.removeItem(keyV766);
      });
    } catch (error) {}
  }

  function recipientReturnNavigationTypeV766() {
    try {
      if (
        window.performance &&
        typeof window.performance.getEntriesByType ===
          'function'
      ) {
        var entriesV766 =
          window.performance.getEntriesByType(
            'navigation'
          );
        if (
          Array.isArray(entriesV766) &&
          entriesV766[0] &&
          entriesV766[0].type
        ) {
          return String(
            entriesV766[0].type || ''
          );
        }
      }
    } catch (error) {}

    try {
      if (
        window.performance &&
        window.performance.navigation &&
        Number(
          window.performance.navigation.type
        ) === 2
      ) {
        return 'back_forward';
      }
    } catch (error) {}

    return '';
  }

  var RECIPIENT_RETURN_HOLD_CLASS_V772 =
    'sitepass-recipient-return-hold-v772';
  var RECIPIENT_RETURN_HOLD_STYLE_ID_V772 =
    'sitepassRecipientReturnHoldStyleV772';
  var recipientReturnHoldArmedV772 = false;

  function readRecipientReturnMarkerV772(
    requireBackForwardV772
  ) {
    if (
      requireBackForwardV772 === true &&
      recipientReturnNavigationTypeV766() !==
        'back_forward'
    ) {
      return null;
    }

    var rawV772 = '';
    try {
      rawV772 = String(
        sessionStorage.getItem(
          recipientReturnStorageKeyV766()
        ) || ''
      );
    } catch (error) {
      return null;
    }

    if (!rawV772) return null;

    var savedV772 = null;
    try {
      savedV772 = JSON.parse(rawV772);
    } catch (error) {
      return null;
    }

    var roomIdV772 =
      String(
        savedV772 &&
        savedV772.roomId ||
        ''
      ).trim();
    var createdAtV772 =
      Number(
        savedV772 &&
        savedV772.createdAt
      );
    var nowV772 = Date.now();

    if (
      !roomIdV772 ||
      !Number.isFinite(createdAtV772) ||
      createdAtV772 <= 0 ||
      createdAtV772 > nowV772 + 300000 ||
      nowV772 - createdAtV772 >
        RECIPIENT_RETURN_MAX_AGE_MS_V766
    ) {
      return null;
    }

    return {
      roomId: roomIdV772,
      createdAt: createdAtV772
    };
  }

  function validRecipientReturnMarkerV770() {
    return readRecipientReturnMarkerV772(true);
  }

  function recipientReturnRestoreCandidateV770() {
    return !!(
      !state.currentRoomId &&
      screenVisible('contactScreen') &&
      validRecipientReturnMarkerV770()
    );
  }

  function ensureRecipientReturnHoldStyleV772() {
    var rootV772 = document.documentElement;
    if (!rootV772) return false;

    var styleV772 =
      byId(RECIPIENT_RETURN_HOLD_STYLE_ID_V772);
    if (!styleV772) {
      styleV772 = document.createElement('style');
      styleV772.id =
        RECIPIENT_RETURN_HOLD_STYLE_ID_V772;
      styleV772.textContent =
        'html.' +
        RECIPIENT_RETURN_HOLD_CLASS_V772 +
        '::before{' +
          'content:"대화방으로 돌아가는 중입니다.";'+
          'position:fixed;inset:0;z-index:2147483647;'+
          'display:flex;align-items:center;justify-content:center;'+
          'box-sizing:border-box;padding:24px;'+
          'background:#f3f6fb;color:#26334d;'+
          'font:700 15px/1.45 -apple-system,BlinkMacSystemFont,'+
            '"Segoe UI","Noto Sans KR",Arial,sans-serif;'+
          'text-align:center;pointer-events:auto;'+
        '}' +
        'html.' +
        RECIPIENT_RETURN_HOLD_CLASS_V772 +
        ' #contactScreen{visibility:hidden!important;}';
      (document.head || rootV772).appendChild(styleV772);
    }
    return true;
  }

  function armRecipientReturnHoldV772(
    allowCurrentNavigationV772
  ) {
    var markerV772 =
      readRecipientReturnMarkerV772(
        allowCurrentNavigationV772 === true
          ? false
          : true
      );
    if (!markerV772) return false;

    var rootV772 = document.documentElement;
    if (
      !rootV772 ||
      !ensureRecipientReturnHoldStyleV772()
    ) {
      return false;
    }

    rootV772.classList.add(
      RECIPIENT_RETURN_HOLD_CLASS_V772
    );
    recipientReturnHoldArmedV772 = true;
    return true;
  }

  function releaseRecipientReturnHoldV772() {
    var rootV772 = document.documentElement;
    if (rootV772) {
      rootV772.classList.remove(
        RECIPIENT_RETURN_HOLD_CLASS_V772
      );
    }

    var styleV772 =
      byId(RECIPIENT_RETURN_HOLD_STYLE_ID_V772);
    if (styleV772 && styleV772.parentNode) {
      styleV772.parentNode.removeChild(styleV772);
    }

    recipientReturnHoldArmedV772 = false;
  }

  function releaseRecipientReturnHoldAfterRoomPaintV772(
    roomIdV772
  ) {
    var expectedRoomIdV772 =
      String(roomIdV772 || '');
    var requestV772 =
      window.requestAnimationFrame ||
      function (callbackV772) {
        return setTimeout(callbackV772, 0);
      };

    requestV772(function () {
      requestV772(function () {
        var panelV772 =
          byId('sp566MemberRoomPanel');
        var roomReadyV772 = !!(
          expectedRoomIdV772 &&
          String(state.currentRoomId || '') ===
            expectedRoomIdV772 &&
          panelV772 &&
          !panelV772.hidden &&
          !panelV772.classList.contains('hidden')
        );

        if (roomReadyV772) {
          releaseRecipientReturnHoldV772();
        }
      });
    });
  }

  /*
   * v772:
   * The Android/WebView back snapshot can become visible before a fresh
   * member-room authorization RPC finishes. The return hold is therefore
   * independent of the normal SitePass boot prepaint.
   *
   * - While leaving the friend room, pagehide/hidden arms the hold into the
   *   history/BFCache snapshot after the roomId marker has been stored.
   * - On back_forward reload the module also re-arms the same hold.
   * - The hold is released only after the authorized room panel is the
   *   visible member state, or after a terminal failure/list state is ready.
   */
  function armRecipientReturnHoldForDepartureV772() {
    var markerV772 =
      readRecipientReturnMarkerV772(false);
    if (
      !markerV772 ||
      String(state.currentRoomId || '') !==
        String(markerV772.roomId || '')
    ) {
      return false;
    }
    return armRecipientReturnHoldV772(true);
  }

  window.addEventListener(
    'pagehide',
    function () {
      armRecipientReturnHoldForDepartureV772();
    }
  );

  document.addEventListener(
    'visibilitychange',
    function () {
      if (document.visibilityState === 'hidden') {
        armRecipientReturnHoldForDepartureV772();
      }
    }
  );

  /* Back-forward reload path: arm during module evaluation, before normal
   * SitePass boot prepaint is allowed to disappear. */
  armRecipientReturnHoldV772(false);

  function rememberRecipientReturnRoomV766() {
    var roomIdV766 =
      String(
        state.currentRoomId || ''
      ).trim();

    if (!roomIdV766) return false;

    var currentRoomV766 =
      rooms().find(function (roomV766) {
        return (
          String(
            roomV766 &&
            roomV766.roomId ||
            ''
          ) === roomIdV766
        );
      });

    if (!currentRoomV766) return false;

    try {
      sessionStorage.setItem(
        recipientReturnStorageKeyV766(),
        JSON.stringify({
          roomId: roomIdV766,
          createdAt: Date.now()
        })
      );
      recipientReturnArmedThisContextV766 =
        true;
      return true;
    } catch (error) {
      return false;
    }
  }

  function maybeRestoreRecipientReturnRoomV766(
    resultV766
  ) {
    var navigationTypeV766 =
      recipientReturnNavigationTypeV766();

    if (
      navigationTypeV766 !==
      'back_forward'
    ) {
      if (
        !recipientReturnArmedThisContextV766
      ) {
        clearAllRecipientReturnV766();
      }
      return false;
    }

    if (!screenVisible('contactScreen')) {
      return false;
    }

    var rawV766 = '';
    try {
      rawV766 = String(
        sessionStorage.getItem(
          recipientReturnStorageKeyV766()
        ) || ''
      );
    } catch (error) {
      return false;
    }

    if (!rawV766) return false;

    var savedV766 = null;
    try {
      savedV766 = JSON.parse(rawV766);
    } catch (error) {
      clearRecipientReturnV766();
      return false;
    }

    var roomIdV766 =
      String(
        savedV766 &&
        savedV766.roomId ||
        ''
      ).trim();

    var createdAtV766 =
      Number(
        savedV766 &&
        savedV766.createdAt
      );

    var nowV766 = Date.now();
    if (
      !roomIdV766 ||
      !Number.isFinite(createdAtV766) ||
      createdAtV766 <= 0 ||
      createdAtV766 > nowV766 + 300000 ||
      nowV766 - createdAtV766 >
        RECIPIENT_RETURN_MAX_AGE_MS_V766
    ) {
      clearRecipientReturnV766();
      return false;
    }

    if (state.currentRoomId) {
      clearRecipientReturnV766();
      return false;
    }

    var resultRoomsV766 =
      resultV766 &&
      Array.isArray(resultV766.rooms)
        ? resultV766.rooms
        : [];

    var allowedRoomV766 =
      resultRoomsV766.find(
        function (roomV766) {
          return (
            String(
              roomV766 &&
              roomV766.roomId ||
              ''
            ) === roomIdV766
          );
        }
      );

    if (!allowedRoomV766) {
      clearRecipientReturnV766();
      return false;
    }

    clearRecipientReturnV766();
    openRoom(roomIdV766);
    releaseRecipientReturnHoldAfterRoomPaintV772(
      roomIdV766
    );
    return true;
  }

  async function recipientShareActionV751(event, messageId, action) {
    if (event) {
      try { event.preventDefault(); event.stopPropagation(); } catch (error) {}
    }

    var link = recipientShareLinkV751(messageId);
    if (!link) {
      alert('현재 사용할 수 있는 담당자 링크가 아닙니다.');
      return false;
    }

    action = String(action || '');

    if (action === 'open') {
      rememberRecipientReturnRoomV766();
      try {
        var opened = window.open(link, '_blank', 'noopener,noreferrer');
        if (opened) {
          try { opened.opener = null; } catch (error) {}
        }
      } catch (error) {
        window.location.href = link;
      }
      return false;
    }

    if (action === 'copy') {
      try {
        if (
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === 'function'
        ) {
          await navigator.clipboard.writeText(link);
        } else {
          var temp = document.createElement('textarea');
          temp.value = link;
          temp.setAttribute('readonly','readonly');
          temp.style.position = 'fixed';
          temp.style.opacity = '0';
          document.body.appendChild(temp);
          temp.select();
          if (!document.execCommand('copy')) {
            throw new Error('COPY_NOT_SUPPORTED');
          }
          temp.remove();
        }
        alert('담당자 링크를 복사했습니다.');
      } catch (error) {
        alert('링크를 복사하지 못했습니다.');
      }
      return false;
    }

    if (action === 'share') {
      var payloadV759 = {
        title: 'SitePass 담당자용 장비·서류 링크',
        text: 'SitePass 담당자용 장비·서류 링크입니다.',
        url: link
      };

      if (isSitePassNativeAndroidV765()) {
        var shareNativeV765 =
          getSitePassNativeSharePluginV765();

        if (
          !shareNativeV765 ||
          typeof shareNativeV765.openShareChooser !== 'function'
        ) {
          alert(
            'Android 공유 Native 모듈을 확인하지 못했습니다.\n\n' +
            'v765 앱을 설치한 뒤 다시 시도해주세요.'
          );
          return false;
        }

        if (recipientShareNativeBusyV765) {
          return false;
        }

        recipientShareNativeBusyV765 = true;

        try {
          var nativeShareResultV765 =
            await shareNativeV765.openShareChooser(payloadV759);

          var nativeShareStatusV765 =
            String(
              nativeShareResultV765 &&
              nativeShareResultV765.status ||
              ''
            ).trim().toLowerCase();

          if (nativeShareStatusV765 === 'busy') {
            return false;
          }

          if (nativeShareStatusV765 !== 'opened') {
            throw new Error(
              String(
                nativeShareResultV765 &&
                (
                  nativeShareResultV765.message ||
                  nativeShareResultV765.code
                ) ||
                'SHARE_CHOOSER_ACTIVITY_UNAVAILABLE'
              )
            );
          }

          return false;
        } catch (error) {
          alert(
            'Android 공유창을 열지 못했습니다.\n\n' +
            String(
              error &&
              error.message ||
              error ||
              'SHARE_CHOOSER_START_FAILED'
            )
          );
          return false;
        } finally {
          window.setTimeout(function () {
            recipientShareNativeBusyV765 = false;
          }, 1200);
        }
      }

      if (
        navigator.share &&
        typeof navigator.share === 'function'
      ) {
        try {
          await navigator.share(payloadV759);
          return false;
        } catch (error) {
          if (
            error &&
            String(error.name || '').toLowerCase() === 'aborterror'
          ) {
            return false;
          }
        }
      }

      try {
        if (
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === 'function'
        ) {
          await navigator.clipboard.writeText(link);
        } else {
          var shareTempV759 = document.createElement('textarea');
          shareTempV759.value = link;
          shareTempV759.setAttribute('readonly','readonly');
          shareTempV759.style.position = 'fixed';
          shareTempV759.style.opacity = '0';
          document.body.appendChild(shareTempV759);
          shareTempV759.select();
          if (!document.execCommand('copy')) {
            throw new Error('COPY_NOT_SUPPORTED');
          }
          shareTempV759.remove();
        }
        alert('이 기기에서는 공유창을 열 수 없어 링크를 복사했습니다.');
      } catch (error) {
        alert('링크 공유창을 열지 못했습니다.');
      }
      return false;
    }

    return false;
  }

  function renderRecipientShareMessageCardV751(message, share) {
    share = share && typeof share === 'object' ? share : {};
    var messageId = messageIdV597(message);
    var equipmentNo =
      String(share.equipmentNo || '장비번호 없음').trim() || '장비번호 없음';
    var equipmentName =
      String(share.equipmentName || '장비').trim() || '장비';
    var available = share.available === true;
    var reason = String(share.unavailableReason || '');
    var status = available
      ? '사용 가능'
      : (reason === 'RECIPIENT_LINK_EXPIRED' ? '기간 만료' : '사용 불가');
    var statusClass = available ? ' available' : ' unavailable';
    var expires = recipientShareExpiryLabelV751(share.expiresAt);
    var receivedRecipientShareV759 =
      !!message && message.isMine !== true;

    return (
      '<article class="sp602-reference-message sp751-recipient-link-card' +
        statusClass +
        (receivedRecipientShareV759 ? ' sp765-recipient-share-received' : '') +
      '">' +
        '<header>' +
          '<span class="sp602-reference-message-icon">🔗</span>' +
          '<div><b>담당자용 장비·서류 링크</b><small>' +
            html(equipmentNo + ' · ' + equipmentName) +
          '</small></div>' +
          '<em>' + html(status) + '</em>' +
        '</header>' +
        '<footer class="sp746-contact-footer' +
          (receivedRecipientShareV759 ? ' sp765-recipient-share-footer' : '') +
        '">' +
          (
            available
              ? (
                  '<span class="sp746-contact-actions' +
                    (receivedRecipientShareV759 ? ' sp765-recipient-share-actions' : '') +
                  '">' +
                    '<button type="button" onclick="return window.SitePassMemberLinkChatV566.recipientShareAction(event,\'' +
                      attr(messageId) +
                    '\',\'open\')">링크 열기</button>' +
                    '<i aria-hidden="true">·</i>' +
                    '<button type="button" onclick="return window.SitePassMemberLinkChatV566.recipientShareAction(event,\'' +
                      attr(messageId) +
                    '\',\'copy\')">링크 복사</button>' +
                    (
                      receivedRecipientShareV759
                        ? (
                            '<i aria-hidden="true">·</i>' +
                            '<button type="button" onclick="return window.SitePassMemberLinkChatV566.recipientShareAction(event,\'' +
                              attr(messageId) +
                            '\',\'share\')">링크 공유하기</button>'
                          )
                        : ''
                    ) +
                  '</span>'
                )
              : '<span>현재 이 링크는 사용할 수 없습니다.</span>'
          ) +
          '<small' +
            (receivedRecipientShareV759 ? ' class="sp765-recipient-share-expiry"' : '') +
          '>' +
            html(expires ? '유효 ' + expires + '까지' : '서버 유효기간 적용') +
          '</small>' +
        '</footer>' +
      '</article>'
    );
  }

  function storageClient() {
    var client = window.sitepassSupabase;
    if (
      !client ||
      !client.storage ||
      typeof client.storage.from !== 'function'
    ) {
      throw new Error('파일 저장소 연결을 확인하지 못했습니다.');
    }
    return client;
  }

  function normalizedAttachmentMime(file) {
    var type = String(file && file.type || '').toLowerCase().trim();
    var name = String(file && file.name || '').toLowerCase();
    var byExtension = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.hwp': 'application/x-hwp',
      '.hwpx': 'application/x-hwpx'
    };
    var allowed = {
      'image/jpeg': true,
      'image/png': true,
      'image/webp': true,
      'application/pdf': true,
      'application/msword': true,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
      'application/vnd.ms-excel': true,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
      'text/csv': true,
      'text/plain': true,
      'application/x-hwp': true,
      'application/x-hwpx': true,
      'application/haansoftdoc': true,
      'application/haansoft-hwp': true,
      'application/haansoft-hwpx': true
    };
    if (allowed[type]) return type;
    var extension = Object.keys(byExtension).find(function (ext) {
      return name.endsWith(ext);
    });
    return extension ? byExtension[extension] : '';
  }

  function attachmentVisualMeta(mime, fileName) {
    mime = String(mime || '').toLowerCase().trim();
    fileName = String(fileName || '').trim();
    var lowerName = fileName.toLowerCase();
    var extension = lowerName.indexOf('.') >= 0
      ? lowerName.slice(lowerName.lastIndexOf('.') + 1)
      : '';

    if (mime.indexOf('image/') === 0 || /^(jpg|jpeg|png|webp)$/.test(extension)) {
      return { kind: 'image', ext: 'IMG' };
    }
    if (mime === 'application/pdf' || extension === 'pdf') {
      return { kind: 'pdf', ext: 'PDF' };
    }
    if (
      mime.indexOf('excel') >= 0 ||
      mime.indexOf('spreadsheet') >= 0 ||
      /^(xls|xlsx|csv)$/.test(extension)
    ) {
      return { kind: 'sheet', ext: extension === 'csv' ? 'CSV' : (extension === 'xlsx' ? 'XLSX' : 'XLS') };
    }
    if (
      mime.indexOf('application/x-hwp') >= 0 ||
      mime.indexOf('haansoft') >= 0 ||
      /^(hwp|hwpx)$/.test(extension)
    ) {
      return { kind: 'hwp', ext: extension === 'hwpx' ? 'HWPX' : 'HWP' };
    }
    if (
      mime.indexOf('word') >= 0 ||
      mime === 'application/msword' ||
      /^(doc|docx)$/.test(extension)
    ) {
      return { kind: 'doc', ext: extension === 'docx' ? 'DOCX' : 'DOC' };
    }
    if (extension === 'txt') return { kind: 'text', ext: 'TXT' };
    if (extension) return { kind: 'generic', ext: extension.slice(0, 4).toUpperCase() };
    return { kind: 'generic', ext: 'FILE' };
  }

  function attachmentVisualMarkup(mime, fileName, previewUrl, sizeClass) {
    var meta = attachmentVisualMeta(mime, fileName);
    var classes = 'sp616-file-visual sp616-file-' + meta.kind + (sizeClass ? ' ' + sizeClass : '');
    if (meta.kind === 'image' && previewUrl) {
      return '<span class="' + classes + '"><img src="' + attr(previewUrl) + '" alt=""><span class="sp616-file-ext">IMG</span></span>';
    }
    if (meta.kind === 'image') {
      return '<span class="' + classes + '"><span class="sp616-photo-sky"></span><span class="sp616-photo-sun"></span><span class="sp616-photo-hill back"></span><span class="sp616-photo-hill front"></span><span class="sp616-file-ext">IMG</span></span>';
    }
    return '<span class="' + classes + '"><span class="sp616-paper"></span><span class="sp616-paper-fold"></span><span class="sp616-file-ext">' + html(meta.ext) + '</span><span class="sp616-paper-lines"><i></i><i></i><i></i></span></span>';
  }

  function revokePendingPreviewUrls(rows) {
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      if (!row || !row.previewUrl) return;
      try { URL.revokeObjectURL(row.previewUrl); } catch (error) {}
      row.previewUrl = '';
    });
  }

  function formatFileSize(bytes) {
    var size = Number(bytes || 0);
    if (!Number.isFinite(size) || size <= 0) return '';
    if (size < 1024) return size + 'B';
    if (size < 1048576) return (size / 1024).toFixed(size < 10240 ? 1 : 0) + 'KB';
    return (size / 1048576).toFixed(size < 10485760 ? 1 : 0) + 'MB';
  }

  function formatAttachmentExpiry(value) {
    var date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return '';
    var now = new Date();
    if (date.getFullYear() !== now.getFullYear()) {
      return date.getFullYear() + '년 ' + (date.getMonth() + 1) + '월 ' + date.getDate() + '일';
    }
    return (date.getMonth() + 1) + '월 ' + date.getDate() + '일';
  }

  function renderAttachmentComposer() {
    var selection = byId('sp590AttachmentSelection');
    var menu = byId('sp590AttachmentMenu');
    var plus = byId('sp590AttachmentPlus');
    var input = byId('sp566MemberMessageInput');
    if (menu) menu.classList.toggle('hidden', !state.attachmentMenuOpen);
    if (plus) {
      plus.setAttribute('aria-expanded', state.attachmentMenuOpen ? 'true' : 'false');
      plus.disabled = state.sendBusy || state.contactSending;
    }
    if (input) input.disabled = state.sendBusy;
    if (!selection) return;
    var rows = Array.isArray(state.pendingFiles) ? state.pendingFiles : [];
    selection.classList.toggle('hidden', rows.length === 0);
    selection.innerHTML = rows.map(function (row, index) {
      var file = row.file;
      return (
        '<div class="sp590-pending-file">' +
          attachmentVisualMarkup(row.mime, file.name || '', row.previewUrl || '', 'sp616-file-visual-small') +
          '<span class="sp590-pending-file-copy"><b>' + html(file.name || '첨부파일') + '</b><small>' + html(formatFileSize(file.size)) + '</small></span>' +
          '<button type="button" class="sp590-pending-file-remove" ' +
            (state.sendBusy ? 'disabled ' : '') +
            'onclick="return window.SitePassMemberLinkChatV566.removePendingAttachment(' + index + ')" aria-label="첨부파일 제거">×</button>' +
        '</div>'
      );
    }).join('');
  }

  function toggleAttachmentMenu(event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    if (state.sendBusy || state.contactSending) return false;
    state.attachmentMenuOpen = !state.attachmentMenuOpen;
    renderAttachmentComposer();
    return false;
  }

  function openAttachmentPicker(event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    state.attachmentMenuOpen = false;
    renderAttachmentComposer();
    var picker = byId('sp590AttachmentInput');
    if (picker && !state.sendBusy && !state.contactSending) picker.click();
    return false;
  }

  function getSitePassNativeContactsPluginV755() {
    try {
      return (
        window.Capacitor &&
        window.Capacitor.Plugins &&
        window.Capacitor.Plugins.SitePassContactsNative
      ) || null;
    } catch (error) {
      return null;
    }
  }

  function nativeContactPickerSupportedV755() {
    var plugin = getSitePassNativeContactsPluginV755();
    return !!(
      plugin &&
      typeof plugin.pickPhoneContact === 'function'
    );
  }

  function webContactPickerSupportedV755() {
    return !!(
      navigator &&
      navigator.contacts &&
      typeof navigator.contacts.select === 'function'
    );
  }

  function contactPickerSupported() {
    return (
      nativeContactPickerSupportedV755() ||
      webContactPickerSupportedV755()
    );
  }

  function normalizePickedContactValue(value) {
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i += 1) {
        var item = String(value[i] == null ? '' : value[i]).trim();
        if (item) return item;
      }
      return '';
    }
    return String(value == null ? '' : value).trim();
  }

  async function openContactPicker(event) {
    if (event) {
      try {
        event.preventDefault();
        event.stopPropagation();
      } catch (error) {}
    }

    if (
      state.sendBusy ||
      state.contactSending ||
      !state.currentRoomId ||
      !isMemberMode()
    ) {
      return false;
    }
    var contactRoomIdV758 = String(state.currentRoomId || '');

    state.attachmentMenuOpen = false;
    renderAttachmentComposer();

    if (!contactPickerSupported()) {
      alert(
        '이 휴대폰 브라우저에서는 주소록 선택을 지원하지 않습니다.\n\n' +
        '지원되는 모바일 브라우저에서 다시 이용해주세요.'
      );
      return false;
    }

    var rows;
    try {
      var nativePlugin =
        getSitePassNativeContactsPluginV755();

      if (
        nativePlugin &&
        typeof nativePlugin.pickPhoneContact === 'function'
      ) {
        var nativeResult =
          await nativePlugin.pickPhoneContact();

        var nativeStatus =
          String(
            nativeResult &&
            nativeResult.status ||
            ''
          ).trim().toLowerCase();

        if (
          nativeStatus === 'cancelled' ||
          nativeStatus === 'busy'
        ) {
          return false;
        }

        if (nativeStatus !== 'success') {
          throw new Error(
            String(
              nativeResult &&
              (
                nativeResult.message ||
                nativeResult.code
              ) ||
              'CONTACT_PICKER_NATIVE_FAILED'
            )
          );
        }

        rows = [
          {
            name: [
              String(
                nativeResult.name || ''
              ).trim()
            ],
            tel: [
              String(
                nativeResult.phone || ''
              ).trim()
            ]
          }
        ];
      } else {
        rows = await navigator.contacts.select(
          ['name', 'tel'],
          { multiple: false }
        );
      }
    } catch (error) {
      if (
        error &&
        (
          error.name === 'AbortError' ||
          error.name === 'NotAllowedError'
        )
      ) {
        return false;
      }
      alert(
        '휴대폰 연락처를 불러오지 못했습니다.\n\n' +
        friendlyError(error)
      );
      return false;
    }

    if (!Array.isArray(rows) || !rows.length) {
      return false;
    }

    var picked = rows[0] || {};
    var name = normalizePickedContactValue(picked.name);
    var phone = normalizePickedContactValue(picked.tel);

    if (!name) name = '연락처';

    if (!phone) {
      alert('선택한 연락처에 전화번호가 없습니다.');
      return false;
    }

    if (
      !window.confirm(
        '이 연락처를 채팅방에 보낼까요?\n\n' +
        name +
        '\n' +
        phone
      )
    ) {
      return false;
    }

    state.contactSending = true;
    renderAttachmentComposer();

    var sent = false;

    try {
      var result = await rpc(
        'sitepass_send_member_link_chat_contact_v1',
        {
          p_room_id: contactRoomIdV758,
          p_contact_name: name,
          p_contact_phone: phone,
          p_idempotency_key: newIdempotencyKey()
        }
      );

      if (!result || result.ok !== true) {
        throw new Error(
          '연락처 전송 결과를 확인하지 못했습니다.'
        );
      }

      sent = true;
    } catch (error) {
      var message = friendlyError(error);
      if (
        String(errorText(error)).indexOf(
          'FRIEND_RELATIONSHIP_REQUIRED'
        ) >= 0
      ) {
        message =
          '친구로 연결된 회원에게만 연락처를 보낼 수 있습니다.';
      }
      alert(
        '연락처를 보내지 못했습니다.\n\n' +
        message
      );
    } finally {
      state.contactSending = false;
      renderAttachmentComposer();
    }

    if (!sent) return false;

    requestMemberLatestV758(contactRoomIdV758);

    try {
      if (String(state.currentRoomId || '') === contactRoomIdV758) {
        await loadRoom(contactRoomIdV758);
        await refresh(true);
      }
    } catch (error) {
      console.warn(
        'SitePass 연락처 전송 후 새로고침 실패:',
        error
      );
    }

    return false;
  }

  function contactReferenceByMessageId(messageId) {
    messageId = String(messageId || '').trim();

    var messages =
      state.detail &&
      Array.isArray(state.detail.messages)
        ? state.detail.messages
        : [];

    for (var i = 0; i < messages.length; i += 1) {
      if (
        messageIdV597(messages[i]) !== messageId ||
        String(messages[i].messageType || '') !==
          'contact_card'
      ) {
        continue;
      }

      var reference =
        messages[i].reference &&
        typeof messages[i].reference === 'object'
          ? messages[i].reference
          : {};

      var snapshot =
        reference.snapshot &&
        typeof reference.snapshot === 'object'
          ? reference.snapshot
          : {};

      return {
        name: String(
          snapshot.contactName || ''
        ).trim(),
        phone: String(
          snapshot.contactPhone || ''
        ).trim(),
        isMine: messages[i].isMine === true
      };
    }

    return null;
  }

  function contactPhoneUriValue(value) {
    return String(value || '')
      .replace(/[^\d+*#,;]/g, '');
  }

  function vCardEscape(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/\r?\n/g, ' ')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
  }

  function contactAction(event, messageId, action) {
    if (event) {
      try {
        event.preventDefault();
        event.stopPropagation();
      } catch (error) {}
    }

    var contact =
      contactReferenceByMessageId(messageId);

    if (!contact || !contact.phone) {
      alert('연락처 정보를 확인하지 못했습니다.');
      return false;
    }

    var phoneUri =
      contactPhoneUriValue(contact.phone);

    if (!phoneUri) {
      alert('전화번호 형식을 확인해주세요.');
      return false;
    }

    action = String(action || '');

    if (action === 'call') {
      window.location.href = 'tel:' + phoneUri;
      return false;
    }

    if (action === 'sms') {
      window.location.href = 'sms:' + phoneUri;
      return false;
    }

    if (action === 'save') {
      try {
        var displayName =
          contact.name || 'SitePass 연락처';

        var card =
          'BEGIN:VCARD\r\n' +
          'VERSION:3.0\r\n' +
          'FN:' +
          vCardEscape(displayName) +
          '\r\n' +
          'TEL;TYPE=CELL:' +
          vCardEscape(contact.phone) +
          '\r\n' +
          'END:VCARD\r\n';

        var blob = new Blob(
          [card],
          {
            type:
              'text/vcard;charset=utf-8'
          }
        );

        var url =
          URL.createObjectURL(blob);

        var a =
          document.createElement('a');

        a.href = url;
        a.download =
          String(displayName)
            .replace(/[\\/:*?"<>|]/g, '_')
            .slice(0, 80) +
          '.vcf';

        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(function () {
          try {
            URL.revokeObjectURL(url);
          } catch (error) {}
        }, 1000);
      } catch (error) {
        alert(
          '연락처 저장 파일을 만들지 못했습니다.\n\n' +
          friendlyError(error)
        );
      }

      return false;
    }

    return false;
  }

  function handleAttachmentFiles(fileList) {
    if (state.sendBusy) return false;
    var files = Array.prototype.slice.call(fileList || []);
    var picker = byId('sp590AttachmentInput');
    if (picker) picker.value = '';
    if (!files.length) return false;
    var current = Array.isArray(state.pendingFiles) ? state.pendingFiles.slice() : [];
    var warnings = [];
    files.forEach(function (file) {
      if (current.length >= CHAT_ATTACHMENT_MAX_FILES) {
        warnings.push('한 번에 최대 10개 파일까지 첨부할 수 있습니다.');
        return;
      }
      var name = String(file && file.name || '').trim();
      var mime = normalizedAttachmentMime(file);
      var size = Number(file && file.size || 0);
      if (!name || /[\\/]/.test(name) || /[\u0000-\u001f\u007f]/.test(name)) {
        warnings.push('파일명이 올바르지 않은 파일은 제외했습니다.');
        return;
      }
      if (!mime) {
        warnings.push(name + ': 지원하지 않는 파일 형식입니다.');
        return;
      }
      if (!Number.isFinite(size) || size < 1) {
        warnings.push(name + ': 내용이 없는 파일은 첨부할 수 없습니다.');
        return;
      }
      if (size > CHAT_ATTACHMENT_MAX_BYTES) {
        warnings.push(name + ': 파일당 20MB 이하만 첨부할 수 있습니다.');
        return;
      }
      var duplicate = current.some(function (row) {
        return row.file && row.file.name === file.name && row.file.size === file.size && row.file.lastModified === file.lastModified;
      });
      if (!duplicate) {
        var previewUrl = '';
        if (mime.indexOf('image/') === 0) {
          try { previewUrl = URL.createObjectURL(file); } catch (error) {}
        }
        current.push({ file: file, mime: mime, previewUrl: previewUrl });
      }
    });
    state.pendingFiles = current;
    renderAttachmentComposer();
    if (warnings.length) alert(Array.from(new Set(warnings)).join('\n'));
    return false;
  }

  function removePendingAttachment(index) {
    if (state.sendBusy) return false;
    var rows = Array.isArray(state.pendingFiles) ? state.pendingFiles.slice() : [];
    index = Number(index);
    if (Number.isInteger(index) && index >= 0 && index < rows.length) {
      var removed = rows.splice(index, 1);
      revokePendingPreviewUrls(removed);
    }
    state.pendingFiles = rows;
    renderAttachmentComposer();
    return false;
  }

  async function cleanupPreparedAttachments(rows) {
    rows = Array.isArray(rows) ? rows : [];
    var client;
    try { client = storageClient(); } catch (error) { client = null; }
    for (var i = rows.length - 1; i >= 0; i -= 1) {
      var row = rows[i] || {};
      try {
        if (client && row.uploaded && row.storagePath) {
          await client.storage.from(row.storageBucket || CHAT_ATTACHMENT_BUCKET).remove([row.storagePath]);
        }
      } catch (error) {}
      try {
        if (row.attachmentId) {
          await rpc('sitepass_cancel_pending_member_chat_attachment_v1', {
            p_attachment_id: row.attachmentId
          });
        }
      } catch (error) {}
    }
  }

  async function sendAttachmentBatch(text, roomId) {
    roomId = String(roomId || '');
    if (!roomId) throw new Error('채팅방을 확인하지 못했습니다.');
    var rows = Array.isArray(state.pendingFiles) ? state.pendingFiles.slice() : [];
    if (!rows.length) throw new Error('첨부할 파일을 선택해주세요.');
    var client = storageClient();
    var prepared = [];
    var finalized = false;
    try {
      for (var i = 0; i < rows.length; i += 1) {
        var row = rows[i];
        var preparedRow = await rpc('sitepass_prepare_member_chat_attachment_v1', {
          p_room_id: roomId,
          p_original_file_name: row.file.name,
          p_mime_type: row.mime,
          p_file_size_bytes: row.file.size,
          p_idempotency_key: newIdempotencyKey()
        });
        if (!preparedRow || preparedRow.ok !== true || !preparedRow.attachmentId || !preparedRow.storagePath) {
          throw new Error('첨부파일 업로드 준비 결과를 확인하지 못했습니다.');
        }
        preparedRow.file = row.file;
        preparedRow.mime = row.mime;
        preparedRow.uploaded = false;
        prepared.push(preparedRow);
      }

      for (var j = 0; j < prepared.length; j += 1) {
        var item = prepared[j];
        var uploadResult = await client.storage
          .from(item.storageBucket || CHAT_ATTACHMENT_BUCKET)
          .upload(item.storagePath, item.file, {
            contentType: item.mime,
            cacheControl: '0',
            upsert: false
          });
        if (uploadResult && uploadResult.error) throw uploadResult.error;
        item.uploaded = true;

        var verify = await rpc('sitepass_get_member_chat_attachment_upload_state_v1', {
          p_attachment_id: item.attachmentId
        });
        if (!verify || verify.exactMatch !== true || !verify.object || verify.object.exists !== true) {
          throw new Error('업로드된 파일 확인에 실패했습니다.');
        }
      }

      var result = await rpc('sitepass_finalize_member_chat_attachments_v1', {
        p_room_id: roomId,
        p_attachment_ids: prepared.map(function (row) { return row.attachmentId; }),
        p_message_text: text || null,
        p_idempotency_key: newIdempotencyKey()
      });
      if (!result || result.ok !== true) {
        throw new Error('첨부 메시지 전송 결과를 확인하지 못했습니다.');
      }
      finalized = true;
      return result;
    } catch (error) {
      if (!finalized) await cleanupPreparedAttachments(prepared);
      throw error;
    }
  }

  function encodeStoragePathV601(path) {
    return String(path || '')
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .map(function (part) { return encodeURIComponent(part); })
      .join('/');
  }

  function downloadNonceV601() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (error) {}
    return String(Date.now()) + '-' + Math.random().toString(36).slice(2);
  }

  async function downloadPrivateAttachmentBlobV601(storageBucket, storagePath) {
    var client = storageClient();
    var authSession = window.SitePassAuthSession || null;
    if (!authSession || typeof authSession.getSession !== 'function') {
      throw new Error('로그인 세션을 확인하지 못했습니다.');
    }

    var sessionResult = await authSession.getSession();
    if (sessionResult && sessionResult.error) throw sessionResult.error;
    var accessToken = String(
      sessionResult && sessionResult.data && sessionResult.data.session &&
      sessionResult.data.session.access_token || ''
    );
    if (!accessToken) throw new Error('로그인 상태를 다시 확인해주세요.');

    var config = window.SITEPASS_DB_CONFIG || {};
    var baseUrl = String(config.supabaseUrl || '').replace(/\/+$/, '');
    var anonKey = String(config.supabaseAnonKey || '');
    var bucket = String(storageBucket || '').trim();
    var path = encodeStoragePathV601(storagePath);
    if (!baseUrl || !anonKey || !bucket || !path) {
      throw new Error('파일 저장소 경로를 확인하지 못했습니다.');
    }

    var nonce = downloadNonceV601();
    var url = baseUrl + '/storage/v1/object/' +
      encodeURIComponent(bucket) + '/' + path +
      '?download=' + encodeURIComponent('sitepass-' + nonce);

    var response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        apikey: anonKey,
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache'
      }
    });

    if (!response || !response.ok) {
      var message = '';
      try {
        var payload = await response.clone().json();
        message = String(payload && (payload.message || payload.error || payload.msg) || '');
      } catch (error) {
        try { message = String(await response.text() || ''); } catch (ignored) {}
      }
      var failure = new Error(message || ('파일을 내려받지 못했습니다. (' + (response ? response.status : '응답없음') + ')'));
      failure.status = response ? response.status : 0;
      throw failure;
    }

    return await response.blob();
  }

  function attachmentCanPreviewInBrowserV656(mimeType, fileName) {
    var mime = String(mimeType || '').toLowerCase().trim();
    var name = String(fileName || '').toLowerCase().trim();

    if (mime.indexOf('image/') === 0) return true;
    if (mime === 'application/pdf') return true;

    return /\.(jpg|jpeg|png|webp|gif|pdf)$/i.test(name);
  }

  async function openAttachment(attachmentId) {
    attachmentId = String(attachmentId || '');
    if (!attachmentId || state.attachmentDownloadBusy[attachmentId]) return false;

    var previewWindow = null;
    try {
      previewWindow = window.open('', '_blank');
      try { if (previewWindow) previewWindow.opener = null; } catch (ignored) {}
      if (previewWindow && previewWindow.document) {
        previewWindow.document.title = 'SitePass 첨부파일 열기';
        previewWindow.document.body.innerHTML = '<p style="font:600 14px Arial,sans-serif;padding:24px;color:#334155">파일을 여는 중입니다...</p>';
      }
    } catch (error) {}

    state.attachmentDownloadBusy[attachmentId] = true;
    renderMessages();
    try {
      var meta = await rpc('sitepass_get_member_chat_attachment_download_v1', {
        p_attachment_id: attachmentId
      });
      if (!meta || meta.ok !== true || !meta.storageBucket || !meta.storagePath) {
        throw new Error('파일 정보를 확인하지 못했습니다.');
      }

      if (!attachmentCanPreviewInBrowserV656(meta.mimeType, meta.fileName)) {
        try { if (previewWindow && !previewWindow.closed) previewWindow.close(); } catch (ignored) {}
        delete state.attachmentDownloadBusy[attachmentId];
        renderMessages();
        return downloadAttachment(attachmentId);
      }

      var blob = await downloadPrivateAttachmentBlobV601(meta.storageBucket, meta.storagePath);
      if (!(blob instanceof Blob)) throw new Error('파일을 열지 못했습니다.');
      var url = URL.createObjectURL(blob);
      if (previewWindow && !previewWindow.closed) {
        previewWindow.location.replace(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (error) {} }, 60000);
    } catch (error) {
      try { if (previewWindow && !previewWindow.closed) previewWindow.close(); } catch (ignored) {}
      alert('파일을 열지 못했습니다.\n\n' + friendlyError(error));
    } finally {
      delete state.attachmentDownloadBusy[attachmentId];
      renderMessages();
    }
    return false;
  }

  async function downloadAttachment(attachmentId) {
    attachmentId = String(attachmentId || '');
    if (!attachmentId || state.attachmentDownloadBusy[attachmentId]) return false;
    state.attachmentDownloadBusy[attachmentId] = true;
    renderMessages();
    try {
      var meta = await rpc('sitepass_get_member_chat_attachment_download_v1', {
        p_attachment_id: attachmentId
      });
      if (!meta || meta.ok !== true || !meta.storageBucket || !meta.storagePath) {
        throw new Error('다운로드 정보를 확인하지 못했습니다.');
      }
      var blob = await downloadPrivateAttachmentBlobV601(meta.storageBucket, meta.storagePath);
      if (!(blob instanceof Blob)) throw new Error('파일을 내려받지 못했습니다.');
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = String(meta.fileName || 'sitepass-attachment');
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (error) {} }, 1000);
    } catch (error) {
      alert('파일을 다운로드하지 못했습니다.\n\n' + friendlyError(error));
    } finally {
      delete state.attachmentDownloadBusy[attachmentId];
      renderMessages();
    }
    return false;
  }

  function updateDeleteUiV597() {
    var bar = byId('sp597MemberDeleteBar');
    var count = byId('sp597MemberDeleteCount');
    var confirmButton = byId('sp597MemberDeleteConfirm');
    var startButton = byId('sp597MemberDeleteStart');
    var selected = Object.keys(state.selectedDeleteMessageIds || {}).filter(function(id){ return !!state.selectedDeleteMessageIds[id]; }).length;
    if (bar) bar.classList.toggle('hidden', !state.deleteMode);
    if (count) count.textContent = selected + '개 선택';
    if (confirmButton) {
      confirmButton.disabled = selected < 1 || state.deleteBusy;
      confirmButton.textContent = state.deleteBusy ? '삭제 중' : '선택 삭제';
    }
    if (startButton) startButton.classList.toggle('hidden', state.deleteMode || !state.currentRoomId);
  }

  function renderMessages() {
    var box = byId('sp566MemberMessages');
    var detail = state.detail || {};
    var sourceMessages = Array.isArray(detail.messages) ? detail.messages : [];
    var hiddenIds = loadHiddenMessageIdsV597(state.currentRoomId);
    var messages = sourceMessages.filter(function(message){ return hiddenIds.indexOf(messageIdV597(message)) < 0; });
    if (!box) return;
    var scrollSnapshotV758 = captureMemberScrollV758(box);
    box.classList.toggle('selecting', state.deleteMode);

    if (state.detailLoading && !state.detail) {
      box.innerHTML = '<div class="sp566-member-list-status">대화 내용을 불러오고 있습니다.</div>';
      updateDeleteUiV597();
      renderMemberNewMessageIndicatorV758();
      return;
    }
    if (state.detailError && !state.detail) {
      box.innerHTML = '<div class="sp566-member-list-status">' + html(state.detailError) + '</div>';
      updateDeleteUiV597();
      renderMemberNewMessageIndicatorV758();
      return;
    }
    if (!messages.length) {
      box.innerHTML = '<div class="sp566-member-list-status">아직 표시할 대화 내용이 없습니다.</div>';
      updateDeleteUiV597();
      registerMemberRenderedMessagesV758([]);
      return;
    }

    box.innerHTML = messages.map(function (message) {
        var stableId = messageIdV597(message);
        var deleted = message.deleted === true;
        var type = deleted ? 'text' : String(message.messageType || 'text');
        var mine = message.isMine === true;
        var system = type === 'link_request' || type === 'link_decision' || type === 'system';
        var isAttachment = type === 'attachment';
        var isReference = type === 'equipment_card' || type === 'document_card' || type === 'renewal_request';
        var isContact = type === 'contact_card';
        var recipientShare =
          !deleted &&
          message.recipientShare &&
          typeof message.recipientShare === 'object'
            ? message.recipientShare
            : null;
        var isRecipientShare = !!recipientShare;
        var isCard = isReference || isContact || isRecipientShare;
        var reference = message.reference && typeof message.reference === 'object' ? message.reference : null;
        var attachments = Array.isArray(message.attachments) ? message.attachments : [];
        var bodyText = deleted ? '삭제된 메시지입니다.' : String(message.messageText || '');
        var textHtml = '';
        if (isAttachment) {
          if (bodyText && bodyText !== '첨부파일') textHtml = '<div class="sp590-attachment-message-text">' + html(bodyText).replace(/\n/g, '<br>') + '</div>';
        } else if (isReference) {
          var referenceTitle = reference && reference.snapshot && reference.snapshot.title ? String(reference.snapshot.title) : '';
          if (bodyText && bodyText !== referenceTitle) textHtml = '<div class="sp602-reference-message-text">' + html(bodyText).replace(/\n/g, '<br>') + '</div>';
        } else if (isContact || isRecipientShare) {
          textHtml = '';
        } else {
          textHtml = html(bodyText).replace(/\n/g, '<br>');
        }
        var attachmentHtml = isAttachment
          ? '<div class="sp590-message-attachments">' +
            (attachments.length
              ? attachments.map(function (attachment) {
                  var attachmentId = String(attachment.attachmentId || '');
                  var available = attachment.downloadAvailable === true && attachment.downloadStatus !== 'expired';
                  var busy = !!state.attachmentDownloadBusy[attachmentId];
                  var expiry = formatAttachmentExpiry(attachment.downloadExpiresAt);
                  return '<div class="sp590-message-attachment-card sp633-attachment-row">' +
                      attachmentVisualMarkup(attachment.mimeType, attachment.fileName || '', '', 'sp616-file-visual-large') +
                      '<span class="sp590-message-attachment-copy"><b>' + html(attachment.fileName || '첨부파일') + '</b><small>' + html(formatFileSize(attachment.fileSizeBytes)) +
                          (available && expiry ? ' · ' + html(expiry) + '까지' : '') + '</small>' +
                        (available
                          ? '<span class="sp633-attachment-actions">' +
                              (attachmentCanPreviewInBrowserV656(attachment.mimeType, attachment.fileName || '')
                                ? '<button type="button" ' + (busy ? 'disabled ' : '') + 'onclick="return window.SitePassMemberLinkChatV566.openAttachment(\'' + attr(attachmentId) + '\')">' + (busy ? '여는 중' : '열기') + '</button>' +
                                  '<i aria-hidden="true">·</i>'
                                : '') +
                              '<button type="button" ' + (busy ? 'disabled ' : '') + 'onclick="return window.SitePassMemberLinkChatV566.downloadAttachment(\'' + attr(attachmentId) + '\')">' + (busy ? '처리 중' : '다운로드') + '</button>' +
                            '</span>'
                          : '<span class="sp590-attachment-expired">다운로드 기간 만료</span>') +
                      '</span>' +
                    '</div>';
                }).join('')
              : '<div class="sp590-attachment-expired-note">첨부파일 정보를 불러오지 못했습니다.</div>') + '</div>'
          : '';
        var referenceHtml = isReference
          ? renderReferenceMessageCard(message, reference)
          : (isContact
              ? renderContactMessageCard(message, reference)
              : (isRecipientShare
                  ? renderRecipientShareMessageCardV751(message, recipientShare)
                  : ''));
        var checkboxHtml = state.deleteMode
          ? '<label class="sp597-member-delete-check" title="선택"><input type="checkbox" data-message-id="' + attr(stableId) + '" onchange="return window.SitePassMemberLinkChatV566.toggleDeleteMessage(\'' + attr(stableId) + '\', this.checked)"><span aria-hidden="true">✓</span></label>'
          : '';
        return '<div class="sp566-member-message-row' + (mine ? ' mine' : '') + (system ? ' system' : '') + (isAttachment ? ' attachment' : '') + (isCard ? ' reference' : '') + (isContact ? ' contact' : '') + (isRecipientShare ? ' recipient-share' : '') + '" data-message-id="' + attr(stableId) + '">' +
            checkboxHtml + '<div class="sp566-member-message-bubble">' +
              (system ? '' : '<small>' + html(mine ? '나' : memberMessageSenderNameV609(message)) + ' · ' + html(formatTime(message.createdAt)) + '</small>') +
              textHtml + referenceHtml + attachmentHtml + '</div></div>';
      }).join('');

    updateDeleteUiV597();
    restoreMemberScrollV758(box, scrollSnapshotV758);
    registerMemberRenderedMessagesV758(messages);
  }

  function startDeleteModeV597(event) {
    if (event) { try { event.preventDefault(); event.stopPropagation(); } catch (error) {} }
    var messages = state.detail && Array.isArray(state.detail.messages) ? state.detail.messages : [];
    var hidden = loadHiddenMessageIdsV597(state.currentRoomId);
    var visibleCount = messages.filter(function(message){ return hidden.indexOf(messageIdV597(message)) < 0; }).length;
    if (!state.currentRoomId || visibleCount < 1) {
      alert('삭제할 회원채팅 메시지가 없습니다.');
      return false;
    }
    state.deleteMode = true;
    state.selectedDeleteMessageIds = {};
    renderRoomDetail();
    return false;
  }

  function cancelDeleteModeV597(event) {
    if (event) { try { event.preventDefault(); event.stopPropagation(); } catch (error) {} }
    resetDeleteModeV597();
    renderRoomDetail();
    return false;
  }

  function toggleDeleteMessageV597(messageId, checked) {
    var id = String(messageId || '');
    if (!id) return false;
    if (checked) state.selectedDeleteMessageIds[id] = true;
    else delete state.selectedDeleteMessageIds[id];
    updateDeleteUiV597();
    return false;
  }

  function selectedDeleteMessagesV660(ids) {
    var wanted = {};
    (ids || []).forEach(function(id){ wanted[String(id)] = true; });
    var messages = state.detail && Array.isArray(state.detail.messages) ? state.detail.messages : [];
    return messages.filter(function(message){ return !!wanted[messageIdV597(message)]; });
  }

  function chooseDeleteScopeV660(canDeleteForEveryone) {
    return new Promise(function(resolve){
      var old = byId('sp660DeleteScopeModal');
      if (old) old.remove();
      var overlay = document.createElement('div');
      overlay.id = 'sp660DeleteScopeModal';
      overlay.className = 'sp660-delete-scope-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML =
        '<div class="sp660-delete-scope-card">' +
          '<b>메시지를 어떻게 삭제할까요?</b>' +
          '<p>' + (canDeleteForEveryone
            ? '상대방이 아직 읽지 않은 내가 보낸 메시지는 양쪽에서 삭제할 수 있습니다.'
            : '선택한 메시지는 상대방이 읽었거나 받은 메시지이므로 내 화면에서만 삭제할 수 있습니다.') + '</p>' +
          '<button type="button" data-scope="me">나에게서만 삭제</button>' +
          (canDeleteForEveryone ? '<button type="button" class="danger" data-scope="everyone">모두에게서 삭제</button>' : '') +
          '<button type="button" class="cancel" data-scope="cancel">취소</button>' +
        '</div>';
      function finish(value){
        try { overlay.remove(); } catch (error) {}
        resolve(value);
      }
      overlay.addEventListener('click', function(event){
        if (event.target === overlay) return finish('cancel');
        var button = event.target && event.target.closest ? event.target.closest('[data-scope]') : null;
        if (button) finish(String(button.getAttribute('data-scope') || 'cancel'));
      });
      document.body.appendChild(overlay);
      var first = overlay.querySelector('[data-scope="me"]');
      if (first) try { first.focus(); } catch (error) {}
    });
  }

  async function confirmDeleteV597(event) {
    if (event) { try { event.preventDefault(); event.stopPropagation(); } catch (error) {} }
    if (state.deleteBusy) return false;
    var ids = Object.keys(state.selectedDeleteMessageIds || {}).filter(function(id){ return !!state.selectedDeleteMessageIds[id]; });
    if (!ids.length) { alert('삭제할 메시지를 선택해주세요.'); return false; }
    var selectedMessages = selectedDeleteMessagesV660(ids);
    var canDeleteForEveryone = selectedMessages.length === ids.length && selectedMessages.every(function(message){
      return message && message.canDeleteForEveryone === true;
    });
    var scope = await chooseDeleteScopeV660(canDeleteForEveryone);
    if (scope !== 'me' && scope !== 'everyone') return false;
    state.deleteBusy = true;
    updateDeleteUiV597();
    try {
      var result = await rpc('sitepass_delete_member_link_chat_messages_v1', {
        p_message_ids: ids,
        p_scope: scope
      });
      if (!result || result.ok !== true) throw new Error('메시지 삭제 결과를 확인하지 못했습니다.');
      resetDeleteModeV597();
      await loadRoom(state.currentRoomId);
    } catch (error) {
      alert('메시지를 삭제하지 못했습니다.\n\n' + friendlyError(error));
    } finally {
      state.deleteBusy = false;
      updateDeleteUiV597();
    }
    return false;
  }

  function renderRoomDetail() {
    if (!ensureUi()) return;
    var room =
      state.currentRoom ||
      rooms().find(function (row) {
        return (
          String(row.roomId || '') ===
          state.currentRoomId
        );
      }) ||
      {};
    var detail = state.detail || {};
    var title = byId('sp566MemberRoomTitle');
    var requestToggle = byId('sp606MemberRequestToggle');
    var noticeToggle = byId('sp595MemberRoomNoticeToggle');
    var composer = byId('sp566MemberComposer');
    var readOnly = byId('sp566MemberReadOnly');
    var sendButton = byId('sp566MemberSendButton');

    if (title) {
      title.textContent =
        String(
          memberDisplayNameV608(room)
        ) + ' 회원';
    }
    var requestEquipmentCount = currentRequestEquipmentCount();
    if (requestToggle) {
      requestToggle.classList.toggle('hidden', requestEquipmentCount < 1);
      var requestEquipmentNames = currentRequestEquipmentNamesV608();
      requestToggle.innerHTML =
        '<span class="sp609-request-line">' +
          '<span class="sp608-request-main">장비연동 요청 ' + html(requestEquipmentCount) + '대</span>' +
          (requestEquipmentNames
            ? '<span class="sp609-request-divider" aria-hidden="true">·</span><span class="sp608-request-equipment">' + html(requestEquipmentNames) + '</span>'
            : '') +
        '</span>' +
        '<span class="sp608-request-chevron" aria-hidden="true"></span>';
      requestToggle.setAttribute(
        'aria-expanded',
        state.requestSummaryExpanded === true ? 'true' : 'false'
      );
      requestToggle.classList.toggle(
        'expanded',
        state.requestSummaryExpanded === true
      );
    }

    if (noticeToggle) {
      var noticeOn = memberRoomNoticeOnV592(state.currentRoomId);
      var noticeBusy = memberRoomPushBusyV595(state.currentRoomId);
      noticeToggle.disabled = noticeBusy;
      noticeToggle.setAttribute('aria-pressed', noticeOn ? 'true' : 'false');
      noticeToggle.textContent = noticeBusy ? '저장 중' : (noticeOn ? '알림 ON' : '알림 OFF');
      noticeToggle.classList.toggle('off', !noticeOn);
    }

    var writable = detail.chatWritable === true;
    if (composer) composer.classList.toggle('hidden', !writable || state.deleteMode);
    if (readOnly) {
      readOnly.classList.toggle('hidden', writable);
    }
    if (sendButton) {
      sendButton.disabled = state.sendBusy || state.referenceSending;
      sendButton.textContent = state.sendBusy ? '전송 중' : '전송';
    }
    renderRequestGroups();
    renderAttachmentComposer();
    renderMessages();
    updateDeleteUiV597();
    renderMemberNewMessageIndicatorV758();
  }

  function refreshCurrentRoomV743() {
    var roomId = String(state.currentRoomId || '');

    if (
      !roomId ||
      !isMemberMode() ||
      !memberRoomVisibleV663()
    ) {
      return Promise.resolve(false);
    }

    /*
     * v744:
     * Hidden/background tabs can have their JavaScript and Realtime
     * suspended by the browser/OS.  Do not try to redraw while hidden;
     * remember that the open room is dirty and reconcile on resume.
     */
    if (document.hidden) {
      memberRoomDirtyV744 = true;
      return Promise.resolve(false);
    }

    /*
     * Realtime member_chat invalidation only:
     * reload the already-open room detail without reopening the room.
     * loadRoom() does not clear the message textarea or pendingFiles,
     * so draft text / attachment selection are preserved.
     */
    return loadRoom(roomId)
      .then(function () {
        if (
          String(state.currentRoomId || '') === roomId &&
          memberRoomVisibleV663()
        ) {
          memberRoomDirtyV744 = false;
          queueMemberViewportV663(memberShouldFollowLatestV758());
        }
        return true;
      })
      .catch(function (error) {
        memberRoomDirtyV744 = true;
        console.warn(
          'SitePass 회원채팅 실시간 상세 갱신 실패:',
          error
        );
        return false;
      });
  }

  function runMemberRoomResumeV744(reason) {
    if (
      document.hidden ||
      !isMemberMode()
    ) {
      return Promise.resolve(false);
    }

    var roomId = String(state.currentRoomId || '');
    if (!roomId || !memberRoomVisibleV663()) {
      return Promise.resolve(false);
    }

    /*
     * focus + visibilitychange + pageshow can fire together.
     * Keep exactly one catch-up read in flight and queue at most one rerun.
     */
    if (memberResumePromiseV744) {
      memberResumeQueuedV744 = true;
      return memberResumePromiseV744;
    }

    memberResumeQueuedV744 = false;
    memberResumePromiseV744 = loadRoom(roomId)
      .then(function () {
        if (
          String(state.currentRoomId || '') === roomId &&
          memberRoomVisibleV663()
        ) {
          memberRoomDirtyV744 = false;
          queueMemberViewportV663(memberShouldFollowLatestV758());
        }
        return true;
      })
      .catch(function (error) {
        memberRoomDirtyV744 = true;
        console.warn(
          'SitePass 회원채팅 복귀 동기화 실패:',
          reason || '',
          error
        );
        return false;
      })
      .then(function (result) {
        memberResumePromiseV744 = null;
        if (
          memberResumeQueuedV744 &&
          !document.hidden &&
          isMemberMode()
        ) {
          memberResumeQueuedV744 = false;
          queueMemberRoomResumeV744('queued');
        }
        return result;
      });

    return memberResumePromiseV744;
  }

  function queueMemberRoomResumeV744(reason) {
    if (document.hidden || !isMemberMode()) {
      return false;
    }

    memberResumeQueuedV744 = true;
    clearTimeout(memberResumeTimerV744);
    memberResumeTimerV744 = setTimeout(function () {
      memberResumeTimerV744 = 0;
      memberResumeQueuedV744 = false;
      runMemberRoomResumeV744(reason || 'resume');
    }, 80);
    return true;
  }

  function focusMessageInputV744(roomId) {
    setTimeout(function () {
      if (
        document.hidden ||
        !isMemberMode() ||
        String(state.currentRoomId || '') !== String(roomId || '') ||
        !memberRoomVisibleV663()
      ) {
        return;
      }

      var input = byId('sp566MemberMessageInput');
      if (!input || input.disabled) return;

      try {
        input.focus({ preventScroll: true });
      } catch (error) {
        try { input.focus(); } catch (ignore) {}
      }
    }, 0);
  }


  async function listRoomMessagesLatestV751(roomId) {
    var params = {
      p_room_id: roomId,
      p_before: null,
      p_limit: 100
    };
    try {
      return await rpc(
        'sitepass_list_member_link_chat_messages_v8',
        params
      );
    } catch (v8Error) {
      return rpc(
        'sitepass_list_member_link_chat_messages_v6',
        params
      );
    }
  }

  async function loadRoom(roomId) {
    roomId = String(roomId || '');
    if (!roomId || !isMemberMode()) return false;
    var loadSequenceV758 = ++memberRoomLoadSequenceV758;

    state.detailLoading = true;
    state.detailError = '';
    renderRoomDetail();

    try {
      try {
        await rpc(
          'sitepass_mark_member_link_chat_read_v1',
          { p_room_id: roomId }
        );
      } catch (error) {}

      var detail;
      try {
        detail = await listRoomMessagesLatestV751(roomId);
      } catch (v6Error) {
        try {
          detail = await rpc(
            'sitepass_list_member_link_chat_messages_v5',
            {
              p_room_id: roomId,
              p_before: null,
              p_limit: 100
            }
          );
        } catch (v5Error) {
          try {
            detail = await rpc(
              'sitepass_list_member_link_chat_messages_v4',
            {
              p_room_id: roomId,
              p_before: null,
              p_limit: 100
            }
          );
        } catch (v4Error) {
          try {
            detail = await rpc(
              'sitepass_list_member_link_chat_messages_v3',
              {
                p_room_id: roomId,
                p_before: null,
                p_limit: 100
              }
            );
          } catch (v3Error) {
            try {
              detail = await rpc(
                'sitepass_list_member_link_chat_messages_v2',
                {
                  p_room_id: roomId,
                  p_before: null,
                  p_limit: 100
                }
              );
            } catch (v2Error) {
              /* 신규/기존 상위 조회 실패 시 기존 v1 채팅을 그대로 살린다. */
              detail = await rpc(
                'sitepass_list_member_link_chat_messages_v1',
                {
                  p_room_id: roomId,
                  p_before: null,
                  p_limit: 100
                }
              );
            }
          }
        }
      }
      }
      if (
        !detail ||
        detail.ok !== true ||
        String(detail.roomId || '') !== roomId
      ) {
        throw new Error(
          '회원 채팅 상세 결과를 확인하지 못했습니다.'
        );
      }
      if (
        loadSequenceV758 !== memberRoomLoadSequenceV758 ||
        String(state.currentRoomId || '') !== roomId
      ) {
        return false;
      }
      state.detail = detail;
      state.detailError = '';
    } catch (error) {
      if (
        loadSequenceV758 !== memberRoomLoadSequenceV758 ||
        String(state.currentRoomId || '') !== roomId
      ) {
        return false;
      }
      state.detail = null;
      state.detailError =
        '대화 내용을 불러오지 못했습니다. ' +
        friendlyError(error);
    } finally {
      if (
        loadSequenceV758 === memberRoomLoadSequenceV758 &&
        String(state.currentRoomId || '') === roomId
      ) {
        state.detailLoading = false;
        renderRoomDetail();
      }
    }
    return (
      loadSequenceV758 === memberRoomLoadSequenceV758 &&
      String(state.currentRoomId || '') === roomId
    );
  }

  function openRoom(roomId) {
    roomId = String(roomId || '');
    if (!roomId || !isMemberMode()) return false;
    var room = rooms().find(function (row) {
      return String(row.roomId || '') === roomId;
    });
    state.currentRoom = room || null;
    state.detail = null;
    state.detailError = '';
    revokePendingPreviewUrls(state.pendingFiles);
    state.pendingFiles = [];
    state.attachmentMenuOpen = false;
    state.referencePickerOpen = false;
    state.referenceMode = '';
    state.referenceSelectedEquipmentId = '';
    state.referenceDocuments = [];
    state.referenceError = '';
    state.requestSummaryExpanded = false;
    document.body.classList.remove('sp602-reference-modal-open');
    resetDeleteModeV597();
    resetMemberScrollStateV758(roomId, true);
    showMemberRoomPanel(roomId);
    renderRoomDetail();
    loadRoom(roomId).then(function () {
      refresh(true);
    });
    return false;
  }

  async function sendMessage() {
    if (
      state.sendBusy ||
      !state.currentRoomId ||
      !isMemberMode()
    ) {
      return false;
    }

    var sendRoomIdV744 = String(state.currentRoomId || '');
    var input = byId('sp566MemberMessageInput');
    var text = String(input ? input.value : '').trim();
    var hasFiles = Array.isArray(state.pendingFiles) && state.pendingFiles.length > 0;

    if (!text && !hasFiles) {
      alert('메시지를 입력하거나 파일을 첨부해주세요.');
      if (input) input.focus();
      return false;
    }
    if (text.length > 500) {
      alert('메시지는 500자 이내로 입력해주세요.');
      return false;
    }

    state.attachmentMenuOpen = false;
    state.sendBusy = true;
    renderRoomDetail();

    var sent = false;
    try {
      var result;
      if (hasFiles) {
        result = await sendAttachmentBatch(text, sendRoomIdV744);
      } else {
        result = await rpc('sitepass_send_member_link_chat_message_v1', {
          p_room_id: sendRoomIdV744,
          p_message_text: text,
          p_idempotency_key: newIdempotencyKey()
        });
      }
      if (!result || result.ok !== true) {
        throw new Error('메시지 전송 결과를 확인하지 못했습니다.');
      }
      sent = true;
      requestMemberLatestV758(sendRoomIdV744);
      if (input) {
        input.value = '';
        resizeMemberMessageInputV773(input);
      }
      revokePendingPreviewUrls(state.pendingFiles);
      state.pendingFiles = [];
      var picker = byId('sp590AttachmentInput');
      if (picker) picker.value = '';
    } catch (error) {
      alert('메시지를 보내지 못했습니다.\n\n' + friendlyError(error));
    } finally {
      state.sendBusy = false;
      renderRoomDetail();
    }

    if (sent) {
      try {
        if (String(state.currentRoomId || '') === sendRoomIdV744) {
          await loadRoom(sendRoomIdV744);
          await refresh(true);
        }
      } catch (error) {
        console.warn('SitePass 회원채팅 전송 후 새로고침 실패:', error);
      }
      focusMessageInputV744(sendRoomIdV744);
    }
    return false;
  }

  async function respondGroup(groupId, decision) {
    groupId = String(groupId || '');
    decision = String(decision || '');
    if (
      state.decisionBusy ||
      !state.currentRoomId ||
      !groupId ||
      (decision !== 'accepted' &&
        decision !== 'rejected')
    ) {
      return false;
    }

    var groups =
      state.detail &&
      Array.isArray(state.detail.requestGroups)
        ? state.detail.requestGroups
        : [];
    var group = groups.find(function (row) {
      return (
        String(row.requestGroupId || '') ===
        groupId
      );
    });
    var count =
      group && Array.isArray(group.items)
        ? group.items.length
        : 0;
    var question =
      decision === 'accepted'
        ? '이 회원이 보낸 장비 ' +
          count +
          '대의 연동 요청을 모두 승인할까요?\n승인 후 보관함에서 장비를 확인할 수 있습니다.'
        : '장비 ' +
          count +
          '대의 연동 요청을 모두 거절할까요?';
    if (!confirm(question)) return false;

    state.decisionBusy = true;
    renderRoomDetail();
    try {
      var approvalModule =
        window.SitePassEquipmentLinkV82 &&
        window.SitePassEquipmentLinkV82.approval;

      if (
        !approvalModule ||
        typeof approvalModule.respond !== 'function'
      ) {
        throw new Error(
          '장비연동 승인 모듈을 확인하지 못했습니다.'
        );
      }

      var result = await approvalModule.respond({
        requestGroupId: groupId,
        decision: decision
      });

      alert(
        result.idempotent === true
          ? '이미 처리된 연동 요청입니다.'
          : decision === 'accepted'
            ? '장비 ' +
              Number(result.changedCount || count) +
              '대의 연동 요청을 승인했습니다.'
            : '장비 ' +
              Number(result.changedCount || count) +
              '대의 연동 요청을 거절했습니다.'
      );

      try {
        if (
          window.SitePassArchiveV562 &&
          typeof window.SitePassArchiveV562.reload ===
            'function'
        ) {
          window.SitePassArchiveV562.reload();
        }
      } catch (error) {}
      try {
        if (
          typeof window.syncSupabaseMyEquipmentItems ===
          'function'
        ) {
          window.syncSupabaseMyEquipmentItems(true, true);
        }
      } catch (error) {}
      try {
        window.dispatchEvent(
          new CustomEvent(
            'sitepass-member-link-chat-updated-v566',
            {
              detail: {
                roomId: state.currentRoomId,
                requestGroupId: groupId,
                decision: decision
              }
            }
          )
        );
      } catch (error) {}

      await loadRoom(state.currentRoomId);
      await refresh(true);
    } catch (error) {
      alert(
        '연동 요청을 처리하지 못했습니다.\n\n' +
          friendlyError(error)
      );
    } finally {
      state.decisionBusy = false;
      renderRoomDetail();
    }
    return false;
  }

  function mergePreciseUnreadV661(listResult, unreadResult) {
    if (
      !listResult ||
      !Array.isArray(listResult.rooms) ||
      !unreadResult ||
      unreadResult.ok !== true ||
      !Array.isArray(unreadResult.rooms)
    ) {
      return listResult;
    }

    var unreadByRoom = Object.create(null);
    unreadResult.rooms.forEach(function (row) {
      var roomId = String(row && row.roomId || '');
      if (!roomId) return;
      unreadByRoom[roomId] = Math.max(
        0,
        Number(row.unreadCount || 0)
      );
    });

    listResult.rooms = listResult.rooms.map(function (room) {
      var roomId = String(room && room.roomId || '');
      if (
        roomId &&
        Object.prototype.hasOwnProperty.call(
          unreadByRoom,
          roomId
        )
      ) {
        room.unreadCount = unreadByRoom[roomId];
      } else {
        room.unreadCount = 0;
      }
      return room;
    });

    listResult.totalUnread = Math.max(
      0,
      Number(unreadResult.totalUnreadCount || 0)
    );
    listResult.preciseUnreadV661 = true;
    return listResult;
  }

  async function refresh(force) {
    if (!ensureUi()) {
      releaseRecipientReturnHoldV772();
      return null;
    }
    if (!isMemberMode()) {
      releaseRecipientReturnHoldV772();
      state.list = null;
      state.listError = '';
      state.bulkTargets = [];
      state.bulkTargetsError = '';
      renderMemberRoomList();
      updateBottomUnreadBadge();
      return null;
    }

    /* A recipient return must never authorize from the five-second cache. */
    if (
      !force &&
      recipientReturnRestoreCandidateV770()
    ) {
      force = true;
    }

    var now = Date.now();
    if (
      !force &&
      state.list &&
      now - state.lastRefreshAt < 5000
    ) {
      var restoredFromCacheV772 =
        maybeRestoreRecipientReturnRoomV766(
          state.list
        );
      if (!restoredFromCacheV772) {
        releaseRecipientReturnHoldV772();
      }
      refreshBulkTargets(false);
      maybeShowHomeModal();
      return state.list;
    }
    if (state.refreshPromise) {
      /* Coalesce a Realtime invalidation that races the current list RPC. */
      if (force) state.refreshPendingV40 = true;
      return state.refreshPromise;
    }

    state.listLoading = true;
    state.listError = '';
    renderMemberRoomList();

    state.refreshPromise = rpc(
      'sitepass_list_my_member_link_chats_v5',
      {}
    )
      .catch(function () {
        return rpc(
          'sitepass_list_my_member_link_chats_v4',
          {}
        );
      })
      .catch(function () {
        return rpc(
          'sitepass_list_my_member_link_chats_v3',
          {}
        );
      })
      .catch(function () {
        return rpc(
          'sitepass_list_my_member_link_chats_v2',
          {}
        );
      })
      .catch(function () {
        return rpc(
          'sitepass_list_my_member_link_chats_v1',
          {}
        );
      })
      .then(function (result) {
        if (
          !result ||
          result.ok !== true ||
          !Array.isArray(result.rooms)
        ) {
          throw new Error(
            '회원연동채팅 목록 결과를 확인하지 못했습니다.'
          );
        }
        return rpc(
          'sitepass_get_my_member_chat_unread_v1',
          {}
        )
          .then(function (unreadResult) {
            return mergePreciseUnreadV661(
              result,
              unreadResult
            );
          })
          .catch(function () {
            return result;
          });
      })
      .then(function (result) {
        state.list = result;
        state.listError = '';
        state.lastRefreshAt = Date.now();

        maybeRestoreRecipientReturnRoomV766(
          result
        );

        if (state.currentRoomId) {
          state.currentRoom =
            result.rooms.find(function (room) {
              return (
                String(room.roomId || '') ===
                state.currentRoomId
              );
            }) || state.currentRoom;
        }

        /* v614: 목록과 단체발송 자격을 함께 완료한 뒤 한 번에 렌더링한다. */
        return refreshBulkTargets(force).then(function () {
          return result;
        });
      })
      .catch(function (error) {
        state.listError = friendlyError(error);
        return null;
      })
      .finally(function () {
        state.listLoading = false;
        state.refreshPromise = null;
        renderMemberRoomList();
        updateBottomUnreadBadge();
        renderRoomDetail();
        maybeShowHomeModal();
        if (
          recipientReturnHoldArmedV772 &&
          !state.currentRoomId
        ) {
          releaseRecipientReturnHoldV772();
        }
        if (state.refreshPendingV40) {
          state.refreshPendingV40 = false;
          setTimeout(function(){ refresh(true); }, 0);
        }
      });

    return state.refreshPromise;
  }

  function installLegacyHooks() {
    if (state.hooksInstalled) return;
    if (
      typeof window.sitepassOpenChatInbox460 !==
        'function' ||
      typeof window.sitepassBackToChatList460 !==
        'function'
    ) {
      return;
    }

    var originalOpen =
      window.sitepassOpenChatInbox460;
    var originalBack =
      window.sitepassBackToChatList460;

    window.sitepassOpenChatInbox460 = function () {
      if (recipientReturnRestoreCandidateV770()) {
        armRecipientReturnHoldV772(false);
        if (!state.refreshPromise) {
          refresh(true);
        }
        return false;
      }

      var result = originalOpen.apply(
        this,
        arguments
      );
      showChatListPanels();
      refresh(true);
      return result;
    };

    window.sitepassBackToChatList460 = function () {
      var result = originalBack.apply(
        this,
        arguments
      );
      showChatListPanels();
      refresh(true);
      return result;
    };

    state.hooksInstalled = true;
  }

  function init() {
    ensureUi();
    armRecipientReturnHoldV772(false);
    installLegacyHooks();
    if (!state.initialized) {
      state.initialized = true;

      document.addEventListener('click', function (event) {
        if (!state.attachmentMenuOpen) return;
        var wrap = event && event.target && event.target.closest
          ? event.target.closest('.sp590-attachment-picker-wrap')
          : null;
        if (!wrap) {
          state.attachmentMenuOpen = false;
          renderAttachmentComposer();
        }
      });

      window.addEventListener(
        'sitepass-member-link-chat-updated-v566',
        function () {
          refresh(true);
        }
      );

      window.addEventListener(
        'sitepass-room-push-updated-v595',
        function () {
          renderMemberRoomList();
          if (state.currentRoomId) renderRoomDetail();
        }
      );

      window.addEventListener('focus', function () {
        if (isMemberMode()) {
          refresh(true);
          queueMemberRoomResumeV744('focus');
        }
      });

      document.addEventListener(
        'visibilitychange',
        function () {
          if (!document.hidden && isMemberMode()) {
            refresh(true);
            queueMemberRoomResumeV744('visibilitychange');
          }
        }
      );

      window.addEventListener('pageshow', function () {
        if (isMemberMode()) {
          queueMemberRoomResumeV744('pageshow');
        }
      });

      window.addEventListener('online', function () {
        if (isMemberMode()) {
          queueMemberRoomResumeV744('online');
        }
      });

      var home = byId('homeScreen');
      var contact = byId('contactScreen');
      if (typeof MutationObserver === 'function') {
        var observer = new MutationObserver(function () {
          if (
            screenVisible('homeScreen') ||
            screenVisible('contactScreen')
          ) {
            refresh(false);
          }
        });
        [home, contact].forEach(function (screen) {
          if (screen) {
            observer.observe(screen, {
              attributes: true,
              attributeFilter: ['class', 'style']
            });
          }
        });
      }

      setInterval(function () {
        installLegacyHooks();
        if (isMemberMode() && !document.hidden) {
          refresh(false);
        }
      }, 15000);

      /*
       * 로그인 직후 홈이 먼저 열린 경우 첫 회원채팅 조회가
       * 15초 주기까지 밀리지 않도록 부팅 초기에만 짧게 확인한다.
       */
      var loginProbeCount = 0;
      var loginProbe = setInterval(function () {
        loginProbeCount += 1;
        installLegacyHooks();
        if (
          isMemberMode() &&
          !(
            recipientReturnRestoreCandidateV770() &&
            state.refreshPromise
          )
        ) {
          refresh(true);
        }
        if (state.list || loginProbeCount >= 40) {
          clearInterval(loginProbe);
        }
      }, 500);
    }

    if (
      isMemberMode() &&
      !(
        recipientReturnRestoreCandidateV770() &&
        state.refreshPromise
      )
    ) {
      refresh(true);
    }
  }

  window.SitePassMemberLinkChatV566 = {
    refresh: refresh,
    refreshCurrentRoom: refreshCurrentRoomV743,
    openRoom: openRoom,
    goToLatest: goToMemberLatestV758,
    toggleCurrentRoomPush: function(event) {
      var api = roomPushApiV595();
      if (api && typeof api.handleToggle === 'function' && state.currentRoomId) {
        api.handleToggle(event || window.event, 'member_chat', state.currentRoomId);
      }
      return false;
    },
    backToList: backToList,
    toggleRequestGroup: toggleRequestGroup,
    toggleRequestSummary: toggleRequestSummary,
    startDeleteMode: startDeleteModeV597,
    cancelDeleteMode: cancelDeleteModeV597,
    toggleDeleteMessage: toggleDeleteMessageV597,
    confirmDelete: confirmDeleteV597,
    sendMessage: sendMessage,
    toggleAttachmentMenu: toggleAttachmentMenu,
    openAttachmentPicker: openAttachmentPicker,
    openContactPicker: openContactPicker,
    openRecipientSharePicker: openRecipientSharePickerV751,
    openContactRecipientSharePicker: openContactRecipientSharePickerV761,
    closeReferencePicker: closeReferencePicker,
    sendRecipientShareMessage: sendRecipientShareMessageV752,
    sendContactRecipientShareSms: sendContactRecipientShareSmsV761,
    recipientShareAction: recipientShareActionV751,
    contactAction: contactAction,
    handleAttachmentFiles: handleAttachmentFiles,
    removePendingAttachment: removePendingAttachment,
    openAttachment: openAttachment,
    downloadAttachment: downloadAttachment,
    respondGroup: respondGroup,
    dismissHomeModal: dismissHomeModal,
    openHomeRequest: openHomeRequest,
    openBulkSend: openBulkSend,
    closeBulkSend: closeBulkSend,
    handleBulkSearch: handleBulkSearch,
    bulkPreviousPage: bulkPreviousPage,
    bulkNextPage: bulkNextPage,
    handleBulkTitle: handleBulkTitle,
    handleBulkMessage: handleBulkMessage,
    toggleBulkTarget: toggleBulkTarget,
    toggleBulkSelectAll: toggleBulkSelectAll,
    sendBulkMessage: sendBulkMessage,
    getState: function () {
      return {
        list: state.list,
        listError: state.listError,
        currentRoomId: state.currentRoomId,
        detail: state.detail,
        detailError: state.detailError,
        pendingFileCount: Array.isArray(state.pendingFiles) ? state.pendingFiles.length : 0,
        attachmentMenuOpen: state.attachmentMenuOpen,
        contactSending: state.contactSending,
        bulkSendOpen: state.bulkSendOpen,
        bulkEligibleCount: bulkTargets().length,
        bulkSelectedCount: bulkSelectedOwnerIds().length,
        bulkSending: state.bulkSending,
        bulkResult: state.bulkResult,
        bulkTargetsSource: state.bulkTargetsSource,
        scrollRoomId: memberScrollStateV758.roomId,
        scrollMode: memberScrollStateV758.mode,
        unseenIncomingCount: memberScrollStateV758.unseenIncomingCount
      };
    }
  };

  if (window.__SITEPASS_ENABLE_R14_SCROLL_TEST_HOOKS === true) {
    window.SitePassMemberLinkChatV566.__scrollTestV758 = Object.freeze({
      setRoomMessages: function (roomId, messages, forceLatest) {
        roomId = String(roomId || '');
        state.currentRoomId = roomId;
        state.detailLoading = false;
        state.detailError = '';
        if (memberScrollStateV758.roomId !== roomId || forceLatest === true) {
          resetMemberScrollStateV758(roomId, forceLatest === true);
        }
        state.detail = {
          ok: true,
          roomId: roomId,
          chatWritable: true,
          messages: Array.isArray(messages) ? messages : [],
          requestGroups: []
        };
        bindMemberMessageScrollV758();
        renderMessages();
        return window.SitePassMemberLinkChatV566.getState();
      },
      userScroll: function (scrollTop) {
        var box = byId('sp566MemberMessages');
        if (!box) return null;
        memberScrollStateV758.applyingProgrammaticScroll = false;
        box.scrollTop = Number(scrollTop || 0);
        memberScrollStateV758.interactionRevision += 1;
        if (memberIsNearLatestV758(box)) {
          memberScrollStateV758.mode = MEMBER_SCROLL_FOLLOW_LATEST_V758;
          clearMemberUnseenIncomingV758();
        } else {
          memberScrollStateV758.mode = MEMBER_SCROLL_READING_HISTORY_V758;
          renderMemberNewMessageIndicatorV758();
        }
        return window.SitePassMemberLinkChatV566.getState();
      },
      successfulSelfSend: function (messages) {
        requestMemberLatestV758(String(state.currentRoomId || ''));
        state.detail.messages = Array.isArray(messages) ? messages : [];
        renderMessages();
        return window.SitePassMemberLinkChatV566.getState();
      },
      goToLatest: goToMemberLatestV758
    });
  }

  bindMemberViewportV663();

  document.addEventListener(
    'DOMContentLoaded',
    function () {
      init();
      setTimeout(init, 300);
      setTimeout(init, 1200);
      setTimeout(init, 3500);
    },
    { once: true }
  );

  window.addEventListener('pageshow', function () {
    setTimeout(init, 100);
  });

  /* SitePass v23.7.610-55-back-icon-svg-exact-center */
  window.__SITEPASS_MEMBER_LINK_CHAT_V566_READY = true;
})();

/* SitePass v23.7.604-55-chat-compact-no-reference-actions
 * 회원채팅 상단의 중복 설명문과 참조카드 3개 발송 버튼/선택 모달을 제거.
 * 장비연동 요청 접기, 일반 메시지, 첨부, 삭제, Push ON/OFF는 유지.
 */

/* SitePass v23.7.613-55-linked-member-broadcast-archive-gate-recovery
 * 전용 단체발송 RPC가 미설치/불일치인 환경에서도 기존 서버 보관함 RPC의 linked_in 장비로 자격을 판정한다.
 * 원소유자는 숨기고 연동받은 회원만 노출하며, 전송 직전 같은 자격을 재확인한다.
 */

/* SitePass v23.7.614-55-broadcast-button-no-popin-prehydrated
 * 강제 새로고침에서도 직전 자격을 유지하고, 최초 목록과 자격 판정을 함께 완료한 뒤 한 번에 렌더링한다.
 * 연동회원 버튼의 지연 등장과 헤더 레이아웃 이동을 제거한다.
 */

/* SitePass v23.7.616-55-clean-split-chat-real-file-cards */
