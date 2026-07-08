// SitePass v23.7.350 - speed optimized medium chunk (app-camera-docs-speed 01/04)
// ---- merged from app-camera-docs-01.js ----
// SitePass v23.7.350 - app-camera-docs finer split (01/16)
// SitePass v23.7.350 - app.bundle.js remaining split (02 camera/document scan)


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

// ---- merged from app-camera-docs-02.js ----
// SitePass v23.7.350 - app-camera-docs finer split (02/16)
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

// ---- merged from app-camera-docs-03.js ----
// SitePass v23.7.350 - app-camera-docs finer split (03/16)
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

// ---- merged from app-camera-docs-04.js ----
// SitePass v23.7.350 - app-camera-docs finer split (04/16)
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

