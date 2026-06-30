// SitePass v23.7.258 split step 6 - 카카오/네이버 소셜 로그인 OAuth 전용 파일
// 이 파일에는 카카오/네이버 OAuth 시작, 복귀 처리, 소셜 회원 변환 기능을 둡니다.
// 주의: app.bundle.js보다 먼저 불러오고, 실제 실행은 app.bundle.js가 로드된 뒤 wrapper를 통해 호출됩니다.
(function(){
  'use strict';

  function getSitePassOAuthPendingKey() {
    try {
      if (typeof STORAGE_KEY !== 'undefined' && STORAGE_KEY) return STORAGE_KEY + '_oauth_pending_v23_7_207';
    } catch (e) {}
    return 'sitePass_v23_7_7_update_original_corrected_oauth_pending_v23_7_207';
  }

    function isNonChromeInternetBrowser() {
      try {
        const ua = navigator.userAgent || '';
        return /SamsungBrowser|Samsung Internet|Edg\/|Edge\/|Whale|OPR\/|NAVER\(inapp|KAKAOTALK|DaumApps/i.test(ua);
      } catch (e) { return false; }
    }

    function showOAuthRedirectHelp(providerLabel, url) {
      try {
        const box = document.getElementById('oauthRedirectHelp');
        if (!box || !url) return;
        box.classList.add('show');
        box.innerHTML = '<b>' + providerLabel + ' 공식 로그인 화면으로 이동 중입니다.</b>' +
          '브라우저가 자동으로 이동하지 않으면 아래 버튼을 한 번 눌러주세요.' +
          '<br><a href="' + String(url).replace(/"/g, '&quot;') + '" target="_self" rel="noopener">' + providerLabel + ' 로그인 화면 열기</a>';
      } catch (e) {}
    }

    function hideOAuthRedirectHelp() {
      try {
        const box = document.getElementById('oauthRedirectHelp');
        if (box) { box.classList.remove('show'); box.innerHTML = ''; }
      } catch (e) {}
    }

    function openOAuthUrlSameTab(url, providerLabel) {
      if (!url) return false;
      showOAuthRedirectHelp(providerLabel || '소셜', url);
      // v23.7.241: 크롬/엣지/삼성인터넷/PC 기본 인터넷 모두 팝업 없이 같은 탭으로 이동합니다.
      try { window.location.href = url; } catch (e) {}
      try { window.location.assign(url); } catch (e) {}
      try { window.open(url, '_self'); } catch (e) {}
      try {
        setTimeout(function(){
          try { window.location.replace(url); } catch (e) {
            try { window.location.href = url; } catch (ignore) {}
          }
        }, isNonChromeInternetBrowser() ? 200 : 450);
      } catch (e) {}
      return true;
    }

    function getOAuthRedirectUrl() {
      try {
        const configured = window.SITEPASS_DB_CONFIG && window.SITEPASS_DB_CONFIG.appUrl;
        if (configured && /^https?:\/\//i.test(configured)) return configured.split('#')[0].split('?')[0];
      } catch (e) {}
      return location.origin + location.pathname;
    }

    function hasSupabaseKakaoReturnParams() {
      const qs = new URLSearchParams(location.search || '');
      const hash = window.location.hash || '';
      return qs.has('code') || qs.has('error') || hash.includes('access_token') || hash.includes('error=');
    }

    async function startSupabaseKakaoOAuth(mode) {
      try {
        hideOAuthRedirectHelp();
        if (!window.sitepassSupabase || !window.sitepassSupabase.auth) {
          alert('Supabase 연결을 찾지 못했습니다. 임시 테스트 로그인으로 진행합니다.');
          submitSocialLoginTest('카카오톡');
          return;
        }
        // v23.7.231: 카카오 공식 로그인 화면을 먼저 띄우고, 돌아온 뒤 SitePass 가입 약관을 표시합니다.
        // SitePass 소셜약관은 카카오 인증 후 돌아온 다음, 신규/재가입자에게만 표시합니다.
        await signOutSupabaseAuthQuietly();
        setSessionValue(getSitePassOAuthPendingKey(), JSON.stringify({
          provider:'kakao',
          mode: mode || 'login',
          startedAt:new Date().toISOString(),
          officialLoginFirst:true
        }));
        const oauthOptions = {
          redirectTo:getOAuthRedirectUrl(),
          queryParams:{ prompt:'login' }
        };
        // v23.7.241: 삼성 인터넷/기본 인터넷 브라우저는 수동 URL 이동이 먹히지 않는 경우가 있어
        // Supabase 기본 리다이렉트 방식도 허용하고, data.url이 오면 같은 탭 이동을 보강합니다.
        oauthOptions.skipBrowserRedirect = true;
        const { data, error } = await window.sitepassSupabase.auth.signInWithOAuth({
          provider:'kakao',
          options:oauthOptions
        });
        if (error) {
          removeSessionValue(getSitePassOAuthPendingKey());
          alert('카카오 로그인 시작에 실패했습니다.\n' + (error.message || 'Supabase/Kakao 설정을 확인해주세요.'));
          return;
        }
        if (data && data.url) {
          openOAuthUrlSameTab(data.url, '카카오');
          return;
        }
        removeSessionValue(getSitePassOAuthPendingKey());
        alert('카카오 인증 주소를 받지 못했습니다. Supabase 카카오 설정을 확인해주세요.');
      } catch (e) {
        removeSessionValue(getSitePassOAuthPendingKey());
        alert('카카오 로그인 연결 중 오류가 났습니다.\n' + (e?.message || 'Supabase Kakao 설정을 확인해주세요.'));
      }
    }

    async function startSupabaseNaverOAuth(mode) {
      try {
        hideOAuthRedirectHelp();
        if (!window.sitepassSupabase || !window.sitepassSupabase.auth) {
          alert('네이버 아이디로 로그인하려면 Supabase 연결과 네이버 OAuth 설정이 먼저 필요합니다.\n테스트 가짜 회원을 만들지 않도록 임시 로그인은 막아두었습니다.');
          return;
        }
        // v23.7.244: Supabase Custom Provider는 custom:naver로 호출합니다. 테스트 가짜 로그인은 만들지 않습니다.
        // 흐름: 네이버 공식 로그인 → SitePass 복귀 → 신규/재가입이면 SitePass 네이버계정 연동 가입 약관 표시.
        await signOutSupabaseAuthQuietly();
        setSessionValue(getSitePassOAuthPendingKey(), JSON.stringify({
          provider:'naver',
          mode: mode || 'login',
          startedAt:new Date().toISOString(),
          officialLoginFirst:true
        }));
        const oauthOptions = {
          redirectTo:getOAuthRedirectUrl(),
          queryParams:{ auth_type:'reauthenticate' }
        };
        oauthOptions.skipBrowserRedirect = true;
        const { data, error } = await window.sitepassSupabase.auth.signInWithOAuth({
          provider:'custom:naver',
          options:oauthOptions
        });
        if (error) {
          removeSessionValue(getSitePassOAuthPendingKey());
          alert('네이버 로그인 시작에 실패했습니다.\n\nSupabase Auth의 custom:naver 제공자 설정이 아직 없거나, 네이버 Developers의 Client ID/Secret/Callback URL 설정이 맞지 않을 수 있습니다.\n\n오류: ' + (error.message || '알 수 없음'));
          return;
        }
        if (data && data.url) {
          openOAuthUrlSameTab(data.url, '네이버');
          return;
        }
        removeSessionValue(getSitePassOAuthPendingKey());
        alert('네이버 인증 주소를 받지 못했습니다. Supabase 네이버 OAuth 설정을 확인해주세요.');
      } catch (e) {
        removeSessionValue(getSitePassOAuthPendingKey());
        alert('네이버 로그인 연결 중 오류가 났습니다.\n' + (e?.message || 'Supabase/Naver 설정을 확인해주세요.'));
      }
    }

    function handleKakaoLogin() {
      startSupabaseKakaoOAuth('login');
    }

    function handleNaverLogin() {
      startSupabaseNaverOAuth('login');
    }

    function handleNaverSignup() {
      startSupabaseNaverOAuth('signup');
    }

    function handleKakaoSignup() {
      startSupabaseKakaoOAuth('signup');
    }


    // v23.7.258: window onclick 연결은 app.bundle.js wrapper에서 처리합니다.

    // v23.7.244 - custom OAuth provider 이름(custom:naver 등)을 SitePass 내부 provider로 정규화합니다.
    function normalizeOAuthProviderFromAuth(value) {
      const raw = String(value || '').trim().toLowerCase();
      if (!raw) return '';
      if (raw.includes('naver') || raw.includes('네이버')) return 'naver';
      if (raw.includes('kakao') || raw.includes('카카오')) return 'kakao';
      return raw.replace(/^custom:/, '');
    }

    function getPrimaryAuthProviderFromUser(user, fallback) {
      const identities = Array.isArray(user?.identities) ? user.identities : [];
      const firstProvider = identities[0]?.provider || identities[0]?.identity_data?.provider || '';
      return normalizeOAuthProviderFromAuth(fallback || firstProvider || user?.app_metadata?.provider || user?.user_metadata?.provider || '');
    }

    function makeMemberFromSupabaseKakaoUser(user, pending) {
      const meta = user?.user_metadata || {};
      const identities = Array.isArray(user?.identities) ? user.identities : [];
      const kakaoIdentity = identities.find(item => item.provider === 'kakao') || identities[0] || {};
      const identityData = kakaoIdentity.identity_data || kakaoIdentity.identityData || {};
      const rawProviderId = kakaoIdentity.provider_id || identityData.provider_id || identityData.sub || kakaoIdentity.id || user?.id || Date.now();
      const providerId = String(rawProviderId || '').trim();
      const nickname = meta.name || meta.full_name || meta.nickname || meta.preferred_username || identityData.name || identityData.nickname || '카카오 사용자';
      return {
        name:nickname,
        phone:'',
        email:user?.email || '',
        supabaseAuthUserId:user?.id || '',
        authUserId:user?.id || '',
        userId:user?.id || '',
        provider:'카카오톡',
        providerId,
        signupId:'',
        supabaseLoginId:'kakao_' + providerId,
        kakaoUserId:providerId,
        signupMethod:'kakao',
        agreements:pending?.mode === 'signup' ? getSignupAgreements() : undefined,
        oauthLinkedAt:new Date().toISOString(),
        needsSitePassProfile:true
      };
    }


    function makeMemberFromSupabaseNaverUser(user, pending) {
      const meta = user?.user_metadata || {};
      const identities = Array.isArray(user?.identities) ? user.identities : [];
      const naverIdentity = identities.find(item => normalizeOAuthProviderFromAuth(item.provider) === 'naver') || identities[0] || {};
      const identityData = naverIdentity.identity_data || naverIdentity.identityData || {};
      const naverResponse = identityData.response || meta.response || {};
      const rawProviderId = naverIdentity.provider_id || identityData.provider_id || identityData.sub || identityData.id || naverResponse.id || naverIdentity.id || user?.id || Date.now();
      const providerId = String(rawProviderId || '').trim();
      const nickname = meta.name || meta.full_name || meta.nickname || meta.preferred_username || identityData.name || identityData.nickname || naverResponse.name || naverResponse.nickname || '네이버 사용자';
      const email = user?.email || meta.email || identityData.email || naverResponse.email || '';
      const phone = meta.mobile || meta.phone || identityData.mobile || identityData.phone || naverResponse.mobile || naverResponse.mobile_e164 || '';
      return {
        name:nickname,
        phone:phone,
        email:email,
        supabaseAuthUserId:user?.id || '',
        authUserId:user?.id || '',
        userId:user?.id || '',
        provider:'네이버',
        providerId,
        signupId:'',
        supabaseLoginId:'naver_' + providerId,
        naverUserId:providerId,
        signupMethod:'naver',
        agreements:pending?.mode === 'signup' ? getSignupAgreements() : undefined,
        oauthLinkedAt:new Date().toISOString(),
        needsSitePassProfile:true
      };
    }



    // v23.7.254: 소셜 가입 약관 모달은 assets/js/terms.js로 분리했습니다.

    // v23.7.248 - 네이버/카카오 OAuth 확인이 오래 걸려도 “로그인 확인 중입니다” 화면에 갇히지 않게 합니다.
    function sitePassOAuthWithTimeout(promise, ms, label) {
      return new Promise(function(resolve, reject) {
        let done = false;
        const timer = setTimeout(function(){
          if (done) return;
          done = true;
          reject(new Error((label || 'OAuth 확인') + ' 시간이 초과되었습니다.'));
        }, ms || 10000);
        Promise.resolve(promise).then(function(value){
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(value);
        }).catch(function(error){
          if (done) return;
          done = true;
          clearTimeout(timer);
          reject(error);
        });
      });
    }

    async function handleSupabaseKakaoOAuthReturn() {
      if (!window.sitepassSupabase || !window.sitepassSupabase.auth) return false;
      let pending = null;
      try { pending = JSON.parse(getSessionValue(getSitePassOAuthPendingKey()) || 'null'); } catch (e) { pending = null; }
      if (!pending && !hasSupabaseKakaoReturnParams()) return false;
      // v23.7.248: 소셜 로그인 복귀 처리 중에도 화면을 막지 않습니다.
      try { document.body.classList.remove('sitepass-booting'); } catch (e) {}
      try {
        let sessionData = null;
        const qs = new URLSearchParams(location.search || '');
        const code = qs.get('code');
        if (code && window.sitepassSupabase.auth.exchangeCodeForSession) {
          try {
            const exchanged = await sitePassOAuthWithTimeout(window.sitepassSupabase.auth.exchangeCodeForSession(code), 12000, 'OAuth code 세션 교환');
            if (exchanged && exchanged.data) sessionData = exchanged.data;
          } catch (exchangeError) {
            console.warn('OAuth code 세션 교환은 이미 처리되었거나 실패했습니다:', exchangeError?.message || exchangeError);
          }
        }
        const { data, error } = await sitePassOAuthWithTimeout(window.sitepassSupabase.auth.getSession(), 8000, 'OAuth 세션 확인');
        if (error) {
          alert('소셜 로그인 확인 중 오류가 났습니다.\n' + (error.message || ''));
          return false;
        }
        let user = sessionData?.session?.user || data?.session?.user;
        if (!user && window.sitepassSupabase.auth.getUser) {
          try {
            const userResult = await sitePassOAuthWithTimeout(window.sitepassSupabase.auth.getUser(), 8000, 'OAuth 사용자 확인');
            user = userResult?.data?.user || null;
          } catch (getUserError) {
            console.warn('OAuth getUser 확인 실패:', getUserError?.message || getUserError);
          }
        }
        if (!user) {
          const qsError = new URLSearchParams(location.search || '').get('error_description') || new URLSearchParams(location.search || '').get('error');
          if (qsError || hasSupabaseKakaoReturnParams()) {
            alert('네이버/카카오 로그인은 완료됐지만 SitePass 세션을 확인하지 못했습니다.\n\nSupabase custom provider 설정의 Client ID/Secret, Callback URL, Userinfo URL을 다시 확인해주세요.\n' + (qsError ? '\n오류: ' + qsError : ''));
            try { history.replaceState({}, document.title, location.origin + location.pathname); } catch (e) {}
            removeSessionValue(getSitePassOAuthPendingKey());
            showScreen('signupScreen');
            return true;
          }
          return false;
        }
        const providerName = getPrimaryAuthProviderFromUser(user, pending?.provider || '');
        const providerLabel = providerName === 'naver' ? '네이버' : '카카오톡';
        const member = providerName === 'naver'
          ? makeMemberFromSupabaseNaverUser(user, pending || { mode:'login' })
          : makeMemberFromSupabaseKakaoUser(user, pending || { mode:'login' });
        if (pending && pending.agreements) {
          member.agreements = pending.agreements;
          member.termsAgreedAt = pending.agreements.agreedAt || new Date().toISOString();
        }

        const withdrawnRecord = findWithdrawnMemberRecord(member);
        const serverStatus = await getSupabaseMemberStatus(member);
        if (withdrawnRecord || serverStatus === 'withdrawn') {
          // v23.7.219 테스트기간: 탈퇴했던 카카오/네이버 계정도 다시 약관동의 후 재가입 테스트가 가능하게 합니다.
          removeWithdrawnMemberRecord(member);
          member.rejoinConfirmedAt = new Date().toISOString();
          member.withdrawn = false;
          member.status = '실사용베타';
          member.memberStatus = 'active';
          member.plan_type = 'beta';
          await reactivateMemberForTestInSupabase(member);
        }

        const existingSocialMemberBeforeSync = findExistingMemberForSocialLogin(member);
        const alreadyActiveServerMember = !!(serverStatus && !isWithdrawnStatusValue(serverStatus));
        const localSocialTermsAgreed = !!(existingSocialMemberBeforeSync && hasLocalSocialTermsAgreement(existingSocialMemberBeforeSync));
        const isExplicitSignup = pending?.mode === 'signup';
        const hasPendingSocialAgreements = !!(pending && pending.agreements && pending.agreements.agreedAt);
        // v23.7.250: 이미 가입/약관동의가 끝난 네이버·카카오 회원이면 휴대폰에서도 약관창을 다시 띄우지 않습니다.
        // 서버 상태가 늦게 잡힐 때는 같은 브라우저의 local 약관동의 기록도 기존회원으로 봅니다.
        const needsServerSignup = hasPendingSocialAgreements || !(alreadyActiveServerMember || localSocialTermsAgreed);
        if (needsServerSignup) {
          let socialAgreements = hasPendingSocialAgreements ? pending.agreements : null;
          if (!socialAgreements) {
            // v23.7.246: 신규 네이버/카카오 회원은 약관창을 보여줘야 하므로
            // 부팅 오버레이(로그인 확인 중입니다)를 먼저 제거합니다.
            document.body.classList.remove('sitepass-booting');
            socialAgreements = await showSocialSignupTermsModal(providerLabel);
          }
          if (!socialAgreements) {
            removeSessionValue(getSitePassOAuthPendingKey());
            removeSessionValue(CURRENT_MEMBER_KEY);
            clearPwaAutoMemberTest();
            if (hasSupabaseKakaoReturnParams()) {
              try { history.replaceState({}, document.title, location.origin + location.pathname); } catch (e) {}
            }
            await signOutSupabaseAuthQuietly();
            alert('약관 동의가 없어 신규가입을 취소했습니다.');
            showScreen('signupScreen');
            return true;
          }
          member.agreements = socialAgreements;
          member.termsAgreedAt = socialAgreements.agreedAt || new Date().toISOString();
          member.signupMethod = providerName === 'naver' ? 'naver' : 'kakao';
        }

        await syncCurrentSupabaseAuthMemberToServer();
        const serverStatusAfterSync = await getSupabaseMemberStatus(member);
        if (serverStatusAfterSync === 'withdrawn') {
          // v23.7.219 테스트기간: 서버에 남은 탈퇴 상태를 active 재가입으로 전환하고 계속 진행합니다.
          await reactivateMemberForTestInSupabase(member);
          member.rejoinConfirmedAt = member.rejoinConfirmedAt || new Date().toISOString();
          member.withdrawn = false;
          member.status = '실사용베타';
          member.memberStatus = 'active';
          member.plan_type = 'beta';
        }

        const existingSocialMember = (alreadyActiveServerMember || localSocialTermsAgreed) ? (existingSocialMemberBeforeSync || findExistingMemberForSocialLogin(member)) : null;
        const loginMember = existingSocialMember ? mergeSocialLoginMember(existingSocialMember, member) : member;
        const savedMember = saveMemberTest(loginMember) || loginMember;
        // v23.7.225: 카카오/네이버 가입 직후 관리자 화면에 바로 보이도록 서버 저장을 한 번 더 기다립니다.
        try { await saveMemberToSupabase(savedMember); } catch (serverSaveError) { console.warn('소셜 회원 서버 저장 재시도 실패:', serverSaveError); }
        removeSessionValue(getSitePassOAuthPendingKey());
        if (hasSupabaseKakaoReturnParams()) {
          try { history.replaceState({}, document.title, location.origin + location.pathname); } catch (e) {}
        }
        completeMemberLoginTest(savedMember, alreadyActiveServerMember
          ? (savedMember.provider || '소셜') + ' 기존 계정으로 로그인되었습니다.\n새 회원가입으로 다시 만들지 않고 기존 계정을 사용합니다.'
          : (savedMember.provider || '소셜') + ' 신규가입이 완료되었습니다.\n다음부터는 같은 계정으로 로그인만 됩니다.');
        return true;
      } catch (e) {
        try { document.body.classList.remove('sitepass-booting'); } catch (ignore) {}
        try { removeSessionValue(getSitePassOAuthPendingKey()); } catch (ignore) {}
        if (hasSupabaseKakaoReturnParams()) {
          try { history.replaceState({}, document.title, location.origin + location.pathname); } catch (ignore) {}
        }
        alert('소셜 로그인 처리 중 오류가 났습니다.\n' + (e?.message || '') + '\n\n다시 네이버 아이디로 계속하기를 눌러 새로 시작해주세요.');
        showScreen('signupScreen', { replace:true });
        return true;
      }
    }



  window.SitePassAuthSocial = {
    isNonChromeInternetBrowser,
    showOAuthRedirectHelp,
    hideOAuthRedirectHelp,
    openOAuthUrlSameTab,
    getOAuthRedirectUrl,
    hasSupabaseKakaoReturnParams,
    startSupabaseKakaoOAuth,
    startSupabaseNaverOAuth,
    handleKakaoLogin,
    handleNaverLogin,
    handleNaverSignup,
    handleKakaoSignup,
    normalizeOAuthProviderFromAuth,
    getPrimaryAuthProviderFromUser,
    makeMemberFromSupabaseKakaoUser,
    makeMemberFromSupabaseNaverUser,
    sitePassOAuthWithTimeout,
    handleSupabaseKakaoOAuthReturn
  };
})();
