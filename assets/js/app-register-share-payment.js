// SitePass v23.7.292 - app.bundle.js remaining split (03 register/share/payment)


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

    function requirePaymentOwnerVerification(actionLabel) {
      const member = getCurrentMemberTest() || {};
      const label = actionLabel || '결제';
      const values = getPaymentOwnerVerificationValues();
      if (!document.getElementById('paymentOwnerVerifyBox')) {
        alert('결제 본인확인 화면을 불러오지 못했습니다. 새로고침 후 다시 진행해주세요.');
        return false;
      }
      if (values.method === 'account') {
        if (values.accountCode !== '1234') {
          setPaymentOwnerStatus('계좌이체 테스트 확인번호 1234를 입력해주세요.', 'warn');
          document.getElementById('paymentOwnerAccountCode')?.focus();
          return false;
        }
        setPaymentOwnerStatus('계좌이체 확인이 완료되었습니다. 정식 서비스에서는 PG/은행 인증 결과를 저장합니다.', 'ok');
        return true;
      }
      if (!values.name) { setPaymentOwnerStatus('이름을 입력해주세요.', 'warn'); document.getElementById('paymentOwnerName')?.focus(); return false; }
      if (!/^\d{6}$/.test(String(values.birth6 || '')) || !/^[1-8]$/.test(String(values.genderDigit || ''))) {
        setPaymentOwnerStatus('주민번호는 840507-1까지만 입력해주세요. 저장/표시는 840507-1******로 처리됩니다.', 'warn');
        document.getElementById('paymentOwnerJuminMasked')?.focus();
        return false;
      }
      if (values.method === 'card') {
        if (!values.cardCompany) { setPaymentOwnerStatus('카드사를 선택해주세요.', 'warn'); document.getElementById('paymentCardCompany')?.focus(); return false; }
        if (!/^\d{13,19}$/.test(values.cardNumberDigits || '')) { setPaymentOwnerStatus('카드번호를 정확히 입력해주세요. 테스트는 숫자 13~19자리로 확인합니다.', 'warn'); document.getElementById('paymentCardNumber')?.focus(); return false; }
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(values.cardExpiry || '')) { setPaymentOwnerStatus('카드 유효기간을 MM/YY 형식으로 입력해주세요.', 'warn'); document.getElementById('paymentCardExpiry')?.focus(); return false; }
        if (!/^\d{2}$/.test(values.cardPassword2 || '')) { setPaymentOwnerStatus('카드 비밀번호 앞 2자리를 입력해주세요. 현재는 실제 승인 없는 테스트입니다.', 'warn'); document.getElementById('paymentCardPassword2')?.focus(); return false; }
        setPaymentOwnerStatus(label + ' 카드결제 테스트 확인이 완료되었습니다. 실제 카드승인은 아직 연결하지 않았고, 결제완료 상태만 저장합니다.', 'ok');
        return true;
      }
      if (!values.carrier) { setPaymentOwnerStatus('통신사를 선택해주세요.', 'warn'); document.getElementById('paymentOwnerCarrier')?.focus(); return false; }
      if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(String(values.phone || ''))) {
        setPaymentOwnerStatus('휴대폰번호를 정확히 입력해주세요.', 'warn');
        document.getElementById('paymentOwnerPhone')?.focus();
        return false;
      }
      if (values.method === 'phone' && member.phone && normalizePhoneDigits(values.phone) !== normalizePhoneDigits(member.phone)) {
        setPaymentOwnerStatus('휴대폰결제는 가입자 본인 휴대폰번호와 일치해야 합니다. 가입 휴대폰번호: ' + member.phone, 'warn');
        document.getElementById('paymentOwnerPhone')?.focus();
        return false;
      }
      if (values.code !== '123456') { setPaymentOwnerStatus('본인확인 인증번호 123456을 입력해주세요.', 'warn'); document.getElementById('paymentOwnerCode')?.focus(); return false; }
      setPaymentOwnerStatus(label + ' 휴대폰결제 본인확인이 완료되었습니다. 정식 서비스에서는 통신사/결제대행사 결과값을 서버에 저장합니다.', 'ok');
      return true;
    }


    // v23.7.282: inline onclick 안전 연결
    window.setPaymentOwnerMethod = setPaymentOwnerMethod;
    window.limitPaymentOwnerJuminInput = limitPaymentOwnerJuminInput;
    window.formatPaymentOwnerJuminDisplay = formatPaymentOwnerJuminDisplay;
    window.formatPaymentCardNumberInput = formatPaymentCardNumberInput;
    window.limitPaymentCardExpiryInput = limitPaymentCardExpiryInput;

    async function saveEquipment() {
      const equipmentRegister = getEquipmentRegisterModule();
      const basicFields = equipmentRegister.collectBasicFields ? equipmentRegister.collectBasicFields(document) : null;
      const equipmentNoEl = document.getElementById('equipmentNo');
      const equipmentNameEl = document.getElementById('equipmentName');
      const equipmentNo = (basicFields?.equipmentNo || equipmentNoEl?.value || '').trim();
      const equipmentName = (basicFields?.equipmentName || equipmentNameEl?.value || '').trim();
      const basicValidation = equipmentRegister.validateBasicFields ? equipmentRegister.validateBasicFields({ equipmentNo, equipmentName }) : null;
      if (basicValidation && !basicValidation.ok) {
        alert(basicValidation.message || '장비 기본정보를 확인해주세요.');
        const target = basicValidation.focusId ? document.getElementById(basicValidation.focusId) : (equipmentNo ? equipmentNameEl : equipmentNoEl);
        focusAndScrollToMissingTarget(target);
        return;
      }
      if (!equipmentNo) { alert('장비 등록번호를 입력해주세요.'); focusAndScrollToMissingTarget(equipmentNoEl); return; }
      if (!equipmentName) { alert('장비명을 입력해주세요.'); focusAndScrollToMissingTarget(equipmentNameEl); return; }

      const docs = collectDocData();
      const activeDefs = getActiveDocDefs();
      const workerValidation = validateWorkerPeople(docs);
      const docValidation = equipmentRegister.validateRegistrationDocuments
        ? equipmentRegister.validateRegistrationDocuments(activeDefs, docs, workerValidation)
        : null;
      const missingFiles = docValidation ? docValidation.missingFiles : activeDefs.filter(def => def.required && !(docs[def.key] && docs[def.key].fileName)).map(def => def.groupTitle + ' - ' + def.title);
      const missingDates = docValidation ? docValidation.missingDates : activeDefs.filter(def => def.required && def.expiry && !(docs[def.key] && docs[def.key].expireDate)).map(def => def.groupTitle + ' - ' + def.title + ' 날짜');
      if (!docValidation) {
        activeDefs.filter(def => def.optionalExpiry).forEach(def => {
          const doc = docs[def.key];
          if (doc && doc.fileName && !doc.expireDate) {
            missingDates.push(def.groupTitle + ' - ' + def.title + ' 날짜');
          }
        });
        missingFiles.push(...workerValidation.missingFiles);
      }
      const missingAuth = Object.values(docs).filter(doc => doc.groupKey !== 'equipment' && doc.fileName && !doc.authVerified).map(doc => (doc.groupTitle || '개인정보서류') + ' - ' + doc.title);
      if (missingAuth.length) {
        alert(`인증 미완료 서류가 있습니다.

${missingAuth.join(String.fromCharCode(10))}`);
        const firstAuthDoc = Object.values(docs).find(doc => doc.groupKey !== 'equipment' && doc.fileName && !doc.authVerified);
        if (firstAuthDoc) focusDocMissingField(firstAuthDoc, 'file');
        return;
      }

      if (missingFiles.length || missingDates.length) {
        alert(`필수 항목을 확인해주세요.

미첨부 서류:
${missingFiles.join(String.fromCharCode(10)) || '없음'}

미입력 날짜:
${missingDates.join(String.fromCharCode(10)) || '없음'}

확인을 누르면 첫 번째 미입력 위치로 자동 이동합니다.`);
        focusFirstMissingRequiredItem(activeDefs, docs, workerValidation);
        return;
      }

      const items = getItems();
      const currentMember = getEquipmentRegistrationOwnerMember();
      const editIndex = editingCode ? items.findIndex(x => x.code === editingCode) : -1;
      const oldItem = editIndex >= 0 ? items[editIndex] : null;
      const isNewRegistration = !oldItem;
      // v23.7.288: 결제대기/고아장비/탈퇴장비를 기존 장비로 세면 첫 장비도 추가결제로 오판됩니다.
      // 추가결제 여부는 현재 회원의 활성 결제완료 장비만 기준으로 판단합니다.
      const isAdditionalRegistration = isNewRegistration && getActivePaidRegistrationItemsForCurrentOwner(currentMember, '').length > 0;
      const selectedPlan = getPlanInfo(localStorage.getItem(SELECTED_PAYMENT_PLAN_KEY) || 'monthly', { additional: isAdditionalRegistration });
      const bundleMeta = getBundleMeta();
      const code = oldItem ? oldItem.code : makeBundleCode(equipmentNo);
      if (isNewRegistration && items.some(x => String(x.code || '') === String(code || ''))) {
        alert(`이미 같은 장비 등록번호로 만든 서류함이 있습니다.
보관함에서 기존 장비를 확인하거나 다른 장비번호로 등록해주세요.`);
        return;
      }
      const qrLink = oldItem ? (oldItem.qrLink || makeQrLink(code)) : makeQrLink(code);
      const nowIso = new Date().toISOString();
      const item = equipmentRegister.buildRegistrationItem
        ? equipmentRegister.buildRegistrationItem({
            oldItem,
            code,
            equipmentNo,
            equipmentName,
            bundleMeta,
            qrLink,
            docs,
            currentMember,
            selectedPlan,
            nowIso,
            isAdditionalRegistration
          })
        : {
            ...(oldItem || {}),
            code,
            type:'BUNDLE',
            equipmentNo,
            equipmentName,
            bundleMeta,
            workerPeople:bundleMeta.workerPeople,
            qrLink,
            docs,
            createdAt: oldItem?.createdAt || nowIso,
            updatedAt: nowIso,
            ownerMemberId: oldItem?.ownerMemberId || currentMember?.id || '',
            ownerSignupId: oldItem?.ownerSignupId || currentMember?.signupId || '',
            ownerProviderId: oldItem?.ownerProviderId || currentMember?.providerId || '',
            ownerName: oldItem?.ownerName || currentMember?.name || '',
            ownerPhone: oldItem?.ownerPhone || currentMember?.phone || '',
            trialEndsAt: oldItem?.trialEndsAt || '',
            serviceStatus: oldItem?.serviceStatus || '결제대기',
            paymentPlan: oldItem?.paymentPlan || selectedPlan.key,
            basicPlan: oldItem?.basicPlan || ('결제대기 · ' + selectedPlan.planText),
            alertPlan: oldItem?.alertPlan || '보험·검사 만료 알림 포함 준비',
            forwardPolicy: oldItem?.forwardPolicy || '담당자용 QR·링크 7일 접속 가능',
            managerExpireAt: oldItem?.managerExpireAt || '',
            paymentStatus: oldItem?.paymentStatus || '결제대기',
            paymentAmount: oldItem?.paymentAmount || selectedPlan.price,
            paymentTier: oldItem?.paymentTier || (isAdditionalRegistration ? 'additional' : 'first')
          };
      item.updateHistory = Array.isArray(oldItem?.updateHistory) ? oldItem.updateHistory.slice() : [];
      if (oldItem) {
        if (!requirePrivateEditReverification(oldItem, item)) return;
        item.updateHistory.unshift({ at:nowIso, summary:buildUpdateSummary(oldItem, item).slice(0, 12) });
        items[editIndex] = item;
        const saveResult = setItemsWithFallback(items);
        let editServerResult = null;
        try { editServerResult = await saveEquipmentItemToSupabase(item, 'edit'); } catch (e) { console.warn('수정 장비 서버 저장 실패:', e); editServerResult = { ok:false, error:e }; }
        if (!saveResult.ok && !(editServerResult && editServerResult.ok)) {
          alert('브라우저 저장공간과 서버 저장이 모두 실패했습니다. 사진 용량을 줄이거나 기존 코드를 정리한 뒤 다시 시도해주세요.');
          return;
        }
        const editSavedLightNote = getStorageFallbackNote(saveResult);
        alert(`수정내용이 저장되었습니다.

포함: ${bundleMeta.includedGroupNames.join(', ')}${editSavedLightNote}`);
        clearRegistrationDraft();
        editingCode = '';
        resetForm(false);
        renderDetail(code);
        return;
      }

      const pending = equipmentRegister.buildPendingRegistration
        ? equipmentRegister.buildPendingRegistration(item, isAdditionalRegistration ? 'additional' : 'first', nowIso)
        : {
            item,
            paymentTier: isAdditionalRegistration ? 'additional' : 'first',
            createdAt: nowIso
          };
      if (!setPendingRegistration(pending)) {
        alert('결제 대기 정보를 임시 저장하지 못했습니다. 사진 용량을 줄이거나 기존 코드를 정리한 뒤 다시 시도해주세요.');
        return;
      }
      // v23.7.288: 결제화면으로 넘어간 뒤 앱이 꺼지면 작성중 복귀가 아니라 결제대기 복귀가 맞습니다.
      // 그래서 등록 초안은 결제대기 정보 저장 후 정리합니다.
      clearRegistrationDraft();
      // v23.7.281: 장비등록 직후 결제대기 상태라도 보관함/관리자 장비수에 보이게 먼저 저장합니다.
      // 결제완료 시 같은 code를 찾아 유료 상태로 갱신합니다.
      const pendingItems = getItems();
      if (!pendingItems.some(x => String(x.code || '') === String(item.code || ''))) {
        pendingItems.unshift(item);
        const pendingSaveResult = setItemsWithFallback(pendingItems);
        if (!pendingSaveResult.ok) {
          console.warn('장비등록 목록 localStorage 저장 실패: 서버 저장으로 계속 진행합니다.');
        }
      }
      let pendingServerResult = null;
      try { pendingServerResult = await saveEquipmentItemToSupabase(item, 'pending_registration'); } catch (e) { console.warn('결제대기 장비 서버 저장 실패:', e); pendingServerResult = { ok:false, error:e }; }
      try { await syncSupabaseEquipmentItems(true); } catch (e) {}
      const pendingServerText = pendingServerResult && pendingServerResult.ok ? '\n\n장비 서버저장: 완료' : '\n\n장비 서버저장: 확인 필요 - ' + escapePlainTextForAlert(sitePassEquipmentSyncMessage || (pendingServerResult?.error?.message || pendingServerResult?.error || '알 수 없음'));
      alert(`${isAdditionalRegistration ? '추가등록 서류 확인이 완료되었습니다.' : '첫 장비 서류 확인이 완료되었습니다.'}\n\n이제 결제방법 화면으로 이동합니다.\n결제를 완료하면 QR링크가 생성되고 보관함에 저장됩니다.${pendingServerText}`);
      openPendingRegistrationPaymentScreen(pending);
    }

    async function completePendingRegistrationPayment(plan) {
      const pending = getPendingRegistration();
      if (!pending || !pending.item) { alert('결제 대기 중인 등록서류가 없습니다.'); return; }
      if (!requirePaymentOwnerVerification('등록 결제')) return;
      const items = getItems();
      const item = pending.item;
      const existingIndex = items.findIndex(x => String(x.code || '') === String(item.code || ''));
      const info = getPlanInfo(plan || getSelectedPaymentPlan(), { additional: pending.paymentTier === 'additional' });
      const now = new Date();
      const nowIso = now.toISOString();
      const equipmentRegister = getEquipmentRegisterModule();
      const paidItem = equipmentRegister.buildPaidRegistrationItem
        ? equipmentRegister.buildPaidRegistrationItem({
            item,
            info,
            nowIso,
            trialEndsAt:addDaysIso(nowIso, info.days),
            managerExpireAt:new Date(getSevenDaysFromNowMs()).toISOString(),
            managerShareToken:makeManagerShareToken(),
            paymentTier:pending.paymentTier
          })
        : {
            ...item,
            serviceStatus: info.serviceStatus,
            paymentPlan: info.key,
            basicPlan: info.planText,
            paidAt: nowIso,
            trialEndsAt: addDaysIso(nowIso, info.days),
            managerExpireAt: new Date(getSevenDaysFromNowMs()).toISOString(),
            managerShareToken: makeManagerShareToken(),
            paymentStatus: '등록결제완료',
            paymentAmount: info.price,
            paymentMethod: '등록 결제 테스트 처리',
            paymentTier: pending.paymentTier,
            updatedAt: nowIso
          };
      if (!equipmentRegister.buildPaidRegistrationItem && paidItem.bundleMeta) paidItem.bundleMeta.paymentText = info.planText + ' 결제완료';
      if (existingIndex >= 0) items[existingIndex] = paidItem;
      else items.unshift(paidItem);
      // 브라우저 저장공간이 부족해도 결제완료 장비는 서버 저장을 먼저 시도하고, 로컬 저장은 단계별로 가볍게 낮춰 저장합니다.
      let paidServerResult = null;
      try { paidServerResult = await saveEquipmentItemToSupabase(paidItem, 'payment_completed'); } catch (e) { console.warn('결제완료 장비 서버 저장 실패:', e); paidServerResult = { ok:false, error:e }; }
      const saveResult = setItemsWithFallback(items);
      if (!saveResult.ok && !(paidServerResult && paidServerResult.ok)) {
        alert('결제는 확인되었지만 브라우저 저장공간과 서버 저장이 모두 실패했습니다. 기존 코드를 삭제하거나 사진 용량을 줄인 뒤 다시 시도해주세요.');
        return;
      }
      try { await syncSupabaseEquipmentItems(true); } catch (e) {}
      clearPendingRegistration();
      clearRegistrationDraft();
      updateHomeRegistrationButton();
      resetForm(false);
      const paymentSavedLightNote = getStorageFallbackNote(saveResult);
      const paidServerText = paidServerResult && paidServerResult.ok ? '\n\n장비 서버저장: 완료' : '\n\n장비 서버저장: 확인 필요 - ' + escapePlainTextForAlert(sitePassEquipmentSyncMessage || (paidServerResult?.error?.message || paidServerResult?.error || '알 수 없음'));
      alert(`${info.label} 결제가 완료되었습니다.\n\n${escapePlainTextForAlert(paidItem.equipmentName || '장비')} QR링크가 생성되고 보관함에 저장되었습니다.${paymentSavedLightNote}${paidServerText}`);
      renderDetail(paidItem.code);
    }

    function escapePlainTextForAlert(text) {
      return String(text || '').split(String.fromCharCode(13)).join(' ').split(String.fromCharCode(10)).join(' ').trim();
    }

    function resetForm(clearEdit = true) {
      if (clearEdit) editingCode = '';
      const no = document.getElementById('equipmentNo');
      const name = document.getElementById('equipmentName');
      if (no) { no.value = ''; no.readOnly = false; }
      if (name) name.value = '';
      const includeDriver = document.getElementById('includeDriverDocs');
      const includeWorker = document.getElementById('includeWorkerDocs');
      if (includeDriver) includeDriver.checked = false;
      if (includeWorker) includeWorker.checked = false;
      renderDocCards();
      renderAlertPreview();
      renderBundleSummary();
      updateRegisterModeUi();
    }

    function readLocalJsonArray(key) {
      if (!key) return [];
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }

    function getServerEquipmentCache() {
      return readLocalJsonArray(SERVER_EQUIPMENT_CACHE_KEY);
    }

    function setServerEquipmentCache(list) {
      try {
        localStorage.setItem(SERVER_EQUIPMENT_CACHE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
        return true;
      } catch (e) {
        console.warn('서버 장비 캐시 저장 실패:', e);
        return false;
      }
    }

    function mergeEquipmentItemLists() {
      const map = new Map();
      Array.from(arguments).forEach(list => {
        (Array.isArray(list) ? list : []).forEach(item => {
          if (!item || item.isDeleted || item.deletedAt) return;
          const code = String(item.code || '').trim() || ('NO-CODE-' + Math.random());
          const existing = map.get(code) || {};
          map.set(code, { ...existing, ...item });
        });
      });
      return Array.from(map.values()).sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    }

    function normalizeSupabaseEquipmentRow(row) {
      if (!row) return null;
      let item = row.item_json || row.payload || row.data || null;
      if (typeof item === 'string') {
        try { item = JSON.parse(item); } catch (e) { item = null; }
      }
      if (!item || typeof item !== 'object') item = {};
      item.code = item.code || row.code || '';
      item.equipmentNo = item.equipmentNo || row.equipment_no || '';
      item.equipmentName = item.equipmentName || row.equipment_name || '';
      item.ownerMemberId = item.ownerMemberId || row.owner_member_id || '';
      item.ownerSignupId = item.ownerSignupId || row.owner_signup_id || '';
      item.ownerProviderId = item.ownerProviderId || row.owner_provider_id || '';
      item.ownerName = item.ownerName || row.owner_name || '';
      item.ownerPhone = item.ownerPhone || row.owner_phone || '';
      item.serviceStatus = item.serviceStatus || row.service_status || '';
      item.paymentStatus = item.paymentStatus || row.payment_status || '';
      item.createdAt = item.createdAt || row.created_at || '';
      item.updatedAt = item.updatedAt || row.updated_at || '';
      item.fromSupabaseEquipment = true;
      return item.code ? item : null;
    }

    function mergePendingRegistrationIntoItems(list) {
      const pendingList = [];
      try {
        const pending = getPendingRegistration();
        const pendingItem = pending && pending.item ? pending.item : null;
        if (pendingItem && pendingItem.code) pendingList.push(pendingItem);
      } catch (e) {}
      return mergeEquipmentItemLists(getServerEquipmentCache(), list, pendingList);
    }

    function getItems() {
      try {
        const localLists = [
          readLocalJsonArray(PREV_STORAGE_KEY),
          readLocalJsonArray(PREV_STORAGE_KEY_2),
          readLocalJsonArray(PREV_STORAGE_KEY_3),
          readLocalJsonArray(PREV_STORAGE_KEY_4),
          readLocalJsonArray(PREV_STORAGE_KEY_5),
          readLocalJsonArray(PREV_STORAGE_KEY_6),
          readLocalJsonArray(PREV_STORAGE_KEY_7),
          readLocalJsonArray(STORAGE_KEY)
        ];
        return mergePendingRegistrationIntoItems(mergeEquipmentItemLists.apply(null, localLists.concat([runtimeEquipmentItems])));
      }
      catch (error) { return mergePendingRegistrationIntoItems(runtimeEquipmentItems); }
    }

    function buildSupabaseEquipmentRow(item, reason) {
      if (!item || !item.code) return null;
      let light = item;
      try { light = makeStorageLightItem(item); } catch (e) { light = { ...item }; }
      return {
        code: String(item.code || ''),
        equipment_no: String(item.equipmentNo || ''),
        equipment_name: String(item.equipmentName || ''),
        owner_member_id: String(item.ownerMemberId || ''),
        owner_signup_id: String(item.ownerSignupId || ''),
        owner_provider_id: String(item.ownerProviderId || ''),
        owner_name: String(item.ownerName || ''),
        owner_phone: String(item.ownerPhone || ''),
        service_status: String(item.serviceStatus || ''),
        payment_status: String(item.paymentStatus || ''),
        item_json: light,
        is_deleted: false,
        save_reason: String(reason || 'save'),
        updated_at: new Date().toISOString()
      };
    }

    async function saveEquipmentItemToSupabase(item, reason) {
      const supabaseApi = window.SitePassSupabaseApi;
      if (!supabaseApi || (!supabaseApi.upsert && !supabaseApi.rpc)) {
        sitePassEquipmentSyncMessage = '장비 서버저장 실패: Supabase API 연결 없음';
        return { skipped:true, error:'Supabase API 연결 없음' };
      }
      const row = buildSupabaseEquipmentRow(item, reason);
      if (!row) {
        sitePassEquipmentSyncMessage = '장비 서버저장 실패: 장비 row 없음';
        return { skipped:true, error:'장비 row 없음' };
      }
      try {
        // v23.7.281: RLS/권한/브라우저 키 차이를 줄이기 위해 서버 RPC를 우선 사용합니다.
        // RPC가 없거나 실패하면 기존 UPSERT로 한 번 더 시도합니다.
        let error = null;
        let rpcTried = false;
        if (supabaseApi.rpc) {
          rpcTried = true;
          const rpcResult = await supabaseApi.rpc('sitepass_upsert_equipment_item', { p_row: row });
          error = rpcResult && rpcResult.error ? rpcResult.error : null;
          if (error) console.warn('Supabase 장비 RPC 저장 실패, 직접 UPSERT 재시도:', error);
        }
        if (error || !rpcTried) {
          if (!supabaseApi.upsert) return { ok:false, error: error || { message:'Supabase UPSERT 연결 없음' } };
          const upsertResult = await supabaseApi.upsert('sitepass_equipment_items', row, { onConflict:'code' });
          error = upsertResult && upsertResult.error ? upsertResult.error : null;
        }
        if (error) {
          console.warn('Supabase 장비 저장 실패:', error);
          sitePassEquipmentSyncMessage = '장비 서버저장 실패: ' + (error.message || JSON.stringify(error));
          return { ok:false, error };
        }
        const cache = getServerEquipmentCache();
        const merged = mergeEquipmentItemLists(cache, [normalizeSupabaseEquipmentRow(row), item]);
        setServerEquipmentCache(merged);
        sitePassEquipmentSyncMessage = '장비 서버저장 완료: ' + (row.equipment_no || row.code || '장비');
        return { ok:true };
      } catch (e) {
        console.warn('Supabase 장비 저장 예외:', e);
        sitePassEquipmentSyncMessage = '장비 서버저장 예외: ' + (e?.message || e);
        return { ok:false, error:e };
      }
    }

    async function syncSupabaseEquipmentItems(silent) {
      const supabaseApi = window.SitePassSupabaseApi;
      if (!supabaseApi || sitePassEquipmentSyncing) return { skipped:true, error:'Supabase API 연결 없음' };
      sitePassEquipmentSyncing = true;
      try {
        let data = null;
        let error = null;
        // v23.7.281: 서버 RPC 목록 조회를 우선 사용하고, 실패 시 직접 SELECT로 재시도합니다.
        if (supabaseApi.rpc) {
          const rpcResult = await supabaseApi.rpc('sitepass_list_equipment_items', {});
          error = rpcResult && rpcResult.error ? rpcResult.error : null;
          data = rpcResult ? rpcResult.data : null;
          if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) {}
          }
          if (data && !Array.isArray(data) && Array.isArray(data.items)) data = data.items;
          if (error) console.warn('Supabase 장비 RPC 목록 실패, 직접 SELECT 재시도:', error);
        }
        if ((error || !Array.isArray(data)) && supabaseApi.select) {
          const selectResult = await supabaseApi.select('sitepass_equipment_items', '*', function(query){
            return query.eq('is_deleted', false).order('updated_at', { ascending:false }).limit(1000);
          });
          data = selectResult && selectResult.data ? selectResult.data : [];
          error = selectResult && selectResult.error ? selectResult.error : null;
        }
        if (error) {
          sitePassEquipmentSyncMessage = '장비 서버목록 불러오기 실패: ' + (error.message || JSON.stringify(error));
          if (!silent) alert(sitePassEquipmentSyncMessage);
          return { ok:false, error };
        }
        const rows = Array.isArray(data) ? data : [];
        const serverItems = rows.map(normalizeSupabaseEquipmentRow).filter(Boolean);
        const mergedItems = mergeEquipmentItemLists(serverItems, readLocalJsonArray(STORAGE_KEY), getItems());
        setServerEquipmentCache(serverItems);
        sitePassEquipmentSyncedAt = Date.now();
        sitePassEquipmentSyncMessage = '서버 장비목록 동기화: ' + serverItems.length + '대 / 화면합산 ' + mergedItems.length + '대';
        try { updateHomeRegistrationButton(); } catch (e) {}
        try { refreshMemberUi(); } catch (e) {}
        try { if (isAdminLoggedIn() && sitePassCurrentScreenId === 'adminScreen') renderAdmin(); } catch (e) {}
        try { if (sitePassCurrentScreenId === 'listScreen') renderList(); } catch (e) {}
        return { ok:true, count:serverItems.length, visibleCount:mergedItems.length };
      } catch (e) {
        sitePassEquipmentSyncMessage = '장비 서버목록 불러오기 예외: ' + (e?.message || e);
        if (!silent) alert(sitePassEquipmentSyncMessage);
        return { ok:false, error:e };
      } finally {
        sitePassEquipmentSyncing = false;
      }
    }

    function setItems(items) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        return true;
      } catch (error) {
        console.warn('저장 공간 부족 또는 브라우저 저장 오류:', error);
        return false;
      }
    }

    function rememberRuntimeEquipmentItems(items) {
      try {
        runtimeEquipmentItems = mergeEquipmentItemLists(runtimeEquipmentItems, Array.isArray(items) ? items : []);
      } catch (e) {
        runtimeEquipmentItems = Array.isArray(items) ? items.slice(0, 20) : [];
      }
    }

    function makeStorageTinyItem(item) {
      const light = JSON.parse(JSON.stringify(item || {}));
      Object.values(light.docs || {}).forEach(doc => {
        const count = Array.isArray(doc.pages) ? doc.pages.length : Number(doc.pageCount || 0);
        doc.pages = [];
        doc.pageCount = count;
        doc.fileName = doc.fileName || (count ? ('첨부 ' + count + '장') : '첨부됨');
        doc.previewDataUrl = '';
        doc.editDataUrl = '';
        doc.originalDataUrl = '';
        doc.correctedDataUrl = '';
        doc.previewChoice = '';
        doc.storageNote = '브라우저 저장공간 부족으로 사진 미리보기는 서버/원본 등록 흐름에서 확인 필요';
      });
      light.storageNote = '브라우저 저장공간 부족으로 이 기기에는 사진 없는 목록정보만 저장됨. 서버 저장이 완료된 장비는 관리자/서버 목록에서 확인 가능';
      light.localPhotoPreviewStripped = true;
      return light;
    }

    function setItemsWithFallback(items) {
      const list = Array.isArray(items) ? items : [];
      rememberRuntimeEquipmentItems(list);
      if (setItems(list)) return { ok:true, mode:'full' };
      const lightItems = list.map(makeStorageLightItem);
      if (setItems(lightItems)) return { ok:true, mode:'light' };
      const tinyItems = list.map(makeStorageTinyItem);
      if (setItems(tinyItems)) return { ok:true, mode:'tiny' };
      return { ok:false, mode:'memory' };
    }

    function getStorageFallbackNote(result) {
      if (!result || result.mode === 'full') return '';
      if (result.mode === 'light') return String.fromCharCode(10) + String.fromCharCode(10) + '용량을 줄이기 위해 원본/보정본 비교데이터는 제외하고 담당자용 사진 미리보기만 저장했습니다.';
      if (result.mode === 'tiny') return String.fromCharCode(10) + String.fromCharCode(10) + '브라우저 저장공간이 부족해서 이 기기에는 사진 없는 목록정보만 저장했습니다. 서버저장이 완료되면 관리자/서버 목록 기준으로 확인됩니다.';
      return String.fromCharCode(10) + String.fromCharCode(10) + '브라우저 저장공간이 가득 차서 이 기기 저장은 생략했습니다. 서버저장 완료 여부를 꼭 확인해주세요.';
    }

    // v23.7.72 - 담당자 화면보기/QR/상세/프린트 공통 조회 함수 복구
    // 이전 정리 과정에서 getItemByCode, getDocsByKeys가 빠져 담당자화면 보기 버튼이 멈추는 문제가 있었습니다.
    function getItemByCode(code) {
      const targetCode = String(code || '').trim();
      if (!targetCode) return null;
      return getItems().find(item => String(item?.code || '').trim() === targetCode) || null;
    }

    function getDocsByKeys(item, keys) {
      const docs = getDisplayDocs(item);
      if (!Array.isArray(keys) || !keys.length) return docs;
      const keySet = new Set(keys.map(key => String(key || '')));
      return docs.filter(doc => keySet.has(String(doc?.key || '')));
    }

    function makeStorageLightItem(item) {
      const light = JSON.parse(JSON.stringify(item));
      Object.values(light.docs || {}).forEach(doc => {
        const pages = Array.isArray(doc.pages) ? doc.pages : [];
        const firstPreview = pages.find(page => page.previewDataUrl)?.previewDataUrl || doc.previewDataUrl || '';
        doc.previewDataUrl = firstPreview;
        doc.editDataUrl = firstPreview;
        doc.originalDataUrl = '';
        doc.correctedDataUrl = '';
        if (Array.isArray(doc.pages)) {
          doc.pages.forEach(page => {
            page.previewDataUrl = page.previewDataUrl || '';
            page.editDataUrl = page.editDataUrl || page.previewDataUrl || '';
            page.originalDataUrl = '';
            page.correctedDataUrl = '';
            page.previewChoice = page.previewDataUrl ? 'preview' : (page.previewChoice || '');
          });
        }
      });
      light.storageNote = '저장공간 절약을 위해 원본/보정본 비교데이터는 제외하고 담당자용 사진 미리보기만 저장됨';
      return light;
    }

    function makeBundleCode(equipmentNo) {
      const cleaned = String(equipmentNo || '').replace(/\s+/g, '').toUpperCase();
      const now = new Date();
      const yymmdd = String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
      const seed = cleaned + '|' + Date.now() + '|' + Math.random();
      let hash = 2166136261;
      for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      const hashPart = Math.abs(hash >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(-6);
      return 'SP-' + yymmdd + '-' + hashPart.slice(0, 3) + hashPart.slice(3) + '-' + randomCodeBlock(4) + '-' + randomCodeBlock(4);
    }

    function randomCodeBlock(length) {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      const values = new Uint32Array(length);
      if (window.crypto && crypto.getRandomValues) {
        crypto.getRandomValues(values);
      } else {
        for (let i = 0; i < length; i++) values[i] = Math.floor(Math.random() * 4294967295);
      }
      let out = '';
      for (let i = 0; i < length; i++) out += chars[values[i] % chars.length];
      return out;
    }

    function makeQrLink(code) {
      const qrShare = getQrShareModule();
      if (qrShare.makeQrLink) return qrShare.makeQrLink(code);
      const baseUrl = window.location.href.split('#')[0];
      return baseUrl + '#qr=' + encodeURIComponent(code);
    }

    function makeQrUrl(link, size = 180) {
      const qrShare = getQrShareModule();
      if (qrShare.makeQrUrl) return qrShare.makeQrUrl(link, size);
      return 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encodeURIComponent(link || '');
    }

    function renderAlertPreview() {
      const activeDefs = getActiveDocDefs().filter(doc => doc.expiry);
      const rows = activeDefs.map(def => {
        const value = document.querySelector('[data-date-key="' + def.dateKey + '"]')?.value || '';
        return '<div class="line"><b>' + escapeHtml(def.groupTitle + ' - ' + def.dateLabel) + '</b><span>' + (value ? escapeHtml(value + ' / ' + getDdayText(value)) : '날짜 없음') + '</span></div>';
      }).join('');
      const box = document.getElementById('alertPreview');
      if (box) box.innerHTML = rows || '<div class="empty">만료일을 입력하는 서류가 없습니다.</div>';
    }

    function getShareItemLabel(item) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getShareItemLabel) return recipientView.getShareItemLabel(item);
      if (!item) return '';
      return (item.equipmentName || '장비명 없음') + ' / ' + (item.equipmentNo || '번호 없음');
    }

    function getItemTitle(item) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getItemTitle) return recipientView.getItemTitle(item);
      return getShareItemLabel(item);
    }

    function getShareTitleForItems(items) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getShareTitleForItems) return recipientView.getShareTitleForItems(items);
      const safe = (items || []).filter(Boolean);
      if (safe.length === 1) return getShareItemLabel(safe[0]) + ' 서류';
      if (!safe.length) return 'SitePass 담당자 서류';
      return 'SitePass 장비서류 ' + safe.length + '건';
    }

    function getShareSubtitle(item) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getShareSubtitle) return recipientView.getShareSubtitle(item);
      return '현장 반입서류 확인 · 다운로드/프린트 전용';
    }

    function getIncludedGroupText(item) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getIncludedGroupText) return recipientView.getIncludedGroupText(item);
      const names = item?.bundleMeta?.includedGroupNames;
      if (Array.isArray(names) && names.length) {
        const out = names.slice();
        const meta = item.bundleMeta || {};
        const workerIndex = out.indexOf('인부서류');
        const workerCount = Number(meta.workerPeopleCount || (Array.isArray(item.workerPeople) ? item.workerPeople.length : 0));
        if (workerIndex >= 0 && workerCount) {
          out[workerIndex] = '인부서류 ' + workerCount + '명(보통 ' + (meta.normalWorkerCount || 0) + '명 / 특수 ' + (meta.specialWorkerCount || 0) + '명)';
        }
        return out.join(', ');
      }
      if (item?.type === 'BUNDLE') return '장비서류';
      return '장비서류';
    }


    function getDeadlineDiffDays(dateValue) {
      if (!dateValue) return null;
      const today = new Date();
      today.setHours(0,0,0,0);
      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) return null;
      d.setHours(0,0,0,0);
      return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    }

    function getD7DeadlineDocs(item) {
      return getDisplayDocs(item).filter(doc => {
        if (!doc || !doc.expiry || !doc.expireDate) return false;
        if (!doc.fileName && !getDocPagesFromDoc(doc).length) return false;
        const diff = getDeadlineDiffDays(doc.expireDate);
        return diff !== null && diff <= 7;
      }).sort((a, b) => getDeadlineDiffDays(a.expireDate) - getDeadlineDiffDays(b.expireDate));
    }

    function getServiceOverdueDays(item) {
      const payments = getAdminPaymentsModule();
      if (payments.getServiceOverdueDays) return payments.getServiceOverdueDays(item);
      if (!item || !item.trialEndsAt) return null;
      const end = new Date(item.trialEndsAt);
      if (Number.isNaN(end.getTime())) return null;
      const today = new Date();
      today.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      return diff < 0 ? Math.abs(diff) : 0;
    }

    function isServiceGrace14Over(item) {
      const payments = getAdminPaymentsModule();
      if (payments.isServiceGrace14Over) return payments.isServiceGrace14Over(item);
      const overdueDays = getServiceOverdueDays(item);
      return overdueDays !== null && overdueDays >= 14;
    }

    function renderD7DeadlineNotice(item) {
      const docs = getD7DeadlineDocs(item);
      if (!docs.length) return '';
      const rows = docs.map(doc => {
        const title = (doc.groupTitle ? doc.groupTitle + ' - ' : '') + doc.title;
        return '<li>' + escapeHtml(title) + ' · ' + escapeHtml(getDdayText(doc.expireDate)) + ' · ' + escapeHtml(doc.expireDate) + '</li>';
      }).join('');
      return '<div class="deadline-alert-box"><b>만료임박 서류(D-7 이내)</b><ul>' + rows + '</ul></div>';
    }

    function getAdminListQuickFilterLabel(filterKey) {
      const labels = {
        all:'전체 장비서류',
        paused:'QR 일시정지',
        expiring:'서류 만료임박',
        expired:'서류 만료',
        grace14:'유예 14일 이상'
      };
      return labels[filterKey] || '전체 장비서류';
    }

    function itemMatchesAdminListQuickFilter(item, filterKey) {
      if (!filterKey || filterKey === 'all') return true;
      if (filterKey === 'paused') return isQrPaused(item);
      if (filterKey === 'expiring') return Object.values(item.docs || {}).some(doc => (doc.status || getDocStatus(doc)) === '만료임박');
      if (filterKey === 'expired') return Object.values(item.docs || {}).some(doc => (doc.status || getDocStatus(doc)) === '만료');
      if (filterKey === 'grace14') return isServiceGrace14Over(item);
      return true;
    }

    function openAdminListQuickFilter(filterKey) {
      const archive = getArchiveModule();
      if (archive.openAdminListQuickFilter) return archive.openAdminListQuickFilter(filterKey);
      adminListQuickFilter = filterKey || 'all';
      showScreen('listScreen');
    }

    function clearAdminListQuickFilter() {
      const archive = getArchiveModule();
      if (archive.clearAdminListQuickFilter) return archive.clearAdminListQuickFilter();
      adminListQuickFilter = 'all';
      renderList();
    }

    function openAdminContactManager() {
      showScreen('adminScreen');
      setTimeout(() => {
        const card = document.getElementById('adminContactManagerCard');
        if (card) card.scrollIntoView({ behavior:'smooth', block:'start' });
      }, 80);
    }

    function renderList() {
      const archive = getArchiveModule();
      if (archive.renderList) return archive.renderList();
      const box = document.getElementById('equipmentList');
      if (box) box.innerHTML = '<div class="empty">보관함 모듈을 불러오지 못했습니다. 최신 수정본을 다시 올려주세요.</div>';
    }

    function selectAllListItems(checked) {
      const archive = getArchiveModule();
      if (archive.selectAllListItems) return archive.selectAllListItems(checked);
    }

    function getSelectedListCodes() {
      const archive = getArchiveModule();
      return archive.getSelectedListCodes ? archive.getSelectedListCodes() : [];
    }

    function getSevenDaysFromNowMs() {
      return Date.now() + (7 * 24 * 60 * 60 * 1000);
    }

    function refreshManagerExpiryForCodes(codes) {
      const uniqueCodes = Array.from(new Set((codes || []).filter(Boolean)));
      if (!uniqueCodes.length) return [];
      const expireAt = getSevenDaysFromNowMs();
      const expireIso = new Date(expireAt).toISOString();
      const codeSet = new Set(uniqueCodes);
      const all = getItems();
      all.forEach(item => {
        if (codeSet.has(item.code) && !isServiceShareBlocked(item)) {
          item.managerExpireAt = expireIso;
          item.updatedAt = new Date().toISOString();
        }
      });
      setItems(all);
      return uniqueCodes.map(code => getItemByCode(code)).filter(Boolean);
    }

    function getCodeFromManagerLink(link) {
      const parsed = parseManagerHash(String(link || '').includes('#manager=') ? '#' + String(link || '').split('#')[1] : link);
      return parsed.code || '';
    }

    function getItemsFromCodes(codes) {
      const archive = getArchiveModule();
      return archive.getItemsFromCodes ? archive.getItemsFromCodes(codes) : (codes || []).map(code => getItemByCode(code)).filter(Boolean);
    }

    function getSelectedListItemsForShare() {
      const archive = getArchiveModule();
      return archive.getSelectedListItemsForShare ? archive.getSelectedListItemsForShare() : [];
    }

    function shareOneListItem(code) {
      const archive = getArchiveModule();
      if (archive.shareOneListItem) return archive.shareOneListItem(code);
      shareOneListItemKakao(code);
    }

    function shareSelectedListItems() {
      const archive = getArchiveModule();
      if (archive.shareSelectedListItems) return archive.shareSelectedListItems();
      shareSelectedListItemsKakao();
    }

    function shareOneListItemKakao(code) {
      const archive = getArchiveModule();
      if (archive.shareOneListItemKakao) return archive.shareOneListItemKakao(code);
    }

    function shareOneListItemSms(code) {
      const archive = getArchiveModule();
      if (archive.shareOneListItemSms) return archive.shareOneListItemSms(code);
    }

    function shareOneListItemEmail(code) {
      const archive = getArchiveModule();
      if (archive.shareOneListItemEmail) return archive.shareOneListItemEmail(code);
    }

    function shareSelectedListItemsKakao() {
      const archive = getArchiveModule();
      if (archive.shareSelectedListItemsKakao) return archive.shareSelectedListItemsKakao();
    }

    function shareSelectedListItemsSms() {
      const archive = getArchiveModule();
      if (archive.shareSelectedListItemsSms) return archive.shareSelectedListItemsSms();
    }

    function shareSelectedListItemsEmail() {
      const archive = getArchiveModule();
      if (archive.shareSelectedListItemsEmail) return archive.shareSelectedListItemsEmail();
    }

    function buildManagerShareText(items) {
      const archive = getArchiveModule();
      if (archive.buildManagerShareText) return archive.buildManagerShareText(items);
      return '[SitePass] 담당자 서류 공유';
    }

    function renderManagerSharePreviewPanel(item) {
      const archive = getArchiveModule();
      return archive.renderManagerSharePreviewPanel ? archive.renderManagerSharePreviewPanel(item) : '';
    }

    const PUBLIC_SHARE_TABLE = 'sitepass_public_shares';

    function getSitePassSupabaseClient() {
      return window.sitepassSupabase || null;
    }

    function cloneShareItemForServer(item, expireAt, sig) {
      const copy = JSON.parse(JSON.stringify(item || {}));
      copy.managerExpireAt = new Date(Number(expireAt || getManagerExpireAt(item))).toISOString();
      copy.managerShareToken = item?.managerShareToken || getOrCreateManagerShareToken(item?.code || '');
      copy.managerShareSig = sig || getManagerLinkSignature(item?.code || '', Number(expireAt || getManagerExpireAt(item)));
      copy.publicShareSavedAt = new Date().toISOString();
      return copy;
    }

    function upsertSharedItemIntoLocalCache(item) {
      if (!item || !item.code) return null;
      const all = getItems();
      const idx = all.findIndex(x => String(x.code || '') === String(item.code || ''));
      const merged = idx >= 0 ? { ...all[idx], ...item } : item;
      if (idx >= 0) all[idx] = merged;
      else all.unshift(merged);
      setItems(all);
      return merged;
    }

    async function saveManagerShareItemsToSupabase(items) {
      const client = getSitePassSupabaseClient();
      if (!client) {
        return { ok:false, message:'Supabase 연결 객체가 없습니다.' };
      }
      const safeItems = (items || []).filter(Boolean);
      if (!safeItems.length) return { ok:true, saved:0 };
      try {
        const nowIso = new Date().toISOString();
        const rows = safeItems.map(item => {
          const expireAt = getManagerExpireAt(item);
          const sig = getManagerLinkSignature(item.code || '', expireAt);
          const shareItem = cloneShareItemForServer(item, expireAt, sig);
          return {
            share_code: String(item.code || ''),
            share_sig: String(sig || ''),
            expires_at: new Date(expireAt).toISOString(),
            item_data: shareItem,
            share_title: getShareItemLabel(item),
            equipment_no: String(item.equipmentNo || ''),
            equipment_name: String(item.equipmentName || ''),
            owner_login_id: String(item.ownerSignupId || item.ownerProviderId || ''),
            updated_at: nowIso
          };
        }).filter(row => row.share_code && row.share_sig);
        if (!rows.length) return { ok:false, message:'저장할 담당자 링크 정보가 없습니다.' };
        const { error } = await client
          .from(PUBLIC_SHARE_TABLE)
          .upsert(rows, { onConflict:'share_code' });
        if (error) return { ok:false, message:error.message || 'Supabase 저장 오류' };
        return { ok:true, saved:rows.length };
      } catch (e) {
        return { ok:false, message:e?.message || String(e) };
      }
    }

    async function loadManagerShareItemFromSupabase(code, sig) {
      const qrShare = getQrShareModule();
      if (qrShare.loadManagerShareItemFromSupabase) {
        return await qrShare.loadManagerShareItemFromSupabase(code, sig, {
          getClient: getSitePassSupabaseClient,
          upsertLocalCache: upsertSharedItemIntoLocalCache
        });
      }
      if (!getSitePassSupabaseClient() || !code || !sig) return { ok:false, message:'Supabase 연결 또는 링크 서명이 없습니다.' };
      return { ok:false, message:'QR 공유 모듈 연결 실패' };
    }

    function showManagerLinkLoadMessage(message) {
      const box = document.getElementById('managerPrintBox');
      if (box) box.innerHTML = '<div class="empty">' + escapeHtml(message || '담당자 링크를 확인하고 있습니다.') + '</div>';
      showScreen('managerPrintScreen');
    }

    async function renderManagerPrintFromHash(parsed) {
      if (!parsed || !parsed.code) {
        showManagerLinkLoadMessage('담당자 링크 정보가 없습니다. 링크를 다시 확인해주세요.');
        return;
      }
      let item = getItemByCode(parsed.code);
      if (!item && parsed.sig) {
        showManagerLinkLoadMessage('서버에서 담당자 링크를 불러오는 중입니다.');
        const loaded = await loadManagerShareItemFromSupabase(parsed.code, parsed.sig);
        if (loaded.ok) item = loaded.item;
        else if (loaded.expired) {
          const box = document.getElementById('managerPrintBox');
          if (box) box.innerHTML = '<div class="manager-expire-box"><b>만료된 담당자 QR·링크입니다.</b><br>이 담당자 접속은 7일이 지나 더 이상 열 수 없습니다.<br>장비업자에게 새 공유 QR·링크를 다시 받아주세요.</div>';
          showScreen('managerPrintScreen');
          return;
        } else {
          const msg = loaded.notFound
            ? '조회할 수 없는 코드입니다.<br>장비업자가 7일 링크를 다시 공유해야 합니다.'
            : '담당자 링크를 서버에서 불러오지 못했습니다.<br>장비업자에게 새 링크를 다시 받아주세요.<br><span class="small">' + escapeHtml(loaded.message || '') + '</span>';
          const box = document.getElementById('managerPrintBox');
          if (box) box.innerHTML = '<div class="empty">' + msg + '</div>';
          showScreen('managerPrintScreen');
          return;
        }
      }
      renderManagerPrint(parsed.code, parsed.exp, parsed.sig);
    }

    function shareManagerItems(items) {
      shareManagerItemsByChannel(items, 'kakao');
    }

    async function shareManagerItemsByChannel(items, channel) {
      const requestedItems = (items || []).filter(Boolean);
      if (!canUseQrShareItems(requestedItems, '담당자 QR·링크 보내기')) return;
      const safeItems = refreshManagerExpiryForCodes(requestedItems.map(item => item.code));
      if (!safeItems.length) return;

      const saved = await saveManagerShareItemsToSupabase(safeItems);
      if (!saved.ok) {
        alert('담당자 링크를 서버에 저장하지 못했습니다.\n지금 보내면 받은 사람 휴대폰에서 조회할 수 없는 코드가 나올 수 있습니다.\n\nSupabase SQL Editor에서 sitepass_public_shares 테이블을 만든 뒤 다시 7일 링크 공유를 눌러주세요.\n\n오류: ' + (saved.message || '알 수 없는 오류'));
        return;
      }

      const text = buildManagerShareText(safeItems);
      const first = safeItems[0];
      const firstLink = makeManagerLink(first.code, getManagerExpireAt(first));
      if (channel === 'sms') {
        openSmsShare(text);
        return;
      }
      if (channel === 'email') {
        openEmailShare(text, safeItems);
        return;
      }
      openKakaoShare(text, firstLink, safeItems.length);
    }

    function openKakaoShare(text, firstLink, itemCount) {
      if (navigator.share) {
        const payload = itemCount === 1
          ? { title:'SitePass 담당자 서류', text:'SitePass 담당자 서류 다운로드/프린트입니다.\nQR·링크를 누르면 코드 입력 없이 바로 열립니다.\n7일 뒤에는 담당자 QR·링크 접속이 차단됩니다.', url:firstLink }
          : { title:'SitePass 담당자 서류', text };
        navigator.share(payload).catch(() => copyTextFallback(text, '담당자 공유문을 복사했습니다.\n카카오톡 대화창에 붙여넣으면 됩니다.'));
      } else {
        copyTextFallback(text, '담당자 공유문을 복사했습니다.\n카카오톡 대화창에 붙여넣으면 됩니다.');
      }
    }

    function normalizePhoneForShare(phone) {
      const qrShare = getQrShareModule();
      if (qrShare.normalizePhoneForShare) return qrShare.normalizePhoneForShare(phone);
      return String(phone || '').replace(/[^0-9+]/g, '');
    }

    function openSmsShare(text) {
      const phoneRaw = prompt('받는 사람 휴대폰번호를 입력해주세요.\n예: 01012345678');
      if (phoneRaw === null) return;
      const phone = normalizePhoneForShare(phoneRaw);
      if (!phone) { alert('휴대폰번호를 입력해야 문자로 보낼 수 있습니다.'); return; }
      const body = encodeURIComponent(text);
      window.location.href = 'sms:' + encodeURIComponent(phone) + '?&body=' + body;
    }

    function openSmsShareToPhones(phones, text) {
      const targets = Array.from(new Set((phones || []).map(normalizePhoneForShare).filter(Boolean)));
      if (!targets.length) {
        alert('문자를 보낼 장비업자 휴대폰번호가 없습니다.');
        return;
      }
      const body = encodeURIComponent(text);
      window.location.href = 'sms:' + encodeURIComponent(targets.join(',')) + '?&body=' + body;
    }

    function buildAdminOwnerAlertText(items) {
      const safeItems = (items || []).filter(Boolean);
      const rows = safeItems.map((item, index) => {
        const prefix = safeItems.length > 1 ? (index + 1) + '. ' : '- ';
        return prefix + getShareItemLabel(item) + ' · ' + makeAlertSummary(item.docs || {});
      }).join('\n');
      return '[SitePass 관리자 알림]\n아래 장비서류의 만료 상태를 확인해주세요.\n' + rows + '\n\nSitePass 로그인 후 장비/기사/인부 보관함에서 서류를 수정/갱신해주세요.';
    }

    function shareSelectedAdminOwnerAlertSms() {
      const items = getSelectedListItemsForShare();
      if (!items.length) return;
      const phones = [];
      const missing = [];
      items.forEach(item => {
        const phone = normalizePhoneForShare(item?.ownerPhone || '');
        if (phone) phones.push(phone);
        else missing.push(getShareItemLabel(item));
      });
      if (!phones.length) {
        alert('선택한 장비에 등록된 장비업자 휴대폰번호가 없습니다.');
        return;
      }
      if (missing.length) {
        alert('아래 장비는 장비업자 휴대폰번호가 없어 알림 대상에서 제외됩니다.\n\n' + missing.join('\n'));
      }
      const text = buildAdminOwnerAlertText(items);
      openSmsShareToPhones(phones, text);
    }

    function shareAdminOwnerAlertSmsForCode(code) {
      const item = getItemByCode(code);
      if (!item) { alert('알림을 보낼 장비서류를 찾을 수 없습니다.'); return; }
      const phone = normalizePhoneForShare(item.ownerPhone || '');
      if (!phone) { alert('이 장비서류에는 장비업자 휴대폰번호가 등록되어 있지 않습니다.'); return; }
      openSmsShareToPhones([phone], buildAdminOwnerAlertText([item]));
    }

    function openEmailShare(text, items) {
      const email = prompt('받는 사람 이메일을 입력해주세요.\n예: site@example.com');
      if (email === null) return;
      const cleanEmail = String(email || '').trim();
      if (!cleanEmail || !cleanEmail.includes('@')) { alert('받는 사람 이메일을 정확히 입력해주세요.'); return; }
      const subjectBase = getShareTitleForItems(items || []);
      const subject = encodeURIComponent('[SitePass] ' + subjectBase + ' QR·링크');
      const body = encodeURIComponent(text);
      window.location.href = 'mailto:' + cleanEmail + '?subject=' + subject + '&body=' + body;
    }

    function openAdminQrLink(code) {
      const item = getItemByCode(code);
      if (!item) { alert('QR을 열 장비서류를 찾을 수 없습니다.'); return; }
      if (isServiceShareBlocked(item)) {
        const box = document.getElementById('detailBox');
        if (box) {
          box.innerHTML = renderServiceBlockedBox(item) + '<div class="actions"><button class="okBtn" onclick="shareAdminOwnerAlertSmsForCode(\'' + escapeJs(item.code || '') + '\')">장비업자 결제/갱신 알림</button><button class="secondary" onclick="showScreen(\'listScreen\')">관리자 보관함</button></div>';
          showScreen('detailScreen');
        }
        return;
      }
      currentDetailLink = makeManagerLink(item.code, getManagerExpireAt(item));
      const qrUrl = makeQrUrl(currentDetailLink, 240);
      const docs = getDisplayDocs(item);
      const docHtml = docs.map(doc => renderDocDetail(doc)).join('');
      document.getElementById('detailBox').innerHTML =
        '<div class="notice blue-note"><b>관리자 큐알링크</b><br>이 QR은 회원이 등록한 해당 장비서류 담당자 화면으로 바로 연결됩니다. 담당자는 코드 입력 없이 다운로드/프린트 화면을 봅니다.</div>' +
        '<div class="qr-box" onclick="openManagerPublicView(\'' + escapeJs(item.code) + '\')">' +
          '<img alt="담당자 QR" src="' + qrUrl + '">' +
          '<div class="qr-hint">QR 누르면 담당자 화면 바로 열림</div>' +
        '</div>' +
        '<div class="line"><b>장비 등록번호</b><span>' + escapeHtml(item.equipmentNo) + '</span></div>' +
        '<div class="line"><b>장비명</b><span>' + escapeHtml(item.equipmentName) + '</span></div>' +
        '<div class="line"><b>장비업자</b><span>' + escapeHtml(getItemOwnerText(item)) + '</span></div>' +
        '<div class="line"><b>담당자 링크</b><span style="word-break:break-all;">' + escapeHtml(currentDetailLink) + '</span></div>' +
        '<div class="line"><b>담당자 QR·링크 만료</b><span>' + escapeHtml(getManagerExpireText(getManagerExpireAt(item))) + '</span></div>' +
        renderD7DeadlineNotice(item) +
        '<div class="actions"><button class="okBtn" onclick="shareAdminOwnerAlertSmsForCode(\'' + escapeJs(item.code || '') + '\')">장비업자 알림 보내기</button><button class="ghost" onclick="copyManagerCode(\'' + escapeJs(item.code || '') + '\')">링크 복사</button><button class="primary" onclick="openManagerPublicView(\'' + escapeJs(item.code || '') + '\')">담당자 화면 열기</button><button class="secondary" onclick="showScreen(\'listScreen\')">관리자 보관함</button></div>' +
        '<h3>등록 서류</h3>' + (docHtml || '<div class="empty">표시할 서류가 없습니다.</div>');
      showScreen('detailScreen');
    }

    function renderDetail(code) {
      const item = getItems().find(x => x.code === code);
      if (!item) { alert('통합 서류함 정보를 찾을 수 없습니다.'); showScreen('listScreen'); return; }
      currentDetailLink = makeManagerLink(item.code, getManagerExpireAt(item));
      const qrUrl = makeQrUrl(currentDetailLink, 180);
      const docHtml = getDisplayDocs(item).map(doc => renderDocDetail(doc)).join('');
      const renewalHtml = isAdminLoggedIn() ? '<div class="notice blue-note">관리자 상세보기에서는 수정/갱신·결제연장 버튼을 숨깁니다. 장비업자에게 알림만 보내고, 실제 수정/갱신은 회원 보관함에서 처리합니다.</div>' : renderRenewPanel(item);

      document.getElementById('detailBox').innerHTML =
        '<div class="line"><b>장비 등록번호</b><span>' + escapeHtml(item.equipmentNo) + '</span></div>' +
        '<div class="line"><b>장비명</b><span>' + escapeHtml(item.equipmentName) + '</span></div>' +
        '<div class="line"><b>포함서류</b><span>' + escapeHtml(getIncludedGroupText(item)) + '</span></div>' +
        renderD7DeadlineNotice(item) +
        '<div class="line"><b>결제단위</b><span>' + escapeHtml(item?.bundleMeta?.paymentText || '장비 및 인력 통합 1세트 결제') + '</span></div>' +
        '<div class="line"><b>서비스상태</b><span>' + escapeHtml(getServiceStatusText(item)) + '</span></div>' +
        '<div class="line"><b>요금제 기준</b><span>' + escapeHtml(item.basicPlan || BASIC_PRICE_TEXT) + '<br>' + escapeHtml(item.alertPlan || ALERT_PRICE_TEXT) + '</span></div>' +
        '<div class="line"><b>전달 정책</b><span>' + escapeHtml(item.forwardPolicy || '공유 후 7일 재전송 가능 예정') + '</span></div>' +
        renewalHtml +
        '<div class="qr-box" onclick="openManagerPublicView(\'' + escapeJs(item.code) + '\')">' +
          '<img alt="통합 QR" src="' + qrUrl + '">' +
          '<div class="qr-hint">QR 누르면 담당자 다운로드/프린트 화면 바로 열림</div>' +
        '</div>' +
        '<h3>등록 서류</h3>' + (docHtml || '<div class="empty">표시할 서류가 없습니다.</div>');
      showScreen('detailScreen');
    }

    function renderDocDetail(doc) {
      const pages = getDocPagesFromDoc(doc);
      const badgeClass = doc.fileName ? 'done' : (doc.required ? 'need' : '');
      const badgeText = doc.fileName ? ((doc.status || '첨부됨') + (pages.length ? ' · ' + pages.length + '장' : '')) : (doc.required ? '미첨부' : '선택안함');
      const attachInfo = (!pages.length && !doc.fileName) ? '<div class="selected-file">미첨부</div>' : '';
      const dateHtml = doc.expiry ? '<div class="line"><b>만료날짜</b><span>' + (doc.expireDate ? escapeHtml(doc.expireDate + ' / ' + getDdayText(doc.expireDate)) : '미입력') + '</span></div>' : '';
      return '<div class="doc-card"><div class="doc-head"><div class="doc-title">' + escapeHtml((doc.groupTitle ? doc.groupTitle + ' - ' : '') + doc.title) + '</div><span class="badge ' + badgeClass + '">' + escapeHtml(badgeText) + '</span></div>' + attachInfo + renderPreviewHtml(doc) + dateHtml + '</div>';
    }

    function getDdayTextWithDays(dateValue) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getDdayTextWithDays) {
        return recipientView.getDdayTextWithDays(dateValue, { getDdayText });
      }
      const text = getDdayText(dateValue);
      if (!text) return '';
      return /^D-\d+$/.test(text) ? text + '일' : text;
    }

    function getExpiryPeriodLabel(doc) {
      const recipientView = getRecipientViewModule();
      if (recipientView.getExpiryPeriodLabel) return recipientView.getExpiryPeriodLabel(doc);
      const title = String(doc?.title || '서류');
      if (title.includes('보험')) return '보험만료기간';
      if (title.includes('검사')) return title.includes('비파괴') ? '비파괴검사 만료기간' : '검사만료기간';
      if (title.includes('안전교육') || title.includes('교육')) return '교육만료기간';
      if (title.includes('면허')) return '면허만료기간';
      return '서류만료기간';
    }

    function renderDocExpiryStrip(doc) {
      if (!doc || !doc.expireDate) return '';
      const label = getExpiryPeriodLabel(doc);
      const dday = getDdayTextWithDays(doc.expireDate);
      return '<div class="doc-expiry-strip"><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(dday + (doc.expireDate ? ' · ' + doc.expireDate : '')) + '</span></div>';
    }

    function getEquipmentNoForDocLabel(code) {
      const item = code ? getItemByCode(code) : null;
      return String(item?.equipmentNo || document.getElementById('equipmentNo')?.value || '').trim();
    }

    function makeDocFileTopLabel(doc, code) {
      const equipmentNo = getEquipmentNoForDocLabel(code);
      const title = String(doc?.title || doc?.docTitle || '첨부서류').trim();
      return (equipmentNo ? equipmentNo + ' ' : '') + title;
    }

    function renderIdExtraStrip(doc) {
      const phoneValue = doc.driverPhone || doc.workerPhone || doc.personPhone || '';
      const phoneStrip = phoneValue ? '<div>전화번호: ' + escapeHtml(phoneValue) + '</div>' : '';
      const taskStrip = doc.workerTask ? '<div>작업내용: ' + escapeHtml(doc.workerTask) + '</div>' : '';
      return (phoneStrip || taskStrip) ? '<div class="id-extra-strip">' + phoneStrip + taskStrip + '</div>' : '';
    }

    function renderPreviewHtml(doc) {
      const pages = getDocPagesFromDoc(doc);
      if (!doc.fileName && !pages.length) return '';
      if (pages.length) {
        const extraStrip = renderIdExtraStrip(doc);
        const label = makeDocFileTopLabel(doc, '');
        return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 ' + pages.length + '장 이미지</span></div>' + renderPagesListHtml(pages, { imageOnly:true, readonly:true, docKey:doc.key, code:'', docLabel:label }) + renderDocExpiryStrip(doc) + extraStrip + '</div>';
      }
      if ((doc.fileType || '').includes('pdf') || String(doc.fileName || '').toLowerCase().endsWith('.pdf')) {
        return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 파일</span></div>' +
          '<div class="preview-pdf">PDF 첨부됨<br><span class="small">현재 베타 파일은 서버 저장 전이라 파일명 중심으로 표시됩니다.</span></div>' + renderIdExtraStrip(doc) + '</div>';
      }
      const extraStrip = renderIdExtraStrip(doc);
      if (extraStrip) {
        return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 정보</span></div>' + extraStrip + '</div>';
      }
      return '';
    }

    function openQrPublicView(code) {
      const link = makeQrLink(code);
      window.location.hash = '#qr=' + encodeURIComponent(code);
      renderPublic(code);
    }

    function openCurrentQrLink() {
      if (!currentDetailLink) return;
      if (currentDetailLink.includes('#manager=')) {
        const parsed = parseManagerHash('#' + currentDetailLink.split('#')[1]);
        if (parsed.code) openManagerPublicView(parsed.code, parsed.exp, parsed.sig);
        return;
      }
      const code = decodeURIComponent((currentDetailLink.split('#qr=')[1] || '').trim());
      if (code) openQrPublicView(code);
    }


    function openManagerByInput() {
      const code = (document.getElementById('managerCodeInput')?.value || '').trim();
      if (!code) { alert('담당자에게 받은 링크나 QR로 접속해주세요.'); return; }
      openManagerPublicView(code);
    }

    function openManagerPublicView(code, expireAt, sig) {
      const item = getItemByCode(code);
      if (!item) {
        document.getElementById('managerPrintBox').innerHTML = '<div class="empty">조회할 수 없는 코드입니다.<br>코드를 다시 확인해주세요.</div>';
        showScreen('managerPrintScreen');
        return;
      }
      const exp = expireAt ? Number(expireAt) : getManagerExpireAt(item);
      const linkSig = sig || getManagerLinkSignature(code, exp);
      window.location.hash = '#manager=' + encodeURIComponent(code) + '&exp=' + encodeURIComponent(String(exp)) + '&sig=' + encodeURIComponent(linkSig);
      renderManagerPrint(code, exp, linkSig);
    }

    function renderManagerPrint(code, expireAt, sig) {
      const item = getItemByCode(code);
      const box = document.getElementById('managerPrintBox');
      if (!item) {
        box.innerHTML = '<div class="empty">조회할 수 없는 코드입니다.</div>';
        showScreen('managerPrintScreen');
        return;
      }
      if (isServiceShareBlocked(item)) {
        box.innerHTML = renderServiceBlockedBox(item);
        showScreen('managerPrintScreen');
        return;
      }
      if (expireAt && !isManagerLinkSignatureValid(item, expireAt, sig)) {
        const recipientView = getRecipientViewModule();
        box.innerHTML = recipientView.getInvalidManagerLinkHtml ? recipientView.getInvalidManagerLinkHtml() : '<div class="manager-expire-box"><b>올바르지 않은 담당자 QR·링크입니다.</b><br>만료시간이 변경되었거나 이미 폐기된 링크입니다.<br>장비업자에게 새 공유 QR·링크를 다시 받아주세요.</div>';
        showScreen('managerPrintScreen');
        return;
      }
      if (isManagerExpired(item, expireAt)) {
        const recipientView = getRecipientViewModule();
        box.innerHTML = recipientView.getExpiredManagerLinkHtml ? recipientView.getExpiredManagerLinkHtml() : '<div class="manager-expire-box"><b>만료된 담당자 QR·링크입니다.</b><br>이 담당자 접속은 7일이 지나 더 이상 열 수 없습니다.<br>장비업자에게 새 공유 QR·링크를 다시 받아주세요.<br><span class="small">장비업자의 원본 서류함과 수정/갱신 화면은 그대로 유지됩니다.</span></div>';
        showScreen('managerPrintScreen');
        return;
      }
      currentDetailLink = makeManagerLink(item.code, expireAt || getManagerExpireAt(item));
      const docs = getDisplayDocs(item);
      const docHtml = docs.map((doc, index) => renderManagerDocLine(doc, item.code, index)).join('');
      const recipientView = getRecipientViewModule();
      const remainingDays = recipientView.getManagerRemainingDays ? recipientView.getManagerRemainingDays(expireAt || getManagerExpireAt(item)) : Math.ceil(((expireAt || getManagerExpireAt(item)) - Date.now()) / (1000 * 60 * 60 * 24));
      box.innerHTML =
        '<div class="manager-received-hero"><div class="eyebrow">QR·링크로 받은 담당자 화면</div><h3>' + escapeHtml(getShareItemLabel(item)) + ' 서류</h3><p>이 화면은 하도급/원청 담당자가 카톡·문자 링크나 QR을 눌렀을 때 바로 보는 다운로드/프린트 전용 화면입니다.</p><div class="manager-status-grid"><div>코드입력 없음</div><div>7일 유효</div><div>수정/갱신 불가</div></div></div>' +
        '<div class="line"><b>장비 등록번호</b><span>' + escapeHtml(item.equipmentNo) + '</span></div>' +
        '<div class="line"><b>장비명</b><span>' + escapeHtml(item.equipmentName) + '</span></div>' +
        '<div class="line"><b>포함서류</b><span>' + escapeHtml(getIncludedGroupText(item)) + '</span></div>' +
        renderD7DeadlineNotice(item) +
        '<div class="manager-expire-box">담당자 접속 만료일: ' + escapeHtml(getManagerExpireText(expireAt || getManagerExpireAt(item))) + '<br>남은 기간: 약 ' + remainingDays + '일<br><span class="small">7일 후 담당자 QR·링크 접속만 차단됩니다.</span></div>' +
        renderManagerDownloadToolbar(item) +
        '<h3 style="margin-top:14px">다운로드/프린트 서류</h3>' + renderPrintSelectRow(item.code) + (docHtml || '<div class="empty">표시할 서류가 없습니다.</div>') +
        (recipientView.renderSponsorBox ? recipientView.renderSponsorBox() : '<div class="sponsor-box"><div class="small">운영·개발: 제이에스건설</div><a href="https://www.songwongeo.co.kr" target="_blank" rel="noopener">송원건설 홈페이지 바로가기</a></div>');
      showScreen('managerPrintScreen');
    }

    function renderManagerDownloadToolbar(item) {
      const recipientView = getRecipientViewModule();
      if (recipientView.renderDownloadToolbar) {
        return recipientView.renderDownloadToolbar(item, {
          mode:'manager',
          showSelection:true,
          deps:{ getDisplayDocs, getDocPagesFromDoc, expandPrintablePages, escapeJs }
        });
      }
      const code = item.code || '';
      const printableCount = getDisplayDocs(item).reduce((sum, doc) => sum + expandPrintablePages([doc]).length, 0);
      const attachedPageCount = getDisplayDocs(item).reduce((sum, doc) => sum + getDocPagesFromDoc(doc).length, 0);
      return '<div class="print-toolbar download-toolbar">' +
        '<div class="print-help full">필요한 서류를 체크하고 상단 버튼으로 다운로드/프린트하세요. 첨부 ' + attachedPageCount + '장 / 바로 처리 가능 ' + printableCount + '장</div>' +
        '<button type="button" class="primary" onclick="downloadAllDocsBundle(\'' + escapeJs(code) + '\')">전체 다운로드</button>' +
        '<button type="button" class="primary" onclick="printAllDocs(\'' + escapeJs(code) + '\')">전체 프린트</button>' +
        '<button type="button" class="ghost" onclick="selectAllPrintDocs(true)">전체선택</button>' +
        '<button type="button" class="secondary" onclick="selectAllPrintDocs(false)">선택해제</button>' +
        '<button type="button" class="okBtn" onclick="downloadSelectedDocsBundle(\'' + escapeJs(code) + '\')">선택 다운로드</button>' +
        '<button type="button" class="okBtn" onclick="printSelectedDocs(\'' + escapeJs(code) + '\')">선택 프린트</button>' +
      '</div>';
    }

    function renderManagerDocLine(doc, code, index) {
      const title = (doc.groupTitle ? doc.groupTitle + ' - ' : '') + doc.title;
      const pages = getDocPagesFromDoc(doc);
      const pageText = pages.length ? ' · ' + pages.length + '장' : '';
      const expiryText = doc.expireDate ? ' / ' + escapeHtml(getExpiryPeriodLabel(doc) + ' ' + getDdayTextWithDays(doc.expireDate)) : '';
      const statusText = escapeHtml(doc.status || getDocStatus(doc)) + pageText + expiryText;
      const hasPrintablePreview = docHasPrintablePreview(doc);
      const previewHtml = renderPreviewHtmlForPublic(doc, code) || (doc.fileName ? '<div class="preview-wrap show"><div class="preview-title"><span>첨부 파일</span></div><div class="preview-pdf">첨부됨<br><span class="small">이미지 저장본이 없으면 서버 저장 단계에서 원본 파일 보기로 연결합니다.</span></div>' + renderIdExtraStrip(doc) + '</div>' : '');
      const disabledNote = (doc.fileName && !hasPrintablePreview) ? '<div class="print-disabled-note">현재 이 첨부는 이미지 저장본이 없어 바로 인쇄는 제한될 수 있습니다. 서버 저장 단계에서 원본 보기/인쇄로 연결합니다.</div>' : '';
      return '<div class="manager-doc-card" data-public-doc-key="' + escapeHtml(doc.key) + '">' +
        '<div class="manager-doc-row"><label><input type="checkbox" data-print-doc-check value="' + escapeHtml(doc.key) + '" ' + (!doc.fileName ? 'disabled' : '') + ' /> <span>' + (index + 1) + '. ' + escapeHtml(title) + '</span></label><span class="badge ' + (doc.fileName ? 'done' : (doc.required ? 'need' : '')) + '">' + (doc.fileName ? statusText : (doc.required ? '미첨부' : '선택안함')) + '</span></div>' +
        previewHtml + disabledNote +
      '</div>';
    }

    function copyManagerCode(code) {
      const item = getShortcutItem(code);
      if (!item) return;
      if (!canUseQrShareItems([item], '담당자 QR·링크 복사')) return;
      const expireAt = getManagerExpireAt(item);
      const link = makeManagerLink(item.code, expireAt);
      const text = 'SitePass 담당자 서류 다운로드/프린트입니다.\n' +
        '장비: ' + getItemTitle(item) + '\n' +
        'QR·링크: ' + link + '\n' +
        '만료일: ' + getManagerExpireText(expireAt) + '\n' +
        '7일 뒤에는 담당자 QR·링크 접속이 차단됩니다.';
      copyTextFallback(text, '담당자 QR·링크를 복사했습니다.\n카톡이나 문자에 붙여넣으면 담당자가 코드 입력 없이 바로 열 수 있습니다.');
    }

    function downloadAllDocsBundle(code) {
      const item = getItemByCode(code);
      if (!item) return;
      downloadDocsBundle(item, getDisplayDocs(item), '전체서류');
    }

    function downloadSelectedDocsBundle(code) {
      const item = getItemByCode(code);
      if (!item) return;
      const keys = getSelectedPrintDocKeys();
      if (!keys.length) { alert('다운로드할 서류를 체크해주세요.'); return; }
      downloadDocsBundle(item, getDocsByKeys(item, keys), '선택서류');
    }

    function downloadSingleDocBundle(code, key) {
      const item = getItemByCode(code);
      if (!item) return;
      downloadDocsBundle(item, getDocsByKeys(item, [key]), '단일서류');
    }

    function downloadDocsBundle(item, docs, label) {
      const out = getDocumentOutputModule();
      if (out.downloadDocsBundle) return out.downloadDocsBundle(item, docs, label, getDocumentOutputDeps());
      alert('문서 다운로드 기능 파일을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    }


    function buildDownloadHtml(item, pages, blockedPages) {
      const out = getDocumentOutputModule();
      if (out.buildDownloadHtml) return out.buildDownloadHtml(item, pages, blockedPages, getDocumentOutputDeps());
      return buildPrintHtml(item, pages, blockedPages);
    }


    function renderPublicDocLine(doc, code, index) {
      const title = (doc.groupTitle ? doc.groupTitle + ' - ' : '') + doc.title;
      const pages = getDocPagesFromDoc(doc);
      const pageText = pages.length ? ' · ' + pages.length + '장' : '';
      const expiryText = doc.expireDate ? ' / ' + escapeHtml(getExpiryPeriodLabel(doc) + ' ' + getDdayTextWithDays(doc.expireDate)) : '';
      const statusText = escapeHtml(doc.status || getDocStatus(doc)) + pageText + expiryText;
      const hasPrintablePreview = docHasPrintablePreview(doc);
      const disabledNote = (doc.fileName && !hasPrintablePreview) ? '<div class="print-disabled-note">현재 이 첨부는 이미지 저장본이 없어 바로 인쇄는 제한될 수 있습니다. 서버 저장 단계에서 원본 파일 인쇄로 연결합니다.</div>' : '';
      const previewHtml = renderPreviewHtmlForPublic(doc, code) || (doc.fileName ? '<div class="preview-wrap show"><div class="preview-title"><span>첨부 파일</span></div><div class="preview-pdf">첨부됨<br><span class="small">이미지 저장본이 없으면 서버 저장 단계에서 원본 파일 보기로 연결합니다.</span></div>' + renderIdExtraStrip(doc) + '</div>' : '');
      return '<div class="public-doc-card printable" data-public-doc-key="' + escapeHtml(doc.key) + '">' +
        '<div class="doc-head"><label class="print-check-label"><input type="checkbox" data-print-doc-check value="' + escapeHtml(doc.key) + '" ' + (!doc.fileName ? 'disabled' : '') + ' /> <span>' + (index + 1) + '. ' + escapeHtml(title) + '</span></label><span class="badge ' + (doc.fileName ? 'done' : (doc.required ? 'need' : '')) + '">' + (doc.fileName ? statusText : (doc.required ? '미첨부' : '선택안함')) + '</span></div>' +
        previewHtml + disabledNote + '</div>';
    }

    function renderPreviewHtmlForPublic(doc, code) {
      const pages = getDocPagesFromDoc(doc);
      if (!pages.length) return renderPreviewHtml(doc);
      const extraStrip = renderIdExtraStrip(doc);
      const label = makeDocFileTopLabel(doc, code);
      return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 ' + pages.length + '장 이미지</span></div>' + renderPagesListHtml(pages, { imageOnly:true, readonly:true, docKey:doc.key, code:code, docLabel:label }) + renderDocExpiryStrip(doc) + extraStrip + '</div>';
    }

    function renderPublic(code) {
      const item = getItems().find(x => x.code === code);
      if (!item) {
        document.getElementById('publicBox').innerHTML = '<div class="empty">조회할 수 없는 코드입니다.</div>';
        showScreen('publicScreen');
        return;
      }
      currentDetailLink = item.qrLink;
      if (isServiceShareBlocked(item)) {
        document.getElementById('publicBox').innerHTML = renderServiceBlockedBox(item);
        showScreen('publicScreen');
        return;
      }
      const paused = isQrPaused(item);
      const recipientView = getRecipientViewModule();
      const publicDocs = getDisplayDocs(item);
      const docHtml = publicDocs.map((doc, index) => renderPublicDocLine(doc, item.code, index)).join('');
      document.getElementById('publicBox').innerHTML =
        '<div class="manager-received-hero"><div class="eyebrow">QR 서류 확인 화면</div><h3>' + escapeHtml(getShareItemLabel(item)) + ' 서류</h3><p>QR을 찍은 현장 담당자가 보는 화면입니다. 장비명과 장비번호를 먼저 보여줍니다.</p></div>' +
        '<div class="line"><b>장비 등록번호</b><span>' + escapeHtml(item.equipmentNo) + '</span></div>' +
        '<div class="line"><b>장비명</b><span>' + escapeHtml(item.equipmentName) + '</span></div>' +
        '<div class="line"><b>포함서류</b><span>' + escapeHtml(getIncludedGroupText(item)) + '</span></div>' +
        renderD7DeadlineNotice(item) +
        '<div class="line"><b>서비스상태</b><span>' + escapeHtml(getServiceStatusText(item)) + '</span></div>' +
        renderShortcutPanel(item) +
        renderPrintToolbar(item, true) +
        '<h3 style="margin-top:14px">서류 상태</h3>' + renderPrintSelectRow(item.code) + (docHtml || '<div class="empty">표시할 서류가 없습니다.</div>') +
        (recipientView.renderSponsorBox ? recipientView.renderSponsorBox() : '<div class="sponsor-box"><div class="small">운영·개발: 제이에스건설</div><a href="https://www.songwongeo.co.kr" target="_blank" rel="noopener">송원건설 홈페이지 바로가기</a></div>');
      showScreen('publicScreen');
    }


    function renderPrintToolbar(item, showSelection) {
      if (!item) return '';
      const recipientView = getRecipientViewModule();
      if (recipientView.renderDownloadToolbar) {
        return recipientView.renderDownloadToolbar(item, {
          mode:'public',
          showSelection: !!showSelection,
          deps:{ getDisplayDocs, getDocPagesFromDoc, expandPrintablePages, escapeJs }
        });
      }
      const code = item.code || '';
      const printableCount = getDisplayDocs(item).reduce((sum, doc) => sum + expandPrintablePages([doc]).length, 0);
      const attachedPageCount = getDisplayDocs(item).reduce((sum, doc) => sum + getDocPagesFromDoc(doc).length, 0);
      return '<div class="print-toolbar download-toolbar">' +
        '<div class="print-help full">필요한 서류를 체크하고 상단 버튼으로 다운로드/프린트하세요. 첨부 ' + attachedPageCount + '장 / 바로 처리 가능 ' + printableCount + '장</div>' +
        '<button type="button" class="okBtn" onclick="downloadAllDocsBundle(\'' + escapeJs(code) + '\')">전체 서류 다운로드</button>' +
        '<button type="button" class="primary" onclick="printAllDocs(\'' + escapeJs(code) + '\')">전체 서류 인쇄</button>' +
        (showSelection ? '<button type="button" class="ghost" onclick="selectAllPrintDocs(true)">전체선택</button>' : '') +
        (showSelection ? '<button type="button" class="secondary" onclick="selectAllPrintDocs(false)">선택해제</button>' : '') +
        (showSelection ? '<button type="button" class="okBtn" onclick="downloadSelectedDocsBundle(\'' + escapeJs(code) + '\')">선택 다운로드</button>' : '<button type="button" class="okBtn" onclick="openQrPublicView(\'' + escapeJs(code) + '\')">선택 다운로드</button>') +
        (showSelection ? '<button type="button" class="primary" onclick="printSelectedDocs(\'' + escapeJs(code) + '\')">선택 인쇄</button>' : '<button type="button" class="primary" onclick="openQrPublicView(\'' + escapeJs(code) + '\')">선택 인쇄</button>') +
      '</div>';
    }

    function renderPrintSelectRow(code) {
      return '';
    }

    function selectAllPrintDocs(checked) {
      document.querySelectorAll('[data-print-doc-check]').forEach(input => {
        if (!input.disabled) input.checked = !!checked;
      });
    }

    function toggleSinglePrintCheck(key) {
      const input = document.querySelector('[data-print-doc-check][value="' + cssEscapeValue(key) + '"]');
      if (input && !input.disabled) input.checked = !input.checked;
    }

    function getSelectedPrintKeys() {
      return Array.from(document.querySelectorAll('[data-print-doc-check]:checked')).map(input => input.value);
    }

    function getSelectedPrintDocKeys() {
      return getSelectedPrintKeys();
    }

    function openPublicDocPreview(code, key) {
      const item = getItemByCode(code);
      const doc = item ? getDisplayDocs(item).find(d => d.key === key) : null;
      if (!doc || !doc.fileName) { alert('미첨부 서류입니다.'); return; }
      const pages = getDocPagesFromDoc(doc);
      const firstPreview = pages.find(page => page.previewDataUrl);
      if (firstPreview) { openPreviewModal(firstPreview.previewDataUrl); return; }
      if (doc.previewDataUrl) { openPreviewModal(doc.previewDataUrl); return; }
      alert('현재 베타 저장본에는 크게 볼 이미지가 없습니다.\nPDF 원본보기/서버 파일보기는 다음 서버 저장 단계에서 붙입니다.\n\n파일명: ' + (doc.fileName || ''));
    }

    function printAllDocs(code) {
      const item = getItemByCode(code);
      if (!item) { alert('인쇄할 코드를 찾을 수 없습니다.'); return; }
      const docs = getDocsByKeys(item);
      printDocs(item, docs);
    }

    function printSelectedDocs(code) {
      const item = getItemByCode(code);
      if (!item) { alert('인쇄할 코드를 찾을 수 없습니다.'); return; }
      const keys = getSelectedPrintKeys();
      if (!keys.length) { alert('인쇄할 서류를 체크해주세요.'); return; }
      const docs = getDocsByKeys(item, keys);
      printDocs(item, docs);
    }

    function printSingleDoc(code, key) {
      const item = getItemByCode(code);
      if (!item) { alert('인쇄할 코드를 찾을 수 없습니다.'); return; }
      const docs = getDocsByKeys(item, [key]);
      printDocs(item, docs);
    }

    function printDocs(item, docs) {
      const out = getDocumentOutputModule();
      if (out.printDocs) return out.printDocs(item, docs, getDocumentOutputDeps());
      alert('문서 인쇄 기능 파일을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    }


    function expandPrintablePages(docs) {
      const out = getDocumentOutputModule();
      if (out.expandPrintablePages) return out.expandPrintablePages(docs, getDocumentOutputDeps());
      return [];
    }


    function expandBlockedPages(docs) {
      const out = getDocumentOutputModule();
      if (out.expandBlockedPages) return out.expandBlockedPages(docs, getDocumentOutputDeps());
      return [];
    }


    function buildPrintHtml(item, pages, blockedPages) {
      const out = getDocumentOutputModule();
      if (out.buildPrintHtml) return out.buildPrintHtml(item, pages, blockedPages, getDocumentOutputDeps());
      return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>SitePass</title></head><body>문서 인쇄 기능 파일을 불러오지 못했습니다.</body></html>';
    }


    function renderPlainExtra(doc) {
      const out = getDocumentOutputModule();
      if (out.renderPlainExtra) return out.renderPlainExtra(doc, getDocumentOutputDeps());
      return '';
    }


    function cssEscapeValue(value) {
      if (window.CSS && CSS.escape) return CSS.escape(String(value || ''));
      return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }


    function getShortcutName(item) {
      const name = String(item?.equipmentName || '장비명없음').replace(/\s+/g, '');
      const no = String(item?.equipmentNo || '장비번호없음').replace(/\s+/g, '');
      return name + '_' + no + '_서류';
    }

    function getManagerExpireAt(item) {
      if (!item) return Date.now() + (7 * 24 * 60 * 60 * 1000);
      return item.managerExpireAt ? new Date(item.managerExpireAt).getTime() : new Date(addDaysIso(item.createdAt || new Date().toISOString(), 7)).getTime();
    }

    function getManagerExpireText(itemOrExpireAt) {
      const time = typeof itemOrExpireAt === 'number' ? itemOrExpireAt : getManagerExpireAt(itemOrExpireAt);
      return new Date(time).toLocaleString('ko-KR');
    }

    function isManagerExpired(item, expireAt) {
      const time = expireAt ? Number(expireAt) : getManagerExpireAt(item);
      return Date.now() > time;
    }

    function makeManagerShareToken() {
      const qrShare = getQrShareModule();
      if (qrShare.makeManagerShareToken) return qrShare.makeManagerShareToken();
      return 'MST-' + Date.now().toString(36).toUpperCase() + '-' + randomCodeBlock(4) + '-' + randomCodeBlock(4) + '-' + randomCodeBlock(4);
    }

    function getOrCreateManagerShareToken(code) {
      const items = getItems();
      const idx = items.findIndex(x => String(x.code || '') === String(code || ''));
      if (idx < 0) return '';
      if (!items[idx].managerShareToken) {
        items[idx].managerShareToken = makeManagerShareToken();
        items[idx].updatedAt = new Date().toISOString();
        setItems(items);
      }
      return items[idx].managerShareToken || '';
    }

    function makeManagerLinkSignature(code, expireAt, token) {
      const qrShare = getQrShareModule();
      if (qrShare.makeManagerLinkSignatureRaw) return qrShare.makeManagerLinkSignatureRaw(code, expireAt, token);
      const seed = String(code || '') + '|' + String(expireAt || '') + '|' + String(token || '');
      let hash = 2166136261;
      for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return Math.abs(hash >>> 0).toString(36).toUpperCase().padStart(8, '0').slice(-8);
    }

    function getManagerLinkSignature(code, expireAt) {
      const token = getOrCreateManagerShareToken(code);
      if (!token) return '';
      return makeManagerLinkSignature(code, expireAt, token);
    }

    function isManagerLinkSignatureValid(item, expireAt, sig) {
      if (!item) return false;
      if (!expireAt) return true;
      const token = item.managerShareToken || getOrCreateManagerShareToken(item.code || '');
      if (!token || !sig) return false;
      const expected = makeManagerLinkSignature(item.code || '', expireAt, token);
      return String(expected) === String(sig || '');
    }

    function makeManagerLink(code, expireAt) {
      const qrShare = getQrShareModule();
      if (qrShare.makeManagerLink) return qrShare.makeManagerLink(code, expireAt, getManagerLinkSignature);
      const baseUrl = window.location.href.split('#')[0];
      const exp = expireAt || getSevenDaysFromNowMs();
      const sig = getManagerLinkSignature(code, exp);
      return baseUrl + '#manager=' + encodeURIComponent(code || '') + '&exp=' + encodeURIComponent(String(exp)) + '&sig=' + encodeURIComponent(sig);
    }

    function parseManagerHash(hash) {
      const qrShare = getQrShareModule();
      if (qrShare.parseManagerHash) return qrShare.parseManagerHash(hash);
      const value = String(hash || window.location.hash || '');
      if (!value.startsWith('#manager=')) return { code:'', exp:undefined, sig:'' };
      const raw = value.replace('#manager=', '');
      const parts = raw.split('&');
      const code = decodeURIComponent(parts.shift() || '');
      let exp;
      let sig = '';
      parts.forEach(part => {
        const pair = part.split('=');
        const key = decodeURIComponent(pair[0] || '');
        const val = decodeURIComponent(pair.slice(1).join('=') || '');
        if (key === 'exp') exp = Number(val);
        if (key === 'sig') sig = val;
      });
      return { code, exp, sig };
    }

    function refreshManagerShare(code) {
      const items = getItems();
      const idx = items.findIndex(x => x.code === code);
      if (idx < 0) { alert('갱신할 코드를 찾을 수 없습니다.'); return; }
      items[idx].managerExpireAt = addDaysIso(new Date().toISOString(), 7);
      items[idx].updatedAt = new Date().toISOString();
      setItems(items);
      alert('담당자용 QR·링크 유효기간을 오늘부터 7일로 다시 갱신했습니다.\n만료일: ' + getManagerExpireText(items[idx]));
      renderDetail(code);
    }

    function renderShortcutPanel(item) {
      if (!item) return '';
      const name = getShortcutName(item);
      const expireAt = getManagerExpireAt(item);
      const managerLink = makeManagerLink(item.code || '', expireAt);
      return '<div class="shortcut-panel">' +
        '<b>담당자용 직접공유 7일 접속</b>' +
        '<div class="small">담당자 PC 바탕화면이나 휴대폰 홈화면에 보일 이름</div>' +
        '<div class="shortcut-name">' + escapeHtml(name) + '</div>' +
        '<div class="manager-expire-box">담당자 QR·링크 만료일: ' + escapeHtml(getManagerExpireText(expireAt)) + '<br>7일 후에는 담당자 다운로드/프린트 창만 열리지 않습니다. 장비업자 원본코드는 유지됩니다.</div>' +
        '<div class="actions">' +
          '<button type="button" class="primary" onclick="downloadShortcutFile(\'' + escapeJs(item.code || '') + '\')">담당자 바탕화면 파일</button>' +
          '<button type="button" class="okBtn" onclick="openManagerPublicView(\'' + escapeJs(item.code || '') + '\')">담당자 화면 열기</button>' +
          '<button type="button" class="ghost" onclick="copyManagerCode(\'' + escapeJs(item.code || '') + '\')">담당자 링크 복사</button>' +
          '<button type="button" class="secondary" onclick="refreshManagerShare(\'' + escapeJs(item.code || '') + '\')">7일 갱신</button>' +
        '</div>' +
        '<div class="small">담당자에게 주는 카톡 링크·문자 링크·QR은 코드 입력 없이 바로 열리고 7일 유효입니다. 담당자는 다운로드·프린트 전용 화면만 봅니다.</div>' +
      '</div>';
    }

    function getShortcutItem(code) {
      const item = getItemByCode(code);
      if (!item) alert('바로가기를 만들 코드를 찾을 수 없습니다.');
      return item;
    }

    function downloadShortcutFile(code) {
      const item = getShortcutItem(code);
      if (!item) return;
      const name = getShortcutName(item);
      const expireAt = getManagerExpireAt(item);
      const link = makeManagerLink(item.code, expireAt);
      const expireDateText = new Date(expireAt).toLocaleString('ko-KR');
      const safeName = escapeHtml(name);
      const safeCode = escapeHtml(item.code || '');
      const shortcutScript = `
        (function(){
          var expireAt = ${expireAt};
          var link = ${JSON.stringify(link)};
          var now = Date.now();
          var card = document.getElementById('card');
          var content = document.getElementById('content');
          if (now > expireAt) {
            card.className += ' expired';
            content.innerHTML = '<div class="warn"><b>만료된 담당자 바로가기입니다.</b><br>이 파일은 발급 후 7일이 지나 더 이상 다운로드/프린트 창을 열 수 없습니다.<br>장비업자에게 새 QR·링크를 다시 받아주세요.</div>';
            return;
          }
          var p = document.createElement('p');
          p.className = 'muted';
          p.textContent = '자동으로 담당자 다운로드/프린트 창을 엽니다. 7일 후에는 이 바로가기 접속이 차단됩니다. 자동으로 열리지 않으면 아래 버튼을 누르세요.';
          var a = document.createElement('a');
          a.className = 'btn';
          a.href = link;
          a.textContent = '다운로드/프린트 창 열기';
          content.innerHTML = '';
          content.appendChild(p);
          content.appendChild(a);
          setTimeout(function(){ location.href = link; }, 450);
        })();
      `;
      const html = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + safeName + '</title>' +
        '<style>' +
          'body{margin:0;font-family:Arial,\'Noto Sans KR\',sans-serif;background:#f3f6fb;color:#172033;line-height:1.6}' +
          '.wrap{max-width:520px;margin:0 auto;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:22px}' +
          '.card{width:100%;background:white;border:1px solid #d7dfed;border-radius:20px;box-shadow:0 10px 28px rgba(23,32,51,.10);padding:22px}' +
          'h1{font-size:24px;margin:0 0 10px;letter-spacing:-.6px}.muted{color:#667085;font-size:14px}.code{padding:12px;border-radius:14px;background:#f8fbff;border:1px dashed #b9c9f3;font-weight:900;margin:14px 0;word-break:break-all}' +
          '.btn{display:flex;align-items:center;justify-content:center;min-height:48px;margin-top:12px;padding:12px 16px;border-radius:14px;background:#2457d6;color:#fff;text-decoration:none;font-weight:900}' +
          '.expired .btn{background:#eef2f8;color:#667085;pointer-events:none}.warn{padding:12px;border-radius:14px;background:#fff7e6;border:1px solid #ffd591;color:#694000;font-size:14px;margin-top:12px}' +
        '</style></head><body>' +
        '<div class="wrap"><div id="card" class="card"><h1>' + safeName + '</h1><p class="muted">SitePass 담당자 다운로드/프린트 바로가기입니다.</p><div class="code">유효기간: ' + escapeHtml(expireDateText) + '까지<br>7일 후 담당자 접속 차단</div><div id="content">확인중입니다.</div></div></div>' +
        '<script>' + shortcutScript + '</scr' + 'ipt></body></html>';
      const blob = new Blob([html], { type:'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sanitizeFileName(name) + '.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
      alert('담당자용 7일 바탕화면 파일을 내려받았습니다.\n파일 이름: ' + name + '.html\n만료일: ' + expireDateText + '\n\n담당자는 이 파일로 다운로드/프린트 창만 열 수 있습니다. 7일 후에는 담당자 QR·링크·바로가기 접속만 만료됩니다.');
    }

    function showPhoneHomeGuide(code) {
      const item = getShortcutItem(code);
      if (!item) return;
      const name = getShortcutName(item);
      copyTextFallback(name);
      alert('휴대폰 홈화면 추가 방법\n\n1. 카톡 공유 또는 문자 공유로 받은 담당자 링크를 휴대폰에서 엽니다.\n2. 브라우저 메뉴(⋮ 또는 공유 버튼)를 누릅니다.\n3. [홈 화면에 추가]를 누릅니다.\n4. 이름을 아래처럼 넣으면 됩니다.\n\n' + name + '\n\n이름은 복사해두었습니다.');
    }

    function copyShortcutName(code) {
      const item = getShortcutItem(code);
      if (!item) return;
      const name = getShortcutName(item);
      copyTextFallback(name, '바탕화면/홈화면 이름을 복사했습니다.\n' + name);
    }

    function copyTextFallback(text, successMessage) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          if (successMessage) alert(successMessage);
        }).catch(() => prompt('아래 내용을 복사하세요.', text));
      } else {
        prompt('아래 내용을 복사하세요.', text);
      }
    }

    function sanitizeFileName(name) {
      return String(name || 'SitePass 장비서류').replace(/[\\/:*?"<>|]/g, '_').trim() || 'SitePass 장비서류';
    }

    function copyCodeText(code) {
      alert('담당자에게는 코드를 보내지 않고, 카톡 공유/문자 공유로 7일 만료 QR·링크를 보내면 됩니다.');
    }

    function copyQrLink() {
      if (!currentDetailLink) { alert('복사할 QR·링크가 없습니다.'); return; }
      const freshLink = getFreshCurrentManagerLink();
      if (!freshLink) return;
      copyTextFallback('SitePass 담당자 서류 다운로드/프린트입니다.\nQR·링크: ' + freshLink + '\n7일 뒤에는 담당자 QR·링크 접속이 차단됩니다.', '담당자 QR·링크를 복사했습니다.\n카톡이나 문자에 붙여넣으면 됩니다.');
    }

    function getFreshCurrentManagerLink() {
      const code = getCodeFromManagerLink(currentDetailLink);
      if (!code) return currentDetailLink;
      const item = getItemByCode(code);
      if (item && !canUseQrShareItems([item], '담당자 QR·링크 보내기')) return '';
      const items = refreshManagerExpiryForCodes([code]);
      if (!items.length) return currentDetailLink;
      currentDetailLink = makeManagerLink(items[0].code, getManagerExpireAt(items[0]));
      return currentDetailLink;
    }

    function shareQrLink() {
      if (!currentDetailLink) { alert('공유할 QR·링크가 없습니다.'); return; }
      const freshLink = getFreshCurrentManagerLink();
      if (!freshLink) return;
      const text = 'SitePass 담당자 서류 다운로드/프린트입니다.\nQR·링크를 누르면 코드 입력 없이 바로 열립니다.\n7일 뒤에는 담당자 QR·링크 접속이 차단됩니다.';
      if (navigator.share) {
        navigator.share({ title:'SitePass 담당자 서류', text, url: freshLink }).catch(() => {});
      } else {
        copyTextFallback(text + '\n' + freshLink, '담당자 QR·링크를 복사했습니다.\n카톡이나 문자에 붙여넣으면 됩니다.');
      }
    }

    function shareSmsLink() {
      if (!currentDetailLink) { alert('공유할 QR·링크가 없습니다.'); return; }
      const freshLink = getFreshCurrentManagerLink();
      if (!freshLink) return;
      const text = 'SitePass 담당자 서류 다운로드/프린트입니다.\nQR·링크를 누르면 코드 입력 없이 바로 열립니다.\n7일 뒤에는 담당자 QR·링크 접속이 차단됩니다.\n' + freshLink;
      openSmsShare(text);
    }

    function shareEmailLink() {
      if (!currentDetailLink) { alert('공유할 QR·링크가 없습니다.'); return; }
      const freshLink = getFreshCurrentManagerLink();
      if (!freshLink) return;
      const text = 'SitePass 담당자 서류 다운로드/프린트입니다.\nQR·링크를 누르면 코드 입력 없이 바로 열립니다.\n7일 뒤에는 담당자 QR·링크 접속이 차단됩니다.\n' + freshLink;
      const item = getItemByCode(getCodeFromManagerLink(currentDetailLink));
      openEmailShare(text, item ? [item] : []);
    }


    function getPendingRegistration() {
      if (pendingRegistrationItemMemory && pendingRegistrationItemMemory.item) return normalizePendingRegistrationTier(pendingRegistrationItemMemory);
      try {
        const raw = sessionStorage.getItem(PENDING_REGISTRATION_KEY) || localStorage.getItem(PENDING_REGISTRATION_KEY) || '';
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.item) {
          pendingRegistrationItemMemory = normalizePendingRegistrationTier(parsed);
          return pendingRegistrationItemMemory;
        }
      } catch (e) {}
      return null;
    }

    function setPendingRegistration(pending) {
      pendingRegistrationItemMemory = pending || null;
      let saved = false;
      try { sessionStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pending || null)); saved = true; } catch (e) {}
      try { localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pending || null)); saved = true; } catch (e) {}
      return saved || !!pendingRegistrationItemMemory;
    }

    function clearPendingRegistration() {
      pendingRegistrationItemMemory = null;
      try { sessionStorage.removeItem(PENDING_REGISTRATION_KEY); } catch (e) {}
      try { localStorage.removeItem(PENDING_REGISTRATION_KEY); } catch (e) {}
    }

    function openPendingRegistrationPaymentScreen(pending) {
      // v23.7.152 - 휴대폰/PWA에서 추가등록 저장 후 결제화면으로 안 넘어가는 문제 보강
      // 결제 대기정보는 메모리에도 유지하고, 화면 전환이 막히면 수동으로 pricingScreen을 열어줍니다.
      if (pending && pending.item) pendingRegistrationItemMemory = pending;
      try { restorePwaAutoMemberSession(); } catch (e) {}

      const forceOpenPricing = function() {
        const pricing = document.getElementById('pricingScreen');
        if (!pricing) return false;
        document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
        pricing.classList.remove('hidden');
        try { renderPricingScreen(); } catch (e) { console.warn('결제화면 렌더링 보강 처리:', e); }
        try { refreshAdminUi(); } catch (e) {}
        sitePassCurrentScreenId = 'pricingScreen';
        try { rememberSitePassScreen('pricingScreen', { replace:true }); } catch (e) {}
        try { window.scrollTo({ top:0, behavior:'smooth' }); } catch (e) { window.scrollTo(0, 0); }
        return true;
      };

      try {
        showScreen('pricingScreen');
      } catch (e) {
        console.warn('결제화면 이동 실패, 강제 이동 처리:', e);
        forceOpenPricing();
      }

      setTimeout(function() {
        const pricing = document.getElementById('pricingScreen');
        const visible = pricing && !pricing.classList.contains('hidden');
        if (!visible && (isMemberLoggedIn() || isAdminLoggedIn() || getPendingRegistration())) {
          forceOpenPricing();
        }
      }, 80);
    }

    function isActivePaidEquipmentForRegistrationCount(item) {
      if (!item || !item.code) return false;
      const raw = [item.serviceStatus, item.paymentStatus, item.paymentPlan, item.basicPlan, item.saveReason].map(v => String(v || '').toLowerCase()).join(' ');
      if (item.isDeleted || item.is_deleted || item.deletedAt || item.withdrawnAt) return false;
      if (raw.indexOf('orphan_deleted') >= 0 || raw.indexOf('withdrawn') >= 0 || raw.indexOf('deleted') >= 0 || raw.indexOf('탈퇴') >= 0 || raw.indexOf('삭제') >= 0) return false;
      if (raw.indexOf('결제대기') >= 0 || raw.indexOf('pending') >= 0 || raw.indexOf('미결제') >= 0) return false;
      return raw.indexOf('등록결제완료') >= 0 || raw.indexOf('결제완료') >= 0 || raw.indexOf('유료사용') >= 0 || !!item.paidAt || !!item.trialEndsAt;
    }

    function isSameEquipmentOwnerForRegistrationCount(item, member) {
      if (!member) return true;
      const memberKeys = [member.id, member.signupId, member.providerId, member.supabaseLoginId, member.authUserId, member.phone, member.name]
        .map(v => String(v || '').trim().toLowerCase()).filter(Boolean);
      if (!memberKeys.length) return true;
      const ownerKeys = [item.ownerMemberId, item.ownerSignupId, item.ownerProviderId, item.ownerName, item.ownerPhone]
        .map(v => String(v || '').trim().toLowerCase()).filter(Boolean);
      if (!ownerKeys.length) return true; // 기존 저장자료는 소유자 키가 없을 수 있어 기존 사용자를 위해 포함합니다.
      return ownerKeys.some(k => memberKeys.includes(k));
    }

    function getActivePaidRegistrationItemsForCurrentOwner(member, excludeCode) {
      const code = String(excludeCode || '');
      return getItems().filter(item => {
        if (code && String(item.code || '') === code) return false;
        return isActivePaidEquipmentForRegistrationCount(item) && isSameEquipmentOwnerForRegistrationCount(item, member || null);
      });
    }

    function normalizePendingRegistrationTier(pending) {
      if (!pending || !pending.item) return pending;
      const member = getEquipmentRegistrationOwnerMember ? getEquipmentRegistrationOwnerMember() : (getCurrentMemberTest() || null);
      const paidCount = getActivePaidRegistrationItemsForCurrentOwner(member, pending.item.code).length;
      const fixedTier = paidCount > 0 ? 'additional' : 'first';
      if (pending.paymentTier !== fixedTier) {
        pending = { ...pending, paymentTier: fixedTier, fixedAt: new Date().toISOString(), fixedReason: 'active_paid_equipment_count' };
        pendingRegistrationItemMemory = pending;
        try { sessionStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pending)); } catch (e) {}
        try { localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pending)); } catch (e) {}
      }
      return pending;
    }

    function hasRegisteredEquipmentBundle() {
      return getActivePaidRegistrationItemsForCurrentOwner(getCurrentMemberTest() || null, '').length > 0;
    }

    function updateHomeRegistrationButton() {
      const btn = document.getElementById('homeRegisterButton');
      if (!btn) return;
      btn.textContent = hasRegisteredEquipmentBundle() ? '장비/기사/인력 추가등록' : '장비/기사/인부 등록';
    }

    function getPendingRegistrationTierText(pending) {
      const additional = pending ? pending.paymentTier === 'additional' : isAdditionalRegistrationContext();
      return additional ? '2대부터 추가등록' : '첫 장비 1대 등록';
    }

    function renderPendingRegistrationPaymentBox() {
      const box = document.getElementById('pendingRegistrationPaymentBox');
      if (!box) return;
      const pending = getPendingRegistration();
      if (!pending || !pending.item) {
        box.classList.add('hidden');
        box.innerHTML = '';
        return;
      }
      const item = pending.item;
      const tierText = getPendingRegistrationTierText(pending);
      const member = getCurrentMemberTest() || {};
      box.classList.remove('hidden');
      box.innerHTML = '<div class="pending-pay-head"><b>결제 대기 중인 등록서류</b><span>' + escapeHtml(tierText) + '</span></div>' +
        '<div class="pay-pending-summary"><b>' + escapeHtml(item.equipmentName || '장비명 없음') + '</b><span>' + escapeHtml(item.equipmentNo || '번호 없음') + '</span></div>' +
        '<div class="payment-owner-verify-box" id="paymentOwnerVerifyBox">' +
          '<div class="payment-owner-title"><b id="paymentOwnerMethodTitle">카드결제 정보 입력</b><span>현재 테스트 결제</span></div>' +
          '<div class="payment-method-buttons" role="group" aria-label="결제수단 선택">' +
            '<button type="button" class="active" data-payment-owner-method="card" onclick="setPaymentOwnerMethod(\'card\')">카드결제</button>' +
            '<button type="button" data-payment-owner-method="phone" onclick="setPaymentOwnerMethod(\'phone\')">휴대폰결제</button>' +
            '<button type="button" data-payment-owner-method="account" onclick="setPaymentOwnerMethod(\'account\')">계좌이체</button>' +
          '</div>' +
          '<div id="paymentOwnerCommonBox">' +
            '<div class="person-auth-grid">' +
              '<input id="paymentOwnerName" type="text" placeholder="명의자 이름" value="' + escapeHtml(member.name || '') + '" autocomplete="name" />' +
              '<input id="paymentOwnerJuminMasked" type="text" placeholder="주민번호 예: 840507-1" maxlength="8" inputmode="numeric" autocomplete="off" oninput="limitPaymentOwnerJuminInput()" onpaste="setTimeout(limitPaymentOwnerJuminInput,0)" onblur="formatPaymentOwnerJuminDisplay()" />' +
            '</div>' +
          '</div>' +
          '<div id="paymentOwnerCardBox">' +
            '<div class="person-auth-grid">' +
              '<select id="paymentCardCompany"><option value="">카드사 선택</option><option value="신한카드">신한카드</option><option value="삼성카드">삼성카드</option><option value="국민카드">국민카드</option><option value="현대카드">현대카드</option><option value="롯데카드">롯데카드</option><option value="하나카드">하나카드</option><option value="우리카드">우리카드</option><option value="BC카드">BC카드</option><option value="농협카드">농협카드</option></select>' +
              '<input id="paymentCardNumber" type="text" placeholder="카드번호 0000 0000 0000 0000" inputmode="numeric" autocomplete="cc-number" oninput="formatPaymentCardNumberInput(this)" />' +
            '</div>' +
            '<div class="person-auth-grid">' +
              '<input id="paymentCardExpiry" type="text" placeholder="유효기간 MM/YY" inputmode="numeric" maxlength="5" autocomplete="cc-exp" oninput="limitPaymentCardExpiryInput(this)" />' +
              '<input id="paymentCardPassword2" type="password" placeholder="비밀번호 앞 2자리" inputmode="numeric" maxlength="2" autocomplete="off" />' +
            '</div>' +
            '<div class="auth-mini-note">실제 카드 승인 전 단계입니다. 지금 입력값은 테스트 확인용이며 정식 결제는 PG사 연결 후 처리합니다.</div>' +
          '</div>' +
          '<div id="paymentOwnerPhoneBox" class="hidden">' +
            '<div class="person-auth-grid">' +
              '<select id="paymentOwnerCarrier"><option value="">통신사 선택</option><option value="SKT">SKT</option><option value="KT">KT</option><option value="LG U+">LG U+</option><option value="SKT 알뜰폰">SKT 알뜰폰</option><option value="KT 알뜰폰">KT 알뜰폰</option><option value="LG U+ 알뜰폰">LG U+ 알뜰폰</option></select>' +
              '<input id="paymentOwnerPhone" type="tel" placeholder="휴대폰번호 예: 010-0000-0000" value="' + escapeHtml(member.phone || '') + '" inputmode="tel" autocomplete="tel" />' +
            '</div>' +
            '<input id="paymentOwnerCode" type="text" placeholder="휴대폰 인증번호 123456" inputmode="numeric" maxlength="6" autocomplete="one-time-code" />' +
          '</div>' +
          '<div id="paymentOwnerAccountBox" class="hidden">' +
            '<div class="notice blue-note">계좌이체는 정식 서비스에서 PG/은행 인증으로 확인합니다. 현재 테스트 확인번호는 1234입니다.</div>' +
            '<div class="person-auth-grid">' +
              '<select id="paymentOwnerBank"><option value="">은행 선택</option><option value="국민은행">국민은행</option><option value="신한은행">신한은행</option><option value="우리은행">우리은행</option><option value="하나은행">하나은행</option><option value="농협은행">농협은행</option><option value="기업은행">기업은행</option></select>' +
              '<input id="paymentOwnerAccountCode" type="text" placeholder="계좌이체 확인번호 1234" inputmode="numeric" maxlength="4" />' +
            '</div>' +
          '</div>' +
          '<div id="paymentOwnerVerifyStatus" class="auth-mini-note">카드사를 선택하고 카드번호/유효기간을 입력하세요. 현재는 실제 승인 없는 테스트 결제입니다.</div>' +
        '</div>' +
        '<div class="small">결제를 완료하면 이 장비는 보관함과 전체 장비등록수에 활성 장비로 표시됩니다. 현재는 테스트 결제 화면입니다.</div>';
      setPaymentOwnerMethod('card');
    }

    function getSelectedPaymentPlan() {
      const checked = document.querySelector('input[name="paymentPlan"]:checked');
      return checked?.value || localStorage.getItem(SELECTED_PAYMENT_PLAN_KEY) || 'monthly';
    }

    function isAdditionalRegistrationContext() {
      const pending = getPendingRegistration();
      if (pending && pending.paymentTier) return pending.paymentTier === 'additional';
      return getActivePaidRegistrationItemsForCurrentOwner(getCurrentMemberTest() || null, '').length > 0;
    }

    function isAdditionalPaymentItem(item, list) {
      const items = Array.isArray(list) ? list : getItems();
      if (!item || items.length <= 1) return false;
      const oldest = items[items.length - 1];
      return String(item.code || '') !== String(oldest?.code || '');
    }

    function getPlanInfo(plan, options) {
      const payments = getAdminPaymentsModule();
      if (payments.getPlanInfo) return payments.getPlanInfo(plan, options);
      const additional = typeof options === 'boolean' ? options : !!(options && options.additional);
      if (plan === 'annual') {
        const price = additional ? '연 9,900원' : '연 19,900원';
        const label = additional ? '추가등록 연 결제' : '1대 등록 연 결제';
        return { key:'annual', label, price, days:365, serviceStatus:'유료사용', planText:label + ' · ' + price, additional };
      }
      const price = additional ? '월 1,000원' : '월 2,000원';
      const label = additional ? '추가등록 월 결제' : '1대 등록 월 결제';
      return { key:'monthly', label, price, days:30, serviceStatus:'유료사용', planText:label + ' · ' + price, additional };
    }

    function updateSelectedPaymentPlan() {
      const plan = getSelectedPaymentPlan();
      localStorage.setItem(SELECTED_PAYMENT_PLAN_KEY, plan);
      const additional = isAdditionalRegistrationContext();
      const info = getPlanInfo(plan, { additional });
      const monthlyInfo = getPlanInfo('monthly', { additional });
      const annualInfo = getPlanInfo('annual', { additional });
      const monthlyPrice = document.getElementById('monthlyPlanPriceText');
      const annualPrice = document.getElementById('annualPlanPriceText');
      const monthlyDesc = document.getElementById('monthlyPlanDescText');
      const annualDesc = document.getElementById('annualPlanDescText');
      const registerButton = document.getElementById('paymentRegisterButton');
      const pending = getPendingRegistration();
      if (monthlyPrice) monthlyPrice.textContent = monthlyInfo.price;
      if (annualPrice) annualPrice.textContent = annualInfo.price;
      if (monthlyDesc) monthlyDesc.textContent = additional ? '2대부터 추가등록 기준. 한 달씩 이용하는 방식입니다.' : '처음 1대 등록 기준. 한 달씩 이용하는 방식입니다.';
      if (annualDesc) annualDesc.textContent = additional ? '2대부터 추가등록 기준. 1년 동안 이용하는 방식입니다.' : '처음 1대 등록 기준. 1년 동안 이용하는 방식입니다.';
      if (registerButton) registerButton.textContent = pending ? '결제하고 QR링크 생성' : (additional ? '선택한 결제방법으로 추가등록하기' : '선택한 결제방법으로 1대 등록하기');
      const note = document.getElementById('selectedPlanNote');
      if (note) {
        note.innerHTML = '<b>선택한 요금제:</b> ' + escapeHtml(info.label) + ' / ' + escapeHtml(info.price) + '<br>' + (additional ? '2대부터 추가등록 요금으로 결제됩니다.' : '첫 장비 1대 등록 요금으로 결제됩니다.') + '<br>' + (pending ? '결제를 완료하면 보관함에 저장되고 QR·담당자 링크가 바로 생성됩니다.' : '정식 서비스에서는 카드 명의자 확인, 휴대폰 소액결제 명의 확인, 계좌이체 은행 인증을 결제대행사와 연결합니다.');
      }
      renderPendingRegistrationPaymentBox();
      renderPricingTargetList();
    }


    function makeAutoPaymentHash(code, plan, tier) {
      const cleanPlan = plan === 'annual' ? 'annual' : 'monthly';
      const cleanTier = tier === 'additional' ? 'additional' : 'first';
      return '#pay=' + encodeURIComponent(code || '') + '&plan=' + encodeURIComponent(cleanPlan) + '&tier=' + encodeURIComponent(cleanTier) + '&result=success';
    }

    function makeAutoPaymentTestLink(code, plan, tier) {
      const base = String(window.location.href || './index.html').split('#')[0] || './index.html';
      return base + makeAutoPaymentHash(code, plan, tier);
    }

    function applyAutoPaymentResultToOwnerMember(paidItem, info, nowIso, newEnd) {
      if (!paidItem || !info) return 0;
      const members = getMembers();
      const target = members.find(member => memberOwnsItemForPayment(member, paidItem));
      if (!target) return 0;
      const ownedItems = getItems().filter(item => memberOwnsItemForPayment(target, item));
      const paidOwned = ownedItems.filter(item => !isServiceShareBlocked(item)).length;
      const totalOwned = ownedItems.length;
      const allOwnedPaid = totalOwned > 0 && paidOwned >= totalOwned;
      const label = info.key === 'annual' ? '1년권' : '1개월권';
      const planLabel = allOwnedPaid ? label : '일부장비 ' + label;
      const maxEnd = ownedItems.reduce((latest, item) => {
        const time = item.trialEndsAt ? new Date(item.trialEndsAt).getTime() : 0;
        return Number.isFinite(time) && time > latest ? time : latest;
      }, new Date(newEnd).getTime());
      target.paymentPlanLabel = planLabel;
      target.memberPlan = planLabel;
      target.paymentStartedAt = target.paymentStartedAt || nowIso;
      target.paymentEndsAt = new Date(maxEnd).toISOString();
      target.paymentStatus = '자동결제완료';
      target.paymentAmount = info.price;
      target.paymentMemo = '자동결제 링크 확인로 처리됨';
      target.status = allOwnedPaid ? (label + ' 자동결제') : '일부장비 자동결제';
      target.autoPaymentLastAt = nowIso;
      target.autoPaymentLastPlan = info.key;
      target.updatedAt = nowIso;
      target.paymentTestPaid = allOwnedPaid;
      addMemberPaymentHistory(target, '자동결제', info.planText + ' 자동결제 링크 확인', info.price);
      setMembers(members);
      return 1;
    }
