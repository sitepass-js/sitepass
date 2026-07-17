// SitePass v23.7.545-test - 오류 로그 및 관리자 모니터링
(function(){
  'use strict';

  var VERSION = '23.7.545-test';
  var REPORT_RPC = 'sitepass_report_error_v537';
  var LIST_RPC = 'sitepass_list_error_logs_v537';
  var STATUS_RPC = 'sitepass_set_error_status_v537';
  var LOCAL_KEY = 'sitepass:error-monitor:v537:local';
  var ADMIN_ID_KEY = 'sitePass_v23_7_7_update_original_corrected_admin_session_id';
  var ADMIN_ROLE_KEY = 'sitePass_v23_7_7_update_original_corrected_admin_session_role';
  var CURRENT_MEMBER_KEY = 'sitePass_v23_7_7_update_original_corrected_currentMember';
  var MAX_LOCAL = 60;
  var captureThrottle = Object.create(null);
  var reporting = false;
  var flushTimer = 0;
  var adminFilter = 'open';
  var adminLastLoadedAt = 0;
  var adminLoading = false;
  var monitorServerState = { ok:null, message:'' };
  var autoResolveRunning = false;
  var autoResolveLastRunAt = 0;
  var autoResolveNotice = '';

  function text(value, max){
    var out = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    return out.slice(0, Math.max(0, Number(max || 1000)));
  }

  function escapeHtml(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }

  function sensitiveKey(key){
    return /password|passwd|secret|token|signature|share_sig|access[_-]?key|service[_-]?key|authorization|cookie|phone|email|name|resident|rrn|birth|login[_-]?id|signup[_-]?id|provider[_-]?id|member[_-]?id|auth[_-]?user[_-]?id|dataurl|previewdata|originaldata|filedata|image|document|docs|pages|blob|base64/i.test(String(key || ''));
  }

  function scrub(value, depth){
    depth = Number(depth || 0);
    if (depth > 3) return '[depth-limit]';
    if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
    if (typeof value === 'string') {
      if (/^data:|^blob:/i.test(value)) return '[file-data-removed]';
      return text(value, 500);
    }
    if (value instanceof Error) {
      return {
        name:text(value.name,80),
        message:text(value.message,1200),
        stack:text(value.stack,2500)
      };
    }
    if (Array.isArray(value)) return value.slice(0,8).map(function(v){ return scrub(v, depth + 1); });
    if (typeof value === 'object') {
      var out = {};
      Object.keys(value).slice(0,40).forEach(function(key){
        if (sensitiveKey(key)) {
          out[key] = '[removed]';
          return;
        }
        try { out[key] = scrub(value[key], depth + 1); }
        catch (e) { out[key] = '[unreadable]'; }
      });
      return out;
    }
    return text(value,300);
  }

  function safeJsonParse(raw){
    try { return JSON.parse(raw || 'null'); } catch (e) { return null; }
  }

  function getCurrentMember(){
    try {
      if (typeof window.getCurrentMemberTest === 'function') {
        var direct = window.getCurrentMemberTest();
        if (direct && typeof direct === 'object') return direct;
      }
    } catch (e) {}
    try {
      var row = safeJsonParse(sessionStorage.getItem(CURRENT_MEMBER_KEY));
      if (row && typeof row === 'object') return row;
    } catch (e) {}
    return {};
  }

  function getMemberPayload(){
    var member = getCurrentMember() || {};
    var identity = text(member.signupId || member.loginId || member.signup_id || member.login_id || member.providerId || member.provider_id || member.id || member.memberId || member.member_id || member.authUserId || member.auth_user_id || '',300).toLowerCase();
    return { member_ref: identity ? simpleHash(identity) : '' };
  }

  function safeLocationText(){
    try {
      var url = new URL(location.href);
      var keys = [];
      url.searchParams.forEach(function(_, key){ if (keys.indexOf(key) < 0) keys.push(key); });
      var hashKey = String(url.hash || '').replace(/^#/, '').split(/[=&]/)[0];
      return url.pathname + (keys.length ? '?' + keys.sort().join('&') : '') + (hashKey ? '#' + hashKey : '');
    } catch (e) { return text(location.pathname || '',300); }
  }

  function safeStoragePath(value){
    var parts = text(value,320).replace(/^\/+/, '').split('/');
    if (parts.length > 1) parts[0] = '[owner]';
    return parts.join('/');
  }

  function readAdminSessionValue(key){
    var value = '';
    try { value = sessionStorage.getItem(key) || ''; } catch (e) {}
    if (!value) { try { value = localStorage.getItem(key) || ''; } catch (e) {} }
    return value;
  }

  function normalizeAdminRoleForServer(role){
    var value = text(role,80).toLowerCase();
    if (value === '최고관리자' || value === 'superadmin' || value === 'super_admin') return 'super_admin';
    if (value === '관리자' || value === '운영관리자' || value === '조회관리자' || value === 'admin') return 'admin';
    return value;
  }

  function getAdminPayload(){
    var loginId = readAdminSessionValue(ADMIN_ID_KEY);
    var role = readAdminSessionValue(ADMIN_ROLE_KEY);
    try { if (!loginId && typeof getSessionValue === 'function') loginId = getSessionValue(ADMIN_ID_KEY) || ''; } catch (e) {}
    try { if (!role && typeof getCurrentAdminRoleName === 'function') role = getCurrentAdminRoleName() || ''; } catch (e) {}
    var normalizedId = text(loginId,180).toLowerCase();
    // 이전 비상 관리자 아이디로 로그인했어도 서버 권한 행은 지정 최고관리자 1명으로 확인합니다.
    if (normalizedId === 'dream9473' || normalizedId === 'sitepassadmin') normalizedId = 'sitepass@kakao.com';
    return {
      login_id:normalizedId,
      signup_id:normalizedId,
      email:normalizedId.indexOf('@') >= 0 ? normalizedId : '',
      role:normalizeAdminRoleForServer(role),
      display_role:text(role,80)
    };
  }

  function getVisibleScreen(){
    try {
      var all = Array.prototype.slice.call(document.querySelectorAll('.screen'));
      var visible = all.find(function(el){
        if (!el || el.classList.contains('hidden')) return false;
        var style = window.getComputedStyle ? getComputedStyle(el) : null;
        return !style || (style.display !== 'none' && style.visibility !== 'hidden');
      });
      return visible ? visible.id : '';
    } catch (e) { return ''; }
  }

  function deviceKind(){
    var ua = navigator.userAgent || '';
    if (/ipad|tablet/i.test(ua)) return 'tablet';
    if (/android|iphone|ipod|mobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function errorInfo(error){
    if (error && typeof error === 'object') {
      return {
        name:text(error.name || '',100),
        code:text(error.code || error.statusCode || error.status || '',120),
        message:text(error.message || error.error_description || error.details || error.hint || String(error),1800),
        stack:text(error.stack || '',3000),
        details:text(error.details || '',1200),
        hint:text(error.hint || '',800)
      };
    }
    return { name:'', code:'', message:text(error || '알 수 없는 오류',1800), stack:'', details:'', hint:'' };
  }

  function simpleHash(input){
    var str = String(input || '');
    var h = 2166136261;
    for (var i=0;i<str.length;i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }

  function findEquipmentMeta(meta, args){
    var candidates = [];
    if (meta && typeof meta === 'object') candidates.push(meta);
    (args || []).forEach(function(arg){
      if (arg && typeof arg === 'object') candidates.push(arg);
    });
    for (var i=0;i<candidates.length;i++) {
      var item = candidates[i];
      if (item && item.item && typeof item.item === 'object') item = item.item;
      var code = text(item && (item.equipment_code || item.equipmentCode || item.code || item.share_code || item.shareCode) || '',160);
      var no = text(item && (item.equipment_no || item.equipmentNo || item.registrationNo) || '',100);
      if (code || no) return { equipment_code:code, equipment_no:no };
    }
    return { equipment_code:'', equipment_no:'' };
  }

  function normalizeEvent(category, error, meta){
    meta = meta && typeof meta === 'object' ? meta : {};
    var info = errorInfo(error);
    var equipment = findEquipmentMeta(meta, meta.args || []);
    var page = text(meta.page || getVisibleScreen() || location.pathname,160);
    var action = text(meta.action || meta.operation || '',160);
    var event = {
      severity:/warning|warn/i.test(String(meta.severity || '')) ? 'warning' : (/info/i.test(String(meta.severity || '')) ? 'info' : 'error'),
      category:text(category || meta.category || 'javascript',100),
      error_code:text(meta.code || info.code || info.name || '',120),
      message:text(meta.message || info.message || '알 수 없는 오류',1800),
      page:page,
      action:action,
      app_version:VERSION,
      browser:text(navigator.userAgent || '',500),
      device:deviceKind(),
      member:getMemberPayload(),
      equipment_code:text(meta.equipment_code || equipment.equipment_code || '',160),
      equipment_no:text(meta.equipment_no || equipment.equipment_no || '',100),
      context:scrub({
        stack:info.stack,
        details:info.details,
        hint:info.hint,
        meta:meta.context || meta.extra || {},
        url:safeLocationText(),
        online:navigator.onLine,
        screen:{ width:window.innerWidth || 0, height:window.innerHeight || 0 }
      },0),
      occurred_at:new Date().toISOString()
    };
    event.client_fingerprint = simpleHash([event.category,event.error_code,event.message,event.page,event.action].join('|').toLowerCase());
    return event;
  }

  function readLocal(){
    try {
      var rows = safeJsonParse(localStorage.getItem(LOCAL_KEY));
      return Array.isArray(rows) ? rows : [];
    } catch (e) { return []; }
  }

  function writeLocal(rows){
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify((rows || []).slice(-MAX_LOCAL))); } catch (e) {}
  }

  function storeLocal(event){
    var rows = readLocal();
    rows.push(event);
    writeLocal(rows);
  }

  function removeLocalByFingerprint(fp){
    if (!fp) return;
    var rows = readLocal().filter(function(row){ return row && row.client_fingerprint !== fp; });
    writeLocal(rows);
  }

  function isMonitorRpc(name){
    return [REPORT_RPC, LIST_RPC, STATUS_RPC].indexOf(String(name || '')) >= 0;
  }

  async function sendEvent(event){
    if (!event || reporting) return false;
    var client = window.sitepassSupabase;
    if (!client || typeof client.rpc !== 'function') {
      monitorServerState = { ok:false, message:'Supabase 연결 대기 중' };
      return false;
    }
    reporting = true;
    try {
      var result = await client.rpc(REPORT_RPC, { p_event:event });
      if (result && result.error) {
        var msg = text(result.error.message || result.error.details || result.error,500);
        monitorServerState = { ok:false, message:msg };
        return false;
      }
      monitorServerState = { ok:true, message:'오류 로그 서버 연결 정상' };
      removeLocalByFingerprint(event.client_fingerprint);
      return true;
    } catch (e) {
      monitorServerState = { ok:false, message:text(e && e.message || e,500) };
      return false;
    } finally {
      reporting = false;
    }
  }

  async function flushLocal(){
    if (reporting) return;
    var rows = readLocal();
    if (!rows.length) return;
    for (var i=0;i<Math.min(rows.length,10);i++) {
      var ok = await sendEvent(rows[i]);
      if (!ok) break;
    }
  }

  function scheduleFlush(){
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flushLocal, 700);
  }

  function capture(category, error, meta){
    try {
      var event = normalizeEvent(category, error, meta || {});
      var key = event.client_fingerprint;
      var now = Date.now();
      if (captureThrottle[key] && now - captureThrottle[key] < 15000) return event;
      captureThrottle[key] = now;
      storeLocal(event);
      scheduleFlush();
      return event;
    } catch (e) { return null; }
  }

  function resultFailure(result, meta){
    if (!result) return null;
    // v23.7.539: 정상적인 건너뜀 상태는 오류가 아닙니다.
    // 화면 이동 중 이미 동기화가 실행 중이거나 Supabase 스크립트가 초기화되는 짧은 순간에
    // { skipped:true, error:'Supabase API 연결 없음 또는 동기화 중' }가 반환될 수 있습니다.
    if (result.skipped === true) return null;
    // 하위 Supabase RPC/SELECT 래퍼가 실제 서버 오류를 이미 기록하는 작업은
    // 상위 동기화 함수에서 같은 오류를 한 번 더 기록하지 않습니다.
    if (meta && meta.suppressResultFailure === true) return null;
    if (result.error) return result.error;
    if (result.ok === false) return result.message || result.error || '작업 실패';
    if (result.exists === false && result.error) return result.error;
    return null;
  }

  function wrapAsyncObjectMethod(object, name, category, metaFactory){
    if (!object || typeof object[name] !== 'function' || object[name].__sitepassErrorWrappedV537) return;
    var original = object[name];
    function wrapped(){
      var args = Array.prototype.slice.call(arguments);
      var meta = typeof metaFactory === 'function' ? (metaFactory(args) || {}) : { action:name };
      try {
        var result = original.apply(this, args);
        if (result && typeof result.then === 'function') {
          return result.then(function(value){
            var fail = resultFailure(value, meta);
            if (fail) capture(category, fail, Object.assign({}, meta, { args:args, context:{ result:scrub(value,0) } }));
            return value;
          }, function(err){
            capture(category, err, Object.assign({}, meta, { args:args }));
            throw err;
          });
        }
        var fail = resultFailure(result, meta);
        if (fail) capture(category, fail, Object.assign({}, meta, { args:args, context:{ result:scrub(result,0) } }));
        return result;
      } catch (err) {
        capture(category, err, Object.assign({}, meta, { args:args }));
        throw err;
      }
    }
    wrapped.__sitepassErrorWrappedV537 = true;
    wrapped.__sitepassErrorOriginalV537 = original;
    object[name] = wrapped;
  }

  function wrapGlobal(name, category, metaFactory){
    if (typeof window[name] !== 'function') return;
    wrapAsyncObjectMethod(window, name, category, metaFactory || function(){ return { action:name }; });
  }

  function isTransientRpcNetworkErrorV543(error){
    var message = text(error && (error.message || error.details || error.hint) || error || '',1200);
    var name = text(error && error.name || '',120);
    return /Failed to fetch|NetworkError|Load failed|fetch failed|network request failed|connection (?:reset|closed)|ERR_NETWORK|timeout|timed out/i.test(message + ' ' + name);
  }

  function isSafeReadOnlyRpcV543(name){
    var value = text(name,180).toLowerCase();
    if (value === 'sitepass_list_member_equipment_items_v485') return true;
    return /(?:^|_)(?:list|get|load|read|lookup|find|search|preview|count)(?:_|$)/i.test(value);
  }

  function waitRpcRetryV543(ms){
    return new Promise(function(resolve){ setTimeout(resolve, Math.max(0, Number(ms || 0))); });
  }

  function installDirectSupabaseHook(){
    var client = window.sitepassSupabase;
    if (!client || typeof client.rpc !== 'function' || client.rpc.__sitepassErrorWrappedV537) return;
    var originalRpc = client.rpc.bind(client);
    function wrappedRpc(name, params, options){
      if (isMonitorRpc(name)) return originalRpc(name, params, options);
      var rpcName = text(name,160);
      var retryable = isSafeReadOnlyRpcV543(rpcName);
      var maxAttempts = retryable ? 3 : 1;

      async function runAttempt(attempt){
        try {
          var value = await originalRpc(name, params, options);
          var transientResultError = value && value.error && isTransientRpcNetworkErrorV543(value.error);
          if (transientResultError && attempt < maxAttempts) {
            try { console.warn('[SitePass RPC 재시도]', rpcName, attempt + '/' + maxAttempts); } catch (e) {}
            await waitRpcRetryV543(attempt === 1 ? 450 : 1200);
            return runAttempt(attempt + 1);
          }
          if (value && value.error) capture('server_rpc', value.error, { action:rpcName, context:{ rpc:rpcName, attempts:attempt } });
          else if (attempt > 1) {
            try {
              window.sitePassLastRecoveredRpcV543 = { rpc:rpcName, attempts:attempt, recovered_at:new Date().toISOString() };
              window.dispatchEvent(new CustomEvent('sitepass-rpc-recovered-v543', { detail:window.sitePassLastRecoveredRpcV543 }));
            } catch (e) {}
          }
          return value;
        } catch (err) {
          if (retryable && isTransientRpcNetworkErrorV543(err) && attempt < maxAttempts) {
            try { console.warn('[SitePass RPC 재시도]', rpcName, attempt + '/' + maxAttempts); } catch (e) {}
            await waitRpcRetryV543(attempt === 1 ? 450 : 1200);
            return runAttempt(attempt + 1);
          }
          capture('server_rpc', err, { action:rpcName, context:{ rpc:rpcName, attempts:attempt } });
          throw err;
        }
      }

      return runAttempt(1);
    }
    wrappedRpc.__sitepassErrorWrappedV537 = true;
    wrappedRpc.__sitepassErrorOriginalV537 = originalRpc;
    wrappedRpc.__sitepassReadRetryV543 = true;
    client.rpc = wrappedRpc;
  }

  function installOperationHooks(){
    installDirectSupabaseHook();
    var api = window.SitePassSupabaseApi;
    if (api) {
      wrapAsyncObjectMethod(api,'rpc','server_rpc',function(args){
        var name = text(args[0],160);
        return { action:name, severity:/list|select|get/i.test(name) ? 'warning' : 'error', context:{ rpc:name } };
      });
      wrapAsyncObjectMethod(api,'select','server_select',function(args){ return { action:text(args[0],100), context:{ table:text(args[0],100) } }; });
      wrapAsyncObjectMethod(api,'upsert','server_save',function(args){ return { action:text(args[0],100), context:{ table:text(args[0],100) } }; });
      wrapAsyncObjectMethod(api,'update','server_update',function(args){ return { action:text(args[0],100), context:{ table:text(args[0],100) } }; });
      wrapAsyncObjectMethod(api,'storageUpload','storage_upload',function(args){ return { action:'storageUpload', context:{ bucket:text(args[0],80), path:safeStoragePath(args[1]) } }; });
      wrapAsyncObjectMethod(api,'storageSignedUrl','storage_signed_url',function(args){ return { action:'storageSignedUrl', context:{ bucket:text(args[0],80), path:safeStoragePath(args[1]) } }; });
      wrapAsyncObjectMethod(api,'storageExists','storage_verify',function(args){ return { action:'storageExists', severity:'warning', context:{ bucket:text(args[0],80), path:safeStoragePath(args[1]) } }; });
    }

    var qr = window.SitePassQrShare;
    if (qr) {
      wrapAsyncObjectMethod(qr,'saveManagerShareItemsToSupabase','share_create',function(args){ return { action:'saveManagerShareItemsToSupabase', args:args }; });
      wrapAsyncObjectMethod(qr,'loadManagerShareItemFromSupabase','share_open',function(args){ return { action:'loadManagerShareItemFromSupabase', severity:'warning', context:{ share_code:text(args[0],140) } }; });
    }

    wrapGlobal('saveEquipmentItemToSupabase','equipment_save');
    // v23.7.539: 서버 호출 실패는 하위 RPC/SELECT 훅에서 한 번만 기록합니다.
    // 상위 동기화 함수의 반환 오류까지 다시 기록하면 같은 Failed to fetch가 중복됩니다.
    wrapGlobal('syncSupabaseEquipmentItems','equipment_sync',function(){ return { action:'syncSupabaseEquipmentItems', severity:'warning', suppressResultFailure:true }; });
    wrapGlobal('syncSupabaseMyEquipmentItems','equipment_sync',function(){ return { action:'syncSupabaseMyEquipmentItems', severity:'warning', suppressResultFailure:true }; });
    wrapGlobal('uploadSingleDocPageToSupabaseStorage','storage_upload');
    wrapGlobal('uploadEquipmentItemDocsToSupabaseStorage','storage_upload');
    wrapGlobal('uploadAndPersistEquipmentItemDocsInBackground','equipment_save');
    wrapGlobal('prepareManagerShareItemsForServerV497','share_prepare');
    wrapGlobal('saveManagerShareItemsToSupabase','share_create');
    wrapGlobal('loadManagerShareItemFromSupabase','share_open');
    wrapGlobal('shareManagerItemsByChannel','share_send');
    wrapGlobal('refreshMemberDetailFromServerV519','equipment_detail',function(args){ return { action:'refreshMemberDetailFromServer', severity:'warning', equipment_code:text(args[0],160) }; });
    wrapGlobal('renderDetail','equipment_detail',function(args){ return { action:'renderDetail', equipment_code:text(args[0],160) }; });
  }

  function categoryLabel(value){
    var labels = {
      javascript:'화면 코드', resource_load:'파일 불러오기', server_rpc:'서버 기능', server_select:'서버 조회', server_save:'서버 저장', server_update:'서버 수정',
      storage_upload:'서류 업로드', storage_signed_url:'파일주소 발급', storage_verify:'Storage 파일 확인', equipment_save:'장비 저장', equipment_sync:'보관함 동기화',
      equipment_detail:'장비 상세보기', share_prepare:'공유 준비', share_create:'공유링크 생성', share_send:'공유 실행', share_open:'공유링크 열기', test:'관리자 테스트'
    };
    return labels[value] || value || '기타';
  }

  function severityLabel(value){
    if (value === 'warning') return '주의';
    if (value === 'info') return '안내';
    return '오류';
  }

  function formatDate(value){
    if (!value) return '-';
    try { return new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(value)); }
    catch (e) { return text(value,40); }
  }

  function versionNumber(value){
    var match = String(value || '').match(/(?:^|v)(\d+)\.(\d+)\.(\d+)/i);
    if (!match) return 0;
    return Number(match[1] || 0) * 1000000 + Number(match[2] || 0) * 1000 + Number(match[3] || 0);
  }

  function rowVersion(row){
    return text(row && (row.last_app_version || row.first_app_version) || '',80);
  }

  function olderThanMinutes(value, minutes){
    var time = new Date(value || 0).getTime();
    return !!time && Date.now() - time >= Number(minutes || 0) * 60000;
  }

  function autoResolveReason(row){
    if (!row || row.resolved_at) return '';
    var category = text(row.category,100).toLowerCase();
    var action = text(row.action,160).toLowerCase();
    var message = text(row.message,1800);
    var lastVersion = versionNumber(rowVersion(row));
    var currentVersion = versionNumber(VERSION);
    if (!lastVersion || lastVersion >= currentVersion) return '';

    if (category === 'test' || action === 'admin_test' || /관리자 오류 로그 연결 테스트/.test(message)) {
      return VERSION + ' 자동 확인: 관리자 오류 로그 서버 연결이 정상이라 테스트 기록을 해결완료로 전환했습니다.';
    }

    if (category === 'equipment_sync' && /Supabase API 연결 없음(?: 또는 동기화 중)?/.test(message)) {
      return VERSION + ' 자동 확인: 동기화 대기·중복 실행 상태를 오류로 기록하지 않도록 수정했고 현재 서버 연결도 정상입니다.';
    }

    if (/Failed to fetch/i.test(message) && olderThanMinutes(row.last_seen_at, 30) &&
        (category === 'equipment_sync' || category === 'server_rpc' || category === 'server_select')) {
      return VERSION + ' 자동 확인: 현재 서버 연결이 정상이고 마지막 발생 후 30분 이상 재발하지 않아 일시 통신 오류를 해결완료로 전환했습니다.';
    }

    return '';
  }

  async function autoResolveKnownRows(rows){
    if (autoResolveRunning || Date.now() - autoResolveLastRunAt < 20000) return 0;
    var targets = (Array.isArray(rows) ? rows : []).map(function(row){
      return { row:row, note:autoResolveReason(row) };
    }).filter(function(item){ return item.note && Number(item.row && item.row.id || 0); });
    if (!targets.length) return 0;

    var client = window.sitepassSupabase;
    if (!client || typeof client.rpc !== 'function') return 0;
    autoResolveRunning = true;
    autoResolveLastRunAt = Date.now();
    var resolvedCount = 0;
    try {
      for (var i=0;i<targets.length;i++) {
        var item = targets[i];
        try {
          var result = await client.rpc(STATUS_RPC, {
            p_admin:getAdminPayload(),
            p_id:Number(item.row.id || 0),
            p_resolved:true,
            p_note:text(item.note,500)
          });
          if (result && result.error) continue;
          var payload = normalizeRpcData(result && result.data);
          if (payload.ok === false) continue;
          resolvedCount += 1;
        } catch (e) {}
      }
    } finally {
      autoResolveRunning = false;
    }
    if (resolvedCount) {
      autoResolveNotice = '수정·정상 동작이 확인된 오류 ' + resolvedCount + '건을 자동으로 해결완료 처리했습니다.';
    }
    return resolvedCount;
  }

  function injectStyles(){
    if (document.getElementById('sitepassErrorMonitorStyleV537')) return;
    var style = document.createElement('style');
    style.id = 'sitepassErrorMonitorStyleV537';
    style.textContent = [
      '.sp-error-monitor{margin-top:16px;padding:14px;border:1px solid #dbe3ec;border-radius:16px;background:#fff}',
      '.sp-error-monitor h3{margin:0 0 6px;font-size:18px}',
      '.sp-error-monitor .sp-em-sub{font-size:12px;color:#667085;line-height:1.55}',
      '.sp-em-toolbar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:10px 0}',
      '.sp-em-toolbar button{min-height:34px;padding:6px 10px;border-radius:10px}',
      '.sp-em-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0}',
      '.sp-em-summary div{padding:8px;border-radius:10px;background:#f5f7fa;text-align:center;font-size:12px}',
      '.sp-em-summary b{display:block;font-size:17px;margin-bottom:2px}',
      '.sp-em-row{border:1px solid #e4e7ec;border-radius:12px;padding:10px;margin:8px 0;background:#fff}',
      '.sp-em-head{display:flex;gap:6px;align-items:flex-start;justify-content:space-between}',
      '.sp-em-badges{display:flex;gap:5px;flex-wrap:wrap}',
      '.sp-em-badge{font-size:11px;padding:3px 7px;border-radius:999px;background:#eef2f6}',
      '.sp-em-badge.error{background:#fee4e2;color:#b42318}',
      '.sp-em-badge.warning{background:#fef0c7;color:#93370d}',
      '.sp-em-badge.resolved{background:#dcfae6;color:#067647}',
      '.sp-em-message{font-weight:700;margin:8px 0 4px;word-break:break-word}',
      '.sp-em-meta{font-size:12px;color:#667085;line-height:1.6;word-break:break-word}',
      '.sp-em-actions{display:flex;gap:6px;justify-content:flex-end;margin-top:8px}',
      '.sp-em-actions button{min-height:32px;padding:5px 9px;border-radius:9px}',
      '.sp-em-empty{padding:18px 8px;text-align:center;color:#667085}',
      '.sp-em-status{font-size:12px;padding:7px 9px;border-radius:10px;background:#f5f7fa;margin-top:8px;word-break:break-word}',
      '.sp-em-local{margin-top:8px;font-size:12px;color:#b42318}',
      '@media(max-width:520px){.sp-em-summary{grid-template-columns:repeat(3,minmax(0,1fr))}.sp-em-toolbar{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.sp-em-toolbar button{font-size:11px;padding:5px 3px}.sp-em-head{display:block}.sp-em-badges{margin-bottom:5px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function adminPanel(){ return document.getElementById('sitepassErrorMonitorAdminV537'); }

  function renderAdminShell(message){
    var panel = adminPanel();
    if (!panel) return;
    injectStyles();
    panel.className = 'sp-error-monitor';
    panel.innerHTML = '<h3>오류 로그 · 관리자 모니터링</h3>' +
      '<div class="sp-em-sub">서류 원본이나 개인정보는 저장하지 않고, 오류 종류·화면·기기·발생시간·장비코드만 기록합니다. 같은 오류는 발생 횟수로 묶입니다.<br><b>수정된 오류는 최신 버전에서 재발하지 않고 서버 정상 동작이 확인되면 자동으로 해결완료 처리됩니다. 다시 발생하면 미해결로 다시 표시됩니다.</b></div>' +
      '<div class="sp-em-toolbar">' +
        '<button type="button" class="primary" onclick="sitepassLoadErrorLogsV537(\'open\')">미해결</button>' +
        '<button type="button" class="ghost" onclick="sitepassLoadErrorLogsV537(\'resolved\')">해결완료</button>' +
        '<button type="button" class="ghost" onclick="sitepassLoadErrorLogsV537(\'all\')">전체</button>' +
        '<button type="button" class="secondary" onclick="sitepassLoadErrorLogsV537()">새로고침</button>' +
        '<button type="button" class="ghost" onclick="sitepassCreateErrorTestV537()">기록 테스트</button>' +
        '<button type="button" class="ghost" onclick="sitepassClearLocalErrorLogsV537()">기기 임시기록 삭제</button>' +
      '</div>' +
      '<div id="sitepassErrorSummaryV537" class="sp-em-summary"><div><b>-</b>미해결</div><div><b>-</b>해결</div><div><b>-</b>총 발생</div></div>' +
      '<div id="sitepassErrorServerStatusV537" class="sp-em-status">' + escapeHtml(message || '서버 오류 로그를 확인하는 중입니다.') + '</div>' +
      '<div id="sitepassErrorRowsV537"><div class="sp-em-empty">불러오는 중입니다.</div></div>';
  }

  function normalizeRpcData(data){
    if (Array.isArray(data) && data.length === 1 && data[0] && typeof data[0] === 'object') data = data[0];
    if (typeof data === 'string') {
      var parsed = safeJsonParse(data);
      if (parsed) data = parsed;
    }
    return data && typeof data === 'object' ? data : {};
  }

  function renderAdminRows(payload){
    var rowsBox = document.getElementById('sitepassErrorRowsV537');
    var summaryBox = document.getElementById('sitepassErrorSummaryV537');
    var statusBox = document.getElementById('sitepassErrorServerStatusV537');
    if (!rowsBox || !summaryBox || !statusBox) return;
    var summary = payload.summary || {};
    summaryBox.innerHTML = '<div><b>' + Number(summary.open || 0) + '</b>미해결</div><div><b>' + Number(summary.resolved || 0) + '</b>해결</div><div><b>' + Number(summary.occurrences || 0) + '</b>총 발생</div>';
    statusBox.textContent = (autoResolveNotice ? autoResolveNotice + ' · ' : '') + '서버 연결 정상 · 마지막 확인 ' + formatDate(new Date().toISOString()) + ' · 현재 보기: ' + (adminFilter === 'open' ? '미해결' : adminFilter === 'resolved' ? '해결완료' : '전체');
    var rows = Array.isArray(payload.rows) ? payload.rows : [];
    if (!rows.length) {
      var local = readLocal();
      rowsBox.innerHTML = '<div class="sp-em-empty">현재 조건에 해당하는 서버 오류가 없습니다.</div>' + (local.length ? '<div class="sp-em-local">이 기기에 서버 전송 대기 중인 임시 오류 ' + local.length + '건이 있습니다.</div>' : '');
      return;
    }
    rowsBox.innerHTML = rows.map(function(row){
      var resolved = !!row.resolved_at;
      var resolvedAutomatically = resolved && /자동 확인|자동으로 해결완료/.test(String(row.admin_note || ''));
      var contextText = '';
      try { contextText = JSON.stringify(row.sample_context || {}, null, 2); } catch (e) { contextText = ''; }
      return '<div class="sp-em-row">' +
        '<div class="sp-em-head"><div class="sp-em-badges">' +
          '<span class="sp-em-badge ' + escapeHtml(row.severity || 'error') + '">' + escapeHtml(severityLabel(row.severity)) + '</span>' +
          '<span class="sp-em-badge">' + escapeHtml(categoryLabel(row.category)) + '</span>' +
          '<span class="sp-em-badge">' + Number(row.occurrence_count || 1) + '회</span>' +
          (resolved ? '<span class="sp-em-badge resolved">' + (resolvedAutomatically ? '자동 해결완료' : '해결완료') + '</span>' : '') +
        '</div><span class="sp-em-meta">최근 ' + escapeHtml(formatDate(row.last_seen_at)) + '</span></div>' +
        '<div class="sp-em-message">' + escapeHtml(row.message || '오류 메시지 없음') + '</div>' +
        '<div class="sp-em-meta">화면: ' + escapeHtml(row.page || '-') + ' · 작업: ' + escapeHtml(row.action || '-') + '<br>' +
          '버전: ' + escapeHtml(row.last_app_version || row.first_app_version || '-') + ' · 기기: ' + escapeHtml(row.device || '-') + '<br>' +
          '회원참조: ' + escapeHtml(row.last_member_ref || '-') + ' · 장비코드: ' + escapeHtml(row.last_equipment_code || '-') + ' · 장비번호: ' + escapeHtml(row.last_equipment_no || '-') + '<br>' +
          '최초: ' + escapeHtml(formatDate(row.first_seen_at)) + (row.admin_note ? '<br>관리자 메모: ' + escapeHtml(row.admin_note) : '') +
        '</div>' +
        (contextText && contextText !== '{}' ? '<details class="sp-em-meta"><summary>오류 상세정보</summary><pre style="white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto">' + escapeHtml(contextText) + '</pre></details>' : '') +
        '<div class="sp-em-actions">' +
          '<button type="button" class="' + (resolved ? 'ghost' : 'primary') + '" onclick="sitepassSetErrorResolvedV537(' + Number(row.id || 0) + ',' + (resolved ? 'false' : 'true') + ')">' + (resolved ? '미해결로 되돌리기' : '해결 처리') + '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  async function loadAdminLogs(filter){
    if (filter) adminFilter = filter;
    var panel = adminPanel();
    if (!panel || adminLoading) return;
    if (!panel.classList.contains('sp-error-monitor') || !document.getElementById('sitepassErrorRowsV537')) renderAdminShell();
    var rowsBox = document.getElementById('sitepassErrorRowsV537');
    var statusBox = document.getElementById('sitepassErrorServerStatusV537');
    if (rowsBox) rowsBox.innerHTML = '<div class="sp-em-empty">서버 오류 로그를 불러오는 중입니다.</div>';
    adminLoading = true;
    try {
      var client = window.sitepassSupabase;
      if (!client || typeof client.rpc !== 'function') throw new Error('Supabase 연결이 아직 준비되지 않았습니다.');
      var result = await client.rpc(LIST_RPC, { p_admin:getAdminPayload(), p_status:adminFilter, p_limit:100 });
      if (result && result.error) throw result.error;
      var payload = normalizeRpcData(result && result.data);
      if (payload.ok === false) throw new Error(payload.message || '관리자 오류 로그 권한을 확인하지 못했습니다.');
      monitorServerState = { ok:true, message:'오류 로그 서버 연결 정상' };

      // v23.7.540: 수정본 배포 후 서버 정상과 무재발이 확인된 과거 오류는
      // 관리자가 일일이 누르지 않아도 자동으로 해결완료 처리합니다.
      var autoResolved = await autoResolveKnownRows(payload.rows);
      if (autoResolved > 0) {
        var refreshed = await client.rpc(LIST_RPC, { p_admin:getAdminPayload(), p_status:adminFilter, p_limit:100 });
        if (refreshed && !refreshed.error) {
          var refreshedPayload = normalizeRpcData(refreshed.data);
          if (refreshedPayload && refreshedPayload.ok !== false) payload = refreshedPayload;
        }
      }

      adminLastLoadedAt = Date.now();
      renderAdminRows(payload);
    } catch (e) {
      var msg = text(e && (e.message || e.details || e) || '오류 로그 조회 실패',800);
      monitorServerState = { ok:false, message:msg };
      if (statusBox) statusBox.textContent = '오류 로그를 불러오지 못했습니다: ' + msg;
      var local = readLocal();
      var roleGuide = /sitepass_members|관리자 서버 권한|role/i.test(msg)
        ? 'Supabase에서 v538 관리자 권한 보완 SQL을 한 번 실행해주세요. sitepass@kakao.com 행의 role은 super_admin이어야 합니다.'
        : '오류 모니터링 SQL과 Supabase 연결상태를 확인해주세요.';
      if (rowsBox) rowsBox.innerHTML = '<div class="sp-em-empty">' + escapeHtml(roleGuide) + '</div>' +
        (local.length ? '<div class="sp-em-local">이 기기에 임시 저장된 오류 ' + local.length + '건은 서버 연결 후 자동 전송됩니다.</div>' : '');
    } finally {
      adminLoading = false;
    }
  }

  async function setResolved(id, resolved){
    id = Number(id || 0);
    if (!id) return;
    var note = resolved ? prompt('해결 메모를 입력해주세요. 비워도 됩니다.', '') : '';
    if (resolved && note === null) return;
    try {
      var client = window.sitepassSupabase;
      if (!client || typeof client.rpc !== 'function') throw new Error('Supabase 연결 없음');
      var result = await client.rpc(STATUS_RPC, { p_admin:getAdminPayload(), p_id:id, p_resolved:!!resolved, p_note:text(note || '',500) });
      if (result && result.error) throw result.error;
      var payload = normalizeRpcData(result && result.data);
      if (payload.ok === false) throw new Error(payload.message || '상태 변경 실패');
      await loadAdminLogs(adminFilter);
    } catch (e) {
      alert('오류 상태 변경에 실패했습니다.\n' + text(e && e.message || e,500));
    }
  }

  function createTest(){
    capture('test', new Error('관리자 오류 로그 연결 테스트'), { severity:'info', action:'admin_test', context:{ test:true } });
    alert('테스트 오류를 기록했습니다. 잠시 후 새로고침을 눌러 확인해주세요.');
    setTimeout(function(){ loadAdminLogs(adminFilter); }, 1300);
  }

  function clearLocal(){
    if (!confirm('이 기기에 임시 저장된 오류기록만 삭제할까요? 서버 기록은 삭제되지 않습니다.')) return;
    writeLocal([]);
    loadAdminLogs(adminFilter);
  }

  function installGlobalListeners(){
    window.addEventListener('error', function(event){
      try {
        var target = event && event.target;
        if (target && target !== window && (target.src || target.href)) {
          capture('resource_load', new Error('파일을 불러오지 못했습니다.'), {
            action:String(target.tagName || 'resource').toLowerCase(),
            context:{ resource:text(target.src || target.href,500) }
          });
          return;
        }
        capture('javascript', event && (event.error || event.message) || '화면 오류', {
          action:'window.error',
          context:{ filename:text(event && event.filename,300), line:event && event.lineno, column:event && event.colno }
        });
      } catch (e) {}
    }, true);
    window.addEventListener('unhandledrejection', function(event){
      try { capture('javascript', event && event.reason || '처리되지 않은 비동기 오류', { action:'unhandledrejection' }); } catch (e) {}
    });
    window.addEventListener('online', scheduleFlush);
  }

  function startAdminWatcher(){
    setInterval(function(){
      try {
        var screen = document.getElementById('adminScreen');
        var panel = adminPanel();
        if (!screen || !panel || screen.classList.contains('hidden')) return;
        var style = window.getComputedStyle ? getComputedStyle(screen) : null;
        if (style && style.display === 'none') return;
        if (!panel.classList.contains('sp-error-monitor')) renderAdminShell();
        if (!adminLoading && Date.now() - adminLastLoadedAt > 30000) loadAdminLogs(adminFilter);
      } catch (e) {}
    }, 1500);
  }

  window.SitePassErrorMonitor = {
    version:VERSION,
    capture:capture,
    flush:flushLocal,
    loadAdmin:loadAdminLogs,
    setResolved:setResolved,
    getLocal:readLocal,
    getServerState:function(){ return Object.assign({}, monitorServerState); },
    installHooks:installOperationHooks
  };
  window.sitepassCaptureErrorV537 = capture;
  window.sitepassLoadErrorLogsV537 = loadAdminLogs;
  window.sitepassSetErrorResolvedV537 = setResolved;
  window.sitepassCreateErrorTestV537 = createTest;
  window.sitepassClearLocalErrorLogsV537 = clearLocal;

  installGlobalListeners();
  document.addEventListener('DOMContentLoaded', function(){
    injectStyles();
    installOperationHooks();
    startAdminWatcher();
    setTimeout(flushLocal, 1200);
  });
  window.addEventListener('load', function(){
    installOperationHooks();
    setTimeout(flushLocal, 500);
  });
})();
