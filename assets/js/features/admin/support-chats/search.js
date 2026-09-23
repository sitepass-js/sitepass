/* SitePass v23.7.779r14-step93-admin-support-chats-render-scroll-stability-fix
 * STEP93 admin support-chats / search
 */
(function () {
  'use strict';

  var core = window.SitePassAdminSupportChatsV93;
  if (!core || !core.state) {
    throw new Error('SUPPORT_CHATS_API_NOT_READY:search');
  }
  var state = core.state;
  var RPC = core.RPC;
  var ROOM_STATUSES = core.ROOM_STATUSES;
  var ROOM_STATUS_LABELS = core.ROOM_STATUS_LABELS;

  function loadList() {
    var target = core.loadList;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:loadList');
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

  function applySearch() {
    var input = document.getElementById(
      'sitepassAdminInquirySearchV668'
    );

    state.search = text(input && input.value).trim();
    loadList({ reset: true, preservePageScroll: true });

    return false;
  }

  function clearSearch() {
    state.search = '';

    var input = document.getElementById(
      'sitepassAdminInquirySearchV668'
    );

    if (input) {
      input.value = '';
    }

    loadList({ reset: true, preservePageScroll: true });

    return false;
  }

  function setRoomStatus(value) {
    var allowed = ['all'].concat(ROOM_STATUSES);
    var normalized = text(value).trim().toLowerCase();

    state.roomStatus = allowed.indexOf(normalized) >= 0
      ? normalized
      : 'all';

    loadList({ reset: true, preservePageScroll: true });

    return false;
  }

  function setUnreadOnly(value) {
    state.unreadOnly = Boolean(value);
    loadList({ reset: true, preservePageScroll: true });

    return false;
  }

  core.applySearch = applySearch;
  core.clearSearch = clearSearch;
  core.setRoomStatus = setRoomStatus;
  core.setUnreadOnly = setUnreadOnly;
  core.__modules.search = true;
})();
