// SitePass v23.7.463-test - 기존 회원 서버 프로필 자동 보강 / 내정보 유지
(function () {
  'use strict';

  var PROFILE_KEY = 'sitepass_signup_profiles_v463';
  var LEGACY_PROFILE_KEY = 'sitepass_signup_profiles_v462';
  window.__sitepassMyAccountVerified463 = false;

  function safeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function digits(value) {
    return String(value || '').replace(/[^0-9]/g, '').slice(0, 11);
  }

  function normalizeKey(value) {
    return safeText(value).toLowerCase().replace(/\s+/g, '');
  }

  function readProfiles() {
    try {
      var current = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      var legacy = JSON.parse(localStorage.getItem(LEGACY_PROFILE_KEY) || '{}');
      current = current && typeof current === 'object' ? current : {};
      legacy = legacy && typeof legacy === 'object' ? legacy : {};
      return Object.assign({}, legacy, current);
    } catch (e) {
      return {};
    }
  }

  function writeProfiles(value) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(value || {})); } catch (e) {}
  }

  function memberKeys(member) {
    if (!member) return [];
    var raw = [
      member.signupId, member.login_id, member.loginId, member.providerId,
      member.provider_id, member.id, member.phone, member.signupIdentityPhone,
      member.verifiedPhone
    ];
    var result = [];
    raw.forEach(function (value) {
      var key = normalizeKey(value);
      if (key && result.indexOf(key) < 0) result.push(key);
      var phoneKey = digits(value);
      if (phoneKey && result.indexOf(phoneKey) < 0) result.push(phoneKey);
    });
    return result;
  }

  function pickFirst(values) {
    for (var i = 0; i < values.length; i += 1) {
      var value = safeText(values[i]);
      if (value) return value;
    }
    return '';
  }

  function getCachedProfile(memberOrKey) {
    var profiles = readProfiles();
    var keys = typeof memberOrKey === 'object' ? memberKeys(memberOrKey) : [normalizeKey(memberOrKey), digits(memberOrKey)];
    for (var i = 0; i < keys.length; i += 1) {
      if (keys[i] && profiles[keys[i]]) return profiles[keys[i]];
    }
    return null;
  }

  function storeSignupProfile(member) {
    if (!member) return;
    var name = pickFirst([
      member.signupIdentityName, member.verifiedName, member.identityName,
      member.name
    ]);
    var phone = digits(pickFirst([
      member.signupIdentityPhone, member.verifiedPhone, member.identityPhone,
      member.phone
    ]));
    if (!name && !phone) return;
    var profile = {
      name: name,
      phone: phone,
      signupId: safeText(member.signupId || member.login_id || member.loginId),
      savedAt: new Date().toISOString()
    };
    var profiles = readProfiles();
    var keys = memberKeys(member);
    if (!keys.length && profile.signupId) keys.push(normalizeKey(profile.signupId));
    keys.forEach(function (key) {
      if (key) profiles[key] = profile;
    });
    writeProfiles(profiles);
  }
  window.sitePassStoreSignupProfile463 = storeSignupProfile;
  window.sitePassStoreSignupProfile462 = storeSignupProfile;

  function findBestLocalMember(current) {
    var members = [];
    try { members = typeof getMembers === 'function' ? (getMembers() || []) : []; } catch (e) { members = []; }
    var currentKeys = memberKeys(current);
    var loginKey = normalizeKey(current && (current.signupId || current.login_id || current.loginId));
    var best = null;
    var bestScore = -1;
    members.forEach(function (member) {
      if (!member || member.withdrawn) return;
      var keys = memberKeys(member);
      var matched = keys.some(function (key) { return currentKeys.indexOf(key) >= 0; });
      if (!matched && loginKey) {
        matched = normalizeKey(member.signupId || member.login_id || member.loginId) === loginKey;
      }
      if (!matched) return;
      var score = 0;
      if (member.identityVerified || member.phoneVerified) score += 8;
      if (member.signupIdentityName || member.verifiedName) score += 5;
      if (member.signupIdentityPhone || member.verifiedPhone) score += 5;
      if (member.name && normalizeKey(member.name) !== normalizeKey(member.signupId)) score += 3;
      if (digits(member.phone)) score += 3;
      if (member.testPassword) score += 2;
      if (score > bestScore) { best = member; bestScore = score; }
    });
    if (best) return best;
    try {
      var lookup = current && (current.signupId || current.providerId || current.phone || current.id || current.name);
      if (lookup && typeof findMemberForLogin === 'function') return findMemberForLogin(lookup) || current;
    } catch (e) {}
    return current || null;
  }

  function resolveContext() {
    var admin = false;
    try { admin = typeof isAdminLoggedIn === 'function' && isAdminLoggedIn(); } catch (e) {}
    if (admin) {
      var role = '';
      var sessionId = '';
      var sessionName = '';
      try { role = typeof getCurrentAdminRoleName === 'function' ? getCurrentAdminRoleName() : '관리자'; } catch (e) { role = '관리자'; }
      try { sessionId = typeof getSessionValue === 'function' ? (getSessionValue(ADMIN_SESSION_KEY + '_id') || '') : ''; } catch (e) {}
      try { sessionName = typeof getSessionValue === 'function' ? (getSessionValue(ADMIN_SESSION_KEY + '_name') || '') : ''; } catch (e) {}
      var adminMember = findBestLocalMember({ signupId: sessionId, name: sessionName });
      var adminProfile = getCachedProfile(adminMember || sessionId) || {};
      return {
        mode: 'admin', role: role || '관리자', member: adminMember,
        loginId: pickFirst([adminMember && adminMember.signupId, sessionId]),
        name: pickFirst([adminMember && adminMember.signupIdentityName, adminMember && adminMember.verifiedName, adminProfile.name, adminMember && adminMember.name, sessionName, '관리자']),
        phone: digits(pickFirst([adminMember && adminMember.signupIdentityPhone, adminMember && adminMember.verifiedPhone, adminProfile.phone, adminMember && adminMember.phone])),
        provider: pickFirst([adminMember && adminMember.signupMethod, adminMember && adminMember.provider, role, 'SitePass 관리자'])
      };
    }

    var current = null;
    try { current = typeof getCurrentMemberTest === 'function' ? getCurrentMemberTest() : null; } catch (e) {}
    if (!current) return null;
    var member = findBestLocalMember(current) || current;
    var profile = getCachedProfile(member) || getCachedProfile(current) || {};
    var loginId = pickFirst([member.signupId, member.login_id, current.signupId, member.providerId, current.providerId, member.id, current.id]);
    var name = pickFirst([
      member.signupIdentityName, member.verifiedName, current.signupIdentityName,
      profile.name, member.name, current.name
    ]);
    var phone = digits(pickFirst([
      member.signupIdentityPhone, member.verifiedPhone, current.signupIdentityPhone,
      profile.phone, member.phone, current.phone
    ]));
    return {
      mode: 'member', role: '일반회원', member: member,
      loginId: loginId, name: name || 'SitePass 회원', phone: phone,
      provider: pickFirst([member.signupMethod, member.provider, current.signupMethod, current.provider, 'SitePass 일반가입'])
    };
  }

  function setStatus(id, text, cls) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = 'my-account-status' + (cls ? ' ' + cls : '');
  }

  function formatPhone(value) {
    var phone = digits(value);
    if (phone.length === 11) return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    if (phone.length === 10) return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    return phone || '-';
  }

  function providerLabel(value) {
    try {
      if (typeof normalizeSignupProviderLabel === 'function') return normalizeSignupProviderLabel(value || 'SitePass');
    } catch (e) {}
    return safeText(value) || 'SitePass 일반가입';
  }

  function closeEditPanels() {
    var phonePanel = document.getElementById('myAccountPhoneEditPanel');
    var passwordPanel = document.getElementById('myAccountPasswordPanel');
    if (phonePanel) phonePanel.classList.add('hidden');
    if (passwordPanel) passwordPanel.classList.add('hidden');
    var newPw = document.getElementById('myNewPassword');
    var newPw2 = document.getElementById('myNewPassword2');
    if (newPw) newPw.value = '';
    if (newPw2) newPw2.value = '';
    setStatus('myAccountPhoneStatus', '', '');
    setStatus('myAccountPasswordStatus', '', '');
  }

  async function refreshProfileFromServer(ctx) {
    if (!ctx || !ctx.loginId) return;
    var lookupFn = window.sitePassLookupLoginState463 || window.sitePassLookupLoginState460;
    if (typeof lookupFn !== 'function') return;
    try {
      var state = await lookupFn(ctx.loginId);
      if (!state || state.state !== 'found' || !state.row) return;
      var row = state.row;
      var serverName = safeText(row.name || row.member_name || '');
      var serverPhone = digits(row.phone || row.phone_number || '');
      var loginKey = normalizeKey(ctx.loginId);
      var currentNameKey = normalizeKey(ctx.name);
      var serverNameKey = normalizeKey(serverName);
      var localNameIsPlaceholder = !ctx.name || ctx.name === 'SitePass 회원' || ctx.name === '이름없음' || currentNameKey === loginKey;
      var serverHasValidName = !!serverName && serverNameKey !== loginKey && serverName !== '이름없음' && serverName !== 'SitePass 회원';
      var betterName = serverHasValidName && (localNameIsPlaceholder || serverNameKey !== currentNameKey);
      var betterPhone = !!serverPhone && serverPhone !== digits(ctx.phone);
      var profileStatus = document.getElementById('myAccountProfileStatus463');
      if (!betterName && !betterPhone) {
        if (profileStatus && window.__sitepassMyAccountVerified463) {
          if (serverHasValidName || serverPhone) {
            profileStatus.textContent = '회원가입 때 저장된 서버 정보를 확인했습니다.';
            profileStatus.className = 'my-account-status ok';
          } else {
            profileStatus.textContent = '서버 회원정보에도 이름 또는 휴대폰번호가 비어 있습니다.';
            profileStatus.className = 'my-account-status warn';
          }
        }
        return;
      }
      var member = ctx.member || { signupId:ctx.loginId, providerId:'SITEPASS-' + ctx.loginId, signupMethod:ctx.provider || 'SitePass 회원가입' };
      if (betterName) {
        member.name = serverName;
        member.signupIdentityName = serverName;
        member.verifiedName = serverName;
      }
      if (betterPhone) {
        member.phone = serverPhone;
        member.signupIdentityPhone = serverPhone;
        member.verifiedPhone = serverPhone;
      }
      var saved = member;
      try { if (typeof saveMemberTest === 'function') saved = saveMemberTest(member) || member; } catch (e) {}
      try { if (typeof refreshCurrentAccountSession === 'function') refreshCurrentAccountSession(ctx, saved); } catch (e) {}
      storeSignupProfile(saved);
      if (window.__sitepassMyAccountVerified463) {
        if (betterName && document.getElementById('myAccountName')) document.getElementById('myAccountName').textContent = serverName;
        if (betterPhone && document.getElementById('myAccountPhone')) document.getElementById('myAccountPhone').textContent = formatPhone(serverPhone);
        if (betterPhone && document.getElementById('myAccountPhoneInput')) document.getElementById('myAccountPhoneInput').value = serverPhone;
        if (profileStatus) {
          if ((serverName && serverNameKey !== loginKey && serverName !== '이름없음') || serverPhone) {
            profileStatus.textContent = '회원가입 때 저장된 서버 정보를 불러왔습니다.';
            profileStatus.className = 'my-account-status ok';
          } else {
            profileStatus.textContent = '서버 회원정보에 이름 또는 휴대폰번호가 비어 있습니다.';
            profileStatus.className = 'my-account-status warn';
          }
        }
      }
    } catch (e) {
      console.warn('내정보 가입 인증정보 서버 보강 실패:', e && e.message ? e.message : e);
    }
  }

  function renderMyAccount() {
    var ctx = resolveContext();
    if (!ctx) return false;
    var typeEl = document.getElementById('myAccountType');
    var nameEl = document.getElementById('myAccountName');
    var idEl = document.getElementById('myAccountLoginId');
    var providerEl = document.getElementById('myAccountProvider');
    var phoneEl = document.getElementById('myAccountPhone');
    var phoneInput = document.getElementById('myAccountPhoneInput');
    var withdrawBtn = document.getElementById('myAccountWithdrawButton');
    if (typeEl) typeEl.textContent = ctx.mode === 'admin' ? ctx.role : '일반회원';
    if (nameEl) nameEl.textContent = ctx.name || '-';
    if (idEl) idEl.textContent = ctx.loginId || '-';
    if (providerEl) providerEl.textContent = providerLabel(ctx.provider || ctx.role);
    if (phoneEl) phoneEl.textContent = formatPhone(ctx.phone);
    if (phoneInput) phoneInput.value = digits(ctx.phone);
    var profileStatus = document.getElementById('myAccountProfileStatus463');
    if (profileStatus) { profileStatus.textContent = '회원가입 때 저장된 서버 정보를 확인하고 있습니다.'; profileStatus.className = 'my-account-status'; }
    if (withdrawBtn) withdrawBtn.classList.toggle('hidden', ctx.mode === 'admin');
    closeEditPanels();
    try {
      var profileMember = Object.assign({}, ctx.member || {}, {
        signupId: ctx.loginId,
        name: ctx.name,
        phone: ctx.phone,
        signupIdentityName: ctx.name,
        signupIdentityPhone: ctx.phone
      });
      storeSignupProfile(profileMember);
    } catch (e) {}
    try { myAccountPasswordVerified = true; } catch (e) {}
    setTimeout(function () { refreshProfileFromServer(ctx); }, 80);
    return true;
  }

  function showGate() {
    var gate = document.getElementById('myAccountPasswordGate462');
    var input = document.getElementById('myAccountEntryPassword462');
    if (!gate) return false;
    window.__sitepassMyAccountVerified463 = false;
    try { myAccountPasswordVerified = false; } catch (e) {}
    if (input) input.value = '';
    setStatus('myAccountGateStatus462', '비밀번호 확인 후 내정보가 열립니다.', '');
    gate.classList.remove('hidden');
    document.body.classList.add('my-account-gate-open-v462');
    setTimeout(function () { if (input) input.focus(); }, 80);
    return false;
  }

  function hideGate() {
    var gate = document.getElementById('myAccountPasswordGate462');
    var input = document.getElementById('myAccountEntryPassword462');
    if (gate) gate.classList.add('hidden');
    if (input) input.value = '';
    document.body.classList.remove('my-account-gate-open-v462');
  }

  function openMyAccountScreen463() {
    var ctx = resolveContext();
    if (!ctx) {
      alert('로그인 후 내정보를 확인할 수 있습니다.');
      try { showScreen('signupScreen'); } catch (e) {}
      return false;
    }
    closeEditPanels();
    return showGate();
  }

  function confirmEntryPassword() {
    var ctx = resolveContext();
    if (!ctx) {
      hideGate();
      alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
      try { showScreen('signupScreen'); } catch (e) {}
      return false;
    }
    var input = document.getElementById('myAccountEntryPassword462');
    var password = input ? input.value : '';
    if (!password) {
      setStatus('myAccountGateStatus462', '현재 로그인 비밀번호를 입력해주세요.', 'warn');
      if (input) input.focus();
      return false;
    }
    var member = ctx.member;
    var ok = false;
    if (member && member.testPassword) {
      try { ok = typeof isMemberPasswordOk === 'function' ? isMemberPasswordOk(member, password) : String(member.testPassword) === String(password); }
      catch (e) { ok = String(member.testPassword) === String(password); }
    } else if (ctx.mode === 'admin') {
      try {
        if (typeof ADMIN_PASSWORD !== 'undefined') ok = String(password) === String(ADMIN_PASSWORD);
      } catch (e) {}
    }
    if (!ok) {
      if (!member || !member.testPassword) {
        setStatus('myAccountGateStatus462', '이 계정의 비밀번호 정보를 불러오지 못했습니다. 로그아웃 후 아이디·비밀번호로 다시 로그인해주세요.', 'warn');
      } else {
        setStatus('myAccountGateStatus462', '비밀번호가 맞지 않습니다.', 'warn');
      }
      if (input) { input.value = ''; input.focus(); }
      return false;
    }

    window.__sitepassMyAccountVerified463 = true;
    try { myAccountPasswordVerified = true; } catch (e) {}
    hideGate();
    renderMyAccount();
    try { showScreen('myAccountScreen', { myAccountVerified: true }); } catch (e) {
      var screen = document.getElementById('myAccountScreen');
      if (screen) screen.classList.remove('hidden');
    }
    return true;
  }

  function cancelEntryPassword() {
    window.__sitepassMyAccountVerified463 = false;
    try { myAccountPasswordVerified = false; } catch (e) {}
    hideGate();
    return false;
  }

  function lockMyAccount() {
    window.__sitepassMyAccountVerified463 = false;
    try { myAccountPasswordVerified = false; } catch (e) {}
    hideGate();
    closeEditPanels();
  }

  function openPhoneEdit() {
    if (!window.__sitepassMyAccountVerified463) return openMyAccountScreen463();
    var ctx = resolveContext();
    var panel = document.getElementById('myAccountPhoneEditPanel');
    var passwordPanel = document.getElementById('myAccountPasswordPanel');
    var input = document.getElementById('myAccountPhoneInput');
    if (passwordPanel) passwordPanel.classList.add('hidden');
    if (panel) panel.classList.remove('hidden');
    if (input) { input.value = digits(ctx && ctx.phone); setTimeout(function () { input.focus(); }, 60); }
    setStatus('myAccountPhoneStatus', '새 휴대폰번호를 입력한 뒤 저장해주세요.', '');
    return false;
  }

  function cancelPhoneEdit() {
    var panel = document.getElementById('myAccountPhoneEditPanel');
    if (panel) panel.classList.add('hidden');
    setStatus('myAccountPhoneStatus', '', '');
    return false;
  }

  function savePhone() {
    if (!window.__sitepassMyAccountVerified463) return openMyAccountScreen463();
    var ctx = resolveContext();
    if (!ctx) return false;
    var input = document.getElementById('myAccountPhoneInput');
    var phone = digits(input && input.value);
    if (!/^01[0-9]{8,9}$/.test(phone)) {
      setStatus('myAccountPhoneStatus', '휴대폰번호 형식을 확인해주세요. 예: 01012345678', 'warn');
      return false;
    }
    var member = ctx.member || {
      id: 'MEM-' + Date.now(),
      signupId: ctx.loginId,
      providerId: ctx.loginId ? 'SITEPASS-' + ctx.loginId : '',
      signupMethod: ctx.provider || 'SitePass 회원가입'
    };
    member.name = ctx.name || member.name || ctx.loginId || 'SitePass 회원';
    member.phone = phone;
    member.signupIdentityName = member.signupIdentityName || ctx.name || member.name;
    member.signupIdentityPhone = phone;
    member.verifiedName = member.verifiedName || member.signupIdentityName;
    member.verifiedPhone = phone;
    member.phoneUpdatedAt = new Date().toISOString();
    var saved = member;
    try { if (typeof saveMemberTest === 'function') saved = saveMemberTest(member) || member; } catch (e) {}
    try { if (typeof refreshCurrentAccountSession === 'function') refreshCurrentAccountSession(ctx, saved); else if (typeof setCurrentMemberTest === 'function' && ctx.mode === 'member') setCurrentMemberTest(saved); } catch (e) {}
    storeSignupProfile(saved);
    if (document.getElementById('myAccountPhone')) document.getElementById('myAccountPhone').textContent = formatPhone(phone);
    setStatus('myAccountPhoneStatus', '휴대폰번호가 저장되었습니다.', 'ok');
    setTimeout(cancelPhoneEdit, 700);
    return false;
  }

  function togglePasswordPanel() {
    if (!window.__sitepassMyAccountVerified463) return openMyAccountScreen463();
    var panel = document.getElementById('myAccountPasswordPanel');
    var phonePanel = document.getElementById('myAccountPhoneEditPanel');
    if (phonePanel) phonePanel.classList.add('hidden');
    if (!panel) return false;
    var willOpen = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !willOpen);
    setStatus('myAccountPasswordStatus', willOpen ? '새 비밀번호를 입력해주세요.' : '', '');
    if (willOpen) setTimeout(function () { document.getElementById('myNewPassword')?.focus(); }, 60);
    return false;
  }

  function cancelPasswordEdit() {
    var panel = document.getElementById('myAccountPasswordPanel');
    if (panel) panel.classList.add('hidden');
    var pw = document.getElementById('myNewPassword');
    var pw2 = document.getElementById('myNewPassword2');
    if (pw) pw.value = '';
    if (pw2) pw2.value = '';
    setStatus('myAccountPasswordStatus', '', '');
    return false;
  }

  function changePassword() {
    if (!window.__sitepassMyAccountVerified463) return openMyAccountScreen463();
    var ctx = resolveContext();
    if (!ctx) return false;
    var newPw = document.getElementById('myNewPassword')?.value || '';
    var newPw2 = document.getElementById('myNewPassword2')?.value || '';
    if (newPw.length < 6) {
      setStatus('myAccountPasswordStatus', '새 비밀번호는 6자 이상으로 입력해주세요.', 'warn');
      return false;
    }
    if (newPw !== newPw2) {
      setStatus('myAccountPasswordStatus', '새 비밀번호와 확인 비밀번호가 다릅니다.', 'warn');
      return false;
    }
    var member = ctx.member || {
      id: 'MEM-' + Date.now(), signupId: ctx.loginId,
      providerId: ctx.loginId ? 'SITEPASS-' + ctx.loginId : '',
      signupMethod: ctx.provider || 'SitePass 회원가입'
    };
    member.name = ctx.name || member.name || ctx.loginId || 'SitePass 회원';
    member.phone = ctx.phone || member.phone || '';
    member.signupIdentityName = member.signupIdentityName || ctx.name || member.name;
    member.signupIdentityPhone = member.signupIdentityPhone || ctx.phone || member.phone;
    member.testPassword = newPw;
    member.passwordSet = true;
    member.passwordChangedAt = new Date().toISOString();
    var saved = member;
    try { if (typeof saveMemberTest === 'function') saved = saveMemberTest(member) || member; } catch (e) {}
    try { if (typeof refreshCurrentAccountSession === 'function') refreshCurrentAccountSession(ctx, saved); else if (typeof setCurrentMemberTest === 'function' && ctx.mode === 'member') setCurrentMemberTest(saved); } catch (e) {}
    storeSignupProfile(saved);
    setStatus('myAccountPasswordStatus', '비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용합니다.', 'ok');
    var pw = document.getElementById('myNewPassword');
    var pw2 = document.getElementById('myNewPassword2');
    if (pw) pw.value = '';
    if (pw2) pw2.value = '';
    setTimeout(cancelPasswordEdit, 950);
    return false;
  }

  window.openMyAccountScreen = openMyAccountScreen463;
  window.confirmMyAccountEntryPassword463 = confirmEntryPassword;
  window.confirmMyAccountEntryPassword462 = confirmEntryPassword;
  window.cancelMyAccountEntryPassword463 = cancelEntryPassword;
  window.cancelMyAccountEntryPassword462 = cancelEntryPassword;
  window.sitePassLockMyAccount463 = lockMyAccount;
  window.sitePassLockMyAccount462 = lockMyAccount;
  window.renderMyAccountScreen = renderMyAccount;
  window.openMyAccountPhoneEdit463 = openPhoneEdit;
  window.openMyAccountPhoneEdit462 = openPhoneEdit;
  window.cancelMyAccountPhoneEdit463 = cancelPhoneEdit;
  window.cancelMyAccountPhoneEdit462 = cancelPhoneEdit;
  window.saveMyAccountPhone = savePhone;
  window.toggleMyAccountPasswordPanel463 = togglePasswordPanel;
  window.toggleMyAccountPasswordPanel462 = togglePasswordPanel;
  window.cancelMyAccountPasswordEdit463 = cancelPasswordEdit;
  window.cancelMyAccountPasswordEdit462 = cancelPasswordEdit;
  window.changeMyAccountPassword = changePassword;

  document.addEventListener('DOMContentLoaded', function () {
    try {
      var current = typeof getCurrentMemberTest === 'function' ? getCurrentMemberTest() : null;
      var full = findBestLocalMember(current);
      if (full) storeSignupProfile(full);
    } catch (e) {}
  });
})();
