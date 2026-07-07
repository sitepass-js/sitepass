// SitePass v23.7.317 - speed optimized medium chunk (app-core-auth-speed 03/04)
// ---- merged from app-core-auth-11.js ----
// SitePass v23.7.317 - app-core-auth finer split (11/19)
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

// ---- merged from app-core-auth-12.js ----
// SitePass v23.7.317 - app-core-auth finer split (12/19)
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

// ---- merged from app-core-auth-13.js ----
// SitePass v23.7.317 - app-core-auth finer split (13/19)
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

// ---- merged from app-core-auth-14.js ----
// SitePass v23.7.317 - app-core-auth finer split (14/19)
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

// ---- merged from app-core-auth-15.js ----
// SitePass v23.7.317 - app-core-auth finer split (15/19)
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

// v23.7.317: 뒤쪽 청크에서 정의되는 로그인/가입 함수를 안전 래퍼의 실제 구현으로 다시 연결합니다.
try {
  if (typeof submitSocialLoginTest === 'function') {
    window.__sitePassSubmitSocialLoginTestImpl = submitSocialLoginTest;
    window.submitSocialLoginTest = submitSocialLoginTest;
  }
  if (typeof startJoinFlow === 'function') window.startJoinFlow = startJoinFlow;
  if (typeof openSitePassSignup === 'function') {
    window.__sitePassOpenSitePassSignupImpl = openSitePassSignup;
    window.openSitePassSignup = openSitePassSignup;
  }
} catch (e) {
  console.warn('SitePass 로그인 전역 연결 보정 생략:', e);
}

