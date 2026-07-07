// SitePass v23.7.332 - speed optimized medium chunk (app-camera-docs-speed 03/04)
// ---- merged from app-camera-docs-09.js ----
// SitePass v23.7.332 - app-camera-docs finer split (09/16)
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

// ---- merged from app-camera-docs-10.js ----
// SitePass v23.7.332 - app-camera-docs finer split (10/16)
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

// ---- merged from app-camera-docs-11.js ----
// SitePass v23.7.332 - app-camera-docs finer split (11/16)
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


    function makeScaledCanvas(img, maxSide) {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      ctx.drawImage(img, 0, 0, width, height);
      return { canvas, ctx, scale };
    }

    function findDocumentBoundingBox(canvas, ctx, options = {}) {
      const w = canvas.width;
      const h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(2, Math.round(Math.max(w, h) / 520));

      let sum = 0, count = 0;
      let borderBright = 0, borderCount = 0;
      let br = 0, bg = 0, bb = 0, bgCount = 0;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          sum += bright; count++;
          if (x < w*0.10 || x > w*0.90 || y < h*0.10 || y > h*0.90) {
            borderBright += bright; borderCount++;
            br += r; bg += g; bb += b; bgCount++;
          }
        }
      }

      const avg = sum / Math.max(1, count);
      const borderAvg = borderBright / Math.max(1, borderCount);
      const bgR = br / Math.max(1, bgCount);
      const bgG = bg / Math.max(1, bgCount);
      const bgB = bb / Math.max(1, bgCount);
      const paperThreshold = Math.max(138, Math.min(235, Math.max(avg + 10, borderAvg + 12)));

      const paperXs = [], paperYs = [];
      const diffXs = [], diffYs = [];
      const edgeXs = [], edgeYs = [];

      for (let y = 1; y < h - 1; y += step) {
        for (let x = 1; x < w - 1; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const bgDiff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

          const ir = (y * w + Math.min(w - 1, x + step)) * 4;
          const ib = (Math.min(h - 1, y + step) * w + x) * 4;
          const brightR = (data[ir] + data[ir+1] + data[ir+2]) / 3;
          const brightB = (data[ib] + data[ib+1] + data[ib+2]) / 3;
          const localEdge = Math.max(Math.abs(bright - brightR), Math.abs(bright - brightB));

          const likelyPaper = bright >= paperThreshold && sat <= 125;
          const likelyTextOnPaper = bright >= Math.max(100, avg - 55) && sat <= 100 && bgDiff >= 18;
          const likelyDifferentFromBg = bgDiff >= Math.max(42, Math.abs(borderAvg - avg) * 0.7 + 28);
          const likelyEdgeRegion = localEdge >= 20 && bgDiff >= 18;

          if (likelyPaper || likelyTextOnPaper) { paperXs.push(x); paperYs.push(y); }
          if (likelyDifferentFromBg) { diffXs.push(x); diffYs.push(y); }
          if (likelyEdgeRegion) { edgeXs.push(x); edgeYs.push(y); }
        }
      }

      const bboxPaper = buildBBoxFromPoints(paperXs, paperYs, w, h, 0.01, 0.99);
      const bboxDiff = buildBBoxFromPoints(diffXs, diffYs, w, h, 0.02, 0.98);
      const bboxEdge = buildBBoxFromPoints(edgeXs, edgeYs, w, h, 0.03, 0.97);

      const minArea = options.cardMode ? 0.035 : 0.16;
      const minW = options.cardMode ? 0.18 : 0.20;
      const minH = options.cardMode ? 0.10 : 0.20;
      if (isUsableBBox(bboxPaper, w, h, minArea, 0.96, minW, minH)) return bboxPaper;
      if (isUsableBBox(bboxDiff, w, h, minArea, 0.96, minW, minH)) return bboxDiff;
      if (isUsableBBox(bboxEdge, w, h, minArea, 0.96, minW, minH)) return bboxEdge;

      const merged = mergeBBoxes([bboxPaper, bboxDiff, bboxEdge], w, h);
      if (isUsableBBox(merged, w, h, options.cardMode ? 0.035 : 0.12, 0.98, minW, minH)) return merged;
      return null;
    }

    function buildBBoxFromPoints(xs, ys, w, h, loRatio, hiRatio) {
      if (!xs || xs.length < 50 || !ys || ys.length < 50) return null;
      xs = xs.slice().sort((a,b)=>a-b);
      ys = ys.slice().sort((a,b)=>a-b);
      const x1 = xs[Math.floor(xs.length * loRatio)];
      const x2 = xs[Math.floor(xs.length * hiRatio)];
      const y1 = ys[Math.floor(ys.length * loRatio)];
      const y2 = ys[Math.floor(ys.length * hiRatio)];
      if (x2 <= x1 || y2 <= y1) return null;
      return { x:x1, y:y1, w:x2-x1, h:y2-y1 };
    }

    function isUsableBBox(bbox, w, h, minArea = 0.16, maxArea = 0.96, minWRatio = 0.20, minHRatio = 0.20) {
      if (!bbox) return false;
      const areaRatio = (bbox.w * bbox.h) / (w * h);
      if (areaRatio < minArea || areaRatio > maxArea) return false;
      if (bbox.w < w * minWRatio || bbox.h < h * minHRatio) return false;
      return true;
    }

