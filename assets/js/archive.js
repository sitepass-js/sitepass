// SitePass v23.7.350 - 보관함/장비서류 목록/관리자 집계 삭제반영 보정 파일
// 이 파일에는 장비/기사/인부 보관함 목록, 선택 공유, 삭제, 관리자 보관함 표시 기능을 둡니다.
// QR 링크 생성 자체는 qr-share.js, 서버통신은 supabase-api.js를 계속 사용합니다.
(function(){
  'use strict';

let archiveSearchQuery = '';
let archiveCurrentPage = 1;
const ARCHIVE_PAGE_SIZE = 10;

function normalizeArchiveSearchText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '').replace(/[-_.]/g, '');
}

function getArchiveSearchHaystack(item) {
  if (!item || typeof item !== 'object') return '';
  const values = [
    item.code, item.equipmentCode, item.qrCode,
    item.equipmentNo, item.equipment_no, item.registrationNo, item.registration_no,
    item.equipmentName, item.equipment_name, item.machineName, item.machine_name,
    item.ownerName, item.owner_name, item.ownerSignupId, item.owner_signup_id,
    item.ownerMemberId, item.owner_member_id, item.ownerProviderId, item.owner_provider_id,
    item.ownerPhone, item.owner_phone,
    item.driverName, item.driver_name, item.workerName, item.worker_name
  ];
  try { values.push(getItemTitle(item)); } catch (e) {}
  return normalizeArchiveSearchText(values.filter(Boolean).join(' '));
}

function itemMatchesArchiveSearch(item, query) {
  const needle = normalizeArchiveSearchText(query);
  if (!needle) return true;
  return getArchiveSearchHaystack(item).indexOf(needle) >= 0;
}

function setArchiveSearchQuery(value) {
  archiveSearchQuery = String(value || '').trim();
  archiveCurrentPage = 1;
  renderList();
}

function searchArchiveFromInput() {
  const input = document.getElementById('archiveSearchInput');
  setArchiveSearchQuery(input ? input.value : '');
}


function clearArchiveSearch() {
  archiveSearchQuery = '';
  archiveCurrentPage = 1;
  const input = document.getElementById('archiveSearchInput');
  if (input) input.value = '';
  renderList();
}

function goArchivePage(page) {
  const next = Number(page || 1);
  archiveCurrentPage = Number.isFinite(next) ? Math.max(1, Math.floor(next)) : 1;
  renderList();
  try {
    const screen = document.getElementById('listScreen');
    if (screen) screen.scrollIntoView({ behavior:'smooth', block:'start' });
  } catch (e) {}
}


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

function isArchiveMemberServerAuthoritativeMode() {
  try {
    return !!(typeof isMemberLoggedIn === 'function' && isMemberLoggedIn() && !(typeof isAdminLoggedIn === 'function' && isAdminLoggedIn()));
  } catch (e) {
    return false;
  }
}

