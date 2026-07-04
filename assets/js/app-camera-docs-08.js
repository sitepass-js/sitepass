// SitePass v23.7.299 - app-camera-docs split continue (08/08)
function guessCenteredPaperBBox(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 900));
      const cx = Math.floor(w / 2);
      const cy = Math.floor(h / 2);

      function lineScoreX(x) {
        let active = 0, total = 0;
        for (let y = 0; y < h; y += step) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i+1] - bg.g) + Math.abs(data[i+2] - bg.b);
          if (diff > 18) active++;
          total++;
        }
        return active / Math.max(1, total);
      }
      function lineScoreY(y) {
        let active = 0, total = 0;
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i+1] - bg.g) + Math.abs(data[i+2] - bg.b);
          if (diff > 18) active++;
          total++;
        }
        return active / Math.max(1, total);
      }

      let left = 0, right = w - 1, top = 0, bottom = h - 1;
      for (let x = cx; x > 0; x -= step) { if (lineScoreX(x) < 0.06) { left = x; break; } }
      for (let x = cx; x < w - 1; x += step) { if (lineScoreX(x) < 0.06) { right = x; break; } }
      for (let y = cy; y > 0; y -= step) { if (lineScoreY(y) < 0.06) { top = y; break; } }
      for (let y = cy; y < h - 1; y += step) { if (lineScoreY(y) < 0.06) { bottom = y; break; } }

      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.45 || bh < h * 0.45) return { x: Math.round(w * 0.06), y: Math.round(h * 0.06), w: Math.round(w * 0.88), h: Math.round(h * 0.88) };
      return { x:left, y:top, w:bw, h:bh };
    }


    function findStrictPaperBBox(canvas, isBusiness) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 1000));
      const rowCounts = new Array(h).fill(0);
      const colCounts = new Array(w).fill(0);
      let totalSamplesPerRow = Math.ceil(w / step);
      let totalSamplesPerCol = Math.ceil(h / step);

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const likelyPaper = (bright > 155 && sat < 120) || diff > 20 || edge > 14;
          if (likelyPaper) {
            rowCounts[y]++;
            colCounts[x]++;
          }
        }
      }

      const rowThreshold = Math.max(2, Math.round(totalSamplesPerRow * (isBusiness ? 0.20 : 0.16)));
      const colThreshold = Math.max(2, Math.round(totalSamplesPerCol * (isBusiness ? 0.20 : 0.16)));

      let top = findActiveStart(rowCounts, rowThreshold);
      let bottom = findActiveEnd(rowCounts, rowThreshold);
      let left = findActiveStart(colCounts, colThreshold);
      let right = findActiveEnd(colCounts, colThreshold);
      if (top === -1 || left === -1 || bottom <= top || right <= left) return null;

      top = clamp(top, 0, h - 1);
      left = clamp(left, 0, w - 1);
      bottom = clamp(bottom, 1, h);
      right = clamp(right, 1, w);
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.45 || bh < h * 0.45) return null;
      return { x:left, y:top, w:bw, h:bh };
    }

    function findWhitePaperBBox(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(1, Math.round(Math.max(w, h) / 1200));
      const rowCounts = new Array(h).fill(0);
      const colCounts = new Array(w).fill(0);
      const rowThresholdBase = Math.ceil(w / step);
      const colThresholdBase = Math.ceil(h / step);

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const whitePaper = bright > 205 && sat < 55;
          if (whitePaper) {
            rowCounts[y]++;
            colCounts[x]++;
          }
        }
      }

      const rowThreshold = Math.max(2, Math.round(rowThresholdBase * 0.28));
      const colThreshold = Math.max(2, Math.round(colThresholdBase * 0.28));
      let top = findActiveStart(rowCounts, rowThreshold);
      let bottom = findActiveEnd(rowCounts, rowThreshold);
      let left = findActiveStart(colCounts, colThreshold);
      let right = findActiveEnd(colCounts, colThreshold);
      if (top === -1 || left === -1 || bottom <= top || right <= left) return null;
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.55 || bh < h * 0.55) return null;
      return { x:left, y:top, w:bw, h:bh };
    }

    function cropCanvas(canvas, bbox, pad) {
      const p = pad || 0;
      const x = clamp(Math.round(bbox.x - p), 0, canvas.width - 1);
      const y = clamp(Math.round(bbox.y - p), 0, canvas.height - 1);
      const w = clamp(Math.round(bbox.w + p * 2), 1, canvas.width - x);
      const h = clamp(Math.round(bbox.h + p * 2), 1, canvas.height - y);
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0,0,w,h);
      octx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
      return out;
    }

    function trimUniformMargins(canvas, tolerance) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 1000));
      const tol = tolerance || 4;

      function rowActive(y) {
        let active = 0, total = 0;
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i+1] - bg.g) + Math.abs(data[i+2] - bg.b);
          if (diff > 20) active++;
          total++;
        }
        return active > Math.max(2, total * 0.03);
      }
      function colActive(x) {
        let active = 0, total = 0;
        for (let y = 0; y < h; y += step) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i+1] - bg.g) + Math.abs(data[i+2] - bg.b);
          if (diff > 20) active++;
          total++;
        }
        return active > Math.max(2, total * 0.03);
      }

      let top = 0;
      while (top < h - 2 && !rowActive(top)) top += step;
      let bottom = h - 1;
      while (bottom > top + 2 && !rowActive(bottom)) bottom -= step;
      let left = 0;
      while (left < w - 2 && !colActive(left)) left += step;
      let right = w - 1;
      while (right > left + 2 && !colActive(right)) right -= step;

      top = clamp(top - tol, 0, h - 1);
      left = clamp(left - tol, 0, w - 1);
      bottom = clamp(bottom + tol, 1, h);
      right = clamp(right + tol, 1, w);
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.40 || bh < h * 0.40) return canvas;
      if (bw > w * 0.995 && bh > h * 0.995) return canvas;
      return cropCanvas(canvas, { x:left, y:top, w:bw, h:bh }, 0);
    }

    function whitenBackgroundToPaper(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const bg = averageCornerColor(d, w, h);
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        const bright = (r + g + b) / 3;
        const sat = Math.max(r,g,b) - Math.min(r,g,b);
        const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
        // 글자/도장까지 하얗게 날아가는 문제 방지: 아주 밝은 종이 배경만 살짝 정리합니다.
        const veryLightPaper = bright > 246 && sat < 24 && diff < 42;
        const nearCornerPaper = bright > 236 && sat < 28 && diff < 20;
        if (veryLightPaper || nearCornerPaper) {
          d[i] = Math.max(r, 248);
          d[i+1] = Math.max(g, 248);
          d[i+2] = Math.max(b, 248);
        }
      }
      ctx.putImageData(img, 0, 0);
      return canvas;
    }

    function averageCornerColor(data, w, h) {
      const sizeX = Math.max(8, Math.round(w * 0.08));
      const sizeY = Math.max(8, Math.round(h * 0.08));
      const corners = [
        sampleAreaAverage(data, w, h, 0, 0, sizeX, sizeY),
        sampleAreaAverage(data, w, h, w - sizeX, 0, sizeX, sizeY),
        sampleAreaAverage(data, w, h, 0, h - sizeY, sizeX, sizeY),
        sampleAreaAverage(data, w, h, w - sizeX, h - sizeY, sizeX, sizeY)
      ];
      return {
        r: corners.reduce((s, c) => s + c.r, 0) / corners.length,
        g: corners.reduce((s, c) => s + c.g, 0) / corners.length,
        b: corners.reduce((s, c) => s + c.b, 0) / corners.length
      };
    }

    function resizeCanvasIfNeeded(canvas, maxSize) {
      if (Math.max(canvas.width, canvas.height) <= maxSize) return canvas;
      const scale = maxSize / Math.max(canvas.width, canvas.height);
      const out = document.createElement('canvas');
      out.width = Math.max(1, Math.round(canvas.width * scale));
      out.height = Math.max(1, Math.round(canvas.height * scale));
      const octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(canvas, 0, 0, out.width, out.height);
      return out;
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function getSelectedPreviewDataUrl(page) {
      if (!page) return '';
      if (page.previewDataUrl) return page.previewDataUrl;
      if (page.previewChoice === 'original' && page.originalDataUrl) return page.originalDataUrl;
      if (page.previewChoice === 'corrected' && page.correctedDataUrl) return page.correctedDataUrl;
      return page.correctedDataUrl || page.originalDataUrl || '';
    }

    function makePagesForStorage(rawPages) {
      // 담당자 링크에서 사진이 보이려면 localStorage에 실제 이미지 미리보기 데이터가 남아야 합니다.
      // 기존 버전은 원본/보정본/선택본을 모두 저장해 용량이 커졌고, 저장공간 부족 시 사진 데이터를 모두 지워
      // 담당자 화면에 "첨부됨"만 보이는 문제가 있었습니다. 저장 시에는 선택된 미리보기 1장만 남깁니다.
      return (Array.isArray(rawPages) ? rawPages : []).filter(Boolean).map((page, index) => {
        const selectedPreview = getSelectedPreviewDataUrl(page);
        return {
          id: page.id || ('p_saved_' + Date.now() + '_' + index),
          fileName: page.fileName || '첨부파일',
          fileSource: page.fileSource || '',
          fileType: page.fileType || '',
          previewDataUrl: selectedPreview || '',
          editDataUrl: selectedPreview || '',
          originalDataUrl: '',
          correctedDataUrl: '',
          previewChoice: selectedPreview ? 'preview' : (page.previewChoice || ''),
          autoFit: page.autoFit || '',
          fitText: page.fitText || '',
          ratioText: page.ratioText || '',
          addedAt: page.addedAt || new Date().toISOString()
        };
      });
    }

    function collectDocData() {
      const docs = {};
      document.querySelectorAll('.doc-card').forEach(card => {
        const groupKey = card.dataset.groupKey || 'equipment';
        if (!isBundleGroupEnabled(groupKey)) return;
        const key = card.dataset.docKey;
        const def = DOCS.find(d => d.key === key);
        const fileBox = card.querySelector('[data-role="filename"]');
        const rawPages = getDocPagesFromCard(card);
        const pages = makePagesForStorage(rawPages);
        const isExpiry = card.dataset.expiry === 'true';
        let expireDate = '';
        const dateInput = isExpiry ? card.querySelector('[data-date-key]') : null;
        if (dateInput) expireDate = dateInput.value || '';
        const phoneValue = (card.querySelector('[data-extra-phone-key]')?.value || '').trim();
        const driverPhoneValue = (card.querySelector('[data-extra-key="driverPhone"]')?.value || '').trim();
        const workerTaskValue = (card.querySelector('[data-extra-task-key]')?.value || '').trim();
        const workerType = card.dataset.workerType || '';
        const workerUid = card.dataset.workerUid || '';
        const workerIndex = card.closest('.worker-person-card')?.dataset.workerIndex || '';
        const workerLabel = card.dataset.workerLabel || (workerType ? getWorkerTypeLabel(workerType) : '');
        const firstPrintable = pages.find(p => p.previewDataUrl) || pages[0] || {};

        docs[key] = {
          key,
          groupKey,
          groupTitle: def ? def.groupTitle : (groupKey === 'worker' ? '인부서류' : ''),
          title: card.dataset.docTitle,
          required: card.dataset.required === 'true',
          expiry: isExpiry,
          expireDate,
          pages,
          pageCount:pages.length,
          fileName: pages.length ? ('첨부 ' + pages.length + '장 · ' + summarizePages(pages)) : '',
          fileSource: firstPrintable.fileSource || fileBox.dataset.fileSource || '',
          fileType: firstPrintable.fileType || fileBox.dataset.fileType || '',
          previewDataUrl: firstPrintable.previewDataUrl || '',
          originalDataUrl: firstPrintable.originalDataUrl || '',
          correctedDataUrl: firstPrintable.correctedDataUrl || '',
          editDataUrl: firstPrintable.editDataUrl || firstPrintable.previewDataUrl || '',
          previewChoice: firstPrintable.previewChoice || '',
          autoFit: firstPrintable.autoFit || '',
          driverPhone: key === 'driverIdCard' ? (driverPhoneValue || phoneValue) : '',
          workerPhone: groupKey === 'worker' ? phoneValue : '',
          personPhone: phoneValue,
          workerTask: groupKey === 'worker' ? workerTaskValue : '',
          workerType,
          workerUid,
          workerIndex,
          workerLabel,
          docKind: card.dataset.docKind || '',
          authVerified: !isPrivateDocCard(card) || card.dataset.authVerified === 'true',
          authVerifiedAt: card.dataset.authVerifiedAt || '',
          authPhone: card.dataset.authPhone || (card.querySelector('[data-auth-phone-input]')?.value || '').trim(),
          authPersonName: card.dataset.authPersonName || '',
          authBirth6: card.dataset.authBirth6 || '',
          authGenderDigit: card.dataset.authGenderDigit || '',
          authCarrier: card.dataset.authCarrier || ''
        };
        docs[key].status = getDocStatus(docs[key]);
      });
      return docs;
    }

    function collectWorkerPeopleMeta() {
      return Array.from(document.querySelectorAll('#workerPeopleList .worker-person-card')).map((card, index) => {
        const uid = card.dataset.workerUid || '';
        const type = card.dataset.workerType || 'normal';
        const idCard = card.querySelector('[data-doc-kind="workerIdCard"]');
        return {
          uid,
          index:index + 1,
          type,
          label:getWorkerTypeLabel(type),
          phone:(idCard?.querySelector('[data-extra-phone-key]')?.value || '').trim(),
          task:(idCard?.querySelector('[data-extra-task-key]')?.value || '').trim(),
          docKeys:['workerIdCard_' + uid, 'workerSafetyTraining_' + uid, 'workerSpecialHealthCheck_' + uid, 'otherWorkerDoc_' + uid]
        };
      });
    }

    function validateWorkerPeople(docs) {
      const missingFiles = [];
      if (!isBundleGroupEnabled('worker')) return { missingFiles };
      const people = collectWorkerPeopleMeta();
      if (!people.length) {
        missingFiles.push('인부서류 - 인부 1명 이상 추가');
        return { missingFiles };
      }
      people.forEach(person => {
        const prefix = '인부서류 - 인부 ' + person.index + ' ' + person.label;
        const idDoc = docs['workerIdCard_' + person.uid];
        const safetyDoc = docs['workerSafetyTraining_' + person.uid];
        if (!idDoc || !idDoc.fileName) missingFiles.push(prefix + ' 신분증');
        if (!safetyDoc || !safetyDoc.fileName) missingFiles.push(prefix + ' 건설기초안전보건교육 이수증');
      });
      return { missingFiles };
    }
