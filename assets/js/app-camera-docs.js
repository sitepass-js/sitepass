// SitePass v23.7.292 - app.bundle.js remaining split (02 camera/document scan)


    function sendPrivateDocAuthCode(button) {
      const card = button?.closest('.doc-card');
      const groupKey = card?.dataset?.groupKey || 'driver';
      sendPersonAuthCode(groupKey === 'worker' ? 'worker' : 'driver');
    }

    function verifyPrivateDocAuth(button) {
      const card = button?.closest('.doc-card');
      const groupKey = card?.dataset?.groupKey || 'driver';
      verifyPersonAuth(groupKey === 'worker' ? 'worker' : 'driver');
    }

    function openNativeCameraFile(card) {
      const targetCard = card || activeCameraCard;
      if (!targetCard) return false;
      if (!requirePrivateDocAuth(targetCard)) return false;
      const fallback = targetCard.querySelector('input[data-role="camera-fallback"]');
      if (fallback) {
        fallback.click();
        return true;
      }
      return false;
    }

    async function openCameraGuide(docKey) {
      const card = document.querySelector('.doc-card[data-doc-key="' + docKey + '"]');
      if (!card) return;
      if (!requirePrivateDocAuth(card)) return;
      activeCameraCard = card;

      // v23.7.160: 사진찍기 모드 오류 수정.
      // businessLicense(사업자등록증)에 license 글자가 들어가 카드촬영으로 잡히던 문제를 막고,
      // 장비서류는 기본 A4, 신분증/면허증/이수증만 카드 촬영모드가 보이게 합니다.

      const modal = document.getElementById('cameraModal');
      const video = document.getElementById('cameraVideo');
      const status = document.getElementById('cameraScanStatus');
      const guide = document.getElementById('cameraGuide');
      activeCameraScanMode = (getCameraScanApi().getDefaultScanMode ? getCameraScanApi().getDefaultScanMode(docKey) : (isCardQuarterDoc(docKey) ? 'card' : 'a4'));
      updateCameraScanModeUi(docKey);
      modal.classList.remove('hidden');
      cameraAutoCaptureBusy = false;
      cameraStableBox = null;
      cameraStableSince = 0;
      if (status) status.textContent = '카메라 권한 확인중';

      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        video.srcObject = cameraStream;
        await video.play();
        startCameraAutoDetect();
      } catch (error) {
        stopCameraAutoDetect();
        resetCameraAutoBox();
        if (status) status.textContent = '권한 차단됨 · 기본 카메라 버튼을 눌러주세요';
        const note = document.getElementById('cameraRuntimeNote');
        if (note) note.textContent = '브라우저가 직접 카메라를 막았습니다. 오른쪽 [기본 카메라]를 누르면 휴대폰 촬영창으로 촬영하고, 촬영 후 용지/A4 보정을 적용합니다.';
      }
    }



    function setCameraScanMode(mode) {
      const docKey = activeCameraCard?.dataset?.docKey || '';
      if (mode === 'card' && !isCardQuarterDoc(docKey)) {
        alert('이 서류는 A4 서류 촬영모드로 저장됩니다.\n카드형 촬영은 신분증·면허증·이수증에서만 사용합니다.');
        mode = 'a4';
      }
      activeCameraScanMode = mode === 'card' ? 'card' : 'a4';
      updateCameraScanModeUi(docKey);
      resetCameraAutoBox();
    }

    function updateCameraScanModeUi(docKey) {
      const guide = document.getElementById('cameraGuide');
      const guideText = guide ? guide.querySelector('.guide-text') : null;
      const status = document.getElementById('cameraScanStatus');
      const label = document.getElementById('cameraDocModeLabel');
      const help = document.getElementById('cameraModeHelp');
      const switchBox = document.getElementById('cameraModeSwitch');
      const a4Btn = document.getElementById('cameraModeA4');
      const cardBtn = document.getElementById('cameraModeCard');
      const docTitle = activeCameraCard?.dataset?.docTitle || '서류';
      const cardAllowed = isCardQuarterDoc(docKey);
      const isCard = cardAllowed && activeCameraScanMode === 'card';
      const cameraTexts = getCameraScanApi().getModeTexts
        ? getCameraScanApi().getModeTexts(docKey, activeCameraScanMode, docTitle)
        : null;

      if (guide) {
        guide.classList.toggle('card-mode', isCard);
        guide.classList.toggle('scan-card', isCard);
        guide.classList.toggle('scan-a4', !isCard);
      }
      if (switchBox) switchBox.classList.toggle('hidden', !cardAllowed);
      if (a4Btn) a4Btn.classList.toggle('active', !isCard);
      if (cardBtn) cardBtn.classList.toggle('active', isCard);

      if (label) label.textContent = cameraTexts?.label || ('현재 촬영모드: ' + (isCard ? '카드/이수증 A4 상단 1/2 배치' : 'A4 서류 전체 맞춤') + ' · ' + docTitle);
      if (help) help.textContent = cameraTexts?.help || (isCard ? '카드를 가로 노란틀에 크게 맞추세요. 촬영 후 A4 상단 1/2 칸에 크게 배치됩니다.' : '서류를 세로 노란틀에 크게 맞추세요. 촬영 후 A4 한 장 크기로 맞춥니다.');
      if (guideText) guideText.textContent = cameraTexts?.note || (isCard ? '카드/이수증만 이 모드를 씁니다 · 밝기보정 없음' : '장비서류는 A4 모드입니다 · 밝기보정 없음');
      if (status) status.textContent = cameraTexts?.status || (isCard ? '카드를 가로 노란틀에 맞춰주세요' : 'A4 서류를 세로 노란틀에 맞춰주세요');
      const note = document.getElementById('cameraRuntimeNote');
      if (note) note.textContent = cameraTexts?.note || (isCard ? '카드형 문서만 A4 상단 1/2 영역에 크게 배치합니다. 색상/밝기는 그대로 둡니다.' : '사업자등록증·장비등록증·검사증·보험증권은 항상 A4 서류로 저장합니다. 색상/밝기는 그대로 둡니다.');
    }

    function closeCameraGuide() {
      stopCameraAutoDetect();
      resetCameraAutoBox();
      const modal = document.getElementById('cameraModal');
      modal.classList.add('hidden');
      const video = document.getElementById('cameraVideo');
      if (video) video.srcObject = null;
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
      }
    }

    function fallbackCameraFile() {
      const targetCard = activeCameraCard;
      closeCameraGuide();
      if (!targetCard) return;
      if (!requirePrivateDocAuth(targetCard)) return;
      openNativeCameraFile(targetCard);
    }

    async function takeCameraPhoto(autoMode = false) {
      if (cameraAutoCaptureBusy && !autoMode) return;
      cameraAutoCaptureBusy = true;
      const status = document.getElementById('cameraScanStatus');
      try {
        const video = document.getElementById('cameraVideo');
        const targetCard = activeCameraCard;
        if (!video || !video.videoWidth || !targetCard) {
          cameraAutoCaptureBusy = false;
          fallbackCameraFile();
          return;
        }
        if (!requirePrivateDocAuth(targetCard)) {
          closeCameraGuide();
          return;
        }
        stopCameraAutoDetect();
        if (status) status.textContent = '촬영 중 · 노란틀 기준으로 스캔본 만드는 중';

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const docKey = targetCard.dataset.docKey || '';
        const isCardMode = activeCameraScanMode === 'card' && isCardQuarterDoc(docKey);
        const guideBox = getCameraGuideCropBox(canvas.width, canvas.height, docKey);
        // 출시 전 안정성을 위해 실시간 자동인식보다 사용자가 보는 노란틀 기준을 우선합니다.
        // 보정은 위치/A4 맞춤만 하고 밝기·색상은 건드리지 않습니다.
        let finalBox = guideBox || { x:0, y:0, w:canvas.width, h:canvas.height };
        let finalCanvas = null;
        let finalLabel = '사진촬영 · 노란틀 기준';

        try {
          if (isCardMode) {
            const cardBox = finalBox || { x:0, y:0, w:canvas.width, h:canvas.height };
            finalCanvas = resizeCanvasIfNeeded(makeCardTopHalfScanCanvas(canvas, cardBox), 1100);
            finalLabel = '사진촬영 · 카드형 A4 상단 1/2 위치맞춤';
          } else {
            const scanBox = finalBox || guideBox;
            if (scanBox) {
              const pad = Math.round(Math.max(scanBox.w, scanBox.h) * 0.012);
              const croppedCanvas = cropCanvas(canvas, scanBox, pad);
              const scanned = smartA4DocumentScan(croppedCanvas, true, docKey);
              finalCanvas = resizeCanvasIfNeeded(scanned.canvas, 1100);
              finalLabel = '사진촬영 · A4 크기맞춤';
            } else {
              const scanned = smartA4DocumentScan(canvas, false, docKey);
              finalCanvas = resizeCanvasIfNeeded(scanned.canvas, 1100);
              finalLabel = '사진촬영 · 원본 크기맞춤';
            }
          }
          sharpenCanvas(finalCanvas, 0.08);
        } catch (error) {
          finalCanvas = resizeCanvasIfNeeded(canvas, 1100);
          finalLabel = '스캔앱 촬영 · 원본축소';
        }

        const blob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/jpeg', 0.82));
        closeCameraGuide();
        if (!blob) return;
        const fileName = getCameraScanApi().buildScanFileName ? getCameraScanApi().buildScanFileName('sitepass_scan') : ('sitepass_scan_' + Date.now() + '.jpg');
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        await applySelectedFile(targetCard, file, finalLabel);
        promptAdditionalDocPage(targetCard, '사진찍기');
      } finally {
        cameraAutoCaptureBusy = false;
      }
    }

    function getCameraGuideCropBox(sourceW, sourceH, docKey = '') {
      const view = document.querySelector('.camera-view');
      const viewW = view?.clientWidth || 0;
      const viewH = view?.clientHeight || 0;
      if (!viewW || !viewH || !sourceW || !sourceH) return null;
      const isCardMode = activeCameraCard && activeCameraCard.dataset.docKey === docKey ? activeCameraScanMode === 'card' : isCardQuarterDoc(docKey);
      const pct = isCardMode
        ? { left:0.07, top:0.27, width:0.86, height:0.41 }
        : { left:0.10, top:0.07, width:0.80, height:0.86 };
      const frameLeft = viewW * pct.left;
      const frameTop = viewH * pct.top;
      const frameW = viewW * pct.width;
      const frameH = viewH * pct.height;

      const sourceAspect = sourceW / sourceH;
      const viewAspect = viewW / viewH;
      let drawW, drawH, offsetX, offsetY, scale;
      if (sourceAspect > viewAspect) {
        drawH = viewH;
        drawW = viewH * sourceAspect;
        offsetX = (viewW - drawW) / 2;
        offsetY = 0;
        scale = drawH / sourceH;
      } else {
        drawW = viewW;
        drawH = viewW / sourceAspect;
        offsetX = 0;
        offsetY = (viewH - drawH) / 2;
        scale = drawW / sourceW;
      }
      const x = clamp((frameLeft - offsetX) / scale, 0, sourceW - 1);
      const y = clamp((frameTop - offsetY) / scale, 0, sourceH - 1);
      const w = clamp(frameW / scale, 1, sourceW - x);
      const h = clamp(frameH / scale, 1, sourceH - y);
      return { x, y, w, h };
    }

    function boxMostlyInside(inner, outer) {
      if (!inner || !outer) return false;
      const ix1 = Math.max(inner.x, outer.x);
      const iy1 = Math.max(inner.y, outer.y);
      const ix2 = Math.min(inner.x + inner.w, outer.x + outer.w);
      const iy2 = Math.min(inner.y + inner.h, outer.y + outer.h);
      const iw = Math.max(0, ix2 - ix1);
      const ih = Math.max(0, iy2 - iy1);
      const intersection = iw * ih;
      const innerArea = Math.max(1, inner.w * inner.h);
      return intersection / innerArea > 0.70;
    }

    function startCameraAutoDetect() {
      // v23.7.157: 실시간 초록 자동인식은 휴대폰/조명에 따라 흔들려서 사용자가 헷갈릴 수 있습니다.
      // 이제 촬영 화면에서는 노란 고정틀만 보여주고, 촬영 후 노란틀 기준으로 A4 보정합니다.
      stopCameraAutoDetect();
      latestCameraBox = null;
      resetCameraAutoBox();
    }

    function stopCameraAutoDetect() {
      if (cameraScanTimer) {
        clearInterval(cameraScanTimer);
        cameraScanTimer = null;
      }
    }

    function resetCameraAutoBox() {
      latestCameraBox = null;
      cameraStableBox = null;
      cameraStableSince = 0;
      const guide = document.getElementById('cameraGuide');
      const box = document.getElementById('autoDocumentBox');
      const status = document.getElementById('cameraScanStatus');
      if (guide) guide.classList.remove('detected');
      if (box) box.removeAttribute('style');
      if (status) status.textContent = (activeCameraScanMode === 'card') ? '카드를 가로 노란틀에 맞춰주세요' : 'A4 서류를 세로 노란틀에 맞춰주세요';
    }

    function scanCameraFrame() {
      const video = document.getElementById('cameraVideo');
      if (!video || !video.videoWidth || !video.videoHeight) return;
      const maxSide = 640;
      const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
      const scanCanvas = document.createElement('canvas');
      scanCanvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      scanCanvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const sctx = scanCanvas.getContext('2d', { willReadFrequently:true });
      sctx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);

      const scanDocKey = activeCameraCard?.dataset?.docKey || '';
      const scanCardMode = isCardQuarterDoc(scanDocKey);
      let smallBox = findDocumentBoundingBox(scanCanvas, sctx, { cardMode: scanCardMode }) || findDocumentBoundingBoxByBackground(scanCanvas, sctx, { cardMode: scanCardMode });
      const status = document.getElementById('cameraScanStatus');
      if (!smallBox) {
        cameraStableBox = null;
        cameraStableSince = 0;
        const guide = document.getElementById('cameraGuide');
        const box = document.getElementById('autoDocumentBox');
        if (guide) guide.classList.remove('detected');
        if (box) box.removeAttribute('style');
        if (status) status.textContent = '용지나 카드를 노란 테두리 안에 맞춰주세요';
        return;
      }

      const sx = video.videoWidth / scanCanvas.width;
      const sy = video.videoHeight / scanCanvas.height;
      latestCameraBox = {
        x: clamp(smallBox.x * sx, 0, video.videoWidth - 1),
        y: clamp(smallBox.y * sy, 0, video.videoHeight - 1),
        w: clamp(smallBox.w * sx, 1, video.videoWidth),
        h: clamp(smallBox.h * sy, 1, video.videoHeight)
      };
      if (latestCameraBox.x + latestCameraBox.w > video.videoWidth) latestCameraBox.w = video.videoWidth - latestCameraBox.x;
      if (latestCameraBox.y + latestCameraBox.h > video.videoHeight) latestCameraBox.h = video.videoHeight - latestCameraBox.y;
      latestCameraDetectedAt = Date.now();
      drawCameraAutoBox(latestCameraBox, video.videoWidth, video.videoHeight);
      const stableInfo = updateCameraStableAutoCapture(latestCameraBox, video.videoWidth, video.videoHeight);
      if (status && stableInfo) status.textContent = stableInfo;
    }

    function updateCameraStableAutoCapture(box, sourceW, sourceH) {
      if (!box || cameraAutoCaptureBusy) return '자동촬영 처리중';
      const now = Date.now();
      const areaRatio = (box.w * box.h) / Math.max(1, sourceW * sourceH);
      const boxRatio = box.w / Math.max(1, box.h);
      const docKey = activeCameraCard?.dataset?.docKey || '';
      const isCardMode = isCardQuarterDoc(docKey);
      const usableSize = isCardMode
        ? areaRatio >= 0.045 && areaRatio <= 0.82 && box.w >= sourceW * 0.20 && box.h >= sourceH * 0.12 && boxRatio >= 0.38 && boxRatio <= 2.65
        : areaRatio >= 0.18 && areaRatio <= 0.92 && box.w >= sourceW * 0.28 && box.h >= sourceH * 0.28 && boxRatio >= 0.42 && boxRatio <= 1.75;
      if (!usableSize) {
        cameraStableBox = null;
        cameraStableSince = 0;
        return '용지/카드가 너무 작거나 화면 밖입니다 · 노란선 안에 크게 맞춰주세요';
      }

      if (!cameraStableBox) {
        cameraStableBox = { ...box };
        cameraStableSince = now;
        return '초록선 감지됨 · 흔들리지 않게 잠깐 고정';
      }

      const prevCx = cameraStableBox.x + cameraStableBox.w / 2;
      const prevCy = cameraStableBox.y + cameraStableBox.h / 2;
      const currCx = box.x + box.w / 2;
      const currCy = box.y + box.h / 2;
      const movement =
        Math.abs(currCx - prevCx) / Math.max(1, sourceW) +
        Math.abs(currCy - prevCy) / Math.max(1, sourceH) +
        Math.abs(box.w - cameraStableBox.w) / Math.max(1, sourceW) +
        Math.abs(box.h - cameraStableBox.h) / Math.max(1, sourceH);

      if (movement > 0.070) {
        cameraStableBox = { ...box };
        cameraStableSince = now;
        return '초록선 감지됨 · 흔들리지 않게 고정해주세요';
      }

      cameraStableBox = { ...box };
      const elapsed = now - cameraStableSince;
      if (elapsed >= CAMERA_AUTO_CAPTURE_DELAY_MS) {
        triggerCameraAutoCapture();
        return '자동촬영 중 · 최종 스캔본 저장 준비';
      }
      const left = Math.max(1, Math.ceil((CAMERA_AUTO_CAPTURE_DELAY_MS - elapsed) / 250));
      return '초록선 고정 확인중 · ' + left + '칸 뒤 자동촬영';
    }

    function triggerCameraAutoCapture() {
      if (cameraAutoCaptureBusy) return;
      cameraAutoCaptureBusy = true;
      const status = document.getElementById('cameraScanStatus');
      if (status) status.textContent = '자동촬영 시작';
      setTimeout(() => takeCameraPhoto(true), 80);
    }

    function drawCameraAutoBox(box, sourceW, sourceH) {
      const guide = document.getElementById('cameraGuide');
      const rect = document.getElementById('autoDocumentBox');
      const view = document.querySelector('.camera-view');
      if (!guide || !rect || !view || !box) return;
      const viewW = view.clientWidth || 1;
      const viewH = view.clientHeight || 1;
      const sourceAspect = sourceW / sourceH;
      const viewAspect = viewW / viewH;
      let drawW, drawH, offsetX, offsetY, scale;
      if (sourceAspect > viewAspect) {
        drawH = viewH;
        drawW = viewH * sourceAspect;
        offsetX = (viewW - drawW) / 2;
        offsetY = 0;
        scale = drawH / sourceH;
      } else {
        drawW = viewW;
        drawH = viewW / sourceAspect;
        offsetX = 0;
        offsetY = (viewH - drawH) / 2;
        scale = drawW / sourceW;
      }
      const left = clamp(offsetX + box.x * scale, 0, viewW);
      const top = clamp(offsetY + box.y * scale, 0, viewH);
      const right = clamp(offsetX + (box.x + box.w) * scale, 0, viewW);
      const bottom = clamp(offsetY + (box.y + box.h) * scale, 0, viewH);
      if (right - left < 30 || bottom - top < 30) return;
      rect.style.left = left + 'px';
      rect.style.top = top + 'px';
      rect.style.width = (right - left) + 'px';
      rect.style.height = (bottom - top) + 'px';
      guide.classList.add('detected');
    }

    function detectDocumentBoxOnCanvas(canvas, docKey = '') {
      const scaled = makeScaledCanvasFromCanvas(canvas, 760);
      const cardMode = isCardQuarterDoc(docKey);
      const box = findDocumentBoundingBox(scaled.canvas, scaled.ctx, { cardMode }) || findDocumentBoundingBoxByBackground(scaled.canvas, scaled.ctx, { cardMode });
      if (!box) return null;
      const sx = canvas.width / scaled.canvas.width;
      const sy = canvas.height / scaled.canvas.height;
      const out = {
        x: clamp(box.x * sx, 0, canvas.width - 1),
        y: clamp(box.y * sy, 0, canvas.height - 1),
        w: clamp(box.w * sx, 1, canvas.width),
        h: clamp(box.h * sy, 1, canvas.height)
      };
      if (out.x + out.w > canvas.width) out.w = canvas.width - out.x;
      if (out.y + out.h > canvas.height) out.h = canvas.height - out.y;
      const areaRatio = (out.w * out.h) / (canvas.width * canvas.height);
      if (areaRatio < 0.035 || areaRatio > 0.98) return null;
      return out;
    }

    function makeScaledCanvasFromCanvas(sourceCanvas, maxSide) {
      const scale = Math.min(1, maxSide / Math.max(sourceCanvas.width, sourceCanvas.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
      canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
      return { canvas, ctx, scale };
    }

    function isBundleGroupEnabled(groupKey) {
      if (groupKey === 'equipment') return true;
      if (groupKey === 'driver') return !!document.getElementById('includeDriverDocs')?.checked;
      if (groupKey === 'worker') return !!document.getElementById('includeWorkerDocs')?.checked;
      return true;
    }

    function getActiveDocDefs() {
      return DOCS.filter(doc => isBundleGroupEnabled(doc.groupKey));
    }

    function toggleBundleGroup(groupKey) {
      const group = document.querySelector('[data-bundle-group="' + groupKey + '"]');
      const enabled = isBundleGroupEnabled(groupKey);
      if (group) {
        group.classList.toggle('inactive', !enabled);
        group.dataset.active = enabled ? 'true' : 'false';
        const body = group.querySelector('.bundle-group-body');
        if (body) body.classList.toggle('hidden', !enabled);
      }
      if (groupKey === 'worker' && enabled) {
        const list = document.getElementById('workerPeopleList');
        if (list) list.innerHTML = '';
        resetPersonAuth('worker');
      }
      renderAlertPreview();
      renderBundleSummary();
    }

    function renderBundleSummary() {
      const box = document.getElementById('bundleSummary');
      if (!box) return;
      const activeGroups = DOC_GROUPS.filter(group => isBundleGroupEnabled(group.key));
      let requiredCount = activeGroups.reduce((sum, group) => sum + group.docs.filter(doc => doc.required).length, 0);
      let optionalCount = activeGroups.reduce((sum, group) => sum + group.docs.filter(doc => !doc.required).length, 0);
      const workerPeopleCount = isBundleGroupEnabled('worker') ? document.querySelectorAll('#workerPeopleList .worker-person-card').length : 0;
      if (isBundleGroupEnabled('worker')) {
        const displayCount = Math.max(1, workerPeopleCount);
        requiredCount += displayCount * 2; // 인부별 신분증 + 기초안전교육
        optionalCount += displayCount * 2; // 인부별 특수건강검진 + 기타
      }
      box.innerHTML =
        '<div><b>' + activeGroups.length + '</b><span>포함 구역</span></div>' +
        '<div><b>' + requiredCount + '</b><span>필수서류</span></div>' +
        '<div><b>' + optionalCount + '</b><span>선택서류</span></div>';
    }

    function findCleanDateShell(el) {
      return el ? el.closest('.clean-date-picker') : null;
    }

    function setCleanDateValue(displayInput, value) {
      if (!displayInput) return;
      const cleanValue = value || '';
      displayInput.value = cleanValue;
      const shell = findCleanDateShell(displayInput);
      const realInput = shell ? shell.querySelector('[data-clean-date-real]') : null;
      if (realInput) realInput.value = cleanValue;
      renderAlertPreview();
    }

    function syncCleanDatePicker(realInput) {
      const shell = findCleanDateShell(realInput);
      const displayInput = shell ? shell.querySelector('[data-clean-date-display]') : null;
      if (!displayInput || !realInput) return;
      displayInput.value = realInput.value || '';
      renderAlertPreview();
      setTimeout(function(){
        try { realInput.blur(); } catch(e) {}
        try { displayInput.blur(); } catch(e) {}
      }, 0);
    }

    function openCleanDatePicker(displayInput) {
      if (!displayInput) return;
      const shell = findCleanDateShell(displayInput);
      const realInput = shell ? shell.querySelector('[data-clean-date-real]') : null;
      if (!realInput) return;
      realInput.value = displayInput.value || '';
      try { displayInput.blur(); } catch(e) {}
      try { realInput.focus({ preventScroll:true }); } catch(e) { try { realInput.focus(); } catch(_) {} }
      try {
        if (typeof realInput.showPicker === 'function') {
          realInput.showPicker();
        } else {
          realInput.click();
        }
      } catch(e) {
        try { realInput.click(); } catch(_) {}
      }
      setTimeout(function(){
        try { displayInput.blur(); } catch(e) {}
      }, 0);
    }

    function attachDocInputHandlers(root) {
      const target = root || document;
      target.querySelectorAll('input[type="file"]').forEach(input => {
        if (input.dataset.boundChange === 'yes') return;
        input.addEventListener('click', function(event) {
          const card = event.target.closest('.doc-card');
          if (!requirePrivateDocAuth(card)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return false;
          }
        }, true);
        input.addEventListener('change', handleFileChange);
        input.dataset.boundChange = 'yes';
      });
      target.querySelectorAll('[data-upload-label], .camera-launch').forEach(el => {
        if (el.dataset.boundAuthGate === 'yes') return;
        el.addEventListener('click', function(event) {
          const card = event.target.closest('.doc-card');
          if (!requirePrivateDocAuth(card)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return false;
          }
        }, true);
        el.dataset.boundAuthGate = 'yes';
      });
      refreshPrivateDocLocks(target);
      target.querySelectorAll('[data-clean-date-display]').forEach(input => {
        if (input.dataset.boundDateDisplay === 'yes') return;
        input.addEventListener('mousedown', function(event) { event.preventDefault(); });
        input.addEventListener('click', function(event) { event.preventDefault(); openCleanDatePicker(input); });
        input.addEventListener('keydown', function(event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openCleanDatePicker(input);
          }
        });
        input.dataset.boundDateDisplay = 'yes';
      });
      target.querySelectorAll('[data-clean-date-real]').forEach(input => {
        if (input.dataset.boundDateReal === 'yes') return;
        input.addEventListener('change', function() { syncCleanDatePicker(input); });
        input.addEventListener('input', function() { syncCleanDatePicker(input); });
        input.addEventListener('blur', function() { syncCleanDatePicker(input); });
        input.dataset.boundDateReal = 'yes';
      });
      target.querySelectorAll('input[type="date"]:not([data-clean-date-real])').forEach(input => {
        if (input.dataset.boundDate === 'yes') return;
        input.addEventListener('change', function() { renderAlertPreview(); setTimeout(function(){ input.blur(); }, 0); });
        input.dataset.boundDate = 'yes';
      });
      target.querySelectorAll('[data-extra-phone-key], [data-extra-task-key]').forEach(input => {
        if (input.dataset.boundExtra === 'yes') return;
        input.addEventListener('input', renderBundleSummary);
        input.dataset.boundExtra = 'yes';
      });
    }

    function renderDocCardHtml(group, doc, index, options = {}) {
      const key = options.key || doc.key;
      const title = options.title || doc.title;
      const groupKey = options.groupKey || group.key;
      const workerAttrs = options.workerAttrs || '';
      const isPrivateDoc = groupKey === 'driver' || groupKey === 'worker';
      const authVerified = !isPrivateDoc || options.authVerified === true;
      const privateAuthAttrs = isPrivateDoc && !authVerified ? ' disabled data-locked-before-auth="yes"' : '';
      const privateAuthClass = isPrivateDoc && !authVerified ? ' auth-locked' : '';
      const authMetaAttrs = [];
      if (options.authPhone) authMetaAttrs.push('data-auth-phone="' + escapeHtml(options.authPhone) + '"');
      if (options.authPersonName) authMetaAttrs.push('data-auth-person-name="' + escapeHtml(options.authPersonName) + '"');
      if (options.authVerifiedAt) authMetaAttrs.push('data-auth-verified-at="' + escapeHtml(options.authVerifiedAt) + '"');
      const lockedNoteHtml = isPrivateDoc && !authVerified ? '<div class="auth-status">🔒 ' + (groupKey === 'driver' ? '기사 본인 동의/인증을 한 번 완료하면 기사서류 전체가 열립니다.' : '인부 동의/인증을 완료한 사람만 서류 업로드가 열립니다.') + '</div>' : '';
      const extraPhoneHtml = options.extraPhone ? '<div class="id-phone-input"><label>' + escapeHtml(options.phoneLabel || '전화번호 선택입력') + '</label><input type="tel" data-extra-phone-key="' + escapeHtml(options.phoneKey || 'phone') + '" placeholder="예: 010-0000-0000" inputmode="tel" autocomplete="tel" /></div>' : '';
      const extraTaskHtml = options.extraTask ? '<div class="id-phone-input" data-special-task-box><label>특수인부 작업내용 선택입력</label><input type="text" data-extra-task-key="workerTask" placeholder="예: 신호수 / 용접 / 타워크레인 신호 / 유도원" autocomplete="off" /></div>' : '';
      const driverPhoneHtml = doc.extraPhone ? '<div class="id-phone-input"><label>기사 전화번호 선택입력</label><input type="tel" data-extra-key="driverPhone" data-extra-phone-key="driverPhone" placeholder="예: 010-0000-0000" inputmode="tel" autocomplete="tel" /></div>' : '';
      return '<div class="doc-card ' + (doc.required ? 'required' : '') + '" data-doc-key="' + key + '" data-doc-title="' + escapeHtml(title) + '" data-required="' + doc.required + '" data-expiry="' + doc.expiry + '" data-group-key="' + groupKey + '" data-auth-verified="' + (authVerified ? 'true' : 'false') + '" ' + authMetaAttrs.join(' ') + ' ' + workerAttrs + '>' +
        '<div class="doc-head"><div class="doc-title">' + (index + 1) + '. ' + escapeHtml(title) + '</div><span class="badge ' + (doc.required ? 'need' : '') + '">' + (doc.required ? '필수' : '선택') + '</span></div>' +
        lockedNoteHtml +
        '<div class="file-row">' +
          '<label class="file-button' + privateAuthClass + '" data-upload-label>갤러리/내파일함<input type="file" data-role="file" accept=".jpg,.jpeg,.png,.webp,.pdf,application/pdf" multiple' + privateAuthAttrs + ' /></label>' +
          '<button type="button" class="file-button camera-launch' + privateAuthClass + '" onclick="openCameraGuide(\'' + escapeJs(key) + '\')"' + privateAuthAttrs + '>사진찍기</button>' +
          '<input type="file" class="hidden-camera-input' + privateAuthClass + '" data-role="camera-fallback" accept="image/*" capture="environment" style="display:none"' + privateAuthAttrs + ' />' +
        '</div>' +
        '<div class="multi-page-hint">사진/파일을 올린 뒤 모든 서류에서 “추가 장이 있나요?”를 확인합니다. 확인을 누르면 같은 서류에 2페이지, 3페이지처럼 계속 추가됩니다.</div>' +
        '<div class="selected-file" data-role="filename" data-pages-json="[]">첨부 없음</div>' +
        driverPhoneHtml + extraPhoneHtml + extraTaskHtml +
        (doc.expiry ? '<div class="date-grid"><div class="date-field"><label>' + escapeHtml(doc.dateLabel) + '</label><div class="clean-date-picker"><input type="text" class="clean-date-display" data-date-key="' + doc.dateKey + '" data-date-label="' + escapeHtml(doc.dateLabel) + '" data-clean-date-display="yes" placeholder="날짜 선택" readonly /><input type="date" class="clean-date-real" data-clean-date-real="yes" aria-label="' + escapeHtml(doc.dateLabel) + '" tabindex="-1" /></div></div></div>' : '') +
        '<div class="date-note">' + escapeHtml(doc.note) + '</div>' +
      '</div>';
    }

    function renderDriverAuthPanel() {
      return '<div class="person-auth-panel" data-person-auth-panel="driver" data-auth-code-sent="false" data-auth-verified="false">' +
        '<div class="person-auth-head"><div><b>기사 개인정보 서류 한 번 동의/인증</b><span>기사 신분증·면허증·교육증·건강검진 등 개인정보 서류는 기사 본인이 문자 동의안내를 받은 뒤 6자리 번호를 전달해야 전체 업로드가 열립니다. 인증은 사람별 최초 등록 때 받으며, 현장 링크를 보낼 때마다 다시 받지 않습니다.</span></div><span class="badge need" data-person-auth-badge>인증대기</span></div>' +
        '<div class="person-auth-grid"><input type="text" data-person-auth-name placeholder="기사 이름" autocomplete="off" /><input type="text" data-person-auth-jumin placeholder="주민번호 예: 840507-1" maxlength="8" inputmode="numeric" autocomplete="off" oninput="formatPersonAuthJuminTyping(this)" onblur="formatPersonAuthJuminDisplay(this)" /></div>' +
        '<div class="person-auth-grid"><select data-person-auth-carrier><option value="">통신사 선택</option><option value="SKT">SKT</option><option value="KT">KT</option><option value="LG U+">LG U+</option><option value="SKT 알뜰폰">SKT 알뜰폰</option><option value="KT 알뜰폰">KT 알뜰폰</option><option value="LG U+ 알뜰폰">LG U+ 알뜰폰</option></select><input type="tel" data-person-auth-phone placeholder="기사 휴대폰번호" inputmode="tel" autocomplete="tel" /></div>' +
        '<div class="auth-mini-note">기사에게 약관/동의 안내 문자와 6자리 번호를 보냅니다. 정식 서비스에서는 통신사/PASS 본인확인으로 이름·주민번호·휴대폰번호가 일치하는지 확인합니다.</div>' +
        '<div class="person-auth-grid three"><button type="button" class="ghost" data-person-auth-send-button onclick="sendPersonAuthCode(\'driver\')">약관/동의 문자보내기</button><input type="text" class="hidden" data-person-auth-code placeholder="기사/인부가 받은 6자리 번호 입력" inputmode="numeric" maxlength="6" autocomplete="one-time-code" /><button type="button" class="primary hidden" data-person-auth-verify-button onclick="verifyPersonAuth(\'driver\')">인증하기</button></div>' +
        '<div class="person-auth-actions"><button type="button" class="ghost" onclick="showAuthSmsPreview(\'driver\')">문자내용 보기</button></div>' +
        '<div class="sms-preview-box hidden" data-person-sms-preview></div>' +
        '<div class="auth-status" data-person-auth-status>기사 문자 동의안내와 6자리 인증을 완료하면 기사서류 전체가 열립니다.</div>' +
      '</div>';
    }

    function renderWorkerPeopleSection() {
      return '<div class="worker-control-box">' +
        '<div class="small">인부는 여러 명이 될 수 있으므로 인부 1명마다 문자 동의안내와 6자리 번호를 먼저 확인합니다. 인증 완료 후에만 아래 추가 버튼이 열리고, 추가된 그 인부의 서류는 한 번에 업로드할 수 있습니다. 단, 이 인증은 해당 인부 서류 등록 동의용이고, 현장 담당자에게 공유 링크를 보낼 때마다 다시 인증받는 구조가 아닙니다.</div>' +
        '<div class="person-auth-panel" data-person-auth-panel="worker" data-auth-code-sent="false" data-pending-verified="false">' +
          '<div class="person-auth-head"><div><b>인부 1명 동의/인증 후 추가</b><span>보통인부/특수인부를 선택하고 이름·휴대폰번호·문자 동의안내·6자리 인증을 끝내면 추가 버튼이 열립니다. 인증은 인부 1명당 최초 등록 때 받으며, 현장 링크를 보낼 때마다 다시 받지 않습니다.</span></div><span class="badge need" data-person-auth-badge>인증대기</span></div>' +
          '<div class="person-auth-grid three"><select data-person-auth-type><option value="normal">보통인부</option><option value="special">특수인부</option></select><input type="text" data-person-auth-name placeholder="인부 이름" autocomplete="off" /><input type="text" data-person-auth-jumin placeholder="주민번호 예: 840507-1" maxlength="8" inputmode="numeric" autocomplete="off" oninput="formatPersonAuthJuminTyping(this)" onblur="formatPersonAuthJuminDisplay(this)" /></div>' +
          '<div class="person-auth-grid"><select data-person-auth-carrier><option value="">통신사 선택</option><option value="SKT">SKT</option><option value="KT">KT</option><option value="LG U+">LG U+</option><option value="SKT 알뜰폰">SKT 알뜰폰</option><option value="KT 알뜰폰">KT 알뜰폰</option><option value="LG U+ 알뜰폰">LG U+ 알뜰폰</option></select><input type="tel" data-person-auth-phone placeholder="인부 휴대폰번호" inputmode="tel" autocomplete="tel" /></div>' +
          '<div class="auth-mini-note">인부에게 약관/동의 안내 문자와 6자리 번호를 보냅니다. 정식 서비스에서는 통신사/PASS 본인확인으로 이름·주민번호·휴대폰번호가 일치하는지 확인합니다.</div>' +
          '<div class="person-auth-grid three"><button type="button" class="ghost" data-person-auth-send-button onclick="sendPersonAuthCode(\'worker\')">약관/동의 문자보내기</button><input type="text" class="hidden" data-person-auth-code placeholder="기사/인부가 받은 6자리 번호 입력" inputmode="numeric" maxlength="6" autocomplete="one-time-code" /><button type="button" class="primary hidden" data-person-auth-verify-button onclick="verifyPersonAuth(\'worker\')">인증하기</button></div>' +
          '<div class="person-auth-actions"><button type="button" class="secondary" onclick="resetPersonAuth(\'worker\')">다음 인부 입력</button><button type="button" class="ghost" onclick="showAuthSmsPreview(\'worker\')">문자내용 보기</button></div>' +
          '<div class="sms-preview-box hidden" data-person-sms-preview></div>' +
          '<div class="auth-status" data-person-auth-status>인부 1명마다 문자 동의안내와 6자리 인증 후 추가 버튼이 열립니다.</div>' +
        '</div>' +
        '<div class="worker-add-grid">' +
          '<button type="button" class="ghost disabled" data-worker-add-button disabled onclick="addWorkerPerson(\'normal\')">보통인부 추가</button>' +
          '<button type="button" class="primary disabled" data-worker-add-button disabled onclick="addWorkerPerson(\'special\')">특수인부 추가</button>' +
        '</div>' +
      '</div><div id="workerPeopleList"></div>';
    }

    function getWorkerTypeLabel(type) {
      return type === 'special' ? '특수인부' : '보통인부';
    }

    function addWorkerPerson(type) {
      const list = document.getElementById('workerPeopleList');
      if (!list) return;
      const panel = document.querySelector('[data-person-auth-panel="worker"]');
      const verified = panel?.dataset.pendingVerified === 'true';
      if (!verified) {
        alert('인부를 추가하려면 먼저 해당 인부의 문자 동의안내와 6자리 인증을 완료해야 합니다.');
        panel?.scrollIntoView({ behavior:'smooth', block:'center' });
        return;
      }
      const requestedType = panel.dataset.pendingType || panel.querySelector('[data-person-auth-type]')?.value || type || 'normal';
      const finalType = requestedType || type || 'normal';
      const uid = 'w' + Date.now() + '_' + (++workerPersonSeq);
      const authMeta = {
        authVerified:true,
        authPhone:panel.dataset.pendingPhone || '',
        authPersonName:panel.dataset.pendingName || '',
        authVerifiedAt:panel.dataset.pendingVerifiedAt || new Date().toISOString()
      };
      list.insertAdjacentHTML('beforeend', renderWorkerPersonCard(finalType, uid, authMeta));
      const personCard = list.querySelector('.worker-person-card[data-worker-uid="' + uid + '"]');
      if (personCard) {
        personCard.dataset.workerAuthPhone = authMeta.authPhone;
        personCard.dataset.workerAuthName = authMeta.authPersonName;
        personCard.dataset.workerAuthVerifiedAt = authMeta.authVerifiedAt;
        const phoneInput = personCard.querySelector('[data-extra-phone-key="workerPhone"]');
        if (phoneInput && !phoneInput.value) phoneInput.value = authMeta.authPhone;
      }
      attachDocInputHandlers(list);
      refreshWorkerPersonNumbers();
      renderBundleSummary();
      resetPersonAuth('worker');
      alert('인부 서류함이 추가되었습니다. 추가된 인부는 인증완료 상태로 저장됩니다. 다음 인부가 있으면 다음 인부만 새로 동의/인증 후 추가하세요.');
    }

    function renderWorkerPersonCard(type, uid, authMeta = {}) {
      const group = { key:'worker', title:'인부서류' };
      const label = getWorkerTypeLabel(type);
      const attrs = 'data-worker-uid="' + uid + '" data-worker-type="' + type + '"';
      const idDoc = { key:'workerIdCard', title:label + ' 신분증', required:true, expiry:false, note:'인부 신분증은 필수입니다. 전화번호는 신분증 사진 아래 표시용으로 선택 입력합니다.' };
      const safetyDoc = { key:'workerSafetyTraining', title:label + ' 건설기초안전보건교육 이수증', required:true, expiry:false, note:'인부서류를 포함하면 인부별 건설기초안전보건교육 이수증은 필수입니다.' };
      const healthDoc = { key:'workerSpecialHealthCheck', title:label + ' 특수건강검진서류', required:false, expiry:false, note:'선택 서류입니다. 현장 요구 시 인부별로 첨부합니다.' };
      const otherDoc = { key:'otherWorkerDoc', title:label + ' 기타인부서류', required:false, expiry:false, note:'선택 서류입니다. 필요한 인부서류를 인부별로 추가합니다.' };
      const baseAttrs = attrs + ' data-worker-label="' + label + '"';
      return '<div class="worker-person-card" data-worker-uid="' + uid + '" data-worker-type="' + type + '">' +
        '<div class="worker-person-head"><div class="worker-person-title"><b><span data-worker-number></span> ' + label + '</b><span>인부 1명 단위로 신분증/안전교육/선택서류를 등록합니다.</span></div><button type="button" class="mini-button" onclick="removeWorkerPerson(\'' + uid + '\')">삭제</button></div>' +
        '<div class="worker-type-row"><div class="field"><label>인부 구분</label><select onchange="changeWorkerPersonType(this)"><option value="normal" ' + (type === 'normal' ? 'selected' : '') + '>보통인부</option><option value="special" ' + (type === 'special' ? 'selected' : '') + '>특수인부</option></select></div><span class="badge ' + (type === 'special' ? 'warn' : '') + '">' + label + '</span></div>' +
        renderDocCardHtml(group, idDoc, 0, { key:'workerIdCard_' + uid, title:label + ' 신분증', groupKey:'worker', workerAttrs:baseAttrs + ' data-doc-kind="workerIdCard"', extraPhone:true, phoneKey:'workerPhone', phoneLabel:'인부 전화번호 선택입력', extraTask:type === 'special', ...authMeta }) +
        renderDocCardHtml(group, safetyDoc, 1, { key:'workerSafetyTraining_' + uid, title:label + ' 기초안전보건교육 이수증', groupKey:'worker', workerAttrs:baseAttrs + ' data-doc-kind="workerSafetyTraining"', ...authMeta }) +
        renderDocCardHtml(group, healthDoc, 2, { key:'workerSpecialHealthCheck_' + uid, title:label + ' 특수건강검진서류', groupKey:'worker', workerAttrs:baseAttrs + ' data-doc-kind="workerSpecialHealthCheck"', ...authMeta }) +
        renderDocCardHtml(group, otherDoc, 3, { key:'otherWorkerDoc_' + uid, title:label + ' 기타인부서류', groupKey:'worker', workerAttrs:baseAttrs + ' data-doc-kind="otherWorkerDoc"', ...authMeta }) +
      '</div>';
    }

    function refreshWorkerPersonNumbers() {
      document.querySelectorAll('#workerPeopleList .worker-person-card').forEach((card, index) => {
        const target = card.querySelector('[data-worker-number]');
        if (target) target.textContent = '인부 ' + (index + 1) + '.';
        card.dataset.workerIndex = String(index + 1);
      });
    }

    function removeWorkerPerson(uid) {
      const card = document.querySelector('.worker-person-card[data-worker-uid="' + uid + '"]');
      if (card && confirm('이 인부 등록칸을 삭제할까요?')) {
        card.remove();
        refreshWorkerPersonNumbers();
        renderBundleSummary();
      }
    }

    function changeWorkerPersonType(select) {
      const person = select.closest('.worker-person-card');
      if (!person) return;
      const oldType = person.dataset.workerType || 'normal';
      const newType = select.value || 'normal';
      if (oldType === newType) return;
      if (!confirm('인부 구분을 바꾸면 이 인부칸의 첨부파일이 초기화됩니다. 바꿀까요?')) {
        select.value = oldType;
        return;
      }
      const uid = person.dataset.workerUid;
      const firstDoc = person.querySelector('.doc-card[data-group-key="worker"]');
      const authMeta = {
        authVerified:firstDoc?.dataset.authVerified === 'true',
        authPhone:firstDoc?.dataset.authPhone || person.dataset.workerAuthPhone || '',
        authPersonName:firstDoc?.dataset.authPersonName || person.dataset.workerAuthName || '',
        authVerifiedAt:firstDoc?.dataset.authVerifiedAt || person.dataset.workerAuthVerifiedAt || ''
      };
      person.outerHTML = renderWorkerPersonCard(newType, uid, authMeta);
      const newPerson = document.querySelector('.worker-person-card[data-worker-uid="' + uid + '"]');
      if (newPerson) {
        newPerson.dataset.workerAuthPhone = authMeta.authPhone || '';
        newPerson.dataset.workerAuthName = authMeta.authPersonName || '';
        newPerson.dataset.workerAuthVerifiedAt = authMeta.authVerifiedAt || '';
        const phoneInput = newPerson.querySelector('[data-extra-phone-key="workerPhone"]');
        if (phoneInput && !phoneInput.value) phoneInput.value = authMeta.authPhone || '';
      }
      const list = document.getElementById('workerPeopleList');
      attachDocInputHandlers(list);
      refreshWorkerPersonNumbers();
      renderBundleSummary();
    }

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


    function trimPaperBorder(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const bg = averageCornerColor(d, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 900));
      const xs = [], ys = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = d[i], g = d[i+1], b = d[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(d, w, h, x, y, step);
          const isPaperLike = bright > 170 || sat < 60 || diff > 22 || edge > 14;
          if (isPaperLike) { xs.push(x); ys.push(y); }
        }
      }
      if (xs.length < 60) return canvas;
      xs.sort((a,b)=>a-b); ys.sort((a,b)=>a-b);
      let left = xs[Math.floor(xs.length * 0.015)];
      let right = xs[Math.floor(xs.length * 0.985)];
      let top = ys[Math.floor(ys.length * 0.015)];
      let bottom = ys[Math.floor(ys.length * 0.985)];
      if (right <= left || bottom <= top) return canvas;
      left = clamp(left, 0, w - 1);
      top = clamp(top, 0, h - 1);
      right = clamp(right, 1, w);
      bottom = clamp(bottom, 1, h);
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.45 || bh < h * 0.45) return canvas;
      const out = document.createElement('canvas');
      out.width = Math.max(1, bw);
      out.height = Math.max(1, bh);
      const octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0,0,out.width,out.height);
      octx.drawImage(canvas, left, top, bw, bh, 0, 0, out.width, out.height);
      return out;
    }

    function forceToA4Canvas(canvas) {
      const portrait = canvas.height >= canvas.width;
      const longSide = 1100;
      const shortSide = Math.round(longSide / 1.41421356);
      const out = document.createElement('canvas');
      out.width = portrait ? shortSide : longSide;
      out.height = portrait ? longSide : shortSide;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      const scale = Math.min(out.width / canvas.width, out.height / canvas.height);
      const drawW = Math.round(canvas.width * scale);
      const drawH = Math.round(canvas.height * scale);
      const x = Math.round((out.width - drawW) / 2);
      const y = Math.round((out.height - drawH) / 2);
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, x, y, drawW, drawH);
      return out;
    }


    function isCardQuarterDoc(docKey) {
      const rawKey = String(docKey || '').toLowerCase();
      const key = rawKey.replace(/_[a-z0-9-]+$/i, '');
      // 중요: businessLicense(사업자등록증)에 license가 들어가므로 includes('license')를 쓰면 안 됩니다.
      // 카드형은 실제 신분증/면허증/기초안전보건교육 이수증만 지정합니다.
      return [
        'driveridcard',
        'driverlicense',
        'driverbasicsafetytraining',
        'workeridcard',
        'workersafetytraining'
      ].includes(key);
    }

    function shouldUseCardQuarterLayout(docKey, cropW, cropH, sourceW, sourceH) {
      if (!isCardQuarterDoc(docKey)) return false;
      const cw = Math.max(1, cropW || 0);
      const ch = Math.max(1, cropH || 0);
      const sw = Math.max(1, sourceW || cw);
      const sh = Math.max(1, sourceH || ch);
      const areaRatio = (cw * ch) / Math.max(1, sw * sh);
      const shapeRatio = Math.max(cw, ch) / Math.max(1, Math.min(cw, ch));

      // v23.7.156: 카드형 문서도 전체 카메라 화면을 무조건 A4 상단 1/2로 넣지 않습니다.
      // 카드 비율에 가깝고, 화면 일부로 잡힌 경우에만 상단 1/2 배치합니다.
      // A4 문서가 실수로 카드형처럼 저장되는 문제를 막기 위한 조건입니다.
      const cardLikeRatio = shapeRatio >= 1.18 && shapeRatio <= 2.35;
      const cardLikeSize = areaRatio >= 0.035 && areaRatio <= 0.72;
      return cardLikeRatio && cardLikeSize;
    }

    function makeA4QuarterCanvas(cardCanvas) {
      const longSide = 1100;
      const shortSide = Math.round(longSide / 1.41421356);
      const out = document.createElement('canvas');
      out.width = shortSide;
      out.height = longSide;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);

      const cellW = out.width / 2;
      const cellH = out.height / 2;
      const margin = Math.round(out.width * 0.035);
      const maxW = cellW - margin * 2;
      const maxH = cellH - margin * 2;
      const scale = Math.min(maxW / cardCanvas.width, maxH / cardCanvas.height, 1.8);
      const drawW = Math.max(1, Math.round(cardCanvas.width * scale));
      const drawH = Math.max(1, Math.round(cardCanvas.height * scale));
      const x = margin;
      const y = margin;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2, y - 2, drawW + 4, drawH + 4);
      ctx.drawImage(cardCanvas, 0, 0, cardCanvas.width, cardCanvas.height, x, y, drawW, drawH);
      ctx.strokeStyle = '#d7dfed';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, y - 1, drawW + 2, drawH + 2);
      return out;
    }


    function makeA4TopHalfCanvas(cardCanvas) {
      const longSide = 1100;
      const shortSide = Math.round(longSide / 1.41421356);
      const out = document.createElement('canvas');
      out.width = shortSide;
      out.height = longSide;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);

      const halfH = Math.round(out.height / 2);
      const marginX = Math.round(out.width * 0.016);
      const marginTop = Math.round(out.height * 0.010);
      const innerGap = Math.round(out.height * 0.008);
      const maxW = out.width - marginX * 2;
      const maxH = halfH - marginTop - innerGap;
      const scale = Math.min(maxW / Math.max(1, cardCanvas.width), maxH / Math.max(1, cardCanvas.height), 4.2);
      const drawW = Math.max(1, Math.round(cardCanvas.width * scale));
      const drawH = Math.max(1, Math.round(cardCanvas.height * scale));
      const x = Math.round((out.width - drawW) / 2);
      const y = marginTop + Math.max(0, Math.round((maxH - drawH) / 2));

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2, y - 2, drawW + 4, drawH + 4);
      ctx.drawImage(cardCanvas, 0, 0, cardCanvas.width, cardCanvas.height, x, y, drawW, drawH);
      ctx.strokeStyle = '#d7dfed';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, y - 1, drawW + 2, drawH + 2);
      ctx.strokeStyle = '#edf0f5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, halfH);
      ctx.lineTo(out.width, halfH);
      ctx.stroke();
      return out;
    }

    function findCardContentBBoxLoose(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return null;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 900));
      const xs = [], ys = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const active = diff > 24 || edge > 13 || (sat > 22 && bright < 248) || bright < 185;
          if (active) { xs.push(x); ys.push(y); }
        }
      }
      if (xs.length < 35) return null;
      xs.sort((a,b)=>a-b); ys.sort((a,b)=>a-b);
      let left = xs[Math.floor(xs.length * 0.005)];
      let right = xs[Math.floor(xs.length * 0.995)];
      let top = ys[Math.floor(ys.length * 0.005)];
      let bottom = ys[Math.floor(ys.length * 0.995)];
      if (right <= left || bottom <= top) return null;
      let bw = right - left;
      let bh = bottom - top;
      if (bw < Math.max(24, w * 0.035) || bh < Math.max(18, h * 0.025)) return null;

      const pad = Math.round(Math.max(bw, bh) * 0.055);
      left = clamp(left - pad, 0, w - 1);
      top = clamp(top - pad, 0, h - 1);
      right = clamp(right + pad, left + 1, w);
      bottom = clamp(bottom + pad, top + 1, h);
      bw = right - left;
      bh = bottom - top;

      if (bw > w * 0.94 && bh > h * 0.94) return null;
      return { x:left, y:top, w:bw, h:bh };
    }


    function findCardForegroundBox(canvas, regionRatio) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return null;
      const scanH = Math.max(1, Math.min(h, Math.round(h * (regionRatio || 1))));
      const data = ctx.getImageData(0, 0, w, scanH).data;
      const bg = averageCornerColor(data, w, scanH);
      const step = Math.max(1, Math.round(Math.max(w, scanH) / 700));
      const xs = [], ys = [];
      for (let y = 0; y < scanH; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const bright = (r + g + b) / 3;
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const sat = Math.max(r, g, b) - Math.min(r, g, b);
          const edge = estimateLocalEdge(data, w, scanH, x, y, step);
          if (diff > 14 || bright < 244 || sat > 10 || edge > 8) {
            xs.push(x);
            ys.push(y);
          }
        }
      }
      if (xs.length < 24) return null;
      xs.sort((a,b)=>a-b);
      ys.sort((a,b)=>a-b);
      let left = xs[Math.floor(xs.length * 0.01)];
      let right = xs[Math.floor(xs.length * 0.99)];
      let top = ys[Math.floor(ys.length * 0.01)];
      let bottom = ys[Math.floor(ys.length * 0.99)];
      if (!(right > left && bottom > top)) return null;
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.22 || bh < scanH * 0.08) return null;
      const pad = Math.round(Math.max(bw, bh) * 0.045);
      left = clamp(left - pad, 0, w - 1);
      top = clamp(top - pad, 0, scanH - 1);
      right = clamp(right + pad, left + 1, w);
      bottom = clamp(bottom + pad, top + 1, scanH);
      return { x:left, y:top, w:right-left, h:bottom-top };
    }


    function trimCardBottomWhitespace(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return canvas;
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(1, Math.round(Math.max(w, h) / 850));
      let bottom = h - 1;
      for (let y = h - 1; y >= 0; y -= step) {
        let active = 0;
        let checked = 0;
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          checked++;
          if (bright < 244 || sat > 12 || edge > 8) active++;
        }
        if (checked && active / checked > 0.018) {
          bottom = Math.min(h, y + Math.round(step * 2));
          break;
        }
      }
      if (bottom < h - Math.max(8, h * 0.018)) {
        return cropCanvas(canvas, { x:0, y:0, w, h:Math.max(1, bottom) }, 0);
      }
      return canvas;
    }

    function makeCardEditSourceCanvas(sourceCanvas, cropBox) {
      let card = sourceCanvas;
      if (cropBox) {
        const pad = Math.round(Math.max(cropBox.w, cropBox.h) * 0.025);
        card = cropCanvas(sourceCanvas, cropBox, pad);
      }

      // 카드형 수정편집은 A4 흰 배경이 아니라 카드 원본만 보이도록 먼저 상단 영역에서 카드 부분을 강하게 찾습니다.
      if (card.height > card.width * 1.12) {
        const focusBox = findCardForegroundBox(card, 0.62);
        if (focusBox) card = cropCanvas(card, focusBox, 0);
      }

      // 예전 A4 배치본처럼 흰 여백이 넓은 이미지도 카드 부분만 다시 추립니다.
      const looseBox = findCardContentBBoxLoose(card) || findCardForegroundBox(card, 1);
      if (looseBox) card = cropCanvas(card, looseBox, 0);
      card = trimUniformMargins(card, 6);
      card = trimCardBottomWhitespace(card);
      const looseBox2 = findCardContentBBoxLoose(card) || findCardForegroundBox(card, 1);
      if (looseBox2) card = cropCanvas(card, looseBox2, 0);
      card = trimUniformMargins(card, 3);
      card = trimCardBottomWhitespace(card);
      return card;
    }

    function makeCardTopHalfScanCanvas(sourceCanvas, cropBox) {
      const card = makeCardEditSourceCanvas(sourceCanvas, cropBox);
      // v23.7.172: 카드형은 수정편집은 카드 원본 기준으로 하고, 미리보기/저장은 A4 상단 1/2 칸에 크게 맞춥니다.
      return makeA4TopHalfCanvas(card);
    }

    // 이전 버전 함수명을 호출하는 남은 코드가 있어도 같은 상단 1/2 결과가 나오도록 호환 유지.
    function makeCardQuarterScanCanvas(sourceCanvas, cropBox) {
      return makeCardTopHalfScanCanvas(sourceCanvas, cropBox);
    }


    function smartA4DocumentScan(canvas, usedCrop, docKey) {
      let current = canvas;
      let cropped = !!usedCrop;
      const isBusiness = !docKey || docKey === 'businessLicense';

      current = trimUniformMargins(current, 3);
      let pass1 = detectContentBBox(current);
      if (pass1) {
        current = cropCanvas(current, pass1, 8);
        cropped = true;
      }

      current = tightenCropToPaper(current);
      current = trimPaperBorder(current);
      current = trimUniformMargins(current, 4);

      let pass2 = detectContentBBox(current);
      if (pass2) {
        current = cropCanvas(current, pass2, 8);
        cropped = true;
      }

      if (!isBusiness) {
        const forced1 = guessCenteredPaperBBox(current);
        if (forced1) {
          current = cropCanvas(current, forced1, 12);
          cropped = true;
        }
        current = trimUniformMargins(current, 6);
        current = trimPaperBorder(current);
        const forced2 = detectContentBBox(current) || guessCenteredPaperBBox(current);
        if (forced2) {
          current = cropCanvas(current, forced2, 10);
          cropped = true;
        }
      } else if (!cropped) {
        const gentle = guessCenteredPaperBBox(current);
        if (gentle) {
          current = cropCanvas(current, gentle, 8);
          cropped = true;
        }
      }

      const strict = findStrictPaperBBox(current, isBusiness);
      if (strict) {
        current = cropCanvas(current, strict, isBusiness ? 4 : 2);
        cropped = true;
      }

      // v23.7.158: 종이를 강제로 하얗게 만드는 자동보정 제거.
      // 글자가 빛에 날아가지 않도록 원본 밝기/색상을 유지하고 여백만 정리합니다.
      current = trimUniformMargins(current, isBusiness ? 4 : 8);
      const strictAfter = findWhitePaperBBox(current);
      if (strictAfter) {
        current = cropCanvas(current, strictAfter, 0);
        cropped = true;
      }
      current = forceToA4Canvas(current);
      return { canvas: current, cropped };
    }

    function detectContentBBox(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 850));
      const xs = [], ys = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const isDoc = diff > 22 || edge > 16 || (bright > 180 && sat < 45);
          if (isDoc) { xs.push(x); ys.push(y); }
        }
      }
      if (xs.length < 80) return null;
      xs.sort((a,b)=>a-b); ys.sort((a,b)=>a-b);
      const left = xs[Math.floor(xs.length * 0.01)];
      const right = xs[Math.floor(xs.length * 0.99)];
      const top = ys[Math.floor(ys.length * 0.01)];
      const bottom = ys[Math.floor(ys.length * 0.99)];
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.35 || bh < h * 0.35) return null;
      return { x:left, y:top, w:bw, h:bh };
    }


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
