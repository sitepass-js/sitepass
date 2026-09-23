// SitePass STEP83 V34 - share/member-view 책임 분리
// 회원 미리보기 경로와 회원 상세 서류 렌더 어댑터만 담당합니다.
(function(){
  'use strict';

  const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function openMemberPreview(code, deps) {
    deps = deps || {};
    const startedAt =
      (window.performance && performance.now)
        ? performance.now()
        : Date.now();

    const targetCode = String(code || '').trim();

    if (!targetCode) {
      try {
        if (typeof deps.hidePreparing === 'function') deps.hidePreparing();
      } catch (e) {}
      alert('회원 미리보기에 필요한 장비 정보를 확인하지 못했습니다. 보관함으로 돌아가 다시 시도해 주세요.');
      return;
    }

    const item =
      typeof deps.getItem === 'function'
        ? deps.getItem(targetCode)
        : null;

    const equipmentId = String(
      item && (item.equipment_id || item.equipmentId) || ''
    ).trim();

    if (!UUID_PATTERN.test(equipmentId)) {
      try {
        if (typeof deps.hidePreparing === 'function') deps.hidePreparing();
      } catch (e) {}

      console.warn(
        '[SitePass 41] member preview equipment_id missing',
        { code:targetCode, hasItem:!!item }
      );

      alert('회원 미리보기용 장비 식별자를 확인하지 못했습니다. 보관함으로 돌아가 다시 시도해 주세요.');
      return;
    }

    const url = new URL('./member-preview.html', window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('equipment_id', equipmentId);
    url.searchParams.set('v', '572');

    try {
      if (typeof deps.hidePreparing === 'function') deps.hidePreparing();
    } catch (e) {}

    try {
      const endedAt =
        (window.performance && performance.now)
          ? performance.now()
          : Date.now();

      console.info(
        '[SitePass 41] member preview route ready',
        Math.round((endedAt - startedAt) * 10) / 10 + 'ms',
        { equipment_id:equipmentId }
      );
    } catch (e) {}

    window.location.assign(url.toString());
  }

  function renderMemberDetailDoc(doc, deps) {
    deps = deps || {};
    const hasFile =
      typeof deps.hasFile === 'function'
        ? deps.hasFile(doc)
        : false;

    if (hasFile && typeof deps.renderDocDetail === 'function') {
      return deps.renderDocDetail(doc);
    }

    if (typeof deps.renderMissingOriginal === 'function') {
      return deps.renderMissingOriginal(doc);
    }

    return '';
  }

  window.SitePassShareMemberView = Object.freeze({
    openMemberPreview,
    renderMemberDetailDoc
  });
})();
