// SitePass v23.7.257 split step 5 - 관리자 회원목록/검색/필터 전용 파일
// 이 파일에는 관리자 회원목록, 검색, 필터, 페이지 이동, 회원 카드 렌더링 기준을 둡니다.
// 주의: app.bundle.js보다 먼저 불러와야 하며, app.bundle.js의 SitePassAdminRuntime 브리지를 통해 상태를 읽고 갱신합니다.
(function(){
  'use strict';

  function adminRuntime() { return window.SitePassAdminRuntime || {}; }
  function getAdminMemberFolderState(){ const rt = adminRuntime(); return rt.getMemberFolder ? rt.getMemberFolder() : 'all'; }
  function setAdminMemberFolderState(value){ const rt = adminRuntime(); if (rt.setMemberFolder) rt.setMemberFolder(value || 'all'); }
  function getAdminMemberSearchTextState(){ const rt = adminRuntime(); return rt.getMemberSearchText ? rt.getMemberSearchText() : ''; }
  function setAdminMemberSearchTextState(value){ const rt = adminRuntime(); if (rt.setMemberSearchText) rt.setMemberSearchText(value || ''); }
  function getAdminMemberSearchComposingState(){ const rt = adminRuntime(); return rt.getMemberSearchComposing ? !!rt.getMemberSearchComposing() : false; }
  function setAdminMemberSearchComposingState(value){ const rt = adminRuntime(); if (rt.setMemberSearchComposing) rt.setMemberSearchComposing(!!value); }
  function getAdminMemberPageState(){ const rt = adminRuntime(); return rt.getMemberPage ? Math.max(0, Number(rt.getMemberPage() || 0)) : 0; }
  function setAdminMemberPageState(value){ const rt = adminRuntime(); if (rt.setMemberPage) rt.setMemberPage(Math.max(0, Number(value || 0))); }
  function getAdminExpandedMemberIdState(){ const rt = adminRuntime(); return rt.getExpandedMemberId ? String(rt.getExpandedMemberId() || '') : ''; }
  function setAdminExpandedMemberIdState(value){ const rt = adminRuntime(); if (rt.setExpandedMemberId) rt.setExpandedMemberId(value || ''); }
  function getAdminMemberSyncingState(){ const rt = adminRuntime(); return rt.getMemberSyncing ? !!rt.getMemberSyncing() : false; }
  function getAdminMemberSyncedAtState(){ const rt = adminRuntime(); return rt.getMemberSyncedAt ? Number(rt.getMemberSyncedAt() || 0) : 0; }
  function getAdminMemberSyncMessageState(){ const rt = adminRuntime(); return rt.getMemberSyncMessage ? String(rt.getMemberSyncMessage() || '') : ''; }

  function getAdminMemberSearchComposingForInline(){ return getAdminMemberSearchComposingState(); }
  window.getAdminMemberSearchComposingForInline = getAdminMemberSearchComposingForInline;

function isAdminAccountMember(member) {
  const role = member?.adminRole || supabaseRoleToAdminRole(member?.role);
  return member?.isSuperAdminVirtual || [SUPER_ADMIN_ROLE_NAME, '관리자', '운영관리자', '조회관리자'].includes(role);
}

function getAdminMemberCounts(activeMembers, withdrawnMembers) {
  // v23.7.241: 초기화 후 최고관리자 1명만 남아 있어도
  // 전체회원/신규회원/일반회원 숫자에 최고관리자를 포함하지 않습니다.
  // 최고관리자는 별도 '최고관리자' 폴더에서만 셉니다.
  const userMembers = (activeMembers || []).filter(m => !m?.withdrawn && !isAdminAccountMember(m));
  const adminMembers = (activeMembers || []).filter(m => !m?.withdrawn && isAdminAccountMember(m));
  const providerCounts = getAdminSignupProviderCounts(userMembers);
  const counts = {
    all: userMembers.length,
    normal: userMembers.filter(m => !m.suspended).length,
    newSignup: countTodaySignups(userMembers),
    free: userMembers.filter(m => String(getMemberPlanInfo(m).label).includes('무료')).length,
    monthly: userMembers.filter(m => String(getMemberPlanInfo(m).label).includes('1개월') || String(getMemberPlanInfo(m).label).includes('monthly')).length,
    due: userMembers.filter(isMemberPaymentDueSoon).length,
    grace14: userMembers.filter(isMemberGrace14Over).length,
    super: adminMembers.filter(m => (m.adminRole || supabaseRoleToAdminRole(m.role)) === SUPER_ADMIN_ROLE_NAME).length,
    admin: adminMembers.filter(m => ['관리자','운영관리자','조회관리자'].includes(m.adminRole || supabaseRoleToAdminRole(m.role))).length,
    suspended: userMembers.filter(m => m.suspended || m.status === '정지').length,
    withdrawn: withdrawnMembers.length,
    newPay: userMembers.filter(m => String(m.paymentStatus || m.status || '').includes('신규결제')).length,
    extensionPay: userMembers.filter(m => String(m.paymentStatus || m.status || '').includes('연장결제')).length,
    refundRequest: userMembers.filter(m => m.refundRequestPending || String(m.paymentStatus || '').includes('환불요청')).length,
    refund: userMembers.filter(m => String(m.paymentStatus || m.status || '').includes('환불처리')).length,
    signupTotal: providerCounts.total,
    signupKakao: providerCounts.kakao,
    signupNaver: providerCounts.naver,
    signupSitepass: providerCounts.sitepass
  };
  return counts;
}

function getAdminFolderLabel(key) {
  const labels = {
    all:'전체회원',
    normal:'일반회원',
    newSignup:'신규회원',
    free:'베타',
    monthly:'1개월권',
    due:'만료예정',
    grace14:'유예14일 이상',
    super:'최고관리자',
    admin:'관리자',
    suspended:'정지회원',
    newPay:'신규결제',
    extensionPay:'연장결제',
    refundRequest:'환불요청',
    refund:'환불처리',
    withdrawn:'강제탈퇴'
  };
  return labels[key] || '전체회원';
}

function filterAdminMembersByFolder(member, folder) {
  if (folder === 'withdrawn') return !!member.withdrawn;
  if (member.withdrawn) return false;
  const isAdminAccount = isAdminAccountMember(member);
  if (folder === 'super') return (member.adminRole || supabaseRoleToAdminRole(member.role)) === SUPER_ADMIN_ROLE_NAME;
  if (folder === 'admin') return ['관리자','운영관리자','조회관리자'].includes(member.adminRole || supabaseRoleToAdminRole(member.role));
  // v23.7.241: 전체회원/신규회원/일반회원/결제 폴더에는 최고관리자와 관리자를 섞지 않습니다.
  if (isAdminAccount) return false;
  if (folder === 'all') return true;
  if (folder === 'normal') return !member.suspended;
  if (folder === 'newSignup') return getLocalDateKey(member?.createdAt) === getLocalDateKey();
  if (folder === 'free') return String(getMemberPlanInfo(member).label).includes('무료');
  if (folder === 'monthly') return String(getMemberPlanInfo(member).label).includes('1개월') || String(getMemberPlanInfo(member).label).includes('monthly');
  if (folder === 'due') return isMemberPaymentDueSoon(member);
  if (folder === 'grace14') return isMemberGrace14Over(member);
  if (folder === 'suspended') return member.suspended || member.status === '정지';
  if (folder === 'newPay') return String(member.paymentStatus || member.status || '').includes('신규결제');
  if (folder === 'extensionPay') return String(member.paymentStatus || member.status || '').includes('연장결제');
  if (folder === 'refundRequest') return member.refundRequestPending || String(member.paymentStatus || '').includes('환불요청');
  if (folder === 'refund') return String(member.paymentStatus || member.status || '').includes('환불처리');
  return true;
}

function adminMemberMatchesSearch(member, q) {
  if (!q) return true;
  const needle = normalizeLoginText(q).toLowerCase();
  const values = [
    getMemberDisplayName(member),
    getMemberMainId(member),
    member?.phone || '',
    member?.providerId || '',
    member?.signupId || '',
    member?.provider || '',
    member?.signupMethod || '',
    member?.adminMemo || '',
    getMemberSocialText(member),
    getMemberStatusText(member)
  ].join(' ').toLowerCase();
  return values.includes(needle);
}

function setAdminMemberFolder(folder) {
  if (folder === 'free') folder = 'all';
  setAdminMemberFolderState(folder || 'all');
  setAdminMemberPageState(0);
  setAdminExpandedMemberIdState('');
  renderAdmin();
}

function startAdminMemberSearchComposition() {
  setAdminMemberSearchComposingState(true);
}

function handleAdminMemberSearchInput(input) {
  // 입력 중에는 화면을 다시 그리지 않습니다.
  // 한글/숫자 입력 도중 renderAdmin()이 실행되면 글자가 분리되거나 커서가 튀는 문제가 있습니다.
  setAdminMemberSearchTextState(input?.value || '');
}

function finishAdminMemberSearchComposition(input) {
  setAdminMemberSearchComposingState(false);
  setAdminMemberSearchTextState(input?.value || '');
}

function setAdminMemberSearch(value) {
  setAdminMemberSearchTextState(value || '');
  setAdminMemberPageState(0);
  setAdminExpandedMemberIdState('');
  renderAdmin();
}

function applyAdminMemberSearch() {
  const input = document.getElementById('adminMemberSearchInput');
  setAdminMemberSearch(input?.value || getAdminMemberSearchTextState() || '');
}

function clearAdminMemberSearch() {
  setAdminMemberSearchTextState('');
  setAdminMemberPageState(0);
  setAdminExpandedMemberIdState('');
  renderAdmin();
}

function changeAdminMemberPage(delta) {
  setAdminMemberPageState(Math.max(0, getAdminMemberPageState() + Number(delta || 0)));
  renderAdmin();
}

// v23.7.252: 관리자 화면의 카카오/네이버 회원은 서버에서 불러온 행과
// 브라우저 저장 행이 섞일 수 있으므로, 화면 버튼은 id 하나만 믿지 않고
// providerId/loginId/휴대폰/이름+가입방식까지 포함한 안정키로 찾습니다.
function getAdminMemberActionId(member) {
  if (!member) return '';
  return String(member.id || getAdminMemberCanonicalPrimaryKey(member) || member.supabaseLoginId || member.providerId || member.signupId || member.phone || member.name || '').trim();
}

function getAdminMemberActionTokens(member) {
  if (!member) return [];
  const raw = [
    getAdminMemberActionId(member),
    member.id,
    member.supabaseLoginId,
    member.providerId,
    member.signupId,
    member.kakaoUserId,
    member.naverUserId,
    member.phone,
    member.email,
    getAdminMemberCanonicalPrimaryKey(member),
    getAdminMemberNameProviderKey(member)
  ];
  try { getAdminLocalMemberKeys(member).forEach(v => raw.push(v)); } catch (e) {}
  try { getMemberAdminIdentifiers(member).forEach(v => raw.push(v)); } catch (e) {}
  try { getMemberLoginKeys(member).forEach(v => raw.push(v)); } catch (e) {}
  return Array.from(new Set(raw.map(normalizeAdminRoleKey).filter(Boolean)));
}

function isSameAdminActionMember(member, memberId) {
  if (!member) return false;
  const q = normalizeAdminRoleKey(memberId);
  if (!q) return false;
  return getAdminMemberActionTokens(member).includes(q);
}



function renderAdminStaffManager(members) {
  if (!isSuperAdminLoggedIn()) {
    return '<div class="card" style="box-shadow:none;margin-top:14px;"><h3>관리자관리</h3><div class="notice">관리자 지정/권한변경/해제, 회원 강제탈퇴, 무료권 지급은 최고관리자만 가능합니다.</div></div>';
  }

  const withdrawnMembers = getVisibleWithdrawnMembers().map(item => ({ ...item, withdrawn:true, status:'강제탈퇴' }));
  const activeMembers = dedupeAdminMembersForDisplay(getAdminAllMemberRows());
  const counts = getAdminMemberCounts(activeMembers, withdrawnMembers);
  const folders = ['super','admin','all','normal','newSignup','monthly','due','grace14','suspended','newPay','extensionPay','refundRequest','refund','withdrawn'];
  const folderButtons = folders.map(key =>
    '<button type="button" class="' + (getAdminMemberFolderState() === key ? 'active' : '') + '" onclick="setAdminMemberFolder(\'' + escapeJs(key) + '\')">' +
      escapeHtml(getAdminFolderLabel(key)) + ' ' + (counts[key] || 0) +
    '</button>'
  ).join('');

  const currentFolder = getAdminMemberFolderState();
      const currentSearchText = getAdminMemberSearchTextState();
      let currentPage = getAdminMemberPageState();
      const source = currentFolder === 'withdrawn' ? withdrawnMembers : activeMembers;
  let filtered = source.filter(member => filterAdminMembersByFolder(member, currentFolder)).filter(member => adminMemberMatchesSearch(member, currentSearchText));
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (currentPage >= totalPages) { currentPage = totalPages - 1; setAdminMemberPageState(currentPage); }
  const pageItems = filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const summary = '<div class="admin-summary-rows">' +
    '<div class="admin-summary-row">' +
      '<div class="line"><b>전체회원</b><span>' + counts.all + '명</span></div>' +
      '<div class="line"><b>일반회원</b><span>' + counts.normal + '명</span></div>' +
      '<div class="line"><b>관리자</b><span>' + ((counts.super || 0) + (counts.admin || 0)) + '명</span></div>' +
      '<div class="line"><b>강제탈퇴</b><span>' + counts.withdrawn + '명</span></div>' +
    '</div>' +
    '<div class="admin-summary-row">' +
      '<div class="line"><b>1개월권</b><span>' + counts.monthly + '명</span></div>' +
      '<div class="line"><b>만료예정</b><span>' + counts.due + '명</span></div>' +
      '<div class="line"><b>유예14일 이상</b><span>' + counts.grace14 + '명</span></div>' +
      '<div class="line"><b>정지회원</b><span>' + counts.suspended + '명</span></div>' +
    '</div>' +
    '<div class="admin-summary-row">' +
      '<div class="line"><b>신규결제</b><span>' + counts.newPay + '명</span></div>' +
      '<div class="line"><b>연장결제</b><span>' + counts.extensionPay + '명</span></div>' +
      '<div class="line"><b>환불요청</b><span>' + counts.refundRequest + '명</span></div>' +
      '<div class="line"><b>환불처리</b><span>' + counts.refund + '명</span></div>' +
    '</div>' +
  '</div>';

  const rows = pageItems.map(member => {
    const name = getMemberDisplayName(member);
    const role = member.withdrawn ? '강제탈퇴' : (['운영관리자','조회관리자'].includes(member.adminRole) ? '관리자' : (member.adminRole || '일반회원'));
    const plan = getMemberPlanInfo(member);
    const eqCount = getMemberEquipmentCount(member);
    const status = getMemberStatusText(member);
    const roleBadge = '<span class="badge ' + getAdminRoleBadgeClass(role) + '">' + escapeHtml(role) + '</span>';
    const idText = getMemberMainId(member);
    const actionId = getAdminMemberActionId(member);
    const detailOpen = getAdminExpandedMemberIdState() === actionId;
    const quickRoleButtons = '';
    return '<div class="admin-member-row">' +
      '<div class="doc-head"><div><strong>' + escapeHtml(name) + '</strong><div class="small">아이디: ' + escapeHtml(idText) + ' · ' + escapeHtml(member.signupMethod || member.provider || '일반회원') + '</div></div>' + roleBadge + '</div>' +
      '<div class="admin-member-summary">' +
        '<span><b>휴대폰</b>' + escapeHtml(member.phone || '-') + '</span>' +
        '<span><b>소셜계정</b>' + escapeHtml(getMemberSocialText(member)) + '</span>' +
        '<span><b>결제여부</b>' + escapeHtml(plan.label || '-') + '</span>' +
        '<span><b>남은기간</b>' + escapeHtml(plan.remainText || '-') + '</span>' +
        '<span><b>장비등록</b>' + eqCount + '대</span>' +
        '<span><b>회원상태</b>' + escapeHtml(status) + '</span>' +
        '<span><b>최근로그인</b><span class="admin-login-time">' + escapeHtml(formatNullableDateTime(member.lastLoginAt || member.loggedInAt)) + '</span></span>' +
      '</div>' +
      '<div class="actions">' +
        '<button class="ghost" onclick="toggleAdminMemberDetail(\'' + escapeJs(actionId) + '\')">' + (detailOpen ? '상세닫기' : '상세관리') + '</button>' +
        quickRoleButtons +
      '</div>' +
      (detailOpen ? renderAdminMemberDetail(member) : '') +
    '</div>';
  }).join('') || '<div class="empty">조건에 맞는 회원이 없습니다.</div>';

  const pager = '<div class="admin-pager">' +
    '<button class="ghost" onclick="changeAdminMemberPage(-1)" ' + (currentPage <= 0 ? 'disabled' : '') + '>이전 20명</button>' +
    '<span class="small">' + (currentPage + 1) + ' / ' + totalPages + ' 페이지 · 검색결과 ' + filtered.length + '명</span>' +
    '<button class="ghost" onclick="changeAdminMemberPage(1)" ' + (currentPage >= totalPages - 1 ? 'disabled' : '') + '>다음 20명</button>' +
  '</div>';

  return '<div class="card" style="box-shadow:none;margin-top:14px;">' +
    '<h3>약관동의 회원 상세정보 / 관리자관리</h3>' +
    '<div class="notice blue-note">관리자 화면은 Table Editor 원본 행 수를 그대로 보여주지 않고, 약관동의 완료 후 active 상태인 실제 회원만 상세정보에 표시합니다. 로그인만 했거나 중복으로 남은 카카오/네이버 행은 회원목록 숫자에 넣지 않습니다. 카카오/네이버/사이트 약관회원, 오늘 가입, 탈퇴 누계를 따로 표시하고, 탈퇴회원은 현재 회원수에서 제외합니다.</div>' +
    '<div class="actions" style="margin:8px 0 10px;"><button type="button" class="primary" onclick="syncSupabaseMembersForAdmin(true)" ' + (getAdminMemberSyncingState() ? 'disabled' : '') + '>' + (getAdminMemberSyncingState() ? '회원목록 불러오는 중' : '약관회원/가입통계 새로고침') + '</button><span class="small">' + escapeHtml(getAdminMemberSyncMessageState() || (getAdminMemberSyncedAtState() ? '마지막 동기화: ' + formatNullableDateTime(new Date(getAdminMemberSyncedAtState()).toISOString()) : '관리자 화면 진입 시 약관동의 active 회원을 확인합니다.')) + '</span></div>' +
    renderAdminSignupMethodBoard(activeMembers) +
    summary +
    renderAdminPaymentStatusBoard(activeMembers) +
    renderAdminCreateAccountPanel() +
    '<div class="admin-member-toolbar"><div><input id="adminMemberSearchInput" type="text" placeholder="이름 / 아이디 / 휴대폰번호 / 카카오·네이버계정 검색" value="' + escapeHtml(currentSearchText || '') + '" oncompositionstart="startAdminMemberSearchComposition()" oncompositionend="finishAdminMemberSearchComposition(this)" oninput="handleAdminMemberSearchInput(this)" onkeydown="if(event.key===\'Enter\' && !getAdminMemberSearchComposingForInline()){applyAdminMemberSearch();}" /></div><div class="actions admin-search-actions"><button type="button" class="primary" onclick="applyAdminMemberSearch()">검색</button><button type="button" class="ghost" onclick="clearAdminMemberSearch()">초기화</button></div><div class="small">현재 폴더: <b>' + escapeHtml(getAdminFolderLabel(currentFolder)) + '</b></div></div>' +
    '<div class="admin-folder-tabs">' + folderButtons + '</div>' +
    rows + pager +
  '</div>';
}

  window.SitePassAdminMembers = {
    isAdminAccountMember,
    getAdminMemberCounts,
    getAdminFolderLabel,
    filterAdminMembersByFolder,
    adminMemberMatchesSearch,
    setAdminMemberFolder,
    startAdminMemberSearchComposition,
    handleAdminMemberSearchInput,
    finishAdminMemberSearchComposition,
    setAdminMemberSearch,
    applyAdminMemberSearch,
    clearAdminMemberSearch,
    changeAdminMemberPage,
    getAdminMemberActionId,
    getAdminMemberActionTokens,
    isSameAdminActionMember,
    renderAdminStaffManager
  };
})();
