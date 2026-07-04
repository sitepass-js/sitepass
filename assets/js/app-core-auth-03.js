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

