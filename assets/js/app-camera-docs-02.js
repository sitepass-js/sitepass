    function renderDocCards() {
      const box = document.getElementById('docCards');
      if (!box) return;
      box.innerHTML = DOC_GROUPS.map(group => {
        const enabled = isBundleGroupEnabled(group.key);
        const docsHtml = group.key === 'worker'
          ? renderWorkerPeopleSection()
          : (group.key === 'driver' ? renderDriverAuthPanel() : '') + group.docs.map((doc, index) => renderDocCardHtml(group, doc, index)).join('');
        return '<div class="bundle-group ' + (enabled ? '' : 'inactive') + '" data-bundle-group="' + group.key + '" data-active="' + (enabled ? 'true' : 'false') + '">' +
          '<div class="bundle-group-head"><div class="bundle-group-title"><b>' + escapeHtml(group.title) + '</b><span>' + escapeHtml(group.summary) + '</span></div><span class="badge ' + (group.required ? 'need' : '') + '">' + (group.required ? '기본필수' : (enabled ? '포함됨' : '선택')) + '</span></div>' +
          '<div class="bundle-group-body ' + (enabled ? '' : 'hidden') + '">' + docsHtml + '</div>' +
        '</div>';
      }).join('');

      attachDocInputHandlers(box);
      renderBundleSummary();
    }

    async function handleFileChange(event) {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      const card = event.target.closest('.doc-card');
      if (!requirePrivateDocAuth(card)) {
        event.target.value = '';
        return;
      }
      const isCamera = event.target.dataset.role === 'camera' || event.target.dataset.role === 'camera-fallback';
      const sourceText = isCamera ? '사진찍기' : '파일선택';
      for (const file of files) {
        await applySelectedFile(card, file, sourceText);
      }
      event.target.value = '';
      promptAdditionalDocPage(card, sourceText);
    }

    async function applySelectedFile(card, file, sourceText) {
      if (!card || !file) return;
      const nameBox = card.querySelector('[data-role="filename"]');
      const pages = getDocPagesFromBox(nameBox);
      const page = await buildDocPage(card, file, sourceText);
      pages.push(page);
      setDocPagesToCard(card, pages);
    }

    async function makePreview(card, file) {
      // v23.7.3부터는 makePreview가 단일 파일 교체가 아니라 buildDocPage/add 방식으로 통합됩니다.
      if (!card || !file) return;
      await applySelectedFile(card, file, '파일선택');
      promptAdditionalDocPage(card, '파일선택');
    }

    function promptAdditionalDocPage(card, sourceText) {
      if (!card) return;
      const title = card.dataset.docTitle || '서류';
      const pages = getDocPagesFromCard(card);
      const count = pages.length || 1;
      setTimeout(function() {
        const ok = confirm(title + ' ' + count + '장 저장되었습니다.\n\n추가 장이 있나요?\n\n확인: 같은 서류에 추가 촬영/추가 업로드\n취소: 이 서류는 완료');
        if (!ok) return;
        if (!requirePrivateDocAuth(card)) return;
        const docKey = card.dataset.docKey || '';
        if (String(sourceText || '').includes('사진')) {
          openCameraGuide(docKey);
          return;
        }
        const fileInput = card.querySelector('input[data-role="file"]');
        if (fileInput) fileInput.click();
      }, 250);
    }

    function getDocPagesFromBox(nameBox) {
      if (!nameBox) return [];
      try {
        const pages = JSON.parse(nameBox.dataset.pagesJson || '[]');
        return Array.isArray(pages) ? pages : [];
      } catch (error) {
        return mergePendingRegistrationIntoItems([]);
      }
    }

    function getDocPagesFromCard(card) {
      return getDocPagesFromBox(card?.querySelector('[data-role="filename"]'));
    }

    function getPrintablePreviewFromPage(page) {
      if (!page) return '';
      return page.previewDataUrl || page.editDataUrl || page.correctedDataUrl || page.originalDataUrl || '';
    }

    function normalizeDocPageForPreview(page, index, doc) {
      const p = Object.assign({}, page || {});
      const fallbackPreview = getPrintablePreviewFromPage(p) || (index === 0 && doc ? (doc.previewDataUrl || doc.editDataUrl || doc.correctedDataUrl || doc.originalDataUrl || '') : '');
      p.previewDataUrl = fallbackPreview || '';
      if (p.previewDataUrl && !p.previewChoice) p.previewChoice = 'preview';
      p.fileName = p.fileName || (doc && doc.fileName) || '첨부파일';
      p.fileSource = p.fileSource || (doc && doc.fileSource) || '';
      p.fileType = p.fileType || (doc && doc.fileType) || '';
      p.editDataUrl = p.editDataUrl || '';
      return p;
    }

    function getDocPagesFromDoc(doc) {
      if (doc && Array.isArray(doc.pages) && doc.pages.length) {
        return doc.pages.map((page, index) => normalizeDocPageForPreview(page, index, doc));
      }
      if (doc && doc.fileName) {
        return [normalizeDocPageForPreview({
          id:'legacy_' + (doc.key || '') + '_1',
          fileName:doc.fileName || '',
          fileSource:doc.fileSource || '',
          fileType:doc.fileType || '',
          previewDataUrl:doc.previewDataUrl || '',
          originalDataUrl:doc.originalDataUrl || '',
          correctedDataUrl:doc.correctedDataUrl || '',
          editDataUrl:doc.editDataUrl || '',
          previewChoice:doc.previewChoice || '',
          autoFit:doc.autoFit || ''
        }, 0, doc)];
      }
      return [];
    }

    function docHasAnyAttachment(doc) {
      return !!(doc && (doc.fileName || getDocPagesFromDoc(doc).length));
    }

    function docHasPrintablePreview(doc) {
      const pages = getDocPagesFromDoc(doc);
      return pages.some(page => !!getPrintablePreviewFromPage(page)) || !!(doc && (doc.previewDataUrl || doc.correctedDataUrl || doc.originalDataUrl));
    }

    function summarizePages(pages) {
      const list = Array.isArray(pages) ? pages : [];
      if (!list.length) return '';
      const first = list[0]?.fileName || '첨부파일';
      return list.length === 1 ? first : first + ' 외 ' + (list.length - 1) + '장';
    }

    function setDocPagesToCard(card, pages) {
      const nameBox = card?.querySelector('[data-role="filename"]');
      if (!card || !nameBox) return;
      const cleanPages = (Array.isArray(pages) ? pages : []).filter(Boolean);
      nameBox.dataset.pagesJson = JSON.stringify(cleanPages);
      const firstPreview = cleanPages.find(p => p.previewDataUrl) || cleanPages[0] || {};
      nameBox.dataset.fileName = cleanPages.length ? summarizePages(cleanPages) : '';
      nameBox.dataset.fileSource = cleanPages.length ? (cleanPages[0].fileSource || '') : '';
      nameBox.dataset.fileType = cleanPages.length ? (cleanPages[0].fileType || '') : '';
      nameBox.dataset.previewDataUrl = firstPreview.previewDataUrl || '';
      nameBox.dataset.originalDataUrl = firstPreview.originalDataUrl || '';
      nameBox.dataset.correctedDataUrl = firstPreview.correctedDataUrl || '';
      nameBox.dataset.editDataUrl = firstPreview.editDataUrl || '';
      nameBox.dataset.previewChoice = firstPreview.previewChoice || '';
      nameBox.dataset.autoFit = firstPreview.autoFit || '';
      nameBox.textContent = cleanPages.length ? ('첨부 ' + cleanPages.length + '장 · ' + summarizePages(cleanPages)) : '첨부 없음';

      const badge = card.querySelector('.badge');
      if (badge) {
        if (cleanPages.length) {
          badge.textContent = '첨부 ' + cleanPages.length + '장';
          badge.classList.remove('need');
          badge.classList.add('done');
        } else {
          const required = card.dataset.required === 'true';
          badge.textContent = required ? '필수' : '선택';
          badge.classList.toggle('need', required);
          badge.classList.remove('done');
        }
      }
      renderCardPagesPreview(card);
      scheduleRegistrationDraftSave();
    }

    async function buildDocPage(card, file, sourceText) {
      const base = {
        id:'p' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        fileName:file.name,
        fileSource:sourceText,
        fileType:file.type || '',
        fileObjectUrl:'',
        previewDataUrl:'',
        originalDataUrl:'',
        correctedDataUrl:'',
        editDataUrl:'',
        previewChoice:'',
        autoFit:'',
        addedAt:new Date().toISOString()
      };
      if (file.type && file.type.startsWith('image/')) {
        try {
          const fitResult = await fitDocumentImageToDataUrl(file, 1100, 0.80, card.dataset.docKey || '');
          const preview = fitResult.dataUrl || await compressImageToDataUrl(file, 1100, 0.80);
          // v23.7.132부터는 스캔앱 방식으로 최종 스캔본 1장만 저장합니다.
          // 원본/수정본을 동시에 저장하지 않아 용량을 줄이고, 사용자가 선택 실수할 일을 없앱니다.
          base.originalDataUrl = '';
          base.correctedDataUrl = '';
          base.previewDataUrl = preview;
          base.editDataUrl = fitResult.editDataUrl || preview;
          base.previewChoice = 'scan-final';
          base.autoFit = fitResult.method || 'scanner-final-only';
          base.fitText = (sourceText || '').includes('스캔앱') ? '스캔앱 모드 · 최종본 1장 저장' : (fitResult.fitText || '자동스캔 최종본 1장 저장');
          base.ratioText = (sourceText || '').includes('용지자동자르기') ? '용지 자동자르기 완료' : (fitResult.ratioText || '원본/수정본 비교 없이 저장');
          card.dataset.cameraAutoCropDataUrl = '';
          card.dataset.cameraAutoCropLabel = '';
        } catch (error) {
          try {
            base.previewDataUrl = await compressImageToDataUrl(file, 1100, 0.78);
            base.editDataUrl = base.previewDataUrl;
            base.previewChoice = 'scan-final';
            base.autoFit = 'compressed-final-only';
            base.fitText = '최종본 1장 저장';
            base.ratioText = '자동스캔 실패 시 원본 축소 저장';
          } catch (innerError) {
            base.errorText = '이미지 미리보기를 만들 수 없습니다.';
          }
        }
      } else if ((file.type || '').includes('pdf') || String(file.name || '').toLowerCase().endsWith('.pdf')) {
        try {
          base.fileObjectUrl = URL.createObjectURL(file);
          base.previewChoice = 'pdf';
          base.autoFit = 'pdf-file';
          base.fitText = 'PDF 첨부됨';
          base.ratioText = '미리보기 가능';
        } catch (error) {
          base.errorText = 'PDF 미리보기를 준비할 수 없습니다.';
        }
      }
      return base;
    }

    function renderCardPagesPreview(card) {
      const nameBox = card?.querySelector('[data-role="filename"]');
      if (!nameBox) return;
      let preview = card.querySelector('.preview-wrap');
      if (!preview) {
        preview = document.createElement('div');
        preview.className = 'preview-wrap';
        nameBox.insertAdjacentElement('afterend', preview);
      }
      const pages = getDocPagesFromCard(card);
      if (!pages.length) {
        preview.classList.remove('show');
        preview.innerHTML = '';
        return;
      }
      preview.classList.add('show');
      const label = makeDocFileTopLabel({ title: card.dataset.docTitle || '첨부서류' }, '');
      const expiryDoc = { title: card.dataset.docTitle || '', expireDate: card.querySelector('[data-date-key]')?.value || '' };
      preview.innerHTML = '<div class="preview-title"><span>첨부 ' + pages.length + '장 · 최종 스캔본</span></div>' + renderPagesListHtml(pages, { editable:true, docKey:card.dataset.docKey, docLabel:label }) + renderDocExpiryStrip(expiryDoc);
    }

    function renderPdfAttachedBox(page, message) {
      const pdfSrc = page.fileObjectUrl || page.fileDataUrl || '';
      const helperText = message || '선택한 PDF 파일을 바로 확인할 수 있습니다.';
      const previewButton = pdfSrc
        ? '<button type="button" data-pdf-src="' + escapeHtml(pdfSrc) + '" onclick="openPdfPreview(this.dataset.pdfSrc); event.stopPropagation();">미리보기</button>'
        : '<button type="button" onclick="alert(\'현재 브라우저에 남아있는 PDF 미리보기 파일이 없습니다. 파일선택으로 다시 첨부하면 바로 미리보기가 뜹니다.\'); event.stopPropagation();">미리보기</button>';
      return '<div class="preview-pdf">PDF 첨부됨<br><span class="small">' + escapeHtml(helperText) + '</span><div class="pdf-preview-actions">' + previewButton + '</div></div>';
    }

    function renderPagesListHtml(pages, options = {}) {
      const editable = !!options.editable;
      const readonly = !!options.readonly;
      const docKey = options.docKey || '';
      const docCode = options.code || '';
      const imageOnly = !!options.imageOnly;
      const simpleUpdateMode = editable && !!editingCode;

      if (imageOnly) {
        return '<div class="page-list clean-page-list">' + (pages || []).map((page, index) => {
          const isPdf = (page.fileType || '').includes('pdf') || String(page.fileName || '').toLowerCase().endsWith('.pdf');
          const imgSrc = page.previewDataUrl || page.correctedDataUrl || page.originalDataUrl || '';
          const labelText = options.docLabel ? (String(options.docLabel) + ((pages || []).length > 1 ? ' ' + (index + 1) + '페이지' : '')) : '';
          const labelHtml = labelText ? '<div class="page-file-label">' + escapeHtml(labelText) + '</div>' : '';
          let body = '';
          if (imgSrc) {
            body = '<div class="paper-frame"><img class="preview-img" alt="첨부 이미지" src="' + imgSrc + '" data-preview-src="' + imgSrc + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>';
          } else {
            body = isPdf ? renderPdfAttachedBox(page, '선택한 PDF 파일입니다.') : '<div class="preview-pdf">첨부됨<br><span class="small">이미지 저장본이 없으면 서버 저장 단계에서 원본 파일 보기로 연결합니다.</span></div>';
          }
          return '<div class="page-item clean-page-item">' + labelHtml + body + '</div>';
        }).join('') + '</div>';
      }

      return '<div class="page-list ' + (simpleUpdateMode ? 'simple-update-pages' : '') + '">' + (pages || []).map((page, index) => {
        const isPdf = (page.fileType || '').includes('pdf') || String(page.fileName || '').toLowerCase().endsWith('.pdf');
        const selectedMode = page.previewChoice === 'original' ? 'original' : (page.previewChoice === 'corrected' ? 'corrected' : (page.correctedDataUrl ? 'corrected' : 'original'));
        const selectedText = selectedMode === 'original' ? '원본 사용중' : '수정본 사용중';
        const canCompare = !!(page.originalDataUrl && page.correctedDataUrl);
        const pageLabelText = options.docLabel ? (String(options.docLabel) + ((pages || []).length > 1 ? ' ' + (index + 1) + '페이지' : '')) : '';
        const pageLabelHtml = pageLabelText ? '<div class="page-file-label">' + escapeHtml(pageLabelText) + '</div>' : '';
        let body = '';

        if (simpleUpdateMode) {
          if (canCompare) {
            const originalSelected = selectedMode === 'original';
            const correctedSelected = !originalSelected;
            body = '<div class="page-choice-note">수정/갱신 화면에서는 복잡한 편집 버튼은 숨기고, 원본/보정본 선택과 삭제만 표시합니다.</div>' +
              '<div class="compare-grid page-compare-grid">' +
                '<div class="compare-card ' + (originalSelected ? 'selected' : '') + '" data-page-compare-card="original">' +
                  '<div class="compare-label"><span>원본</span><span class="selected-chip">사용중</span></div>' +
                  '<div class="paper-frame"><img class="preview-img" alt="원본 미리보기" src="' + page.originalDataUrl + '" data-preview-src="' + page.originalDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
                  '<div class="preview-actions"><button type="button" class="mini-button use ' + (originalSelected ? 'active' : '') + '" onclick="selectDocPageVersion(\'' + escapeJs(docKey) + '\',' + index + ',\'original\')">원본 사용</button></div>' +
                '</div>' +
                '<div class="compare-card ' + (correctedSelected ? 'selected' : '') + '" data-page-compare-card="corrected">' +
                  '<div class="compare-label"><span>자동보정본</span><span class="selected-chip">사용중</span></div>' +
                  '<div class="paper-frame"><img class="preview-img" alt="자동보정본 미리보기" src="' + page.correctedDataUrl + '" data-preview-src="' + page.correctedDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
                  '<div class="preview-actions"><button type="button" class="mini-button use ' + (correctedSelected ? 'active' : '') + '" onclick="selectDocPageVersion(\'' + escapeJs(docKey) + '\',' + index + ',\'corrected\')">보정본 사용</button></div>' +
                '</div>' +
              '</div>' +
              '<div class="fit-note"><span>' + escapeHtml(page.fitText || '원본/보정본 선택 가능') + '</span><span>' + escapeHtml(page.ratioText || selectedText) + '</span></div>';
          } else if (page.previewDataUrl) {
            body = '<div class="paper-frame"><img class="preview-img" alt="' + escapeHtml((index + 1) + '페이지') + '" src="' + page.previewDataUrl + '" data-preview-src="' + page.previewDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
              '<div class="page-choice-note"><span class="page-current-label">현재 첨부됨</span> 원본/보정본이 없는 기존 파일입니다. 필요하면 삭제하고 새로 추가하세요.</div>';
          } else {
            body = isPdf ? renderPdfAttachedBox(page, '선택한 PDF 파일입니다.') : '<div class="preview-pdf">첨부됨<br><span class="small">필요 없으면 삭제하고 새 파일을 추가하세요.</span></div>';
          }
          const simpleActionsHtml = '<div class="page-actions simple-page-actions"><button type="button" class="mini-button dangerBtn" onclick="removeDocPage(\'' + escapeJs(docKey) + '\',' + index + ')">삭제</button></div>';
          return '<div class="page-item simple-update-page"><div class="page-head"><b>' + (index + 1) + '페이지</b><span>' + escapeHtml(page.fileName || '첨부파일') + '</span></div>' + pageLabelHtml + body + simpleActionsHtml + '</div>';
        }

        if (editable && canCompare) {
          const originalSelected = selectedMode === 'original';
          const correctedSelected = !originalSelected;
          body = '<div class="page-choice-note">이 페이지는 원본과 자동수정본 중 원하는 쪽을 선택할 수 있습니다. 선택한 화면이 저장·QR조회·인쇄에 사용됩니다.</div>' +
            '<div class="compare-grid page-compare-grid">' +
              '<div class="compare-card ' + (originalSelected ? 'selected' : '') + '" data-page-compare-card="original">' +
                '<div class="compare-label"><span>원본</span><span class="selected-chip">사용중</span></div>' +
                '<div class="paper-frame"><img class="preview-img" alt="원본 미리보기" src="' + page.originalDataUrl + '" data-preview-src="' + page.originalDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
                '<div class="preview-actions"><button type="button" class="mini-button" onclick="openDocPagePreview(\'' + escapeJs(docKey) + '\',' + index + ',\'original\',\'' + escapeJs(docCode) + '\')">원본 크게보기</button><button type="button" class="mini-button use ' + (originalSelected ? 'active' : '') + '" onclick="selectDocPageVersion(\'' + escapeJs(docKey) + '\',' + index + ',\'original\')">원본 사용</button></div>' +
              '</div>' +
              '<div class="compare-card ' + (correctedSelected ? 'selected' : '') + '" data-page-compare-card="corrected">' +
                '<div class="compare-label"><span>자동수정본</span><span class="selected-chip">사용중</span></div>' +
                '<div class="paper-frame"><img class="preview-img" alt="자동수정본 미리보기" src="' + page.correctedDataUrl + '" data-preview-src="' + page.correctedDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
                '<div class="preview-actions"><button type="button" class="mini-button" onclick="openDocPagePreview(\'' + escapeJs(docKey) + '\',' + index + ',\'corrected\',\'' + escapeJs(docCode) + '\')">수정본 크게보기</button><button type="button" class="mini-button use ' + (correctedSelected ? 'active' : '') + '" onclick="selectDocPageVersion(\'' + escapeJs(docKey) + '\',' + index + ',\'corrected\')">수정본 사용</button></div>' +
              '</div>' +
            '</div>' +
            '<div class="fit-note"><span>' + escapeHtml(page.fitText || '원본/수정본 선택 가능') + '</span><span>' + escapeHtml(page.ratioText || selectedText) + '</span></div>';
        } else if (page.previewDataUrl) {
          body = '<div class="paper-frame"><img class="preview-img" alt="' + escapeHtml((index + 1) + '페이지') + '" src="' + page.previewDataUrl + '" data-preview-src="' + page.previewDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
            (canCompare ? '<div class="page-choice-note"><span class="page-current-label">' + selectedText + '</span> 원본/수정본은 보기 버튼으로 확인할 수 있습니다.</div>' : '<div class="page-choice-note"><span class="page-current-label">최종본 저장</span> 스캔앱 방식으로 이 1장만 저장됩니다.</div>');
        } else {
          body = isPdf ? renderPdfAttachedBox(page, '선택한 PDF 파일입니다.') : '<div class="preview-pdf">첨부됨<br><span class="small">서버 연결 전에는 이미지 미리보기 저장본만 바로 인쇄됩니다.</span></div>';
        }

        let viewButton = '';
        if (page.previewDataUrl) {
          viewButton = (docCode || editable)
            ? '<button type="button" class="mini-button" onclick="openDocPagePreview(\'' + escapeJs(docKey) + '\',' + index + ',\'preview\',\'' + escapeJs(docCode) + '\')">미리보기</button>'
            : '<button type="button" class="mini-button" onclick="openPreviewModal(this.closest(\'.page-item\').querySelector(\'.preview-img\').dataset.previewSrc)">미리보기</button>';
        } else {
          viewButton = (docCode || editable)
            ? '<button type="button" class="mini-button" onclick="openDocPagePreview(\'' + escapeJs(docKey) + '\',' + index + ',\'preview\',\'' + escapeJs(docCode) + '\')">파일정보</button>'
            : '<button type="button" class="mini-button" onclick="alert(\'이미지 미리보기 저장본이 없습니다. 서버 저장 단계에서 원본 파일 보기를 연결합니다.\')">파일정보</button>';
        }

        const editButtons = editable ?
          '<button type="button" class="mini-button primary" onclick="openPageEdit(\'' + escapeJs(docKey) + '\',' + index + ')">수정편집</button>' +
          '<button type="button" class="mini-button dangerBtn" onclick="removeDocPage(\'' + escapeJs(docKey) + '\',' + index + ')">삭제</button>' :
          '';
        const actionsHtml = isPdf
          ? (editable ? '<div class="page-actions pdf-only-actions"><button type="button" class="mini-button dangerBtn" onclick="removeDocPage(\'' + escapeJs(docKey) + '\',' + index + ')">삭제</button></div>' : '')
          : '<div class="page-actions">' + viewButton + editButtons + '</div>';
        return '<div class="page-item"><div class="page-head"><b>' + (index + 1) + '페이지</b><span>' + escapeHtml(page.fileName || '첨부파일') + '</span></div>' + pageLabelHtml + body + actionsHtml + '</div>';
      }).join('') + '</div>';
    }

    function selectDocPageVersion(docKey, index, mode) {
      const card = findDocCardByKey(docKey);
      if (!card) return;
      const pages = getDocPagesFromCard(card);
      const page = pages[index];
      if (!page) return;
      const selectedSrc = mode === 'original' ? page.originalDataUrl : page.correctedDataUrl;
      if (!selectedSrc) {
        alert(mode === 'original' ? '원본 미리보기가 없습니다.' : '수정본 미리보기가 없습니다.');
        return;
      }
      page.previewDataUrl = selectedSrc;
      page.previewChoice = mode === 'original' ? 'original' : 'corrected';
      setDocPagesToCard(card, pages);
    }

    function findDocCardByKey(docKey) {
      return document.querySelector('.doc-card[data-doc-key="' + cssEscapeValue(docKey) + '"]');
    }

    function removeDocPage(docKey, index) {
      const card = findDocCardByKey(docKey);
      if (!card) return;
      const pages = getDocPagesFromCard(card);
      if (!pages[index]) return;
      if (!confirm((index + 1) + '페이지 첨부를 삭제할까요?')) return;
      pages.splice(index, 1);
      setDocPagesToCard(card, pages);
    }

    function moveDocPage(docKey, index, direction) {
      const card = findDocCardByKey(docKey);
      if (!card) return;
      const pages = getDocPagesFromCard(card);
      const next = index + direction;
      if (next < 0 || next >= pages.length) return;
      const temp = pages[index];
      pages[index] = pages[next];
      pages[next] = temp;
      setDocPagesToCard(card, pages);
    }

    function openDocPagePreview(docKey, index, mode, code) {
      let pages = [];
      if (code) {
        const item = getItemByCode(code);
        const doc = item ? getDisplayDocs(item).find(d => d.key === docKey) : null;
        pages = getDocPagesFromDoc(doc);
      } else {
        const card = findDocCardByKey(docKey);
        pages = getDocPagesFromCard(card);
      }
      const page = pages[index];
      if (!page) return;
      const src = mode === 'original' ? page.originalDataUrl : (mode === 'corrected' ? page.correctedDataUrl : page.previewDataUrl);
      if (src) { openPreviewModal(src); return; }
      alert('이미지 미리보기 저장본이 없습니다.\nPDF 원본보기는 서버 저장 단계에서 붙입니다.\n\n파일명: ' + (page.fileName || ''));
    }


    async function openPageEdit(docKey, index) {
      const card = findDocCardByKey(docKey);
      const pages = getDocPagesFromCard(card);
      const page = pages[index];
      if (!page) return;
      let src = isCardQuarterDoc(docKey)
        ? (page.originalDataUrl || page.editDataUrl || page.previewDataUrl || page.correctedDataUrl)
        : (page.editDataUrl || page.previewDataUrl || page.correctedDataUrl || page.originalDataUrl);
      if (!src) {
        alert('이미지 미리보기 저장본이 있어야 수정편집할 수 있습니다. PDF 원본 편집은 서버 저장 단계에서 붙입니다.');
        return;
      }
      if (isCardQuarterDoc(docKey)) {
        src = await normalizeCardEditSourceDataUrl(src);
        page.editDataUrl = src;
        setDocPagesToCard(card, pages);
      }
      pageEditState = { docKey, index, src, brightness:1, contrast:1, crop:{ left:0, top:0, right:0, bottom:0 } };
      const modal = document.getElementById('pageEditModal');
      const img = document.getElementById('pageEditImage');
      if (img) img.src = src;
      updatePageEditPreview();
      if (modal) modal.classList.remove('hidden');
    }

    function closePageEditModal() {
      const modal = document.getElementById('pageEditModal');
      if (modal) modal.classList.add('hidden');
      pageEditState = null;
    }

    function updatePageEditPreview() {
      if (!pageEditState) return;
      const img = document.getElementById('pageEditImage');
      const info = document.getElementById('pageEditInfo');
      const crop = pageEditState.crop || { left:0, top:0, right:0, bottom:0 };
      if (img) {
        img.style.transform = 'none';
        img.style.filter = 'brightness(' + pageEditState.brightness.toFixed(2) + ') contrast(' + pageEditState.contrast.toFixed(2) + ')';
        img.style.clipPath = 'inset(' + crop.top + '% ' + crop.right + '% ' + crop.bottom + '% ' + crop.left + '%)';
      }
      if (info) {
        const cropText = '자르기 좌 ' + crop.left + '% · 우 ' + crop.right + '% · 위 ' + crop.top + '% · 아래 ' + crop.bottom + '%';
        info.textContent = cropText + ' · 밝기 ' + Math.round(pageEditState.brightness * 100) + '% · 선명도 ' + Math.round(pageEditState.contrast * 100) + '%';
      }
    }

    function changeCropValue(side, delta) {
      if (!pageEditState) return;
      const crop = pageEditState.crop || (pageEditState.crop = { left:0, top:0, right:0, bottom:0 });
      if (!['left','right','top','bottom'].includes(side)) return;
      const opposite = side === 'left' ? 'right' : (side === 'right' ? 'left' : (side === 'top' ? 'bottom' : 'top'));
      const maxForSide = Math.max(0, 42 - Number(crop[opposite] || 0));
      crop[side] = clamp(Number(crop[side] || 0) + delta, 0, maxForSide);
      updatePageEditPreview();
    }

    function changeEditValue(key, delta) {
      if (!pageEditState) return;
      if (key === 'brightness') pageEditState.brightness = clamp(pageEditState.brightness + delta, 0.55, 1.65);
      if (key === 'contrast') pageEditState.contrast = clamp(pageEditState.contrast + delta, 0.55, 1.80);
      updatePageEditPreview();
    }

    function resetCropSide(side) {
      if (!pageEditState) return;
      if (!['left','right','top','bottom'].includes(side)) return;
      const crop = pageEditState.crop || (pageEditState.crop = { left:0, top:0, right:0, bottom:0 });
      crop[side] = 0;
      updatePageEditPreview();
    }

    function resetEditValue(key) {
      if (!pageEditState) return;
      if (key === 'brightness') pageEditState.brightness = 1;
      if (key === 'contrast') pageEditState.contrast = 1;
      updatePageEditPreview();
    }

    function resetPageEditValues() {
      if (!pageEditState) return;
      pageEditState.brightness = 1;
      pageEditState.contrast = 1;
      pageEditState.crop = { left:0, top:0, right:0, bottom:0 };
      updatePageEditPreview();
    }

    async function applyPageEdit() {
      if (!pageEditState) return;
      try {
        const isCardDoc = isCardQuarterDoc(pageEditState.docKey);
        const editedDataUrl = await renderEditedDataUrl(pageEditState.src, pageEditState.brightness, pageEditState.contrast, pageEditState.crop, pageEditState.docKey);
        const editedEditDataUrl = isCardDoc
          ? await renderEditedCardSourceDataUrl(pageEditState.src, pageEditState.brightness, pageEditState.contrast, pageEditState.crop)
          : await renderEditedSourceDataUrl(pageEditState.src, pageEditState.brightness, pageEditState.contrast, pageEditState.crop);
        const card = findDocCardByKey(pageEditState.docKey);
        const pages = getDocPagesFromCard(card);
        const page = pages[pageEditState.index];
        if (!page) return;
        // v23.7.172: 수정편집 적용 후에는 원본/자동수정본 비교는 남기지 않고
        // 사용자가 최종으로 확인한 수정본 1장만 남깁니다. A4/카드 모두 다음 수정편집은 원본 기준본으로 다시 열립니다.
        page.previewDataUrl = editedDataUrl;
        page.editDataUrl = editedEditDataUrl;
        page.originalDataUrl = '';
        page.correctedDataUrl = '';
        page.previewChoice = 'preview';
        page.autoFit = isCardDoc ? 'manual-crop-card-top-half' : 'manual-crop-final-only';
        page.fitText = isCardDoc
          ? '직접 자르기 수정본만 저장 · 카드형은 크게 A4 상단 1/2 배치'
          : '직접 자르기 수정본만 저장 · A4 서류는 수정 후 A4 저장본 유지';
        page.ratioText = isCardDoc
          ? '미리보기는 A4 위칸 · 수정편집은 카드 원본 기준'
          : '미리보기는 A4 저장본 · 수정편집은 용지 원본 기준';
        page.editedAt = new Date().toISOString();
        setDocPagesToCard(card, pages);
        closePageEditModal();
        alert(isCardDoc ? '카드 원본 기준으로 수정본을 저장했습니다. 미리보기는 더 크게 A4 상단 1/2 칸에 정리됩니다.' : 'A4 용지 원본 기준으로 수정본을 저장했습니다. 미리보기는 A4 저장본으로 정리됩니다.');
      } catch (error) {
        alert('수정편집 적용 중 오류가 났습니다. 다른 이미지로 다시 시도해주세요.');
      }
    }

    function renderEditedDataUrl(src, brightness, contrast, crop, docKey) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = crop || { left:0, top:0, right:0, bottom:0 };
          const left = clamp(Number(c.left || 0), 0, 45) / 100;
          const right = clamp(Number(c.right || 0), 0, 45) / 100;
          const top = clamp(Number(c.top || 0), 0, 45) / 100;
          const bottom = clamp(Number(c.bottom || 0), 0, 45) / 100;
          const sx = Math.round(img.width * left);
          const sy = Math.round(img.height * top);
          const sw = Math.max(20, Math.round(img.width * (1 - left - right)));
          const sh = Math.max(20, Math.round(img.height * (1 - top - bottom)));
          const cropped = document.createElement('canvas');
          cropped.width = sw;
          cropped.height = sh;
          const ctx = cropped.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cropped.width, cropped.height);
          ctx.filter = 'brightness(' + brightness + ') contrast(' + contrast + ')';
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          ctx.filter = 'none';

          let resultCanvas = cropped;
          if (isCardQuarterDoc(docKey)) {
            resultCanvas = makeA4TopHalfCanvas(makeCardEditSourceCanvas(cropped));
          } else {
            const scanResult = smartA4DocumentScan(cropped, true, docKey || '');
            resultCanvas = scanResult.canvas || cropped;
          }

          const resized = resizeCanvasIfNeeded(resultCanvas, 1100);
          resolve(resized.toDataURL('image/jpeg', 0.86));
        };
        img.onerror = reject;
        img.src = src;
      });
    }

    function renderEditedCardSourceDataUrl(src, brightness, contrast, crop) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = crop || { left:0, top:0, right:0, bottom:0 };
          const left = clamp(Number(c.left || 0), 0, 45) / 100;
          const right = clamp(Number(c.right || 0), 0, 45) / 100;
          const top = clamp(Number(c.top || 0), 0, 45) / 100;
          const bottom = clamp(Number(c.bottom || 0), 0, 45) / 100;
          const sx = Math.round(img.width * left);
          const sy = Math.round(img.height * top);
          const sw = Math.max(20, Math.round(img.width * (1 - left - right)));
          const sh = Math.max(20, Math.round(img.height * (1 - top - bottom)));
          const cropped = document.createElement('canvas');
          cropped.width = sw;
          cropped.height = sh;
          const ctx = cropped.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cropped.width, cropped.height);
          ctx.filter = 'brightness(' + brightness + ') contrast(' + contrast + ')';
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          ctx.filter = 'none';
          const cardOnly = makeCardEditSourceCanvas(cropped);
          const resized = resizeCanvasIfNeeded(cardOnly, 1100);
          resolve(resized.toDataURL('image/jpeg', 0.86));
        };
        img.onerror = reject;
        img.src = src;
      });
    }

    function renderEditedSourceDataUrl(src, brightness, contrast, crop) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = crop || { left:0, top:0, right:0, bottom:0 };
          const left = clamp(Number(c.left || 0), 0, 45) / 100;
          const right = clamp(Number(c.right || 0), 0, 45) / 100;
          const top = clamp(Number(c.top || 0), 0, 45) / 100;
          const bottom = clamp(Number(c.bottom || 0), 0, 45) / 100;
          const sx = Math.round(img.width * left);
          const sy = Math.round(img.height * top);
          const sw = Math.max(20, Math.round(img.width * (1 - left - right)));
          const sh = Math.max(20, Math.round(img.height * (1 - top - bottom)));
          const cropped = document.createElement('canvas');
          cropped.width = sw;
          cropped.height = sh;
          const ctx = cropped.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cropped.width, cropped.height);
          ctx.filter = 'brightness(' + brightness + ') contrast(' + contrast + ')';
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          ctx.filter = 'none';
          const resized = resizeCanvasIfNeeded(cropped, 1100);
          resolve(resized.toDataURL('image/jpeg', 0.86));
        };
        img.onerror = reject;
        img.src = src;
      });
    }

    function normalizeCardEditSourceDataUrl(src) {
      return new Promise((resolve) => {
        if (!src) { resolve(src); return; }
        const img = new Image();
        img.onload = () => {
          try {
            // 기존에 A4 위칸/1/4 배치본이 editDataUrl로 저장된 카드도, 수정편집을 열 때 카드 원본만 다시 뽑아줍니다.
            const portraitLike = img.height > img.width * 1.12;
            const largeWhitePage = (img.height >= 900 && img.width >= 600);
            if (!portraitLike && !largeWhitePage) { resolve(src); return; }
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const cardOnly = makeCardEditSourceCanvas(canvas);
            const resized = resizeCanvasIfNeeded(cardOnly, 1100);
            resolve(resized.toDataURL('image/jpeg', 0.86));
          } catch (e) {
            resolve(src);
          }
        };
        img.onerror = () => resolve(src);
        img.src = src;
      });
    }

    function renderComparePreviewHtml(fileName, originalDataUrl, correctedDataUrl, selectedMode, fitText, ratioText) {
      const originalSelected = selectedMode === 'original';
      const correctedSelected = selectedMode !== 'original';
      return '<div class="preview-title"><span>원본 / 자동 서류잡기 비교</span><span>' + escapeHtml(fileName) + '</span></div>' +
        '<div class="compare-grid">' +
          '<div class="compare-card ' + (originalSelected ? 'selected' : '') + '" data-compare-card="original">' +
            '<div class="compare-label"><span>원본 사진</span><span class="selected-chip">사용중</span></div>' +
            '<div class="paper-frame"><img class="preview-img" alt="원본 미리보기" src="' + originalDataUrl + '" data-preview-src="' + originalDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
            '<div class="preview-actions"><button type="button" class="mini-button" onclick="openCompareImage(this, \'original\')">원본 크게보기</button><button type="button" class="mini-button use ' + (originalSelected ? 'active' : '') + '" data-use-button="original" onclick="selectPreviewVersion(this, \'original\')">원본 사용</button></div>' +
          '</div>' +
          '<div class="compare-card ' + (correctedSelected ? 'selected' : '') + '" data-compare-card="corrected">' +
            '<div class="compare-label"><span>용지맞춤 후보</span><span class="selected-chip">사용중</span></div>' +
            '<div class="paper-frame"><img class="preview-img" alt="용지맞춤 미리보기" src="' + correctedDataUrl + '" data-preview-src="' + correctedDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
            '<div class="preview-actions"><button type="button" class="mini-button" onclick="openCompareImage(this, \'corrected\')">용지맞춤본 크게보기</button><button type="button" class="mini-button use ' + (correctedSelected ? 'active' : '') + '" data-use-button="corrected" onclick="selectPreviewVersion(this, \'corrected\')">용지맞춤 사용</button></div>' +
          '</div>' +
        '</div>' +
        '<div class="ai-status"><span>' + escapeHtml(fitText || '용지/카드 크기 맞춤') + '</span><span>' + escapeHtml(ratioText || '저장 시 선택본 기준') + '</span></div>' +
        '<div class="fit-note"><span>용지 위치가 틀리면 원본 사용을 누르세요</span><span>원본/자동자르기 선택 가능</span></div>';
    }

    function openCompareImage(button, mode) {
      const card = button.closest('.doc-card');
      const fileBox = card.querySelector('[data-role="filename"]');
      const src = mode === 'original' ? fileBox.dataset.originalDataUrl : fileBox.dataset.correctedDataUrl;
      if (src) openPreviewModal(src);
    }

    function selectPreviewVersion(button, mode) {
      const card = button.closest('.doc-card');
      const fileBox = card.querySelector('[data-role="filename"]');
      const selectedSrc = mode === 'original' ? fileBox.dataset.originalDataUrl : fileBox.dataset.correctedDataUrl;
      if (!selectedSrc) return;
      fileBox.dataset.previewDataUrl = selectedSrc;
      fileBox.dataset.previewChoice = mode;
      card.querySelectorAll('[data-compare-card]').forEach(box => box.classList.toggle('selected', box.dataset.compareCard === mode));
      card.querySelectorAll('[data-use-button]').forEach(btn => btn.classList.toggle('active', btn.dataset.useButton === mode));
    }

    function compressImageToDataUrl(file, maxSize, quality) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = makeResizedCanvas(img, maxSize);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function fitDocumentImageToDataUrl(file, maxSize, quality, docKey) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            try {
              const scan = makeScaledCanvas(img, 1100);
              let bbox = findDocumentBoundingBox(scan.canvas, scan.ctx);
              const source = document.createElement('canvas');
              const sctx = source.getContext('2d');
              source.width = img.width;
              source.height = img.height;
              sctx.drawImage(img, 0, 0);

              if (!bbox) {
                bbox = findDocumentBoundingBoxByBackground(scan.canvas, scan.ctx);
              }

              let crop = { x:0, y:0, w:source.width, h:source.height };
              let usedCrop = false;
              if (bbox) {
                const sx = source.width / scan.canvas.width;
                const sy = source.height / scan.canvas.height;
                const padX = bbox.w * 0.06;
                const padY = bbox.h * 0.08;
                crop = {
                  x: clamp((bbox.x - padX) * sx, 0, source.width - 1),
                  y: clamp((bbox.y - padY) * sy, 0, source.height - 1),
                  w: clamp((bbox.w + padX * 2) * sx, 1, source.width),
                  h: clamp((bbox.h + padY * 2) * sy, 1, source.height)
                };
                if (crop.x + crop.w > source.width) crop.w = source.width - crop.x;
                if (crop.y + crop.h > source.height) crop.h = source.height - crop.y;
                usedCrop = crop.w < source.width * 0.96 || crop.h < source.height * 0.96;
              }

              // v23.7.172: 카드형 서류는 비율/크기 판정에 실패해도 무조건 A4 상단 1/2 칸에 배치합니다.
              // 신분증/면허증/이수증이 일반 A4 전체나 예전 1/4 배치처럼 보이는 문제를 막습니다.
              if (isCardQuarterDoc(docKey || '')) {
                const cardOnlyCanvas = makeCardEditSourceCanvas(source, crop);
                const topHalfCanvas = resizeCanvasIfNeeded(makeA4TopHalfCanvas(cardOnlyCanvas), maxSize);
                resolve({
                  dataUrl: topHalfCanvas.toDataURL('image/jpeg', quality),
                  editDataUrl: resizeCanvasIfNeeded(cardOnlyCanvas, 1100).toDataURL('image/jpeg', quality),
                  method: 'card-top-half-a4-forced-scan',
                  fitText: '카드형 위치 맞춤 · 크게 A4 상단 1/2 배치',
                  ratioText: '미리보기는 큰 A4 상단칸 · 수정편집은 카드 원본으로 진행'
                });
                return;
              }

              const scale = Math.min(1, maxSize / Math.max(crop.w, crop.h));
              const out = document.createElement('canvas');
              out.width = Math.max(1, Math.round(crop.w * scale));
              out.height = Math.max(1, Math.round(crop.h * scale));
              const octx = out.getContext('2d');
              octx.fillStyle = '#ffffff';
              octx.fillRect(0, 0, out.width, out.height);
              // v23.7.158: 자동 밝기/대비/선명도 보정 제거.
              // 촬영본 색상은 그대로 두고, 용지 위치와 A4 크기만 맞춥니다.
              octx.filter = 'none';
              octx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);
              octx.filter = 'none';
              const scanResult = smartA4DocumentScan(out, usedCrop, docKey || '');
              const finalCanvas = resizeCanvasIfNeeded(scanResult.canvas, maxSize);

              resolve({
                dataUrl: finalCanvas.toDataURL('image/jpeg', quality),
                editDataUrl: out.toDataURL('image/jpeg', quality),
                method: scanResult.cropped ? 'a4-paper-fit-only' : 'fit-size-only',
                fitText: scanResult.cropped ? '용지 위치 맞춤 + A4 크기 맞춤 · 밝기보정 없음' : '전체 사진 기준: 크기만 조정 · 밝기보정 없음',
                ratioText: scanResult.cropped ? '미리보기는 A4 저장본 · 수정편집은 용지 원본 기준' : '수정편집은 현재 사진 기준으로 진행'
              });
            } catch (error) {
              reject(error);
            }
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function makeResizedCanvas(img, maxSize) {
      let width = img.width;
      let height = img.height;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return canvas;
    }
