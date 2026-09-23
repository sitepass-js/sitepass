/* SitePass v23.7.784r14-step93-admin-support-chats-security-reinforcement
 * STEP93 non-destructive support-chats test helper.
 */
(function () {
  'use strict';

  var EXPECTED_MODULES = [
    'api','status','roomList','roomDetail',
    'input','search','realtime','supportPage'
  ];

  var EXPECTED_FACADE = [
    'renderSection','loadList','openRoom','loadOlderMessages',
    'sendReply','setReplyDraft','changeSelectedRoomStatus',
    'applySearch','clearSearch','setRoomStatus','setUnreadOnly',
    'loadMoreRooms','refresh','refreshMemberChatOperation',
    'toggleMemberChatOperation','getMemberChatOperationState',
    'ensureNotificationLink','destroy','startRealtime','stopRealtime',
    'getRealtimeState','getState'
  ];

  var EXPECTED_RPC = {
    list: 'sitepass_list_admin_inquiry_rooms_v2',
    detail: 'sitepass_get_admin_inquiry_room_detail_v1',
    read: 'sitepass_mark_admin_inquiry_read_v1',
    reply: 'sitepass_send_admin_inquiry_reply_v1',
    status: 'sitepass_set_admin_inquiry_status_v1'
  };

  function run() {
    var support = window.SitePassAdminSupportChatsV93 || null;
    var facade = window.SitePassAdminInquiryV675 || null;
    var failures = [];

    EXPECTED_MODULES.forEach(function (name) {
      if (!support || !support.__modules || support.__modules[name] !== true) {
        failures.push('module:' + name);
      }
    });

    EXPECTED_FACADE.forEach(function (name) {
      if (!facade || typeof facade[name] !== 'function') {
        failures.push('facade:' + name);
      }
    });

    Object.keys(EXPECTED_RPC).forEach(function (key) {
      if (!support || !support.RPC || support.RPC[key] !== EXPECTED_RPC[key]) {
        failures.push('rpc:' + key);
      }
    });

    if (!support || support.version !== '23.7.784-step93-admin-support-chats-security-reinforcement-1') {
      failures.push('support-version');
    }

    if (!facade || facade.version !== '23.7.784-step93-admin-support-chats-security-reinforcement-1') {
      failures.push('facade-version');
    }

    if (
      !support ||
      typeof support.capturePageScrollForNextRender !== 'function' ||
      typeof support.queuePageScrollRestoreAfterRender !== 'function'
    ) {
      failures.push('page-scroll-helpers');
    }

    return {
      ok: failures.length === 0,
      failures: failures,
      modules: support && support.__modules
        ? Object.keys(support.__modules)
        : [],
      facadeVersion: facade && facade.version || '',
      supportVersion: support && support.version || ''
    };
  }

  window.SitePassAdminSupportChatsTestV93 = Object.freeze({
    version: '23.7.784-step93-admin-support-chats-security-reinforcement-1',
    run: run
  });
})();
