// SitePass v23.7.298 - 보관함/장비서류 목록/관리자 집계 삭제반영 보정 파일
// 이 파일에는 장비/기사/인부 보관함 목록, 선택 공유, 삭제, 관리자 보관함 표시 기능을 둡니다.
// QR 링크 생성 자체는 qr-share.js, 서버통신은 supabase-api.js를 계속 사용합니다.
(function(){
  'use strict';


function getArchiveStorageKeyFallback(name, fallback) {
  try {
    if (name === 'STORAGE_KEY' && typeof STORAGE_KEY !== 'undefined' && STORAGE_KEY) return STORAGE_KEY;
    if (name === 'PREV_STORAGE_KEY' && typeof PREV_STORAGE_KEY !== 'undefined' && PREV_STORAGE_KEY) return PREV_STORAGE_KEY;
    if (name === 'PREV_STORAGE_KEY_2' && typeof PREV_STORAGE_KEY_2 !== 'undefined' && PREV_STORAGE_KEY_2) return PREV_STORAGE_KEY_2;
    if (name === 'PREV_STORAGE_KEY_3' && typeof PREV_STORAGE_KEY_3 !== 'undefined' && PREV_STORAGE_KEY_3) return PREV_STORAGE_KEY_3;
    if (name === 'PREV_STORAGE_KEY_4' && typeof PREV_STORAGE_KEY_4 !== 'undefined' && PREV_STORAGE_KEY_4) return PREV_STORAGE_KEY_4;
    if (name === 'PREV_STORAGE_KEY_5' && typeof PREV_STORAGE_KEY_5 !== 'undefined' && PREV_STORAGE_KEY_5) return PREV_STORAGE_KEY_5;
    if (name === 'PREV_STORAGE_KEY_6' && typeof PREV_STORAGE_KEY_6 !== 'undefined' && PREV_STORAGE_KEY_6) return PREV_STORAGE_KEY_6;
    if (name === 'PREV_STORAGE_KEY_7' && typeof PREV_STORAGE_KEY_7 !== 'undefined' && PREV_STORAGE_KEY_7) return PREV_STORAGE_KEY_7;
    if (name === 'SERVER_EQUIPMENT_CACHE_KEY' && typeof SERVER_EQUIPMENT_CACHE_KEY !== 'undefined' && SERVER_EQUIPMENT_CACHE_KEY) return SERVER_EQUIPMENT_CACHE_KEY;
    if (name === 'PENDING_REGISTRATION_KEY' && typeof PENDING_REGISTRATION_KEY !== 'undefined' && PENDING_REGISTRATION_KEY) return PENDING_REGISTRATION_KEY;
  } catch (e) {}
  return fallback || '';
}

function getArchiveStorageKeys() {
  return [
    getArchiveStorageKeyFallback('STORAGE_KEY', 'sitePass_v23_7_7_update_original_corrected'),
    getArchiveStorageKeyFallback('PREV_STORAGE_KEY_7', 'sitePass_v23_7_6_simple_update_controls'),
    getArchiveStorageKeyFallback('PREV_STORAGE_KEY_6', 'sitePass_v23_7_5_update_edit_pages'),
    getArchiveStorageKeyFallback('PREV_STORAGE_KEY_5', 'sitePass_v23_7_4_original_corrected_multi_pages'),
    getArchiveStorageKeyFallback('PREV_STORAGE_KEY_4', 'sitePass_v23_7_3_multi_pages'),
    getArchiveStorageKeyFallback('PREV_STORAGE_KEY_3', 'sitePass_v23_7_2_no_date_label'),
    getArchiveStorageKeyFallback('PREV_STORAGE_KEY_2', 'sitePass_v23_7_preview_print'),
    getArchiveStorageKeyFallback('PREV_STORAGE_KEY', 'sitePass_v23_6_final_docs_structure'),
    getArchiveStorageKeyFallback('SERVER_EQUIPMENT_CACHE_KEY', 'sitePass_v23_7_7_update_original_corrected_server_equipment_cache_v23_7_283')
  ].filter(Boolean).filter(function(key, index, arr){ return arr.indexOf(key) === index; });
}

function getArchivePendingRegistrationKey() {
  return getArchiveStorageKeyFallback('PENDING_REGISTRATION_KEY', 'sitePass_v23_7_7_update_original_corrected_pending_registration_payment_v23_7_150');
}

function getArchiveDeletedCodesKey() {
  const base = getArchiveStorageKeyFallback('STORAGE_KEY', 'sitePass_v23_7_7_update_original_corrected');
  return base + '_archive_deleted_codes_v23_7_295';
}

function normalizeArchiveCode(value) {
  return String(value || '').trim();
}

function readArchiveJson(key, fallback) {
  try {
    const raw = localStorage.getItem(String(key || ''));
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeArchiveJson(key, value) {
  try {
    localStorage.setItem(String(key || ''), JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('SitePass 보관함 저장 정리 실패:', key, e);
    return false;
  }
}

function getArchiveDeletedCodes() {
  const list = readArchiveJson(getArchiveDeletedCodesKey(), []);
  return Array.isArray(list) ? list.map(normalizeArchiveCode).filter(Boolean) : [];
}

function isArchiveDeletedCode(code) {
  const target = normalizeArchiveCode(code);
  if (!target) return false;
  return getArchiveDeletedCodes().indexOf(target) >= 0;
}

function rememberArchiveDeletedCode(code) {
  const target = normalizeArchiveCode(code);
  if (!target) return false;
  const list = getArchiveDeletedCodes();
  if (list.indexOf(target) < 0) list.push(target);
  return writeArchiveJson(getArchiveDeletedCodesKey(), list.slice(-500));
}

function forgetArchiveDeletedCode(code) {
  const target = normalizeArchiveCode(code);
  if (!target) return false;
  const next = getArchiveDeletedCodes().filter(function(saved){ return saved !== target; });
  return writeArchiveJson(getArchiveDeletedCodesKey(), next);
}

function archiveCodeMatches(item, code) {
  const target = normalizeArchiveCode(code);
  if (!target || !item || typeof item !== 'object') return false;
  return [item.code, item.equipmentCode, item.qrCode].map(normalizeArchiveCode).some(function(value){ return value === target; });
}

function isArchiveDeletedItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.isDeleted || item.is_deleted || item.deletedAt || item.deleted_at || item.withdrawnAt || item.withdrawn_at) return true;
  const raw = [item.serviceStatus, item.paymentStatus, item.saveReason, item.save_reason, item.status]
    .map(function(v){ return String(v || '').toLowerCase(); }).join(' ');
  if (raw.indexOf('archive_delete') >= 0 || raw.indexOf('deleted') >= 0 || raw.indexOf('삭제') >= 0) return true;
  return isArchiveDeletedCode(item.code || item.equipmentCode || item.qrCode || '');
}

function filterArchiveVisibleItems(items) {
  return (Array.isArray(items) ? items : []).filter(function(item){
    return item && !isArchiveDeletedItem(item);
  });
}


function removeArchiveCodeFromLocalArrayKey(key, code) {
  if (!key) return 0;
  const value = readArchiveJson(key, null);
  if (!Array.isArray(value)) return 0;
  const next = value.filter(function(item){ return !archiveCodeMatches(item, code); });
  const removed = value.length - next.length;
  if (removed > 0) {
    if (next.length) writeArchiveJson(key, next);
    else {
      try { localStorage.removeItem(key); } catch (e) {}
    }
  }
  return removed;
}

function removeArchivePendingRegistration(code) {
  const key = getArchivePendingRegistrationKey();
  if (!key) return 0;
  const value = readArchiveJson(key, null);
  const pendingItem = value && typeof value === 'object' ? (value.item || value.pendingItem || value.equipmentItem) : null;
  if (archiveCodeMatches(pendingItem, code)) {
    try { localStorage.removeItem(key); } catch (e) {}
    return 1;
  }
  return 0;
}

function removeArchiveCodeFromRuntime(code) {
  try {
    if (typeof runtimeEquipmentItems !== 'undefined' && Array.isArray(runtimeEquipmentItems)) {
      const before = runtimeEquipmentItems.length;
      runtimeEquipmentItems = runtimeEquipmentItems.filter(function(item){ return !archiveCodeMatches(item, code); });
      return before - runtimeEquipmentItems.length;
    }
  } catch (e) {}
  return 0;
}

function removeArchiveCodeEverywhereLocal(code) {
  rememberArchiveDeletedCode(code);
  let removed = 0;
  getArchiveStorageKeys().forEach(function(key){ removed += removeArchiveCodeFromLocalArrayKey(key, code); });
  removed += removeArchivePendingRegistration(code);
  removed += removeArchiveCodeFromRuntime(code);
  return removed;
}

async function markArchiveCodeDeletedOnServer(code) {
  const target = normalizeArchiveCode(code);
  if (!target) return { skipped:true, error:'코드 없음' };
  const api = window.SitePassSupabaseApi;
  if (!api) return { skipped:true, error:'Supabase API 연결 없음' };
  const payload = { p_code: target, code: target };
  try {
    if (api.rpc) {
      const rpcNames = ['sitepass_delete_equipment_item', 'sitepass_soft_delete_equipment_item', 'sitepass_archive_delete_equipment_item'];
      for (const name of rpcNames) {
        const result = await api.rpc(name, payload);
        if (result && !result.error) return { ok:true, mode:'rpc', name };
      }
    }
    if (api.update) {
      const result = await api.update('sitepass_equipment_items', {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        save_reason: 'archive_delete_v23_7_295',
        updated_at: new Date().toISOString()
      }, function(query){ return query.eq('code', target); });
      if (result && !result.error) return { ok:true, mode:'update' };
      return { ok:false, error: result ? result.error : '서버 삭제 실패' };
    }
  } catch (e) {
    return { ok:false, error:e };
  }
  return { skipped:true, error:'서버 삭제 함수 없음' };
}

function archiveRequirePasswordReconfirm(label) {
  try {
    if (typeof requirePasswordReconfirm === 'function') return requirePasswordReconfirm(label);
  } catch (e) {}
  return confirm((label || '삭제') + '을 진행할까요?');
}

function openAdminListQuickFilter(filterKey) {
  adminListQuickFilter = filterKey || 'all';
  showScreen('listScreen');
}

function clearAdminListQuickFilter() {
  adminListQuickFilter = 'all';
  renderList();
}

function renderList() {
  const isAdminMode = isAdminLoggedIn();
  const allItems = filterArchiveVisibleItems(isAdminMode && typeof getAdminVisibleEquipmentItems === 'function'
    ? getAdminVisibleEquipmentItems()
    : getItems());
  const box = document.getElementById('equipmentList');
  const title = document.getElementById('listScreenTitle');
  const bottomActions = document.getElementById('listScreenBottomActions');
  if (title) title.textContent = isAdminMode ? '관리자 장비서류 알림 / 보관함' : '장비/기사/인부 보관함';
  if (bottomActions) {
    bottomActions.innerHTML = isAdminMode
      ? ''
      : '<button class="secondary" onclick="showScreen(\'homeScreen\')">처음 화면</button><button class="dangerBtn" onclick="clearAll()">전체 삭제</button>';
  }
  if (allItems.length === 0) {
    box.innerHTML = '<div class="empty">' + (isAdminMode ? '아직 등록된 장비서류가 없습니다.<br>회원이 직접 등록한 장비서류가 생기면 여기서 확인할 수 있습니다.' : '아직 저장된 통합 서류함이 없습니다.<br>통합 서류함 등록에서 먼저 저장해보세요.') + '</div>';
    return;
  }
  const items = allItems.filter(item => itemMatchesAdminListQuickFilter(item, adminListQuickFilter));
  const filterNotice = adminListQuickFilter !== 'all'
    ? '<div class="notice blue-note admin-filter-note"><div><b>현재 빠른보기:</b> ' + escapeHtml(getAdminListQuickFilterLabel(adminListQuickFilter)) + '</div><button type="button" class="ghost inline-mini-button" onclick="clearAdminListQuickFilter()">전체 보기</button></div>'
    : '';
  const adminModeNotice = isAdminMode
    ? '<div class="notice blue-note"><b>관리자 모드 창</b><br>여기서는 장비업자에게 알림만 보내고, 장비별로는 상세보기 / 큐알링크 / 삭제만 할 수 있습니다. 큐알링크는 해당 장비 담당자 화면 QR을 바로 보여줍니다.</div>'
    : '';
  const toolbar = isAdminMode
    ? '<div class="list-select-toolbar">' +
        adminModeNotice +
        filterNotice +
        '<div class="small"><b>선택해서 장비업자에게 알림 보내기</b><br>선택한 장비의 소유회원 휴대폰번호로 만료·갱신 알림 문자를 바로 보냅니다.</div>' +
        '<div class="actions">' +
          '<button class="ghost" onclick="selectAllListItems(true)">전체선택</button>' +
          '<button class="secondary" onclick="selectAllListItems(false)">선택해제</button>' +
          '<button class="okBtn" onclick="shareSelectedAdminOwnerAlertSms()">선택 장비업자에게 알림 보내기</button>' +
        '</div>' +
      '</div>'
    : '<div class="list-select-toolbar">' +
        filterNotice +
        '<div class="small"><b>선택해서 바로 보내기</b><br>필요한 장비를 체크한 뒤 카카오톡·문자·이메일 중 하나로 담당자에게 7일 만료 QR·링크를 바로 보냅니다.</div>' +
        '<div class="actions">' +
          '<button class="ghost" onclick="selectAllListItems(true)">전체선택</button>' +
          '<button class="secondary" onclick="selectAllListItems(false)">선택해제</button>' +
          '<button class="okBtn" onclick="shareSelectedListItemsKakao()">선택 카카오톡으로 보내기</button>' +
          '<button class="ghost" onclick="shareSelectedListItemsSms()">선택 문자로 보내기</button>' +
          '<button class="ghost" onclick="shareSelectedListItemsEmail()">선택 이메일로 보내기</button>' +
        '</div>' +
      '</div>';
  if (!items.length) {
    box.innerHTML = toolbar + '<div class="empty">현재 조건에 맞는 장비서류가 없습니다.</div>';
    return;
  }
  box.innerHTML = toolbar + items.map(item => {
    const ownerInfo = isAdminMode
      ? '<div class="small">장비업자: ' + escapeHtml(item.ownerName || item.ownerSignupId || '미지정') + (item.ownerPhone ? ' / ' + escapeHtml(item.ownerPhone) : ' / 휴대폰 미등록') + '</div>'
      : '';
    const actionButtons = isAdminMode
      ? '<div class="actions"><button class="ghost" onclick="renderDetail(\'' + escapeJs(item.code) + '\')">상세보기</button><button class="primary" onclick="openAdminQrLink(\'' + escapeJs(item.code) + '\')">큐알링크</button><button class="dangerBtn" onclick="deleteItem(\'' + escapeJs(item.code) + '\')">삭제</button></div>'
      : '<div class="actions"><button class="ghost" onclick="renderDetail(\'' + escapeJs(item.code) + '\')">상세보기</button><button class="ghost" onclick="openManagerPublicView(\'' + escapeJs(item.code) + '\')">담당자화면</button><button class="primary" onclick="startEditEquipment(\'' + escapeJs(item.code) + '\')">수정/갱신</button><button class="dangerBtn" onclick="deleteItem(\'' + escapeJs(item.code) + '\')">삭제</button></div>';
    return '<div class="list-item">' +
      '<div class="list-item-head"><strong>' + escapeHtml(getItemTitle(item)) + '</strong><label class="list-select-label"><input type="checkbox" data-list-share-check value="' + escapeHtml(item.code) + '" /> 선택</label></div>' +
      ownerInfo +
      '<div class="small">포함서류: ' + escapeHtml(getIncludedGroupText(item)) + '</div>' +
      '<div class="small">결제단위: ' + escapeHtml(item?.bundleMeta?.paymentText || '통합 서류함 1건') + '</div>' +
      '<div class="small">서비스상태: ' + escapeHtml(getServiceStatusText(item)) + '</div>' +
      '<div class="small">담당자 QR·링크 만료: ' + escapeHtml(getManagerExpireText(getManagerExpireAt(item))) + '</div>' +
      '<div class="small">' + escapeHtml(makeAlertSummary(item.docs)) + '</div>' +
      (isAdminMode ? '' : renderListRenewButton(item)) +
      actionButtons +
    '</div>';
  }).join('');
}

function selectAllListItems(checked) {
  document.querySelectorAll('[data-list-share-check]').forEach(input => {
    input.checked = !!checked;
  });
}

function getSelectedListCodes() {
  return Array.from(document.querySelectorAll('[data-list-share-check]:checked')).map(input => input.value).filter(Boolean);
}

function getItemsFromCodes(codes) {
  return (codes || []).map(code => getItemByCode(code)).filter(Boolean);
}

function getSelectedListItemsForShare() {
  const codes = getSelectedListCodes();
  if (!codes.length) { alert('공유할 장비를 먼저 선택해주세요.'); return []; }
  const items = getItemsFromCodes(codes);
  if (!items.length) { alert('공유할 서류함을 찾을 수 없습니다.'); return []; }
  return items;
}

function shareOneListItem(code) {
  shareOneListItemKakao(code);
}

function shareSelectedListItems() {
  shareSelectedListItemsKakao();
}

function shareOneListItemKakao(code) {
  const item = getItemByCode(code);
  if (!item) { alert('공유할 서류함을 찾을 수 없습니다.'); return; }
  shareManagerItemsByChannel([item], 'kakao');
}

function shareOneListItemSms(code) {
  const item = getItemByCode(code);
  if (!item) { alert('공유할 서류함을 찾을 수 없습니다.'); return; }
  shareManagerItemsByChannel([item], 'sms');
}

function shareOneListItemEmail(code) {
  const item = getItemByCode(code);
  if (!item) { alert('공유할 서류함을 찾을 수 없습니다.'); return; }
  shareManagerItemsByChannel([item], 'email');
}

function shareSelectedListItemsKakao() {
  const items = getSelectedListItemsForShare();
  if (items.length) shareManagerItemsByChannel(items, 'kakao');
}

function shareSelectedListItemsSms() {
  const items = getSelectedListItemsForShare();
  if (items.length) shareManagerItemsByChannel(items, 'sms');
}

function shareSelectedListItemsEmail() {
  const items = getSelectedListItemsForShare();
  if (items.length) shareManagerItemsByChannel(items, 'email');
}

function buildManagerShareText(items) {
  const safeItems = (items || []).filter(Boolean);
  const heading = '[SitePass] ' + getShareTitleForItems(safeItems);
  const list = safeItems.map((item, index) => {
    const expireAt = getManagerExpireAt(item);
    return (safeItems.length > 1 ? (index + 1) + '. ' : '') + getShareItemLabel(item) + ' 서류\n' +
      '포함서류: ' + getIncludedGroupText(item) + '\n' +
      '담당자 화면: ' + makeManagerLink(item.code, expireAt) + '\n' +
      '유효기간: ' + getManagerExpireText(expireAt);
  }).join('\n\n');
  return heading + '\n' +
    'QR·링크를 누르면 코드 입력 없이 바로 담당자 다운로드/프린트 화면이 열립니다.\n' +
    '담당자가 한눈에 알아볼 수 있도록 장비명/장비번호를 먼저 표시했습니다.\n' +
    '7일 뒤에는 담당자 QR·링크 접속이 차단됩니다.\n\n' + list;
}

function renderManagerSharePreviewPanel(item) {
  if (!item) return '';
  const title = getShareItemLabel(item) + ' 서류';
  const expireAt = getManagerExpireAt(item);
  const link = makeManagerLink(item.code || '', expireAt);
  const previewText = '[SitePass] ' + title + '\n' +
    '현장 반입서류 확인 링크입니다.\n' +
    '장비명/번호: ' + getShareItemLabel(item) + '\n' +
    '포함서류: ' + getIncludedGroupText(item) + '\n' +
    '담당자 화면: ' + link + '\n' +
    '유효기간: ' + getManagerExpireText(expireAt);
  return '<div class="share-message-box">' +
    '<b>담당자에게 보내질 표시</b>' +
    '<div class="share-main-title">' + escapeHtml(title) + '</div>' +
    '<div class="small">카톡/문자/이메일과 QR을 받는 담당자는 첫 줄에서 바로 <b>' + escapeHtml(getShareItemLabel(item)) + '</b> 서류라는 것을 알 수 있습니다.</div>' +
    '<div class="share-copy-preview">' + escapeHtml(previewText) + '</div>' +
    '<div class="actions">' +
      '<button type="button" class="okBtn" onclick="shareOneListItemKakao(\'' + escapeJs(item.code || '') + '\')">카톡으로 보내기</button>' +
      '<button type="button" class="ghost" onclick="shareOneListItemSms(\'' + escapeJs(item.code || '') + '\')">문자로 보내기</button>' +
      '<button type="button" class="primary" onclick="openManagerPublicView(\'' + escapeJs(item.code || '') + '\')">담당자 화면 보기</button>' +
      '<button type="button" class="secondary" onclick="copyManagerCode(\'' + escapeJs(item.code || '') + '\')">링크 복사</button>' +
    '</div>' +
  '</div>';
}

async function deleteItem(code) {
  const target = normalizeArchiveCode(code);
  if (!target) { alert('삭제할 서류함 코드를 찾을 수 없습니다.'); return; }
  if (!archiveRequirePasswordReconfirm('서류함 삭제')) return;
  if (!confirm('이 서류함을 삭제할까요?\n\n삭제하면 이전 저장키·서버캐시에 남아 있어도 보관함에 다시 나타나지 않게 정리합니다.')) return;

  const removedLocal = removeArchiveCodeEverywhereLocal(target);
  try {
    const remained = filterArchiveVisibleItems(getItems()).filter(function(item){ return !archiveCodeMatches(item, target); });
    if (typeof setItems === 'function') setItems(remained);
  } catch (e) {}
  try { if (typeof refreshMemberUi === 'function') refreshMemberUi(); } catch (e) {}
  try { if (typeof refreshAdminUi === 'function') refreshAdminUi(); } catch (e) {}
  try { if (typeof isAdminLoggedIn === 'function' && isAdminLoggedIn() && typeof renderAdmin === 'function') renderAdmin(); } catch (e) {}
  renderList();

  const serverResult = await markArchiveCodeDeletedOnServer(target);
  try { if (typeof syncSupabaseEquipmentItems === 'function') await syncSupabaseEquipmentItems(true); } catch (e) {}
  // 서버 RPC/RLS가 아직 없어도, 동기화 직후 다시 들어온 서버캐시에서 삭제 코드를 한 번 더 제거합니다.
  try { removeArchiveCodeEverywhereLocal(target); } catch (e) {}
  try { if (typeof refreshMemberUi === 'function') refreshMemberUi(); } catch (e) {}
  try { if (typeof refreshAdminUi === 'function') refreshAdminUi(); } catch (e) {}
  try { if (typeof isAdminLoggedIn === 'function' && isAdminLoggedIn() && typeof renderAdmin === 'function') renderAdmin(); } catch (e) {}
  renderList();

  if (serverResult && serverResult.ok) {
    alert('보관함에서 삭제했습니다.\n서버 삭제 표시도 반영했습니다.');
  } else {
    alert('보관함에서 삭제했습니다.\n이 기기와 보관함 화면에는 다시 표시되지 않게 처리했습니다.\n서버 권한/RPC가 아직 없으면 서버 삭제 표시는 나중에 Supabase 작업 때 반영하면 됩니다.');
  }
}

async function clearAll() {
  if (!archiveRequirePasswordReconfirm('전체 삭제')) return;
  if (!confirm('저장된 모든 서류함을 삭제할까요?')) return;
  const visibleCodes = filterArchiveVisibleItems(getItems()).map(function(item){ return normalizeArchiveCode(item.code); }).filter(Boolean);
  visibleCodes.forEach(rememberArchiveDeletedCode);
  getArchiveStorageKeys().forEach(function(key){ try { localStorage.removeItem(key); } catch (e) {} });
  try { localStorage.removeItem(getArchivePendingRegistrationKey()); } catch (e) {}
  try { if (typeof runtimeEquipmentItems !== 'undefined' && Array.isArray(runtimeEquipmentItems)) runtimeEquipmentItems = []; } catch (e) {}
  renderList();
  for (const code of visibleCodes.slice(0, 50)) {
    try { await markArchiveCodeDeletedOnServer(code); } catch (e) {}
  }
  try { if (typeof syncSupabaseEquipmentItems === 'function') await syncSupabaseEquipmentItems(true); } catch (e) {}
  renderList();
}

  window.SitePassArchive = {
    openAdminListQuickFilter,
    clearAdminListQuickFilter,
    renderList,
    selectAllListItems,
    getSelectedListCodes,
    getItemsFromCodes,
    getSelectedListItemsForShare,
    shareOneListItem,
    shareSelectedListItems,
    shareOneListItemKakao,
    shareOneListItemSms,
    shareOneListItemEmail,
    shareSelectedListItemsKakao,
    shareSelectedListItemsSms,
    shareSelectedListItemsEmail,
    buildManagerShareText,
    renderManagerSharePreviewPanel,
    isArchiveDeletedCode,
    isArchiveDeletedItem,
    getArchiveDeletedCodes,
    rememberArchiveDeletedCode,
    forgetArchiveDeletedCode,
    filterArchiveVisibleItems,
    removeArchiveCodeEverywhereLocal,
    markArchiveCodeDeletedOnServer,
    deleteItem,
    clearAll
  };
})();
