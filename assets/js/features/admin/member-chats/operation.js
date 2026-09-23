// SitePass STEP92 v775 - admin member-chat read-only operation module
(function(){
  'use strict';

  var state = {
    initialized: false,
    loading: false,
    summary: null,
    error: '',
    lastLoadedAt: 0,
    requestId: 0,
    expanded: true
  };

  function text(value){
    return String(value === null || value === undefined ? '' : value);
  }

  function escapeHtml(value){
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

  function isSuperAdmin(){
    try {
      return (
        typeof window.isSuperAdminLoggedIn === 'function' &&
        window.isSuperAdminLoggedIn()
      );
    } catch (error) {
      return false;
    }
  }

  function scheduleAdminRender(delay){
    var wait = Number(delay || 0);

    try {
      if (typeof window.requestAdminRender487 === 'function') {
        window.requestAdminRender487(wait);
        return;
      }
    } catch (error) {}

    window.setTimeout(function(){
      try {
        if (typeof window.renderAdmin === 'function') {
          window.renderAdmin();
        }
      } catch (error) {}
    }, wait);
  }

  function api(){
    return window.SitePassAdminMemberChatsApiV92 || null;
  }

  function number(value){
    var parsed = Number(value);

    return Number.isFinite(parsed) && parsed >= 0
      ? Math.floor(parsed)
      : 0;
  }

  function kpi(label, value, note){
    return (
      '<div class="sitepass-admin-member-chat-kpi-v92">' +
        '<span>' + escapeHtml(label) + '</span>' +
        '<strong>' + number(value) + '</strong>' +
        (
          note
            ? '<small>' + escapeHtml(note) + '</small>'
            : ''
        ) +
      '</div>'
    );
  }

  function render(){
    var op = state;

    if (op.loading && !op.summary) {
      return (
        '<section class="sitepass-admin-member-chat-operation-v92">' +
          '<div class="sitepass-admin-member-chat-operation-title-v92">' +
            '<div>' +
              '<h3>회원채팅 운영</h3>' +
              '<div class="small">' +
                '회원끼리의 대화내용은 열람하지 않고 운영상태만 확인합니다.' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="notice blue-note">' +
            '회원채팅 운영현황을 불러오는 중입니다.' +
          '</div>' +
        '</section>'
      );
    }

    if (op.error || !op.summary) {
      return (
        '<section class="sitepass-admin-member-chat-operation-v92">' +
          '<div class="sitepass-admin-member-chat-operation-title-v92">' +
            '<div>' +
              '<h3>회원채팅 운영</h3>' +
              '<div class="small">' +
                '회원끼리의 대화내용은 열람하지 않고 운영상태만 확인합니다.' +
              '</div>' +
            '</div>' +
            '<button type="button" class="ghost" ' +
            'onclick="return SitePassAdminInquiryV675.refreshMemberChatOperation()">' +
              '다시 불러오기' +
            '</button>' +
          '</div>' +
          '<div class="sitepass-admin-inquiry-error-v668">' +
            escapeHtml(
              op.error ||
              '회원채팅 운영현황을 불러오지 못했습니다.'
            ) +
          '</div>' +
        '</section>'
      );
    }

    var summary = op.summary || {};
    var rooms = summary.rooms || {};
    var messages = summary.messages || {};
    var attachments = summary.attachments || {};

    var warningCount =
      number(rooms.unknownStatus) +
      number(attachments.notReady);

    var expanded = op.expanded !== false;

    return (
      '<section class="sitepass-admin-member-chat-operation-v92">' +
        '<div class="sitepass-admin-member-chat-operation-title-v92">' +
          '<div>' +
            '<h3>회원채팅 운영</h3>' +
            '<div class="small">' +
              '연동된 회원끼리의 채팅방·메시지·첨부 운영상태만 확인합니다.' +
            '</div>' +
          '</div>' +
          '<div class="sitepass-admin-member-chat-operation-actions-v92">' +
            (
              expanded
                ? '<button type="button" class="ghost" ' +
                  (op.loading ? 'disabled ' : '') +
                  'onclick="return SitePassAdminInquiryV675.refreshMemberChatOperation()">' +
                    (op.loading ? '새로고침 중' : '운영현황 새로고침') +
                  '</button>'
                : ''
            ) +
            '<button type="button" class="ghost" ' +
            'aria-expanded="' + (expanded ? 'true' : 'false') + '" ' +
            'onclick="return SitePassAdminInquiryV675.toggleMemberChatOperation()">' +
              (expanded ? '접기' : '펼치기') +
            '</button>' +
          '</div>' +
        '</div>' +

        (
          expanded
            ? (
              '<div class="sitepass-admin-member-chat-operation-body-v92">' +
                '<div class="sitepass-admin-member-chat-kpis-v92">' +
                  kpi('채팅방', rooms.total, '전체') +
                  kpi('활성', rooms.active, 'active') +
                  kpi('읽기전용', rooms.readOnly, 'read_only') +
                  kpi('차단상태', rooms.blocked, '기존 서버상태') +
                  kpi('활성 메시지', messages.active, '내용 미노출') +
                  kpi('삭제 메시지', messages.deleted, '내용 미노출') +
                  kpi(
                    '첨부',
                    attachments.total,
                    'ready ' + number(attachments.ready)
                  ) +
                  kpi(
                    '숨김',
                    summary.hiddenMessages,
                    '개인 숨김'
                  ) +
                '</div>' +

                '<div class="notice blue-note ' +
                'sitepass-admin-member-chat-privacy-v92">' +
                  '<b>운영 기준:</b> 회원끼리의 메시지 내용·회원 ID·방 ID를 관리자 운영목록에 노출하지 않습니다. ' +
                  '관리자는 개인 채팅에 참여하거나 대신 답변하지 않습니다. ' +
                  '현재 별도 신고·강제차단 기능도 만들지 않습니다.' +
                '</div>' +

                (
                  warningCount > 0
                    ? '<div class="sitepass-admin-inquiry-error-v668">' +
                        '상태 확인 필요: ' +
                        '미지원 방 ' + number(rooms.unknownStatus) +
                        ' · 첨부 미완료 ' + number(attachments.notReady) +
                      '</div>'
                    : ''
                ) +
              '</div>'
            )
            : ''
        ) +
      '</section>'
    );
  }

  async function load(options){
    var settings = options || {};

    if (!isSuperAdmin()) {
      return { ok: false };
    }

    var op = state;

    if (op.loading) {
      return {
        ok: true,
        loading: true
      };
    }

    if (
      !settings.force &&
      op.initialized &&
      op.summary &&
      op.lastLoadedAt &&
      Date.now() - op.lastLoadedAt < 15000
    ) {
      return { ok: true, cached: true };
    }

    var requestId = ++op.requestId;
    op.loading = true;
    op.error = '';
    scheduleAdminRender(0);

    try {
      var client = api();
      if (!client || typeof client.callRpc !== 'function') {
        throw new Error('SUPABASE_CLIENT_NOT_READY');
      }

      var summary = await client.callRpc(
        client.SUMMARY_RPC,
        {}
      );

      if (requestId !== op.requestId) {
        return { ok: false, stale: true };
      }

      if (summary.ok !== true) {
        throw new Error(
          'ADMIN_MEMBER_CHAT_OPERATION_RESPONSE_INVALID'
        );
      }

      op.summary = summary;
      op.initialized = true;
      op.lastLoadedAt = Date.now();

      return { ok: true };

    } catch (error) {
      if (requestId !== op.requestId) {
        return { ok: false, stale: true };
      }

      op.summary = null;
      op.error =
        error && error.message
          ? error.message
          : text(error);

      return {
        ok: false,
        error: op.error
      };

    } finally {
      if (requestId === op.requestId) {
        op.loading = false;
        scheduleAdminRender(0);
      }
    }
  }

  function scheduleLoad(){
    var op = state;

    if (
      !isSuperAdmin() ||
      op.loading ||
      (
        op.initialized &&
        op.summary &&
        Date.now() - op.lastLoadedAt < 15000
      )
    ) {
      return;
    }

    window.setTimeout(function(){
      load({ force: false });
    }, 0);
  }

  function refresh(){
    return load({ force: true });
  }

  function toggle(){
    state.expanded = state.expanded === false;
    scheduleAdminRender(0);
    return false;
  }

  function invalidate(){
    state.requestId += 1;
    state.initialized = false;
    state.loading = false;
    state.summary = null;
    state.error = '';
    state.lastLoadedAt = 0;
  }

  function getState(){
    return state;
  }

  window.SitePassAdminMemberChatsOperationV92 = Object.freeze({
    render: render,
    load: load,
    scheduleLoad: scheduleLoad,
    refresh: refresh,
    toggle: toggle,
    invalidate: invalidate,
    getState: getState
  });
})();
