// SitePass STEP83 V34 - share/print 책임 분리
// 공유 화면의 선택 UI와 전체/선택/단일 인쇄 컨트롤러만 담당합니다.
(function(){
  'use strict';

  function renderPrintToolbar(item, showSelection, deps) {
    deps = deps || {};
    if (!item) return '';

    const recipientView =
      typeof deps.getRecipientViewModule === 'function'
        ? deps.getRecipientViewModule()
        : null;

    if (recipientView && typeof recipientView.renderDownloadToolbar === 'function') {
      return recipientView.renderDownloadToolbar(item, {
        mode:'public',
        showSelection:!!showSelection,
        deps:{
          getDisplayDocs:deps.getAttachedDisplayDocs,
          getDocPagesFromDoc:deps.getDocPagesFromDoc,
          expandPrintablePages:deps.expandPrintablePages,
          escapeJs:deps.escapeJs
        }
      });
    }

    const code = item.code || '';
    const displayDocs =
      typeof deps.getAttachedDisplayDocs === 'function'
        ? deps.getAttachedDisplayDocs(item)
        : [];

    const printableCount = displayDocs.reduce(function(sum, doc){
      const pages =
        typeof deps.expandPrintablePages === 'function'
          ? deps.expandPrintablePages([doc])
          : [];
      return sum + pages.length;
    }, 0);

    const attachedPageCount = displayDocs.reduce(function(sum, doc){
      const pages =
        typeof deps.getDocPagesFromDoc === 'function'
          ? deps.getDocPagesFromDoc(doc)
          : [];
      return sum + pages.length;
    }, 0);

    const escapeJs =
      typeof deps.escapeJs === 'function'
        ? deps.escapeJs
        : function(value){
            return String(value || '')
              .replace(/\\/g, '\\\\')
              .replace(/'/g, "\\'");
          };

    return '<div class="print-toolbar download-toolbar">' +
      '<div class="print-help full">필요한 서류를 체크하고 상단 버튼으로 다운로드/프린트하세요. 첨부 ' + attachedPageCount + '장 / 바로 처리 가능 ' + printableCount + '장</div>' +
      '<button type="button" class="okBtn" onclick="downloadAllDocsBundle(\'' + escapeJs(code) + '\')">전체 서류 다운로드</button>' +
      '<button type="button" class="primary" onclick="printAllDocs(\'' + escapeJs(code) + '\')">전체 서류 인쇄</button>' +
      (showSelection ? '<button type="button" class="ghost" onclick="selectAllPrintDocs(true)">전체선택</button>' : '') +
      (showSelection ? '<button type="button" class="secondary" onclick="selectAllPrintDocs(false)">선택해제</button>' : '') +
      (showSelection ? '<button type="button" class="okBtn" onclick="downloadSelectedDocsBundle(\'' + escapeJs(code) + '\')">선택 다운로드</button>' : '<button type="button" class="okBtn" onclick="openQrPublicView(\'' + escapeJs(code) + '\')">선택 다운로드</button>') +
      (showSelection ? '<button type="button" class="primary" onclick="printSelectedDocs(\'' + escapeJs(code) + '\')">선택 인쇄</button>' : '<button type="button" class="primary" onclick="openQrPublicView(\'' + escapeJs(code) + '\')">선택 인쇄</button>') +
    '</div>';
  }

  function selectAllPrintDocs(checked) {
    document.querySelectorAll('[data-print-doc-check]').forEach(function(input){
      if (!input.disabled) input.checked = !!checked;
    });
  }

  function toggleSinglePrintCheck(key, deps) {
    deps = deps || {};
    const cssEscapeValue =
      typeof deps.cssEscapeValue === 'function'
        ? deps.cssEscapeValue
        : function(value){ return String(value || ''); };

    const input = document.querySelector(
      '[data-print-doc-check][value="' +
      cssEscapeValue(key) +
      '"]'
    );

    if (input && !input.disabled) input.checked = !input.checked;
  }

  function getSelectedPrintKeys() {
    return Array.from(
      document.querySelectorAll('[data-print-doc-check]:checked')
    ).map(function(input){
      return input.value;
    });
  }

  function getSelectedPrintDocKeys() {
    return getSelectedPrintKeys();
  }

  function printDocs(item, docs, deps) {
    deps = deps || {};
    const out =
      typeof deps.getDocumentOutputModule === 'function'
        ? deps.getDocumentOutputModule()
        : null;

    if (out && typeof out.printDocs === 'function') {
      return out.printDocs(
        item,
        docs,
        typeof deps.getDocumentOutputDeps === 'function'
          ? deps.getDocumentOutputDeps()
          : {}
      );
    }

    alert('문서 인쇄 기능 파일을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
  }

  function printAllDocs(code, deps) {
    deps = deps || {};
    const item =
      typeof deps.getRuntimeItemByCode === 'function'
        ? deps.getRuntimeItemByCode(code)
        : null;

    if (!item) {
      alert('인쇄할 코드를 찾을 수 없습니다.');
      return;
    }

    const docs =
      typeof deps.getAttachedDisplayDocs === 'function'
        ? deps.getAttachedDisplayDocs(item)
        : [];

    return printDocs(item, docs, deps);
  }

  function printSelectedDocs(code, deps) {
    deps = deps || {};
    const item =
      typeof deps.getRuntimeItemByCode === 'function'
        ? deps.getRuntimeItemByCode(code)
        : null;

    if (!item) {
      alert('인쇄할 코드를 찾을 수 없습니다.');
      return;
    }

    const keys = getSelectedPrintKeys();

    if (!keys.length) {
      alert('인쇄할 서류를 체크해주세요.');
      return;
    }

    const docs =
      typeof deps.getDocsByKeys === 'function'
        ? deps.getDocsByKeys(item, keys)
        : [];

    return printDocs(item, docs, deps);
  }

  function printSingleDoc(code, key, deps) {
    deps = deps || {};
    const item =
      typeof deps.getRuntimeItemByCode === 'function'
        ? deps.getRuntimeItemByCode(code)
        : null;

    if (!item) {
      alert('인쇄할 코드를 찾을 수 없습니다.');
      return;
    }

    const docs =
      typeof deps.getDocsByKeys === 'function'
        ? deps.getDocsByKeys(item, [key])
        : [];

    return printDocs(item, docs, deps);
  }

  window.SitePassSharePrint = Object.freeze({
    renderPrintToolbar,
    selectAllPrintDocs,
    toggleSinglePrintCheck,
    getSelectedPrintKeys,
    getSelectedPrintDocKeys,
    printDocs,
    printAllDocs,
    printSelectedDocs,
    printSingleDoc
  });
})();
