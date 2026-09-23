/* SitePass v23.7.779r14-step93-admin-support-chats-render-scroll-stability-fix
 * STEP93 admin support-chats / roomList
 */
(function () {
  'use strict';

  var core = window.SitePassAdminSupportChatsV93;
  if (!core || !core.state) {
    throw new Error('SUPPORT_CHATS_API_NOT_READY:roomList');
  }
  var state = core.state;
  var RPC = core.RPC;
  var ROOM_STATUSES = core.ROOM_STATUSES;
  var ROOM_STATUS_LABELS = core.ROOM_STATUS_LABELS;

  function callRpc() {
    var target = core.callRpc;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:callRpc');
    }
    return target.apply(core, arguments);
  }

  function escapeHtml() {
    var target = core.escapeHtml;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:escapeHtml');
    }
    return target.apply(core, arguments);
  }

  function formatTime() {
    var target = core.formatTime;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:formatTime');
    }
    return target.apply(core, arguments);
  }

  function isSuperAdmin() {
    var target = core.isSuperAdmin;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:isSuperAdmin');
    }
    return target.apply(core, arguments);
  }

  function normalizeRoomStatus() {
    var target = core.normalizeRoomStatus;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:normalizeRoomStatus');
    }
    return target.apply(core, arguments);
  }

  function openRoom() {
    var target = core.openRoom;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:openRoom');
    }
    return target.apply(core, arguments);
  }

  function renderRoomStatusBadge() {
    var target = core.renderRoomStatusBadge;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:renderRoomStatusBadge');
    }
    return target.apply(core, arguments);
  }

  function safeRoomId() {
    var target = core.safeRoomId;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:safeRoomId');
    }
    return target.apply(core, arguments);
  }

  function capturePageScrollForNextRender() {
    var target = core.capturePageScrollForNextRender;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:capturePageScrollForNextRender');
    }
    return target.apply(core, arguments);
  }

  function scheduleAdminRender() {
    var target = core.scheduleAdminRender;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:scheduleAdminRender');
    }
    return target.apply(core, arguments);
  }

  function text() {
    var target = core.text;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:text');
    }
    return target.apply(core, arguments);
  }

  function dedupeRooms(rows) {
    var map = new Map();

    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      var roomId = safeRoomId(
        row && (row.roomId || row.room_id)
      );

      if (!roomId) {
        return;
      }

      map.set(roomId, row);
    });

    return Array.from(map.values());
  }

  function listCursorParams(cursor) {
    var value = cursor && typeof cursor === 'object'
      ? cursor
      : {};

    return {
      p_before_queue_rank:
        value.beforeQueueRank ??
        value.queueRank ??
        value.before_queue_rank ??
        null,

      p_before_activity_at:
        value.beforeActivityAt ??
        value.activityAt ??
        value.before_activity_at ??
        null,

      p_before_room_id:
        value.beforeRoomId ??
        value.roomId ??
        value.before_room_id ??
        null
    };
  }

  async function loadList(options) {
    var settings = options || {};
    var reset = settings.reset !== false;
    var silentRender = Boolean(settings.silentRender);
    var preservePageScroll = Boolean(settings.preservePageScroll);

    if (!isSuperAdmin()) {
      return { ok: false, skipped: true };
    }

    if (state.listLoading) {
      return { ok: true, loading: true };
    }

    var requestId = ++state.listRequestId;
    state.listLoading = true;
    state.listError = '';

    if (reset) {
      state.listPage = null;
    }

    if (!silentRender) {
      if (preservePageScroll) {
        capturePageScrollForNextRender();
      }
      scheduleAdminRender(0);
    }

    try {
      var cursor = reset
        ? {}
        : listCursorParams(
            state.listPage && state.listPage.nextCursor
          );

      var payload = await callRpc(RPC.list, {
        p_search: state.search || null,
        p_room_status: state.roomStatus || 'all',
        p_unread_only: Boolean(state.unreadOnly),
        p_limit: 30,
        p_before_queue_rank:
          cursor.p_before_queue_rank ?? null,
        p_before_activity_at:
          cursor.p_before_activity_at ?? null,
        p_before_room_id:
          cursor.p_before_room_id ?? null
      });

      if (requestId !== state.listRequestId) {
        return { ok: false, stale: true };
      }

      var rows = Array.isArray(payload.items)
        ? payload.items
        : [];

      state.listItems = reset
        ? dedupeRooms(rows)
        : dedupeRooms(state.listItems.concat(rows));

      state.listPage = payload.page || {};
      state.listSummary = payload.summary || {};
      state.lastListLoadedAt = Date.now();
      state.initialized = true;

      return {
        ok: true,
        rows: state.listItems
      };
    } catch (error) {
      state.listError = text(
        error && (error.message || error.code) || error
      );

      return {
        ok: false,
        error: state.listError
      };
    } finally {
      if (requestId === state.listRequestId) {
        state.listLoading = false;

        if (!silentRender) {
          if (preservePageScroll) {
            capturePageScrollForNextRender();
          }
          scheduleAdminRender(0);
        }
      }
    }
  }

  function loadMoreRooms() {
    if (
      !state.listPage ||
      !state.listPage.hasMore ||
      !state.listPage.nextCursor
    ) {
      return false;
    }

    loadList({
      reset: false,
      preservePageScroll: true
    });

    return false;
  }

  function renderRoomRows() {
    if (state.listLoading && !state.listItems.length) {
      return (
        '<div class="sitepass-admin-inquiry-empty-v668">' +
        '문의 목록을 불러오는 중입니다.' +
        '</div>'
      );
    }

    if (!state.listItems.length) {
      return (
        '<div class="sitepass-admin-inquiry-empty-v668">' +
        '조건에 맞는 문의방이 없습니다.' +
        '</div>'
      );
    }

    return state.listItems.map(function (row) {
      var roomId = safeRoomId(
        row.roomId || row.room_id
      );

      var selected =
        roomId &&
        roomId === state.selectedRoomId
          ? ' selected'
          : '';

      var name = text(
        row.memberDisplayName ||
        row.member_display_name ||
        row.loginId ||
        row.login_id ||
        '회원'
      );

      var loginId = text(
        row.loginId ||
        row.login_id ||
        ''
      );

      var company = text(
        row.companyName ||
        row.company_name ||
        ''
      );

      var phone = text(
        row.phoneMasked ||
        row.phone_masked ||
        ''
      );

      var lastMessage =
        row.lastMessage ||
        row.last_message ||
        {};

      var preview = text(
        lastMessage.messageTextPreview ||
        lastMessage.message_text_preview ||
        '문의 내용이 없습니다.'
      );

      var activityAt = formatTime(
        row.activityAt ||
        row.activity_at ||
        lastMessage.createdAt ||
        lastMessage.created_at
      );

      var unread = Number(
        row.adminUnreadCount ??
        row.admin_unread_count ??
        0
      );

      var roomStatus = normalizeRoomStatus(
        row.roomStatus ||
        row.room_status
      );

      var meta = [
        loginId,
        company,
        phone
      ].filter(Boolean).join(' · ');

      var unreadHtml = unread > 0
        ? (
            '<span class="sitepass-admin-inquiry-unread-v668">' +
            unread +
            '</span>'
          )
        : '';

      return (
        '<button type="button" ' +
        'class="sitepass-admin-inquiry-room-v668' +
        selected +
        '" onclick="return SitePassAdminInquiryV675.openRoom(\'' +
        roomId +
        '\')">' +

          '<span class="sitepass-admin-inquiry-room-head-v668">' +
            '<strong>' + escapeHtml(name) + '</strong>' +

            '<span class="sitepass-admin-inquiry-room-head-actions-v670">' +
              renderRoomStatusBadge(roomStatus) +
              unreadHtml +
            '</span>' +
          '</span>' +

          '<span class="sitepass-admin-inquiry-room-meta-v668">' +
            escapeHtml(meta || '회원 정보 없음') +
          '</span>' +

          '<span class="sitepass-admin-inquiry-room-preview-v668">' +
            escapeHtml(preview) +
          '</span>' +

          '<span class="sitepass-admin-inquiry-room-time-v668">' +
            escapeHtml(activityAt) +
          '</span>' +
        '</button>'
      );
    }).join('');
  }

  core.dedupeRooms = dedupeRooms;
  core.listCursorParams = listCursorParams;
  core.loadList = loadList;
  core.loadMoreRooms = loadMoreRooms;
  core.renderRoomRows = renderRoomRows;
  core.__modules.roomList = true;
})();
