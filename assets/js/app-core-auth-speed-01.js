// SitePass v23.7.350 - speed optimized medium chunk (app-core-auth-speed 01/04)
// ---- merged from app-core-auth-01.js ----
// SitePass v23.7.350 - app-core-auth finer split (01/19)
// SitePass v23.7.350 - app.bundle.js remaining split (01 core/auth/member)
window.__SITEPASS_APP_SPLIT_VERSION = 'v23.7.350';
window.SITEPASS_TEST_NO_PAYMENT_MODE = true; // v23.7.350 테스트 기간에는 결제단계를 건너뜁니다.
// SitePass v23.7.350 - v23.7.290 기준 남은 파일 쪼개기 / 배포 안정화
// v23.7.277에서는 push-notify.js로 푸시알림 권한/테스트/대상계산 보조 기능을 분리했습니다.
const STORAGE_KEY = 'sitePass_v23_7_7_update_original_corrected';
    const PREV_STORAGE_KEY_7 = 'sitePass_v23_7_6_simple_update_controls';
    const PREV_STORAGE_KEY_6 = 'sitePass_v23_7_5_update_edit_pages';
    const PREV_STORAGE_KEY_5 = 'sitePass_v23_7_4_original_corrected_multi_pages';
    const PREV_STORAGE_KEY_4 = 'sitePass_v23_7_3_multi_pages';
    const PREV_STORAGE_KEY_3 = 'sitePass_v23_7_2_no_date_label';
    const PREV_STORAGE_KEY_2 = 'sitePass_v23_7_preview_print';
    const PREV_STORAGE_KEY = 'sitePass_v23_6_final_docs_structure';
    const TRIAL_DAYS = 60;
    const BASIC_PRICE_TEXT = '실사용 베타 운영 중';
    const ALERT_PRICE_TEXT = '결제금액은 운영 중 조정 예정입니다';
    const ADMIN_SESSION_KEY = STORAGE_KEY + '_admin_session';
    const MEMBER_STORAGE_KEY = STORAGE_KEY + '_members';
    const CURRENT_MEMBER_KEY = STORAGE_KEY + '_currentMember';
    const PWA_AUTO_MEMBER_KEY = STORAGE_KEY + '_pwa_auto_member_v23_7_145';
    const ADMIN_ID = 'sitepass@kakao.com'; // 지정 최고관리자 ID
    const LEGACY_ADMIN_ID = 'dream9473'; // 이전 임시 최고관리자 ID도 비상 접속용으로 유지
    const LEGACY_ADMIN_ID_2 = 'sitepassadmin'; // 더 이전 임시 최고관리자 ID도 비상 접속용으로 유지
    const ADMIN_PASSWORD = 'sitepass-admin-beta-2026'; // 임시 비상 관리자 비밀번호 - 공개 저장소/정식 서비스에서는 서버 인증으로 교체
    const SUPER_ADMIN_ROLE_NAME = '최고관리자';
    const ADMIN_ROLE_MAP_KEY = STORAGE_KEY + '_admin_role_map';
    const ADMIN_WITHDRAWN_MEMBERS_KEY = STORAGE_KEY + '_withdrawn_members';
    const CONTACT_STORAGE_KEY = STORAGE_KEY + '_contacts';
    const SELECTED_PAYMENT_PLAN_KEY = STORAGE_KEY + '_selectedPaymentPlan';
    const PENDING_REGISTRATION_KEY = STORAGE_KEY + '_pending_registration_payment_v23_7_150';
    const SERVER_EQUIPMENT_CACHE_KEY = STORAGE_KEY + '_server_equipment_cache_v23_7_283';
    const REGISTRATION_DRAFT_KEY = STORAGE_KEY + '_registration_draft_v23_7_159';
    const REGISTRATION_DRAFT_PROMPT_SESSION_KEY = STORAGE_KEY + '_registration_draft_prompt_seen_v23_7_159';
    const VISIT_STATS_KEY = STORAGE_KEY + '_visit_stats';
    const CLEAN_RESET_VERSION_KEY = STORAGE_KEY + '_clean_reset_v23_7_112';
    const COMPANY_KAKAO_CHANNEL_NAME = '제이에스건설';
    const COMPANY_KAKAO_CHANNEL_URL = ''; // 정식 서비스에서 카카오톡 채널 URL을 넣습니다.
    let adminMemberFolder = 'all';
    let adminMemberSearchText = '';
    let adminMemberSearchComposing = false;
    let adminMemberPage = 0;
    let adminExpandedMemberId = '';
    let adminListQuickFilter = 'all';
    let adminSupabaseMemberSyncing = false;
    let sitePassEquipmentSyncing = false;
    let sitePassEquipmentSyncedAt = 0;
    let sitePassEquipmentSyncMessage = '';
    let adminSupabaseMemberSyncedAt = 0;
    let adminSupabaseMemberSyncMessage = '';
    let adminServerMemberRows = [];
    // v23.7.257: 분리된 admin-members.js/admin-detail.js가 관리자 상태를 안전하게 읽고 갱신할 수 있게 하는 브리지입니다.
    window.SitePassAdminRuntime = window.SitePassAdminRuntime || {};
    Object.assign(window.SitePassAdminRuntime, {
      getExpandedMemberId: function(){ return adminExpandedMemberId; },
      setExpandedMemberId: function(value){ adminExpandedMemberId = String(value || ''); },
      getServerMemberRows: function(){ return adminServerMemberRows; },
      setServerMemberRows: function(rows){ adminServerMemberRows = Array.isArray(rows) ? rows : []; },
      getMemberFolder: function(){ return adminMemberFolder; },
      setMemberFolder: function(value){ adminMemberFolder = String(value || 'all'); },
      getMemberSearchText: function(){ return adminMemberSearchText; },
      setMemberSearchText: function(value){ adminMemberSearchText = String(value || ''); },
      getMemberSearchComposing: function(){ return adminMemberSearchComposing; },
      setMemberSearchComposing: function(value){ adminMemberSearchComposing = !!value; },
      getMemberPage: function(){ return adminMemberPage; },
      setMemberPage: function(value){ adminMemberPage = Math.max(0, Number(value || 0)); },
      getMemberSyncing: function(){ return adminSupabaseMemberSyncing; },
      getMemberSyncedAt: function(){ return adminSupabaseMemberSyncedAt; },
      getMemberSyncMessage: function(){ return adminSupabaseMemberSyncMessage; }
    });
    let adminMemberSummaryStats = null;
    let pendingRegistrationItemMemory = null;
    let sitePassRegistrationCompletionBusy = false; // v23.7.350: 테스트 등록완료 처리 중 결제대기/임시저장 안내가 반복으로 뜨는 것을 막습니다.
    let runtimeEquipmentItems = []; // localStorage 용량 부족 시 현재 세션에서 장비를 계속 보이게 하는 메모리 목록
    let registrationDraftSaveTimer = null;
    let registrationDraftRestoreBusy = false;
    let registrationDraftPromptOpen = false;

    let currentDetailLink = '';
    let cameraStream = null;
    let activeCameraCard = null;
    let activeCameraScanMode = 'a4';
    let cameraScanTimer = null;
    let latestCameraBox = null;
    let latestCameraDetectedAt = 0;
    let cameraStableBox = null;
    let cameraStableSince = 0;
    let cameraAutoCaptureBusy = false;
    const CAMERA_AUTO_CAPTURE_DELAY_MS = 780;
    function getCameraScanApi() {
      return window.SitePassCameraScan || {};
    }
    let workerPersonSeq = 0;
    let editingCode = '';
    let pageEditState = null;
    const TEST_PRIVATE_DOC_CODE = '123456';
    let sitepassSignupPhoneVerified = false;
    let sitepassSignupPhoneRequestSent = false;
    let sitepassSignupIdVerified = false;
    let sitepassSignupIdVerifiedValue = '';
    let deferredSitePassInstallPrompt = null;
    const QUICK_AUTH_KEY = STORAGE_KEY + '_quick_auth_v23_7_141';
    const QUICK_SETUP_SKIP_SESSION_KEY = STORAGE_KEY + '_quick_setup_skip_v23_7_144';

    function isSitePassAutoLoginEnabled() {
      try {
        return localStorage.getItem('sitepass:first:auto-login') === '1';
      } catch (e) {
        return false;
      }
    }
    function shouldPersistAdminSessionKey(key) {
      const normalizedKey = String(key || '');
      // v23.7.231: 카카오/네이버 인증은 앱/외부 브라우저를 거치면서 sessionStorage가 끊길 수 있어
      // OAuth 대기값과 소셜 약관동의값도 localStorage에 잠깐 보존합니다.
      return normalizedKey.indexOf(ADMIN_SESSION_KEY) === 0
        || (normalizedKey === CURRENT_MEMBER_KEY && isSitePassAutoLoginEnabled())
        || normalizedKey.indexOf('_oauth_pending_') >= 0;
    }
    // v23.7.260: 세션/로컬 저장 공통 기능은 assets/js/storage.js로 분리했습니다.
    function getStorageModule() {
      return window.SitePassStorage || {};
    }
    // v23.7.261: Supabase 서버통신 공통 기능은 assets/js/supabase-api.js로 분리했습니다.
    function getSupabaseApiModule() {
      return window.SitePassSupabaseApi || {};
    }
    // v23.7.266: 보관함 목록/선택/삭제 기능은 assets/js/archive.js로 분리했습니다.
    function getArchiveModule() {
      return window.SitePassArchive || {};
    }

    // v23.7.266: QR/7일 담당자 공유링크 공통 기능은 assets/js/qr-share.js로 분리했습니다.
    function getQrShareModule() {
      return window.SitePassQrShare || {};
    }

    // v23.7.277: 장비등록 서류정의/검증/저장 item 생성 보조 기능은 assets/js/equipment-register.js로 분리했습니다.
    function getEquipmentRegisterModule() {
      return window.SitePassEquipmentRegister || {};
    }

    // v23.7.277: 기사/인부 본인동의 인증 보조 기능은 assets/js/person-auth.js로 분리했습니다.
    function getPersonAuthModule() {
      return window.SitePassPersonAuth || {};
    }
    // v23.7.277: 결제/이용권/QR 일시정지 판단 보조 기능은 assets/js/admin-payments.js로 분리했습니다.
    function getAdminPaymentsModule() {
      return window.SitePassAdminPayments || {};
    }
    // v23.7.277: 담당자/수신자 조회화면 보조 기능은 assets/js/recipient-view.js로 분리했습니다.
    function getRecipientViewModule() {
      return window.SitePassRecipientView || {};
    }
    // v23.7.277: 문서 미리보기/프린트/다운로드 보조 기능은 assets/js/document-output.js로 분리했습니다.
    function getDocumentOutputModule() {
      return window.SitePassDocumentOutput || {};
    }
    function getDocumentOutputDeps() {
      return {
        escapeHtml,
        getDocPagesFromDoc,
        getPrintablePreviewFromPage,
        getExpiryPeriodLabel,
        getDdayTextWithDays,
        getItemTitle,
        getIncludedGroupText,
        getManagerExpireAt,
        getShortcutName,
        sanitizeFileName
      };
    }
    function setSessionValue(key, value) {
      const storage = getStorageModule();
      const persist = shouldPersistAdminSessionKey(key);
      if (storage.setSessionValue) return storage.setSessionValue(key, value, persist);
      try { sessionStorage.setItem(key, value); } catch (e) {}
      try { if (persist) localStorage.setItem(key, value); } catch (e) {}
    }
    function getSessionValue(key) {
      const storage = getStorageModule();
      const persist = shouldPersistAdminSessionKey(key);
      if (storage.getSessionValue) return storage.getSessionValue(key, persist);
      try {
        const sessionValue = sessionStorage.getItem(key);
        if (sessionValue !== null && sessionValue !== undefined) return sessionValue;
      } catch (e) {}
      try {
        if (persist) {
          const localValue = localStorage.getItem(key);
          if (localValue !== null && localValue !== undefined) {
            try { sessionStorage.setItem(key, localValue); } catch (e) {}
            return localValue;
          }
        }
      } catch (e) {}
      return null;
    }
    function removeSessionValue(key) {
      const storage = getStorageModule();
      if (storage.removeSessionValue) return storage.removeSessionValue(key);
      try { sessionStorage.removeItem(key); } catch (e) {}
      try { localStorage.removeItem(key); } catch (e) {}
    }
    function clearLegacyAutoLoginState() {
      // v23.7.216: 새로고침 때 로그인 세션을 지우지 않습니다.
      // 명시적으로 로그아웃을 누를 때만 CURRENT_MEMBER_KEY / ADMIN_SESSION_KEY를 삭제합니다.
      removeSessionValue('__unused__');
    }

