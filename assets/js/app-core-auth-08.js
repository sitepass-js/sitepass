// SitePass v23.7.299 - app-core-auth split continue (08/11)
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

