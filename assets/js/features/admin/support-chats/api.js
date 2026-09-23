/* SitePass v23.7.784r14-step93-admin-support-chats-security-reinforcement
 * STEP93 admin support-chats / api + shared context
 * Migrated from sitepass-admin-inquiry-v675.js without RPC semantic changes.
 */
(function () {
  'use strict';

  var VERSION = '23.7.784-step93-admin-support-chats-security-reinforcement-1';
  var GLOBAL_NAME = 'SitePassAdminSupportChatsV93';

  if (
    window[GLOBAL_NAME] &&
    window[GLOBAL_NAME].version === VERSION
  ) {
    return;
  }

  var core = {
    version: VERSION,
    __modules: Object.create(null)
  };

  var RPC = {
    list: 'sitepass_list_admin_inquiry_rooms_v2',
    detail: 'sitepass_get_admin_inquiry_room_detail_v1',
    read: 'sitepass_mark_admin_inquiry_read_v1',
    reply: 'sitepass_send_admin_inquiry_reply_v1',
    status: 'sitepass_set_admin_inquiry_status_v1'
  };

  var state = {
    initialized: false,
    renderKickScheduled: false,

    listLoading: false,
    detailLoading: false,
    replySending: false,
    statusChanging: false,

    listItems: [],
    listPage: null,
    listSummary: null,

    selectedRoomId: '',
    detail: null,

    search: '',
    roomStatus: 'all',
    unreadOnly: false,

    listError: '',
    detailError: '',
    actionError: '',

    lastListLoadedAt: 0,
    listRequestId: 0,
    detailRequestId: 0,

    pendingReply: null,

    replyDrafts: Object.create(null),
    replyScrollToBottomRoomId: '',
    replyScrollRestore: null,
    olderMessageScrollAnchor: null,
    replyBottomTransaction: null,
    replyBottomSequence: 0,
    pageScrollRestore: null,
    realtime: {
      channel: null,
      channelKey: '',
      status: 'idle',
      error: '',
      starting: false,
      subscribed: false,
      eventCount: 0,
      refreshCount: 0,
      ignoredEventCount: 0,
      duplicateEventCount: 0,
      pendingRefresh: false,
      lastEventKey: '',
      lastEvent: null,
      lastRefreshAt: 0,
      refreshTimer: null,
      generation: 0,
      authSubscription: null
    }
  };

  var ROOM_STATUSES = [
    'waiting_admin',
    'in_progress',
    'waiting_member',
    'completed'
  ];

  var ROOM_STATUS_LABELS = {
    waiting_admin: '답변대기',
    in_progress: '처리중',
    waiting_member: '회원답변대기',
    completed: '처리완료'
  };

  function text(value) {
    return String(value === null || value === undefined ? '' : value);
  }

  function escapeHtml(value) {
    if (typeof window.escapeHtml === 'function') {
      try {
        return window.escapeHtml(text(value));
      } catch (error) {}
    }

    return text(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeRoomId(value) {
    var normalized = text(value).trim();

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized
    )
      ? normalized
      : '';
  }

  function isSuperAdmin() {
    try {
      return (
        typeof window.isSuperAdminLoggedIn === 'function' &&
        window.isSuperAdminLoggedIn()
      );
    } catch (error) {
      return false;
    }
  }

  function client() {
    var value = window.sitepassSupabase;

    if (!value || typeof value.rpc !== 'function') {
      return null;
    }

    return value;
  }

  function normalizePayload(data) {
    if (Array.isArray(data)) {
      return data[0] || {};
    }

    return data && typeof data === 'object'
      ? data
      : {};
  }

  async function callRpc(name, args) {
    var api = client();

    if (!api) {
      throw new Error('SUPABASE_CLIENT_NOT_READY');
    }

    var result = await api.rpc(name, args || {});

    if (!result) {
      throw new Error('EMPTY_RPC_RESULT');
    }

    if (result.error) {
      throw result.error;
    }

    return normalizePayload(result.data);
  }

  function currentSectionIsContacts() {
    try {
      return (
        typeof sitePassAdminSectionV578 !== 'undefined' &&
        sitePassAdminSectionV578 === 'contacts'
      );
    } catch (error) {
      return true;
    }
  }

  function capturePageScrollForNextRender() {
    if (!currentSectionIsContacts()) {
      state.pageScrollRestore = null;
      return false;
    }

    var left = Number(
      window.scrollX ?? window.pageXOffset ?? 0
    );
    var top = Number(
      window.scrollY ?? window.pageYOffset ?? 0
    );

    if (!Number.isFinite(left)) {
      left = 0;
    }

    if (!Number.isFinite(top)) {
      top = 0;
    }

    state.pageScrollRestore = {
      left: Math.max(0, left),
      top: Math.max(0, top)
    };

    return true;
  }

  function queuePageScrollRestoreAfterRender(options) {
    var snapshot = state.pageScrollRestore;

    if (
      !snapshot ||
      typeof snapshot !== 'object'
    ) {
      return false;
    }

    var settings = options || {};
    var keepSnapshot = settings.keepSnapshot === true;

    if (!keepSnapshot) {
      state.pageScrollRestore = null;
    }

    var left = Number(snapshot.left || 0);
    var top = Number(snapshot.top || 0);

    if (!Number.isFinite(left)) {
      left = 0;
    }

    if (!Number.isFinite(top)) {
      top = 0;
    }

    window.setTimeout(function () {
      if (!currentSectionIsContacts()) {
        return;
      }

      function restore() {
        try {
          window.scrollTo(
            Math.max(0, left),
            Math.max(0, top)
          );
        } catch (error) {}
      }

      restore();

      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(function () {
          if (!currentSectionIsContacts()) {
            return;
          }

          restore();

          window.requestAnimationFrame(function () {
            if (currentSectionIsContacts()) {
              restore();
            }
          });
        });
      }
    }, 0);

    return true;
  }

  function scheduleAdminRender(delay) {
    var wait = Number(delay || 0);

    try {
      if (typeof window.requestAdminRender487 === 'function') {
        window.requestAdminRender487(wait);
        return;
      }
    } catch (error) {}

    window.setTimeout(function () {
      try {
        if (typeof window.renderAdmin === 'function') {
          window.renderAdmin();
        }
      } catch (error) {}
    }, wait);
  }

  function formatTime(value) {
    var raw = text(value).trim();

    if (!raw) {
      return '';
    }

    var date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
      return raw;
    }

    try {
      return new Intl.DateTimeFormat('ko-KR', {
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch (error) {
      return date.toLocaleString('ko-KR');
    }
  }

  core.RPC = RPC;
  core.state = state;
  core.ROOM_STATUSES = ROOM_STATUSES;
  core.ROOM_STATUS_LABELS = ROOM_STATUS_LABELS;
  core.text = text;
  core.escapeHtml = escapeHtml;
  core.safeRoomId = safeRoomId;
  core.isSuperAdmin = isSuperAdmin;
  core.client = client;
  core.normalizePayload = normalizePayload;
  core.callRpc = callRpc;
  core.currentSectionIsContacts = currentSectionIsContacts;
  core.capturePageScrollForNextRender = capturePageScrollForNextRender;
  core.queuePageScrollRestoreAfterRender = queuePageScrollRestoreAfterRender;
  core.scheduleAdminRender = scheduleAdminRender;
  core.formatTime = formatTime;
  core.__modules.api = true;
  window[GLOBAL_NAME] = core;
})();
