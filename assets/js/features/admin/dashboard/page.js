// SitePass STEP88 - admin dashboard page
(function(){
  'use strict';

  function render(local){
    local = local || {};

    var api = window.SitePassAdminDashboardApi || null;
    var cards = window.SitePassAdminDashboardCards || null;
    var charts = window.SitePassAdminDashboardCharts || null;

    if (!api || !cards) {
      return '<div class="card sitepass-admin-dashboard-state-v727" style="box-shadow:none;">' +
        '<h3>대시보드</h3><div class="notice">대시보드 모듈을 불러오지 못했습니다.</div></div>';
    }

    var state = api.getState();
    var summary = state.summary;

    if (!summary) {
      var statusText = state.error
        ? '대시보드 요약을 불러오지 못했습니다.'
        : '대시보드 요약을 불러오는 중입니다.';

      return '<div class="card sitepass-admin-dashboard-state-v727" style="box-shadow:none;">' +
        '<h3>관리자 요약 현황</h3>' +
        '<div class="notice ' + (state.error ? '' : 'blue-note') + '">' +
          statusText +
          (state.error ? '<br><span class="small">' + String(state.error).replace(/[&<>"']/g, '') + '</span>' : '') +
        '</div>' +
        '<button type="button" class="ghost" onclick="return SitePassAdminDashboardPage.refresh(true)">다시 불러오기</button>' +
      '</div>';
    }

    return cards.renderTodo(local, summary) +
      cards.renderTop(local, summary) +
      cards.renderShare(summary) +
      (charts && typeof charts.render === 'function' ? charts.render(summary) : '');
  }

  async function refresh(force){
    var api = window.SitePassAdminDashboardApi || null;
    if (!api || typeof api.refresh !== 'function') return false;

    var before = api.getState && typeof api.getState === 'function'
      ? api.getState()
      : {};

    var result = await api.refresh(!!force);

    var after = api.getState && typeof api.getState === 'function'
      ? api.getState()
      : {};

    /*
      STEP88 v729:
      renderAdmin()은 dashboard 진입 시 refresh(false)를 예약한다.
      cached:true / loading:true 상태에서도 다시 render를 예약하면
      render -> refresh(cached) -> render 루프가 발생한다.

      실제 dashboard 표시 상태가 바뀐 경우에만 재렌더한다.
      - 새 summary를 받은 경우: fetchedAt 변화
      - summary 존재 여부 변화
      - error 변화
      cached/loading 재사용만으로는 재렌더하지 않는다.
    */
    var shouldRender =
      Number(before.fetchedAt || 0) !== Number(after.fetchedAt || 0) ||
      !!before.summary !== !!after.summary ||
      String(before.error || '') !== String(after.error || '');

    try {
      if (
        shouldRender &&
        window.SitePassAdminAuth &&
        window.SitePassAdminAuth.isLoggedIn &&
        window.SitePassAdminAuth.isLoggedIn() === true &&
        typeof window.sitePassRequestAdminRender487 === 'function'
      ) {
        window.sitePassRequestAdminRender487(20);
      }
    } catch (e) {}

    return !!(result && result.ok);
  }

  window.SitePassAdminDashboardPage = Object.freeze({
    render: render,
    refresh: refresh
  });
})();
