// SitePass v23.7.299 - app-core-auth split continue (05/11)
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
