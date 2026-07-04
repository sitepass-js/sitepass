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