// ---- merged from app-camera-docs-12.js ----
// SitePass v23.7.332 - app-camera-docs finer split (12/16)
function mergeBBoxes(boxes, w, h) {
      const valid = (boxes || []).filter(Boolean);
      if (!valid.length) return null;
      let x1 = w, y1 = h, x2 = 0, y2 = 0;
      valid.forEach(b => {
        x1 = Math.min(x1, b.x);
        y1 = Math.min(y1, b.y);
        x2 = Math.max(x2, b.x + b.w);
        y2 = Math.max(y2, b.y + b.h);
      });
      if (x2 <= x1 || y2 <= y1) return null;
      return { x:x1, y:y1, w:x2-x1, h:y2-y1 };
    }


    function findDocumentBoundingBoxByBackground(canvas, ctx, options = {}) {
      const w = canvas.width;
      const h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(1, Math.round(Math.max(w, h) / 700));

      const corners = [
        sampleAreaAverage(data, w, h, 0, 0, Math.max(8, Math.round(w * 0.08)), Math.max(8, Math.round(h * 0.08))),
        sampleAreaAverage(data, w, h, Math.max(0, w - Math.max(8, Math.round(w * 0.08))), 0, Math.max(8, Math.round(w * 0.08)), Math.max(8, Math.round(h * 0.08))),
        sampleAreaAverage(data, w, h, 0, Math.max(0, h - Math.max(8, Math.round(h * 0.08))), Math.max(8, Math.round(w * 0.08)), Math.max(8, Math.round(h * 0.08))),
        sampleAreaAverage(data, w, h, Math.max(0, w - Math.max(8, Math.round(w * 0.08))), Math.max(0, h - Math.max(8, Math.round(h * 0.08))), Math.max(8, Math.round(w * 0.08)), Math.max(8, Math.round(h * 0.08)))
      ];
      const bg = corners.reduce((acc, c) => ({r:acc.r+c.r, g:acc.g+c.g, b:acc.b+c.b}), {r:0,g:0,b:0});
      bg.r /= corners.length; bg.g /= corners.length; bg.b /= corners.length;

      const rowCounts = new Array(h).fill(0);
      const colCounts = new Array(w).fill(0);
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const isDoc = diff > 26 || bright > 210 || edge > 18;
          if (isDoc) {
            rowCounts[y]++;
            colCounts[x]++;
          }
        }
      }

      let top = findActiveStart(rowCounts, Math.max(2, Math.round(w * 0.06 / step)));
      let bottom = findActiveEnd(rowCounts, Math.max(2, Math.round(w * 0.06 / step)));
      let left = findActiveStart(colCounts, Math.max(2, Math.round(h * 0.06 / step)));
      let right = findActiveEnd(colCounts, Math.max(2, Math.round(h * 0.06 / step)));
      if (top === -1 || left === -1 || bottom <= top || right <= left) return null;

      top = clamp(top - step * 3, 0, h - 1);
      left = clamp(left - step * 3, 0, w - 1);
      bottom = clamp(bottom + step * 3, 0, h - 1);
      right = clamp(right + step * 3, 0, w - 1);

      const bbox = { x:left, y:top, w:right-left, h:bottom-top };
      const minArea = options.cardMode ? 0.035 : 0.08;
      const minW = options.cardMode ? 0.18 : 0.20;
      const minH = options.cardMode ? 0.10 : 0.20;
      if (!isUsableBBox(bbox, w, h, minArea, 0.98, minW, minH)) return null;
      return bbox;
    }

    function sampleAreaAverage(data, w, h, sx, sy, sw, sh) {
      let r = 0, g = 0, b = 0, c = 0;
      for (let y = sy; y < Math.min(h, sy + sh); y++) {
        for (let x = sx; x < Math.min(w, sx + sw); x++) {
          const i = (y * w + x) * 4;
          r += data[i]; g += data[i+1]; b += data[i+2]; c++;
        }
      }
      return { r:r/Math.max(1,c), g:g/Math.max(1,c), b:b/Math.max(1,c) };
    }

    function estimateLocalEdge(data, w, h, x, y, step) {
      const i = (y * w + x) * 4;
      const xr = Math.min(w - 1, x + step);
      const yb = Math.min(h - 1, y + step);
      const ir = (y * w + xr) * 4;
      const ib = (yb * w + x) * 4;
      const a = (data[i] + data[i+1] + data[i+2]) / 3;
      const b = (data[ir] + data[ir+1] + data[ir+2]) / 3;
      const c = (data[ib] + data[ib+1] + data[ib+2]) / 3;
      return Math.max(Math.abs(a - b), Math.abs(a - c));
    }

    function findActiveStart(arr, threshold) {
      for (let i = 0; i < arr.length; i++) if (arr[i] >= threshold) return i;
      return -1;
    }

    function findActiveEnd(arr, threshold) {
      for (let i = arr.length - 1; i >= 0; i--) if (arr[i] >= threshold) return i;
      return -1;
    }

    function sharpenCanvas(canvas, amount) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      if (w < 3 || h < 3) return;
      const src = ctx.getImageData(0, 0, w, h);
      const dst = ctx.createImageData(w, h);
      const s = src.data, d = dst.data;
      const a = Math.max(0, Math.min(0.5, amount || 0.2));
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            const center = s[i+c];
            const left = s[(y*w + Math.max(0,x-1))*4 + c];
            const right = s[(y*w + Math.min(w-1,x+1))*4 + c];
            const top = s[(Math.max(0,y-1)*w + x)*4 + c];
            const bottom = s[(Math.min(h-1,y+1)*w + x)*4 + c];
            const sharp = center * (1 + 4*a) - (left + right + top + bottom) * a;
            d[i+c] = clamp(Math.round(sharp), 0, 255);
          }
          d[i+3] = s[i+3];
        }
      }
      ctx.putImageData(dst, 0, 0);
    }


    function tightenCropToPaper(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 700));
      const rowCounts = new Array(h).fill(0);
      const colCounts = new Array(w).fill(0);

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const active = diff > 26 || edge > 15 || (bright > 210 && sat < 45);
          if (active) {
            rowCounts[y]++;
            colCounts[x]++;
          }
        }
      }

      const rowThreshold = Math.max(2, Math.round((w / step) * 0.08));
      const colThreshold = Math.max(2, Math.round((h / step) * 0.08));
      let top = findActiveStart(rowCounts, rowThreshold);
      let bottom = findActiveEnd(rowCounts, rowThreshold);
      let left = findActiveStart(colCounts, colThreshold);
      let right = findActiveEnd(colCounts, colThreshold);

      if (top === -1 || left === -1 || bottom <= top || right <= left) return canvas;
      top = clamp(top - step * 2, 0, h - 1);
      left = clamp(left - step * 2, 0, w - 1);
      bottom = clamp(bottom + step * 2, 0, h - 1);
      right = clamp(right + step * 2, 0, w - 1);

      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.35 || bh < h * 0.35) return canvas;
      if (bw > w * 0.995 && bh > h * 0.995) return canvas;

      const out = document.createElement('canvas');
      out.width = Math.max(1, bw);
      out.height = Math.max(1, bh);
      const octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(canvas, left, top, bw, bh, 0, 0, out.width, out.height);
      return out;
    }

