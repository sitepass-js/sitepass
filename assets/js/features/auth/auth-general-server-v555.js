// SitePass v23.7.561-test / r11 verified admin greeting direct render
// 4구간-33단계: 일반 아이디 로그인은 로컬 testPassword가 아니라
// Edge Function -> Supabase Auth -> auth.uid() -> 현재 회원 프로필 순서로만 처리합니다.
(function(){
  'use strict';

  var LOGIN_FUNCTION = 'sitepass-login-by-id';
  var PROFILE_RPC = 'sitepass_get_current_member_profile';
  var SUPER_ADMIN_LOGIN_ID = 'sitepass@kakao.com';
  var ADMIN_GREETING_SESSION_KEY_V561 = 'sitepass_v561_verified_admin_greeting_name';
  var adminAuthVerifiedV561 = false;
  var verifiedAdminGreetingNameV561 = '';

  function text(value){ return String(value == null ? '' : value).trim(); }

  function getClient(){
    return window.sitepassSupabase || null;
  }

  function setLoginBusy(busy){
    var ids = ['sitepassLoginContinueButton', 'sitepassFirstLoginButton'];
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      try { el.disabled = !!busy; } catch(e) {}
      try { el.setAttribute('aria-busy', busy ? 'true' : 'false'); } catch(e) {}
    });
  }

  function genericLoginError(message){
    alert(message || '아이디 또는 비밀번호를 확인해주세요.');
  }

  // v561 r9 / 59단계: 홈 인사말은 현재 로그인 세션의 서버 프로필 이름만 반영합니다.
  // 과거 로컬 캐시 이름은 사용하지 않으며 계정 전환 직후에도 즉시 다시 그립니다.
  function normalizeGreetingNameV561(value){
    var raw = text(value).replace(/\s+/g, ' ');
    if (!raw) return '';
    if (/님$/.test(raw)) return raw;
    return raw + '님';
  }

  function setVerifiedAdminGreetingNameV561(value){
    var name = text(value).replace(/\s+/g, ' ');
    if (!name) name = 'SitePass 최고관리자';
    // 현재 페이지 메모리를 1순위로 사용합니다. 세션 저장값은 새로고침 복구용 보조값입니다.
    verifiedAdminGreetingNameV561 = name;
    try { sessionStorage.setItem(ADMIN_GREETING_SESSION_KEY_V561, name); } catch(e) {}
    return name;
  }

  function getVerifiedAdminGreetingNameV561(){
    if (verifiedAdminGreetingNameV561) return verifiedAdminGreetingNameV561;
    try {
      var stored = text(sessionStorage.getItem(ADMIN_GREETING_SESSION_KEY_V561));
      if (stored) verifiedAdminGreetingNameV561 = stored;
      return stored;
    } catch(e) { return ''; }
  }

  function clearVerifiedAdminGreetingNameV561(){
    verifiedAdminGreetingNameV561 = '';
    try { sessionStorage.removeItem(ADMIN_GREETING_SESSION_KEY_V561); } catch(e) {}
  }

  function renderVerifiedAdminGreetingV561(value){
    var name = setVerifiedAdminGreetingNameV561(value);
    var el = document.getElementById('sitepassHomeGreetingText');
    if (!el) return name;
    el.textContent = '안녕하세요, ' + normalizeGreetingNameV561(name);
    return name;
  }

  window.sitePassGetVerifiedAdminGreetingNameV561 = getVerifiedAdminGreetingNameV561;

  function refreshHomeGreetingV561(preferredMember){
    var el = document.getElementById('sitepassHomeGreetingText');
    if (!el) return;

    var name = '';
    var member = preferredMember && typeof preferredMember === 'object' ? preferredMember : null;

    try {
      if (!member && typeof window.isMemberLoggedIn === 'function' && window.isMemberLoggedIn() &&
          typeof window.getCurrentMemberTest === 'function') {
        member = window.getCurrentMemberTest();
      }
    } catch(e) {}

    if (member) {
      name = text(member.name || member.signupIdentityName || member.verifiedName || '');
    }

    try {
      if (!name && typeof window.isAdminLoggedIn === 'function' && window.isAdminLoggedIn()) {
        name = getVerifiedAdminGreetingNameV561() || 'SitePass 최고관리자';
      }
    } catch(e) {}

    var shown = normalizeGreetingNameV561(name) || '회원님';
    el.textContent = '안녕하세요, ' + shown;
  }

  window.sitePassRefreshHomeGreetingV561 = refreshHomeGreetingV561;

  function removeLegacyLocalPassword(loginId, authUserId){
    try {
      var memberStore =
        window.SitePassMemberProfileStore ||
        null;

      if (
        !memberStore ||
        typeof memberStore.removeLegacyAuthFields !== 'function'
      ) {
        return;
      }

      memberStore.removeLegacyAuthFields(
        loginId,
        authUserId
      );
    } catch(e) {
      console.warn('[SitePass v555] legacy local password cleanup skipped', e);
    }
  }

  function completeServerMemberLogin(member){
    // 일반회원으로 계정 전환되면 검증된 관리자 인사말 세션은 즉시 폐기합니다.
    clearVerifiedAdminGreetingNameV561();
    // 절대로 기존 completeMemberLoginTest()를 호출하지 않습니다.
    // 구버전의 login_id 기반 관리자 승격 로직을 우회하기 위함입니다.
    var memberStore =
      window.SitePassMemberProfileStore ||
      null;

    if (
      memberStore &&
      typeof memberStore.replaceServerProfile ===
        'function'
    ) {
      memberStore.replaceServerProfile(
        member
      );
    }

    try {
      if (typeof window.setCurrentMemberTest === 'function') {
        window.setCurrentMemberTest(member);
      } else {
        sessionStorage.setItem('sitePass_v23_7_7_update_original_corrected_currentMember', JSON.stringify(member));
      }
    } catch(e) {}

    var current = null;
    try { if (typeof window.getCurrentMemberTest === 'function') current = window.getCurrentMemberTest(); } catch(e) {}

    try {
      if (typeof window.isSitePassAutoLoginEnabled === 'function' && window.isSitePassAutoLoginEnabled()) {
        if (typeof window.setBrowserAutoMemberTest === 'function') window.setBrowserAutoMemberTest(current || member);
        if (typeof window.isSitePassInstalledAppMode === 'function' && window.isSitePassInstalledAppMode() && typeof window.setPwaAutoMemberTest === 'function') {
          window.setPwaAutoMemberTest(current || member);
        }
      } else if (typeof window.clearPwaAutoMemberTest === 'function') {
        window.clearPwaAutoMemberTest();
      }
    } catch(e) {}

    try {
      if (
        window.SitePassAuthEvents &&
        typeof window.SitePassAuthEvents.emitSignedIn ===
          'function'
      ) {
        window.SitePassAuthEvents.emitSignedIn(
          'auth-general-server-v555'
        );
      }
    } catch(e) {}
    try { if (typeof window.refreshMemberUi === 'function') window.refreshMemberUi(); } catch(e) {}
    try { setTimeout(function(){ refreshHomeGreetingV561(current || member); }, 0); } catch(e) {}

    alert('로그인이 완료되었습니다.\nSitePass 메인 화면으로 이동합니다.');

    try {
      var target = (typeof window.isSitePassInstalledAppMode === 'function' && window.isSitePassInstalledAppMode()) ? 'listScreen' : 'homeScreen';
      if (typeof window.showScreen === 'function') window.showScreen(target);
    } catch(e) {}

    try { if (typeof window.promptRegistrationDraftIfNeeded === 'function') window.promptRegistrationDraftIfNeeded('login'); } catch(e) {}
  }

  async function serverAdminLoginByEmailV561(loginId, password){
    var client = getClient();
    if (!client || !client.auth || typeof client.auth.signInWithPassword !== 'function') {
      throw new Error('SUPABASE_AUTH_CLIENT_UNAVAILABLE');
    }

    var normalizedLoginId = text(loginId).toLowerCase();
    if (normalizedLoginId !== SUPER_ADMIN_LOGIN_ID) {
      throw new Error('SUPER_ADMIN_ID_MISMATCH');
    }

    var authResult = await client.auth.signInWithPassword({
      email: normalizedLoginId,
      password: String(password || '')
    });

    if (authResult && authResult.error) {
      var authError = new Error(text(authResult.error.message) || 'INVALID_LOGIN_CREDENTIALS');
      authError.code = text(authResult.error.code) || 'INVALID_LOGIN_CREDENTIALS';
      throw authError;
    }

    var user = authResult && authResult.data && authResult.data.user;
    if (!user || !user.id) throw new Error('AUTH_SESSION_NOT_CREATED');

    var profileResult = await client.rpc(PROFILE_RPC);
    if (profileResult && profileResult.error) {
      try { await client.auth.signOut(); } catch(e) {}
      throw profileResult.error;
    }

    var profilePayload = profileResult ? profileResult.data : null;
    var p = profilePayload && profilePayload.member;
    if (!profilePayload || profilePayload.ok !== true || !p) {
      try { await client.auth.signOut(); } catch(e) {}
      throw new Error(text(profilePayload && profilePayload.code) || 'MEMBER_PROFILE_NOT_FOUND');
    }

    var member = {
      id: text(p.member_id),
      memberId: text(p.member_id),
      member_id: text(p.member_id),
      name: text(p.name) || text(p.login_id) || 'SitePass 회원',
      phone: text(p.phone),
      email: text(p.email),
      provider: 'SitePass',
      providerId: text(p.provider_id) || ('SITEPASS-' + text(p.login_id)),
      provider_id: text(p.provider_id),
      signupId: text(p.login_id),
      login_id: text(p.login_id),
      signupMethod: text(p.signup_method) || 'sitepass',
      signup_method: text(p.signup_method) || 'sitepass',
      role: text(p.role) || 'member',
      status: text(p.status) || 'active',
      plan_type: text(p.plan_type) || 'beta',
      plan_label: text(p.plan_label),
      terms_agreed_at: p.terms_agreed_at || null,
      authUserId: text(user.id),
      auth_user_id: text(user.id),
      supabaseAuthUserId: text(user.id),
      serverAuthLogin: true,
      serverAuthLoginAt: new Date().toISOString()
    };

    if (!isVerifiedSuperAdminMemberV561(member, normalizedLoginId)) {
      try { await client.auth.signOut(); } catch(e) {}
      throw new Error('SUPER_ADMIN_PROFILE_MISMATCH');
    }

    removeLegacyLocalPassword(member.signupId, text(user.id));
    return member;
  }

  async function serverLoginById(loginId, password){
    if (text(loginId).toLowerCase() === SUPER_ADMIN_LOGIN_ID) {
      return serverAdminLoginByEmailV561(loginId, password);
    }

    var client = getClient();
    if (!client || !client.functions || typeof client.functions.invoke !== 'function') {
      throw new Error('SUPABASE_FUNCTION_CLIENT_UNAVAILABLE');
    }

    var invoked = await client.functions.invoke(LOGIN_FUNCTION, {
      body: { login_id: loginId, password: password }
    });

    if (invoked && invoked.error) {
      var err = invoked.error;
      var detail = '';
      try {
        if (err.context && typeof err.context.json === 'function') {
          var payload = await err.context.json();
          detail = text(payload && (payload.message || payload.code));
        }
      } catch(e) {}
      var loginErr = new Error(detail || 'INVALID_LOGIN_CREDENTIALS');
      loginErr.code = detail || 'INVALID_LOGIN_CREDENTIALS';
      throw loginErr;
    }

    var result = invoked ? invoked.data : null;
    if (!result || result.ok !== true || !result.session || !result.session.access_token || !result.session.refresh_token) {
      throw new Error('INVALID_LOGIN_CREDENTIALS');
    }

    var sessionResult = await client.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token
    });

    if (sessionResult && sessionResult.error) throw sessionResult.error;
    if (!sessionResult || !sessionResult.data || !sessionResult.data.user) throw new Error('AUTH_SESSION_NOT_CREATED');

    var profileResult = await client.rpc(PROFILE_RPC);
    if (profileResult && profileResult.error) throw profileResult.error;
    var profilePayload = profileResult ? profileResult.data : null;
    if (!profilePayload || profilePayload.ok !== true || !profilePayload.member) {
      try { await client.auth.signOut(); } catch(e) {}
      throw new Error(text(profilePayload && profilePayload.code) || 'MEMBER_PROFILE_NOT_FOUND');
    }

    var p = profilePayload.member;
    var authUid = text(sessionResult.data.user.id);
    var member = {
      id: text(p.member_id),
      memberId: text(p.member_id),
      member_id: text(p.member_id),
      name: text(p.name) || text(p.login_id) || 'SitePass 회원',
      phone: text(p.phone),
      email: text(p.email),
      provider: 'SitePass',
      providerId: text(p.provider_id) || ('SITEPASS-' + text(p.login_id)),
      provider_id: text(p.provider_id),
      signupId: text(p.login_id),
      login_id: text(p.login_id),
      signupMethod: text(p.signup_method) || 'sitepass',
      signup_method: text(p.signup_method) || 'sitepass',
      role: text(p.role) || 'member',
      status: text(p.status) || 'active',
      plan_type: text(p.plan_type) || 'beta',
      plan_label: text(p.plan_label),
      terms_agreed_at: p.terms_agreed_at || null,
      authUserId: authUid,
      auth_user_id: authUid,
      supabaseAuthUserId: authUid,
      serverAuthLogin: true,
      serverAuthLoginAt: new Date().toISOString()
    };

    removeLegacyLocalPassword(member.signupId, authUid);
    return member;
  }

  function isVerifiedSuperAdminMemberV561(member, requestedLoginId){
    if (!member) return false;
    var requested = text(requestedLoginId).toLowerCase();
    var memberLogin = text(member.signupId || member.login_id || member.loginId).toLowerCase();
    var role = text(member.role).toLowerCase();
    var status = text(member.status).toLowerCase();
    var authUid = text(member.authUserId || member.auth_user_id || member.supabaseAuthUserId);
    return requested === SUPER_ADMIN_LOGIN_ID &&
           memberLogin === SUPER_ADMIN_LOGIN_ID &&
           role === 'super_admin' &&
           status === 'active' &&
           !!authUid;
  }

  function clearLocalAdminSessionV561(){
    clearVerifiedAdminGreetingNameV561();
    try {
      if (typeof window.removeSessionValue === 'function' && typeof ADMIN_SESSION_KEY !== 'undefined') {
        window.removeSessionValue(ADMIN_SESSION_KEY);
        window.removeSessionValue(ADMIN_SESSION_KEY + '_role');
        window.removeSessionValue(ADMIN_SESSION_KEY + '_id');
        window.removeSessionValue(ADMIN_SESSION_KEY + '_name');
      } else if (typeof ADMIN_SESSION_KEY !== 'undefined') {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        sessionStorage.removeItem(ADMIN_SESSION_KEY + '_role');
        sessionStorage.removeItem(ADMIN_SESSION_KEY + '_id');
        sessionStorage.removeItem(ADMIN_SESSION_KEY + '_name');
      }
    } catch(e) {}
    try { if (typeof window.refreshAdminUi === 'function') window.refreshAdminUi(); } catch(e) {}
  }

  async function verifyExistingAdminSessionV561(){
    var locallyAdmin = false;
    try { locallyAdmin = typeof window.isAdminLoggedIn === 'function' && window.isAdminLoggedIn(); } catch(e) {}
    if (!locallyAdmin) return true;

    var client = getClient();
    var authSession = window.SitePassAuthSession || null;
    if (!client || !authSession || typeof authSession.getSession !== 'function') {
      clearLocalAdminSessionV561();
      return false;
    }

    try {
      var sessionResult = await authSession.getSession();
      var user = sessionResult && sessionResult.data && sessionResult.data.session && sessionResult.data.session.user;
      if (!user || !user.id) {
        clearLocalAdminSessionV561();
        return false;
      }

      var profileResult = await client.rpc(PROFILE_RPC);
      var payload = profileResult && profileResult.data;
      var p = payload && payload.member;
      var ok = !profileResult.error && payload && payload.ok === true && p &&
               text(p.login_id).toLowerCase() === SUPER_ADMIN_LOGIN_ID &&
               text(p.role).toLowerCase() === 'super_admin' &&
               text(p.status).toLowerCase() === 'active';
      if (!ok) {
        // 로컬 관리자 세션만 잘못 남은 경우 일반회원 Auth 세션까지 끊지 않습니다.
        clearLocalAdminSessionV561();
        return false;
      }
      var verifiedName = text(p.name) || 'SitePass 최고관리자';
      clearAdminHomeMemberArtifactsV561();
      renderVerifiedAdminGreetingV561(verifiedName);
      try { setTimeout(function(){ renderVerifiedAdminGreetingV561(verifiedName); }, 80); } catch(e) {}
      return true;
    } catch(e) {
      clearLocalAdminSessionV561();
      return false;
    }
  }

  // v561 r13 / 59단계: 일반회원 -> 최고관리자 계정 전환 직후
  // 이전 회원의 홈 장비/만료 표시가 한 프레임이라도 남지 않도록
  // 서버에서 super_admin 권한이 확인된 순간 DOM을 먼저 비웁니다.
  function clearAdminHomeMemberArtifactsV561(){
    try {
      var box = document.getElementById('sitepassAppRecentEquipment');
      if (box) {
        box.dataset.sitepassRecentSignatureV520 = 'verified-admin-no-member-equipment';
        box.innerHTML = '<div class="sitepass-recent-empty"><b>최고관리자 계정에는 회원 장비를 표시하지 않습니다.</b><br>회원 소유 장비와 브라우저에 남은 장비 캐시는 관리자 홈에서 분리됩니다.</div>';
      }
    } catch(e) {}
    try {
      var expiry = document.getElementById('sitepassHomeExpiryCount465');
      if (expiry) {
        expiry.textContent = '0';
        expiry.classList.add('hidden');
        expiry.setAttribute('aria-label', '읽지 않은 만료 알림 0건');
        expiry.title = '읽지 않은 만료 알림 0건';
      }
    } catch(e) {}
  }

  function completeServerSuperAdminLoginV561(member){
    if (!isVerifiedSuperAdminMemberV561(member, SUPER_ADMIN_LOGIN_ID)) return false;
    clearAdminHomeMemberArtifactsV561();
    renderVerifiedAdminGreetingV561(text(member && member.name) || 'SitePass 최고관리자');
    var memberStore =
      window.SitePassMemberProfileStore ||
      null;

    if (
      memberStore &&
      typeof memberStore.replaceServerProfile ===
        'function'
    ) {
      memberStore.replaceServerProfile(
        member
      );
    }

    try {
      if (typeof window.setCurrentMemberTest === 'function') {
        window.setCurrentMemberTest(member);
      } else {
        sessionStorage.setItem(
          'sitePass_v23_7_7_update_original_corrected_currentMember',
          JSON.stringify(member)
        );
      }
    } catch(e) {}
    adminAuthVerifiedV561 = true;
    try {
      if (typeof window.completeSuperAdminLogin !== 'function') throw new Error('ADMIN_LOGIN_COMPLETION_UNAVAILABLE');
      return window.completeSuperAdminLogin();
    } finally {
      adminAuthVerifiedV561 = false;
    }
  }

  async function secureAdminLoginByIdV561(){
    var idInput = document.getElementById('adminIdInput') || document.getElementById('sitepassLoginIdentifier');
    var pwInput = document.getElementById('adminPwInput') || document.getElementById('sitepassLoginPassword');
    var loginId = text(idInput && idInput.value);
    var password = String((pwInput && pwInput.value) || '');

    if (!loginId) { alert('관리자 아이디를 입력해주세요.'); try { idInput && idInput.focus(); } catch(e) {} return false; }
    if (!password) { alert('비밀번호를 입력해주세요.'); try { pwInput && pwInput.focus(); } catch(e) {} return false; }
    if (loginId.toLowerCase() !== SUPER_ADMIN_LOGIN_ID) {
      alert('현재 관리자 Auth 로그인은 지정 최고관리자 계정만 허용됩니다.');
      return false;
    }

    setLoginBusy(true);
    try {
      var member = await serverAdminLoginByEmailV561(loginId, password);
      if (!isVerifiedSuperAdminMemberV561(member, loginId)) {
        var client = getClient();
        try { if (client && client.auth) await client.auth.signOut(); } catch(ignore) {}
        alert('최고관리자 권한을 확인할 수 없습니다.');
        return false;
      }
      completeServerSuperAdminLoginV561(member);
      var verifiedAdminName = text(member && member.name) || 'SitePass 최고관리자';
      renderVerifiedAdminGreetingV561(verifiedAdminName);
      try { setTimeout(function(){ renderVerifiedAdminGreetingV561(verifiedAdminName); }, 80); } catch(e) {}
      try { setTimeout(function(){ renderVerifiedAdminGreetingV561(verifiedAdminName); }, 250); } catch(e) {}
      alert('최고관리자 로그인이 완료되었습니다.');
      return true;
    } catch(e) {
      console.warn('[SitePass v561] secure admin login failed', e && (e.code || e.message || e));
      alert('관리자 아이디 또는 비밀번호를 확인해주세요.');
      try { pwInput && pwInput.focus(); } catch(ignore) {}
      return false;
    } finally {
      setLoginBusy(false);
    }
  }


  // v561 r4 / 59단계 추가강화
  // 내정보 진입 시 현재 비밀번호를 로컬 testPassword가 아니라
  // 서버 로그인 경로(sitepass-login-by-id)로 다시 검증합니다.
  // 검증용으로 발급된 세션 토큰은 현재 브라우저 세션에 적용하거나 저장하지 않습니다.
  async function verifyCurrentPasswordServerV561(loginId, password){
    loginId = text(loginId);
    password = String(password || '');
    if (!loginId || !password) {
      return { ok: false, code: 'INVALID_LOGIN_CREDENTIALS' };
    }

    // 최고관리자는 일반회원 아이디 변환용 Edge Function을 거치지 않고
    // 실제 Supabase Auth 이메일/비밀번호로 재검증합니다.
    if (loginId.toLowerCase() === SUPER_ADMIN_LOGIN_ID) {
      try {
        await serverAdminLoginByEmailV561(loginId, password);
        return { ok: true, code: 'OK' };
      } catch(adminVerifyError) {
        var adminVerifyText = String((adminVerifyError && (adminVerifyError.code || adminVerifyError.message)) || '').toUpperCase();
        if (adminVerifyText.indexOf('INVALID') >= 0 ||
            adminVerifyText.indexOf('CREDENTIAL') >= 0 ||
            adminVerifyText.indexOf('PASSWORD') >= 0 ||
            adminVerifyText.indexOf('AUTH') >= 0) {
          return { ok: false, code: 'INVALID_LOGIN_CREDENTIALS' };
        }
        throw adminVerifyError;
      }
    }

    var client = getClient();
    if (!client || !client.functions || typeof client.functions.invoke !== 'function') {
      throw new Error('SUPABASE_FUNCTION_CLIENT_UNAVAILABLE');
    }

    var invoked = await client.functions.invoke(LOGIN_FUNCTION, {
      body: { login_id: loginId, password: password }
    });

    if (invoked && invoked.error) {
      var err = invoked.error;
      var detail = '';
      var httpStatus = 0;

      try {
        if (err.context && typeof err.context.status !== 'undefined') {
          httpStatus = Number(err.context.status) || 0;
        }
      } catch(e) {}

      // Supabase FunctionsHttpError의 Response body는 SDK/브라우저 상태에 따라
      // 이미 소비되어 json()을 바로 읽지 못할 수 있으므로 clone()을 우선 사용합니다.
      try {
        if (err.context && typeof err.context.clone === 'function') {
          var clonedResponse = err.context.clone();
          if (clonedResponse && typeof clonedResponse.json === 'function') {
            var clonedPayload = await clonedResponse.json();
            detail = text(clonedPayload && (clonedPayload.message || clonedPayload.code || clonedPayload.error));
          }
        } else if (err.context && typeof err.context.json === 'function') {
          var payload = await err.context.json();
          detail = text(payload && (payload.message || payload.code || payload.error));
        }
      } catch(e) {}

      var normalized = String(detail || err.message || '').toUpperCase();

      // sitepass-login-by-id의 잘못된 아이디/비밀번호 응답은 non-2xx(400/401)로
      // 반환될 수 있습니다. 이 경우는 서버 장애가 아니라 인증 실패로 처리합니다.
      if (httpStatus === 400 || httpStatus === 401 ||
          normalized.indexOf('INVALID_LOGIN_CREDENTIALS') >= 0 ||
          normalized.indexOf('INVALID CREDENTIAL') >= 0 ||
          normalized.indexOf('INVALID_LOGIN') >= 0) {
        return { ok: false, code: 'INVALID_LOGIN_CREDENTIALS' };
      }

      // 403/5xx/네트워크 오류 등은 실제 서버/권한 문제로 남겨
      // 내정보 화면에서 서버 연결 실패 안내를 유지합니다.
      throw new Error(detail || err.message || 'PASSWORD_VERIFY_FAILED');
    }

    var result = invoked ? invoked.data : null;
    var ok = !!(result && result.ok === true && result.session && result.session.access_token && result.session.refresh_token);
    return { ok: ok, code: ok ? 'OK' : 'INVALID_LOGIN_CREDENTIALS' };
  }

  window.sitePassVerifyCurrentPasswordV561 = verifyCurrentPasswordServerV561;

  async function submitSitePassLoginServerV555(){
    var loginInput = document.getElementById('sitepassLoginIdentifier');
    var pwInput = document.getElementById('sitepassLoginPassword');
    var loginId = text(loginInput && loginInput.value);
    var password = String((pwInput && pwInput.value) || '');

    if (!loginId) {
      alert('사용자 아이디를 입력해주세요.');
      try { loginInput && loginInput.focus(); } catch(e) {}
      return false;
    }
    if (!password) {
      alert('비밀번호를 입력해주세요.');
      try { pwInput && pwInput.focus(); } catch(e) {}
      return false;
    }

    setLoginBusy(true);
    try {
      var member = await serverLoginById(loginId, password);
      if (isVerifiedSuperAdminMemberV561(member, loginId)) {
        completeServerSuperAdminLoginV561(member);
        alert('최고관리자 로그인이 완료되었습니다.');
        return true;
      }
      if (text(member && member.role).toLowerCase() === 'super_admin') {
        var adminClient = getClient();
        try { if (adminClient && adminClient.auth) await adminClient.auth.signOut(); } catch(ignore) {}
        throw new Error('SUPER_ADMIN_ID_MISMATCH');
      }
      completeServerMemberLogin(member);
      return true;
    } catch(e) {
      console.warn('[SitePass v555] server login failed', e && (e.code || e.message || e));
      genericLoginError('아이디 또는 비밀번호를 확인해주세요.');
      try { pwInput && pwInput.focus(); } catch(ignore) {}
      return false;
    } finally {
      setLoginBusy(false);
    }
  }

  // 구형 서버회원 공개조회/로컬 testPassword 로그인 래퍼보다 마지막에 덮어씁니다.
  window.__sitepassGeneralServerAuthV555 = true;
  window.__sitepassLogin460Wrapped = true;
  window.submitSitePassLoginTest = submitSitePassLoginServerV555;

  // v561 r6 / 59단계 추가강화
  // 최고관리자는 고정 비밀번호가 아니라 Supabase Auth 로그인 + 현재 회원 profile의
  // login_id/sitepass role/status를 모두 확인한 뒤에만 관리자 세션을 엽니다.
  window.isSuperAdminLoginId = function(loginId){
    return text(loginId).toLowerCase() === SUPER_ADMIN_LOGIN_ID;
  };
  window.getLocalAdminRoleForLogin = function(){ return ''; };
  window.getMappedAdminRoleForLogin = function(){ return ''; };
  window.completeSuperAdminLogin = function(){
    if (!adminAuthVerifiedV561) {
      alert('최고관리자 서버 인증이 필요합니다.');
      return false;
    }
    if (typeof window.completeAdminLogin !== 'function') {
      alert('관리자 화면을 열 수 없습니다. 다시 로그인해주세요.');
      return false;
    }
    window.completeAdminLogin('최고관리자', SUPER_ADMIN_LOGIN_ID, 'SitePass 최고관리자');
    return true;
  };
  window.adminLogin = secureAdminLoginByIdV561;
  window.sitePassVerifyExistingAdminSessionV561 = verifyExistingAdminSessionV561;

  // 로컬 관리자 세션만 남고 Supabase Auth 세션/권한이 사라진 경우 자동으로 관리자 상태를 해제합니다.
  setTimeout(function(){ verifyExistingAdminSessionV561(); }, 0);
  window.addEventListener('pageshow', function(){ setTimeout(function(){ verifyExistingAdminSessionV561(); }, 30); });

  // v686 / 73단계: 다른 탭에서 Supabase SIGNED_OUT이 전파된 경우
  // 이 탭에 남아 있는 로컬 관리자 세션과 관리자 화면을 즉시 정리합니다.
  // 서버 권한은 DB session gate가 별도로 차단하며, 여기서는 UI/로컬 상태만 정리합니다.
  (function bindAdminSignedOutSyncV686(){
    var authSession = window.SitePassAuthSession || null;
    if (!authSession || typeof authSession.subscribe !== 'function') return;
    if (window.__sitepassAdminSignedOutSyncBoundV686) return;

    window.__sitepassAdminSignedOutSyncBoundV686 = true;

    authSession.subscribe(function(event){
      if (event !== 'SIGNED_OUT') return;

      var wasLocalAdmin = false;
      try {
        wasLocalAdmin =
          typeof window.isAdminLoggedIn === 'function' &&
          window.isAdminLoggedIn();
      } catch(e) {}

      if (!wasLocalAdmin) return;

      clearLocalAdminSessionV561();

      try {
        sessionStorage.removeItem('sitepass_last_screen_v491');
      } catch(e) {}

      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState(
            { sitepassScreen: 'signupScreen' },
            document.title || 'SitePass',
            window.location.pathname + window.location.search
          );
        }
      } catch(e) {}

      try {
        if (typeof window.showScreen === 'function') {
          window.showScreen('signupScreen');
        } else if (typeof showScreen === 'function') {
          showScreen('signupScreen');
        }
      } catch(e) {}

      try {
        setTimeout(function(){
          try {
            if (typeof window.backToSitePassFirstLanding === 'function') {
              window.backToSitePassFirstLanding();
            }
          } catch(e) {}
        }, 40);
      } catch(e) {}
    });
  })();

  // STEP87 보완:
  // 관리자 로그아웃도 회원 로그아웃과 동일하게 Supabase Auth signOut 성공 +
  // 브라우저 Auth 세션 제거 확인 후에만 기존 로컬 관리자 로그아웃/UI 정리를 실행합니다.
  // 네트워크/signOut 실패 시 화면만 로그아웃되고 Auth 세션이 남는 상태를 fail-closed 처리합니다.
  if (typeof window.adminLogout === 'function' && !window.__sitepassAdminLogoutAuthWrappedV561) {
    window.__sitepassAdminLogoutAuthWrappedV561 = true;
    var previousAdminLogout = window.adminLogout;
    var adminLogoutPendingV725 = null;

    window.adminLogout = function(){
      var logoutThis = this;
      var logoutArgs = arguments;

      if (adminLogoutPendingV725) {
        return adminLogoutPendingV725;
      }

      adminLogoutPendingV725 = (async function(){
        var client = null;

        try {
          client = getClient();
        } catch(e) {
          client = null;
        }

        if (
          !client ||
          !client.auth ||
          typeof client.auth.signOut !== 'function'
        ) {
          console.error('[SitePass v725] admin auth signOut unavailable');
          try {
            alert('관리자 로그아웃 서버 연결을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
          } catch(e) {}
          return false;
        }

        var signOutResult = null;

        try {
          signOutResult = await client.auth.signOut({ scope: 'local' });
        } catch(e) {
          console.error('[SitePass v725] admin auth signOut failed', e);
          try {
            alert('관리자 서버 로그아웃이 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
          } catch(ignore) {}
          return false;
        }

        if (signOutResult && signOutResult.error) {
          console.error(
            '[SitePass v725] admin auth signOut returned error',
            signOutResult.error
          );
          try {
            alert('관리자 서버 로그아웃이 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
          } catch(e) {}
          return false;
        }

        if (typeof client.auth.getSession === 'function') {
          try {
            var verifyResult = await client.auth.getSession();

            if (verifyResult && verifyResult.error) {
              console.error(
                '[SitePass v725] admin logout session verification failed',
                verifyResult.error
              );
              try {
                alert('관리자 로그아웃 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
              } catch(e) {}
              return false;
            }

            if (
              verifyResult &&
              verifyResult.data &&
              verifyResult.data.session
            ) {
              console.error(
                '[SitePass v725] admin logout blocked: auth session still active'
              );
              try {
                alert('관리자 서버 로그인 세션이 아직 종료되지 않았습니다. 잠시 후 다시 시도해주세요.');
              } catch(e) {}
              return false;
            }
          } catch(e) {
            console.error(
              '[SitePass v725] admin logout session verification exception',
              e
            );
            try {
              alert('관리자 로그아웃 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
            } catch(ignore) {}
            return false;
          }
        }

        // STEP87 v725:
        // 서버 signOut 성공 + 세션 제거 확인 뒤에만 관리자 전용 브라우저 메모리/DOM을 폐기합니다.
        // 기존 Runtime setter / 문의 destroy()만 사용하며 DB/RPC/RLS/Storage는 변경하지 않습니다.
        try {
          var adminRuntimeV725 = window.SitePassAdminRuntime || null;

          if (adminRuntimeV725) {
            if (typeof adminRuntimeV725.setServerMemberRows === 'function') {
              adminRuntimeV725.setServerMemberRows([]);
            }
            if (typeof adminRuntimeV725.setExpandedMemberId === 'function') {
              adminRuntimeV725.setExpandedMemberId('');
            }
            if (typeof adminRuntimeV725.setMemberSearchText === 'function') {
              adminRuntimeV725.setMemberSearchText('');
            }
            if (typeof adminRuntimeV725.setMemberSearchComposing === 'function') {
              adminRuntimeV725.setMemberSearchComposing(false);
            }
            if (typeof adminRuntimeV725.setMemberFolder === 'function') {
              adminRuntimeV725.setMemberFolder('all');
            }
            if (typeof adminRuntimeV725.setMemberPage === 'function') {
              adminRuntimeV725.setMemberPage(0);
            }
          }
        } catch(e) {
          console.warn('[SitePass v725] admin member runtime clear failed', e);
        }

        try {
          if (
            window.SitePassAdminInquiryV675 &&
            typeof window.SitePassAdminInquiryV675.destroy === 'function'
          ) {
            window.SitePassAdminInquiryV675.destroy();
          }
        } catch(e) {
          console.warn('[SitePass v725] admin inquiry runtime clear failed', e);
        }

        try {
          var adminBoxV725 = document.getElementById('adminBox');
          if (adminBoxV725) {
            adminBoxV725.innerHTML = '';
          }
        } catch(e) {
          console.warn('[SitePass v725] admin DOM clear failed', e);
        }

        clearVerifiedAdminGreetingNameV561();

        var result =
          previousAdminLogout.apply(
            logoutThis,
            logoutArgs
          );

        try {
          setTimeout(
            function(){
              refreshHomeGreetingV561(null);
            },
            0
          );
        } catch(e) {}

        return result;
      })();

      adminLogoutPendingV725.finally(function(){
        adminLogoutPendingV725 = null;
      });

      return adminLogoutPendingV725;
    };
  }

  // v23 / STEP81 후속보완:
  // 회원 로그아웃은 Supabase Auth signOut 성공 + 로컬 세션 제거 확인 후에만
  // 기존 로컬 memberLogout/UI 정리를 실행합니다.
  // 화면만 로그아웃되고 서버 Auth 세션이 남는 경계를 fail-closed 처리합니다.
  if (typeof window.memberLogout === 'function' && !window.__sitepassMemberLogoutAuthWrappedV555) {
    window.__sitepassMemberLogoutAuthWrappedV555 = true;
    var previousLogout = window.memberLogout;
    var memberLogoutPendingV23 = null;

    window.memberLogout = function(){
      var logoutThis = this;
      var logoutArgs = arguments;

      if (memberLogoutPendingV23) {
        return memberLogoutPendingV23;
      }

      memberLogoutPendingV23 = (async function(){
        var client = null;

        try {
          client = getClient();
        } catch(e) {
          client = null;
        }

        if (
          !client ||
          !client.auth ||
          typeof client.auth.signOut !== 'function'
        ) {
          console.error('[SitePass v23] member auth signOut unavailable');
          try {
            alert('로그아웃 서버 연결을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
          } catch(e) {}
          return false;
        }

        var signOutResult = null;

        try {
          signOutResult = await client.auth.signOut({ scope: 'local' });
        } catch(e) {
          console.error('[SitePass v23] member auth signOut failed', e);
          try {
            alert('서버 로그아웃이 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
          } catch(ignore) {}
          return false;
        }

        if (signOutResult && signOutResult.error) {
          console.error(
            '[SitePass v23] member auth signOut returned error',
            signOutResult.error
          );
          try {
            alert('서버 로그아웃이 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
          } catch(e) {}
          return false;
        }

        // signOut 성공 응답 뒤에도 브라우저 Auth 세션이 남아 있으면
        // 로컬 UI만 로그아웃하지 않습니다.
        if (typeof client.auth.getSession === 'function') {
          try {
            var verifyResult = await client.auth.getSession();

            if (verifyResult && verifyResult.error) {
              console.error(
                '[SitePass v23] member logout session verification failed',
                verifyResult.error
              );
              try {
                alert('로그아웃 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
              } catch(e) {}
              return false;
            }

            if (
              verifyResult &&
              verifyResult.data &&
              verifyResult.data.session
            ) {
              console.error(
                '[SitePass v23] member logout blocked: auth session still active'
              );
              try {
                alert('서버 로그인 세션이 아직 종료되지 않았습니다. 잠시 후 다시 시도해주세요.');
              } catch(e) {}
              return false;
            }
          } catch(e) {
            console.error(
              '[SitePass v23] member logout session verification exception',
              e
            );
            try {
              alert('로그아웃 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
            } catch(ignore) {}
            return false;
          }
        }

        var result =
          previousLogout.apply(
            logoutThis,
            logoutArgs
          );

        try {
          if (
            window.SitePassAuthEvents &&
            typeof window.SitePassAuthEvents.emitSignedOut ===
              'function'
          ) {
            window.SitePassAuthEvents.emitSignedOut(
              'auth-general-server-v555'
            );
          }
        } catch(e) {}

        try {
          setTimeout(
            function(){
              refreshHomeGreetingV561(null);
            },
            0
          );
        } catch(e) {}

        return result;
      })();

      memberLogoutPendingV23.finally(function(){
        memberLogoutPendingV23 = null;
      });

      return memberLogoutPendingV23;
    };
  }

  // defer 스크립트 로딩/자동로그인 복구 뒤에도 현재 세션 이름으로 한 번 더 맞춥니다.
  setTimeout(function(){ refreshHomeGreetingV561(null); }, 150);
  window.addEventListener('pageshow', function(){ setTimeout(function(){ refreshHomeGreetingV561(null); }, 160); });

  console.info('[SitePass v555] general login uses Edge Function + Supabase Auth session');
})();
