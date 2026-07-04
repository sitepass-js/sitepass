// SitePass v23.7.292 - app.bundle.js remaining split (01 core/auth/member)
window.__SITEPASS_APP_SPLIT_VERSION = 'v23.7.292';
// SitePass v23.7.292 - v23.7.290 기준 남은 파일 쪼개기 / 배포 안정화
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
    function shouldPersistAdminSessionKey(key) {
      const normalizedKey = String(key || '');
      // v23.7.231: 카카오/네이버 인증은 앱/외부 브라우저를 거치면서 sessionStorage가 끊길 수 있어
      // OAuth 대기값과 소셜 약관동의값도 localStorage에 잠깐 보존합니다.
      return normalizedKey.indexOf(ADMIN_SESSION_KEY) === 0
        || normalizedKey === CURRENT_MEMBER_KEY
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
      showScreen(isMemberLoggedIn() ? 'homeScreen' : 'signupScreen');
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
      if (isSitePassInstalledAppMode()) setPwaAutoMemberTest(current || updatedMember || {});
      refreshMemberUi();
      if (message) alert(message);
      showScreen(isSitePassInstalledAppMode() ? 'listScreen' : 'homeScreen');
      promptRegistrationDraftIfNeeded('login');
    }

    function memberLogout() {
      removeSessionValue(CURRENT_MEMBER_KEY);
      clearPwaAutoMemberTest();
      refreshMemberUi();
      showScreen('signupScreen');
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
        : '\n서버 장비/QR 정리는 확인이 필요합니다: ' + escapePlainTextForAlert(serverCleanup?.error?.message || serverCleanup?.error || 'RPC 미연결');
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


    function normalizeSupabaseLoginKeyForMember(value) {
      return String(value || '').trim().toLowerCase();
    }

    function makeLocalMemberFromSupabaseRow(row) {
      const loginId = String(row?.login_id || row?.loginId || row?.id || '').trim();
      const rawMethod = String(row?.signup_method || row?.signupMethod || row?.provider || 'SitePass 로그인');
      const methodKey = normalizeSignupProviderKey(rawMethod) || 'sitepass';
      const method = methodKey === 'kakao' ? 'kakao' : (methodKey === 'naver' ? 'naver' : 'sitepass');
      let roleName = supabaseRoleToAdminRole(row?.role || '');
      if (roleName === SUPER_ADMIN_ROLE_NAME && !isSuperAdminLoginId(loginId)) roleName = '';
      const isKakao = methodKey === 'kakao' || loginId.toLowerCase().startsWith('kakao_');
      const isNaver = methodKey === 'naver' || loginId.toLowerCase().startsWith('naver_');
      const member = {
        id: 'SB-' + (loginId || row?.id || Date.now()),
        name: row?.name || row?.display_name || row?.nickname || '이름없음',
        phone: row?.phone || '',
        signupId: (isKakao || isNaver) ? '' : loginId,
        provider: isKakao ? '카카오톡' : (isNaver ? '네이버' : 'SitePass'),
        providerId: (isKakao || isNaver) ? (row?.provider_id || loginId) : (row?.provider_id || ''),
        kakaoUserId: isKakao ? (row?.provider_id || '') : '',
        naverUserId: isNaver ? (row?.provider_id || '') : '',
        signupMethod: method,
        status: row?.status === 'active' ? '정상' : (row?.status === 'withdrawn' ? '회원탈퇴' : (row?.status || '정상')),
        withdrawn: row?.status === 'withdrawn',
        paymentPlanLabel: row?.plan_label || row?.plan_type || '실사용베타',
        memberPlan: row?.plan_label || row?.plan_type || '실사용베타',
        paymentStartedAt: row?.plan_started_at || row?.created_at || row?.createdAt || '',
        paymentEndsAt: row?.plan_ends_at || row?.trial_ends_at || row?.paymentEndsAt || '',
        createdAt: row?.created_at || row?.createdAt || row?.plan_started_at || new Date().toISOString(),
        updatedAt: row?.updated_at || row?.updatedAt || '',
        lastLoginAt: row?.last_login_at || row?.lastLoginAt || '',
        lastLoginMethod: method,
        adminMemo: row?.admin_memo || row?.adminMemo || '',
        marketingAgreed: !!(row?.marketing_agreed || row?.marketingAgreed),
        emailMarketingAgreed: !!(row?.email_marketing_agreed || row?.emailMarketingAgreed),
        smsMarketingAgreed: !!(row?.sms_marketing_agreed || row?.smsMarketingAgreed),
        termsAgreedAt: row?.terms_agreed_at || row?.termsAgreedAt || '',
        supabaseLoginId: loginId,
        supabaseAuthUserId: row?.auth_user_id || row?.supabase_auth_user_id || row?.user_id || '',
        authUserId: row?.auth_user_id || row?.supabase_auth_user_id || row?.user_id || '',
        fromSupabase: true
      };
      if (roleName) member.adminRole = roleName;
      return member;
    }

    function getAdminLocalMemberKeys(member) {
      return [
        member?.supabaseLoginId,
        member?.providerId,
        member?.signupId,
        member?.id,
        member?.phone
      ].map(normalizeSupabaseLoginKeyForMember).filter(Boolean);
    }

    function getAdminMemberNameProviderKey(member) {
      const name = normalizeSupabaseLoginKeyForMember(member?.name || member?.displayName || '');
      const providerType = getMemberSignupProviderType(member);
      if (!name || name === '이름없음') return '';
      return providerType + ':name:' + name;
    }

    // v23.7.225 - 관리자 회원목록은 DB 행 수가 아니라 "실제 사용자 1명 = 화면 1명" 기준으로 다시 묶습니다.
    // 카카오 계정 회원가입 / kakao / KAKAo / PWA 로그인처럼 같은 사람이 여러 행으로 남아도 화면에는 1명만 표시합니다.
    function normalizeAdminDedupeToken(value) {
      return String(value || '').trim().toLowerCase().replace(/\s+/g, '').replace(/^kakao[-_:]*/,'').replace(/^naver[-_:]*/,'');
    }

    function getAdminMemberDedupeTokens(member) {
      const tokens = [];
      const add = (prefix, value) => {
        const token = normalizeAdminDedupeToken(value);
        if (token) tokens.push(prefix + ':' + token);
      };
      if (!member) return tokens;
      const identifiers = getMemberAdminIdentifiers(member);
      if (isDesignatedSuperAdminMember(member) || identifiers.some(id => isSuperAdminLoginId(id))) {
        return ['superadmin:sitepass@kakao.com'];
      }
      const providerType = getMemberSignupProviderType(member);
      const isSocial = providerType === 'kakao' || providerType === 'naver';
      if (isSocial) {
        add(providerType + ':auth', member.supabaseAuthUserId || member.authUserId || member.userId);
        add(providerType + ':provider', member.providerId);
        add(providerType + ':provider', member.kakaoUserId);
        add(providerType + ':provider', member.naverUserId);
        add(providerType + ':login', member.supabaseLoginId);
        add(providerType + ':login', member.signupId);
        add(providerType + ':login', member.login_id);
        add(providerType + ':email', member.email);
        add(providerType + ':phone', member.phone);
        const np = getAdminMemberNameProviderKey(member);
        if (np) add(providerType + ':name', np);
      } else {
        getAdminLocalMemberKeys(member).forEach(key => add(providerType + ':local', key));
        add(providerType + ':email', member.email);
        add(providerType + ':phone', member.phone);
        const np = getAdminMemberNameProviderKey(member);
        if (np) add(providerType + ':name', np);
      }
      if (!tokens.length) add(providerType + ':row', member.id || member.supabaseLoginId || member.signupId || member.name || Math.random());
      return Array.from(new Set(tokens));
    }

    function getAdminMemberCanonicalPrimaryKey(member) {
      const tokens = getAdminMemberDedupeTokens(member);
      return tokens[0] || ('row:' + (member?.id || Math.random()));
    }

    function scoreAdminMemberForDedupe(member) {
      if (!member) return -9999;
      let score = 0;
      if (isDesignatedSuperAdminMember(member)) score += 10000;
      if (member.fromSupabase) score += 1000;
      if (member.supabaseLoginId) score += 120;
      if (member.supabaseAuthUserId || member.authUserId) score += 110;
      if (member.providerId || member.kakaoUserId || member.naverUserId) score += 100;
      if (member.phone) score += 40;
      if (member.email) score += 30;
      if (member.lastLoginAt) score += 20;
      if (String(member.status || '').toLowerCase().includes('duplicate_hidden')) score -= 500;
      if (isMemberWithdrawnOrBlocked(member)) score -= 1000;
      const time = Date.parse(member.lastLoginAt || member.updatedAt || member.createdAt || '') || 0;
      score += Math.min(50, Math.floor(time / 100000000000));
      return score;
    }

    function mergeAdminMemberForDedupe(existing, incoming) {
      if (!existing) return incoming;
      if (!incoming) return existing;
      const existingScore = scoreAdminMemberForDedupe(existing);
      const incomingScore = scoreAdminMemberForDedupe(incoming);
      const base = incomingScore > existingScore ? incoming : existing;
      const other = incomingScore > existingScore ? existing : incoming;
      const merged = { ...other, ...base };
      ['id','phone','email','providerId','kakaoUserId','naverUserId','supabaseLoginId','signupId','supabaseAuthUserId','authUserId','lastLoginAt','createdAt','updatedAt','adminMemo','paymentPlanLabel','memberPlan','paymentEndsAt'].forEach(key => {
        if (!merged[key] && other[key]) merged[key] = other[key];
      });
      if (isDesignatedSuperAdminMember(existing) || isDesignatedSuperAdminMember(incoming)) {
        merged.adminRole = SUPER_ADMIN_ROLE_NAME;
        merged.role = 'super_admin';
      } else if (merged.adminRole === SUPER_ADMIN_ROLE_NAME && !isDesignatedSuperAdminMember(merged)) {
        delete merged.adminRole;
        merged.role = 'member';
      }
      merged._duplicateCount = Number(existing._duplicateCount || 1) + Number(incoming._duplicateCount || 1);
      return merged;
    }

    function dedupeAdminMembersForDisplay(members) {
      const groups = [];
      const tokenToIndex = new Map();
      (members || []).forEach(member => {
        if (!member || isMemberWithdrawnOrBlocked(member)) return;
        const tokens = getAdminMemberDedupeTokens(member);
        const matching = Array.from(new Set(tokens.map(token => tokenToIndex.get(token)).filter(index => index !== undefined)));
        if (!matching.length) {
          const index = groups.length;
          groups.push({ member, tokens:new Set(tokens) });
          tokens.forEach(token => tokenToIndex.set(token, index));
          return;
        }
        const primary = matching[0];
        groups[primary].member = mergeAdminMemberForDedupe(groups[primary].member, member);
        tokens.forEach(token => groups[primary].tokens.add(token));
        // 같은 회원의 토큰이 여러 그룹에 흩어져 있으면 하나로 합칩니다.
        matching.slice(1).sort((a,b) => b-a).forEach(index => {
          groups[primary].member = mergeAdminMemberForDedupe(groups[primary].member, groups[index].member);
          groups[index].tokens.forEach(token => groups[primary].tokens.add(token));
          groups[index].member = null;
        });
        groups[primary].tokens.forEach(token => tokenToIndex.set(token, primary));
      });
      return groups.map(group => group.member).filter(Boolean);
    }

    function mergeSupabaseMembersIntoLocal(rows) {
      const rawIncoming = filterActiveRowsOnly(rows || [])
        .map(makeLocalMemberFromSupabaseRow)
        .filter(member => (member.supabaseLoginId || member.providerId || member.signupId || member.phone || member.name));
      const incomingMap = new Map();
      rawIncoming.forEach(member => {
        const providerType = getMemberSignupProviderType(member);
        const key = (providerType === 'kakao' || providerType === 'naver')
          ? (getAdminMemberNameProviderKey(member) || getAdminLocalMemberKeys(member)[0])
          : (getAdminLocalMemberKeys(member)[0] || getAdminMemberNameProviderKey(member));
        if (!key) return;
        const prev = incomingMap.get(key);
        if (!prev) {
          incomingMap.set(key, member);
          return;
        }
        const prevTime = Date.parse(prev.lastLoginAt || prev.updatedAt || prev.createdAt || '') || 0;
        const nextTime = Date.parse(member.lastLoginAt || member.updatedAt || member.createdAt || '') || 0;
        if (nextTime >= prevTime) incomingMap.set(key, { ...prev, ...member, id: prev.id || member.id });
      });
      const incoming = dedupeAdminMembersForDisplay(Array.from(incomingMap.values()));
      if (!incoming.length) return 0;

      const localMembers = ensureMemberIds().filter(member => !isMemberWithdrawnOrBlocked(member));
      const localByKey = new Map();
      const localByNameProvider = new Map();

      localMembers.forEach(local => {
        getAdminLocalMemberKeys(local).forEach(key => {
          if (key && !localByKey.has(key)) localByKey.set(key, local);
        });
        const npKey = getAdminMemberNameProviderKey(local);
        if (npKey && !localByNameProvider.has(npKey)) localByNameProvider.set(npKey, local);
      });

      const serverKeySet = new Set();
      const serverNameProviderSet = new Set();
      const mergedServerMembers = incoming.map(server => {
        const keys = getAdminLocalMemberKeys(server);
        keys.forEach(key => serverKeySet.add(key));
        const npKey = getAdminMemberNameProviderKey(server);
        if (npKey) serverNameProviderSet.add(npKey);

        const sameLocal = keys.map(key => localByKey.get(key)).find(Boolean) || (npKey ? localByNameProvider.get(npKey) : null);
        if (!sameLocal) return server;
        return {
          ...sameLocal,
          ...server,
          id: server.id || sameLocal.id,
          adminRole: isDesignatedSuperAdminMember(server) ? SUPER_ADMIN_ROLE_NAME : (sameLocal.adminRole === SUPER_ADMIN_ROLE_NAME ? '' : (sameLocal.adminRole || server.adminRole || '')),
          adminRoleUpdatedAt: sameLocal.adminRoleUpdatedAt || server.adminRoleUpdatedAt || '',
          adminRoleUpdatedBy: sameLocal.adminRoleUpdatedBy || server.adminRoleUpdatedBy || '',
          testPassword: sameLocal.testPassword || server.testPassword || '',
          passwordSet: sameLocal.passwordSet || server.passwordSet || false,
          updatedAt: new Date().toISOString()
        };
      });

      // v23.7.204: 서버에서 회원 3명이 확인되면 화면/저장도 서버 3명을 기준으로 정리합니다.
      // 예전 localStorage에 남은 카카오/KAKAo/카카오계정회원가입 중복 행은 표시하지 않습니다.
      const keepLocalMembers = localMembers.filter(local => {
        const role = local?.adminRole || supabaseRoleToAdminRole(local?.role || '');
        const isAdmin = [SUPER_ADMIN_ROLE_NAME, '관리자', '운영관리자', '조회관리자'].includes(role);
        if (isAdmin || local?.isSuperAdminVirtual) return true;

        const providerType = getMemberSignupProviderType(local);
        const keys = getAdminLocalMemberKeys(local);
        const sameKey = keys.some(key => serverKeySet.has(key));
        const npKey = getAdminMemberNameProviderKey(local);
        const sameNameProvider = npKey && serverNameProviderSet.has(npKey);

        if (providerType === 'kakao' || providerType === 'naver') {
          // v23.7.248: 네이버 약관가입 직후 서버 RPC 목록 반영이 늦어도 상세관리에서 숨기지 않습니다.
          return hasLocalSocialTermsAgreement(local) && !sameKey && !sameNameProvider;
        }
        if (sameKey || sameNameProvider) return false;
        return true;
      });

      const finalMap = new Map();
      const putFinal = member => {
        const key = getAdminMemberCanonicalPrimaryKey(member);
        if (!finalMap.has(key)) finalMap.set(key, member);
      };
      mergedServerMembers.forEach(putFinal);
      keepLocalMembers.forEach(putFinal);
      setMembers(Array.from(finalMap.values()));
      return incoming.length;
    }






    // v23.7.216 - 서버 active 목록에 없는 일반회원/소셜회원은 관리자 화면에 다시 살아나지 않도록 localStorage에서도 정리합니다.
    // 최고관리자와 직원 관리자 계정은 보존합니다.
    function purgeLocalMembersNotInActiveServerRows(rows) {
      const activeRows = filterActiveRowsOnly(rows || []);
      const activeMembers = activeRows.map(makeLocalMemberFromSupabaseRow).filter(Boolean);
      const activeKeys = new Set();
      const activeNameProviders = new Set();
      activeMembers.forEach(member => {
        getAdminLocalMemberKeys(member).forEach(key => activeKeys.add(key));
        const np = getAdminMemberNameProviderKey(member);
        if (np) activeNameProviders.add(np);
      });
      const kept = ensureMemberIds().filter(member => {
        if (!member || isMemberWithdrawnOrBlocked(member)) return false;
        if (member.isSuperAdminVirtual || isDesignatedSuperAdminMember(member)) return true;
        if (['관리자','운영관리자','조회관리자'].includes(member.adminRole)) return true;
        const providerType = getMemberSignupProviderType(member);
        if ((providerType === 'kakao' || providerType === 'naver') && hasLocalSocialTermsAgreement(member)) return true;
        const keys = getAdminLocalMemberKeys(member);
        const np = getAdminMemberNameProviderKey(member);
        return keys.some(key => activeKeys.has(key)) || (np && activeNameProviders.has(np));
      });
      setMembers(kept);
      return kept.length;
    }

    // v23.7.208 - 가입방식 표기 통일: KAKAo / 카카오계정회원가입 / kakao 등을 하나로 정리합니다.
    function normalizeSignupProviderKey(value) {
      const raw = normalizeLoginText(value || '');
      const compact = raw.toLowerCase().replace(/\s+/g, '').replace(/_/g, '').replace(/-/g, '');
      if (!compact) return '';
      if (compact.includes('kakao') || compact.includes('카카오')) return 'kakao';
      if (compact.includes('naver') || compact.includes('네이버')) return 'naver';
      if (compact.includes('sitepass') || compact.includes('일반') || compact.includes('자체') || compact.includes('회원가입') || compact.includes('아이디')) return 'sitepass';
      return compact;
    }

    // 혹시 예전 패치에서 대소문자가 다르게 호출돼도 멈추지 않도록 별칭을 둡니다.
    function normalizeSignupProviderkey(value) { return normalizeSignupProviderKey(value); }
    function normalizesignupProviderKey(value) { return normalizeSignupProviderKey(value); }
    function normalizesignupProviderkey(value) { return normalizeSignupProviderKey(value); }
    function normalizesignupproviderkey(value) { return normalizeSignupProviderKey(value); }

    function findExistingMemberForSocialLogin(member) {
      if (!member) return null;
      const provider = normalizeSignupProviderKey(member.signupMethod || member.provider || '');
      const providerId = String(member.providerId || '').toLowerCase();
      const kakaoId = String(member.kakaoUserId || '').toLowerCase();
      const naverId = String(member.naverUserId || '').toLowerCase();
      const email = String(member.email || '').toLowerCase();
      const name = String(member.name || '').toLowerCase();
      const phone = String(member.phone || '').replace(/[^0-9]/g, '');
      return ensureMemberIds().find(m => {
        if (!m || isMemberWithdrawnOrBlocked(m)) return false;
        const mProvider = normalizeSignupProviderKey(m.signupMethod || m.provider || '');
        const mProviderId = String(m.providerId || '').toLowerCase();
        const mKakaoId = String(m.kakaoUserId || '').toLowerCase();
        const mNaverId = String(m.naverUserId || '').toLowerCase();
        const mEmail = String(m.email || '').toLowerCase();
        const mName = String(m.name || '').toLowerCase();
        const mPhone = String(m.phone || '').replace(/[^0-9]/g, '');
        return (providerId && mProviderId === providerId) ||
          (kakaoId && mKakaoId === kakaoId) ||
          (naverId && mNaverId === naverId) ||
          (email && mEmail === email && provider && mProvider === provider) ||
          (phone && mPhone === phone) ||
          (name && mName === name && provider && mProvider === provider);
      }) || null;
    }

    function mergeSocialLoginMember(existing, incoming) {
      if (!existing) return incoming;
      const keep = {
        id: existing.id,
        createdAt: existing.createdAt,
        phone: existing.phone,
        testPassword: existing.testPassword,
        passwordSet: existing.passwordSet,
        passwordChangedAt: existing.passwordChangedAt,
        adminRole: existing.adminRole,
        adminRoleUpdatedAt: existing.adminRoleUpdatedAt,
        adminRoleUpdatedBy: existing.adminRoleUpdatedBy,
        agreements: existing.agreements
      };
      Object.assign(existing, incoming || {}, { updatedAt:new Date().toISOString(), loginOnlyTest:true });
      if (!incoming?.phone && keep.phone) existing.phone = keep.phone;
      if (!incoming?.testPassword && keep.testPassword) existing.testPassword = keep.testPassword;
      if (keep.passwordSet && !incoming?.passwordSet) existing.passwordSet = keep.passwordSet;
      if (keep.passwordChangedAt && !incoming?.passwordChangedAt) existing.passwordChangedAt = keep.passwordChangedAt;
      if (keep.adminRole && !incoming?.adminRole) existing.adminRole = keep.adminRole;
      if (keep.adminRoleUpdatedAt && !incoming?.adminRoleUpdatedAt) existing.adminRoleUpdatedAt = keep.adminRoleUpdatedAt;
      if (keep.adminRoleUpdatedBy && !incoming?.adminRoleUpdatedBy) existing.adminRoleUpdatedBy = keep.adminRoleUpdatedBy;
      if (keep.agreements && !incoming?.agreements) existing.agreements = keep.agreements;
      existing.id = keep.id || existing.id;
      existing.createdAt = keep.createdAt || existing.createdAt;
      return existing;
    }

    function makeStableSocialFallbackId(provider) {
      const providerKey = normalizeSignupProviderKey(provider || 'social') || 'social';
      let saved = '';
      try { saved = localStorage.getItem('sitepass_' + providerKey + '_fallback_member_id') || ''; } catch (e) { saved = ''; }
      if (!saved) {
        saved = providerKey.toUpperCase() + '-BROWSER-' + Date.now();
        try { localStorage.setItem('sitepass_' + providerKey + '_fallback_member_id', saved); } catch (e) {}
      }
      return saved;
    }

    // v23.7.216 - 회원 저장 함수입니다. 기존 회원이면 신규 생성하지 않고, 최고관리자는 sitepass@kakao.com 1명만 유지합니다.
    function saveMemberTest(member) {
      if (!member) return;
      const saveBlockedRecord = findWithdrawnMemberRecord(member);
      if (saveBlockedRecord) {
        // v23.7.219 테스트기간: 같은 계정으로 탈퇴→재가입을 반복할 수 있게 저장 차단을 해제합니다.
        removeWithdrawnMemberRecord(member);
        member.rejoinConfirmedAt = member.rejoinConfirmedAt || new Date().toISOString();
        member.withdrawn = false;
        member.status = member.status && isWithdrawnStatusValue(member.status) ? '실사용베타' : (member.status || '실사용베타');
        member.memberStatus = 'active';
        member.plan_type = member.plan_type && isWithdrawnStatusValue(member.plan_type) ? 'beta' : (member.plan_type || 'beta');
      }
      const members = ensureMemberIds();
      const memberPhone = String(member.phone || '').replace(/[^0-9]/g, '');
      const memberSignupId = String(member.signupId || '').toLowerCase();
      const memberProviderId = String(member.providerId || '').toLowerCase();
      const memberKakaoId = String(member.kakaoUserId || '').toLowerCase();
      const memberNaverId = String(member.naverUserId || '').toLowerCase();
      const memberEmail = String(member.email || '').toLowerCase();
      const memberName = String(member.name || '').toLowerCase();
      const memberProvider = normalizeSignupProviderKey(member.signupMethod || member.provider || '');
      const existing = members.find(m => {
        const mPhone = String(m.phone || '').replace(/[^0-9]/g, '');
        const mSignupId = String(m.signupId || '').toLowerCase();
        const mProviderId = String(m.providerId || '').toLowerCase();
        const mKakaoId = String(m.kakaoUserId || '').toLowerCase();
        const mNaverId = String(m.naverUserId || '').toLowerCase();
        const mEmail = String(m.email || '').toLowerCase();
        const mName = String(m.name || '').toLowerCase();
        const mProvider = normalizeSignupProviderKey(m.signupMethod || m.provider || '');
        return (member.id && m.id === member.id) ||
          (memberPhone && mPhone === memberPhone) ||
          (memberSignupId && mSignupId === memberSignupId) ||
          (memberProviderId && mProviderId === memberProviderId) ||
          (memberKakaoId && mKakaoId === memberKakaoId) ||
          (memberNaverId && mNaverId === memberNaverId) ||
          (memberEmail && mEmail === memberEmail && memberProvider && mProvider === memberProvider) ||
          (memberName && mName === memberName && memberProvider && mProvider === memberProvider);
      });
      const normalizedMember = { ...member, updatedAt:new Date().toISOString() };
      let savedMember = normalizedMember;
      if (existing) {
        const keep = {
          id: existing.id,
          createdAt: existing.createdAt,
          phone: existing.phone,
          testPassword: existing.testPassword,
          passwordSet: existing.passwordSet,
          passwordChangedAt: existing.passwordChangedAt,
          adminRole: existing.adminRole,
          adminRoleUpdatedAt: existing.adminRoleUpdatedAt,
          adminRoleUpdatedBy: existing.adminRoleUpdatedBy,
          agreements: existing.agreements
        };
        Object.assign(existing, normalizedMember);
        if (keep.id) existing.id = keep.id;
        if (keep.createdAt) existing.createdAt = keep.createdAt;
        if (!member.phone && keep.phone) existing.phone = keep.phone;
        if (!member.testPassword && keep.testPassword) existing.testPassword = keep.testPassword;
        if (keep.passwordSet && !member.passwordSet) existing.passwordSet = keep.passwordSet;
        if (keep.passwordChangedAt && !member.passwordChangedAt) existing.passwordChangedAt = keep.passwordChangedAt;
        if (keep.adminRole && !member.adminRole) existing.adminRole = keep.adminRole;
        if (keep.adminRoleUpdatedAt && !member.adminRoleUpdatedAt) existing.adminRoleUpdatedAt = keep.adminRoleUpdatedAt;
        if (keep.adminRoleUpdatedBy && !member.adminRoleUpdatedBy) existing.adminRoleUpdatedBy = keep.adminRoleUpdatedBy;
        if (keep.agreements && !member.agreements) existing.agreements = keep.agreements;
        savedMember = existing;
      } else {
        savedMember = { id:'MEM-' + Date.now(), createdAt:new Date().toISOString(), status:'실사용베타', ...normalizedMember };
        members.unshift(savedMember);
      }
      setMembers(members);
      try { saveMemberToSupabase(savedMember); } catch (e) { console.warn('회원 서버 저장은 나중에 다시 시도합니다:', e); }
      return savedMember;
    }


    async function syncCurrentSupabaseAuthMemberToServer() {
      try {
        const supabaseApi = getSupabaseApiModule();
        if (!(supabaseApi.hasRpc && supabaseApi.hasRpc())) return false;
        const { error } = await supabaseApi.rpc('sitepass_sync_current_user_member');
        if (error) {
          console.warn('현재 Supabase Auth 회원 서버 동기화 RPC 실패:', error.message);
          return false;
        }
        return true;
      } catch (e) {
        console.warn('현재 Supabase Auth 회원 서버 동기화 RPC 예외:', e);
        return false;
      }
    }

    async function syncSupabaseMembersForAdmin(forceAlert) {
      if (!isAdminLoggedIn()) return;
      if (adminSupabaseMemberSyncing) return;
      if (!forceAlert && adminSupabaseMemberSyncedAt && Date.now() - adminSupabaseMemberSyncedAt < 15000) return;
      const supabaseApi = getSupabaseApiModule();
      if (!(supabaseApi.hasClient && supabaseApi.hasClient())) {
        adminSupabaseMemberSyncMessage = 'Supabase 연결 없음: 이 브라우저에 저장된 회원만 표시 중';
        if (forceAlert) alert(adminSupabaseMemberSyncMessage);
        renderAdmin();
        return;
      }
      adminSupabaseMemberSyncing = true;
      adminSupabaseMemberSyncMessage = '인터넷 서버 회원목록 불러오는 중...';
      renderAdmin();
      try {
        let rows = [];
        let rpcErrorMessage = '';
        let directErrorMessage = '';

        // v23.7.225: 관리자 새로고침 전 Auth 소셜 가입자를 members로 먼저 보강 동기화합니다.
        // 이 단계가 실패해도 아래 회원목록 조회는 계속 진행합니다.
        if (supabaseApi.hasRpc && supabaseApi.hasRpc()) {
          try {
            const { data: authSyncCount, error: authSyncError } = await supabaseApi.rpc('sitepass_sync_auth_social_users_to_members');
            if (authSyncError) {
              console.warn('Auth 소셜 회원 보강 동기화 실패:', authSyncError.message || authSyncError);
            } else {
              console.log('Auth 소셜 회원 보강 동기화 완료:', authSyncCount);
            }
          } catch (authSyncException) {
            console.warn('Auth 소셜 회원 보강 동기화 예외:', authSyncException?.message || authSyncException);
          }
        }

        // v23.7.216: 인터넷 배포에서는 RLS 때문에 직접 SELECT가 막힐 수 있으므로 RPC를 1순위로 호출합니다.
        let triedRpc = false;
        if (supabaseApi.hasRpc && supabaseApi.hasRpc()) {
          triedRpc = true;
          try {
            const { data: rpcRows, error: rpcError } = await supabaseApi.rpc('sitepass_admin_sync_members');
            if (rpcError) {
              rpcErrorMessage = rpcError.message || 'sitepass_admin_sync_members RPC 실패';
            } else {
              rows = Array.isArray(rpcRows) ? rpcRows : [];
            }
          } catch (rpcException) {
            rpcErrorMessage = rpcException?.message || 'sitepass_admin_sync_members RPC 예외';
          }
        }

        // v23.7.216: RPC가 있으면 RPC 결과만 active 기준으로 사용합니다.
        // RPC 실패 때 직접조회로 우회하면 탈퇴회원이 다시 보일 수 있어 직접조회는 RPC가 없는 경우에만 씁니다.
        if (!rows.length && !triedRpc) {
          try {
            const { data, error } = await supabaseApi.select('sitepass_members', '*', function(query){
              return query.order('last_login_at', { ascending:false, nullsFirst:false }).limit(1000);
            });
            if (error) {
              directErrorMessage = error.message || 'sitepass_members 직접 조회 실패';
            } else {
              rows = Array.isArray(data) ? data : [];
            }
          } catch (directError) {
            directErrorMessage = directError?.message || 'sitepass_members 직접 조회 예외';
          }
        }

        // v23.7.225: 관리자 통계는 회원 행 수가 아니라 약관동의 완료/active/탈퇴 이벤트 기준 RPC를 우선 사용합니다.
        if (supabaseApi.hasRpc && supabaseApi.hasRpc()) {
          try {
            const { data: summaryData, error: summaryError } = await supabaseApi.rpc('sitepass_admin_member_summary');
            if (summaryError) {
              console.warn('관리자 가입/탈퇴 통계 RPC 실패:', summaryError.message || summaryError);
            } else {
              adminMemberSummaryStats = summaryData || null;
              clearLocalWithdrawnIfServerSaysZero();
            }
          } catch (summaryException) {
            console.warn('관리자 가입/탈퇴 통계 RPC 예외:', summaryException?.message || summaryException);
          }
        }

        rows = filterRowsExcludingLocalWithdrawn(filterActiveRowsOnly(rows || []));
        adminServerMemberRows = rows || [];
        const count = mergeSupabaseMembersIntoLocal(rows || []);
        try { purgeLocalMembersNotInActiveServerRows(rows || []); } catch (purgeError) { console.warn('local 회원목록 active 기준 정리 생략:', purgeError); }
        adminSupabaseMemberSyncedAt = Date.now();
        adminSupabaseMemberSyncMessage = rows.length
          ? '약관동의 회원목록 동기화 완료: 서버 표시대상 ' + rows.length + '명 / 화면 ' + dedupeAdminMembersForDisplay(rows.map(makeLocalMemberFromSupabaseRow)).length + '명 표시'
          : '서버 회원 0명 수신. RPC 확인: ' + (rpcErrorMessage || '오류 없음') + (directErrorMessage ? ' / 직접조회: ' + directErrorMessage : '');
        if (forceAlert) alert(adminSupabaseMemberSyncMessage);
      } catch (e) {
        console.warn('Supabase 회원목록 불러오기 예외:', e);
        adminSupabaseMemberSyncMessage = 'Supabase 회원목록 불러오기 중 오류가 났습니다: ' + (e?.message || '알 수 없음');
        if (forceAlert) alert(adminSupabaseMemberSyncMessage);
      } finally {
        adminSupabaseMemberSyncing = false;
        renderAdmin();
      }
    }


    const SITEPASS_OAUTH_PENDING_KEY = STORAGE_KEY + '_oauth_pending_v23_7_207';

    // v23.7.258: 카카오/네이버 OAuth 로그인 처리는 assets/js/auth-social.js로 분리했습니다.
    function getAuthSocialModule() {
      return window.SitePassAuthSocial || {};
    }

    function isNonChromeInternetBrowser() {
      const mod = getAuthSocialModule();
      return mod.isNonChromeInternetBrowser ? mod.isNonChromeInternetBrowser() : false;
    }

    function showOAuthRedirectHelp(providerLabel, url) {
      const mod = getAuthSocialModule();
      if (mod.showOAuthRedirectHelp) return mod.showOAuthRedirectHelp(providerLabel, url);
    }

    function hideOAuthRedirectHelp() {
      const mod = getAuthSocialModule();
      if (mod.hideOAuthRedirectHelp) return mod.hideOAuthRedirectHelp();
    }

    function openOAuthUrlSameTab(url, providerLabel) {
      const mod = getAuthSocialModule();
      return mod.openOAuthUrlSameTab ? mod.openOAuthUrlSameTab(url, providerLabel) : false;
    }

    function getOAuthRedirectUrl() {
      const mod = getAuthSocialModule();
      return mod.getOAuthRedirectUrl ? mod.getOAuthRedirectUrl() : (location.origin + location.pathname);
    }

    function hasSupabaseKakaoReturnParams() {
      const mod = getAuthSocialModule();
      return mod.hasSupabaseKakaoReturnParams ? mod.hasSupabaseKakaoReturnParams() : false;
    }

    async function startSupabaseKakaoOAuth(mode) {
      const mod = getAuthSocialModule();
      if (mod.startSupabaseKakaoOAuth) return mod.startSupabaseKakaoOAuth(mode);
      alert('카카오 로그인 파일을 불러오지 못했습니다. assets/js/auth-social.js 업로드를 확인해주세요.');
    }

    async function startSupabaseNaverOAuth(mode) {
      const mod = getAuthSocialModule();
      if (mod.startSupabaseNaverOAuth) return mod.startSupabaseNaverOAuth(mode);
      alert('네이버 로그인 파일을 불러오지 못했습니다. assets/js/auth-social.js 업로드를 확인해주세요.');
    }

    function handleKakaoLogin() {
      const mod = getAuthSocialModule();
      if (mod.handleKakaoLogin) return mod.handleKakaoLogin();
      return startSupabaseKakaoOAuth('login');
    }

    function handleNaverLogin() {
      const mod = getAuthSocialModule();
      if (mod.handleNaverLogin) return mod.handleNaverLogin();
      return startSupabaseNaverOAuth('login');
    }

    function handleNaverSignup() {
      const mod = getAuthSocialModule();
      if (mod.handleNaverSignup) return mod.handleNaverSignup();
      return startSupabaseNaverOAuth('signup');
    }

    function handleKakaoSignup() {
      const mod = getAuthSocialModule();
      if (mod.handleKakaoSignup) return mod.handleKakaoSignup();
      return startSupabaseKakaoOAuth('signup');
    }

    // 휴대폰 inline onclick 안전 연결
    window.handleKakaoLogin = handleKakaoLogin;
    window.handleKakaoSignup = handleKakaoSignup;
    window.handleNaverLogin = handleNaverLogin;
    window.handleNaverSignup = handleNaverSignup;
    window.submitSocialLoginTest = submitSocialLoginTest;
    window.startJoinFlow = startJoinFlow;
    window.openSitePassSignup = openSitePassSignup;
    window.toggleAllSignupTerms = toggleAllSignupTerms;
    window.updateSignupTermsUi = updateSignupTermsUi;

    function normalizeOAuthProviderFromAuth(value) {
      const mod = getAuthSocialModule();
      return mod.normalizeOAuthProviderFromAuth ? mod.normalizeOAuthProviderFromAuth(value) : String(value || '').trim().toLowerCase().replace(/^custom:/, '');
    }

    function getPrimaryAuthProviderFromUser(user, fallback) {
      const mod = getAuthSocialModule();
      return mod.getPrimaryAuthProviderFromUser ? mod.getPrimaryAuthProviderFromUser(user, fallback) : normalizeOAuthProviderFromAuth(fallback || user?.app_metadata?.provider || user?.user_metadata?.provider || '');
    }

    function makeMemberFromSupabaseKakaoUser(user, pending) {
      const mod = getAuthSocialModule();
      return mod.makeMemberFromSupabaseKakaoUser ? mod.makeMemberFromSupabaseKakaoUser(user, pending) : null;
    }

    function makeMemberFromSupabaseNaverUser(user, pending) {
      const mod = getAuthSocialModule();
      return mod.makeMemberFromSupabaseNaverUser ? mod.makeMemberFromSupabaseNaverUser(user, pending) : null;
    }

    function sitePassOAuthWithTimeout(promise, ms, label) {
      const mod = getAuthSocialModule();
      if (mod.sitePassOAuthWithTimeout) return mod.sitePassOAuthWithTimeout(promise, ms, label);
      return Promise.resolve(promise);
    }

    async function handleSupabaseKakaoOAuthReturn() {
      const mod = getAuthSocialModule();
      if (mod.handleSupabaseKakaoOAuthReturn) return mod.handleSupabaseKakaoOAuthReturn();
      return false;
    }


    function normalizeLoginText(value) {
      return String(value || '').trim();
    }



    // v23.7.216 - 휴대폰 브라우저 저장 비밀번호가 들어왔는지 확인하기 쉽도록 표시 토글을 제공합니다.
    function toggleLoginPasswordVisible(checked) {
      const input = document.getElementById('sitepassLoginPassword');
      if (!input) return;
      input.type = checked ? 'text' : 'password';
    }
    window.toggleLoginPasswordVisible = toggleLoginPasswordVisible;


    // v23.7.216 - 휴대폰 브라우저 저장 비밀번호 자동완성 안정화.
    // 로그인 화면을 열 때 JS가 비밀번호를 지우지 않도록 하고, 실제 <form> 구조로 브라우저 비밀번호 관리자와 맞춥니다.
    function stabilizeLoginAutofillFields() {
      const form = document.getElementById('normalLoginFormArea');
      const idInput = document.getElementById('sitepassLoginIdentifier');
      const pwInput = document.getElementById('sitepassLoginPassword');
      if (form) {
        form.setAttribute('autocomplete', 'on');
        form.setAttribute('method', 'post');
        form.setAttribute('action', './');
      }
      if (idInput) {
        idInput.setAttribute('name', 'username');
        idInput.setAttribute('autocomplete', 'username');
        idInput.setAttribute('autocapitalize', 'none');
        idInput.setAttribute('spellcheck', 'false');
      }
      if (pwInput) {
        pwInput.classList.remove('hidden');
        pwInput.setAttribute('name', 'password');
        pwInput.setAttribute('autocomplete', 'current-password');
        if (pwInput.type !== 'text') pwInput.type = 'password';
      }
    }
    window.stabilizeLoginAutofillFields = stabilizeLoginAutofillFields;
    window.addEventListener('pageshow', function(){ setTimeout(stabilizeLoginAutofillFields, 80); });
    window.addEventListener('load', function(){ setTimeout(stabilizeLoginAutofillFields, 160); });

    function openAdminLoginFromSignup() {
      showScreen('signupScreen');
    }

    function isSuperAdminLoginId(loginId) {
      const key = normalizeAdminRoleKey(loginId);
      return !!key && key === normalizeAdminRoleKey(ADMIN_ID);
    }

    function supabaseRoleToAdminRole(role) {
      const value = String(role || '').trim().toLowerCase();
      if (!value) return '';
      if (value === 'super_admin' || value === 'superadmin' || value === '최고관리자') return SUPER_ADMIN_ROLE_NAME;
      if (value === 'admin' || value === 'operator' || value === 'manager' || value === '운영관리자' || value === 'viewer' || value === 'readonly' || value === '조회관리자' || value === '관리자') return '관리자';
      return '';
    }

    function adminRoleToSupabaseRole(roleName, loginId) {
      if (isSuperAdminLoginId(loginId)) return 'super_admin';
      if (roleName === SUPER_ADMIN_ROLE_NAME) return 'member';
      if (roleName === '관리자' || roleName === '운영관리자' || roleName === '조회관리자') return 'admin';
      return 'member';
    }

    function isDesignatedSuperAdminMember(member) {
      if (!member) return false;
      return getMemberAdminIdentifiers(member).some(id => isSuperAdminLoginId(id));
    }

    function normalizeSingleSuperAdminRole(member) {
      if (!member || member.isSuperAdminVirtual) return member;
      const designated = isDesignatedSuperAdminMember(member);
      const roleName = member.adminRole || supabaseRoleToAdminRole(member.role || '');
      if (designated) {
        member.adminRole = SUPER_ADMIN_ROLE_NAME;
        member.role = 'super_admin';
        return member;
      }
      if (roleName === SUPER_ADMIN_ROLE_NAME || String(member.role || '').toLowerCase() === 'super_admin') {
        delete member.adminRole;
        member.role = 'member';
        member.adminRoleUpdatedAt = new Date().toISOString();
        member.adminRoleUpdatedBy = 'SitePass 최고관리자 단일화';
      }
      return member;
    }

    function enforceSingleSuperAdminOnMemberList(list) {
      const arr = Array.isArray(list) ? list : [];
      return arr.map(member => normalizeSingleSuperAdminRole({ ...(member || {}) }));
    }

    function cleanupAdminRoleMapSingleSuperAdmin() {
      const map = getAdminRoleMap();
      let changed = false;
      Object.keys(map || {}).forEach(key => {
        if (map[key] === SUPER_ADMIN_ROLE_NAME && !isSuperAdminLoginId(key)) {
          delete map[key];
          changed = true;
        }
      });
      if (changed) setAdminRoleMap(map);
    }

    function getLocalAdminRoleForLogin(loginId, member) {
      if (isSuperAdminLoginId(loginId)) return SUPER_ADMIN_ROLE_NAME;
      const role = (member && (member.adminRole || supabaseRoleToAdminRole(member.role))) || '';
      if (role === SUPER_ADMIN_ROLE_NAME) return '';
      const mapped = getMappedAdminRoleForLogin(loginId);
      return mapped === SUPER_ADMIN_ROLE_NAME ? '' : mapped;
    }

    async function fetchSupabaseAdminRoleForLogin(loginId) {
      try {
        if (!window.sitepassSupabase) return '';
        const raw = normalizeLoginText(loginId);
        const key = normalizeAdminRoleKey(raw);
        const candidates = Array.from(new Set([
          raw,
          key,
          key ? 'SITEPASS-' + key : '',
          key ? 'SITEPASS-LOGIN-' + key : ''
        ].filter(Boolean)));
        if (!candidates.length) return '';

        const { data, error } = await window.sitepassSupabase
          .from('sitepass_members')
          .select('login_id, role, name, phone')
          .in('login_id', candidates)
          .limit(1);

        if (error) {
          console.warn('Supabase 관리자 권한 조회 실패:', error.message);
          return '';
        }
        const roleName = supabaseRoleToAdminRole(data && data[0] && data[0].role);
        if (roleName === SUPER_ADMIN_ROLE_NAME && !isSuperAdminLoginId(loginId)) return '';
        return roleName;
      } catch (e) {
        console.warn('Supabase 관리자 권한 조회 예외:', e);
        return '';
      }
    }

    function getAdminRoleMap() {
      try {
        return JSON.parse(localStorage.getItem(ADMIN_ROLE_MAP_KEY) || '{}') || {};
      } catch (e) {
        return {};
      }
    }

    function setAdminRoleMap(map) {
      localStorage.setItem(ADMIN_ROLE_MAP_KEY, JSON.stringify(map || {}));
    }

    function normalizeAdminRoleKey(value) {
      const raw = normalizeLoginText(value).toLowerCase();
      if (!raw) return '';
      return raw.replace(/^sitepass-/, '').replace(/^sitepass-login-/, '');
    }

    function getMemberAdminIdentifiers(member) {
      if (!member) return [];
      const phoneDigits = String(member.phone || '').replace(/[^0-9]/g, '');
      const providerRaw = String(member.providerId || '');
      const providerNoPrefix = providerRaw.replace(/^SITEPASS-/i, '').replace(/^SITEPASS-LOGIN-/i, '');
      return [
        member.id,
        member.signupId,
        member.providerId,
        providerNoPrefix,
        member.name,
        member.phone,
        phoneDigits
      ].map(normalizeAdminRoleKey).filter(Boolean).filter((value, index, arr) => arr.indexOf(value) === index);
    }

    function syncMemberAdminRoleMap(member, role) {
      const map = getAdminRoleMap();
      getMemberAdminIdentifiers(member).forEach(key => {
        if (role) map[key] = role;
        else delete map[key];
      });
      setAdminRoleMap(map);
    }

    function getMappedAdminRoleForLogin(loginId) {
      const key = normalizeAdminRoleKey(loginId);
      if (!key) return '';
      const map = getAdminRoleMap();
      return map[key] || '';
    }

    function getCurrentAdminRoleName() {
      const role = getSessionValue(ADMIN_SESSION_KEY + '_role') || SUPER_ADMIN_ROLE_NAME;
      const adminId = getSessionValue(ADMIN_SESSION_KEY + '_id') || '';
      if (role === SUPER_ADMIN_ROLE_NAME && adminId && !isSuperAdminLoginId(adminId)) return '관리자';
      return role;
    }

    function isSuperAdminLoggedIn() {
      return isAdminLoggedIn() && getCurrentAdminRoleName() === SUPER_ADMIN_ROLE_NAME;
    }

    function completeAdminLogin(roleName, adminId, adminName) {
      let finalRoleName = roleName || SUPER_ADMIN_ROLE_NAME;
      if (finalRoleName === SUPER_ADMIN_ROLE_NAME && !isSuperAdminLoginId(adminId || ADMIN_ID)) finalRoleName = '관리자';
      setSessionValue(ADMIN_SESSION_KEY, 'yes');
      setSessionValue(ADMIN_SESSION_KEY + '_role', finalRoleName);
      setSessionValue(ADMIN_SESSION_KEY + '_id', adminId || '');
      setSessionValue(ADMIN_SESSION_KEY + '_name', adminName || '');
      removeSessionValue(CURRENT_MEMBER_KEY);
      clearPwaAutoMemberTest();
      refreshAdminUi();
      refreshMemberUi();
      showScreen('adminScreen');
    }

    function completeSuperAdminLogin() {
      completeAdminLogin(SUPER_ADMIN_ROLE_NAME, ADMIN_ID, '대표이사 최고관리자');
    }

    function ensureMemberIds() {
      const members = getMembers();
      let changed = false;
      members.forEach((member, index) => {
        if (!member.id) {
          member.id = 'MEM-' + Date.now() + '-' + index;
          changed = true;
        }
      });
      if (changed) setMembers(members);
      return members;
    }

    function findMemberForLogin(loginId) {
      const q = normalizeAdminRoleKey(loginId);
      const qPhone = String(loginId || '').replace(/[^0-9]/g, '');
      return getMembers().find(item => {
        const keys = getMemberAdminIdentifiers(item);
        const phone = String(item.phone || '').replace(/[^0-9]/g, '');
        return keys.includes(q) || (qPhone && phone === qPhone);
      });
    }

    function isMemberPasswordOk(member, password) {
      if (!member) return false;
      if (!member.testPassword) return true;
      return String(member.testPassword) === String(password || '');
    }

    function completeMemberAdminLogin(member) {
      const updatedMember = updateMemberLastLogin(member, '일반 로그인(관리자 권한)') || member;
      const role = updatedMember.adminRole || member.adminRole || '관리자';
      const adminId = updatedMember.signupId || updatedMember.providerId || updatedMember.id || updatedMember.name || '';
      const adminName = updatedMember.name || updatedMember.signupId || '관리자';
      completeAdminLogin(role, adminId, adminName);
    }


    function isSitePassInstalledAppMode() {
      try {
        return !!(
          window.matchMedia('(display-mode: standalone)').matches ||
          window.matchMedia('(display-mode: fullscreen)').matches ||
          window.matchMedia('(display-mode: minimal-ui)').matches ||
          window.navigator.standalone === true
        );
      } catch (e) {
        return false;
      }
    }

    function getQuickAuth() {
      try {
        return JSON.parse(localStorage.getItem(QUICK_AUTH_KEY) || 'null');
      } catch (e) {
        return null;
      }
    }

    function setQuickAuth(data) {
      localStorage.setItem(QUICK_AUTH_KEY, JSON.stringify(data || {}));
      updateQuickAuthUi();
    }

    function getQuickAuthLoginKey(member) {
      return member?.signupId || member?.providerId || member?.id || member?.phone || member?.name || '';
    }

    function getCurrentQuickAuthMember() {
      const current = getCurrentMemberTest();
      if (!current) return null;
      return findMemberForLogin(getQuickAuthLoginKey(current)) || current;
    }

    function getQuickAuthUnlockMember(auth) {
      if (!auth) return null;
      return findMemberForLogin(auth.memberLoginKey) || auth.member || null;
    }

    function isSignupScreenVisible() {
      const signup = document.getElementById('signupScreen');
      return !!(signup && !signup.classList.contains('hidden'));
    }

    function applyQuickFirstLoginMode(appMode, hasPin, hasFingerprint) {
      const loggedOut = !isMemberLoggedIn() && !isAdminLoggedIn();
      const quickFirst = !!(appMode && loggedOut && isSignupScreenVisible());
      document.body.classList.toggle('quick-first-mode', quickFirst);
      if (!quickFirst) document.body.classList.remove('show-normal-login');

      const fallbackButton = document.getElementById('quickNormalLoginButton');
      if (fallbackButton) {
        fallbackButton.classList.toggle('hidden', !quickFirst);
        fallbackButton.textContent = (hasPin || hasFingerprint)
          ? '아이디/카카오/네이버 로그인으로 전환'
          : '처음 등록은 아이디/카카오/네이버 로그인으로 하기';
      }

      if (!quickFirst || document.body.classList.contains('show-normal-login')) return;

      const pinPanel = document.getElementById('quickPinLoginPanel');
      const pinInput = document.getElementById('quickLoginPinInput');
      if (hasPin) {
        if (pinPanel) pinPanel.classList.remove('hidden');
        if (pinInput && document.activeElement !== pinInput) {
          setTimeout(() => {
            try { pinInput.focus(); } catch (e) {}
          }, 120);
        }
      } else {
        if (pinPanel) pinPanel.classList.add('hidden');
        if (pinInput) pinInput.value = '';
      }
    }

    function showNormalLoginFromQuick() {
      document.body.classList.add('show-normal-login');
      const idInput = document.getElementById('sitepassLoginIdentifier');
      const quickStatus = document.getElementById('quickLoginStatus');
      if (quickStatus) {
        quickStatus.classList.remove('ok', 'warn');
        quickStatus.textContent = '아이디/카카오/네이버로 로그인한 뒤 홈화면 앱에서 간편번호 6자리 또는 지문인식을 등록할 수 있습니다.';
      }
      setTimeout(() => {
        try { idInput?.focus(); } catch (e) {}
      }, 80);
    }


    function getQuickAuthState() {
      const auth = getQuickAuth();
      return {
        auth,
        hasPin: !!(auth && auth.pinHash),
        hasFingerprint: !!(auth && auth.fingerprintCredentialId)
      };
    }

    function shouldShowQuickSetupAfterNormalLogin() {
      return false;
    }


    function showQuickSetupStatus(message, type) {
      const status = document.getElementById('quickSetupStatus');
      if (!status) return;
      status.textContent = message;
      status.classList.remove('ok', 'warn');
      if (type) status.classList.add(type);
    }

    function openQuickSetupWizard() {
      if (!shouldShowQuickSetupAfterNormalLogin()) return;
      const overlay = document.getElementById('quickSetupOverlay');
      const pinStep = document.getElementById('quickSetupPinStep');
      const fingerprintStep = document.getElementById('quickSetupFingerprintStep');
      const pin1 = document.getElementById('quickSetupPinInput');
      const pin2 = document.getElementById('quickSetupPinInput2');
      if (overlay) overlay.classList.remove('hidden');
      if (pinStep) pinStep.classList.remove('hidden');
      if (fingerprintStep) fingerprintStep.classList.add('hidden');
      if (pin1) pin1.value = '';
      if (pin2) pin2.value = '';
      showQuickSetupStatus('간편번호를 먼저 등록해주세요. 지문인식은 그 다음에 선택할 수 있습니다.', '');
      setTimeout(() => {
        try { pin1?.focus(); } catch (e) {}
      }, 120);
    }

    function closeQuickSetupWizard(skip) {
      if (skip) sessionStorage.setItem(QUICK_SETUP_SKIP_SESSION_KEY, 'yes');
      const overlay = document.getElementById('quickSetupOverlay');
      if (overlay) overlay.classList.add('hidden');
    }

    function finishQuickSetupWizard() {
      closeQuickSetupWizard(false);
      alert('간편로그인 등록이 완료되었습니다.\n다음부터 홈화면 SitePass 앱을 누르면 간편번호 또는 지문인식 화면이 먼저 열립니다.');
    }

    async function saveQuickSetupPinAndAskFingerprint() {
      const pin1 = document.getElementById('quickSetupPinInput')?.value || '';
      const pin2 = document.getElementById('quickSetupPinInput2')?.value || '';
      const ok = await persistQuickPinAuth(pin1, pin2, showQuickSetupStatus);
      if (!ok) return;
      const pinStep = document.getElementById('quickSetupPinStep');
      const fingerprintStep = document.getElementById('quickSetupFingerprintStep');
      if (pinStep) pinStep.classList.add('hidden');
      if (fingerprintStep) fingerprintStep.classList.remove('hidden');
      showQuickSetupStatus('간편번호 등록 완료. 지문인식도 등록하면 버튼 한 번으로 더 빠르게 들어올 수 있습니다.', 'ok');
    }

    async function registerQuickSetupFingerprint() {
      const ok = await persistFingerprintQuickAuth(showQuickSetupStatus);
      if (ok) {
        showQuickSetupStatus('지문인식 등록 완료. 다음부터 홈화면 앱에서 간편번호 또는 지문인식으로 로그인할 수 있습니다.', 'ok');
        setTimeout(finishQuickSetupWizard, 650);
      }
    }

    function updateQuickAuthUi() {
      document.body.classList.remove('quick-first-mode', 'show-normal-login');
      const quickPanel = document.getElementById('quickLoginPanel');
      const browserNote = document.getElementById('quickBrowserNote');
      const settingsBox = document.getElementById('quickAuthSettingsBox');
      const setupOverlay = document.getElementById('quickSetupOverlay');
      if (quickPanel) quickPanel.classList.add('hidden');
      if (browserNote) browserNote.classList.add('hidden');
      if (settingsBox) settingsBox.classList.add('hidden');
      if (setupOverlay) setupOverlay.classList.add('hidden');
    }


    function showQuickAuthStatus(message, type) {
      const status = document.getElementById('quickAuthStatus');
      if (!status) return;
      status.dataset.manual = 'yes';
      status.textContent = message;
      status.classList.remove('ok', 'warn');
      if (type) status.classList.add(type);
      setTimeout(() => {
        if (status) {
          delete status.dataset.manual;
          updateQuickAuthUi();
        }
      }, 4200);
    }

    function showQuickLoginStatus(message, type) {
      const status = document.getElementById('quickLoginStatus');
      if (!status) return;
      status.textContent = message;
      status.classList.remove('ok', 'warn');
      if (type) status.classList.add(type);
    }

    function openQuickPinLoginPanel() {
      if (!isSitePassInstalledAppMode()) {
        alert('간편번호 로그인은 휴대폰 바탕화면에 설치한 SitePass 아이콘으로 들어왔을 때만 사용합니다.');
        return;
      }
      const auth = getQuickAuth();
      if (!auth || !auth.pinHash) {
        showQuickLoginStatus('아직 간편번호가 등록되지 않았습니다. 먼저 아이디/카카오/네이버로 로그인한 뒤 홈화면 앱에서 간편번호/지문을 등록해주세요.', 'warn');
        return;
      }
      const panel = document.getElementById('quickPinLoginPanel');
      const input = document.getElementById('quickLoginPinInput');
      if (panel) panel.classList.remove('hidden');
      if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 80);
      }
    }

    function closeQuickPinLoginPanel() {
      const panel = document.getElementById('quickPinLoginPanel');
      const input = document.getElementById('quickLoginPinInput');
      if (panel) panel.classList.add('hidden');
      if (input) input.value = '';
    }

    function openQuickPinRegisterPanel() {
      if (!isMemberLoggedIn()) {
        alert('먼저 로그인해주세요.');
        return;
      }
      if (!isSitePassInstalledAppMode()) {
        showQuickAuthStatus('간편번호 등록은 휴대폰 바탕화면 SitePass 아이콘으로 실행했을 때 사용하는 기능입니다. 일반 인터넷창에서는 아이디/카카오/네이버 로그인을 사용합니다.', 'warn');
        return;
      }
      const panel = document.getElementById('quickPinRegisterPanel');
      const pin1 = document.getElementById('quickPinRegisterInput');
      const pin2 = document.getElementById('quickPinRegisterInput2');
      if (panel) panel.classList.remove('hidden');
      if (pin1) pin1.value = '';
      if (pin2) pin2.value = '';
      setTimeout(() => pin1?.focus(), 80);
    }

    function closeQuickPinRegisterPanel() {
      const panel = document.getElementById('quickPinRegisterPanel');
      if (panel) panel.classList.add('hidden');
    }

    function makeRandomToken(length) {
      const bytes = new Uint8Array(length || 16);
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
      else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function hashQuickPin(pin, salt) {
      const value = String(pin || '') + ':' + String(salt || '');
      if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        const data = new TextEncoder().encode(value);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      let hash = 2166136261;
      for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      }
      return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
    }

    async function persistQuickPinAuth(pin1, pin2, statusFn) {
      const show = typeof statusFn === 'function' ? statusFn : showQuickAuthStatus;
      if (!/^\d{6}$/.test(pin1) || !/^\d{6}$/.test(pin2)) {
        show('간편번호는 숫자 6자리로 입력해주세요.', 'warn');
        return false;
      }
      if (pin1 !== pin2) {
        show('간편번호와 확인 번호가 다릅니다.', 'warn');
        return false;
      }
      const member = getCurrentQuickAuthMember();
      if (!member) {
        show('로그인된 회원 정보를 찾지 못했습니다. 다시 로그인 후 등록해주세요.', 'warn');
        return false;
      }
      const salt = makeRandomToken(16);
      const currentAuth = getQuickAuth() || {};
      const auth = Object.assign({}, currentAuth, {
        memberLoginKey: getQuickAuthLoginKey(member),
        member: member,
        pinSalt: salt,
        pinHash: await hashQuickPin(pin1, salt),
        pinRegisteredAt: new Date().toISOString(),
        appOnly: true
      });
      setQuickAuth(auth);
      return true;
    }

    async function saveQuickPinAuth() {
      const pin1 = document.getElementById('quickPinRegisterInput')?.value || '';
      const pin2 = document.getElementById('quickPinRegisterInput2')?.value || '';
      const ok = await persistQuickPinAuth(pin1, pin2, showQuickAuthStatus);
      if (!ok) return;
      closeQuickPinRegisterPanel();
      showQuickAuthStatus('간편번호 6자리 등록 완료. 다음부터 홈화면 SitePass 앱에서는 간편번호로 로그인할 수 있습니다.', 'ok');
    }

    async function loginWithPinQuickAuth() {
      if (!isSitePassInstalledAppMode()) {
        alert('간편번호 로그인은 휴대폰 바탕화면 SitePass 아이콘으로 들어왔을 때만 사용합니다.');
        return;
      }
      const auth = getQuickAuth();
      const pin = document.getElementById('quickLoginPinInput')?.value || '';
      if (!auth || !auth.pinHash) {
        showQuickLoginStatus('등록된 간편번호가 없습니다. 먼저 로그인 후 홈화면 앱 간편로그인을 등록해주세요.', 'warn');
        return;
      }
      if (!/^\d{6}$/.test(pin)) {
        showQuickLoginStatus('간편번호 6자리를 입력해주세요.', 'warn');
        return;
      }
      const hash = await hashQuickPin(pin, auth.pinSalt || '');
      if (hash !== auth.pinHash) {
        showQuickLoginStatus('간편번호가 맞지 않습니다.', 'warn');
        return;
      }
      closeQuickPinLoginPanel();
      completeQuickAuthLogin(auth, '간편번호로 로그인되었습니다.');
    }

    function bufferToBase64Url(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      bytes.forEach(b => binary += String.fromCharCode(b));
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    function base64UrlToBuffer(value) {
      const base64 = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    }

    function randomBuffer(length) {
      const bytes = new Uint8Array(length || 32);
      window.crypto.getRandomValues(bytes);
      return bytes.buffer;
    }

    async function persistFingerprintQuickAuth(statusFn) {
      const show = typeof statusFn === 'function' ? statusFn : showQuickAuthStatus;
      if (!isMemberLoggedIn()) {
        show('먼저 로그인해주세요.', 'warn');
        return false;
      }
      if (!isSitePassInstalledAppMode()) {
        show('지문인식 등록은 휴대폰 바탕화면 SitePass 아이콘으로 실행했을 때 사용하는 기능입니다. 일반 인터넷창에서는 아이디/카카오/네이버 로그인을 사용합니다.', 'warn');
        return false;
      }
      if (!window.isSecureContext || !navigator.credentials || !window.PublicKeyCredential) {
        show('현재 환경에서는 지문인식 등록을 사용할 수 없습니다. 정식 https 주소와 지원되는 휴대폰 브라우저에서 가능합니다.', 'warn');
        return false;
      }
      try {
        const member = getCurrentQuickAuthMember();
        if (!member) {
          show('로그인된 회원 정보를 찾지 못했습니다. 다시 로그인 후 등록해주세요.', 'warn');
          return false;
        }
        const userIdBytes = new TextEncoder().encode(getQuickAuthLoginKey(member) || ('sitepass-' + Date.now()));
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: randomBuffer(32),
            rp: { name: 'SitePass' },
            user: {
              id: userIdBytes,
              name: getQuickAuthLoginKey(member) || 'sitepass-user',
              displayName: member.name || member.signupId || 'SitePass 회원'
            },
            pubKeyCredParams: [
              { type: 'public-key', alg: -7 },
              { type: 'public-key', alg: -257 }
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
              residentKey: 'preferred'
            },
            timeout: 60000,
            attestation: 'none'
          }
        });
        if (!credential) throw new Error('지문 등록이 취소되었습니다.');
        const currentAuth = getQuickAuth() || {};
        const auth = Object.assign({}, currentAuth, {
          memberLoginKey: getQuickAuthLoginKey(member),
          member: member,
          fingerprintCredentialId: bufferToBase64Url(credential.rawId),
          fingerprintRegisteredAt: new Date().toISOString(),
          appOnly: true
        });
        setQuickAuth(auth);
        return true;
      } catch (e) {
        show('지문인식 등록이 완료되지 않았습니다. 휴대폰 잠금화면 지문 등록 여부와 https 실행 상태를 확인해주세요.\n' + (e && e.message ? e.message : ''), 'warn');
        return false;
      }
    }

    async function registerFingerprintQuickAuth() {
      const ok = await persistFingerprintQuickAuth(showQuickAuthStatus);
      if (ok) showQuickAuthStatus('지문인식 등록 완료. 다음부터 홈화면 SitePass 앱에서는 지문으로 로그인할 수 있습니다. 정식 서비스에서는 서버 검증까지 연결합니다.', 'ok');
    }

    async function loginWithFingerprintQuickAuth() {
      if (!isSitePassInstalledAppMode()) {
        alert('지문인식 로그인은 휴대폰 바탕화면 SitePass 아이콘으로 들어왔을 때만 사용합니다.');
        return;
      }
      const auth = getQuickAuth();
      if (!auth || !auth.fingerprintCredentialId) {
        showQuickLoginStatus('등록된 지문인식 로그인이 없습니다. 먼저 로그인 후 홈화면 앱에서 지문인식을 등록해주세요.', 'warn');
        return;
      }
      if (!window.isSecureContext || !navigator.credentials || !window.PublicKeyCredential) {
        showQuickLoginStatus('현재 환경에서는 지문인식 로그인을 사용할 수 없습니다. 정식 https 주소와 지원되는 휴대폰 브라우저에서 가능합니다.', 'warn');
        return;
      }
      try {
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge: randomBuffer(32),
            allowCredentials: [{
              type: 'public-key',
              id: base64UrlToBuffer(auth.fingerprintCredentialId),
              transports: ['internal']
            }],
            userVerification: 'required',
            timeout: 60000
          }
        });
        if (!assertion) throw new Error('지문 확인이 취소되었습니다.');
        completeQuickAuthLogin(auth, '지문인식으로 로그인되었습니다.');
      } catch (e) {
        showQuickLoginStatus('지문인식 로그인이 완료되지 않았습니다.\n' + (e && e.message ? e.message : ''), 'warn');
      }
    }

    function completeQuickAuthLogin(auth, message) {
      const member = getQuickAuthUnlockMember(auth);
      if (!member) {
        showQuickLoginStatus('간편로그인에 연결된 회원정보를 찾지 못했습니다. 일반 로그인 후 다시 등록해주세요.', 'warn');
        return;
      }
      const loginKey = getQuickAuthLoginKey(member);
      const role = getLocalAdminRoleForLogin(loginKey, member);
      if (role) {
        member.adminRole = role;
        completeMemberAdminLogin(member);
        return;
      }
      completeMemberLoginTest(member, message || '간편로그인되었습니다.');
    }

    function removeQuickAuth() {
      if (!confirm('이 휴대폰에 저장된 간편번호/지문 로그인을 해제할까요?')) return;
      localStorage.removeItem(QUICK_AUTH_KEY);
      closeQuickPinRegisterPanel();
      closeQuickPinLoginPanel();
      showQuickAuthStatus('간편로그인을 해제했습니다. 다음부터는 아이디/카카오/네이버로 로그인해주세요.', 'ok');
      updateQuickAuthUi();
    }

    let idFindVerifyState = {
      name: '',
      phone: '',
      code: '',
      expiresAt: 0,
      verified: false,
      foundLoginId: '',
      provider: ''
    };

    let passwordResetVerifyState = {
      loginId: '',
      phone: '',
      code: '',
      expiresAt: 0,
      verified: false
    };

    function resetPasswordResetSteps(clearIdentity) {
      passwordResetVerifyState = { loginId: '', phone: '', code: '', expiresAt: 0, verified: false };
      const codeStep = document.getElementById('findPwCodeStep');
      const newStep = document.getElementById('findPwNewStep');
      const codeInput = document.getElementById('findPwCode');
      const pwInput = document.getElementById('findPwNew');
      const pwInput2 = document.getElementById('findPwNew2');
      if (codeStep) codeStep.classList.add('hidden');
      if (newStep) newStep.classList.add('hidden');
      if (codeInput) codeInput.value = '';
      if (pwInput) pwInput.value = '';
      if (pwInput2) pwInput2.value = '';
      if (clearIdentity) {
        const loginIdInput = document.getElementById('findPwLoginId');
        const phoneInput = document.getElementById('findPwPhone');
        if (loginIdInput) loginIdInput.value = '';
        if (phoneInput) phoneInput.value = '';
      }
    }

    function openPasswordResetCodeStep() {
      const codeStep = document.getElementById('findPwCodeStep');
      const newStep = document.getElementById('findPwNewStep');
      if (codeStep) codeStep.classList.remove('hidden');
      if (newStep) newStep.classList.add('hidden');
      setTimeout(() => document.getElementById('findPwCode')?.focus(), 80);
    }

    function openPasswordResetNewPasswordStep() {
      const newStep = document.getElementById('findPwNewStep');
      if (newStep) newStep.classList.remove('hidden');
      setTimeout(() => document.getElementById('findPwNew')?.focus(), 80);
    }

    function openAccountFindPanel(mode) {
      const panel = document.getElementById('accountFindPanel');
      const idForm = document.getElementById('findIdForm');
      const pwForm = document.getElementById('findPasswordForm');
      const idTab = document.getElementById('findIdTab');
      const pwTab = document.getElementById('findPasswordTab');
      const result = document.getElementById('accountFindResult');
      const joinBox = document.getElementById('joinChoiceBox');
      const normalizedMode = mode === 'password' ? 'password' : 'id';

      if (joinBox) joinBox.classList.add('hidden');
      if (panel) panel.classList.remove('hidden');
      if (idForm) idForm.classList.toggle('hidden', normalizedMode !== 'id');
      if (pwForm) pwForm.classList.toggle('hidden', normalizedMode !== 'password');
      if (idTab) idTab.classList.toggle('active', normalizedMode === 'id');
      if (pwTab) pwTab.classList.toggle('active', normalizedMode === 'password');
      if (normalizedMode === 'id') resetIdFindSteps(false);
      if (normalizedMode === 'password') resetPasswordResetSteps(false);
      if (result) result.textContent = normalizedMode === 'id'
        ? '가입할 때 입력한 이름/업체명과 휴대폰번호를 입력한 뒤 인증번호를 받아주세요.'
        : '사용자 아이디와 가입 휴대폰번호를 입력한 뒤 인증번호를 받아주세요.';

      setTimeout(() => {
        const focusId = normalizedMode === 'id' ? 'findIdName' : 'findPwLoginId';
        document.getElementById(focusId)?.focus();
      }, 80);
    }

    function closeAccountFindPanel() {
      const panel = document.getElementById('accountFindPanel');
      const result = document.getElementById('accountFindResult');
      if (panel) panel.classList.add('hidden');
      resetIdFindSteps(false);
      resetPasswordResetSteps(false);
      if (result) result.textContent = '아이디 찾기 또는 비밀번호 재설정을 선택해주세요.';
    }

    function normalizePhoneDigits(value) {
      return String(value || '').replace(/[^0-9]/g, '');
    }

    function findMemberByNameAndPhone(name, phone) {
      const nameKey = normalizeLoginText(name).toLowerCase();
      const phoneKey = normalizePhoneDigits(phone);
      if (!nameKey || !phoneKey) return null;
      return getMembers().find(member => {
        const memberName = String(member.name || '').trim().toLowerCase();
        const memberPhone = normalizePhoneDigits(member.phone);
        return memberName === nameKey && memberPhone === phoneKey;
      }) || null;
    }

    function resetIdFindSteps(clearIdentity) {
      idFindVerifyState = { name: '', phone: '', code: '', expiresAt: 0, verified: false, foundLoginId: '', provider: '' };
      const codeStep = document.getElementById('findIdCodeStep');
      const resultStep = document.getElementById('findIdResultStep');
      const codeInput = document.getElementById('findIdCode');
      if (codeStep) codeStep.classList.add('hidden');
      if (resultStep) resultStep.classList.add('hidden');
      if (codeInput) codeInput.value = '';
      if (clearIdentity) {
        const nameInput = document.getElementById('findIdName');
        const phoneInput = document.getElementById('findIdPhone');
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
      }
    }

    function openIdFindCodeStep() {
      const codeStep = document.getElementById('findIdCodeStep');
      const resultStep = document.getElementById('findIdResultStep');
      if (codeStep) codeStep.classList.remove('hidden');
      if (resultStep) resultStep.classList.add('hidden');
      setTimeout(() => document.getElementById('findIdCode')?.focus(), 80);
    }

    function openIdFindResultStep() {
      const resultStep = document.getElementById('findIdResultStep');
      if (resultStep) resultStep.classList.remove('hidden');
    }

    function requestIdFindCodeTest() {
      const name = document.getElementById('findIdName')?.value || '';
      const phone = document.getElementById('findIdPhone')?.value || '';
      const result = document.getElementById('accountFindResult');
      const phoneKey = normalizePhoneDigits(phone);
      const member = findMemberByNameAndPhone(name, phone);

      idFindVerifyState = { name: '', phone: '', code: '', expiresAt: 0, verified: false, foundLoginId: '', provider: '' };
      document.getElementById('findIdCodeStep')?.classList.add('hidden');
      document.getElementById('findIdResultStep')?.classList.add('hidden');

      if (!normalizeLoginText(name) || !phoneKey) {
        if (result) result.textContent = '이름/업체명과 가입 휴대폰번호를 먼저 입력해주세요.';
        return;
      }

      if (!member) {
        if (result) result.textContent = '입력한 정보가 맞다면 인증번호 발송 단계로 진행됩니다.\n테스트 파일에서는 이 휴대폰 브라우저에 저장된 회원정보에서 일치하는 계정을 찾지 못했습니다.';
        return;
      }

      const loginId = member.signupId || member.providerId || member.phone || '';
      const provider = member.signupMethod || member.provider || 'SitePass 가입';
      idFindVerifyState = {
        name: normalizeLoginText(name),
        phone: phoneKey,
        code: '123456',
        expiresAt: Date.now() + (10 * 60 * 1000),
        verified: false,
        foundLoginId: loginId,
        provider
      };
      openIdFindCodeStep();
      if (result) result.textContent = '인증번호를 발송했습니다.\n테스트용 인증번호는 123456입니다. 정식 서비스에서는 문자/PASS 본인확인으로 전송됩니다.';
      alert('[SitePass 아이디 찾기]\n가입 휴대폰으로 인증번호를 보냈습니다.\n임시 인증번호: 123456');
    }

    function verifyIdFindCodeTest() {
      const code = normalizePhoneDigits(document.getElementById('findIdCode')?.value || '');
      const result = document.getElementById('accountFindResult');

      if (!idFindVerifyState.name || !idFindVerifyState.phone) {
        if (result) result.textContent = '먼저 이름/업체명과 휴대폰번호를 입력하고 인증번호를 받아주세요.';
        return;
      }
      if (Date.now() > idFindVerifyState.expiresAt) {
        idFindVerifyState.verified = false;
        if (result) result.textContent = '인증번호 시간이 만료되었습니다. 인증번호를 다시 받아주세요.';
        return;
      }
      if (code !== idFindVerifyState.code) {
        if (result) result.textContent = '인증번호가 맞지 않습니다. 테스트용 번호는 123456입니다.';
        return;
      }

      idFindVerifyState.verified = true;
      openIdFindResultStep();
      if (result) {
        result.textContent = idFindVerifyState.foundLoginId
          ? '휴대폰 인증이 완료되었습니다.\n찾은 사용자 아이디: ' + idFindVerifyState.foundLoginId + '\n가입 방식: ' + idFindVerifyState.provider
          : '휴대폰 인증이 완료되었습니다.\n아이디가 없는 간편로그인 계정입니다.\n가입 방식: ' + idFindVerifyState.provider;
      }
    }

    function fillFoundLoginIdTest() {
      const result = document.getElementById('accountFindResult');
      if (!idFindVerifyState.verified || !idFindVerifyState.foundLoginId) {
        if (result) result.textContent = '아이디를 로그인 칸에 넣기 전에 휴대폰 인증을 먼저 완료해주세요.';
        return;
      }
      const loginInput = document.getElementById('sitepassLoginIdentifier');
      const pwInput = document.getElementById('sitepassLoginPassword');
      const continueButton = document.getElementById('sitepassLoginContinueButton');
      if (loginInput) loginInput.value = idFindVerifyState.foundLoginId;
      if (pwInput) {
        pwInput.classList.remove('hidden');
        pwInput.value = '';
      }
      if (continueButton) continueButton.textContent = '로그인';
      if (result) result.textContent = '찾은 아이디를 로그인 칸에 넣었습니다. 비밀번호를 입력해서 로그인해주세요.';
      setTimeout(() => pwInput?.focus(), 80);
    }

    function findSitePassIdTest() {
      requestIdFindCodeTest();
    }

    function requestPasswordResetCodeTest() {
      const loginId = document.getElementById('findPwLoginId')?.value || '';
      const phone = document.getElementById('findPwPhone')?.value || '';
      const result = document.getElementById('accountFindResult');
      const member = findMemberForLogin(loginId);
      const phoneKey = normalizePhoneDigits(phone);

      passwordResetVerifyState = { loginId: '', phone: '', code: '', expiresAt: 0, verified: false };
      document.getElementById('findPwCodeStep')?.classList.add('hidden');
      document.getElementById('findPwNewStep')?.classList.add('hidden');

      if (!normalizeLoginText(loginId) || !phoneKey) {
        if (result) result.textContent = '사용자 아이디와 가입 휴대폰번호를 먼저 입력해주세요.';
        return;
      }
      if (!member) {
        if (result) result.textContent = '입력한 정보가 맞다면 인증번호 발송 단계로 진행됩니다.\n테스트 파일에서는 이 휴대폰 브라우저에 저장된 회원정보에서 일치하는 아이디를 찾지 못했습니다.';
        return;
      }
      if (!normalizePhoneDigits(member.phone) || normalizePhoneDigits(member.phone) !== phoneKey) {
        if (result) result.textContent = '입력한 정보가 맞다면 인증번호 발송 단계로 진행됩니다.\n테스트 파일에서는 가입 휴대폰번호가 일치하지 않습니다.';
        return;
      }

      passwordResetVerifyState = {
        loginId: normalizeLoginText(loginId),
        phone: phoneKey,
        code: '123456',
        expiresAt: Date.now() + (10 * 60 * 1000),
        verified: false
      };
      openPasswordResetCodeStep();
      if (result) result.textContent = '인증번호를 발송했습니다.\n테스트용 인증번호는 123456입니다. 정식 서비스에서는 문자/PASS 본인확인으로 전송됩니다.';
      alert('[SitePass 비밀번호 재설정]\n가입 휴대폰으로 인증번호를 보냈습니다.\n임시 인증번호: 123456');
    }

    function verifyPasswordResetCodeTest() {
      const code = normalizePhoneDigits(document.getElementById('findPwCode')?.value || '');
      const result = document.getElementById('accountFindResult');

      if (!passwordResetVerifyState.loginId || !passwordResetVerifyState.phone) {
        if (result) result.textContent = '먼저 사용자 아이디와 휴대폰번호를 입력하고 인증번호를 받아주세요.';
        return;
      }
      if (Date.now() > passwordResetVerifyState.expiresAt) {
        passwordResetVerifyState.verified = false;
        if (result) result.textContent = '인증번호 시간이 만료되었습니다. 인증번호를 다시 받아주세요.';
        return;
      }
      if (code !== passwordResetVerifyState.code) {
        if (result) result.textContent = '인증번호가 맞지 않습니다. 테스트용 번호는 123456입니다.';
        return;
      }

      passwordResetVerifyState.verified = true;
      openPasswordResetNewPasswordStep();
      if (result) result.textContent = '휴대폰 인증이 완료되었습니다. 이제 새 비밀번호를 입력해주세요.';
    }

    function resetSitePassPasswordTest() {
      const loginId = document.getElementById('findPwLoginId')?.value || '';
      const phone = document.getElementById('findPwPhone')?.value || '';
      const pw = document.getElementById('findPwNew')?.value || '';
      const pw2 = document.getElementById('findPwNew2')?.value || '';
      const result = document.getElementById('accountFindResult');
      const phoneKey = normalizePhoneDigits(phone);

      if (!passwordResetVerifyState.verified) {
        if (result) result.textContent = '새 비밀번호를 만들기 전에 휴대폰 인증을 먼저 완료해주세요.';
        return;
      }
      if (normalizeLoginText(loginId) !== passwordResetVerifyState.loginId || phoneKey !== passwordResetVerifyState.phone) {
        if (result) result.textContent = '인증받은 아이디/휴대폰번호와 현재 입력값이 다릅니다. 인증번호를 다시 받아주세요.';
        document.getElementById('findPwNewStep')?.classList.add('hidden');
        passwordResetVerifyState.verified = false;
        return;
      }

      const member = findMemberForLogin(loginId);
      if (!member || normalizePhoneDigits(member.phone) !== phoneKey) {
        if (result) result.textContent = '인증된 회원정보를 다시 확인하지 못했습니다. 인증번호를 다시 받아주세요.';
        document.getElementById('findPwNewStep')?.classList.add('hidden');
        passwordResetVerifyState.verified = false;
        return;
      }
      if (!pw || !pw2) {
        if (result) result.textContent = '새 비밀번호와 확인 비밀번호를 입력해주세요.';
        return;
      }
      if (pw.length < 6) {
        if (result) result.textContent = '새 비밀번호는 6자 이상으로 입력해주세요.';
        return;
      }
      if (pw !== pw2) {
        if (result) result.textContent = '새 비밀번호와 확인 비밀번호가 다릅니다.';
        return;
      }

      member.testPassword = pw;
      member.passwordSet = true;
      member.passwordResetAt = new Date().toISOString();
      saveMemberTest(member);

      const loginInput = document.getElementById('sitepassLoginIdentifier');
      const pwInput = document.getElementById('sitepassLoginPassword');
      const continueButton = document.getElementById('sitepassLoginContinueButton');
      if (loginInput) loginInput.value = normalizeLoginText(loginId);
      if (pwInput) {
        pwInput.classList.remove('hidden');
        pwInput.value = '';
      }
      if (continueButton) continueButton.textContent = '로그인';
      passwordResetVerifyState = { loginId: '', phone: '', code: '', expiresAt: 0, verified: false };
      if (result) result.textContent = '비밀번호가 재설정되었습니다.\n위 로그인 칸에서 새 비밀번호로 로그인해주세요.';
    }

    async function submitSitePassLoginTest() {
      const loginInput = document.getElementById('sitepassLoginIdentifier');
      const pwInput = document.getElementById('sitepassLoginPassword');
      const continueButton = document.getElementById('sitepassLoginContinueButton');
      const loginId = normalizeLoginText(loginInput?.value);

      if (!loginId) {
        alert('사용자 아이디를 입력해주세요.');
        return;
      }

      if (pwInput && pwInput.classList.contains('hidden')) {
        pwInput.classList.remove('hidden');
      }
      if (continueButton) continueButton.textContent = '로그인';

      const password = normalizeLoginText(pwInput?.value);
      if (!password) {
        alert('비밀번호를 입력해주세요.');
        pwInput?.focus();
        return;
      }

      const isDesignatedSuperAdminLogin = isSuperAdminLoginId(loginId);
      if (isDesignatedSuperAdminLogin && password === ADMIN_PASSWORD) {
        alert('최고관리자 비상 접속 완료. 관리자 화면으로 이동합니다.');
        completeSuperAdminLogin();
        return;
      }
      if (isDesignatedSuperAdminLogin) {
        const existingSuperAdminMember = findMemberForLogin(loginId);
        if (!existingSuperAdminMember || !existingSuperAdminMember.testPassword || !isMemberPasswordOk(existingSuperAdminMember, password)) {
          alert('최고관리자 비밀번호가 맞지 않습니다.\n처음에는 비상 관리자 비밀번호로 접속하거나, 해당 아이디로 회원가입한 뒤 가입 비밀번호로 로그인해주세요.');
          pwInput?.focus();
          return;
        }
      }

      let member = findMemberForLogin(loginId);
      const mappedRole = getMappedAdminRoleForLogin(loginId);
      let resolvedRole = getLocalAdminRoleForLogin(loginId, member) || mappedRole;

      if (!resolvedRole) {
        resolvedRole = await fetchSupabaseAdminRoleForLogin(loginId);
      }

      if (resolvedRole) {
        if (member && !isMemberPasswordOk(member, password)) {
          alert('권한이 있는 계정입니다. 비밀번호가 맞지 않습니다.');
          pwInput?.focus();
          return;
        }
        if (!member) {
          member = {
            name: loginId,
            phone: '',
            provider: 'SitePass',
            providerId: 'SITEPASS-LOGIN-' + loginId,
            signupId: loginId,
            signupMethod: 'SitePass 로그인',
            testPassword: password,
            adminRole: resolvedRole
          };
        } else {
          member.adminRole = resolvedRole;
        }
        saveMemberTest(member);
        completeMemberAdminLogin(findMemberForLogin(loginId) || member);
        return;
      }

      if (member && member.testPassword && !isMemberPasswordOk(member, password)) {
        alert('비밀번호가 맞지 않습니다.');
        pwInput?.focus();
        return;
      }

      if (!member) {
        member = {
          name: loginId,
          phone: '',
          provider: 'SitePass',
          providerId: 'SITEPASS-LOGIN-' + Date.now(),
          signupId: loginId,
          signupMethod: 'SitePass 로그인',
          testPassword: password
        };
        saveMemberTest(member);
        member = findMemberForLogin(loginId) || member;
      }

      completeMemberLoginTest(member, '로그인이 완료되었습니다.\nSitePass 메인 화면으로 이동합니다.');
    }

    function startJoinFlow() {
      const box = document.getElementById('joinChoiceBox');
      if (!box) return;
      box.classList.remove('hidden');
      box.scrollIntoView({ behavior:'smooth', block:'start' });
    }

    function openLoginHelp() {
      alert('로그인할 수 없으면 SitePass 신규 가입을 이용하거나 회사 문의로 도움을 받을 수 있게 연결할 예정입니다.');
    }

    // v23.7.254: 회원가입 약관 체크/동의값 함수는 assets/js/terms.js로 분리했습니다.

    async function submitSocialLoginTest(provider) {
      const providerLabel = provider === '네이버' ? '네이버 아이디' : provider;
      const providerId = makeStableSocialFallbackId(providerLabel);
      const candidate = {
        name: providerLabel + ' 임시 회원',
        phone: '',
        provider: providerLabel,
        providerId,
        signupMethod: normalizeSignupProviderKey(providerLabel) || providerLabel + ' 계속하기',
        loginOnlyTest: true
      };
      if (findWithdrawnMemberRecord(candidate)) {
        removeWithdrawnMemberRecord(candidate);
        candidate.rejoinConfirmedAt = new Date().toISOString();
        candidate.status = '실사용베타';
        candidate.memberStatus = 'active';
        candidate.plan_type = 'beta';
      }
      if (findWithdrawnMemberRecord(candidate)) {
        removeWithdrawnMemberRecord(candidate);
        candidate.rejoinConfirmedAt = new Date().toISOString();
        candidate.status = '실사용베타';
        candidate.memberStatus = 'active';
        candidate.plan_type = 'beta';
      }
      const existing = findExistingMemberForSocialLogin(candidate);
      if (!existing) {
        const agreements = await showSocialSignupTermsModal(providerLabel);
        if (!agreements) {
          alert('약관 동의가 없어 신규가입을 취소했습니다. 기존 회원이면 같은 계정으로 다시 로그인해주세요.');
          return;
        }
        candidate.agreements = agreements;
        candidate.signupMethod = normalizeSignupProviderKey(providerLabel) || providerLabel + ' 신규가입';
        candidate.createdAt = new Date().toISOString();
      }
      const loginMember = existing ? mergeSocialLoginMember(existing, candidate) : candidate;
      const savedMember = saveMemberTest(loginMember) || loginMember;
      // v23.7.225: Supabase OAuth가 아닌 임시/대체 소셜 흐름도 관리자 회원목록에 보이도록 서버 RPC 저장을 반드시 기다립니다.
      try { await saveMemberToSupabase(savedMember); } catch (serverSaveError) { console.warn('소셜 회원 서버 저장 실패:', serverSaveError); }
      completeMemberLoginTest(savedMember, existing
        ? providerLabel + ' 기존 계정으로 로그인되었습니다.\n새 회원가입으로 다시 만들지 않고 기존 계정을 사용합니다.'
        : providerLabel + ' 신규가입이 완료되었습니다.\n다음부터는 같은 계정으로 로그인만 됩니다.');
    }

    async function submitSocialSignupTest(provider) {
      if (!requireSignupTerms()) return;
      const providerLabel = provider === '네이버' ? '네이버 아이디' : provider;
      const providerId = makeStableSocialFallbackId(providerLabel);
      const candidate = {
        name: providerLabel + ' 임시 회원',
        phone: '',
        provider: providerLabel,
        providerId,
        signupMethod: normalizeSignupProviderKey(providerLabel) || providerLabel + ' 로그인/회원가입',
        agreements: getSignupAgreements()
      };
      const existing = findExistingMemberForSocialLogin(candidate);
      const loginMember = existing ? mergeSocialLoginMember(existing, candidate) : candidate;
      const savedMember = saveMemberTest(loginMember) || loginMember;
      // v23.7.225: Supabase OAuth가 아닌 임시/대체 소셜 흐름도 관리자 회원목록에 보이도록 서버 RPC 저장을 반드시 기다립니다.
      try { await saveMemberToSupabase(savedMember); } catch (serverSaveError) { console.warn('소셜 회원 서버 저장 실패:', serverSaveError); }
      completeMemberLoginTest(savedMember, existing
        ? providerLabel + ' 기존 계정으로 로그인되었습니다.\n이미 가입된 계정이라 새로 생성하지 않았습니다.'
        : providerLabel + '로 회원가입이 완료되었습니다.\n다음부터는 같은 계정으로 로그인만 됩니다.');
    }

    function openSitePassSignup() {
      const joinBox = document.getElementById('joinChoiceBox');
      if (joinBox) joinBox.classList.remove('hidden');
      if (!requireSignupTerms()) {
        document.querySelector('.terms-box')?.scrollIntoView({ behavior:'smooth', block:'start' });
        return;
      }
      const box = document.getElementById('sitepassSignupBox');
      if (box) box.classList.remove('hidden');
      resetSitePassSignupIdDuplicate();
      setTimeout(() => document.getElementById('sitepassSignupName')?.focus(), 80);
    }

    function parseSitePassSignupJumin() {
      const raw = (document.getElementById('sitepassSignupJuminMasked')?.value || '').trim();
      const fallbackBirth = (document.getElementById('sitepassSignupBirth6')?.value || '').trim();
      const fallbackGender = (document.getElementById('sitepassSignupGenderDigit')?.value || '').trim();
      const digits = raw.replace(/\D/g, '');
      const birth6 = (digits.slice(0, 6) || fallbackBirth).trim();
      const genderDigit = (digits.slice(6, 7) || fallbackGender).trim();
      return {
        raw,
        birth6,
        genderDigit,
        masked: birth6 && genderDigit ? birth6 + '-' + genderDigit + '******' : raw
      };
    }

    function limitJuminInputToBirthAndGender(input) {
      if (!input) return;
      const digits = String(input.value || '').replace(/\D/g, '').slice(0, 7);
      if (digits.length > 6) {
        input.value = digits.slice(0, 6) + '-' + digits.slice(6, 7);
      } else {
        input.value = digits;
      }
    }

    function limitSitePassSignupJuminInput() {
      const input = document.getElementById('sitepassSignupJuminMasked');
      limitJuminInputToBirthAndGender(input);
      resetSitePassSignupPhoneAuth();
    }

    function formatSitePassSignupJuminDisplay() {
      const input = document.getElementById('sitepassSignupJuminMasked');
      if (!input) return;
      const parsed = parseSitePassSignupJumin();
      if (/^\d{6}$/.test(parsed.birth6) && /^[1-8]$/.test(parsed.genderDigit)) {
        input.value = parsed.birth6 + '-' + parsed.genderDigit + '******';
      }
    }


    // v23.7.281 - 주민번호 입력칸 공통 보정
    // 모바일/PC에서 붙여넣기 또는 빠른 입력 시 8405071111111처럼 길게 남는 것을 막고
    // 항상 앞 6자리 + 뒷자리 첫 숫자까지만 840507-1 형식으로 제한합니다.
    function setupJuminLimitDelegates() {
      if (window.__sitePassJuminLimitDelegates) return;
      window.__sitePassJuminLimitDelegates = true;
      document.addEventListener('input', function(event) {
        const input = event.target;
        if (!input || !input.matches) return;
        if (input.matches('#sitepassSignupJuminMasked, [data-person-auth-jumin], #paymentOwnerJuminMasked')) {
          limitJuminInputToBirthAndGender(input);
        }
      }, true);
      document.addEventListener('blur', function(event) {
        const input = event.target;
        if (!input || !input.matches) return;
        if (input.matches('#sitepassSignupJuminMasked, [data-person-auth-jumin], #paymentOwnerJuminMasked')) {
          const parsed = parseMaskedJuminText(input.value, '', '');
          if (/^\d{6}$/.test(parsed.birth6) && /^[1-8]$/.test(parsed.genderDigit)) {
            input.value = parsed.birth6 + '-' + parsed.genderDigit + '******';
          }
        }
      }, true);
    }

    function getSitePassSignupIdentity() {
      const jumin = parseSitePassSignupJumin();
      return {
        name: (document.getElementById('sitepassSignupName')?.value || '').trim(),
        phone: (document.getElementById('sitepassSignupPhone')?.value || '').trim(),
        birth6: jumin.birth6,
        genderDigit: jumin.genderDigit,
        juminMasked: jumin.masked,
        carrier: (document.getElementById('sitepassSignupCarrier')?.value || '').trim()
      };
    }

    function resetSitePassSignupPhoneAuth() {
      sitepassSignupPhoneVerified = false;
      sitepassSignupPhoneRequestSent = false;
      const codeBox = document.getElementById('sitepassSignupCodeBox');
      if (codeBox) codeBox.classList.add('hidden');
      const codeInput = document.getElementById('sitepassSignupCode');
      if (codeInput) codeInput.value = '';
      const requestButton = document.getElementById('sitepassSignupRequestButton');
      if (requestButton) requestButton.textContent = '인증요청';
      const status = document.getElementById('sitepassSignupVerifyStatus');
      if (status) status.textContent = '이름, 주민번호, 휴대폰번호, 통신사를 입력한 뒤 인증요청을 눌러주세요. 주민번호는 840507-1까지만 입력하면 840507-1******로 표시됩니다. 임시 인증번호는 123456입니다.';
    }

    function findMemberBySignupPhone(phone) {
      const phoneKey = normalizePhoneDigits(phone);
      if (!phoneKey) return null;
      return getMembers().find(member => normalizePhoneDigits(member.phone) === phoneKey) || null;
    }

    function findMemberBySignupIdOnly(signupId) {
      const key = normalizeLoginText(signupId).toLowerCase();
      if (!key) return null;
      return getMembers().find(member => {
        const signupKey = normalizeLoginText(member.signupId).toLowerCase();
        const providerKey = normalizeLoginText(member.providerId).toLowerCase();
        const idKey = normalizeLoginText(member.id).toLowerCase();
        return signupKey === key || providerKey === key || idKey === key;
      }) || null;
    }

    function openIdFindForExistingPhone(phone, name) {
      const signupBox = document.getElementById('sitepassSignupBox');
      if (signupBox) signupBox.classList.add('hidden');
      const joinBox = document.getElementById('joinChoiceBox');
      if (joinBox) joinBox.classList.add('hidden');
      openAccountFindPanel('id');
      const idName = document.getElementById('findIdName');
      const idPhone = document.getElementById('findIdPhone');
      if (idName) idName.value = name || '';
      if (idPhone) idPhone.value = phone || '';
      const result = document.getElementById('accountFindResult');
      if (result) {
        result.textContent = '이미 등록된 휴대폰번호입니다. 기존 계정의 사용자 아이디를 찾으려면 이름/업체명과 휴대폰번호를 확인한 뒤 인증번호 받기를 눌러주세요.';
      }
      setTimeout(() => {
        if (idName && !idName.value) idName.focus();
        else if (idPhone) idPhone.focus();
      }, 120);
    }

    function resetSitePassSignupIdDuplicate() {
      sitepassSignupIdVerified = false;
      sitepassSignupIdVerifiedValue = '';
      const status = document.getElementById('sitepassSignupIdStatus');
      if (status) status.textContent = '아이디 입력 후 중복확인을 눌러주세요.';
    }

    function checkSitePassSignupIdDuplicate() {
      const input = document.getElementById('sitepassSignupId');
      const signupId = input?.value || '';
      const key = normalizeLoginText(signupId);
      if (!key) return false;
      const existing = findMemberBySignupIdOnly(key) || findMemberForLogin(key);
      if (existing) {
        const status = document.getElementById('sitepassSignupIdStatus');
        if (status) status.textContent = '이미 등록된 아이디입니다. 다른 아이디를 입력해주세요.';
        alert('이미 등록된 사용자 아이디가 있습니다. 다른 아이디를 입력해주세요.\n기존 계정이 본인 계정이면 아이디 찾기 또는 비밀번호 찾기를 이용해주세요.');
        setTimeout(() => input?.focus(), 80);
        return true;
      }
      return false;
    }

    function verifySitePassSignupIdDuplicate() {
      const input = document.getElementById('sitepassSignupId');
      const signupId = (input?.value || '').trim();
      const key = normalizeLoginText(signupId);
      const status = document.getElementById('sitepassSignupIdStatus');
      sitepassSignupIdVerified = false;
      sitepassSignupIdVerifiedValue = '';
      if (!key) {
        alert('사용할 SitePass 아이디를 먼저 입력해주세요.');
        input?.focus();
        return false;
      }
      if (signupId.length < 4) {
        alert('SitePass 아이디는 4자 이상으로 입력해주세요.');
        input?.focus();
        return false;
      }
      if (checkSitePassSignupIdDuplicate()) return false;
      sitepassSignupIdVerified = true;
      sitepassSignupIdVerifiedValue = key;
      if (status) status.textContent = '사용 가능한 아이디입니다. 이 아이디로 가입할 수 있습니다.';
      alert('사용 가능한 아이디입니다.');
      return true;
    }

    function checkSitePassSignupPhoneDuplicateAndMove(phone, name) {
      const existing = findMemberBySignupPhone(phone);
      if (!existing) return false;
      alert('이미 등록된 휴대폰번호가 있습니다.\n새로 가입하지 말고 아이디 찾기로 이동해서 기존 계정을 확인해주세요.');
      openIdFindForExistingPhone(phone, name || existing.name || '');
      return true;
    }

    function sendSitePassSignupPhoneCodeTest() {
      if (!requireSignupTerms()) return;
      formatSitePassSignupJuminDisplay();
      const identity = getSitePassSignupIdentity();
      if (!identity.name || !identity.phone || !identity.birth6 || !identity.genderDigit || !identity.carrier) {
        alert('이름/업체명, 주민번호, 휴대폰번호, 통신사를 먼저 입력해주세요.');
        return;
      }
      if (!/^\d{6}$/.test(identity.birth6) || !/^[1-8]$/.test(identity.genderDigit)) {
        alert('주민번호는 840507-1까지만 입력해주세요. 저장/표시는 840507-1******로 처리됩니다.');
        return;
      }
      if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(identity.phone)) {
        alert('휴대폰번호 형식을 확인해주세요. 예: 010-0000-0000');
        return;
      }
      if (checkSitePassSignupPhoneDuplicateAndMove(identity.phone, identity.name)) return;
      sitepassSignupPhoneRequestSent = true;
      sitepassSignupPhoneVerified = false;
      const codeBox = document.getElementById('sitepassSignupCodeBox');
      if (codeBox) codeBox.classList.remove('hidden');
      const requestButton = document.getElementById('sitepassSignupRequestButton');
      if (requestButton) requestButton.textContent = '인증번호 재전송';
      const status = document.getElementById('sitepassSignupVerifyStatus');
      if (status) status.textContent = identity.carrier + ' 본인확인 문자 발송 완료. 이름·주민번호·휴대폰번호 일치 확인 후 임시 인증번호 123456을 입력해주세요.';
      const codeInput = document.getElementById('sitepassSignupCode');
      if (codeInput) setTimeout(() => codeInput.focus(), 80);
      alert('[SitePass 인증]\n' + identity.name + '님 휴대폰으로 6자리 인증번호를 보냈습니다.\n임시 인증번호: 123456\n\n정식 서비스에서는 통신사/PASS 본인확인 API로 이름·주민번호·전화번호·통신사 일치 여부를 확인합니다.');
    }

    function confirmSitePassSignupPhoneCodeTest() {
      if (!sitepassSignupPhoneRequestSent) {
        alert('먼저 인증요청을 눌러주세요.');
        return;
      }
      const code = (document.getElementById('sitepassSignupCode')?.value || '').trim();
      if (code !== '123456') {
        alert('인증번호가 맞지 않습니다. 임시 번호는 123456입니다.');
        return;
      }
      sitepassSignupPhoneVerified = true;
      const identity = getSitePassSignupIdentity();
      const status = document.getElementById('sitepassSignupVerifyStatus');
      if (status) status.textContent = '본인확인 완료: ' + identity.name + ' / ' + identity.juminMasked + ' / ' + identity.carrier + ' / ' + identity.phone;
      const codeBox = document.getElementById('sitepassSignupCodeBox');
      if (codeBox) codeBox.classList.add('hidden');
      alert('휴대폰 본인확인이 완료되었습니다. 이제 SitePass 회원가입을 완료할 수 있습니다.');
    }

    function submitSitePassSignupTest() {
      if (!requireSignupTerms()) return;
      formatSitePassSignupJuminDisplay();
      const identity = getSitePassSignupIdentity();
      const name = identity.name;
      const phone = identity.phone;
      const carrier = identity.carrier;
      const birth6 = identity.birth6;
      const genderDigit = identity.genderDigit;
      const signupId = (document.getElementById('sitepassSignupId')?.value || '').trim();
      const pw = (document.getElementById('sitepassSignupPw')?.value || '').trim();
      const pw2 = (document.getElementById('sitepassSignupPw2')?.value || '').trim();
      if (!name || !phone || !birth6 || !genderDigit || !carrier || !signupId || !pw || !pw2) {
        alert('이름/업체명, 주민번호, 휴대폰번호, 통신사, SitePass 아이디, 비밀번호를 모두 입력해주세요.');
        return;
      }
      if (!/^\d{6}$/.test(birth6) || !/^[1-8]$/.test(genderDigit)) {
        alert('주민번호는 840507-1까지만 입력해주세요. 저장/표시는 840507-1******로 처리됩니다.');
        return;
      }
      if (!sitepassSignupPhoneVerified) {
        alert('SitePass 회원가입은 휴대폰 본인확인 후 완료할 수 있습니다. 인증요청 후 6자리 인증번호를 확인해주세요.');
        return;
      }
      if (signupId.length < 4) {
        alert('SitePass 아이디는 4자 이상으로 입력해주세요.');
        document.getElementById('sitepassSignupId')?.focus();
        return;
      }
      const signupIdKey = normalizeLoginText(signupId);
      if (!sitepassSignupIdVerified || sitepassSignupIdVerifiedValue !== signupIdKey) {
        alert('SitePass 아이디 중복확인을 먼저 완료해주세요.');
        document.getElementById('sitepassSignupId')?.focus();
        return;
      }
      if (findMemberBySignupIdOnly(signupId) || findMemberForLogin(signupId)) {
        sitepassSignupIdVerified = false;
        sitepassSignupIdVerifiedValue = '';
        const status = document.getElementById('sitepassSignupIdStatus');
        if (status) status.textContent = '이미 등록된 아이디입니다. 다른 아이디를 입력해주세요.';
        alert('이미 등록된 사용자 아이디가 있습니다. 다른 아이디를 입력해주세요.\n기존 계정이 본인 계정이면 아이디 찾기 또는 비밀번호 찾기를 이용해주세요.');
        document.getElementById('sitepassSignupId')?.focus();
        return;
      }
      if (checkSitePassSignupPhoneDuplicateAndMove(phone, name)) return;
      if (pw.length < 6) {
        alert('비밀번호는 6자 이상으로 입력해주세요.');
        return;
      }
      if (pw !== pw2) {
        alert('비밀번호와 비밀번호 확인이 다릅니다.');
        return;
      }
      const member = {
        name,
        phone,
        carrier,
        birth6,
        genderDigit,
        juminMasked: birth6 + '-' + genderDigit + '******',
        identityVerified:true,
        identityVerifiedAt:new Date().toISOString(),
        phoneVerified:true,
        phoneVerifiedAt: new Date().toISOString(),
        provider:'SitePass',
        providerId:'SITEPASS-' + signupId,
        signupId,
        passwordSet:true,
        testPassword: pw,
        signupMethod:'SitePass 회원가입',
        agreements:getSignupAgreements()
      };
      saveMemberTest(member);
      completeMemberLoginTest(member, 'SitePass 회원가입이 완료되었습니다.\n이제 SitePass 메인 화면으로 이동합니다.\n정식 서비스에서는 통신사 본인확인 결과값을 서버에 저장합니다.');
      ['sitepassSignupName','sitepassSignupPhone','sitepassSignupJuminMasked','sitepassSignupBirth6','sitepassSignupGenderDigit','sitepassSignupCarrier','sitepassSignupCode','sitepassSignupId','sitepassSignupPw','sitepassSignupPw2'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
      });
      resetSitePassSignupPhoneAuth();
      resetSitePassSignupIdDuplicate();
      showScreen('homeScreen');
    }

    function getContacts() {
      const storage = getStorageModule();
      if (storage.getList) return storage.getList(CONTACT_STORAGE_KEY);
      try { return JSON.parse(localStorage.getItem(CONTACT_STORAGE_KEY) || '[]'); } catch (error) { return []; }
    }

    function setContacts(list) {
      const storage = getStorageModule();
      if (storage.setList) return storage.setList(CONTACT_STORAGE_KEY, list || []);
      localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(list || []));
    }


    function openCompanyKakaoInquiry() {
      if (COMPANY_KAKAO_CHANNEL_URL) {
        window.open(COMPANY_KAKAO_CHANNEL_URL, '_blank');
        return;
      }
      alert('아직 실제 카카오톡 채널 URL은 연결하지 않은 임시 버튼입니다.\n제이에스건설 카카오톡 채널을 만든 뒤 채널 URL을 넣으면 이 버튼에서 바로 채널추가/1:1 문의로 연결됩니다.');
    }

    function copyCompanyKakaoName() {
      const text = COMPANY_KAKAO_CHANNEL_NAME + ' 카카오톡 채널';
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => alert('채널명이 복사되었습니다.\n' + text)).catch(() => alert(text));
      } else {
        alert(text);
      }
    }

    function submitContactTest() {
      const name = (document.getElementById('contactName')?.value || '').trim();
      const phone = (document.getElementById('contactPhone')?.value || '').trim();
      const type = (document.getElementById('contactType')?.value || '').trim();
      const message = (document.getElementById('contactMessage')?.value || '').trim();
      if (!name || !phone || !message) {
        alert('이름/업체명, 연락처, 문의 내용을 입력해주세요.');
        return;
      }
      const contacts = getContacts();
      contacts.unshift({
        id:'Q' + Date.now() + '_' + Math.random().toString(36).slice(2, 6).toUpperCase(),
        name,
        phone,
        type,
        message,
        reply:'',
        status:'답변대기',
        createdAt:new Date().toISOString(),
        repliedAt:''
      });
      setContacts(contacts);
      alert('문의가 접수되었습니다.\n관리자모드에서 문의 내용을 확인하고 답변할 수 있습니다.');
      document.getElementById('contactMessage').value = '';
      renderContactHistory();
    }

    function renderContactHistory() {
      const box = document.getElementById('contactHistoryBox');
      if (!box) return;
      const contacts = getContacts();
      if (!contacts.length) {
        box.innerHTML = '<div class="card" style="box-shadow:none;margin-bottom:0;"><h3>내 문의 확인</h3><div class="empty">아직 접수된 문의가 없습니다.</div></div>';
        return;
      }
      const rows = contacts.map(item => {
        const statusClass = item.status === '답변완료' ? 'done' : 'need';
        const replyHtml = item.reply
          ? '<div class="notice blue-note"><b>관리자 답변</b><br>' + escapeHtml(item.reply).replace(/\n/g, '<br>') + '<div class="small" style="margin-top:8px;">답변일: ' + escapeHtml(formatDateTime(item.repliedAt)) + '</div></div>'
          : '<div class="date-note">아직 관리자 답변이 없습니다.</div>';
        return '<div class="list-item">' +
          '<div class="doc-head"><div><strong>' + escapeHtml(item.type || '문의') + '</strong><div class="small">' + escapeHtml(formatDateTime(item.createdAt)) + ' · ' + escapeHtml(item.name || '') + '</div></div><span class="badge ' + statusClass + '">' + escapeHtml(item.status || '답변대기') + '</span></div>' +
          '<div class="date-note">' + escapeHtml(item.message || '').replace(/\n/g, '<br>') + '</div>' + replyHtml +
        '</div>';
      }).join('');
      box.innerHTML = '<div class="card" style="box-shadow:none;margin-bottom:0;"><h3>내 문의 확인</h3>' + rows + '</div>';
    }

    function formatDateTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return y + '-' + m + '-' + day + ' ' + hh + ':' + mm;
    }

    function renderAdminContactManager() {
      const contacts = getContacts();
      const waiting = contacts.filter(x => x.status !== '답변완료').length;
      if (!contacts.length) {
        return '<div class="card" style="box-shadow:none;margin-top:14px;"><h3>문의관리</h3><div class="notice blue-note">관리자는 제이에스건설 회사 계정으로 운영하고, 정식 서비스에서는 앱 문의와 회사 카카오톡 채널 문의를 같이 확인하는 구조로 연결합니다.</div><div class="empty">접수된 문의가 없습니다.</div></div>';
      }
      const rows = contacts.map(item => {
        const statusClass = item.status === '답변완료' ? 'done' : 'need';
        return '<div class="list-item" data-contact-id="' + escapeHtml(item.id) + '">' +
          '<div class="doc-head"><div><strong>' + escapeHtml(item.type || '문의') + ' · ' + escapeHtml(item.name || '') + '</strong><div class="small">연락처: ' + escapeHtml(item.phone || '') + '<br>접수일: ' + escapeHtml(formatDateTime(item.createdAt)) + '</div></div><span class="badge ' + statusClass + '">' + escapeHtml(item.status || '답변대기') + '</span></div>' +
          '<div class="date-note"><b>문의내용</b><br>' + escapeHtml(item.message || '').replace(/\n/g, '<br>') + '</div>' +
          '<div class="field" style="margin-top:10px;"><label>관리자 답변</label><textarea id="reply_' + escapeHtml(item.id) + '" rows="4" style="min-height:96px; resize:vertical;" placeholder="답변 내용을 입력하세요.">' + escapeHtml(item.reply || '') + '</textarea></div>' +
          '<div class="actions"><button class="primary" onclick="saveContactReply(\'' + escapeJs(item.id) + '\')">답변 저장</button><button class="okBtn" onclick="markContactDone(\'' + escapeJs(item.id) + '\')">처리완료</button><button class="dangerBtn" onclick="deleteContact(\'' + escapeJs(item.id) + '\')">문의 삭제</button></div>' +
        '</div>';
      }).join('');
      return '<div id="adminContactManagerCard" class="card" style="box-shadow:none;margin-top:14px;"><h3>문의관리</h3><div class="notice blue-note">관리자는 제이에스건설 회사 계정으로 운영합니다. 정식 서비스에서는 회사 카카오톡 채널 1:1 채팅 문의도 이 관리자 문의관리와 연결하는 방향입니다.</div><div class="line"><b>답변대기</b><span>' + waiting + '건</span></div>' + rows + '</div>';
    }

    function saveContactReply(id) {
      const contacts = getContacts();
      const target = contacts.find(x => x.id === id);
      if (!target) return;
      const reply = (document.getElementById('reply_' + id)?.value || '').trim();
      if (!reply) {
        alert('답변 내용을 입력해주세요.');
        return;
      }
      target.reply = reply;
      target.status = '답변완료';
      target.repliedAt = new Date().toISOString();
      setContacts(contacts);
      alert('답변이 저장되었습니다.');
      renderAdmin();
    }

    function markContactDone(id) {
      const contacts = getContacts();
      const target = contacts.find(x => x.id === id);
      if (!target) return;
      if (!target.reply) {
        const ok = confirm('답변 내용 없이 처리완료로 표시할까요?');
        if (!ok) return;
      }
      target.status = '답변완료';
      target.repliedAt = target.repliedAt || new Date().toISOString();
      setContacts(contacts);
      renderAdmin();
    }

    function deleteContact(id) {
      if (!confirm('이 문의를 삭제할까요?')) return;
      setContacts(getContacts().filter(x => x.id !== id));
      renderAdmin();
    }

    let sitePassCurrentScreenId = '';
    let sitePassHistoryReady = false;
    let sitePassHandlingPopState = false;

    function isSitePassHashRouteActive() {
      const hash = window.location.hash || '';
      return hash.startsWith('#pay=') || hash.startsWith('#manager=') || hash.startsWith('#qr=');
    }

    function rememberSitePassScreen(id, options) {
      if (!id || !window.history || !window.history.replaceState) return;
      if (sitePassHandlingPopState || isSitePassHashRouteActive()) return;
      const state = { sitepassScreen: id };
      const title = document.title || 'SitePass';
      try {
        if (!sitePassHistoryReady || (options && options.replace)) {
          window.history.replaceState(state, title, window.location.pathname + window.location.search);
          sitePassHistoryReady = true;
          return;
        }
        if (sitePassCurrentScreenId && sitePassCurrentScreenId !== id) {
          window.history.pushState(state, title, window.location.pathname + window.location.search);
        } else if (!window.history.state || !window.history.state.sitepassScreen) {
          window.history.replaceState(state, title, window.location.pathname + window.location.search);
        }
      } catch (e) {}
    }

    function showScreen(id, options) {
      if (sitePassCurrentScreenId === 'registerScreen' && id !== 'registerScreen') saveRegistrationDraftNow();
      const memberProtectedScreens = ['homeScreen','usageGuideScreen','registerScreen','listScreen','pricingScreen','contactScreen','detailScreen'];
      if (memberProtectedScreens.includes(id) && !isMemberLoggedIn() && !isAdminLoggedIn()) {
        id = 'signupScreen';
      }
      if (id === 'adminScreen' && !isAdminLoggedIn()) {
        id = 'signupScreen';
      }
      const managerOnlyScreens = ['managerAccessScreen', 'managerPrintScreen', 'publicScreen'];
      document.body.classList.toggle('manager-view-mode', managerOnlyScreens.includes(id));
      document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
      const target = document.getElementById(id);
      if (target) target.classList.remove('hidden');
      // v23.7.216: 새로고침 때 로그인창이 먼저 보였다가 사라지는 깜빡임 방지.
      // 세션/소셜 콜백 확인이 끝난 뒤 최종 화면을 정한 다음에만 화면을 공개합니다.
      document.body.classList.remove('sitepass-booting');
      if (id === 'homeScreen') updateHomeRegistrationButton();
      if (id === 'installScreen') updateHomeInstallButtonState();
      if (id === 'listScreen') renderList();
      if (id === 'pricingScreen') renderPricingScreen();
      if (id === 'registerScreen') { const docBox = document.getElementById('docCards'); if (docBox && !docBox.innerHTML.trim()) renderDocCards(); renderAlertPreview(); renderBundleSummary(); updateRegisterModeUi(); updateRegistrationDraftNotice(); }
      if (id === 'adminScreen') { renderAdmin(); setTimeout(() => syncSupabaseMembersForAdmin(false), 80); }
      if (id === 'contactScreen') renderContactHistory();
      if (id === 'signupScreen') {
        const box = document.getElementById('sitepassSignupBox');
        if (box) box.classList.add('hidden');
        const joinBox = document.getElementById('joinChoiceBox');
        if (joinBox) joinBox.classList.add('hidden');
        const pwInput = document.getElementById('sitepassLoginPassword');
        // v23.7.216: 로그인 첫화면을 다시 그릴 때 브라우저가 채운 저장 비밀번호를 지우지 않습니다.
        if (pwInput) { pwInput.classList.remove('hidden'); }
        const continueButton = document.getElementById('sitepassLoginContinueButton');
        if (continueButton) continueButton.textContent = '로그인';
        document.body.classList.remove('quick-first-mode', 'show-normal-login');
        resetSitePassSignupPhoneAuth();
        setTimeout(stabilizeLoginAutofillFields, 60);
      }
      if (id === 'managerAccessScreen') { setTimeout(() => document.getElementById('managerCodeInput')?.focus(), 80); }
      refreshAdminUi();
      rememberSitePassScreen(id, options || {});
      sitePassCurrentScreenId = id;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function isAdminLoggedIn() {
      return getSessionValue(ADMIN_SESSION_KEY) === 'yes';
    }

    function openHomeContactOrAdmin() {
      if (isAdminLoggedIn()) {
        showScreen('adminScreen');
      } else {
        showScreen('contactScreen');
      }
    }

    function refreshAdminUi() {
      const loggedIn = isAdminLoggedIn();
      document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !loggedIn));
      const statePill = document.getElementById('adminStatePill');
      const signupTopButton = document.getElementById('signupTopButton');
      const logoutButton = document.getElementById('adminLogoutButton');
      const accountBtn = document.getElementById('myAccountButton');
      const homeBtn = document.getElementById('memberHomeButton');
      if (statePill) { statePill.textContent = loggedIn ? getCurrentAdminRoleName() : '관리자모드'; statePill.classList.toggle('hidden', !loggedIn); }
      if (signupTopButton) signupTopButton.classList.toggle('hidden', loggedIn);
      if (logoutButton) logoutButton.classList.toggle('hidden', !loggedIn);
      if (accountBtn) accountBtn.classList.toggle('hidden', !(loggedIn || isMemberLoggedIn()));
      if (homeBtn) homeBtn.classList.toggle('hidden', !(loggedIn || isMemberLoggedIn()));
    }

    async function adminLogin() {
      const id = normalizeLoginText(document.getElementById('adminIdInput')?.value || document.getElementById('sitepassLoginIdentifier')?.value);
      const pw = normalizeLoginText(document.getElementById('adminPwInput')?.value || document.getElementById('sitepassLoginPassword')?.value);
      if (isSuperAdminLoginId(id) && pw === ADMIN_PASSWORD) {
        alert('최고관리자 비상 접속 완료. 관리자 화면으로 이동합니다.');
        completeSuperAdminLogin();
        return;
      }
      const member = findMemberForLogin(id);
      const mappedRole = getMappedAdminRoleForLogin(id);
      let resolvedRole = getLocalAdminRoleForLogin(id, member) || mappedRole;
      if (!resolvedRole) resolvedRole = await fetchSupabaseAdminRoleForLogin(id);
      if (resolvedRole && (!member || isMemberPasswordOk(member, pw))) {
        if (member) {
          member.adminRole = resolvedRole;
          saveMemberTest(member);
        }
        completeAdminLogin(resolvedRole, id, member?.name || id);
        return;
      }
      alert('계정 또는 비밀번호가 맞지 않습니다.');
    }

    function adminLogout() {
      removeSessionValue(ADMIN_SESSION_KEY);
      removeSessionValue(ADMIN_SESSION_KEY + '_role');
      removeSessionValue(ADMIN_SESSION_KEY + '_id');
      removeSessionValue(ADMIN_SESSION_KEY + '_name');
      clearPwaAutoMemberTest();
      refreshAdminUi();
      alert('로그아웃했습니다.');
      showScreen('signupScreen');
    }

    function notReady(name) {
      alert(name + ' 화면은 다음 단계에서 장비서류와 분리된 코드로 붙입니다. 지금은 장비서류 등록·QR공유·요금/관리자 흐름을 먼저 고정합니다.');
    }

    function isPrivateDocCard(card) {
      if (!card) return false;
      const groupKey = card.dataset.groupKey || 'equipment';
      return groupKey === 'driver' || groupKey === 'worker';
    }

    function isPrivateDocAuthVerified(card) {
      if (!isPrivateDocCard(card)) return true;
      return card.dataset.authVerified === 'true';
    }

    function getPrivateDocLockTargetText(card) {
      const groupKey = card?.dataset?.groupKey || '';
      if (groupKey === 'driver') return '기사 본인 동의/인증을 먼저 완료하면 기사서류 전체가 열립니다.';
      if (groupKey === 'worker') return '인부는 1명마다 동의/인증을 먼저 완료한 뒤 추가해야 서류 업로드가 열립니다.';
      return '인증 완료 후 파일선택/사진찍기를 사용할 수 있습니다.';
    }

    function requirePrivateDocAuth(card) {
      if (!isPrivateDocCard(card) || isPrivateDocAuthVerified(card)) return true;
      const title = card.dataset.docTitle || '개인정보 서류';
      alert(title + '는 6자리 인증 전에는 파일선택/사진찍기를 사용할 수 없습니다.\n' + getPrivateDocLockTargetText(card) + '\n현재 임시 6자리 번호는 123456입니다.');
      const groupKey = card.dataset.groupKey || '';
      const panel = groupKey === 'driver'
        ? document.querySelector('[data-person-auth-panel="driver"]')
        : card.closest('.worker-person-card') || document.querySelector('[data-person-auth-panel="worker"]');
      if (panel) panel.scrollIntoView({ behavior:'smooth', block:'center' });
      return false;
    }

    function setDocCardAuthVerified(card, meta = {}) {
      if (!card) return;
      card.dataset.authVerified = 'true';
      card.dataset.authVerifiedAt = meta.verifiedAt || new Date().toISOString();
      if (meta.phone) card.dataset.authPhone = meta.phone;
      if (meta.personName) card.dataset.authPersonName = meta.personName;
      if (meta.carrier) card.dataset.authCarrier = meta.carrier;
      if (meta.birth6) card.dataset.authBirth6 = meta.birth6;
      if (meta.genderDigit) card.dataset.authGenderDigit = meta.genderDigit;
      unlockPrivateDocUpload(card);
    }

    function unlockPrivateDocUpload(card) {
      if (!card) return;
      card.querySelectorAll('input[type="file"]').forEach(input => { input.disabled = false; input.classList.remove('auth-locked'); });
      card.querySelectorAll('[data-upload-label], .camera-launch').forEach(el => { el.classList.remove('auth-locked', 'disabled'); if (el.tagName === 'BUTTON') el.disabled = false; });
      const panel = card.querySelector('[data-auth-panel]');
      if (panel) panel.classList.add('verified');
      const title = card.querySelector('[data-auth-title-status]');
      if (title) title.textContent = '인증완료';
      const status = card.querySelector('[data-auth-status]');
      const phone = card.dataset.authPhone || '';
      if (status) status.textContent = '인증완료 · 파일선택과 사진찍기가 열립니다.' + (phone ? ' 확인번호: ' + phone : '');
      card.querySelectorAll('[data-auth-phone-input], [data-auth-code-input]').forEach(input => { input.disabled = true; });
      card.querySelectorAll('[data-auth-send-button], [data-auth-verify-button]').forEach(btn => { btn.disabled = true; });
    }

    function refreshPrivateDocLocks(root) {
      const target = root || document;
      target.querySelectorAll('.doc-card').forEach(card => {
        if (!isPrivateDocCard(card)) return;
        if (isPrivateDocAuthVerified(card)) { unlockPrivateDocUpload(card); return; }
        card.querySelectorAll('input[type="file"]').forEach(input => { input.disabled = true; input.classList.add('auth-locked'); });
        card.querySelectorAll('[data-upload-label], .camera-launch').forEach(el => { el.classList.add('auth-locked'); if (el.tagName === 'BUTTON') el.disabled = true; });
      });
    }

    function parseMaskedJuminText(raw, fallbackBirth, fallbackGender) {
      const personAuth = getPersonAuthModule();
      if (personAuth.parseMaskedJuminText) return personAuth.parseMaskedJuminText(raw, fallbackBirth, fallbackGender);
      const digits = String(raw || '').replace(/\D/g, '');
      const birth6 = (digits.slice(0, 6) || String(fallbackBirth || '')).trim();
      const genderDigit = (digits.slice(6, 7) || String(fallbackGender || '')).trim();
      return {
        birth6,
        genderDigit,
        masked: birth6 && genderDigit ? birth6 + '-' + genderDigit + '******' : String(raw || '').trim()
      };
    }

    function formatPersonAuthJuminTyping(input) {
      limitJuminInputToBirthAndGender(input);
    }

    function formatPersonAuthJuminDisplay(input) {
      if (!input) return;
      const parsed = parseMaskedJuminText(input.value, '', '');
      if (/^\d{6}$/.test(parsed.birth6) && /^[1-8]$/.test(parsed.genderDigit)) {
        input.value = parsed.birth6 + '-' + parsed.genderDigit + '******';
      }
    }

    function getPersonAuthValues(kind) {
      const panel = document.querySelector('[data-person-auth-panel="' + kind + '"]');
      if (!panel) return null;
      return {
        panel,
        type: panel.querySelector('[data-person-auth-type]')?.value || '',
        name: (panel.querySelector('[data-person-auth-name]')?.value || '').trim(),
        birth6: parseMaskedJuminText((panel.querySelector('[data-person-auth-jumin]')?.value || ''), (panel.querySelector('[data-person-auth-birth6]')?.value || ''), (panel.querySelector('[data-person-auth-gender-digit]')?.value || '')).birth6,
        genderDigit: parseMaskedJuminText((panel.querySelector('[data-person-auth-jumin]')?.value || ''), (panel.querySelector('[data-person-auth-birth6]')?.value || ''), (panel.querySelector('[data-person-auth-gender-digit]')?.value || '')).genderDigit,
        juminMasked: parseMaskedJuminText((panel.querySelector('[data-person-auth-jumin]')?.value || ''), (panel.querySelector('[data-person-auth-birth6]')?.value || ''), (panel.querySelector('[data-person-auth-gender-digit]')?.value || '')).masked,
        carrier: (panel.querySelector('[data-person-auth-carrier]')?.value || '').trim(),
        phone: (panel.querySelector('[data-person-auth-phone]')?.value || '').trim(),
        code: (panel.querySelector('[data-person-auth-code]')?.value || '').trim(),
        agreed: !!panel.querySelector('[data-person-auth-agree]')?.checked
      };
    }

    function setPersonAuthStatus(kind, text, mode) {
      const values = getPersonAuthValues(kind);
      const panel = values?.panel;
      if (!panel) return;
      const status = panel.querySelector('[data-person-auth-status]');
      if (status) status.textContent = text;
      panel.classList.toggle('verified', mode === 'verified');
      panel.classList.toggle('rejected', mode === 'rejected');
      const badge = panel.querySelector('[data-person-auth-badge]');
      if (badge) {
        badge.textContent = mode === 'verified' ? '인증완료' : (mode === 'rejected' ? '동의거절' : '인증대기');
        badge.className = 'badge ' + (mode === 'verified' ? 'done' : (mode === 'rejected' ? 'need' : 'need'));
      }
    }


    function setWorkerAddButtonsEnabled(enabled) {
      document.querySelectorAll('[data-worker-add-button]').forEach(btn => {
        btn.disabled = !enabled;
        btn.classList.toggle('disabled', !enabled);
      });
    }

    function togglePersonAuthCodeInput(panel, show) {
      if (!panel) return;
      panel.querySelectorAll('[data-person-auth-code], [data-person-auth-verify-button]').forEach(el => {
        el.classList.toggle('hidden', !show);
        if (show) el.disabled = false;
      });
      const sendButton = panel.querySelector('[data-person-auth-send-button]');
      if (sendButton) sendButton.textContent = show ? '문자 재전송' : '약관/동의 문자보내기';
    }

    function getPersonKindLabel(kind, values) {
      const personAuth = getPersonAuthModule();
      const resolvedValues = values || { type: document.querySelector('[data-person-auth-panel="worker"] [data-person-auth-type]')?.value || 'normal' };
      if (personAuth.getKindLabel) return personAuth.getKindLabel(kind, resolvedValues);
      if (kind === 'driver') return '기사';
      const type = resolvedValues?.type || 'normal';
      return type === 'special' ? '특수인부' : '보통인부';
    }

    function buildPersonAuthSmsText(kind) {
      const values = getPersonAuthValues(kind) || {};
      const equipmentNo = (document.getElementById('equipmentNo')?.value || '등록장비').trim();
      const equipmentName = (document.getElementById('equipmentName')?.value || '현장 장비').trim();
      const personAuth = getPersonAuthModule();
      if (personAuth.buildSmsText) return personAuth.buildSmsText(kind, values, { equipmentNo, equipmentName, consentCode:'예시코드', testCode:TEST_PRIVATE_DOC_CODE });
      const name = values.name || (kind === 'driver' ? '기사님' : '인부님');
      const link = 'https://sitepass.kr/consent/' + (kind === 'driver' ? 'driver' : 'worker') + '/예시코드';
      return '[SitePass] ' + name + '님, ' + equipmentName + ' ' + equipmentNo + ' 현장 반입서류 등록 요청입니다.\n' +
        '약관/동의 내용을 확인한 뒤 동의하시면 6자리 번호를 등록자에게 알려주세요.\n' +
        '약관/동의 확인 링크: ' + link + '\n' +
        '6자리 동의번호: 123456\n' +
        '동의하지 않거나 요청한 내용이 아니면 번호를 알려주지 말고 문자를 무시하세요.';
    }

    function buildPersonAuthConsentText(kind) {
      const values = getPersonAuthValues(kind) || {};
      const personAuth = getPersonAuthModule();
      if (personAuth.buildConsentText) return personAuth.buildConsentText(kind, values);
      const role = getPersonKindLabel(kind, values);
      const name = values.name || (kind === 'driver' ? '기사님' : '인부님');
      return name + '님은 ' + role + ' 현장 반입서류 등록 대상자입니다.\n\n' +
        '동의하면 SitePass가 본인의 현장 반입서류를 등록·보관하고, 장비업자가 현장 담당자에게 서류 확인 링크를 보내는 데 사용할 수 있습니다. 담당자 확인 링크는 보안상 일정 기간 후 접속이 차단되지만, 최초 동의·인증은 현장 링크를 보낼 때마다 반복하지 않습니다.\n\n' +
        '수집·이용 항목: 이름, 휴대폰번호, 인증 및 동의 기록, 신분증, 면허증, 안전교육 이수증, 건강검진서류 등 본인이 직접 촬영·등록한 서류\n' +
        '이용 목적: 현장 장비 반입서류 보관, 현장 담당자 확인, 다운로드·프린트 제공, 서류 갱신 및 민원 대응\n' +
        '보유 기간: 회원의 서비스 이용기간 또는 서류 삭제 요청 시까지. 법령상 보관이 필요한 기록은 해당 기간 보관될 수 있음\n' +
        '거부권: 동의하지 않을 수 있으며, 거부 시 SitePass를 통한 해당 서류 등록·공유가 제한됩니다. 동의하지 않으면 6자리 번호를 등록자에게 알려주지 마세요.\n\n' +
        '신분증의 주민등록번호 뒷자리, 주소, 면허번호 일부 등 불필요한 정보는 가림 처리하는 것을 원칙으로 합니다. 건강검진서류 등 민감정보가 포함되는 경우 별도 확인 후 필요한 경우에만 등록합니다.';
    }

    function renderPersonSmsPreview(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      const box = values.panel.querySelector('[data-person-sms-preview]');
      if (!box) return;
      const sms = buildPersonAuthSmsText(kind);
      const consent = buildPersonAuthConsentText(kind);
      box.innerHTML = '<div class="sms-preview-head"><span>문자/동의 화면 미리보기</span><span>실제 발송 전 확인용</span></div>' +
        '<div class="sms-preview-content"><b>① 기사/인부에게 가는 문자</b><div class="sms-preview-text">' + escapeHtml(sms) + '</div>' +
        '<b>② 링크 클릭 후 보이는 동의문</b><div class="sms-preview-text">' + escapeHtml(consent) + '</div></div>';
      box.classList.remove('hidden');
    }

    function showAuthSmsPreview(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      if (!values.name) {
        alert((kind === 'driver' ? '기사' : '인부') + ' 이름을 입력하면 문자 예시가 더 정확하게 보입니다.');
        values.panel.querySelector('[data-person-auth-name]')?.focus();
      }
      renderPersonSmsPreview(kind);
    }

    function sendPersonAuthCode(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      const personAuth = getPersonAuthModule();
      const validation = personAuth.validateSendValues ? personAuth.validateSendValues(kind, values) : null;
      if (validation && !validation.ok) {
        alert(validation.message);
        values.panel.querySelector(validation.focusSelector || '[data-person-auth-name]')?.focus();
        return;
      }
      if (!validation) {
        if (!values.name) { alert((kind === 'driver' ? '기사' : '인부') + ' 이름을 입력해주세요.'); values.panel.querySelector('[data-person-auth-name]')?.focus(); return; }
        if (!values.birth6 || !/^\d{6}$/.test(values.birth6) || !values.genderDigit || !/^[1-8]$/.test(values.genderDigit)) { alert((kind === 'driver' ? '기사' : '인부') + ' 주민번호는 840507-1까지만 입력해주세요. 저장/표시는 840507-1******로 처리됩니다.'); values.panel.querySelector('[data-person-auth-jumin]')?.focus(); return; }
        if (!values.carrier) { alert((kind === 'driver' ? '기사' : '인부') + ' 통신사를 선택해주세요.'); values.panel.querySelector('[data-person-auth-carrier]')?.focus(); return; }
        if (!values.phone) { alert((kind === 'driver' ? '기사' : '인부') + ' 휴대폰번호를 입력해주세요.'); values.panel.querySelector('[data-person-auth-phone]')?.focus(); return; }
      }
      const sentDataset = personAuth.buildSentDataset ? personAuth.buildSentDataset(values) : null;
      if (sentDataset) {
        Object.entries(sentDataset).forEach(([key, value]) => { values.panel.dataset[key] = value; });
      } else {
        values.panel.dataset.authCodeSent = 'true';
        values.panel.dataset.authPhone = values.phone;
        values.panel.dataset.authName = values.name;
        values.panel.dataset.authBirth6 = values.birth6;
        values.panel.dataset.authGenderDigit = values.genderDigit;
        values.panel.dataset.authJuminMasked = values.juminMasked || (values.birth6 + '-' + values.genderDigit + '******');
        values.panel.dataset.authCarrier = values.carrier;
        values.panel.dataset.authType = values.type || '';
      }
      togglePersonAuthCodeInput(values.panel, true);
      renderPersonSmsPreview(kind);
      setPersonAuthStatus(kind, '약관/동의 안내 문자와 6자리 번호를 보냈습니다. 기사/인부가 동의하면 그 번호를 등록자에게 알려주고, 등록자는 아래 입력칸에 입력합니다.', 'pending');
      values.panel.querySelector('[data-person-auth-code]')?.focus();
      alert('현재 임시 6자리 번호는 123456입니다.\n정식 서비스에서는 ' + values.carrier + ' / ' + values.phone + ' 번호로 통신사 본인확인 후 약관/동의 링크와 6자리 번호가 발송됩니다. 기사/인부가 동의하면 그 번호를 등록자에게 알려주는 방식입니다.');
    }

    function verifyPersonAuth(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      const personAuth = getPersonAuthModule();
      const validation = personAuth.validateVerifyValues ? personAuth.validateVerifyValues(kind, values, values.panel.dataset.authCodeSent, TEST_PRIVATE_DOC_CODE) : null;
      if (validation && !validation.ok) {
        alert(validation.message);
        if (validation.focusSelector) values.panel.querySelector(validation.focusSelector)?.focus();
        return;
      }
      if (!validation) {
        if (!values.name) { alert((kind === 'driver' ? '기사' : '인부') + ' 이름을 입력해주세요.'); return; }
        if (!values.phone) { alert('휴대폰번호를 먼저 입력해주세요.'); return; }
        if (values.panel.dataset.authCodeSent !== 'true') { alert('먼저 약관/동의 문자보내기 버튼을 눌러주세요.'); return; }
        if (values.code !== TEST_PRIVATE_DOC_CODE) { alert('6자리 번호가 맞지 않습니다. 현재 임시 번호 123456을 입력해주세요.'); values.panel.querySelector('[data-person-auth-code]')?.focus(); return; }
      }
      const meta = personAuth.buildVerifiedMeta ? personAuth.buildVerifiedMeta(values) : {
        personName: values.name,
        phone: values.phone,
        type: values.type || '',
        verifiedAt: new Date().toISOString()
      };
      if (kind === 'driver') {
        document.querySelectorAll('.doc-card[data-group-key="driver"]').forEach(card => setDocCardAuthVerified(card, meta));
        values.panel.dataset.authVerified = 'true';
        values.panel.dataset.authVerifiedAt = meta.verifiedAt;
        setPersonAuthStatus(kind, '기사 본인 동의/인증 완료 · 기사서류 전체 파일선택/사진찍기가 열렸습니다.', 'verified');
        values.panel.querySelectorAll('input, select, button').forEach(el => { if (!el.matches('[data-person-auth-reset]')) el.disabled = true; });
        const driverPhone = document.querySelector('.doc-card[data-doc-key="driverIdCard"] [data-extra-phone-key="driverPhone"]');
        if (driverPhone && !driverPhone.value) driverPhone.value = values.phone;
        alert('기사 본인 인증이 완료되었습니다.\n기사서류 전체 업로드가 열렸습니다.');
        return;
      }
      values.panel.dataset.pendingVerified = 'true';
      values.panel.dataset.pendingName = values.name;
      values.panel.dataset.pendingPhone = values.phone;
      values.panel.dataset.pendingType = values.type || 'normal';
      values.panel.dataset.pendingVerifiedAt = meta.verifiedAt;
      setPersonAuthStatus(kind, '인부 동의/인증 완료 · 이제 아래 버튼으로 이 인부의 서류함을 추가할 수 있습니다.', 'verified');
      setWorkerAddButtonsEnabled(true);
      alert('인부 동의/인증이 완료되었습니다.\n이제 보통인부 추가 또는 특수인부 추가 버튼으로 서류함을 추가하세요.\n이 인증은 해당 인부 서류 등록 동의용이며, 현장 링크를 보낼 때마다 다시 받지 않습니다.');
    }

    function rejectPersonAuth(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      values.panel.dataset.authRejected = 'true';
      values.panel.dataset.pendingVerified = 'false';
      setPersonAuthStatus(kind, '동의거절 처리되었습니다. 서류 업로드와 공유에 포함되지 않습니다.', 'rejected');
      if (kind === 'worker') setWorkerAddButtonsEnabled(false);
      if (kind === 'driver') {
        document.querySelectorAll('.doc-card[data-group-key="driver"]').forEach(card => {
          card.dataset.authVerified = 'false';
          card.dataset.authPhone = '';
          card.dataset.authPersonName = '';
        });
        refreshPrivateDocLocks(document);
      }
      alert('동의거절로 처리했습니다. 필요한 경우 이름/번호를 다시 입력하고 새로 약관/동의 문자보내기을 보내세요.');
    }

    function resetPersonAuth(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      values.panel.dataset.authCodeSent = 'false';
      values.panel.dataset.authVerified = 'false';
      values.panel.dataset.authRejected = 'false';
      values.panel.dataset.pendingVerified = 'false';
      values.panel.dataset.pendingName = '';
      values.panel.dataset.pendingPhone = '';
      values.panel.dataset.pendingVerifiedAt = '';
      values.panel.querySelectorAll('input').forEach(input => { input.disabled = false; if (input.type === 'checkbox') input.checked = false; else input.value = ''; });
      values.panel.querySelectorAll('select, button').forEach(el => { el.disabled = false; });
      togglePersonAuthCodeInput(values.panel, false);
      if (kind === 'worker') setWorkerAddButtonsEnabled(false);
      if (kind === 'driver') {
        document.querySelectorAll('.doc-card[data-group-key="driver"]').forEach(card => {
          card.dataset.authVerified = 'false';
          card.dataset.authPhone = '';
          card.dataset.authPersonName = '';
        });
        refreshPrivateDocLocks(document);
      }
      setPersonAuthStatus(kind, kind === 'driver' ? '기사 문자 동의안내와 6자리 인증을 완료하면 기사서류 전체가 열립니다.' : '인부 1명마다 문자 동의안내와 6자리 인증 후 추가 버튼이 열립니다.', 'pending');
    }
