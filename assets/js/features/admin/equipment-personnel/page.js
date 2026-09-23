// SitePass STEP90 R8 - equipment-centered registration management
(function(){
  'use strict';

  var personnelLoadScheduled = false;

  function requestRender() {
    if (typeof window.sitePassRequestAdminRender487 === 'function') {
      window.sitePassRequestAdminRender487(0);
      return;
    }
    if (typeof window.renderAdmin === 'function') {
      try { window.renderAdmin(); } catch (e) {}
    }
  }

  function apiModule() {
    return window.SitePassAdminEquipmentPersonnelApi || null;
  }

  function activeTab() {
    return 'equipment';
  }

  function ensurePersonnelLoaded() {
    var api = apiModule();
    if (!api || typeof api.getState !== 'function' || typeof api.refresh !== 'function') return;

    var targets = ['driver','worker'].filter(function(type){
      var snapshot = api.getState(type);
      return !snapshot.loading && !snapshot.fetchedAt;
    });

    if (!targets.length || personnelLoadScheduled) return;
    personnelLoadScheduled = true;

    setTimeout(function(){
      Promise.all(targets.map(function(type){
        return api.refresh(type, false);
      })).then(function(){
        personnelLoadScheduled = false;
        requestRender();
      }).catch(function(){
        personnelLoadScheduled = false;
        requestRender();
      });
    }, 0);
  }

  function setTab() {
    requestRender();
    return false;
  }

  function refreshActive(force) {
    var api = apiModule();
    if (!api || typeof api.refresh !== 'function') return false;

    Promise.all([
      api.refresh('driver', force === true),
      api.refresh('worker', force === true)
    ]).then(function(){
      requestRender();
    }).catch(function(){
      requestRender();
    });

    requestRender();
    return false;
  }

  function render(ctx) {
    ctx = ctx && typeof ctx === 'object' ? ctx : {};
    ensurePersonnelLoaded();

    return '<section class="sitepass-admin-equipment-personnel-page-r2">' +
      '<div class="sitepass-admin-ep-head-r2">' +
        '<div><h3>등록관리</h3>' +
          '<p>장비 1대 단위로 소유회원·장비서류·기사·인부·인증·약관동의 정보를 통합해서 확인합니다. 기사·인부 서버 조회는 기존 최고관리자 전용 read-only RPC를 그대로 사용합니다.</p></div>' +
      '</div>' +
      '<div class="sitepass-admin-ep-panel-r2">' + String(ctx.equipmentHtml || '') + '</div>' +
    '</section>';
  }

  window.SitePassAdminEquipmentPersonnel = Object.freeze({
    render: render,
    setTab: setTab,
    refreshActive: refreshActive,
    getActiveTab: activeTab
  });
})();
