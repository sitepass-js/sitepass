// SitePass v23.7.298 - app-core-auth split continue (02/10)
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
        : '\n서버 장비/큐알 정리는 확인이 필요합니다: ' + escapePlainTextForAlert(serverCleanup?.error?.message || serverCleanup?.error || 'RPC 미연결');
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