// ---- merged from app-core-auth-02.js ----
// SitePass v23.7.350 - app-core-auth finer split (02/19)
const EQUIPMENT_REGISTER_MODULE = getEquipmentRegisterModule();
    const DOC_GROUPS = EQUIPMENT_REGISTER_MODULE.getDocGroups ? EQUIPMENT_REGISTER_MODULE.getDocGroups() : [
      {
        key:'equipment', title:'장비서류', required:true, enabled:true,
        summary:'장비 1대 기준 기본 필수서류입니다.',
        docs:[
          { key:'businessLicense', title:'사업자등록증', required:true, expiry:false, note:'사업자등록증은 필수입니다.' },
          { key:'equipmentRegistration', title:'장비등록증', required:true, expiry:false, note:'장비등록증은 필수입니다.' },
          { key:'equipmentInspection', title:'장비검사증', required:true, expiry:true, dateKey:'inspectionExpireDate', dateLabel:'장비검사증 만료날짜', note:'장비검사증은 필수이며 만료날짜를 입력합니다.' },
          { key:'insurancePolicy', title:'장비보험증권', required:true, expiry:true, dateKey:'insuranceExpireDate', dateLabel:'장비보험증권 만료날짜', note:'장비보험증권은 필수이며 만료날짜를 입력합니다.' },
          { key:'ndtInspection', title:'장비비파괴검사증', required:false, expiry:true, dateKey:'ndtExpireDate', dateLabel:'비파괴검사 만료날짜', optionalExpiry:true, note:'선택 서류입니다. 첨부하는 경우 만료날짜를 입력하면 알림 관리가 가능합니다.' },
          { key:'equipmentLedger', title:'장비갑원부', required:false, expiry:false, note:'선택 서류입니다. 없어도 저장 가능합니다.' },
          { key:'specSheet', title:'장비제원표', required:false, expiry:false, note:'선택 서류입니다. 장비 제원 확인이 필요한 현장에 제출합니다.' },
          { key:'otherEquipment', title:'기타서류', required:false, expiry:false, note:'선택 서류입니다. 필요한 장비서류를 추가로 올릴 수 있습니다.' }
        ]
      },
      {
        key:'driver', title:'장비기사서류', required:false, enabled:false,
        summary:'체크하면 장비 기사 서류를 같은 QR에 포함합니다.',
        docs:[
          { key:'driverIdCard', title:'기사 신분증', required:true, expiry:false, extraPhone:true, note:'기사서류를 포함하면 필수입니다. 전화번호는 신분증 사진 아래 표시용으로 선택 입력합니다.' },
          { key:'driverLicense', title:'기사면허증', required:true, expiry:false, note:'기사서류를 포함하면 필수입니다.' },
          { key:'driverBasicSafetyTraining', title:'기사 건설기초안전보건교육 이수증', required:true, expiry:false, note:'기사서류를 포함하면 필수입니다.' },
          { key:'driverMachinerySafetyTraining', title:'기사 건설기계조종사 안전교육 이수증', required:false, expiry:true, dateKey:'driverMachinerySafetyTrainingDate', dateLabel:'건설기계조종사 안전교육 날짜', optionalExpiry:true, note:'선택 서류입니다. 3년마다 이수해야 하므로 기준 날짜를 입력합니다.' },
          { key:'driverSpecialHealthCheck', title:'특수건강검진', required:false, expiry:false, note:'선택 서류입니다. 현장 요구 시 첨부합니다.' },
          { key:'otherDriverDoc', title:'기타서류', required:false, expiry:false, note:'선택 서류입니다. 필요한 기사서류를 추가로 올릴 수 있습니다.' }
        ]
      },
      {
        key:'worker', title:'인부서류', required:false, enabled:false,
        summary:'보통인부/특수인부를 2명, 3명 이상 같은 QR에 포함합니다.',
        docs:[]
      }
    ];
    const DOCS = EQUIPMENT_REGISTER_MODULE.getDocs ? EQUIPMENT_REGISTER_MODULE.getDocs() : DOC_GROUPS.flatMap(group => group.docs.map(doc => ({ ...doc, groupKey:group.key, groupTitle:group.title })));



    function goHome() {
      closeCameraGuide();
      closePreviewModal();
      if (isAdminLoggedIn()) {
        showScreen('adminScreen');
        return;
      }
      if (isMemberLoggedIn()) {
        // 로그인 후 홈으로가기는 장비등록/보관함이 있는 홈 화면으로 이동합니다.
        showScreen('homeScreen');
        return;
      }
      // 비로그인 상태의 홈화면은 회원가입/찾기 화면이 아니라 첫 로그인 화면입니다.
      showScreen('signupScreen');
      setTimeout(function(){
        try {
          if (typeof window.backToSitePassFirstLanding === 'function') {
            window.backToSitePassFirstLanding();
          }
        } catch (e) {}
      }, 30);
    }

    function getCurrentMemberTest() {
      try {
        return JSON.parse(getSessionValue(CURRENT_MEMBER_KEY) || 'null');
      } catch (e) {
        return null;
      }
    }

    function isMemberLoggedIn() {
      return !!getCurrentMemberTest();
    }

    function getPwaAutoMemberTest() {
      const storage = getStorageModule();
      if (storage.getJson) return storage.getJson(PWA_AUTO_MEMBER_KEY, null);
      try { return JSON.parse(localStorage.getItem(PWA_AUTO_MEMBER_KEY) || 'null'); } catch (e) { return null; }
    }

    // v23.7.281 - 장비등록 저장 시 소유회원이 비어 있으면 가능한 회원정보로 보강합니다.
    // 회원으로 등록했는데 관리자 요약/회원 장비등록수에 0대로 보이는 문제를 줄이기 위한 안전장치입니다.
    function getEquipmentRegistrationOwnerMember() {
      const current = getCurrentMemberTest();
      if (current && (current.id || current.signupId || current.providerId || current.phone || current.name)) return current;
      const pwa = getPwaAutoMemberTest();
      if (pwa && (pwa.id || pwa.signupId || pwa.providerId || pwa.phone || pwa.name)) return pwa;
      try {
        const members = getMembers().filter(member => member && !member.withdrawn && !member.isSuperAdminVirtual && !isDesignatedSuperAdminMember(member));
        if (members.length === 1) return members[0];
      } catch (e) {}
      return null;
    }


    function setPwaAutoMemberTest(member) {
      if (!member) return;
      const payload = {
        name: member.name || member.signupId || 'SitePass 회원',
        phone: member.phone || '',
        id: member.id || '',
        signupId: member.signupId || '',
        providerId: member.providerId || '',
        provider: member.provider || '',
        signupMethod: member.signupMethod || member.provider || '',
        securityMemo: '중요작업은 비밀번호 재확인',
        loggedInAt: new Date().toISOString(),
        autoLoginType: 'pwa_home_screen'
      };
      const storage = getStorageModule();
      if (storage.setJson) return storage.setJson(PWA_AUTO_MEMBER_KEY, payload);
      try { localStorage.setItem(PWA_AUTO_MEMBER_KEY, JSON.stringify(payload)); } catch (e) {}
    }

    function clearPwaAutoMemberTest() {
      const storage = getStorageModule();
      if (storage.removeItem) {
        storage.removeItem(PWA_AUTO_MEMBER_KEY);
        storage.removeItem(QUICK_AUTH_KEY);
        return;
      }
      try { localStorage.removeItem(PWA_AUTO_MEMBER_KEY); } catch (e) {}
      try { localStorage.removeItem(QUICK_AUTH_KEY); } catch (e) {}
    }

    function restorePwaAutoMemberSession() {
      if (!isSitePassAutoLoginEnabled()) return false;
      if (!isSitePassInstalledAppMode()) return false;
      if (isMemberLoggedIn() || isAdminLoggedIn()) return true;
      const saved = getPwaAutoMemberTest();
      if (!saved) return false;
      setSessionValue(CURRENT_MEMBER_KEY, JSON.stringify(saved));
      return true;
    }

    function setCurrentMemberTest(member) {
      const current = {
        name: member?.name || member?.signupId || 'SitePass 회원',
        phone: member?.phone || '',
        id: member?.id || '',
        signupId: member?.signupId || '',
        providerId: member?.providerId || '',
        provider: member?.provider || '',
        signupMethod: member?.signupMethod || '',
        securityMemo: '중요작업은 비밀번호 재확인',
        loggedInAt: new Date().toISOString()
      };
      setSessionValue(CURRENT_MEMBER_KEY, JSON.stringify(current));
    }

    function completeMemberLoginTest(member, message) {
      const localWithdrawnRecord = findWithdrawnMemberRecord(member);
      if (localWithdrawnRecord) {
        // v23.7.219 테스트기간: 탈퇴했던 계정도 다시 가입/로그인 테스트가 가능하게 local 차단기록을 해제합니다.
        removeWithdrawnMemberRecord(member);
        member.rejoinConfirmedAt = new Date().toISOString();
        member.withdrawn = false;
        member.status = member.status && isWithdrawnStatusValue(member.status) ? '실사용베타' : (member.status || '실사용베타');
        member.memberStatus = 'active';
        member.plan_type = member.plan_type && isWithdrawnStatusValue(member.plan_type) ? 'beta' : (member.plan_type || 'beta');
      }
      const loginId = member?.signupId || member?.providerId || member?.phone || member?.id || member?.name || '';
      const adminRole = getLocalAdminRoleForLogin(loginId, member);
      if (member && adminRole) {
        member.adminRole = adminRole;
        completeMemberAdminLogin(member);
        return;
      }
      const updatedMember = updateMemberLastLogin(member, member?.signupMethod || member?.provider || 'SitePass 로그인') || member;
      setCurrentMemberTest(updatedMember || {});
      const current = getCurrentMemberTest();
      if (isSitePassInstalledAppMode() && isSitePassAutoLoginEnabled()) setPwaAutoMemberTest(current || updatedMember || {});
      if (!isSitePassAutoLoginEnabled()) clearPwaAutoMemberTest();
      try { if (window.sitePassClearServerAuthoritativeEquipmentItems) window.sitePassClearServerAuthoritativeEquipmentItems(); } catch (e) {}
      try { localStorage.removeItem(SERVER_EQUIPMENT_CACHE_KEY); } catch (e) {}
      refreshMemberUi();
      if (message) alert(message);
      showScreen(isSitePassInstalledAppMode() ? 'listScreen' : 'homeScreen');
      promptRegistrationDraftIfNeeded('login');
    }

