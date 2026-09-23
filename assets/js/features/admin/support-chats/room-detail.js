/* SitePass v23.7.784r14-step93-admin-support-chats-security-reinforcement
 * STEP93 admin support-chats / roomDetail
 */
(function () {
  'use strict';

  var core = window.SitePassAdminSupportChatsV93;
  if (!core || !core.state) {
    throw new Error('SUPPORT_CHATS_API_NOT_READY:roomDetail');
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

  function currentReplyDraft() {
    var target = core.currentReplyDraft;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:currentReplyDraft');
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

  function renderError() {
    var target = core.renderError;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:renderError');
    }
    return target.apply(core, arguments);
  }

  function renderRoomStatusActionButtonsV92() {
    var target = core.renderRoomStatusActionButtonsV92;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:renderRoomStatusActionButtonsV92');
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

  function sendReply() {
    var target = core.sendReply;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:sendReply');
    }
    return target.apply(core, arguments);
  }

  function setReplyDraft() {
    var target = core.setReplyDraft;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:setReplyDraft');
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

  function dedupeMessages(rows) {
    var map = new Map();

    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      var messageId = text(
        row && (row.messageId || row.message_id)
      ).trim();

      if (!messageId) {
        return;
      }

      map.set(messageId, row);
    });

    return Array.from(map.values()).sort(function (left, right) {
      var leftAt = new Date(
        left.createdAt || left.created_at || 0
      ).getTime();

      var rightAt = new Date(
        right.createdAt || right.created_at || 0
      ).getTime();

      if (leftAt !== rightAt) {
        return leftAt - rightAt;
      }

      return text(
        left.messageId || left.message_id
      ).localeCompare(
        text(right.messageId || right.message_id)
      );
    });
  }

  function detailCursorParams(cursor) {
    var value = cursor && typeof cursor === 'object'
      ? cursor
      : {};

    return {
      p_before_created_at:
        value.beforeCreatedAt ??
        value.createdAt ??
        value.before_created_at ??
        null,

      p_before_message_id:
        value.beforeMessageId ??
        value.messageId ??
        value.before_message_id ??
        null
    };
  }

  async function markRoomRead(roomId) {
    var id = safeRoomId(roomId);

    if (!id) {
      return { ok: false };
    }

    try {
      var result = await callRpc(RPC.read, {
        p_room_id: id
      });

      state.listItems = state.listItems.map(function (row) {
        if (
          safeRoomId(row.roomId || row.room_id) !== id
        ) {
          return row;
        }

        var copy = Object.assign({}, row);
        copy.adminUnreadCount = 0;
        copy.hasAdminUnread = false;
        copy.adminReadAt =
          result.adminReadAt ||
          result.admin_read_at ||
          copy.adminReadAt ||
          null;

        return copy;
      });

      if (
        state.detail &&
        state.detail.room &&
        safeRoomId(
          state.detail.room.roomId ||
          state.detail.room.room_id
        ) === id
      ) {
        state.detail.room.adminUnreadCount = 0;
        state.detail.room.hasAdminUnread = false;
        state.detail.room.adminReadAt =
          result.adminReadAt ||
          result.admin_read_at ||
          state.detail.room.adminReadAt ||
          null;
      }

      return {
        ok: true,
        result: result
      };
    } catch (error) {
      state.actionError = text(
        error && (error.message || error.code) || error
      );

      return {
        ok: false,
        error: state.actionError
      };
    }
  }

  async function loadDetail(roomId, options) {
    var settings = options || {};
    var id = safeRoomId(roomId);

    if (!id || !isSuperAdmin()) {
      return { ok: false };
    }

    var appendOlder = Boolean(settings.appendOlder);
    var silentRender = Boolean(settings.silentRender);
    var preserveScroll = Boolean(settings.preserveScroll);
    var preservePageScroll = Boolean(settings.preservePageScroll);
    var scrollSnapshot = null;

    if (preserveScroll) {
      var currentList = document.getElementById(
        'sitepassAdminInquiryMessageListV668'
      );

      if (currentList) {
        var distanceFromBottom = Math.max(
          0,
          currentList.scrollHeight -
            currentList.clientHeight -
            currentList.scrollTop
        );

        scrollSnapshot = {
          roomId: id,
          scrollTop: currentList.scrollTop,
          nearBottom: distanceFromBottom <= 80
        };
      }
    }

    if (state.detailLoading) {
      return { ok: true, loading: true };
    }

    var requestId = ++state.detailRequestId;
    state.detailLoading = true;
    state.detailError = '';
    state.actionError = '';

    if (!silentRender) {
      if (preservePageScroll) {
        capturePageScrollForNextRender();
      }
      scheduleAdminRender(0);
    }

    try {
      var currentMessages =
        state.detail &&
        state.detail.messages &&
        Array.isArray(state.detail.messages.items)
          ? state.detail.messages.items
          : [];

      var cursor = appendOlder
        ? detailCursorParams(
            state.detail &&
            state.detail.messages &&
            state.detail.messages.nextCursor
          )
        : {
            p_before_created_at: null,
            p_before_message_id: null
          };

      var payload = await callRpc(RPC.detail, {
        p_room_id: id,
        p_limit: 50,
        p_before_created_at:
          cursor.p_before_created_at ?? null,
        p_before_message_id:
          cursor.p_before_message_id ?? null
      });

      if (requestId !== state.detailRequestId) {
        return { ok: false, stale: true };
      }

      var messageBlock =
        payload.messages &&
        typeof payload.messages === 'object'
          ? payload.messages
          : {};

      var receivedItems = Array.isArray(messageBlock.items)
        ? messageBlock.items
        : [];

      payload.messages = Object.assign({}, messageBlock, {
        items: appendOlder
          ? dedupeMessages(receivedItems.concat(currentMessages))
          : dedupeMessages(receivedItems)
      });

      if (appendOlder) {
        markOlderMessageScrollAnchorReady(id);
      }

      state.detail = payload;
      state.selectedRoomId = id;

      if (settings.markRead !== false) {
        await markRoomRead(id);
      }

      window.setTimeout(function () {
        var list = document.getElementById(
          'sitepassAdminInquiryMessageListV668'
        );

        if (!list || appendOlder) {
          return;
        }

        if (
          preserveScroll &&
          scrollSnapshot &&
          safeRoomId(state.selectedRoomId) ===
            scrollSnapshot.roomId
        ) {
          if (scrollSnapshot.nearBottom) {
            list.scrollTop = list.scrollHeight;
            return;
          }

          var maxTop = Math.max(
            0,
            list.scrollHeight - list.clientHeight
          );

          list.scrollTop = Math.max(
            0,
            Math.min(
              scrollSnapshot.scrollTop,
              maxTop
            )
          );

          return;
        }

        list.scrollTop = list.scrollHeight;
      }, preserveScroll ? 160 : 30);

      return {
        ok: true,
        detail: state.detail
      };
    } catch (error) {
      state.detailError = text(
        error && (error.message || error.code) || error
      );

      return {
        ok: false,
        error: state.detailError
      };
    } finally {
      if (requestId === state.detailRequestId) {
        state.detailLoading = false;

        if (!silentRender) {
          if (preservePageScroll) {
            capturePageScrollForNextRender();
          }
          scheduleAdminRender(0);
        }
      }
    }
  }

  async function openRoom(roomId) {
    var id = safeRoomId(roomId);

    if (!id) {
      return false;
    }

    state.selectedRoomId = id;
    state.detail = null;
    state.detailError = '';
    state.actionError = '';

    scheduleAdminRender(0);
    await loadDetail(id, { markRead: true });

    if (
      safeRoomId(state.selectedRoomId) === id &&
      state.detail &&
      state.detail.room
    ) {
      beginReplyBottomTransaction(id);
    }

    return false;
  }

  async function loadOlderMessages() {
    if (
      !state.selectedRoomId ||
      !state.detail ||
      !state.detail.messages ||
      !state.detail.messages.nextCursor
    ) {
      return false;
    }

    var roomId = safeRoomId(state.selectedRoomId);

    beginOlderMessageScrollAnchor(roomId);

    var result = await loadDetail(
      roomId,
      {
        appendOlder: true,
        markRead: false,
        preservePageScroll: true
      }
    );

    if (!result || result.ok !== true) {
      clearOlderMessageScrollAnchor(roomId, false);
    }

    return false;
  }

  function renderMessages() {
    var messageBlock =
      state.detail &&
      state.detail.messages &&
      typeof state.detail.messages === 'object'
        ? state.detail.messages
        : {};

    var rows = Array.isArray(messageBlock.items)
      ? messageBlock.items
      : [];

    var olderButton = messageBlock.nextCursor
      ? (
          '<button type="button" ' +
          'class="ghost sitepass-admin-inquiry-older-v668" ' +
          'onclick="return SitePassAdminInquiryV675.loadOlderMessages()">' +
          '이전 메시지 더보기' +
          '</button>'
        )
      : '';

    var body = rows.map(function (row) {
      var senderType = text(
        row.senderType ||
        row.sender_type ||
        ''
      ).toLowerCase();

      var admin = senderType === 'admin';
      var senderName = text(
        row.senderName ||
        row.sender_name ||
        (admin ? '관리자' : '회원')
      );

      var messageText = text(
        row.messageText ||
        row.message_text ||
        ''
      );

      var createdAt = formatTime(
        row.createdAt ||
        row.created_at
      );

      return (
        '<div class="sitepass-admin-inquiry-message-v668 ' +
        (admin ? 'admin' : 'member') +
        '">' +

          '<div class="sitepass-admin-inquiry-message-name-v668">' +
            escapeHtml(senderName) +
          '</div>' +

          '<div class="sitepass-admin-inquiry-message-bubble-v668">' +
            escapeHtml(messageText).replace(/\n/g, '<br>') +
          '</div>' +

          '<div class="sitepass-admin-inquiry-message-time-v668">' +
            escapeHtml(createdAt) +
          '</div>' +
        '</div>'
      );
    }).join('');

    if (!body) {
      body = (
        '<div class="sitepass-admin-inquiry-empty-v668">' +
        '표시할 메시지가 없습니다.' +
        '</div>'
      );
    }

    return (
      olderButton +
      '<div id="sitepassAdminInquiryMessageListV668" ' +
      'data-sitepass-room-id="' +
      escapeHtml(safeRoomId(state.selectedRoomId)) + '" ' +
      'class="sitepass-admin-inquiry-messages-v668">' +
      body +
      '</div>'
    );
  }

  var REPLY_BOTTOM_HOLD_MS = 4500;
  var REPLY_BOTTOM_PROGRAMMATIC_SCROLL_MS = 180;

  function messageListRoomId(list) {
    if (!list || typeof list.getAttribute !== 'function') {
      return '';
    }

    return safeRoomId(
      list.getAttribute('data-sitepass-room-id')
    );
  }

  function selectedDetailRoomId() {
    return safeRoomId(
      state.detail &&
      state.detail.room &&
      (
        state.detail.room.roomId ||
        state.detail.room.room_id
      )
    );
  }

  function clearReplyBottomTimer(transaction) {
    if (!transaction || !transaction.timerId) {
      return;
    }

    try {
      window.clearTimeout(transaction.timerId);
    } catch (error) {}

    transaction.timerId = null;
  }

  function cancelReplyBottomTransaction(roomId, force) {
    var transaction = state.replyBottomTransaction;
    var requestedRoomId = safeRoomId(roomId);

    if (!transaction || typeof transaction !== 'object') {
      if (
        force === true ||
        !requestedRoomId ||
        safeRoomId(state.replyScrollToBottomRoomId) ===
          requestedRoomId
      ) {
        state.replyScrollToBottomRoomId = '';
      }
      return false;
    }

    var transactionRoomId = safeRoomId(
      transaction.roomId
    );

    if (
      force !== true &&
      requestedRoomId &&
      requestedRoomId !== transactionRoomId
    ) {
      return false;
    }

    clearReplyBottomTimer(transaction);
    state.replyBottomTransaction = null;

    if (
      !transactionRoomId ||
      safeRoomId(state.replyScrollToBottomRoomId) ===
        transactionRoomId
    ) {
      state.replyScrollToBottomRoomId = '';
    }

    return true;
  }

  function beginReplyBottomTransaction(roomId) {
    var id = safeRoomId(roomId);

    if (!id) {
      cancelReplyBottomTransaction('', true);
      return false;
    }

    cancelReplyBottomTransaction('', true);

    var sequence = Number(
      state.replyBottomSequence || 0
    ) + 1;

    state.replyBottomSequence = sequence;
    state.replyScrollRestore = null;
    state.replyScrollToBottomRoomId = id;

    var transaction = {
      roomId: id,
      sequence: sequence,
      expiresAt: Date.now() + REPLY_BOTTOM_HOLD_MS,
      programmaticUntil: 0,
      timerId: null
    };

    state.replyBottomTransaction = transaction;

    transaction.timerId = window.setTimeout(function () {
      var current = state.replyBottomTransaction;

      if (
        current &&
        current.sequence === sequence &&
        safeRoomId(current.roomId) === id
      ) {
        cancelReplyBottomTransaction(id, false);
      }
    }, REPLY_BOTTOM_HOLD_MS);

    return true;
  }

  function activeReplyBottomTransaction(roomId) {
    var id = safeRoomId(roomId);
    var transaction = state.replyBottomTransaction;

    if (
      (!transaction || typeof transaction !== 'object') &&
      id &&
      safeRoomId(state.replyScrollToBottomRoomId) === id
    ) {
      beginReplyBottomTransaction(id);
      transaction = state.replyBottomTransaction;
    }

    if (!transaction || typeof transaction !== 'object') {
      return null;
    }

    if (
      !id ||
      safeRoomId(transaction.roomId) !== id ||
      Number(transaction.expiresAt || 0) <= Date.now()
    ) {
      cancelReplyBottomTransaction('', true);
      return null;
    }

    return transaction;
  }

  function clearOlderMessageScrollAnchor(roomId, force) {
    var anchor = state.olderMessageScrollAnchor;
    var requestedRoomId = safeRoomId(roomId);

    if (!anchor || typeof anchor !== 'object') {
      state.olderMessageScrollAnchor = null;
      return false;
    }

    var anchorRoomId = safeRoomId(anchor.roomId);

    if (
      force !== true &&
      requestedRoomId &&
      requestedRoomId !== anchorRoomId
    ) {
      return false;
    }

    state.olderMessageScrollAnchor = null;
    return true;
  }

  function beginOlderMessageScrollAnchor(roomId) {
    var id = safeRoomId(roomId);
    var list = document.getElementById(
      'sitepassAdminInquiryMessageListV668'
    );

    if (!id || !list) {
      clearOlderMessageScrollAnchor('', true);
      return false;
    }

    var renderedRoomId = messageListRoomId(list);

    if (renderedRoomId && renderedRoomId !== id) {
      clearOlderMessageScrollAnchor('', true);
      return false;
    }

    var scrollTop = Number(list.scrollTop || 0);
    var scrollHeight = Number(list.scrollHeight || 0);

    if (!Number.isFinite(scrollTop)) {
      scrollTop = 0;
    }

    if (!Number.isFinite(scrollHeight)) {
      scrollHeight = 0;
    }

    state.olderMessageScrollAnchor = {
      roomId: id,
      scrollTop: Math.max(0, scrollTop),
      scrollHeight: Math.max(0, scrollHeight),
      ready: false
    };

    return true;
  }

  function markOlderMessageScrollAnchorReady(roomId) {
    var id = safeRoomId(roomId);
    var anchor = state.olderMessageScrollAnchor;

    if (
      !id ||
      !anchor ||
      typeof anchor !== 'object' ||
      safeRoomId(anchor.roomId) !== id
    ) {
      return false;
    }

    anchor.ready = true;
    return true;
  }

  function restoreOlderMessageScrollAnchorAcrossRender() {
    var anchor = state.olderMessageScrollAnchor;

    if (
      !anchor ||
      typeof anchor !== 'object' ||
      anchor.ready !== true
    ) {
      return false;
    }

    var roomId = safeRoomId(anchor.roomId);

    if (
      !roomId ||
      safeRoomId(state.selectedRoomId) !== roomId
    ) {
      clearOlderMessageScrollAnchor('', true);
      return false;
    }

    var previousTop = Number(anchor.scrollTop || 0);
    var previousHeight = Number(anchor.scrollHeight || 0);

    if (!Number.isFinite(previousTop)) {
      previousTop = 0;
    }

    if (!Number.isFinite(previousHeight)) {
      previousHeight = 0;
    }

    clearOlderMessageScrollAnchor(roomId, false);
    state.replyScrollRestore = null;

    window.setTimeout(function () {
      if (
        safeRoomId(state.selectedRoomId) !== roomId
      ) {
        return;
      }

      function restore() {
        var list = document.getElementById(
          'sitepassAdminInquiryMessageListV668'
        );

        if (
          !list ||
          (
            messageListRoomId(list) &&
            messageListRoomId(list) !== roomId
          )
        ) {
          return;
        }

        var currentHeight = Number(list.scrollHeight || 0);

        if (!Number.isFinite(currentHeight)) {
          currentHeight = 0;
        }

        var addedHeight = Math.max(
          0,
          currentHeight - previousHeight
        );

        var maxTop = Math.max(
          0,
          currentHeight - list.clientHeight
        );

        list.scrollTop = Math.max(
          0,
          Math.min(
            previousTop + addedHeight,
            maxTop
          )
        );
      }

      restore();

      window.requestAnimationFrame(function () {
        if (
          safeRoomId(state.selectedRoomId) === roomId
        ) {
          restore();

          window.requestAnimationFrame(function () {
            if (
              safeRoomId(state.selectedRoomId) === roomId
            ) {
              restore();
            }
          });
        }
      });
    }, 0);

    return true;
  }

  function captureMessageScrollBeforeRender() {
    var roomId = safeRoomId(state.selectedRoomId);

    if (
      !roomId ||
      selectedDetailRoomId() !== roomId ||
      activeReplyBottomTransaction(roomId)
    ) {
      return false;
    }

    var list = document.getElementById(
      'sitepassAdminInquiryMessageListV668'
    );

    if (!list) {
      return false;
    }

    var renderedRoomId = messageListRoomId(list);

    if (renderedRoomId && renderedRoomId !== roomId) {
      return false;
    }

    var scrollTop = Number(list.scrollTop || 0);

    if (!Number.isFinite(scrollTop)) {
      scrollTop = 0;
    }

    state.replyScrollRestore = {
      roomId: roomId,
      scrollTop: Math.max(0, scrollTop)
    };

    return true;
  }

  function preserveReplyScrollAcrossRender() {
    if (restoreOlderMessageScrollAnchorAcrossRender()) {
      return;
    }

    var snapshot = state.replyScrollRestore;

    if (
      !snapshot ||
      typeof snapshot !== 'object'
    ) {
      return;
    }

    var roomId = safeRoomId(snapshot.roomId);

    if (
      !roomId ||
      safeRoomId(state.selectedRoomId) !== roomId
    ) {
      state.replyScrollRestore = null;
      return;
    }

    var scrollTop = Number(snapshot.scrollTop || 0);

    if (!Number.isFinite(scrollTop)) {
      scrollTop = 0;
    }

    state.replyScrollRestore = null;

    window.setTimeout(function () {
      if (
        safeRoomId(state.selectedRoomId) !== roomId
      ) {
        return;
      }

      function restore() {
        var list = document.getElementById(
          'sitepassAdminInquiryMessageListV668'
        );

        if (
          !list ||
          (
            messageListRoomId(list) &&
            messageListRoomId(list) !== roomId
          )
        ) {
          return;
        }

        var maxTop = Math.max(
          0,
          list.scrollHeight - list.clientHeight
        );

        list.scrollTop = Math.max(
          0,
          Math.min(scrollTop, maxTop)
        );
      }

      restore();

      window.requestAnimationFrame(function () {
        if (
          safeRoomId(state.selectedRoomId) === roomId
        ) {
          restore();

          window.requestAnimationFrame(function () {
            if (
              safeRoomId(state.selectedRoomId) === roomId
            ) {
              restore();
            }
          });
        }
      });
    }, 0);
  }

  function preserveReplyFocusAcrossRender() {
    var active = document.activeElement;

    if (
      !active ||
      active.id !== 'sitepassAdminInquiryReplyV668'
    ) {
      return;
    }

    var roomId = safeRoomId(state.selectedRoomId);

    if (!roomId) {
      return;
    }

    var valueLength = text(active.value).length;

    var selectionStart =
      typeof active.selectionStart === 'number'
        ? active.selectionStart
        : valueLength;

    var selectionEnd =
      typeof active.selectionEnd === 'number'
        ? active.selectionEnd
        : selectionStart;

    window.setTimeout(function () {
      if (
        safeRoomId(state.selectedRoomId) !== roomId
      ) {
        return;
      }

      var input = document.getElementById(
        'sitepassAdminInquiryReplyV668'
      );

      if (!input) {
        return;
      }

      /*
       * 렌더 도중 textarea가 교체되어 body로 focus가 빠진 경우만
       * 기존 작성 focus를 복원한다.
       *
       * 사용자가 실제로 다른 컨트롤을 선택한 경우에는
       * 강제로 textarea로 focus를 빼앗지 않는다.
       */
      var currentActive = document.activeElement;

      if (
        currentActive &&
        currentActive !== document.body &&
        currentActive !== document.documentElement &&
        currentActive !== input
      ) {
        return;
      }

      try {
        input.focus({
          preventScroll: true
        });
      } catch (error) {
        try {
          input.focus();
        } catch (ignore) {}
      }

      try {
        var length = text(input.value).length;

        var start = Math.max(
          0,
          Math.min(selectionStart, length)
        );

        var end = Math.max(
          start,
          Math.min(selectionEnd, length)
        );

        input.setSelectionRange(start, end);
      } catch (error) {}
    }, 0);
  }

  function installReplyBottomUserRelease(
    list,
    transaction
  ) {
    if (
      !list ||
      !transaction ||
      list.__sitepassReplyBottomSequence ===
        transaction.sequence
    ) {
      return;
    }

    list.__sitepassReplyBottomSequence =
      transaction.sequence;

    function release() {
      cancelReplyBottomTransaction(
        transaction.roomId,
        false
      );
    }

    ['wheel', 'touchstart', 'pointerdown', 'keydown']
      .forEach(function (eventName) {
        list.addEventListener(
          eventName,
          release,
          {
            passive: true,
            once: true
          }
        );
      });

    list.addEventListener(
      'scroll',
      function () {
        var current = activeReplyBottomTransaction(
          transaction.roomId
        );

        if (
          !current ||
          current.sequence !== transaction.sequence ||
          Date.now() <= Number(
            current.programmaticUntil || 0
          )
        ) {
          return;
        }

        var distanceFromBottom = Math.max(
          0,
          list.scrollHeight -
            list.clientHeight -
            list.scrollTop
        );

        if (distanceFromBottom > 4) {
          release();
        }
      },
      { passive: true }
    );
  }

  function restoreReplyBottom(roomId, sequence) {
    var transaction = activeReplyBottomTransaction(roomId);

    if (
      !transaction ||
      transaction.sequence !== sequence ||
      safeRoomId(state.selectedRoomId) !== roomId
    ) {
      return false;
    }

    var list = document.getElementById(
      'sitepassAdminInquiryMessageListV668'
    );

    if (
      !list ||
      (
        messageListRoomId(list) &&
        messageListRoomId(list) !== roomId
      )
    ) {
      return false;
    }

    installReplyBottomUserRelease(list, transaction);
    transaction.programmaticUntil =
      Date.now() +
      REPLY_BOTTOM_PROGRAMMATIC_SCROLL_MS;
    list.scrollTop = list.scrollHeight;

    return true;
  }

  function preserveReplyBottomAcrossRender() {
    var roomId = safeRoomId(state.selectedRoomId);
    var transaction = activeReplyBottomTransaction(roomId);

    if (!transaction) {
      return false;
    }

    var sequence = transaction.sequence;

    window.setTimeout(function () {
      restoreReplyBottom(roomId, sequence);

      window.requestAnimationFrame(function () {
        restoreReplyBottom(roomId, sequence);

        window.requestAnimationFrame(function () {
          restoreReplyBottom(roomId, sequence);
        });
      });
    }, 0);

    return true;
  }

  function renderDetail() {
    captureMessageScrollBeforeRender();
    preserveReplyFocusAcrossRender();

    if (!preserveReplyBottomAcrossRender()) {
      preserveReplyScrollAcrossRender();
    }
    if (!state.selectedRoomId) {
      return (
        '<div class="sitepass-admin-inquiry-detail-empty-v668">' +
          '<strong>문의방을 선택해 주세요.</strong>' +
          '<span>왼쪽 목록에서 회원 문의를 선택하면 대화와 답변창이 표시됩니다.</span>' +
        '</div>'
      );
    }

    if (state.detailLoading && !state.detail) {
      return (
        '<div class="sitepass-admin-inquiry-detail-empty-v668">' +
          '<strong>문의 내용을 불러오는 중입니다.</strong>' +
        '</div>'
      );
    }

    if (!state.detail || !state.detail.room) {
      return (
        renderError(
          state.detailError ||
          '문의방 상세를 불러오지 못했습니다.'
        )
      );
    }

    var room = state.detail.room;
    var member =
      room.member &&
      typeof room.member === 'object'
        ? room.member
        : {};

    var name = text(
      room.memberDisplayName ||
      room.member_display_name ||
      room.loginId ||
      room.login_id ||
      member.name ||
      member.loginId ||
      member.login_id ||
      '회원'
    );

    var meta = [
      text(
        room.loginId ||
        room.login_id ||
        member.loginId ||
        member.login_id ||
        ''
      ),
      text(
        room.companyName ||
        room.company_name ||
        member.companyName ||
        member.company_name ||
        ''
      ),
      text(
        room.phoneMasked ||
        room.phone_masked ||
        member.phoneMasked ||
        member.phone_masked ||
        ''
      ),
      text(
        room.emailMasked ||
        room.email_masked ||
        member.emailMasked ||
        member.email_masked ||
        ''
      )
    ].filter(Boolean).join(' · ');

    var roomStatus = normalizeRoomStatus(
      room.roomStatus ||
      room.room_status
    );

    return (
      '<div class="sitepass-admin-inquiry-detail-head-v668">' +
        '<div>' +
          '<h3>' + escapeHtml(name) + '</h3>' +
          '<div class="small">' +
            escapeHtml(meta || '회원 정보 없음') +
          '</div>' +
        '</div>' +

        '<div class="sitepass-admin-inquiry-detail-actions-v670">' +
          renderRoomStatusBadge(roomStatus) +
          renderRoomStatusActionButtonsV92(roomStatus) +
        '</div>' +
      '</div>' +

      renderError(state.detailError) +
      renderError(state.actionError) +

      renderMessages() +

      '<div class="sitepass-admin-inquiry-compose-v668">' +
        '<textarea id="sitepassAdminInquiryReplyV668" ' +
        'maxlength="2000" rows="3" ' +
        'oninput="return SitePassAdminInquiryV675.setReplyDraft(this.value)" ' +
        'placeholder="회원에게 보낼 답변을 입력하세요.">' +
          escapeHtml(currentReplyDraft()) +
        '</textarea>' +

        '<div class="sitepass-admin-inquiry-compose-foot-v668">' +
          '<span>최대 2,000자</span>' +

          '<button type="button" class="primary" ' +
          (state.replySending ? 'disabled ' : '') +
          'onclick="return SitePassAdminInquiryV675.sendReply()">' +
            (state.replySending ? '전송 중' : '답변 보내기') +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  core.dedupeMessages = dedupeMessages;
  core.detailCursorParams = detailCursorParams;
  core.markRoomRead = markRoomRead;
  core.loadDetail = loadDetail;
  core.openRoom = openRoom;
  core.loadOlderMessages = loadOlderMessages;
  core.renderMessages = renderMessages;
  core.captureMessageScrollBeforeRender =
    captureMessageScrollBeforeRender;
  core.beginReplyBottomTransaction =
    beginReplyBottomTransaction;
  core.cancelReplyBottomTransaction =
    cancelReplyBottomTransaction;
  core.preserveReplyFocusAcrossRender = preserveReplyFocusAcrossRender;
  core.preserveReplyBottomAcrossRender = preserveReplyBottomAcrossRender;
  core.renderDetail = renderDetail;
  core.__modules.roomDetail = true;
})();