function isArchiveServerDeletedStatus(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.isDeleted || item.is_deleted || item.deleted || item.deletedAt || item.deleted_at || item.withdrawnAt || item.withdrawn_at) return true;
  const raw = [
    item.serviceStatus, item.service_status,
    item.paymentStatus, item.payment_status,
    item.saveReason, item.save_reason,
    item.status, item.itemStatus, item.item_status,
    item.deletedReason, item.deleted_reason
  ].map(function(v){ return String(v || '').toLowerCase(); }).join(' ');
  return raw.indexOf('archive_delete') >= 0 || raw.indexOf('withdrawn') >= 0 || raw.indexOf('force_withdrawn') >= 0 || raw.indexOf('orphan_deleted') >= 0 || raw.indexOf('deleted') >= 0 || raw.indexOf('탈퇴') >= 0 || raw.indexOf('삭제') >= 0 || raw.indexOf('정리') >= 0 || raw.indexOf('차단') >= 0;
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
  if (isArchiveServerDeletedStatus(item)) return true;
  // v23.7.350: 일반회원 보관함은 PC/휴대폰 모두 서버목록만 기준입니다.
  // PC localStorage의 과거 삭제코드로 서버에 살아있는 장비를 숨기면
  // PC에는 없고 휴대폰에는 보이는 불일치가 생깁니다.
  if (isArchiveMemberServerAuthoritativeMode()) return false;
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
  try {
    // v23.7.350: 기존 RPC 호출은 p_code와 code를 같이 보내 PostgREST 함수 매칭이 실패할 수 있었습니다.
    // 이번 버전부터는 p_code 한 개만 보내고, SQL 쪽에 같은 이름의 삭제 RPC를 준비합니다.
    if (api.rpc) {
      const rpcNames = ['sitepass_archive_delete_equipment_item', 'sitepass_soft_delete_equipment_item', 'sitepass_delete_equipment_item'];
      for (const name of rpcNames) {
        const result = await api.rpc(name, { p_code: target });
        if (result && !result.error) return { ok:true, mode:'rpc', name, data:result.data };
        if (result && result.error) console.warn('SitePass 서버 삭제 RPC 실패:', name, result.error);
      }
    }
    if (api.update) {
      const result = await api.update('sitepass_equipment_items', {
        is_deleted: true,
        service_status: 'archive_deleted',
        payment_status: 'archive_deleted',
        save_reason: 'member_archive_delete_v23_7_335',
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
  archiveCurrentPage = 1;
  showScreen('listScreen');
}

function clearAdminListQuickFilter() {
  adminListQuickFilter = 'all';
  archiveCurrentPage = 1;
  renderList();
}

function renderList() {
  const isAdminMode = isAdminLoggedIn();
  let allItems = filterArchiveVisibleItems(isAdminMode && typeof getAdminVisibleEquipmentItems === 'function'
    ? getAdminVisibleEquipmentItems()
    : getItems());
  if (!isAdminMode && typeof window.sitePassFilterCurrentMemberEquipmentStorageScope === 'function') {
    allItems = window.sitePassFilterCurrentMemberEquipmentStorageScope(allItems);
  }
  const box = document.getElementById('equipmentList');
  const title = document.getElementById('listScreenTitle');
  const searchInput = document.getElementById('archiveSearchInput');
  const bottomActions = document.getElementById('listScreenBottomActions');
  if (title) title.textContent = isAdminMode ? '관리자 보관함' : '보관함';
  if (searchInput) {
    searchInput.placeholder = '검색';
    if (searchInput.value !== archiveSearchQuery) searchInput.value = archiveSearchQuery;
  }
  if (bottomActions) bottomActions.innerHTML = '';
  if (!box) return;

  if (allItems.length === 0) {
    archiveCurrentPage = 1;
    if (!isAdminMode && window.sitePassMemberEquipmentInitialSyncPendingV491) {
      box.innerHTML = '<div class="empty sitepass-server-loading-v491"><b>보관함을 불러오는 중입니다.</b><br>서버에 저장된 장비를 확인하고 있습니다.</div>';
      return;
    }
    if (!isAdminMode && window.sitePassMemberEquipmentInitialSyncErrorV491) {
      box.innerHTML = '<div class="empty"><b>보관함 서버 연결을 확인하고 있습니다.</b><br>잠시 후 다시 열거나 새로고침해주세요.</div>';
      return;
    }
    box.innerHTML = '<div class="empty">' + (isAdminMode ? '아직 등록된 장비서류가 없습니다.<br>회원이 직접 등록한 장비서류가 생기면 여기서 확인할 수 있습니다.' : '아직 저장된 장비등록이 없습니다.<br>등록에서 먼저 장비를 추가해주세요.') + '</div>';
    return;
  }

  const quickFilteredItems = allItems.filter(item => itemMatchesAdminListQuickFilter(item, adminListQuickFilter));
  const filteredItems = quickFilteredItems.filter(item => itemMatchesArchiveSearch(item, archiveSearchQuery));
  const totalCount = filteredItems.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / ARCHIVE_PAGE_SIZE));
  archiveCurrentPage = Math.min(Math.max(1, archiveCurrentPage), pageCount);
  const pageStart = (archiveCurrentPage - 1) * ARCHIVE_PAGE_SIZE;
  const items = filteredItems.slice(pageStart, pageStart + ARCHIVE_PAGE_SIZE);

  // v23.7.541-test: 보관함 카드에서 사용한 장비 원본을 즉시 상세보기/링크화면에 전달합니다.
  // Ctrl+F5 직후 서버 캐시 재구축 중에도 목록에 보인 장비를 다시 찾느라 기다리지 않게 합니다.
  if (!(window.sitePassArchiveItemSnapshotV538 instanceof Map)) window.sitePassArchiveItemSnapshotV538 = new Map();
  allItems.forEach(function(item){
    const snapshotCode = getArchiveShareCode(item);
    if (snapshotCode) window.sitePassArchiveItemSnapshotV538.set(snapshotCode, item);
  });

  const filterNotice = adminListQuickFilter !== 'all'
    ? '<div class="notice blue-note admin-filter-note"><div><b>현재 빠른보기:</b> ' + escapeHtml(getAdminListQuickFilterLabel(adminListQuickFilter)) + '</div><button type="button" class="ghost inline-mini-button" onclick="clearAdminListQuickFilter()">전체 보기</button></div>'
    : '';
  const searchSummary = '<div class="archive-list-summary"><b>' + (archiveSearchQuery ? '검색 결과 ' : '장비등록 ') + totalCount + (archiveSearchQuery ? '대' : '대') + '</b></div>';
  const adminModeNotice = isAdminMode
    ? '<div class="notice blue-note"><b>관리자 모드 창</b><br>여기서는 장비업자에게 알림만 보내고, 장비별로는 상세보기 / 큐알링크 / 삭제만 할 수 있습니다. 큐알링크는 해당 장비 담당자 화면 QR을 바로 보여줍니다.</div>'
    : '';
  const toolbar = isAdminMode
    ? '<div class="list-select-toolbar">' +
        adminModeNotice +
        filterNotice +
        searchSummary +
        '<div class="small"><b>선택해서 장비업자에게 알림 보내기</b><br>선택한 장비의 소유회원 휴대폰번호로 만료·갱신 알림 문자를 바로 보냅니다.</div>' +
        '<div class="actions">' +
          '<button class="ghost" onclick="selectAllListItems(true)">현재 페이지 전체선택</button>' +
          '<button class="secondary" onclick="selectAllListItems(false)">선택해제</button>' +
          '<button class="okBtn" onclick="shareSelectedAdminOwnerAlertSms()">선택 장비업자에게 알림 보내기</button>' +
        '</div>' +
      '</div>'
    : '<div class="list-select-toolbar">' +
        filterNotice +
        searchSummary +
        '<div class="list-share-actions">' +
          '<button class="okBtn" onclick="shareSelectedListItemsKakao()">선택 카카오톡으로 보내기</button>' +
          '<button class="ghost" onclick="shareSelectedListItemsSms()">선택 문자로 보내기</button>' +
          '<button class="ghost" onclick="shareSelectedListItemsEmail()">선택 이메일로 보내기</button>' +
        '</div>' +
        '<div class="archive-share-help-v491">장비 오른쪽의 <b>선택</b>을 체크한 뒤 원하는 전송 버튼을 누르세요. 여러 대를 함께 선택해 보낼 수도 있습니다.</div>' +
      '</div>';

  if (!items.length) {
    box.innerHTML = toolbar + '<div class="empty">검색 조건에 맞는 장비가 없습니다.</div>';
    return;
  }

  const cards = items.map(item => {
    const cardCode = getArchiveShareCode(item);
    const ownerInfo = isAdminMode
      ? '<div class="small">장비업자: ' + escapeHtml(item.ownerName || item.ownerSignupId || '미지정') + (item.ownerPhone ? ' / ' + escapeHtml(item.ownerPhone) : ' / 휴대폰 미등록') + '</div>'
      : '';
    const actionButtons = isAdminMode
      ? '<div class="actions"><button class="ghost" onclick="renderDetail(\'' + escapeJs(cardCode) + '\')">상세보기</button><button class="primary" onclick="openAdminQrLink(\'' + escapeJs(cardCode) + '\')">큐알링크</button><button class="dangerBtn" onclick="deleteItem(\'' + escapeJs(cardCode) + '\')">삭제</button></div>'
      : '<div class="archive-card-actions"><button class="ghost" onclick="renderDetail(\'' + escapeJs(cardCode) + '\')">상세보기</button><button class="primary" onclick="startEditEquipment(\'' + escapeJs(cardCode) + '\')">수정/갱신</button><button class="ghost" onclick="openManagerPublicView(\'' + escapeJs(cardCode) + '\')">링크화면</button><button class="dangerBtn" onclick="deleteItem(\'' + escapeJs(cardCode) + '\')">삭제</button></div>';
    return '<div class="list-item">' +
      '<div class="list-item-head"><strong>' + escapeHtml(getItemTitle(item)) + '</strong><label class="list-select-label"><input type="checkbox" data-list-share-check value="' + escapeHtml(cardCode) + '" /> 선택</label></div>' +
      ownerInfo +
      '<div class="small">포함서류: ' + escapeHtml(getIncludedGroupText(item)) + '</div>' +
      '<div class="small">결제단위: ' + escapeHtml(item?.bundleMeta?.paymentText || '장비등록 1건') + '</div>' +
      '<div class="small">서비스상태: ' + escapeHtml(getServiceStatusText(item)) + '</div>' +
      '<div class="small">담당자 QR·링크 만료: ' + escapeHtml(getManagerExpireText(getManagerExpireAt(item))) + '</div>' +
      '<div class="small">' + escapeHtml(makeAlertSummary(item.docs)) + '</div>' +
      (isAdminMode ? '' : renderListRenewButton(item)) +
      actionButtons +
    '</div>';
  }).join('');

  const pagination = pageCount > 1
    ? '<div class="archive-pagination">' +
        '<button type="button" class="secondary" ' + (archiveCurrentPage <= 1 ? 'disabled' : '') + ' onclick="window.SitePassArchive.goToPage(' + (archiveCurrentPage - 1) + ')">이전</button>' +
        '<span><b>' + archiveCurrentPage + '</b> / ' + pageCount + '</span>' +
        '<button type="button" class="secondary" ' + (archiveCurrentPage >= pageCount ? 'disabled' : '') + ' onclick="window.SitePassArchive.goToPage(' + (archiveCurrentPage + 1) + ')">다음</button>' +
      '</div>'
    : '';
  box.innerHTML = toolbar + cards + pagination;
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

function getArchiveShareCode(item) {
  return String((item && (item.code || item.share_code || item.shareCode || item.publicShareCode || item.managerShareCode || item.qrCode || item.equipmentCode || item.id)) || '').trim();
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
      '담당자 화면: ' + makeManagerLink(getArchiveShareCode(item), expireAt) + '\n' +
      '유효기간: ' + getManagerExpireText(expireAt);
  }).join('\n\n');
  return heading + '\n' +
    'QR·링크를 누르면 코드 입력 없이 바로 담당자 다운로드/프린트 화면이 열립니다.\n' +
    '담당자가 한눈에 알아볼 수 있도록 장비명/장비번호를 먼저 표시했습니다.\n' +
    '1일 뒤에는 담당자 QR·링크 접속이 차단됩니다.\n\n' + list;
}

