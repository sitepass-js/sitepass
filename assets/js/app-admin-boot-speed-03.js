// SitePass v23.7.350 - speed optimized medium chunk (app-admin-boot-speed 03/03)
// ---- merged from app-admin-boot-11.js ----
// SitePass v23.7.350 - app-admin-boot finer split (11/14)
let sitePassAdminRenderTimer487 = 0;
let sitePassAdminLastBaseHtml488 = '';
let sitePassAdminRenderBusy488 = false;
function requestAdminRender487(delay) {
      clearTimeout(sitePassAdminRenderTimer487);
      sitePassAdminRenderTimer487 = setTimeout(function(){
        try { renderAdmin(); } catch (e) { console.warn('관리자 화면 안정화 렌더 실패:', e); }
      }, Number(delay || 90));
    }
window.sitePassRequestAdminRender487 = requestAdminRender487;
function renderAdmin() {
      if (sitePassAdminRenderBusy488) return;
      if (!isAdminLoggedIn()) { showScreen('signupScreen'); return; }
      sitePassAdminRenderBusy488 = true;
      try {
      if (!sitePassEquipmentSyncing && (!sitePassEquipmentSyncedAt || Date.now() - sitePassEquipmentSyncedAt > 30000)) {
        try { syncSupabaseEquipmentItems(true); } catch (e) {}
      }
      const items = getAdminVisibleEquipmentItems();
      const members = ensureMemberIds();
      let rawEquipmentItems = getItems();
      try {
        if (window.SitePassArchive && typeof window.SitePassArchive.filterArchiveVisibleItems === 'function') rawEquipmentItems = window.SitePassArchive.filterArchiveVisibleItems(rawEquipmentItems);
      } catch (e) {}
      const rawEquipmentCount = rawEquipmentItems.length;
      const total = items.length;
      const paused = items.filter(isQrPaused).length;
      const expiringDocs = items.reduce((sum, item) => sum + Object.values(item.docs || {}).filter(doc => (doc.status || getDocStatus(doc)) === '만료임박').length, 0);
      const expiredDocs = items.reduce((sum, item) => sum + Object.values(item.docs || {}).filter(doc => (doc.status || getDocStatus(doc)) === '만료').length, 0);
      const paymentDue = items.filter(item => {
        if (!item.trialEndsAt || item.serviceStatus === '유료사용') return false;
        const diff = Math.ceil((new Date(item.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 7;
      }).length;
      const grace14Items = items.filter(isServiceGrace14Over).length;
      const contacts = getContacts();
      const waitingContacts = contacts.filter(x => x.status !== '답변완료').length;
      const visitStats = getVisitStats();
      const todayKey = getLocalDateKey();
      const todayVisitors = Number((visitStats.daily || {})[todayKey] || 0);
      const totalVisitors = Number(visitStats.total || 0);
      const todaySignups = countTodaySignups(members);
      const totalEquipmentCount = total;
      const topSummary = '<div class="card" style="box-shadow:none;margin-top:12px;">' +
        '<h3>관리자 요약 현황</h3>' +
        '<div class="small">장비 서버동기화: ' + escapeHtml(sitePassEquipmentSyncMessage || (sitePassEquipmentSyncedAt ? '마지막 확인 ' + formatNullableDateTime(new Date(sitePassEquipmentSyncedAt).toISOString()) : '대기 중')) + ' · 원본장비 ' + rawEquipmentCount + '대 / 활성회원 연결장비 ' + totalEquipmentCount + '대</div>' +
        '<div class="actions" style="margin:8px 0 4px;"><button type="button" class="ghost" onclick="cleanupOrphanEquipmentForAdmin()">장비/큐알 정리</button></div>' +
        '<div class="admin-summary-rows">' +
          '<div class="admin-summary-row">' +
            '<div class="line"><b>오늘방문자수</b><span>' + todayVisitors + '명</span></div>' +
            '<div class="line"><b>토탈방문자수</b><span>' + totalVisitors + '명</span></div>' +
          '</div>' +
          '<div class="admin-summary-row">' +
            '<div class="line"><b>오늘가입자수</b><span>' + todaySignups + '명</span></div>' +
            renderAdminQuickLine('전체장비등록수', totalEquipmentCount + '대', 'openAdminListQuickFilter(\'all\')') +
          '</div>' +
        '</div>' +
      '</div>';
      const adminBaseHtml488 =
        '<div class="notice blue-note"><b>현재 권한: ' + escapeHtml(getCurrentAdminRoleName()) + '</b><br>' + (isSuperAdminLoggedIn() ? '대표이사 최고관리자는 모든 관리 기능을 사용할 수 있으며, 직원 관리자 아이디 생성/비밀번호 재설정/해제가 가능합니다.' : '직원 관리자는 관리자모드 접속 권한만 부여된 상태입니다. 관리자 아이디 생성/해제는 최고관리자만 가능합니다.') + '</div>' +
        topSummary +
        renderAdminTodoSummary({ waitingContacts, paymentDue, paused, expiringDocs, expiredDocs, grace14Items }) +
        renderAdminStaffManager(members) + renderAdminContactManager();
      const adminBox488 = document.getElementById('adminBox');
      if (adminBox488 && (sitePassAdminLastBaseHtml488 !== adminBaseHtml488 || !adminBox488.innerHTML.trim())) {
        sitePassAdminLastBaseHtml488 = adminBaseHtml488;
        adminBox488.innerHTML = adminBaseHtml488;
      }
      setTimeout(function(){
        try {
          if (window.SitePassPushNotify && typeof window.SitePassPushNotify.refreshPanel === 'function') {
            window.SitePassPushNotify.refreshPanel();
          }
        } catch (e) {}
      }, 30);
      } finally {
        sitePassAdminRenderBusy488 = false;
      }
    }

    function deleteItem(code) {
      const archive = getArchiveModule();
      if (archive.deleteItem) return archive.deleteItem(code);
      alert('보관함 삭제 모듈을 불러오지 못했습니다.');
    }

    function clearAll() {
      const archive = getArchiveModule();
      if (archive.clearAll) return archive.clearAll();
      alert('보관함 삭제 모듈을 불러오지 못했습니다.');
    }

    function getDocStatus(doc) {
      if (!doc.fileName) return doc.required ? '미첨부' : '선택안함';
      const effectiveDate = (window.sitePassGetEffectiveDocExpireDateV486 && window.sitePassGetEffectiveDocExpireDateV486(doc)) || doc.expireDate || '';
      if (!doc.expiry || !effectiveDate) return '첨부됨';
      const today = new Date();
      today.setHours(0,0,0,0);
      const end = new Date(effectiveDate);
      const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
      if (diff < 0) return '만료';
      if (diff <= 30) return '만료임박';
      return '정상';
    }

    function getDdayText(dateValue) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const d = new Date(dateValue);
      const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      if (Number.isNaN(diff)) return '';
      if (diff < 0) return '만료 ' + Math.abs(diff) + '일 지남';
      if (diff === 0) return '오늘 만료';
      return 'D-' + diff;
    }

    function makeAlertSummary(docs) {
      // v23.7.350: 보관함/관리자 목록에 장비가 아닌 인부/기사 전용 항목이나
      // 저장공간 부족으로 docs가 축약된 항목이 섞여도 화면 렌더링이 멈추지 않게 방어합니다.
      docs = (docs && typeof docs === 'object') ? docs : {};
      const targets = ['equipmentInspection','insurancePolicy','ndtInspection','driverLicense','driverMachinerySafetyTraining'];
      const parts = targets
        .map(key => docs && docs[key])
        .filter(Boolean)
        .map(doc => ({ doc, expireDate:(window.sitePassGetEffectiveDocExpireDateV486 && window.sitePassGetEffectiveDocExpireDateV486(doc)) || doc.expireDate || '' }))
        .filter(row => !!row.expireDate)
        .map(row => (row.doc.title || '서류') + ' ' + getDdayText(row.expireDate));
      return parts.length ? parts.join(' / ') : '만료날짜 입력 없음';
    }

    function openPreviewModal(src) {
      const modal = document.getElementById('previewModal');
      const img = document.getElementById('previewModalImg');
      const frame = document.getElementById('previewModalFrame');
      if (frame) frame.src = '';
      modal.classList.remove('pdf');
      img.src = src;
      modal.classList.add('show');
    }

    function openPdfPreview(src) {
      if (!src) {
        alert('PDF 미리보기 파일이 없습니다. 파일선택으로 다시 첨부하면 바로 미리볼 수 있습니다.');
        return;
      }
      const modal = document.getElementById('previewModal');
      const img = document.getElementById('previewModalImg');
      const frame = document.getElementById('previewModalFrame');
      if (img) img.src = '';
      if (frame) frame.src = src;
      modal.classList.add('pdf');
      modal.classList.add('show');
    }

    function closePreviewModal() {
      const modal = document.getElementById('previewModal');
      const img = document.getElementById('previewModalImg');
      const frame = document.getElementById('previewModalFrame');
      modal.classList.remove('show');
      modal.classList.remove('pdf');
      img.src = '';
      if (frame) frame.src = '';
    }

// ---- merged from app-admin-boot-12.js ----
// SitePass v23.7.350 - app-admin-boot finer split (12/14)
function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

    function escapeJs(value) {
      return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
    }

    function getActiveInstallGuidePanel() {
      const panels = Array.from(document.querySelectorAll('[data-install-manual-guide]'));
      return panels.find(panel => {
        const screen = panel.closest('.screen');
        return screen && !screen.classList.contains('hidden');
      }) || panels[0] || null;
    }

    function setHomeInstallStatus(message) {
      document.querySelectorAll('[data-install-status]').forEach(status => { status.innerHTML = message; });
    }

    function isHomeInstallGuidePanelOpen() {
      const guide = getActiveInstallGuidePanel();
      return !!(guide && !guide.classList.contains('hidden'));
    }

    function openHomeInstallGuidePanel(message) {
      const guide = getActiveInstallGuidePanel();
      if (message) setHomeInstallStatus(message);
      if (guide) {
        guide.classList.remove('hidden');
        updateHomeInstallButtonState();
        try { guide.scrollIntoView({ behavior:'smooth', block:'center' }); } catch (e) {}
      }
    }

    function closeHomeInstallGuidePanel(message) {
      const guide = getActiveInstallGuidePanel();
      if (guide) guide.classList.add('hidden');
      if (message) setHomeInstallStatus(message);
      updateHomeInstallButtonState();
    }

    function isSitePassStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function getSitePassInstallFallbackMessage() {
      const ua = navigator.userAgent || '';
      const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isKakao = /KAKAOTALK/i.test(ua);
      const isSecure = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';

      if (isSitePassStandalone()) {
        return '이미 홈화면에서 현장서류패스 앱처럼 실행 중입니다.';
      }
      if (location.protocol === 'file:') {
        return '현재는 PC에서 파일을 직접 연 상태라 설치창이 뜨지 않습니다. 정식 https 주소에 올린 뒤 <b>바탕화면에 설치하기</b> 버튼을 확인해야 합니다.';
      }
      if (!isSecure) {
        return '설치창을 띄우려면 https 보안주소가 필요합니다. 정식 도메인 또는 HTTPS 베타 주소에서 다시 눌러주세요.';
      }
      if (isKakao) {
        return '카카오톡 안에서는 설치창이 잘 안 뜰 수 있습니다. 먼저 <b>외부 브라우저로 열기</b>를 누른 뒤 설치해주세요.';
      }
      if (isIOS) {
        return '아이폰은 버튼 한 번으로 설치창을 강제로 열 수 없습니다. 공유 버튼(□↑)에서 <b>홈 화면에 추가</b>를 눌러 저장합니다.';
      }
      return '브라우저가 아직 설치 가능 신호를 보내지 않았습니다. 20~30초 정도 사용 후 다시 누르거나, 메뉴(⋮)에서 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 눌러주세요.';
    }

    function updateHomeInstallButtonState(message) {
      const buttons = Array.from(document.querySelectorAll('[data-install-primary-button]'));
      buttons.forEach(btn => {
        if (isSitePassStandalone()) {
          btn.textContent = '이미 설치됨';
          btn.disabled = true;
        } else if (isHomeInstallGuidePanelOpen()) {
          btn.textContent = '설치 안내 접기';
          btn.disabled = false;
        } else if (deferredSitePassInstallPrompt) {
          btn.textContent = '바탕화면에 설치하기';
          btn.disabled = false;
        } else {
          btn.textContent = '바탕화면에 설치하기';
          btn.disabled = false;
        }
      });
      if (message) setHomeInstallStatus(message);
    }

    async function addSitePassToHomeScreen(event) {
      if (event && event.preventDefault) event.preventDefault();

      if (isHomeInstallGuidePanelOpen()) {
        closeHomeInstallGuidePanel('설치 안내를 접었습니다. 필요하면 다시 <b>바탕화면에 설치하기</b>를 눌러주세요.');
        return false;
      }

      if (isSitePassStandalone()) {
        openHomeInstallGuidePanel('이미 홈화면에서 현장서류패스 앱처럼 실행 중입니다.');
        updateHomeInstallButtonState();
        return false;
      }

      if (deferredSitePassInstallPrompt) {
        try {
          deferredSitePassInstallPrompt.prompt();
          const choice = await deferredSitePassInstallPrompt.userChoice;
          deferredSitePassInstallPrompt = null;
          if (choice && choice.outcome === 'accepted') {
            closeHomeInstallGuidePanel('홈화면 추가가 진행되었습니다. 설치가 끝나면 현장서류패스 아이콘으로 들어오면 됩니다.');
          } else {
            openHomeInstallGuidePanel('설치창을 닫았습니다. 필요하면 아래 방법으로 직접 추가할 수 있습니다.');
          }
          updateHomeInstallButtonState();
        } catch (e) {
          deferredSitePassInstallPrompt = null;
          openHomeInstallGuidePanel('이 브라우저에서는 자동 설치창이 뜨지 않아 아래 방법으로 직접 추가하면 됩니다.');
          updateHomeInstallButtonState();
        }
        return false;
      }

      openHomeInstallGuidePanel(getSitePassInstallFallbackMessage());
      return false;
    }

    function showHomeInstallGuide(event) {
      if (event && event.preventDefault) event.preventDefault();
      if (isHomeInstallGuidePanelOpen()) {
        closeHomeInstallGuidePanel('설치 안내를 접었습니다.');
      } else {
        openHomeInstallGuidePanel(getSitePassInstallFallbackMessage());
      }
      return false;
    }


    const SITEPASS_RECOMMEND_INSTALL_URL = 'https://sitepass-js.github.io/sitepass/recommend.html';

    function getSitePassQueryParam(name) {
      try { return new URLSearchParams(location.search || '').get(name) || ''; } catch (e) { return ''; }
    }

    function isSitePassRecommendInstallRequest() {
      const install = getSitePassQueryParam('install');
      const ref = getSitePassQueryParam('ref') || getSitePassQueryParam('from');
      return install === '1' || install === 'home' || install === 'app' || ref === 'recommend' || ref === 'invite';
    }

    function copyRecommendInstallLink() {
      copyTextFallback(SITEPASS_RECOMMEND_INSTALL_URL, '추천용 설치 링크를 복사했습니다.\n카카오톡/문자로 보내면 받은 사람이 설치화면으로 바로 들어옵니다.');
    }

    function openRecommendInstallLanding() {
      if (!isSitePassRecommendInstallRequest()) return false;
      if (isSitePassStandalone()) return false;
      showScreen('installScreen', { replace:true });
      const linkText = document.getElementById('recommendInstallLinkText');
      if (linkText) linkText.textContent = SITEPASS_RECOMMEND_INSTALL_URL;
      setHomeInstallStatus('추천링크로 접속했습니다. 아래 <b>바탕화면에 설치하기</b>를 누르면 설치 가능한 브라우저는 설치창이 열리고, 안 뜨면 수동 방법을 따라 추가하면 됩니다.');
      setTimeout(function() {
        if (!deferredSitePassInstallPrompt && !isSitePassStandalone()) {
          openHomeInstallGuidePanel(getSitePassInstallFallbackMessage());
        } else {
          updateHomeInstallButtonState('설치 준비가 완료되면 <b>바탕화면에 설치하기</b> 버튼으로 설치창을 열 수 있습니다.');
        }
      }, 900);
      return true;
    }

    // v23.7.259: PWA 자동업데이트/서비스워커 등록은 assets/js/pwa-update.js로 분리했습니다.
    const SITEPASS_APP_VERSION = (window.SITEPASS_DB_CONFIG && window.SITEPASS_DB_CONFIG.appVersion) || 'v23.7.282';
    const SITEPASS_FIXED_APP_URL = 'https://sitepass-js.github.io/sitepass/';

    window.SitePassPwaRuntime = window.SitePassPwaRuntime || {};
    Object.assign(window.SitePassPwaRuntime, {
      getAppVersion: function(){ return SITEPASS_APP_VERSION; },
      getFixedAppUrl: function(){ return SITEPASS_FIXED_APP_URL; },
      setHomeInstallStatus: function(message){ return setHomeInstallStatus(message); },
      isStandalone: function(){ return isSitePassStandalone(); },
      hasDeferredInstallPrompt: function(){ return !!deferredSitePassInstallPrompt; }
    });

    function getPwaUpdateModule() {
      return window.SitePassPwaUpdate || {};
    }

    async function checkSitePassAutoUpdate() {
      const mod = getPwaUpdateModule();
      if (mod.checkAutoUpdate) return mod.checkAutoUpdate();
    }

    function registerSitePassServiceWorker() {
      const mod = getPwaUpdateModule();
      if (mod.registerServiceWorker) return mod.registerServiceWorker();
      setHomeInstallStatus('PWA 업데이트 파일을 불러오지 못했습니다. assets/js/pwa-update.js 업로드를 확인해주세요.');
    }

    window.forceSitePassUpdateReload = function() {
      const mod = getPwaUpdateModule();
      if (mod.forceUpdateReload) return mod.forceUpdateReload(SITEPASS_APP_VERSION);
      location.reload();
    };

    window.addEventListener('load', function() {
      setTimeout(checkSitePassAutoUpdate, 600);
      setTimeout(openRecommendInstallLanding, 1100);
    });

    const DEMO_MANAGER_CODE = 'SP-DEMO-00BO0000';

    function makeDemoPreviewDataUrl(title, line1, line2) {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1260" viewBox="0 0 900 1260">' +
        '<rect width="900" height="1260" fill="#ffffff"/>' +
        '<rect x="55" y="55" width="790" height="1150" rx="28" fill="#f8fbff" stroke="#c9d3e4" stroke-width="5"/>' +
        '<text x="450" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="50" font-weight="800" fill="#172033">' + escapeHtml(title) + '</text>' +
        '<rect x="125" y="220" width="650" height="4" fill="#2457d6"/>' +
        '<text x="130" y="320" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#26334d">' + escapeHtml(line1) + '</text>' +
        '<text x="130" y="395" font-family="Arial, sans-serif" font-size="34" fill="#667085">' + escapeHtml(line2) + '</text>' +
        '<text x="130" y="500" font-family="Arial, sans-serif" font-size="30" fill="#667085">SitePass 담당자 화면 데모용 미리보기입니다.</text>' +
        '<rect x="130" y="575" width="640" height="420" rx="18" fill="#ffffff" stroke="#d7dfed" stroke-width="4"/>' +
        '<text x="450" y="760" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="#173f9f">첨부 서류 이미지</text>' +
        '<text x="450" y="835" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#667085">실제 서비스에서는 촬영/업로드 원본이 표시됩니다.</text>' +
        '</svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

// ---- merged from app-admin-boot-13.js ----
// SitePass v23.7.350 - app-admin-boot finer split (13/14)
function makeDemoDoc(key, groupKey, groupTitle, title, required, expiry, expireDate, fileName, index) {
      const preview = makeDemoPreviewDataUrl(title, '장비: 굴착기 / 00보0000', expireDate ? ('만료일: ' + expireDate) : '유효기간 확인용 서류');
      const doc = {
        key, groupKey, groupTitle, title, required:!!required, expiry:!!expiry, expireDate:expireDate || '',
        pages:[{ fileName:fileName, fileType:'image/png', previewDataUrl:preview, originalDataUrl:preview, correctedDataUrl:preview, previewChoice:'preview', pageNo:1, addedAt:new Date().toISOString() }],
        pageCount:1,
        fileName:fileName,
        fileSource:'demo',
        fileType:'image/png',
        previewDataUrl:preview,
        originalDataUrl:preview,
        correctedDataUrl:preview,
        previewChoice:'preview',
        autoFit:'demo',
        driverPhone:key === 'driverIdCard' ? '010-1234-5678' : '',
        personPhone:key === 'driverIdCard' ? '010-1234-5678' : '',
        workerPhone:'',
        workerTask:'',
        authVerified:true,
        authVerifiedAt:new Date().toISOString()
      };
      doc.status = getDocStatus(doc);
      return doc;
    }

    function ensureManagerDemoItem() {
      const nowIso = new Date().toISOString();
      const expireIso = addDaysIso(nowIso, 7);
      const demoDocs = {
        businessLicense: makeDemoDoc('businessLicense','equipment','장비서류','사업자등록증',true,false,'','굴착기_00보0000_사업자등록증.png'),
        equipmentRegistration: makeDemoDoc('equipmentRegistration','equipment','장비서류','장비등록증',true,false,'','굴착기_00보0000_장비등록증.png'),
        equipmentInspection: makeDemoDoc('equipmentInspection','equipment','장비서류','장비검사증',true,true,formatDateOnly(addDaysIso(nowIso, 120)),'굴착기_00보0000_장비검사증.png'),
        insurancePolicy: makeDemoDoc('insurancePolicy','equipment','장비서류','장비보험증권',true,true,formatDateOnly(addDaysIso(nowIso, 80)),'굴착기_00보0000_장비보험증권.png'),
        specSheet: makeDemoDoc('specSheet','equipment','장비서류','장비제원표',false,false,'','굴착기_00보0000_장비제원표.png'),
        driverIdCard: makeDemoDoc('driverIdCard','driver','장비기사서류','기사 신분증',true,false,'','굴착기_00보0000_기사신분증.png'),
        driverLicense: makeDemoDoc('driverLicense','driver','장비기사서류','기사면허증',true,false,'','굴착기_00보0000_기사면허증.png'),
        driverBasicSafetyTraining: makeDemoDoc('driverBasicSafetyTraining','driver','장비기사서류','기사 건설기초안전보건교육 이수증',true,false,'','굴착기_00보0000_기사기초안전교육.png')
      };
      const owner = getAdminSampleEquipmentOwner();
      const item = {
        code:DEMO_MANAGER_CODE,
        type:'BUNDLE',
        equipmentNo:'00보0000',
        equipmentName:'굴착기',
        ownerMemberId:owner.id,
        ownerSignupId:owner.signupId,
        ownerProviderId:owner.providerId,
        ownerName:owner.name,
        ownerPhone:owner.phone,
        bundleMeta:{ unit:'장비등록 1건', includedGroups:['equipment','driver'], includedGroupNames:['장비서류','장비기사서류'], workerPeopleCount:0, normalWorkerCount:0, specialWorkerCount:0, workerPeople:[], paymentText:'실사용 베타 운영 중입니다' },
        workerPeople:[],
        qrLink:makeQrLink(DEMO_MANAGER_CODE),
        docs:demoDocs,
        createdAt:nowIso,
        updatedAt:nowIso,
        trialEndsAt:addDaysIso(nowIso, TRIAL_DAYS),
        serviceStatus:'실사용베타',
        paymentPlan:'monthly',
        basicPlan:'실사용 베타 운영 중입니다',
        alertPlan:'보험·검사 만료 알림 포함 준비',
        forwardPolicy:'담당자용 QR·링크 7일 접속 가능',
        managerExpireAt:expireIso,
        demo:true
      };
      const items = getItems();
      const idx = items.findIndex(x => x.code === DEMO_MANAGER_CODE);
      if (idx >= 0) items[idx] = { ...items[idx], ...item };
      else items.unshift(item);
      setItems(items);
      return item;
    }



    const PAYMENT_TEST_MEMBER_PREFIX = 'MEM-PAYTEST-';
    const PAYMENT_TEST_CODE_PREFIX = 'SP-PAYTEST-';

    function isPaymentTestMember(member) {
      return String(member?.id || '').startsWith(PAYMENT_TEST_MEMBER_PREFIX) || member?.paymentConversionTest === true;
    }

    function isPaymentTestItem(item) {
      return String(item?.code || '').startsWith(PAYMENT_TEST_CODE_PREFIX) || item?.paymentConversionTest === true;
    }

    function getPaymentConversionTestStats(items, members) {
      const testItems = (items || getItems()).filter(isPaymentTestItem);
      const testMembers = (members || getMembers()).filter(isPaymentTestMember);
      const paidItems = testItems.filter(item => !isServiceShareBlocked(item)).length;
      const blockedItems = testItems.filter(item => isServiceShareBlocked(item)).length;
      const unpaidItems = testItems.filter(item => item.paymentTestPaid !== true).length;
      return { testMembers:testMembers.length, testItems:testItems.length, paidItems, blockedItems, unpaidItems };
    }

    function renderPaymentConversionTestPanel(items, members) {
      // 운영 화면에서는 유료전환 차단검사 및 임시 테스트 칸을 표시하지 않습니다.
      return '';
    }

    function makePaymentTestMember(index, paid) {
      const padded = String(index).padStart(2, '0');
      const nowIso = new Date().toISOString();
      const futureEnd = addDaysIso(nowIso, 30);
      const trialEnd = addDaysIso(nowIso, 7);
      return {
        id:PAYMENT_TEST_MEMBER_PREFIX + padded,
        name:'임시 회원' + padded,
        phone:'010-77' + String(1000 + index).slice(-4) + '-' + String(2000 + index).slice(-4),
        signupId:'paytest' + padded,
        provider:'SitePass',
        providerId:'SITEPASS-paytest' + padded,
        signupMethod:'SitePass 베타가입',
        status:paid ? '1개월권' : '실사용베타',
        paymentPlanLabel:paid ? '1개월권' : '실사용베타',
        memberPlan:paid ? '1개월권' : '실사용베타',
        paymentStartedAt:nowIso,
        paymentEndsAt:paid ? futureEnd : trialEnd,
        paymentStatus:paid ? '신규결제완료' : '베타사용중',
        createdAt:nowIso,
        lastLoginAt:nowIso,
        lastLoginMethod:'SitePass 베타가입',
        adminMemo:'유료전환 차단 확인용 임시 회원입니다.',
        paymentConversionTest:true,
        paymentTestPaid:!!paid
      };
    }

    function makePaymentTestDoc(key, title, expiry, expireDate, equipmentName, equipmentNo) {
      const fileName = equipmentName + '_' + equipmentNo + '_' + title + '.png';
      const doc = {
        key, groupKey:'equipment', groupTitle:'장비서류', title, required:true, expiry:!!expiry, expireDate:expireDate || '',
        pages:[{ fileName:fileName, fileType:'image/png', previewDataUrl:'', originalDataUrl:'', correctedDataUrl:'', previewChoice:'', pageNo:1, addedAt:new Date().toISOString() }],
        pageCount:1,
        fileName:fileName,
        fileSource:'payment-test',
        fileType:'image/png',
        previewDataUrl:'',
        originalDataUrl:'',
        correctedDataUrl:'',
        previewChoice:'',
        autoFit:'payment-test-light',
        storageLight:true
      };
      doc.status = getDocStatus(doc);
      return doc;
    }

    function makePaymentTestItem(member, memberIndex, equipmentIndex, paid) {
      const nowIso = new Date().toISOString();
      const equipmentNo = String(10 + memberIndex).padStart(2, '0') + '보' + String(1000 + equipmentIndex).slice(-4);
      const equipmentName = equipmentIndex % 3 === 0 ? '지게차' : (equipmentIndex % 2 === 0 ? '덤프트럭' : '굴착기');
      const code = PAYMENT_TEST_CODE_PREFIX + String(equipmentIndex).padStart(3, '0');
      const trialEnd = addDaysIso(nowIso, 7);
      const paidEnd = addDaysIso(nowIso, 30);
      return {
        code,
        type:'BUNDLE',
        equipmentNo,
        equipmentName,
        ownerMemberId:member.id,
        ownerSignupId:member.signupId,
        ownerProviderId:member.providerId,
        ownerName:member.name,
        ownerPhone:member.phone,
        bundleMeta:{ unit:'장비등록 1건', includedGroups:['equipment'], includedGroupNames:['장비서류'], workerPeopleCount:0, normalWorkerCount:0, specialWorkerCount:0, workerPeople:[], paymentText:paid ? '1개월권 결제완료' : '실사용베타 후 미결제 예정' },
        workerPeople:[],
        qrLink:makeQrLink(code),
        docs:{
          businessLicense:makePaymentTestDoc('businessLicense','사업자등록증',false,'',equipmentName,equipmentNo),
          equipmentRegistration:makePaymentTestDoc('equipmentRegistration','장비등록증',false,'',equipmentName,equipmentNo),
          equipmentInspection:makePaymentTestDoc('equipmentInspection','장비검사증',true,formatDateOnly(addDaysIso(nowIso, 90)),equipmentName,equipmentNo),
          insurancePolicy:makePaymentTestDoc('insurancePolicy','장비보험증권',true,formatDateOnly(addDaysIso(nowIso, 60)),equipmentName,equipmentNo)
        },
        createdAt:nowIso,
        updatedAt:nowIso,
        trialEndsAt:paid ? paidEnd : trialEnd,
        serviceStatus:paid ? '유료사용' : '실사용베타',
        paymentPlan:paid ? 'monthly' : 'trial',
        basicPlan:paid ? '월 결제 · 월 2,000원' : '실사용베타 후 결제대기',
        alertPlan:'보험·검사 만료 알림 포함 준비',
        paidAt:paid ? nowIso : '',
        forwardPolicy:'담당자용 QR·링크 7일 접속 가능',
        managerExpireAt:addDaysIso(nowIso, 7),
        paymentConversionTest:true,
        paymentTestPaid:!!paid
      };
    }

    async function syncPaymentTestMembersToSupabase(testMembers) {
      if (!window.sitepassSupabase || !Array.isArray(testMembers) || !testMembers.length) {
        return { ok:false, total:0, saved:0, failed:0, skipped:!window.sitepassSupabase };
      }
      let saved = 0;
      let failed = 0;
      for (const member of testMembers) {
        try {
          await saveMemberToSupabase(member);
          saved += 1;
        } catch (error) {
          failed += 1;
          console.warn('임시 회원 Supabase 저장 실패:', member && member.signupId, error);
        }
      }
      return { ok:failed === 0, total:testMembers.length, saved, failed, skipped:false };
    }

    async function deletePaymentTestMembersFromSupabase() {
      if (!window.sitepassSupabase) return { ok:false, deleted:0, skipped:true };
      try {
        const { error } = await window.sitepassSupabase
          .from('sitepass_members')
          .delete()
          .like('login_id', 'paytest%');
        if (error) {
          console.warn('Supabase 임시 회원 삭제 실패:', error.message);
          return { ok:false, deleted:0, skipped:false };
        }
        console.log('Supabase 임시 회원 삭제 완료: paytest%');
        return { ok:true, deleted:50, skipped:false };
      } catch (error) {
        console.warn('Supabase 임시 회원 삭제 예외:', error);
        return { ok:false, deleted:0, skipped:false };
      }
    }

    async function createPaymentConversionTestData() {
      if (!isSuperAdminLoggedIn()) { alert('임시 데이터 생성은 최고관리자만 가능합니다.'); return; }
      if (!confirm('임시 회원 50명과 장비 100대를 생성할까요?\n\n기존 임시 데이터는 지우고 다시 만듭니다. 실제 회원/장비는 유지됩니다.')) return;
      const nowIso = new Date().toISOString();
      const existingMembers = getMembers().filter(member => !isPaymentTestMember(member));
      const existingItems = getItems().filter(item => !isPaymentTestItem(item));
      const testMembers = [];
      const testItems = [];
      for (let i = 1; i <= 50; i++) {
        const paid = i <= 20;
        const member = makePaymentTestMember(i, paid);
        testMembers.push(member);
        testItems.push(makePaymentTestItem(member, i, (i - 1) * 2 + 1, paid));
        testItems.push(makePaymentTestItem(member, i, (i - 1) * 2 + 2, paid));
      }
      const nextMembers = testMembers.concat(existingMembers);
      const nextItems = testItems.concat(existingItems);
      const savedItems = setItems(nextItems);
      if (!savedItems) {
        alert('임시 장비 100대 저장에 실패했습니다.\n\n브라우저 임시 저장공간이 부족하거나 기존 사진 데이터가 너무 큽니다. 기존 임시 데이터/큰 사진 서류를 삭제한 뒤 다시 시도해주세요.\n회원만 생성되고 장비가 0대로 보이는 오류를 막기 위해 이번 생성은 중단했습니다.');
        renderAdmin();
        return;
      }
      try {
        setMembers(nextMembers);
      } catch (error) {
        setItems(existingItems);
        alert('임시 회원 50명 저장에 실패했습니다.\n\n브라우저 저장공간을 비운 뒤 다시 시도해주세요. 장비 데이터는 이전 상태로 되돌렸습니다.');
        renderAdmin();
        return;
      }

      const supabaseResult = await syncPaymentTestMembersToSupabase(testMembers);
      const supabaseMessage = supabaseResult.skipped
        ? '\n\nSupabase 연결이 없어 브라우저에만 저장되었습니다.'
        : '\n\nSupabase sitepass_members 저장: ' + supabaseResult.saved + '명' + (supabaseResult.failed ? ' / 실패 ' + supabaseResult.failed + '명' : '');

      alert('임시 데이터 생성 완료\n\n회원 50명 / 장비 100대\n- 결제완료 회원 20명, 장비 40대\n- 실사용베타 회원 30명, 장비 60대' + supabaseMessage + '\n\n다음으로 [베타기간 강제 종료]를 누르면 미결제 장비 60대가 QR 차단 대상이 됩니다.');
      renderAdmin();
    }

// ---- merged from app-admin-boot-14.js ----
// SitePass v23.7.350 - app-admin-boot finer split (14/14)
function expireUnpaidPaymentTestData() {
      if (!isSuperAdminLoggedIn()) { alert('베타기간 종료 처리는 최고관리자만 가능합니다.'); return; }
      const items = getItems();
      const members = getMembers();
      const unpaidItems = items.filter(item => isPaymentTestItem(item) && item.paymentTestPaid !== true);
      if (!unpaidItems.length) { alert('강제 종료할 미결제 임시 장비가 없습니다. 먼저 임시 데이터를 생성해주세요.'); return; }
      const yesterday = addDaysIso(new Date().toISOString(), -1);
      const grace15 = addDaysIso(new Date().toISOString(), -15);
      const unpaidMemberIds = new Set();
      items.forEach(item => {
        if (isPaymentTestItem(item) && item.paymentTestPaid !== true) {
          const seq = Number(String(item.code || '').replace(PAYMENT_TEST_CODE_PREFIX, '')) || 0;
          item.trialEndsAt = seq > 80 ? grace15 : yesterday;
          item.serviceStatus = seq > 80 ? '유예14일경과' : '실사용베타만료';
          item.updatedAt = new Date().toISOString();
          item.managerExpireAt = yesterday;
          unpaidMemberIds.add(item.ownerMemberId);
        }
      });
      members.forEach(member => {
        if (isPaymentTestMember(member) && member.paymentTestPaid !== true) {
          const idx = Number(String(member.id || '').replace(PAYMENT_TEST_MEMBER_PREFIX, '')) || 0;
          member.status = idx > 40 ? '정지' : '미결제';
          member.paymentPlanLabel = '미결제';
          member.memberPlan = '미결제';
          member.paymentStatus = '베타종료 미결제';
          member.paymentEndsAt = idx > 40 ? grace15 : yesterday;
          member.updatedAt = new Date().toISOString();
        }
      });
      setItems(items);
      setMembers(members);
      alert('베타기간 강제 종료 완료\n\n미결제 임시 장비 60대가 QR 차단 대상입니다.\n그중 뒤쪽 20대는 유예 14일 이상으로 잡히게 했습니다.\n\n이제 [QR 차단검사]를 눌러 확인하세요.');
      renderAdmin();
    }

    function runPaymentConversionShareBlockTest() {
      const stats = getPaymentConversionTestStats();
      if (!stats.testItems) { alert('임시 데이터가 없습니다. 먼저 임시 50명 / 장비 100대를 생성해주세요.'); return; }
      const testItems = getItems().filter(isPaymentTestItem);
      const blocked = testItems.filter(item => isServiceShareBlocked(item));
      const allowed = testItems.filter(item => !isServiceShareBlocked(item));
      const expiredUnpaid = testItems.filter(item => item.paymentTestPaid !== true && item.trialEndsAt && new Date(item.trialEndsAt).getTime() < Date.now());
      if (!expiredUnpaid.length) { alert('아직 베타기간이 끝난 미결제 장비가 없습니다.\n먼저 [베타기간 강제 종료]를 눌러주세요.'); return; }
      const failed = expiredUnpaid.filter(item => !isServiceShareBlocked(item));
      const paidBlocked = testItems.filter(item => item.paymentTestPaid === true && isServiceShareBlocked(item));
      const resultOk = failed.length === 0 && paidBlocked.length === 0;
      alert('QR 차단검사 결과\n\n총 임시 장비: ' + testItems.length + '대\nQR 가능: ' + allowed.length + '대\nQR 차단: ' + blocked.length + '대\n베타종료 미결제 장비: ' + expiredUnpaid.length + '대\n\n베타종료 미결제인데 보내지는 오류: ' + failed.length + '대\n결제했는데 막히는 오류: ' + paidBlocked.length + '대\n\n' + (resultOk ? '정상입니다. 베타기간이 끝난 미결제 장비는 QR 보내기/링크열람이 차단됩니다.' : '오류가 있습니다. 위 숫자를 확인해야 합니다.'));
    }

    async function clearPaymentConversionTestData() {
      if (!isSuperAdminLoggedIn()) { alert('임시 데이터 삭제는 최고관리자만 가능합니다.'); return; }
      if (!confirm('임시 회원 50명과 장비 100대를 삭제할까요?\n실제 회원/장비는 유지됩니다.')) return;
      setMembers(getMembers().filter(member => !isPaymentTestMember(member)));
      setItems(getItems().filter(item => !isPaymentTestItem(item)));
      const supabaseResult = await deletePaymentTestMembersFromSupabase();
      const supabaseMessage = supabaseResult.skipped ? '\nSupabase 연결이 없어 브라우저 임시 데이터만 삭제했습니다.' : '\nSupabase sitepass_members의 paytest 임시 회원도 삭제 처리했습니다.';
      alert('임시 유료전환 임시 데이터를 삭제했습니다.' + supabaseMessage);
      renderAdmin();
    }

    function getLocalDateKey(value) {
      const date = value ? new Date(value) : new Date();
      if (isNaN(date.getTime())) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }

    function getVisitStats() {
      try {
        const saved = JSON.parse(localStorage.getItem(VISIT_STATS_KEY) || 'null');
        if (saved && typeof saved === 'object') {
          return {
            total: Number(saved.total || 0),
            daily: saved.daily && typeof saved.daily === 'object' ? saved.daily : {}
          };
        }
      } catch (e) {}
      return { total:0, daily:{} };
    }

    function setVisitStats(stats) {
      localStorage.setItem(VISIT_STATS_KEY, JSON.stringify({
        total:Number(stats?.total || 0),
        daily:stats?.daily && typeof stats.daily === 'object' ? stats.daily : {}
      }));
    }

    function recordSiteVisit() {
      const todayKey = getLocalDateKey();
      const stats = getVisitStats();
      stats.total = Number(stats.total || 0) + 1;
      stats.daily = stats.daily && typeof stats.daily === 'object' ? stats.daily : {};
      stats.daily[todayKey] = Number(stats.daily[todayKey] || 0) + 1;
      const recentDays = {};
      Object.keys(stats.daily).sort().slice(-31).forEach(key => { recentDays[key] = Number(stats.daily[key] || 0); });
      stats.daily = recentDays;
      setVisitStats(stats);
      return stats;
    }

    function countTodaySignups(members) {
      const todayKey = getLocalDateKey();
      return (members || []).filter(member => getLocalDateKey(member?.createdAt) === todayKey).length;
    }

    function renderAdminQuickLine(label, value, action) {
      if (!action) return '<div class="line"><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(value) + '</span></div>';
      return '<button type="button" class="admin-quick-line" onclick="' + action + '"><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(value) + '</span></button>';
    }

    function renderAdminTodoSummary(data) {
      const rows = [
        { label:'문의 답변대기', value:(data.waitingContacts || 0) + '건', action:'openAdminContactManager()' },
        { label:'QR 일시정지', value:(data.paused || 0) + '건', action:'openAdminListQuickFilter(\'paused\')' },
        { label:'서류 만료임박', value:(data.expiringDocs || 0) + '건', action:'openAdminListQuickFilter(\'expiring\')' },
        { label:'서류 만료', value:(data.expiredDocs || 0) + '건', action:'openAdminListQuickFilter(\'expired\')' },
        { label:'유예 14일 이상', value:(data.grace14Items || 0) + '건', action:'openAdminListQuickFilter(\'grace14\')' }
      ];
      const rowHtml = rows.map(item => renderAdminQuickLine(item.label, item.value, item.action)).join('');
      return '<div class="card" style="box-shadow:none;margin-top:12px;">' +
        '<h3>확인해야 할 사항</h3>' +
        '<div class="notice blue-note" style="margin-top:0;">중복되는 항목은 빼고, 바로 눌러서 이동할 항목만 남겼습니다. 유예 14일 이상 경과한 서류함도 별도로 확인합니다.</div>' +
        rowHtml +
      '</div>';
    }

    function ensureAdminSampleData() {
      // v23.7.112부터는 실제 가입 확인를 위해 샘플 회원/샘플 장비서류를 자동 생성하지 않습니다.
    }

    function resetSitePassTestDataOnce() {
      // v23.7.198부터 수정본 배포 시 실제 가입 회원/카카오/네이버/일반 회원 localStorage 데이터를 자동 삭제하지 않고, 탈퇴 카카오 계정은 자동로그인을 차단합니다.
      // 이전 베타 초기화 키가 없더라도 아무 데이터도 지우지 않고 방문자수만 기록합니다.
      return false;
    }

    function openManagerDemoView() {
      const item = ensureManagerDemoItem();
      openManagerPublicView(item.code, getManagerExpireAt(item));
    }

    function openManagerDemoDetail() {
      const item = ensureManagerDemoItem();
      renderDetail(item.code);
    }

    function checkHash() {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.startsWith('#pay=')) {
        handleAutoPaymentHash(hash);
        return true;
      }
      if (hash.startsWith('#manager=') || /(?:^\?|&)manager=/.test(search)) {
        const parsed = hash.startsWith('#manager=') ? parseManagerHash(hash) : parseManagerHash(search);
        if (parsed && parsed.code) {
          const target = new URL('./share.html', window.location.href);
          target.search = '';
          target.hash = '';
          target.searchParams.set('manager', String(parsed.code));
          if (parsed.sig) target.searchParams.set('sig', String(parsed.sig));
          target.searchParams.set('v', '23.7.531-test');
          window.location.replace(target.toString());
        }
        return true;
      }
      if (hash.startsWith('#qr=')) {
        const code = decodeURIComponent(hash.replace('#qr=', ''));
        renderPublic(code);
        return true;
      }
      if (hash === '#login' || hash === '#sitepass-login') {
        showScreen('signupScreen', { skipHistory:true });
        setTimeout(function(){
          try {
            if (typeof window.backToSitePassFirstLanding === 'function') window.backToSitePassFirstLanding();
          } catch (e) {}
        }, 20);
        return true;
      }
      if (hash === '#join' || hash === '#signup' || hash === '#sitepass-join' || hash === '#find-id' || hash === '#id-find' || hash === '#sitepass-find-id' || hash === '#find-password' || hash === '#password-find' || hash === '#sitepass-find-password') {
        showScreen('signupScreen', { skipHistory:true });
        setTimeout(function(){
          try {
            if (typeof window.restoreSitePassFirstAuthRoute === 'function') window.restoreSitePassFirstAuthRoute();
          } catch (e) {}
        }, 20);
        return true;
      }
      if (hash === '#admin' || hash === '#관리자') {
        showScreen(isAdminLoggedIn() ? 'adminScreen' : 'signupScreen');
        return true;
      }
      return false;
    }

    window.addEventListener('popstate', function(event) {
      const state = event.state || {};
      if (state.sitepassFirstAuthRoute) {
        sitePassHandlingPopState = true;
        showScreen('signupScreen', { skipHistory:true });
        sitePassHandlingPopState = false;
        setTimeout(function(){
          try {
            if (typeof window.restoreSitePassFirstAuthRoute === 'function') window.restoreSitePassFirstAuthRoute(state.sitepassFirstAuthRoute);
          } catch (e) {}
        }, 20);
        return;
      }
      if (state.sitepassScreen) {
        sitePassHandlingPopState = true;
        showScreen(state.sitepassScreen, { skipHistory:true });
        sitePassHandlingPopState = false;
        return;
      }
      if ((window.location.hash || window.location.search) && checkHash()) return;
      const fallbackScreen = isAdminLoggedIn() ? 'adminScreen' : (isMemberLoggedIn() ? 'homeScreen' : 'signupScreen');
      sitePassHandlingPopState = true;
      showScreen(fallbackScreen, { skipHistory:true });
      sitePassHandlingPopState = false;
    });

    window.addEventListener('hashchange', checkHash);
    try { window.matchMedia('(display-mode: standalone)').addEventListener('change', updateQuickAuthUi); } catch (e) {}
    window.addEventListener('beforeinstallprompt', function(event) {
      event.preventDefault();
      deferredSitePassInstallPrompt = event;
      updateHomeInstallButtonState(isSitePassRecommendInstallRequest()
        ? '추천링크 설치 준비가 완료되었습니다. <b>바탕화면에 설치하기</b>를 누르면 설치창이 열립니다.'
        : '이 브라우저에서는 <b>바탕화면에 설치하기</b> 버튼으로 설치창을 열 수 있습니다.');
    });

    window.addEventListener('appinstalled', function() {
      deferredSitePassInstallPrompt = null;
      closeHomeInstallGuidePanel('홈화면 추가가 완료되었습니다. 이제 현장서류패스 아이콘으로 들어오면 됩니다.');
      updateHomeInstallButtonState();
      updateQuickAuthUi();
    });

    async function bootSitePassApp() {
      try {
        updateSignupTermsUi();
        registerSitePassServiceWorker();
        updateHomeInstallButtonState();
        // v23.7.531-test: 담당자 링크는 head 단계에서 recipient.html로 이동합니다.
        // 메인 앱 부팅은 더 이상 담당자 화면을 강제로 고정하지 않습니다.
        clearLegacyAutoLoginState();
        const didCleanReset = resetSitePassTestDataOnce();
        ensureAdminSampleData();
        if (!didCleanReset) recordSiteVisit();

        renderDocCards();
        renderAlertPreview();
        setupRegistrationDraftAutoSave();
        setupJuminLimitDelegates();
        restorePwaAutoMemberSession();
        try {
          if (typeof isMemberLoggedIn === 'function' && isMemberLoggedIn() && !(typeof isAdminLoggedIn === 'function' && isAdminLoggedIn())) {
            window.sitePassMemberEquipmentInitialSyncPendingV491 = true;
            window.sitePassMemberEquipmentInitialSyncErrorV491 = false;
          }
        } catch (e) {}
        refreshAdminUi();
        refreshMemberUi();
        try {
          setTimeout(function(){
            try {
              if (typeof isMemberLoggedIn === 'function' && isMemberLoggedIn() && !(typeof isAdminLoggedIn === 'function' && isAdminLoggedIn()) && typeof syncSupabaseMyEquipmentItems === 'function') {
                syncSupabaseMyEquipmentItems(true);
              } else if (typeof syncSupabaseEquipmentItems === 'function') {
                syncSupabaseEquipmentItems(true);
              }
            } catch (e) {}
          }, 30);
        } catch (e) {}
        updateQuickAuthUi();
        // v23.7.248: “로그인 확인 중입니다” 차단 화면을 더 이상 오래 띄우지 않습니다.
        // OAuth 확인은 뒤에서 진행하되, 사용자가 화면에 갇히지 않게 먼저 공개합니다.
        try { document.body.classList.remove('sitepass-booting'); } catch (e) {}
        // v23.7.246: 소셜 로그인 확인 과정이 외부 OAuth/Userinfo 응답 대기로 멈춰도
        // 화면이 '로그인 확인 중입니다'에 갇히지 않게 안전 타이머를 먼저 걸어둡니다.
        let sitePassBootWatchdogFired = false;
        const sitePassBootWatchdog = setTimeout(function(){
          if (document.body.classList.contains('sitepass-booting')) {
            sitePassBootWatchdogFired = true;
            try { removeSessionValue(SITEPASS_OAUTH_PENDING_KEY); } catch (e) {}
            document.body.classList.remove('sitepass-booting');
            alert('네이버 로그인 확인 시간이 길어져 중단했습니다.\n\nSupabase Edge Function의 Verify JWT가 OFF인지, 네이버 Provider의 Userinfo URL이 실제 함수 주소인지 확인해주세요.');
            showScreen(isAdminLoggedIn() ? 'adminScreen' : (isMemberLoggedIn() ? 'homeScreen' : 'signupScreen'), { replace:true });
          }
        }, 18000);
        const handledOAuth = await handleSupabaseKakaoOAuthReturn();
        clearTimeout(sitePassBootWatchdog);
        if (sitePassBootWatchdogFired) return;
        if (!handledOAuth && !checkHash()) {
          let initialScreen = 'signupScreen';
          if (isAdminLoggedIn()) {
            initialScreen = 'adminScreen';
          } else if (isMemberLoggedIn()) {
            const allowedMemberScreens = ['homeScreen','registerScreen','listScreen','contactScreen','myAccountScreen','pricingScreen','usageGuideScreen'];
            let rememberedScreen = '';
            try { rememberedScreen = String(sessionStorage.getItem('sitepass_last_screen_v491') || (window.history.state && window.history.state.sitepassScreen) || ''); } catch (e) {}
            initialScreen = allowedMemberScreens.includes(rememberedScreen) ? rememberedScreen : 'homeScreen';
          }
          showScreen(initialScreen, { replace:true });
          if (initialScreen === 'contactScreen') {
            // v23.7.531-test: 새로고침 시 복잡한 방 복원 대신 알림/채팅 목록을 한 번만 안정적으로 엽니다.
            setTimeout(function(){
              try { if (typeof window.sitepassOpenChatInbox460 === 'function') window.sitepassOpenChatInbox460(); } catch (e) {}
            }, 180);
          }
          promptRegistrationDraftIfNeeded('startup');
        }
      } catch (e) {
        console.error('SitePass 초기 화면 처리 오류:', e);
        document.body.classList.remove('sitepass-booting');
        alert('첫 화면 처리 중 오류가 났습니다. 새로고침 후에도 반복되면 최신 수정본을 다시 올려주세요.\n' + (e?.message || ''));
        showScreen(isAdminLoggedIn() ? 'adminScreen' : (isMemberLoggedIn() ? 'homeScreen' : 'signupScreen'), { replace:true });
      }
      setTimeout(function(){ document.body.classList.remove('sitepass-booting'); }, 3000);
    }
    bootSitePassApp();


    // v23.7.123 - 날짜 표시칸 깜박임 방지 보강
    (function setupDateInputBlinkFix(){
      if (window.__sitePassDateInputBlinkFix) return;
      window.__sitePassDateInputBlinkFix = true;

      document.addEventListener('focusin', function(event){
        const input = event.target;
        if (!input || !input.matches) return;
        if (input.matches('[data-clean-date-display]')) {
          setTimeout(function(){ try { input.blur(); } catch(e) {} }, 0);
          return;
        }
        if (input.matches('input[type="date"]')) input.style.caretColor = 'transparent';
      });

      document.addEventListener('change', function(event){
        const input = event.target;
        if (!input || !input.matches) return;
        if (input.matches('[data-clean-date-real]')) syncCleanDatePicker(input);
        if (input.matches('input[type="date"]')) setTimeout(function(){ try { input.blur(); } catch(e) {} }, 0);
      });
    })();

