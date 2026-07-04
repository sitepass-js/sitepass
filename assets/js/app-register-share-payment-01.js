// SitePass v23.7.297 - app.bundle.js remaining split (03 register/share/payment)


    function getDisplayDocs(item) {
      const docs = item?.docs || {};
      const staticDocs = DOCS.map(def => docs[def.key]).filter(Boolean);
      const staticKeys = new Set(DOCS.map(def => def.key));
      const dynamicDocs = Object.values(docs).filter(doc => !staticKeys.has(doc.key)).sort((a, b) => {
        const ai = Number(a.workerIndex || 999);
        const bi = Number(b.workerIndex || 999);
        if (ai !== bi) return ai - bi;
        const order = { workerIdCard:1, workerSafetyTraining:2, workerSpecialHealthCheck:3, otherWorkerDoc:4 };
        return (order[a.docKind] || 99) - (order[b.docKind] || 99);
      });
      return staticDocs.concat(dynamicDocs);
    }

    function getBundleMeta() {
      const included = DOC_GROUPS.filter(group => isBundleGroupEnabled(group.key)).map(group => group.key);
      const workerPeople = isBundleGroupEnabled('worker') ? collectWorkerPeopleMeta() : [];
      const equipmentRegister = getEquipmentRegisterModule();
      if (equipmentRegister.buildBundleMeta) {
        return equipmentRegister.buildBundleMeta({
          docGroups:DOC_GROUPS,
          includedGroups:included,
          workerPeople
        });
      }
      const normalWorkerCount = workerPeople.filter(p => p.type !== 'special').length;
      const specialWorkerCount = workerPeople.filter(p => p.type === 'special').length;
      const includedGroupNames = DOC_GROUPS.filter(group => included.includes(group.key)).map(group => group.title);
      return {
        unit:'통합 서류함 1건',
        includedGroups: included,
        includedGroupNames,
        workerPeopleCount: workerPeople.length,
        normalWorkerCount,
        specialWorkerCount,
        workerPeople,
        paymentText:'실사용 베타 운영 중입니다'
      };
    }


    function getRegistrationDraft() {
      try {
        const raw = localStorage.getItem(REGISTRATION_DRAFT_KEY) || '';
        if (!raw) return null;
        const draft = JSON.parse(raw);
        return draft && typeof draft === 'object' ? draft : null;
      } catch (e) { return null; }
    }

    function hasRegistrationDraft() {
      return hasMeaningfulRegistrationDraftData(getRegistrationDraft());
    }

    function clearRegistrationDraft() {
      try { localStorage.removeItem(REGISTRATION_DRAFT_KEY); } catch (e) {}
      updateRegistrationDraftNotice();
    }

    function hasMeaningfulRegistrationDraftData(draft) {
      if (!draft) return false;
      if (String(draft.equipmentNo || '').trim()) return true;
      if (String(draft.equipmentName || '').trim()) return true;
      if (draft.includeDriver || draft.includeWorker) return true;
      const docs = draft.docs || {};
      return Object.values(docs).some(doc => {
        if (!doc) return false;
        return !!(doc.fileName || doc.expireDate || doc.driverPhone || doc.workerPhone || doc.personPhone || doc.workerTask || doc.authVerified || (Array.isArray(doc.pages) && doc.pages.length));
      });
    }

    function makeRegistrationDraftPayload() {
      const equipmentNoEl = document.getElementById('equipmentNo');
      const equipmentNameEl = document.getElementById('equipmentName');
      const includeDriver = document.getElementById('includeDriverDocs');
      const includeWorker = document.getElementById('includeWorkerDocs');
      const docs = collectDocData();
      const nowIso = new Date().toISOString();
      const existing = getRegistrationDraft();
      return {
        version:'v23.7.244',
        editingCode:editingCode || '',
        equipmentNo:(equipmentNoEl?.value || '').trim(),
        equipmentName:(equipmentNameEl?.value || '').trim(),
        includeDriver:!!includeDriver?.checked,
        includeWorker:!!includeWorker?.checked,
        docs,
        workerPeople:collectWorkerPeopleMeta(),
        savedAt:nowIso,
        createdAt:existing?.createdAt || nowIso
      };
    }

    function setRegistrationDraft(draft) {
      try {
        localStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify(draft));
        return true;
      } catch (error) {
        console.warn('등록중 자동저장 실패:', error);
        try {
          const light = JSON.parse(JSON.stringify(draft));
          Object.values(light.docs || {}).forEach(doc => {
            doc.pages = (Array.isArray(doc.pages) ? doc.pages : []).map(page => ({
              id:page.id || '',
              fileName:page.fileName || '',
              fileSource:page.fileSource || '',
              fileType:page.fileType || '',
              previewDataUrl:page.previewDataUrl || '',
              editDataUrl:page.editDataUrl || page.previewDataUrl || '',
              previewChoice:page.previewChoice || '',
              autoFit:page.autoFit || '',
              fitText:page.fitText || '',
              ratioText:page.ratioText || '',
              addedAt:page.addedAt || ''
            }));
            doc.originalDataUrl = '';
            doc.correctedDataUrl = '';
          });
          localStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify(light));
          return true;
        } catch (e) {
          console.warn('등록중 자동저장 경량 저장도 실패:', e);
          return false;
        }
      }
    }

    function updateRegistrationDraftNotice() {
      const note = document.getElementById('registrationDraftNotice');
      if (!note) return;
      const draft = getRegistrationDraft();
      const savedAt = draft?.savedAt ? formatDateTimeForDraft(draft.savedAt) : '';
      note.innerHTML = savedAt
        ? '작성 중 내용이 <b>자동저장됨</b> · ' + escapeHtml(savedAt) + '<br><span class="small">앱을 닫아도 다음 접속 때 “등록중인 장비가 있습니다” 안내창에서 이어서 작성할 수 있습니다.</span>'
        : '작성 중 화면을 나가도 자동저장됩니다. 다시 접속하면 <b>등록중인 장비가 있습니다</b> 안내가 뜨고, 확인은 이어서 등록 / 취소는 새로 시작입니다.';
    }

    function formatDateTimeForDraft(iso) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return mm + '/' + dd + ' ' + hh + ':' + mi;
    }

    function saveRegistrationDraftNow() {
      if (registrationDraftRestoreBusy) return;
      const register = document.getElementById('registerScreen');
      if (!register || register.classList.contains('hidden')) return;
      const draft = makeRegistrationDraftPayload();
      if (!hasMeaningfulRegistrationDraftData(draft)) {
        clearRegistrationDraft();
        return;
      }
      if (setRegistrationDraft(draft)) updateRegistrationDraftNotice();
    }

    function scheduleRegistrationDraftSave() {
      if (registrationDraftRestoreBusy) return;
      window.clearTimeout(registrationDraftSaveTimer);
      registrationDraftSaveTimer = window.setTimeout(saveRegistrationDraftNow, 550);
    }

    function setupRegistrationDraftAutoSave() {
      if (window.__sitePassRegistrationDraftAutoSave) return;
      window.__sitePassRegistrationDraftAutoSave = true;
      document.addEventListener('input', function(event) {
        if (event.target && event.target.closest && event.target.closest('#registerScreen')) scheduleRegistrationDraftSave();
      }, true);
      document.addEventListener('change', function(event) {
        if (event.target && event.target.closest && event.target.closest('#registerScreen')) scheduleRegistrationDraftSave();
      }, true);
      window.addEventListener('pagehide', saveRegistrationDraftNow);
      window.addEventListener('beforeunload', saveRegistrationDraftNow);
    }

    function restoreRegistrationDraft(draft) {
      draft = draft || getRegistrationDraft();
      if (!hasMeaningfulRegistrationDraftData(draft)) return false;
      registrationDraftRestoreBusy = true;
      try {
        editingCode = draft.editingCode || '';
        const includeDriver = document.getElementById('includeDriverDocs');
        const includeWorker = document.getElementById('includeWorkerDocs');
        if (includeDriver) includeDriver.checked = !!draft.includeDriver;
        if (includeWorker) includeWorker.checked = !!draft.includeWorker;
        renderDocCards();
        const no = document.getElementById('equipmentNo');
        const name = document.getElementById('equipmentName');
        if (no) no.value = draft.equipmentNo || '';
        if (name) name.value = draft.equipmentName || '';
        const itemLike = {
          docs:draft.docs || {},
          workerPeople:Array.isArray(draft.workerPeople) ? draft.workerPeople : [],
          bundleMeta:{ workerPeople:Array.isArray(draft.workerPeople) ? draft.workerPeople : [] }
        };
        if (includeWorker && includeWorker.checked) renderWorkerPeopleForEdit(itemLike);
        fillDocsForEdit(itemLike);
        renderAlertPreview();
        renderBundleSummary();
        updateRegisterModeUi();
        updateRegistrationDraftNotice();
        showScreen('registerScreen');
        setTimeout(function(){
          const target = document.getElementById('equipmentNo') || document.getElementById('documentSection');
          try { target?.scrollIntoView({ behavior:'smooth', block:'start' }); } catch(e) {}
        }, 120);
        return true;
      } finally {
        setTimeout(function(){ registrationDraftRestoreBusy = false; }, 80);
      }
    }

    function promptRegistrationDraftIfNeeded(reason) {
      if (registrationDraftPromptOpen) return false;
      if (isSitePassHashRouteActive()) return false;
      if (!isMemberLoggedIn() && !isAdminLoggedIn()) return false;
      const pendingPay = getPendingRegistration();
      if (pendingPay && pendingPay.item) {
        const activePending = Array.from(document.querySelectorAll('.screen:not(.hidden)')).map(el => el.id)[0] || '';
        if (activePending !== 'pricingScreen' && activePending !== 'detailScreen' && activePending !== 'publicScreen' && activePending !== 'managerPrintScreen') {
          registrationDraftPromptOpen = true;
          const label = pendingPay.item.equipmentNo || pendingPay.item.equipmentName || '결제 대기 중인 장비';
          const tier = getPendingRegistrationTierText(pendingPay);
          const message = '결제 대기 중인 장비등록이 있습니다.\n\n' + label + '\n' + tier + '\n\n확인: 결제화면으로 이동\n취소: 결제대기 삭제하고 새로 시작';
          setTimeout(function(){
            try {
              if (!isMemberLoggedIn() && !isAdminLoggedIn()) return;
              if (confirm(message)) openPendingRegistrationPaymentScreen(pendingPay);
              else { clearPendingRegistration(); clearRegistrationDraft(); resetForm(false); }
            } finally { registrationDraftPromptOpen = false; }
          }, reason === 'login' ? 250 : 450);
          return true;
        }
      }
      if (!hasRegistrationDraft()) return false;
      const active = Array.from(document.querySelectorAll('.screen:not(.hidden)')).map(el => el.id)[0] || '';
      if (active === 'registerScreen' || active === 'pricingScreen' || active === 'detailScreen' || active === 'publicScreen' || active === 'managerPrintScreen') return false;
      registrationDraftPromptOpen = true;
      const draft = getRegistrationDraft();
      const label = draft?.equipmentNo || draft?.equipmentName || '작성 중인 장비';
      const message = '등록중인 장비가 있습니다.\n\n' + label + '\n\n확인: 이어서 등록\n취소: 임시저장 삭제하고 새로 시작';
      setTimeout(function(){
        try {
          if (!isMemberLoggedIn() && !isAdminLoggedIn()) return;
          if (confirm(message)) {
            restoreRegistrationDraft(draft);
          } else {
            clearRegistrationDraft();
            resetForm(false);
            editingCode = '';
            updateRegisterModeUi();
          }
        } finally {
          registrationDraftPromptOpen = false;
        }
      }, reason === 'login' ? 250 : 450);
      return true;
    }

    function startNewRegistration() {
      const pendingPay = getPendingRegistration();
      if (pendingPay && pendingPay.item) {
        const label = pendingPay.item.equipmentNo || pendingPay.item.equipmentName || '결제 대기 중인 장비';
        if (confirm('결제 대기 중인 장비등록이 있습니다.\n\n' + label + '\n' + getPendingRegistrationTierText(pendingPay) + '\n\n확인: 결제화면으로 이동\n취소: 결제대기 삭제하고 새 등록 시작')) {
          openPendingRegistrationPaymentScreen(pendingPay);
          return;
        }
        clearPendingRegistration();
        clearRegistrationDraft();
      }
      const draft = getRegistrationDraft();
      if (hasMeaningfulRegistrationDraftData(draft)) {
        const label = draft.equipmentNo || draft.equipmentName || '작성 중인 장비';
        if (confirm('등록중인 장비가 있습니다.\n\n' + label + '\n\n확인: 이어서 등록\n취소: 임시저장 삭제하고 새 등록 시작')) {
          restoreRegistrationDraft(draft);
          return;
        }
        clearRegistrationDraft();
      }
      editingCode = '';
      resetForm(false);
      updateRegisterModeUi();
      showScreen('registerScreen');
    }

    function updateRegisterModeUi() {
      const banner = document.getElementById('editModeBanner');
      const saveButton = document.getElementById('saveBundleButton');
      const noInput = document.getElementById('equipmentNo');
      if (banner) {
        banner.classList.toggle('hidden', !editingCode);
        if (editingCode) banner.innerHTML = '기존 통합 서류함 수정/갱신 중입니다. 장비는 그대로 두고 기사 교체, 보험증·검사증 날짜 갱신, 제원표·비파괴·특수건강검진 파일 교체가 가능합니다. <button type="button" class="mini-button" onclick="cancelEditMode()">수정취소</button>';
      }
      if (saveButton) saveButton.textContent = editingCode ? '수정내용 저장' : (hasRegisteredEquipmentBundle() ? '추가등록 결제창으로 이동' : '첫장비 등록/결제');
      if (noInput) noInput.readOnly = !!editingCode;
    }

    function cancelEditMode() {
      if (editingCode && !confirm('수정 중인 내용을 취소하고 처음 등록 화면으로 돌아갈까요?')) return;
      editingCode = '';
      resetForm(false);
      updateRegisterModeUi();
      showScreen('registerScreen');
    }

    function startEditEquipmentFromCurrent() {
      if (!currentDetailLink) return;
      const code = decodeURIComponent((currentDetailLink.split('#qr=')[1] || '').trim());
      if (code) startEditEquipment(code);
    }

    function startEditEquipment(code) {
      const item = getItemByCode(code);
      if (!item) { alert('수정할 통합 서류함을 찾을 수 없습니다.'); return; }
      editingCode = code;
      const includeDriver = document.getElementById('includeDriverDocs');
      const includeWorker = document.getElementById('includeWorkerDocs');
      const included = item?.bundleMeta?.includedGroups || [];
      const docs = item.docs || {};
      const hasDriverDocs = Object.values(docs).some(doc => doc.groupKey === 'driver' && doc.fileName);
      const hasWorkerDocs = Object.values(docs).some(doc => doc.groupKey === 'worker' && doc.fileName);
      if (includeDriver) includeDriver.checked = included.includes('driver') || hasDriverDocs;
      if (includeWorker) includeWorker.checked = included.includes('worker') || hasWorkerDocs;
      renderDocCards();
      document.getElementById('equipmentNo').value = item.equipmentNo || '';
      document.getElementById('equipmentName').value = item.equipmentName || '';
      if (includeWorker && includeWorker.checked) renderWorkerPeopleForEdit(item);
      fillDocsForEdit(item);
      renderAlertPreview();
      renderBundleSummary();
      updateRegisterModeUi();
      showScreen('registerScreen');
    }

    function renderWorkerPeopleForEdit(item) {
      const list = document.getElementById('workerPeopleList');
      if (!list) return;
      list.innerHTML = '';
      let people = Array.isArray(item.workerPeople) && item.workerPeople.length ? item.workerPeople : (item?.bundleMeta?.workerPeople || []);
      if (!people.length) {
        const workerDocs = Object.values(item.docs || {}).filter(doc => doc.groupKey === 'worker');
        const byUid = {};
        workerDocs.forEach(doc => {
          const uid = doc.workerUid || String(doc.key || '').split('_').slice(1).join('_') || ('legacy_' + Object.keys(byUid).length);
          if (!byUid[uid]) byUid[uid] = { uid, type:doc.workerType || 'normal' };
          if (doc.workerPhone) byUid[uid].phone = doc.workerPhone;
          if (doc.workerTask) byUid[uid].task = doc.workerTask;
        });
        people = Object.values(byUid);
      }
      if (!people.length) people = [{ uid:'w' + Date.now() + '_1', type:'normal' }];
      people.forEach(person => {
        const uid = person.uid || ('w' + Date.now() + '_' + (++workerPersonSeq));
        list.insertAdjacentHTML('beforeend', renderWorkerPersonCard(person.type || 'normal', uid));
      });
      attachDocInputHandlers(list);
      refreshWorkerPersonNumbers();
    }

    function fillDocsForEdit(item) {
      const docs = item.docs || {};
      Object.values(docs).forEach(doc => {
        const card = findDocCardByKey(doc.key);
        if (!card) return;
        const pages = getDocPagesFromDoc(doc);
        setDocPagesToCard(card, pages);
        const dateInput = card.querySelector('[data-date-key]');
        if (dateInput) setCleanDateValue(dateInput, doc.expireDate || '');
        const driverPhone = card.querySelector('[data-extra-key="driverPhone"]');
        if (driverPhone) driverPhone.value = doc.driverPhone || doc.personPhone || '';
        const phoneInput = card.querySelector('[data-extra-phone-key]');
        if (phoneInput) phoneInput.value = doc.workerPhone || doc.personPhone || doc.driverPhone || '';
        const taskInput = card.querySelector('[data-extra-task-key]');
        if (taskInput) taskInput.value = doc.workerTask || '';
        const authPhoneInput = card.querySelector('[data-auth-phone-input]');
        if (authPhoneInput) authPhoneInput.value = doc.authPhone || doc.personPhone || doc.workerPhone || doc.driverPhone || '';
        if (doc.authVerified) {
          card.dataset.authVerified = 'true';
          card.dataset.authVerifiedAt = doc.authVerifiedAt || new Date().toISOString();
          card.dataset.authPhone = doc.authPhone || doc.personPhone || doc.workerPhone || doc.driverPhone || '';
          card.dataset.authPersonName = doc.authPersonName || '';
          card.dataset.authBirth6 = doc.authBirth6 || '';
          card.dataset.authGenderDigit = doc.authGenderDigit || '';
          card.dataset.authCarrier = doc.authCarrier || '';
          unlockPrivateDocUpload(card);
        }
      });
    }

    function clearDocPages(docKey) {
      const card = findDocCardByKey(docKey);
      if (!card) return;
      const pages = getDocPagesFromCard(card);
      if (pages.length && !confirm('이 서류에 첨부된 ' + pages.length + '장을 모두 비울까요?')) return;
      setDocPagesToCard(card, []);
    }

    function renderUpdatePanel(item) {
      if (!item) return '';
      return '<div class="update-panel"><b>서류 수정/갱신</b><span>장비번호와 QR코드는 그대로 유지하면서 기사서류 교체, 보험증권/검사증 만료일 갱신, 제원표·비파괴·특수건강검진 파일 교체/삭제가 가능합니다. 저장하면 같은 QR 조회화면에 바로 반영됩니다.</span><div class="update-actions"><button type="button" class="primary" onclick="startEditEquipment(\'' + escapeJs(item.code) + '\')">수정/갱신하기</button><button type="button" class="ghost" onclick="openQrPublicView(\'' + escapeJs(item.code) + '\')">수정 후 QR 확인</button></div></div>';
    }

    function buildUpdateSummary(oldItem, newItem) {
      const changes = [];
      if (!oldItem) return ['신규 등록'];
      if ((oldItem.equipmentName || '') !== (newItem.equipmentName || '')) changes.push('장비명 수정');
      const oldDocs = oldItem.docs || {};
      const newDocs = newItem.docs || {};
      Object.values(newDocs).forEach(doc => {
        const oldDoc = oldDocs[doc.key] || {};
        const oldPageCount = getDocPagesFromDoc(oldDoc).length;
        const newPageCount = getDocPagesFromDoc(doc).length;
        if (oldPageCount !== newPageCount || (oldDoc.fileName || '') !== (doc.fileName || '')) changes.push(doc.title + ' 첨부 갱신');
        if ((oldDoc.expireDate || '') !== (doc.expireDate || '') && doc.expiry) changes.push(doc.title + ' 날짜 갱신');
        if ((oldDoc.driverPhone || oldDoc.workerPhone || oldDoc.personPhone || '') !== (doc.driverPhone || doc.workerPhone || doc.personPhone || '')) changes.push(doc.title + ' 연락처 수정');
        if ((oldDoc.workerTask || '') !== (doc.workerTask || '')) changes.push(doc.title + ' 작업내용 수정');
      });
      return changes.length ? changes : ['수정 저장'];
    }

    function clearValidationFocusHighlights() {
      document.querySelectorAll('.validation-focus-highlight').forEach(el => {
        el.classList.remove('validation-focus-highlight');
      });
    }

    function getValidationFocusWrap(target) {
      if (!target) return null;
      return target.closest('.field, .doc-card, .date-field, .clean-date-picker') || target;
    }

    function focusAndScrollToMissingTarget(target) {
      if (!target) return false;
      clearValidationFocusHighlights();
      const wrap = getValidationFocusWrap(target) || target;
      try { wrap.classList.add('validation-focus-highlight'); } catch(e) {}
      try { target.classList.add('validation-focus-highlight'); } catch(e) {}
      try {
        wrap.scrollIntoView({ behavior:'smooth', block:'center', inline:'nearest' });
      } catch(e) {
        try { wrap.scrollIntoView(true); } catch(_) {}
      }
      setTimeout(function(){
        try { target.focus({ preventScroll:true }); } catch(e) { try { target.focus(); } catch(_) {} }
      }, 380);
      return true;
    }

    function focusDocMissingField(def, kind) {
      if (!def) return false;
      const card = findDocCardByKey(def.key);
      if (!card) return false;
      let target = card;
      if (kind === 'date') {
        target = card.querySelector('[data-date-key]') || card.querySelector('[data-clean-date-display]') || card;
      }
      return focusAndScrollToMissingTarget(target);
    }

    function focusFirstMissingRequiredItem(activeDefs, docs, workerValidation) {
      const firstMissingFileDef = activeDefs.find(def => def.required && !(docs[def.key] && docs[def.key].fileName));
      if (firstMissingFileDef && focusDocMissingField(firstMissingFileDef, 'file')) return true;

      const firstMissingRequiredDateDef = activeDefs.find(def => def.required && def.expiry && !(docs[def.key] && docs[def.key].expireDate));
      if (firstMissingRequiredDateDef && focusDocMissingField(firstMissingRequiredDateDef, 'date')) return true;

      const firstMissingOptionalDateDef = activeDefs.find(def => {
        const doc = docs[def.key];
        return def.optionalExpiry && doc && doc.fileName && !doc.expireDate;
      });
      if (firstMissingOptionalDateDef && focusDocMissingField(firstMissingOptionalDateDef, 'date')) return true;

      const firstWorkerMissingKey = Array.isArray(workerValidation?.missingKeys) ? workerValidation.missingKeys[0] : '';
      if (firstWorkerMissingKey) {
        const workerCard = findDocCardByKey(firstWorkerMissingKey);
        if (workerCard) return focusAndScrollToMissingTarget(workerCard);
      }
      return false;
    }

    function docHasPrivateEditChange(oldDoc, newDoc) {
      const oldPages = getDocPagesFromDoc(oldDoc || []);
      const newPages = getDocPagesFromDoc(newDoc || []);
      return oldPages.length !== newPages.length ||
        (oldDoc?.fileName || '') !== (newDoc?.fileName || '') ||
        (oldDoc?.expireDate || '') !== (newDoc?.expireDate || '') ||
        (oldDoc?.driverPhone || oldDoc?.workerPhone || oldDoc?.personPhone || '') !== (newDoc?.driverPhone || newDoc?.workerPhone || newDoc?.personPhone || '') ||
        (oldDoc?.workerTask || '') !== (newDoc?.workerTask || '');
    }

    function collectChangedPrivateEditTargets(oldItem, newItem) {
      if (!oldItem || !newItem) return [];
      const oldDocs = oldItem.docs || {};
      const targets = [];
      Object.values(newItem.docs || {}).forEach(doc => {
        if (!doc || (doc.groupKey !== 'driver' && doc.groupKey !== 'worker')) return;
        const oldDoc = oldDocs[doc.key] || {};
        if (!docHasPrivateEditChange(oldDoc, doc)) return;
        const kind = doc.groupKey;
        const phone = doc.authPhone || doc.personPhone || doc.driverPhone || doc.workerPhone || '';
        const name = doc.authPersonName || (kind === 'driver' ? '기사' : (doc.workerLabel || '인부'));
        const id = kind + '|' + (doc.workerUid || '') + '|' + normalizePhoneDigits(phone || '') + '|' + name;
        if (!targets.some(t => t.id === id)) targets.push({ id, kind, name, phone, docTitle:doc.title || '', carrier:doc.authCarrier || '', birth6:doc.authBirth6 || '', genderDigit:doc.authGenderDigit || '' });
      });
      return targets;
    }

    function requirePrivateEditReverification(oldItem, newItem) {
      const targets = collectChangedPrivateEditTargets(oldItem, newItem);
      if (!targets.length) return true;
      alert('기사/인부 서류 또는 연락처가 수정되었습니다.\n기사·인부는 수시로 바뀔 수 있으므로 저장 전에 본인확인을 한 번 더 진행합니다.\n\n현재 테스트 인증번호는 123456입니다.');
      for (const target of targets) {
        const label = target.kind === 'driver' ? '기사' : '인부';
        const expectedPhone = normalizePhoneDigits(target.phone || '');
        const carrier = prompt(label + ' 수정/갱신 본인확인\n\n통신사를 입력해주세요.\n예: SKT / KT / LG U+ / SKT 알뜰폰 / KT 알뜰폰 / LG U+ 알뜰폰', target.carrier || '');
        if (carrier === null) return false;
        const name = prompt(label + ' 이름을 입력해주세요.', target.name || '');
        if (name === null) return false;
        const juminInput = prompt(label + ' 주민번호를 입력해주세요.\n예: 840507-1', target.birth6 && target.genderDigit ? target.birth6 + '-' + target.genderDigit + '******' : '');
        if (juminInput === null) return false;
        const parsedJumin = parseMaskedJuminText(juminInput, target.birth6 || '', target.genderDigit || '');
        const birth6 = parsedJumin.birth6;
        const genderDigit = parsedJumin.genderDigit;
        const phone = prompt(label + ' 휴대폰번호를 입력해주세요.\n등록된 연락처와 일치해야 합니다.', target.phone || '');
        if (phone === null) return false;
        if (!carrier.trim() || !name.trim() || !/^\d{6}$/.test(String(birth6).trim()) || !/^[1-8]$/.test(String(genderDigit).trim())) {
          alert(label + ' 통신사, 이름, 주민번호, 휴대폰번호를 정확히 입력해주세요.');
          return false;
        }
        if (expectedPhone && normalizePhoneDigits(phone) !== expectedPhone) {
          alert(label + ' 휴대폰번호가 등록된 번호와 일치하지 않습니다.\n등록된 번호: ' + target.phone);
          return false;
        }
        const code = prompt(label + ' 휴대폰으로 받은 인증번호 6자리를 입력해주세요.\n현재 테스트 인증번호는 123456입니다.');
        if (code === null) return false;
        if (String(code).trim() !== '123456') {
          alert('인증번호가 맞지 않습니다. 현재 테스트 인증번호는 123456입니다.');
          return false;
        }
      }
      alert('기사/인부 수정·갱신 본인확인이 완료되었습니다.');
      return true;
    }

    // v23.7.281 - 결제 본인확인 화면형 UI 보정
    function getPaymentOwnerMethod() {
      const active = document.querySelector('[data-payment-owner-method].active');
      return active?.dataset.paymentOwnerMethod || 'card';
    }

    function setPaymentOwnerMethod(method) {
      method = String(method || 'card');
      document.querySelectorAll('[data-payment-owner-method]').forEach(btn => {
        const active = btn.dataset.paymentOwnerMethod === method;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      const ownerBox = document.getElementById('paymentOwnerCommonBox');
      const cardBox = document.getElementById('paymentOwnerCardBox');
      const phoneBox = document.getElementById('paymentOwnerPhoneBox');
      const accountBox = document.getElementById('paymentOwnerAccountBox');
      if (ownerBox) ownerBox.classList.toggle('hidden', method === 'account');
      if (cardBox) cardBox.classList.toggle('hidden', method !== 'card');
      if (phoneBox) phoneBox.classList.toggle('hidden', method !== 'phone');
      if (accountBox) accountBox.classList.toggle('hidden', method !== 'account');
      const title = document.getElementById('paymentOwnerMethodTitle');
      if (title) title.textContent = method === 'phone' ? '휴대폰결제 본인확인' : (method === 'account' ? '계좌이체 확인' : '카드결제 정보 입력');
      const status = document.getElementById('paymentOwnerVerifyStatus');
      if (status) {
        status.textContent = method === 'card'
          ? '카드사를 선택하고 카드번호/유효기간을 입력하세요. 현재는 실제 승인 없는 테스트 결제입니다.'
          : (method === 'phone'
              ? '통신사를 선택하고 휴대폰 본인확인 인증번호 123456을 입력하세요.'
              : '계좌이체는 현재 테스트 확인번호 1234로 임시 처리합니다.');
        status.classList.remove('ok', 'warn');
      }
    }

    function normalizeCardDigits(value) {
      return String(value || '').replace(/[^0-9]/g, '').slice(0, 19);
    }

    function formatPaymentCardNumberInput(input) {
      if (!input) input = document.getElementById('paymentCardNumber');
      if (!input) return;
      const digits = normalizeCardDigits(input.value);
      input.value = digits.replace(/(.{4})/g, '$1 ').trim();
    }

    function limitPaymentCardExpiryInput(input) {
      if (!input) input = document.getElementById('paymentCardExpiry');
      if (!input) return;
      const digits = String(input.value || '').replace(/[^0-9]/g, '').slice(0, 4);
      input.value = digits.length > 2 ? digits.slice(0,2) + '/' + digits.slice(2) : digits;
    }

    function getPaymentCardValues() {
      return {
        company: (document.getElementById('paymentCardCompany')?.value || '').trim(),
        numberDigits: normalizeCardDigits(document.getElementById('paymentCardNumber')?.value || ''),
        expiry: (document.getElementById('paymentCardExpiry')?.value || '').trim(),
        password2: (document.getElementById('paymentCardPassword2')?.value || '').replace(/[^0-9]/g, '').slice(0,2)
      };
    }

    function limitPaymentOwnerJuminInput() {
      const input = document.getElementById('paymentOwnerJuminMasked');
      limitJuminInputToBirthAndGender(input);
    }

    function formatPaymentOwnerJuminDisplay() {
      const input = document.getElementById('paymentOwnerJuminMasked');
      if (!input) return;
      const parsed = parseMaskedJuminText(input.value, '', '');
      if (/^\d{6}$/.test(parsed.birth6) && /^[1-8]$/.test(parsed.genderDigit)) input.value = parsed.birth6 + '-' + parsed.genderDigit + '******';
    }

    function getPaymentOwnerVerificationValues() {
      const method = getPaymentOwnerMethod();
      const member = getCurrentMemberTest() || {};
      const jumin = parseMaskedJuminText(document.getElementById('paymentOwnerJuminMasked')?.value || '', member.birth6 || '', member.genderDigit || '');
      const card = getPaymentCardValues();
      return {
        method,
        name: (document.getElementById('paymentOwnerName')?.value || member.name || '').trim(),
        birth6: jumin.birth6,
        genderDigit: jumin.genderDigit,
        juminMasked: jumin.masked,
        cardCompany: card.company,
        cardNumberDigits: card.numberDigits,
        cardExpiry: card.expiry,
        cardPassword2: card.password2,
        carrier: (document.getElementById('paymentOwnerCarrier')?.value || '').trim(),
        phone: (document.getElementById('paymentOwnerPhone')?.value || member.phone || '').trim(),
        code: (document.getElementById('paymentOwnerCode')?.value || '').trim(),
        accountCode: (document.getElementById('paymentOwnerAccountCode')?.value || '').trim()
      };
    }

    function setPaymentOwnerStatus(text, mode) {
      const box = document.getElementById('paymentOwnerVerifyStatus');
      if (!box) return;
      box.textContent = text || '';
      box.classList.toggle('ok', mode === 'ok');
      box.classList.toggle('warn', mode === 'warn');
    }