// ---- merged from app-core-auth-03.js ----
// SitePass v23.7.350 - app-core-auth finer split (03/19)
function memberLogout() {
      removeSessionValue(CURRENT_MEMBER_KEY);
      clearPwaAutoMemberTest();
      try { if (window.sitePassClearServerAuthoritativeEquipmentItems) window.sitePassClearServerAuthoritativeEquipmentItems(); } catch (e) {}
      try { localStorage.removeItem(SERVER_EQUIPMENT_CACHE_KEY); } catch (e) {}
      refreshMemberUi();
      // v23.7.392: 로그아웃 후 회원가입 hash/화면이 남지 않게 첫 로그인 화면으로 보냅니다.
      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState({ sitepassScreen: 'signupScreen' }, document.title || 'SitePass', window.location.pathname + window.location.search);
        }
      } catch (e) {}
      showScreen('signupScreen');
      setTimeout(function(){
        try {
          if (typeof window.backToSitePassFirstLanding === 'function') {
            window.backToSitePassFirstLanding();
          }
        } catch (e) {}
      }, 40);
    }

    async function memberWithdraw() {
      const current = getCurrentMemberTest();
      if (!current) {
        alert('로그인된 회원이 없습니다.');
        showScreen('signupScreen');
        return;
      }
      const firstOk = confirm('회원탈퇴를 진행할까요?\n\n회원탈퇴하면 현재 가입자/회원목록에서 바로 제외되고, 이 브라우저에 저장된 보관함 서류/코드가 삭제됩니다.');
      if (!firstOk) return;
      const typed = prompt('정말 탈퇴하려면 아래에 탈퇴 라고 입력해주세요.\n삭제 후에는 이 브라우저 임시 데이터가 복구되지 않습니다.');
      if ((typed || '').trim() !== '탈퇴') {
        alert('회원탈퇴가 취소되었습니다.');
        return;
      }

      const targetKeys = getMemberLoginKeys(current);
      const members = getMembers().filter(member => {
        if (!member) return false;
        const memberKeys = getMemberLoginKeys(member);
        if (targetKeys.length && memberKeys.some(key => targetKeys.includes(key))) return false;
        const sameId = current.id && member.id === current.id;
        const samePhone = current.phone && member.phone === current.phone;
        const sameProviderId = current.providerId && member.providerId === current.providerId;
        const sameSignupId = current.signupId && member.signupId === current.signupId;
        const sameNameProvider = current.name && current.provider && member.name === current.name && member.provider === current.provider;
        return !(sameId || samePhone || sameProviderId || sameSignupId || sameNameProvider);
      });
      setMembers(members);
      addWithdrawnMemberRecord(current, '회원 직접 탈퇴', '회원탈퇴');
      const currentAuthWithdrawn = await withdrawCurrentSupabaseAuthMember('회원이 직접 탈퇴했습니다. 현재 로그인한 소셜/Auth 계정 기준으로 현재회원 삭제');
      const keyWithdrawn = await markMemberWithdrawnInSupabase(current, '회원이 직접 탈퇴했습니다. 현재회원에서 완전 제외');
      const serverUpdated = Number(currentAuthWithdrawn || 0) + Number(keyWithdrawn || 0);
      adminServerMemberRows = removeRowsByMemberKeys(adminServerMemberRows, current);
      adminMemberSummaryStats = null;
      adminSupabaseMemberSyncedAt = 0;
      const removedDocs = deleteOwnedItemsForMember(current);
      const serverCleanup = await deleteOwnedServerItemsForMember(current);
      await signOutSupabaseAuthQuietly();
      [SELECTED_PAYMENT_PLAN_KEY, PENDING_REGISTRATION_KEY, REGISTRATION_DRAFT_KEY, REGISTRATION_DRAFT_PROMPT_SESSION_KEY].forEach(key => {
        try { if (key) localStorage.removeItem(key); } catch (e) {}
      });
      removeSessionValue(CURRENT_MEMBER_KEY);
      clearPwaAutoMemberTest();
      refreshMemberUi();
      resetForm();
      const serverCleanupText = serverCleanup && serverCleanup.ok
        ? '\n서버 장비 ' + (serverCleanup.equipmentDeleted || 0) + '건, QR링크 ' + (serverCleanup.sharesDeleted || 0) + '건 정리했습니다.'
        : '\n서버 장비/큐알 정리는 확인이 필요합니다: ' + escapePlainTextForAlert(serverCleanup?.error?.message || serverCleanup?.error || 'RPC 미연결');
      alert('회원탈퇴가 완료되었습니다.\n현재 가입자/관리자 회원목록에서는 바로 제외됩니다.\n연결된 서류/코드 ' + removedDocs + '건과 회원정보를 삭제했고, 같은 계정의 바로 로그인을 차단했습니다.\n서버 탈퇴처리 ' + (serverUpdated || 0) + '건 반영했습니다.' + serverCleanupText);
      showScreen('signupScreen');
    }

    function refreshMemberUi() {
      const loggedIn = isMemberLoggedIn();
      const adminLoggedIn = isAdminLoggedIn();
      const homeBtn = document.getElementById('memberHomeButton');
      const accountBtn = document.getElementById('myAccountButton');
      const logoutBtn = document.getElementById('memberLogoutButton');
      const withdrawBtn = document.getElementById('memberWithdrawButton');
      if (homeBtn) homeBtn.classList.toggle('hidden', !(loggedIn || adminLoggedIn));
      if (accountBtn) accountBtn.classList.toggle('hidden', !(loggedIn || adminLoggedIn));
      if (logoutBtn) logoutBtn.classList.toggle('hidden', !loggedIn || adminLoggedIn);
      if (withdrawBtn) withdrawBtn.classList.toggle('hidden', !loggedIn || adminLoggedIn);
    }

    // v23.7.216 - 탈퇴 active 제외, 소셜 신규 약관 확인, 비밀번호 자동완성 보강 화면입니다.
    let myAccountPasswordVerified = false;

    function getCurrentAccountContext() {
      if (isAdminLoggedIn()) {
        const role = getCurrentAdminRoleName() || SUPER_ADMIN_ROLE_NAME;
        const sessionId = getSessionValue(ADMIN_SESSION_KEY + '_id') || (role === SUPER_ADMIN_ROLE_NAME ? ADMIN_ID : '');
        const sessionName = getSessionValue(ADMIN_SESSION_KEY + '_name') || (role === SUPER_ADMIN_ROLE_NAME ? '대표이사 최고관리자' : '관리자');
        const member = sessionId ? findMemberForLogin(sessionId) : null;
        return {
          mode:'admin',
          role,
          member,
          loginId: member?.signupId || sessionId || member?.providerId || '',
          name: member?.name || sessionName,
          phone: member?.phone || '',
          provider: member?.signupMethod || member?.provider || role,
          hasPassword: !!member?.testPassword
        };
      }
      const current = getCurrentMemberTest();
      if (!current) return null;
      const member = findMemberForLogin(current.signupId || current.providerId || current.phone || current.id || current.name || '') || current;
      return {
        mode:'member',
        role:'일반회원',
        member,
        loginId: member?.signupId || member?.providerId || member?.id || '',
        name: member?.name || current.name || 'SitePass 회원',
        phone: member?.phone || current.phone || '',
        provider: member?.signupMethod || member?.provider || current.signupMethod || current.provider || 'SitePass',
        hasPassword: !!member?.testPassword
      };
    }

    function openMyAccountScreen() {
      const ctx = getCurrentAccountContext();
      if (!ctx) {
        alert('로그인 후 내정보를 확인할 수 있습니다.');
        showScreen('signupScreen');
        return;
      }
      myAccountPasswordVerified = false;
      renderMyAccountScreen();
      showScreen('myAccountScreen');
    }

    function normalizeSignupProviderLabel(value) {
      const key = normalizeSignupProviderKey(value || '');
      if (key === 'kakao') return '카카오톡 계정';
      if (key === 'naver') return '네이버 계정';
      if (key === 'sitepass') return 'SitePass 일반가입';
      return value || 'SitePass';
    }

    function normalizeAccountPhone(value) {
      return String(value || '').replace(/[^0-9]/g, '').slice(0, 11);
    }

    function setMyAccountStatus(id, text, cls) {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = text;
      el.className = 'my-account-status ' + (cls || '');
    }

    function setMyPasswordStep(verified) {
      myAccountPasswordVerified = !!verified;
      const currentBox = document.getElementById('myPasswordStepCurrent');
      const newBox = document.getElementById('myPasswordStepNew');
      if (currentBox) currentBox.classList.toggle('hidden', !!verified);
      if (newBox) newBox.classList.toggle('hidden', !verified);
      if (verified) setTimeout(() => document.getElementById('myNewPassword')?.focus(), 80);
    }

    function renderMyAccountScreen() {
      const ctx = getCurrentAccountContext();
      if (!ctx) return;
      const typeEl = document.getElementById('myAccountType');
      const nameEl = document.getElementById('myAccountName');
      const idEl = document.getElementById('myAccountLoginId');
      const providerEl = document.getElementById('myAccountProvider');
      const phoneEl = document.getElementById('myAccountPhone');
      const phoneInput = document.getElementById('myAccountPhoneInput');
      const withdrawBtn = document.getElementById('myAccountWithdrawButton');
      if (typeEl) typeEl.textContent = ctx.mode === 'admin' ? ctx.role : '일반회원';
      if (nameEl) nameEl.textContent = ctx.name || '-';
      if (idEl) idEl.textContent = ctx.loginId || '-';
      if (providerEl) providerEl.textContent = normalizeSignupProviderLabel(ctx.provider || ctx.role || 'SitePass');
      if (phoneEl) phoneEl.textContent = ctx.phone || '-';
      if (phoneInput) phoneInput.value = normalizeAccountPhone(ctx.phone || '');
      if (withdrawBtn) withdrawBtn.classList.toggle('hidden', ctx.mode === 'admin');
      setMyAccountStatus('myAccountPhoneStatus', '휴대폰번호를 수정한 뒤 저장을 눌러주세요.', '');
      resetMyAccountPasswordStep(false);
    }

    function clearMyAccountPasswordInputs(resetStatus) {
      const cur = document.getElementById('myCurrentPassword');
      const pw = document.getElementById('myNewPassword');
      const pw2 = document.getElementById('myNewPassword2');
      if (cur) cur.value = '';
      if (pw) pw.value = '';
      if (pw2) pw2.value = '';
      if (resetStatus !== false) resetMyAccountPasswordStep(true);
    }

    function resetMyAccountPasswordStep(resetInputs) {
      if (resetInputs !== false) {
        const pw = document.getElementById('myNewPassword');
        const pw2 = document.getElementById('myNewPassword2');
        if (pw) pw.value = '';
        if (pw2) pw2.value = '';
      }
      setMyPasswordStep(false);
      const ctx = getCurrentAccountContext();
      if (!ctx) return;
      if (ctx.hasPassword) {
        setMyAccountStatus('myAccountPasswordStatus', '현재 비밀번호를 입력하고 확인을 눌러주세요.', '');
      } else if (ctx.mode === 'admin' && ctx.role === SUPER_ADMIN_ROLE_NAME) {
        setMyAccountStatus('myAccountPasswordStatus', '최고관리자 최초 변경은 현재 비밀번호에 비상 관리자 비밀번호를 입력하고 확인을 눌러주세요.', '');
      } else {
        setMyAccountStatus('myAccountPasswordStatus', '이 계정은 아직 SitePass 비밀번호가 없습니다. 새 비밀번호를 만들려면 현재 비밀번호 칸을 비워두고 확인을 눌러주세요.', '');
      }
    }

