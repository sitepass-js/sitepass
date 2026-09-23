/* SitePass v23.7.784r14-step93-admin-support-chats-security-reinforcement
 * STEP93 compatibility facade for existing admin 문의·채팅 callers.
 * Customer-support implementation lives in features/admin/support-chats/*.
 * STEP92 member-chat operation integration remains here as a thin bridge.
 */
(function () {
  'use strict';

  var VERSION = '23.7.784-step93-admin-support-chats-security-reinforcement-1';
  var GLOBAL_NAME = 'SitePassAdminInquiryV675';

  if (
    window[GLOBAL_NAME] &&
    window[GLOBAL_NAME].version === VERSION
  ) {
    return;
  }

  function supportChatsModuleV776() {
    return window.SitePassAdminSupportChatsV93 || null;
  }

  function memberChatOperationModuleV775() {
    return window.SitePassAdminMemberChatsOperationV92 || null;
  }

  function renderMemberChatOperationV92() {
    var operation = memberChatOperationModuleV775();
    if (operation && typeof operation.render === 'function') {
      return operation.render();
    }

    return (
      '<section class="sitepass-admin-member-chat-operation-v92">' +
        '<div class="notice">회원채팅 운영 모듈을 불러오지 못했습니다.</div>' +
      '</section>'
    );
  }

  function scheduleMemberChatOperationLoadV92() {
    var operation = memberChatOperationModuleV775();
    if (operation && typeof operation.scheduleLoad === 'function') {
      operation.scheduleLoad();
    }
  }

  function refreshMemberChatOperationV92() {
    var operation = memberChatOperationModuleV775();
    return operation && typeof operation.refresh === 'function'
      ? operation.refresh()
      : Promise.resolve(false);
  }

  function toggleMemberChatOperationV92() {
    var operation = memberChatOperationModuleV775();
    return operation && typeof operation.toggle === 'function'
      ? operation.toggle()
      : false;
  }

  function invalidateMemberChatOperationV775() {
    var operation = memberChatOperationModuleV775();
    if (operation && typeof operation.invalidate === 'function') {
      operation.invalidate();
    }
  }

  function getMemberChatOperationStateV775() {
    var operation = memberChatOperationModuleV775();
    return operation && typeof operation.getState === 'function'
      ? operation.getState()
      : null;
  }

  function callSupportMethod(name, args, fallback) {
    var support = supportChatsModuleV776();
    if (!support || typeof support[name] !== 'function') {
      return fallback;
    }
    return support[name].apply(support, args || []);
  }

  function renderSection() {
    var support = supportChatsModuleV776();
    if (!support || typeof support.renderSection !== 'function') {
      return (
        '<div class="card sitepass-admin-section-card-v578" style="box-shadow:none;">' +
          '<h3>문의·채팅</h3>' +
          '<div class="notice">문의·채팅 모듈을 불러오지 못했습니다.</div>' +
        '</div>'
      );
    }

    return support.renderSection({
      scheduleMemberChatOperationLoad: scheduleMemberChatOperationLoadV92,
      renderMemberChatOperation: renderMemberChatOperationV92,
      getMemberChatOperationState: getMemberChatOperationStateV775
    });
  }

  function destroy() {
    var support = supportChatsModuleV776();
    if (support && typeof support.destroy === 'function') {
      support.destroy();
    }
    invalidateMemberChatOperationV775();
  }

  window[GLOBAL_NAME] = {
    version: VERSION,
    renderSection: renderSection,
    loadList: function () {
      return callSupportMethod('loadList', arguments, { ok: false, skipped: true });
    },
    openRoom: function () {
      return callSupportMethod('openRoom', arguments, false);
    },
    loadOlderMessages: function () {
      return callSupportMethod('loadOlderMessages', arguments, false);
    },
    sendReply: function () {
      return callSupportMethod('sendReply', arguments, false);
    },
    setReplyDraft: function () {
      return callSupportMethod('setReplyDraft', arguments, false);
    },
    changeSelectedRoomStatus: function () {
      return callSupportMethod('changeSelectedRoomStatus', arguments, false);
    },
    applySearch: function () {
      return callSupportMethod('applySearch', arguments, false);
    },
    clearSearch: function () {
      return callSupportMethod('clearSearch', arguments, false);
    },
    setRoomStatus: function () {
      return callSupportMethod('setRoomStatus', arguments, false);
    },
    setUnreadOnly: function () {
      return callSupportMethod('setUnreadOnly', arguments, false);
    },
    loadMoreRooms: function () {
      return callSupportMethod('loadMoreRooms', arguments, false);
    },
    refresh: function () {
      return callSupportMethod('refresh', arguments, false);
    },
    refreshMemberChatOperation: refreshMemberChatOperationV92,
    toggleMemberChatOperation: toggleMemberChatOperationV92,
    getMemberChatOperationState: getMemberChatOperationStateV775,
    ensureNotificationLink: function () {
      return callSupportMethod('ensureNotificationLink', arguments, false);
    },
    destroy: destroy,
    startRealtime: function () {
      return callSupportMethod('startRealtime', arguments, false);
    },
    stopRealtime: function () {
      return callSupportMethod('stopRealtime', arguments, false);
    },
    getRealtimeState: function () {
      return callSupportMethod('getRealtimeState', arguments, null);
    },
    getState: function () {
      var support = supportChatsModuleV776();
      return support && typeof support.getState === 'function'
        ? support.getState()
        : null;
    }
  };
})();
