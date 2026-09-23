// SitePass STEP90 R2 - driver/worker read-only list
(function(){
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function render(subjectType) {
    var api = window.SitePassAdminEquipmentPersonnelApi;
    var detail = window.SitePassAdminEquipmentPersonnelDetail;
    var roleLabel = subjectType === 'worker' ? '인부' : '기사';

    if (!api || typeof api.getState !== 'function') {
      return '<div class="notice">서버 조회 모듈을 불러오지 못했습니다.</div>';
    }

    var state = api.getState(subjectType);

    if (state.loading && !state.payload) {
      return '<div class="notice blue-note">' + roleLabel + ' 서버 인증현황을 불러오는 중입니다.</div>';
    }

    if (state.error) {
      return '<div class="notice">' +
        '<b>' + roleLabel + ' 서버 조회 차단/실패</b><br>' +
        '최고관리자 세션 또는 서버 권한을 확인하세요. 브라우저 직접 DB 조회로 우회하지 않습니다.' +
        '<div class="small" style="margin-top:6px;">' + esc(state.error) + '</div>' +
      '</div>';
    }

    if (!state.payload) {
      return '<div class="notice blue-note">' + roleLabel + ' 탭을 열면 최고관리자 전용 read-only RPC로 조회합니다.</div>';
    }

    var payload = state.payload;
    var items = Array.isArray(payload.items) ? payload.items : [];

    return '<div class="sitepass-admin-person-summary-r2">' +
        '<div><b>전체</b><span>' + Number(payload.total || 0) + '</span></div>' +
        '<div><b>기사</b><span>' + Number(payload.driverCount || 0) + '</span></div>' +
        '<div><b>인부</b><span>' + Number(payload.workerCount || 0) + '</span></div>' +
        '<button type="button" class="ghost" onclick="return SitePassAdminEquipmentPersonnel.refreshActive(true)">새로고침</button>' +
      '</div>' +
      '<div class="sitepass-admin-person-list-r2">' +
        (items.length
          ? items.map(function(item){
              return detail && typeof detail.render === 'function'
                ? detail.render(item)
                : '<div class="notice">' + esc(item.displayName || '-') + '</div>';
            }).join('')
          : '<div class="empty">현재 서버에 등록된 ' + roleLabel + ' 인증현황이 없습니다.</div>') +
      '</div>';
  }

  window.SitePassAdminEquipmentPersonnelList = Object.freeze({
    render: render
  });
})();
