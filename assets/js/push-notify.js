// SitePass v23.7.276 - 푸시알림 기본 구조 분리
// 이 파일에는 알림 권한 요청, 테스트 푸시, 알림 대상 계산, 구독정보 저장 준비 기능을 둡니다.
(function(){
  'use strict';

  const APP_VERSION = 'v23.7.276';
  const STORAGE_PREFIX = 'sitepass_push_notify_v23_7_276';
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

  async function requestPermission(){
    if (!('Notification' in window)) {
      alert('이 브라우저는 휴대폰 푸시알림을 지원하지 않습니다.');
      return 'unsupported';
    }
    let result = Notification.permission;
    if (result === 'default') {
      try { result = await Notification.requestPermission(); } catch (e) { result = Notification.permission; }
    }
    writeLocal(PERMISSION_LOG_KEY, { permission: result, checkedAt: nowIso(), appVersion: APP_VERSION });
    if (result === 'granted') {
      await getServiceWorkerRegistration();
      await saveSubscriptionIfPossible();
      alert('푸시알림 권한이 허용되었습니다.\n이제 테스트 알림을 보내서 휴대폰 상단에 뜨는지 확인하세요.');
    } else if (result === 'denied') {
      alert('푸시알림이 차단되어 있습니다.\n휴대폰 브라우저 또는 SitePass 앱 설정에서 알림 허용으로 바꿔야 합니다.');
    } else {
      alert('푸시알림 권한이 아직 허용되지 않았습니다.');
    }
    refreshPanel();
    return result;
  }

  function urlBase64ToUint8Array(base64String){
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function getVapidPublicKey(){
    const cfg = getConfig();
    return String(cfg.vapidPublicKey || cfg.pushVapidPublicKey || '').trim();
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

    const vapidKey = getVapidPublicKey();
    if (!('PushManager' in window) || !vapidKey) {
      // VAPID 키가 아직 없으면 실제 서버 푸시 구독은 못 만들지만, 권한 허용 기기 기록은 남깁니다.
      return saveSubscriptionRow(null, { memo: 'VAPID 키 미설정 - 테스트 알림/권한 기록만 저장' });
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
    const permission = await requestPermission();
    if (permission !== 'granted') return;
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
      alert('테스트 알림 표시 중 오류가 났습니다.\n브라우저 알림 권한과 홈화면 설치 상태를 확인해주세요.');
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

  function getItemsSafe(){
    try { if (typeof window.getItems === 'function') return window.getItems(); } catch (e) {}
    try {
      const keys = Object.keys(localStorage || {});
      for (const key of keys) {
        if (/sitePass_v23_7_7_update_original_corrected$/.test(key) || /sitePass_v23/i.test(key)) {
          const value = safeJsonParse(localStorage.getItem(key), null);
          if (Array.isArray(value)) return value;
        }
      }
    } catch (e) {}
    return [];
  }

  function getMembersSafe(){
    try { if (typeof window.getMembers === 'function') return window.getMembers(); } catch (e) {}
    try {
      const keys = Object.keys(localStorage || {});
      const key = keys.find(k => /_members$/.test(k));
      if (key) {
        const value = safeJsonParse(localStorage.getItem(key), []);
        if (Array.isArray(value)) return value;
      }
    } catch (e) {}
    return [];
  }

  function collectDueAlerts(){
    const items = getItemsSafe();
    const members = getMembersSafe();
    return []
      .concat(collectDocumentExpiryAlerts(items))
      .concat(collectPaymentExpiryAlerts(items, members))
      .concat(collectDraftReminderAlerts());
  }

  async function showDueAlertsPreview(){
    const list = collectDueAlerts();
    if (!list.length) {
      alert('현재 기준으로 발송 대상 푸시알림이 없습니다.\n서류/이용권은 만료 7일 전 또는 만료일 당일만 대상입니다.\n작성중 서류는 다음날 1회만 대상입니다.');
      return;
    }
    const text = list.slice(0, 10).map((x, i) => (i + 1) + '. [' + x.due + '] ' + x.title + '\n' + x.body).join('\n\n');
    alert('현재 발송 대상 알림 ' + list.length + '건\n\n' + text + (list.length > 10 ? '\n\n외 ' + (list.length - 10) + '건' : ''));
  }

  async function sendFirstDueAlertAsTest(){
    const list = collectDueAlerts();
    if (!list.length) {
      alert('현재 발송 대상 알림이 없습니다. 먼저 테스트 푸시를 보내서 권한을 확인하세요.');
      return;
    }
    const permission = await requestPermission();
    if (permission !== 'granted') return;
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

  function getStatusText(){
    const st = getSupportStatus();
    if (!st.notification) return '이 브라우저는 알림을 지원하지 않습니다.';
    if (!st.serviceWorker) return '서비스워커가 없어 PWA 푸시를 사용할 수 없습니다.';
    if (st.permission === 'granted') return '알림 허용됨 - 테스트 푸시 확인 가능';
    if (st.permission === 'denied') return '알림 차단됨 - 휴대폰 설정에서 허용 필요';
    return '알림 권한 대기중 - 권한 요청 필요';
  }

  function renderPanelHtml(){
    const st = getSupportStatus();
    const due = collectDueAlerts();
    const lastTest = readLocal(LAST_TEST_KEY, null);
    const localSub = readLocal(SUBSCRIPTION_KEY, null);
    const vapid = getVapidPublicKey();
    return '' +
      '<div id="sitepassPushPanel" class="card" style="box-shadow:none;margin-top:14px;border:1px solid #d9e5ff;">' +
        '<h3>푸시알림 관리</h3>' +
        '<div class="notice blue-note">휴대폰 상단에 뜨는 PWA 푸시알림입니다. 기준은 <b>서류 만료 7일 전/만료일</b>, <b>이용권 만료 7일 전/만료일</b>, <b>작성중 서류 다음날 1회</b>입니다. 14일 전 알림과 반복 알림, 기사/인부 인증요청 푸시는 제외했습니다.</div>' +
        '<div class="small" style="margin:8px 0;"><b>상태:</b> ' + escapeHtmlForPush(getStatusText()) + ' · 권한: ' + escapeHtmlForPush(st.permission) + ' · 홈화면앱: ' + (st.standalone ? '예' : '아니오') + '</div>' +
        '<div class="actions" style="margin:8px 0 10px;">' +
          '<button type="button" class="primary" onclick="sitepassRequestPushPermission()">알림 권한 요청</button>' +
          '<button type="button" class="secondary" onclick="sitepassSendTestPush()">테스트 푸시 보내기</button>' +
          '<button type="button" class="ghost" onclick="sitepassShowPushDueAlerts()">현재 알림 대상 확인</button>' +
          '<button type="button" class="ghost" onclick="sitepassSendDuePushPreview()">대상 1건 테스트</button>' +
        '</div>' +
        '<div class="small">현재 계산된 알림 대상: <b>' + due.length + '건</b>' +
          (lastTest?.sentAt ? ' · 마지막 테스트: ' + escapeHtmlForPush(lastTest.sentAt) : '') +
          (localSub ? ' · 구독기록 저장됨' : ' · 구독기록 없음') +
          (!vapid ? '<br>※ 실제 자동발송은 VAPID 키와 Supabase Edge Function 연결 후 가능합니다. 지금은 권한/테스트 알림 확인 단계입니다.' : '') +
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

  function boot(){
    refreshPanel();
    setInterval(refreshPanel, 2500);
    try {
      const observer = new MutationObserver(() => refreshPanel());
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  window.sitepassRequestPushPermission = requestPermission;
  window.sitepassSendTestPush = sendLocalTestNotification;
  window.sitepassShowPushDueAlerts = showDueAlertsPreview;
  window.sitepassSendDuePushPreview = sendFirstDueAlertAsTest;

  window.SitePassPushNotify = {
    version: APP_VERSION,
    getSupportStatus,
    requestPermission,
    sendLocalTestNotification,
    saveSubscriptionIfPossible,
    collectDueAlerts,
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
