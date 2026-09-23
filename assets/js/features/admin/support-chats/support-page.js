/* SitePass v23.7.784r14-step93-admin-support-chats-security-reinforcement
 * STEP93 admin support-chats / support-page orchestration
 * STEP92 member-chat operation is injected by the compatibility facade.
 */
(function () {
  'use strict';

  var core = window.SitePassAdminSupportChatsV93;
  if (!core || !core.state) {
    throw new Error('SUPPORT_CHATS_API_NOT_READY:supportPage');
  }
  var state = core.state;
  var RPC = core.RPC;
  var ROOM_STATUSES = core.ROOM_STATUSES;
  var ROOM_STATUS_LABELS = core.ROOM_STATUS_LABELS;

  function applySearch() {
    var target = core.applySearch;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:applySearch');
    }
    return target.apply(core, arguments);
  }

  function clearSearch() {
    var target = core.clearSearch;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:clearSearch');
    }
    return target.apply(core, arguments);
  }

  function currentSectionIsContacts() {
    var target = core.currentSectionIsContacts;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:currentSectionIsContacts');
    }
    return target.apply(core, arguments);
  }

  function ensureRealtimeStarted() {
    var target = core.ensureRealtimeStarted;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:ensureRealtimeStarted');
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

  function isSuperAdmin() {
    var target = core.isSuperAdmin;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:isSuperAdmin');
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

  function loadMoreRooms() {
    var target = core.loadMoreRooms;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:loadMoreRooms');
    }
    return target.apply(core, arguments);
  }

  function renderDetail() {
    var target = core.renderDetail;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:renderDetail');
    }
    return target.apply(core, arguments);
  }

  function renderRoomRows() {
    var target = core.renderRoomRows;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:renderRoomRows');
    }
    return target.apply(core, arguments);
  }

  function setRoomStatus() {
    var target = core.setRoomStatus;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:setRoomStatus');
    }
    return target.apply(core, arguments);
  }

  function setUnreadOnly() {
    var target = core.setUnreadOnly;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:setUnreadOnly');
    }
    return target.apply(core, arguments);
  }

  function startRealtime() {
    var target = core.startRealtime;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:startRealtime');
    }
    return target.apply(core, arguments);
  }

  function stopRealtime() {
    var target = core.stopRealtime;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:stopRealtime');
    }
    return target.apply(core, arguments);
  }

  function queuePageScrollRestoreAfterRender() {
    var target = core.queuePageScrollRestoreAfterRender;
    if (typeof target !== 'function') {
      throw new Error('SUPPORT_CHATS_DEPENDENCY_NOT_READY:queuePageScrollRestoreAfterRender');
    }
    return target.apply(core, arguments);
  }

  function getMemberChatOperationIntegrationState(integration) {
    if (
      integration &&
      typeof integration.getMemberChatOperationState === 'function'
    ) {
      return integration.getMemberChatOperationState();
    }
    return null;
  }

  function memberChatOperationMayRenderAgain(integration) {
    var operationState =
      getMemberChatOperationIntegrationState(integration);

    if (!operationState) {
      return false;
    }

    if (operationState.loading) {
      return true;
    }

    if (
      !operationState.initialized ||
      !operationState.summary
    ) {
      return true;
    }

    var lastLoadedAt = Number(
      operationState.lastLoadedAt || 0
    );

    return (
      !Number.isFinite(lastLoadedAt) ||
      lastLoadedAt <= 0 ||
      Date.now() - lastLoadedAt >= 15000
    );
  }

  function scheduleMemberChatOperationIntegration(integration) {
    if (
      integration &&
      typeof integration.scheduleMemberChatOperationLoad === 'function'
    ) {
      integration.scheduleMemberChatOperationLoad();
    }
  }

  function renderMemberChatOperationIntegration(integration) {
    if (
      integration &&
      typeof integration.renderMemberChatOperation === 'function'
    ) {
      return integration.renderMemberChatOperation();
    }
    return '';
  }

  function refresh() {
    var detailRoomId = state.selectedRoomId;

    loadList({
      reset: true,
      preservePageScroll: true
    });

    if (detailRoomId) {
      loadDetail(
        detailRoomId,
        {
          markRead: false,
          preserveScroll: true,
          preservePageScroll: true
        }
      );
    }

    return false;
  }

  function renderError(value) {
    if (!value) {
      return '';
    }

    return (
      '<div class="sitepass-admin-inquiry-error-v668">' +
      escapeHtml(value) +
      '</div>'
    );
  }

  function scheduleInitialLoad() {
    if (state.renderKickScheduled) {
      return;
    }

    var stale =
      !state.initialized ||
      Date.now() - state.lastListLoadedAt > 15000;

    if (!stale || state.listLoading) {
      return;
    }

    state.renderKickScheduled = true;

    window.setTimeout(function () {
      state.renderKickScheduled = false;

      if (currentSectionIsContacts()) {
        loadList({ reset: true });
      }
    }, 0);
  }

  function ensureNotificationLink() {
    if (!isSuperAdmin()) {
      return false;
    }

    if (
      !state.realtime.starting &&
      (
        !state.realtime.channel ||
        state.realtime.status === 'CHANNEL_ERROR' ||
        state.realtime.status === 'TIMED_OUT' ||
        state.realtime.status === 'CLOSED' ||
        state.realtime.status === 'error' ||
        state.realtime.status === 'client_not_ready'
      )
    ) {
      startRealtime();
    }

    if (!state.initialized && !state.listLoading) {
      loadList({ reset: true });
    }

    return true;
  }

  function renderSection(integration) {
    queuePageScrollRestoreAfterRender({
      keepSnapshot:
        memberChatOperationMayRenderAgain(integration)
    });

    if (!isSuperAdmin()) {
      return (
        '<div class="card sitepass-admin-section-card-v578" ' +
        'style="box-shadow:none;">' +
          '<h3>문의·채팅</h3>' +
          '<div class="notice blue-note">' +
            '현재 관리자 문의 목록·답변은 최고관리자에게만 제공됩니다.' +
          '</div>' +
        '</div>'
      );
    }

    ensureRealtimeStarted();
    scheduleInitialLoad();
    scheduleMemberChatOperationIntegration(integration);

    var returnedCount = Number(
      state.listSummary &&
      (
        state.listSummary.returnedCount ??
        state.listSummary.returned_count
      ) ||
      state.listItems.length
    );

    var hasMore = Boolean(
      state.listPage &&
      state.listPage.hasMore &&
      state.listPage.nextCursor
    );

    return (
      '<div class="card sitepass-admin-section-card-v578 ' +
      'sitepass-admin-inquiry-root-v668" style="box-shadow:none;">' +

        '<div class="sitepass-admin-inquiry-title-v668">' +
          '<div>' +
            '<h3>회원 문의</h3>' +
            '<div class="small">' +
              '처리가 필요한 오래된 문의부터 확인하고 답변하거나 처리 완료하세요.' +
            '</div>' +
          '</div>' +

          '<button type="button" class="ghost" ' +
          'onclick="return SitePassAdminInquiryV675.refresh()">' +
            '새로고침' +
          '</button>' +
        '</div>' +

        '<div class="sitepass-admin-inquiry-toolbar-v668">' +
          '<div class="sitepass-admin-inquiry-search-v668">' +
            '<input id="sitepassAdminInquirySearchV668" ' +
            'type="search" maxlength="100" ' +
            'value="' + escapeHtml(state.search) + '" ' +
            'placeholder="이름·아이디·회사·전화·문의내용 검색" ' +
            'onkeydown="if(event.key===\'Enter\'){return SitePassAdminInquiryV675.applySearch();}">' +

            '<button type="button" class="primary" ' +
            'onclick="return SitePassAdminInquiryV675.applySearch()">' +
              '검색' +
            '</button>' +

            '<button type="button" class="ghost" ' +
            'onclick="return SitePassAdminInquiryV675.clearSearch()">' +
              '초기화' +
            '</button>' +
          '</div>' +

          '<select aria-label="문의방 상태" ' +
          'onchange="return SitePassAdminInquiryV675.setRoomStatus(this.value)">' +
            '<option value="all"' +
              (state.roomStatus === 'all' ? ' selected' : '') +
            '>전체 상태</option>' +

            '<option value="waiting_admin"' +
              (state.roomStatus === 'waiting_admin' ? ' selected' : '') +
            '>답변대기</option>' +

            '<option value="in_progress"' +
              (state.roomStatus === 'in_progress' ? ' selected' : '') +
            '>처리중</option>' +

            '<option value="waiting_member"' +
              (state.roomStatus === 'waiting_member' ? ' selected' : '') +
            '>회원답변대기</option>' +

            '<option value="completed"' +
              (state.roomStatus === 'completed' ? ' selected' : '') +
            '>처리완료</option>' +
          '</select>' +

          '<label class="sitepass-admin-inquiry-unread-filter-v668">' +
            '<input type="checkbox" ' +
              (state.unreadOnly ? 'checked ' : '') +
              'onchange="return SitePassAdminInquiryV675.setUnreadOnly(this.checked)">' +
            '<span>미확인만</span>' +
          '</label>' +
        '</div>' +

        renderError(state.listError) +

        '<div class="sitepass-admin-inquiry-layout-v668">' +
          '<section class="sitepass-admin-inquiry-list-panel-v668">' +
            '<div class="sitepass-admin-inquiry-list-head-v668">' +
              '<strong>문의방 ' + returnedCount + '개</strong>' +
              '<span>' +
                (state.listLoading ? '불러오는 중' : '오래된 처리 문의 우선') +
              '</span>' +
            '</div>' +

            '<div class="sitepass-admin-inquiry-room-list-v668">' +
              renderRoomRows() +
            '</div>' +

            (
              hasMore
                ? (
                    '<button type="button" class="ghost ' +
                    'sitepass-admin-inquiry-more-v668" ' +
                    'onclick="return SitePassAdminInquiryV675.loadMoreRooms()">' +
                      '문의방 더보기' +
                    '</button>'
                  )
                : ''
            ) +
          '</section>' +

          '<section class="sitepass-admin-inquiry-detail-panel-v668">' +
            renderDetail() +
          '</section>' +
        '</div>' +

        renderMemberChatOperationIntegration(integration) +
      '</div>'
    );
  }

  function destroyCustomerSupport() {
    stopRealtime();

    if (
      typeof core.cancelReplyBottomTransaction === 'function'
    ) {
      core.cancelReplyBottomTransaction('', true);
    }

    if (
      state.realtime.authSubscription &&
      typeof state.realtime.authSubscription.unsubscribe === 'function'
    ) {
      try {
        state.realtime.authSubscription.unsubscribe();
      } catch (error) {}
    }

    state.realtime.authSubscription = null;

    /*
     * STEP87 v726:
     * 로그아웃/destroy 이전에 시작된 목록·상세 RPC 응답이 뒤늦게 도착해도
     * 기존 requestId stale guard가 반드시 차단하도록 세대를 무효화합니다.
     */
    state.listRequestId += 1;
    state.detailRequestId += 1;
    state.listLoading = false;
    state.detailLoading = false;

    state.initialized = false;
    state.listItems = [];
    state.listPage = null;
    state.listSummary = null;
    state.selectedRoomId = '';
    state.detail = null;
    state.pendingReply = null;
    state.replyDrafts = Object.create(null);
    state.replyScrollToBottomRoomId = '';
    state.replyScrollRestore = null;
    state.olderMessageScrollAnchor = null;
    state.replyBottomTransaction = null;
    state.replyBottomSequence = 0;
    state.pageScrollRestore = null;
    state.statusChanging = false;
  }

  core.refresh = refresh;
  core.renderError = renderError;
  core.scheduleInitialLoad = scheduleInitialLoad;
  core.ensureNotificationLink = ensureNotificationLink;
  core.renderSection = renderSection;
  core.destroy = destroyCustomerSupport;
  core.getState = function () {
    return state;
  };
  core.__modules.supportPage = true;
})();
