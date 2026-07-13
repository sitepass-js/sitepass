// SitePass v23.7.455 - 서버 회원 없음 로그인 차단 가드
(function(){
  'use strict';

  var STORAGE_KEY = 'sitePass_v23_7_7_update_original_corrected';
  var CURRENT_MEMBER_KEY = STORAGE_KEY + '_currentMember';
  var MEMBERS_KEY = STORAGE_KEY + '_members';
  var PWA_AUTO_MEMBER_KEY = STORAGE_KEY + '_pwa_auto_member_v23_7_145';
  var BROWSER_AUTO_MEMBER_KEY = STORAGE_KEY + '_browser_auto_member_v23_7_395';
  var QUICK_AUTH_KEY = STORAGE_KEY + '_quick_auth_v23_7_141';
  var SERVER_EQUIPMENT_CACHE_KEY = STORAGE_KEY + '_server_equipment_cache_v23_7_283';
  var FIRST_AUTO_LOGIN_KEY = 'sitepass:first:auto-login';
  var FIRST_AUTO_LOGIN_ID_KEY = 'sitepass:first:auto-login-id';
  var FIRST_REMEMBER_ID_KEY = 'sitepass:first:remember-login-id';
  var invalidated = false;
  var checking = false;
  var lastOkAt = 0;
  var lastOkKey = '';
  var lastAlertAt = 0;

  function now(){ return Date.now ? Date.now() : new Date().getTime(); }

  function safeJson(raw){
    if (!raw) return null;
    try { return JSON.parse(raw); } catch(e) { return null; }
  }

  function getStoreValue(store, key){
    try { return store && store.getItem ? store.getItem(key) : null; } catch(e) { return null; }
  }

  function setStoreValue(store, key, value){
    try { if (store && store.setItem) store.setItem(key, value); } catch(e) {}
  }

  function removeStoreValue(store, key){
    try { if (store && store.removeItem) store.removeItem(key); } catch(e) {}
  }

  function getCurrentLocalMember(){
    var keys = [CURRENT_MEMBER_KEY, PWA_AUTO_MEMBER_KEY, BROWSER_AUTO_MEMBER_KEY];
    var stores = [sessionStorage, localStorage];
    for (var s = 0; s < stores.length; s++) {
      for (var k = 0; k < keys.length; k++) {
        var parsed = safeJson(getStoreValue(stores[s], keys[k]));
        if (parsed && typeof parsed === 'object') return parsed;
      }
    }
    try {
      if (typeof window.getCurrentMemberTest === 'function') {
        var current = window.getCurrentMemberTest();
        if (current && typeof current === 'object') return current;
      }
    } catch(e) {}
    return null;
  }

  function normalizeProvider(value){
    return String(value || '').trim().toLowerCase()
      .replace(/^custom:/, '')
      .replace('카카오톡', 'kakao')
      .replace('카카오', 'kakao')
      .replace('네이버', 'naver');
  }

  function cleanPhone(value){
    return String(value || '').replace(/[^0-9]/g, '');
  }

  function addUnique(list, value){
    var v = String(value || '').trim();
    if (!v) return;
    if (list.indexOf(v) < 0) list.push(v);
  }

  function withoutPrefixes(value){
    return String(value || '').trim()
      .replace(/^SITEPASS-LOGIN-/i, '')
      .replace(/^SITEPASS-/i, '');
  }

  function memberLookup(member){
    var loginKeys = [];
    var providerIds = [];
    var phones = [];
    var emails = [];
    var authIds = [];
    if (!member || typeof member !== 'object') {
      return { loginKeys:loginKeys, providerIds:providerIds, phones:phones, emails:emails, authIds:authIds, key:'' };
    }

    [
      member.login_id, member.loginId, member.supabaseLoginId, member.signupId,
      member.providerId, member.id, member.userId, member.authUserId,
      member.supabaseAuthUserId
    ].forEach(function(v){ addUnique(loginKeys, v); });

    var provider = normalizeProvider(member.signupMethod || member.provider || member.providerName || '');
    var rawProviderId = withoutPrefixes(member.providerId || member.kakaoUserId || member.naverUserId || '');
    if (rawProviderId) {
      addUnique(providerIds, rawProviderId);
      addUnique(loginKeys, rawProviderId);
      if (provider === 'kakao') addUnique(loginKeys, 'kakao_' + rawProviderId);
      if (provider === 'naver') addUnique(loginKeys, 'naver_' + rawProviderId);
    }

    var phone = cleanPhone(member.phone || member.mobile || member.phoneNumber || '');
    if (phone) {
      addUnique(phones, phone);
      addUnique(loginKeys, phone);
    }

    var email = String(member.email || member.mail || '').trim().toLowerCase();
    if (email) {
      addUnique(emails, email);
      addUnique(loginKeys, email);
    }

    [member.auth_user_id, member.authUserId, member.supabaseAuthUserId, member.userId].forEach(function(v){ addUnique(authIds, v); });

    return {
      loginKeys: loginKeys.slice(0, 20),
      providerIds: providerIds.slice(0, 10),
      phones: phones.slice(0, 10),
      emails: emails.slice(0, 10),
      authIds: authIds.slice(0, 10),
      key: loginKeys.concat(providerIds, phones, emails, authIds).join('|')
    };
  }

  function isActiveMemberRow(row){
    if (!row) return false;
    var status = String(row.status || '').trim().toLowerCase();
    var plan = String(row.plan_type || '').trim().toLowerCase();
    var blocked = ['withdrawn','deleted','blocked','ban','banned','탈퇴','삭제','정지'];
    if (blocked.indexOf(status) >= 0 || blocked.indexOf(plan) >= 0) return false;
    return true;
  }

  async function selectFirstActive(buildQuery){
    try {
      if (!window.sitepassSupabase || !window.sitepassSupabase.from) return null;
      var res = await buildQuery(window.sitepassSupabase.from('sitepass_members')
        .select('login_id, provider_id, phone, email, auth_user_id, role, status, plan_type, terms_agreed_at')
        .limit(3));
      var rows = (res && res.data) || [];
      for (var i = 0; i < rows.length; i++) {
        if (isActiveMemberRow(rows[i])) return rows[i];
      }
    } catch(e) {
      console.warn('[SitePass] 서버 회원 확인 실패:', e && (e.message || e));
    }
    return null;
  }

  async function fetchActiveMemberForLogin(loginId){
    var q = String(loginId || '').trim();
    if (!q || !window.sitepassSupabase || !window.sitepassSupabase.from) return null;
    var phone = cleanPhone(q);
    var lower = q.toLowerCase();

    var row = await selectFirstActive(function(query){ return query.eq('login_id', q); });
    if (row) return row;

    if (lower !== q) {
      row = await selectFirstActive(function(query){ return query.eq('login_id', lower); });
      if (row) return row;
    }

    if (phone) {
      row = await selectFirstActive(function(query){ return query.eq('phone', phone); });
      if (row) return row;
    }

    if (q.indexOf('@') > 0) {
      row = await selectFirstActive(function(query){ return query.eq('email', lower); });
      if (row) return row;
    }

    return null;
  }

  async function fetchActiveMemberForLocalMember(member){
    var lookup = memberLookup(member);
    if (!lookup.key) return null;

    if (lookup.loginKeys.length) {
      var row1 = await selectFirstActive(function(query){ return query.in('login_id', lookup.loginKeys); });
      if (row1) return row1;
    }
    if (lookup.providerIds.length) {
      var row2 = await selectFirstActive(function(query){ return query.in('provider_id', lookup.providerIds); });
      if (row2) return row2;
    }
    if (lookup.authIds.length) {
      var row3 = await selectFirstActive(function(query){ return query.in('auth_user_id', lookup.authIds); });
      if (row3) return row3;
    }
    if (lookup.emails.length) {
      var row4 = await selectFirstActive(function(query){ return query.in('email', lookup.emails); });
      if (row4) return row4;
    }
    if (lookup.phones.length) {
      var row5 = await selectFirstActive(function(query){ return query.in('phone', lookup.phones); });
      if (row5) return row5;
    }
    return null;
  }

  async function signOutSupabase(){
    try {
      if (window.sitepassSupabase && window.sitepassSupabase.auth && window.sitepassSupabase.auth.signOut) {
        await window.sitepassSupabase.auth.signOut();
      }
    } catch(e) {}
  }

  function clearMemberLoginStorage(){
    [sessionStorage, localStorage].forEach(function(store){
      [
        CURRENT_MEMBER_KEY,
        PWA_AUTO_MEMBER_KEY,
        BROWSER_AUTO_MEMBER_KEY,
        QUICK_AUTH_KEY,
        SERVER_EQUIPMENT_CACHE_KEY,
        FIRST_AUTO_LOGIN_KEY,
        FIRST_AUTO_LOGIN_ID_KEY,
        FIRST_REMEMBER_ID_KEY,
        'sitepass:kakao:pending',
        'sitepass:naver:pending',
        'sitePass_v23_7_7_update_original_corrected_pwa_auto_member_v23_7_145',
        'sitePass_v23_7_7_update_original_corrected_browser_auto_member_v23_7_395'
      ].forEach(function(key){ removeStoreValue(store, key); });
    });

    // 서버에서 회원이 삭제된 경우 같은 기기의 예전 회원목록으로 재로그인하지 못하게 로컬 회원목록도 비웁니다.
    removeStoreValue(localStorage, MEMBERS_KEY);
    removeStoreValue(sessionStorage, MEMBERS_KEY);
  }

  function showLoginScreenAfterInvalidation(){
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState({ sitepassScreen:'signupScreen' }, document.title || 'SitePass', window.location.pathname + window.location.search);
      }
    } catch(e) {}
    try {
      if (typeof window.showScreen === 'function') window.showScreen('signupScreen', { replace:true });
    } catch(e) {}
    setTimeout(function(){
      try {
        if (typeof window.backToSitePassFirstLanding === 'function') window.backToSitePassFirstLanding();
      } catch(e) {}
    }, 60);
  }

  async function invalidateDeletedMember(message){
    invalidated = true;
    clearMemberLoginStorage();
    await signOutSupabase();
    showLoginScreenAfterInvalidation();
    var t = now();
    if (message && t - lastAlertAt > 2500) {
      lastAlertAt = t;
      alert(message);
    }
    return false;
  }

  async function verifyCurrentMember(reason, silent){
    if (invalidated || checking) return !invalidated;
    try { if (typeof window.isAdminLoggedIn === 'function' && window.isAdminLoggedIn()) return true; } catch(e) {}

    var member = getCurrentLocalMember();
    if (!member) return true;

    var lookup = memberLookup(member);
    var currentKey = lookup.key;
    if (currentKey && currentKey === lastOkKey && now() - lastOkAt < 20000) return true;

    checking = true;
    var activeRow = null;
    try {
      activeRow = await fetchActiveMemberForLocalMember(member);
    } finally {
      checking = false;
    }

    if (activeRow) {
      lastOkAt = now();
      lastOkKey = currentKey;
      return true;
    }

    return await invalidateDeletedMember(
      silent ? '' : '서버 회원정보가 삭제되어 자동 로그아웃했습니다.\n다시 이용하려면 회원가입을 새로 진행해주세요.'
    );
  }

  function isPrivateScreen(id){
    return [
      'homeScreen',
      'registerScreen',
      'listScreen',
      'detailScreen',
      'pricingScreen',
      'myAccountScreen',
      'contactScreen',
      'adminScreen'
    ].indexOf(String(id || '')) >= 0;
  }

  function wrapShowScreen(){
    if (window.__sitepassShowScreen455Wrapped || typeof window.showScreen !== 'function') return;
    window.__sitepassShowScreen455Wrapped = true;
    var prev = window.showScreen;
    window.showScreen = function(id){
      if (isPrivateScreen(id) && !invalidated) {
        verifyCurrentMember('show:' + id, false);
      }
      return prev.apply(this, arguments);
    };
  }

  function wrapMemberLogin(){
    if (window.__sitepassLogin455Wrapped || typeof window.submitSitePassLoginTest !== 'function') return;
    window.__sitepassLogin455Wrapped = true;
    var prev = window.submitSitePassLoginTest;
    window.submitSitePassLoginTest = async function(){
      var loginInput = document.getElementById('sitepassLoginIdentifier');
      var loginId = String((loginInput && loginInput.value) || '').trim();
      try {
        if (loginId && !(typeof window.isSuperAdminLoginId === 'function' && window.isSuperAdminLoginId(loginId))) {
          var serverMember = await fetchActiveMemberForLogin(loginId);
          if (!serverMember) {
            await invalidateDeletedMember('서버 회원정보가 없습니다.\n초기화되었거나 삭제된 회원은 로그인할 수 없습니다.\n회원가입을 새로 진행해주세요.');
            return false;
          }
        }
      } catch(e) {
        console.warn('[SitePass] 로그인 전 서버회원 확인 실패:', e && (e.message || e));
        await invalidateDeletedMember('서버 회원정보를 확인하지 못해 로그인을 중단했습니다.\n잠시 후 다시 시도해주세요.');
        return false;
      }
      return prev.apply(this, arguments);
    };
  }

  function wrapSocialFallbackLogin(){
    if (window.__sitepassSocialLogin455Wrapped || typeof window.submitSocialLoginTest !== 'function') return;
    window.__sitepassSocialLogin455Wrapped = true;
    var prev = window.submitSocialLoginTest;
    window.submitSocialLoginTest = async function(provider){
      var label = String(provider || '').trim();
      var providerKey = normalizeProvider(label);
      if (providerKey === 'kakao' || providerKey === 'naver') {
        await invalidateDeletedMember('서버 회원정보가 없습니다.\n초기화 후에는 기존 카카오/네이버 로그인으로 바로 들어갈 수 없습니다.\n회원가입을 새로 진행해주세요.');
        return false;
      }
      return prev.apply(this, arguments);
    };
  }

  window.sitePassFetchActiveMemberForLogin455 = fetchActiveMemberForLogin;
  window.sitePassFetchActiveMemberForLocalMember455 = fetchActiveMemberForLocalMember;
  window.sitePassVerifyCurrentMember455 = verifyCurrentMember;
  window.sitePassInvalidateDeletedMemberSession455 = invalidateDeletedMember;

  function boot(){
    wrapShowScreen();
    wrapMemberLogin();
    wrapSocialFallbackLogin();
    setTimeout(wrapShowScreen, 200);
    setTimeout(wrapMemberLogin, 200);
    setTimeout(wrapSocialFallbackLogin, 200);
    setTimeout(function(){ verifyCurrentMember('boot', false); }, 450);
    setTimeout(function(){ verifyCurrentMember('boot-late', false); }, 1400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('pageshow', function(){
    setTimeout(boot, 60);
    setTimeout(function(){ verifyCurrentMember('pageshow', false); }, 250);
  });
  setInterval(function(){ verifyCurrentMember('interval', true); }, 30000);
})();