function renderManagerSharePreviewPanel(item) {
  if (!item) return '';
  const title = getShareItemLabel(item) + ' 서류';
  const expireAt = getManagerExpireAt(item);
  const link = makeManagerLink(getArchiveShareCode(item), expireAt);
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
      '<button type="button" class="okBtn" onclick="shareOneListItemKakao(\'' + escapeJs(getArchiveShareCode(item)) + '\')">카톡으로 보내기</button>' +
      '<button type="button" class="ghost" onclick="shareOneListItemSms(\'' + escapeJs(getArchiveShareCode(item)) + '\')">문자로 보내기</button>' +
      '<button type="button" class="primary" onclick="openManagerPublicView(\'' + escapeJs(getArchiveShareCode(item)) + '\')">담당자 화면 보기</button>' +
      '<button type="button" class="secondary" onclick="copyManagerCode(\'' + escapeJs(getArchiveShareCode(item)) + '\')">링크 복사</button>' +
    '</div>' +
  '</div>';
}

async function deleteItem(code) {
  const target = normalizeArchiveCode(code);
  if (!target) { alert('삭제할 서류함 코드를 찾을 수 없습니다.'); return; }
  if (!archiveRequirePasswordReconfirm('서류함 삭제')) return;
  if (!confirm('이 서류함을 삭제할까요?\n\n서버에서 삭제 성공한 뒤 PC/휴대폰/다른 PC 보관함에서 같이 사라집니다.')) return;

  const memberServerMode = isArchiveMemberServerAuthoritativeMode();

  if (memberServerMode) {
    // v23.7.350: 일반회원은 서버 100% 기준입니다.
    // PC localStorage에서 먼저 숨기면 PC/휴대폰 목록이 달라지므로 서버 삭제 성공 전에는 화면에서 제거하지 않습니다.
    const serverResult = await markArchiveCodeDeletedOnServer(target);
    if (!serverResult || !serverResult.ok) {
      try { if (typeof syncSupabaseMyEquipmentItems === 'function') await syncSupabaseMyEquipmentItems(true); } catch (e) {}
      try { if (typeof refreshMemberUi === 'function') refreshMemberUi(); } catch (e) {}
      renderList();
      alert('서버 삭제가 완료되지 않았습니다.\n네트워크나 서버 권한 문제일 수 있어 보관함에서 임의로 숨기지 않았습니다.\n잠시 후 다시 삭제해주세요.');
      return;
    }

    // 서버 삭제가 성공한 뒤에만 현재 기기의 보조 캐시와 런타임 목록을 정리합니다.
    try { removeArchiveCodeEverywhereLocal(target); } catch (e) {}
    try { if (window.sitePassRemoveServerAuthoritativeEquipmentByCode) window.sitePassRemoveServerAuthoritativeEquipmentByCode(target); } catch (e) {}
    try { if (typeof syncSupabaseMyEquipmentItems === 'function') await syncSupabaseMyEquipmentItems(true); } catch (e) {}
    try { if (typeof refreshMemberUi === 'function') refreshMemberUi(); } catch (e) {}
    renderList();
    alert('보관함에서 삭제했습니다.\nPC/휴대폰/다른 PC 모두 서버 기준으로 정리됩니다.');
    return;
  }

  const removedLocal = removeArchiveCodeEverywhereLocal(target);
  try { if (window.sitePassRemoveServerAuthoritativeEquipmentByCode) window.sitePassRemoveServerAuthoritativeEquipmentByCode(target); } catch (e) {}
  try {
    const remained = filterArchiveVisibleItems(getItems()).filter(function(item){ return !archiveCodeMatches(item, target); });
    if (typeof setItems === 'function') setItems(remained);
  } catch (e) {}
  try { if (typeof refreshMemberUi === 'function') refreshMemberUi(); } catch (e) {}
  try { if (typeof refreshAdminUi === 'function') refreshAdminUi(); } catch (e) {}
  try { if (typeof isAdminLoggedIn === 'function' && isAdminLoggedIn() && typeof renderAdmin === 'function') renderAdmin(); } catch (e) {}
  renderList();

  const serverResult = await markArchiveCodeDeletedOnServer(target);
  try {
    if (typeof isMemberLoggedIn === 'function' && isMemberLoggedIn() && !(typeof isAdminLoggedIn === 'function' && isAdminLoggedIn()) && typeof syncSupabaseMyEquipmentItems === 'function') await syncSupabaseMyEquipmentItems(true);
    else if (typeof syncSupabaseEquipmentItems === 'function') await syncSupabaseEquipmentItems(true);
  } catch (e) {}
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
  try { if (window.sitePassClearServerAuthoritativeEquipmentItems) window.sitePassClearServerAuthoritativeEquipmentItems(); } catch (e) {}
  renderList();
  for (const code of visibleCodes.slice(0, 50)) {
    try { await markArchiveCodeDeletedOnServer(code); } catch (e) {}
  }
  try {
    if (typeof isMemberLoggedIn === 'function' && isMemberLoggedIn() && !(typeof isAdminLoggedIn === 'function' && isAdminLoggedIn()) && typeof syncSupabaseMyEquipmentItems === 'function') await syncSupabaseMyEquipmentItems(true);
    else if (typeof syncSupabaseEquipmentItems === 'function') await syncSupabaseEquipmentItems(true);
  } catch (e) {}
  renderList();
}

  window.SitePassArchive = {
    setSearchQuery: setArchiveSearchQuery,
    searchFromInput: searchArchiveFromInput,
    clearSearch: clearArchiveSearch,
    goToPage: goArchivePage,
    getSearchQuery: function(){ return archiveSearchQuery; },
    getCurrentPage: function(){ return archiveCurrentPage; },
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
