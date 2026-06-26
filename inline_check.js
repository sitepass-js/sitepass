
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
    const ADMIN_ID = 'sitepassadmin'; // 실사용 베타 임시 최고관리자 ID - 정식 서비스에서는 서버 인증으로 교체
    const ADMIN_PASSWORD = 'sitepass-admin-beta-2026'; // 실사용 베타 임시 비밀번호 - 공개 저장소/정식 서비스에서는 사용 금지
    const SUPER_ADMIN_ROLE_NAME = '최고관리자';
    const ADMIN_ROLE_MAP_KEY = STORAGE_KEY + '_admin_role_map';
    const ADMIN_WITHDRAWN_MEMBERS_KEY = STORAGE_KEY + '_withdrawn_members';
    const CONTACT_STORAGE_KEY = STORAGE_KEY + '_contacts';
    const SELECTED_PAYMENT_PLAN_KEY = STORAGE_KEY + '_selectedPaymentPlan';
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

    let currentDetailLink = '';
    let cameraStream = null;
    let activeCameraCard = null;
    let cameraScanTimer = null;
    let latestCameraBox = null;
    let latestCameraDetectedAt = 0;
    let workerPersonSeq = 0;
    let editingCode = '';
    let pageEditState = null;
    const TEST_PRIVATE_DOC_CODE = '123456';
    let sitepassSignupPhoneVerified = false;
    let sitepassSignupPhoneRequestSent = false;
    let deferredSitePassInstallPrompt = null;

    const DOC_GROUPS = [
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
    const DOCS = DOC_GROUPS.flatMap(group => group.docs.map(doc => ({ ...doc, groupKey:group.key, groupTitle:group.title })));


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
        return JSON.parse(localStorage.getItem(CURRENT_MEMBER_KEY) || 'null');
      } catch (e) {
        return null;
      }
    }

    function isMemberLoggedIn() {
      return !!getCurrentMemberTest();
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
        autoLogin: true,
        securityMemo: '중요작업은 비밀번호 재확인',
        loggedInAt: new Date().toISOString()
      };
      localStorage.setItem(CURRENT_MEMBER_KEY, JSON.stringify(current));
    }

    function completeMemberLoginTest(member, message) {
      if (member && member.adminRole) {
        completeMemberAdminLogin(member);
        return;
      }
      const updatedMember = updateMemberLastLogin(member, member?.signupMethod || member?.provider || 'SitePass 로그인') || member;
      setCurrentMemberTest(updatedMember || {});
      refreshMemberUi();
      if (message) alert(message);
      showScreen('homeScreen');
    }

    function memberLogout() {
      localStorage.removeItem(CURRENT_MEMBER_KEY);
      refreshMemberUi();
      showScreen('signupScreen');
    }

    function memberWithdraw() {
      const current = getCurrentMemberTest();
      if (!current) {
        alert('로그인된 회원이 없습니다.');
        showScreen('signupScreen');
        return;
      }
      const firstOk = confirm('회원탈퇴를 진행할까요?\n\n베타버전에서는 현재 로그인 회원정보와 이 브라우저에 저장된 보관함 서류/코드가 삭제됩니다.');
      if (!firstOk) return;
      const typed = prompt('정말 탈퇴하려면 아래에 탈퇴 라고 입력해주세요.\n삭제 후에는 이 브라우저 임시 데이터가 복구되지 않습니다.');
      if ((typed || '').trim() !== '탈퇴') {
        alert('회원탈퇴가 취소되었습니다.');
        return;
      }
      const members = getMembers().filter(member => {
        const sameId = current.id && member.id === current.id;
        const samePhone = current.phone && member.phone === current.phone;
        const sameProviderId = current.providerId && member.providerId === current.providerId;
        const sameSignupId = current.signupId && member.signupId === current.signupId;
        const sameNameProvider = current.name && current.provider && member.name === current.name && member.provider === current.provider;
        return !(sameId || samePhone || sameProviderId || sameSignupId || sameNameProvider);
      });
      setMembers(members);
      [STORAGE_KEY, PREV_STORAGE_KEY_7, PREV_STORAGE_KEY_6, PREV_STORAGE_KEY_5, PREV_STORAGE_KEY_4, PREV_STORAGE_KEY_3, PREV_STORAGE_KEY_2, PREV_STORAGE_KEY, SELECTED_PAYMENT_PLAN_KEY, CURRENT_MEMBER_KEY].forEach(key => {
        if (key) localStorage.removeItem(key);
      });
      refreshMemberUi();
      resetForm();
      alert('회원탈퇴가 완료되었습니다.\n현재 브라우저의 회원정보와 보관함 서류/코드를 삭제했습니다.');
      showScreen('signupScreen');
    }

    function refreshMemberUi() {
      const loggedIn = isMemberLoggedIn();
      const logoutBtn = document.getElementById('memberLogoutButton');
      const withdrawBtn = document.getElementById('memberWithdrawButton');
      if (logoutBtn) logoutBtn.classList.toggle('hidden', !loggedIn);
      if (withdrawBtn) withdrawBtn.classList.toggle('hidden', !loggedIn);
    }

    function getMembers() {
      try {
        return JSON.parse(localStorage.getItem(MEMBER_STORAGE_KEY) || '[]');
      } catch (e) {
        return [];
      }
    }

    function setMembers(list) {
      localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(list || []));
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

    function saveMemberTest(member) {
      const members = ensureMemberIds();
      const memberPhone = String(member.phone || '').replace(/[^0-9]/g, '');
      const memberSignupId = String(member.signupId || '').toLowerCase();
      const memberProviderId = String(member.providerId || '').toLowerCase();
      const memberName = String(member.name || '').toLowerCase();
      const existing = members.find(m => {
        const mPhone = String(m.phone || '').replace(/[^0-9]/g, '');
        const mSignupId = String(m.signupId || '').toLowerCase();
        const mProviderId = String(m.providerId || '').toLowerCase();
        const mName = String(m.name || '').toLowerCase();
        return (member.id && m.id === member.id) ||
          (memberPhone && mPhone === memberPhone) ||
          (memberSignupId && mSignupId === memberSignupId) ||
          (memberProviderId && mProviderId === memberProviderId) ||
          (memberName && mName === memberName && (member.provider === m.provider || member.signupMethod === m.signupMethod));
      });
      if (existing) {
        const keepAdminRole = existing.adminRole;
        const keepAdminRoleUpdatedAt = existing.adminRoleUpdatedAt;
        const keepAdminRoleUpdatedBy = existing.adminRoleUpdatedBy;
        Object.assign(existing, member, { updatedAt:new Date().toISOString() });
        if (keepAdminRole && !member.adminRole) existing.adminRole = keepAdminRole;
        if (keepAdminRoleUpdatedAt && !member.adminRoleUpdatedAt) existing.adminRoleUpdatedAt = keepAdminRoleUpdatedAt;
        if (keepAdminRoleUpdatedBy && !member.adminRoleUpdatedBy) existing.adminRoleUpdatedBy = keepAdminRoleUpdatedBy;
      } else {
        members.unshift({ id:'MEM-' + Date.now(), createdAt:new Date().toISOString(), status:'실사용베타', ...member });
      }
      setMembers(members);
    }

    function getSignupAgreements() {
      const getChecked = id => !!document.getElementById(id)?.checked;
      return {
        service: getChecked('agreeServiceTerms'),
        privacy: getChecked('agreePrivacyTerms'),
        documentShare: getChecked('agreeDocumentTerms'),
        sensitiveInfo: getChecked('agreeSensitiveTerms'),
        paymentPolicy: getChecked('agreePaymentTerms'),
        responsibility: getChecked('agreeResponsibilityTerms'),
        serviceAlerts: getChecked('agreeAlertTerms'),
        marketing: getChecked('agreeMarketingTerms'),
        agreedAt: new Date().toISOString()
      };
    }

    function hasRequiredSignupTerms() {
      return Array.from(document.querySelectorAll('.signup-required-term')).every(input => input.checked);
    }

    function requireSignupTerms() {
      if (!hasRequiredSignupTerms()) {
        alert('회원가입 전에 필수 약관을 모두 확인하고 동의해주세요.');
        const box = document.querySelector('.terms-box');
        if (box) box.scrollIntoView({ behavior:'smooth', block:'start' });
        return false;
      }
      return true;
    }

    function toggleAllSignupTerms(checked) {
      document.querySelectorAll('.signup-term').forEach(input => { input.checked = checked; });
      updateSignupTermsUi();
    }

    function updateSignupTermsUi() {
      const all = Array.from(document.querySelectorAll('.signup-term'));
      const allBox = document.getElementById('agreeAllTerms');
      if (allBox) allBox.checked = all.length > 0 && all.every(input => input.checked);
      const note = document.getElementById('termsOkNote');
      if (note) note.classList.toggle('show', hasRequiredSignupTerms());
    }


    function submitSocialLoginTest(provider) {
      const providerLabel = provider === '네이버' ? '네이버' : provider;
      const member = {
        name: providerLabel + ' 사용자',
        phone: '',
        provider,
        providerId: provider + '-LOGIN-' + Date.now(),
        signupMethod: providerLabel + ' 계정 로그인'
      };
      saveMemberTest(member);
      completeMemberLoginTest(member, providerLabel + ' 계정으로 로그인되었습니다.\nSitePass 메인 화면으로 이동합니다.');
    }

    function normalizeLoginText(value) {
      return String(value || '').trim();
    }

    function openAdminLoginFromSignup() {
      showScreen('signupScreen');
    }

    function isSuperAdminLoginId(loginId) {
      return normalizeLoginText(loginId).toLowerCase() === String(ADMIN_ID).toLowerCase();
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
      return localStorage.getItem(ADMIN_SESSION_KEY + '_role') || SUPER_ADMIN_ROLE_NAME;
    }

    function isSuperAdminLoggedIn() {
      return isAdminLoggedIn() && getCurrentAdminRoleName() === SUPER_ADMIN_ROLE_NAME;
    }

    function completeAdminLogin(roleName, adminId, adminName) {
      localStorage.setItem(ADMIN_SESSION_KEY, 'yes');
      localStorage.setItem(ADMIN_SESSION_KEY + '_role', roleName || SUPER_ADMIN_ROLE_NAME);
      localStorage.setItem(ADMIN_SESSION_KEY + '_id', adminId || '');
      localStorage.setItem(ADMIN_SESSION_KEY + '_name', adminName || '');
      localStorage.removeItem(CURRENT_MEMBER_KEY);
      refreshAdminUi();
      refreshMemberUi();
      showScreen('adminScreen');
    }

    function completeSuperAdminLogin() {
      completeAdminLogin(SUPER_ADMIN_ROLE_NAME, ADMIN_ID, '대표이사');
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
      const role = updatedMember.adminRole || member.adminRole || '운영관리자';
      const adminId = updatedMember.signupId || updatedMember.providerId || updatedMember.id || updatedMember.name || '';
      const adminName = updatedMember.name || updatedMember.signupId || '관리자';
      completeAdminLogin(role, adminId, adminName);
    }

    function submitSitePassLoginTest() {
      const loginInput = document.getElementById('sitepassLoginIdentifier');
      const pwInput = document.getElementById('sitepassLoginPassword');
      const continueButton = document.getElementById('sitepassLoginContinueButton');
      const loginId = normalizeLoginText(loginInput?.value);

      if (!loginId) {
        alert('아이디 / 휴대폰번호 / 이메일을 입력해주세요.');
        return;
      }

      if (pwInput && pwInput.classList.contains('hidden')) {
        const foundMember = findMemberForLogin(loginId);
        const mappedRole = getMappedAdminRoleForLogin(loginId);
        const resolvedRole = (foundMember && foundMember.adminRole) || mappedRole;
        pwInput.classList.remove('hidden');
        if (continueButton) continueButton.textContent = '로그인';
        if (isSuperAdminLoginId(loginId)) {
          alert('최고관리자 계정입니다. 비밀번호를 입력하면 관리자 화면으로 바로 이동합니다.');
        } else if (resolvedRole) {
          alert(resolvedRole + ' 계정입니다. 비밀번호를 입력하면 관리자 화면으로 이동합니다.');
        }
        setTimeout(() => pwInput.focus(), 80);
        return;
      }

      const password = normalizeLoginText(pwInput?.value);
      if (!password) {
        alert('비밀번호를 입력해주세요.');
        pwInput?.focus();
        return;
      }

      if (isSuperAdminLoginId(loginId)) {
        if (password === ADMIN_PASSWORD) {
          alert('최고관리자 접속 완료. 관리자 화면으로 이동합니다.');
          completeSuperAdminLogin();
          return;
        }
        alert('최고관리자 비밀번호가 맞지 않습니다.');
        pwInput?.focus();
        return;
      }

      let member = findMemberForLogin(loginId);
      const mappedRole = getMappedAdminRoleForLogin(loginId);
      const resolvedRole = (member && member.adminRole) || mappedRole;

      if (resolvedRole) {
        if (member && !isMemberPasswordOk(member, password)) {
          alert('권한이 있는 계정입니다. 비밀번호가 맞지 않습니다.');
          pwInput?.focus();
          return;
        }
        if (member && mappedRole && !member.adminRole) {
          member.adminRole = mappedRole;
          saveMemberTest(member);
        }
        if (member) {
          member.adminRole = resolvedRole;
          completeMemberAdminLogin(member);
        } else {
          completeAdminLogin(resolvedRole, loginId, loginId);
        }
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
      alert('로그인할 수 없으면 SitePass 휴대폰 회원가입을 이용하거나 회사 문의로 도움을 받을 수 있게 연결할 예정입니다.');
    }

    function submitSocialSignupTest(provider) {
      if (!requireSignupTerms()) return;
      const providerLabel = provider === '네이버' ? '네이버 아이디' : provider;
      const member = {
        name: providerLabel + ' 임시 회원',
        phone: '',
        provider,
        providerId: provider + '-BETA-' + Date.now(),
        signupMethod: providerLabel + ' 로그인/회원가입',
        agreements: getSignupAgreements()
      };
      saveMemberTest(member);
      completeMemberLoginTest(member, providerLabel + '로 로그인/회원가입이 완료되었습니다.\n이제 SitePass 메인 화면으로 이동합니다.\n현재는 실사용 베타 운영 중입니다.');
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
      setTimeout(() => document.getElementById('sitepassSignupName')?.focus(), 80);
    }

    function getSitePassSignupIdentity() {
      return {
        name: (document.getElementById('sitepassSignupName')?.value || '').trim(),
        phone: (document.getElementById('sitepassSignupPhone')?.value || '').trim(),
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
      if (status) status.textContent = '이름, 휴대폰번호, 통신사를 입력한 뒤 인증요청을 눌러주세요. 임시 인증번호는 123456입니다.';
    }

    function sendSitePassSignupPhoneCodeTest() {
      if (!requireSignupTerms()) return;
      const identity = getSitePassSignupIdentity();
      if (!identity.name || !identity.phone || !identity.carrier) {
        alert('이름/업체명, 휴대폰번호, 통신사를 먼저 입력해주세요.');
        return;
      }
      if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(identity.phone)) {
        alert('휴대폰번호 형식을 확인해주세요. 예: 010-0000-0000');
        return;
      }
      sitepassSignupPhoneRequestSent = true;
      sitepassSignupPhoneVerified = false;
      const codeBox = document.getElementById('sitepassSignupCodeBox');
      if (codeBox) codeBox.classList.remove('hidden');
      const requestButton = document.getElementById('sitepassSignupRequestButton');
      if (requestButton) requestButton.textContent = '인증번호 재전송';
      const status = document.getElementById('sitepassSignupVerifyStatus');
      if (status) status.textContent = identity.carrier + ' 본인확인 문자 발송 완료. 임시 인증번호 123456을 입력해주세요.';
      const codeInput = document.getElementById('sitepassSignupCode');
      if (codeInput) setTimeout(() => codeInput.focus(), 80);
      alert('[SitePass 인증]\n' + identity.name + '님 휴대폰으로 6자리 인증번호를 보냈습니다.\n임시 인증번호: 123456\n\n정식 서비스에서는 통신사 본인확인 API로 이름·전화번호·통신사 일치 여부를 확인합니다.');
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
      if (status) status.textContent = '휴대폰 본인확인 완료: ' + identity.name + ' / ' + identity.carrier + ' / ' + identity.phone;
      const codeBox = document.getElementById('sitepassSignupCodeBox');
      if (codeBox) codeBox.classList.add('hidden');
      alert('휴대폰 본인확인이 완료되었습니다. 이제 SitePass 회원가입을 완료할 수 있습니다.');
    }

    function submitSitePassSignupTest() {
      if (!requireSignupTerms()) return;
      const identity = getSitePassSignupIdentity();
      const name = identity.name;
      const phone = identity.phone;
      const carrier = identity.carrier;
      const signupId = (document.getElementById('sitepassSignupId')?.value || '').trim();
      const pw = (document.getElementById('sitepassSignupPw')?.value || '').trim();
      const pw2 = (document.getElementById('sitepassSignupPw2')?.value || '').trim();
      if (!name || !phone || !carrier || !signupId || !pw || !pw2) {
        alert('이름/업체명, 휴대폰번호, 통신사, SitePass 아이디, 비밀번호를 모두 입력해주세요.');
        return;
      }
      if (!sitepassSignupPhoneVerified) {
        alert('SitePass 회원가입은 휴대폰 본인확인 후 완료할 수 있습니다. 인증요청 후 6자리 인증번호를 확인해주세요.');
        return;
      }
      if (signupId.length < 4) {
        alert('SitePass 아이디는 4자 이상으로 입력해주세요.');
        return;
      }
      if (findMemberForLogin(signupId)) {
        alert('이미 사용 중인 SitePass 아이디입니다. 다른 아이디를 입력해주세요.');
        return;
      }
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
      ['sitepassSignupName','sitepassSignupPhone','sitepassSignupCarrier','sitepassSignupCode','sitepassSignupId','sitepassSignupPw','sitepassSignupPw2'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
      });
      resetSitePassSignupPhoneAuth();
      showScreen('homeScreen');
    }

    function getContacts() {
      try {
        return JSON.parse(localStorage.getItem(CONTACT_STORAGE_KEY) || '[]');
      } catch (error) {
        return [];
      }
    }

    function setContacts(list) {
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

    function showScreen(id) {
      const memberProtectedScreens = ['homeScreen','registerScreen','listScreen','pricingScreen','contactScreen','detailScreen'];
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
      if (id === 'listScreen') renderList();
      if (id === 'pricingScreen') renderPricingScreen();
      if (id === 'registerScreen') { const docBox = document.getElementById('docCards'); if (docBox && !docBox.innerHTML.trim()) renderDocCards(); renderAlertPreview(); renderBundleSummary(); updateRegisterModeUi(); }
      if (id === 'adminScreen') renderAdmin();
      if (id === 'contactScreen') renderContactHistory();
      if (id === 'signupScreen') {
        const box = document.getElementById('sitepassSignupBox');
        if (box) box.classList.add('hidden');
        const joinBox = document.getElementById('joinChoiceBox');
        if (joinBox) joinBox.classList.add('hidden');
        const pwInput = document.getElementById('sitepassLoginPassword');
        if (pwInput) { pwInput.classList.add('hidden'); pwInput.value = ''; }
        const continueButton = document.getElementById('sitepassLoginContinueButton');
        if (continueButton) continueButton.textContent = '계속';
        resetSitePassSignupPhoneAuth();
      }
      if (id === 'managerAccessScreen') { setTimeout(() => document.getElementById('managerCodeInput')?.focus(), 80); }
      refreshAdminUi();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function isAdminLoggedIn() {
      return localStorage.getItem(ADMIN_SESSION_KEY) === 'yes';
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
      const globalHomeButton = document.getElementById('globalHomeButton');
      if (statePill) { statePill.textContent = loggedIn ? getCurrentAdminRoleName() : '관리자모드'; statePill.classList.toggle('hidden', !loggedIn); }
      if (signupTopButton) signupTopButton.classList.toggle('hidden', loggedIn);
      if (logoutButton) logoutButton.classList.toggle('hidden', !loggedIn);
      if (globalHomeButton) globalHomeButton.textContent = loggedIn ? '관리자홈' : '홈';

      const homeContactAdminButton = document.getElementById('homeContactAdminButton');
      const homeFourthTitle = document.getElementById('homeFourthTitle');
      const homeFourthDesc = document.getElementById('homeFourthDesc');
      if (homeContactAdminButton) {
        homeContactAdminButton.textContent = loggedIn ? '관리자모드' : '문의';
        homeContactAdminButton.className = loggedIn ? 'dangerBtn' : 'okBtn';
      }
      if (homeFourthTitle) homeFourthTitle.textContent = loggedIn ? '4. 관리자모드' : '4. 문의';
      if (homeFourthDesc) {
        homeFourthDesc.textContent = loggedIn
          ? '관리자로 로그인한 경우 문의 대신 관리자페이지로 들어갑니다.'
          : '사용 중 문제, 서류 등록 요청, 결제 문의를 남길 수 있는 화면입니다.';
      }
    }

    function adminLogin() {
      const id = normalizeLoginText(document.getElementById('adminIdInput')?.value || document.getElementById('sitepassLoginIdentifier')?.value);
      const pw = normalizeLoginText(document.getElementById('adminPwInput')?.value || document.getElementById('sitepassLoginPassword')?.value);
      if (isSuperAdminLoginId(id) && pw === ADMIN_PASSWORD) {
        alert('최고관리자 접속 완료. 관리자 화면으로 이동합니다.');
        completeSuperAdminLogin();
        return;
      }
      const member = findMemberForLogin(id);
      const mappedRole = getMappedAdminRoleForLogin(id);
      const resolvedRole = (member && member.adminRole) || mappedRole;
      if (resolvedRole && (!member || isMemberPasswordOk(member, pw))) {
        completeAdminLogin(resolvedRole, id, member?.name || id);
        return;
      }
      alert('계정 또는 비밀번호가 맞지 않습니다.');
    }

    function adminLogout() {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_SESSION_KEY + '_role');
      localStorage.removeItem(ADMIN_SESSION_KEY + '_id');
      localStorage.removeItem(ADMIN_SESSION_KEY + '_name');
      refreshAdminUi();
      alert('로그아웃했습니다.');
      showScreen('homeScreen');
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
      alert(title + '는 6자리 번호 확인 전에는 파일선택/사진찍기를 사용할 수 없습니다.\n' + getPrivateDocLockTargetText(card) + '\n현재 임시 6자리 번호는 123456입니다.');
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

    function getPersonAuthValues(kind) {
      const panel = document.querySelector('[data-person-auth-panel="' + kind + '"]');
      if (!panel) return null;
      return {
        panel,
        type: panel.querySelector('[data-person-auth-type]')?.value || '',
        name: (panel.querySelector('[data-person-auth-name]')?.value || '').trim(),
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
      if (kind === 'driver') return '기사';
      const type = values?.type || document.querySelector('[data-person-auth-panel="worker"] [data-person-auth-type]')?.value || 'normal';
      return type === 'special' ? '특수인부' : '보통인부';
    }

    function buildPersonAuthSmsText(kind) {
      const values = getPersonAuthValues(kind) || {};
      const role = getPersonKindLabel(kind, values);
      const name = values.name || (kind === 'driver' ? '기사님' : '인부님');
      const equipmentNo = (document.getElementById('equipmentNo')?.value || '등록장비').trim();
      const equipmentName = (document.getElementById('equipmentName')?.value || '현장 장비').trim();
      const link = 'https://sitepass.kr/consent/' + (kind === 'driver' ? 'driver' : 'worker') + '/예시코드';
      return '[SitePass] ' + name + '님, ' + equipmentName + ' ' + equipmentNo + ' 현장 반입서류 등록 요청입니다.\n' +
        '약관/동의 내용을 확인한 뒤 동의하시면 6자리 번호를 등록자에게 알려주세요.\n' +
        '약관/동의 확인 링크: ' + link + '\n' +
        '6자리 동의번호: 123456\n' +
        '동의하지 않거나 요청한 내용이 아니면 번호를 알려주지 말고 문자를 무시하세요.';
    }

    function buildPersonAuthConsentText(kind) {
      const values = getPersonAuthValues(kind) || {};
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
      if (!values.name) { alert((kind === 'driver' ? '기사' : '인부') + ' 이름을 입력해주세요.'); values.panel.querySelector('[data-person-auth-name]')?.focus(); return; }
      if (!values.phone) { alert((kind === 'driver' ? '기사' : '인부') + ' 휴대폰번호를 입력해주세요.'); values.panel.querySelector('[data-person-auth-phone]')?.focus(); return; }
      values.panel.dataset.authCodeSent = 'true';
      values.panel.dataset.authPhone = values.phone;
      values.panel.dataset.authName = values.name;
      values.panel.dataset.authType = values.type || '';
      togglePersonAuthCodeInput(values.panel, true);
      renderPersonSmsPreview(kind);
      setPersonAuthStatus(kind, '약관/동의 안내 문자와 6자리 번호를 보냈습니다. 기사/인부가 동의하면 그 번호를 등록자에게 알려주고, 등록자는 아래 입력칸에 입력합니다.', 'pending');
      values.panel.querySelector('[data-person-auth-code]')?.focus();
      alert('현재 임시 6자리 번호는 123456입니다.\n정식 서비스에서는 ' + values.phone + ' 번호로 약관/동의 링크와 6자리 번호가 발송됩니다. 기사/인부가 동의하면 그 번호를 등록자에게 알려주는 방식입니다.');
    }

    function verifyPersonAuth(kind) {
      const values = getPersonAuthValues(kind);
      if (!values) return;
      if (!values.name) { alert((kind === 'driver' ? '기사' : '인부') + ' 이름을 입력해주세요.'); return; }
      if (!values.phone) { alert('휴대폰번호를 먼저 입력해주세요.'); return; }
      if (values.panel.dataset.authCodeSent !== 'true') { alert('먼저 약관/동의 문자보내기 버튼을 눌러주세요.'); return; }
      if (values.code !== TEST_PRIVATE_DOC_CODE) { alert('6자리 번호가 맞지 않습니다. 현재 임시 번호 123456을 입력해주세요.'); values.panel.querySelector('[data-person-auth-code]')?.focus(); return; }
      const meta = {
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
      setPersonAuthStatus(kind, kind === 'driver' ? '기사 문자 동의안내와 6자리 번호 확인을 완료하면 기사서류 전체가 열립니다.' : '인부 1명마다 문자 동의안내와 6자리 번호 확인 후 추가 버튼이 열립니다.', 'pending');
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

      // HTTPS/localhost가 아니면 브라우저 내 카메라(getUserMedia)가 막히는 경우가 많습니다.
      // 이때는 사용자 클릭이 살아있는 즉시 휴대폰 기본 카메라(input capture)를 엽니다.
      if (!window.isSecureContext || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
        openNativeCameraFile(card);
        return;
      }

      const modal = document.getElementById('cameraModal');
      const video = document.getElementById('cameraVideo');
      const status = document.getElementById('cameraScanStatus');
      modal.classList.remove('hidden');
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
        if (note) note.textContent = '브라우저가 직접 카메라를 막았습니다. 아래 오른쪽 [기본 카메라]를 누르면 휴대폰 촬영창으로 바로 넘어가고, 촬영 후 자동자르기 후보가 만들어집니다.';
      }
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

    async function takeCameraPhoto() {
      const video = document.getElementById('cameraVideo');
      const targetCard = activeCameraCard;
      if (!video || !video.videoWidth || !targetCard) {
        fallbackCameraFile();
        return;
      }
      if (!requirePrivateDocAuth(targetCard)) {
        closeCameraGuide();
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const freshBox = (latestCameraBox && Date.now() - latestCameraDetectedAt < 1500) ? latestCameraBox : detectDocumentBoxOnCanvas(canvas);
      if (freshBox) {
        try {
          const pad = Math.round(Math.max(freshBox.w, freshBox.h) * 0.035);
          const croppedCanvas = cropCanvas(canvas, freshBox, pad);
          const scanned = smartA4DocumentScan(croppedCanvas, true, targetCard.dataset.docKey || '');
          const finalCanvas = resizeCanvasIfNeeded(scanned.canvas, 1100);
          targetCard.dataset.cameraAutoCropDataUrl = finalCanvas.toDataURL('image/jpeg', 0.84);
          targetCard.dataset.cameraAutoCropLabel = '촬영 시 자동 서류잡기 완료';
        } catch (error) {
          targetCard.dataset.cameraAutoCropDataUrl = '';
          targetCard.dataset.cameraAutoCropLabel = '';
        }
      } else {
        targetCard.dataset.cameraAutoCropDataUrl = '';
        targetCard.dataset.cameraAutoCropLabel = '';
      }

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      closeCameraGuide();
      if (!blob) return;
      const file = new File([blob], 'camera_capture_' + Date.now() + '.jpg', { type: 'image/jpeg' });
      await applySelectedFile(targetCard, file, freshBox ? '사진찍기 자동자르기' : '사진찍기');
    }

    function startCameraAutoDetect() {
      stopCameraAutoDetect();
      latestCameraBox = null;
      resetCameraAutoBox();
      scanCameraFrame();
      cameraScanTimer = setInterval(scanCameraFrame, 360);
    }

    function stopCameraAutoDetect() {
      if (cameraScanTimer) {
        clearInterval(cameraScanTimer);
        cameraScanTimer = null;
      }
    }

    function resetCameraAutoBox() {
      latestCameraBox = null;
      const guide = document.getElementById('cameraGuide');
      const box = document.getElementById('autoDocumentBox');
      const status = document.getElementById('cameraScanStatus');
      if (guide) guide.classList.remove('detected');
      if (box) box.removeAttribute('style');
      if (status) status.textContent = '서류 자동감지 준비중';
    }

    function scanCameraFrame() {
      const video = document.getElementById('cameraVideo');
      if (!video || !video.videoWidth || !video.videoHeight) return;
      const maxSide = 520;
      const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
      const scanCanvas = document.createElement('canvas');
      scanCanvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      scanCanvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const sctx = scanCanvas.getContext('2d', { willReadFrequently:true });
      sctx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);

      let smallBox = findDocumentBoundingBox(scanCanvas, sctx) || findDocumentBoundingBoxByBackground(scanCanvas, sctx);
      const status = document.getElementById('cameraScanStatus');
      if (!smallBox) {
        if (status) status.textContent = '서류를 노란 테두리에 맞춰주세요';
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
      if (status) status.textContent = '서류 자동감지됨 · 초록 박스 기준 저장';
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

    function detectDocumentBoxOnCanvas(canvas) {
      const scaled = makeScaledCanvasFromCanvas(canvas, 760);
      const box = findDocumentBoundingBox(scaled.canvas, scaled.ctx) || findDocumentBoundingBoxByBackground(scaled.canvas, scaled.ctx);
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
      if (areaRatio < 0.10 || areaRatio > 0.98) return null;
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
      target.querySelectorAll('input[type="date"]').forEach(input => {
        if (input.dataset.boundDate === 'yes') return;
        input.addEventListener('change', renderAlertPreview);
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
          '<label class="file-button' + privateAuthClass + '" data-upload-label>파일선택<input type="file" data-role="file" accept="image/*,.pdf" multiple' + privateAuthAttrs + ' /></label>' +
          '<button type="button" class="file-button camera-launch' + privateAuthClass + '" onclick="openCameraGuide(\'' + escapeJs(key) + '\')"' + privateAuthAttrs + '>사진찍기</button>' +
          '<input type="file" class="hidden-camera-input' + privateAuthClass + '" data-role="camera-fallback" accept="image/*" capture="environment" style="display:none"' + privateAuthAttrs + ' />' +
        '</div>' +
        '<div class="multi-page-hint">여러 장짜리 서류는 파일을 여러 개 선택하거나 사진찍기를 반복하세요. 저장하면 한 서류 항목 안에 1페이지, 2페이지처럼 묶입니다.</div>' +
        '<div class="selected-file" data-role="filename" data-pages-json="[]">첨부 없음</div>' +
        driverPhoneHtml + extraPhoneHtml + extraTaskHtml +
        (doc.expiry ? '<div class="date-grid"><div class="date-field"><label>' + escapeHtml(doc.dateLabel) + '</label><input type="date" data-date-key="' + doc.dateKey + '" data-date-label="' + escapeHtml(doc.dateLabel) + '" /></div></div>' : '') +
        '<div class="date-note">' + escapeHtml(doc.note) + '</div>' +
      '</div>';
    }

    function renderDriverAuthPanel() {
      return '<div class="person-auth-panel" data-person-auth-panel="driver" data-auth-code-sent="false" data-auth-verified="false">' +
        '<div class="person-auth-head"><div><b>기사 개인정보 서류 한 번 동의/인증</b><span>기사 신분증·면허증·교육증·건강검진 등 개인정보 서류는 기사 본인이 문자 동의안내를 받은 뒤 6자리 번호를 전달해야 전체 업로드가 열립니다. 인증은 사람별 최초 등록 때 받으며, 현장 링크를 보낼 때마다 다시 받지 않습니다.</span></div><span class="badge need" data-person-auth-badge>인증대기</span></div>' +
        '<div class="person-auth-grid"><input type="text" data-person-auth-name placeholder="기사 이름" autocomplete="off" /><input type="tel" data-person-auth-phone placeholder="기사 휴대폰번호" inputmode="tel" autocomplete="tel" /></div>' +
        '<div class="auth-mini-note">기사에게 약관/동의 안내 문자와 6자리 번호를 보냅니다. 기사가 문자 내용을 확인하고 동의할 때만 그 번호를 등록자에게 알려주는 방식입니다. 등록자가 받은 번호를 입력하면 기사 동의/인증 완료로 처리됩니다.</div>' +
        '<div class="person-auth-grid three"><button type="button" class="ghost" data-person-auth-send-button onclick="sendPersonAuthCode(\'driver\')">약관/동의 문자보내기</button><input type="text" class="hidden" data-person-auth-code placeholder="기사/인부가 받은 6자리 번호 입력" inputmode="numeric" maxlength="6" autocomplete="one-time-code" /><button type="button" class="primary hidden" data-person-auth-verify-button onclick="verifyPersonAuth(\'driver\')">번호확인</button></div>' +
        '<div class="person-auth-actions"><button type="button" class="secondary" data-person-auth-reset onclick="resetPersonAuth(\'driver\')">다시입력</button><button type="button" class="ghost" onclick="showAuthSmsPreview(\'driver\')">문자내용 보기</button></div>' +
        '<div class="sms-preview-box hidden" data-person-sms-preview></div>' +
        '<div class="auth-status" data-person-auth-status>기사 문자 동의안내와 6자리 번호 확인을 완료하면 기사서류 전체가 열립니다.</div>' +
      '</div>';
    }

    function renderWorkerPeopleSection() {
      return '<div class="worker-control-box">' +
        '<div class="small">인부는 여러 명이 될 수 있으므로 인부 1명마다 문자 동의안내와 6자리 번호를 먼저 확인합니다. 인증 완료 후에만 아래 추가 버튼이 열리고, 추가된 그 인부의 서류는 한 번에 업로드할 수 있습니다. 단, 이 인증은 해당 인부 서류 등록 동의용이고, 현장 담당자에게 공유 링크를 보낼 때마다 다시 인증받는 구조가 아닙니다.</div>' +
        '<div class="person-auth-panel" data-person-auth-panel="worker" data-auth-code-sent="false" data-pending-verified="false">' +
          '<div class="person-auth-head"><div><b>인부 1명 동의/인증 후 추가</b><span>보통인부/특수인부를 선택하고 이름·휴대폰번호·문자 동의안내·6자리 번호 확인을 끝내면 추가 버튼이 열립니다. 인증은 인부 1명당 최초 등록 때 받으며, 현장 링크를 보낼 때마다 다시 받지 않습니다.</span></div><span class="badge need" data-person-auth-badge>인증대기</span></div>' +
          '<div class="person-auth-grid three"><select data-person-auth-type><option value="normal">보통인부</option><option value="special">특수인부</option></select><input type="text" data-person-auth-name placeholder="인부 이름" autocomplete="off" /><input type="tel" data-person-auth-phone placeholder="인부 휴대폰번호" inputmode="tel" autocomplete="tel" /></div>' +
          '<div class="auth-mini-note">인부에게 약관/동의 안내 문자와 6자리 번호를 보냅니다. 인부가 문자 내용을 확인하고 동의할 때만 그 번호를 등록자에게 알려주는 방식입니다. 등록자가 받은 번호를 입력하면 해당 인부 동의/인증 완료로 처리됩니다.</div>' +
          '<div class="person-auth-grid three"><button type="button" class="ghost" data-person-auth-send-button onclick="sendPersonAuthCode(\'worker\')">약관/동의 문자보내기</button><input type="text" class="hidden" data-person-auth-code placeholder="기사/인부가 받은 6자리 번호 입력" inputmode="numeric" maxlength="6" autocomplete="one-time-code" /><button type="button" class="primary hidden" data-person-auth-verify-button onclick="verifyPersonAuth(\'worker\')">번호확인</button></div>' +
          '<div class="person-auth-actions"><button type="button" class="secondary" onclick="resetPersonAuth(\'worker\')">다음 인부 입력</button><button type="button" class="ghost" onclick="showAuthSmsPreview(\'worker\')">문자내용 보기</button></div>' +
          '<div class="sms-preview-box hidden" data-person-sms-preview></div>' +
          '<div class="auth-status" data-person-auth-status>인부 1명마다 문자 동의안내와 6자리 번호 확인 후 추가 버튼이 열립니다.</div>' +
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
        alert('인부를 추가하려면 먼저 해당 인부의 문자 동의안내와 6자리 번호 확인을 완료해야 합니다.');
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
    }

    function getDocPagesFromBox(nameBox) {
      if (!nameBox) return [];
      try {
        const pages = JSON.parse(nameBox.dataset.pagesJson || '[]');
        return Array.isArray(pages) ? pages : [];
      } catch (error) {
        return [];
      }
    }

    function getDocPagesFromCard(card) {
      return getDocPagesFromBox(card?.querySelector('[data-role="filename"]'));
    }

    function getPrintablePreviewFromPage(page) {
      if (!page) return '';
      return page.previewDataUrl || page.correctedDataUrl || page.originalDataUrl || '';
    }

    function normalizeDocPageForPreview(page, index, doc) {
      const p = Object.assign({}, page || {});
      const fallbackPreview = getPrintablePreviewFromPage(p) || (index === 0 && doc ? (doc.previewDataUrl || doc.correctedDataUrl || doc.originalDataUrl || '') : '');
      p.previewDataUrl = fallbackPreview || '';
      if (p.previewDataUrl && !p.previewChoice) p.previewChoice = 'preview';
      p.fileName = p.fileName || (doc && doc.fileName) || '첨부파일';
      p.fileSource = p.fileSource || (doc && doc.fileSource) || '';
      p.fileType = p.fileType || (doc && doc.fileType) || '';
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
        previewChoice:'',
        autoFit:'',
        addedAt:new Date().toISOString()
      };
      if (file.type && file.type.startsWith('image/')) {
        try {
          const original = await compressImageToDataUrl(file, 900, 0.72);
          const fitResult = await fitDocumentImageToDataUrl(file, 900, 0.72, card.dataset.docKey || '');
          const cameraCrop = card.dataset.cameraAutoCropDataUrl || '';
          const corrected = cameraCrop || fitResult.dataUrl || original;
          base.originalDataUrl = original;
          base.correctedDataUrl = corrected;
          base.previewDataUrl = corrected;
          base.previewChoice = 'corrected';
          base.autoFit = cameraCrop ? 'camera-live-paper-crop' : (fitResult.method || 'fit-size-brightness');
          base.fitText = cameraCrop ? '촬영 순간 자동 서류잡기 + A4 맞춤' : fitResult.fitText;
          base.ratioText = cameraCrop ? '초록 박스 기준으로 서류만 저장' : fitResult.ratioText;
          card.dataset.cameraAutoCropDataUrl = '';
          card.dataset.cameraAutoCropLabel = '';
        } catch (error) {
          base.errorText = '이미지 미리보기를 만들 수 없습니다.';
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
      preview.innerHTML = '<div class="preview-title"><span>첨부 ' + pages.length + '장 이미지</span></div>' + renderPagesListHtml(pages, { editable:true, docKey:card.dataset.docKey });
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
          let body = '';
          if (imgSrc) {
            body = '<div class="paper-frame"><img class="preview-img" alt="첨부 이미지" src="' + imgSrc + '" data-preview-src="' + imgSrc + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>';
          } else {
            body = isPdf ? renderPdfAttachedBox(page, '선택한 PDF 파일입니다.') : '<div class="preview-pdf">첨부됨<br><span class="small">이미지 저장본이 없으면 서버 저장 단계에서 원본 파일 보기로 연결합니다.</span></div>';
          }
          return '<div class="page-item clean-page-item">' + body + '</div>';
        }).join('') + '</div>';
      }

      return '<div class="page-list ' + (simpleUpdateMode ? 'simple-update-pages' : '') + '">' + (pages || []).map((page, index) => {
        const isPdf = (page.fileType || '').includes('pdf') || String(page.fileName || '').toLowerCase().endsWith('.pdf');
        const selectedMode = page.previewChoice === 'original' ? 'original' : (page.previewChoice === 'corrected' ? 'corrected' : (page.correctedDataUrl ? 'corrected' : 'original'));
        const selectedText = selectedMode === 'original' ? '원본 사용중' : '수정본 사용중';
        const canCompare = !!(page.originalDataUrl && page.correctedDataUrl);
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
          return '<div class="page-item simple-update-page"><div class="page-head"><b>' + (index + 1) + '페이지</b><span>' + escapeHtml(page.fileName || '첨부파일') + '</span></div>' + body + simpleActionsHtml + '</div>';
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
            (canCompare ? '<div class="page-choice-note"><span class="page-current-label">' + selectedText + '</span> 원본/수정본은 보기 버튼으로 확인할 수 있습니다.</div>' : '');
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
          (canCompare ? '' : '<button type="button" class="mini-button" onclick="openDocPagePreview(\'' + escapeJs(docKey) + '\',' + index + ',\'original\',\'' + escapeJs(docCode) + '\')">원본</button><button type="button" class="mini-button" onclick="openDocPagePreview(\'' + escapeJs(docKey) + '\',' + index + ',\'corrected\',\'' + escapeJs(docCode) + '\')">수정본</button>') +
          '<button type="button" class="mini-button primary" onclick="openPageEdit(\'' + escapeJs(docKey) + '\',' + index + ')">수정편집</button>' +
          '<button type="button" class="mini-button" onclick="moveDocPage(\'' + escapeJs(docKey) + '\',' + index + ',-1)">위로</button>' +
          '<button type="button" class="mini-button" onclick="moveDocPage(\'' + escapeJs(docKey) + '\',' + index + ',1)">아래로</button>' +
          '<button type="button" class="mini-button dangerBtn" onclick="removeDocPage(\'' + escapeJs(docKey) + '\',' + index + ')">삭제</button>' :
          (readonly ? '' : '<button type="button" class="mini-button" onclick="openDocPagePreview(\'' + escapeJs(docKey) + '\',' + index + ',\'original\',\'' + escapeJs(docCode) + '\')">원본</button><button type="button" class="mini-button" onclick="openDocPagePreview(\'' + escapeJs(docKey) + '\',' + index + ',\'corrected\',\'' + escapeJs(docCode) + '\')">수정본</button>');
        const actionsHtml = isPdf
          ? (editable ? '<div class="page-actions pdf-only-actions"><button type="button" class="mini-button dangerBtn" onclick="removeDocPage(\'' + escapeJs(docKey) + '\',' + index + ')">삭제</button></div>' : '')
          : '<div class="page-actions">' + viewButton + editButtons + '</div>';
        return '<div class="page-item"><div class="page-head"><b>' + (index + 1) + '페이지</b><span>' + escapeHtml(page.fileName || '첨부파일') + '</span></div>' + body + actionsHtml + '</div>';
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


    function openPageEdit(docKey, index) {
      const card = findDocCardByKey(docKey);
      const pages = getDocPagesFromCard(card);
      const page = pages[index];
      if (!page) return;
      const src = page.previewDataUrl || page.correctedDataUrl || page.originalDataUrl;
      if (!src) {
        alert('이미지 미리보기 저장본이 있어야 수정편집할 수 있습니다. PDF 원본 편집은 서버 저장 단계에서 붙입니다.');
        return;
      }
      pageEditState = { docKey, index, src, rotation:0, brightness:1, contrast:1 };
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
      if (img) {
        img.style.transform = 'rotate(' + pageEditState.rotation + 'deg)';
        img.style.filter = 'brightness(' + pageEditState.brightness.toFixed(2) + ') contrast(' + pageEditState.contrast.toFixed(2) + ')';
      }
      if (info) {
        info.textContent = '회전 ' + pageEditState.rotation + '도 · 밝기 ' + Math.round(pageEditState.brightness * 100) + '% · 선명도 ' + Math.round(pageEditState.contrast * 100) + '%';
      }
    }

    function rotateEditImage(deg) {
      if (!pageEditState) return;
      pageEditState.rotation = ((pageEditState.rotation + deg) % 360 + 360) % 360;
      updatePageEditPreview();
    }

    function changeEditValue(key, delta) {
      if (!pageEditState) return;
      if (key === 'brightness') pageEditState.brightness = clamp(pageEditState.brightness + delta, 0.55, 1.65);
      if (key === 'contrast') pageEditState.contrast = clamp(pageEditState.contrast + delta, 0.55, 1.80);
      updatePageEditPreview();
    }

    function resetPageEditValues() {
      if (!pageEditState) return;
      pageEditState.rotation = 0;
      pageEditState.brightness = 1;
      pageEditState.contrast = 1;
      updatePageEditPreview();
    }

    async function applyPageEdit() {
      if (!pageEditState) return;
      try {
        const editedDataUrl = await renderEditedDataUrl(pageEditState.src, pageEditState.rotation, pageEditState.brightness, pageEditState.contrast);
        const card = findDocCardByKey(pageEditState.docKey);
        const pages = getDocPagesFromCard(card);
        const page = pages[pageEditState.index];
        if (!page) return;
        page.correctedDataUrl = editedDataUrl;
        page.previewDataUrl = editedDataUrl;
        page.previewChoice = 'corrected';
        page.fitText = '직접 수정편집 적용';
        page.ratioText = '회전/밝기/선명도 저장됨';
        page.editedAt = new Date().toISOString();
        setDocPagesToCard(card, pages);
        closePageEditModal();
      } catch (error) {
        alert('수정편집 적용 중 오류가 났습니다. 다른 이미지로 다시 시도해주세요.');
      }
    }

    function renderEditedDataUrl(src, rotation, brightness, contrast) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const quarter = Math.abs(rotation % 180) === 90;
          const canvas = document.createElement('canvas');
          canvas.width = quarter ? img.height : img.width;
          canvas.height = quarter ? img.width : img.height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(rotation * Math.PI / 180);
          ctx.filter = 'brightness(' + brightness + ') contrast(' + contrast + ')';
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          const resized = resizeCanvasIfNeeded(canvas, 1100);
          resolve(resized.toDataURL('image/jpeg', 0.86));
        };
        img.onerror = reject;
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
            '<div class="compare-label"><span>크기보정 후보</span><span class="selected-chip">사용중</span></div>' +
            '<div class="paper-frame"><img class="preview-img" alt="자동보정 미리보기" src="' + correctedDataUrl + '" data-preview-src="' + correctedDataUrl + '" onclick="openPreviewModal(this.dataset.previewSrc)"></div>' +
            '<div class="preview-actions"><button type="button" class="mini-button" onclick="openCompareImage(this, \'corrected\')">A4 스캔본 크게보기</button><button type="button" class="mini-button use ' + (correctedSelected ? 'active' : '') + '" data-use-button="corrected" onclick="selectPreviewVersion(this, \'corrected\')">자동자르기 사용</button></div>' +
          '</div>' +
        '</div>' +
        '<div class="ai-status"><span>' + escapeHtml(fitText || 'AI 문서스캔 / A4 맞춤') + '</span><span>' + escapeHtml(ratioText || '저장 시 선택본 기준') + '</span></div>' +
        '<div class="fit-note"><span>자동자르기가 틀리면 원본 사용을 누르세요</span><span>원본/자동자르기 선택 가능</span></div>';
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

              const scale = Math.min(1, maxSize / Math.max(crop.w, crop.h));
              const out = document.createElement('canvas');
              out.width = Math.max(1, Math.round(crop.w * scale));
              out.height = Math.max(1, Math.round(crop.h * scale));
              const octx = out.getContext('2d');
              octx.fillStyle = '#ffffff';
              octx.fillRect(0, 0, out.width, out.height);
              octx.filter = 'contrast(1.20) brightness(1.08) saturate(.90)';
              octx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);
              octx.filter = 'none';
              sharpenCanvas(out, 0.22);
              const scanResult = smartA4DocumentScan(out, usedCrop, docKey || '');
              const finalCanvas = resizeCanvasIfNeeded(scanResult.canvas, maxSize);

              resolve({
                dataUrl: finalCanvas.toDataURL('image/jpeg', quality),
                method: scanResult.cropped ? 'a4-paper-scan' : 'fit-size-brightness',
                fitText: scanResult.cropped ? '자동보정 + 테두리 제거 + A4 보기크기 맞춤' : '전체 사진 기준: 크기 조정 약함 / 밝기 보정',
                ratioText: scanResult.cropped ? '배경 제거 후 A4 비율로 자동 축소 저장' : '서류 경계 미확실: 전체 기준'
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

    function findDocumentBoundingBox(canvas, ctx) {
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

      if (isUsableBBox(bboxPaper, w, h)) return bboxPaper;
      if (isUsableBBox(bboxDiff, w, h)) return bboxDiff;
      if (isUsableBBox(bboxEdge, w, h)) return bboxEdge;

      const merged = mergeBBoxes([bboxPaper, bboxDiff, bboxEdge], w, h);
      if (isUsableBBox(merged, w, h, 0.12, 0.98)) return merged;
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

    function isUsableBBox(bbox, w, h, minArea = 0.16, maxArea = 0.96) {
      if (!bbox) return false;
      const areaRatio = (bbox.w * bbox.h) / (w * h);
      if (areaRatio < minArea || areaRatio > maxArea) return false;
      if (bbox.w < w * 0.20 || bbox.h < h * 0.20) return false;
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


    function findDocumentBoundingBoxByBackground(canvas, ctx) {
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
      if (!isUsableBBox(bbox, w, h, 0.08, 0.98)) return null;
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

      current = whitenBackgroundToPaper(current);
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
        if (diff < 34 || (bright > 228 && sat < 38)) {
          d[i] = 255; d[i+1] = 255; d[i+2] = 255;
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
          authPhone: card.dataset.authPhone || (card.querySelector('[data-auth-phone-input]')?.value || '').trim()
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


    function startNewRegistration() {
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
      if (saveButton) saveButton.textContent = editingCode ? '수정내용 저장' : '통합 서류함 저장';
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
        if (dateInput) dateInput.value = doc.expireDate || '';
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

    function saveEquipment() {
      const equipmentNo = document.getElementById('equipmentNo').value.trim();
      const equipmentName = document.getElementById('equipmentName').value.trim();
      if (!equipmentNo) { alert('장비 등록번호를 입력해주세요.'); return; }
      if (!equipmentName) { alert('장비명을 입력해주세요.'); return; }

      const docs = collectDocData();
      const activeDefs = getActiveDocDefs();
      const missingFiles = activeDefs.filter(def => def.required && !(docs[def.key] && docs[def.key].fileName)).map(def => def.groupTitle + ' - ' + def.title);
      const missingDates = activeDefs.filter(def => def.required && def.expiry && !(docs[def.key] && docs[def.key].expireDate)).map(def => def.groupTitle + ' - ' + def.title + ' 날짜');
      activeDefs.filter(def => def.optionalExpiry).forEach(def => {
        const doc = docs[def.key];
        if (doc && doc.fileName && !doc.expireDate) {
          missingDates.push(def.groupTitle + ' - ' + def.title + ' 날짜');
        }
      });
      const workerValidation = validateWorkerPeople(docs);
      missingFiles.push(...workerValidation.missingFiles);
      const missingAuth = Object.values(docs).filter(doc => doc.groupKey !== 'equipment' && doc.fileName && !doc.authVerified).map(doc => (doc.groupTitle || '개인정보서류') + ' - ' + doc.title);
      if (missingAuth.length) {
        alert('인증 미완료 서류가 있습니다.\n\n' + missingAuth.join('\n'));
        return;
      }

      if (missingFiles.length || missingDates.length) {
        alert('필수 항목을 확인해주세요.\n\n미첨부 서류:\n' + (missingFiles.join('\n') || '없음') + '\n\n미입력 날짜:\n' + (missingDates.join('\n') || '없음'));
        return;
      }

      const bundleMeta = getBundleMeta();
      const selectedPlan = getPlanInfo(localStorage.getItem(SELECTED_PAYMENT_PLAN_KEY) || 'monthly');
      const items = getItems();
      const currentMember = getCurrentMemberTest();
      const editIndex = editingCode ? items.findIndex(x => x.code === editingCode) : -1;
      const oldItem = editIndex >= 0 ? items[editIndex] : null;
      const code = oldItem ? oldItem.code : makeBundleCode(equipmentNo);
      const qrLink = oldItem ? (oldItem.qrLink || makeQrLink(code)) : makeQrLink(code);
      const nowIso = new Date().toISOString();
      const item = {
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
        trialEndsAt: oldItem?.trialEndsAt || addDaysIso(nowIso, TRIAL_DAYS),
        serviceStatus: oldItem?.serviceStatus || '실사용베타',
        paymentPlan: oldItem?.paymentPlan || selectedPlan.key,
        basicPlan: oldItem?.basicPlan || ('선택 예정 · ' + selectedPlan.planText),
        alertPlan: oldItem?.alertPlan || '보험·검사 만료 알림 포함 준비',
        forwardPolicy: oldItem?.forwardPolicy || '담당자용 QR·링크 7일 접속 가능',
        managerExpireAt: oldItem?.managerExpireAt || addDaysIso(nowIso, 7)
      };
      item.updateHistory = Array.isArray(oldItem?.updateHistory) ? oldItem.updateHistory.slice() : [];
      if (oldItem) {
        item.updateHistory.unshift({ at:nowIso, summary:buildUpdateSummary(oldItem, item).slice(0, 12) });
      }

      if (oldItem) items[editIndex] = item;
      else items.unshift(item);

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

      const message = oldItem ? '수정내용이 저장되었습니다.' : '통합 서류함이 저장되었습니다.';
      alert(message + '\n\n포함: ' + bundleMeta.includedGroupNames.join(', ') + '\n담당자에게는 장비/기사/인부 보관함의 공유하기로 7일 만료 QR·링크를 보내면 됩니다.' + (savedLight ? '\n\n용량을 줄이기 위해 원본/보정본 비교데이터는 제외하고 담당자용 사진 미리보기만 저장했습니다.' : ''));
      editingCode = '';
      resetForm(false);
      renderDetail(code);
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

    function getItems() {
      try {
        const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (Array.isArray(current) && current.length) return current;
        const previousV2376 = JSON.parse(localStorage.getItem(PREV_STORAGE_KEY_7 || '') || '[]');
        if (Array.isArray(previousV2376) && previousV2376.length) return previousV2376;
        const previousV2375 = JSON.parse(localStorage.getItem(PREV_STORAGE_KEY_6 || '') || '[]');
        if (Array.isArray(previousV2375) && previousV2375.length) return previousV2375;
        const previousV2374 = JSON.parse(localStorage.getItem(PREV_STORAGE_KEY_5 || '') || '[]');
        if (Array.isArray(previousV2374) && previousV2374.length) return previousV2374;
        const previousV2373 = JSON.parse(localStorage.getItem(PREV_STORAGE_KEY_4 || '') || '[]');
        if (Array.isArray(previousV2373) && previousV2373.length) return previousV2373;
        const previousV2372 = JSON.parse(localStorage.getItem(PREV_STORAGE_KEY_3 || '') || '[]');
        if (Array.isArray(previousV2372) && previousV2372.length) return previousV2372;
        const previousV237 = JSON.parse(localStorage.getItem(PREV_STORAGE_KEY_2 || '') || '[]');
        if (Array.isArray(previousV237) && previousV237.length) return previousV237;
        const previous = JSON.parse(localStorage.getItem(PREV_STORAGE_KEY || '') || '[]');
        if (Array.isArray(previous) && previous.length) return previous;
        return [];
      }
      catch (error) { return []; }
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
        doc.originalDataUrl = '';
        doc.correctedDataUrl = '';
        if (Array.isArray(doc.pages)) {
          doc.pages.forEach(page => {
            page.previewDataUrl = page.previewDataUrl || '';
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
      const baseUrl = window.location.href.split('#')[0];
      return baseUrl + '#qr=' + encodeURIComponent(code);
    }

    function makeQrUrl(link, size = 180) {
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
      if (!item) return '';
      return (item.equipmentName || '장비명 없음') + ' / ' + (item.equipmentNo || '번호 없음');
    }

    function getItemTitle(item) {
      return getShareItemLabel(item);
    }

    function getShareTitleForItems(items) {
      const safe = (items || []).filter(Boolean);
      if (safe.length === 1) return getShareItemLabel(safe[0]) + ' 서류';
      if (!safe.length) return 'SitePass 담당자 서류';
      return 'SitePass 장비서류 ' + safe.length + '건';
    }

    function getShareSubtitle(item) {
      return '현장 반입서류 확인 · 다운로드/프린트 전용';
    }

    function getIncludedGroupText(item) {
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
      adminListQuickFilter = filterKey || 'all';
      showScreen('listScreen');
    }

    function clearAdminListQuickFilter() {
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
      const isAdminMode = isAdminLoggedIn();
      const allItems = getItems();
      const box = document.getElementById('equipmentList');
      const title = document.getElementById('listScreenTitle');
      const bottomActions = document.getElementById('listScreenBottomActions');
      if (title) title.textContent = isAdminMode ? '관리자 장비서류 알림 / 보관함' : '장비/기사/인부 보관함';
      if (bottomActions) {
        bottomActions.innerHTML = isAdminMode
          ? '<button class="secondary" onclick="showScreen(\'adminScreen\')">관리자 홈</button>'
          : '<button class="secondary" onclick="showScreen(\'homeScreen\')">처음 화면</button><button class="dangerBtn" onclick="clearAll()">전체 삭제</button>';
      }
      if (allItems.length === 0) {
        box.innerHTML = '<div class="empty">' + (isAdminMode ? '아직 등록된 장비서류가 없습니다.<br>회원이 직접 등록한 장비서류가 생기면 여기서 확인할 수 있습니다.' : '아직 저장된 통합 서류함이 없습니다.<br>통합 서류함 등록에서 먼저 저장해보세요.') + '</div>';
        return;
      }
      const items = allItems.filter(item => itemMatchesAdminListQuickFilter(item, adminListQuickFilter));
      const filterNotice = adminListQuickFilter !== 'all'
        ? '<div class="notice blue-note admin-filter-note"><div><b>현재 빠른보기:</b> ' + escapeHtml(getAdminListQuickFilterLabel(adminListQuickFilter)) + '</div><button type="button" class="ghost inline-mini-button" onclick="clearAdminListQuickFilter()">전체 보기</button></div>'
        : '';
      const adminModeNotice = isAdminMode
        ? '<div class="notice blue-note"><b>관리자 모드 창</b><br>여기서는 장비업자에게 알림만 보내고, 장비별로는 상세보기 / 큐알링크 / 삭제만 할 수 있습니다. 큐알링크는 해당 장비 담당자 화면 QR을 바로 보여줍니다.</div>'
        : '';
      const toolbar = isAdminMode
        ? '<div class="list-select-toolbar">' +
            adminModeNotice +
            filterNotice +
            '<div class="small"><b>선택해서 장비업자에게 알림 보내기</b><br>선택한 장비의 소유회원 휴대폰번호로 만료·갱신 알림 문자를 바로 보냅니다.</div>' +
            '<div class="actions">' +
              '<button class="ghost" onclick="selectAllListItems(true)">전체선택</button>' +
              '<button class="secondary" onclick="selectAllListItems(false)">선택해제</button>' +
              '<button class="okBtn" onclick="shareSelectedAdminOwnerAlertSms()">선택 장비업자에게 알림 보내기</button>' +
            '</div>' +
          '</div>'
        : '<div class="list-select-toolbar">' +
            filterNotice +
            '<div class="small"><b>선택해서 바로 보내기</b><br>필요한 장비를 체크한 뒤 카카오톡·문자·이메일 중 하나로 담당자에게 7일 만료 QR·링크를 바로 보냅니다.</div>' +
            '<div class="actions">' +
              '<button class="ghost" onclick="selectAllListItems(true)">전체선택</button>' +
              '<button class="secondary" onclick="selectAllListItems(false)">선택해제</button>' +
              '<button class="okBtn" onclick="shareSelectedListItemsKakao()">선택 카카오톡으로 보내기</button>' +
              '<button class="ghost" onclick="shareSelectedListItemsSms()">선택 문자로 보내기</button>' +
              '<button class="ghost" onclick="shareSelectedListItemsEmail()">선택 이메일로 보내기</button>' +
            '</div>' +
          '</div>';
      if (!items.length) {
        box.innerHTML = toolbar + '<div class="empty">현재 조건에 맞는 장비서류가 없습니다.</div>';
        return;
      }
      box.innerHTML = toolbar + items.map(item => {
        const ownerInfo = isAdminMode
          ? '<div class="small">장비업자: ' + escapeHtml(item.ownerName || item.ownerSignupId || '미지정') + (item.ownerPhone ? ' / ' + escapeHtml(item.ownerPhone) : ' / 휴대폰 미등록') + '</div>'
          : '';
        const actionButtons = isAdminMode
          ? '<div class="actions"><button class="ghost" onclick="renderDetail(\'' + escapeJs(item.code) + '\')">상세보기</button><button class="primary" onclick="openAdminQrLink(\'' + escapeJs(item.code) + '\')">큐알링크</button><button class="dangerBtn" onclick="deleteItem(\'' + escapeJs(item.code) + '\')">삭제</button></div>'
          : '<div class="actions"><button class="ghost" onclick="renderDetail(\'' + escapeJs(item.code) + '\')">상세보기</button><button class="ghost" onclick="openManagerPublicView(\'' + escapeJs(item.code) + '\')">담당자화면</button><button class="primary" onclick="startEditEquipment(\'' + escapeJs(item.code) + '\')">수정/갱신</button><button class="dangerBtn" onclick="deleteItem(\'' + escapeJs(item.code) + '\')">삭제</button></div>';
        return '<div class="list-item">' +
          '<div class="list-item-head"><strong>' + escapeHtml(getItemTitle(item)) + '</strong><label class="list-select-label"><input type="checkbox" data-list-share-check value="' + escapeHtml(item.code) + '" /> 선택</label></div>' +
          ownerInfo +
          '<div class="small">포함서류: ' + escapeHtml(getIncludedGroupText(item)) + '</div>' +
          '<div class="small">결제단위: ' + escapeHtml(item?.bundleMeta?.paymentText || '통합 서류함 1건') + '</div>' +
          '<div class="small">서비스상태: ' + escapeHtml(getServiceStatusText(item)) + '</div>' +
          '<div class="small">담당자 QR·링크 만료: ' + escapeHtml(getManagerExpireText(getManagerExpireAt(item))) + '</div>' +
          '<div class="small">' + escapeHtml(makeAlertSummary(item.docs)) + '</div>' +
          (isAdminMode ? '' : renderListRenewButton(item)) +
          actionButtons +
        '</div>';
      }).join('');
    }

    function selectAllListItems(checked) {
      document.querySelectorAll('[data-list-share-check]').forEach(input => {
        input.checked = !!checked;
      });
    }

    function getSelectedListCodes() {
      return Array.from(document.querySelectorAll('[data-list-share-check]:checked')).map(input => input.value).filter(Boolean);
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
      return (codes || []).map(code => getItemByCode(code)).filter(Boolean);
    }

    function getSelectedListItemsForShare() {
      const codes = getSelectedListCodes();
      if (!codes.length) { alert('공유할 장비를 먼저 선택해주세요.'); return []; }
      const items = getItemsFromCodes(codes);
      if (!items.length) { alert('공유할 서류함을 찾을 수 없습니다.'); return []; }
      return items;
    }

    function shareOneListItem(code) {
      shareOneListItemKakao(code);
    }

    function shareSelectedListItems() {
      shareSelectedListItemsKakao();
    }

    function shareOneListItemKakao(code) {
      const item = getItemByCode(code);
      if (!item) { alert('공유할 서류함을 찾을 수 없습니다.'); return; }
      shareManagerItemsByChannel([item], 'kakao');
    }

    function shareOneListItemSms(code) {
      const item = getItemByCode(code);
      if (!item) { alert('공유할 서류함을 찾을 수 없습니다.'); return; }
      shareManagerItemsByChannel([item], 'sms');
    }

    function shareOneListItemEmail(code) {
      const item = getItemByCode(code);
      if (!item) { alert('공유할 서류함을 찾을 수 없습니다.'); return; }
      shareManagerItemsByChannel([item], 'email');
    }

    function shareSelectedListItemsKakao() {
      const items = getSelectedListItemsForShare();
      if (items.length) shareManagerItemsByChannel(items, 'kakao');
    }

    function shareSelectedListItemsSms() {
      const items = getSelectedListItemsForShare();
      if (items.length) shareManagerItemsByChannel(items, 'sms');
    }

    function shareSelectedListItemsEmail() {
      const items = getSelectedListItemsForShare();
      if (items.length) shareManagerItemsByChannel(items, 'email');
    }

    function buildManagerShareText(items) {
      const safeItems = (items || []).filter(Boolean);
      const heading = '[SitePass] ' + getShareTitleForItems(safeItems);
      const list = safeItems.map((item, index) => {
        const expireAt = getManagerExpireAt(item);
        return (safeItems.length > 1 ? (index + 1) + '. ' : '') + getShareItemLabel(item) + ' 서류\n' +
          '포함서류: ' + getIncludedGroupText(item) + '\n' +
          '담당자 화면: ' + makeManagerLink(item.code, expireAt) + '\n' +
          '유효기간: ' + getManagerExpireText(expireAt);
      }).join('\n\n');
      return heading + '\n' +
        'QR·링크를 누르면 코드 입력 없이 바로 담당자 다운로드/프린트 화면이 열립니다.\n' +
        '담당자가 한눈에 알아볼 수 있도록 장비명/장비번호를 먼저 표시했습니다.\n' +
        '7일 뒤에는 담당자 QR·링크 접속이 차단됩니다.\n\n' + list;
    }

    function renderManagerSharePreviewPanel(item) {
      if (!item) return '';
      const title = getShareItemLabel(item) + ' 서류';
      const expireAt = getManagerExpireAt(item);
      const link = makeManagerLink(item.code || '', expireAt);
      const previewText = '[SitePass] ' + title + '\n' +
        '현장 반입서류 확인 링크입니다.\n' +
        '장비명/번호: ' + getShareItemLabel(item) + '\n' +
        '포함서류: ' + getIncludedGroupText(item) + '\n' +
        '담당자 화면: ' + link + '\n' +
        '유효기간: ' + getManagerExpireText(expireAt);
      return '<div class="share-message-box">' +
        '<b>담당자에게 보내질 표시</b>' +
        '<div class="share-main-title">' + escapeHtml(title) + '</div>' +
        '<div class="small">카톡/문자/이메일과 QR을 받는 담당자는 첫 줄에서 바로 <b>' + escapeHtml(getShareItemLabel(item)) + '</b> 서류라는 것을 알 수 있습니다.</div>' +
        '<div class="share-copy-preview">' + escapeHtml(previewText) + '</div>' +
        '<div class="actions">' +
          '<button type="button" class="okBtn" onclick="shareOneListItemKakao(\'' + escapeJs(item.code || '') + '\')">카톡으로 보내기</button>' +
          '<button type="button" class="ghost" onclick="shareOneListItemSms(\'' + escapeJs(item.code || '') + '\')">문자로 보내기</button>' +
          '<button type="button" class="primary" onclick="openManagerPublicView(\'' + escapeJs(item.code || '') + '\')">담당자 화면 보기</button>' +
          '<button type="button" class="secondary" onclick="copyManagerCode(\'' + escapeJs(item.code || '') + '\')">링크 복사</button>' +
        '</div>' +
      '</div>';
    }

    function shareManagerItems(items) {
      shareManagerItemsByChannel(items, 'kakao');
    }

    function shareManagerItemsByChannel(items, channel) {
      const requestedItems = (items || []).filter(Boolean);
      if (!canUseQrShareItems(requestedItems, '담당자 QR·링크 보내기')) return;
      const safeItems = refreshManagerExpiryForCodes(requestedItems.map(item => item.code));
      if (!safeItems.length) return;
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
        return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 ' + pages.length + '장 이미지</span></div>' + renderPagesListHtml(pages, { imageOnly:true, readonly:true, docKey:doc.key, code:'' }) + extraStrip + '</div>';
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
        box.innerHTML = '<div class="manager-expire-box"><b>올바르지 않은 담당자 QR·링크입니다.</b><br>만료시간이 변경되었거나 이미 폐기된 링크입니다.<br>장비업자에게 새 공유 QR·링크를 다시 받아주세요.</div>';
        showScreen('managerPrintScreen');
        return;
      }
      if (isManagerExpired(item, expireAt)) {
        box.innerHTML = '<div class="manager-expire-box"><b>만료된 담당자 QR·링크입니다.</b><br>이 담당자 접속은 7일이 지나 더 이상 열 수 없습니다.<br>장비업자에게 새 공유 QR·링크를 다시 받아주세요.<br><span class="small">장비업자의 원본 서류함과 수정/갱신 화면은 그대로 유지됩니다.</span></div>';
        showScreen('managerPrintScreen');
        return;
      }
      currentDetailLink = makeManagerLink(item.code, expireAt || getManagerExpireAt(item));
      const docs = getDisplayDocs(item);
      const docHtml = docs.map((doc, index) => renderManagerDocLine(doc, item.code, index)).join('');
      const remainingDays = Math.ceil(((expireAt || getManagerExpireAt(item)) - Date.now()) / (1000 * 60 * 60 * 24));
      box.innerHTML =
        '<div class="manager-received-hero"><div class="eyebrow">QR·링크로 받은 담당자 화면</div><h3>' + escapeHtml(getShareItemLabel(item)) + ' 서류</h3><p>이 화면은 하도급/원청 담당자가 카톡·문자 링크나 QR을 눌렀을 때 바로 보는 다운로드/프린트 전용 화면입니다.</p><div class="manager-status-grid"><div>코드입력 없음</div><div>7일 유효</div><div>수정/갱신 불가</div></div></div>' +
        '<div class="line"><b>장비 등록번호</b><span>' + escapeHtml(item.equipmentNo) + '</span></div>' +
        '<div class="line"><b>장비명</b><span>' + escapeHtml(item.equipmentName) + '</span></div>' +
        '<div class="line"><b>포함서류</b><span>' + escapeHtml(getIncludedGroupText(item)) + '</span></div>' +
        renderD7DeadlineNotice(item) +
        '<div class="manager-expire-box">담당자 접속 만료일: ' + escapeHtml(getManagerExpireText(expireAt || getManagerExpireAt(item))) + '<br>남은 기간: 약 ' + remainingDays + '일<br><span class="small">7일 후 담당자 QR·링크 접속만 차단됩니다.</span></div>' +
        renderManagerDownloadToolbar(item) +
        '<h3 style="margin-top:14px">다운로드/프린트 서류</h3>' + renderPrintSelectRow(item.code) + (docHtml || '<div class="empty">표시할 서류가 없습니다.</div>') +
        '<div class="sponsor-box"><div class="small">운영·개발: 제이에스건설</div><a href="https://www.songwongeo.co.kr" target="_blank" rel="noopener">송원건설 홈페이지 바로가기</a></div>';
      showScreen('managerPrintScreen');
    }

    function renderManagerDownloadToolbar(item) {
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
      const statusText = escapeHtml(doc.status || getDocStatus(doc)) + pageText + (doc.expireDate ? ' / ' + escapeHtml(doc.expireDate) : '');
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
      const printablePages = expandPrintablePages(docs || []);
      const blockedPages = expandBlockedPages(docs || []);
      if (!printablePages.length) {
        alert('첨부파일은 확인되지만 현재 베타 저장본에 다운로드할 사진 데이터가 없습니다.\n새 v23.7.36에서 사진을 다시 첨부해 저장하면 담당자 화면에서 바로 다운로드/프린트가 됩니다.\nPDF 원본 다운로드는 서버 저장 단계에서 연결합니다.');
        return;
      }
      const html = buildDownloadHtml(item, printablePages, blockedPages);
      const blob = new Blob([html], { type:'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sanitizeFileName(getShortcutName(item) + '_' + (label || '서류')) + '.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    }

    function buildDownloadHtml(item, pages, blockedPages) {
      const printHtml = buildPrintHtml(item, pages, blockedPages);
      const expireAt = getManagerExpireAt(item);
      const expireScript = '<script>(function(){var expireAt=' + JSON.stringify(expireAt) + ';if(Date.now()>expireAt){document.body.innerHTML="<div style=\\"font-family:Arial,sans-serif;margin:30px;padding:20px;border:1px solid #ffd591;border-radius:14px;background:#fff7e6;color:#694000\\"><b>만료된 담당자 서류파일입니다.</b><br>발급 후 7일이 지나 열람할 수 없습니다. 새 QR·링크를 다시 받아주세요.</div>";return;}var bar=document.createElement("div");bar.style.cssText="position:sticky;top:0;background:#f3f6fb;border-bottom:1px solid #d7dfed;padding:10px;text-align:center;z-index:10";bar.innerHTML="<button onclick=\\"window.print()\\" style=\\"min-height:42px;padding:10px 18px;border:0;border-radius:12px;background:#2457d6;color:white;font-weight:900\\">프린트</button> <span style=\\"font-size:13px;color:#667085;margin-left:8px\\">담당자 서류 다운로드본 · 7일 유효</span>";document.body.insertBefore(bar,document.body.firstChild);})();</scr' + 'ipt>';
      return printHtml
        .replace('<body onload="setTimeout(function(){window.focus();window.print();},450)">','<body>')
        .replace('</body></html>', expireScript + '</body></html>');
    }

    function renderPublicDocLine(doc, code, index) {
      const title = (doc.groupTitle ? doc.groupTitle + ' - ' : '') + doc.title;
      const pages = getDocPagesFromDoc(doc);
      const pageText = pages.length ? ' · ' + pages.length + '장' : '';
      const statusText = escapeHtml(doc.status || getDocStatus(doc)) + pageText + (doc.expireDate ? ' / ' + escapeHtml(doc.expireDate) : '');
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
      return '<div class="preview-wrap show"><div class="preview-title"><span>첨부 ' + pages.length + '장 이미지</span></div>' + renderPagesListHtml(pages, { imageOnly:true, readonly:true, docKey:doc.key, code:code }) + extraStrip + '</div>';
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
        '<div class="sponsor-box"><div class="small">운영·개발: 제이에스건설</div><a href="https://www.songwongeo.co.kr" target="_blank" rel="noopener">송원건설 홈페이지 바로가기</a></div>';
      showScreen('publicScreen');
    }


    function renderPrintToolbar(item, showSelection) {
      if (!item) return '';
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
      const printablePages = expandPrintablePages(docs || []);
      const blockedPages = expandBlockedPages(docs || []);
      if (!printablePages.length) {
        const blockedText = blockedPages.map(page => '- ' + page.docTitle + ' / ' + page.fileName).join('\n');
        alert('첨부파일은 확인되지만 현재 베타 저장본에 바로 인쇄할 사진 데이터가 없습니다.\n\n새 v23.7.36에서 사진을 다시 첨부해 저장하면 담당자 화면에서 바로 프린트됩니다. PDF 원본 인쇄는 서버 저장 단계에서 연결합니다.' + (blockedText ? '\n\n확인된 첨부파일:\n' + blockedText : ''));
        return;
      }
      const win = window.open('', '_blank');
      if (!win) { alert('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 눌러주세요.'); return; }
      const html = buildPrintHtml(item, printablePages, blockedPages);
      win.document.open();
      win.document.write(html);
      win.document.close();
    }

    function expandPrintablePages(docs) {
      const out = [];
      (docs || []).forEach(doc => {
        const pages = getDocPagesFromDoc(doc);
        const docTitle = (doc.groupTitle ? doc.groupTitle + ' - ' : '') + doc.title;
        if (pages.length) {
          pages.forEach((page, index) => {
            const pagePreview = getPrintablePreviewFromPage(page);
            if (pagePreview) {
              out.push({
                doc,
                docTitle,
                pageNo:index + 1,
                totalPages:pages.length,
                fileName:page.fileName || '',
                previewDataUrl:pagePreview,
                expireDate:doc.expireDate || '',
                driverPhone:doc.driverPhone || '',
                workerPhone:doc.workerPhone || '',
                personPhone:doc.personPhone || '',
                workerTask:doc.workerTask || ''
              });
            }
          });
        } else {
          const docPreview = doc.previewDataUrl || doc.correctedDataUrl || doc.originalDataUrl || '';
          if (docPreview) out.push({ doc, docTitle, pageNo:1, totalPages:1, fileName:doc.fileName || '', previewDataUrl:docPreview, expireDate:doc.expireDate || '', driverPhone:doc.driverPhone || '', workerPhone:doc.workerPhone || '', personPhone:doc.personPhone || '', workerTask:doc.workerTask || '' });
        }
      });
      return out;
    }

    function expandBlockedPages(docs) {
      const out = [];
      (docs || []).forEach(doc => {
        const pages = getDocPagesFromDoc(doc);
        const docTitle = (doc.groupTitle ? doc.groupTitle + ' - ' : '') + doc.title;
        if (pages.length) {
          pages.forEach((page, index) => {
            if (!getPrintablePreviewFromPage(page)) out.push({ doc, docTitle:docTitle + ' ' + (index + 1) + '페이지', fileName:page.fileName || '' });
          });
        } else if (doc.fileName && !(doc.previewDataUrl || doc.correctedDataUrl || doc.originalDataUrl)) {
          out.push({ doc, docTitle, fileName:doc.fileName || '' });
        }
      });
      return out;
    }

    function buildPrintHtml(item, pages, blockedPages) {
      const title = '\u200B'; // 브라우저 인쇄 머리글 제목을 빈값처럼 보이게 처리
      const attachedPrintCount = pages.length;
      const totalPrintPages = attachedPrintCount + 1; // 표지 1장 + 실제 첨부서류 장수
      const blockedHtml = (blockedPages && blockedPages.length) ? '<section class="blocked"><h2>인쇄 제외된 첨부</h2><p>아래 파일은 현재 베타 저장본에 이미지 미리보기가 없어 서버 저장 단계에서 원본 인쇄를 연결합니다.</p>' + blockedPages.map(page => '<div>· ' + escapeHtml(page.docTitle || '') + ' / ' + escapeHtml(page.fileName || '') + '</div>').join('') + '</section>' : '';
      const docsHtml = pages.map((page, index) => {
        const dateText = page.expireDate ? '만료일: ' + page.expireDate + ' / ' + getDdayText(page.expireDate) : '';
        const extra = renderPlainExtra(page);
        const hasExtra = !!extra;
        const pageTitle = page.docTitle + ((page.pageNo && page.pageNo > 1 && page.totalPages > 1) ? ' - ' + page.pageNo + '페이지' : '');
        return '<section class="print-page' + (hasExtra ? ' has-extra' : '') + '">' +
          '<div class="doc-meta"><strong>' + (index + 1) + '. ' + escapeHtml(pageTitle) + '</strong><span>' + escapeHtml(dateText) + '</span></div>' +
          (extra ? '<div class="extra">' + extra + '</div>' : '') +
          '<img src="' + page.previewDataUrl + '" alt="' + escapeHtml(pageTitle) + '">' +
        '</section>';
      }).join('');
      return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + title + '</title><style>' +
        'body{margin:0;padding:18px;font-family:Arial,"Noto Sans KR",sans-serif;color:#111;background:#fff}' +
        '.cover{border:1px solid #ddd;border-radius:12px;padding:14px;margin-bottom:16px}' +
        '.cover h1{font-size:22px;margin:0 0 8px}.cover div{font-size:13px;line-height:1.6}' +
        '.print-page{break-after:page;page-break-after:always;break-inside:avoid;margin:0;padding:0;text-align:center;overflow:hidden}' +
        '.doc-meta{display:flex;justify-content:space-between;gap:10px;align-items:flex-end;border-bottom:1px solid #ddd;padding:0 0 5px;margin:0 0 6px;text-align:left}' +
        '.doc-meta strong{font-size:15px}.doc-meta span{font-size:11px;color:#555;text-align:right}.extra{font-size:12px;line-height:1.25;text-align:left;margin:0 0 4px;padding:5px 8px;border:1px solid #ddd;border-radius:8px}' +
        'img{display:block;margin:0 auto;max-width:100%;max-height:84vh;object-fit:contain}.print-page.has-extra img{max-height:78vh}.blocked{border:1px solid #f0c36d;background:#fff8e5;border-radius:10px;padding:12px;margin:12px 0;break-inside:avoid}.blocked h2{font-size:16px;margin:0 0 6px}.blocked p{font-size:13px;margin:0 0 8px;color:#555}' +
        '@page{size:auto;margin:10mm}@media print{body{padding:0}.cover{break-after:page;page-break-after:always}.print-page:last-child{break-after:auto;page-break-after:auto}}' +
        '</style></head><body onload="setTimeout(function(){window.focus();window.print();},450)">' +
        '<section class="cover"><h1>SitePass 서류 인쇄</h1>' +
        '<div><b>장비</b>: ' + escapeHtml(getItemTitle(item)) + '</div>' +
        '<div><b>포함서류</b>: ' + escapeHtml(getIncludedGroupText(item)) + '</div>' +
        '<div><b>인쇄일시</b>: ' + escapeHtml(new Date().toLocaleString('ko-KR')) + '</div>' +
        '<div><b>첨부서류</b>: ' + attachedPrintCount + '장</div>' +
        '<div><b>인쇄페이지</b>: ' + totalPrintPages + '장</div></section>' +
        docsHtml + blockedHtml + '</body></html>';
    }

    function renderPlainExtra(doc) {
      const parts = [];
      const phone = doc.driverPhone || doc.workerPhone || doc.personPhone || '';
      if (phone) parts.push('전화번호: ' + escapeHtml(phone));
      if (doc.workerTask) parts.push('작업내용: ' + escapeHtml(doc.workerTask));
      return parts.join('<br>');
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
      const baseUrl = window.location.href.split('#')[0];
      const exp = expireAt || getSevenDaysFromNowMs();
      const sig = getManagerLinkSignature(code, exp);
      return baseUrl + '#manager=' + encodeURIComponent(code || '') + '&exp=' + encodeURIComponent(String(exp)) + '&sig=' + encodeURIComponent(sig);
    }

    function parseManagerHash(hash) {
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

    function getSelectedPaymentPlan() {
      const checked = document.querySelector('input[name="paymentPlan"]:checked');
      return checked?.value || localStorage.getItem(SELECTED_PAYMENT_PLAN_KEY) || 'monthly';
    }

    function getPlanInfo(plan) {
      if (plan === 'annual') {
        return { key:'annual', label:'연 결제', price:'연 19,900원', days:365, serviceStatus:'유료사용', planText:'연 결제 · 연 19,900원' };
      }
      return { key:'monthly', label:'월 결제', price:'월 2,000원', days:30, serviceStatus:'유료사용', planText:'월 결제 · 월 2,000원' };
    }

    function updateSelectedPaymentPlan() {
      const plan = getSelectedPaymentPlan();
      localStorage.setItem(SELECTED_PAYMENT_PLAN_KEY, plan);
      const info = getPlanInfo(plan);
      const note = document.getElementById('selectedPlanNote');
      if (note) {
        note.innerHTML = '<b>선택한 요금제:</b> ' + escapeHtml(info.label) + ' / ' + escapeHtml(info.price) + '<br>정식 서비스에서는 실제 카드결제·계좌이체·자동갱신 여부를 결제대행사와 연결합니다.';
      }
      renderPricingTargetList();
    }


    function makeAutoPaymentHash(code, plan) {
      const cleanPlan = plan === 'annual' ? 'annual' : 'monthly';
      return '#pay=' + encodeURIComponent(code || '') + '&plan=' + encodeURIComponent(cleanPlan) + '&result=success';
    }

    function makeAutoPaymentTestLink(code, plan) {
      const base = String(window.location.href || './index.html').split('#')[0] || './index.html';
      return base + makeAutoPaymentHash(code, plan);
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

    function completeAutoPaymentForItem(code, plan, sourceLabel) {
      const items = getItems();
      const idx = items.findIndex(item => String(item.code || '') === String(code || ''));
      if (idx < 0) return { ok:false, message:'결제할 서류함을 찾을 수 없습니다.', code:code || '' };
      const info = getPlanInfo(plan || 'monthly');
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
      const result = completeAutoPaymentForItem(code, plan, '자동결제 링크 확인');
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
    }

    function startRegistrationWithSelectedPlan() {
      updateSelectedPaymentPlan();
      startNewRegistration();
    }

    function isPaymentDueSoon(item) {
      if (!item || !item.trialEndsAt) return false;
      const end = new Date(item.trialEndsAt).getTime();
      if (Number.isNaN(end)) return false;
      const diff = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
      return diff <= 7;
    }

    function getPaymentDueText(item) {
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
      return '<div class="renew-panel"><b>결제/연장</b><span>월 결제 또는 연 결제를 선택하면 현재 종료일 기준으로 기간이 연장됩니다. 자동로그인 상태여도 결제는 확인번호를 한 번 더 입력합니다.</span>' + showChip + '<div class="renew-actions"><button class="ghost" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'monthly\')">월 2,000원 연장</button><button class="primary" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'annual\')">연 19,900원 연장</button></div></div>';
    }

    function renderListRenewButton(item) {
      if (!item || !isPaymentDueSoon(item)) return '';
      return '<div class="renew-panel"><b>결제/연장 알림</b><span>' + escapeHtml(getPaymentDueText(item)) + ' · 만료 전에 연장하면 QR 정지를 막을 수 있습니다.</span><div class="renew-actions"><button class="ghost" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'monthly\')">월 연장</button><button class="primary" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'annual\')">연 연장</button></div></div>';
    }

    function renderPricingTargetList() {
      const box = document.getElementById('pricingTargetList');
      if (!box) return;
      const items = getItems();
      const plan = getSelectedPaymentPlan();
      const info = getPlanInfo(plan);
      if (!items.length) {
        box.innerHTML = '<div class="empty">아직 등록된 서류함이 없습니다.<br>선택한 요금제로 먼저 통합 서류함을 등록해보세요.</div>';
        return;
      }
      box.innerHTML = items.map(item => {
        const monthlyLink = makeAutoPaymentTestLink(item.code, 'monthly');
        const annualLink = makeAutoPaymentTestLink(item.code, 'annual');
        return '<div class="list-item"><strong>' + escapeHtml(getItemTitle(item)) + '</strong>' +
          '<div class="small">현재 상태: ' + escapeHtml(getServiceStatusText(item)) + '</div>' +
          '<div class="small">선택 요금제: ' + escapeHtml(info.label + ' / ' + info.price) + '</div>' +
          '<div class="renew-panel"><b>자동결제 링크 확인</b><span>관리자 수동처리 없이 결제 성공 링크가 돌아왔을 때 QR·담당자 링크가 바로 열리는지 확인합니다.</span>' +
            '<div class="renew-actions">' +
              '<a class="auto-pay-link monthly" href="' + escapeHtml(monthlyLink) + '">1개월결제 링크 확인</a>' +
              '<a class="auto-pay-link annual" href="' + escapeHtml(annualLink) + '">1년결제 링크 확인</a>' +
            '</div>' +
          '</div>' +
          '<div class="actions"><button class="primary" onclick="renewItemService(\'' + escapeJs(item.code) + '\', \'' + escapeJs(plan) + '\')">선택한 요금제로 수동연장</button><button class="ghost" onclick="renderDetail(\'' + escapeJs(item.code) + '\')">상세보기</button></div></div>';
      }).join('');
    }

    function requirePasswordReconfirm(actionLabel) {
      const label = actionLabel || '중요 작업';
      const input = prompt(label + '은 자동로그인 상태여도 확인번호 입력이 필요합니다.\n\n현재 임시 확인번호 1234를 입력해주세요.');
      if (input === null) return false;
      if (String(input).trim() !== '1234') {
        alert('확인번호가 맞지 않습니다. 현재 임시 확인번호는 1234입니다.');
        return false;
      }
      return true;
    }

    function renewItemService(code, plan) {
      if (!requirePasswordReconfirm('결제/연장')) return;
      const items = getItems();
      const idx = items.findIndex(x => x.code === code);
      if (idx < 0) { alert('연장할 서류함을 찾을 수 없습니다.'); return; }
      const info = getPlanInfo(plan || getSelectedPaymentPlan());
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
      const d = new Date(baseIso);
      d.setDate(d.getDate() + days);
      return d.toISOString();
    }

    function isQrPaused(item) {
      if (!item) return false;
      if (item.serviceStatus === '정지') return true;
      if (!item.trialEndsAt) return false;
      return new Date(item.trialEndsAt).getTime() < Date.now();
    }


    function isServiceShareBlocked(item) {
      return isQrPaused(item);
    }

    function getServiceBlockReason(item) {
      if (!item) return '서류함 없음';
      if (item.serviceStatus === '정지') return '관리자 정지';
      if (!item.trialEndsAt) return '결제기간 미설정';
      const overdueDays = getServiceOverdueDays(item);
      if (overdueDays !== null && overdueDays >= 14) return '유예 14일 이상 경과';
      return '실사용 베타기간/결제기간 만료';
    }

    function getShareBlockedItems(items) {
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
      if (role === '운영관리자') return 'need';
      if (role === '조회관리자') return '';
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

    function getMemberKakaoText(member) {
      const provider = String(member?.provider || '');
      const method = String(member?.signupMethod || '');
      const providerId = String(member?.providerId || '');
      if (provider.includes('카카오') || method.includes('카카오') || providerId.includes('카카오')) return providerId || '카카오 연동';
      return '미연동';
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

    function getAdminAllMemberRows() {
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
      return [superRow].concat(ensureMemberIds());
    }

    function getAdminMemberCounts(activeMembers, withdrawnMembers) {
      const counts = {
        all: activeMembers.length,
        normal: activeMembers.filter(m => !m.adminRole && !m.suspended).length,
        newSignup: countTodaySignups(activeMembers),
        free: activeMembers.filter(m => String(getMemberPlanInfo(m).label).includes('무료')).length,
        monthly: activeMembers.filter(m => String(getMemberPlanInfo(m).label).includes('1개월') || String(getMemberPlanInfo(m).label).includes('monthly')).length,
        due: activeMembers.filter(isMemberPaymentDueSoon).length,
        grace14: activeMembers.filter(isMemberGrace14Over).length,
        super: activeMembers.filter(m => m.adminRole === SUPER_ADMIN_ROLE_NAME).length,
        operator: activeMembers.filter(m => m.adminRole === '운영관리자').length,
        viewer: activeMembers.filter(m => m.adminRole === '조회관리자').length,
        suspended: activeMembers.filter(m => m.suspended || m.status === '정지').length,
        withdrawn: withdrawnMembers.length,
        newPay: activeMembers.filter(m => String(m.paymentStatus || m.status || '').includes('신규결제')).length,
        extensionPay: activeMembers.filter(m => String(m.paymentStatus || m.status || '').includes('연장결제')).length,
        refundRequest: activeMembers.filter(m => m.refundRequestPending || String(m.paymentStatus || '').includes('환불요청')).length,
        refund: activeMembers.filter(m => String(m.paymentStatus || m.status || '').includes('환불처리')).length
      };
      return counts;
    }

    function getAdminFolderLabel(key) {
      const labels = {
        all:'전체회원',
        normal:'일반회원',
        newSignup:'신규회원',
        free:'베타',
        monthly:'1개월권',
        due:'만료예정',
        grace14:'유예14일 이상',
        super:'최고관리자',
        operator:'운영관리자',
        viewer:'조회관리자',
        suspended:'정지회원',
        newPay:'신규결제',
        extensionPay:'연장결제',
        refundRequest:'환불요청',
        refund:'환불처리',
        withdrawn:'강제탈퇴'
      };
      return labels[key] || '전체회원';
    }

    function filterAdminMembersByFolder(member, folder) {
      if (folder === 'withdrawn') return !!member.withdrawn;
      if (member.withdrawn) return false;
      if (folder === 'all') return true;
      if (folder === 'normal') return !member.adminRole && !member.suspended;
      if (folder === 'newSignup') return getLocalDateKey(member?.createdAt) === getLocalDateKey();
      if (folder === 'free') return String(getMemberPlanInfo(member).label).includes('무료');
      if (folder === 'monthly') return String(getMemberPlanInfo(member).label).includes('1개월') || String(getMemberPlanInfo(member).label).includes('monthly');
      if (folder === 'due') return isMemberPaymentDueSoon(member);
      if (folder === 'grace14') return isMemberGrace14Over(member);
      if (folder === 'super') return member.adminRole === SUPER_ADMIN_ROLE_NAME;
      if (folder === 'operator') return member.adminRole === '운영관리자';
      if (folder === 'viewer') return member.adminRole === '조회관리자';
      if (folder === 'suspended') return member.suspended || member.status === '정지';
      if (folder === 'newPay') return String(member.paymentStatus || member.status || '').includes('신규결제');
      if (folder === 'extensionPay') return String(member.paymentStatus || member.status || '').includes('연장결제');
      if (folder === 'refundRequest') return member.refundRequestPending || String(member.paymentStatus || '').includes('환불요청');
      if (folder === 'refund') return String(member.paymentStatus || member.status || '').includes('환불처리');
      return true;
    }

    function adminMemberMatchesSearch(member, q) {
      if (!q) return true;
      const needle = normalizeLoginText(q).toLowerCase();
      const values = [
        getMemberDisplayName(member),
        getMemberMainId(member),
        member?.phone || '',
        member?.providerId || '',
        member?.signupId || '',
        member?.provider || '',
        member?.signupMethod || '',
        member?.adminMemo || '',
        getMemberKakaoText(member),
        getMemberStatusText(member)
      ].join(' ').toLowerCase();
      return values.includes(needle);
    }

    function setAdminMemberFolder(folder) {
      if (folder === 'free') folder = 'all';
      adminMemberFolder = folder || 'all';
      adminMemberPage = 0;
      adminExpandedMemberId = '';
      renderAdmin();
    }

    function handleAdminMemberSearchInput(input) {
      // 입력 중에는 화면을 다시 그리지 않습니다.
      // 한글/숫자 입력 도중 renderAdmin()이 실행되면 글자가 분리되거나 커서가 튀는 문제가 있습니다.
      adminMemberSearchText = input?.value || '';
    }

    function finishAdminMemberSearchComposition(input) {
      adminMemberSearchComposing = false;
      adminMemberSearchText = input?.value || '';
    }

    function setAdminMemberSearch(value) {
      adminMemberSearchText = value || '';
      adminMemberPage = 0;
      adminExpandedMemberId = '';
      renderAdmin();
    }

    function applyAdminMemberSearch() {
      const input = document.getElementById('adminMemberSearchInput');
      setAdminMemberSearch(input?.value || adminMemberSearchText || '');
    }

    function clearAdminMemberSearch() {
      adminMemberSearchText = '';
      adminMemberPage = 0;
      adminExpandedMemberId = '';
      renderAdmin();
    }

    function changeAdminMemberPage(delta) {
      adminMemberPage = Math.max(0, adminMemberPage + Number(delta || 0));
      renderAdmin();
    }

    function toggleAdminMemberDetail(memberId) {
      adminExpandedMemberId = adminExpandedMemberId === memberId ? '' : memberId;
      renderAdmin();
    }

    function formatShortDate(value) {
      if (!value) return '-';
      try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '-';
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      } catch (e) {
        return '-';
      }
    }

    function formatNullableDateTime(value) {
      if (!value) return '접속기록 없음';
      try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '접속기록 없음';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return y + '-' + m + '-' + day + ' ' + hh + ':' + mm;
      } catch (e) {
        return '접속기록 없음';
      }
    }

    function updateMemberLastLogin(memberOrLoginId, method) {
      const members = ensureMemberIds();
      const q = typeof memberOrLoginId === 'string' ? normalizeAdminRoleKey(memberOrLoginId) : '';
      const targetKeys = typeof memberOrLoginId === 'object' ? getMemberAdminIdentifiers(memberOrLoginId) : [];
      const target = members.find(member => {
        const keys = getMemberAdminIdentifiers(member);
        return (memberOrLoginId?.id && member.id === memberOrLoginId.id) ||
          (q && keys.includes(q)) ||
          targetKeys.some(key => keys.includes(key));
      });
      if (!target) return memberOrLoginId;
      target.lastLoginAt = new Date().toISOString();
      target.lastLoginMethod = method || target.signupMethod || target.provider || '로그인';
      setMembers(members);
      return target;
    }


    function getAdminEditableMember(memberId) {
      const members = ensureMemberIds();
      const target = members.find(member => String(member.id) === String(memberId));
      return { members, target };
    }

    function readAdminPaymentInputs(memberId) {
      return {
        amount:(document.getElementById('payAmount_' + memberId)?.value || '').trim(),
        memo:(document.getElementById('payMemo_' + memberId)?.value || '').trim()
      };
    }

    function addMemberPaymentHistory(member, action, memo, amount) {
      if (!member) return;
      member.paymentHistory = Array.isArray(member.paymentHistory) ? member.paymentHistory : [];
      member.paymentHistory.unshift({
        at:new Date().toISOString(),
        action,
        amount:amount || '',
        memo:memo || '',
        by:localStorage.getItem(ADMIN_SESSION_KEY + '_id') || SUPER_ADMIN_ROLE_NAME
      });
      member.paymentHistory = member.paymentHistory.slice(0, 30);
    }

    function memberOwnsItemForPayment(member, item) {
      if (!member || !item) return false;
      const memberPhone = String(member.phone || '').replace(/[^0-9]/g, '');
      const itemPhone = String(item.ownerPhone || '').replace(/[^0-9]/g, '');
      return (member.id && item.ownerMemberId === member.id) ||
        (member.signupId && item.ownerSignupId === member.signupId) ||
        (member.providerId && item.ownerProviderId === member.providerId) ||
        (memberPhone && itemPhone && memberPhone === itemPhone);
    }

    function applyMemberPaymentToOwnedItems(member, planKey, days, planText) {
      if (!member) return 0;
      const info = getPlanInfo(planKey || 'monthly');
      const now = new Date();
      const freshManagerExpireAt = new Date(getSevenDaysFromNowMs()).toISOString();
      let changed = 0;
      const items = getItems();
      items.forEach(item => {
        if (!memberOwnsItemForPayment(member, item)) return;
        const currentEnd = item.trialEndsAt ? new Date(item.trialEndsAt) : now;
        const base = currentEnd.getTime() > now.getTime() ? currentEnd : now;
        const newEnd = addDaysIso(base.toISOString(), days || info.days || 30);
        item.serviceStatus = '유료사용';
        item.paymentPlan = info.key || planKey || 'monthly';
        item.basicPlan = planText || info.planText || '월 결제';
        item.alertPlan = item.alertPlan || '보험·검사 만료 알림 포함 준비';
        item.paidAt = now.toISOString();
        item.trialEndsAt = newEnd;
        item.managerExpireAt = freshManagerExpireAt;
        item.updatedAt = now.toISOString();
        if (item.paymentConversionTest) item.paymentTestPaid = true;
        if (item.bundleMeta) item.bundleMeta.paymentText = (planText || info.planText || '월 결제') + ' 결제완료';
        changed += 1;
      });
      if (changed) setItems(items);
      return changed;
    }

    function pauseOwnedItemsAfterMemberRefund(member) {
      if (!member) return 0;
      const nowIso = new Date().toISOString();
      let changed = 0;
      const items = getItems();
      items.forEach(item => {
        if (!memberOwnsItemForPayment(member, item)) return;
        item.serviceStatus = '환불처리';
        item.paymentPlan = 'refund';
        item.basicPlan = '환불처리 / QR 일시정지';
        item.trialEndsAt = nowIso;
        item.managerExpireAt = nowIso;
        item.updatedAt = nowIso;
        if (item.paymentConversionTest) item.paymentTestPaid = false;
        if (item.bundleMeta) item.bundleMeta.paymentText = '환불처리 / QR 일시정지';
        changed += 1;
      });
      if (changed) setItems(items);
      return changed;
    }

    function processMemberNewPayment(memberId) {
      if (!isSuperAdminLoggedIn()) {
        alert('신규결제 처리는 최고관리자만 가능합니다.');
        return;
      }
      const { members, target } = getAdminEditableMember(memberId);
      if (!target) { alert('회원을 찾을 수 없습니다.'); return; }
      const input = readAdminPaymentInputs(memberId);
      if (!confirm((target.name || target.signupId || '회원') + '님을 1개월 신규결제로 처리할까요?')) return;
      const nowIso = new Date().toISOString();
      target.paymentPlanLabel = '1개월권';
      target.memberPlan = '1개월권';
      target.paymentStartedAt = nowIso;
      target.paymentEndsAt = addDaysIso(nowIso, 30);
      target.paymentStatus = '신규결제완료';
      target.paymentAmount = input.amount || target.paymentAmount || '';
      target.paymentMemo = input.memo || '';
      target.status = '1개월 신규결제';
      target.adminLastAction = '1개월 신규결제 처리';
      target.adminLastActionAt = nowIso;
      addMemberPaymentHistory(target, '신규결제', input.memo || '1개월권 결제완료 처리', input.amount);
      const activatedCount = applyMemberPaymentToOwnedItems(target, 'monthly', 30, '월 결제 · 월 2,000원');
      setMembers(members);
      alert('신규결제 처리했습니다. 남은기간은 30일로 표시됩니다.' + (activatedCount ? '\n연결된 장비서류 ' + activatedCount + '건의 QR·링크도 다시 활성화했습니다.' : ''));
      renderAdmin();
    }

    function processMemberPaymentExtension(memberId) {
      if (!isSuperAdminLoggedIn()) {
        alert('연장결제 처리는 최고관리자만 가능합니다.');
        return;
      }
      const { members, target } = getAdminEditableMember(memberId);
      if (!target) { alert('회원을 찾을 수 없습니다.'); return; }
      const input = readAdminPaymentInputs(memberId);
      if (!confirm((target.name || target.signupId || '회원') + '님의 결제기간을 1개월 연장할까요?')) return;
      const now = new Date();
      const currentEnd = target.paymentEndsAt ? new Date(target.paymentEndsAt) : null;
      const base = currentEnd && !Number.isNaN(currentEnd.getTime()) && currentEnd > now ? currentEnd : now;
      const newEnd = new Date(base.getTime());
      newEnd.setDate(newEnd.getDate() + 30);
      const nowIso = now.toISOString();
      target.paymentPlanLabel = target.paymentPlanLabel && target.paymentPlanLabel !== '미결제' ? target.paymentPlanLabel : '1개월권';
      target.memberPlan = target.memberPlan && target.memberPlan !== '미결제' ? target.memberPlan : '1개월권';
      target.paymentStartedAt = target.paymentStartedAt || nowIso;
      target.paymentEndsAt = newEnd.toISOString();
      target.paymentStatus = '연장결제완료';
      target.paymentAmount = input.amount || target.paymentAmount || '';
      target.paymentMemo = input.memo || '';
      target.status = '1개월 연장결제';
      target.adminLastAction = '1개월 연장결제 처리';
      target.adminLastActionAt = nowIso;
      addMemberPaymentHistory(target, '연장결제', input.memo || '기존 만료일 기준 또는 오늘 기준 30일 연장', input.amount);
      const activatedCount = applyMemberPaymentToOwnedItems(target, 'monthly', 30, '월 결제 · 월 2,000원');
      setMembers(members);
      alert('연장결제 처리했습니다. 만료일이 30일 연장되었습니다.' + (activatedCount ? '\n연결된 장비서류 ' + activatedCount + '건의 QR·링크도 다시 활성화했습니다.' : ''));
      renderAdmin();
    }

    function requestMemberRefund(memberId) {
      if (!isSuperAdminLoggedIn()) {
        alert('환불요청 등록은 최고관리자만 가능합니다.');
        return;
      }
      const { members, target } = getAdminEditableMember(memberId);
      if (!target) { alert('회원을 찾을 수 없습니다.'); return; }
      const input = readAdminPaymentInputs(memberId);
      if (!confirm((target.name || target.signupId || '회원') + '님의 환불요청을 등록할까요?')) return;
      const nowIso = new Date().toISOString();
      target.refundRequestPending = true;
      target.refundRequestedAt = nowIso;
      target.refundRequestMemo = input.memo || '환불요청';
      target.paymentStatus = '환불요청';
      target.adminLastAction = '환불요청 등록';
      target.adminLastActionAt = nowIso;
      addMemberPaymentHistory(target, '환불요청', input.memo || '환불요청 등록', input.amount || target.paymentAmount || '');
      setMembers(members);
      alert('환불요청으로 등록했습니다. 환불요청 폴더에서 확인할 수 있습니다.');
      renderAdmin();
    }

    function processMemberRefund(memberId) {
      if (!isSuperAdminLoggedIn()) {
        alert('환불처리는 최고관리자만 가능합니다.');
        return;
      }
      const { members, target } = getAdminEditableMember(memberId);
      if (!target) { alert('회원을 찾을 수 없습니다.'); return; }
      const input = readAdminPaymentInputs(memberId);
      if (!confirm((target.name || target.signupId || '회원') + '님을 환불처리할까요?')) return;
      if (!confirm('환불처리하면 결제상태가 환불처리로 표시되고 남은기간은 만료로 처리됩니다. 계속할까요?')) return;
      const nowIso = new Date().toISOString();
      target.refundRequestPending = false;
      target.refundProcessedAt = nowIso;
      target.paymentStatus = '환불처리';
      target.paymentPlanLabel = '환불처리';
      target.memberPlan = '환불처리';
      target.paymentRefundedAt = nowIso;
      target.paymentEndsAt = nowIso;
      target.paymentRefundReason = input.memo || '관리자 환불처리';
      target.status = '환불처리';
      target.adminLastAction = '환불처리';
      target.adminLastActionAt = nowIso;
      addMemberPaymentHistory(target, '환불처리', input.memo || '관리자 환불처리', input.amount || target.paymentAmount || '');
      const pausedCount = pauseOwnedItemsAfterMemberRefund(target);
      setMembers(members);
      alert('환불처리했습니다.' + (pausedCount ? '\n연결된 장비서류 ' + pausedCount + '건의 QR·링크도 일시정지했습니다.' : ''));
      renderAdmin();
    }

    function renderAdminPaymentWindow(member) {
      const plan = getMemberPlanInfo(member);
      const refundDone = !!(member.refundProcessedAt || member.paymentRefundedAt || String(member.paymentStatus || member.status || '').includes('환불처리'));
      const refundDoneAt = member.refundProcessedAt || member.paymentRefundedAt || '';
      const refundDoneText = refundDone ? ('처리완료' + (refundDoneAt ? ' · ' + formatNullableDateTime(refundDoneAt) : '')) : '미처리';
      const history = Array.isArray(member.paymentHistory) && member.paymentHistory.length
        ? member.paymentHistory.slice(0, 5).map(row => '<div class="small">· ' + escapeHtml(formatNullableDateTime(row.at)) + ' ' + escapeHtml(row.action || '') + (row.amount ? ' · 금액 ' + escapeHtml(row.amount) : '') + (row.memo ? ' · ' + escapeHtml(row.memo) : '') + '</div>').join('')
        : '<div class="small">결제 처리 이력이 없습니다.</div>';
      return '<div class="admin-payment-window">' +
        '<h4>결제처리 창</h4>' +
        '<div class="admin-payment-section">' +
          '<span class="admin-payment-section-title">1. 현재 결제상태</span>' +
          '<div class="admin-payment-current">' +
            '<span><b>현재상태</b>' + escapeHtml(member.paymentStatus || member.status || '-') + '</span>' +
            '<span><b>요금제</b>' + escapeHtml(plan.label || '-') + '</span>' +
            '<span><b>남은기간</b>' + escapeHtml(plan.remainText || '-') + '</span>' +
            '<span><b>환불요청</b>' + escapeHtml(member.refundRequestPending ? ('요청됨 · ' + formatNullableDateTime(member.refundRequestedAt)) : '없음') + '</span>' +
            '<span><b>환불처리확인</b>' + escapeHtml(refundDoneText) + '</span>' +
            '<button class="dangerBtn" onclick="processMemberRefund(\'' + escapeJs(member.id) + '\')">환불처리</button>' +
          '</div>' +
        '</div>' +
        '<div class="admin-payment-section">' +
          '<span class="admin-payment-section-title">2. 처리 이력</span>' +
          history +
          '<div class="notice blue-note" style="margin-top:10px;">환불요청 상태를 확인한 뒤 바로 환불처리할 수 있습니다. 처리하면 결제상태와 처리이력에 환불처리로 남습니다.</div>' +
        '</div>' +
      '</div>';
    }

    function grantMemberFreeMonth(memberId) {
      if (!isSuperAdminLoggedIn()) {
        alert('무료 1개월권 지급은 최고관리자만 가능합니다.');
        return;
      }
      const members = ensureMemberIds();
      const target = members.find(member => String(member.id) === String(memberId));
      if (!target) { alert('회원을 찾을 수 없습니다.'); return; }
      const nowIso = new Date().toISOString();
      target.paymentPlanLabel = '무료 1개월권';
      target.memberPlan = '무료 1개월권';
      target.paymentStartedAt = nowIso;
      target.paymentEndsAt = addDaysIso(nowIso, 30);
      target.status = '무료 1개월권';
      target.adminLastAction = '무료 1개월권 지급';
      target.adminLastActionAt = nowIso;
      setMembers(members);
      alert((target.name || target.signupId || '회원') + '님에게 무료 1개월권을 지급했습니다.');
      renderAdmin();
    }

    function setMemberPaidMonth(memberId) {
      processMemberNewPayment(memberId);
    }

    function toggleMemberSuspended(memberId) {
      if (!isSuperAdminLoggedIn()) {
        alert('회원 정지/해제는 최고관리자만 가능합니다.');
        return;
      }
      const members = ensureMemberIds();
      const target = members.find(member => String(member.id) === String(memberId));
      if (!target) { alert('회원을 찾을 수 없습니다.'); return; }
      target.suspended = !target.suspended;
      target.status = target.suspended ? '정지' : '정상';
      target.adminLastAction = target.suspended ? '회원 정지' : '회원 정지해제';
      target.adminLastActionAt = new Date().toISOString();
      setMembers(members);
      alert((target.name || target.signupId || '회원') + '님을 ' + (target.suspended ? '정지' : '정지해제') + ' 처리했습니다.');
      renderAdmin();
    }

    function saveAdminMemberMemo(memberId) {
      if (!isSuperAdminLoggedIn()) {
        alert('관리자 메모 저장은 최고관리자만 가능합니다.');
        return;
      }
      const members = ensureMemberIds();
      const target = members.find(member => String(member.id) === String(memberId));
      if (!target) { alert('회원을 찾을 수 없습니다.'); return; }
      const memo = (document.getElementById('adminMemo_' + memberId)?.value || '').trim();
      target.adminMemo = memo;
      target.adminMemoUpdatedAt = new Date().toISOString();
      setMembers(members);
      alert('관리자 메모를 저장했습니다.');
      renderAdmin();
    }

    function renderAdminMemberDetail(member) {
      if (member.withdrawn) {
        return '<div class="admin-member-detail"><div class="notice">강제탈퇴 처리된 기록입니다.<br>처리일: ' + escapeHtml(formatDateTime(member.withdrawnAt)) + '<br>처리자: ' + escapeHtml(member.withdrawnBy || SUPER_ADMIN_ROLE_NAME) + '</div></div>';
      }
      if (member.isSuperAdminVirtual) {
        return '<div class="admin-member-detail"><div class="notice blue-note">대표이사 최고관리자 계정입니다. 이 계정은 권한해제, 정지, 강제탈퇴 대상에서 제외됩니다.</div></div>';
      }
      const warnings = getMemberDocWarningCount(member);
      const plan = getMemberPlanInfo(member);
      return '<div class="admin-member-detail">' +
        '<div class="admin-mini-grid">' +
          '<div class="line"><b>가입일</b><span>' + escapeHtml(formatShortDate(member.createdAt)) + '</span></div>' +
          '<div class="line"><b>최근접속</b><span>' + escapeHtml(formatNullableDateTime(member.lastLoginAt || member.loggedInAt)) + '</span></div>' +
          '<div class="line"><b>만료임박</b><span>' + warnings.expiring + '건</span></div>' +
          '<div class="line"><b>만료</b><span>' + warnings.expired + '건</span></div>' +
        '</div>' +
        '<div class="field" style="margin-top:10px;"><label>관리자 메모</label><textarea id="adminMemo_' + escapeHtml(member.id) + '" rows="3" style="min-height:78px;resize:vertical;" placeholder="문의내용, 결제약속, 민원, 특이사항 등을 남겨두세요.">' + escapeHtml(member.adminMemo || '') + '</textarea></div>' +
        '<div class="small">최근 조치: ' + escapeHtml(member.adminLastAction || '-') + (member.adminLastActionAt ? ' · ' + escapeHtml(formatDateTime(member.adminLastActionAt)) : '') + '</div>' +
        renderAdminPaymentWindow(member) +
        '<div class="actions">' +
          '<button class="primary" onclick="grantMemberFreeMonth(\'' + escapeJs(member.id) + '\')">무료 1개월권</button>' +
          '<button class="ghost" onclick="saveAdminMemberMemo(\'' + escapeJs(member.id) + '\')">메모 저장</button>' +
          '<button class="ghost" onclick="toggleMemberSuspended(\'' + escapeJs(member.id) + '\')">' + (member.suspended ? '정지해제' : '회원정지') + '</button>' +
          (member.adminRole ? '<button class="dangerBtn" onclick="clearMemberAdminRole(\'' + escapeJs(member.id) + '\')">관리자해제</button>' : '') +
          '<button class="dangerBtn" onclick="forceWithdrawMember(\'' + escapeJs(member.id) + '\')">회원 강제탈퇴</button>' +
        '</div>' +
        '<div class="small">결제 시작일: ' + escapeHtml(formatShortDate(plan.startedAt)) + ' · 결제 만료일: ' + escapeHtml(formatShortDate(plan.endsAt)) + '</div>' +
        renderMemberEquipmentList(member) +
      '</div>';
    }

    function setMemberAdminRole(memberId, role) {
      if (!isSuperAdminLoggedIn()) {
        alert('관리자 권한 지정/해제는 최고관리자만 가능합니다.');
        return;
      }
      const members = ensureMemberIds();
      const target = members.find(member => String(member.id) === String(memberId));
      if (!target) {
        alert('회원을 찾을 수 없습니다.');
        return;
      }
      target.adminRole = role;
      target.adminRoleUpdatedAt = new Date().toISOString();
      target.adminRoleUpdatedBy = SUPER_ADMIN_ROLE_NAME;
      setMembers(members);
      syncMemberAdminRoleMap(target, role);
      alert((target.name || target.signupId || '회원') + '님을 ' + role + '로 지정했습니다.\n이 회원은 다음 로그인부터 관리자모드로 접속됩니다.');
      renderAdmin();
    }

    function clearMemberAdminRole(memberId) {
      if (!isSuperAdminLoggedIn()) {
        alert('관리자 권한 지정/해제는 최고관리자만 가능합니다.');
        return;
      }
      const members = ensureMemberIds();
      const target = members.find(member => String(member.id) === String(memberId));
      if (!target) {
        alert('회원을 찾을 수 없습니다.');
        return;
      }
      if (!confirm((target.name || target.signupId || '회원') + '님의 관리자 권한을 해제할까요?')) return;
      delete target.adminRole;
      target.adminRoleUpdatedAt = new Date().toISOString();
      target.adminRoleUpdatedBy = SUPER_ADMIN_ROLE_NAME;
      setMembers(members);
      syncMemberAdminRoleMap(target, '');
      alert('관리자 권한을 해제했습니다.');
      renderAdmin();
    }

    function forceWithdrawMember(memberId) {
      if (!isSuperAdminLoggedIn()) {
        alert('회원 강제탈퇴는 최고관리자만 가능합니다.');
        return;
      }
      const members = ensureMemberIds();
      const target = members.find(member => String(member.id) === String(memberId));
      if (!target) {
        alert('회원을 찾을 수 없습니다.');
        return;
      }
      const targetName = getMemberDisplayName(target);
      if (!confirm(targetName + '님을 강제탈퇴 처리할까요?\n\n회원 목록에서 삭제되고 관리자 권한도 함께 해제됩니다.')) return;
      if (!confirm('정말 삭제할까요?\n강제탈퇴 기록은 관리자관리의 강제탈퇴 폴더에 남깁니다.')) return;

      syncMemberAdminRoleMap(target, '');
      const withdrawnList = getWithdrawnMembers();
      withdrawnList.unshift({
        ...target,
        withdrawn:true,
        status:'강제탈퇴',
        adminRole:'',
        withdrawnAt:new Date().toISOString(),
        withdrawnBy:localStorage.getItem(ADMIN_SESSION_KEY + '_id') || SUPER_ADMIN_ROLE_NAME
      });
      setWithdrawnMembers(withdrawnList.slice(0, 500));

      const remained = members.filter(member => String(member.id) !== String(memberId));
      setMembers(remained);

      try {
        const current = JSON.parse(localStorage.getItem(CURRENT_MEMBER_KEY) || 'null');
        const sameCurrent = current && (
          String(current.id || '') === String(target.id || '') ||
          String(current.signupId || '').toLowerCase() === String(target.signupId || '').toLowerCase() ||
          String(current.providerId || '').toLowerCase() === String(target.providerId || '').toLowerCase() ||
          String(current.phone || '').replace(/[^0-9]/g, '') === String(target.phone || '').replace(/[^0-9]/g, '')
        );
        if (sameCurrent) localStorage.removeItem(CURRENT_MEMBER_KEY);
      } catch (e) {}

      alert(targetName + '님을 강제탈퇴 처리했습니다.');
      refreshMemberUi();
      renderAdmin();
    }


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

    function renderAdminStaffManager(members) {
      if (!isSuperAdminLoggedIn()) {
        return '<div class="card" style="box-shadow:none;margin-top:14px;"><h3>관리자관리</h3><div class="notice">관리자 지정/권한변경/해제, 회원 강제탈퇴, 무료권 지급은 최고관리자만 가능합니다.</div></div>';
      }

      const withdrawnMembers = getWithdrawnMembers().map(item => ({ ...item, withdrawn:true, status:'강제탈퇴' }));
      const activeMembers = getAdminAllMemberRows();
      const counts = getAdminMemberCounts(activeMembers, withdrawnMembers);
      const folders = ['super','operator','viewer','all','normal','newSignup','monthly','due','grace14','suspended','newPay','extensionPay','refundRequest','refund','withdrawn'];
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
          '<div class="line"><b>관리자</b><span>' + ((counts.super || 0) + (counts.operator || 0) + (counts.viewer || 0)) + '명</span></div>' +
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
        const role = member.withdrawn ? '강제탈퇴' : (member.adminRole || '일반회원');
        const plan = getMemberPlanInfo(member);
        const eqCount = getMemberEquipmentCount(member);
        const status = getMemberStatusText(member);
        const roleBadge = '<span class="badge ' + getAdminRoleBadgeClass(role) + '">' + escapeHtml(role) + '</span>';
        const idText = getMemberMainId(member);
        const detailOpen = adminExpandedMemberId === member.id;
        const quickRoleButtons = member.withdrawn || member.isSuperAdminVirtual
          ? ''
          : (member.adminRole
            ? '<button class="ghost" onclick="setMemberAdminRole(\'' + escapeJs(member.id) + '\', \'운영관리자\')">운영관리자</button><button class="ghost" onclick="setMemberAdminRole(\'' + escapeJs(member.id) + '\', \'조회관리자\')">조회관리자</button>'
            : '<button class="primary" onclick="setMemberAdminRole(\'' + escapeJs(member.id) + '\', \'운영관리자\')">운영관리자 지정</button><button class="okBtn" onclick="setMemberAdminRole(\'' + escapeJs(member.id) + '\', \'조회관리자\')">조회관리자 지정</button>');
        return '<div class="admin-member-row">' +
          '<div class="doc-head"><div><strong>' + escapeHtml(name) + '</strong><div class="small">아이디: ' + escapeHtml(idText) + ' · ' + escapeHtml(member.signupMethod || member.provider || '일반회원') + '</div></div>' + roleBadge + '</div>' +
          '<div class="admin-member-summary">' +
            '<span><b>휴대폰</b>' + escapeHtml(member.phone || '-') + '</span>' +
            '<span><b>카카오계정</b>' + escapeHtml(getMemberKakaoText(member)) + '</span>' +
            '<span><b>결제여부</b>' + escapeHtml(plan.label || '-') + '</span>' +
            '<span><b>남은기간</b>' + escapeHtml(plan.remainText || '-') + '</span>' +
            '<span><b>장비등록</b>' + eqCount + '대</span>' +
            '<span><b>회원상태</b>' + escapeHtml(status) + '</span>' +
            '<span><b>최근로그인</b><span class="admin-login-time">' + escapeHtml(formatNullableDateTime(member.lastLoginAt || member.loggedInAt)) + '</span></span>' +
          '</div>' +
          '<div class="actions">' +
            '<button class="ghost" onclick="toggleAdminMemberDetail(\'' + escapeJs(member.id) + '\')">' + (detailOpen ? '상세닫기' : '상세관리') + '</button>' +
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
        '<h3>회원관리 / 관리자관리</h3>' +
        '<div class="notice blue-note">검색, 폴더 분류, 20명씩 보기로 회원이 많아져도 관리하기 쉽게 정리했습니다. 최고관리자는 권한지정, 무료 1개월권, 신규결제, 연장결제, 환불처리, 정지, 강제탈퇴, 관리자 메모를 할 수 있습니다. 회원별 최근 로그인 날짜/시간도 표시됩니다. 신규결제·연장결제·환불요청은 위 확인칸에서 누가 요청/처리됐는지 바로 볼 수 있습니다.</div>' +
        summary +
        renderAdminPaymentStatusBoard(activeMembers) +
        '<div class="admin-member-toolbar"><div><input id="adminMemberSearchInput" type="text" placeholder="이름 / 아이디 / 휴대폰번호 / 카카오계정 검색" value="' + escapeHtml(adminMemberSearchText || '') + '" oncompositionstart="adminMemberSearchComposing=true" oncompositionend="finishAdminMemberSearchComposition(this)" oninput="handleAdminMemberSearchInput(this)" onkeydown="if(event.key===\'Enter\' && !adminMemberSearchComposing){applyAdminMemberSearch();}" /></div><div class="actions admin-search-actions"><button type="button" class="primary" onclick="applyAdminMemberSearch()">검색</button><button type="button" class="ghost" onclick="clearAdminMemberSearch()">초기화</button></div><div class="small">현재 폴더: <b>' + escapeHtml(getAdminFolderLabel(adminMemberFolder)) + '</b></div></div>' +
        '<div class="admin-folder-tabs">' + folderButtons + '</div>' +
        rows + pager +
      '</div>';
    }


    function renderAdmin() {
      if (!isAdminLoggedIn()) { showScreen('signupScreen'); return; }
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
        '<div class="notice blue-note"><b>현재 권한: ' + escapeHtml(getCurrentAdminRoleName()) + '</b><br>' + (isSuperAdminLoggedIn() ? '대표이사 최고관리자는 모든 관리 기능을 사용할 수 있으며, 직원 관리자 지정/권한변경/해제가 가능합니다.' : '직원 관리자는 관리자모드 접속 권한만 부여된 상태입니다. 관리자 지정/해제는 최고관리자만 가능합니다.') + '</div>' +
        topSummary +
        renderAdminTodoSummary({ waitingContacts, paymentDue, paused, expiringDocs, expiredDocs, grace14Items }) +
        renderPaymentConversionTestPanel(items, members) +
        renderAdminStaffManager(members) + renderAdminContactManager();
    }

    function deleteItem(code) {
      if (!requirePasswordReconfirm('서류함 삭제')) return;
      if (!confirm('이 서류함을 삭제할까요?')) return;
      const items = getItems().filter(x => x.code !== code);
      setItems(items);
      renderList();
    }

    function clearAll() {
      if (!requirePasswordReconfirm('전체 삭제')) return;
      if (!confirm('저장된 모든 서류함을 삭제할까요?')) return;
      localStorage.removeItem(STORAGE_KEY);
      renderList();
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

    function setHomeInstallStatus(message) {
      const status = document.getElementById('homeInstallStatus');
      if (status) status.innerHTML = message;
    }

    function isHomeInstallGuidePanelOpen() {
      const guide = document.getElementById('homeInstallManualGuide');
      return !!(guide && !guide.classList.contains('hidden'));
    }

    function openHomeInstallGuidePanel(message) {
      const guide = document.getElementById('homeInstallManualGuide');
      if (message) setHomeInstallStatus(message);
      if (guide) {
        guide.classList.remove('hidden');
        updateHomeInstallButtonState();
        try { guide.scrollIntoView({ behavior:'smooth', block:'center' }); } catch (e) {}
      }
    }

    function closeHomeInstallGuidePanel(message) {
      const guide = document.getElementById('homeInstallManualGuide');
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
        return '이미 홈화면에서 SitePass 앱처럼 실행 중입니다.';
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
      return '브라우저가 아직 설치 가능 신호를 보내지 않았습니다. 30초 정도 사용 후 다시 누르거나, 메뉴(⋮)에서 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 눌러주세요.';
    }

    function updateHomeInstallButtonState(message) {
      const btn = document.getElementById('homeInstallButton');
      if (!btn) return;
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
      if (message) setHomeInstallStatus(message);
    }

    async function addSitePassToHomeScreen(event) {
      if (event && event.preventDefault) event.preventDefault();

      if (isHomeInstallGuidePanelOpen()) {
        closeHomeInstallGuidePanel('설치 안내를 접었습니다. 필요하면 다시 <b>홈화면에 설치하기</b>를 눌러주세요.');
        return false;
      }

      if (isSitePassStandalone()) {
        openHomeInstallGuidePanel('이미 홈화면에서 SitePass 앱처럼 실행 중입니다.');
        updateHomeInstallButtonState();
        return false;
      }

      if (deferredSitePassInstallPrompt) {
        try {
          deferredSitePassInstallPrompt.prompt();
          const choice = await deferredSitePassInstallPrompt.userChoice;
          deferredSitePassInstallPrompt = null;
          if (choice && choice.outcome === 'accepted') {
            closeHomeInstallGuidePanel('홈화면 추가가 진행되었습니다. 설치가 끝나면 SitePass 아이콘으로 들어오면 됩니다.');
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

    function registerSitePassServiceWorker() {
      if (!('serviceWorker' in navigator)) {
        setHomeInstallStatus('이 브라우저는 서비스워커를 지원하지 않아 앱 설치 기능이 제한될 수 있습니다.');
        return;
      }
      if (!(window.isSecureContext || location.hostname === 'localhost')) {
        setHomeInstallStatus('서비스워커와 설치창은 https 주소 또는 localhost에서만 정상 작동합니다.');
        return;
      }
      navigator.serviceWorker.register('./sw.js').then(function() {
        if (!deferredSitePassInstallPrompt && !isSitePassStandalone()) {
          setHomeInstallStatus('설치 준비 중입니다. 브라우저가 설치 가능하다고 판단하면 <b>홈화면에 설치하기</b> 버튼으로 설치창이 열립니다.');
        }
      }).catch(function() {
        setHomeInstallStatus('서비스워커 등록이 되지 않았습니다. 정식 배포 시 sw.js 파일이 같은 폴더에 있어야 합니다.');
      });
    }

    window.addSitePassToHomeScreen = addSitePassToHomeScreen;
    window.showHomeInstallGuide = showHomeInstallGuide;

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
      const stats = getPaymentConversionTestStats(items, members);
      return '<div class="card" style="box-shadow:none;margin-top:12px;">' +
        '<h3>유료전환 차단 검사</h3>' +
        '<div class="notice blue-note">임시 회원 50명과 장비 100대를 만들어 베타기간 종료 후 결제하지 않은 장비가 QR 보내기, 링크복사, 담당자 화면에서 확실히 차단되는지 확인합니다. 실제 회원 데이터와 구분되도록 임시 표시를 붙입니다.</div>' +
        '<div class="admin-summary-rows"><div class="admin-summary-row">' +
          '<div class="line"><b>임시 회원</b><span>' + stats.testMembers + '명</span></div>' +
          '<div class="line"><b>임시장비</b><span>' + stats.testItems + '대</span></div>' +
        '</div><div class="admin-summary-row">' +
          '<div class="line"><b>QR 가능</b><span>' + stats.paidItems + '대</span></div>' +
          '<div class="line"><b>QR 차단</b><span>' + stats.blockedItems + '대</span></div>' +
        '</div></div>' +
        '<div class="actions">' +
          '<button class="primary" onclick="createPaymentConversionTestData()">임시 50명 / 장비 100대 생성</button>' +
          '<button class="ghost" onclick="expireUnpaidPaymentTestData()">베타기간 강제 종료</button>' +
          '<button class="okBtn" onclick="runPaymentConversionShareBlockTest()">QR 차단검사</button>' +
          '<button class="primary" onclick="runAutoPaymentLinkSelfTest()">1개월/1년 자동결제 링크검사</button>' +
          '<button class="ghost" onclick="runManagerSevenDayLinkSelfTest()">담당자 7일 링크 만료검사</button>' +
          '<button class="dangerBtn" onclick="clearPaymentConversionTestData()">임시 데이터 삭제</button>' +
        '</div>' +
      '</div>';
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

    function createPaymentConversionTestData() {
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
      alert('임시 데이터 생성 완료\n\n회원 50명 / 장비 100대\n- 결제완료 회원 20명, 장비 40대\n- 실사용베타 회원 30명, 장비 60대\n\n다음으로 [베타기간 강제 종료]를 누르면 미결제 장비 60대가 QR 차단 대상이 됩니다.');
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

    function clearPaymentConversionTestData() {
      if (!isSuperAdminLoggedIn()) { alert('임시 데이터 삭제는 최고관리자만 가능합니다.'); return; }
      if (!confirm('임시 회원 50명과 장비 100대를 삭제할까요?\n실제 회원/장비는 유지됩니다.')) return;
      setMembers(getMembers().filter(member => !isPaymentTestMember(member)));
      setItems(getItems().filter(item => !isPaymentTestItem(item)));
      alert('임시 유료전환 임시 데이터를 삭제했습니다.');
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
      if (localStorage.getItem(CLEAN_RESET_VERSION_KEY) === 'done') return false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify([]));
      localStorage.setItem(ADMIN_WITHDRAWN_MEMBERS_KEY, JSON.stringify([]));
      localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify([]));
      localStorage.setItem(VISIT_STATS_KEY, JSON.stringify({ total:0, daily:{} }));
      localStorage.setItem(ADMIN_ROLE_MAP_KEY, JSON.stringify({}));
      localStorage.removeItem(CURRENT_MEMBER_KEY);
      localStorage.removeItem(SELECTED_PAYMENT_PLAN_KEY);
      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_SESSION_KEY + '_role');
      localStorage.removeItem(ADMIN_SESSION_KEY + '_id');
      localStorage.removeItem(ADMIN_SESSION_KEY + '_name');
      localStorage.setItem(CLEAN_RESET_VERSION_KEY, 'done');
      return true;
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
        renderManagerPrint(parsed.code, parsed.exp, parsed.sig);
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

    window.addEventListener('hashchange', checkHash);
    window.addEventListener('beforeinstallprompt', function(event) {
      event.preventDefault();
      deferredSitePassInstallPrompt = event;
      updateHomeInstallButtonState('이 브라우저에서는 <b>홈화면에 설치하기</b> 버튼으로 설치창을 열 수 있습니다.');
    });

    window.addEventListener('appinstalled', function() {
      deferredSitePassInstallPrompt = null;
      closeHomeInstallGuidePanel('홈화면 추가가 완료되었습니다. 이제 SitePass 아이콘으로 들어오면 됩니다.');
      updateHomeInstallButtonState();
    });

    registerSitePassServiceWorker();
    updateHomeInstallButtonState();
    const didCleanReset = resetSitePassTestDataOnce();
    ensureAdminSampleData();
    if (!didCleanReset) recordSiteVisit();

    renderDocCards();
    renderAlertPreview();
    refreshAdminUi();
    refreshMemberUi();
    if (!checkHash()) showScreen(isAdminLoggedIn() ? 'adminScreen' : (isMemberLoggedIn() ? 'homeScreen' : 'signupScreen'));
  