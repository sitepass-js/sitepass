// SitePass v23.7.298 - app-register-share-payment split continue (01/09)
// SitePass v23.7.298 - app.bundle.js remaining split (03 register/share/payment)


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
