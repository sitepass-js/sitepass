// SitePass v23.7.283 - 탈퇴 장비/QR 정리 및 푸시버튼 보정
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

    function sendPrivateDocAuthCode(button) {
      const card = button?.closest('.doc-card');
      const groupKey = card?.dataset?.groupKey || 'driver';
      sendPersonAuthCode(groupKey === 'worker' ? 'worker' : 'driver');
    }

    function verifyPrivateDocAuth(button) {
      const card = button?.closest('.doc-card');
      const groupKey = card?.dataset?.groupKey || 'driver';
      verifyPersonAuth(groupKey === 'worker' ? 'worker' : 'driver');
    }

    function openNativeCameraFile(card) {
      const targetCard = card || activeCameraCard;
      if (!targetCard) return false;
      if (!requirePrivateDocAuth(targetCard)) return false;
      const fallback = targetCard.querySelector('input[data-role="camera-fallback"]');
      if (fallback) {
        fallback.click();
        return true;
      }
      return false;
    }

    async function openCameraGuide(docKey) {
      const card = document.querySelector('.doc-card[data-doc-key="' + docKey + '"]');
      if (!card) return;
      if (!requirePrivateDocAuth(card)) return;
      activeCameraCard = card;

      // v23.7.160: 사진찍기 모드 오류 수정.
      // businessLicense(사업자등록증)에 license 글자가 들어가 카드촬영으로 잡히던 문제를 막고,
      // 장비서류는 기본 A4, 신분증/면허증/이수증만 카드 촬영모드가 보이게 합니다.

      const modal = document.getElementById('cameraModal');
      const video = document.getElementById('cameraVideo');
      const status = document.getElementById('cameraScanStatus');
      const guide = document.getElementById('cameraGuide');
      activeCameraScanMode = (getCameraScanApi().getDefaultScanMode ? getCameraScanApi().getDefaultScanMode(docKey) : (isCardQuarterDoc(docKey) ? 'card' : 'a4'));
      updateCameraScanModeUi(docKey);
      modal.classList.remove('hidden');
      cameraAutoCaptureBusy = false;
      cameraStableBox = null;
      cameraStableSince = 0;
      if (status) status.textContent = '카메라 권한 확인중';

      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        video.srcObject = cameraStream;
        await video.play();
        startCameraAutoDetect();
      } catch (error) {
        stopCameraAutoDetect();
        resetCameraAutoBox();
        if (status) status.textContent = '권한 차단됨 · 기본 카메라 버튼을 눌러주세요';
        const note = document.getElementById('cameraRuntimeNote');
        if (note) note.textContent = '브라우저가 직접 카메라를 막았습니다. 오른쪽 [기본 카메라]를 누르면 휴대폰 촬영창으로 촬영하고, 촬영 후 용지/A4 보정을 적용합니다.';
      }
    }



    function setCameraScanMode(mode) {
      const docKey = activeCameraCard?.dataset?.docKey || '';
      if (mode === 'card' && !isCardQuarterDoc(docKey)) {
        alert('이 서류는 A4 서류 촬영모드로 저장됩니다.\n카드형 촬영은 신분증·면허증·이수증에서만 사용합니다.');
        mode = 'a4';
      }
      activeCameraScanMode = mode === 'card' ? 'card' : 'a4';
      updateCameraScanModeUi(docKey);
      resetCameraAutoBox();
    }

    function updateCameraScanModeUi(docKey) {
      const guide = document.getElementById('cameraGuide');
      const guideText = guide ? guide.querySelector('.guide-text') : null;
      const status = document.getElementById('cameraScanStatus');
      const label = document.getElementById('cameraDocModeLabel');
      const help = document.getElementById('cameraModeHelp');
      const switchBox = document.getElementById('cameraModeSwitch');
      const a4Btn = document.getElementById('cameraModeA4');
      const cardBtn = document.getElementById('cameraModeCard');
      const docTitle = activeCameraCard?.dataset?.docTitle || '서류';
      const cardAllowed = isCardQuarterDoc(docKey);
      const isCard = cardAllowed && activeCameraScanMode === 'card';
      const cameraTexts = getCameraScanApi().getModeTexts
        ? getCameraScanApi().getModeTexts(docKey, activeCameraScanMode, docTitle)
        : null;

      if (guide) {
        guide.classList.toggle('card-mode', isCard);
        guide.classList.toggle('scan-card', isCard);
        guide.classList.toggle('scan-a4', !isCard);
      }
      if (switchBox) switchBox.classList.toggle('hidden', !cardAllowed);
      if (a4Btn) a4Btn.classList.toggle('active', !isCard);
      if (cardBtn) cardBtn.classList.toggle('active', isCard);

      if (label) label.textContent = cameraTexts?.label || ('현재 촬영모드: ' + (isCard ? '카드/이수증 A4 상단 1/2 배치' : 'A4 서류 전체 맞춤') + ' · ' + docTitle);
      if (help) help.textContent = cameraTexts?.help || (isCard ? '카드를 가로 노란틀에 크게 맞추세요. 촬영 후 A4 상단 1/2 칸에 크게 배치됩니다.' : '서류를 세로 노란틀에 크게 맞추세요. 촬영 후 A4 한 장 크기로 맞춥니다.');
      if (guideText) guideText.textContent = cameraTexts?.note || (isCard ? '카드/이수증만 이 모드를 씁니다 · 밝기보정 없음' : '장비서류는 A4 모드입니다 · 밝기보정 없음');
      if (status) status.textContent = cameraTexts?.status || (isCard ? '카드를 가로 노란틀에 맞춰주세요' : 'A4 서류를 세로 노란틀에 맞춰주세요');
      const note = document.getElementById('cameraRuntimeNote');
      if (note) note.textContent = cameraTexts?.note || (isCard ? '카드형 문서만 A4 상단 1/2 영역에 크게 배치합니다. 색상/밝기는 그대로 둡니다.' : '사업자등록증·장비등록증·검사증·보험증권은 항상 A4 서류로 저장합니다. 색상/밝기는 그대로 둡니다.');
    }

    function closeCameraGuide() {
      stopCameraAutoDetect();
      resetCameraAutoBox();
      const modal = document.getElementById('cameraModal');
      modal.classList.add('hidden');
      const video = document.getElementById('cameraVideo');
      if (video) video.srcObject = null;
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
      }
    }

    function fallbackCameraFile() {
      const targetCard = activeCameraCard;
      closeCameraGuide();
      if (!targetCard) return;
      if (!requirePrivateDocAuth(targetCard)) return;
      openNativeCameraFile(targetCard);
    }

    async function takeCameraPhoto(autoMode = false) {
      if (cameraAutoCaptureBusy && !autoMode) return;
      cameraAutoCaptureBusy = true;
      const status = document.getElementById('cameraScanStatus');
      try {
        const video = document.getElementById('cameraVideo');
        const targetCard = activeCameraCard;
        if (!video || !video.videoWidth || !targetCard) {
          cameraAutoCaptureBusy = false;
          fallbackCameraFile();
          return;
        }
        if (!requirePrivateDocAuth(targetCard)) {
          closeCameraGuide();
          return;
        }
        stopCameraAutoDetect();
        if (status) status.textContent = '촬영 중 · 노란틀 기준으로 스캔본 만드는 중';

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const docKey = targetCard.dataset.docKey || '';
        const isCardMode = activeCameraScanMode === 'card' && isCardQuarterDoc(docKey);
        const guideBox = getCameraGuideCropBox(canvas.width, canvas.height, docKey);
        // 출시 전 안정성을 위해 실시간 자동인식보다 사용자가 보는 노란틀 기준을 우선합니다.
        // 보정은 위치/A4 맞춤만 하고 밝기·색상은 건드리지 않습니다.
        let finalBox = guideBox || { x:0, y:0, w:canvas.width, h:canvas.height };
        let finalCanvas = null;
        let finalLabel = '사진촬영 · 노란틀 기준';

        try {
          if (isCardMode) {
            const cardBox = finalBox || { x:0, y:0, w:canvas.width, h:canvas.height };
            finalCanvas = resizeCanvasIfNeeded(makeCardTopHalfScanCanvas(canvas, cardBox), 1100);
            finalLabel = '사진촬영 · 카드형 A4 상단 1/2 위치맞춤';
          } else {
            const scanBox = finalBox || guideBox;
            if (scanBox) {
              const pad = Math.round(Math.max(scanBox.w, scanBox.h) * 0.012);
              const croppedCanvas = cropCanvas(canvas, scanBox, pad);
              const scanned = smartA4DocumentScan(croppedCanvas, true, docKey);
              finalCanvas = resizeCanvasIfNeeded(scanned.canvas, 1100);
              finalLabel = '사진촬영 · A4 크기맞춤';
            } else {
              const scanned = smartA4DocumentScan(canvas, false, docKey);
              finalCanvas = resizeCanvasIfNeeded(scanned.canvas, 1100);
              finalLabel = '사진촬영 · 원본 크기맞춤';
            }
          }
          sharpenCanvas(finalCanvas, 0.08);
        } catch (error) {
          finalCanvas = resizeCanvasIfNeeded(canvas, 1100);
          finalLabel = '스캔앱 촬영 · 원본축소';
        }

        const blob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/jpeg', 0.82));
        closeCameraGuide();
        if (!blob) return;
        const fileName = getCameraScanApi().buildScanFileName ? getCameraScanApi().buildScanFileName('sitepass_scan') : ('sitepass_scan_' + Date.now() + '.jpg');
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        await applySelectedFile(targetCard, file, finalLabel);
        promptAdditionalDocPage(targetCard, '사진찍기');
      } finally {
        cameraAutoCaptureBusy = false;
      }
    }

    function getCameraGuideCropBox(sourceW, sourceH, docKey = '') {
      const view = document.querySelector('.camera-view');
      const viewW = view?.clientWidth || 0;
      const viewH = view?.clientHeight || 0;
      if (!viewW || !viewH || !sourceW || !sourceH) return null;
      const isCardMode = activeCameraCard && activeCameraCard.dataset.docKey === docKey ? activeCameraScanMode === 'card' : isCardQuarterDoc(docKey);
      const pct = isCardMode
        ? { left:0.07, top:0.27, width:0.86, height:0.41 }
        : { left:0.10, top:0.07, width:0.80, height:0.86 };
      const frameLeft = viewW * pct.left;
      const frameTop = viewH * pct.top;
      const frameW = viewW * pct.width;
      const frameH = viewH * pct.height;

      const sourceAspect = sourceW / sourceH;
      const viewAspect = viewW / viewH;
      let drawW, drawH, offsetX, offsetY, scale;
      if (sourceAspect > viewAspect) {
        drawH = viewH;
        drawW = viewH * sourceAspect;
        offsetX = (viewW - drawW) / 2;
        offsetY = 0;
        scale = drawH / sourceH;
      } else {
        drawW = viewW;
        drawH = viewW / sourceAspect;
        offsetX = 0;
        offsetY = (viewH - drawH) / 2;
        scale = drawW / sourceW;
      }
      const x = clamp((frameLeft - offsetX) / scale, 0, sourceW - 1);
      const y = clamp((frameTop - offsetY) / scale, 0, sourceH - 1);
      const w = clamp(frameW / scale, 1, sourceW - x);
      const h = clamp(frameH / scale, 1, sourceH - y);
      return { x, y, w, h };
    }

    function boxMostlyInside(inner, outer) {
      if (!inner || !outer) return false;
      const ix1 = Math.max(inner.x, outer.x);
      const iy1 = Math.max(inner.y, outer.y);
      const ix2 = Math.min(inner.x + inner.w, outer.x + outer.w);
      const iy2 = Math.min(inner.y + inner.h, outer.y + outer.h);
      const iw = Math.max(0, ix2 - ix1);
      const ih = Math.max(0, iy2 - iy1);
      const intersection = iw * ih;
      const innerArea = Math.max(1, inner.w * inner.h);
      return intersection / innerArea > 0.70;
    }

    function startCameraAutoDetect() {
      // v23.7.157: 실시간 초록 자동인식은 휴대폰/조명에 따라 흔들려서 사용자가 헷갈릴 수 있습니다.
      // 이제 촬영 화면에서는 노란 고정틀만 보여주고, 촬영 후 노란틀 기준으로 A4 보정합니다.
      stopCameraAutoDetect();
      latestCameraBox = null;
      resetCameraAutoBox();
    }

    function stopCameraAutoDetect() {
      if (cameraScanTimer) {
        clearInterval(cameraScanTimer);
        cameraScanTimer = null;
      }
    }

    function resetCameraAutoBox() {
      latestCameraBox = null;
      cameraStableBox = null;
      cameraStableSince = 0;
      const guide = document.getElementById('cameraGuide');
      const box = document.getElementById('autoDocumentBox');
      const status = document.getElementById('cameraScanStatus');
      if (guide) guide.classList.remove('detected');
      if (box) box.removeAttribute('style');
      if (status) status.textContent = (activeCameraScanMode === 'card') ? '카드를 가로 노란틀에 맞춰주세요' : 'A4 서류를 세로 노란틀에 맞춰주세요';
    }

    function scanCameraFrame() {
      const video = document.getElementById('cameraVideo');
      if (!video || !video.videoWidth || !video.videoHeight) return;
      const maxSide = 640;
      const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
      const scanCanvas = document.createElement('canvas');
      scanCanvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      scanCanvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const sctx = scanCanvas.getContext('2d', { willReadFrequently:true });
      sctx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);

      const scanDocKey = activeCameraCard?.dataset?.docKey || '';
      const scanCardMode = isCardQuarterDoc(scanDocKey);
      let smallBox = findDocumentBoundingBox(scanCanvas, sctx, { cardMode: scanCardMode }) || findDocumentBoundingBoxByBackground(scanCanvas, sctx, { cardMode: scanCardMode });
      const status = document.getElementById('cameraScanStatus');
      if (!smallBox) {
        cameraStableBox = null;
        cameraStableSince = 0;
        const guide = document.getElementById('cameraGuide');
        const box = document.getElementById('autoDocumentBox');
        if (guide) guide.classList.remove('detected');
        if (box) box.removeAttribute('style');
        if (status) status.textContent = '용지나 카드를 노란 테두리 안에 맞춰주세요';
        return;
      }

      const sx = video.videoWidth / scanCanvas.width;
      const sy = video.videoHeight / scanCanvas.height;
      latestCameraBox = {
        x: clamp(smallBox.x * sx, 0, video.videoWidth - 1),
        y: clamp(smallBox.y * sy, 0, video.videoHeight - 1),
        w: clamp(smallBox.w * sx, 1, video.videoWidth),
        h: clamp(smallBox.h * sy, 1, video.videoHeight)
      };
      if (latestCameraBox.x + latestCameraBox.w > video.videoWidth) latestCameraBox.w = video.videoWidth - latestCameraBox.x;
      if (latestCameraBox.y + latestCameraBox.h > video.videoHeight) latestCameraBox.h = video.videoHeight - latestCameraBox.y;
      latestCameraDetectedAt = Date.now();
      drawCameraAutoBox(latestCameraBox, video.videoWidth, video.videoHeight);
      const stableInfo = updateCameraStableAutoCapture(latestCameraBox, video.videoWidth, video.videoHeight);
      if (status && stableInfo) status.textContent = stableInfo;
    }

    function updateCameraStableAutoCapture(box, sourceW, sourceH) {
      if (!box || cameraAutoCaptureBusy) return '자동촬영 처리중';
      const now = Date.now();
      const areaRatio = (box.w * box.h) / Math.max(1, sourceW * sourceH);
      const boxRatio = box.w / Math.max(1, box.h);
      const docKey = activeCameraCard?.dataset?.docKey || '';
      const isCardMode = isCardQuarterDoc(docKey);
      const usableSize = isCardMode
        ? areaRatio >= 0.045 && areaRatio <= 0.82 && box.w >= sourceW * 0.20 && box.h >= sourceH * 0.12 && boxRatio >= 0.38 && boxRatio <= 2.65
        : areaRatio >= 0.18 && areaRatio <= 0.92 && box.w >= sourceW * 0.28 && box.h >= sourceH * 0.28 && boxRatio >= 0.42 && boxRatio <= 1.75;
      if (!usableSize) {
        cameraStableBox = null;
        cameraStableSince = 0;
        return '용지/카드가 너무 작거나 화면 밖입니다 · 노란선 안에 크게 맞춰주세요';
      }

      if (!cameraStableBox) {
        cameraStableBox = { ...box };
        cameraStableSince = now;
        return '초록선 감지됨 · 흔들리지 않게 잠깐 고정';
      }

      const prevCx = cameraStableBox.x + cameraStableBox.w / 2;
      const prevCy = cameraStableBox.y + cameraStableBox.h / 2;
      const currCx = box.x + box.w / 2;
      const currCy = box.y + box.h / 2;
      const movement =
        Math.abs(currCx - prevCx) / Math.max(1, sourceW) +
        Math.abs(currCy - prevCy) / Math.max(1, sourceH) +
        Math.abs(box.w - cameraStableBox.w) / Math.max(1, sourceW) +
        Math.abs(box.h - cameraStableBox.h) / Math.max(1, sourceH);

      if (movement > 0.070) {
        cameraStableBox = { ...box };
        cameraStableSince = now;
        return '초록선 감지됨 · 흔들리지 않게 고정해주세요';
      }

      cameraStableBox = { ...box };
      const elapsed = now - cameraStableSince;
      if (elapsed >= CAMERA_AUTO_CAPTURE_DELAY_MS) {
        triggerCameraAutoCapture();
        return '자동촬영 중 · 최종 스캔본 저장 준비';
      }
      const left = Math.max(1, Math.ceil((CAMERA_AUTO_CAPTURE_DELAY_MS - elapsed) / 250));
      return '초록선 고정 확인중 · ' + left + '칸 뒤 자동촬영';
    }

    function triggerCameraAutoCapture() {
      if (cameraAutoCaptureBusy) return;
      cameraAutoCaptureBusy = true;
      const status = document.getElementById('cameraScanStatus');
      if (status) status.textContent = '자동촬영 시작';
      setTimeout(() => takeCameraPhoto(true), 80);
    }

    function drawCameraAutoBox(box, sourceW, sourceH) {
      const guide = document.getElementById('cameraGuide');
      const rect = document.getElementById('autoDocumentBox');
      const view = document.querySelector('.camera-view');
      if (!guide || !rect || !view || !box) return;
      const viewW = view.clientWidth || 1;
      const viewH = view.clientHeight || 1;
      const sourceAspect = sourceW / sourceH;
      const viewAspect = viewW / viewH;
      let drawW, drawH, offsetX, offsetY, scale;
      if (sourceAspect > viewAspect) {
        drawH = viewH;
        drawW = viewH * sourceAspect;
        offsetX = (viewW - drawW) / 2;
        offsetY = 0;
        scale = drawH / sourceH;
      } else {
        drawW = viewW;
        drawH = viewW / sourceAspect;
        offsetX = 0;
        offsetY = (viewH - drawH) / 2;
        scale = drawW / sourceW;
      }
      const left = clamp(offsetX + box.x * scale, 0, viewW);
      const top = clamp(offsetY + box.y * scale, 0, viewH);
      const right = clamp(offsetX + (box.x + box.w) * scale, 0, viewW);
      const bottom = clamp(offsetY + (box.y + box.h) * scale, 0, viewH);
      if (right - left < 30 || bottom - top < 30) return;
      rect.style.left = left + 'px';
      rect.style.top = top + 'px';
      rect.style.width = (right - left) + 'px';
      rect.style.height = (bottom - top) + 'px';
      guide.classList.add('detected');
    }

    function detectDocumentBoxOnCanvas(canvas, docKey = '') {
      const scaled = makeScaledCanvasFromCanvas(canvas, 760);
      const cardMode = isCardQuarterDoc(docKey);
      const box = findDocumentBoundingBox(scaled.canvas, scaled.ctx, { cardMode }) || findDocumentBoundingBoxByBackground(scaled.canvas, scaled.ctx, { cardMode });
      if (!box) return null;
      const sx = canvas.width / scaled.canvas.width;
      const sy = canvas.height / scaled.canvas.height;
      const out = {
        x: clamp(box.x * sx, 0, canvas.width - 1),
        y: clamp(box.y * sy, 0, canvas.height - 1),
        w: clamp(box.w * sx, 1, canvas.width),
        h: clamp(box.h * sy, 1, canvas.height)
      };
      if (out.x + out.w > canvas.width) out.w = canvas.width - out.x;
      if (out.y + out.h > canvas.height) out.h = canvas.height - out.y;
      const areaRatio = (out.w * out.h) / (canvas.width * canvas.height);
      if (areaRatio < 0.035 || areaRatio > 0.98) return null;
      return out;
    }

    function makeScaledCanvasFromCanvas(sourceCanvas, maxSide) {
      const scale = Math.min(1, maxSide / Math.max(sourceCanvas.width, sourceCanvas.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
      canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
      return { canvas, ctx, scale };
    }

    function isBundleGroupEnabled(groupKey) {
      if (groupKey === 'equipment') return true;
      if (groupKey === 'driver') return !!document.getElementById('includeDriverDocs')?.checked;
      if (groupKey === 'worker') return !!document.getElementById('includeWorkerDocs')?.checked;
      return true;
    }

    function getActiveDocDefs() {
      return DOCS.filter(doc => isBundleGroupEnabled(doc.groupKey));
    }

    function toggleBundleGroup(groupKey) {
      const group = document.querySelector('[data-bundle-group="' + groupKey + '"]');
      const enabled = isBundleGroupEnabled(groupKey);
      if (group) {
        group.classList.toggle('inactive', !enabled);
        group.dataset.active = enabled ? 'true' : 'false';
        const body = group.querySelector('.bundle-group-body');
        if (body) body.classList.toggle('hidden', !enabled);
      }
      if (groupKey === 'worker' && enabled) {
        const list = document.getElementById('workerPeopleList');
        if (list) list.innerHTML = '';
        resetPersonAuth('worker');
      }
      renderAlertPreview();
      renderBundleSummary();
    }

    function renderBundleSummary() {
      const box = document.getElementById('bundleSummary');
      if (!box) return;
      const activeGroups = DOC_GROUPS.filter(group => isBundleGroupEnabled(group.key));
      let requiredCount = activeGroups.reduce((sum, group) => sum + group.docs.filter(doc => doc.required).length, 0);
      let optionalCount = activeGroups.reduce((sum, group) => sum + group.docs.filter(doc => !doc.required).length, 0);
      const workerPeopleCount = isBundleGroupEnabled('worker') ? document.querySelectorAll('#workerPeopleList .worker-person-card').length : 0;
      if (isBundleGroupEnabled('worker')) {
        const displayCount = Math.max(1, workerPeopleCount);
        requiredCount += displayCount * 2; // 인부별 신분증 + 기초안전교육
        optionalCount += displayCount * 2; // 인부별 특수건강검진 + 기타
      }
      box.innerHTML =
        '<div><b>' + activeGroups.length + '</b><span>포함 구역</span></div>' +
        '<div><b>' + requiredCount + '</b><span>필수서류</span></div>' +
        '<div><b>' + optionalCount + '</b><span>선택서류</span></div>';
    }

    function findCleanDateShell(el) {
      return el ? el.closest('.clean-date-picker') : null;
    }

    function setCleanDateValue(displayInput, value) {
      if (!displayInput) return;
      const cleanValue = value || '';
      displayInput.value = cleanValue;
      const shell = findCleanDateShell(displayInput);
      const realInput = shell ? shell.querySelector('[data-clean-date-real]') : null;
      if (realInput) realInput.value = cleanValue;
      renderAlertPreview();
    }

    function syncCleanDatePicker(realInput) {
      const shell = findCleanDateShell(realInput);
      const displayInput = shell ? shell.querySelector('[data-clean-date-display]') : null;
      if (!displayInput || !realInput) return;
      displayInput.value = realInput.value || '';
      renderAlertPreview();
      setTimeout(function(){
        try { realInput.blur(); } catch(e) {}
        try { displayInput.blur(); } catch(e) {}
      }, 0);
    }

    function openCleanDatePicker(displayInput) {
      if (!displayInput) return;
      const shell = findCleanDateShell(displayInput);
      const realInput = shell ? shell.querySelector('[data-clean-date-real]') : null;
      if (!realInput) return;
      realInput.value = displayInput.value || '';
      try { displayInput.blur(); } catch(e) {}
      try { realInput.focus({ preventScroll:true }); } catch(e) { try { realInput.focus(); } catch(_) {} }
      try {
        if (typeof realInput.showPicker === 'function') {
          realInput.showPicker();
        } else {
          realInput.click();
        }
      } catch(e) {
        try { realInput.click(); } catch(_) {}
      }
      setTimeout(function(){
        try { displayInput.blur(); } catch(e) {}
      }, 0);
    }

    function attachDocInputHandlers(root) {
      const target = root || document;
      target.querySelectorAll('input[type="file"]').forEach(input => {
        if (input.dataset.boundChange === 'yes') return;
        input.addEventListener('click', function(event) {
          const card = event.target.closest('.doc-card');
          if (!requirePrivateDocAuth(card)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return false;
          }
        }, true);
        input.addEventListener('change', handleFileChange);
        input.dataset.boundChange = 'yes';
      });
      target.querySelectorAll('[data-upload-label], .camera-launch').forEach(el => {
        if (el.dataset.boundAuthGate === 'yes') return;
        el.addEventListener('click', function(event) {
          const card = event.target.closest('.doc-card');
          if (!requirePrivateDocAuth(card)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return false;
          }
        }, true);
        el.dataset.boundAuthGate = 'yes';
      });
      refreshPrivateDocLocks(target);
      target.querySelectorAll('[data-clean-date-display]').forEach(input => {
        if (input.dataset.boundDateDisplay === 'yes') return;
        input.addEventListener('mousedown', function(event) { event.preventDefault(); });
        input.addEventListener('click', function(event) { event.preventDefault(); openCleanDatePicker(input); });
        input.addEventListener('keydown', function(event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openCleanDatePicker(input);
          }
        });
        input.dataset.boundDateDisplay = 'yes';
      });
      target.querySelectorAll('[data-clean-date-real]').forEach(input => {
        if (input.dataset.boundDateReal === 'yes') return;
        input.addEventListener('change', function() { syncCleanDatePicker(input); });
        input.addEventListener('input', function() { syncCleanDatePicker(input); });
        input.addEventListener('blur', function() { syncCleanDatePicker(input); });
        input.dataset.boundDateReal = 'yes';
      });
      target.querySelectorAll('input[type="date"]:not([data-clean-date-real])').forEach(input => {
        if (input.dataset.boundDate === 'yes') return;
        input.addEventListener('change', function() { renderAlertPreview(); setTimeout(function(){ input.blur(); }, 0); });
        input.dataset.boundDate = 'yes';
      });
      target.querySelectorAll('[data-extra-phone-key], [data-extra-task-key]').forEach(input => {
        if (input.dataset.boundExtra === 'yes') return;
        input.addEventListener('input', renderBundleSummary);
        input.dataset.boundExtra = 'yes';
      });
    }

    function renderDocCardHtml(group, doc, index, options = {}) {
      const key = options.key || doc.key;
      const title = options.title || doc.title;
      const groupKey = options.groupKey || group.key;
      const workerAttrs = options.workerAttrs || '';
      const isPrivateDoc = groupKey === 'driver' || groupKey === 'worker';
      const authVerified = !isPrivateDoc || options.authVerified === true;
      const privateAuthAttrs = isPrivateDoc && !authVerified ? ' disabled data-locked-before-auth="yes"' : '';
      const privateAuthClass = isPrivateDoc && !authVerified ? ' auth-locked' : '';
      const authMetaAttrs = [];
      if (options.authPhone) authMetaAttrs.push('data-auth-phone="' + escapeHtml(options.authPhone) + '"');
      if (options.authPersonName) authMetaAttrs.push('data-auth-person-name="' + escapeHtml(options.authPersonName) + '"');
      if (options.authVerifiedAt) authMetaAttrs.push('data-auth-verified-at="' + escapeHtml(options.authVerifiedAt) + '"');
      const lockedNoteHtml = isPrivateDoc && !authVerified ? '<div class="auth-status">🔒 ' + (groupKey === 'driver' ? '기사 본인 동의/인증을 한 번 완료하면 기사서류 전체가 열립니다.' : '인부 동의/인증을 완료한 사람만 서류 업로드가 열립니다.') + '</div>' : '';
      const extraPhoneHtml = options.extraPhone ? '<div class="id-phone-input"><label>' + escapeHtml(options.phoneLabel || '전화번호 선택입력') + '</label><input type="tel" data-extra-phone-key="' + escapeHtml(options.phoneKey || 'phone') + '" placeholder="예: 010-0000-0000" inputmode="tel" autocomplete="tel" /></div>' : '';
      const extraTaskHtml = options.extraTask ? '<div class="id-phone-input" data-special-task-box><label>특수인부 작업내용 선택입력</label><input type="text" data-extra-task-key="workerTask" placeholder="예: 신호수 / 용접 / 타워크레인 신호 / 유도원" autocomplete="off" /></div>' : '';
      const driverPhoneHtml = doc.extraPhone ? '<div class="id-phone-input"><label>기사 전화번호 선택입력</label><input type="tel" data-extra-key="driverPhone" data-extra-phone-key="driverPhone" placeholder="예: 010-0000-0000" inputmode="tel" autocomplete="tel" /></div>' : '';
      return '<div class="doc-card ' + (doc.required ? 'required' : '') + '" data-doc-key="' + key + '" data-doc-title="' + escapeHtml(title) + '" data-required="' + doc.required + '" data-expiry="' + doc.expiry + '" data-group-key="' + groupKey + '" data-auth-verified="' + (authVerified ? 'true' : 'false') + '" ' + authMetaAttrs.join(' ') + ' ' + workerAttrs + '>' +
        '<div class="doc-head"><div class="doc-title">' + (index + 1) + '. ' + escapeHtml(title) + '</div><span class="badge ' + (doc.required ? 'need' : '') + '">' + (doc.required ? '필수' : '선택') + '</span></div>' +
        lockedNoteHtml +
        '<div class="file-row">' +
          '<label class="file-button' + privateAuthClass + '" data-upload-label>갤러리/내파일함<input type="file" data-role="file" accept=".jpg,.jpeg,.png,.webp,.pdf,application/pdf" multiple' + privateAuthAttrs + ' /></label>' +
          '<button type="button" class="file-button camera-launch' + privateAuthClass + '" onclick="openCameraGuide(\'' + escapeJs(key) + '\')"' + privateAuthAttrs + '>사진찍기</button>' +
          '<input type="file" class="hidden-camera-input' + privateAuthClass + '" data-role="camera-fallback" accept="image/*" capture="environment" style="display:none"' + privateAuthAttrs + ' />' +
        '</div>' +
        '<div class="multi-page-hint">사진/파일을 올린 뒤 모든 서류에서 “추가 장이 있나요?”를 확인합니다. 확인을 누르면 같은 서류에 2페이지, 3페이지처럼 계속 추가됩니다.</div>' +
        '<div class="selected-file" data-role="filename" data-pages-json="[]">첨부 없음</div>' +
        driverPhoneHtml + extraPhoneHtml + extraTaskHtml +
        (doc.expiry ? '<div class="date-grid"><div class="date-field"><label>' + escapeHtml(doc.dateLabel) + '</label><div class="clean-date-picker"><input type="text" class="clean-date-display" data-date-key="' + doc.dateKey + '" data-date-label="' + escapeHtml(doc.dateLabel) + '" data-clean-date-display="yes" placeholder="날짜 선택" readonly /><input type="date" class="clean-date-real" data-clean-date-real="yes" aria-label="' + escapeHtml(doc.dateLabel) + '" tabindex="-1" /></div></div></div>' : '') +
        '<div class="date-note">' + escapeHtml(doc.note) + '</div>' +
      '</div>';
    }

    function renderDriverAuthPanel() {
      return '<div class="person-auth-panel" data-person-auth-panel="driver" data-auth-code-sent="false" data-auth-verified="false">' +
        '<div class="person-auth-head"><div><b>기사 개인정보 서류 한 번 동의/인증</b><span>기사 신분증·면허증·교육증·건강검진 등 개인정보 서류는 기사 본인이 문자 동의안내를 받은 뒤 6자리 번호를 전달해야 전체 업로드가 열립니다. 인증은 사람별 최초 등록 때 받으며, 현장 링크를 보낼 때마다 다시 받지 않습니다.</span></div><span class="badge need" data-person-auth-badge>인증대기</span></div>' +
        '<div class="person-auth-grid"><input type="text" data-person-auth-name placeholder="기사 이름" autocomplete="off" /><input type="text" data-person-auth-jumin placeholder="주민번호 예: 840507-1" maxlength="8" inputmode="numeric" autocomplete="off" oninput="formatPersonAuthJuminTyping(this)" onblur="formatPersonAuthJuminDisplay(this)" /></div>' +
        '<div class="person-auth-grid"><select data-person-auth-carrier><option value="">통신사 선택</option><option value="SKT">SKT</option><option value="KT">KT</option><option value="LG U+">LG U+</option><option value="SKT 알뜰폰">SKT 알뜰폰</option><option value="KT 알뜰폰">KT 알뜰폰</option><option value="LG U+ 알뜰폰">LG U+ 알뜰폰</option></select><input type="tel" data-person-auth-phone placeholder="기사 휴대폰번호" inputmode="tel" autocomplete="tel" /></div>' +
        '<div class="auth-mini-note">기사에게 약관/동의 안내 문자와 6자리 번호를 보냅니다. 정식 서비스에서는 통신사/PASS 본인확인으로 이름·주민번호·휴대폰번호가 일치하는지 확인합니다.</div>' +
        '<div class="person-auth-grid three"><button type="button" class="ghost" data-person-auth-send-button onclick="sendPersonAuthCode(\'driver\')">약관/동의 문자보내기</button><input type="text" class="hidden" data-person-auth-code placeholder="기사/인부가 받은 6자리 번호 입력" inputmode="numeric" maxlength="6" autocomplete="one-time-code" /><button type="button" class="primary hidden" data-person-auth-verify-button onclick="verifyPersonAuth(\'driver\')">인증하기</button></div>' +
        '<div class="person-auth-actions"><button type="button" class="ghost" onclick="showAuthSmsPreview(\'driver\')">문자내용 보기</button></div>' +
        '<div class="sms-preview-box hidden" data-person-sms-preview></div>' +
        '<div class="auth-status" data-person-auth-status>기사 문자 동의안내와 6자리 인증을 완료하면 기사서류 전체가 열립니다.</div>' +
      '</div>';
    }

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

    async function buildDocPage(card, file, sourceText) {
      const base = {
        id:'p' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        fileName:file.name,
        fileSource:sourceText,
        fileType:file.type || '',
        fileObjectUrl:'',
        previewDataUrl:'',
        originalDataUrl:'',
        correctedDataUrl:'',
        editDataUrl:'',
        previewChoice:'',
        autoFit:'',
        addedAt:new Date().toISOString()
      };
      if (file.type && file.type.startsWith('image/')) {
        try {
          const fitResult = await fitDocumentImageToDataUrl(file, 1100, 0.80, card.dataset.docKey || '');
          const preview = fitResult.dataUrl || await compressImageToDataUrl(file, 1100, 0.80);
          // v23.7.132부터는 스캔앱 방식으로 최종 스캔본 1장만 저장합니다.
          // 원본/수정본을 동시에 저장하지 않아 용량을 줄이고, 사용자가 선택 실수할 일을 없앱니다.
          base.originalDataUrl = '';
          base.correctedDataUrl = '';
          base.previewDataUrl = preview;
          base.editDataUrl = fitResult.editDataUrl || preview;
          base.previewChoice = 'scan-final';
          base.autoFit = fitResult.method || 'scanner-final-only';
          base.fitText = (sourceText || '').includes('스캔앱') ? '스캔앱 모드 · 최종본 1장 저장' : (fitResult.fitText || '자동스캔 최종본 1장 저장');
          base.ratioText = (sourceText || '').includes('용지자동자르기') ? '용지 자동자르기 완료' : (fitResult.ratioText || '원본/수정본 비교 없이 저장');
          card.dataset.cameraAutoCropDataUrl = '';
          card.dataset.cameraAutoCropLabel = '';
        } catch (error) {
          try {
            base.previewDataUrl = await compressImageToDataUrl(file, 1100, 0.78);
            base.editDataUrl = base.previewDataUrl;
            base.previewChoice = 'scan-final';
            base.autoFit = 'compressed-final-only';
            base.fitText = '최종본 1장 저장';
            base.ratioText = '자동스캔 실패 시 원본 축소 저장';
          } catch (innerError) {
            base.errorText = '이미지 미리보기를 만들 수 없습니다.';
          }
        }
      } else if ((file.type || '').includes('pdf') || String(file.name || '').toLowerCase().endsWith('.pdf')) {
        try {
          base.fileObjectUrl = URL.createObjectURL(file);
          base.previewChoice = 'pdf';
          base.autoFit = 'pdf-file';
          base.fitText = 'PDF 첨부됨';
          base.ratioText = '미리보기 가능';
        } catch (error) {
          base.errorText = 'PDF 미리보기를 준비할 수 없습니다.';
        }
      }
      return base;
    }

    function renderCardPagesPreview(card) {
      const nameBox = card?.querySelector('[data-role="filename"]');
      if (!nameBox) return;
      let preview = card.querySelector('.preview-wrap');
      if (!preview) {
        preview = document.createElement('div');
        preview.className = 'preview-wrap';
        nameBox.insertAdjacentElement('afterend', preview);
      }
      const pages = getDocPagesFromCard(card);
      if (!pages.length) {
        preview.classList.remove('show');
        preview.innerHTML = '';
        return;
      }
      preview.classList.add('show');
      const label = makeDocFileTopLabel({ title: card.dataset.docTitle || '첨부서류' }, '');
      const expiryDoc = { title: card.dataset.docTitle || '', expireDate: card.querySelector('[data-date-key]')?.value || '' };
      preview.innerHTML = '<div class="preview-title"><span>첨부 ' + pages.length + '장 · 최종 스캔본</span></div>' + renderPagesListHtml(pages, { editable:true, docKey:card.dataset.docKey, docLabel:label }) + renderDocExpiryStrip(expiryDoc);
    }

    function renderPdfAttachedBox(page, message) {
      const pdfSrc = page.fileObjectUrl || page.fileDataUrl || '';
      const helperText = message || '선택한 PDF 파일을 바로 확인할 수 있습니다.';
      const previewButton = pdfSrc
        ? '<button type="button" data-pdf-src="' + escapeHtml(pdfSrc) + '" onclick="openPdfPreview(this.dataset.pdfSrc); event.stopPropagation();">미리보기</button>'
        : '<button type="button" onclick="alert(\'현재 브라우저에 남아있는 PDF 미리보기 파일이 없습니다. 파일선택으로 다시 첨부하면 바로 미리보기가 뜹니다.\'); event.stopPropagation();">미리보기</button>';
      return '<div class="preview-pdf">PDF 첨부됨<br><span class="small">' + escapeHtml(helperText) + '</span><div class="pdf-preview-actions">' + previewButton + '</div></div>';
    }

    function renderPagesListHtml(pages, options = {}) {
      const editable = !!options.editable;
      const readonly = !!options.readonly;
      const docKey = options.docKey || '';
      const docCode = options.code || '';
      const imageOnly = !!options.imageOnly;
      const simpleUpdateMode = editable && !!editingCode;

      if (imageOnly) {
        return '<div class="page-list clean-page-list">' + (pages || []).map((page, index) => {
          const isPdf = (page.fileType || '').includes('pdf') || String(page.fileName || '').toLowerCase().endsWith('.pdf');
          const imgSrc = page.previewDataUrl || page.correctedDataUrl || page.originalDataUrl || '';
          const labelText = options.docLabel ? (String(options.docLabel) + ((pages || []).length > 1 ? ' ' + (index + 1) + '페이지' : '')) : '';
          const labelHtml = labelText ? '<div class="page-file-label">' + escapeHtml(labelText) + '</div>' : '';
          let body = '';
          if (imgSrc) {
            body = '<div class="paper-frame"><img class="preview-img" alt="첨부 이미지" src="' + imgSrc + '" data-preview-src="' + imgSrc + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>';
          } else {
            body = isPdf ? renderPdfAttachedBox(page, '선택한 PDF 파일입니다.') : '<div class="preview-pdf">첨부됨<br><span class="small">이미지 저장본이 없으면 서버 저장 단계에서 원본 파일 보기로 연결합니다.</span></div>';
          }
          return '<div class="page-item clean-page-item">' + labelHtml + body + '</div>';
        }).join('') + '</div>';
      }

      return '<div class="page-list ' + (simpleUpdateMode ? 'simple-update-pages' : '') + '">' + (pages || []).map((page, index) => {
        const isPdf = (page.fileType || '').includes('pdf') || String(page.fileName || '').toLowerCase().endsWith('.pdf');
        const selectedMode = page.previewChoice === 'original' ? 'original' : (page.previewChoice === 'corrected' ? 'corrected' : (page.correctedDataUrl ? 'corrected' : 'original'));
        const selectedText = selectedMode === 'original' ? '원본 사용중' : '수정본 사용중';
        const canCompare = !!(page.originalDataUrl && page.correctedDataUrl);
        const pageLabelText = options.docLabel ? (String(options.docLabel) + ((pages || []).length > 1 ? ' ' + (index + 1) + '페이지' : '')) : '';
        const pageLabelHtml = pageLabelText ? '<div class="page-file-label">' + escapeHtml(pageLabelText) + '</div>' : '';
        let body = '';

        if (simpleUpdateMode) {
          if (canCompare) {
            const originalSelected = selectedMode === 'original';
            const correctedSelected = !originalSelected;
            body = '<div class="page-choice-note">수정/갱신 화면에서는 복잡한 편집 버튼은 숨기고, 원본/보정본 선택과 삭제만 표시합니다.</div>' +
              '<div class="compare-grid page-compare-grid">' +
                '<div class="compare-card ' + (originalSelected ? 'selected' : '') + '" data-page-compare-card="original">' +
                  '<div class="compare-label"><span>원본</span><span class="selected-chip">사용중</span></div>' +
                  '<div class="paper-frame"><img class="preview-img" alt="원본 미리보기" src="' + page.originalDataUrl + '" data-preview-src="' + page.originalDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
                  '<div class="preview-actions"><button type="button" class="mini-button use ' + (originalSelected ? 'active' : '') + '" onclick="selectDocPageVersion(\'' + escapeJs(docKey) + '\',' + index + ',\'original\')">원본 사용</button></div>' +
                '</div>' +
                '<div class="compare-card ' + (correctedSelected ? 'selected' : '') + '" data-page-compare-card="corrected">' +
                  '<div class="compare-label"><span>자동보정본</span><span class="selected-chip">사용중</span></div>' +
                  '<div class="paper-frame"><img class="preview-img" alt="자동보정본 미리보기" src="' + page.correctedDataUrl + '" data-preview-src="' + page.correctedDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
                  '<div class="preview-actions"><button type="button" class="mini-button use ' + (correctedSelected ? 'active' : '') + '" onclick="selectDocPageVersion(\'' + escapeJs(docKey) + '\',' + index + ',\'corrected\')">보정본 사용</button></div>' +
                '</div>' +
              '</div>' +
              '<div class="fit-note"><span>' + escapeHtml(page.fitText || '원본/보정본 선택 가능') + '</span><span>' + escapeHtml(page.ratioText || selectedText) + '</span></div>';
          } else if (page.previewDataUrl) {
            body = '<div class="paper-frame"><img class="preview-img" alt="' + escapeHtml((index + 1) + '페이지') + '" src="' + page.previewDataUrl + '" data-preview-src="' + page.previewDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
              '<div class="page-choice-note"><span class="page-current-label">현재 첨부됨</span> 원본/보정본이 없는 기존 파일입니다. 필요하면 삭제하고 새로 추가하세요.</div>';
          } else {
            body = isPdf ? renderPdfAttachedBox(page, '선택한 PDF 파일입니다.') : '<div class="preview-pdf">첨부됨<br><span class="small">필요 없으면 삭제하고 새 파일을 추가하세요.</span></div>';
          }
          const simpleActionsHtml = '<div class="page-actions simple-page-actions"><button type="button" class="mini-button dangerBtn" onclick="removeDocPage(\'' + escapeJs(docKey) + '\',' + index + ')">삭제</button></div>';
          return '<div class="page-item simple-update-page"><div class="page-head"><b>' + (index + 1) + '페이지</b><span>' + escapeHtml(page.fileName || '첨부파일') + '</span></div>' + pageLabelHtml + body + simpleActionsHtml + '</div>';
        }

        if (editable && canCompare) {
          const originalSelected = selectedMode === 'original';
          const correctedSelected = !originalSelected;
          body = '<div class="page-choice-note">이 페이지는 원본과 자동수정본 중 원하는 쪽을 선택할 수 있습니다. 선택한 화면이 저장·QR조회·인쇄에 사용됩니다.</div>' +
            '<div class="compare-grid page-compare-grid">' +
              '<div class="compare-card ' + (originalSelected ? 'selected' : '') + '" data-page-compare-card="original">' +
                '<div class="compare-label"><span>원본</span><span class="selected-chip">사용중</span></div>' +
                '<div class="paper-frame"><img class="preview-img" alt="원본 미리보기" src="' + page.originalDataUrl + '" data-preview-src="' + page.originalDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
                '<div class="preview-actions"><button type="button" class="mini-button" onclick="openDocPagePreview(\'' + escapeJs(docKey) + '\',' + index + ',\'original\',\'' + escapeJs(docCode) + '\')">원본 크게보기</button><button type="button" class="mini-button use ' + (originalSelected ? 'active' : '') + '" onclick="selectDocPageVersion(\'' + escapeJs(docKey) + '\',' + index + ',\'original\')">원본 사용</button></div>' +
              '</div>' +
              '<div class="compare-card ' + (correctedSelected ? 'selected' : '') + '" data-page-compare-card="corrected">' +
                '<div class="compare-label"><span>자동수정본</span><span class="selected-chip">사용중</span></div>' +
                '<div class="paper-frame"><img class="preview-img" alt="자동수정본 미리보기" src="' + page.correctedDataUrl + '" data-preview-src="' + page.correctedDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
                '<div class="preview-actions"><button type="button" class="mini-button" onclick="openDocPagePreview(\'' + escapeJs(docKey) + '\',' + index + ',\'corrected\',\'' + escapeJs(docCode) + '\')">수정본 크게보기</button><button type="button" class="mini-button use ' + (correctedSelected ? 'active' : '') + '" onclick="selectDocPageVersion(\'' + escapeJs(docKey) + '\',' + index + ',\'corrected\')">수정본 사용</button></div>' +
              '</div>' +
            '</div>' +
            '<div class="fit-note"><span>' + escapeHtml(page.fitText || '원본/수정본 선택 가능') + '</span><span>' + escapeHtml(page.ratioText || selectedText) + '</span></div>';
        } else if (page.previewDataUrl) {
          body = '<div class="paper-frame"><img class="preview-img" alt="' + escapeHtml((index + 1) + '페이지') + '" src="' + page.previewDataUrl + '" data-preview-src="' + page.previewDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
            (canCompare ? '<div class="page-choice-note"><span class="page-current-label">' + selectedText + '</span> 원본/수정본은 보기 버튼으로 확인할 수 있습니다.</div>' : '<div class="page-choice-note"><span class="page-current-label">최종본 저장</span> 스캔앱 방식으로 이 1장만 저장됩니다.</div>');
        } else {
          body = isPdf ? renderPdfAttachedBox(page, '선택한 PDF 파일입니다.') : '<div class="preview-pdf">첨부됨<br><span class="small">서버 연결 전에는 이미지 미리보기 저장본만 바로 인쇄됩니다.</span></div>';
        }

        let viewButton = '';
        if (page.previewDataUrl) {
          viewButton = (docCode || editable)
            ? '<button type="button" class="mini-button" onclick="openDocPagePreview(\'' + escapeJs(docKey) + '\',' + index + ',\'preview\',\'' + escapeJs(docCode) + '\')">미리보기</button>'
            : '<button type="button" class="mini-button" onclick="openPreviewModal(this.closest(\'.page-item\').querySelector(\'.preview-img\').dataset.previewSrc)">미리보기</button>';
        } else {
          viewButton = (docCode || editable)
            ? '<button type="button" class="mini-button" onclick="openDocPagePreview(\'' + escapeJs(docKey) + '\',' + index + ',\'preview\',\'' + escapeJs(docCode) + '\')">파일정보</button>'
            : '<button type="button" class="mini-button" onclick="alert(\'이미지 미리보기 저장본이 없습니다. 서버 저장 단계에서 원본 파일 보기를 연결합니다.\')">파일정보</button>';
        }

        const editButtons = editable ?
          '<button type="button" class="mini-button primary" onclick="openPageEdit(\'' + escapeJs(docKey) + '\',' + index + ')">수정편집</button>' +
          '<button type="button" class="mini-button dangerBtn" onclick="removeDocPage(\'' + escapeJs(docKey) + '\',' + index + ')">삭제</button>' :
          '';
        const actionsHtml = isPdf
          ? (editable ? '<div class="page-actions pdf-only-actions"><button type="button" class="mini-button dangerBtn" onclick="removeDocPage(\'' + escapeJs(docKey) + '\',' + index + ')">삭제</button></div>' : '')
          : '<div class="page-actions">' + viewButton + editButtons + '</div>';
        return '<div class="page-item"><div class="page-head"><b>' + (index + 1) + '페이지</b><span>' + escapeHtml(page.fileName || '첨부파일') + '</span></div>' + pageLabelHtml + body + actionsHtml + '</div>';
      }).join('') + '</div>';
    }

    function selectDocPageVersion(docKey, index, mode) {
      const card = findDocCardByKey(docKey);
      if (!card) return;
      const pages = getDocPagesFromCard(card);
      const page = pages[index];
      if (!page) return;
      const selectedSrc = mode === 'original' ? page.originalDataUrl : page.correctedDataUrl;
      if (!selectedSrc) {
        alert(mode === 'original' ? '원본 미리보기가 없습니다.' : '수정본 미리보기가 없습니다.');
        return;
      }
      page.previewDataUrl = selectedSrc;
      page.previewChoice = mode === 'original' ? 'original' : 'corrected';
      setDocPagesToCard(card, pages);
    }

    function findDocCardByKey(docKey) {
      return document.querySelector('.doc-card[data-doc-key="' + cssEscapeValue(docKey) + '"]');
    }

    function removeDocPage(docKey, index) {
      const card = findDocCardByKey(docKey);
      if (!card) return;
      const pages = getDocPagesFromCard(card);
      if (!pages[index]) return;
      if (!confirm((index + 1) + '페이지 첨부를 삭제할까요?')) return;
      pages.splice(index, 1);
      setDocPagesToCard(card, pages);
    }

    function moveDocPage(docKey, index, direction) {
      const card = findDocCardByKey(docKey);
      if (!card) return;
      const pages = getDocPagesFromCard(card);
      const next = index + direction;
      if (next < 0 || next >= pages.length) return;
      const temp = pages[index];
      pages[index] = pages[next];
      pages[next] = temp;
      setDocPagesToCard(card, pages);
    }

    function openDocPagePreview(docKey, index, mode, code) {
      let pages = [];
      if (code) {
        const item = getItemByCode(code);
        const doc = item ? getDisplayDocs(item).find(d => d.key === docKey) : null;
        pages = getDocPagesFromDoc(doc);
      } else {
        const card = findDocCardByKey(docKey);
        pages = getDocPagesFromCard(card);
      }
      const page = pages[index];
      if (!page) return;
      const src = mode === 'original' ? page.originalDataUrl : (mode === 'corrected' ? page.correctedDataUrl : page.previewDataUrl);
      if (src) { openPreviewModal(src); return; }
      alert('이미지 미리보기 저장본이 없습니다.\nPDF 원본보기는 서버 저장 단계에서 붙입니다.\n\n파일명: ' + (page.fileName || ''));
    }


    async function openPageEdit(docKey, index) {
      const card = findDocCardByKey(docKey);
      const pages = getDocPagesFromCard(card);
      const page = pages[index];
      if (!page) return;
      let src = isCardQuarterDoc(docKey)
        ? (page.originalDataUrl || page.editDataUrl || page.previewDataUrl || page.correctedDataUrl)
        : (page.editDataUrl || page.previewDataUrl || page.correctedDataUrl || page.originalDataUrl);
      if (!src) {
        alert('이미지 미리보기 저장본이 있어야 수정편집할 수 있습니다. PDF 원본 편집은 서버 저장 단계에서 붙입니다.');
        return;
      }
      if (isCardQuarterDoc(docKey)) {
        src = await normalizeCardEditSourceDataUrl(src);
        page.editDataUrl = src;
        setDocPagesToCard(card, pages);
      }
      pageEditState = { docKey, index, src, brightness:1, contrast:1, crop:{ left:0, top:0, right:0, bottom:0 } };
      const modal = document.getElementById('pageEditModal');
      const img = document.getElementById('pageEditImage');
      if (img) img.src = src;
      updatePageEditPreview();
      if (modal) modal.classList.remove('hidden');
    }

    function closePageEditModal() {
      const modal = document.getElementById('pageEditModal');
      if (modal) modal.classList.add('hidden');
      pageEditState = null;
    }

    function updatePageEditPreview() {
      if (!pageEditState) return;
      const img = document.getElementById('pageEditImage');
      const info = document.getElementById('pageEditInfo');
      const crop = pageEditState.crop || { left:0, top:0, right:0, bottom:0 };
      if (img) {
        img.style.transform = 'none';
        img.style.filter = 'brightness(' + pageEditState.brightness.toFixed(2) + ') contrast(' + pageEditState.contrast.toFixed(2) + ')';
        img.style.clipPath = 'inset(' + crop.top + '% ' + crop.right + '% ' + crop.bottom + '% ' + crop.left + '%)';
      }
      if (info) {
        const cropText = '자르기 좌 ' + crop.left + '% · 우 ' + crop.right + '% · 위 ' + crop.top + '% · 아래 ' + crop.bottom + '%';
        info.textContent = cropText + ' · 밝기 ' + Math.round(pageEditState.brightness * 100) + '% · 선명도 ' + Math.round(pageEditState.contrast * 100) + '%';
      }
    }

    function changeCropValue(side, delta) {
      if (!pageEditState) return;
      const crop = pageEditState.crop || (pageEditState.crop = { left:0, top:0, right:0, bottom:0 });
      if (!['left','right','top','bottom'].includes(side)) return;
      const opposite = side === 'left' ? 'right' : (side === 'right' ? 'left' : (side === 'top' ? 'bottom' : 'top'));
      const maxForSide = Math.max(0, 42 - Number(crop[opposite] || 0));
      crop[side] = clamp(Number(crop[side] || 0) + delta, 0, maxForSide);
      updatePageEditPreview();
    }

    function changeEditValue(key, delta) {
      if (!pageEditState) return;
      if (key === 'brightness') pageEditState.brightness = clamp(pageEditState.brightness + delta, 0.55, 1.65);
      if (key === 'contrast') pageEditState.contrast = clamp(pageEditState.contrast + delta, 0.55, 1.80);
      updatePageEditPreview();
    }

    function resetCropSide(side) {
      if (!pageEditState) return;
      if (!['left','right','top','bottom'].includes(side)) return;
      const crop = pageEditState.crop || (pageEditState.crop = { left:0, top:0, right:0, bottom:0 });
      crop[side] = 0;
      updatePageEditPreview();
    }

    function resetEditValue(key) {
      if (!pageEditState) return;
      if (key === 'brightness') pageEditState.brightness = 1;
      if (key === 'contrast') pageEditState.contrast = 1;
      updatePageEditPreview();
    }

    function resetPageEditValues() {
      if (!pageEditState) return;
      pageEditState.brightness = 1;
      pageEditState.contrast = 1;
      pageEditState.crop = { left:0, top:0, right:0, bottom:0 };
      updatePageEditPreview();
    }

    async function applyPageEdit() {
      if (!pageEditState) return;
      try {
        const isCardDoc = isCardQuarterDoc(pageEditState.docKey);
        const editedDataUrl = await renderEditedDataUrl(pageEditState.src, pageEditState.brightness, pageEditState.contrast, pageEditState.crop, pageEditState.docKey);
        const editedEditDataUrl = isCardDoc
          ? await renderEditedCardSourceDataUrl(pageEditState.src, pageEditState.brightness, pageEditState.contrast, pageEditState.crop)
          : await renderEditedSourceDataUrl(pageEditState.src, pageEditState.brightness, pageEditState.contrast, pageEditState.crop);
        const card = findDocCardByKey(pageEditState.docKey);
        const pages = getDocPagesFromCard(card);
        const page = pages[pageEditState.index];
        if (!page) return;
        // v23.7.172: 수정편집 적용 후에는 원본/자동수정본 비교는 남기지 않고
        // 사용자가 최종으로 확인한 수정본 1장만 남깁니다. A4/카드 모두 다음 수정편집은 원본 기준본으로 다시 열립니다.
        page.previewDataUrl = editedDataUrl;
        page.editDataUrl = editedEditDataUrl;
        page.originalDataUrl = '';
        page.correctedDataUrl = '';
        page.previewChoice = 'preview';
        page.autoFit = isCardDoc ? 'manual-crop-card-top-half' : 'manual-crop-final-only';
        page.fitText = isCardDoc
          ? '직접 자르기 수정본만 저장 · 카드형은 크게 A4 상단 1/2 배치'
          : '직접 자르기 수정본만 저장 · A4 서류는 수정 후 A4 저장본 유지';
        page.ratioText = isCardDoc
          ? '미리보기는 A4 위칸 · 수정편집은 카드 원본 기준'
          : '미리보기는 A4 저장본 · 수정편집은 용지 원본 기준';
        page.editedAt = new Date().toISOString();
        setDocPagesToCard(card, pages);
        closePageEditModal();
        alert(isCardDoc ? '카드 원본 기준으로 수정본을 저장했습니다. 미리보기는 더 크게 A4 상단 1/2 칸에 정리됩니다.' : 'A4 용지 원본 기준으로 수정본을 저장했습니다. 미리보기는 A4 저장본으로 정리됩니다.');
      } catch (error) {
        alert('수정편집 적용 중 오류가 났습니다. 다른 이미지로 다시 시도해주세요.');
      }
    }

    function renderEditedDataUrl(src, brightness, contrast, crop, docKey) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = crop || { left:0, top:0, right:0, bottom:0 };
          const left = clamp(Number(c.left || 0), 0, 45) / 100;
          const right = clamp(Number(c.right || 0), 0, 45) / 100;
          const top = clamp(Number(c.top || 0), 0, 45) / 100;
          const bottom = clamp(Number(c.bottom || 0), 0, 45) / 100;
          const sx = Math.round(img.width * left);
          const sy = Math.round(img.height * top);
          const sw = Math.max(20, Math.round(img.width * (1 - left - right)));
          const sh = Math.max(20, Math.round(img.height * (1 - top - bottom)));
          const cropped = document.createElement('canvas');
          cropped.width = sw;
          cropped.height = sh;
          const ctx = cropped.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cropped.width, cropped.height);
          ctx.filter = 'brightness(' + brightness + ') contrast(' + contrast + ')';
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          ctx.filter = 'none';

          let resultCanvas = cropped;
          if (isCardQuarterDoc(docKey)) {
            resultCanvas = makeA4TopHalfCanvas(makeCardEditSourceCanvas(cropped));
          } else {
            const scanResult = smartA4DocumentScan(cropped, true, docKey || '');
            resultCanvas = scanResult.canvas || cropped;
          }

          const resized = resizeCanvasIfNeeded(resultCanvas, 1100);
          resolve(resized.toDataURL('image/jpeg', 0.86));
        };
        img.onerror = reject;
        img.src = src;
      });
    }

    function renderEditedCardSourceDataUrl(src, brightness, contrast, crop) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = crop || { left:0, top:0, right:0, bottom:0 };
          const left = clamp(Number(c.left || 0), 0, 45) / 100;
          const right = clamp(Number(c.right || 0), 0, 45) / 100;
          const top = clamp(Number(c.top || 0), 0, 45) / 100;
          const bottom = clamp(Number(c.bottom || 0), 0, 45) / 100;
          const sx = Math.round(img.width * left);
          const sy = Math.round(img.height * top);
          const sw = Math.max(20, Math.round(img.width * (1 - left - right)));
          const sh = Math.max(20, Math.round(img.height * (1 - top - bottom)));
          const cropped = document.createElement('canvas');
          cropped.width = sw;
          cropped.height = sh;
          const ctx = cropped.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cropped.width, cropped.height);
          ctx.filter = 'brightness(' + brightness + ') contrast(' + contrast + ')';
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          ctx.filter = 'none';
          const cardOnly = makeCardEditSourceCanvas(cropped);
          const resized = resizeCanvasIfNeeded(cardOnly, 1100);
          resolve(resized.toDataURL('image/jpeg', 0.86));
        };
        img.onerror = reject;
        img.src = src;
      });
    }

    function renderEditedSourceDataUrl(src, brightness, contrast, crop) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = crop || { left:0, top:0, right:0, bottom:0 };
          const left = clamp(Number(c.left || 0), 0, 45) / 100;
          const right = clamp(Number(c.right || 0), 0, 45) / 100;
          const top = clamp(Number(c.top || 0), 0, 45) / 100;
          const bottom = clamp(Number(c.bottom || 0), 0, 45) / 100;
          const sx = Math.round(img.width * left);
          const sy = Math.round(img.height * top);
          const sw = Math.max(20, Math.round(img.width * (1 - left - right)));
          const sh = Math.max(20, Math.round(img.height * (1 - top - bottom)));
          const cropped = document.createElement('canvas');
          cropped.width = sw;
          cropped.height = sh;
          const ctx = cropped.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cropped.width, cropped.height);
          ctx.filter = 'brightness(' + brightness + ') contrast(' + contrast + ')';
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          ctx.filter = 'none';
          const resized = resizeCanvasIfNeeded(cropped, 1100);
          resolve(resized.toDataURL('image/jpeg', 0.86));
        };
        img.onerror = reject;
        img.src = src;
      });
    }

    function normalizeCardEditSourceDataUrl(src) {
      return new Promise((resolve) => {
        if (!src) { resolve(src); return; }
        const img = new Image();
        img.onload = () => {
          try {
            // 기존에 A4 위칸/1/4 배치본이 editDataUrl로 저장된 카드도, 수정편집을 열 때 카드 원본만 다시 뽑아줍니다.
            const portraitLike = img.height > img.width * 1.12;
            const largeWhitePage = (img.height >= 900 && img.width >= 600);
            if (!portraitLike && !largeWhitePage) { resolve(src); return; }
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const cardOnly = makeCardEditSourceCanvas(canvas);
            const resized = resizeCanvasIfNeeded(cardOnly, 1100);
            resolve(resized.toDataURL('image/jpeg', 0.86));
          } catch (e) {
            resolve(src);
          }
        };
        img.onerror = () => resolve(src);
        img.src = src;
      });
    }

    function renderComparePreviewHtml(fileName, originalDataUrl, correctedDataUrl, selectedMode, fitText, ratioText) {
      const originalSelected = selectedMode === 'original';
      const correctedSelected = selectedMode !== 'original';
      return '<div class="preview-title"><span>원본 / 자동 서류잡기 비교</span><span>' + escapeHtml(fileName) + '</span></div>' +
        '<div class="compare-grid">' +
          '<div class="compare-card ' + (originalSelected ? 'selected' : '') + '" data-compare-card="original">' +
            '<div class="compare-label"><span>원본 사진</span><span class="selected-chip">사용중</span></div>' +
            '<div class="paper-frame"><img class="preview-img" alt="원본 미리보기" src="' + originalDataUrl + '" data-preview-src="' + originalDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
            '<div class="preview-actions"><button type="button" class="mini-button" onclick="openCompareImage(this, \'original\')">원본 크게보기</button><button type="button" class="mini-button use ' + (originalSelected ? 'active' : '') + '" data-use-button="original" onclick="selectPreviewVersion(this, \'original\')">원본 사용</button></div>' +
          '</div>' +
          '<div class="compare-card ' + (correctedSelected ? 'selected' : '') + '" data-compare-card="corrected">' +
            '<div class="compare-label"><span>용지맞춤 후보</span><span class="selected-chip">사용중</span></div>' +
            '<div class="paper-frame"><img class="preview-img" alt="용지맞춤 미리보기" src="' + correctedDataUrl + '" data-preview-src="' + correctedDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
            '<div class="preview-actions"><button type="button" class="mini-button" onclick="openCompareImage(this, \'corrected\')">용지맞춤본 크게보기</button><button type="button" class="mini-button use ' + (correctedSelected ? 'active' : '') + '" data-use-button="corrected" onclick="selectPreviewVersion(this, \'corrected\')">용지맞춤 사용</button></div>' +
          '</div>' +
        '</div>' +
        '<div class="ai-status"><span>' + escapeHtml(fitText || '용지/카드 크기 맞춤') + '</span><span>' + escapeHtml(ratioText || '저장 시 선택본 기준') + '</span></div>' +
        '<div class="fit-note"><span>용지 위치가 틀리면 원본 사용을 누르세요</span><span>원본/자동자르기 선택 가능</span></div>';
    }

    function openCompareImage(button, mode) {
      const card = button.closest('.doc-card');
      const fileBox = card.querySelector('[data-role="filename"]');
      const src = mode === 'original' ? fileBox.dataset.originalDataUrl : fileBox.dataset.correctedDataUrl;
      if (src) openPreviewModal(src);
    }

    function selectPreviewVersion(button, mode) {
      const card = button.closest('.doc-card');
      const fileBox = card.querySelector('[data-role="filename"]');
      const selectedSrc = mode === 'original' ? fileBox.dataset.originalDataUrl : fileBox.dataset.correctedDataUrl;
      if (!selectedSrc) return;
      fileBox.dataset.previewDataUrl = selectedSrc;
      fileBox.dataset.previewChoice = mode;
      card.querySelectorAll('[data-compare-card]').forEach(box => box.classList.toggle('selected', box.dataset.compareCard === mode));
      card.querySelectorAll('[data-use-button]').forEach(btn => btn.classList.toggle('active', btn.dataset.useButton === mode));
    }

    function compressImageToDataUrl(file, maxSize, quality) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = makeResizedCanvas(img, maxSize);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function fitDocumentImageToDataUrl(file, maxSize, quality, docKey) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            try {
              const scan = makeScaledCanvas(img, 1100);
              let bbox = findDocumentBoundingBox(scan.canvas, scan.ctx);
              const source = document.createElement('canvas');
              const sctx = source.getContext('2d');
              source.width = img.width;
              source.height = img.height;
              sctx.drawImage(img, 0, 0);

              if (!bbox) {
                bbox = findDocumentBoundingBoxByBackground(scan.canvas, scan.ctx);
              }

              let crop = { x:0, y:0, w:source.width, h:source.height };
              let usedCrop = false;
              if (bbox) {
                const sx = source.width / scan.canvas.width;
                const sy = source.height / scan.canvas.height;
                const padX = bbox.w * 0.06;
                const padY = bbox.h * 0.08;
                crop = {
                  x: clamp((bbox.x - padX) * sx, 0, source.width - 1),
                  y: clamp((bbox.y - padY) * sy, 0, source.height - 1),
                  w: clamp((bbox.w + padX * 2) * sx, 1, source.width),
                  h: clamp((bbox.h + padY * 2) * sy, 1, source.height)
                };
                if (crop.x + crop.w > source.width) crop.w = source.width - crop.x;
                if (crop.y + crop.h > source.height) crop.h = source.height - crop.y;
                usedCrop = crop.w < source.width * 0.96 || crop.h < source.height * 0.96;
              }

              // v23.7.172: 카드형 서류는 비율/크기 판정에 실패해도 무조건 A4 상단 1/2 칸에 배치합니다.
              // 신분증/면허증/이수증이 일반 A4 전체나 예전 1/4 배치처럼 보이는 문제를 막습니다.
              if (isCardQuarterDoc(docKey || '')) {
                const cardOnlyCanvas = makeCardEditSourceCanvas(source, crop);
                const topHalfCanvas = resizeCanvasIfNeeded(makeA4TopHalfCanvas(cardOnlyCanvas), maxSize);
                resolve({
                  dataUrl: topHalfCanvas.toDataURL('image/jpeg', quality),
                  editDataUrl: resizeCanvasIfNeeded(cardOnlyCanvas, 1100).toDataURL('image/jpeg', quality),
                  method: 'card-top-half-a4-forced-scan',
                  fitText: '카드형 위치 맞춤 · 크게 A4 상단 1/2 배치',
                  ratioText: '미리보기는 큰 A4 상단칸 · 수정편집은 카드 원본으로 진행'
                });
                return;
              }

              const scale = Math.min(1, maxSize / Math.max(crop.w, crop.h));
              const out = document.createElement('canvas');
              out.width = Math.max(1, Math.round(crop.w * scale));
              out.height = Math.max(1, Math.round(crop.h * scale));
              const octx = out.getContext('2d');
              octx.fillStyle = '#ffffff';
              octx.fillRect(0, 0, out.width, out.height);
              // v23.7.158: 자동 밝기/대비/선명도 보정 제거.
              // 촬영본 색상은 그대로 두고, 용지 위치와 A4 크기만 맞춥니다.
              octx.filter = 'none';
              octx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);
              octx.filter = 'none';
              const scanResult = smartA4DocumentScan(out, usedCrop, docKey || '');
              const finalCanvas = resizeCanvasIfNeeded(scanResult.canvas, maxSize);

              resolve({
                dataUrl: finalCanvas.toDataURL('image/jpeg', quality),
                editDataUrl: out.toDataURL('image/jpeg', quality),
                method: scanResult.cropped ? 'a4-paper-fit-only' : 'fit-size-only',
                fitText: scanResult.cropped ? '용지 위치 맞춤 + A4 크기 맞춤 · 밝기보정 없음' : '전체 사진 기준: 크기만 조정 · 밝기보정 없음',
                ratioText: scanResult.cropped ? '미리보기는 A4 저장본 · 수정편집은 용지 원본 기준' : '수정편집은 현재 사진 기준으로 진행'
              });
            } catch (error) {
              reject(error);
            }
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function makeResizedCanvas(img, maxSize) {
      let width = img.width;
      let height = img.height;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return canvas;
    }

    function makeScaledCanvas(img, maxSide) {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      ctx.drawImage(img, 0, 0, width, height);
      return { canvas, ctx, scale };
    }

    function findDocumentBoundingBox(canvas, ctx, options = {}) {
      const w = canvas.width;
      const h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(2, Math.round(Math.max(w, h) / 520));

      let sum = 0, count = 0;
      let borderBright = 0, borderCount = 0;
      let br = 0, bg = 0, bb = 0, bgCount = 0;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          sum += bright; count++;
          if (x < w*0.10 || x > w*0.90 || y < h*0.10 || y > h*0.90) {
            borderBright += bright; borderCount++;
            br += r; bg += g; bb += b; bgCount++;
          }
        }
      }

      const avg = sum / Math.max(1, count);
      const borderAvg = borderBright / Math.max(1, borderCount);
      const bgR = br / Math.max(1, bgCount);
      const bgG = bg / Math.max(1, bgCount);
      const bgB = bb / Math.max(1, bgCount);
      const paperThreshold = Math.max(138, Math.min(235, Math.max(avg + 10, borderAvg + 12)));

      const paperXs = [], paperYs = [];
      const diffXs = [], diffYs = [];
      const edgeXs = [], edgeYs = [];

      for (let y = 1; y < h - 1; y += step) {
        for (let x = 1; x < w - 1; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const bgDiff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

          const ir = (y * w + Math.min(w - 1, x + step)) * 4;
          const ib = (Math.min(h - 1, y + step) * w + x) * 4;
          const brightR = (data[ir] + data[ir+1] + data[ir+2]) / 3;
          const brightB = (data[ib] + data[ib+1] + data[ib+2]) / 3;
          const localEdge = Math.max(Math.abs(bright - brightR), Math.abs(bright - brightB));

          const likelyPaper = bright >= paperThreshold && sat <= 125;
          const likelyTextOnPaper = bright >= Math.max(100, avg - 55) && sat <= 100 && bgDiff >= 18;
          const likelyDifferentFromBg = bgDiff >= Math.max(42, Math.abs(borderAvg - avg) * 0.7 + 28);
          const likelyEdgeRegion = localEdge >= 20 && bgDiff >= 18;

          if (likelyPaper || likelyTextOnPaper) { paperXs.push(x); paperYs.push(y); }
          if (likelyDifferentFromBg) { diffXs.push(x); diffYs.push(y); }
          if (likelyEdgeRegion) { edgeXs.push(x); edgeYs.push(y); }
        }
      }

      const bboxPaper = buildBBoxFromPoints(paperXs, paperYs, w, h, 0.01, 0.99);
      const bboxDiff = buildBBoxFromPoints(diffXs, diffYs, w, h, 0.02, 0.98);
      const bboxEdge = buildBBoxFromPoints(edgeXs, edgeYs, w, h, 0.03, 0.97);

      const minArea = options.cardMode ? 0.035 : 0.16;
      const minW = options.cardMode ? 0.18 : 0.20;
      const minH = options.cardMode ? 0.10 : 0.20;
      if (isUsableBBox(bboxPaper, w, h, minArea, 0.96, minW, minH)) return bboxPaper;
      if (isUsableBBox(bboxDiff, w, h, minArea, 0.96, minW, minH)) return bboxDiff;
      if (isUsableBBox(bboxEdge, w, h, minArea, 0.96, minW, minH)) return bboxEdge;

      const merged = mergeBBoxes([bboxPaper, bboxDiff, bboxEdge], w, h);
      if (isUsableBBox(merged, w, h, options.cardMode ? 0.035 : 0.12, 0.98, minW, minH)) return merged;
      return null;
    }

    function buildBBoxFromPoints(xs, ys, w, h, loRatio, hiRatio) {
      if (!xs || xs.length < 50 || !ys || ys.length < 50) return null;
      xs = xs.slice().sort((a,b)=>a-b);
      ys = ys.slice().sort((a,b)=>a-b);
      const x1 = xs[Math.floor(xs.length * loRatio)];
      const x2 = xs[Math.floor(xs.length * hiRatio)];
      const y1 = ys[Math.floor(ys.length * loRatio)];
      const y2 = ys[Math.floor(ys.length * hiRatio)];
      if (x2 <= x1 || y2 <= y1) return null;
      return { x:x1, y:y1, w:x2-x1, h:y2-y1 };
    }

    function isUsableBBox(bbox, w, h, minArea = 0.16, maxArea = 0.96, minWRatio = 0.20, minHRatio = 0.20) {
      if (!bbox) return false;
      const areaRatio = (bbox.w * bbox.h) / (w * h);
      if (areaRatio < minArea || areaRatio > maxArea) return false;
      if (bbox.w < w * minWRatio || bbox.h < h * minHRatio) return false;
      return true;
    }

    function mergeBBoxes(boxes, w, h) {
      const valid = (boxes || []).filter(Boolean);
      if (!valid.length) return null;
      let x1 = w, y1 = h, x2 = 0, y2 = 0;
      valid.forEach(b => {
        x1 = Math.min(x1, b.x);
        y1 = Math.min(y1, b.y);
        x2 = Math.max(x2, b.x + b.w);
        y2 = Math.max(y2, b.y + b.h);
      });
      if (x2 <= x1 || y2 <= y1) return null;
      return { x:x1, y:y1, w:x2-x1, h:y2-y1 };
    }


    function findDocumentBoundingBoxByBackground(canvas, ctx, options = {}) {
      const w = canvas.width;
      const h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(1, Math.round(Math.max(w, h) / 700));

      const corners = [
        sampleAreaAverage(data, w, h, 0, 0, Math.max(8, Math.round(w * 0.08)), Math.max(8, Math.round(h * 0.08))),
        sampleAreaAverage(data, w, h, Math.max(0, w - Math.max(8, Math.round(w * 0.08))), 0, Math.max(8, Math.round(w * 0.08)), Math.max(8, Math.round(h * 0.08))),
        sampleAreaAverage(data, w, h, 0, Math.max(0, h - Math.max(8, Math.round(h * 0.08))), Math.max(8, Math.round(w * 0.08)), Math.max(8, Math.round(h * 0.08))),
        sampleAreaAverage(data, w, h, Math.max(0, w - Math.max(8, Math.round(w * 0.08))), Math.max(0, h - Math.max(8, Math.round(h * 0.08))), Math.max(8, Math.round(w * 0.08)), Math.max(8, Math.round(h * 0.08)))
      ];
      const bg = corners.reduce((acc, c) => ({r:acc.r+c.r, g:acc.g+c.g, b:acc.b+c.b}), {r:0,g:0,b:0});
      bg.r /= corners.length; bg.g /= corners.length; bg.b /= corners.length;

      const rowCounts = new Array(h).fill(0);
      const colCounts = new Array(w).fill(0);
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const isDoc = diff > 26 || bright > 210 || edge > 18;
          if (isDoc) {
            rowCounts[y]++;
            colCounts[x]++;
          }
        }
      }

      let top = findActiveStart(rowCounts, Math.max(2, Math.round(w * 0.06 / step)));
      let bottom = findActiveEnd(rowCounts, Math.max(2, Math.round(w * 0.06 / step)));
      let left = findActiveStart(colCounts, Math.max(2, Math.round(h * 0.06 / step)));
      let right = findActiveEnd(colCounts, Math.max(2, Math.round(h * 0.06 / step)));
      if (top === -1 || left === -1 || bottom <= top || right <= left) return null;

      top = clamp(top - step * 3, 0, h - 1);
      left = clamp(left - step * 3, 0, w - 1);
      bottom = clamp(bottom + step * 3, 0, h - 1);
      right = clamp(right + step * 3, 0, w - 1);

      const bbox = { x:left, y:top, w:right-left, h:bottom-top };
      const minArea = options.cardMode ? 0.035 : 0.08;
      const minW = options.cardMode ? 0.18 : 0.20;
      const minH = options.cardMode ? 0.10 : 0.20;
      if (!isUsableBBox(bbox, w, h, minArea, 0.98, minW, minH)) return null;
      return bbox;
    }

    function sampleAreaAverage(data, w, h, sx, sy, sw, sh) {
      let r = 0, g = 0, b = 0, c = 0;
      for (let y = sy; y < Math.min(h, sy + sh); y++) {
        for (let x = sx; x < Math.min(w, sx + sw); x++) {
          const i = (y * w + x) * 4;
          r += data[i]; g += data[i+1]; b += data[i+2]; c++;
        }
      }
      return { r:r/Math.max(1,c), g:g/Math.max(1,c), b:b/Math.max(1,c) };
    }

    function estimateLocalEdge(data, w, h, x, y, step) {
      const i = (y * w + x) * 4;
      const xr = Math.min(w - 1, x + step);
      const yb = Math.min(h - 1, y + step);
      const ir = (y * w + xr) * 4;
      const ib = (yb * w + x) * 4;
      const a = (data[i] + data[i+1] + data[i+2]) / 3;
      const b = (data[ir] + data[ir+1] + data[ir+2]) / 3;
      const c = (data[ib] + data[ib+1] + data[ib+2]) / 3;
      return Math.max(Math.abs(a - b), Math.abs(a - c));
    }

    function findActiveStart(arr, threshold) {
      for (let i = 0; i < arr.length; i++) if (arr[i] >= threshold) return i;
      return -1;
    }

    function findActiveEnd(arr, threshold) {
      for (let i = arr.length - 1; i >= 0; i--) if (arr[i] >= threshold) return i;
      return -1;
    }

    function sharpenCanvas(canvas, amount) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      if (w < 3 || h < 3) return;
      const src = ctx.getImageData(0, 0, w, h);
      const dst = ctx.createImageData(w, h);
      const s = src.data, d = dst.data;
      const a = Math.max(0, Math.min(0.5, amount || 0.2));
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            const center = s[i+c];
            const left = s[(y*w + Math.max(0,x-1))*4 + c];
            const right = s[(y*w + Math.min(w-1,x+1))*4 + c];
            const top = s[(Math.max(0,y-1)*w + x)*4 + c];
            const bottom = s[(Math.min(h-1,y+1)*w + x)*4 + c];
            const sharp = center * (1 + 4*a) - (left + right + top + bottom) * a;
            d[i+c] = clamp(Math.round(sharp), 0, 255);
          }
          d[i+3] = s[i+3];
        }
      }
      ctx.putImageData(dst, 0, 0);
    }


    function tightenCropToPaper(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 700));
      const rowCounts = new Array(h).fill(0);
      const colCounts = new Array(w).fill(0);

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const active = diff > 26 || edge > 15 || (bright > 210 && sat < 45);
          if (active) {
            rowCounts[y]++;
            colCounts[x]++;
          }
        }
      }

      const rowThreshold = Math.max(2, Math.round((w / step) * 0.08));
      const colThreshold = Math.max(2, Math.round((h / step) * 0.08));
      let top = findActiveStart(rowCounts, rowThreshold);
      let bottom = findActiveEnd(rowCounts, rowThreshold);
      let left = findActiveStart(colCounts, colThreshold);
      let right = findActiveEnd(colCounts, colThreshold);

      if (top === -1 || left === -1 || bottom <= top || right <= left) return canvas;
      top = clamp(top - step * 2, 0, h - 1);
      left = clamp(left - step * 2, 0, w - 1);
      bottom = clamp(bottom + step * 2, 0, h - 1);
      right = clamp(right + step * 2, 0, w - 1);

      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.35 || bh < h * 0.35) return canvas;
      if (bw > w * 0.995 && bh > h * 0.995) return canvas;

      const out = document.createElement('canvas');
      out.width = Math.max(1, bw);
      out.height = Math.max(1, bh);
      const octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(canvas, left, top, bw, bh, 0, 0, out.width, out.height);
      return out;
    }


    function trimPaperBorder(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const bg = averageCornerColor(d, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 900));
      const xs = [], ys = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = d[i], g = d[i+1], b = d[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(d, w, h, x, y, step);
          const isPaperLike = bright > 170 || sat < 60 || diff > 22 || edge > 14;
          if (isPaperLike) { xs.push(x); ys.push(y); }
        }
      }
      if (xs.length < 60) return canvas;
      xs.sort((a,b)=>a-b); ys.sort((a,b)=>a-b);
      let left = xs[Math.floor(xs.length * 0.015)];
      let right = xs[Math.floor(xs.length * 0.985)];
      let top = ys[Math.floor(ys.length * 0.015)];
      let bottom = ys[Math.floor(ys.length * 0.985)];
      if (right <= left || bottom <= top) return canvas;
      left = clamp(left, 0, w - 1);
      top = clamp(top, 0, h - 1);
      right = clamp(right, 1, w);
      bottom = clamp(bottom, 1, h);
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.45 || bh < h * 0.45) return canvas;
      const out = document.createElement('canvas');
      out.width = Math.max(1, bw);
      out.height = Math.max(1, bh);
      const octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0,0,out.width,out.height);
      octx.drawImage(canvas, left, top, bw, bh, 0, 0, out.width, out.height);
      return out;
    }

    function forceToA4Canvas(canvas) {
      const portrait = canvas.height >= canvas.width;
      const longSide = 1100;
      const shortSide = Math.round(longSide / 1.41421356);
      const out = document.createElement('canvas');
      out.width = portrait ? shortSide : longSide;
      out.height = portrait ? longSide : shortSide;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      const scale = Math.min(out.width / canvas.width, out.height / canvas.height);
      const drawW = Math.round(canvas.width * scale);
      const drawH = Math.round(canvas.height * scale);
      const x = Math.round((out.width - drawW) / 2);
      const y = Math.round((out.height - drawH) / 2);
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, x, y, drawW, drawH);
      return out;
    }


    function isCardQuarterDoc(docKey) {
      const rawKey = String(docKey || '').toLowerCase();
      const key = rawKey.replace(/_[a-z0-9-]+$/i, '');
      // 중요: businessLicense(사업자등록증)에 license가 들어가므로 includes('license')를 쓰면 안 됩니다.
      // 카드형은 실제 신분증/면허증/기초안전보건교육 이수증만 지정합니다.
      return [
        'driveridcard',
        'driverlicense',
        'driverbasicsafetytraining',
        'workeridcard',
        'workersafetytraining'
      ].includes(key);
    }

    function shouldUseCardQuarterLayout(docKey, cropW, cropH, sourceW, sourceH) {
      if (!isCardQuarterDoc(docKey)) return false;
      const cw = Math.max(1, cropW || 0);
      const ch = Math.max(1, cropH || 0);
      const sw = Math.max(1, sourceW || cw);
      const sh = Math.max(1, sourceH || ch);
      const areaRatio = (cw * ch) / Math.max(1, sw * sh);
      const shapeRatio = Math.max(cw, ch) / Math.max(1, Math.min(cw, ch));

      // v23.7.156: 카드형 문서도 전체 카메라 화면을 무조건 A4 상단 1/2로 넣지 않습니다.
      // 카드 비율에 가깝고, 화면 일부로 잡힌 경우에만 상단 1/2 배치합니다.
      // A4 문서가 실수로 카드형처럼 저장되는 문제를 막기 위한 조건입니다.
      const cardLikeRatio = shapeRatio >= 1.18 && shapeRatio <= 2.35;
      const cardLikeSize = areaRatio >= 0.035 && areaRatio <= 0.72;
      return cardLikeRatio && cardLikeSize;
    }

    function makeA4QuarterCanvas(cardCanvas) {
      const longSide = 1100;
      const shortSide = Math.round(longSide / 1.41421356);
      const out = document.createElement('canvas');
      out.width = shortSide;
      out.height = longSide;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);

      const cellW = out.width / 2;
      const cellH = out.height / 2;
      const margin = Math.round(out.width * 0.035);
      const maxW = cellW - margin * 2;
      const maxH = cellH - margin * 2;
      const scale = Math.min(maxW / cardCanvas.width, maxH / cardCanvas.height, 1.8);
      const drawW = Math.max(1, Math.round(cardCanvas.width * scale));
      const drawH = Math.max(1, Math.round(cardCanvas.height * scale));
      const x = margin;
      const y = margin;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2, y - 2, drawW + 4, drawH + 4);
      ctx.drawImage(cardCanvas, 0, 0, cardCanvas.width, cardCanvas.height, x, y, drawW, drawH);
      ctx.strokeStyle = '#d7dfed';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, y - 1, drawW + 2, drawH + 2);
      return out;
    }


    function makeA4TopHalfCanvas(cardCanvas) {
      const longSide = 1100;
      const shortSide = Math.round(longSide / 1.41421356);
      const out = document.createElement('canvas');
      out.width = shortSide;
      out.height = longSide;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);

      const halfH = Math.round(out.height / 2);
      const marginX = Math.round(out.width * 0.016);
      const marginTop = Math.round(out.height * 0.010);
      const innerGap = Math.round(out.height * 0.008);
      const maxW = out.width - marginX * 2;
      const maxH = halfH - marginTop - innerGap;
      const scale = Math.min(maxW / Math.max(1, cardCanvas.width), maxH / Math.max(1, cardCanvas.height), 4.2);
      const drawW = Math.max(1, Math.round(cardCanvas.width * scale));
      const drawH = Math.max(1, Math.round(cardCanvas.height * scale));
      const x = Math.round((out.width - drawW) / 2);
      const y = marginTop + Math.max(0, Math.round((maxH - drawH) / 2));

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2, y - 2, drawW + 4, drawH + 4);
      ctx.drawImage(cardCanvas, 0, 0, cardCanvas.width, cardCanvas.height, x, y, drawW, drawH);
      ctx.strokeStyle = '#d7dfed';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, y - 1, drawW + 2, drawH + 2);
      ctx.strokeStyle = '#edf0f5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, halfH);
      ctx.lineTo(out.width, halfH);
      ctx.stroke();
      return out;
    }

    function findCardContentBBoxLoose(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return null;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 900));
      const xs = [], ys = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const active = diff > 24 || edge > 13 || (sat > 22 && bright < 248) || bright < 185;
          if (active) { xs.push(x); ys.push(y); }
        }
      }
      if (xs.length < 35) return null;
      xs.sort((a,b)=>a-b); ys.sort((a,b)=>a-b);
      let left = xs[Math.floor(xs.length * 0.005)];
      let right = xs[Math.floor(xs.length * 0.995)];
      let top = ys[Math.floor(ys.length * 0.005)];
      let bottom = ys[Math.floor(ys.length * 0.995)];
      if (right <= left || bottom <= top) return null;
      let bw = right - left;
      let bh = bottom - top;
      if (bw < Math.max(24, w * 0.035) || bh < Math.max(18, h * 0.025)) return null;

      const pad = Math.round(Math.max(bw, bh) * 0.055);
      left = clamp(left - pad, 0, w - 1);
      top = clamp(top - pad, 0, h - 1);
      right = clamp(right + pad, left + 1, w);
      bottom = clamp(bottom + pad, top + 1, h);
      bw = right - left;
      bh = bottom - top;

      if (bw > w * 0.94 && bh > h * 0.94) return null;
      return { x:left, y:top, w:bw, h:bh };
    }


    function findCardForegroundBox(canvas, regionRatio) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return null;
      const scanH = Math.max(1, Math.min(h, Math.round(h * (regionRatio || 1))));
      const data = ctx.getImageData(0, 0, w, scanH).data;
      const bg = averageCornerColor(data, w, scanH);
      const step = Math.max(1, Math.round(Math.max(w, scanH) / 700));
      const xs = [], ys = [];
      for (let y = 0; y < scanH; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const bright = (r + g + b) / 3;
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const sat = Math.max(r, g, b) - Math.min(r, g, b);
          const edge = estimateLocalEdge(data, w, scanH, x, y, step);
          if (diff > 14 || bright < 244 || sat > 10 || edge > 8) {
            xs.push(x);
            ys.push(y);
          }
        }
      }
      if (xs.length < 24) return null;
      xs.sort((a,b)=>a-b);
      ys.sort((a,b)=>a-b);
      let left = xs[Math.floor(xs.length * 0.01)];
      let right = xs[Math.floor(xs.length * 0.99)];
      let top = ys[Math.floor(ys.length * 0.01)];
      let bottom = ys[Math.floor(ys.length * 0.99)];
      if (!(right > left && bottom > top)) return null;
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.22 || bh < scanH * 0.08) return null;
      const pad = Math.round(Math.max(bw, bh) * 0.045);
      left = clamp(left - pad, 0, w - 1);
      top = clamp(top - pad, 0, scanH - 1);
      right = clamp(right + pad, left + 1, w);
      bottom = clamp(bottom + pad, top + 1, scanH);
      return { x:left, y:top, w:right-left, h:bottom-top };
    }


    function trimCardBottomWhitespace(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return canvas;
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(1, Math.round(Math.max(w, h) / 850));
      let bottom = h - 1;
      for (let y = h - 1; y >= 0; y -= step) {
        let active = 0;
        let checked = 0;
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          checked++;
          if (bright < 244 || sat > 12 || edge > 8) active++;
        }
        if (checked && active / checked > 0.018) {
          bottom = Math.min(h, y + Math.round(step * 2));
          break;
        }
      }
      if (bottom < h - Math.max(8, h * 0.018)) {
        return cropCanvas(canvas, { x:0, y:0, w, h:Math.max(1, bottom) }, 0);
      }
      return canvas;
    }

    function makeCardEditSourceCanvas(sourceCanvas, cropBox) {
      let card = sourceCanvas;
      if (cropBox) {
        const pad = Math.round(Math.max(cropBox.w, cropBox.h) * 0.025);
        card = cropCanvas(sourceCanvas, cropBox, pad);
      }

      // 카드형 수정편집은 A4 흰 배경이 아니라 카드 원본만 보이도록 먼저 상단 영역에서 카드 부분을 강하게 찾습니다.
      if (card.height > card.width * 1.12) {
        const focusBox = findCardForegroundBox(card, 0.62);
        if (focusBox) card = cropCanvas(card, focusBox, 0);
      }

      // 예전 A4 배치본처럼 흰 여백이 넓은 이미지도 카드 부분만 다시 추립니다.
      const looseBox = findCardContentBBoxLoose(card) || findCardForegroundBox(card, 1);
      if (looseBox) card = cropCanvas(card, looseBox, 0);
      card = trimUniformMargins(card, 6);
      card = trimCardBottomWhitespace(card);
      const looseBox2 = findCardContentBBoxLoose(card) || findCardForegroundBox(card, 1);
      if (looseBox2) card = cropCanvas(card, looseBox2, 0);
      card = trimUniformMargins(card, 3);
      card = trimCardBottomWhitespace(card);
      return card;
    }

    function makeCardTopHalfScanCanvas(sourceCanvas, cropBox) {
      const card = makeCardEditSourceCanvas(sourceCanvas, cropBox);
      // v23.7.172: 카드형은 수정편집은 카드 원본 기준으로 하고, 미리보기/저장은 A4 상단 1/2 칸에 크게 맞춥니다.
      return makeA4TopHalfCanvas(card);
    }

    // 이전 버전 함수명을 호출하는 남은 코드가 있어도 같은 상단 1/2 결과가 나오도록 호환 유지.
    function makeCardQuarterScanCanvas(sourceCanvas, cropBox) {
      return makeCardTopHalfScanCanvas(sourceCanvas, cropBox);
    }


    function smartA4DocumentScan(canvas, usedCrop, docKey) {
      let current = canvas;
      let cropped = !!usedCrop;
      const isBusiness = !docKey || docKey === 'businessLicense';

      current = trimUniformMargins(current, 3);
      let pass1 = detectContentBBox(current);
      if (pass1) {
        current = cropCanvas(current, pass1, 8);
        cropped = true;
      }

      current = tightenCropToPaper(current);
      current = trimPaperBorder(current);
      current = trimUniformMargins(current, 4);

      let pass2 = detectContentBBox(current);
      if (pass2) {
        current = cropCanvas(current, pass2, 8);
        cropped = true;
      }

      if (!isBusiness) {
        const forced1 = guessCenteredPaperBBox(current);
        if (forced1) {
          current = cropCanvas(current, forced1, 12);
          cropped = true;
        }
        current = trimUniformMargins(current, 6);
        current = trimPaperBorder(current);
        const forced2 = detectContentBBox(current) || guessCenteredPaperBBox(current);
        if (forced2) {
          current = cropCanvas(current, forced2, 10);
          cropped = true;
        }
      } else if (!cropped) {
        const gentle = guessCenteredPaperBBox(current);
        if (gentle) {
          current = cropCanvas(current, gentle, 8);
          cropped = true;
        }
      }

      const strict = findStrictPaperBBox(current, isBusiness);
      if (strict) {
        current = cropCanvas(current, strict, isBusiness ? 4 : 2);
        cropped = true;
      }

      // v23.7.158: 종이를 강제로 하얗게 만드는 자동보정 제거.
      // 글자가 빛에 날아가지 않도록 원본 밝기/색상을 유지하고 여백만 정리합니다.
      current = trimUniformMargins(current, isBusiness ? 4 : 8);
      const strictAfter = findWhitePaperBBox(current);
      if (strictAfter) {
        current = cropCanvas(current, strictAfter, 0);
        cropped = true;
      }
      current = forceToA4Canvas(current);
      return { canvas: current, cropped };
    }

    function detectContentBBox(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 850));
      const xs = [], ys = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const isDoc = diff > 22 || edge > 16 || (bright > 180 && sat < 45);
          if (isDoc) { xs.push(x); ys.push(y); }
        }
      }
      if (xs.length < 80) return null;
      xs.sort((a,b)=>a-b); ys.sort((a,b)=>a-b);
      const left = xs[Math.floor(xs.length * 0.01)];
      const right = xs[Math.floor(xs.length * 0.99)];
      const top = ys[Math.floor(ys.length * 0.01)];
      const bottom = ys[Math.floor(ys.length * 0.99)];
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.35 || bh < h * 0.35) return null;
      return { x:left, y:top, w:bw, h:bh };
    }


    function guessCenteredPaperBBox(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 900));
      const cx = Math.floor(w / 2);
      const cy = Math.floor(h / 2);

      function lineScoreX(x) {
        let active = 0, total = 0;
        for (let y = 0; y < h; y += step) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i+1] - bg.g) + Math.abs(data[i+2] - bg.b);
          if (diff > 18) active++;
          total++;
        }
        return active / Math.max(1, total);
      }
      function lineScoreY(y) {
        let active = 0, total = 0;
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i+1] - bg.g) + Math.abs(data[i+2] - bg.b);
          if (diff > 18) active++;
          total++;
        }
        return active / Math.max(1, total);
      }

      let left = 0, right = w - 1, top = 0, bottom = h - 1;
      for (let x = cx; x > 0; x -= step) { if (lineScoreX(x) < 0.06) { left = x; break; } }
      for (let x = cx; x < w - 1; x += step) { if (lineScoreX(x) < 0.06) { right = x; break; } }
      for (let y = cy; y > 0; y -= step) { if (lineScoreY(y) < 0.06) { top = y; break; } }
      for (let y = cy; y < h - 1; y += step) { if (lineScoreY(y) < 0.06) { bottom = y; break; } }

      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.45 || bh < h * 0.45) return { x: Math.round(w * 0.06), y: Math.round(h * 0.06), w: Math.round(w * 0.88), h: Math.round(h * 0.88) };
      return { x:left, y:top, w:bw, h:bh };
    }


    function findStrictPaperBBox(canvas, isBusiness) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 1000));
      const rowCounts = new Array(h).fill(0);
      const colCounts = new Array(w).fill(0);
      let totalSamplesPerRow = Math.ceil(w / step);
      let totalSamplesPerCol = Math.ceil(h / step);

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const likelyPaper = (bright > 155 && sat < 120) || diff > 20 || edge > 14;
          if (likelyPaper) {
            rowCounts[y]++;
            colCounts[x]++;
          }
        }
      }

      const rowThreshold = Math.max(2, Math.round(totalSamplesPerRow * (isBusiness ? 0.20 : 0.16)));
      const colThreshold = Math.max(2, Math.round(totalSamplesPerCol * (isBusiness ? 0.20 : 0.16)));

      let top = findActiveStart(rowCounts, rowThreshold);
      let bottom = findActiveEnd(rowCounts, rowThreshold);
      let left = findActiveStart(colCounts, colThreshold);
      let right = findActiveEnd(colCounts, colThreshold);
      if (top === -1 || left === -1 || bottom <= top || right <= left) return null;

      top = clamp(top, 0, h - 1);
      left = clamp(left, 0, w - 1);
      bottom = clamp(bottom, 1, h);
      right = clamp(right, 1, w);
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.45 || bh < h * 0.45) return null;
      return { x:left, y:top, w:bw, h:bh };
    }

    function findWhitePaperBBox(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(1, Math.round(Math.max(w, h) / 1200));
      const rowCounts = new Array(h).fill(0);
      const colCounts = new Array(w).fill(0);
      const rowThresholdBase = Math.ceil(w / step);
      const colThresholdBase = Math.ceil(h / step);

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const whitePaper = bright > 205 && sat < 55;
          if (whitePaper) {
            rowCounts[y]++;
            colCounts[x]++;
          }
        }
      }

      const rowThreshold = Math.max(2, Math.round(rowThresholdBase * 0.28));
      const colThreshold = Math.max(2, Math.round(colThresholdBase * 0.28));
      let top = findActiveStart(rowCounts, rowThreshold);
      let bottom = findActiveEnd(rowCounts, rowThreshold);
      let left = findActiveStart(colCounts, colThreshold);
      let right = findActiveEnd(colCounts, colThreshold);
      if (top === -1 || left === -1 || bottom <= top || right <= left) return null;
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.55 || bh < h * 0.55) return null;
      return { x:left, y:top, w:bw, h:bh };
    }

    function cropCanvas(canvas, bbox, pad) {
      const p = pad || 0;
      const x = clamp(Math.round(bbox.x - p), 0, canvas.width - 1);
      const y = clamp(Math.round(bbox.y - p), 0, canvas.height - 1);
      const w = clamp(Math.round(bbox.w + p * 2), 1, canvas.width - x);
      const h = clamp(Math.round(bbox.h + p * 2), 1, canvas.height - y);
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0,0,w,h);
      octx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
      return out;
    }

    function trimUniformMargins(canvas, tolerance) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 1000));
      const tol = tolerance || 4;

      function rowActive(y) {
        let active = 0, total = 0;
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i+1] - bg.g) + Math.abs(data[i+2] - bg.b);
          if (diff > 20) active++;
          total++;
        }
        return active > Math.max(2, total * 0.03);
      }
      function colActive(x) {
        let active = 0, total = 0;
        for (let y = 0; y < h; y += step) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i+1] - bg.g) + Math.abs(data[i+2] - bg.b);
          if (diff > 20) active++;
          total++;
        }
        return active > Math.max(2, total * 0.03);
      }

      let top = 0;
      while (top < h - 2 && !rowActive(top)) top += step;
      let bottom = h - 1;
      while (bottom > top + 2 && !rowActive(bottom)) bottom -= step;
      let left = 0;
      while (left < w - 2 && !colActive(left)) left += step;
      let right = w - 1;
      while (right > left + 2 && !colActive(right)) right -= step;

      top = clamp(top - tol, 0, h - 1);
      left = clamp(left - tol, 0, w - 1);
      bottom = clamp(bottom + tol, 1, h);
      right = clamp(right + tol, 1, w);
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.40 || bh < h * 0.40) return canvas;
      if (bw > w * 0.995 && bh > h * 0.995) return canvas;
      return cropCanvas(canvas, { x:left, y:top, w:bw, h:bh }, 0);
    }

    function whitenBackgroundToPaper(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const bg = averageCornerColor(d, w, h);
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        const bright = (r + g + b) / 3;
        const sat = Math.max(r,g,b) - Math.min(r,g,b);
        const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
        // 글자/도장까지 하얗게 날아가는 문제 방지: 아주 밝은 종이 배경만 살짝 정리합니다.
        const veryLightPaper = bright > 246 && sat < 24 && diff < 42;
        const nearCornerPaper = bright > 236 && sat < 28 && diff < 20;
        if (veryLightPaper || nearCornerPaper) {
          d[i] = Math.max(r, 248);
          d[i+1] = Math.max(g, 248);
          d[i+2] = Math.max(b, 248);
        }
      }
      ctx.putImageData(img, 0, 0);
      return canvas;
    }

    function averageCornerColor(data, w, h) {
      const sizeX = Math.max(8, Math.round(w * 0.08));
      const sizeY = Math.max(8, Math.round(h * 0.08));
      const corners = [
        sampleAreaAverage(data, w, h, 0, 0, sizeX, sizeY),
        sampleAreaAverage(data, w, h, w - sizeX, 0, sizeX, sizeY),
        sampleAreaAverage(data, w, h, 0, h - sizeY, sizeX, sizeY),
        sampleAreaAverage(data, w, h, w - sizeX, h - sizeY, sizeX, sizeY)
      ];
      return {
        r: corners.reduce((s, c) => s + c.r, 0) / corners.length,
        g: corners.reduce((s, c) => s + c.g, 0) / corners.length,
        b: corners.reduce((s, c) => s + c.b, 0) / corners.length
      };
    }

    function resizeCanvasIfNeeded(canvas, maxSize) {
      if (Math.max(canvas.width, canvas.height) <= maxSize) return canvas;
      const scale = maxSize / Math.max(canvas.width, canvas.height);
      const out = document.createElement('canvas');
      out.width = Math.max(1, Math.round(canvas.width * scale));
      out.height = Math.max(1, Math.round(canvas.height * scale));
      const octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(canvas, 0, 0, out.width, out.height);
      return out;
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function getSelectedPreviewDataUrl(page) {
      if (!page) return '';
      if (page.previewDataUrl) return page.previewDataUrl;
      if (page.previewChoice === 'original' && page.originalDataUrl) return page.originalDataUrl;
      if (page.previewChoice === 'corrected' && page.correctedDataUrl) return page.correctedDataUrl;
      return page.correctedDataUrl || page.originalDataUrl || '';
    }

    function makePagesForStorage(rawPages) {
      // 담당자 링크에서 사진이 보이려면 localStorage에 실제 이미지 미리보기 데이터가 남아야 합니다.
      // 기존 버전은 원본/보정본/선택본을 모두 저장해 용량이 커졌고, 저장공간 부족 시 사진 데이터를 모두 지워
      // 담당자 화면에 "첨부됨"만 보이는 문제가 있었습니다. 저장 시에는 선택된 미리보기 1장만 남깁니다.
      return (Array.isArray(rawPages) ? rawPages : []).filter(Boolean).map((page, index) => {
        const selectedPreview = getSelectedPreviewDataUrl(page);
        return {
          id: page.id || ('p_saved_' + Date.now() + '_' + index),
          fileName: page.fileName || '첨부파일',
          fileSource: page.fileSource || '',
          fileType: page.fileType || '',
          previewDataUrl: selectedPreview || '',
          editDataUrl: selectedPreview || '',
          originalDataUrl: '',
          correctedDataUrl: '',
          previewChoice: selectedPreview ? 'preview' : (page.previewChoice || ''),
          autoFit: page.autoFit || '',
          fitText: page.fitText || '',
          ratioText: page.ratioText || '',
          addedAt: page.addedAt || new Date().toISOString()
        };
      });
    }

    function collectDocData() {
      const docs = {};
      document.querySelectorAll('.doc-card').forEach(card => {
        const groupKey = card.dataset.groupKey || 'equipment';
        if (!isBundleGroupEnabled(groupKey)) return;
        const key = card.dataset.docKey;
        const def = DOCS.find(d => d.key === key);
        const fileBox = card.querySelector('[data-role="filename"]');
        const rawPages = getDocPagesFromCard(card);
        const pages = makePagesForStorage(rawPages);
        const isExpiry = card.dataset.expiry === 'true';
        let expireDate = '';
        const dateInput = isExpiry ? card.querySelector('[data-date-key]') : null;
        if (dateInput) expireDate = dateInput.value || '';
        const phoneValue = (card.querySelector('[data-extra-phone-key]')?.value || '').trim();
        const driverPhoneValue = (card.querySelector('[data-extra-key="driverPhone"]')?.value || '').trim();
        const workerTaskValue = (card.querySelector('[data-extra-task-key]')?.value || '').trim();
        const workerType = card.dataset.workerType || '';
        const workerUid = card.dataset.workerUid || '';
        const workerIndex = card.closest('.worker-person-card')?.dataset.workerIndex || '';
        const workerLabel = card.dataset.workerLabel || (workerType ? getWorkerTypeLabel(workerType) : '');
        const firstPrintable = pages.find(p => p.previewDataUrl) || pages[0] || {};

        docs[key] = {
          key,
          groupKey,
          groupTitle: def ? def.groupTitle : (groupKey === 'worker' ? '인부서류' : ''),
          title: card.dataset.docTitle,
          required: card.dataset.required === 'true',
          expiry: isExpiry,
          expireDate,
          pages,
          pageCount:pages.length,
          fileName: pages.length ? ('첨부 ' + pages.length + '장 · ' + summarizePages(pages)) : '',
          fileSource: firstPrintable.fileSource || fileBox.dataset.fileSource || '',
          fileType: firstPrintable.fileType || fileBox.dataset.fileType || '',
          previewDataUrl: firstPrintable.previewDataUrl || '',
          originalDataUrl: firstPrintable.originalDataUrl || '',
          correctedDataUrl: firstPrintable.correctedDataUrl || '',
          editDataUrl: firstPrintable.editDataUrl || firstPrintable.previewDataUrl || '',
          previewChoice: firstPrintable.previewChoice || '',
          autoFit: firstPrintable.autoFit || '',
          driverPhone: key === 'driverIdCard' ? (driverPhoneValue || phoneValue) : '',
          workerPhone: groupKey === 'worker' ? phoneValue : '',
          personPhone: phoneValue,
          workerTask: groupKey === 'worker' ? workerTaskValue : '',
          workerType,
          workerUid,
          workerIndex,
          workerLabel,
          docKind: card.dataset.docKind || '',
          authVerified: !isPrivateDocCard(card) || card.dataset.authVerified === 'true',
          authVerifiedAt: card.dataset.authVerifiedAt || '',
          authPhone: card.dataset.authPhone || (card.querySelector('[data-auth-phone-input]')?.value || '').trim(),
          authPersonName: card.dataset.authPersonName || '',
          authBirth6: card.dataset.authBirth6 || '',
          authGenderDigit: card.dataset.authGenderDigit || '',
          authCarrier: card.dataset.authCarrier || ''
        };
        docs[key].status = getDocStatus(docs[key]);
      });
      return docs;
    }

    function collectWorkerPeopleMeta() {
      return Array.from(document.querySelectorAll('#workerPeopleList .worker-person-card')).map((card, index) => {
        const uid = card.dataset.workerUid || '';
        const type = card.dataset.workerType || 'normal';
        const idCard = card.querySelector('[data-doc-kind="workerIdCard"]');
        return {
          uid,
          index:index + 1,
          type,
          label:getWorkerTypeLabel(type),
          phone:(idCard?.querySelector('[data-extra-phone-key]')?.value || '').trim(),
          task:(idCard?.querySelector('[data-extra-task-key]')?.value || '').trim(),
          docKeys:['workerIdCard_' + uid, 'workerSafetyTraining_' + uid, 'workerSpecialHealthCheck_' + uid, 'otherWorkerDoc_' + uid]
        };
      });
    }

    function validateWorkerPeople(docs) {
      const missingFiles = [];
      if (!isBundleGroupEnabled('worker')) return { missingFiles };
      const people = collectWorkerPeopleMeta();
      if (!people.length) {
        missingFiles.push('인부서류 - 인부 1명 이상 추가');
        return { missingFiles };
      }
      people.forEach(person => {
        const prefix = '인부서류 - 인부 ' + person.index + ' ' + person.label;
        const idDoc = docs['workerIdCard_' + person.uid];
        const safetyDoc = docs['workerSafetyTraining_' + person.uid];
        if (!idDoc || !idDoc.fileName) missingFiles.push(prefix + ' 신분증');
        if (!safetyDoc || !safetyDoc.fileName) missingFiles.push(prefix + ' 건설기초안전보건교육 이수증');
      });
      return { missingFiles };
    }

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
      const isAdditionalRegistration = isNewRegistration && items.length > 0;
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
        let saved = setItems(items);
        let savedLight = false;
        if (!saved) {
          const lightItems = items.map(makeStorageLightItem);
          saved = setItems(lightItems);
          savedLight = saved;
        }
        if (!saved) {
          alert('브라우저 임시 저장공간이 부족해서 저장하지 못했습니다. 기존 코드를 삭제하거나 사진 없이 다시 확인해주세요.');
          return;
        }
        try { await saveEquipmentItemToSupabase(item, 'edit'); } catch (e) { console.warn('수정 장비 서버 저장 실패:', e); }
        const editSavedLightNote = savedLight ? (String.fromCharCode(10) + String.fromCharCode(10) + '용량을 줄이기 위해 원본/보정본 비교데이터는 제외하고 담당자용 사진 미리보기만 저장했습니다.') : '';
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
      // v23.7.281: 장비등록 직후 결제대기 상태라도 보관함/관리자 장비수에 보이게 먼저 저장합니다.
      // 결제완료 시 같은 code를 찾아 유료 상태로 갱신합니다.
      const pendingItems = getItems();
      if (!pendingItems.some(x => String(x.code || '') === String(item.code || ''))) {
        pendingItems.unshift(item);
        let pendingSaved = setItems(pendingItems);
        if (!pendingSaved) pendingSaved = setItems(pendingItems.map(makeStorageLightItem));
        if (!pendingSaved) {
          alert('서류 확인은 완료되었지만 브라우저 저장공간이 부족해서 장비등록 목록에 저장하지 못했습니다. 사진 용량을 줄이거나 기존 코드를 정리한 뒤 다시 시도해주세요.');
          return;
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
      let saved = setItems(items);
      let savedLight = false;
      if (!saved) {
        const lightItems = items.map(makeStorageLightItem);
        saved = setItems(lightItems);
        savedLight = saved;
      }
      if (!saved) {
        alert('결제는 확인되었지만 브라우저 저장공간이 부족해서 서류함을 저장하지 못했습니다. 기존 코드를 삭제하거나 사진 용량을 줄여주세요.');
        return;
      }
      let paidServerResult = null;
      try { paidServerResult = await saveEquipmentItemToSupabase(paidItem, 'payment_completed'); } catch (e) { console.warn('결제완료 장비 서버 저장 실패:', e); paidServerResult = { ok:false, error:e }; }
      try { await syncSupabaseEquipmentItems(true); } catch (e) {}
      clearPendingRegistration();
      clearRegistrationDraft();
      updateHomeRegistrationButton();
      resetForm(false);
      const paymentSavedLightNote = savedLight ? (String.fromCharCode(10) + String.fromCharCode(10) + '용량을 줄이기 위해 담당자용 사진 미리보기만 저장했습니다.') : '';
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
        return mergePendingRegistrationIntoItems(mergeEquipmentItemLists.apply(null, localLists));
      }
      catch (error) { return mergePendingRegistrationIntoItems([]); }
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
      if (pendingRegistrationItemMemory && pendingRegistrationItemMemory.item) return pendingRegistrationItemMemory;
      try {
        const raw = sessionStorage.getItem(PENDING_REGISTRATION_KEY) || localStorage.getItem(PENDING_REGISTRATION_KEY) || '';
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.item) {
          pendingRegistrationItemMemory = parsed;
          return parsed;
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

    function hasRegisteredEquipmentBundle() {
      return getItems().length > 0;
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
      return getItems().length > 0;
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

    function completeAutoPaymentForItem(code, plan, sourceLabel, options) {
      const items = getItems();
      const idx = items.findIndex(item => String(item.code || '') === String(code || ''));
      if (idx < 0) return { ok:false, message:'결제할 서류함을 찾을 수 없습니다.', code:code || '' };
      const info = getPlanInfo(plan || 'monthly', { additional: !!(options && options.additional) });
      const now = new Date();
      const nowIso = now.toISOString();
      const currentEnd = items[idx].trialEndsAt ? new Date(items[idx].trialEndsAt) : now;
      const base = currentEnd.getTime() > now.getTime() ? currentEnd : now;
      const newEnd = addDaysIso(base.toISOString(), info.days);
      const freshManagerExpireAt = new Date(getSevenDaysFromNowMs()).toISOString();
      items[idx] = {
        ...items[idx],
        serviceStatus:info.serviceStatus,
        paymentPlan:info.key,
        basicPlan:info.planText,
        alertPlan:items[idx].alertPlan || '보험·검사 만료 알림 포함 준비',
        paidAt:nowIso,
        trialEndsAt:newEnd,
        managerExpireAt:freshManagerExpireAt,
        managerShareToken:makeManagerShareToken(),
        paymentStatus:'자동결제완료',
        paymentAmount:info.price,
        paymentMethod:'자동결제 링크 확인',
        autoPaymentSource:sourceLabel || '자동결제 성공 링크',
        autoPaymentLastAt:nowIso,
        autoPaymentReceiptNo:'AUTO-TEST-' + Date.now(),
        updatedAt:nowIso
      };
      if (items[idx].paymentConversionTest) items[idx].paymentTestPaid = true;
      if (items[idx].bundleMeta) items[idx].bundleMeta.paymentText = info.planText + ' 자동결제완료';
      setItems(items);
      const memberUpdated = applyAutoPaymentResultToOwnerMember(items[idx], info, nowIso, newEnd);
      return { ok:true, item:items[idx], info, newEnd, memberUpdated, message:info.label + ' 자동결제가 완료되었습니다.' };
    }

    function handleAutoPaymentHash(hash, silent) {
      const rawHash = String(hash || window.location.hash || '');
      const raw = rawHash.replace(/^#pay=/, '');
      const parts = raw.split('&');
      const code = decodeURIComponent(parts.shift() || '');
      const params = {};
      parts.forEach(part => {
        const pair = part.split('=');
        params[decodeURIComponent(pair[0] || '')] = decodeURIComponent(pair.slice(1).join('=') || '');
      });
      const plan = params.plan === 'annual' ? 'annual' : 'monthly';
      const additional = params.tier === 'additional';
      const result = completeAutoPaymentForItem(code, plan, '자동결제 링크 확인', { additional });
      if (!silent) {
        if (!result.ok) {
          alert(result.message || '자동결제 처리에 실패했습니다.');
          return result;
        }
        alert(result.info.label + ' 링크 결제가 성공 처리되었습니다.\n\n장비 QR·담당자 링크가 바로 활성화되었습니다.\n새 종료일: ' + formatDateOnly(result.newEnd));
        renderPricingTargetList();
        renderDetail(code);
      }
      return result;
    }

    function runManagerSevenDayLinkSelfTest() {
      createPaymentConversionTestData();
      expireUnpaidPaymentTestData();
      const items = getItems().filter(isPaymentTestItem);
      const target = items.find(item => item.paymentTestPaid !== true && isServiceShareBlocked(item));
      if (!target) {
        alert('7일 링크 만료검사에 사용할 미결제 임시 장비가 없습니다.\n임시 50명 / 장비 100대를 다시 생성해주세요.');
        return;
      }
      handleAutoPaymentHash(makeAutoPaymentHash(target.code, 'monthly'), true);
      const paidItem = getItemByCode(target.code);
      const box = document.getElementById('managerPrintBox');
      const validExp = getSevenDaysFromNowMs();
      const validSig = getManagerLinkSignature(paidItem.code, validExp);
      renderManagerPrint(paidItem.code, validExp, validSig);
      const validOpen = box.innerHTML.includes('다운로드/프린트') && !box.innerHTML.includes('만료된 담당자') && !box.innerHTML.includes('일시정지');
      const expiredExp = Date.now() - 1000;
      const expiredSig = getManagerLinkSignature(paidItem.code, expiredExp);
      renderManagerPrint(paidItem.code, expiredExp, expiredSig);
      const expiredBlocked = box.innerHTML.includes('만료된 담당자 QR·링크입니다.');
      renderManagerPrint(paidItem.code, Date.now() + (365 * 24 * 60 * 60 * 1000), 'FAKE-SIG');
      const tamperBlocked = box.innerHTML.includes('올바르지 않은 담당자 QR·링크입니다.');
      alert('담당자 7일 링크 만료검사 결과\n\n' +
        '대상 장비: ' + getShareItemLabel(paidItem) + '\n' +
        '결제상태: 1개월 자동결제 성공 처리\n' +
        '7일 안 링크 접속: ' + (validOpen ? '정상 열림' : '오류') + '\n' +
        '7일 지난 링크 접속: ' + (expiredBlocked ? '정상 차단' : '오류') + '\n' +
        '만료시간 조작 링크: ' + (tamperBlocked ? '정상 차단' : '오류') + '\n\n' +
        ((validOpen && expiredBlocked && tamperBlocked) ? '결과: 정상입니다.' : '결과: 확인이 필요합니다.'));
      renderPricingTargetList();
    }

    function runAutoPaymentLinkSelfTest() {
      if (!isSuperAdminLoggedIn()) { alert('자동결제 링크 검사는 최고관리자만 가능합니다.'); return; }
      const blocked = getItems().filter(item => isPaymentTestItem(item) && item.paymentTestPaid !== true && isServiceShareBlocked(item));
      if (blocked.length < 3) {
        alert('차단된 미결제 임시 장비가 부족합니다.\n\n먼저 [임시 50명 / 장비 100대 생성] → [베타기간 강제 종료]를 눌러주세요.');
        return;
      }
      const monthlyCode = blocked[0].code;
      const annualCode = blocked[1].code;
      const untouchedCode = blocked[2].code;
      const beforeMonthlyBlocked = isServiceShareBlocked(getItemByCode(monthlyCode));
      const beforeAnnualBlocked = isServiceShareBlocked(getItemByCode(annualCode));
      const monthlyResult = handleAutoPaymentHash(makeAutoPaymentHash(monthlyCode, 'monthly'), true);
      const annualResult = handleAutoPaymentHash(makeAutoPaymentHash(annualCode, 'annual'), true);
      const monthlyItem = getItemByCode(monthlyCode);
      const annualItem = getItemByCode(annualCode);
      const untouchedItem = getItemByCode(untouchedCode);
      const monthlyDays = Math.ceil((new Date(monthlyItem.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
      const annualDays = Math.ceil((new Date(annualItem.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
      const monthlyOk = beforeMonthlyBlocked && monthlyResult.ok && !isServiceShareBlocked(monthlyItem) && monthlyItem.paymentPlan === 'monthly' && monthlyDays >= 29 && monthlyDays <= 31;
      const annualOk = beforeAnnualBlocked && annualResult.ok && !isServiceShareBlocked(annualItem) && annualItem.paymentPlan === 'annual' && annualDays >= 364 && annualDays <= 366;
      const untouchedOk = isServiceShareBlocked(untouchedItem);
      const allOk = monthlyOk && annualOk && untouchedOk;
      alert('자동결제 링크 검사 결과\n\n1개월결제 링크: ' + (monthlyOk ? '정상' : '오류') + '\n- 장비코드: ' + monthlyCode + '\n- 남은기간: 약 ' + monthlyDays + '일\n- QR 접속: ' + (!isServiceShareBlocked(monthlyItem) ? '가능' : '차단') + '\n\n1년결제 링크: ' + (annualOk ? '정상' : '오류') + '\n- 장비코드: ' + annualCode + '\n- 남은기간: 약 ' + annualDays + '일\n- QR 접속: ' + (!isServiceShareBlocked(annualItem) ? '가능' : '차단') + '\n\n결제하지 않은 다른 장비 유지차단: ' + (untouchedOk ? '정상' : '오류') + '\n\n' + (allOk ? '정상입니다. 관리자 수동처리 없이 자동결제 링크만으로 QR이 활성화됩니다.' : '오류가 있습니다. 위 항목을 확인해야 합니다.'));
      renderAdmin();
    }

    function renderPricingScreen() {
      const savedPlan = localStorage.getItem(SELECTED_PAYMENT_PLAN_KEY) || 'monthly';
      const radio = document.querySelector('input[name="paymentPlan"][value="' + savedPlan + '"]');
      if (radio) radio.checked = true;
      updateSelectedPaymentPlan();
      const pending = getPendingRegistration();
      const renewCard = document.getElementById('pricingRenewCard');
      if (renewCard) {
        // 추가등록 결제 중에는 기존 장비 연장결제창을 숨겨서 결제 대상이 헷갈리지 않게 합니다.
        renewCard.classList.toggle('hidden', !!(pending && pending.item && pending.paymentTier === 'additional'));
      }
    }

    function startRegistrationWithSelectedPlan() {
      const pending = getPendingRegistration();
      if (pending && pending.item) {
        // v23.7.282: 결제하기 직전에 결제 입력칸을 다시 그리면 주민번호/통신사/카드정보가 사라집니다.
        // 그래서 결제대기 상태에서는 입력값을 유지한 채 바로 결제완료 검증으로 들어갑니다.
        completePendingRegistrationPayment(getSelectedPaymentPlan());
        return;
      }
      updateSelectedPaymentPlan();
      startNewRegistration();
    }

    function getPaymentDueDays(item) {
      const payments = getAdminPaymentsModule();
      if (payments.getPaymentDueDays) return payments.getPaymentDueDays(item);
      if (!item || !item.trialEndsAt) return null;
      const end = new Date(item.trialEndsAt).getTime();
      if (Number.isNaN(end)) return null;
      return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
    }

    function isPaymentDueSoon(item) {
      const payments = getAdminPaymentsModule();
      if (payments.isPaymentDueSoon) return payments.isPaymentDueSoon(item, 7);
      const diff = getPaymentDueDays(item);
      return diff !== null && diff <= 7;
    }

    function getPaymentDueText(item) {
      const payments = getAdminPaymentsModule();
      if (payments.getPaymentDueText) return payments.getPaymentDueText(item);
      if (!item || !item.trialEndsAt) return '종료일 미설정';
      const diff = Math.ceil((new Date(item.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));
      if (diff < 0) return Math.abs(diff) + '일 지남';
      if (diff === 0) return '오늘 종료';
      return diff + '일 남음';
    }

    function renderRenewPanel(item) {
      if (!item) return '';
      const dueText = getPaymentDueText(item);
      const showChip = isPaymentDueSoon(item) ? '<div class="renew-chip">연장 필요 · ' + escapeHtml(dueText) + '</div>' : '<div class="small">종료까지 ' + escapeHtml(dueText) + '</div>';
      const additional = isAdditionalPaymentItem(item);
      const monthlyInfo = getPlanInfo('monthly', { additional });
      const annualInfo = getPlanInfo('annual', { additional });
      return '<div class="renew-panel"><b>결제/연장</b><span>' + (additional ? '추가등록 장비 요금으로 연장됩니다.' : '첫 1대 등록 요금으로 연장됩니다.') + ' 현재 종료일 기준으로 기간이 연장되고, 카드/휴대폰 결제는 본인 명의 확인을 한 번 더 진행합니다.</span>' + showChip + '<div class="renew-actions"><button class="ghost" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'monthly\')">' + escapeHtml(monthlyInfo.price) + ' 연장</button><button class="primary" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'annual\')">' + escapeHtml(annualInfo.price) + ' 연장</button></div></div>';
    }

    function renderListRenewButton(item) {
      if (!item || !isPaymentDueSoon(item)) return '';
      const diff = getPaymentDueDays(item);
      const title = diff === 0 ? '오늘 기간만료 알림' : '기간만료 ' + Math.max(diff || 0, 0) + '일 전 알림';
      const guide = diff === 0
        ? '오늘 만료됩니다. 회원에게 기간연장 사이트 링크를 보내고 결제 후 QR을 다시 활성화합니다.'
        : getPaymentDueText(item) + ' · 만료 7일 전부터 회원에게 연장 안내를 보낼 수 있습니다.';
      return '<div class="renew-panel"><b>' + escapeHtml(title) + '</b><span>' + escapeHtml(guide) + '</span><div class="renew-actions"><button class="okBtn" onclick="sendPaymentRenewalNotice(\'' + escapeJs(item.code) + '\')">연장 알림 보내기</button><button class="ghost" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'monthly\')">월 연장</button><button class="primary" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'annual\')">연 연장</button></div></div>';
    }

    function renderPricingTargetList() {
      const box = document.getElementById('pricingTargetList');
      if (!box) return;
      const items = getItems();
      const plan = getSelectedPaymentPlan();
      if (!items.length) {
        box.innerHTML = '<div class="empty">아직 등록된 서류함이 없습니다.<br>첫 장비는 서류 등록 후 월 2,000원 또는 연 19,900원 결제를 완료하면 QR링크가 생성됩니다.</div>';
        return;
      }
      box.innerHTML = items.map(item => {
        const additional = isAdditionalPaymentItem(item, items);
        const info = getPlanInfo(plan, { additional });
        const monthlyInfo = getPlanInfo('monthly', { additional });
        const annualInfo = getPlanInfo('annual', { additional });
        const tier = additional ? 'additional' : 'first';
        const monthlyLink = makeAutoPaymentTestLink(item.code, 'monthly', tier);
        const annualLink = makeAutoPaymentTestLink(item.code, 'annual', tier);
        return '<div class="list-item"><strong>' + escapeHtml(getItemTitle(item)) + '</strong>' +
          '<div class="small">현재 상태: ' + escapeHtml(getServiceStatusText(item)) + '</div>' +
          '<div class="small">적용 구분: ' + (additional ? '2대부터 추가등록 요금' : '1대 등록 기본요금') + '</div>' +
          '<div class="small">선택 요금제: ' + escapeHtml(info.label + ' / ' + info.price) + '</div>' +
          '<div class="renew-panel"><b>자동결제 링크 확인</b><span>결제 성공 링크가 돌아왔을 때 QR·담당자 링크가 바로 열리는지 확인합니다.</span>' +
            '<div class="renew-actions">' +
              '<a class="auto-pay-link monthly" href="' + escapeHtml(monthlyLink) + '">' + escapeHtml(monthlyInfo.price) + ' 결제 확인</a>' +
              '<a class="auto-pay-link annual" href="' + escapeHtml(annualLink) + '">' + escapeHtml(annualInfo.price) + ' 결제 확인</a>' +
            '</div>' +
          '</div>' +
          '<div class="actions"><button class="okBtn" onclick="sendPaymentRenewalNotice(\'' + escapeJs(item.code) + '\')">연장 알림 보내기</button><button class="primary" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'' + escapeJs(plan) + '\')">선택한 요금제로 수동연장</button><button class="ghost" onclick="renderDetail(\'' + escapeJs(item.code) + '\')">상세보기</button></div></div>';
      }).join('');
    }


    function buildPaymentRenewalNoticeText(item) {
      const diff = getPaymentDueDays(item);
      const additional = isAdditionalPaymentItem(item);
      const monthlyLink = makeAutoPaymentTestLink(item.code, 'monthly', additional ? 'additional' : 'first');
      const annualLink = makeAutoPaymentTestLink(item.code, 'annual', additional ? 'additional' : 'first');
      const title = diff === 0 ? '오늘 SitePass 이용기간이 만료됩니다.' : 'SitePass 이용기간이 ' + getPaymentDueText(item) + ' 남았습니다.';
      return '[SitePass 기간연장 안내]\n' +
        title + '\n' +
        '장비/서류함: ' + getItemTitle(item) + '\n' +
        '월 결제: ' + getPlanInfo('monthly', { additional }).price + '\n' +
        '연 결제: ' + getPlanInfo('annual', { additional }).price + '\n\n' +
        '기간연장 사이트에서 결제하면 QR·담당자 링크가 다시 활성화됩니다.\n' +
        '월 결제 링크: ' + monthlyLink + '\n' +
        '연 결제 링크: ' + annualLink;
    }

    function sendPaymentRenewalNotice(code) {
      const item = getItemByCode(code);
      if (!item) { alert('알림을 보낼 서류함을 찾을 수 없습니다.'); return; }
      const text = buildPaymentRenewalNoticeText(item);
      const phone = normalizePhoneForShare(item.ownerPhone || '');
      if (phone) {
        openSmsShareToPhones([phone], text);
      } else {
        openSmsShare(text);
      }
    }

    function requirePasswordReconfirm(actionLabel) {
      const label = actionLabel || '중요 작업';
      const input = prompt(label + '은 로그인 상태여도 확인번호 입력이 필요합니다.\n\n현재 임시 확인번호 1234를 입력해주세요.');
      if (input === null) return false;
      if (String(input).trim() !== '1234') {
        alert('확인번호가 맞지 않습니다. 현재 임시 확인번호는 1234입니다.');
        return false;
      }
      return true;
    }

    function renewItemService(code, plan) {
      if (!requirePaymentOwnerVerification('결제/연장')) return;
      const items = getItems();
      const idx = items.findIndex(x => x.code === code);
      if (idx < 0) { alert('연장할 서류함을 찾을 수 없습니다.'); return; }
      const info = getPlanInfo(plan || getSelectedPaymentPlan(), { additional: isAdditionalPaymentItem(items[idx], items) });
      const now = new Date();
      const currentEnd = items[idx].trialEndsAt ? new Date(items[idx].trialEndsAt) : now;
      const base = currentEnd.getTime() > now.getTime() ? currentEnd : now;
      const newEnd = addDaysIso(base.toISOString(), info.days);
      const freshManagerExpireAt = new Date(getSevenDaysFromNowMs()).toISOString();
      items[idx] = {
        ...items[idx],
        serviceStatus: info.serviceStatus,
        paymentPlan: info.key,
        basicPlan: info.planText,
        alertPlan: '보험·검사 만료 알림 포함 준비',
        paidAt: new Date().toISOString(),
        trialEndsAt: newEnd,
        managerExpireAt: freshManagerExpireAt,
        updatedAt: new Date().toISOString()
      };
      if (items[idx].paymentConversionTest) items[idx].paymentTestPaid = true;
      if (items[idx].bundleMeta) items[idx].bundleMeta.paymentText = info.planText + ' 결제완료';
      setItems(items);
      alert(info.label + ' 연장이 완료되었습니다.\n새 종료일: ' + formatDateOnly(newEnd));
      renderPricingTargetList();
      if (!document.getElementById('detailScreen')?.classList.contains('hidden')) renderDetail(code);
      if (!document.getElementById('listScreen')?.classList.contains('hidden')) renderList();
    }

    function addDaysIso(baseIso, days) {
      const payments = getAdminPaymentsModule();
      if (payments.addDaysIso) return payments.addDaysIso(baseIso, days);
      const d = new Date(baseIso);
      d.setDate(d.getDate() + days);
      return d.toISOString();
    }

    function isQrPaused(item) {
      const payments = getAdminPaymentsModule();
      if (payments.isQrPaused) return payments.isQrPaused(item);
      if (!item) return false;
      if (item.serviceStatus === '정지') return true;
      if (!item.trialEndsAt) return false;
      return new Date(item.trialEndsAt).getTime() < Date.now();
    }


    function isServiceShareBlocked(item) {
      const payments = getAdminPaymentsModule();
      if (payments.isServiceShareBlocked) return payments.isServiceShareBlocked(item);
      return isQrPaused(item);
    }

    function getServiceBlockReason(item) {
      const payments = getAdminPaymentsModule();
      if (payments.getServiceBlockReason) return payments.getServiceBlockReason(item);
      if (!item) return '서류함 없음';
      if (item.serviceStatus === '정지') return '관리자 정지';
      if (!item.trialEndsAt) return '결제기간 미설정';
      const overdueDays = getServiceOverdueDays(item);
      if (overdueDays !== null && overdueDays >= 14) return '유예 14일 이상 경과';
      return '실사용 베타기간/결제기간 만료';
    }

    function getShareBlockedItems(items) {
      const payments = getAdminPaymentsModule();
      if (payments.getShareBlockedItems) return payments.getShareBlockedItems(items);
      return (items || []).filter(item => item && isServiceShareBlocked(item));
    }

    function canUseQrShareItems(items, actionLabel, silent) {
      const safeItems = (items || []).filter(Boolean);
      const blocked = getShareBlockedItems(safeItems);
      if (!blocked.length) return true;
      const preview = blocked.slice(0, 8).map((item, index) => {
        return (index + 1) + '. ' + getShareItemLabel(item) + ' / ' + getServiceBlockReason(item);
      }).join('\n');
      if (!silent) {
        alert((actionLabel || 'QR 보내기') + '가 차단되었습니다.\n\n유료 전환 후 결제하지 않았거나 기간이 만료된 장비는 담당자 QR·링크를 새로 보내거나 열 수 없습니다.\n\n차단 대상 ' + blocked.length + '건\n' + preview + (blocked.length > 8 ? '\n외 ' + (blocked.length - 8) + '건' : '') + '\n\n관리자에서 결제처리 또는 회원 연장 후 다시 확인하세요.');
      }
      return false;
    }

    function renderServiceBlockedBox(item) {
      return '<div class="manager-expire-box"><b>결제 미완료로 QR·링크가 일시정지되었습니다.</b><br>' +
        '베타기간 또는 결제기간이 끝난 장비서류입니다. 결제/연장 전에는 담당자 화면, 다운로드, 프린트, 공유가 열리지 않습니다.<br>' +
        '<span class="small">장비: ' + escapeHtml(getShareItemLabel(item)) + '<br>차단사유: ' + escapeHtml(getServiceBlockReason(item)) + '<br>서비스상태: ' + escapeHtml(getServiceStatusText(item)) + '</span></div>';
    }

    function getServiceStatusText(item) {
      const payments = getAdminPaymentsModule();
      if (payments.getServiceStatusText) return payments.getServiceStatusText(item);
      if (!item) return '상태 없음';
      if (isQrPaused(item)) {
        const overdueDays = getServiceOverdueDays(item);
        if (overdueDays !== null && overdueDays >= 14) return '유예 14일 이상 경과 / QR 일시정지';
        return '실사용 베타 만료 / QR 일시정지';
      }
      const endText = item.trialEndsAt ? formatDateOnly(item.trialEndsAt) : '기간 미설정';
      return (item.serviceStatus || '실사용베타') + ' · 종료일 ' + endText;
    }

    function formatDateOnly(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    }


    function getAdminRoleBadgeClass(role) {
      if (role === SUPER_ADMIN_ROLE_NAME) return 'done';
      if (role === '관리자' || role === '운영관리자' || role === '조회관리자') return 'need';
      return 'need';
    }


    function getWithdrawnMembers() {
      try {
        return JSON.parse(localStorage.getItem(ADMIN_WITHDRAWN_MEMBERS_KEY) || '[]') || [];
      } catch (e) {
        return [];
      }
    }

    function setWithdrawnMembers(list) {
      localStorage.setItem(ADMIN_WITHDRAWN_MEMBERS_KEY, JSON.stringify(list || []));
    }

    function getVisibleWithdrawnMembers() {
      try {
        const withdrawnTotal = Number(adminMemberSummaryStats?.withdrawn?.total ?? NaN);
        // v23.7.241: 서버 초기화 후 최고관리자만 남으면 전체회원/신규회원/일반회원에는 최고관리자를 포함하지 않고, 예전 강제탈퇴 기록도 표시하지 않습니다.
        // 실제 탈퇴/강제탈퇴가 새로 발생하면 서버 통계 또는 새 local 기록으로 다시 표시됩니다.
        if (Number.isFinite(withdrawnTotal) && withdrawnTotal === 0) return [];
      } catch (e) {}
      return getWithdrawnMembers();
    }

    function clearLocalWithdrawnIfServerSaysZero() {
      try {
        const withdrawnTotal = Number(adminMemberSummaryStats?.withdrawn?.total ?? NaN);
        if (Number.isFinite(withdrawnTotal) && withdrawnTotal === 0) {
          localStorage.removeItem(ADMIN_WITHDRAWN_MEMBERS_KEY);
        }
      } catch (e) {}
    }

    function normalizeMemberKey(value) {
      return String(value || '').trim().toLowerCase();
    }

    function getMemberLoginKeys(member) {
      if (!member) return [];
      const rawKeys = [
        ...(Array.isArray(member.withdrawalBlockKeys) ? member.withdrawalBlockKeys : []),
        member.supabaseLoginId,
        member.supabaseAuthUserId,
        member.authUserId,
        member.userId,
        member.providerId,
        (normalizeSignupProviderKey(member.signupMethod || member.provider || '') === 'kakao' && (member.providerId || member.kakaoUserId)) ? ('kakao_' + String(member.providerId || member.kakaoUserId || '').replace(/^KAKAO[-_:]/i, '').trim()) : '',
        (normalizeSignupProviderKey(member.signupMethod || member.provider || '') === 'naver' && (member.providerId || member.naverUserId)) ? ('naver_' + String(member.providerId || member.naverUserId || '').replace(/^NAVER[-_:]/i, '').trim()) : '',
        member.signupId,
        member.kakaoUserId ? 'KAKAO-' + member.kakaoUserId : '',
        member.kakaoUserId || '',
        member.naverUserId ? 'NAVER-' + member.naverUserId : '',
        member.naverUserId || '',
        member.id,
        member.phone ? String(member.phone || '').replace(/[^0-9]/g, '') : '',
        member.email || ''
      ];
      return Array.from(new Set(rawKeys.map(normalizeMemberKey).filter(Boolean)));
    }

    function isWithdrawnStatusValue(value) {
      const v = String(value || '').trim().toLowerCase();
      return ['withdrawn', 'deleted', 'force_withdrawn', '강제탈퇴', '회원탈퇴', '탈퇴', '삭제'].includes(v);
    }

    function isMemberWithdrawnOrBlocked(member) {
      if (!member) return false;
      if (member.withdrawn === true) return true;
      if (isWithdrawnStatusValue(member.status) || isWithdrawnStatusValue(member.memberStatus) || isWithdrawnStatusValue(member.plan_type)) return true;
      return !!findWithdrawnMemberRecord(member);
    }

    function filterActiveRowsOnly(rows) {
      return (rows || []).filter(row => {
        if (!row) return false;
        // v23.7.225: 관리자 서버 회원목록은 서버 status/plan_type만 기준으로 판단합니다.
        // 휴대폰/PWA localStorage에 남은 예전 탈퇴 기록으로 서버 active 회원을 숨기면
        // 카카오 가입자가 최고관리자 화면에 안 보이는 문제가 생깁니다.
        if (isWithdrawnStatusValue(row.status) || isWithdrawnStatusValue(row.plan_type) || isWithdrawnStatusValue(row.memberStatus)) return false;
        return true;
      });
    }

    function removeRowsByMemberKeys(rows, member) {
      const keys = getMemberLoginKeys(member);
      if (!keys.length) return rows || [];
      return (rows || []).filter(row => {
        const rowMember = makeLocalMemberFromSupabaseRow(row);
        const rowKeys = getMemberLoginKeys(rowMember);
        return !rowKeys.some(key => keys.includes(key));
      });
    }

    function filterRowsExcludingLocalWithdrawn(rows) {
      // v23.7.241: 회원이 방금 탈퇴했는데 서버/RPC 반영이 한 박자 늦을 때
      // 같은 브라우저 관리자 화면에서는 local 탈퇴 기록 기준으로 즉시 숨깁니다.
      // 재가입하면 removeWithdrawnMemberRecord()가 먼저 실행되어 다시 표시됩니다.
      return (rows || []).filter(row => {
        const rowMember = makeLocalMemberFromSupabaseRow(row);
        return !findWithdrawnMemberRecord(rowMember);
      });
    }

    function findWithdrawnMemberRecord(member) {
      const keys = getMemberLoginKeys(member);
      if (!keys.length) return null;
      return getWithdrawnMembers().find(item => {
        if (item?.withdrawn === false) return false;
        const itemKeys = getMemberLoginKeys(item);
        return itemKeys.some(key => keys.includes(key));
      }) || null;
    }

    function addWithdrawnMemberRecord(member, reason, statusText) {
      if (!member) return;
      const list = getWithdrawnMembers();
      const keys = getMemberLoginKeys(member);
      const filtered = list.filter(item => {
        const itemKeys = getMemberLoginKeys(item);
        return !itemKeys.some(key => keys.includes(key));
      });
      filtered.unshift({
        id:'WD-' + Date.now(),
        name:getMemberDisplayName(member),
        signupMethod:member.signupMethod || member.provider || '탈퇴회원',
        withdrawn:true,
        status:statusText || '회원탈퇴',
        adminRole:'',
        withdrawnAt:new Date().toISOString(),
        withdrawnBy:reason || '회원 직접 탈퇴',
        withdrawalBlockKeys:keys
      });
      setWithdrawnMembers(filtered.slice(0, 500));
    }

    function removeWithdrawnMemberRecord(member) {
      const keys = getMemberLoginKeys(member);
      if (!keys.length) return;
      const list = getWithdrawnMembers().filter(item => {
        const itemKeys = getMemberLoginKeys(item);
        return !itemKeys.some(key => keys.includes(key));
      });
      setWithdrawnMembers(list);
    }

    async function signOutSupabaseAuthQuietly() {
      try {
        if (window.sitepassSupabase && window.sitepassSupabase.auth) {
          await window.sitepassSupabase.auth.signOut();
        }
      } catch (e) {
        console.warn('Supabase 로그아웃 처리 생략:', e);
      }
    }

    // v23.7.250 - 네이버/카카오 기존 약관회원 판별을 login_id뿐 아니라 provider_id/auth_user_id/email까지 확인합니다.
    function getSocialMemberServerLookupPayload(member) {
      const provider = normalizeSignupProviderKey(member?.signupMethod || member?.provider || '');
      const providerId = String(member?.providerId || member?.naverUserId || member?.kakaoUserId || member?.provider_id || '').trim();
      const authUserId = String(member?.supabaseAuthUserId || member?.authUserId || member?.userId || member?.auth_user_id || '').trim();
      const email = String(member?.email || '').trim().toLowerCase();
      const loginKeys = getMemberLoginKeys(member);
      const rawProvider = providerId.replace(/^(kakao|naver)[-_:]/i, '').trim();
      const extraKeys = [];
      if (provider && rawProvider) extraKeys.push(provider + '_' + rawProvider);
      if (provider && providerId) extraKeys.push(provider + '_' + providerId);
      if (provider && authUserId) extraKeys.push(provider + '_' + authUserId);
      if (member?.supabaseLoginId) extraKeys.push(member.supabaseLoginId);
      if (member?.signupId) extraKeys.push(member.signupId);
      return {
        provider,
        providerId: rawProvider || providerId,
        authUserId,
        email,
        loginKeys: Array.from(new Set([...(loginKeys || []), ...extraKeys].map(normalizeMemberKey).filter(Boolean)))
      };
    }

    async function getSupabaseSocialMemberStatusViaRpc(member) {
      try {
        if (!window.sitepassSupabase || !window.sitepassSupabase.rpc || !member) return '';
        const payload = getSocialMemberServerLookupPayload(member);
        if (!payload.loginKeys.length && !payload.providerId && !payload.authUserId && !payload.email) return '';
        const { data, error } = await window.sitepassSupabase.rpc('sitepass_get_social_member_status', {
          p_login_keys: payload.loginKeys,
          p_provider_id: payload.providerId || null,
          p_auth_user_id: payload.authUserId || null,
          p_email: payload.email || null,
          p_signup_method: payload.provider || null
        });
        if (error) {
          console.warn('소셜 회원 상태 RPC 확인 실패:', error.message || error);
          return '';
        }
        return String(data || '').trim().toLowerCase();
      } catch (e) {
        console.warn('소셜 회원 상태 RPC 확인 예외:', e?.message || e);
        return '';
      }
    }

    async function getSupabaseMemberStatus(member) {
      try {
        if (!window.sitepassSupabase || !member) return '';
        const keys = getMemberLoginKeys(member);
        const lookup = getSocialMemberServerLookupPayload(member);
        if (!keys.length && !lookup.providerId && !lookup.authUserId && !lookup.email) return '';

        // v23.7.250: 네이버는 login_id가 naver_고유ID / naver_authUUID 중 어느 쪽으로 저장됐는지 브라우저마다 달라질 수 있어
        // 서버 RPC로 provider_id/auth_user_id/email까지 확인해서 기존 약관회원이면 약관창을 다시 띄우지 않습니다.
        const statusProviderKey = normalizeSignupProviderKey(member.signupMethod || member.provider || lookup.provider || '');
        const isSocialStatusLookup = statusProviderKey === 'kakao' || statusProviderKey === 'naver';
        const rpcStatus = await getSupabaseSocialMemberStatusViaRpc(member);
        if (rpcStatus === 'withdrawn') return 'withdrawn';
        // v23.7.250: 네이버/카카오 신규 가입은 terms_agreed_at이 확인될 때만 기존회원으로 봅니다.
        // 예전 RPC가 status=active만 반환하면 신규 네이버도 약관창 없이 통과할 수 있어,
        // 소셜 active 판정은 아래 sitepass_members의 terms_agreed_at 확인까지 내려보냅니다.
        if (rpcStatus && !isSocialStatusLookup) return rpcStatus;

        // v23.7.231: 탈퇴 여부는 서버 status/plan_type으로 판단합니다.
        if (window.sitepassSupabase.rpc) {
          try {
            const { data: blocked, error: blockError } = await window.sitepassSupabase.rpc('sitepass_is_member_withdrawn', {
              p_login_keys: lookup.loginKeys && lookup.loginKeys.length ? lookup.loginKeys : keys
            });
            if (!blockError && blocked === true) return 'withdrawn';
          } catch (rpcError) {
            console.warn('Supabase 탈퇴 차단 확인 RPC 예외:', rpcError?.message || rpcError);
          }
        }

        const selectCols = 'login_id, status, plan_type, role, terms_agreed_at, provider_id, auth_user_id, email, signup_method';
        const candidates = [];
        const pushRows = rows => {
          (Array.isArray(rows) ? rows : []).forEach(row => {
            if (row && !candidates.some(item => String(item.login_id || '') === String(row.login_id || ''))) candidates.push(row);
          });
        };

        try {
          const { data } = await window.sitepassSupabase
            .from('sitepass_members')
            .select(selectCols)
            .in('login_id', lookup.loginKeys && lookup.loginKeys.length ? lookup.loginKeys : keys)
            .limit(3);
          pushRows(data);
        } catch (ignore) {}

        if (lookup.providerId) {
          try {
            const { data } = await window.sitepassSupabase
              .from('sitepass_members')
              .select(selectCols)
              .eq('signup_method', lookup.provider || normalizeSignupProviderKey(member.signupMethod || member.provider || ''))
              .eq('provider_id', lookup.providerId)
              .limit(3);
            pushRows(data);
          } catch (ignore) {}
        }

        if (lookup.authUserId) {
          try {
            const { data } = await window.sitepassSupabase
              .from('sitepass_members')
              .select(selectCols)
              .eq('auth_user_id', lookup.authUserId)
              .limit(3);
            pushRows(data);
          } catch (ignore) {}
        }

        if (lookup.email) {
          try {
            const { data } = await window.sitepassSupabase
              .from('sitepass_members')
              .select(selectCols)
              .eq('signup_method', lookup.provider || normalizeSignupProviderKey(member.signupMethod || member.provider || ''))
              .eq('email', lookup.email)
              .limit(3);
            pushRows(data);
          } catch (ignore) {}
        }

        if (!candidates.length) {
          // v23.7.250: 소셜 회원은 서버에서 약관동의 완료 행을 못 찾으면 신규가입 약관을 다시 보여줍니다.
          // 기존 약관회원이면 동의 후 같은 login_id로 덮어 저장되므로 중복회원 생성은 막습니다.
          if (isSocialStatusLookup) return '';
          return rpcStatus || '';
        }
        const row = candidates.sort((a,b) => {
          const aActive = !isWithdrawnStatusValue(a.status) && !isWithdrawnStatusValue(a.plan_type) && !!a.terms_agreed_at;
          const bActive = !isWithdrawnStatusValue(b.status) && !isWithdrawnStatusValue(b.plan_type) && !!b.terms_agreed_at;
          return Number(bActive) - Number(aActive);
        })[0];
        const status = String(row.status || '').trim().toLowerCase();
        const planType = String(row.plan_type || '').trim().toLowerCase();
        const role = String(row.role || '').trim().toLowerCase();
        if (isWithdrawnStatusValue(status) || isWithdrawnStatusValue(planType)) return 'withdrawn';
        if (role !== 'super_admin' && !row.terms_agreed_at) return '';
        return status || 'active';
      } catch (e) {
        console.warn('Supabase 회원 상태 확인 생략:', e);
        return '';
      }
    }

    async function withdrawCurrentSupabaseAuthMember(reason) {
      try {
        if (!window.sitepassSupabase || !window.sitepassSupabase.rpc) return 0;
        const { data, error } = await window.sitepassSupabase.rpc('sitepass_withdraw_current_user', {
          p_reason: reason || '회원이 직접 탈퇴했습니다.'
        });
        if (error) {
          console.warn('현재 Supabase 로그인 회원 탈퇴 RPC 실패:', error.message || error);
          return 0;
        }
        return Number(data || 0);
      } catch (e) {
        console.warn('현재 Supabase 로그인 회원 탈퇴 RPC 예외:', e?.message || e);
        return 0;
      }
    }

    async function markMemberWithdrawnInSupabase(member, reason) {
      try {
        if (!window.sitepassSupabase || !member) return 0;
        const keys = getMemberLoginKeys(member);
        if (!keys.length) return 0;

        // v23.7.216: DB에서도 확실히 withdrawn 처리합니다.
        // 기존에는 대표 login_id 1개만 upsert해서 다른 login_id 행이 다시 살아나는 문제가 있었습니다.
        try {
          const { data, error } = await window.sitepassSupabase.rpc('sitepass_force_withdraw_member', {
            p_login_keys: keys,
            p_reason: reason || 'SitePass 회원 탈퇴/강제탈퇴 처리'
          });
          if (!error) return Number(data || 0);
          console.warn('Supabase 강제탈퇴 RPC 실패, 단일 upsert로 보조 처리:', error.message);
        } catch (rpcError) {
          console.warn('Supabase 강제탈퇴 RPC 예외, 단일 upsert로 보조 처리:', rpcError?.message || rpcError);
        }

        const loginId = String(member.supabaseLoginId || member.providerId || member.signupId || member.phone || member.id || '').trim();
        if (!loginId || isSuperAdminLoginId(loginId)) return 0;
        const row = {
          login_id: loginId,
          name: '탈퇴회원',
          phone: null,
          signup_method: normalizeSignupProviderKey(member.signupMethod || member.provider || 'withdrawn') || 'withdrawn',
          role: 'member',
          status: 'withdrawn',
          plan_type: 'withdrawn',
          plan_label: '회원탈퇴',
          plan_started_at: member.paymentStartedAt || member.createdAt || new Date().toISOString(),
          plan_ends_at: new Date().toISOString(),
          last_login_at: member.lastLoginAt || member.loggedInAt || new Date().toISOString(),
          admin_memo: reason || '회원 탈퇴/강제탈퇴 처리'
        };
        const { error } = await window.sitepassSupabase
          .from('sitepass_members')
          .upsert(row, { onConflict:'login_id' });
        if (error) console.warn('Supabase 탈퇴 상태 저장 실패:', error.message);
        return error ? 0 : 1;
      } catch (e) {
        console.warn('Supabase 탈퇴 상태 저장 예외:', e);
        return 0;
      }
    }


    async function reactivateMemberForTestInSupabase(member) {
      try {
        if (!window.sitepassSupabase || !member || !window.sitepassSupabase.rpc) return 0;
        const keys = getMemberLoginKeys(member);
        if (!keys.length) return 0;
        const { data, error } = await window.sitepassSupabase.rpc('sitepass_reactivate_member_for_test', {
          p_login_keys: keys
        });
        if (error) {
          console.warn('테스트 재가입 서버 차단해제 RPC 실패:', error.message || error);
          return 0;
        }
        return Number(data || 0);
      } catch (e) {
        console.warn('테스트 재가입 서버 차단해제 예외:', e?.message || e);
        return 0;
      }
    }

    function getMemberDisplayName(member) {
      if (!member) return '이름없음';
      if (member.isSuperAdminVirtual) return '대표이사 최고관리자';
      return member.name || member.signupId || member.providerId || member.phone || '이름없음';
    }

    function getMemberMainId(member) {
      if (!member) return '-';
      if (member.isSuperAdminVirtual) return ADMIN_ID;
      return member.signupId || member.providerId || member.id || '-';
    }

    function getMemberSocialText(member) {
      const type = getMemberSignupProviderType(member);
      if (type === 'kakao') return member?.providerId || member?.kakaoUserId || member?.supabaseLoginId || '카카오 연동';
      if (type === 'naver') return member?.providerId || member?.naverUserId || member?.supabaseLoginId || '네이버 연동';
      return '미연동';
    }

    function getMemberKakaoText(member) {
      return getMemberSocialText(member);
    }

    function getMemberStatusText(member) {
      if (member?.withdrawn) return '강제탈퇴';
      if (member?.suspended) return '정지';
      if (member?.status === '강제탈퇴') return '강제탈퇴';
      if (member?.status === '정지') return '정지';
      return member?.status || '정상';
    }

    function getMemberPlanInfo(member) {
      const now = Date.now();
      const plan = member?.paymentPlanLabel || member?.memberPlan || member?.planName || member?.paymentPlan || member?.status || '실사용베타';
      const startedAt = member?.paymentStartedAt || member?.planStartedAt || member?.createdAt || '';
      let endsAt = member?.paymentEndsAt || member?.planEndsAt || member?.trialEndsAt || '';
      if (!endsAt && member?.createdAt) endsAt = addDaysIso(member.createdAt, TRIAL_DAYS || 60);
      let remainText = '미설정';
      let remainDays = null;
      if (endsAt) {
        const diff = Math.ceil((new Date(endsAt) - new Date()) / (1000 * 60 * 60 * 24));
        remainDays = Number.isFinite(diff) ? diff : null;
        if (remainDays === null) remainText = '미설정';
        else if (remainDays < 0) remainText = '만료 ' + Math.abs(remainDays) + '일 지남';
        else if (remainDays === 0) remainText = '오늘 만료';
        else remainText = remainDays + '일 남음';
      }
      return {
        label: plan || '실사용베타',
        startedAt,
        endsAt,
        remainDays,
        remainText
      };
    }

    function isMemberPaymentDueSoon(member) {
      const info = getMemberPlanInfo(member);
      return info.remainDays !== null && info.remainDays >= 0 && info.remainDays <= 7;
    }

    function isMemberGrace14Over(member) {
      const info = getMemberPlanInfo(member);
      return info.remainDays !== null && info.remainDays <= -14;
    }


    function memberOwnsItemForDeletion(member, item) {
      if (!member || !item) return false;
      const memberIds = getMemberAdminIdentifiers(member);
      const ownerKeys = [
        item.ownerMemberId,
        item.ownerSignupId,
        item.ownerProviderId,
        item.ownerPhone,
        item.ownerName
      ].map(normalizeAdminRoleKey).filter(Boolean);
      return ownerKeys.some(key => memberIds.includes(key));
    }

    function deleteOwnedItemsForMember(member) {
      if (!member || member.isSuperAdminVirtual || isDesignatedSuperAdminMember(member)) return 0;
      const storageKeys = [STORAGE_KEY, PREV_STORAGE_KEY_7, PREV_STORAGE_KEY_6, PREV_STORAGE_KEY_5, PREV_STORAGE_KEY_4, PREV_STORAGE_KEY_3, PREV_STORAGE_KEY_2, PREV_STORAGE_KEY].filter(Boolean);
      let removedCount = 0;
      storageKeys.forEach(key => {
        try {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          if (!Array.isArray(list) || !list.length) return;
          const remained = list.filter(item => !memberOwnsItemForDeletion(member, item));
          removedCount += list.length - remained.length;
          if (remained.length) localStorage.setItem(key, JSON.stringify(remained));
          else localStorage.removeItem(key);
        } catch (e) {}
      });
      return removedCount;
    }

    function buildWithdrawCleanupPayload(member) {
      const keys = getMemberAdminIdentifiers(member).concat(getMemberLoginKeys(member)).map(normalizeAdminRoleKey).filter(Boolean);
      return {
        id: member?.id || '',
        signup_id: member?.signupId || member?.signup_id || '',
        provider_id: member?.providerId || member?.provider_id || '',
        phone: member?.phone || '',
        name: member?.name || '',
        email: member?.email || '',
        provider: member?.provider || member?.signupMethod || '',
        keys: Array.from(new Set(keys))
      };
    }

    function removeServerEquipmentCacheForMember(member) {
      try {
        const cache = getServerEquipmentCache();
        if (!Array.isArray(cache) || !cache.length) return 0;
        const remained = cache.filter(item => !memberOwnsItemForDeletion(member, item));
        const removed = cache.length - remained.length;
        if (removed > 0) setServerEquipmentCache(remained);
        return removed;
      } catch (e) { return 0; }
    }

    async function deleteOwnedServerItemsForMember(member) {
      if (!member || member.isSuperAdminVirtual || isDesignatedSuperAdminMember(member)) return { ok:true, skipped:true, equipmentDeleted:0, sharesDeleted:0 };
      const localCacheRemoved = removeServerEquipmentCacheForMember(member);
      const api = window.SitePassSupabaseApi;
      const payload = buildWithdrawCleanupPayload(member);
      let result = { ok:false, equipmentDeleted:0, sharesDeleted:0, localCacheRemoved, error:null };
      try {
        if (api && api.rpc) {
          const rpcResult = await api.rpc('sitepass_withdraw_member_cleanup', { p_member: payload });
          if (rpcResult && rpcResult.error) throw rpcResult.error;
          let data = rpcResult ? rpcResult.data : null;
          if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) {} }
          result = { ok:true, equipmentDeleted:Number(data?.equipment_deleted || data?.equipmentDeleted || 0), sharesDeleted:Number(data?.shares_deleted || data?.sharesDeleted || 0), localCacheRemoved };
        } else if (window.sitepassSupabase && window.sitepassSupabase.rpc) {
          const { data, error } = await window.sitepassSupabase.rpc('sitepass_withdraw_member_cleanup', { p_member: payload });
          if (error) throw error;
          result = { ok:true, equipmentDeleted:Number(data?.equipment_deleted || data?.equipmentDeleted || 0), sharesDeleted:Number(data?.shares_deleted || data?.sharesDeleted || 0), localCacheRemoved };
        } else {
          result = { ok:false, skipped:true, equipmentDeleted:0, sharesDeleted:0, localCacheRemoved, error:'Supabase RPC 연결 없음' };
        }
      } catch (e) {
        console.warn('회원탈퇴 장비/QR 서버정리 실패:', e);
        result = { ok:false, equipmentDeleted:0, sharesDeleted:0, localCacheRemoved, error:e };
      }
      try { await syncSupabaseEquipmentItems(true); } catch (e) {}
      sitePassEquipmentSyncMessage = result.ok
        ? '회원탈퇴 서버정리 완료: 장비 ' + result.equipmentDeleted + '건 / QR링크 ' + result.sharesDeleted + '건'
        : '회원탈퇴 서버정리 확인 필요: ' + (result.error?.message || result.error || '알 수 없음');
      return result;
    }
    window.deleteOwnedServerItemsForMember = deleteOwnedServerItemsForMember;

    function getMemberEquipmentItems(member) {
      if (!member || member.isSuperAdminVirtual || member.withdrawn) return [];
      const ids = getMemberAdminIdentifiers(member);
      return getItems().filter(item => {
        const ownerKeys = [
          item.ownerMemberId,
          item.ownerSignupId,
          item.ownerProviderId,
          item.ownerPhone,
          item.ownerName
        ].map(normalizeAdminRoleKey).filter(Boolean);
        return ownerKeys.some(key => ids.includes(key));
      });
    }

    function getItemOwnerText(item) {
      const parts = [
        item?.ownerName,
        item?.ownerSignupId,
        item?.ownerProviderId,
        item?.ownerPhone
      ].filter(Boolean);
      if (parts.length) return parts.join(' / ');
      return '소유회원 미지정';
    }

    function renderMemberEquipmentList(member) {
      const items = getMemberEquipmentItems(member);
      if (!items.length) {
        return '<div class="notice">이 회원과 연결된 장비서류가 아직 없습니다.<br><span class="small">이전 버전에서 등록한 서류는 회원정보가 저장되지 않아 소유회원 미지정으로 보일 수 있습니다. 새로 저장하는 장비서류부터 회원과 자동 연결됩니다.</span></div>';
      }
      const rows = items.map(item => {
        const warningCount = Object.values(item.docs || {}).reduce((acc, doc) => {
          const status = doc.status || getDocStatus(doc);
          if (status === '만료임박') acc.expiring += 1;
          if (status === '만료') acc.expired += 1;
          return acc;
        }, { expiring:0, expired:0 });
        return '<div class="list-item" style="box-shadow:none;margin-top:8px;">' +
          '<div class="doc-head"><div><strong>' + escapeHtml(getItemTitle(item)) + '</strong><div class="small">통합코드: ' + escapeHtml(item.code || '') + '<br>포함서류: ' + escapeHtml(getIncludedGroupText(item)) + '</div></div><span class="badge done">장비서류</span></div>' +
          '<div class="admin-member-summary">' +
            '<span><b>보험/검사 상태</b>만료임박 ' + warningCount.expiring + '건 · 만료 ' + warningCount.expired + '건</span>' +
            '<span><b>담당자 링크</b>' + escapeHtml(getManagerExpireText(getManagerExpireAt(item))) + '</span>' +
          '</div>' +
          '<div class="actions"><button class="ghost" onclick="renderDetail(\'' + escapeJs(item.code || '') + '\')">서류 상세보기</button><button class="primary" onclick="openAdminQrLink(\'' + escapeJs(item.code || '') + '\')">큐알링크</button><button class="okBtn" onclick="shareAdminOwnerAlertSmsForCode(\'' + escapeJs(item.code || '') + '\')">장비업자 알림</button></div>' +
        '</div>';
      }).join('');
      return '<div class="admin-member-detail" style="margin-top:12px;"><h4 style="margin:0 0 8px;">이 회원의 장비서류</h4>' + rows + '</div>';
    }

    function getMemberEquipmentCount(member) {
      return getMemberEquipmentItems(member).length;
    }

    function getMemberDocWarningCount(member) {
      return getMemberEquipmentItems(member).reduce((acc, item) => {
        Object.values(item.docs || {}).forEach(doc => {
          const status = doc.status || getDocStatus(doc);
          if (status === '만료임박') acc.expiring += 1;
          if (status === '만료') acc.expired += 1;
        });
        return acc;
      }, { expiring:0, expired:0 });
    }

    function getAdminMemberDisplayKey(member) {
      const candidates = [
        member?.supabaseLoginId,
        member?.providerId,
        member?.signupId,
        member?.id,
        member?.phone
      ].map(normalizeSupabaseLoginKeyForMember).filter(Boolean);
      return candidates[0] || ('name:' + normalizeSupabaseLoginKeyForMember(member?.name || Math.random()));
    }

    function getAdminMembersWithServerRows() {
      const localMembers = ensureMemberIds().filter(member => !isMemberWithdrawnOrBlocked(member));
      let serverMembers = filterActiveRowsOnly(adminServerMemberRows || [])
        .map(makeLocalMemberFromSupabaseRow)
        .filter(member => (member.supabaseLoginId || member.providerId || member.signupId || member.phone || member.name));
      serverMembers = dedupeAdminMembersForDisplay(serverMembers);
      if (!serverMembers.length) {
        return localMembers.filter(member => !isMemberWithdrawnOrBlocked(member));
      }
      const serverSyncFresh = adminSupabaseMemberSyncedAt && Date.now() - adminSupabaseMemberSyncedAt < 10 * 60 * 1000;

      const serverKeySet = new Set();
      const serverNameProviderSet = new Set();
      serverMembers.forEach(member => {
        getAdminLocalMemberKeys(member).forEach(key => serverKeySet.add(key));
        const np = getAdminMemberNameProviderKey(member);
        if (np) serverNameProviderSet.add(np);
      });

      const map = new Map();
      const put = (member) => {
        if (!member || isMemberWithdrawnOrBlocked(member)) return;
        const key = getAdminMemberDisplayKey(member);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, member);
          return;
        }
        map.set(key, {
          ...existing,
          ...member,
          id: existing.id || member.id,
          adminRole: isDesignatedSuperAdminMember(member) ? SUPER_ADMIN_ROLE_NAME : (existing.adminRole === SUPER_ADMIN_ROLE_NAME ? '' : (existing.adminRole || member.adminRole || '')),
          adminRoleUpdatedAt: existing.adminRoleUpdatedAt || member.adminRoleUpdatedAt || '',
          adminRoleUpdatedBy: existing.adminRoleUpdatedBy || member.adminRoleUpdatedBy || '',
          testPassword: existing.testPassword || member.testPassword || '',
          passwordSet: existing.passwordSet || member.passwordSet || false,
          fromSupabase: existing.fromSupabase || member.fromSupabase || false,
          supabaseLoginId: existing.supabaseLoginId || member.supabaseLoginId || ''
        });
      };

      // v23.7.216: 서버 active 회원을 기준으로 표시합니다.
      // 예전 localStorage에 남은 카카오/네이버/중복 회원은 서버에 active로 없으면 다시 표시하지 않습니다.
      serverMembers.forEach(put);
      localMembers.forEach(local => {
        if (local.isSuperAdminVirtual || isDesignatedSuperAdminMember(local) || ['관리자','운영관리자','조회관리자'].includes(local.adminRole)) {
          put(local);
          return;
        }
        const providerType = getMemberSignupProviderType(local);
        const sameKey = getAdminLocalMemberKeys(local).some(key => serverKeySet.has(key));
        const np = getAdminMemberNameProviderKey(local);
        const sameNameProvider = np && serverNameProviderSet.has(np);
        const isLocalSocialTermsMember = (providerType === 'kakao' || providerType === 'naver') && hasLocalSocialTermsAgreement(local);

        // v23.7.248: 네이버 약관회원은 서버 RPC 목록 반영이 늦는 동안에도 관리자 상세목록에 표시합니다.
        if (serverSyncFresh) {
          if (isLocalSocialTermsMember && !sameKey && !sameNameProvider) {
            local.serverSyncPending = true;
            put(local);
          }
          return;
        }
        if (providerType === 'kakao' || providerType === 'naver') {
          if (isLocalSocialTermsMember && !sameKey && !sameNameProvider) put(local);
          return;
        }
        if (sameKey || sameNameProvider) return;
        put(local);
      });
      return dedupeAdminMembersForDisplay(Array.from(map.values()).filter(member => !isMemberWithdrawnOrBlocked(member))); 
    }

    function getAdminAllMemberRows() {
      cleanupAdminRoleMapSingleSuperAdmin();
      let members = dedupeAdminMembersForDisplay(getAdminMembersWithServerRows().filter(member => !isMemberWithdrawnOrBlocked(member)).map(member => normalizeSingleSuperAdminRole(member))); 
      let changed = false;
      members.forEach(member => {
        const identifiers = getMemberAdminIdentifiers(member);
        const isDesignatedSuperAdmin = identifiers.some(id => isSuperAdminLoginId(id));
        if (isDesignatedSuperAdmin && member.adminRole !== SUPER_ADMIN_ROLE_NAME) {
          member.adminRole = SUPER_ADMIN_ROLE_NAME;
          member.role = 'super_admin';
          member.adminRoleUpdatedAt = member.adminRoleUpdatedAt || new Date().toISOString();
          member.adminRoleUpdatedBy = member.adminRoleUpdatedBy || 'SitePass 자동정리';
          changed = true;
        }
        if (!isDesignatedSuperAdmin && (member.adminRole === SUPER_ADMIN_ROLE_NAME || supabaseRoleToAdminRole(member.role) === SUPER_ADMIN_ROLE_NAME)) {
          delete member.adminRole;
          member.role = 'member';
          member.adminRoleUpdatedAt = new Date().toISOString();
          member.adminRoleUpdatedBy = 'SitePass 최고관리자 단일화';
          changed = true;
        }
      });
      if (changed) setMembers(members);

      // v23.7.255: 서버 약관/탈퇴 통계가 "현재회원 0명"인데 RPC 상세목록에 예전 active 행이 남는 경우가 있습니다.
      // 이때 관리자 회원목록은 통계(current active) 기준으로 한 번 더 보정해서 탈퇴/비활성 회원이 다시 보이지 않게 합니다.
      members = applyAdminCurrentSummaryVisibility(members);

      const hasRealSuperAdmin = members.some(member => {
        const identifiers = getMemberAdminIdentifiers(member);
        return !member.withdrawn && !member.isSuperAdminVirtual && identifiers.some(id => isSuperAdminLoginId(id));
      });
      if (hasRealSuperAdmin) return members.filter(member => member.id !== 'SUPER-ADMIN' && !member.isSuperAdminVirtual);

      const superRow = {
        id:'SUPER-ADMIN',
        name:'대표이사 최고관리자',
        signupId:ADMIN_ID,
        provider:'SitePass',
        signupMethod:'대표이사 최고관리자',
        adminRole:SUPER_ADMIN_ROLE_NAME,
        status:'정상',
        isSuperAdminVirtual:true,
        createdAt:'',
        phone:'',
        paymentPlanLabel:'무제한',
        paymentEndsAt:''
      };
      return [superRow].concat(members.filter(member => member.id !== 'SUPER-ADMIN' && !member.isSuperAdminVirtual));
    }

    function getMemberSignupProviderType(member) {
      if (!member) return 'sitepass';
      const provider = String(member.provider || '').toLowerCase();
      const method = String(member.signupMethod || '').toLowerCase();
      const providerId = String(member.providerId || '').toLowerCase();
      const supabaseLoginId = String(member.supabaseLoginId || '').toLowerCase();
      const naverUserId = String(member.naverUserId || '').toLowerCase();
      const kakaoUserId = String(member.kakaoUserId || '').toLowerCase();
      const joined = [provider, method, providerId, supabaseLoginId, naverUserId, kakaoUserId, member.email || ''].join(' ');
      if (joined.includes('카카오') || joined.includes('kakao') || providerId.startsWith('kakao-') || supabaseLoginId.startsWith('kakao_')) return 'kakao';
      if (joined.includes('네이버') || joined.includes('naver') || providerId.startsWith('naver-') || supabaseLoginId.startsWith('naver_')) return 'naver';
      return 'sitepass';
    }

    function getFiniteAdminSummaryNumber(value) {
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? n : null;
    }

    function hasUsableAdminCurrentSummaryStats() {
      const current = adminMemberSummaryStats && typeof adminMemberSummaryStats === 'object' ? adminMemberSummaryStats.current : null;
      if (!current || typeof current !== 'object') return false;
      return ['total','kakao','naver','sitepass'].some(key => getFiniteAdminSummaryNumber(current[key]) !== null);
    }

    function applyAdminCurrentSummaryVisibility(members) {
      // v23.7.255: 탈퇴 누계/현재회원 통계는 맞는데 상세 회원목록에 예전 카카오·네이버 active 행이 남는 문제 보정.
      // 서버 RPC가 current=0 또는 provider별 current=0을 알려주면, 화면 목록도 그 숫자에 맞춰 숨깁니다.
      if (!hasUsableAdminCurrentSummaryStats()) return members || [];
      const current = adminMemberSummaryStats.current || {};
      const maxTotal = getFiniteAdminSummaryNumber(current.total);
      const providerMax = {
        kakao: getFiniteAdminSummaryNumber(current.kakao),
        naver: getFiniteAdminSummaryNumber(current.naver),
        sitepass: getFiniteAdminSummaryNumber(current.sitepass)
      };
      const adminRows = [];
      const userRows = [];
      (members || []).forEach(member => {
        if (!member || isMemberWithdrawnOrBlocked(member)) return;
        if (isAdminAccountMember(member)) adminRows.push(member);
        else userRows.push(member);
      });
      if (maxTotal === 0) return adminRows;

      const kept = [];
      const used = { kakao:0, naver:0, sitepass:0 };
      userRows.forEach(member => {
        const type = getMemberSignupProviderType(member);
        const limit = providerMax[type];
        if (limit !== null && used[type] >= limit) return;
        if (maxTotal !== null && kept.length >= maxTotal) return;
        used[type] += 1;
        kept.push(member);
      });
      return adminRows.concat(kept);
    }

    // v23.7.254: 소셜 약관동의 완료 판별은 assets/js/terms.js로 분리했습니다.

    function getAdminSignupProviderCounts(activeMembers) {
      const signupMembers = (activeMembers || []).filter(member => {
        const role = member?.adminRole || supabaseRoleToAdminRole(member?.role);
        if (member?.withdrawn || member?.isSuperAdminVirtual) return false;
        if ([SUPER_ADMIN_ROLE_NAME, '관리자', '운영관리자', '조회관리자'].includes(role)) return false;
        return true;
      });
      const counts = { total: signupMembers.length, kakao:0, naver:0, sitepass:0 };
      signupMembers.forEach(member => {
        const type = getMemberSignupProviderType(member);
        if (type === 'kakao') counts.kakao += 1;
        else if (type === 'naver') counts.naver += 1;
        else counts.sitepass += 1;
      });
      return counts;
    }

    function getAdminSummaryProviderBlockFromStats(key, fallback) {
      const stats = adminMemberSummaryStats || {};
      const block = stats && typeof stats === 'object' ? stats[key] : null;
      return {
        total: Number(block?.total ?? fallback?.total ?? 0),
        kakao: Number(block?.kakao ?? fallback?.kakao ?? 0),
        naver: Number(block?.naver ?? fallback?.naver ?? 0),
        sitepass: Number(block?.sitepass ?? fallback?.sitepass ?? 0)
      };
    }

    function getAdminTodaySignupProviderCountsFallback(activeMembers) {
      const todayKey = getLocalDateKey();
      const members = (activeMembers || []).filter(member => {
        const role = member?.adminRole || supabaseRoleToAdminRole(member?.role);
        if (member?.withdrawn || member?.isSuperAdminVirtual) return false;
        if ([SUPER_ADMIN_ROLE_NAME, '관리자', '운영관리자', '조회관리자'].includes(role)) return false;
        return getLocalDateKey(member?.createdAt || member?.joinedAt || member?.paymentStartedAt) === todayKey;
      });
      const counts = { total: members.length, kakao:0, naver:0, sitepass:0 };
      members.forEach(member => {
        const type = getMemberSignupProviderType(member);
        if (type === 'kakao') counts.kakao += 1;
        else if (type === 'naver') counts.naver += 1;
        else counts.sitepass += 1;
      });
      return counts;
    }

    function renderAdminStatsMiniCard(title, count, note, folder, extraClass) {
      const click = folder ? ' onclick="openAdminListQuickFilter(\'' + escapeJs(folder) + '\')" style="cursor:pointer;"' : '';
      return '<div class="admin-signup-method-card ' + escapeHtml(extraClass || '') + '"' + click + '><b>' + escapeHtml(title) + '</b><strong>' + Number(count || 0) + '명</strong><span>' + escapeHtml(note || '') + '</span></div>';
    }

    function renderAdminSignupMethodBoard(activeMembers) {
      const currentFallback = getAdminSignupProviderCounts(activeMembers);
      const todayFallback = getAdminTodaySignupProviderCountsFallback(activeMembers);
      const current = getAdminSummaryProviderBlockFromStats('current', currentFallback);
      const today = getAdminSummaryProviderBlockFromStats('todaySignup', todayFallback);
      const withdrawn = getAdminSummaryProviderBlockFromStats('withdrawn', { total:0, kakao:0, naver:0, sitepass:0 });
      const todayWithdrawn = getAdminSummaryProviderBlockFromStats('todayWithdrawn', { total:0, kakao:0, naver:0, sitepass:0 });
      const marketingConsent = adminMemberSummaryStats?.marketingConsent || {};
      const sourceText = String(adminMemberSummaryStats?.source || '').startsWith('sitepass_admin_member_summary')
        ? '서버 약관/회원 상태 기준'
        : '화면 회원목록 기준';
      return '<div class="notice blue-note" style="margin:10px 0;">' +
        '<b>회원 집계 기준</b><br>' +
        '회원수는 로그인 기록이나 DB 원본 행 수가 아니라 <b>약관 동의 완료 + active 상태</b>인 실제 회원만 계산합니다. 광고 수신 동의는 이메일/문자/카카오톡·앱 채널별 선택 동의로 따로 집계합니다. 카카오/네이버/사이트 약관동의자를 따로 보고, 같은 소셜 계정 중복행은 화면에서 1명으로 묶으며, 탈퇴 회원은 현재 회원수에서 제외합니다. 현재 기준: ' + escapeHtml(sourceText) +
      '</div>' +
      '<div class="admin-signup-method-board">' +
        renderAdminStatsMiniCard('약관동의 현재회원', current.total, '관리자 제외 active 회원', 'normal') +
        renderAdminStatsMiniCard('카카오 약관회원', current.kakao, '카카오 약관 동의 완료', 'normal') +
        renderAdminStatsMiniCard('네이버 약관회원', current.naver, '네이버 약관 동의 완료', 'normal') +
        renderAdminStatsMiniCard('사이트 약관회원', current.sitepass, 'SitePass 일반가입 약관 완료', 'normal') +
      '</div>' +
      '<div class="admin-signup-method-board" style="margin-top:8px;">' +
        renderAdminStatsMiniCard('오늘 전체 가입', today.total, '오늘 약관 동의 완료', 'newSignup') +
        renderAdminStatsMiniCard('오늘 카카오 가입', today.kakao, '오늘 카카오 가입', 'newSignup') +
        renderAdminStatsMiniCard('오늘 네이버 가입', today.naver, '오늘 네이버 가입', 'newSignup') +
        renderAdminStatsMiniCard('오늘 사이트 가입', today.sitepass, '오늘 SitePass 가입', 'newSignup') +
      '</div>' +
      '<div class="admin-signup-method-board" style="margin-top:8px;">' +
        renderAdminStatsMiniCard('광고동의 전체', Number(marketingConsent.any || 0), '이메일 또는 문자/앱 동의', 'normal') +
        renderAdminStatsMiniCard('이메일 광고동의', Number(marketingConsent.email || 0), '선택 동의 회원', 'normal') +
        renderAdminStatsMiniCard('문자 광고동의', Number(marketingConsent.sms || 0), '선택 동의 회원', 'normal') +
        renderAdminStatsMiniCard('카카오톡·앱 광고동의', Number(marketingConsent.kakaoApp || 0), '선택 동의 회원', 'normal') +
      '</div>' +
      '<div class="admin-signup-method-board" style="margin-top:8px;">' +
        renderAdminStatsMiniCard('전체 탈퇴 누계', withdrawn.total, '오늘 ' + todayWithdrawn.total + '명 탈퇴', 'withdrawn') +
        renderAdminStatsMiniCard('카카오 탈퇴 누계', withdrawn.kakao, '오늘 ' + todayWithdrawn.kakao + '명 탈퇴', 'withdrawn') +
        renderAdminStatsMiniCard('네이버 탈퇴 누계', withdrawn.naver, '오늘 ' + todayWithdrawn.naver + '명 탈퇴', 'withdrawn') +
        renderAdminStatsMiniCard('사이트 탈퇴 누계', withdrawn.sitepass, '오늘 ' + todayWithdrawn.sitepass + '명 탈퇴', 'withdrawn') +
      '</div>';
    }

    // v23.7.257: 관리자 회원목록/검색/필터 렌더링 함수는 assets/js/admin-members.js로 분리했습니다.
    function getAdminMembersModule() {
      return window.SitePassAdminMembers || {};
    }

    function isAdminAccountMember(member) {
      const mod = getAdminMembersModule();
      return mod.isAdminAccountMember ? mod.isAdminAccountMember(member) : false;
    }

    function getAdminMemberCounts(activeMembers, withdrawnMembers) {
      const mod = getAdminMembersModule();
      return mod.getAdminMemberCounts ? mod.getAdminMemberCounts(activeMembers, withdrawnMembers) : {};
    }

    function getAdminFolderLabel(key) {
      const mod = getAdminMembersModule();
      return mod.getAdminFolderLabel ? mod.getAdminFolderLabel(key) : '전체회원';
    }

    function filterAdminMembersByFolder(member, folder) {
      const mod = getAdminMembersModule();
      return mod.filterAdminMembersByFolder ? mod.filterAdminMembersByFolder(member, folder) : true;
    }

    function adminMemberMatchesSearch(member, q) {
      const mod = getAdminMembersModule();
      return mod.adminMemberMatchesSearch ? mod.adminMemberMatchesSearch(member, q) : true;
    }

    function setAdminMemberFolder(folder) {
      const mod = getAdminMembersModule();
      if (mod.setAdminMemberFolder) return mod.setAdminMemberFolder(folder);
    }

    function startAdminMemberSearchComposition() {
      const mod = getAdminMembersModule();
      if (mod.startAdminMemberSearchComposition) return mod.startAdminMemberSearchComposition();
    }

    function handleAdminMemberSearchInput(input) {
      const mod = getAdminMembersModule();
      if (mod.handleAdminMemberSearchInput) return mod.handleAdminMemberSearchInput(input);
    }

    function finishAdminMemberSearchComposition(input) {
      const mod = getAdminMembersModule();
      if (mod.finishAdminMemberSearchComposition) return mod.finishAdminMemberSearchComposition(input);
    }

    function setAdminMemberSearch(value) {
      const mod = getAdminMembersModule();
      if (mod.setAdminMemberSearch) return mod.setAdminMemberSearch(value);
    }

    function applyAdminMemberSearch() {
      const mod = getAdminMembersModule();
      if (mod.applyAdminMemberSearch) return mod.applyAdminMemberSearch();
    }

    function clearAdminMemberSearch() {
      const mod = getAdminMembersModule();
      if (mod.clearAdminMemberSearch) return mod.clearAdminMemberSearch();
    }

    function changeAdminMemberPage(delta) {
      const mod = getAdminMembersModule();
      if (mod.changeAdminMemberPage) return mod.changeAdminMemberPage(delta);
    }

    function getAdminMemberActionId(member) {
      const mod = getAdminMembersModule();
      return mod.getAdminMemberActionId ? mod.getAdminMemberActionId(member) : '';
    }

    function getAdminMemberActionTokens(member) {
      const mod = getAdminMembersModule();
      return mod.getAdminMemberActionTokens ? mod.getAdminMemberActionTokens(member) : [];
    }

    function isSameAdminActionMember(member, memberId) {
      const mod = getAdminMembersModule();
      return mod.isSameAdminActionMember ? mod.isSameAdminActionMember(member, memberId) : false;
    }

    function renderAdminStaffManager(members) {
      const mod = getAdminMembersModule();
      if (mod.renderAdminStaffManager) return mod.renderAdminStaffManager(members);
      return '<div class="card" style="box-shadow:none;margin-top:14px;"><h3>관리자관리</h3><div class="notice">관리자 회원목록 파일을 불러오지 못했습니다. assets/js/admin-members.js 업로드를 확인해주세요.</div></div>';
    }

    // v23.7.257: 관리자 상세관리/결제/탈퇴 조작 함수는 assets/js/admin-detail.js로 분리했습니다.

    function getAdminPaymentActionMembers(activeMembers, type) {
      return activeMembers.filter(member => {
        if (member.withdrawn || member.isSuperAdminVirtual) return false;
        const status = String(member.paymentStatus || member.status || '');
        if (type === 'newPay') return status.includes('신규결제');
        if (type === 'extensionPay') return status.includes('연장결제');
        if (type === 'refundRequest') return member.refundRequestPending || status.includes('환불요청');
        return false;
      });
    }

    function renderAdminPaymentStatusCard(title, folder, list, emptyText) {
      const names = list.length
        ? list.slice(0, 6).map(member => {
            const time = folder === 'refundRequest' ? member.refundRequestedAt : member.adminLastActionAt;
            return '· ' + escapeHtml(getMemberDisplayName(member)) + ' / ' + escapeHtml(getMemberMainId(member)) + (time ? ' / ' + escapeHtml(formatNullableDateTime(time)) : '');
          }).join('<br>')
        : '<span class="small">' + escapeHtml(emptyText || '해당 회원이 없습니다.') + '</span>';
      return '<div class="admin-payment-status-card">' +
        '<strong>' + escapeHtml(title) + '<span class="badge need">' + list.length + '명</span></strong>' +
        '<div class="small">' + names + '</div>' +
        '<div class="actions"><button class="ghost" onclick="setAdminMemberFolder(\'' + escapeJs(folder) + '\')">목록 보기</button></div>' +
      '</div>';
    }

    function renderAdminPaymentStatusBoard(activeMembers) {
      const newPayList = getAdminPaymentActionMembers(activeMembers, 'newPay');
      const extensionList = getAdminPaymentActionMembers(activeMembers, 'extensionPay');
      const refundRequestList = getAdminPaymentActionMembers(activeMembers, 'refundRequest');
      return '<div class="admin-payment-status-board">' +
        renderAdminPaymentStatusCard('신규결제 확인', 'newPay', newPayList, '신규결제 처리 회원 없음') +
        renderAdminPaymentStatusCard('연장결제 확인', 'extensionPay', extensionList, '연장결제 처리 회원 없음') +
        renderAdminPaymentStatusCard('환불요청 확인', 'refundRequest', refundRequestList, '환불요청 회원 없음') +
      '</div>';
    }

    function renderAdminCreateAccountPanel() {
      if (!isSuperAdminLoggedIn()) return '';
      return '<div class="admin-payment-section" style="margin-top:14px;">' +
        '<span class="admin-payment-section-title">관리자 아이디 만들기</span>' +
        '<div class="notice blue-note">이 창은 최고관리자모드에서만 보입니다. 최고관리자가 만든 직원 계정은 모두 <b>관리자</b>로 접속하며, 운영관리자/조회관리자 구분은 사용하지 않습니다. 최고관리자는 <b>' + escapeHtml(ADMIN_ID) + '</b> 1개로 고정합니다.</div>' +
        '<div class="admin-payment-input-grid">' +
          '<input id="newAdminLoginId" type="text" placeholder="관리자 아이디 또는 이메일" autocomplete="off" />' +
          '<input id="newAdminName" type="text" placeholder="관리자 이름/표시명" autocomplete="off" />' +
          '<input id="newAdminPhone" type="tel" placeholder="휴대폰번호 선택" autocomplete="off" />' +
          '<input id="newAdminPassword" type="password" placeholder="임시 비밀번호 6자 이상" autocomplete="new-password" />' +
          '<input id="newAdminPassword2" type="password" placeholder="임시 비밀번호 확인" autocomplete="new-password" />' +
        '</div>' +
        '<div class="actions"><button class="primary" onclick="createAdminAccountBySuper()">관리자 아이디 만들기</button><button class="ghost" onclick="clearNewAdminAccountForm()">입력 초기화</button></div>' +
        '<div class="small">직원 관리자는 일반 로그인 화면에서 만든 아이디와 임시 비밀번호로 접속합니다. 일반 관리자모드에는 이 생성창이 보이지 않습니다.</div>' +
      '</div>';
    }

    function clearNewAdminAccountForm() {
      ['newAdminLoginId','newAdminName','newAdminPhone','newAdminPassword','newAdminPassword2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    }

    function createAdminAccountBySuper() {
      if (!isSuperAdminLoggedIn()) {
        alert('관리자 아이디 생성은 최고관리자만 가능합니다.');
        return;
      }
      const loginId = normalizeLoginText(document.getElementById('newAdminLoginId')?.value || '');
      const name = normalizeLoginText(document.getElementById('newAdminName')?.value || '') || loginId;
      const phone = normalizeLoginText(document.getElementById('newAdminPhone')?.value || '');
      const role = '관리자';
      const pw = normalizeLoginText(document.getElementById('newAdminPassword')?.value || '');
      const pw2 = normalizeLoginText(document.getElementById('newAdminPassword2')?.value || '');

      if (!loginId) { alert('관리자 아이디를 입력해주세요.'); return; }
      if (isSuperAdminLoginId(loginId)) { alert('최고관리자 아이디는 이미 고정되어 있습니다. 직원 관리자 아이디로는 사용할 수 없습니다.'); return; }
      if (!pw || pw.length < 6) { alert('임시 비밀번호는 6자 이상으로 입력해주세요.'); return; }
      if (pw !== pw2) { alert('비밀번호 확인이 맞지 않습니다.'); return; }

      const existing = findMemberForLogin(loginId);
      if (existing && !confirm('이미 같은 아이디/휴대폰으로 등록된 회원이 있습니다.\n이 회원을 관리자로 지정하고 비밀번호를 새로 설정할까요?')) return;

      const nowIso = new Date().toISOString();
      let member = existing || {
        id:'ADM-' + Date.now(),
        createdAt:nowIso,
        status:'관리자계정',
        paymentPlanLabel:'관리자계정',
        memberPlan:'관리자계정',
        paymentStartedAt:nowIso,
        paymentEndsAt:addDaysIso(nowIso, 3650)
      };
      member.name = name;
      member.phone = phone;
      member.signupId = loginId;
      member.provider = 'SitePass';
      member.providerId = 'SITEPASS-LOGIN-' + loginId;
      member.signupMethod = '최고관리자 생성 관리자';
      member.testPassword = pw;
      member.passwordSet = true;
      member.adminRole = role;
      member.adminRoleUpdatedAt = nowIso;
      member.adminRoleUpdatedBy = getSessionValue(ADMIN_SESSION_KEY + '_id') || ADMIN_ID;
      member.adminCreatedBy = getSessionValue(ADMIN_SESSION_KEY + '_id') || ADMIN_ID;
      member.adminCreatedAt = member.adminCreatedAt || nowIso;
      member.adminLastAction = existing ? '관리자 권한/비밀번호 재설정' : '관리자 아이디 생성';
      member.adminLastActionAt = nowIso;
      member.suspended = false;
      member.withdrawn = false;

      saveMemberTest(member);
      syncMemberAdminRoleMap(findMemberForLogin(loginId) || member, role);
      clearNewAdminAccountForm();
      alert('관리자 아이디를 만들었습니다.\n\n아이디: ' + loginId + '\n이제 일반 로그인 화면에서 이 아이디와 임시 비밀번호로 접속할 수 있습니다.');
      renderAdmin();
    }

    function renderAdminStaffManager(members) {
      if (!isSuperAdminLoggedIn()) {
        return '<div class="card" style="box-shadow:none;margin-top:14px;"><h3>관리자관리</h3><div class="notice">관리자 지정/권한변경/해제, 회원 강제탈퇴, 무료권 지급은 최고관리자만 가능합니다.</div></div>';
      }

      const withdrawnMembers = getVisibleWithdrawnMembers().map(item => ({ ...item, withdrawn:true, status:'강제탈퇴' }));
      const activeMembers = dedupeAdminMembersForDisplay(getAdminAllMemberRows());
      const counts = getAdminMemberCounts(activeMembers, withdrawnMembers);
      const folders = ['super','admin','all','normal','newSignup','monthly','due','grace14','suspended','newPay','extensionPay','refundRequest','refund','withdrawn'];
      const folderButtons = folders.map(key =>
        '<button type="button" class="' + (adminMemberFolder === key ? 'active' : '') + '" onclick="setAdminMemberFolder(\'' + escapeJs(key) + '\')">' +
          escapeHtml(getAdminFolderLabel(key)) + ' ' + (counts[key] || 0) +
        '</button>'
      ).join('');

      const source = adminMemberFolder === 'withdrawn' ? withdrawnMembers : activeMembers;
      let filtered = source.filter(member => filterAdminMembersByFolder(member, adminMemberFolder)).filter(member => adminMemberMatchesSearch(member, adminMemberSearchText));
      const pageSize = 20;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (adminMemberPage >= totalPages) adminMemberPage = totalPages - 1;
      const pageItems = filtered.slice(adminMemberPage * pageSize, adminMemberPage * pageSize + pageSize);

      const summary = '<div class="admin-summary-rows">' +
        '<div class="admin-summary-row">' +
          '<div class="line"><b>전체회원</b><span>' + counts.all + '명</span></div>' +
          '<div class="line"><b>일반회원</b><span>' + counts.normal + '명</span></div>' +
          '<div class="line"><b>관리자</b><span>' + ((counts.super || 0) + (counts.admin || 0)) + '명</span></div>' +
          '<div class="line"><b>강제탈퇴</b><span>' + counts.withdrawn + '명</span></div>' +
        '</div>' +
        '<div class="admin-summary-row">' +
          '<div class="line"><b>1개월권</b><span>' + counts.monthly + '명</span></div>' +
          '<div class="line"><b>만료예정</b><span>' + counts.due + '명</span></div>' +
          '<div class="line"><b>유예14일 이상</b><span>' + counts.grace14 + '명</span></div>' +
          '<div class="line"><b>정지회원</b><span>' + counts.suspended + '명</span></div>' +
        '</div>' +
        '<div class="admin-summary-row">' +
          '<div class="line"><b>신규결제</b><span>' + counts.newPay + '명</span></div>' +
          '<div class="line"><b>연장결제</b><span>' + counts.extensionPay + '명</span></div>' +
          '<div class="line"><b>환불요청</b><span>' + counts.refundRequest + '명</span></div>' +
          '<div class="line"><b>환불처리</b><span>' + counts.refund + '명</span></div>' +
        '</div>' +
      '</div>';

      const rows = pageItems.map(member => {
        const name = getMemberDisplayName(member);
        const role = member.withdrawn ? '강제탈퇴' : (['운영관리자','조회관리자'].includes(member.adminRole) ? '관리자' : (member.adminRole || '일반회원'));
        const plan = getMemberPlanInfo(member);
        const eqCount = getMemberEquipmentCount(member);
        const status = getMemberStatusText(member);
        const roleBadge = '<span class="badge ' + getAdminRoleBadgeClass(role) + '">' + escapeHtml(role) + '</span>';
        const idText = getMemberMainId(member);
        const actionId = getAdminMemberActionId(member);
        const detailOpen = adminExpandedMemberId === actionId;
        const quickRoleButtons = '';
        return '<div class="admin-member-row">' +
          '<div class="doc-head"><div><strong>' + escapeHtml(name) + '</strong><div class="small">아이디: ' + escapeHtml(idText) + ' · ' + escapeHtml(member.signupMethod || member.provider || '일반회원') + '</div></div>' + roleBadge + '</div>' +
          '<div class="admin-member-summary">' +
            '<span><b>휴대폰</b>' + escapeHtml(member.phone || '-') + '</span>' +
            '<span><b>소셜계정</b>' + escapeHtml(getMemberSocialText(member)) + '</span>' +
            '<span><b>결제여부</b>' + escapeHtml(plan.label || '-') + '</span>' +
            '<span><b>남은기간</b>' + escapeHtml(plan.remainText || '-') + '</span>' +
            '<span><b>장비등록</b>' + eqCount + '대</span>' +
            '<span><b>회원상태</b>' + escapeHtml(status) + '</span>' +
            '<span><b>최근로그인</b><span class="admin-login-time">' + escapeHtml(formatNullableDateTime(member.lastLoginAt || member.loggedInAt)) + '</span></span>' +
          '</div>' +
          '<div class="actions">' +
            '<button class="ghost" onclick="toggleAdminMemberDetail(\'' + escapeJs(actionId) + '\')">' + (detailOpen ? '상세닫기' : '상세관리') + '</button>' +
            quickRoleButtons +
          '</div>' +
          (detailOpen ? renderAdminMemberDetail(member) : '') +
        '</div>';
      }).join('') || '<div class="empty">조건에 맞는 회원이 없습니다.</div>';

      const pager = '<div class="admin-pager">' +
        '<button class="ghost" onclick="changeAdminMemberPage(-1)" ' + (adminMemberPage <= 0 ? 'disabled' : '') + '>이전 20명</button>' +
        '<span class="small">' + (adminMemberPage + 1) + ' / ' + totalPages + ' 페이지 · 검색결과 ' + filtered.length + '명</span>' +
        '<button class="ghost" onclick="changeAdminMemberPage(1)" ' + (adminMemberPage >= totalPages - 1 ? 'disabled' : '') + '>다음 20명</button>' +
      '</div>';

      return '<div class="card" style="box-shadow:none;margin-top:14px;">' +
        '<h3>약관동의 회원 상세정보 / 관리자관리</h3>' +
        '<div class="notice blue-note">관리자 화면은 Table Editor 원본 행 수를 그대로 보여주지 않고, 약관동의 완료 후 active 상태인 실제 회원만 상세정보에 표시합니다. 로그인만 했거나 중복으로 남은 카카오/네이버 행은 회원목록 숫자에 넣지 않습니다. 카카오/네이버/사이트 약관회원, 오늘 가입, 탈퇴 누계를 따로 표시하고, 탈퇴회원은 현재 회원수에서 제외합니다.</div>' +
        '<div class="actions" style="margin:8px 0 10px;"><button type="button" class="primary" onclick="syncSupabaseMembersForAdmin(true)" ' + (adminSupabaseMemberSyncing ? 'disabled' : '') + '>' + (adminSupabaseMemberSyncing ? '회원목록 불러오는 중' : '약관회원/가입통계 새로고침') + '</button><span class="small">' + escapeHtml(adminSupabaseMemberSyncMessage || (adminSupabaseMemberSyncedAt ? '마지막 동기화: ' + formatNullableDateTime(new Date(adminSupabaseMemberSyncedAt).toISOString()) : '관리자 화면 진입 시 약관동의 active 회원을 확인합니다.')) + '</span></div>' +
        renderAdminSignupMethodBoard(activeMembers) +
        summary +
        renderAdminPaymentStatusBoard(activeMembers) +
        renderAdminCreateAccountPanel() +
        '<div class="admin-member-toolbar"><div><input id="adminMemberSearchInput" type="text" placeholder="이름 / 아이디 / 휴대폰번호 / 카카오·네이버계정 검색" value="' + escapeHtml(adminMemberSearchText || '') + '" oncompositionstart="adminMemberSearchComposing=true" oncompositionend="finishAdminMemberSearchComposition(this)" oninput="handleAdminMemberSearchInput(this)" onkeydown="if(event.key===\'Enter\' && !adminMemberSearchComposing){applyAdminMemberSearch();}" /></div><div class="actions admin-search-actions"><button type="button" class="primary" onclick="applyAdminMemberSearch()">검색</button><button type="button" class="ghost" onclick="clearAdminMemberSearch()">초기화</button></div><div class="small">현재 폴더: <b>' + escapeHtml(getAdminFolderLabel(adminMemberFolder)) + '</b></div></div>' +
        '<div class="admin-folder-tabs">' + folderButtons + '</div>' +
        rows + pager +
      '</div>';
    }


    function renderAdmin() {
      if (!isAdminLoggedIn()) { showScreen('signupScreen'); return; }
      if (!sitePassEquipmentSyncing && (!sitePassEquipmentSyncedAt || Date.now() - sitePassEquipmentSyncedAt > 30000)) {
        try { syncSupabaseEquipmentItems(true); } catch (e) {}
      }
      const items = getItems();
      const members = ensureMemberIds();
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
        '<div class="small">장비 서버동기화: ' + escapeHtml(sitePassEquipmentSyncMessage || (sitePassEquipmentSyncedAt ? '마지막 확인 ' + formatNullableDateTime(new Date(sitePassEquipmentSyncedAt).toISOString()) : '대기 중')) + '</div>' +
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
      document.getElementById('adminBox').innerHTML =
        '<div class="notice blue-note"><b>현재 권한: ' + escapeHtml(getCurrentAdminRoleName()) + '</b><br>' + (isSuperAdminLoggedIn() ? '대표이사 최고관리자는 모든 관리 기능을 사용할 수 있으며, 직원 관리자 아이디 생성/비밀번호 재설정/해제가 가능합니다.' : '직원 관리자는 관리자모드 접속 권한만 부여된 상태입니다. 관리자 아이디 생성/해제는 최고관리자만 가능합니다.') + '</div>' +
        topSummary +
        renderAdminTodoSummary({ waitingContacts, paymentDue, paused, expiringDocs, expiredDocs, grace14Items }) +
        renderAdminStaffManager(members) + renderAdminContactManager();
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
      if (!doc.expiry || !doc.expireDate) return '첨부됨';
      const today = new Date();
      today.setHours(0,0,0,0);
      const end = new Date(doc.expireDate);
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
      const targets = ['equipmentInspection','insurancePolicy','ndtInspection','driverLicense'];
      const parts = targets.map(key => docs[key]).filter(Boolean).filter(doc => doc.expireDate).map(doc => doc.title + ' ' + getDdayText(doc.expireDate));
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
        return '현재는 PC에서 파일을 직접 연 상태라 설치창이 뜨지 않습니다. 정식 https 주소에 올린 뒤 <b>홈화면에 설치하기</b> 버튼을 확인해야 합니다.';
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
          btn.textContent = '홈화면에 설치하기';
          btn.disabled = false;
        } else {
          btn.textContent = '홈화면에 설치하기';
          btn.disabled = false;
        }
      });
      if (message) setHomeInstallStatus(message);
    }

    async function addSitePassToHomeScreen(event) {
      if (event && event.preventDefault) event.preventDefault();

      if (isHomeInstallGuidePanelOpen()) {
        closeHomeInstallGuidePanel('설치 안내를 접었습니다. 필요하면 다시 <b>홈화면에 설치하기</b>를 눌러주세요.');
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
      setHomeInstallStatus('추천링크로 접속했습니다. 아래 <b>홈화면에 설치하기</b>를 누르면 설치 가능한 브라우저는 설치창이 열리고, 안 뜨면 수동 방법을 따라 추가하면 됩니다.');
      setTimeout(function() {
        if (!deferredSitePassInstallPrompt && !isSitePassStandalone()) {
          openHomeInstallGuidePanel(getSitePassInstallFallbackMessage());
        } else {
          updateHomeInstallButtonState('설치 준비가 완료되면 <b>홈화면에 설치하기</b> 버튼으로 설치창을 열 수 있습니다.');
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
        bundleMeta:{ unit:'통합 서류함 1건', includedGroups:['equipment','driver'], includedGroupNames:['장비서류','장비기사서류'], workerPeopleCount:0, normalWorkerCount:0, specialWorkerCount:0, workerPeople:[], paymentText:'실사용 베타 운영 중입니다' },
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
        bundleMeta:{ unit:'통합 서류함 1건', includedGroups:['equipment'], includedGroupNames:['장비서류'], workerPeopleCount:0, normalWorkerCount:0, specialWorkerCount:0, workerPeople:[], paymentText:paid ? '1개월권 결제완료' : '실사용베타 후 미결제 예정' },
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
      if (hash.startsWith('#pay=')) {
        handleAutoPaymentHash(hash);
        return true;
      }
      if (hash.startsWith('#manager=')) {
        const parsed = parseManagerHash(hash);
        renderManagerPrintFromHash(parsed);
        return true;
      }
      if (hash.startsWith('#qr=')) {
        const code = decodeURIComponent(hash.replace('#qr=', ''));
        renderPublic(code);
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
      if (state.sitepassScreen) {
        sitePassHandlingPopState = true;
        showScreen(state.sitepassScreen, { skipHistory:true });
        sitePassHandlingPopState = false;
        return;
      }
      if (window.location.hash && checkHash()) return;
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
        ? '추천링크 설치 준비가 완료되었습니다. <b>홈화면에 설치하기</b>를 누르면 설치창이 열립니다.'
        : '이 브라우저에서는 <b>홈화면에 설치하기</b> 버튼으로 설치창을 열 수 있습니다.');
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
        clearLegacyAutoLoginState();
        const didCleanReset = resetSitePassTestDataOnce();
        ensureAdminSampleData();
        if (!didCleanReset) recordSiteVisit();

        renderDocCards();
        renderAlertPreview();
        setupRegistrationDraftAutoSave();
        setupJuminLimitDelegates();
        restorePwaAutoMemberSession();
        refreshAdminUi();
        refreshMemberUi();
        try { setTimeout(function(){ syncSupabaseEquipmentItems(true); }, 600); } catch (e) {}
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
          const initialScreen = isAdminLoggedIn()
            ? 'adminScreen'
            : (isMemberLoggedIn() ? (isSitePassInstalledAppMode() ? 'listScreen' : 'homeScreen') : 'signupScreen');
          showScreen(initialScreen, { replace:true });
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
