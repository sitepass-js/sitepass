// SitePass STEP83 V34 - share/download 책임 분리
// 공유 화면의 전체/선택/단일 다운로드 컨트롤러만 담당합니다.
(function(){
  'use strict';

  function downloadDocsBundle(item, docs, label, deps) {
    deps = deps || {};
    const out =
      typeof deps.getDocumentOutputModule === 'function'
        ? deps.getDocumentOutputModule()
        : null;

    if (out && typeof out.downloadDocsBundle === 'function') {
      return out.downloadDocsBundle(
        item,
        docs,
        label,
        typeof deps.getDocumentOutputDeps === 'function'
          ? deps.getDocumentOutputDeps()
          : {}
      );
    }

    alert('문서 다운로드 기능 파일을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
  }

  function downloadAllDocsBundle(code, deps) {
    deps = deps || {};
    const item =
      typeof deps.getRuntimeItemByCode === 'function'
        ? deps.getRuntimeItemByCode(code)
        : null;

    if (!item) return;

    const docs =
      typeof deps.getAttachedDisplayDocs === 'function'
        ? deps.getAttachedDisplayDocs(item)
        : [];

    return downloadDocsBundle(item, docs, '전체서류', deps);
  }

  function downloadSelectedDocsBundle(code, deps) {
    deps = deps || {};
    const item =
      typeof deps.getRuntimeItemByCode === 'function'
        ? deps.getRuntimeItemByCode(code)
        : null;

    if (!item) return;

    const keys =
      typeof deps.getSelectedPrintDocKeys === 'function'
        ? deps.getSelectedPrintDocKeys()
        : [];

    if (!keys.length) {
      alert('다운로드할 서류를 체크해주세요.');
      return;
    }

    const docs =
      typeof deps.getDocsByKeys === 'function'
        ? deps.getDocsByKeys(item, keys)
        : [];

    return downloadDocsBundle(item, docs, '선택서류', deps);
  }

  function downloadSingleDocBundle(code, key, deps) {
    deps = deps || {};
    const item =
      typeof deps.getRuntimeItemByCode === 'function'
        ? deps.getRuntimeItemByCode(code)
        : null;

    if (!item) return;

    const docs =
      typeof deps.getDocsByKeys === 'function'
        ? deps.getDocsByKeys(item, [key])
        : [];

    return downloadDocsBundle(item, docs, '단일서류', deps);
  }

  window.SitePassShareDownload = Object.freeze({
    downloadDocsBundle,
    downloadAllDocsBundle,
    downloadSelectedDocsBundle,
    downloadSingleDocBundle
  });
})();
