/* SitePass v23.7.471-test - 선택한 등록대상에 맞춘 자유 단계 이동 */
(function(){
  'use strict';

  const STEP_KEY = 'sitepass_v471_registration_wizard_step';
  const LEGACY_STEP_KEY = 'sitepass_v470_registration_wizard_step';
  const VALID_STEPS = ['equipment','driver-choice','driver','worker-choice','worker'];
  let currentStep = 'equipment';
  let applying = false;
  let lastDriverVerified = false;

  function qs(sel, root){ return (root || document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }
  function labelForStep(step){
    return ({
      equipment:'1. 장비서류',
      'driver-choice':'2. 기사 선택',
      driver:'2. 기사서류',
      'worker-choice':'3. 인부 선택',
      worker:'3. 인부서류'
    })[step] || '1. 장비서류';
  }
  function driverIsVerified(){
    const panelVerified = qs('[data-person-auth-panel="driver"]')?.dataset.authVerified === 'true';
    if (panelVerified) return true;
    const cards = qsa('.doc-card[data-group-key="driver"]');
    const attached = cards.filter(function(card){
      const box = qs('[data-role="filename"]', card);
      const pages = box?.dataset?.pages || '';
      return !!(pages && pages !== '[]') || card.dataset.authVerified === 'true';
    });
    return attached.length > 0 && attached.every(function(card){ return card.dataset.authVerified === 'true'; });
  }
  function saveStep(step){
    try { localStorage.setItem(STEP_KEY, step); } catch(e) {}
  }
  function clearStep(){
    try { localStorage.removeItem(STEP_KEY); localStorage.removeItem(LEGACY_STEP_KEY); } catch(e) {}
  }
  function readStep(){
    try {
      const value = localStorage.getItem(STEP_KEY) || localStorage.getItem(LEGACY_STEP_KEY) || '';
      if (value === 'driver-choice') return 'equipment';
      if (value === 'worker-choice') return document.getElementById('includeDriverDocs')?.checked ? 'driver' : 'equipment';
      return VALID_STEPS.includes(value) ? value : 'equipment';
    } catch(e) { return 'equipment'; }
  }
  function setCheckbox(id, checked){
    const input = document.getElementById(id);
    if (!input) return;
    const next = !!checked;
    const changed = input.checked !== next;
    input.checked = next;
    if (changed) {
      try { toggleBundleGroup(id === 'includeDriverDocs' ? 'driver' : 'worker'); } catch(e) {}
    } else {
      const key = id === 'includeDriverDocs' ? 'driver' : 'worker';
      const group = qs('[data-bundle-group="' + key + '"]');
      if (group) {
        group.classList.toggle('inactive', !next);
        group.dataset.active = next ? 'true' : 'false';
        qs('.bundle-group-body', group)?.classList.toggle('hidden', !next);
      }
    }
  }
  function scrollRegisterTop(){
    const target = document.getElementById('registerScreen');
    try { target?.scrollIntoView({behavior:'smooth', block:'start'}); } catch(e) { window.scrollTo(0,0); }
  }
  function setProgress(step){
    const stageMap = {equipment:1,'driver-choice':2,driver:2,'worker-choice':3,worker:3};
    const active = stageMap[step] || 1;
    const includeDriver = !!document.getElementById('includeDriverDocs')?.checked;
    const includeWorker = !!document.getElementById('includeWorkerDocs')?.checked;
    qsa('#registrationWizardProgress470 [data-wizard-stage]').forEach(function(el){
      const n = Number(el.dataset.wizardStage || 0);
      const included = n === 1 || (n === 2 && includeDriver) || (n === 3 && includeWorker);
      el.classList.toggle('active', n === active);
      el.classList.toggle('included', included && n !== active);
      el.classList.remove('done');
      el.setAttribute('aria-pressed', included ? 'true' : 'false');
      if (n === active) el.setAttribute('aria-current','step');
      else el.removeAttribute('aria-current');
    });
    const title = qs('#registrationWizardStepTitle470');
    if (title) title.textContent = labelForStep(step);
    const desc = qs('#registrationWizardStepDesc470');
    if (desc) {
      desc.textContent = step === 'equipment' ? '장비 기본정보와 장비서류만 먼저 등록합니다.' :
        step === 'driver-choice' ? '기사서류를 함께 등록할지 선택합니다.' :
        step === 'driver' ? '기사 휴대폰 동의·인증 후 기사서류를 등록합니다.' :
        step === 'worker-choice' ? '인부서류를 함께 등록할지 선택합니다.' :
        '인부별 휴대폰 동의·인증 후 서류를 등록합니다.';
    }
  }
  function renderChoice(step){
    const box = qs('#registrationChoicePanel470');
    if (!box) return;
    if (step === 'driver-choice') {
      box.className = 'sitepass-wizard-choice470';
      box.innerHTML = '<div><b>기사서류도 등록하시겠습니까?</b><span>기사 있음은 휴대폰 동의·인증 후 기사서류 등록으로 넘어갑니다.</span></div>' +
        '<div class="sitepass-wizard-choice-actions470"><button type="button" class="secondary" onclick="sitePassWizardSkipDriver470()">기사 없음</button><button type="button" class="primary" onclick="sitePassWizardUseDriver470()">기사 있음</button></div>';
      box.classList.remove('hidden');
    } else if (step === 'worker-choice') {
      box.className = 'sitepass-wizard-choice470';
      box.innerHTML = '<div><b>인부서류도 등록하시겠습니까?</b><span>인부 있음은 인부별 휴대폰 동의·인증 후 서류 등록으로 넘어갑니다.</span></div>' +
        '<div class="sitepass-wizard-choice-actions470"><button type="button" class="secondary" onclick="sitePassWizardSkipWorker470()">인부 없음</button><button type="button" class="primary" onclick="sitePassWizardUseWorker470()">인부 있음</button></div>';
      box.classList.remove('hidden');
    } else {
      box.className = 'sitepass-wizard-choice470 hidden';
      box.innerHTML = '';
    }
  }
  function applyGroupVisibility(step){
    const register = qs('#registerScreen');
    if (!register) return;
    register.dataset.registrationStep = step;
    qsa('#docCards .bundle-group').forEach(function(group){
      const key = group.dataset.bundleGroup || '';
      const show = (step === 'equipment' && key === 'equipment') || (step === 'driver' && key === 'driver') || (step === 'worker' && key === 'worker');
      group.classList.toggle('sitepass-wizard-group-hidden470', !show);
    });
    const basicCard = qs('#registrationBasicCard470') || qs('#registerScreen > .card:first-child');
    if (basicCard) basicCard.classList.toggle('sitepass-wizard-basic-collapsed470', step !== 'equipment');
    const documentSection = qs('#documentSection');
    if (documentSection) documentSection.classList.toggle('sitepass-wizard-choice-only470', step === 'driver-choice' || step === 'worker-choice');
    const driverVerified = driverIsVerified();
    register.classList.toggle('sitepass-wizard-driver-auth-pending470', step === 'driver' && !driverVerified);
    const previewCard = qs('#registrationAlertCard470');
    if (previewCard) previewCard.classList.toggle('hidden', true);
  }
  function setButtons(step){
    const back = qs('#wizardBackButton470');
    const main = qs('#saveBundleButton');
    const includeDriver = !!document.getElementById('includeDriverDocs')?.checked;
    const includeWorker = !!document.getElementById('includeWorkerDocs')?.checked;
    if (back) back.classList.toggle('hidden', step === 'equipment');
    if (!main) return;
    main.onclick = window.sitePassRegistrationWizardNext470;
    const driverPending = step === 'driver' && !driverIsVerified();
    main.classList.toggle('hidden', step === 'driver-choice' || step === 'worker-choice' || driverPending);
    if (step === 'equipment') {
      main.textContent = includeDriver ? '저장하고 기사서류로' : includeWorker ? '저장하고 인부서류로' : '등록완료';
    }
    if (step === 'driver') main.textContent = includeWorker ? '저장하고 인부서류로' : '등록완료';
    if (step === 'worker') main.textContent = '등록완료';
  }
  function updatePrivateAuthHint(step){
    const hint = qs('#registrationWizardPrivateHint470');
    if (!hint) return;
    if (step === 'driver') {
      const verified = driverIsVerified();
      hint.textContent = verified ? '기사 인증이 완료되었습니다. 필수 기사서류를 첨부한 뒤 다음을 눌러주세요.' : '먼저 기사 휴대폰으로 동의 링크를 보내고 6자리 인증번호를 확인해주세요.';
      hint.classList.remove('hidden');
    } else if (step === 'worker') {
      const count = qsa('#workerPeopleList .worker-person-card').length;
      hint.textContent = count ? '인부 ' + count + '명의 서류등록칸이 열렸습니다. 추가 인부가 있으면 위 인증을 다시 진행하세요.' : '먼저 인부 휴대폰으로 동의 링크를 보내고 인증하면 해당 인부의 서류등록칸이 열립니다.';
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
      currentStep = VALID_STEPS.includes(step) ? step : 'equipment';
      if (!options || options.persist !== false) saveStep(currentStep);
      installStageNavigation();
      setProgress(currentStep);
      renderChoice(currentStep);
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
    if (groupKey === 'driver') {
      const panel = qs('[data-person-auth-panel="driver"]');
      if (!driverIsVerified()) {
        alert('기사 휴대폰 동의·인증을 먼저 완료해주세요.');
        panel?.scrollIntoView({behavior:'smooth', block:'center'});
        return false;
      }
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
  function saveDraft(){
    try { saveRegistrationDraftNow(); } catch(e) {}
  }
  function stageNumberForStep(step){
    return ({equipment:1,'driver-choice':2,driver:2,'worker-choice':3,worker:3})[step] || 1;
  }
  function stepForStage(stage){
    const n = Number(stage || 1);
    if (n === 1) return 'equipment';
    if (n === 2) return 'driver';
    return 'worker';
  }
  function navigateStage(stage){
    const targetStage = Math.max(1, Math.min(3, Number(stage || 1)));

    /* v23.7.471: 작성 순서와 관계없이 기사·인부 탭을 미리 열 수 있습니다.
       탭을 누른 행위 자체를 해당 서류를 함께 등록하겠다는 선택으로 사용합니다. */
    if (targetStage === 2) setCheckbox('includeDriverDocs', true);
    if (targetStage === 3) setCheckbox('includeWorkerDocs', true);
    applyStep(stepForStage(targetStage));
  }
  function installStageNavigation(){
    qsa('#registrationWizardProgress470 [data-wizard-stage]').forEach(function(el){
      const stage = Number(el.dataset.wizardStage || 1);
      el.setAttribute('role','button');
      el.setAttribute('tabindex','0');
      el.setAttribute('aria-label', stage === 1 ? '장비서류 단계로 이동' : stage === 2 ? '기사서류 단계로 이동' : '인부서류 단계로 이동');
      if (el.dataset.wizardClickBound === 'true') return;
      el.dataset.wizardClickBound = 'true';
      el.addEventListener('click', function(){ navigateStage(stage); });
      el.addEventListener('keydown', function(e){
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        navigateStage(stage);
      });
    });
  }
  async function next(){
    const includeDriver = !!document.getElementById('includeDriverDocs')?.checked;
    const includeWorker = !!document.getElementById('includeWorkerDocs')?.checked;
    if (currentStep === 'equipment') {
      if (!validateBasic() || !validateStaticGroup('equipment')) return;
      saveDraft();
      if (includeDriver) return applyStep('driver');
      if (includeWorker) return applyStep('worker');
      await finalize();
      return;
    }
    if (currentStep === 'driver') {
      if (!validateStaticGroup('driver')) return;
      saveDraft();
      if (includeWorker) return applyStep('worker');
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
    if (!validateBasic() || !validateStaticGroup('equipment')) {
      applyStep('equipment');
      return;
    }
    if (document.getElementById('includeDriverDocs')?.checked && !validateStaticGroup('driver')) {
      applyStep('driver');
      return;
    }
    if (document.getElementById('includeWorkerDocs')?.checked && !validateWorker()) {
      applyStep('worker');
      return;
    }
    const btn = qs('#saveBundleButton');
    if (btn) btn.disabled = true;
    try { await saveEquipment(); }
    finally { if (btn) btn.disabled = false; }
  }
  function useDriver(){ setCheckbox('includeDriverDocs', true); applyStep('driver'); }
  function skipDriver(){ setCheckbox('includeDriverDocs', false); saveDraft(); applyStep('worker-choice'); }
  function useWorker(){ setCheckbox('includeWorkerDocs', true); applyStep('worker'); }
  async function skipWorker(){ setCheckbox('includeWorkerDocs', false); saveDraft(); await finalize(); }
  function back(){
    if (currentStep === 'driver-choice' || currentStep === 'driver') return applyStep('equipment');
    if (currentStep === 'worker-choice' || currentStep === 'worker') {
      return applyStep(document.getElementById('includeDriverDocs')?.checked ? 'driver' : 'equipment');
    }
  }

  function installWrappers(){
    if (window.__sitePassWizard470Wrapped) return;
    window.__sitePassWizard470Wrapped = true;

    const originalRender = window.renderDocCards;
    if (typeof originalRender === 'function') window.renderDocCards = function(){ const out = originalRender.apply(this, arguments); setTimeout(function(){ applyStep(currentStep, {persist:false,scroll:false}); },0); return out; };

    const originalReset = window.resetForm;
    if (typeof originalReset === 'function') window.resetForm = function(){ const out = originalReset.apply(this, arguments); clearStep(); currentStep = 'equipment'; setTimeout(function(){ applyStep('equipment',{persist:false,scroll:false}); },0); return out; };

    const originalRestore = window.restoreRegistrationDraft;
    if (typeof originalRestore === 'function') window.restoreRegistrationDraft = function(){ const out = originalRestore.apply(this, arguments); setTimeout(function(){ applyStep(readStep(),{persist:false,scroll:false}); },140); return out; };

    const originalStartNew = window.startNewRegistration;
    if (typeof originalStartNew === 'function') window.startNewRegistration = function(){ const out = originalStartNew.apply(this, arguments); setTimeout(function(){ if (!qs('#registerScreen')?.classList.contains('hidden')) { currentStep = readStep(); applyStep(currentStep,{persist:false,scroll:false}); } },100); return out; };

    const originalStartEdit = window.startEditEquipment;
    if (typeof originalStartEdit === 'function') window.startEditEquipment = function(){ clearStep(); currentStep = 'equipment'; const out = originalStartEdit.apply(this, arguments); setTimeout(function(){ applyStep('equipment',{persist:true,scroll:false}); },100); return out; };

    const originalClear = window.clearRegistrationDraft;
    if (typeof originalClear === 'function') window.clearRegistrationDraft = function(){ clearStep(); return originalClear.apply(this, arguments); };
  }

  function observeAuth(){
    const observer = new MutationObserver(function(){
      const verifiedNow = driverIsVerified();
      updatePrivateAuthHint(currentStep);
      setTimeout(function(){ applyGroupVisibility(currentStep); setButtons(currentStep); },0);
      if (currentStep === 'driver' && verifiedNow && !lastDriverVerified) {
        setTimeout(function(){
          const first = qs('.doc-card[data-group-key="driver"]');
          try { first?.scrollIntoView({behavior:'smooth', block:'start'}); } catch(e) {}
        }, 180);
      }
      lastDriverVerified = verifiedNow;
    });
    const root = qs('#docCards');
    if (root) observer.observe(root,{subtree:true,attributes:true,attributeFilter:['data-auth-verified','data-pending-verified'],childList:true});
  }
  function init(){
    installWrappers();
    installStageNavigation();
    currentStep = readStep();
    applyStep(currentStep,{persist:false,scroll:false});
    observeAuth();
    document.addEventListener('change', function(e){
      if (e.target && e.target.closest && e.target.closest('#registerScreen')) setTimeout(function(){
        updatePrivateAuthHint(currentStep);
        setProgress(currentStep);
        setButtons(currentStep);
      },0);
    }, true);
  }

  window.sitePassRegistrationWizardNext470 = next;
  window.sitePassRegistrationWizardBack470 = back;
  window.sitePassWizardUseDriver470 = useDriver;
  window.sitePassWizardSkipDriver470 = skipDriver;
  window.sitePassWizardUseWorker470 = useWorker;
  window.sitePassWizardSkipWorker470 = skipWorker;
  window.sitePassApplyRegistrationStep470 = applyStep;
  window.sitePassNavigateRegistrationStage470 = navigateStage;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
