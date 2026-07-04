// SitePass v23.7.299 - app-core-auth split continue (06/11)
function adminRoleToSupabaseRole(roleName, loginId) {
      if (isSuperAdminLoginId(loginId)) return 'super_admin';
      if (roleName === SUPER_ADMIN_ROLE_NAME) return 'member';
      if (roleName === '관리자' || roleName === '운영관리자' || roleName === '조회관리자') return 'admin';
      return 'member';
    }

    function isDesignatedSuperAdminMember(member) {
      if (!member) return false;
      return getMemberAdminIdentifiers(member).some(id => isSuperAdminLoginId(id));
    }

    function normalizeSingleSuperAdminRole(member) {
      if (!member || member.isSuperAdminVirtual) return member;
      const designated = isDesignatedSuperAdminMember(member);
      const roleName = member.adminRole || supabaseRoleToAdminRole(member.role || '');
      if (designated) {
        member.adminRole = SUPER_ADMIN_ROLE_NAME;
        member.role = 'super_admin';
        return member;
      }
      if (roleName === SUPER_ADMIN_ROLE_NAME || String(member.role || '').toLowerCase() === 'super_admin') {
        delete member.adminRole;
        member.role = 'member';
        member.adminRoleUpdatedAt = new Date().toISOString();
        member.adminRoleUpdatedBy = 'SitePass 최고관리자 단일화';
      }
      return member;
    }

    function enforceSingleSuperAdminOnMemberList(list) {
      const arr = Array.isArray(list) ? list : [];
      return arr.map(member => normalizeSingleSuperAdminRole({ ...(member || {}) }));
    }

    function cleanupAdminRoleMapSingleSuperAdmin() {
      const map = getAdminRoleMap();
      let changed = false;
      Object.keys(map || {}).forEach(key => {
        if (map[key] === SUPER_ADMIN_ROLE_NAME && !isSuperAdminLoginId(key)) {
          delete map[key];
          changed = true;
        }
      });
      if (changed) setAdminRoleMap(map);
    }

    function getLocalAdminRoleForLogin(loginId, member) {
      if (isSuperAdminLoginId(loginId)) return SUPER_ADMIN_ROLE_NAME;
      const role = (member && (member.adminRole || supabaseRoleToAdminRole(member.role))) || '';
      if (role === SUPER_ADMIN_ROLE_NAME) return '';
      const mapped = getMappedAdminRoleForLogin(loginId);
      return mapped === SUPER_ADMIN_ROLE_NAME ? '' : mapped;
    }

    async function fetchSupabaseAdminRoleForLogin(loginId) {
      try {
        if (!window.sitepassSupabase) return '';
        const raw = normalizeLoginText(loginId);
        const key = normalizeAdminRoleKey(raw);
        const candidates = Array.from(new Set([
          raw,
          key,
          key ? 'SITEPASS-' + key : '',
          key ? 'SITEPASS-LOGIN-' + key : ''
        ].filter(Boolean)));
        if (!candidates.length) return '';

        const { data, error } = await window.sitepassSupabase
          .from('sitepass_members')
          .select('login_id, role, name, phone')
          .in('login_id', candidates)
          .limit(1);

        if (error) {
          console.warn('Supabase 관리자 권한 조회 실패:', error.message);
          return '';
        }
        const roleName = supabaseRoleToAdminRole(data && data[0] && data[0].role);
        if (roleName === SUPER_ADMIN_ROLE_NAME && !isSuperAdminLoginId(loginId)) return '';
        return roleName;
      } catch (e) {
        console.warn('Supabase 관리자 권한 조회 예외:', e);
        return '';
      }
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
      const role = getSessionValue(ADMIN_SESSION_KEY + '_role') || SUPER_ADMIN_ROLE_NAME;
      const adminId = getSessionValue(ADMIN_SESSION_KEY + '_id') || '';
      if (role === SUPER_ADMIN_ROLE_NAME && adminId && !isSuperAdminLoginId(adminId)) return '관리자';
      return role;
    }

    function isSuperAdminLoggedIn() {
      return isAdminLoggedIn() && getCurrentAdminRoleName() === SUPER_ADMIN_ROLE_NAME;
    }

    function completeAdminLogin(roleName, adminId, adminName) {
      let finalRoleName = roleName || SUPER_ADMIN_ROLE_NAME;
      if (finalRoleName === SUPER_ADMIN_ROLE_NAME && !isSuperAdminLoginId(adminId || ADMIN_ID)) finalRoleName = '관리자';
      setSessionValue(ADMIN_SESSION_KEY, 'yes');
      setSessionValue(ADMIN_SESSION_KEY + '_role', finalRoleName);
      setSessionValue(ADMIN_SESSION_KEY + '_id', adminId || '');
      setSessionValue(ADMIN_SESSION_KEY + '_name', adminName || '');
      removeSessionValue(CURRENT_MEMBER_KEY);
      clearPwaAutoMemberTest();
      refreshAdminUi();
      refreshMemberUi();
      showScreen('adminScreen');
    }

    function completeSuperAdminLogin() {
      completeAdminLogin(SUPER_ADMIN_ROLE_NAME, ADMIN_ID, '대표이사 최고관리자');
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
      const role = updatedMember.adminRole || member.adminRole || '관리자';
      const adminId = updatedMember.signupId || updatedMember.providerId || updatedMember.id || updatedMember.name || '';
      const adminName = updatedMember.name || updatedMember.signupId || '관리자';
      completeAdminLogin(role, adminId, adminName);
    }



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

