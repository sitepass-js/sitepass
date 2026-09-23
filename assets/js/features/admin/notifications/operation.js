// SitePass STEP92 v775 - admin notification read-only operation module
(function(){
  'use strict';

  var state = {
    summary: null,
    issues: [],
    totalIssues: 0,
    hasMore: false,
    nextCursor: null,
    loading: false,
    loadingMore: false,
    error: '',
    issueError: '',
    fetchedAt: 0
  };

  var renderCallback = null;

  function api(){
    return window.SitePassAdminNotificationsApiV92 || null;
  }

  function isSuperAdmin(){
    try {
      return (
        typeof window.isSuperAdminLoggedIn === 'function' &&
        window.isSuperAdminLoggedIn()
      );
    } catch (e) {
      return false;
    }
  }

  function escapeHtml(value){
    return String(value == null ? '' : value).replace(
      /[&<>"]/g,
      function(ch){
        return {
          '&':'&amp;',
          '<':'&lt;',
          '>':'&gt;',
          '"':'&quot;'
        }[ch];
      }
    );
  }

  function notifyRender(){
    if (typeof renderCallback !== 'function') return;
    try { renderCallback(); } catch (e) {}
  }

  function setRenderCallback(callback){
    renderCallback = typeof callback === 'function' ? callback : null;
  }

  function clear(){
    state.summary = null;
    state.issues = [];
    state.totalIssues = 0;
    state.hasMore = false;
    state.nextCursor = null;
    state.loading = false;
    state.loadingMore = false;
    state.error = '';
    state.issueError = '';
    state.fetchedAt = 0;
  }

  function safeNumber(value){
    var n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function issueLabel(value){
    var key = String(value || '').trim().toLowerCase();
    var labels = {
      failed: '발송 실패',
      retry: '재시도',
      stale_processing: '처리 지연',
      delivery_failed: '기기 발송 실패',
      delivery_gone: '기기 구독 소멸',
      suppressed: '수신기기 없음',
      unknown_status: '상태 확인 필요'
    };
    return labels[key] || '상태 확인 필요';
  }

  function statusLabel(value){
    var key = String(value || '').trim().toLowerCase();
    var labels = {
      pending: '대기',
      processing: '처리중',
      retry: '재시도',
      sent: '발송성공',
      suppressed: '수신기기 없음',
      failed: '발송실패'
    };
    return labels[key] || (key || '-');
  }

  function sourceLabel(sourceType, roomType){
    var source = String(sourceType || '').trim().toLowerCase();
    var room = String(roomType || '').trim().toLowerCase();

    if (source === 'admin' && room === 'admin') return '관리자 문의';
    if (source === 'member_chat' && room === 'member_chat') return '회원채팅';
    if (source === 'notification' && room === 'system') return '시스템알림';
    if (source === 'share_event' && room === 'expiry') return '공유 만료';
    if (source === 'share_event' && room === 'share') return '공유 활동';

    return '기타(' +
      escapeHtml(source || '-') +
      '/' +
      escapeHtml(room || '-') +
      ')';
  }

  function errorLabel(value){
    var raw = String(value || '').trim();
    if (!raw) return '-';

    var labels = {
      NO_USABLE_MOBILE_SUBSCRIPTIONS: '수신 가능한 휴대폰 없음',
      ALL_SUBSCRIPTIONS_GONE: '등록된 기기 구독 소멸'
    };

    var friendly = labels[raw] || '';
    return friendly
      ? escapeHtml(friendly) +
          ' <span style="color:#94a3b8;">(' +
          escapeHtml(raw) +
          ')</span>'
      : escapeHtml(raw);
  }

  function time(value){
    if (!value) return '-';
    try {
      var d = new Date(value);
      if (Number.isNaN(d.getTime())) return escapeHtml(value);
      return escapeHtml(
        d.toLocaleString('ko-KR', {
          year:'2-digit',
          month:'2-digit',
          day:'2-digit',
          hour:'2-digit',
          minute:'2-digit'
        })
      );
    } catch (e) {
      return escapeHtml(value);
    }
  }

  function kpi(label, value, note){
    return (
      '<div class="sitepass-admin-notification-kpi-v92" style="' +
        'border:1px solid #e2e8f0;' +
        'border-radius:12px;' +
        'padding:11px 12px;' +
        'background:#fff;' +
        'min-width:0;' +
      '">' +
        '<div style="font-size:12px;color:#64748b;font-weight:800;">' +
          escapeHtml(label) +
        '</div>' +
        '<div style="font-size:22px;line-height:1.2;margin-top:4px;font-weight:900;color:#0f172a;">' +
          safeNumber(value) +
        '</div>' +
        (
          note
            ? '<div style="font-size:11px;color:#94a3b8;margin-top:3px;">' +
                escapeHtml(note) +
              '</div>'
            : ''
        ) +
      '</div>'
    );
  }

  function renderIssueRows(items){
    var list = Array.isArray(items) ? items : [];

    if (!list.length) {
      return (
        '<div class="notice" style="margin-top:8px;">' +
          '현재 확인이 필요한 Push 운영이슈가 없습니다.' +
        '</div>'
      );
    }

    return list.map(function(item){
      var issueType = String(item && item.issueType || '');
      var sourceType = item && item.sourceType;
      var roomType = item && item.roomType;
      var attemptCount = safeNumber(item && item.attemptCount);
      var httpStatus = item && item.lastHttpStatus;
      var gone = safeNumber(item && item.deliveryGoneCount);
      var failed = safeNumber(item && item.deliveryFailedCount);
      var sent = safeNumber(item && item.deliverySentCount);

      return (
        '<div class="sitepass-admin-notification-issue-row-v92" style="' +
          'display:grid;' +
          'grid-template-columns:minmax(125px,0.85fr) minmax(135px,0.9fr) minmax(180px,1.35fr) minmax(140px,1fr);' +
          'gap:8px 12px;' +
          'align-items:start;' +
          'padding:10px 0;' +
          'border-top:1px solid #edf2f7;' +
          'font-size:12px;' +
        '">' +

          '<div>' +
            '<b style="color:#334155;">' +
              escapeHtml(issueLabel(issueType)) +
            '</b>' +
            '<div style="color:#94a3b8;margin-top:3px;">' +
              time(item && item.createdAt) +
            '</div>' +
          '</div>' +

          '<div>' +
            '<b>' +
              sourceLabel(sourceType, roomType) +
            '</b>' +
            '<div style="color:#64748b;margin-top:3px;">Outbox ' +
              escapeHtml(statusLabel(item && item.outboxStatus)) +
            '</div>' +
          '</div>' +

          '<div style="min-width:0;overflow-wrap:anywhere;">' +
            '<b style="color:#475569;">원인</b>' +
            '<div style="margin-top:3px;">' +
              errorLabel(item && item.lastErrorCode) +
            '</div>' +
            (
              httpStatus != null
                ? '<div style="color:#64748b;margin-top:2px;">HTTP ' +
                    escapeHtml(httpStatus) +
                  '</div>'
                : ''
            ) +
          '</div>' +

          '<div>' +
            '<b style="color:#475569;">시도 ' + attemptCount + '회</b>' +
            '<div style="color:#64748b;margin-top:3px;">' +
              '기기 성공 ' + sent +
              ' · 실패 ' + failed +
              ' · 소멸 ' + gone +
            '</div>' +
          '</div>' +

        '</div>'
      );
    }).join('');
  }

  function render(){
    if (!isSuperAdmin()) {
      return (
        '<div class="sitepass-admin-notification-operation-v92" style="' +
          'margin:10px 0 14px;' +
          'padding:12px 14px;' +
          'border:1px solid #e2e8f0;' +
          'border-radius:12px;' +
          'background:#f8fafc;' +
        '">' +
          '<b>운영현황</b>' +
          '<div class="small" style="margin-top:4px;">' +
            '발송·실패·읽음 운영현황은 최고관리자 서버권한에서만 조회합니다.' +
          '</div>' +
        '</div>'
      );
    }

    if (state.loading && !state.summary) {
      return (
        '<div class="sitepass-admin-notification-operation-v92" style="margin:10px 0 14px;padding:14px;border:1px solid #d9e5ff;border-radius:12px;background:#f8fbff;">' +
          '<b>운영현황 불러오는 중...</b>' +
        '</div>'
      );
    }

    if (state.error || !state.summary) {
      return (
        '<div class="sitepass-admin-notification-operation-v92" style="margin:10px 0 14px;padding:14px;border:1px solid #fecaca;border-radius:12px;background:#fff7f7;">' +
          '<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">' +
            '<div>' +
              '<b style="color:#991b1b;">운영현황을 불러오지 못했습니다.</b>' +
              '<div class="small" style="margin-top:4px;color:#7f1d1d;">' +
                escapeHtml(state.error || '서버 응답 확인 필요') +
              '</div>' +
            '</div>' +
            '<button type="button" class="ghost" data-push-action="operation-refresh">다시 불러오기</button>' +
          '</div>' +
        '</div>'
      );
    }

    var summary = state.summary || {};
    var member = summary.memberNotifications || {};
    var outbox = summary.outbox || {};
    var deliveries = summary.deliveries || {};
    var sources = Array.isArray(summary.sources) ? summary.sources : [];

    var unknownOutbox = safeNumber(outbox.unknownStatus);
    var unknownDelivery = safeNumber(deliveries.unknownStatus);
    var staleProcessing = safeNumber(outbox.staleProcessing);
    var warningCount = unknownOutbox + unknownDelivery + staleProcessing;

    var sourceHtml = sources.length
      ? (
          '<div class="sitepass-admin-notification-sources-v92" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">' +
          sources.map(function(row){
            return (
              '<span style="' +
                'display:inline-flex;' +
                'align-items:center;' +
                'gap:5px;' +
                'padding:5px 8px;' +
                'border-radius:999px;' +
                'background:#f1f5f9;' +
                'font-size:11px;' +
                'color:#475569;' +
              '">' +
                '<b>' +
                  sourceLabel(
                    row && row.sourceType,
                    row && row.roomType
                  ) +
                '</b> ' +
                safeNumber(row && row.count) +
              '</span>'
            );
          }).join('') +
          '</div>'
        )
      : '';

    return (
      '<div class="sitepass-admin-notification-operation-v92" style="' +
        'margin:10px 0 14px;' +
        'padding:14px;' +
        'border:1px solid #cfe0ff;' +
        'border-radius:14px;' +
        'background:#f8fbff;' +
      '">' +

        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">' +
          '<div>' +
            '<h3 style="margin:0;">운영현황</h3>' +
            '<div class="small" style="margin-top:4px;">' +
              '서버 Outbox / 기기 Delivery / 앱 내부 알림 읽음상태 기준 · 읽기전용' +
            '</div>' +
          '</div>' +

          '<button type="button" class="ghost" data-push-action="operation-refresh" ' +
            (state.loading ? 'disabled ' : '') +
          '>' +
            (state.loading ? '새로고침 중' : '운영현황 새로고침') +
          '</button>' +
        '</div>' +

        '<div class="sitepass-admin-notification-kpis-v92" style="' +
          'display:grid;' +
          'grid-template-columns:repeat(auto-fit,minmax(120px,1fr));' +
          'gap:8px;' +
          'margin-top:12px;' +
        '">' +

          kpi('발송 성공', outbox.sent, 'Outbox sent') +
          kpi('수신기기 없음', outbox.suppressed, 'suppressed') +
          kpi('재시도', outbox.retry, 'retry') +
          kpi('발송 실패', outbox.failed, 'failed') +
          kpi('기기구독 소멸', deliveries.gone, 'Delivery gone') +
          kpi('앱 알림 미읽음', member.unread, 'Push 열람과 별도') +

        '</div>' +

        '<div class="small" style="margin-top:9px;color:#64748b;">' +
          'Outbox 전체 <b>' + safeNumber(outbox.total) + '</b>' +
          ' · 대기 ' + safeNumber(outbox.pending) +
          ' · 처리중 ' + safeNumber(outbox.processing) +
          ' · 기기 Delivery 전체 ' + safeNumber(deliveries.total) +
          ' · 앱 알림 전체 ' + safeNumber(member.total) +
          ' (읽음 ' + safeNumber(member.read) + ')' +
        '</div>' +

        '<div class="notice blue-note" style="margin-top:9px;">' +
          '<b>읽음 기준:</b> 앱 내부 알림의 is_read/read_at만 집계합니다. ' +
          'Push 발송 성공은 회원이 실제 열람했다는 뜻이 아니며, 현재 Push 자체 열람은 추적하지 않습니다.' +
        '</div>' +

        (
          warningCount > 0
            ? '<div class="notice" style="margin-top:8px;border-color:#fecaca;background:#fff7f7;color:#991b1b;">' +
                '<b>확인 필요:</b> ' +
                '미지원 Outbox 상태 ' + unknownOutbox +
                ' · 미지원 Delivery 상태 ' + unknownDelivery +
                ' · 5분 초과 처리중 ' + staleProcessing +
              '</div>'
            : ''
        ) +

        sourceHtml +

        '<div class="sitepass-admin-notification-issues-v92" style="margin-top:14px;padding-top:12px;border-top:1px solid #dbe7f8;">' +
          '<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">' +
            '<div>' +
              '<b>운영 확인 이슈</b>' +
              '<div class="small">오래된 문제부터 · token / endpoint / 알림 본문 원문 미노출</div>' +
            '</div>' +
            '<div class="small">' +
              '전체 <b>' + safeNumber(state.totalIssues) + '</b>건' +
              ' · 현재 ' + safeNumber(state.issues.length) + '건 표시' +
            '</div>' +
          '</div>' +

          (
            state.issueError
              ? '<div class="notice" style="margin-top:8px;border-color:#fecaca;background:#fff7f7;color:#991b1b;">' +
                  escapeHtml(state.issueError) +
                '</div>'
              : ''
          ) +

          '<div style="margin-top:6px;overflow-x:auto;">' +
            '<div style="min-width:650px;">' +
              renderIssueRows(state.issues) +
            '</div>' +
          '</div>' +

          (
            state.hasMore
              ? '<div style="display:flex;justify-content:center;margin-top:10px;">' +
                  '<button type="button" class="ghost" data-push-action="operation-more" ' +
                    (state.loadingMore ? 'disabled ' : '') +
                  '>' +
                    (state.loadingMore ? '불러오는 중' : '이슈 더보기') +
                  '</button>' +
                '</div>'
              : (
                  state.issues.length
                    ? '<div class="small" style="text-align:center;margin-top:8px;color:#94a3b8;">마지막 이슈까지 표시했습니다.</div>'
                    : ''
                )
          ) +

        '</div>' +

      '</div>'
    );
  }

  async function refresh(force){
    var host = document.getElementById('sitepassPushPanelHostV683');
    var adminScreen = document.getElementById('adminScreen');

    if (!host || !adminScreen || adminScreen.classList.contains('hidden')) {
      return false;
    }

    if (!isSuperAdmin()) {
      clear();
      notifyRender();
      return false;
    }

    var now = Date.now();

    if (
      !force &&
      state.summary &&
      state.fetchedAt &&
      now - state.fetchedAt < 15000
    ) {
      return true;
    }

    if (state.loading) return false;

    var client = api();
    if (!client || typeof client.rpc !== 'function') {
      clear();
      state.error = 'Supabase 클라이언트를 확인할 수 없습니다.';
      notifyRender();
      return false;
    }

    state.loading = true;
    state.error = '';
    state.issueError = '';
    notifyRender();

    try {
      var results = await Promise.all([
        client.rpc(client.SUMMARY_RPC, {}),
        client.rpc(
          client.ISSUES_RPC,
          {
            p_limit: 20,
            p_before_created_at: null,
            p_before_outbox_id: null
          }
        )
      ]);

      var summaryResult = results[0] || {};
      var issueResult = results[1] || {};

      if (summaryResult.error) {
        throw new Error(
          summaryResult.error.message ||
          summaryResult.error.code ||
          'ADMIN_PUSH_SUMMARY_FAILED'
        );
      }

      if (issueResult.error) {
        throw new Error(
          issueResult.error.message ||
          issueResult.error.code ||
          'ADMIN_PUSH_ISSUES_FAILED'
        );
      }

      var summary = summaryResult.data || {};
      var issueData = issueResult.data || {};

      if (summary.ok !== true || issueData.ok !== true) {
        throw new Error('ADMIN_PUSH_OPERATION_RESPONSE_INVALID');
      }

      state.summary = summary;
      state.issues = Array.isArray(issueData.items)
        ? issueData.items.slice()
        : [];

      state.totalIssues = safeNumber(
        issueData.summary && issueData.summary.totalMatching
      );

      state.hasMore =
        !!(issueData.page && issueData.page.hasMore);

      state.nextCursor =
        issueData.page && issueData.page.nextCursor
          ? issueData.page.nextCursor
          : null;

      state.fetchedAt = Date.now();
      state.error = '';
      return true;

    } catch (e) {
      state.summary = null;
      state.issues = [];
      state.totalIssues = 0;
      state.hasMore = false;
      state.nextCursor = null;
      state.fetchedAt = 0;
      state.error =
        e && e.message
          ? e.message
          : String(e || 'ADMIN_PUSH_OPERATION_FAILED');

      return false;

    } finally {
      state.loading = false;
      notifyRender();
    }
  }

  async function loadMore(){
    if (
      !isSuperAdmin() ||
      state.loadingMore ||
      !state.hasMore ||
      !state.nextCursor
    ) {
      return false;
    }

    var client = api();
    if (!client || typeof client.rpc !== 'function') {
      state.issueError = 'Supabase 클라이언트를 확인할 수 없습니다.';
      notifyRender();
      return false;
    }

    var cursor = state.nextCursor || {};
    var createdAt =
      cursor.createdAt ||
      cursor.created_at ||
      null;

    var outboxId =
      cursor.outboxId ||
      cursor.outbox_id ||
      null;

    if (!createdAt || !outboxId) {
      state.issueError = '운영이슈 cursor가 올바르지 않습니다.';
      state.hasMore = false;
      notifyRender();
      return false;
    }

    state.loadingMore = true;
    state.issueError = '';
    notifyRender();

    try {
      var result = await client.rpc(
        client.ISSUES_RPC,
        {
          p_limit: 20,
          p_before_created_at: createdAt,
          p_before_outbox_id: outboxId
        }
      );

      if (result.error) {
        throw new Error(
          result.error.message ||
          result.error.code ||
          'ADMIN_PUSH_ISSUES_MORE_FAILED'
        );
      }

      var data = result.data || {};
      if (data.ok !== true) {
        throw new Error('ADMIN_PUSH_ISSUES_MORE_RESPONSE_INVALID');
      }

      var incoming = Array.isArray(data.items)
        ? data.items
        : [];

      var seen = new Set(
        state.issues
          .map(function(row){
            return String(row && row.outboxId || '');
          })
          .filter(Boolean)
      );

      incoming.forEach(function(row){
        var id = String(row && row.outboxId || '');
        if (!id || seen.has(id)) return;
        seen.add(id);
        state.issues.push(row);
      });

      state.totalIssues = safeNumber(
        data.summary && data.summary.totalMatching
      );

      state.hasMore =
        !!(data.page && data.page.hasMore);

      state.nextCursor =
        data.page && data.page.nextCursor
          ? data.page.nextCursor
          : null;

      return true;

    } catch (e) {
      state.issueError =
        e && e.message
          ? e.message
          : String(e || 'ADMIN_PUSH_ISSUES_MORE_FAILED');

      return false;

    } finally {
      state.loadingMore = false;
      notifyRender();
    }
  }

  function getState(){
    return {
      summary: state.summary,
      issues: state.issues.slice(),
      totalIssues: state.totalIssues,
      hasMore: state.hasMore,
      nextCursor: state.nextCursor,
      loading: state.loading,
      loadingMore: state.loadingMore,
      error: state.error,
      issueError: state.issueError,
      fetchedAt: state.fetchedAt
    };
  }

  window.SitePassAdminNotificationsOperationV92 = Object.freeze({
    render: render,
    refresh: refresh,
    loadMore: loadMore,
    clear: clear,
    getState: getState,
    setRenderCallback: setRenderCallback
  });
})();
