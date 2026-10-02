// SitePass STEP95 - audit logs page renderer
(function(){
  'use strict';

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }

  function shortId(value){
    var text = String(value || '');
    return text.length > 12 ? text.slice(0, 8) + '…' + text.slice(-4) : (text || '-');
  }

  function dateText(value){
    if (!value) return '-';
    var d = new Date(value);
    return Number.isNaN(d.getTime()) ? esc(value) : esc(d.toLocaleString());
  }

  function render(){
    var api = window.SitePassAdminAuditLogsV95 || null;
    if (!api || typeof api.getState !== 'function') {
      return '<div class="notice">감사기록 모듈을 불러오지 못했습니다.</div>';
    }

    var state = api.getState();
    var rows = state.items || [];

    var controls =
      '<div class="actions" style="margin:8px 0;">' +
        '<button type="button" class="ghost" onclick="return SitePassAdminStep95Page.refreshActive()">새로고침</button>' +
      '</div>';

    if (state.loading && !state.loaded) {
      return '<div class="notice blue-note">감사기록을 1회 조회 중입니다.</div>' + controls;
    }

    if (state.error) {
      return '<div class="notice">감사기록 조회 실패: ' + esc(state.error) + '</div>' + controls;
    }

    if (!state.loaded) {
      return '<div class="notice blue-note">감사기록을 불러오기 전입니다.</div>' + controls;
    }

    var table = rows.length
      ? '<div style="overflow:auto;"><table style="width:100%;border-collapse:collapse;">' +
          '<thead><tr><th>시각</th><th>작업</th><th>관리자</th><th>대상 회원</th><th>대상 보관함</th></tr></thead>' +
          '<tbody>' + rows.map(function(row){
            return '<tr>' +
              '<td>' + dateText(row.createdAt) + '</td>' +
              '<td><b>' + esc(row.action || '-') + '</b></td>' +
              '<td><code>' + esc(shortId(row.adminMemberId)) + '</code></td>' +
              '<td><code>' + esc(shortId(row.targetMemberId)) + '</code></td>' +
              '<td><code>' + esc(shortId(row.targetBoxId)) + '</code></td>' +
            '</tr>';
          }).join('') + '</tbody></table></div>'
      : '<div class="notice blue-note">현재 기록된 관리자 감사로그가 없습니다.</div>';

    return controls +
      '<div class="small" style="margin:6px 0;">' +
        '조회 자체는 감사로그를 추가하지 않으며 detail · IP · User-Agent는 이 화면에 노출하지 않습니다.' +
      '</div>' +
      table +
      '<div class="actions" style="margin-top:10px;">' +
        '<button type="button" class="ghost" ' + (state.canPrev ? '' : 'disabled ') + 'onclick="return SitePassAdminStep95Page.auditPrev()">이전</button>' +
        '<span class="small">페이지 ' + esc(state.pageIndex + 1) + '</span>' +
        '<button type="button" class="ghost" ' + (state.canNext ? '' : 'disabled ') + 'onclick="return SitePassAdminStep95Page.auditNext()">다음</button>' +
      '</div>';
  }

  window.SitePassAdminAuditLogsPageV95 = Object.freeze({ render: render });
})();


