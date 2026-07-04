// SitePass v23.7.299 - app-camera-docs split continue (01/08)
// SitePass v23.7.299 - app.bundle.js remaining split (02 camera/document scan)


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