// ---- merged from app-core-auth-04.js ----
// SitePass v23.7.350 - app-core-auth finer split (04/19)
function getOrCreateMyAccountMember(ctx) {
      let member = ctx?.member;
      if (member && member.id) return member;
      member = {
        id:'MEM-' + Date.now(),
        name:ctx?.name || (ctx?.mode === 'admin' ? '관리자' : 'SitePass 회원'),
        phone:ctx?.phone || '',
        provider:ctx?.mode === 'admin' ? 'SitePass 관리자' : (ctx?.provider || 'SitePass'),
        providerId:ctx?.loginId || ('ACCOUNT-' + Date.now()),
        signupId:ctx?.loginId || '',
        signupMethod:ctx?.mode === 'admin' ? 'SitePass 관리자' : (ctx?.provider || 'SitePass 일반가입'),
        adminRole:ctx?.mode === 'admin' ? ctx.role : ''
      };
      return member;
    }

    function refreshCurrentAccountSession(ctx, member) {
      if (!ctx || !member) return;
      if (ctx.mode === 'member') {
        setCurrentMemberTest(member);
        if (isSitePassInstalledAppMode()) setPwaAutoMemberTest(member);
      }
      if (ctx.mode === 'admin') {
        setSessionValue(ADMIN_SESSION_KEY + '_id', member.signupId || member.providerId || ctx.loginId || '');
        setSessionValue(ADMIN_SESSION_KEY + '_name', member.name || ctx.name || '관리자');
      }
      refreshMemberUi();
    }

    function saveMyAccountPhone() {
      const ctx = getCurrentAccountContext();
      if (!ctx) { alert('로그인 후 이용해주세요.'); showScreen('signupScreen'); return; }
      const phone = normalizeAccountPhone(document.getElementById('myAccountPhoneInput')?.value || '');
      if (!phone) {
        setMyAccountStatus('myAccountPhoneStatus', '휴대폰번호를 입력해주세요.', 'warn');
        return;
      }
      if (!/^01[0-9]{8,9}$/.test(phone)) {
        setMyAccountStatus('myAccountPhoneStatus', '휴대폰번호 형식을 확인해주세요. 예: 01012345678', 'warn');
        return;
      }
      const member = getOrCreateMyAccountMember(ctx);
      member.phone = phone;
      member.phoneUpdatedAt = new Date().toISOString();
      if (ctx.mode === 'admin') member.adminRole = ctx.role || member.adminRole || '관리자';
      saveMemberTest(member);
      refreshCurrentAccountSession(ctx, member);
      const phoneEl = document.getElementById('myAccountPhone');
      if (phoneEl) phoneEl.textContent = phone;
      setMyAccountStatus('myAccountPhoneStatus', '휴대폰번호가 저장되었습니다.', 'ok');
      alert('휴대폰번호가 저장되었습니다.');
    }

    function verifyMyAccountCurrentPassword() {
      const ctx = getCurrentAccountContext();
      if (!ctx) { alert('로그인 후 이용해주세요.'); showScreen('signupScreen'); return; }
      const currentPw = document.getElementById('myCurrentPassword')?.value || '';
      const member = ctx.member;
      if (member && member.testPassword) {
        if (!isMemberPasswordOk(member, currentPw)) {
          setMyAccountStatus('myAccountPasswordStatus', '현재 비밀번호가 맞지 않습니다.', 'warn');
          return;
        }
        setMyPasswordStep(true);
        setMyAccountStatus('myAccountPasswordStatus', '현재 비밀번호 확인 완료. 새 비밀번호를 입력해주세요.', 'ok');
        return;
      }
      if (ctx.mode === 'admin' && ctx.role === SUPER_ADMIN_ROLE_NAME) {
        if (String(currentPw) !== String(ADMIN_PASSWORD)) {
          setMyAccountStatus('myAccountPasswordStatus', '현재 비밀번호가 맞지 않습니다. 최초 변경은 비상 관리자 비밀번호를 입력해야 합니다.', 'warn');
          return;
        }
        setMyPasswordStep(true);
        setMyAccountStatus('myAccountPasswordStatus', '현재 비밀번호 확인 완료. 새 비밀번호를 입력해주세요.', 'ok');
        return;
      }
      if (currentPw) {
        setMyAccountStatus('myAccountPasswordStatus', '이 계정은 아직 SitePass 비밀번호가 없어 현재 비밀번호 확인 없이 새 비밀번호를 만들 수 있습니다.', 'warn');
      } else {
        setMyAccountStatus('myAccountPasswordStatus', '새 SitePass 비밀번호를 만들 수 있습니다. 새 비밀번호를 입력해주세요.', 'ok');
      }
      setMyPasswordStep(true);
    }

    function changeMyAccountPassword() {
      const ctx = getCurrentAccountContext();
      if (!ctx) { alert('로그인 후 이용해주세요.'); showScreen('signupScreen'); return; }
      if (!myAccountPasswordVerified) {
        setMyAccountStatus('myAccountPasswordStatus', '먼저 현재 비밀번호 확인을 눌러주세요.', 'warn');
        return;
      }
      const newPw = document.getElementById('myNewPassword')?.value || '';
      const newPw2 = document.getElementById('myNewPassword2')?.value || '';
      if (!newPw || !newPw2) { setMyAccountStatus('myAccountPasswordStatus', '새 비밀번호와 확인 비밀번호를 모두 입력해주세요.', 'warn'); return; }
      if (newPw.length < 6) { setMyAccountStatus('myAccountPasswordStatus', '새 비밀번호는 6자 이상으로 입력해주세요.', 'warn'); return; }
      if (newPw !== newPw2) { setMyAccountStatus('myAccountPasswordStatus', '새 비밀번호와 확인 비밀번호가 다릅니다.', 'warn'); return; }
      const member = getOrCreateMyAccountMember(ctx);
      member.testPassword = newPw;
      member.passwordSet = true;
      member.passwordChangedAt = new Date().toISOString();
      if (ctx.mode === 'admin') member.adminRole = ctx.role || member.adminRole || '관리자';
      saveMemberTest(member);
      refreshCurrentAccountSession(ctx, member);
      clearMyAccountPasswordInputs(false);
      setMyPasswordStep(false);
      setMyAccountStatus('myAccountPasswordStatus', '비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용할 수 있습니다.', 'ok');
      alert('비밀번호가 변경되었습니다.');
    }

    function getMembers() {
      const storage = getStorageModule();
      if (storage.getList) return storage.getList(MEMBER_STORAGE_KEY);
      try { return JSON.parse(localStorage.getItem(MEMBER_STORAGE_KEY) || '[]'); } catch (e) { return []; }
    }

    function setMembers(list) {
      const cleaned = enforceSingleSuperAdminOnMemberList(list || []);
      const storage = getStorageModule();
      if (storage.setList) return storage.setList(MEMBER_STORAGE_KEY, cleaned || []);
      localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(cleaned || []));
    }

