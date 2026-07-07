// SitePass v23.7.331 - v23.7.292 쪼개기 완료 기준 푸시알림 보조 유지
// 이 파일에는 알림 권한 요청, 테스트 푸시, 알림 대상 계산, 구독정보 저장 준비 기능을 둡니다.
(function(){
  'use strict';

  const APP_VERSION = 'v23.7.331';
  const STORAGE_PREFIX = 'sitepass_push_notify_v23_7_283';
  const SUBSCRIPTION_KEY = STORAGE_PREFIX + '_subscription';
  const PERMISSION_LOG_KEY = STORAGE_PREFIX + '_permission_log';
  const LAST_DRAFT_NOTICE_KEY = STORAGE_PREFIX + '_draft_notice_sent';
  const LAST_TEST_KEY = STORAGE_PREFIX + '_last_test';
  const PUSH_TABLE = 'sitepass_push_subscriptions';

  function storage(){ return window.SitePassStorage || {}; }
  function supabaseApi(){ return window.SitePassSupabaseApi || {}; }
  function getConfig(){ return window.SITEPASS_DB_CONFIG || {}; }
  function nowIso(){ return new Date().toISOString(); }

  function safeJsonParse(text, fallback){
    if (!text) return fallback;
    try { return JSON.parse(text); } catch (e) { return fallback; }
  }

  function readLocal(key, fallback){
    const s = storage();
    if (s.getJson) return s.getJson(key, fallback);
    try { return safeJsonParse(localStorage.getItem(key), fallback); } catch (e) { return fallback; }
  }

  function writeLocal(key, value){
    const s = storage();
    if (s.setJson) return s.setJson(key, value);
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  function readLocalText(key, fallback){
    const s = storage();
    if (s.getItem) return s.getItem(key, fallback);
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
  }

  function writeLocalText(key, value){
    const s = storage();
    if (s.setItem) return s.setItem(key, value);
    try { localStorage.setItem(key, String(value || '')); return true; } catch (e) { return false; }
  }

  function getNotificationPermission(){
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission || 'default';
  }

  function isStandalone(){
    return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      !!window.navigator.standalone;
  }

  function getSupportStatus(){
    const hasSw = 'serviceWorker' in navigator;
    const hasNotification = 'Notification' in window;
    const hasPush = 'PushManager' in window;
    const permission = getNotificationPermission();
    return {
      serviceWorker: hasSw,
      notification: hasNotification,
      pushManager: hasPush,
      permission,
      standalone: isStandalone(),
      canLocalTest: hasSw && hasNotification && permission === 'granted',
      canRealPush: hasSw && hasNotification && hasPush && permission === 'granted'
    };
  }

  async function getServiceWorkerRegistration(){
    if (!('serviceWorker' in navigator)) return null;
    try {
      let reg = await navigator.serviceWorker.ready;
      if (!reg) reg = await navigator.serviceWorker.register('./sw.js');
      return reg || null;
    } catch (e) {
      try { return await navigator.serviceWorker.register('./sw.js'); } catch (err) { return null; }
    }
  }

  async function ensurePermissionForPush(options){
    const silentIfGranted = !!(options && options.silentIfGranted);
    if (!('Notification' in window)) {
      if (!silentIfGranted) alert('이 브라우저는 휴대폰 푸시알림을 지원하지 않습니다.');
      return 'unsupported';
    }
    let result = Notification.permission;
    if (result === 'default') {
      try { result = await Notification.requestPermission(); } catch (e) { result = Notification.permission; }
    }
    writeLocal(PERMISSION_LOG_KEY, { permission: result, checkedAt: nowIso(), appVersion: APP_VERSION });
    if (result === 'granted') {
      await getServiceWorkerRegistration();
      const saved = await saveSubscriptionIfPossible();
      if (!silentIfGranted) {
        const msg = saved && saved.error
          ? '푸시알림 권한은 허용되었습니다.\n다만 서버 구독 저장은 아직 확인이 필요합니다.\n아래 마지막 오류 문구를 확인해주세요.'
          : '푸시알림 권한이 허용되었습니다.\n이제 테스트 알림을 보내서 휴대폰 상단에 뜨는지 확인하세요.';
        alert(msg);
      }
    } else if (result === 'denied') {
      if (!silentIfGranted) alert('푸시알림이 차단되어 있습니다.\n휴대폰 브라우저 또는 SitePass 앱 설정에서 알림 허용으로 바꿔야 합니다.');
    } else {
      if (!silentIfGranted) alert('푸시알림 권한이 아직 허용되지 않았습니다.');
    }
    refreshPanel();
    return result;
  }

  async function requestPermission(){
    return ensurePermissionForPush({ silentIfGranted:false });
  }

  function urlBase64ToUint8Array(base64String){
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  let cachedVapidPublicKey = '';

  function getPushFunctionName(){
    const cfg = getConfig();
    return String(cfg.pushFunctionName || 'send-push').trim() || 'send-push';
  }

  function getVapidPublicKey(){
    const cfg = getConfig();
    return String(cfg.vapidPublicKey || cfg.pushVapidPublicKey || cachedVapidPublicKey || '').trim();
  }

  function getFunctionEndpoint(){
    const cfg = getConfig();
    const base = String(cfg.supabaseUrl || '').replace(/\/$/, '');
    if (!base) return '';
    return base + '/functions/v1/' + encodeURIComponent(getPushFunctionName());
  }

  function getAnonKey(){
    const cfg = getConfig();
    return String(cfg.supabaseAnonKey || cfg.anonKey || '').trim();
  }

  async function invokePushFunctionDirect(payload){
    const url = getFunctionEndpoint();
    if (!url) return { data:null, error:{ message:'Supabase 함수 주소 없음' } };
    const anon = getAnonKey();
    try {
      const res = await fetch(url, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          ...(anon ? { 'apikey': anon, 'Authorization': 'Bearer ' + anon } : {})
        },
        body: JSON.stringify(payload || {})
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw:text }; }
      if (!res.ok || (data && data.ok === false)) {
        return { data, error:{ message:(data && (data.error || data.message)) || ('HTTP ' + res.status), status:res.status } };
      }
      return { data, error:null };
    } catch (e) {
      return { data:null, error:e };
    }
  }

  async function invokePushFunction(payload){
    const client = window.sitepassSupabase || null;
    let firstError = null;
    if (client && client.functions && typeof client.functions.invoke === 'function') {
      try {
        const res = await client.functions.invoke(getPushFunctionName(), { body: payload || {} });
        if (!res || !res.error) return res;
        firstError = res.error;
      } catch (e) {
        firstError = e;
      }
    }
    const direct = await invokePushFunctionDirect(payload || {});
    if (direct && !direct.error) return direct;
    if (firstError && direct && direct.error) {
      return { data:direct.data, error:{ message:'Functions invoke 실패: ' + (firstError.message || JSON.stringify(firstError)) + ' / 직접호출 실패: ' + (direct.error.message || JSON.stringify(direct.error)) } };
    }
    return direct || { data:null, error:{ message:'Supabase Functions 연결 없음' } };
  }

  async function getVapidPublicKeyAsync(){
    const direct = getVapidPublicKey();
    if (direct) return direct;
    const res = await invokePushFunction({ action: 'publicKey' });
    if (res && res.error) {
      writeLocalText(STORAGE_PREFIX + '_last_error', 'VAPID public key 요청 실패: ' + (res.error.message || JSON.stringify(res.error)));
      return '';
    }
    const key = String((res && res.data && (res.data.publicKey || res.data.vapidPublicKey)) || '').trim();
    if (key) cachedVapidPublicKey = key;
    return key;
  }

  function getCurrentMemberForPush(){
    try {
      if (typeof window.getCurrentMemberTest === 'function') return window.getCurrentMemberTest();
    } catch (e) {}
    try {
      const keys = Object.keys(localStorage || {});
      const currentKey = keys.find(k => /_currentMember$/.test(k) || /currentMember/i.test(k));
      if (currentKey) return safeJsonParse(localStorage.getItem(currentKey), null);
    } catch (e) {}
    return null;
  }

  async function saveSubscriptionRow(subscription, extra){
    const member = getCurrentMemberForPush() || {};
    const row = {
      id: (member.id || member.signupId || member.providerId || 'browser') + ':' + btoa((subscription && subscription.endpoint) || 'local').replace(/=+$/,''),
      member_id: member.id || '',
      signup_id: member.signupId || member.loginId || '',
      provider: member.provider || member.signupMethod || '',
      endpoint: subscription && subscription.endpoint ? subscription.endpoint : '',
      subscription_json: subscription ? JSON.stringify(subscription) : '',
      permission: getNotificationPermission(),
      device_info: navigator.userAgent || '',
      app_version: APP_VERSION,
      updated_at: nowIso(),
      created_at: nowIso(),
      memo: extra && extra.memo ? extra.memo : 'SitePass PWA 푸시알림 구독 준비'
    };
    writeLocal(SUBSCRIPTION_KEY, row);
    const api = supabaseApi();
    if (!api.upsert) return { data: row, error: { message: 'Supabase API 모듈 없음 - 브라우저에만 저장됨' } };
    try {
      const res = await api.upsert(PUSH_TABLE, row, { onConflict: 'id' });
      return res;
    } catch (e) {
      return { data: row, error: e };
    }
  }

  async function saveSubscriptionIfPossible(){
    const status = getSupportStatus();
    if (!status.serviceWorker || !status.notification || status.permission !== 'granted') {
      return { data: null, error: { message: '푸시 권한 또는 서비스워커 없음' } };
    }
    const reg = await getServiceWorkerRegistration();
    if (!reg) return { data: null, error: { message: '서비스워커 등록 없음' } };

    const vapidKey = await getVapidPublicKeyAsync();
    if (!('PushManager' in window) || !vapidKey) {
      // VAPID 키가 아직 없으면 실제 서버 푸시 구독은 못 만들지만, 권한 허용 기기 기록은 남깁니다.
      const msg = !('PushManager' in window) ? 'PushManager 미지원' : 'VAPID public key를 Edge Function에서 받지 못함';
      writeLocalText(STORAGE_PREFIX + '_last_error', msg);
      return saveSubscriptionRow(null, { memo: msg + ' - 테스트 알림/권한 기록만 저장' });
    }

    try {
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });
      }
      return saveSubscriptionRow(sub.toJSON ? sub.toJSON() : sub, { memo: 'Web Push 구독 저장' });
    } catch (e) {
      return { data: null, error: e };
    }
  }

  async function sendLocalTestNotification(){
    const permission = await ensurePermissionForPush({ silentIfGranted:true });
    if (permission !== 'granted') { alert('알림 권한이 허용되어야 테스트할 수 있습니다.'); return; }
    const reg = await getServiceWorkerRegistration();
    const title = 'SitePass 푸시알림 테스트';
    const body = '휴대폰 상단에 이 알림이 보이면 기본 알림 권한은 정상입니다.';
    const options = {
      body,
      icon: './icons/sitepass-icon-192.png',
      badge: './icons/sitepass-icon-192.png',
      tag: 'sitepass-test-push',
      data: { url: './', type: 'test', createdAt: nowIso() },
      renotify: true
    };
    try {
      if (reg && reg.showNotification) await reg.showNotification(title, options);
      else new Notification(title, options);
      writeLocal(LAST_TEST_KEY, { sentAt: nowIso(), appVersion: APP_VERSION });
    } catch (e) {
      const msg = e && e.message ? e.message : String(e || '알 수 없는 오류');
      writeLocalText(STORAGE_PREFIX + '_last_error', '기기 알림 테스트 실패: ' + msg);
      alert('테스트 알림 표시 중 오류가 났습니다.\n' + msg + '\n\n브라우저 알림 권한과 홈화면 설치 상태를 확인해주세요.');
    }
    refreshPanel();
  }

  function parseDateOnly(value){
    if (!value) return null;
    if (value instanceof Date && !isNaN(value)) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const text = String(value || '').trim();
    if (!text) return null;
    const m = text.match(/(\d{4})[-./년\s]*(\d{1,2})[-./월\s]*(\d{1,2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(text);
    if (isNaN(d)) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function todayDate(){
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function daysUntil(dateValue){
    const d = parseDateOnly(dateValue);
    if (!d) return null;
    const t = todayDate();
    return Math.round((d.getTime() - t.getTime()) / 86400000);
  }

  function shouldNotifyExpiry(dateValue){
    const d = daysUntil(dateValue);
    return d === 7 || d === 0;
  }

  function expiryLabel(dateValue){
    const d = daysUntil(dateValue);
    if (d === 7) return '7일 후 만료';
    if (d === 0) return '오늘 만료';
    return '';
  }

  function collectDocsFromItem(item){
    const out = [];
    const docs = item && item.docs;
    if (!docs) return out;
    if (Array.isArray(docs)) return docs;
    Object.keys(docs).forEach(key => {
      const doc = docs[key];
      if (doc && typeof doc === 'object') out.push(Object.assign({ key }, doc));
    });
    return out;
  }

  function getDocExpireDate(doc){
    return doc && (doc.expireDate || doc.expiryDate || doc.date || doc.expire_at || doc.expires_at || doc.inspectionExpireDate || doc.insuranceExpireDate || '');
  }

  function getItemTitle(item){
    const name = item?.equipmentName || item?.machineName || item?.type || item?.title || '장비';
    const no = item?.equipmentNo || item?.equipmentNumber || item?.plateNo || item?.number || item?.code || '';
    return (name + (no ? ' ' + no : '')).trim();
  }

  function collectDocumentExpiryAlerts(items){
    const list = [];
    (Array.isArray(items) ? items : []).forEach(item => {
      collectDocsFromItem(item).forEach(doc => {
        const expire = getDocExpireDate(doc);
        if (!shouldNotifyExpiry(expire)) return;
        const title = doc.title || doc.name || doc.docTitle || doc.key || '서류';
        list.push({
          type: 'document-expiry',
          title: 'SitePass 서류 만료 알림',
          body: getItemTitle(item) + ' ' + title + '이 ' + (daysUntil(expire) === 7 ? '7일 후 만료됩니다.' : '오늘 만료됩니다.'),
          due: expiryLabel(expire),
          itemCode: item?.code || '',
          docKey: doc.key || '',
          expireDate: expire
        });
      });
    });
    return list;
  }

  function getPaymentExpireDate(target){
    return target && (target.paidUntil || target.paymentEndsAt || target.serviceEndsAt || target.trialEndsAt || target.planEndsAt || target.expireDate || '');
  }

  function collectPaymentExpiryAlerts(items, members){
    const list = [];
    const seen = new Set();
    function add(target, label){
      const expire = getPaymentExpireDate(target);
      if (!shouldNotifyExpiry(expire)) return;
      const key = (target?.id || target?.code || target?.signupId || label || '') + ':' + expire;
      if (seen.has(key)) return;
      seen.add(key);
      list.push({
        type: 'payment-expiry',
        title: 'SitePass 이용권 만료 알림',
        body: daysUntil(expire) === 7
          ? '이용권이 7일 후 만료됩니다. 계속 사용하려면 이용권을 연장해야 합니다.'
          : '이용권이 오늘 만료됩니다. 오늘까지 연장하지 않으면 QR 공유와 서류 열람이 제한될 수 있습니다.',
        due: expiryLabel(expire),
        expireDate: expire,
        targetLabel: label || target?.name || target?.code || ''
      });
    }
    (Array.isArray(items) ? items : []).forEach(item => add(item, getItemTitle(item)));
    (Array.isArray(members) ? members : []).forEach(member => add(member, member?.name || member?.signupId || '회원'));
    return list;
  }

  function collectDraftReminderAlerts(){
    const list = [];
    let draft = null;
    let draftKey = '';
    try {
      const keys = Object.keys(localStorage || {});
      draftKey = keys.find(k => /registration_draft/i.test(k) && !/prompt_seen/i.test(k)) || '';
      if (draftKey) draft = safeJsonParse(localStorage.getItem(draftKey), null);
    } catch (e) {}
    if (!draft) return list;
    const updated = parseDateOnly(draft.updatedAt || draft.savedAt || draft.createdAt || draft.startedAt || '');
    if (!updated) return list;
    const diff = Math.round((todayDate().getTime() - updated.getTime()) / 86400000);
    const completed = !!(draft.completed || draft.saved || draft.submitted || draft.finishedAt);
    if (completed || diff < 1) return list;
    const todayKey = todayDate().toISOString().slice(0, 10);
    const sentMap = readLocal(LAST_DRAFT_NOTICE_KEY, {});
    if (sentMap[draftKey] === todayKey) return list;
    list.push({
      type: 'draft-reminder',
      title: 'SitePass 작성중 서류 알림',
      body: '작성 중인 장비서류가 있습니다. 이어서 완료해주세요.',
      due: '작성 중단 다음날 1회',
      draftKey
    });
    return list;
  }

  function normalizePushStorageKey(value){
    return String(value || '');
  }

  function looksLikeEquipmentItem(value){
    return !!(value && typeof value === 'object' && (value.code || value.equipmentNo || value.equipment_no || value.equipmentName || value.equipment_name || value.docs || value.documents));
  }

  function looksLikeMemberItem(value){
    return !!(value && typeof value === 'object' && (value.signupId || value.loginId || value.providerId || value.authUserId || value.phone || value.name || value.termsAgreedAt || value.terms_agreed_at));
  }

  function mergeUniqueByPushKey(list, keyGetter){
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach(item => {
      if (!item || typeof item !== 'object') return;
      const key = keyGetter(item) || JSON.stringify(item).slice(0, 120);
      const existing = map.get(key) || {};
      map.set(key, { ...existing, ...item });
    });
    return Array.from(map.values());
  }

  function getItemsSafe(){
    const lists = [];
    try {
      if (typeof window.getItems === 'function') {
        const value = window.getItems();
        if (Array.isArray(value)) lists.push(value);
      }
    } catch (e) {}
    try {
      const keys = Object.keys(localStorage || {});
      keys.forEach(key => {
        const normalized = normalizePushStorageKey(key);
        const value = safeJsonParse(localStorage.getItem(key), null);
        if (Array.isArray(value) && value.some(looksLikeEquipmentItem)) {
          if (/server_equipment_cache|sitePass_v23_7_7_update_original_corrected$|_pending_registration_payment|sitePass_v23/i.test(normalized)) lists.push(value);
        } else if (value && typeof value === 'object') {
          const item = value.item || value.pendingItem || value.equipmentItem || null;
          if (looksLikeEquipmentItem(item)) lists.push([item]);
        }
      });
    } catch (e) {}
    let merged = mergeUniqueByPushKey([].concat.apply([], lists), item => String(item.code || item.equipmentNo || item.equipment_no || '').trim());
    try {
      if (window.SitePassArchive && typeof window.SitePassArchive.filterArchiveVisibleItems === 'function') merged = window.SitePassArchive.filterArchiveVisibleItems(merged);
    } catch (e) {}
    return merged;
  }

  function memberFromServerRow(row){
    if (!row || typeof row !== 'object') return null;
    return {
      id: row.id || row.member_id || row.auth_user_id || '',
      signupId: row.signup_id || row.signupId || row.login_id || '',
      loginId: row.login_id || row.loginId || '',
      providerId: row.provider_id || row.providerId || '',
      authUserId: row.auth_user_id || row.authUserId || '',
      email: row.email || '',
      name: row.name || row.full_name || '',
      phone: row.phone || '',
      status: row.status || row.member_status || '',
      memberStatus: row.member_status || row.status || '',
      paymentStatus: row.payment_status || '',
      serviceStatus: row.service_status || '',
      termsAgreedAt: row.terms_agreed_at || row.termsAgreedAt || '',
      role: row.role || '',
      signupMethod: row.provider || row.signup_method || ''
    };
  }

  function getMembersSafe(){
    const lists = [];
    try {
      if (typeof window.getMembers === 'function') {
        const value = window.getMembers();
        if (Array.isArray(value)) lists.push(value);
      }
    } catch (e) {}
    try {
      const runtime = window.SitePassAdminRuntime || {};
      if (typeof runtime.getServerMemberRows === 'function') {
        const rows = runtime.getServerMemberRows();
        if (Array.isArray(rows)) lists.push(rows.map(memberFromServerRow).filter(Boolean));
      }
    } catch (e) {}
    try {
      const keys = Object.keys(localStorage || {});
      keys.forEach(key => {
        const value = safeJsonParse(localStorage.getItem(key), null);
        if (Array.isArray(value) && value.some(looksLikeMemberItem)) {
          if (/_members$|sitepass_members|member/i.test(key)) lists.push(value);
        } else if (looksLikeMemberItem(value) && /currentMember|pwa_auto_member|member/i.test(key)) {
          lists.push([value]);
        }
      });
    } catch (e) {}
    return mergeUniqueByPushKey([].concat.apply([], lists), member => String(member.id || member.signupId || member.loginId || member.providerId || member.authUserId || member.phone || member.name || '').trim());
  }

  function normalizePushText(value){
    return String(value ?? '').trim().toLowerCase();
  }

  function isInactiveStatusText(value){
    const text = normalizePushText(value);
    if (!text) return false;
    return [
      'withdrawn','deleted','force_withdrawn','orphan_deleted','inactive','removed','blocked','stopped','disabled','cancelled','canceled',
      '탈퇴','회원탈퇴','강제탈퇴','삭제','정리','정지','차단','고아장비','고아자료'
    ].some(word => text.includes(word));
  }

  function isSampleOrAdminOnly(member){
    const id = normalizePushText(member?.id || member?.signupId || member?.loginId || member?.providerId || '');
    const role = normalizePushText(member?.role || member?.adminRole || member?.signupMethod || '');
    if (!member) return true;
    if (member.isSuperAdminVirtual) return true;
    if (id === 'super-admin' || id.includes('mem-sample')) return true;
    if (role.includes('최고관리자') || role.includes('super_admin')) return true;
    return false;
  }

  function isActiveMemberForPush(member){
    if (!member || isSampleOrAdminOnly(member)) return false;
    if (member.withdrawn || member.deleted || member.isDeleted || member.forceWithdrawn || member.isWithdrawn) return false;
    const fields = [member.status, member.plan_type, member.paymentStatus, member.serviceStatus, member.memberStatus, member.adminLastAction];
    if (fields.some(isInactiveStatusText)) return false;
    return true;
  }

  function pushKey(value){
    return normalizePushText(value).replace(/[^0-9a-z가-힣@._-]/g,'');
  }

  function getActiveMemberKeysForPush(activeMembers){
    return new Set((activeMembers || []).flatMap(m => [
      m.id, m.signupId, m.signup_id, m.loginId, m.login_id, m.providerId, m.provider_id,
      m.authUserId, m.auth_user_id, m.email, m.phone, m.name
    ]).filter(Boolean).map(pushKey));
  }

  function getEquipmentOwnerValuesForPush(item){
    return [
      item.owner_member_id, item.ownerMemberId, item.owner_signup_id, item.ownerSignupId, item.owner_provider_id, item.ownerProviderId,
      item.member_id, item.memberId, item.signup_id, item.signupId, item.userId, item.createdBy, item.created_by,
      item.owner_phone, item.ownerPhone, item.phone, item.owner_name, item.ownerName, item.owner_login_id, item.ownerLoginId
    ].filter(Boolean).map(pushKey);
  }

  function isActiveEquipmentForPush(item, activeMembers){
    if (!item || typeof item !== 'object') return false;
    if (item.isDeleted || item.deleted || item.withdrawn || item.forceWithdrawn || item.isOrphan || item.is_deleted) return false;
    const fields = [item.status, item.payment_status, item.paymentStatus, item.service_status, item.serviceStatus, item.save_reason, item.saveReason];
    if (fields.some(isInactiveStatusText)) return false;
    const members = Array.isArray(activeMembers) ? activeMembers : [];
    if (!members.length) return false;
    const activeKeys = getActiveMemberKeysForPush(members);
    if (!activeKeys.size) return false;
    const ownerValues = getEquipmentOwnerValuesForPush(item);
    if (ownerValues.length && ownerValues.some(v => activeKeys.has(v))) return true;
    // v23.7.289: 장비등록 직후 owner 키가 누락된 결제완료/결제대기 자료도
    // 단일 활성 회원 테스트 환경에서는 푸시관리의 활성장비에 표시합니다.
    // 회원이 0명이거나 여러 명일 때는 고아장비 오진입을 막기 위해 제외합니다.
    if (!ownerValues.length && members.length === 1 && (item.code || item.equipmentNo || item.equipmentName)) return true;
    return false;
  }

  function getAlertBreakdown(){
    const rawMembers = getMembersSafe();
    const members = rawMembers.filter(isActiveMemberForPush);
    const rawItems = getItemsSafe();
    const items = rawItems.filter(item => isActiveEquipmentForPush(item, members));
    const docs = collectDocumentExpiryAlerts(items);
    const payments = collectPaymentExpiryAlerts(items, members);
    const drafts = (members.length || items.length) ? collectDraftReminderAlerts() : [];
    return { rawMembers, members, rawItems, items, docs, payments, drafts, all: [].concat(docs, payments, drafts) };
  }

  function collectDueAlerts(){
    return getAlertBreakdown().all;
  }

  async function showDueAlertsPreview(){
    const bd = getAlertBreakdown();
    const list = bd.all;
    const activeEquipmentNames = (bd.items || []).slice(0, 5).map(getEquipmentShortTextForPush).join(', ');
    const summary = '활성회원 ' + bd.members.length + '명 / 활성장비 ' + bd.items.length + '대' + (activeEquipmentNames ? ' (' + activeEquipmentNames + ((bd.items || []).length > 5 ? ' 외 ' + ((bd.items || []).length - 5) + '대' : '') + ')' : '') + '\n' +
      '서류만료 ' + bd.docs.length + '건 / 이용권만료 ' + bd.payments.length + '건 / 작성중 ' + bd.drafts.length + '건';
    if (!list.length) {
      alert('현재 기준으로 발송 대상 푸시알림이 없습니다.\n\n' + summary + '\n\n서류/이용권은 만료 7일 전 또는 만료일 당일만 대상입니다.\n작성중 서류는 다음날 1회만 대상입니다.');
      return;
    }
    const text = list.slice(0, 10).map((x, i) => (i + 1) + '. [' + x.due + '] ' + x.title + '\n' + x.body).join('\n\n');
    alert('현재 발송 대상 알림 ' + list.length + '건\n' + summary + '\n\n' + text + (list.length > 10 ? '\n\n외 ' + (list.length - 10) + '건' : ''));
  }

  async function sendFirstDueAlertAsTest(){
    const list = collectDueAlerts();
    if (!list.length) {
      alert('현재 발송 대상 알림이 없습니다. 먼저 테스트 푸시를 보내서 권한을 확인하세요.');
      return;
    }
    const permission = await ensurePermissionForPush({ silentIfGranted:true });
    if (permission !== 'granted') { alert('알림 권한이 허용되어야 테스트할 수 있습니다.'); return; }
    const reg = await getServiceWorkerRegistration();
    const first = list[0];
    try {
      if (reg && reg.showNotification) await reg.showNotification(first.title, {
        body: first.body,
        icon: './icons/sitepass-icon-192.png',
        badge: './icons/sitepass-icon-192.png',
        tag: 'sitepass-due-alert-test',
        data: { url: './', type: first.type, createdAt: nowIso() }
      });
    } catch (e) {
      alert('대상 알림 테스트 표시 중 오류가 났습니다.');
    }
  }

  async function resavePushSubscription(){
    const permission = await ensurePermissionForPush({ silentIfGranted:true });
    if (permission !== 'granted') { alert('알림 권한이 허용되어야 구독을 저장할 수 있습니다.'); return; }
    const res = await saveSubscriptionIfPossible();
    const localSub = readLocal(SUBSCRIPTION_KEY, null);
    const err = res && res.error ? (res.error.message || JSON.stringify(res.error)) : '';
    if (localSub && localSub.endpoint) {
      alert('푸시 구독기록을 저장했습니다.\n이제 서버 푸시 테스트를 눌러보세요.');
    } else {
      alert('푸시 구독기록 저장을 확인하지 못했습니다.\n\n마지막 오류: ' + (err || readLocalText(STORAGE_PREFIX + '_last_error', '') || '알 수 없음'));
    }
    refreshPanel();
  }

  async function sendServerTestPush(){
    const permission = await ensurePermissionForPush({ silentIfGranted:true });
    if (permission !== 'granted') { alert('알림 권한이 허용되어야 서버 푸시를 테스트할 수 있습니다.'); return; }
    const saved = await saveSubscriptionIfPossible();
    const localSub = readLocal(SUBSCRIPTION_KEY, null);
    let subscription = null;
    try { subscription = safeJsonParse(localSub && localSub.subscription_json, null); } catch (e) { subscription = null; }
    if (!subscription || !subscription.endpoint) {
      const last = readLocalText(STORAGE_PREFIX + '_last_error', '');
      alert('서버 푸시 구독정보가 없습니다.\n\n확인할 것:\n1) send-push Edge Function Verify JWT OFF\n2) VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY Secrets 저장\n3) 알림 권한 허용\n4) HTTPS 또는 홈화면 PWA에서 실행\n\n마지막 상태: ' + (last || '구독 생성 전'));
      return;
    }
    const res = await invokePushFunction({
      action: 'test',
      endpoint: subscription.endpoint,
      subscription,
      title: 'SitePass 서버 푸시 테스트',
      body: 'Supabase Edge Function + VAPID 연결이 정상입니다.'
    });
    if (res && res.error) {
      const msg = res.error.message || JSON.stringify(res.error);
      writeLocalText(STORAGE_PREFIX + '_last_error', '서버 푸시 테스트 실패: ' + msg);
      alert('서버 푸시 테스트 실패:\n' + msg + '\n\nSupabase Edge Function 로그에서 send-push 오류도 같이 확인해주세요.');
      refreshPanel();
      return;
    }
    alert('서버 푸시 테스트를 보냈습니다. 휴대폰 상단 알림을 확인하세요.');
    refreshPanel();
  }

  function getStatusText(){
    const st = getSupportStatus();
    if (!st.notification) return '이 브라우저는 알림을 지원하지 않습니다.';
    if (!st.serviceWorker) return '서비스워커가 없어 PWA 푸시를 사용할 수 없습니다.';
    if (st.permission === 'granted') return '알림 허용됨 - 테스트 푸시 확인 가능';
    if (st.permission === 'denied') return '알림 차단됨 - 휴대폰 설정에서 허용 필요';
    return '알림 권한 대기중 - 권한 요청 필요';
  }

  function getEquipmentShortTextForPush(item){
    const name = item?.equipmentName || item?.equipment_name || '장비';
    const no = item?.equipmentNo || item?.equipment_no || item?.code || '';
    return String(name || '장비') + (no ? ' ' + String(no) : '');
  }

  function getActiveEquipmentSummaryText(items){
    const list = (Array.isArray(items) ? items : []).slice(0, 3).map(getEquipmentShortTextForPush).filter(Boolean);
    if (!list.length) return '';
    return ' · 장비: ' + escapeHtmlForPush(list.join(', ')) + ((items || []).length > 3 ? ' 외 ' + ((items || []).length - 3) + '대' : '');
  }

  function renderPanelHtml(){
    const st = getSupportStatus();
    const bd = getAlertBreakdown();
    const due = bd.all;
    const lastTest = readLocal(LAST_TEST_KEY, null);
    const localSub = readLocal(SUBSCRIPTION_KEY, null);
    const vapid = getVapidPublicKey();
    const lastError = readLocalText(STORAGE_PREFIX + '_last_error', '');
    return '' +
      '<div id="sitepassPushPanel" class="card" style="box-shadow:none;margin-top:14px;border:1px solid #d9e5ff;">' +
        '<h3>푸시알림 관리</h3>' +
        '<div class="notice blue-note">휴대폰 상단에 뜨는 PWA 푸시알림입니다. 기준은 <b>서류 만료 7일 전/만료일</b>, <b>이용권 만료 7일 전/만료일</b>, <b>작성중 서류 다음날 1회</b>입니다. 14일 전 알림과 반복 알림, 기사/인부 인증요청 푸시는 제외했습니다.</div>' +
        '<div class="small" style="margin:8px 0;"><b>상태:</b> ' + escapeHtmlForPush(getStatusText()) + ' · 권한: ' + escapeHtmlForPush(st.permission) + ' · 홈화면앱: ' + (st.standalone ? '예' : '아니오') + '</div>' +
        '<div class="actions" style="margin:8px 0 10px;">' +
          '<button type="button" class="primary" data-push-action="permission" onclick="sitepassRequestPushPermission()">알림 권한 요청</button>' +
          '<button type="button" class="secondary" data-push-action="local-test" onclick="sitepassSendTestPush()">기기 알림 테스트</button>' +
          '<button type="button" class="secondary" data-push-action="server-test" onclick="sitepassSendServerTestPush()">서버 푸시 테스트</button>' +
          '<button type="button" class="ghost" data-push-action="resubscribe" onclick="sitepassResavePushSubscription()">구독 다시 저장</button>' +
          '<button type="button" class="ghost" data-push-action="due-list" onclick="sitepassShowPushDueAlerts()">현재 알림 대상 확인</button>' +
          '<button type="button" class="ghost" data-push-action="due-test" onclick="sitepassSendDuePushPreview()">대상 1건 테스트</button>' +
        '</div>' +
        '<div class="small">현재 계산된 알림 대상: <b>' + due.length + '건</b>' +
          ' <span style="color:#64748b;">(서류 ' + bd.docs.length + ' / 이용권 ' + bd.payments.length + ' / 작성중 ' + bd.drafts.length + ')</span>' +
          '<br>활성회원: ' + bd.members.length + '명 · 활성장비: ' + bd.items.length + '대' + getActiveEquipmentSummaryText(bd.items) +
          '<br><span style="color:#64748b;">※ 장비가 있어도 만료일이 7일 전/당일이 아니면 알림 대상은 0건으로 보일 수 있습니다.</span>' +
          (lastTest?.sentAt ? '<br>마지막 테스트: ' + escapeHtmlForPush(lastTest.sentAt) : '') +
          (localSub && localSub.endpoint ? ' · 구독기록 저장됨' : ' · 구독기록 없음') +
          (!vapid ? '<br>※ VAPID/Edge Function 연결 전이면 기기 알림 테스트만 가능합니다. 서버 푸시 테스트는 연결 후 확인하세요.' : '') +
          (lastError ? '<br><span style="color:#b91c1c;font-weight:900;">마지막 오류: ' + escapeHtmlForPush(lastError) + '</span>' : '') +
        '</div>' +
      '</div>';
  }

  function escapeHtmlForPush(value){
    return String(value ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }

  function injectPanel(){
    const adminScreen = document.getElementById('adminScreen');
    const adminBox = document.getElementById('adminBox');
    if (!adminScreen || !adminBox || adminScreen.classList.contains('hidden')) return;
    const existing = document.getElementById('sitepassPushPanel');
    const html = renderPanelHtml();
    if (existing) {
      existing.outerHTML = html;
      return;
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const node = wrapper.firstElementChild;
    if (!node) return;
    const firstCard = adminBox.querySelector('.card');
    if (firstCard && firstCard.parentNode === adminBox) adminBox.insertBefore(node, firstCard);
    else adminBox.appendChild(node);
  }

  function refreshPanel(){
    setTimeout(injectPanel, 80);
  }

  function setupPushButtonDelegates(){
    if (window.__sitepassPushButtonDelegatesV286) return;
    window.__sitepassPushButtonDelegatesV286 = true;
    document.addEventListener('click', function(event){
      const btn = event.target && event.target.closest ? event.target.closest('[data-push-action]') : null;
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      const action = btn.getAttribute('data-push-action');
      if (action === 'permission') return requestPermission();
      if (action === 'local-test') return sendLocalTestNotification();
      if (action === 'server-test') return sendServerTestPush();
      if (action === 'resubscribe') return resavePushSubscription();
      if (action === 'due-list') return showDueAlertsPreview();
      if (action === 'due-test') return sendFirstDueAlertAsTest();
    }, true);
  }

  function boot(){
    setupPushButtonDelegates();
    refreshPanel();
    setInterval(refreshPanel, 2500);
    try {
      const observer = new MutationObserver(() => refreshPanel());
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  window.sitepassRequestPushPermission = requestPermission;
  window.sitepassSendTestPush = sendLocalTestNotification;
  window.sitepassSendServerTestPush = sendServerTestPush;
  window.sitepassShowPushDueAlerts = showDueAlertsPreview;
  window.sitepassResavePushSubscription = resavePushSubscription;
  window.sitepassSendDuePushPreview = sendFirstDueAlertAsTest;

  window.SitePassPushNotify = {
    version: APP_VERSION,
    getSupportStatus,
    requestPermission,
    sendLocalTestNotification,
    sendServerTestPush,
    saveSubscriptionIfPossible,
    resavePushSubscription,
    getAlertBreakdown,
    collectDueAlerts,
    invokePushFunction,
    invokePushFunctionDirect,
    collectDocumentExpiryAlerts,
    collectPaymentExpiryAlerts,
    collectDraftReminderAlerts,
    shouldNotifyExpiry,
    daysUntil,
    refreshPanel
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
