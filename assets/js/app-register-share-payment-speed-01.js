// SitePass v23.7.350 - speed optimized medium chunk (app-register-share-payment-speed 01/04)
// ---- merged from app-register-share-payment-01.js ----
// SitePass v23.7.350 - app-register-share-payment finer split (01/15)
// SitePass v23.7.350 - app.bundle.js remaining split (03 register/share/payment)


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

    // v23.7.350: 수신자 QR/1일 링크 화면은 회원이 실제 첨부한 서류만 보여줍니다.
    // 등록/수정 화면에서는 빈 필수서류도 보여야 하므로 getDisplayDocs는 그대로 두고,
    // 외부 담당자 화면/다운로드/인쇄에서만 이 필터를 사용합니다.
    function isPlaceholderAttachmentValue(value) {
      const text = String(value || '').trim();
      if (!text) return true;
      return text === '첨부됨' || text === '미첨부' || text === '선택안함' || text === '-' || text === 'null' || text === 'undefined';
    }

    function hasUsableAttachmentUrl(obj) {
      if (!obj) return false;
      return ['previewDataUrl','editDataUrl','correctedDataUrl','originalDataUrl','fileUrl','downloadUrl','storagePublicUrl','publicUrl','fileDataUrl','storagePath','storageKey','filePath','path'].some(key => {
        const value = String(obj[key] || '').trim();
        return !!value && !isPlaceholderAttachmentValue(value);
      });
    }

    function hasRealPageAttachment(page) {
      if (!page) return false;
      // v23.7.350: 수신자 화면에서는 fileName/status만 남은 예전 껍데기 자료를 첨부로 보지 않습니다.
      // 실제 데이터 URL 또는 Supabase Storage 경로/URL이 있어야 표시합니다.
      return hasUsableAttachmentUrl(page);
    }

    function hasRealDocAttachment(doc) {
      if (!doc) return false;
      const pages = Array.isArray(doc.pages) ? doc.pages : [];
      if (pages.some(hasRealPageAttachment)) return true;
      return hasUsableAttachmentUrl(doc);
    }

    function getAttachedDisplayDocs(item) {
      const docs = getDisplayDocs(item);
      if (item && item.shareFilesPendingRecovery) {
        return docs.filter(function(doc){
          return hasRealDocAttachment(doc) || !!String(doc && doc.fileName || '').trim() || Number(doc && doc.pageCount || 0) > 0 || (Array.isArray(doc && doc.pages) && doc.pages.length > 0);
        });
      }
      return docs.filter(hasRealDocAttachment);
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
        unit:'장비등록 1건',
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
      const draft = getRegistrationDraft();
      const meaningful = hasMeaningfulRegistrationDraftData(draft);
      // v23.7.461: 예전 버전이 빈 화면을 초안으로 잘못 저장한 자료도 발견 즉시 정리합니다.
      if (draft && !meaningful) clearRegistrationDraft();
      return meaningful;
    }

    function clearRegistrationDraft() {
      try { localStorage.removeItem(REGISTRATION_DRAFT_KEY); } catch (e) {}
      updateRegistrationDraftNotice();
    }

    // v23.7.461: 사용자가 임시등록 안내에서 취소를 누르면
    // 이미 예약된 자동저장 타이머까지 끊어 삭제한 초안이 다시 생기지 않게 합니다.
    function discardRegistrationDraftCompletely() {
      try { window.clearTimeout(registrationDraftSaveTimer); } catch (e) {}
      registrationDraftSaveTimer = null;
      clearRegistrationDraft();
      try { window.__sitePassRegistrationDraftStorageFull = false; } catch (e) {}
    }

    function hasMeaningfulRegistrationDraftData(draft) {
      if (!draft) return false;
      if (String(draft.equipmentNo || '').trim()) return true;
      if (String(draft.equipmentName || '').trim()) return true;
      if (draft.includeDriver || draft.includeWorker) return true;
      const docs = draft.docs || {};
      return Object.values(docs).some(doc => {
        if (!doc) return false;
        if (doc.fileName || doc.expireDate || doc.driverPhone || doc.workerPhone || doc.personPhone || doc.workerTask) return true;
        if (Array.isArray(doc.pages) && doc.pages.length) return true;
        if (doc.previewDataUrl || doc.editDataUrl || doc.originalDataUrl || doc.correctedDataUrl || doc.fileDataUrl || doc.storagePath || doc.storageKey) return true;
        // 빈 등록화면의 일반 장비서류 카드는 기본값으로 authVerified=true가 들어갑니다.
        // 인증 일시·전화번호·이름 등 실제 인증 흔적이 있을 때만 작성 중 데이터로 인정합니다.
        if (doc.authVerified && (doc.authVerifiedAt || doc.authPhone || doc.authPersonName || doc.authBirth6 || doc.authGenderDigit || doc.authCarrier)) return true;
        return false;
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

    function makeRegistrationDraftForLocalSave(draft, level) {
      const light = JSON.parse(JSON.stringify(draft || {}));
      Object.values(light.docs || {}).forEach(doc => {
        if (!doc) return;
        // 자동저장은 브라우저 저장공간을 넘기지 않도록 이미지/base64/PDF URL을 저장하지 않습니다.
        // 실제 등록은 현재 화면의 첨부 상태로 진행하고, 자동저장은 글자/만료일/인증상태 중심으로만 남깁니다.
        doc.pages = [];
        doc.fileName = '';
        doc.fileSource = '';
        doc.fileType = '';
        doc.previewDataUrl = '';
        doc.originalDataUrl = '';
        doc.correctedDataUrl = '';
        doc.editDataUrl = '';
        doc.fileObjectUrl = '';
        doc.fileDataUrl = '';
        doc.cameraAutoCropDataUrl = '';
        if (level === 'meta') {
          doc.fitText = '';
          doc.ratioText = '';
          doc.autoFit = '';
          doc.previewChoice = '';
        }
      });
      light.draftStorageMode = level || 'light-no-file-data';
      return light;
    }

    function cleanupRegistrationDraftStorageForRetry() {
      try { localStorage.removeItem(REGISTRATION_DRAFT_KEY); } catch (e) {}
      try {
        const removablePatterns = [
          'registration_draft',
          'server_equipment_cache',
          'pending_payment',
          'payment_pending',
          'cameraAutoCrop',
          'sitePass_temp',
          'sitePass_tmp'
        ];
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
        keys.filter(Boolean).forEach(key => {
          const lower = String(key).toLowerCase();
          if (!lower.includes('sitepass')) return;
          if (key === REGISTRATION_DRAFT_KEY) return;
          if (removablePatterns.some(pattern => lower.includes(pattern.toLowerCase()))) {
            try { localStorage.removeItem(key); } catch (e) {}
          }
        });
      } catch (e) {}
    }

    function setRegistrationDraft(draft) {
      if (window.__sitePassRegistrationDraftStorageFull) return false;
      const candidates = [
        makeRegistrationDraftForLocalSave(draft, 'light-no-file-data'),
        makeRegistrationDraftForLocalSave(draft, 'meta')
      ];
      for (let i = 0; i < candidates.length; i++) {
        try {
          if (i > 0) cleanupRegistrationDraftStorageForRetry();
          localStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify(candidates[i]));
          return true;
        } catch (error) {
          if (i === 0) {
            cleanupRegistrationDraftStorageForRetry();
            continue;
          }
          console.warn('등록중 자동저장은 브라우저 저장공간 부족으로 이번 화면에서는 생략합니다. 실제 등록은 현재 화면에서 계속 진행할 수 있습니다.', error);
          try { localStorage.removeItem(REGISTRATION_DRAFT_KEY); } catch (e) {}
          window.__sitePassRegistrationDraftStorageFull = true;
          return false;
        }
      }
      return false;
    }

    function updateRegistrationDraftNotice() {
      const note = document.getElementById('registrationDraftNotice');
      if (!note) return;
      const draft = getRegistrationDraft();
      const savedAt = draft?.savedAt ? formatDateTimeForDraft(draft.savedAt) : '';
      note.innerHTML = savedAt
        ? '작성 중 내용이 <b>자동저장됨</b> · ' + escapeHtml(savedAt) + '<br><span class="small">앱을 닫아도 다음 접속 때 “등록중인 장비가 있습니다” 안내창에서 이어서 작성할 수 있습니다.</span>'
        : '장비번호·장비종류·서류 등 <b>실제로 입력한 내용이 있을 때만</b> 자동저장됩니다. 안내창에서 취소를 누르면 임시저장이 완전히 삭제됩니다.';
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

    function hasActiveRegistrationAttachments() {
      try {
        const register = document.getElementById('registerScreen');
        if (!register || register.classList.contains('hidden')) return false;
        const docs = collectDocData();
        return Object.values(docs || {}).some(function(doc) {
          if (!doc) return false;
          if (doc.fileName) return true;
          if (Array.isArray(doc.pages) && doc.pages.length) return true;
          if (doc.previewDataUrl || doc.editDataUrl || doc.originalDataUrl || doc.correctedDataUrl) return true;
          return false;
        });
      } catch (e) {
        return false;
      }
    }

    function confirmLeaveRegistrationIfNeeded(targetScreenId) {
      // v23.7.350: 사진/파일 첨부 후 등록완료 전에 홈/보관함/뒤로가기 등으로 나가면
      // 브라우저 저장공간 제한 때문에 기사·인부 첨부자료가 복구되지 않을 수 있어 명확히 막습니다.
      if (sitePassRegistrationCompletionBusy) return true;
      if (!hasActiveRegistrationAttachments()) return true;
      const target = String(targetScreenId || '');
      if (target === 'registerScreen') return true;
      return confirm('아직 등록완료 전입니다.\n\n첨부한 기사/인부/장비 자료는 화면을 나가면 사라질 수 있습니다.\n등록완료까지 진행한 뒤 이동하는 것을 권장합니다.\n\n그래도 이 화면을 나갈까요?');
    }

    function saveRegistrationDraftNow() {
      if (sitePassRegistrationCompletionBusy) return;
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
      if (window.__sitePassRegistrationDraftStorageFull) return;
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
      window.addEventListener('beforeunload', function(event) {
        saveRegistrationDraftNow();
        if (!sitePassRegistrationCompletionBusy && hasActiveRegistrationAttachments()) {
          event.preventDefault();
          event.returnValue = '등록완료 전 첨부자료가 사라질 수 있습니다.';
          return event.returnValue;
        }
      });
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

// ---- merged from app-register-share-payment-02.js ----
// SitePass v23.7.350 - app-register-share-payment finer split (02/15)
function promptRegistrationDraftIfNeeded(reason) {
      if (sitePassRegistrationCompletionBusy) return false;
      if (registrationDraftPromptOpen) return false;
      if (isSitePassHashRouteActive()) return false;
      if (!isMemberLoggedIn() && !isAdminLoggedIn()) return false;
      const pendingPay = getPendingRegistration();
      if (pendingPay && pendingPay.item) {
        const activePending = Array.from(document.querySelectorAll('.screen:not(.hidden)')).map(el => el.id)[0] || '';
        if (activePending !== 'pricingScreen' && activePending !== 'detailScreen' && activePending !== 'publicScreen') {
          registrationDraftPromptOpen = true;
          const label = pendingPay.item.equipmentNo || pendingPay.item.equipmentName || '결제 대기 중인 장비';
          const tier = getPendingRegistrationTierText(pendingPay);
          const message = '결제 대기 중인 장비등록이 있습니다.\n\n' + label + '\n' + tier + '\n\n확인: 결제화면으로 이동\n취소: 결제대기 삭제하고 새로 시작';
          setTimeout(function(){
            try {
              if (!isMemberLoggedIn() && !isAdminLoggedIn()) return;
              if (confirm(message)) openPendingRegistrationPaymentScreen(pendingPay);
              else { clearPendingRegistration(); discardRegistrationDraftCompletely(); resetForm(false); discardRegistrationDraftCompletely(); }
            } finally { registrationDraftPromptOpen = false; }
          }, reason === 'login' ? 250 : 450);
          return true;
        }
      }
      if (!hasRegistrationDraft()) return false;
      const active = Array.from(document.querySelectorAll('.screen:not(.hidden)')).map(el => el.id)[0] || '';
      if (active === 'registerScreen' || active === 'pricingScreen' || active === 'detailScreen' || active === 'publicScreen') return false;
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
            discardRegistrationDraftCompletely();
            resetForm(false);
            discardRegistrationDraftCompletely();
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
        discardRegistrationDraftCompletely();
        resetForm(false);
        discardRegistrationDraftCompletely();
      }
      const draft = getRegistrationDraft();
      if (hasMeaningfulRegistrationDraftData(draft)) {
        const label = draft.equipmentNo || draft.equipmentName || '작성 중인 장비';
        if (confirm('등록중인 장비가 있습니다.\n\n' + label + '\n\n확인: 이어서 등록\n취소: 임시저장 삭제하고 새 등록 시작')) {
          restoreRegistrationDraft(draft);
          return;
        }
        discardRegistrationDraftCompletely();
        resetForm(false);
        discardRegistrationDraftCompletely();
      }
      editingCode = '';
      resetForm(false);
      discardRegistrationDraftCompletely();
      updateRegisterModeUi();
      showScreen('registerScreen');
    }

    function updateRegisterModeUi() {
      const banner = document.getElementById('editModeBanner');
      const saveButton = document.getElementById('saveBundleButton');
      const noInput = document.getElementById('equipmentNo');
      if (banner) {
        banner.classList.toggle('hidden', !editingCode);
        if (editingCode) banner.innerHTML = '기존 장비등록 수정/갱신 중입니다. 장비는 그대로 두고 기사 교체, 보험증·검사증 날짜 갱신, 제원표·비파괴·특수건강검진 파일 교체가 가능합니다. <button type="button" class="mini-button" onclick="cancelEditMode()">수정취소</button>';
      }
      if (saveButton) {
        if (editingCode) saveButton.textContent = '수정내용 저장';
        else if (window.SITEPASS_TEST_NO_PAYMENT_MODE) saveButton.textContent = hasRegisteredEquipmentBundle() ? '테스트 추가등록 완료' : '테스트 등록 완료';
        else saveButton.textContent = hasRegisteredEquipmentBundle() ? '추가등록 결제창으로 이동' : '첫장비 등록/결제';
      }
      if (noInput) noInput.readOnly = !!editingCode;
    }

    function cancelEditMode() {
      if (editingCode && !confirm('수정 중인 내용을 취소하고 처음 등록 화면으로 돌아갈까요?')) return;
      editingCode = '';
      discardRegistrationDraftCompletely();
      resetForm(false);
      discardRegistrationDraftCompletely();
      updateRegisterModeUi();
      showScreen('registerScreen');
    }

    function startEditEquipmentFromCurrent() {
      if (!currentDetailLink) return;
      const code = decodeURIComponent((currentDetailLink.split('#qr=')[1] || '').trim());
      if (code) startEditEquipment(code);
    }

    async function startEditEquipment(code) {
      let item = getItemByCode(code);
      if (!item) { alert('수정할 장비등록을 찾을 수 없습니다.'); return; }
      try {
        if (typeof window.sitePassHydrateItemStorageAccessUrlsV523 === 'function') {
          item = await window.sitePassHydrateItemStorageAccessUrlsV523(item);
        }
      } catch (e) { console.warn('수정화면 서류주소 준비 실패:', e); }
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

// ---- merged from app-register-share-payment-03.js ----
// SitePass v23.7.350 - app-register-share-payment finer split (03/15)
function fillDocsForEdit(item) {
      const docs = item.docs || {};
      Object.values(docs).forEach(doc => {
        const card = findDocCardByKey(doc.key);
        if (!card) return;
        const pages = getDocPagesFromDoc(doc);
        setDocPagesToCard(card, pages);
        const dateInput = card.querySelector('[data-date-key]');
        if (dateInput) {
          const editDate = isEducationPlus3YearsCardV478(card)
            ? ((window.sitePassGetEducationDateV486 && window.sitePassGetEducationDateV486(doc)) || doc.educationDate || doc.trainingDate || doc.issueDate || doc.expireDate || '')
            : ((window.sitePassGetEffectiveDocExpireDateV486 && window.sitePassGetEffectiveDocExpireDateV486(doc)) || doc.expireDate || '');
          setCleanDateValue(dateInput, editDate);
        }
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

// ---- merged from app-register-share-payment-04.js ----
// SitePass v23.7.350 - app-register-share-payment finer split (04/15)
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
            forwardPolicy: oldItem?.forwardPolicy || '담당자용 QR·링크 1일 접속 가능',
            managerExpireAt: oldItem?.managerExpireAt || '',
            paymentStatus: oldItem?.paymentStatus || '결제대기',
            paymentAmount: oldItem?.paymentAmount || selectedPlan.price,
            paymentTier: oldItem?.paymentTier || (isAdditionalRegistration ? 'additional' : 'first')
          };
      if (typeof window.sitePassValidateRegistrationItemForSave === 'function') {
        const attachmentCheck = window.sitePassValidateRegistrationItemForSave(item);
        if (!attachmentCheck || attachmentCheck.ok === false) {
          alert((attachmentCheck && attachmentCheck.message) || '첨부서류 사진 데이터가 없어 등록을 중단합니다. 서류를 다시 첨부해주세요.');
          return;
        }
      }

      item.updateHistory = Array.isArray(oldItem?.updateHistory) ? oldItem.updateHistory.slice() : [];
      if (oldItem) {
        if (!requirePrivateEditReverification(oldItem, item)) return;
        item.updateHistory.unshift({ at:nowIso, summary:buildUpdateSummary(oldItem, item).slice(0, 12) });
        if (typeof setSitePassRegistrationUploadBusyV515 === 'function') setSitePassRegistrationUploadBusyV515(true, '서류 저장중');
        let editUploadResult = null;
        try {
          try { saveRegistrationDraftNow(); } catch (e) {}
          editUploadResult = await uploadAndPersistEquipmentItemDocsInBackground(item, 'edit_storage_verified_v517', updateSitePassRegistrationUploadProgressV515);
        } catch (e) {
          editUploadResult = { ok:false, error:e };
        } finally {
          if (typeof setSitePassRegistrationUploadBusyV515 === 'function') setSitePassRegistrationUploadBusyV515(false);
        }
        if (!editUploadResult || !editUploadResult.ok || !editUploadResult.item) {
          const message = editUploadResult && editUploadResult.error ? (editUploadResult.error.message || editUploadResult.error) : '서류 서버 저장 실패';
          alert('수정내용을 저장하지 않았습니다.\n\n' + message + '\n\n원본이 없는 기존 서류는 다시 첨부한 뒤 저장해주세요.');
          return;
        }
        const savedEditItem = editUploadResult.item;
        items[editIndex] = savedEditItem;
        const saveResult = setItemsWithFallback(items);
        const editSavedLightNote = getStorageFallbackNote(saveResult);
        alert(`수정내용이 저장되었습니다.

Storage 확인: ${Number(savedEditItem.storageVerifiedCount || 0)}개
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
      if (window.SITEPASS_TEST_NO_PAYMENT_MODE) {
        // v23.7.350: 테스트 등록완료는 Supabase/전체 보관함 렌더링/결제대기 처리를 기다리지 않고
        // 현재 등록 1건을 즉시 QR/보관함 카드로 표시합니다.
        // 이전 v317~v320에서는 completePendingRegistrationPayment() 안쪽에서 남은 처리 때문에
        // 등록완료 버튼 이후 대기가 길어질 수 있었습니다.
        pendingRegistrationItemMemory = pending;
        // v23.7.526-test: Storage 업로드와 실제 파일 확인이 끝나기 전에는
        // 초안·서류 데이터를 지우거나 보관함 완료화면으로 이동하지 않습니다.
        console.info('SitePass 테스트 모드: Storage 선업로드/검증 후 등록완료 처리 시작');
        try {
          if (typeof completeTestRegistrationInstantly === 'function') {
            await completeTestRegistrationInstantly(item, pending.paymentTier || (isAdditionalRegistration ? 'additional' : 'first'));
          } else {
            await completePendingRegistrationPayment('test-free');
          }
        } catch (e) {
          console.error('테스트 즉시 등록완료 처리 실패:', e);
          alert('등록완료 처리 중 오류가 발생했습니다. 콘솔 오류를 확인해주세요.');
        }
        return;
      }
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
      if (window.SITEPASS_TEST_NO_PAYMENT_MODE) {
        console.info('SitePass 테스트 모드: 결제화면 없이 등록완료 처리', pendingServerText);
        await completePendingRegistrationPayment('test-free');
        return;
      }
      alert(`${isAdditionalRegistration ? '추가등록 서류 확인이 완료되었습니다.' : '첫 장비 서류 확인이 완료되었습니다.'}\n\n이제 결제방법 화면으로 이동합니다.\n결제를 완료하면 QR링크가 생성되고 보관함에 저장됩니다.${pendingServerText}`);
      openPendingRegistrationPaymentScreen(pending);
    }

