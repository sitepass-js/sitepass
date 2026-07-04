// SitePass v23.7.298 - app-camera-docs split continue (02/08)
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


