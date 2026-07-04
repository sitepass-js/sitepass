// SitePass v23.7.298 - app-camera-docs split continue (05/08)
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
