// SitePass v23.7.298 - app-camera-docs split continue (04/08)
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

