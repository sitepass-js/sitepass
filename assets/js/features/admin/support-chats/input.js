/* SitePass v23.7.781r14-step93-admin-support-chats-message-scroll-transaction-fix
 * STEP93 admin support-chats / input
 */
(function () {
  'use strict';

  var core = window.SitePassAdminSupportChatsV93;
  if (!core || !core.state) {
    throw new Error('SUPPORT_CHATS_API_NOT_READY:input');
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

  function beginReplyBottomTransaction(roomId) {
    var target = core.beginReplyBottomTransaction;

    if (typeof target !== 'function') {
      state.replyScrollToBottomRoomId = safeRoomId(roomId);
      return Boolean(state.replyScrollToBottomRoomId);
    }

    return target.apply(core, arguments);
  }

  function loadDetail() {
    var target = core.loadDetail;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:loadDetail');
    }
    return target.apply(core, arguments);
  }

  function loadList() {
    var target = core.loadList;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:loadList');
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

  function uuid() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === 'function'
    ) {
      return window.crypto.randomUUID();
    }

    var bytes = new Uint8Array(16);

    if (
      window.crypto &&
      typeof window.crypto.getRandomValues === 'function'
    ) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }

    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;

    var hex = Array.prototype.map.call(bytes, function (value) {
      return value.toString(16).padStart(2, '0');
    });

    return (
      hex.slice(0, 4).join('') + '-' +
      hex.slice(4, 6).join('') + '-' +
      hex.slice(6, 8).join('') + '-' +
      hex.slice(8, 10).join('') + '-' +
      hex.slice(10, 16).join('')
    );
  }

  function currentReplyDraft() {
    var roomId = safeRoomId(state.selectedRoomId);

    if (!roomId) {
      return '';
    }

    return Object.prototype.hasOwnProperty.call(
      state.replyDrafts,
      roomId
    )
      ? text(state.replyDrafts[roomId])
      : '';
  }

  function setReplyDraft(value) {
    var roomId = safeRoomId(state.selectedRoomId);

    if (!roomId) {
      return false;
    }

    state.replyDrafts[roomId] =
      text(value).slice(0, 2000);

    return false;
  }

  function clearReplyDraft(roomId) {
    var id = safeRoomId(roomId);

    if (!id) {
      return;
    }

    delete state.replyDrafts[id];
  }

  function captureReplyScrollForNextRender(roomId) {
    var id = safeRoomId(roomId);
    var list = document.getElementById(
      'sitepassAdminInquiryMessageListV668'
    );

    if (!id || !list) {
      state.replyScrollRestore = null;
      return;
    }

    state.replyScrollRestore = {
      roomId: id,
      scrollTop: Number(list.scrollTop || 0)
    };
  }

  async function sendReply() {
    var roomId = safeRoomId(state.selectedRoomId);
    var input = document.getElementById(
      'sitepassAdminInquiryReplyV668'
    );

    var message = text(input && input.value).trim();

    state.actionError = '';

    if (!roomId) {
      state.actionError = '답변할 문의방을 선택해 주세요.';
      scheduleAdminRender(0);
      return false;
    }

    if (!message || message.length > 2000) {
      captureReplyScrollForNextRender(roomId);

      state.actionError =
        '답변은 1자 이상 2,000자 이하로 입력해 주세요.';

      scheduleAdminRender(0);
      return false;
    }

    if (state.replySending) {
      return false;
    }

    if (
      !state.pendingReply ||
      state.pendingReply.roomId !== roomId ||
      state.pendingReply.message !== message
    ) {
      state.pendingReply = {
        roomId: roomId,
        message: message,
        key: uuid()
      };
    }

    state.replySending = true;

    try {
      await callRpc(RPC.reply, {
        p_room_id: roomId,
        p_message_text: message,
        p_idempotency_key: state.pendingReply.key
      });

      state.pendingReply = null;
      clearReplyDraft(roomId);

      if (input) {
        input.value = '';
      }

      /*
       * 직접 답변 성공 시 중간 렌더를 여러 번 만들지 않는다.
       * 상세+목록을 먼저 갱신한 뒤 마지막 렌더 한 번에서
       * 방금 보낸 최신 메시지가 보이도록 하단으로 이동한다.
       */
      await loadDetail(
        roomId,
        {
          markRead: false,
          silentRender: true
        }
      );

      await loadList({
        reset: true,
        silentRender: true
      });

      beginReplyBottomTransaction(roomId);

      return false;
    } catch (error) {
      state.actionError = text(
        error && (error.message || error.code) || error
      );

      return false;
    } finally {
      state.replySending = false;
      scheduleAdminRender(0);
    }
  }

  core.uuid = uuid;
  core.currentReplyDraft = currentReplyDraft;
  core.setReplyDraft = setReplyDraft;
  core.clearReplyDraft = clearReplyDraft;
  core.sendReply = sendReply;
  core.__modules.input = true;
})();
