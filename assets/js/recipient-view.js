// SitePass v23.7.274 split step - 담당자/수신자 조회화면 보조 파일
// 담당자 QR/링크 수신 화면에서 쓰는 제목, 포함서류 표시, 다운로드/프린트 툴바, 만료/상태 문구 보조 기능입니다.
// 실제 화면 열기, 인쇄 실행, 다운로드 실행 본체는 안정성을 위해 app.bundle.js에 남겨두고 다음 단계에서 더 나눕니다.
(function(){
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fallbackEscapeJs(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
  }

  function callOrFallback(fn, fallbackValue) {
    try {
      if (typeof fn === 'function') return fn();
    } catch (e) {}
    return fallbackValue;
  }

  function getShareItemLabel(item) {
    if (!item) return '';
    return (item.equipmentName || '장비명 없음') + ' / ' + (item.equipmentNo || '번호 없음');
  }

  function getItemTitle(item) {
    return getShareItemLabel(item);
  }

  function getShareTitleForItems(items) {
    const safe = (items || []).filter(Boolean);
    if (safe.length === 1) return getShareItemLabel(safe[0]) + ' 서류';
    if (!safe.length) return 'SitePass 담당자 서류';
    return 'SitePass 장비서류 ' + safe.length + '건';
  }

  function getShareSubtitle(item) {
    return '현장 반입서류 확인 · 다운로드/프린트 전용';
  }

  function getIncludedGroupText(item) {
    const names = item && item.bundleMeta && item.bundleMeta.includedGroupNames;
    if (Array.isArray(names) && names.length) {
      const out = names.slice();
      const meta = item.bundleMeta || {};
      const workerIndex = out.indexOf('인부서류');
      const workerCount = Number(meta.workerPeopleCount || (Array.isArray(item.workerPeople) ? item.workerPeople.length : 0));
      if (workerIndex >= 0 && workerCount) {
        out[workerIndex] = '인부서류 ' + workerCount + '명(보통 ' + (meta.normalWorkerCount || 0) + '명 / 특수 ' + (meta.specialWorkerCount || 0) + '명)';
      }
      return out.join(', ');
    }
    if (item && item.type === 'BUNDLE') return '장비서류';
    return '장비서류';
  }

  function getDdayTextWithDays(dateValue, deps) {
    const text = callOrFallback(() => deps.getDdayText(dateValue), '');
    if (!text) return '';
    return /^D-\d+$/.test(text) ? text + '일' : text;
  }

  function getExpiryPeriodLabel(doc) {
    const title = String((doc && doc.title) || '서류');
    if (title.includes('보험')) return '보험만료기간';
    if (title.includes('검사')) return title.includes('비파괴') ? '비파괴검사 만료기간' : '검사만료기간';
    if (title.includes('안전교육') || title.includes('교육')) return '교육만료기간';
    if (title.includes('면허')) return '면허만료기간';
    return '서류만료기간';
  }

  function getDocDisplayTitle(doc) {
    return ((doc && doc.groupTitle) ? doc.groupTitle + ' - ' : '') + ((doc && doc.title) || '서류');
  }

  function getDocStatusText(doc, deps) {
    const pages = callOrFallback(() => deps.getDocPagesFromDoc(doc), []);
    const pageText = pages && pages.length ? ' · ' + pages.length + '장' : '';
    const status = String((doc && doc.status) || callOrFallback(() => deps.getDocStatus(doc), '첨부됨'));
    const expiryText = doc && doc.expireDate ? ' / ' + getExpiryPeriodLabel(doc) + ' ' + getDdayTextWithDays(doc.expireDate, deps || {}) : '';
    return status + pageText + expiryText;
  }

  function getDocBadgeText(doc, deps) {
    if (doc && doc.fileName) return getDocStatusText(doc, deps || {});
    return doc && doc.required ? '미첨부' : '선택안함';
  }

  function getDocBadgeClass(doc) {
    if (doc && doc.fileName) return 'done';
    return doc && doc.required ? 'need' : '';
  }

  function countAttachedPages(docs, deps) {
    return (docs || []).reduce((sum, doc) => {
      const pages = callOrFallback(() => deps.getDocPagesFromDoc(doc), []);
      return sum + (Array.isArray(pages) ? pages.length : 0);
    }, 0);
  }

  function countPrintablePages(docs, deps) {
    return (docs || []).reduce((sum, doc) => {
      const pages = callOrFallback(() => deps.expandPrintablePages([doc]), []);
      return sum + (Array.isArray(pages) ? pages.length : 0);
    }, 0);
  }

  function renderDownloadToolbar(item, options) {
    const opts = options || {};
    const deps = opts.deps || {};
    const docs = callOrFallback(() => deps.getDisplayDocs(item), []);
    const code = item && item.code ? item.code : '';
    const escapeJs = typeof deps.escapeJs === 'function' ? deps.escapeJs : fallbackEscapeJs;
    const safeCode = escapeJs(code);
    const attachedPageCount = countAttachedPages(docs, deps);
    const printableCount = countPrintablePages(docs, deps);
    const mode = opts.mode === 'manager' ? 'manager' : 'public';
    const showSelection = opts.showSelection !== false;
    const allDownloadLabel = mode === 'manager' ? '전체 다운로드' : '전체 서류 다운로드';
    const allPrintLabel = mode === 'manager' ? '전체 프린트' : '전체 서류 인쇄';
    const selectedPrintLabel = mode === 'manager' ? '선택 프린트' : '선택 인쇄';
    return '<div class="print-toolbar download-toolbar">' +
      '<div class="print-help full">필요한 서류를 체크하고 상단 버튼으로 다운로드/프린트하세요. 첨부 ' + attachedPageCount + '장 / 바로 처리 가능 ' + printableCount + '장</div>' +
      '<button type="button" class="' + (mode === 'manager' ? 'primary' : 'okBtn') + '" onclick="downloadAllDocsBundle(\'' + safeCode + '\')">' + allDownloadLabel + '</button>' +
      '<button type="button" class="primary" onclick="printAllDocs(\'' + safeCode + '\')">' + allPrintLabel + '</button>' +
      (showSelection ? '<button type="button" class="ghost" onclick="selectAllPrintDocs(true)">전체선택</button>' : '') +
      (showSelection ? '<button type="button" class="secondary" onclick="selectAllPrintDocs(false)">선택해제</button>' : '') +
      (showSelection ? '<button type="button" class="okBtn" onclick="downloadSelectedDocsBundle(\'' + safeCode + '\')">선택 다운로드</button>' : '<button type="button" class="okBtn" onclick="openQrPublicView(\'' + safeCode + '\')">선택 다운로드</button>') +
      (showSelection ? '<button type="button" class="' + (mode === 'manager' ? 'okBtn' : 'primary') + '" onclick="printSelectedDocs(\'' + safeCode + '\')">' + selectedPrintLabel + '</button>' : '<button type="button" class="primary" onclick="openQrPublicView(\'' + safeCode + '\')">선택 인쇄</button>') +
    '</div>';
  }

  function renderSponsorBox() {
    return '';
  }

  function getManagerRemainingDays(expireAt) {
    const end = Number(expireAt || 0);
    if (!end) return 0;
    return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  }

  function getInvalidManagerLinkHtml() {
    return '<div class="manager-expire-box"><b>올바르지 않은 담당자 QR·링크입니다.</b><br>만료시간이 변경되었거나 이미 폐기된 링크입니다.<br>장비업자에게 새 공유 QR·링크를 다시 받아주세요.</div>';
  }

  function getExpiredManagerLinkHtml() {
    return '<div class="manager-expire-box"><b>만료된 담당자 QR·링크입니다.</b><br>이 담당자 접속은 1일이 지나 더 이상 열 수 없습니다.<br>장비업자에게 새 공유 QR·링크를 다시 받아주세요.<br><span class="small">장비업자의 원본 서류함과 수정/갱신 화면은 그대로 유지됩니다.</span></div>';
  }

  window.SitePassRecipientView = {
    getShareItemLabel,
    getItemTitle,
    getShareTitleForItems,
    getShareSubtitle,
    getIncludedGroupText,
    getDdayTextWithDays,
    getExpiryPeriodLabel,
    getDocDisplayTitle,
    getDocStatusText,
    getDocBadgeText,
    getDocBadgeClass,
    countAttachedPages,
    countPrintablePages,
    renderDownloadToolbar,
    renderSponsorBox,
    getManagerRemainingDays,
    getInvalidManagerLinkHtml,
    getExpiredManagerLinkHtml
  };
})();
