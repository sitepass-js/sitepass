// SitePass v23.7.298 - app-camera-docs split continue (03/08)
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
