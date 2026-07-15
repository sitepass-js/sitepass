/* SitePass v23.7.473-test - 첫 화면 등록대상 체크 후 순차 인증·서류등록 */
(function(){
  'use strict';

  const STEP_KEY = 'sitepass_v472_registration_wizard_step';
  const LEGACY_STEP_KEYS = [
    'sitepass_v471_registration_wizard_step',
    'sitepass_v470_registration_wizard_step'
  ];
  const VALID_STEPS = ['equipment','driver','worker'];
  let currentStep = 'equipment';
  let applying = false;
  let lastDriverVerified = false;
  let lastWorkerCount = 0;
  let autoAddingWorker = false;

  function qs(sel, root){ return (root || document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }
  function includeDriver(){ return !!document.getElementById('includeDriverDocs')?.checked; }
  function includeWorker(){ return !!document.getElementById('includeWorkerDocs')?.checked; }
  function labelForStep(step){
    return ({equipment:'1. 장비서류',driver:'2. 기사서류',worker:'3. 인부서류'})[step] || '1. 장비서류';
  }
  function driverIsVerified(){
    const panelVerified = qs('[data-person-auth-panel="driver"]')?.dataset.authVerified === 'true';
    if (panelVerified) return true;
    const cards = qsa('.doc-card[data-group-key="driver"]');
    const attached = cards.filter(function(card){
      const box = qs('[data-role="filename"]', card);
      const pages = box?.dataset?.pages || box?.dataset?.pagesJson || '';
      return !!(pages && pages !== '[]') || card.dataset.authVerified === 'true';
    });
    return attached.length > 0 && attached.every(function(card){ return card.dataset.authVerified === 'true'; });
  }
  function workerVerifiedCount(){
    return qsa('#workerPeopleList .worker-person-card').filter(function(card){
      if (card.dataset.workerAuthVerifiedAt || card.dataset.authVerified === 'true') return true;
      return !!qs('.doc-card[data-auth-verified="true"]', card);
    }).length;
  }
  function saveStep(step){
    try { localStorage.setItem(STEP_KEY, step); } catch(e) {}
  }
  function clearStep(){
    try {
      localStorage.removeItem(STEP_KEY);
      LEGACY_STEP_KEYS.forEach(function(key){ localStorage.removeItem(key); });
    } catch(e) {}
  }
  function readStep(){
    try {
      let value = localStorage.getItem(STEP_KEY) || '';
      if (!value) {
        for (const key of LEGACY_STEP_KEYS) {
          value = localStorage.getItem(key) || '';
          if (value) break;
        }
      }
      if (value === 'driver-choice') value = 'driver';
      if (value === 'worker-choice') value = 'worker';
      if (!VALID_STEPS.includes(value)) return 'equipment';
      if (value === 'driver' && !includeDriver()) return 'equipment';
      if (value === 'worker' && !includeWorker()) return includeDriver() ? 'driver' : 'equipment';
      return value;
    } catch(e) { return 'equipment'; }
  }
  function scrollRegisterTop(){
    const target = document.getElementById('registerScreen');
    try { target?.scrollIntoView({behavior:'smooth', block:'start'}); } catch(e) { window.scrollTo(0,0); }
  }
  function lockTargetSelection(){
    const editFolderMode = !!(typeof editingCode !== 'undefined' && editingCode);
    const locked = editFolderMode || currentStep !== 'equipment';
    ['includeDriverDocs','includeWorkerDocs'].forEach(function(id){
      const input = document.getElementById(id);
      if (!input) return;
      input.disabled = locked;
      input.closest('[data-registration-target]')?.classList.toggle('locked', locked);
    });
    const equipmentInput = document.getElementById('includeEquipmentDocs472');
    if (equipmentInput) { equipmentInput.checked = true; equipmentInput.disabled = true; }
  }
  function setProgress(step){
    const register = qs('#registerScreen');
    const editFolderMode = !!(typeof editingCode !== 'undefined' && editingCode);
    if (register) register.classList.toggle('sitepass-edit-folder-mode486', editFolderMode);
    const activeStage = ({equipment:1,driver:2,worker:3})[step] || 1;
    qsa('#registrationWizardProgress472 [data-wizard-stage]').forEach(function(el){
      const n = Number(el.dataset.wizardStage || 0);
      const selected = n === 1 || (n === 2 && includeDriver()) || (n === 3 && includeWorker());
      el.classList.toggle('active', n === activeStage);
      el.classList.toggle('selected', selected);
      el.classList.toggle('not-selected', !selected);
      if (n === activeStage) el.setAttribute('aria-current','step');
      else el.removeAttribute('aria-current');
    });
    const title = qs('#registrationWizardStepTitle472');
    if (title) title.textContent = labelForStep(step);
    const desc = qs('#registrationWizardStepDesc472');
    if (desc) {
      if (editFolderMode) {
        desc.textContent = '장비·기사·인부 폴더를 눌러 필요한 서류만 수정한 뒤 수정내용 저장을 눌러주세요.';
      } else if (step === 'equipment') {
        desc.textContent = '장비서류는 필수입니다. 기사·인부 서류도 등록할 경우 먼저 체크한 뒤 장비서류를 작성해주세요.';
      } else if (step === 'driver') {
        desc.textContent = driverIsVerified()
          ? '기사 인증이 완료되었습니다. 기사서류를 등록해주세요.'
          : '기사 휴대폰 동의·인증을 먼저 완료하면 기사서류 등록칸이 열립니다.';
      } else {
        desc.textContent = workerVerifiedCount()
          ? '인부 인증이 완료되었습니다. 인부서류를 등록해주세요.'
          : '인부 휴대폰 동의·인증을 먼저 완료하면 해당 인부의 서류등록칸이 열립니다.';
      }
    }
    lockTargetSelection();
  }
  function applyGroupVisibility(step){
    const register = qs('#registerScreen');
    if (!register) return;
    register.dataset.registrationStep = step;
    qsa('#docCards .bundle-group').forEach(function(group){
      const key = group.dataset.bundleGroup || '';
      const show = key === step;
      group.classList.toggle('sitepass-wizard-group-hidden472', !show);
    });
    const basicCard = qs('#registrationBasicCard470') || qs('#registerScreen > .card:first-child');
    if (basicCard) basicCard.classList.toggle('sitepass-wizard-basic-collapsed472', step !== 'equipment');
    const documentTitle = qs('#documentSection h2');
    if (documentTitle) documentTitle.textContent = step === 'equipment' ? '장비서류 등록' : step === 'driver' ? '기사서류 등록' : '인부서류 등록';
    register.classList.toggle('sitepass-wizard-driver-auth-pending472', step === 'driver' && !driverIsVerified());
    const previewCard = qs('#registrationAlertCard470');
    if (previewCard) previewCard.classList.add('hidden');
  }
  function setButtons(step){
    const back = qs('#wizardBackButton470');
    const main = qs('#saveBundleButton');
    const editFolderMode = !!(typeof editingCode !== 'undefined' && editingCode);
    if (back) back.classList.toggle('hidden', editFolderMode || step === 'equipment');
    if (!main) return;
    if (editFolderMode) {
      main.onclick = window.sitePassRegistrationWizardSaveEdit486;
      main.classList.remove('hidden');
      main.textContent = '수정내용 저장';
      return;
    }
    main.onclick = window.sitePassRegistrationWizardNext472;
    const authPending = (step === 'driver' && !driverIsVerified()) || (step === 'worker' && workerVerifiedCount() < 1);
    main.classList.toggle('hidden', authPending);
    if (step === 'equipment') main.textContent = (includeDriver() || includeWorker()) ? '저장하고 다음' : '저장완료';
    else if (step === 'driver') main.textContent = includeWorker() ? '저장하고 다음' : '저장완료';
    else main.textContent = '저장완료';
  }
  function updatePrivateAuthHint(step){
    const hint = qs('#registrationWizardPrivateHint470');
    if (!hint) return;
    if (step === 'driver') {
      const verified = driverIsVerified();
      hint.textContent = verified
        ? '기사 인증이 완료되었습니다. 필수 기사서류를 첨부한 뒤 ' + (includeWorker() ? '저장하고 다음을' : '저장완료를') + ' 눌러주세요.'
        : '기사에게 동의 링크를 보내고, 기사 휴대폰에 표시된 6자리 인증번호를 입력해주세요. 인증 완료 후 기사서류 등록칸과 저장 버튼이 나타납니다.';
      hint.classList.remove('hidden');
    } else if (step === 'worker') {
      const count = workerVerifiedCount();
      hint.textContent = count
        ? '인부 ' + count + '명의 인증이 완료되었습니다. 필수 인부서류를 첨부한 뒤 저장완료를 눌러주세요.'
        : '인부에게 동의 링크를 보내고 인증을 완료해주세요. 인증된 인부의 서류등록칸과 저장완료 버튼이 나타납니다.';
      hint.classList.remove('hidden');
    } else {
      hint.classList.add('hidden');
      hint.textContent = '';
    }
  }
  function applyStep(step, options){
    if (applying) return;
    applying = true;
    try {
      let nextStep = VALID_STEPS.includes(step) ? step : 'equipment';
      if (nextStep === 'driver' && !includeDriver()) nextStep = 'equipment';
      if (nextStep === 'worker' && !includeWorker()) nextStep = includeDriver() ? 'driver' : 'equipment';
      currentStep = nextStep;
      if (!options || options.persist !== false) saveStep(currentStep);
      setProgress(currentStep);
      applyGroupVisibility(currentStep);
      setButtons(currentStep);
      updatePrivateAuthHint(currentStep);
      if (!options || options.scroll !== false) setTimeout(scrollRegisterTop, 40);
    } finally { applying = false; }
  }
  function findCard(key){ return qs('.doc-card[data-doc-key="' + String(key).replace(/"/g,'') + '"]'); }
  function focusCard(key, field){
    const card = findCard(key);
    if (!card) return;
    const target = field === 'date' ? (qs('[data-date-key]', card) || card) : card;
    try { target.scrollIntoView({behavior:'smooth', block:'center'}); } catch(e) {}
    const input = field === 'date' ? qs('[data-date-key]', card) : qs('button, input', card);
    try { input?.focus(); } catch(e) {}
  }
  function validateBasic(){
    const no = (qs('#equipmentNo')?.value || '').trim();
    const name = (qs('#equipmentName')?.value || '').trim();
    if (!no) { alert('장비 등록번호를 입력해주세요.'); qs('#equipmentNo')?.focus(); return false; }
    if (!name) { alert('장비종류를 선택해주세요.'); qs('#equipmentName')?.focus(); return false; }
    return true;
  }
  function validateStaticGroup(groupKey){
    const docs = collectDocData();
    const defs = DOCS.filter(function(def){ return def.groupKey === groupKey; });
    const missingFiles = [];
    const missingDates = [];
    defs.forEach(function(def){
      const doc = docs[def.key];
      if (def.required && (!doc || !doc.fileName)) missingFiles.push(def);
      if (def.required && def.expiry && (!doc || !doc.expireDate)) missingDates.push(def);
      if (def.optionalExpiry && doc && doc.fileName && !doc.expireDate) missingDates.push(def);
    });
    if (groupKey === 'driver' && !driverIsVerified()) {
      alert('기사 휴대폰 동의·인증을 먼저 완료해주세요.');
      qs('[data-person-auth-panel="driver"]')?.scrollIntoView({behavior:'smooth', block:'center'});
      return false;
    }
    if (missingFiles.length || missingDates.length) {
      const fileText = missingFiles.map(function(d){ return d.title; }).join('\n') || '없음';
      const dateText = missingDates.map(function(d){ return d.title + ' 만료일'; }).join('\n') || '없음';
      alert('필수 항목을 확인해주세요.\n\n미첨부 서류:\n' + fileText + '\n\n미입력 날짜:\n' + dateText);
      const first = missingFiles[0] || missingDates[0];
      if (first) focusCard(first.key, missingFiles.length ? 'file' : 'date');
      return false;
    }
    return true;
  }
  function validateWorker(){
    const docs = collectDocData();
    const people = qsa('#workerPeopleList .worker-person-card');
    if (!people.length) {
      alert('인부 휴대폰 동의·인증을 완료해 인부 1명 이상을 추가해주세요.');
      qs('[data-person-auth-panel="worker"]')?.scrollIntoView({behavior:'smooth', block:'center'});
      return false;
    }
    const result = validateWorkerPeople(docs);
    if (result && result.missingFiles && result.missingFiles.length) {
      alert('필수 인부서류를 확인해주세요.\n\n' + result.missingFiles.join('\n'));
      const firstMissing = people.find(function(card){
        const uid = card.dataset.workerUid || '';
        return !docs['workerIdCard_' + uid]?.fileName || !docs['workerSafetyTraining_' + uid]?.fileName;
      });
      firstMissing?.scrollIntoView({behavior:'smooth', block:'center'});
      return false;
    }
    const unverified = Object.values(docs).find(function(doc){ return doc.groupKey === 'worker' && doc.fileName && !doc.authVerified; });
    if (unverified) {
      alert('인증이 완료되지 않은 인부서류가 있습니다.');
      focusCard(unverified.key, 'file');
      return false;
    }
    return true;
  }
  function saveDraft(){ try { saveRegistrationDraftNow(); } catch(e) {} }
  async function next(){
    if (currentStep === 'equipment') {
      if (!validateBasic() || !validateStaticGroup('equipment')) return;
      saveDraft();
      if (includeDriver()) return applyStep('driver');
      if (includeWorker()) return applyStep('worker');
      await finalize();
      return;
    }
    if (currentStep === 'driver') {
      if (!validateStaticGroup('driver')) return;
      saveDraft();
      if (includeWorker()) return applyStep('worker');
      await finalize();
      return;
    }
    if (currentStep === 'worker') {
      if (!validateWorker()) return;
      saveDraft();
      await finalize();
    }
  }
  async function finalize(){
    if (!validateBasic() || !validateStaticGroup('equipment')) { applyStep('equipment'); return; }
    if (includeDriver() && !validateStaticGroup('driver')) { applyStep('driver'); return; }
    if (includeWorker() && !validateWorker()) { applyStep('worker'); return; }
    const btn = qs('#saveBundleButton');
    if (btn) btn.disabled = true;
    try { await saveEquipment(); }
    finally { if (btn) btn.disabled = false; }
  }
  async function saveEdit486(){
    await finalize();
  }
  window.sitePassRegistrationWizardSaveEdit486 = saveEdit486;

  function openEditFolder486(step){
    if (!(typeof editingCode !== 'undefined' && editingCode)) return false;
    if (step === 'driver' && !includeDriver()) return false;
    if (step === 'worker' && !includeWorker()) return false;
    applyStep(step, {persist:true, scroll:true});
    return true;
  }
  window.sitePassOpenEditFolder486 = openEditFolder486;

  function back(){
    if (currentStep === 'driver') return applyStep('equipment');
    if (currentStep === 'worker') return applyStep(includeDriver() ? 'driver' : 'equipment');
  }
  function targetChanged(groupKey){
    if (currentStep !== 'equipment') return;
    try { toggleBundleGroup(groupKey); } catch(e) {}
    saveDraft();
    setProgress(currentStep);
    setButtons(currentStep);
  }
  function installWrappers(){
    if (window.__sitePassWizard472Wrapped) return;
    window.__sitePassWizard472Wrapped = true;

    const originalRender = window.renderDocCards;
    if (typeof originalRender === 'function') window.renderDocCards = function(){
      const out = originalRender.apply(this, arguments);
      setTimeout(function(){ applyStep(currentStep, {persist:false,scroll:false}); },0);
      return out;
    };

    const originalReset = window.resetForm;
    if (typeof originalReset === 'function') window.resetForm = function(){
      const out = originalReset.apply(this, arguments);
      clearStep(); currentStep = 'equipment';
      setTimeout(function(){ applyStep('equipment',{persist:false,scroll:false}); },0);
      return out;
    };

    const originalRestore = window.restoreRegistrationDraft;
    if (typeof originalRestore === 'function') window.restoreRegistrationDraft = function(){
      const out = originalRestore.apply(this, arguments);
      setTimeout(function(){ applyStep(readStep(),{persist:false,scroll:false}); },160);
      return out;
    };

    const originalStartNew = window.startNewRegistration;
    if (typeof originalStartNew === 'function') window.startNewRegistration = function(){
      clearStep(); currentStep = 'equipment';
      const out = originalStartNew.apply(this, arguments);
      setTimeout(function(){
        if (!qs('#registerScreen')?.classList.contains('hidden')) applyStep('equipment',{persist:true,scroll:false});
      },120);
      return out;
    };

    const originalStartEdit = window.startEditEquipment;
    if (typeof originalStartEdit === 'function') window.startEditEquipment = function(){
      clearStep(); currentStep = 'equipment';
      const out = originalStartEdit.apply(this, arguments);
      setTimeout(function(){ applyStep('equipment',{persist:true,scroll:false}); },120);
      return out;
    };

    const originalClear = window.clearRegistrationDraft;
    if (typeof originalClear === 'function') window.clearRegistrationDraft = function(){ clearStep(); return originalClear.apply(this, arguments); };
  }
  function refreshAfterAuth(){
    const driverNow = driverIsVerified();
    const workerNow = workerVerifiedCount();
    const workerPanel = qs('[data-person-auth-panel="worker"]');
    if (currentStep === 'worker' && workerPanel?.dataset.pendingVerified === 'true' && !autoAddingWorker) {
      autoAddingWorker = true;
      setTimeout(function(){
        try {
          const panel = qs('[data-person-auth-panel="worker"]');
          if (panel?.dataset.pendingVerified === 'true' && typeof addWorkerPerson === 'function') {
            const type = panel.dataset.pendingType || qs('[data-person-auth-type]', panel)?.value || 'normal';
            addWorkerPerson(type);
          }
        } finally {
          setTimeout(function(){ autoAddingWorker = false; },80);
        }
      },80);
    }
    updatePrivateAuthHint(currentStep);
    setProgress(currentStep);
    applyGroupVisibility(currentStep);
    setButtons(currentStep);
    if (currentStep === 'driver' && driverNow && !lastDriverVerified) {
      setTimeout(function(){
        const first = qs('.doc-card[data-group-key="driver"]');
        try { first?.scrollIntoView({behavior:'smooth', block:'start'}); } catch(e) {}
      }, 180);
    }
    if (currentStep === 'worker' && workerNow > lastWorkerCount) {
      setTimeout(function(){
        const last = qsa('#workerPeopleList .worker-person-card').pop();
        try { last?.scrollIntoView({behavior:'smooth', block:'start'}); } catch(e) {}
      },180);
    }
    lastDriverVerified = driverNow;
    lastWorkerCount = workerNow;
  }
  function observeAuth(){
    const observer = new MutationObserver(function(){ setTimeout(refreshAfterAuth,0); });
    const root = qs('#docCards');
    if (root) observer.observe(root,{subtree:true,attributes:true,attributeFilter:['data-auth-verified','data-pending-verified','data-worker-auth-verified-at'],childList:true});
  }
  function init(){
    installWrappers();
    const progress = qs('#registrationWizardProgress472');
    if (progress && !progress.dataset.editFolderBound486) {
      progress.dataset.editFolderBound486 = 'true';
      progress.addEventListener('click', function(event){
        if (!(typeof editingCode !== 'undefined' && editingCode)) return;
        const tab = event.target.closest('[data-wizard-stage]');
        if (!tab || !progress.contains(tab)) return;
        const step = ({'1':'equipment','2':'driver','3':'worker'})[String(tab.dataset.wizardStage || '')];
        if (!step) return;
        event.preventDefault();
        event.stopPropagation();
        openEditFolder486(step);
      }, true);
    }
    currentStep = readStep();
    applyStep(currentStep,{persist:false,scroll:false});
    observeAuth();
    document.addEventListener('change', function(e){
      if (!e.target || !e.target.closest || !e.target.closest('#registerScreen')) return;
      setTimeout(function(){
        updatePrivateAuthHint(currentStep);
        setProgress(currentStep);
        setButtons(currentStep);
      },0);
    }, true);
  }

  window.sitePassRegistrationWizardNext472 = next;
  window.sitePassRegistrationWizardBack472 = back;
  window.sitePassRegistrationTargetChanged472 = targetChanged;
  window.sitePassApplyRegistrationStep472 = applyStep;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