(function(){
  'use strict';

  var STEP95_ACTIVE_TAB_KEY = 'sitepass_step95_active_tab_v1';
  var allowedTabs = {
    migrations: true,
    storage: true,
    audit: true
  };

  function readStoredActiveTab(){
    try {
      var value = String(sessionStorage.getItem(STEP95_ACTIVE_TAB_KEY) || '').trim();
      return allowedTabs[value] ? value : 'migrations';
    } catch (e) {
      return 'migrations';
    }
  }

  function storeActiveTab(value){
    try {
      sessionStorage.setItem(STEP95_ACTIVE_TAB_KEY, value);
    } catch (e) {}
  }

  var activeTab = readStoredActiveTab();

  function requestRender(){
    try {
      if (typeof window.sitePassRequestAdminRender487 === 'function') {
        window.sitePassRequestAdminRender487(10);
      }
    } catch (e) {}
  }

  function currentApi(){
    if (activeTab === 'migrations') return window.SitePassAdminMigrationsV95 || null;
    if (activeTab === 'storage') return window.SitePassAdminStorageAuditV95 || null;
    return window.SitePassAdminAuditLogsV95 || null;
  }

  async function ensureActive(){
    var api = currentApi();
    if (!api || typeof api.getState !== 'function') return false;
    var state = api.getState();

    if (state.loading || state.loaded) return true;

    requestRender();

    var result;
    if (activeTab === 'audit') {
      result = await api.loadFirst(false);
    } else {
      result = await api.load({ force:false });
    }

    requestRender();
    return !!(result && result.ok);
  }

  async function refreshActive(){
    var api = currentApi();
    if (!api) return false;

    requestRender();

    var result;
    if (activeTab === 'audit') {
      result = await api.loadFirst(true);
    } else {
      var state = api.getState();
      result = await api.load({
        force: true,
        limit: state.limit,
        offset: state.offset,
        status: state.status
      });
    }

    requestRender();
    return false;
  }

  function setTab(tab){
    var key = String(tab || '');
    if (!allowedTabs[key]) return false;
    if (activeTab === key) {
      ensureActive();
      return false;
    }
    activeTab = key;
    storeActiveTab(activeTab);
    requestRender();
    ensureActive();
    return false;
  }

  function readSelect(id){
    var el = document.getElementById(id);
    return String(el && el.value || '').trim();
  }

  async function applyMigrationFilter(){
    var api = window.SitePassAdminMigrationsV95 || null;
    if (!api) return false;
    await api.load({
      force: true,
      limit: 25,
      offset: 0,
      status: readSelect('sitepassStep95MigrationStatus')
    });
    requestRender();
    return false;
  }

  async function migrationPrev(){
    var api = window.SitePassAdminMigrationsV95 || null;
    if (!api) return false;
    var state = api.getState();
    if (state.offset <= 0) return false;
    await api.load({
      force: true,
      limit: state.limit,
      offset: Math.max(0, state.offset - state.limit),
      status: state.status
    });
    requestRender();
    return false;
  }

  async function migrationNext(){
    var api = window.SitePassAdminMigrationsV95 || null;
    if (!api) return false;
    var state = api.getState();
    if (state.offset + state.items.length >= state.filteredCount) return false;
    await api.load({
      force: true,
      limit: state.limit,
      offset: state.offset + state.limit,
      status: state.status
    });
    requestRender();
    return false;
  }

  async function applyStorageFilter(){
    var api = window.SitePassAdminStorageAuditV95 || null;
    if (!api) return false;
    await api.load({
      force: true,
      limit: 25,
      offset: 0,
      status: readSelect('sitepassStep95StorageStatus')
    });
    requestRender();
    return false;
  }

  async function storagePrev(){
    var api = window.SitePassAdminStorageAuditV95 || null;
    if (!api) return false;
    var state = api.getState();
    if (state.offset <= 0) return false;
    await api.load({
      force: true,
      limit: state.limit,
      offset: Math.max(0, state.offset - state.limit),
      status: state.status
    });
    requestRender();
    return false;
  }

  async function storageNext(){
    var api = window.SitePassAdminStorageAuditV95 || null;
    if (!api) return false;
    var state = api.getState();
    if (state.offset + state.items.length >= state.filteredCount) return false;
    await api.load({
      force: true,
      limit: state.limit,
      offset: state.offset + state.limit,
      status: state.status
    });
    requestRender();
    return false;
  }

  async function auditNext(){
    var api = window.SitePassAdminAuditLogsV95 || null;
    if (!api) return false;
    await api.next();
    requestRender();
    return false;
  }

  function auditPrev(){
    var api = window.SitePassAdminAuditLogsV95 || null;
    if (!api) return false;
    api.prev();
    requestRender();
    return false;
  }

  function render(){
    var tabButtons =
      '<div class="actions" role="tablist" aria-label="STEP95 감사 관리">' +
        '<button type="button" class="' + (activeTab === 'migrations' ? 'primary' : 'ghost') + '" onclick="return SitePassAdminStep95Page.setTab(\'migrations\')">이전관리</button>' +
        '<button type="button" class="' + (activeTab === 'storage' ? 'primary' : 'ghost') + '" onclick="return SitePassAdminStep95Page.setTab(\'storage\')">Storage 검사</button>' +
        '<button type="button" class="' + (activeTab === 'audit' ? 'primary' : 'ghost') + '" onclick="return SitePassAdminStep95Page.setTab(\'audit\')">감사기록</button>' +
      '</div>';

    var body = '';
    if (activeTab === 'migrations') {
      body = window.SitePassAdminMigrationsPageV95 && typeof window.SitePassAdminMigrationsPageV95.render === 'function'
        ? window.SitePassAdminMigrationsPageV95.render()
        : '<div class="notice">이전관리 화면 모듈을 확인할 수 없습니다.</div>';
    } else if (activeTab === 'storage') {
      body = window.SitePassAdminStorageAuditPageV95 && typeof window.SitePassAdminStorageAuditPageV95.render === 'function'
        ? window.SitePassAdminStorageAuditPageV95.render()
        : '<div class="notice">Storage 검사 화면 모듈을 확인할 수 없습니다.</div>';
    } else {
      body = window.SitePassAdminAuditLogsPageV95 && typeof window.SitePassAdminAuditLogsPageV95.render === 'function'
        ? window.SitePassAdminAuditLogsPageV95.render()
        : '<div class="notice">감사기록 화면 모듈을 확인할 수 없습니다.</div>';
    }

    return '<div class="card" style="box-shadow:none;">' +
      '<h3>STEP95 이전 · Storage 검사 · 감사기록</h3>' +
      '<div class="notice blue-note">' +
        '필요할 때만 1회 조회합니다. 자동 polling · Realtime · 주기 갱신은 사용하지 않습니다.' +
      '</div>' +
      tabButtons +
      '<div style="margin-top:10px;">' + body + '</div>' +
    '</div>';
  }

  window.SitePassAdminStep95Page = Object.freeze({
    render: render,
    ensureActive: ensureActive,
    refreshActive: refreshActive,
    setTab: setTab,
    applyMigrationFilter: applyMigrationFilter,
    migrationPrev: migrationPrev,
    migrationNext: migrationNext,
    applyStorageFilter: applyStorageFilter,
    storagePrev: storagePrev,
    storageNext: storageNext,
    auditPrev: auditPrev,
    auditNext: auditNext
  });
})();
