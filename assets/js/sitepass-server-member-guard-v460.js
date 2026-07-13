// SitePass v23.7.460-test - 서버 회원 확인 오판 방지 가드
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
  var NEW_SIGNUP_GRACE_KEY = 'sitepass:new-signup-server-grace:v460';
  var invalidated = false;
  var checking = false;
  var lastOkAt = 0;
  var lastOkKey = '';
  var lastAlertAt = 0;

  function now(){ return Date.now ? Date.now() : new Date().getTime(); }
  function safeJson(raw){ if (!raw) return null; try { return JSON.parse(raw); } catch(e) { return null; } }
  function getStoreValue(store, key){ try { return store && store.getItem ? store.getItem(key) : null; } catch(e) { return null; } }
  function removeStoreValue(store, key){ try { if (store && store.removeItem) store.removeItem(key); } catch(e) {} }
  function cleanPhone(value){ return String(value || '').replace(/[^0-9]/g, ''); }
  function normalizeProvider(value){
    return String(value || '').trim().toLowerCase()
      .replace(/^custom:/, '').replace('카카오톡', 'kakao').replace('카카오', 'kakao').replace('네이버', 'naver');
  }
  function addUnique(list, value){ var v = String(value || '').trim(); if (v && list.indexOf(v) < 0) list.push(v); }
  function withoutPrefixes(value){ return String(value || '').trim().replace(/^SITEPASS-LOGIN-/i, '').replace(/^SITEPASS-/i, ''); }

  function getCurrentLocalMember(){
    var keys = [CURRENT_MEMBER_KEY, PWA_AUTO_MEMBER_KEY, BROWSER_AUTO_MEMBER_KEY];
    var stores = [sessionStorage, localStorage];
    for (var s=0; s<stores.length; s++) {
      for (var k=0; k<keys.length; k++) {
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

  function memberLookup(member){
    var loginKeys = [], providerIds = [], phones = [], emails = [], authIds = [];
    if (!member || typeof member !== 'object') return { loginKeys:[], providerIds:[], phones:[], emails:[], authIds:[], key:'' };

    [member.login_id, member.loginId, member.supabaseLoginId, member.signupId, member.providerId, member.id, member.userId, member.authUserId, member.supabaseAuthUserId]
      .forEach(function(v){ addUnique(loginKeys, v); addUnique(loginKeys, withoutPrefixes(v)); });

    var provider = normalizeProvider(member.signupMethod || member.provider || member.providerName || '');
    var rawProviderId = withoutPrefixes(member.providerId || member.kakaoUserId || member.naverUserId || '');
    if (rawProviderId) {
      addUnique(providerIds, rawProviderId);
      addUnique(loginKeys, rawProviderId);
      if (provider === 'kakao') addUnique(loginKeys, 'kakao_' + rawProviderId);
      if (provider === 'naver') addUnique(loginKeys, 'naver_' + rawProviderId);
    }

    var phone = cleanPhone(member.phone || member.mobile || member.phoneNumber || '');
    if (phone) { addUnique(phones, phone); addUnique(loginKeys, phone); }
    var email = String(member.email || member.mail || '').trim().toLowerCase();
    if (email) { addUnique(emails, email); addUnique(loginKeys, email); }
    [member.auth_user_id, member.authUserId, member.supabaseAuthUserId, member.userId].forEach(function(v){ addUnique(authIds, v); });

    var lowerKeys = loginKeys.slice();
    loginKeys.forEach(function(v){ addUnique(lowerKeys, String(v).toLowerCase()); });
    return {
      loginKeys: lowerKeys.slice(0, 30), providerIds: providerIds.slice(0, 10), phones: phones.slice(0, 10),
      emails: emails.slice(0, 10), authIds: authIds.slice(0, 10),
      key: lowerKeys.concat(providerIds, phones, emails, authIds).join('|')
    };
  }


  function memberPrimaryKey(member){
    var lookup = memberLookup(member || {});
    return String((lookup.loginKeys && lookup.loginKeys[0]) || (lookup.phones && lookup.phones[0]) || '').trim().toLowerCase();
  }
  function markNewSignupGrace(member){
    var key = memberPrimaryKey(member);
    if (!key) return false;
    var row = { key:key, createdAt:now(), expiresAt:now() + 5 * 60 * 1000 };
    try { sessionStorage.setItem(NEW_SIGNUP_GRACE_KEY, JSON.stringify(row)); } catch(e) {}
    try { localStorage.setItem(NEW_SIGNUP_GRACE_KEY, JSON.stringify(row)); } catch(e) {}
    return true;
  }
  function readNewSignupGrace(){
    var row = safeJson(getStoreValue(sessionStorage, NEW_SIGNUP_GRACE_KEY)) || safeJson(getStoreValue(localStorage, NEW_SIGNUP_GRACE_KEY));
    if (!row || Number(row.expiresAt || 0) < now()) {
      removeStoreValue(sessionStorage, NEW_SIGNUP_GRACE_KEY);
      removeStoreValue(localStorage, NEW_SIGNUP_GRACE_KEY);
      return null;
    }
    return row;
  }
  function isNewSignupGraceActive(member){
    var row = readNewSignupGrace();
    if (!row) return false;
    var key = memberPrimaryKey(member);
    return !!(key && String(row.key || '').toLowerCase() === key);
  }
  function clearNewSignupGrace(){
    removeStoreValue(sessionStorage, NEW_SIGNUP_GRACE_KEY);
    removeStoreValue(localStorage, NEW_SIGNUP_GRACE_KEY);
  }

  function isActiveMemberRow(row){
    if (!row) return false;
    var status = String(row.status || '').trim().toLowerCase();
    var plan = String(row.plan_type || '').trim().toLowerCase();
    var blocked = ['withdrawn','deleted','blocked','ban','banned','inactive','removed','탈퇴','삭제','정지','차단'];
    for (var i=0; i<blocked.length; i++) {
      if (status.indexOf(blocked[i]) >= 0 || plan.indexOf(blocked[i]) >= 0) return false;
    }
    return true;
  }

  function result(state, row, error, source){ return { state:state, row:row || null, error:error || null, source:source || '' }; }

  async function rpcLookup(lookup){
    try {
      if (!window.sitepassSupabase || typeof window.sitepassSupabase.rpc !== 'function') return result('unknown', null, null, 'rpc-unavailable');
      var res = await window.sitepassSupabase.rpc('sitepass_lookup_member_public_v460', {
        p_login_keys: lookup.loginKeys || [],
        p_provider_ids: lookup.providerIds || [],
        p_phones: lookup.phones || [],
        p_emails: lookup.emails || [],
        p_auth_ids: lookup.authIds || []
      });
      if (res && res.error) {
        var msg = String(res.error.message || res.error || '');
        if (/not found|could not find|schema cache|function/i.test(msg)) return result('unknown', null, res.error, 'rpc-missing');
        return result('unknown', null, res.error, 'rpc-error');
      }
      var data = res ? res.data : null;
      if (data && data.found === true && data.row) return result(isActiveMemberRow(data.row) ? 'found' : 'missing', data.row, null, 'rpc');
      if (data && data.found === false) return result('missing', null, null, 'rpc');
      if (data && data.login_id) return result(isActiveMemberRow(data) ? 'found' : 'missing', data, null, 'rpc');
      return result('unknown', null, null, 'rpc-ambiguous');
    } catch(e) {
      return result('unknown', null, e, 'rpc-exception');
    }
  }

  async function directQuery(buildQuery){
    try {
      if (!window.sitepassSupabase || !window.sitepassSupabase.from) return result('unknown', null, null, 'direct-unavailable');
      var base = window.sitepassSupabase.from('sitepass_members').select('login_id, provider_id, phone, email, auth_user_id, signup_method, role, status, plan_type, terms_agreed_at').limit(5);
      var res = await buildQuery(base);
      if (res && res.error) return result('unknown', null, res.error, 'direct-error');
      var rows = (res && Array.isArray(res.data)) ? res.data : [];
      for (var i=0; i<rows.length; i++) {
        if (isActiveMemberRow(rows[i])) return result('found', rows[i], null, 'direct');
      }
      // RLS가 SELECT를 빈 배열로 돌려줄 수 있으므로 0행은 회원 없음으로 단정하지 않습니다.
      return result('unknown', null, null, 'direct-empty');
    } catch(e) {
      return result('unknown', null, e, 'direct-exception');
    }
  }

  async function lookupMember(lookup){
    if (!lookup || !lookup.key) return result('unknown', null, null, 'no-key');
    var rpc = await rpcLookup(lookup);
    if (rpc.state !== 'unknown') return rpc;

    var checks = [];
    if (lookup.loginKeys.length) checks.push(function(q){ return q.in('login_id', lookup.loginKeys); });
    if (lookup.providerIds.length) checks.push(function(q){ return q.in('provider_id', lookup.providerIds); });
    if (lookup.authIds.length) checks.push(function(q){ return q.in('auth_user_id', lookup.authIds); });
    if (lookup.emails.length) checks.push(function(q){ return q.in('email', lookup.emails); });
    if (lookup.phones.length) checks.push(function(q){ return q.in('phone', lookup.phones); });
    for (var i=0; i<checks.length; i++) {
      var direct = await directQuery(checks[i]);
      if (direct.state === 'found') return direct;
    }
    return result('unknown', null, rpc.error || null, 'not-authoritative');
  }

  async function lookupLoginState(loginId){
    var q = String(loginId || '').trim();
    if (!q) return result('unknown', null, null, 'no-login');
    var phone = cleanPhone(q);
    var lookup = {
      loginKeys: [], providerIds: [], phones: [], emails: [], authIds: [], key: q.toLowerCase()
    };
    addUnique(lookup.loginKeys, q);
    addUnique(lookup.loginKeys, q.toLowerCase());
    addUnique(lookup.loginKeys, withoutPrefixes(q));
    if (phone) { addUnique(lookup.phones, phone); addUnique(lookup.loginKeys, phone); }
    if (q.indexOf('@') > 0) addUnique(lookup.emails, q.toLowerCase());
    return lookupMember(lookup);
  }

  async function lookupLocalState(member){ return lookupMember(memberLookup(member)); }
  async function fetchActiveMemberForLogin(loginId){ var r = await lookupLoginState(loginId); return r.state === 'found' ? r.row : null; }
  async function fetchActiveMemberForLocalMember(member){ var r = await lookupLocalState(member); return r.state === 'found' ? r.row : null; }

  async function signOutSupabase(){
    try { if (window.sitepassSupabase && window.sitepassSupabase.auth && window.sitepassSupabase.auth.signOut) await window.sitepassSupabase.auth.signOut(); } catch(e) {}
  }
  function dbMissingSignupMessage(){ return 'DB에 회원정보가 없습니다.\n회원가입을 새로 진행해주세요.'; }
  function showDbMissingSignupBanner(){
    try {
      var panel = document.getElementById('accountFindPanel') || document.querySelector('#signupScreen .login-auth-shell') || document.querySelector('#signupScreen .card');
      if (!panel) return;
      var old = document.getElementById('sitepassDbMissingSignupNotice460');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var box = document.createElement('div');
      box.id = 'sitepassDbMissingSignupNotice460';
      box.className = 'notice blue-note';
      box.style.cssText = 'margin:10px 0 12px;padding:12px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-weight:900;line-height:1.45;text-align:center;';
      box.innerHTML = '<b>DB에 회원정보가 없습니다.</b><br>회원가입을 새로 진행해주세요.';
      panel.insertBefore(box, panel.firstChild || null);
    } catch(e) {}
  }
  function clearMemberLoginStorage(){
    [sessionStorage, localStorage].forEach(function(store){
      [CURRENT_MEMBER_KEY,PWA_AUTO_MEMBER_KEY,BROWSER_AUTO_MEMBER_KEY,QUICK_AUTH_KEY,SERVER_EQUIPMENT_CACHE_KEY,FIRST_AUTO_LOGIN_KEY,FIRST_AUTO_LOGIN_ID_KEY,FIRST_REMEMBER_ID_KEY,
       'sitepass:kakao:pending','sitepass:naver:pending','sitePass_v23_7_7_update_original_corrected_pwa_auto_member_v23_7_145','sitePass_v23_7_7_update_original_corrected_browser_auto_member_v23_7_395']
        .forEach(function(key){ removeStoreValue(store, key); });
    });
    removeStoreValue(localStorage, MEMBERS_KEY);
    removeStoreValue(sessionStorage, MEMBERS_KEY);
    clearNewSignupGrace();
  }
  function showLoginScreenAfterInvalidation(){
    try { if (window.history && window.history.replaceState) window.history.replaceState({ sitepassScreen:'signupScreen' }, document.title || 'SitePass', window.location.pathname + window.location.search); } catch(e) {}
    try { if (typeof window.showScreen === 'function') window.showScreen('signupScreen', { replace:true }); } catch(e) {}
    setTimeout(function(){
      try { if (typeof window.backToSitePassFirstLanding === 'function') window.backToSitePassFirstLanding(); } catch(e) {}
      showDbMissingSignupBanner();
    }, 60);
  }
  async function invalidateDeletedMember(message){
    invalidated = true;
    clearMemberLoginStorage();
    await signOutSupabase();
    showLoginScreenAfterInvalidation();
    var t = now();
    if (message && t - lastAlertAt > 2500) { lastAlertAt = t; alert(message); }
    return false;
  }

  async function verifyCurrentMember(reason, silent){
    if (invalidated || checking) return !invalidated;
    try { if (typeof window.isAdminLoggedIn === 'function' && window.isAdminLoggedIn()) return true; } catch(e) {}
    var member = getCurrentLocalMember();
    if (!member) return true;
    var lookup = memberLookup(member);
    if (lookup.key && lookup.key === lastOkKey && now() - lastOkAt < 20000) return true;
    checking = true;
    var state;
    try { state = await lookupMember(lookup); } finally { checking = false; }
    if (state.state === 'found') {
      clearNewSignupGrace();
      lastOkAt = now(); lastOkKey = lookup.key; return true;
    }
    if (state.state === 'missing' && isNewSignupGraceActive(member)) {
      console.warn('[SitePass v460] 신규가입 직후 서버 저장 완료 전 조회여서 로그인은 유지하고 다시 확인합니다.');
      setTimeout(function(){ verifyCurrentMember('new-signup-recheck', true); }, 12000);
      return true;
    }
    if (state.state === 'missing') return invalidateDeletedMember(silent ? '' : dbMissingSignupMessage());
    console.warn('[SitePass v460] 서버 회원 확인이 권한/RLS/네트워크 문제로 확정되지 않아 기존 로그인은 유지합니다.', state.source, state.error && (state.error.message || state.error));
    return true;
  }

  function isPrivateScreen(id){
    return ['homeScreen','registerScreen','listScreen','detailScreen','pricingScreen','myAccountScreen','contactScreen','adminScreen'].indexOf(String(id || '')) >= 0;
  }
  function wrapShowScreen(){
    if (window.__sitepassShowScreen460Wrapped || typeof window.showScreen !== 'function') return;
    window.__sitepassShowScreen460Wrapped = true;
    var prev = window.showScreen;
    window.showScreen = function(id){ if (isPrivateScreen(id) && !invalidated) verifyCurrentMember('show:' + id, false); return prev.apply(this, arguments); };
  }
  function wrapMemberLogin(){
    if (window.__sitepassLogin460Wrapped || typeof window.submitSitePassLoginTest !== 'function') return;
    window.__sitepassLogin460Wrapped = true;
    var prev = window.submitSitePassLoginTest;
    window.submitSitePassLoginTest = async function(){
      var loginInput = document.getElementById('sitepassLoginIdentifier');
      var loginId = String((loginInput && loginInput.value) || '').trim();
      if (loginId && !(typeof window.isSuperAdminLoginId === 'function' && window.isSuperAdminLoginId(loginId))) {
        var state = await lookupLoginState(loginId);
        if (state.state === 'missing') { await invalidateDeletedMember(dbMissingSignupMessage()); return false; }
        if (state.state === 'unknown') console.warn('[SitePass v460] 로그인 전 서버 회원 확인은 확정되지 않았습니다. 로컬 계정 확인을 계속합니다.');
      }
      return prev.apply(this, arguments);
    };
  }

  window.sitePassMarkNewSignupGrace460 = markNewSignupGrace;
  window.sitePassLookupLoginState460 = lookupLoginState;
  window.sitePassLookupLocalMemberState460 = lookupLocalState;
  window.sitePassFetchActiveMemberForLogin460 = fetchActiveMemberForLogin;
  window.sitePassFetchActiveMemberForLocalMember460 = fetchActiveMemberForLocalMember;
  window.sitePassVerifyCurrentMember460 = verifyCurrentMember;
  window.sitePassInvalidateDeletedMemberSession460 = invalidateDeletedMember;
  // 이전 코드 호환
  window.sitePassFetchActiveMemberForLogin458 = fetchActiveMemberForLogin;
  window.sitePassFetchActiveMemberForLocalMember458 = fetchActiveMemberForLocalMember;
  window.sitePassVerifyCurrentMember458 = verifyCurrentMember;
  window.sitePassInvalidateDeletedMemberSession458 = invalidateDeletedMember;

  function boot(){
    wrapShowScreen(); wrapMemberLogin();
    setTimeout(wrapShowScreen, 200); setTimeout(wrapMemberLogin, 200);
    setTimeout(function(){ verifyCurrentMember('boot', false); }, 500);
    setTimeout(function(){ verifyCurrentMember('boot-late', true); }, 1600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('pageshow', function(){ setTimeout(boot, 60); setTimeout(function(){ verifyCurrentMember('pageshow', true); }, 280); });
  setInterval(function(){ verifyCurrentMember('interval', true); }, 30000);
})();
