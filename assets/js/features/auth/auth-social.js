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

    const SITEPASS_NATIVE_KAKAO_OAUTH_REDIRECT = 'com.sitepass.app://oauth/callback';

    function isSitePassAndroidNative() {
      try {
        const cap = window.Capacitor;
        if (!cap) return false;
        if (typeof cap.getPlatform === 'function') return cap.getPlatform() === 'android';
        if (typeof cap.isNativePlatform === 'function') {
          return !!cap.isNativePlatform() && /android/i.test(navigator.userAgent || '');
        }
      } catch (e) {}
      return false;
    }

    function getKakaoOAuthRedirectUrl() {
      return isSitePassAndroidNative()
        ? SITEPASS_NATIVE_KAKAO_OAUTH_REDIRECT
        : getOAuthRedirectUrl();
    }

    function routeSitePassNativeKakaoOAuthReturn(rawUrl) {
      try {
        if (!rawUrl) return false;
        const incoming = new URL(String(rawUrl));
        if (
          incoming.protocol !== 'com.sitepass.app:' ||
          incoming.hostname !== 'oauth' ||
          incoming.pathname !== '/callback'
        ) return false;

        const webReturn = new URL(getOAuthRedirectUrl());
        webReturn.search = incoming.search || '';
        webReturn.hash = incoming.hash || '';
        window.location.replace(webReturn.toString());
        return true;
      } catch (e) {
        console.error('[SitePass Kakao Native OAuth Return]', e);
        return false;
      }
    }

    function bindSitePassNativeKakaoOAuthReturn() {
      try {
        if (!isSitePassAndroidNative()) return false;
        if (window.__sitepassKakaoNativeOAuthBound) return true;

        const App =
          window.Capacitor &&
          window.Capacitor.Plugins &&
          window.Capacitor.Plugins.App;

        if (!App || typeof App.addListener !== 'function') return false;

        window.__sitepassKakaoNativeOAuthBound = true;

        App.addListener('appUrlOpen', function(event) {
          routeSitePassNativeKakaoOAuthReturn(event && event.url ? event.url : '');
        });

        if (typeof App.getLaunchUrl === 'function') {
          Promise.resolve(App.getLaunchUrl())
            .then(function(result) {
              if (result && result.url) routeSitePassNativeKakaoOAuthReturn(result.url);
            })
            .catch(function(error) {
              console.warn('[SitePass Kakao getLaunchUrl]', error);
            });
        }

        return true;
      } catch (e) {
        window.__sitepassKakaoNativeOAuthBound = false;
        console.error('[SitePass Kakao Native OAuth Bind]', e);
        return false;
      }
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
          redirectTo:getKakaoOAuthRedirectUrl(),
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

    let sitePassKakaoNativeLoginBusy = false;

    function getSitePassKakaoNativePlugin() {
      try {
        return window.Capacitor && window.Capacitor.Plugins
          ? window.Capacitor.Plugins.SitePassKakaoNative || null
          : null;
      } catch (e) {
        return null;
      }
    }

    async function startSitePassKakaoLogin(mode) {
      if (!isSitePassAndroidNative()) {
        return startSupabaseKakaoOAuth(mode);
      }

      if (sitePassKakaoNativeLoginBusy) return false;
      sitePassKakaoNativeLoginBusy = true;

      try {
        const nativePlugin = getSitePassKakaoNativePlugin();
        if (!nativePlugin || typeof nativePlugin.loginWithKakaoTalk !== 'function') {
          return await startSupabaseKakaoOAuth(mode);
        }

        if (
          !window.sitepassSupabase ||
          !window.sitepassSupabase.auth ||
          typeof window.sitepassSupabase.auth.signInWithIdToken !== 'function'
        ) {
          return await startSupabaseKakaoOAuth(mode);
        }

        await signOutSupabaseAuthQuietly();

        setSessionValue(getSitePassOAuthPendingKey(), JSON.stringify({
          provider:'kakao',
          mode:mode || 'login',
          startedAt:new Date().toISOString(),
          officialLoginFirst:true,
          nativeKakaoTalk:true
        }));

        let nativeResult = null;
        try {
          nativeResult = await nativePlugin.loginWithKakaoTalk();
        } catch (nativeError) {
          console.warn('[SitePass Kakao Native] native start failed; using Web OAuth fallback');
          removeSessionValue(getSitePassOAuthPendingKey());
          return await startSupabaseKakaoOAuth(mode);
        }

        const nativeStatus = String(nativeResult && nativeResult.status || '').trim().toLowerCase();

        if (nativeStatus === 'cancelled') {
          removeSessionValue(getSitePassOAuthPendingKey());
          return false;
        }

        if (nativeStatus !== 'success' || !nativeResult || !nativeResult.idToken) {
          removeSessionValue(getSitePassOAuthPendingKey());
          return await startSupabaseKakaoOAuth(mode);
        }

        const nativeAuth = await window.sitepassSupabase.auth.signInWithIdToken({
          provider:'kakao',
          token:String(nativeResult.idToken)
        });

        if (nativeAuth && nativeAuth.error) {
          console.warn('[SitePass Kakao Native] Supabase ID-token sign-in failed; using Web OAuth fallback');
          removeSessionValue(getSitePassOAuthPendingKey());
          await signOutSupabaseAuthQuietly();
          return await startSupabaseKakaoOAuth(mode);
        }

        const handled = await handleSupabaseKakaoOAuthReturn();
        if (handled !== true) {
          removeSessionValue(getSitePassOAuthPendingKey());
          await signOutSupabaseAuthQuietly();
          return await startSupabaseKakaoOAuth(mode);
        }

        return true;
      } catch (e) {
        console.warn('[SitePass Kakao Native] unexpected error; using Web OAuth fallback');
        try { removeSessionValue(getSitePassOAuthPendingKey()); } catch (ignore) {}
        try { await signOutSupabaseAuthQuietly(); } catch (ignore) {}
        return await startSupabaseKakaoOAuth(mode);
      } finally {
        sitePassKakaoNativeLoginBusy = false;
      }
    }
    function handleKakaoLogin() {
      startSitePassKakaoLogin('login');
    }

    function handleNaverLogin() {
      startSupabaseNaverOAuth('login');
    }

    function handleNaverSignup() {
      startSupabaseNaverOAuth('signup');
    }

    function handleKakaoSignup() {
      startSitePassKakaoLogin('signup');
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

    // v23.7.554: 소셜 로그인/가입은 현재 Supabase Auth 세션의 auth.uid()만 신뢰하고,
    // SitePass 신규 RPC를 통해 가입상태 확인 -> 최초 1회 약관 -> 회원 생성 순서로 처리합니다.
    async function callCurrentSocialRpcV554(functionName, args, timeoutMs) {
      if (!window.sitepassSupabase || typeof window.sitepassSupabase.rpc !== 'function') {
        throw new Error('SUPABASE_RPC_UNAVAILABLE');
      }
      const result = await sitePassOAuthWithTimeout(
        window.sitepassSupabase.rpc(functionName, args || {}),
        timeoutMs || 12000,
        functionName
      );
      if (result && result.error) {
        throw new Error(result.error.message || (functionName + ' 호출 실패'));
      }
      return result ? result.data : null;
    }

    async function getCurrentSocialSignupStateV554() {
      return callCurrentSocialRpcV554('sitepass_get_current_social_signup_state', {}, 12000);
    }

    async function recordCurrentSocialTermsConsentV554(agreements) {
      const a = agreements || {};
      return callCurrentSocialRpcV554('sitepass_record_current_social_terms_consent', {
        p_terms_agreed: !!(a.service && a.responsibility),
        p_privacy_agreed: !!a.privacy,
        p_document_share_agreed: !!(a.documentShare || a.documentStorage),
        p_third_party_document_agreed: !!a.thirdPartyDocumentHandling,
        p_identity_agreed: !!a.identity,
        p_sms_agreed: !!a.sms,
        p_marketing_agreed: !!a.marketing,
        p_email_marketing_agreed: !!a.emailMarketing,
        p_sms_marketing_agreed: !!a.smsMarketing
      }, 12000);
    }

    async function completeCurrentSocialSignupV554() {
      return callCurrentSocialRpcV554('sitepass_complete_current_social_signup', {}, 12000);
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
        const authSessionCore = window.SitePassAuthSession;
        if (!authSessionCore || typeof authSessionCore.getSession !== 'function') {
          alert('로그인 세션 확인 모듈을 찾지 못했습니다.');
          return false;
        }
        const { data, error } = await sitePassOAuthWithTimeout(authSessionCore.getSession(), 8000, 'OAuth 세션 확인');
        if (error) {
          alert('소셜 로그인 확인 중 오류가 났습니다.\n' + (error.message || ''));
          return false;
        }
        let user = sessionData?.session?.user || data?.session?.user;
        if (!user && authSessionCore && typeof authSessionCore.getUser === 'function') {
          try {
            const userResult = await sitePassOAuthWithTimeout(authSessionCore.getUser(), 8000, 'OAuth 사용자 확인');
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

        // v23.7.554: 과거 공개 upsert/sync/자동 재활성화 경로는 사용하지 않습니다.
        // 현재 Auth 세션의 가입상태를 서버가 직접 판정합니다.
        const signupState = await getCurrentSocialSignupStateV554();
        if (!signupState || signupState.ok !== true) {
          const stateCode = signupState?.code || 'SOCIAL_SIGNUP_STATE_FAILED';
          throw new Error(stateCode);
        }

        // 탈퇴한 소셜 계정은 로그인만으로 자동 복구하지 않습니다.
        if (
          signupState.reactivation_blocked === true ||
          signupState.rejoin_required === true ||
          String(signupState.member_status || '').toLowerCase() === 'withdrawn'
        ) {
          removeSessionValue(getSitePassOAuthPendingKey());
          try { history.replaceState({}, document.title, location.origin + location.pathname); } catch (ignore) {}
          await signOutSupabaseAuthQuietly();
          alert('탈퇴 처리된 SitePass 계정입니다.\n로그인만으로 계정을 자동 복구하지 않습니다.\n재가입 절차는 별도로 진행해주세요.');
          showScreen('signupScreen', { replace:true });
          return true;
        }

        const needsNewSignup = signupState.signup_required === true || signupState.member_exists === false;
        let socialAgreements = null;
        let signupResult = null;

        if (needsNewSignup) {
          // 최초 1회만 SitePass 약관을 보여주고, 별도 회원가입 화면으로 보내지 않습니다.
          try { document.body.classList.remove('sitepass-booting'); } catch (ignore) {}
          socialAgreements = await showSocialSignupTermsModal(providerLabel);

          if (!socialAgreements) {
            removeSessionValue(getSitePassOAuthPendingKey());
            removeSessionValue(CURRENT_MEMBER_KEY);
            clearPwaAutoMemberTest();
            try { history.replaceState({}, document.title, location.origin + location.pathname); } catch (ignore) {}
            await signOutSupabaseAuthQuietly();
            alert('SitePass 필수 약관에 동의하지 않아 가입을 취소했습니다.');
            showScreen('signupScreen', { replace:true });
            return true;
          }

          // 약관 증적은 현재 auth.uid()에만 귀속됩니다.
          await recordCurrentSocialTermsConsentV554(socialAgreements);

          // 약관 확인이 끝난 현재 auth.uid()만 독립 소셜회원으로 생성합니다.
          signupResult = await completeCurrentSocialSignupV554();
          if (!signupResult || signupResult.ok !== true) {
            throw new Error('SOCIAL_SIGNUP_COMPLETE_FAILED');
          }

          member.agreements = socialAgreements;
          member.termsAgreedAt = socialAgreements.agreedAt || new Date().toISOString();
        }

        // 일반회원/다른 소셜계정과 합치지 않고 provider별 독립 로그인 키를 사용합니다.
        const providerPrefix = providerName === 'naver' ? 'NAVER-' : 'KAKAO-';
        const serverLoginId = String(signupResult?.login_id || (providerPrefix + String(member.providerId || '').trim())).trim();
        member.signupId = serverLoginId;
        member.supabaseLoginId = serverLoginId;
        member.login_id = serverLoginId;
        member.auth_user_id = member.authUserId || member.supabaseAuthUserId || member.userId || '';
        member.serverMemberId = signupResult?.member_id || signupState?.member_id || signupState?.member?.member_id || '';
        member.memberId = member.serverMemberId || member.memberId || '';
        member.member_id = member.serverMemberId || member.member_id || '';
        member.memberStatus = 'active';
        member.status = '실사용베타';
        member.plan_type = 'beta';
        member.needsSitePassProfile = false;

        removeSessionValue(getSitePassOAuthPendingKey());
        if (hasSupabaseKakaoReturnParams()) {
          try { history.replaceState({}, document.title, location.origin + location.pathname); } catch (ignore) {}
        }

        // 서버 회원 생성/확정은 위의 auth.uid() 전용 RPC에서 이미 끝났으므로
        // 과거 sitepass_sync_current_user_member / public upsert RPC는 호출하지 않습니다.
        completeMemberLoginTest(
          member,
          needsNewSignup
            ? providerLabel + ' 간편가입과 로그인이 완료되었습니다.\n다음부터는 같은 계정으로 바로 로그인됩니다.'
            : providerLabel + ' 계정으로 로그인되었습니다.'
        );
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



  try {
    bindSitePassNativeKakaoOAuthReturn();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindSitePassNativeKakaoOAuthReturn, { once:true });
    }
    setTimeout(bindSitePassNativeKakaoOAuthReturn, 500);
  } catch (e) {
    console.error('[SitePass Kakao Native OAuth Init]', e);
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