// ---- merged from app-core-auth-05.js ----
// SitePass v23.7.350 - app-core-auth finer split (05/19)
function getAdminSampleEquipmentOwner() {
      return {
        id:'MEM-SAMPLE-EQUIPMENT-OWNER',
        name:'김장비',
        phone:'010-1111-2222',
        signupId:'kim-equipment',
        provider:'SitePass',
        providerId:'SITEPASS-kim-equipment',
        signupMethod:'SitePass 로그인',
        status:'실사용베타',
        paymentPlanLabel:'실사용베타',
        memberPlan:'실사용베타',
        paymentStartedAt:'2026-06-26T00:00:00.000Z',
        paymentEndsAt:addDaysIso(new Date().toISOString(), TRIAL_DAYS || 60),
        paymentStatus:'신규결제완료',
        adminLastAction:'1개월 신규결제 처리',
        adminLastActionAt:new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        createdAt:'2026-06-26T00:00:00.000Z',
        lastLoginAt:new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        lastLoginMethod:'SitePass 로그인',
        adminMemo:'베타 확인용 장비 소유자입니다. 굴착기 / 00보0000 서류와 연결했습니다.'
      };
    }


    function getAdminSampleNoTrialMember() {
      return {
        id:'MEM-SAMPLE-NO-TRIAL',
        name:'박미결제',
        phone:'010-3333-4444',
        signupId:'no-trial-user',
        provider:'SitePass',
        providerId:'SITEPASS-no-trial-user',
        signupMethod:'SitePass 로그인',
        status:'미결제',
        paymentPlanLabel:'미결제',
        memberPlan:'미결제',
        paymentStartedAt:'',
        paymentEndsAt:addDaysIso(new Date().toISOString(), 1),
        paymentStatus:'환불요청',
        refundRequestPending:true,
        refundRequestedAt:new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        refundRequestMemo:'베타 환불요청',
        createdAt:'2026-06-26T00:10:00.000Z',
        lastLoginAt:new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        lastLoginMethod:'SitePass 로그인',
        adminMemo:'실사용 베타가 없는 회원 예시입니다. 결제여부/남은기간 1일 표시 확인용입니다.'
      };
    }

    function getAdminSampleExtensionMember() {
      return {
        id:'MEM-SAMPLE-EXTENSION',
        name:'이연장',
        phone:'010-5555-6666',
        signupId:'extension-user',
        provider:'SitePass',
        providerId:'SITEPASS-extension-user',
        signupMethod:'SitePass 로그인',
        status:'1개월 연장결제',
        paymentPlanLabel:'1개월권',
        memberPlan:'1개월권',
        paymentStartedAt:new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        paymentEndsAt:addDaysIso(new Date().toISOString(), 35),
        paymentStatus:'연장결제완료',
        adminLastAction:'1개월 연장결제 처리',
        adminLastActionAt:new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        createdAt:'2026-06-26T00:20:00.000Z',
        lastLoginAt:new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        lastLoginMethod:'SitePass 로그인',
        adminMemo:'연장결제 확인용 베타 회원입니다.'
      };
    }

    function upsertAdminSampleMember(member) {
      const members = getMembers();
      const idx = members.findIndex(item => String(item.id || '') === String(member.id || '') || String(item.signupId || '').toLowerCase() === String(member.signupId || '').toLowerCase());
      if (idx >= 0) {
        members[idx] = { ...members[idx], ...member, updatedAt:new Date().toISOString() };
      } else {
        members.unshift(member);
      }
      setMembers(members);
    }

    function ensureAdminSampleMembers() {
      upsertAdminSampleMember(getAdminSampleEquipmentOwner());
      upsertAdminSampleMember(getAdminSampleNoTrialMember());
      upsertAdminSampleMember(getAdminSampleExtensionMember());
    }
    

    // v23.7.225 - 소셜 가입자가 최고관리자 회원목록에 반드시 보이도록 최종 보강합니다.
    // v23.7.219 - 소셜 로그인 DB 저장키를 하나로 고정합니다.
    // 카카오/네이버는 signupMethod 표기가 달라도 login_id를 kakao_고유ID / naver_고유ID 하나로만 씁니다.
    function getStableProviderRawId(member, providerKey) {
      if (!member) return '';
      const identityData = member.identityData || member.identity_data || {};
      const raw = providerKey === 'kakao'
        ? (member.kakaoUserId || member.providerUserId || member.provider_id || member.providerId || identityData.provider_id || identityData.sub || member.supabaseAuthUserId || member.authUserId || member.userId || '')
        : (member.naverUserId || member.providerUserId || member.provider_id || member.providerId || identityData.provider_id || identityData.sub || member.supabaseAuthUserId || member.authUserId || member.userId || '');
      return String(raw || '')
        .replace(/^KAKAO[-_:]/i, '')
        .replace(/^NAVER[-_:]/i, '')
        .trim();
    }

    function makeStableMemberLoginId(member) {
      const providerKey = normalizeSignupProviderKey(member?.signupMethod || member?.provider || member?.signup_provider || '');
      if (providerKey === 'kakao' || providerKey === 'naver') {
        const rawId = getStableProviderRawId(member, providerKey);
        if (rawId) return providerKey + '_' + rawId;
      }
      return String(
        member?.signupId ||
        member?.login_id ||
        member?.loginId ||
        member?.providerId ||
        member?.supabaseAuthUserId ||
        member?.authUserId ||
        member?.userId ||
        member?.phone ||
        member?.id ||
        ''
      ).trim();
    }

    async function saveMemberToSupabase(member) {
      try {
        const supabaseApi = getSupabaseApiModule();
        if (!(supabaseApi.hasClient && supabaseApi.hasClient()) || !member) return;

        const normalizedSignupMethod = normalizeSignupProviderKey(member.signupMethod || member.provider || 'sitepass') || 'sitepass';
        const loginId = makeStableMemberLoginId({ ...member, signupMethod: normalizedSignupMethod });

        const localWithdrawnRecord = findWithdrawnMemberRecord(member);
        if (localWithdrawnRecord && !member.rejoinConfirmedAt) {
          // v23.7.225 테스트기간: 탈퇴 후 같은 카카오/네이버 계정으로 재가입 테스트가 가능해야 하므로
          // 브라우저 localStorage에 남은 탈퇴 차단 기록은 서버 active 저장을 막지 않게 제거합니다.
          removeWithdrawnMemberRecord(member);
          member.rejoinConfirmedAt = new Date().toISOString();
          member.withdrawn = false;
          member.status = '실사용베타';
          member.memberStatus = 'active';
          member.plan_type = 'beta';
        }
        const cleanPhone = String(member.phone || '').replace(/[^0-9]/g, '');
        const agreements = member.agreements || {};
        const kakaoAppMarketingAgreed = !!(agreements.kakaoAppMarketing || agreements.marketingKakaoApp || agreements.marketing);
        const emailMarketingAgreed = !!(agreements.emailMarketing || agreements.emailAd || agreements.marketingEmail);
        const smsMarketingAgreed = !!(agreements.smsMarketing || agreements.smsAd || agreements.marketingSms);
        const anyMarketingAgreed = !!(kakaoAppMarketingAgreed || emailMarketingAgreed || smsMarketingAgreed || agreements.marketing);
        const termsAgreedAt = agreements.agreedAt || member.termsAgreedAt || member.agreedAt || null;
        let finalRole = adminRoleToSupabaseRole(member.adminRole || '', loginId);

        // v23.7.219: 최고관리자는 sitepass@kakao.com 1명만 허용합니다.
        // 기존 서버에 남은 super_admin 권한은 여기서 보존하지 않고, 명시된 현재 권한값으로 다시 저장합니다.
        if (finalRole === 'super_admin' && !isSuperAdminLoginId(loginId)) finalRole = 'member';

        const existingStatus = await getSupabaseMemberStatus({ ...member, signupId: loginId, login_id: loginId, signupMethod: normalizedSignupMethod });
        if (existingStatus === 'withdrawn' && !member.rejoinConfirmedAt) {
          console.warn('탈퇴 회원은 일반 저장으로 재활성화하지 않습니다:', loginId);
          return;
        }

        const row = {
          login_id: loginId || null,
          name: String(member.name || '').trim() || '이름없음',
          phone: cleanPhone || null,
          email: String(member.email || '').trim() || null,
          provider_id: getStableProviderRawId({ ...member, signupMethod: normalizedSignupMethod }, normalizedSignupMethod) || String(member.providerId || '').trim() || null,
          auth_user_id: String(member.supabaseAuthUserId || member.authUserId || member.userId || '').trim() || null,
          signup_method: normalizedSignupMethod,
          role: finalRole,
          status: 'active',
          plan_type: 'beta',
          plan_label: member.paymentPlanLabel || member.memberPlan || '실사용베타',
          plan_started_at: member.paymentStartedAt || new Date().toISOString(),
          plan_ends_at: member.paymentEndsAt || new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
          last_login_at: new Date().toISOString(),
          terms_agreed_at: termsAgreedAt || null,
          marketing_agreed: anyMarketingAgreed,
          email_marketing_agreed: emailMarketingAgreed,
          sms_marketing_agreed: smsMarketingAgreed,
          admin_memo: 'SitePass 웹 회원가입/로그인에서 자동 저장'
        };

        // v23.7.250: 네이버/카카오 약관동의 완료 회원은 auth_user_id/provider_id/email까지 서버에 확정 저장합니다.
        // 그래야 다른 기기에서도 약관창이 다시 뜨지 않고 관리자 상세목록에 표시됩니다.
        if (supabaseApi.hasRpc && supabaseApi.hasRpc() && (normalizedSignupMethod === 'kakao' || normalizedSignupMethod === 'naver') && termsAgreedAt) {
          try {
            const { data: confirmLoginId, error: confirmError } = await supabaseApi.rpc('sitepass_confirm_social_terms_member', {
              p_login_id: row.login_id,
              p_name: row.name,
              p_phone: row.phone,
              p_email: row.email,
              p_provider_id: row.provider_id,
              p_auth_user_id: row.auth_user_id,
              p_signup_method: row.signup_method,
              p_marketing_agreed: anyMarketingAgreed,
              p_email_marketing_agreed: emailMarketingAgreed,
              p_sms_marketing_agreed: smsMarketingAgreed,
              p_terms_agreed_at: termsAgreedAt
            });
            if (!confirmError) {
              console.log('Supabase 소셜 약관회원 확정 저장 성공:', confirmLoginId || row.login_id);
              member.supabaseLoginId = confirmLoginId || row.login_id;
              return;
            }
            console.warn('Supabase 소셜 약관회원 확정 저장 실패, 기존 저장 재시도:', confirmError.message || confirmError);
          } catch (confirmException) {
            console.warn('Supabase 소셜 약관회원 확정 저장 예외, 기존 저장 재시도:', confirmException?.message || confirmException);
          }
        }

        // v23.7.252: 네이버가 관리자 상세목록에 빠지는 주원인은 서버 row에 terms_agreed_at이 비어 저장되는 경우입니다.
        // 아래 RPC와 직접 upsert 모두 약관동의 시각을 같이 보내서 카카오/네이버가 같은 기준으로 표시되게 합니다.
        // v23.7.225: GitHub Pages/휴대폰/PWA에서는 RLS 때문에 직접 upsert가 막힐 수 있습니다.
        // 그래서 security definer RPC로 먼저 저장하고, 실패할 때만 기존 직접 저장을 보조로 시도합니다.
        if (supabaseApi.hasRpc && supabaseApi.hasRpc()) {
          try {
            const { data: rpcSavedLoginId, error: rpcSaveError } = await supabaseApi.rpc('sitepass_upsert_member_public', {
              p_login_id: row.login_id,
              p_name: row.name,
              p_phone: row.phone,
              p_email: row.email,
              p_provider_id: row.provider_id,
              p_signup_method: row.signup_method,
              p_role: row.role,
              p_status: row.status,
              p_plan_label: row.plan_label,
              p_marketing_agreed: anyMarketingAgreed,
              p_email_marketing_agreed: emailMarketingAgreed,
              p_sms_marketing_agreed: smsMarketingAgreed,
              p_terms_agreed_at: termsAgreedAt
            });
            if (!rpcSaveError) {
              console.log('Supabase RPC 회원 저장 성공:', rpcSavedLoginId || row.login_id, 'role:', row.role);
              return;
            }
            console.warn('Supabase RPC 회원 저장 실패, 직접 저장 재시도:', rpcSaveError.message || rpcSaveError);
          } catch (rpcSaveException) {
            console.warn('Supabase RPC 회원 저장 예외, 직접 저장 재시도:', rpcSaveException?.message || rpcSaveException);
          }
        }

        const { error } = await supabaseApi.upsert('sitepass_members', row, { onConflict: 'login_id' });

        if (error) {
          console.warn('Supabase 회원 저장 실패:', error.message);
          return;
        }

        console.log('Supabase 회원 저장 성공:', row.login_id, 'role:', row.role);
      } catch (e) {
        console.warn('Supabase 회원 저장 예외:', e);
      }
    }

