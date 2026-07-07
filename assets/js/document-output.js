// SitePass v23.7.275 - 문서 미리보기/프린트/다운로드 보조 기능 분리
// 담당자/수신자 화면의 서류 다운로드 HTML, 프린트 HTML, 출력 가능 페이지 계산을 담당합니다.
(function(){
  'use strict';

  function call(fn, fallback) {
    return typeof fn === 'function' ? fn : function(){ return fallback; };
  }

  function escapeHtmlFallback(value) {
    return String(value ?? '').replace(/[&<>"]/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[ch];
    });
  }

  function depsOrFallback(deps) {
    deps = deps || {};
    return {
      escapeHtml: call(deps.escapeHtml, ''),
      getDocPagesFromDoc: call(deps.getDocPagesFromDoc, []),
      getPrintablePreviewFromPage: call(deps.getPrintablePreviewFromPage, ''),
      getExpiryPeriodLabel: call(deps.getExpiryPeriodLabel, ''),
      getDdayTextWithDays: call(deps.getDdayTextWithDays, ''),
      getItemTitle: call(deps.getItemTitle, ''),
      getIncludedGroupText: call(deps.getIncludedGroupText, ''),
      getManagerExpireAt: call(deps.getManagerExpireAt, Date.now() + 7 * 24 * 60 * 60 * 1000),
      getShortcutName: call(deps.getShortcutName, 'SitePass_서류'),
      sanitizeFileName: call(deps.sanitizeFileName, 'SitePass_서류')
    };
  }

  function expandPrintablePages(docs, deps) {
    const d = depsOrFallback(deps);
    const out = [];
    (docs || []).forEach(function(doc){
      const pages = d.getDocPagesFromDoc(doc) || [];
      const docTitle = (doc && doc.groupTitle ? doc.groupTitle + ' - ' : '') + (doc && doc.title ? doc.title : '서류');
      if (pages.length) {
        pages.forEach(function(page, index){
          const pagePreview = d.getPrintablePreviewFromPage(page);
          if (pagePreview) {
            out.push({
              doc: doc,
              docTitle: docTitle,
              pageNo: index + 1,
              totalPages: pages.length,
              fileName: page.fileName || '',
              previewDataUrl: pagePreview,
              expireDate: doc.expireDate || '',
              driverPhone: doc.driverPhone || '',
              workerPhone: doc.workerPhone || '',
              personPhone: doc.personPhone || '',
              workerTask: doc.workerTask || ''
            });
          }
        });
      } else {
        const docPreview = (doc && (doc.previewDataUrl || doc.correctedDataUrl || doc.originalDataUrl)) || '';
        if (docPreview) {
          out.push({
            doc: doc,
            docTitle: docTitle,
            pageNo: 1,
            totalPages: 1,
            fileName: doc.fileName || '',
            previewDataUrl: docPreview,
            expireDate: doc.expireDate || '',
            driverPhone: doc.driverPhone || '',
            workerPhone: doc.workerPhone || '',
            personPhone: doc.personPhone || '',
            workerTask: doc.workerTask || ''
          });
        }
      }
    });
    return out;
  }

  function expandBlockedPages(docs, deps) {
    const d = depsOrFallback(deps);
    const out = [];
    (docs || []).forEach(function(doc){
      const pages = d.getDocPagesFromDoc(doc) || [];
      const docTitle = (doc && doc.groupTitle ? doc.groupTitle + ' - ' : '') + (doc && doc.title ? doc.title : '서류');
      if (pages.length) {
        pages.forEach(function(page, index){
          if (!d.getPrintablePreviewFromPage(page)) {
            out.push({ doc: doc, docTitle: docTitle + ' ' + (index + 1) + '페이지', fileName: page.fileName || '' });
          }
        });
      } else if (doc && doc.fileName && !(doc.previewDataUrl || doc.correctedDataUrl || doc.originalDataUrl)) {
        out.push({ doc: doc, docTitle: docTitle, fileName: doc.fileName || '' });
      }
    });
    return out;
  }

  function renderPlainExtra(doc, deps) {
    const d = depsOrFallback(deps);
    const escapeHtml = d.escapeHtml || escapeHtmlFallback;
    const parts = [];
    const phone = (doc && (doc.driverPhone || doc.workerPhone || doc.personPhone)) || '';
    if (phone) parts.push('전화번호: ' + escapeHtml(phone));
    if (doc && doc.workerTask) parts.push('작업내용: ' + escapeHtml(doc.workerTask));
    return parts.join('<br>');
  }

  function buildPrintHtml(item, pages, blockedPages, deps) {
    const d = depsOrFallback(deps);
    const escapeHtml = d.escapeHtml || escapeHtmlFallback;
    const title = '\u200B';
    const attachedPrintCount = (pages || []).length;
    const totalPrintPages = attachedPrintCount + 1;
    const blockedHtml = (blockedPages && blockedPages.length)
      ? '<section class="blocked"><h2>인쇄 제외된 첨부</h2><p>아래 파일은 현재 베타 저장본에 이미지 미리보기가 없어 서버 저장 단계에서 원본 인쇄를 연결합니다.</p>' +
        blockedPages.map(function(page){
          return '<div>· ' + escapeHtml(page.docTitle || '') + ' / ' + escapeHtml(page.fileName || '') + '</div>';
        }).join('') + '</section>'
      : '';
    const docsHtml = (pages || []).map(function(page, index){
      const dateText = page.expireDate ? d.getExpiryPeriodLabel(page.doc) + ': ' + d.getDdayTextWithDays(page.expireDate) + ' / ' + page.expireDate : '';
      const extra = renderPlainExtra(page, d);
      const hasExtra = !!extra;
      const pageTitle = ((item && item.equipmentNo) ? item.equipmentNo + ' ' : '') + page.docTitle + ((page.pageNo && page.pageNo > 1 && page.totalPages > 1) ? ' - ' + page.pageNo + '페이지' : '');
      return '<section class="print-page' + (hasExtra ? ' has-extra' : '') + '">' +
        '<div class="doc-meta"><strong>' + (index + 1) + '. ' + escapeHtml(pageTitle) + '</strong><span>' + escapeHtml(dateText) + '</span></div>' +
        (extra ? '<div class="extra">' + extra + '</div>' : '') +
        '<img src="' + page.previewDataUrl + '" alt="' + escapeHtml(pageTitle) + '">' +
      '</section>';
    }).join('');
    return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + title + '</title><style>' +
      'body{margin:0;padding:18px;font-family:Arial,"Noto Sans KR",sans-serif;color:#111;background:#fff}' +
      '.cover{border:1px solid #ddd;border-radius:12px;padding:14px;margin-bottom:16px}' +
      '.cover h1{font-size:22px;margin:0 0 8px}.cover div{font-size:13px;line-height:1.6}' +
      '.print-page{break-after:page;page-break-after:always;break-inside:avoid;margin:0;padding:0;text-align:center;overflow:hidden}' +
      '.doc-meta{display:flex;justify-content:space-between;gap:10px;align-items:flex-end;border-bottom:1px solid #ddd;padding:0 0 5px;margin:0 0 6px;text-align:left}' +
      '.doc-meta strong{font-size:15px}.doc-meta span{font-size:11px;color:#555;text-align:right}.extra{font-size:12px;line-height:1.25;text-align:left;margin:0 0 4px;padding:5px 8px;border:1px solid #ddd;border-radius:8px}' +
      'img{display:block;margin:0 auto;max-width:100%;max-height:84vh;object-fit:contain}.print-page.has-extra img{max-height:78vh}.blocked{border:1px solid #f0c36d;background:#fff8e5;border-radius:10px;padding:12px;margin:12px 0;break-inside:avoid}.blocked h2{font-size:16px;margin:0 0 6px}.blocked p{font-size:13px;margin:0 0 8px;color:#555}' +
      '@page{size:auto;margin:10mm}@media print{body{padding:0}.cover{break-after:page;page-break-after:always}.print-page:last-child{break-after:auto;page-break-after:auto}}' +
      '</style></head><body onload="setTimeout(function(){window.focus();window.print();},450)">' +
      '<section class="cover"><h1>SitePass 서류 인쇄</h1>' +
      '<div><b>장비</b>: ' + escapeHtml(d.getItemTitle(item)) + '</div>' +
      '<div><b>포함서류</b>: ' + escapeHtml(d.getIncludedGroupText(item)) + '</div>' +
      '<div><b>인쇄일시</b>: ' + escapeHtml(new Date().toLocaleString('ko-KR')) + '</div>' +
      '<div><b>첨부서류</b>: ' + attachedPrintCount + '장</div>' +
      '<div><b>인쇄페이지</b>: ' + totalPrintPages + '장</div></section>' +
      docsHtml + blockedHtml + '</body></html>';
  }

  function buildDownloadHtml(item, pages, blockedPages, deps) {
    const d = depsOrFallback(deps);
    const printHtml = buildPrintHtml(item, pages, blockedPages, d);
    const expireAt = d.getManagerExpireAt(item);
    const expireScript = '<script>(function(){var expireAt=' + JSON.stringify(expireAt) + ';if(Date.now()>expireAt){document.body.innerHTML="<div style=\\"font-family:Arial,sans-serif;margin:30px;padding:20px;border:1px solid #ffd591;border-radius:14px;background:#fff7e6;color:#694000\\"><b>만료된 담당자 서류파일입니다.</b><br>발급 후 1일이 지나 열람할 수 없습니다. 새 QR·링크를 다시 받아주세요.</div>";return;}var bar=document.createElement("div");bar.style.cssText="position:sticky;top:0;background:#f3f6fb;border-bottom:1px solid #d7dfed;padding:10px;text-align:center;z-index:10";bar.innerHTML="<button onclick=\\"window.print()\\" style=\\"min-height:42px;padding:10px 18px;border:0;border-radius:12px;background:#2457d6;color:white;font-weight:900\\">프린트</button> <span style=\\"font-size:13px;color:#667085;margin-left:8px\\">담당자 서류 다운로드본 · 1일 유효</span>";document.body.insertBefore(bar,document.body.firstChild);})();</scr' + 'ipt>';
    return printHtml
      .replace('<body onload="setTimeout(function(){window.focus();window.print();},450)">', '<body>')
      .replace('</body></html>', expireScript + '</body></html>');
  }

  function downloadDocsBundle(item, docs, label, deps) {
    const d = depsOrFallback(deps);
    const printablePages = expandPrintablePages(docs || [], d);
    const blockedPages = expandBlockedPages(docs || [], d);
    if (!printablePages.length) {
      alert('첨부파일은 확인되지만 현재 베타 저장본에 다운로드할 사진 데이터가 없습니다.\nv23.7.339 이후 사진을 다시 첨부해 저장하면 담당자 화면에서 바로 다운로드/프린트가 됩니다.\nPDF 원본 다운로드는 서버 저장 단계에서 연결합니다.');
      return;
    }
    const html = buildDownloadHtml(item, printablePages, blockedPages, d);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = d.sanitizeFileName(d.getShortcutName(item) + '_' + (label || '서류')) + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1200);
  }

  function printDocs(item, docs, deps) {
    const d = depsOrFallback(deps);
    const printablePages = expandPrintablePages(docs || [], d);
    const blockedPages = expandBlockedPages(docs || [], d);
    if (!printablePages.length) {
      const blockedText = blockedPages.map(function(page){ return '- ' + page.docTitle + ' / ' + page.fileName; }).join('\n');
      alert('첨부파일은 확인되지만 현재 베타 저장본에 바로 인쇄할 사진 데이터가 없습니다.\n\nv23.7.339 이후 사진을 다시 첨부해 저장하면 담당자 화면에서 바로 프린트됩니다. PDF 원본 인쇄는 서버 저장 단계에서 연결합니다.' + (blockedText ? '\n\n확인된 첨부파일:\n' + blockedText : ''));
      return;
    }
    const win = window.open('', '_blank');
    if (!win) {
      alert('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 눌러주세요.');
      return;
    }
    const html = buildPrintHtml(item, printablePages, blockedPages, d);
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  window.SitePassDocumentOutput = {
    expandPrintablePages: expandPrintablePages,
    expandBlockedPages: expandBlockedPages,
    renderPlainExtra: renderPlainExtra,
    buildPrintHtml: buildPrintHtml,
    buildDownloadHtml: buildDownloadHtml,
    downloadDocsBundle: downloadDocsBundle,
    printDocs: printDocs
  };
})();
