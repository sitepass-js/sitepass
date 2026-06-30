// SitePass v23.7.284 - 보관함/장비서류 목록 전용 파일
// 이 파일에는 장비/기사/인부 보관함 목록, 선택 공유, 삭제, 관리자 보관함 표시 기능을 둡니다.
// QR 링크 생성 자체는 qr-share.js, 서버통신은 supabase-api.js를 계속 사용합니다.
(function(){
  'use strict';

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
  const allItems = isAdminMode && typeof getAdminVisibleEquipmentItems === 'function'
    ? getAdminVisibleEquipmentItems()
    : getItems();
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

function deleteItem(code) {
  if (!requirePasswordReconfirm('서류함 삭제')) return;
  if (!confirm('이 서류함을 삭제할까요?')) return;
  const items = getItems().filter(x => x.code !== code);
  setItems(items);
  renderList();
}

function clearAll() {
  if (!requirePasswordReconfirm('전체 삭제')) return;
  if (!confirm('저장된 모든 서류함을 삭제할까요?')) return;
  localStorage.removeItem(STORAGE_KEY);
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
    deleteItem,
    clearAll
  };
})();
