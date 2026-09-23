/* SitePass v23.7.779r14-step93-admin-support-chats-render-scroll-stability-fix
 * STEP93 admin support-chats / status
 */
(function () {
  'use strict';

  var core = window.SitePassAdminSupportChatsV93;
  if (!core || !core.state) {
    throw new Error('SUPPORT_CHATS_API_NOT_READY:status');
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

  function captureMessageScrollForNextRender(roomId) {
    var id = safeRoomId(roomId);
    var list = document.getElementById(
      'sitepassAdminInquiryMessageListV668'
    );

    if (!id || !list) {
      return false;
    }

    state.replyScrollRestore = {
      roomId: id,
      scrollTop: Number(list.scrollTop || 0)
    };

    return true;
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

  function normalizeRoomStatus(value) {
    var normalized = text(value).trim().toLowerCase();

    if (normalized === 'active') {
      return 'in_progress';
    }

    if (normalized === 'closed') {
      return 'completed';
    }

    return ROOM_STATUSES.indexOf(normalized) >= 0
      ? normalized
      : '';
  }

  function roomStatusLabel(value) {
    var normalized = normalizeRoomStatus(value);

    return ROOM_STATUS_LABELS[normalized] || '상태미정';
  }

  function renderRoomStatusBadge(value) {
    var normalized = normalizeRoomStatus(value);

    if (!normalized) {
      return '';
    }

    return (
      '<span class="sitepass-admin-inquiry-status-badge-v670 ' +
      normalized +
      '">' +
      escapeHtml(roomStatusLabel(normalized)) +
      '</span>'
    );
  }

  function renderRoomStatusOptions(value) {
    var normalized = normalizeRoomStatus(value);

    return ROOM_STATUSES.map(function (status) {
      return (
        '<option value="' + status + '"' +
        (normalized === status ? ' selected' : '') +
        '>' +
        escapeHtml(ROOM_STATUS_LABELS[status]) +
        '</option>'
      );
    }).join('');
  }

  function renderRoomStatusActionButtonsV92(value) {
    var normalized = normalizeRoomStatus(value);
    var buttons = '';

    if (normalized === 'waiting_admin') {
      buttons =
        '<button type="button" class="ghost sitepass-admin-inquiry-status-action-v92" ' +
        (state.statusChanging ? 'disabled ' : '') +
        'onclick="return SitePassAdminInquiryV675.changeSelectedRoomStatus(\'in_progress\')">' +
          (state.statusChanging ? '처리 중' : '처리 시작') +
        '</button>' +

        '<button type="button" class="primary sitepass-admin-inquiry-status-action-v92" ' +
        (state.statusChanging ? 'disabled ' : '') +
        'onclick="return SitePassAdminInquiryV675.changeSelectedRoomStatus(\'completed\')">' +
          (state.statusChanging ? '처리 중' : '처리 완료') +
        '</button>';
    } else if (
      normalized === 'in_progress' ||
      normalized === 'waiting_member'
    ) {
      buttons =
        '<button type="button" class="primary sitepass-admin-inquiry-status-action-v92" ' +
        (state.statusChanging ? 'disabled ' : '') +
        'onclick="return SitePassAdminInquiryV675.changeSelectedRoomStatus(\'completed\')">' +
          (state.statusChanging ? '처리 중' : '처리 완료') +
        '</button>';
    } else if (normalized === 'completed') {
      buttons =
        '<button type="button" class="ghost sitepass-admin-inquiry-status-action-v92" ' +
        (state.statusChanging ? 'disabled ' : '') +
        'onclick="return SitePassAdminInquiryV675.changeSelectedRoomStatus(\'in_progress\')">' +
          (state.statusChanging ? '처리 중' : '다시 처리') +
        '</button>';
    }

    return buttons;
  }

  async function changeSelectedRoomStatus(explicitStatus) {
    var roomId = safeRoomId(state.selectedRoomId);
    var input = document.getElementById(
      'sitepassAdminInquiryStatusV670'
    );

    var requestedStatus = normalizeRoomStatus(
      explicitStatus ||
      (input && input.value)
    );

    state.actionError = '';

    if (!roomId) {
      state.actionError =
        '상태를 변경할 문의방을 선택해 주세요.';

      scheduleAdminRender(0);
      return false;
    }

    if (!requestedStatus) {
      state.actionError =
        '변경할 문의 상태를 선택해 주세요.';

      scheduleAdminRender(0);
      return false;
    }

    if (state.statusChanging) {
      return false;
    }

    state.statusChanging = true;
    captureMessageScrollForNextRender(roomId);
    scheduleAdminRender(0);

    try {
      var result = await callRpc(RPC.status, {
        p_room_id: roomId,
        p_room_status: requestedStatus
      });

      if (result && result.found === false) {
        throw new Error('ADMIN_INQUIRY_ROOM_NOT_FOUND');
      }

      await loadDetail(
        roomId,
        {
          markRead: false,
          preserveScroll: true,
          silentRender: true
        }
      );

      await loadList({
        reset: true,
        silentRender: true
      });

      return false;
    } catch (error) {
      state.actionError = text(
        error && (error.message || error.code) || error
      );

      return false;
    } finally {
      state.statusChanging = false;
      captureMessageScrollForNextRender(roomId);
      scheduleAdminRender(0);
    }
  }

  core.normalizeRoomStatus = normalizeRoomStatus;
  core.roomStatusLabel = roomStatusLabel;
  core.renderRoomStatusBadge = renderRoomStatusBadge;
  core.renderRoomStatusOptions = renderRoomStatusOptions;
  core.renderRoomStatusActionButtonsV92 = renderRoomStatusActionButtonsV92;
  core.changeSelectedRoomStatus = changeSelectedRoomStatus;
  core.__modules.status = true;
})();
