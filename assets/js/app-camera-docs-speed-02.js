// SitePass v23.7.329 - speed optimized medium chunk (app-camera-docs-speed 02/04)
// ---- merged from app-camera-docs-05.js ----
// SitePass v23.7.329 - app-camera-docs finer split (05/16)
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

    function getWorkerPersonAttachmentCount(card) {
      if (!card) return 0;
      let count = 0;
      card.querySelectorAll('[data-role="filename"]').forEach(box => {
        if (box.dataset.fileName) count++;
        try {
          const pages = JSON.parse(box.dataset.pagesJson || '[]');
          if (Array.isArray(pages)) count += pages.length;
        } catch (e) {}
      });
      return count;
    }

    function findReusableWorkerPersonCard(type) {
      const cards = Array.from(document.querySelectorAll('#workerPeopleList .worker-person-card'));
      return cards.find(card => {
        const cardType = card.dataset.workerType || 'normal';
        const firstDoc = card.querySelector('.doc-card[data-group-key="worker"]');
        const verified = firstDoc?.dataset.authVerified === 'true' || card.dataset.workerAuthPhone;
        const hasInputText = Array.from(card.querySelectorAll('[data-extra-phone-key], [data-extra-task-key]')).some(input => String(input.value || '').trim());
        return cardType === (type || 'normal') && !verified && !hasInputText && getWorkerPersonAttachmentCount(card) === 0;
      }) || cards.find(card => {
        const firstDoc = card.querySelector('.doc-card[data-group-key="worker"]');
        const verified = firstDoc?.dataset.authVerified === 'true' || card.dataset.workerAuthPhone;
        const hasInputText = Array.from(card.querySelectorAll('[data-extra-phone-key], [data-extra-task-key]')).some(input => String(input.value || '').trim());
        return !verified && !hasInputText && getWorkerPersonAttachmentCount(card) === 0;
      });
    }

    function applyWorkerAuthMetaToPersonCard(personCard, authMeta) {
      if (!personCard) return;
      personCard.dataset.workerAuthPhone = authMeta.authPhone || '';
      personCard.dataset.workerAuthName = authMeta.authPersonName || '';
      personCard.dataset.workerAuthVerifiedAt = authMeta.authVerifiedAt || '';
      personCard.querySelectorAll('.doc-card[data-group-key="worker"]').forEach(card => {
        card.dataset.authVerified = 'true';
        card.dataset.authVerifiedAt = authMeta.authVerifiedAt || new Date().toISOString();
        if (authMeta.authPhone) card.dataset.authPhone = authMeta.authPhone;
        if (authMeta.authPersonName) card.dataset.authPersonName = authMeta.authPersonName;
        if (typeof unlockPrivateDocUpload === 'function') unlockPrivateDocUpload(card);
      });
      const phoneInput = personCard.querySelector('[data-extra-phone-key="workerPhone"]');
      if (phoneInput && !phoneInput.value) phoneInput.value = authMeta.authPhone || '';
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
      const authMeta = {
        authVerified:true,
        authPhone:panel.dataset.pendingPhone || '',
        authPersonName:panel.dataset.pendingName || '',
        authVerifiedAt:panel.dataset.pendingVerifiedAt || new Date().toISOString()
      };
      let uid = 'w' + Date.now() + '_' + (++workerPersonSeq);
      // v23.7.329: 인증 후 위에 비어 있는 인부칸이 있는데도 아래에 인부가 하나 더 생기는 문제 보정.
      // 첨부파일이 없는 미인증 인부칸은 입력값 유무와 상관없이 현재 인증 인부칸으로 재사용합니다.
      const existingCards = Array.from(list.querySelectorAll('.worker-person-card'));
      const reusable = findReusableWorkerPersonCard(finalType) || existingCards.find(function(card) {
        const firstDoc = card.querySelector('.doc-card[data-group-key="worker"]');
        const verifiedCard = firstDoc?.dataset.authVerified === 'true' || card.dataset.workerAuthPhone;
        return !verifiedCard && getWorkerPersonAttachmentCount(card) === 0;
      });
      if (reusable) {
        uid = reusable.dataset.workerUid || uid;
        reusable.outerHTML = renderWorkerPersonCard(finalType, uid, authMeta);
      } else {
        list.insertAdjacentHTML('beforeend', renderWorkerPersonCard(finalType, uid, authMeta));
      }
      const personCard = list.querySelector('.worker-person-card[data-worker-uid="' + uid + '"]');
      applyWorkerAuthMetaToPersonCard(personCard, authMeta);
      attachDocInputHandlers(list);
      refreshWorkerPersonNumbers();
      renderBundleSummary();
      resetPersonAuth('worker');
      try { personCard?.scrollIntoView({ behavior:'smooth', block:'start' }); } catch (e) {}
      alert('인부 서류첨부창이 열렸습니다. 이 인부의 신분증과 기초안전보건교육 이수증을 첨부해주세요. 다음 인부가 있으면 위 인증칸에서 새로 동의/인증 후 추가하세요.');
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

// ---- merged from app-camera-docs-06.js ----
// SitePass v23.7.329 - app-camera-docs finer split (06/16)
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
        // v23.7.329: 브라우저 보안상 setTimeout/confirm 뒤 자동 fileInput.click()은
        // 사용자 직접 클릭으로 인정되지 않아 콘솔 오류가 납니다.
        // 추가 파일은 사용자가 같은 카드의 파일선택 버튼을 직접 누르도록 안내합니다.
        alert('추가 파일은 같은 서류 카드의 파일선택 버튼을 한 번 더 눌러 첨부해주세요.');
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
      return page.previewDataUrl || page.editDataUrl || page.correctedDataUrl || page.originalDataUrl || page.fileUrl || page.downloadUrl || page.storagePublicUrl || page.publicUrl || '';
    }

    function normalizeDocPageForPreview(page, index, doc) {
      const p = Object.assign({}, page || {});
      const fallbackPreview = getPrintablePreviewFromPage(p) || (index === 0 && doc ? (doc.previewDataUrl || doc.editDataUrl || doc.correctedDataUrl || doc.originalDataUrl || doc.fileUrl || doc.downloadUrl || doc.storagePublicUrl || doc.publicUrl || '') : '');
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
          previewDataUrl:doc.previewDataUrl || doc.fileUrl || doc.downloadUrl || doc.storagePublicUrl || doc.publicUrl || '',
          originalDataUrl:doc.originalDataUrl || '',
          correctedDataUrl:doc.correctedDataUrl || '',
          editDataUrl:doc.editDataUrl || doc.previewDataUrl || doc.fileUrl || doc.downloadUrl || doc.storagePublicUrl || doc.publicUrl || '',
          fileUrl:doc.fileUrl || doc.downloadUrl || doc.storagePublicUrl || doc.publicUrl || '',
          downloadUrl:doc.downloadUrl || doc.fileUrl || doc.storagePublicUrl || doc.publicUrl || '',
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
      return pages.some(page => !!getPrintablePreviewFromPage(page)) || !!(doc && (doc.previewDataUrl || doc.correctedDataUrl || doc.originalDataUrl || doc.fileUrl || doc.downloadUrl || doc.storagePublicUrl || doc.publicUrl));
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

// ---- merged from app-camera-docs-07.js ----
// SitePass v23.7.329 - app-camera-docs finer split (07/16)
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

// ---- merged from app-camera-docs-08.js ----
// SitePass v23.7.329 - app-camera-docs finer split (08/16)
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

